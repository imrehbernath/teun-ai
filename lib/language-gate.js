// lib/language-gate.js
// Taal- en locatiegate voor scrape-based tools (Prompt Explorer, GEO Audit,
// AI Visibility wizard). Bouwt voort op dezelfde content-first woordanalyse
// als detectPageLanguage in extract-keywords/route.js. Vervangt die detectie
// NIET, draait er als gate naast.
//
// Beleid:
// - NL en EN: altijd toegestaan
// - Frans: NIET geblokkeerd (Belgische Franstalige sites moeten door)
// - Andere talen: alleen blokkeren als duidelijk dominant boven NL + EN
// - Bij twijfel of zwak signaal: toelaten (geen valse blokkades)

// NL- en EN-woordlijsten 1-op-1 uit extract-keywords/route.js detectPageLanguage,
// zodat detectie consistent blijft met de bestaande logica.
const NL_WORDS = [
  'het', 'een', 'van', 'voor', 'met', 'zijn', 'naar', 'ook', 'meer', 'niet',
  'onze', 'wij', 'dit', 'deze', 'waar', 'hoe', 'welke', 'jouw', 'bij', 'maar',
  'wordt', 'alle', 'over', 'nog', 'als', 'wat', 'uit', 'veel', 'door', 'bent',
  'kan', 'ons', 'heeft', 'winkelwagen', 'bestellen', 'gratis', 'bezorging',
  'producten', 'prijzen', 'zoeken', 'betalen', 'aanmelden', 'bekijk', 'korting',
  'klantenservice', 'levertijd',
]

const EN_WORDS = [
  'the', 'and', 'for', 'with', 'our', 'your', 'this', 'that', 'from', 'are',
  'was', 'been', 'have', 'has', 'will', 'can', 'you', 'they', 'which', 'about',
  'more', 'their', 'also', 'would', 'into', 'than', 'these', 'when', 'where',
  'how', 'shop', 'cart', 'checkout', 'shipping', 'products', 'pricing',
  'search', 'subscribe', 'delivery',
]

// Andere talen voor detectie. Frans is bewust WEGGELATEN zodat Belgische
// Franstalige sites door de gate komen via "twijfel = toelaten".
// Uitbreiden: voeg een entry toe met 10-20 high-frequency stopwoorden.
const OTHER_LANG_WORDS = {
  de: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'mit', 'auch', 'von', 'eine', 'einer', 'einem', 'aber', 'sind', 'wird', 'haben', 'unsere', 'sich', 'wenn', 'wie'],
  es: ['que', 'para', 'con', 'una', 'por', 'este', 'esta', 'son', 'como', 'pero', 'donde', 'nuestro', 'nuestra', 'mas', 'tambien', 'cuando', 'porque', 'hacer', 'pueden'],
  pt: ['que', 'para', 'com', 'uma', 'por', 'este', 'esta', 'sao', 'como', 'mas', 'onde', 'nosso', 'nossa', 'mais', 'tambem', 'quando', 'porque', 'fazer', 'podem'],
  it: ['che', 'per', 'con', 'una', 'sono', 'come', 'questo', 'questa', 'dove', 'nostro', 'nostra', 'piu', 'anche', 'quando', 'perche'],
  pl: ['nie', 'jest', 'sie', 'oraz', 'tego', 'jak', 'gdzie', 'nasze', 'nasza', 'wiecej', 'takze', 'kiedy', 'dlaczego'],
  cs: ['neni', 'jsou', 'jako', 'kde', 'nase', 'vice', 'take', 'kdyz', 'proc', 'jeho', 'jeji'],
  ro: ['este', 'sunt', 'sau', 'pentru', 'cum', 'unde', 'nostru', 'noastra', 'mai', 'cand'],
  tr: ['icin', 'gibi', 'nasil', 'nerede', 'bizim', 'daha', 'ayrica', 'neden'],
  id: ['untuk', 'dengan', 'yang', 'adalah', 'kami', 'lebih', 'juga', 'kapan', 'mengapa', 'dari', 'akan', 'tidak'],
}

const SAMPLE_LIMIT = 8000
const DOMINANCE_RATIO = 1.3
const MIN_OTHER_HITS = 5

function stripContent(html) {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .slice(0, SAMPLE_LIMIT)
}

function countWords(text, words) {
  let score = 0
  for (const w of words) {
    const matches = text.match(new RegExp(`\\b${w}\\b`, 'g'))
    if (matches) score += matches.length
  }
  return score
}

export function detectDominantLanguage(html) {
  const text = stripContent(html)
  if (text.length < 100) {
    return { lang: 'unknown', nlScore: 0, enScore: 0, otherLang: null, otherScore: 0, confidence: 0 }
  }
  const nlScore = countWords(text, NL_WORDS)
  const enScore = countWords(text, EN_WORDS)
  let otherLang = null
  let otherScore = 0
  for (const [lang, words] of Object.entries(OTHER_LANG_WORDS)) {
    const s = countWords(text, words)
    if (s > otherScore) {
      otherScore = s
      otherLang = lang
    }
  }
  const top = Math.max(nlScore, enScore, otherScore)
  const sorted = [nlScore, enScore, otherScore].sort((a, b) => b - a)
  const confidence = top > 0 ? (top - sorted[1]) / top : 0
  let lang = 'unknown'
  if (top === 0) lang = 'unknown'
  else if (nlScore === top) lang = 'nl'
  else if (enScore === top) lang = 'en'
  else lang = otherLang || 'unknown'
  return { lang, nlScore, enScore, otherLang, otherScore, confidence }
}

export function checkLanguageGate(html, locale = 'nl') {
  const det = detectDominantLanguage(html)
  // Block ALLEEN als andere taal duidelijk dominant boven zowel NL als EN.
  // Zwakke signalen (< MIN_OTHER_HITS) zijn nooit reden om te blokkeren.
  const blocked =
    det.otherScore >= MIN_OTHER_HITS &&
    det.otherScore > Math.max(det.nlScore, det.enScore) * DOMINANCE_RATIO
  const allowed = !blocked
  const message = locale === 'en'
    ? 'Teun.ai is optimized for the Dutch and Belgian market. This website does not appear to be Dutch or English.'
    : 'Teun.ai is geoptimaliseerd voor de Nederlandse en Belgische markt. Deze website lijkt niet Nederlands- of Engelstalig.'
  return {
    allowed,
    detectedLang: det.lang,
    confidence: det.confidence,
    reason: allowed ? null : `dominant ${det.otherLang} (nl=${det.nlScore}, en=${det.enScore}, ${det.otherLang}=${det.otherScore})`,
    message: allowed ? null : message,
  }
}

// BLOCKED_LOCATIONS — uitbreidbaar. Toevoegen: lowercase, geen accenten.
// Groepeer per land, met landnaam + bekende grote steden.
const BLOCKED_LOCATIONS = [
  // India
  'india', 'bharat',
  'mumbai', 'bombay',
  'delhi', 'new delhi',
  'bangalore', 'bengaluru',
  'kolkata', 'calcutta',
  'chennai', 'madras',
  'hyderabad', 'pune',
  'ahmedabad', 'jaipur',
  'surat', 'lucknow',
  'kanpur', 'nagpur',
  // Mexico
  'mexico', 'cdmx',
  'mexico city', 'ciudad de mexico',
  'guadalajara', 'monterrey',
  'puebla', 'tijuana', 'leon',
  'juarez', 'queretaro', 'merida',
  // VOEG HIER LATER MEER LANDEN/STEDEN TOE
]

function stripAccents(s) {
  // Strip combining-diacritics range U+0300 - U+036F na NFD-decompose.
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalizeLocation(input) {
  if (!input || typeof input !== 'string') return ''
  return stripAccents(input.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkLocationGate(locationInput, locale = 'nl') {
  const normalized = normalizeLocation(locationInput)
  if (!normalized) return { allowed: true, message: null }

  const denyNormalized = BLOCKED_LOCATIONS.map(normalizeLocation).filter(Boolean)
  const isMatch = denyNormalized.some(deny => {
    if (normalized === deny) return true
    const escaped = deny.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`).test(normalized)
  })

  if (!isMatch) return { allowed: true, message: null }

  const message = locale === 'en'
    ? 'Teun.ai is optimized for the Dutch and Belgian market and cannot generate an analysis for this location.'
    : 'Teun.ai is geoptimaliseerd voor de Nederlandse en Belgische markt en kan voor deze locatie geen analyse maken.'
  return { allowed: false, message }
}
