import { NextResponse } from 'next/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  LevelFormat
} from 'docx'

// ============================================
// REPORT GENERATOR API - Creates Word Document
// ============================================

export async function POST(request) {
  try {
    const {
      companyName,
      companyWebsite,
      companyCategory,
      searchConsoleQueries,
      scannedPages,
      checklist,
      analysisResults
    } = await request.json()

    console.log(`📄 Generating report for: ${companyName}`)

    // Build document sections
    const children = []
    
    // ============================================
    // COVER PAGE
    // ============================================
    
    children.push(
      // Title
      new Paragraph({
        children: [
          new TextRun({ text: 'AI Visibility & SEO', size: 56, bold: true, color: '1E1E3F' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Technical Analysis', size: 36, color: '666666' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 }
      }),
      // Company name
      new Paragraph({
        children: [
          new TextRun({ text: companyName, size: 44, bold: true, color: '1E1E3F' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: companyWebsite || '', size: 24, color: '0066CC' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 }
      }),
      // Date & Author
      new Paragraph({
        children: [
          new TextRun({ text: `Teun.ai — ${new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`, size: 22, color: '888888' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Prepared by Teun.ai | GEO & AI Visibility Platform', size: 20, color: '888888' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      // Page break
      new Paragraph({ children: [new PageBreak()] })
    )

    // ============================================
    // EXECUTIVE SUMMARY
    // ============================================
    
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: 'Executive Summary', bold: true })]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Core Question: Is ${companyName} recommended by AI when potential customers search for a ${companyCategory}?`,
            italics: true,
            size: 24
          })
        ],
        spacing: { before: 200, after: 400 }
      })
    )
    
    // Score Card
    const score = analysisResults?.visibilityScore || 0
    const scoreColor = score >= 70 ? '22C55E' : score >= 40 ? 'F59E0B' : 'EF4444'
    
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Current Visibility Score', bold: true })]
      }),
      createScoreTable(score, scoreColor, analysisResults?.scores),
      new Paragraph({ spacing: { after: 300 } })
    )
    
    // Key Findings
    if (analysisResults?.findings?.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Key Findings', bold: true })]
        })
      )
      
      analysisResults.findings.forEach(finding => {
        const icon = finding.type === 'success' ? '✅' : finding.type === 'warning' ? '⚠️' : '🚨'
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${icon} ${finding.title}`, bold: true, size: 24 })
            ],
            spacing: { before: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: finding.description, size: 22 })],
            spacing: { after: 200 }
          })
        )
      })
    }
    
    children.push(new Paragraph({ children: [new PageBreak()] }))

    // ============================================
    // PAGE ANALYSIS
    // ============================================
    
    if (scannedPages?.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'Page Analysis', bold: true })]
        }),
        new Paragraph({
          children: [new TextRun({ text: `We analyzed ${scannedPages.filter(p => p.success).length} pages from your website.`, size: 22 })],
          spacing: { after: 300 }
        })
      )
      
      // Pages table
      children.push(createPagesTable(scannedPages))
      
      // Technical issues
      const allIssues = scannedPages
        .filter(p => p.success && p.contentAnalysis?.issues)
        .flatMap(p => p.contentAnalysis.issues.map(i => ({ ...i, page: p.url })))
      
      if (allIssues.length > 0) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Technical Issues Found', bold: true })]
          })
        )
        
        const criticalIssues = allIssues.filter(i => i.type === 'critical')
        const warningIssues = allIssues.filter(i => i.type === 'warning')
        
        if (criticalIssues.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `🚨 Critical Issues (${criticalIssues.length})`, bold: true, color: 'EF4444' })]
            })
          )
          criticalIssues.slice(0, 5).forEach(issue => {
            children.push(
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun({ text: issue.message, size: 22 })]
              })
            )
          })
        }
        
        if (warningIssues.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `⚠️ Warnings (${warningIssues.length})`, bold: true, color: 'F59E0B' })]
            })
          )
          warningIssues.slice(0, 5).forEach(issue => {
            children.push(
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun({ text: issue.message, size: 22 })]
              })
            )
          })
        }
      }
      
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    // ============================================
    // SEARCH CONSOLE ANALYSIS
    // ============================================
    
    if (searchConsoleQueries?.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'Search Console Query Analysis', bold: true })]
        }),
        new Paragraph({
          children: [new TextRun({ text: `Analyzed ${searchConsoleQueries.length} question-based queries from Search Console.`, size: 22 })],
          spacing: { after: 300 }
        })
      )
      
      // Show top queries
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Top Question Queries', bold: true })]
        })
      )
      
      searchConsoleQueries.slice(0, 15).forEach((query, i) => {
        children.push(
          new Paragraph({
            numbering: { reference: 'numbers', level: 0 },
            children: [new TextRun({ text: query, size: 22 })]
          })
        )
      })
      
      // Keyword gaps
      if (analysisResults?.keywordGaps?.length > 0) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Content Gaps Identified', bold: true })]
          }),
          new Paragraph({
            children: [new TextRun({ text: 'These queries from Search Console are not well-covered by your website content:', size: 22 })],
            spacing: { after: 200 }
          })
        )
        
        analysisResults.keywordGaps.slice(0, 10).forEach(gap => {
          children.push(
            new Paragraph({
              numbering: { reference: 'bullets', level: 0 },
              children: [
                new TextRun({ text: gap.query, bold: true, size: 22 }),
                new TextRun({ text: ` (${gap.matchRatio}% match)`, size: 20, color: '888888' })
              ]
            })
          )
        })
      }
      
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    // ============================================
    // AI VISIBILITY ANALYSIS
    // ============================================
    
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: 'AI Visibility Analysis', bold: true })]
      }),
      new Paragraph({
        children: [new TextRun({ text: 'We tested how AI platforms respond to queries that potential customers would ask.', size: 22 })],
        spacing: { after: 300 }
      })
    )
    
    // Existing scan results
    if (analysisResults?.existingScans) {
      const { perplexityCount, chatgptCount, totalMentions } = analysisResults.existingScans
      
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Previous Scan Results', bold: true })]
        })
      )
      
      if (perplexityCount > 0 || chatgptCount > 0) {
        children.push(
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [new TextRun({ text: `Perplexity scans: ${perplexityCount}`, size: 22 })]
          }),
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [new TextRun({ text: `ChatGPT scans: ${chatgptCount}`, size: 22 })]
          }),
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [new TextRun({ text: `Total mentions found: ${totalMentions}`, size: 22 })]
          })
        )
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'No previous AI visibility scans found. We recommend running Perplexity and ChatGPT scans to measure your current visibility.', size: 22, italics: true })],
            spacing: { after: 200 }
          })
        )
      }
    }
    
    // Super prompts
    if (analysisResults?.superPrompts?.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Commercial Prompts to Test', bold: true })]
        }),
        new Paragraph({
          children: [new TextRun({ text: 'These are high-intent queries that potential clients type into AI assistants:', size: 22 })],
          spacing: { after: 200 }
        })
      )
      
      analysisResults.superPrompts.slice(0, 15).forEach((prompt, i) => {
        children.push(
          new Paragraph({
            numbering: { reference: 'numbers', level: 0 },
            children: [new TextRun({ text: prompt, size: 22 })]
          })
        )
      })
    }
    
    children.push(new Paragraph({ children: [new PageBreak()] }))

    // ============================================
    // GEO CHECKLIST STATUS
    // ============================================
    
    if (checklist?.length > 0) {
      const totalItems = checklist.reduce((sum, s) => sum + s.items.length, 0)
      const checkedItems = checklist.reduce((sum, s) => sum + s.items.filter(i => i.checked).length, 0)
      const completionRate = Math.round((checkedItems / totalItems) * 100)
      
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'GEO Optimization Checklist', bold: true })]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Completion: ${checkedItems}/${totalItems} items (${completionRate}%)`, size: 24, bold: true })
          ],
          spacing: { after: 300 }
        })
      )
      
      checklist.forEach(section => {
        const sectionChecked = section.items.filter(i => i.checked).length
        const sectionTotal = section.items.length
        
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: `${section.name} `, bold: true }),
              new TextRun({ text: `(${sectionChecked}/${sectionTotal})`, color: '888888' })
            ]
          })
        )
        
        section.items.forEach(item => {
          const icon = item.checked ? '✅' : '❌'
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `${icon} ${item.text}`, size: 22 })],
              spacing: { before: 50 }
            })
          )
        })
      })
      
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    // ============================================
    // RECOMMENDATIONS
    // ============================================
    
    if (analysisResults?.recommendations?.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'Recommendations', bold: true })]
        })
      )
      
      const highPriority = analysisResults.recommendations.filter(r => r.priority === 'high')
      const mediumPriority = analysisResults.recommendations.filter(r => r.priority === 'medium')
      const lowPriority = analysisResults.recommendations.filter(r => r.priority === 'low')
      
      if (highPriority.length > 0) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '🔴 High Priority', bold: true, color: 'EF4444' })]
          })
        )
        highPriority.forEach(rec => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: rec.title, bold: true, size: 24 })]
            }),
            new Paragraph({
              children: [new TextRun({ text: rec.description, size: 22 })],
              spacing: { after: 200 }
            })
          )
        })
      }
      
      if (mediumPriority.length > 0) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '🟡 Medium Priority', bold: true, color: 'F59E0B' })]
          })
        )
        mediumPriority.forEach(rec => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: rec.title, bold: true, size: 24 })]
            }),
            new Paragraph({
              children: [new TextRun({ text: rec.description, size: 22 })],
              spacing: { after: 200 }
            })
          )
        })
      }
      
      if (lowPriority.length > 0) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '🟢 Low Priority', bold: true, color: '22C55E' })]
          })
        )
        lowPriority.forEach(rec => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: rec.title, bold: true, size: 24 })]
            }),
            new Paragraph({
              children: [new TextRun({ text: rec.description, size: 22 })],
              spacing: { after: 200 }
            })
          )
        })
      }
    }

    // ============================================
    // CREATE DOCUMENT
    // ============================================
    
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Arial', size: 24 }
          }
        },
        paragraphStyles: [
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: { size: 36, bold: true, font: 'Arial', color: '1E1E3F' },
            paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: { size: 28, bold: true, font: 'Arial', color: '333333' },
            paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 }
          }
        ]
      },
      numbering: {
        config: [
          {
            reference: 'bullets',
            levels: [{
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } }
            }]
          },
          {
            reference: 'numbers',
            levels: [{
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } }
            }]
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
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${companyName} - AI Visibility Analysis`, size: 18, color: '888888' })],
                alignment: AlignmentType.RIGHT
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Generated by Teun.ai | ', size: 18, color: '888888' }),
                  new TextRun({ text: 'Page ', size: 18, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' })
                ],
                alignment: AlignmentType.CENTER
              })
            ]
          })
        },
        children
      }]
    })

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${companyName.replace(/\s+/g, '_')}_GEO_Analysis.docx"`
      }
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createScoreTable(score, color, scores) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  const borders = { top: border, bottom: border, left: border, right: border }
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4500, 4500],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 4500, type: WidthType.DXA },
            shading: { fill: color, type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${score}%`, size: 72, bold: true, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER
              }),
              new Paragraph({
                children: [new TextRun({ text: 'AI Visibility Score', size: 24, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER
              })
            ]
          }),
          new TableCell({
            borders,
            width: { size: 4500, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Score Breakdown:', size: 22, bold: true })]
              }),
              new Paragraph({
                children: [new TextRun({ text: `• AI Scans: ${scores?.existingScans || 0}/25`, size: 20 })]
              }),
              new Paragraph({
                children: [new TextRun({ text: `• Content Quality: ${scores?.contentQuality || 0}/25`, size: 20 })]
              }),
              new Paragraph({
                children: [new TextRun({ text: `• Technical SEO: ${scores?.technicalSEO || 0}/25`, size: 20 })]
              }),
              new Paragraph({
                children: [new TextRun({ text: `• GEO Checklist: ${scores?.checklistCompletion || 0}/25`, size: 20 })]
              })
            ]
          })
        ]
      })
    ]
  })
}

function createPagesTable(pages) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  const borders = { top: border, bottom: border, left: border, right: border }
  
  const rows = [
    // Header row
    new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 5000, type: WidthType.DXA },
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Page', bold: true, size: 22 })] })]
        }),
        new TableCell({
          borders,
          width: { size: 2000, type: WidthType.DXA },
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Score', bold: true, size: 22 })] })]
        }),
        new TableCell({
          borders,
          width: { size: 2000, type: WidthType.DXA },
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Issues', bold: true, size: 22 })] })]
        })
      ]
    })
  ]
  
  // Data rows
  pages.filter(p => p.success).slice(0, 10).forEach(page => {
    const score = page.contentAnalysis?.score || 0
    const issues = page.contentAnalysis?.issues?.length || 0
    const scoreColor = score >= 70 ? '22C55E' : score >= 40 ? 'F59E0B' : 'EF4444'
    
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 5000, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: page.title || page.url, size: 20 })]
              })
            ]
          }),
          new TableCell({
            borders,
            width: { size: 2000, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${score}%`, size: 22, bold: true, color: scoreColor })]
              })
            ]
          }),
          new TableCell({
            borders,
            width: { size: 2000, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${issues}`, size: 22 })]
              })
            ]
          })
        ]
      })
    )
  })
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [5000, 2000, 2000],
    rows
  })
}
