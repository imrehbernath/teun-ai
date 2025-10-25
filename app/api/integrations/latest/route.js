import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify token with Supabase Auth API directly
    const verifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      }
    )
    
    if (!verifyResponse.ok) {
      console.error('Token verification failed:', verifyResponse.status)
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    const user = await verifyResponse.json()
    console.log('✅ User verified:', user.email)
    
    // Create Supabase client with SERVICE ROLE KEY (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Query database with verified user ID
    const { data: integration, error } = await supabase
      .from('tool_integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Database query error:', error)
      throw error
    }

    if (!integration) {
      console.log('ℹ️ No previous scans found for user:', user.email)
      return NextResponse.json({
        success: true,
        integration: null,
        message: 'No previous scans found'
      })
    }

    console.log('✅ Found integration:', integration.id)
    console.log('📊 Prompts:', integration.commercial_prompts)
    
    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        company_name: integration.company_name,
        keyword: integration.keyword,
        commercial_prompts: integration.commercial_prompts || [],
        prompts_count: integration.prompts_count || 0,
        created_at: integration.created_at
      }
    })

  } catch (error) {
    console.error('Error fetching latest integration:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}