import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { upsertVisibilityHistoryRow } from '@/lib/visibility-history'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { companyName, website, prompts, aiModeResults, aiOverviewResults, integrationId: bodyIntegrationId } = await request.json()

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

    // Schrijf visibility_history rijen zodat de dashboard-grafiek
    // "Zichtbaarheid over tijd" óók na de eerste Google AI scan
    // direct een google_ai_mode en google_ai_overviews datapunt heeft.
    // Day-bucket upsert: idempotent bij meerdere scans op dezelfde dag.
    let integrationId = bodyIntegrationId || null
    if (!integrationId) {
      const { data: integration } = await supabase
        .from('tool_integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_name', companyName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      integrationId = integration?.id || null
    }

    if (integrationId) {
      const buildRow = (platform, scanResults) => {
        const foundCount = scanResults.filter(r => r.companyMentioned).length
        const totalMentionsSum = scanResults.reduce((sum, r) => sum + (r.mentionCount || 0), 0)
        const competitorCounts = {}
        for (const r of scanResults) {
          const list = r.competitorsMentioned || r.competitors || []
          for (const name of list) {
            if (!name || typeof name !== 'string') continue
            const c = name.trim()
            if (c.length < 2 || c.length > 80) continue
            competitorCounts[c] = (competitorCounts[c] || 0) + 1
          }
        }
        const top = Object.entries(competitorCounts).sort((a, b) => b[1] - a[1])[0]
        return {
          user_id: user.id,
          integration_id: integrationId,
          platform,
          prompts_total: prompts.length,
          prompts_found: foundCount,
          visibility_pct: prompts.length > 0 ? Math.round((foundCount / prompts.length) * 10000) / 100 : 0,
          total_mentions: totalMentionsSum,
          top_competitor: top ? top[0] : null,
          top_competitor_count: top ? top[1] : null,
        }
      }

      if (aiModeResults && aiModeResults.length > 0) {
        try {
          await upsertVisibilityHistoryRow(supabase, buildRow('google_ai_mode', aiModeResults))
          console.log(`[GoogleAiSave] visibility_history: google_ai_mode row upserted for integration ${integrationId}`)
        } catch (e) {
          console.error('[GoogleAiSave] AI Mode visibility_history failed:', e?.message)
        }
      }

      if (aiOverviewResults && aiOverviewResults.length > 0) {
        try {
          await upsertVisibilityHistoryRow(supabase, buildRow('google_ai_overviews', aiOverviewResults))
          console.log(`[GoogleAiSave] visibility_history: google_ai_overviews row upserted for integration ${integrationId}`)
        } catch (e) {
          console.error('[GoogleAiSave] AI Overview visibility_history failed:', e?.message)
        }
      }
    } else {
      console.warn(`[GoogleAiSave] geen integrationId gevonden voor user ${user.id} / company "${companyName}", visibility_history overgeslagen`)
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
