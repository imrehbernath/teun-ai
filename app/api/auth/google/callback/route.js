import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/auth/google/callback - Handle OAuth callback
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle errors
  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=google_auth_failed', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=missing_params', request.url))
  }

  // Decode state
  let stateData
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString())
  } catch (e) {
    return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=invalid_state', request.url))
  }

  const { userId, returnUrl } = stateData

  // Exchange code for tokens
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
      return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=token_exchange_failed', request.url))
    }

    // Store tokens in tool_integrations table
    const supabase = await createClient()
    
    // Check if Google SC integration already exists for this user
    const { data: existing } = await supabase
      .from('tool_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('tool_name', 'google_search_console')
      .single()

    const integrationData = {
      user_id: userId,
      tool_name: 'google_search_console',
      keyword: 'oauth_tokens',
      results: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope
      },
      status: 'visibility_completed',
      updated_at: new Date().toISOString()
    }

    let dbError
    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('tool_integrations')
        .update(integrationData)
        .eq('id', existing.id)
      dbError = error
    } else {
      // Insert new
      integrationData.created_at = new Date().toISOString()
      const { error } = await supabase
        .from('tool_integrations')
        .insert(integrationData)
      dbError = error
    }

    if (dbError) {
      console.error('Database error storing tokens:', dbError)
      return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=db_error', request.url))
    }

    // Redirect back with success
    return NextResponse.redirect(new URL(`${returnUrl}?google_connected=true`, request.url))

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/geo-analyse?error=unknown', request.url))
  }
}
