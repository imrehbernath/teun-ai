import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { upsertVisibilityHistoryRow } from '@/lib/visibility-history'
import { extractCompetitorsFromChatGPT, cleanCompetitorName, isValidCompetitorName, COMPETITOR_EXCLUDE_LIST } from '@/lib/competitor-extract'
import { matchesBrand, textMentionsBrand } from '@/lib/rank-scanner'
import { stripLegalSuffix } from '@/lib/branche-detect'
import { resolveGeoAccessTier, GEO_LITE_PROMPT_CAP } from '@/lib/geo-access'

export const maxDuration = 60;

const SERPAPI_KEY = process.env.SERPAPI_KEY

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

// Helper to check if company is mentioned in text
function checkCompanyMention(text, companyName, websiteDomain = '') {
  if (!text || !companyName) return false
  const normalizedText = text.toLowerCase()
  const normalizedCompany = companyName.toLowerCase().trim()
  const strippedCompany = stripLegalSuffix(companyName).toLowerCase().trim()

  const variations = [
    normalizedCompany,
    normalizedCompany.replace(/\s+/g, ''),
    normalizedCompany.replace(/[.-]/g, ' '),
  ]

  // "Rkassa B.V." -> match ook gewoon "Rkassa" in tekst.
  if (strippedCompany && strippedCompany !== normalizedCompany) {
    variations.push(strippedCompany)
  }

  const firstWord = normalizedCompany.split(' ')[0]
  if (firstWord.length >= 5) {
    variations.push(firstWord)
  }
  
  if (websiteDomain) {
    const cleanDomain = websiteDomain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\.\w+$/, '')
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

  // Extract AI response text
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
            if (item.text_blocks && Array.isArray(item.text_blocks)) {
              text += extractTextFromBlocks(item.text_blocks)
            }
          })
        }
        if (block.text_blocks && Array.isArray(block.text_blocks)) {
          text += extractTextFromBlocks(block.text_blocks)
        }
      })
      return text
    }
    aiResponse = extractTextFromBlocks(data.text_blocks)
  }
  
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

  if (data.ai_overview?.text_blocks) {
    data.ai_overview.text_blocks.forEach(block => {
      if (block.snippet) aiResponse += ' ' + block.snippet
      if (block.list) {
        block.list.forEach(item => {
          if (item.snippet) aiResponse += ' ' + item.snippet
        })
      }
    })
  }

  if (data.conversation && Array.isArray(data.conversation)) {
    data.conversation.forEach(turn => {
      if (turn.content) aiResponse += ' ' + turn.content
    })
  }

  // Count company mentions
  if (aiResponse && companyName) {
    const regex = new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const matches = aiResponse.match(regex)
    if (matches) mentionCount = matches.length

    // Bij "Rkassa B.V.": probeer "Rkassa" als origineel niet matcht.
    if (!matches) {
      const stripped = stripLegalSuffix(companyName)
      if (stripped && stripped !== companyName) {
        const strippedRegex = new RegExp(`\\b${stripped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
        const strippedMatches = aiResponse.match(strippedRegex)
        if (strippedMatches) mentionCount = strippedMatches.length
      }
    }

    const firstName = companyName.split(' ')[0]
    if (firstName.length >= 5 && !mentionCount) {
      const firstNameRegex = new RegExp(`\\b${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      const firstNameMatches = aiResponse.match(firstNameRegex)
      if (firstNameMatches) mentionCount = firstNameMatches.length
    }
    
    if (!matches && websiteDomain) {
      const cleanDomain = websiteDomain.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
      if (cleanDomain && aiResponse.toLowerCase().includes(cleanDomain)) {
        mentionCount = Math.max(mentionCount, 1)
      }
    }
  }

  // Process sources/references
  const rawSources = data.references || data.sources || data.organic_results || data.ai_overview?.references || []
  rawSources.forEach(source => {
    const title = source.title || ''
    const link = source.link || source.url || ''
    const snippet = source.snippet || source.description || ''
    const domain = source.source || source.displayed_link || source.domain || ''
    
    const isCompany = checkCompanyMention(title, companyName, websiteDomain) || 
                      checkCompanyMention(link, companyName, websiteDomain) ||
                      checkCompanyMention(domain, companyName, websiteDomain)
    
    sources.push({ title, link, snippet, domain, isCompany })

    if (!isCompany && (title || domain)) {
      let companyFromTitle = ''
      if (title.includes(' - ')) {
        companyFromTitle = title.split(' - ').pop().trim()
      } else if (title.includes(' | ')) {
        companyFromTitle = title.split(' | ').pop().trim()
      }

      let companyFromDomain = (domain || '')
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

      // Filter via dezelfde lib zodat slogans/blog-titels ("Voor maximale
      // zichtbaarheid", "Cited in ChatGPT in 90 Days") niet als bedrijf
      // doorglippen. Domain-namen die door cleanCompetitorName te kort
      // worden gemaakt, vallen automatisch af.
      const cleaned = cleanCompetitorName(nameCandidate)
      // Gestripte naam zodat "Rkassa B.V." als userName ook competitor "Rkassa" uitsluit.
      const companyLower = (stripLegalSuffix(companyName) || companyName || '').toLowerCase()
      if (cleaned && isValidCompetitorName(cleaned, companyLower, COMPETITOR_EXCLUDE_LIST, new Set())) {
        competitorsMentioned.push(cleaned)
      }
    }
  })

  // Extract competitor names from AI response text via gedeelde lib
  // (zelfde filter + 5 patterns als ChatGPT/Perplexity in scan-selected-prompts).
  // De oude niche-regex pakte alleen "Kliniek/Centrum/Praktijk"-achtige namen,
  // miste alles in andere branches (SEO, marketing, juridisch, etc).
  if (aiResponse && companyName) {
    const textCompetitors = extractCompetitorsFromChatGPT(aiResponse, companyName)
    for (const name of textCompetitors) {
      competitorsMentioned.push(name)
    }
  }

  // Filter eigen merk uit via matchesBrand (word-overlap, normalisatie).
  const ownBrandFiltered = competitorsMentioned.filter(
    c => !matchesBrand(c, companyName, websiteDomain)
  )
  competitorsMentioned.length = 0
  competitorsMentioned.push(...ownBrandFiltered)

  // Check inline sources
  if (data.inline_sources) {
    data.inline_sources.forEach(source => {
      const isCompany = checkCompanyMention(source.title || '', companyName, websiteDomain) ||
                        checkCompanyMention(source.link || '', companyName, websiteDomain)
      if (isCompany) mentionCount++
    })
  }

  // Fallback: word-order variant in de AI-respons via textMentionsBrand
  // (lost bv. "Easydriving Rijschool" voor brand "Rijschool Easydriving" op).
  const responseHasBrand = aiResponse && textMentionsBrand(aiResponse, companyName, websiteDomain)
  const companyMentioned = mentionCount > 0 || sources.some(s => s.isCompany) || responseHasBrand
  if (responseHasBrand && mentionCount === 0) mentionCount = 1

  return {
    hasAiResponse: aiResponse.length > 0,
    companyMentioned,
    mentionCount,
    aiResponse: aiResponse.trim().slice(0, 2000),
    sources,
    competitorsMentioned: [...new Set(competitorsMentioned)]
  }
}

// Fetch from SerpAPI Google AI Mode — now with dynamic language
async function fetchGoogleAIMode(query, companyName, website = '', lang = 'nl') {
  const gl = lang === 'en' ? 'us' : 'nl'
  const hl = lang === 'en' ? 'en' : 'nl'

  const params = new URLSearchParams({
    engine: 'google_ai_mode',
    q: query,
    gl,
    hl,
    api_key: SERPAPI_KEY
  })

  try {
    console.log(`Fetching Google AI Mode for: "${query}" (lang=${lang}, gl=${gl})`)
    
    const url = `https://serpapi.com/search.json?${params}`
    console.log('Requesting URL:', url.replace(SERPAPI_KEY, 'HIDDEN'))
    
    const response = await fetch(url)
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
    
    console.log(`AI Mode response keys for "${query}":`, Object.keys(data))
    if (data.text_blocks) console.log(`text_blocks count: ${data.text_blocks.length}`)
    if (data.references) console.log(`references count: ${data.references.length}`)
    if (data.search_metadata?.status) console.log(`search status: ${data.search_metadata.status}`)
    
    const analysis = analyzeAIModeResponse(data, companyName, website || '')

    return {
      query,
      ...analysis,
      rawResponse: data
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
    if (!SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'SerpAPI key not configured. Set SERPAPI_KEY in environment.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { companyName, website, category, prompts, changedPrompts, skipSave, appendToScanId, userId: bodyUserId, integrationId, writeHistory } = body

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: 'At least one search query is required' }, { status: 400 })
    }

    // Authenticate: either as logged-in user (frontend flow) or via CRON_SECRET (cron flow).
    // For cron we use a service client and trust the userId from the body.
    const authHeader = request.headers.get('authorization') || ''
    const isCronCall = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`

    let supabase
    let user
    if (isCronCall) {
      if (!bodyUserId) {
        return NextResponse.json({ error: 'userId required for cron call' }, { status: 400 })
      }
      supabase = await createServiceClient()
      user = { id: bodyUserId }
    } else {
      supabase = await createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = authUser
    }

    // Lite-promptcap server-side. GEO Optimalisatie DIY is Lite + Pro; Lite mag
    // max 10 prompts per GEO Analyse, Pro/legacy/admin onbeperkt. Alleen het
    // frontend-pad wordt getoetst; cron (Pro auto-scan) en de Pro-chunking via
    // appendToScanId blijven ongemoeid. Een Lite-account scant nooit append,
    // dus die afwijzen sluit het accumulatie-gat van losse batches.
    if (!isCronCall) {
      const accessTier = await resolveGeoAccessTier(supabase, user)
      if (accessTier === 'lite' && (appendToScanId || prompts.length > GEO_LITE_PROMPT_CAP)) {
        return NextResponse.json({
          error: 'Met Lite scan je maximaal 10 GEO Analyse prompts. Upgrade naar Pro voor onbeperkt.',
          upgradeUrl: '/pricing',
          tierRequired: 'pro',
          promptCap: GEO_LITE_PROMPT_CAP,
        }, { status: 403 })
      }
    }

    // Detect language from prompt content
    const lang = detectLanguageFromPrompts(prompts)

    // ─── Incremental scan support ───
    // If frontend sends `changedPrompts`, we only run SerpAPI for those and
    // reuse existing results for the unchanged prompts.
    const incrementalMode = Array.isArray(changedPrompts) && changedPrompts.length > 0
    const changedSet = incrementalMode ? new Set(changedPrompts) : null

    let prevResultsByQuery = new Map()
    if (incrementalMode) {
      const { data: prevScan } = await supabase
        .from('google_ai_scans')
        .select('prompts, results')
        .eq('user_id', user.id)
        .eq('company_name', companyName)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prevScan?.prompts && Array.isArray(prevScan.results)) {
        for (let i = 0; i < prevScan.prompts.length; i++) {
          const p = prevScan.prompts[i]
          const r = prevScan.results[i]
          if (p && r) prevResultsByQuery.set(p, r)
        }
        console.log(`Google AI Mode: incremental mode, ${prevResultsByQuery.size} previous results loaded, ${changedPrompts.length} prompts to rescan`)
      } else {
        console.log('Google AI Mode: incremental requested but no previous scan found, falling back to full scan')
      }
    }

    console.log(`Google AI Mode scan: lang=${lang}, ${prompts.length} prompts, incremental=${incrementalMode && prevResultsByQuery.size > 0}`)

    // Create or fetch scan record (skip if single-prompt sequential mode).
    // Append-mode: caller geeft een bestaande scanId mee; we vullen die record
    // aan in plaats van een nieuwe row te maken (gebruikt voor Pro chunking
    // wanneer >10 prompts in batches gescand worden).
    let scan = null
    let existingResults = []
    let existingPromptsList = []
    let existingFoundCount = 0
    let existingHasAiResponseCount = 0

    if (appendToScanId && !skipSave) {
      const { data: existingScan, error: fetchError } = await supabase
        .from('google_ai_scans')
        .select('id, prompts, results, found_count, has_ai_overview_count')
        .eq('id', appendToScanId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !existingScan) {
        console.error('Error fetching scan to append:', fetchError?.message)
        return NextResponse.json({ error: 'Scan to append not found' }, { status: 404 })
      }
      scan = existingScan
      existingResults = Array.isArray(existingScan.results) ? existingScan.results : []
      existingPromptsList = Array.isArray(existingScan.prompts) ? existingScan.prompts : []
      existingFoundCount = existingScan.found_count || 0
      existingHasAiResponseCount = existingScan.has_ai_overview_count || 0
    } else if (!skipSave) {
      const { data: scanData, error: insertError } = await supabase
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
        return NextResponse.json({ error: 'Failed to create scan record' }, { status: 500 })
      }
      scan = scanData
    }

    // Process each query (skip unchanged in incremental mode)
    const results = []
    let foundCount = 0
    let hasAiResponseCount = 0
    let scanCount = 0

    for (const query of prompts) {
      // Incremental: reuse result for unchanged prompts
      if (incrementalMode && changedSet && !changedSet.has(query) && prevResultsByQuery.has(query)) {
        const reused = prevResultsByQuery.get(query)
        results.push({ ...reused, query })
        if (reused.hasAiResponse) hasAiResponseCount++
        if (reused.companyMentioned) foundCount++
        continue
      }

      if (scanCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 800))
      }
      scanCount++

      const result = await fetchGoogleAIMode(query, companyName, website, lang)
      
      const resultToStore = {
        query: result.query,
        hasAiResponse: result.hasAiResponse,
        hasAiOverview: result.hasAiResponse,
        companyMentioned: result.companyMentioned,
        mentionCount: result.mentionCount,
        aiResponse: result.aiResponse || '',
        textContent: result.aiResponse || '',
        sources: result.sources || [],
        references: result.sources || [],
        competitorsMentioned: result.competitorsMentioned || [],
        competitorsInSources: result.competitorsMentioned || [],
      }
      results.push(resultToStore)

      if (result.hasAiResponse) hasAiResponseCount++
      if (result.companyMentioned) foundCount++
      
      console.log(`Query "${query}": AI Response=${result.hasAiResponse}, Mentioned=${result.companyMentioned}`)
    }
    console.log(`Google AI Mode: ran ${scanCount} SerpAPI calls (${results.length - scanCount} reused)`)

    // Update scan record with results (skip if single-prompt mode).
    // Append-mode: merge nieuwe results en prompts in de bestaande row.
    if (!skipSave && scan) {
      const mergedResults = appendToScanId ? [...existingResults, ...results] : results
      const mergedPrompts = appendToScanId ? [...existingPromptsList, ...prompts] : prompts
      const mergedFoundCount = appendToScanId ? existingFoundCount + foundCount : foundCount
      const mergedHasAiResponseCount = appendToScanId ? existingHasAiResponseCount + hasAiResponseCount : hasAiResponseCount

      const { error: updateError } = await supabase
        .from('google_ai_scans')
        .update({
          results: mergedResults,
          prompts: mergedPrompts,
          total_queries: mergedPrompts.length,
          found_count: mergedFoundCount,
          has_ai_overview_count: mergedHasAiResponseCount,
          status: 'completed'
        })
        .eq('id', scan.id)

      if (updateError) {
        console.error('Error updating scan record:', updateError)
      }
    }

    // Optional: write 1 summary row to visibility_history (used by the weekly cron
    // to feed the dashboard chart with a google_ai_mode datapoint per run).
    if (writeHistory && integrationId) {
      try {
        const totalMentionsSum = results.reduce((sum, r) => sum + (r.mentionCount || 0), 0)
        const competitorCounts = {}
        for (const r of results) {
          for (const name of (r.competitorsMentioned || [])) {
            if (!name || typeof name !== 'string') continue
            const c = name.trim()
            if (c.length < 2 || c.length > 80) continue
            competitorCounts[c] = (competitorCounts[c] || 0) + 1
          }
        }
        const top = Object.entries(competitorCounts).sort((a, b) => b[1] - a[1])[0]

        await upsertVisibilityHistoryRow(supabase, {
          user_id: user.id,
          integration_id: integrationId,
          platform: 'google_ai_mode',
          prompts_total: prompts.length,
          prompts_found: foundCount,
          visibility_pct: prompts.length > 0 ? Math.round((foundCount / prompts.length) * 10000) / 100 : 0,
          total_mentions: totalMentionsSum,
          top_competitor: top ? top[0] : null,
          top_competitor_count: top ? top[1] : null,
        })
        console.log(`[ScanGoogleAI] visibility_history: 1 row upserted (google_ai_mode, day-bucket) for integration ${integrationId}`)
      } catch (e) {
        console.error('[ScanGoogleAI] writeHistory failed:', e?.message)
      }
    }

    return NextResponse.json({
      success: true,
      scanId: scan?.id || null,
      companyName,
      lang,
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

// GET endpoint unchanged
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
      return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error fetching Google AI scans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
