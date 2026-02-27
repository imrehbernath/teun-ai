import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSessionToken, claimSessionData } from '@/lib/session-token'

export async function POST() {
  try {
    // Auth check via normale client (RLS)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Session token uit cookie
    const sessionToken = await getSessionToken()

    if (!sessionToken) {
      return NextResponse.json({ claimed: { total: 0 }, message: 'No session token' })
    }

    // Claim via service role (bypasses RLS)
    const supabaseAdmin = await createServiceClient()
    const result = await claimSessionData(supabaseAdmin, user.id, sessionToken)

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
