import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Nunito, Montserrat } from 'next/font/google';
import GoogleTagManager from './components/GoogleTagManager';

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

// Check if we're on production
const isProduction = process.env.NEXT_PUBLIC_SITE_URL === 'https://teun.ai';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai'),
  
  title: {
    default: 'Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026',
    template: '%s | TEUN.AI'
  },
  
  description: 'Teun.ai: hét platform voor GEO Audits, AI-SEO analyse & AI-gedreven optimalisatie. Word zichtbaar in ChatGPT, Google AI, Bing AI & meer.',
  
  keywords: [
    'GEO',
    'Generative Engine Optimization',
    'AI SEO',
    'ChatGPT SEO',
    'Perplexity SEO',
    'AI visibility',
    'AI search optimization',
    'GEO audit',
    'AI content optimization'
  ],
  
  authors: [{ name: 'TEUN.AI' }],
  creator: 'TEUN.AI',
  publisher: 'TEUN.AI',
  
  // Conditional robots - alleen productie wordt geïndexeerd
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
    locale: 'nl_NL',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'TEUN.AI',
    title: 'Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026',
    description: 'Teun.ai: hét platform voor GEO Audits, AI-SEO analyse & AI-gedreven optimalisatie. Word zichtbaar in ChatGPT, Google AI, Bing AI & meer.',
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
    title: 'Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026',
    description: 'Teun.ai: hét platform voor GEO Audits, AI-SEO analyse & AI-gedreven optimalisatie. Word zichtbaar in ChatGPT, Google AI, Bing AI & meer.',
    images: ['/GEO-insights-en-AI-SEO.webp'],
  },
  
  // Canonical wordt per pagina ingesteld, niet globaal
  
  verification: {
    // Add later: google, bing verification codes
    // google: 'your-verification-code',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#001233',
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl" className={`${nunito.variable} ${montserrat.variable}`}>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://wordpress-988065-5905039.cloudwaysapps.com" />
        <link rel="dns-prefetch" href="https://wordpress-988065-5905039.cloudwaysapps.com" />

        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-66x66.png" type="image/png" sizes="66x66" />
        <link rel="icon" href="/favicon-200x200.png" type="image/png" sizes="200x200" />
        <link rel="icon" href="/favicon-300x300.png" type="image/png" sizes="300x300" />
        <link rel="apple-touch-icon" href="/favicon-300x300.png" />
      </head>
      <body className="antialiased">
        {/* Google Tag Manager - direct na body tag */}
        <GoogleTagManager />
        
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}