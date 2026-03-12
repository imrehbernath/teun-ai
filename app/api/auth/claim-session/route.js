import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { claimSessionData } from '@/lib/session-token'

export async function POST(request) {
  try {
    // Auth check via normale client (RLS)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Cross-browser fallback: read session token from request body
    let fallbackToken = null
    try {
      const body = await request.json()
      fallbackToken = body.sessionToken || null
    } catch {
      // No body or invalid JSON — that's fine, cookie will be used
    }

    // Second fallback: read from user_metadata (set during signup with ?st= param)
    if (!fallbackToken && user.user_metadata?.session_token) {
      fallbackToken = user.user_metadata.session_token
      console.log(`📋 Using session token from user_metadata: ${fallbackToken.slice(0, 8)}...`)
    }

    // Claim via service role (bypasses RLS)
    const supabaseAdmin = await createServiceClient()
    const result = await claimSessionData(supabaseAdmin, user.id, fallbackToken)

    const total = (result.tool_integrations || 0) + (result.prompt_discovery_results || 0)

    return NextResponse.json({
      success: true,
      claimed: { ...result, total },
      message: total > 0 ? `${total} scan(s) gekoppeld aan account` : 'Geen openstaande scans'
    })
  } catch (err) {
    console.error('❌ Claim session error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
