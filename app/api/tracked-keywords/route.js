// app/api/tracked-keywords/route.js
// CRUD voor tracked keywords + live scan bij toevoegen
// Scan logica = EXACT dezelfde als ai-rank-tracker/route.js

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RANK_TRACKER_TIERS } from '@/lib/rank-tracker-tiers';
import { runLiveScan } from '@/lib/rank-scanner';
import { generateKeywordPrompt } from '@/lib/keyword-prompt-generator';
import { checkLocationGate } from '@/lib/language-gate';
import { getUserBadge } from '@/lib/slack-badge';

export const maxDuration = 120;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getUserTier(userId) {
  if (!userId) return RANK_TRACKER_TIERS.free;
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  if (!user?.user) return RANK_TRACKER_TIERS.free;
  if (user.user.email === process.env.ADMIN_EMAIL) return RANK_TRACKER_TIERS.pro;

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_tier')
    .eq('id', userId)
    .single();

  if (!['active', 'canceling'].includes(profile?.subscription_status)) {
    return RANK_TRACKER_TIERS.free;
  }

  // Stripe webhook writes 'lite'/'pro' to profiles.subscription_tier; RANK_TRACKER_TIERS keys are 'starter'/'pro'.
  // Legacy subscribers (pre-tier-split) have null tier and are treated as pro, matching lib/beta-config.js.
  const stripeTier = profile.subscription_tier || 'pro';
  const tierMap = { lite: 'starter', pro: 'pro' };
  const tierKey = tierMap[stripeTier] || 'free';
  return RANK_TRACKER_TIERS[tierKey] || RANK_TRACKER_TIERS.free;
}

// Prompt-generatie (Claude met rule-based fallback) staat in
// lib/keyword-prompt-generator.js, gedeeld met /api/ai-rank-tracker.
// Scan helpers staan in lib/rank-scanner.js, gedeeld met de cron worker.

// ── GET ──
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId verplicht' }, { status: 400 });
    const tier = await getUserTier(userId);
    const { data: keywords, error } = await supabase.from('tracked_keywords').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    if (error) throw error;
    const keywordIds = keywords.map(k => k.id);
    let latestRankings = {};
    if (keywordIds.length > 0) {
      const { data: rankings } = await supabase.from('rank_history').select('tracked_keyword_id, platform, position, found, scanned_at').in('tracked_keyword_id', keywordIds).order('scanned_at', { ascending: false });
      if (rankings) { for (const r of rankings) { const key = `${r.tracked_keyword_id}_${r.platform}`; if (!latestRankings[key]) latestRankings[key] = r; } }
    }
    const enriched = keywords.map(kw => {
      const positions = {};
      for (const p of ['chatgpt', 'perplexity', 'google_ai']) positions[p] = latestRankings[`${kw.id}_${p}`] || null;
      return { ...kw, latestPositions: positions };
    });
    return NextResponse.json({ keywords: enriched, tier: { name: tier.name, maxKeywords: tier.maxKeywords, maxCompetitors: tier.maxCompetitors, cronEnabled: tier.cronEnabled, used: keywords.length } });
  } catch (error) { console.error('GET error:', error); return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 }); }
}

// ── POST (keyword toevoegen + direct live scan) ──
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, keyword, serviceArea, domain, brandName, competitors, locale = 'nl', customPrompt } = body;
    if (!userId || !keyword || !domain || !brandName) return NextResponse.json({ error: 'userId, keyword, domain en brandName zijn verplicht' }, { status: 400 });
    // Locatiegate: blokkeer evident buitenlandse service-areas voor we Claude
    // aanroepen, DB schrijven of een live scan starten.
    if (serviceArea) {
      const locGate = checkLocationGate(serviceArea, locale);
      if (!locGate.allowed) {
        return NextResponse.json({ error: locGate.message }, { status: 400 });
      }
    }
    const tier = await getUserTier(userId);
    const { count } = await supabase.from('tracked_keywords').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (count >= tier.maxKeywords) return NextResponse.json({ error: `Maximum ${tier.maxKeywords} keywords bereikt`, limitReached: true }, { status: 403 });
    const comps = (competitors || []).slice(0, tier.maxCompetitors);
    const generatedPrompt = customPrompt || await generateKeywordPrompt({ keyword, serviceArea, locale });
    const { data, error } = await supabase.from('tracked_keywords').insert({ user_id: userId, keyword: keyword.trim(), generated_prompt: generatedPrompt, service_area: serviceArea?.trim() || null, domain: domain.trim(), brand_name: brandName.trim(), competitors: comps }).select().single();
    if (error) { if (error.code === '23505') return NextResponse.json({ error: 'Dit keyword track je al' }, { status: 409 }); throw error; }
    // Live scan
    let scanResults = null;
    try { scanResults = await runLiveScan(supabase, data, locale); } catch (e) { console.error('Live scan error:', e); }
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const pos = scanResults
          ? Object.entries(scanResults).map(([p, r]) => `${p}: ${r.position ? `#${r.position}` : 'n.v.t.'}`).join(' | ')
          : 'pending'
        const userBadge = await getUserBadge(supabase, userId)
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: '📊 Rank Tracker Keyword Toegevoegd', emoji: true }
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Bedrijf:*\n${brandName}` },
                  { type: 'mrkdwn', text: `*Keyword:*\n${keyword}${serviceArea ? ` (${serviceArea})` : ''}` },
                  { type: 'mrkdwn', text: `*Account:*\n${userBadge}` },
                  { type: 'mrkdwn', text: `*Posities:*\n${pos}` },
                ]
              },
              {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Prompt:*\n_"${generatedPrompt}"_` }
              },
              {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: `${new Date().toLocaleString('nl-NL')} · Rank Tracker` }]
              }
            ]
          })
        })
      } catch {}
    }
    return NextResponse.json({ keyword: data, scanResults });
  } catch (error) { console.error('POST error:', error); return NextResponse.json({ error: 'Toevoegen mislukt' }, { status: 500 }); }
}

// ── PATCH ──
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, userId, generatedPrompt, competitors, keyword, serviceArea, brandName, locale = 'nl', rescan = false } = body;
    if (!id || !userId) return NextResponse.json({ error: 'id en userId verplicht' }, { status: 400 });
    const updates = {};
    if (generatedPrompt !== undefined) updates.generated_prompt = generatedPrompt;
    if (competitors !== undefined) updates.competitors = competitors;
    if (keyword !== undefined) updates.keyword = keyword;
    if (serviceArea !== undefined) updates.service_area = serviceArea;
    if (brandName !== undefined) updates.brand_name = brandName;
    if (keyword && !generatedPrompt) updates.generated_prompt = await generateKeywordPrompt({ keyword, serviceArea: serviceArea || undefined, locale });

    // Geen veld-updates (bv. pure rescan-knop): skip de UPDATE, anders crasht
    // Supabase op een lege SET clausule met PGRST116.
    let data;
    if (Object.keys(updates).length === 0) {
      const { data: kw, error } = await supabase.from('tracked_keywords').select('*').eq('id', id).eq('user_id', userId).single();
      if (error) throw error;
      data = kw;
    } else {
      const { data: updated, error } = await supabase.from('tracked_keywords').update(updates).eq('id', id).eq('user_id', userId).select().single();
      if (error) throw error;
      data = updated;
    }

    let scanResults = null;
    if (rescan) { try { scanResults = await runLiveScan(supabase, data, locale); } catch {} }
    return NextResponse.json({ keyword: data, scanResults });
  } catch (error) { console.error('PATCH error:', error); return NextResponse.json({ error: 'Bijwerken mislukt' }, { status: 500 }); }
}

// ── DELETE ──
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get('id'); const userId = searchParams.get('userId');
    if (!keywordId || !userId) return NextResponse.json({ error: 'id en userId verplicht' }, { status: 400 });
    await supabase.from('rank_history').delete().eq('tracked_keyword_id', keywordId);
    const { error } = await supabase.from('tracked_keywords').delete().eq('id', keywordId).eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) { console.error('DELETE error:', error); return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 }); }
}
