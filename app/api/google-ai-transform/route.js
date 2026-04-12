import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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

// Claude system prompt — optimized for AI Overview triggers
function getSystemPrompt(lang) {
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
- "Which SEO agencies in Amsterdam are good" → "when should you hire an SEO specialist"
- "Recommend a good real estate lawyer" → "what does a real estate lawyer cost per hour"
- "Best web design agency for webshops" → "how much does a professional webshop cost"
- "Which accountants handle international tax" → "how does international tax work for businesses"
- "Find a reliable contractor for renovation" → "steps to take when renovating your home"
- "Good physiotherapist for back pain" → "when to see a physiotherapist for back pain"

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
- "Welk SEO bureau in Amsterdam is goed" → "wanneer SEO specialist inhuren voor je website"
- "Kun je een goede vastgoedadvocaat aanbevelen" → "wat kost een vastgoedadvocaat per uur"
- "Beste webdesign bureau voor webshops" → "hoeveel kost een professionele webshop laten maken"
- "Welke accountants doen internationale belastingen" → "hoe werkt internationale belastingaangifte voor bedrijven"
- "Zoek een betrouwbare aannemer voor verbouwing" → "stappenplan verbouwing woning wat komt erbij kijken"
- "Goede fysiotherapeut voor rugpijn" → "wanneer naar fysiotherapeut bij rugklachten"
- "Ik zoek een ervaren SEO specialist in Amsterdam" → "wat kost SEO uitbesteden aan een specialist"
- "Welk online marketing bureau combineert SEO en website snelheid" → "verschil tussen SEO en website snelheid optimalisatie"

Antwoord ALLEEN met een JSON array van strings, een per prompt, in dezelfde volgorde. Geen uitleg.`
}

// Simple fallback if Claude fails
function fallbackTransform(prompt) {
  let q = prompt.trim().replace(/[?!.]+$/, '')

  q = q
    .replace(/^(?:kun je|welke|geef|noem|heb je|ken je|wat zijn de|lijst|can you|which|give|list|what are the)\s+(?:mij |me |een aantal |de |het |some |the )?(?:beste|top|goede|betrouwbare|ervaren|gerenommeerde|best|top|good|reliable|experienced)?\s*/i, '')
    .replace(/\s+(?:in|te|near|around)\s+(?:amsterdam|rotterdam|den haag|utrecht|eindhoven|nederland|london|new york|los angeles)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Add AIO trigger prefix
  if (!/^(wat|hoe|wanneer|waarom|verschil|what|how|when|why|difference)/i.test(q)) {
    q = `wat kost ${q}`
  }

  if (q.length < 5) q = prompt.split(' ').slice(0, 5).join(' ')
  if (q.length > 80) q = q.substring(0, 80).replace(/\s\w*$/, '')

  return { searchQuery: q, originalPrompt: prompt }
}

export async function POST(request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { prompts } = await request.json()

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({ error: 'Prompts required' }, { status: 400 })
    }

    // Detect language from prompt content
    const lang = detectLanguageFromPrompts(prompts)
    console.log(`Transform: detected language = ${lang}, ${prompts.length} prompts`)

    try {
      const promptList = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: getSystemPrompt(lang),
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
        console.log('Transform success:', prompts.map((p, i) => `"${p}" → "${queries[i]}"`).join(', '))
        return NextResponse.json({
          success: true,
          lang,
          queries: prompts.map((prompt, i) => ({
            searchQuery: queries[i],
            originalPrompt: prompt
          }))
        })
      }

      // Fallback if array length mismatch
      console.warn('Claude returned wrong number of queries, using fallback')
      return NextResponse.json({
        success: true,
        lang,
        queries: prompts.map(p => fallbackTransform(p))
      })

    } catch (error) {
      console.error('Claude transform error, using fallback:', error.message)
      return NextResponse.json({
        success: true,
        lang,
        queries: prompts.map(p => fallbackTransform(p))
      })
    }

  } catch (error) {
    console.error('Transform endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Transform failed' },
      { status: 500 }
    )
  }
}
