import { getLocale } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'Free GEO Audit — Test your AI visibility live'
    : 'Gratis GEO Audit — Test je AI-zichtbaarheid live';
  const description = isEn
    ? 'Test for free if your page is found by AI. Live Perplexity test, technical analysis and actionable recommendations. Results in 30 seconds.'
    : 'Test gratis of jouw pagina gevonden wordt door AI. Live Perplexity test, technische analyse en concrete aanbevelingen. Resultaat in 30 seconden.';
  const url = isEn
    ? 'https://teun.ai/en/tools/geo-audit'
    : 'https://teun.ai/tools/geo-audit';

  return {
    title,
    description,
    keywords: isEn
      ? ['GEO audit', 'AI visibility', 'generative engine optimization', 'Perplexity SEO', 'ChatGPT optimization', 'Google AI Overviews', 'AI search results', 'GEO analysis tool', 'AI findability test']
      : ['GEO audit', 'AI-zichtbaarheid', 'generative engine optimization', 'Perplexity SEO', 'ChatGPT optimalisatie', 'Google AI Overviews', 'AI zoekresultaten', 'GEO analyse tool', 'AI vindbaarheid testen'],
    openGraph: {
      title: isEn
        ? 'Free GEO Audit — Is your business found by AI?'
        : 'Gratis GEO Audit — Wordt jouw bedrijf gevonden door AI?',
      description: isEn
        ? 'Test directly if your page appears in AI answers. Live Perplexity test, technical analysis and actionable improvements. Free in 30 seconds.'
        : 'Test direct of jouw pagina verschijnt in AI-antwoorden. Live Perplexity test, technische analyse en concrete verbeterpunten. Gratis in 30 seconden.',
      url,
      siteName: 'Teun.ai',
      type: 'website',
      locale: isEn ? 'en_GB' : 'nl_NL',
      images: [
        {
          url: 'https://teun.ai/images/og-geo-audit.png',
          width: 1200,
          height: 630,
          alt: isEn
            ? 'Teun.ai Free GEO Audit Tool - Test your AI visibility'
            : 'Teun.ai Gratis GEO Audit Tool - Test je AI-zichtbaarheid',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: isEn
        ? 'Free GEO Audit — Is your business found by AI?'
        : 'Gratis GEO Audit — Wordt jouw bedrijf gevonden door AI?',
      description: isEn
        ? 'Test directly if your page appears in AI answers. Live Perplexity test + actionable improvements.'
        : 'Test direct of jouw pagina verschijnt in AI-antwoorden. Live Perplexity test + concrete verbeterpunten.',
      images: ['https://teun.ai/images/og-geo-audit.png'],
    },
    alternates: {
      canonical: url,
      languages: {
        nl: 'https://teun.ai/tools/geo-audit',
        en: 'https://teun.ai/en/tools/geo-audit',
      },
    },
    robots: { index: true, follow: true },
  };
}

export default function GeoAuditLayout({ children }) {
  return children;
}
