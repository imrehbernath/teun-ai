// app/api/v1/page/scan/route.js
// ============================================
// GEO SCAN v3 — FULL GEO AUDIT ENGINE
// ScraperAPI + Technical Analysis + Parallel Perplexity + Competitors
// ============================================

import { NextResponse } from 'next/server'
import { validateApiKey, checkScanLimit, incrementScanCount, supabase } from '@/lib/wp-plugin/auth'
import Anthropic from '@anthropic-ai/sdk'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 90
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })

    const scanLimit = await checkScanLimit(auth.data.keyId, auth.data.plan, auth.data.limits.scans_per_month)
    if (!scanLimit.allowed) return NextResponse.json({ error: 'Monthly scan limit reached.', used: scanLimit.used, limit: scanLimit.limit }, { status: 429 })

    const body = await request.json()
    const { page_id, prompts, platforms, language, site_name: wpSiteName, brand_name: brandName, location: wpLocation, brand_perception: doBrandPerception } = body
    if (!page_id || !prompts || prompts.length === 0) return NextResponse.json({ error: 'page_id and prompts are required' }, { status: 400 })

    const [websiteId, ...urlParts] = page_id.split(':')
    const pageUrl = urlParts.join(':')
    const connection = auth.data.connections.find(c => c.website_id === websiteId)
    if (!connection) return NextResponse.json({ error: 'Website not found' }, { status: 403 })

    const siteUrl = connection.site_url || ''
    const siteDomain = extractDomain(siteUrl)
    const brandVariants = buildBrandVariants(siteDomain, connection.site_name, wpSiteName, brandName)
    const scanId = `scan_${Date.now()}`
    console.log(`🔍 Scan ${scanId} | ${pageUrl} | Brands: ${JSON.stringify(brandVariants)}`)

    // Get prompts from Supabase
    const { data: pagePrompts } = await supabase.from('page_prompts').select('id, prompt_text').eq('website_id', websiteId).eq('page_url', pageUrl)
    if (!pagePrompts || pagePrompts.length === 0) return NextResponse.json({ error: 'No prompts found. Run analyze first.' }, { status: 400 })

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: SCRAPE + ROBOTS + LLMS + PERPLEXITY + BRAND PERCEPTION (all parallel)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const domain = (() => { try { return new URL(pageUrl).origin } catch { return '' } })()

    // Determine brand for perception scan
    const brandForPerception = brandName || wpSiteName || siteDomain.replace(/\.(nl|com|eu|org|net)$/i, '').replace(/[-_.]/g, ' ')
    const locationForPrompts = wpLocation || null

    // Brand perception prompts (only when requested)
    const brandPerceptionPrompts = (doBrandPerception && brandForPerception) ? [
      `Wat zijn ervaringen met ${brandForPerception}? Is het betrouwbaar?`,
      `${brandForPerception} reviews en klachten`,
      `Is ${brandForPerception}${locationForPrompts ? ' in ' + locationForPrompts : ''} een goed bedrijf? Bereikbaarheid en service?`,
    ] : []
    
    if (doBrandPerception) console.log(`🏷️ Brand perception enabled for: ${brandForPerception}`)

    // Run EVERYTHING in parallel
    const allPromises = [
      scrapePage(pageUrl),
      fetchTextFile(`${domain}/robots.txt`),
      fetchTextFile(`${domain}/llms.txt`),
      ...pagePrompts.map(p => scanWithPerplexity(p.prompt_text, brandVariants).catch(() => ({
        mentioned: false, position: null, snippet: null, competitors: [], mentionCount: 0, fullResponse: ''
      }))),
      ...brandPerceptionPrompts.map(p => scanBrandPerception(p, brandForPerception).catch(() => ({
        prompt: p, sentiment: 'unknown', mentioned: false, response: '', signals: []
      }))),
    ]

    const allResults = await Promise.all(allPromises)
    const html = allResults[0]
    const robotsTxt = allResults[1]
    const llmsTxt = allResults[2]
    const perplexityResults = allResults.slice(3, 3 + pagePrompts.length)
    const brandPerceptionResults = allResults.slice(3 + pagePrompts.length)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: ANALYZE HTML (rule-based, instant)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const extracted = html ? extractContent(html) : null
    // Override location: settings ALWAYS wins over scraped
    if (extracted && wpLocation) {
      extracted.detectedLocation = wpLocation
    }
    const technicalChecks = extracted ? analyzeTechnical(extracted, robotsTxt, llmsTxt) : null

    // Claude content analysis (parallel with Perplexity processing, no extra wait)
    const contentAnalysisPromise = extracted ? analyzeContentWithClaude(extracted, pageUrl) : Promise.resolve(null)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: PROCESS PERPLEXITY RESULTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const scanResults = []
    for (let i = 0; i < pagePrompts.length; i++) {
      const prompt = pagePrompts[i]
      const result = perplexityResults[i]
      
      await supabase.from('page_scan_results').delete().eq('page_prompt_id', prompt.id).eq('platform', 'perplexity')
      await supabase.from('page_scan_results').insert({
        page_prompt_id: prompt.id, platform: 'perplexity',
        mentioned: result.mentioned, position: result.position,
        snippet: result.snippet, competitors: result.competitors,
      })

      scanResults.push({
        prompt_id: prompt.id,
        prompt_text: prompt.prompt_text,
        platform: 'perplexity',
        mentioned: result.mentioned,
        position: result.position,
        snippet: result.snippet,
        competitors: result.competitors,
        mentionCount: result.mentionCount,
        fullResponse: result.fullResponse,
      })
    }

    await incrementScanCount(auth.data.keyId)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: GEO SCORE + RECOMMENDATIONS + BRAND PERCEPTION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Await Claude content analysis (was running in background during Perplexity scans)
    const contentAnalysis = await contentAnalysisPromise

    const mentionedResults = scanResults.filter(r => r.mentioned)
    const mentionRate = mentionedResults.length / Math.max(1, scanResults.length)

    // Score combines technical + Perplexity visibility
    const techScore = technicalChecks ? technicalChecks.score : 50
    const visibilityScore = Math.round(mentionRate * 100)
    const geoScore = Math.round(techScore * 0.4 + visibilityScore * 0.6)

    // All competitors across prompts
    const allCompetitors = scanResults.flatMap(r => r.competitors || [])
    const competitorCounts = {}
    allCompetitors.forEach(c => { competitorCounts[c] = (competitorCounts[c] || 0) + 1 })
    const topCompetitors = Object.entries(competitorCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

    const recommendations = generateRecommendations(scanResults, technicalChecks, extracted, mentionRate, language || 'nl')

    console.log(`✅ ${scanId} done → GEO ${geoScore} | Tech ${techScore} | Vis ${visibilityScore} | ${mentionedResults.length}/${scanResults.length} mentioned`)

    return NextResponse.json({
      scan_id: scanId,
      status: 'complete',
      geo_score: geoScore,
      results: scanResults.map(r => ({
        prompt_id: r.prompt_id,
        prompt_text: r.prompt_text,
        platform: r.platform,
        mentioned: r.mentioned,
        position: r.position,
        snippet: r.snippet,
        competitors: r.competitors,
        mentionCount: r.mentionCount,
        response_excerpt: r.fullResponse ? r.fullResponse.substring(0, 400) : null,
      })),
      technical: technicalChecks,
      page_info: extracted ? {
        title: extracted.title,
        description: extracted.description,
        wordCount: extracted.wordCount,
        headingCount: extracted.headings.length,
        h1Count: extracted.headings.filter(h => h.level === 'h1').length,
        h2Count: extracted.headings.filter(h => h.level === 'h2').length,
        schemaTypes: extracted.structuredDataTypes,
        hasFAQ: extracted.hasFAQ,
        hasFAQSchema: extracted.structuredDataTypes.includes('FAQPage'),
        hasLocalBusiness: extracted.structuredDataTypes.includes('LocalBusiness'),
        hasNoindex: extracted.hasNoindex,
        detectedLocation: extracted.detectedLocation,
        imageCount: extracted.imageCount,
        imagesWithAlt: extracted.imagesWithAlt,
        hasOgImage: extracted.hasOgImage,
        hasRobotsTxt: !!robotsTxt,
        hasLlmsTxt: !!llmsTxt,
      } : null,
      competitors: topCompetitors.map(([name, count]) => ({ name, count })),
      recommendations,
      content_analysis: contentAnalysis,
      brand_perception: brandPerceptionResults.length > 0 ? analyzeBrandPerception(brandPerceptionResults, brandForPerception) : null,
      scans_remaining: scanLimit.limit === -1 ? 'unlimited' : (scanLimit.limit - scanLimit.used - 1),
    })

  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCRAPER API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function scrapePage(url) {
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }
  const urlObj = new URL(normalizedUrl)
  const hasWww = urlObj.hostname.startsWith('www.')
  const wwwUrl = hasWww ? normalizedUrl : normalizedUrl.replace('://', '://www.')

  // ── Attempt 1: Direct fetch (FREE, no ScraperAPI credits) ──
  for (const tryUrl of [normalizedUrl, wwwUrl]) {
    try {
      console.log(`🌐 Direct fetch: ${tryUrl}`)
      const r = await fetch(tryUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })
      if (r.ok) {
        const html = await r.text()
        if (!isGarbagePage(html) && html.length > 500) {
          console.log(`✅ Direct fetch OK: ${tryUrl} (${html.length} chars)`)
          return html
        }
        console.log(`⚠️ Direct fetch got garbage/thin for ${tryUrl}`)
      } else {
        console.log(`⚠️ Direct fetch HTTP ${r.status} for ${tryUrl}`)
      }
    } catch (e) { console.log(`⚠️ Direct fetch failed: ${tryUrl}: ${e.message}`) }
  }

  // ── Attempt 2: ScraperAPI premium (25 credits, highest success) ──
  if (!SCRAPER_API_KEY) { console.log('⚠️ No SCRAPER_API_KEY'); return null }
  for (const tryUrl of [normalizedUrl, wwwUrl]) {
    try {
      console.log(`🔗 ScraperAPI premium: ${tryUrl}`)
      const r = await fetch(`http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(tryUrl)}&render=true&premium=true&country_code=nl`, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(30000),
      })
      if (r.ok) {
        const html = await r.text()
        if (!isGarbagePage(html)) {
          console.log(`✅ ScraperAPI premium OK: ${tryUrl} (${html.length} chars)`)
          return html
        }
        console.log(`⚠️ ScraperAPI got garbage for ${tryUrl}`)
      } else {
        console.log(`⚠️ ScraperAPI HTTP ${r.status} for ${tryUrl}`)
      }
    } catch (e) { console.log(`⚠️ ScraperAPI failed: ${tryUrl}: ${e.message}`) }
  }

  console.log(`❌ All scrape attempts failed for ${url}`)
  return null
}

function isGarbagePage(html) {
  const lower = html.toLowerCase()
  const signals = [
    'checking your browser', 'just a moment', 'verify you are human',
    'cf-browser-verification', 'challenge-platform', '_cf_chl',
    'attention required', 'ddos protection', 'security check',
    'checking if the site connection is secure', 'please turn javascript on',
    'enable javascript and cookies', 'ray id',
    'access denied', 'bot protection', 'are you a robot',
    'domain is parked', 'this domain is for sale', 'buy this domain',
    'under construction', 'coming soon', 'website binnenkort beschikbaar',
  ]
  if (signals.some(s => lower.includes(s))) return true
  const hasH1 = /<h1[^>]*>/i.test(html)
  const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').trim()
  if (bodyText.length < 300 && !hasH1) return true
  return false
}

async function fetchTextFile(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TeunAI/1.0)' } })
    if (!r.ok) return null
    const t = await r.text()
    if (t.length > 10000 || t.includes('<!DOCTYPE') || t.includes('<html')) return null
    return t
  } catch { return null }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML CONTENT EXTRACTION (from GEO Audit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractContent(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? clean(titleMatch[1]) : ''

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i)
  const description = descMatch ? clean(descMatch[1]) : ''

  const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html)
  const hasNoindex = /<meta[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html)
    || /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)

  // Headings
  const headings = []
  const hRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi
  let m
  while ((m = hRegex.exec(html)) !== null) headings.push({ level: m[1].toLowerCase(), text: clean(m[2]) })

  // Body text (strip scripts/styles/nav/footer for word count)
  let bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 1).length

  // Full text INCLUDING footer for location detection
  let fullText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  // Structured Data
  const structuredData = []
  const structuredDataTypes = []
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim())
      structuredData.push(data)
      if (data['@type']) { const t = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]; structuredDataTypes.push(...t) }
      if (data['@graph']) data['@graph'].forEach(item => { if (item['@type']) { const t = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]; structuredDataTypes.push(...t) } })
    } catch {}
  }

  const hasFAQ = structuredDataTypes.includes('FAQPage') || /faq|veelgestelde vragen/i.test(html)
    || headings.some(h => /faq|vraag|vragen/i.test(h.text))

  // Images
  const imgRegex = /<img[^>]*>/gi
  let imageCount = 0, imagesWithAlt = 0
  while ((m = imgRegex.exec(html)) !== null) {
    imageCount++
    if (/alt=["'][^"']+["']/i.test(m[0])) imagesWithAlt++
  }

  // Location from full page
  const detectedLocation = detectLocation(fullText.toLowerCase())

  return {
    title, description, hasOgImage, hasNoindex, headings, bodyText: bodyText.substring(0, 3000),
    wordCount, structuredData, structuredDataTypes: [...new Set(structuredDataTypes)],
    hasFAQ, imageCount, imagesWithAlt, detectedLocation,
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TECHNICAL ANALYSIS (rule-based, from GEO Audit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function analyzeTechnical(ext, robotsTxt, llmsTxt) {
  const checks = []
  let score = 0, max = 0

  // Title
  max += 10
  if (ext.title && ext.title.length > 10) {
    if (ext.title.length <= 60) { checks.push({ name: 'Title tag', status: 'good', detail: `"${ext.title.substring(0, 50)}${ext.title.length > 50 ? '…' : ''}" (${ext.title.length} tekens)` }); score += 10 }
    else { checks.push({ name: 'Title tag', status: 'warning', detail: `Te lang: ${ext.title.length} tekens (max 60)` }); score += 5 }
  } else { checks.push({ name: 'Title tag', status: 'error', detail: 'Ontbreekt of te kort' }) }

  // Meta description
  max += 10
  if (ext.description && ext.description.length > 50) {
    if (ext.description.length <= 160) { checks.push({ name: 'Meta description', status: 'good', detail: `${ext.description.length} tekens` }); score += 10 }
    else { checks.push({ name: 'Meta description', status: 'warning', detail: `Te lang: ${ext.description.length} tekens` }); score += 5 }
  } else { checks.push({ name: 'Meta description', status: 'error', detail: 'Ontbreekt' }) }

  // Structured Data
  max += 15
  const basicTypes = ['WebPage', 'WebSite', 'CollectionPage', 'SearchAction', 'SiteNavigationElement', 'WPHeader', 'WPFooter', 'ImageObject']
  const valuableTypes = ext.structuredDataTypes.filter(t => !basicTypes.includes(t))
  if (valuableTypes.length >= 2) { checks.push({ name: 'Structured Data', status: 'good', detail: valuableTypes.join(', ') }); score += 15 }
  else if (valuableTypes.length === 1) { checks.push({ name: 'Structured Data', status: 'warning', detail: `Alleen ${valuableTypes[0]}` }); score += 8 }
  else if (ext.structuredDataTypes.length > 0) { checks.push({ name: 'Structured Data', status: 'warning', detail: 'Alleen basis-types' }); score += 4 }
  else { checks.push({ name: 'Structured Data', status: 'error', detail: 'Geen JSON-LD gevonden' }) }

  // FAQ Schema
  max += 10
  if (ext.structuredDataTypes.includes('FAQPage')) { checks.push({ name: 'FAQPage Schema', status: 'good', detail: 'Verhoogt AI-citatie kans' }); score += 10 }
  else if (ext.hasFAQ) { checks.push({ name: 'FAQPage Schema', status: 'warning', detail: 'FAQ-content gevonden, geen schema' }); score += 4 }
  else { checks.push({ name: 'FAQPage Schema', status: 'error', detail: 'Niet aanwezig' }) }

  // og:image
  max += 5
  if (ext.hasOgImage) { checks.push({ name: 'og:image', status: 'good', detail: 'Aanwezig' }); score += 5 }
  else { checks.push({ name: 'og:image', status: 'error', detail: 'Ontbreekt' }) }

  // Headings
  max += 10
  const h1 = ext.headings.filter(h => h.level === 'h1').length
  const h2 = ext.headings.filter(h => h.level === 'h2').length
  if (h1 === 1 && h2 >= 2) { checks.push({ name: 'Heading structuur', status: 'good', detail: `${h1}× H1, ${h2}× H2` }); score += 10 }
  else if (h1 >= 1) { checks.push({ name: 'Heading structuur', status: 'warning', detail: `${h1}× H1, ${h2}× H2` }); score += 5 }
  else { checks.push({ name: 'Heading structuur', status: 'error', detail: 'Geen H1' }) }

  // Content length
  max += 10
  if (ext.wordCount >= 800) { checks.push({ name: 'Content lengte', status: 'good', detail: `${ext.wordCount} woorden` }); score += 10 }
  else if (ext.wordCount >= 300) { checks.push({ name: 'Content lengte', status: 'warning', detail: `${ext.wordCount} woorden (min 800)` }); score += 5 }
  else { checks.push({ name: 'Content lengte', status: 'error', detail: `${ext.wordCount} woorden (te weinig)` }) }

  // robots.txt
  max += 10
  if (robotsTxt) {
    const bots = ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']
    const blocked = bots.filter(bot => new RegExp(`user-agent:\\s*${bot}[\\s\\S]*?disallow:\\s*\\/`, 'im').test(robotsTxt))
    if (blocked.length > 0) { checks.push({ name: 'robots.txt', status: 'error', detail: `Blokkeert: ${blocked.join(', ')}` }) }
    else { checks.push({ name: 'robots.txt', status: 'good', detail: 'AI-bots niet geblokkeerd' }); score += 10 }
  } else { checks.push({ name: 'robots.txt', status: 'warning', detail: 'Niet gevonden' }); score += 5 }

  // llms.txt
  max += 5
  if (llmsTxt) { checks.push({ name: 'llms.txt', status: 'good', detail: 'Aanwezig' }); score += 5 }
  else { checks.push({ name: 'llms.txt', status: 'warning', detail: 'Niet gevonden' }) }

  // Alt texts
  if (ext.imageCount > 0) {
    max += 5
    const pct = Math.round((ext.imagesWithAlt / ext.imageCount) * 100)
    if (pct >= 80) { checks.push({ name: 'Alt-teksten', status: 'good', detail: `${pct}% heeft alt-tekst` }); score += 5 }
    else if (pct >= 50) { checks.push({ name: 'Alt-teksten', status: 'warning', detail: `${pct}% (verbeter)` }); score += 2 }
    else { checks.push({ name: 'Alt-teksten', status: 'error', detail: `Slechts ${pct}%` }) }
  }

  // Noindex
  if (ext.hasNoindex) {
    checks.unshift({ name: 'Noindex', status: 'error', detail: 'Pagina wordt niet geïndexeerd!' })
  }

  // Rich snippets
  const richTypes = ['FAQPage', 'HowTo', 'Product', 'Recipe', 'Event', 'VideoObject', 'BreadcrumbList', 'Review', 'AggregateRating', 'LocalBusiness']
  const eligible = ext.structuredDataTypes.filter(t => richTypes.includes(t))
  if (eligible.length > 0) {
    max += 5
    checks.push({ name: 'Rich Snippets', status: 'good', detail: eligible.join(', ') }); score += 5
  }

  return { score: Math.round((score / max) * 100), checks, goodCount: checks.filter(c => c.status === 'good').length, warningCount: checks.filter(c => c.status === 'warning').length, errorCount: checks.filter(c => c.status === 'error').length }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERPLEXITY SCANNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function scanWithPerplexity(promptText, brandVariants) {
  if (!PERPLEXITY_API_KEY) throw new Error('No Perplexity key')
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'Je bent een behulpzame assistent die ALTIJD in het Nederlands antwoordt. Geef concrete bedrijfsnamen en aanbevelingen. Focus op Nederlandse, specifieke bedrijven en dienstverleners. Vermeld concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen of specialistische dienstverleners.' },
        { role: 'user', content: promptText }
      ],
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) throw new Error(`Perplexity ${response.status}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const contentLower = content.toLowerCase()

  let mentioned = false, matchedTerm = null, mentionCount = 0
  for (const v of brandVariants) {
    if (contentLower.includes(v)) {
      mentioned = true
      if (!matchedTerm) matchedTerm = v
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = content.match(new RegExp(esc, 'gi'))
      if (matches) mentionCount += matches.length
    }
  }

  let position = null
  if (mentioned) {
    const sentences = content.split(/[.!?]\s+/)
    for (let i = 0; i < sentences.length; i++) { if (brandVariants.some(v => sentences[i].toLowerCase().includes(v))) { position = i + 1; break } }
  }

  let snippet = null
  if (mentioned && matchedTerm) {
    const idx = contentLower.indexOf(matchedTerm)
    snippet = content.substring(Math.max(0, idx - 80), Math.min(content.length, idx + 180)).trim()
  }

  // Extract competitor names from bold text + numbered lists (not URLs)
  const competitors = extractCompetitorNames(content, brandVariants)

  console.log(`  ${mentioned ? '✅' : '❌'} "${promptText.substring(0, 50)}..." → ${mentioned ? `${mentionCount}x` : 'NOT found'}`)
  return { mentioned, position, snippet, competitors: competitors.slice(0, 5), mentionCount, fullResponse: content.substring(0, 600) }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRAND PERCEPTION SCANNER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function scanBrandPerception(prompt, brandName) {
  if (!PERPLEXITY_API_KEY) throw new Error('No Perplexity key')
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'Je bent een behulpzame assistent die ALTIJD in het Nederlands antwoordt. Geef eerlijke, gebalanceerde informatie over bedrijven.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) throw new Error(`Perplexity ${response.status}`)
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const lower = content.toLowerCase()

  // Detect if brand is mentioned
  const mentioned = brandName ? lower.includes(brandName.toLowerCase()) : false

  // Detect sentiment signals
  const signals = []
  const positiveWords = ['betrouwbaar', 'goed', 'uitstekend', 'professioneel', 'tevreden', 'aanrader', 'deskundig', 'snel', 'prettig', 'fijn', 'positief', 'hoge score', 'goede reviews', 'top', 'excellent']
  const negativeWords = ['klachten', 'slecht', 'onbetrouwbaar', 'negatief', 'problemen', 'teleurgesteld', 'ontevreden', 'langzaam', 'duur', 'niet bereikbaar', 'slechte service', 'oplichting', 'waarschuwing']
  const neutralWords = ['reviews', 'ervaringen', 'beoordelingen', 'meningen', 'gemiddeld']

  let posCount = 0, negCount = 0
  positiveWords.forEach(w => { if (lower.includes(w)) { posCount++; signals.push({ type: 'positive', word: w }) } })
  negativeWords.forEach(w => { if (lower.includes(w)) { negCount++; signals.push({ type: 'negative', word: w }) } })

  const sentiment = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : posCount > 0 ? 'mixed' : 'neutral'

  // Extract specific aspects
  const aspects = []
  if (/bereikba|contact|telefoon|bellen/i.test(content)) aspects.push('bereikbaarheid')
  if (/review|beoordeling|sterren|score|trustpilot|google reviews/i.test(content)) aspects.push('reviews')
  if (/klacht|probleem|negatief|teleurgesteld/i.test(content)) aspects.push('klachten')
  if (/service|klantenservice|helpdesk|support/i.test(content)) aspects.push('service')
  if (/openingstijd|geopend|open|beschikbaar/i.test(content)) aspects.push('openingstijden')
  if (/betrouwba|vertrouw|veilig|gecertificeerd/i.test(content)) aspects.push('betrouwbaarheid')
  if (/prijs|kost|betaalbaar|duur|goedkoop|tarief/i.test(content)) aspects.push('prijs')
  if (/snel|wachttijd|respons|reactietijd/i.test(content)) aspects.push('snelheid')

  console.log(`  🏷️ Brand: "${prompt.substring(0, 50)}..." → ${sentiment} (${posCount}+/${negCount}-)`)
  return { prompt, sentiment, mentioned, response: content.substring(0, 500), signals: signals.slice(0, 8), aspects, posCount, negCount }
}

function analyzeBrandPerception(results, brandName) {
  if (!results || results.length === 0) return null

  const totalPos = results.reduce((s, r) => s + (r.posCount || 0), 0)
  const totalNeg = results.reduce((s, r) => s + (r.negCount || 0), 0)
  const allAspects = [...new Set(results.flatMap(r => r.aspects || []))]
  const overallSentiment = totalPos > totalNeg * 2 ? 'positive' : totalNeg > totalPos * 2 ? 'negative' : totalPos > 0 || totalNeg > 0 ? 'mixed' : 'unknown'

  // Sentiment score 0-100
  const total = totalPos + totalNeg
  const sentimentScore = total > 0 ? Math.round((totalPos / total) * 100) : 50

  const mentioned = results.some(r => r.mentioned)

  return {
    brand: brandName,
    sentiment: overallSentiment,
    sentiment_score: sentimentScore,
    mentioned_in_perception: mentioned,
    positive_signals: totalPos,
    negative_signals: totalNeg,
    aspects_found: allAspects,
    results: results.map(r => ({
      prompt: r.prompt,
      sentiment: r.sentiment,
      mentioned: r.mentioned,
      response_excerpt: r.response,
      aspects: r.aspects,
    })),
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RECOMMENDATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateRecommendations(results, tech, ext, mentionRate, lang) {
  const recs = []
  const pa = ext || {}

  if (pa.hasNoindex) recs.push({ priority: 'critical', title: 'Pagina staat op noindex!', description: 'Niet zichtbaar voor zoekmachines en AI-crawlers.' })

  if (pa.hasFAQ && !pa.structuredDataTypes?.includes('FAQPage')) recs.push({ priority: 'high', title: 'FAQ-content zonder FAQPage Schema', description: 'Voeg FAQPage structured data toe voor directe AI-citatie.' })
  else if (!pa.hasFAQ && mentionRate < 0.5) recs.push({ priority: 'high', title: 'Voeg FAQ-sectie + Schema toe', description: 'Beantwoord 3-5 klantvragen met FAQPage markup.' })

  if (pa.detectedLocation && !pa.structuredDataTypes?.includes('LocalBusiness')) recs.push({ priority: 'high', title: `LocalBusiness Schema (${pa.detectedLocation})`, description: 'Helpt AI je te koppelen aan lokale zoekvragen.' })

  if (mentionRate === 0) recs.push({ priority: 'high', title: 'Niet gevonden in AI-antwoorden', description: 'Zorg dat bedrijfsnaam, expertise en unieke waarde duidelijk in content staan.' })
  else if (mentionRate < 0.5) recs.push({ priority: 'medium', title: 'Voeg concrete feiten en cijfers toe', description: 'AI citeert bij voorkeur specifieke, verifieerbare informatie.' })

  if (pa.wordCount && pa.wordCount < 300) recs.push({ priority: 'high', title: `Te weinig content (${pa.wordCount} woorden)`, description: 'Minimaal 300-500 woorden voor AI-citatie.' })

  if (tech) {
    const robotsCheck = tech.checks.find(c => c.name === 'robots.txt' && c.status === 'error')
    if (robotsCheck) recs.push({ priority: 'high', title: 'AI-bots geblokkeerd', description: robotsCheck.detail })
  }

  return recs.sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, low: 3 }[b.priority]))
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE CONTENT ANALYSIS (GEO Audit style, 3 categories)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function analyzeContentWithClaude(extracted, pageUrl) {
  try {
    const headingText = (extracted.headings || []).slice(0, 10).map(h => `${h.level}: ${h.text}`).join(' | ')
    const schemaText = (extracted.structuredDataTypes || []).join(', ') || 'Geen'

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `Je bent een GEO (Generative Engine Optimization) expert. Analyseer webpagina's op AI-geschiktheid. Antwoord ALTIJD als pure JSON. Geen markdown, geen backticks, geen uitleg.`,
      messages: [{
        role: 'user',
        content: `Analyseer deze pagina voor GEO-geschiktheid.

URL: ${pageUrl}
Title: ${extracted.title || ''}
Meta description: ${extracted.description || ''}
Headings: ${headingText}
Woorden: ${extracted.wordCount || 0}
Schema types: ${schemaText}

Content:
---
${(extracted.bodyText || '').substring(0, 1500)}
---

Geef als JSON:
{
  "content_score": <0-100>,
  "content_summary": "<1 zin beschrijving van content kwaliteit>",
  "content_checks": [
    {"name": "<checknaam>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "citation_score": <0-100>,
  "citation_summary": "<1 zin>",
  "citation_checks": [
    {"name": "<checknaam>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "eat_score": <0-100>,
  "eat_summary": "<1 zin>",
  "eat_checks": [
    {"name": "<checknaam>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "top_recommendations": ["<concrete actie 1>", "<concrete actie 2>", "<concrete actie 3>"]
}

CONTENT checks (minimaal 4, specifiek voor deze pagina):
- Directe antwoorden bovenaan de pagina?
- Q&A formaat aanwezig?
- Begrippen/termen uitgelegd?
- Lijsten of gestructureerde informatie voor AI?
- Taalgebruik: helder, informatief, bondig?

CITATION checks (minimaal 3):
- Unieke data: statistieken, cijfers, feiten aanwezig?
- Expert claims of uitspraken?
- Bedrijfsnaam duidelijk aanwezig?

EAT checks (minimaal 3):
- Auteur of bedrijfsprofiel zichtbaar?
- Expertise signalen: certificeringen, ervaring, klanten?
- Reviews of testimonials?
- Contactinformatie beschikbaar?

Geef TOP_RECOMMENDATIONS als concrete, specifieke acties voor DEZE pagina.
ALLEEN JSON.`
      }]
    })

    const text = message.content[0].text.trim()
    const jsonStr = text.replace(/^```json[\r\n]*/g, '').replace(/```[\r\n]*$/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    return {
      categories: [
        {
          name: 'AI Content Kwaliteit',
          slug: 'content',
          score: parsed.content_score || 0,
          icon: '📝',
          summary: parsed.content_summary || '',
          checks: parsed.content_checks || []
        },
        {
          name: 'Citatie-potentieel',
          slug: 'citation',
          score: parsed.citation_score || 0,
          icon: '🎯',
          summary: parsed.citation_summary || '',
          checks: parsed.citation_checks || []
        },
        {
          name: 'E-E-A-T Signalen',
          slug: 'eeat',
          score: parsed.eat_score || 0,
          icon: '🏆',
          summary: parsed.eat_summary || '',
          checks: parsed.eat_checks || []
        }
      ],
      top_recommendations: parsed.top_recommendations || []
    }

  } catch (error) {
    console.error('[Scan] Claude content analysis error:', error.message)
    return null
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPETITOR NAME EXTRACTION (text-based, no URLs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function cleanCompetitorName(raw) {
  return raw
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')  // Strip markdown links
    .replace(/https?:\/\/\S+/g, '')               // Strip URLs
    .replace(/\*\*/g, '').replace(/[`_~]/g, '')   // Strip markdown
    .replace(/\[\d+\]/g, '')                      // Strip citations [1]
    .replace(/\s*·\s*.*/g, '')                     // Strip after ·
    .replace(/\(\d+\s*(?:beoordelingen|reviews?)\)/gi, '')
    .replace(/\(\s*\d+\s*\)/g, '')
    .replace(/\b(Nu geopend|Gesloten|Tijdelijk gesloten)\b/gi, '')
    .replace(/\d+[.,]\d+\s*★?/g, '').replace(/★+/g, '')
    .replace(/\d{4}\s*[A-Z]{2}\b/g, '')
    .replace(/\+?\d[\d\s\-]{8,}/g, '')
    .replace(/^[\s·•\-–—:,;|()\[\]]+/, '')
    .replace(/[\s·•\-–—:,;|()\[\]]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractCompetitorNames(text, brandVariants) {
  const competitors = []
  const seen = new Set()
  const companyLower = (brandVariants[0] || '').toLowerCase()

  const excludeList = new Set([
    'google', 'facebook', 'instagram', 'linkedin', 'twitter', 'youtube',
    'amazon', 'apple', 'microsoft', 'chatgpt', 'openai', 'anthropic', 'perplexity',
    'wikipedia', 'trustpilot', 'thuiswinkel', 'kvk', 'rijksoverheid',
    'nederland', 'netherlands', 'amsterdam', 'rotterdam', 'den haag', 'utrecht',
    'eindhoven', 'groningen', 'maastricht', 'breda', 'tilburg', 'almere'
  ])

  // Pre-clean markdown links
  const cleanedText = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  function isValid(name) {
    if (!name || name.length < 4 || name.length > 50) return false
    const nl = name.toLowerCase()
    const wc = name.split(/\s+/).length
    return (
      wc <= 5 &&
      !nl.includes(companyLower) && !companyLower.includes(nl) &&
      !excludeList.has(nl) && !seen.has(nl) &&
      !/\?/.test(nl) &&
      !/^(dit|deze|dat|die|er|het|de|een|als|voor|naar|van|met|bij|wat|wie|waar|hoe|welke|enkele|diverse|ook|meer|nog|veel|alle|andere)\s/i.test(name) &&
      !/^(tip|stap|punt|optie|keuze|voordeel|nadeel|conclusie|samenvatting)\b/i.test(name) &&
      /[a-zA-Z]/.test(name) &&
      /^[A-Z0-9]/.test(name) &&
      !/(\.(nl|com|org|net|be|de|eu))$/i.test(name) &&  // No domain names
      !/^https?/i.test(name) &&
      !/^www\./i.test(name)
    )
  }

  // Pattern 1: **Bold names**
  const boldPattern = /\*\*([^*]{3,60})\*\*/g
  let m
  while ((m = boldPattern.exec(cleanedText)) !== null) {
    const name = cleanCompetitorName(m[1]).replace(/\s*[-–—:].*/, '').replace(/^\d+[.).]\s*/, '').trim()
    if (isValid(name)) { seen.add(name.toLowerCase()); competitors.push(name) }
  }

  // Pattern 2: Numbered list items (1. Company Name)
  const numberedPattern = /^\s*\d+[.)\-]\s*\**([^*\n]{2,60})/gm
  while ((m = numberedPattern.exec(cleanedText)) !== null) {
    const name = cleanCompetitorName(m[1]).replace(/\s*[-–—:].*/, '').trim()
    if (isValid(name)) { seen.add(name.toLowerCase()); competitors.push(name) }
  }

  return competitors.slice(0, 6)
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildBrandVariants(siteDomain, connectionSiteName, wpSiteName, brandName) {
  const n = new Set()
  if (brandName && brandName.length > 1) n.add(brandName.toLowerCase())
  if (wpSiteName && wpSiteName.length > 2) n.add(wpSiteName.toLowerCase())
  if (connectionSiteName && connectionSiteName.length > 2) n.add(connectionSiteName.toLowerCase())
  if (siteDomain) {
    n.add(siteDomain.toLowerCase())
    const wp = siteDomain.replace(/^(cdn|www|staging|dev)\./, '')
    n.add(wp.toLowerCase())
    const b = wp.replace(/\.(nl|com|eu|org|net)$/i, '')
    if (b && b.length > 2) { n.add(b.toLowerCase()); const s = b.replace(/[-_.]/g, ' ').toLowerCase(); if (s !== b.toLowerCase()) n.add(s) }
  }
  for (const g of ['www', 'cdn', 'staging', 'dev', 'test', 'nl', 'com', 'org']) n.delete(g)
  return [...n].filter(x => x.length > 1)
}

function detectLocation(text) {
  // Try address patterns first (most reliable)
  const addressPatterns = [
    /(\d{4}\s?[A-Z]{2})\s+([\w\s'-]+?)(?:\s*[,.]|\s*$)/i,  // 1234 AB Amsterdam
    /(?:gevestigd|kantoor|adres|bezoekadres|locatie)\s*(?:in|te|:)?\s*([\w\s'-]+?)(?:\s*[,.]|\s*$)/i,
  ]
  for (const p of addressPatterns) {
    const m = text.match(p)
    if (m) {
      const candidate = (m[2] || m[1] || '').trim()
      const loc = matchCity(candidate)
      if (loc) return loc
    }
  }
  // Fallback: check city names
  return matchCity(text)
}

function matchCity(text) {
  const lower = text.toLowerCase()
  const cities = [
    'Amsterdam','Rotterdam','Den Haag','\'s-Gravenhage','Utrecht','Eindhoven','Groningen',
    'Tilburg','Almere','Breda','Nijmegen','Arnhem','Haarlem','Enschede','Apeldoorn',
    'Amersfoort','Den Bosch','\'s-Hertogenbosch','Zwolle','Zoetermeer','Leiden','Leeuwarden',
    'Maastricht','Dordrecht','Alkmaar','Delft','Deventer','Hilversum','Gouda','Zaandam',
    'Roosendaal','Oss','Venlo','Sittard','Heerlen','Helmond','Purmerend','Schiedam',
    'Vlaardingen','Amstelveen','Hoofddorp','Alphen aan den Rijn','Capelle aan den IJssel',
    'Nieuwegein','Veenendaal','Zeist','Ede','Wageningen','Bussum','Baarn','Soest',
    'Hoorn','Den Helder','Middelburg','Goes','Terneuzen','Leidschendam','Rijswijk',
    'Voorburg','Wassenaar','Naaldwijk','Katwijk','Noordwijk','Beverwijk','Heemskerk'
  ]
  for (const c of cities) {
    if (lower.includes(c.toLowerCase())) return c
  }
  // Normalize Den Haag variants
  if (lower.includes("'s-gravenhage")) return 'Den Haag'
  if (lower.includes("den haag")) return 'Den Haag'
  return null
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] }
}

function clean(t) { return t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() }
