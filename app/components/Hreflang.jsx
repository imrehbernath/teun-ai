// app/components/Hreflang.jsx
// Genereert hreflang tags zodat Google de juiste taalversie toont per pagina.
//
// GEBRUIK: Voeg alternates toe in de generateMetadata() van elke page.js:
//
//   import { getHreflangAlternates } from '@/app/components/Hreflang';
//
//   export async function generateMetadata({ params }) {
//     const { locale } = await params;
//     return {
//       alternates: getHreflangAlternates('/blog/wat-is-geo', '/en/blog/what-is-geo'),
//     };
//   }
//
// Voor pagina's met dezelfde slug (tools, dashboard):
//   alternates: getHreflangAlternates('/tools/ai-visibility'),
//   → genereert automatisch /en/tools/ai-visibility

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

/**
 * Genereer hreflang alternates voor Next.js metadata
 * 
 * @param {string} nlPath - Nederlands pad (zonder prefix), bijv. '/blog/wat-is-geo'
 * @param {string} [enPath] - Engels pad (optioneel). Als niet opgegeven: /en/ + nlPath
 * @returns {object} alternates object voor Next.js metadata
 */
export function getHreflangAlternates(nlPath, enPath) {
  // Als geen apart Engels pad, gebruik /en/ + NL pad
  const resolvedEnPath = enPath || `/en${nlPath === '/' ? '' : nlPath}`;
  const resolvedNlPath = nlPath === '/' ? '' : nlPath;

  return {
    canonical: `${SITE_URL}${resolvedNlPath}`,
    languages: {
      'nl': `${SITE_URL}${resolvedNlPath}`,
      'en': `${SITE_URL}${resolvedEnPath}`,
      'x-default': `${SITE_URL}${resolvedNlPath}`,
    },
  };
}

/**
 * Voor Engelse pagina's: draai canonical en hreflang om
 */
export function getHreflangAlternatesEN(enPath, nlPath) {
  const resolvedNlPath = nlPath || enPath.replace(/^\/en/, '') || '/';
  const resolvedNlUrl = resolvedNlPath === '/' ? SITE_URL : `${SITE_URL}${resolvedNlPath}`;

  return {
    canonical: `${SITE_URL}${enPath}`,
    languages: {
      'nl': resolvedNlUrl,
      'en': `${SITE_URL}${enPath}`,
      'x-default': resolvedNlUrl,
    },
  };
}
