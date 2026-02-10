import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SERPAPI_KEY = process.env.SERPAPI_KEY
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Use Claude to transform commercial prompts into clean informational Google search queries
// AI Overviews appear mainly for informational queries (88-91%), rarely for commercial/local ones
async function transformPromptsToSearchQueries(prompts) {
  try {
    const promptList = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Je bent een expert in Google zoekopdrachten. Je taak: zet commerciële AI-prompts om naar korte, natuurlijke Nederlandse Google-zoekopdrachten die AI Overviews triggeren.

REGELS:
- Elke zoekopdracht is 2-6 woorden, maximaal 8 woorden
- Gebruik natuurlijk Nederlands zoals een mens zou googlen
- GEEN bedrijfsnamen, plaatsnamen of "beste/top/goede" woorden
- Focus op het ONDERWERP, niet op het vinden van een aanbieder
- Informatieve queries: "wat kost ...", "hoe werkt ...", "... ervaringen", "... voor- en nadelen"
- Als de prompt al informatief is, houd hem kort en clean

VOORBEELDEN:
- "Welke plastisch chirurgen in Amsterdam doen facelift" → "facelift kosten en ervaringen"
- "Kun je specialisten noemen die ooglidcorrectie doen tegen redelijke kosten" → "ooglidcorrectie kosten"
- "Beste SEO bureau Amsterdam" → "SEO uitbesteden kosten"
- "Welke advocaten zijn goed in arbeidsrecht" → "arbeidsrecht advocaat wanneer nodig"
- "Geef tips voor betrouwbare dakdekkers met goede reviews" → "dakdekker kiezen waar op letten"

Antwoord ALLEEN met een JSON array van strings, één per prompt, in dezelfde volgorde. Geen uitleg.`,
      messages: [{
        role: 'user',
        content: `Zet deze ${prompts.length} commerciële prompts om naar korte Google-zoekopdrachten:\n\n${promptList}`
      }]
    })

    const text = response.content[0].text.trim()
    // Parse JSON array - handle potential markdown code blocks
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
    const queries = JSON.parse(cleaned)
    
    if (Array.isArray(queries) && queries.length === prompts.length) {
      console.log('Claude transformed prompts:', prompts.map((p, i) => `"${p}" → "${queries[i]}"`).join(', '))
      return prompts.map((prompt, i) => ({
        searchQuery: queries[i],
        originalPrompt: prompt
      }))
    }
    
    // Fallback if array length mismatch
    console.warn('Claude returned wrong number of queries, using fallback')
    return prompts.map(p => fallbackTransform(p))
  } catch (error) {
    console.error('Claude transform error, using fallback:', error.message)
    return prompts.map(p => fallbackTransform(p))
  }
}

// Simple fallback if Claude fails - just extract key nouns
function fallbackTransform(prompt) {
  let q = prompt.trim().replace(/[?!.]+$/, '')
  
  // Strip common Dutch commercial prefixes
  q = q
    .replace(/^(?:kun je|welke|geef|noem|heb je|ken je|wat zijn de|lijst)\s+(?:mij |me |een aantal |de |het )?(?:beste|top|goede|betrouwbare|ervaren|gerenommeerde)?\s*/i, '')
    .replace(/(?:specialisten|klinieken|artsen|chirurgen|aanbieders|experts|bedrijven|bureaus|kantoren|advocaten|adviseurs)\s+(?:in \w+ )?(?:noemen|aanbevelen|aanraden|die|voor|met|waar|hebben|bieden)\s*/i, '')
    .replace(/\s+(?:in|te)\s+(?:amsterdam|rotterdam|den haag|utrecht|eindhoven|nederland)\b/gi, '')
    .replace(/\s+(?:met|voor|tegen)\s+(?:goede|beste|redelijke|uitstekende|bewezen).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  // If too short or too long, use truncated original
  if (q.length < 5) q = prompt.split(' ').slice(0, 5).join(' ')
  if (q.length > 60) q = q.substring(0, 60).replace(/\s\w*$/, '')
  
  console.log(`Fallback transform: "${prompt}" → "${q}"`)
  return { searchQuery: q, originalPrompt: prompt }
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

      // Extract COMPANY NAME (not page title) for competitors
      if (!isCompany && (title || domain)) {
        // Strategy 1: Company name is usually AFTER " - " or " | " in title
        // e.g. "Ooglidcorrectie kosten - ABC Clinic" → "ABC Clinic"
        let companyFromTitle = ''
        if (title.includes(' - ')) {
          companyFromTitle = title.split(' - ').pop().trim()
        } else if (title.includes(' | ')) {
          companyFromTitle = title.split(' | ').pop().trim()
        }
        
        // Strategy 2: Clean domain name as fallback
        // e.g. "www.dutchclinic.com" → "dutchclinic.com"
        let companyFromDomain = domain
          .replace(/^www\./, '')
          .replace(/^https?:\/\//, '')
          .replace(/\/.*$/, '')
          .trim()
        
        // Pick: title suffix if it looks like a name (short, no colons/questions)
        const nameCandidate = companyFromTitle && 
          companyFromTitle.length > 2 && 
          companyFromTitle.length < 40 &&
          !/[?:€•]/.test(companyFromTitle) &&
          !/^\d/.test(companyFromTitle)
            ? companyFromTitle 
            : companyFromDomain
        
        if (nameCandidate && nameCandidate.length > 2) {
          competitors.push(nameCandidate)
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

    // Batch transform all prompts to search queries using Claude (1 API call)
    const transformedQueries = await transformPromptsToSearchQueries(promptsToScan)

    for (let i = 0; i < promptsToScan.length; i++) {
      const prompt = promptsToScan[i]
      try {
        // Add delay between requests
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }

        // Use pre-computed search query from Claude batch transform
        const { searchQuery, originalPrompt } = transformedQueries[i]

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
