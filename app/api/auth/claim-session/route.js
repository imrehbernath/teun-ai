import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { claimSessionData } from '@/lib/session-token'

export async function POST() {
  try {
    // Auth check via normale client (RLS)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Claim via service role (bypasses RLS)
    const supabaseAdmin = await createServiceClient()
    const result = await claimSessionData(supabaseAdmin, user.id)

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
