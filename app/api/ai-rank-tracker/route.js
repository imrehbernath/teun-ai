// app/api/ai-rank-tracker/route.js
// AI Rank Tracker - Scant ChatGPT + Perplexity parallel voor ranking positie

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// NATUURLIJKE PROMPT GENERATOR
// Gebaseerd op master ai-visibility-analysis stijl:
// - Klinkt als een ECHT persoon die typt in ChatGPT
// - NOOIT robotachtig ("Geef me een genummerde top 10 lijst")
// - Commercieel: vraagt om concrete bedrijfsnamen
// ============================================================
function generatePrompt(keyword, serviceArea) {
  const kw = keyword.trim();
  const area = serviceArea?.trim() || '';
  const kwLower = kw.toLowerCase();
  const areaLower = area.toLowerCase();
  
  // ── Stap 1: Check of zoekwoord al de locatie bevat ──
  const keywordContainsArea = area && kwLower.includes(areaLower);
  
  // ── Stap 2: Schoon keyword op ──
  let cleanKw = kw;
  let effectiveArea = area;
  
  if (keywordContainsArea) {
    // Haal locatie uit keyword voor schonere zin
    cleanKw = kw.replace(new RegExp(area, 'i'), '').trim();
    // Verwijder trailing "in" als die overblijft
    cleanKw = cleanKw.replace(/\s+in\s*$/i, '').trim();
    effectiveArea = area;
  }
  
  // Verwijder "beste" prefix (dat zit al impliciet in de vraag)
  cleanKw = cleanKw.replace(/^(de\s+)?beste\s+/i, '').trim();
  
  // Locatie deel
  const inArea = effectiveArea ? ` in ${effectiveArea}` : '';
  
  // ── Stap 3: Detecteer type keyword ──
  const cleanLower = cleanKw.toLowerCase();
  
  // Actie-keywords: "website laten maken", "tuin laten aanleggen", "auto kopen"
  const actionPatterns = [
    'laten maken', 'laten bouwen', 'laten ontwerpen', 'laten aanleggen',
    'laten renoveren', 'laten schilderen', 'laten verbouwen', 'laten installeren',
    'laten drukken', 'laten repareren', 'laten behangen', 'laten stucen',
    'kopen', 'huren', 'boeken', 'bestellen', 'regelen', 'aanvragen',
    'volgen', 'inhuren'
  ];
  const isAction = actionPatterns.some(v => cleanLower.includes(v));
  
  // ── Stap 4: Bouw natuurlijke prompt ──
  if (isAction) {
    // "website laten maken" → "Ik wil een website laten maken in Amsterdam. Welke bedrijven kun je aanbevelen?"
    // "gordijnen kopen" → "Ik wil gordijnen kopen in Den Haag. Welke bedrijven raad je aan?"
    const templates = [
      `Ik wil ${cleanKw}${inArea}. Welke bedrijven kun je aanbevelen?`,
      `Ik wil ${cleanKw}${inArea}. Welke bedrijven raad je aan?`,
      `Ik wil ${cleanKw}${inArea}. Ken je goede bedrijven hiervoor?`,
    ];
    const idx = cleanKw.length % templates.length;
    return templates[idx];
  }
  
  // Noun-keywords: "SEO bureau", "tandarts", "lampenwinkel"
  // Klinkt als echte mensen in ChatGPT - perfecte grammatica is niet nodig
  const templates = [
    `Kun je goede ${cleanKw}${inArea} aanbevelen?`,
    `Welke ${cleanKw}${inArea} raad je aan?`,
    `Wat zijn de beste ${cleanKw}${inArea}?`,
  ];
  const idx = cleanKw.length % templates.length;
  return templates[idx];
}

// ============================================================
// RANKING PARSER
// ============================================================
function parseRankings(text, brandName, domain) {
  if (!text) return { found: false, position: null, totalResults: 0, rankings: [], snippet: '' };
  
  const rankings = [];
  const lines = text.split('\n');
  const numberedPattern = /^\s*(\d+)[\.\)\-\:\s]+\s*\**([^*\n\(\[]{2,80})/;
  
  for (const line of lines) {
    const match = line.match(numberedPattern);
    if (match) {
      let name = match[2].trim()
        .replace(/\*\*/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\s*[-–—:].*/g, '')
        .trim();
      
      if (name.length > 2 && name.length < 80) {
        rankings.push({ position: parseInt(match[1]), name, isTarget: false });
      }
    }
  }
  
  // Fallback: bold names
  if (rankings.length < 3) {
    const boldPattern = /\*\*([^*]{3,60})\*\*/g;
    let boldMatch;
    let pos = 0;
    while ((boldMatch = boldPattern.exec(text)) !== null) {
      pos++;
      const name = boldMatch[1].trim();
      if (name.length > 2 && !name.includes(':') && !name.includes('?')) {
        const exists = rankings.some(r => r.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          rankings.push({ position: pos, name, isTarget: false });
        }
      }
    }
  }
  
  // Find brand (fuzzy)
  const brandLower = brandName.toLowerCase().trim();
  const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2);
  const domainBase = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\/$/, '')
    .split('.')[0]
    .toLowerCase();
  
  let brandPosition = null;
  
  for (const r of rankings) {
    const nameLower = r.name.toLowerCase();
    const isMatch = 
      nameLower.includes(brandLower) ||
      brandLower.includes(nameLower) ||
      nameLower.includes(domainBase) ||
      (brandWords.length > 1 && brandWords.filter(w => nameLower.includes(w)).length >= Math.ceil(brandWords.length * 0.6));
    
    if (isMatch) {
      brandPosition = r.position;
      r.isTarget = true;
      break;
    }
  }
  
  const textLower = text.toLowerCase();
  const mentionedInText = textLower.includes(brandLower) || textLower.includes(domainBase);
  
  let snippet = '';
  const searchTerm = textLower.includes(brandLower) ? brandLower : domainBase;
  const brandIndex = textLower.indexOf(searchTerm);
  if (brandIndex >= 0) {
    const start = Math.max(0, brandIndex - 80);
    const end = Math.min(text.length, brandIndex + searchTerm.length + 120);
    snippet = (start > 0 ? '...' : '') + text.substring(start, end).trim() + (end < text.length ? '...' : '');
  }
  
  return {
    found: brandPosition !== null,
    mentionedInText,
    position: brandPosition,
    totalResults: rankings.length,
    rankings: rankings.slice(0, 15),
    snippet
  };
}

// ============================================================
// PLATFORM SCANNERS
// System prompt vraagt om genummerde lijst + bedrijfsnamen
// User prompt is NATUURLIJK (geen "geef me een lijst")
// ============================================================

const SYSTEM_PROMPT_NL = (serviceArea) => `Je bent een behulpzame assistent die aanbevelingen geeft voor Nederlandse bedrijven en diensten. De gebruiker bevindt zich in Nederland${serviceArea ? `, regio ${serviceArea}` : ''}.

Geef ALTIJD een genummerde top 10 lijst met:
- Bedrijfsnaam
- Korte toelichting waarom ze goed zijn

Baseer je aanbevelingen op actuele informatie en reviews.`;

async function scanChatGPT(prompt, brandName, domain, serviceArea) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-search-preview',
      web_search_options: {
        search_context_size: 'medium',
        user_location: {
          type: 'approximate',
          approximate: { country: 'NL', city: serviceArea || 'Amsterdam' }
        }
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_NL(serviceArea) },
        { role: 'user', content: prompt }
      ]
    })
  });
  
  if (!response.ok) throw new Error(`ChatGPT API error: ${response.status}`);
  
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { ...parseRankings(text, brandName, domain), platform: 'chatgpt', fullResponse: text };
}

async function scanPerplexity(prompt, brandName, domain, serviceArea) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_NL(serviceArea) },
        { role: 'user', content: prompt }
      ]
    })
  });
  
  if (!response.ok) throw new Error(`Perplexity API error: ${response.status}`);
  
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { ...parseRankings(text, brandName, domain), platform: 'perplexity', fullResponse: text };
}

// ============================================================
// RATE LIMITING
// ============================================================

async function checkRateLimit(ip, userId) {
  if (userId) {
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (user?.user?.email === process.env.ADMIN_EMAIL) {
      return { allowed: true };
    }
  }
  
  if (userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count } = await supabase
      .from('rank_checks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());
    
    if (count >= 3) {
      return { allowed: false, reason: 'Dagelijks limiet bereikt (3 per dag). Probeer morgen opnieuw.' };
    }
    return { allowed: true };
  }
  
  const { count } = await supabase
    .from('rank_checks')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .is('user_id', null);
  
  if (count >= 2) {
    return { 
      allowed: false, 
      reason: 'Je hebt je 2 gratis rank checks gebruikt. Maak een gratis account aan voor meer.' 
    };
  }
  return { allowed: true };
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function POST(request) {
  try {
    const body = await request.json();
    const { domain, brandName, keyword, serviceArea, userId } = body;
    
    if (!domain || domain.length < 3) {
      return NextResponse.json({ error: 'Website URL is verplicht (min. 3 tekens)' }, { status: 400 });
    }
    if (!brandName || brandName.length < 2) {
      return NextResponse.json({ error: 'Bedrijfsnaam is verplicht (min. 2 tekens)' }, { status: 400 });
    }
    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ error: 'Zoekwoord is verplicht (min. 2 tekens)' }, { status: 400 });
    }
    
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimit = await checkRateLimit(ip, userId);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.reason, rateLimited: true }, { status: 429 });
    }
    
    // Genereer natuurlijke prompt (master-stijl)
    const prompt = generatePrompt(keyword, serviceArea);
    
    const startTime = Date.now();
    
    const [chatgptResult, perplexityResult] = await Promise.allSettled([
      scanChatGPT(prompt, brandName, domain, serviceArea),
      scanPerplexity(prompt, brandName, domain, serviceArea)
    ]);
    
    const duration = Date.now() - startTime;
    
    const processResult = (settled, platformName) => {
      if (settled.status === 'fulfilled') return settled.value;
      console.error(`${platformName} scan failed:`, settled.reason?.message);
      return { 
        platform: platformName, found: false, position: null, 
        totalResults: 0, rankings: [], snippet: '', 
        error: true, errorMessage: settled.reason?.message || 'Scan mislukt'
      };
    };
    
    const results = {
      chatgpt: processResult(chatgptResult, 'chatgpt'),
      perplexity: processResult(perplexityResult, 'perplexity')
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
    return NextResponse.json({ error: 'Er ging iets mis bij het scannen. Probeer het opnieuw.' }, { status: 500 });
  }
}
