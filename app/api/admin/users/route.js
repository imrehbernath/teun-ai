// app/api/admin/users/route.js
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'imre@onlinelabs.nl'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)

    // Admin check
    const authUserId = searchParams.get('userId')
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', authUserId)
      .single()

    if (!profile || profile.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const search = searchParams.get('search') || ''

    // Fetch all profiles
    let profileQuery = supabase
      .from('profiles')
      .select('id, email, full_name, company_name, created_at, subscription_status, subscription_plan')

    if (search) {
      profileQuery = profileQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,company_name.ilike.%${search}%`)
    }

    const { data: profiles, error: profileError } = await profileQuery

    if (profileError) {
      console.error('Profiles fetch error:', profileError)
      return NextResponse.json({ error: 'Database fout' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [], total: 0 })
    }

    const userIds = profiles.map(p => p.id)

    // Fetch scan counts per user from tool_integrations
    const { data: geoScans } = await supabase
      .from('tool_integrations')
      .select('user_id')
      .in('user_id', userIds)

    // Fetch scan counts from scan_history (all tools)
    const { data: scanHistory } = await supabase
      .from('scan_history')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    // Fetch rank checks
    const { data: rankChecks } = await supabase
      .from('rank_checks')
      .select('user_id')
      .in('user_id', userIds)

    // Fetch geo audit results
    const { data: geoAudits } = await supabase
      .from('geo_audit_results')
      .select('user_id')
      .in('user_id', userIds)

    // Fetch last auth activity from Supabase auth
    const lastLoginMap = {}
    for (const uid of userIds) {
      const { data: authUser } = await supabase.auth.admin.getUserById(uid)
      if (authUser?.user) {
        lastLoginMap[uid] = authUser.user.last_sign_in_at
      }
    }

    // Count scans per user
    const scanCountMap = {}
    const lastActivityMap = {}

    const countForUser = (data, userId) => {
      if (!data) return 0
      return data.filter(d => d.user_id === userId).length
    }

    // Build last activity from scan_history
    if (scanHistory) {
      for (const sh of scanHistory) {
        if (!lastActivityMap[sh.user_id] || new Date(sh.created_at) > new Date(lastActivityMap[sh.user_id])) {
          lastActivityMap[sh.user_id] = sh.created_at
        }
      }
    }

    // Build users array
    const users = profiles.map(p => {
      const geoCount = countForUser(geoScans, p.id)
      const rankCount = countForUser(rankChecks, p.id)
      const auditCount = countForUser(geoAudits, p.id)
      const historyCount = countForUser(scanHistory, p.id)
      const totalScans = Math.max(geoCount + rankCount + auditCount, historyCount)

      const lastLogin = lastLoginMap[p.id] || null
      const lastActivity = lastActivityMap[p.id] || null
      const lastSeen = [lastLogin, lastActivity].filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] || p.created_at

      return {
        id: p.id,
        email: p.email,
        name: p.full_name,
        company: p.company_name,
        createdAt: p.created_at,
        lastLogin,
        lastActivity,
        lastSeen,
        totalScans,
        geoScans: geoCount,
        rankChecks: rankCount,
        geoAudits: auditCount,
        subscriptionStatus: p.subscription_status,
        subscriptionPlan: p.subscription_plan,
        isPro: ['active', 'canceling'].includes(p.subscription_status)
      }
    })

    // Sort by total scans desc, then last seen desc
    users.sort((a, b) => {
      if (b.totalScans !== a.totalScans) return b.totalScans - a.totalScans
      return new Date(b.lastSeen) - new Date(a.lastSeen)
    })

    return NextResponse.json({
      users,
      total: users.length
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
