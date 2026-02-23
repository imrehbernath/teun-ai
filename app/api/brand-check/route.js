// app/api/brand-check/route.js
// ============================================
// AI BRAND CHECK API — Public (no auth required)
// Single-query mode: 1 prompt → Perplexity + ChatGPT parallel
// Frontend calls this 3x sequentially for real progress
// ============================================

export const maxDuration = 60

import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ============================================
// PROMPTS per query type
// ============================================
const PROMPTS = {
  nl: {
    experiences: (brand, loc) => `Wat zijn ervaringen met ${brand}${loc ? ' in ' + loc : ''}? Is het betrouwbaar?`,
    reviews: (brand) => `${brand} reviews, klachten en beoordelingen`,
    service: (brand, loc, cat) => `Is ${brand}${loc ? ' in ' + loc : ''} een goed bedrijf voor ${cat}? Bereikbaarheid, service en kwaliteit?`,
  },
  en: {
    experiences: (brand, loc) => `What are experiences with ${brand}${loc ? ' in ' + loc : ''}? Is it reliable?`,
    reviews: (brand) => `${brand} reviews, complaints and ratings`,
    service: (brand, loc, cat) => `Is ${brand}${loc ? ' in ' + loc : ''} a good company for ${cat}? Accessibility, service and quality?`,
  }
}

// ============================================
// SENTIMENT ANALYSIS
// ============================================
const POSITIVE_WORDS = {
  nl: ['betrouwbaar', 'goed', 'uitstekend', 'professioneel', 'tevreden', 'aanrader', 'deskundig', 'snel', 'prettig', 'fijn', 'positief', 'goede reviews', 'top', 'hoge score', 'klantvriendelijk', 'vakkundig', 'gedegen', 'transparant', 'persoonlijk'],
  en: ['reliable', 'good', 'excellent', 'professional', 'satisfied', 'recommended', 'expert', 'fast', 'pleasant', 'positive', 'great reviews', 'top', 'high score', 'customer-friendly', 'skilled', 'thorough', 'transparent', 'personal']
}

const NEGATIVE_WORDS = {
  nl: ['klachten', 'slecht', 'onbetrouwbaar', 'negatief', 'problemen', 'teleurgesteld', 'ontevreden', 'langzaam', 'duur', 'niet bereikbaar', 'slechte service', 'oplichting', 'waarschuwing', 'afgeraden', 'onprofessioneel'],
  en: ['complaints', 'bad', 'unreliable', 'negative', 'problems', 'disappointed', 'dissatisfied', 'slow', 'expensive', 'unreachable', 'poor service', 'scam', 'warning', 'not recommended', 'unprofessional']
}

const ASPECT_PATTERNS = {
  bereikbaarheid: /bereikba|contact|telefoon|bellen|reachab|contact|phone/i,
  reviews: /review|beoordeling|sterren|score|trustpilot|google reviews|rating/i,
  klachten: /klacht|probleem|negatief|teleurgesteld|complaint|issue|negative/i,
  service: /service|klantenservice|helpdesk|support|customer service/i,
  openingstijden: /openingstijd|geopend|open|beschikbaar|hours|opening|available/i,
  betrouwbaarheid: /betrouwba|vertrouw|veilig|gecertificeerd|reliab|trust|safe|certified/i,
  prijs: /prijs|kost|betaalbaar|duur|goedkoop|tarief|price|cost|affordable|expensive/i,
  snelheid: /snel|wachttijd|respons|reactietijd|fast|wait|response time/i,
}

function analyzeSentiment(content, locale) {
  const lower = content.toLowerCase()
  const posWords = POSITIVE_WORDS[locale] || POSITIVE_WORDS.nl
  const negWords = NEGATIVE_WORDS[locale] || NEGATIVE_WORDS.nl

  const posSignals = [], negSignals = []
  posWords.forEach(w => { if (lower.includes(w)) posSignals.push(w) })
  negWords.forEach(w => { if (lower.includes(w)) negSignals.push(w) })

  const aspects = []
  for (const [aspect, pattern] of Object.entries(ASPECT_PATTERNS)) {
    if (pattern.test(content)) aspects.push(aspect)
  }

  const posCount = posSignals.length, negCount = negSignals.length
  let sentiment = 'neutral'
  if (posCount > negCount * 2) sentiment = 'positive'
  else if (negCount > posCount * 2) sentiment = 'negative'
  else if (posCount > 0 || negCount > 0) sentiment = 'mixed'

  const total = posCount + negCount
  const score = total > 0 ? Math.round((posCount / total) * 100) : 50

  return { sentiment, score, posSignals, negSignals, aspects, posCount, negCount }
}

// ============================================
// STRIP MARKDOWN from responses
// ============================================
function stripMarkdown(text) {
  if (!text) return ''
  return text
    // Remove citation references: [1], [2], [1][2], etc.
    .replace(/\[(\d+)\]/g, '')
    // Remove markdown links: [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers: ## Title → Title
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic: **text** or *text* → text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // Remove blockquotes: > text → text
    .replace(/^>\s?/gm, '')
    // Convert list items to clean sentences: - Text → Text
    .replace(/^[-•]\s+/gm, '• ')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Clean up double spaces from citation removal
    .replace(/  +/g, ' ')
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ============================================
// PERPLEXITY CALL
// ============================================
async function queryPerplexity(prompt, brandName, locale) {
  const systemPrompt = locale === 'en'
    ? 'You are a helpful assistant that provides balanced, honest information about businesses. Always answer in English. Do not use markdown formatting, citations, or reference numbers.'
    : 'Je bent een behulpzame assistent die gebalanceerde, eerlijke informatie geeft over bedrijven. Antwoord altijd in het Nederlands. Gebruik geen markdown-opmaak, citaties of referentienummers.'

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!response.ok) throw new Error(`Perplexity API error ${response.status}`)
  const data = await response.json()
  const content = stripMarkdown(data.choices?.[0]?.message?.content || '')
  const mentioned = content.toLowerCase().includes(brandName.toLowerCase())
  return { platform: 'perplexity', response: content, mentioned, ...analyzeSentiment(content, locale) }
}

// ============================================
// CHATGPT SEARCH CALL
// ============================================
async function queryChatGPT(prompt, brandName, locale, location) {
  const systemPrompt = locale === 'en'
    ? 'You are a helpful assistant that provides balanced, honest information about businesses. Always answer in English. Mention specific companies by name. Do not use markdown formatting.'
    : 'Je bent een behulpzame assistent die gebalanceerde, eerlijke informatie geeft over bedrijven. Antwoord altijd in het Nederlands. Noem specifieke bedrijven bij naam. Gebruik geen markdown-opmaak.'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-search-preview',
    web_search_options: {
      search_context_size: 'medium',
      user_location: { type: 'approximate', approximate: { country: 'NL', city: location || 'Amsterdam' } }
    },
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
  })

  const content = stripMarkdown(response.choices?.[0]?.message?.content || '')
  const mentioned = content.toLowerCase().includes(brandName.toLowerCase())
  return { platform: 'chatgpt', response: content, mentioned, ...analyzeSentiment(content, locale) }
}

// ============================================
// SLACK NOTIFICATION (only on final call)
// ============================================
async function sendSlackNotification(data) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return
  const emoji = data.sentiment === 'positive' ? '🟢' : data.sentiment === 'negative' ? '🔴' : data.sentiment === 'mixed' ? '🟡' : '⚪'
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🏷️ Brand Check: *${data.brandName}*${data.location ? ` (${data.location})` : ''} | ${data.category}\n${emoji} ${data.sentiment} | PX: ${data.pxMentioned ? '✅' : '❌'} | CG: ${data.cgMentioned ? '✅' : '❌'} | Query: ${data.queryType}`
      })
    })
  } catch (e) {}
}

// ============================================
// POST HANDLER — single query mode
// ============================================
export async function POST(request) {
  let locale = 'nl'
  try {
    const body = await request.json()
    const { brandName, location, category, queryType } = body
    locale = body.locale || 'nl'
    const prompts = PROMPTS[locale] || PROMPTS.nl

    if (!brandName || brandName.trim().length < 2) {
      return NextResponse.json({ error: locale === 'nl' ? 'Bedrijfsnaam is verplicht' : 'Company name is required' }, { status: 400 })
    }
    if (!category || category.trim().length < 2) {
      return NextResponse.json({ error: locale === 'nl' ? 'Branche is verplicht' : 'Industry is required' }, { status: 400 })
    }
    if (!['experiences', 'reviews', 'service'].includes(queryType)) {
      return NextResponse.json({ error: 'Invalid queryType' }, { status: 400 })
    }

    const brand = brandName.trim()
    const loc = location?.trim() || ''
    const cat = category.trim()

    // Generate prompt for this query type
    let prompt
    if (queryType === 'experiences') prompt = prompts.experiences(brand, loc)
    else if (queryType === 'reviews') prompt = prompts.reviews(brand)
    else prompt = prompts.service(brand, loc, cat)

    console.log(`[Brand Check] ${queryType}: ${brand} (${loc || '-'}) — ${cat}`)

    // Run Perplexity + ChatGPT in parallel for this single query
    const [pxResult, cgResult] = await Promise.all([
      queryPerplexity(prompt, brand, locale).catch(err => {
        console.error(`[Brand Check] Perplexity error: ${err.message}`)
        return { platform: 'perplexity', response: '', mentioned: false, sentiment: 'neutral', score: 50, posSignals: [], negSignals: [], aspects: [], posCount: 0, negCount: 0 }
      }),
      queryChatGPT(prompt, brand, locale, loc).catch(err => {
        console.error(`[Brand Check] ChatGPT error: ${err.message}`)
        return { platform: 'chatgpt', response: '', mentioned: false, sentiment: 'neutral', score: 50, posSignals: [], negSignals: [], aspects: [], posCount: 0, negCount: 0 }
      }),
    ])

    // Slack on final query
    if (queryType === 'service') {
      sendSlackNotification({ brandName: brand, location: loc, category: cat, sentiment: pxResult.sentiment, pxMentioned: pxResult.mentioned, cgMentioned: cgResult.mentioned, queryType }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      queryType,
      prompt,
      perplexity: {
        response: pxResult.response,
        mentioned: pxResult.mentioned,
        sentiment: pxResult.sentiment,
        score: pxResult.score,
        posSignals: pxResult.posSignals,
        negSignals: pxResult.negSignals,
        aspects: pxResult.aspects,
      },
      chatgpt: {
        response: cgResult.response,
        mentioned: cgResult.mentioned,
        sentiment: cgResult.sentiment,
        score: cgResult.score,
        posSignals: cgResult.posSignals,
        negSignals: cgResult.negSignals,
        aspects: cgResult.aspects,
      },
    })

  } catch (error) {
    console.error('[Brand Check] Error:', error?.message || error)
    const msg = error?.message || ''
    if (msg.includes('API') || msg.includes('401') || msg.includes('429')) {
      return NextResponse.json({ error: locale === 'nl' ? 'Tijdelijk probleem. Probeer het over een paar minuten opnieuw.' : 'Temporary issue. Try again in a few minutes.' }, { status: 503 })
    }
    return NextResponse.json({ error: locale === 'nl' ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
