// app/api/geo-audit/pdf/route.js
// GEO AUDIT PDF — Professional branded report (i18n)

import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

const PDF_MESSAGES = {
  nl: {
    auditRequired: 'Audit data is verplicht',
    pdfFailed: 'PDF generatie mislukt',
    reportTitle: 'GEO Audit Rapport',
    unknown: 'Onbekend',
    reportIntro: 'Dit rapport analyseert hoe goed uw pagina is voorbereid op AI-zoekmachines.',
    reportIntro2: 'Geanalyseerd op: Content kwaliteit, Technische gereedheid, Citatie-potentieel, E-E-A-T en Perplexity.',
    geoScore: 'GEO Score',
    good: 'Goed',
    improvable: 'Verbeterbaar',
    insufficient: 'Onvoldoende',
    opportunities: 'er liggen kansen',
    found: 'GEVONDEN',
    notFound: 'NIET GEVONDEN',
    foundInPerplexity: 'wordt gevonden in Perplexity!',
    notFoundInPerplexity: 'wordt NIET gevonden in Perplexity',
    prompt: 'Prompt',
    topRecommendations: 'Top Aanbevelingen',
    detailedAnalysis: 'Gedetailleerde Analyse',
    competitorsInPerplexity: 'Concurrenten in Perplexity',
    competitorsSameQuery: 'Deze bedrijven werden genoemd bij dezelfde zoekvraag:',
    pageAnalysis: 'Pagina-analyse',
    words: 'Woorden',
    structuredData: 'Structured Data',
    richSnippets: 'Rich Snippets',
    eligible: 'Geschikt',
    missingAdd: 'Ontbreekt — voeg toe',
    notAnalyzed: 'Niet geanalyseerd',
    none: 'Geen',
    faqFound: 'FAQ gevonden',
    yes: 'Ja',
    no: 'Nee',
    images: 'Afbeeldingen',
    withAlt: 'met alt-tekst',
    robotsTxt: 'robots.txt',
    llmsTxt: 'llms.txt',
    present: 'Aanwezig',
    notFoundShort: 'Niet gevonden',
    mobileFriendly: 'Mobiel-vriendelijk',
    ctaTitle: 'Hulp nodig bij GEO-optimalisatie?',
    ctaSubtitle: 'Neem contact op voor een vrijblijvend gesprek.',
    poweredBy: 'Powered by teun.ai - AI Zichtbaarheid Platform',
    footerText: 'teun.ai - AI Zichtbaarheid Platform',
  },
  en: {
    auditRequired: 'Audit data is required',
    pdfFailed: 'PDF generation failed',
    reportTitle: 'GEO Audit Report',
    unknown: 'Unknown',
    reportIntro: 'This report analyses how well your page is prepared for AI search engines.',
    reportIntro2: 'Analysed on: Content quality, Technical readiness, Citation potential, E-E-A-T and Perplexity.',
    geoScore: 'GEO Score',
    good: 'Good',
    improvable: 'Improvable',
    insufficient: 'Insufficient',
    opportunities: 'there are opportunities',
    found: 'FOUND',
    notFound: 'NOT FOUND',
    foundInPerplexity: 'is found in Perplexity!',
    notFoundInPerplexity: 'is NOT found in Perplexity',
    prompt: 'Prompt',
    topRecommendations: 'Top Recommendations',
    detailedAnalysis: 'Detailed Analysis',
    competitorsInPerplexity: 'Competitors in Perplexity',
    competitorsSameQuery: 'These businesses were mentioned for the same query:',
    pageAnalysis: 'Page Analysis',
    words: 'Words',
    structuredData: 'Structured Data',
    richSnippets: 'Rich Snippets',
    eligible: 'Eligible',
    missingAdd: 'Missing — add',
    notAnalyzed: 'Not analysed',
    none: 'None',
    faqFound: 'FAQ found',
    yes: 'Yes',
    no: 'No',
    images: 'Images',
    withAlt: 'with alt text',
    robotsTxt: 'robots.txt',
    llmsTxt: 'llms.txt',
    present: 'Present',
    notFoundShort: 'Not found',
    mobileFriendly: 'Mobile-friendly',
    ctaTitle: 'Need help with GEO optimization?',
    ctaSubtitle: 'Get in touch for a free consultation.',
    poweredBy: 'Powered by teun.ai - AI Visibility Platform',
    footerText: 'teun.ai - AI Visibility Platform',
  }
}

function getMsg(locale) { return PDF_MESSAGES[locale] || PDF_MESSAGES['nl'] }

export async function POST(request) {
  try {
    const data = await request.json()
    const locale = data.locale || 'nl'
    const msg = getMsg(locale)
    
    if (!data?.analysis?.overallScore && data?.analysis?.overallScore !== 0) {
      return NextResponse.json({ error: msg.auditRequired }, { status: 400 })
    }

    const pdfBytes = await generatePDF(data, msg, locale)
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
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}


async function generatePDF(data, msg, locale) {
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
      if (fs.existsSync(p)) { imageBytes = fs.readFileSync(p); break }
    }
    if (!imageBytes) {
      const imgRes = await fetch('https://teun.ai/images/teun-met-vergrootglas.png')
      if (imgRes.ok) imageBytes = new Uint8Array(await imgRes.arrayBuffer())
    }
    if (imageBytes) mascotImage = await pdfDoc.embedPng(imageBytes)
  } catch (e) {
    console.warn('[GEO Audit PDF] Could not load mascot:', e.message)
  }

  const { analysis, extracted, liveTest, url, domain } = data
  const score = analysis.overallScore
  const company = analysis.companyName || domain || msg.unknown

  const PAGE_W = 595.28, PAGE_H = 841.89, MARGIN = 50
  const CONTENT_W = PAGE_W - 2 * MARGIN

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

  function scoreColor(s) { if (s >= 70) return GREEN; if (s >= 40) return ORANGE; return RED }
  function scoreLabel(s) { if (s >= 70) return msg.good; if (s >= 40) return msg.improvable; return msg.insufficient }
  function statusIcon(status) { if (status === 'good') return 'V'; if (status === 'warning') return '!'; return 'X' }
  function statusColor(status) { if (status === 'good') return GREEN; if (status === 'warning') return ORANGE; return RED }

  function sanitize(text) {
    if (!text) return ''
    return String(text)
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()
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
        lines.push(currentLine); currentLine = word
      } else { currentLine = testLine }
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

  let currentPage = null, y = 0
  const mascotW = 50
  const mascotH = mascotImage ? (50 * mascotImage.height / mascotImage.width) : 65

  function newPage() {
    currentPage = pdfDoc.addPage([PAGE_W, PAGE_H])
    y = PAGE_H - MARGIN
    if (mascotImage) {
      currentPage.drawImage(mascotImage, { x: PAGE_W - MARGIN - mascotW, y: PAGE_H - MARGIN - mascotH + 15, width: mascotW, height: mascotH, opacity: 0.9 })
    }
    return currentPage
  }

  function ensureSpace(needed) { if (y - needed < MARGIN + 40) newPage() }

  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL'
  const today = new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })

  // ━━━ PAGE 1: TITLE PAGE ━━━
  let page = newPage()
  y -= 80
  drawCentered(page, msg.reportTitle, y, helveticaBold, 28, BLACK)
  y -= 35
  drawCentered(page, company, y, helveticaBold, 20, PURPLE)
  y -= 25
  drawCentered(page, today, y, helvetica, 11, LIGHT_GRAY)

  if (url) {
    y -= 18
    drawCentered(page, sanitize(url).replace(/^https?:\/\//, ''), y, helvetica, 11, PURPLE)
  }

  y -= 45
  drawCentered(page, msg.reportIntro, y, helveticaOblique, 9, LIGHT_GRAY)
  y -= 14
  drawCentered(page, msg.reportIntro2, y, helveticaOblique, 9, LIGHT_GRAY)

  // ── OVERALL SCORE ──
  y -= 60
  const scoreBoxH = 100
  page.drawRectangle({ x: MARGIN, y: y - scoreBoxH, width: CONTENT_W, height: scoreBoxH, color: LIGHT_BG, borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 0.5 })

  const scoreStr = `${score}`
  const scoreStrW = helveticaBold.widthOfTextAtSize(scoreStr, 52)
  page.drawText(scoreStr, { x: MARGIN + 35 - scoreStrW / 2 + 20, y: y - 62, size: 52, font: helveticaBold, color: scoreColor(score) })
  page.drawText('/100', { x: MARGIN + 35 - helvetica.widthOfTextAtSize('/100', 12) / 2 + 20, y: y - 82, size: 12, font: helvetica, color: LIGHT_GRAY })

  page.drawText(msg.geoScore, { x: MARGIN + 140, y: y - 28, size: 18, font: helveticaBold, color: BLACK })
  page.drawText(`${scoreLabel(score)} - ${msg.opportunities}`, { x: MARGIN + 140, y: y - 48, size: 11, font: helvetica, color: DARK_GRAY })

  if (analysis.categories?.length > 0) {
    const cats = analysis.categories
    cats.forEach((cat, i) => {
      const rowY = i < 2 ? y - 70 : y - 88
      const colX = i < 2 ? MARGIN + 140 + (i * 180) : MARGIN + 140 + ((i - 2) * 180)
      page.drawText(cat.name, { x: colX, y: rowY, size: 8, font: helvetica, color: LIGHT_GRAY })
      page.drawText(`${cat.score}%`, { x: colX + helvetica.widthOfTextAtSize(cat.name, 8) + 6, y: rowY, size: 9, font: helveticaBold, color: scoreColor(cat.score) })
    })
  }

  y -= scoreBoxH + 25

  // ━━━ LIVE PERPLEXITY TEST ━━━
  if (liveTest) {
    ensureSpace(90)
    const liveH = 65
    const bgColor = liveTest.mentioned ? GREEN_BG : RED_BG
    const borderCol = liveTest.mentioned ? GREEN : RED

    currentPage.drawRectangle({ x: MARGIN, y: y - liveH, width: CONTENT_W, height: liveH, color: bgColor, borderColor: borderCol, borderWidth: 1 })

    const icon = liveTest.mentioned ? msg.found : msg.notFound
    const title = liveTest.mentioned
      ? `${company} ${msg.foundInPerplexity}`
      : `${company} ${msg.notFoundInPerplexity}`
    
    currentPage.drawText(icon, { x: MARGIN + 18, y: y - 20, size: 9, font: helveticaBold, color: liveTest.mentioned ? GREEN : RED })
    currentPage.drawText(sanitize(title), { x: MARGIN + 18, y: y - 36, size: 12, font: helveticaBold, color: BLACK })

    if (liveTest.prompt) {
      const promptLines = wrapText(`${msg.prompt}: "${liveTest.prompt}"`, helvetica, 8, CONTENT_W - 40)
      promptLines.slice(0, 2).forEach((line, i) => {
        currentPage.drawText(line, { x: MARGIN + 18, y: y - 50 - (i * 11), size: 8, font: helvetica, color: GRAY })
      })
    }

    y -= liveH + 20
  }

  // ━━━ TOP RECOMMENDATIONS ━━━
  if (analysis.topRecommendations?.length > 0) {
    ensureSpace(80)
    currentPage.drawText(msg.topRecommendations, { x: MARGIN, y, size: 16, font: helveticaBold, color: BLACK })
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

  // ━━━ CATEGORY DETAILS ━━━
  if (analysis.categories?.length > 0) {
    newPage()
    currentPage.drawText(msg.detailedAnalysis, { x: MARGIN, y, size: 16, font: helveticaBold, color: BLACK })
    y -= 6
    currentPage.drawRectangle({ x: MARGIN, y, width: 140, height: 2, color: PURPLE })
    y -= 25

    analysis.categories.forEach((category) => {
      ensureSpace(120)
      currentPage.drawRectangle({ x: MARGIN, y: y - 30, width: CONTENT_W, height: 30, color: NAVY })
      currentPage.drawText(sanitize(category.name), { x: MARGIN + 14, y: y - 21, size: 12, font: helveticaBold, color: WHITE })
      const catScoreText = `${category.score}%`
      const catScoreW = helveticaBold.widthOfTextAtSize(catScoreText, 12)
      currentPage.drawText(catScoreText, { x: PAGE_W - MARGIN - 14 - catScoreW, y: y - 21, size: 12, font: helveticaBold, color: scoreColor(category.score) })
      y -= 40

      if (category.summary) {
        const summaryLines = wrapText(category.summary, helvetica, 9, CONTENT_W - 20)
        summaryLines.forEach(line => { ensureSpace(14); currentPage.drawText(line, { x: MARGIN + 10, y, size: 9, font: helvetica, color: GRAY }); y -= 13 })
        y -= 8
      }

      if (category.checks?.length > 0) {
        category.checks.forEach((check) => {
          ensureSpace(45)
          const icon = statusIcon(check.status)
          const iconColor = statusColor(check.status)
          const badgeBg = check.status === 'good' ? GREEN_BG : check.status === 'warning' ? rgb(1, 0.97, 0.92) : RED_BG
          
          currentPage.drawRectangle({ x: MARGIN + 10, y: y - 4, width: 18, height: 14, color: badgeBg })
          currentPage.drawText(`[${icon}]`, { x: MARGIN + 11, y: y - 1, size: 8, font: helveticaBold, color: iconColor })
          currentPage.drawText(sanitize(check.name), { x: MARGIN + 35, y, size: 10, font: helveticaBold, color: BLACK })
          
          if (check.priority) {
            const prioColor = (check.priority === 'kritiek' || check.priority === 'critical') ? RED : (check.priority === 'hoog' || check.priority === 'high') ? ORANGE : LIGHT_GRAY
            const nameW = helveticaBold.widthOfTextAtSize(sanitize(check.name), 10)
            currentPage.drawText(`[${check.priority}]`, { x: MARGIN + 40 + nameW, y: y + 1, size: 7, font: helveticaBold, color: prioColor })
          }
          y -= 15

          if (check.detail) {
            const detailLines = wrapText(check.detail, helvetica, 9, CONTENT_W - 45)
            detailLines.forEach(line => { ensureSpace(13); currentPage.drawText(line, { x: MARGIN + 35, y, size: 9, font: helvetica, color: GRAY }); y -= 12 })
          }
          y -= 8
        })
      }
      y -= 18
    })
  }

  // ━━━ COMPETITORS ━━━
  if (liveTest?.competitors?.length > 0) {
    ensureSpace(80)
    currentPage.drawText(msg.competitorsInPerplexity, { x: MARGIN, y, size: 14, font: helveticaBold, color: BLACK })
    y -= 6
    currentPage.drawRectangle({ x: MARGIN, y, width: 140, height: 2, color: PURPLE })
    y -= 18
    currentPage.drawText(msg.competitorsSameQuery, { x: MARGIN + 5, y, size: 9, font: helvetica, color: GRAY })
    y -= 20

    liveTest.competitors.forEach((comp, i) => {
      ensureSpace(18)
      currentPage.drawText(`${i + 1}. ${sanitize(comp)}`, { x: MARGIN + 10, y, size: 10, font: helvetica, color: DARK_GRAY })
      y -= 16
    })
    y -= 15
  }

  // ━━━ EXTRACTED DATA ━━━
  if (extracted) {
    ensureSpace(200)
    currentPage.drawText(msg.pageAnalysis, { x: MARGIN, y, size: 14, font: helveticaBold, color: BLACK })
    y -= 6
    currentPage.drawRectangle({ x: MARGIN, y, width: 140, height: 2, color: PURPLE })
    y -= 22

    const dataRows = [
      ['Title', extracted.title || '-'],
      ['Meta description', extracted.description || '-'],
      [msg.words, `${extracted.wordCount || 0}`],
      ['Headings', `${extracted.headingCount || 0}`],
      [msg.structuredData, extracted.structuredDataTypes?.join(', ') || msg.none],
      [msg.richSnippets, extracted.richSnippets?.eligible?.length > 0 
        ? `${msg.eligible}: ${extracted.richSnippets.eligible.join(', ')}` 
        : extracted.richSnippets?.suggestedTypes?.length > 0
          ? `${msg.missingAdd}: ${extracted.richSnippets.suggestedTypes.slice(0, 3).join(', ')}`
          : msg.notAnalyzed],
      [msg.faqFound, extracted.hasFAQ ? msg.yes : msg.no],
      [msg.images, `${extracted.imageCount || 0} (${extracted.imagesWithAlt || 0} ${msg.withAlt})`],
      [msg.robotsTxt, extracted.hasRobotsTxt ? msg.present : msg.notFoundShort],
      [msg.llmsTxt, extracted.hasLlmsTxt ? msg.present : msg.notFoundShort],
    ]

    if (extracted.coreWebVitals) {
      const cwv = extracted.coreWebVitals
      dataRows.push(['Performance', `${cwv.performanceScore || '-'}/100`])
      if (cwv.lcp) dataRows.push(['LCP', `${(cwv.lcp / 1000).toFixed(1)}s`])
      if (cwv.cls !== null && cwv.cls !== undefined) dataRows.push(['CLS', `${cwv.cls}`])
      dataRows.push([msg.mobileFriendly, cwv.mobileFriendly ? msg.yes : msg.no])
    }

    dataRows.forEach(([label, value], idx) => {
      ensureSpace(28)
      const rowBg = idx % 2 === 0 ? LIGHT_BG : WHITE
      const valueLines = wrapText(value, helvetica, 9, CONTENT_W - 150)
      const rowH = Math.max(18, valueLines.length * 13 + 6)
      
      currentPage.drawRectangle({ x: MARGIN, y: y - rowH + 12, width: CONTENT_W, height: rowH, color: rowBg })
      currentPage.drawText(label, { x: MARGIN + 10, y, size: 9, font: helveticaBold, color: GRAY })
      valueLines.forEach((line, li) => {
        currentPage.drawText(line, { x: MARGIN + 140, y: y - (li * 13), size: 9, font: helvetica, color: DARK_GRAY })
      })
      y -= rowH
    })
  }

  // ━━━ CTA FOOTER ━━━
  y -= 30
  ensureSpace(90)
  currentPage.drawRectangle({ x: MARGIN + 60, y: y + 5, width: CONTENT_W - 120, height: 0.5, color: rgb(0.85, 0.85, 0.85) })
  y -= 18
  drawCentered(currentPage, msg.ctaTitle, y, helveticaBold, 12, BLACK)
  y -= 18
  drawCentered(currentPage, msg.ctaSubtitle, y, helvetica, 10, DARK_GRAY)
  y -= 22
  drawCentered(currentPage, 'hallo@onlinelabs.nl  |  onlinelabs.nl', y, helveticaBold, 10, PURPLE)
  y -= 25
  drawCentered(currentPage, msg.poweredBy, y, helvetica, 9, LIGHT_GRAY)

  // ━━━ PAGE FOOTERS ━━━
  const allPages = pdfDoc.getPages()
  const totalPages = allPages.length
  allPages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_W - MARGIN, y: 42 }, thickness: 0.5, color: rgb(0.88, 0.91, 0.93) })
    const footerW = helvetica.widthOfTextAtSize(msg.footerText, 8)
    p.drawText(msg.footerText, { x: (PAGE_W - footerW) / 2, y: 28, size: 8, font: helvetica, color: LIGHT_GRAY })
    const pageNum = `${i + 1} / ${totalPages}`
    const pageNumW = helvetica.widthOfTextAtSize(pageNum, 8)
    p.drawText(pageNum, { x: PAGE_W - MARGIN - pageNumW, y: 28, size: 8, font: helvetica, color: LIGHT_GRAY })
  })

  return await pdfDoc.save()
}
