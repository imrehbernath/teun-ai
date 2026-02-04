import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { companyName, query, category } = await request.json()
    
    if (!companyName || !query) {
      return NextResponse.json({ error: 'companyName and query required' }, { status: 400 })
    }

    // Call Perplexity API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `Je bent een Nederlandse AI-assistent die helpt bij het vinden van bedrijven en dienstverleners in Nederland. 
Antwoord ALTIJD in het Nederlands.
Focus op concrete Nederlandse bedrijven en dienstverleners.
Vermijd grote internationale merken en platforms.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || ''

    // Check if company is mentioned
    const companyNameLower = companyName.toLowerCase()
    const responseLower = aiResponse.toLowerCase()
    
    // Check for exact match and variations
    const variations = [
      companyNameLower,
      companyNameLower.replace(/\s+/g, ''),
      companyNameLower.replace(/\s+/g, '-'),
      companyNameLower.split(' ')[0], // First word
    ]
    
    let mentionCount = 0
    for (const variant of variations) {
      if (variant.length > 3) {
        const regex = new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        const matches = aiResponse.match(regex)
        if (matches) mentionCount += matches.length
      }
    }
    
    const companyMentioned = mentionCount > 0

    // Extract competitor names using Claude
    let competitors = []
    try {
      const parseResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Analyseer deze tekst en geef een JSON array met alleen concrete Nederlandse bedrijfsnamen die worden genoemd (geen "${companyName}").
Excludeer: platforms (Google, Facebook), tools (Semrush), grote merken (Nike, Apple).
Focus alleen op kleinere Nederlandse dienstverleners.

Tekst: "${aiResponse.substring(0, 1500)}"

Antwoord alleen met een JSON array, bijv: ["Bedrijf A", "Bedrijf B"] of [] als er geen zijn.`
        }]
      })
      
      const parseText = parseResponse.content[0]?.text || '[]'
      const cleanText = parseText.replace(/```json\n?|\n?```/g, '').trim()
      competitors = JSON.parse(cleanText)
    } catch (e) {
      competitors = []
    }

    return NextResponse.json({
      company_mentioned: companyMentioned,
      mentions_count: mentionCount,
      competitors_mentioned: competitors,
      simulated_ai_response_snippet: aiResponse.substring(0, 500)
    })

  } catch (error) {
    console.error('AI visibility check error:', error)
    return NextResponse.json({
      company_mentioned: false,
      mentions_count: 0,
      competitors_mentioned: [],
      simulated_ai_response_snippet: 'Fout bij analyse: ' + error.message
    })
  }
}
