// app/api/ai-visibility-analysis/route.js
// ✅ ULTIMATE VERSION - Best of Gemini + Claude + Natural Questions
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { canUserScan, trackScan, BETA_CONFIG } from '@/lib/beta-config'
import { getOrCreateSessionToken } from '@/lib/session-token'

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
// ✨ WEBSITE SCRAPING - Direct fetch first, ScraperAPI fallback
// ============================================
function isGarbagePage(html) {
  const htmlLower = html.toLowerCase()
  const garbageSignals = [
    'checking your browser', 'just a moment', 'verify you are human',
    'cf-browser-verification', 'challenge-platform', '_cf_chl',
    'attention required', 'ddos protection', 'security check',
    'checking if the site connection is secure', 'please turn javascript on',
    'access denied', 'bot protection', 'are you a robot',
    'domain is parked', 'this domain is for sale', 'buy this domain',
    'under construction', 'coming soon', 'website binnenkort beschikbaar',
  ]
  if (garbageSignals.some(s => htmlLower.includes(s))) return true
  const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').trim()
  if (bodyText.length < 300) return true
  return false
}

async function scrapeWebsite(url) {
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }
  
  const urlObj = new URL(normalizedUrl)
  const hasWww = urlObj.hostname.startsWith('www.')
  const wwwUrl = hasWww ? normalizedUrl : normalizedUrl.replace('://', '://www.')

  // ── Attempt 1: Direct fetch (FREE, no ScraperAPI credits) ──
  for (const tryUrl of [normalizedUrl, wwwUrl]) {
    try {
      console.log(`🌐 Direct fetch: ${tryUrl}`)
      const response = await fetch(tryUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const html = await response.text()
        if (!isGarbagePage(html) && html.length > 500) {
          console.log(`✅ Direct fetch OK: ${tryUrl} (${html.length} chars)`)
          return { success: true, html }
        }
      }
    } catch (error) {
      console.log(`⚠️ Direct fetch failed for ${tryUrl}: ${error.message}`)
    }
  }

  // ── Attempt 2: ScraperAPI premium directly (25 credits, highest success rate) ──
  for (const tryUrl of [normalizedUrl, wwwUrl]) {
    try {
      console.log(`🔗 ScraperAPI premium: ${tryUrl}`)
      const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(tryUrl)}&render=true&premium=true&country_code=nl`
      
      const response = await fetch(scraperUrl, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(30000)
      })
      
      if (response.ok) {
        const html = await response.text()
        if (!isGarbagePage(html)) {
          console.log(`✅ ScraperAPI premium OK: ${tryUrl} (${html.length} chars)`)
          return { success: true, html }
        }
      } else {
        console.log(`⚠️ ScraperAPI premium HTTP ${response.status} for ${tryUrl}`)
      }
    } catch (error) {
      console.log(`⚠️ ScraperAPI premium failed for ${tryUrl}: ${error.message}`)
    }
  }

  console.log(`❌ All scrape attempts failed for ${normalizedUrl}`)
  return { success: false, error: 'Website kon niet gescraped worden' }
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
async function analyzeWebsiteForKeywords(websiteUrl, companyName, companyCategory, isNL = true) {
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
      system: isNL 
        ? `Je bent een expert in het analyseren van websites voor zoekwoord-extractie en commerciële intentie.
Je analyseert websites om te begrijpen:
1. Welke diensten/producten het bedrijf aanbiedt
2. Wat hun USPs (unique selling points) zijn
3. Welke zoekwoorden potentiële klanten zouden gebruiken
4. Welke locatie-focus ze hebben

Let EXTRA op menu-items en navigatie — daar staan vaak de kernactiviteiten.
Diensten-pagina's en H3-koppen bevatten vaak de beste zoekwoorden.

Antwoord ALTIJD in het Nederlands. Wees CONCREET en SPECIFIEK.`
        : `You are an expert at analyzing websites for keyword extraction and commercial intent.
You analyze websites to understand:
1. What services/products the company offers
2. What their USPs (unique selling points) are
3. What keywords potential customers would use
4. What their geographic focus is

Pay EXTRA attention to menu items and navigation — core activities are often listed there.
Service pages and H3 headings often contain the best keywords.

ALWAYS respond in English. Be CONCRETE and SPECIFIC.

CRITICAL: The website content may be in a non-English language (e.g., Dutch, German, French).
You MUST translate ALL keywords, services, and USPs to their ENGLISH equivalents.
Examples: "zoekmachineoptimalisatie" → "SEO", "Google Ads beheer" → "Google Ads management",
"webdesign bureau" → "web design agency", "linkbuilding" → "link building".
Use the terms that English-speaking customers would actually search for.`,
      messages: [{
        role: 'user',
        content: isNL 
          ? `Analyseer deze website-informatie voor "${companyName}" (branche: ${companyCategory}):

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
          : `Analyze this website information for "${companyName}" (industry: ${companyCategory}):

**META TITLE:** ${parsed.title || 'Not found'}

**META DESCRIPTION:** ${parsed.metaDescription || 'Not found'}

**H1 HEADINGS:** ${parsed.h1s.length > 0 ? parsed.h1s.join(' | ') : 'Not found'}

**H2 HEADINGS:** ${parsed.h2s.length > 0 ? parsed.h2s.join(' | ') : 'Not found'}

**H3 HEADINGS:** ${parsed.h3s?.length > 0 ? parsed.h3s.join(' | ') : 'Not found'}

**NAVIGATION/MENU ITEMS:** ${parsed.navItems?.length > 0 ? parsed.navItems.join(' | ') : 'Not found'}

**SERVICE/PRODUCT LINKS:** ${parsed.serviceLinks?.length > 0 ? parsed.serviceLinks.join(' | ') : 'Not found'}

**PAGE CONTENT (excerpt):** ${parsed.bodyContent.slice(0, 1500)}

---

Provide your analysis in EXACTLY this JSON format:

{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
  "services": ["service1", "service2", "service3"],
  "usps": ["usp1", "usp2"],
  "location": "location or region focus (or null)",
  "targetAudience": "target audience description",
  "businessType": "shop|service_provider|craft|manufacturer|hospitality|healthcare|legal|financial|education|other",
  "audienceType": "B2C|B2B|both",
  "coreActivity": "sells|installs|advises|treats|repairs|designs|makes|delivers|provides"
}

IMPORTANT RULES:
- keywords: provide EXACTLY 10 commercial keywords that potential customers would use
- Extract keywords from: menu items, service links, H1/H2/H3 headings, meta description
- Focus on keywords that do NOT contain the company name
- Think from the customer's perspective: what would someone type when looking for this business?
- Mix short (1-2 words) and longer (2-4 words) keywords
- services: concrete services/products the company offers (extract from nav and H2/H3)
- usps: unique selling points
- businessType: choose the MOST fitting type
- audienceType: B2C if consumer-facing, B2B if business-facing, both if applicable
- coreActivity: what does the company primarily DO? A lamp shop SELLS, an installer INSTALLS, a lawyer ADVISES
- Everything in English
- CRITICAL: If the website is in another language, TRANSLATE all keywords to English equivalents that English-speaking searchers would use

Return ONLY the JSON, no additional text.`
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

    // ✅ Valideer domein-extensie (TLD moet minimaal 2 tekens zijn, bijv. .nl of .com)
    const urlForTldCheck = websiteUrl.trim()
      .replace(/^https?:\/\//i, '')  // Alleen voor validatie, websiteUrl blijft ongewijzigd
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0]
    const tld = urlForTldCheck.split('.').pop()
    if (!tld || tld.length < 2) {
      return NextResponse.json(
        { error: isNL ? 'Vul een geldige website URL in met een correcte domeinextensie (bijv. .nl of .com)' : 'Enter a valid website URL with a correct domain extension (e.g. .com or .co.uk)' },
        { status: 400 }
      )
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
    
    // ✨ Analyze website if URL provided (ScraperAPI + Claude)
    if (websiteUrl && websiteUrl.trim()) {
      console.log('🌐 Website URL provided, starting smart analysis...')
      try {
        websiteAnalysis = await analyzeWebsiteForKeywords(websiteUrl, companyName, companyCategory, isNL)
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
        analyzeWithPerplexity(prompt, companyName, isNL),
        analyzeWithChatGPT(chatgptPrompt, companyName, serviceArea, isNL)
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
      }
    }

    sendSlackNotification({
      companyName,
      companyCategory,
      websiteUrl,
      primaryKeyword: identifiedQueriesSummary?.[0] || null,
      totalMentions: totalCompanyMentions
    }).catch(err => console.error('Slack notificatie fout:', err));

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
          ? (isNL ? `Je hebt nog ${updatedCheck.scansRemaining} scans deze maand!` : `You have ${updatedCheck.scansRemaining} scans remaining this month!`)
          : (isNL ? `Maak een gratis account voor ${BETA_CONFIG.TOOLS['ai-visibility'].limits.authenticated} scans per maand` : `Create a free account for ${BETA_CONFIG.TOOLS['ai-visibility'].limits.authenticated} scans per month`)
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
// ✨ ULTIMATE PROMPT GENERATION
// Best of Gemini + Claude + Natural Language
// ============================================
async function generatePromptsWithClaude(
  companyName, 
  companyCategory, 
  queries,
  customTerms = null,
  websiteAnalysis = null,  // ✨ Website analysis for better prompts
  isNL = true              // ✨ i18n
) {
  const primaryKeyword = queries.length > 0 ? queries[0] : null
  
  // ============================================
  // ✨ WEBSITE CONTEXT (if available)
  // ============================================
  let websiteContext = '';
  if (websiteAnalysis && websiteAnalysis.success) {
    const nf = isNL ? 'Niet gedetecteerd' : 'Not detected'
    const ns = isNL ? 'Niet specifiek' : 'Not specific'
    websiteContext = isNL 
      ? `

**🌐 WEBSITE ANALYSE - GEBRUIK DEZE CONTEXT:**

**DIENSTEN/PRODUCTEN:**
${websiteAnalysis.services?.length > 0 ? websiteAnalysis.services.map(s => `- ${s}`).join('\n') : nf}

**UNIQUE SELLING POINTS:**
${websiteAnalysis.usps?.length > 0 ? websiteAnalysis.usps.map(u => `- ${u}`).join('\n') : nf}

**DOELGROEP:** ${websiteAnalysis.targetAudience || nf}

**BEDRIJFSTYPE:** ${websiteAnalysis.businessType || nf}

**DOELGROEP TYPE:** ${websiteAnalysis.audienceType || nf}

**KERNACTIVITEIT:** ${websiteAnalysis.coreActivity || nf}

**LOCATIE-FOCUS:** ${websiteAnalysis.location || ns}

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
`
      : `

**🌐 WEBSITE ANALYSIS - USE THIS CONTEXT:**

**SERVICES/PRODUCTS:**
${websiteAnalysis.services?.length > 0 ? websiteAnalysis.services.map(s => `- ${s}`).join('\n') : nf}

**UNIQUE SELLING POINTS:**
${websiteAnalysis.usps?.length > 0 ? websiteAnalysis.usps.map(u => `- ${u}`).join('\n') : nf}

**TARGET AUDIENCE:** ${websiteAnalysis.targetAudience || nf}

**BUSINESS TYPE:** ${websiteAnalysis.businessType || nf}

**AUDIENCE TYPE:** ${websiteAnalysis.audienceType || nf}

**CORE ACTIVITY:** ${websiteAnalysis.coreActivity || nf}

**LOCATION FOCUS:** ${websiteAnalysis.location || ns}

🎯 USE this information to generate MORE RELEVANT commercial queries that match what the business ACTUALLY offers.

🚨 **CRITICAL - AUDIENCE DETERMINES QUESTION TYPE:**
${websiteAnalysis.audienceType === 'B2C' ? `
- This is a B2C business → Ask from CONSUMER perspective
- Use: "Where can I...", "Which shops...", "Best ... for home"
- NOT: "companies offering business solutions", "B2B suppliers"` : 
websiteAnalysis.audienceType === 'B2B' ? `
- This is a B2B business → Ask from BUSINESS perspective
- Use: "agencies", "service providers", "business partners"` : `
- This business serves both consumers and businesses
- Mix consumer and business questions`}

${websiteAnalysis.businessType === 'shop' || websiteAnalysis.businessType === 'winkel' ? `
🛒 **THIS IS A SHOP** → Questions should be about BUYING/BROWSING, NOT installing/consulting
- ✅ "Where can I buy good lamps?" / "Which lighting shops..."
- ❌ "Specialists experienced in installing..." (WRONG - this is a shop, not an installer!)` : ''}

${websiteAnalysis.businessType === 'legal' || websiteAnalysis.businessType === 'juridisch' ? `
⚖️ **THIS IS A LEGAL BUSINESS** → ALWAYS use the exact legal terminology from the keywords
- If keyword is "lawyer" → use "lawyer/attorneys/law firm"
- ❌ NEVER substitute with "legal consultant" unless that IS the keyword` : ''}

${websiteAnalysis.coreActivity ? `
📌 **CORE ACTIVITY: ${websiteAnalysis.coreActivity}** → Questions must align with this
- If the company SELLS → "Where can I buy/order ...?"
- If the company INSTALLS → "Which companies install...?"
- If the company ADVISES → "Which specialists advise on...?"
- If the company TREATS → "Which clinics treat...?"` : ''}
`;
  }
  
  // ============================================
  // ✨ STRICTER CUSTOM TERMS
  // ============================================
  let customTermsInstruction = '';
  
  if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
    customTermsInstruction = isNL 
      ? `\n**🚨 KRITIEKE GEBRUIKERSINSTRUCTIES - ABSOLUUT VERPLICHT:**`
      : `\n**🚨 CRITICAL USER INSTRUCTIONS - ABSOLUTELY REQUIRED:**`;

    if (customTerms.exclude?.length > 0) {
      customTermsInstruction += isNL 
        ? `\n\n**❌ ABSOLUUT VERBODEN - GEBRUIK DEZE WOORDEN NOOIT:**
${customTerms.exclude.map(term => `- "${term}"`).join('\n')}
🚨 KRITIEK: Deze termen zijn STRIKT VERBODEN. GEEN ENKELE vraag mag deze woorden bevatten.`
        : `\n\n**❌ ABSOLUTELY FORBIDDEN - NEVER USE THESE WORDS:**
${customTerms.exclude.map(term => `- "${term}"`).join('\n')}
🚨 CRITICAL: These terms are STRICTLY FORBIDDEN. NO question may contain these words.`;
    }

    if (customTerms.include?.length > 0) {
      customTermsInstruction += isNL
        ? `\n\n**✅ VERPLICHT TE GEBRUIKEN - HOGE PRIORITEIT:**
${customTerms.include.map(term => `- "${term}"`).join('\n')}
🎯 DOEL: Minimaal 7 van de 10 vragen MOETEN één of meer van deze termen bevatten.`
        : `\n\n**✅ MUST USE - HIGH PRIORITY:**
${customTerms.include.map(term => `- "${term}"`).join('\n')}
🎯 GOAL: At least 7 out of 10 questions MUST contain one or more of these terms.`;
    }

    if (customTerms.location?.length > 0) {
      customTermsInstruction += isNL
        ? `\n\n**📍 VERPLICHTE LOCATIE-FOCUS:**
${customTerms.location.map(term => `- "${term}"`).join('\n')}
🚨 Precies 5 van de 10 vragen MOETEN één van deze EXACTE locatietermen bevatten.
De andere 5 vragen zijn ZONDER locatie (test generieke zichtbaarheid).
Als gebruiker een stad specificeert: ALLEEN die stad, GEEN brede termen.`
        : `\n\n**📍 REQUIRED LOCATION FOCUS:**
${customTerms.location.map(term => `- "${term}"`).join('\n')}
🚨 Exactly 5 of 10 questions MUST contain one of these EXACT location terms.
The other 5 questions should be WITHOUT location (test generic visibility).
If user specifies a city: use ONLY that city, NO broad terms.`;
    }

    customTermsInstruction += isNL
      ? `\n\n**🎯 VALIDATIE:** Controleer ELKE vraag. Als je niet aan alle eisen voldoet, begin OPNIEUW.`
      : `\n\n**🎯 VALIDATION:** Check EVERY question. If requirements aren't met, start OVER.`;
  }
  
  // ============================================
  // KEYWORD CONTEXT
  // ============================================
  const searchConsoleContext = queries.length > 0 
    ? (isNL ? `

**🚨 ZOEKWOORDEN - GEBRUIK EXACT DEZE TERMEN:**

**OPGEGEVEN ZOEKWOORDEN:**
${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

**⚠️ KRITIEKE VERDELING - ALLE ZOEKWOORDEN MOETEN TERUGKOMEN:**

🚨 **ABSOLUUT VERBODEN: NOOIT twee verschillende zoekwoorden in één prompt combineren!**
Elke prompt gaat over PRECIES ÉÉN zoekwoord/onderwerp.

${queries.length === 1 ? `- Alle 10 prompts moeten "${queries[0]}" of een directe variant bevatten` 
: queries.length <= 4 ? queries.map((q, i) => `- "${q}": gebruik in ${Math.max(2, Math.round(10/queries.length))} prompts`).join('\n')
: `- Verdeel de 10 prompts EERLIJK over alle ${queries.length} zoekwoorden
- Elk zoekwoord moet minimaal 1x terugkomen`}

**⚠️ GEBRUIK DE EXACTE ZOEKWOORDEN - GEEN ANDERE SYNONIEMEN**
**TOEGESTANE VARIATIES:** Enkelvoud ↔ meervoud, met/zonder kantoor/bureau
**VERBODEN:** Twee zoekwoorden combineren, andere beroepsgroepen, synoniemen die de betekenis veranderen`
      : `

**🚨 KEYWORDS - USE EXACTLY THESE TERMS:**

**PROVIDED KEYWORDS:**
${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

**⚠️ CRITICAL DISTRIBUTION - ALL KEYWORDS MUST APPEAR:**

🚨 **ABSOLUTELY FORBIDDEN: NEVER combine two different keywords in one prompt!**
Each prompt covers EXACTLY ONE keyword/topic.

${queries.length === 1 ? `- All 10 prompts must contain "${queries[0]}" or a direct variant` 
: queries.length <= 4 ? queries.map((q, i) => `- "${q}": use in ${Math.max(2, Math.round(10/queries.length))} prompts`).join('\n')
: `- Distribute the 10 prompts FAIRLY across all ${queries.length} keywords
- Each keyword must appear at least once`}

**⚠️ USE THE EXACT KEYWORDS - NO OTHER SYNONYMS**
**ALLOWED VARIATIONS:** Singular ↔ plural, with/without firm/agency
**NOTE:** If any keyword above is in a non-English language (e.g., Dutch), translate it to natural English first (e.g., "zoekmachineoptimalisatie" → "SEO", "Google Ads beheer" → "Google Ads management")
**FORBIDDEN:** Combining two keywords, different professions, meaning-changing synonyms, non-English words in questions`)
    : ''


  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: isNL 
        ? `Jij genereert commerciële, klantgerichte zoekvragen die gericht zijn op het vinden van **specifieke bedrijven of organisaties** (geen grote consumentenmerken).

${websiteAnalysis?.audienceType === 'B2C' ? `**DOELGROEP: CONSUMENTEN (B2C)** - Vragen vanuit particulier/consument perspectief.` : 
websiteAnalysis?.audienceType === 'both' ? `**DOELGROEP: CONSUMENTEN + ZAKELIJK** - Mix vragen vanuit particulier EN zakelijk perspectief.` : 
`**DOELGROEP: ZAKELIJK (B2B)** - Vragen vanuit zakelijk perspectief.`}

**ABSOLUTE PRIORITEITEN:**
1. **NATUURLIJKHEID**: Vragen klinken als ECHTE MENSEN
2. **COMMERCIEEL**: Start idealiter met verzoek om concrete bedrijfsnamen
3. **BEDRIJFSNEUTRAAL**: Vermeld NIET de naam of exacte categorie van het geanalyseerde bedrijf
4. **DOELGROEP-PASSEND**: Vragen passen bij het type klant
5. **NEDERLANDS**: ALTIJD en UITSLUITEND Nederlands

**VERBODEN:** Onnatuurlijk Nederlands, "Lijst ... op", geforceerde keyword-combinaties, vragen over INSTALLEREN als het bedrijf een WINKEL is
**VERPLICHT:** Vragen die DIRECT om bedrijfsnamen vragen, natuurlijke taal, variatie

${customTermsInstruction}`
        : `You generate commercial, customer-focused search queries aimed at finding **specific businesses or organizations** (not major consumer brands).

${websiteAnalysis?.audienceType === 'B2C' ? `**AUDIENCE: CONSUMERS (B2C)** - Questions from consumer/individual perspective.` : 
websiteAnalysis?.audienceType === 'both' ? `**AUDIENCE: CONSUMERS + BUSINESS** - Mix consumer and business questions.` : 
`**AUDIENCE: BUSINESS (B2B)** - Questions from business perspective.`}

**ABSOLUTE PRIORITIES:**
1. **NATURALNESS**: Questions sound like REAL PEOPLE
2. **COMMERCIAL**: Ideally start with request for concrete company names
3. **COMPANY-NEUTRAL**: Do NOT mention the name or exact category of the analyzed company
4. **AUDIENCE-APPROPRIATE**: Questions match the customer type
5. **ENGLISH**: ALWAYS and EXCLUSIVELY English

**CRITICAL — LANGUAGE PURITY:**
The website analysis keywords may contain non-English terms (e.g., Dutch).
You MUST translate ALL non-English keywords to natural English equivalents before using them.
Examples: "zoekmachineoptimalisatie" → "SEO", "Google Ads beheer" → "Google Ads management",
"linkbuilding" → "link building", "bureau" → "agency", "adviesbureau" → "consulting firm".
NEVER include Dutch, German, or other non-English words in the generated questions.

**FORBIDDEN:** Unnatural English, "List ... out", forced keyword combinations, questions about INSTALLING if the business is a SHOP, ANY non-English words in questions
**REQUIRED:** Questions that DIRECTLY ask for company names, natural language, variety

${customTermsInstruction}`,
      messages: [{
        role: 'user',
        content: isNL
          ? `Genereer 10 zeer specifieke, commercieel relevante zoekvragen die een potentiële ${websiteAnalysis?.audienceType === 'B2C' ? 'consument/klant' : websiteAnalysis?.audienceType === 'both' ? 'klant (particulier of zakelijk)' : 'B2B-klant'} zou stellen om **concrete, lokale/nationale bedrijven of leveranciers** te vinden.

**CONTEXT:**
- Bedrijfscategorie: "${companyCategory}"
- Focus op Nederlandse markt
${websiteContext}
${searchConsoleContext}

**KRITIEKE VEREISTEN:**
1. Commerciële focus: vragen leiden tot concrete bedrijfsnamen
2. Natuurlijke taal: klinkt als echte mensen
3. Bedrijfsneutraal: geen "${companyName}" of exacte "${companyCategory}"
4. Variatie in structuur en startwoorden

**OUTPUT:** Exact 10 natuurlijke, commerciële vragen als JSON array. ALLEEN de array, geen extra tekst. ALTIJD Nederlands.
["Vraag 1", "Vraag 2", ..., "Vraag 10"]`
          : `Generate 10 highly specific, commercially relevant search queries that a potential ${websiteAnalysis?.audienceType === 'B2C' ? 'consumer/customer' : websiteAnalysis?.audienceType === 'both' ? 'customer (individual or business)' : 'B2B client'} would ask to find **concrete, local/national businesses or providers**.

**CONTEXT:**
- Business category: "${companyCategory}"
- Focus on the relevant market for this business
${websiteContext}
${searchConsoleContext}

**CRITICAL REQUIREMENTS:**
1. Commercial focus: questions lead to concrete company names
2. Natural language: sounds like real people
3. Company-neutral: no "${companyName}" or exact "${companyCategory}"
4. Variety in structure and opening words
5. **100% ENGLISH**: If any keywords above are in Dutch or another language, TRANSLATE them to English (e.g., "zoekmachineoptimalisatie" → "SEO", "Google Ads beheer" → "Google Ads management")

**OUTPUT:** Exactly 10 natural, commercial questions as JSON array. ONLY the array, no extra text. ALWAYS in English.
["Question 1", "Question 2", ..., "Question 10"]`
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
    return { success: false, error: isNL ? 'Fout bij promptgeneratie' : 'Error during prompt generation' }
  }
}

// ============================================
// ✨ ULTIMATE PERPLEXITY - "AI Overview Simulator"
// ============================================
async function analyzeWithPerplexity(prompt, companyName, isNL = true) {
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
              content: isNL 
                ? `Jij bent een geavanceerd AI-model getraind op een brede dataset van webcontent, inclusief bedrijfsinformatie, reviews, technische documentatie en compliance.

**JOUW TAAK:**
Simuleer hoe een AI Overview of geavanceerde chatbot zou reageren op de zoekopdracht. Genereer een beknopt, gesimuleerd AI-antwoord als een directe reactie.

**🚨 ABSOLUTE REGELS:**
1. **TAAL: 100% NEDERLANDS**
2. **FOCUS: CONCRETE NEDERLANDSE B2B BEDRIJVEN** - Vermeld concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen
3. **STRIKT VERBODEN:** Zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple, etc.), Tech-platforms (Google, Facebook, etc.), SEO/Marketing tools (Semrush, Ahrefs, etc.)
4. **WEL VERMELDEN:** Nederlandse lokale dienstverleners, regionale specialisten, kleinere bedrijven

Simuleer een AI Overview die concrete bedrijven noemt!`
                : `You are an advanced AI model trained on a broad dataset of web content, including business information, reviews, technical documentation and compliance.

**YOUR TASK:**
Simulate how an AI Overview or advanced chatbot would respond to the search query. Generate a concise, simulated AI response as a direct answer.

**🚨 ABSOLUTE RULES:**
1. **LANGUAGE: 100% ENGLISH** — Even if the query contains non-English terms, ALWAYS respond entirely in English. Translate any non-English terms in your response.
2. **FOCUS: CONCRETE BUSINESSES** - Mention concrete, specific small to medium-sized business names
3. **STRICTLY FORBIDDEN:** Very well-known global consumer brands (Coca-Cola, Nike, Apple, etc.), Tech platforms (Google, Facebook, etc.), SEO/Marketing tools (Semrush, Ahrefs, etc.)
4. **DO MENTION:** Local service providers, regional specialists, smaller businesses

Simulate an AI Overview that mentions concrete businesses!`
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

    const parsed = parseWithJS(rawOutput, companyName, isNL)

    return { success: true, data: parsed }
  } catch (error) {
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
  }
}

// ============================================
// ✨ CHATGPT SEARCH - Real Web Search Results
// ============================================
async function analyzeWithChatGPT(prompt, companyName, serviceArea = null, isNL = true) {
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
          model: 'gpt-4o-search-preview',
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
Vermijd zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple, etc.), tech-platforms (Google, Facebook), en SEO-tools (Semrush, Ahrefs).`
                : `You are a helpful AI assistant answering search queries in English.
The user is looking for businesses${serviceArea ? ` in the ${serviceArea} area` : ''}. Provide answers specifically focused on the relevant market.
Search the web and give a concise, informative answer with concrete business names and recommendations.
ALWAYS respond in English, even if the query contains non-English terms. Translate any non-English terms.
Focus on mentioning specific businesses, service providers or specialists.
Avoid very well-known global consumer brands (Coca-Cola, Nike, Apple, etc.), tech platforms (Google, Facebook), and SEO tools (Semrush, Ahrefs).`
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
        error: isNL ? 'ChatGPT rate limited — overgeslagen' : 'ChatGPT rate limited — skipped',
        data: {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: isNL ? 'ChatGPT was tijdelijk niet beschikbaar voor deze prompt (rate limit)' : 'ChatGPT was temporarily unavailable for this prompt (rate limit)'
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

    const parsed = parseWithJS(rawOutput, companyName, isNL)

    return { success: true, data: parsed }
  } catch (error) {
    console.error('❌ ChatGPT Error:', error.message || error)
    return { 
      success: false, 
      error: error.message || (isNL ? 'Fout bij ChatGPT-analyse' : 'Error during ChatGPT analysis'),
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: isNL ? 'ChatGPT analyse mislukt door API error' : 'ChatGPT analysis failed due to API error'
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
function cleanCompetitorName(raw) {
  let name = raw
    // Strip markdown links: [Name](url) → Name
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
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
    !/\.(nl|com|org|net|be|de|eu)$/i.test(name)
  )
}

function parseWithJS(rawOutput, companyName, isNL = true) {
  try {
    const mentionsCount = (rawOutput.match(new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    const isCompanyMentioned = mentionsCount > 0

    // Pre-clean: resolve markdown links in the raw output for pattern matching
    const cleanedOutput = rawOutput.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

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
      'chatgpt', 'openai', 'anthropic', 'perplexity',
      'nederland', 'netherlands', 'amsterdam', 'rotterdam', 'den haag', 'utrecht',
      'eindhoven', 'groningen', 'maastricht', 'breda', 'tilburg', 'almere'
    ])

    // Pattern 1: **Bold names** (on cleaned output without markdown links)
    const boldPattern = /\*\*([^*]{3,60})\*\*/g
    let match
    while ((match = boldPattern.exec(cleanedOutput)) !== null) {
      const name = cleanCompetitorName(match[1])
        .replace(/\s*[-–—:].*/g, '')  // Remove description after dash
        .replace(/^\d+[\.\)]\s*/, '')  // Remove leading number
        .trim()
      
      if (isValidCompetitorName(name, companyLower, excludeList, seen)) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    }

    // Pattern 2: Numbered list items (1. Name - description)
    const numberedPattern = /^\s*(\d+)[\.\)\-]\s*\**([^*\n]{2,80})/gm
    while ((match = numberedPattern.exec(cleanedOutput)) !== null) {
      let name = cleanCompetitorName(match[2])
        .replace(/\s*[-–—:].*/g, '')  // Remove description after dash
        .trim()
      
      if (isValidCompetitorName(name, companyLower, excludeList, seen)) {
        seen.add(name.toLowerCase())
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
      simulated_ai_response_snippet: isNL ? 'Fout bij het analyseren van de AI-respons' : 'Error analyzing AI response'
    }
  }
}