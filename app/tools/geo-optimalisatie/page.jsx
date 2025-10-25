'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function GeoOptimizationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [url, setUrl] = useState('')
  const [keyword, setKeyword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [toneOfVoice, setToneOfVoice] = useState('')
  
  // UI state
  const [isAutoFilled, setIsAutoFilled] = useState(false)
  const [sourceScanId, setSourceScanId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  // Binnenkort overlay state
  const [showBinnenkort, setShowBinnenkort] = useState(true)

  useEffect(() => {
    checkAuthAndLoadParams()
  }, [])

  const checkAuthAndLoadParams = async () => {
    // Check authentication
    const { data: { user: currentUser }, error } = await supabase.auth.getUser()
    
    if (error || !currentUser) {
      router.push('/login')
      return
    }

    setUser(currentUser)

    // Check for URL parameters (auto-fill from AI Visibility)
    const source = searchParams.get('source')
    const keywordParam = searchParams.get('keyword')
    const companyParam = searchParams.get('company')
    const autoFilled = searchParams.get('auto_filled') === 'true'

    if (autoFilled && source) {
      setIsAutoFilled(true)
      setSourceScanId(source)
      setKeyword(keywordParam || '')
      setCompanyName(companyParam || '')
      
      // Optionally fetch more data from the AI scan
      await loadAiScanData(source)
    }
  }

  const loadAiScanData = async (scanId) => {
    try {
      const { data: scan, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('id', scanId)
        .single()

      if (error) {
        console.error('Error loading AI scan:', error)
        return
      }

      // Extract additional context from AI scan results
      if (scan.input_data) {
        setKeyword(scan.input_data.keyword || keyword)
        setCompanyName(scan.input_data.company_name || companyName)
      }

      // Could also pre-fill tone of voice from the scan results if available
      // if (scan.results?.suggested_tone) {
      //   setToneOfVoice(scan.results.suggested_tone)
      // }
    } catch (error) {
      console.error('Error in loadAiScanData:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // BINNENKORT: Prevent submission
    if (showBinnenkort) {
      return
    }
    
    if (!url || !keyword) {
      alert('Vul minimaal een URL en keyword in')
      return
    }

    setLoading(true)

    try {
      // Create GEO optimization record
      const { data: geoRecord, error: insertError } = await supabase
        .from('geo_optimizations')
        .insert({
          user_id: user.id,
          keyword,
          company_name: companyName,
          target_url: url,
          input_data: {
            tone_of_voice: toneOfVoice,
            source_scan_id: sourceScanId
          },
          source_scan_id: sourceScanId,
          auto_filled: isAutoFilled,
          status: 'pending'
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Update tool integration if this came from AI Visibility
      if (sourceScanId) {
        await supabase
          .from('tool_integrations')
          .update({
            geo_optimization_id: geoRecord.id,
            status: 'optimization_started',
            updated_at: new Date().toISOString()
          })
          .eq('ai_visibility_scan_id', sourceScanId)
      }

      // Start the actual optimization (API call)
      const response = await fetch('/api/geo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizationId: geoRecord.id,
          url,
          keyword,
          companyName,
          toneOfVoice
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Optimization failed')
      }

      // Redirect to results
      router.push(`/tools/geo-optimalisatie/results/${geoRecord.id}`)

    } catch (error) {
      console.error('Error starting optimization:', error)
      alert(`Er ging iets mis: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 relative">
      
      {/* BINNENKORT OVERLAY */}
      {showBinnenkort && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-10 max-w-2xl w-full shadow-2xl border-2 border-purple-200 relative">
            {/* Close button (optional - remove if you want) */}
            <button
              onClick={() => setShowBinnenkort(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-3xl leading-none"
            >
              ×
            </button>

            {/* Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-6xl">🚀</span>
            </div>

            {/* Title */}
            <h2 className="text-4xl font-bold text-gray-900 text-center mb-4">
              GEO Optimization Tool
            </h2>

            {/* Description */}
            <p className="text-gray-600 text-lg text-center mb-8 leading-relaxed">
              We zijn hard bezig met het bouwen van een krachtige GEO optimization tool met 
              E-E-A-T scoring, technische SEO analyse en AI content optimization. 
              Deze tool komt binnenkort beschikbaar!
            </p>

            {/* Features Preview */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 mb-8 border-2 border-purple-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>✨</span>
                <span>Wat je kunt verwachten:</span>
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-purple-600 text-lg mt-0.5">✓</span>
                  <span>Website scraping en content analyse</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-600 text-lg mt-0.5">✓</span>
                  <span>E-E-A-T (Experience, Expertise, Authority, Trust) scoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-600 text-lg mt-0.5">✓</span>
                  <span>8-staps AI content optimalisatie</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-600 text-lg mt-0.5">✓</span>
                  <span>Technische SEO audit (Core Web Vitals, structured data)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-600 text-lg mt-0.5">✓</span>
                  <span>FAQ generatie en content aanbevelingen</span>
                </li>
              </ul>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="px-6 py-3 bg-purple-600 text-white rounded-full font-bold text-lg shadow-lg">
                ⏳ In ontwikkeling
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all"
              >
                Terug naar Dashboard
              </button>
              
              <button
                onClick={() => setShowBinnenkort(false)}
                className="flex-1 px-6 py-4 border-2 border-purple-300 text-purple-700 rounded-xl font-bold text-lg hover:bg-purple-50 transition-all"
              >
                Preview Bekijken
              </button>
            </div>

            {/* Footer Note */}
            <p className="text-center text-sm text-gray-500 mt-6">
              💡 Tip: Klik "Preview Bekijken" om de interface alvast te zien
            </p>
          </div>
        </div>
      )}

      {/* EXISTING FORM (slightly dimmed when overlay is shown) */}
      <div className={showBinnenkort ? 'opacity-50 pointer-events-none' : ''}>
        <div className="max-w-4xl mx-auto py-12 px-6">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-purple-600 hover:text-purple-700 mb-4 inline-flex items-center gap-2"
            >
              ← Terug naar Dashboard
            </button>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🚀 GEO Optimization
            </h1>
            <p className="text-gray-600">
              Optimaliseer je website voor betere zichtbaarheid in AI-zoekmachines
            </p>
          </div>

          {/* Auto-filled Banner */}
          {isAutoFilled && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h3 className="font-semibold text-purple-900">
                    Automatisch ingevuld vanuit AI Visibility scan
                  </h3>
                  <p className="text-sm text-purple-700">
                    We hebben je keyword en bedrijfsnaam al ingevuld. Voeg een URL toe om te starten!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  De pagina die je wilt optimaliseren voor AI-zoekmachines
                </p>
              </div>

              {/* Keyword Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Keyword *
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="bijvoorbeeld: beste project management software"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {isAutoFilled && (
                  <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                    <span>⚡</span>
                    Automatisch overgenomen van je AI scan
                  </p>
                )}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bedrijfsnaam
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Je bedrijfsnaam"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {isAutoFilled && (
                  <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                    <span>⚡</span>
                    Automatisch overgenomen van je AI scan
                  </p>
                )}
              </div>

              {/* Tone of Voice (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tone of Voice (optioneel)
                </label>
                <textarea
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  placeholder="Plak hier bestaande content om je tone of voice te behouden (max 500 woorden)"
                  rows={4}
                  maxLength={3000}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dit helpt de AI om content te genereren die past bij je merk
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`
                  w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-bold text-lg
                  hover:shadow-xl transition-all
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Aan het optimaliseren...
                  </span>
                ) : (
                  'Start GEO Optimization ✨'
                )}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">
                Wat gebeurt er tijdens de analyse?
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>Website scraping en content analyse</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>E-E-A-T (Experience, Expertise, Authority, Trust) scoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>8-staps AI content optimalisatie</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>Technische SEO audit (Core Web Vitals, structured data)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>FAQ generatie en content aanbevelingen</span>
                </li>
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                ⏱️ Gemiddelde analyse tijd: 2-3 minuten
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GeoOptimizationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold text-lg">GEO Tool laden...</p>
        </div>
      </div>
    }>
      <GeoOptimizationContent />
    </Suspense>
  )
}