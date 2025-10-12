// app/auth/confirm/route.js
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/tools/ai-visibility'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type: type,
      token_hash,
    })

    if (!error) {
      // Redirect naar success pagina of direct naar tool
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // Als verificatie faalt, redirect naar error
  return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
}