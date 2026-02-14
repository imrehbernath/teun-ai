export const metadata = {
  title: 'AI Rank Tracker – Gratis Positie Check',
  description: 'Wordt jouw bedrijf aanbevolen door ChatGPT en Perplexity? Check je positie gratis met de AI Rank Tracker. Resultaat in 15 sec, geen account nodig.',
  keywords: 'AI rank tracker, ChatGPT ranking, Perplexity ranking, AI positie check, AI zichtbaarheid, GEO, bedrijf ranking AI',
  openGraph: {
    title: 'AI Rank Tracker – Gratis Positie Check | Teun.ai',
    description: 'Wordt jouw bedrijf aanbevolen door ChatGPT en Perplexity? Check je positie gratis met de AI Rank Tracker. Resultaat in 15 sec.',
    type: 'website',
    url: 'https://teun.ai/tools/ai-rank-tracker',
    images: [
      {
        url: '/AI-Rank-Tracker-og.jpg',
        width: 1200,
        height: 630,
        alt: 'AI Rank Tracker – Check je positie in ChatGPT en Perplexity',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Rank Tracker – Gratis Positie Check | Teun.ai',
    description: 'Wordt jouw bedrijf aanbevolen door ChatGPT en Perplexity? Check je positie gratis met de AI Rank Tracker. Resultaat in 15 sec.',
    images: ['/AI-Rank-Tracker-og.jpg'],
  },
  alternates: {
    canonical: 'https://teun.ai/tools/ai-rank-tracker',
  },
};

export default function AIRankTrackerLayout({ children }) {
  return children;
}
