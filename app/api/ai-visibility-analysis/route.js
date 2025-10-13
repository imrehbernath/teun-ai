// app/api/ai-visibility-analysis/route.js
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { canUserScan, trackScan, BETA_CONFIG } from '@/lib/beta-config'
import Anthropic from '@anthropic-ai/sdk'

// ✅ NIEUW: Slack notificatie functie
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
      numberOfPrompts = 5
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
      identifiedQueriesSummary || []
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

    // ✅ BESTAANDE CODE: trackScan slaat op in database
    await trackScan(
      supabase,
      userId,
      'ai-visibility',
      ip,
      { companyName, companyCategory, identifiedQueriesSummary },
      { generatedPrompts, analysisResults, totalCompanyMentions },
      scanDuration
    )

    // ✅ NIEUW: Verstuur Slack notificatie NA succesvolle scan
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

// REST VAN DE CODE BLIJFT EXACT HETZELFDE...
async function generatePromptsWithClaude(companyName, companyCategory, queries) {
  const primaryKeyword = queries.length > 0 ? queries[0] : null
  
  const searchConsoleContext = queries.length > 0 
    ? `\n\n**ZOEKWOORDEN ANALYSE:**
    
**BELANGRIJKSTE ZOEKWOORD (HOOFDFOCUS):** "${primaryKeyword}"

**AANVULLENDE ZOEKWOORDEN:**
${queries.slice(1).map(q => `- "${q}"`).join('\n') || 'Geen aanvullende zoekwoorden'}

**KRITIEKE INSTRUCTIE VOOR RELEVANTIE:** 
Alle 10 prompts MOETEN direct gerelateerd zijn aan de opgegeven zoekwoorden. 

- Focus op "${primaryKeyword}" en de aanvullende zoekwoorden
- Gebruik ALLEEN termen en concepten die logisch passen bij deze zoekwoorden
- Vermijd het toevoegen van ONGERELATEERDE termen zoals "brandvertragende", "vuurvast", "technische specificaties" etc. als die niet in de zoekwoorden staan
- Als de zoekwoorden gaan over "linnen gordijnen", focus dan op: stijlen, maatwerk, kwaliteit, leveranciers, design, interieur, etc.
- GEEN fabricage-gerelateerde termen tenzij expliciet in de zoekwoorden
- Blijf binnen de context van wat de klant zoekt volgens de opgegeven zoekwoorden`
    : ''

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      system: `Jij genereert commerciële, klantgerichte zoekvragen voor B2B-dienstverleners, die gericht zijn op het vinden van **specifieke bedrijven of organisaties** (geen grote consumentenmerken), zonder de naam van het aangeleverde bedrijf of de categorie te bevatten. 

De output is strikt JSON en **ALTIJD en UITSLUITEND in het Nederlands, GEEN ENKELE ENGELSE WOORDEN.** 

Vermijd prompts die starten met "Waar kan ik...", "Welke specialist...", of die leiden tot generiek zoekadvies. 

Focus op vragen die concreet om bedrijfsnamen vragen, en sluit expliciet de genoemde wereldwijde merken uit.

**BELANGRIJKSTE REGEL:** Blijf strikt binnen de context van de opgegeven zoekwoorden. Voeg GEEN ongerelateerde termen of concepten toe die niet in de zoekwoorden voorkomen.`,
     messages: [{
  role: 'user',
  content: `Genereer 10 zeer specifieke, commercieel relevante zoekvragen die een potentiële klant zou stellen met de intentie om **concrete, lokale/nationale bedrijven of leveranciers** te vinden.

**ABSOLUTE TOP PRIORITEIT - STRIKT BLIJVEN BIJ CONTEXT:**
${primaryKeyword ? `
De vragen MOETEN draaien om "${primaryKeyword}" en aanvullende zoekwoorden.
ALLE 10 vragen moeten direct gerelateerd zijn aan deze zoekwoorden en de categorie "${companyCategory}".

**VOORBEELDEN VAN GOEDE VRAGEN VOOR "${primaryKeyword}" + "${companyCategory}":**
- "Kun je een aantal gespecialiseerde ${companyCategory} noemen die expert zijn in ${primaryKeyword}?"
- "Welke zijn de beste ${companyCategory} voor ${primaryKeyword} met goede reviews?"
- "Geef voorbeelden van ervaren ${companyCategory} die gespecialiseerd zijn in ${primaryKeyword}"
- "Lijst aanbevolen ${companyCategory} op voor ${primaryKeyword} kwesties"
- "Welke ${companyCategory} hebben de meeste ervaring met ${primaryKeyword}?"

**VERPLICHT:**
- ELKE vraag moet "${primaryKeyword}" OF een direct gerelateerd synoniem bevatten
- ELKE vraag moet "${companyCategory}" OF een direct gerelateerd synoniem bevatten
- Gebruik ALLEEN termen die logisch passen bij de zoekwoorden
- GEEN algemene juridische termen die NIET in de zoekwoorden staan
` : `
De vragen MOETEN draaien om "${companyCategory}".
`}

**KRITIEKE VEREISTEN:**

1. **Algemeen en bedrijfsneutraal:** De vragen mogen de naam "${companyName}" NIET direct bevatten, maar MOETEN WEL "${companyCategory}" of synoniemen daarvan bevatten

2. **Focus op bedrijfsnamen + categorie:** Zich uitsluitend richten op het **identificeren van specifieke organisaties** binnen de categorie "${companyCategory}"

3. **Sluit wereldwijde merken uit:** GEEN bekende, wereldwijde consumentenmerken

4. **VERMIJD ABSOLUUT:**
   - Vragen die te algemeen zijn en NIET over "${companyCategory}" gaan
   - Vragen die beginnen met "Waar kan ik vinden..."
   - Vragen zonder directe link naar de opgegeven zoekwoorden
   - **Het toevoegen van ONGERELATEERDE specialisaties die NIET in de zoekwoorden staan**
   
   **FOUT VOORBEELD (vermijd dit!):**
   ❌ "Welke zijn de meest toonaangevende juridische kantoren voor procedures bij de kantonrechter?"
   → TE ALGEMEEN, "kantonrechter" staat niet in de zoekwoorden!
   
   **GOED VOORBEELD:**
   ✅ "Kun je een aantal gespecialiseerde advocatenkantoren noemen die expert zijn in arbeidsrecht?"
   → Bevat zowel "advocatenkantoren" (categorie) als "arbeidsrecht" (zoekwoord)

5. **Formuleer vragen die direct een lijst uitlokken + BLIJF BIJ CONTEXT**

**GOEDE START PATRONEN (gebruik categorie + zoekwoord!):**
- "Kun je een aantal gespecialiseerde **${companyCategory}** noemen die..."
- "Welke zijn de beste **${companyCategory}** voor ${primaryKeyword || '...'} ..."
- "Geef voorbeelden van ervaren **${companyCategory}** in ${primaryKeyword || '...'}..."
- "Lijst aanbevolen **${companyCategory}** op die gespecialiseerd zijn in ${primaryKeyword || '...'}..."
- "Welke **${companyCategory}** hebben bewezen expertise in ${primaryKeyword || '...'}?"

**OUTPUT FORMAAT:**
Geef exact 10 vragen terug als een JSON array van strings. GEEN extra uitleg, ALLEEN de JSON array.
De vragen moeten **ALTIJD en UITSLUITEND in het Nederlands zijn, GEEN ENKELE ENGELSE WOORDEN.**

Voorbeeld formaat:
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

    return { success: true, prompts }
  } catch (error) {
    console.error('AI Prompt Generation Error:', error)
    return { success: false, error: 'Fout bij promptgeneratie' }
  }
}

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

Jouw taak is om de volgende zoekopdracht te verwerken en te simuleren hoe een AI Overview of een geavanceerde chatbot zou reageren. 

Genereer een beknopt, gesimuleerd AI-antwoord als een directe reactie op de zoekopdracht. 

Zorg ervoor dat het antwoord, indien relevant en mogelijk, **concrete, Nederlandse, kleinere tot middelgrote bedrijfsnamen of specialistische dienstverleners** vermeldt die passen bij de zoekintentie van de gebruiker. 

**Sluit expliciet uit:** zeer bekende, wereldwijde, consumentgerichte merken zoals Coca-Cola, Nike, Adidas, Apple, Samsung, Google (als bedrijf), Facebook, YouTube, Amazon, Lego, en dergelijke. 

Vermijd algemeen advies over hoe bedrijven te vinden. Focus op het NOEMEN van concrete bedrijven, leveranciers of dienstverleners.

De output moet **ALTIJD en UITSLUITEND in het Nederlands zijn, GEEN ENKELE ENGELSE WOORDEN.**`
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

    console.log('🔍 AI Search Response Status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ AI Search API error (${response.status}):`, errorText)
      throw new Error(`AI Search API failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('🔍 AI Search Response Data:', JSON.stringify(data, null, 2))

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid AI Search Response:', data)
      throw new Error('AI Search API error: Invalid response format')
    }

    const rawOutput = data.choices[0].message.content

    if (!rawOutput || rawOutput.trim() === '') {
      console.error('❌ AI Search returned empty content')
      throw new Error('AI Search returned empty response')
    }

    const parsed = await parseWithClaude(rawOutput, companyName)

    return { success: true, data: parsed }
  } catch (error) {
    console.error('❌ AI Search Error:', error.message || error)
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

async function parseWithClaude(rawOutput, companyName) {
  try {
    const mentionsCount = (rawOutput.match(new RegExp(companyName, 'gi')) || []).length
    const isCompanyLiterallyMentioned = mentionsCount > 0
    
    console.log(`🔍 Pre-parse check: "${companyName}" mentioned ${mentionsCount} times`)

    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1500,
      system: `Jij bent een nauwkeurige JSON-parser en beknopte samenvatter die **ALTIJD en uitsluitend in het Nederlands** reageert. Jouw output mag GEEN ENKELE Engelse term bevatten. Verwijder alle mogelijke Engelse termen uit de tekst of vervang ze door hun Nederlandse equivalenten.

Jouw taak is om de gegeven tekst te analyseren en daaruit de gevraagde informatie (concurrenten, samenvatting) te extraheren en deze in strikt JSON-formaat te retourneren. 

Je neemt de \`company_mentioned\` en \`mentions_count\` waarden over zoals ze jou worden aangeleverd en je past de samenvatting hierop aan zoals geïnstrueerd.

Je mag **absoluut geen externe kennis** gebruiken; je analyse is strikt beperkt tot de aangeleverde tekst.

**BELANGRIJK voor concurrenten:**
- Identificeer ALLEEN SPECIFIEKE andere bedrijven, merken of commerciële dienstverleners
- Wees UITERST STRIKT in het onderscheiden van ECHTE bedrijven/merken van algemene termen, zoekmachines, social media platforms of SEO/marketing tools
- Sluit STRIKT uit: 
  * Algemene zoekmachines (Google, Bing, DuckDuckGo)
  * Social media platforms (Facebook, LinkedIn, Instagram, Twitter/X, TikTok)
  * SEO/Marketing tools (Semrush, Ahrefs, Moz, Google Analytics, Mailchimp)
  * Zeer bekende wereldwijde consumentmerken (Coca-Cola, Nike, Adidas, Apple, Samsung, YouTube, Amazon, Lego)
- **Focus op Nederlandse, kleinere tot middelgrote dienstverleners of specialistische bedrijven die relevant zijn voor de bedrijfscategorie**
- Wees meedogenloos strikt in het filteren van niet-bedrijfsnamen

De samenvatting moet zich richten op het **benoemen van CONCRETE bedrijven of aanbieders**, niet op algemeen advies over "hoe te zoeken".`,
      messages: [{
        role: 'user',
        content: `Lees de volgende tekst zorgvuldig:
"""
${rawOutput}
"""

Jouw taak is om de onderstaande JSON-structuur te vullen. De analyse moet strikt gebaseerd zijn op de GEGEVEN TEKST ALLEEN. Gebruik GEEN EXTERNE KENNIS.

De output van jou (de parser) moet **ALTIJD en UITSLUITEND in het Nederlands zijn**, zonder enige uitzondering of Engelse woorden. Verwijder alle mogelijke Engelse termen uit de tekst of vervang ze door hun Nederlandse equivalenten.

**JSON STRUCTUUR:**

{
  "company_mentioned": ${isCompanyLiterallyMentioned},
  "mentions_count": ${mentionsCount},
  "competitors_mentioned": [],
  "simulated_ai_response_snippet": ""
}

**INSTRUCTIES PER VELD:**

1. **company_mentioned**: Deze is al extern vastgesteld als ${isCompanyLiterallyMentioned}. Stel deze waarde in als de gegeven status.

2. **mentions_count**: Deze is al extern vastgesteld als ${mentionsCount}. Stel deze waarde in als het gegeven aantal.

3. **competitors_mentioned**: 
   Lijst alle andere **CONCRETE, SPECIFIEKE BEDRIJFSNAMEN, MERKEN of COMMERCIËLE DIENSTVERLENERS** op die in de bovenstaande tekst worden genoemd en die GEEN "${companyName}" zijn.
   
   **Wees UITERST STRIKT in het onderscheiden van ECHTE bedrijven/merken van algemene termen, zoekmachines, social media platforms of SEO/marketing tools.**
   
   **Sluit expliciet UIT:**
   - Zeer bekende, wereldwijde, consumentgerichte merken zoals Coca-Cola, Nike, Adidas, Apple, Samsung, Google (als bedrijf), Facebook, YouTube, Amazon, Lego, en dergelijke
   - Zoekmachines en platforms: Google Search, Bing, DuckDuckGo
   - Social media: Facebook, LinkedIn, Instagram, Twitter/X, TikTok
   - SEO/Marketing tools: Semrush, Ahrefs, Moz, Google Analytics, Mailchimp
   
   **Focus op Nederlandse, kleinere tot middelgrote dienstverleners of specialistische bedrijven die relevant zijn voor de bedrijfscategorie.**
   
   Geef een lege array \`[]\` als er geen andere namen zijn die aan deze zeer specifieke criteria voldoen en NIET tot de expliciet uitgesloten categorieën behoren.
   
   Baseer dit strikt op de gegeven tekst en wees zeer strikt in het onderscheiden van ECHTE bedrijven/merken van algemene termen of tools.

4. **simulated_ai_response_snippet**: 
   Geef een beknopte, relevante samenvatting van de bovenstaande tekst als antwoord op de oorspronkelijke vraag. Zorg ervoor dat de samenvatting de feitelijke inhoud van de tekst accuraat weergeeft.
   
   **BELANGRIJKSTE INSTRUCTIE:**
   - Als "${companyName}" (volgens \`company_mentioned: false\`) NIET letterlijk in de tekst voorkomt, dan MOET de samenvatting beginnen met de exacte zin: **"Het bedrijf \\"${companyName}\\" wordt niet genoemd in deze tekst."**
   - Als "${companyName}" (volgens \`company_mentioned: true\`) WEL letterlijk in de tekst voorkomt, dan HOEF je dit niet expliciet te vermelden; focus dan op de relevante informatie uit de tekst die betrekking heeft op het bedrijf of de context.
   
   **De samenvatting MOET:**
   - ALTIJD en UITSLUITEND in het Nederlands zijn
   - GEEN ENKELE keer Engelse woorden bevatten
   - Zich richten op concrete bedrijven of dienstverleners als die in de tekst aanwezig zijn
   - Algemeen advies over hoe bedrijven te vinden of over zoekmethoden VERMIJDEN

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
      console.warn('⚠️ Parser override detected, forcing external verification')
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