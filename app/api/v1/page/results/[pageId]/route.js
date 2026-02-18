// app/api/v1/page/results/[pageId]/route.js
// Page Scan Results Endpoint
//
// Returns the full GEO analysis for a page including
// score, platform breakdown, prompt results, and recommendations.

import { NextResponse } from 'next/server'
import { validateApiKey, supabase } from '@/lib/wp-plugin/auth'

// Disable Vercel edge cache for polling
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    // ─── Auth ───
    const apiKey = request.headers.get('x-api-key')
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // ─── Parse page_id ───
    const { pageId } = await params
    const decoded = decodeURIComponent(pageId)

    // page_id format: "website_id:page_url"
    const colonIndex = decoded.indexOf(':')
    if (colonIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid page_id format. Expected website_id:page_url' },
        { status: 400 }
      )
    }

    const websiteId = decoded.substring(0, colonIndex)
    const pageUrl = decoded.substring(colonIndex + 1)

    // Verify website belongs to this API key
    const connection = auth.data.connections.find(c => c.website_id === websiteId)
    if (!connection) {
      return NextResponse.json(
        { error: 'Website not found for this API key' },
        { status: 403 }
      )
    }

    // ─── Fetch prompts with scan results ───
    const { data: pagePrompts, error } = await supabase
      .from('page_prompts')
      .select(`
        id,
        prompt_text,
        language,
        match_type,
        match_score,
        page_scan_results (
          platform,
          mentioned,
          position,
          snippet,
          competitors,
          scanned_at
        )
      `)
      .eq('website_id', websiteId)
      .eq('page_url', pageUrl)
      .order('match_score', { ascending: false })

    if (error) {
      console.error('Error fetching page results:', error)
      return NextResponse.json(
        { error: 'Failed to fetch results' },
        { status: 500 }
      )
    }

    if (!pagePrompts || pagePrompts.length === 0) {
      return NextResponse.json(
        { error: 'No analysis found for this page. Run analyze and scan first.' },
        { status: 404 }
      )
    }

    // ─── Check if there are any scan results ───
    const hasResults = pagePrompts.some(p => p.page_scan_results && p.page_scan_results.length > 0)

    if (!hasResults) {
      return NextResponse.json({
        geo_score: null,
        platforms: {},
        prompts: pagePrompts.map(p => ({
          text: p.prompt_text,
          language: p.language,
          match_type: p.match_type,
          platforms: {},
        })),
        recommendations: [],
        scanned_at: null,
        message: 'Page analyzed but not yet scanned. Run a scan to get GEO results.',
      })
    }

    // ─── Build flat results array for scoring ───
    const allResults = []
    for (const prompt of pagePrompts) {
      for (const result of (prompt.page_scan_results || [])) {
        allResults.push({
          prompt_id: prompt.id,
          prompt_text: prompt.prompt_text,
          platform: result.platform,
          mentioned: result.mentioned,
          position: result.position,
          snippet: result.snippet,
          competitors: result.competitors || [],
          scanned_at: result.scanned_at,
        })
      }
    }

    // ─── Calculate GEO Score ───
    const platforms = [...new Set(allResults.map(r => r.platform))]
    const geoScore = calculateGeoScore(allResults, platforms)

    // ─── Build platform breakdown ───
    const platformBreakdown = {}
    for (const platform of platforms) {
      const platformResults = allResults.filter(r => r.platform === platform)
      const mentioned = platformResults.filter(r => r.mentioned)
      
      platformBreakdown[platform] = {
        score: platformResults.length > 0
          ? Math.round((mentioned.length / platformResults.length) * 100)
          : 0,
        mentioned_count: mentioned.length,
        total_prompts: platformResults.length,
      }
    }

    // ─── Build per-prompt results ───
    const prompts = pagePrompts.map(p => {
      const platformResults = {}
      for (const result of (p.page_scan_results || [])) {
        platformResults[result.platform] = {
          mentioned: result.mentioned,
          position: result.position,
          snippet: result.snippet,
          competitors: result.competitors || [],
        }
      }

      return {
        id: p.id,
        text: p.prompt_text,
        language: p.language,
        match_type: p.match_type,
        platforms: platformResults,
      }
    })

    // ─── Generate recommendations ───
    const language = pagePrompts[0]?.language || 'nl'
    const recommendations = generateRecommendations(allResults, geoScore, language)

    // ─── Find last scan date ───
    const scanDates = allResults.map(r => r.scanned_at).filter(Boolean)
    const lastScanned = scanDates.length > 0
      ? new Date(Math.max(...scanDates.map(d => new Date(d)))).toISOString()
      : null

    return NextResponse.json({
      geo_score: geoScore,
      platforms: platformBreakdown,
      prompts,
      recommendations,
      scanned_at: lastScanned,
    })

  } catch (error) {
    console.error('Page results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Score calculation (same as scan endpoint) ───

function calculateGeoScore(results, platforms) {
  if (results.length === 0) return 0

  const totalPrompts = [...new Set(results.map(r => r.prompt_id))].length
  const mentionedResults = results.filter(r => r.mentioned)

  const mentionRate = mentionedResults.length / results.length
  const mentionScore = mentionRate * 40

  const positions = mentionedResults.filter(r => r.position).map(r => r.position)
  const avgPosition = positions.length > 0
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : 10
  const positionScore = Math.max(0, (1 - (avgPosition - 1) / 9)) * 20

  const platformsWithMention = new Set(mentionedResults.map(r => r.platform)).size
  const platformScore = (platformsWithMention / Math.max(1, platforms.length)) * 15

  const promptsWithMention = new Set(mentionedResults.map(r => r.prompt_id)).size
  const promptScore = (promptsWithMention / Math.max(1, totalPrompts)) * 15

  const hasSnippets = mentionedResults.filter(r => r.snippet).length
  const qualityScore = Math.min(10, (hasSnippets / Math.max(1, results.length)) * 10)

  return Math.min(100, Math.max(0, Math.round(
    mentionScore + positionScore + platformScore + promptScore + qualityScore
  )))
}

// ─── Recommendations ───

function generateRecommendations(results, geoScore, language) {
  const isNl = language === 'nl'
  const recommendations = []
  const mentionRate = results.filter(r => r.mentioned).length / Math.max(1, results.length)

  if (mentionRate < 0.3) {
    recommendations.push({
      category: 'content', priority: 'high',
      title: isNl ? 'Beantwoord de zoekintentie direct in je eerste alinea' : 'Answer the search intent directly in your first paragraph',
      description: isNl ? 'AI-modellen gebruiken bij voorkeur content die de vraag direct beantwoordt.' : 'AI models prefer content that directly answers the question.',
    })
  }

  if (mentionRate < 0.5) {
    recommendations.push({
      category: 'content', priority: 'high',
      title: isNl ? 'Voeg meer entiteiten en specifieke feiten toe' : 'Add more entities and specific facts',
      description: isNl ? 'AI-zoekmachines geven de voorkeur aan content met concrete feiten en cijfers.' : 'AI search engines prefer content with concrete facts and numbers.',
    })
  }

  recommendations.push({
    category: 'schema', priority: mentionRate < 0.5 ? 'high' : 'medium',
    title: isNl ? 'Voeg FAQ Schema markup toe' : 'Add FAQ Schema markup',
    description: isNl ? 'FAQ Schema helpt AI-modellen je content beter te begrijpen.' : 'FAQ Schema helps AI models better understand your content.',
  })

  recommendations.push({
    category: 'technical', priority: 'medium',
    title: isNl ? 'Controleer AI-crawler toegang in robots.txt' : 'Check AI crawler access in robots.txt',
    description: isNl ? 'Zorg dat GPTBot en PerplexityBot niet geblokkeerd zijn.' : 'Ensure GPTBot and PerplexityBot are not blocked.',
  })

  if (geoScore < 60) {
    recommendations.push({
      category: 'content', priority: 'medium',
      title: isNl ? 'Verrijk content met diepgaande secties' : 'Enrich content with in-depth sections',
      description: isNl ? 'AI-modellen waarderen uitgebreide content over meerdere facetten.' : 'AI models value comprehensive content covering multiple facets.',
    })
  }

  const allCompetitors = results.flatMap(r => r.competitors || [])
  const counts = {}
  allCompetitors.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (top) {
    recommendations.push({
      category: 'content', priority: 'medium',
      title: isNl ? `Analyseer ${top[0]} — ${top[1]}x vaker genoemd` : `Analyze ${top[0]} — mentioned ${top[1]}x more`,
      description: isNl ? `Bekijk welke content elementen ${top[0]} gebruikt.` : `Review what content elements ${top[0]} uses.`,
    })
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}
