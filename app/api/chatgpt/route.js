// app/api/chatgpt-scan/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/chatgpt-scan
 * Receives scan results from Chrome extension and saves to database
 */
export async function POST(request) {
  try {
    const body = await request.json()
    
    const {
      user_id,
      company_name,
      integration_id,
      results,
      total_queries,
      successful_queries,
      found_count,
      scan_date,
      source,
      extension_version
    } = body

    // Validate required fields
    if (!user_id || !company_name || !results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, company_name, or results' },
        { status: 400 }
      )
    }

    console.log('📥 Received ChatGPT scan results:', {
      user_id,
      company_name,
      total_queries,
      found_count,
      integration_id
    })

    const supabase = createClient()

    // Get auth token from header (FIXED for extension)
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header')
      return NextResponse.json(
        { error: 'Unauthorized - Missing Bearer token' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Verify user_id matches authenticated user
    if (user.id !== user_id) {
      console.error('❌ User ID mismatch:', { expected: user.id, received: user_id })
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    console.log('✅ User authenticated:', user.email)

    // 1. Create or update chatgpt_scans record
    const { data: scanRecord, error: scanError } = await supabase
      .from('chatgpt_scans')
      .insert({
        user_id,
        integration_id: integration_id || null,
        company_name,
        total_queries: total_queries || results.length,
        successful_queries: successful_queries || results.filter(r => r.success).length,
        found_count: found_count || results.filter(r => r.found).length,
        scan_date: scan_date || new Date().toISOString(),
        source: source || 'chrome-extension',
        extension_version: extension_version || '1.0.0',
        status: 'completed'
      })
      .select()
      .single()

    if (scanError) {
      console.error('❌ Error creating scan record:', scanError)
      return NextResponse.json(
        { error: 'Failed to create scan record', details: scanError.message },
        { status: 500 }
      )
    }

    console.log('✅ Scan record created:', scanRecord.id)

    // 2. Insert individual query results
    const queryResults = results.map(result => ({
      scan_id: scanRecord.id,
      user_id,
      query: result.query,
      found: result.found || false,
      position: result.position || null,
      snippet: result.snippet || null,
      response_length: result.response_length || null,
      response_preview: result.response_preview || null,
      full_response: result.full_response || null,
      success: result.success !== undefined ? result.success : true,
      error: result.error || null,
      timestamp: result.timestamp || new Date().toISOString()
    }))

    const { data: queryData, error: queryError } = await supabase
      .from('chatgpt_query_results')
      .insert(queryResults)
      .select()

    if (queryError) {
      console.error('❌ Error inserting query results:', queryError)
      // Don't fail the whole request - scan record is already created
      console.log('⚠️ Continuing despite query insert error...')
    } else {
      console.log(`✅ Inserted ${queryData.length} query results`)
    }

    // 3. Update tool_integrations if integration_id is provided
    if (integration_id) {
      const { error: updateError } = await supabase
        .from('tool_integrations')
        .update({
          chatgpt_scan_id: scanRecord.id,
          chatgpt_found_count: found_count || results.filter(r => r.found).length,
          chatgpt_scan_date: scan_date || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integration_id)
        .eq('user_id', user_id)

      if (updateError) {
        console.error('❌ Error updating integration:', updateError)
      } else {
        console.log('✅ Updated integration record:', integration_id)
      }
    }

    // 4. Calculate visibility score
    const totalQueries = total_queries || results.length
    const foundQueries = found_count || results.filter(r => r.found).length
    const visibilityScore = totalQueries > 0 
      ? Math.round((foundQueries / totalQueries) * 100)
      : 0

    return NextResponse.json({
      success: true,
      scan_id: scanRecord.id,
      message: 'Scan results saved successfully',
      stats: {
        total_queries: totalQueries,
        successful_queries: successful_queries || results.filter(r => r.success).length,
        found_count: foundQueries,
        visibility_score: `${visibilityScore}%`
      }
    })

  } catch (error) {
    console.error('❌ API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chatgpt-scan
 * Retrieve scan history for a user
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const integrationId = searchParams.get('integration_id')
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabase = createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // If userId provided, verify it matches authenticated user
    const queryUserId = userId || user.id
    if (queryUserId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    let query = supabase
      .from('chatgpt_scans')
      .select(`
        id,
        company_name,
        total_queries,
        successful_queries,
        found_count,
        scan_date,
        source,
        extension_version,
        status,
        created_at,
        updated_at
      `)
      .eq('user_id', queryUserId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (integrationId) {
      query = query.eq('integration_id', integrationId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching scans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scans', details: error.message },
        { status: 500 }
      )
    }

    // Calculate stats
    const stats = {
      total_scans: data.length,
      total_queries_scanned: data.reduce((sum, scan) => sum + scan.total_queries, 0),
      total_found: data.reduce((sum, scan) => sum + scan.found_count, 0),
      average_visibility: data.length > 0
        ? Math.round(
            data.reduce((sum, scan) => 
              sum + (scan.found_count / scan.total_queries * 100), 0
            ) / data.length
          )
        : 0
    }

    return NextResponse.json({
      success: true,
      scans: data,
      count: data.length,
      stats
    })

  } catch (error) {
    console.error('❌ API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS (needed for extension)
 */
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}