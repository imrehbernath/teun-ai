// app/api/v1/prompts/add/route.js
// Add Manual Prompt Endpoint
//
// Allows users to manually add a prompt to a page.

import { NextResponse } from 'next/server'
import { validateApiKey, supabase } from '@/lib/wp-plugin/auth'

export async function POST(request) {
  try {
    // ─── Auth ───
    const apiKey = request.headers.get('x-api-key')
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const { page_id, prompt_text, language } = body

    if (!page_id || !prompt_text) {
      return NextResponse.json(
        { error: 'page_id and prompt_text are required' },
        { status: 400 }
      )
    }

    // Parse page_id
    const colonIndex = page_id.indexOf(':')
    if (colonIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid page_id format' },
        { status: 400 }
      )
    }

    const websiteId = page_id.substring(0, colonIndex)
    const pageUrl = page_id.substring(colonIndex + 1)

    // Verify website
    const connection = auth.data.connections.find(c => c.website_id === websiteId)
    if (!connection) {
      return NextResponse.json(
        { error: 'Website not found for this API key' },
        { status: 403 }
      )
    }

    // Check prompt limit
    const { count } = await supabase
      .from('page_prompts')
      .select('id', { count: 'exact' })
      .eq('website_id', websiteId)
      .eq('page_url', pageUrl)

    const limit = auth.data.limits.prompts_per_page || 3
    if (count >= limit && auth.data.plan === 'free') {
      return NextResponse.json({
        error: `Maximum ${limit} prompts per page on free plan. Upgrade for more.`,
        upgrade_url: 'https://teun.ai/pricing',
      }, { status: 429 })
    }

    // Insert prompt
    const { data: prompt, error } = await supabase
      .from('page_prompts')
      .upsert({
        website_id: websiteId,
        page_url: pageUrl,
        prompt_text: prompt_text.trim(),
        language: language || 'nl',
        match_type: 'manual',
        match_score: 1.0,
      }, {
        onConflict: 'website_id,page_url,prompt_text',
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding prompt:', error)
      return NextResponse.json(
        { error: 'Failed to add prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: prompt.id,
      text: prompt.prompt_text,
      language: prompt.language,
      match_type: 'manual',
    }, { status: 201 })

  } catch (error) {
    console.error('Add prompt error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
