import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { upsertVisibilityHistoryRow } from '@/lib/visibility-history'
import { stripLegalSuffix } from '@/lib/branche-detect'
import { matchesBrand } from '@/lib/rank-scanner'

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

function extractReferences(aiOverview, companyName, websiteDomain = null) {
  const sources = []
  const competitors = []
  const companyLower = (companyName || '').toLowerCase()
  // "Rkassa B.V." -> match ook gewoon "Rkassa" in titel/domein.
  const companyLowerStripped = stripLegalSuffix(companyName || '').toLowerCase()

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

      const isCompany = (companyLower || companyLowerStripped) && [title, link, domain].some(t => {
        const lower = t.toLowerCase()
        return (companyLower && lower.includes(companyLower))
          || (companyLowerStripped && companyLowerStripped !== companyLower && lower.includes(companyLowerStripped))
      })

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

  // Filter eigen merk uit via gedeelde matchesBrand (word-overlap, normalisatie).
  const dedup = [...new Set(competitors)]
  const filtered = dedup.filter(c => !matchesBrand(c, companyName, websiteDomain))
  return { sources, competitors: filtered.slice(0, 10) }
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
  const companyStripped = normalizeText(stripLegalSuffix(companyName || ''))
  const domainVariants = getDomainVariants(website)

  // Bouw variants-set: origineel + zonder spaces + gestript (zodat "Rkassa B.V."
  // matcht op "Rkassa" in de AI-tekst).
  const nameVariants = [company, companyNoSpaces]
  if (companyStripped && companyStripped !== company) nameVariants.push(companyStripped)
  const uniqueNameVariants = [...new Set(nameVariants.filter(Boolean))]

  const matchedByName = uniqueNameVariants.some(v => haystack.includes(v))
  const matchedByDomain = domainVariants.some(d => haystack.includes(d))

  let mentionCount = 0
  if (matchedByName) {
    for (const variant of uniqueNameVariants) {
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
  // SerpAPI's AIO retrieval is stabiel/officieel ondersteund alleen voor hl=en +
  // een beperkte set gl's. Met NL hl/gl krijg je wel een page_token-stub maar de
  // expanded fetch faalt structureel. Daarom hardcoden we EN-context voor AIO.
  // Google AI Mode (andere route) blijft gewoon NL.
  const gl = 'us'
  const hl = 'en'
  const googleDomain = 'google.com'

  const common = new URLSearchParams({
    engine: 'google',
    q: searchQuery,
    api_key: SERPAPI_KEY,
    gl, hl,
    google_domain: googleDomain,
    num: '10'
  })
  // We bootsen exact de werkende browser-test na: geen no_cache, geen json_restrictor.
  // Beide eerder geprobeerd maar dat brak de follow-up retrieval.

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

    // Tijdelijke debug-log: laat zien wat SerpAPI in het initial ai_overview-blok
    // terugstuurt (alleen page_token+serpapi_link, of al text_blocks/references).
    if (aiOverview) {
      console.log(`[${device}] AIO raw for "${searchQuery}":`, JSON.stringify(aiOverview, null, 2).slice(0, 2000))
    }

    // Fetch full AIO via serpapi_link (voorkeur) of page_token (fallback)
    if (aiOverview?.serpapi_link || aiOverview?.page_token) {
      console.log(`[${device}] Found AIO follow-up for "${searchQuery}", fetching full AIO...`)

      // SerpAPI's eigen doorverwijzing voor deferred AIO-fetches als die meekomt;
      // anders bouwen we de URL zelf met engine=google_ai_overview + page_token.
      // Geen no_cache: de werkende browser-test gebruikt hem ook niet.
      const aioUrl = aiOverview.serpapi_link
        ? `${aiOverview.serpapi_link}${aiOverview.serpapi_link.includes('?') ? '&' : '?'}api_key=${SERPAPI_KEY}`
        : `https://serpapi.com/search.json?${new URLSearchParams({
            engine: 'google_ai_overview',
            page_token: aiOverview.page_token,
            api_key: SERPAPI_KEY
          }).toString()}`

      try {
        const tokenPayload = await fetchJsonWithRetry(
          aioUrl,
          { retries: 1, timeoutMs: 20000 }
        )
        console.log(`[${device}] AIO follow-up keys:`, Object.keys(tokenPayload || {}))
        const normalized = normalizeAiOverviewPayload(tokenPayload)
        if (normalized) {
          aiOverview = normalized
          tokenFetchSucceeded = true
        }
      } catch (e) {
        console.log(`[${device}] AIO follow-up failed: ${e.message}, using initial data`)
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

    // Extract text + AIO references
    const aiText = extractAioText(aiOverview)
    const refData = extractReferences(aiOverview, companyName, website)

    // Fallback op organic_results wanneer de expanded AIO faalt: SerpAPI levert
    // wel een ai_overview-stub maar geen text_blocks/references. De gewone SERP-
    // resultaten bevatten vaak alsnog ons bedrijf (bv. OnlineLabs op positie 6).
    // Zonder deze fallback zou companyMentioned=false zijn terwijl Google ons wel
    // toont in de eerste SERP-pagina.
    const organicSources = Array.isArray(data.organic_results)
      ? data.organic_results.map(r => ({
          title: r.title || '',
          link: r.link || '',
          snippet: r.snippet || '',
          domain: r.displayed_link || r.source || '',
          position: r.position || null,
          isCompany: false,
          sourceType: 'organic',
        }))
      : []
    const fallbackSources = refData.sources.length ? refData.sources : organicSources
    const mentionData = detectCompanyMention({ companyName, website, aiText, sources: fallbackSources })

    const aioStatus = aiText.trim()
      ? 'present_with_text'
      : rawAioDetected
        ? 'present_with_token'
        : 'not_detected'

    // Fallback fragment: als de AIO geen tekst gaf, bouw een snippet uit de
    // top organic snippets zodat de UI tenminste een leesbaar fragment toont
    // (in plaats van een lege AIO-kaart) wanneer aioStatus = present_with_token.
    const fallbackFragment = aiText.trim()
      ? aiText
      : organicSources.slice(0, 3).map(s => s.snippet).filter(Boolean).join(' ')

    console.log(`[${device}] "${searchQuery}": aioStatus=${aioStatus}, mentioned=${mentionData.companyMentioned}, sources=${fallbackSources.length} (${refData.sources.length} aio + ${organicSources.length} organic)`)

    return {
      searchQuery,
      usedDevice: device,
      rawAioDetected,
      tokenFetchSucceeded,
      aioStatus,
      hasAiOverview: aioStatus !== 'not_detected',
      hasAiResponse: aioStatus === 'present_with_text',
      aiOverviewText: fallbackFragment.slice(0, 4000),
      textContent: fallbackFragment.slice(0, 4000),
      aiResponse: fallbackFragment.slice(0, 4000),
      sources: fallbackSources,
      references: fallbackSources,
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
    return `You are an expert in Google AI Overviews. Your task: convert commercial AI prompts into SHORT Google search queries that produce an expanded AI Overview WITH local business citations.

GOAL:
Long or complex queries (12+ words with modifiers like "for X", "that combines Y") only trigger an inline preview AIO without an expanded version, and Google does NOT cite businesses in those. Short buying-guide queries (5-8 words) trigger an expanded AIO in which Google does name local businesses.

CORE RULES:
- Maximum 9 words per query. Aim for 5-7. Shorter is better. Multi-word cities ("The Hague", "New York") count as one location.
- 1 concept + city. STRIP all subclauses such as "for AI search visibility", "with experience in ChatGPT", "that combines SEO and conversion", "for measurable growth". Keep only the core service + city.
- City name MANDATORY to keep when present in the original prompt. Local intent is the strongest driver for business citations.
- No city in the original? Keep the query short and investigative without a city.
- NO company names.
- Avoid bare superlatives like "best/top". "A good X" in choice context is fine.

TRIGGER FORMS (vary across all three, do NOT use only one form):
- "what does [service] cost in [city]"
- "how to find a good [service] in [city]"
- "what to look for when choosing [service] [city]"

VARIATION RULE: Distribute your queries roughly evenly across the three forms. Avoid generating 10 queries that all start with "what does ... cost". Mix it up.

EXAMPLES:
- "I'm looking for an experienced SEO agency in Amsterdam that also helps with AI search visibility" -> "what does an SEO agency cost in Amsterdam"
- "Which SEO agency in Amsterdam has experience with AI visibility in ChatGPT and Perplexity?" -> "how to find a good SEO agency in Amsterdam"
- "Looking for an SEO specialist in Amsterdam with proven results" -> "what to look for when choosing SEO specialist Amsterdam"
- "Which online marketing agency in Amsterdam combines SEO, speed and conversion?" -> "what does a marketing agency cost in Amsterdam"
- "I'm looking for an agency in Amsterdam to optimize my WordPress site for Google and AI platforms" -> "how to find good WordPress optimization Amsterdam"
- "Looking for GEO experts in Amsterdam for LLM visibility in ChatGPT" -> "what to look for when choosing GEO optimization Amsterdam"
- "Recommend a good real estate lawyer in The Hague" -> "how to find a good real estate lawyer in The Hague"
- "Which notary in Eindhoven is reliable for a mortgage deed" -> "what to look for when choosing notary Eindhoven"
- "I'm looking for an experienced physiotherapist for back pain in Utrecht" -> "what does a physiotherapist cost in Utrecht"

Reply ONLY with a JSON array of strings, one per prompt, in the same order. No explanation.`
  }

  return `Je bent een expert in Google AI Overviews. Je taak: zet commerciele AI-prompts om naar KORTE Google-zoekopdrachten die een uitgebreide AI Overview MET lokale bedrijfsvermelding opleveren.

DOEL:
Lange of complexe queries (12+ woorden met modifiers zoals "voor X", "die Y combineert") leveren alleen een inline preview-AIO op zonder uitgebreide versie, en Google citeert daar GEEN bedrijven in. Korte buying-guide queries (5-8 woorden) leveren wel een uitgebreide AIO op waarin Google lokale bedrijven noemt.

KERNREGELS:
- Maximaal 9 woorden per query. Richt op 5-7. Korter is beter. Multi-woord steden ("Den Haag") tellen als 1 locatie.
- 1 concept + stad. STRIP alle bijzinnen zoals "voor AI-vindbaarheid", "met ervaring in ChatGPT", "die SEO en GEO combineert", "voor meetbare groei". Alleen kern-branche + stad blijven over.
- Plaatsnaam VERPLICHT BEHOUDEN als die in de originele prompt staat. Lokale intentie is de sterkste driver voor bedrijfscitaties.
- Geen plaatsnaam in origineel? Houd de query kort en investigatief zonder stad.
- GEEN bedrijfsnamen.
- Vermijd kale superlatieven als "beste/top". "Een goede X" in keuze-context mag wel.

TRIGGERVORMEN (varieer over alle drie de vormen, niet alleen 1 gebruiken):
- "wat kost [dienst] in [stad]"
- "hoe vind je een goed [dienst] in [stad]"
- "waar moet je op letten bij [dienst] [stad]"

VARIATIE-REGEL: Verdeel je queries ongeveer gelijkmatig over de drie vormen. Vermijd 10 queries die allemaal beginnen met "wat kost". Wissel af.

VOORBEELDEN:
- "Ik zoek een ervaren SEO bureau in Amsterdam dat ook helpt met vindbaarheid in AI-zoekmachines" -> "wat kost een SEO bureau in Amsterdam"
- "Welk SEO bureau in Amsterdam heeft ervaring met AI-zichtbaarheid in ChatGPT en Perplexity?" -> "hoe vind je een goed SEO bureau in Amsterdam"
- "Op zoek naar een SEO specialist in Amsterdam met aantoonbare resultaten" -> "waar moet je op letten bij SEO specialist Amsterdam"
- "Welk online marketing bureau in Amsterdam combineert SEO, snelheid en conversie?" -> "wat kost een marketingbureau in Amsterdam"
- "Ik zoek een bureau in Amsterdam dat mijn WordPress website kan optimaliseren voor Google en AI" -> "hoe vind je goede WordPress optimalisatie Amsterdam"
- "Zoek GEO experts in Amsterdam voor LLM-zichtbaarheid in ChatGPT" -> "waar moet je op letten bij GEO optimalisatie Amsterdam"
- "Welk bureau in Nederland is gespecialiseerd in GEO optimalisatie en AI-vindbaarheid?" -> "wat kost GEO optimalisatie voor bedrijven"
- "Kun je een goede vastgoedadvocaat in Den Haag aanbevelen" -> "hoe vind je een goede vastgoedadvocaat in Den Haag"
- "Welke notaris in Eindhoven is betrouwbaar voor een hypotheekakte" -> "waar moet je op letten bij notaris Eindhoven"
- "Ik zoek een ervaren fysiotherapeut voor rugklachten in Utrecht" -> "wat kost een fysiotherapeut in Utrecht"

Antwoord ALLEEN met een JSON array van strings, een per prompt, in dezelfde volgorde. Geen uitleg.`
}

async function transformPromptsToSearchQueries(prompts, lang = 'nl') {
  try {
    const promptList = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
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
    // Transactionele aanhef eraf (kun je / welke / ik zoek / can you / which / ...).
    .replace(/^(?:kun je|kunt u|welke|welk|geef(?: mij| me)?|noem|heb je|ken je|wat zijn de|lijst|ik zoek(?: een)?|can you|which|give(?: me)?|list|what are the|i'?m looking for(?: an?)?|find(?: me)?(?: an?)?)\s+/i, '')
    // Kale superlatieven eraf
    .replace(/\b(beste|top|goede|betrouwbare|ervaren|gerenommeerde|best|good|reliable|experienced)\s+/gi, '')
    // Trailing "is goed/beste/best/good/betrouwbaar" patronen
    .replace(/\s+(?:is|are|zijn)\s+(?:beste|goed|goede|best|good|reliable|betrouwbaar)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Cap input op 6 woorden zodat totaal (incl. "wat kost"-prefix) binnen ~8 blijft.
  // Lange queries triggeren alleen een preview-AIO zonder bedrijfsvermeldingen.
  const inputWords = q.split(/\s+/).filter(Boolean)
  if (inputWords.length > 6) q = inputWords.slice(0, 6).join(' ')

  // Begint al met een bedrijf-zoekende triggervorm? Laat staan, anders prefix met "wat kost".
  const alreadyTrigger = /^(wat kost|hoe vind|waar moet je op letten|what does|how to find|what to look)/i.test(q)
  if (!alreadyTrigger) {
    q = `wat kost ${q}`
  }

  if (q.length < 5) q = prompt.split(' ').slice(0, 5).join(' ')

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

    const { companyName, website, prompts, changedPrompts, skipSave, transformedQueries: preTransformed, fresh, appendToScanId, userId: bodyUserId, integrationId, writeHistory } = await request.json()

    if (!companyName || !prompts || prompts.length === 0) {
      return NextResponse.json({ error: 'companyName en prompts zijn verplicht' }, { status: 400 })
    }

    // Authenticate: either as logged-in user (frontend flow) or via CRON_SECRET (cron flow).
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

    // Frontend bepaalt batch-grootte op basis van tier (Lite cap 10, Pro chunkt onbeperkt in batches ≤ 10).
    const promptsToScan = prompts
    const lang = detectLanguageFromPrompts(promptsToScan)

    // ─── Incremental scan support ───
    // If frontend sends `changedPrompts`, we only run SerpAPI for those and
    // reuse existing results for the unchanged prompts (saves credits + time).
    // If `changedPrompts` is absent/empty or `fresh=true`, full rescan.
    const incrementalMode = Array.isArray(changedPrompts) && changedPrompts.length > 0 && !fresh
    const changedSet = incrementalMode ? new Set(changedPrompts) : null

    // Load previous scan results for merging (only in incremental mode)
    let prevResultsByQuery = new Map()
    if (incrementalMode) {
      const { data: prevScan } = await supabase
        .from('google_ai_overview_scans')
        .select('prompts, results')
        .eq('user_id', user.id)
        .eq('company_name', companyName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prevScan?.prompts && Array.isArray(prevScan.results)) {
        for (let i = 0; i < prevScan.prompts.length; i++) {
          const p = prevScan.prompts[i]
          const r = prevScan.results[i]
          if (p && r) prevResultsByQuery.set(p, r)
        }
        console.log(`AI Overview: incremental mode, ${prevResultsByQuery.size} previous results loaded, ${changedPrompts.length} prompts to rescan`)
      } else {
        console.log('AI Overview: incremental requested but no previous scan found, falling back to full scan')
      }
    }

    console.log(`AI Overview scan: lang=${lang}, ${promptsToScan.length} prompts, fresh=${!!fresh}, incremental=${incrementalMode && prevResultsByQuery.size > 0}`)

    // Transform prompts in de oorspronkelijke taal. NL prompts → NL search queries.
    // De SerpAPI-context wordt apart naar hl=en/gl=us geforceerd in runGoogleAioSearch.
    let transformedQueries
    if (preTransformed && Array.isArray(preTransformed) && preTransformed.length === promptsToScan.length) {
      console.log('Using pre-transformed queries from frontend')
      transformedQueries = preTransformed
    } else {
      transformedQueries = await transformPromptsToSearchQueries(promptsToScan, lang)
    }

    // Scan each prompt (skip unchanged in incremental mode)
    const results = []
    let scanCount = 0
    for (let i = 0; i < promptsToScan.length; i++) {
      const prompt = promptsToScan[i]

      // Incremental: if prompt is unchanged and we have previous result, reuse it
      if (incrementalMode && changedSet && !changedSet.has(prompt) && prevResultsByQuery.has(prompt)) {
        const reused = prevResultsByQuery.get(prompt)
        results.push({ ...reused, query: prompt })
        continue
      }

      try {
        if (scanCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }
        scanCount++

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
    console.log(`AI Overview: ran ${scanCount} SerpAPI calls (${results.length - scanCount} reused from previous scan)`)

    // Calculate totals
    const foundCount = results.filter(r => r.companyMentioned).length
    const hasAiOverviewCount = results.filter(r => r.hasAiOverview).length

    // Save to database.
    // Append-mode: caller geeft een bestaande scanId mee; we vullen die record aan
    // in plaats van een nieuwe row te maken (gebruikt voor Pro chunking >10 prompts).
    let mergedScanId = null
    let mergedTotalQueries = promptsToScan.length
    let mergedFoundCount = foundCount
    let mergedHasAiOverviewCount = hasAiOverviewCount

    if (appendToScanId && !skipSave) {
      const { data: existingScan, error: fetchError } = await supabase
        .from('google_ai_overview_scans')
        .select('id, prompts, results, found_count, has_ai_overview_count')
        .eq('id', appendToScanId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !existingScan) {
        console.error('Error fetching scan to append:', fetchError?.message)
        return NextResponse.json({ error: 'Scan to append not found' }, { status: 404 })
      }

      const existingResults = Array.isArray(existingScan.results) ? existingScan.results : []
      const existingPromptsList = Array.isArray(existingScan.prompts) ? existingScan.prompts : []
      const mergedResults = [...existingResults, ...results]
      const mergedPrompts = [...existingPromptsList, ...promptsToScan]
      mergedFoundCount = (existingScan.found_count || 0) + foundCount
      mergedHasAiOverviewCount = (existingScan.has_ai_overview_count || 0) + hasAiOverviewCount
      mergedTotalQueries = mergedPrompts.length
      mergedScanId = existingScan.id

      const { error: updateError } = await supabase
        .from('google_ai_overview_scans')
        .update({
          prompts: mergedPrompts,
          results: mergedResults,
          found_count: mergedFoundCount,
          has_ai_overview_count: mergedHasAiOverviewCount,
          total_queries: mergedTotalQueries,
          status: 'completed'
        })
        .eq('id', existingScan.id)

      if (updateError) console.error('Database update error:', updateError)
    } else if (!skipSave) {
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
      mergedScanId = dbRecord?.id || null
    }

    // Optional: write 1 summary row to visibility_history (used by the weekly cron
    // to feed the dashboard chart with a google_ai_overviews datapoint per run).
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
          platform: 'google_ai_overviews',
          prompts_total: promptsToScan.length,
          prompts_found: foundCount,
          visibility_pct: promptsToScan.length > 0 ? Math.round((foundCount / promptsToScan.length) * 10000) / 100 : 0,
          total_mentions: totalMentionsSum,
          top_competitor: top ? top[0] : null,
          top_competitor_count: top ? top[1] : null,
        })
        console.log(`[ScanAIO] visibility_history: 1 row upserted (google_ai_overviews, day-bucket) for integration ${integrationId}`)
      } catch (e) {
        console.error('[ScanAIO] writeHistory failed:', e?.message)
      }
    }

    return NextResponse.json({
      success: true,
      scanId: mergedScanId,
      companyName,
      lang,
      totalQueries: mergedTotalQueries,
      foundCount: mergedFoundCount,
      hasAiOverviewCount: mergedHasAiOverviewCount,
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
