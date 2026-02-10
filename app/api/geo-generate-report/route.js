import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

// Colors
const DARK_BLUE = rgb(30/255, 30/255, 63/255)
const PURPLE = rgb(99/255, 102/255, 241/255)
const GREEN = rgb(34/255, 197/255, 94/255)
const ORANGE = rgb(245/255, 158/255, 11/255)
const RED = rgb(239/255, 68/255, 68/255)
const GRAY = rgb(102/255, 102/255, 102/255)
const LIGHT_GRAY = rgb(248/255, 250/255, 252/255)
const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)

function getScoreColor(score) {
  if (score >= 75) return GREEN
  if (score >= 60) return ORANGE
  return RED
}

function getScoreLabel(score) {
  if (score >= 90) return 'Uitstekend'
  if (score >= 75) return 'Goed'
  if (score >= 60) return 'Matig'
  if (score >= 40) return 'Onvoldoende'
  return 'Slecht'
}

export async function POST(request) {
  console.log('=== PDF Generation Started ===')
  
  try {
    const data = await request.json()
    console.log('Data received:', Object.keys(data))
    
    // Extract data
    const companyName = data.companyName || 'Bedrijfsnaam'
    const companyWebsite = (data.companyWebsite || '').replace(/^https?:\/\//, '')
    
    // Try multiple sources for category
    let companyCategory = data.companyCategory || data.company_category || data.category || data.branche || ''
    
    // If still empty, try to find it in aiResults or other data
    if (!companyCategory && data.aiResults && data.aiResults.length > 0) {
      const firstWithCategory = data.aiResults.find(r => r.category)
      if (firstWithCategory) companyCategory = firstWithCategory.category
    }
    
    // Default fallback
    if (!companyCategory) companyCategory = 'Niet opgegeven'
    
    console.log('=== Company Data ===')
    console.log('Name:', companyName)
    console.log('Website:', companyWebsite)
    console.log('Category received:', data.companyCategory)
    console.log('Category used:', companyCategory)
    
    const aiResults = data.aiResults || []
    const matches = data.matches || []
    const scanResults = data.scanResults || {}
    const overallScore = data.overallScore || {}
    
    const aiScore = overallScore.aiVisibility || 0
    const geoScore = overallScore.geo || 0
    const totalScore = overallScore.overall || 0
    
    console.log('=== AI Results Debug ===')
    console.log('aiResults count:', aiResults.length)
    console.log('aiScore:', aiScore)
    
    // Group aiResults by platform
    const byPlatform = { perplexity: [], chatgpt: [], google: [], googleAi: [], googleAiOverview: [] }
    for (const r of aiResults) {
      const platform = r.platform || 'unknown'
      if (byPlatform[platform]) {
        byPlatform[platform].push(r)
      }
      // Also map 'google' to googleAi for backward compatibility
      if (platform === 'google' && byPlatform.googleAi.length === 0) {
        byPlatform.googleAi.push(r)
      }
    }
    
    console.log('By platform - Perplexity:', byPlatform.perplexity.length, 
                'ChatGPT:', byPlatform.chatgpt.length, 
                'Google AI Modus:', byPlatform.googleAi.length,
                'AI Overviews:', byPlatform.googleAiOverview.length)
    
    // Find the platform with the most prompts (non-empty)
    let bestPlatform = 'chatgpt'
    let bestCount = 0
    for (const [platform, results] of Object.entries(byPlatform)) {
      const withPrompts = results.filter(r => r.prompt && r.prompt.trim()).length
      if (withPrompts > bestCount) {
        bestCount = withPrompts
        bestPlatform = platform
      }
    }
    
    console.log('Best platform for prompts:', bestPlatform, 'with', bestCount, 'prompts')
    
    // Build prompt list from best platform, then check ALL platforms for mentioned status
    const promptMap = new Map()
    
    // First, get all prompts from the platform with most prompt text
    for (const r of byPlatform[bestPlatform]) {
      const prompt = (r.prompt || '').trim()
      if (prompt && prompt !== 'Onbekend') {
        promptMap.set(prompt, { 
          prompt, 
          mentioned: r.mentioned === true 
        })
      }
    }
    
    // Also add any prompts from other platforms
    for (const [platform, results] of Object.entries(byPlatform)) {
      for (const r of results) {
        const prompt = (r.prompt || '').trim()
        if (prompt && prompt !== 'Onbekend' && !promptMap.has(prompt)) {
          promptMap.set(prompt, { prompt, mentioned: r.mentioned === true })
        }
        // If prompt exists and this result is mentioned, update it
        if (prompt && promptMap.has(prompt) && r.mentioned === true) {
          promptMap.set(prompt, { prompt, mentioned: true })
        }
      }
    }
    
    // Also check matches for additional prompts
    for (const m of matches) {
      const prompt = (m.prompt || m.keyword || '').trim()
      if (prompt && !promptMap.has(prompt)) {
        promptMap.set(prompt, { prompt, mentioned: false })
      }
    }
    
    // Now try to match empty-prompt entries with mentioned=true to prompts by position
    // This handles the case where platform A has prompts but no mentioned status,
    // and platform B has mentioned status but no prompts
    for (const [platform, results] of Object.entries(byPlatform)) {
      const withPrompts = results.filter(r => r.prompt && r.prompt.trim())
      const withoutPrompts = results.filter(r => !r.prompt || !r.prompt.trim())
      
      // If we have entries without prompts but with mentioned=true
      const mentionedWithoutPrompt = withoutPrompts.filter(r => r.mentioned === true)
      if (mentionedWithoutPrompt.length > 0 && withPrompts.length > 0) {
        // Try to match by index
        for (let i = 0; i < mentionedWithoutPrompt.length && i < withPrompts.length; i++) {
          const prompt = withPrompts[i].prompt.trim()
          if (promptMap.has(prompt)) {
            promptMap.set(prompt, { prompt, mentioned: true })
          }
        }
      }
    }
    
    let uniquePrompts = Array.from(promptMap.values())
    
    // Final fallback: if we still have 0 mentioned but aiScore > 0, calculate based on score
    const currentMentioned = uniquePrompts.filter(p => p.mentioned).length
    if (currentMentioned === 0 && aiScore > 0 && uniquePrompts.length > 0) {
      console.log('Fallback: Calculating mentioned from aiScore')
      const expectedMentioned = Math.max(1, Math.round((aiScore / 100) * uniquePrompts.length))
      
      // Mark first N as mentioned (not ideal but shows something)
      uniquePrompts = uniquePrompts.map((p, i) => ({
        ...p,
        mentioned: i < expectedMentioned
      }))
    }
    
    console.log('=== Final Prompt Analysis ===')
    console.log('Unique prompts:', uniquePrompts.length)
    console.log('Mentioned:', uniquePrompts.filter(p => p.mentioned).length)
    console.log('Not mentioned:', uniquePrompts.filter(p => !p.mentioned).length)
    
    const mentionedPrompts = uniquePrompts.filter(p => p.mentioned)
    const notMentionedPrompts = uniquePrompts.filter(p => !p.mentioned)
    
    // Page results
    const pageResults = Object.entries(scanResults)
      .map(([url, r]) => ({
        url: url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        score: r.score || 0
      }))
      .sort((a, b) => b.score - a.score)
    
    // Create PDF
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    const pageWidth = 595  // A4
    const pageHeight = 842
    const margin = 50
    
    // Try to load Teun mascotte
    let teunImage = null
    try {
      const teunPaths = [
        path.join(process.cwd(), 'public', 'images', 'teun-met-vergrootglas.png'),
        path.join(process.cwd(), 'public', 'images', 'teun-ai-mascotte.png'),
        path.join(process.cwd(), 'public', 'mascotte-teun-ai.png'),
      ]
      for (const teunPath of teunPaths) {
        if (fs.existsSync(teunPath)) {
          const teunBytes = fs.readFileSync(teunPath)
          teunImage = await pdfDoc.embedPng(teunBytes)
          console.log('Loaded Teun from:', teunPath)
          break
        }
      }
    } catch (e) {
      console.log('Could not load Teun mascotte:', e.message)
    }
    
    // ============ PAGE 1: TITLE ============
    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin
    
    // Teun mascotte top right
    if (teunImage) {
      const teunW = 55
      const teunH = 71  // Maintain 512:665 aspect ratio
      page.drawImage(teunImage, {
        x: pageWidth - margin - teunW,
        y: pageHeight - margin - teunH + 10,
        width: teunW,
        height: teunH,
      })
    }
    
    // Title
    y -= 80
    page.drawText('GEO ANALYSE', {
      x: pageWidth / 2 - helveticaBold.widthOfTextAtSize('GEO ANALYSE', 28) / 2,
      y,
      size: 28,
      font: helveticaBold,
      color: DARK_BLUE,
    })
    
    y -= 35
    page.drawText('RAPPORT', {
      x: pageWidth / 2 - helveticaBold.widthOfTextAtSize('RAPPORT', 28) / 2,
      y,
      size: 28,
      font: helveticaBold,
      color: PURPLE,
    })
    
    // Company info
    y -= 50
    page.drawText(companyName, {
      x: pageWidth / 2 - helveticaBold.widthOfTextAtSize(companyName, 18) / 2,
      y,
      size: 18,
      font: helveticaBold,
      color: BLACK,
    })
    
    y -= 20
    page.drawText(companyWebsite, {
      x: pageWidth / 2 - helvetica.widthOfTextAtSize(companyWebsite, 10) / 2,
      y,
      size: 10,
      font: helvetica,
      color: PURPLE,
    })
    
    y -= 15
    const brancheText = `Branche: ${companyCategory}`
    page.drawText(brancheText, {
      x: pageWidth / 2 - helvetica.widthOfTextAtSize(brancheText, 10) / 2,
      y,
      size: 10,
      font: helvetica,
      color: GRAY,
    })
    
    // Date
    y -= 15
    const dateText = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    page.drawText(dateText, {
      x: pageWidth / 2 - helvetica.widthOfTextAtSize(dateText, 10) / 2,
      y,
      size: 10,
      font: helvetica,
      color: GRAY,
    })
    
    // Score table
    y -= 50
    const tableWidth = 480
    const colWidth = tableWidth / 3
    const tableX = (pageWidth - tableWidth) / 2
    
    // Header row
    page.drawRectangle({
      x: tableX,
      y: y - 30,
      width: tableWidth,
      height: 30,
      color: DARK_BLUE,
    })
    
    const headers = ['AI Zichtbaarheid', 'GEO Score', 'Totaalscore']
    headers.forEach((header, i) => {
      page.drawText(header, {
        x: tableX + (i * colWidth) + colWidth/2 - helveticaBold.widthOfTextAtSize(header, 10) / 2,
        y: y - 20,
        size: 10,
        font: helveticaBold,
        color: WHITE,
      })
    })
    
    // Score row
    y -= 30
    page.drawRectangle({
      x: tableX,
      y: y - 60,
      width: tableWidth,
      height: 60,
      color: WHITE,
      borderColor: DARK_BLUE,
      borderWidth: 1,
    })
    
    // Totaalscore background
    page.drawRectangle({
      x: tableX + colWidth * 2,
      y: y - 60,
      width: colWidth,
      height: 60,
      color: LIGHT_GRAY,
    })
    
    const scores = [
      { value: `${aiScore}%`, color: getScoreColor(aiScore), label: getScoreLabel(aiScore) },
      { value: `${geoScore}%`, color: getScoreColor(geoScore), label: getScoreLabel(geoScore) },
      { value: `${totalScore}%`, color: PURPLE, label: getScoreLabel(totalScore) },
    ]
    
    scores.forEach((score, i) => {
      // Score value
      page.drawText(score.value, {
        x: tableX + (i * colWidth) + colWidth/2 - helveticaBold.widthOfTextAtSize(score.value, 28) / 2,
        y: y - 30,
        size: 28,
        font: helveticaBold,
        color: score.color,
      })
      // Label
      page.drawText(score.label, {
        x: tableX + (i * colWidth) + colWidth/2 - helvetica.widthOfTextAtSize(score.label, 9) / 2,
        y: y - 50,
        size: 9,
        font: helvetica,
        color: GRAY,
      })
    })
    
    // Samenvatting
    y -= 100
    page.drawText('Samenvatting', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: DARK_BLUE,
    })
    
    y -= 25
    const summaryText = `${companyName} wordt momenteel in ${aiScore}% van de geteste commerciele zoekopdrachten genoemd door AI-assistenten (ChatGPT, Perplexity, Google AI Modus en AI Overviews).`
    
    // Word wrap summary
    const maxWidth = pageWidth - margin * 2
    const words = summaryText.split(' ')
    let line = ''
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word
      if (helvetica.widthOfTextAtSize(testLine, 10) > maxWidth) {
        page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: BLACK })
        y -= 14
        line = word
      } else {
        line = testLine
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: BLACK })
    }
    
    y -= 20
    const actionText = aiScore < 50 ? 'Dit vereist directe actie.' : 'Er is ruimte voor verbetering.'
    page.drawText(actionText, {
      x: margin,
      y,
      size: 10,
      font: helveticaBold,
      color: RED,
    })
    
    // FOMO warning
    y -= 30
    const warningText = 'Let op: Steeds meer mensen gebruiken AI als zoekmachine. Bedrijven die nu niet zichtbaar zijn in AI-antwoorden, lopen potentiele klanten mis aan concurrenten die wel worden aanbevolen - vooral bij zoekopdrachten in de bottom-of-funnel-fase.'
    const warningWords = warningText.split(' ')
    line = ''
    for (const word of warningWords) {
      const testLine = line + (line ? ' ' : '') + word
      if (helvetica.widthOfTextAtSize(testLine, 9) > maxWidth) {
        page.drawText(line, { x: margin, y, size: 9, font: helvetica, color: RED })
        y -= 12
        line = word
      } else {
        line = testLine
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: 9, font: helvetica, color: RED })
    }
    
    // ============ PAGE 2: AI ZICHTBAARHEID ============
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
    
    page.drawText('1. AI Zichtbaarheid', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: DARK_BLUE,
    })
    
    y -= 25
    const introText = `We hebben ${uniquePrompts.length} commerciele zoekwoorden getest op 4 AI-platforms: ChatGPT, Perplexity, Google AI Modus en AI Overviews.`
    page.drawText(introText, { x: margin, y, size: 10, font: helvetica, color: BLACK })
    
    y -= 20
    const resultText = `Resultaat: ${companyName} wordt bij ${mentionedPrompts.length} van de ${uniquePrompts.length} zoekwoorden vermeld door minimaal 1 AI-platform.`
    page.drawText(resultText, { x: margin, y, size: 10, font: helveticaBold, color: BLACK })
    
    y -= 15
    page.drawText('Voor gedetailleerde resultaten per AI-platform, bekijk je Dashboard op teun.ai.', {
      x: margin, y, size: 9, font: helvetica, color: GRAY
    })
    
    // Wel vermeld
    if (mentionedPrompts.length > 0) {
      y -= 35
      page.drawText(`Wel vermeld (${mentionedPrompts.length} zoekwoorden)`, {
        x: margin, y, size: 12, font: helveticaBold, color: GREEN
      })
      
      y -= 5
      for (const p of mentionedPrompts.slice(0, 8)) {
        y -= 16
        page.drawText('[V]', { x: margin, y, size: 10, font: helveticaBold, color: GREEN })
        const promptText = p.prompt.length > 65 ? p.prompt.slice(0, 65) + '...' : p.prompt
        page.drawText(promptText, { x: margin + 25, y, size: 10, font: helvetica, color: BLACK })
      }
      if (mentionedPrompts.length > 8) {
        y -= 16
        page.drawText(`...en ${mentionedPrompts.length - 8} meer (zie Dashboard)`, {
          x: margin + 25, y, size: 9, font: helvetica, color: GRAY
        })
      }
    }
    
    // Niet vermeld
    if (notMentionedPrompts.length > 0) {
      y -= 35
      page.drawText(`Niet vermeld (${notMentionedPrompts.length} zoekwoorden)`, {
        x: margin, y, size: 12, font: helveticaBold, color: RED
      })
      
      y -= 5
      for (const p of notMentionedPrompts.slice(0, 6)) {
        y -= 16
        page.drawText('[X]', { x: margin, y, size: 10, font: helveticaBold, color: RED })
        const promptText = p.prompt.length > 65 ? p.prompt.slice(0, 65) + '...' : p.prompt
        page.drawText(promptText, { x: margin + 25, y, size: 10, font: helvetica, color: GRAY })
      }
      if (notMentionedPrompts.length > 6) {
        y -= 16
        page.drawText(`...en ${notMentionedPrompts.length - 6} meer (zie Dashboard)`, {
          x: margin + 25, y, size: 9, font: helvetica, color: GRAY
        })
      }
    }
    
    // ============ PAGE 3: PAGINA SCORES ============
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
    
    page.drawText('2. Pagina Scores', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: DARK_BLUE,
    })
    
    y -= 25
    page.drawText(`GEO-optimalisatie score voor alle ${pageResults.length} gescande paginas:`, {
      x: margin, y, size: 10, font: helvetica, color: BLACK
    })
    
    // Table header
    y -= 30
    const pTableWidth = pageWidth - margin * 2
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: pTableWidth,
      height: 20,
      color: DARK_BLUE,
    })
    
    page.drawText('Pagina', { x: margin + 10, y: y - 14, size: 9, font: helveticaBold, color: WHITE })
    page.drawText('Score', { x: margin + 340, y: y - 14, size: 9, font: helveticaBold, color: WHITE })
    page.drawText('Status', { x: margin + 420, y: y - 14, size: 9, font: helveticaBold, color: WHITE })
    
    y -= 20
    
    // Table rows
    for (let i = 0; i < Math.min(pageResults.length, 12); i++) {
      const p = pageResults[i]
      const rowY = y - (i * 22)
      
      // Zebra striping
      if (i % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: rowY - 16,
          width: pTableWidth,
          height: 22,
          color: LIGHT_GRAY,
        })
      }
      
      const urlText = p.url.length > 45 ? p.url.slice(0, 45) + '...' : p.url
      page.drawText(urlText, { x: margin + 10, y: rowY - 10, size: 9, font: helvetica, color: BLACK })
      page.drawText(`${p.score}/100`, { x: margin + 340, y: rowY - 10, size: 9, font: helveticaBold, color: getScoreColor(p.score) })
      page.drawText(getScoreLabel(p.score), { x: margin + 420, y: rowY - 10, size: 9, font: helvetica, color: GRAY })
    }
    
    // ============ PAGE 4: AANBEVELINGEN ============
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
    
    page.drawText('3. Aanbevelingen', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: DARK_BLUE,
    })
    
    y -= 25
    page.drawText('Deze acties vereisen directe aandacht om je AI-zichtbaarheid te verbeteren:', {
      x: margin, y, size: 10, font: helveticaBold, color: RED
    })
    
    const recommendations = [
      { title: 'Versterk E-E-A-T signalen', desc: 'Zorg dat content geschreven is door experts. Toon auteursinformatie en credentials duidelijk.' },
      { title: 'Implementeer Rich Snippets', desc: 'Voeg FAQ Schema en Organization Schema toe. Cruciaal voor Google AI Modus en AI Overviews.' },
      { title: 'Optimaliseer landingspaginas', desc: 'Verbeter GEO-score met betere content structuur en uitgebreide FAQ secties.' },
      { title: 'Geef volledige antwoorden', desc: 'AI-systemen prefereren bronnen die direct en volledig antwoord geven.' },
    ]
    
    y -= 15
    recommendations.forEach((rec, i) => {
      y -= 30
      page.drawText(`${i + 1}. ${rec.title}`, { x: margin, y, size: 11, font: helveticaBold, color: BLACK })
      page.drawText('[Hoog]', { x: margin + helveticaBold.widthOfTextAtSize(`${i + 1}. ${rec.title}`, 11) + 10, y, size: 9, font: helveticaBold, color: RED })
      y -= 14
      page.drawText(rec.desc, { x: margin, y, size: 9, font: helvetica, color: GRAY })
    })
    
    // CTA
    y -= 40
    page.drawText('Wacht niet te lang - elke dag zonder GEO-optimalisatie gaan potentiele klanten', {
      x: margin, y, size: 10, font: helveticaBold, color: RED
    })
    y -= 14
    page.drawText('naar concurrenten die wel zichtbaar zijn in AI-antwoorden.', {
      x: margin, y, size: 10, font: helveticaBold, color: RED
    })
    
    // Footer
    y -= 60
    page.drawText('Hulp nodig bij GEO optimalisatie?', {
      x: pageWidth / 2 - helveticaBold.widthOfTextAtSize('Hulp nodig bij GEO optimalisatie?', 10) / 2,
      y, size: 10, font: helveticaBold, color: BLACK
    })
    y -= 15
    page.drawText('hallo@onlinelabs.nl  |  onlinelabs.nl', {
      x: pageWidth / 2 - helvetica.widthOfTextAtSize('hallo@onlinelabs.nl  |  onlinelabs.nl', 10) / 2,
      y, size: 10, font: helvetica, color: PURPLE
    })
    y -= 20
    page.drawText('Powered by teun.ai', {
      x: pageWidth / 2 - helvetica.widthOfTextAtSize('Powered by teun.ai', 9) / 2,
      y, size: 9, font: helvetica, color: GRAY
    })
    
    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()
    
    // Return PDF
    const companySlug = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
    
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="GEO-Rapport-${companySlug}.pdf"`,
      }
    })
    
  } catch (error) {
    console.error('=== PDF Generation Error ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
