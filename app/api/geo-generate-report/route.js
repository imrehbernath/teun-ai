import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, Header, Footer, PageNumber, LevelFormat
} from 'docx'

// Teun.ai brand colors
const COLORS = {
  primary: '4F46E5',    // Indigo
  secondary: '7C3AED',  // Purple
  success: '10B981',    // Green
  warning: 'F59E0B',    // Amber
  danger: 'EF4444',     // Red
  dark: '1E293B',       // Slate 800
  light: 'F1F5F9',      // Slate 100
  white: 'FFFFFF',
}

function getScoreColor(score) {
  if (score >= 80) return COLORS.success
  if (score >= 60) return COLORS.warning
  if (score >= 40) return 'F97316' // Orange
  return COLORS.danger
}

function createStyledParagraph(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment || AlignmentType.LEFT,
    spacing: { after: options.spacing || 200 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: options.size || 24, // 12pt
        bold: options.bold || false,
        color: options.color || COLORS.dark,
      })
    ]
  })
}

function createHeading(text, level = 1) {
  const sizes = { 1: 36, 2: 30, 3: 26 }
  const colors = { 1: COLORS.primary, 2: COLORS.secondary, 3: COLORS.dark }
  
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: level === 1 ? 400 : 300, after: 200 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: sizes[level],
        bold: true,
        color: colors[level],
      })
    ]
  })
}

function createScoreBox(label, score, width = 4680) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
  const borders = { top: border, bottom: border, left: border, right: border }
  
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: getScoreColor(score), type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: label, font: 'Arial', size: 20, color: COLORS.white }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        children: [
          new TextRun({ text: `${score}`, font: 'Arial', size: 48, bold: true, color: COLORS.white }),
        ]
      }),
    ]
  })
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      companyName, 
      companyWebsite, 
      companyCategory, 
      matches, 
      scanResults, 
      aiResults, 
      overallScore,
      manualChecks 
    } = await request.json()

    const today = new Date().toLocaleDateString('nl-NL', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })

    // Build document sections
    const children = []

    // Title Page
    children.push(
      new Paragraph({ spacing: { after: 400 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: 'GEO ANALYSE RAPPORT', font: 'Arial', size: 56, bold: true, color: COLORS.primary }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [
          new TextRun({ text: companyName, font: 'Arial', size: 40, color: COLORS.dark }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `Gegenereerd op ${today}`, font: 'Arial', size: 22, color: '64748B' }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        children: [
          new TextRun({ text: `Website: ${companyWebsite}`, font: 'Arial', size: 22, color: '64748B' }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        children: [
          new TextRun({ text: `Branche: ${companyCategory}`, font: 'Arial', size: 22, color: '64748B' }),
        ]
      }),
      new Paragraph({ children: [new PageBreak()] })
    )

    // Score Overview
    children.push(
      createHeading('Samenvatting Scores', 1),
      createStyledParagraph('Dit rapport bevat een complete analyse van je AI zichtbaarheid en GEO optimalisatie.'),
    )

    // Score boxes table
    if (overallScore) {
      const scoreBorder = { style: BorderStyle.NONE, size: 0, color: COLORS.white }
      const scoreBorders = { top: scoreBorder, bottom: scoreBorder, left: scoreBorder, right: scoreBorder }
      
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [3120, 3120, 3120],
          rows: [
            new TableRow({
              children: [
                createScoreBox('AI Visibility', overallScore.aiVisibility, 3120),
                createScoreBox('GEO Score', overallScore.geo, 3120),
                createScoreBox('Totaal', overallScore.overall, 3120),
              ]
            })
          ]
        }),
        new Paragraph({ spacing: { after: 400 } })
      )
    }

    // AI Visibility Results
    children.push(
      createHeading('AI Visibility Resultaten', 1),
      createStyledParagraph(`We hebben ${aiResults?.length || 0} zoekwoorden getest om te zien of ${companyName} wordt vermeld door AI assistenten.`),
    )

    if (aiResults && aiResults.length > 0) {
      const mentionedCount = aiResults.filter(r => r.mentioned).length
      const notMentionedCount = aiResults.length - mentionedCount
      
      children.push(
        createStyledParagraph(`✓ Vermeld: ${mentionedCount} van ${aiResults.length} zoekwoorden (${Math.round((mentionedCount / aiResults.length) * 100)}%)`, { bold: true, color: COLORS.success }),
        createStyledParagraph(`✗ Niet vermeld: ${notMentionedCount} zoekwoorden`, { color: COLORS.danger }),
        new Paragraph({ spacing: { after: 200 } }),
      )

      // Results table
      const border = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
      const borders = { top: border, bottom: border, left: border, right: border }
      
      const headerRow = new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            borders,
            width: { size: 5500, type: WidthType.DXA },
            shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Zoekwoord', font: 'Arial', size: 22, bold: true, color: COLORS.white })] })]
          }),
          new TableCell({
            borders,
            width: { size: 1800, type: WidthType.DXA },
            shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Status', font: 'Arial', size: 22, bold: true, color: COLORS.white })] })]
          }),
          new TableCell({
            borders,
            width: { size: 2060, type: WidthType.DXA },
            shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'Concurrenten', font: 'Arial', size: 22, bold: true, color: COLORS.white })] })]
          }),
        ]
      })

      const dataRows = aiResults.map((result, i) => {
        const bgColor = i % 2 === 0 ? COLORS.white : COLORS.light
        return new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 5500, type: WidthType.DXA },
              shading: { fill: bgColor, type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: result.query, font: 'Arial', size: 20, color: COLORS.dark })] })]
            }),
            new TableCell({
              borders,
              width: { size: 1800, type: WidthType.DXA },
              shading: { fill: result.mentioned ? 'DCFCE7' : 'FEE2E2', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: result.mentioned ? '✓ Ja' : '✗ Nee', font: 'Arial', size: 20, bold: true, color: result.mentioned ? COLORS.success : COLORS.danger })] })]
            }),
            new TableCell({
              borders,
              width: { size: 2060, type: WidthType.DXA },
              shading: { fill: bgColor, type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: result.competitors?.slice(0, 3).join(', ') || '-', font: 'Arial', size: 18, color: '64748B' })] })]
            }),
          ]
        })
      })

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [5500, 1800, 2060],
          rows: [headerRow, ...dataRows]
        }),
        new Paragraph({ children: [new PageBreak()] })
      )
    }

    // GEO Scan Results
    children.push(
      createHeading('GEO Optimalisatie per Pagina', 1),
      createStyledParagraph('Hieronder de GEO checklist resultaten per gescande pagina.'),
    )

    if (scanResults && Object.keys(scanResults).length > 0) {
      for (const [pageUrl, result] of Object.entries(scanResults)) {
        const shortUrl = pageUrl.replace(/^https?:\/\//, '').substring(0, 60)
        
        children.push(
          createHeading(shortUrl, 2),
          createStyledParagraph(`Score: ${result.score}/100`, { bold: true, color: getScoreColor(result.score) }),
        )

        if (result.issues && result.issues.length > 0) {
          children.push(
            createStyledParagraph('Verbeterpunten:', { bold: true }),
          )
          
          result.issues.forEach(issue => {
            children.push(
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun({ text: issue, font: 'Arial', size: 22, color: COLORS.dark })]
              })
            )
          })
        }
        
        children.push(new Paragraph({ spacing: { after: 300 } }))
      }
    }

    // Recommendations
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      createHeading('Aanbevelingen', 1),
    )

    // Generate recommendations based on results
    const recommendations = []
    
    if (overallScore?.aiVisibility < 50) {
      recommendations.push('Verhoog je AI zichtbaarheid door je bedrijfsnaam vaker te vermelden in content')
      recommendations.push('Creëer content die direct antwoord geeft op veelgestelde vragen in je branche')
    }
    
    if (overallScore?.geo < 60) {
      recommendations.push('Voeg JSON-LD structured data toe aan je pagina\'s')
      recommendations.push('Zorg voor complete meta descriptions op alle belangrijke pagina\'s')
      recommendations.push('Implementeer FAQ schema markup')
    }

    const notMentioned = aiResults?.filter(r => !r.mentioned) || []
    if (notMentioned.length > 0) {
      recommendations.push(`Focus op content optimalisatie voor: ${notMentioned.slice(0, 3).map(r => r.query).join(', ')}`)
    }

    if (recommendations.length > 0) {
      recommendations.forEach((rec, i) => {
        children.push(
          new Paragraph({
            numbering: { reference: 'numbers', level: 0 },
            spacing: { after: 150 },
            children: [new TextRun({ text: rec, font: 'Arial', size: 24, color: COLORS.dark })]
          })
        )
      })
    } else {
      children.push(createStyledParagraph('Je scoort goed! Blijf je content regelmatig updaten en monitoren.'))
    }

    // Footer with Teun.ai branding
    children.push(
      new Paragraph({ spacing: { before: 800 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '─'.repeat(40), font: 'Arial', size: 20, color: 'CBD5E1' }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [
          new TextRun({ text: 'Gegenereerd door ', font: 'Arial', size: 20, color: '64748B' }),
          new TextRun({ text: 'Teun.ai', font: 'Arial', size: 20, bold: true, color: COLORS.primary }),
          new TextRun({ text: ' - AI Visibility Platform', font: 'Arial', size: 20, color: '64748B' }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 50 },
        children: [
          new TextRun({ text: 'www.teun.ai', font: 'Arial', size: 18, color: COLORS.primary }),
        ]
      }),
    )

    // Create document
    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Arial', size: 24 } } },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 36, bold: true, font: 'Arial', color: COLORS.primary },
            paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 30, bold: true, font: 'Arial', color: COLORS.secondary },
            paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 1 } },
          { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 26, bold: true, font: 'Arial', color: COLORS.dark },
            paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
        ]
      },
      numbering: {
        config: [
          { reference: 'bullets',
            levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
          { reference: 'numbers',
            levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
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
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `GEO Rapport - ${companyName}`, font: 'Arial', size: 18, color: '94A3B8' }),
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Pagina ', font: 'Arial', size: 18, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '94A3B8' }),
                ]
              })
            ]
          })
        },
        children
      }]
    })

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="GEO-Rapport-${companyName.replace(/\s+/g, '-')}.docx"`,
      }
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
