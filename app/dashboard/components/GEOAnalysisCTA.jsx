'use client'

import Link from 'next/link'
import { BarChart3, FileText, Zap, ChevronRight } from 'lucide-react'

// ============================================
// GEO ANALYSIS CTA - Add to Dashboard
// ============================================

export default function GEOAnalysisCTA() {
  return (
    <div className="mt-8 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] rounded-2xl p-6 md:p-8 text-white">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Icon */}
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
        
        {/* Content */}
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl md:text-2xl font-bold mb-2">
            GEO Pro Analyse
          </h3>
          <p className="text-white/80 text-sm md:text-base mb-4">
            Volledige AI-zichtbaarheid analyse met Search Console data, 
            pagina scanner, GEO checklist en professioneel rapport.
          </p>
          
          {/* Features */}
          <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm">
              <FileText className="w-4 h-4" /> CSV Upload
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm">
              <Zap className="w-4 h-4" /> AI Analyse
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm">
              📄 Word Rapport
            </span>
          </div>
        </div>
        
        {/* CTA Button */}
        <Link
          href="/dashboard/geo-analyse"
          className="flex items-center gap-2 px-6 py-3 bg-white text-[#1E1E3F] font-semibold rounded-xl hover:shadow-lg transition-all hover:scale-105"
        >
          Start Analyse
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  )
}
