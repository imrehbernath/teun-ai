import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 120

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY // Add to .env

// ============================================
// i18n MESSAGES
// ============================================
const MESSAGES = {
  nl: {
    noHttps: 'Website gebruikt geen HTTPS - kritiek beveiligingsprobleem',
    noViewport: 'Geen viewport meta tag - niet mobiel-vriendelijk',
    lcpSlow: (val) => `LCP te traag (${val}s, max 2.5s)`,
    fidHigh: (val) => `FID te hoog (${val}ms, max 100ms)`,
    clsHigh: (val) => `CLS te hoog (${val}, max 0.1)`,
    noLazyLoad: 'Geen lazy loading voor afbeeldingen',
    noDeferAsync: 'Geen deferred/async scripts',
    noCanonical: 'Geen canonical tag - risico op duplicate content',
    noindex: 'Pagina staat op noindex - niet zichtbaar voor zoekmachines',
    noTitle: 'Geen title tag gevonden - kritiek SEO probleem',
    titleVeryShort: (len) => `Title veel te kort (${len} karakters, minimaal 40)`,
    titleShort: (len) => `Title te kort (${len} karakters, optimaal 40-60)`,
    titleLong: (len) => `Title te lang (${len} karakters, wordt afgekapt in Google)`,
    noMeta: 'Geen meta description - gemiste kans voor CTR',
    metaShort: (len) => `Meta description te kort (${len} karakters, minimaal 140)`,
    metaCouldBeLonger: (len) => `Meta description kan langer (${len} karakters, optimaal 140-155)`,
    metaLong: (len) => `Meta description te lang (${len} karakters, wordt afgekapt)`,
    noH1: 'Geen H1 heading - kritiek voor SEO',
    multiH1: (count) => `${count} H1 headings gevonden (gebruik precies 1)`,
    fewH2: 'Te weinig H2 subheadings voor goede structuur',
    contentCouldBeMore: (count) => `Content kan uitgebreider (${count} woorden, 1000+ aanbevolen voor GEO)`,
    contentTooLittle: (count) => `Te weinig content (${count} woorden, minimaal 800 voor SEO)`,
    contentVeryLittle: (count) => `Zeer weinig content (${count} woorden) - moeilijk te ranken`,
    noImages: 'Geen afbeeldingen - voeg visuele content toe',
    imagesMissingAlt: (missing, total) => `${missing} van ${total} afbeeldingen missen alt tekst`,
    mostImagesMissingAlt: (missing, total) => `Meeste afbeeldingen (${missing}/${total}) missen alt tekst`,
    fewInternalLinks: 'Weinig interne links - verbeter site structuur',
    noInternalLinks: 'Geen interne links gevonden',
    noJsonLd: 'Geen JSON-LD structured data - mist AI-readability',
    noOrgSchema: 'Geen Organization/LocalBusiness schema',
    noFaqSchema: 'Geen FAQ Schema - belangrijke GEO optimalisatie',
    noBreadcrumb: 'Geen breadcrumb navigatie',
    missingOgTags: (tags) => `Ontbrekende OG tags: ${tags}`,
    noTwitterCard: 'Geen Twitter Card tags',
    noFaqContent: 'Geen FAQ of Q&A content - belangrijk voor AI visibility',
    noDirectAnswers: 'Content mist directe, AI-vriendelijke antwoorden',
    noLocalInfo: 'Geen lokale informatie (stad/regio) - belangrijk voor lokale AI queries',
    noExpertise: 'Geen auteur of expertise informatie - vermindert E-E-A-T',
    noDate: 'Geen publicatie/update datum zichtbaar',
    scoreExcellent: 'Uitstekend',
    scoreGood: 'Goed',
    scoreMedium: 'Matig',
    scoreInsufficient: 'Onvoldoende',
    scoreBad: 'Slecht',
    scoreError: 'Fout',
    cannotLoad: 'Kon pagina niet laden - controleer of de URL toegankelijk is',
  },
  en: {
    noHttps: 'Website does not use HTTPS - critical security issue',
    noViewport: 'No viewport meta tag - not mobile-friendly',
    lcpSlow: (val) => `LCP too slow (${val}s, max 2.5s)`,
    fidHigh: (val) => `FID too high (${val}ms, max 100ms)`,
    clsHigh: (val) => `CLS too high (${val}, max 0.1)`,
    noLazyLoad: 'No lazy loading for images',
    noDeferAsync: 'No deferred/async scripts',
    noCanonical: 'No canonical tag - risk of duplicate content',
    noindex: 'Page is set to noindex - not visible to search engines',
    noTitle: 'No title tag found - critical SEO issue',
    titleVeryShort: (len) => `Title way too short (${len} characters, minimum 40)`,
    titleShort: (len) => `Title too short (${len} characters, optimal 40-60)`,
    titleLong: (len) => `Title too long (${len} characters, gets truncated in Google)`,
    noMeta: 'No meta description - missed opportunity for CTR',
    metaShort: (len) => `Meta description too short (${len} characters, minimum 140)`,
    metaCouldBeLonger: (len) => `Meta description could be longer (${len} characters, optimal 140-155)`,
    metaLong: (len) => `Meta description too long (${len} characters, gets truncated)`,
    noH1: 'No H1 heading - critical for SEO',
    multiH1: (count) => `${count} H1 headings found (use exactly 1)`,
    fewH2: 'Too few H2 subheadings for good structure',
    contentCouldBeMore: (count) => `Content could be more extensive (${count} words, 1000+ recommended for GEO)`,
    contentTooLittle: (count) => `Too little content (${count} words, minimum 800 for SEO)`,
    contentVeryLittle: (count) => `Very little content (${count} words) - hard to rank`,
    noImages: 'No images - add visual content',
    imagesMissingAlt: (missing, total) => `${missing} of ${total} images missing alt text`,
    mostImagesMissingAlt: (missing, total) => `Most images (${missing}/${total}) missing alt text`,
    fewInternalLinks: 'Few internal links - improve site structure',
    noInternalLinks: 'No internal links found',
    noJsonLd: 'No JSON-LD structured data - missing AI-readability',
    noOrgSchema: 'No Organization/LocalBusiness schema',
    noFaqSchema: 'No FAQ Schema - important GEO optimization',
    noBreadcrumb: 'No breadcrumb navigation',
    missingOgTags: (tags) => `Missing OG tags: ${tags}`,
    noTwitterCard: 'No Twitter Card tags',
    noFaqContent: 'No FAQ or Q&A content - important for AI visibility',
    noDirectAnswers: 'Content lacks direct, AI-friendly answers',
    noLocalInfo: 'No local information (city/region) - important for local AI queries',
    noExpertise: 'No author or expertise information - reduces E-E-A-T',
    noDate: 'No publication/update date visible',
    scoreExcellent: 'Excellent',
    scoreGood: 'Good',
    scoreMedium: 'Moderate',
    scoreInsufficient: 'Insufficient',
    scoreBad: 'Poor',
    scoreError: 'Error',
    cannotLoad: 'Could not load page - check if the URL is accessible',
  }
}

function getMsg(locale) { return MESSAGES[locale] || MESSAGES['nl'] }


// ============================================
// LANGUAGE DETECTION
// ============================================
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


// ============================================
// ROBUST PAGE SCRAPER (identiek aan /api/geo-audit)
// ============================================
// Two-step strategy:
//   1. 'basic': render=true + country_code + desktop (~5 credits)
//   2. 'ultra': basic + premium + ultra_premium (75 credits)
//
// Returns: { html, method, warnings, success, reason, length }
// Caller MUST check success before using html.

const MIN_HTML_LENGTH = 2000
const CHALLENGE_SIGNATURES = [
  'cf-browser-verification',
  'just a moment',
  'one moment, please',
  'one moment please',
  'attention required',
  'access denied',
  'wordfence',
  'ddos-guard',
  'ddos guard',
  'please turn javascript on',
  'enable javascript and cookies',
  'checking your browser'
]

function looksBroken(html) {
  if (!html || typeof html !== 'string') return 'empty-body'
  if (html.length < MIN_HTML_LENGTH) return `too-short-${html.length}`
  if (!/<\/html>/i.test(html)) return 'no-closing-html'
  if (!/<title[^>]*>[^<]+<\/title>/i.test(html)) return 'no-title-tag'

  // Title-based challenge detection (DDoS-Guard, Cloudflare, etc.)
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    const title = titleMatch[1].trim().toLowerCase()
    const challengeTitles = [
      'one moment, please...',
      'one moment please',
      'just a moment',
      'just a moment...',
      'attention required',
      'access denied',
      'please wait',
      'checking your browser'
    ]
    if (challengeTitles.some(t => title === t || title.startsWith(t))) {
      return `challenge-title-${title.slice(0, 30).replace(/\s+/g, '-')}`
    }
  }

  const low = html.toLowerCase().slice(0, 10000)
  for (const sig of CHALLENGE_SIGNATURES) {
    if (low.includes(sig)) return `challenge-${sig.replace(/\s+/g, '-')}`
  }
  return null
}

function pickCountryCode(url) {
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

async function fetchViaScraperApi(url, { ultra = false } = {}) {
  const params = new URLSearchParams({
    api_key: SCRAPER_API_KEY,
    url,
    country_code: pickCountryCode(url),
    device_type: 'desktop'
  })

  if (ultra) {
    // Max-quality config — residential IPs + ultra_premium bypass.
    // No render: DDoS-Guard's JS challenge loops infinitely with rendering on.
    params.set('premium', 'true')
    params.set('ultra_premium', 'true')
    params.set('follow_redirect', 'false')
  } else {
    params.set('render', 'true')
  }

  const scraperUrl = `https://api.scraperapi.com/?${params.toString()}`
  const timeout = ultra ? 70000 : 45000

  const res = await fetch(scraperUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(timeout)
  })

  if (!res.ok) {
    throw new Error(`ScraperAPI ${res.status} (ultra=${ultra})`)
  }

  return await res.text()
}

async function scrapeWebsite(url) {
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  const attempts = [
    { ultra: false, label: 'basic' },
    { ultra: true,  label: 'ultra' }
  ]

  const warnings = []
  let lastHtml = null
  let lastReason = null

  for (const attempt of attempts) {
    try {
      console.log(`[GEO Scan] scrape ${attempt.label} → ${normalizedUrl}`)
      const html = await fetchViaScraperApi(normalizedUrl, attempt)
      const reason = looksBroken(html)

      if (!reason) {
        console.log(`[GEO Scan] ✅ scrape ${attempt.label} ok (${html.length} chars)`)
        return { html, method: attempt.label, warnings, success: true, length: html.length }
      }

      warnings.push(`${attempt.label}: ${reason} (${html?.length || 0} chars)`)
      console.warn(`[GEO Scan] scrape ${attempt.label} broken: ${reason}`)
      lastHtml = html
      lastReason = reason
    } catch (err) {
      warnings.push(`${attempt.label}: ${err.message}`)
      console.warn(`[GEO Scan] scrape ${attempt.label} threw: ${err.message}`)
    }
  }

  return {
    html: lastHtml,
    method: 'failed',
    warnings,
    success: false,
    reason: lastReason || 'all-attempts-failed',
    length: lastHtml?.length || 0
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

function analyzeHtml(html, url, coreWebVitals = null, locale = 'nl') {
  const msg = getMsg(locale)
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
  else issues.push(msg.noHttps)
  
  // Viewport (2 punten)
  checks.viewport = hasMatch(/viewport/)
  if (checks.viewport) techScore += 2
  else issues.push(msg.noViewport)
  
  // Core Web Vitals (9 punten) - if available
  if (coreWebVitals) {
    // LCP (3 punten)
    checks.lcp_good = coreWebVitals.lcpGood
    if (coreWebVitals.lcpGood) techScore += 3
    else issues.push(msg.lcpSlow(Math.round(coreWebVitals.lcp / 1000 * 10) / 10))
    
    // FID/INP (3 punten)
    checks.fid_good = coreWebVitals.fidGood
    if (coreWebVitals.fidGood) techScore += 3
    else issues.push(msg.fidHigh(Math.round(coreWebVitals.fid)))
    
    // CLS (3 punten)
    checks.cls_good = coreWebVitals.clsGood
    if (coreWebVitals.clsGood) techScore += 3
    else issues.push(msg.clsHigh(coreWebVitals.cls?.toFixed(3)))
    
    checks.cwv_score = coreWebVitals.performanceScore
  } else {
    // Fallback checks zonder API
    const hasLazyLoad = hasMatch(/loading=["']lazy["']|data-src/i)
    const hasDeferAsync = hasMatch(/defer|async/i)
    checks.performance_hints = hasLazyLoad && hasDeferAsync
    if (hasLazyLoad) techScore += 2
    if (hasDeferAsync) techScore += 2
    if (!hasLazyLoad) issues.push(msg.noLazyLoad)
    if (!hasDeferAsync) issues.push(msg.noDeferAsync)
  }
  
  // Canonical (2 punten)
  checks.has_canonical = hasMatch(/<link[^>]*rel=["']canonical["']/i)
  if (checks.has_canonical) techScore += 2
  else issues.push(msg.noCanonical)
  
  // Robots/indexeerbaar (2 punten)
  const hasNoindex = hasMatch(/noindex/i)
  checks.indexable = !hasNoindex
  if (checks.indexable) techScore += 2
  else issues.push(msg.noindex)
  
  scores.technical = { score: techScore, max: techMax, percentage: Math.round((techScore / techMax) * 100) }

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
    issues.push(msg.noTitle)
  } else if (titleLength < 30) {
    issues.push(msg.titleVeryShort(titleLength))
    contentScore += 1
  } else if (titleLength < 40) {
    issues.push(msg.titleShort(titleLength))
    contentScore += 2
  } else if (titleLength > 65) {
    issues.push(msg.titleLong(titleLength))
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
    issues.push(msg.noMeta)
  } else if (descLength < 100) {
    issues.push(msg.metaShort(descLength))
    contentScore += 1
  } else if (descLength < 140) {
    issues.push(msg.metaCouldBeLonger(descLength))
    contentScore += 2
  } else if (descLength > 160) {
    issues.push(msg.metaLong(descLength))
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
    issues.push(msg.noH1)
  } else if (h1Count > 1) {
    issues.push(msg.multiH1(h1Count))
    contentScore += 2
  } else {
    contentScore += 2
  }
  
  if (h2Count >= 3) contentScore += 2
  else if (h2Count >= 2) contentScore += 1
  else issues.push(msg.fewH2)
  
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
    issues.push(msg.contentCouldBeMore(wordCount))
  } else if (wordCount >= 500) {
    contentScore += 2
    issues.push(msg.contentTooLittle(wordCount))
  } else {
    contentScore += 1
    issues.push(msg.contentVeryLittle(wordCount))
  }
  
  // Afbeeldingen (4 punten)
  const imgCount = countMatches(/<img/gi)
  const imgAltCount = countMatches(/<img[^>]*alt=["'][^"']+["']/gi)
  const imgEmptyAlt = countMatches(/<img[^>]*alt=["']["']/gi)
  
  checks.has_images = imgCount > 0
  checks.all_images_have_alt = imgCount === 0 || imgAltCount === imgCount
  
  if (imgCount === 0) {
    issues.push(msg.noImages)
    contentScore += 1
  } else {
    const altPercentage = imgAltCount / imgCount
    if (altPercentage === 1) contentScore += 4
    else if (altPercentage >= 0.8) contentScore += 3
    else if (altPercentage >= 0.5) {
      contentScore += 2
      issues.push(msg.imagesMissingAlt(imgCount - imgAltCount, imgCount))
    } else {
      contentScore += 1
      issues.push(msg.mostImagesMissingAlt(imgCount - imgAltCount, imgCount))
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
    issues.push(msg.fewInternalLinks)
  } else {
    issues.push(msg.noInternalLinks)
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
  else issues.push(msg.noJsonLd)
  
  // Organization/LocalBusiness (4 punten)
  checks.has_org_schema = /Organization|LocalBusiness|Corporation|ProfessionalService/i.test(jsonLdContent)
  if (checks.has_org_schema) structuredScore += 4
  else if (checks.has_jsonld) issues.push(msg.noOrgSchema)
  
  // FAQ Schema (4 punten) - belangrijk voor AI
  checks.has_faq_schema = /FAQPage|Question.*acceptedAnswer/i.test(jsonLdContent)
  if (checks.has_faq_schema) structuredScore += 4
  else issues.push(msg.noFaqSchema)
  
  // Product/Service schema (3 punten)
  checks.has_product_schema = /Product|Service|Offer/i.test(jsonLdContent)
  if (checks.has_product_schema) structuredScore += 3
  
  // Breadcrumb (3 punten)
  checks.has_breadcrumb = /BreadcrumbList/i.test(jsonLdContent) || hasMatch(/class=["'][^"']*breadcrumb/i)
  if (checks.has_breadcrumb) structuredScore += 3
  else issues.push(msg.noBreadcrumb)
  
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
  if (missingOg.length > 0) issues.push(msg.missingOgTags(missingOg.join(', ')))
  if (!hasTwitterCard) issues.push(msg.noTwitterCard)
  
  scores.social = { score: socialScore, max: socialMax, percentage: Math.round((socialScore / socialMax) * 100) }

  // ============================================
  // AI/GEO SIGNALEN (Max 25 punten)
  // Bilingual: patterns detect both NL and EN signals
  // ============================================
  let geoScore = 0
  const geoMax = 25
  const isEn = locale === 'en'
  
  // FAQ content aanwezig (5 punten)
  const hasFaqSection = hasMatch(/veelgestelde vragen|faq|vraag en antwoord|frequently asked|common questions|q\s*&\s*a/i)
  const questionCount = (textContent.match(/\?/g) || []).length
  checks.has_faq_content = hasFaqSection || questionCount >= 5
  
  if (hasFaqSection && questionCount >= 3) geoScore += 5
  else if (hasFaqSection || questionCount >= 5) geoScore += 3
  else if (questionCount >= 2) geoScore += 1
  else issues.push(msg.noFaqContent)
  
  // Directe antwoorden (5 punten) — bilingual patterns
  const hasDirectAnswerNl = hasMatch(/<(p|div|span)[^>]*>[^<]{0,50}(ja|nee|dit is|het antwoord|kort gezegd|samengevat)/i)
  const hasDirectAnswerEn = hasMatch(/<(p|div|span)[^>]*>[^<]{0,50}(yes|no|this is|the answer|in short|in summary|simply put|basically)/i)
  const hasHowToNl = hasMatch(/stap\s*\d|stap-voor-stap|zo werkt|hoe.*:/i)
  const hasHowToEn = hasMatch(/step\s*\d|step-by-step|how it works|how to/i)
  const hasDefinitionNl = hasMatch(/(is een|betekent|wordt gedefinieerd als|houdt in dat)/i)
  const hasDefinitionEn = hasMatch(/(is a|means|is defined as|refers to|consists of)/i)
  
  const hasDirectAnswer = hasDirectAnswerNl || hasDirectAnswerEn
  const hasHowTo = hasHowToNl || hasHowToEn
  const hasDefinition = hasDefinitionNl || hasDefinitionEn
  checks.has_direct_answers = hasDirectAnswer || hasHowTo || hasDefinition
  
  if (hasDirectAnswer && hasHowTo) geoScore += 5
  else if (hasDirectAnswer || hasHowTo || hasDefinition) geoScore += 3
  else issues.push(msg.noDirectAnswers)
  
  // Lokale informatie (4 punten) — bilingual city/region detection
  const dutchCities = /amsterdam|rotterdam|den haag|the hague|utrecht|eindhoven|groningen|tilburg|almere|breda|nijmegen|haarlem|arnhem|delft|leiden/i
  const hasCity = dutchCities.test(textContent)
  const hasPostcode = /\b\d{4}\s*[A-Z]{2}\b/.test(textContent) // NL format
  const hasRegionNl = /nederland|netherlands|noord-holland|zuid-holland|brabant|gelderland|limburg|regio|region/i.test(textContent)
  const hasAddress = /street|straat|avenue|laan|weg|plein|square|road/i.test(textContent)
  checks.has_local_info = hasCity || hasPostcode || hasRegionNl || hasAddress
  
  if (hasCity && (hasPostcode || hasRegionNl)) geoScore += 4
  else if (hasCity || hasPostcode || hasAddress) geoScore += 2
  else issues.push(msg.noLocalInfo)
  
  // Auteur/expertise (4 punten) — bilingual
  const hasAuthorNl = hasMatch(/geschreven door|auteur|door\s+[A-Z][a-z]+\s+[A-Z]/i)
  const hasAuthorEn = hasMatch(/written by|author|by\s+[A-Z][a-z]+\s+[A-Z]/i)
  const hasCredentialsNl = hasMatch(/jaar ervaring|gecertificeerd|specialist|expert|diploma|bevoegd/i)
  const hasCredentialsEn = hasMatch(/years?.?\s*(of\s+)?experience|certified|specialist|expert|diploma|qualified|accredited/i)
  const hasAboutAuthor = hasMatch(/over de auteur|about the author|author bio|written by/i)
  
  const hasAuthor = hasAuthorNl || hasAuthorEn
  const hasCredentials = hasCredentialsNl || hasCredentialsEn
  checks.has_expertise_signals = hasAuthor || hasCredentials
  
  if (hasAuthor && hasCredentials) geoScore += 4
  else if (hasAuthor || hasCredentials || hasAboutAuthor) geoScore += 2
  else issues.push(msg.noExpertise)
  
  // Datum/actualiteit (3 punten) — bilingual month names + patterns
  const hasDateNl = hasMatch(/\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}/i)
  const hasDateEn = hasMatch(/\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i)
  const hasDateEnAlt = hasMatch(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i)
  const hasDateIso = hasMatch(/\d{4}-\d{2}-\d{2}/)
  const hasDateSlash = hasMatch(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/)
  const hasUpdatedNl = hasMatch(/bijgewerkt|laatst gewijzigd|gepubliceerd/i)
  const hasUpdatedEn = hasMatch(/updated|last modified|published|posted on/i)
  
  const hasDate = hasDateNl || hasDateEn || hasDateEnAlt || hasDateIso || hasDateSlash
  const hasUpdated = hasUpdatedNl || hasUpdatedEn
  checks.has_date = hasDate || hasUpdated
  
  if (hasDate && hasUpdated) geoScore += 3
  else if (hasDate || hasUpdated) geoScore += 2
  else issues.push(msg.noDate)
  
  // Conversationele stijl (4 punten) — bilingual
  const hasConversationalNl = hasMatch(/(wij|we|ons|onze|u |je |jouw )/i)
  const hasConversationalEn = hasMatch(/\b(we|us|our|you|your|you're|we're)\b/i)
  const hasConversational = hasConversationalNl || hasConversationalEn
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
  let scoreLabel = msg.scoreBad
  if (finalScore >= 80) scoreLabel = msg.scoreExcellent
  else if (finalScore >= 65) scoreLabel = msg.scoreGood
  else if (finalScore >= 50) scoreLabel = msg.scoreMedium
  else if (finalScore >= 35) scoreLabel = msg.scoreInsufficient
  
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
    
    const { url, locale = 'nl', companyName = '' } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 })
    }
    
    // Start both requests in parallel
    const [scrape, coreWebVitals] = await Promise.all([
      scrapeWebsite(url),
      getCoreWebVitals(url)
    ])

    if (!scrape.success) {
      console.error('[GEO Scan] ❌ scrape failed:', {
        url,
        reason: scrape.reason,
        attempts: scrape.warnings
      })
      return NextResponse.json({
        checklist: {},
        score: 0,
        scoreLabel: getMsg(locale).scoreError,
        issues: [getMsg(locale).cannotLoad],
        scanned: false
      })
    }

    const html = scrape.html
    console.log(`[GEO Scan] scraped via ${scrape.method} (${scrape.length} chars)`)
    
    // Detect page language
    const pageLang = detectPageLanguage(html, url)
    console.log(`[GEO Scan] Page language: ${pageLang} (UI: ${locale}) — ${url}`)
    
    // Technical analysis — use UI locale for messages, pageLang for content pattern detection
    const results = analyzeHtml(html, url, coreWebVitals, locale)
    
    // Extract content for Claude analysis
    const extractedContent = extractContentForClaude(html, url)
    
    // Claude custom advice (fire in parallel, don't block if it fails)
    let customAdvice = []
    try {
      customAdvice = await getClaudeAdvice(extractedContent, results, url, locale, companyName)
    } catch (e) {
      console.error('[GEO Scan] Claude advice error:', e.message)
    }
    
    return NextResponse.json({
      ...results,
      customAdvice,
      detectedLanguage: pageLang,
      scanned: true
    })
    
  } catch (error) {
    console.error('GEO scan error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================
// EXTRACT CONTENT FOR CLAUDE
// ============================================
function extractContentForClaude(html, url) {
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''
  
  // Meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
  const metaDesc = metaMatch ? metaMatch[1].trim() : ''
  
  // Headings (first 20)
  const headings = []
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gis
  let hMatch
  while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 20) {
    const text = hMatch[2].replace(/<[^>]+>/g, '').trim()
    if (text) headings.push({ level: parseInt(hMatch[1]), text })
  }
  
  // Body text (first 3000 chars for Claude)
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)
  
  // Schema types
  const schemaTypes = []
  const schemaRegex = /"@type"\s*:\s*"([^"]+)"/g
  let sMatch
  while ((sMatch = schemaRegex.exec(html)) !== null) {
    if (!schemaTypes.includes(sMatch[1])) schemaTypes.push(sMatch[1])
  }
  
  // Links
  const allLinks = (html.match(/<a[^>]*href=["'][^"']+["']/gi) || []).length
  let hostname = ''
  try { hostname = new URL(url).hostname } catch {}
  const internalLinks = hostname ? (html.match(new RegExp(`href=["'][^"']*${hostname.replace(/\./g, '\\.')}[^"']*["']`, 'gi')) || []).length : 0
  const externalLinks = Math.max(0, allLinks - internalLinks)
  
  // Word count
  const wordCount = bodyText.split(/\s+/).length
  
  // FAQ content detection
  const hasFaq = /<[^>]*(?:faq|veelgestelde|frequently)/i.test(html)
  
  return { title, metaDesc, headings, bodyText, schemaTypes, internalLinks, externalLinks, wordCount, hasFaq, url }
}

// ============================================
// CLAUDE CUSTOM ADVICE
// ============================================
async function getClaudeAdvice(content, scanResults, url, locale, companyName) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  const isNL = locale === 'nl'
  const failedChecks = Object.entries(scanResults.checklist || {})
    .filter(([, v]) => v === false)
    .map(([k]) => k)
  
  const prompt = isNL
    ? `Je bent een GEO (Generative Engine Optimization) en E-E-A-T specialist. Analyseer deze pagina en geef OP MAAT advies.

URL: ${url}
Bedrijf: ${companyName || 'onbekend'}
Title: ${content.title}
Meta description: ${content.metaDesc || 'ONTBREEKT'}
Woordentelling: ${content.wordCount}
Schema types: ${content.schemaTypes.join(', ') || 'Geen'}
Heeft FAQ: ${content.hasFaq ? 'Ja' : 'Nee'}
Interne links: ${content.internalLinks}

Koppen:
${content.headings.map(h => `H${h.level}: ${h.text}`).join('\n')}

Content (eerste deel):
${content.bodyText}

Failed checks: ${failedChecks.join(', ')}
Score: ${scanResults.score}/100

Geef PRECIES 6 adviezen als JSON array. VERPLICHTE verdeling:
- Minimaal 2x categorie "eeat" (Experience, Expertise, Authority, Trust)
- Minimaal 1x categorie "content"
- Minimaal 1x categorie "structured_data"
- Minimaal 1x categorie "geo"

Per advies:
- "title": actietitel, max 6 woorden, begin met werkwoord
- "action": concrete actie in 1-2 zinnen, SPECIFIEK voor deze pagina. Noem de echte paginatitel, koppen of content die je ziet.
- "example": KORT voorbeeld, max 3 regels. Bij meta description: geef de tekst. Bij FAQ: geef 3 vragen als opsomming. Bij schema: noem alleen het type en belangrijkste velden, GEEN volledig JSON-LD blok. Bij E-E-A-T: geef 1-2 zinnen voorbeeldtekst.
- "why": 1 zin waarom AI-platformen dit belangrijk vinden
- "priority": "critical", "high", "medium" of "low"
- "category": "eeat", "content", "technical", "structured_data" of "geo"

BELANGRIJK:
- Bij E-E-A-T: adviseer concreet over auteursinformatie, ervaringsjaren, certificeringen, klantreviews, KvK-vermelding
- Bij content: verwijs naar specifieke koppen/tekst die je ZIET op de pagina
- Bij schema: geef kopieerbaar JSON-LD voorbeeld
- Bij FAQ: stel 3-5 vragen voor die passen bij de dienst/product op DEZE pagina
- Alle tekst in het NEDERLANDS

Antwoord ALLEEN met een JSON array, geen markdown, geen backticks.`
    : `You are a GEO (Generative Engine Optimization) and E-E-A-T specialist. Analyze this page and give CUSTOM advice.

URL: ${url}
Company: ${companyName || 'unknown'}
Title: ${content.title}
Meta description: ${content.metaDesc || 'MISSING'}
Word count: ${content.wordCount}
Schema types: ${content.schemaTypes.join(', ') || 'None'}
Has FAQ: ${content.hasFaq ? 'Yes' : 'No'}
Internal links: ${content.internalLinks}

Headings:
${content.headings.map(h => `H${h.level}: ${h.text}`).join('\n')}

Content (first part):
${content.bodyText}

Failed checks: ${failedChecks.join(', ')}
Score: ${scanResults.score}/100

Give EXACTLY 6 pieces of advice as JSON array. MANDATORY distribution:
- At least 2x category "eeat" (Experience, Expertise, Authority, Trust)
- At least 1x category "content"
- At least 1x category "structured_data"
- At least 1x category "geo"

Per advice:
- "title": action title, max 6 words, start with verb
- "action": concrete action in 1-2 sentences, SPECIFIC to this page. Reference the actual page title, headings or content you see.
- "example": SHORT example, max 3 lines. For meta description: give the text. For FAQ: give 3 questions as bullet list. For schema: name the type and key fields only, NO full JSON-LD block. For E-E-A-T: give 1-2 sentences of example text.
- "why": 1 sentence why AI platforms care about this
- "priority": "critical", "high", "medium" or "low"
- "category": "eeat", "content", "technical", "structured_data" or "geo"

IMPORTANT:
- For E-E-A-T: advise concretely about author info, years of experience, certifications, customer reviews, business registration
- For content: reference specific headings/text you SEE on the page
- For schema: give copyable JSON-LD example
- For FAQ: suggest 3-5 questions that fit the service/product on THIS page
- All text in ENGLISH

Reply ONLY with a JSON array, no markdown, no backticks.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: isNL
      ? 'Je bent een GEO specialist. Geef ALLEEN een JSON array terug. Geen markdown, geen uitleg, geen backticks.'
      : 'You are a GEO specialist. Return ONLY a JSON array. No markdown, no explanation, no backticks.',
    messages: [{ role: 'user', content: prompt }]
  })

  const text = message.content[0].text.trim()
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  
  try {
    const advice = JSON.parse(jsonStr)
    if (Array.isArray(advice)) return advice.slice(0, 7)
  } catch (e) {
    console.error('[GEO Scan] Claude JSON parse error:', e.message)
  }
  
  return []
}
