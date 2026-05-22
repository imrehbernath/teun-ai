// app/api/ai-rank-tracker/route.js
// AI Rank Tracker - Scant ChatGPT + Perplexity + Google AI Mode parallel voor ranking positie.
// Scan-functies en brand-matching helpers staan in lib/rank-scanner.js (gedeeld met
// /api/tracked-keywords + cron worker, zodat alle Rank Tracker entry points dezelfde
// upgrades krijgen). Prompt-generatie zit in lib/keyword-prompt-generator.js.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateKeywordPrompt } from '@/lib/keyword-prompt-generator';
import { scanChatGPT, scanPerplexity, scanGoogleAI } from '@/lib/rank-scanner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// i18n MESSAGES
// ============================================================
const MESSAGES = {
  nl: {
    domainRequired: 'Website URL is verplicht (min. 3 tekens)',
    brandRequired: 'Bedrijfsnaam is verplicht (min. 2 tekens)',
    keywordRequired: 'Zoekwoord is verplicht (min. 2 tekens)',
    weeklyLimit: 'Wekelijks limiet (2x) bereikt. Upgrade naar Pro voor automatische wekelijkse tracking van 50 keywords.',
    freeLimit: 'Je 2 gratis rank checks zijn gebruikt. Maak een gratis account aan voor 2 checks per week.',
    scanError: 'Er ging iets mis bij het scannen. Probeer het opnieuw.',
    scanFailed: 'Scan mislukt',
  },
  en: {
    domainRequired: 'Website URL is required (min. 3 characters)',
    brandRequired: 'Company name is required (min. 2 characters)',
    keywordRequired: 'Keyword is required (min. 2 characters)',
    weeklyLimit: 'Weekly limit reached (2x). Upgrade to Pro for automatic weekly tracking of 50 keywords.',
    freeLimit: 'Your 2 free rank checks are used. Create a free account for 2 per week.',
    scanError: 'Something went wrong while scanning. Please try again.',
    scanFailed: 'Scan failed',
  }
};

function getMsg(locale) { return MESSAGES[locale] || MESSAGES['nl']; }

// ============================================================
// RATE LIMITING
// ============================================================

async function checkRateLimit(ip, userId, msg) {
  if (userId) {
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (user?.user?.email === process.env.ADMIN_EMAIL) {
      return { allowed: true };
    }

    // Check Pro subscription — Pro users get unlimited
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', userId)
      .single();

    if (['active', 'canceling'].includes(profile?.subscription_status)) {
      return { allowed: true };
    }
  }

  if (userId) {
    // Logged-in free: 2 per week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count } = await supabase
      .from('rank_checks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString());

    if (count >= 2) {
      return { allowed: false, reason: msg.weeklyLimit };
    }
    return { allowed: true };
  }

  // Anonymous: 2 total ever
  const { count } = await supabase
    .from('rank_checks')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .is('user_id', null);

  if (count >= 2) {
    return { allowed: false, reason: msg.freeLimit };
  }
  return { allowed: true };
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function POST(request) {
  try {
    const body = await request.json();
    const { domain, brandName, keyword, serviceArea, userId, locale = 'nl' } = body;
    const msg = getMsg(locale);

    if (!domain || domain.length < 3) {
      return NextResponse.json({ error: msg.domainRequired }, { status: 400 });
    }
    if (!brandName || brandName.length < 2) {
      return NextResponse.json({ error: msg.brandRequired }, { status: 400 });
    }
    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ error: msg.keywordRequired }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimit = await checkRateLimit(ip, userId, msg);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.reason, rateLimited: true }, { status: 429 });
    }

    // Genereer natuurlijke prompt (Claude met rule-based fallback)
    const prompt = await generateKeywordPrompt({ keyword, serviceArea, locale });

    const startTime = Date.now();

    const [chatgptResult, perplexityResult, googleAiResult] = await Promise.allSettled([
      scanChatGPT(prompt, brandName, domain, serviceArea, locale),
      scanPerplexity(prompt, brandName, domain, serviceArea, locale),
      scanGoogleAI(keyword, brandName, domain, serviceArea, locale)
    ]);

    const duration = Date.now() - startTime;

    const processResult = (settled, platformName) => {
      if (settled.status === 'fulfilled') return settled.value;
      console.error(`${platformName} scan failed:`, settled.reason?.message);
      const friendlyError = platformName === 'google_ai'
        ? (locale === 'en' ? 'Google AI Mode temporarily unavailable' : 'Google AI Mode tijdelijk niet beschikbaar')
        : settled.reason?.message || msg.scanFailed;
      return {
        platform: platformName, found: false, position: null,
        totalResults: 0, rankings: [], snippet: '',
        error: true, errorMessage: friendlyError
      };
    };

    const results = {
      chatgpt: processResult(chatgptResult, 'chatgpt'),
      perplexity: processResult(perplexityResult, 'perplexity'),
      google_ai: processResult(googleAiResult, 'google_ai')
    };

    // Store
    try {
      await supabase.from('rank_checks').insert({
        user_id: userId || null,
        ip_address: userId ? null : ip,
        domain, brand_name: brandName, keyword,
        service_area: serviceArea || null,
        prompt,
        results,
        chatgpt_position: results.chatgpt.position,
        perplexity_position: results.perplexity.position,
        scan_duration_ms: duration
      });
    } catch (dbError) {
      console.error('Failed to store rank check:', dbError);
    }

    // Slack
    const locationSuffix = serviceArea ? ` (${serviceArea})` : '';
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const positions = Object.entries(results)
          .map(([p, r]) => `${p}: ${r.position ? `#${r.position}` : '—'}`)
          .join(' | ');

        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🏆 Rank Check: ${brandName} | ${keyword}${locationSuffix}\n🌐 ${domain}\n📊 ${positions}\n⏱️ ${(duration / 1000).toFixed(1)}s`
          })
        });
      } catch (e) { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      results,
      meta: {
        keyword, brandName, domain, serviceArea,
        generatedPrompt: prompt,
        duration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Rank check error:', error);
    const msg = getMsg('nl');
    return NextResponse.json({ error: msg.scanError }, { status: 500 });
  }
}
