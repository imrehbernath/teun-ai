// app/api/v1/page/analyze/route.js
// Page Analysis & Prompt Matching — ULTIMATE VERSION
//
// Uses Claude Sonnet (same engine as Teun.ai webapp) for
// high-quality commercial prompt generation.

import { NextResponse } from 'next/server'
import { validateApiKey, supabase } from '@/lib/wp-plugin/auth'
import Anthropic from '@anthropic-ai/sdk'

// Claude Sonnet needs 10-15s, ScraperAPI ~5-10s (sequential if no location in WP content)
export const maxDuration = 45

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Quick scrape for location detection only
async function detectLocationFromPage(pageUrl) {
  // Try direct fetch first (free)
  try {
    console.log(`📍 Direct fetch for location: ${pageUrl}`)
    const r = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'nl-NL,nl;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    if (r.ok) {
      const html = await r.text()
      if (html.length > 500 && !isGarbagePageLight(html)) {
        const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
        const loc = detectLocation(bodyText.toLowerCase())
        if (loc) { console.log(`📍 Direct fetch found location: ${loc}`); return loc }
      }
    }
  } catch (e) { console.log(`⚠️ Direct fetch location: ${e.message}`) }

  // Fallback to ScraperAPI premium
  if (!SCRAPER_API_KEY) return null
  try {
    console.log(`📍 ScraperAPI premium for location: ${pageUrl}`)
    const r = await fetch(
      `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(pageUrl)}&render=true&premium=true&country_code=nl`,
      { signal: AbortSignal.timeout(20000) }
    )
    if (!r.ok) return null
    const html = await r.text()
    const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const loc = detectLocation(bodyText.toLowerCase())
    if (loc) console.log(`📍 ScraperAPI found location: ${loc}`)
    return loc
  } catch (e) {
    console.log(`⚠️ ScraperAPI location: ${e.message}`)
    return null
  }
}

function isGarbagePageLight(html) {
  const lower = html.toLowerCase()
  return ['checking your browser', 'just a moment', 'verify you are human', 'cf-browser-verification', 'challenge-platform', 'access denied'].some(s => lower.includes(s))
}

export async function POST(request) {
  try {
    // ─── Auth ───
    const apiKey = request.headers.get('x-api-key')
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const {
      website_id, page_url, page_path, post_id, language,
      title, h1, focus_keyword, content_excerpt, schema_types,
      force,
    } = body

    if (!website_id || !page_url) {
      return NextResponse.json({ error: 'website_id and page_url are required' }, { status: 400 })
    }

    const connection = auth.data.connections.find(c => c.website_id === website_id)
    if (!connection) {
      return NextResponse.json({ error: 'Website not found for this API key' }, { status: 403 })
    }

    // ─── Check for existing prompts (24h cache, skip if force) ───
    if (!force) {
      const { data: existingPrompts } = await supabase
        .from('page_prompts')
        .select('*')
        .eq('website_id', website_id)
        .eq('page_url', page_url)
        .eq('language', language || 'nl')

      if (existingPrompts && existingPrompts.length > 0) {
        const mostRecent = new Date(existingPrompts[0].updated_at)
        const hoursSinceUpdate = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60)

        if (hoursSinceUpdate < 24) {
          return NextResponse.json({
            page_id: `${website_id}:${page_url}`,
            matched_prompts: existingPrompts.map(formatPrompt),
            suggested_prompts: [],
            cached: true,
          })
        }
      }
    } else {
      console.log(`🔄 Force regenerate prompts for: ${page_url}`)
    }

    // ─── Generate prompts with Claude ───
    const promptLimit = auth.data.limits.prompts_per_page || 3

    // Detect location from WP content first, fallback to ScraperAPI (full page with footer)
    const allText = `${title} ${h1} ${focus_keyword} ${content_excerpt}`.toLowerCase()
    let scrapedLocation = detectLocation(allText)

    if (!scrapedLocation && page_url) {
      console.log(`📍 No location in WP content, trying ScraperAPI for: ${page_url}`)
      scrapedLocation = await detectLocationFromPage(page_url)
      if (scrapedLocation) console.log(`📍 ScraperAPI found location: ${scrapedLocation}`)
    }

    const generatedPrompts = await generatePromptsWithClaude({
      title,
      h1,
      focus_keyword,
      content_excerpt,
      schema_types,
      site_name: connection.site_name,
      site_url: connection.site_url,
      language: language || 'nl',
      limit: promptLimit + 3,
      overrideLocation: scrapedLocation,
    })

    if (!generatedPrompts || generatedPrompts.length === 0) {
      return NextResponse.json({ error: 'Could not generate prompts for this page' }, { status: 500 })
    }

    // ─── Store matched prompts ───
    const matchedPrompts = generatedPrompts.slice(0, promptLimit)
    const suggestedPrompts = generatedPrompts.slice(promptLimit)

    await supabase
      .from('page_prompts')
      .delete()
      .eq('website_id', website_id)
      .eq('page_url', page_url)
      .eq('match_type', 'auto')

    const promptsToInsert = matchedPrompts.map((prompt, index) => ({
      website_id,
      page_url,
      page_path: page_path || null,
      post_id: post_id || null,
      prompt_text: prompt.text,
      language: language || 'nl',
      match_type: 'auto',
      match_score: prompt.confidence || (1 - index * 0.1),
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('page_prompts')
      .upsert(promptsToInsert, { onConflict: 'website_id,page_url,prompt_text' })
      .select()

    if (insertError) console.error('Error storing prompts:', insertError)

    const { data: manualPrompts } = await supabase
      .from('page_prompts')
      .select('*')
      .eq('website_id', website_id)
      .eq('page_url', page_url)
      .eq('match_type', 'manual')

    const allMatched = [
      ...(manualPrompts || []).map(formatPrompt),
      ...(inserted || promptsToInsert).map(formatPrompt),
    ]

    console.log(`📄 Page analyzed: ${page_url} → ${allMatched.length} prompts (${language})`)

    return NextResponse.json({
      page_id: `${website_id}:${page_url}`,
      matched_prompts: allMatched,
      suggested_prompts: suggestedPrompts.map(p => ({ text: p.text, confidence: p.confidence })),
      cached: false,
    })

  } catch (error) {
    console.error('Page analyze error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── ULTIMATE Prompt Generation with Claude Sonnet ───

async function generatePromptsWithClaude({
  title, h1, focus_keyword, content_excerpt, schema_types,
  site_name, site_url, language, limit, overrideLocation,
}) {
  // Detect business context from page content
  const contentLower = (content_excerpt || '').toLowerCase()
  const titleLower = (title || '').toLowerCase()
  const allText = `${title} ${h1} ${focus_keyword} ${content_excerpt}`.toLowerCase()

  // Detect business type
  const businessType = detectBusinessType(allText)
  const audienceType = detectAudienceType(allText)
  const coreActivity = detectCoreActivity(allText, businessType)
  const detectedLocation = overrideLocation || detectLocation(allText)

  const systemPrompt = `Jij genereert commerciële, klantgerichte zoekvragen die een potentiële klant zou stellen aan een AI-assistent (ChatGPT, Perplexity, Google AI) om **concrete bedrijven of aanbieders** te vinden.

**DOELGROEP: ${audienceType === 'B2C' ? 'CONSUMENTEN (B2C)' : audienceType === 'both' ? 'CONSUMENTEN + ZAKELIJK' : 'ZAKELIJK (B2B)'}**
${audienceType === 'B2C' ? 'Vragen worden gesteld vanuit het perspectief van een PARTICULIER/CONSUMENT.' : audienceType === 'both' ? 'Mix vragen vanuit particulier EN zakelijk perspectief.' : 'Vragen worden gesteld vanuit zakelijk perspectief.'}

**ABSOLUTE PRIORITEITEN:**
1. **NATUURLIJKHEID**: Vragen klinken als ECHTE MENSEN die typen in ChatGPT
2. **COMMERCIEEL**: Vragen leiden tot concrete bedrijfsnamen als antwoord
3. **BEDRIJFSNEUTRAAL**: Vermeld NIET de naam "${site_name}" of het exacte merk
4. **DOELGROEP-PASSEND**: Vragen passen bij het type klant
5. **NEDERLANDS**: ALTIJD in het Nederlands

${businessType === 'winkel' ? `
🛒 **DIT IS EEN WINKEL** → Vragen moeten gaan over KOPEN/VINDEN, niet over installeren
- ✅ "Waar kan ik goede [product] kopen?"
- ❌ "Specialisten die [product] installeren" (FOUT!)` : ''}

${businessType === 'juridisch' ? `
⚖️ **JURIDISCH BEDRIJF** → Gebruik exacte juridische terminologie
- ✅ "Kun je goede advocaten aanbevelen voor..."
- ❌ "juridisch adviseurs" als het advocaten zijn` : ''}

${businessType === 'zorg' ? `
🏥 **ZORGBEDRIJF** → Gebruik medische/zorg terminologie
- ✅ "Welke klinieken zijn gespecialiseerd in..."
- ✅ "Kun je goede praktijken aanbevelen voor..."` : ''}

${coreActivity ? `
📌 **KERNACTIVITEIT: ${coreActivity}**
- Als het bedrijf VERKOOPT → "Waar kan ik ... kopen?"
- Als het bedrijf INSTALLEERT → "Welke bedrijven installeren...?"
- Als het bedrijf ADVISEERT → "Welke specialisten adviseren over...?"
- Als het bedrijf BEHANDELT → "Welke klinieken behandelen...?"` : ''}

**VERBODEN:**
- "Lijst ... op", "Geef voorbeelden van ..." (robotachtig)
- Geforceerde keyword-combinaties
- Onnatuurlijk Nederlands
- Vragen die leiden tot zoekadvies i.p.v. bedrijfsnamen
- Twee zoekwoorden combineren in één prompt
- Synoniemen die het beroep VERANDEREN
- **ENGELSE WOORDEN als er een Nederlands equivalent bestaat!**
  - ❌ "marketing agencies" → ✅ "marketingbureaus"
  - ❌ "content marketing" → ✅ "contentmarketing"
  - ❌ "online marketing specialists" → ✅ "online marketing specialisten"
  - ❌ "agencies" → ✅ "bureaus"
  - ❌ "companies" → ✅ "bedrijven"
  - Alleen Engels als het een vaktechnische term is die in het Nederlands niet bestaat (bijv. "SEO", "AI", "GEO")

**VERPLICHT:**
- Vragen die DIRECT om bedrijfsnamen vragen
- Natuurlijke menselijke taal (lees hardop — klinkt het echt?)
- Variatie in structuur: "Kun je...", "Welke...", "Noem...", "Ken je...", "Wat zijn..."
- Focus op concrete aanbevelingen
${detectedLocation ? `
**📍 LOCATIE GEDETECTEERD: "${detectedLocation}"**
- Minimaal 1-2 van de ${limit} prompts MOETEN de locatie "${detectedLocation}" bevatten
- Gebruik de locatie NATUURLIJK: "...in ${detectedLocation}" of "...${detectedLocation}..."
- De overige prompts ZONDER locatie (generieke zichtbaarheid)
- Gebruik NIET "Nederland" als vervanging als er een specifieke stad gedetecteerd is
` : ''}

**GOEDE STARTPATRONEN:**
${audienceType === 'B2C' ? `
- "Waar kan ik goede [product/dienst] vinden?"
- "Welke bedrijven raad je aan voor..."
- "Kun je goede aanbieders aanbevelen voor..."
- "Ken je bedrijven met goede reviews voor..."` : `
- "Kun je goede bedrijven aanbevelen voor..."
- "Welke specialisten hebben ervaring met..."
- "Noem een paar gerenommeerde bureaus die..."
- "Welke leveranciers raad je aan voor..."
- "Heb je aanbevelingen voor bedrijven die..."`}

**OUTPUT FORMAAT:**
Exact ${limit} natuurlijke, commerciële vragen als JSON array.
ALLEEN de array, geen extra tekst.

[{"text": "vraag", "confidence": 0.95}, ...]`

  const pageContext = [
    title && `**PAGINA TITEL:** ${title}`,
    h1 && `**H1 KOP:** ${h1}`,
    focus_keyword && `**FOCUS ZOEKWOORD:** ${focus_keyword}`,
    content_excerpt && `**CONTENT FRAGMENT:** ${content_excerpt.substring(0, 1500)}`,
    schema_types?.length > 0 && `**SCHEMA TYPES:** ${schema_types.join(', ')}`,
    detectedLocation && `**GEDETECTEERDE LOCATIE:** ${detectedLocation}`,
  ].filter(Boolean).join('\n\n')

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Genereer ${limit} zeer specifieke, commercieel relevante zoekvragen voor deze pagina.

${pageContext}

${focus_keyword ? `
**🚨 ZOEKWOORD INSTRUCTIE:**
Het focus zoekwoord is "${focus_keyword}". 
- Minimaal ${Math.min(limit, 5)} van de ${limit} prompts MOETEN dit zoekwoord (of een directe variant) bevatten
- Gebruik het EXACT — geen synoniemen die de betekenis veranderen
- Combineer NOOIT twee verschillende zoekwoorden in één prompt

**TOEGESTANE VARIATIES:**
- Enkelvoud ↔ meervoud
- Met/zonder type-aanduiding (advocaat ↔ advocatenkantoor)
` : ''}

**KRITIEKE VEREISTEN:**
1. Commerciële focus — vragen leiden tot concrete bedrijfsnamen
2. Natuurlijke taal — klinkt als echte mensen
3. Bedrijfsneutraal — geen "${site_name}" noemen
4. Variatie — verschillende startwoorden en structuren

GEEF ALLEEN DE JSON ARRAY TERUG, GEEN EXTRA TEKST.`
      }]
    })

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : ''
    let cleaned = responseText.trim()
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '')

    const prompts = JSON.parse(cleaned)
    if (!Array.isArray(prompts)) return []

    return prompts
      .filter(p => p.text && typeof p.text === 'string')
      .map(p => ({
        text: p.text.trim(),
        confidence: Math.min(1, Math.max(0, parseFloat(p.confidence) || 0.5)),
      }))

  } catch (error) {
    console.error('Claude prompt generation error:', error)
    // Fallback to basic prompts
    return generateFallbackPrompts({ title, h1, focus_keyword, language, limit })
  }
}

// ─── Business context detection from page content ───

function detectBusinessType(text) {
  if (/advocat|juridisch|notaris|recht/i.test(text)) return 'juridisch'
  if (/kliniek|praktijk|behandel|therapie|zorg|arts|tandarts|fysiotherap/i.test(text)) return 'zorg'
  if (/winkel|shop|kopen|bestellen|assortiment|collectie|webshop/i.test(text)) return 'winkel'
  if (/restaurant|café|hotel|horeca|catering/i.test(text)) return 'horeca'
  if (/installat|monteren|aansluiten|plaatsen/i.test(text)) return 'ambacht'
  if (/bureau|agency|advies|consult|strategie/i.test(text)) return 'dienstverlener'
  return 'overig'
}

function detectAudienceType(text) {
  const b2cSignals = /particulier|consument|thuis|gezin|persoonlijk|klant|bezoeker/i.test(text)
  const b2bSignals = /zakelijk|bedrijven|b2b|enterprise|organisatie|mkb|onderneming/i.test(text)
  if (b2cSignals && b2bSignals) return 'both'
  if (b2cSignals) return 'B2C'
  if (b2bSignals) return 'B2B'
  return 'B2B' // Default for most service businesses
}

function detectCoreActivity(text, businessType) {
  if (businessType === 'winkel') return 'verkoopt'
  if (businessType === 'ambacht') return 'installeert'
  if (businessType === 'juridisch') return 'adviseert'
  if (businessType === 'zorg') return 'behandelt'
  if (businessType === 'horeca') return 'verzorgt'
  if (/installeert|installatie|monteren/i.test(text)) return 'installeert'
  if (/verkoopt|verkoop|kopen/i.test(text)) return 'verkoopt'
  if (/adviseert|advies|consult/i.test(text)) return 'adviseert'
  if (/maakt|ontwerpt|bouwt/i.test(text)) return 'maakt'
  return 'levert'
}

function detectLocation(text) {
  // Dutch cities and regions — ordered by size to prefer larger matches
  const locations = [
    'Amsterdam', 'Rotterdam', 'Den Haag', '\'s-Gravenhage', 'Utrecht',
    'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda',
    'Nijmegen', 'Arnhem', 'Haarlem', 'Enschede', 'Apeldoorn',
    'Amersfoort', 'Zaanstad', 'Haarlemmermeer', 'Den Bosch',
    '\'s-Hertogenbosch', 'Zwolle', 'Zoetermeer', 'Leiden', 'Leeuwarden',
    'Maastricht', 'Dordrecht', 'Ede', 'Alphen aan den Rijn',
    'Alkmaar', 'Delft', 'Deventer', 'Hilversum', 'Roosendaal',
    'Oss', 'Sittard', 'Helmond', 'Purmerend', 'Schiedam',
    'Vlaardingen', 'Gouda', 'Zeist', 'Veenendaal', 'Nieuwegein',
    'Noord-Holland', 'Zuid-Holland', 'Noord-Brabant', 'Gelderland',
    'Overijssel', 'Limburg', 'Friesland', 'Drenthe', 'Flevoland',
    'Zeeland',
  ]

  const textLower = text.toLowerCase()
  for (const loc of locations) {
    if (textLower.includes(loc.toLowerCase())) {
      return loc
    }
  }
  return null
}

// ─── Fallback prompts ───

function generateFallbackPrompts({ title, h1, focus_keyword, language, limit }) {
  const base = focus_keyword || h1 || title || ''
  if (!base) return []

  const templates = [
    `Kun je goede ${base} bedrijven aanbevelen?`,
    `Welke ${base} specialisten hebben de beste reviews?`,
    `Wat zijn betrouwbare ${base} aanbieders?`,
    `Ken je ervaren ${base} bedrijven?`,
    `Welke ${base} partijen raad je aan?`,
    `Heb je aanbevelingen voor ${base}?`,
  ]

  return templates.slice(0, limit).map((text, i) => ({
    text,
    confidence: 0.7 - i * 0.05,
  }))
}

// ─── Format ───

function formatPrompt(prompt) {
  return {
    id: prompt.id,
    text: prompt.prompt_text || prompt.text,
    language: prompt.language,
    match_type: prompt.match_type || 'auto',
    match_score: prompt.match_score || prompt.confidence,
  }
}
