import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const data = await request.json()
    const { companyName, companyWebsite, companyCategory, matches, scanResults, aiResults, overallScore, manualChecks } = data

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
      BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require('docx')

    const children = []

    // --- HELPERS ---
    const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' }
    const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
    const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
    
    const headerCell = (text, width) => new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      shading: { fill: '1E1E3F', type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })] })]
    })

    const dataCell = (text, width, opts = {}) => new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, size: 20, font: 'Arial', bold: opts.bold, color: opts.color })]
      })]
    })

    const spacer = (pts = 100) => new Paragraph({ spacing: { before: pts } })

    // Score thresholds
    const getStatus = (score) => {
      if (score >= 95) return { label: 'Uitstekend', color: '16A34A' }
      if (score >= 80) return { label: 'Goed', color: '16A34A' }
      if (score >= 65) return { label: 'Gemiddeld', color: 'D97706' }
      return { label: 'Slecht', color: 'DC2626' }
    }

    const getScoreColor = (score) => {
      if (score >= 80) return '16A34A'
      if (score >= 65) return 'D97706'
      return 'DC2626'
    }

    // Truncate URL for display
    const truncateUrl = (url, max = 50) => {
      const clean = (url || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
      return clean.length > max ? clean.slice(0, max) + '...' : clean
    }

    // Current date in Dutch
    const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

    // === TITLE PAGE ===
    children.push(
      spacer(600),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: 'GEO Rapport', size: 52, bold: true, font: 'Arial', color: '1E1E3F' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: companyName || 'Onbekend', size: 36, font: 'Arial', color: '6366F1' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: today, size: 22, font: 'Arial', color: '94A3B8' })]
      })
    )

    if (companyWebsite) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: companyWebsite.replace(/^https?:\/\//, ''), size: 22, font: 'Arial', color: '6366F1' })]
      }))
    }

    // Disclaimer
    children.push(
      spacer(400),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({
          text: 'Dit rapport is een beknopte samenvatting van de GEO-analyse.',
          size: 20, font: 'Arial', color: '64748B', italics: true
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({
          text: 'GEO-optimalisatie specialisten weten op basis van deze data welke verbeterstappen nodig zijn.',
          size: 20, font: 'Arial', color: '64748B', italics: true
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({
          text: 'Voor gedetailleerde resultaten per AI-platform, bekijk het dashboard op teun.ai.',
          size: 20, font: 'Arial', color: '64748B', italics: true
        })]
      })
    )

    // Overall score
    if (overallScore) {
      const scoreStatus = getStatus(overallScore)
      children.push(
        spacer(200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Totale GEO Score: ', size: 32, bold: true, font: 'Arial', color: '1E1E3F' }),
            new TextRun({ text: `${overallScore}/100`, size: 32, bold: true, font: 'Arial', color: scoreStatus.color }),
            new TextRun({ text: ` (${scoreStatus.label})`, size: 28, font: 'Arial', color: scoreStatus.color })
          ]
        })
      )
    }

    // Page break after title
    children.push(new Paragraph({ children: [new PageBreak()] }))

    // === 1. AI ZICHTBAARHEID ===
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
        children: [new TextRun({ text: '1. AI Zichtbaarheid', size: 32, bold: true, font: 'Arial', color: '1E1E3F' })]
      })
    )

    // Platform breakdown
    const platforms = {
      perplexity: { name: 'Perplexity', results: (aiResults || []).filter(r => r.platform === 'perplexity') },
      chatgpt: { name: 'ChatGPT', results: (aiResults || []).filter(r => r.platform === 'chatgpt') },
      google: { name: 'Google AI Modus', results: (aiResults || []).filter(r => r.platform === 'google') },
      overview: { name: 'AI Overviews', results: (aiResults || []).filter(r => r.platform === 'google_overview') }
    }

    const totalPrompts = (aiResults || []).length
    const uniquePrompts = [...new Set((aiResults || []).map(r => r.prompt || r.ai_prompt || r.query || ''))]
    const promptCount = uniquePrompts.length || totalPrompts

    // Count mentions (a prompt is "mentioned" if mentioned on ANY platform)
    const promptMentionMap = {}
    ;(aiResults || []).forEach(r => {
      const prompt = r.prompt || r.ai_prompt || r.query || ''
      if (!promptMentionMap[prompt]) promptMentionMap[prompt] = { mentioned: false, platforms: [] }
      if (r.mentioned) {
        promptMentionMap[prompt].mentioned = true
        promptMentionMap[prompt].platforms.push(r.platform)
      }
    })

    const mentionedPrompts = Object.entries(promptMentionMap).filter(([, v]) => v.mentioned)
    const notMentionedPrompts = Object.entries(promptMentionMap).filter(([, v]) => !v.mentioned)

    // Active platforms text
    const activePlatforms = Object.values(platforms).filter(p => p.results.length > 0).map(p => p.name)
    const platformText = activePlatforms.length > 0 
      ? activePlatforms.join(', ')
      : 'ChatGPT, Perplexity, Google AI Modus en AI Overviews'

    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({
          text: `We hebben ${promptCount} commerciele zoekwoorden getest op ${activePlatforms.length || 4} AI-platformen: ${platformText}.`,
          size: 22, font: 'Arial'
        })]
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({
          text: `Resultaat: ${companyName} wordt bij ${mentionedPrompts.length} van de ${promptCount} zoekwoorden vermeld door minimaal 1 AI-platform.`,
          size: 22, font: 'Arial', bold: true
        })]
      })
    )

    // Platform score table
    const platformRows = Object.values(platforms).filter(p => p.results.length > 0).map(p => {
      const mentioned = p.results.filter(r => r.mentioned).length
      const total = p.results.length
      const score = total > 0 ? Math.round((mentioned / total) * 100) : 0
      return { name: p.name, mentioned, total, score }
    })

    if (platformRows.length > 0) {
      children.push(
        spacer(100),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3200, 1800, 1800, 2560],
          rows: [
            new TableRow({ children: [
              headerCell('Platform', 3200),
              headerCell('Vermeld', 1800),
              headerCell('Totaal', 1800),
              headerCell('Score', 2560)
            ]}),
            ...platformRows.map(p => new TableRow({ children: [
              dataCell(p.name, 3200, { bold: true }),
              dataCell(`${p.mentioned}`, 1800, { center: true }),
              dataCell(`${p.total}`, 1800, { center: true }),
              dataCell(`${p.score}%`, 2560, { center: true, color: getScoreColor(p.score), bold: true })
            ]}))
          ]
        })
      )
    }

    // Mentioned prompts - FULL text
    if (mentionedPrompts.length > 0) {
      children.push(
        spacer(200),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: `Wel vermeld (${mentionedPrompts.length} zoekwoorden)`, size: 24, bold: true, font: 'Arial', color: '16A34A' })]
        })
      )
      mentionedPrompts.forEach(([prompt]) => {
        children.push(new Paragraph({
          spacing: { after: 80 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: '[V]  ', size: 20, font: 'Arial', color: '16A34A', bold: true }),
            new TextRun({ text: prompt, size: 20, font: 'Arial', color: '374151' })
          ]
        }))
      })
    }

    // Not mentioned prompts - FULL text
    if (notMentionedPrompts.length > 0) {
      children.push(
        spacer(200),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: `Niet vermeld (${notMentionedPrompts.length} zoekwoorden)`, size: 24, bold: true, font: 'Arial', color: 'DC2626' })]
        })
      )
      notMentionedPrompts.forEach(([prompt]) => {
        children.push(new Paragraph({
          spacing: { after: 80 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: '[X]  ', size: 20, font: 'Arial', color: 'DC2626', bold: true }),
            new TextRun({ text: prompt, size: 20, font: 'Arial', color: '374151' })
          ]
        }))
      })
    }

    // Page break before section 2
    children.push(new Paragraph({ children: [new PageBreak()] }))

    // === 2. PAGINA SCORES ===
    const pageEntries = Object.entries(scanResults || {}).filter(([, v]) => v.scanned)
    
    if (pageEntries.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
          children: [new TextRun({ text: '2. Pagina Scores', size: 32, bold: true, font: 'Arial', color: '1E1E3F' })]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: `GEO-optimalisatiescore voor alle ${pageEntries.length} gescande pagina's:`, size: 22, font: 'Arial' })]
        })
      )

      // Sort by score descending
      const sortedPages = pageEntries.sort((a, b) => (b[1].score || 0) - (a[1].score || 0))

      children.push(
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [5600, 1880, 1880],
          rows: [
            new TableRow({ children: [
              headerCell('Pagina', 5600),
              headerCell('Score', 1880),
              headerCell('Status', 1880)
            ]}),
            ...sortedPages.map(([url, result]) => {
              const score = result.score || 0
              const status = getStatus(score)
              return new TableRow({ children: [
                dataCell(truncateUrl(url, 55), 5600),
                dataCell(`${score}/100`, 1880, { center: true, color: status.color, bold: true }),
                dataCell(status.label, 1880, { center: true, color: status.color })
              ]})
            })
          ]
        })
      )

      // Average score
      const avgScore = Math.round(sortedPages.reduce((sum, [, r]) => sum + (r.score || 0), 0) / sortedPages.length)
      const avgStatus = getStatus(avgScore)
      children.push(
        spacer(150),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: 'Gemiddelde score: ', size: 22, font: 'Arial', bold: true }),
            new TextRun({ text: `${avgScore}/100`, size: 22, font: 'Arial', bold: true, color: avgStatus.color }),
            new TextRun({ text: ` (${avgStatus.label})`, size: 22, font: 'Arial', color: avgStatus.color })
          ]
        })
      )

      // Page break before section 3
      children.push(new Paragraph({ children: [new PageBreak()] }))

      // === 3. TOP ISSUES PER PAGINA ===
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
          children: [new TextRun({ text: '3. Verbeterpunten per pagina', size: 32, bold: true, font: 'Arial', color: '1E1E3F' })]
        })
      )

      sortedPages.forEach(([url, result]) => {
        const issues = result.issues || []
        if (issues.length === 0) return

        children.push(
          spacer(100),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: truncateUrl(url, 55), size: 22, font: 'Arial', bold: true, color: '1E1E3F' }),
              new TextRun({ text: `  (${result.score || 0}/100)`, size: 20, font: 'Arial', color: getScoreColor(result.score || 0) })
            ]
          })
        )

        issues.slice(0, 5).forEach(issue => {
          children.push(new Paragraph({
            spacing: { after: 60 },
            indent: { left: 360 },
            children: [
              new TextRun({ text: '- ', size: 20, font: 'Arial', color: 'D97706' }),
              new TextRun({ text: typeof issue === 'string' ? issue : (issue.message || issue.label || ''), size: 20, font: 'Arial', color: '4B5563' })
            ]
          }))
        })
      })
    }

    // Page break before recommendations
    children.push(new Paragraph({ children: [new PageBreak()] }))

    // === 4. AANBEVELINGEN ===
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
        children: [new TextRun({ text: `${pageEntries.length > 0 ? '4' : '3'}. Aanbevelingen`, size: 32, bold: true, font: 'Arial', color: '1E1E3F' })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Op basis van de analyse adviseren we de volgende stappen:', size: 22, font: 'Arial' })]
      })
    )

    const recommendations = [
      {
        title: 'Vergroot je AI-zichtbaarheid per platform',
        description: `${companyName} wordt bij ${notMentionedPrompts.length} van de ${promptCount} zoekwoorden niet vermeld. Focus op de niet-vermelde zoekwoorden door relevante content te creeren die direct antwoord geeft op deze vragen.`
      },
      {
        title: 'Optimaliseer landingspagina\'s voor GEO',
        description: 'Verbeter de GEO-score van elke landingspagina door betere contentstructuur, uitgebreide FAQ-secties en gedetailleerdere antwoorden op veelgestelde vragen.'
      },
      {
        title: 'Implementeer structured data',
        description: 'Voeg JSON-LD markup toe (Organization, FAQ, Product) zodat AI-systemen je content beter kunnen begrijpen en citeren.'
      },
      {
        title: 'Versterk E-E-A-T signalen',
        description: 'Zorg voor duidelijke auteursinformatie, referenties naar betrouwbare bronnen en regelmatig bijgewerkte content om je autoriteit te vergroten.'
      },
      {
        title: 'Geef volledige antwoorden op zoekvragen',
        description: 'AI-systemen prefereren bronnen die direct en volledig antwoord geven. Incomplete antwoorden worden overgeslagen voor concurrenten die wel complete informatie bieden.'
      }
    ]

    recommendations.forEach((rec, i) => {
      children.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({ text: `${i + 1}. ${rec.title}`, bold: true, size: 24, font: 'Arial' }),
            new TextRun({ text: '  [Hoog]', size: 18, color: 'EF4444', bold: true, font: 'Arial' })
          ]
        }),
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 100 },
          children: [new TextRun({ text: rec.description, size: 20, font: 'Arial', color: '4B5563' })]
        })
      )
    })

    // FOMO
    children.push(
      spacer(300),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({
          text: 'Wacht niet te lang \u2014 elke dag zonder GEO-optimalisatie gaan potentiele klanten naar concurrenten die wel zichtbaar zijn in AI-antwoorden.',
          size: 22, color: 'DC2626', bold: true, font: 'Arial'
        })]
      })
    )

    // === FOOTER ===
    children.push(
      spacer(400),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '\u2500'.repeat(50), color: 'E5E7EB' })] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: 'Hulp nodig bij GEO-optimalisatie?', bold: true, size: 24, font: 'Arial' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Neem contact op: ', size: 20, font: 'Arial' }),
          new TextRun({ text: 'hallo@onlinelabs.nl', bold: true, size: 20, color: '6366F1', font: 'Arial' })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'onlinelabs.nl', size: 20, color: '6366F1', font: 'Arial' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Powered by ', size: 18, color: '999999', font: 'Arial' }),
          new TextRun({ text: 'teun.ai', bold: true, size: 18, color: '6366F1', font: 'Arial' })
        ]
      })
    )

    // === BUILD DOCUMENT ===
    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Arial', size: 22 } } },
        paragraphStyles: [
          {
            id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 32, bold: true, font: 'Arial', color: '1E1E3F' },
            paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 }
          }
        ]
      },
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: `GEO Rapport - ${companyName}`, font: 'Arial', size: 18, color: '94A3B8' })]
            })]
          })
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Pagina ', font: 'Arial', size: 18, color: '94A3B8' }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '94A3B8' })
              ]
            })]
          })
        },
        children
      }]
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="GEO-Rapport-${(companyName || 'rapport').replace(/\s+/g, '-')}.docx"`
      }
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
