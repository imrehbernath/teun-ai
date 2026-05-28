// app/api/ai-visibility-analysis/route.js
// ✅ ULTIMATE VERSION - Best of Gemini + Claude + Natural Questions
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { canUserScan, trackScan, BETA_CONFIG } from '@/lib/beta-config'
import { getOrCreateSessionToken } from '@/lib/session-token'
import { isBlockedUrl, hasNonLatinText, getLanguageBlockError } from '@/lib/language-guard'
import { checkLanguageGate } from '@/lib/language-gate'
import { stripLegalSuffix } from '@/lib/branche-detect'
import { matchesBrand, textMentionsBrand } from '@/lib/rank-scanner'
import { getUserBadge } from '@/lib/slack-badge'
import {
  scrapeWebsite,
  parseHtmlContent,
  analyzeWebsiteForKeywords,
  generatePromptsWithClaude,
  isGarbagePage,
  pickCountryCode,
  fetchViaScraperApi,
} from '@/lib/prompt-engine'

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
    const { companyName, companyCategory, primaryKeyword, totalMentions, websiteUrl, userBadge } = scanData;

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
              text: `*Account:*\n${userBadge || '👤 Anoniem'}`
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
const SERPAPI_KEY = process.env.SERPAPI_KEY
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY


// ============================================
// SCRAPING + PARSING + WEBSITE ANALYSIS
// moved to @/lib/prompt-engine
// ============================================


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
      serviceArea = null,    // ✨ Servicegebied voor lokale AI-resultaten
      locale = 'nl'          // ✨ i18n: 'nl' or 'en'
    } = body

    const isNL = locale === 'nl'

    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: isNL ? 'Bedrijfsnaam is verplicht' : 'Company name is required' }, 
        { status: 400 }
      )
    }

    if (companyName.trim().length < 3) {
      return NextResponse.json(
        { error: isNL ? 'Bedrijfsnaam moet minimaal 3 tekens zijn' : 'Company name must be at least 3 characters' }, 
        { status: 400 }
      )
    }

    // 🚫 Geblokkeerde bedrijfsnamen (misbruik / spam)
    const BLOCKED_COMPANIES = [
      'Lebara',
    ]
    if (BLOCKED_COMPANIES.includes(companyName.trim().toLowerCase())) {
      return NextResponse.json(
        { error: isNL ? 'Er is een probleem opgetreden. Neem contact op via hallo@onlinelabs.nl' : 'An error occurred. Please contact hallo@onlinelabs.nl' },
        { status: 403 }
      )
    }

    if (!companyCategory?.trim() || companyCategory.trim().length < 3) {
      return NextResponse.json(
        { error: isNL ? 'Categorie/branche moet minimaal 3 tekens zijn' : 'Category/industry must be at least 3 characters' }, 
        { status: 400 }
      )
    }

    if (!websiteUrl?.trim()) {
      return NextResponse.json(
        { error: isNL ? 'Website URL is verplicht' : 'Website URL is required' }, 
        { status: 400 }
      )
    }

      // ✅ Valideer domein-extensie
    const urlForTldCheck = websiteUrl.trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0]
      .toLowerCase()

    // Check basic structure
    const tldParts = urlForTldCheck.split('.')
    if (tldParts.length < 2) {
      return NextResponse.json(
        { error: isNL ? 'Vul een geldige website URL in (bijv. voorbeeld.nl)' : 'Enter a valid website URL (e.g. example.com)' },
        { status: 400 }
      )
    }

    const tld = tldParts.pop()

    // Lijst met geldige TLDs (relevant voor NL/EN markt + internationale bedrijven)
    const VALID_TLDS = new Set([
      // Nederlandse + Belgische markt
      'nl', 'be', 'lu',
      // Internationale/algemeen
      'com', 'org', 'net', 'info', 'biz', 'io', 'co', 'me', 'eu',
      // Europese landen
      'de', 'fr', 'es', 'it', 'pt', 'pl', 'se', 'no', 'dk', 'fi', 'at', 'ch', 'ie', 'cz', 'gr', 'hu', 'ro', 'sk', 'si', 'hr', 'bg', 'lt', 'lv', 'ee',
      // UK varianten (in dit geval werkt tldParts, zie check hieronder)
      'uk',
      // Engelssprekende landen
      'us', 'ca', 'au', 'nz',
      // Tech/business
      'app', 'dev', 'tech', 'ai', 'design', 'digital', 'online', 'shop', 'store', 'blog', 'site', 'website', 'agency', 'studio', 'works', 'cloud', 'email', 'media', 'news',
      // Gov/edu
      'gov', 'edu', 'ac',
    ])

    // Check voor multi-part TLDs zoals .co.uk
    const lastTwo = tldParts.length >= 1 ? `${tldParts[tldParts.length - 1]}.${tld}` : ''
    const isValidTld = VALID_TLDS.has(tld) || 
                      (lastTwo === 'co.uk') || 
                      (lastTwo === 'org.uk') || 
                      (lastTwo === 'ac.uk') ||
                      (lastTwo === 'com.au') ||
                      (lastTwo === 'co.nz')

    if (!isValidTld) {
      return NextResponse.json(
        { 
          error: isNL 
            ? `De domeinextensie .${tld} wordt niet ondersteund of bestaat niet. Controleer de URL en probeer opnieuw.`
            : `The domain extension .${tld} is not supported or does not exist. Please check the URL and try again.`
        },
        { status: 400 }
      )
    }

    // Extra check: domeinnaam moet minimaal 1 karakter hebben voor de TLD
    const domainName = tldParts[tldParts.length - 1]
    if (!domainName || domainName.length < 1) {
      return NextResponse.json(
        { error: isNL ? 'Vul een geldige website URL in (bijv. voorbeeld.nl)' : 'Enter a valid website URL (e.g. example.com)' },
        { status: 400 }
      )
    }
    // 🌐 Language guard: block non-NL/EN websites and non-Latin input
    if (isBlockedUrl(websiteUrl)) {
      return NextResponse.json({ error: getLanguageBlockError(locale) }, { status: 400 })
    }
    if (hasNonLatinText(companyName) || hasNonLatinText(companyCategory)) {
      return NextResponse.json({ error: getLanguageBlockError(locale) }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'

    const supabase = await createServiceClient()
    const { sessionToken } = await getOrCreateSessionToken()

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
    
    // ✨ Hardcoded prompts for OnlineLabs demo (GSC-based, optimized for AI visibility)
    const normalizedDomain = (websiteUrl || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
    if (normalizedDomain === 'onlinelabs.nl' || normalizedDomain.startsWith('onlinelabs.nl/')) {
      console.log('🎯 OnlineLabs detected — using GSC-based demo prompts')
      const onlinelabsPrompts = isNL ? [
        'Ik zoek een ervaren SEO bureau in Amsterdam dat ook helpt met vindbaarheid in AI-zoekmachines',
        'Welk SEO bureau in Amsterdam heeft ervaring met zowel traditionele SEO als AI-zichtbaarheid in ChatGPT en Perplexity?',
        'Op zoek naar een SEO specialist in Amsterdam met aantoonbare resultaten en direct contact zonder accountmanager',
        'Welk online marketing bureau in Amsterdam combineert SEO, website snelheid optimalisatie en conversie optimalisatie?',
        'Ik zoek een bureau in Amsterdam dat mijn WordPress website kan optimaliseren voor Google en AI-platforms',
        'Zoek GEO experts in Amsterdam om mijn bedrijf te optimaliseren voor LLM-zichtbaarheid in ChatGPT',
        'Welk bureau in Nederland is gespecialiseerd in generative engine optimization en AI-vindbaarheid?',
        'Ik zoek een bureau om AI optimalisatie te doen voor mijn website zodat ik gevonden word in ChatGPT en Perplexity',
        'Waar vind ik een online marketing bureau in Amsterdam dat gespecialiseerd is in zichtbaarheid in AI-zoekmachines?',
        'Wat is het beste bureau in Amsterdam dat SEO combineert met GEO optimalisatie voor meetbare groei?',
      ] : [
        'Looking for an experienced SEO agency in Amsterdam that also helps with AI search visibility',
        'Which SEO agency in Amsterdam has experience with both traditional SEO and AI visibility in ChatGPT and Perplexity?',
        'Looking for an SEO specialist in Amsterdam with proven results and direct contact without account managers',
        'Which digital marketing agency in Amsterdam combines SEO, website speed optimization and conversion optimization?',
        'I need an agency in Amsterdam to optimize my WordPress website for Google and AI platforms',
        'Find GEO experts in Amsterdam to optimize my business for LLM visibility in ChatGPT',
        'Which agency in the Netherlands specializes in generative engine optimization and AI visibility?',
        'I need an agency to do AI optimization for my website so I get found in ChatGPT and Perplexity',
        'Where can I find a digital marketing agency in Amsterdam specialized in AI search engine visibility?',
        'What is the best agency in Amsterdam that combines SEO with GEO optimization for measurable growth?',
      ]
      generatedPrompts = onlinelabsPrompts.slice(0, numberOfPrompts)
      enhancedKeywords = ['SEO bureau Amsterdam', 'GEO optimalisatie', 'AI-zichtbaarheid', 'WordPress optimalisatie']
      websiteAnalysis = { success: true, keywords: enhancedKeywords, services: ['SEO', 'GEO', 'Webdesign', 'Google Ads'], usps: ['17 jaar ervaring', 'Teun.ai platform'], location: 'Amsterdam', locationExclusive: false, businessType: 'dienstverlener', audienceType: 'B2B', coreActivity: 'adviseert' }
    }
    
    // ✨ Analyze website if URL provided (ScraperAPI + Claude)
    if (!generatedPrompts.length && websiteUrl && websiteUrl.trim()) {
      console.log('🌐 Website URL provided, starting smart analysis...')
      try {
        websiteAnalysis = await analyzeWebsiteForKeywords(websiteUrl, companyName, companyCategory, isNL)
        if (websiteAnalysis?.blocked) {
          return NextResponse.json({ error: websiteAnalysis.blockMessage }, { status: 400 })
        }
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
    if (generatedPrompts.length > 0) {
      console.log(`🎯 Using ${generatedPrompts.length} pre-set prompts (demo/override)`)
    } else if (customPrompts && Array.isArray(customPrompts) && customPrompts.length > 0) {
      console.log(`📝 Using ${customPrompts.length} custom prompts from dashboard`)
      generatedPrompts = customPrompts.filter(p => p && p.trim().length > 0)
    } else {
      // Generate prompts with Claude (now with enhanced keywords)
      const promptGenerationResult = await generatePromptsWithClaude(
        companyName,
        companyCategory,
        enhancedKeywords,
        customTerms,
        websiteAnalysis,  // Pass website analysis for extra context
        isNL              // ✨ i18n
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
        analyzeWithPerplexity(prompt, companyName, isNL, websiteUrl),
        analyzeWithChatGPT(chatgptPrompt, companyName, serviceArea, isNL, websiteUrl)
      ])
      
      // Perplexity result (backwards compatible)
      analysisResults.push({
        ai_prompt: prompt,
        platform: 'perplexity',
        ...(perplexityResult.success ? perplexityResult.data : {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: perplexityResult.error || (isNL ? 'Analyse mislukt' : 'Analysis failed'),
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
          simulated_ai_response_snippet: chatgptResult.error || (isNL ? 'ChatGPT analyse mislukt' : 'ChatGPT analysis failed'),
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
    let savedIntegrationId = null

    await trackScan(
      supabase,
      userId,
      'ai-visibility',
      ip,
      { companyName, companyCategory, identifiedQueriesSummary },
      { generatedPrompts, analysisResults, chatgptResults, totalCompanyMentions, chatgptCompanyMentions },
      scanDuration
    )

    // ✅ Save to tool_integrations — voor ALLE gebruikers (ook anoniem via session_token)
    {
      console.log('📊 Saving to tool_integrations...', {
        user_id: userId || '(anonymous)',
        session_token: sessionToken,
        tool_name: 'ai-visibility',
        company_name: companyName,
        prompts_count: generatedPrompts.length,
        total_company_mentions: totalCompanyMentions
      })

      const { data: integrationData, error: integrationError } = await supabase
        .from('tool_integrations')
        .insert({
          user_id: userId || null,
          session_token: sessionToken,
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
        console.log('✅ Successfully saved to tool_integrations!', userId ? '(authenticated)' : '(anonymous, session_token)')
        console.log('Inserted data:', integrationData)
        // Sla integration_id op zodat we hem in de response kunnen meesturen voor
        // sessionStorage-tracking aan de frontend (selective claim na signup).
        savedIntegrationId = integrationData?.[0]?.id || null
      }
    }

    // Skip Slack voor eigen OnlineLabs demo scans
    if (normalizedDomain !== 'onlinelabs.nl' && !normalizedDomain.startsWith('onlinelabs.nl/')) {
      const userBadge = await getUserBadge(supabase, userId)
      sendSlackNotification({
        companyName,
        companyCategory,
        websiteUrl,
        primaryKeyword: identifiedQueriesSummary?.[0] || null,
        totalMentions: totalCompanyMentions,
        userBadge,
      }).catch(err => console.error('Slack notificatie fout:', err));
    }

    // ✅ Save website + company_name for anonymous scans (for admin leads overview)
    if (!userId && ip !== 'unknown') {
      const { error: anonUpdateError } = await supabase
        .from('anonymous_scans')
        .update({ website: websiteUrl, company_name: companyName })
        .eq('ip_address', ip)
        .eq('tool_name', 'ai-visibility')

      if (anonUpdateError) {
        console.error('⚠️ Anonymous scan update error:', anonUpdateError.message)
      } else {
        console.log('✅ Anonymous scan updated with website + company_name')
      }
    }

    const updatedCheck = await canUserScan(supabase, userId, 'ai-visibility', ip)

    return NextResponse.json({
      generated_prompts: generatedPrompts,
      analysis_results: analysisResults,
      chatgpt_results: chatgptResults,
      total_company_mentions: totalCompanyMentions,
      chatgpt_company_mentions: chatgptCompanyMentions,
      websiteAnalyzed: websiteAnalysis?.success || false,
      enhancedKeywords: enhancedKeywords,
      integrationId: savedIntegrationId,
      meta: {
        scansRemaining: updatedCheck.scansRemaining,
        isAuthenticated: !!userId,
        analysisLimit: analysisLimit,
        scanDurationMs: scanDuration,
        platforms: ['perplexity', 'chatgpt'],
        sessionToken: sessionToken,
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
          ? (isNL ? `Je kunt volgende week weer scannen, of upgrade naar Lite voor onbeperkt.` : `You can scan again next week, or upgrade to Lite for unlimited.`)
          : (isNL ? `Maak een gratis account voor 1 scan per week` : `Create a free account for 1 scan per week`)
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: isNL ? 'Server error bij AI-analyse' : 'Server error during AI analysis' },
      { status: 500 }
    )
  }
}


// ============================================
// generatePromptsWithClaude
// moved to @/lib/prompt-engine
// ============================================


// ============================================
// ✨ ULTIMATE PERPLEXITY - "AI Overview Simulator"
// ============================================
async function analyzeWithPerplexity(prompt, companyName, isNL = true, websiteUrl = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)
  
  try {
    const response = await fetch(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          stream: true,
          web_search_options: {
            search_type: 'auto'
          },
          messages: [
            {
              role: 'system',
              content: isNL 
                ? `Jij bent een geavanceerd AI-model getraind op een brede dataset van webcontent, inclusief bedrijfsinformatie, reviews, technische documentatie en compliance.

**JOUW TAAK:**
Simuleer hoe een AI Overview of geavanceerde chatbot zou reageren op de zoekopdracht. Genereer een beknopt, gesimuleerd AI-antwoord als een directe reactie.

**🚨 ABSOLUTE REGELS:**
1. **TAAL: 100% NEDERLANDS**
2. **FOCUS: CONCRETE NEDERLANDSE B2B BEDRIJVEN** - Vermeld concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen
3. **STRIKT VERBODEN:** Zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple, etc.), Tech-platforms (Google, Facebook, etc.), SEO/Marketing tools (Semrush, Ahrefs, etc.)
4. **WEL VERMELDEN:** Nederlandse lokale dienstverleners, regionale specialisten, kleinere bedrijven

Simuleer een AI Overview die concrete bedrijven noemt!

BELANGRIJK: Sluit ALTIJD af met exact dit blok:

===BEDRIJVEN===
1. Bedrijfsnaam
2. Bedrijfsnaam
3. Bedrijfsnaam
===EINDE BEDRIJVEN===

REGELS VOOR DIT BLOK:
- Zet in dit blok ALLEEN bedrijfsnamen, geen uitleg, geen urls, geen reviews
- Maximaal 10 bedrijven
- Noem alleen concrete bedrijven die in het antwoord voorkomen`
                : `You are an advanced AI model trained on a broad dataset of web content, including business information, reviews, technical documentation and compliance.

**YOUR TASK:**
Simulate how an AI Overview or advanced chatbot would respond to the search query. Generate a concise, simulated AI response as a direct answer.

**🚨 ABSOLUTE RULES:**
1. **LANGUAGE: 100% ENGLISH** — Even if the query contains non-English terms, ALWAYS respond entirely in English. Translate any non-English terms in your response.
2. **FOCUS: CONCRETE BUSINESSES** - Mention concrete, specific small to medium-sized business names
3. **STRICTLY FORBIDDEN:** Very well-known global consumer brands (Coca-Cola, Nike, Apple, etc.), Tech platforms (Google, Facebook, etc.), SEO/Marketing tools (Semrush, Ahrefs, etc.)
4. **DO MENTION:** Local service providers, regional specialists, smaller businesses

Simulate an AI Overview that mentions concrete businesses!

IMPORTANT: ALWAYS end with exactly this block:

===COMPANIES===
1. Company Name
2. Company Name
3. Company Name
===END COMPANIES===

RULES FOR THIS BLOCK:
- In this block include ONLY company names, no explanations, urls or reviews
- Maximum 10 companies
- Only mention concrete businesses that appear in the answer`
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

    // Parse SSE streaming response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let rawOutput = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          const parsed = JSON.parse(payload)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) rawOutput += delta
        } catch (e) {
          // skip unparseable chunks
        }
      }
    }

    if (!rawOutput || rawOutput.trim() === '') {
      console.error('❌ Perplexity returned empty content')
      throw new Error('Perplexity returned empty response')
    }

    const parsed = parsePerplexityOutput(rawOutput, companyName, isNL, websiteUrl)

    return { success: true, data: parsed }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Perplexity timeout after 20s')
      return {
        success: false,
        error: isNL ? 'Perplexity timeout' : 'Perplexity timeout',
        data: {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: isNL ? 'Analyse timeout' : 'Analysis timeout'
        }
      }
    }
    console.error('❌ Perplexity Error:', error.message || error)
    return { 
      success: false, 
      error: error.message || (isNL ? 'Fout bij AI-analyse' : 'Error during AI analysis'),
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: isNL ? 'Analyse mislukt door API error' : 'Analysis failed due to API error'
      }
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// ============================================
// ✨ CHATGPT SEARCH - Real Web Search Results
// ============================================
async function analyzeWithChatGPT(prompt, companyName, serviceArea = null, isNL = true, websiteUrl = null) {
  if (!OPENAI_API_KEY) {
    console.log('⚠️ OpenAI API key niet geconfigureerd, skip ChatGPT')
    return { 
      success: false, 
      error: 'OpenAI API key niet geconfigureerd',
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: isNL ? 'ChatGPT analyse niet beschikbaar' : 'ChatGPT analysis not available'
      }
    }
  }

  // Build user_location from serviceArea
  const userLocation = {
    type: 'approximate',
    approximate: {
      country: isNL ? 'NL' : 'US',
      city: serviceArea || (isNL ? 'Amsterdam' : 'London')
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
          model: 'gpt-5-search-api',
          web_search_options: {
            search_context_size: 'medium',
            user_location: userLocation
          },
          messages: [
            {
              role: 'system',
              content: isNL
                ? `Je bent een behulpzame AI-assistent die zoekvragen beantwoordt in het Nederlands voor gebruikers in Nederland.
De gebruiker bevindt zich in Nederland${serviceArea ? `, regio ${serviceArea}` : ''}. Geef antwoorden specifiek gericht op de Nederlandse markt.
Zoek op het web en geef een beknopt, informatief antwoord met concrete bedrijfsnamen en aanbevelingen die in Nederland actief zijn.
Antwoord ALTIJD in het Nederlands. Focus op het noemen van specifieke Nederlandse bedrijven, dienstverleners of specialisten.
Als je webwinkels, dienstverleners of specialisten noemt, geef dan bij voorkeur Nederlandse bedrijven of bedrijven die actief zijn op de Nederlandse markt.
Vermijd zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple, etc.), tech-platforms (Google, Facebook), en SEO-tools (Semrush, Ahrefs).

BELANGRIJK: Sluit ALTIJD af met exact dit blok:

===BEDRIJVEN===
1. Bedrijfsnaam
2. Bedrijfsnaam
3. Bedrijfsnaam
===EINDE BEDRIJVEN===

REGELS VOOR DIT BLOK:
- Zet in dit blok ALLEEN bedrijfsnamen
- Geen uitleg
- Geen criteria
- Geen urls
- Geen bullets met kosten, voorwaarden, branche of adviespunten
- Minimaal 3 bedrijven als er bedrijven genoemd worden
- Maximaal 10 bedrijven
- Noem alleen concrete bedrijven die in het antwoord voorkomen`
                : `You are a helpful AI assistant answering search queries in English.
The user is looking for businesses${serviceArea ? ` in the ${serviceArea} area` : ''}. Provide answers specifically focused on the relevant market.
Search the web and give a concise, informative answer with concrete business names and recommendations.
ALWAYS respond in English, even if the query contains non-English terms. Translate any non-English terms.
Focus on mentioning specific businesses, service providers or specialists.
Avoid very well-known global consumer brands (Coca-Cola, Nike, Apple, etc.), tech platforms (Google, Facebook), and SEO tools (Semrush, Ahrefs).

IMPORTANT: ALWAYS end with exactly this block:

===COMPANIES===
1. Company Name
2. Company Name
3. Company Name
===END COMPANIES===

RULES FOR THIS BLOCK:
- Include ONLY company names
- No explanations
- No criteria
- No URLs
- No bullets with costs, conditions, industry or advice points
- Minimum 3 companies if companies are mentioned
- Maximum 10 companies
- Only mention concrete businesses that appear in the answer`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_completion_tokens: 600
        })
      }
    )

    if (response.status === 429) {
      console.log(`⏳ ChatGPT 429 — skip deze prompt, Perplexity vangt op`)
      return {
        success: false,
        error: isNL ? 'ChatGPT rate limited — overgeslagen' : 'ChatGPT rate limited — skipped',
        data: {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: isNL ? 'ChatGPT was tijdelijk niet beschikbaar voor deze prompt (rate limit)' : 'ChatGPT was temporarily unavailable for this prompt (rate limit)'
        }
      }
    }
    if (response.status === 400) {
      const errorText = await response.text()
      console.log(`⚠️ ChatGPT 400 Bad Request — skip deze prompt. Error: ${errorText}`)
      return {
        success: false,
        error: isNL ? 'ChatGPT kon deze prompt niet verwerken' : 'ChatGPT could not process this prompt',
        data: {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: isNL 
            ? 'ChatGPT kon deze specifieke zoekvraag niet verwerken' 
            : 'ChatGPT could not process this specific query'
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

    const parsed = parseWithJS(rawOutput, companyName, isNL, websiteUrl)

    return { success: true, data: parsed }
  } catch (error) {
    const isTerminated = error.message === 'terminated' || error.message?.includes('abort')
    if (isTerminated) {
      console.warn('⚠️ ChatGPT connectie afgebroken (server druk), scan gaat verder met Perplexity')
    } else {
      console.error('❌ ChatGPT Error:', error.message || error)
    }
    return { 
      success: false, 
      error: error.message || (isNL ? 'Fout bij ChatGPT-analyse' : 'Error during ChatGPT analysis'),
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: isTerminated
          ? (isNL ? 'ChatGPT server was even overbelast voor deze prompt, scan gaat verder via Perplexity' : 'ChatGPT server was temporarily busy for this prompt, scan continues via Perplexity')
          : (isNL ? 'ChatGPT analyse mislukt door API error' : 'ChatGPT analysis failed due to API error')
      }
    }
  }
}

// ============================================
// ✨ GOOGLE AI MODE - via SerpAPI
// ============================================
async function analyzeWithGoogleAI(prompt, companyName, serviceArea = null, isNL = true) {
  if (!SERPAPI_KEY) {
    return {
      success: false,
      error: 'SERPAPI_KEY niet geconfigureerd',
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: isNL ? 'Google AI niet beschikbaar' : 'Google AI not available'
      }
    }
  }

  // Korte query zoals de Playground — werkt het meest stabiel
  const keywords = prompt
    .replace(/^(Ik zoek|Ik wil|Kun je|Welke|Wat zijn|I'm looking|Can you|Which|What are)[^a-zA-Z]*/i, '')
    .replace(/\?.*$/, '')
    .replace(/\.\s*(Welk|Which|Geef|Give).*$/i, '')
    .trim()
  const area = serviceArea || (isNL ? 'Amsterdam' : 'London')
  const googleQuery = `${keywords} ${area}`.substring(0, 100).trim()

  const params = new URLSearchParams({
    engine: 'google_ai_mode',
    q: googleQuery,
    gl: isNL ? 'nl' : 'uk',
    hl: isNL ? 'nl' : 'en',
    api_key: SERPAPI_KEY,
  })

  try {
    console.log(`   🔍 Google AI Mode: "${googleQuery}"`)

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`)
    const rawText = await response.text()

    if (!response.ok) {
      console.error(`   ❌ Google AI Mode ${response.status}`)
      throw new Error(`Google AI Mode: ${response.status}`)
    }

    const data = JSON.parse(rawText)

    // Extract text from text_blocks + reconstructed_markdown
    const extractTextFromBlocks = (blocks) => {
      let text = ''
      for (const block of blocks || []) {
        if (block.snippet) text += ' ' + block.snippet
        if (block.text) text += ' ' + block.text
        if (Array.isArray(block.list)) {
          for (const item of block.list) {
            if (typeof item === 'string') text += ' ' + item
            else {
              if (item.snippet) text += ' ' + item.snippet
              if (item.text) text += ' ' + item.text
              if (Array.isArray(item.text_blocks)) text += extractTextFromBlocks(item.text_blocks)
            }
          }
        }
        if (Array.isArray(block.text_blocks)) text += extractTextFromBlocks(block.text_blocks)
      }
      return text
    }

    let aiResponse = ''
    if (Array.isArray(data.text_blocks)) aiResponse = extractTextFromBlocks(data.text_blocks)
    if (!aiResponse && data.reconstructed_markdown) aiResponse = data.reconstructed_markdown

    if (!aiResponse) {
      return {
        success: false,
        error: isNL ? 'Geen Google AI antwoord' : 'No Google AI response',
        data: {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: isNL ? 'Google AI Mode gaf geen antwoord' : 'Google AI Mode returned no answer'
        }
      }
    }

    // Use same parser as Perplexity/ChatGPT for consistent output
    const parsed = parseWithJS(aiResponse, companyName, isNL)

    return { success: true, data: parsed }
  } catch (error) {
    console.error(`   ❌ Google AI Mode: ${error.message}`)
    return {
      success: false,
      error: error.message || (isNL ? 'Google AI analyse mislukt' : 'Google AI analysis failed'),
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: isNL ? 'Google AI Mode tijdelijk niet beschikbaar' : 'Google AI Mode temporarily unavailable'
      }
    }
  }
}

// ============================================
// ✨ PERPLEXITY PARSER - Structured block + fallback
// ============================================
function parsePerplexityOutput(rawOutput, companyName, isNL = true, companyDomain = null) {
  try {
    // Gestripte naam voor brand-matching (zie parseWithJS comment).
    const companyStripped = stripLegalSuffix(companyName)
    const searchName = companyStripped && companyStripped !== companyName ? companyStripped : companyName
    const companyLower = (companyStripped || companyName).toLowerCase()
    const escapedCompany = searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    let mentionsCount = (rawOutput.match(new RegExp(`\\b${escapedCompany}\\b`, 'gi')) || []).length
    let isCompanyMentioned = mentionsCount > 0
    if (!isCompanyMentioned && textMentionsBrand(rawOutput, searchName, companyDomain)) {
      isCompanyMentioned = true
      mentionsCount = 1
    }

    const competitors = []
    const seen = new Set()

    const addName = (raw) => {
      let name = raw
        .replace(/^\s*\d+[\.\)]\s*/, '')
        .replace(/^\s*[•\-\*]\s*/, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\*\*/g, '')
        .replace(/[\[\]]/g, '')
        .replace(/\s*[-–—:]\s*.*$/, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (!name || name.length < 2 || name.length > 80) return

      const lower = name.toLowerCase()

      // Alleen echte platforms/tools blokkeren
      const banned = new Set([
        'google', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok',
        'amazon', 'apple', 'microsoft', 'chatgpt', 'openai', 'anthropic', 'perplexity',
        'semrush', 'ahrefs', 'moz', 'hubspot', 'mailchimp', 'wordpress', 'shopify'
      ])

      if (banned.has(lower)) return
      if (seen.has(lower)) return
      // Sluit eigen bedrijf uit, ook varianten met legal suffix.
      if (lower === companyLower) return
      const lowerStripped = stripLegalSuffix(name).toLowerCase()
      if (lowerStripped && lowerStripped === companyLower) return
      if (!/[a-zA-ZÀ-ÿ]/.test(name)) return

      seen.add(lower)
      competitors.push(name)
    }

    // 1. Eerst het gestructureerde bedrijvenblok proberen
    const blockMatch = rawOutput.match(
      /===BEDRIJVEN===([\s\S]*?)===EINDE BEDRIJVEN===|===COMPANIES===([\s\S]*?)===END COMPANIES===/i
    )

    if (blockMatch) {
      const block = (blockMatch[1] || blockMatch[2] || '').trim()
      block
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(addName)
    }

    // 2. Fallback: regex op bold, genummerd, bullets
    if (competitors.length === 0) {
      const lines = rawOutput.split('\n').map(l => l.trim()).filter(Boolean)

      for (const line of lines) {
        // Genummerd: "1. **Bedrijf** - uitleg" of "1. Bedrijf - uitleg"
        let m = line.match(/^\d+[\.\)]\s+\*\*(.+?)\*\*/)
        if (m) { addName(m[1]); continue }
        m = line.match(/^\d+[\.\)]\s+([^*\n]{2,60}?)(?:\s*[-–—:]\s|\s*$)/)
        if (m) { addName(m[1]); continue }

        // Bullets: "- **Bedrijf**: uitleg" of "• Bedrijf: uitleg"
        m = line.match(/^[•\-\*]\s+\*\*(.+?)\*\*/)
        if (m) { addName(m[1]); continue }
        m = line.match(/^[•\-\*]\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.\-\s]{1,50}?)\s*:\s/)
        if (m) { addName(m[1]); continue }

        // Standalone bold
        const boldMatches = [...line.matchAll(/\*\*([A-ZÀ-ÿ][^*]{1,50}?)\*\*/g)]
        for (const bm of boldMatches) addName(bm[1])
      }
    }

    // Strip het blok uit de snippet
    let cleanOutput = rawOutput
      .replace(/===(?:BEDRIJVEN|COMPANIES)===([\s\S]*?)===(?:EINDE BEDRIJVEN|END COMPANIES)===/gi, '')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,4}\s/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    let snippet = ''
    if (isCompanyMentioned) {
      const textLower = cleanOutput.toLowerCase()
      const idx = textLower.indexOf(companyLower)
      if (idx >= 0) {
        const start = Math.max(0, idx - 100)
        const end = Math.min(cleanOutput.length, idx + companyName.length + 200)
        snippet = (start > 0 ? '...' : '') + cleanOutput.substring(start, end).trim() + (end < cleanOutput.length ? '...' : '')
      }
    }

    if (!snippet) {
      snippet = cleanOutput.slice(0, 400)
      if (cleanOutput.length > 400) snippet += '...'
    }

    if (!isCompanyMentioned) {
      snippet = isNL
        ? `Het bedrijf "${companyName}" wordt niet genoemd in dit AI-antwoord. ${snippet}`
        : `The company "${companyName}" is not mentioned in this AI response. ${snippet}`
    }

    const filteredCompetitors = competitors.filter(
      c => !matchesBrand(c, searchName, companyDomain)
    )

    return {
      company_mentioned: isCompanyMentioned,
      mentions_count: mentionsCount,
      competitors_mentioned: filteredCompetitors.slice(0, 10),
      simulated_ai_response_snippet: snippet.substring(0, 600)
    }
  } catch (error) {
    console.error('❌ Perplexity parser error:', error)
    return {
      company_mentioned: false,
      mentions_count: 0,
      competitors_mentioned: [],
      simulated_ai_response_snippet: isNL ? 'Fout bij het analyseren van de Perplexity-respons' : 'Error analyzing the Perplexity response'
    }
  }
}

// ============================================
// ✅ ULTIMATE PARSER - Super Strict (for ChatGPT)
// ============================================
// FAST JS PARSER — vervangt 20x Claude API calls
// company_mentioned + mentions_count waren al regex
// competitors: extract bold/numbered names
// snippet: eerste relevante tekst
// ============================================
function cleanCompetitorName(raw) {
  let name = raw
    // Strip markdown links: [Name](url) → Name
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Strip ALL remaining brackets
    .replace(/[\[\]]/g, '')
    // Strip bare URLs
    .replace(/https?:\/\/\S+/g, '')
    // Strip remaining markdown
    .replace(/\*\*/g, '')
    .replace(/[`_~]/g, '')
    // Strip citation references [1][2]
    .replace(/\[\d+\]/g, '')
    // Strip everything after · (Google Business metadata separator)
    .replace(/\s*·\s*.*/g, '')
    // Strip "(xxx beoordelingen)" and "(xxx reviews)" patterns
    .replace(/\(\d+\s*(?:beoordelingen|reviews?|sterren)\)/gi, '')
    .replace(/\(\s*\d+\s*\)/g, '')  // bare "(141)"
    // Strip Google Business metadata
    .replace(/\b(Nu geopend|Gesloten|UitGesloten|Uit Gesloten|Tijdelijk gesloten|Permanent gesloten)\b/gi, '')
    // Strip Google Business types/categories (comprehensive)
    .replace(/\b(Event planner|Event venue|Event location|Boat rental service|Car rental agency|Travel agency|Insurance agency|Real estate agency|Employment agency|Advertising agency|Wedding venue|Conference center|Party venue|Meeting room|Coworking space|Restaurant|Hotel|Café|Bar|Shop|Store|Winkel|Salon|Kapper|Tandarts|Huisarts|Apotheek|Garage|Makelaar|Notaris|Advocaat|Accountant|Fysiotherapeut|Sportschool|Fitness center|Beauty salon|Hair salon|Day spa|Bakery|Florist|Jeweler|Boutique|Gallery|Museum|Theater|Cinema|Library|School|University|Hospital|Clinic|Pharmacy|Bank|Post office|Supermarket|Gas station|Parking lot|Campground|RV park|Boat dealer|Yacht club|Marina|Diving center|Surf shop|Ski resort|Golf course|Swimming pool|Tennis court|Bowling alley|Amusement park|Zoo|Aquarium|Garden center|Pet store|Veterinarian)\b/gi, '')
    // Strip rating patterns (4.5 ★, 4,5)
    .replace(/\d+[.,]\d+\s*★?/g, '')
    .replace(/★+/g, '')
    // Strip address patterns
    .replace(/[A-Z][a-z]+(?:straat|weg|laan|plein|gracht|kade|singel|dijk|pad)\s*\d+.*/gi, '')
    // Strip postal code patterns (1234 AB)
    .replace(/\d{4}\s*[A-Z]{2}\b/g, '')
    // Strip phone number patterns
    .replace(/\+?\d[\d\s\-]{8,}/g, '')
    // Strip "(uit xxx)" patterns like "(uit 189..."
    .replace(/\(uit\s+\d+.*/gi, '')
    // Strip leading/trailing separators and whitespace
    .replace(/^[\s·•\-–—:,;|()\[\]]+/, '')
    .replace(/[\s·•\-–—:,;|()\[\]]+$/, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
  
  return name
}

function isValidCompetitorName(name, companyLower, excludeList, seen) {
  const nameLower = name.toLowerCase()
  const wordCount = name.split(/\s+/).length
  return (
    // Min 4 chars (filters "Uit", "De", "Het", etc.)
    name.length >= 4 && name.length < 50 &&
    // Max 6 words (filters sentences like "Aanbevolen Nederlandse specialisten uit Muiden")
    wordCount <= 6 &&
    // Not the company itself
    !nameLower.includes(companyLower) &&
    !companyLower.includes(nameLower) &&
    // Not a known platform/brand
    !excludeList.has(nameLower) &&
    // Not a duplicate
    !seen.has(nameLower) &&
    // Not a question or generic label
    !nameLower.includes('?') &&
    // Not a generic heading/phrase (NL + EN)
    !/^(tip|let op|belangrijk|conclusie|samenvatting|opmerking|aanbevolen|overzicht|vergelijk|alternatief|optie|keuze|note|important|conclusion|summary|recommended|overview|compare|alternative|option|choice)/i.test(name) &&
    !/^(stap|punt|vraag|antwoord|optie|methode|strategie|voordeel|nadeel|step|point|question|answer|method|strategy|advantage|disadvantage)\s/i.test(name) &&
    // Not section headers from AI responses
    !/^(waar je op|goede opties|alternatieven|waarom deze|tips voor|hoe je|wat je|wanneer je|let hierop|onze aanbeveling|ons advies|meer informatie|verder lezen|bronnen|sources|references|see also|read more|further reading)\s/i.test(name) &&
    // Niet typische label-fragmenten ("Past goed als", "Waarom interessant voor jou", "Past op")
    !/^(past goed|waarom interessant|waarom kies|waarom is|wat maakt|hoe deze|kortom|tot slot|samengevat|opmerking)\b/i.test(name) &&
    // Niet categorische combinatie met "/" (bv. "AI-zoekmachines / AI-visibility").
    // & blijft toegestaan: zit vaak in bedrijfsnamen ("Sinck & Ko", "Jansen & Partners").
    !/\s\/\s/.test(name) &&
    // Not Dutch instructions, actions, or descriptive headings
    !/^(documenteer|waarschuw|controleer|check|bekijk|overweeg|neem|zoek|bel|mail|schrijf|vraag|meld|maak|gebruik|vermijd|kies|vergelijk|probeer|start|stop|lees|ga naar|schakel|stel|plan|regel|evalueer|analyseer|optimaliseer|beoordeel|onderzoek|bespreek|registreer|download|upload|installeer|configureer|activeer|deactiveer)\s/i.test(name) &&
    // Not Dutch generic descriptive phrases (common patterns in AI responses)
    !/^(gevestigde|aanbevelingen|mogelijke|beschikbare|populaire|relevante|belangrijke|lokale|professionele|ervaren|gekwalificeerde|betrouwbare|onafhankelijke|erkende|gecertificeerde|specialistische|juridische|medische|technische|financiële|commerciële|industriële|algemene|specifieke|directe|indirecte|formele|informele|wettelijke|verplichte|vrijwillige|preventieve|curatieve|alternatieve|aanvullende|gerechtelijke|buitengerechtelijke|goede|beste|mogelijke|verschillende|overige|verdere|concrete|praktische|nuttige|handige|interessante|geschikte|bekende|nieuwe|andere)\s/i.test(name) &&
    // Not Dutch compound descriptive phrases
    !/^(mediation|arbitrage|procedure|behandeling|aanpak|oplossing|werkwijze|benadering|uitkomst|resultaat|gevolg|oorzaak|reden|advies|hulp|steun|begeleiding|ondersteuning|bemiddeling|tussenkomst|interventie|handhaving|toezicht|controle|inspectie|onderzoek|analyse|rapportage|evaluatie|beoordeling)\s+(of|en|voor|bij|van|met|door|tegen|over|na|om|in|uit|op|aan|tot|naar)\s/i.test(name) &&
    // Not a sentence (starts with common sentence starters NL + EN)
    !/^(dit|deze|dat|die|er|het|de|een|als|voor|naar|van|met|bij|wat|wie|waar|wanneer|hoe|welke|enkele|diverse|hier|ook|meer|nog|veel|alle|andere|sommige|this|that|these|those|the|a|an|if|for|to|from|with|at|what|who|where|when|how|which|some|here|also|more|still|many|all|other|there|it|they|we|you|i)\s/i.test(name) &&
    // Not just a business type, status word, or generic term (NL + EN)
    !/^(gesloten|nu geopend|event planner|event venue|boat rental|car rental|restaurant|hotel|bruine vloot|zeilvloot|beoordelingen?|reviews?|closed|now open|currently open|advertising agency)$/i.test(name) &&
    // Not a bare review/rating fragment
    !/^\(\d+/.test(name) &&
    !/beoordelingen\)?$/i.test(name) &&
    !/reviews?\)?$/i.test(name) &&
    // Must contain at least one letter
    /[a-zA-Z]/.test(name) &&
    // Must start with a capital letter or number (company names do)
    /^[A-Z0-9]/.test(name) &&
    // Not a bare URL fragment
    !nameLower.startsWith('http') &&
    !nameLower.startsWith('www.') &&
    // Not ending with .nl or .com (domain, not company name)
    !/\.(nl|com|org|net|be|de|eu)$/i.test(name) &&
    // Not a service/skill description (not a company name)
    !/^(seo|sea|cro|ppc|geo|smm|sem)\s/i.test(name) &&
    !/\b(optimalisatie|optimization|specialist|bureau|agency|strategie|strategy|marketing|analyse|analysis|advies|consultancy)\s*$/i.test(name) &&
    // Not just a city name or "in [city]" pattern
    !/^(amsterdam|rotterdam|utrecht|den haag|eindhoven|groningen|haarlem|leiden|arnhem|nijmegen|breda|tilburg|almere|amersfoort|hilversum|delft|dordrecht|zoetermeer|zwolle|deventer|enschede|apeldoorn)$/i.test(name) &&
    // Not containing only generic Dutch words (no proper noun detected)
    !/^[a-z\s\-]+$/.test(name)
  )
}

function parseWithJS(rawOutput, companyName, isNL = true, companyDomain = null) {
  try {
    // "Rkassa B.V." matchen tegen "Rkassa" in tekst: zoek op gestripte naam als die
    // verschilt, anders op originele. companyLower (voor competitor-exclude) ook
    // gebaseerd op gestripte naam, zodat "Rkassa" niet als concurrent verschijnt
    // wanneer userName "Rkassa B.V." is.
    const companyStripped = stripLegalSuffix(companyName)
    const searchName = companyStripped && companyStripped !== companyName ? companyStripped : companyName
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Mention detection: eerst harde word-boundary count (voor mentions_count),
    // dan textMentionsBrand voor word-order varianten ("Easydriving Rijschool"
    // i.p.v. "Rijschool Easydriving"). Bij brand-match maar geen exact-count
    // forceren we count = 1.
    let mentionsCount = (rawOutput.match(new RegExp(`\\b${escape(searchName)}\\b`, 'gi')) || []).length
    let isCompanyMentioned = mentionsCount > 0
    if (!isCompanyMentioned && textMentionsBrand(rawOutput, searchName, companyDomain)) {
      isCompanyMentioned = true
      mentionsCount = 1
    }

    // Pre-clean: resolve markdown links in the raw output for pattern matching
    const cleanedOutput = rawOutput.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Fully stripped: no links, no bold, no brackets — for plain text patterns
    const plainOutput = cleanedOutput.replace(/\*\*/g, '').replace(/[\[\]]/g, '')

    // Extract competitor names from bold text and numbered lists
    const competitors = []
    const seen = new Set()
    const companyLower = (companyStripped || companyName).toLowerCase()
    
    // Bekende merken/platforms om uit te sluiten
    const excludeList = new Set([
      'google', 'facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'tiktok',
      'amazon', 'apple', 'microsoft', 'samsung', 'nike', 'adidas', 'coca-cola',
      'semrush', 'ahrefs', 'moz', 'hubspot', 'mailchimp', 'wordpress', 'shopify',
      'whatsapp', 'telegram', 'pinterest', 'reddit', 'bing', 'yahoo',
      'chatgpt', 'openai', 'anthropic', 'perplexity',
      // Steden
      'nederland', 'netherlands', 'amsterdam', 'rotterdam', 'den haag', 'the hague',
      'utrecht', 'eindhoven', 'groningen', 'maastricht', 'breda', 'tilburg', 'almere',
      'arnhem', 'nijmegen', 'haarlem', 'leiden', 'delft', 'dordrecht', 'zoetermeer',
      'zwolle', 'deventer', 'enschede', 'apeldoorn', 'amersfoort', 'hilversum',
      'noord-holland', 'zuid-holland', 'brabant', 'gelderland', 'overijssel', 'friesland',
      // Service/skill termen (geen bedrijfsnamen)
      'seo', 'seo specialist', 'seo bureau', 'seo agency',
      'online marketing', 'online marketing bureau', 'digital marketing',
      'webdesign', 'webdesign bureau', 'web development', 'webdevelopment',
      'conversie optimalisatie', 'conversion optimization', 'cro',
      'linkbuilding', 'link building', 'content marketing', 'social media marketing',
      'google ads', 'sea', 'ppc', 'email marketing', 'e-mail marketing',
      'website laten maken', 'website bouwen', 'website ontwerp',
      'zoekmachine optimalisatie', 'search engine optimization',
      'geo', 'geo optimalisatie', 'ai visibility', 'ai zichtbaarheid',
      'ai-visibility', 'ai-zichtbaarheid', 'ai-zoekmachines', 'ai zoekmachines',
      'ai-platform', 'ai platform', 'ai seo',
      'website', 'internet marketing service',
      'past goed als', 'waarom interessant voor jou',
    ])

    let match

    // Helper: clean + validate + push (gebruikt door block-parser en patterns)
    const addCompetitor = (raw) => {
      const name = cleanCompetitorName(raw)
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/\s*[-–—:].*/g, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim()

      if (isValidCompetitorName(name, companyLower, excludeList, seen)) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    }

    // Pattern 0: gestructureerd ===BEDRIJVEN===-blok (afgedwongen via system prompt).
    // Als het blok 1+ namen oplevert, vertrouwen we het en slaan de regex-fallback
    // over zodat criteria-bullets zoals "**Kosten:**" niet als bedrijven verschijnen.
    const blockMatch = rawOutput.match(
      /===BEDRIJVEN===([\s\S]*?)===EINDE BEDRIJVEN===|===COMPANIES===([\s\S]*?)===END COMPANIES===/i
    )

    if (blockMatch) {
      const block = (blockMatch[1] || blockMatch[2] || '').trim()
      block
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(addCompetitor)
    }

    // Fallback: alleen draaien als het gestructureerde blok niets opleverde.
    if (competitors.length === 0) {
      // Pattern 1: **Bold names** (on cleaned output without markdown links)
      const boldPattern = /\*\*([^*]{3,60})\*\*/g
      while ((match = boldPattern.exec(cleanedOutput)) !== null) {
        // Skip criteria-bullets: "**Kosten:** uitleg" of "**Kosten** : uitleg"
        const afterBold = cleanedOutput.slice(match.index + match[0].length, match.index + match[0].length + 5)
        if (/^\s*:/.test(afterBold) || /:\s*$/.test(match[1])) {
          continue
        }
        const name = cleanCompetitorName(match[1])
          .replace(/\s*[-–—:].*/g, '')  // Remove description after dash/colon
          .replace(/^\d+[\.\)]\s*/, '')  // Remove leading number
          .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parenthetical like "(OMA)"
          .trim()

        if (isValidCompetitorName(name, companyLower, excludeList, seen)) {
          seen.add(name.toLowerCase())
          competitors.push(name)
        }
      }

      // Pattern 2: Numbered list items (1. Name - description) — on plain text
      const numberedPattern = /^\s*(\d+)[\.\)\-]\s*([^*\n]{2,80})/gm
      while ((match = numberedPattern.exec(plainOutput)) !== null) {
        let name = cleanCompetitorName(match[2])
          .replace(/\s*[-–—:].*/g, '')  // Remove description after dash
          .trim()

        if (isValidCompetitorName(name, companyLower, excludeList, seen)) {
          seen.add(name.toLowerCase())
          competitors.push(name)
        }
      }

      // Pattern 3: Bullet items with bold name + colon (Perplexity style)
      // Matches: "- **CompanyName:** description" or "• **CompanyName**: description"
      const bulletBoldPattern = /^[\s]*[•\-\*]\s+\*\*([^*]{2,60}?)\*\*\s*:?\s/gm
      while ((match = bulletBoldPattern.exec(rawOutput)) !== null) {
        // Skip criteria-bullets: "- **Kosten:** uitleg" of "- **Kosten** : uitleg"
        const afterBold = rawOutput.slice(match.index + match[0].length, match.index + match[0].length + 5)
        if (/^\s*:/.test(afterBold) || /:\s*$/.test(match[1])) {
          continue
        }
        const name = match[1].replace(/\s*:$/, '').trim()
        if (isValidCompetitorName(name, companyLower, excludeList, seen)) {
          seen.add(name.toLowerCase())
          competitors.push(name)
        }
      }

      // Pattern 4: Bullet items without bold: "- CompanyName: description" (starts with Capital)
      const bulletPlainPattern = /^[\s]*[•\-\*]\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ0-9&'.\-\s]{1,50}?)\s*:\s+\S/gm
      while ((match = bulletPlainPattern.exec(plainOutput)) !== null) {
        const name = match[1].trim()
        if (isValidCompetitorName(name, companyLower, excludeList, seen)) {
          seen.add(name.toLowerCase())
          competitors.push(name)
        }
      }

      // Pattern 5: "CompanyName: description" at start of line (no bullet, starts with Capital)
      const colonPattern = /^([A-ZÀ-Ÿ][A-Za-zÀ-ÿ0-9&'.\-\s]{2,50}?)\s*:\s+[a-z]/gm
      while ((match = colonPattern.exec(plainOutput)) !== null) {
        const name = match[1].trim()
        // Extra check: skip section headers (usually longer and more generic)
        if (name.split(/\s+/).length <= 5 && isValidCompetitorName(name, companyLower, excludeList, seen)) {
          seen.add(name.toLowerCase())
          competitors.push(name)
        }
      }
    }

    // Snippet: eerste 300 tekens van de response, of context rond bedrijfsnaam.
    // Strip eerst het ===BEDRIJVEN===-blok zodat het niet in de UI-snippet komt.
    const snippetSource = rawOutput
      .replace(/===(?:BEDRIJVEN|COMPANIES)===[\s\S]*?===(?:EINDE BEDRIJVEN|END COMPANIES)===/gi, '')
      .trim()
    let snippet = ''
    if (isCompanyMentioned) {
      const textLower = snippetSource.toLowerCase()
      const idx = textLower.indexOf(companyLower)
      if (idx >= 0) {
        const start = Math.max(0, idx - 100)
        const end = Math.min(snippetSource.length, idx + companyName.length + 200)
        snippet = (start > 0 ? '...' : '') + snippetSource.substring(start, end).trim() + (end < snippetSource.length ? '...' : '')
      }
    }

    if (!snippet) {
      // Neem eerste zinvolle tekst (skip headers/bullets)
      const lines = snippetSource.split('\n').filter(l => l.trim().length > 30)
      snippet = lines.slice(0, 3).join(' ').substring(0, 400)
      if (snippetSource.length > 400) snippet += '...'
    }

    // Clean markdown uit snippet
    snippet = snippet
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,4}\s/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!isCompanyMentioned) {
      snippet = isNL ? `Het bedrijf "${companyName}" wordt niet genoemd in dit AI-antwoord. ${snippet}` : `The company "${companyName}" is not mentioned in this AI response. ${snippet}`
    }

    // Filter eigen merk uit de concurrenten via gedeelde matchesBrand
    // (handelt word-order, normalisatie en word-overlap af zodat varianten
    // als "Easydriving Rijschool Den Haag" niet als concurrent verschijnen
    // wanneer brand "Rijschool Easydriving" is).
    const filteredCompetitors = competitors.filter(
      c => !matchesBrand(c, searchName, companyDomain)
    )

    return {
      company_mentioned: isCompanyMentioned,
      mentions_count: mentionsCount,
      competitors_mentioned: filteredCompetitors.slice(0, 10),
      simulated_ai_response_snippet: snippet.substring(0, 600)
    }
  } catch (error) {
    console.error('❌ JS Parser Error:', error)
    return {
      company_mentioned: false,
      mentions_count: 0,
      competitors_mentioned: [],
      simulated_ai_response_snippet: isNL ? 'Fout bij het analyseren van de AI-respons' : 'Error analyzing AI response'
    }
  }
}