// app/layout.js — NIEUWE versie (minimal root)
// De meeste content is verplaatst naar app/[locale]/layout.js

import "./globals.css";
import { Nunito, Montserrat } from 'next/font/google';

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

export default function RootLayout({ children }) {
  return (
    <html className={`${nunito.variable} ${montserrat.variable}`} suppressHydrationWarning>
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
        {children}
      </body>
    </html>
  );
}
