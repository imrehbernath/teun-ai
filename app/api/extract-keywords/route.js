// app/api/extract-keywords/route.js
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY


// ============================================================
// GARBAGE PAGE DETECTION
// Cloudflare challenges, parking pages, thin content
// ============================================================
function isGarbagePage(html) {
  const htmlLower = html.toLowerCase()
  
  const garbageSignals = [
    // Cloudflare challenges
    'checking your browser', 'just a moment', 'verify you are human',
    'cf-browser-verification', 'challenge-platform', '_cf_chl',
    'attention required', 'ddos protection', 'security check',
    'checking if the site connection is secure', 'please turn javascript on',
    'enable javascript and cookies', 'ray id',
    // Bot protection
    'access denied', 'bot protection', 'are you a robot',
    // Parking / placeholder
    'domain is parked', 'this domain is for sale', 'buy this domain',
    'under construction', 'coming soon', 'website binnenkort beschikbaar',
  ]
  
  if (garbageSignals.some(s => htmlLower.includes(s))) return true
  
  // Very thin content = probably a challenge page
  const hasH1 = /<h1[^>]*>/i.test(html)
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
  
  if (bodyText.length < 300 && !hasH1) return true
  
  return false
}


// ============================================================
// LANGUAGE DETECTION — Content-First
// NEVER trust HTML lang attribute first (Shopify/Wix often wrong)
// ============================================================
function detectPageLanguage(html, url) {
  // 1. Content analysis FIRST — most reliable (Shopify/Wix often have wrong lang="en")
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .slice(0, 8000)

  const nlWords = ['het', 'een', 'van', 'voor', 'met', 'zijn', 'naar', 'ook', 'meer', 'niet', 'onze', 'wij', 'dit', 'deze', 'waar', 'hoe', 'welke', 'jouw', 'bij', 'maar', 'wordt', 'alle', 'over', 'nog', 'als', 'wat', 'uit', 'veel', 'door', 'bent', 'kan', 'ons', 'heeft', 'winkelwagen', 'bestellen', 'gratis', 'bezorging', 'producten', 'prijzen', 'zoeken', 'betalen', 'aanmelden', 'bekijk', 'korting', 'klantenservice', 'levertijd']
  const enWords = ['the', 'and', 'for', 'with', 'our', 'your', 'this', 'that', 'from', 'are', 'was', 'been', 'have', 'has', 'will', 'can', 'you', 'they', 'which', 'about', 'more', 'their', 'also', 'would', 'into', 'than', 'these', 'when', 'where', 'how', 'shop', 'cart', 'checkout', 'shipping', 'products', 'pricing', 'search', 'subscribe', 'delivery']

  let nlScore = 0, enScore = 0
  nlWords.forEach(w => { nlScore += (bodyText.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length })
  enWords.forEach(w => { enScore += (bodyText.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length })

  // Strong content signal — trust regardless of HTML lang attribute
  if (nlScore > enScore * 1.3) return 'nl'
  if (enScore > nlScore * 1.3) return 'en'

  // 2. Ambiguous content — check hreflang tags (canonical URL match)
  const canonicalLang = html.match(/<link[^>]*hreflang=["']([a-z]{2})["'][^>]*href=["'][^"']*["']/gi)
  if (canonicalLang && url) {
    for (const tag of canonicalLang) {
      const href = (tag.match(/href=["']([^"']+)["']/) || [])[1] || ''
      const hl = (tag.match(/hreflang=["']([a-z]{2})["']/) || [])[1] || ''
      if (href && url.includes(href.replace(/^https?:\/\/[^/]+/, ''))) return hl
    }
  }

  // 3. HTML lang attribute as tiebreaker
  const langMatch = html.match(/<html[^>]*\slang=["']([a-z]{2})/i)
  if (langMatch) {
    const lang = langMatch[1].toLowerCase()
    if (lang === 'en' || lang === 'nl') return lang
  }

  // 4. URL path hint
  if (url) {
    const urlLower = url.toLowerCase()
    if (/\/(en|eng)(\/|$)/.test(urlLower)) return 'en'
    if (/\/(nl|ned)(\/|$)/.test(urlLower)) return 'nl'
  }

  // 5. Default NL (Dutch market platform)
  return 'nl'
}


// ============================================================
// SCRAPE WEBSITE
// Tiered: 1) Direct fetch (free) → 2) ScraperAPI premium (highest success)
// ============================================================
async function scrapeWebsite(url) {
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  // Also prepare www variant
  const urlObj = new URL(normalizedUrl)
  const hasWww = urlObj.hostname.startsWith('www.')
  const wwwUrl = hasWww ? normalizedUrl : normalizedUrl.replace('://', '://www.')

  // ── Attempt 1: Direct fetch (FREE, no ScraperAPI credits) ──
  // Works for ~70% of sites (WordPress, static sites, most CMS)
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
          return { success: true, html, method: 'direct', finalUrl: tryUrl }
        }
        console.log(`⚠️ Direct fetch got garbage/thin page for ${tryUrl}`)
      } else {
        console.log(`⚠️ Direct fetch HTTP ${response.status} for ${tryUrl}`)
      }
    } catch (error) {
      console.log(`⚠️ Direct fetch failed for ${tryUrl}: ${error.message}`)
    }
  }

  // ── Attempt 2: ScraperAPI premium directly (25 credits, highest success rate) ──
  if (!SCRAPER_API_KEY) {
    console.log(`⚠️ SCRAPER_API_KEY not configured — skipping ScraperAPI`)
    return { success: false, error: 'Website kon niet gescraped worden (ScraperAPI niet geconfigureerd)' }
  }

  for (const tryUrl of [normalizedUrl, wwwUrl]) {
    try {
      console.log(`🔗 ScraperAPI premium: ${tryUrl}`)
      const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(tryUrl)}&render=true&premium=true&country_code=nl`
      
      const response = await fetch(scraperUrl, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(30000)
      })
      
      if (response.ok) {
        const html = await response.text()
        if (!isGarbagePage(html)) {
          console.log(`✅ ScraperAPI premium OK: ${tryUrl} (${html.length} chars)`)
          return { success: true, html, method: 'scraperapi-premium', finalUrl: tryUrl }
        }
      } else {
        console.log(`⚠️ ScraperAPI premium HTTP ${response.status} for ${tryUrl}`)
      }
    } catch (error) {
      console.log(`⚠️ ScraperAPI premium failed for ${tryUrl}: ${error.message}`)
    }
  }

  return { success: false, error: 'Website kon niet gescraped worden (mogelijk sterke bot-protectie)' }
}


// ============================================================
// PARSE HTML CONTENT
// ============================================================
function parseHtmlContent(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''
  
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : ''
  
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []
  const h1s = h1Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 3)
  
  const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []
  const h2s = h2Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 8)
  
  const h3Matches = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || []
  const h3s = h3Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 8)
  
  // Extract navigation items
  const navItems = []
  const navBlocks = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || []
  navBlocks.forEach(nav => {
    const links = nav.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) || []
    links.forEach(link => {
      const text = link.replace(/<[^>]+>/g, '').trim()
      if (text.length > 1 && text.length < 60) navItems.push(text)
    })
  })
  
  // Extract service/product links
  const serviceLinks = []
  const internalLinks = html.match(/<a[^>]*href=["']\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi) || []
  internalLinks.forEach(link => {
    const hrefMatch = link.match(/href=["']([^"']+)["']/)
    const text = link.replace(/<[^>]+>/g, '').trim()
    const href = hrefMatch ? hrefMatch[1] : ''
    if (href && text.length > 2 && text.length < 80 && 
        /dienst|service|product|oploss|behandel|specialist|aanbod|werkgebied|wat-we|over-ons|about|pricing|solutions|offerings|portfolio|what-we/i.test(href + text)) {
      serviceLinks.push(`${text} (${href})`)
    }
  })
  
  // Extract body content
  let bodyContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)
  
  return { title, metaDescription, h1s, h2s, h3s, navItems: [...new Set(navItems)].slice(0, 15), serviceLinks: [...new Set(serviceLinks)].slice(0, 10), bodyContent }
}


// ============================================================
// FALLBACK: Generate keywords from category when scraping fails
// ============================================================
async function generateFallbackKeywords(companyName, category, lang = 'nl') {
  const isNl = lang === 'nl'
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: isNl
        ? `Je bent een expert in zoekwoord-extractie voor Nederlandse bedrijven. Antwoord ALTIJD in het Nederlands. Geef ALLEEN JSON terug.`
        : `You are an expert in keyword extraction for businesses. Answer ALWAYS in English. Return ONLY JSON.`,
      messages: [{
        role: 'user',
        content: isNl
          ? `Genereer 10 commerciële zoekwoorden die potentiële klanten zouden gebruiken om een "${category}" te vinden.
${companyName ? `Het bedrijf heet "${companyName}".` : ''}

Geef EXACT dit JSON-formaat:
{
  "keywords": ["zoekwoord1", "zoekwoord2", ..., "zoekwoord10"],
  "companyName": "${companyName || ''}",
  "category": "${category}",
  "location": null
}

REGELS:
- 10 zoekwoorden die KLANTEN zouden typen
- Mix van korte (1-2 woorden) en langere (2-4 woorden)
- Focus op diensten, producten en commerciële intentie
- Alles in het Nederlands

ALLEEN JSON, geen extra tekst.`
          : `Generate 10 commercial keywords that potential customers would use to find a "${category}".
${companyName ? `The company is called "${companyName}".` : ''}

Return EXACTLY this JSON format:
{
  "keywords": ["keyword1", "keyword2", ..., "keyword10"],
  "companyName": "${companyName || ''}",
  "category": "${category}",
  "location": null
}

RULES:
- 10 keywords that CUSTOMERS would type
- Mix of short (1-2 words) and longer (2-4 words)
- Focus on services, products and commercial intent
- All in English

ONLY JSON, no extra text.`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    else if (cleanedText.startsWith('```')) cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')

    const analysis = JSON.parse(cleanedText)
    return {
      keywords: analysis.keywords || [],
      companyName: companyName || '',
      category: category,
      location: null,
      source: { title: null, metaDescription: null, h1: null },
      fallback: true
    }
  } catch (error) {
    console.error('Fallback keyword generation failed:', error)
    return null
  }
}


// ============================================================
// POST HANDLER
// ============================================================
export async function POST(request) {
  try {
    const body = await request.json()
    const { url, companyName: inputName, category: inputCategory } = body
    
    if (!url || !url.trim()) {
      return NextResponse.json({ error: 'URL is verplicht' }, { status: 400, headers: CORS_HEADERS })
    }

    // Step 1: Scrape (direct fetch → ScraperAPI premium)
    const scrapeResult = await scrapeWebsite(url)
    
    if (!scrapeResult.success) {
      console.log(`⚠️ All scrape attempts failed for ${url}`)
      
      // Fallback: generate keywords from category
      if (inputCategory) {
        const fallback = await generateFallbackKeywords(inputName, inputCategory)
        if (fallback) {
          console.log(`✅ Fallback keywords generated for ${inputCategory}`)
          return NextResponse.json({ success: true, ...fallback }, { headers: CORS_HEADERS })
        }
      }
      
      return NextResponse.json({ error: `Kon website niet laden: ${scrapeResult.error}` }, { status: 422, headers: CORS_HEADERS })
    }

    // Step 2: Parse HTML
    const parsed = parseHtmlContent(scrapeResult.html)

    // Step 3: Detect language (content-first)
    const lang = detectPageLanguage(scrapeResult.html, url)
    const isNl = lang === 'nl'
    console.log(`🌍 Detected language: ${lang}`)

    // Step 4: Extract keywords with Claude (bilingual)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: isNl
        ? `Je bent een expert in zoekwoord-extractie voor Nederlandse websites. Je analyseert pagina-content en bepaalt welke zoekwoorden potentiële klanten zouden gebruiken om dit bedrijf te vinden. Antwoord ALTIJD in het Nederlands. Geef ALLEEN JSON terug.`
        : `You are an expert in keyword extraction for websites. You analyze page content and determine which keywords potential customers would use to find this business. Answer ALWAYS in English. Return ONLY JSON.`,
      messages: [{
        role: 'user',
        content: isNl
          ? `Analyseer deze homepage en geef 10 commerciële zoekwoorden die potentiële klanten zouden gebruiken:

**TITEL:** ${parsed.title || 'Onbekend'}
**META BESCHRIJVING:** ${parsed.metaDescription || 'Onbekend'}
**H1:** ${parsed.h1s.join(' | ') || 'Geen'}
**H2:** ${parsed.h2s.join(' | ') || 'Geen'}
**H3:** ${parsed.h3s.join(' | ') || 'Geen'}
**NAVIGATIE:** ${parsed.navItems.join(' | ') || 'Geen'}
**DIENSTEN LINKS:** ${parsed.serviceLinks.join(' | ') || 'Geen'}
**CONTENT:** ${parsed.bodyContent.slice(0, 2000)}

Geef EXACT dit JSON-formaat:
{
  "keywords": ["zoekwoord1", "zoekwoord2", "zoekwoord3", "zoekwoord4", "zoekwoord5", "zoekwoord6", "zoekwoord7", "zoekwoord8", "zoekwoord9", "zoekwoord10"],
  "companyName": "bedrijfsnaam zoals gevonden op de pagina",
  "category": "branche/categorie van het bedrijf",
  "location": "locatie als gevonden, anders null"
}

REGELS:
- 10 zoekwoorden die KLANTEN zouden typen (niet de bedrijfsnaam zelf)
- Mix van korte (1-2 woorden) en langere (2-4 woorden) zoekwoorden
- Focus op diensten, producten en commerciële intentie
- Haal keywords uit: menu, H1/H2/H3, diensten-links, meta beschrijving
- Alles in het Nederlands

ALLEEN JSON, geen extra tekst.`
          : `Analyze this homepage and provide 10 commercial keywords that potential customers would use:

**TITLE:** ${parsed.title || 'Unknown'}
**META DESCRIPTION:** ${parsed.metaDescription || 'Unknown'}
**H1:** ${parsed.h1s.join(' | ') || 'None'}
**H2:** ${parsed.h2s.join(' | ') || 'None'}
**H3:** ${parsed.h3s.join(' | ') || 'None'}
**NAVIGATION:** ${parsed.navItems.join(' | ') || 'None'}
**SERVICE LINKS:** ${parsed.serviceLinks.join(' | ') || 'None'}
**CONTENT:** ${parsed.bodyContent.slice(0, 2000)}

Return EXACTLY this JSON format:
{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
  "companyName": "company name as found on the page",
  "category": "industry/category of the business",
  "location": "location if found, otherwise null"
}

RULES:
- 10 keywords that CUSTOMERS would type (not the company name itself)
- Mix of short (1-2 words) and longer (2-4 words) keywords
- Focus on services, products and commercial intent
- Extract keywords from: menu, H1/H2/H3, service links, meta description
- All in English

ONLY JSON, no extra text.`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    const analysis = JSON.parse(cleanedText)

    return NextResponse.json({
      success: true,
      keywords: analysis.keywords || [],
      companyName: analysis.companyName || '',
      category: analysis.category || '',
      location: analysis.location || null,
      detectedLanguage: lang,
      source: {
        title: parsed.title,
        metaDescription: parsed.metaDescription,
        h1: parsed.h1s[0] || null
      }
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('Extract keywords error:', error)
    return NextResponse.json({ error: 'Kon zoekwoorden niet extraheren' }, { status: 500, headers: CORS_HEADERS })
  }
}
