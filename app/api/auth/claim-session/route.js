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

    // Body parsing voor selective-claim params + cross-browser fallback token
    let body = {}
    try {
      body = await request.json()
    } catch {
      // No body or invalid JSON, prima -- legacy flow gebruikt cookie alleen
    }

    let fallbackToken = body.sessionToken || null
    const scanIds = Array.isArray(body.scanIds) ? body.scanIds : []
    const discoveryIds = Array.isArray(body.discoveryIds) ? body.discoveryIds : []

    // Second fallback: read from user_metadata (set during signUp with ?st= param)
    if (!fallbackToken && user.user_metadata?.session_token) {
      fallbackToken = user.user_metadata.session_token
      console.log(`📋 Using session token from user_metadata: ${fallbackToken.slice(0, 8)}...`)
    }

    // Pull scan-ids uit user_metadata (gezet bij signup) als de frontend ze niet
    // in de body heeft meegestuurd. Cross-browser scenario: user opent confirm-mail
    // in andere browser, daar staat sessionStorage niet.
    const metaScanIds = Array.isArray(user.user_metadata?.my_scan_ids) ? user.user_metadata.my_scan_ids : []
    const metaDiscoveryIds = Array.isArray(user.user_metadata?.my_discovery_ids) ? user.user_metadata.my_discovery_ids : []
    const mergedScanIds = [...new Set([...scanIds, ...metaScanIds])]
    const mergedDiscoveryIds = [...new Set([...discoveryIds, ...metaDiscoveryIds])]

    // Claim via service role (bypasses RLS)
    const supabaseAdmin = await createServiceClient()
    const result = await claimSessionData(supabaseAdmin, user.id, fallbackToken, {
      scanIds: mergedScanIds,
      discoveryIds: mergedDiscoveryIds,
    })

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
