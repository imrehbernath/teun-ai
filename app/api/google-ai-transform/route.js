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
  // Default to Dutch unless clearly English (1.3x threshold)
  return englishScore > dutchScore * 1.3 ? 'en' : 'nl'
}

function getSystemPrompt(lang) {
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

// Simple fallback if Claude fails
function fallbackTransform(prompt) {
  let q = prompt.trim().replace(/[?!.]+$/, '')

  q = q
    .replace(/^(?:kun je|welke|geef|noem|heb je|ken je|wat zijn de|lijst|can you|which|give|list|what are the)\s+(?:mij |me |een aantal |de |het |some |the )?(?:beste|top|goede|betrouwbare|ervaren|gerenommeerde|best|top|good|reliable|experienced)?\s*/i, '')
    .replace(/\s+(?:in|te|near|around)\s+(?:amsterdam|rotterdam|den haag|utrecht|eindhoven|nederland|london|new york|los angeles)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (q.length < 5) q = prompt.split(' ').slice(0, 5).join(' ')
  if (q.length > 60) q = q.substring(0, 60).replace(/\s\w*$/, '')

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
            ? `Convert these ${prompts.length} commercial prompts into short Google search queries:\n\n${promptList}`
            : `Zet deze ${prompts.length} commerciële prompts om naar korte Google-zoekopdrachten:\n\n${promptList}`
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
