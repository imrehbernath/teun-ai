import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Helper to get valid access token (supports user_id OR session_token)
async function getValidAccessToken(supabase, userId, sessionToken) {
  // Try user_id first, then session_token
  let integration = null

  if (userId) {
    const { data } = await supabase
      .from('tool_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_name', 'google_search_console')
      .single()
    integration = data
  }

  if (!integration && sessionToken) {
    const { data } = await supabase
      .from('tool_integrations')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('tool_name', 'google_search_console')
      .single()
    integration = data
  }

  if (!integration || !integration.results) {
    return null
  }

  const results = integration.results

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(results.expires_at)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    return results.access_token
  }

  // Token expired, refresh it
  if (!results.refresh_token) {
    return null
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: results.refresh_token,
        grant_type: 'refresh_token'
      })
    })

    const tokens = await response.json()

    if (tokens.error) {
      console.error('Token refresh error:', tokens)
      return null
    }

    await supabase
      .from('tool_integrations')
      .update({
        results: {
          ...results,
          access_token: tokens.access_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id)

    return tokens.access_token
  } catch (error) {
    console.error('Token refresh error:', error)
    return null
  }
}

// GET /api/search-console/properties
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get session token from cookie for anonymous users
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('teun_gsc_session')?.value

  if (!user && !sessionToken) {
    return NextResponse.json({ error: 'No identity', code: 'NOT_CONNECTED' }, { status: 401 })
  }

  const accessToken = await getValidAccessToken(supabase, user?.id, sessionToken)

  if (!accessToken) {
    return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 401 })
  }

  try {
    const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
    }

    const data = await response.json()
    const properties = (data.siteEntry || []).map(site => ({
      url: site.siteUrl,
      permissionLevel: site.permissionLevel
    }))

    return NextResponse.json({ properties })

  } catch (error) {
    console.error('Search Console properties error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
