// app/api/rank-history/route.js
// Haal rank history op voor grafieken

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const keywordId = searchParams.get('keywordId');
    const days = parseInt(searchParams.get('days') || '30');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId verplicht' }, { status: 400 });
    }
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    let query = supabase
      .from('rank_history')
      .select('tracked_keyword_id, platform, position, found, scanned_at')
      .eq('user_id', userId)
      .gte('scanned_at', since.toISOString())
      .order('scanned_at', { ascending: true });
    
    if (keywordId) {
      query = query.eq('tracked_keyword_id', keywordId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Group by keyword_id for easy chart rendering
    const grouped = {};
    for (const row of data) {
      if (!grouped[row.tracked_keyword_id]) {
        grouped[row.tracked_keyword_id] = [];
      }
      grouped[row.tracked_keyword_id].push({
        platform: row.platform,
        position: row.position,
        found: row.found,
        date: row.scanned_at,
      });
    }
    
    // Also build chart-ready data: per scan date, all 3 platform positions
    const chartData = {};
    for (const row of data) {
      const dateKey = new Date(row.scanned_at).toISOString().split('T')[0];
      const kwKey = row.tracked_keyword_id;
      const compositeKey = `${kwKey}_${dateKey}`;
      
      if (!chartData[kwKey]) chartData[kwKey] = {};
      if (!chartData[kwKey][dateKey]) {
        chartData[kwKey][dateKey] = { date: dateKey };
      }
      chartData[kwKey][dateKey][row.platform] = row.position;
    }
    
    // Convert to arrays per keyword
    const charts = {};
    for (const [kwId, dates] of Object.entries(chartData)) {
      charts[kwId] = Object.values(dates).sort((a, b) => a.date.localeCompare(b.date));
    }
    
    return NextResponse.json({ history: grouped, charts });
    
  } catch (error) {
    console.error('Rank history GET error:', error);
    return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 });
  }
}
