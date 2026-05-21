// Pulls the most useful 2-4 word noun phrases from a Dutch commercial prompt
// so we can ask Search Console which queries from those phrases actually drive
// impressions to the matching page. Caps at 3 keywords to keep API volume sane.

const STOPWORDS = new Set([
  'zoek', 'welk', 'welke', 'wat', 'hoe', 'waar', 'wie', 'wanneer', 'waarom',
  'het', 'de', 'een', 'in', 'met', 'voor', 'van', 'op', 'te', 'en', 'of',
  'dat', 'dit', 'die', 'deze', 'om', 'naar', 'bij', 'aan', 'uit', 'over',
  'mijn', 'jouw', 'je', 'jij', 'u', 'ze', 'hij', 'zij', 'ons', 'onze',
  'er', 'is', 'zijn', 'was', 'waren', 'ben', 'bent', 'word', 'wordt',
  'kan', 'kunnen', 'moet', 'moeten', 'wil', 'willen', 'mag', 'mogen',
  'beste', 'goede', 'goed', 'top', 'meest', 'meer', 'minder',
  'vind', 'vinden', 'zoekt', 'zoeken', 'gespecialiseerd', 'gespecialiseerde',
  'combineert', 'biedt', 'aanbiedt', 'doet', 'helpt', 'maakt', 'levert',
  'hebben', 'heeft', 'hebt', 'krijg', 'krijgen',
  'echt', 'ook', 'wel', 'niet', 'geen', 'al', 'nog', 'nu', 'dan',
  'als', 'zoals', 'door', 'tot', 'tegen', 'tussen', 'binnen',
])

// Words that LOOK like stopwords but matter for B2B local search.
// Eg 'amsterdam' (location) or 'b2b' (segment). Anything 4+ chars or that
// contains a digit is kept by default; this list just safeguards short ones.
const FORCE_KEEP = new Set([
  'b2b', 'b2c', 'saas', 'mkb', 'kmo', 'pme',
])

function tokenise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[?.,!:;()"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function isContentWord(word) {
  if (!word) return false
  if (FORCE_KEEP.has(word)) return true
  if (STOPWORDS.has(word)) return false
  if (word.length < 3) return false
  return true
}

// Build 2-4 word windows of consecutive content words. Stopwords act as
// boundaries: "online marketing bureau in amsterdam" yields
// ["online marketing bureau", "amsterdam"] not "bureau in amsterdam".
function buildPhrases(tokens) {
  const phrases = []
  let run = []
  for (const t of tokens) {
    if (isContentWord(t)) {
      run.push(t)
    } else {
      if (run.length) {
        phrases.push(run)
        run = []
      }
    }
  }
  if (run.length) phrases.push(run)

  const out = []
  for (const run of phrases) {
    // 2-4 word phrases first (more specific), then single words as fallback.
    for (let size = Math.min(4, run.length); size >= 1; size--) {
      for (let i = 0; i + size <= run.length; i++) {
        out.push(run.slice(i, i + size).join(' '))
      }
    }
  }
  return out
}

// Score: prefer longer phrases, prefer phrases earlier in the prompt.
function scorePhrase(phrase, indexInList) {
  const wordCount = phrase.split(' ').length
  // Strong preference for 2-4 word phrases.
  const sizeScore = wordCount === 1 ? 0.5 : wordCount
  // Light positional bonus so the first useful phrase wins ties.
  const positionScore = Math.max(0, 5 - indexInList) * 0.1
  return sizeScore + positionScore
}

export function extractKeywordsFromPrompt(promptText, { max = 5 } = {}) {
  const tokens = tokenise(promptText)
  if (!tokens.length) return []

  const allPhrases = buildPhrases(tokens)
  if (!allPhrases.length) return []

  // Rank by score, dedupe, prefer multi-word over their single-word substrings.
  const scored = allPhrases.map((p, i) => ({ phrase: p, score: scorePhrase(p, i) }))
  scored.sort((a, b) => b.score - a.score)

  const picked = []
  const pickedWords = new Set()
  for (const { phrase } of scored) {
    if (picked.length >= max) break
    if (picked.includes(phrase)) continue
    // Skip if every word is already covered by an earlier (longer) pick.
    const words = phrase.split(' ')
    if (words.every(w => pickedWords.has(w))) continue
    picked.push(phrase)
    words.forEach(w => pickedWords.add(w))
  }
  return picked
}
