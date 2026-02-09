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
    normalizedCompany.split(' ')[0], // First word only (e.g., "SAM" from "SAM Kliniek")
  ]
  
  return variations.some(v => v.length > 2 && normalizedText.includes(v))
}

// Analyze Google AI Mode response
function analyzeAIModeResponse(data, companyName) {
  if (!data) {
    return {
      hasAiResponse: false,
      companyMentioned: false,
      mentionCount: 0,
      aiResponse: '',
      sources: [],
      competitorsMentioned: []
    }
  }

  let aiResponse = ''
  let mentionCount = 0
  const sources = []
  const competitorsMentioned = []

  // Extract AI response text - handle multiple possible structures
  
  // SerpAPI google_ai_mode returns text_blocks at root level
  if (data.text_blocks && Array.isArray(data.text_blocks)) {
    data.text_blocks.forEach(block => {
      if (block.text) aiResponse += ' ' + block.text
      if (block.snippet) aiResponse += ' ' + block.snippet
      if (block.list) {
        block.list.forEach(item => {
          if (typeof item === 'string') aiResponse += ' ' + item
          else if (item.snippet) aiResponse += ' ' + item.snippet
          else if (item.text) aiResponse += ' ' + item.text
        })
      }
    })
  }
  
  // Also try other common response fields
  if (!aiResponse && data.ai_response) {
    aiResponse = data.ai_response
  } else if (!aiResponse && data.answer) {
    aiResponse = data.answer
  } else if (!aiResponse && data.ai_overview?.text) {
    aiResponse = data.ai_overview.text
  } else if (!aiResponse && data.answer_box?.answer) {
    aiResponse = data.answer_box.answer
  } else if (!aiResponse && data.answer_box?.snippet) {
    aiResponse = data.answer_box.snippet
  }

  // Also check ai_overview text_blocks
  if (data.ai_overview?.text_blocks) {
    data.ai_overview.text_blocks.forEach(block => {
      if (block.snippet) {
        aiResponse += ' ' + block.snippet
      }
      if (block.list) {
        block.list.forEach(item => {
          if (item.snippet) {
            aiResponse += ' ' + item.snippet
          }
        })
      }
    })
  }

  // Check conversation array (Google AI Mode specific)
  if (data.conversation && Array.isArray(data.conversation)) {
    data.conversation.forEach(turn => {
      if (turn.content) {
        aiResponse += ' ' + turn.content
      }
    })
  }

  // Count company mentions in response
  if (aiResponse && companyName) {
    const regex = new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const matches = aiResponse.match(regex)
    if (matches) mentionCount = matches.length
    
    // Also check for partial matches (first word)
    const firstName = companyName.split(' ')[0]
    if (firstName.length > 2 && !matches) {
      const firstNameRegex = new RegExp(firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const firstNameMatches = aiResponse.match(firstNameRegex)
      if (firstNameMatches) mentionCount = firstNameMatches.length
    }
  }

  // Process sources/references
  const rawSources = data.sources || data.organic_results || data.ai_overview?.references || []
  rawSources.forEach(source => {
    const title = source.title || ''
    const link = source.link || source.url || ''
    const snippet = source.snippet || source.description || ''
    const domain = source.source || source.displayed_link || source.domain || ''
    
    const isCompany = checkCompanyMention(title, companyName) || 
                      checkCompanyMention(link, companyName) ||
                      checkCompanyMention(domain, companyName)
    
    sources.push({
      title,
      link,
      snippet,
      domain,
      isCompany
    })

    // Track competitors
    if (!isCompany && domain) {
      competitorsMentioned.push(domain)
    }
  })

  // Also check inline sources if present
  if (data.inline_sources) {
    data.inline_sources.forEach(source => {
      const isCompany = checkCompanyMention(source.title || '', companyName) ||
                        checkCompanyMention(source.link || '', companyName)
      if (isCompany) {
        mentionCount++
      }
    })
  }

  const companyMentioned = mentionCount > 0 || sources.some(s => s.isCompany)

  return {
    hasAiResponse: aiResponse.length > 0,
    companyMentioned,
    mentionCount,
    aiResponse: aiResponse.trim().slice(0, 2000), // Limit response length
    sources,
    competitorsMentioned: [...new Set(competitorsMentioned)]
  }
}

// Fetch from SerpAPI Google AI Mode
async function fetchGoogleAIMode(query, companyName) {
  const params = new URLSearchParams({
    engine: 'google_ai_mode',
    q: query,
    gl: 'nl',           // Country: Netherlands
    hl: 'nl',           // Language: Dutch
    api_key: SERPAPI_KEY
  })

  try {
    console.log(`Fetching Google AI Mode for: "${query}"`)
    
    const url = `https://serpapi.com/search.json?${params}`
    console.log('Requesting URL:', url.replace(SERPAPI_KEY, 'HIDDEN'))
    
    const response = await fetch(url)
    
    // Get raw text first to debug
    const rawText = await response.text()
    console.log(`Response status: ${response.status}, length: ${rawText.length}`)
    
    if (!response.ok) {
      console.error(`SerpAPI error: ${response.status}`, rawText.slice(0, 500))
      throw new Error(`SerpAPI error: ${response.status}`)
    }
    
    if (!rawText || rawText.length === 0) {
      console.error('Empty response from SerpAPI')
      throw new Error('Empty response from SerpAPI')
    }

    let data
    try {
      data = JSON.parse(rawText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message, 'Raw:', rawText.slice(0, 500))
      throw new Error(`JSON parse error: ${parseError.message}`)
    }
    
    // Debug log to see response structure
    console.log(`AI Mode response keys for "${query}":`, Object.keys(data))
    if (data.text_blocks) {
      console.log(`text_blocks count: ${data.text_blocks.length}`)
    }
    
    const analysis = analyzeAIModeResponse(data, companyName)

    return {
      query,
      ...analysis,
      rawResponse: data // Store for debugging
    }

  } catch (error) {
    console.error(`Error fetching Google AI Mode for "${query}":`, error)
    return {
      query,
      hasAiResponse: false,
      companyMentioned: false,
      mentionCount: 0,
      aiResponse: '',
      sources: [],
      competitorsMentioned: [],
      error: error.message
    }
  }
}

export async function POST(request) {
  try {
    // Check for API key
    if (!SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'SerpAPI key not configured. Set SERPAPI_KEY in environment.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { companyName, website, category, prompts } = body

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
        status: 'processing',
        scan_type: 'google_ai_mode'
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
    let hasAiResponseCount = 0

    for (const query of prompts) {
      // Add delay between requests to avoid rate limiting
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      const result = await fetchGoogleAIMode(query, companyName)
      
      // Remove rawResponse before storing to save space
      const { rawResponse, ...resultToStore } = result
      results.push(resultToStore)

      if (result.hasAiResponse) hasAiResponseCount++
      if (result.companyMentioned) foundCount++
      
      console.log(`Query "${query}": AI Response=${result.hasAiResponse}, Mentioned=${result.companyMentioned}`)
    }

    // Update scan record with results
    const { error: updateError } = await supabase
      .from('google_ai_scans')
      .update({
        results: results,
        found_count: foundCount,
        has_ai_overview_count: hasAiResponseCount,
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
      hasAiResponseCount,
      results: results.map(r => ({
        query: r.query,
        hasAiResponse: r.hasAiResponse,
        companyMentioned: r.companyMentioned,
        mentionCount: r.mentionCount,
        aiResponsePreview: r.aiResponse?.slice(0, 200) + (r.aiResponse?.length > 200 ? '...' : ''),
        sourcesCount: r.sources?.length || 0,
        competitors: r.competitorsMentioned || []
      }))
    })

  } catch (error) {
    console.error('Google AI Mode scan error:', error)
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
