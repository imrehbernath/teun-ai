'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ScanHistory({ scans, onRefresh }) {
  const router = useRouter()
  const [copying, setCopying] = useState(null)
  const [expandedScans, setExpandedScans] = useState(new Set())

  const handleOptimize = (scan) => {
    // Pre-fill GEO tool with data from AI Visibility scan
    const params = new URLSearchParams({
      source: scan.ai_scan_id || '',
      keyword: scan.keyword || '',
      company: scan.company_name || '',
      prompts: JSON.stringify(scan.commercial_prompts || []),
      prompts_count: scan.prompts_count || 0,
      auto_filled: 'true'
    })

    router.push(`/tools/geo-optimalisatie?${params.toString()}`)
  }

  const handleViewAiScan = (scanId) => {
    router.push(`/tools/ai-visibility/results/${scanId}`)
  }

  const handleViewGeoResults = (geoId) => {
    router.push(`/tools/geo-optimalisatie/results/${geoId}`)
  }

  const toggleExpanded = (scanId) => {
    setExpandedScans(prev => {
      const newSet = new Set(prev)
      if (newSet.has(scanId)) {
        newSet.delete(scanId)
      } else {
        newSet.add(scanId)
      }
      return newSet
    })
  }

  const getStatusBadge = (scan) => {
    // Determine overall status
    if (scan.geo_id && scan.geo_status === 'completed') {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
          ✓ Volledig Geoptimaliseerd
        </span>
      )
    }
    
    if (scan.geo_id && scan.geo_status === 'processing') {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200">
          ⏳ Aan het optimaliseren...
        </span>
      )
    }
    
    if (scan.ai_scan_id && !scan.geo_id && scan.commercial_prompts?.length > 0) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200">
          💬 {scan.prompts_count || scan.commercial_prompts.length} prompts gevonden
        </span>
      )
    }

    return null
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Onbekend'
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopying(id)
      setTimeout(() => setCopying(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const renderCommercialPrompts = (scan) => {
    if (!scan.commercial_prompts || scan.commercial_prompts.length === 0) {
      return null
    }

    const scanId = scan.integration_id || scan.id
    const isExpanded = expandedScans.has(scanId)
    const displayPrompts = isExpanded ? scan.commercial_prompts : scan.commercial_prompts.slice(0, 3)

    return (
      <div className="mt-4">
        {/* Header with expand/collapse */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">
                {scan.prompts_count || scan.commercial_prompts.length} Commerciële Prompts
              </h4>
              <p className="text-xs text-gray-500">
                Vragen die AI's beantwoorden over jouw bedrijf
              </p>
            </div>
          </div>
          {scan.commercial_prompts.length > 3 && (
            <button
              onClick={() => toggleExpanded(scanId)}
              className="px-3 py-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all flex items-center gap-1.5"
            >
              {isExpanded ? (
                <>
                  <span>▲</span> Toon Minder
                </>
              ) : (
                <>
                  <span>▼</span> Toon Alle {scan.commercial_prompts.length}
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Prompts List */}
        <div className="space-y-2.5">
          {displayPrompts.map((prompt, i) => (
            <div 
              key={i} 
              className="group p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-xl border border-purple-200 transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="flex-1 text-sm font-medium text-gray-900 leading-relaxed">
                  "{prompt}"
                </p>
                <button
                  onClick={() => copyToClipboard(prompt, `prompt-${scanId}-${i}`)}
                  className="flex-shrink-0 px-2.5 py-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 bg-white hover:bg-purple-50 rounded-lg border border-purple-200 transition-all opacity-0 group-hover:opacity-100"
                  title="Kopieer prompt"
                >
                  {copying === `prompt-${scanId}-${i}` ? '✓ Gekopieerd' : '📋 Kopieer'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {!isExpanded && scan.commercial_prompts.length > 3 && (
          <p className="text-sm text-purple-700 mt-3 font-semibold text-center">
            +{scan.commercial_prompts.length - 3} meer prompts beschikbaar
          </p>
        )}
      </div>
    )
  }

  if (!scans || scans.length === 0) {
    return null
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Recente Scans
          </h2>
          <p className="text-gray-600 mt-1">
            Je AI Visibility analyses en GEO optimalisaties
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2.5 text-sm text-purple-700 hover:text-purple-900 font-semibold bg-purple-50 hover:bg-purple-100 rounded-xl transition-all flex items-center gap-2 border border-purple-200"
        >
          <span className="text-lg">🔄</span> Vernieuwen
        </button>
      </div>

      <div className="space-y-6">
        {scans.map((scan) => (
          <div
            key={scan.integration_id || scan.id}
            className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-purple-300 transition-all hover:shadow-2xl"
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                {/* Company Name as Main Title */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-gray-900">
                      {scan.company_name || 'Bedrijf'}
                    </h3>
                    {scan.keyword && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Focus keyword: {scan.keyword}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(scan)}
                  <span className="text-sm text-gray-500">
                    📅 {formatDate(scan.integration_date || scan.created_at)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {/* Show "Optimize" button if only AI scan exists */}
                {scan.ai_scan_id && !scan.geo_id && scan.commercial_prompts?.length > 0 && (
                  <button
                    onClick={() => handleOptimize(scan)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold hover:shadow-2xl transition-all flex items-center gap-2.5 border-2 border-purple-400"
                  >
                    <span className="text-xl">✨</span>
                    <span>Optimaliseer Voor Deze Prompts</span>
                  </button>
                )}

                {/* Show view buttons if results exist */}
                {scan.ai_scan_id && (
                  <button
                    onClick={() => handleViewAiScan(scan.ai_scan_id)}
                    className="px-5 py-3 border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 rounded-xl font-semibold transition-all flex items-center gap-2"
                  >
                    <span className="text-lg">👁️</span>
                    <span>AI Scan</span>
                  </button>
                )}

                {scan.geo_id && (
                  <button
                    onClick={() => handleViewGeoResults(scan.geo_id)}
                    className="px-5 py-3 border-2 border-purple-300 text-purple-700 hover:border-purple-400 hover:bg-purple-50 rounded-xl font-semibold transition-all flex items-center gap-2"
                  >
                    <span className="text-lg">🚀</span>
                    <span>GEO Resultaten</span>
                  </button>
                )}
              </div>
            </div>

            {/* Commercial Prompts - THE STAR OF THE SHOW! */}
            {renderCommercialPrompts(scan)}

            {/* GEO Optimization Success Info */}
            {scan.geo_id && scan.geo_status === 'completed' && (
              <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-green-900 mb-1">
                      Optimalisatie Voltooid!
                    </h4>
                    <p className="text-sm text-green-700 mb-2">
                      Je website is geanalyseerd en er zijn aanbevelingen beschikbaar om beter gevonden te worden in AI-zoekmachines.
                    </p>
                    {scan.target_url && (
                      <p className="text-xs text-green-600 font-mono bg-white px-3 py-1.5 rounded-lg inline-block">
                        🔗 {scan.target_url}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Auto-filled indicator */}
            {scan.auto_filled && (
              <div className="mt-4 flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
                <span className="text-base">⚡</span>
                <span className="font-semibold">Automatisch ingevuld vanuit AI Visibility scan</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}