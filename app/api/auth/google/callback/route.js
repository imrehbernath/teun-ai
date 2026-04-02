import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/auth/google/callback - Handle OAuth callback (supports anonymous)
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=google_auth_failed', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=missing_params', request.url))
  }

  let stateData
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString())
  } catch (e) {
    return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=invalid_state', request.url))
  }

  const { userId, sessionToken, returnUrl } = stateData
  const redirectPath = returnUrl || '/dashboard/geo-analyse'

  // Must have either userId or sessionToken
  if (!userId && !sessionToken) {
    return NextResponse.redirect(new URL(`${redirectPath}?error=no_identity`, request.url))
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'https://teun.ai/api/auth/google/callback',
        grant_type: 'authorization_code'
      })
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      console.error('Token exchange error:', tokens)
      return NextResponse.redirect(new URL(`${redirectPath}?error=token_exchange_failed`, request.url))
    }

    const supabase = await createClient()

    // Delete old integration (clean reconnect)
    if (userId) {
      await supabase
        .from('tool_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('tool_name', 'google_search_console')
    } else if (sessionToken) {
      await supabase
        .from('tool_integrations')
        .delete()
        .eq('session_token', sessionToken)
        .eq('tool_name', 'google_search_console')
    }

    // Insert fresh integration
    const isAnonymous = !userId && !!sessionToken

    const insertData = {
      tool_name: 'google_search_console',
      keyword: 'oauth_tokens',
      results: {
        access_token: tokens.access_token,
        // Anonymous: NO refresh_token (security), tokens expire after ~1 hour
        // Logged in: full refresh_token for persistent connection
        refresh_token: isAnonymous ? null : (tokens.refresh_token || null),
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope,
        anonymous: isAnonymous,
      },
      status: 'visibility_completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (userId) {
      insertData.user_id = userId
    }
    if (sessionToken) {
      insertData.session_token = sessionToken
    }

    const { error: dbError } = await supabase
      .from('tool_integrations')
      .insert(insertData)

    if (dbError) {
      console.error('Database error storing tokens:', dbError)
      return NextResponse.redirect(new URL(`${redirectPath}?error=db_error`, request.url))
    }

    return NextResponse.redirect(new URL(`${redirectPath}?google_connected=true`, request.url))

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL(`${redirectPath}?error=unknown`, request.url))
  }
}
