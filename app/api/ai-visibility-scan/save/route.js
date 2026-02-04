import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'Niet ingelogd', success: false }, { status: 401 })
    }

    const body = await request.json()
    const { companyName, website, category, prompts, results, scanId } = body

    console.log('Save request:', { 
      userId: user.id,
      companyName, 
      promptsCount: prompts?.length, 
      resultsCount: results?.length, 
      scanId 
    })

    if (!companyName || !prompts || !results) {
      return NextResponse.json({ error: 'Missende gegevens', success: false }, { status: 400 })
    }

    // Calculate totals
    const totalMentions = results.filter(r => r.mentioned).length
    const totalQueries = results.length

    // Prepare scan results in the expected format
    const scanResults = results.map((r) => ({
      query: r.prompt,
      company_mentioned: r.mentioned,
      mention_count: r.mentionCount || 0,
      competitors_mentioned: r.competitors || [],
      response_snippet: r.snippet || ''
    }))

    if (scanId) {
      // Update existing scan
      console.log('Updating existing scan:', scanId)
      
      const { data, error: updateError } = await supabase
        .from('tool_integrations')
        .update({
          commercial_prompts: prompts,
          prompts_count: prompts.length,
          results: scanResults,
          total_company_mentions: totalMentions,
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

      console.log('Updated scan successfully:', scanId)
      return NextResponse.json({ 
        success: true, 
        message: 'Scan resultaten bijgewerkt',
        scanId,
        stats: { totalMentions, totalQueries }
      })
    } else {
      // Create new scan record
      // keyword is required - use company name or first prompt as keyword
      const keyword = companyName || prompts[0] || 'unknown'
      
      console.log('Creating new scan for:', companyName, 'with keyword:', keyword)
      
      const { data: newScan, error: insertError } = await supabase
        .from('tool_integrations')
        .insert({
          user_id: user.id,
          keyword: keyword, // REQUIRED field
          company_name: companyName,
          website: website || null,
          company_category: category || null,
          commercial_prompts: prompts,
          prompts_count: prompts.length,
          results: scanResults,
          total_company_mentions: totalMentions,
          status: 'visibility_completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({ 
          error: insertError.message, 
          success: false 
        }, { status: 500 })
      }

      console.log('Created new scan:', newScan?.id)
      return NextResponse.json({ 
        success: true, 
        message: 'Nieuwe scan opgeslagen',
        scanId: newScan?.id,
        stats: { totalMentions, totalQueries }
      })
    }

  } catch (error) {
    console.error('Save scan error:', error)
    return NextResponse.json({ 
      error: error.message || 'Fout bij opslaan',
      success: false
    }, { status: 500 })
  }
}
