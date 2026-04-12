// app/api/rank-history/route.js
// Rank history: chart data + latest volledige scan resultaten (rankings, snippet)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const keywordId = searchParams.get('keywordId');
    const days = parseInt(searchParams.get('days') || '30');
    if (!userId) return NextResponse.json({ error: 'userId verplicht' }, { status: 400 });

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Lightweight history for charts (position + date only)
    let query = supabase
      .from('rank_history')
      .select('tracked_keyword_id, platform, position, found, scanned_at')
      .eq('user_id', userId)
      .gte('scanned_at', since.toISOString())
      .order('scanned_at', { ascending: true });
    if (keywordId) query = query.eq('tracked_keyword_id', keywordId);
    const { data, error } = await query;
    if (error) throw error;

    // Group for charts
    const history = {};
    const chartData = {};
    for (const row of data) {
      if (!history[row.tracked_keyword_id]) history[row.tracked_keyword_id] = [];
      history[row.tracked_keyword_id].push({ platform: row.platform, position: row.position, found: row.found, date: row.scanned_at });
      
      const dateKey = new Date(row.scanned_at).toISOString().split('T')[0];
      const kwKey = row.tracked_keyword_id;
      if (!chartData[kwKey]) chartData[kwKey] = {};
      if (!chartData[kwKey][dateKey]) chartData[kwKey][dateKey] = { date: dateKey };
      chartData[kwKey][dateKey][row.platform] = row.position;
    }
    const charts = {};
    for (const [kwId, dates] of Object.entries(chartData)) {
      charts[kwId] = Object.values(dates).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Latest FULL scan results per keyword per platform (with rankings, snippet, full_response)
    const latestFull = {};
    const kwIds = [...new Set(data.map(d => d.tracked_keyword_id))];
    if (kwIds.length > 0) {
      const { data: fullData } = await supabase
        .from('rank_history')
        .select('tracked_keyword_id, platform, position, found, total_results, rankings, snippet, full_response, scanned_at')
        .eq('user_id', userId)
        .in('tracked_keyword_id', kwIds)
        .order('scanned_at', { ascending: false });
      
      if (fullData) {
        for (const row of fullData) {
          const key = `${row.tracked_keyword_id}_${row.platform}`;
          if (!latestFull[row.tracked_keyword_id]) latestFull[row.tracked_keyword_id] = {};
          if (!latestFull[row.tracked_keyword_id][row.platform]) {
            latestFull[row.tracked_keyword_id][row.platform] = {
              position: row.position,
              found: row.found,
              totalResults: row.total_results,
              rankings: row.rankings || [],
              snippet: row.snippet || '',
              fullResponse: row.full_response || '',
              scannedAt: row.scanned_at,
            };
          }
        }
      }
    }

    return NextResponse.json({ history, charts, latestFull });
  } catch (error) {
    console.error('Rank history GET error:', error);
    return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 });
  }
}
