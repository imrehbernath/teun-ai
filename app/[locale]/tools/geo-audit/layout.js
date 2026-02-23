import { getLocale } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'Free GEO Audit - Does AI mention your business?'
    : 'Gratis GEO Audit - Noemt AI jouw bedrijf?';
  const description = isEn
    ? 'Scan your page for AI visibility. 20+ checks, live Perplexity test and actionable recommendations. See instantly if AI mentions your business.'
    : 'Scan je pagina gratis op AI-zichtbaarheid. 20+ checks, live Perplexity test en concrete aanbevelingen. Zie direct of AI jouw bedrijf noemt.';
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
      title,
      description,
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
      title,
      description,
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
