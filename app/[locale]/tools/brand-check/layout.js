import { getLocale } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'AI Brand Check - What does AI say about your business?'
    : 'AI Brand Check - Wat zegt AI over jouw bedrijf?';
  const description = isEn
    ? 'Check for free what ChatGPT and Perplexity say about your brand. 6 AI checks, sentiment analysis and concrete improvement tips. Result in 30 seconds.'
    : 'Check gratis wat ChatGPT en Perplexity over jouw merk zeggen. 6 AI-checks, sentimentanalyse en concrete verbeterpunten. Resultaat in 30 seconden.';
  const url = isEn
    ? 'https://teun.ai/en/tools/brand-check'
    : 'https://teun.ai/tools/brand-check';

  return {
    title,
    description,
    keywords: isEn
      ? ['AI brand check', 'brand mentions AI', 'AI reputation check', 'AI brand perception', 'ChatGPT brand perception', 'AI sentiment analysis', 'what does ChatGPT say about my business', 'brand visibility AI', 'AI reputation management']
      : ['AI brand check', 'AI merkperceptie', 'AI reputatie check', 'wat zegt ChatGPT over mijn bedrijf', 'hoe praat AI over mijn merk', 'AI sentimentanalyse', 'merk zichtbaarheid AI', 'brand mentions AI', 'AI reputatie'],
    openGraph: {
      title,
      description,
      url,
      siteName: 'Teun.ai',
      type: 'website',
      locale: isEn ? 'en_GB' : 'nl_NL',
      images: [{ url: 'https://teun.ai/images/og-brand-check.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['https://teun.ai/images/og-brand-check.png'] },
    alternates: {
      canonical: url,
      languages: { nl: 'https://teun.ai/tools/brand-check', en: 'https://teun.ai/en/tools/brand-check' },
    },
    robots: { index: true, follow: true },
  };
}

export default function BrandCheckLayout({ children }) {
  return children;
}
