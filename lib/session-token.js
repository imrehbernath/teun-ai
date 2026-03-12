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
 * Updates all rows with matching session_token to have the user's ID
 * 
 * @param {object} supabase - Service client (bypasses RLS)
 * @param {string} userId - The authenticated user's ID
 * @param {string|null} fallbackToken - Optional token from URL/user_metadata (cross-browser fallback)
 */
export async function claimSessionData(supabase, userId, fallbackToken = null) {
  const cookieToken = await getSessionToken()
  const token = cookieToken || fallbackToken
  
  if (!token || !userId) return { tool_integrations: 0, prompt_discovery_results: 0 }
  
  const claimed = { tool_integrations: 0, prompt_discovery_results: 0 }

  // Claim tool_integrations
  try {
    const { data, error } = await supabase
      .from('tool_integrations')
      .update({ user_id: userId })
      .eq('session_token', token)
      .is('user_id', null)
      .select('id')
    if (error) console.error('❌ Claim tool_integrations error:', error.message)
    else claimed.tool_integrations = data?.length || 0
  } catch (e) {
    console.error('❌ Claim tool_integrations exception:', e.message)
  }

  // Claim prompt_discovery_results
  try {
    const { data, error } = await supabase
      .from('prompt_discovery_results')
      .update({ user_id: userId })
      .eq('session_token', token)
      .is('user_id', null)
      .select('id')
    if (error) console.error('❌ Claim prompt_discovery_results error:', error.message)
    else claimed.prompt_discovery_results = data?.length || 0
  } catch (e) {
    console.error('❌ Claim prompt_discovery_results exception:', e.message)
  }

  const total = claimed.tool_integrations + claimed.prompt_discovery_results
  console.log(`✅ Claimed ${total} sessions for user ${userId} (token: ${token.slice(0, 8)}...)`)
  
  return claimed
}
