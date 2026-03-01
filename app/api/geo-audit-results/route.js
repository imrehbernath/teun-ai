import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ============================================
// GET — Load audit results for current user
// ============================================
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyName = searchParams.get('company')

    const db = await createServiceClient()
    let query = db
      .from('geo_audit_results')
      .select('id, url, domain, score, mentioned, company_name, data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (companyName) {
      query = query.eq('company_name', companyName)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching audit results:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, results: data || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// POST — Save audit result
// ============================================
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await request.json()
    const { url, domain, score, mentioned, companyName, data } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const db = await createServiceClient()

    // Upsert: replace if same URL + user exists
    const { data: existing } = await db
      .from('geo_audit_results')
      .select('id')
      .eq('user_id', user.id)
      .eq('url', url)
      .limit(1)
      .single()

    let result
    if (existing) {
      // Update existing
      const { data: updated, error } = await db
        .from('geo_audit_results')
        .update({
          score: score || 0,
          mentioned: mentioned || false,
          company_name: companyName || domain,
          data: data || {},
          created_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = updated
    } else {
      // Insert new
      const { data: inserted, error } = await db
        .from('geo_audit_results')
        .insert({
          user_id: user.id,
          url,
          domain: domain || '',
          score: score || 0,
          mentioned: mentioned || false,
          company_name: companyName || domain || '',
          data: data || {},
        })
        .select()
        .single()
      if (error) throw error
      result = inserted
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error('Error saving audit result:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// DELETE — Remove audit result
// ============================================
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const db = await createServiceClient()
    const { error } = await db
      .from('geo_audit_results')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
