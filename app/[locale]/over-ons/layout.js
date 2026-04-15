// app/[locale]/over-ons/layout.js

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  if (locale === 'en') {
    return {
      title: 'About us – SEO and AI Visibility Specialists',
      description: 'Meet the team behind Teun.ai: 25+ years of SEO expertise, 750+ projects and 3 specialists building the AI visibility platform for businesses.',
      keywords: 'Teun.ai team, AI visibility platform, OnlineLabs Amsterdam, Imre Bernath, SEO expertise, GEO optimization team',
      alternates: {
        canonical: `${siteUrl}/en/about-us`,
        languages: {
          'nl': `${siteUrl}/over-ons`,
          'en': `${siteUrl}/en/about-us`,
          'x-default': `${siteUrl}/over-ons`,
        },
      },
      openGraph: {
        title: 'About us – The Team Behind Teun.ai | AI Visibility Platform',
        description: 'Meet the team behind Teun.ai: 25+ years of SEO expertise, 750+ projects and 3 specialists building the AI visibility platform.',
        type: 'website',
        url: `${siteUrl}/en/about-us`,
        locale: 'en_US',
        alternateLocale: 'nl_NL',
        images: [{ url: '/og-over-ons.jpg', width: 1200, height: 630, alt: 'Teun.ai Team' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'About us – The Team Behind Teun.ai',
        description: 'Meet the team behind Teun.ai: 25+ years of SEO expertise and 750+ projects.',
        images: ['/og-over-ons.jpg'],
      },
    };
  }

  return {
    title: 'Over ons – SEO en AI-zichtbaarheid specialisten',
    description: 'Maak kennis met het team achter Teun.ai: 25+ jaar SEO-expertise, 750+ projecten en 3 specialisten die het AI-zichtbaarheid platform bouwen.',
    keywords: 'Teun.ai team, AI zichtbaarheid platform, OnlineLabs Amsterdam, Imre Bernath, SEO expertise, GEO optimalisatie team',
    alternates: {
      canonical: `${siteUrl}/over-ons`,
      languages: {
        'nl': `${siteUrl}/over-ons`,
        'en': `${siteUrl}/en/about-us`,
        'x-default': `${siteUrl}/over-ons`,
      },
    },
    openGraph: {
      title: 'Over ons – Het team achter Teun.ai | AI Zichtbaarheid Platform',
      description: 'Maak kennis met het team achter Teun.ai: 25+ jaar SEO-expertise, 750+ projecten en 3 specialisten.',
      type: 'website',
      url: `${siteUrl}/over-ons`,
      locale: 'nl_NL',
      alternateLocale: 'en_US',
      images: [{ url: '/og-over-ons.jpg', width: 1200, height: 630, alt: 'Teun.ai Team' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Over ons – Het team achter Teun.ai',
      description: 'Maak kennis met het team achter Teun.ai: 25+ jaar SEO-expertise en 750+ projecten.',
      images: ['/og-over-ons.jpg'],
    },
  };
}

export default function OverOnsLayout({ children }) {
  return children;
}
