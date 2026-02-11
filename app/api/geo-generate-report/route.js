import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export async function POST(request) {
  try {
    const data = await request.json()
    const { companyName, companyWebsite, companyCategory, matches, scanResults, aiResults, overallScore, manualChecks } = data

    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // Load mascot image
    let mascotImage = null
    try {
      // Try local public folder first
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
      // Fallback: fetch from URL
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
    const BLACK = rgb(0.12, 0.12, 0.24)   // #1E1E3F
    const PURPLE = rgb(0.39, 0.4, 0.95)    // #6366F1
    const GREEN = rgb(0.09, 0.64, 0.26)    // #16A34A
    const RED = rgb(0.86, 0.15, 0.15)      // #DC2626
    const ORANGE = rgb(0.85, 0.47, 0.02)   // #D97706
    const GRAY = rgb(0.4, 0.4, 0.4)
    const LIGHTGRAY = rgb(0.58, 0.65, 0.71) // #94A3B8
    const DARKGRAY = rgb(0.29, 0.33, 0.39)  // #4B5563
    const WHITE = rgb(1, 1, 1)

    // Score helpers
    const getStatus = (score) => {
      if (score >= 95) return { label: 'Uitstekend', color: GREEN }
      if (score >= 80) return { label: 'Goed', color: GREEN }
      if (score >= 55) return { label: 'Gemiddeld', color: ORANGE }
      return { label: 'Slecht', color: RED }
    }

    const getScoreColor = (score) => {
      if (score >= 80) return GREEN
      if (score >= 55) return ORANGE
      return RED
    }

    // Text helpers
    const truncateUrl = (url, max = 52) => {
      const clean = (url || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
      return clean.length > max ? clean.slice(0, max) + '...' : clean
    }

    const wrapText = (text, font, fontSize, maxWidth) => {
      const words = text.split(' ')
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

    const drawCentered = (page, text, y, font, size, color) => {
      const w = font.widthOfTextAtSize(text, size)
      page.drawText(text, { x: (pageWidth - w) / 2, y, size, font, color })
    }

    // New page helper
    let currentPage = null
    let y = 0
    const mascotWidth = 50
    const mascotHeight = mascotImage ? (50 * mascotImage.height / mascotImage.width) : 65
    const newPage = () => {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      // Draw mascot top-right on every page
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

    // ===========================
    // PAGE 1: TITLE
    // ===========================
    let page = newPage()

    y -= 120
    drawCentered(page, 'GEO Rapport', y, helveticaBold, 28, BLACK)
    
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
    drawCentered(page, 'Dit rapport is een beknopte samenvatting van de GEO-analyse.', y, helveticaOblique, 9, LIGHTGRAY)
    y -= 14
    drawCentered(page, 'GEO-optimalisatie specialisten weten op basis van deze data welke verbeterstappen nodig zijn.', y, helveticaOblique, 9, LIGHTGRAY)
    y -= 14
    drawCentered(page, 'Voor gedetailleerde resultaten per AI-platform, bekijk het dashboard op teun.ai.', y, helveticaOblique, 9, LIGHTGRAY)

    // Overall score with breakdown
    // Extract scores (overallScore can be object { overall, geo, aiVisibility } or number)
    const scoreValue = typeof overallScore === 'object' && overallScore !== null 
      ? (overallScore.overall || 0) 
      : (overallScore || 0)
    const aiVisScore = typeof overallScore === 'object' && overallScore !== null
      ? (overallScore.aiVisibility || 0) : 0
    const geoScore = typeof overallScore === 'object' && overallScore !== null
      ? (overallScore.geo || 0) : 0

    if (scoreValue) {
      y -= 50

      // Score breakdown boxes
      const boxWidth = 145
      const boxHeight = 70
      const boxGap = 20
      const totalBoxWidth = boxWidth * 3 + boxGap * 2
      const startX = (pageWidth - totalBoxWidth) / 2

      const boxes = [
        { label: 'AI Visibility', value: `${aiVisScore}%`, color: rgb(0.58, 0.25, 0.85) },  // purple
        { label: 'GEO Optimalisatie', value: `${geoScore}%`, color: rgb(0.25, 0.35, 0.85) }, // blue
        { label: 'Totaal Score', value: `${scoreValue}`, color: getStatus(scoreValue).color }
      ]

      boxes.forEach((box, i) => {
        const bx = startX + i * (boxWidth + boxGap)
        // Box background
        page.drawRectangle({ x: bx, y: y - boxHeight, width: boxWidth, height: boxHeight, color: box.color, borderColor: box.color, borderWidth: 0 })
        // Rounded corners effect - just draw slightly inset
        // Label
        const labelW = helvetica.widthOfTextAtSize(box.label, 9)
        page.drawText(box.label, { x: bx + 12, y: y - 16, size: 9, font: helvetica, color: WHITE })
        // Value
        page.drawText(box.value, { x: bx + 12, y: y - 48, size: 28, font: helveticaBold, color: WHITE })
      })

      y -= boxHeight + 15

      // Status text below
      const status = getStatus(scoreValue)
      drawCentered(page, `${status.label} — ${scoreValue} van 100 punten`, y, helveticaBold, 12, status.color)
    }

    // ===========================
    // PAGE 2: AI ZICHTBAARHEID
    // ===========================
    page = newPage()

    page.drawText('1. AI Zichtbaarheid', { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
    y -= 8
    page.drawRectangle({ x: margin, y, width: 180, height: 2, color: PURPLE })
    y -= 25

    // Build prompt mention map
    const promptMentionMap = {}
    ;(aiResults || []).forEach(r => {
      const prompt = (r.prompt || r.ai_prompt || r.query || '').trim()
      if (!prompt) return
      if (!promptMentionMap[prompt]) promptMentionMap[prompt] = { mentioned: false, platforms: [] }
      if (r.mentioned) {
        promptMentionMap[prompt].mentioned = true
        promptMentionMap[prompt].platforms.push(r.platform)
      }
    })

    const mentionedPrompts = Object.entries(promptMentionMap).filter(([, v]) => v.mentioned)
    const notMentionedPrompts = Object.entries(promptMentionMap).filter(([, v]) => !v.mentioned)
    const promptCount = Object.keys(promptMentionMap).length

    // Platform breakdown
    const platforms = {
      perplexity: { name: 'Perplexity', results: (aiResults || []).filter(r => r.platform === 'perplexity') },
      chatgpt: { name: 'ChatGPT', results: (aiResults || []).filter(r => r.platform === 'chatgpt') },
      google: { name: 'Google AI Modus', results: (aiResults || []).filter(r => r.platform === 'google') },
      overview: { name: 'AI Overviews', results: (aiResults || []).filter(r => r.platform === 'google_overview') }
    }
    const activePlatforms = Object.values(platforms).filter(p => p.results.length > 0)
    const platformNames = activePlatforms.map(p => p.name).join(', ')

    // Intro text (narrower to avoid mascot overlap)
    const introWidth = contentWidth - mascotWidth - 25
    const introLines = wrapText(
      `We hebben ${promptCount} commerciele zoekwoorden getest op ${activePlatforms.length} AI-platformen: ${platformNames}.`,
      helvetica, 10, introWidth
    )
    introLines.forEach(line => {
      page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: DARKGRAY })
      y -= 14
    })
    y -= 4

    const resultText = `Resultaat: ${companyName} wordt bij ${mentionedPrompts.length} van de ${promptCount} zoekwoorden vermeld door minimaal 1 AI-platform.`
    const resultLines = wrapText(resultText, helveticaBold, 10, introWidth)
    resultLines.forEach(line => {
      page.drawText(line, { x: margin, y, size: 10, font: helveticaBold, color: BLACK })
      y -= 14
    })
    y -= 10

    // Platform score table
    if (activePlatforms.length > 0) {
      const colWidths = [160, 80, 80, 80]
      const tableX = margin
      const rowHeight = 20

      // Header
      page.drawRectangle({ x: tableX, y: y - rowHeight, width: contentWidth, height: rowHeight, color: BLACK })
      const headers = ['Platform', 'Vermeld', 'Totaal', 'Score']
      let cx = tableX + 8
      headers.forEach((h, i) => {
        page.drawText(h, { x: cx, y: y - 14, size: 9, font: helveticaBold, color: WHITE })
        cx += colWidths[i]
      })
      y -= rowHeight

      // Rows
      activePlatforms.forEach((p, idx) => {
        const m = p.results.filter(r => r.mentioned).length
        const t = p.results.length
        const score = t > 0 ? Math.round((m / t) * 100) : 0
        const bg = idx % 2 === 0 ? rgb(0.97, 0.97, 0.97) : WHITE
        
        page.drawRectangle({ x: tableX, y: y - rowHeight, width: contentWidth, height: rowHeight, color: bg })
        
        let cx = tableX + 8
        page.drawText(p.name, { x: cx, y: y - 14, size: 9, font: helveticaBold, color: DARKGRAY })
        cx += colWidths[0]
        page.drawText(`${m}`, { x: cx + 20, y: y - 14, size: 9, font: helvetica, color: DARKGRAY })
        cx += colWidths[1]
        page.drawText(`${t}`, { x: cx + 20, y: y - 14, size: 9, font: helvetica, color: DARKGRAY })
        cx += colWidths[2]
        page.drawText(`${score}%`, { x: cx + 15, y: y - 14, size: 9, font: helveticaBold, color: getScoreColor(score) })
        
        y -= rowHeight
      })
      y -= 15
    }

    // Mentioned prompts
    if (mentionedPrompts.length > 0) {
      y -= 10
      page.drawText(`Wel vermeld (${mentionedPrompts.length} zoekwoorden)`, { x: margin, y, size: 12, font: helveticaBold, color: GREEN })
      y -= 18

      for (const [prompt] of mentionedPrompts) {
        ensureSpace(30)
        const lines = wrapText(prompt, helvetica, 9, contentWidth - 30)
        page.drawText('[V]', { x: margin, y, size: 9, font: helveticaBold, color: GREEN })
        lines.forEach((line, i) => {
          currentPage.drawText(line, { x: margin + 28, y: y - (i * 12), size: 9, font: helvetica, color: DARKGRAY })
        })
        y -= lines.length * 12 + 4
      }
    }

    // Not mentioned prompts
    if (notMentionedPrompts.length > 0) {
      y -= 10
      ensureSpace(30)
      currentPage.drawText(`Niet vermeld (${notMentionedPrompts.length} zoekwoorden)`, { x: margin, y, size: 12, font: helveticaBold, color: RED })
      y -= 18

      for (const [prompt] of notMentionedPrompts) {
        ensureSpace(30)
        const lines = wrapText(prompt, helvetica, 9, contentWidth - 30)
        currentPage.drawText('[X]', { x: margin, y, size: 9, font: helveticaBold, color: RED })
        lines.forEach((line, i) => {
          currentPage.drawText(line, { x: margin + 28, y: y - (i * 12), size: 9, font: helvetica, color: DARKGRAY })
        })
        y -= lines.length * 12 + 4
      }
    }

    // ===========================
    // PAGE 3: PAGINA SCORES
    // ===========================
    const pageEntries = Object.entries(scanResults || {}).filter(([, v]) => v.scanned).sort((a, b) => (b[1].score || 0) - (a[1].score || 0))

    if (pageEntries.length > 0) {
      page = newPage()

      page.drawText('2. Pagina Scores', { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
      y -= 8
      page.drawRectangle({ x: margin, y, width: 140, height: 2, color: PURPLE })
      y -= 25

      page.drawText(`GEO-optimalisatiescore voor alle ${pageEntries.length} gescande pagina's:`, { x: margin, y, size: 10, font: helvetica, color: DARKGRAY })
      y -= 25

      // Table header
      const colW = [300, 80, 80]
      const rowH = 22
      page.drawRectangle({ x: margin, y: y - rowH, width: contentWidth, height: rowH, color: BLACK })
      let cx = margin + 8
      page.drawText('Pagina', { x: cx, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      cx += colW[0]
      page.drawText('Score', { x: cx + 15, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      cx += colW[1]
      page.drawText('Status', { x: cx + 10, y: y - 15, size: 9, font: helveticaBold, color: WHITE })
      y -= rowH

      // Rows
      pageEntries.forEach(([url, result], idx) => {
        ensureSpace(rowH + 10)
        const score = result.score || 0
        const status = getStatus(score)
        const bg = idx % 2 === 0 ? rgb(0.97, 0.97, 0.97) : WHITE

        currentPage.drawRectangle({ x: margin, y: y - rowH, width: contentWidth, height: rowH, color: bg })
        let cx = margin + 8
        currentPage.drawText(truncateUrl(url, 48), { x: cx, y: y - 15, size: 9, font: helvetica, color: DARKGRAY })
        cx += colW[0]
        currentPage.drawText(`${score}/100`, { x: cx + 10, y: y - 15, size: 9, font: helveticaBold, color: status.color })
        cx += colW[1]
        currentPage.drawText(status.label, { x: cx + 5, y: y - 15, size: 9, font: helvetica, color: status.color })
        y -= rowH
      })

      // Average
      y -= 15
      const avgScore = Math.round(pageEntries.reduce((sum, [, r]) => sum + (r.score || 0), 0) / pageEntries.length)
      const avgStatus = getStatus(avgScore)
      currentPage.drawText(`Gemiddelde score: ${avgScore}/100 (${avgStatus.label})`, {
        x: margin, y, size: 11, font: helveticaBold, color: avgStatus.color
      })

      // ===========================
      // PAGE 4: VERBETERPUNTEN
      // ===========================
      page = newPage()

      page.drawText('3. Verbeterpunten per pagina', { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
      y -= 8
      page.drawRectangle({ x: margin, y, width: 230, height: 2, color: PURPLE })
      y -= 25

      pageEntries.forEach(([url, result]) => {
        const issues = result.issues || []
        if (issues.length === 0) return

        ensureSpace(60)
        const score = result.score || 0
        currentPage.drawText(truncateUrl(url, 55), { x: margin, y, size: 10, font: helveticaBold, color: BLACK })
        const scoreStr = `(${score}/100)`
        const urlW = helveticaBold.widthOfTextAtSize(truncateUrl(url, 55), 10)
        currentPage.drawText(scoreStr, { x: margin + urlW + 8, y, size: 10, font: helvetica, color: getScoreColor(score) })
        y -= 16

        issues.slice(0, 5).forEach(issue => {
          ensureSpace(16)
          const issueText = typeof issue === 'string' ? issue : (issue.message || issue.label || '')
          const lines = wrapText('- ' + issueText, helvetica, 9, contentWidth - 20)
          lines.forEach(line => {
            currentPage.drawText(line, { x: margin + 15, y, size: 9, font: helvetica, color: DARKGRAY })
            y -= 12
          })
        })
        y -= 8
      })
    }

    // ===========================
    // AANBEVELINGEN
    // ===========================
    page = newPage()
    const recSection = pageEntries.length > 0 ? '4' : '2'

    page.drawText(`${recSection}. Aanbevelingen`, { x: margin, y, size: 18, font: helveticaBold, color: BLACK })
    y -= 8
    page.drawRectangle({ x: margin, y, width: 140, height: 2, color: PURPLE })
    y -= 25

    page.drawText('Op basis van de analyse adviseren we de volgende stappen:', { x: margin, y, size: 10, font: helvetica, color: DARKGRAY })
    y -= 20

    const recommendations = [
      {
        title: 'Vergroot je AI-zichtbaarheid per platform',
        desc: `${companyName} wordt bij ${notMentionedPrompts.length} van de ${promptCount} zoekwoorden niet vermeld. Focus op de niet-vermelde zoekwoorden door relevante content te creeren die direct antwoord geeft op deze vragen.`
      },
      {
        title: "Optimaliseer landingspagina's voor GEO",
        desc: "Verbeter de GEO-score van elke landingspagina door betere contentstructuur, uitgebreide FAQ-secties en gedetailleerdere antwoorden op veelgestelde vragen."
      },
      {
        title: 'Implementeer structured data',
        desc: 'Voeg JSON-LD markup toe (Organization, FAQ, Product) zodat AI-systemen je content beter kunnen begrijpen en citeren.'
      },
      {
        title: 'Versterk E-E-A-T signalen',
        desc: 'Zorg voor duidelijke auteursinformatie, referenties naar betrouwbare bronnen en regelmatig bijgewerkte content om je autoriteit te vergroten.'
      },
      {
        title: 'Geef volledige antwoorden op zoekvragen',
        desc: 'AI-systemen prefereren bronnen die direct en volledig antwoord geven. Incomplete antwoorden worden overgeslagen voor concurrenten die wel complete informatie bieden.'
      }
    ]

    // Detect Core Web Vitals issues from scan results and add recommendation if found
    const cwvKeywords = ['LCP', 'FID', 'CLS', 'INP', 'TTFB', 'Core Web']
    const allIssues = Object.values(scanResults || {}).flatMap(r => (r.issues || []).map(i => typeof i === 'string' ? i : (i.message || i.label || '')))
    const hasCwvIssues = allIssues.some(issue => cwvKeywords.some(kw => issue.toUpperCase().includes(kw.toUpperCase())))
    
    if (hasCwvIssues) {
      const cwvPages = Object.entries(scanResults || {}).filter(([, r]) => 
        (r.issues || []).some(i => {
          const t = typeof i === 'string' ? i : (i.message || '')
          return cwvKeywords.some(kw => t.toUpperCase().includes(kw.toUpperCase()))
        })
      ).length
      recommendations.push({
        title: 'Verbeter Core Web Vitals',
        desc: `${cwvPages} van de ${pageEntries.length} pagina's hebben Core Web Vitals problemen (LCP, FID, CLS). Snelle laadtijden en stabiele layouts verbeteren niet alleen de gebruikerservaring, maar ook hoe AI-systemen je pagina's beoordelen als betrouwbare bron.`
      })
    }

    recommendations.forEach((rec, i) => {
      ensureSpace(50)
      currentPage.drawText(`${i + 1}. ${rec.title}`, { x: margin, y, size: 11, font: helveticaBold, color: BLACK })
      currentPage.drawText('  [Hoog]', { 
        x: margin + helveticaBold.widthOfTextAtSize(`${i + 1}. ${rec.title}`, 11) + 4, 
        y, size: 8, font: helveticaBold, color: RED 
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
      'Wacht niet te lang -- elke dag zonder GEO-optimalisatie gaan potentiele klanten naar concurrenten die wel zichtbaar zijn in AI-antwoorden.',
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
    
    // Divider line
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
