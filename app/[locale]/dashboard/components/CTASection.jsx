'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { ExternalLink, BookOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function CTASection() {
  const t = useTranslations('dashboard')

  return (
    <div className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] rounded-3xl overflow-hidden shadow-xl mb-8">
      <div className="grid lg:grid-cols-4 gap-0">
        {/* Content - 3 columns */}
        <div className="lg:col-span-3 p-8 sm:p-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              {t('cta.description')}
            </p>
            
            <div className="flex flex-wrap gap-4">
              <a
                href="https://www.onlinelabs.nl/skills/geo-optimalisatie"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
              >
                {t('cta.geoButton')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                <BookOpen className="w-4 h-4" />
                {t('cta.blogButton')}
              </Link>
            </div>
          </div>
        </div>

        {/* Teun Mascotte - 1 column */}
        <div className="hidden lg:flex items-center justify-center p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-l from-white/5 to-transparent"></div>
          <Image
            src="/teun-ai-mascotte.png"
            alt={t('cta.teunAlt')}
            width={200}
            height={250}
            className="drop-shadow-2xl relative z-10"
          />
        </div>
      </div>
    </div>
  )
}
