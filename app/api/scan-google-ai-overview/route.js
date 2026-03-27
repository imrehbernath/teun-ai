import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SERPAPI_KEY = process.env.SERPAPI_KEY
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Detect language from prompt texts
function detectLanguageFromPrompts(prompts) {
  const text = prompts.join(' ').toLowerCase()

  const dutchWords = [
    'welke', 'beste', 'waar', 'hoe', 'wat', 'kun', 'kunt', 'voor', 'een', 'het', 'van', 'bij',
    'goede', 'ervaring', 'ervaringen', 'kosten', 'advies', 'bedrijf', 'bedrijven', 'noem', 'geef',
    'zijn', 'heeft', 'moet', 'zoek', 'vind', 'aanbevelen', 'vergelijk', 'verschil', 'doen',
    'geven', 'hebben', 'worden', 'deze', 'die', 'ook', 'niet', 'maar', 'met', 'naar',
    'over', 'tussen', 'zonder', 'tegen', 'onder', 'boven', 'binnen', 'buiten'
  ]

  const englishWords = [
    'which', 'best', 'where', 'how', 'what', 'can', 'for', 'the', 'with',
    'good', 'experience', 'experiences', 'cost', 'advice', 'company', 'companies',
    'recommend', 'find', 'compare', 'difference', 'should', 'does', 'review', 'reviews',
    'that', 'this', 'from', 'have', 'been', 'will', 'would', 'could', 'about',
    'between', 'without', 'against', 'need', 'looking', 'want', 'services'
  ]

  let dutchScore = 0
  let englishScore = 0

  dutchWords.forEach(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'g')
    const matches = text.match(regex)
    if (matches) dutchScore += matches.length
  })

  englishWords.forEach(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'g')
    const matches = text.match(regex)
    if (matches) englishScore += matches.length
  })

  console.log(`Language detection: Dutch=${dutchScore}, English=${englishScore}`)
  return englishScore > dutchScore * 1.3 ? 'en' : 'nl'
}

// Claude system prompt — bilingual based on detected language
function getTransformSystemPrompt(lang) {
  if (lang === 'en') {
    return `You are an expert in Google search queries. Your task: convert commercial AI prompts into short, natural English Google search queries that trigger AI Overviews.

RULES:
- Each query should be 2-6 words, maximum 8 words
- Use natural English as a human would google
- NO company names, city names, or "best/top/good" words
- Focus on the TOPIC, not finding a provider
- Informational queries: "how much does ... cost", "how does ... work", "... reviews", "... pros and cons"
- If the prompt is already informational, keep it short and clean

EXAMPLES:
- "Which plastic surgeons in New York do facelifts" → "facelift cost and recovery"
- "Can you recommend specialists for eyelid surgery at reasonable cost" → "eyelid surgery cost"
- "Best SEO agency London" → "outsource SEO costs"
- "Which lawyers are good at employment law" → "employment lawyer when needed"
- "Give tips for reliable roofers with good reviews" → "choosing a roofer what to look for"

Reply ONLY with a JSON array of strings, one per prompt, in the same order. No explanation.`
  }

  return `Je bent een expert in Google zoekopdrachten. Je taak: zet commerciële AI-prompts om naar korte, natuurlijke Nederlandse Google-zoekopdrachten die AI Overviews triggeren.

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

Antwoord ALLEEN met een JSON array van strings, één per prompt, in dezelfde volgorde. Geen uitleg.`
}

// Use Claude to transform prompts — now with language detection
async function transformPromptsToSearchQueries(prompts, lang = 'nl') {
  try {
    const promptList = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: getTransformSystemPrompt(lang),
      messages: [{
        role: 'user',
        content: lang === 'en'
          ? `Convert these ${prompts.length} commercial prompts into short Google search queries:\n\n${promptList}`
          : `Zet deze ${prompts.length} commerciële prompts om naar korte Google-zoekopdrachten:\n\n${promptList}`
      }]
    })

    const text = response.content[0].text.trim()
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
    const queries = JSON.parse(cleaned)
    
    if (Array.isArray(queries) && queries.length === prompts.length) {
      console.log('Claude transformed prompts:', prompts.map((p, i) => `"${p}" → "${queries[i]}"`).join(', '))
      return prompts.map((prompt, i) => ({
        searchQuery: queries[i],
        originalPrompt: prompt
      }))
    }
    
    console.warn('Claude returned wrong number of queries, using fallback')
    return prompts.map(p => fallbackTransform(p))
  } catch (error) {
    console.error('Claude transform error, using fallback:', error.message)
    return prompts.map(p => fallbackTransform(p))
  }
}

// Simple fallback if Claude fails
function fallbackTransform(prompt) {
  let q = prompt.trim().replace(/[?!.]+$/, '')
  
  q = q
    .replace(/^(?:kun je|welke|geef|noem|heb je|ken je|wat zijn de|lijst|can you|which|give|list|what are the)\s+(?:mij |me |een aantal |de |het |some |the )?(?:beste|top|goede|betrouwbare|ervaren|gerenommeerde|best|top|good|reliable|experienced)?\s*/i, '')
    .replace(/(?:specialisten|klinieken|artsen|chirurgen|aanbieders|experts|bedrijven|bureaus|kantoren|advocaten|adviseurs|specialists|clinics|doctors|providers|experts|companies|agencies|offices|lawyers|advisors)\s+(?:in \w+ )?(?:noemen|aanbevelen|aanraden|die|voor|met|waar|hebben|bieden|recommend|that|for|with|where|have|offer)\s*/i, '')
    .replace(/\s+(?:in|te|near|around)\s+(?:amsterdam|rotterdam|den haag|utrecht|eindhoven|nederland|london|new york|los angeles)\b/gi, '')
    .replace(/\s+(?:met|voor|tegen|with|for|against)\s+(?:goede|beste|redelijke|uitstekende|bewezen|good|best|reasonable|excellent|proven).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  if (q.length < 5) q = prompt.split(' ').slice(0, 5).join(' ')
  if (q.length > 60) q = q.substring(0, 60).replace(/\s\w*$/, '')
  
  console.log(`Fallback transform: "${prompt}" → "${q}"`)
  return { searchQuery: q, originalPrompt: prompt }
}

// Recursively extract text from text_blocks
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

      if (!isCompany && (title || domain)) {
        let companyFromTitle = ''
        if (title.includes(' - ')) {
          companyFromTitle = title.split(' - ').pop().trim()
        } else if (title.includes(' | ')) {
          companyFromTitle = title.split(' | ').pop().trim()
        }
        
        let companyFromDomain = domain
          .replace(/^www\./, '')
          .replace(/^https?:\/\//, '')
          .replace(/\/.*$/, '')
          .trim()
        
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

// Fetch AI Overview via page_token
async function fetchAiOverviewByToken(pageToken) {
  try {
    const params = new URLSearchParams({
      engine: 'google_ai_overview',
      page_token: pageToken,
      api_key: SERPAPI_KEY,
      no_cache: 'true'
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

    const { companyName, website, prompts, skipSave, transformedQueries: preTransformed } = await request.json()

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

    // Detect language from prompts
    const lang = detectLanguageFromPrompts(promptsToScan)
    const gl = lang === 'en' ? 'us' : 'nl'
    const hl = lang === 'en' ? 'en' : 'nl'
    console.log(`AI Overview scan: lang=${lang}, gl=${gl}, ${promptsToScan.length} prompts`)

    const results = []

    // Use pre-transformed queries if provided, otherwise transform now
    let transformedQueries
    if (preTransformed && Array.isArray(preTransformed) && preTransformed.length === promptsToScan.length) {
      console.log('Using pre-transformed queries from frontend')
      transformedQueries = preTransformed
    } else {
      transformedQueries = await transformPromptsToSearchQueries(promptsToScan, lang)
    }

    for (let i = 0; i < promptsToScan.length; i++) {
      const prompt = promptsToScan[i]
      try {
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }

        const { searchQuery, originalPrompt } = transformedQueries[i]

        // Google search with dynamic language parameters
        const params = new URLSearchParams({
          engine: 'google',
          q: searchQuery,
          api_key: SERPAPI_KEY,
          gl,
          hl,
          num: 10
        })

        console.log(`Fetching Google search for: "${searchQuery}" (original: "${prompt}", lang=${lang})`)
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

        // Fetch full AI Overview if page_token present
        if (aiOverview?.page_token) {
          console.log(`Found page_token for "${prompt}", fetching full AI Overview...`)
          const fullOverview = await fetchAiOverviewByToken(aiOverview.page_token)
          if (fullOverview) {
            aiOverview = fullOverview.ai_overview || fullOverview
          }
        }

        if (aiOverview) {
          if (aiOverview.text_blocks && Array.isArray(aiOverview.text_blocks)) {
            aiOverviewText = extractTextFromBlocks(aiOverview.text_blocks)
          } else if (aiOverview.text) {
            aiOverviewText = aiOverview.text
          } else if (typeof aiOverview === 'string') {
            aiOverviewText = aiOverview
          }

          hasAiOverview = aiOverviewText.length > 0

          if (hasAiOverview) {
            const refData = extractReferences(aiOverview, companyName)
            sources = refData.sources
            competitors = refData.competitors

            const companyLower = companyName.toLowerCase()
            const allText = (aiOverviewText + ' ' + sources.map(s => `${s.title} ${s.link} ${s.domain}`).join(' ')).toLowerCase()

            companyMentioned = allText.includes(companyLower)

            if (!companyMentioned && website) {
              const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
              companyMentioned = allText.includes(domain)
            }

            if (companyMentioned) {
              const regex = new RegExp(companyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
              const matches = allText.match(regex)
              mentionCount = matches ? matches.length : 1
            }
          }
        }

        console.log(`Query "${searchQuery}": hasAiOverview=${hasAiOverview}, mentioned=${companyMentioned}, sources=${sources.length}`)

        results.push({
          query: prompt,
          searchQuery: searchQuery,
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
          searchQuery: transformedQueries[i]?.searchQuery || prompt,
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

    // Save to database (skip if single-prompt sequential mode)
    let scanRecord = null
    if (!skipSave) {
      const { data: dbRecord, error: dbError } = await supabase
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
      scanRecord = dbRecord
    }

    return NextResponse.json({
      success: true,
      scanId: scanRecord?.id || null,
      companyName,
      lang,
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
