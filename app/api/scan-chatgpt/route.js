// app/api/scan-chatgpt/route.js
// ✅ Standalone ChatGPT Search scan - voor dashboard rescan
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Vercel function timeout — 10 prompts × 2s delay + API calls
export const maxDuration = 300

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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
    // Single attempt - bij 429 skippen we ChatGPT, Perplexity vangt op
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-search-preview',
        web_search_options: { 
          search_context_size: 'low',
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
        max_tokens: 250
      })
    })

    if (response.status === 429) {
      console.log(`⏳ ChatGPT 429 — skip, Perplexity vangt op`)
      return {
        success: false,
        error: 'ChatGPT rate limited',
        data: {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: 'ChatGPT was tijdelijk niet beschikbaar voor deze prompt (rate limit)'
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ ChatGPT API error (${response.status}):`, errorText)
      throw new Error(`ChatGPT API failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('ChatGPT API error: Invalid response format')
    }

    const rawOutput = data.choices[0].message.content

    if (!rawOutput || rawOutput.trim() === '') {
      throw new Error('ChatGPT returned empty response')
    }

    const parsed = parseWithJS(rawOutput, companyName)
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
function cleanCompetitorName(raw) {
  let name = raw
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\*\*/g, '')
    .replace(/[`_~]/g, '')
    .replace(/\b(Nu geopend|Gesloten|UitGesloten|Uit Gesloten|Tijdelijk gesloten|Permanent gesloten)\b/gi, '')
    .replace(/\b(Event planner|Event venue|Boat rental service|Restaurant|Hotel|Café|Bar|Shop|Store|Winkel|Salon|Kapper|Tandarts|Huisarts|Apotheek|Garage|Makelaar|Notaris|Advocaat|Accountant|Fysiotherapeut)\b/gi, '')
    .replace(/[A-Z][a-z]+(?:straat|weg|laan|plein|gracht|kade|singel|dijk|pad)\s*\d+.*/gi, '')
    .replace(/\d{4}\s*[A-Z]{2}\b/g, '')
    .replace(/\d+[.,]\d+\s*★?/g, '')
    .replace(/★+/g, '')
    .replace(/^[\s·•\-–—:,;|]+/, '')
    .replace(/[\s·•\-–—:,;|]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return name
}

function parseWithJS(rawOutput, companyName) {
  try {
    const mentionsCount = (rawOutput.match(new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    const isCompanyMentioned = mentionsCount > 0
    
    // Pre-clean: resolve markdown links
    const cleanedOutput = rawOutput.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

    const competitors = []
    const seen = new Set()
    const companyLower = companyName.toLowerCase()
    const excludeList = new Set([
      'google', 'facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'tiktok',
      'amazon', 'apple', 'microsoft', 'samsung', 'nike', 'adidas',
      'semrush', 'ahrefs', 'moz', 'hubspot', 'mailchimp', 'wordpress', 'shopify',
      'whatsapp', 'pinterest', 'reddit', 'bing', 'chatgpt', 'openai', 'perplexity',
      'nederland', 'netherlands', 'amsterdam', 'rotterdam', 'den haag', 'utrecht',
      'eindhoven', 'groningen', 'maastricht', 'breda', 'tilburg', 'almere'
    ])

    let match
    const boldPattern = /\*\*([^*]{3,60})\*\*/g
    while ((match = boldPattern.exec(cleanedOutput)) !== null) {
      const name = cleanCompetitorName(match[1]).replace(/\s*[-–—:].*/g, '').replace(/^\d+[\.\)]\s*/, '').trim()
      const nameLower = name.toLowerCase()
      if (
        name.length > 2 && name.length < 50 &&
        !nameLower.includes(companyLower) && !companyLower.includes(nameLower) &&
        !excludeList.has(nameLower) && !seen.has(nameLower) &&
        !nameLower.includes('?') && /[a-zA-Z]/.test(name) &&
        !nameLower.startsWith('http') && !nameLower.startsWith('www.') &&
        !/^(stap|punt|vraag|antwoord|optie|methode|strategie|voordeel|nadeel|tip|let op|belangrijk|conclusie|samenvatting)\b/i.test(name) &&
        !/^(gesloten|nu geopend|event planner|event venue|boat rental)$/i.test(name)
      ) {
        seen.add(nameLower)
        competitors.push(name)
      }
    }

    const numberedPattern = /^\s*(\d+)[\.\)\-]\s*\**([^*\n]{2,80})/gm
    while ((match = numberedPattern.exec(cleanedOutput)) !== null) {
      const name = cleanCompetitorName(match[2]).replace(/\s*[-–—:].*/g, '').trim()
      const nameLower = name.toLowerCase()
      if (
        name.length > 2 && name.length < 50 &&
        !nameLower.includes(companyLower) && !companyLower.includes(nameLower) &&
        !excludeList.has(nameLower) && !seen.has(nameLower) &&
        /[a-zA-Z]/.test(name) && !nameLower.startsWith('http')
      ) {
        seen.add(nameLower)
        competitors.push(name)
      }
    }

    let snippet = ''
    if (isCompanyMentioned) {
      const idx = rawOutput.toLowerCase().indexOf(companyLower)
      if (idx >= 0) {
        const start = Math.max(0, idx - 100)
        const end = Math.min(rawOutput.length, idx + companyName.length + 200)
        snippet = (start > 0 ? '...' : '') + rawOutput.substring(start, end).trim() + (end < rawOutput.length ? '...' : '')
      }
    }
    if (!snippet) {
      const lines = rawOutput.split('\n').filter(l => l.trim().length > 30)
      snippet = lines.slice(0, 3).join(' ').substring(0, 400)
      if (rawOutput.length > 400) snippet += '...'
    }
    snippet = snippet.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/#{1,4}\s/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
    if (!isCompanyMentioned) snippet = `Het bedrijf "${companyName}" wordt niet genoemd in dit AI-antwoord. ${snippet}`

    return { company_mentioned: isCompanyMentioned, mentions_count: mentionsCount, competitors_mentioned: competitors.slice(0, 10), simulated_ai_response_snippet: snippet.substring(0, 600) }
  } catch (error) {
    console.error('❌ JS Parser Error:', error)
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
      
      // gpt-4o-search-preview: Tier 2 met 30K TPM — 2s tussen requests
      if (i < prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
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
