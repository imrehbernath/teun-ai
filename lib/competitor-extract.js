// lib/competitor-extract.js
// Gedeelde competitor-extractie voor Perplexity + ChatGPT scans.
// Gebaseerd op de uitgebreide parsing in /api/ai-visibility-analysis,
// hergebruikt door /api/scan-selected-prompts zodat beide routes consistent
// dezelfde filtering toepassen. Wijzig hier wanneer LLM-output rommel doorlekt.

// Brede uitsluitlijst: bekende platforms, steden, generieke service-termen
// en labels die LLM's gebruiken als "concurrenten" maar geen bedrijfsnaam zijn.
export const COMPETITOR_EXCLUDE_LIST = new Set([
  // Bekende merken / platforms
  'google', 'facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'tiktok',
  'amazon', 'apple', 'microsoft', 'samsung', 'nike', 'adidas', 'coca-cola',
  'semrush', 'ahrefs', 'moz', 'hubspot', 'mailchimp', 'wordpress', 'shopify',
  'whatsapp', 'telegram', 'pinterest', 'reddit', 'bing', 'yahoo',
  'chatgpt', 'openai', 'anthropic', 'perplexity',
  // Landen / steden / provincies
  'nederland', 'netherlands', 'amsterdam', 'rotterdam', 'den haag', 'the hague',
  'utrecht', 'eindhoven', 'groningen', 'maastricht', 'breda', 'tilburg', 'almere',
  'arnhem', 'nijmegen', 'haarlem', 'leiden', 'delft', 'dordrecht', 'zoetermeer',
  'zwolle', 'deventer', 'enschede', 'apeldoorn', 'amersfoort', 'hilversum',
  'noord-holland', 'zuid-holland', 'brabant', 'gelderland', 'overijssel', 'friesland',
  // Service- en skill-termen (geen bedrijfsnamen)
  'seo', 'seo specialist', 'seo bureau', 'seo agency',
  'online marketing', 'online marketing bureau', 'digital marketing',
  'webdesign', 'webdesign bureau', 'web development', 'webdevelopment',
  'conversie optimalisatie', 'conversion optimization', 'cro',
  'linkbuilding', 'link building', 'content marketing', 'social media marketing',
  'google ads', 'sea', 'ppc', 'email marketing', 'e-mail marketing',
  'website laten maken', 'website bouwen', 'website ontwerp',
  'zoekmachine optimalisatie', 'search engine optimization',
  'geo', 'geo optimalisatie', 'ai visibility', 'ai zichtbaarheid',
  'ai-visibility', 'ai-zichtbaarheid', 'ai-zoekmachines', 'ai zoekmachines',
  'ai-platform', 'ai platform', 'ai seo',
  'website', 'internet marketing service',
  'past goed als', 'waarom interessant voor jou',
])

// Kleine banned-set voor block-parsing, minder streng, alleen platforms/tools.
// In het ===BEDRIJVEN===-blok vertrouwen we op de structuur, dus minimale filter.
const BLOCK_BANNED = new Set([
  'google', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok',
  'amazon', 'apple', 'microsoft', 'chatgpt', 'openai', 'anthropic', 'perplexity',
  'semrush', 'ahrefs', 'moz', 'hubspot', 'mailchimp', 'wordpress', 'shopify',
])

// Strip alle markdown, Google-Business-metadata, ratings, adressen, etc. uit een
// kandidaat-naam zodat we alleen het "bedrijfsnaam-deel" overhouden.
export function cleanCompetitorName(raw) {
  if (!raw || typeof raw !== 'string') return ''
  return raw
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[\[\]]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\*\*/g, '')
    .replace(/[`_~]/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\s*·\s*.*/g, '')
    .replace(/\(\d+\s*(?:beoordelingen|reviews?|sterren)\)/gi, '')
    .replace(/\(\s*\d+\s*\)/g, '')
    .replace(/\b(Nu geopend|Gesloten|UitGesloten|Uit Gesloten|Tijdelijk gesloten|Permanent gesloten)\b/gi, '')
    .replace(/\d+[.,]\d+\s*★?/g, '')
    .replace(/★+/g, '')
    .replace(/[A-Z][a-z]+(?:straat|weg|laan|plein|gracht|kade|singel|dijk|pad)\s*\d+.*/gi, '')
    .replace(/\d{4}\s*[A-Z]{2}\b/g, '')
    .replace(/\+?\d[\d\s\-]{8,}/g, '')
    .replace(/\(uit\s+\d+.*/gi, '')
    .replace(/^[\s·•\-–—:,;|()\[\]]+/, '')
    .replace(/[\s·•\-–—:,;|()\[\]]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Strenge validatie voor kandidaat-bedrijfsnamen die uit regex-patterns komen
// (fallback wanneer geen ===BEDRIJVEN===-blok beschikbaar is). Filtert section-
// headers, instructies, generieke descriptieve fragmenten, sentence-starters etc.
export function isValidCompetitorName(name, companyLower, excludeList, seen) {
  const nameLower = name.toLowerCase()
  const wordCount = name.split(/\s+/).length
  return (
    name.length >= 4 && name.length < 50 &&
    wordCount <= 6 &&
    !nameLower.includes(companyLower) &&
    !companyLower.includes(nameLower) &&
    !excludeList.has(nameLower) &&
    !seen.has(nameLower) &&
    !nameLower.includes('?') &&
    !/^(tip|let op|belangrijk|conclusie|samenvatting|opmerking|aanbevolen|overzicht|vergelijk|alternatief|optie|keuze|note|important|conclusion|summary|recommended|overview|compare|alternative|option|choice)/i.test(name) &&
    !/^(stap|punt|vraag|antwoord|optie|methode|strategie|voordeel|nadeel|step|point|question|answer|method|strategy|advantage|disadvantage)\s/i.test(name) &&
    !/^(waar je op|goede opties|alternatieven|waarom deze|tips voor|hoe je|wat je|wanneer je|let hierop|onze aanbeveling|ons advies|meer informatie|verder lezen|bronnen|sources|references|see also|read more|further reading|structuur voor|content die|technische en|autoriteit en|specifiek|andere nederlandse|aanpak|technische kant|rapportage)\s/i.test(name) &&
    !/^(past goed|waarom interessant|waarom kies|waarom is|wat maakt|hoe deze|kortom|tot slot|samengevat|opmerking)\b/i.test(name) &&
    !/\s\/\s/.test(name) &&
    // Blog/article-titel patronen ("Cited in ChatGPT in 90 Days", "Featured in...")
    !/^(cited|featured|mentioned|published|listed|ranked|top\s+\d+|the\s+top|how\s+to|why\s+you|why\s+we|guide\s+to)\b/i.test(name) &&
    // "X in N days/weeks/months/years" patronen aan einde van string (metrics)
    !/\sin\s\d+\s+(days?|weeks?|months?|years?|dagen|weken|maanden|jaren)\.?$/i.test(name) &&
    !/^(documenteer|waarschuw|controleer|check|bekijk|overweeg|neem|zoek|bel|mail|schrijf|vraag|meld|maak|gebruik|vermijd|kies|vergelijk|probeer|start|stop|lees|ga naar|schakel|stel|plan|regel|evalueer|analyseer|optimaliseer|beoordeel|onderzoek|bespreek|registreer|download|upload|installeer|configureer|activeer|deactiveer)\s/i.test(name) &&
    !/^(gevestigde|aanbevelingen|mogelijke|beschikbare|populaire|relevante|belangrijke|lokale|professionele|ervaren|gekwalificeerde|betrouwbare|onafhankelijke|erkende|gecertificeerde|specialistische|juridische|medische|technische|financiële|commerciële|industriële|algemene|specifieke|directe|indirecte|formele|informele|wettelijke|verplichte|vrijwillige|preventieve|curatieve|alternatieve|aanvullende|gerechtelijke|buitengerechtelijke|goede|beste|mogelijke|verschillende|overige|verdere|concrete|praktische|nuttige|handige|interessante|geschikte|bekende|nieuwe|andere)\s/i.test(name) &&
    !/^(mediation|arbitrage|procedure|behandeling|aanpak|oplossing|werkwijze|benadering|uitkomst|resultaat|gevolg|oorzaak|reden|advies|hulp|steun|begeleiding|ondersteuning|bemiddeling|tussenkomst|interventie|handhaving|toezicht|controle|inspectie|onderzoek|analyse|rapportage|evaluatie|beoordeling)\s+(of|en|voor|bij|van|met|door|tegen|over|na|om|in|uit|op|aan|tot|naar)\s/i.test(name) &&
    !/^(dit|deze|dat|die|er|het|de|een|als|voor|naar|van|met|bij|wat|wie|waar|wanneer|waarom|hoe|welke|enkele|diverse|hier|ook|meer|nog|veel|alle|andere|sommige|this|that|these|those|the|a|an|if|for|to|from|with|at|what|who|where|when|how|which|some|here|also|more|still|many|all|other|there|it|they|we|you|i)\s/i.test(name) &&
    !/^(gesloten|nu geopend|event planner|event venue|boat rental|car rental|restaurant|hotel|bruine vloot|zeilvloot|beoordelingen?|reviews?|closed|now open|currently open|advertising agency)$/i.test(name) &&
    !/^\(\d+/.test(name) &&
    !/beoordelingen\)?$/i.test(name) &&
    !/reviews?\)?$/i.test(name) &&
    /[a-zA-Z]/.test(name) &&
    /^[A-Z0-9]/.test(name) &&
    !nameLower.startsWith('http') &&
    !nameLower.startsWith('www.') &&
    !/\.(nl|com|org|net|be|de|eu)$/i.test(name) &&
    !/^(seo|sea|cro|ppc|geo|smm|sem)\s/i.test(name) &&
    !/\b(optimalisatie|optimization|specialist|bureau|agency|strategie|strategy|marketing|analyse|analysis|advies|consultancy)\s*$/i.test(name) &&
    !/^(amsterdam|rotterdam|utrecht|den haag|eindhoven|groningen|haarlem|leiden|arnhem|nijmegen|breda|tilburg|almere|amersfoort|hilversum|delft|dordrecht|zoetermeer|zwolle|deventer|enschede|apeldoorn)$/i.test(name) &&
    !/^[a-z\s\-]+$/.test(name)
  )
}

// Lichte cleanup voor namen uit het ===BEDRIJVEN===-blok (de structuur is al
// betrouwbaar door de prompt-instructie, dus alleen platforms uitsluiten).
function cleanBlockName(raw, companyLower, seen) {
  let cleaned = raw
    .replace(/^\s*\d+[\.\)]\s*/, '')
    .replace(/^\s*[•\-\*]\s*/, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/[\[\]]/g, '')
    .replace(/\s*[-–—:]\s*.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return null
  const lower = cleaned.toLowerCase()
  if (BLOCK_BANNED.has(lower)) return null
  if (seen.has(lower)) return null
  if (companyLower && (lower === companyLower || lower.includes(companyLower) || companyLower.includes(lower))) return null
  if (!/[a-zA-ZÀ-ÿ]/.test(cleaned)) return null
  return cleaned
}

// Perplexity: eerst het ===BEDRIJVEN===-blok parsen (afgedwongen via system
// prompt). Pas als dat leeg blijft, regex-fallback over bold/numbered/bullets
// met de strenge isValidCompetitorName filter.
export function extractCompetitorsFromPerplexity(rawOutput, companyName) {
  const companyLower = (companyName || '').toLowerCase()
  const seen = new Set()
  const competitors = []

  // 1. Gestructureerde blok
  const blockMatch = rawOutput.match(
    /===BEDRIJVEN===([\s\S]*?)===EINDE BEDRIJVEN===|===COMPANIES===([\s\S]*?)===END COMPANIES===/i
  )
  if (blockMatch) {
    const block = (blockMatch[1] || blockMatch[2] || '').trim()
    block.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      const name = cleanBlockName(line, companyLower, seen)
      if (name) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    })
  }

  // 2. Fallback wanneer blok leeg of niet aanwezig
  if (competitors.length === 0) {
    const tryStrict = (raw) => {
      const name = cleanCompetitorName(raw)
      if (isValidCompetitorName(name, companyLower, COMPETITOR_EXCLUDE_LIST, seen)) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    }

    const lines = rawOutput.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      let m
      if ((m = line.match(/^\d+[\.\)]\s+\*\*(.+?)\*\*/))) tryStrict(m[1])
      else if ((m = line.match(/^\d+[\.\)]\s+([^*\n]{2,60}?)(?:\s*[-–—:]\s|\s*$)/))) tryStrict(m[1])
      else if ((m = line.match(/^[•\-\*]\s+\*\*(.+?)\*\*/))) tryStrict(m[1])
      else if ((m = line.match(/^[•\-\*]\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.\-\s]{1,50}?)\s*:\s/))) tryStrict(m[1])
      const boldMatches = [...line.matchAll(/\*\*([A-ZÀ-ÿ][^*]{1,50}?)\*\*/g)]
      for (const bm of boldMatches) tryStrict(bm[1])
    }
  }

  return competitors.slice(0, 10)
}

// ChatGPT: gebruikt nu ook het ===BEDRIJVEN===-blok als primaire bron (gpt-4o
// volgt structuur-instructies meestal beter dan Perplexity). Fallback op de
// 5-patterns parser als het blok ontbreekt of leeg blijft.
export function extractCompetitorsFromChatGPT(rawOutput, companyName) {
  const companyLower = (companyName || '').toLowerCase()
  const seen = new Set()
  const competitors = []

  // 1. Gestructureerde blok eerst (zelfde aanpak als Perplexity).
  // Als het blok 1+ namen oplevert, vertrouwen we het en slaan de regex-fallback
  // over zodat criteria-bullets zoals "**Kosten:**" niet als bedrijven verschijnen.
  const blockMatch = rawOutput.match(
    /===BEDRIJVEN===([\s\S]*?)===EINDE BEDRIJVEN===|===COMPANIES===([\s\S]*?)===END COMPANIES===/i
  )
  if (blockMatch) {
    const block = (blockMatch[1] || blockMatch[2] || '').trim()
    block.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      const name = cleanBlockName(line, companyLower, seen)
      if (name) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    })
  }

  // Fallback: alleen draaien als het gestructureerde blok niets opleverde.
  if (competitors.length === 0) {
    const cleanedOutput = rawOutput.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    const plainOutput = cleanedOutput.replace(/\*\*/g, '').replace(/[\[\]]/g, '')

    // Pattern 1: **Bold names** (skip criteria-bullets met ":")
    let m
    const boldPattern = /\*\*([^*]{3,60})\*\*/g
    while ((m = boldPattern.exec(cleanedOutput)) !== null) {
      const afterBold = cleanedOutput.slice(m.index + m[0].length, m.index + m[0].length + 5)
      if (/^\s*:/.test(afterBold) || /:\s*$/.test(m[1])) continue
      const name = cleanCompetitorName(m[1])
        .replace(/\s*[-–—:].*/g, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim()
      if (isValidCompetitorName(name, companyLower, COMPETITOR_EXCLUDE_LIST, seen)) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    }

    // Pattern 2: Numbered list items
    const numberedPattern = /^\s*(\d+)[\.\)\-]\s*([^*\n]{2,80})/gm
    while ((m = numberedPattern.exec(plainOutput)) !== null) {
      const name = cleanCompetitorName(m[2]).replace(/\s*[-–—:].*/g, '').trim()
      if (isValidCompetitorName(name, companyLower, COMPETITOR_EXCLUDE_LIST, seen)) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    }

    // Pattern 3: Bullet items with bold name + colon (skip criteria-bullets)
    const bulletBoldPattern = /^[\s]*[•\-\*]\s+\*\*([^*]{2,60}?)\*\*\s*:?\s/gm
    while ((m = bulletBoldPattern.exec(rawOutput)) !== null) {
      const afterBold = rawOutput.slice(m.index + m[0].length, m.index + m[0].length + 5)
      if (/^\s*:/.test(afterBold) || /:\s*$/.test(m[1])) continue
      const name = m[1].replace(/\s*:$/, '').trim()
      if (isValidCompetitorName(name, companyLower, COMPETITOR_EXCLUDE_LIST, seen)) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    }

    // Pattern 4: Bullet items without bold
    const bulletPlainPattern = /^[\s]*[•\-\*]\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ0-9&'.\-\s]{1,50}?)\s*:\s+\S/gm
    while ((m = bulletPlainPattern.exec(plainOutput)) !== null) {
      const name = m[1].trim()
      if (isValidCompetitorName(name, companyLower, COMPETITOR_EXCLUDE_LIST, seen)) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    }

    // Pattern 5: "CompanyName: description" aan het begin van een regel
    const colonPattern = /^([A-ZÀ-Ÿ][A-Za-zÀ-ÿ0-9&'.\-\s]{2,50}?)\s*:\s+[a-z]/gm
    while ((m = colonPattern.exec(plainOutput)) !== null) {
      const name = m[1].trim()
      if (name.split(/\s+/).length <= 5 && isValidCompetitorName(name, companyLower, COMPETITOR_EXCLUDE_LIST, seen)) {
        seen.add(name.toLowerCase())
        competitors.push(name)
      }
    }
  }

  return competitors.slice(0, 10)
}

// System prompt voor Perplexity: dwingt het ===BEDRIJVEN===-blok af en geeft
// duidelijke focus + verboden lijst zodat sonar-pro consistent bedrijfsnamen
// noemt in plaats van section-headers.
export function getPerplexityCompetitorSystemPrompt(lang = 'nl', location = null) {
  if (lang === 'en') {
    return `You are an advanced AI model trained on a broad dataset of web content, including business information, reviews, technical documentation and compliance.

YOUR TASK:
Simulate how an AI Overview or advanced chatbot would respond to the search query. Generate a concise, simulated AI response as a direct answer.

ABSOLUTE RULES:
1. LANGUAGE: 100% ENGLISH. Even if the query contains non-English terms, ALWAYS respond entirely in English.
2. FOCUS: Concrete, specific small to medium-sized business names${location ? `, especially in ${location}` : ''}.
3. STRICTLY FORBIDDEN: Very well-known global consumer brands (Coca-Cola, Nike, Apple), tech platforms (Google, Facebook), SEO/marketing tools (Semrush, Ahrefs, HubSpot).
4. DO MENTION: Local service providers, regional specialists, smaller businesses.

Simulate an AI Overview that mentions concrete businesses.

IMPORTANT: ALWAYS end with exactly this block:

===COMPANIES===
1. Company Name
2. Company Name
3. Company Name
===END COMPANIES===

RULES FOR THIS BLOCK:
- ONLY company names. No explanations, no urls, no reviews, no section headers.
- Maximum 10 companies.
- Only concrete businesses that appear in the answer above.`
  }

  return `Jij bent een geavanceerd AI-model getraind op een brede dataset van webcontent, inclusief bedrijfsinformatie, reviews, technische documentatie en compliance.

JOUW TAAK:
Simuleer hoe een AI Overview of geavanceerde chatbot zou reageren op de zoekopdracht. Genereer een beknopt, gesimuleerd AI-antwoord als een directe reactie.

ABSOLUTE REGELS:
1. TAAL: 100% NEDERLANDS.
2. FOCUS: Concrete Nederlandse B2B bedrijfsnamen, kleinere tot middelgrote bedrijven${location ? `, specifiek in ${location}` : ''}.
3. STRIKT VERBODEN: Zeer bekende wereldwijde consumentenmerken (Coca-Cola, Nike, Apple), tech-platforms (Google, Facebook), SEO/marketing-tools (Semrush, Ahrefs, HubSpot).
4. WEL VERMELDEN: Nederlandse lokale dienstverleners, regionale specialisten, kleinere bedrijven.

Simuleer een AI Overview die concrete bedrijven noemt.

BELANGRIJK: Sluit ALTIJD af met exact dit blok:

===BEDRIJVEN===
1. Bedrijfsnaam
2. Bedrijfsnaam
3. Bedrijfsnaam
===EINDE BEDRIJVEN===

REGELS VOOR DIT BLOK:
- ALLEEN bedrijfsnamen. Geen uitleg, geen urls, geen reviews, geen section-headers.
- Maximaal 10 bedrijven.
- Alleen concrete bedrijven die in het antwoord hierboven voorkomen.`
}

// Verwijder het ===BEDRIJVEN===-blok uit een Perplexity-respons zodat het niet
// in de snippet die naar de UI gaat verschijnt.
export function stripCompetitorBlock(text) {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/===(?:BEDRIJVEN|COMPANIES)===[\s\S]*?===(?:EINDE BEDRIJVEN|END COMPANIES)===/gi, '').trim()
}
