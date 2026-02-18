// app/api/v1/page/scan/route.js
// ============================================
// GEO SCAN v2 — POWERED BY GEO AUDIT ENGINE
// ScraperAPI page analysis + Parallel Perplexity + Smart recommendations
// ============================================

import { NextResponse } from 'next/server'
import { validateApiKey, checkScanLimit, incrementScanCount, supabase } from '@/lib/wp-plugin/auth'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const scanLimit = await checkScanLimit(
      auth.data.keyId, auth.data.plan, auth.data.limits.scans_per_month
    )
    if (!scanLimit.allowed) {
      return NextResponse.json({
        error: 'Monthly scan limit reached.',
        used: scanLimit.used, limit: scanLimit.limit,
      }, { status: 429 })
    }

    const body = await request.json()
    const { page_id, prompts, platforms, language, site_name: wpSiteName, brand_name: brandName } = body

    if (!page_id || !prompts || prompts.length === 0) {
      return NextResponse.json({ error: 'page_id and prompts are required' }, { status: 400 })
    }

    const [websiteId, ...urlParts] = page_id.split(':')
    const pageUrl = urlParts.join(':')

    const connection = auth.data.connections.find(c => c.website_id === websiteId)
    if (!connection) {
      return NextResponse.json({ error: 'Website not found for this API key' }, { status: 403 })
    }

    const allowedPlatforms = auth.data.limits.platforms || ['chatgpt', 'perplexity']
    const requestedPlatforms = (platforms || ['perplexity']).filter(p => allowedPlatforms.includes(p))

    // Build brand matching
    const siteUrl = connection.site_url || ''
    const siteDomain = extractDomain(siteUrl)
    const brandVariants = buildBrandVariants(siteDomain, connection.site_name, wpSiteName, brandName)
    const scanId = `scan_${Date.now()}`
    console.log(`🔍 Scan ${scanId} | ${pageUrl} | Brands: ${JSON.stringify(brandVariants)}`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: SCRAPE PAGE + GET PROMPTS (parallel)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const [pageAnalysis, pagePrompts] = await Promise.all([
      scrapePage(pageUrl),
      supabase
        .from('page_prompts')
        .select('id, prompt_text')
        .eq('website_id', websiteId)
        .eq('page_url', pageUrl)
        .then(r => r.data),
    ])

    if (!pagePrompts || pagePrompts.length === 0) {
      return NextResponse.json({ error: 'No prompts found. Run analyze first.' }, { status: 400 })
    }

    console.log(`📄 Page scraped: ${pageAnalysis ? 'OK' : 'SKIP'} | ${pagePrompts.length} prompts`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: PERPLEXITY SCANS — PARALLEL! 🚀
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const scanTasks = []
    for (const prompt of pagePrompts) {
      for (const platform of requestedPlatforms) {
        scanTasks.push({ prompt, platform })
      }
    }

    // Run all Perplexity calls in parallel (max 3 concurrent)
    const scanResults = await runParallel(scanTasks, 3, async (task) => {
      try {
        const result = await scanWithPerplexity(task.prompt.prompt_text, brandVariants)

        await supabase.from('page_scan_results').delete()
          .eq('page_prompt_id', task.prompt.id).eq('platform', task.platform)

        await supabase.from('page_scan_results').insert({
          page_prompt_id: task.prompt.id, platform: task.platform,
          mentioned: result.mentioned, position: result.position,
          snippet: result.snippet, competitors: result.competitors,
        })

        return { prompt_id: task.prompt.id, platform: task.platform, ...result }
      } catch (err) {
        console.error(`Scan error [${task.platform}] "${task.prompt.prompt_text}":`, err.message)
        return {
          prompt_id: task.prompt.id, platform: task.platform,
          mentioned: false, position: null, snippet: null, competitors: [],
        }
      }
    })

    await incrementScanCount(auth.data.keyId)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: SCORE + SMART RECOMMENDATIONS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const geoScore = calculateGeoScore(scanResults, requestedPlatforms)
    const recommendations = generateSmartRecommendations(scanResults, geoScore, pageAnalysis, language || 'nl')

    console.log(`✅ Scan complete: ${scanId} → GEO Score: ${geoScore} | ${recommendations.length} recs`)

    return NextResponse.json({
      scan_id: scanId,
      status: 'complete',
      geo_score: geoScore,
      results: scanResults,
      recommendations,
      page_analysis: pageAnalysis ? {
        hasNoindex: pageAnalysis.hasNoindex,
        hasFAQSchema: pageAnalysis.hasFAQSchema,
        hasLocalBusiness: pageAnalysis.hasLocalBusiness,
        detectedLocation: pageAnalysis.detectedLocation,
        wordCount: pageAnalysis.wordCount,
        schemaTypes: pageAnalysis.schemaTypes,
      } : null,
      scans_remaining: scanLimit.limit === -1 ? 'unlimited' : (scanLimit.limit - scanLimit.used - 1),
    })

  } catch (error) {
    console.error('Page scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARALLEL EXECUTION (like Promise.all but with concurrency limit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runParallel(items, concurrency, fn) {
  const results = []
  const executing = new Set()

  for (const item of items) {
    const p = fn(item).then(r => { executing.delete(p); return r })
    executing.add(p)
    results.push(p)

    if (executing.size >= concurrency) {
      await Promise.race(executing)
    }
  }

  return Promise.all(results)
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCRAPE PAGE WITH SCRAPER API (same as GEO Audit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function scrapePage(url) {
  if (!SCRAPER_API_KEY) {
    console.log('⚠️ No SCRAPER_API_KEY — skipping page analysis')
    return null
  }

  try {
    const response = await fetch(
      `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true`,
      { signal: AbortSignal.timeout(15000) }
    )

    if (!response.ok) {
      console.warn(`⚠️ ScraperAPI error: ${response.status}`)
      return null
    }

    const html = await response.text()
    return analyzeHTML(html)
  } catch (e) {
    console.warn(`⚠️ ScraperAPI timeout: ${e.message}`)
    return null
  }
}

function analyzeHTML(html) {
  const lowerHtml = html.toLowerCase()

  // noindex detection
  const hasNoindex = /<meta[^>]*content=["'][^"']*noindex[^"']*["']/i.test(html)
    || /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)

  // Structured data
  const schemaTypes = []
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim())
      if (data['@type']) {
        const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]
        schemaTypes.push(...types)
      }
      if (data['@graph']) {
        data['@graph'].forEach(item => {
          if (item['@type']) {
            const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
            schemaTypes.push(...types)
          }
        })
      }
    } catch (e) {}
  }

  const hasFAQSchema = schemaTypes.includes('FAQPage')
  const hasLocalBusiness = schemaTypes.includes('LocalBusiness')

  // Word count from body text
  let bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 1).length

  // Location detection from FULL rendered page (including footer)
  const detectedLocation = detectLocationFromHTML(bodyText)

  // robots.txt hints
  const hasRobotsMeta = /<meta[^>]*name=["']robots["']/i.test(html)

  // FAQ content (even without schema)
  const hasFAQContent = /faq|veelgestelde vragen|veel gestelde vragen/i.test(html)
    || (html.match(/<(h[2-4])[^>]*>[^<]*\?<\/\1>/gi) || []).length >= 2

  // Rich snippet eligible types
  const richResultTypes = ['FAQPage', 'HowTo', 'Product', 'Recipe', 'Event', 'VideoObject', 'BreadcrumbList', 'Review', 'AggregateRating', 'LocalBusiness']
  const richSnippetEligible = schemaTypes.filter(t => richResultTypes.includes(t))

  return {
    hasNoindex,
    hasFAQSchema,
    hasFAQContent,
    hasLocalBusiness,
    schemaTypes: [...new Set(schemaTypes)],
    richSnippetEligible,
    wordCount,
    detectedLocation,
    bodyText: bodyText.substring(0, 2000),
  }
}

function detectLocationFromHTML(text) {
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
  ]

  const textLower = text.toLowerCase()
  for (const loc of locations) {
    if (textLower.includes(loc.toLowerCase())) return loc
  }
  return null
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRAND VARIANT BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildBrandVariants(siteDomain, connectionSiteName, wpSiteName, brandName) {
  const names = new Set()

  if (brandName && brandName.length > 1) names.add(brandName.toLowerCase())
  if (wpSiteName && wpSiteName.length > 2) names.add(wpSiteName.toLowerCase())
  if (connectionSiteName && connectionSiteName.length > 2) names.add(connectionSiteName.toLowerCase())

  if (siteDomain) {
    names.add(siteDomain.toLowerCase())
    const withoutPrefix = siteDomain.replace(/^(cdn|www|staging|dev)\./, '')
    names.add(withoutPrefix.toLowerCase())
    const brand = withoutPrefix.replace(/\.(nl|com|eu|org|net)$/i, '')
    if (brand && brand.length > 2) {
      names.add(brand.toLowerCase())
      const spaced = brand.replace(/[-_.]/g, ' ').toLowerCase()
      if (spaced !== brand.toLowerCase()) names.add(spaced)
    }
  }

  const generic = ['www', 'cdn', 'staging', 'dev', 'test', 'nl', 'com', 'org']
  for (const g of generic) names.delete(g)
  return [...names].filter(n => n.length > 1)
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERPLEXITY SCANNER (Dutch system prompt from GEO Audit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function scanWithPerplexity(promptText, brandVariants) {
  if (!PERPLEXITY_API_KEY) throw new Error('Perplexity API key not configured')

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: `Je bent een behulpzame assistent die ALTIJD in het Nederlands antwoordt. 
Geef concrete bedrijfsnamen en aanbevelingen. 
Focus op Nederlandse, specifieke bedrijven en dienstverleners.
Vermeld concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen of specialistische dienstverleners.`
        },
        { role: 'user', content: promptText }
      ],
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!response.ok) throw new Error(`Perplexity API error ${response.status}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const contentLower = content.toLowerCase()

  let mentioned = false
  let matchedTerm = null
  let mentionCount = 0

  for (const variant of brandVariants) {
    if (contentLower.includes(variant)) {
      mentioned = true
      if (!matchedTerm) matchedTerm = variant
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = content.match(new RegExp(escaped, 'gi'))
      if (matches) mentionCount += matches.length
    }
  }

  let position = null
  if (mentioned) {
    const sentences = content.split(/[.!?]\s+/)
    for (let i = 0; i < sentences.length; i++) {
      if (brandVariants.some(v => sentences[i].toLowerCase().includes(v))) {
        position = i + 1
        break
      }
    }
  }

  let snippet = null
  if (mentioned && matchedTerm) {
    const idx = contentLower.indexOf(matchedTerm)
    snippet = content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 200)).trim()
  }

  const competitors = []
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g
  let match
  while ((match = urlPattern.exec(content)) !== null) {
    const domain = match[1].toLowerCase()
    const isOwn = brandVariants.some(v => domain.includes(v) || v.includes(domain.split('.')[0]))
    if (!isOwn && !domain.includes('perplexity') && !domain.includes('wikipedia') && !competitors.includes(domain)) {
      competitors.push(domain)
    }
  }

  const icon = mentioned ? '✅' : '❌'
  console.log(`  ${icon} "${promptText.substring(0, 55)}..." → ${mentioned ? `${mentionCount}x (pos ${position}, "${matchedTerm}")` : 'NOT mentioned'}`)

  return { mentioned, position, snippet, competitors: competitors.slice(0, 5), mentionCount }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SMART RECOMMENDATIONS (page-aware, like GEO Audit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateSmartRecommendations(results, geoScore, pageAnalysis, language) {
  const isNl = language === 'nl'
  const recs = []
  const mentionRate = results.filter(r => r.mentioned).length / Math.max(1, results.length)
  const pa = pageAnalysis || {}

  // ── CRITICAL: noindex ──
  if (pa.hasNoindex) {
    recs.push({
      category: 'critical', priority: 'critical',
      title: isNl ? '🚨 Pagina staat op noindex!' : '🚨 Page has noindex!',
      description: isNl
        ? 'Deze pagina wordt niet geïndexeerd door zoekmachines én AI-crawlers. Verwijder de noindex tag als je gevonden wilt worden.'
        : 'This page is not indexed by search engines or AI crawlers. Remove the noindex tag.',
    })
  }

  // ── FAQ Schema (context-aware) ──
  if (pa.hasFAQSchema) {
    // Already has it — no recommendation needed!
  } else if (pa.hasFAQContent) {
    recs.push({
      category: 'schema', priority: 'high',
      title: isNl ? 'FAQ-content gevonden maar geen FAQPage Schema' : 'FAQ content found but no FAQPage Schema',
      description: isNl
        ? 'Je hebt al FAQ-content op deze pagina. Voeg FAQPage structured data toe zodat AI-platformen dit direct kunnen citeren.'
        : 'You already have FAQ content. Add FAQPage schema so AI platforms can directly cite it.',
    })
  } else if (mentionRate < 0.7) {
    recs.push({
      category: 'schema', priority: 'high',
      title: isNl ? 'Voeg FAQ-sectie + FAQPage Schema toe' : 'Add FAQ section + FAQPage Schema',
      description: isNl
        ? 'Beantwoord 3-5 vragen die klanten stellen. FAQPage Schema verhoogt de kans op AI-citatie aanzienlijk.'
        : 'Answer 3-5 customer questions. FAQPage Schema significantly improves AI citation chances.',
    })
  }

  // ── LocalBusiness Schema ──
  if (pa.detectedLocation && !pa.hasLocalBusiness) {
    recs.push({
      category: 'schema', priority: 'high',
      title: isNl ? `Voeg LocalBusiness Schema toe (${pa.detectedLocation})` : `Add LocalBusiness Schema (${pa.detectedLocation})`,
      description: isNl
        ? `Locatie "${pa.detectedLocation}" gedetecteerd. LocalBusiness Schema helpt AI-platformen je te koppelen aan lokale zoekvragen.`
        : `Location "${pa.detectedLocation}" detected. LocalBusiness Schema helps AI platforms match you to local queries.`,
    })
  }

  // ── Content length ──
  if (pa.wordCount && pa.wordCount < 300) {
    recs.push({
      category: 'content', priority: 'high',
      title: isNl ? `Te weinig content (${pa.wordCount} woorden)` : `Too little content (${pa.wordCount} words)`,
      description: isNl
        ? 'AI-modellen hebben minimaal 300-500 woorden nodig om je content als bron te gebruiken. Voeg meer informatieve tekst toe.'
        : 'AI models need at least 300-500 words to use your content as a source.',
    })
  }

  // ── Mention rate ──
  if (mentionRate === 0) {
    recs.push({
      category: 'content', priority: 'high',
      title: isNl ? 'Niet genoemd in AI-antwoorden' : 'Not mentioned in AI answers',
      description: isNl
        ? 'Je merk verschijnt bij geen enkele prompt. Zorg dat je bedrijfsnaam, expertise en unieke waarde duidelijk in je content staan.'
        : 'Your brand appears in zero prompts. Make your brand name, expertise and unique value clearly visible.',
    })
  } else if (mentionRate < 0.5) {
    recs.push({
      category: 'content', priority: 'medium',
      title: isNl ? 'Voeg concrete feiten en cijfers toe' : 'Add concrete facts and numbers',
      description: isNl
        ? 'AI-zoekmachines citeren bij voorkeur specifieke, verifieerbare informatie. Voeg statistieken, jaren ervaring, aantal klanten toe.'
        : 'AI search engines prefer specific, verifiable information.',
    })
  }

  // ── Brand prominence ──
  if (geoScore < 60 && mentionRate > 0) {
    recs.push({
      category: 'content', priority: 'medium',
      title: isNl ? 'Maak je expertise prominenter' : 'Make your expertise more prominent',
      description: isNl
        ? 'Vermeld je bedrijfsnaam samen met je kernexpertise in de eerste alinea. AI-modellen geven voorkeur aan duidelijke autoriteit.'
        : 'Mention your brand name with core expertise in the first paragraph.',
    })
  }

  // ── Top competitor analysis ──
  const allCompetitors = results.flatMap(r => r.competitors || [])
  const counts = {}
  allCompetitors.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
  const topCompetitors = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  if (topCompetitors.length > 0) {
    const compList = topCompetitors.map(([name, count]) => `${name} (${count}×)`).join(', ')
    recs.push({
      category: 'competitive', priority: 'medium',
      title: isNl ? `Concurrenten in AI-antwoorden` : `Competitors in AI answers`,
      description: isNl
        ? `Meest genoemde concurrenten: ${compList}. Analyseer hun content om te zien wat ze goed doen.`
        : `Most mentioned competitors: ${compList}. Analyze their content.`,
    })
  }

  // Sort: critical first, then high, medium, low
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GEO SCORE CALCULATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculateGeoScore(results, platforms) {
  if (results.length === 0) return 0
  const totalPrompts = [...new Set(results.map(r => r.prompt_id))].length
  const mentioned = results.filter(r => r.mentioned)
  const mentionScore = (mentioned.length / results.length) * 40
  const positions = mentioned.filter(r => r.position).map(r => r.position)
  const avgPos = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 10
  const positionScore = Math.max(0, (1 - (avgPos - 1) / 9)) * 20
  const platformScore = (new Set(mentioned.map(r => r.platform)).size / Math.max(1, platforms.length)) * 15
  const promptScore = (new Set(mentioned.map(r => r.prompt_id)).size / Math.max(1, totalPrompts)) * 15
  const qualityScore = Math.min(10, (mentioned.filter(r => r.snippet).length / Math.max(1, results.length)) * 10)
  return Math.min(100, Math.max(0, Math.round(mentionScore + positionScore + platformScore + promptScore + qualityScore)))
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] }
}
