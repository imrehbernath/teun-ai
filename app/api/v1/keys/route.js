// app/api/v1/keys/route.js
// API Key Management Endpoint
//
// GET  - List all API keys for the logged-in user
// POST - Generate a new API key

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/wp-plugin/auth'

// ─── GET: List user's API keys ───
export async function GET(request) {
  try {
    const supabase = await createServiceClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch all keys with their connections
    const { data: keys, error } = await supabase
      .from('wp_api_keys')
      .select(`
        id,
        api_key,
        key_name,
        plan,
        scans_per_month,
        prompts_per_page,
        platforms,
        is_active,
        last_used_at,
        usage_count,
        created_at,
        wp_connections (
          id,
          website_id,
          site_url,
          site_name,
          wp_version,
          plugin_version,
          seo_plugin,
          multilingual,
          last_connected_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      )
    }

    // Mask API keys (show first 12 + last 4 chars)
    const maskedKeys = (keys || []).map(key => ({
      ...key,
      api_key_masked: maskApiKey(key.api_key),
      api_key_full: key.api_key, // Full key — user needs this for WP plugin
    }))

    return NextResponse.json({ keys: maskedKeys })

  } catch (error) {
    console.error('Keys GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── POST: Generate new API key ───
export async function POST(request) {
  try {
    const supabase = await createServiceClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const keyName = body.name || 'WordPress Plugin'

    // Check existing keys limit (max 5 per user)
    const { count } = await supabase
      .from('wp_api_keys')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (count >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 active API keys per account. Deactivate an existing key first.' },
        { status: 400 }
      )
    }

    // Generate unique API key
    let apiKey = generateApiKey()
    
    // Ensure uniqueness (extremely unlikely collision, but safety first)
    let attempts = 0
    while (attempts < 5) {
      const { data: exists } = await supabase
        .from('wp_api_keys')
        .select('id')
        .eq('api_key', apiKey)
        .single()

      if (!exists) break
      apiKey = generateApiKey()
      attempts++
    }

    // Insert new key
    const { data: newKey, error } = await supabase
      .from('wp_api_keys')
      .insert({
        user_id: user.id,
        api_key: apiKey,
        key_name: keyName,
        plan: 'free', // Default to free — upgraded via billing
        scans_per_month: 5,
        prompts_per_page: 3,
        platforms: ['chatgpt', 'perplexity'],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json(
        { error: 'Failed to generate API key' },
        { status: 500 }
      )
    }

    console.log(`🔑 New API key generated for user ${user.email}: ${maskApiKey(apiKey)}`)

    return NextResponse.json({
      key: {
        id: newKey.id,
        api_key: newKey.api_key, // Show full key ONCE on creation
        key_name: newKey.key_name,
        plan: newKey.plan,
        created_at: newKey.created_at,
      },
      message: 'API key generated. Copy it now — it won\'t be shown in full again.',
    }, { status: 201 })

  } catch (error) {
    console.error('Keys POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Helper: Mask API key for display ───
function maskApiKey(key) {
  if (!key || key.length < 16) return '****'
  return key.substring(0, 12) + '...' + key.substring(key.length - 4)
}
