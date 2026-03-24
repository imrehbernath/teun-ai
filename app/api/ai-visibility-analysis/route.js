// app/api/ai-visibility-analysis/route.js
// ✅ ULTIMATE VERSION - Best of Gemini + Claude + Natural Questions
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { canUserScan, trackScan, BETA_CONFIG } from '@/lib/beta-config'
import { getOrCreateSessionToken } from '@/lib/session-token'
import { isBlockedUrl, hasNonLatinText, getLanguageBlockError } from '@/lib/language-guard'

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
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY

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
// ✨ PROMPT GENERATION v2 — Data-driven rewrite
// Based on analysis of 740 real scan prompts
// Key findings applied:
//   - 63% started with "Welke"/"Waar" → enforce variety
//   - EN prompts: 1.4% mention rate vs NL 13.8% → fix language purity
//   - Specific product/service prompts score 3x higher
//   - Problem/experience prompts outperform generic "which company" prompts
//   - Mixed language prompts (NL/EN in one sentence) always score 0%
//   - 10-18 word prompts perform best
// ============================================
async function generatePromptsWithClaude(
  companyName, 
  companyCategory, 
  queries,
  customTerms = null,
  websiteAnalysis = null,
  isNL = true
) {
  const primaryKeyword = queries.length > 0 ? queries[0] : null
  
  // ============================================
  // WEBSITE CONTEXT (if available)
  // ============================================
  let websiteContext = '';
  if (websiteAnalysis && websiteAnalysis.success) {
    const nf = isNL ? 'Niet gedetecteerd' : 'Not detected'
    const ns = isNL ? 'Niet specifiek' : 'Not specific'
    websiteContext = isNL 
      ? `

**WEBSITE ANALYSE — DIT BEDRIJF BIEDT AAN:**

**DIENSTEN/PRODUCTEN:**
${websiteAnalysis.services?.length > 0 ? websiteAnalysis.services.map(s => `- ${s}`).join('\n') : nf}

**UNIQUE SELLING POINTS:**
${websiteAnalysis.usps?.length > 0 ? websiteAnalysis.usps.map(u => `- ${u}`).join('\n') : nf}

**DOELGROEP:** ${websiteAnalysis.targetAudience || nf}
**BEDRIJFSTYPE:** ${websiteAnalysis.businessType || nf}
**DOELGROEP TYPE:** ${websiteAnalysis.audienceType || nf}
**KERNACTIVITEIT:** ${websiteAnalysis.coreActivity || nf}
**LOCATIE-FOCUS:** ${websiteAnalysis.location || ns}

BELANGRIJK: Gebruik de SPECIFIEKE diensten en producten hierboven in je prompts.
Hoe specifieker de prompt, hoe beter. "steenpapier notitieboeken" scoort 10x beter dan "duurzame kantoorartikelen".

${websiteAnalysis.audienceType === 'B2C' ? `Dit is een B2C bedrijf. Stel vragen vanuit CONSUMENTEN perspectief: "Ik zoek...", "Waar kan ik ... kopen", "Heeft iemand ervaring met..."` : 
websiteAnalysis.audienceType === 'B2B' ? `Dit is een B2B bedrijf. Stel vragen vanuit ZAKELIJK perspectief: "Ons bedrijf zoekt...", "Welke bureaus...", "Wie kan ons helpen met..."` : 
`Dit bedrijf richt zich op consumenten EN bedrijven. Mix beide perspectieven.`}

${websiteAnalysis.businessType === 'winkel' ? `DIT IS EEN WINKEL. Vragen gaan over KOPEN, niet over installeren of adviseren.` : ''}
${websiteAnalysis.businessType === 'juridisch' ? `DIT IS JURIDISCH. Gebruik exacte juridische terminologie uit de zoekwoorden.` : ''}

${websiteAnalysis.coreActivity ? `KERNACTIVITEIT: ${websiteAnalysis.coreActivity}
- VERKOOPT → "Waar kan ik ... kopen/bestellen?"
- INSTALLEERT → "Wie kan ... bij mij installeren?"
- ADVISEERT → "Ik heb advies nodig over..."
- BEHANDELT → "Ik heb last van ..., wie kan helpen?"` : ''}
`
      : `

**WEBSITE ANALYSIS — THIS BUSINESS OFFERS:**

**SERVICES/PRODUCTS:**
${websiteAnalysis.services?.length > 0 ? websiteAnalysis.services.map(s => `- ${s}`).join('\n') : nf}

**UNIQUE SELLING POINTS:**
${websiteAnalysis.usps?.length > 0 ? websiteAnalysis.usps.map(u => `- ${u}`).join('\n') : nf}

**TARGET AUDIENCE:** ${websiteAnalysis.targetAudience || nf}
**BUSINESS TYPE:** ${websiteAnalysis.businessType || nf}
**AUDIENCE TYPE:** ${websiteAnalysis.audienceType || nf}
**CORE ACTIVITY:** ${websiteAnalysis.coreActivity || nf}
**LOCATION FOCUS:** ${websiteAnalysis.location || ns}

IMPORTANT: Use the SPECIFIC services and products listed above in your prompts.
The more specific the prompt, the better. "stone paper reusable notebooks" scores 10x better than "sustainable office supplies".

CRITICAL: ALL prompts must be 100% English. If any keyword above is in Dutch or another language, TRANSLATE it to natural English.

${websiteAnalysis.audienceType === 'B2C' ? `This is a B2C business. Ask from CONSUMER perspective: "I'm looking for...", "Where can I buy...", "Has anyone tried..."` : 
websiteAnalysis.audienceType === 'B2B' ? `This is a B2B business. Ask from BUSINESS perspective: "Our company needs...", "Which agencies...", "Who can help us with..."` : 
`This business serves both consumers and businesses. Mix both perspectives.`}

${websiteAnalysis.businessType === 'shop' || websiteAnalysis.businessType === 'winkel' ? `THIS IS A SHOP. Questions are about BUYING, not installing or consulting.` : ''}

${websiteAnalysis.coreActivity ? `CORE ACTIVITY: ${websiteAnalysis.coreActivity}
- SELLS → "Where can I buy/order ...?"
- INSTALLS → "Who can install ... for me?"
- ADVISES → "I need advice on..."
- TREATS → "I'm suffering from ..., who can help?"` : ''}
`;
  }
  
  // ============================================
  // CUSTOM TERMS
  // ============================================
  let customTermsInstruction = '';
  
  if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
    customTermsInstruction = isNL 
      ? `\n**GEBRUIKERSINSTRUCTIES:**`
      : `\n**USER INSTRUCTIONS:**`;

    if (customTerms.exclude?.length > 0) {
      customTermsInstruction += isNL 
        ? `\n\n**VERBODEN WOORDEN (gebruik deze NOOIT):**
${customTerms.exclude.map(term => `- "${term}"`).join('\n')}`
        : `\n\n**FORBIDDEN WORDS (NEVER use these):**
${customTerms.exclude.map(term => `- "${term}"`).join('\n')}`;
    }

    if (customTerms.include?.length > 0) {
      customTermsInstruction += isNL
        ? `\n\n**VERPLICHTE TERMEN (minimaal 7 van 10 prompts):**
${customTerms.include.map(term => `- "${term}"`).join('\n')}`
        : `\n\n**REQUIRED TERMS (at least 7 of 10 prompts):**
${customTerms.include.map(term => `- "${term}"`).join('\n')}`;
    }

    if (customTerms.location?.length > 0) {
      customTermsInstruction += isNL
        ? `\n\n**LOCATIE-FOCUS (precies 5 van 10 prompts):**
${customTerms.location.map(term => `- "${term}"`).join('\n')}
De andere 5 zonder locatie.`
        : `\n\n**LOCATION FOCUS (exactly 5 of 10 prompts):**
${customTerms.location.map(term => `- "${term}"`).join('\n')}
The other 5 without location.`;
    }
  }
  
  // ============================================
  // KEYWORD CONTEXT
  // ============================================
  const searchConsoleContext = queries.length > 0 
    ? (isNL ? `

**ZOEKWOORDEN VAN DE WEBSITE:**

${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

REGELS:
- Verdeel de 10 prompts eerlijk over deze zoekwoorden
- Elk zoekwoord minimaal 1x gebruiken
- NOOIT twee zoekwoorden in een prompt combineren
- Gebruik het EXACTE zoekwoord, geen synoniemen
- Toegestaan: enkelvoud/meervoud, met/zonder kantoor/bureau`
      : `

**KEYWORDS FROM THE WEBSITE:**

${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

RULES:
- Distribute 10 prompts fairly across these keywords
- Each keyword at least once
- NEVER combine two keywords in one prompt
- Use the EXACT keyword, no synonyms
- Allowed: singular/plural variations
- If any keyword is in Dutch, TRANSLATE it to natural English first`)
    : ''


  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: isNL 
        ? `Je genereert 10 zoekvragen die echte mensen zouden typen in ChatGPT of Perplexity.

JE DOEL: Elke prompt moet zo natuurlijk en herkenbaar zijn dat de gebruiker denkt "dit is PRECIES wat mijn klanten zouden vragen".

${websiteAnalysis?.audienceType === 'B2C' ? `DOELGROEP: CONSUMENTEN (B2C)` : 
websiteAnalysis?.audienceType === 'both' ? `DOELGROEP: CONSUMENTEN + ZAKELIJK` : 
`DOELGROEP: ZAKELIJK (B2B)`}

VOORBEELDEN VAN GOEDE PROMPTS (hoog scorend in echte scans):
- "Ik zoek een bureau dat mijn webshop hoger in Google kan krijgen, wie heeft daar ervaring mee?"
- "Waar kan ik duurzame notitieboeken van steenpapier kopen in Nederland?"
- "Mijn bedrijfsfietsen moeten onderhouden worden, welke partijen komen op locatie?"
- "We willen onze medewerkers een fietsleaseregeling aanbieden, wie kan ons daarbij helpen?"
- "Ik heb last van chronische rugpijn en wil geen medicijnen, welke osteopaat kan helpen?"
- "Welke cateraar kan smoked BBQ verzorgen voor 80 personen op een bruiloft?"
- "Ons restaurant wil telefonische reserveringen automatiseren met AI, wie biedt dat aan?"
- "Waar kan ik een ergonomische verticale muis bestellen met snelle levering?"
- "Wie kan een naadloze gietvloer leggen in mijn woonkamer in Amsterdam?"
- "Welk SEO bureau in Utrecht levert meetbare resultaten voor webshops?"

VOORBEELDEN VAN SLECHTE PROMPTS (scoren altijd 0%):
- "Welke bedrijven bieden diensten aan voor..." (te vaag, geen context)
- "Waar kan ik beautiful textiles kopen?" (Engels woord in Nederlandse zin)
- "Welke specialisten zijn gespecialiseerd in..." (dubbelop, onnatuurlijk)
- "Welke leveranciers hebben X in hun assortiment?" (zakelijk jargon, niemand praat zo)
- "Noem bedrijven die professionele oplossingen bieden" (generiek)
- "Ken je betrouwbare aanbieders voor..." (vaag, elk bedrijf past hier)

VERPLICHTE REGELS:

1. VARIATIE IN VRAAGTYPE. Gebruik minstens 5 van deze 7 categorieen.
   ⛔ GOUDEN REGEL: Elke prompt MOET een antwoord opleveren waarin ChatGPT minimaal 3 bedrijfsnamen noemt.
   ⛔ ABSOLUUT VERBODEN PROMPTTYPEN (deze leveren NOOIT bedrijfsnamen op):
   - "Wat kost..." / "Hoeveel kost..." / "Wat is de prijs van..." (levert prijsinformatie, geen bedrijven)
   - "Wat is het verschil tussen..." / "Kan iemand uitleggen..." (levert uitleg, geen bedrijven)
   - "Heeft iemand ervaring met..." zonder te vragen naar een specifiek bedrijf (levert meningen, geen bedrijven)
   CATEGORIEËN:
   - AANBEVELING: "Wie kan mij helpen met...", "Ken je een goed bedrijf voor..."
   - BESTE: "Welk bedrijf is het beste voor...", "Wie is de beste ... in Nederland?"
   - LOKAAL: "Wie kan [dienst] doen in [stad]?", "Welke [branche] zit er in [regio]?"
   - OPLOSSING: "Ik heb [probleem], welk bedrijf kan dat oplossen?", "Onze website scoort slecht, wie kan helpen?"
   - SPECIALIST: "Welke bureaus zijn gespecialiseerd in...", "Wie heeft ervaring met [dienst] voor [doelgroep]?"
   - SPECIFIEK PRODUCT: Een prompt met een heel specifiek product, dienst of merknaam
   - SITUATIESCHETS: "We gaan verhuizen en zoeken...", "Ons bedrijf groeit en we hebben ... nodig"

2. VARIATIE IN ZINSOPBOUW. Maximaal 2 prompts mogen met hetzelfde woord beginnen.
   Goede starters: "Ik zoek", "Mijn", "We willen", "Welk bedrijf", "Kan iemand", "Ken je", "Ons bedrijf", "Wie kan", "Waar vind ik"
   VERBODEN: Meer dan 2x beginnen met "Welke" of meer dan 2x met "Waar kan ik"

3. LENGTE: Elke prompt is 10-18 woorden. Niet korter, niet langer.

4. TAAL: 100% Nederlands. NOOIT Engelse woorden in een Nederlandse prompt. Als een zoekwoord Engels is, vertaal het naar natuurlijk Nederlands.
   FOUT: "Waar kan ik beautiful textiles kopen?" of "buy used trucks online Europe"
   GOED: "Waar kan ik mooie stoffen kopen?" of "gebruikte vrachtwagens kopen in Europa"

5. SPECIFICITEIT: Gebruik CONCRETE diensten/producten uit de zoekwoorden. Hoe specifieker, hoe beter.
   FOUT: "Welke bedrijven bieden schoonmaakdiensten aan?"
   GOED: "Wie kan het interieur van mijn Tesla professioneel laten reinigen in Den Haag?"

6. ZOEKWOORDEN NATUURLIJK VERWERKEN: Zoekwoorden NOOIT letterlijk plakken. Maak er een natuurlijke zin van.
   FOUT: "Wie legt gietvloer badkamer?" (zoekwoord letterlijk geplakt)
   GOED: "Wie kan een gietvloer in de badkamer leggen?"
   FOUT: "Wie kan gietvloer woonkamer aanbrengen?"
   GOED: "Wie kan een gietvloer in mijn woonkamer aanbrengen?"
   FOUT: "specialist wandafwerking kantoor"
   GOED: "een specialist voor wandafwerking in ons kantoor"
   REGEL: Voeg altijd de juiste voorzetsels en lidwoorden toe (in de, in mijn, voor de, op het).

7. NATUURLIJKHEID: Klinkt alsof een echt mens dit typt in ChatGPT.
   FOUT: "Welke dienstverleners kunnen een professionele oplossing bieden voor onze organisatie?"
   GOED: "Ons kantoor moet geschilderd worden, wie kan dat snel en netjes doen?"

8. BEDRIJFSNEUTRAAL: Noem NIET "${companyName}" of letterlijk "${companyCategory}".

9. VAKJARGON: Gebruik het juiste werkwoord per branche. NOOIT "installeren" als dat niet de juiste term is.
   - Vloeren: LEGGEN/AANBRENGEN ("Wie kan een gietvloer leggen", NIET "installeren")
   - Wanden: STUCEN/AANBRENGEN/AFWERKEN ("Wie kan een naadloze wandafwerking aanbrengen")
   - Schilderwerk: SCHILDEREN/VERVEN
   - Dakwerk: DEKKEN/RENOVEREN
   - Algemeen: als je twijfelt, gebruik "laten doen" of "verzorgen"

10. PLAATSNAAM ALTIJD AAN HET EIND: Locatie komt altijd als "in [stad]" aan het einde van de zin.
   FOUT: "een specialist voor wandafwerking in Amsterdam in mijn appartement"
   GOED: "een specialist voor naadloze wandafwerking in mijn appartement in Amsterdam"

11. LOCATIE: Als de gebruiker een servicegebied heeft opgegeven, als de website-analyse een locatie-focus detecteert, of als de zoekwoorden een plaatsnaam bevatten, gebruik die locatie in precies 5 van de 10 prompts (de andere 5 zonder). Als er GEEN locatie bekend is uit geen enkele bron, gebruik dan GEEN plaatsnamen in de prompts.

${customTermsInstruction}`
        : `You generate 10 search queries that real people would type into ChatGPT or Perplexity.

YOUR GOAL: Every prompt must be so natural and recognizable that the user thinks "this is EXACTLY what my customers would ask".

${websiteAnalysis?.audienceType === 'B2C' ? `AUDIENCE: CONSUMERS (B2C)` : 
websiteAnalysis?.audienceType === 'both' ? `AUDIENCE: CONSUMERS + BUSINESS` : 
`AUDIENCE: BUSINESS (B2B)`}

EXAMPLES OF GOOD PROMPTS (high scoring in real scans):
- "I'm looking for an agency that can help my online store rank higher in Google, any recommendations?"
- "Where can I buy reusable stone paper notebooks that I can wipe clean and reuse?"
- "Our company bikes need regular maintenance, which services come on-site?"
- "We want to set up a bike lease program for our employees, who handles that?"
- "I have chronic back pain and want to avoid medication, which osteopath would you recommend?"
- "Which caterer can do smoked BBQ for about 80 guests at an outdoor wedding?"
- "Our restaurant wants to automate phone reservations with AI, who offers that kind of service?"
- "Where can I order an ergonomic vertical mouse with fast shipping?"
- "Who can lay a seamless poured floor in my living room in Denver?"
- "Which SEO agency in Austin delivers measurable results for e-commerce stores?"

EXAMPLES OF BAD PROMPTS (always score 0%):
- "Which companies offer services for..." (too vague)
- "Which specialists specialize in..." (redundant, unnatural)
- "Which suppliers have X in their assortment?" (corporate jargon)
- "Name companies that provide professional solutions" (generic)
- "Can you recommend reliable providers for..." (vague, any company fits)

REQUIRED RULES:

1. VARIETY IN QUESTION TYPE. Use at least 5 of these 7 categories.
   ⛔ GOLDEN RULE: Every prompt MUST trigger an answer where ChatGPT names at least 3 businesses.
   ⛔ ABSOLUTELY FORBIDDEN PROMPT TYPES (these NEVER return company names):
   - "How much does..." / "What does ... cost?" / "What is the price of..." (returns pricing info, not companies)
   - "What's the difference between..." / "Can someone explain..." (returns explanations, not companies)
   - "Has anyone tried..." without asking for a specific company (returns opinions, not companies)
   CATEGORIES:
   - RECOMMENDATION: "Who can help me with...", "Do you know a good company for..."
   - BEST: "Which company is best for...", "Who is the best ... in the market?"
   - LOCAL: "Who can do [service] in [city]?", "Which [industry] firms are in [area]?"
   - SOLUTION: "I have [problem], which company can solve this?", "Our website ranks poorly, who can help?"
   - SPECIALIST: "Which agencies specialize in...", "Who has experience with [service] for [audience]?"
   - SPECIFIC PRODUCT: A prompt with a very specific product, service, or brand name
   - SITUATION: "We're moving offices and need...", "Our company is growing and we need..."

2. VARIETY IN SENTENCE STRUCTURE. Maximum 2 prompts may start with the same word.
   Good starters: "I'm looking", "My", "We want", "Which company", "Can anyone", "Do you know", "Our company", "Who can", "Where can I"
   FORBIDDEN: More than 2x starting with "Which" or "Where can I"

3. LENGTH: Every prompt is 10-18 words. Not shorter, not longer.

4. LANGUAGE: 100% English. Translate any non-English keywords to natural English.

5. SPECIFICITY: Use CONCRETE services/products from the keywords. The more specific, the better.
   BAD: "Which companies offer cleaning services?"
   GOOD: "Who can professionally detail the interior of my Tesla in the Dallas area?"

6. NATURAL KEYWORD INTEGRATION: NEVER paste keywords literally into a sentence. Add natural prepositions and articles.
   BAD: "who can lay poured floor living room?" (keyword pasted literally)
   GOOD: "who can lay a poured floor in the living room?"
   BAD: "specialist wall finishing office"
   GOOD: "a specialist for wall finishing in our office"

7. NATURALNESS: Sounds like a real person typing this into ChatGPT.
   BAD: "Which service providers can offer professional solutions for our organization?"
   GOOD: "Our office needs painting, who can do that quickly and neatly?"

8. COMPANY-NEUTRAL: Do NOT mention "${companyName}" or literally "${companyCategory}".

9. TRADE LANGUAGE: Use the correct verb per industry. NEVER use "install" if that's not the right term.
   - Floors: LAY/APPLY ("Who can lay a poured floor", NOT "install a floor")
   - Walls: PLASTER/APPLY/FINISH
   - Painting: PAINT
   - Roofing: ROOF/RENOVATE
   - General: if unsure, use "do" or "take care of"

10. LOCATION ALWAYS AT THE END: City/region always comes as "in [city]" at the end of the sentence.
   BAD: "a specialist for wall finishing in Amsterdam in my apartment"
   GOOD: "a specialist for seamless wall finishing in my apartment in Amsterdam"

11. LOCATION: If the user provided a service area, if the website analysis detected a location focus, or if the keywords contain a city/region name, use that location in exactly 5 of 10 prompts (the other 5 without). If NO location is known from any source, do NOT use any city or region names in the prompts.

${customTermsInstruction}`,
      messages: [{
        role: 'user',
        content: isNL
          ? `Genereer 10 prompts voor een ${websiteAnalysis?.audienceType === 'B2C' ? 'consument' : websiteAnalysis?.audienceType === 'both' ? 'consument of zakelijke klant' : 'zakelijke klant'} die op zoek is naar wat dit bedrijf aanbiedt.

**CONTEXT:**
${websiteAnalysis?.success ? `- Branche (achtergrond): "${companyCategory}"` : `- Branche: "${companyCategory}"`}
- Nederlandse markt
${websiteContext}
${searchConsoleContext}

${websiteAnalysis?.success ? `WEBSITE-DATA IS LEIDEND. De zoekwoorden komen van de website van het bedrijf.
Maak prompts over wat het bedrijf DAADWERKELIJK doet, niet over de brede branche.
Als de zoekwoorden "steenpapier notitieboeken" bevatten, maak dan prompts over steenpapier notitieboeken, NIET over "duurzame kantoorartikelen".` : ''}

CHECKLIST VOOR JE OUTPUT:
- 10 prompts als JSON array
- Elk 10-18 woorden
- Maximaal 2x hetzelfde startwoord
- Minstens 5 verschillende vraagtypen (aanbeveling, beste, lokaal, oplossing, specialist, specifiek product, situatieschets)
- 100% Nederlands, geen Engelse woorden
- Klinkt als een echt mens, niet als een zakelijke brief
- Bedrijfsnaam "${companyName}" komt NERGENS voor

["prompt 1", "prompt 2", ..., "prompt 10"]`
          : `Generate 10 prompts for a ${websiteAnalysis?.audienceType === 'B2C' ? 'consumer' : websiteAnalysis?.audienceType === 'both' ? 'consumer or business client' : 'business client'} searching for what this company offers.

**CONTEXT:**
${websiteAnalysis?.success ? `- Industry (background): "${companyCategory}"` : `- Industry: "${companyCategory}"`}
${websiteContext}
${searchConsoleContext}

${websiteAnalysis?.success ? `WEBSITE DATA IS LEADING. Keywords come from the company's actual website.
Make prompts about what the business ACTUALLY does, not the broad industry.` : ''}

CHECKLIST FOR YOUR OUTPUT:
- 10 prompts as JSON array
- Each 10-18 words
- Maximum 2x the same starting word
- At least 5 different question types (recommendation, best, local, solution, specialist, specific product, situation)
- 100% English, translate any non-English keywords
- Sounds like a real person, not a corporate brief
- Company name "${companyName}" appears NOWHERE

["prompt 1", "prompt 2", ..., "prompt 10"]`
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

    // Strip pre-text before array
    const arrayStart = cleanedText.indexOf('[')
    const arrayEnd = cleanedText.lastIndexOf(']')
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayStart < arrayEnd) {
      cleanedText = cleanedText.substring(arrayStart, arrayEnd + 1)
    }

    let prompts
    try {
      prompts = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('❌ JSON parse failed:', parseError.message, '| Raw (first 300 chars):', cleanedText.substring(0, 300))
      throw new Error('Invalid prompt format from AI')
    }

    if (!Array.isArray(prompts) || prompts.length < 5) {
      console.error('❌ AI returned invalid format or too few prompts:', prompts?.length || 'not an array')
      throw new Error('Invalid prompt format from AI')
    }

    if (prompts.length !== 10) {
      console.warn(`⚠️ AI returned ${prompts.length} prompts instead of 10, using first ${Math.min(prompts.length, 10)}`)
    }

    // Max 10 prompts
    let validatedPrompts = prompts
      .filter(p => typeof p === 'string' && p.trim().length > 10)
      .slice(0, 10)

    // ============================================
    // POST-GENERATION QUALITY CHECKS
    // ============================================

    // Language purity check for NL prompts
    if (isNL) {
      const suspiciousEnglish = new Set([
        'the', 'which', 'that', 'services', 'solutions', 'companies', 'providers',
        'business', 'professional', 'beautiful', 'quality', 'true', 'life',
        'supply', 'equipment', 'commercial', 'industrial', 'for sale',
        'buy', 'find', 'best', 'top', 'leading', 'comprehensive',
        'reliable', 'trusted', 'certified', 'experienced'
      ])
      const allowedLoanWords = new Set([
        'online', 'digital', 'specialist', 'agency', 'coach', 'coaching',
        'design', 'marketing', 'management', 'consultant', 'workshop',
        'catering', 'fitness', 'wellness', 'yoga', 'pilates', 'display',
        'software', 'hardware', 'website', 'webshop', 'hosting', 'seo',
        'ai', 'app', 'platform', 'startup', 'freelance', 'scale-up',
        'brand', 'branding', 'content', 'e-commerce', 'retail', 'b2b', 'b2c',
        'bbq', 'festival', 'event', 'spa', 'hotel', 'lounge', 'premium'
      ])
      
      validatedPrompts.forEach((prompt, i) => {
        const words = prompt.toLowerCase().split(/\s+/)
        const badWords = words.filter(w => 
          suspiciousEnglish.has(w) && !allowedLoanWords.has(w)
        )
        if (badWords.length >= 2) {
          console.warn(`⚠️ NL prompt ${i+1} has English words [${badWords.join(', ')}]: "${prompt.substring(0, 80)}..."`)
        }
      })
    }

    // Starter diversity check
    const starters = {}
    validatedPrompts.forEach(p => {
      const firstWord = p.split(/\s+/)[0].toLowerCase()
      starters[firstWord] = (starters[firstWord] || 0) + 1
    })
    const overused = Object.entries(starters).filter(([_, count]) => count > 3)
    if (overused.length > 0) {
      console.warn(`⚠️ Low starter diversity: ${overused.map(([w, c]) => `"${w}" ${c}x`).join(', ')}`)
    }

    // Word count check
    const shortOnes = validatedPrompts.filter(p => p.split(/\s+/).length < 8)
    if (shortOnes.length > 0) {
      console.warn(`⚠️ ${shortOnes.length} prompts too short (<8 words): ${shortOnes.map(p => `"${p.substring(0, 40)}..."`).join(', ')}`)
    }

    // Log quality metrics
    const avgWords = Math.round(validatedPrompts.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / validatedPrompts.length)
    const uniqueStarters = Object.keys(starters).length
    console.log(`📊 Prompt quality: ${validatedPrompts.length} prompts, avg ${avgWords} words, ${uniqueStarters} unique starters`)

    // ============================================
    // CUSTOM TERMS VALIDATION (unchanged)
    // ============================================
    if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
      const promptCount = validatedPrompts.length
      const promptsWithExcluded = validatedPrompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.exclude?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length
      
      const promptsWithIncluded = validatedPrompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.include?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const promptsWithLocation = validatedPrompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.location?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const hasForbiddenGeographic = customTerms.location?.some(t => 
        !t.toLowerCase().includes('landelijk') && 
        !t.toLowerCase().includes('nederland') &&
        !t.toLowerCase().includes('nationaal')
      ) ? validatedPrompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return lowerPrompt.includes('nederland') || 
               lowerPrompt.includes('belgie') || 
               lowerPrompt.includes('belgië') ||
               (lowerPrompt.includes('landelijk') && !customTerms.location.some(t => t.toLowerCase().includes('landelijk')))
      }).length : 0

      console.log(`✅ Custom terms validation (${promptCount} prompts):`)
      console.log(`   - ${promptsWithExcluded}/${promptCount} contain excluded terms (target: 0)`)
      if (customTerms.include?.length > 0) {
        console.log(`   - ${promptsWithIncluded}/${promptCount} contain included terms (target: 7+)`)
      }
      if (customTerms.location?.length > 0) {
        console.log(`   - ${promptsWithLocation}/${promptCount} contain location terms (target: 5)`)
        console.log(`   - ${hasForbiddenGeographic}/${promptCount} contain forbidden geographic terms (target: 0)`)
      }
      
      if (promptsWithExcluded > 0) {
        console.warn(`⚠️ WARNING: ${promptsWithExcluded} prompts contain EXCLUDED terms!`)
      }
      if (customTerms.include?.length > 0 && promptsWithIncluded < 7) {
        console.warn(`⚠️ WARNING: Only ${promptsWithIncluded}/${promptCount} contain included terms (target: 7+)`)
      }
      if (customTerms.location?.length > 0 && promptsWithLocation < 4) {
        console.warn(`⚠️ WARNING: Only ${promptsWithLocation}/${promptCount} contain location terms (target: 5)`)
      }
      if (hasForbiddenGeographic > 0) {
        console.warn(`⚠️ WARNING: ${hasForbiddenGeographic} prompts contain forbidden geographic terms`)
      }
    }

    return { success: true, prompts: validatedPrompts }
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
          max_completion_tokens: 250
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

    const parsed = parseWithJS(rawOutput, companyName, isNL)

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