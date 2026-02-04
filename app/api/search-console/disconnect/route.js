import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/search-console/disconnect - Remove Google SC connection
export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete the Google SC integration
    const { error } = await supabase
      .from('tool_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('tool_name', 'google_search_console')

    if (error) {
      console.error('Error disconnecting:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
