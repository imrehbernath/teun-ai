import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SERPAPI_KEY = process.env.SERPAPI_KEY

// Helper to check if company is mentioned in text
function checkCompanyMention(text, companyName, websiteDomain = '') {
  if (!text || !companyName) return false
  const normalizedText = text.toLowerCase()
  const normalizedCompany = companyName.toLowerCase().trim()
  
  // Check for exact match or common variations
  const variations = [
    normalizedCompany,
    normalizedCompany.replace(/\s+/g, ''),  // No spaces
    normalizedCompany.replace(/[.-]/g, ' '), // Replace dots/dashes with spaces
  ]
  
  // Only use first word if it's long enough (5+ chars) to avoid false positives
  // e.g. "SAM" (3 chars) would match everywhere, "Bergman" (7 chars) is safe
  const firstWord = normalizedCompany.split(' ')[0]
  if (firstWord.length >= 5) {
    variations.push(firstWord)
  }
  
  // Add website domain as variation (e.g. "samkliniek" from "samkliniek.nl")
  if (websiteDomain) {
    const cleanDomain = websiteDomain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\.\w+$/, '')  // Remove .nl, .com etc
      .replace(/[.-]/g, '')
    if (cleanDomain.length >= 4) {
      variations.push(cleanDomain)
    }
  }
  
  return variations.some(v => v.length > 2 && normalizedText.includes(v))
}

// Analyze Google AI Mode response
function analyzeAIModeResponse(data, companyName, websiteDomain = '') {
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
    const extractTextFromBlocks = (blocks) => {
      let text = ''
      blocks.forEach(block => {
        if (block.snippet) text += ' ' + block.snippet
        if (block.text) text += ' ' + block.text
        if (block.list && Array.isArray(block.list)) {
          block.list.forEach(item => {
            if (typeof item === 'string') text += ' ' + item
            else if (item.snippet) text += ' ' + item.snippet
            else if (item.text) text += ' ' + item.text
            // Handle nested text_blocks inside list items
            if (item.text_blocks && Array.isArray(item.text_blocks)) {
              text += extractTextFromBlocks(item.text_blocks)
            }
          })
        }
        // Handle nested text_blocks (expandable sections)
        if (block.text_blocks && Array.isArray(block.text_blocks)) {
          text += extractTextFromBlocks(block.text_blocks)
        }
      })
      return text
    }
    aiResponse = extractTextFromBlocks(data.text_blocks)
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
    
    // Also check for partial matches (first word, only if distinctive enough)
    const firstName = companyName.split(' ')[0]
    if (firstName.length >= 5 && !matches) {
      const firstNameRegex = new RegExp(`\\b${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      const firstNameMatches = aiResponse.match(firstNameRegex)
      if (firstNameMatches) mentionCount = firstNameMatches.length
    }
    
    // Also check website domain in response text
    if (!matches && websiteDomain) {
      const cleanDomain = websiteDomain.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
      if (cleanDomain && aiResponse.toLowerCase().includes(cleanDomain)) {
        mentionCount = Math.max(mentionCount, 1)
      }
    }
  }

  // Process sources/references - Google AI Mode uses 'references' field
  const rawSources = data.references || data.sources || data.organic_results || data.ai_overview?.references || []
  rawSources.forEach(source => {
    const title = source.title || ''
    const link = source.link || source.url || ''
    const snippet = source.snippet || source.description || ''
    const domain = source.source || source.displayed_link || source.domain || ''
    
    const isCompany = checkCompanyMention(title, companyName, websiteDomain) || 
                      checkCompanyMention(link, companyName, websiteDomain) ||
                      checkCompanyMention(domain, companyName, websiteDomain)
    
    sources.push({
      title,
      link,
      snippet,
      domain,
      isCompany
    })

    // Track competitors - extract COMPANY NAME from title suffix or domain
    if (!isCompany && (title || domain)) {
      // Company name is usually AFTER " - " or " | " in title
      // e.g. "Ooglidcorrectie kosten - ABC Clinic" → "ABC Clinic"
      let companyFromTitle = ''
      if (title.includes(' - ')) {
        companyFromTitle = title.split(' - ').pop().trim()
      } else if (title.includes(' | ')) {
        companyFromTitle = title.split(' | ').pop().trim()
      }
      
      // Clean domain as fallback
      let companyFromDomain = (domain || '')
        .replace(/^www\./, '')
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim()
      
      // Pick: title suffix if it looks like a company name
      const nameCandidate = companyFromTitle && 
        companyFromTitle.length > 2 && 
        companyFromTitle.length < 40 &&
        !/[?:€•]/.test(companyFromTitle) &&
        !/^\d/.test(companyFromTitle)
          ? companyFromTitle 
          : companyFromDomain
      
      if (nameCandidate && nameCandidate.length > 2 && nameCandidate.length < 50) {
        competitorsMentioned.push(nameCandidate)
      }
    }
  })

  // Also extract competitor names from AI response text
  // Look for patterns like "Name Clinic", "Name Kliniek", "Name Centrum", etc.
  if (aiResponse && companyName) {
    // Common Dutch business suffixes
    const businessPatterns = [
      /([A-Z][a-zA-Z\s]+(?:Kliniek|Clinic|Centrum|Center|Praktijk|Studio|Salon|Institut|Instituut|Medical|Medisch))/g,
      /(?:The\s+)?([A-Z][a-zA-Z\s]+(?:Kliniek|Clinic))/gi
    ]
    
    businessPatterns.forEach(pattern => {
      const matches = aiResponse.match(pattern) || []
      matches.forEach(match => {
        const cleanMatch = match.trim()
        // Don't add if it's the target company
        if (!checkCompanyMention(cleanMatch, companyName, websiteDomain) && 
            cleanMatch.length > 3 && 
            cleanMatch.length < 50) {
          competitorsMentioned.push(cleanMatch)
        }
      })
    })
  }

  // Also check inline sources if present
  if (data.inline_sources) {
    data.inline_sources.forEach(source => {
      const isCompany = checkCompanyMention(source.title || '', companyName, websiteDomain) ||
                        checkCompanyMention(source.link || '', companyName, websiteDomain)
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
    if (data.references) {
      console.log(`references count: ${data.references.length}`)
    }
    if (data.search_metadata?.status) {
      console.log(`search status: ${data.search_metadata.status}`)
    }
    
    const analysis = analyzeAIModeResponse(data, companyName, website || '')

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
      // Map field names to what the frontend detail page expects
      const resultToStore = {
        query: result.query,
        hasAiResponse: result.hasAiResponse,
        hasAiOverview: result.hasAiResponse,          // Frontend reads this
        companyMentioned: result.companyMentioned,
        mentionCount: result.mentionCount,
        aiResponse: result.aiResponse || '',
        textContent: result.aiResponse || '',          // Frontend reads this
        sources: result.sources || [],
        references: result.sources || [],              // Frontend reads this
        competitorsMentioned: result.competitorsMentioned || [],
        competitorsInSources: result.competitorsMentioned || [],  // Frontend reads this
      }
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
        aiResponsePreview: r.aiResponse?.slice(0, 800) || '',
        aiResponse: r.aiResponse || '',
        textContent: r.aiResponse || '',
        sourcesCount: r.sources?.length || 0,
        sources: r.sources || [],
        competitors: r.competitorsMentioned || [],
        competitorsInSources: r.competitorsMentioned || [],
        hasAiOverview: r.hasAiResponse
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
