// app/api/v1/page/scan/route.js
// Page GEO Scan Endpoint
//
// Scans a page's prompts across AI platforms (Perplexity, ChatGPT, etc.)
// to check if the site is mentioned in AI responses.

import { NextResponse } from 'next/server'
import { validateApiKey, checkScanLimit, incrementScanCount, supabase } from '@/lib/wp-plugin/auth'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

export async function POST(request) {
  try {
    // ─── Auth ───
    const apiKey = request.headers.get('x-api-key')
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // ─── Check scan limits ───
    const scanLimit = await checkScanLimit(
      auth.data.keyId,
      auth.data.plan,
      auth.data.limits.scans_per_month
    )

    if (!scanLimit.allowed) {
      return NextResponse.json({
        error: 'Monthly scan limit reached. Upgrade to Premium for unlimited scans.',
        used: scanLimit.used,
        limit: scanLimit.limit,
        upgrade_url: 'https://teun.ai/pricing',
      }, { status: 429 })
    }

    const body = await request.json()
    const { page_id, prompts, platforms, language } = body

    if (!page_id || !prompts || prompts.length === 0) {
      return NextResponse.json(
        { error: 'page_id and prompts are required' },
        { status: 400 }
      )
    }

    // Parse page_id (format: "website_id:page_url")
    const [websiteId, ...urlParts] = page_id.split(':')
    const pageUrl = urlParts.join(':')

    // Verify website belongs to API key
    const connection = auth.data.connections.find(c => c.website_id === websiteId)
    if (!connection) {
      return NextResponse.json(
        { error: 'Website not found for this API key' },
        { status: 403 }
      )
    }

    // Filter platforms by plan
    const allowedPlatforms = auth.data.limits.platforms || ['chatgpt', 'perplexity']
    const requestedPlatforms = (platforms || ['perplexity']).filter(p => allowedPlatforms.includes(p))

    if (requestedPlatforms.length === 0) {
      return NextResponse.json(
        { error: 'No valid platforms selected' },
        { status: 400 }
      )
    }

    // ─── Get page_prompt IDs ───
    const { data: pagePrompts } = await supabase
      .from('page_prompts')
      .select('id, prompt_text')
      .eq('website_id', websiteId)
      .eq('page_url', pageUrl)

    if (!pagePrompts || pagePrompts.length === 0) {
      return NextResponse.json(
        { error: 'No prompts found for this page. Run analyze first.' },
        { status: 400 }
      )
    }

    // ─── Scan each prompt on each platform ───
    const siteDomain = extractDomain(connection.site_url)
    const scanResults = []

    for (const prompt of pagePrompts) {
      for (const platform of requestedPlatforms) {
        try {
          const result = await scanPromptOnPlatform(
            prompt.prompt_text,
            siteDomain,
            connection.site_name || siteDomain,
            platform,
            language || 'nl'
          )

          // Delete old results for this prompt+platform
          await supabase
            .from('page_scan_results')
            .delete()
            .eq('page_prompt_id', prompt.id)
            .eq('platform', platform)

          // Insert new result
          const { data: inserted } = await supabase
            .from('page_scan_results')
            .insert({
              page_prompt_id: prompt.id,
              platform,
              mentioned: result.mentioned,
              position: result.position,
              snippet: result.snippet,
              competitors: result.competitors,
            })
            .select()
            .single()

          scanResults.push({
            prompt_id: prompt.id,
            prompt_text: prompt.prompt_text,
            platform,
            ...result,
          })

          // Rate limit: wait between API calls
          await sleep(1500)

        } catch (err) {
          console.error(`Scan error [${platform}] "${prompt.prompt_text}":`, err.message)
          scanResults.push({
            prompt_id: prompt.id,
            prompt_text: prompt.prompt_text,
            platform,
            mentioned: false,
            position: null,
            snippet: null,
            competitors: [],
            error: err.message,
          })
        }
      }
    }

    // ─── Increment scan counter ───
    await incrementScanCount(auth.data.keyId)

    // ─── Calculate GEO score ───
    const geoScore = calculateGeoScore(scanResults, requestedPlatforms)

    console.log(`🔍 Scan complete: ${pageUrl} → GEO Score: ${geoScore} (${scanResults.length} results)`)

    return NextResponse.json({
      scan_id: `scan_${Date.now()}`,
      status: 'completed',
      geo_score: geoScore,
      platforms: buildPlatformBreakdown(scanResults, requestedPlatforms),
      prompts: buildPromptResults(scanResults),
      recommendations: generateRecommendations(scanResults, geoScore, language),
      scanned_at: new Date().toISOString(),
      scans_remaining: scanLimit.limit === -1 ? 'unlimited' : (scanLimit.limit - scanLimit.used - 1),
    })

  } catch (error) {
    console.error('Page scan error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Scan a single prompt on a platform ───

async function scanPromptOnPlatform(promptText, siteDomain, siteName, platform, language) {
  // Currently we use Perplexity for all platforms
  // In the future, each platform gets its own scanner
  if (platform === 'perplexity' || platform === 'chatgpt') {
    return await scanWithPerplexity(promptText, siteDomain, siteName)
  }

  // Google AI platforms — placeholder for future
  return {
    mentioned: false,
    position: null,
    snippet: null,
    competitors: [],
  }
}

// ─── Perplexity Scanner (reuses existing Teun.ai logic) ───

async function scanWithPerplexity(promptText, siteDomain, siteName) {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('Perplexity API key not configured')
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'user',
          content: promptText,
        }
      ],
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Perplexity API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Check if site is mentioned
  const contentLower = content.toLowerCase()
  const domainLower = siteDomain.toLowerCase()
  const nameLower = siteName.toLowerCase()

  const mentioned = contentLower.includes(domainLower) || contentLower.includes(nameLower)

  // Find position (which sentence mentions the site)
  let position = null
  if (mentioned) {
    const sentences = content.split(/[.!?]\s+/)
    for (let i = 0; i < sentences.length; i++) {
      const sentenceLower = sentences[i].toLowerCase()
      if (sentenceLower.includes(domainLower) || sentenceLower.includes(nameLower)) {
        position = i + 1
        break
      }
    }
  }

  // Extract snippet around mention
  let snippet = null
  if (mentioned) {
    const idx = contentLower.indexOf(domainLower) !== -1
      ? contentLower.indexOf(domainLower)
      : contentLower.indexOf(nameLower)
    const start = Math.max(0, idx - 100)
    const end = Math.min(content.length, idx + 200)
    snippet = content.substring(start, end).trim()
  }

  // Extract competitors (other domains/companies mentioned)
  const competitors = extractCompetitors(content, siteDomain)

  return { mentioned, position, snippet, competitors }
}

// ─── Extract competitor mentions from AI response ───

function extractCompetitors(content, ownDomain) {
  const competitors = []

  // Look for URLs/domains
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g
  let match
  while ((match = urlPattern.exec(content)) !== null) {
    const domain = match[1].toLowerCase()
    if (domain !== ownDomain.toLowerCase() && !domain.includes('perplexity') && !domain.includes('wikipedia')) {
      if (!competitors.includes(domain)) {
        competitors.push(domain)
      }
    }
  }

  return competitors.slice(0, 5) // Max 5 competitors
}

// ─── GEO Score Calculation ───

function calculateGeoScore(results, platforms) {
  if (results.length === 0) return 0

  const totalPrompts = [...new Set(results.map(r => r.prompt_id))].length
  const mentionedResults = results.filter(r => r.mentioned)

  // Factor 1: AI Mentions (40%)
  const mentionRate = mentionedResults.length / results.length
  const mentionScore = mentionRate * 40

  // Factor 2: Position in Answer (20%)
  const positions = mentionedResults.filter(r => r.position).map(r => r.position)
  const avgPosition = positions.length > 0
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : 10
  const positionScore = Math.max(0, (1 - (avgPosition - 1) / 9)) * 20

  // Factor 3: Platform Coverage (15%)
  const platformsWithMention = new Set(mentionedResults.map(r => r.platform)).size
  const platformScore = (platformsWithMention / platforms.length) * 15

  // Factor 4: Prompt Coverage (15%)
  const promptsWithMention = new Set(mentionedResults.map(r => r.prompt_id)).size
  const promptScore = (promptsWithMention / totalPrompts) * 15

  // Factor 5: Content Quality signals (10%) — basic for now
  const hasSnippets = mentionedResults.filter(r => r.snippet).length
  const qualityScore = Math.min(10, (hasSnippets / Math.max(1, results.length)) * 10)

  const total = Math.round(mentionScore + positionScore + platformScore + promptScore + qualityScore)
  return Math.min(100, Math.max(0, total))
}

// ─── Build platform breakdown for response ───

function buildPlatformBreakdown(results, platforms) {
  const breakdown = {}
  
  for (const platform of platforms) {
    const platformResults = results.filter(r => r.platform === platform)
    const mentioned = platformResults.filter(r => r.mentioned)
    
    breakdown[platform] = {
      score: platformResults.length > 0 
        ? Math.round((mentioned.length / platformResults.length) * 100)
        : 0,
      mentioned_count: mentioned.length,
      total_prompts: platformResults.length,
    }
  }

  return breakdown
}

// ─── Build per-prompt results ───

function buildPromptResults(results) {
  const promptMap = {}

  for (const r of results) {
    if (!promptMap[r.prompt_text]) {
      promptMap[r.prompt_text] = {
        text: r.prompt_text,
        platforms: {},
      }
    }

    promptMap[r.prompt_text].platforms[r.platform] = {
      mentioned: r.mentioned,
      position: r.position,
      snippet: r.snippet,
      competitors: r.competitors || [],
    }
  }

  return Object.values(promptMap)
}

// ─── Generate basic recommendations ───

function generateRecommendations(results, geoScore, language) {
  const isNl = language === 'nl'
  const recommendations = []

  const mentionRate = results.filter(r => r.mentioned).length / Math.max(1, results.length)

  // Content recommendations
  if (mentionRate < 0.3) {
    recommendations.push({
      category: 'content',
      priority: 'high',
      title: isNl
        ? 'Beantwoord de zoekintentie direct in je eerste alinea'
        : 'Answer the search intent directly in your first paragraph',
      description: isNl
        ? 'AI-modellen gebruiken bij voorkeur content die de vraag direct beantwoordt. Begin je pagina met een duidelijk antwoord op de belangrijkste vraag.'
        : 'AI models prefer content that directly answers the question. Start your page with a clear answer to the main query.',
    })
  }

  if (mentionRate < 0.5) {
    recommendations.push({
      category: 'content',
      priority: 'high',
      title: isNl
        ? 'Voeg meer entiteiten en specifieke feiten toe'
        : 'Add more entities and specific facts',
      description: isNl
        ? 'AI-zoekmachines geven de voorkeur aan content met concrete feiten, cijfers en entiteiten (namen, locaties, specificaties).'
        : 'AI search engines prefer content with concrete facts, numbers, and entities (names, locations, specifications).',
    })
  }

  // Schema recommendations
  recommendations.push({
    category: 'schema',
    priority: mentionRate < 0.5 ? 'high' : 'medium',
    title: isNl
      ? 'Voeg FAQ Schema markup toe'
      : 'Add FAQ Schema markup',
    description: isNl
      ? 'FAQ Schema helpt AI-modellen de vragen en antwoorden op je pagina te begrijpen. Dit verhoogt de kans op vermelding.'
      : 'FAQ Schema helps AI models understand the questions and answers on your page, increasing chances of being mentioned.',
  })

  // Technical recommendations
  recommendations.push({
    category: 'technical',
    priority: 'medium',
    title: isNl
      ? 'Controleer of AI-crawlers toegang hebben (robots.txt)'
      : 'Verify AI crawlers have access (robots.txt)',
    description: isNl
      ? 'Zorg dat GPTBot, PerplexityBot en Google-Extended niet geblokkeerd zijn in je robots.txt.'
      : 'Ensure GPTBot, PerplexityBot, and Google-Extended are not blocked in your robots.txt.',
  })

  if (geoScore < 60) {
    recommendations.push({
      category: 'content',
      priority: 'medium',
      title: isNl
        ? 'Verrijk je content met diepgaande secties over subtopics'
        : 'Enrich your content with in-depth sections on subtopics',
      description: isNl
        ? 'AI-modellen waarderen uitgebreide content die meerdere facetten van een onderwerp behandelt.'
        : 'AI models value comprehensive content that covers multiple facets of a topic.',
    })
  }

  // Competitor insight
  const allCompetitors = results.flatMap(r => r.competitors || [])
  const competitorCounts = {}
  allCompetitors.forEach(c => { competitorCounts[c] = (competitorCounts[c] || 0) + 1 })
  const topCompetitor = Object.entries(competitorCounts).sort((a, b) => b[1] - a[1])[0]

  if (topCompetitor) {
    recommendations.push({
      category: 'content',
      priority: 'medium',
      title: isNl
        ? `Analyseer ${topCompetitor[0]} — zij worden ${topCompetitor[1]}x vaker genoemd`
        : `Analyze ${topCompetitor[0]} — they are mentioned ${topCompetitor[1]}x more often`,
      description: isNl
        ? `Bekijk welke content elementen ${topCompetitor[0]} gebruikt die AI-modellen waarderen.`
        : `Review what content elements ${topCompetitor[0]} uses that AI models value.`,
    })
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

// ─── Utils ───

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
