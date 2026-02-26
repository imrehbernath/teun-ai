// app/api/admin/scans/route.js
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'imre@onlinelabs.nl'

export async function GET(request) {
  try {
    const supabase = await createServiceClient()

    // Auth check via header or cookie
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || 'all'
    const offset = (page - 1) * limit

    // Verify admin via userId param (passed from frontend after auth check)
    const authUserId = searchParams.get('userId')
    if (authUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', authUserId)
        .single()
      if (!profile || profile.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    let allScans = []
    let totalAccounts = 0
    let totalAnonymous = 0

    // ── 1. GEO Analyse scans (tool_integrations) ──
    if (source === 'all' || source === 'accounts') {
      let query = supabase
        .from('tool_integrations')
        .select('id, user_id, company_name, website, company_category, total_company_mentions, prompts_count, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(500)

      if (search) {
        query = query.or(`website.ilike.%${search}%,company_name.ilike.%${search}%`)
      }

      const { data, count } = await query
      if (data) {
        // Fetch user emails separately (avoids RLS issues with inner join)
        const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))]
        let emailMap = {}
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds)
          if (profiles) {
            profiles.forEach(p => { emailMap[p.id] = p })
          }
        }

        data.forEach(scan => {
          const profile = emailMap[scan.user_id] || {}
          allScans.push({
            id: scan.id,
            type: 'account',
            tool: 'GEO Analyse',
            website: scan.website,
            company_name: scan.company_name,
            category: scan.company_category,
            mentions: scan.total_company_mentions,
            prompts: scan.prompts_count,
            email: profile.email || null,
            user_name: profile.full_name || null,
            created_at: scan.created_at
          })
        })
        totalAccounts += count || 0
      }
    }

    // ── 2. Rank Tracker scans (rank_checks) ──
    if (source === 'all' || source === 'accounts' || source === 'rank_tracker') {
      let query = supabase
        .from('rank_checks')
        .select('id, user_id, domain, brand_name, keyword, service_area, chatgpt_position, perplexity_position, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(500)

      if (search) {
        query = query.or(`domain.ilike.%${search}%,brand_name.ilike.%${search}%`)
      }

      const { data, count } = await query
      if (data) {
        const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))]
        let emailMap = {}
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds)
          if (profiles) {
            profiles.forEach(p => { emailMap[p.id] = p })
          }
        }

        data.forEach(scan => {
          const profile = emailMap[scan.user_id] || {}
          allScans.push({
            id: scan.id,
            type: scan.user_id ? 'account' : 'anonymous',
            tool: 'Rank Tracker',
            website: scan.domain,
            company_name: scan.brand_name,
            category: scan.keyword,
            mentions: null,
            prompts: null,
            positions: { chatgpt: scan.chatgpt_position, perplexity: scan.perplexity_position },
            email: profile.email || null,
            user_name: profile.full_name || null,
            service_area: scan.service_area,
            created_at: scan.created_at
          })
        })
        if (count) totalAccounts += count
      }
    }

    // ── 3. Google AI Mode scans ──
    if (source === 'all' || source === 'accounts' || source === 'google_ai') {
      let query = supabase
        .from('google_ai_scans')
        .select('id, user_id, company_name, website, scan_type, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(200)

      if (search) {
        query = query.or(`website.ilike.%${search}%,company_name.ilike.%${search}%`)
      }

      const { data, count } = await query
      if (data) {
        data.forEach(scan => {
          allScans.push({
            id: scan.id,
            type: scan.user_id ? 'account' : 'anonymous',
            tool: 'Google AI Mode',
            website: scan.website,
            company_name: scan.company_name,
            category: scan.scan_type,
            mentions: null,
            prompts: null,
            email: null,
            user_name: null,
            created_at: scan.created_at
          })
        })
      }
    }

    // ── 4. Google AI Overview scans ──
    if (source === 'all' || source === 'accounts' || source === 'google_overview') {
      let query = supabase
        .from('google_ai_overview_scans')
        .select('id, user_id, company_name, website, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(200)

      if (search) {
        query = query.or(`website.ilike.%${search}%,company_name.ilike.%${search}%`)
      }

      const { data, count } = await query
      if (data) {
        data.forEach(scan => {
          allScans.push({
            id: scan.id,
            type: scan.user_id ? 'account' : 'anonymous',
            tool: 'Google AI Overviews',
            website: scan.website,
            company_name: scan.company_name,
            category: null,
            mentions: null,
            prompts: null,
            email: null,
            user_name: null,
            created_at: scan.created_at
          })
        })
      }
    }

    // ── 5. Anonymous scans (rate limiting + now with website) ──
    if (source === 'all' || source === 'anonymous') {
      let query = supabase
        .from('anonymous_scans')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(500)

      if (search) {
        query = query.or(`website.ilike.%${search}%,company_name.ilike.%${search}%,ip_address.ilike.%${search}%`)
      }

      const { data, count } = await query
      if (data) {
        data.forEach(scan => {
          // Only add if it has website info (avoid duplicating empty rate-limit rows)
          if (scan.website || scan.company_name) {
            const toolNameMap = {
              'ai-visibility': 'GEO Analyse',
              'rank-tracker': 'Rank Tracker',
              'geo-audit': 'GEO Audit',
            }
            allScans.push({
              id: scan.id,
              type: 'anonymous',
              tool: toolNameMap[scan.tool_name] || scan.tool_name,
              website: scan.website,
              company_name: scan.company_name,
              category: null,
              mentions: null,
              prompts: null,
              email: null,
              user_name: null,
              ip_address: scan.ip_address,
              scans_made: scan.scans_made,
              created_at: scan.last_scan_at || scan.created_at
            })
          }
        })
        totalAnonymous = count || 0
      }
    }

    // Sort all by date descending
    allScans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // Deduplicate by website + created_at (within 1 minute)
    const seen = new Set()
    allScans = allScans.filter(scan => {
      const key = `${scan.website || scan.ip_address}-${scan.tool}-${new Date(scan.created_at).toISOString().slice(0, 16)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const total = allScans.length
    const paginatedScans = allScans.slice(offset, offset + limit)

    return NextResponse.json({
      scans: paginatedScans,
      total,
      totalAccounts,
      totalAnonymous,
      page,
      limit
    })

  } catch (error) {
    console.error('Admin scans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
