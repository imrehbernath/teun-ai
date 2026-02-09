import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { companyName, website, category, prompts } = await request.json()

    if (!companyName || !prompts || prompts.length === 0) {
      return NextResponse.json(
        { error: 'companyName en prompts zijn verplicht' },
        { status: 400 }
      )
    }

    // Max 10 prompts per scan
    const promptsToScan = prompts.slice(0, 10)
    const results = []

    for (const prompt of promptsToScan) {
      try {
        // Use regular Google search engine - SerpAPI returns ai_overview if present
        const params = new URLSearchParams({
          engine: 'google',
          q: prompt,
          api_key: process.env.SERPAPI_KEY,
          gl: 'nl',
          hl: 'nl',
          num: 10
        })

        const response = await fetch(`https://serpapi.com/search.json?${params}`)
        const data = await response.json()

        // Check if AI Overview exists in the response
        const aiOverview = data.ai_overview || null
        const hasAiOverview = !!aiOverview

        let companyMentioned = false
        let mentionCount = 0
        let aiOverviewText = ''
        let competitorsMentioned = []

        if (hasAiOverview) {
          // Extract text from AI Overview
          // SerpAPI ai_overview can have different structures
          if (aiOverview.text) {
            aiOverviewText = aiOverview.text
          } else if (aiOverview.text_blocks) {
            aiOverviewText = aiOverview.text_blocks
              .map(block => block.snippet || block.text || '')
              .join('\n')
          } else if (typeof aiOverview === 'string') {
            aiOverviewText = aiOverview
          }

          // Also check references/sources in the AI Overview
          const sourceTexts = []
          if (aiOverview.references) {
            aiOverview.references.forEach(ref => {
              if (ref.title) sourceTexts.push(ref.title)
              if (ref.snippet) sourceTexts.push(ref.snippet)
              if (ref.link) sourceTexts.push(ref.link)
            })
          }
          if (aiOverview.sources) {
            aiOverview.sources.forEach(src => {
              if (src.title) sourceTexts.push(src.title)
              if (src.snippet) sourceTexts.push(src.snippet)
              if (src.link) sourceTexts.push(src.link)
            })
          }

          const allText = (aiOverviewText + ' ' + sourceTexts.join(' ')).toLowerCase()

          // Check for company mention
          const companyLower = companyName.toLowerCase()
          companyMentioned = allText.includes(companyLower)

          // Also check website domain if provided
          if (!companyMentioned && website) {
            const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
            companyMentioned = allText.includes(domain)
          }

          // Count mentions
          if (companyMentioned) {
            const regex = new RegExp(companyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
            const matches = allText.match(regex)
            mentionCount = matches ? matches.length : 1
          }

          // Extract competitor names from references/sources
          if (aiOverview.references) {
            aiOverview.references.forEach(ref => {
              if (ref.title && !ref.title.toLowerCase().includes(companyLower)) {
                // Extract domain or title as competitor
                const name = ref.title.split(' - ')[0].split(' | ')[0].trim()
                if (name && name.length > 2 && name.length < 60) {
                  competitorsMentioned.push(name)
                }
              }
            })
          }
          if (aiOverview.sources) {
            aiOverview.sources.forEach(src => {
              if (src.title && !src.title.toLowerCase().includes(companyLower)) {
                const name = src.title.split(' - ')[0].split(' | ')[0].trim()
                if (name && name.length > 2 && name.length < 60) {
                  competitorsMentioned.push(name)
                }
              }
            })
          }

          // Deduplicate competitors
          competitorsMentioned = [...new Set(competitorsMentioned)].slice(0, 10)
        }

        results.push({
          query: prompt,
          hasAiOverview,
          companyMentioned,
          mentionCount,
          aiOverviewText: aiOverviewText.substring(0, 800),
          competitorsMentioned
        })

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 800))

      } catch (queryError) {
        console.error(`Error scanning query "${prompt}":`, queryError)
        results.push({
          query: prompt,
          hasAiOverview: false,
          companyMentioned: false,
          mentionCount: 0,
          aiOverviewText: '',
          competitorsMentioned: []
        })
      }
    }

    // Calculate totals
    const foundCount = results.filter(r => r.companyMentioned).length
    const hasAiOverviewCount = results.filter(r => r.hasAiOverview).length

    // Get user from auth header (optional - for logged-in users)
    let userId = null
    try {
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        userId = user?.id
      } else {
        // Try cookie-based auth
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const { data: { user } } = await supabase.auth.getUser()
          userId = user?.id
        }
      }
    } catch (e) {
      // Continue without user
    }

    // Save to database
    const { data: scanRecord, error: dbError } = await supabase
      .from('google_ai_overview_scans')
      .insert({
        user_id: userId,
        company_name: companyName,
        website: website || null,
        prompts: promptsToScan,
        results,
        found_count: foundCount,
        has_ai_overview_count: hasAiOverviewCount,
        total_queries: promptsToScan.length,
        status: 'completed',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Still return results even if DB save fails
    }

    return NextResponse.json({
      success: true,
      scanId: scanRecord?.id || null,
      companyName,
      totalQueries: promptsToScan.length,
      foundCount,
      hasAiOverviewCount,
      results
    })

  } catch (error) {
    console.error('Google AI Overview scan error:', error)
    return NextResponse.json(
      { error: error.message || 'Scan mislukt' },
      { status: 500 }
    )
  }
}
