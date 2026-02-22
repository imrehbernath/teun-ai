'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { Search, TrendingUp, ExternalLink, Globe, Zap, BarChart3, AlertCircle, X, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function EmptyState({ userName }) {
  const t = useTranslations('dashboard')
  const [showGeoPopup, setShowGeoPopup] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{t('empty.dashboardTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('empty.welcome', { name: userName ? `, ${userName}` : '' })} 👋</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="grid lg:grid-cols-5 gap-0">
            
            {/* Content - 3 columns */}
            <div className="lg:col-span-3 p-8 sm:p-12">
              <div className="w-16 h-16 bg-gradient-to-br from-[#1E1E3F] to-[#2D2D5F] rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <Search className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                {t('empty.heroTitle')}
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t('empty.heroDescription')}
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link
                  href="/tools/ai-visibility"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold text-lg hover:shadow-xl transition-all cursor-pointer"
                >
                  <Search className="w-5 h-5" />
                  {t('empty.startScan')}
                </Link>
                <button
                  onClick={() => setShowGeoPopup(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold text-lg hover:shadow-xl transition-all cursor-pointer"
                >
                  <TrendingUp className="w-5 h-5" />
                  {t('empty.geoAnalysis')}
                </button>
              </div>

              {/* Feature Pills */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t('empty.featurePlatforms')}</p>
                    <p className="text-xs text-slate-500">{t('empty.featurePlatformsDesc')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t('empty.featureSpeed')}</p>
                    <p className="text-xs text-slate-500">{t('empty.featureSpeedDesc')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t('empty.featureFree')}</p>
                    <p className="text-xs text-slate-500">{t('empty.featureFreeDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Teun Mascotte - 2 columns */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-10 right-10 w-40 h-40 bg-blue-200 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 left-10 w-32 h-32 bg-indigo-200 rounded-full blur-3xl"></div>
              </div>
              
              <div className="text-center relative z-10">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt={t('empty.teunAlt')}
                  width={260}
                  height={330}
                  className="drop-shadow-2xl mx-auto"
                  priority
                />
                <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm">
                  <p className="text-slate-800 font-medium">
                    {t('empty.teunGreeting')}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    {t('empty.teunSubtext')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">{t('empty.howTitle')}</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 font-bold text-xl">
                1
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">{t('empty.step1Title')}</h4>
              <p className="text-sm text-slate-600">{t('empty.step1Desc')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600 font-bold text-xl">
                2
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">{t('empty.step2Title')}</h4>
              <p className="text-sm text-slate-600">{t('empty.step2Desc')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 font-bold text-xl">
                3
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">{t('empty.step3Title')}</h4>
              <p className="text-sm text-slate-600">{t('empty.step3Desc')}</p>
            </div>
          </div>
        </div>

        {/* Scan Limits Info */}
        <div className="mt-12 bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="text-center">
            <h3 className="font-bold text-slate-900 mb-2">📊 {t('empty.limitsTitle')}</h3>
            <div className="flex flex-col sm:flex-row justify-center gap-6 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <span className="text-slate-500">👤</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900">{t('empty.notLoggedIn')}</p>
                  <p className="text-sm text-slate-500">{t('empty.notLoggedInLimit')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">✔</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900">{t('empty.loggedIn')}</p>
                  <p className="text-sm text-slate-500">{t('empty.loggedInLimit')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GEO Analyse Popup */}
      {showGeoPopup && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowGeoPopup(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t('empty.popupTitle')}</h3>
              <p className="text-slate-600 mb-6">{t('empty.popupDesc')}</p>
              
              <div className="space-y-2 mb-6 text-left">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700">Perplexity — {t('empty.notScanned')}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700">ChatGPT — {t('empty.notScanned')}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700">Google AI Modus — {t('empty.notScanned')}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700">Google AI Overviews — {t('empty.notScanned')}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGeoPopup(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  {t('empty.close')}
                </button>
                <Link
                  href="/tools/ai-visibility"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-medium hover:shadow-lg transition text-center cursor-pointer"
                >
                  {t('empty.startScanShort')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
