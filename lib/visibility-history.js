// lib/visibility-history.js
// Dag-bucket upsert voor visibility_history: maximaal 1 rij per platform per
// dag per (user_id, integration_id). Zo blijft de wekelijkse trend in de
// dashboard-grafiek schoon ook als iemand op één dag meerdere keren scant.
//
// Wordt aangeroepen door /api/scan-selected-prompts, /api/scan-google-ai en
// /api/scan-google-ai-overview, zowel via de wekelijkse cron als via de
// handmatige rescan vanuit het dashboard.

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfTomorrowIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 1)
  return d.toISOString()
}

// Upsert een enkele rij. Bestaat er voor vandaag al een rij voor dezelfde
// user/integration/platform, dan worden de velden bijgewerkt. Anders nieuwe rij.
export async function upsertVisibilityHistoryRow(supabase, row) {
  if (!row?.user_id || !row?.integration_id || !row?.platform) {
    return { error: new Error('user_id, integration_id en platform zijn verplicht') }
  }

  const { data: existing, error: lookupError } = await supabase
    .from('visibility_history')
    .select('id')
    .eq('user_id', row.user_id)
    .eq('integration_id', row.integration_id)
    .eq('platform', row.platform)
    .gte('scanned_at', startOfTodayIso())
    .lt('scanned_at', startOfTomorrowIso())
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lookupError) return { error: lookupError }

  if (existing?.id) {
    return supabase
      .from('visibility_history')
      .update({ ...row, scanned_at: new Date().toISOString() })
      .eq('id', existing.id)
  }

  return supabase.from('visibility_history').insert(row)
}

// Sequential upsert voor meerdere rijen (typisch 3 voor scan-selected-prompts:
// chatgpt + perplexity + total). Faalt zacht en logt per rij.
export async function upsertVisibilityHistoryRows(supabase, rows) {
  const results = []
  for (const row of rows || []) {
    const res = await upsertVisibilityHistoryRow(supabase, row)
    if (res?.error) {
      console.error('[VisibilityHistory] upsert error:', res.error?.message || res.error)
    }
    results.push(res)
  }
  return results
}
