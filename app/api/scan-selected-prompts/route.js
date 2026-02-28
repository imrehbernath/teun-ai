// app/api/scan-selected-prompts/route.js
// ── Scan selected prompts on ChatGPT + Perplexity ──
// Lightweight endpoint: takes pre-selected prompts, runs dual-platform scan,
// updates tool_integrations with results in the same format as GEO Analyse.
// Does NOT touch /api/ai-visibility-analysis (that's the full wizard pipeline).
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Vercel function timeout — 10 prompts × 2 platforms = needs time
export const maxDuration = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── ChatGPT scan (gpt-4o-search-preview) ──
async function scanChatGPT(prompt, companyName, website, location) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-search-preview',
      max_tokens: 1500,
      web_search_options: {
        search_context_size: 'medium',
        user_location: {
          type: 'approximate',
          approximate: { country: 'NL', city: location || 'Amsterdam' }
        }
      },
      messages: [
        {
          role: 'system',
          content: `Je bent een behulpzame AI-assistent die mensen helpt met het vinden van informatie over bedrijven en diensten in Nederland. Geef uitgebreide, eerlijke antwoorden.`
        },
        { role: 'user', content: prompt }
      ]
    })

    const text = response.choices?.[0]?.message?.content || ''
    const textLower = text.toLowerCase()

    // Company mention detection
    const companyLower = (companyName || '').toLowerCase().trim()
    const websiteDomain = (website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
    const variants = companyLower ? [
      companyLower,
      companyLower.replace(/\s+/g, ''),
      companyLower.replace(/\s+/g, '-'),
    ].filter((v, i, a) => a.indexOf(v) === i) : []

    const mentioned = variants.some(v => textLower.includes(v)) ||
      (websiteDomain && textLower.includes(websiteDomain))

    // Count mentions
    let mentionCount = 0
    if (mentioned) {
      for (const v of variants) {
        const regex = new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        const matches = text.match(regex)
        if (matches) mentionCount = Math.max(mentionCount, matches.length)
      }
      if (mentionCount === 0) mentionCount = 1
    }

    // Extract competitors (basic: numbered list items that aren't the company)
    const competitors = []
    const lines = text.split('\n')
    for (const line of lines) {
      const match = line.trim().match(/^(?:[•📌🔹\d]+[.)]*\s*)\*?\*?([\p{L}\p{N}][\p{L}\p{N}\s&'.-]+?)\*?\*?\s*[–—\-:]/u)
      if (match) {
        let name = match[1].trim().replace(/\*\*/g, '')
        if (name.length >= 2 && name.length <= 60 && !variants.some(v => name.toLowerCase().includes(v))) {
          competitors.push(name)
        }
      }
    }

    // Extract sources/citations from search results
    const sources = []
    const annotations = response.choices?.[0]?.message?.annotations || []
    for (const ann of annotations) {
      if (ann.type === 'url_citation' && ann.url) {
        sources.push({ link: ann.url, title: ann.title || '', domain: new URL(ann.url).hostname })
      }
    }

    return {
      platform: 'chatgpt',
      ai_prompt: prompt,
      company_mentioned: mentioned,
      mentions_count: mentionCount,
      competitors_mentioned: [...new Set(competitors)].slice(0, 10),
      simulated_ai_response_snippet: text.slice(0, 1500),
      sources,
    }
  } catch (err) {
    console.error(`[ScanSelected] ChatGPT error for "${prompt.slice(0, 50)}":`, err.message)
    return {
      platform: 'chatgpt',
      ai_prompt: prompt,
      company_mentioned: false,
      mentions_count: 0,
      competitors_mentioned: [],
      simulated_ai_response_snippet: '',
      sources: [],
      error: err.message,
    }
  }
}

// ── Perplexity scan (sonar-pro) ──
async function scanPerplexity(prompt, companyName, website, location) {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `Je bent een behulpzame assistent die informatie geeft over bedrijven en diensten in Nederland${location ? `, specifiek in ${location}` : ''}. Antwoord ALTIJD in het Nederlands. Noem ALLEEN bedrijven die daadwerkelijk in Nederland actief zijn. Geef uitgebreide antwoorden met concrete bedrijfsnamen.`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
      })
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const textLower = text.toLowerCase()

    // Company mention detection (same logic)
    const companyLower = (companyName || '').toLowerCase().trim()
    const websiteDomain = (website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
    const variants = companyLower ? [
      companyLower,
      companyLower.replace(/\s+/g, ''),
      companyLower.replace(/\s+/g, '-'),
    ].filter((v, i, a) => a.indexOf(v) === i) : []

    const mentioned = variants.some(v => textLower.includes(v)) ||
      (websiteDomain && textLower.includes(websiteDomain))

    let mentionCount = 0
    if (mentioned) {
      for (const v of variants) {
        const regex = new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        const matches = text.match(regex)
        if (matches) mentionCount = Math.max(mentionCount, matches.length)
      }
      if (mentionCount === 0) mentionCount = 1
    }

    // Extract competitors
    const competitors = []
    const lines = text.split('\n')
    for (const line of lines) {
      const match = line.trim().match(/^(?:[•📌🔹\d]+[.)]*\s*)\*?\*?([\p{L}\p{N}][\p{L}\p{N}\s&'.-]+?)\*?\*?\s*[–—\-:]/u)
      if (match) {
        let name = match[1].trim().replace(/\*\*/g, '')
        if (name.length >= 2 && name.length <= 60 && !variants.some(v => name.toLowerCase().includes(v))) {
          competitors.push(name)
        }
      }
    }

    // Extract sources from Perplexity citations
    const sources = (data.citations || []).map(url => {
      try { return { link: url, domain: new URL(url).hostname, title: '' } }
      catch { return { link: url, domain: '', title: '' } }
    })

    return {
      platform: 'perplexity',
      ai_prompt: prompt,
      company_mentioned: mentioned,
      mentions_count: mentionCount,
      competitors_mentioned: [...new Set(competitors)].slice(0, 10),
      simulated_ai_response_snippet: text.slice(0, 1500),
      sources,
    }
  } catch (err) {
    console.error(`[ScanSelected] Perplexity error for "${prompt.slice(0, 50)}":`, err.message)
    return {
      platform: 'perplexity',
      ai_prompt: prompt,
      company_mentioned: false,
      mentions_count: 0,
      competitors_mentioned: [],
      simulated_ai_response_snippet: '',
      sources: [],
      error: err.message,
    }
  }
}

export async function POST(request) {
  try {
    // Auth check via regular client
    const authClient = await createClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    // Service client for DB operations (bypasses RLS)
    const supabase = await createServiceClient()

    const { integrationId, prompts, companyName, website, branche, location } = await request.json()

    if (!integrationId || !prompts || prompts.length === 0) {
      return NextResponse.json({ error: 'Missing integrationId or prompts' }, { status: 400 })
    }

    console.log(`[ScanSelected] Starting dual-platform scan: ${prompts.length} prompts for ${companyName} (integration: ${integrationId})`)
    const startTime = Date.now()

    // Run prompts in batches of 3 to avoid rate limits
    const results = { chatgpt: [], perplexity: [] }
    const batchSize = 3
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize)
      console.log(`[ScanSelected] Batch ${Math.floor(i / batchSize) + 1}: prompts ${i + 1}-${Math.min(i + batchSize, prompts.length)}`)
      const batchResults = await Promise.all(
        batch.map(async (prompt) => {
          const [chatgpt, perplexity] = await Promise.all([
            scanChatGPT(prompt, companyName, website, location),
            scanPerplexity(prompt, companyName, website, location),
          ])
          return { chatgpt, perplexity }
        })
      )
      for (const r of batchResults) {
        results.chatgpt.push(r.chatgpt)
        results.perplexity.push(r.perplexity)
      }
    }

    // Count total mentions
    const chatgptFound = results.chatgpt.filter(r => r.company_mentioned).length
    const perplexityFound = results.perplexity.filter(r => r.company_mentioned).length
    const totalMentions = chatgptFound + perplexityFound

    const scanDuration = Date.now() - startTime
    console.log(`[ScanSelected] Scan complete in ${(scanDuration / 1000).toFixed(1)}s: ChatGPT ${chatgptFound}/${prompts.length}, Perplexity ${perplexityFound}/${prompts.length}`)

    // Update tool_integrations with results
    const { error: updateError } = await supabase
      .from('tool_integrations')
      .update({
        results,
        total_company_mentions: totalMentions,
      })
      .eq('id', integrationId)

    if (updateError) {
      console.error('[ScanSelected] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
    }

    // Update prompt_discovery_results status
    await supabase
      .from('prompt_discovery_results')
      .update({ status: 'scanned' })
      .eq('scan_integration_id', integrationId)

    // Slack notification (fire-and-forget)
    if (process.env.SLACK_WEBHOOK_URL) {
      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🎯 Prompt Selection scan: ${companyName} (${website}) — ${prompts.length} prompts → ChatGPT ${chatgptFound}/${prompts.length}, Perplexity ${perplexityFound}/${prompts.length} (${(scanDuration / 1000).toFixed(0)}s)`
        })
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      integrationId,
      results: {
        chatgpt: { found: chatgptFound, total: prompts.length },
        perplexity: { found: perplexityFound, total: prompts.length },
      },
      scanDuration,
    })

  } catch (err) {
    console.error('[ScanSelected] Error:', err)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
