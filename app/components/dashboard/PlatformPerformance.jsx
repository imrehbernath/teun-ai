function PlatformPerformance({ platformScans, totalPrompts }) {
  
  const platforms = [
    {
      name: 'Perplexity',
      icon: '🔮',
      color: 'from-purple-500 to-indigo-600',
      borderColor: 'border-purple-300',
      bgColor: 'from-purple-50 to-indigo-50',
      scans: platformScans.perplexity || [],
      status: 'active',
      features: ['Commercial prompts ontdekken', 'Real-time scanning', 'E-E-A-T analyse']
    },
    {
      name: 'ChatGPT',
      icon: '🤖',
      color: 'from-blue-500 to-cyan-600',
      borderColor: 'border-blue-300',
      bgColor: 'from-blue-50 to-cyan-50',
      scans: platformScans.chatgpt || [],
      status: 'active',
      features: ['Chrome extensie', 'Position tracking', 'Response snippets']
    },
    {
      name: 'AI Overviews',
      icon: '🔍',
      color: 'from-green-500 to-emerald-600',
      borderColor: 'border-green-300',
      bgColor: 'from-green-50 to-emerald-50',
      scans: platformScans.aiOverviews || [],
      status: 'coming_soon',
      features: ['Google AI integratie', 'SERP visibility', 'Featured snippets']
    }
  ]

  const calculateStats = (scans, platform) => {
    if (platform === 'chatgpt') {
      const totalQueries = scans.reduce((sum, scan) => sum + (scan.total_queries || 0), 0)
      const foundCount = scans.reduce((sum, scan) => sum + (scan.found_count || 0), 0)
      return {
        totalScans: scans.length,
        visibility: totalQueries > 0 ? Math.round((foundCount / totalQueries) * 100) : 0,
        lastScan: scans.length > 0 ? scans[0].created_at : null
      }
    } else if (platform === 'perplexity') {
      const totalPrompts = scans.reduce((sum, scan) => sum + (scan.prompts_count || 0), 0)
      return {
        totalScans: scans.length,
        visibility: totalPrompts > 0 ? 100 : 0, // Perplexity scans are discovery-based
        lastScan: scans.length > 0 ? scans[0].created_at : null
      }
    }
    return { totalScans: 0, visibility: 0, lastScan: null }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <span className="text-3xl">📊</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Platform Performance</h2>
            <p className="text-purple-100 text-lg">
              Jouw visibility op alle AI-platforms
            </p>
          </div>
        </div>
      </div>

      {/* Platforms Grid */}
      <div className="p-8 grid md:grid-cols-3 gap-6">
        
        {platforms.map((platform) => {
          const stats = calculateStats(platform.scans, platform.name.toLowerCase().replace(' ', ''))
          const isActive = platform.status === 'active'
          const isComingSoon = platform.status === 'coming_soon'

          return (
            <div
              key={platform.name}
              className={`relative overflow-hidden rounded-2xl border-2 ${platform.borderColor} bg-gradient-to-br ${platform.bgColor} transition-all hover:shadow-xl ${isActive ? 'cursor-pointer' : ''}`}
            >
              
              {/* Coming Soon Badge */}
              {isComingSoon && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                    <span>⏳</span>
                    <span>Binnenkort</span>
                  </span>
                </div>
              )}

              <div className={`p-6 ${!isActive ? 'opacity-60' : ''}`}>
                
                {/* Platform Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-br ${platform.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <span className="text-3xl">{platform.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{platform.name}</h3>
                    <span className={`text-sm font-semibold ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                      {isActive ? '✅ Actief' : '⏳ Binnenkort'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                {isActive && stats.totalScans > 0 ? (
                  <div className="space-y-4 mb-6">
                    
                    {/* Visibility Score */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-600">Visibility Score</span>
                        <span className="text-2xl font-bold text-gray-900">{stats.visibility}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${platform.color} transition-all duration-1000`}
                          style={{ width: `${stats.visibility}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Scans Count */}
                    <div className="flex items-center justify-between p-4 bg-white/60 backdrop-blur rounded-xl">
                      <span className="text-sm font-semibold text-gray-600">Totaal Scans</span>
                      <span className="text-xl font-bold text-gray-900">{stats.totalScans}</span>
                    </div>

                    {/* Last Scan */}
                    {stats.lastScan && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>🕐</span>
                        <span>Laatste scan: {new Date(stats.lastScan).toLocaleDateString('nl-NL')}</span>
                      </div>
                    )}

                  </div>
                ) : isActive ? (
                  <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-800 font-semibold">
                      Nog geen scans uitgevoerd op dit platform
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-purple-100 border-2 border-purple-300 rounded-xl">
                    <p className="text-sm text-purple-800 font-semibold">
                      Dit platform wordt binnenkort toegevoegd!
                    </p>
                  </div>
                )}

                {/* Features */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-700 text-sm mb-3">Features:</h4>
                  {platform.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className={`${isActive ? 'text-green-500' : 'text-gray-400'}`}>
                        {isActive ? '✅' : '⏳'}
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                {isActive && (
                  <button
                    onClick={() => {
                      if (platform.name === 'Perplexity') {
                        window.location.href = '/tools/ai-visibility'
                      } else if (platform.name === 'ChatGPT') {
                        // Binnenkort - do nothing
                        return
                      }
                    }}
                    disabled={platform.name === 'ChatGPT'}
                    className={`mt-6 w-full px-4 py-3 ${
                      platform.name === 'ChatGPT'
                        ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 cursor-not-allowed'
                        : `bg-gradient-to-r ${platform.color} text-white hover:shadow-xl`
                    } rounded-xl font-bold transition-all flex items-center justify-center gap-2 relative`}
                  >
                    <span className="text-xl">▶️</span>
                    <span>Start {platform.name} Scan</span>
                    {platform.name === 'ChatGPT' && (
                      <span className="absolute -top-2 -right-2 px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg">
                        ⏳ Binnenkort
                      </span>
                    )}
                  </button>
                )}

              </div>
            </div>
          )
        })}

      </div>

      {/* Footer Info */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-t-2 border-gray-200">
        <div className="flex items-start gap-4">
          <span className="text-3xl">💡</span>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Pro Tip: Multi-Platform Strategy</h3>
            <p className="text-gray-600 leading-relaxed">
              Voor maximale GEO impact, optimaliseer je content voor <strong>alle platforms tegelijk</strong>. 
              Elke AI-zoekmachine heeft eigen algoritmes, maar dezelfde commercial prompts werken overal. 
              Start met Perplexity om prompts te ontdekken, verifieer met ChatGPT, en monitor met AI Overviews (binnenkort).
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

export default PlatformPerformance