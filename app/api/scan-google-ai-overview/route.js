import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SERPAPI_KEY = process.env.SERPAPI_KEY
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Vercel function timeout
export const maxDuration = 300

// ══════════════════════════════════════════════════════
// HELPERS: Network
// ══════════════════════════════════════════════════════

async function fetchJsonWithRetry(url, { retries = 2, timeoutMs = 15000 } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
          continue
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data?.error) throw new Error(data.error)
      return data
    } catch (err) {
      clearTimeout(timer)
      lastError = err
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
        continue
      }
    }
  }
  throw lastError
}

// ══════════════════════════════════════════════════════
// HELPERS: AIO Detection & Parsing
// ══════════════════════════════════════════════════════

// Detect AIO candidate from SerpAPI response (ai_overview or answer_box fallback)
function getAiOverviewCandidate(data) {
  if (!data || typeof data !== 'object') return null
  if (data.ai_overview) return data.ai_overview

  const ab = data.answer_box
  if (ab) {
    const looksLikeAio =
      ab.type === 'ai_overview' ||
      Array.isArray(ab.text_blocks) ||
      Array.isArray(ab.references) ||
      Array.isArray(ab.sources) ||
      (typeof ab.snippet === 'string' && ab.snippet.length > 180)
    if (looksLikeAio) return ab
  }
  return null
}

// Normalize page_token response into clean AIO object
function normalizeAiOverviewPayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.ai_overview) return payload.ai_overview
  if (payload.text_blocks || payload.text || payload.references || payload.sources) return payload
  return null
}

// Recursively extract text from text_blocks (handles comparison, expandable, nested)
function extractTextFromBlocks(blocks) {
  if (!Array.isArray(blocks)) return ''
  let out = []

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue

    if (block.title && block.type === 'expandable') out.push(`${block.title}:`)
    if (block.snippet) out.push(block.snippet)
    if (block.text) out.push(block.text)

    if (Array.isArray(block.list)) {
      for (const item of block.list) {
        if (typeof item === 'string') { out.push(`- ${item}`); continue }
        if (item?.title) out.push(`- ${item.title}`)
        if (item?.snippet) out.push(`  ${item.snippet}`)
        if (item?.text) out.push(`  ${item.text}`)
        if (Array.isArray(item?.text_blocks)) {
          const nested = extractTextFromBlocks(item.text_blocks)
          if (nested) out.push(nested)
        }
      }
    }

    if (Array.isArray(block.text_blocks)) {
      const nested = extractTextFromBlocks(block.text_blocks)
      if (nested) out.push(nested)
    }

    if (Array.isArray(block.comparison)) {
      for (const row of block.comparison) {
        const values = Array.isArray(row?.values) ? row.values.join(' vs ') : ''
        if (row?.feature || values) {
          out.push(`${row.feature || 'Vergelijking'}: ${values}`.trim())
        }
      }
    }
  }
  return out.filter(Boolean).join('\n').trim()
}

// Extract text from any AIO object shape
function extractAioText(aiOverview) {
  if (!aiOverview) return ''
  if (Array.isArray(aiOverview.text_blocks)) return extractTextFromBlocks(aiOverview.text_blocks)
  if (typeof aiOverview.text === 'string') return aiOverview.text
  if (typeof aiOverview.snippet === 'string') return aiOverview.snippet
  if (typeof aiOverview.reconstructed_markdown === 'string') return aiOverview.reconstructed_markdown
  return ''
}

// ══════════════════════════════════════════════════════
// HELPERS: Sources & Competitors
// ══════════════════════════════════════════════════════

function extractReferences(aiOverview, companyName) {
  const sources = []
  const competitors = []
  const companyLower = (companyName || '').toLowerCase()

  const refArrays = [
    aiOverview?.references || [],
    aiOverview?.sources || []
  ]

  refArrays.forEach(refs => {
    if (!Array.isArray(refs)) return
    refs.forEach(ref => {
      const title = ref.title || ''
      const link = ref.link || ref.url || ''
      const snippet = ref.snippet || ''
      const domain = ref.source || ref.displayed_link || ''

      const isCompany = companyLower && [title, link, domain].some(t =>
        t.toLowerCase().includes(companyLower)
      )

      sources.push({ title, link, snippet, domain, isCompany })

      if (!isCompany && (title || domain)) {
        let companyFromTitle = ''
        if (title.includes(' - ')) companyFromTitle = title.split(' - ').pop().trim()
        else if (title.includes(' | ')) companyFromTitle = title.split(' | ').pop().trim()

        let companyFromDomain = domain
          .replace(/^www\./, '')
          .replace(/^https?:\/\//, '')
          .replace(/\/.*$/, '')
          .trim()

        const nameCandidate = companyFromTitle &&
          companyFromTitle.length > 2 &&
          companyFromTitle.length < 40 &&
          !/[?:$]/.test(companyFromTitle) &&
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

// ══════════════════════════════════════════════════════
// HELPERS: Company Mention Detection
// ══════════════════════════════════════════════════════

function normalizeText(s = '') {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s.-]/gu, ' ').replace(/\s+/g, ' ').trim()
}

function getDomainVariants(website = '') {
  if (!website) return []
  const host = website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
  const noTld = host.split('.').slice(0, -1).join('.')
  return [...new Set([host, noTld].filter(Boolean))]
}

function detectCompanyMention({ companyName, website, aiText, sources }) {
  const haystack = normalizeText(
    [aiText, ...sources.flatMap(s => [s.title || '', s.snippet || '', s.link || '', s.domain || ''])].join(' ')
  )

  const company = normalizeText(companyName)
  const companyNoSpaces = company.replace(/\s+/g, '')
  const domainVariants = getDomainVariants(website)

  const matchedByName = company && (haystack.includes(company) || haystack.includes(companyNoSpaces))
  const matchedByDomain = domainVariants.some(d => haystack.includes(d))

  let mentionCount = 0
  if (matchedByName) {
    for (const variant of [company, companyNoSpaces]) {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = haystack.match(new RegExp(escaped, 'g'))
      mentionCount += matches?.length || 0
    }
  }
  for (const d of domainVariants) {
    const escaped = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matches = haystack.match(new RegExp(escaped, 'g'))
    mentionCount += matches?.length || 0
  }

  return {
    companyMentioned: matchedByName || matchedByDomain,
    mentionCount: Math.max(mentionCount, matchedByName || matchedByDomain ? 1 : 0)
  }
}

// ══════════════════════════════════════════════════════
// CORE: Single AIO Search (mobile + desktop fallback)
// ══════════════════════════════════════════════════════

async function runGoogleAioSearch({ searchQuery, companyName, website, lang, fresh = false }) {
  const gl = lang === 'en' ? 'us' : 'nl'
  const hl = lang === 'en' ? 'en' : 'nl'
  const googleDomain = lang === 'nl' ? 'google.nl' : 'google.com'

  const common = new URLSearchParams({
    engine: 'google',
    q: searchQuery,
    api_key: SERPAPI_KEY,
    gl, hl,
    google_domain: googleDomain,
    num: '10'
  })
  if (fresh) common.set('no_cache', 'true')

  // Try mobile first (81% of AIOs), then desktop as fallback
  for (const device of ['mobile', 'desktop']) {
    common.set('device', device)

    let data
    try {
      data = await fetchJsonWithRetry(`https://serpapi.com/search.json?${common.toString()}`)
    } catch (err) {
      console.error(`SerpAPI ${device} fetch failed for "${searchQuery}":`, err.message)
      continue
    }

    console.log(`[${device}] Google search keys for "${searchQuery}":`, Object.keys(data))

    let aiOverview = getAiOverviewCandidate(data)
    const rawAioDetected = !!aiOverview
    let tokenFetchSucceeded = false

    // Fetch full AIO via page_token if available
    if (aiOverview?.page_token) {
      console.log(`[${device}] Found page_token for "${searchQuery}", fetching full AIO...`)
      const tokenParams = new URLSearchParams({
        engine: 'google_ai_overview',
        page_token: aiOverview.page_token,
        api_key: SERPAPI_KEY
      })

      try {
        const tokenPayload = await fetchJsonWithRetry(
          `https://serpapi.com/search.json?${tokenParams.toString()}`,
          { retries: 1, timeoutMs: 12000 }
        )
        const normalized = normalizeAiOverviewPayload(tokenPayload)
        if (normalized) {
          aiOverview = normalized
          tokenFetchSucceeded = true
        }
      } catch (e) {
        console.log(`[${device}] page_token fetch failed: ${e.message}, using initial data`)
        // keep initial aiOverview
      }
    }

    if (!aiOverview) {
      if (device === 'mobile') {
        console.log(`[mobile] No AIO for "${searchQuery}", trying desktop...`)
        continue // try desktop
      }
      // Both failed
      break
    }

    // Extract text
    const aiText = extractAioText(aiOverview)
    const refData = extractReferences(aiOverview, companyName)
    const mentionData = detectCompanyMention({ companyName, website, aiText, sources: refData.sources })

    const aioStatus = aiText.trim()
      ? 'present_with_text'
      : rawAioDetected
        ? 'present_without_text'
        : 'not_detected'

    console.log(`[${device}] "${searchQuery}": aioStatus=${aioStatus}, mentioned=${mentionData.companyMentioned}, sources=${refData.sources.length}`)

    return {
      searchQuery,
      usedDevice: device,
      rawAioDetected,
      tokenFetchSucceeded,
      aioStatus,
      hasAiOverview: aioStatus !== 'not_detected',
      hasAiResponse: aioStatus === 'present_with_text',
      aiOverviewText: aiText.slice(0, 4000),
      textContent: aiText.slice(0, 4000),
      aiResponse: aiText.slice(0, 4000),
      sources: refData.sources,
      references: refData.sources,
      competitorsMentioned: refData.competitors,
      competitorsInSources: refData.competitors,
      companyMentioned: mentionData.companyMentioned,
      mentionCount: mentionData.mentionCount,
      searchStatus: data?.search_metadata?.status || null,
      searchId: data?.search_metadata?.id || null
    }
  }

  // Neither mobile nor desktop found AIO
  return {
    searchQuery,
    usedDevice: null,
    rawAioDetected: false,
    tokenFetchSucceeded: false,
    aioStatus: 'not_detected',
    hasAiOverview: false,
    hasAiResponse: false,
    aiOverviewText: '',
    textContent: '',
    aiResponse: '',
    sources: [],
    references: [],
    competitorsMentioned: [],
    competitorsInSources: [],
    companyMentioned: false,
    mentionCount: 0,
    searchStatus: null,
    searchId: null
  }
}

// ══════════════════════════════════════════════════════
// LANGUAGE DETECTION
// ══════════════════════════════════════════════════════

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

  return englishScore > dutchScore * 1.3 ? 'en' : 'nl'
}

// ══════════════════════════════════════════════════════
// PROMPT TRANSFORM (Claude)
// ══════════════════════════════════════════════════════

function getTransformSystemPrompt(lang) {
  if (lang === 'en') {
    return `You are an expert in Google AI Overviews. Your task: convert commercial AI prompts into informational Google search queries that TRIGGER AI Overviews.

AI OVERVIEW TRIGGER RULES (based on research):
- AI Overviews appear in 90-100% of informational "what/how/when/why" queries
- Long-tail queries (7+ words) trigger AIOs 50%+ of the time
- Queries about costs, steps, comparisons, pros/cons have the highest trigger rate
- Decision-oriented queries ("when to hire", "how to choose") trigger AIOs for business citations
- Practical expertise questions win over encyclopedia definitions

CONVERSION RULES:
- Each query should be 6-12 words (long-tail = higher AIO chance)
- MUST start with a trigger word: "what", "how", "when", "why", "difference between", "costs of", "steps to", "pros and cons"
- Convert "find me a provider" into "when do I need this service" or "how does this work" or "what does this cost"
- Keep the INDUSTRY/TOPIC but change intent from transactional to informational
- NO company names or "best/top/good"
- City names ARE allowed when they add local context (local queries trigger business citations)

EXAMPLES:
- "Which SEO agencies in Amsterdam are good" -> "when should you hire an SEO specialist"
- "Recommend a good real estate lawyer" -> "what does a real estate lawyer cost per hour"
- "Best web design agency for webshops" -> "how much does a professional webshop cost"
- "Which accountants handle international tax" -> "how does international tax work for businesses"
- "Find a reliable contractor for renovation" -> "steps to take when renovating your home"
- "Good physiotherapist for back pain" -> "when to see a physiotherapist for back pain"

Reply ONLY with a JSON array of strings, one per prompt, in the same order. No explanation.`
  }

  return `Je bent een expert in Google AI Overviews. Je taak: zet commerciele AI-prompts om naar informatieve Google-zoekopdrachten die AI Overviews TRIGGEREN.

AI OVERVIEW TRIGGER REGELS (gebaseerd op onderzoek):
- AI Overviews verschijnen bij 90-100% van informatieve "wat/hoe/wanneer/waarom" vragen
- Long-tail queries (7+ woorden) triggeren AIOs in 50%+ van gevallen
- Vragen over kosten, stappenplannen, vergelijkingen, voor-/nadelen hebben de hoogste trigger-kans
- Beslissingsvragen ("wanneer inhuren", "hoe kiezen") triggeren AIOs met bedrijfscitaties
- Praktische expertisevragen winnen van encyclopedische definities

CONVERSIEREGELS:
- Elke query moet 6-12 woorden zijn (long-tail = hogere AIO-kans)
- MOET beginnen met een triggerwoord: "wat kost", "hoe werkt", "wanneer", "waarom", "verschil tussen", "stappenplan voor", "voor- en nadelen van"
- Zet "vind een aanbieder" om naar "wanneer heb ik dit nodig" of "hoe werkt dit" of "wat kost dit"
- Behoud de BRANCHE/HET ONDERWERP maar verander de intentie van transactioneel naar informationeel
- GEEN bedrijfsnamen of "beste/top/goede"
- Plaatsnamen MOGEN als ze lokale context toevoegen (lokale queries triggeren bedrijfscitaties)

VOORBEELDEN:
- "Welk SEO bureau in Amsterdam is goed" -> "wanneer SEO specialist inhuren voor je website"
- "Kun je een goede vastgoedadvocaat aanbevelen" -> "wat kost een vastgoedadvocaat per uur"
- "Beste webdesign bureau voor webshops" -> "hoeveel kost een professionele webshop laten maken"
- "Welke accountants doen internationale belastingen" -> "hoe werkt internationale belastingaangifte voor bedrijven"
- "Zoek een betrouwbare aannemer voor verbouwing" -> "stappenplan verbouwing woning wat komt erbij kijken"
- "Goede fysiotherapeut voor rugpijn" -> "wanneer naar fysiotherapeut bij rugklachten"
- "Ik zoek een ervaren SEO specialist in Amsterdam" -> "wat kost SEO uitbesteden aan een specialist"
- "Welk online marketing bureau combineert SEO en website snelheid" -> "verschil tussen SEO en website snelheid optimalisatie"

Antwoord ALLEEN met een JSON array van strings, een per prompt, in dezelfde volgorde. Geen uitleg.`
}

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
          ? `Convert these ${prompts.length} commercial prompts into informational Google search queries that trigger AI Overviews:\n\n${promptList}`
          : `Zet deze ${prompts.length} commerciele prompts om naar informatieve Google-zoekopdrachten die AI Overviews triggeren:\n\n${promptList}`
      }]
    })

    const text = response.content[0].text.trim()
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
    const queries = JSON.parse(cleaned)

    if (Array.isArray(queries) && queries.length === prompts.length) {
      console.log('Claude transformed prompts:', prompts.map((p, i) => `"${p}" -> "${queries[i]}"`).join(', '))
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

function fallbackTransform(prompt) {
  let q = prompt.trim().replace(/[?!.]+$/, '')

  q = q
    .replace(/^(?:kun je|welke|geef|noem|heb je|ken je|wat zijn de|lijst|can you|which|give|list|what are the)\s+(?:mij |me |een aantal |de |het |some |the )?(?:beste|top|goede|betrouwbare|ervaren|gerenommeerde|best|top|good|reliable|experienced)?\s*/i, '')
    .replace(/\s+(?:in|te|near|around)\s+(?:amsterdam|rotterdam|den haag|utrecht|eindhoven|nederland|london|new york|los angeles)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Add AIO trigger prefix if missing
  if (!/^(wat|hoe|wanneer|waarom|verschil|what|how|when|why|difference)/i.test(q)) {
    q = `wat kost ${q}`
  }

  if (q.length < 5) q = prompt.split(' ').slice(0, 5).join(' ')
  if (q.length > 80) q = q.substring(0, 80).replace(/\s\w*$/, '')

  return { searchQuery: q, originalPrompt: prompt }
}

// ══════════════════════════════════════════════════════
// POST HANDLER
// ══════════════════════════════════════════════════════

export async function POST(request) {
  try {
    if (!SERPAPI_KEY) {
      return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 500 })
    }

    const { companyName, website, prompts, skipSave, transformedQueries: preTransformed, fresh } = await request.json()

    if (!companyName || !prompts || prompts.length === 0) {
      return NextResponse.json({ error: 'companyName en prompts zijn verplicht' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const promptsToScan = prompts.slice(0, 10)
    const lang = detectLanguageFromPrompts(promptsToScan)
    console.log(`AI Overview scan: lang=${lang}, ${promptsToScan.length} prompts, fresh=${!!fresh}`)

    // Transform prompts
    let transformedQueries
    if (preTransformed && Array.isArray(preTransformed) && preTransformed.length === promptsToScan.length) {
      console.log('Using pre-transformed queries from frontend')
      transformedQueries = preTransformed
    } else {
      transformedQueries = await transformPromptsToSearchQueries(promptsToScan, lang)
    }

    // Scan each prompt
    const results = []
    for (let i = 0; i < promptsToScan.length; i++) {
      const prompt = promptsToScan[i]
      try {
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }

        const { searchQuery } = transformedQueries[i]

        const result = await runGoogleAioSearch({
          searchQuery,
          companyName,
          website: website || '',
          lang,
          fresh: !!fresh
        })

        results.push({
          query: prompt,
          ...result
        })

      } catch (queryError) {
        console.error(`Error scanning query "${prompt}":`, queryError)
        results.push({
          query: prompt,
          searchQuery: transformedQueries[i]?.searchQuery || prompt,
          usedDevice: null,
          rawAioDetected: false,
          tokenFetchSucceeded: false,
          aioStatus: 'not_detected',
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

      if (dbError) console.error('Database error:', dbError)
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
