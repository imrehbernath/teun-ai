// app/api/ai-visibility-analysis/route.js
// ✅ ULTIMATE VERSION - Best of Gemini + Claude + Natural Questions
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { canUserScan, trackScan, BETA_CONFIG } from '@/lib/beta-config'
import Anthropic from '@anthropic-ai/sdk'

// ✅ Slack notificatie functie
async function sendSlackNotification(scanData) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('⚠️ Slack webhook URL niet geconfigureerd');
    return;
  }

  try {
    const { companyName, companyCategory, primaryKeyword, totalMentions } = scanData;

    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎯 Nieuwe AI Visibility Scan!",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Bedrijfsnaam:*\n${companyName}`
            },
            {
              type: "mrkdwn",
              text: `*Categorie:*\n${companyCategory}`
            },
            {
              type: "mrkdwn",
              text: `*Zoekwoord:*\n${primaryKeyword || 'Geen opgegeven'}`
            },
            {
              type: "mrkdwn",
              text: `*Score:*\n${totalMentions} vermeldingen`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `${new Date().toLocaleString('nl-NL')}`
            }
          ]
        },
        {
          type: "divider"
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      console.error('❌ Slack notificatie mislukt:', response.statusText);
    } else {
      console.log('✅ Slack notificatie verstuurd');
    }
  } catch (error) {
    console.error('❌ Slack notificatie error:', error);
  }
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      companyName, 
      companyCategory, 
      identifiedQueriesSummary,
      userId,
      numberOfPrompts = 5,
      customTerms = null
    } = body

    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: 'Bedrijfsnaam is verplicht' }, 
        { status: 400 }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'

    const supabase = await createServiceClient()

    const scanCheck = await canUserScan(
      supabase,
      userId,
      'ai-visibility',
      ip
    )

    if (!scanCheck.allowed) {
      return NextResponse.json(
        { 
          error: scanCheck.message,
          scansRemaining: scanCheck.scansRemaining || 0,
          cooldownMinutes: scanCheck.cooldownMinutes,
          upgradeAvailable: !userId,
          waitlistEnabled: userId && scanCheck.scansRemaining === 0
        },
        { status: 403 }
      )
    }

    console.log('🤖 Step 1: Generating AI prompts...')
    
    const promptGenerationResult = await generatePromptsWithClaude(
      companyName,
      companyCategory,
      identifiedQueriesSummary || [],
      customTerms
    )

    if (!promptGenerationResult.success) {
      return NextResponse.json(
        { error: promptGenerationResult.error },
        { status: 500 }
      )
    }

    const generatedPrompts = promptGenerationResult.prompts
    console.log(`✅ Generated ${generatedPrompts.length} prompts`)
    
    const analysisLimit = numberOfPrompts
    const promptsToAnalyze = generatedPrompts.slice(0, analysisLimit)
    
    console.log(`🔍 Step 2: Analyzing ${promptsToAnalyze.length} prompts (limit: ${analysisLimit})...`)
    
    const analysisResults = []
    let totalCompanyMentions = 0

    for (let i = 0; i < promptsToAnalyze.length; i++) {
      const prompt = promptsToAnalyze[i]
      console.log(`   Analyzing prompt ${i + 1}/${promptsToAnalyze.length}...`)
      
      const result = await analyzeWithPerplexity(prompt, companyName)
      
      analysisResults.push({
        ai_prompt: prompt,
        ...(result.success ? result.data : {
          company_mentioned: false,
          mentions_count: 0,
          competitors_mentioned: [],
          simulated_ai_response_snippet: result.error || 'Analyse mislukt',
          error: result.error
        })
      })
      
      if (result.success && result.data.company_mentioned) {
        totalCompanyMentions++
      }

      console.log(`   ${result.success ? '✅' : '⚠️'} Prompt ${i + 1} ${result.success ? 'analyzed' : 'failed'}`)

      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log(`✅ Analysis complete. Company mentioned ${totalCompanyMentions} times.`)

    const scanDuration = Date.now() - startTime

    await trackScan(
      supabase,
      userId,
      'ai-visibility',
      ip,
      { companyName, companyCategory, identifiedQueriesSummary },
      { generatedPrompts, analysisResults, totalCompanyMentions },
      scanDuration
    )

    sendSlackNotification({
      companyName,
      companyCategory,
      primaryKeyword: identifiedQueriesSummary?.[0] || null,
      totalMentions: totalCompanyMentions
    }).catch(err => console.error('Slack notificatie fout:', err));

    const updatedCheck = await canUserScan(supabase, userId, 'ai-visibility', ip)

    return NextResponse.json({
      generated_prompts: generatedPrompts,
      analysis_results: analysisResults,
      total_company_mentions: totalCompanyMentions,
      meta: {
        scansRemaining: updatedCheck.scansRemaining,
        isAuthenticated: !!userId,
        analysisLimit: analysisLimit,
        scanDurationMs: scanDuration,
        betaMessage: userId 
          ? `Je hebt nog ${updatedCheck.scansRemaining} scans deze maand!` 
          : `Maak een gratis account voor ${BETA_CONFIG.TOOLS['ai-visibility'].limits.authenticated} scans per maand`
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: 'Server error bij AI-analyse' },
      { status: 500 }
    )
  }
}

// ============================================
// ✨ ULTIMATE PROMPT GENERATION
// Best of Gemini + Claude + Natural Language
// ============================================
async function generatePromptsWithClaude(
  companyName, 
  companyCategory, 
  queries,
  customTerms = null
) {
  const primaryKeyword = queries.length > 0 ? queries[0] : null
  
  // ============================================
  // ✨ STRICTER CUSTOM TERMS
  // ============================================
  let customTermsInstruction = '';
  
  if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
    customTermsInstruction = `

**🚨 KRITIEKE GEBRUIKERSINSTRUCTIES - ABSOLUUT VERPLICHT:**
`;

    if (customTerms.exclude?.length > 0) {
      customTermsInstruction += `

**❌ ABSOLUUT VERBODEN - GEBRUIK DEZE WOORDEN NOOIT:**
${customTerms.exclude.map(term => `- "${term}"`).join('\n')}

🚨 KRITIEK: Deze termen zijn STRIKT VERBODEN. Als je ook maar ÉÉN van deze woorden gebruikt, is de output INCORRECT. 
Controleer elke vraag dubbel voordat je antwoordt. GEEN ENKELE vraag mag deze woorden bevatten.

**VOORBEELDEN VAN VERBODEN VRAGEN:**
${customTerms.exclude.slice(0, 3).map(term => 
  `❌ "Welke ${term} bedrijven zijn er?" → FOUT! Bevat verboden woord "${term}"`
).join('\n')}
`;
    }

    if (customTerms.include?.length > 0) {
      customTermsInstruction += `

**✅ VERPLICHT TE GEBRUIKEN - HOGE PRIORITEIT:**
${customTerms.include.map(term => `- "${term}"`).join('\n')}

🎯 DOEL: Minimaal 7 van de 10 vragen MOETEN één of meer van deze termen bevatten.
Dit is een HARDE VEREISTE. Als je minder dan 7 vragen met deze termen hebt, is de output INCORRECT.

**GEBRUIK DEZE TERMEN OP EEN NATUURLIJKE MANIER:**
${customTerms.include.slice(0, 3).map(term => 
  `✅ "Kun je ${term} bedrijven aanbevelen?" → CORRECT! Natuurlijk gebruik
✅ "Welke ${term} bureaus zijn er?" → CORRECT! Natuurlijk geïntegreerd`
).join('\n')}

**NIET ZO (geforceerd):**
❌ "Welke bedrijven bieden ${customTerms.include[0]} diensten?" → TE GEFORCEERD!
❌ "Waar vind ik ${customTerms.include[0]} werk?" → ONNATUURLIJK!
`;
    }

    if (customTerms.location?.length > 0) {
      customTermsInstruction += `

**📍 VERPLICHTE LOCATIE-FOCUS:**
${customTerms.location.map(term => `- "${term}"`).join('\n')}

🚨 KRITIEK: Minimaal 6 van de 10 vragen MOETEN één van deze EXACTE locatietermen bevatten.

**BELANGRIJKE LOCATIEREGELS:**
- Als gebruiker "Amsterdam" specificeert: ALLEEN Amsterdam gebruiken, GEEN "Nederland" of "Belgie"
- Als gebruiker "landelijk actief" specificeert: Dat MAG gebruikt worden
- Als gebruiker GEEN landelijke term specificeert: GEEN brede termen zoals "Nederland", "Belgie", "landelijk"
- Wees SPECIFIEK naar de opgegeven locaties

**VERBODEN LOCATIE-ALTERNATIEVEN:**
${customTerms.location.some(t => t.toLowerCase().includes('amsterdam') || t.toLowerCase().includes('rotterdam') || t.toLowerCase().includes('utrecht') || t.toLowerCase().includes('den haag') || t.toLowerCase().includes('eindhoven')) ? `
❌ "Nederland" - Te breed, gebruiker wil specifieke stad
❌ "Belgie" - Helemaal verkeerde land!
❌ "landelijk" - Te breed, tenzij expliciet opgegeven
❌ "heel Nederland" - Te breed
❌ "nationale" - Te breed
` : ''}

**CORRECTE LOCATIE VOORBEELDEN:**
${customTerms.location.slice(0, 2).map(term => 
  `✅ "Kun je bedrijven in ${term} aanbevelen?" → CORRECT! Natuurlijk gebruik
✅ "Welke ${term} bedrijven zijn er?" → CORRECT! Specifieke locatie`
).join('\n')}
`;
    }

    customTermsInstruction += `

**🎯 VALIDATIE CHECKLIST (Controleer ELKE vraag):**
${customTerms.exclude?.length > 0 ? `
1. ❌ Bevat GEEN enkele verboden term: ${customTerms.exclude.join(', ')}
` : ''}
${customTerms.include?.length > 0 ? `
2. ✅ Minimaal 7/10 vragen bevatten NATUURLIJK: ${customTerms.include.join(', ')}
` : ''}
${customTerms.location?.length > 0 ? `
3. 📍 Minimaal 6/10 vragen bevatten EXACT: ${customTerms.location.join(', ')}
   (GEEN alternatieven zoals "Nederland" of "Belgie" als stad opgegeven is!)
` : ''}

Als je niet aan AL deze eisen voldoet, begin dan OPNIEUW.
`;
  }
  
  // ============================================
  // KEYWORD CONTEXT
  // ============================================
  const searchConsoleContext = queries.length > 0 
    ? `

**ZOEKWOORDEN ANALYSE:**
Analyseer de context van deze belangrijke zoekwoorden om de relevantie van de gegenereerde vragen te optimaliseren.
    
**BELANGRIJKSTE ZOEKWOORD (HOOFDFOCUS):** "${primaryKeyword}"

**AANVULLENDE ZOEKWOORDEN:**
${queries.slice(1).map(q => `- "${q}"`).join('\n') || 'Geen aanvullende zoekwoorden'}

**🎯 GEBRUIK ZOEKWOORDEN NATUURLIJK - FOCUS OP INTENTIE:**

Zoekwoorden geven CONTEXT over wat mensen zoeken. Gebruik ze als INSPIRATIE voor natuurlijke vragen die leiden tot concrete bedrijfsnamen.

${primaryKeyword ? `
**CONTEXT VOOR "${primaryKeyword}":**
Mensen die dit zoeken willen concrete bedrijven/dienstverleners vinden.

**NATUURLIJKE PATRONEN (zo moet het):**
- "Kun je bedrijven aanbevelen die..."
- "Welke zijn de beste bureaus voor..."
- "Geef voorbeelden van bedrijven met..."
- "Lijst bureaus op die gespecialiseerd zijn in..."

**GEFORCEERD (zo NIET):**
- "Welke bedrijven bieden ${primaryKeyword} diensten?" → TE ROBOT-ACHTIG!
- "Waar vind ik ${primaryKeyword} werk?" → ONNATUURLIJK!
` : ''}

**KRITIEKE INSTRUCTIE:** 
- Alle 10 prompts MOETEN direct gerelateerd zijn aan de opgegeven zoekwoorden
- Focus op de INTENTIE: mensen willen concrete bedrijven vinden
- Blijf binnen de context van wat de klant zoekt`
    : ''

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `Jij genereert commerciële, klantgerichte B2B-zoekvragen die gericht zijn op het vinden van **specifieke bedrijven of organisaties** (geen grote consumentenmerken).

**ABSOLUTE PRIORITEITEN:**
1. **NATUURLIJKHEID**: Vragen klinken als ECHTE MENSEN
2. **COMMERCIEEL**: Start idealiter met verzoek om concrete bedrijfsnamen
3. **BEDRIJFSNEUTRAAL**: Vermeld NIET de naam of exacte categorie van het geanalyseerde bedrijf
4. **B2B FOCUS**: Gericht op dienstverleners, GEEN consumentenmerken
5. **NEDERLANDS**: ALTIJD en UITSLUITEND Nederlands, GEEN Engels

**VERBODEN:**
- Vragen die starten met "Waar kan ik vinden...", "Welke specialist..."
- Geforceerde keyword-combinaties ("SEO specialist diensten")
- Robot-taal ("services", overmatig "werk", "diensten")
- Letterlijke zoekwoord-plakking
- Vragen die leiden tot algemeen zoekadvies in plaats van bedrijfsnamen

**VERPLICHT:**
- Vragen die DIRECT om bedrijfsnamen vragen
- Natuurlijke menselijke taal
- Variatie in structuur
- Focus op concrete aanbevelingen

${customTermsInstruction}`,
      messages: [{
        role: 'user',
        content: `Genereer 10 zeer specifieke, commercieel relevante zoekvragen die een potentiële B2B-klant zou stellen om **concrete, lokale/nationale bedrijven of leveranciers** te vinden.

**CONTEXT:**
- Bedrijfscategorie: "${companyCategory}"
- Zoek naar bedrijven die vergelijkbare diensten leveren
- Focus op Nederlandse markt

**🚨 KRITIEKE REGEL: BEDRIJFSNEUTRALITEIT**
De vragen moeten **algemeen en bedrijfsneutraal** zijn:
- Vermeld NIET de naam "${companyName}"
- Gebruik NIET letterlijk "${companyCategory}" (gebruik synoniemen/variaties)
- Focus op het TYPE dienst/product, niet op specifieke merknamen

${searchConsoleContext}

**🎯 IDEALE START-PATRONEN (gebruik deze veel):**

Start elke vraag IDEALITER met een direct verzoek om concrete bedrijfsnamen:

✅ **COMMERCIAL PATTERNS (zo moet het):**
- "Kun je een aantal **bedrijven** noemen die..."
- "Welke zijn de top **bureaus** die gespecialiseerd zijn in..."
- "Geef voorbeelden van gerenommeerde **bedrijven** voor..."
- "Lijst aanbevolen **leveranciers** op van..."
- "Welke **bedrijven** hebben bewezen expertise in..."
- "Ken je **bureaus** met uitstekende reviews voor..."
- "Wat zijn de beste **leveranciers** voor..."
- "Heb je tips voor **bedrijven** die..."

**LET OP:** Gebruik VARIATIE! Wissel af tussen:
- bedrijven / bureaus / leveranciers / aanbieders
- Kun je... / Welke... / Geef... / Lijst... / Ken je... / Wat zijn...

❌ **VERMIJD (niet commercieel genoeg):**
- "Waar kan ik vinden..." → Leidt tot zoekadvies, niet bedrijfsnamen
- "Welke specialist..." → Te algemeen
- "Hoe vind ik..." → Zoekadvies in plaats van bedrijven
- Vragen zonder focus op concrete bedrijfsnamen

${customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0) ? `

**🚨 GEBRUIKERSVEREISTEN - TOPPRIORITEIT:**

${customTerms.exclude?.length > 0 ? `
❌ **VERMIJD ABSOLUUT:** ${customTerms.exclude.join(', ')}
` : ''}

${customTerms.include?.length > 0 ? `
✅ **GEBRUIK NATUURLIJK (7+ van 10):** ${customTerms.include.join(', ')}

Voorbeelden:
✅ "Kun je ${customTerms.include[0]} bedrijven aanbevelen..."
✅ "Welke ${customTerms.include[0]} bureaus zijn er..."
❌ "Welke bedrijven bieden ${customTerms.include[0]} diensten..." (geforceerd!)
` : ''}

${customTerms.location?.length > 0 ? `
📍 **LOCATIE (6+ van 10):** ${customTerms.location.join(', ')}

GEBRUIK ALLEEN DEZE EXACTE LOCATIES!
✅ "Kun je bedrijven in ${customTerms.location[0]} noemen..."
❌ "bedrijven in Nederland..." (te breed als stad gegeven!)
` : ''}
` : ''}

**KRITIEKE VEREISTEN:**

1. **Commerciële focus:** Vragen leiden tot concrete bedrijfsnamen
2. **Natuurlijke taal:** Klinkt als echte mensen, geen robot
3. **Bedrijfsneutraal:** Geen "${companyName}" of exacte "${companyCategory}"
4. **Variatie:** Verschillende startwoorden en structuren
5. **B2B gericht:** Dienstverleners, GEEN consumentenmerken (Lego, McDonald's, etc.)
6. **Specifieke zoekintentie:** Focus op vinden van passende aanbieders

**SLUIT EXPLICIET UIT:**
- Zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple, Samsung, Lego, McDonald's, etc.)
- Grote tech-platforms (Google, Facebook, YouTube, Amazon)
- SEO/Marketing tools (Semrush, Ahrefs, Mailchimp)
- Social media platforms
- Zoekmachines

**OUTPUT FORMAAT:**
Exact 10 natuurlijke, commerciële vragen als JSON array.
ALLEEN de array, geen extra tekst.
ALTIJD in het Nederlands, GEEN Engels.

["Vraag 1", "Vraag 2", ..., "Vraag 10"]`
      }]
    })

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const prompts = JSON.parse(cleanedText)

    if (!Array.isArray(prompts) || prompts.length !== 10) {
      throw new Error('Invalid prompt format from AI')
    }

    // ============================================
    // ✅ VALIDATION
    // ============================================
    if (customTerms && (customTerms.exclude?.length > 0 || customTerms.include?.length > 0 || customTerms.location?.length > 0)) {
      const promptsWithExcluded = prompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.exclude?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length
      
      const promptsWithIncluded = prompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.include?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const promptsWithLocation = prompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return customTerms.location?.some(term => lowerPrompt.includes(term.toLowerCase()))
      }).length

      const hasForbiddenGeographic = customTerms.location?.some(t => 
        !t.toLowerCase().includes('landelijk') && 
        !t.toLowerCase().includes('nederland') &&
        !t.toLowerCase().includes('nationaal')
      ) ? prompts.filter(prompt => {
        const lowerPrompt = prompt.toLowerCase()
        return lowerPrompt.includes('nederland') || 
               lowerPrompt.includes('belgie') || 
               lowerPrompt.includes('belgië') ||
               (lowerPrompt.includes('landelijk') && !customTerms.location.some(t => t.toLowerCase().includes('landelijk')))
      }).length : 0

      console.log(`✅ Custom terms validation:`)
      console.log(`   - ${promptsWithExcluded}/10 prompts contain excluded terms (target: 0)`)
      if (customTerms.include?.length > 0) {
        console.log(`   - ${promptsWithIncluded}/10 prompts contain included terms (target: 7+)`)
      }
      if (customTerms.location?.length > 0) {
        console.log(`   - ${promptsWithLocation}/10 prompts contain location terms (target: 6+)`)
        console.log(`   - ${hasForbiddenGeographic}/10 prompts contain forbidden geographic terms (target: 0)`)
      }
      
      if (promptsWithExcluded > 0) {
        console.warn(`⚠️ WARNING: ${promptsWithExcluded} prompts contain EXCLUDED terms!`)
      }
      if (customTerms.include?.length > 0 && promptsWithIncluded < 7) {
        console.warn(`⚠️ WARNING: Only ${promptsWithIncluded}/10 prompts contain included terms (target: 7+)`)
      }
      if (customTerms.location?.length > 0 && promptsWithLocation < 6) {
        console.warn(`⚠️ WARNING: Only ${promptsWithLocation}/10 prompts contain location terms (target: 6+)`)
      }
      if (hasForbiddenGeographic > 0) {
        console.warn(`🚨 CRITICAL: ${hasForbiddenGeographic} prompts contain FORBIDDEN geographic terms!`)
      }
    }

    return { success: true, prompts }
  } catch (error) {
    console.error('AI Prompt Generation Error:', error)
    return { success: false, error: 'Fout bij promptgeneratie' }
  }
}

// ============================================
// ✨ ULTIMATE PERPLEXITY - "AI Overview Simulator"
// ============================================
async function analyzeWithPerplexity(prompt, companyName) {
  try {
    const response = await fetch(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: `Jij bent een geavanceerd AI-model getraind op een brede dataset van webcontent, inclusief bedrijfsinformatie, reviews, technische documentatie en compliance.

**JOUW TAAK:**
Simuleer hoe een AI Overview of geavanceerde chatbot zou reageren op de zoekopdracht. Genereer een beknopt, gesimuleerd AI-antwoord als een directe reactie.

**🚨 ABSOLUTE REGELS - GEEN UITZONDERINGEN:**

1. **TAAL: 100% NEDERLANDS**
   - ELKE LETTER moet Nederlands zijn
   - GEEN ENKELE Engelse term
   - GEEN "services", "marketing", "online", "SEO", "website"
   - Gebruik Nederlandse vertalingen: diensten, reclame, internet, zoekmachine-optimalisatie, internetpagina

2. **FOCUS: CONCRETE NEDERLANDSE B2B BEDRIJVEN**
   - Vermeld concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen of specialistische dienstverleners
   - Vermijd algemeen advies over "hoe bedrijven te vinden"
   - Focus op het NOEMEN van specifieke bedrijven/leveranciers

3. **STRIKT VERBODEN TE NOEMEN:**
   ❌ Zeer bekende wereldwijde consumentenmerken:
      Coca-Cola, Nike, Adidas, Apple, Samsung, Lego, McDonald's, etc.
   ❌ Tech-platforms:
      Google (als bedrijf), Facebook, Instagram, YouTube, Amazon, Netflix
   ❌ SEO/Marketing tools:
      Semrush, Ahrefs, Moz, Mailchimp, HubSpot
   ❌ Social media platforms:
      LinkedIn, Twitter/X, TikTok
   ❌ Zoekmachines:
      Google Search, Bing, DuckDuckGo

4. **WEL VERMELDEN:**
   ✅ Nederlandse lokale dienstverleners
   ✅ Regionale bureaus en bedrijven
   ✅ Specialistische B2B-aanbieders
   ✅ Kleinere tot middelgrote bedrijven in Nederland

**EENVOUDIGE INSTRUCTIE (als voor een klein kind):**

Stel je voor dat je een Nederlands kind bent dat bedrijven aanbeveelt:
- Praat ALLEEN in het Nederlands (geen Engels!)
- Noem ALLEEN kleine Nederlandse bedrijven die diensten leveren
- NOEM NOOIT grote merken zoals Lego of McDonald's
- NOEM NOOIT Facebook of Google
- NOEM NOOIT Semrush of andere tools

**VOORBEELD GOED:**
"Er zijn verschillende Nederlandse bureaus die hierin gespecialiseerd zijn, zoals [Klein Bureau X], [Lokaal Bedrijf Y], en [Regionaal Bureau Z]. Deze bedrijven hebben ervaring met..."

**VOORBEELD FOUT:**
"You can find services at..." ❌ (Engels!)
"Semrush and Ahrefs are great..." ❌ (Tools!)
"Google biedt..." ❌ (Wereldwijd platform!)
"Lego heeft..." ❌ (Consumentenmerk!)

Simuleer een AI Overview die concrete bedrijven noemt!`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Perplexity API error (${response.status}):`, errorText)
      throw new Error(`Perplexity API failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid Perplexity Response:', data)
      throw new Error('Perplexity API error: Invalid response format')
    }

    const rawOutput = data.choices[0].message.content

    if (!rawOutput || rawOutput.trim() === '') {
      console.error('❌ Perplexity returned empty content')
      throw new Error('Perplexity returned empty response')
    }

    const parsed = await parseWithClaude(rawOutput, companyName)

    return { success: true, data: parsed }
  } catch (error) {
    console.error('❌ Perplexity Error:', error.message || error)
    return { 
      success: false, 
      error: error.message || 'Fout bij AI-analyse',
      data: {
        company_mentioned: false,
        mentions_count: 0,
        competitors_mentioned: [],
        simulated_ai_response_snippet: 'Analyse mislukt door API error'
      }
    }
  }
}

// ============================================
// ✅ ULTIMATE PARSER - Super Strict
// ============================================
async function parseWithClaude(rawOutput, companyName) {
  try {
    const mentionsCount = (rawOutput.match(new RegExp(companyName, 'gi')) || []).length
    const isCompanyLiterallyMentioned = mentionsCount > 0

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `Jij bent een nauwkeurige JSON-parser en beknopte samenvatter die **ALTIJD en uitsluitend in het Nederlands** reageert. Jouw output mag GEEN ENKELE Engelse term bevatten. Verwijder alle mogelijke Engelse termen uit de tekst of vervang ze door hun Nederlandse equivalenten.

Jouw taak is om de gegeven tekst te analyseren en daaruit de gevraagde informatie te extraheren in strikt JSON-formaat. Je mag **absoluut geen externe kennis** gebruiken; je analyse is strikt beperkt tot de aangeleverde tekst.

**BELANGRIJK VOOR CONCURRENTEN:**
Identificeer ALLEEN SPECIFIEKE andere bedrijven, merken of commerciële dienstverleners.

**Wees UITERST STRIKT - sluit uit:**
❌ Zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Adidas, Apple, Samsung, Google als bedrijf, Facebook, YouTube, Amazon, Lego, McDonald's, etc.)
❌ Zoekmachines (Google Search, Bing, DuckDuckGo)  
❌ Social media platforms (Facebook, LinkedIn, Instagram, Twitter/X, TikTok)
❌ SEO/Marketing tools (Semrush, Ahrefs, Moz, Google Analytics, Mailchimp)

**Focus op:**
✅ Nederlandse, kleinere tot middelgrote dienstverleners
✅ Specialistische bedrijven relevant voor de bedrijfscategorie
✅ Concrete bedrijfsnamen van lokale/regionale aanbieders

Wees meedogenloos strikt in het filteren van niet-bedrijfsnamen.`,
      messages: [{
        role: 'user',
        content: `Lees de volgende tekst zorgvuldig:
"""
${rawOutput}
"""

Jouw taak is om de onderstaande JSON-structuur te vullen. De analyse moet strikt gebaseerd zijn op de GEGEVEN TEKST ALLEEN. Gebruik GEEN EXTERNE KENNIS.

De output moet **ALTIJD en UITSLUITEND in het Nederlands zijn**, zonder enige uitzondering of Engelse woorden. Verwijder alle mogelijke Engelse termen of vervang ze door Nederlandse equivalenten.

**JSON STRUCTUUR:**

{
  "company_mentioned": ${isCompanyLiterallyMentioned},
  "mentions_count": ${mentionsCount},
  "competitors_mentioned": [],
  "simulated_ai_response_snippet": ""
}

**INSTRUCTIES PER VELD:**

1. **company_mentioned**: Deze is al extern vastgesteld als ${isCompanyLiterallyMentioned}. Stel deze waarde in als gegeven.

2. **mentions_count**: Deze is al extern vastgesteld als ${mentionsCount}. Stel deze waarde in als gegeven.

3. **competitors_mentioned**: 
   Lijst alle andere **CONCRETE, SPECIFIEKE BEDRIJFSNAMEN, MERKEN of COMMERCIËLE DIENSTVERLENERS** op die in de tekst worden genoemd en die GEEN "${companyName}" zijn.
   
   **Wees UITERST STRIKT:**
   - Sluit expliciet UIT: Zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Adidas, Apple, Samsung, Google als bedrijf, Facebook, YouTube, Amazon, Lego, McDonald's, etc.)
   - Sluit UIT: Zoekmachines, social media platforms, SEO/marketing tools
   - Focus op: Nederlandse, kleinere tot middelgrote dienstverleners of specialistische bedrijven relevant voor de bedrijfscategorie
   
   Geef een lege array [] als er geen namen zijn die aan deze zeer specifieke criteria voldoen.
   
   Baseer dit strikt op de gegeven tekst en wees zeer strikt in het onderscheiden van ECHTE bedrijven/merken van algemene termen of tools.

4. **simulated_ai_response_snippet**: 
   Geef een beknopte, relevante samenvatting van de tekst als antwoord op de oorspronkelijke vraag.
   
   **BELANGRIJKSTE INSTRUCTIE:**
   ${!isCompanyLiterallyMentioned ? 
     `- Als "${companyName}" NIET in de tekst voorkomt, MOET de samenvatting beginnen met: "Het bedrijf \\"${companyName}\\" wordt niet genoemd in deze tekst."` : 
     `- Als "${companyName}" WEL in de tekst voorkomt, focus dan op de relevante informatie uit de tekst.`}
   
   **De samenvatting MOET:**
   - ALTIJD en UITSLUITEND in het Nederlands zijn
   - GEEN ENKELE Engelse woorden bevatten
   - Zich richten op concrete bedrijven of dienstverleners als die in de tekst aanwezig zijn
   - Algemeen advies over hoe bedrijven te vinden VERMIJDEN

**OUTPUT:** Geef ALLEEN de JSON terug, geen extra tekst.`
      }]
    })

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleanedText)

    if (parsed.company_mentioned !== isCompanyLiterallyMentioned) {
      parsed.company_mentioned = isCompanyLiterallyMentioned
      parsed.mentions_count = mentionsCount
    }

    return parsed
  } catch (error) {
    console.error('❌ Parser Error:', error)
    return {
      company_mentioned: false,
      mentions_count: 0,
      competitors_mentioned: [],
      simulated_ai_response_snippet: 'Fout bij het analyseren van de AI-respons'
    }
  }
}