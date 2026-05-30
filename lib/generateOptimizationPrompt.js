// Genereert een Claude-prompt op maat per pagina voor GEO optimalisatie.
// Pure function, geen API calls. Locale bepaalt de menselijke tekst (NL/EN);
// XML tags zijn altijd Engels zodat de structuur taalonafhankelijk is.

const TEXTS = {
  nl: {
    opening: 'Je bent een Nederlandse GEO-specialist (Generative Engine Optimization). Analyseer onderstaande pagina en geef concrete, uitvoerbare aanbevelingen om deze pagina beter zichtbaar te maken in ChatGPT en Perplexity voor de gegeven zoekprompts.',
    yes: 'ja',
    no: 'nee',
    gscAttributeNote: 'Google Search Console data uit afgelopen 30 dagen, gefilterd op queries die matchen met de keywords uit deze commerciele prompt.',
    gscNotConnectedNote: 'Gebruiker heeft Search Console nog niet gekoppeld. Koppel GSC in het dashboard voor pagina-specifieke ranking data.',
    gscNoMatchesNote: 'Geen Search Console data gevonden voor de keywords uit deze commerciele prompt op deze pagina. De pagina krijgt mogelijk nog geen Google impressies op deze queries.',
    instructionBody: (hasGsc) => [
      'Volg deze stappen strikt in volgorde. Sla geen stap over. Geef per stap je output voordat je naar de volgende gaat.',
      '',
      '## Stap 1: Data-inventarisatie',
      '',
      'Lees alle data hierboven en vat samen wat je ziet. Maximaal 150 woorden, in deze structuur:',
      '',
      '**Pagina-positionering**',
      '- Wat is het hoofdonderwerp van de pagina volgens H1, meta title en content?',
      '- Welke doelgroep wordt aangesproken?',
      '- Welk taalregister wordt gebruikt (formeel/informeel, u/je)?',
      '',
      '**Huidige kop-structuur**',
      '- Welke H2\'s staan er nu? Lijst ze kort op.',
      '- Wat valt op aan de structuur (duplicaten, ontbrekende vraag-antwoord koppen, etc.)?',
      '',
      ...(hasGsc ? [
        '**Search Console signalen**',
        '- Per matchende query: positie + impressies + clicks. Wat zegt dit over de huidige Google-status van deze pagina voor de commerciële prompt?',
        '- Belangrijk: als impressies laag zijn (onder de 50), is de pagina mogelijk niet de juiste landing voor deze query. Benoem dat.',
        '',
      ] : []),
      '**AI-zichtbaarheid**',
      '- ChatGPT: gevonden of niet? Welke concurrenten worden wel genoemd?',
      '- Perplexity: gevonden of niet? Welke concurrenten worden wel genoemd?',
      '- Welke patroon zie je in de concurrenten (zelfde regio, zelfde specialisatie, zelfde type pagina-structuur)?',
      '',
      '## Stap 2: Diagnose',
      '',
      'Maximaal 100 woorden. Beantwoord:',
      '- Waarom wordt deze pagina NIET gekozen door ChatGPT/Perplexity terwijl de concurrenten dat wel worden?',
      '- Welke 2-3 concrete verschillen zie je tussen deze pagina en hoe de concurrenten waarschijnlijk zijn opgebouwd?',
      '',
      '## Stap 3: Aanbevelingen',
      '',
      'Pas NA stap 1 en 2 geef je concrete optimalisatie-aanbevelingen. Per commerciële prompt:',
      '',
      'A. Concurrent-analyse (1-2 zinnen): waarom worden de genoemde concurrenten wel gekozen?',
      '',
      'B. Concrete pagina-aanpassingen, gegroepeerd onder:',
      '   - Koppen-structuur (welke H2/H3 toevoegen of herschrijven, met exacte tekst)',
      '   - Content-blokken (welke secties toevoegen, met onderwerp)',
      '   - Schema markup (welk type: FAQPage, Service, LegalService, etc.)',
      '   - Interne linking (welke pagina\'s vanuit/naar deze pagina linken)',
      '',
      'C. Voorbeeld H2-sectie van 50-100 woorden die direct antwoord geeft op de zoekprompt, geschreven in autoritatieve toon. Gebruik concrete cijfers of bronvermelding waar mogelijk.',
      '',
      '## Output regels (gelden voor alle stappen)',
      '',
      '- Geen marketing-fluff. Geen "essentieel", "cruciaal", "in de wereld van vandaag"',
      '- Geen em dashes',
      '- Schrijf in het Nederlands, formeel maar toegankelijk',
      '- Gebruik het taalregister van de pagina (als de pagina "u" gebruikt, gebruik dan ook "u" in voorbeelden)',
      '- Geef werkbare aanbevelingen, geen algemene SEO tips',
      '- Als de pagina al goed scoort op een commerciële prompt: bevestig dat in stap 2 en geef in stap 3 alleen behoud-adviezen',
      '',
      'Begin met stap 1. Niet vooruit lopen.',
    ],
  },
  en: {
    opening: 'You are a GEO specialist (Generative Engine Optimization) for the Dutch market. Analyse the page below and give concrete, actionable recommendations to make this page more visible in ChatGPT and Perplexity for the given search prompts.',
    yes: 'yes',
    no: 'no',
    gscAttributeNote: 'Google Search Console data from the past 30 days, filtered on queries matching the keywords from this commercial prompt.',
    gscNotConnectedNote: 'User has not connected Search Console yet. Connect GSC in the dashboard for page-specific ranking data.',
    gscNoMatchesNote: 'No Search Console data found for the keywords from this commercial prompt on this page. The page may not yet receive Google impressions for these queries.',
    instructionBody: (hasGsc) => [
      'Follow these steps strictly in order. Do not skip any step. Output each step before moving to the next.',
      '',
      '## Step 1: Data inventory',
      '',
      'Read all the data above and summarise what you see. Maximum 150 words, in this structure:',
      '',
      '**Page positioning**',
      '- What is the main topic of the page based on H1, meta title and content?',
      '- Which audience is being addressed?',
      '- Which register is used (formal/informal)?',
      '',
      '**Current heading structure**',
      '- Which H2s are present? List them briefly.',
      '- What stands out about the structure (duplicates, missing Q&A headings, etc.)?',
      '',
      ...(hasGsc ? [
        '**Search Console signals**',
        '- Per matching query: position + impressions + clicks. What does this say about the page\'s current Google status for the commercial prompt?',
        '- Important: if impressions are low (below 50), the page may not be the right landing for this query. Call that out.',
        '',
      ] : []),
      '**AI visibility**',
      '- ChatGPT: mentioned or not? Which competitors are mentioned instead?',
      '- Perplexity: mentioned or not? Which competitors are mentioned instead?',
      '- What pattern do you see in the competitors (same region, same specialisation, same page-structure type)?',
      '',
      '## Step 2: Diagnosis',
      '',
      'Maximum 100 words. Answer:',
      '- Why is this page NOT chosen by ChatGPT/Perplexity while the competitors are?',
      '- Which 2-3 concrete differences do you see between this page and how the competitors are likely structured?',
      '',
      '## Step 3: Recommendations',
      '',
      'Only AFTER step 1 and 2 do you give concrete optimisation recommendations. Per commercial prompt:',
      '',
      'A. Competitor analysis (1-2 sentences): why are the mentioned competitors chosen?',
      '',
      'B. Concrete page changes, grouped under:',
      '   - Heading structure (which H2/H3 to add or rewrite, with exact text)',
      '   - Content blocks (which sections to add, with topic)',
      '   - Schema markup (which type: FAQPage, Service, LegalService, etc.)',
      '   - Internal linking (which pages link from/to this page)',
      '',
      'C. Example H2 section of 50-100 words that directly answers the search prompt, written in an authoritative tone. Use concrete numbers or source references where possible.',
      '',
      '## Output rules (apply to every step)',
      '',
      '- No marketing fluff. No "essential", "crucial", "in today\'s world"',
      '- No em dashes',
      '- Write in English, formal yet accessible',
      '- Match the register of the page (if the page uses formal "you", do the same in examples)',
      '- Give workable recommendations, not generic SEO tips',
      '- If the page already scores well on a commercial prompt: confirm that in step 2 and only give maintenance advice in step 3',
      '',
      'Start with step 1. Do not jump ahead.',
    ],
  },
}

export function generateOptimizationPrompt({
  pageUrl,
  pageContent = {},
  prompts = [],
  aiResults = [],
  promptGscData = null,
  locale = 'nl',
}) {
  const t = TEXTS[locale === 'en' ? 'en' : 'nl']
  const hasGsc = gscHasQueries(promptGscData)
  const lines = []

  lines.push(t.opening)
  lines.push('')

  // Pagina sectie
  lines.push('<page>')
  lines.push(`  <url>${pageUrl}</url>`)
  if (pageContent.h1) lines.push(`  <h1>${escapeXml(pageContent.h1)}</h1>`)
  if (pageContent.title) lines.push(`  <meta_title>${escapeXml(pageContent.title)}</meta_title>`)
  if (pageContent.metaDesc) lines.push(`  <meta_description>${escapeXml(pageContent.metaDesc)}</meta_description>`)
  if (Array.isArray(pageContent.headings) && pageContent.headings.length > 0) {
    lines.push('  <current_headings>')
    for (const heading of pageContent.headings) {
      const label = `H${heading.level}`
      lines.push(`    ${label}: ${escapeXml(heading.text)}`)
    }
    lines.push('  </current_headings>')
  }
  if (pageContent.contentExcerpt) {
    lines.push('  <current_content>')
    lines.push(escapeXml(pageContent.contentExcerpt))
    lines.push('  </current_content>')
  }
  lines.push('</page>')
  lines.push('')

  // Commercial prompts (GSC data is now PER prompt, filtered on page+keywords)
  lines.push('<commercial_prompts>')
  for (const promptText of prompts) {
    const chatgpt = aiResults.find(r => r.prompt === promptText && r.platform === 'chatgpt')
    const perplexity = aiResults.find(r => r.prompt === promptText && r.platform === 'perplexity')

    const allCompetitors = [
      ...(chatgpt?.competitors || []),
      ...(perplexity?.competitors || []),
    ]
    const uniqueCompetitors = [...new Set(allCompetitors.filter(Boolean))]

    lines.push('  <prompt>')
    lines.push(`    <question>${escapeXml(promptText)}</question>`)

    const gscBlock = renderGscForPrompt(promptGscData, promptText, t)
    for (const line of gscBlock) lines.push(line)

    if (chatgpt) {
      lines.push('    <chatgpt_result>')
      lines.push(`      <found>${chatgpt.mentioned ? t.yes : t.no}</found>`)
      if (chatgpt.snippet) {
        lines.push(`      <snippet>${escapeXml(truncate(chatgpt.snippet, 800))}</snippet>`)
      }
      lines.push('    </chatgpt_result>')
    }

    if (perplexity) {
      lines.push('    <perplexity_result>')
      lines.push(`      <found>${perplexity.mentioned ? t.yes : t.no}</found>`)
      if (perplexity.snippet) {
        lines.push(`      <snippet>${escapeXml(truncate(perplexity.snippet, 800))}</snippet>`)
      }
      lines.push('    </perplexity_result>')
    }

    if (uniqueCompetitors.length > 0) {
      lines.push('    <competitors_mentioned>')
      for (const competitor of uniqueCompetitors) {
        lines.push(`      <competitor>${escapeXml(competitor)}</competitor>`)
      }
      lines.push('    </competitors_mentioned>')
    }

    lines.push('  </prompt>')
  }
  lines.push('</commercial_prompts>')
  lines.push('')

  lines.push('<instruction>')
  for (const line of t.instructionBody(hasGsc)) lines.push(line)
  lines.push('</instruction>')

  return lines.join('\n')
}

// True only when GSC is connected and at least one prompt has real matching
// queries. Mirrors the data renderGscForPrompt would actually render, so the
// "Search Console signalen" instruction only appears when there is data to read.
function gscHasQueries(promptGscData) {
  if (!promptGscData) return false
  if (promptGscData.connected === false) return false
  const perPrompt = promptGscData.perPrompt || {}
  return Object.values(perPrompt).some(
    (entry) => Array.isArray(entry?.queries) && entry.queries.length > 0
  )
}

function renderGscForPrompt(promptGscData, promptText, t) {
  if (!promptGscData) return []
  if (promptGscData.connected === false) {
    return [
      '    <google_search_console>',
      `      <connected>${t.no}</connected>`,
      `      <explanation>${escapeXml(t.gscNotConnectedNote)}</explanation>`,
      '    </google_search_console>',
    ]
  }

  const perPrompt = promptGscData.perPrompt || {}
  const entry = perPrompt[promptText]
  if (!entry) return []

  const queries = entry.queries || []
  const out = [
    `    <google_search_console note="${escapeAttr(t.gscAttributeNote)}">`,
    `      <connected>${t.yes}</connected>`,
  ]

  if (queries.length === 0) {
    out.push('      <matching_queries></matching_queries>')
    out.push(`      <explanation>${escapeXml(t.gscNoMatchesNote)}</explanation>`)
  } else {
    out.push('      <matching_queries>')
    for (const q of queries) {
      out.push('        <query>')
      out.push(`          <keyword>${escapeXml(q.query)}</keyword>`)
      if (q.position != null) out.push(`          <position>${formatPosition(q.position)}</position>`)
      if (q.impressions != null) out.push(`          <impressions>${q.impressions}</impressions>`)
      if (q.clicks != null) out.push(`          <clicks>${q.clicks}</clicks>`)
      if (q.ctr != null) out.push(`          <ctr>${formatCtr(q.ctr)}</ctr>`)
      out.push('        </query>')
    }
    out.push('      </matching_queries>')
  }

  out.push('    </google_search_console>')
  return out
}

function escapeXml(value) {
  if (value == null) return ''
  // LLM-tolerant: leave & literal so source like "Content & autoriteit" reads
  // naturally. Only neutralise angle brackets that would confuse XML tag parsing.
  return String(value)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Attribute values need quote handling on top of angles, otherwise the
// attribute terminates early when the source contains a double quote.
function escapeAttr(value) {
  if (value == null) return ''
  return String(value)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(text, max) {
  if (!text) return ''
  const trimmed = String(text).trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max).trim() + '...'
}

function formatPosition(position) {
  const num = Number(position)
  if (!isFinite(num)) return String(position)
  return num.toFixed(1)
}

function formatCtr(ctr) {
  const num = Number(ctr)
  if (!isFinite(num)) return String(ctr)
  return (num * 100).toFixed(2) + '%'
}
