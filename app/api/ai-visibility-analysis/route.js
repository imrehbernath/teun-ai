// app/api/ai-visibility-analysis/route.js
// ✅ ULTIMATE VERSION - Best of Gemini + Claude + Natural Questions
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { canUserScan, trackScan, BETA_CONFIG } from '@/lib/beta-config'

// Vercel function timeout — 10 prompts × 2s delay = needs 300s
export const maxDuration = 300
import Anthropic from '@anthropic-ai/sdk'

// ✅ Slack notificatie functie
async function sendSlackNotification(scanData) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('⚠️ Slack webhook URL niet geconfigureerd');
    return;
  }

  try {
    const { companyName, companyCategory, primaryKeyword, totalMentions, websiteUrl } = scanData;

    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎯 Nieuwe AI Visibility Scan!",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Bedrijfsnaam:*\n${companyName}`
            },
            {
              type: "mrkdwn",
              text: `*Categorie:*\n${companyCategory}`
            },
            {
              type: "mrkdwn",
              text: `*Website:*\n${websiteUrl || 'Niet opgegeven'}`
            },
            {
              type: "mrkdwn",
              text: `*Zoekwoord:*\n${primaryKeyword || 'Geen opgegeven'}`
            },
            {
              type: "mrkdwn",
              text: `*Score:*\n${totalMentions} vermeldingen`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `${new Date().toLocaleString('nl-NL')}`
            }
          ]
        },
        {
          type: "divider"
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      console.error('❌ Slack notificatie mislukt:', response.statusText);
    } else {
      console.log('✅ Slack notificatie verstuurd');
    }
  } catch (error) {
    console.error('❌ Slack notificatie error:', error);
  }
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '0f2289b685e1cf063f5c6572e2dcef83'

// ============================================
// ✨ WEBSITE SCRAPING WITH SCRAPER API
// ============================================
async function scrapeWebsite(url) {
  try {
    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    console.log(`🔗 Scraping: ${normalizedUrl}`)
    
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}&render=false`
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Scraper API error: ${response.status}`)
    }
    
    const html = await response.text()
    console.log(`✅ Scraped ${html.length} characters`)
    
    return { success: true, html }
  } catch (error) {
    console.error('❌ Scrape error:', error.message)
    return { success: false, error: error.message }
  }
}

// ============================================
// ✨ PARSE HTML FOR RELEVANT CONTENT
// ============================================
function parseHtmlContent(html) {
  // Extract meta title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''
  
  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : ''
  
  // Extract H1s (support nested tags like <h1><span>Text</span></h1>)
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []
  const h1s = h1Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 3)
  
  // Extract H2s  
  const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []
  const h2s = h2Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 8)
  
  // Extract H3s (often contain specific services/products)
  const h3Matches = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || []
  const h3s = h3Matches.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(h => h.length > 0).slice(0, 8)
  
  // ✨ Extract navigation/menu items (crucial for finding services)
  const navItems = []
  
  // Method 1: Links inside <nav> tags
  const navBlocks = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || []
  navBlocks.forEach(nav => {
    const links = nav.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) || []
    links.forEach(link => {
      const text = link.replace(/<[^>]+>/g, '').trim()
      if (text.length > 1 && text.length < 60) navItems.push(text)
    })
  })
  
  // Method 2: Links with common menu/nav class names
  const menuLinks = html.match(/<a[^>]*class=["'][^"']*(?:menu|nav|header)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi) || []
  menuLinks.forEach(link => {
    const text = link.replace(/<[^>]+>/g, '').trim()
    if (text.length > 1 && text.length < 60 && !navItems.includes(text)) navItems.push(text)
  })
  
  // ✨ Extract internal links to service/product pages
  const serviceLinks = []
  const internalLinks = html.match(/<a[^>]*href=["']\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi) || []
  internalLinks.forEach(link => {
    const hrefMatch = link.match(/href=["']([^"']+)["']/)
    const text = link.replace(/<[^>]+>/g, '').trim()
    const href = hrefMatch ? hrefMatch[1] : ''
    if (href && text.length > 2 && text.length < 80 && 
        /dienst|service|product|oploss|behandel|specialist|aanbod|werkgebied|wat-we|over-ons/i.test(href + text)) {
      serviceLinks.push(`${text} (${href})`)
    }
  })
  
  // Extract main content (strip tags, limit size)
  let bodyContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000) // Limit to ~3000 chars for Claude context
  
  return {
    title,
    metaDescription,
    h1s,
    h2s,
    h3s,
    navItems: [...new Set(navItems)].slice(0, 15),
    serviceLinks: [...new Set(serviceLinks)].slice(0, 10),
    bodyContent
  }
}

// ============================================
// ✨ ANALYZE WEBSITE WITH CLAUDE
// ============================================
async function analyzeWebsiteForKeywords(websiteUrl, companyName, companyCategory) {
  try {
    // Step 1: Scrape the website
    const scrapeResult = await scrapeWebsite(websiteUrl)
    if (!scrapeResult.success) {
      return { success: false, error: scrapeResult.error }
    }
    
    // Step 2: Parse HTML
    const parsed = parseHtmlContent(scrapeResult.html)
    
    // Step 3: Analyze with Claude (now with nav items, H3s, service links)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `Je bent een expert in het analyseren van websites voor zoekwoord-extractie en commerciële intentie.
Je analyseert websites om te begrijpen:
1. Welke diensten/producten het bedrijf aanbiedt
2. Wat hun USPs (unique selling points) zijn
3. Welke zoekwoorden potentiële klanten zouden gebruiken
4. Welke locatie-focus ze hebben

Let EXTRA op menu-items en navigatie — daar staan vaak de kernactiviteiten.
Diensten-pagina's en H3-koppen bevatten vaak de beste zoekwoorden.

Antwoord ALTIJD in het Nederlands. Wees CONCREET en SPECIFIEK.`,
      messages: [{
        role: 'user',
        content: `Analyseer deze website-informatie voor "${companyName}" (branche: ${companyCategory}):

**META TITEL:** ${parsed.title || 'Niet gevonden'}

**META BESCHRIJVING:** ${parsed.metaDescription || 'Niet gevonden'}

**H1 KOPPEN:** ${parsed.h1s.length > 0 ? parsed.h1s.join(' | ') : 'Niet gevonden'}

**H2 KOPPEN:** ${parsed.h2s.length > 0 ? parsed.h2s.join(' | ') : 'Niet gevonden'}

**H3 KOPPEN:** ${parsed.h3s?.length > 0 ? parsed.h3s.join(' | ') : 'Niet gevonden'}

**NAVIGATIE/MENU-ITEMS:** ${parsed.navItems?.length > 0 ? parsed.navItems.join(' | ') : 'Niet gevonden'}

**DIENSTEN/SERVICE LINKS:** ${parsed.serviceLinks?.length > 0 ? parsed.serviceLinks.join(' | ') : 'Niet gevonden'}

**PAGINA CONTENT (fragment):** ${parsed.bodyContent.slice(0, 1500)}

---

Geef je analyse in EXACT dit JSON-formaat:

{
  "keywords": ["zoekwoord1", "zoekwoord2", "zoekwoord3", "zoekwoord4", "zoekwoord5", "zoekwoord6", "zoekwoord7", "zoekwoord8", "zoekwoord9", "zoekwoord10"],
  "services": ["dienst1", "dienst2", "dienst3"],
  "usps": ["usp1", "usp2"],
  "location": "locatie of regio focus (of null)",
  "targetAudience": "beschrijving doelgroep",
  "businessType": "winkel|dienstverlener|ambacht|fabrikant|horeca|zorg|juridisch|financieel|onderwijs|overig",
  "audienceType": "B2C|B2B|both",
  "coreActivity": "verkoopt|installeert|adviseert|behandelt|repareert|ontwerpt|maakt|levert|verzorgt"
}

BELANGRIJKE REGELS:
- keywords: geef PRECIES 10 commerciële zoekwoorden die potentiële klanten zouden gebruiken
- Haal zoekwoorden uit: menu-items, diensten-links, H1/H2/H3 koppen, meta beschrijving
- Focus op zoekwoorden die NIET de bedrijfsnaam bevatten
- Denk vanuit de klant: wat zou iemand typen die dit bedrijf zoekt?
- Mix korte (1-2 woorden) en langere (2-4 woorden) zoekwoorden
- services: concrete diensten/producten die het bedrijf aanbiedt (haal uit nav en H2/H3)
- usps: unieke verkoopargumenten
- businessType: kies het MEEST passende type (winkel als ze producten verkopen, dienstverlener als ze diensten leveren, etc.)
- audienceType: B2C als gericht op consumenten, B2B als gericht op bedrijven, both als beide
- coreActivity: wat DOET het bedrijf primair? Een lampenwinkel VERKOOPT, een installateur INSTALLEERT, een advocaat ADVISEERT
- Alles in het Nederlands

Geef ALLEEN de JSON terug, geen extra tekst.`
      }]
    })
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    // Clean and parse JSON
    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }
    
    const analysis = JSON.parse(cleanedText)
    
    return {
      success: true,
      keywords: analysis.keywords || [],
      services: analysis.services || [],
      usps: analysis.usps || [],
      location: analysis.location,
      targetAudience: analysis.targetAudience,
      businessType: analysis.businessType || 'overig',
      audienceType: analysis.audienceType || 'B2B',
      coreActivity: analysis.coreActivity || 'levert',
      rawParsed: parsed
    }
  } catch (error) {
    console.error('❌ Website analysis error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      companyName, 
      companyCategory, 
      identifiedQueriesSummary,
      userId,
      numberOfPrompts = 10,
      customTerms = null,
      customPrompts = null,  // ✨ Pre-made prompts from dashboard edit
      websiteUrl = null,     // ✨ Website URL for smart analysis
      serviceArea = null     // ✨ Servicegebied voor lokale AI-resultaten
    } = body

    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: 'Bedrijfsnaam is verplicht' }, 
        { status: 400 }
      )
    }

    if (companyName.trim().length < 3) {
      return NextResponse.json(
        { error: 'Bedrijfsnaam moet minimaal 3 tekens zijn' }, 
        { status: 400 }
      )
    }

    if (!companyCategory?.trim() || companyCategory.trim().length < 3) {
      return NextResponse.json(
        { error: 'Categorie/branche moet minimaal 3 tekens zijn' }, 
        { status: 400 }
      )
    }

    if (!websiteUrl?.trim()) {
      return NextResponse.json(
        { error: 'Website URL is verplicht' }, 
        { status: 400 }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'

    const supabase = await createServiceClient()

    const scanCheck = await canUserScan(
      supabase,
      userId,
      'ai-visibility',
      ip
    )

    if (!scanCheck.allowed) {
      return NextResponse.json(
        { 
          error: scanCheck.message,
          scansRemaining: scanCheck.scansRemaining || 0,
          cooldownMinutes: scanCheck.cooldownMinutes,
          upgradeAvailable: !userId,
          waitlistEnabled: userId && scanCheck.scansRemaining === 0
        },
        { status: 403 }
      )
    }

    console.log('🤖 Step 1: Preparing AI prompts...')
    
    let generatedPrompts = []
    let websiteAnalysis = null
    let enhancedKeywords = identifiedQueriesSummary || []
    
    // ✨ Analyze website if URL provided (ScraperAPI + Claude)
    if (websiteUrl && websiteUrl.trim()) {
      console.log('🌐 Website URL provided, starting smart analysis...')
      try {
        websiteAnalysis = await analyzeWebsiteForKeywords(websiteUrl, companyName, companyCategory)
        if (websiteAnalysis.success) {
          console.log(`✅ Website analysis complete: ${websiteAnalysis.keywords.length} keywords extracted`)
          
          const userKeywords = (identifiedQueriesSummary || []).filter(k => k && k.trim())
          const websiteKeywords = websiteAnalysis.keywords || []
          
          // Smart priority: users who enter 3+ keywords know what they're doing
          if (userKeywords.length >= 3) {
            // User keywords FIRST (they know their business), website fills gaps
            enhancedKeywords = [...userKeywords]
            websiteKeywords.forEach(kw => {
              if (!enhancedKeywords.some(uk => uk.toLowerCase().trim() === kw.toLowerCase().trim())) {
                enhancedKeywords.push(kw)
              }
            })
            console.log(`📊 User-first merge (${userKeywords.length} user + website fill): ${enhancedKeywords.length} total`)
          } else {
            // Few/no user keywords → website keywords are more reliable
            enhancedKeywords = [...websiteKeywords]
            userKeywords.forEach(kw => {
              if (kw.trim() && !enhancedKeywords.some(wk => wk.toLowerCase().trim() === kw.toLowerCase().trim())) {
                enhancedKeywords.push(kw.trim())
              }
            })
            console.log(`📊 Website-first merge (${websiteKeywords.length} website + ${userKeywords.length} user): ${enhancedKeywords.length} total`)
          }
          
          // Cap at 12 keywords max
          enhancedKeywords = enhancedKeywords.slice(0, 12)
          console.log(`📊 Final enhanced keywords: ${enhancedKeywords.join(', ')}`)
        } else {
          console.log('⚠️ Website analysis failed, using fallback keywords')
        }
      } catch (error) {
        console.error('❌ Website analysis error:', error.message)
        // Continue without website analysis
      }
    } else {
      console.log('ℹ️ No website URL provided, using standard keyword analysis')
    }
    
    // ✨ Use custom prompts if provided (from dashboard edit)
    if (customPrompts && Array.isArray(customPrompts) && customPrompts.length > 0) {
      console.log(`📝 Using ${customPrompts.length} custom prompts from dashboard`)
      generatedPrompts = customPrompts.filter(p => p && p.trim().length > 0)
    } else {
      // Generate prompts with Claude (now with enhanced keywords)
      const promptGenerationResult = await generatePromptsWithClaude(
        companyName,
        companyCategory,
        enhancedKeywords,
        customTerms,
        websiteAnalysis  // Pass website analysis for extra context
      )

      if (!promptGenerationResult.success) {
        return NextResponse.json(
          { error: promptGenerationResult.error },
          { status: 500 }
        )
      }

      generatedPrompts = promptGenerationResult.prompts
    }
    
    // ✨ Admin fast scan mode
    let numberOfPromptsToAnalyze = numberOfPrompts
    if (scanCheck.isAdmin && scanCheck.adminSettings?.fastScanMode) {
      numberOfPromptsToAnalyze = scanCheck.adminSettings.numberOfPrompts
      console.log(`⚡ ADMIN FAST SCAN: Analyzing only ${numberOfPromptsToAnalyze} prompt(s)`)
    }
    
    const analysisLimit = numberOfPromptsToAnalyze
    const promptsToAnalyze = generatedPrompts.slice(0, analysisLimit)
    
    console.log(`🔍 Step 2: Analyzing ${promptsToAnalyze.length} prompts (limit: ${analysisLimit})...`)
    
    const analysisResults = []
    const chatgptResults = []
    let totalCompanyMentions = 0
    let chatgptCompanyMentions = 0

    for (let i = 0; i < promptsToAnalyze.length; i++) {
      const prompt = promptsToAnalyze[i]
      const promptStart = Date.now()
      console.log(`   [${Math.round((promptStart - startTime)/1000)}s] Prompt ${i + 1}/${promptsToAnalyze.length}...`)
      
      // ✨ Run Perplexity + ChatGPT in parallel
      // ChatGPT: 50% van prompts krijgt locatie-context als serviceArea ingevuld
      let chatgptPrompt = prompt
      if (serviceArea && i % 2 === 0 && !prompt.toLowerCase().includes(serviceArea.toLowerCase())) {
        chatgptPrompt = `${prompt} in ${serviceArea}`
      }
      
      const [perplexityResult, chatgptResult] = await Promise.all([
        analyzeWithPerplexity(prompt, companyName),
        analyzeWithChatGPT(chatgptPrompt, companyName, serviceArea)
      ])
      
      // Perplexity result (backwards compatible)
      analysisResults.push({
        ai_prompt: prompt,
        platform: 'perplexity',
        ...(perplexityResult.success ? perplexityResult.data : {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: perplexityResult.error || 'Analyse mislukt',
          error: perplexityResult.error
        })
      })
      
      if (perplexityResult.success && perplexityResult.data.company_mentioned) {
        totalCompanyMentions++
      }

      // ChatGPT result (separate array)
      chatgptResults.push({
        ai_prompt: prompt,
        platform: 'chatgpt',
        ...(chatgptResult.success ? chatgptResult.data : {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: chatgptResult.error || 'ChatGPT analyse mislukt',
          error: chatgptResult.error
        })
      })

      if (chatgptResult.success && chatgptResult.data.company_mentioned) {
        chatgptCompanyMentions++
      }

      const pStatus = perplexityResult.success ? '✅' : '⚠️'
      const cStatus = chatgptResult.success ? '✅' : '⚠️'
      console.log(`   ${pStatus} Perplexity | ${cStatus} ChatGPT — Prompt ${i + 1} (${Math.round((Date.now() - promptStart)/1000)}s) [total: ${Math.round((Date.now() - startTime)/1000)}s]`)

      // Delay tussen prompts voor ChatGPT TPM limiet (6K TPM) — skip na laatste
      if (i < promptsToAnalyze.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    console.log(`✅ Analysis complete. Perplexity: ${totalCompanyMentions}x | ChatGPT: ${chatgptCompanyMentions}x mentioned.`)

    const scanDuration = Date.now() - startTime

    await trackScan(
      supabase,
      userId,
      'ai-visibility',
      ip,
      { companyName, companyCategory, identifiedQueriesSummary },
      { generatedPrompts, analysisResults, chatgptResults, totalCompanyMentions, chatgptCompanyMentions },
      scanDuration
    )

    // ✅ ALSO save to tool_integrations for WOW Dashboard
    if (userId) {
      console.log('📊 Attempting to save to tool_integrations...')
      console.log('Data to insert:', {
        user_id: userId,
        tool_name: 'ai-visibility',
        company_name: companyName,
        prompts_count: generatedPrompts.length,
        total_company_mentions: totalCompanyMentions
      })

      const { data: integrationData, error: integrationError } = await supabase
        .from('tool_integrations')
        .insert({
          user_id: userId,
          tool_name: 'ai-visibility',
          company_name: companyName,
          company_category: companyCategory,
          website: websiteUrl,
          keyword: identifiedQueriesSummary?.[0] || companyCategory,
          commercial_prompts: generatedPrompts,
          prompts_count: generatedPrompts.length,
          results: { perplexity: analysisResults, chatgpt: chatgptResults },
          total_company_mentions: totalCompanyMentions
        })
        .select()

      if (integrationError) {
        console.error('❌ ERROR saving to tool_integrations!')
        console.error('Error code:', integrationError.code)
        console.error('Error message:', integrationError.message)
        console.error('Error details:', integrationError.details)
        console.error('Error hint:', integrationError.hint)
      } else {
        console.log('✅ Successfully saved to tool_integrations!')
        console.log('Inserted data:', integrationData)
      }
    }

    sendSlackNotification({
      companyName,
      companyCategory,
      websiteUrl,
      primaryKeyword: identifiedQueriesSummary?.[0] || null,
      totalMentions: totalCompanyMentions
    }).catch(err => console.error('Slack notificatie fout:', err));

    const updatedCheck = await canUserScan(supabase, userId, 'ai-visibility', ip)

    return NextResponse.json({
      generated_prompts: generatedPrompts,
      analysis_results: analysisResults,
      chatgpt_results: chatgptResults,
      total_company_mentions: totalCompanyMentions,
      chatgpt_company_mentions: chatgptCompanyMentions,
      websiteAnalyzed: websiteAnalysis?.success || false,
      enhancedKeywords: enhancedKeywords,
      meta: {
        scansRemaining: updatedCheck.scansRemaining,
        isAuthenticated: !!userId,
        analysisLimit: analysisLimit,
        scanDurationMs: scanDuration,
        platforms: ['perplexity', 'chatgpt'],
        websiteAnalysis: websiteAnalysis?.success ? {
          url: websiteUrl,
          extractedKeywords: websiteAnalysis.keywords,
          services: websiteAnalysis.services,
          usps: websiteAnalysis.usps,
          businessType: websiteAnalysis.businessType,
          audienceType: websiteAnalysis.audienceType,
          coreActivity: websiteAnalysis.coreActivity
        } : null,
        betaMessage: userId 
          ? `Je hebt nog ${updatedCheck.scansRemaining} scans deze maand!` 
          : `Maak een gratis account voor ${BETA_CONFIG.TOOLS['ai-visibility'].limits.authenticated} scans per maand`
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: 'Server error bij AI-analyse' },
      { status: 500 }
    )
  }
}

// ============================================
// ✨ ULTIMATE PROMPT GENERATION
// Best of Gemini + Claude + Natural Language
// ============================================
async function generatePromptsWithClaude(
  companyName, 
  companyCategory, 
  queries,
  customTerms = null,
  websiteAnalysis = null  // ✨ NEW: Website analysis for better prompts
) {
  const primaryKeyword = queries.length > 0 ? queries[0] : null
  
  // ============================================
  // ✨ WEBSITE CONTEXT (if available)
  // ============================================
  let websiteContext = '';
  if (websiteAnalysis && websiteAnalysis.success) {
    websiteContext = `

**🌐 WEBSITE ANALYSE - GEBRUIK DEZE CONTEXT:**

**DIENSTEN/PRODUCTEN:**
${websiteAnalysis.services?.length > 0 ? websiteAnalysis.services.map(s => `- ${s}`).join('\n') : 'Niet gedetecteerd'}

**UNIQUE SELLING POINTS:**
${websiteAnalysis.usps?.length > 0 ? websiteAnalysis.usps.map(u => `- ${u}`).join('\n') : 'Niet gedetecteerd'}

**DOELGROEP:** ${websiteAnalysis.targetAudience || 'Niet gedetecteerd'}

**BEDRIJFSTYPE:** ${websiteAnalysis.businessType || 'Niet gedetecteerd'}

**DOELGROEP TYPE:** ${websiteAnalysis.audienceType || 'Niet gedetecteerd'}

**KERNACTIVITEIT:** ${websiteAnalysis.coreActivity || 'Niet gedetecteerd'}

**LOCATIE-FOCUS:** ${websiteAnalysis.location || 'Niet specifiek'}

🎯 GEBRUIK deze informatie om RELEVANTERE commerciële vragen te genereren die aansluiten bij wat het bedrijf DAADWERKELIJK aanbiedt.

🚨 **KRITIEK - DOELGROEP BEPAALT HET TYPE VRAGEN:**
${websiteAnalysis.audienceType === 'B2C' ? `
- Dit is een B2C bedrijf → Stel vragen vanuit CONSUMENTEN perspectief
- Gebruik: "Waar kan ik...", "Welke winkels...", "Beste ... voor thuis"
- NIET: "bedrijven die zakelijke oplossingen bieden", "B2B leveranciers"` : 
websiteAnalysis.audienceType === 'B2B' ? `
- Dit is een B2B bedrijf → Stel vragen vanuit ZAKELIJK perspectief
- Gebruik: "bureaus", "dienstverleners", "zakelijke partners"` : `
- Dit bedrijf richt zich op zowel particulieren als bedrijven
- Mix consumentenvragen en zakelijke vragen`}

${websiteAnalysis.businessType === 'winkel' ? `
🛒 **DIT IS EEN WINKEL** → Vragen moeten gaan over KOPEN/KIJKEN, NIET over installeren/adviseren
- ✅ "Waar kan ik goede lampen kopen?" / "Welke verlichtingswinkels..."
- ❌ "Specialisten die ervaring hebben met installeren..." (FOUT - dit is een winkel, geen installateur!)` : ''}

${websiteAnalysis.businessType === 'juridisch' ? `
⚖️ **DIT IS EEN JURIDISCH BEDRIJF** → Gebruik ALTIJD de exacte juridische terminologie uit de zoekwoorden
- Als zoekwoord "advocaat" is → gebruik "advocaat/advocaten/advocatenkantoor"
- ❌ NOOIT vervangen door "juridisch adviseur", "rechtskundige", "jurist" tenzij dat het zoekwoord IS` : ''}

${websiteAnalysis.coreActivity ? `
📌 **KERNACTIVITEIT: ${websiteAnalysis.coreActivity}** → Vragen moeten hierop aansluiten
- Als het bedrijf VERKOOPT → "Waar kan ik ... kopen/bestellen?"
- Als het bedrijf INSTALLEERT → "Welke bedrijven installeren...?"
- Als het bedrijf ADVISEERT → "Welke specialisten adviseren over...?"
- Als het bedrijf BEHANDELT → "Welke klinieken behandelen...?"` : ''}
`;
  }
  
  // ============================================
  // ✨ STRICTER CUSTOM TERMS
  // ============================================
  let customTermsInstruction = '';
  
  if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
    customTermsInstruction = `

**🚨 KRITIEKE GEBRUIKERSINSTRUCTIES - ABSOLUUT VERPLICHT:**
`;

    if (customTerms.exclude?.length > 0) {
      customTermsInstruction += `

**❌ ABSOLUUT VERBODEN - GEBRUIK DEZE WOORDEN NOOIT:**
${customTerms.exclude.map(term => `- "${term}"`).join('\n')}

🚨 KRITIEK: Deze termen zijn STRIKT VERBODEN. Als je ook maar ÉÉN van deze woorden gebruikt, is de output INCORRECT. 
Controleer elke vraag dubbel voordat je antwoordt. GEEN ENKELE vraag mag deze woorden bevatten.

**VOORBEELDEN VAN VERBODEN VRAGEN:**
${customTerms.exclude.slice(0, 3).map(term => 
  `❌ "Welke ${term} bedrijven zijn er?" → FOUT! Bevat verboden woord "${term}"`
).join('\n')}
`;
    }

    if (customTerms.include?.length > 0) {
      customTermsInstruction += `

**✅ VERPLICHT TE GEBRUIKEN - HOGE PRIORITEIT:**
${customTerms.include.map(term => `- "${term}"`).join('\n')}

🎯 DOEL: Minimaal 7 van de 10 vragen MOETEN één of meer van deze termen bevatten.
Dit is een HARDE VEREISTE. Als je minder dan 7 vragen met deze termen hebt, is de output INCORRECT.

**GEBRUIK DEZE TERMEN OP EEN NATUURLIJKE MANIER:**
${customTerms.include.slice(0, 3).map(term => 
  `✅ "Kun je ${term} bedrijven aanbevelen?" → CORRECT! Natuurlijk gebruik
✅ "Welke ${term} specialisten zijn er?" → CORRECT! Natuurlijk geïntegreerd`
).join('\n')}

**NIET ZO (geforceerd):**
❌ "Welke bedrijven bieden ${customTerms.include[0]} diensten?" → TE GEFORCEERD!
❌ "Waar vind ik ${customTerms.include[0]} werk?" → ONNATUURLIJK!
`;
    }

    if (customTerms.location?.length > 0) {
      customTermsInstruction += `

**📍 VERPLICHTE LOCATIE-FOCUS:**
${customTerms.location.map(term => `- "${term}"`).join('\n')}

🚨 KRITIEK: Precies 5 van de 10 vragen MOETEN één van deze EXACTE locatietermen bevatten.
De andere 5 vragen zijn ZONDER locatie (test generieke zichtbaarheid, bijv. "Beste kliniek voor ooglidcorrectie?").

**BELANGRIJKE LOCATIEREGELS:**
- Als gebruiker "Amsterdam" specificeert: ALLEEN Amsterdam gebruiken, GEEN "Nederland"
- Als gebruiker "landelijk actief" specificeert: Dat MAG gebruikt worden
- Als gebruiker GEEN landelijke term specificeert: GEEN brede termen zoals "Nederland", "landelijk"
- Wees SPECIFIEK naar de opgegeven locaties

**VERBODEN LOCATIE-ALTERNATIEVEN:**
${customTerms.location.some(t => t.toLowerCase().includes('amsterdam') || t.toLowerCase().includes('rotterdam') || t.toLowerCase().includes('utrecht') || t.toLowerCase().includes('den haag') || t.toLowerCase().includes('eindhoven')) ? `
❌ "Nederland" - Te breed, gebruiker wil specifieke stad
❌ "landelijk" - Te breed, tenzij expliciet opgegeven
❌ "heel Nederland" - Te breed
❌ "nationale" - Te breed
` : ''}

**CORRECTE LOCATIE VOORBEELDEN:**
${customTerms.location.slice(0, 2).map(term => 
  `✅ "Kun je bedrijven in ${term} aanbevelen?" → CORRECT! Natuurlijk gebruik
✅ "Welke ${term} bedrijven zijn er?" → CORRECT! Specifieke locatie`
).join('\n')}
`;
    }

    customTermsInstruction += `

**🎯 VALIDATIE CHECKLIST (Controleer ELKE vraag):**
${customTerms.exclude?.length > 0 ? `
1. ❌ Bevat GEEN enkele verboden term: ${customTerms.exclude.join(', ')}
` : ''}
${customTerms.include?.length > 0 ? `
2. ✅ Minimaal 7/10 vragen bevatten NATUURLIJK: ${customTerms.include.join(', ')}
` : ''}
${customTerms.location?.length > 0 ? `
3. 📍 Precies 5/10 vragen bevatten EXACT: ${customTerms.location.join(', ')}
   De andere 5 ZONDER locatie (generieke zichtbaarheid)
   (GEEN alternatieven zoals "Nederland" als stad opgegeven is!)
` : ''}

Als je niet aan AL deze eisen voldoet, begin dan OPNIEUW.
`;
  }
  
  // ============================================
  // KEYWORD CONTEXT
  // ============================================
  const searchConsoleContext = queries.length > 0 
    ? `

**🚨 ZOEKWOORDEN - GEBRUIK EXACT DEZE TERMEN:**

**OPGEGEVEN ZOEKWOORDEN:**
${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

**⚠️ KRITIEKE VERDELING - ALLE ZOEKWOORDEN MOETEN TERUGKOMEN:**

🚨 **ABSOLUUT VERBODEN: NOOIT twee verschillende zoekwoorden in één prompt combineren!**
Elke prompt gaat over PRECIES ÉÉN zoekwoord/onderwerp.
❌ "klinieken voor lipoedeem en ooglidcorrectie" → FOUT! Twee onderwerpen!
✅ "klinieken voor lipoedeem" → GOED! Eén onderwerp per prompt
✅ "klinieken voor ooglidcorrectie" → GOED! Apart in andere prompt

${queries.length === 1 ? `
- Alle 10 prompts moeten "${queries[0]}" of een directe variant bevatten
` : queries.length === 2 ? `
- "${queries[0]}": gebruik in 5 prompts
- "${queries[1]}": gebruik in 5 prompts
` : queries.length === 3 ? `
- "${queries[0]}": gebruik in 3-4 prompts
- "${queries[1]}": gebruik in 3-4 prompts
- "${queries[2]}": gebruik in 3 prompts
` : queries.length === 4 ? `
- "${queries[0]}": gebruik in 2-3 prompts
- "${queries[1]}": gebruik in 2-3 prompts
- "${queries[2]}": gebruik in 2-3 prompts
- "${queries[3]}": gebruik in 2-3 prompts
` : `
- Verdeel de 10 prompts EERLIJK over alle ${queries.length} zoekwoorden
- Elk zoekwoord moet minimaal 1x terugkomen
- Het eerste zoekwoord "${queries[0]}" mag maximaal 2-3x voorkomen
`}

**⚠️ GEBRUIK DE EXACTE ZOEKWOORDEN - GEEN ANDERE SYNONIEMEN:**

- "Advocaten" = advocaten, advocatenkantoor, advocaat
- "Advocaten" ≠ rechtsbijstand, juridisch adviseur, notaris (ANDERE BEROEPEN!)
- "SEO specialist" = SEO, zoekmachine-optimalisatie  
- "SEO specialist" ≠ webdesigner, marketeer (ANDERE DIENSTEN!)

**TOEGESTANE VARIATIES:**
- Enkelvoud ↔ meervoud (advocaat ↔ advocaten)
- Met/zonder kantoor/bureau (advocaat ↔ advocatenkantoor)

**VERBODEN:**
- Twee of meer zoekwoorden combineren in één prompt
- Compleet andere beroepsgroepen
- Gerelateerde maar ANDERE diensten
- "Creatieve" synoniemen die de betekenis veranderen`
    : ''

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `Jij genereert commerciële, klantgerichte zoekvragen die gericht zijn op het vinden van **specifieke bedrijven of organisaties** (geen grote consumentenmerken).

${websiteAnalysis?.audienceType === 'B2C' ? `**DOELGROEP: CONSUMENTEN (B2C)**
De vragen worden gesteld vanuit het perspectief van een PARTICULIER/CONSUMENT die een product of dienst zoekt.
Gebruik termen als: winkels, aanbieders, webshops, waar kan ik kopen, beste ... voor thuis.
NIET: zakelijke oplossingen, B2B leveranciers, enterprise.` : 
websiteAnalysis?.audienceType === 'both' ? `**DOELGROEP: CONSUMENTEN + ZAKELIJK**
Mix vragen vanuit particulier EN zakelijk perspectief.` : 
`**DOELGROEP: ZAKELIJK (B2B)**
De vragen worden gesteld vanuit zakelijk perspectief.
Gebruik termen als: bureaus, dienstverleners, leveranciers, partners.`}

**ABSOLUTE PRIORITEITEN:**
1. **NATUURLIJKHEID**: Vragen klinken als ECHTE MENSEN
2. **COMMERCIEEL**: Start idealiter met verzoek om concrete bedrijfsnamen
3. **BEDRIJFSNEUTRAAL**: Vermeld NIET de naam of exacte categorie van het geanalyseerde bedrijf
4. **DOELGROEP-PASSEND**: Vragen passen bij het type klant (consument vs zakelijk)
5. **NEDERLANDS**: ALTIJD en UITSLUITEND Nederlands, GEEN Engels

**VERBODEN:**
- Onnatuurlijk Nederlands (lees elke zin hardop — klinkt het als een echt persoon?)
- "Lijst ... op", "Geef voorbeelden van ..." (robotachtig)
- Geforceerde keyword-combinaties ("SEO specialist diensten")
- Letterlijke zoekwoord-plakking die tot onleesbare zinnen leidt
- Zinnen die grammaticaal niet kloppen
- Vragen die leiden tot algemeen zoekadvies in plaats van bedrijfsnamen
- Vragen over INSTALLEREN als het bedrijf een WINKEL is
- Vragen over ZAKELIJKE OPLOSSINGEN als het bedrijf op consumenten is gericht
- Synoniemen die het beroep VERANDEREN (advocaat → juridisch adviseur)

**VERPLICHT:**
- Vragen die DIRECT om bedrijfsnamen vragen
- Natuurlijke menselijke taal
- Variatie in structuur
- Focus op concrete aanbevelingen
- Vragen die passen bij wat het bedrijf DAADWERKELIJK doet

${customTermsInstruction}`,
      messages: [{
        role: 'user',
        content: `Genereer 10 zeer specifieke, commercieel relevante zoekvragen die een potentiële ${websiteAnalysis?.audienceType === 'B2C' ? 'consument/klant' : websiteAnalysis?.audienceType === 'both' ? 'klant (particulier of zakelijk)' : 'B2B-klant'} zou stellen om **concrete, lokale/nationale bedrijven of leveranciers** te vinden.

**CONTEXT:**
- Bedrijfscategorie: "${companyCategory}"
- Zoek naar bedrijven die vergelijkbare diensten leveren
- Focus op Nederlandse markt
${websiteContext}
**🚨 KRITIEKE REGEL: BEDRIJFSNEUTRALITEIT**
De vragen moeten **algemeen en bedrijfsneutraal** zijn:
- Vermeld NIET de naam "${companyName}"
- Gebruik NIET letterlijk "${companyCategory}" (gebruik synoniemen/variaties)
- Focus op het TYPE dienst/product, niet op specifieke merknamen

${searchConsoleContext}

**🎯 IDEALE START-PATRONEN (gebruik deze als inspiratie):**

Elke vraag moet klinken alsof een ECHT PERSOON het typt in ChatGPT:

${websiteAnalysis?.businessType === 'winkel' ? `
✅ **GOEDE VOORBEELDEN voor WINKELS (B2C):**
- "Waar kan ik goede **[product]** kopen?"
- "Welke **winkels** in [stad] verkopen..."
- "Kun je goede **speciaalzaken** aanbevelen voor..."
- "Wat zijn de beste **webshops** voor..."
- "Welke **winkels** hebben een groot assortiment..."
- "Ken je **winkels** met goede reviews voor..."

❌ FOUT voor winkels: "specialisten die ervaring hebben met installeren" (ze VERKOPEN!)
` : websiteAnalysis?.businessType === 'juridisch' ? `
✅ **GOEDE VOORBEELDEN voor JURIDISCH:**
- "Kun je goede **advocaten** aanbevelen voor..."
- "Welke **advocatenkantoren** hebben ervaring met..."
- "Noem een paar gerenommeerde **advocaten** die..."
- "Welke **advocaat** raad je aan voor..."

❌ FOUT: "juridisch adviseurs" als zoekwoord "advocaat" is (ANDER BEROEP!)
` : websiteAnalysis?.businessType === 'zorg' ? `
✅ **GOEDE VOORBEELDEN voor ZORG:**
- "Welke **klinieken** zijn gespecialiseerd in..."
- "Kun je goede **praktijken** aanbevelen voor..."
- "Welke **behandelaars** hebben ervaring met..."
- "Wat zijn de beste **klinieken** voor..."
` : websiteAnalysis?.audienceType === 'B2C' ? `
✅ **GOEDE VOORBEELDEN (B2C - consumenten):**
- "Waar kan ik goede **[product/dienst]** vinden?"
- "Welke **bedrijven** raad je aan voor..."
- "Kun je goede **aanbieders** aanbevelen voor..."
- "Wat zijn de beste **winkels/bedrijven** voor..."
- "Ken je **bedrijven** met goede reviews voor..."
` : `
✅ **GOEDE VOORBEELDEN (B2B - zakelijk):**
- "Kun je goede **bedrijven** aanbevelen voor..."
- "Welke **specialisten** hebben ervaring met..."
- "Noem een paar gerenommeerde **bedrijven** die..."
- "Welke **leveranciers** raad je aan voor..."
- "Welke **bureaus** hebben veel ervaring met..."
- "Ken je **specialisten** met goede reviews voor..."
- "Wat zijn de beste **aanbieders** voor..."
- "Heb je aanbevelingen voor **bedrijven** die..."
`}

🚨 **TAALKWALITEIT IS CRUCIAAL:**
- Elke zin moet grammaticaal PERFECT Nederlands zijn
- Lees elke vraag hardop — klinkt het natuurlijk? Zo niet, herschrijf!
- NOOIT woorden aan elkaar plakken of zinnen onlogisch combineren
- NOOIT "Lijst ... op" of "Geef voorbeelden van" als opening (te robotachtig)

**🚨 KRITIEK - JUISTE TERMINOLOGIE:**

Kies de JUISTE term op basis van het type bedrijf:

✅ Voor DIENSTVERLENERS (marketing, advies, consulting, IT):
- bureaus, agencies, adviesbureaus

✅ Voor AMBACHTEN (schilders, stukadoors, loodgieters, bouwvakkers):
- bedrijven, vakmensen, specialisten, professionals

✅ Voor WINKELS/RETAIL (gordijnen, meubels, kleding):
- winkels, leveranciers, aanbieders, speciaalzaken

✅ Voor FABRIKANTEN/MAKERS (op maat, custom):
- bedrijven, ateliers, werkplaatsen, makers

❌ NOOIT "bureaus" gebruiken voor:
- Winkels (een gordijnwinkel is GEEN bureau)
- Ambachtslieden (een schilder is GEEN bureau)
- Makers/Ateliers (een meubelmaker is GEEN bureau)

**LET OP:** Gebruik VARIATIE! Wissel af tussen PASSENDE termen:
- bedrijven / specialisten / leveranciers / aanbieders / vakmensen
- Kun je... / Welke... / Noem... / Ken je... / Wat zijn...

❌ **VERMIJD (niet commercieel genoeg of slecht Nederlands):**
- "Waar kan ik vinden..." → Leidt tot zoekadvies, niet bedrijfsnamen
- "Hoe vind ik..." → Zoekadvies in plaats van bedrijven
- "Lijst ... op" → Robotachtig, geen natuurlijk Nederlands
- Vragen die grammaticaal niet kloppen als je ze hardop leest
- Vragen zonder focus op concrete bedrijfsnamen

${customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0) ? `

**🚨 GEBRUIKERSVEREISTEN - TOPPRIORITEIT:**

${customTerms.exclude?.length > 0 ? `
❌ **VERMIJD ABSOLUUT:** ${customTerms.exclude.join(', ')}
` : ''}

${customTerms.include?.length > 0 ? `
✅ **GEBRUIK NATUURLIJK (7+ van 10):** ${customTerms.include.join(', ')}

Voorbeelden:
✅ "Kun je ${customTerms.include[0]} bedrijven aanbevelen..."
✅ "Welke ${customTerms.include[0]} specialisten zijn er..."
❌ "Welke bedrijven bieden ${customTerms.include[0]} diensten..." (geforceerd!)
` : ''}

${customTerms.location?.length > 0 ? `
📍 **LOCATIE (5 van 10):** ${customTerms.location.join(', ')}
De andere 5 prompts ZONDER locatie (generieke zichtbaarheid).

GEBRUIK ALLEEN DEZE EXACTE LOCATIES!
✅ "Kun je bedrijven in ${customTerms.location[0]} noemen..."
❌ "bedrijven in Nederland..." (te breed als stad gegeven!)
` : ''}
` : ''}

**KRITIEKE VEREISTEN:**

1. **Commerciële focus:** Vragen leiden tot concrete bedrijfsnamen
2. **Natuurlijke taal:** Klinkt als echte mensen, geen robot
3. **Bedrijfsneutraal:** Geen "${companyName}" of exacte "${companyCategory}"
4. **Variatie:** Verschillende startwoorden en structuren
5. **B2B gericht:** Dienstverleners, GEEN consumentenmerken (Lego, McDonald's, etc.)
6. **Specifieke zoekintentie:** Focus op vinden van passende aanbieders

**SLUIT EXPLICIET UIT:**
- Zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple, Samsung, Lego, McDonald's, etc.)
- Grote tech-platforms (Google, Facebook, YouTube, Amazon)
- SEO/Marketing tools (Semrush, Ahrefs, Mailchimp)
- Social media platforms
- Zoekmachines

**OUTPUT FORMAAT:**
Exact 10 natuurlijke, commerciële vragen als JSON array.
ALLEEN de array, geen extra tekst.
ALTIJD in het Nederlands, GEEN Engels.

["Vraag 1", "Vraag 2", ..., "Vraag 10"]`
      }]
    })

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const prompts = JSON.parse(cleanedText)

    if (!Array.isArray(prompts) || prompts.length !== 10) {
      throw new Error('Invalid prompt format from AI')
    }

    // ============================================
    // ✅ VALIDATION
    // ============================================
    if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
      const promptsWithExcluded = prompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.exclude?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length
      
      const promptsWithIncluded = prompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.include?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const promptsWithLocation = prompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.location?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const hasForbiddenGeographic = customTerms.location?.some(t => 
        !t.toLowerCase().includes('landelijk') && 
        !t.toLowerCase().includes('nederland') &&
        !t.toLowerCase().includes('nationaal')
      ) ? prompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return lowerPrompt.includes('nederland') || 
               lowerPrompt.includes('belgie') || 
               lowerPrompt.includes('belgië') ||
               (lowerPrompt.includes('landelijk') && !customTerms.location.some(t => t.toLowerCase().includes('landelijk')))
      }).length : 0

      console.log(`✅ Custom terms validation:`)
      console.log(`   - ${promptsWithExcluded}/10 prompts contain excluded terms (target: 0)`)
      if (customTerms.include?.length > 0) {
        console.log(`   - ${promptsWithIncluded}/10 prompts contain included terms (target: 7+)`)
      }
      if (customTerms.location?.length > 0) {
        console.log(`   - ${promptsWithLocation}/10 prompts contain location terms (target: 6+)`)
        console.log(`   - ${hasForbiddenGeographic}/10 prompts contain forbidden geographic terms (target: 0)`)
      }
      
      if (promptsWithExcluded > 0) {
        console.warn(`⚠️ WARNING: ${promptsWithExcluded} prompts contain EXCLUDED terms!`)
      }
      if (customTerms.include?.length > 0 && promptsWithIncluded < 7) {
        console.warn(`⚠️ WARNING: Only ${promptsWithIncluded}/10 prompts contain included terms (target: 7+)`)
      }
      if (customTerms.location?.length > 0 && promptsWithLocation < 6) {
        console.warn(`⚠️ WARNING: Only ${promptsWithLocation}/10 prompts contain location terms (target: 6+)`)
      }
      if (hasForbiddenGeographic > 0) {
        console.warn(`🚨 CRITICAL: ${hasForbiddenGeographic} prompts contain FORBIDDEN geographic terms!`)
      }
    }

    return { success: true, prompts }
  } catch (error) {
    console.error('AI Prompt Generation Error:', error)
    return { success: false, error: 'Fout bij promptgeneratie' }
  }
}

// ============================================
// ✨ ULTIMATE PERPLEXITY - "AI Overview Simulator"
// ============================================
async function analyzeWithPerplexity(prompt, companyName) {
  try {
    const response = await fetch(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: `Jij bent een geavanceerd AI-model getraind op een brede dataset van webcontent, inclusief bedrijfsinformatie, reviews, technische documentatie en compliance.

**JOUW TAAK:**
Simuleer hoe een AI Overview of geavanceerde chatbot zou reageren op de zoekopdracht. Genereer een beknopt, gesimuleerd AI-antwoord als een directe reactie.

**🚨 ABSOLUTE REGELS - GEEN UITZONDERINGEN:**

1. **TAAL: 100% NEDERLANDS**
   - ELKE LETTER moet Nederlands zijn
   - GEEN ENKELE Engelse term
   - GEEN "services", "marketing", "online", "SEO", "website"
   - Gebruik Nederlandse vertalingen: diensten, reclame, internet, zoekmachine-optimalisatie, internetpagina

2. **FOCUS: CONCRETE NEDERLANDSE B2B BEDRIJVEN**
   - Vermeld concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen of specialistische dienstverleners
   - Vermijd algemeen advies over "hoe bedrijven te vinden"
   - Focus op het NOEMEN van specifieke bedrijven/leveranciers

3. **STRIKT VERBODEN TE NOEMEN:**
   ❌ Zeer bekende wereldwijde consumentenmerken:
      Coca-Cola, Nike, Adidas, Apple, Samsung, Lego, McDonald's, etc.
   ❌ Tech-platforms:
      Google (als bedrijf), Facebook, Instagram, YouTube, Amazon, Netflix
   ❌ SEO/Marketing tools:
      Semrush, Ahrefs, Moz, Mailchimp, HubSpot
   ❌ Social media platforms:
      LinkedIn, Twitter/X, TikTok
   ❌ Zoekmachines:
      Google Search, Bing, DuckDuckGo

4. **WEL VERMELDEN:**
   ✅ Nederlandse lokale dienstverleners
   ✅ Regionale specialisten en bedrijven
   ✅ Specialistische B2B-aanbieders
   ✅ Kleinere tot middelgrote bedrijven in Nederland

**EENVOUDIGE INSTRUCTIE (als voor een klein kind):**

Stel je voor dat je een Nederlands kind bent dat bedrijven aanbeveelt:
- Praat ALLEEN in het Nederlands (geen Engels!)
- Noem ALLEEN kleine Nederlandse bedrijven die diensten leveren
- NOEM NOOIT grote merken zoals Lego of McDonald's
- NOEM NOOIT Facebook of Google
- NOEM NOOIT Semrush of andere tools

**VOORBEELD GOED:**
"Er zijn verschillende Nederlandse bedrijven die hierin gespecialiseerd zijn, zoals [Bedrijf X], [Lokaal Bedrijf Y], en [Specialist Z]. Deze bedrijven hebben ervaring met..."

**VOORBEELD FOUT:**
"You can find services at..." ❌ (Engels!)
"Semrush and Ahrefs are great..." ❌ (Tools!)
"Google biedt..." ❌ (Wereldwijd platform!)
"Lego heeft..." ❌ (Consumentenmerk!)

Simuleer een AI Overview die concrete bedrijven noemt!`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Perplexity API error (${response.status}):`, errorText)
      throw new Error(`Perplexity API failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid Perplexity Response:', data)
      throw new Error('Perplexity API error: Invalid response format')
    }

    const rawOutput = data.choices[0].message.content

    if (!rawOutput || rawOutput.trim() === '') {
      console.error('❌ Perplexity returned empty content')
      throw new Error('Perplexity returned empty response')
    }

    const parsed = parseWithJS(rawOutput, companyName)

    return { success: true, data: parsed }
  } catch (error) {
    console.error('❌ Perplexity Error:', error.message || error)
    return { 
      success: false, 
      error: error.message || 'Fout bij AI-analyse',
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: 'Analyse mislukt door API error'
      }
    }
  }
}

// ============================================
// ✨ CHATGPT SEARCH - Real Web Search Results
// ============================================
async function analyzeWithChatGPT(prompt, companyName, serviceArea = null) {
  if (!OPENAI_API_KEY) {
    console.log('⚠️ OpenAI API key niet geconfigureerd, skip ChatGPT')
    return { 
      success: false, 
      error: 'OpenAI API key niet geconfigureerd',
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: 'ChatGPT analyse niet beschikbaar'
      }
    }
  }

  // Build user_location from serviceArea
  const userLocation = {
    type: 'approximate',
    approximate: {
      country: 'NL',
      city: serviceArea || 'Amsterdam'
    }
  }

  try {
    // Single attempt - no retries. Bij 429 skippen we ChatGPT voor deze prompt.
    // Perplexity vangt het op. Dit voorkomt 30s+ retry waits per prompt.
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-search-preview',
          web_search_options: {
            search_context_size: 'low',
            user_location: userLocation
          },
          messages: [
            {
              role: 'system',
              content: `Je bent een behulpzame AI-assistent die zoekvragen beantwoordt in het Nederlands voor gebruikers in Nederland.
De gebruiker bevindt zich in Nederland${serviceArea ? `, regio ${serviceArea}` : ''}. Geef antwoorden specifiek gericht op de Nederlandse markt.
Zoek op het web en geef een beknopt, informatief antwoord met concrete bedrijfsnamen en aanbevelingen die in Nederland actief zijn.
Antwoord ALTIJD in het Nederlands. Focus op het noemen van specifieke Nederlandse bedrijven, dienstverleners of specialisten.
Als je webwinkels, dienstverleners of specialisten noemt, geef dan bij voorkeur Nederlandse bedrijven of bedrijven die actief zijn op de Nederlandse markt.
Vermijd zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple, etc.), tech-platforms (Google, Facebook), en SEO-tools (Semrush, Ahrefs).`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 250
        })
      }
    )

    if (response.status === 429) {
      console.log(`⏳ ChatGPT 429 — skip deze prompt, Perplexity vangt op`)
      return {
        success: false,
        error: 'ChatGPT rate limited — overgeslagen',
        data: {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: 'ChatGPT was tijdelijk niet beschikbaar voor deze prompt (rate limit)'
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ ChatGPT API error (${response.status}):`, errorText)
      throw new Error(`ChatGPT API failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid ChatGPT Response:', data)
      throw new Error('ChatGPT API error: Invalid response format')
    }

    const rawOutput = data.choices[0].message.content

    if (!rawOutput || rawOutput.trim() === '') {
      console.error('❌ ChatGPT returned empty content')
      throw new Error('ChatGPT returned empty response')
    }

    const parsed = parseWithJS(rawOutput, companyName)

    return { success: true, data: parsed }
  } catch (error) {
    console.error('❌ ChatGPT Error:', error.message || error)
    return { 
      success: false, 
      error: error.message || 'Fout bij ChatGPT-analyse',
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: 'ChatGPT analyse mislukt door API error'
      }
    }
  }
}

// ============================================
// ✅ ULTIMATE PARSER - Super Strict
// ============================================
// FAST JS PARSER — vervangt 20x Claude API calls
// company_mentioned + mentions_count waren al regex
// competitors: extract bold/numbered names
// snippet: eerste relevante tekst
// ============================================
function parseWithJS(rawOutput, companyName) {
  try {
    const mentionsCount = (rawOutput.match(new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    const isCompanyMentioned = mentionsCount > 0

    // Extract competitor names from bold text and numbered lists
    const competitors = []
    const seen = new Set()
    const companyLower = companyName.toLowerCase()
    
    // Bekende merken/platforms om uit te sluiten
    const excludeList = new Set([
      'google', 'facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'tiktok',
      'amazon', 'apple', 'microsoft', 'samsung', 'nike', 'adidas', 'coca-cola',
      'semrush', 'ahrefs', 'moz', 'hubspot', 'mailchimp', 'wordpress', 'shopify',
      'whatsapp', 'telegram', 'pinterest', 'reddit', 'bing', 'yahoo',
      'chatgpt', 'openai', 'anthropic', 'perplexity'
    ])

    // Pattern 1: **Bold names**
    const boldPattern = /\*\*([^*]{3,60})\*\*/g
    let match
    while ((match = boldPattern.exec(rawOutput)) !== null) {
      const name = match[1].trim()
        .replace(/\s*[-–—:].*/g, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .trim()
      const nameLower = name.toLowerCase()
      if (
        name.length > 2 && name.length < 50 &&
        !nameLower.includes(companyLower) &&
        !companyLower.includes(nameLower) &&
        !excludeList.has(nameLower) &&
        !nameLower.includes('?') && !nameLower.includes(':') &&
        !nameLower.startsWith('tip') && !nameLower.startsWith('let op') &&
        !nameLower.startsWith('belangrijk') && !nameLower.startsWith('conclusie') &&
        !nameLower.startsWith('samenvatting') && !nameLower.startsWith('opmerking') &&
        !/^(stap|punt|vraag|antwoord|optie|methode|strategie|voordeel|nadeel)\s/i.test(name) &&
        !seen.has(nameLower)
      ) {
        seen.add(nameLower)
        competitors.push(name)
      }
    }

    // Pattern 2: Numbered list items (1. Name - description)
    const numberedPattern = /^\s*(\d+)[\.\)\-]\s*\**([^*\n\(\[]{2,60})/gm
    while ((match = numberedPattern.exec(rawOutput)) !== null) {
      let name = match[2].trim()
        .replace(/\*\*/g, '')
        .replace(/\s*[-–—:].*/g, '')
        .trim()
      const nameLower = name.toLowerCase()
      if (
        name.length > 2 && name.length < 50 &&
        !nameLower.includes(companyLower) &&
        !companyLower.includes(nameLower) &&
        !excludeList.has(nameLower) &&
        !seen.has(nameLower)
      ) {
        seen.add(nameLower)
        competitors.push(name)
      }
    }

    // Snippet: eerste 300 tekens van de response, of context rond bedrijfsnaam
    let snippet = ''
    if (isCompanyMentioned) {
      const textLower = rawOutput.toLowerCase()
      const idx = textLower.indexOf(companyLower)
      if (idx >= 0) {
        const start = Math.max(0, idx - 100)
        const end = Math.min(rawOutput.length, idx + companyName.length + 200)
        snippet = (start > 0 ? '...' : '') + rawOutput.substring(start, end).trim() + (end < rawOutput.length ? '...' : '')
      }
    }
    
    if (!snippet) {
      // Neem eerste zinvolle tekst (skip headers/bullets)
      const lines = rawOutput.split('\n').filter(l => l.trim().length > 30)
      snippet = lines.slice(0, 3).join(' ').substring(0, 400)
      if (rawOutput.length > 400) snippet += '...'
    }

    // Clean markdown uit snippet
    snippet = snippet.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/#{1,4}\s/g, '')

    if (!isCompanyMentioned) {
      snippet = `Het bedrijf "${companyName}" wordt niet genoemd in dit AI-antwoord. ${snippet}`
    }

    return {
      company_mentioned: isCompanyMentioned,
      mentions_count: mentionsCount,
      competitors_mentioned: competitors.slice(0, 10),
      simulated_ai_response_snippet: snippet.substring(0, 600)
    }
  } catch (error) {
    console.error('❌ JS Parser Error:', error)
    return {
      company_mentioned: false,
      mentions_count: 0,
      competitors_mentioned: [],
      simulated_ai_response_snippet: 'Fout bij het analyseren van de AI-respons'
    }
  }
}