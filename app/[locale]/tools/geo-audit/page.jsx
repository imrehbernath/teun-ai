'use client'
// app/[locale]/tools/geo-audit/page.jsx

import { useState, useRef, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowRight, CheckCircle2, XCircle, AlertTriangle, Globe, ChevronDown, ChevronUp, Sparkles, Zap, Shield, BarChart3, ExternalLink, Copy, Check, Loader2, Eye, Users, Download } from 'lucide-react'

// ============================================
// SCAN STEPS — shown during animation (i18n)
// ============================================
function useScanSteps() {
  const t = useTranslations('geoAudit')
  return [
    { id: 'fetch', label: t('steps.fetch'), section: t('steps.sConnection') },
    { id: 'html', label: t('steps.html'), section: t('steps.sExtraction') },
    { id: 'title', label: t('steps.title'), section: t('steps.sMetaTags') },
    { id: 'meta', label: t('steps.meta'), section: t('steps.sMetaTags') },
    { id: 'headings', label: t('steps.headings'), section: t('steps.sStructure') },
    { id: 'wordcount', label: t('steps.wordcount'), section: t('steps.sContent') },
    { id: 'images', label: t('steps.images'), section: t('steps.sContent') },
    { id: 'schema', label: t('steps.schema'), section: t('steps.sStructuredData') },
    { id: 'richsnippets', label: t('steps.richsnippets'), section: t('steps.sStructuredData') },
    { id: 'faq', label: t('steps.faq'), section: t('steps.sStructuredData') },
    { id: 'og', label: t('steps.og'), section: t('steps.sSocial') },
    { id: 'robots', label: t('steps.robots'), section: t('steps.sAccess') },
    { id: 'llms', label: t('steps.llms'), section: t('steps.sAccess') },
    { id: 'cwv', label: t('steps.cwv'), section: t('steps.sPerformance') },
    { id: 'mobile', label: t('steps.mobile'), section: t('steps.sPerformance') },
    { id: 'ai_content', label: t('steps.aiContent'), section: t('steps.sAiAnalysis') },
    { id: 'ai_citation', label: t('steps.aiCitation'), section: t('steps.sAiAnalysis') },
    { id: 'ai_eeat', label: t('steps.aiEeat'), section: t('steps.sAiAnalysis') },
    { id: 'prompt_gen', label: t('steps.promptGen'), section: t('steps.sPrompt') },
    { id: 'perplexity', label: t('steps.perplexity'), section: t('steps.sLiveTest') },
    { id: 'competitors', label: t('steps.competitors'), section: t('steps.sLiveTest') },
    { id: 'score', label: t('steps.score'), section: t('steps.sResult') },
  ]
}

// ============================================
// GEO AUDIT PAGE
// ============================================

export default function GeoAuditPage() {
  const t = useTranslations('geoAudit')
  const locale = useLocale()
  const SCAN_STEPS = useScanSteps()

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showFullSnippet, setShowFullSnippet] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
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
  const [scanPhase, setScanPhase] = useState('idle')
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [scanUrl, setScanUrl] = useState('')

  // ── FAQ Structured Data ──────────────────────
  const faqItems = locale === 'en' ? [
    { q: 'Is the GEO Audit really free?', a: 'Yes, you can scan 2 pages per day for free. No credit card required. For unlimited scans, create a free account and use the GEO Analyse tool in your dashboard.' },
    { q: 'What is the difference between GEO and SEO?', a: 'SEO focuses on ranking in Google\'s link-based results. GEO optimizes your content to be cited and recommended by AI platforms like ChatGPT, Perplexity and Google AI Overviews.' },
    { q: 'Why does AI visibility matter for my business?', a: 'More than 40% of online searches will involve AI by 2026. If your competitors are mentioned and you are not, you lose visibility and potential customers, even if you rank well in Google.' },
    { q: 'Which AI platforms does the audit test?', a: 'The live test runs on Perplexity. The technical and content analysis covers optimization for ChatGPT, Perplexity, Google AI Overviews and Claude.' },
    { q: 'How can I improve my GEO Score?', a: 'The audit gives you 3 concrete recommendations. Common improvements include: adding FAQ schema, structuring content with direct answers, implementing JSON-LD structured data, and creating an llms.txt file.' },
  ] : [
    { q: 'Is de GEO Audit echt gratis?', a: 'Ja, je kunt 2 pagina\'s per dag gratis scannen . Geen creditcard nodig. Voor onbeperkte scans maak je een gratis account aan en gebruik je de GEO Analyse tool in je dashboard.' },
    { q: 'Wat is het verschil tussen GEO en SEO?', a: 'SEO richt zich op ranken in Google\'s linkgebaseerde resultaten. GEO optimaliseert je content om geciteerd en aanbevolen te worden door AI-platformen zoals ChatGPT, Perplexity en Google AI Overviews.' },
    { q: 'Waarom is AI-zichtbaarheid belangrijk voor mijn bedrijf?', a: 'Meer dan 40% van online zoekopdrachten gaat in 2026 via AI. Als jouw concurrenten wél genoemd worden en jij niet, verlies je zichtbaarheid en potentiële klanten, zelfs als je goed rankt in Google.' },
    { q: 'Welke AI-platformen test de audit?', a: 'De live test draait op Perplexity. De technische en content-analyse dekt optimalisatie voor ChatGPT, Perplexity, Google AI Overviews en Claude.' },
    { q: 'Hoe verbeter ik mijn GEO Score?', a: 'De audit geeft je 3 concrete aanbevelingen. Veelvoorkomende verbeteringen zijn: FAQ-schema toevoegen, content structureren met directe antwoorden, JSON-LD structured data implementeren, en een llms.txt bestand aanmaken.' },
  ]

  useEffect(() => {
    const faqData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(faqData)
    script.id = 'faq-schema'
    const existing = document.getElementById('faq-schema')
    if (existing) existing.remove()
    document.head.appendChild(script)
    return () => { const el = document.getElementById('faq-schema'); if (el) el.remove() }
  }, [locale])

  // ── Check auth + load scan count ──────────────
  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setAuthChecked(true)

      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
        setLimitReached(false)
        setScanCount(0)
        return
      }

      try {
        if (currentUser) {
          const today = new Date().toISOString().split('T')[0]
          const key = `geo_audit_${today}`
          const stored = localStorage.getItem(key)
          const count = stored ? parseInt(stored, 10) : 0
          setScanCount(count)
          if (count >= MAX_FREE_SCANS) setLimitReached(true)
        } else {
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
        
        if (step.id === 'ai_content') setScanPhase('analyzing')
        else if (step.id === 'perplexity') setScanPhase('testing')
        else if (step.id === 'score') setScanPhase('done')

        if (stepIdx > 0) {
          setCompletedSteps(prev => [...prev, SCAN_STEPS[stepIdx - 1]])
        }
        stepIdx++
      } else {
        setCompletedSteps(prev => [...prev, SCAN_STEPS[SCAN_STEPS.length - 1]])
        clearInterval(interval)
      }
    }, 1400)

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
        body: JSON.stringify({ url: url.trim(), locale })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('somethingWentWrong'))
        return
      }

      setCompletedSteps([...SCAN_STEPS])
      setCurrentStepIndex(SCAN_STEPS.length - 1)
      setScanPhase('done')
      
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
      setError(t('connectionError'))
    } finally {
      setLoading(false)
    }
  }

  function copyPrompt(text) {
    navigator.clipboard.writeText(text)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  async function handleDownloadPdf() {
    if (!results || downloadingPdf) return
    setDownloadingPdf(true)
    try {
      const response = await fetch('/api/geo-audit/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...results, locale })
      })
      if (!response.ok) throw new Error('PDF generation failed')
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const prefix = locale === 'en' ? 'GEO-Audit' : 'GEO-Audit'
      a.download = `${prefix}-${(results.analysis?.companyName || results.domain || 'report').replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('PDF download error:', err)
      alert(t('pdfFailed'))
    } finally {
      setDownloadingPdf(false)
    }
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
            {t('heroTitle')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4 mb-4" dangerouslySetInnerHTML={{ __html: t.raw('heroSubtitle') }} />
        </div>

        {/* ── FORM or SIGNUP WALL ────────────────────── */}
        {limitReached && !isAdmin && !loading && !results ? (
          <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-white" />
            </div>
            {user ? (
              <>
                <p className="text-xl font-bold text-slate-900 mb-2">{t('dailyLimitTitle')}</p>
                <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">{t('dailyLimitDesc', { count: MAX_FREE_SCANS })}</p>
                <Link href="/dashboard" className="bg-[#292956] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#1e1e45] transition-all inline-flex items-center gap-2 cursor-pointer">
                  {t('backToDashboard')} <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-slate-900 mb-2">{t('freeLimitTitle', { count: MAX_FREE_SCANS })}</p>
                <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">{t('freeLimitDesc', { count: MAX_FREE_SCANS })}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/signup" className="bg-[#292956] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#1e1e45] transition-all inline-flex items-center gap-2 cursor-pointer">
                    {t('createFreeAccount')} <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/login" className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
                    {t('alreadyHaveAccount')}
                  </Link>
                </div>
              </>
            )}
            <p className="text-xs text-slate-400 mt-4">{user ? t('scansPerDay', { count: MAX_FREE_SCANS }) : t('noCreditCard')}</p>
          </div>
        ) : (
          <>
          <form onSubmit={handleAudit} className="relative">
            <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-2 flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 pl-3">
              <Globe className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('placeholder')}
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
                <><Loader2 className="w-4 h-4 animate-spin" /><span className="hidden sm:inline">{t('analyzing')}</span></>
              ) : (
                <>{t('analyze')}<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>
        <p className="text-xs text-slate-400 mt-2 text-center">
          {loading ? t('scanDurationLoading') : t('scanDuration')}
        </p>
        </>
        )}

        {!limitReached && authChecked && !isAdmin && (
          <p className="text-center text-xs text-slate-400 mt-3">
            {t('free')} &middot; {user ? '' : `${t('noAccountNeeded')} · `}{t('scansAvailable', { remaining: MAX_FREE_SCANS - scanCount, total: MAX_FREE_SCANS })}{user ? ` ${t('today')}` : ''}
          </p>
        )}

        {/* ── ERROR ─────────────────────────────────── */}
        {error && !loading && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <p className="text-xs text-red-600 mt-1">{t('checkUrl')}</p>
            </div>
          </div>
        )}
      </section>

      {/* ── SCAN ANIMATION ─────────────────────────── */}
      {loading && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">
                {scanPhase === 'fetching' && t('phaseFetching')}
                {scanPhase === 'analyzing' && t('phaseAnalyzing')}
                {scanPhase === 'testing' && `🔥 ${t('phaseTesting')}`}
                {scanPhase === 'done' && t('phaseDone')}
              </span>
              <span className="text-sm text-slate-400">{progress}%</span>
            </div>
            <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {scanPhase === 'done' && (
              <p className="text-xs text-slate-400 mt-1.5 text-center">{t('cwvPatienceMsg')}</p>
            )}
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            {/* ── Left: Browser Window (3/5) ─────────── */}
            <div className="lg:col-span-3 bg-slate-900 rounded-2xl p-4 relative overflow-hidden">
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
              
              <div className="relative bg-white rounded-lg overflow-hidden" style={{ height: '300px' }}>
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
                
                <div className="absolute bottom-16 right-2 z-10 animate-bounce" style={{ animationDuration: '2s' }}>
                  <Image 
                    src="/images/teun-met-vergrootglas.png" 
                    alt="Teun"
                    width={90} 
                    height={117} 
                    className="drop-shadow-lg"
                  />
                </div>
                
                <div 
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent scan-line-animation"
                  style={{ boxShadow: '0 0 20px 5px rgba(34, 211, 238, 0.4)' }}
                />
                
                <div 
                  className="absolute inset-0 pointer-events-none pulse-animation"
                  style={{ background: 'linear-gradient(180deg, rgba(34,211,238,0.1) 0%, transparent 50%, rgba(34,211,238,0.1) 100%)' }}
                />
                
                <div className="absolute bottom-3 left-3 right-14">
                  <div className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    scanPhase === 'fetching' ? 'bg-blue-500 text-white' :
                    scanPhase === 'analyzing' ? 'bg-purple-500 text-white' :
                    scanPhase === 'testing' ? 'bg-orange-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {scanPhase === 'fetching' && t('phaseScanning')}
                    {scanPhase === 'analyzing' && t('phaseAnalyzing')}
                    {scanPhase === 'testing' && t('phasePerplexity')}
                    {scanPhase === 'done' && t('phaseCwv')}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Scan Progress (2/5) ────────────── */}
            <div className="lg:col-span-2 bg-slate-50 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
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
              { icon: <BarChart3 className="w-5 h-5" />, title: t('feat1Title'), desc: t('feat1Desc') },
              { icon: <Shield className="w-5 h-5" />, title: t('feat2Title'), desc: t('feat2Desc') },
              { icon: <Sparkles className="w-5 h-5" />, title: t('feat3Title'), desc: t('feat3Desc') },
              { icon: <Eye className="w-5 h-5" />, title: t('feat4Title'), desc: t('feat4Desc') },
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

          {/* ━━━ LIVE TEST RESULT ━━━ */}
          {results.liveTest && (
            <div className={`rounded-xl border-2 p-6 mb-6 ${
              results.liveTest.mentioned ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
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
                      ? t('liveTestFound', { company: results.analysis.companyName })
                      : t('liveTestNotFound', { company: results.analysis.companyName })
                    }
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t('liveTestedOn')} <span className="font-semibold text-purple-600">Perplexity</span>
                    {results.liveTest.mentioned && results.liveTest.mentionCount > 0 && (
                      <span className="ml-1">— {t('timesMentioned', { count: results.liveTest.mentionCount })}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-white/70 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">💬 {t('testedPrompt')}</p>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed">&ldquo;{results.liveTest.prompt}&rdquo;</p>
                  </div>
                  <button onClick={() => copyPrompt(results.liveTest.prompt)} className="flex-shrink-0 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer">
                    {copiedPrompt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              {results.liveTest.snippet && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🤖 {t('perplexityResponse')}</p>
                  <div className="bg-white/70 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
                    <p className={!showFullSnippet ? 'line-clamp-4' : ''}>{results.liveTest.snippet}</p>
                    {results.liveTest.snippet.length > 300 && (
                      <button onClick={() => setShowFullSnippet(!showFullSnippet)} className="text-xs text-purple-600 font-medium mt-2 hover:underline cursor-pointer">
                        {showFullSnippet ? t('showLess') : t('showFullResponse')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {results.liveTest.competitors?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    <Users className="w-3 h-3 inline mr-1" />{t('competitorsInResponse')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {results.liveTest.competitors.map((comp, i) => (
                      <span key={i} className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium px-2.5 py-1 rounded-full">{comp}</span>
                    ))}
                  </div>
                </div>
              )}

              {!results.liveTest.mentioned && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-sm text-slate-700">
                    <strong>{t('whatNow')}</strong> {t('notFoundCta')}
                  </p>
                  <Link href="/signup" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-red-700 hover:text-red-800">
                    {t('startFullAnalysis')} <ArrowRight className="w-3.5 h-3.5" />
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
                <p className="text-sm text-slate-500 mb-3">{results.domain} · {getScoreLabel(results.analysis.overallScore, t)}</p>
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

          {/* ━━━ ACTIONS BAR ━━━ */}
          <div className="flex items-center justify-end gap-3 mb-6">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingPdf ? t('pdfGenerating') : t('downloadPdf')}
            </button>
          </div>

          {/* ━━━ TOP RECOMMENDATIONS ━━━ */}
          {results.analysis.topRecommendations?.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 mb-6">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">⚡ {t('topRecommendations')}</p>
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
                              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${check.priority === 'kritiek' || check.priority === 'critical' ? 'bg-red-100 text-red-700' : check.priority === 'hoog' || check.priority === 'high' ? 'bg-orange-100 text-orange-700' : check.priority === 'middel' || check.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{check.priority}</span>
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('foundOnPage')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: t('words'), value: results.extracted.wordCount },
                { label: 'Headings', value: results.extracted.headingCount },
                { label: t('images'), value: results.extracted.imageCount },
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
              {!results.extracted.hasStructuredData && <Badge color="red" label={t('noStructuredData')} />}
              {!results.extracted.hasRobotsTxt && <Badge color="amber" label={t('noRobotsTxt')} />}
              {!results.extracted.hasLlmsTxt && <Badge color="amber" label={t('noLlmsTxt')} />}
              {results.extracted.richSnippets?.eligible?.length > 0 && 
                <Badge color="green" label={`Rich Snippets: ${results.extracted.richSnippets.eligible.join(', ')}`} />}
              {results.extracted.richSnippets?.eligible?.length === 0 && results.extracted.richSnippets?.suggestedTypes?.length > 0 &&
                <Badge color="red" label={t('noRichSnippets')} />}
            </div>
            {/* Core Web Vitals */}
            {results.extracted.coreWebVitals && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Core Web Vitals</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className={`text-lg font-bold ${results.extracted.coreWebVitals.performanceScore >= 90 ? 'text-green-600' : results.extracted.coreWebVitals.performanceScore >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                      {results.extracted.coreWebVitals.performanceScore}
                    </p>
                    <p className="text-xs text-slate-500">Performance</p>
                  </div>
                  {results.extracted.coreWebVitals.lcp && (
                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                      <p className={`text-lg font-bold ${results.extracted.coreWebVitals.lcp <= 2500 ? 'text-green-600' : results.extracted.coreWebVitals.lcp <= 4000 ? 'text-orange-500' : 'text-red-500'}`}>
                        {(results.extracted.coreWebVitals.lcp / 1000).toFixed(1)}s
                      </p>
                      <p className="text-xs text-slate-500">LCP</p>
                    </div>
                  )}
                  {results.extracted.coreWebVitals.cls !== null && results.extracted.coreWebVitals.cls !== undefined && (
                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                      <p className={`text-lg font-bold ${results.extracted.coreWebVitals.cls <= 0.1 ? 'text-green-600' : results.extracted.coreWebVitals.cls <= 0.25 ? 'text-orange-500' : 'text-red-500'}`}>
                        {results.extracted.coreWebVitals.cls}
                      </p>
                      <p className="text-xs text-slate-500">CLS</p>
                    </div>
                  )}
                  {results.extracted.coreWebVitals.inp != null && (
                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                      <p className={`text-lg font-bold ${results.extracted.coreWebVitals.inp <= 200 ? 'text-green-600' : results.extracted.coreWebVitals.inp <= 500 ? 'text-orange-500' : 'text-red-500'}`}>
                        {results.extracted.coreWebVitals.inp}ms
                      </p>
                      <p className="text-xs text-slate-500">INP</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ━━━ CTA ━━━ */}
          <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-lg font-bold text-slate-900 mb-2">{t('ctaTitle')}</p>
            <p className="text-slate-600 text-sm max-w-md mx-auto mb-5">{t('ctaDesc')}</p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-[#292956] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1e1e45] transition-colors">
              {t('createFreeAccount')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Scan another */}
          <div className="mt-6 text-center">
            {limitReached && !isAdmin ? (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-600 mb-3">
                  {user ? t('usedTodayScans', { count: MAX_FREE_SCANS }) : t('usedFreeScans', { count: MAX_FREE_SCANS })}
                </p>
                <Link
                  href={user ? '/dashboard' : '/signup'}
                  className="bg-[#292956] text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-[#1e1e45] transition-all inline-flex items-center gap-2 cursor-pointer text-sm"
                >
                  {user ? t('backToDashboard') : t('createFreeAccount')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <button onClick={() => { setResults(null); setUrl(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-sm text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 cursor-pointer">
                ← {t('analyzeAnother')}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── SEO CONTENT ────────────────────────────── */}
      {!results && !loading && (
        <>
          {/* Wat is een GEO Audit */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 leading-tight">
                  {locale === 'en'
                    ? <>What does ChatGPT say<br /><span className="text-[#4F46E5]">when someone searches for your business?</span></>
                    : <>Wat zegt ChatGPT<br /><span className="text-[#4F46E5]">als iemand naar jouw bedrijf zoekt?</span></>}
                </h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  {locale === 'en'
                    ? 'A GEO audit measures something different than traditional SEO. Not your Google position, but whether AI platforms like ChatGPT, Perplexity and Google AI Overviews actually recommend your business when someone asks a question.'
                    : 'Een GEO audit meet iets anders dan traditionele SEO. Niet je Google-positie, maar of AI-platformen zoals ChatGPT, Perplexity en Google AI Overviews jouw bedrijf daadwerkelijk aanbevelen als iemand een vraag stelt.'}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {locale === 'en'
                    ? 'With this free tool you get instant insight. We scan your page on 20+ signals, and test live on Perplexity whether your business appears. No account needed, result in 60 seconds.'
                    : 'Met deze gratis tool krijg je direct inzicht. We scannen je pagina op 20+ signalen, en testen live op Perplexity of jouw bedrijf verschijnt. Geen account nodig, resultaat in 60 seconden.'}
                </p>
              </div>
          </section>

          {/* Wat wordt er getest — stijl zoals "Hoe het werkt" op homepage */}
          <section className="bg-slate-50 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">
                {locale === 'en' ? 'What do we check?' : 'Wat checken we?'}
              </h2>
              <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">
                {locale === 'en'
                  ? 'The GEO Audit analyzes four areas that determine whether AI cites your content.'
                  : 'De GEO Audit analyseert vier gebieden die bepalen of AI jouw content citeert.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  {
                    num: '1',
                    title: locale === 'en' ? 'Content Quality' : 'Content Kwaliteit',
                    desc: locale === 'en'
                      ? 'Does your text contain direct answers that AI can extract? We check structure, word count, FAQ presence and whether your content is citation-ready.'
                      : 'Bevat je tekst directe antwoorden die AI kan extraheren? We checken structuur, woordaantal, FAQ-aanwezigheid en of je content citeerbaar is.'
                  },
                  {
                    num: '2',
                    title: locale === 'en' ? 'Technical Setup' : 'Technische Setup',
                    desc: locale === 'en'
                      ? 'Can AI bots reach your page? We verify robots.txt, llms.txt, structured data, Core Web Vitals and schema markup.'
                      : 'Kunnen AI-bots je pagina bereiken? We controleren robots.txt, llms.txt, structured data, Core Web Vitals en schema markup.'
                  },
                  {
                    num: '3',
                    title: locale === 'en' ? 'Citation Potential' : 'Citatie-potentieel',
                    desc: locale === 'en'
                      ? 'How likely is AI to cite you as a source? We look at unique data, expert signals, factual density and what competitors AI already mentions.'
                      : 'Hoe groot is de kans dat AI jou als bron citeert? We kijken naar unieke data, expertise-signalen, feitelijke dichtheid en welke concurrenten AI al noemt.'
                  },
                  {
                    num: '4',
                    title: locale === 'en' ? 'E-E-A-T Signals' : 'E-E-A-T Signalen',
                    desc: locale === 'en'
                      ? 'AI prioritizes trusted sources. We evaluate the same Experience, Expertise, Authority and Trust signals that Google and AI use.'
                      : 'AI geeft voorrang aan betrouwbare bronnen. We beoordelen dezelfde Ervaring, Expertise, Autoriteit en Betrouwbaarheid signalen die Google en AI gebruiken.'
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-[#292956] text-white flex items-center justify-center text-sm font-bold mb-3">{item.num}</div>
                    <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Live test uitleg */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 text-center">
              {locale === 'en'
                ? <>Not just analysis.<br /><span className="text-[#4F46E5]">a real AI test</span></>
                : <>Niet alleen analyse.<br /><span className="text-[#4F46E5]">een échte AI-test</span></>}
            </h2>
            <p className="text-slate-600 leading-relaxed text-center mb-6 max-w-2xl mx-auto">
              {locale === 'en'
                ? 'What makes this GEO audit unique: we generate a commercial prompt based on your page, send it to Perplexity in real-time, and check if your business is actually mentioned in the answer. You immediately see who AI recommends instead of you.'
                : 'Wat deze GEO audit uniek maakt: we genereren een commerciële prompt op basis van je pagina, sturen die real-time naar Perplexity, en controleren of jouw bedrijf daadwerkelijk in het antwoord staat. Je ziet direct wie AI aanbeveelt in plaats van jou.'}
            </p>
            <div className="bg-[#292956] rounded-2xl p-6 sm:p-8 text-white">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">👤</span>
                  </div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">
                    {locale === 'en'
                      ? '"Can you recommend a good [your industry] in [your city]?"'
                      : '"Kun je een goede [jouw branche] in [jouw stad] aanbevelen?"'}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">🤖</span>
                  </div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">
                    {locale === 'en'
                      ? '"Here are some options I can recommend..."'
                      : '"Hier zijn enkele opties die ik kan aanbevelen..."'}
                    <br />
                    <span className="text-emerald-400 font-medium">
                      {locale === 'en' ? 'Does your business appear? Or only your competitors?' : 'Staat jouw bedrijf erbij? Of alleen je concurrenten?'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEO vs GEO */}
          <section className="bg-slate-50 py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 text-center">
                {locale === 'en' ? 'SEO Audit vs GEO Audit' : 'SEO Audit vs GEO Audit'}
              </h2>
              <p className="text-slate-500 text-center mb-8 max-w-2xl mx-auto">
                {locale === 'en'
                  ? 'A GEO audit complements your SEO. Pages that rank well are more likely to be cited by AI, but only if the content is structured for it.'
                  : 'Een GEO audit is een aanvulling op je SEO. Pagina\'s die goed ranken worden vaker geciteerd door AI, maar alleen als de content ervoor gestructureerd is.'}
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-4 font-semibold text-slate-700"></th>
                      <th className="text-left p-4 font-semibold text-slate-700">SEO Audit</th>
                      <th className="text-left p-4 font-semibold text-[#4F46E5]">GEO Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { label: locale === 'en' ? 'Goal' : 'Doel', seo: locale === 'en' ? 'Rank higher in Google' : 'Hoger ranken in Google', geo: locale === 'en' ? 'Get cited by AI' : 'Geciteerd worden door AI' },
                      { label: locale === 'en' ? 'Measures' : 'Meet', seo: locale === 'en' ? 'Position, clicks' : 'Positie, klikken', geo: locale === 'en' ? 'Mentions, recommendations' : 'Vermeldingen, aanbevelingen' },
                      { label: 'Focus', seo: locale === 'en' ? 'Keywords & backlinks' : 'Zoekwoorden & backlinks', geo: locale === 'en' ? 'Content structure & authority' : 'Contentstructuur & autoriteit' },
                      { label: 'Test', seo: 'Google SERP', geo: locale === 'en' ? 'Live Perplexity check' : 'Live Perplexity check' },
                      { label: locale === 'en' ? 'Technical' : 'Technisch', seo: 'robots.txt, sitemap', geo: 'llms.txt, JSON-LD, FAQ schema' },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="p-4 font-medium text-slate-700">{row.label}</td>
                        <td className="p-4 text-slate-500">{row.seo}</td>
                        <td className="p-4 text-slate-900">{row.geo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
                  {locale === 'en' ? 'Frequently asked questions' : 'Veelgestelde vragen'}
                </h2>
                <div className="space-y-3">
                  {faqItems.map((item, i) => (
                    <details key={i} className="group border border-slate-200 rounded-xl bg-white">
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-slate-900 hover:bg-slate-50 rounded-xl text-sm sm:text-base">
                        {item.q}
                        <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" />
                      </summary>
                      <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                    </details>
                  ))}
                </div>
          </section>

          {/* CTA */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 text-center">
              <p className="text-lg font-bold text-slate-900 mb-2">
                {locale === 'en' ? 'Want to optimize more than one page?' : 'Wil je meer dan één pagina analyseren?'}
              </p>
              <p className="text-slate-600 text-sm max-w-md mx-auto mb-5">
                {locale === 'en'
                  ? 'In the dashboard you do a complete GEO Analyse: prompts matched to your pages, with targeted recommendations per page. Completely free.'
                  : 'In het dashboard maak je een uitgebreide GEO Analyse: prompts gematcht aan jouw pagina\'s, met gerichte aanbevelingen per pagina. Helemaal gratis.'}
              </p>
              <Link href="/signup" className="inline-flex items-center gap-2 bg-[#292956] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1e1e45] transition-colors cursor-pointer">
                {locale === 'en' ? 'Create free account' : 'Gratis account aanmaken'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          {/* Teun welkom */}
          <div className="flex justify-center pb-12">
            <Image
              src="/Teun-ai_welkom.png"
              alt={locale === 'en' ? 'Teun.ai mascot' : 'Teun.ai mascotte'}
              width={200}
              height={200}
              className="w-40 sm:w-48"
            />
          </div>
        </>
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
        .scan-line-animation { animation: scanLine 2s ease-in-out infinite; }
        .slide-in-animation { animation: slideIn 0.3s ease-out; }
        .pulse-animation { animation: pulse 2s ease-in-out infinite; }
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

function getScoreLabel(score, t) {
  if (score >= 80) return t('scoreGood')
  if (score >= 60) return t('scoreFair')
  if (score >= 40) return t('scoreModerate')
  return t('scorePoor')
}
