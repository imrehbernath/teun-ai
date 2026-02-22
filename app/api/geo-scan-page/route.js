import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  else issues.push(msg.noFaqContent)
  
  // Directe antwoorden (5 punten)
  const hasDirectAnswer = hasMatch(/<(p|div|span)[^>]*>[^<]{0,50}(ja|nee|dit is|het antwoord|kort gezegd|samengevat)/i)
  const hasHowTo = hasMatch(/stap\s*\d|stap-voor-stap|zo werkt|hoe.*:/i)
  const hasDefinition = hasMatch(/(is een|betekent|wordt gedefinieerd als|houdt in dat)/i)
  checks.has_direct_answers = hasDirectAnswer || hasHowTo || hasDefinition
  
  if (hasDirectAnswer && hasHowTo) geoScore += 5
  else if (hasDirectAnswer || hasHowTo || hasDefinition) geoScore += 3
  else issues.push(msg.noDirectAnswers)
  
  // Lokale informatie (4 punten)
  const dutchCities = /amsterdam|rotterdam|den haag|utrecht|eindhoven|groningen|tilburg|almere|breda|nijmegen/i
  const hasCity = dutchCities.test(textContent)
  const hasPostcode = /\b\d{4}\s*[A-Z]{2}\b/.test(textContent)
  const hasRegion = /nederland|noord-holland|zuid-holland|brabant|gelderland|limburg|regio/i.test(textContent)
  checks.has_local_info = hasCity || hasPostcode || hasRegion
  
  if (hasCity && (hasPostcode || hasRegion)) geoScore += 4
  else if (hasCity || hasPostcode) geoScore += 2
  else issues.push(msg.noLocalInfo)
  
  // Auteur/expertise (4 punten)
  const hasAuthor = hasMatch(/geschreven door|auteur|door\s+[A-Z][a-z]+\s+[A-Z]/i)
  const hasCredentials = hasMatch(/jaar ervaring|gecertificeerd|specialist|expert|diploma|bevoegd/i)
  const hasAboutAuthor = hasMatch(/over de auteur|author|written by/i)
  checks.has_expertise_signals = hasAuthor || hasCredentials
  
  if (hasAuthor && hasCredentials) geoScore += 4
  else if (hasAuthor || hasCredentials || hasAboutAuthor) geoScore += 2
  else issues.push(msg.noExpertise)
  
  // Datum/actualiteit (3 punten)
  const hasDate = hasMatch(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}/i)
  const hasUpdated = hasMatch(/bijgewerkt|updated|laatst gewijzigd|gepubliceerd/i)
  checks.has_date = hasDate || hasUpdated
  
  if (hasDate && hasUpdated) geoScore += 3
  else if (hasDate || hasUpdated) geoScore += 2
  else issues.push(msg.noDate)
  
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
    
    const { url, locale = 'nl' } = await request.json()
    
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
        scoreLabel: getMsg(locale).scoreError,
        issues: [getMsg(locale).cannotLoad],
        scanned: false
      })
    }
    
    // Analyze with Core Web Vitals data
    const results = analyzeHtml(html, url, coreWebVitals, locale)
    
    return NextResponse.json({
      ...results,
      scanned: true
    })
    
  } catch (error) {
    console.error('GEO scan error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
