// app/api/prompt-discovery/route.js
// Bilingual AI Prompt Explorer - output language follows frontend locale
// Pipeline: 1. URL scrape -> keyword extraction  2. 50 clustered prompts  3. Google AI Mode (Pro)

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateSessionToken } from '@/lib/session-token'
import { isBlockedUrl, hasNonLatinText, getLanguageBlockError } from '@/lib/language-guard'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const SERPAPI_KEY = process.env.SERPAPI_KEY
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL


// ===============================================
// SLACK NOTIFICATION
// ===============================================

async function notifySlack({ url, keyword, brandName, branche, serviceArea, promptCount, clusterCount, source, lang }) {
  if (!SLACK_WEBHOOK_URL) return
  try {
    const input = url ? `URL: ${url}` : `Keyword: ${keyword}`
    const extra = [brandName && brandName, branche && branche, serviceArea && serviceArea].filter(Boolean).join(' | ')
    const text = [
      `Prompt Explorer scan (${lang})`,
      input,
      extra && extra,
      `${promptCount} prompts in ${clusterCount} clusters`,
      source?.title && source.title,
      source?.method === 'failed' ? `Scrape failed (firewall/bot protection)` : source?.method && source.method,
    ].filter(Boolean).join('\n')

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (e) {
    console.error('Slack notification failed:', e.message)
  }
}


// ===============================================
// SCRAPE HELPERS
// ===============================================

function isGarbagePage(html) {
  const lower = html.toLowerCase()
  const signals = [
    'checking your browser', 'just a moment', 'verify you are human',
    'cf-browser-verification', 'challenge-platform', '_cf_chl',
    'attention required', 'ddos protection', 'security check',
    'access denied', 'bot protection', 'are you a robot',
    'domain is parked', 'this domain is for sale', 'buy this domain',
    'under construction', 'coming soon', 'website binnenkort beschikbaar',
  ]
  if (signals.some(s => lower.includes(s))) return true
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '').trim()
  return text.length < 300 && !/<h1[^>]*>/i.test(html)
}

async function scrapeWebsite(url) {
  let norm = url.trim()
  if (!/^https?:\/\//i.test(norm)) norm = 'https://' + norm
  const obj = new URL(norm)
  const www = obj.hostname.startsWith('www.') ? norm : norm.replace('://', '://www.')

  for (const u of [norm, www]) {
    try {
      const r = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      })
      if (r.ok) {
        const html = await r.text()
        if (!isGarbagePage(html) && html.length > 500)
          return { success: true, html, method: 'direct' }
      }
    } catch (_) {}
  }

  if (!SCRAPER_API_KEY) {
    console.log('SCRAPER_API_KEY not configured - skipping ScraperAPI')
    return { success: false }
  }

  for (const u of [norm, www]) {
    try {
      const r = await fetch(
        `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(u)}&render=true&premium=true&country_code=nl`,
        { headers: { 'Accept': 'text/html' }, signal: AbortSignal.timeout(30000) }
      )
      if (r.ok) {
        const html = await r.text()
        if (!isGarbagePage(html))
          return { success: true, html, method: 'scraperapi-premium' }
      }
    } catch (_) {}
  }

  return { success: false }
}

function parseHtml(html) {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || ''
  const metaDesc = (
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) || []
  )[1]?.trim() || ''

  const grab = (tag, max) => (html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')) || [])
    .map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, max)

  const h1s = grab('h1', 3), h2s = grab('h2', 8), h3s = grab('h3', 8)

  const navItems = []
  ;(html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || []).forEach(nav => {
    ;(nav.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) || []).forEach(link => {
      const t = link.replace(/<[^>]+>/g, '').trim()
      if (t.length > 1 && t.length < 60) navItems.push(t)
    })
  })

  const serviceLinks = []
  ;(html.match(/<a[^>]*href=["']\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi) || []).forEach(link => {
    const href = (link.match(/href=["']([^"']+)["']/) || [])[1] || ''
    const text = link.replace(/<[^>]+>/g, '').trim()
    if (href && text.length > 2 && text.length < 80 &&
      /dienst|service|product|oploss|behandel|specialist|aanbod|werkgebied|wat-we|over-ons|about|pricing|solutions|offerings|portfolio|what-we/i.test(href + text))
      serviceLinks.push(`${text} (${href})`)
  })

  const body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)

  return { title, metaDesc, h1s, h2s, h3s, navItems: [...new Set(navItems)].slice(0, 15), serviceLinks: [...new Set(serviceLinks)].slice(0, 10), body }
}


// ===============================================
// KEYWORD EXTRACTION (Claude) - Bilingual
// Output language follows frontend locale, NOT website language
// ===============================================

async function extractKeywords(parsed, lang = 'nl') {
  const isNl = lang === 'nl'
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: isNl
      ? `Je bent een expert in zoekwoord-extractie voor Nederlandse websites. Je taak is om de 10 belangrijkste zoekwoorden te identificeren waarmee KLANTEN naar dit bedrijf zouden zoeken.

BELANGRIJK: Geef zoekwoorden die KLANTEN typen, niet interne/technische termen.
- Goed: "advocaat arbeidsrecht amsterdam", "letselschade advocaat", "kosten advocaat"
- Fout: "webdesign", "webhosting", "WordPress", "SEO" (tenzij dat de core dienst IS)

Als de content vaag of technisch is, afleiden uit de context wat het bedrijf DOET en voor WIE.
ALLE zoekwoorden MOETEN in het NEDERLANDS zijn.
Geef ALLEEN JSON terug.`
      : `You are an expert in keyword extraction for websites. Your task is to identify the 10 most important keywords that CUSTOMERS would use to search for this business.

IMPORTANT: Provide keywords that CUSTOMERS type, not internal/technical terms.
- Good: "bike tours amsterdam", "cycling rental amsterdam", "guided bike tour"
- Bad: "webdesign", "webhosting", "WordPress", "SEO" (unless that IS the core service)

If the content is vague or technical, infer from context what the business DOES and for WHOM.
ALL keywords MUST be in ENGLISH.
Return ONLY JSON.`,
    messages: [{ role: 'user', content: isNl
      ? `Analyseer deze homepage en extraheer de 10 zoekwoorden die KLANTEN van dit bedrijf typen in Google of AI:

TITEL: ${parsed.title}
META: ${parsed.metaDesc}
H1: ${parsed.h1s.join(' | ') || 'Geen'}
H2: ${parsed.h2s.join(' | ') || 'Geen'}
H3: ${parsed.h3s.join(' | ') || 'Geen'}
NAV: ${parsed.navItems.join(' | ') || 'Geen'}
DIENSTEN: ${parsed.serviceLinks.join(' | ') || 'Geen'}
CONTENT: ${parsed.body.slice(0, 2000)}

Geef JSON:
{ "keywords": ["kw1",...,"kw10"], "companyName": "naam", "category": "branche", "location": "locatie of null", "services": ["d1","d2","d3"], "targetAudience": "doelgroep" }

FOCUS op zoekwoorden die de KLANT typt, niet het bedrijf zelf. ALLE zoekwoorden in het NEDERLANDS. ALLEEN JSON.`
      : `Analyze this homepage and extract the 10 keywords that CUSTOMERS of this business type in Google or AI:

TITLE: ${parsed.title}
META: ${parsed.metaDesc}
H1: ${parsed.h1s.join(' | ') || 'None'}
H2: ${parsed.h2s.join(' | ') || 'None'}
H3: ${parsed.h3s.join(' | ') || 'None'}
NAV: ${parsed.navItems.join(' | ') || 'None'}
SERVICES: ${parsed.serviceLinks.join(' | ') || 'None'}
CONTENT: ${parsed.body.slice(0, 2000)}

Return JSON:
{ "keywords": ["kw1",...,"kw10"], "companyName": "name", "category": "industry", "location": "location or null", "services": ["s1","s2","s3"], "targetAudience": "target audience" }

FOCUS on keywords the CUSTOMER types, not the business itself. ALL keywords in ENGLISH. ONLY JSON.` }]
  })
  const text = msg.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(text)
}


// ===============================================
// PROMPT GENERATION (Claude - 50 prompts) - Bilingual
// Output language follows frontend locale
// ===============================================

async function generatePrompts({ keywords, companyName, category, location, services, targetAudience, manualKeyword, branche, serviceArea, lang = 'nl' }) {
  const isNl = lang === 'nl'

  const hasWebsiteData = keywords?.length > 0

  let websiteContext = ''
  if (hasWebsiteData) {
    websiteContext = isNl ? `
**BEDRIJFSCONTEXT:**
- Bedrijfsnaam: ${companyName || 'Onbekend'}
- Branche: ${category || branche || 'Onbekend'}
- Locatie: ${location || serviceArea || 'Nederland'}
- Diensten/producten: ${(services || []).join(', ') || 'Onbekend'}
- Doelgroep: ${targetAudience || 'Onbekend'}

**GEEXTRAHEERDE KEYWORDS -- GEBRUIK EXACT DEZE TERMEN:**
${keywords.map((kw, i) => `${i + 1}. "${kw}"`).join('\n')}

Gebruik deze keywords als BASIS. Elke vraag moet aansluiten bij wat het bedrijf daadwerkelijk aanbiedt.
Verdeel de 50 vragen EERLIJK over alle keywords -- elk keyword moet in minimaal 3-5 vragen terugkomen.
GEBRUIK DE EXACTE KEYWORDS -- geen synoniemen die de betekenis veranderen.` : `
**BUSINESS CONTEXT:**
- Company name: ${companyName || 'Unknown'}
- Industry: ${category || branche || 'Unknown'}
- Location: ${location || serviceArea || 'Netherlands'}
- Services/products: ${(services || []).join(', ') || 'Unknown'}
- Target audience: ${targetAudience || 'Unknown'}

**EXTRACTED KEYWORDS -- USE EXACTLY THESE TERMS:**
${keywords.map((kw, i) => `${i + 1}. "${kw}"`).join('\n')}

Use these keywords as your BASE. Every question must relate to what the business actually offers.
Distribute the 50 questions EVENLY across all keywords -- each keyword must appear in at least 3-5 questions.
USE THE EXACT KEYWORDS -- no synonyms that change the meaning.`
  } else {
    websiteContext = isNl ? `
**ZOEKWOORD:** "${manualKeyword}"
**BRANCHE:** ${branche || 'Onbekend'}
**SERVICEGEBIED:** ${serviceArea || 'Nederland'}

Alle 50 vragen moeten "${manualKeyword}" of een directe variant bevatten.` : `
**KEYWORD:** "${manualKeyword}"
**INDUSTRY:** ${branche || 'Unknown'}
**SERVICE AREA:** ${serviceArea || 'Netherlands'}

All 50 questions must contain "${manualKeyword}" or a direct variant.`
  }

  const locationInstruction = (location || serviceArea)
    ? (isNl
      ? `\n**LOCATIE-VERDELING:**\n- ~25 vragen MET locatie "${location || serviceArea}" (bijv. "beste X in ${location || serviceArea}")\n- ~25 vragen ZONDER locatie (generieke vragen -- test landelijke zichtbaarheid)`
      : `\n**LOCATION DISTRIBUTION:**\n- ~25 questions WITH location "${location || serviceArea}" (e.g. "best X in ${location || serviceArea}")\n- ~25 questions WITHOUT location (generic questions -- test national visibility)`)
    : ''

  const systemPrompt = isNl
    ? `Jij genereert commerciele, klantgerichte zoekvragen die echte mensen LETTERLIJK typen in ChatGPT, Perplexity of Google AI Mode.

Dit gaat over vragen die gericht zijn op het VINDEN van **specifieke bedrijven, dienstverleners of producten** -- niet over content-creatie.

**ABSOLUTE PRIORITEITEN:**
1. **NATUURLIJKHEID**: Vragen klinken als ECHTE MENSEN die advies vragen aan een slimme vriend
2. **COMMERCIEEL**: 60%+ is gericht op het VINDEN van een bedrijf/dienst/product
3. **BEDRIJFSNEUTRAAL**: Vermeld NOOIT de bedrijfsnaam -- dit zijn vragen van mensen die het bedrijf nog niet kennen
4. **VARIATIE**: Veel verschillende vraagstructuren, startwoorden en invalshoeken
5. **NEDERLANDS**: ALTIJD en UITSLUITEND Nederlands -- GEEN Engelse woorden

**ZO PRATEN ECHTE MENSEN TEGEN AI -- kopieer deze STIJL en LENGTE:**
- "Wat is de beste accountant in Amsterdam voor een klein bedrijf?"
- "Hoeveel kost een gemiddelde keukenrenovatie in Nederland?"
- "Kun je goede advocatenkantoren in Den Haag vergelijken voor arbeidsrecht?"
- "Ik zoek een betrouwbare loodgieter in Utrecht, waar moet ik op letten?"
- "Welke marketingbureaus in Nederland zijn het beste voor startups?"
- "Wat zijn ervaringen met zonnepanelen laten installeren?"
- "Zelf belastingaangifte doen of een boekhouder inschakelen?"
- "Wat is het verschil tussen een notaris en een advocaat?"
- "Top 5 tandartsen in Rotterdam met goede reviews?"
- "Waar moet ik op letten bij het kiezen van een financieel adviseur?"

**VERBODEN -- dit zijn CONTENT-OPDRACHTEN, geen zoekvragen:**
- "Genereer een landingspagina over advocaten"
- "Schrijf een artikel over letselschade"
- "Maak content over hypotheekadvies"
- Korte fragmenten zonder context (bijv. alleen "advocaat amsterdam")
- Vragen korter dan 8 woorden
- Engelse woorden in Nederlandse zinnen

**TAAL & GRAMMATICA -- KRITISCH:**
- Schrijf CORRECT Nederlands met alle voorzetsels: "in Amsterdam", "in Den Haag", "in Utrecht" -- NOOIT voorzetsels weglaten
- Plaatsnamen ALTIJD met hoofdletter: Amsterdam, Den Haag, Utrecht, Rotterdam
- Volledige natuurlijke zinnen, geen telegramstijl
- 100% Nederlands -- GEEN Engelse woorden mengen

**LENGTE:** Vragen zijn typisch 8-18 woorden. Natuurlijke zinnen, geen losse keywords.

Geef ALLEEN een JSON array terug.`
    : `You generate commercial, customer-focused search queries that real people LITERALLY type into ChatGPT, Perplexity, or Google AI Mode.

These are questions aimed at FINDING **specific businesses, service providers, or products** -- not content creation.

**ABSOLUTE PRIORITIES:**
1. **NATURAL**: Questions sound like REAL PEOPLE asking a smart friend for advice
2. **COMMERCIAL**: 60%+ aimed at FINDING a business/service/product
3. **BRAND-NEUTRAL**: NEVER mention the company name -- these are questions from people who don't know the business yet
4. **VARIETY**: Many different question structures, opening words, and angles
5. **ENGLISH**: ALWAYS and EXCLUSIVELY English -- NO Dutch words or phrases

**HOW REAL PEOPLE TALK TO AI -- copy this STYLE and LENGTH:**
- "What's the best bike tour in Amsterdam for tourists?"
- "How much does a guided cycling tour cost in the Netherlands?"
- "Can you compare good bike rental companies in Amsterdam?"
- "I'm looking for a fun group activity in Amsterdam, what do you recommend?"
- "Which tour companies in Amsterdam have the best reviews?"
- "What are people's experiences with bike tours in Amsterdam?"
- "Best way to explore Amsterdam by bike as a tourist?"
- "What's the difference between a guided and self-guided bike tour?"
- "Top 5 outdoor activities in Amsterdam for families?"
- "Where should I look for a reliable bike rental in Amsterdam?"

**FORBIDDEN -- these are CONTENT tasks, not search queries:**
- "Generate a landing page about bike tours"
- "Write an article about cycling in Amsterdam"
- "Create content about tourism"
- Short fragments without context (e.g. just "bike tour amsterdam")
- Questions shorter than 8 words
- Dutch words in English sentences

**LANGUAGE -- CRITICAL:**
- Write correct English with proper grammar
- Place names ALWAYS capitalized: Amsterdam, The Hague, Utrecht, Rotterdam
- Complete natural sentences, no telegram style
- 100% English -- NO Dutch words mixed in

**LENGTH:** Questions are typically 8-18 words. Natural sentences, not loose keywords.

Return ONLY a JSON array.`

  const userPrompt = isNl
    ? `Genereer EXACT 50 natuurlijke zoekvragen die potentiele klanten LETTERLIJK typen in ChatGPT, Perplexity of Google AI Mode:

${websiteContext}
${locationInstruction}

**OUTPUT -- JSON array met 50 objecten:**
[{
  "text": "de volledige vraag zoals een echt persoon die letterlijk typt in ChatGPT",
  "intent": "commercial|informational",
  "intentCluster": "thematische clusternaam",
  "coreKeyword": "het hoofdkeyword",
  "trendSignal": "rising|stable|declining",
  "estimatedGoogleVolume": getal,
  "difficulty": "easy|medium|hard"
}]

**CLUSTER-VERDELING (10-15 clusters van 3-5 vragen):**

**VERPLICHT CLUSTER — "Reviews, ervaringen & vertrouwen" (minimaal 6 vragen):**
Dit cluster moet ALTIJD aanwezig zijn met vragen over:
- Reviews en ervaringen ("beste reviews", "ervaringen met")
- Betrouwbaarheid ("betrouwbare", "meest ervaren", "meest gekozen")
- Keurmerken en certificeringen ("aangesloten bij", "gecertificeerd", "keurmerk")
- Aanbevelingen ("aanbevolen", "aanraden", "top beoordeeld")
Dit cluster heeft PRIORITEIT — genereer hier minimaal 6 vragen voor.

Voorbeelden van overige clusternamen:
- "Beste [dienst] in [regio]" (top-lijsten, aanbevelingen)
- "Kosten & prijzen" (wat kost X, tarieven, prijsvergelijking)
- "Vergelijking & keuze" (A vs B, verschillen, waar op letten)
- "Specialisaties" (niche expertise, specifieke diensten)
- "Wanneer nodig" (wanneer inschakelen, zelf doen vs professional)
- "Proces & werkwijze" (hoe werkt het, wat te verwachten, stappen)
- "Locatie-specifiek" (in [stad], regio [X], bij mij in de buurt)
- "Alternatieven" (andere opties, goedkoper alternatief)

**INTENT-VERDELING:**
- 60%+ commercial (vragen gericht op het VINDEN of INHUREN)
- 40% informational (kosten, proces, vergelijkingen, ervaringen, advies)

**VOLUME SCHATTING (Nederlandse markt):**
- easy = niche/long-tail (50-200/mnd), medium = gangbaar (200-1000/mnd), hard = concurrerend (1000+/mnd)
- rising = onderwerp groeit, stable = evergreen, declining = verouderd

**KWALITEITSCHECK -- ELKE vraag moet:**
- Klinken als iets dat een echt persoon typt in ChatGPT
- Minimaal 8 woorden lang zijn, maximaal 18 woorden
- Volledig uitgeschreven zijn, geen afkortingen met puntjes
- Een duidelijke zoekintentie hebben
- NIET beginnen met "Genereer", "Schrijf", "Maak", "Lijst", "Geef een overzicht"

ALLEEN de JSON array, geen extra tekst.`
    : `Generate EXACTLY 50 natural search queries that potential customers LITERALLY type into ChatGPT, Perplexity, or Google AI Mode:

${websiteContext}
${locationInstruction}

**OUTPUT -- JSON array with 50 objects:**
[{
  "text": "the full question as a real person literally types it into ChatGPT",
  "intent": "commercial|informational",
  "intentCluster": "thematic cluster name in English",
  "coreKeyword": "the main keyword",
  "trendSignal": "rising|stable|declining",
  "estimatedGoogleVolume": number,
  "difficulty": "easy|medium|hard"
}]

**CLUSTER DISTRIBUTION (10-15 clusters of 3-5 questions):**

**MANDATORY CLUSTER — "Reviews, experiences & trust" (minimum 6 questions):**
This cluster must ALWAYS be present with questions about:
- Reviews and experiences ("best reviews", "experiences with")
- Reliability ("most reliable", "most experienced", "most trusted")
- Certifications and credentials ("certified", "accredited", "member of")
- Recommendations ("recommended", "top rated", "highest rated")
This cluster has PRIORITY — generate at least 6 questions for it.

Examples of other cluster names:
- "Best [service] in [area]" (top lists, recommendations)
- "Costs & pricing" (how much does X cost, rates, price comparison)
- "Comparison & choice" (A vs B, differences, what to look for)
- "Specializations" (niche expertise, specific services)
- "When needed" (when to hire, DIY vs professional)
- "Process & approach" (how does it work, what to expect, steps)
- "Location-specific" (in [city], area [X], near me)
- "Alternatives" (other options, cheaper alternative)

**INTENT DISTRIBUTION:**
- 60%+ commercial (questions aimed at FINDING or HIRING)
- 40% informational (costs, process, comparisons, experiences, advice)

**VOLUME ESTIMATE (Dutch market):**
- easy = niche/long-tail (50-200/mo), medium = common (200-1000/mo), hard = competitive (1000+/mo)
- rising = topic growing, stable = evergreen, declining = outdated

**QUALITY CHECK -- EVERY question must:**
- Sound like something a real person types into ChatGPT
- Be at least 8 words long, maximum 18 words
- Be fully written out, no abbreviations with dots
- Have a clear search intent
- NOT start with "Generate", "Write", "Create", "List", "Give an overview"

ONLY the JSON array, no extra text.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })

  const text = msg.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(text).map((p, i) => {
    const gv = p.estimatedGoogleVolume || 500
    const factor = Math.max(0.08, (p.intent === 'commercial' ? 0.20 : 0.15) + (p.trendSignal === 'rising' ? 0.05 : p.trendSignal === 'declining' ? -0.03 : 0))
    const ds = p.difficulty === 'easy' ? 8 + Math.round(Math.random() * 22) : p.difficulty === 'hard' ? 60 + Math.round(Math.random() * 25) : 30 + Math.round(Math.random() * 30)
    return { id: i, text: p.text, intent: p.intent || 'informational', intentCluster: p.intentCluster || 'Overig', coreKeyword: p.coreKeyword || '', trendSignal: p.trendSignal || 'stable', estimatedGoogleVolume: gv, estimatedAiVolume: Math.round(gv * factor), difficulty: p.difficulty || 'medium', difficultyScore: ds, yourStatus: 'not_scanned', topCompetitors: [] }
  })
}


// ===============================================
// GOOGLE AI MODE SCAN (SerpAPI - Pro only) - Bilingual
// ===============================================

async function scanGoogleAiMode(prompt, companyName, lang = 'nl') {
  if (!SERPAPI_KEY) return { competitors: [], mentioned: false, snippet: null }
  try {
    const hl = lang === 'nl' ? 'nl' : 'en'
    const params = new URLSearchParams({ engine: 'google_ai_mode', q: prompt, hl, gl: 'nl', api_key: SERPAPI_KEY })
    const r = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(20000) })
    if (!r.ok) return { competitors: [], mentioned: false, snippet: null }
    const data = await r.json()
    const blocks = data.ai_mode_response?.text_blocks || []
    const fullText = blocks.map(b => b.text || b.snippet || '').join(' ')
    const competitors = []
    ;(data.ai_mode_response?.citations || []).forEach(c => {
      if (c.title?.length > 2 && c.title.length < 80) {
        const brand = c.title.split(' - ')[0].split(' | ')[0].trim()
        if (brand.length > 1 && !competitors.includes(brand)) competitors.push(brand)
      }
    })
    return { competitors: competitors.slice(0, 8), mentioned: companyName ? fullText.toLowerCase().includes(companyName.toLowerCase()) : false, snippet: fullText.slice(0, 300) || null }
  } catch (_) {
    return { competitors: [], mentioned: false, snippet: null }
  }
}

async function scanTopPrompts(prompts, companyName, max = 10, lang = 'nl') {
  const seen = new Set(), toScan = []
  const sorted = [...prompts].sort((a, b) => b.estimatedAiVolume - a.estimatedAiVolume)
  for (const p of sorted) { if (toScan.length >= max) break; if (!seen.has(p.intentCluster)) { seen.add(p.intentCluster); toScan.push(p) } }
  for (const p of sorted) { if (toScan.length >= max) break; if (!toScan.includes(p)) toScan.push(p) }

  const results = new Map()
  for (let i = 0; i < toScan.length; i += 3) {
    const batch = toScan.slice(i, i + 3)
    const br = await Promise.all(batch.map(p => scanGoogleAiMode(p.text, companyName, lang)))
    batch.forEach((p, j) => results.set(p.id, br[j]))
    if (i + 3 < toScan.length) await new Promise(r => setTimeout(r, 1000))
  }

  return prompts.map(p => {
    const s = results.get(p.id)
    return s ? { ...p, yourStatus: s.mentioned ? 'found' : 'not_found', topCompetitors: s.competitors, aiModeSnippet: s.snippet } : p
  })
}


// ===============================================
// CLUSTER BUILDER
// ===============================================

function buildClusters(prompts) {
  const map = {}
  prompts.forEach(p => {
    const k = p.intentCluster || 'Overig'
    if (!map[k]) map[k] = { name: k, prompts: [], totalVolume: 0 }
    map[k].prompts.push(p)
    map[k].totalVolume += p.estimatedAiVolume || 0
  })
  return Object.values(map).map(c => {
    const n = c.prompts.length
    c.avgDifficulty = Math.round(c.prompts.reduce((s, p) => s + p.difficultyScore, 0) / n)
    c.dominantIntent = c.prompts.filter(p => p.intent === 'commercial').length >= n / 2 ? 'commercial' : 'informational'
    const t = { rising: 0, stable: 0, declining: 0 }
    c.prompts.forEach(p => t[p.trendSignal || 'stable']++)
    c.dominantTrend = Object.entries(t).sort((a, b) => b[1] - a[1])[0][0]
    c.highOpp = c.prompts.filter(p => p.difficulty === 'easy').length
    return c
  }).sort((a, b) => b.totalVolume - a.totalVolume)
}


// ===============================================
// POST HANDLER
// ===============================================

export async function POST(request) {
  try {
    const body = await request.json()
    const { url, keyword, tier = 'anonymous', scanCompetitors = false } = body
    // Accept both old (branche/serviceArea) and new (industry/location/brandName) field names
    const branche = body.industry || body.branche || ''
    const serviceArea = body.location || body.serviceArea || ''
    const brandName = body.brandName || ''

    // Frontend locale = output language. Always.
    const lang = body.locale === 'en' ? 'en' : 'nl'

    const { sessionToken } = await getOrCreateSessionToken()
    const supabase = await createServiceClient()

    if (!url && !keyword)
      return NextResponse.json({ error: lang === 'nl' ? 'Vul een URL of zoekwoord in' : 'Enter a URL or keyword' }, { status: 400, headers: CORS })

    // 🌐 Language guard: block non-NL/EN websites and non-Latin input
    if (url && isBlockedUrl(url))
      return NextResponse.json({ error: getLanguageBlockError(lang) }, { status: 400, headers: CORS })
    if (keyword && hasNonLatinText(keyword))
      return NextResponse.json({ error: getLanguageBlockError(lang) }, { status: 400, headers: CORS })
    if (brandName && hasNonLatinText(brandName))
      return NextResponse.json({ error: getLanguageBlockError(lang) }, { status: 400, headers: CORS })

    // BETA: All features free -- no tier limits
    const LIMITS = { anonymous: { maxPrompts: 999, maxVolumes: 999 }, free: { maxPrompts: 999, maxVolumes: 999 }, pro: { maxPrompts: 999, maxVolumes: 999 } }
    const lim = LIMITS[tier] || LIMITS.anonymous

    let extracted = null, source = null

    // Step 1: Keywords from URL
    if (url) {
      console.log(`Scraping ${url} (output lang: ${lang})`)
      const scrape = await scrapeWebsite(url)
      if (scrape.success) {
        const parsed = parseHtml(scrape.html)
        source = { title: parsed.title, metaDesc: parsed.metaDesc, h1: parsed.h1s[0], method: scrape.method }
        extracted = await extractKeywords(parsed, lang)
        console.log(`Keywords (${lang}): ${extracted.keywords?.join(', ')}`)
      } else {
        console.log(`Scrape failed for ${url} -- using domain as fallback`)
        try {
          const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
          const domainParts = domain.split('.')[0].replace(/[-_]/g, ' ')
          source = { title: `${domain} (scrape failed)`, metaDesc: '', h1: '', method: 'failed' }
          if (branche || brandName) {
            console.log(`Using branche/brandName as keyword fallback: ${branche || brandName}`)
          }
        } catch (_) {}
      }
    }

    // Step 2: Generate 50 prompts
    console.log(`Generating prompts (${lang})...`)
    const all = await generatePrompts({
      keywords: extracted?.keywords || [], companyName: extracted?.companyName || brandName || '',
      category: extracted?.category || branche || '', location: extracted?.location || serviceArea || '',
      services: extracted?.services || [], targetAudience: extracted?.targetAudience || '',
      manualKeyword: keyword || '', branche, serviceArea, lang,
    })
    console.log(`${all.length} prompts generated`)

    // Step 3: Google AI Mode (Pro)
    let scanned = all
    if (scanCompetitors && tier === 'pro' && SERPAPI_KEY) {
      console.log(`Google AI Mode scan (${lang})...`)
      scanned = await scanTopPrompts(all, extracted?.companyName || brandName || '', 10, lang)
    }

    // Step 4: Limit & respond
    const limited = scanned.slice(0, lim.maxPrompts)
    const clusters = buildClusters(limited)

    const compCounts = {}
    scanned.forEach(p => (p.topCompetitors || []).forEach(c => { compCounts[c] = (compCounts[c] || 0) + 1 }))
    const topCompetitors = Object.entries(compCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }))

    // Slack notification (fire and forget)
    notifySlack({
      url, keyword, brandName, branche, serviceArea,
      promptCount: limited.length, clusterCount: clusters.length, source, lang,
    })

    // Save resultaten in Supabase (ook voor anonieme gebruikers)
    try {
      const { error: saveError } = await supabase
        .from('prompt_discovery_results')
        .insert({
          session_token: sessionToken,
          user_id: null,
          website: url || null,
          keywords: keyword || null,
          brand_name: extracted?.companyName || brandName || null,
          branche: branche || null,
          location: serviceArea || null,
          prompts: limited,
          clusters: clusters,
          extracted_keywords: extracted?.keywords || [],
          top_competitors: topCompetitors,
          source: source || null,
          meta: {
            totalGenerated: scanned.length,
            totalVisible: limited.length,
            tier,
            scannedOnGoogleAi: scanCompetitors && tier === 'pro',
            lang,
          }
        })

      if (saveError) {
        console.error('Error saving prompt discovery results:', saveError.message)
      } else {
        console.log(`Prompt discovery results saved (session: ${sessionToken.slice(0, 8)}...)`)
      }
    } catch (saveErr) {
      console.error('Prompt discovery save error:', saveErr.message)
    }

    return NextResponse.json({
      success: true, prompts: limited, clusters, topCompetitors,
      extractedKeywords: extracted?.keywords || [],
      companyName: extracted?.companyName || brandName || '',
      detectedLanguage: lang,
      sessionToken,
      meta: { totalGenerated: scanned.length, totalVisible: limited.length, hiddenCount: Math.max(0, scanned.length - limited.length), maxVolumes: lim.maxVolumes, tier, scannedOnGoogleAi: scanCompetitors && tier === 'pro' },
      extracted: extracted ? { keywords: extracted.keywords, companyName: extracted.companyName, category: extracted.category, location: extracted.location, services: extracted.services } : null,
      source,
    }, { headers: CORS })

  } catch (err) {
    console.error('Prompt discovery error:', err)
    return NextResponse.json({ error: 'Er ging iets mis. Probeer het opnieuw.' }, { status: 500, headers: CORS })
  }
}
