// app/[locale]/tools/ai-visibility/layout.js

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  if (locale === 'en') {
    return {
      title: 'AI Visibility Analysis – Test for Free',
      description: 'Test FREE how often your business is mentioned in ChatGPT, Perplexity and Claude. AI-powered analysis of your visibility in AI search engines.',
      keywords: 'AI visibility, ChatGPT, Perplexity, Claude, AI search engines, GEO, AI analysis, business visibility',
      alternates: {
        canonical: `${siteUrl}/en/tools/ai-visibility`,
        languages: {
          'nl': `${siteUrl}/tools/ai-visibility`,
          'en': `${siteUrl}/en/tools/ai-visibility`,
          'x-default': `${siteUrl}/tools/ai-visibility`,
        },
      },
      openGraph: {
        title: 'AI Visibility Analysis – Test for Free | TEUN.AI',
        description: 'Test FREE how often your business is mentioned in ChatGPT, Perplexity and Claude.',
        type: 'website',
        url: `${siteUrl}/en/tools/ai-visibility`,
        locale: 'en_US',
        alternateLocale: 'nl_NL',
        images: [
          {
            url: '/AI-Zichtbaarheidsanalyse-tool.jpg',
            width: 1200,
            height: 630,
            alt: 'AI Visibility Analysis Tool',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'AI Visibility Analysis – Test for Free | TEUN.AI',
        description: 'Test FREE how often your business is mentioned in ChatGPT, Perplexity and Claude.',
        images: ['/AI-Zichtbaarheidsanalyse-tool.jpg'],
      },
    };
  }

  // Nederlands (default)
  return {
    title: 'AI Zichtbaarheidsanalyse – Test Gratis',
    description: 'Test GRATIS hoe vaak jouw bedrijf vermeld wordt in ChatGPT, Perplexity en Claude. AI-gedreven analyse van jouw zichtbaarheid in AI-zoekmachines.',
    keywords: 'AI zichtbaarheid, ChatGPT, Perplexity, Claude, AI zoekmachines, GEO, AI analyse, bedrijf vindbaarheid',
    alternates: {
      canonical: `${siteUrl}/tools/ai-visibility`,
      languages: {
        'nl': `${siteUrl}/tools/ai-visibility`,
        'en': `${siteUrl}/en/tools/ai-visibility`,
        'x-default': `${siteUrl}/tools/ai-visibility`,
      },
    },
    openGraph: {
      title: 'AI Zichtbaarheidsanalyse – Test Gratis | TEUN.AI',
      description: 'Test GRATIS hoe vaak jouw bedrijf vermeld wordt in ChatGPT, Perplexity en Claude.',
      type: 'website',
      url: `${siteUrl}/tools/ai-visibility`,
      locale: 'nl_NL',
      alternateLocale: 'en_US',
      images: [
        {
          url: '/AI-Zichtbaarheidsanalyse-tool.jpg',
          width: 1200,
          height: 630,
          alt: 'AI Zichtbaarheidsanalyse Tool',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AI Zichtbaarheidsanalyse – Test Gratis | TEUN.AI',
      description: 'Test GRATIS hoe vaak jouw bedrijf vermeld wordt in ChatGPT, Perplexity en Claude.',
      images: ['/AI-Zichtbaarheidsanalyse-tool.jpg'],
    },
  };
}

export default function AIVisibilityLayout({ children }) {
  return children;
}
