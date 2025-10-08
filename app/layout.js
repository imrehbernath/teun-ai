import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Nunito } from 'next/font/google';

const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-nunito'
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://preview.teun.ai'),
  
  title: {
    default: 'TEUN.AI - GEO Audits & AI-SEO Tools',
    template: '%s | TEUN.AI'
  },
  
  description: 'Het eerste SEO tool platform voor AI zoekmachines in Nederland. GEO Audits, AI-SEO analyse en optimalisatie voor ChatGPT, Google AI, Perplexity en meer.',
  
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
  
  robots: {
    index: process.env.NEXT_PUBLIC_SITE_URL?.includes('preview') ? false : true,
    follow: process.env.NEXT_PUBLIC_SITE_URL?.includes('preview') ? false : true,
    noindex: process.env.NEXT_PUBLIC_SITE_URL?.includes('preview') ? true : false,
    nofollow: process.env.NEXT_PUBLIC_SITE_URL?.includes('preview') ? true : false,
    googleBot: {
      index: process.env.NEXT_PUBLIC_SITE_URL?.includes('preview') ? false : true,
      follow: process.env.NEXT_PUBLIC_SITE_URL?.includes('preview') ? false : true,
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
    title: 'TEUN.AI - GEO Audits & AI-SEO Tools',
    description: 'Het eerste SEO tool platform voor AI zoekmachines in Nederland',
    images: [
      {
        url: '/Teun.ai-socials.jpg',
        width: 1200,
        height: 630,
        alt: 'TEUN.AI - GEO Audits & AI-SEO Tools',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'TEUN.AI - GEO Audits & AI-SEO Tools',
    description: 'Het eerste SEO tool platform voor AI zoekmachines in Nederland',
    images: ['/og-image.png'],
  },
  
  alternates: {
    canonical: '/',
  },
  
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
    <html lang="nl" className={nunito.variable}>
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
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}