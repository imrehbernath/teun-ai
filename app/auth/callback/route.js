// app/auth/callback/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/tools/ai-visibility'

  if (code) {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // If something goes wrong, redirect to error page
  return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
}
