// app/api/cron/scan-user/route.js
// Worker voor de auto rank-scan cron. Scant 1 batch keywords (max 3) van 1 user
// parallel op ChatGPT, Perplexity en Google AI Mode en schrijft naar rank_history.
// Aangeroepen door /api/cron/rank-scan.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runLiveScan } from '@/lib/rank-scanner';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function authorized(request) {
  if (!process.env.CRON_SECRET) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, keywordIds } = body || {};
  if (!userId || !Array.isArray(keywordIds) || keywordIds.length === 0) {
    return NextResponse.json({ error: 'userId en keywordIds verplicht' }, { status: 400 });
  }

  const { data: keywords, error } = await supabase
    .from('tracked_keywords')
    .select('*')
    .eq('user_id', userId)
    .in('id', keywordIds);

  if (error) {
    console.error(`[Cron Worker] Keywords fetch error for ${userId}:`, error.message);
    return NextResponse.json({ error: 'Keywords fetch failed' }, { status: 500 });
  }

  if (!keywords?.length) {
    return NextResponse.json({ scanned: 0, skipped: keywordIds.length });
  }

  const results = await Promise.allSettled(
    keywords.map(kw => runLiveScan(supabase, kw, 'nl'))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  if (failed > 0) {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Cron Worker] Scan failed for keyword ${keywords[i].id}:`, r.reason?.message);
      }
    });
  }

  console.log(`[Cron Worker] User ${userId}: scanned ${succeeded}/${keywords.length} keywords`);

  return NextResponse.json({ userId, scanned: succeeded, failed });
}
