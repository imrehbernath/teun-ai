// app/api/cron/rank-scan/route.js
// Dagelijkse Vercel cron coordinator voor auto rank-scanning (Pro users).
// Spreidt Pro users met auto_scan_enabled=true over 7 dagen via hash(userId) % 7,
// chunkt elk users' keywords in batches van 3 en stuurt elke batch fire-and-forget
// naar /api/cron/scan-user (zodat de coordinator binnen 60s blijft).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('auto_scan_enabled', true)
    .in('subscription_status', ['active', 'canceling'])
    .eq('subscription_tier', 'pro');

  if (profErr) {
    console.error('[Cron] Profile query error:', profErr.message);
    return NextResponse.json({ error: 'Profile query failed' }, { status: 500 });
  }

  const todayUsers = (profiles || []).filter(p => hashUserId(p.id) % 7 === dayIndex);

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

  return NextResponse.json({
    dayIndex,
    usersMatched: todayUsers.length,
    usersProcessed,
    batchesDispatched: totalBatchesDispatched,
  });
}
