'use client'

import { useState } from 'react'

function ScanTimeline({ perplexityScans, chatgptScans }) {
  const [expandedScan, setExpandedScan] = useState(null)
  
  // Combine and sort all scans by date
  const allScans = [
    ...perplexityScans.map(scan => ({ ...scan, type: 'perplexity' })),
    ...chatgptScans.map(scan => ({ ...scan, type: 'chatgpt' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (allScans.length === 0) {
    return null
  }

  const getScanIcon = (type) => {
    return type === 'perplexity' ? '🔮' : '🤖'
  }

  const getScanColor = (type) => {
    return type === 'perplexity' 
      ? 'from-purple-500 to-indigo-600' 
      : 'from-blue-500 to-cyan-600'
  }

  const getScanBg = (type) => {
    return type === 'perplexity'
      ? 'from-purple-50 to-indigo-50'
      : 'from-blue-50 to-cyan-50'
  }

  const getScanBorder = (type) => {
    return type === 'perplexity'
      ? 'border-purple-300'
      : 'border-blue-300'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleExpand = (scanId) => {
    setExpandedScan(expandedScan === scanId ? null : scanId)
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-3xl">📈</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Scan Geschiedenis</h2>
              <p className="text-gray-300 text-lg">
                {allScans.length} scan{allScans.length !== 1 ? 's' : ''} • Chronologisch overzicht
              </p>
            </div>
          </div>
          
          {/* Platform Filter Badge */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold flex items-center gap-2">
              <span>🔮</span>
              <span>{perplexityScans.length} Perplexity</span>
            </span>
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold flex items-center gap-2">
              <span>🤖</span>
              <span>{chatgptScans.length} ChatGPT</span>
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-8">
        <div className="relative">
          
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-300 via-blue-300 to-transparent"></div>

          {/* Scan Items */}
          <div className="space-y-6">
            {allScans.map((scan, index) => {
              const isExpanded = expandedScan === scan.id
              const isPerpexity = scan.type === 'perplexity'
              
              return (
                <div key={scan.id} className="relative pl-20">
                  
                  {/* Timeline Dot */}
                  <div className={`absolute left-0 top-4 w-16 h-16 bg-gradient-to-br ${getScanColor(scan.type)} rounded-xl flex items-center justify-center shadow-xl border-4 border-white`}>
                    <span className="text-3xl">{getScanIcon(scan.type)}</span>
                  </div>

                  {/* Scan Card */}
                  <div 
                    className={`bg-gradient-to-br ${getScanBg(scan.type)} rounded-2xl border-2 ${getScanBorder(scan.type)} overflow-hidden hover:shadow-xl transition-all`}
                  >
                    
                    {/* Card Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-gray-900">
                              {scan.company_name || scan.keyword}
                            </h3>
                            <span className={`px-3 py-1 ${isPerpexity ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'} rounded-full text-sm font-bold`}>
                              {isPerpexity ? 'Perplexity' : 'ChatGPT'}
                            </span>
                          </div>
                          <p className="text-gray-600 flex items-center gap-2">
                            <span>🕐</span>
                            <span>{formatDate(scan.created_at)}</span>
                          </p>
                        </div>
                        
                        {/* Stats Badge */}
                        {scan.type === 'chatgpt' && (
                          <div className="text-center">
                            <div className={`text-3xl font-bold ${
                              scan.found_count && scan.total_queries 
                                ? (scan.found_count / scan.total_queries) >= 0.7 ? 'text-green-600'
                                : (scan.found_count / scan.total_queries) >= 0.4 ? 'text-yellow-600'
                                : 'text-red-600'
                                : 'text-gray-400'
                            }`}>
                              {scan.total_queries > 0 
                                ? `${Math.round((scan.found_count / scan.total_queries) * 100)}%`
                                : 'N/A'
                              }
                            </div>
                            <div className="text-xs text-gray-600">Visibility</div>
                          </div>
                        )}
                        
                        {scan.type === 'perplexity' && (
                          <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">
                              {scan.prompts_count || 0}
                            </div>
                            <div className="text-xs text-gray-600">Prompts</div>
                          </div>
                        )}
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {scan.type === 'chatgpt' ? (
                          <>
                            <div className="p-3 bg-white/60 backdrop-blur rounded-lg text-center">
                              <div className="text-xl font-bold text-gray-900">{scan.total_queries || 0}</div>
                              <div className="text-xs text-gray-600">Queries</div>
                            </div>
                            <div className="p-3 bg-white/60 backdrop-blur rounded-lg text-center">
                              <div className="text-xl font-bold text-green-700">{scan.found_count || 0}</div>
                              <div className="text-xs text-gray-600">Gevonden</div>
                            </div>
                            <div className="p-3 bg-white/60 backdrop-blur rounded-lg text-center">
                              <div className="text-xl font-bold text-blue-700">{scan.successful_queries || 0}</div>
                              <div className="text-xs text-gray-600">Succesvol</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-3 bg-white/60 backdrop-blur rounded-lg text-center">
                              <div className="text-xl font-bold text-purple-700">{scan.prompts_count || 0}</div>
                              <div className="text-xs text-gray-600">Prompts</div>
                            </div>
                            <div className="p-3 bg-white/60 backdrop-blur rounded-lg text-center">
                              <div className="text-xl font-bold text-green-700">✅</div>
                              <div className="text-xs text-gray-600">Ontdekt</div>
                            </div>
                            <div className="p-3 bg-white/60 backdrop-blur rounded-lg text-center">
                              <div className="text-xl font-bold text-blue-700">🔮</div>
                              <div className="text-xs text-gray-600">Perplexity</div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => toggleExpand(scan.id)}
                        className={`w-full px-4 py-3 bg-gradient-to-r ${getScanColor(scan.type)} text-white rounded-xl font-bold hover:shadow-xl transition-all flex items-center justify-between`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xl">{isExpanded ? '🔽' : '▶️'}</span>
                          <span>{isExpanded ? 'Verberg Details' : 'Bekijk Details'}</span>
                        </span>
                        <span className="text-sm opacity-80">
                          {scan.type === 'perplexity' ? `${scan.prompts_count} prompts` : `${scan.total_queries} queries`}
                        </span>
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-0">
                        <div className="p-6 bg-white/80 backdrop-blur rounded-xl border-2 border-white">
                          
                          {scan.type === 'perplexity' && scan.commercial_prompts && (
                            <div>
                              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-xl">💬</span>
                                <span>Commercial Prompts ({scan.commercial_prompts.length})</span>
                              </h4>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {scan.commercial_prompts.map((prompt, idx) => (
                                  <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200 flex items-start gap-3">
                                    <span className="font-bold text-purple-600">{idx + 1}.</span>
                                    <span className="text-gray-700 flex-1">"{prompt}"</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {scan.type === 'chatgpt' && (
                            <div>
                              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-xl">📊</span>
                                <span>Scan Resultaten</span>
                              </h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                  <span className="font-semibold text-gray-700">Status:</span>
                                  <span className={`px-4 py-2 rounded-full font-bold ${
                                    scan.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {scan.status === 'completed' ? '✅ Voltooid' : '⏳ Bezig'}
                                  </span>
                                </div>
                                
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                  <p className="text-gray-700 text-sm leading-relaxed">
                                    Deze scan heeft <strong>{scan.total_queries} queries</strong> getest in ChatGPT. 
                                    Jouw bedrijf werd <strong>{scan.found_count}x gevonden</strong> ({Math.round((scan.found_count / scan.total_queries) * 100)}% visibility).
                                    {scan.successful_queries === scan.total_queries && (
                                      <span className="block mt-2 text-green-700 font-semibold">
                                        ✅ Alle queries succesvol uitgevoerd!
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-gray-100 to-blue-50 px-8 py-6 border-t-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-gray-700">
            <p className="font-semibold">
              📊 Totaal: {allScans.length} scan{allScans.length !== 1 ? 's' : ''} • 
              {' '}🔮 {perplexityScans.length} Perplexity • 
              {' '}🤖 {chatgptScans.length} ChatGPT
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Vernieuwen</span>
          </button>
        </div>
      </div>

    </div>
  )
}

export default ScanTimeline