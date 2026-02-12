// app/api/geo-audit/route.js
// ============================================
// GEO AUDIT API — Public (no auth required)
// Scrapes page → Claude analysis → Perplexity LIVE test
// ============================================

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// ✅ Slack lead notificatie
async function sendSlackLeadNotification({ url, companyName, score, mentioned }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🔍 Nieuwe GEO Audit Lead!', emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*URL:*\n${url}` },
              { type: 'mrkdwn', text: `*Bedrijf:*\n${companyName || 'Onbekend'}` },
              { type: 'mrkdwn', text: `*GEO Score:*\n${score}/100` },
              { type: 'mrkdwn', text: `*Perplexity:*\n${mentioned ? '✅ Gevonden' : '❌ Niet gevonden'}` }
            ]
          },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `${new Date().toLocaleString('nl-NL')} · GEO Audit Tool` }]
          }
        ]
      })
    })
  } catch (e) {
    console.error('[GEO Audit] Slack error:', e.message)
  }
}


export async function POST(request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is verplicht' }, { status: 400 })
    }

    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    const urlObj = new URL(normalizedUrl)
    const domain = urlObj.origin
    const hostname = urlObj.hostname.replace(/^www\./, '')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: SCRAPE THE PAGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const scrapeResponse = await fetch(
      `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}&render=false`,
      { signal: AbortSignal.timeout(20000) }
    )

    if (!scrapeResponse.ok) {
      return NextResponse.json({
        error: 'Kon de pagina niet laden. Controleer of de URL correct is.'
      }, { status: 400 })
    }

    const html = await scrapeResponse.text()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: EXTRACT CONTENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const extracted = extractContent(html)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: CHECK ROBOTS.TXT + LLMS.TXT (parallel)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const [robotsTxt, llmsTxt] = await Promise.all([
      fetchTextFile(`${domain}/robots.txt`),
      fetchTextFile(`${domain}/llms.txt`)
    ])

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: TECHNICAL CHECKS (rule-based, instant)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const technicalChecks = analyzeTechnical(extracted, robotsTxt, llmsTxt)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: AI CONTENT ANALYSIS (Claude)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const aiAnalysis = await analyzeContentWithClaude(extracted, hostname, normalizedUrl)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: LIVE PERPLEXITY TEST 🔥
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let liveTest = null
    if (aiAnalysis?.generatedPrompt) {
      liveTest = await testPromptOnPerplexity(
        aiAnalysis.generatedPrompt,
        aiAnalysis.companyName || hostname,
        hostname
      )
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // COMBINE SCORES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Live test weegt 15% mee in de score
    const liveTestScore = liveTest 
      ? (liveTest.mentioned ? 100 : 15) 
      : 50 // neutral als test niet lukt

    const overallScore = Math.round(
      (aiAnalysis.contentScore * 0.30) +
      (technicalChecks.score * 0.25) +
      (aiAnalysis.citationScore * 0.20) +
      (aiAnalysis.eatScore * 0.10) +
      (liveTestScore * 0.15)
    )

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SLACK LEAD NOTIFICATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    sendSlackLeadNotification({
      url: normalizedUrl,
      companyName: aiAnalysis.companyName || hostname,
      score: overallScore,
      mentioned: liveTest?.mentioned || false
    }).catch(() => {})

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RESPONSE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return NextResponse.json({
      success: true,
      url: normalizedUrl,
      domain: hostname,
      extracted: {
        title: extracted.title,
        description: extracted.description,
        wordCount: extracted.wordCount,
        headingCount: extracted.headings.length,
        hasStructuredData: extracted.structuredData.length > 0,
        structuredDataTypes: extracted.structuredDataTypes,
        hasFAQ: extracted.hasFAQ,
        hasRobotsTxt: !!robotsTxt,
        hasLlmsTxt: !!llmsTxt,
        imageCount: extracted.imageCount,
        imagesWithAlt: extracted.imagesWithAlt,
      },
      analysis: {
        overallScore,
        categories: [
          {
            name: 'AI Content Kwaliteit',
            slug: 'content',
            score: aiAnalysis.contentScore,
            icon: '📝',
            summary: aiAnalysis.contentSummary,
            checks: aiAnalysis.contentChecks || []
          },
          {
            name: 'Technische AI-gereedheid',
            slug: 'technical',
            score: technicalChecks.score,
            icon: '⚙️',
            summary: technicalChecks.summary,
            checks: technicalChecks.checks
          },
          {
            name: 'Citatie-potentieel',
            slug: 'citation',
            score: aiAnalysis.citationScore,
            icon: '🎯',
            summary: aiAnalysis.citationSummary,
            checks: aiAnalysis.citationChecks || []
          },
          {
            name: 'E-E-A-T Signalen',
            slug: 'eeat',
            score: aiAnalysis.eatScore,
            icon: '🏆',
            summary: aiAnalysis.eatSummary,
            checks: aiAnalysis.eatChecks || []
          }
        ],
        topRecommendations: aiAnalysis.topRecommendations || [],
        generatedPrompt: aiAnalysis.generatedPrompt || null,
        companyName: aiAnalysis.companyName || hostname,
      },
      // ✨ THE KILLER FEATURE — Live AI test resultaat
      liveTest: liveTest ? {
        prompt: aiAnalysis.generatedPrompt,
        mentioned: liveTest.mentioned,
        mentionCount: liveTest.mentionCount,
        snippet: liveTest.snippet,
        competitors: liveTest.competitors,
        platform: 'Perplexity'
      } : null
    })

  } catch (error) {
    console.error('[GEO Audit] Error:', error)
    return NextResponse.json({
      error: 'Er ging iets mis bij het analyseren. Probeer het opnieuw.'
    }, { status: 500 })
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML CONTENT EXTRACTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractContent(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? cleanText(titleMatch[1]) : ''

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i)
  const description = descMatch ? cleanText(descMatch[1]) : ''

  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']/i)
  const hasOgImage = !!ogImageMatch

  // Headings
  const headings = []
  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi
  let match
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({ level: match[1].toLowerCase(), text: cleanText(match[2]) })
  }

  // Body text (strip scripts/styles/nav/footer)
  let bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 1).length

  // Structured Data (JSON-LD)
  const structuredData = []
  const structuredDataTypes = []
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim())
      structuredData.push(data)
      if (data['@type']) {
        const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]
        structuredDataTypes.push(...types)
      }
      if (data['@graph']) {
        data['@graph'].forEach(item => {
          if (item['@type']) {
            const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
            structuredDataTypes.push(...types)
          }
        })
      }
    } catch (e) { /* ignore parse errors */ }
  }

  const hasFAQ = structuredDataTypes.includes('FAQPage')
    || /faq|veelgestelde vragen|veel gestelde vragen/i.test(html)
    || headings.some(h => /faq|vraag|vragen/i.test(h.text))

  // Images
  const imgRegex = /<img[^>]*>/gi
  const images = []
  while ((match = imgRegex.exec(html)) !== null) {
    const altMatch = match[0].match(/alt=["']([\s\S]*?)["']/i)
    images.push({ hasAlt: !!altMatch && altMatch[1].trim().length > 0 })
  }

  return {
    title,
    description,
    hasOgImage,
    headings,
    bodyText: bodyText.substring(0, 4000),
    wordCount,
    structuredData,
    structuredDataTypes: [...new Set(structuredDataTypes)],
    hasFAQ,
    imageCount: images.length,
    imagesWithAlt: images.filter(i => i.hasAlt).length,
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TECHNICAL ANALYSIS (rule-based, instant)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function analyzeTechnical(extracted, robotsTxt, llmsTxt) {
  const checks = []
  let score = 0
  let maxScore = 0

  // Title tag
  maxScore += 10
  if (extracted.title && extracted.title.length > 10) {
    if (extracted.title.length <= 60) {
      checks.push({ name: 'Title tag', status: 'good', detail: `"${extracted.title.substring(0, 55)}${extracted.title.length > 55 ? '…' : ''}" (${extracted.title.length} tekens)`, priority: 'hoog' })
      score += 10
    } else {
      checks.push({ name: 'Title tag', status: 'warning', detail: `Te lang: ${extracted.title.length} tekens (max 60)`, priority: 'hoog' })
      score += 5
    }
  } else {
    checks.push({ name: 'Title tag', status: 'error', detail: 'Ontbreekt of te kort', priority: 'hoog' })
  }

  // Meta description
  maxScore += 10
  if (extracted.description && extracted.description.length > 50) {
    if (extracted.description.length <= 160) {
      checks.push({ name: 'Meta description', status: 'good', detail: `${extracted.description.length} tekens — goed als AI-samenvatting`, priority: 'hoog' })
      score += 10
    } else {
      checks.push({ name: 'Meta description', status: 'warning', detail: `Te lang: ${extracted.description.length} tekens`, priority: 'hoog' })
      score += 5
    }
  } else {
    checks.push({ name: 'Meta description', status: 'error', detail: 'Ontbreekt — AI gebruikt dit als eerste samenvatting', priority: 'hoog' })
  }

  // Structured Data
  maxScore += 15
  if (extracted.structuredDataTypes.length > 0) {
    const important = ['Organization', 'LocalBusiness', 'Product', 'Article', 'FAQPage', 'Service', 'WebSite']
    const found = extracted.structuredDataTypes.filter(t => important.includes(t))
    if (found.length >= 2) {
      checks.push({ name: 'Structured Data', status: 'good', detail: `${extracted.structuredDataTypes.join(', ')}`, priority: 'hoog' })
      score += 15
    } else {
      checks.push({ name: 'Structured Data', status: 'warning', detail: `Alleen ${extracted.structuredDataTypes.join(', ')} — voeg Organization of FAQPage toe`, priority: 'hoog' })
      score += 8
    }
  } else {
    checks.push({ name: 'Structured Data', status: 'error', detail: 'Geen JSON-LD structured data gevonden', priority: 'hoog' })
  }

  // FAQ Schema
  maxScore += 10
  if (extracted.structuredDataTypes.includes('FAQPage')) {
    checks.push({ name: 'FAQPage Schema', status: 'good', detail: 'Verhoogt kans op directe AI-citatie', priority: 'hoog' })
    score += 10
  } else if (extracted.hasFAQ) {
    checks.push({ name: 'FAQPage Schema', status: 'warning', detail: 'FAQ-content gevonden maar geen FAQPage schema', priority: 'hoog' })
    score += 4
  } else {
    checks.push({ name: 'FAQPage Schema', status: 'error', detail: 'AI-platformen citeren FAQ\'s vaak direct', priority: 'middel' })
  }

  // og:image
  maxScore += 5
  if (extracted.hasOgImage) {
    checks.push({ name: 'og:image', status: 'good', detail: 'Open Graph afbeelding aanwezig', priority: 'middel' })
    score += 5
  } else {
    checks.push({ name: 'og:image', status: 'error', detail: 'Ontbreekt — bepaalt hoe AI je content presenteert', priority: 'middel' })
  }

  // Headings
  maxScore += 10
  const h1Count = extracted.headings.filter(h => h.level === 'h1').length
  const h2Count = extracted.headings.filter(h => h.level === 'h2').length
  if (h1Count === 1 && h2Count >= 2) {
    checks.push({ name: 'Heading structuur', status: 'good', detail: `${h1Count}× H1, ${h2Count}× H2 — helder voor AI`, priority: 'middel' })
    score += 10
  } else if (h1Count >= 1) {
    checks.push({ name: 'Heading structuur', status: 'warning', detail: `${h1Count}× H1, ${h2Count}× H2 — meer H2's helpt AI structuur begrijpen`, priority: 'middel' })
    score += 5
  } else {
    checks.push({ name: 'Heading structuur', status: 'error', detail: 'Geen H1 gevonden', priority: 'hoog' })
  }

  // Word count
  maxScore += 10
  if (extracted.wordCount >= 800) {
    checks.push({ name: 'Content lengte', status: 'good', detail: `${extracted.wordCount} woorden`, priority: 'middel' })
    score += 10
  } else if (extracted.wordCount >= 300) {
    checks.push({ name: 'Content lengte', status: 'warning', detail: `${extracted.wordCount} woorden — meer content = meer context voor AI`, priority: 'middel' })
    score += 5
  } else {
    checks.push({ name: 'Content lengte', status: 'error', detail: `${extracted.wordCount} woorden — te weinig om te citeren`, priority: 'hoog' })
  }

  // robots.txt — per bot
  maxScore += 10
  if (robotsTxt) {
    const bots = ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']
    const blocked = bots.filter(bot => {
      const regex = new RegExp(`user-agent:\\s*${bot}[\\s\\S]*?disallow:\\s*\\/`, 'im')
      return regex.test(robotsTxt)
    })
    if (blocked.length > 0) {
      checks.push({ name: 'robots.txt', status: 'error', detail: `Blokkeert: ${blocked.join(', ')} — onzichtbaar voor deze AI's`, priority: 'kritiek' })
    } else {
      checks.push({ name: 'robots.txt', status: 'good', detail: 'AI-bots niet geblokkeerd', priority: 'hoog' })
      score += 10
    }
  } else {
    checks.push({ name: 'robots.txt', status: 'warning', detail: 'Geen robots.txt gevonden', priority: 'middel' })
    score += 5
  }

  // llms.txt
  maxScore += 10
  if (llmsTxt) {
    checks.push({ name: 'llms.txt', status: 'good', detail: 'Geeft AI directe instructies over je bedrijf', priority: 'middel' })
    score += 10
  } else {
    checks.push({ name: 'llms.txt', status: 'warning', detail: 'Geen llms.txt — overweeg dit toe te voegen', priority: 'middel' })
  }

  // Alt texts
  maxScore += 10
  if (extracted.imageCount > 0) {
    const pct = Math.round((extracted.imagesWithAlt / extracted.imageCount) * 100)
    if (pct >= 80) {
      checks.push({ name: 'Alt-teksten', status: 'good', detail: `${pct}% van afbeeldingen heeft alt-tekst`, priority: 'laag' })
      score += 10
    } else if (pct >= 50) {
      checks.push({ name: 'Alt-teksten', status: 'warning', detail: `${pct}% — voeg alt-tekst toe aan alle afbeeldingen`, priority: 'middel' })
      score += 5
    } else {
      checks.push({ name: 'Alt-teksten', status: 'error', detail: `Slechts ${pct}% heeft alt-tekst`, priority: 'middel' })
    }
  }

  const finalScore = Math.round((score / maxScore) * 100)
  return {
    score: finalScore,
    summary: finalScore >= 70
      ? 'Technisch goed voorbereid op AI-platformen'
      : finalScore >= 40
        ? 'Verbeterbaar — belangrijke elementen ontbreken'
        : 'Onvoldoende voorbereid op AI-platformen',
    checks
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE CONTENT ANALYSIS + PROMPT GENERATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function analyzeContentWithClaude(extracted, hostname, url) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `Je bent een GEO (Generative Engine Optimization) expert. Je analyseert webpagina's op hun geschiktheid om geciteerd te worden door AI-platformen (ChatGPT, Perplexity, Google AI).

Antwoord ALTIJD als pure JSON. Geen markdown, geen backticks, geen uitleg — alleen de JSON.`,
      messages: [{
        role: 'user',
        content: `Analyseer deze webpagina voor GEO-geschiktheid.

URL: ${url}
Title: ${extracted.title}
Meta description: ${extracted.description}
Headings: ${extracted.headings.slice(0, 15).map(h => `${h.level}: ${h.text}`).join('\n')}
Woorden: ${extracted.wordCount}
Structured data: ${extracted.structuredDataTypes.join(', ') || 'Geen'}

Content (eerste deel):
---
${extracted.bodyText}
---

Geef je analyse als JSON:

{
  "companyName": "<bedrijfsnaam uit de content — als niet duidelijk, gebruik dan het domein>",
  "contentScore": <0-100>,
  "contentSummary": "<1 zin>",
  "contentChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "citationScore": <0-100>,
  "citationSummary": "<1 zin>",
  "citationChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "eatScore": <0-100>,
  "eatSummary": "<1 zin>",
  "eatChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "topRecommendations": ["<actie 1>", "<actie 2>", "<actie 3>"],
  "generatedPrompt": "<zie instructies hieronder>"
}

CONTENTCHECKS (minimaal 4):
- Directe antwoorden bovenaan de pagina?
- Q&A formaat / vragen beantwoord?
- Begrippen/definities helder uitgelegd?
- Lijsten of gestructureerde info voor AI?
- Taalgebruik: helder, bondig, informatief?

CITATIONCHECKS (minimaal 3):
- Unieke data: statistieken, cijfers, onderzoek?
- Expert claims of uitspraken?
- Bedrijfsnaam duidelijk aanwezig in content?

EATCHECKS (minimaal 3):
- Auteur of bedrijfsprofiel zichtbaar?
- Expertise signalen: certificeringen, ervaring, klanten?
- Reviews of testimonials?
- Contactinformatie beschikbaar?

GENERATEDPROMPT — DIT IS CRUCIAAL:
Genereer een COMMERCIËLE Nederlandse vraag die een potentiële klant aan ChatGPT of Perplexity zou stellen. De vraag moet:
- Klinken als een ECHT persoon die iets zoekt
- Gericht zijn op het vinden van een dienst/product/bedrijf
- De bedrijfsnaam NIET noemen
- In het Nederlands zijn
- Concreet genoeg dat het bedrijf als antwoord zou kunnen verschijnen
- Bijvoorbeeld: "Kun je een goede tandarts in Rotterdam aanbevelen?" of "Welke bedrijven zijn gespecialiseerd in duurzame verpakkingen?"

Geef ALLEEN de JSON.`
      }]
    })

    const text = message.content[0].text.trim()
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(jsonStr)

  } catch (error) {
    console.error('[GEO Audit] Claude error:', error.message)
    return {
      companyName: hostname,
      contentScore: 50,
      contentSummary: 'Analyse kon niet volledig worden uitgevoerd',
      contentChecks: [],
      citationScore: 50,
      citationSummary: 'Maak een account voor uitgebreide analyse',
      citationChecks: [],
      eatScore: 50,
      eatSummary: 'Maak een account voor uitgebreide analyse',
      eatChecks: [],
      topRecommendations: [
        'Voeg FAQPage structured data toe',
        'Zorg voor een duidelijke meta description',
        'Maak een gratis account voor de volledige analyse'
      ],
      generatedPrompt: null
    }
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✨ LIVE PERPLEXITY TEST — THE KILLER FEATURE
// Exact dezelfde Perplexity API als de bestaande scan
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function testPromptOnPerplexity(prompt, companyName, hostname) {
  try {

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `Je bent een behulpzame assistent die ALTIJD in het Nederlands antwoordt. 
Geef concrete bedrijfsnamen en aanbevelingen. 
Focus op Nederlandse, specifieke bedrijven en dienstverleners.
Vermeld concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen of specialistische dienstverleners.`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000
      }),
      signal: AbortSignal.timeout(25000)
    })

    if (!response.ok) {
      console.error('[GEO Audit] Perplexity error:', response.status)
      return null
    }

    const data = await response.json()
    const rawOutput = data.choices?.[0]?.message?.content || ''

    if (!rawOutput.trim()) return null

    // Check company mention (naam + domein varianten)
    const nameVariants = [
      companyName.toLowerCase(),
      hostname.toLowerCase(),
      hostname.replace(/\.(nl|com|eu|org|net)$/i, '').toLowerCase(),
      // Ook zonder streepjes/punten
      hostname.replace(/\.(nl|com|eu|org|net)$/i, '').replace(/[-_.]/g, ' ').toLowerCase(),
    ].filter(v => v.length > 2)

    const lowerOutput = rawOutput.toLowerCase()
    const mentioned = nameVariants.some(variant => lowerOutput.includes(variant))

    // Count mentions
    let mentionCount = 0
    nameVariants.forEach(variant => {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = rawOutput.match(new RegExp(escaped, 'gi'))
      if (matches) mentionCount += matches.length
    })

    // Extract competitors met Claude (zelfde patroon als bestaande scan)
    let competitors = []
    try {
      const parseResult = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: 'Extraheer bedrijfsnamen. Geef ALLEEN een JSON array van strings. Geen markdown, geen uitleg.',
        messages: [{
          role: 'user',
          content: `Welke SPECIFIEKE bedrijfsnamen worden genoemd in deze tekst?
Alleen Nederlandse dienstverleners/bedrijven, geen grote internationale merken, geen tools, geen platforms.

Tekst: "${rawOutput.substring(0, 2000)}"

Filter uit: "${companyName}", "${hostname}"

Antwoord als JSON array: ["bedrijf1", "bedrijf2"]`
        }]
      })

      const parsed = parseResult.content[0].text.trim()
        .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      competitors = JSON.parse(parsed)
      if (!Array.isArray(competitors)) competitors = []
    } catch (e) {
    }

    const snippet = rawOutput.length > 600 ? rawOutput.substring(0, 597) + '...' : rawOutput


    return {
      mentioned,
      mentionCount,
      snippet,
      competitors: competitors.slice(0, 8)
    }

  } catch (error) {
    console.error('[GEO Audit] Perplexity error:', error.message)
    return null
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchTextFile(url) {
  try {
    const response = await fetch(
      `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!response.ok) return null
    const text = await response.text()
    if (text.length > 10000 || text.includes('<!DOCTYPE') || text.includes('<html')) return null
    return text
  } catch (e) {
    return null
  }
}

function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
