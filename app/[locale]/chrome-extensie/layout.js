// app/[locale]/chrome-extensie/layout.js

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  if (locale === 'en') {
    const title = 'Chrome Extension: ChatGPT Visibility Scanner for Teun.ai';
    const description = 'Measure in real time how your business is found in ChatGPT. Free Chrome extension, no API key needed, results 1-on-1 with ChatGPT.com.';

    return {
      title: { absolute: title },
      description,
      keywords: 'Chrome extension, ChatGPT visibility, ChatGPT scanner, AI visibility, GEO, Teun.ai extension, ChatGPT rank tracker',
      alternates: {
        canonical: `${siteUrl}/en/chrome-extension`,
        languages: {
          'nl': `${siteUrl}/chrome-extensie`,
          'en': `${siteUrl}/en/chrome-extension`,
          'x-default': `${siteUrl}/chrome-extensie`,
        },
      },
      openGraph: {
        title,
        description,
        type: 'website',
        url: `${siteUrl}/en/chrome-extension`,
        siteName: 'Teun.ai',
        locale: 'en_US',
        alternateLocale: 'nl_NL',
        images: [
          {
            url: '/chrome-extensie-og.jpg',
            width: 1200,
            height: 630,
            alt: 'Teun.ai ChatGPT Visibility Chrome Extension',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ['/chrome-extensie-og.jpg'],
      },
    };
  }

  // Nederlands (default)
  const title = 'Chrome extensie: ChatGPT Visibility Scanner voor Teun.ai';
  const description = 'Meet real-time hoe jouw bedrijf gevonden wordt in ChatGPT. Gratis Chrome extensie, geen API-sleutel nodig, resultaten 1-op-1 met ChatGPT.com.';

  return {
    title: { absolute: title },
    description,
    keywords: 'Chrome extensie, ChatGPT zichtbaarheid, ChatGPT scanner, AI zichtbaarheid, GEO, Teun.ai extensie, ChatGPT rank tracker',
    alternates: {
      canonical: `${siteUrl}/chrome-extensie`,
      languages: {
        'nl': `${siteUrl}/chrome-extensie`,
        'en': `${siteUrl}/en/chrome-extension`,
        'x-default': `${siteUrl}/chrome-extensie`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/chrome-extensie`,
      siteName: 'Teun.ai',
      locale: 'nl_NL',
      alternateLocale: 'en_US',
      images: [
        {
          url: '/chrome-extensie-og.jpg',
          width: 1200,
          height: 630,
          alt: 'Teun.ai ChatGPT Visibility Chrome Extensie',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/chrome-extensie-og.jpg'],
    },
  };
}

export default function ChromeExtensieLayout({ children }) {
  return children;
}
