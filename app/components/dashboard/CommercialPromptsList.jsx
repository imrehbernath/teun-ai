'use client'

import { useState } from 'react'

function CommercialPromptsList({ prompts, onSelectPrompt }) {
  const [expandedPrompts, setExpandedPrompts] = useState(new Set())
  const [copiedPrompt, setCopiedPrompt] = useState(null)

  const toggleExpand = (promptText) => {
    const newExpanded = new Set(expandedPrompts)
    if (newExpanded.has(promptText)) {
      newExpanded.delete(promptText)
    } else {
      newExpanded.add(promptText)
    }
    setExpandedPrompts(newExpanded)
  }

  const copyPrompt = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPrompt(text)
      setTimeout(() => setCopiedPrompt(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'perplexity': return '🔮'
      case 'chatgpt': return '🤖'
      case 'aiOverviews': return '🔍'
      default: return '❓'
    }
  }

  const getStatusBadge = (status, position = null) => {
    switch(status) {
      case 'found':
        return (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold flex items-center gap-1">
              ✅ Gevonden
            </span>
            {position && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                #{position}
              </span>
            )}
          </div>
        )
      case 'not_found':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold flex items-center gap-1">
            ❌ Niet gevonden
          </span>
        )
      case 'coming_soon':
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold flex items-center gap-1">
            ⏳ Binnenkort
          </span>
        )
      case 'unknown':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold flex items-center gap-1">
            ➖ Niet gescand
          </span>
        )
      default:
        return null
    }
  }

  if (prompts.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-3xl">💬</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Commercial Prompts</h2>
              <p className="text-purple-100 text-lg">
                {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} • Multi-platform visibility
              </p>
            </div>
          </div>
          
          {/* Platform Legend */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <span className="text-xl">🔮</span>
              <span>Perplexity</span>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <span className="text-xl">🤖</span>
              <span>ChatGPT</span>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <span className="text-xl">🔍</span>
              <span>AI Overviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prompts List */}
      <div className="divide-y-2 divide-gray-100">
        {prompts.map((prompt, index) => {
          const isExpanded = expandedPrompts.has(prompt.text)
          const hasSnippet = prompt.platforms.chatgpt?.snippet

          return (
            <div 
              key={`${prompt.text}-${index}`}
              className="p-6 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all"
            >
              
              {/* Prompt Header */}
              <div className="flex items-start gap-4">
                
                {/* Number Badge */}
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {index + 1}
                </div>

                {/* Prompt Content */}
                <div className="flex-1 min-w-0">
                  
                  {/* Prompt Text + Copy Button */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex-1">
                      "{prompt.text}"
                    </h3>
                    
                    <button
                      onClick={() => copyPrompt(prompt.text)}
                      className="flex-shrink-0 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 font-semibold text-sm"
                    >
                      {copiedPrompt === prompt.text ? (
                        <>
                          <span>✅</span>
                          <span>Gekopieerd!</span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>Kopieer</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Company Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold flex items-center gap-2">
                      <span>🏢</span>
                      <span>{prompt.company}</span>
                    </span>
                    <span className="text-gray-400 text-sm">
                      • Gescand {new Date(prompt.scannedAt).toLocaleDateString('nl-NL')}
                    </span>
                  </div>

                  {/* Platform Status Grid */}
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    
                    {/* Perplexity */}
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-bold text-gray-900">
                          <span className="text-2xl">🔮</span>
                          <span>Perplexity</span>
                        </div>
                      </div>
                      {getStatusBadge(prompt.platforms.perplexity?.status)}
                    </div>

                    {/* ChatGPT */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-bold text-gray-900">
                          <span className="text-2xl">🤖</span>
                          <span>ChatGPT</span>
                        </div>
                      </div>
                      {getStatusBadge(
                        prompt.platforms.chatgpt?.status,
                        prompt.platforms.chatgpt?.position
                      )}
                    </div>

                    {/* AI Overviews */}
                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-bold text-gray-900">
                          <span className="text-2xl">🔍</span>
                          <span>AI Overviews</span>
                        </div>
                      </div>
                      {getStatusBadge(prompt.platforms.aiOverviews?.status)}
                    </div>

                  </div>

                  {/* Expandable Snippet Section */}
                  {hasSnippet && (
                    <>
                      <button
                        onClick={() => toggleExpand(prompt.text)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 rounded-xl font-semibold text-purple-900 transition-all flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xl">{isExpanded ? '🔽' : '▶️'}</span>
                          <span>ChatGPT Response Snippet</span>
                        </span>
                        <span className="text-sm opacity-70 group-hover:opacity-100">
                          {isExpanded ? 'Verberg' : 'Toon details'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-4 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-blue-200">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-2xl">💬</span>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">ChatGPT Zei:</h4>
                              <p className="text-gray-700 leading-relaxed">
                                "{prompt.platforms.chatgpt.snippet}"
                              </p>
                            </div>
                          </div>
                          
                          {prompt.platforms.chatgpt.position && (
                            <div className="mt-3 pt-3 border-t-2 border-blue-200 flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-semibold">Positie in resultaat:</span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                                #{prompt.platforms.chatgpt.position}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      disabled
                      className="px-5 py-3 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 rounded-xl font-bold cursor-not-allowed flex items-center gap-2 relative"
                    >
                      <span className="text-xl">🚀</span>
                      <span>Optimaliseer Deze Prompt</span>
                      <span className="absolute -top-2 -right-2 px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg">
                        ⏳ Binnenkort
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        // Re-scan this specific prompt
                        alert('Scan functionaliteit komt binnenkort! 🔄')
                      }}
                      className="px-5 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                      <span className="text-xl">🔄</span>
                      <span>Scan Opnieuw</span>
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h3 className="font-bold text-xl mb-1">Wil je meer prompts ontdekken?</h3>
            <p className="text-purple-100">Start een nieuwe AI Visibility scan om meer commercial prompts te vinden</p>
          </div>
          <button
            onClick={() => window.location.href = '/tools/ai-visibility'}
            className="px-6 py-3 bg-white text-purple-700 rounded-xl font-bold hover:shadow-2xl transition-all flex items-center gap-2"
          >
            <span className="text-xl">🔍</span>
            <span>Start Nieuwe Scan</span>
          </button>
        </div>
      </div>

    </div>
  )
}

export default CommercialPromptsList