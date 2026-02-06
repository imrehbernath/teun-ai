import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SERPAPI_KEY = process.env.SERPAPI_KEY

// Helper to check if company is mentioned in text
function checkCompanyMention(text, companyName) {
  if (!text || !companyName) return false
  const normalizedText = text.toLowerCase()
  const normalizedCompany = companyName.toLowerCase()
  
  // Check for exact match or common variations
  const variations = [
    normalizedCompany,
    normalizedCompany.replace(/\s+/g, ''),  // No spaces
    normalizedCompany.replace(/[.-]/g, ' '), // Replace dots/dashes with spaces
  ]
  
  return variations.some(v => normalizedText.includes(v))
}

// Helper to extract company mentions from AI Overview
function analyzeAIOverview(aiOverview, companyName) {
  if (!aiOverview) {
    return {
      hasAiOverview: false,
      companyMentioned: false,
      mentionCount: 0,
      textContent: '',
      textBlocks: [],
      references: [],
      competitorsInSources: []
    }
  }

  let textContent = ''
  let mentionCount = 0
  const references = []
  const competitorsInSources = []

  // Extract text from text_blocks
  const textBlocks = aiOverview.text_blocks || []
  textBlocks.forEach(block => {
    if (block.snippet) {
      textContent += block.snippet + ' '
      // Count mentions in snippet
      const regex = new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const matches = block.snippet.match(regex)
      if (matches) mentionCount += matches.length
    }
    // Handle list items
    if (block.list) {
      block.list.forEach(item => {
        if (item.snippet) {
          textContent += item.snippet + ' '
          const regex = new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
          const matches = item.snippet.match(regex)
          if (matches) mentionCount += matches.length
        }
      })
    }
  })

  // Process references (sources)
  const rawReferences = aiOverview.references || []
  rawReferences.forEach(ref => {
    const isCompany = checkCompanyMention(ref.title || '', companyName) || 
                      checkCompanyMention(ref.link || '', companyName) ||
                      checkCompanyMention(ref.source || '', companyName)
    
    references.push({
      title: ref.title || '',
      link: ref.link || '',
      source: ref.source || '',
      snippet: ref.snippet || '',
      isCompany
    })

    // Track competitors (sources that are not the company)
    if (!isCompany && ref.source) {
      competitorsInSources.push(ref.source)
    }
  })

  const companyMentioned = mentionCount > 0 || references.some(r => r.isCompany)

  return {
    hasAiOverview: true,
    companyMentioned,
    mentionCount,
    textContent: textContent.trim(),
    textBlocks,
    references,
    competitorsInSources: [...new Set(competitorsInSources)] // Unique competitors
  }
}

// Fetch AI Overview from SerpAPI
async function fetchGoogleAIOverview(query, companyName) {
  const params = new URLSearchParams({
    engine: 'google',
    q: query,
    location: 'Netherlands',
    hl: 'nl',
    gl: 'nl',
    api_key: SERPAPI_KEY,
    no_cache: 'true'  // Always get fresh results
  })

  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`)
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`)
    }

    const data = await response.json()
    let aiOverview = data.ai_overview

    // Check if we need to make a follow-up request for AI Overview
    if (aiOverview?.page_token) {
      console.log(`Fetching AI Overview with page_token for: ${query}`)
      
      const overviewParams = new URLSearchParams({
        engine: 'google_ai_overview',
        page_token: aiOverview.page_token,
        api_key: SERPAPI_KEY
      })

      const overviewResponse = await fetch(`https://serpapi.com/search.json?${overviewParams}`)
      
      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json()
        aiOverview = overviewData.ai_overview || overviewData
      }
    }

    const analysis = analyzeAIOverview(aiOverview, companyName)

    return {
      query,
      ...analysis,
      creditsUsed: aiOverview?.page_token ? 2 : 1  // 2 credits if follow-up was needed
    }

  } catch (error) {
    console.error(`Error fetching AI Overview for "${query}":`, error)
    return {
      query,
      hasAiOverview: false,
      companyMentioned: false,
      mentionCount: 0,
      textContent: '',
      textBlocks: [],
      references: [],
      competitorsInSources: [],
      error: error.message,
      creditsUsed: 1
    }
  }
}

export async function POST(request) {
  try {
    // Check for API key
    if (!SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'SerpAPI key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { companyName, website, prompts } = body

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { error: 'At least one search query is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create initial scan record
    const { data: scan, error: insertError } = await supabase
      .from('google_ai_scans')
      .insert({
        user_id: user.id,
        company_name: companyName,
        website: website || null,
        prompts: prompts,
        total_queries: prompts.length,
        status: 'processing'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating scan record:', insertError)
      return NextResponse.json(
        { error: 'Failed to create scan record' },
        { status: 500 }
      )
    }

    // Process each query
    const results = []
    let foundCount = 0
    let hasAiOverviewCount = 0
    let totalCreditsUsed = 0

    for (const query of prompts) {
      // Add small delay between requests to avoid rate limiting
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const result = await fetchGoogleAIOverview(query, companyName)
      results.push(result)

      if (result.hasAiOverview) hasAiOverviewCount++
      if (result.companyMentioned) foundCount++
      totalCreditsUsed += result.creditsUsed
    }

    // Update scan record with results
    const { error: updateError } = await supabase
      .from('google_ai_scans')
      .update({
        results: results,
        found_count: foundCount,
        has_ai_overview_count: hasAiOverviewCount,
        api_credits_used: totalCreditsUsed,
        status: 'completed'
      })
      .eq('id', scan.id)

    if (updateError) {
      console.error('Error updating scan record:', updateError)
    }

    return NextResponse.json({
      success: true,
      scanId: scan.id,
      companyName,
      totalQueries: prompts.length,
      foundCount,
      hasAiOverviewCount,
      creditsUsed: totalCreditsUsed,
      results
    })

  } catch (error) {
    console.error('Google AI scan error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check scan status or retrieve existing scans
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')
    const companyName = searchParams.get('companyName')

    let query = supabase
      .from('google_ai_scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (scanId) {
      query = query.eq('id', scanId).single()
    } else if (companyName) {
      query = query.ilike('company_name', companyName)
    } else {
      query = query.limit(10)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error fetching Google AI scans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
