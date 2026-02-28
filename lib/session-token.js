// lib/session-token.js
// Generates and manages anonymous session tokens for data persistence
// Used by Prompt Explorer and AI Visibility scan to save data before signup

import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

const COOKIE_NAME = 'teun_session_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 dagen

/**
 * Get existing session token from cookies, or generate a new one
 * Use in API routes (server-side)
 */
export async function getOrCreateSessionToken() {
  const cookieStore = await cookies()
  const existing = cookieStore.get(COOKIE_NAME)
  
  if (existing?.value) {
    return { sessionToken: existing.value, isNew: false }
  }
  
  const sessionToken = uuidv4()
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  
  return { sessionToken, isNew: true }
}

/**
 * Get session token (read-only, returns null if not set)
 */
export async function getSessionToken() {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

/**
 * Claim anonymous sessions after signup/login
 * Call this from the auth callback or after login
 */
export async function claimSessionData(supabase, userId) {
  const token = await getSessionToken()
  
  if (!token || !userId) return 0
  
  const { data, error } = await supabase
    .rpc('claim_anonymous_sessions', {
      p_session_token: token,
      p_user_id: userId,
    })
  
  if (error) {
    console.error('❌ Error claiming anonymous sessions:', error.message)
    return 0
  }
  
  console.log(`✅ Claimed ${data} anonymous sessions for user ${userId}`)
  return data
}
