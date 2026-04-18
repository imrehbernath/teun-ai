import { getLocale } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'AI Prompt Discovery: find your AI prompts in Search Console'
    : 'AI Prompt Discovery: vind je AI-prompts in Search Console';
  const description = isEn
    ? 'Connect Google Search Console and find in 30 seconds which commercial and AI Overview prompts already lead to your website. Free tool by Teun.ai.'
    : 'Koppel Google Search Console en vind in 30 seconden welke commerciele en AI Overview prompts al naar je website leiden. Gratis tool van Teun.ai.';
  const url = isEn
    ? 'https://teun.ai/en/tools/ai-prompt-discovery'
    : 'https://teun.ai/tools/ai-prompt-discovery';

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: isEn
      ? ['AI prompt discovery', 'AI prompts Google Search Console', 'AI Mode queries', 'Google AI Overview prompts', 'AI visibility prompts', 'GEO prompt tracking', 'conversational search queries', 'AI search visibility']
      : ['AI prompt discovery', 'AI-prompts Search Console', 'Google AI Mode queries', 'AI Overview prompts', 'AI-zichtbaarheid prompts', 'GEO prompt tracking', 'conversationele zoekopdrachten', 'AI zoekzichtbaarheid'],
    openGraph: {
      title,
      description,
      url,
      siteName: 'Teun.ai',
      type: 'website',
      locale: isEn ? 'en_GB' : 'nl_NL',
      images: [{ url: 'https://teun.ai/images/og-prompt-discovery.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['https://teun.ai/images/og-prompt-discovery.png'] },
    alternates: {
      canonical: url,
      languages: { nl: 'https://teun.ai/tools/ai-prompt-discovery', en: 'https://teun.ai/en/tools/ai-prompt-discovery' },
    },
    robots: { index: true, follow: true },
  };
}

export default function PromptDiscoveryLayout({ children }) {
  return children;
}
