// middleware.js (root van het project, NIET in app/)
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing, {
  localeDetection: false,
  alternateLinks: false,
});

// BLOCKED_COUNTRIES — ISO 3166-1 alpha-2 landcodes. Uitbreidbaar.
const BLOCKED_COUNTRIES = ['IN'];

// EXCLUDED_IPS — eigen IP's, niet meetellen in GTM. Uitbreidbaar.
const EXCLUDED_IPS = ['62.163.105.43', '209.198.140.10'];

function getClientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || null;
}

// Cream/Lora design conform signup- en nieuwsbrief-mails. Noindex/nofollow
// zodat zoekmachines deze geo-block respons niet indexeren als ze toevallig
// vanuit een geblokkeerd land crawlen.
const GEO_BLOCK_HTML = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="googlebot" content="noindex, nofollow">
  <meta name="color-scheme" content="light only">
  <title>Teun.ai</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FAF7F2;color:#0F1730;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;-webkit-font-smoothing:antialiased}
    .card{max-width:560px;width:100%;background:#ffffff;border:1px solid rgba(15,23,48,0.08);border-radius:20px;overflow:hidden}
    .header{background:#F2ECDF;padding:36px 32px 24px;text-align:center;border-bottom:1px solid rgba(15,23,48,0.08)}
    .header img{display:block;margin:0 auto 12px;width:120px;height:auto;max-width:120px;border:0}
    .brand{font-family:'Lora',Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#1A2B5E;letter-spacing:0.2px}
    .brand .dot{color:#E8623A;font-style:italic}
    .body{padding:36px 36px 32px;text-align:center}
    h1{margin:0 0 12px;color:#0F1730;font-family:'Lora',Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;line-height:1.25;letter-spacing:-0.01em}
    h2{margin:0 0 24px;color:#3A4465;font-family:'Lora',Georgia,'Times New Roman',serif;font-size:20px;font-weight:500;line-height:1.3}
    p{margin:0 0 6px;color:#3A4465;font-size:15px;line-height:1.65}
    p.en{color:#6B7391}
    .footer{padding:20px 32px 24px;background:#FAF7F2;border-top:1px solid rgba(15,23,48,0.08);text-align:center;color:#6B7391;font-size:12px}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="https://teun.ai/teun-ai-mascotte-mail.png" alt="Teun">
      <div class="brand">Teun<span class="dot">.ai</span></div>
    </div>
    <div class="body">
      <h1>Teun.ai is niet beschikbaar in jouw land.</h1>
      <h2>Teun.ai is not available in your country.</h2>
      <p>Teun.ai richt zich op de Nederlandse en Belgische markt.</p>
      <p class="en">Teun.ai focuses on the Dutch and Belgian market.</p>
    </div>
    <div class="footer">Teun.ai, Herengracht 221, Amsterdam</div>
  </div>
</body>
</html>`;

// Pagina's die WEL in het Engels bestaan
const knownEnglishPaths = [
  '/en/tools',
  '/en/tools/ai-visibility',
  '/en/tools/ai-rank-tracker',
  '/en/tools/geo-audit',
  '/en/tools/brand-check',
  '/en/tools/ai-prompt-explorer',
  '/en/tools/ai-prompt-discovery',
  '/en/login',
  '/en/signup',
  '/en/forgot-password',
  '/en/reset-password',
  '/en/privacy',
  '/en/dashboard',
  '/en/pricing',
  '/en/wordpress-plugin',
  '/en/chrome-extension',
  '/en/about-us',
  '/en/updates',
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
    '/share/',
  ];

  if (skipPaths.some((path) => pathname.startsWith(path))) {
    return;
  }

  // Skip statische bestanden
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|woff2?)$/)) {
    return;
  }

  // ============================================
  // GEO-BLOCK
  // Geserveerd NA skipPaths zodat /robots, /sitemap, /favicon, /share,
  // /og-image en statische assets buiten de block vallen (crawlers en
  // share-previews moeten die ook vanuit geblokkeerde landen kunnen lezen).
  // API/cron/webhook zitten al uit de matcher.
  // ============================================
  const country = request.headers.get('x-vercel-ip-country');
  if (country && BLOCKED_COUNTRIES.includes(country)) {
    return new NextResponse(GEO_BLOCK_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // IP-check voor GTM-opt-out. Cookie wordt onderaan op de uiteindelijke
  // response gezet zodat hij meeg gaat in dezelfde response cycle.
  const clientIp = getClientIp(request);
  const skipGtm = clientIp && EXCLUDED_IPS.includes(clientIp);

  // ============================================
  // NL-ONLY PAGINA'S: REDIRECT EN → NL
  // ============================================

  // /en/blog en /en/blog/* → /blog
  if (pathname === '/en/blog' || pathname.startsWith('/en/blog/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/en/', '/');
    return NextResponse.redirect(url, 301);
  }

  // /en/over-ons → /en/about-us
  if (pathname === '/en/over-ons') {
    const url = request.nextUrl.clone();
    url.pathname = '/en/about-us';
    return NextResponse.redirect(url, 301);
  }

  // /about-us → /over-ons (NL only)
  if (pathname === '/about-us') {
    const url = request.nextUrl.clone();
    url.pathname = '/over-ons';
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

  // ============================================
  // FORCEER NL VOOR NIET-EN PADEN
  // next-intl checkt NEXT_LOCALE cookie vóór Accept-Language
  // Door deze cookie te injecteren voorkomt we /en redirects
  // voor Googlebot en andere en-US clients
  // ============================================
  if (!pathname.startsWith('/en')) {
    // Altijd NL forceren voor root paden, ook als cookie al op 'en' staat
    request.cookies.set('NEXT_LOCALE', 'nl');
  }

  // Run next-intl middleware
  const response = intlMiddleware(request);

  // Strip alle hreflang Link headers
  if (response?.headers) {
    response.headers.delete('link');
  }

  // GTM-opt-out cookie voor eigen IP's. Lazy-loaded GTM-script leest deze
  // cookie en skipt zichzelf. Geen impact op normale bezoekers want zonder
  // match wordt er geen Set-Cookie header gestuurd.
  if (skipGtm && response?.cookies) {
    response.cookies.set('gtm_optout', '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/((?!api|auth|_next|.*\\..*).*)',
  ],
};
