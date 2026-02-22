import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

// ============================================
// i18n MESSAGES FOR PDF REPORT
// ============================================
const PDF_MESSAGES = {
  nl: {
    // Title page
    reportTitle: 'GEO Analyse Rapport',
    unknown: 'Onbekend',
    disclaimer: 'Dit rapport toont hoe zichtbaar uw bedrijf is in AI-gestuurde zoeksystemen.',
    scannedOn: (count, names) => `Gescand op ${count} platform${count === 1 ? '' : 's'}: ${names}.`,
    noPlatformsScanned: 'Nog geen platforms gescand.',
    liveResults: 'Voor live resultaten en updates, bekijk het dashboard op teun.ai.',
    aiVisibilityScore: 'AI Visibility Score',
    geoOptimization: 'GEO Optimalisatie',
    platformsScanned: 'Platforms Gescand',
    aiVisibility: (label, score) => `${label} \u2014 ${score}% AI-zichtbaarheid`,
    quickStats: (prompts, mentioned, total, platforms) => `${prompts} commerciele prompts getest  \u2022  ${mentioned} van ${total} keer vermeld  \u2022  ${platforms} AI-platforms`,
    // Score labels
    excellent: 'Uitstekend',
    good: 'Goed',
    average: 'Gemiddeld',
    poor: 'Slecht',
    // Section headers
    resultsPerPlatform: '1. Resultaten per AI-platform',
    testedIntro: (prompts, platforms) => `We hebben ${prompts} commerciele prompts getest op ${platforms} AI-platforms. Hieronder de resultaten per platform met de exacte prompts en AI-antwoorden.`,
    // Table headers
    platform: 'Platform',
    mentioned: 'Vermeld',
    total: 'Totaal',
    score: 'Score',
    // Platform detail
    platformMentioned: (name, m, t, pct) => `${name}  \u2014  ${m}/${t} vermeld (${pct}%)`,
    competitors: 'Concurrenten: ',
    // Prompt summary
    promptOverview: '2. Overzicht alle prompts',
    promptOverviewIntro: (count) => `Totaal ${count} prompts getest. Hieronder per prompt op welke platforms uw bedrijf vermeld wordt.`,
    yes: 'Ja',
    no: 'Nee',
    // Page scores
    pageScores: '3. Pagina Scores',
    pageScoresIntro: (count) => `GEO-optimalisatiescore voor alle ${count} gescande pagina\'s:`,
    page: 'Pagina',
    status: 'Status',
    averageScore: (score, label) => `Gemiddelde score: ${score}/100 (${label})`,
    // Recommendations
    recommendations: 'Aanbevelingen',
    recommendationsIntro: 'Op basis van de analyse adviseren we de volgende stappen:',
    priorityHigh: 'Hoog',
    priorityMedium: 'Middel',
    recVisibility: 'Vergroot je AI-zichtbaarheid',
    recVisibilityDesc: (company, notMentioned, total) => `${company} wordt bij ${notMentioned} van de ${total} prompts niet vermeld door AI-platforms. Maak gerichte content die direct antwoord geeft op deze vragen.`,
    recPlatform: (name) => `Verbeter zichtbaarheid op ${name}`,
    recPlatformDesc: (score, name) => `Met slechts ${score}% zichtbaarheid op ${name} laat u klanten liggen. Elk platform heeft eigen criteria \u2014 optimaliseer uw content specifiek voor ${name}.`,
    recStructuredData: 'Implementeer structured data',
    recStructuredDataDesc: 'Voeg JSON-LD markup toe (Organization, FAQ, Product, LocalBusiness) zodat AI-systemen uw content beter kunnen begrijpen en citeren.',
    recEeat: 'Versterk E-E-A-T signalen',
    recEeatDesc: 'Zorg voor duidelijke auteursinformatie, referenties naar betrouwbare bronnen en regelmatig bijgewerkte content om uw autoriteit te vergroten.',
    recConversational: 'Optimaliseer voor conversational search',
    recConversationalDesc: 'AI-platforms beantwoorden steeds meer vragen in gespreksvorm. Structureer uw content met duidelijke vragen en antwoorden, zodat AI uw tekst direct kan overnemen.',
    recGeoPages: "Optimaliseer landingspagina\'s voor GEO",
    recGeoPagesDesc: "Verbeter de GEO-score door betere contentstructuur, FAQ-secties en gedetailleerde antwoorden op veelgestelde vragen.",
    fomo: 'Wacht niet te lang \u2014 elke dag zonder GEO-optimalisatie gaan potentiele klanten naar concurrenten die wel zichtbaar zijn in AI-antwoorden.',
    // Footer
    needHelp: 'Hulp nodig bij GEO-optimalisatie?',
    poweredBy: 'Powered by teun.ai',
    // Date locale
    dateLocale: 'nl-NL',
    andWord: ' en ',
  },
  en: {
    reportTitle: 'GEO Analysis Report',
    unknown: 'Unknown',
    disclaimer: 'This report shows how visible your business is in AI-powered search systems.',
    scannedOn: (count, names) => `Scanned on ${count} platform${count === 1 ? '' : 's'}: ${names}.`,
    noPlatformsScanned: 'No platforms scanned yet.',
    liveResults: 'For live results and updates, visit the dashboard at teun.ai.',
    aiVisibilityScore: 'AI Visibility Score',
    geoOptimization: 'GEO Optimization',
    platformsScanned: 'Platforms Scanned',
    aiVisibility: (label, score) => `${label} \u2014 ${score}% AI visibility`,
    quickStats: (prompts, mentioned, total, platforms) => `${prompts} commercial prompts tested  \u2022  ${mentioned} of ${total} times mentioned  \u2022  ${platforms} AI platforms`,
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    poor: 'Poor',
    resultsPerPlatform: '1. Results per AI platform',
    testedIntro: (prompts, platforms) => `We tested ${prompts} commercial prompts on ${platforms} AI platforms. Below are the results per platform with the exact prompts and AI responses.`,
    platform: 'Platform',
    mentioned: 'Mentioned',
    total: 'Total',
    score: 'Score',
    platformMentioned: (name, m, t, pct) => `${name}  \u2014  ${m}/${t} mentioned (${pct}%)`,
    competitors: 'Competitors: ',
    promptOverview: '2. All prompts overview',
    promptOverviewIntro: (count) => `${count} prompts tested in total. Below shows on which platforms your business is mentioned per prompt.`,
    yes: 'Yes',
    no: 'No',
    pageScores: '3. Page Scores',
    pageScoresIntro: (count) => `GEO optimization score for all ${count} scanned pages:`,
    page: 'Page',
    status: 'Status',
    averageScore: (score, label) => `Average score: ${score}/100 (${label})`,
    recommendations: 'Recommendations',
    recommendationsIntro: 'Based on the analysis, we recommend the following steps:',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    recVisibility: 'Increase your AI visibility',
    recVisibilityDesc: (company, notMentioned, total) => `${company} is not mentioned by AI platforms for ${notMentioned} of ${total} prompts. Create targeted content that directly answers these questions.`,
    recPlatform: (name) => `Improve visibility on ${name}`,
    recPlatformDesc: (score, name) => `With only ${score}% visibility on ${name}, you are missing potential customers. Each platform has its own criteria \u2014 optimize your content specifically for ${name}.`,
    recStructuredData: 'Implement structured data',
    recStructuredDataDesc: 'Add JSON-LD markup (Organization, FAQ, Product, LocalBusiness) so AI systems can better understand and cite your content.',
    recEeat: 'Strengthen E-E-A-T signals',
    recEeatDesc: 'Ensure clear author information, references to reliable sources, and regularly updated content to increase your authority.',
    recConversational: 'Optimize for conversational search',
    recConversationalDesc: 'AI platforms increasingly answer questions in conversational form. Structure your content with clear questions and answers, so AI can directly use your text.',
    recGeoPages: 'Optimize landing pages for GEO',
    recGeoPagesDesc: 'Improve the GEO score through better content structure, FAQ sections, and detailed answers to frequently asked questions.',
    fomo: 'Don\'t wait too long \u2014 every day without GEO optimization, potential customers go to competitors who are visible in AI responses.',
    needHelp: 'Need help with GEO optimization?',
    poweredBy: 'Powered by teun.ai',
    dateLocale: 'en-GB',
    andWord: ' and ',
  }
}

function getPdfMsg(locale) { return PDF_MESSAGES[locale] || PDF_MESSAGES['nl'] }


export async function POST(request) {
  try {
    const data = await request.json()
    const { companyName, companyWebsite, companyCategory, matches, scanResults, aiResults, overallScore, manualChecks, combinedResults, locale = 'nl' } = data

    const msg = getPdfMsg(locale)

    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // Load mascot image
    let mascotImage = null
    try {
      const localPaths = [
        path.join(process.cwd(), 'public', 'images', 'teun-met-vergrootglas.png'),
        path.join(process.cwd(), 'public', 'teun-met-vergrootglas.png'),
        path.join(process.cwd(), 'public', 'images', 'teun-ai-mascotte.png'),
        path.join(process.cwd(), 'public', 'mascotte-teun-ai.png'),
      ]
      let imageBytes = null
      for (const p of localPaths) {
        if (fs.existsSync(p)) {
          imageBytes = fs.readFileSync(p)
          break
        }
      }
      if (!imageBytes) {
        const imgRes = await fetch('https://teun.ai/images/teun-met-vergrootglas.png')
        if (imgRes.ok) {
          imageBytes = new Uint8Array(await imgRes.arrayBuffer())
        }
      }
      if (imageBytes) {
        mascotImage = await pdfDoc.embedPng(imageBytes)
      }
    } catch (e) {
      console.warn('Could not load mascot image:', e.message)
    }

    // A4 dimensions
    const pageWidth = 595.28
    const pageHeight = 841.89
    const margin = 50
    const contentWidth = pageWidth - 2 * margin

    // Colors
    const BLACK = rgb(0.12, 0.12, 0.24)
    const PURPLE = rgb(0.39, 0.4, 0.95)
    const GREEN = rgb(0.09, 0.64, 0.26)
    const RED = rgb(0.86, 0.15, 0.15)
    const ORANGE = rgb(0.85, 0.47, 0.02)
    const GRAY = rgb(0.4, 0.4, 0.4)
    const LIGHTGRAY = rgb(0.58, 0.65, 0.71)
    const DARKGRAY = rgb(0.29, 0.33, 0.39)
    const WHITE = rgb(1, 1, 1)
    const LIGHTBG = rgb(0.96, 0.97, 0.98)
    const PURPLEBG = rgb(0.95, 0.92, 1)
    const GREENBG = rgb(0.92, 0.98, 0.92)
    const BLUEBG = rgb(0.92, 0.95, 1)
    const EMERALDBG = rgb(0.92, 0.98, 0.96)

    // Score helpers
    const getStatus = (score) => {
      if (score >= 95) return { label: msg.excellent, color: GREEN }
      if (score >= 80) return { label: msg.good, color: GREEN }
      if (score >= 55) return { label: msg.average, color: ORANGE }
      return { label: msg.poor, color: RED }
    }
    const getScoreColor = (score) => score >= 80 ? GREEN : score >= 55 ? ORANGE : RED

    // Text helpers
    const truncateUrl = (url, max = 52) => {
      const clean = sanitize((url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''))
      return clean.length > max ? clean.slice(0, max) + '...' : clean
    }

    const wrapText = (text, font, fontSize, maxWidth) => {
      if (!text) return []
      const clean = sanitize(text)
      if (!clean) return []
      const words = clean.split(' ')
      const lines = []
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word
        const testWidth = font.widthOfTextAtSize(testLine, fontSize)
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) lines.push(currentLine)
      return lines
    }

    const sanitize = (text) => {
      if (!text) return ''
      return String(text).replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()
    }

    const drawCentered = (page, text, y, font, size, color) => {
      const clean = sanitize(text)
      if (!clean) return
      const w = font.widthOfTextAtSize(clean, size)
      page.drawText(clean, { x: (pageWidth - w) / 2, y, size, font, color })
    }

    // New page helper
    let currentPage = null
    let y = 0
    const mascotWidth = 50
    const mascotHeight = mascotImage ? (50 * mascotImage.height / mascotImage.width) : 65
    const newPage = () => {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      if (mascotImage) {
        currentPage.drawImage(mascotImage, {
          x: pageWidth - margin - mascotWidth,
          y: pageHeight - margin - mascotHeight + 15,
          width: mascotWidth,
          height: mascotHeight,
          opacity: 0.9
        })
      }
      return currentPage
    }

    const ensureSpace = (needed) => {
      if (y - needed < margin + 30) {
        newPage()
      }
    }

    // Date
    const today = new Date().toLocaleDateString(msg.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })

    // Extract platform data from combinedResults or fall back to aiResults
    const cr = combinedResults || {}
    const platformData = [
      { key: 'perplexity', name: 'Perplexity', color: PURPLE, bg: PURPLEBG, data: cr.perplexity || { mentioned: 0, total: 0, results: [] } },
      { key: 'chatgpt', name: 'ChatGPT', color: GREEN, bg: GREENBG, data: cr.chatgpt || { mentioned: 0, total: 0, results: [] } },
      { key: 'googleAi', name: 'Google AI Modus', color: rgb(0.15, 0.39, 0.92), bg: BLUEBG, data: cr.googleAi || { mentioned: 0, total: 0, results: [] } },
      { key: 'googleAiOverview', name: 'Google AI Overviews', color: rgb(0.06, 0.58, 0.45), bg: EMERALDBG, data: cr.googleAiOverview || { mentioned: 0, total: 0, results: [] } },
    ]
    const activePlatforms = platformData.filter(p => p.data.total > 0)
    const totalMentioned = activePlatforms.reduce((s, p) => s + p.data.mentioned, 0)
    const totalScanned = activePlatforms.reduce((s, p) => s + p.data.total, 0)

    // Build unique prompt list across all platforms
    const allPrompts = new Set()
    activePlatforms.forEach(p => {
      (p.data.results || []).forEach(r => {
        const prompt = (r.prompt || r.ai_prompt || '').trim()
        if (prompt) allPrompts.add(prompt)
      })
    })
    const uniquePrompts = [...allPrompts]

    // Extract scores
    const scoreValue = typeof overallScore === 'object' && overallScore !== null
      ? (overallScore.overall || 0) : (overallScore || 0)
    const aiVisScore = typeof overallScore === 'object' && overallScore !== null
      ? (overallScore.aiVisibility || 0) : 0
    const geoScore = typeof overallScore === 'object' && overallScore !== null
      ? (overallScore.geo || 0) : 0
    const hasGeoData = Object.keys(scanResults || {}).length > 0

    // ===========================
    // PAGE 1: TITLE
    // ===========================
    let page = newPage()

    y -= 120
    drawCentered(page, msg.reportTitle, y, helveticaBold, 28, BLACK)

    y -= 40
    drawCentered(page, companyName || msg.unknown, y, helveticaBold, 20, PURPLE)

    y -= 30
    drawCentered(page, today, y, helvetica, 11, LIGHTGRAY)

    if (companyWebsite) {
      y -= 18
      drawCentered(page, companyWebsite.replace(/^https?:\/\//, ''), y, helvetica, 11, PURPLE)
    }

    // Disclaimer
    y -= 50
    drawCentered(page, msg.disclaimer, y, helveticaOblique, 9, LIGHTGRAY)
    y -= 14
    const scannedPlatformNames = activePlatforms.map(p => p.name).join(', ').replace(/, ([^,]*)$/, msg.andWord + '$1')
    drawCentered(page, activePlatforms.length > 0 
      ? msg.scannedOn(activePlatforms.length, scannedPlatformNames)
      : msg.noPlatformsScanned, y, helveticaOblique, 9, LIGHTGRAY)
    y -= 14
    drawCentered(page, msg.liveResults, y, helveticaOblique, 9, LIGHTGRAY)

    // Score boxes
    y -= 50
    const boxWidth = hasGeoData ? 145 : 220
    const boxGap = 20
    const boxCount = hasGeoData ? 3 : 2
    const totalBoxWidth = boxWidth * boxCount + boxGap * (boxCount - 1)
    const startX = (pageWidth - totalBoxWidth) / 2
    const boxHeight = 70

    const boxes = [
      { label: msg.aiVisibilityScore, value: `${aiVisScore}%`, color: rgb(0.58, 0.25, 0.85) },
    ]
    if (hasGeoData) {
      boxes.push({ label: msg.geoOptimization, value: `${geoScore}%`, color: rgb(0.25, 0.35, 0.85) })
    }
    boxes.push({ label: msg.platformsScanned, value: `${activePlatforms.length}/4`, color: rgb(0.15, 0.39, 0.6) })

    boxes.forEach((box, i) => {
      const bx = startX + i * (boxWidth + boxGap)
      page.drawRectangle({ x: bx, y: y - boxHeight, width: boxWidth, height: boxHeight, color: box.color })
      page.drawText(box.label, { x: bx + 12, y: y - 16, size: 9, font: helvetica, color: WHITE })
      page.drawText(box.value, { x: bx + 12, y: y - 48, size: 28, font: helveticaBold, color: WHITE })
    })

    y -= boxHeight + 15

    // Status text
    const status = getStatus(aiVisScore)
    drawCentered(page, msg.aiVisibility(status.label, aiVisScore), y, helveticaBold, 12, status.color)

    // Quick stats
    y -= 40
    const statsText = msg.quickStats(uniquePrompts.length, totalMentioned, totalScanned, activePlatforms.length)
    drawCentered(page, statsText, y, helvetica, 9, DARKGRAY)

    // ===========================
    // PAGE 2: PLATFORM OVERZICHT
    // ===========================
    page = newPage()

    page.drawText(msg.resultsPerPlatform, { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
    y -= 8
    page.drawRectangle({ x: margin, y, width: 240, height: 2, color: PURPLE })
    y -= 25

    const introWidth = contentWidth - mascotWidth - 25
    const introLines = wrapText(
      msg.testedIntro(uniquePrompts.length, activePlatforms.length),
      helvetica, 10, introWidth
    )
    introLines.forEach(line => {
      page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: DARKGRAY })
      y -= 14
    })
    y -= 10

    // Platform score table
    const colWidths = [160, 80, 80, 80]
    const rowHeight = 22
    currentPage.drawRectangle({ x: margin, y: y - rowHeight, width: contentWidth, height: rowHeight, color: BLACK })
    let cx = margin + 8
    ;[msg.platform, msg.mentioned, msg.total, msg.score].forEach((h, i) => {
      currentPage.drawText(h, { x: cx, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      cx += colWidths[i]
    })
    y -= rowHeight

    activePlatforms.forEach((p, idx) => {
      const score = p.data.total > 0 ? Math.round((p.data.mentioned / p.data.total) * 100) : 0
      const bg = idx % 2 === 0 ? rgb(0.97, 0.97, 0.97) : WHITE
      currentPage.drawRectangle({ x: margin, y: y - rowHeight, width: contentWidth, height: rowHeight, color: bg })
      let cx = margin + 8
      currentPage.drawText(p.name, { x: cx, y: y - 15, size: 9, font: helveticaBold, color: DARKGRAY })
      cx += colWidths[0]
      currentPage.drawText(`${p.data.mentioned}`, { x: cx + 20, y: y - 15, size: 9, font: helvetica, color: DARKGRAY })
      cx += colWidths[1]
      currentPage.drawText(`${p.data.total}`, { x: cx + 20, y: y - 15, size: 9, font: helvetica, color: DARKGRAY })
      cx += colWidths[2]
      currentPage.drawText(`${score}%`, { x: cx + 15, y: y - 15, size: 9, font: helveticaBold, color: getScoreColor(score) })
      y -= rowHeight
    })
    y -= 20

    // ===========================
    // PER-PLATFORM DETAIL PAGES
    // ===========================
    for (const platform of activePlatforms) {
      const results = platform.data.results || []
      if (results.length === 0) continue

      ensureSpace(80)

      // Platform header
      currentPage.drawRectangle({ x: margin, y: y - 24, width: contentWidth, height: 24, color: platform.bg })
      const platformScore = platform.data.total > 0 ? Math.round((platform.data.mentioned / platform.data.total) * 100) : 0
      currentPage.drawText(msg.platformMentioned(platform.name, platform.data.mentioned, platform.data.total, platformScore), {
        x: margin + 10, y: y - 17, size: 11, font: helveticaBold, color: platform.color
      })
      y -= 34

      // Each prompt result
      for (const result of results) {
        const prompt = (result.prompt || result.ai_prompt || '').trim()
        if (!prompt) continue

        const snippet = (result.snippet || result.simulated_ai_response_snippet || '').trim()
        const competitors = result.competitors || result.competitors_mentioned || []
        const mentioned = result.mentioned === true || result.company_mentioned === true

        // Calculate needed space
        const snippetLines = snippet ? wrapText(snippet, helvetica, 8, contentWidth - 30) : []
        const neededSpace = 22 + (snippetLines.length > 0 ? Math.min(snippetLines.length, 6) * 10 + 16 : 0) + (competitors.length > 0 ? 22 : 0) + 8
        ensureSpace(neededSpace)

        // Prompt line with status icon
        const icon = mentioned ? '[V]' : '[X]'
        const iconColor = mentioned ? GREEN : RED
        currentPage.drawText(icon, { x: margin, y, size: 9, font: helveticaBold, color: iconColor })

        const promptLines = wrapText(prompt, helvetica, 9, contentWidth - 35)
        promptLines.forEach((line, i) => {
          currentPage.drawText(line, { x: margin + 28, y: y - (i * 12), size: 9, font: helvetica, color: BLACK })
        })
        y -= promptLines.length * 12 + 2

        // Snippet (AI response preview)
        if (snippet) {
          const maxSnippetLines = 5
          const sLines = snippetLines.slice(0, maxSnippetLines)
          
          // Light background for snippet
          const snippetHeight = sLines.length * 10 + 8
          currentPage.drawRectangle({
            x: margin + 25, y: y - snippetHeight, width: contentWidth - 30, height: snippetHeight,
            color: mentioned ? rgb(0.95, 0.99, 0.95) : rgb(0.99, 0.95, 0.95)
          })

          sLines.forEach((line, i) => {
            currentPage.drawText(line, {
              x: margin + 30, y: y - 8 - (i * 10), size: 8, font: helvetica, color: DARKGRAY
            })
          })
          if (snippetLines.length > maxSnippetLines) {
            currentPage.drawText('...', {
              x: margin + 30, y: y - 8 - (maxSnippetLines * 10), size: 8, font: helvetica, color: LIGHTGRAY
            })
          }
          y -= snippetHeight + 4
        }

        // Competitors
        if (competitors.length > 0) {
          currentPage.drawText(msg.competitors, { x: margin + 28, y, size: 8, font: helveticaBold, color: ORANGE })
          const compText = competitors.join(', ')
          const compLines = wrapText(compText, helvetica, 8, contentWidth - 100)
          const labelWidth = helveticaBold.widthOfTextAtSize(msg.competitors, 8)
          compLines.forEach((line, i) => {
            currentPage.drawText(line, {
              x: margin + 28 + (i === 0 ? labelWidth : 0), y: y - (i * 10), size: 8, font: helvetica, color: ORANGE
            })
          })
          y -= compLines.length * 10 + 2
        }

        y -= 6
      }

      y -= 10
    }

    // ===========================
    // PROMPT SUMMARY TABLE
    // ===========================
    ensureSpace(80)
    if (y < pageHeight - margin - 50) {
      // Only add section header if we're not at top of page
    }
    page = newPage()

    currentPage.drawText(msg.promptOverview, { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
    y -= 8
    currentPage.drawRectangle({ x: margin, y, width: 200, height: 2, color: PURPLE })
    y -= 25

    currentPage.drawText(
      msg.promptOverviewIntro(uniquePrompts.length),
      { x: margin, y, size: 10, font: helvetica, color: DARKGRAY }
    )
    y -= 20

    // Build per-prompt cross-platform status
    for (const prompt of uniquePrompts) {
      ensureSpace(50)

      // Check on which platforms this prompt is mentioned
      const platformStatus = activePlatforms.map(p => {
        const result = (p.data.results || []).find(r => (r.prompt || r.ai_prompt || '') === prompt)
        if (!result) return { name: p.name, status: '-', color: LIGHTGRAY }
        const mentioned = result.mentioned === true || result.company_mentioned === true
        return { name: p.name, status: mentioned ? 'V' : 'X', color: mentioned ? GREEN : RED }
      })

      const isMentionedAnywhere = platformStatus.some(ps => ps.status === 'V')
      const icon = isMentionedAnywhere ? '[V]' : '[X]'
      const iconColor = isMentionedAnywhere ? GREEN : RED

      currentPage.drawText(icon, { x: margin, y, size: 9, font: helveticaBold, color: iconColor })

      const promptLines = wrapText(prompt, helvetica, 9, contentWidth - 35)
      promptLines.forEach((line, i) => {
        currentPage.drawText(line, { x: margin + 28, y: y - (i * 12), size: 9, font: helvetica, color: BLACK })
      })
      y -= promptLines.length * 12

      // Platform badges
      let badgeX = margin + 28
      platformStatus.forEach(ps => {
        if (ps.status === '-') return
        const label = `${ps.name}: ${ps.status === 'V' ? msg.yes : msg.no}`
        const labelWidth = helvetica.widthOfTextAtSize(label, 7)
        const badgeW = labelWidth + 10
        
        currentPage.drawRectangle({
          x: badgeX, y: y - 2, width: badgeW, height: 12,
          color: ps.status === 'V' ? rgb(0.92, 0.98, 0.92) : rgb(0.99, 0.93, 0.93),
        })
        currentPage.drawText(label, { x: badgeX + 5, y: y, size: 7, font: helvetica, color: ps.color })
        badgeX += badgeW + 4
      })

      y -= 16
    }

    // ===========================
    // GEO PAGE SCORES (if available)
    // ===========================
    const pageEntries = Object.entries(scanResults || {}).filter(([, v]) => v.scanned).sort((a, b) => (b[1].score || 0) - (a[1].score || 0))

    if (pageEntries.length > 0) {
      page = newPage()

      page.drawText(msg.pageScores, { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
      y -= 8
      page.drawRectangle({ x: margin, y, width: 140, height: 2, color: PURPLE })
      y -= 25

      page.drawText(msg.pageScoresIntro(pageEntries.length), { x: margin, y, size: 10, font: helvetica, color: DARKGRAY })
      y -= 25

      const colW = [300, 80, 80]
      const rowH = 22
      page.drawRectangle({ x: margin, y: y - rowH, width: contentWidth, height: rowH, color: BLACK })
      let cx2 = margin + 8
      page.drawText(msg.page, { x: cx2, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      cx2 += colW[0]
      page.drawText(msg.score, { x: cx2 + 15, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      cx2 += colW[1]
      page.drawText(msg.status, { x: cx2 + 10, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      y -= rowH

      pageEntries.forEach(([url, result], idx) => {
        ensureSpace(rowH + 10)
        const score = result.score || 0
        const st = getStatus(score)
        const bg = idx % 2 === 0 ? rgb(0.97, 0.97, 0.97) : WHITE
        currentPage.drawRectangle({ x: margin, y: y - rowH, width: contentWidth, height: rowH, color: bg })
        let cx2 = margin + 8
        currentPage.drawText(truncateUrl(url, 48), { x: cx2, y: y - 15, size: 9, font: helvetica, color: DARKGRAY })
        cx2 += colW[0]
        currentPage.drawText(`${score}/100`, { x: cx2 + 10, y: y - 15, size: 9, font: helveticaBold, color: st.color })
        cx2 += colW[1]
        currentPage.drawText(st.label, { x: cx2 + 5, y: y - 15, size: 9, font: helvetica, color: st.color })
        y -= rowH
      })

      y -= 15
      const avgScore = Math.round(pageEntries.reduce((sum, [, r]) => sum + (r.score || 0), 0) / pageEntries.length)
      const avgSt = getStatus(avgScore)
      currentPage.drawText(msg.averageScore(avgScore, avgSt.label), {
        x: margin, y, size: 11, font: helveticaBold, color: avgSt.color
      })
    }

    // ===========================
    // AANBEVELINGEN
    // ===========================
    page = newPage()
    const recNum = pageEntries.length > 0 ? '4' : '3'

    page.drawText(`${recNum}. ${msg.recommendations}`, { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
    y -= 8
    page.drawRectangle({ x: margin, y, width: 140, height: 2, color: PURPLE })
    y -= 25

    page.drawText(msg.recommendationsIntro, { x: margin, y, size: 10, font: helvetica, color: DARKGRAY })
    y -= 20

    // Build smart recommendations based on actual data
    const notMentionedCount = uniquePrompts.filter(prompt => {
      return !activePlatforms.some(p =>
        (p.data.results || []).some(r =>
          (r.prompt || r.ai_prompt || '') === prompt && (r.mentioned || r.company_mentioned)
        )
      )
    }).length

    // Find weakest platform
    const weakestPlatform = activePlatforms.length > 0
      ? activePlatforms.reduce((w, p) => {
          const score = p.data.total > 0 ? p.data.mentioned / p.data.total : 1
          const wScore = w.data.total > 0 ? w.data.mentioned / w.data.total : 1
          return score < wScore ? p : w
        })
      : null

    const recommendations = []

    if (notMentionedCount > 0) {
      recommendations.push({
        title: msg.recVisibility,
        priority: msg.priorityHigh,
        desc: msg.recVisibilityDesc(companyName, notMentionedCount, uniquePrompts.length)
      })
    }

    if (weakestPlatform) {
      const wScore = weakestPlatform.data.total > 0 ? Math.round((weakestPlatform.data.mentioned / weakestPlatform.data.total) * 100) : 0
      if (wScore < 50) {
        recommendations.push({
          title: msg.recPlatform(weakestPlatform.name),
          priority: msg.priorityHigh,
          desc: msg.recPlatformDesc(wScore, weakestPlatform.name)
        })
      }
    }

    recommendations.push({
      title: msg.recStructuredData,
      priority: msg.priorityHigh,
      desc: msg.recStructuredDataDesc
    })

    recommendations.push({
      title: msg.recEeat,
      priority: msg.priorityHigh,
      desc: msg.recEeatDesc
    })

    recommendations.push({
      title: msg.recConversational,
      priority: msg.priorityMedium,
      desc: msg.recConversationalDesc
    })

    if (hasGeoData) {
      recommendations.push({
        title: msg.recGeoPages,
        priority: msg.priorityHigh,
        desc: msg.recGeoPagesDesc
      })
    }

    recommendations.forEach((rec, i) => {
      ensureSpace(50)
      currentPage.drawText(`${i + 1}. ${rec.title}`, { x: margin, y, size: 11, font: helveticaBold, color: BLACK })
      const priorityColor = rec.priority === msg.priorityHigh ? RED : ORANGE
      currentPage.drawText(`  [${rec.priority}]`, {
        x: margin + helveticaBold.widthOfTextAtSize(`${i + 1}. ${rec.title}`, 11) + 4,
        y, size: 8, font: helveticaBold, color: priorityColor
      })
      y -= 16

      const descLines = wrapText(rec.desc, helvetica, 9, contentWidth - 20)
      descLines.forEach(line => {
        ensureSpace(14)
        currentPage.drawText(line, { x: margin + 15, y, size: 9, font: helvetica, color: DARKGRAY })
        y -= 12
      })
      y -= 10
    })

    // FOMO
    y -= 15
    ensureSpace(40)
    const fomoLines = wrapText(
      msg.fomo,
      helveticaBold, 10, contentWidth
    )
    fomoLines.forEach(line => {
      currentPage.drawText(line, { x: margin, y, size: 10, font: helveticaBold, color: RED })
      y -= 14
    })

    // ===========================
    // FOOTER
    // ===========================
    y -= 40
    ensureSpace(80)

    currentPage.drawRectangle({ x: margin + 50, y: y + 5, width: contentWidth - 100, height: 0.5, color: rgb(0.85, 0.85, 0.85) })
    y -= 15

    drawCentered(currentPage, msg.needHelp, y, helveticaBold, 11, BLACK)
    y -= 16
    drawCentered(currentPage, 'hallo@onlinelabs.nl  |  onlinelabs.nl', y, helvetica, 10, PURPLE)
    y -= 20
    drawCentered(currentPage, msg.poweredBy, y, helvetica, 9, LIGHTGRAY)

    // ===========================
    // GENERATE
    // ===========================
    const pdfBytes = await pdfDoc.save()
    const companySlug = (companyName || 'rapport').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="GEO-${locale === 'en' ? 'Report' : 'Rapport'}-${companySlug}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
