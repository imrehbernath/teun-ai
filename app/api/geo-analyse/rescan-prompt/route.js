import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  getPerplexityCompetitorSystemPrompt,
  extractCompetitorsFromPerplexity,
  stripCompetitorBlock,
} from '@/lib/competitor-extract'
import { textMentionsBrand } from '@/lib/rank-scanner'

export const maxDuration = 60

// Herscan van EEN enkele prompt op Perplexity, niet-destructief gemerged in
// tool_integrations.results.perplexity. Gebruikt de gedeelde competitor-extract
// lib (zelfde strenge extractie als de rest), geen nieuwe scan-architectuur.
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId, prompt, companyName = '', website = '', locale = 'nl' } = await request.json()
    if (!integrationId || !prompt) {
      return NextResponse.json({ error: 'integrationId en prompt zijn vereist' }, { status: 400 })
    }
    const isNL = locale !== 'en'

    // Perplexity-call voor 1 prompt: 1 retry, ruime timeout (zie scan-stabilisatie).
    let content = ''
    for (let attempt = 1; attempt <= 2 && !content.trim(); attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 32000)
      try {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            web_search_options: { search_type: 'auto' },
            messages: [
              { role: 'system', content: getPerplexityCompetitorSystemPrompt(isNL ? 'nl' : 'en') },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          content = data?.choices?.[0]?.message?.content || ''
        }
      } catch (e) {
        // retry
      } finally {
        clearTimeout(timer)
      }
    }

    if (!content.trim()) {
      return NextResponse.json({
        ai_prompt: prompt,
        platform: 'perplexity',
        scan_status: 'failed',
        failure_reason: 'timeout',
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: isNL ? 'Analyse timeout' : 'Analysis timeout',
      })
    }

    const competitors = extractCompetitorsFromPerplexity(content, companyName || '')
    const mentioned = textMentionsBrand(content, companyName || '')
    const entry = {
      ai_prompt: prompt,
      platform: 'perplexity',
      scan_status: 'completed',
      company_mentioned: mentioned,
      mentions_count: mentioned ? 1 : 0,
      competitors_mentioned: competitors,
      simulated_ai_response_snippet: stripCompetitorBlock(content).slice(0, 600),
    }

    // Merge in tool_integrations.results.perplexity (vervang de entry voor deze prompt).
    const db = await createServiceClient()
    const { data: row } = await db
      .from('tool_integrations')
      .select('results')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single()

    if (row) {
      const promptOf = (r) => r?.ai_prompt || r?.query || r?.prompt
      if (Array.isArray(row.results)) {
        // Oud flat-formaat = Perplexity-array.
        const px = [...row.results]
        const idx = px.findIndex(r => promptOf(r) === prompt)
        if (idx >= 0) px[idx] = { ...px[idx], ...entry }
        else px.push(entry)
        await db.from('tool_integrations').update({ results: px }).eq('id', integrationId).eq('user_id', user.id)
      } else {
        const results = { ...(row.results || {}) }
        const px = Array.isArray(results.perplexity) ? [...results.perplexity] : []
        const idx = px.findIndex(r => promptOf(r) === prompt)
        if (idx >= 0) px[idx] = { ...px[idx], ...entry }
        else px.push(entry)
        results.perplexity = px
        await db.from('tool_integrations').update({ results }).eq('id', integrationId).eq('user_id', user.id)
      }
    }

    return NextResponse.json(entry)
  } catch (err) {
    console.error('[rescan-prompt] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
