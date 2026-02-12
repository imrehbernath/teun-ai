export const metadata = {
  title: 'Gratis GEO Audit Tool — Test je AI-zichtbaarheid live',
  description: 'Analyseer hoe goed jouw pagina vindbaar is in ChatGPT, Perplexity en Google AI. Inclusief live test, technische check, E-E-A-T analyse en concrete aanbevelingen. Gratis, geen account nodig.',
  keywords: ['GEO audit', 'AI-zichtbaarheid', 'generative engine optimization', 'Perplexity SEO', 'ChatGPT optimalisatie', 'Google AI Overviews', 'AI zoekresultaten', 'GEO analyse tool', 'AI vindbaarheid testen'],
  openGraph: {
    title: 'Gratis GEO Audit — Wordt jouw bedrijf gevonden door AI?',
    description: 'Test direct of jouw pagina verschijnt in AI-antwoorden. Live Perplexity test, technische analyse en concrete verbeterpunten. Gratis in 30 seconden.',
    url: 'https://teun.ai/geo-audit',
    siteName: 'Teun.ai',
    type: 'website',
    locale: 'nl_NL',
    images: [
      {
        url: 'https://teun.ai/images/og-geo-audit.png',
        width: 1200,
        height: 630,
        alt: 'Teun.ai Gratis GEO Audit Tool - Test je AI-zichtbaarheid',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gratis GEO Audit — Wordt jouw bedrijf gevonden door AI?',
    description: 'Test direct of jouw pagina verschijnt in AI-antwoorden. Live Perplexity test + concrete verbeterpunten.',
    images: ['https://teun.ai/images/og-geo-audit.png'],
  },
  alternates: {
    canonical: 'https://teun.ai/geo-audit',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function GeoAuditLayout({ children }) {
  return children
}
