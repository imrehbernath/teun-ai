// app/[locale]/wordpress-plugin/layout.js

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  if (locale === 'en') {
    return {
      title: 'Free WordPress GEO Plugin – AI Visibility Optimizer',
      description: 'Analyze how well your WordPress pages perform in AI search engines. 30+ GEO checks, AI bot tracking and referral analytics. Free, no API needed.',
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
        title: 'Free WordPress GEO Plugin – AI Visibility Optimizer | Teun.ai',
        description: 'Analyze how well your WordPress pages perform in AI search engines. 30+ GEO checks, AI bot tracking and referral analytics.',
        type: 'website',
        url: `${siteUrl}/en/wordpress-plugin`,
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
        title: 'Free WordPress GEO Plugin – AI Visibility Optimizer | Teun.ai',
        description: 'Analyze how well your WordPress pages perform in AI search engines. 30+ GEO checks, AI bot tracking and referral analytics.',
        images: ['/wordpress-plugin-og.jpg'],
      },
    };
  }

  // Nederlands (default)
  return {
    title: 'Gratis WordPress GEO Plugin – AI Visibility Optimizer',
    description: 'Analyseer direct in WordPress hoe goed je pagina\'s scoren voor AI-zoekmachines. 30+ GEO checks, AI-bot tracking en verwijzingsanalyse. Gratis, geen API nodig.',
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
      title: 'Gratis WordPress GEO Plugin – AI Visibility Optimizer | Teun.ai',
      description: 'Analyseer direct in WordPress hoe goed je pagina\'s scoren voor AI-zoekmachines. 30+ GEO checks, AI-bot tracking en verwijzingsanalyse.',
      type: 'website',
      url: `${siteUrl}/wordpress-plugin`,
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
      title: 'Gratis WordPress GEO Plugin – AI Visibility Optimizer | Teun.ai',
      description: 'Analyseer direct in WordPress hoe goed je pagina\'s scoren voor AI-zoekmachines. 30+ GEO checks, AI-bot tracking en verwijzingsanalyse.',
      images: ['/wordpress-plugin-og.jpg'],
    },
  };
}

export default function WordPressPluginLayout({ children }) {
  return children;
}
