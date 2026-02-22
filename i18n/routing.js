// i18n/routing.js
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // Beschikbare talen
  locales: ['nl', 'en'],

  // Nederlands is de standaardtaal
  defaultLocale: 'nl',

  // CRUCIAAL: 'as-needed' betekent:
  // - NL URLs blijven ZONDER prefix: teun.ai/blog/wat-is-geo
  // - EN URLs krijgen /en/ prefix: teun.ai/en/blog/what-is-geo
  localePrefix: 'as-needed',

  // Vertaalde URL slugs per taal
  pathnames: {
    '/privacyverklaring': {
      nl: '/privacyverklaring',
      en: '/privacy',
    },
  },
});
