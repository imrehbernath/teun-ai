import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SERPAPI_KEY = process.env.SERPAPI_KEY

// Transform commercial/local prompts into informational queries that trigger AI Overviews
// AI Overviews appear mainly for informational queries (88-91%), rarely for commercial/local ones
function transformToInformationalQuery(prompt) {
  let q = prompt.trim().replace(/[?!.]+$/, '')  // Strip trailing punctuation
  
  // Common Dutch commercial patterns to strip - order matters (most specific first)
  const commercialPatterns = [
    /^kun je (?:een aantal |betrouwbare |goede )?(?:specialisten|klinieken|artsen|chirurgen|aanbieders|experts|bedrijven|bureaus|kantoren|advocaten|adviseurs|consultants|therapeuten|coaches|trainers) (?:in \w+ )?(?:noemen|aanbevelen|aanraden|opnoemen|geven|suggereren) (?:die|voor|met|waar) /i,
    /^welke (?:zijn )?(?:de )?(?:beste|top|meest betrouwbare|meest ervaren|goede|bekende|gerenommeerde) (?:specialisten|klinieken|artsen|chirurgen|aanbieders|experts|bedrijven|bureaus|kantoren|advocaten|adviseurs) (?:in \w+ )?(?:voor|die|met|waar) /i,
    /^welke (?:klinieken|specialisten|artsen|chirurgen|aanbieders) (?:hebben|bieden) (?:de )?(?:beste|meeste|hoogste) (?:reputatie|ervaring|resultaten|reviews) (?:voor|met|in|op het gebied van) /i,
    /^geef (?:me )?(?:voorbeelden|tips|suggesties|aanbevelingen) (?:van |voor )?(?:gerenommeerde |goede |betrouwbare |ervaren )?(?:specialisten|klinieken|artsen|chirurgen|plastisch chirurgen|aanbieders) (?:die|voor|in|met) /i,
    /^ken je (?:betrouwbare |goede )?(?:specialisten|klinieken|artsen|chirurgen|aanbieders) (?:met|die|voor|in) /i,
    /^wat zijn de (?:top|beste|meest betrouwbare) (?:aanbieders|specialisten|klinieken|artsen) (?:in \w+ )?(?:voor|die|met) /i,
    /^heb je (?:tips|suggesties|aanbevelingen) (?:voor|over) (?:plastische chirurgen|specialisten|klinieken|artsen|aanbieders) (?:die|voor|in|met) /i,
    /^lijst (?:aanbevolen |de beste )?(?:plastisch chirurgen|specialisten|klinieken|artsen|aanbieders) (?:op )?(?:voor|die|met|in) /i,
  ]
  
  let coreTopic = q
  for (const pattern of commercialPatterns) {
    if (pattern.test(q)) {
      coreTopic = q.replace(pattern, '').trim()
      break
    }
  }
  
  // Remove quality/review phrases that got left in the middle
  coreTopic = coreTopic
    .replace(/^(?:uitstekende |goede |beste |hoge |bewezen |jarenlange )?(?:reviews|beoordelingen|ervaring|expertise|reputatie|resultaten) (?:voor|met|van|op het gebied van) /i, '')
  
  // Remove trailing location references
  coreTopic = coreTopic
    .replace(/\s+in\s+(?:amsterdam|rotterdam|den haag|the hague|utrecht|eindhoven|groningen|tilburg|almere|breda|nijmegen|arnhem|haarlem|leiden|delft|apeldoorn|enschede|maastricht|zwolle|nederland|de randstad)(?:\s+(?:en omgeving|e\.o\.))?/gi, '')
  
  // Remove trailing quality/commercial modifiers
  coreTopic = coreTopic
    .replace(/\s+(?:met|voor)\s+(?:goede resultaten|bewezen expertise|jarenlange ervaring|uitstekende reviews|hoge patiëntentevredenheid|de beste reputatie|de beste kwaliteit)$/i, '')
    .replace(/\s+(?:kosten en kwaliteit|prijs en kwaliteit|kosten en resultaten)$/i, '')
    .replace(/\s+(?:uitvoeren|doen|behandelen|verrichten|aanbieden)$/i, '')
    .replace(/\s+(?:ingrepen|behandelingen)\s+(?:doen|uitvoeren)$/i, '')
    .replace(/\s+ingrepen$/i, '')
    .trim()
  
  // If we couldn't extract a topic, use original
  if (!coreTopic || coreTopic.length < 5) {
    coreTopic = q
  }
  
  // If already informational (starts with wat/hoe/waarom), keep as-is
  if (/^(wat|hoe|waarom|wanneer|is het|kan ik|moet ik)/i.test(q) && !/(beste|specialist|kliniek|aanbied)/i.test(q)) {
    return { searchQuery: q, originalPrompt: prompt }
  }
  
  // Build informational variant based on topic type
  const topicLower = coreTopic.toLowerCase()
  
  const treatmentWords = ['correctie', 'operatie', 'behandeling', 'ingreep', 'chirurgie', 'transplantatie', 'therapie', 'implant', 'lifting', 'facelift', 'liposuctie', 'botox', 'filler', 'peeling', 'laser', 'lipoedeem', 'buikvet', 'verwijderen', 'verwijdering']
  const hasTreatment = treatmentWords.some(w => topicLower.includes(w))
  
  let searchQuery
  const hash = prompt.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  
  if (hasTreatment) {
    const variants = [
      `wat kost ${coreTopic}`,
      `hoe werkt ${coreTopic}`,
      `${coreTopic} ervaringen en risico's`,
      `wat is ${coreTopic} en hoe werkt het`,
    ]
    searchQuery = variants[hash % variants.length]
  } else {
    const variants = [
      `wat kost ${coreTopic}`,
      `${coreTopic} uitleg en tips`,
      `wat is ${coreTopic}`,
      `${coreTopic} advies`,
    ]
    searchQuery = variants[hash % variants.length]
  }
  
  // Clean up
  searchQuery = searchQuery.replace(/\s+/g, ' ').trim()
  
  console.log(`AI Overview prompt transform: "${prompt}" → "${searchQuery}"`)
  
  return { searchQuery, originalPrompt: prompt }
}

// Recursively extract text from text_blocks (handles nested expandable, lists, etc.)
function extractTextFromBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return ''
  let text = ''
  blocks.forEach(block => {
    if (block.snippet) text += block.snippet + '\n'
    if (block.text) text += block.text + '\n'
    if (block.title && block.type === 'expandable') text += block.title + ':\n'
    if (block.list && Array.isArray(block.list)) {
      block.list.forEach(item => {
        if (typeof item === 'string') text += '• ' + item + '\n'
        else if (item.snippet) text += '• ' + item.snippet + '\n'
        else if (item.text) text += '• ' + item.text + '\n'
        if (item.text_blocks) text += extractTextFromBlocks(item.text_blocks)
      })
    }
    // Nested text_blocks (expandable sections)
    if (block.text_blocks) text += extractTextFromBlocks(block.text_blocks)
  })
  return text
}

// Extract sources/references from AI Overview
function extractReferences(aiOverview, companyName) {
  const sources = []
  const competitors = []
  const companyLower = companyName.toLowerCase()

  const refArrays = [
    aiOverview.references || [],
    aiOverview.sources || []
  ]

  refArrays.forEach(refs => {
    refs.forEach(ref => {
      const title = ref.title || ''
      const link = ref.link || ref.url || ''
      const snippet = ref.snippet || ''
      const domain = ref.source || ref.displayed_link || ''

      const isCompany = [title, link, domain].some(t =>
        t.toLowerCase().includes(companyLower)
      )

      sources.push({ title, link, snippet, domain, isCompany })

      if (!isCompany && title && title.length > 2) {
        const cleanName = title.split(' - ')[0].split(' | ')[0].trim()
        if (cleanName.length > 2 && cleanName.length < 60) {
          competitors.push(cleanName)
        }
      }
    })
  })

  return { sources, competitors: [...new Set(competitors)].slice(0, 10) }
}

// Fetch AI Overview via page_token (two-step flow)
async function fetchAiOverviewByToken(pageToken) {
  try {
    const params = new URLSearchParams({
      engine: 'google_ai_overview',
      page_token: pageToken,
      api_key: SERPAPI_KEY,
      no_cache: 'true'  // Tokens expire quickly, don't use cache
    })

    console.log('Fetching AI Overview with page_token...')
    const response = await fetch(`https://serpapi.com/search.json?${params}`)

    if (!response.ok) {
      console.error(`AI Overview token fetch failed: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.error) {
      console.error('AI Overview token error:', data.error)
      return null
    }

    return data
  } catch (error) {
    console.error('AI Overview token fetch error:', error)
    return null
  }
}

export async function POST(request) {
  try {
    if (!SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'SerpAPI key not configured' },
        { status: 500 }
      )
    }

    const { companyName, website, prompts } = await request.json()

    if (!companyName || !prompts || prompts.length === 0) {
      return NextResponse.json(
        { error: 'companyName en prompts zijn verplicht' },
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

    const promptsToScan = prompts.slice(0, 10)
    const results = []

    for (const prompt of promptsToScan) {
      try {
        // Add delay between requests
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }

        // Transform commercial prompt to informational query for better AI Overview triggers
        const { searchQuery, originalPrompt } = transformToInformationalQuery(prompt)

        // Step 1: Regular Google search to check for AI Overview
        const params = new URLSearchParams({
          engine: 'google',
          q: searchQuery,
          api_key: SERPAPI_KEY,
          gl: 'nl',
          hl: 'nl',
          num: 10
        })

        console.log(`Fetching Google search for: "${searchQuery}" (original: "${prompt}")`)
        const response = await fetch(`https://serpapi.com/search.json?${params}`)
        const data = await response.json()

        console.log(`Google search keys for "${searchQuery}":`, Object.keys(data))

        let aiOverview = data.ai_overview || null
        let hasAiOverview = false
        let aiOverviewText = ''
        let sources = []
        let competitors = []
        let companyMentioned = false
        let mentionCount = 0

        // Step 2: If page_token present, fetch full AI Overview
        if (aiOverview?.page_token) {
          console.log(`Found page_token for "${prompt}", fetching full AI Overview...`)
          const fullOverview = await fetchAiOverviewByToken(aiOverview.page_token)
          if (fullOverview) {
            // The full overview response has text_blocks at root or in ai_overview
            aiOverview = fullOverview.ai_overview || fullOverview
          }
        }

        if (aiOverview) {
          // Extract text from AI Overview
          if (aiOverview.text_blocks && Array.isArray(aiOverview.text_blocks)) {
            aiOverviewText = extractTextFromBlocks(aiOverview.text_blocks)
          } else if (aiOverview.text) {
            aiOverviewText = aiOverview.text
          } else if (typeof aiOverview === 'string') {
            aiOverviewText = aiOverview
          }

          hasAiOverview = aiOverviewText.length > 0

          if (hasAiOverview) {
            // Extract references and competitors
            const refData = extractReferences(aiOverview, companyName)
            sources = refData.sources
            competitors = refData.competitors

            // Check company mention in text + sources
            const companyLower = companyName.toLowerCase()
            const allText = (aiOverviewText + ' ' + sources.map(s => `${s.title} ${s.link} ${s.domain}`).join(' ')).toLowerCase()

            companyMentioned = allText.includes(companyLower)

            // Also check website domain
            if (!companyMentioned && website) {
              const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
              companyMentioned = allText.includes(domain)
            }

            // Count mentions
            if (companyMentioned) {
              const regex = new RegExp(companyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
              const matches = allText.match(regex)
              mentionCount = matches ? matches.length : 1
            }
          }
        }

        console.log(`Query "${searchQuery}": hasAiOverview=${hasAiOverview}, mentioned=${companyMentioned}, sources=${sources.length}`)

        results.push({
          query: prompt,                    // Original prompt for display
          searchQuery: searchQuery,         // Transformed query used for search
          // Store with both field names for frontend compatibility
          hasAiOverview,
          hasAiResponse: hasAiOverview,
          companyMentioned,
          mentionCount,
          aiOverviewText: aiOverviewText.slice(0, 2000),
          textContent: aiOverviewText.slice(0, 2000),
          aiResponse: aiOverviewText.slice(0, 2000),
          sources,
          references: sources,
          competitorsMentioned: competitors,
          competitorsInSources: competitors
        })

      } catch (queryError) {
        console.error(`Error scanning query "${prompt}":`, queryError)
        results.push({
          query: prompt,
          hasAiOverview: false,
          hasAiResponse: false,
          companyMentioned: false,
          mentionCount: 0,
          aiOverviewText: '',
          textContent: '',
          aiResponse: '',
          sources: [],
          references: [],
          competitorsMentioned: [],
          competitorsInSources: []
        })
      }
    }

    // Calculate totals
    const foundCount = results.filter(r => r.companyMentioned).length
    const hasAiOverviewCount = results.filter(r => r.hasAiOverview).length

    // Save to database
    const { data: scanRecord, error: dbError } = await supabase
      .from('google_ai_overview_scans')
      .insert({
        user_id: user.id,
        company_name: companyName,
        website: website || null,
        prompts: promptsToScan,
        results,
        found_count: foundCount,
        has_ai_overview_count: hasAiOverviewCount,
        total_queries: promptsToScan.length,
        status: 'completed'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
    }

    return NextResponse.json({
      success: true,
      scanId: scanRecord?.id || null,
      companyName,
      totalQueries: promptsToScan.length,
      foundCount,
      hasAiOverviewCount,
      results
    })

  } catch (error) {
    console.error('Google AI Overview scan error:', error)
    return NextResponse.json(
      { error: error.message || 'Scan mislukt' },
      { status: 500 }
    )
  }
}
