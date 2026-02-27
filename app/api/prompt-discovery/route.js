// app/api/prompt-discovery/route.js
// ═══════════════════════════════════════════════════════════════
// AI PROMPT EXPLORER — Full pipeline:
//   1. URL scrape → keyword extraction (or manual keyword)
//   2. Claude generates 50 clustered prompts with volume estimates
//   3. Google AI Mode scans for real competitor data (Pro tier)
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateSessionToken } from '@/lib/session-token'

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
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '0f2289b685e1cf063f5c6572e2dcef83'
const SERPAPI_KEY = process.env.SERPAPI_KEY
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

// ═══════════════════════════════════════════════
// SLACK NOTIFICATION
// ═══════════════════════════════════════════════

async function notifySlack({ url, keyword, brandName, branche, serviceArea, promptCount, clusterCount, source }) {
  if (!SLACK_WEBHOOK_URL) return
  try {
    const input = url ? `🌐 URL: ${url}` : `🔍 Keyword: ${keyword}`
    const extra = [brandName && `🏢 ${brandName}`, branche && `📂 ${branche}`, serviceArea && `📍 ${serviceArea}`].filter(Boolean).join(' · ')
    const text = [
      `🧩 *Prompt Explorer scan*`,
      input,
      extra && extra,
      `✅ ${promptCount} prompts in ${clusterCount} clusters`,
      source?.title && `📄 ${source.title}`,
      source?.method === 'failed' ? `⚠️ Scrape mislukt (firewall/bot protection)` : source?.method && `🔧 ${source.method}`,
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


// ═══════════════════════════════════════════════
// SCRAPE HELPERS
// ═══════════════════════════════════════════════

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
      /dienst|service|product|oploss|behandel|specialist|aanbod|werkgebied|wat-we|over-ons/i.test(href + text))
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


// ═══════════════════════════════════════════════
// KEYWORD EXTRACTION (Claude)
// ═══════════════════════════════════════════════

async function extractKeywords(parsed) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `Je bent een expert in zoekwoord-extractie voor Nederlandse websites. Je taak is om de 10 belangrijkste zoekwoorden te identificeren waarmee KLANTEN naar dit bedrijf zouden zoeken.

BELANGRIJK: Geef zoekwoorden die KLANTEN typen, niet interne/technische termen.
- Goed: "advocaat arbeidsrecht amsterdam", "letselschade advocaat", "kosten advocaat"
- Fout: "webdesign", "webhosting", "WordPress", "SEO" (tenzij dat de core dienst IS)

Als de content vaag of technisch is, afleiden uit de context wat het bedrijf DOET en voor WIE.
Geef ALLEEN JSON terug.`,
    messages: [{ role: 'user', content: `Analyseer deze homepage en extraheer de 10 zoekwoorden die KLANTEN van dit bedrijf typen in Google of AI:

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

FOCUS op zoekwoorden die de KLANT typt, niet het bedrijf zelf. ALLEEN JSON.` }]
  })
  const text = msg.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(text)
}


// ═══════════════════════════════════════════════
// PROMPT GENERATION (Claude — 50 prompts)
// ═══════════════════════════════════════════════

async function generatePrompts({ keywords, companyName, category, location, services, targetAudience, manualKeyword, branche, serviceArea }) {
  
  // Build rich context — same approach as AI visibility scan
  const hasWebsiteData = keywords?.length > 0
  
  let websiteContext = ''
  if (hasWebsiteData) {
    websiteContext = `
**BEDRIJFSCONTEXT:**
- Bedrijfsnaam: ${companyName || 'Onbekend'}
- Branche: ${category || branche || 'Onbekend'}
- Locatie: ${location || serviceArea || 'Nederland'}
- Diensten/producten: ${(services || []).join(', ') || 'Onbekend'}
- Doelgroep: ${targetAudience || 'Onbekend'}

**🚨 GEËXTRAHEERDE KEYWORDS — GEBRUIK EXACT DEZE TERMEN:**
${keywords.map((kw, i) => `${i + 1}. "${kw}"`).join('\n')}

🎯 Gebruik deze keywords als BASIS. Elke vraag moet aansluiten bij wat het bedrijf daadwerkelijk aanbiedt.
🚨 Verdeel de 50 vragen EERLIJK over alle keywords — elk keyword moet in minimaal 3-5 vragen terugkomen.
⚠️ GEBRUIK DE EXACTE KEYWORDS — geen synoniemen die de betekenis veranderen.`
  } else {
    websiteContext = `
**ZOEKWOORD:** "${manualKeyword}"
**BRANCHE:** ${branche || 'Onbekend'}
**SERVICEGEBIED:** ${serviceArea || 'Nederland'}

🎯 Alle 50 vragen moeten "${manualKeyword}" of een directe variant bevatten.`
  }

  const locationInstruction = (location || serviceArea)
    ? `\n**📍 LOCATIE-VERDELING:**
- ~25 vragen MET locatie "${location || serviceArea}" (bijv. "beste X in ${location || serviceArea}")
- ~25 vragen ZONDER locatie (generieke vragen — test landelijke zichtbaarheid)`
    : ''

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: `Jij genereert commerciële, klantgerichte zoekvragen die echte mensen LETTERLIJK typen in ChatGPT, Perplexity of Google AI Mode.

Dit gaat over vragen die gericht zijn op het VINDEN van **specifieke bedrijven, dienstverleners of producten** — niet over content-creatie.

**ABSOLUTE PRIORITEITEN:**
1. **NATUURLIJKHEID**: Vragen klinken als ECHTE MENSEN die advies vragen aan een slimme vriend
2. **COMMERCIEEL**: 60%+ is gericht op het VINDEN van een bedrijf/dienst/product
3. **BEDRIJFSNEUTRAAL**: Vermeld NOOIT de bedrijfsnaam — dit zijn vragen van mensen die het bedrijf nog niet kennen
4. **VARIATIE**: Veel verschillende vraagstructuren, startwoorden en invalshoeken
5. **NEDERLANDS**: ALTIJD en UITSLUITEND Nederlands

**ZO PRATEN ECHTE MENSEN TEGEN AI — kopieer deze STIJL en LENGTE:**
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

**VERBODEN — dit zijn CONTENT-OPDRACHTEN, geen zoekvragen:**
❌ "Genereer een landingspagina over advocaten"
❌ "Schrijf een artikel over letselschade"
❌ "Maak content over hypotheekadvies"
❌ "Creëer een overzicht van accountants"
❌ "Lijst alle kantoren in Amsterdam op"
❌ Korte fragmenten zonder context (bijv. alleen "advocaat amsterdam")
❌ Vragen korter dan 8 woorden

**TAAL & GRAMMATICA — KRITISCH:**
- Schrijf CORRECT Nederlands met alle voorzetsels: "in Amsterdam", "in Den Haag", "in Utrecht" — NOOIT voorzetsels weglaten
  ❌ "Beste advocaat Den Haag" → ✅ "Beste advocaat in Den Haag"
  ❌ "Loodgieter Rotterdam voor lekkage" → ✅ "Loodgieter in Rotterdam voor lekkage"
- Plaatsnamen ALTIJD met hoofdletter: Amsterdam, Den Haag, Utrecht, Rotterdam — NOOIT "amsterdam", "den haag"
- Volledige natuurlijke zinnen, geen telegramstijl

**LENGTE:** Vragen zijn typisch 8-18 woorden. Natuurlijke zinnen, geen losse keywords.

Geef ALLEEN een JSON array terug.`,
    messages: [{ role: 'user', content: `Genereer EXACT 50 natuurlijke zoekvragen die potentiële klanten LETTERLIJK typen in ChatGPT, Perplexity of Google AI Mode:

${websiteContext}
${locationInstruction}

**OUTPUT — JSON array met 50 objecten:**
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
Voorbeelden van goede clusternamen:
- "Beste [dienst] in [regio]" (top-lijsten, aanbevelingen)
- "Kosten & prijzen" (wat kost X, tarieven, prijsvergelijking)
- "Vergelijking & keuze" (A vs B, verschillen, waar op letten)
- "Reviews & ervaringen" (ervaringen met, betrouwbaarheid, klachten)
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

**KWALITEITSCHECK — ELKE vraag moet:**
✅ Klinken als iets dat een echt persoon typt in ChatGPT
✅ Minimaal 8 woorden lang zijn, maximaal 18 woorden
✅ Volledig uitgeschreven zijn, geen afkortingen met puntjes
✅ Een duidelijke zoekintentie hebben
✅ NIET beginnen met "Genereer", "Schrijf", "Maak", "Creëer", "Lijst", "Geef een overzicht"

ALLEEN de JSON array, geen extra tekst.` }]
  })

  const text = msg.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(text).map((p, i) => {
    const gv = p.estimatedGoogleVolume || 500
    const factor = Math.max(0.08, (p.intent === 'commercial' ? 0.20 : 0.15) + (p.trendSignal === 'rising' ? 0.05 : p.trendSignal === 'declining' ? -0.03 : 0))
    const ds = p.difficulty === 'easy' ? 8 + Math.round(Math.random() * 22) : p.difficulty === 'hard' ? 60 + Math.round(Math.random() * 25) : 30 + Math.round(Math.random() * 30)
    return { id: i, text: p.text, intent: p.intent || 'informational', intentCluster: p.intentCluster || 'Overig', coreKeyword: p.coreKeyword || '', trendSignal: p.trendSignal || 'stable', estimatedGoogleVolume: gv, estimatedAiVolume: Math.round(gv * factor), difficulty: p.difficulty || 'medium', difficultyScore: ds, yourStatus: 'not_scanned', topCompetitors: [] }
  })
}


// ═══════════════════════════════════════════════
// GOOGLE AI MODE SCAN (SerpAPI — Pro only)
// ═══════════════════════════════════════════════

async function scanGoogleAiMode(prompt, companyName) {
  if (!SERPAPI_KEY) return { competitors: [], mentioned: false, snippet: null }
  try {
    const params = new URLSearchParams({ engine: 'google_ai_mode', q: prompt, hl: 'nl', gl: 'nl', api_key: SERPAPI_KEY })
    const r = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(20000) })
    if (!r.ok) return { competitors: [], mentioned: false, snippet: null }
    const data = await r.json()
    const blocks = data.ai_mode_response?.text_blocks || []
    const fullText = blocks.map(b => b.text || b.snippet || '').join(' ')
    const competitors = []
    ;(data.ai_mode_response?.citations || []).forEach(c => {
      if (c.title?.length > 2 && c.title.length < 80) {
        const brand = c.title.split(' - ')[0].split(' | ')[0].split(' · ')[0].trim()
        if (brand.length > 1 && !competitors.includes(brand)) competitors.push(brand)
      }
    })
    return { competitors: competitors.slice(0, 8), mentioned: companyName ? fullText.toLowerCase().includes(companyName.toLowerCase()) : false, snippet: fullText.slice(0, 300) || null }
  } catch (_) {
    return { competitors: [], mentioned: false, snippet: null }
  }
}

async function scanTopPrompts(prompts, companyName, max = 10) {
  const seen = new Set(), toScan = []
  const sorted = [...prompts].sort((a, b) => b.estimatedAiVolume - a.estimatedAiVolume)
  for (const p of sorted) { if (toScan.length >= max) break; if (!seen.has(p.intentCluster)) { seen.add(p.intentCluster); toScan.push(p) } }
  for (const p of sorted) { if (toScan.length >= max) break; if (!toScan.includes(p)) toScan.push(p) }

  const results = new Map()
  for (let i = 0; i < toScan.length; i += 3) {
    const batch = toScan.slice(i, i + 3)
    const br = await Promise.all(batch.map(p => scanGoogleAiMode(p.text, companyName)))
    batch.forEach((p, j) => results.set(p.id, br[j]))
    if (i + 3 < toScan.length) await new Promise(r => setTimeout(r, 1000))
  }

  return prompts.map(p => {
    const s = results.get(p.id)
    return s ? { ...p, yourStatus: s.mentioned ? 'found' : 'not_found', topCompetitors: s.competitors, aiModeSnippet: s.snippet } : p
  })
}


// ═══════════════════════════════════════════════
// CLUSTER BUILDER
// ═══════════════════════════════════════════════

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


// ═══════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════

export async function POST(request) {
  try {
    const body = await request.json()
    const { url, keyword, tier = 'anonymous', scanCompetitors = false } = body
    // Accept both old (branche/serviceArea) and new (industry/location/brandName) field names
    const branche = body.industry || body.branche || ''
    const serviceArea = body.location || body.serviceArea || ''
    const brandName = body.brandName || ''

    const { sessionToken } = await getOrCreateSessionToken()
    const supabase = await createServiceClient()

    if (!url && !keyword)
      return NextResponse.json({ error: 'Vul een URL of zoekwoord in' }, { status: 400, headers: CORS })

    // BETA: All features free — no tier limits
    const LIMITS = { anonymous: { maxPrompts: 999, maxVolumes: 999 }, free: { maxPrompts: 999, maxVolumes: 999 }, pro: { maxPrompts: 999, maxVolumes: 999 } }
    const lim = LIMITS[tier] || LIMITS.anonymous

    let extracted = null, source = null

    // Step 1: Keywords from URL
    if (url) {
      console.log(`🌐 Scraping ${url}`)
      const scrape = await scrapeWebsite(url)
      if (scrape.success) {
        const parsed = parseHtml(scrape.html)
        source = { title: parsed.title, metaDesc: parsed.metaDesc, h1: parsed.h1s[0], method: scrape.method }
        extracted = await extractKeywords(parsed)
        console.log(`✅ Keywords: ${extracted.keywords?.join(', ')}`)
      } else {
        // Scrape failed (firewall, bot protection, etc.)
        // Extract domain name as fallback keyword
        console.log(`⚠️ Scrape failed for ${url} — using domain as fallback`)
        try {
          const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
          const domainParts = domain.split('.')[0].replace(/[-_]/g, ' ')
          source = { title: `${domain} (scrape failed)`, metaDesc: '', h1: '', method: 'failed' }
          // If branche or brandName provided, use those instead of guessing from domain
          if (branche || brandName) {
            console.log(`🔄 Using branche/brandName as keyword fallback: ${branche || brandName}`)
          }
        } catch (_) {}
      }
    }

    // Step 2: Generate 50 prompts
    console.log(`🧩 Generating prompts...`)
    const all = await generatePrompts({
      keywords: extracted?.keywords || [], companyName: extracted?.companyName || brandName || '',
      category: extracted?.category || branche || '', location: extracted?.location || serviceArea || '',
      services: extracted?.services || [], targetAudience: extracted?.targetAudience || '',
      manualKeyword: keyword || '', branche, serviceArea,
    })
    console.log(`✅ ${all.length} prompts`)

    // Step 3: Google AI Mode (Pro)
    let scanned = all
    if (scanCompetitors && tier === 'pro' && SERPAPI_KEY) {
      console.log(`🔍 Google AI Mode scan...`)
      scanned = await scanTopPrompts(all, extracted?.companyName || brandName || '', 10)
    }

    // Step 4: Limit & respond
    const limited = scanned.slice(0, lim.maxPrompts)
    const clusters = buildClusters(limited)

    const compCounts = {}
    scanned.forEach(p => (p.topCompetitors || []).forEach(c => { compCounts[c] = (compCounts[c] || 0) + 1 }))
    const topCompetitors = Object.entries(compCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }))

    // Slack notification (fire and forget — don't block response)
    notifySlack({
      url, keyword, brandName, branche, serviceArea,
      promptCount: limited.length, clusterCount: clusters.length, source,
    })

    // ✨ Save resultaten in Supabase (ook voor anonieme gebruikers)
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
          }
        })

      if (saveError) {
        console.error('⚠️ Error saving prompt discovery results:', saveError.message)
      } else {
        console.log(`✅ Prompt discovery results saved (session: ${sessionToken.slice(0, 8)}...)`)
      }
    } catch (saveErr) {
      console.error('⚠️ Prompt discovery save error:', saveErr.message)
    }

    return NextResponse.json({
      success: true, prompts: limited, clusters, topCompetitors,
      extractedKeywords: extracted?.keywords || [],
      companyName: extracted?.companyName || brandName || '',
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
