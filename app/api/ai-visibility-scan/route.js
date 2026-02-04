import { NextResponse } from 'next/server'

export async function POST(request) {
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

  try {
    const { prompt, companyName, website } = await request.json()

    console.log('AI Scan request:', { prompt: prompt?.substring(0, 50), companyName, website })

    if (!prompt || !companyName) {
      return NextResponse.json({ 
        error: 'Prompt en bedrijfsnaam zijn verplicht',
        company_mentioned: false,
        mentions_count: 0
      }, { status: 400 })
    }

    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY not configured!')
      return NextResponse.json({ 
        error: 'PERPLEXITY_API_KEY niet geconfigureerd',
        company_mentioned: false,
        mentions_count: 0
      }, { status: 500 })
    }

    console.log('Calling Perplexity API...')
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Je bent een behulpzame AI-assistent die vragen beantwoordt over producten, diensten en bedrijven. Geef uitgebreide, feitelijke antwoorden gebaseerd op actuele informatie van het internet.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    })

    console.log('Perplexity response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Perplexity API error:', response.status, errorText)
      return NextResponse.json({ 
        error: `Perplexity API error: ${response.status}`,
        details: errorText,
        company_mentioned: false,
        mentions_count: 0
      }, { status: 500 })
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || ''
    
    console.log('AI Response length:', aiResponse.length)
    console.log('AI Response preview:', aiResponse.substring(0, 200))

    // Check if company is mentioned
    const companyLower = companyName.toLowerCase()
    const websiteDomain = website ? website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : ''
    const responseLower = aiResponse.toLowerCase()

    const companyMentioned = responseLower.includes(companyLower) || 
                           (websiteDomain && responseLower.includes(websiteDomain))

    // Count mentions
    let mentionCount = 0
    if (companyMentioned) {
      const regex = new RegExp(companyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const matches = aiResponse.match(regex)
      mentionCount = matches ? matches.length : 0
      
      if (websiteDomain) {
        const websiteRegex = new RegExp(websiteDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        const websiteMatches = aiResponse.match(websiteRegex)
        mentionCount += websiteMatches ? websiteMatches.length : 0
      }
    }

    console.log('Analysis:', { companyMentioned, mentionCount })

    // Extract snippet (first 500 chars)
    const snippet = aiResponse.substring(0, 500) + (aiResponse.length > 500 ? '...' : '')

    return NextResponse.json({
      company_mentioned: companyMentioned,
      mentions_count: mentionCount,
      competitors_mentioned: [],
      response_snippet: snippet,
      full_response: aiResponse
    })

  } catch (error) {
    console.error('AI scan error:', error)
    return NextResponse.json({ 
      error: error.message,
      company_mentioned: false,
      mentions_count: 0,
      competitors_mentioned: [],
      response_snippet: 'Scan mislukt: ' + error.message
    }, { status: 500 })
  }
}
