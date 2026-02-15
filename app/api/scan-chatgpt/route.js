// app/api/scan-chatgpt/route.js
// ✅ Standalone ChatGPT Search scan - voor dashboard rescan
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================
// ✨ CHATGPT SEARCH - gpt-4o-search-preview
// ============================================
async function analyzeWithChatGPT(prompt, companyName, serviceArea = null) {
  if (!OPENAI_API_KEY) {
    return { 
      success: false, 
      data: { company_mentioned: false, mentions_count: 0, competitors_mentioned: [], simulated_ai_response_snippet: 'ChatGPT niet beschikbaar' }
    }
  }

  const userLocation = {
    type: 'approximate',
    approximate: {
      country: 'NL',
      city: serviceArea || 'Amsterdam'
    }
  }

  try {
    let response
    
    // Retry up to 3 times — gpt-4o-search-preview has low RPM limits
    for (let attempt = 1; attempt <= 3; attempt++) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-search-preview',
          web_search_options: { 
            search_context_size: 'medium',
            user_location: userLocation
          },
          messages: [
            {
              role: 'system',
              content: `Je bent een behulpzame AI-assistent die zoekvragen beantwoordt in het Nederlands voor gebruikers in Nederland.
De gebruiker bevindt zich in Nederland${serviceArea ? `, regio ${serviceArea}` : ''}. Geef antwoorden specifiek gericht op de Nederlandse markt.
Zoek op het web en geef een beknopt, informatief antwoord met concrete bedrijfsnamen en aanbevelingen die in Nederland actief zijn.
Antwoord ALTIJD in het Nederlands. Focus op het noemen van specifieke Nederlandse bedrijven, dienstverleners of specialisten.
Als je webwinkels, dienstverleners of specialisten noemt, geef dan bij voorkeur Nederlandse bedrijven of bedrijven die actief zijn op de Nederlandse markt.
Vermijd zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple, etc.), tech-platforms (Google, Facebook), en SEO-tools (Semrush, Ahrefs).`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000
        })
      })

      if (response.ok) break

      if (response.status === 429 && attempt < 3) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '0')
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : attempt * 20000 // 20s, 40s
        console.log(`⏳ ChatGPT 429 rate limit — wacht ${Math.round(waitMs/1000)}s (poging ${attempt}/3)`)
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }

      const errorText = await response.text()
      console.error(`❌ ChatGPT API error (${response.status}):`, errorText)
      throw new Error(`ChatGPT API failed: ${response.status}`)
    }

    if (!response.ok) {
      throw new Error(`ChatGPT API failed after 3 attempts`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('ChatGPT API error: Invalid response format')
    }

    const rawOutput = data.choices[0].message.content

    if (!rawOutput || rawOutput.trim() === '') {
      throw new Error('ChatGPT returned empty response')
    }

    const parsed = await parseWithClaude(rawOutput, companyName)
    return { success: true, data: parsed }
  } catch (error) {
    console.error('❌ ChatGPT Error:', error.message)
    return { 
      success: false, 
      data: { company_mentioned: false, mentions_count: 0, competitors_mentioned: [], simulated_ai_response_snippet: 'ChatGPT analyse mislukt' }
    }
  }
}

// ============================================
// ✅ PARSER - Same as main route.js
// ============================================
async function parseWithClaude(rawOutput, companyName) {
  try {
    const mentionsCount = (rawOutput.match(new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    const isCompanyMentioned = mentionsCount > 0

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `Jij bent een nauwkeurige JSON-parser die ALTIJD in het Nederlands reageert. Analyseer de tekst en extraheer de gevraagde informatie in JSON-formaat. Gebruik GEEN externe kennis.

VOOR CONCURRENTEN: Alleen specifieke bedrijfsnamen. GEEN grote merken (Apple, Google, Nike), GEEN tools (Semrush, Ahrefs), GEEN platforms (LinkedIn, Facebook). Focus op Nederlandse MKB dienstverleners.`,
      messages: [{
        role: 'user',
        content: `Lees de volgende tekst zorgvuldig:
"""
${rawOutput}
"""

Geef ALLEEN deze JSON terug:
{
  "company_mentioned": ${isCompanyMentioned},
  "mentions_count": ${mentionsCount},
  "competitors_mentioned": [],
  "simulated_ai_response_snippet": ""
}

competitors_mentioned: ALLEEN concrete Nederlandse bedrijfsnamen uit de tekst (geen grote merken/tools/platforms).
simulated_ai_response_snippet: Beknopte Nederlandse samenvatting van de tekst.
${!isCompanyMentioned ? `Begin snippet met: "Het bedrijf \\"${companyName}\\" wordt niet genoemd."` : ''}

ALLEEN JSON, geen extra tekst.`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    else if (cleanedText.startsWith('```')) cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')

    const parsed = JSON.parse(cleanedText)
    parsed.company_mentioned = isCompanyMentioned
    parsed.mentions_count = mentionsCount
    return parsed
  } catch (error) {
    console.error('❌ Parser Error:', error)
    return { company_mentioned: false, mentions_count: 0, competitors_mentioned: [], simulated_ai_response_snippet: 'Fout bij het analyseren' }
  }
}

// ============================================
// ✅ POST HANDLER
// ============================================
export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const { companyName, prompts, userId, website, serviceArea } = await request.json()

    if (!companyName?.trim() || !prompts?.length) {
      return NextResponse.json({ error: 'Bedrijfsnaam en prompts zijn verplicht' }, { status: 400 })
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key niet geconfigureerd' }, { status: 500 })
    }

    console.log(`🤖 ChatGPT Rescan: "${companyName}" - ${prompts.length} prompts`)

    const results = []
    let totalMentions = 0

    // Sequential to avoid rate limits
    for (let i = 0; i < prompts.length; i++) {
      console.log(`   ChatGPT prompt ${i + 1}/${prompts.length}...`)
      
      const result = await analyzeWithChatGPT(prompts[i], companyName, serviceArea)
      
      results.push({
        ai_prompt: prompts[i],
        platform: 'chatgpt',
        company_mentioned: result.data.company_mentioned,
        mentions_count: result.data.mentions_count,
        competitors_mentioned: result.data.competitors_mentioned || [],
        simulated_ai_response_snippet: result.data.simulated_ai_response_snippet || ''
      })
      
      if (result.data.company_mentioned) totalMentions++

      console.log(`   ${result.success ? '✅' : '⚠️'} Prompt ${i + 1}: ${result.data.company_mentioned ? 'GEVONDEN' : 'niet gevonden'}`)
      
      // gpt-4o-search-preview has strict RPM limits — need ~12s between requests
      if (i < prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 15000))
      }
    }

    const scanDuration = Date.now() - startTime
    console.log(`✅ ChatGPT rescan klaar: ${totalMentions}/${prompts.length} vermeldingen (${(scanDuration/1000).toFixed(1)}s)`)

    // Save to chatgpt_scans table
    if (userId) {
      // First try with all fields, fallback to minimal
      const insertData = {
        user_id: userId,
        company_name: companyName,
        results: results.map(r => ({
          query: r.ai_prompt,
          found: r.company_mentioned,
          full_response: r.simulated_ai_response_snippet,
          competitors: r.competitors_mentioned,
          sources: []
        })),
        found_count: totalMentions,
        total_queries: prompts.length
      }

      const { data: savedScan, error: saveError } = await supabase
        .from('chatgpt_scans')
        .insert(insertData)
        .select()

      if (saveError) {
        console.error('❌ Save error:', saveError.message, saveError.details, saveError.hint)
        // Return error to frontend so user knows
        return NextResponse.json({
          success: false,
          error: `Scan uitgevoerd maar opslaan mislukt: ${saveError.message}`,
          results,
          totalMentions,
          totalPrompts: prompts.length
        })
      } else {
        console.log('✅ Opgeslagen in chatgpt_scans, id:', savedScan?.[0]?.id)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalMentions,
      totalPrompts: prompts.length,
      scanDurationMs: scanDuration
    })

  } catch (error) {
    console.error('❌ ChatGPT Scan Error:', error)
    return NextResponse.json({ error: 'Server error bij ChatGPT scan' }, { status: 500 })
  }
}
