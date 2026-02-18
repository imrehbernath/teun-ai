// app/api/v1/page/analyze/route.js
// Page Analysis & Prompt Matching Endpoint
//
// Receives page signals from WordPress, generates relevant prompts
// using AI, and stores the page-prompt mappings.

import { NextResponse } from 'next/server'
import { validateApiKey, supabase } from '@/lib/wp-plugin/auth'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request) {
  try {
    // ─── Auth ───
    const apiKey = request.headers.get('x-api-key')
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const {
      website_id,
      page_url,
      page_path,
      post_id,
      language,
      title,
      h1,
      focus_keyword,
      content_excerpt,
      schema_types,
    } = body

    // ─── Validate ───
    if (!website_id || !page_url) {
      return NextResponse.json(
        { error: 'website_id and page_url are required' },
        { status: 400 }
      )
    }

    // Verify website belongs to this API key
    const connection = auth.data.connections.find(c => c.website_id === website_id)
    if (!connection) {
      return NextResponse.json(
        { error: 'Website not found for this API key' },
        { status: 403 }
      )
    }

    // ─── Check for existing prompts ───
    const { data: existingPrompts } = await supabase
      .from('page_prompts')
      .select('*')
      .eq('website_id', website_id)
      .eq('page_url', page_url)
      .eq('language', language || 'nl')

    // If we already have prompts and they're recent (< 24h), return them
    if (existingPrompts && existingPrompts.length > 0) {
      const mostRecent = new Date(existingPrompts[0].updated_at)
      const hoursSinceUpdate = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60)

      if (hoursSinceUpdate < 24) {
        return NextResponse.json({
          page_id: `${website_id}:${page_url}`,
          matched_prompts: existingPrompts.map(formatPrompt),
          suggested_prompts: [],
          cached: true,
        })
      }
    }

    // ─── Generate prompts with AI ───
    const promptLimit = auth.data.limits.prompts_per_page || 3
    const generatedPrompts = await generatePrompts({
      title,
      h1,
      focus_keyword,
      content_excerpt,
      language: language || 'nl',
      limit: promptLimit + 3, // Generate a few extra for suggestions
    })

    if (!generatedPrompts || generatedPrompts.length === 0) {
      return NextResponse.json(
        { error: 'Could not generate prompts for this page' },
        { status: 500 }
      )
    }

    // ─── Store matched prompts ───
    const matchedPrompts = generatedPrompts.slice(0, promptLimit)
    const suggestedPrompts = generatedPrompts.slice(promptLimit)

    // Delete old auto-matched prompts (keep manual ones)
    await supabase
      .from('page_prompts')
      .delete()
      .eq('website_id', website_id)
      .eq('page_url', page_url)
      .eq('match_type', 'auto')

    // Insert new prompts
    const promptsToInsert = matchedPrompts.map((prompt, index) => ({
      website_id,
      page_url,
      page_path: page_path || null,
      post_id: post_id || null,
      prompt_text: prompt.text,
      language: language || 'nl',
      match_type: 'auto',
      match_score: prompt.confidence || (1 - index * 0.1),
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('page_prompts')
      .upsert(promptsToInsert, {
        onConflict: 'website_id,page_url,prompt_text',
      })
      .select()

    if (insertError) {
      console.error('Error storing prompts:', insertError)
    }

    // ─── Also fetch any existing manual prompts ───
    const { data: manualPrompts } = await supabase
      .from('page_prompts')
      .select('*')
      .eq('website_id', website_id)
      .eq('page_url', page_url)
      .eq('match_type', 'manual')

    const allMatched = [
      ...(manualPrompts || []).map(formatPrompt),
      ...(inserted || promptsToInsert).map(formatPrompt),
    ]

    console.log(`📄 Page analyzed: ${page_url} → ${allMatched.length} prompts (${language})`)

    return NextResponse.json({
      page_id: `${website_id}:${page_url}`,
      matched_prompts: allMatched,
      suggested_prompts: suggestedPrompts.map(p => ({
        text: p.text,
        confidence: p.confidence,
      })),
      cached: false,
    })

  } catch (error) {
    console.error('Page analyze error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Prompt Generation with OpenAI ───

async function generatePrompts({ title, h1, focus_keyword, content_excerpt, language, limit }) {
  const langLabel = language === 'nl' ? 'Dutch' : language === 'de' ? 'German' : language === 'fr' ? 'French' : 'English'

  const systemPrompt = `You are an AI search query expert. Your job is to generate realistic search prompts that people would type into AI assistants like ChatGPT, Perplexity, or Google AI.

These prompts should be:
- In ${langLabel} language
- Natural conversational queries (how people actually ask AI, not Google keyword style)
- Relevant to the page content provided
- A mix of informational, commercial, and local queries where applicable
- Between 5-15 words each

Return ONLY a JSON array of objects with "text" (the prompt) and "confidence" (0.0-1.0 relevance score).
Example: [{"text": "beste tandarts voor implantaten Amsterdam", "confidence": 0.95}]

Return exactly ${limit} prompts, sorted by confidence descending. No markdown, no explanation, just the JSON array.`

  const pageContext = [
    title && `Page title: ${title}`,
    h1 && `H1: ${h1}`,
    focus_keyword && `Focus keyword: ${focus_keyword}`,
    content_excerpt && `Content excerpt: ${content_excerpt.substring(0, 800)}`,
  ].filter(Boolean).join('\n')

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate AI search prompts for this page:\n\n${pageContext}` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) return []

    // Parse JSON (handle potential markdown wrapping)
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const prompts = JSON.parse(cleaned)

    if (!Array.isArray(prompts)) return []

    return prompts
      .filter(p => p.text && typeof p.text === 'string')
      .map(p => ({
        text: p.text.trim(),
        confidence: Math.min(1, Math.max(0, parseFloat(p.confidence) || 0.5)),
      }))

  } catch (error) {
    console.error('OpenAI prompt generation error:', error)
    
    // Fallback: generate basic prompts from title/keyword
    return generateFallbackPrompts({ title, h1, focus_keyword, language, limit })
  }
}

// ─── Fallback when AI is unavailable ───

function generateFallbackPrompts({ title, h1, focus_keyword, language, limit }) {
  const baseQuery = focus_keyword || h1 || title || ''
  if (!baseQuery) return []

  const isNl = language === 'nl'

  const templates = isNl
    ? [
        `beste ${baseQuery}`,
        `wat is ${baseQuery}`,
        `${baseQuery} ervaringen`,
        `${baseQuery} kosten`,
        `${baseQuery} vergelijken`,
        `waar vind ik ${baseQuery}`,
      ]
    : [
        `best ${baseQuery}`,
        `what is ${baseQuery}`,
        `${baseQuery} reviews`,
        `${baseQuery} cost`,
        `${baseQuery} comparison`,
        `where to find ${baseQuery}`,
      ]

  return templates.slice(0, limit).map((text, i) => ({
    text,
    confidence: 0.6 - i * 0.05,
  }))
}

// ─── Format prompt for API response ───

function formatPrompt(prompt) {
  return {
    id: prompt.id,
    text: prompt.prompt_text || prompt.text,
    language: prompt.language,
    match_type: prompt.match_type || 'auto',
    match_score: prompt.match_score || prompt.confidence,
  }
}
