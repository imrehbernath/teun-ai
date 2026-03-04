// ═══════════════════════════════════════════════
// app/api/rank-check/route.js — DELETE individual rank checks
// ═══════════════════════════════════════════════
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
      return NextResponse.json({ error: 'Rank check ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('rank_checks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')

    if (error) {
      console.error('Delete rank check error:', error)
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }

    console.log(`[Rank Check DELETE] Deleted rank check ${id} for user ${user.id}`)
    return NextResponse.json({ success: true, deleted: data?.length || 0 })

  } catch (err) {
    console.error('Rank check DELETE error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
