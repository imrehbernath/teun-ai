// lib/prompt-engine.js
// Gedeelde prompt-engine voor de motor (/api/ai-visibility-analysis) en
// de Prompt Explorer (/api/prompt-explorer).
//
// Bevat:
//   - scrapeWebsite: 3-staps fallback (direct fetch -> ScraperAPI basic -> ultra_premium)
//   - parseHtmlContent: title, meta, H1/H2/H3, nav, services, body
//   - analyzeWebsiteForKeywords: Claude analyse -> keywords, services, USPs, locatie, businessType, etc.
//   - generatePromptsWithClaude: 10 prompts met strenge regels (motor's prompt-generator, 1:1)
//   - estimatePromptVolumes: schat per prompt AI-volume + trendSignal + difficulty (lichte 2e pass)
//
// Dit bestand is uit /api/ai-visibility-analysis/route.js geextraheerd zonder logica-wijziging,
// zodat beide routes dezelfde motor delen.

import Anthropic from '@anthropic-ai/sdk'
import { checkLanguageGate } from '@/lib/language-gate'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY

// ============================================
// GARBAGE-PAGE DETECTIE
// Voor bot-protection pages, parked domains, under-construction, etc.
// ============================================
export function isGarbagePage(html) {
  const htmlLower = html.toLowerCase()
  const garbageSignals = [
    'checking your browser', 'just a moment', 'verify you are human',
    'cf-browser-verification', 'challenge-platform', '_cf_chl',
    'attention required', 'ddos protection', 'security check',
    'checking if the site connection is secure', 'please turn javascript on',
    'access denied', 'bot protection', 'are you a robot',
    'domain is parked', 'this domain is for sale', 'buy this domain',
    'under construction', 'coming soon', 'website binnenkort beschikbaar',
  ]
  if (garbageSignals.some(s => htmlLower.includes(s))) return true
  const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').trim()
  if (bodyText.length < 300) return true
  return false
}

// ============================================
// COUNTRY CODE PICKER for ScraperAPI proxy pool
// EU pool voor European TLDs (.nl, .be, .de etc), US pool voor international
// ============================================
export function pickCountryCode(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    const euTlds = new Set([
      'nl', 'be', 'de', 'at', 'ch', 'fr', 'es', 'it',
      'uk', 'ie', 'eu', 'pt', 'dk', 'se', 'no', 'fi',
      'pl', 'cz', 'gr', 'lu'
    ])
    if (host.endsWith('.co.uk')) return 'eu'
    const tld = host.split('.').pop()
    return euTlds.has(tld) ? 'eu' : 'us'
  } catch {
    return 'us'
  }
}

// ============================================
// SCRAPER API CALL (basic of ultra mode)
// ============================================
export async function fetchViaScraperApi(url, { ultra = false } = {}) {
  const params = new URLSearchParams({
    api_key: SCRAPER_API_KEY,
    url,
    country_code: pickCountryCode(url),
    device_type: 'desktop'
  })

  if (ultra) {
    // Max-quality config: residential IPs + ultra_premium bypass.
    // Costs 75 credits per request. Use only when basic fails.
    // follow_redirect=false + NO render: needed to bypass DDoS-Guard.
    params.set('premium', 'true')
    params.set('ultra_premium', 'true')
    params.set('follow_redirect', 'false')
  } else {
    // Basic tier uses JS rendering for SPA/client-rendered sites
    params.set('render', 'true')
    params.set('premium', 'true')
  }

  const scraperUrl = `https://api.scraperapi.com/?${params.toString()}`
  const timeout = ultra ? 70000 : 45000

  const response = await fetch(scraperUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(timeout)
  })

  if (!response.ok) {
    throw new Error(`ScraperAPI ${response.status} (ultra=${ultra})`)
  }

  return await response.text()
}

// ============================================
// SCRAPE WEBSITE, 3-staps fallback strategie
//   1. Direct fetch (FREE, snel, ~50% sites werken)
//   2. ScraperAPI basic (premium + render, ~5 credits)
//   3. ScraperAPI ultra (residential + bypass, 75 credits, laatste redmiddel)
// ============================================
export async function scrapeWebsite(url) {
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  const urlObj = new URL(normalizedUrl)
  const hasWww = urlObj.hostname.startsWith('www.')
  const wwwUrl = hasWww ? normalizedUrl : normalizedUrl.replace('://', '://www.')

  const warnings = []

  // Attempt 1: Direct fetch (FREE)
  for (const tryUrl of [normalizedUrl, wwwUrl]) {
    try {
      console.log(`🌐 Direct fetch: ${tryUrl}`)
      const response = await fetch(tryUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const html = await response.text()
        if (!isGarbagePage(html) && html.length > 500) {
          console.log(`✅ Direct fetch OK: ${tryUrl} (${html.length} chars)`)
          return { success: true, html, method: 'direct' }
        }
        warnings.push(`direct (${tryUrl}): garbage or too short (${html.length} chars)`)
      } else {
        warnings.push(`direct (${tryUrl}): HTTP ${response.status}`)
      }
    } catch (error) {
      warnings.push(`direct (${tryUrl}): ${error.message}`)
      console.log(`⚠️ Direct fetch failed for ${tryUrl}: ${error.message}`)
    }
  }

  // Attempt 2: ScraperAPI basic (render + premium)
  if (!SCRAPER_API_KEY) {
    console.log(`❌ No SCRAPER_API_KEY configured`)
    return { success: false, error: 'Website kon niet gescraped worden (mogelijk sterke bot-protectie)', warnings }
  }

  for (const tryUrl of [normalizedUrl, wwwUrl]) {
    try {
      console.log(`🔗 ScraperAPI basic: ${tryUrl}`)
      const html = await fetchViaScraperApi(tryUrl, { ultra: false })
      if (!isGarbagePage(html) && html.length > 500) {
        console.log(`✅ ScraperAPI basic OK: ${tryUrl} (${html.length} chars)`)
        return { success: true, html, method: 'basic' }
      }
      warnings.push(`basic (${tryUrl}): garbage or too short (${html.length} chars)`)
    } catch (error) {
      warnings.push(`basic (${tryUrl}): ${error.message}`)
      console.log(`⚠️ ScraperAPI basic failed for ${tryUrl}: ${error.message}`)
    }
  }

  // Attempt 3: ScraperAPI ultra (75 credits), laatste redmiddel
  // Reserved voor sites met aggressieve protection (DDoS-Guard, Cloudflare challenge loops, Wordfence)
  for (const tryUrl of [normalizedUrl, wwwUrl]) {
    try {
      console.log(`🚀 ScraperAPI ultra: ${tryUrl}`)
      const html = await fetchViaScraperApi(tryUrl, { ultra: true })
      if (!isGarbagePage(html) && html.length > 500) {
        console.log(`✅ ScraperAPI ultra OK: ${tryUrl} (${html.length} chars)`)
        return { success: true, html, method: 'ultra' }
      }
      warnings.push(`ultra (${tryUrl}): garbage or too short (${html.length} chars)`)
    } catch (error) {
      warnings.push(`ultra (${tryUrl}): ${error.message}`)
      console.log(`⚠️ ScraperAPI ultra failed for ${tryUrl}: ${error.message}`)
    }
  }

  console.log(`❌ All scrape attempts failed for ${normalizedUrl}`)
  console.log(`Warnings:`, warnings)
  return {
    success: false,
    error: 'Website kon niet gescraped worden (mogelijk sterke bot-protectie)',
    warnings
  }
}

// ============================================
// PARSE HTML FOR RELEVANT CONTENT
// ============================================
export function parseHtmlContent(html) {
  // Extract meta title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : ''

  // Extract H1s (support nested tags like <h1><span>Text</span></h1>)
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []
  const h1s = h1Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 3)

  // Extract H2s
  const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []
  const h2s = h2Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 8)

  // Extract H3s (often contain specific services/products)
  const h3Matches = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || []
  const h3s = h3Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 8)

  // Extract navigation/menu items (crucial for finding services)
  const navItems = []

  // Method 1: Links inside <nav> tags
  const navBlocks = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || []
  navBlocks.forEach(nav => {
    const links = nav.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) || []
    links.forEach(link => {
      const text = link.replace(/<[^>]+>/g, '').trim()
      if (text.length > 1 && text.length < 60) navItems.push(text)
    })
  })

  // Method 2: Links with common menu/nav class names
  const menuLinks = html.match(/<a[^>]*class=["'][^"']*(?:menu|nav|header)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi) || []
  menuLinks.forEach(link => {
    const text = link.replace(/<[^>]+>/g, '').trim()
    if (text.length > 1 && text.length < 60 && !navItems.includes(text)) navItems.push(text)
  })

  // Extract internal links to service/product pages
  const serviceLinks = []
  const internalLinks = html.match(/<a[^>]*href=["']\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi) || []
  internalLinks.forEach(link => {
    const hrefMatch = link.match(/href=["']([^"']+)["']/)
    const text = link.replace(/<[^>]+>/g, '').trim()
    const href = hrefMatch ? hrefMatch[1] : ''
    if (href && text.length > 2 && text.length < 80 &&
        /dienst|service|product|oploss|behandel|specialist|aanbod|werkgebied|wat-we|over-ons/i.test(href + text)) {
      serviceLinks.push(`${text} (${href})`)
    }
  })

  // Extract main content (strip tags, limit size)
  let bodyContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000) // Limit to ~3000 chars for Claude context

  return {
    title,
    metaDescription,
    h1s,
    h2s,
    h3s,
    navItems: [...new Set(navItems)].slice(0, 15),
    serviceLinks: [...new Set(serviceLinks)].slice(0, 10),
    bodyContent
  }
}

// ============================================
// ANALYZE WEBSITE WITH CLAUDE
// Extract keywords, services, USPs, location, businessType, audienceType, coreActivity
// ============================================
export async function analyzeWebsiteForKeywords(websiteUrl, companyName, companyCategory, isNL = true) {
  try {
    // Step 1: Scrape the website
    const scrapeResult = await scrapeWebsite(websiteUrl)
    if (!scrapeResult.success) {
      return { success: false, error: scrapeResult.error }
    }

    // Taalgate: blokkeer duidelijk niet-NL/EN sites voor we Claude aanroepen.
    const gate = checkLanguageGate(scrapeResult.html, isNL ? 'nl' : 'en')
    if (!gate.allowed) {
      console.log(`[language-gate] blocked: ${gate.reason}`)
      return { success: false, blocked: true, blockMessage: gate.message }
    }

    // Step 2: Parse HTML
    const parsed = parseHtmlContent(scrapeResult.html)

    // Step 3: Analyze with Claude (now with nav items, H3s, service links)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: isNL
        ? `Je bent een expert in het analyseren van websites voor zoekwoord-extractie en commerciële intentie.
Je analyseert websites om te begrijpen:
1. Welke diensten/producten het bedrijf aanbiedt
2. Wat hun USPs (unique selling points) zijn
3. Welke zoekwoorden potentiële klanten zouden gebruiken
4. Welke locatie-focus ze hebben

Let EXTRA op menu-items en navigatie, daar staan vaak de kernactiviteiten.
Diensten-pagina's en H3-koppen bevatten vaak de beste zoekwoorden.

Antwoord ALTIJD in het Nederlands. Wees CONCREET en SPECIFIEK.`
        : `You are an expert at analyzing websites for keyword extraction and commercial intent.
You analyze websites to understand:
1. What services/products the company offers
2. What their USPs (unique selling points) are
3. What keywords potential customers would use
4. What their geographic focus is

Pay EXTRA attention to menu items and navigation, core activities are often listed there.
Service pages and H3 headings often contain the best keywords.

ALWAYS respond in English. Be CONCRETE and SPECIFIC.

CRITICAL: The website content may be in a non-English language (e.g., Dutch, German, French).
You MUST translate ALL keywords, services, and USPs to their ENGLISH equivalents.
Examples: "zoekmachineoptimalisatie" to "SEO", "Google Ads beheer" to "Google Ads management",
"webdesign bureau" to "web design agency", "linkbuilding" to "link building".
Use the terms that English-speaking customers would actually search for.`,
      messages: [{
        role: 'user',
        content: isNL
          ? `Analyseer deze website-informatie voor "${companyName}" (branche: ${companyCategory}):

**META TITEL:** ${parsed.title || 'Niet gevonden'}

**META BESCHRIJVING:** ${parsed.metaDescription || 'Niet gevonden'}

**H1 KOPPEN:** ${parsed.h1s.length > 0 ? parsed.h1s.join(' | ') : 'Niet gevonden'}

**H2 KOPPEN:** ${parsed.h2s.length > 0 ? parsed.h2s.join(' | ') : 'Niet gevonden'}

**H3 KOPPEN:** ${parsed.h3s?.length > 0 ? parsed.h3s.join(' | ') : 'Niet gevonden'}

**NAVIGATIE/MENU-ITEMS:** ${parsed.navItems?.length > 0 ? parsed.navItems.join(' | ') : 'Niet gevonden'}

**DIENSTEN/SERVICE LINKS:** ${parsed.serviceLinks?.length > 0 ? parsed.serviceLinks.join(' | ') : 'Niet gevonden'}

**PAGINA CONTENT (fragment):** ${parsed.bodyContent.slice(0, 1500)}

---

Geef je analyse in EXACT dit JSON-formaat:

{
  "keywords": ["zoekwoord1", "zoekwoord2", "zoekwoord3", "zoekwoord4", "zoekwoord5", "zoekwoord6", "zoekwoord7", "zoekwoord8", "zoekwoord9", "zoekwoord10"],
  "services": ["dienst1", "dienst2", "dienst3"],
  "usps": ["usp1", "usp2"],
  "location": "locatie of regio focus (of null)",
  "locationExclusive": true,
  "targetAudience": "beschrijving doelgroep",
  "businessType": "winkel|dienstverlener|ambacht|fabrikant|horeca|zorg|juridisch|financieel|onderwijs|overig",
  "audienceType": "B2C|B2B|both",
  "coreActivity": "verkoopt|installeert|adviseert|behandelt|repareert|ontwerpt|maakt|levert|verzorgt"
}

BELANGRIJKE REGELS:
- keywords: geef PRECIES 10 commerciële zoekwoorden die potentiële klanten zouden gebruiken
- Haal zoekwoorden uit: menu-items, diensten-links, H1/H2/H3 koppen, meta beschrijving
- Focus op zoekwoorden die NIET de bedrijfsnaam bevatten
- Denk vanuit de klant: wat zou iemand typen die dit bedrijf zoekt?
- Mix korte (1-2 woorden) en langere (2-4 woorden) zoekwoorden
- services: concrete diensten/producten die het bedrijf aanbiedt (haal uit nav en H2/H3)
- usps: unieke verkoopargumenten
- location: waar opereert dit bedrijf? (stad, regio, land, of null als landelijk/internationaal)
- locationExclusive: true als het bedrijf ALLEEN in die locatie opereert (bijv. zeilvakantie Griekenland, loodgieter Amsterdam, advocatenkantoor Den Haag). false als het bedrijf ook elders werkt of landelijk opereert. Bij twijfel: true als de website duidelijk een regio benadrukt in H1/H2/navigatie.
- businessType: kies het MEEST passende type (winkel als ze producten verkopen, dienstverlener als ze diensten leveren, etc.)
- audienceType: B2C als gericht op consumenten, B2B als gericht op bedrijven, both als beide
- coreActivity: wat DOET het bedrijf primair? Een lampenwinkel VERKOOPT, een installateur INSTALLEERT, een advocaat ADVISEERT
- Alles in het Nederlands

Geef ALLEEN de JSON terug, geen extra tekst.`
          : `Analyze this website information for "${companyName}" (industry: ${companyCategory}):

**META TITLE:** ${parsed.title || 'Not found'}

**META DESCRIPTION:** ${parsed.metaDescription || 'Not found'}

**H1 HEADINGS:** ${parsed.h1s.length > 0 ? parsed.h1s.join(' | ') : 'Not found'}

**H2 HEADINGS:** ${parsed.h2s.length > 0 ? parsed.h2s.join(' | ') : 'Not found'}

**H3 HEADINGS:** ${parsed.h3s?.length > 0 ? parsed.h3s.join(' | ') : 'Not found'}

**NAVIGATION/MENU ITEMS:** ${parsed.navItems?.length > 0 ? parsed.navItems.join(' | ') : 'Not found'}

**SERVICE/PRODUCT LINKS:** ${parsed.serviceLinks?.length > 0 ? parsed.serviceLinks.join(' | ') : 'Not found'}

**PAGE CONTENT (excerpt):** ${parsed.bodyContent.slice(0, 1500)}

---

Provide your analysis in EXACTLY this JSON format:

{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
  "services": ["service1", "service2", "service3"],
  "usps": ["usp1", "usp2"],
  "location": "location or region focus (or null)",
  "locationExclusive": true,
  "targetAudience": "target audience description",
  "businessType": "shop|service_provider|craft|manufacturer|hospitality|healthcare|legal|financial|education|other",
  "audienceType": "B2C|B2B|both",
  "coreActivity": "sells|installs|advises|treats|repairs|designs|makes|delivers|provides"
}

IMPORTANT RULES:
- keywords: provide EXACTLY 10 commercial keywords that potential customers would use
- Extract keywords from: menu items, service links, H1/H2/H3 headings, meta description
- Focus on keywords that do NOT contain the company name
- Think from the customer's perspective: what would someone type when looking for this business?
- Mix short (1-2 words) and longer (2-4 words) keywords
- services: concrete services/products the company offers (extract from nav and H2/H3)
- usps: unique selling points
- location: where does this company operate? (city, region, country, or null if nationwide/international)
- locationExclusive: true if the company ONLY operates in that location (e.g. sailing holidays Greece, plumber Amsterdam, law firm The Hague). false if the company also works elsewhere or operates nationally. When in doubt: true if the website clearly emphasizes one region in H1/H2/navigation.
- businessType: choose the MOST fitting type
- audienceType: B2C if consumer-facing, B2B if business-facing, both if applicable
- coreActivity: what does the company primarily DO? A lamp shop SELLS, an installer INSTALLS, a lawyer ADVISES
- Everything in English
- CRITICAL: If the website is in another language, TRANSLATE all keywords to English equivalents that English-speaking searchers would use

Return ONLY the JSON, no additional text.`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Clean and parse JSON
    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    const analysis = JSON.parse(cleanedText)

    return {
      success: true,
      keywords: analysis.keywords || [],
      services: analysis.services || [],
      usps: analysis.usps || [],
      location: analysis.location,
      locationExclusive: analysis.locationExclusive === true,
      targetAudience: analysis.targetAudience,
      businessType: analysis.businessType || 'overig',
      audienceType: analysis.audienceType || 'B2B',
      coreActivity: analysis.coreActivity || 'levert',
      rawParsed: parsed
    }
  } catch (error) {
    console.error('❌ Website analysis error:', error.message)
    return { success: false, error: error.message }
  }
}

// ============================================
// GENERATE PROMPTS WITH CLAUDE
// 10 prompts met 14 strenge regels (variatie, geen marketing-jargon, locatie, vakjargon, etc.)
// 1:1 uit motor; ongewijzigde prompt-regels.
// ============================================
export async function generatePromptsWithClaude(
  companyName,
  companyCategory,
  queries,
  customTerms = null,
  websiteAnalysis = null,
  isNL = true
) {
  // ============================================
  // WEBSITE CONTEXT (if available)
  // ============================================
  let websiteContext = ''
  if (websiteAnalysis && websiteAnalysis.success) {
    const nf = isNL ? 'Niet gedetecteerd' : 'Not detected'
    const ns = isNL ? 'Niet specifiek' : 'Not specific'
    websiteContext = isNL
      ? `

**WEBSITE ANALYSE, DIT BEDRIJF BIEDT AAN:**

**DIENSTEN/PRODUCTEN:**
${websiteAnalysis.services?.length > 0 ? websiteAnalysis.services.map(s => `- ${s}`).join('\n') : nf}

**UNIQUE SELLING POINTS:**
${websiteAnalysis.usps?.length > 0 ? websiteAnalysis.usps.map(u => `- ${u}`).join('\n') : nf}

**DOELGROEP:** ${websiteAnalysis.targetAudience || nf}
**BEDRIJFSTYPE:** ${websiteAnalysis.businessType || nf}
**DOELGROEP TYPE:** ${websiteAnalysis.audienceType || nf}
**KERNACTIVITEIT:** ${websiteAnalysis.coreActivity || nf}
**LOCATIE-FOCUS:** ${websiteAnalysis.location || ns}

BELANGRIJK: Gebruik de SPECIFIEKE diensten en producten hierboven in je prompts.
Hoe specifieker de prompt, hoe beter. "steenpapier notitieboeken" scoort 10x beter dan "duurzame kantoorartikelen".

${websiteAnalysis.audienceType === 'B2C' ? `Dit is een B2C bedrijf. Stel vragen vanuit CONSUMENTEN perspectief: "Ik zoek...", "Waar kan ik ... kopen", "Heeft iemand ervaring met..."` :
websiteAnalysis.audienceType === 'B2B' ? `Dit is een B2B bedrijf. Stel vragen vanuit ZAKELIJK perspectief: "Ons bedrijf zoekt...", "Welke bureaus...", "Wie kan ons helpen met..."` :
`Dit bedrijf richt zich op consumenten EN bedrijven. Mix beide perspectieven.`}

${websiteAnalysis.businessType === 'winkel' ? `DIT IS EEN WINKEL. Vragen gaan over KOPEN, niet over installeren of adviseren.` : ''}
${websiteAnalysis.businessType === 'juridisch' ? `DIT IS JURIDISCH. Gebruik exacte juridische terminologie uit de zoekwoorden.` : ''}

${websiteAnalysis.coreActivity ? `KERNACTIVITEIT: ${websiteAnalysis.coreActivity}
- VERKOOPT, "Waar kan ik ... kopen/bestellen?"
- INSTALLEERT, "Wie kan ... bij mij installeren?"
- ADVISEERT, "Ik heb advies nodig over..."
- BEHANDELT, "Ik heb last van ..., wie kan helpen?"` : ''}
`
      : `

**WEBSITE ANALYSIS, THIS BUSINESS OFFERS:**

**SERVICES/PRODUCTS:**
${websiteAnalysis.services?.length > 0 ? websiteAnalysis.services.map(s => `- ${s}`).join('\n') : nf}

**UNIQUE SELLING POINTS:**
${websiteAnalysis.usps?.length > 0 ? websiteAnalysis.usps.map(u => `- ${u}`).join('\n') : nf}

**TARGET AUDIENCE:** ${websiteAnalysis.targetAudience || nf}
**BUSINESS TYPE:** ${websiteAnalysis.businessType || nf}
**AUDIENCE TYPE:** ${websiteAnalysis.audienceType || nf}
**CORE ACTIVITY:** ${websiteAnalysis.coreActivity || nf}
**LOCATION FOCUS:** ${websiteAnalysis.location || ns}

IMPORTANT: Use the SPECIFIC services and products listed above in your prompts.
The more specific the prompt, the better. "stone paper reusable notebooks" scores 10x better than "sustainable office supplies".

CRITICAL: ALL prompts must be 100% English. If any keyword above is in Dutch or another language, TRANSLATE it to natural English.

${websiteAnalysis.audienceType === 'B2C' ? `This is a B2C business. Ask from CONSUMER perspective: "I'm looking for...", "Where can I buy...", "Has anyone tried..."` :
websiteAnalysis.audienceType === 'B2B' ? `This is a B2B business. Ask from BUSINESS perspective: "Our company needs...", "Which agencies...", "Who can help us with..."` :
`This business serves both consumers and businesses. Mix both perspectives.`}

${websiteAnalysis.businessType === 'shop' || websiteAnalysis.businessType === 'winkel' ? `THIS IS A SHOP. Questions are about BUYING, not installing or consulting.` : ''}

${websiteAnalysis.coreActivity ? `CORE ACTIVITY: ${websiteAnalysis.coreActivity}
- SELLS, "Where can I buy/order ...?"
- INSTALLS, "Who can install ... for me?"
- ADVISES, "I need advice on..."
- TREATS, "I'm suffering from ..., who can help?"` : ''}
`
  }

  // ============================================
  // CUSTOM TERMS
  // ============================================
  let customTermsInstruction = ''

  if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
    customTermsInstruction = isNL
      ? `\n**GEBRUIKERSINSTRUCTIES:**`
      : `\n**USER INSTRUCTIONS:**`

    if (customTerms.exclude?.length > 0) {
      customTermsInstruction += isNL
        ? `\n\n**VERBODEN WOORDEN (gebruik deze NOOIT):**
${customTerms.exclude.map(term => `- "${term}"`).join('\n')}`
        : `\n\n**FORBIDDEN WORDS (NEVER use these):**
${customTerms.exclude.map(term => `- "${term}"`).join('\n')}`
    }

    if (customTerms.include?.length > 0) {
      customTermsInstruction += isNL
        ? `\n\n**VERPLICHTE TERMEN (minimaal 7 van 10 prompts):**
${customTerms.include.map(term => `- "${term}"`).join('\n')}`
        : `\n\n**REQUIRED TERMS (at least 7 of 10 prompts):**
${customTerms.include.map(term => `- "${term}"`).join('\n')}`
    }

    if (customTerms.location?.length > 0) {
      customTermsInstruction += isNL
        ? `\n\n**LOCATIE-FOCUS (precies 5 van 10 prompts):**
${customTerms.location.map(term => `- "${term}"`).join('\n')}
De andere 5 zonder locatie.`
        : `\n\n**LOCATION FOCUS (exactly 5 of 10 prompts):**
${customTerms.location.map(term => `- "${term}"`).join('\n')}
The other 5 without location.`
    }
  }

  // ============================================
  // KEYWORD CONTEXT
  // ============================================
  const searchConsoleContext = queries.length > 0
    ? (isNL ? `

**ZOEKWOORDEN VAN DE WEBSITE:**

${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

REGELS:
- Verdeel de 10 prompts eerlijk over deze zoekwoorden
- Elk zoekwoord minimaal 1x gebruiken
- NOOIT twee zoekwoorden in een prompt combineren
- Gebruik het EXACTE zoekwoord, geen synoniemen
- Toegestaan: enkelvoud/meervoud, met/zonder kantoor/bureau`
      : `

**KEYWORDS FROM THE WEBSITE:**

${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

RULES:
- Distribute 10 prompts fairly across these keywords
- Each keyword at least once
- NEVER combine two keywords in one prompt
- Use the EXACT keyword, no synonyms
- Allowed: singular/plural variations
- If any keyword is in Dutch, TRANSLATE it to natural English first`)
    : ''


  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: isNL
        ? `Je genereert 10 zoekvragen die echte mensen zouden typen in ChatGPT of Perplexity.

JE DOEL: Elke prompt moet zo natuurlijk en herkenbaar zijn dat de gebruiker denkt "dit is PRECIES wat mijn klanten zouden vragen".

${websiteAnalysis?.audienceType === 'B2C' ? `DOELGROEP: CONSUMENTEN (B2C)` :
websiteAnalysis?.audienceType === 'both' ? `DOELGROEP: CONSUMENTEN + ZAKELIJK` :
`DOELGROEP: ZAKELIJK (B2B)`}

VOORBEELDEN VAN GOEDE PROMPTS (hoog scorend in echte scans):
- "Ik zoek een bureau dat mijn webshop hoger in Google kan krijgen, wie heeft daar ervaring mee?"
- "Waar kan ik duurzame notitieboeken van steenpapier kopen in Nederland?"
- "Mijn bedrijfsfietsen moeten onderhouden worden, welke partijen komen op locatie?"
- "We willen onze medewerkers een fietsleaseregeling aanbieden, wie kan ons daarbij helpen?"
- "Ik heb last van chronische rugpijn en wil geen medicijnen, welke osteopaat kan helpen?"
- "Welke cateraar kan smoked BBQ verzorgen voor 80 personen op een bruiloft?"
- "Ons restaurant wil telefonische reserveringen automatiseren met AI, wie biedt dat aan?"
- "Waar kan ik een ergonomische verticale muis bestellen met snelle levering?"
- "Wie kan een naadloze gietvloer leggen in mijn woonkamer in Amsterdam?"
- "Welk SEO bureau in Utrecht levert meetbare resultaten voor webshops?"

VOORBEELDEN VAN SLECHTE PROMPTS (scoren altijd 0%):
- "Welke bedrijven bieden diensten aan voor..." (te vaag, geen context)
- "Waar kan ik beautiful textiles kopen?" (Engels woord in Nederlandse zin)
- "Welke specialisten zijn gespecialiseerd in..." (dubbelop, onnatuurlijk)
- "Welke leveranciers hebben X in hun assortiment?" (zakelijk jargon, niemand praat zo)
- "Noem bedrijven die professionele oplossingen bieden" (generiek)
- "Ken je betrouwbare aanbieders voor..." (vaag, elk bedrijf past hier)

VERPLICHTE REGELS:

1. VARIATIE IN VRAAGTYPE. Gebruik minstens 5 van deze 7 categorieen.
   ⛔ GOUDEN REGEL: Elke prompt MOET een antwoord opleveren waarin ChatGPT minimaal 3 bedrijfsnamen noemt.
   ⛔ ABSOLUUT VERBODEN PROMPTTYPEN (deze leveren NOOIT bedrijfsnamen op):
   - "Wat kost..." / "Hoeveel kost..." / "Wat is de prijs van..." (levert prijsinformatie, geen bedrijven)
   - "Wat is het verschil tussen..." / "Kan iemand uitleggen..." (levert uitleg, geen bedrijven)
   - "Heeft iemand ervaring met..." zonder te vragen naar een specifiek bedrijf (levert meningen, geen bedrijven)
   - "Hoe werkt..." / "Hoe regel ik..." (levert uitleg van een proces, geen bedrijfsnamen)
   - "Waarom kiezen voor..." / "Waarom zou ik..." (levert voor- en nadelen, geen bedrijfsnamen)
   CATEGORIEËN:
   - AANBEVELING: "Wie kan mij helpen met...", "Ken je een goed bedrijf voor..."
   - BESTE: "Welk bedrijf is het beste voor...", "Wie is de beste ... in Nederland?"
   - LOKAAL: "Wie kan [dienst] doen in [stad]?", "Welke [branche] zit er in [regio]?"
   - OPLOSSING: "Ik heb [probleem], welk bedrijf kan dat oplossen?", "Onze website scoort slecht, wie kan helpen?"
   - SPECIALIST: "Welke bureaus zijn gespecialiseerd in...", "Wie heeft ervaring met [dienst] voor [doelgroep]?"
   - SPECIFIEK PRODUCT: Een prompt met een heel specifiek product, dienst of merknaam
   - SITUATIESCHETS: "We gaan verhuizen en zoeken...", "Ons bedrijf groeit en we hebben ... nodig"

2. VARIATIE IN ZINSOPBOUW. Maximaal 2 prompts mogen met hetzelfde woord beginnen.
   Goede starters: "Ik zoek", "Mijn", "We willen", "Welk bedrijf", "Kan iemand", "Ken je", "Ons bedrijf", "Wie kan", "Waar vind ik"
   VERBODEN: Meer dan 2x beginnen met "Welke" of meer dan 2x met "Waar kan ik"

3. LENGTE: Elke prompt is 10-18 woorden. Niet korter, niet langer.

4. TAAL: 100% Nederlands. NOOIT Engelse woorden in een Nederlandse prompt. Als een zoekwoord Engels is, vertaal het naar natuurlijk Nederlands.
   FOUT: "Waar kan ik beautiful textiles kopen?" of "buy used trucks online Europe"
   GOED: "Waar kan ik mooie stoffen kopen?" of "gebruikte vrachtwagens kopen in Europa"

5. SPECIFICITEIT: Gebruik CONCRETE diensten/producten uit de zoekwoorden. Hoe specifieker, hoe beter.
   FOUT: "Welke bedrijven bieden schoonmaakdiensten aan?"
   GOED: "Wie kan het interieur van mijn Tesla professioneel laten reinigen in Den Haag?"

6. ZOEKWOORDEN NATUURLIJK VERWERKEN: Zoekwoorden NOOIT letterlijk plakken. Maak er een natuurlijke zin van.
   FOUT: "Wie legt gietvloer badkamer?" (zoekwoord letterlijk geplakt)
   GOED: "Wie kan een gietvloer in de badkamer leggen?"
   FOUT: "Wie kan gietvloer woonkamer aanbrengen?"
   GOED: "Wie kan een gietvloer in mijn woonkamer aanbrengen?"
   FOUT: "specialist wandafwerking kantoor"
   GOED: "een specialist voor wandafwerking in ons kantoor"
   REGEL: Voeg altijd de juiste voorzetsels en lidwoorden toe (in de, in mijn, voor de, op het).

7. NATUURLIJKHEID: Klinkt alsof een echt mens dit typt in ChatGPT.
   FOUT: "Welke dienstverleners kunnen een professionele oplossing bieden voor onze organisatie?"
   GOED: "Ons kantoor moet geschilderd worden, wie kan dat snel en netjes doen?"

8. BEDRIJFSNEUTRAAL: Noem NIET "${companyName}" of letterlijk "${companyCategory}".

9. VAKJARGON: Gebruik het juiste werkwoord per branche. NOOIT "installeren" als dat niet de juiste term is.
   - Vloeren: LEGGEN/AANBRENGEN ("Wie kan een gietvloer leggen", NIET "installeren")
   - Wanden: STUCEN/AANBRENGEN/AFWERKEN ("Wie kan een naadloze wandafwerking aanbrengen")
   - Schilderwerk: SCHILDEREN/VERVEN
   - Dakwerk: DEKKEN/RENOVEREN
   - Algemeen: als je twijfelt, gebruik "laten doen" of "verzorgen"

10. PLAATSNAAM ALTIJD AAN HET EIND: Locatie komt altijd als "in [stad]" aan het einde van de zin.
   FOUT: "een specialist voor wandafwerking in Amsterdam in mijn appartement"
   GOED: "een specialist voor naadloze wandafwerking in mijn appartement in Amsterdam"

11. LOCATIE: Als de gebruiker een servicegebied heeft opgegeven, als de website-analyse een locatie-focus detecteert, of als de zoekwoorden een plaatsnaam bevatten, gebruik die locatie als volgt:
${websiteAnalysis?.locationExclusive
  ? `   DIT BEDRIJF OPEREERT UITSLUITEND IN "${websiteAnalysis.location}". Gebruik deze locatie (of directe varianten/deelgebieden zoals wijken/eilanden) in MINSTENS 8 van de 10 prompts. Prompts zonder locatie leveren voor dit bedrijf bijna nooit een match op en zijn zonde van de meting.`
  : `   Gebruik die locatie in precies 5 van de 10 prompts (de andere 5 zonder).`}
   Als er GEEN locatie bekend is uit geen enkele bron, gebruik dan GEEN plaatsnamen in de prompts.

12. NOOIT TWEE LOCATIES COMBINEREN MET "OF": Een prompt gaat over een plek. Echte zoekers weten al welke locatie ze willen. "Of" tussen locaties signaleert dat de prompt kunstmatig twee keywords probeert te combineren.
   FOUT: "bareboat charter op Lefkas of Corfu"
   FOUT: "een advocaat in Amsterdam of Rotterdam"
   FOUT: "kantoor inrichten in Utrecht of Den Haag"
   GOED: "bareboat charter op Lefkas" (en als Corfu ook relevant is: aparte prompt)
   UITZONDERING: "OF" mag wel tussen diensten/producten ("zeilen met of zonder schipper"), alleen niet tussen plaatsen/regio's.

13. GEEN INTERNE USP-WOORDEN EN MARKETING-JARGON: Woorden die alleen op de website van een bedrijf voorkomen horen niet in een zoekvraag. Zoekers beschrijven een BEHOEFTE of SITUATIE, niet de oplossing met marketing-termen.
   FOUT: "Waar kan ik flexibel een zeilvakantie boeken"
   FOUT: "Wie biedt innovatieve en duurzame oplossingen voor X"
   FOUT: "Ik zoek een specialist met jarenlange expertise in Y"
   FOUT: "Welk toonaangevend bureau is gespecialiseerd in Z"
   GOED: "Waar kan ik een zeilvakantie boeken waarbij ik zelf de vertrekdatum kies"
   GOED: "Welk bureau kan mijn webshop hoger in Google krijgen"
   VERBODEN ZONDER CONTEXT: flexibel, innovatief, duurzaam, premium, professioneel, toonaangevend, vooraanstaand, hoogwaardig, kwalitatief, resultaatgericht, klantgericht, oplossingsgericht.
   TOEGESTAAN MITS CONCREET: "ervaren" (alleen als concreet getal volgt: "50 jaar ervaring"), "gespecialiseerd in" (alleen als directe specialisatie volgt: "gespecialiseerd in IE-recht").

14. GEOGRAFISCHE HERKENBAARHEID: Gebruik alleen locatie-termen die een gemiddelde consument spontaan in een zoekopdracht typt. Abstracte overkoepelende geografische termen (archipels, zeeen, regio-benamingen, landstreken) worden zelden door consumenten gebruikt, zij noemen concrete plaatsen of landen.
   FOUT: "zeilvakantie in de Ionische eilanden" (consumenten kennen deze term niet)
   FOUT: "vakantiehuis in de Benelux" (niemand zoekt zo)
   FOUT: "restaurant in de Randstad" (regio-term, geen zoekterm)
   FOUT: "trouwlocatie in het Groene Hart" (regio-term)
   GOED: "zeilvakantie in Griekenland" of "zeilen bij Lefkas"
   GOED: "vakantiehuis in Nederland" of "vakantiehuis op Texel"
   REGEL: Kies altijd tussen LAND-NIVEAU of CONCRETE PLAATS/EILAND. Sla de abstracte tussenlaag over.

${customTermsInstruction}`
        : `You generate 10 search queries that real people would type into ChatGPT or Perplexity.

YOUR GOAL: Every prompt must be so natural and recognizable that the user thinks "this is EXACTLY what my customers would ask".

${websiteAnalysis?.audienceType === 'B2C' ? `AUDIENCE: CONSUMERS (B2C)` :
websiteAnalysis?.audienceType === 'both' ? `AUDIENCE: CONSUMERS + BUSINESS` :
`AUDIENCE: BUSINESS (B2B)`}

EXAMPLES OF GOOD PROMPTS (high scoring in real scans):
- "I'm looking for an agency that can help my online store rank higher in Google, any recommendations?"
- "Where can I buy reusable stone paper notebooks that I can wipe clean and reuse?"
- "Our company bikes need regular maintenance, which services come on-site?"
- "We want to set up a bike lease program for our employees, who handles that?"
- "I have chronic back pain and want to avoid medication, which osteopath would you recommend?"
- "Which caterer can do smoked BBQ for about 80 guests at an outdoor wedding?"
- "Our restaurant wants to automate phone reservations with AI, who offers that kind of service?"
- "Where can I order an ergonomic vertical mouse with fast shipping?"
- "Who can lay a seamless poured floor in my living room in Denver?"
- "Which SEO agency in Austin delivers measurable results for e-commerce stores?"

EXAMPLES OF BAD PROMPTS (always score 0%):
- "Which companies offer services for..." (too vague)
- "Which specialists specialize in..." (redundant, unnatural)
- "Which suppliers have X in their assortment?" (corporate jargon)
- "Name companies that provide professional solutions" (generic)
- "Can you recommend reliable providers for..." (vague, any company fits)

REQUIRED RULES:

1. VARIETY IN QUESTION TYPE. Use at least 5 of these 7 categories.
   ⛔ GOLDEN RULE: Every prompt MUST trigger an answer where ChatGPT names at least 3 businesses.
   ⛔ ABSOLUTELY FORBIDDEN PROMPT TYPES (these NEVER return company names):
   - "How much does..." / "What does ... cost?" / "What is the price of..." (returns pricing info, not companies)
   - "What's the difference between..." / "Can someone explain..." (returns explanations, not companies)
   - "Has anyone tried..." without asking for a specific company (returns opinions, not companies)
   - "How does ... work" / "How do I..." (returns a process explanation, not company names)
   - "Why choose..." / "Why should I..." (returns pros and cons, not company names)
   CATEGORIES:
   - RECOMMENDATION: "Who can help me with...", "Do you know a good company for..."
   - BEST: "Which company is best for...", "Who is the best ... in the market?"
   - LOCAL: "Who can do [service] in [city]?", "Which [industry] firms are in [area]?"
   - SOLUTION: "I have [problem], which company can solve this?", "Our website ranks poorly, who can help?"
   - SPECIALIST: "Which agencies specialize in...", "Who has experience with [service] for [audience]?"
   - SPECIFIC PRODUCT: A prompt with a very specific product, service, or brand name
   - SITUATION: "We're moving offices and need...", "Our company is growing and we need..."

2. VARIETY IN SENTENCE STRUCTURE. Maximum 2 prompts may start with the same word.
   Good starters: "I'm looking", "My", "We want", "Which company", "Can anyone", "Do you know", "Our company", "Who can", "Where can I"
   FORBIDDEN: More than 2x starting with "Which" or "Where can I"

3. LENGTH: Every prompt is 10-18 words. Not shorter, not longer.

4. LANGUAGE: 100% English. Translate any non-English keywords to natural English.

5. SPECIFICITY: Use CONCRETE services/products from the keywords. The more specific, the better.
   BAD: "Which companies offer cleaning services?"
   GOOD: "Who can professionally detail the interior of my Tesla in the Dallas area?"

6. NATURAL KEYWORD INTEGRATION: NEVER paste keywords literally into a sentence. Add natural prepositions and articles.
   BAD: "who can lay poured floor living room?" (keyword pasted literally)
   GOOD: "who can lay a poured floor in the living room?"
   BAD: "specialist wall finishing office"
   GOOD: "a specialist for wall finishing in our office"

7. NATURALNESS: Sounds like a real person typing this into ChatGPT.
   BAD: "Which service providers can offer professional solutions for our organization?"
   GOOD: "Our office needs painting, who can do that quickly and neatly?"

8. COMPANY-NEUTRAL: Do NOT mention "${companyName}" or literally "${companyCategory}".

9. TRADE LANGUAGE: Use the correct verb per industry. NEVER use "install" if that's not the right term.
   - Floors: LAY/APPLY ("Who can lay a poured floor", NOT "install a floor")
   - Walls: PLASTER/APPLY/FINISH
   - Painting: PAINT
   - Roofing: ROOF/RENOVATE
   - General: if unsure, use "do" or "take care of"

10. LOCATION ALWAYS AT THE END: City/region always comes as "in [city]" at the end of the sentence.
   BAD: "a specialist for wall finishing in Amsterdam in my apartment"
   GOOD: "a specialist for seamless wall finishing in my apartment in Amsterdam"

11. LOCATION: If the user provided a service area, if the website analysis detected a location focus, or if the keywords contain a city/region name, use that location as follows:
${websiteAnalysis?.locationExclusive
  ? `   THIS BUSINESS OPERATES EXCLUSIVELY IN "${websiteAnalysis.location}". Use this location (or direct variants/sub-areas such as districts/islands) in AT LEAST 8 of 10 prompts. Prompts without location rarely yield a match for this business and waste the scan.`
  : `   Use that location in exactly 5 of 10 prompts (the other 5 without).`}
   If NO location is known from any source, do NOT use any city or region names in the prompts.

12. NEVER COMBINE TWO LOCATIONS WITH "OR": A prompt is about one place. Real searchers already know which location they want. "Or" between locations signals an artificial attempt to combine two keywords.
   BAD: "bareboat charter in Lefkas or Corfu"
   BAD: "a lawyer in New York or Boston"
   BAD: "office space in Austin or Dallas"
   GOOD: "bareboat charter in Lefkas" (and if Corfu is also relevant: separate prompt)
   EXCEPTION: "OR" is allowed between services/products ("sailing with or without skipper"), just not between places/regions.

13. NO INTERNAL USP WORDS OR MARKETING JARGON: Words that only appear on a company's website don't belong in a search query. Searchers describe a NEED or SITUATION, not the solution with marketing terms.
   BAD: "Where can I flexibly book a sailing vacation"
   BAD: "Who offers innovative and sustainable solutions for X"
   BAD: "I'm looking for a specialist with years of expertise in Y"
   BAD: "Which leading agency specializes in Z"
   GOOD: "Where can I book a sailing vacation where I pick my own departure date"
   GOOD: "Which agency can get my online store ranking higher in Google"
   FORBIDDEN WITHOUT CONTEXT: flexible, innovative, sustainable, premium, professional, leading, cutting-edge, high-quality, results-driven, client-focused, solution-oriented.
   ALLOWED IF CONCRETE: "experienced" (only with a concrete number: "50 years of experience"), "specialized in" (only if a direct specialization follows: "specialized in IP law").

14. GEOGRAPHIC RECOGNIZABILITY: Only use location terms that an average consumer would spontaneously type in a search query. Abstract overarching geographic terms (archipelagos, seas, regional labels, landscape areas) are rarely used by consumers, they mention concrete cities or countries.
   BAD: "sailing vacation in the Ionian Islands" (consumers don't use this term)
   BAD: "vacation rental in New England" (use specific state instead)
   BAD: "restaurant in the Bay Area" (if too abstract for the searcher)
   GOOD: "sailing vacation in Greece" or "sailing near Lefkas"
   GOOD: "vacation rental in Massachusetts" or "vacation rental on Cape Cod"
   RULE: Always choose between COUNTRY LEVEL or CONCRETE CITY/ISLAND. Skip the abstract middle layer.

${customTermsInstruction}`,
      messages: [{
        role: 'user',
        content: isNL
          ? `Genereer 10 prompts voor een ${websiteAnalysis?.audienceType === 'B2C' ? 'consument' : websiteAnalysis?.audienceType === 'both' ? 'consument of zakelijke klant' : 'zakelijke klant'} die op zoek is naar wat dit bedrijf aanbiedt.

**CONTEXT:**
${websiteAnalysis?.success ? `- Branche (achtergrond): "${companyCategory}"` : `- Branche: "${companyCategory}"`}
- Nederlandse markt
${websiteContext}
${searchConsoleContext}

${websiteAnalysis?.success ? `WEBSITE-DATA IS LEIDEND. De zoekwoorden komen van de website van het bedrijf.
Maak prompts over wat het bedrijf DAADWERKELIJK doet, niet over de brede branche.
Als de zoekwoorden "steenpapier notitieboeken" bevatten, maak dan prompts over steenpapier notitieboeken, NIET over "duurzame kantoorartikelen".` : ''}

CHECKLIST VOOR JE OUTPUT:
- 10 prompts als JSON array
- Elk 10-18 woorden
- Maximaal 2x hetzelfde startwoord
- Minstens 5 verschillende vraagtypen (aanbeveling, beste, lokaal, oplossing, specialist, specifiek product, situatieschets)
- 100% Nederlands, geen Engelse woorden
- Klinkt als een echt mens, niet als een zakelijke brief
- Bedrijfsnaam "${companyName}" komt NERGENS voor

["prompt 1", "prompt 2", ..., "prompt 10"]`
          : `Generate 10 prompts for a ${websiteAnalysis?.audienceType === 'B2C' ? 'consumer' : websiteAnalysis?.audienceType === 'both' ? 'consumer or business client' : 'business client'} searching for what this company offers.

**CONTEXT:**
${websiteAnalysis?.success ? `- Industry (background): "${companyCategory}"` : `- Industry: "${companyCategory}"`}
${websiteContext}
${searchConsoleContext}

${websiteAnalysis?.success ? `WEBSITE DATA IS LEADING. Keywords come from the company's actual website.
Make prompts about what the business ACTUALLY does, not the broad industry.` : ''}

CHECKLIST FOR YOUR OUTPUT:
- 10 prompts as JSON array
- Each 10-18 words
- Maximum 2x the same starting word
- At least 5 different question types (recommendation, best, local, solution, specialist, specific product, situation)
- 100% English, translate any non-English keywords
- Sounds like a real person, not a corporate brief
- Company name "${companyName}" appears NOWHERE

["prompt 1", "prompt 2", ..., "prompt 10"]`
      }]
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    // Strip pre-text before array
    const arrayStart = cleanedText.indexOf('[')
    const arrayEnd = cleanedText.lastIndexOf(']')
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayStart < arrayEnd) {
      cleanedText = cleanedText.substring(arrayStart, arrayEnd + 1)
    }

    let prompts
    try {
      prompts = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('❌ JSON parse failed:', parseError.message, '| Raw (first 300 chars):', cleanedText.substring(0, 300))
      throw new Error('Invalid prompt format from AI')
    }

    if (!Array.isArray(prompts) || prompts.length < 5) {
      console.error('❌ AI returned invalid format or too few prompts:', prompts?.length || 'not an array')
      throw new Error('Invalid prompt format from AI')
    }

    if (prompts.length !== 10) {
      console.warn(`⚠️ AI returned ${prompts.length} prompts instead of 10, using first ${Math.min(prompts.length, 10)}`)
    }

    // Max 10 prompts
    let validatedPrompts = prompts
      .filter(p => typeof p === 'string' && p.trim().length > 10)
      .slice(0, 10)

    // ============================================
    // POST-GENERATION QUALITY CHECKS
    // ============================================

    // Language purity check for NL prompts
    if (isNL) {
      const suspiciousEnglish = new Set([
        'the', 'which', 'that', 'services', 'solutions', 'companies', 'providers',
        'business', 'professional', 'beautiful', 'quality', 'true', 'life',
        'supply', 'equipment', 'commercial', 'industrial', 'for sale',
        'buy', 'find', 'best', 'top', 'leading', 'comprehensive',
        'reliable', 'trusted', 'certified', 'experienced'
      ])
      const allowedLoanWords = new Set([
        'online', 'digital', 'specialist', 'agency', 'coach', 'coaching',
        'design', 'marketing', 'management', 'consultant', 'workshop',
        'catering', 'fitness', 'wellness', 'yoga', 'pilates', 'display',
        'software', 'hardware', 'website', 'webshop', 'hosting', 'seo',
        'ai', 'app', 'platform', 'startup', 'freelance', 'scale-up',
        'brand', 'branding', 'content', 'e-commerce', 'retail', 'b2b', 'b2c',
        'bbq', 'festival', 'event', 'spa', 'hotel', 'lounge', 'premium'
      ])

      validatedPrompts.forEach((prompt, i) => {
        const words = prompt.toLowerCase().split(/\s+/)
        const badWords = words.filter(w =>
          suspiciousEnglish.has(w) && !allowedLoanWords.has(w)
        )
        if (badWords.length >= 2) {
          console.warn(`⚠️ NL prompt ${i+1} has English words [${badWords.join(', ')}]: "${prompt.substring(0, 80)}..."`)
        }
      })
    }

    // Starter diversity check
    const starters = {}
    validatedPrompts.forEach(p => {
      const firstWord = p.split(/\s+/)[0].toLowerCase()
      starters[firstWord] = (starters[firstWord] || 0) + 1
    })
    const overused = Object.entries(starters).filter(([_, count]) => count > 3)
    if (overused.length > 0) {
      console.warn(`⚠️ Low starter diversity: ${overused.map(([w, c]) => `"${w}" ${c}x`).join(', ')}`)
    }

    // Word count check
    const shortOnes = validatedPrompts.filter(p => p.split(/\s+/).length < 8)
    if (shortOnes.length > 0) {
      console.warn(`⚠️ ${shortOnes.length} prompts too short (<8 words): ${shortOnes.map(p => `"${p.substring(0, 40)}..."`).join(', ')}`)
    }

    // Log quality metrics
    const avgWords = Math.round(validatedPrompts.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / validatedPrompts.length)
    const uniqueStarters = Object.keys(starters).length
    console.log(`📊 Prompt quality: ${validatedPrompts.length} prompts, avg ${avgWords} words, ${uniqueStarters} unique starters`)

    // ============================================
    // CUSTOM TERMS VALIDATION (unchanged)
    // ============================================
    if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
      const promptCount = validatedPrompts.length
      const promptsWithExcluded = validatedPrompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.exclude?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const promptsWithIncluded = validatedPrompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.include?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const promptsWithLocation = validatedPrompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.location?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const hasForbiddenGeographic = customTerms.location?.some(t =>
        !t.toLowerCase().includes('landelijk') &&
        !t.toLowerCase().includes('nederland') &&
        !t.toLowerCase().includes('nationaal')
      ) ? validatedPrompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return lowerPrompt.includes('nederland') ||
               lowerPrompt.includes('belgie') ||
               lowerPrompt.includes('belgië') ||
               (lowerPrompt.includes('landelijk') && !customTerms.location.some(t => t.toLowerCase().includes('landelijk')))
      }).length : 0

      console.log(`✅ Custom terms validation (${promptCount} prompts):`)
      console.log(`   - ${promptsWithExcluded}/${promptCount} contain excluded terms (target: 0)`)
      if (customTerms.include?.length > 0) {
        console.log(`   - ${promptsWithIncluded}/${promptCount} contain included terms (target: 7+)`)
      }
      if (customTerms.location?.length > 0) {
        console.log(`   - ${promptsWithLocation}/${promptCount} contain location terms (target: 5)`)
        console.log(`   - ${hasForbiddenGeographic}/${promptCount} contain forbidden geographic terms (target: 0)`)
      }

      if (promptsWithExcluded > 0) {
        console.warn(`⚠️ WARNING: ${promptsWithExcluded} prompts contain EXCLUDED terms!`)
      }
      if (customTerms.include?.length > 0 && promptsWithIncluded < 7) {
        console.warn(`⚠️ WARNING: Only ${promptsWithIncluded}/${promptCount} contain included terms (target: 7+)`)
      }
      if (customTerms.location?.length > 0 && promptsWithLocation < 4) {
        console.warn(`⚠️ WARNING: Only ${promptsWithLocation}/${promptCount} contain location terms (target: 5)`)
      }
      if (hasForbiddenGeographic > 0) {
        console.warn(`⚠️ WARNING: ${hasForbiddenGeographic} prompts contain forbidden geographic terms`)
      }
    }

    return { success: true, prompts: validatedPrompts }
  } catch (error) {
    console.error('AI Prompt Generation Error:', error)
    return { success: false, error: isNL ? 'Fout bij promptgeneratie' : 'Error during prompt generation' }
  }
}

// ============================================
// ESTIMATE PROMPT VOLUMES (FOMO data: AI-volume + trend + difficulty)
// 2e Claude-pass na generatePromptsWithClaude. Schat per prompt:
//   - estimatedAiVolume: hoeveel keer per maand wordt deze vraag aan ChatGPT/Perplexity/Google AI gesteld (50-5000)
//   - trendSignal: 'rising' | 'stable' | 'declining'
//   - difficulty: 'easy' | 'medium' | 'hard' (hoe moeilijk is het om in het antwoord te verschijnen)
//   - difficultyScore: 1-100
// Snel (~10-15s), gebruikt Sonnet voor consistentie met de generator.
// ============================================
export async function estimatePromptVolumes(prompts, websiteAnalysis = null, isNL = true) {
  if (!Array.isArray(prompts) || prompts.length === 0) {
    return { success: false, error: 'No prompts to estimate' }
  }

  const contextLine = websiteAnalysis?.success
    ? (isNL
      ? `Branche: ${websiteAnalysis.businessType || 'overig'}, doelgroep: ${websiteAnalysis.audienceType || 'B2B'}, locatie: ${websiteAnalysis.location || 'landelijk'}.`
      : `Industry: ${websiteAnalysis.businessType || 'other'}, audience: ${websiteAnalysis.audienceType || 'B2B'}, location: ${websiteAnalysis.location || 'national'}.`)
    : ''

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: isNL
        ? `Je schat per AI-zoekvraag hoe vaak hij gesteld wordt aan ChatGPT, Perplexity en Google AI Mode, plus de trend en hoe moeilijk het is om in het antwoord te verschijnen.

METHODOLOGIE:
- AI-volume basis: Google-zoekvolume voor het zoekwoord, vermenigvuldigd met AI-adoptiefactor (15-25% per branche).
- Specifieke vragen (long-tail) hebben minder volume dan korte. Maar long-tail wordt sneller geadopteerd in AI dan Google.
- Lokale vragen hebben minder volume dan landelijk.
- B2B-vragen hebben minder volume dan B2C.
- Trend: rising voor AI-native onderwerpen (AI-tools, GEO, sustainable, electric, etc.), stable voor klassieke diensten, declining alleen voor verouderende technologie.
- Difficulty: hoeveel concurrentie staat al in AI-antwoorden. Generieke vragen = hard. Niche/specifieke vragen = easy.

Geef ALLEEN een JSON-array terug met exact ${prompts.length} entries, in dezelfde volgorde als de input. Geen extra tekst.`
        : `For each AI search query you estimate how often it is asked in ChatGPT, Perplexity and Google AI Mode, plus the trend and how hard it is to appear in the answer.

METHODOLOGY:
- AI volume basis: Google search volume for the keyword, multiplied by AI adoption factor (15-25% per industry).
- Specific (long-tail) questions have lower volume than short ones, but long-tail is adopted faster in AI than Google.
- Local queries have lower volume than national.
- B2B queries have lower volume than B2C.
- Trend: rising for AI-native topics (AI tools, GEO, sustainable, electric, etc.), stable for classic services, declining only for aging tech.
- Difficulty: how much competition already appears in AI answers. Generic questions = hard. Niche/specific = easy.

Return ONLY a JSON array with exactly ${prompts.length} entries, in the same order as the input. No extra text.`,
      messages: [{
        role: 'user',
        content: isNL
          ? `${contextLine}

Prompts om te schatten:

${prompts.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

Geef een JSON-array waarbij elke entry dit format heeft:
{ "estimatedAiVolume": getal (50-5000), "trendSignal": "rising" | "stable" | "declining", "difficulty": "easy" | "medium" | "hard", "difficultyScore": getal (1-100) }

["{...}", "{...}", ...] (exact ${prompts.length} entries, JSON-array)`
          : `${contextLine}

Prompts to estimate:

${prompts.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

Return a JSON array where each entry has this format:
{ "estimatedAiVolume": number (50-5000), "trendSignal": "rising" | "stable" | "declining", "difficulty": "easy" | "medium" | "hard", "difficultyScore": number (1-100) }

[{...}, {...}, ...] (exactly ${prompts.length} entries, JSON array)`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    const arrayStart = cleanedText.indexOf('[')
    const arrayEnd = cleanedText.lastIndexOf(']')
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayStart < arrayEnd) {
      cleanedText = cleanedText.substring(arrayStart, arrayEnd + 1)
    }

    let parsed
    try {
      parsed = JSON.parse(cleanedText)
    } catch (parseErr) {
      console.error('❌ Volume estimate JSON parse failed:', parseErr.message)
      throw new Error('Invalid volume-estimate format from AI')
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Volume estimate not an array')
    }

    // Sanitize per entry; fall back to neutral defaults if missing.
    const sanitized = prompts.map((_, i) => {
      const raw = parsed[i] || {}
      const vol = Number(raw.estimatedAiVolume)
      const trend = ['rising', 'stable', 'declining'].includes(raw.trendSignal) ? raw.trendSignal : 'stable'
      const diff = ['easy', 'medium', 'hard'].includes(raw.difficulty) ? raw.difficulty : 'medium'
      const score = Number(raw.difficultyScore)
      return {
        estimatedAiVolume: Number.isFinite(vol) && vol > 0 ? Math.min(5000, Math.max(50, Math.round(vol))) : 200,
        trendSignal: trend,
        difficulty: diff,
        difficultyScore: Number.isFinite(score) ? Math.min(100, Math.max(1, Math.round(score))) : 50,
      }
    })

    return { success: true, estimates: sanitized }
  } catch (error) {
    console.error('❌ Volume estimate error:', error.message)
    // Neutral fallback so the funnel never blocks on estimate failure.
    const neutral = prompts.map(() => ({
      estimatedAiVolume: 200,
      trendSignal: 'stable',
      difficulty: 'medium',
      difficultyScore: 50,
    }))
    return { success: false, error: error.message, estimates: neutral }
  }
}
