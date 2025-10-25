function GEOHeroStats({ prompts, platformScans }) {
  // Calculate aggregate stats
  const stats = {
    totalPrompts: prompts.length,
    platformsActive: calculateActivePlatforms(platformScans),
    totalScans: (platformScans.perplexity?.length || 0) + (platformScans.chatgpt?.length || 0),
    overallVisibility: calculateOverallVisibility(prompts)
  }

  function calculateActivePlatforms(scans) {
    let count = 0
    if (scans.perplexity?.length > 0) count++
    if (scans.chatgpt?.length > 0) count++
    if (scans.aiOverviews?.length > 0) count++
    return count
  }

  function calculateOverallVisibility(prompts) {
    if (prompts.length === 0) return 0
    
    let foundCount = 0
    let totalChecks = 0
    
    prompts.forEach(prompt => {
      if (prompt.platforms.perplexity?.status === 'found') {
        foundCount++
        totalChecks++
      } else if (prompt.platforms.perplexity?.status === 'not_found') {
        totalChecks++
      }
      
      if (prompt.platforms.chatgpt?.status === 'found') {
        foundCount++
        totalChecks++
      } else if (prompt.platforms.chatgpt?.status === 'not_found') {
        totalChecks++
      }
    })
    
    return totalChecks > 0 ? Math.round((foundCount / totalChecks) * 100) : 0
  }

  const visibilityColor = 
    stats.overallVisibility >= 70 ? 'from-green-500 to-emerald-600' :
    stats.overallVisibility >= 40 ? 'from-yellow-500 to-orange-600' :
    'from-red-500 to-pink-600'

  return (
    <div className="relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 rounded-3xl"></div>
      
      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Content */}
      <div className="relative p-8 lg:p-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2 flex items-center gap-4">
              <span className="text-5xl">🎯</span>
              Jouw GEO Performance
            </h1>
            <p className="text-purple-100 text-lg">
              Real-time visibility across AI search platforms
            </p>
          </div>
          
          {/* Overall Score Badge */}
          <div className={`hidden lg:block px-8 py-6 bg-gradient-to-br ${visibilityColor} rounded-2xl shadow-2xl`}>
            <div className="text-white text-center">
              <div className="text-5xl font-bold mb-1">{stats.overallVisibility}%</div>
              <div className="text-sm opacity-90 font-semibold">Visibility Score</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          
          {/* Stat 1: Total Prompts */}
          <div className="bg-white/95 backdrop-blur rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all border-2 border-white/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-600 leading-tight">Commerciële Prompts</div>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">{stats.totalPrompts}</div>
            <div className="text-sm text-gray-500">Ontdekt & gescand</div>
          </div>

          {/* Stat 2: Platforms Active */}
          <div className="bg-white/95 backdrop-blur rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all border-2 border-white/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div className="text-sm font-semibold text-gray-600">AI Platforms</div>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">{stats.platformsActive}/3</div>
            <div className="text-sm text-gray-500">Actief gescand</div>
          </div>

          {/* Stat 3: Total Scans */}
          <div className="bg-white/95 backdrop-blur rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all border-2 border-white/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-sm font-semibold text-gray-600">Scans Voltooid</div>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">{stats.totalScans}</div>
            <div className="text-sm text-gray-500">Laatste 30 dagen</div>
          </div>

          {/* Stat 4: Visibility Score (mobile) */}
          <div className={`bg-gradient-to-br ${visibilityColor} rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all border-2 border-white/30`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="text-sm font-semibold text-white/90">Visibility Score</div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{stats.overallVisibility}%</div>
            <div className="text-sm text-white/80">Gemiddeld gevonden</div>
          </div>

        </div>

        {/* Progress Bar */}
        <div className="mt-8 bg-white/20 backdrop-blur rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-lg">Doel: 80% Visibility</span>
            <span className="text-white/90 font-bold">{stats.overallVisibility}% / 80%</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-4 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${visibilityColor} transition-all duration-1000 ease-out rounded-full shadow-lg`}
              style={{ width: `${Math.min(stats.overallVisibility, 100)}%` }}
            ></div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-white/80 text-sm">
            {stats.overallVisibility >= 80 ? (
              <>
                <span className="text-xl">🎉</span>
                <span>Geweldig! Je hebt je doel bereikt!</span>
              </>
            ) : (
              <>
                <span className="text-xl">💪</span>
                <span>Nog {80 - stats.overallVisibility}% te gaan naar je doel</span>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default GEOHeroStats