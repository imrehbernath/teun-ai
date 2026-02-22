// middleware.js (root van het project, NIET in app/)
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing, {
  // UIT: voorkomt dat Googlebot (en-US) naar /en wordt gestuurd
  // Gebruikers kiezen zelf hun taal via de language switcher
  localeDetection: false,
  alternateLinks: false,
});

// Pagina's die WEL in het Engels bestaan
const knownEnglishPaths = [
  '/en/tools',
  '/en/tools/ai-visibility',
  '/en/tools/ai-rank-tracker',
  '/en/tools/geo-audit',
  '/en/login',
  '/en/signup',
  '/en/privacy',
  '/en/dashboard',
];

export default function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware voor deze paden (geen i18n nodig)
  const skipPaths = [
    '/api/',
    '/_next/',
    '/favicon',
    '/robots',
    '/sitemap',
    '/GEO-',
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
  // NL-ONLY PAGINA'S: REDIRECT EN → NL
  // ============================================

  // /en/blog en /en/blog/* → /blog
  if (pathname === '/en/blog' || pathname.startsWith('/en/blog/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/en/', '/');
    return NextResponse.redirect(url, 301);
  }

  // /en/auteur/* → /auteur/*
  if (pathname.startsWith('/en/auteur')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/en/', '/');
    return NextResponse.redirect(url, 301);
  }

  // /en/{slug} waar slug GEEN bekende EN pagina is → redirect naar NL
  if (pathname.startsWith('/en/') && pathname !== '/en/') {
    const isKnownEnPath = knownEnglishPaths.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    );

    if (!isKnownEnPath) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace('/en/', '/');
      return NextResponse.redirect(url, 301);
    }
  }

  // Run next-intl middleware
  const response = intlMiddleware(request);

  // ============================================
  // STRIP ALLE HREFLANG LINK HEADERS
  // next-intl voegt automatisch Link headers toe voor alle locales
  // We beheren hreflang volledig zelf via page metadata
  // ============================================
  if (response?.headers) {
    response.headers.delete('link');
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next|.*\\..*).*)',
  ],
};
