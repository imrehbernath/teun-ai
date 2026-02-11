import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export async function POST(request) {
  try {
    const data = await request.json()
    const { companyName, companyWebsite, companyCategory, matches, scanResults, aiResults, overallScore, manualChecks, combinedResults } = data

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
      if (score >= 95) return { label: 'Uitstekend', color: GREEN }
      if (score >= 80) return { label: 'Goed', color: GREEN }
      if (score >= 55) return { label: 'Gemiddeld', color: ORANGE }
      return { label: 'Slecht', color: RED }
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
    const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

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
    drawCentered(page, 'GEO Analyse Rapport', y, helveticaBold, 28, BLACK)

    y -= 40
    drawCentered(page, companyName || 'Onbekend', y, helveticaBold, 20, PURPLE)

    y -= 30
    drawCentered(page, today, y, helvetica, 11, LIGHTGRAY)

    if (companyWebsite) {
      y -= 18
      drawCentered(page, companyWebsite.replace(/^https?:\/\//, ''), y, helvetica, 11, PURPLE)
    }

    // Disclaimer
    y -= 50
    drawCentered(page, 'Dit rapport toont hoe zichtbaar uw bedrijf is in AI-gestuurde zoeksystemen.', y, helveticaOblique, 9, LIGHTGRAY)
    y -= 14
    drawCentered(page, 'Gescand op 4 platforms: Perplexity, ChatGPT, Google AI Modus en Google AI Overviews.', y, helveticaOblique, 9, LIGHTGRAY)
    y -= 14
    drawCentered(page, 'Voor live resultaten en updates, bekijk het dashboard op teun.ai.', y, helveticaOblique, 9, LIGHTGRAY)

    // Score boxes
    y -= 50
    const boxWidth = hasGeoData ? 145 : 220
    const boxGap = 20
    const boxCount = hasGeoData ? 3 : 2
    const totalBoxWidth = boxWidth * boxCount + boxGap * (boxCount - 1)
    const startX = (pageWidth - totalBoxWidth) / 2
    const boxHeight = 70

    const boxes = [
      { label: 'AI Visibility Score', value: `${aiVisScore}%`, color: rgb(0.58, 0.25, 0.85) },
    ]
    if (hasGeoData) {
      boxes.push({ label: 'GEO Optimalisatie', value: `${geoScore}%`, color: rgb(0.25, 0.35, 0.85) })
    }
    boxes.push({ label: 'Platforms Gescand', value: `${activePlatforms.length}/4`, color: rgb(0.15, 0.39, 0.6) })

    boxes.forEach((box, i) => {
      const bx = startX + i * (boxWidth + boxGap)
      page.drawRectangle({ x: bx, y: y - boxHeight, width: boxWidth, height: boxHeight, color: box.color })
      page.drawText(box.label, { x: bx + 12, y: y - 16, size: 9, font: helvetica, color: WHITE })
      page.drawText(box.value, { x: bx + 12, y: y - 48, size: 28, font: helveticaBold, color: WHITE })
    })

    y -= boxHeight + 15

    // Status text
    const status = getStatus(aiVisScore)
    drawCentered(page, `${status.label} — ${aiVisScore}% AI-zichtbaarheid`, y, helveticaBold, 12, status.color)

    // Quick stats
    y -= 40
    const statsText = `${uniquePrompts.length} commerciele prompts getest  •  ${totalMentioned} van ${totalScanned} keer vermeld  •  ${activePlatforms.length} AI-platforms`
    drawCentered(page, statsText, y, helvetica, 9, DARKGRAY)

    // ===========================
    // PAGE 2: PLATFORM OVERZICHT
    // ===========================
    page = newPage()

    page.drawText('1. Resultaten per AI-platform', { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
    y -= 8
    page.drawRectangle({ x: margin, y, width: 240, height: 2, color: PURPLE })
    y -= 25

    const introWidth = contentWidth - mascotWidth - 25
    const introLines = wrapText(
      `We hebben ${uniquePrompts.length} commerciele prompts getest op ${activePlatforms.length} AI-platforms. Hieronder de resultaten per platform met de exacte prompts en AI-antwoorden.`,
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
    ;['Platform', 'Vermeld', 'Totaal', 'Score'].forEach((h, i) => {
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
      currentPage.drawText(`${platform.name}  —  ${platform.data.mentioned}/${platform.data.total} vermeld (${platformScore}%)`, {
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
          currentPage.drawText('Concurrenten: ', { x: margin + 28, y, size: 8, font: helveticaBold, color: ORANGE })
          const compText = competitors.join(', ')
          const compLines = wrapText(compText, helvetica, 8, contentWidth - 100)
          const labelWidth = helveticaBold.widthOfTextAtSize('Concurrenten: ', 8)
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

    currentPage.drawText('2. Overzicht alle prompts', { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
    y -= 8
    currentPage.drawRectangle({ x: margin, y, width: 200, height: 2, color: PURPLE })
    y -= 25

    currentPage.drawText(
      `Totaal ${uniquePrompts.length} prompts getest. Hieronder per prompt op welke platforms uw bedrijf vermeld wordt.`,
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
        const label = `${ps.name}: ${ps.status === 'V' ? 'Ja' : 'Nee'}`
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

      page.drawText('3. Pagina Scores', { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
      y -= 8
      page.drawRectangle({ x: margin, y, width: 140, height: 2, color: PURPLE })
      y -= 25

      page.drawText(`GEO-optimalisatiescore voor alle ${pageEntries.length} gescande pagina's:`, { x: margin, y, size: 10, font: helvetica, color: DARKGRAY })
      y -= 25

      const colW = [300, 80, 80]
      const rowH = 22
      page.drawRectangle({ x: margin, y: y - rowH, width: contentWidth, height: rowH, color: BLACK })
      let cx2 = margin + 8
      page.drawText('Pagina', { x: cx2, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      cx2 += colW[0]
      page.drawText('Score', { x: cx2 + 15, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      cx2 += colW[1]
      page.drawText('Status', { x: cx2 + 10, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
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
      currentPage.drawText(`Gemiddelde score: ${avgScore}/100 (${avgSt.label})`, {
        x: margin, y, size: 11, font: helveticaBold, color: avgSt.color
      })
    }

    // ===========================
    // AANBEVELINGEN
    // ===========================
    page = newPage()
    const recNum = pageEntries.length > 0 ? '4' : '3'

    page.drawText(`${recNum}. Aanbevelingen`, { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
    y -= 8
    page.drawRectangle({ x: margin, y, width: 140, height: 2, color: PURPLE })
    y -= 25

    page.drawText('Op basis van de analyse adviseren we de volgende stappen:', { x: margin, y, size: 10, font: helvetica, color: DARKGRAY })
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
        title: 'Vergroot je AI-zichtbaarheid',
        priority: 'Hoog',
        desc: `${companyName} wordt bij ${notMentionedCount} van de ${uniquePrompts.length} prompts niet vermeld door AI-platforms. Maak gerichte content die direct antwoord geeft op deze vragen.`
      })
    }

    if (weakestPlatform) {
      const wScore = weakestPlatform.data.total > 0 ? Math.round((weakestPlatform.data.mentioned / weakestPlatform.data.total) * 100) : 0
      if (wScore < 50) {
        recommendations.push({
          title: `Verbeter zichtbaarheid op ${weakestPlatform.name}`,
          priority: 'Hoog',
          desc: `Met slechts ${wScore}% zichtbaarheid op ${weakestPlatform.name} laat u klanten liggen. Elk platform heeft eigen criteria — optimaliseer uw content specifiek voor ${weakestPlatform.name}.`
        })
      }
    }

    recommendations.push({
      title: 'Implementeer structured data',
      priority: 'Hoog',
      desc: 'Voeg JSON-LD markup toe (Organization, FAQ, Product, LocalBusiness) zodat AI-systemen uw content beter kunnen begrijpen en citeren.'
    })

    recommendations.push({
      title: 'Versterk E-E-A-T signalen',
      priority: 'Hoog',
      desc: 'Zorg voor duidelijke auteursinformatie, referenties naar betrouwbare bronnen en regelmatig bijgewerkte content om uw autoriteit te vergroten.'
    })

    recommendations.push({
      title: 'Optimaliseer voor conversational search',
      priority: 'Middel',
      desc: 'AI-platforms beantwoorden steeds meer vragen in gespreksvorm. Structureer uw content met duidelijke vragen en antwoorden, zodat AI uw tekst direct kan overnemen.'
    })

    if (hasGeoData) {
      recommendations.push({
        title: "Optimaliseer landingspagina's voor GEO",
        priority: 'Hoog',
        desc: "Verbeter de GEO-score door betere contentstructuur, FAQ-secties en gedetailleerde antwoorden op veelgestelde vragen."
      })
    }

    recommendations.forEach((rec, i) => {
      ensureSpace(50)
      currentPage.drawText(`${i + 1}. ${rec.title}`, { x: margin, y, size: 11, font: helveticaBold, color: BLACK })
      const priorityColor = rec.priority === 'Hoog' ? RED : ORANGE
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
      'Wacht niet te lang — elke dag zonder GEO-optimalisatie gaan potentiele klanten naar concurrenten die wel zichtbaar zijn in AI-antwoorden.',
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

    drawCentered(currentPage, 'Hulp nodig bij GEO-optimalisatie?', y, helveticaBold, 11, BLACK)
    y -= 16
    drawCentered(currentPage, 'hallo@onlinelabs.nl  |  onlinelabs.nl', y, helvetica, 10, PURPLE)
    y -= 20
    drawCentered(currentPage, 'Powered by teun.ai', y, helvetica, 9, LIGHTGRAY)

    // ===========================
    // GENERATE
    // ===========================
    const pdfBytes = await pdfDoc.save()
    const companySlug = (companyName || 'rapport').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="GEO-Rapport-${companySlug}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
