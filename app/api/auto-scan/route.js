// app/api/auto-scan/route.js
// Pro-only toggle voor wekelijkse automatische AI Visibility scan per BEDRIJF.
// GET ?integrationId=... : huidige stand + volgende scan-datum voor dit bedrijf.
// POST {integrationId, enabled} : aan/uit voor dit specifieke bedrijf.
//
// Wordt opgeslagen in tool_integrations.auto_scan_enabled (niet meer in
// profiles.auto_scan_enabled — dat veld blijft staan voor de Rank Tracker
// auto-scan die nog per-user werkt).

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function hashUserId(userId) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = ((h << 5) - h + userId.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Cron draait dagelijks 04:00 UTC. Bereken de eerstvolgende run voor deze user
// (dag-spreiding is op user-niveau, zelfde voor al zijn bedrijven).
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
    .select('subscription_status, subscription_tier')
    .eq('id', user.id)
    .single();

  const isActive = ['active', 'canceling'].includes(profile?.subscription_status);
  const isPro = isActive && (profile?.subscription_tier === 'pro' || !profile?.subscription_tier);
  if (!isPro) return { error: 'Auto-tracking is alleen beschikbaar voor Pro', status: 403 };

  return { user, profile, service };
}

async function getIntegration(service, userId, integrationId) {
  if (!integrationId) return { error: 'integrationId is verplicht', status: 400 };
  const { data, error } = await service
    .from('tool_integrations')
    .select('id, user_id, auto_scan_enabled')
    .eq('id', integrationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return { error: 'Integration niet gevonden', status: 404 };
  return { integration: data };
}

export async function GET(request) {
  const ctx = await getProUser();
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const url = new URL(request.url);
  const integrationId = url.searchParams.get('integrationId');
  const r = await getIntegration(ctx.service, ctx.user.id, integrationId);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status });

  const enabled = !!r.integration.auto_scan_enabled;
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

  const integrationId = body?.integrationId;
  const r = await getIntegration(ctx.service, ctx.user.id, integrationId);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status });

  const enabled = body?.enabled === true;

  const { error } = await ctx.service
    .from('tool_integrations')
    .update({ auto_scan_enabled: enabled })
    .eq('id', integrationId)
    .eq('user_id', ctx.user.id);

  if (error) {
    console.error('[Auto-scan toggle] Update error:', error.message);
    return NextResponse.json({ error: 'Bijwerken mislukt' }, { status: 500 });
  }

  return NextResponse.json({
    enabled,
    nextScanAt: enabled ? nextScanAt(ctx.user.id) : null,
  });
}
