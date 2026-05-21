// Genereert een Claude-prompt op maat per pagina voor GEO optimalisatie.
// Pure function, geen API calls. Input is alles wat de Werklijst per pagina
// heeft: URL, page content (title/meta/h1), gekoppelde prompts, AI scan
// resultaten per prompt (ChatGPT + Perplexity), en GSC data.

export function generateOptimizationPrompt({
  pageUrl,
  pageContent = {},
  prompts = [],
  aiResults = [],
  gscData = null,
}) {
  const lines = []

  lines.push(
    'Je bent een Nederlandse GEO-specialist (Generative Engine Optimization). Analyseer onderstaande pagina en geef concrete, uitvoerbare aanbevelingen om deze pagina beter zichtbaar te maken in ChatGPT en Perplexity voor de gegeven zoekprompts.'
  )
  lines.push('')

  // Pagina sectie
  lines.push('<pagina>')
  lines.push(`  <url>${pageUrl}</url>`)
  if (pageContent.h1) lines.push(`  <h1>${escapeXml(pageContent.h1)}</h1>`)
  if (pageContent.title) lines.push(`  <meta_title>${escapeXml(pageContent.title)}</meta_title>`)
  if (pageContent.metaDesc) lines.push(`  <meta_description>${escapeXml(pageContent.metaDesc)}</meta_description>`)
  if (Array.isArray(pageContent.headings) && pageContent.headings.length > 0) {
    lines.push('  <huidige_koppen>')
    for (const heading of pageContent.headings) {
      const label = `H${heading.level}`
      lines.push(`    ${label}: ${escapeXml(heading.text)}`)
    }
    lines.push('  </huidige_koppen>')
  }
  if (pageContent.contentExcerpt) {
    lines.push('  <huidige_content>')
    lines.push(escapeXml(pageContent.contentExcerpt))
    lines.push('  </huidige_content>')
  }
  lines.push('</pagina>')
  lines.push('')

  // Google Search Console sectie (alleen als data bestaat)
  if (gscData && (gscData.position != null || gscData.impressions != null || gscData.clicks != null)) {
    lines.push('<google_search_console>')
    if (gscData.position != null) {
      lines.push(`  <huidige_positie>${formatPosition(gscData.position)}</huidige_positie>`)
    }
    if (gscData.impressions != null) {
      lines.push(`  <impressies>${gscData.impressions}</impressies>`)
    }
    if (gscData.clicks != null) {
      lines.push(`  <clicks>${gscData.clicks}</clicks>`)
    }
    if (gscData.ctr != null) {
      lines.push(`  <ctr>${formatCtr(gscData.ctr)}</ctr>`)
    }
    lines.push('</google_search_console>')
    lines.push('')
  }

  // Commerciele prompts
  lines.push('<commerciele_prompts>')
  for (const promptText of prompts) {
    const chatgpt = aiResults.find(r => r.prompt === promptText && r.platform === 'chatgpt')
    const perplexity = aiResults.find(r => r.prompt === promptText && r.platform === 'perplexity')

    // Concurrenten dedupliceren over beide platforms
    const allCompetitors = [
      ...(chatgpt?.competitors || []),
      ...(perplexity?.competitors || []),
    ]
    const uniqueCompetitors = [...new Set(allCompetitors.filter(Boolean))]

    lines.push('  <prompt>')
    lines.push(`    <vraag>${escapeXml(promptText)}</vraag>`)

    if (chatgpt) {
      lines.push('    <chatgpt_resultaat>')
      lines.push(`      <gevonden>${chatgpt.mentioned ? 'ja' : 'nee'}</gevonden>`)
      if (chatgpt.snippet) {
        lines.push(`      <snippet>${escapeXml(truncate(chatgpt.snippet, 800))}</snippet>`)
      }
      lines.push('    </chatgpt_resultaat>')
    }

    if (perplexity) {
      lines.push('    <perplexity_resultaat>')
      lines.push(`      <gevonden>${perplexity.mentioned ? 'ja' : 'nee'}</gevonden>`)
      if (perplexity.snippet) {
        lines.push(`      <snippet>${escapeXml(truncate(perplexity.snippet, 800))}</snippet>`)
      }
      lines.push('    </perplexity_resultaat>')
    }

    if (uniqueCompetitors.length > 0) {
      lines.push('    <concurrenten_genoemd>')
      for (const competitor of uniqueCompetitors) {
        lines.push(`      <concurrent>${escapeXml(competitor)}</concurrent>`)
      }
      lines.push('    </concurrenten_genoemd>')
    }

    lines.push('  </prompt>')
  }
  lines.push('</commerciele_prompts>')
  lines.push('')

  // Opdracht
  lines.push('<opdracht>')
  lines.push('Geef per zoekprompt waar deze pagina NIET wordt vermeld:')
  lines.push('1. Waarom de concurrenten wel worden gekozen (kort, 1-2 zinnen)')
  lines.push('2. Wat er concreet moet veranderen aan de pagina: koppen, structuur, content blokken, schema markup')
  lines.push('3. Een voorbeeld H2-sectie (50-100 woorden) die direct antwoord geeft op de zoekprompt, geschreven in autoritatieve toon met concrete cijfers of bronvermelding waar mogelijk')
  lines.push('')
  lines.push('Output regels:')
  lines.push('- Geen marketing-fluff, geen "essentieel" of "cruciaal"')
  lines.push('- Geen em dashes')
  lines.push('- Schrijf in het Nederlands, formeel maar toegankelijk')
  lines.push('- Geef werkbare aanbevelingen, geen algemene SEO tips')
  lines.push('- Als de pagina al goed scoort op een prompt: bevestig dat kort en sla over')
  lines.push('</opdracht>')

  return lines.join('\n')
}

function escapeXml(value) {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
