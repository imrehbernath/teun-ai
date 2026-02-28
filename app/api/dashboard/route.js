import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ══════════════════════════════════════════════════════════
// ACTUAL JSONB field names in tool_integrations.results:
//
//   results.chatgpt[]:
//     - platform: "chatgpt"
//     - ai_prompt: "Welke advocaat..."
//     - company_mentioned: true/false
//     - mentions_count: 0/1/2...
//     - competitors_mentioned: ["Name1", "Name2"]
//     - simulated_ai_response_snippet: "..."
//
//   results.perplexity[]:
//     - platform: "perplexity"
//     - ai_prompt: "Welke advocaat..."
//     - company_mentioned: true/false
//     - mentions_count: 0/1/2...
//     - competitors_mentioned: ["Name1", "Name2"]
//     - simulated_ai_response_snippet: "..."
// ══════════════════════════════════════════════════════════

// —— Helper: extract prompt text from commercial_prompts (string or object) ——
function getPromptText(item) {
  if (!item) return ''
  if (typeof item === 'string') return item
  return item.prompt || item.text || item.query || item.ai_prompt || item.title || ''
}

// —— Helper: calculate visibility from scan results ——
function calcVisibility(results) {
  const empty = { chatgpt: 0, perplexity: 0, total: 0, found: 0, totalPrompts: 0, chatgptFound: 0, perplexityFound: 0, chatgptTotal: 0, perplexityTotal: 0 }
  if (!results) return empty

  const chatgptResults = results.chatgpt || []
  const perplexityResults = results.perplexity || []
  if (chatgptResults.length === 0 && perplexityResults.length === 0) return empty

  const chatgptFound = chatgptResults.filter(r => r.company_mentioned).length
  const perplexityFound = perplexityResults.filter(r => r.company_mentioned).length
  const totalPrompts = Math.max(chatgptResults.length, perplexityResults.length)

  let totalFound = 0
  for (let i = 0; i < totalPrompts; i++) {
    if (chatgptResults[i]?.company_mentioned || perplexityResults[i]?.company_mentioned) totalFound++
  }

  return {
    chatgpt: chatgptResults.length ? Math.round((chatgptFound / chatgptResults.length) * 100) : 0,
    perplexity: perplexityResults.length ? Math.round((perplexityFound / perplexityResults.length) * 100) : 0,
    total: totalPrompts ? Math.round((totalFound / totalPrompts) * 100) : 0,
    found: totalFound,
    totalPrompts,
    chatgptFound,
    perplexityFound,
    chatgptTotal: chatgptResults.length,
    perplexityTotal: perplexityResults.length,
  }
}

// —— Helper: extract competitors from scan results ——
function extractCompetitors(results) {
  if (!results) return []
  const counts = {}
  for (const platform of ['chatgpt', 'perplexity']) {
    for (const r of (results[platform] || [])) {
      for (const name of (r.competitors_mentioned || [])) {
        if (!name || typeof name !== 'string') continue
        const cleaned = name.trim()
        if (cleaned.length >= 2 && cleaned.length <= 80) {
          counts[cleaned] = (counts[cleaned] || 0) + 1
        }
      }
    }
  }
  return Object.entries(counts)
    .map(([name, mentions]) => ({ name, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 20)
}

// —— Helper: build prompt details — INDEX-BASED ——
function buildPromptDetails(results, commercialPrompts) {
  const chatgptResults = results?.chatgpt || []
  const perplexityResults = results?.perplexity || []

  if (chatgptResults.length === 0 && perplexityResults.length === 0 && (!commercialPrompts || commercialPrompts.length === 0)) {
    return []
  }

  const promptCount = Math.max(commercialPrompts?.length || 0, chatgptResults.length, perplexityResults.length)
  const details = []

  for (let i = 0; i < promptCount; i++) {
    const promptText = commercialPrompts?.[i]
      ? getPromptText(commercialPrompts[i])
      : (chatgptResults[i]?.ai_prompt || perplexityResults[i]?.ai_prompt || `Prompt ${i + 1}`)

    const chatgpt = chatgptResults[i] || null
    const perplexity = perplexityResults[i] || null

    details.push({
      id: i + 1,
      text: promptText,
      chatgpt: {
        found: chatgpt?.company_mentioned || false,
        mentionCount: chatgpt?.mentions_count || 0,
        snippet: chatgpt?.simulated_ai_response_snippet || null,
        competitors: chatgpt?.competitors_mentioned || [],
        sources: (chatgpt?.sources || chatgpt?.references || chatgpt?.cited_sources || []).map(s => typeof s === 'string' ? s : (s?.link || s?.url || '')).filter(Boolean),
        fromExtension: chatgpt?._fromExtension || false,
      },
      perplexity: {
        found: perplexity?.company_mentioned || false,
        mentionCount: perplexity?.mentions_count || 0,
        snippet: perplexity?.simulated_ai_response_snippet || null,
        competitors: perplexity?.competitors_mentioned || [],
        sources: (perplexity?.sources || perplexity?.references || perplexity?.cited_sources || []).map(s => typeof s === 'string' ? s : (s?.link || s?.url || '')).filter(Boolean),
      },
    })
  }

  return details
}

// —— Helper: avg mention count ——
function calcAvgMentions(promptDetails) {
  const mentions = promptDetails.flatMap(p =>
    [p.chatgpt.mentionCount, p.perplexity.mentionCount].filter(m => m > 0)
  )
  if (mentions.length === 0) return null
  return (mentions.reduce((a, b) => a + b, 0) / mentions.length).toFixed(1)
}

// —— Helper: normalize results format ——
// Old scans stored flat array (Perplexity-only, pre dual-platform)
// New scans store { chatgpt: [...], perplexity: [...] }
// This ensures all code can safely access results.chatgpt / results.perplexity
function normalizeResults(results) {
  if (!results) return null

  // Already correct format: { chatgpt: [...], perplexity: [...] }
  if (!Array.isArray(results) && results.chatgpt !== undefined) return results
  if (!Array.isArray(results) && results.perplexity !== undefined) return results

  // Flat array — old format (Perplexity-only scans, pre Feb 2026)
  if (Array.isArray(results)) {
    // Check if items have a platform field to split them
    const chatgpt = results.filter(r => r.platform === 'chatgpt')
    const perplexity = results.filter(r => r.platform === 'perplexity')
    const untagged = results.filter(r => !r.platform)

    if (chatgpt.length > 0 || perplexity.length > 0) {
      // Mixed array with platform tags — split by platform
      return { chatgpt, perplexity: [...perplexity, ...untagged] }
    }
    // No platform tags — treat all as perplexity (legacy single-platform scans)
    return { chatgpt: [], perplexity: results }
  }

  // Unknown object without chatgpt/perplexity keys
  return { chatgpt: [], perplexity: [] }
}

// —— Helper: process Google AI scan results ——
// Detects company mentions from aiResponse text when no explicit flag exists
// Extracts competitors from sources and aiResponse
function processGoogleAiResults(scans, companyName) {
  if (!scans || scans.length === 0) return { found: 0, total: 0, pct: 0, prompts: [] }

  const latest = scans[0]
  const scanResults = latest.results || []
  const scanPrompts = latest.prompts || []

  // Normalize results to array
  let resultArr = []
  if (Array.isArray(scanResults)) {
    resultArr = scanResults
  } else if (typeof scanResults === 'object') {
    if (Array.isArray(scanResults.results)) {
      resultArr = scanResults.results
    } else {
      for (const val of Object.values(scanResults)) {
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          resultArr = val
          break
        }
      }
    }
  }

  // Debug logging
  console.log('[processGoogleAiResults] scan id:', latest.id, '| results count:', resultArr.length, '| prompts count:', scanPrompts.length, '| companyName:', companyName)
  if (resultArr[0]) console.log('[processGoogleAiResults] first result keys:', Object.keys(resultArr[0]))

  // Build search terms for company mention detection
  const companyLower = (companyName || '').toLowerCase().trim()
  const companyVariants = companyLower ? [
    companyLower,
    companyLower.replace(/\s+/g, ''),       // "online labs" → "onlinelabs"
    companyLower.replace(/\s+/g, '-'),       // "online labs" → "online-labs"
    companyLower.replace(/[-_.]/g, ' '),     // "online-labs" → "online labs"
  ].filter((v, i, a) => a.indexOf(v) === i) : []

  // Also check company website domain
  const companyWebsite = (latest.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

  const processedPrompts = resultArr.map((r, i) => {
    const responseText = r.aiResponse || r.textContent || r.simulated_ai_response_snippet || r.snippet || ''
    const responseLower = responseText.toLowerCase()

    // 1. Check explicit mention flags (if they exist)
    let isMentioned = r.companyMentioned === true || r.company_mentioned === true

    // 2. If no explicit flag, detect from aiResponse text
    if (!isMentioned && companyVariants.length > 0 && responseLower) {
      isMentioned = companyVariants.some(v => responseLower.includes(v))
    }

    // 3. Also check if company website domain appears in sources
    if (!isMentioned && companyWebsite) {
      const sources = r.sources || r.references || r.citedSources || r.cited_sources || []
      isMentioned = sources.some(s => {
        const srcDomain = (s.domain || s.link || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
        return srcDomain.includes(companyWebsite) || companyWebsite.includes(srcDomain.split('/')[0])
      })
    }

    // 4. Extract competitors from sources (domains that are companies)
    const competitorNames = []
    const sources = r.sources || r.references || r.citedSources || r.cited_sources || []
    for (const s of sources) {
      const domain = (s.domain || '').trim()
      const title = (s.title || '').trim()
      // Use domain as competitor name if it looks like a company
      if (domain && domain.length >= 2 && !domain.includes('sortlist') && !domain.includes('trustoo') &&
          !domain.includes('google') && !domain.includes('wikipedia') &&
          !(companyWebsite && domain.toLowerCase().includes(companyWebsite))) {
        // Clean domain: remove "www." prefix and common suffixes
        const cleanDomain = domain.replace(/^www\./, '').replace(/\.(nl|com|eu|org|net)$/i, '')
        if (cleanDomain.length >= 2 && !competitorNames.some(c => c.toLowerCase() === cleanDomain.toLowerCase())) {
          competitorNames.push(domain)
        }
      }
    }

    // Count mentions in response
    let mentionCount = 0
    if (isMentioned && companyVariants.length > 0) {
      for (const v of companyVariants) {
        const regex = new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        const matches = responseLower.match(regex)
        if (matches) mentionCount = Math.max(mentionCount, matches.length)
      }
    }
    if (isMentioned && mentionCount === 0) mentionCount = 1

    return {
      text: r.query || r.ai_prompt || r.prompt || r.searchQuery || getPromptText(scanPrompts[i]) || `Prompt ${i + 1}`,
      found: isMentioned,
      mentionCount: r.mentionCount || r.mentions_count || mentionCount,
      snippet: responseText || null,
      competitors: r.competitorsInSources || r.competitorsMentioned || r.competitors_mentioned || competitorNames,
      sources: sources,
    }
  })

  const found = processedPrompts.filter(p => p.found).length
  const total = Math.max(resultArr.length, scanPrompts.length) || 0

  return {
    found,
    total,
    pct: total > 0 ? Math.round((found / total) * 100) : 0,
    prompts: processedPrompts,
    lastScan: latest.created_at,
  }
}

export async function GET(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyName = searchParams.get('company')
    const period = searchParams.get('period') || '30d'

    const now = new Date()
    const daysBack = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const sinceDate = new Date(now - daysBack * 24 * 60 * 60 * 1000).toISOString()

    // ——— Queries ———
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name, email')
      .eq('id', user.id)
      .single()

    const { data: allIntegrations, error: intError } = await supabase
      .from('tool_integrations')
      .select('id, company_name, website, company_category, commercial_prompts, results, total_company_mentions, prompts_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (intError) console.error('Error fetching integrations:', intError)

    // ── Prompt Explorer results (prompt_discovery_results) ──
    const { data: promptDiscoveryRows } = await supabase
      .from('prompt_discovery_results')
      .select('id, website, brand_name, branche, location, prompts, clusters, selected_prompts, selected_count, status, scan_integration_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Deduplicate companies
    const uniqueCompanies = []
    const seenCompanies = new Set()
    for (const c of (allIntegrations || [])) {
      const key = c.company_name?.toLowerCase()
      if (key && !seenCompanies.has(key)) {
        seenCompanies.add(key)
        uniqueCompanies.push({ company_name: c.company_name, website: c.website, company_category: c.company_category })
      }
    }

    const activeCompanyName = companyName || uniqueCompanies[0]?.company_name || null
    const integrations = activeCompanyName
      ? (allIntegrations || []).filter(s => s.company_name === activeCompanyName)
      : (allIntegrations || [])

    const latestScan = integrations[0] || null
    const results = normalizeResults(latestScan?.results || null)
    const commercialPrompts = latestScan?.commercial_prompts || []
    const activeWebsite = latestScan?.website || uniqueCompanies.find(c => c.company_name === activeCompanyName)?.website || null

    // Rank checks
    let rankQ = supabase
      .from('rank_checks')
      .select('id, domain, brand_name, keyword, service_area, chatgpt_position, perplexity_position, results, created_at')
      .eq('user_id', user.id)
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })

    if (activeWebsite) {
      try {
        const activeDomain = new URL(activeWebsite.startsWith('http') ? activeWebsite : `https://${activeWebsite}`).hostname.replace(/^www\./, '')
        rankQ = rankQ.or(`domain.ilike.%${activeDomain}%,brand_name.ilike.%${activeCompanyName}%`)
      } catch (e) {}
    }
    const { data: rankChecks } = await rankQ

    // Google AI Mode
    let gaiQ = supabase.from('google_ai_scans').select('id, company_name, website, prompts, results, scan_type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    if (activeCompanyName) gaiQ = gaiQ.eq('company_name', activeCompanyName)
    const { data: googleAiScans } = await gaiQ

    // Google AI Overviews
    let gaioQ = supabase.from('google_ai_overview_scans').select('id, company_name, website, prompts, results, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    if (activeCompanyName) gaioQ = gaioQ.eq('company_name', activeCompanyName)
    const { data: googleAioScans } = await gaioQ

    // Chrome Extension ChatGPT scans
    let extQ = supabase.from('chatgpt_scans').select('*, chatgpt_query_results (*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    if (activeCompanyName) extQ = extQ.ilike('company_name', activeCompanyName)
    const { data: extensionScans } = await extQ

    // ——— Merge extension results into main results ———
    // Extension ChatGPT results override API ChatGPT results (more accurate)
    let mergedResults = results ? { ...results } : null
    let hasExtensionData = false

    if (extensionScans && extensionScans.length > 0) {
      const latestExtScan = extensionScans[0]
      const extQueryResults = latestExtScan.chatgpt_query_results || []
      console.log('[Dashboard] Extension scan found:', { scanId: latestExtScan.id, queryResults: extQueryResults.length, firstResult: extQueryResults[0] ? Object.keys(extQueryResults[0]) : 'none' })

      if (extQueryResults.length > 0) {
        hasExtensionData = true

        // Collect all known competitor names from Perplexity results for cross-referencing
        const perplexityResults = mergedResults?.perplexity || results?.perplexity || []
        const knownCompetitors = new Set()
        for (const pr of perplexityResults) {
          for (const name of (pr.competitors_mentioned || [])) {
            if (name && typeof name === 'string' && name.trim().length >= 2) {
              knownCompetitors.add(name.trim())
            }
          }
        }

        // Extract business names directly from ChatGPT response text
        // Patterns: "📌 Name –", "• Name –", "🔹 Name –", "Name –" at line start
        function extractNamesFromResponse(text, ownCompany) {
          if (!text) return []
          const names = []
          const ownLower = (ownCompany || '').toLowerCase()

          // Split into lines and find business name patterns
          const lines = text.split('\n')
          for (const line of lines) {
            const trimmed = line.trim()
            // Match: bullet/emoji + Name + dash separator (–, —, -)
            // Covers: "📌 Name –", "• Name –", "🔹 Name –", "1. Name –"
            const match = trimmed.match(/^(?:[•📌🔹🔸▸►●✅✔️🌟🚀\d]+[.)]*\s*)([\p{L}\p{N}][\p{L}\p{N}\s&®™.'|,()]+?)\s*[–—\-]\s/u)
            if (!match) continue

            let name = match[1].trim()
              .replace(/\*\*/g, '')           // remove markdown bold
              .replace(/\[.*?\]\(.*?\)/g, '') // remove markdown links
              .replace(/\s+/g, ' ')           // normalize spaces
              .trim()
            // Clean trailing ratings like "4.9"
            name = name.replace(/\s*\d+\.\d+$/, '').trim()

            if (
              name.length >= 2 && name.length <= 80 &&
              name.toLowerCase() !== ownLower &&
              !name.toLowerCase().includes(ownLower) &&
              // Block Dutch/English action verbs and tips
              !/^(tip|stap|optie|actie|check|let op|kortom|samenvatting|wil je|vraag|bekijk|bepaal|kijk|vergelijk|overweeg|zoek|lees|denk|kies|plan|budget|prijs|kosten|belangrijk|extra|meer|waarom|hoe |wat |welke|moderne|professionele|create|find|look|choose|compare|view|read|think)/i.test(name) &&
              // Block rating concatenation strings (e.g. "4.8Whello4.7Webfluencer")
              !/\d+\.\d+[A-Z]/i.test(name) &&
              // Block strings with multiple ratings glued together
              !((name.match(/\d+\.\d+/g) || []).length >= 2) &&
              // Block generic section headers
              !/^(creatieve|brede|full.service|lokale|kleinere|betaalbare|waar deze|gebruik|gratis|premium|populaire|aanbevolen|top\s)/i.test(name) &&
              // Block names starting with a digit (rating remnants like "9DGTLbase")
              !/^\d/.test(name)
            ) {
              names.push(name)
            }
          }
          // Split any comma-separated names and deduplicate
          const finalNames = []
          for (const name of names) {
            if (name.includes(',')) {
              // Split "Name1, Name2, Name3" into individual entries
              for (const part of name.split(',')) {
                const cleaned = part.trim()
                if (cleaned.length >= 2 && cleaned.length <= 80) finalNames.push(cleaned)
              }
            } else {
              finalNames.push(name)
            }
          }
          return [...new Set(finalNames)]
        }

        console.log('[Dashboard] Known competitors from Perplexity:', [...knownCompetitors])

        // Map extension results to same format as API chatgpt results
        const extChatgptResults = extQueryResults.map(qr => {
          const isMentioned = qr.company_mentioned || qr.found || false
          const fullText = qr.full_response || qr.response_preview || ''
          const snippetText = qr.snippet || qr.response_preview || qr.ai_response || qr.response || qr.full_response || ''

          // 1. Start with any stored competitors
          const competitors = qr.competitors_mentioned || []

          // 2. Cross-reference: known Perplexity competitors in ChatGPT response
          if (fullText && knownCompetitors.size > 0) {
            const textLower = fullText.toLowerCase()
            for (const comp of knownCompetitors) {
              if (textLower.includes(comp.toLowerCase()) && !competitors.includes(comp)) {
                competitors.push(comp)
              }
            }
          }

          // 3. Extract NEW competitors directly from ChatGPT response text
          if (fullText) {
            const extracted = extractNamesFromResponse(fullText, activeCompanyName)
            for (const name of extracted) {
              if (!competitors.some(c => c.toLowerCase() === name.toLowerCase())) {
                competitors.push(name)
              }
            }
          }

          return {
            platform: 'chatgpt',
            ai_prompt: qr.query || qr.prompt || '',
            company_mentioned: isMentioned,
            mentions_count: qr.mentions_count || qr.mention_count || (isMentioned ? 1 : 0),
            competitors_mentioned: competitors,
            simulated_ai_response_snippet: snippetText,
            sources: qr.sources || qr.citations || [],
            position: qr.position || null,
            _fromExtension: true,
          }
        })

        console.log('[Dashboard] Extension merge:', { total: extChatgptResults.length, found: extChatgptResults.filter(r => r.company_mentioned).length, competitorsMatched: extChatgptResults.reduce((sum, r) => sum + r.competitors_mentioned.length, 0) })

        if (!mergedResults) {
          mergedResults = { chatgpt: extChatgptResults, perplexity: [] }
        } else {
          mergedResults = { ...mergedResults, chatgpt: extChatgptResults }
        }
      }
    }

    // ——— Process (using merged results with extension priority) ———
    const promptDetails = buildPromptDetails(mergedResults, commercialPrompts)
    const visibility = calcVisibility(mergedResults)
    const avgMentions = calcAvgMentions(promptDetails)
    const googleAiMode = processGoogleAiResults(googleAiScans, activeCompanyName)
    const googleAiOverview = processGoogleAiResults(googleAioScans, activeCompanyName)

    // ——— Build unified competitor list across ALL 4 platforms ———
    const competitorCounts = {}
    // Count from ChatGPT + Perplexity (per prompt)
    for (const platform of ['chatgpt', 'perplexity']) {
      for (const r of (mergedResults?.[platform] || [])) {
        for (const name of (r.competitors_mentioned || [])) {
          if (!name || typeof name !== 'string') continue
          const cleaned = name.trim()
          if (cleaned.length >= 2 && cleaned.length <= 80) {
            if (!competitorCounts[cleaned]) competitorCounts[cleaned] = { mentions: 0, prompts: new Set() }
            competitorCounts[cleaned].mentions++
          }
        }
      }
    }
    // Count from Google AI Mode + AI Overviews (per prompt index)
    for (const gaiResults of [googleAiMode, googleAiOverview]) {
      for (const p of (gaiResults.prompts || [])) {
        for (const name of (p.competitors || [])) {
          if (!name || typeof name !== 'string') continue
          const cleaned = name.trim()
          if (cleaned.length >= 2 && cleaned.length <= 80) {
            if (!competitorCounts[cleaned]) competitorCounts[cleaned] = { mentions: 0, prompts: new Set() }
            competitorCounts[cleaned].mentions++
          }
        }
      }
    }
    // Also count prompt appearances (unique prompts where competitor appears)
    for (let i = 0; i < promptDetails.length; i++) {
      const p = promptDetails[i]
      const gaiPrompt = googleAiMode.prompts?.[i]
      const gaioPrompt = googleAiOverview.prompts?.[i]
      const allCompetitors = [
        ...(p.chatgpt.competitors || []),
        ...(p.perplexity.competitors || []),
        ...(gaiPrompt?.competitors || []),
        ...(gaioPrompt?.competitors || []),
      ]
      for (const name of allCompetitors) {
        if (!name || typeof name !== 'string') continue
        const cleaned = name.trim()
        if (competitorCounts[cleaned]) {
          competitorCounts[cleaned].prompts.add(i)
        }
      }
    }
    const competitors = Object.entries(competitorCounts)
      .map(([name, data]) => ({ name, mentions: data.mentions, appearances: data.prompts.size }))
      .sort((a, b) => b.appearances - a.appearances || b.mentions - a.mentions)
      .slice(0, 20)
    const topCompetitor = competitors[0] || null

    const promptCount = promptDetails.length || visibility.totalPrompts
    const foundCount = promptDetails.filter((p, i) =>
      p.chatgpt.found || p.perplexity.found ||
      googleAiMode.prompts?.[i]?.found || googleAiOverview.prompts?.[i]?.found
    ).length
    const adjustedVisibility = {
      ...visibility,
      totalPrompts: promptCount,
      found: foundCount,
      total: promptCount > 0 ? Math.round((foundCount / promptCount) * 100) : 0,
    }

    // Visibility trend
    const companyScans = integrations.filter(s => new Date(s.created_at) >= new Date(sinceDate)).reverse()
    const visibilityTrend = companyScans.map(scan => {
      const v = calcVisibility(normalizeResults(scan.results))
      return {
        date: new Date(scan.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
        fullDate: scan.created_at,
        chatgpt: v.chatgpt, perplexity: v.perplexity, total: v.total,
      }
    })

    return NextResponse.json({
      user: { id: user.id, email: user.email, fullName: profile?.full_name || null, companyName: profile?.company_name || null },
      companies: uniqueCompanies,
      activeCompany: activeCompanyName ? { name: activeCompanyName, website: activeWebsite, category: latestScan?.company_category || null } : null,
      visibility: adjustedVisibility,
      avgMentions,
      topCompetitor,
      lastScan: latestScan?.created_at || null,
      prompts: promptDetails,
      competitors,
      visibilityTrend,
      rankChecks: (rankChecks || []).map(rc => {
        const chatgptResult = rc.results?.chatgpt || {}
        const perplexityResult = rc.results?.perplexity || {}
        const chatgptMentioned = chatgptResult.mentioned_companies || chatgptResult.competitors || []
        const perplexityMentioned = perplexityResult.mentioned_companies || perplexityResult.competitors || []
        return {
          id: rc.id, keyword: rc.keyword, brandName: rc.brand_name, domain: rc.domain,
          serviceArea: rc.service_area, date: rc.created_at,
          chatgpt: {
            position: rc.chatgpt_position,
            found: rc.chatgpt_position != null && rc.chatgpt_position > 0,
            snippet: chatgptResult.snippet || chatgptResult.response || null,
            mentioned: chatgptMentioned,
          },
          perplexity: {
            position: rc.perplexity_position,
            found: rc.perplexity_position != null && rc.perplexity_position > 0,
            snippet: perplexityResult.snippet || perplexityResult.response || null,
            mentioned: perplexityMentioned,
          },
        }
      }),
      googleAiMode,
      googleAiOverview,
      hasExtensionData,
      extensionScanDate: hasExtensionData ? extensionScans[0].created_at : null,
      period,
      totalScans: integrations.length,
      // Prompt Explorer data for selection flow (when no scans yet)
      promptDiscovery: (promptDiscoveryRows || []).map(pd => ({
        id: pd.id,
        website: pd.website,
        brandName: pd.brand_name,
        branche: pd.branche,
        location: pd.location,
        prompts: pd.prompts || [],
        clusters: pd.clusters || [],
        selectedPrompts: pd.selected_prompts || [],
        selectedCount: pd.selected_count || 0,
        status: pd.status,
        scanIntegrationId: pd.scan_integration_id,
        createdAt: pd.created_at,
      })),
    })

  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════
// DELETE — Remove a company and all related data
// ═══════════════════════════════════════════════════
export async function DELETE(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await request.json()
    const company = body.company
    if (!company) {
      return NextResponse.json({ error: 'Company name required' }, { status: 400 })
    }

    console.log(`[Dashboard DELETE] Deleting company "${company}" for user ${user.id}`)

    const deleted = {}

    const { data: d1, error: e1 } = await supabase
      .from('tool_integrations')
      .delete()
      .eq('user_id', user.id)
      .ilike('company_name', company)
      .select('id')
    deleted.tool_integrations = d1?.length || 0
    if (e1) console.error('Delete tool_integrations error:', e1)

    const { data: d2, error: e2 } = await supabase
      .from('scan_history')
      .delete()
      .eq('user_id', user.id)
      .filter('input_data->>company_name', 'ilike', company)
      .select('id')
    deleted.scan_history = d2?.length || 0
    if (e2) console.error('Delete scan_history error:', e2)

    const { data: d3, error: e3 } = await supabase
      .from('rank_checks')
      .delete()
      .eq('user_id', user.id)
      .ilike('brand_name', company)
      .select('id')
    deleted.rank_checks = d3?.length || 0
    if (e3) console.error('Delete rank_checks error:', e3)

    const { data: d4, error: e4 } = await supabase
      .from('google_ai_scans')
      .delete()
      .eq('user_id', user.id)
      .ilike('company_name', company)
      .select('id')
    deleted.google_ai_scans = d4?.length || 0
    if (e4) console.error('Delete google_ai_scans error:', e4)

    const { data: d5, error: e5 } = await supabase
      .from('google_ai_overview_scans')
      .delete()
      .eq('user_id', user.id)
      .ilike('company_name', company)
      .select('id')
    deleted.google_ai_overview_scans = d5?.length || 0
    if (e5) console.error('Delete google_ai_overview_scans error:', e5)

    try {
      const { data: d6 } = await supabase
        .from('chatgpt_scans')
        .delete()
        .eq('user_id', user.id)
        .ilike('company_name', company)
        .select('id')
      deleted.chatgpt_scans = d6?.length || 0
    } catch (e) {}

    try {
      const { data: d7 } = await supabase
        .from('chatgpt_live_scans')
        .delete()
        .eq('user_id', user.id)
        .ilike('company_name', company)
        .select('id')
      deleted.chatgpt_live_scans = d7?.length || 0
    } catch (e) {}

    console.log(`[Dashboard DELETE] Deleted:`, deleted)

    return NextResponse.json({ success: true, deleted })

  } catch (err) {
    console.error('Dashboard DELETE error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
