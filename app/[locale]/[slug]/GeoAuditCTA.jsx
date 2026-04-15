'use client';

import { useTranslations } from 'next-intl';

export default function GeoAuditCTA() {
  const t = useTranslations('blogPost');

  return (
    <div className="mt-16 bg-gradient-to-br from-slate-50 via-white to-blue-50 border border-slate-200 rounded-2xl p-8 text-center">
      <h3 className="text-2xl font-bold text-slate-900 mb-4">
        {t('ctaTitle')}
      </h3>
      <p className="text-slate-600 mb-3 text-lg">
        {t('ctaDescription')}
      </p>
      <p className="text-slate-400 text-sm mb-8">
        Liever hulp? OnlineLabs helpt je met professionele GEO-optimalisatie.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#1E1E3F] text-[#1E1E3F] rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          Lite, €29,95/mnd
        </a>
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Pro, €49,95/mnd
        </a>
      </div>
      <div className="flex flex-wrap justify-center gap-6 mt-6">
        <a href="/tools/ai-visibility" className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
          Gratis scan starten →
        </a>
        <a href="https://www.onlinelabs.nl/skills/geo-optimalisatie" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-700 text-sm transition-colors">
          GEO door OnlineLabs →
        </a>
      </div>
      <p className="text-slate-400 text-xs mt-6">Geen creditcard nodig voor gratis account. Maandelijks opzegbaar. Prijzen excl. BTW.</p>
    </div>
  );
}
