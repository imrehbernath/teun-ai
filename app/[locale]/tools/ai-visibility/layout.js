// app/[locale]/tools/ai-visibility/layout.js

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  if (locale === 'en') {
    return {
      title: 'AI Visibility Scan – Test for Free',
      description: 'Test free how often your business is mentioned by ChatGPT, Perplexity and Google AI Mode. 10 commercial prompts, instant insight into your AI visibility.',
      keywords: 'AI visibility, AI visibility scan, ChatGPT visibility, Perplexity, Google AI Mode, GEO, generative engine optimization, business visibility, AI search engines',
      alternates: {
        canonical: `${siteUrl}/en/tools/ai-visibility`,
        languages: {
          'nl': `${siteUrl}/tools/ai-visibility`,
          'en': `${siteUrl}/en/tools/ai-visibility`,
          'x-default': `${siteUrl}/tools/ai-visibility`,
        },
      },
      openGraph: {
        title: 'AI Visibility Scan – Test for Free | TEUN.AI',
        description: 'Test free how often your business is mentioned by ChatGPT, Perplexity and Google AI Mode. 10 commercial prompts, instant insight.',
        type: 'website',
        url: `${siteUrl}/en/tools/ai-visibility`,
        locale: 'en_US',
        alternateLocale: 'nl_NL',
        images: [
          {
            url: '/AI-Zichtbaarheidsanalyse-tool.jpg',
            width: 1200,
            height: 630,
            alt: 'AI Visibility Scan Tool',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'AI Visibility Scan – Test for Free | TEUN.AI',
        description: 'Test free how often your business is mentioned by ChatGPT, Perplexity and Google AI Mode. 10 commercial prompts, instant insight.',
        images: ['/AI-Zichtbaarheidsanalyse-tool.jpg'],
      },
    };
  }

  // Nederlands (default)
  return {
    title: 'AI Zichtbaarheid Scan – Gratis Testen',
    description: 'Test gratis hoe vaak jouw bedrijf vermeld wordt door ChatGPT, Perplexity en Google AI Mode. 10 commerciële prompts, direct inzicht in je AI-zichtbaarheid.',
    keywords: 'AI zichtbaarheid, AI zichtbaarheid scan, ChatGPT vindbaarheid, Perplexity, Google AI Mode, GEO, generative engine optimization, AI zoekmachines, bedrijf vindbaarheid',
    alternates: {
      canonical: `${siteUrl}/tools/ai-visibility`,
      languages: {
        'nl': `${siteUrl}/tools/ai-visibility`,
        'en': `${siteUrl}/en/tools/ai-visibility`,
        'x-default': `${siteUrl}/tools/ai-visibility`,
      },
    },
    openGraph: {
      title: 'AI Zichtbaarheid Scan – Gratis Testen | TEUN.AI',
      description: 'Test gratis hoe vaak jouw bedrijf vermeld wordt door ChatGPT, Perplexity en Google AI Mode. 10 commerciële prompts, direct inzicht.',
      type: 'website',
      url: `${siteUrl}/tools/ai-visibility`,
      locale: 'nl_NL',
      alternateLocale: 'en_US',
      images: [
        {
          url: '/AI-Zichtbaarheidsanalyse-tool.jpg',
          width: 1200,
          height: 630,
          alt: 'AI Zichtbaarheid Scan Tool',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AI Zichtbaarheid Scan – Gratis Testen | TEUN.AI',
      description: 'Test gratis hoe vaak jouw bedrijf vermeld wordt door ChatGPT, Perplexity en Google AI Mode. 10 commerciële prompts, direct inzicht.',
      images: ['/AI-Zichtbaarheidsanalyse-tool.jpg'],
    },
  };
}

export default function AIVisibilityLayout({ children }) {
  return children;
}
