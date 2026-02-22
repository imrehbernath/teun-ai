// app/components/LanguageSwitcher.jsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

// NL-only paden waar geen taalswitch nodig is
const nlOnlyPrefixes = ['/blog', '/auteur'];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // Verberg switcher op NL-only pagina's (blog, auteur, blog post slugs)
  // Blog post slugs staan in de root, check of het geen bekende path is
  const knownMultiLangPaths = ['/', '/tools', '/login', '/signup', '/privacyverklaring', '/privacy', '/dashboard'];
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
    router.replace(pathname, { locale: newLocale });
  };

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
