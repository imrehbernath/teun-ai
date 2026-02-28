// app/auth/confirm/route.js
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { claimSessionData } from '@/lib/session-token'

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
        await claimSessionData(supabase, user.id)
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // If verification fails, redirect to error page
  return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
}
