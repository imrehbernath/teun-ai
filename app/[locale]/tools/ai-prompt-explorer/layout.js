import { getLocale } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'AI Prompt Explorer – Free AI Search Volume Tool'
    : 'AI Prompt Explorer – Gratis AI-zoekvolume Tool';
  const description = isEn
    ? 'Which prompts do your customers use on ChatGPT, Perplexity & Google AI Mode? 50+ prompts with AI search volumes and competitor insights. Free.'
    : 'Welke prompts gebruiken jouw klanten op ChatGPT, Perplexity & Google AI Mode? 50+ prompts met AI-zoekvolumes en concurrentie-inzicht. Gratis.';
  const url = isEn
    ? 'https://teun.ai/en/tools/ai-prompt-explorer'
    : 'https://teun.ai/tools/ai-prompt-explorer';

  return {
    title,
    description,
    keywords: isEn
      ? ['AI prompt explorer', 'AI search volume tool', 'ChatGPT prompts discover', 'AI keyword research', 'generative engine optimization tool', 'GEO tool', 'AI visibility prompts', 'ChatGPT search volume', 'Perplexity prompt research', 'Google AI Mode prompts', 'free AI SEO tool', 'AI prompt discovery']
      : ['AI prompt explorer', 'AI-zoekvolume tool', 'ChatGPT prompts vinden', 'AI zoekwoorden onderzoek', 'generative engine optimization tool', 'GEO tool', 'AI zichtbaarheid prompts', 'ChatGPT zoekvolume', 'Perplexity prompt onderzoek', 'Google AI Mode prompts', 'gratis AI SEO tool', 'AI prompt analyse', 'welke vragen stelt men aan AI'],
    openGraph: {
      title: `${title} | Teun.ai`,
      description,
      type: 'website',
      url,
      images: [
        {
          url: '/AI-Prompt-Explorer-og.jpg',
          width: 1200,
          height: 630,
          alt: isEn
            ? 'AI Prompt Explorer – What do your customers ask AI?'
            : 'AI Prompt Explorer – Welke prompts gebruiken jouw klanten?',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Teun.ai`,
      description,
      images: ['/AI-Prompt-Explorer-og.jpg'],
    },
    alternates: {
      canonical: url,
      languages: {
        nl: 'https://teun.ai/tools/ai-prompt-explorer',
        en: 'https://teun.ai/en/tools/ai-prompt-explorer',
      },
    },
  };
}

export default function AIPromptExplorerLayout({ children }) {
  return children;
}
