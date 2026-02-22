// middleware.js (root van het project, NIET in app/)
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing, {
  // Detecteer browser-taal voor eerste bezoek
  localeDetection: true,
});

export default function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware voor deze paden (geen i18n nodig)
  const skipPaths = [
    '/api/',
    '/_next/',
    '/favicon',
    '/robots',
    '/sitemap',
    '/GEO-',        // statische images
    '/og-image',
    '/Teun-ai-logo',
  ];

  if (skipPaths.some((path) => pathname.startsWith(path))) {
    return;
  }

  // Skip statische bestanden
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|woff2?)$/)) {
    return;
  }

  // ============================================
  // BLOG IS ALLEEN BESCHIKBAAR IN HET NEDERLANDS
  // Redirect /en/blog en /en/blog/* naar /en
  // ============================================
  if (pathname === '/en/blog' || pathname.startsWith('/en/blog/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/en';
    return NextResponse.redirect(url, 301);
  }

  return intlMiddleware(request);
}

export const config = {
  // Match alle paden behalve _next, api, en statische bestanden
  matcher: [
    // Match root
    '/',
    // Match alles behalve _next, api, en bestanden met extensie
    '/((?!api|_next|.*\\..*).*)',
  ],
};
