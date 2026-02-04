import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================
// AI ANALYSIS API - Comprehensive GEO Analysis
// ============================================

export async function POST(request) {
  try {
    const {
      companyName,
      companyWebsite,
      companyCategory,
      searchConsoleQueries,
      scannedPages,
      checklist,
      userId
    } = await request.json()

    console.log(`🔍 Starting GEO Analysis for: ${companyName}`)

    // ============================================
    // 1. LOAD EXISTING SCANS FROM DATABASE
    // ============================================
    
    let existingScans = { perplexity: [], chatgpt: [] }
    
    if (userId) {
      // Load Perplexity scans
      const { data: perplexityScans } = await supabase
        .from('tool_integrations')
        .select('*')
        .eq('user_id', userId)
        .ilike('company_name', `%${companyName}%`)
        .not('commercial_prompts', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (perplexityScans) {
        existingScans.perplexity = perplexityScans
      }
      
      // Load ChatGPT scans
      const { data: chatgptScans } = await supabase
        .from('chatgpt_scans')
        .select('*, chatgpt_query_results (*)')
        .eq('user_id', userId)
        .ilike('company_name', `%${companyName}%`)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (chatgptScans) {
        existingScans.chatgpt = chatgptScans
      }
    }

    // ============================================
    // 2. GENERATE COMMERCIAL PROMPTS FROM SC DATA
    // ============================================
    
    const generatedPrompts = await generateCommercialPrompts(
      companyName,
      companyCategory,
      searchConsoleQueries,
      scannedPages
    )

    // ============================================
    // 3. ANALYZE PAGE CONTENT VS PROMPTS
    // ============================================
    
    const contentAnalysis = analyzeContentCoverage(
      scannedPages,
      searchConsoleQueries,
      generatedPrompts
    )

    // ============================================
    // 4. CALCULATE VISIBILITY SCORE
    // ============================================
    
    const visibilityScore = calculateVisibilityScore(
      existingScans,
      checklist,
      contentAnalysis,
      scannedPages
    )

    // ============================================
    // 5. GENERATE AI INSIGHTS
    // ============================================
    
    const aiInsights = await generateAIInsights(
      companyName,
      companyCategory,
      companyWebsite,
      scannedPages,
      searchConsoleQueries,
      existingScans,
      checklist,
      contentAnalysis,
      visibilityScore
    )

    // ============================================
    // 6. COMPILE RESULTS
    // ============================================
    
    return NextResponse.json({
      success: true,
      visibilityScore: visibilityScore.total,
      scores: {
        existingScans: visibilityScore.existingScansScore,
        contentQuality: visibilityScore.contentScore,
        technicalSEO: visibilityScore.technicalScore,
        checklistCompletion: visibilityScore.checklistScore
      },
      findings: aiInsights.findings,
      recommendations: aiInsights.recommendations,
      generatedPrompts,
      contentAnalysis,
      existingScans: {
        perplexityCount: existingScans.perplexity.length,
        chatgptCount: existingScans.chatgpt.length,
        totalMentions: countTotalMentions(existingScans)
      },
      keywordGaps: contentAnalysis.keywordGaps,
      superPrompts: generatedPrompts.slice(0, 20)
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// ============================================
// PROMPT GENERATION
// ============================================

async function generateCommercialPrompts(companyName, category, scQueries, pages) {
  // Combine keywords from all sources
  const allKeywords = new Set()
  
  // From Search Console
  scQueries?.forEach(q => allKeywords.add(q))
  
  // From scanned pages
  pages?.forEach(page => {
    if (page.success && page.keywords) {
      page.keywords.forEach(k => allKeywords.add(k))
    }
  })
  
  const keywordsList = [...allKeywords].slice(0, 30)
  
  if (keywordsList.length === 0) {
    // Fallback to category-based prompts
    return generateFallbackPrompts(companyName, category)
  }
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Genereer 20 commerciële zoekvragen die potentiële klanten zouden stellen aan AI-assistenten (ChatGPT, Perplexity, Gemini) wanneer ze op zoek zijn naar een bedrijf zoals "${companyName}" in de branche "${category}".

Beschikbare zoekwoorden uit Search Console en website:
${keywordsList.join(', ')}

Regels:
1. Schrijf in het Nederlands
2. Gebruik natuurlijke vraagtaal (hoe, wat, welke, waar, wie)
3. Mix informatieve en transactionele vragen
4. Gebruik de zoekwoorden waar mogelijk
5. Focus op commerciële intent (mensen die willen kopen/inhuren)

Geef exact 20 vragen, één per regel, zonder nummering.`
      }]
    })
    
    const prompts = response.content[0].text
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 10 && !p.startsWith('-') && !p.match(/^\d+\./))
      .slice(0, 20)
    
    return prompts
    
  } catch (error) {
    console.error('Prompt generation error:', error)
    return generateFallbackPrompts(companyName, category)
  }
}

function generateFallbackPrompts(companyName, category) {
  const templates = [
    `Wat is de beste ${category} in Amsterdam?`,
    `Wie is de beste ${category} in Nederland?`,
    `Welke ${category} raden jullie aan?`,
    `Hoe vind ik een goede ${category}?`,
    `Wat kost een ${category}?`,
    `Waar kan ik een ${category} vinden?`,
    `Welke ${category} heeft de beste reviews?`,
    `Wat maakt ${companyName} anders dan andere ${category}s?`,
    `Is ${companyName} een goede keuze voor ${category}?`,
    `Wat zijn de voordelen van ${companyName}?`,
    `Hoe werkt ${companyName}?`,
    `Wat zijn de beste ${category} bureaus?`,
    `Welke ${category} specialist zou je aanraden?`,
    `Waar vind ik de beste ${category} diensten?`,
    `Wat zijn de top ${category} bedrijven?`
  ]
  return templates
}

// ============================================
// CONTENT ANALYSIS
// ============================================

function analyzeContentCoverage(pages, scQueries, prompts) {
  const analysis = {
    coveredTopics: [],
    uncoveredTopics: [],
    keywordGaps: [],
    contentStrengths: [],
    contentWeaknesses: []
  }
  
  // Combine all page content
  const allContent = pages
    ?.filter(p => p.success)
    ?.map(p => `${p.title} ${p.metaDescription} ${p.h1s?.join(' ')} ${p.h2s?.join(' ')} ${p.bodyContent}`)
    ?.join(' ')
    ?.toLowerCase() || ''
  
  // Check which SC queries are covered in content
  scQueries?.forEach(query => {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const matchCount = queryWords.filter(w => allContent.includes(w)).length
    const matchRatio = queryWords.length > 0 ? matchCount / queryWords.length : 0
    
    if (matchRatio >= 0.6) {
      analysis.coveredTopics.push(query)
    } else {
      analysis.uncoveredTopics.push(query)
      analysis.keywordGaps.push({
        query,
        matchRatio: Math.round(matchRatio * 100),
        missingWords: queryWords.filter(w => !allContent.includes(w))
      })
    }
  })
  
  // Check prompt coverage
  prompts?.forEach(prompt => {
    const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const matchCount = promptWords.filter(w => allContent.includes(w)).length
    const matchRatio = promptWords.length > 0 ? matchCount / promptWords.length : 0
    
    if (matchRatio < 0.5) {
      analysis.keywordGaps.push({
        query: prompt,
        matchRatio: Math.round(matchRatio * 100),
        type: 'prompt'
      })
    }
  })
  
  // Identify content strengths
  if (pages?.some(p => p.structuredData?.hasOrganization)) {
    analysis.contentStrengths.push('Organization structured data aanwezig')
  }
  if (pages?.some(p => p.structuredData?.hasFAQ)) {
    analysis.contentStrengths.push('FAQ structured data aanwezig')
  }
  if (pages?.some(p => p.contentAnalysis?.score >= 70)) {
    analysis.contentStrengths.push('Hoge content kwaliteitsscore')
  }
  
  // Identify weaknesses
  if (pages?.some(p => !p.success)) {
    analysis.contentWeaknesses.push('Sommige pagina\'s konden niet worden gescand')
  }
  if (pages?.every(p => !p.structuredData?.hasFAQ)) {
    analysis.contentWeaknesses.push('Geen FAQ structured data gevonden')
  }
  if (analysis.keywordGaps.length > 5) {
    analysis.contentWeaknesses.push(`${analysis.keywordGaps.length} zoekwoord gaps gevonden`)
  }
  
  return analysis
}

// ============================================
// VISIBILITY SCORE CALCULATION
// ============================================

function calculateVisibilityScore(existingScans, checklist, contentAnalysis, pages) {
  let scores = {
    existingScansScore: 0,
    contentScore: 0,
    technicalScore: 0,
    checklistScore: 0,
    total: 0
  }
  
  // 1. Existing scans score (0-25 points)
  const totalMentions = countTotalMentions(existingScans)
  const totalQueries = countTotalQueries(existingScans)
  
  if (totalQueries > 0) {
    const mentionRate = totalMentions / totalQueries
    scores.existingScansScore = Math.round(Math.min(25, mentionRate * 100 * 0.25))
  }
  
  // 2. Content quality score (0-25 points)
  if (pages && pages.length > 0) {
    const avgContentScore = pages
      .filter(p => p.success && p.contentAnalysis)
      .reduce((sum, p) => sum + (p.contentAnalysis.score || 0), 0) / 
      Math.max(1, pages.filter(p => p.success).length)
    
    scores.contentScore = Math.round(avgContentScore * 0.25)
  }
  
  // 3. Technical score (0-25 points)
  let technicalPoints = 0
  if (pages && pages.length > 0) {
    const successfulPages = pages.filter(p => p.success)
    
    // Structured data
    if (successfulPages.some(p => p.structuredData?.hasOrganization)) technicalPoints += 5
    if (successfulPages.some(p => p.structuredData?.hasFAQ)) technicalPoints += 5
    if (successfulPages.some(p => p.structuredData?.hasOG)) technicalPoints += 3
    if (successfulPages.some(p => p.structuredData?.hasTwitterCard)) technicalPoints += 2
    
    // Content structure
    const avgH2Count = successfulPages.reduce((sum, p) => sum + (p.h2s?.length || 0), 0) / Math.max(1, successfulPages.length)
    if (avgH2Count >= 3) technicalPoints += 5
    
    // Internal linking
    const avgInternalLinks = successfulPages.reduce((sum, p) => sum + (p.internalLinks?.length || 0), 0) / Math.max(1, successfulPages.length)
    if (avgInternalLinks >= 5) technicalPoints += 5
  }
  scores.technicalScore = Math.min(25, technicalPoints)
  
  // 4. Checklist score (0-25 points)
  if (checklist && checklist.length > 0) {
    const totalItems = checklist.reduce((sum, section) => sum + section.items.length, 0)
    const checkedItems = checklist.reduce((sum, section) => 
      sum + section.items.filter(item => item.checked).length, 0)
    
    scores.checklistScore = Math.round((checkedItems / totalItems) * 25)
  }
  
  // Calculate total
  scores.total = scores.existingScansScore + scores.contentScore + scores.technicalScore + scores.checklistScore
  
  return scores
}

function countTotalMentions(existingScans) {
  let total = 0
  
  // Perplexity mentions
  existingScans.perplexity?.forEach(scan => {
    total += scan.total_company_mentions || 0
    // Fallback: count from results
    if (total === 0 && scan.scan_results) {
      total += scan.scan_results.filter(r => r.company_mentioned).length
    }
  })
  
  // ChatGPT mentions
  existingScans.chatgpt?.forEach(scan => {
    const results = scan.chatgpt_query_results || []
    total += results.filter(r => r.company_mentioned).length
  })
  
  return total
}

function countTotalQueries(existingScans) {
  let total = 0
  
  existingScans.perplexity?.forEach(scan => {
    total += scan.commercial_prompts?.length || scan.scan_results?.length || 0
  })
  
  existingScans.chatgpt?.forEach(scan => {
    total += scan.chatgpt_query_results?.length || 0
  })
  
  return total
}

// ============================================
// AI INSIGHTS GENERATION
// ============================================

async function generateAIInsights(
  companyName,
  category,
  website,
  pages,
  scQueries,
  existingScans,
  checklist,
  contentAnalysis,
  visibilityScore
) {
  try {
    // Prepare context for Claude
    const context = {
      company: companyName,
      category,
      website,
      visibilityScore: visibilityScore.total,
      pageCount: pages?.filter(p => p.success).length || 0,
      scQueryCount: scQueries?.length || 0,
      existingMentions: countTotalMentions(existingScans),
      totalQueries: countTotalQueries(existingScans),
      keywordGaps: contentAnalysis.keywordGaps.slice(0, 5).map(g => g.query),
      contentStrengths: contentAnalysis.contentStrengths,
      contentWeaknesses: contentAnalysis.contentWeaknesses,
      checklistCompletion: checklist ? 
        Math.round(checklist.reduce((a, s) => a + s.items.filter(i => i.checked).length, 0) / 
        checklist.reduce((a, s) => a + s.items.length, 0) * 100) : 0
    }
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Je bent een GEO (Generative Engine Optimization) expert. Analyseer de volgende data en geef bevindingen en aanbevelingen.

Bedrijf: ${context.company}
Branche: ${context.category}
Website: ${context.website}

SCORES:
- Totale AI Visibility Score: ${context.visibilityScore}/100
- Gescande pagina's: ${context.pageCount}
- Search Console queries geanalyseerd: ${context.scQueryCount}
- Bestaande AI vermeldingen: ${context.existingMentions} van ${context.totalQueries} queries
- GEO Checklist completion: ${context.checklistCompletion}%

GAPS:
- Keyword gaps: ${context.keywordGaps.join(', ') || 'Geen'}

STERKTES:
${context.contentStrengths.map(s => `- ${s}`).join('\n') || '- Geen geïdentificeerd'}

ZWAKTES:
${context.contentWeaknesses.map(w => `- ${w}`).join('\n') || '- Geen geïdentificeerd'}

Geef je analyse in het volgende JSON formaat:
{
  "findings": [
    { "type": "success|warning|critical", "title": "Korte titel", "description": "Uitleg" }
  ],
  "recommendations": [
    { "priority": "high|medium|low", "title": "Korte titel", "description": "Actie om te nemen" }
  ]
}

Geef 3-5 bevindingen en 3-5 aanbevelingen. Focus op concrete, actionable items.`
      }]
    })
    
    // Parse the JSON response
    const text = response.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // Fallback
    return {
      findings: [
        { type: visibilityScore.total >= 50 ? 'success' : 'warning', title: `Visibility Score: ${visibilityScore.total}%`, description: 'Gebaseerd op bestaande scans, content kwaliteit en checklist completion.' }
      ],
      recommendations: [
        { priority: 'high', title: 'Voer AI visibility scans uit', description: 'Start Perplexity en ChatGPT scans om je huidige zichtbaarheid te meten.' }
      ]
    }
    
  } catch (error) {
    console.error('AI Insights error:', error)
    return {
      findings: [
        { type: 'warning', title: 'Analyse deels voltooid', description: 'AI insights konden niet volledig worden gegenereerd.' }
      ],
      recommendations: []
    }
  }
}
