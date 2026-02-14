'use client'
// app/tools/geo-audit/page.jsx

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, CheckCircle2, XCircle, AlertTriangle, Globe, ChevronDown, ChevronUp, Sparkles, Zap, Shield, BarChart3, ExternalLink, Copy, Check, Loader2, Eye, Users } from 'lucide-react'

// ============================================
// SCAN STEPS — shown during animation
// ============================================
const SCAN_STEPS = [
  { id: 'fetch', label: 'Pagina ophalen en verbinden', section: 'Connectie' },
  { id: 'html', label: 'HTML content extraheren', section: 'Extractie' },
  { id: 'title', label: 'Title tag analyseren', section: 'Meta Tags' },
  { id: 'meta', label: 'Meta description controleren', section: 'Meta Tags' },
  { id: 'headings', label: 'Heading structuur (H1-H6) scannen', section: 'Structuur' },
  { id: 'wordcount', label: 'Content lengte meten', section: 'Content' },
  { id: 'images', label: 'Afbeeldingen en alt-teksten checken', section: 'Content' },
  { id: 'schema', label: 'JSON-LD structured data detecteren', section: 'Structured Data' },
  { id: 'faq', label: 'FAQPage schema zoeken', section: 'Structured Data' },
  { id: 'og', label: 'Open Graph tags controleren', section: 'Social' },
  { id: 'robots', label: 'robots.txt ophalen — AI-bots checken', section: 'Toegang' },
  { id: 'llms', label: 'llms.txt aanwezigheid checken', section: 'Toegang' },
  { id: 'ai_content', label: 'Content kwaliteit analyseren met AI', section: 'AI Analyse' },
  { id: 'ai_citation', label: 'Citatie-potentieel beoordelen', section: 'AI Analyse' },
  { id: 'ai_eeat', label: 'E-E-A-T signalen detecteren', section: 'AI Analyse' },
  { id: 'prompt_gen', label: 'Commerciële prompt genereren', section: 'Prompt' },
  { id: 'perplexity', label: 'Live test uitvoeren op Perplexity', section: 'Live Test' },
  { id: 'competitors', label: 'Concurrenten identificeren', section: 'Live Test' },
  { id: 'score', label: 'GEO Score berekenen', section: 'Resultaat' },
]

// ============================================
// GEO AUDIT PAGE — /geo-audit
// Uses template.js for header/footer
// ============================================

export default function GeoAuditPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showFullSnippet, setShowFullSnippet] = useState(false)
  const resultsRef = useRef(null)

  // Scan limit
  const MAX_FREE_SCANS = 2
  const ADMIN_EMAILS = ['imre@onlinelabs.nl', 'hallo@onlinelabs.nl']
  const [scanCount, setScanCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  // Scan animation state
  const [scanPhase, setScanPhase] = useState('idle') // idle | fetching | analyzing | testing | done
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [scanUrl, setScanUrl] = useState('')

  // ── Check auth + load scan count ──────────────
  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setAuthChecked(true)

      // Admins get unlimited scans — clear any leftover limits
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
        setLimitReached(false)
        setScanCount(0)
        return
      }

      try {
        if (currentUser) {
          // Logged in → daily limit (reset elke dag)
          const today = new Date().toISOString().split('T')[0]
          const key = `geo_audit_${today}`
          const stored = localStorage.getItem(key)
          const count = stored ? parseInt(stored, 10) : 0
          setScanCount(count)
          if (count >= MAX_FREE_SCANS) setLimitReached(true)
        } else {
          // Anonymous → total limit
          const stored = localStorage.getItem('geo_audit_count')
          const count = stored ? parseInt(stored, 10) : 0
          setScanCount(count)
          if (count >= MAX_FREE_SCANS) setLimitReached(true)
        }
      } catch (e) { /* private browsing */ }
    })
  }, [])

  // ── Scan step animation ─────────────────────────
  useEffect(() => {
    if (!loading) return

    setScanPhase('fetching')
    setCurrentStepIndex(0)
    setCompletedSteps([])

    let stepIdx = 0
    const interval = setInterval(() => {
      if (stepIdx < SCAN_STEPS.length) {
        const step = SCAN_STEPS[stepIdx]
        setCurrentStepIndex(stepIdx)
        
        // Update phase based on step
        if (step.section === 'AI Analyse') setScanPhase('analyzing')
        else if (step.section === 'Live Test') setScanPhase('testing')
        else if (step.section === 'Resultaat') setScanPhase('done')

        // Mark previous step as completed
        if (stepIdx > 0) {
          setCompletedSteps(prev => [...prev, SCAN_STEPS[stepIdx - 1]])
        }
        stepIdx++
      } else {
        // Mark final step as completed
        setCompletedSteps(prev => [...prev, SCAN_STEPS[SCAN_STEPS.length - 1]])
        clearInterval(interval)
      }
    }, 1400) // ~1.4s per step, total ~26s (matches API response time)

    return () => clearInterval(interval)
  }, [loading])

  // ── Handle audit ────────────────────────────────
  async function handleAudit(e) {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')
    setResults(null)
    setExpandedCategory(null)
    setShowFullSnippet(false)
    setScanUrl(url.trim())

    try {
      const response = await fetch('/api/geo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Er ging iets mis')
        return
      }

      // Complete all remaining steps
      setCompletedSteps([...SCAN_STEPS])
      setCurrentStepIndex(SCAN_STEPS.length - 1)
      setScanPhase('done')
      
      // Increment scan count (skip for admins)
      if (!isAdmin) {
        const newCount = scanCount + 1
        setScanCount(newCount)
        try {
          if (user) {
            const today = new Date().toISOString().split('T')[0]
            localStorage.setItem(`geo_audit_${today}`, newCount.toString())
          } else {
            localStorage.setItem('geo_audit_count', newCount.toString())
          }
        } catch (e) {}
        if (newCount >= MAX_FREE_SCANS) setLimitReached(true)
      }

      await new Promise(r => setTimeout(r, 600))
      setResults(data)

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)

    } catch (err) {
      setError('Kon geen verbinding maken. Controleer de URL en probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  function copyPrompt(text) {
    navigator.clipboard.writeText(text)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const progress = Math.round((completedSteps.length / SCAN_STEPS.length) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">

      {/* ── HERO + FORM ────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            GEO Audit Tool
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-slate-900 leading-tight px-4">
            Hoe goed is jouw pagina voorbereid op AI-zoekmachines?
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4 mb-4">
            We analyseren je pagina én testen <strong className="text-slate-700">live op Perplexity</strong> of je gevonden wordt.
          </p>
        </div>

        {/* ── FORM or SIGNUP WALL ────────────────────── */}
        {limitReached && !isAdmin && !loading && !results ? (
          <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-white" />
            </div>
            {user ? (
              <>
                <p className="text-xl font-bold text-slate-900 mb-2">
                  Dagelijkse limiet bereikt
                </p>
                <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                  Je hebt vandaag {MAX_FREE_SCANS} scans gebruikt. Morgen kun je weer {MAX_FREE_SCANS} nieuwe pagina&apos;s scannen.
                </p>
                <Link
                  href="/dashboard"
                  className="bg-[#292956] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#1e1e45] transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  Terug naar Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-slate-900 mb-2">
                  Je hebt {MAX_FREE_SCANS} gratis scans gebruikt
                </p>
                <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                  Maak een gratis account aan om elke dag {MAX_FREE_SCANS} scans uit te voeren, meerdere pagina&apos;s te testen en je resultaten op te slaan.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className="bg-[#292956] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#1e1e45] transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    Gratis account aanmaken
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                  >
                    Heb je al een account? Inloggen
                  </Link>
                </div>
              </>
            )}
            <p className="text-xs text-slate-400 mt-4">{user ? `${MAX_FREE_SCANS} scans per dag` : 'Geen creditcard nodig · Direct starten'}</p>
          </div>
        ) : (
          <form onSubmit={handleAudit} className="relative">
            <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-2 flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 pl-3">
              <Globe className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://jouwwebsite.nl/pagina"
                className="w-full py-2.5 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-[#292956] text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-[#1e1e45] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span className="hidden sm:inline">Analyseren...</span></>
              ) : (
                <>Analyseer<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>
        )}

        {!limitReached && authChecked && !isAdmin && (
          <p className="text-center text-xs text-slate-400 mt-3">
            Gratis &middot; {user ? '' : 'Geen account nodig · '}{MAX_FREE_SCANS - scanCount} van {MAX_FREE_SCANS} scans{user ? ' vandaag' : ''} beschikbaar
          </p>
        )}

        {/* ── ERROR ─────────────────────────────────── */}
        {error && !loading && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <p className="text-xs text-red-600 mt-1">Controleer of de URL correct en toegankelijk is.</p>
            </div>
          </div>
        )}
      </section>

      {/* ── SCAN ANIMATION ─────────────────────────── */}
      {loading && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">
                {scanPhase === 'fetching' && 'Pagina ophalen & analyseren...'}
                {scanPhase === 'analyzing' && 'AI-analyse uitvoeren...'}
                {scanPhase === 'testing' && '🔥 Live test op Perplexity...'}
                {scanPhase === 'done' && 'Resultaten samenstellen...'}
              </span>
              <span className="text-sm text-slate-400">{progress}%</span>
            </div>
            <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            {/* ── Left: Browser Window (3/5) ─────────── */}
            <div className="lg:col-span-3 bg-slate-900 rounded-2xl p-4 relative overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 bg-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-400 truncate font-mono">
                  {scanUrl.replace(/^https?:\/\//, '')}
                </div>
              </div>
              
              {/* Page content area with scan line */}
              <div className="relative bg-white rounded-lg overflow-hidden" style={{ height: '300px' }}>
                {/* Fake page content skeleton */}
                <div className="p-4 space-y-3 opacity-60">
                  <div className="h-8 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-5/6" />
                  <div className="h-4 bg-slate-100 rounded w-4/6" />
                  <div className="h-20 bg-slate-50 rounded mt-4" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="h-16 bg-slate-100 rounded" />
                    <div className="h-16 bg-slate-100 rounded" />
                    <div className="h-16 bg-slate-100 rounded" />
                  </div>
                </div>
                
                {/* Teun mascotte */}
                <div className="absolute bottom-16 right-2 z-10 animate-bounce" style={{ animationDuration: '2s' }}>
                  <Image 
                    src="/images/teun-met-vergrootglas.png" 
                    alt="Teun scant je pagina" 
                    width={90} 
                    height={117} 
                    className="drop-shadow-lg"
                  />
                </div>
                
                {/* Scanning line animation */}
                <div 
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent scan-line-animation"
                  style={{ boxShadow: '0 0 20px 5px rgba(34, 211, 238, 0.4)' }}
                />
                
                {/* Scan overlay glow */}
                <div 
                  className="absolute inset-0 pointer-events-none pulse-animation"
                  style={{ background: 'linear-gradient(180deg, rgba(34,211,238,0.1) 0%, transparent 50%, rgba(34,211,238,0.1) 100%)' }}
                />
                
                {/* Phase indicator */}
                <div className="absolute bottom-3 left-3 right-14">
                  <div className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    scanPhase === 'fetching' ? 'bg-blue-500 text-white' :
                    scanPhase === 'analyzing' ? 'bg-purple-500 text-white' :
                    scanPhase === 'testing' ? 'bg-orange-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {scanPhase === 'fetching' && 'Pagina scannen...'}
                    {scanPhase === 'analyzing' && 'AI-analyse uitvoeren...'}
                    {scanPhase === 'testing' && 'Live Perplexity test...'}
                    {scanPhase === 'done' && 'Scan voltooid!'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Scan Progress (2/5) ────────────── */}
            <div className="lg:col-span-2 bg-slate-50 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              {/* Circular progress */}
              <div className="relative mb-5">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                  <circle 
                    cx="60" cy="60" r="52" fill="none" 
                    stroke={scanPhase === 'testing' ? '#f97316' : scanPhase === 'analyzing' ? '#8b5cf6' : '#06b6d4'} 
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(progress / 100) * 327} 327`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800">{progress}%</span>
                  <span className="text-[10px] text-slate-400 font-medium">{completedSteps.length}/{SCAN_STEPS.length}</span>
                </div>
              </div>

              {/* Current step */}
              {currentStepIndex < SCAN_STEPS.length && (
                <div className="w-full">
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 transition-colors duration-500 ${
                    scanPhase === 'testing' ? 'text-orange-500' : scanPhase === 'analyzing' ? 'text-purple-500' : 'text-cyan-500'
                  }`}>{SCAN_STEPS[currentStepIndex].section}</p>
                  <p className="text-sm font-medium text-slate-700 leading-snug min-h-[40px] flex items-center justify-center">
                    {SCAN_STEPS[currentStepIndex].label}
                  </p>
                </div>
              )}

              {/* Last completed step */}
              {completedSteps.length > 0 && (
                <p className="text-xs text-emerald-500 mt-4 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedSteps[completedSteps.length - 1].label}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES (before results, when idle) ──── */}
      {!results && !loading && !error && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <BarChart3 className="w-5 h-5" />, title: 'Content Analyse', desc: 'Is je content geschikt om door AI geciteerd te worden?' },
              { icon: <Shield className="w-5 h-5" />, title: 'Technische Check', desc: 'robots.txt, structured data, llms.txt, meta tags' },
              { icon: <Sparkles className="w-5 h-5" />, title: 'E-E-A-T & Citatie', desc: 'Expertise, autoriteit en citatie-potentieel' },
              { icon: <Eye className="w-5 h-5" />, title: 'Live Perplexity Test', desc: 'We testen direct of je gevonden wordt in AI-antwoorden' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 mb-3">{f.icon}</div>
                <p className="font-semibold text-slate-900 text-sm mb-1">{f.title}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── RESULTS ────────────────────────────────── */}
      {results && (
        <section ref={resultsRef} className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">

          {/* ━━━ LIVE TEST RESULT — THE WOW MOMENT ━━━ */}
          {results.liveTest && (
            <div className={`rounded-xl border-2 p-6 mb-6 ${
              results.liveTest.mentioned
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                  results.liveTest.mentioned ? 'bg-emerald-200' : 'bg-red-200'
                }`}>
                  {results.liveTest.mentioned ? '✅' : '❌'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {results.liveTest.mentioned
                      ? `${results.analysis.companyName} wordt gevonden!`
                      : `${results.analysis.companyName} wordt NIET gevonden`
                    }
                  </h2>
                  <p className="text-sm text-slate-500">
                    Live getest op <span className="font-semibold text-purple-600">Perplexity</span>
                    {results.liveTest.mentioned && results.liveTest.mentionCount > 0 && (
                      <span className="ml-1">— {results.liveTest.mentionCount}× genoemd</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Geteste prompt */}
              <div className="bg-white/70 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">💬 Geteste prompt</p>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed">&ldquo;{results.liveTest.prompt}&rdquo;</p>
                  </div>
                  <button onClick={() => copyPrompt(results.liveTest.prompt)} className="flex-shrink-0 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer">
                    {copiedPrompt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              {/* AI Response */}
              {results.liveTest.snippet && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🤖 Perplexity antwoord</p>
                  <div className="bg-white/70 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
                    <p className={!showFullSnippet ? 'line-clamp-4' : ''}>{results.liveTest.snippet}</p>
                    {results.liveTest.snippet.length > 300 && (
                      <button onClick={() => setShowFullSnippet(!showFullSnippet)} className="text-xs text-purple-600 font-medium mt-2 hover:underline cursor-pointer">
                        {showFullSnippet ? 'Minder tonen' : 'Volledig antwoord tonen'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Competitors */}
              {results.liveTest.competitors?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    <Users className="w-3 h-3 inline mr-1" />Concurrenten in dit antwoord
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {results.liveTest.competitors.map((comp, i) => (
                      <span key={i} className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium px-2.5 py-1 rounded-full">{comp}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Not found CTA */}
              {!results.liveTest.mentioned && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-sm text-slate-700">
                    <strong>Wat nu?</strong> Jouw bedrijf verschijnt niet in dit AI-antwoord. Met GEO-optimalisatie kun je dit veranderen.
                  </p>
                  <Link href="/signup" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-red-700 hover:text-red-800">
                    Start je volledige AI-zichtbaarheidsanalyse <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ━━━ OVERALL SCORE ━━━ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={getScoreColor(results.analysis.overallScore)} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(results.analysis.overallScore / 100) * 327} 327`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900">{results.analysis.overallScore}</span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold text-slate-900 mb-1">GEO Score</h2>
                <p className="text-sm text-slate-500 mb-3">{results.domain} — {getScoreLabel(results.analysis.overallScore)}</p>
                <div className="space-y-2">
                  {results.analysis.categories.map((cat) => (
                    <div key={cat.slug} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-40 truncate">{cat.icon} {cat.name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, backgroundColor: getScoreColor(cat.score) }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{cat.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ━━━ TOP RECOMMENDATIONS ━━━ */}
          {results.analysis.topRecommendations?.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 mb-6">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">⚡ Top aanbevelingen</p>
              <ol className="space-y-2">
                {results.analysis.topRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                    <span className="text-sm text-slate-800 leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ━━━ CATEGORY DETAILS ━━━ */}
          <div className="space-y-3">
            {results.analysis.categories.map((cat) => (
              <div key={cat.slug} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setExpandedCategory(expandedCategory === cat.slug ? null : cat.slug)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: getScoreColor(cat.score) + '18' }}>{cat.icon}</div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 text-sm">{cat.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{cat.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {cat.checks.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-emerald-600 font-medium">{cat.checks.filter(c => c.status === 'good').length}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {cat.checks.filter(c => c.status !== 'good').length > 0 && (
                          <>
                            <span className="text-xs text-red-500 font-medium ml-1">{cat.checks.filter(c => c.status !== 'good').length}</span>
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          </>
                        )}
                      </div>
                    )}
                    <span className="text-lg font-bold" style={{ color: getScoreColor(cat.score) }}>{cat.score}</span>
                    {expandedCategory === cat.slug ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>
                {expandedCategory === cat.slug && cat.checks.length > 0 && (
                  <div className="border-t border-slate-100 px-5 pb-4">
                    <div className="divide-y divide-slate-50">
                      {cat.checks.map((check, i) => (
                        <div key={i} className="py-3 flex items-start gap-3">
                          {check.status === 'good' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" /> : check.status === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{check.name}</span>
                              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${check.priority === 'kritiek' ? 'bg-red-100 text-red-700' : check.priority === 'hoog' ? 'bg-orange-100 text-orange-700' : check.priority === 'middel' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{check.priority}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{check.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ━━━ EXTRACTED META ━━━ */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mt-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Gevonden op pagina</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Woorden', value: results.extracted.wordCount },
                { label: 'Headings', value: results.extracted.headingCount },
                { label: 'Afbeeldingen', value: results.extracted.imageCount },
                { label: 'Schema types', value: results.extracted.structuredDataTypes?.length || 0 },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {results.extracted.hasStructuredData && <Badge color="green" label="Structured Data" />}
              {results.extracted.hasFAQ && <Badge color="green" label="FAQ" />}
              {results.extracted.hasRobotsTxt && <Badge color="green" label="robots.txt" />}
              {results.extracted.hasLlmsTxt && <Badge color="green" label="llms.txt" />}
              {!results.extracted.hasStructuredData && <Badge color="red" label="Geen Structured Data" />}
              {!results.extracted.hasRobotsTxt && <Badge color="amber" label="Geen robots.txt" />}
              {!results.extracted.hasLlmsTxt && <Badge color="amber" label="Geen llms.txt" />}
            </div>
          </div>

          {/* ━━━ CTA ━━━ */}
          <div className="mt-8 bg-gradient-to-br from-[#292956] to-[#1e1e45] rounded-xl p-8 text-center text-white">
            <p className="text-xl font-bold mb-2">Wil je je volledige AI-zichtbaarheid meten?</p>
            <p className="text-slate-300 text-sm mb-6 max-w-md mx-auto">
              Test meerdere pagina&apos;s en prompts op ChatGPT, Perplexity en Google AI. Meet op welke vragen jouw bedrijf wordt aanbevolen.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="bg-emerald-400 text-slate-900 font-semibold px-6 py-3 rounded-lg hover:bg-emerald-300 transition-colors inline-flex items-center gap-2">
                Gratis account aanmaken <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/tools/ai-visibility" className="text-slate-300 hover:text-white text-sm font-medium inline-flex items-center gap-1 transition-colors">
                Of start een AI Zichtbaarheid Scan <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-slate-400 text-xs mt-4">Geen creditcard nodig</p>
          </div>

          {/* Scan another */}
          <div className="mt-6 text-center">
            {limitReached && !isAdmin ? (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-600 mb-3">
                  {user
                    ? `Je hebt vandaag ${MAX_FREE_SCANS} scans gebruikt. Morgen kun je weer scannen.`
                    : `Je hebt je ${MAX_FREE_SCANS} gratis scans gebruikt.`
                  }
                </p>
                <Link
                  href={user ? '/dashboard' : '/signup'}
                  className="bg-[#292956] text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-[#1e1e45] transition-all inline-flex items-center gap-2 cursor-pointer text-sm"
                >
                  {user ? 'Terug naar Dashboard' : 'Gratis account aanmaken'} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <button onClick={() => { setResults(null); setUrl(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-sm text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 cursor-pointer">
                ← Andere pagina analyseren
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── CSS Animations ─────────────────────────── */}
      <style>{`
        @keyframes scanLine {
          0% { top: 0; opacity: 1; }
          45% { top: calc(100% - 4px); opacity: 1; }
          50% { top: calc(100% - 4px); opacity: 0.5; }
          55% { top: calc(100% - 4px); opacity: 1; }
          100% { top: 0; opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .scan-line-animation {
          animation: scanLine 2s ease-in-out infinite;
        }
        .slide-in-animation {
          animation: slideIn 0.3s ease-out;
        }
        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}


// ── Components ────────────────────────────────

function Badge({ color, label }) {
  const colors = { green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600' }
  const Icon = color === 'green' ? CheckCircle2 : color === 'red' ? XCircle : AlertTriangle
  return (
    <span className={`inline-flex items-center gap-1 ${colors[color]} text-xs px-2 py-1 rounded-full`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  )
}

function getScoreColor(score) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function getScoreLabel(score) {
  if (score >= 80) return 'Goed voorbereid op AI-platformen'
  if (score >= 60) return 'Redelijk — er zijn verbeterpunten'
  if (score >= 40) return 'Matig — meerdere verbeterpunten'
  return 'Onvoldoende voorbereid op AI'
}
