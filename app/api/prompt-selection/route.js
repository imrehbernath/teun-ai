// app/api/prompt-selection/route.js
// ── Save selected prompts from Prompt Explorer → trigger AI visibility scan ──
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Auth check via regular client
    const authClient = await createClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    // Service client for DB operations (bypasses RLS, same as ai-visibility-analysis)
    const supabase = await createServiceClient()

    const body = await request.json()
    const { discoveryId, selectedPrompts, website, brandName, branche, location } = body

    if (!discoveryId || !selectedPrompts || selectedPrompts.length === 0) {
      return NextResponse.json({ error: 'Missing discoveryId or selectedPrompts' }, { status: 400 })
    }

    if (selectedPrompts.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 prompts' }, { status: 400 })
    }

    console.log(`[PromptSelection] User ${user.id} selected ${selectedPrompts.length} prompts for ${brandName}`)

    // 1. Update prompt_discovery_results with selection
    //    user_id might still be NULL if claim hasn't run — also claim here
    const sessionToken = user.user_metadata?.session_token || null

    let updateQuery = supabase
      .from('prompt_discovery_results')
      .update({
        selected_prompts: selectedPrompts,
        selected_count: selectedPrompts.length,
        status: 'selected',
        user_id: user.id, // Claim ownership during selection
      })
      .eq('id', discoveryId)

    if (sessionToken) {
      updateQuery = updateQuery.or(`user_id.eq.${user.id},session_token.eq.${sessionToken}`)
    } else {
      updateQuery = updateQuery.eq('user_id', user.id)
    }

    const { error: updateError } = await updateQuery
    if (updateError) {
      console.error('[PromptSelection] Update error:', updateError)
      // Non-blocking: continue to create integration even if discovery update fails
    }

    // 2. Create tool_integrations entry with commercial_prompts
    const { data: integration, error: insertError } = await supabase
      .from('tool_integrations')
      .insert({
        user_id: user.id,
        keyword: brandName || website,
        company_name: brandName || (() => {
          try { return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace('www.', '') }
          catch { return website }
        })(),
        website: website,
        company_category: branche || null,
        commercial_prompts: selectedPrompts,
        prompts_count: selectedPrompts.length,
        results: { chatgpt: [], perplexity: [] },
        total_company_mentions: 0,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[PromptSelection] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 })
    }

    // 3. Link back: store integration ID in prompt_discovery_results
    if (sessionToken) {
      await supabase
        .from('prompt_discovery_results')
        .update({ scan_integration_id: integration.id })
        .eq('id', discoveryId)
        .or(`user_id.eq.${user.id},session_token.eq.${sessionToken}`)
    }

    console.log(`[PromptSelection] Created integration ${integration.id} for ${brandName} with ${selectedPrompts.length} prompts`)

    // 4. Trigger scan in background (fire-and-forget)
    const scanUrl = new URL('/api/scan-selected-prompts', request.url)
    fetch(scanUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        integrationId: integration.id,
        prompts: selectedPrompts,
        companyName: brandName,
        website: website,
        branche: branche,
        location: location,
      })
    }).catch(err => console.error('[PromptSelection] Background scan trigger error:', err))

    return NextResponse.json({
      success: true,
      integrationId: integration.id,
      promptsSelected: selectedPrompts.length,
    })

  } catch (err) {
    console.error('[PromptSelection] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
