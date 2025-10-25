'use client'

import { useRouter } from 'next/navigation'

export default function QuickActions({ recentScans, onRefresh }) {
  const router = useRouter()

  // Find the most recent scan with prompts
  const latestScanWithPrompts = recentScans?.find(
    scan => scan.commercial_prompts?.length > 0 && !scan.geo_id
  )

  if (!latestScanWithPrompts) {
    return null
  }

  const handleOptimize = () => {
    const params = new URLSearchParams({
      source: latestScanWithPrompts.ai_scan_id || '',
      keyword: latestScanWithPrompts.keyword || '',
      company: latestScanWithPrompts.company_name || '',
      prompts: JSON.stringify(latestScanWithPrompts.commercial_prompts || []),
      prompts_count: latestScanWithPrompts.prompts_count || 0,
      auto_filled: 'true'
    })

    router.push(`/tools/geo-optimalisatie?${params.toString()}`)
  }

  const promptCount = latestScanWithPrompts.prompts_count || latestScanWithPrompts.commercial_prompts?.length || 0

  return (
    <div className="mb-8 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-3xl p-8 border-2 border-purple-400 shadow-2xl relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1">
          {/* Icon and Title */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-4xl">💬</span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white mb-1">
                {promptCount} Commerciële Prompts Gevonden!
              </h3>
              <p className="text-purple-100 text-lg">
                voor <span className="font-bold text-white">{latestScanWithPrompts.company_name}</span>
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-white text-lg leading-relaxed mb-6 max-w-2xl">
            Je AI Visibility scan heeft <span className="font-bold">{promptCount} vragen</span> ontdekt die mensen aan AI-zoekmachines stellen over jouw bedrijf. 
            Optimaliseer nu om <span className="font-bold">beter gevonden te worden!</span>
          </p>

          {/* CTA Button */}
          <button
            onClick={handleOptimize}
            className="px-8 py-4 bg-white text-purple-700 rounded-2xl font-bold text-lg hover:bg-purple-50 transition-all hover:shadow-2xl flex items-center gap-3 group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">✨</span>
            <span>Start GEO Optimalisatie</span>
            <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Decorative Icon */}
        <div className="hidden lg:block">
          <div className="w-32 h-32 rounded-3xl bg-white bg-opacity-10 backdrop-blur-sm flex items-center justify-center">
            <span className="text-7xl">💡</span>
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 mt-6 pt-6 border-t border-white border-opacity-20">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6 text-purple-200">
            <span className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span>Focus op AI antwoorden</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span>Automatisch ingevuld</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <span>Direct van start</span>
            </span>
            <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border-2 border-purple-300">
              <span className="text-lg">🤖</span>
              <span className="font-bold text-purple-700">ChatGPT scan: Binnenkort!</span>
            </span>
          </div>
          <button
            onClick={onRefresh}
            className="text-white hover:text-purple-200 font-semibold transition-colors"
          >
            🔄 Vernieuw
          </button>
        </div>
      </div>
    </div>
  )
}