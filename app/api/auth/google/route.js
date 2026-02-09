import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/auth/google - Start OAuth flow
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://teun.ai/api/auth/google/callback'
  
  // Store user ID in state for callback
  const state = Buffer.from(JSON.stringify({ 
    userId: user.id,
    returnUrl: request.nextUrl.searchParams.get('returnUrl') || '/dashboard/geo-analyse'
  })).toString('base64')

  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly'
  ].join(' ')

  // Check if we should show account picker (when switching accounts)
  const promptParam = request.nextUrl.searchParams.get('prompt')
  // Use 'select_account consent' to show account picker AND get refresh token
  const promptValue = promptParam === 'select_account' ? 'select_account consent' : 'consent'

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', promptValue)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
