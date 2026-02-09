import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY // Add to .env

async function scrapeWebsite(url) {
  try {
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}&render=false`
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(25000)
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

// Core Web Vitals via PageSpeed Insights API
async function getCoreWebVitals(url) {
  if (!PAGESPEED_API_KEY) {
    return null
  }
  
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PAGESPEED_API_KEY}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo`
    
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    const metrics = data.lighthouseResult?.audits
    const categories = data.lighthouseResult?.categories
    
    return {
      // Core Web Vitals
      lcp: metrics?.['largest-contentful-paint']?.numericValue || null, // ms
      fid: metrics?.['max-potential-fid']?.numericValue || null, // ms
      cls: metrics?.['cumulative-layout-shift']?.numericValue || null,
      fcp: metrics?.['first-contentful-paint']?.numericValue || null,
      ttfb: metrics?.['server-response-time']?.numericValue || null,
      
      // Scores (0-100)
      performanceScore: Math.round((categories?.performance?.score || 0) * 100),
      accessibilityScore: Math.round((categories?.accessibility?.score || 0) * 100),
      bestPracticesScore: Math.round((categories?.['best-practices']?.score || 0) * 100),
      seoScore: Math.round((categories?.seo?.score || 0) * 100),
      
      // Specific checks
      hasHttps: metrics?.['is-on-https']?.score === 1,
      hasViewport: metrics?.['viewport']?.score === 1,
      hasMetaDescription: metrics?.['meta-description']?.score === 1,
      imagesOptimized: metrics?.['uses-optimized-images']?.score === 1,
      textCompression: metrics?.['uses-text-compression']?.score === 1,
      
      // Pass/fail thresholds
      lcpGood: (metrics?.['largest-contentful-paint']?.numericValue || 9999) <= 2500,
      fidGood: (metrics?.['max-potential-fid']?.numericValue || 9999) <= 100,
      clsGood: (metrics?.['cumulative-layout-shift']?.numericValue || 1) <= 0.1,
    }
  } catch (error) {
    console.error('PageSpeed API error:', error)
    return null
  }
}

function analyzeHtml(html, url, coreWebVitals = null) {
  const checks = {}
  const issues = []
  const scores = {} // Partial scores per category
  
  // Helper functions
  const countMatches = (regex) => (html.match(regex) || []).length
  const hasMatch = (regex) => regex.test(html)
  
  // Clean text content
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordCount = textContent.split(/\s+/).length

  // ============================================
  // TECHNISCH (Max 20 punten)
  // ============================================
  let techScore = 0
  const techMax = 20
  
  // HTTPS (3 punten)
  checks.https = url.startsWith('https')
  if (checks.https) techScore += 3
  else issues.push('Website gebruikt geen HTTPS - kritiek beveiligingsprobleem')
  
  // Viewport (2 punten)
  checks.viewport = hasMatch(/viewport/)
  if (checks.viewport) techScore += 2
  else issues.push('Geen viewport meta tag - niet mobiel-vriendelijk')
  
  // Core Web Vitals (9 punten) - if available
  if (coreWebVitals) {
    // LCP (3 punten)
    checks.lcp_good = coreWebVitals.lcpGood
    if (coreWebVitals.lcpGood) techScore += 3
    else issues.push(`LCP te traag (${Math.round(coreWebVitals.lcp / 1000 * 10) / 10}s, max 2.5s)`)
    
    // FID/INP (3 punten)
    checks.fid_good = coreWebVitals.fidGood
    if (coreWebVitals.fidGood) techScore += 3
    else issues.push(`FID te hoog (${Math.round(coreWebVitals.fid)}ms, max 100ms)`)
    
    // CLS (3 punten)
    checks.cls_good = coreWebVitals.clsGood
    if (coreWebVitals.clsGood) techScore += 3
    else issues.push(`CLS te hoog (${coreWebVitals.cls?.toFixed(3)}, max 0.1)`)
    
    checks.cwv_score = coreWebVitals.performanceScore
  } else {
    // Fallback checks zonder API
    const hasLazyLoad = hasMatch(/loading=["']lazy["']|data-src/i)
    const hasDeferAsync = hasMatch(/defer|async/i)
    checks.performance_hints = hasLazyLoad && hasDeferAsync
    if (hasLazyLoad) techScore += 2
    if (hasDeferAsync) techScore += 2
    if (!hasLazyLoad) issues.push('Geen lazy loading voor afbeeldingen')
    if (!hasDeferAsync) issues.push('Geen deferred/async scripts')
  }
  
  // Canonical (2 punten)
  checks.has_canonical = hasMatch(/<link[^>]*rel=["']canonical["']/i)
  if (checks.has_canonical) techScore += 2
  else issues.push('Geen canonical tag - risico op duplicate content')
  
  // Robots/indexeerbaar (2 punten)
  const hasNoindex = hasMatch(/noindex/i)
  checks.indexable = !hasNoindex
  if (checks.indexable) techScore += 2
  else issues.push('Pagina staat op noindex - niet zichtbaar voor zoekmachines')
  
  scores.technisch = { score: techScore, max: techMax, percentage: Math.round((techScore / techMax) * 100) }

  // ============================================
  // CONTENT KWALITEIT (Max 25 punten)
  // ============================================
  let contentScore = 0
  const contentMax = 25
  
  // Title tag (4 punten) - strenger: moet 40-60 karakters zijn
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const titleLength = titleMatch ? titleMatch[1].trim().length : 0
  checks.title_exists = !!titleMatch
  checks.title_optimal = titleLength >= 40 && titleLength <= 60
  
  if (!titleMatch) {
    issues.push('Geen title tag gevonden - kritiek SEO probleem')
  } else if (titleLength < 30) {
    issues.push(`Title veel te kort (${titleLength} karakters, minimaal 40)`)
    contentScore += 1
  } else if (titleLength < 40) {
    issues.push(`Title te kort (${titleLength} karakters, optimaal 40-60)`)
    contentScore += 2
  } else if (titleLength > 65) {
    issues.push(`Title te lang (${titleLength} karakters, wordt afgekapt in Google)`)
    contentScore += 2
  } else if (titleLength > 60) {
    contentScore += 3
  } else {
    contentScore += 4 // Perfect
  }
  
  // Meta description (4 punten) - strenger: moet 140-155 karakters
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
  const descLength = metaDescMatch ? metaDescMatch[1].trim().length : 0
  checks.meta_exists = !!metaDescMatch
  checks.meta_optimal = descLength >= 140 && descLength <= 155
  
  if (!metaDescMatch) {
    issues.push('Geen meta description - gemiste kans voor CTR')
  } else if (descLength < 100) {
    issues.push(`Meta description te kort (${descLength} karakters, minimaal 140)`)
    contentScore += 1
  } else if (descLength < 140) {
    issues.push(`Meta description kan langer (${descLength} karakters, optimaal 140-155)`)
    contentScore += 2
  } else if (descLength > 160) {
    issues.push(`Meta description te lang (${descLength} karakters, wordt afgekapt)`)
    contentScore += 2
  } else {
    contentScore += 4
  }
  
  // Heading structuur (5 punten)
  const h1Count = countMatches(/<h1[^>]*>/gi)
  const h2Count = countMatches(/<h2[^>]*>/gi)
  const h3Count = countMatches(/<h3[^>]*>/gi)
  
  checks.has_single_h1 = h1Count === 1
  checks.has_h2s = h2Count >= 2
  checks.has_h3s = h3Count >= 1
  
  if (h1Count === 0) {
    issues.push('Geen H1 heading - kritiek voor SEO')
  } else if (h1Count > 1) {
    issues.push(`${h1Count} H1 headings gevonden (gebruik precies 1)`)
    contentScore += 2
  } else {
    contentScore += 2
  }
  
  if (h2Count >= 3) contentScore += 2
  else if (h2Count >= 2) contentScore += 1
  else issues.push('Te weinig H2 subheadings voor goede structuur')
  
  if (h3Count >= 2) contentScore += 1
  else if (h3Count >= 1) contentScore += 0.5
  
  // Content lengte (5 punten) - strenger: 1000+ woorden voor goede GEO
  checks.word_count = wordCount
  
  if (wordCount >= 1500) {
    contentScore += 5
  } else if (wordCount >= 1000) {
    contentScore += 4
  } else if (wordCount >= 800) {
    contentScore += 3
    issues.push(`Content kan uitgebreider (${wordCount} woorden, 1000+ aanbevolen voor GEO)`)
  } else if (wordCount >= 500) {
    contentScore += 2
    issues.push(`Te weinig content (${wordCount} woorden, minimaal 800 voor SEO)`)
  } else {
    contentScore += 1
    issues.push(`Zeer weinig content (${wordCount} woorden) - moeilijk te ranken`)
  }
  
  // Afbeeldingen (4 punten)
  const imgCount = countMatches(/<img/gi)
  const imgAltCount = countMatches(/<img[^>]*alt=["'][^"']+["']/gi)
  const imgEmptyAlt = countMatches(/<img[^>]*alt=["']["']/gi)
  
  checks.has_images = imgCount > 0
  checks.all_images_have_alt = imgCount === 0 || imgAltCount === imgCount
  
  if (imgCount === 0) {
    issues.push('Geen afbeeldingen - voeg visuele content toe')
    contentScore += 1
  } else {
    const altPercentage = imgAltCount / imgCount
    if (altPercentage === 1) contentScore += 4
    else if (altPercentage >= 0.8) contentScore += 3
    else if (altPercentage >= 0.5) {
      contentScore += 2
      issues.push(`${imgCount - imgAltCount} van ${imgCount} afbeeldingen missen alt tekst`)
    } else {
      contentScore += 1
      issues.push(`Meeste afbeeldingen (${imgCount - imgAltCount}/${imgCount}) missen alt tekst`)
    }
  }
  
  // Interne links (3 punten)
  const internalLinks = countMatches(/<a[^>]*href=["']\/[^"']*["']/gi) + 
                        countMatches(new RegExp(`<a[^>]*href=["']https?://${url.replace(/https?:\/\//, '').split('/')[0]}`, 'gi'))
  checks.has_internal_links = internalLinks >= 3
  
  if (internalLinks >= 5) contentScore += 3
  else if (internalLinks >= 3) contentScore += 2
  else if (internalLinks >= 1) {
    contentScore += 1
    issues.push('Weinig interne links - verbeter site structuur')
  } else {
    issues.push('Geen interne links gevonden')
  }
  
  scores.content = { score: contentScore, max: contentMax, percentage: Math.round((contentScore / contentMax) * 100) }

  // ============================================
  // STRUCTURED DATA (Max 20 punten)
  // ============================================
  let structuredScore = 0
  const structuredMax = 20
  
  // JSON-LD aanwezig (4 punten)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
  const jsonLdContent = jsonLdMatches.join(' ')
  checks.has_jsonld = jsonLdMatches.length > 0
  
  if (checks.has_jsonld) structuredScore += 4
  else issues.push('Geen JSON-LD structured data - mist AI-readability')
  
  // Organization/LocalBusiness (4 punten)
  checks.has_org_schema = /Organization|LocalBusiness|Corporation|ProfessionalService/i.test(jsonLdContent)
  if (checks.has_org_schema) structuredScore += 4
  else if (checks.has_jsonld) issues.push('Geen Organization/LocalBusiness schema')
  
  // FAQ Schema (4 punten) - belangrijk voor AI
  checks.has_faq_schema = /FAQPage|Question.*acceptedAnswer/i.test(jsonLdContent)
  if (checks.has_faq_schema) structuredScore += 4
  else issues.push('Geen FAQ Schema - belangrijke GEO optimalisatie')
  
  // Product/Service schema (3 punten)
  checks.has_product_schema = /Product|Service|Offer/i.test(jsonLdContent)
  if (checks.has_product_schema) structuredScore += 3
  
  // Breadcrumb (3 punten)
  checks.has_breadcrumb = /BreadcrumbList/i.test(jsonLdContent) || hasMatch(/class=["'][^"']*breadcrumb/i)
  if (checks.has_breadcrumb) structuredScore += 3
  else issues.push('Geen breadcrumb navigatie')
  
  // Article/WebPage schema (2 punten)
  checks.has_article_schema = /Article|WebPage|BlogPosting/i.test(jsonLdContent)
  if (checks.has_article_schema) structuredScore += 2
  
  scores.structured = { score: structuredScore, max: structuredMax, percentage: Math.round((structuredScore / structuredMax) * 100) }

  // ============================================
  // SOCIAL & OG TAGS (Max 10 punten)
  // ============================================
  let socialScore = 0
  const socialMax = 10
  
  const hasOgTitle = hasMatch(/property=["']og:title["']/i)
  const hasOgDesc = hasMatch(/property=["']og:description["']/i)
  const hasOgImage = hasMatch(/property=["']og:image["']/i)
  const hasOgType = hasMatch(/property=["']og:type["']/i)
  const hasTwitterCard = hasMatch(/name=["']twitter:card["']/i)
  const hasTwitterTitle = hasMatch(/name=["']twitter:title["']/i)
  
  checks.og_title = hasOgTitle
  checks.og_description = hasOgDesc
  checks.og_image = hasOgImage
  checks.twitter_card = hasTwitterCard
  
  if (hasOgTitle) socialScore += 2
  if (hasOgDesc) socialScore += 2
  if (hasOgImage) socialScore += 2
  if (hasOgType) socialScore += 1
  if (hasTwitterCard) socialScore += 2
  if (hasTwitterTitle) socialScore += 1
  
  const missingOg = []
  if (!hasOgTitle) missingOg.push('og:title')
  if (!hasOgDesc) missingOg.push('og:description')
  if (!hasOgImage) missingOg.push('og:image')
  if (missingOg.length > 0) issues.push(`Ontbrekende OG tags: ${missingOg.join(', ')}`)
  if (!hasTwitterCard) issues.push('Geen Twitter Card tags')
  
  scores.social = { score: socialScore, max: socialMax, percentage: Math.round((socialScore / socialMax) * 100) }

  // ============================================
  // AI/GEO SIGNALEN (Max 25 punten)
  // ============================================
  let geoScore = 0
  const geoMax = 25
  
  // FAQ content aanwezig (5 punten)
  const hasFaqSection = hasMatch(/veelgestelde vragen|faq|vraag en antwoord|frequently asked/i)
  const questionCount = (textContent.match(/\?/g) || []).length
  checks.has_faq_content = hasFaqSection || questionCount >= 5
  
  if (hasFaqSection && questionCount >= 3) geoScore += 5
  else if (hasFaqSection || questionCount >= 5) geoScore += 3
  else if (questionCount >= 2) geoScore += 1
  else issues.push('Geen FAQ of Q&A content - belangrijk voor AI visibility')
  
  // Directe antwoorden (5 punten)
  const hasDirectAnswer = hasMatch(/<(p|div|span)[^>]*>[^<]{0,50}(ja|nee|dit is|het antwoord|kort gezegd|samengevat)/i)
  const hasHowTo = hasMatch(/stap\s*\d|stap-voor-stap|zo werkt|hoe.*:/i)
  const hasDefinition = hasMatch(/(is een|betekent|wordt gedefinieerd als|houdt in dat)/i)
  checks.has_direct_answers = hasDirectAnswer || hasHowTo || hasDefinition
  
  if (hasDirectAnswer && hasHowTo) geoScore += 5
  else if (hasDirectAnswer || hasHowTo || hasDefinition) geoScore += 3
  else issues.push('Content mist directe, AI-vriendelijke antwoorden')
  
  // Lokale informatie (4 punten)
  const dutchCities = /amsterdam|rotterdam|den haag|utrecht|eindhoven|groningen|tilburg|almere|breda|nijmegen/i
  const hasCity = dutchCities.test(textContent)
  const hasPostcode = /\b\d{4}\s*[A-Z]{2}\b/.test(textContent)
  const hasRegion = /nederland|noord-holland|zuid-holland|brabant|gelderland|limburg|regio/i.test(textContent)
  checks.has_local_info = hasCity || hasPostcode || hasRegion
  
  if (hasCity && (hasPostcode || hasRegion)) geoScore += 4
  else if (hasCity || hasPostcode) geoScore += 2
  else issues.push('Geen lokale informatie (stad/regio) - belangrijk voor lokale AI queries')
  
  // Auteur/expertise (4 punten)
  const hasAuthor = hasMatch(/geschreven door|auteur|door\s+[A-Z][a-z]+\s+[A-Z]/i)
  const hasCredentials = hasMatch(/jaar ervaring|gecertificeerd|specialist|expert|diploma|bevoegd/i)
  const hasAboutAuthor = hasMatch(/over de auteur|author|written by/i)
  checks.has_expertise_signals = hasAuthor || hasCredentials
  
  if (hasAuthor && hasCredentials) geoScore += 4
  else if (hasAuthor || hasCredentials || hasAboutAuthor) geoScore += 2
  else issues.push('Geen auteur of expertise informatie - vermindert E-E-A-T')
  
  // Datum/actualiteit (3 punten)
  const hasDate = hasMatch(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}/i)
  const hasUpdated = hasMatch(/bijgewerkt|updated|laatst gewijzigd|gepubliceerd/i)
  checks.has_date = hasDate || hasUpdated
  
  if (hasDate && hasUpdated) geoScore += 3
  else if (hasDate || hasUpdated) geoScore += 2
  else issues.push('Geen publicatie/update datum zichtbaar')
  
  // Conversationele stijl (4 punten)
  const hasConversational = hasMatch(/(wij|we|ons|onze|u |je |jouw )/i)
  const hasQuestions = questionCount >= 3
  const hasLists = countMatches(/<(ul|ol)[^>]*>/gi) >= 2
  checks.conversational_style = hasConversational && (hasQuestions || hasLists)
  
  if (hasConversational && hasQuestions && hasLists) geoScore += 4
  else if (hasConversational && (hasQuestions || hasLists)) geoScore += 2
  else if (hasConversational) geoScore += 1
  
  scores.geo = { score: geoScore, max: geoMax, percentage: Math.round((geoScore / geoMax) * 100) }

  // ============================================
  // FINAL SCORING
  // ============================================
  const totalScore = techScore + contentScore + structuredScore + socialScore + geoScore
  const totalMax = techMax + contentMax + structuredMax + socialMax + geoMax // 100
  const finalScore = Math.round((totalScore / totalMax) * 100)
  
  // Bepaal score label
  let scoreLabel = 'Slecht'
  if (finalScore >= 80) scoreLabel = 'Uitstekend'
  else if (finalScore >= 65) scoreLabel = 'Goed'
  else if (finalScore >= 50) scoreLabel = 'Matig'
  else if (finalScore >= 35) scoreLabel = 'Onvoldoende'
  
  return {
    checklist: checks,
    score: finalScore,
    scoreLabel,
    scores, // Breakdown per category
    issues: issues.slice(0, 12), // Max 12 issues
    wordCount,
    title: titleMatch ? titleMatch[1].trim() : null,
    passedChecks: Object.values(checks).filter(v => v === true).length,
    totalChecks: Object.keys(checks).filter(k => typeof checks[k] === 'boolean').length,
    coreWebVitals: coreWebVitals ? {
      lcp: coreWebVitals.lcp,
      fid: coreWebVitals.fid,
      cls: coreWebVitals.cls,
      performanceScore: coreWebVitals.performanceScore,
      seoScore: coreWebVitals.seoScore
    } : null
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
    
    // Start both requests in parallel
    const [html, coreWebVitals] = await Promise.all([
      scrapeWebsite(url),
      getCoreWebVitals(url)
    ])
    
    if (!html) {
      return NextResponse.json({ 
        checklist: {},
        score: 0,
        scoreLabel: 'Fout',
        issues: ['Kon pagina niet laden - controleer of de URL toegankelijk is'],
        scanned: false
      })
    }
    
    // Analyze with Core Web Vitals data
    const results = analyzeHtml(html, url, coreWebVitals)
    
    return NextResponse.json({
      ...results,
      scanned: true
    })
    
  } catch (error) {
    console.error('GEO scan error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
