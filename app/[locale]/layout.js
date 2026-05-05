// app/[locale]/layout.js
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Lora, Poppins, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { routing } from '@/i18n/routing';
import GoogleTagManager from '../components/GoogleTagManager';
import LanguageBanner from '../components/LanguageBanner';
import '../globals.css';

// Display font — Lora (italic accent voor merksterkte)
const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-lora',
  preload: true,
  adjustFontFallback: 'Times New Roman',
});

// Body font — Poppins
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
  preload: true,
  adjustFontFallback: 'Arial',
});

// Mono font — JetBrains Mono (mini-stats, mock URLs)
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
  preload: false, // mono is alleen voor labels — geen LCP impact
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
    nl: 'Gratis GEO analyse: zie wie AI aanbeveelt in jouw branche + krijg advies om hoger te scoren. Scan ChatGPT, Perplexity & Google AI in 2 min.',
    en: 'Free GEO analysis: see who AI recommends in your industry + get tips to rank higher. Scan ChatGPT, Perplexity & Google AI in 2 min.',
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
      'AI search optimization', 'GEO audit', 'AI content optimization',
    ],
    authors: [{ name: 'TEUN.AI' }],
    creator: 'TEUN.AI',
    publisher: 'TEUN.AI',
    alternates: {
      canonical: locale === 'nl' ? siteUrl : `${siteUrl}/en`,
      languages: {
        'nl-NL': siteUrl,
        'en-US': `${siteUrl}/en`,
        'x-default': siteUrl,
      },
    },
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
      url: locale === 'nl' ? siteUrl : `${siteUrl}/en`,
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
  themeColor: '#1A2B5E',
};

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${lora.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preload mascot — LCP candidate on homepage */}
        <link
          rel="preload"
          as="image"
          href="/teun-mascot.png"
          fetchPriority="high"
        />

        <link rel="preconnect" href="https://assets.teun.ai" />
        <link rel="dns-prefetch" href="https://assets.teun.ai" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-66x66.png" type="image/png" sizes="66x66" />
        <link rel="icon" href="/favicon-200x200.png" type="image/png" sizes="200x200" />
        <link rel="icon" href="/favicon-300x300.png" type="image/png" sizes="300x300" />
        <link rel="apple-touch-icon" href="/favicon-300x300.png" />

        {/* JSON-LD: Organization (sitewide) */}
        <Script
          id="schema-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://teun.ai/#organization",
              "name": "Teun.ai",
              "alternateName": "TEUN.AI",
              "url": "https://teun.ai",
              "logo": {
                "@type": "ImageObject",
                "url": "https://teun.ai/teun-mascot.png",
                "width": 440,
                "height": 440
              },
              "description": locale === 'nl'
                ? "AI-zichtbaarheidsplatform voor de Nederlandse markt. Meet hoe ChatGPT, Perplexity en Google AI jouw merk noemen."
                : "AI visibility platform for the Dutch market. Measure how ChatGPT, Perplexity and Google AI mention your brand.",
              "foundingDate": "2024",
              "founder": {
                "@type": "Person",
                "name": "Imre Bernáth",
                "url": "https://www.onlinelabs.nl",
                "jobTitle": "SEO & GEO Specialist",
                "worksFor": {
                  "@type": "Organization",
                  "name": "OnlineLabs",
                  "url": "https://www.onlinelabs.nl"
                }
              },
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Amsterdam",
                "addressCountry": "NL"
              },
              "sameAs": [
                "https://www.linkedin.com/company/onlinelabs",
                "https://x.com/onlinelabs_nl"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer support",
                "email": "hallo@teun.ai",
                "availableLanguage": ["nl", "en"]
              }
            })
          }}
        />

        {/* JSON-LD: WebSite met SearchAction */}
        <Script
          id="schema-website"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://teun.ai/#website",
              "url": "https://teun.ai",
              "name": "Teun.ai",
              "description": locale === 'nl'
                ? "AI-zichtbaarheidsplatform: ontdek hoe ChatGPT en Perplexity over jouw merk schrijven"
                : "AI visibility platform: discover how ChatGPT and Perplexity write about your brand",
              "inLanguage": locale === 'nl' ? 'nl-NL' : 'en-US',
              "publisher": {
                "@id": "https://teun.ai/#organization"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://teun.ai/tools/ai-visibility?company={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <GoogleTagManager />

        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>

        <Analytics />
        <SpeedInsights />

        {/* Crisp Chat — lazyOnload zodat het CWV niet schaadt */}
        <Script
          id="crisp-chat"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              window.$crisp=[];
              window.CRISP_WEBSITE_ID="6723e01a-7dd8-47bd-a2a2-9fb7a74fc48e";
              (function(){
                d=document;
                s=d.createElement("script");
                s.src="https://client.crisp.chat/l.js";
                s.async=1;
                d.getElementsByTagName("head")[0].appendChild(s);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
