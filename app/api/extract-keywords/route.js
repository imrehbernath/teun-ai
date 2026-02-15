// app/api/extract-keywords/route.js
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

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

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '0f2289b685e1cf063f5c6572e2dcef83'

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
// SCRAPE WITH SCRAPERAPI
// Tiered: render=true (5 credits) → render+premium (25 credits)
// ============================================================
async function scrapeWebsite(url) {
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  // Attempt 1: render=true (JS rendering, bypasses most Cloudflare) — 5 credits
  try {
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}&render=true&country_code=nl`
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      signal: AbortSignal.timeout(25000)
    })
    
    if (response.ok) {
      const html = await response.text()
      if (!isGarbagePage(html)) {
        console.log(`✅ Scrape OK (render=true): ${normalizedUrl}`)
        return { success: true, html }
      }
      console.log(`⚠️ Garbage page with render=true, trying premium...`)
    } else {
      console.log(`⚠️ Render scrape HTTP ${response.status}, trying premium...`)
    }
  } catch (error) {
    console.log(`⚠️ Render scrape failed: ${error.message}, trying premium...`)
  }

  // Attempt 2: Try with www. prefix if bare domain
  const urlObj = new URL(normalizedUrl)
  const hasWww = urlObj.hostname.startsWith('www.')
  if (!hasWww) {
    const wwwUrl = normalizedUrl.replace('://', '://www.')
    try {
      const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(wwwUrl)}&render=true&country_code=nl`
      
      const response = await fetch(scraperUrl, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(25000)
      })
      
      if (response.ok) {
        const html = await response.text()
        if (!isGarbagePage(html)) {
          console.log(`✅ Scrape OK (www. variant): ${wwwUrl}`)
          return { success: true, html }
        }
      }
      console.log(`⚠️ www. variant also failed, trying premium...`)
    } catch (error) {
      console.log(`⚠️ www. variant failed: ${error.message}`)
    }
  }

  // Attempt 3: render=true + premium=true (residential proxy) — 25 credits
  try {
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}&render=true&premium=true&country_code=nl`
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      signal: AbortSignal.timeout(30000)
    })
    
    if (response.ok) {
      const html = await response.text()
      if (!isGarbagePage(html)) {
        console.log(`✅ Scrape OK (premium): ${normalizedUrl}`)
        return { success: true, html }
      }
      console.log(`⚠️ Garbage page even with premium for ${normalizedUrl}`)
    }
  } catch (error) {
    console.log(`⚠️ Premium scrape failed: ${error.message}`)
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
        /dienst|service|product|oploss|behandel|specialist|aanbod|werkgebied|wat-we|over-ons/i.test(href + text)) {
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
async function generateFallbackKeywords(companyName, category) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `Je bent een expert in zoekwoord-extractie voor Nederlandse bedrijven. Antwoord ALTIJD in het Nederlands. Geef ALLEEN JSON terug.`,
      messages: [{
        role: 'user',
        content: `Genereer 10 commerciële zoekwoorden die potentiële klanten zouden gebruiken om een "${category}" te vinden.
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

    // Step 1: Scrape (render=true → premium fallback)
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

    // Step 3: Extract keywords with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `Je bent een expert in zoekwoord-extractie voor Nederlandse websites. Je analyseert pagina-content en bepaalt welke zoekwoorden potentiële klanten zouden gebruiken om dit bedrijf te vinden. Antwoord ALTIJD in het Nederlands. Geef ALLEEN JSON terug.`,
      messages: [{
        role: 'user',
        content: `Analyseer deze homepage en geef 10 commerciële zoekwoorden die potentiële klanten zouden gebruiken:

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
