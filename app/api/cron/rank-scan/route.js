// app/api/cron/rank-scan/route.js
// Dagelijkse Vercel cron coordinator voor auto rank-scanning (Pro users).
// Spreidt Pro users met auto_scan_enabled=true over 7 dagen via hash(userId) % 7,
// chunkt elk users' keywords in batches van 3 en stuurt elke batch fire-and-forget
// naar /api/cron/scan-user (zodat de coordinator binnen 60s blijft).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BETA_CONFIG } from '@/lib/beta-config';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 3;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hashUserId(userId) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = ((h << 5) - h + userId.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

function authorized(request) {
  if (!process.env.CRON_SECRET) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dayIndex = new Date().getUTCDay(); // 0=Sunday .. 6=Saturday
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';

  // Selecteer profielen met auto-scan aan; filter daarna in JS op Pro OR admin-email.
  // Admin-bypass is consistent met de rest van de codebase (zie lib/beta-config.js).
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, email, subscription_tier')
    .eq('auto_scan_enabled', true)
    .in('subscription_status', ['active', 'canceling']);

  if (profErr) {
    console.error('[Cron] Profile query error:', profErr.message);
    return NextResponse.json({ error: 'Profile query failed' }, { status: 500 });
  }

  const adminEmails = BETA_CONFIG.ADMIN_EMAILS || [];
  // Legacy subscribers (subscription_tier === null + active) gelden als Pro,
  // consistent met lib/beta-config.js, /api/auto-scan/route.js en
  // /api/tracked-keywords/route.js.
  const eligible = (profiles || []).filter(p =>
    p.subscription_tier === 'pro' ||
    p.subscription_tier == null ||
    adminEmails.includes(p.email)
  );

  const todayUsers = force
    ? eligible
    : eligible.filter(p => hashUserId(p.id) % 7 === dayIndex);

  const baseUrl = getBaseUrl();
  let totalBatchesDispatched = 0;
  let usersProcessed = 0;

  for (const profile of todayUsers) {
    const { data: keywords, error: kwErr } = await supabase
      .from('tracked_keywords')
      .select('id')
      .eq('user_id', profile.id);

    if (kwErr) {
      console.error(`[Cron] Keywords query error for ${profile.id}:`, kwErr.message);
      continue;
    }
    if (!keywords?.length) continue;

    usersProcessed++;

    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE).map(k => k.id);

      // Fire-and-forget: catch om unhandled rejection te voorkomen, niet awaiten op het scan-resultaat.
      fetch(`${baseUrl}/api/cron/scan-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ userId: profile.id, keywordIds: batch }),
        keepalive: true,
      }).catch(err => console.error(`[Cron] Dispatch error for ${profile.id}:`, err.message));

      totalBatchesDispatched++;
    }
  }

  console.log(`[Cron] Day ${dayIndex}: ${usersProcessed} users, ${totalBatchesDispatched} batches dispatched`);

  // ─────────────────────────────────────────────────────────────
  // AI Visibility weekly auto-scan per BEDRIJF.
  // Sinds tool_integrations.auto_scan_enabled per-integration werkt, scannen
  // we elk bedrijf dat individueel aan staat. Pro-check via join op profiles,
  // dag-spreiding nog steeds op user-id zodat alle bedrijven van 1 user op
  // dezelfde dag draaien (consistent met de Rank Tracker hierboven).
  let visibilityIntegrationsDispatched = 0;
  const visibilityUsers = new Set();

  const { data: aivIntegrations, error: aivErr } = await supabase
    .from('tool_integrations')
    .select('id, user_id, company_name, website, company_category, commercial_prompts, profiles!inner(email, subscription_tier, subscription_status)')
    .eq('auto_scan_enabled', true)
    .not('commercial_prompts', 'is', null);

  if (aivErr) {
    console.error('[Cron AIV] Integrations query error:', aivErr.message);
  }

  const todayIntegrations = (aivIntegrations || []).filter(it => {
    const p = it.profiles;
    if (!p) return false;
    const isActive = ['active', 'canceling'].includes(p.subscription_status);
    const isPro = isActive && (p.subscription_tier === 'pro' || p.subscription_tier == null || adminEmails.includes(p.email));
    if (!isPro) return false;
    if (force) return true;
    return hashUserId(it.user_id) % 7 === dayIndex;
  });

  for (const integration of todayIntegrations) {
    const prompts = (integration.commercial_prompts || [])
      .map(p => (typeof p === 'string' ? p : (p?.prompt || p?.text || p?.query || p?.ai_prompt || '')))
      .filter(Boolean);

    if (prompts.length === 0) continue;

    visibilityUsers.add(integration.user_id);

    fetch(`${baseUrl}/api/scan-selected-prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        integrationId: integration.id,
        prompts,
        companyName: integration.company_name,
        website: integration.website,
        branche: integration.company_category,
        location: null,
        writeHistory: true,
      }),
      keepalive: true,
    }).catch(err => console.error(`[Cron AIV] Dispatch error for ${integration.id}:`, err.message));

    // Google AI Mode (SerpAPI) — apart endpoint, fire-and-forget.
    fetch(`${baseUrl}/api/scan-google-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        userId: integration.user_id,
        integrationId: integration.id,
        companyName: integration.company_name,
        website: integration.website,
        category: integration.company_category,
        prompts,
        skipSave: true,
        writeHistory: true,
      }),
      keepalive: true,
    }).catch(err => console.error(`[Cron AIM] Dispatch error for ${integration.id}:`, err.message));

    // Google AI Overviews (SerpAPI) — apart endpoint, fire-and-forget.
    fetch(`${baseUrl}/api/scan-google-ai-overview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        userId: integration.user_id,
        integrationId: integration.id,
        companyName: integration.company_name,
        website: integration.website,
        prompts,
        skipSave: true,
        writeHistory: true,
      }),
      keepalive: true,
    }).catch(err => console.error(`[Cron AIO] Dispatch error for ${integration.id}:`, err.message));

    visibilityIntegrationsDispatched++;
  }

  const visibilityUsersProcessed = visibilityUsers.size;
  console.log(`[Cron AIV] Day ${dayIndex}: ${visibilityUsersProcessed} users, ${visibilityIntegrationsDispatched} integrations dispatched`);

  return NextResponse.json({
    dayIndex,
    usersMatched: todayUsers.length,
    usersProcessed,
    batchesDispatched: totalBatchesDispatched,
    visibility: {
      usersProcessed: visibilityUsersProcessed,
      integrationsDispatched: visibilityIntegrationsDispatched,
    },
  });
}
