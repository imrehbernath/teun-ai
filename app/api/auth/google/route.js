import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

// GET /api/auth/google - Start OAuth flow (supports anonymous users)
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://teun.ai/api/auth/google/callback'

  // Get or create GSC session token for anonymous users (separate from AI visibility session)
  let sessionToken = null
  if (!user) {
    const cookieStore = await cookies()
    sessionToken = cookieStore.get('teun_gsc_session')?.value
    if (!sessionToken) {
      sessionToken = uuidv4()
    }
  }

  // Store user ID or session token in state for callback
  const state = Buffer.from(JSON.stringify({
    userId: user?.id || null,
    sessionToken: !user ? sessionToken : null,
    returnUrl: request.nextUrl.searchParams.get('returnUrl') || '/dashboard/geo-analyse'
  })).toString('base64')

  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly'
  ].join(' ')

  const promptParam = request.nextUrl.searchParams.get('prompt')
  const promptValue = promptParam === 'select_account' ? 'select_account consent' : 'consent'

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', promptValue)
  authUrl.searchParams.set('state', state)

  // Set session token cookie for anonymous users before redirect
  if (!user && sessionToken) {
    const response = NextResponse.redirect(authUrl.toString())
    response.cookies.set('teun_gsc_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours only for anonymous
      path: '/',
    })
    return response
  }

  return NextResponse.redirect(authUrl.toString())
}
