'use client'

import { Eye } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ClientBanner({ shares, sharedCompanies }) {
  const t = useTranslations('dashboard')

  if (!shares || shares.length === 0) return null

  const companyName = sharedCompanies[0] || t('clientBanner.defaultCompany')
  const ownerNote = shares[0]?.note

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Teun mascotte */}
        <div className="flex-shrink-0 hidden sm:block">
          <img 
            src="/images/teun-met-vergrootglas.png" 
            alt="Teun" 
            className="w-16 h-auto"
          />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-blue-900 text-sm">
              {t('clientBanner.title', { company: companyName })}
            </h3>
          </div>
          <p className="text-sm text-blue-700 leading-relaxed">
            {t.rich('clientBanner.description', {
              company: companyName,
              strong: (chunks) => <strong>{chunks}</strong>
            })}
          </p>
          {ownerNote && (
            <p className="text-xs text-blue-500 mt-1 italic">{ownerNote}</p>
          )}
        </div>

        {/* OnlineLabs branding */}
        <div className="flex-shrink-0 hidden md:flex flex-col items-center gap-1">
          <span className="text-xs text-blue-400">Powered by</span>
          <span className="text-sm font-bold text-slate-700">OnlineLabs</span>
        </div>
      </div>
    </div>
  )
}
