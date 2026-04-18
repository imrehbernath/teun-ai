// app/[locale]/wordpress-plugin/layout.js

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  if (locale === 'en') {
    const title = 'Free WordPress GEO Plugin: AI Visibility Optimizer';
    const description = 'Analyze how well your WordPress pages perform in AI search. 30+ GEO checks, AI bot tracking and referral analytics. Free, no API needed.';

    return {
      title: { absolute: title },
      description,
      keywords: 'WordPress GEO plugin, AI visibility, ChatGPT optimization, Perplexity SEO, AI bot tracking, GEO score, WordPress AI plugin',
      alternates: {
        canonical: `${siteUrl}/en/wordpress-plugin`,
        languages: {
          'nl': `${siteUrl}/wordpress-plugin`,
          'en': `${siteUrl}/en/wordpress-plugin`,
          'x-default': `${siteUrl}/wordpress-plugin`,
        },
      },
      openGraph: {
        title,
        description,
        type: 'website',
        url: `${siteUrl}/en/wordpress-plugin`,
        siteName: 'Teun.ai',
        locale: 'en_US',
        alternateLocale: 'nl_NL',
        images: [
          {
            url: '/wordpress-plugin-og.jpg',
            width: 1200,
            height: 630,
            alt: 'Teun.ai GEO WordPress Plugin',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ['/wordpress-plugin-og.jpg'],
      },
    };
  }

  // Nederlands (default)
  const title = 'Gratis WordPress GEO Plugin: AI Visibility Optimizer';
  const description = 'Analyseer in WordPress hoe goed je pagina\'s scoren voor AI-zoekmachines. 30+ GEO-checks, AI-bot tracking en verwijzingsanalyse. Geen API nodig.';

  return {
    title: { absolute: title },
    description,
    keywords: 'WordPress GEO plugin, AI zichtbaarheid, ChatGPT optimalisatie, Perplexity SEO, AI bot tracking, GEO score, WordPress AI plugin',
    alternates: {
      canonical: `${siteUrl}/wordpress-plugin`,
      languages: {
        'nl': `${siteUrl}/wordpress-plugin`,
        'en': `${siteUrl}/en/wordpress-plugin`,
        'x-default': `${siteUrl}/wordpress-plugin`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/wordpress-plugin`,
      siteName: 'Teun.ai',
      locale: 'nl_NL',
      alternateLocale: 'en_US',
      images: [
        {
          url: '/wordpress-plugin-og.jpg',
          width: 1200,
          height: 630,
          alt: 'Teun.ai GEO WordPress Plugin',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/wordpress-plugin-og.jpg'],
    },
  };
}

export default function WordPressPluginLayout({ children }) {
  return children;
}
