// app/api/v1/page/scan/route.js
// Page GEO Scan — SYNCHRONOUS
// Uses same Perplexity system prompt as GEO Audit for better Dutch results.

import { NextResponse } from 'next/server'
import { validateApiKey, checkScanLimit, incrementScanCount, supabase } from '@/lib/wp-plugin/auth'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

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

    // Build brand matching — same logic as GEO Audit
    const siteUrl = connection.site_url || ''
    const siteDomain = extractDomain(siteUrl)
    const brandVariants = buildBrandVariants(siteDomain, connection.site_name, wpSiteName, brandName)
    const scanId = `scan_${Date.now()}`
    console.log(`🔍 Scan ${scanId} for ${pageUrl} | Brand variants: ${JSON.stringify(brandVariants)}`)

    // Get prompts from Supabase
    const { data: pagePrompts } = await supabase
      .from('page_prompts')
      .select('id, prompt_text')
      .eq('website_id', websiteId)
      .eq('page_url', pageUrl)

    if (!pagePrompts || pagePrompts.length === 0) {
      return NextResponse.json({ error: 'No prompts found. Run analyze first.' }, { status: 400 })
    }

    // Run scan SYNCHRONOUSLY
    const scanResults = []

    for (const prompt of pagePrompts) {
      for (const platform of requestedPlatforms) {
        try {
          const result = await scanWithPerplexity(prompt.prompt_text, brandVariants)

          await supabase.from('page_scan_results').delete()
            .eq('page_prompt_id', prompt.id).eq('platform', platform)

          await supabase.from('page_scan_results').insert({
            page_prompt_id: prompt.id, platform,
            mentioned: result.mentioned, position: result.position,
            snippet: result.snippet, competitors: result.competitors,
          })

          scanResults.push({ prompt_id: prompt.id, platform, ...result })
          await sleep(1000)
        } catch (err) {
          console.error(`Scan error [${platform}] "${prompt.prompt_text}":`, err.message)
          scanResults.push({
            prompt_id: prompt.id, platform,
            mentioned: false, position: null, snippet: null, competitors: [],
          })
        }
      }
    }

    await incrementScanCount(auth.data.keyId)
    const geoScore = calculateGeoScore(scanResults, requestedPlatforms)
    const recommendations = generateRecommendations(scanResults, geoScore, language || 'nl')
    console.log(`✅ Scan complete: ${scanId} → GEO Score: ${geoScore}`)

    return NextResponse.json({
      scan_id: scanId,
      status: 'complete',
      geo_score: geoScore,
      results: scanResults,
      recommendations,
      scans_remaining: scanLimit.limit === -1 ? 'unlimited' : (scanLimit.limit - scanLimit.used - 1),
    })

  } catch (error) {
    console.error('Page scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Brand variant builder (same approach as GEO Audit) ───

function buildBrandVariants(siteDomain, connectionSiteName, wpSiteName, brandName) {
  const names = new Set()

  // PRIORITY 1: Brand name from plugin settings
  if (brandName && brandName.length > 1) {
    names.add(brandName.toLowerCase())
  }

  // PRIORITY 2: WordPress site name
  if (wpSiteName && wpSiteName.length > 2) {
    names.add(wpSiteName.toLowerCase())
  }

  // PRIORITY 3: Connection site_name from Supabase
  if (connectionSiteName && connectionSiteName.length > 2) {
    names.add(connectionSiteName.toLowerCase())
  }

  // PRIORITY 4: Domain variants (same as GEO Audit)
  if (siteDomain) {
    names.add(siteDomain.toLowerCase())
    const withoutPrefix = siteDomain.replace(/^(cdn|www|staging|dev)\./, '')
    names.add(withoutPrefix.toLowerCase())
    // onlinelabs.nl → onlinelabs
    const brand = withoutPrefix.replace(/\.(nl|com|eu|org|net)$/i, '')
    if (brand && brand.length > 2) {
      names.add(brand.toLowerCase())
      // Also without hyphens/dots: online-labs → online labs
      const spaced = brand.replace(/[-_.]/g, ' ').toLowerCase()
      if (spaced !== brand.toLowerCase()) names.add(spaced)
    }
  }

  // Remove generic terms
  const generic = ['www', 'cdn', 'staging', 'dev', 'test', 'nl', 'com', 'org']
  for (const g of generic) names.delete(g)

  return [...names].filter(n => n.length > 1)
}

// ─── Perplexity Scanner with Dutch system prompt (from GEO Audit) ───

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

  // Check if ANY brand variant appears
  let mentioned = false
  let matchedTerm = null
  let mentionCount = 0

  for (const variant of brandVariants) {
    if (contentLower.includes(variant)) {
      mentioned = true
      if (!matchedTerm) matchedTerm = variant
      // Count occurrences
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = content.match(new RegExp(escaped, 'gi'))
      if (matches) mentionCount += matches.length
    }
  }

  // Find position (which sentence)
  let position = null
  if (mentioned) {
    const sentences = content.split(/[.!?]\s+/)
    for (let i = 0; i < sentences.length; i++) {
      const sentLower = sentences[i].toLowerCase()
      if (brandVariants.some(v => sentLower.includes(v))) {
        position = i + 1
        break
      }
    }
  }

  // Extract snippet
  let snippet = null
  if (mentioned && matchedTerm) {
    const idx = contentLower.indexOf(matchedTerm)
    snippet = content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 200)).trim()
  }

  // Extract competitor domains
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

  if (mentioned) {
    console.log(`  ✅ "${promptText.substring(0, 60)}..." → ${mentionCount}x mentioned (pos ${position}, match: "${matchedTerm}")`)
  } else {
    console.log(`  ❌ "${promptText.substring(0, 60)}..." → NOT mentioned`)
  }

  return { mentioned, position, snippet, competitors: competitors.slice(0, 5), mentionCount }
}

// ─── Recommendations ───

function generateRecommendations(results, geoScore, language) {
  const isNl = language === 'nl'
  const recs = []
  const mentionRate = results.filter(r => r.mentioned).length / Math.max(1, results.length)

  if (mentionRate < 0.3) {
    recs.push({
      category: 'content', priority: 'high',
      title: isNl ? 'Beantwoord zoekvragen direct in je eerste alinea' : 'Answer search questions directly in your first paragraph',
      description: isNl ? 'AI-modellen citeren bij voorkeur content die de vraag direct beantwoordt.' : 'AI models prefer to cite content that directly answers the question.',
    })
  }

  if (mentionRate < 0.5) {
    recs.push({
      category: 'content', priority: 'high',
      title: isNl ? 'Voeg concrete feiten, cijfers en entiteiten toe' : 'Add concrete facts, numbers and entities',
      description: isNl ? 'AI-zoekmachines geven voorkeur aan specifieke, verifieerbare informatie.' : 'AI search engines prefer specific, verifiable information.',
    })
  }

  if (mentionRate < 0.7) {
    recs.push({
      category: 'schema', priority: 'high',
      title: isNl ? 'Voeg FAQPage Schema markup toe' : 'Add FAQPage Schema markup',
      description: isNl ? 'FAQ Schema helpt AI-modellen je content te begrijpen als antwoord op vragen.' : 'FAQ Schema helps AI models understand your content as question answers.',
    })
  }

  recs.push({
    category: 'technical', priority: 'medium',
    title: isNl ? 'Controleer AI-crawler toegang in robots.txt' : 'Check AI crawler access in robots.txt',
    description: isNl ? 'Zorg dat GPTBot en PerplexityBot niet geblokkeerd zijn.' : 'Ensure GPTBot and PerplexityBot are not blocked.',
  })

  if (geoScore < 60) {
    recs.push({
      category: 'content', priority: 'medium',
      title: isNl ? 'Maak je bedrijfsnaam prominenter in de content' : 'Make your brand name more prominent in content',
      description: isNl ? 'Vermeld je bedrijfsnaam meerdere keren en koppel het aan je expertise.' : 'Mention your brand multiple times and link it to your expertise.',
    })
  }

  // Top competitors
  const allCompetitors = results.flatMap(r => r.competitors || [])
  const counts = {}
  allCompetitors.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (top) {
    recs.push({
      category: 'content', priority: 'medium',
      title: isNl ? `Analyseer concurrent ${top[0]} (${top[1]}x genoemd)` : `Analyze competitor ${top[0]} (mentioned ${top[1]}x)`,
      description: isNl ? `Bekijk welke content ${top[0]} inzet voor AI-zichtbaarheid.` : `Review what content ${top[0]} uses for AI visibility.`,
    })
  }

  return recs.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 }
    return p[a.priority] - p[b.priority]
  })
}

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

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
