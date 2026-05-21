// app/api/auto-scan/route.js
// Pro-only toggle voor wekelijkse automatische rank-scan.
// GET: huidige stand + volgende scan-datum. POST {enabled: bool}: schakel aan/uit.

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Zelfde hash als in cron coordinator (rank-scan/route.js): bepaalt op welke
// UTC-weekdag de user wordt gescand (0 = zondag .. 6 = zaterdag).
function hashUserId(userId) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = ((h << 5) - h + userId.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Cron draait dagelijks 04:00 UTC. Bereken de eerstvolgende run voor deze user.
function nextScanAt(userId) {
  const userDay = hashUserId(userId) % 7;
  const now = new Date();
  const todayUTCDay = now.getUTCDay();
  const currentUTCHour = now.getUTCHours();

  let daysToAdd;
  if (todayUTCDay === userDay && currentUTCHour < 4) {
    daysToAdd = 0;
  } else {
    daysToAdd = (userDay - todayUTCDay + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
  }

  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 0, 0));
  next.setUTCDate(next.getUTCDate() + daysToAdd);
  return next.toISOString();
}

async function getProUser() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Niet ingelogd', status: 401 };

  const service = await createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('subscription_status, subscription_tier, auto_scan_enabled')
    .eq('id', user.id)
    .single();

  const isActive = ['active', 'canceling'].includes(profile?.subscription_status);
  const isPro = isActive && (profile?.subscription_tier === 'pro' || !profile?.subscription_tier); // legacy fallback
  if (!isPro) return { error: 'Auto-tracking is alleen beschikbaar voor Pro', status: 403 };

  return { user, profile, service };
}

export async function GET() {
  const ctx = await getProUser();
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const enabled = !!ctx.profile.auto_scan_enabled;
  return NextResponse.json({
    enabled,
    nextScanAt: enabled ? nextScanAt(ctx.user.id) : null,
  });
}

export async function POST(request) {
  const ctx = await getProUser();
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const enabled = body?.enabled === true;

  const { error } = await ctx.service
    .from('profiles')
    .update({ auto_scan_enabled: enabled })
    .eq('id', ctx.user.id);

  if (error) {
    console.error('[Auto-scan toggle] Update error:', error.message);
    return NextResponse.json({ error: 'Bijwerken mislukt' }, { status: 500 });
  }

  return NextResponse.json({
    enabled,
    nextScanAt: enabled ? nextScanAt(ctx.user.id) : null,
  });
}
