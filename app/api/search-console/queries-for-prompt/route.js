import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const maxDuration = 60

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const PARALLEL_LIMIT = 5
const GSC_ROW_LIMIT_PER_KEYWORD = 25

// Same shape as in /api/search-console/queries. Kept inline to avoid extracting
// a shared module mid-feature; happy to factor out later if a third route appears.
async function getValidAccessToken(supabase, userId, sessionToken) {
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

  if (!integration || !integration.results) return null

  const results = integration.results
  const expiresAt = new Date(results.expires_at)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    return results.access_token
  }

  if (!results.refresh_token) return null

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
    if (tokens.error) return null

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
    return null
  }
}

// Try the page URL as-is, then toggle the trailing slash. GSC's equals filter
// is byte-exact, and Search Console rows often store the canonical variant
// the user might not be using on the Teun side.
function pageVariants(page) {
  const variants = [page]
  if (page.endsWith('/')) variants.push(page.replace(/\/+$/, ''))
  else variants.push(page + '/')
  return [...new Set(variants)]
}

async function fetchMatchesForKeyword({ accessToken, siteUrl, page, keyword, startDate, endDate }) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

  for (const pageVariant of pageVariants(page)) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: GSC_ROW_LIMIT_PER_KEYWORD,
        dimensionFilterGroups: [{
          filters: [
            { dimension: 'page', operator: 'equals', expression: pageVariant },
            { dimension: 'query', operator: 'contains', expression: keyword }
          ]
        }]
      })
    })

    if (!response.ok) continue
    const data = await response.json()
    const rows = data.rows || []
    if (rows.length === 0) continue

    return rows.map(r => ({
      query: r.keys[0],
      position: r.position,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr
    }))
  }

  return []
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('teun_gsc_session')?.value

  if (!user && !sessionToken) {
    return NextResponse.json({ error: 'No identity', code: 'NOT_CONNECTED' }, { status: 401 })
  }

  const accessToken = await getValidAccessToken(supabase, user?.id, sessionToken)
  if (!accessToken) {
    return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 401 })
  }

  let body
  try { body = await request.json() } catch { body = {} }
  const { siteUrl, page, keywords, daysBack = 30 } = body

  if (!siteUrl || !page || !Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json({ error: 'siteUrl, page, keywords required' }, { status: 400 })
  }

  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0]

  // Cache lookup only for authenticated users. Session-only users skip cache
  // because the unique constraint on (user_id, site_url, page, keyword) treats
  // NULL user_ids as non-equal and would accumulate stale rows.
  const db = await createServiceClient()
  const userId = user?.id || null
  const cacheable = userId !== null

  const cacheMap = {}
  if (cacheable) {
    const { data: cached } = await db
      .from('gsc_query_cache')
      .select('keyword, queries, fetched_at')
      .eq('user_id', userId)
      .eq('site_url', siteUrl)
      .eq('page', page)
      .in('keyword', keywords)

    const now = Date.now()
    for (const row of (cached || [])) {
      const age = now - new Date(row.fetched_at).getTime()
      if (age < CACHE_TTL_MS) cacheMap[row.keyword] = row.queries
    }
  }

  const toFetch = keywords.filter(k => !(k in cacheMap))
  const fetched = {}

  for (let i = 0; i < toFetch.length; i += PARALLEL_LIMIT) {
    const batch = toFetch.slice(i, i + PARALLEL_LIMIT)
    const results = await Promise.all(
      batch.map(async kw => {
        try {
          const queries = await fetchMatchesForKeyword({
            accessToken, siteUrl, page, keyword: kw, startDate, endDate
          })
          return [kw, queries]
        } catch (e) {
          console.error('[GSC queries-for-prompt] fetch error for', kw, e.message)
          return [kw, []]
        }
      })
    )
    for (const [kw, queries] of results) {
      fetched[kw] = queries
      if (cacheable) {
        await db.from('gsc_query_cache').upsert({
          user_id: userId,
          site_url: siteUrl,
          page,
          keyword: kw,
          queries,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,site_url,page,keyword' })
      }
    }
  }

  const result = {}
  for (const kw of keywords) {
    result[kw] = cacheMap[kw] || fetched[kw] || []
  }

  return NextResponse.json({
    success: true,
    page,
    daysBack,
    keywords: result,
  })
}
