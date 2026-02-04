import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY

// GEO Checklist items that can be auto-checked
const AUTO_CHECK_ITEMS = {
  // Basisinformatie
  owner_info: { keywords: ['over ons', 'about', 'wie zijn', 'ons team', 'bedrijf'], weight: 1 },
  contact_visible: { keywords: ['contact', 'telefoon', 'email', 'adres', 'bel ons'], weight: 1 },
  about_page: { keywords: ['team', 'medewerkers', 'oprichter', 'auteur'], weight: 1 },
  nap_consistent: { keywords: ['kvk', 'btw', 'adres', 'postcode'], weight: 1 },
  
  // Technisch
  https: { check: 'url_https', weight: 2 },
  mobile_friendly: { check: 'viewport', weight: 2 },
  accessibility: { keywords: ['alt=', 'aria-'], weight: 1 },
  
  // Content
  headings: { check: 'has_h1_h2', weight: 2 },
  paragraphs: { check: 'content_structure', weight: 1 },
  faq_present: { keywords: ['faq', 'veelgestelde vragen', 'vraag en antwoord'], weight: 2 },
  internal_links: { check: 'internal_links', weight: 1 },
  external_links: { check: 'external_links', weight: 1 },
  
  // Structured Data
  jsonld: { check: 'has_jsonld', weight: 3 },
  image_alt: { check: 'images_have_alt', weight: 1 },
  
  // Metadata
  title_meta: { check: 'has_title_meta', weight: 2 },
  og_tags: { check: 'has_og_tags', weight: 1 },
  canonical: { check: 'has_canonical', weight: 1 },
  
  // AI Signals
  qa_format: { keywords: ['?', 'hoe', 'wat', 'waarom', 'wanneer'], weight: 2 },
  short_answers: { check: 'short_paragraphs', weight: 1 },
  longtail: { check: 'longtail_content', weight: 1 },
}

async function scrapeWebsite(url) {
  try {
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}&render=false`
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(20000)
    })
    
    if (!response.ok) {
      throw new Error(`Scraper error: ${response.status}`)
    }
    
    return await response.text()
  } catch (error) {
    console.error('Scrape error:', error)
    return null
  }
}

function analyzeHtml(html, url) {
  const checks = {}
  const issues = []
  let score = 0
  let maxScore = 0
  
  // URL check - HTTPS
  checks.https = url.startsWith('https')
  if (!checks.https) issues.push('Website gebruikt geen HTTPS')
  
  // Viewport (mobile friendly indicator)
  checks.viewport = /viewport/.test(html)
  if (!checks.viewport) issues.push('Geen viewport meta tag gevonden')
  
  // Title and meta description
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
  checks.has_title_meta = !!(titleMatch && metaDescMatch)
  if (!titleMatch) issues.push('Geen title tag gevonden')
  if (!metaDescMatch) issues.push('Geen meta description gevonden')
  
  // H1 and H2 headings
  const h1Count = (html.match(/<h1/gi) || []).length
  const h2Count = (html.match(/<h2/gi) || []).length
  checks.has_h1_h2 = h1Count > 0 && h2Count > 0
  if (h1Count === 0) issues.push('Geen H1 heading gevonden')
  if (h1Count > 1) issues.push('Meerdere H1 headings gevonden (gebruik er 1)')
  if (h2Count === 0) issues.push('Geen H2 headings gevonden')
  
  // JSON-LD structured data
  checks.has_jsonld = /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html)
  if (!checks.has_jsonld) issues.push('Geen JSON-LD structured data gevonden')
  
  // Open Graph tags
  checks.has_og_tags = /og:title|og:description|og:image/i.test(html)
  if (!checks.has_og_tags) issues.push('Geen Open Graph tags gevonden')
  
  // Canonical tag
  checks.has_canonical = /<link[^>]*rel=["']canonical["']/i.test(html)
  if (!checks.has_canonical) issues.push('Geen canonical tag gevonden')
  
  // Images with alt text
  const imgCount = (html.match(/<img/gi) || []).length
  const imgAltCount = (html.match(/<img[^>]*alt=["'][^"']+["']/gi) || []).length
  checks.images_have_alt = imgCount === 0 || imgAltCount >= imgCount * 0.8
  if (imgCount > 0 && imgAltCount < imgCount * 0.8) {
    issues.push(`${imgCount - imgAltCount} afbeeldingen missen alt tekst`)
  }
  
  // Internal links
  const internalLinkCount = (html.match(/href=["']\/[^"']*["']/gi) || []).length
  checks.internal_links = internalLinkCount >= 3
  if (internalLinkCount < 3) issues.push('Weinig interne links gevonden')
  
  // External links
  const externalLinkCount = (html.match(/href=["']https?:\/\/(?!.*?(facebook|twitter|instagram|linkedin))[^"']+["']/gi) || []).length
  checks.external_links = externalLinkCount >= 1
  
  // Content analysis (basic)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  const wordCount = textContent.split(/\s+/).length
  checks.content_structure = wordCount > 300
  if (wordCount < 300) issues.push('Pagina heeft weinig content (< 300 woorden)')
  
  // FAQ indicators
  checks.has_faq = /faq|veelgestelde|vraag|antwoord/i.test(html)
  if (!checks.has_faq) issues.push('Geen FAQ sectie gevonden')
  
  // Contact info
  checks.has_contact = /contact|telefoon|email|@|bel ons/i.test(textContent)
  
  // Calculate score
  const checkWeights = {
    https: 10,
    viewport: 5,
    has_title_meta: 10,
    has_h1_h2: 10,
    has_jsonld: 15,
    has_og_tags: 5,
    has_canonical: 5,
    images_have_alt: 5,
    internal_links: 5,
    external_links: 3,
    content_structure: 10,
    has_faq: 7,
    has_contact: 5,
  }
  
  for (const [key, weight] of Object.entries(checkWeights)) {
    maxScore += weight
    if (checks[key]) score += weight
  }
  
  const finalScore = Math.round((score / maxScore) * 100)
  
  return {
    checklist: checks,
    score: finalScore,
    issues,
    wordCount,
    title: titleMatch ? titleMatch[1] : null
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 })
    }
    
    // Scrape the page
    const html = await scrapeWebsite(url)
    
    if (!html) {
      return NextResponse.json({ 
        checklist: {},
        score: 0,
        issues: ['Kon pagina niet laden'],
        scanned: false
      })
    }
    
    // Analyze the HTML
    const results = analyzeHtml(html, url)
    
    return NextResponse.json({
      ...results,
      scanned: true
    })
    
  } catch (error) {
    console.error('GEO scan error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
