// app/api/ai-rank-tracker/route.js
// AI Rank Tracker - Scant ChatGPT + Perplexity + Google AI Mode parallel voor ranking positie

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    weeklyLimit: 'Wekelijks limiet bereikt (2 per week). Upgrade naar Lite voor onbeperkt rank tracking.',
    freeLimit: 'Je hebt je 2 gratis rank checks gebruikt. Maak een gratis account aan voor 2 checks per week.',
    scanError: 'Er ging iets mis bij het scannen. Probeer het opnieuw.',
    scanFailed: 'Scan mislukt',
  },
  en: {
    domainRequired: 'Website URL is required (min. 3 characters)',
    brandRequired: 'Company name is required (min. 2 characters)',
    keywordRequired: 'Keyword is required (min. 2 characters)',
    weeklyLimit: 'Weekly limit reached (2 per week). Upgrade to Lite for unlimited rank tracking.',
    freeLimit: 'You have used your 2 free rank checks. Create a free account for 2 checks per week.',
    scanError: 'Something went wrong while scanning. Please try again.',
    scanFailed: 'Scan failed',
  }
};

function getMsg(locale) { return MESSAGES[locale] || MESSAGES['nl']; }

// ============================================================
// NATUURLIJKE PROMPT GENERATOR (NL + EN)
// ============================================================
function generatePrompt(keyword, serviceArea, locale = 'nl') {
  const kw = keyword.trim();
  const area = serviceArea?.trim() || '';
  const kwLower = kw.toLowerCase();
  const areaLower = area.toLowerCase();
  
  // Remove area from keyword if already present
  let cleanKw = kw;
  if (area && kwLower.includes(areaLower)) {
    cleanKw = kw.replace(new RegExp(area, 'i'), '').trim();
    cleanKw = cleanKw.replace(/\s+in\s*$/i, '').trim();
  }
  
  // Remove "beste"/"best" prefix
  if (locale === 'nl') {
    cleanKw = cleanKw.replace(/^(de\s+)?beste\s+/i, '').trim();
  } else {
    cleanKw = cleanKw.replace(/^(the\s+)?best\s+/i, '').trim();
  }
  
  const inArea = area ? ` in ${area}` : '';
  const cleanLower = cleanKw.toLowerCase();
  
  if (locale === 'en') {
    // English: detect keyword type
    const verbPatterns = ['improve', 'optimize', 'build', 'design', 'develop', 'fix', 'repair', 'install', 'create', 'set up', 'manage', 'grow', 'boost', 'increase'];
    const isVerb = verbPatterns.some(v => cleanLower.includes(v));
    
    const actionPatterns = ['have built', 'have made', 'have designed', 'get installed', 'buy', 'rent', 'book', 'order', 'arrange', 'hire'];
    const isAction = actionPatterns.some(v => cleanLower.includes(v));
    
    const hasServiceWord = /\b(agency|company|firm|specialist|consultant|expert|service|studio|practice|lawyer|doctor|clinic)\b/i.test(cleanKw);
    
    if (isAction) {
      return `I want to ${cleanKw}${inArea}. Which companies can you recommend?`;
    }
    if (isVerb) {
      return `I want to ${cleanKw}${inArea}. Which company or specialist would you recommend for this?`;
    }
    if (hasServiceWord) {
      return `Can you recommend a good ${cleanKw}${inArea}?`;
    }
    return `I'm looking for a specialist in ${cleanKw}${inArea}. Which companies would you recommend?`;
  }
  
  // ── DUTCH ──
  
  // Type 1: "laten maken/bouwen" action phrases → "Ik wil ... Welk bedrijf raad je aan?"
  const latenPatterns = [
    'laten maken', 'laten bouwen', 'laten ontwerpen', 'laten aanleggen',
    'laten renoveren', 'laten schilderen', 'laten verbouwen', 'laten installeren',
    'laten drukken', 'laten repareren', 'laten behangen', 'laten stucen',
    'kopen', 'huren', 'boeken', 'bestellen', 'regelen', 'aanvragen', 'inhuren'
  ];
  const isLaten = latenPatterns.some(v => cleanLower.includes(v));
  
  if (isLaten) {
    return `Ik wil ${cleanKw}${inArea}. Welke bedrijven kun je aanbevelen?`;
  }
  
  // Type 2: Verb infinitives → "Ik wil mijn [X] [verbeteren]. Welk bureau raad je aan?"
  const verbInfinitives = [
    'verbeteren', 'optimaliseren', 'ontwikkelen', 'uitbesteden', 'opzetten',
    'automatiseren', 'beheren', 'analyseren', 'upgraden', 'redesignen',
    'verduurzamen', 'isoleren', 'verbouwen', 'renoveren', 'schilderen'
  ];
  const foundVerb = verbInfinitives.find(v => cleanLower.includes(v));
  
  if (foundVerb) {
    // Split: "SEO verbeteren" → subject="SEO", verb="verbeteren"
    const verbIndex = cleanLower.indexOf(foundVerb);
    const subject = cleanKw.substring(0, verbIndex).trim();
    if (subject) {
      return `Ik wil mijn ${subject} ${foundVerb}${inArea}. Welk bedrijf of bureau raad je aan?`;
    }
    return `Ik wil ${cleanKw}${inArea}. Welk bedrijf raad je aan?`;
  }
  
  // Type 3: Contains service word (bureau, specialist, etc.) → "Kun je een goed [X] aanbevelen?"
  const serviceWords = /\b(bureau|bedrijf|specialist|adviseur|advocaat|kantoor|praktijk|studio|consultant|coach|trainer|installateur|aannemer|loodgieter|schilder|monteur)\b/i;
  const hasServiceWord = serviceWords.test(cleanKw);
  
  if (hasServiceWord) {
    return `Kun je een goed ${cleanKw}${inArea} aanbevelen?`;
  }
  
  // Type 4: General service/industry keywords → "Ik zoek een specialist in [X]. Welk bedrijf raad je aan?"
  return `Ik zoek een specialist in ${cleanKw}${inArea}. Welk bedrijf raad je aan?`;
}

// ============================================================
// STRIP MARKDOWN from responses
// ============================================================
function stripMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/\[(\d+)\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s)\]]+/g, '')
    .replace(/\([^)]*utm_source[^)]*\)/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
      
      // Skip rating/score lines that aren't actual company names
      const isRatingLine = /^\d[\d.,/]*\s*(\/\s*\d|rating|score|stars?|sterren|punt|out of)/i.test(name);
      const isTooShort = name.length <= 2;
      const isTooLong = name.length >= 80;
      
      if (!isRatingLine && !isTooShort && !isTooLong) {
        rankings.push({ position: parseInt(match[1]), name, isTarget: false });
      }
    }
  }
  
  // Re-number positions sequentially after filtering
  rankings.forEach((r, i) => { r.position = i + 1; });
  
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
    snippet = stripMarkdown((start > 0 ? '...' : '') + text.substring(start, end).trim() + (end < text.length ? '...' : ''));
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
// ============================================================

function getSystemPrompt(serviceArea, locale = 'nl') {
  if (locale === 'en') {
    return `You are a helpful assistant that provides recommendations for businesses and services. The user is located${serviceArea ? ` in the ${serviceArea} area` : ''}.

Always provide a numbered top 10 list with:
- Business name
- Brief explanation of why they are good

Base your recommendations on current information and reviews.`;
  }

  return `Je bent een behulpzame assistent die aanbevelingen geeft voor Nederlandse bedrijven en diensten. De gebruiker bevindt zich in Nederland${serviceArea ? `, regio ${serviceArea}` : ''}.

Geef ALTIJD een genummerde top 10 lijst met:
- Bedrijfsnaam
- Korte toelichting waarom ze goed zijn

Baseer je aanbevelingen op actuele informatie en reviews.`;
}

function getPerplexitySystemPrompt(serviceArea, locale = 'nl') {
  if (locale === 'en') {
    return `You are a helpful assistant that provides recommendations for businesses and services. The user is located${serviceArea ? ` in ${serviceArea}` : ' in the United Kingdom'}.

IMPORTANT INSTRUCTIONS:
- Only recommend businesses that actually operate in the user's location
- No international companies unless they have a local branch
- Provide a numbered top 10 list
- For each entry: business name + brief reason why they are good
- Base recommendations on current reviews and reputation
- Do NOT include ratings or scores in the business name line`;
  }

  return `Je bent een behulpzame assistent die aanbevelingen geeft voor bedrijven en diensten in Nederland. De gebruiker zoekt specifiek naar Nederlandse bedrijven${serviceArea ? ` in de regio ${serviceArea}` : ''}.

BELANGRIJKE INSTRUCTIES:
- Antwoord ALTIJD in het Nederlands
- Noem ALLEEN bedrijven die daadwerkelijk in Nederland actief zijn${serviceArea ? `, bij voorkeur in of rond ${serviceArea}` : ''}
- Geen internationale bedrijven tenzij ze een Nederlandse vestiging hebben
- Geef een genummerde top 10 lijst
- Per bedrijf: bedrijfsnaam + korte toelichting waarom ze goed zijn
- Baseer je op actuele reviews, Google Reviews, Trustpilot en branche-informatie
- Vermeld GEEN ratings of scores op de bedrijfsnaam-regel zelf`;
}

async function scanChatGPT(prompt, brandName, domain, serviceArea, locale) {
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
          approximate: { country: locale === 'en' ? 'GB' : 'NL', city: serviceArea || (locale === 'en' ? 'London' : 'Amsterdam') }
        }
      },
      messages: [
        { role: 'system', content: getSystemPrompt(serviceArea, locale) },
        { role: 'user', content: prompt }
      ]
    })
  });
  
  if (!response.ok) throw new Error(`ChatGPT API error: ${response.status}`);
  
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { ...parseRankings(text, brandName, domain), platform: 'chatgpt', fullResponse: stripMarkdown(text) };
}

async function scanPerplexity(prompt, brandName, domain, serviceArea, locale) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        stream: true,
        web_search_options: {
          search_type: 'auto'
        },
        messages: [
          { role: 'system', content: getPerplexitySystemPrompt(serviceArea, locale) },
          { role: 'user', content: prompt }
        ]
      })
    });
    
    if (!response.ok) throw new Error(`Perplexity API error: ${response.status}`);
  
  // Parse SSE streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) fullText += delta;
      } catch (e) {
        // skip unparseable chunks
      }
    }
  }
  
  console.log(`[Rank Tracker] Perplexity response length: ${fullText.length}`);
  const cleaned = stripMarkdown(fullText);
  const parsed = parsePerplexityRankings(cleaned, fullText, brandName, domain);
  return { ...parsed, platform: 'perplexity', fullResponse: cleaned };
  
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[Rank Tracker] Perplexity aborted after 20s');
      throw new Error('Perplexity timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Perplexity-specifieke parser: genummerd, bullets, bold, "Naam: uitleg"
function parsePerplexityRankings(cleanText, rawText, brandName, domain) {
  if (!rawText) {
    return { found: false, position: null, totalResults: 0, rankings: [], snippet: '' };
  }
  
  const rankings = [];
  const seen = new Set();
  
  const addName = (name) => {
    let clean = name
      .replace(/^\d+[\.\)\-:\s]+/, '')
      .replace(/^[•\-\*]\s+/, '')
      .replace(/\s*[:\-–—]\s*$/, '')
      .replace(/[\[\]]/g, '')
      .replace(/\*\*/g, '')
      .trim();
    if (clean.length < 2 || clean.length > 80) return;
    if (seen.has(clean.toLowerCase())) return;
    // Filter generieke woorden
    if (/^(waarom|omdat|volgens|deze|dit|een|het|de|top|beste|lokale|bedrijven|specialisten|conclusie|samenvatting|bronnen|sources|references|note|tip)$/i.test(clean)) return;
    if (/^(http|www\.|google\.|the |a |an )/i.test(clean)) return;
    seen.add(clean.toLowerCase());
    rankings.push({ position: rankings.length + 1, name: clean, isTarget: false });
  };
  
  // Parse raw markdown (before stripMarkdown) for bold names
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  for (const line of lines) {
    // 1. Genummerde lijst: "1. Bedrijfsnaam" of "1. **Bedrijfsnaam**"
    let m = line.match(/^\d+[\.\)]\s+\**([^*\n]{2,80}?)\**(?:\s*[:\-–—]\s|$)/);
    if (m) { addName(m[1]); continue; }
    
    // 2. Genummerde lijst met bold: "1. **Bedrijfsnaam** - uitleg"
    m = line.match(/^\d+[\.\)]\s+\*\*(.+?)\*\*/);
    if (m) { addName(m[1]); continue; }
    
    // 3. Bullets: "- Bedrijfsnaam: uitleg" of "* **Bedrijfsnaam**"
    m = line.match(/^[•\-\*]\s+\**([^*\n]{2,80}?)\**(?:\s*[:\-–—]\s|$)/);
    if (m) { addName(m[1]); continue; }
    
    m = line.match(/^[•\-\*]\s+\*\*(.+?)\*\*/);
    if (m) { addName(m[1]); continue; }
    
    // 4. Standalone bold names (niet aan begin van zin)
    const boldMatches = [...line.matchAll(/\*\*([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.@\-\s]{1,60}?)\*\*/g)];
    for (const bm of boldMatches) addName(bm[1]);
    
    // 5. "Naam – uitleg" of "Naam: uitleg" (begint met hoofdletter)
    m = line.match(/^([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.@\-\s]{1,50}?)\s*[:\-–—]\s+\S/);
    if (m && !m[1].match(/^(Dit|Deze|Het|De|Een|Als|Voor|Met|Door|Wat|Hoe|Waar|The|This|That|For|With|How|Why)/)) {
      addName(m[1]);
    }
  }
  
  // Fallback naar standaard parseRankings als weinig gevonden
  if (rankings.length < 3) {
    const fallback = parseRankings(rawText, brandName, domain);
    if (fallback.rankings.length > rankings.length) {
      return fallback;
    }
  }
  
  // Brand matching
  const brandLower = brandName.toLowerCase().trim();
  const domainBase = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').split('.')[0].toLowerCase();
  let position = null;
  
  for (const r of rankings) {
    const n = r.name.toLowerCase();
    if (n.includes(brandLower) || brandLower.includes(n) || n.includes(domainBase)) {
      r.isTarget = true;
      position = r.position;
      break;
    }
  }
  
  // Snippet
  const textLower = cleanText.toLowerCase();
  let snippet = '';
  const mentionIndex = textLower.indexOf(brandLower) >= 0 ? textLower.indexOf(brandLower) : textLower.indexOf(domainBase);
  if (mentionIndex >= 0) {
    const start = Math.max(0, mentionIndex - 80);
    const end = Math.min(cleanText.length, mentionIndex + 160);
    snippet = cleanText.substring(start, end).trim();
  }
  
  return {
    found: position !== null || textLower.includes(brandLower) || textLower.includes(domainBase),
    position,
    totalResults: rankings.length,
    rankings: rankings.slice(0, 15),
    snippet,
  };
}

async function scanGoogleAI(keyword, brandName, domain, serviceArea, locale) {
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (!SERPAPI_KEY) {
    return { platform: 'google_ai', found: false, position: null, totalResults: 0, rankings: [], snippet: '', fullResponse: '', error: true, errorMessage: 'Not configured' };
  }

  const googlePrompt = `${keyword} ${serviceArea || (locale === 'en' ? 'London' : 'Amsterdam')}`.trim();

  const params = new URLSearchParams({
    engine: 'google_ai_mode',
    q: googlePrompt,
    gl: locale === 'en' ? 'uk' : 'nl',
    hl: locale === 'en' ? 'en' : 'nl',
    api_key: SERPAPI_KEY,
  });

  try {
    console.log(`[Rank Tracker] Google AI Mode: "${googlePrompt}"`);

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    const rawText = await response.text();
    console.log(`[Rank Tracker] Google AI Mode status: ${response.status}, length: ${rawText.length}`);

    if (!response.ok) {
      console.error(`[Rank Tracker] Google AI Mode ${response.status}:`, rawText.slice(0, 500));
      return { platform: 'google_ai', found: false, position: null, totalResults: 0, rankings: [], snippet: '', fullResponse: '', error: true, errorMessage: `Google AI Mode fout (${response.status})` };
    }

    const data = JSON.parse(rawText);

    // Use reconstructed_markdown for display (has nice formatting)
    const fullResponse = stripMarkdown(data.reconstructed_markdown || '');

    // Extract company names from structured data
    // Priority 1: snippet_links (hyperlinks to company websites - most reliable)
    // Priority 2: table rows with company names
    // Priority 3: "CompanyName: description" patterns
    const rankings = [];
    const seen = new Set();
    
    const addCompany = (name) => {
      const clean = name.trim().replace(/\*\*/g, '').replace(/[\[\]]/g, '').trim();
      if (clean.length < 3 || clean.length > 60) return;
      if (seen.has(clean.toLowerCase())) return;
      // Skip generic terms
      if (/^(AI|Local|Lokale|Directe|Betrouwbare|Entiteit|Entity|Structured|Question|Further|View|Read|Discover|Information|Citations|Conversion|Core|Content|Technical|Search|Data|Strateg|Techniek|Doel|Succes|Kenmerk)/i.test(clean)) return;
      if (/^(http|www\.|google\.|the |a |an |de |het |een )/i.test(clean)) return;
      seen.add(clean.toLowerCase());
      rankings.push({ position: rankings.length + 1, name: clean, isTarget: false });
    };

    if (Array.isArray(data.text_blocks)) {
      for (const block of data.text_blocks) {
        // Priority 1: snippet_links in list items
        if (Array.isArray(block.list)) {
          for (const item of block.list) {
            if (item.snippet_links && Array.isArray(item.snippet_links)) {
              for (const link of item.snippet_links) {
                if (link.text && link.link && !link.link.includes('google.com/search')) {
                  addCompany(link.text);
                }
              }
            }
          }
        }

        // Priority 2: table rows (first column = company name)
        if (Array.isArray(block.table) && block.table.length > 1) {
          // Check if first row header suggests companies
          const header = (block.table[0] || []).join(' ').toLowerCase();
          const isCompanyTable = /bureau|agency|bedrijf|company|naam|name|specialist/i.test(header);
          if (isCompanyTable) {
            for (let r = 1; r < block.table.length; r++) {
              if (block.table[r][0]) addCompany(String(block.table[r][0]));
            }
          }
        }
        // Also check formatted table
        if (Array.isArray(block.formatted)) {
          for (const row of block.formatted) {
            // Look for keys that suggest company names
            const vals = Object.values(row);
            const keys = Object.keys(row);
            const nameKey = keys.find(k => /bureau|agency|bedrijf|company|naam|name/i.test(k));
            if (nameKey && row[nameKey]) addCompany(String(row[nameKey]));
          }
        }
      }

      // Priority 3: "CompanyName: description" from list items (only if < 3 found via links)
      if (rankings.length < 3) {
        for (const block of data.text_blocks) {
          if (Array.isArray(block.list)) {
            for (const item of block.list) {
              const snippet = item.snippet || '';
              const match = snippet.match(/^([^:(]{2,40})\s*(?:\([^)]*\))?\s*:/);
              if (match) addCompany(match[1]);
            }
          }
        }
      }
    }

    // Fallback: parseRankings on markdown (catches numbered lists)
    if (rankings.length < 3 && (data.reconstructed_markdown || fullResponse)) {
      const parsed = parseRankings(data.reconstructed_markdown || fullResponse, brandName, domain);
      if (parsed.rankings.length > rankings.length) {
        return { ...parsed, platform: 'google_ai', fullResponse };
      }
    }

    // Find brand in rankings
    const brandLower = brandName.toLowerCase().trim();
    const domainBase = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').split('.')[0].toLowerCase();
    let brandPosition = null;
    let snippet = '';

    for (const r of rankings) {
      const nameLower = r.name.toLowerCase();
      if (nameLower.includes(brandLower) || brandLower.includes(nameLower) || nameLower.includes(domainBase)) {
        brandPosition = r.position;
        r.isTarget = true;
        break;
      }
    }

    // Extract snippet around brand mention
    const textLower = fullResponse.toLowerCase();
    const brandIndex = textLower.indexOf(brandLower);
    if (brandIndex !== -1) {
      const start = Math.max(0, brandIndex - 50);
      const end = Math.min(fullResponse.length, brandIndex + brandLower.length + 150);
      snippet = fullResponse.substring(start, end).trim();
    }

    console.log(`[Rank Tracker] Google AI Mode: ${rankings.length} companies found, brand position: ${brandPosition}`);

    return {
      platform: 'google_ai',
      found: brandPosition !== null || textLower.includes(brandLower) || textLower.includes(domainBase),
      position: brandPosition,
      totalResults: rankings.length,
      rankings,
      snippet,
      fullResponse,
    };

  } catch (error) {
    console.error('[Rank Tracker] Google AI Mode exception:', error.message);
    return { platform: 'google_ai', found: false, position: null, totalResults: 0, rankings: [], snippet: '', fullResponse: '', error: true, errorMessage: 'Google AI Mode tijdelijk niet beschikbaar' };
  }
}

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
    
    // Genereer natuurlijke prompt
    const prompt = generatePrompt(keyword, serviceArea, locale);
    
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
