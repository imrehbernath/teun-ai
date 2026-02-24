import { getLocale } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'AI Rank Tracker – Free Position Check'
    : 'AI Rank Tracker – Gratis Positie Check';
  const description = isEn
    ? 'Free AI Rank Tracker: check your business position in ChatGPT and Perplexity. Track AI rankings by keyword and location. Results in 15 seconds.'
    : 'Gratis AI Rank Tracker: check je bedrijfspositie in ChatGPT en Perplexity. Monitor AI-rankings per zoekwoord en locatie. Resultaat in 15 seconden.';
  const url = isEn
    ? 'https://teun.ai/en/tools/ai-rank-tracker'
    : 'https://teun.ai/tools/ai-rank-tracker';

  return {
    title,
    description,
    keywords: isEn
      ? ['AI rank tracker', 'free AI rank tracking tool', 'GEO rank tracker', 'ChatGPT ranking', 'Perplexity ranking', 'AI position check', 'AI search rankings', 'generative search monitoring', 'AI visibility tracking', 'competitor analysis AI', 'track AI rankings free']
      : ['AI rank tracker', 'gratis AI rank tracker', 'GEO rank tracker', 'ChatGPT ranking checken', 'Perplexity ranking', 'AI positie check', 'AI zoekposities', 'generatieve zoekmachine monitoring', 'AI zichtbaarheid tracking', 'concurrentie analyse AI', 'AI ranking gratis checken'],
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
