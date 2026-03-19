// app/[locale]/pricing/layout.js

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  if (locale === 'en') {
    return {
      title: 'Pricing – Teun.ai Pro | AI Visibility Platform',
      description: 'Get unlimited AI visibility scans, daily rank monitoring and competitor alerts for €49.95/month. Compare with Profound, Peec.ai, SEMrush and Ahrefs.',
      keywords: 'AI visibility pricing, GEO tool pricing, AI search monitoring, ChatGPT visibility tool, Teun.ai Pro, AI rank tracker pricing',
      alternates: {
        canonical: `${siteUrl}/en/pricing`,
        languages: {
          'nl': `${siteUrl}/pricing`,
          'en': `${siteUrl}/en/pricing`,
          'x-default': `${siteUrl}/pricing`,
        },
      },
      openGraph: {
        title: 'Pricing – Teun.ai Pro | AI Visibility Platform',
        description: 'Get unlimited AI visibility scans, daily rank monitoring and competitor alerts for €49.95/month. 6 free tools included.',
        type: 'website',
        url: `${siteUrl}/en/pricing`,
        locale: 'en_US',
        alternateLocale: 'nl_NL',
        images: [
          {
            url: '/og-pricing.jpg',
            width: 1200,
            height: 630,
            alt: 'Teun.ai Pro Pricing',
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Pricing – Teun.ai Pro | AI Visibility Platform',
        description: 'Get unlimited AI visibility scans, daily rank monitoring and competitor alerts for €49.95/month.',
        images: ['/og-pricing.jpg'],
      },
    };
  }

  // Nederlands (default)
  return {
    title: 'Prijzen – Teun.ai Pro | AI Zichtbaarheid Platform',
    description: 'Onbeperkte AI visibility scans, dagelijkse rank monitoring en concurrentie alerts voor €49,95/maand. Vergelijk met Profound, Peec.ai, SEMrush en Ahrefs.',
    keywords: 'AI zichtbaarheid prijzen, GEO tool kosten, AI search monitoring, ChatGPT visibility tool, Teun.ai Pro, AI rank tracker prijs',
    alternates: {
      canonical: `${siteUrl}/pricing`,
      languages: {
        'nl': `${siteUrl}/pricing`,
        'en': `${siteUrl}/en/pricing`,
        'x-default': `${siteUrl}/pricing`,
      },
    },
    openGraph: {
      title: 'Prijzen – Teun.ai Pro | AI Zichtbaarheid Platform',
      description: 'Onbeperkte AI visibility scans, dagelijkse rank monitoring en concurrentie alerts voor €49,95/maand. 6 gratis tools inbegrepen.',
      type: 'website',
      url: `${siteUrl}/pricing`,
      locale: 'nl_NL',
      alternateLocale: 'en_US',
      images: [
        {
          url: '/og-pricing.jpg',
          width: 1200,
          height: 630,
          alt: 'Teun.ai Pro Prijzen',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Prijzen – Teun.ai Pro | AI Zichtbaarheid Platform',
      description: 'Onbeperkte AI visibility scans, dagelijkse rank monitoring en concurrentie alerts voor €49,95/maand.',
      images: ['/og-pricing.jpg'],
    },
  };
}

export default function PricingLayout({ children }) {
  return children;
}
