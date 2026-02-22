// app/components/LanguageBanner.jsx
'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

export default function LanguageBanner() {
  const locale = useLocale();
  const t = useTranslations('languageBanner');
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check of de banner al is gesloten (per sessie)
    const dismissed = sessionStorage.getItem('lang-banner-dismissed');
    if (dismissed) return;

    // Detecteer browser-taal
    const browserLang = navigator.language?.toLowerCase() || '';

    // Toon banner als browser-taal niet matcht met huidige locale
    if (locale === 'nl' && !browserLang.startsWith('nl')) {
      // Nederlandse pagina, niet-Nederlandse browser → toon EN banner
      setVisible(true);
    } else if (locale === 'en' && browserLang.startsWith('nl')) {
      // Engelse pagina, Nederlandse browser → toon NL banner
      setVisible(true);
    }
  }, [locale]);

  const handleSwitch = () => {
    const targetLocale = locale === 'nl' ? 'en' : 'nl';
    router.replace(pathname, { locale: targetLocale });
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('lang-banner-dismissed', 'true');
  };

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        <span className="flex-1">{t('message')}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSwitch}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md font-medium transition-colors text-xs sm:text-sm whitespace-nowrap"
          >
            {t('switchButton')}
          </button>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white transition-colors"
            aria-label={t('dismiss')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
