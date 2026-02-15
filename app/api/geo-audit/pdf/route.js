// app/api/geo-audit/pdf/route.js
// ============================================
// GEO AUDIT PDF — Professional branded report
// Uses pdf-lib + mascotte + CTA footer
// ============================================

import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export async function POST(request) {
  try {
    const data = await request.json()
    
    if (!data?.analysis?.overallScore && data?.analysis?.overallScore !== 0) {
      return NextResponse.json({ error: 'Audit data is verplicht' }, { status: 400 })
    }

    const pdfBytes = await generatePDF(data)
    const companySlug = (data.analysis?.companyName || data.domain || 'rapport')
      .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
    
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="GEO-Audit-${companySlug}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('[GEO Audit PDF] Error:', error)
    return NextResponse.json({ error: 'PDF generatie mislukt' }, { status: 500 })
  }
}


async function generatePDF(data) {
  const pdfDoc = await PDFDocument.create()
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  // ── Load mascot image ──
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
    console.warn('[GEO Audit PDF] Could not load mascot:', e.message)
  }

  const { analysis, extracted, liveTest, url, domain } = data
  const score = analysis.overallScore
  const company = analysis.companyName || domain || 'Onbekend'

  // ── Page dimensions ──
  const PAGE_W = 595.28
  const PAGE_H = 841.89
  const MARGIN = 50
  const CONTENT_W = PAGE_W - 2 * MARGIN

  // ── Colors ──
  const NAVY = rgb(0.118, 0.118, 0.247)
  const PURPLE = rgb(0.39, 0.4, 0.95)
  const WHITE = rgb(1, 1, 1)
  const BLACK = rgb(0.12, 0.12, 0.24)
  const GRAY = rgb(0.4, 0.4, 0.4)
  const LIGHT_GRAY = rgb(0.58, 0.65, 0.71)
  const DARK_GRAY = rgb(0.29, 0.33, 0.39)
  const LIGHT_BG = rgb(0.96, 0.97, 0.98)
  const GREEN = rgb(0.09, 0.64, 0.26)
  const ORANGE = rgb(0.85, 0.47, 0.02)
  const RED = rgb(0.86, 0.15, 0.15)
  const GREEN_BG = rgb(0.92, 0.98, 0.92)
  const RED_BG = rgb(0.99, 0.93, 0.93)

  function scoreColor(s) {
    if (s >= 70) return GREEN
    if (s >= 40) return ORANGE
    return RED
  }

  function scoreLabel(s) {
    if (s >= 70) return 'Goed'
    if (s >= 40) return 'Verbeterbaar'
    return 'Onvoldoende'
  }

  function statusIcon(status) {
    if (status === 'good') return 'V'
    if (status === 'warning') return '!'
    return 'X'
  }

  function statusColor(status) {
    if (status === 'good') return GREEN
    if (status === 'warning') return ORANGE
    return RED
  }

  // ── Text helpers ──
  function sanitize(text) {
    if (!text) return ''
    return String(text)
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/[\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
      .trim()
  }

  function wrapText(text, usedFont, fontSize, maxWidth) {
    const clean = sanitize(text)
    if (!clean) return []
    const words = clean.split(' ')
    const lines = []
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (usedFont.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)
    return lines
  }

  function drawCentered(pg, text, yPos, usedFont, size, color) {
    const clean = sanitize(text)
    if (!clean) return
    const w = usedFont.widthOfTextAtSize(clean, size)
    pg.drawText(clean, { x: (PAGE_W - w) / 2, y: yPos, size, font: usedFont, color })
  }

  // ── Page management ──
  let currentPage = null
  let y = 0
  const mascotW = 50
  const mascotH = mascotImage ? (50 * mascotImage.height / mascotImage.width) : 65

  function newPage() {
    currentPage = pdfDoc.addPage([PAGE_W, PAGE_H])
    y = PAGE_H - MARGIN
    // Mascotte top-right on every page
    if (mascotImage) {
      currentPage.drawImage(mascotImage, {
        x: PAGE_W - MARGIN - mascotW,
        y: PAGE_H - MARGIN - mascotH + 15,
        width: mascotW,
        height: mascotH,
        opacity: 0.9
      })
    }
    return currentPage
  }

  function ensureSpace(needed) {
    if (y - needed < MARGIN + 40) {
      newPage()
    }
  }

  const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PAGE 1: TITLE PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let page = newPage()

  y -= 80
  drawCentered(page, 'GEO Audit Rapport', y, helveticaBold, 28, BLACK)

  y -= 35
  drawCentered(page, company, y, helveticaBold, 20, PURPLE)

  y -= 25
  drawCentered(page, today, y, helvetica, 11, LIGHT_GRAY)

  if (url) {
    y -= 18
    const displayUrl = sanitize(url).replace(/^https?:\/\//, '')
    drawCentered(page, displayUrl, y, helvetica, 11, PURPLE)
  }

  y -= 45
  drawCentered(page, 'Dit rapport analyseert hoe goed uw pagina is voorbereid op AI-zoekmachines.', y, helveticaOblique, 9, LIGHT_GRAY)
  y -= 14
  drawCentered(page, 'Geanalyseerd op: Content kwaliteit, Technische gereedheid, Citatie-potentieel, E-E-A-T en Perplexity.', y, helveticaOblique, 9, LIGHT_GRAY)

  // ── OVERALL SCORE ──
  y -= 60
  const scoreBoxH = 100
  page.drawRectangle({ x: MARGIN, y: y - scoreBoxH, width: CONTENT_W, height: scoreBoxH, color: LIGHT_BG, borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 0.5 })

  // Big score number
  const scoreStr = `${score}`
  const scoreStrW = helveticaBold.widthOfTextAtSize(scoreStr, 52)
  page.drawText(scoreStr, { x: MARGIN + 35 - scoreStrW / 2 + 20, y: y - 62, size: 52, font: helveticaBold, color: scoreColor(score) })
  page.drawText('/100', { x: MARGIN + 35 - helvetica.widthOfTextAtSize('/100', 12) / 2 + 20, y: y - 82, size: 12, font: helvetica, color: LIGHT_GRAY })

  // Score text
  page.drawText('GEO Score', { x: MARGIN + 140, y: y - 28, size: 18, font: helveticaBold, color: BLACK })
  page.drawText(`${scoreLabel(score)} - er liggen kansen`, { x: MARGIN + 140, y: y - 48, size: 11, font: helvetica, color: DARK_GRAY })

  // Category mini scores — FULL NAMES, 2 rows if needed
  if (analysis.categories?.length > 0) {
    const cats = analysis.categories
    let cx = MARGIN + 140
    const row1Y = y - 70
    const row2Y = y - 88
    
    cats.forEach((cat, i) => {
      const rowY = i < 2 ? row1Y : row2Y
      const colX = i < 2 ? MARGIN + 140 + (i * 180) : MARGIN + 140 + ((i - 2) * 180)
      
      page.drawText(cat.name, { x: colX, y: rowY, size: 8, font: helvetica, color: LIGHT_GRAY })
      page.drawText(`${cat.score}%`, { x: colX + helvetica.widthOfTextAtSize(cat.name, 8) + 6, y: rowY, size: 9, font: helveticaBold, color: scoreColor(cat.score) })
    })
  }

  y -= scoreBoxH + 25

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIVE PERPLEXITY TEST
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (liveTest) {
    ensureSpace(90)
    const liveH = 65
    const bgColor = liveTest.mentioned ? GREEN_BG : RED_BG
    const borderCol = liveTest.mentioned ? GREEN : RED

    currentPage.drawRectangle({ x: MARGIN, y: y - liveH, width: CONTENT_W, height: liveH, color: bgColor, borderColor: borderCol, borderWidth: 1 })

    const icon = liveTest.mentioned ? 'GEVONDEN' : 'NIET GEVONDEN'
    const title = liveTest.mentioned
      ? `${company} wordt gevonden in Perplexity!`
      : `${company} wordt NIET gevonden in Perplexity`
    
    currentPage.drawText(icon, { x: MARGIN + 18, y: y - 20, size: 9, font: helveticaBold, color: liveTest.mentioned ? GREEN : RED })
    currentPage.drawText(sanitize(title), { x: MARGIN + 18, y: y - 36, size: 12, font: helveticaBold, color: BLACK })

    if (liveTest.prompt) {
      const promptLines = wrapText(`Prompt: "${liveTest.prompt}"`, helvetica, 8, CONTENT_W - 40)
      promptLines.slice(0, 2).forEach((line, i) => {
        currentPage.drawText(line, { x: MARGIN + 18, y: y - 50 - (i * 11), size: 8, font: helvetica, color: GRAY })
      })
    }

    y -= liveH + 20
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TOP RECOMMENDATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (analysis.topRecommendations?.length > 0) {
    ensureSpace(80)
    currentPage.drawText('Top Aanbevelingen', { x: MARGIN, y, size: 16, font: helveticaBold, color: BLACK })
    y -= 6
    currentPage.drawRectangle({ x: MARGIN, y, width: 120, height: 2, color: PURPLE })
    y -= 22

    analysis.topRecommendations.forEach((rec, i) => {
      ensureSpace(35)
      currentPage.drawText(`${i + 1}.`, { x: MARGIN + 5, y, size: 10, font: helveticaBold, color: PURPLE })
      const lines = wrapText(rec, helvetica, 10, CONTENT_W - 30)
      lines.forEach((line, li) => {
        currentPage.drawText(line, { x: MARGIN + 22, y: y - (li * 14), size: 10, font: helvetica, color: DARK_GRAY })
      })
      y -= lines.length * 14 + 8
    })
    y -= 10
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CATEGORY DETAILS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (analysis.categories?.length > 0) {
    // Start on new page for readability
    newPage()
    
    currentPage.drawText('Gedetailleerde Analyse', { x: MARGIN, y, size: 16, font: helveticaBold, color: BLACK })
    y -= 6
    currentPage.drawRectangle({ x: MARGIN, y, width: 140, height: 2, color: PURPLE })
    y -= 25

    analysis.categories.forEach((category) => {
      ensureSpace(120)

      // Category header bar
      currentPage.drawRectangle({ x: MARGIN, y: y - 30, width: CONTENT_W, height: 30, color: NAVY })
      currentPage.drawText(sanitize(category.name), { x: MARGIN + 14, y: y - 21, size: 12, font: helveticaBold, color: WHITE })
      
      const catScoreText = `${category.score}%`
      const catScoreW = helveticaBold.widthOfTextAtSize(catScoreText, 12)
      currentPage.drawText(catScoreText, { x: PAGE_W - MARGIN - 14 - catScoreW, y: y - 21, size: 12, font: helveticaBold, color: scoreColor(category.score) })
      y -= 40

      // Summary
      if (category.summary) {
        const summaryLines = wrapText(category.summary, helvetica, 9, CONTENT_W - 20)
        summaryLines.forEach(line => {
          ensureSpace(14)
          currentPage.drawText(line, { x: MARGIN + 10, y, size: 9, font: helvetica, color: GRAY })
          y -= 13
        })
        y -= 8
      }

      // Checks
      if (category.checks?.length > 0) {
        category.checks.forEach((check) => {
          ensureSpace(45)

          // Status badge
          const icon = statusIcon(check.status)
          const iconColor = statusColor(check.status)
          const badgeBg = check.status === 'good' ? GREEN_BG : check.status === 'warning' ? rgb(1, 0.97, 0.92) : RED_BG
          
          currentPage.drawRectangle({ x: MARGIN + 10, y: y - 4, width: 18, height: 14, color: badgeBg })
          currentPage.drawText(`[${icon}]`, { x: MARGIN + 11, y: y - 1, size: 8, font: helveticaBold, color: iconColor })
          
          // Check name
          currentPage.drawText(sanitize(check.name), { x: MARGIN + 35, y, size: 10, font: helveticaBold, color: BLACK })
          
          // Priority label
          if (check.priority) {
            const prioColor = check.priority === 'kritiek' ? RED : check.priority === 'hoog' ? ORANGE : LIGHT_GRAY
            const nameW = helveticaBold.widthOfTextAtSize(sanitize(check.name), 10)
            currentPage.drawText(`[${check.priority}]`, { x: MARGIN + 40 + nameW, y: y + 1, size: 7, font: helveticaBold, color: prioColor })
          }
          y -= 15

          // Detail (wrapped, full width)
          if (check.detail) {
            const detailLines = wrapText(check.detail, helvetica, 9, CONTENT_W - 45)
            detailLines.forEach(line => {
              ensureSpace(13)
              currentPage.drawText(line, { x: MARGIN + 35, y, size: 9, font: helvetica, color: GRAY })
              y -= 12
            })
          }
          y -= 8
        })
      }
      y -= 18
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMPETITORS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (liveTest?.competitors?.length > 0) {
    ensureSpace(80)
    currentPage.drawText('Concurrenten in Perplexity', { x: MARGIN, y, size: 14, font: helveticaBold, color: BLACK })
    y -= 6
    currentPage.drawRectangle({ x: MARGIN, y, width: 140, height: 2, color: PURPLE })
    y -= 18
    currentPage.drawText('Deze bedrijven werden genoemd bij dezelfde zoekvraag:', { x: MARGIN + 5, y, size: 9, font: helvetica, color: GRAY })
    y -= 20

    liveTest.competitors.forEach((comp, i) => {
      ensureSpace(18)
      currentPage.drawText(`${i + 1}. ${sanitize(comp)}`, { x: MARGIN + 10, y, size: 10, font: helvetica, color: DARK_GRAY })
      y -= 16
    })
    y -= 15
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXTRACTED DATA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (extracted) {
    ensureSpace(200)
    currentPage.drawText('Pagina-analyse', { x: MARGIN, y, size: 14, font: helveticaBold, color: BLACK })
    y -= 6
    currentPage.drawRectangle({ x: MARGIN, y, width: 140, height: 2, color: PURPLE })
    y -= 22

    const dataRows = [
      ['Title', extracted.title || '-'],
      ['Meta description', extracted.description || '-'],
      ['Woorden', `${extracted.wordCount || 0}`],
      ['Headings', `${extracted.headingCount || 0}`],
      ['Structured Data', extracted.structuredDataTypes?.join(', ') || 'Geen'],
      ['Rich Snippets', extracted.richSnippets?.eligible?.length > 0 
        ? `Geschikt: ${extracted.richSnippets.eligible.join(', ')}` 
        : extracted.richSnippets?.suggestedTypes?.length > 0
          ? `Ontbreekt — voeg toe: ${extracted.richSnippets.suggestedTypes.slice(0, 3).join(', ')}`
          : 'Niet geanalyseerd'],
      ['FAQ gevonden', extracted.hasFAQ ? 'Ja' : 'Nee'],
      ['Afbeeldingen', `${extracted.imageCount || 0} (${extracted.imagesWithAlt || 0} met alt-tekst)`],
      ['robots.txt', extracted.hasRobotsTxt ? 'Aanwezig' : 'Niet gevonden'],
      ['llms.txt', extracted.hasLlmsTxt ? 'Aanwezig' : 'Niet gevonden'],
    ]

    // Add CWV rows if available
    if (extracted.coreWebVitals) {
      const cwv = extracted.coreWebVitals
      dataRows.push(['Performance', `${cwv.performanceScore || '-'}/100`])
      if (cwv.lcp) dataRows.push(['LCP', `${(cwv.lcp / 1000).toFixed(1)}s`])
      if (cwv.cls !== null && cwv.cls !== undefined) dataRows.push(['CLS', `${cwv.cls}`])
      dataRows.push(['Mobiel-vriendelijk', cwv.mobileFriendly ? 'Ja' : 'Nee'])
    }

    dataRows.forEach(([label, value], idx) => {
      ensureSpace(28)
      
      // Alternating row background
      const rowBg = idx % 2 === 0 ? LIGHT_BG : WHITE
      
      // Wrap value text to determine row height
      const valueLines = wrapText(value, helvetica, 9, CONTENT_W - 150)
      const rowH = Math.max(18, valueLines.length * 13 + 6)
      
      currentPage.drawRectangle({ x: MARGIN, y: y - rowH + 12, width: CONTENT_W, height: rowH, color: rowBg })
      
      // Label
      currentPage.drawText(label, { x: MARGIN + 10, y, size: 9, font: helveticaBold, color: GRAY })
      
      // Value (wrapped, NOT truncated)
      valueLines.forEach((line, li) => {
        currentPage.drawText(line, { x: MARGIN + 140, y: y - (li * 13), size: 9, font: helvetica, color: DARK_GRAY })
      })
      
      y -= rowH
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CTA FOOTER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  y -= 30
  ensureSpace(90)

  currentPage.drawRectangle({ x: MARGIN + 60, y: y + 5, width: CONTENT_W - 120, height: 0.5, color: rgb(0.85, 0.85, 0.85) })
  y -= 18

  drawCentered(currentPage, 'Hulp nodig bij GEO-optimalisatie?', y, helveticaBold, 12, BLACK)
  y -= 18
  drawCentered(currentPage, 'Neem contact op voor een vrijblijvend gesprek.', y, helvetica, 10, DARK_GRAY)
  y -= 22
  drawCentered(currentPage, 'hallo@onlinelabs.nl  |  onlinelabs.nl', y, helveticaBold, 10, PURPLE)
  y -= 25
  drawCentered(currentPage, 'Powered by teun.ai - AI Zichtbaarheid Platform', y, helvetica, 9, LIGHT_GRAY)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PAGE FOOTERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const allPages = pdfDoc.getPages()
  const totalPages = allPages.length
  allPages.forEach((p, i) => {
    // Footer line
    p.drawLine({
      start: { x: MARGIN, y: 42 },
      end: { x: PAGE_W - MARGIN, y: 42 },
      thickness: 0.5,
      color: rgb(0.88, 0.91, 0.93)
    })

    // Footer text
    const footerText = 'teun.ai - AI Zichtbaarheid Platform'
    const footerW = helvetica.widthOfTextAtSize(footerText, 8)
    p.drawText(footerText, { x: (PAGE_W - footerW) / 2, y: 28, size: 8, font: helvetica, color: LIGHT_GRAY })

    // Page number
    const pageNum = `${i + 1} / ${totalPages}`
    const pageNumW = helvetica.widthOfTextAtSize(pageNum, 8)
    p.drawText(pageNum, { x: PAGE_W - MARGIN - pageNumW, y: 28, size: 8, font: helvetica, color: LIGHT_GRAY })
  })

  return await pdfDoc.save()
}
