// lib/language-guard.js
// Block non-Dutch/English websites and inputs from consuming API credits

// TLDs that are clearly non-NL/EN markets
const BLOCKED_TLDS = [
  '.kr', '.jp', '.cn', '.tw', '.th', '.vn', '.id',
  '.ru', '.ua', '.by', '.kz',
  '.pl', '.cz', '.sk', '.hu', '.ro', '.bg', '.rs', '.hr', '.si', '.lt', '.lv', '.ee',
  '.tr', '.ir', '.sa', '.ae', '.il', '.eg', '.qa', '.kw',
  '.in', '.pk', '.bd', '.lk',
  '.br', '.ar', '.mx', '.cl', '.co', '.pe', '.ve',
  '.pt', '.it', '.fr', '.es', '.de', '.at', '.ch',
  '.se', '.no', '.dk', '.fi', '.is',
  '.gr', '.cy',
]

/**
 * Check if a URL belongs to a blocked (non-NL/EN) TLD
 */
export function isBlockedUrl(url) {
  if (!url) return false
  try {
    const normalized = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
    const hostname = new URL(normalized).hostname.toLowerCase()
    return BLOCKED_TLDS.some(tld => hostname.endsWith(tld))
  } catch {
    return false
  }
}

/**
 * Check if text contains non-Latin characters (Korean, Chinese, Japanese, Arabic, Cyrillic, Thai, etc.)
 * Allows Dutch/English characters: a-z, accented chars (é, ë, ü, etc.), numbers, punctuation
 */
export function hasNonLatinText(text) {
  if (!text) return false
  // Match Korean, Chinese, Japanese, Arabic, Hebrew, Thai, Devanagari, Cyrillic
  const nonLatinPattern = /[\u3000-\u9FFF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF\u0E00-\u0E7F\u0900-\u097F\u0400-\u04FF\u1100-\u11FF\u3130-\u318F\uFF00-\uFFEF]/
  return nonLatinPattern.test(text)
}

/**
 * Get bilingual error message
 */
export function getLanguageBlockError(locale = 'nl') {
  return locale === 'en'
    ? 'This tool is only available for Dutch and English websites.'
    : 'Deze tool is alleen beschikbaar voor Nederlands- en Engelstalige websites.'
}
