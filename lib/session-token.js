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
 * Claim anonymous sessions after signup/login.
 *
 * Twee modes:
 *   1. Selective (aanbevolen): scanIds en/of discoveryIds meegegeven -> alleen die
 *      specifieke rows worden geclaimd, plus moet de session_token nog matchen
 *      met de cookie OF fallbackToken. Voorkomt dat scans van een andere browser-
 *      gebruiker per ongeluk onder dit account terechtkomen.
 *   2. Legacy fallback: geen scanIds gegeven -> claim alle rows met matching
 *      session_token waar user_id nog null is. Behoud voor backwards compat met
 *      flows die nog geen sessionStorage scan-tracking hebben.
 *
 * @param {object} supabase - Service client (bypasses RLS)
 * @param {string} userId - The authenticated user's ID
 * @param {string|null} fallbackToken - Optional token from URL/user_metadata (cross-browser fallback)
 * @param {object} [opts]
 * @param {string[]} [opts.scanIds] - Specifieke tool_integrations.id's om te claimen
 * @param {string[]} [opts.discoveryIds] - Specifieke prompt_discovery_results.id's om te claimen
 */
export async function claimSessionData(supabase, userId, fallbackToken = null, opts = {}) {
  const cookieToken = await getSessionToken()
  const token = cookieToken || fallbackToken

  if (!token || !userId) return { tool_integrations: 0, prompt_discovery_results: 0 }

  const scanIds = Array.isArray(opts.scanIds) ? opts.scanIds.filter(Boolean) : []
  const discoveryIds = Array.isArray(opts.discoveryIds) ? opts.discoveryIds.filter(Boolean) : []
  const selectiveMode = scanIds.length > 0 || discoveryIds.length > 0

  const claimed = { tool_integrations: 0, prompt_discovery_results: 0 }

  // Claim tool_integrations
  try {
    let query = supabase
      .from('tool_integrations')
      .update({ user_id: userId })
      .eq('session_token', token)
      .is('user_id', null)

    if (selectiveMode) {
      if (scanIds.length === 0) {
        // Selective mode actief, maar geen scanIds gegeven -> skip tool_integrations
        query = null
      } else {
        query = query.in('id', scanIds)
      }
    }

    if (query) {
      const { data, error } = await query.select('id')
      if (error) console.error('❌ Claim tool_integrations error:', error.message)
      else claimed.tool_integrations = data?.length || 0
    }
  } catch (e) {
    console.error('❌ Claim tool_integrations exception:', e.message)
  }

  // Claim prompt_discovery_results
  try {
    let query = supabase
      .from('prompt_discovery_results')
      .update({ user_id: userId })
      .eq('session_token', token)
      .is('user_id', null)

    if (selectiveMode) {
      if (discoveryIds.length === 0) {
        query = null
      } else {
        query = query.in('id', discoveryIds)
      }
    }

    if (query) {
      const { data, error } = await query.select('id')
      if (error) console.error('❌ Claim prompt_discovery_results error:', error.message)
      else claimed.prompt_discovery_results = data?.length || 0
    }
  } catch (e) {
    console.error('❌ Claim prompt_discovery_results exception:', e.message)
  }

  const total = claimed.tool_integrations + claimed.prompt_discovery_results
  console.log(`✅ Claimed ${total} sessions for user ${userId} (token: ${token.slice(0, 8)}..., mode: ${selectiveMode ? 'selective' : 'legacy'})`)

  return claimed
}
