// app/api/geo-audit/route.js
// ============================================
// GEO AUDIT API — Public (no auth required)
// Scrapes page → Claude analysis → Perplexity LIVE test
// i18n: supports nl + en
// ============================================

export const maxDuration = 120

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY
const PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// ============================================
// i18n MESSAGES
// ============================================
const MESSAGES = {
  nl: {
    urlRequired: 'URL is verplicht',
    pageLoadFailed: 'Kon de pagina niet laden. Controleer of de URL correct is.',
    languageError: 'De GEO Audit is alleen beschikbaar voor Nederlandstalige websites. Deze pagina lijkt niet in het Nederlands te zijn.',
    pageUnreachable: 'Kon de pagina niet bereiken. Controleer of de URL correct en toegankelijk is.',
    invalidUrl: 'Ongeldige URL. Controleer het formaat (bijv. https://voorbeeld.nl).',
    tempError: 'Er is een tijdelijk probleem met onze dienst. Probeer het over een paar minuten opnieuw.',
    generalError: 'Er ging iets mis bij het analyseren. Probeer het opnieuw.',
    // Technical check strings
    chars: 'tekens',
    tooLong: 'Te lang',
    max: 'max',
    missingOrShort: 'Ontbreekt of te kort',
    goodAsSummary: 'goed als AI-samenvatting',
    missingAiSummary: 'Ontbreekt — AI gebruikt dit als eerste samenvatting',
    found: 'gevonden',
    onlyBasicTypes: 'Alleen basis-types',
    addOrgFaq: 'voeg Organization, FAQPage toe',
    noJsonLd: 'Geen JSON-LD structured data gevonden',
    faqGood: 'Verhoogt kans op directe AI-citatie',
    faqContentNoSchema: 'FAQ-content gevonden maar geen FAQPage schema',
    faqMissing: 'AI-platformen citeren FAQ\'s vaak direct',
    ogPresent: 'Open Graph afbeelding aanwezig',
    ogMissing: 'Ontbreekt — bepaalt hoe AI je content presenteert',
    headingGood: 'helder voor AI',
    headingMore: 'meer H2\'s helpt AI structuur begrijpen',
    headingNoH1: 'Geen H1 gevonden',
    words: 'woorden',
    moreContent: 'meer content = meer context voor AI',
    tooFewWords: 'te weinig om te citeren',
    robotsBlocks: 'Blokkeert',
    robotsInvisible: 'onzichtbaar voor deze AI\'s',
    robotsGood: 'AI-bots niet geblokkeerd',
    robotsNone: 'Geen robots.txt gevonden',
    llmsGood: 'Geeft AI directe instructies over je bedrijf',
    llmsMissing: 'Geen llms.txt — overweeg dit toe te voegen',
    altGood: 'van afbeeldingen heeft alt-tekst',
    altAdd: 'voeg alt-tekst toe aan alle afbeeldingen',
    altBad: 'heeft alt-tekst',
    cwvExcellent: 'uitstekend',
    cwvImprovable: 'verbeterbaar',
    cwvSlow: 'trage site benadeelt AI-ranking',
    lcpFast: 'snel geladen',
    lcpSlow: 'boven 2.5s vertraagt indexering',
    lcpTooSlow: 'te traag voor AI-crawlers',
    clsStable: 'stabiele layout',
    clsShifts: 'layout verschuift',
    clsUnstable: 'instabiele layout',
    mobileNo: 'Geen viewport meta tag — AI-platformen geven voorkeur aan mobiel-vriendelijke sites',
    mobileYes: 'Viewport correct geconfigureerd',
    richGood: 'geschikt voor rich results in Google',
    richOnlyOne: 'genereert rich results — voeg',
    richAdd: 'toe',
    richIncomplete: 'Schema onvolledig',
    richMissing: 'mist',
    richNone: 'Geen rich result-geschikt schema',
    richPresent: 'aanwezig maar genereert geen rich results',
    techGood: 'Technisch goed voorbereid op AI-platformen',
    techFair: 'Verbeterbaar — belangrijke elementen ontbreken',
    techPoor: 'Onvoldoende voorbereid op AI-platformen',
    catContent: 'AI Content Kwaliteit',
    catTechnical: 'Technische AI-gereedheid',
    catCitation: 'Citatie-potentieel',
    catEeat: 'E-E-A-T Signalen',
    // Fallback analysis
    analysisIncomplete: 'Analyse kon niet volledig worden uitgevoerd',
    makeAccount: 'Maak een account voor uitgebreide analyse',
    addFaqSchema: 'Voeg FAQPage structured data toe',
    addMetaDesc: 'Zorg voor een duidelijke meta description',
    fullAnalysis: 'Maak een gratis account voor de volledige analyse',
    // Priority labels
    kritiek: 'kritiek',
    hoog: 'hoog',
    middel: 'middel',
    laag: 'laag',
    // Slack
    slackCompany: 'Bedrijf',
    slackUnknown: 'Onbekend',
    slackFound: '✅ Gevonden',
    slackNotFound: '❌ Niet gevonden',
  },
  en: {
    urlRequired: 'URL is required',
    pageLoadFailed: 'Could not load the page. Please check if the URL is correct.',
    languageError: 'The GEO Audit is currently only available for Dutch-language websites.',
    pageUnreachable: 'Could not reach the page. Please check if the URL is correct and accessible.',
    invalidUrl: 'Invalid URL. Please check the format (e.g. https://example.com).',
    tempError: 'There is a temporary issue with our service. Please try again in a few minutes.',
    generalError: 'Something went wrong during analysis. Please try again.',
    chars: 'characters',
    tooLong: 'Too long',
    max: 'max',
    missingOrShort: 'Missing or too short',
    goodAsSummary: 'good as AI summary',
    missingAiSummary: 'Missing — AI uses this as first summary',
    found: 'found',
    onlyBasicTypes: 'Only basic types',
    addOrgFaq: 'add Organization, FAQPage',
    noJsonLd: 'No JSON-LD structured data found',
    faqGood: 'Increases chance of direct AI citation',
    faqContentNoSchema: 'FAQ content found but no FAQPage schema',
    faqMissing: 'AI platforms often cite FAQs directly',
    ogPresent: 'Open Graph image present',
    ogMissing: 'Missing — determines how AI presents your content',
    headingGood: 'clear for AI',
    headingMore: 'more H2s helps AI understand structure',
    headingNoH1: 'No H1 found',
    words: 'words',
    moreContent: 'more content = more context for AI',
    tooFewWords: 'too few to cite',
    robotsBlocks: 'Blocks',
    robotsInvisible: 'invisible to these AIs',
    robotsGood: 'AI bots not blocked',
    robotsNone: 'No robots.txt found',
    llmsGood: 'Gives AI direct instructions about your business',
    llmsMissing: 'No llms.txt — consider adding this',
    altGood: 'of images have alt text',
    altAdd: 'add alt text to all images',
    altBad: 'have alt text',
    cwvExcellent: 'excellent',
    cwvImprovable: 'needs improvement',
    cwvSlow: 'slow site hurts AI ranking',
    lcpFast: 'fast load',
    lcpSlow: 'above 2.5s delays indexing',
    lcpTooSlow: 'too slow for AI crawlers',
    clsStable: 'stable layout',
    clsShifts: 'layout shifts',
    clsUnstable: 'unstable layout',
    mobileNo: 'No viewport meta tag — AI platforms prefer mobile-friendly sites',
    mobileYes: 'Viewport correctly configured',
    richGood: 'eligible for rich results in Google',
    richOnlyOne: 'generates rich results — add',
    richAdd: '',
    richIncomplete: 'Schema incomplete',
    richMissing: 'missing',
    richNone: 'No rich result-eligible schema',
    richPresent: 'present but does not generate rich results',
    techGood: 'Technically well prepared for AI platforms',
    techFair: 'Improvable — important elements missing',
    techPoor: 'Insufficiently prepared for AI platforms',
    catContent: 'AI Content Quality',
    catTechnical: 'Technical AI Readiness',
    catCitation: 'Citation Potential',
    catEeat: 'E-E-A-T Signals',
    analysisIncomplete: 'Analysis could not be fully completed',
    makeAccount: 'Create an account for comprehensive analysis',
    addFaqSchema: 'Add FAQPage structured data',
    addMetaDesc: 'Ensure a clear meta description',
    fullAnalysis: 'Create a free account for the full analysis',
    kritiek: 'critical',
    hoog: 'high',
    middel: 'medium',
    laag: 'low',
    slackCompany: 'Company',
    slackUnknown: 'Unknown',
    slackFound: '✅ Found',
    slackNotFound: '❌ Not found',
  }
}

function getMsg(locale) { return MESSAGES[locale] || MESSAGES['nl'] }

// ✅ Slack lead notificatie
async function sendSlackLeadNotification({ url, companyName, score, mentioned }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🔍 Nieuwe GEO Audit Lead!', emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*URL:*\n${url}` },
              { type: 'mrkdwn', text: `*Bedrijf:*\n${companyName || 'Onbekend'}` },
              { type: 'mrkdwn', text: `*GEO Score:*\n${score}/100` },
              { type: 'mrkdwn', text: `*Perplexity:*\n${mentioned ? '✅ Gevonden' : '❌ Niet gevonden'}` }
            ]
          },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `${new Date().toLocaleString('nl-NL')} · GEO Audit Tool` }]
          }
        ]
      })
    })
  } catch (e) {
    console.error('[GEO Audit] Slack error:', e.message)
  }
}


// ✅ URL Resolution
async function resolveUrl(inputUrl) {
  try {
    const urlObj = new URL(inputUrl)
    urlObj.hostname = urlObj.hostname.toLowerCase()
    let resolved = urlObj.toString()

    const response = await fetch(resolved, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TeunAI/1.0; +https://teun.ai)' }
    })

    if (response.url && response.url !== resolved) {
      console.log(`[GEO Audit] URL resolved: ${inputUrl} → ${response.url}`)
      resolved = response.url
    }
    return resolved
  } catch (e) {
    console.warn(`[GEO Audit] URL resolve failed, using lowercase:`, e.message)
    try {
      const urlObj = new URL(inputUrl)
      urlObj.hostname = urlObj.hostname.toLowerCase()
      return urlObj.toString()
    } catch { return inputUrl }
  }
}


// ━━━ CORE WEB VITALS ━━━
async function fetchCoreWebVitals(url) {
  console.log(`[GEO Audit] CWV check — API key present: ${!!PAGESPEED_API_KEY}, URL: ${url}`)
  if (!PAGESPEED_API_KEY) { console.log('[GEO Audit] ❌ No GOOGLE_PAGESPEED_API_KEY — skipping CWV'); return null }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${PAGESPEED_API_KEY}&category=performance&strategy=mobile`
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(45000) })
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.warn(`[GEO Audit] ❌ PageSpeed API error: ${response.status} — ${errorBody.substring(0, 200)}`)
      return null
    }

    const data = await response.json()
    const crux = data.loadingExperience?.metrics || {}
    const fieldLCP = crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile
    const fieldCLS = crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
    const fieldINP = crux.INTERACTION_TO_NEXT_PAINT?.percentile || crux.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT?.percentile
    const fieldTTFB = crux.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile
    
    const audit = data.lighthouseResult?.audits || {}
    const labLCP = audit['largest-contentful-paint']?.numericValue
    const labCLS = audit['cumulative-layout-shift']?.numericValue
    const labTBT = audit['total-blocking-time']?.numericValue
    const labSI = audit['speed-index']?.numericValue
    
    const performanceScore = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100)
    const mobileFriendly = data.lighthouseResult?.audits?.['viewport']?.score === 1

    return {
      performanceScore, mobileFriendly,
      field: { lcp: fieldLCP ? Math.round(fieldLCP) : null, cls: fieldCLS ? (fieldCLS / 100) : null, inp: fieldINP ? Math.round(fieldINP) : null, ttfb: fieldTTFB ? Math.round(fieldTTFB) : null },
      lab: { lcp: labLCP ? Math.round(labLCP) : null, cls: labCLS ? Math.round(labCLS * 1000) / 1000 : null, tbt: labTBT ? Math.round(labTBT) : null, si: labSI ? Math.round(labSI) : null }
    }
  } catch (e) {
    console.warn(`[GEO Audit] ❌ CWV fetch failed: ${e.message}`)
    return null
  }
}


// ━━━ RICH SNIPPET VALIDATION ━━━
function analyzeRichSnippets(structuredData, structuredDataTypes) {
  const results = { eligible: [], validSchema: [], missing: [], details: [] }

  const richResultTypes = {
    'FAQPage': ['mainEntity'], 'HowTo': ['name', 'step'], 'Product': ['name'],
    'Recipe': ['name', 'recipeIngredient'], 'Event': ['name', 'startDate', 'location'],
    'VideoObject': ['name', 'uploadDate', 'thumbnailUrl'], 'BreadcrumbList': ['itemListElement'],
    'Review': ['itemReviewed', 'reviewRating'], 'AggregateRating': ['ratingValue', 'reviewCount'],
    'LocalBusiness': ['name', 'address'], 'JobPosting': ['title', 'datePosted'], 'Course': ['name', 'provider'],
  }
  const validSchemaTypes = ['Organization', 'WebSite', 'WebPage', 'Article', 'BlogPosting', 'Service', 'Person']

  const allItems = []
  structuredData.forEach(item => {
    if (item['@graph']) { item['@graph'].forEach(g => allItems.push(g)) } else { allItems.push(item) }
  })

  allItems.forEach(item => {
    const type = Array.isArray(item['@type']) ? item['@type'][0] : item['@type']
    if (!type) return

    const requirements = richResultTypes[type]
    if (requirements) {
      const present = requirements.filter(prop => { const val = item[prop]; return val !== undefined && val !== null && val !== '' })
      const missingProps = requirements.filter(prop => !present.includes(prop))

      if (missingProps.length === 0) {
        results.eligible.push(type)
        results.details.push({ type, status: 'complete', message: `${type} — rich results eligible` })
      } else {
        results.missing.push(type)
        results.details.push({ type, status: 'incomplete', message: `${type} missing: ${missingProps.join(', ')}`, missingProps })
      }
    } else if (validSchemaTypes.includes(type)) {
      results.validSchema.push(type)
    }
  })

  const presentTypes = new Set([...results.eligible, ...results.missing, ...structuredDataTypes])
  const suggestedTypes = ['FAQPage', 'Product', 'LocalBusiness', 'HowTo', 'VideoObject'].filter(t => !presentTypes.has(t))
  return { ...results, suggestedTypes }
}


// ━━━ MAIN HANDLER ━━━
export async function POST(request) {
  let locale = 'nl'
  try {
    const body = await request.json()
    const { url } = body
    locale = body.locale || 'nl'
    const m = getMsg(locale)

    if (!url) {
      return NextResponse.json({ error: m.urlRequired }, { status: 400 })
    }

    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http')) normalizedUrl = 'https://' + normalizedUrl

    // STEP 0: RESOLVE URL
    normalizedUrl = await resolveUrl(normalizedUrl)
    const urlObj = new URL(normalizedUrl)
    const domain = urlObj.origin
    const hostname = urlObj.hostname.replace(/^www\./, '')

    // STEP 1: SCRAPE THE PAGE
    let html
    try {
      const scrapeResponse = await fetch(
        `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}&render=true`,
        { signal: AbortSignal.timeout(45000) }
      )
      if (scrapeResponse.ok) {
        html = await scrapeResponse.text()
      }
    } catch (e) {
      console.warn('[GEO Audit] Render scrape failed, retrying without render:', e.message)
    }

    // Fallback: zonder render (sneller, werkt voor de meeste sites)
    if (!html) {
      try {
        const scrapeResponse = await fetch(
          `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(normalizedUrl)}`,
          { signal: AbortSignal.timeout(30000) }
        )
        if (scrapeResponse.ok) {
          html = await scrapeResponse.text()
        }
      } catch (e) {
        console.warn('[GEO Audit] Non-render scrape also failed:', e.message)
      }
    }

    if (!html) {
      return NextResponse.json({ error: m.pageLoadFailed }, { status: 400 })
    }

    // LANGUAGE CHECK — only for NL locale, skip for EN
    if (locale === 'nl') {
      const isDutchTLD = hostname.endsWith('.nl') || hostname.endsWith('.be')
      const htmlLangMatch = html.match(/<html[^>]*\slang=["']([^"']+)["']/i)
      const htmlLang = htmlLangMatch ? htmlLangMatch[1].toLowerCase().substring(0, 2) : null
      const isDutchLang = htmlLang === 'nl'
      
      const lowerHtml = html.substring(0, 5000).toLowerCase()
      const dutchSignals = ['welkom', 'onze', 'diensten', 'contact', 'meer informatie', 'over ons', 'lees meer', 'uw ', 'wij ', 'voor uw', 'nederland']
      const dutchWordCount = dutchSignals.filter(w => lowerHtml.includes(w)).length
      const isDutchContent = dutchWordCount >= 2

      if (!isDutchTLD && !isDutchLang && !isDutchContent) {
        return NextResponse.json({ error: m.languageError, errorType: 'language' }, { status: 400 })
      }
    }

    // Canonical check
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
      || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)
    let resolvedDomain = domain
    let resolvedHostname = hostname
    if (canonicalMatch && canonicalMatch[1].startsWith('http')) {
      try {
        const canonical = new URL(canonicalMatch[1])
        if (canonical.hostname.toLowerCase() !== urlObj.hostname.toLowerCase()) {
          normalizedUrl = canonical.href
          resolvedDomain = canonical.origin
          resolvedHostname = canonical.hostname.replace(/^www\./, '')
        }
      } catch (e) {}
    }

    // STEP 2: EXTRACT CONTENT
    const extracted = extractContent(html)

    // STEP 3: ROBOTS + LLMS + CWV (parallel)
    const [robotsTxt, llmsTxt, coreWebVitals] = await Promise.all([
      fetchTextFile(`${resolvedDomain}/robots.txt`),
      fetchTextFile(`${resolvedDomain}/llms.txt`),
      fetchCoreWebVitals(normalizedUrl)
    ])

    const richSnippets = analyzeRichSnippets(extracted.structuredData, extracted.structuredDataTypes)

    // STEP 4: TECHNICAL CHECKS
    const technicalChecks = analyzeTechnical(extracted, robotsTxt, llmsTxt, coreWebVitals, richSnippets, m)

    // STEP 5: AI CONTENT ANALYSIS (Claude)
    const aiAnalysis = await analyzeContentWithClaude(extracted, resolvedHostname, normalizedUrl, locale, m)

    // STEP 6: LIVE PERPLEXITY TEST
    let liveTest = null
    if (aiAnalysis?.generatedPrompt) {
      liveTest = await testPromptOnPerplexity(aiAnalysis.generatedPrompt, aiAnalysis.companyName || resolvedHostname, resolvedHostname, locale)
    }

    // COMBINE SCORES
    const liveTestScore = liveTest ? (liveTest.mentioned ? 100 : 15) : 50
    const overallScore = Math.round(
      (aiAnalysis.contentScore * 0.30) + (technicalChecks.score * 0.25) +
      (aiAnalysis.citationScore * 0.20) + (aiAnalysis.eatScore * 0.10) + (liveTestScore * 0.15)
    )

    // ✅ Track anonymous scan with website + company_name for admin leads
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') || 'unknown'
    if (ip !== 'unknown') {
      try {
        await supabaseAdmin
          .from('anonymous_scans')
          .upsert({
            ip_address: ip,
            tool_name: 'geo-audit',
            scans_made: 1,
            last_scan_at: new Date().toISOString(),
            website: normalizedUrl || null,
            company_name: aiAnalysis.companyName || resolvedHostname || null
          }, { onConflict: 'ip_address,tool_name' })
      } catch (e) {
        console.error('[GEO Audit] Anonymous scan tracking error:', e.message)
      }
    }

    sendSlackLeadNotification({ url: normalizedUrl, companyName: aiAnalysis.companyName || resolvedHostname, score: overallScore, mentioned: liveTest?.mentioned || false }).catch(() => {})

    return NextResponse.json({
      success: true,
      url: normalizedUrl,
      domain: resolvedHostname,
      extracted: {
        title: extracted.title, description: extracted.description, wordCount: extracted.wordCount,
        headingCount: extracted.headings.length, hasStructuredData: extracted.structuredData.length > 0,
        structuredDataTypes: extracted.structuredDataTypes, hasFAQ: extracted.hasFAQ,
        hasRobotsTxt: !!robotsTxt, hasLlmsTxt: !!llmsTxt,
        imageCount: extracted.imageCount, imagesWithAlt: extracted.imagesWithAlt,
        richSnippets: richSnippets ? { eligible: richSnippets.eligible, validSchema: richSnippets.validSchema, missing: richSnippets.missing, suggestedTypes: richSnippets.suggestedTypes } : null,
        coreWebVitals: coreWebVitals ? { performanceScore: coreWebVitals.performanceScore, mobileFriendly: coreWebVitals.mobileFriendly, lcp: coreWebVitals.field?.lcp || coreWebVitals.lab?.lcp, cls: coreWebVitals.field?.cls ?? coreWebVitals.lab?.cls, inp: coreWebVitals.field?.inp } : null,
      },
      analysis: {
        overallScore,
        categories: [
          { name: m.catContent, slug: 'content', score: aiAnalysis.contentScore, icon: '📝', summary: aiAnalysis.contentSummary, checks: aiAnalysis.contentChecks || [] },
          { name: m.catTechnical, slug: 'technical', score: technicalChecks.score, icon: '⚙️', summary: technicalChecks.summary, checks: technicalChecks.checks },
          { name: m.catCitation, slug: 'citation', score: aiAnalysis.citationScore, icon: '🎯', summary: aiAnalysis.citationSummary, checks: aiAnalysis.citationChecks || [] },
          { name: m.catEeat, slug: 'eeat', score: aiAnalysis.eatScore, icon: '🏆', summary: aiAnalysis.eatSummary, checks: aiAnalysis.eatChecks || [] }
        ],
        topRecommendations: aiAnalysis.topRecommendations || [],
        generatedPrompt: aiAnalysis.generatedPrompt || null,
        companyName: aiAnalysis.companyName || resolvedHostname,
      },
      liveTest: liveTest ? { prompt: aiAnalysis.generatedPrompt, mentioned: liveTest.mentioned, mentionCount: liveTest.mentionCount, snippet: liveTest.snippet, competitors: liveTest.competitors, platform: 'Perplexity' } : null
    })

  } catch (error) {
    console.error('[GEO Audit] Error:', error?.message || error)
    const m = getMsg(locale)
    const msg = error?.message || ''
    if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      return NextResponse.json({ error: m.pageUnreachable, debug: msg.substring(0, 200) }, { status: 400 })
    }
    if (msg.includes('Invalid URL') || msg.includes('URL')) {
      return NextResponse.json({ error: m.invalidUrl, debug: msg.substring(0, 200) }, { status: 400 })
    }
    if (msg.includes('API') || msg.includes('401') || msg.includes('403') || msg.includes('429')) {
      return NextResponse.json({ error: m.tempError, debug: msg.substring(0, 200) }, { status: 503 })
    }
    return NextResponse.json({ error: m.generalError, debug: msg.substring(0, 200) }, { status: 500 })
  }
}


// ━━━ HTML CONTENT EXTRACTION ━━━
function extractContent(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? cleanText(titleMatch[1]) : ''

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i)
  const description = descMatch ? cleanText(descMatch[1]) : ''

  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']/i)
  const hasOgImage = !!ogImageMatch

  const headings = []
  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi
  let match
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({ level: match[1].toLowerCase(), text: cleanText(match[2]) })
  }

  let bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 1).length

  const structuredData = []
  const structuredDataTypes = []
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim())
      structuredData.push(data)
      if (data['@type']) { const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]; structuredDataTypes.push(...types) }
      if (data['@graph']) { data['@graph'].forEach(item => { if (item['@type']) { const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]; structuredDataTypes.push(...types) } }) }
    } catch (e) {}
  }

  const hasFAQ = structuredDataTypes.includes('FAQPage')
    || /faq|veelgestelde vragen|veel gestelde vragen|frequently asked/i.test(html)
    || headings.some(h => /faq|vraag|vragen|questions/i.test(h.text))

  const imgRegex = /<img[^>]*>/gi
  const images = []
  while ((match = imgRegex.exec(html)) !== null) {
    const altMatch = match[0].match(/alt=["']([\s\S]*?)["']/i)
    images.push({ hasAlt: !!altMatch && altMatch[1].trim().length > 0 })
  }

  return { title, description, hasOgImage, headings, bodyText: bodyText.substring(0, 4000), wordCount, structuredData, structuredDataTypes: [...new Set(structuredDataTypes)], hasFAQ, imageCount: images.length, imagesWithAlt: images.filter(i => i.hasAlt).length }
}


// ━━━ TECHNICAL ANALYSIS ━━━
function analyzeTechnical(extracted, robotsTxt, llmsTxt, cwv, richSnippets, m) {
  const checks = []
  let score = 0
  let maxScore = 0

  // Title tag
  maxScore += 10
  if (extracted.title && extracted.title.length > 10) {
    if (extracted.title.length <= 60) {
      checks.push({ name: 'Title tag', status: 'good', detail: `"${extracted.title.substring(0, 55)}${extracted.title.length > 55 ? '…' : ''}" (${extracted.title.length} ${m.chars})`, priority: m.hoog })
      score += 10
    } else {
      checks.push({ name: 'Title tag', status: 'warning', detail: `${m.tooLong}: ${extracted.title.length} ${m.chars} (${m.max} 60)`, priority: m.hoog })
      score += 5
    }
  } else {
    checks.push({ name: 'Title tag', status: 'error', detail: m.missingOrShort, priority: m.hoog })
  }

  // Meta description
  maxScore += 10
  if (extracted.description && extracted.description.length > 50) {
    if (extracted.description.length <= 160) {
      checks.push({ name: 'Meta description', status: 'good', detail: `${extracted.description.length} ${m.chars} — ${m.goodAsSummary}`, priority: m.hoog })
      score += 10
    } else {
      checks.push({ name: 'Meta description', status: 'warning', detail: `${m.tooLong}: ${extracted.description.length} ${m.chars}`, priority: m.hoog })
      score += 5
    }
  } else {
    checks.push({ name: 'Meta description', status: 'error', detail: m.missingAiSummary, priority: m.hoog })
  }

  // Structured Data
  maxScore += 15
  if (extracted.structuredDataTypes.length > 0) {
    const basicTypes = ['WebPage', 'WebSite', 'CollectionPage', 'SearchAction', 'SiteNavigationElement', 'WPHeader', 'WPFooter', 'ImageObject']
    const valuableTypes = extracted.structuredDataTypes.filter(t => !basicTypes.includes(t))
    const allTypes = extracted.structuredDataTypes
    
    if (valuableTypes.length >= 2) {
      checks.push({ name: 'Structured Data', status: 'good', detail: `${valuableTypes.join(', ')} ${m.found}`, priority: m.hoog })
      score += 15
    } else if (valuableTypes.length === 1) {
      checks.push({ name: 'Structured Data', status: 'warning', detail: `Only ${valuableTypes[0]} — ${m.addOrgFaq}`, priority: m.hoog })
      score += 8
    } else {
      checks.push({ name: 'Structured Data', status: 'warning', detail: `${m.onlyBasicTypes} (${allTypes.join(', ')}) — ${m.addOrgFaq}`, priority: m.hoog })
      score += 4
    }
  } else {
    checks.push({ name: 'Structured Data', status: 'error', detail: m.noJsonLd, priority: m.hoog })
  }

  // FAQ Schema
  maxScore += 10
  if (extracted.structuredDataTypes.includes('FAQPage')) {
    checks.push({ name: 'FAQPage Schema', status: 'good', detail: m.faqGood, priority: m.hoog })
    score += 10
  } else if (extracted.hasFAQ) {
    checks.push({ name: 'FAQPage Schema', status: 'warning', detail: m.faqContentNoSchema, priority: m.hoog })
    score += 4
  } else {
    checks.push({ name: 'FAQPage Schema', status: 'error', detail: m.faqMissing, priority: m.middel })
  }

  // og:image
  maxScore += 5
  if (extracted.hasOgImage) {
    checks.push({ name: 'og:image', status: 'good', detail: m.ogPresent, priority: m.middel })
    score += 5
  } else {
    checks.push({ name: 'og:image', status: 'error', detail: m.ogMissing, priority: m.middel })
  }

  // Headings
  maxScore += 10
  const h1Count = extracted.headings.filter(h => h.level === 'h1').length
  const h2Count = extracted.headings.filter(h => h.level === 'h2').length
  if (h1Count === 1 && h2Count >= 2) {
    checks.push({ name: 'Heading structure', status: 'good', detail: `${h1Count}× H1, ${h2Count}× H2 — ${m.headingGood}`, priority: m.middel })
    score += 10
  } else if (h1Count >= 1) {
    checks.push({ name: 'Heading structure', status: 'warning', detail: `${h1Count}× H1, ${h2Count}× H2 — ${m.headingMore}`, priority: m.middel })
    score += 5
  } else {
    checks.push({ name: 'Heading structure', status: 'error', detail: m.headingNoH1, priority: m.hoog })
  }

  // Word count
  maxScore += 10
  if (extracted.wordCount >= 800) {
    checks.push({ name: 'Content length', status: 'good', detail: `${extracted.wordCount} ${m.words}`, priority: m.middel })
    score += 10
  } else if (extracted.wordCount >= 300) {
    checks.push({ name: 'Content length', status: 'warning', detail: `${extracted.wordCount} ${m.words} — ${m.moreContent}`, priority: m.middel })
    score += 5
  } else {
    checks.push({ name: 'Content length', status: 'error', detail: `${extracted.wordCount} ${m.words} — ${m.tooFewWords}`, priority: m.hoog })
  }

  // robots.txt
  maxScore += 10
  if (robotsTxt) {
    const bots = ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']
    const blocked = bots.filter(bot => new RegExp(`user-agent:\\s*${bot}[\\s\\S]*?disallow:\\s*\\/`, 'im').test(robotsTxt))
    if (blocked.length > 0) {
      checks.push({ name: 'robots.txt', status: 'error', detail: `${m.robotsBlocks}: ${blocked.join(', ')} — ${m.robotsInvisible}`, priority: m.kritiek })
    } else {
      checks.push({ name: 'robots.txt', status: 'good', detail: m.robotsGood, priority: m.hoog })
      score += 10
    }
  } else {
    checks.push({ name: 'robots.txt', status: 'warning', detail: m.robotsNone, priority: m.middel })
    score += 5
  }

  // llms.txt
  maxScore += 10
  if (llmsTxt) {
    checks.push({ name: 'llms.txt', status: 'good', detail: m.llmsGood, priority: m.middel })
    score += 10
  } else {
    checks.push({ name: 'llms.txt', status: 'warning', detail: m.llmsMissing, priority: m.middel })
  }

  // Alt texts
  maxScore += 10
  if (extracted.imageCount > 0) {
    const pct = Math.round((extracted.imagesWithAlt / extracted.imageCount) * 100)
    if (pct >= 80) {
      checks.push({ name: 'Alt texts', status: 'good', detail: `${pct}% ${m.altGood}`, priority: m.laag })
      score += 10
    } else if (pct >= 50) {
      checks.push({ name: 'Alt texts', status: 'warning', detail: `${pct}% — ${m.altAdd}`, priority: m.middel })
      score += 5
    } else {
      checks.push({ name: 'Alt texts', status: 'error', detail: `${pct}% ${m.altBad}`, priority: m.middel })
    }
  }

  // Core Web Vitals
  if (cwv) {
    maxScore += 15
    const perfScore = cwv.performanceScore
    if (perfScore >= 90) { checks.push({ name: 'Core Web Vitals', status: 'good', detail: `Performance score: ${perfScore}/100 — ${m.cwvExcellent}`, priority: m.hoog }); score += 15 }
    else if (perfScore >= 50) { checks.push({ name: 'Core Web Vitals', status: 'warning', detail: `Performance score: ${perfScore}/100 — ${m.cwvImprovable}`, priority: m.hoog }); score += 8 }
    else { checks.push({ name: 'Core Web Vitals', status: 'error', detail: `Performance score: ${perfScore}/100 — ${m.cwvSlow}`, priority: m.hoog }); score += 3 }

    const lcp = cwv.field?.lcp || cwv.lab?.lcp
    if (lcp) {
      maxScore += 5
      const lcpSec = (lcp / 1000).toFixed(1)
      if (lcp <= 2500) { checks.push({ name: 'LCP', status: 'good', detail: `${lcpSec}s — ${m.lcpFast}`, priority: m.middel }); score += 5 }
      else if (lcp <= 4000) { checks.push({ name: 'LCP', status: 'warning', detail: `${lcpSec}s — ${m.lcpSlow}`, priority: m.middel }); score += 2 }
      else { checks.push({ name: 'LCP', status: 'error', detail: `${lcpSec}s — ${m.lcpTooSlow}`, priority: m.hoog }) }
    }

    const cls = cwv.field?.cls ?? cwv.lab?.cls
    if (cls !== null && cls !== undefined) {
      maxScore += 5
      if (cls <= 0.1) { checks.push({ name: 'CLS', status: 'good', detail: `${cls} — ${m.clsStable}`, priority: m.middel }); score += 5 }
      else if (cls <= 0.25) { checks.push({ name: 'CLS', status: 'warning', detail: `${cls} — ${m.clsShifts}`, priority: m.middel }); score += 2 }
      else { checks.push({ name: 'CLS', status: 'error', detail: `${cls} — ${m.clsUnstable}`, priority: m.middel }) }
    }

    if (cwv.mobileFriendly === false) { maxScore += 5; checks.push({ name: 'Mobile-friendly', status: 'error', detail: m.mobileNo, priority: m.hoog }) }
    else if (cwv.mobileFriendly === true) { maxScore += 5; checks.push({ name: 'Mobile-friendly', status: 'good', detail: m.mobileYes, priority: m.middel }); score += 5 }
  }

  // Rich Snippets
  if (richSnippets) {
    maxScore += 10
    if (richSnippets.eligible.length >= 2) {
      checks.push({ name: 'Rich Snippets', status: 'good', detail: `${richSnippets.eligible.join(', ')} — ${m.richGood}`, priority: m.hoog }); score += 10
    } else if (richSnippets.eligible.length === 1) {
      const suggestion = richSnippets.suggestedTypes.slice(0, 2).join(', ')
      checks.push({ name: 'Rich Snippets', status: 'warning', detail: `${richSnippets.eligible[0]} ${m.richOnlyOne} ${suggestion} ${m.richAdd}`, priority: m.hoog }); score += 5
    } else if (richSnippets.missing.length > 0) {
      const incomplete = richSnippets.details.filter(d => d.status === 'incomplete').map(d => `${d.type} (${m.richMissing}: ${d.missingProps.join(', ')})`).join('; ')
      checks.push({ name: 'Rich Snippets', status: 'warning', detail: `${m.richIncomplete}: ${incomplete}`, priority: m.hoog }); score += 2
    } else {
      const suggestion = richSnippets.suggestedTypes.slice(0, 3).join(', ')
      const validNote = richSnippets.validSchema?.length > 0 ? ` (${richSnippets.validSchema.join(', ')} ${m.richPresent})` : ''
      checks.push({ name: 'Rich Snippets', status: 'error', detail: `${m.richNone}${validNote} — add ${suggestion || 'FAQPage, Product'}`, priority: m.hoog })
    }
  }

  const finalScore = Math.round((score / maxScore) * 100)
  return {
    score: finalScore,
    summary: finalScore >= 70 ? m.techGood : finalScore >= 40 ? m.techFair : m.techPoor,
    checks
  }
}


// ━━━ CLAUDE CONTENT ANALYSIS + PROMPT GENERATION ━━━
async function analyzeContentWithClaude(extracted, hostname, url, locale, m) {
  const isEn = locale === 'en'
  try {
    const systemPrompt = isEn
      ? `You are a GEO (Generative Engine Optimization) expert. You analyse web pages for their suitability to be cited by AI platforms (ChatGPT, Perplexity, Google AI).

Always respond as pure JSON. No markdown, no backticks, no explanation — only the JSON.`
      : `Je bent een GEO (Generative Engine Optimization) expert. Je analyseert webpagina's op hun geschiktheid om geciteerd te worden door AI-platformen (ChatGPT, Perplexity, Google AI).

Antwoord ALTIJD als pure JSON. Geen markdown, geen backticks, geen uitleg — alleen de JSON.`

    const userPrompt = isEn
      ? `Analyse this web page for GEO suitability.

URL: ${url}
Title: ${extracted.title}
Meta description: ${extracted.description}
Headings: ${extracted.headings.slice(0, 15).map(h => `${h.level}: ${h.text}`).join('\n')}
Words: ${extracted.wordCount}
Structured data: ${extracted.structuredDataTypes.join(', ') || 'None'}

Content (first part):
---
${extracted.bodyText}
---

Provide your analysis as JSON:

{
  "companyName": "<company name from content — if unclear, use the domain>",
  "contentScore": <0-100>,
  "contentSummary": "<1 sentence>",
  "contentChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<brief explanation>", "priority": "high|medium|low"}
  ],
  "citationScore": <0-100>,
  "citationSummary": "<1 sentence>",
  "citationChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<brief explanation>", "priority": "high|medium|low"}
  ],
  "eatScore": <0-100>,
  "eatSummary": "<1 sentence>",
  "eatChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<brief explanation>", "priority": "high|medium|low"}
  ],
  "topRecommendations": ["<action 1>", "<action 2>", "<action 3>"],
  "generatedPrompt": "<see instructions below>"
}

CONTENTCHECKS (minimum 4):
- Direct answers at the top of the page?
- Q&A format / questions answered?
- Concepts/definitions clearly explained?
- Lists or structured info for AI?
- Language: clear, concise, informative?

CITATIONCHECKS (minimum 3):
- Unique data: statistics, figures, research?
- Expert claims or statements?
- Company name clearly present in content?

EATCHECKS (minimum 3):
- Author or company profile visible?
- Expertise signals: certifications, experience, clients?
- Reviews or testimonials?
- Contact information available?

GENERATEDPROMPT — THIS IS CRUCIAL:
Generate a COMMERCIAL English question that a potential customer would ask ChatGPT or Perplexity. The question must:
- Sound like a REAL person searching for something
- Aim to find a service/product/company
- NOT mention the company name
- Be in English
- Be specific enough that the company could appear as an answer
- For example: "Can you recommend a good dentist in Rotterdam?" or "Which companies specialise in sustainable packaging?"

Provide ONLY the JSON.`
      : `Analyseer deze webpagina voor GEO-geschiktheid.

URL: ${url}
Title: ${extracted.title}
Meta description: ${extracted.description}
Headings: ${extracted.headings.slice(0, 15).map(h => `${h.level}: ${h.text}`).join('\n')}
Woorden: ${extracted.wordCount}
Structured data: ${extracted.structuredDataTypes.join(', ') || 'Geen'}

Content (eerste deel):
---
${extracted.bodyText}
---

Geef je analyse als JSON:

{
  "companyName": "<bedrijfsnaam uit de content — als niet duidelijk, gebruik dan het domein>",
  "contentScore": <0-100>,
  "contentSummary": "<1 zin>",
  "contentChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "citationScore": <0-100>,
  "citationSummary": "<1 zin>",
  "citationChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "eatScore": <0-100>,
  "eatSummary": "<1 zin>",
  "eatChecks": [
    {"name": "<check>", "status": "good|warning|error", "detail": "<korte uitleg>", "priority": "hoog|middel|laag"}
  ],
  "topRecommendations": ["<actie 1>", "<actie 2>", "<actie 3>"],
  "generatedPrompt": "<zie instructies hieronder>"
}

CONTENTCHECKS (minimaal 4):
- Directe antwoorden bovenaan de pagina?
- Q&A formaat / vragen beantwoord?
- Begrippen/definities helder uitgelegd?
- Lijsten of gestructureerde info voor AI?
- Taalgebruik: helder, bondig, informatief?

CITATIONCHECKS (minimaal 3):
- Unieke data: statistieken, cijfers, onderzoek?
- Expert claims of uitspraken?
- Bedrijfsnaam duidelijk aanwezig in content?

EATCHECKS (minimaal 3):
- Auteur of bedrijfsprofiel zichtbaar?
- Expertise signalen: certificeringen, ervaring, klanten?
- Reviews of testimonials?
- Contactinformatie beschikbaar?

GENERATEDPROMPT — DIT IS CRUCIAAL:
Genereer een COMMERCIËLE Nederlandse vraag die een potentiële klant aan ChatGPT of Perplexity zou stellen. De vraag moet:
- Klinken als een ECHT persoon die iets zoekt
- Gericht zijn op het vinden van een dienst/product/bedrijf
- De bedrijfsnaam NIET noemen
- In het Nederlands zijn
- Concreet genoeg dat het bedrijf als antwoord zou kunnen verschijnen
- Bijvoorbeeld: "Kun je een goede tandarts in Rotterdam aanbevelen?" of "Welke bedrijven zijn gespecialiseerd in duurzame verpakkingen?"

Geef ALLEEN de JSON.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const text = message.content[0].text.trim()
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(jsonStr)

  } catch (error) {
    console.error('[GEO Audit] Claude error:', error.message)
    return {
      companyName: hostname,
      contentScore: 50, contentSummary: m.analysisIncomplete, contentChecks: [],
      citationScore: 50, citationSummary: m.makeAccount, citationChecks: [],
      eatScore: 50, eatSummary: m.makeAccount, eatChecks: [],
      topRecommendations: [m.addFaqSchema, m.addMetaDesc, m.fullAnalysis],
      generatedPrompt: null
    }
  }
}


// ━━━ LIVE PERPLEXITY TEST ━━━
async function testPromptOnPerplexity(prompt, companyName, hostname, locale) {
  try {
    const isEn = locale === 'en'
    const systemContent = isEn
      ? `You are a helpful assistant that ALWAYS responds in English. Give concrete company names and recommendations. Focus on specific companies and service providers.`
      : `Je bent een behulpzame assistent die ALTIJD in het Nederlands antwoordt. Geef concrete bedrijfsnamen en aanbevelingen. Focus op Nederlandse, specifieke bedrijven en dienstverleners. Vermeld concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen of specialistische dienstverleners.`

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000
      }),
      signal: AbortSignal.timeout(25000)
    })

    if (!response.ok) { console.error('[GEO Audit] Perplexity error:', response.status); return null }

    const data = await response.json()
    const rawOutput = data.choices?.[0]?.message?.content || ''
    if (!rawOutput.trim()) return null

    const nameVariants = [
      companyName.toLowerCase(),
      hostname.toLowerCase(),
      hostname.replace(/\.(nl|com|eu|org|net)$/i, '').toLowerCase(),
      hostname.replace(/\.(nl|com|eu|org|net)$/i, '').replace(/[-_.]/g, ' ').toLowerCase(),
    ].filter(v => v.length > 2)

    const lowerOutput = rawOutput.toLowerCase()
    const mentioned = nameVariants.some(variant => lowerOutput.includes(variant))

    let mentionCount = 0
    nameVariants.forEach(variant => {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = rawOutput.match(new RegExp(escaped, 'gi'))
      if (matches) mentionCount += matches.length
    })

    let competitors = []
    try {
      const extractPrompt = isEn
        ? `Which SPECIFIC company names are mentioned in this text? Only specific businesses/companies, no large international brands, no tools, no platforms.

Text: "${rawOutput.substring(0, 2000)}"

Filter out: "${companyName}", "${hostname}"

Respond as JSON array: ["company1", "company2"]`
        : `Welke SPECIFIEKE bedrijfsnamen worden genoemd in deze tekst?
Alleen Nederlandse dienstverleners/bedrijven, geen grote internationale merken, geen tools, geen platforms.

Tekst: "${rawOutput.substring(0, 2000)}"

Filter uit: "${companyName}", "${hostname}"

Antwoord als JSON array: ["bedrijf1", "bedrijf2"]`

      const parseResult = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: isEn ? 'Extract company names. Provide ONLY a JSON array of strings. No markdown, no explanation.' : 'Extraheer bedrijfsnamen. Geef ALLEEN een JSON array van strings. Geen markdown, geen uitleg.',
        messages: [{ role: 'user', content: extractPrompt }]
      })

      const parsed = parseResult.content[0].text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      competitors = JSON.parse(parsed)
      if (!Array.isArray(competitors)) competitors = []
    } catch (e) {}

    return { mentioned, mentionCount, snippet: rawOutput.length > 600 ? rawOutput.substring(0, 597) + '...' : rawOutput, competitors: competitors.slice(0, 8) }
  } catch (error) {
    console.error('[GEO Audit] Perplexity error:', error.message)
    return null
  }
}


// ━━━ HELPERS ━━━
async function fetchTextFile(url) {
  try {
    const response = await fetch(`http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    const text = await response.text()
    if (text.length > 10000 || text.includes('<!DOCTYPE') || text.includes('<html')) return null
    return text
  } catch (e) { return null }
}

function cleanText(text) {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}
