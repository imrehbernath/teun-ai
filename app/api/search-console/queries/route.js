import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Helper to refresh token if expired
async function getValidAccessToken(supabase, userId) {
  const { data: integration, error } = await supabase
    .from('tool_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('tool_name', 'google_search_console')
    .single()

  if (error || !integration || !integration.results) {
    return null
  }

  const results = integration.results
  const expiresAt = new Date(results.expires_at)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    return results.access_token
  }

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

// POST /api/search-console/queries - Get queries for a property
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = await getValidAccessToken(supabase, user.id)

  if (!accessToken) {
    return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 401 })
  }

  const body = await request.json()
  const { siteUrl, startDate, endDate, rowLimit = 500 } = body

  if (!siteUrl) {
    return NextResponse.json({ error: 'siteUrl required' }, { status: 400 })
  }

  // Default to last 90 days if no dates provided
  const end = endDate || new Date().toISOString().split('T')[0]
  const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // Fetch queries with page dimension for mapping
    const queryPageResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          dimensions: ['query', 'page'],
          rowLimit: rowLimit,
          dimensionFilterGroups: []
        })
      }
    )

    if (!queryPageResponse.ok) {
      const error = await queryPageResponse.json()
      console.error('Search Console queries error:', error)
      return NextResponse.json({ error: 'Failed to fetch queries' }, { status: 500 })
    }

    const queryPageData = await queryPageResponse.json()

    // Fetch pages separately for overview
    const pagesResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          dimensions: ['page'],
          rowLimit: 100
        })
      }
    )

    let pagesData = { rows: [] }
    if (pagesResponse.ok) {
      pagesData = await pagesResponse.json()
    }

    // Format queries WITH page info
    const queries = (queryPageData.rows || []).map(row => ({
      query: row.keys[0],
      page: row.keys[1],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position
    }))

    const pages = (pagesData.rows || []).map(row => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position
    }))

    // Filter for question-like queries
    const questionQueries = queries.filter(q => {
      const query = q.query.toLowerCase()
      return query.includes('?') ||
             query.startsWith('wat ') ||
             query.startsWith('wie ') ||
             query.startsWith('waar ') ||
             query.startsWith('wanneer ') ||
             query.startsWith('waarom ') ||
             query.startsWith('hoe ') ||
             query.startsWith('welke ') ||
             query.startsWith('hoeveel ') ||
             query.startsWith('what ') ||
             query.startsWith('who ') ||
             query.startsWith('where ') ||
             query.startsWith('when ') ||
             query.startsWith('why ') ||
             query.startsWith('how ') ||
             query.startsWith('which ')
    })

    return NextResponse.json({
      queries,
      questionQueries,
      pages,
      dateRange: { start, end },
      totalQueries: queries.length,
      totalPages: pages.length
    })

  } catch (error) {
    console.error('Search Console queries error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
