// app/api/ai-visibility/scan-quota/route.js
// Tier-aware weekteller voor handmatige AI Visibility scans op de dashboard
// Visibility-tab. GET leest het quota, POST registreert een scan en geeft
// het bijgewerkte quota terug. Logica zit in lib/beta-config.js
// (canUserScan + trackScan); deze endpoint is alleen een dunne wrapper zodat
// de UI de teller kan tonen en de rescan-flow tegen het weeklimiet kan
// aanlopen.

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { canUserScan, trackScan } from '@/lib/beta-config'

export const dynamic = 'force-dynamic'

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function shape(result) {
  return {
    allowed: !!result.allowed,
    scansRemaining: result.scansRemaining ?? 0,
    tierLimit: result.tierLimit ?? null,
    tier: result.tier ?? null,
    isPro: !!result.isPro,
    isLite: !!result.isLite,
    isAdmin: !!result.isAdmin,
    nextResetTime: result.nextResetTime ?? null,
    message: result.message || null,
  }
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const service = await createServiceClient()
  const result = await canUserScan(service, user.id, 'ai-visibility', getIp(request))
  return NextResponse.json(shape(result))
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const ip = getIp(request)
  const service = await createServiceClient()

  const check = await canUserScan(service, user.id, 'ai-visibility', ip)
  if (!check.allowed) {
    return NextResponse.json(shape(check), { status: 403 })
  }

  await trackScan(service, user.id, 'ai-visibility', ip, { source: 'dashboard-rescan' }, null, 0)

  const after = await canUserScan(service, user.id, 'ai-visibility', ip)
  return NextResponse.json(shape(after))
}
