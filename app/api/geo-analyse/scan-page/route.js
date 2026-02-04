import { NextResponse } from 'next/server'

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY

// ============================================
// SCAN PAGE API - Scrapes a single page
// ============================================

export async function POST(request) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    }

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    console.log(`🔍 Scanning page: ${normalizedUrl}`)

    // Scrape the page using Scraper API
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}&render=false`
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(20000) // 20 second timeout
    })

    if (!response.ok) {
      throw new Error(`Scraper API error: ${response.status}`)
    }

    const html = await response.text()
    console.log(`✅ Scraped ${html.length} characters`)

    // Parse HTML content
    const parsed = parseHtmlContent(html)
    
    // Extract structured data
    const structuredData = extractStructuredData(html)
    
    // Analyze content quality
    const contentAnalysis = analyzeContent(parsed, html)

    return NextResponse.json({
      success: true,
      url: normalizedUrl,
      title: parsed.title,
      metaDescription: parsed.metaDescription,
      h1s: parsed.h1s,
      h2s: parsed.h2s,
      h3s: parsed.h3s,
      bodyContent: parsed.bodyContent,
      keywords: parsed.keywords,
      structuredData,
      contentAnalysis,
      wordCount: parsed.wordCount,
      internalLinks: parsed.internalLinks,
      externalLinks: parsed.externalLinks
    })

  } catch (error) {
    console.error('Page scan error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

// ============================================
// HTML PARSING FUNCTIONS
// ============================================

function parseHtmlContent(html) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : ''
  
  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)
  const metaDescription = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1].trim()) : ''
  
  // Extract meta keywords
  const metaKeywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i)
  const metaKeywords = metaKeywordsMatch ? metaKeywordsMatch[1].split(',').map(k => k.trim()).filter(k => k) : []
  
  // Extract H1s (max 5)
  const h1Matches = html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)
  const h1s = [...h1Matches].slice(0, 5).map(m => cleanHtmlText(m[1]))
  
  // Extract H2s (max 10)
  const h2Matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)
  const h2s = [...h2Matches].slice(0, 10).map(m => cleanHtmlText(m[1]))
  
  // Extract H3s (max 10)
  const h3Matches = html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)
  const h3s = [...h3Matches].slice(0, 10).map(m => cleanHtmlText(m[1]))
  
  // Extract body content (remove scripts, styles, nav, footer, header)
  let bodyContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  // Limit body content
  bodyContent = bodyContent.substring(0, 5000)
  
  // Calculate word count
  const wordCount = bodyContent.split(/\s+/).filter(w => w.length > 2).length
  
  // Extract links
  const linkMatches = html.matchAll(/<a[^>]*href=["']([^"'#]*)["'][^>]*>/gi)
  const links = [...linkMatches].map(m => m[1]).filter(l => l && l.length > 1)
  
  // Separate internal and external links
  const internalLinks = links.filter(l => l.startsWith('/') || l.includes(extractDomain(html))).slice(0, 20)
  const externalLinks = links.filter(l => l.startsWith('http') && !l.includes(extractDomain(html))).slice(0, 20)
  
  // Extract keywords from content (simple frequency analysis)
  const keywords = extractKeywordsFromContent(bodyContent, title, metaDescription).slice(0, 15)

  return {
    title,
    metaDescription,
    keywords: [...new Set([...metaKeywords, ...keywords])],
    h1s,
    h2s,
    h3s,
    bodyContent,
    wordCount,
    internalLinks,
    externalLinks
  }
}

function extractStructuredData(html) {
  const results = {
    hasOrganization: false,
    hasLocalBusiness: false,
    hasFAQ: false,
    hasProduct: false,
    hasBreadcrumb: false,
    hasArticle: false,
    hasPerson: false,
    schemas: []
  }
  
  // Find all JSON-LD blocks
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1])
      const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]
      
      types.forEach(type => {
        if (type) {
          results.schemas.push(type)
          if (type.toLowerCase().includes('organization')) results.hasOrganization = true
          if (type.toLowerCase().includes('localbusiness')) results.hasLocalBusiness = true
          if (type.toLowerCase().includes('faq')) results.hasFAQ = true
          if (type.toLowerCase().includes('product')) results.hasProduct = true
          if (type.toLowerCase().includes('breadcrumb')) results.hasBreadcrumb = true
          if (type.toLowerCase().includes('article')) results.hasArticle = true
          if (type.toLowerCase().includes('person')) results.hasPerson = true
        }
      })
    } catch (e) {
      // Invalid JSON-LD, skip
    }
  }
  
  // Check for Open Graph tags
  results.hasOG = /<meta[^>]*property=["']og:/i.test(html)
  
  // Check for Twitter Cards
  results.hasTwitterCard = /<meta[^>]*name=["']twitter:/i.test(html)
  
  return results
}

function analyzeContent(parsed, html) {
  const analysis = {
    score: 0,
    issues: [],
    strengths: []
  }
  
  // Title analysis
  if (!parsed.title) {
    analysis.issues.push({ type: 'critical', message: 'Geen title tag gevonden' })
  } else if (parsed.title.length < 30) {
    analysis.issues.push({ type: 'warning', message: `Title te kort (${parsed.title.length} karakters, min 30)` })
  } else if (parsed.title.length > 60) {
    analysis.issues.push({ type: 'warning', message: `Title te lang (${parsed.title.length} karakters, max 60)` })
  } else {
    analysis.strengths.push('Title heeft goede lengte')
    analysis.score += 10
  }
  
  // Meta description analysis
  if (!parsed.metaDescription) {
    analysis.issues.push({ type: 'critical', message: 'Geen meta description gevonden' })
  } else if (parsed.metaDescription.length < 100) {
    analysis.issues.push({ type: 'warning', message: `Meta description te kort (${parsed.metaDescription.length} karakters)` })
  } else if (parsed.metaDescription.length > 160) {
    analysis.issues.push({ type: 'warning', message: `Meta description te lang (${parsed.metaDescription.length} karakters)` })
  } else {
    analysis.strengths.push('Meta description heeft goede lengte')
    analysis.score += 10
  }
  
  // H1 analysis
  if (parsed.h1s.length === 0) {
    analysis.issues.push({ type: 'critical', message: 'Geen H1 heading gevonden' })
  } else if (parsed.h1s.length > 1) {
    analysis.issues.push({ type: 'warning', message: `Meerdere H1 headings (${parsed.h1s.length})` })
    analysis.score += 5
  } else {
    analysis.strengths.push('Precies 1 H1 heading')
    analysis.score += 10
  }
  
  // H2 analysis
  if (parsed.h2s.length === 0) {
    analysis.issues.push({ type: 'warning', message: 'Geen H2 headings gevonden' })
  } else if (parsed.h2s.length >= 3) {
    analysis.strengths.push(`Goede heading structuur (${parsed.h2s.length} H2s)`)
    analysis.score += 10
  } else {
    analysis.score += 5
  }
  
  // Word count analysis
  if (parsed.wordCount < 300) {
    analysis.issues.push({ type: 'warning', message: `Weinig content (${parsed.wordCount} woorden)` })
  } else if (parsed.wordCount >= 1000) {
    analysis.strengths.push(`Uitgebreide content (${parsed.wordCount} woorden)`)
    analysis.score += 15
  } else {
    analysis.score += 10
  }
  
  // Internal links
  if (parsed.internalLinks.length >= 5) {
    analysis.strengths.push(`Goede interne linking (${parsed.internalLinks.length} links)`)
    analysis.score += 10
  } else if (parsed.internalLinks.length === 0) {
    analysis.issues.push({ type: 'warning', message: 'Geen interne links gevonden' })
  }
  
  // HTTPS check
  const hasHttps = /<link[^>]*rel=["']canonical["'][^>]*href=["']https:/i.test(html)
  if (hasHttps) {
    analysis.strengths.push('HTTPS actief')
    analysis.score += 5
  }
  
  // Mobile viewport
  const hasMobileViewport = /<meta[^>]*name=["']viewport["']/i.test(html)
  if (hasMobileViewport) {
    analysis.strengths.push('Mobile viewport ingesteld')
    analysis.score += 5
  } else {
    analysis.issues.push({ type: 'warning', message: 'Geen mobile viewport meta tag' })
  }
  
  // Check for FAQ content patterns
  const hasFAQContent = /(?:veelgestelde\s*vragen|faq|vraag\s*en\s*antwoord|q\s*&\s*a)/i.test(html)
  if (hasFAQContent) {
    analysis.strengths.push('FAQ content gedetecteerd')
    analysis.score += 10
  }
  
  // Normalize score to 100
  analysis.score = Math.min(100, analysis.score)
  
  return analysis
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function cleanHtmlText(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function extractDomain(html) {
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)
  if (canonicalMatch) {
    try {
      return new URL(canonicalMatch[1]).hostname
    } catch (e) {}
  }
  return ''
}

function extractKeywordsFromContent(content, title, metaDescription) {
  // Combine important text
  const text = `${title} ${title} ${metaDescription} ${content}`.toLowerCase()
  
  // Split into words
  const words = text.split(/\s+/)
  
  // Count word frequency (filter common Dutch/English stop words)
  const stopWords = new Set([
    'de', 'het', 'een', 'en', 'van', 'in', 'is', 'op', 'te', 'dat', 'die', 'voor',
    'met', 'zijn', 'naar', 'aan', 'er', 'om', 'dan', 'of', 'door', 'over', 'bij',
    'ook', 'na', 'worden', 'uit', 'nog', 'wel', 'geen', 'meer', 'als', 'tot', 'wordt',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'only', 'own', 'same', 'than', 'too', 'very',
    'can', 'will', 'just', 'should', 'now', 'www', 'http', 'https', 'com', 'nl'
  ])
  
  const wordCount = {}
  words.forEach(word => {
    // Only count words with 4+ characters that aren't stop words
    if (word.length >= 4 && !stopWords.has(word) && /^[a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+$/i.test(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1
    }
  })
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word)
}
