import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { companyName, website, prompts, aiModeResults, aiOverviewResults } = await request.json()

    if (!companyName || !prompts) {
      return NextResponse.json({ error: 'companyName and prompts required' }, { status: 400 })
    }

    const errors = []

    // Save AI Mode results
    if (aiModeResults && aiModeResults.length > 0) {
      const foundCount = aiModeResults.filter(r => r.companyMentioned).length
      const hasAiResponseCount = aiModeResults.filter(r => r.hasAiResponse).length

      const { error: modeError } = await supabase
        .from('google_ai_scans')
        .insert({
          user_id: user.id,
          company_name: companyName,
          website: website || null,
          prompts: prompts,
          results: aiModeResults,
          found_count: foundCount,
          has_ai_overview_count: hasAiResponseCount,
          total_queries: prompts.length,
          status: 'completed',
          scan_type: 'google_ai_mode'
        })

      if (modeError) {
        console.error('Error saving AI Mode results:', modeError)
        errors.push('AI Mode save failed')
      }
    }

    // Save AI Overview results
    if (aiOverviewResults && aiOverviewResults.length > 0) {
      const foundCount = aiOverviewResults.filter(r => r.companyMentioned).length
      const hasAiOverviewCount = aiOverviewResults.filter(r => r.hasAiOverview || r.hasAiResponse).length

      const { error: overviewError } = await supabase
        .from('google_ai_overview_scans')
        .insert({
          user_id: user.id,
          company_name: companyName,
          website: website || null,
          prompts: prompts,
          results: aiOverviewResults,
          found_count: foundCount,
          has_ai_overview_count: hasAiOverviewCount,
          total_queries: prompts.length,
          status: 'completed'
        })

      if (overviewError) {
        console.error('Error saving AI Overview results:', overviewError)
        errors.push('AI Overview save failed')
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Google AI save error:', error)
    return NextResponse.json(
      { error: error.message || 'Save failed' },
      { status: 500 }
    )
  }
}
