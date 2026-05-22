// lib/keyword-prompt-generator.js
// Generator voor de natuurlijke zoekvraag die voor AI Rank Tracker per keyword
// wordt opgeslagen en gestuurd naar ChatGPT/Perplexity/Google AI Mode.
//
// Hoofdstrategie: Claude Sonnet 4 met een focused subset van de regels uit
// ai-visibility-analysis (de motor). Bij Claude-falen, lege API key of
// onverwachte output valt het terug op een rule-based versie zodat de scan
// nooit faalt door de prompt-generatie.
//
// Wordt eenmalig aangeroepen bij keyword-create/update, dus geen kostendruk
// per scan. De motor zelf (app/api/ai-visibility-analysis/route.js) blijft
// ongewijzigd — die wordt door Imre apart geoptimaliseerd.

import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const CLAUDE_TIMEOUT_MS = 10000;

const SYSTEM_NL = `Je genereert EEN natuurlijke zoekvraag die een echt mens zou typen in ChatGPT, Perplexity of Google AI Mode om een bedrijf te vinden.

DOEL: De vraag moet de AI prikkelen om een lijst van 3+ bedrijven te noemen voor dit zoekwoord.

OUTPUT FORMAAT: Alleen de vraag zelf. Geen quotes, geen markdown, geen uitleg, geen lege regels.

REGELS:

1. LENGTE: 10-18 woorden. Niet korter, niet langer.

2. NATUURLIJK. Klinkt alsof een echt mens dit typt.
   FOUT: "Welke bedrijven bieden diensten aan voor X?" (vaag, corporate)
   GOED: "Ik zoek een advocaat voor mijn ontslagzaak in Amsterdam, wie raad je aan?"

3. VAKJARGON. Gebruik het juiste werkwoord per branche.
   - Vloeren: LEGGEN/AANBRENGEN (NOOIT "installeren")
   - Wanden/stucwerk: AANBRENGEN/AFWERKEN/STUCEN
   - Schilderwerk: SCHILDEREN/VERVEN
   - Dakwerk: DEKKEN/RENOVEREN
   - Bij twijfel: "laten doen" of "verzorgen"

4. VOORZETSELS EN LIDWOORDEN ALTIJD TOEVOEGEN.
   FOUT: "Wie kan gietvloer woonkamer aanbrengen?"
   GOED: "Wie kan een gietvloer in mijn woonkamer aanbrengen?"
   REGEL: voeg "in de", "in mijn", "voor de", "op het", "een" toe waar passend.

5. ANTI-JARGON. Vermijd marketing-buzzwords zonder concrete context.
   VERBODEN zonder context: flexibel, innovatief, duurzaam, premium, professioneel, toonaangevend, vooraanstaand, hoogwaardig, kwalitatief, resultaatgericht, klantgericht, oplossingsgericht.

6. GEEN BEDRIJFSNAAM noemen.

7. LOCATIE ACHTERAAN. Als er een servicegebied is, gebruik "in [stad/regio]" aan het EIND van de zin.
   FOUT: "een advocaat in Amsterdam voor mijn ontslagzaak"
   GOED: "een advocaat voor mijn ontslagzaak in Amsterdam"

8. STARTERS VARIËREN. Goede starters: "Ik zoek", "Mijn", "We willen", "Welk bedrijf", "Kan iemand", "Wie kan", "Waar vind ik", "Ons bedrijf", "Welk bureau".
   VERBODEN: "Welke bedrijven bieden..." / "Welke specialisten zijn gespecialiseerd in..." / "Noem bedrijven die..." / "Ken je betrouwbare aanbieders voor..."

9. TYPE VRAAG. Kies de meest passende voor het zoekwoord:
   - AANBEVELING: "Wie kan mij helpen met X?" / "Ken je een goed bedrijf voor X?"
   - BESTE: "Welk bedrijf is het beste voor X?" / "Wie is de beste X in [stad]?"
   - LOKAAL: "Wie kan X doen in [stad]?" / "Welke X zit er in [regio]?"
   - OPLOSSING: "Ik heb [probleem], welk bedrijf kan dat oplossen?"
   - SPECIALIST: "Welk bureau is gespecialiseerd in X voor [doelgroep]?"

10. VERBODEN VRAAGTYPEN (leveren nooit bedrijfsnamen op):
    - "Wat kost..." / "Hoeveel kost..." / "Wat is de prijs van..."
    - "Wat is het verschil tussen..." / "Kan iemand uitleggen..."
    - "Heeft iemand ervaring met..." zonder concrete bedrijfsvraag

VOORBEELDEN VAN GOEDE VRAGEN:
- "naadloze gietvloer woonkamer" → "Wie kan een naadloze gietvloer in mijn woonkamer leggen?"
- "SEO bureau" + Utrecht → "Welk SEO bureau in Utrecht levert meetbare resultaten voor webshops?"
- "smoked BBQ catering" → "Welke cateraar kan smoked BBQ verzorgen voor 80 personen op een bruiloft?"
- "ergonomische verticale muis" → "Waar kan ik een ergonomische verticale muis bestellen met snelle levering?"
- "osteopaat rugpijn" → "Ik heb chronische rugpijn en wil geen medicijnen, welke osteopaat raad je aan?"

Geef NU de vraag voor het zoekwoord. ALLEEN de vraag.`;

const SYSTEM_EN = `You generate ONE natural search query that a real person would type into ChatGPT, Perplexity or Google AI Mode to find a business.

GOAL: The question should trigger the AI to name a list of 3+ businesses for this keyword.

OUTPUT FORMAT: Only the question itself. No quotes, no markdown, no explanation, no blank lines.

RULES:

1. LENGTH: 10-18 words. Not shorter, not longer.

2. NATURAL. Sounds like a real person typing this.
   BAD: "Which companies offer services for X?" (vague, corporate)
   GOOD: "I'm looking for an employment lawyer in Manchester, who would you recommend?"

3. TRADE LANGUAGE. Use the correct verb per industry.
   - Floors: LAY/APPLY (NEVER "install")
   - Walls/plastering: APPLY/FINISH/PLASTER
   - Painting: PAINT
   - Roofing: ROOF/RENOVATE
   - If unsure: "do" or "take care of"

4. ALWAYS ADD PREPOSITIONS AND ARTICLES.
   BAD: "who can lay poured floor living room?"
   GOOD: "who can lay a poured floor in the living room?"

5. ANTI-JARGON. Avoid marketing buzzwords without concrete context.
   FORBIDDEN without context: flexible, innovative, sustainable, premium, professional, leading, top-tier, high-quality, results-driven, customer-focused, solution-oriented.

6. NEVER mention a brand name.

7. LOCATION AT THE END. If a service area is provided, use "in [city/region]" at the END of the sentence.

8. VARY STARTERS. Good starters: "I'm looking", "My", "We want", "Which company", "Can anyone", "Who can", "Where can I", "Our company", "Which agency".
   FORBIDDEN: "Which companies offer..." / "Which specialists specialize in..." / "Name companies that..." / "Can you recommend reliable providers for..."

9. QUESTION TYPE. Choose the most fitting:
   - RECOMMENDATION: "Who can help me with X?"
   - BEST: "Which company is best for X?"
   - LOCAL: "Who can do X in [city]?"
   - SOLUTION: "I have [problem], which company can solve this?"
   - SPECIALIST: "Which agency specializes in X for [audience]?"

10. FORBIDDEN QUESTION TYPES (never return company names):
    - "How much does..." / "What does ... cost?"
    - "What's the difference between..." / "Can someone explain..."
    - "Has anyone tried..." without asking for a specific company

EXAMPLES OF GOOD QUESTIONS:
- "seamless poured floor living room" → "Who can lay a seamless poured floor in my living room?"
- "SEO agency" + Austin → "Which SEO agency in Austin delivers measurable results for e-commerce stores?"
- "smoked BBQ catering" → "Which caterer can do smoked BBQ for about 80 guests at an outdoor wedding?"
- "ergonomic vertical mouse" → "Where can I order an ergonomic vertical mouse with fast shipping?"

Give the question NOW for the keyword. ONLY the question.`;

function buildUserPrompt(keyword, serviceArea, locale) {
  const kw = keyword.trim();
  const area = serviceArea?.trim();
  if (locale === 'en') {
    return area
      ? `Keyword: "${kw}"\nService area: ${area}\n\nGive only the question.`
      : `Keyword: "${kw}"\n\nGive only the question.`;
  }
  return area
    ? `Zoekwoord: "${kw}"\nServicegebied: ${area}\n\nGeef alleen de vraag.`
    : `Zoekwoord: "${kw}"\n\nGeef alleen de vraag.`;
}

async function generateWithClaude({ keyword, serviceArea, locale }) {
  if (!anthropic) return null;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), CLAUDE_TIMEOUT_MS);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: locale === 'en' ? SYSTEM_EN : SYSTEM_NL,
      messages: [{ role: 'user', content: buildUserPrompt(keyword, serviceArea, locale) }],
    }, { signal: ctrl.signal });
    clearTimeout(tid);

    const raw = message.content?.[0]?.text || '';
    // Soms voegt Claude quotes/markdown toe ondanks instructies; strip dat.
    const cleaned = raw.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^\*+|\*+$/g, '').trim();
    if (!cleaned) return null;
    const wordCount = cleaned.split(/\s+/).length;
    if (wordCount < 6 || wordCount > 25) return null;
    if (cleaned.length > 250) return null;
    return cleaned;
  } catch (err) {
    console.error('[Keyword Prompt Generator] Claude error:', err.message);
    return null;
  }
}

// Rule-based fallback. Letterlijk overgenomen uit ai-rank-tracker/route.js
// generatePrompt() — dezelfde patronen, alleen verplaatst naar lib zodat
// beide routes hem kunnen aanroepen wanneer Claude niet beschikbaar is.
export function generateKeywordPromptFallback(keyword, serviceArea, locale = 'nl') {
  const kw = keyword.trim();
  const area = serviceArea?.trim() || '';
  let cleanKw = kw;
  if (area && kw.toLowerCase().includes(area.toLowerCase())) {
    cleanKw = kw.replace(new RegExp(area, 'i'), '').trim().replace(/\s+in\s*$/i, '').trim();
  }
  if (locale === 'nl') {
    cleanKw = cleanKw.replace(/^(de\s+)?beste\s+/i, '').trim();
  } else {
    cleanKw = cleanKw.replace(/^(the\s+)?best\s+/i, '').trim();
  }
  const inArea = area ? ` in ${area}` : '';
  const cleanLower = cleanKw.toLowerCase();

  if (locale === 'en') {
    if (['have built','have made','have designed','get installed','buy','rent','book','order','arrange','hire'].some(v => cleanLower.includes(v))) {
      return `I want to ${cleanKw}${inArea}. Which companies can you recommend?`;
    }
    if (['improve','optimize','build','design','develop','fix','repair','install','create','set up','manage','grow','boost','increase'].some(v => cleanLower.includes(v))) {
      return `I want to ${cleanKw}${inArea}. Which company or specialist would you recommend for this?`;
    }
    if (/\b(agency|company|firm|specialist|consultant|expert|service|studio|practice|lawyer|doctor|clinic)\b/i.test(cleanKw)) {
      return `Can you recommend a good ${cleanKw}${inArea}?`;
    }
    return `I'm looking for a specialist in ${cleanKw}${inArea}. Which companies would you recommend?`;
  }

  if (['laten maken','laten bouwen','laten ontwerpen','laten aanleggen','laten renoveren','laten schilderen','laten verbouwen','laten installeren','laten drukken','laten repareren','laten behangen','laten stucen','kopen','huren','boeken','bestellen','regelen','aanvragen','inhuren'].some(v => cleanLower.includes(v))) {
    return `Ik wil ${cleanKw}${inArea}. Welke bedrijven kun je aanbevelen?`;
  }
  const foundVerb = ['verbeteren','optimaliseren','ontwikkelen','uitbesteden','opzetten','automatiseren','beheren','analyseren','upgraden','redesignen','verduurzamen','isoleren','verbouwen','renoveren','schilderen'].find(v => cleanLower.includes(v));
  if (foundVerb) {
    const vi = cleanLower.indexOf(foundVerb);
    const sub = cleanKw.substring(0, vi).trim();
    if (sub) return `Ik wil mijn ${sub} ${foundVerb}${inArea}. Welk bedrijf of bureau raad je aan?`;
    return `Ik wil ${cleanKw}${inArea}. Welk bedrijf raad je aan?`;
  }
  if (/\b(bureau|bedrijf|specialist|adviseur|advocaat|kantoor|praktijk|studio|consultant|coach|trainer|installateur|aannemer|loodgieter|schilder|monteur)\b/i.test(cleanKw)) {
    return `Kun je een goed ${cleanKw}${inArea} aanbevelen?`;
  }
  return `Ik zoek een specialist in ${cleanKw}${inArea}. Welk bedrijf raad je aan?`;
}

// Hoofdingang: probeer Claude eerst, val terug op rule-based als nodig.
// Returnt altijd een bruikbare prompt-string.
export async function generateKeywordPrompt({ keyword, serviceArea, locale = 'nl' }) {
  const claudePrompt = await generateWithClaude({ keyword, serviceArea, locale });
  if (claudePrompt) return claudePrompt;
  return generateKeywordPromptFallback(keyword, serviceArea, locale);
}
