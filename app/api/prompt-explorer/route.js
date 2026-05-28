// app/api/prompt-explorer/route.js
// Nieuwe Prompt Explorer endpoint die de motor (lib/prompt-engine) gebruikt
// om hoog-kwaliteit commerciële AI-zoekvragen te genereren op basis van een URL.
//
// Pipeline:
//   1. Scrape website (ScraperAPI 3-staps fallback, inclusief ultra_premium)
//   2. Parse HTML
//   3. analyzeWebsiteForKeywords (Claude): keywords + services + USPs + locatie + businessType + audienceType + coreActivity
//   4. generatePromptsWithClaude (motor): 10 commerciële prompts met strenge regels
//   5. estimatePromptVolumes (motor): per prompt AI-volume + trend + difficulty (FOMO data)
//   6. Save in prompt_discovery_results met session_token (zelfde claim-flow als voorheen)
//   7. Slack notif
//
// Anonymous-vriendelijk: schrijft session_token naar prompt_discovery_results,
// zodat na signup de bestaande claim-flow (/api/auth/claim-session) de scan
// automatisch koppelt aan het account.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateSessionToken } from '@/lib/session-token'
import { isBlockedUrl, hasNonLatinText, getLanguageBlockError } from '@/lib/language-guard'
import { getUserBadge } from '@/lib/slack-badge'
import {
  scrapeWebsite,
  analyzeWebsiteForKeywords,
  generatePromptsWithClaude,
  estimatePromptVolumes,
} from '@/lib/prompt-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

const VALID_TLDS = new Set([
  'nl', 'be', 'lu',
  'com', 'org', 'net', 'info', 'biz', 'io', 'co', 'me', 'eu',
  'de', 'fr', 'es', 'it', 'pt', 'pl', 'se', 'no', 'dk', 'fi', 'at', 'ch', 'ie', 'cz', 'gr', 'hu', 'ro', 'sk', 'si', 'hr', 'bg', 'lt', 'lv', 'ee',
  'uk', 'us', 'ca', 'au', 'nz',
  'app', 'dev', 'tech', 'ai', 'design', 'digital', 'online', 'shop', 'store', 'blog', 'site', 'website', 'agency', 'studio', 'works', 'cloud', 'email', 'media', 'news',
  'gov', 'edu', 'ac',
])

function validateTld(url, isNL) {
  const host = url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('?')[0].toLowerCase()
  const parts = host.split('.')
  if (parts.length < 2) return { ok: false, msg: isNL ? 'Vul een geldige website URL in (bijv. voorbeeld.nl)' : 'Enter a valid website URL (e.g. example.com)' }
  const tld = parts.pop()
  const lastTwo = parts.length >= 1 ? `${parts[parts.length - 1]}.${tld}` : ''
  const valid = VALID_TLDS.has(tld) ||
    lastTwo === 'co.uk' || lastTwo === 'org.uk' || lastTwo === 'ac.uk' ||
    lastTwo === 'com.au' || lastTwo === 'co.nz'
  if (!valid) return { ok: false, msg: isNL ? `De domeinextensie .${tld} wordt niet ondersteund of bestaat niet.` : `The domain extension .${tld} is not supported or does not exist.` }
  return { ok: true }
}

async function notifySlack({ url, brandName, branche, location, promptCount, source, lang, userBadge }) {
  if (!SLACK_WEBHOOK_URL) return
  try {
    const extra = [brandName, branche, location].filter(Boolean).join(' | ')
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🧭 Prompt Explorer Scan', emoji: true } },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*URL:*\n${url}` },
              { type: 'mrkdwn', text: `*Account:*\n${userBadge || '👤 Anoniem'}` },
              extra ? { type: 'mrkdwn', text: `*Context:*\n${extra}` } : null,
              { type: 'mrkdwn', text: `*Resultaat:*\n${promptCount} commerciële prompts` },
              source?.method ? { type: 'mrkdwn', text: `*Scrape:*\n${source.method}` } : null,
            ].filter(Boolean)
          },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `${new Date().toLocaleString('nl-NL')} · Prompt Explorer v2 (${lang})` }] }
        ]
      }),
    })
  } catch (e) {
    console.error('Slack notification failed:', e.message)
  }
}

export async function POST(request) {
  const startTime = Date.now()
  try {
    const body = await request.json()
    const websiteUrl = (body.websiteUrl || body.url || '').trim()
    const brandName = (body.brandName || '').trim()
    const location = (body.location || body.serviceArea || '').trim()
    const industry = (body.industry || body.branche || '').trim()
    const locale = body.locale === 'en' ? 'en' : 'nl'
    const isNL = locale === 'nl'

    // ── Validatie ──
    if (!websiteUrl) {
      return NextResponse.json({ error: isNL ? 'Website URL is verplicht' : 'Website URL is required' }, { status: 400, headers: CORS })
    }
    if (!brandName) {
      return NextResponse.json({ error: isNL ? 'Bedrijfsnaam is verplicht' : 'Brand name is required' }, { status: 400, headers: CORS })
    }
    if (brandName.length < 3) {
      return NextResponse.json({ error: isNL ? 'Bedrijfsnaam moet minimaal 3 tekens zijn' : 'Brand name must be at least 3 characters' }, { status: 400, headers: CORS })
    }
    if (hasNonLatinText(brandName) || hasNonLatinText(industry) || hasNonLatinText(location)) {
      return NextResponse.json({ error: getLanguageBlockError(locale) }, { status: 400, headers: CORS })
    }
    if (isBlockedUrl(websiteUrl)) {
      return NextResponse.json({ error: getLanguageBlockError(locale) }, { status: 400, headers: CORS })
    }
    const tldCheck = validateTld(websiteUrl, isNL)
    if (!tldCheck.ok) {
      return NextResponse.json({ error: tldCheck.msg }, { status: 400, headers: CORS })
    }

    const supabase = await createServiceClient()
    const { sessionToken } = await getOrCreateSessionToken()

    // ── Step 1+2+3: scrape + parse + Claude website-analyse ──
    console.log(`[prompt-explorer] analyzing ${websiteUrl} for ${brandName}`)
    const websiteAnalysis = await analyzeWebsiteForKeywords(websiteUrl, brandName, industry || 'algemeen', isNL)

    if (websiteAnalysis?.blocked) {
      return NextResponse.json({ error: websiteAnalysis.blockMessage }, { status: 400, headers: CORS })
    }
    if (!websiteAnalysis?.success) {
      return NextResponse.json({
        error: isNL
          ? 'We konden de website niet bereiken of analyseren. Controleer de URL en probeer opnieuw.'
          : 'We could not reach or analyse the website. Check the URL and try again.'
      }, { status: 502, headers: CORS })
    }

    // Build keyword-pool: website-keywords zijn de basis, user-input vult aan
    let enhancedKeywords = [...(websiteAnalysis.keywords || [])]
    if (industry && !enhancedKeywords.some(k => k.toLowerCase() === industry.toLowerCase())) {
      enhancedKeywords.push(industry)
    }
    enhancedKeywords = enhancedKeywords.slice(0, 12)

    // Override location if user provided one (motor respects locationExclusive flag)
    const analysisForMotor = { ...websiteAnalysis }
    if (location) {
      analysisForMotor.location = location
      analysisForMotor.locationExclusive = true
    }

    // ── Step 4: generate 10 prompts via de motor ──
    console.log(`[prompt-explorer] generating prompts with motor (keywords=${enhancedKeywords.length})`)
    const genResult = await generatePromptsWithClaude(
      brandName,
      industry || (websiteAnalysis.businessType || 'algemeen'),
      enhancedKeywords,
      null,
      analysisForMotor,
      isNL,
    )

    if (!genResult?.success || !Array.isArray(genResult.prompts) || genResult.prompts.length === 0) {
      return NextResponse.json({
        error: isNL ? 'Promptgeneratie is mislukt. Probeer het opnieuw.' : 'Prompt generation failed. Please try again.'
      }, { status: 500, headers: CORS })
    }

    const promptTexts = genResult.prompts

    // ── Step 5: estimate volumes (FOMO data) ──
    console.log(`[prompt-explorer] estimating volumes for ${promptTexts.length} prompts`)
    const volResult = await estimatePromptVolumes(promptTexts, websiteAnalysis, isNL)
    const estimates = volResult?.estimates || promptTexts.map(() => ({
      estimatedAiVolume: 200,
      trendSignal: 'stable',
      difficulty: 'medium',
      difficultyScore: 50,
    }))

    const promptsForResponse = promptTexts.map((text, i) => ({
      text,
      intent: 'commercial',
      intentCluster: isNL ? 'Commercieel' : 'Commercial',
      estimatedAiVolume: estimates[i].estimatedAiVolume,
      trendSignal: estimates[i].trendSignal,
      difficulty: estimates[i].difficulty,
      difficultyScore: estimates[i].difficultyScore,
      mentioned: false,
      competitors: [],
    }))

    // ── Step 6: save in prompt_discovery_results ──
    try {
      const { error: saveError } = await supabase
        .from('prompt_discovery_results')
        .insert({
          session_token: sessionToken,
          user_id: null,
          website: websiteUrl,
          keywords: null,
          brand_name: brandName,
          branche: industry || websiteAnalysis.businessType || null,
          location: location || websiteAnalysis.location || null,
          prompts: promptsForResponse,
          clusters: [],
          extracted_keywords: websiteAnalysis.keywords || [],
          top_competitors: [],
          source: 'prompt-explorer',
          meta: {
            engine: 'motor-v1',
            scrapeMethod: websiteAnalysis.rawParsed ? 'unknown' : null,
            audienceType: websiteAnalysis.audienceType,
            businessType: websiteAnalysis.businessType,
            coreActivity: websiteAnalysis.coreActivity,
            locationExclusive: websiteAnalysis.locationExclusive,
            durationMs: Date.now() - startTime,
            lang: locale,
          }
        })
      if (saveError) {
        console.error('[prompt-explorer] save error:', saveError.message)
      } else {
        console.log(`[prompt-explorer] saved (session: ${sessionToken.slice(0, 8)}...)`)
      }
    } catch (saveErr) {
      console.error('[prompt-explorer] save exception:', saveErr.message)
    }

    // ── Step 7: Slack notif ──
    try {
      const userBadge = await getUserBadge(supabase, null)
      notifySlack({
        url: websiteUrl,
        brandName,
        branche: industry,
        location,
        promptCount: promptsForResponse.length,
        source: { method: 'motor' },
        lang: locale,
        userBadge,
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      prompts: promptsForResponse,
      extractedKeywords: websiteAnalysis.keywords || [],
      companyName: brandName,
      detectedLanguage: locale,
      sessionToken,
      websiteAnalysis: {
        services: websiteAnalysis.services,
        usps: websiteAnalysis.usps,
        targetAudience: websiteAnalysis.targetAudience,
        businessType: websiteAnalysis.businessType,
        audienceType: websiteAnalysis.audienceType,
        coreActivity: websiteAnalysis.coreActivity,
        location: analysisForMotor.location,
        locationExclusive: analysisForMotor.locationExclusive,
      },
      source: 'url',
      meta: {
        engine: 'motor-v1',
        durationMs: Date.now() - startTime,
      },
    }, { headers: CORS })
  } catch (err) {
    console.error('[prompt-explorer] error:', err)
    return NextResponse.json({
      error: 'Er ging iets mis bij het analyseren. Probeer het opnieuw.',
    }, { status: 500, headers: CORS })
  }
}
