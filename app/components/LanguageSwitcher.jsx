// app/components/LanguageSwitcher.jsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

// NL-only paden waar geen taalswitch nodig is
const nlOnlyPrefixes = ['/blog', '/auteur'];

// Paden die per taal verschillen: NL → EN
const pathMapping = {
  '/over-ons': '/about-us',
  '/about-us': '/over-ons',
};

/**
 * LanguageSwitcher
 * @param {string} variant - 'cream' (default, voor lichte cream header) of 'dark' (voor donkere navy header)
 */
export default function LanguageSwitcher({ variant = 'cream' }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // Verberg switcher op NL-only pagina's (blog, auteur, blog post slugs)
  const knownMultiLangPaths = ['/', '/tools', '/login', '/signup', '/privacyverklaring', '/privacy', '/dashboard', '/wordpress-plugin', '/pricing', '/over-ons', '/about-us', '/updates'];
  const isNlOnlyPage = nlOnlyPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isKnownPath = knownMultiLangPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
  // Als het geen bekende multilang path is en niet de homepage → het is een blog slug
  const isBlogSlug = !isKnownPath && pathname !== '/';

  if (isNlOnlyPage || isBlogSlug) {
    return null;
  }

  const switchLocale = (newLocale) => {
    const targetPath = pathMapping[pathname] || pathname;
    router.replace(targetPath, { locale: newLocale });
  };

  // Cream variant — voor lichte (cream) header
  if (variant === 'cream') {
    return (
      <div
        style={{
          display: 'inline-flex',
          background: 'var(--bg-2, #F2ECDF)',
          borderRadius: '8px',
          padding: '3px',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '11px',
        }}
      >
        <button
          onClick={() => switchLocale('nl')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 500,
            background: locale === 'nl' ? '#fff' : 'transparent',
            color: locale === 'nl' ? 'var(--ink, #0F1730)' : 'var(--ink-3, #6B7391)',
            boxShadow: locale === 'nl' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
          aria-label="Nederlands"
        >
          NL
        </button>
        <button
          onClick={() => switchLocale('en')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 500,
            background: locale === 'en' ? '#fff' : 'transparent',
            color: locale === 'en' ? 'var(--ink, #0F1730)' : 'var(--ink-3, #6B7391)',
            boxShadow: locale === 'en' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
          aria-label="English"
        >
          EN
        </button>
      </div>
    );
  }

  // Dark variant — originele styling (voor donkere headers, behoud backwards-compat)
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
      <button
        onClick={() => switchLocale('nl')}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
          locale === 'nl'
            ? 'bg-white/20 text-white'
            : 'text-white/50 hover:text-white/80'
        }`}
        aria-label="Nederlands"
      >
        NL
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
          locale === 'en'
            ? 'bg-white/20 text-white'
            : 'text-white/50 hover:text-white/80'
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
