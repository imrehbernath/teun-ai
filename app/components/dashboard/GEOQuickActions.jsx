function GEOQuickActions({ hasPrompts, onRefresh }) {
  
  if (!hasPrompts) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🚀</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            Klaar om te starten?
          </h2>
          <p className="text-blue-100 text-lg mb-6 max-w-2xl mx-auto">
            Begin met het ontdekken van commercial prompts waar jouw bedrijf gevonden kan worden
          </p>
          <button
            onClick={() => window.location.href = '/tools/ai-visibility'}
            className="px-8 py-4 bg-white text-indigo-700 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all inline-flex items-center gap-3"
          >
            <span className="text-2xl">🔍</span>
            <span>Ontdek Commercial Prompts</span>
            <span className="text-xl">→</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      
      {/* Action Card 1: GEO Optimization - HIGH PRIORITY */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border-2 border-green-300 shadow-lg hover:shadow-2xl transition-all">
        
        {/* High Priority Badge */}
        <div className="absolute top-6 right-6">
          <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
            <span>🔥</span>
            <span>High Priority</span>
          </span>
        </div>

        <div className="p-8">
          
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <span className="text-4xl">🚀</span>
          </div>

          {/* Content */}
          <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>Verbeter Je Visibility Met 40%</span>
          </h3>
          
          <p className="text-gray-700 mb-6 leading-relaxed">
            Onze GEO analyse toont aan dat je visibility gemiddeld met 40% kan verbeteren door 
            technische en content optimalisaties.
          </p>

          {/* Features */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-600">✅</span>
              <span>E-E-A-T scoring</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-600">✅</span>
              <span>Technische SEO analyse</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-600">✅</span>
              <span>Content aanbevelingen</span>
            </div>
          </div>

          {/* CTA Button - BINNENKORT */}
          <div className="relative">
            <button
              disabled
              className="w-full px-6 py-4 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 rounded-2xl font-bold cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl sm:text-2xl">🎯</span>
                <span className="text-base sm:text-lg">Start GEO Audit</span>
              </div>
            </button>
            <span className="absolute -top-2 -right-2 px-2 sm:px-3 py-1 bg-purple-600 text-white rounded-full text-xs sm:text-sm font-bold shadow-lg whitespace-nowrap">
              ⏳ Binnenkort
            </span>
          </div>

        </div>
      </div>

      {/* Action Card 2: More Prompts Discovery */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl border-2 border-purple-300 shadow-lg hover:shadow-2xl transition-all">
        
        <div className="p-8">
          
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <span className="text-4xl">💬</span>
          </div>

          {/* Content */}
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-tight">
            Ontdek Meer Commerciële Prompts
          </h3>
          
          <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
            Hoe meer prompts je ontdekt, hoe beter je GEO strategie. Scan opnieuw voor nieuwe 
            commerciële queries in jouw niche.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white/60 backdrop-blur rounded-xl text-center">
              <div className="text-2xl font-bold text-purple-700">2-3x</div>
              <div className="text-xs text-gray-600 mt-1">Meer prompts mogelijk</div>
            </div>
            <div className="p-4 bg-white/60 backdrop-blur rounded-xl text-center">
              <div className="text-2xl font-bold text-purple-700">5 min</div>
              <div className="text-xs text-gray-600 mt-1">Per scan</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/tools/ai-visibility'}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-bold text-base sm:text-lg hover:shadow-2xl transition-all flex items-center justify-center gap-3"
            >
              <span className="text-xl sm:text-2xl">🔍</span>
              <span className="whitespace-nowrap">Scan Perplexity Opnieuw</span>
            </button>
            
            <div className="relative">
              <button
                disabled
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 rounded-2xl font-bold cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="text-lg sm:text-xl">🤖</span>
                <span className="text-sm sm:text-base">Scan ChatGPT</span>
              </button>
              <span className="absolute -top-2 -right-2 px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                ⏳ Binnenkort
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}

export default GEOQuickActions