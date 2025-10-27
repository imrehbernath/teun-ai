'use client'

import { useMemo } from 'react'

function CompetitorsLeaderboard({ prompts, userCompany }) {
  // Process all competitors from all prompts
  const competitorStats = useMemo(() => {
    // Safety check
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return {
        competitors: [],
        totalPrompts: 0,
        userMentions: 0,
        userVisibilityScore: 0
      }
    }

    const stats = new Map()
    let totalPrompts = prompts.length
    let userMentions = 0

    prompts.forEach(prompt => {
      // Count user mentions
      if (prompt.platforms.perplexity?.status === 'found' || 
          prompt.platforms.chatgpt?.status === 'found') {
        userMentions++
      }

      // Count competitor mentions from Perplexity
      if (prompt.platforms.perplexity?.competitors) {
        prompt.platforms.perplexity.competitors.forEach(competitor => {
          if (!stats.has(competitor)) {
            stats.set(competitor, {
              name: competitor,
              mentions: 0,
              prompts: []
            })
          }
          const stat = stats.get(competitor)
          stat.mentions++
          stat.prompts.push(prompt.text)
        })
      }

      // Count competitor mentions from ChatGPT (if available)
      if (prompt.platforms.chatgpt?.competitors) {
        prompt.platforms.chatgpt.competitors.forEach(competitor => {
          if (!stats.has(competitor)) {
            stats.set(competitor, {
              name: competitor,
              mentions: 0,
              prompts: []
            })
          }
          const stat = stats.get(competitor)
          stat.mentions++
          if (!stat.prompts.includes(prompt.text)) {
            stat.prompts.push(prompt.text)
          }
        })
      }
    })

    // Convert to array and sort by mentions
    const sorted = Array.from(stats.values())
      .map(stat => ({
        ...stat,
        visibilityScore: Math.round((stat.mentions / totalPrompts) * 100)
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10) // Top 10

    return {
      competitors: sorted,
      totalPrompts,
      userMentions,
      userVisibilityScore: Math.round((userMentions / totalPrompts) * 100)
    }
  }, [prompts, userCompany])

  if (competitorStats.competitors.length === 0) {
    return null
  }

  const getRankEmoji = (index) => {
    switch(index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `#${index + 1}`
    }
  }

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-red-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-yellow-600'
  }

  const getScoreBg = (score) => {
    if (score >= 70) return 'bg-red-100'
    if (score >= 40) return 'bg-orange-100'
    return 'bg-yellow-100'
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <span className="text-3xl">🏆</span>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Concurrent Analyse</h2>
            <p className="text-orange-100 text-sm sm:text-lg">
              Top {competitorStats.competitors.length} concurrenten • {competitorStats.totalPrompts} prompts geanalyseerd
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        
        {/* Your Position */}
        <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏢</span>
              <div>
                <h3 className="font-bold text-xl text-gray-900">Jouw Positie</h3>
                <p className="text-gray-600 text-sm">{userCompany}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {competitorStats.userVisibilityScore}%
              </div>
              <div className="text-sm text-gray-600">visibility score</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-semibold">📍 Genoemd in:</span>
            <span>{competitorStats.userMentions} van {competitorStats.totalPrompts} prompts</span>
          </div>

          {competitorStats.competitors.length > 0 && competitorStats.userVisibilityScore < competitorStats.competitors[0].visibilityScore && (
            <div className="mt-4 pt-4 border-t-2 border-blue-200">
              <div className="flex items-center gap-2 text-orange-700 font-semibold">
                <span>⚠️</span>
                <span>
                  Top concurrent scoort {competitorStats.competitors[0].visibilityScore - competitorStats.userVisibilityScore}% beter dan jou!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Competitors List */}
        <div className="space-y-4">
          <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
            <span>👥</span>
            <span>Top Concurrenten</span>
          </h3>

          {competitorStats.competitors.map((competitor, index) => (
            <div 
              key={competitor.name}
              className="p-5 bg-gradient-to-br from-gray-50 to-orange-50 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                
                {/* Rank + Name */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {getRankEmoji(index)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-gray-900 mb-2 break-words">
                      {competitor.name}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <span>📍</span>
                        <span className="font-semibold">{competitor.mentions} van {competitorStats.totalPrompts} prompts</span>
                      </div>
                      
                      <div className={`px-3 py-1 ${getScoreBg(competitor.visibilityScore)} ${getScoreColor(competitor.visibilityScore)} rounded-full font-bold`}>
                        {competitor.visibilityScore}% visibility
                      </div>
                    </div>

                    {/* Show first 2 prompts where mentioned */}
                    {competitor.prompts.length > 0 && (
                      <details className="group">
                        <summary className="cursor-pointer text-sm text-orange-600 hover:text-orange-700 font-semibold list-none flex items-center gap-2">
                          <span className="group-open:rotate-90 transition-transform">▶️</span>
                          <span>Bekijk prompts waar genoemd ({competitor.prompts.length})</span>
                        </summary>
                        <div className="mt-3 space-y-2 pl-6">
                          {competitor.prompts.slice(0, 3).map((prompt, i) => (
                            <div key={i} className="text-sm text-gray-700 bg-white/50 p-3 rounded-lg leading-relaxed">
                              "{prompt}"
                            </div>
                          ))}
                          {competitor.prompts.length > 3 && (
                            <div className="text-sm text-gray-500 italic">
                              + {competitor.prompts.length - 3} meer prompts
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                {/* Future: Analyze button */}
                <button
                  disabled
                  className="flex-shrink-0 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed text-sm relative"
                  title="Binnenkort beschikbaar"
                >
                  <span className="flex items-center gap-2">
                    <span>🔍</span>
                    <span className="hidden sm:inline">Analyseer</span>
                  </span>
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                    Binnenkort
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Insight */}
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200">
          <div className="flex items-start gap-4">
            <span className="text-3xl">💡</span>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Competitive Intelligence Tip</h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                Deze concurrenten worden vaker genoemd dan jou in AI-responses. Door hun content strategie te analyseren 
                kun je ontdekken waarom zij beter scoren en je eigen GEO optimaliseren. Binnenkort kun je hun websites automatisch 
                laten analyseren voor actionable insights!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default CompetitorsLeaderboard