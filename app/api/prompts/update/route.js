import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet ingelogd', success: false }, { status: 401 })
    }

    const { scanId, prompts } = await request.json()

    console.log('Update prompts:', { scanId, promptsCount: prompts?.length })

    if (!scanId || !prompts) {
      return NextResponse.json({ error: 'Missende gegevens', success: false }, { status: 400 })
    }

    // Update prompts in tool_integrations
    const { data, error: updateError } = await supabase
      .from('tool_integrations')
      .update({
        commercial_prompts: prompts,
        updated_at: new Date().toISOString()
      })
      .eq('id', scanId)
      .eq('user_id', user.id)
      .select()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ 
        error: updateError.message, 
        success: false 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Prompts opgeslagen',
      count: prompts.length
    })

  } catch (error) {
    console.error('Update prompts error:', error)
    return NextResponse.json({ 
      error: error.message || 'Fout bij opslaan',
      success: false
    }, { status: 500 })
  }
}
