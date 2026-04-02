import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// DELETE /api/search-console/disconnect
export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('teun_gsc_session')?.value

  if (!user && !sessionToken) {
    return NextResponse.json({ error: 'No identity' }, { status: 401 })
  }

  try {
    if (user) {
      await supabase
        .from('tool_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('tool_name', 'google_search_console')
    }

    if (sessionToken) {
      await supabase
        .from('tool_integrations')
        .delete()
        .eq('session_token', sessionToken)
        .eq('tool_name', 'google_search_console')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
