// app/[locale]/layout.js
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Nunito, Montserrat } from 'next/font/google';
import { routing } from '@/i18n/routing';
import GoogleTagManager from '../components/GoogleTagManager';
import LanguageBanner from '../components/LanguageBanner';

const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-nunito'
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat'
});

// Genereer statische params voor beide locales
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Check if we're on production
const isProduction = process.env.NEXT_PUBLIC_SITE_URL === 'https://teun.ai';

// Dynamische metadata per locale
export async function generateMetadata({ params }) {
  const { locale } = await params;

  const titles = {
    nl: {
      default: 'Teun.ai | Word jij genoemd in ChatGPT? Check het gratis',
      template: '%s | Teun.ai',
    },
    en: {
      default: 'Teun.ai | Is your business mentioned in ChatGPT? Check for free',
      template: '%s | Teun.ai',
    },
  };

  const descriptions = {
    nl: 'Gratis GEO analyse: zie wie AI aanbeveelt in jouw branche + krijg advies om hoger te scoren. Scan ChatGPT, Perplexity & Claude in 30 sec.',
    en: 'Free GEO analysis: see who AI recommends in your industry + get tips to rank higher. Scan ChatGPT, Perplexity & Claude in 30 sec.',
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';
  const ogLocale = locale === 'nl' ? 'nl_NL' : 'en_US';
  const alternateLocale = locale === 'nl' ? 'en_US' : 'nl_NL';

  return {
    metadataBase: new URL(siteUrl),
    title: titles[locale] || titles.nl,
    description: descriptions[locale] || descriptions.nl,
    keywords: [
      'GEO', 'Generative Engine Optimization', 'AI SEO',
      'ChatGPT SEO', 'Perplexity SEO', 'AI visibility',
      'AI search optimization', 'GEO audit', 'AI content optimization'
    ],
    authors: [{ name: 'TEUN.AI' }],
    creator: 'TEUN.AI',
    publisher: 'TEUN.AI',
    robots: {
      index: isProduction,
      follow: isProduction,
      googleBot: {
        index: isProduction,
        follow: isProduction,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: ogLocale,
      alternateLocale: alternateLocale,
      url: siteUrl,
      siteName: 'TEUN.AI',
      title: titles[locale]?.default || titles.nl.default,
      description: descriptions[locale] || descriptions.nl,
      images: [
        {
          url: '/GEO-insights-en-AI-SEO.webp',
          width: 1200,
          height: 630,
          alt: 'TEUN.AI - GEO Audits & AI-SEO Tools',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[locale]?.default || titles.nl.default,
      description: descriptions[locale] || descriptions.nl,
      images: ['/GEO-insights-en-AI-SEO.webp'],
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#001233',
};

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  // Stel de locale in voor statische rendering
  setRequestLocale(locale);

  // Haal vertalingen op
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${nunito.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://assets.teun.ai" />
        <link rel="dns-prefetch" href="https://assets.teun.ai" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-66x66.png" type="image/png" sizes="66x66" />
        <link rel="icon" href="/favicon-200x200.png" type="image/png" sizes="200x200" />
        <link rel="icon" href="/favicon-300x300.png" type="image/png" sizes="300x300" />
        <link rel="apple-touch-icon" href="/favicon-300x300.png" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* Google Tag Manager */}
        <GoogleTagManager />

        {/* NextIntl Provider wraps all locale-aware content */}
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
