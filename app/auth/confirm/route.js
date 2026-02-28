// app/auth/confirm/route.js
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type: type,
      token_hash,
    })

    if (!error) {
      // Koppel anonieme scan data aan de nieuwe user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // ── FIX: Read session_token from user_metadata instead of cookie ──
        // Cookie is not available here (user clicked confirm link in email,
        // possibly different browser/device). But the session_token was saved
        // in user_metadata during signUp(), so it's always accessible.
        const sessionToken = user.user_metadata?.session_token
        if (sessionToken) {
          await supabase.rpc('claim_anonymous_sessions', {
            p_session_token: sessionToken,
            p_user_id: user.id
          })
        }
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // If verification fails, redirect to error page
  return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
}
