'use client';

import Script from 'next/script';

export default function GoogleTagManager() {
  // Build-time check: NODE_ENV wordt door Next.js statisch vervangen in de
  // client bundle. Dev-build krijgt geen GTM, prod-build wel. Geen runtime cost.
  if (process.env.NODE_ENV === 'development') return null;

  const GTM_ID = 'GTM-5GVDB7DK';

  return (
    <>
      {/* Google Tag Manager Script - LAZY LOADED voor performance.
          IIFE wordt geskipt wanneer middleware de gtm_optout cookie heeft
          gezet voor eigen IP's (zie middleware.js EXCLUDED_IPS). */}
      <Script
        id="google-tag-manager"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            if (document.cookie.indexOf('gtm_optout=1') === -1) {
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            }
          `,
        }}
      />

      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}