'use client'

import { ChevronRight, Chrome, ExternalLink, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ExtensionPromo({ onShowInstructions }) {
  const t = useTranslations('dashboard')
  const chromeStoreUrl = 'https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk'

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 border border-green-200 shadow-sm">
          <Chrome className="w-7 h-7 text-green-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-500" />
            {t('extension.title')}
          </h3>
          <p className="text-slate-600 text-sm">
            {t('extension.description')}
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href={chromeStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all cursor-pointer whitespace-nowrap"
          >
            {t('extension.install')}
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={onShowInstructions}
            className="inline-flex items-center gap-1 px-4 py-2.5 bg-white border border-green-200 text-green-700 rounded-xl font-medium hover:bg-green-50 transition-all cursor-pointer"
          >
            Info
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
