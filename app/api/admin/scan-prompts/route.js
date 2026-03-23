// app/api/admin/scan-prompts/route.js
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BETA_CONFIG } from '@/lib/beta-config'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    // Auth + admin check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !BETA_CONFIG.ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')
    const website = searchParams.get('website')

    if (!company && !website) {
      return NextResponse.json({ error: 'company of website vereist' }, { status: 400 })
    }

    // Service client bypasses RLS
    const serviceClient = await createServiceClient()

    let query = serviceClient
      .from('tool_integrations')
      .select('commercial_prompts, results')
      .order('created_at', { ascending: false })
      .limit(1)

    if (company) query = query.eq('company_name', company)
    if (website) query = query.eq('website', website)

    const { data, error } = await query.single()

    if (error || !data) {
      return NextResponse.json({ prompts: null })
    }

    const perplexityResults = data.results?.perplexity || []
    const chatgptResults = data.results?.chatgpt || []

    const prompts = (data.commercial_prompts || []).map((prompt, i) => {
      const pResult = perplexityResults[i] || {}
      const cResult = chatgptResults[i] || {}
      return {
        text: prompt,
        perplexity: pResult.company_mentioned || false,
        chatgpt: cResult.company_mentioned || false,
        perplexityCompetitors: pResult.competitors_mentioned || [],
        chatgptCompetitors: cResult.competitors_mentioned || []
      }
    })

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('Admin scan-prompts error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
