import { getLocale } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'AI Rank Tracker – Free Position Check'
    : 'AI Rank Tracker – Gratis Positie Check';
  const description = isEn
    ? 'Is your business recommended by ChatGPT and Perplexity? Check your position for free with the AI Rank Tracker. Results in 15 sec, no account needed.'
    : 'Wordt jouw bedrijf aanbevolen door ChatGPT en Perplexity? Check je positie gratis met de AI Rank Tracker. Resultaat in 15 sec, geen account nodig.';
  const url = isEn
    ? 'https://teun.ai/en/tools/ai-rank-tracker'
    : 'https://teun.ai/tools/ai-rank-tracker';

  return {
    title,
    description,
    keywords: isEn
      ? 'AI rank tracker, ChatGPT ranking, Perplexity ranking, AI position check, AI visibility, GEO, business ranking AI'
      : 'AI rank tracker, ChatGPT ranking, Perplexity ranking, AI positie check, AI zichtbaarheid, GEO, bedrijf ranking AI',
    openGraph: {
      title: `${title} | Teun.ai`,
      description,
      type: 'website',
      url,
      images: [
        {
          url: '/AI-Rank-Tracker-og.jpg',
          width: 1200,
          height: 630,
          alt: isEn
            ? 'AI Rank Tracker – Check your position in ChatGPT and Perplexity'
            : 'AI Rank Tracker – Check je positie in ChatGPT en Perplexity',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Teun.ai`,
      description,
      images: ['/AI-Rank-Tracker-og.jpg'],
    },
    alternates: {
      canonical: url,
      languages: {
        nl: 'https://teun.ai/tools/ai-rank-tracker',
        en: 'https://teun.ai/en/tools/ai-rank-tracker',
      },
    },
  };
}

export default function AIRankTrackerLayout({ children }) {
  return children;
}
