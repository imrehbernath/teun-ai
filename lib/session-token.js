// lib/session-token.js
// ═══════════════════════════════════════════════════════════════
// SESSION TOKEN — Anonieme data bewaren + koppelen bij signup
// 
// Elke scan (ook anoniem) krijgt een session_token via httpOnly cookie.
// Bij signup/login: claim alle records met dat token → user_id.
// Nul dataverlies, nul opnieuw scannen.
// ═══════════════════════════════════════════════════════════════

import { cookies } from 'next/headers'

const COOKIE_NAME = 'teun_session_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 dagen

/**
 * Genereer een UUID v4 zonder externe dependency.
 * crypto.randomUUID() is beschikbaar in Node 19+ en alle Vercel runtimes.
 */
function generateUUID() {
  return crypto.randomUUID()
}

/**
 * Haal session_token op uit cookie, of genereer een nieuwe.
 * 
 * Gebruik in elke API route die scan data opslaat:
 *   const { sessionToken } = await getOrCreateSessionToken()
 * 
 * @returns {{ sessionToken: string, isNew: boolean }}
 */
export async function getOrCreateSessionToken() {
  const cookieStore = await cookies()
  const existing = cookieStore.get(COOKIE_NAME)?.value

  if (existing) {
    return { sessionToken: existing, isNew: false }
  }

  const sessionToken = generateUUID()

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
 * Lees session_token uit cookie (zonder nieuwe aan te maken).
 * Gebruik in dashboard/claim routes.
 * 
 * @returns {string|null}
 */
export async function getSessionToken() {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value || null
}

/**
 * Claim alle anonieme scan data voor een user.
 * Wordt aangeroepen na signup/login via /api/auth/claim-session.
 * 
 * Gebruikt service role client (bypasses RLS) om records te updaten
 * waar user_id NULL is en session_token matcht.
 * 
 * @param {object} supabaseAdmin - Supabase service role client
 * @param {string} userId - De nieuwe user's auth.uid()
 * @param {string} sessionToken - Session token uit cookie
 * @returns {{ tool_integrations: number, prompt_discovery_results: number }}
 */
export async function claimSessionData(supabaseAdmin, userId, sessionToken) {
  if (!sessionToken || !userId) return { tool_integrations: 0, prompt_discovery_results: 0 }

  const now = new Date().toISOString()

  const [tiResult, pdResult] = await Promise.allSettled([
    // Claim tool_integrations (AI Visibility scans)
    supabaseAdmin
      .from('tool_integrations')
      .update({ user_id: userId, claimed_at: now })
      .eq('session_token', sessionToken)
      .is('user_id', null)
      .select('id'),

    // Claim prompt_discovery_results (Prompt Explorer scans)
    supabaseAdmin
      .from('prompt_discovery_results')
      .update({ user_id: userId, claimed_at: now })
      .eq('session_token', sessionToken)
      .is('user_id', null)
      .select('id'),
  ])

  const tiClaimed = tiResult.status === 'fulfilled' ? (tiResult.value.data?.length || 0) : 0
  const pdClaimed = pdResult.status === 'fulfilled' ? (pdResult.value.data?.length || 0) : 0

  if (tiResult.status === 'rejected') {
    console.error('❌ Claim tool_integrations failed:', tiResult.reason)
  }
  if (pdResult.status === 'rejected') {
    console.error('❌ Claim prompt_discovery_results failed:', pdResult.reason)
  }

  console.log(`✅ Session claim complete: ${tiClaimed} visibility scans + ${pdClaimed} prompt explorer results`)

  return {
    tool_integrations: tiClaimed,
    prompt_discovery_results: pdClaimed,
  }
}
