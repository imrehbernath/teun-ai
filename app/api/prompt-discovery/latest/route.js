// app/api/prompt-discovery/latest/route.js
// GET endpoint: haal de meest recente prompt_discovery_results voor deze sessie/user op.
// Wordt gebruikt door de Visibility-pagina als fallback wanneer sessionStorage leeg is
// (refresh, deep-link, terugkomst na signup voor scan).

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateSessionToken } from '@/lib/session-token'

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(request) {
  try {
    const supabase = await createServiceClient()
    const { sessionToken } = await getOrCreateSessionToken()

    let userId = null
    try {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user?.id) userId = user.id
      }
    } catch (_) {}

    let query = supabase
      .from('prompt_discovery_results')
      .select('id, prompts, brand_name, website, branche, location, source, meta, created_at')
      .order('created_at', { ascending: false })
      .limit(1)

    if (userId) {
      query = query.or(`user_id.eq.${userId},session_token.eq.${sessionToken}`)
    } else {
      query = query.eq('session_token', sessionToken).is('user_id', null)
    }

    const { data: rows, error } = await query
    if (error) {
      console.error('[prompt-discovery/latest] query error:', error.message)
      return NextResponse.json({ error: 'database' }, { status: 500, headers: CORS })
    }

    const row = rows?.[0]
    if (!row) {
      return NextResponse.json({ found: false }, { status: 200, headers: CORS })
    }

    const promptTexts = Array.isArray(row.prompts)
      ? row.prompts.map(p => (typeof p === 'string' ? p : p?.text)).filter(Boolean)
      : []

    return NextResponse.json({
      found: true,
      discoveryId: row.id,
      prompts: promptTexts,
      companyName: row.brand_name || null,
      website: row.website || null,
      branche: row.branche || null,
      location: row.location || null,
      source: row.source || null,
      createdAt: row.created_at,
    }, { headers: CORS })
  } catch (err) {
    console.error('[prompt-discovery/latest] error:', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500, headers: CORS })
  }
}
