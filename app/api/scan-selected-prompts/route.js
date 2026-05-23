// app/api/scan-selected-prompts/route.js
// ── Scan selected prompts on ChatGPT + Perplexity ──
// Lightweight endpoint: takes pre-selected prompts, runs dual-platform scan,
// updates tool_integrations with results in the same format as GEO Analyse.
// Does NOT touch /api/ai-visibility-analysis (that's the full wizard pipeline).
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { upsertVisibilityHistoryRows } from '@/lib/visibility-history'
import {
  extractCompetitorsFromChatGPT,
  extractCompetitorsFromPerplexity,
  getPerplexityCompetitorSystemPrompt,
  stripCompetitorBlock,
} from '@/lib/competitor-extract'

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

    // Extract competitors via gedeelde lib (zelfde filter als ai-visibility-analysis)
    const competitors = extractCompetitorsFromChatGPT(text, companyName)

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
      competitors_mentioned: competitors,
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
            content: getPerplexityCompetitorSystemPrompt('nl', location)
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

    // Extract competitors via gedeelde lib: eerst het ===BEDRIJVEN===-blok,
    // fallback met de uitgebreide isValidCompetitorName-filter uit ai-visibility-analysis.
    const competitors = extractCompetitorsFromPerplexity(text, companyName)

    // Strip het ===BEDRIJVEN===-blok uit de snippet die we naar de UI sturen
    const cleanText = stripCompetitorBlock(text)

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
      competitors_mentioned: competitors,
      simulated_ai_response_snippet: cleanText.slice(0, 1500),
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
    // Internal endpoint — called by prompt-selection (which handles auth)
    // Uses service client for all DB operations
    const supabase = await createServiceClient()

    const { integrationId, prompts, companyName, website, branche, location, writeHistory } = await request.json()

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

    // Snapshot huidige results naar previous_results vóór de overschrijving,
    // zodat de Prompts-tab een voor-en-na vergelijking per prompt kan tonen.
    // Eerste scan: previous_results blijft NULL omdat oldRow.results dan ook null is.
    const { data: oldRow } = await supabase
      .from('tool_integrations')
      .select('results')
      .eq('id', integrationId)
      .single()

    const { error: updateError } = await supabase
      .from('tool_integrations')
      .update({
        results,
        total_company_mentions: totalMentions,
        previous_results: oldRow?.results ?? null,
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

    // Optionally write summary rows to visibility_history (used by the weekly cron
    // to feed the dashboard "Zichtbaarheid over tijd" chart with one datapoint per run).
    if (writeHistory) {
      try {
        const { data: integrationRow } = await supabase
          .from('tool_integrations')
          .select('user_id')
          .eq('id', integrationId)
          .single()

        const userId = integrationRow?.user_id
        if (userId) {
          const summarize = (platformKey, label) => {
            const arr = results[platformKey] || []
            const found = arr.filter(r => r.company_mentioned).length
            const total = arr.length
            const mentions = arr.reduce((sum, r) => sum + (r.mentions_count || 0), 0)

            const competitorCounts = {}
            for (const r of arr) {
              for (const name of (r.competitors_mentioned || [])) {
                if (!name || typeof name !== 'string') continue
                const cleaned = name.trim()
                if (cleaned.length < 2 || cleaned.length > 80) continue
                competitorCounts[cleaned] = (competitorCounts[cleaned] || 0) + 1
              }
            }
            const top = Object.entries(competitorCounts).sort((a, b) => b[1] - a[1])[0]

            return {
              user_id: userId,
              integration_id: integrationId,
              platform: label,
              prompts_total: total,
              prompts_found: found,
              visibility_pct: total > 0 ? Math.round((found / total) * 10000) / 100 : 0,
              total_mentions: mentions,
              top_competitor: top ? top[0] : null,
              top_competitor_count: top ? top[1] : null,
            }
          }

          // Total = prompts where company was mentioned in at least one platform.
          // Aggregating per-platform percentages with avg() is misleading, so we
          // count unique prompts found across chatgpt+perplexity.
          const chatgptArr = results.chatgpt || []
          const perplexityArr = results.perplexity || []
          const totalPromptCount = Math.max(chatgptArr.length, perplexityArr.length)
          let totalFound = 0
          let totalMentionsSum = 0
          const totalCompetitorCounts = {}
          for (let i = 0; i < totalPromptCount; i++) {
            const cg = chatgptArr[i]
            const px = perplexityArr[i]
            if (cg?.company_mentioned || px?.company_mentioned) totalFound++
            totalMentionsSum += (cg?.mentions_count || 0) + (px?.mentions_count || 0)
            for (const name of (cg?.competitors_mentioned || [])) {
              if (!name || typeof name !== 'string') continue
              const c = name.trim()
              if (c.length < 2 || c.length > 80) continue
              totalCompetitorCounts[c] = (totalCompetitorCounts[c] || 0) + 1
            }
            for (const name of (px?.competitors_mentioned || [])) {
              if (!name || typeof name !== 'string') continue
              const c = name.trim()
              if (c.length < 2 || c.length > 80) continue
              totalCompetitorCounts[c] = (totalCompetitorCounts[c] || 0) + 1
            }
          }
          const totalTop = Object.entries(totalCompetitorCounts).sort((a, b) => b[1] - a[1])[0]

          const rows = [
            summarize('chatgpt', 'chatgpt'),
            summarize('perplexity', 'perplexity'),
            {
              user_id: userId,
              integration_id: integrationId,
              platform: 'total',
              prompts_total: totalPromptCount,
              prompts_found: totalFound,
              visibility_pct: totalPromptCount > 0 ? Math.round((totalFound / totalPromptCount) * 10000) / 100 : 0,
              total_mentions: totalMentionsSum,
              top_competitor: totalTop ? totalTop[0] : null,
              top_competitor_count: totalTop ? totalTop[1] : null,
            },
          ]

          await upsertVisibilityHistoryRows(supabase, rows)
          console.log(`[ScanSelected] visibility_history: ${rows.length} rows upserted (day-bucket) for integration ${integrationId}`)
        }
      } catch (e) {
        console.error('[ScanSelected] writeHistory failed:', e?.message)
      }
    }

    // Slack notification with PRO badge (fire-and-forget)
    if (process.env.SLACK_WEBHOOK_URL) {
      // Look up user subscription status
      let userBadge = '🆓 Gratis'
      try {
        const { data: integration } = await supabase
          .from('tool_integrations')
          .select('user_id')
          .eq('id', integrationId)
          .single()

        if (integration?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, subscription_status')
            .eq('id', integration.user_id)
            .single()

          const adminEmails = ['imre@onlinelabs.nl', 'hallo@onlinelabs.nl']
          if (adminEmails.includes(profile?.email)) {
            userBadge = '🔧 Admin'
          } else if (['active', 'canceling'].includes(profile?.subscription_status)) {
            userBadge = '⭐ PRO'
          }
        }
      } catch (e) {}

      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🎯 GEO Analyse Scan', emoji: true }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Bedrijf:*\n${companyName}` },
                { type: 'mrkdwn', text: `*Website:*\n${website}` },
                { type: 'mrkdwn', text: `*Account:*\n${userBadge}` },
                { type: 'mrkdwn', text: `*Prompts:*\n${prompts.length}` },
                { type: 'mrkdwn', text: `*ChatGPT:*\n${chatgptFound}/${prompts.length} vermeld` },
                { type: 'mrkdwn', text: `*Perplexity:*\n${perplexityFound}/${prompts.length} vermeld` },
              ]
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `${new Date().toLocaleString('nl-NL')} · GEO Analyse · ${(scanDuration / 1000).toFixed(0)}s` }]
            }
          ]
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
