// app/api/v1/prompts/[promptId]/page/[pageId]/route.js
// Remove Prompt from Page Endpoint

import { NextResponse } from 'next/server'
import { validateApiKey, supabase } from '@/lib/wp-plugin/auth'

export async function DELETE(request, { params }) {
  try {
    // ─── Auth ───
    const apiKey = request.headers.get('x-api-key')
    const auth = await validateApiKey(apiKey)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { promptId, pageId } = await params

    // Verify the prompt exists and belongs to one of the user's websites
    const { data: prompt, error } = await supabase
      .from('page_prompts')
      .select('id, website_id')
      .eq('id', promptId)
      .single()

    if (error || !prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Verify website ownership
    const connection = auth.data.connections.find(c => c.website_id === prompt.website_id)
    if (!connection) {
      return NextResponse.json(
        { error: 'Not authorized to modify this prompt' },
        { status: 403 }
      )
    }

    // Delete scan results first (cascade should handle this, but being explicit)
    await supabase
      .from('page_scan_results')
      .delete()
      .eq('page_prompt_id', promptId)

    // Delete the prompt
    const { error: deleteError } = await supabase
      .from('page_prompts')
      .delete()
      .eq('id', promptId)

    if (deleteError) {
      console.error('Error deleting prompt:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete prompt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ deleted: true })

  } catch (error) {
    console.error('Delete prompt error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
