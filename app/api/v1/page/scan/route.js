// app/api/v1/page/scan/route.js
// Page GEO Scan — SYNCHRONOUS
// Smart brand name matching: checks domain, site_name, AND extracted brand names.

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

    const scanId = `scan_${Date.now()}`

    // Build comprehensive brand matching terms
    const siteUrl = connection.site_url || ''
    const siteDomain = extractDomain(siteUrl)
    const brandNames = buildBrandNames(siteDomain, connection.site_name, wpSiteName, brandName)
    console.log(`🔍 Scan ${scanId} for ${pageUrl} | Brand matching: ${JSON.stringify(brandNames)}`)

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
          const result = await scanWithPerplexity(prompt.prompt_text, brandNames)

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
    console.log(`✅ Scan complete: ${scanId} → GEO Score: ${geoScore}`)

    return NextResponse.json({
      scan_id: scanId,
      status: 'complete',
      geo_score: geoScore,
      results: scanResults,
      scans_remaining: scanLimit.limit === -1 ? 'unlimited' : (scanLimit.limit - scanLimit.used - 1),
    })

  } catch (error) {
    console.error('Page scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Build all possible brand name variations to match ───

function buildBrandNames(siteDomain, connectionSiteName, wpSiteName, brandName) {
  const names = new Set()

  // PRIORITY 1: Brand name from plugin settings (most reliable)
  if (brandName && brandName.length > 1) {
    names.add(brandName.toLowerCase())
  }

  // PRIORITY 2: WordPress site name (blogname)
  if (wpSiteName && wpSiteName.length > 2) {
    names.add(wpSiteName.toLowerCase())
  }

  // PRIORITY 3: Connection site_name from Supabase
  if (connectionSiteName && connectionSiteName.length > 2) {
    names.add(connectionSiteName.toLowerCase())
  }

  // PRIORITY 4: Domain-based (fallback)
  if (siteDomain) {
    // Full domain: cdn.onlinelabs.nl
    names.add(siteDomain.toLowerCase())
    // Without prefix: onlinelabs.nl
    const withoutPrefix = siteDomain.replace(/^(cdn|www|staging|dev)\./, '')
    names.add(withoutPrefix.toLowerCase())
    // Brand from domain: onlinelabs
    const brand = withoutPrefix.split('.')[0]
    if (brand && brand.length > 2) {
      names.add(brand.toLowerCase())
    }
  }

  // Remove generic terms
  const generic = ['www', 'cdn', 'staging', 'dev', 'test', 'nl', 'com', 'org']
  for (const g of generic) names.delete(g)

  return [...names]
}

// ─── Perplexity Scanner with smart brand matching ───

async function scanWithPerplexity(promptText, brandNames) {
  if (!PERPLEXITY_API_KEY) throw new Error('Perplexity API key not configured')

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: promptText }], max_tokens: 1000 }),
  })

  if (!response.ok) throw new Error(`Perplexity API error ${response.status}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const contentLower = content.toLowerCase()

  // Check if ANY brand name variant appears in the response
  let mentioned = false
  let matchedTerm = null
  for (const name of brandNames) {
    if (contentLower.includes(name)) {
      mentioned = true
      matchedTerm = name
      break
    }
  }

  let position = null
  if (mentioned) {
    const sentences = content.split(/[.!?]\s+/)
    for (let i = 0; i < sentences.length; i++) {
      const sentLower = sentences[i].toLowerCase()
      if (brandNames.some(n => sentLower.includes(n))) {
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

  // Extract competitor domains (excluding our own brand names)
  const competitors = []
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g
  let match
  while ((match = urlPattern.exec(content)) !== null) {
    const domain = match[1].toLowerCase()
    const isOwn = brandNames.some(n => domain.includes(n) || n.includes(domain.split('.')[0]))
    if (!isOwn && !domain.includes('perplexity') && !domain.includes('wikipedia') && !competitors.includes(domain)) {
      competitors.push(domain)
    }
  }

  if (mentioned) {
    console.log(`  ✅ "${promptText.substring(0, 50)}..." → mentioned (pos ${position}, matched: "${matchedTerm}")`)
  } else {
    console.log(`  ❌ "${promptText.substring(0, 50)}..." → NOT mentioned`)
  }

  return { mentioned, position, snippet, competitors: competitors.slice(0, 5) }
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
