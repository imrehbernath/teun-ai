// app/[locale]/tools/geo-audit/page.jsx
// GEO Audit — analyze a page + live Perplexity test
// Cream/Lora/spark editorial design
'use client'

import { useState, useRef, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'
import {
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, Globe, ChevronDown, ChevronUp,
  Zap, ExternalLink, Copy, Check, Loader2, Users,
  Download, Search
} from 'lucide-react'

// ============================================
// SCAN STEPS (i18n)
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

export default function GeoAuditPage() {
  const t = useTranslations('geoAudit')
  const locale = useLocale()
  const isEn = locale === 'en'
  const SCAN_STEPS = useScanSteps()

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showFullSnippet, setShowFullSnippet] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [faqCategory, setFaqCategory] = useState('all')
  const resultsRef = useRef(null)

  // Scan limit
  const MAX_ANON_SCANS = 1
  const MAX_FREE_SCANS = 1
  const ADMIN_EMAILS = ['imre@onlinelabs.nl', 'hallo@onlinelabs.nl']
  const [scanCount, setScanCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  // Scan animation state
  const [scanPhase, setScanPhase] = useState('idle')
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [scanUrl, setScanUrl] = useState('')
  const [cwvElapsed, setCwvElapsed] = useState(0)

  useEffect(() => {
    if (scanPhase !== 'done' || !loading) { setCwvElapsed(0); return }
    const start = Date.now()
    const timer = setInterval(() => setCwvElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [scanPhase, loading])

  // FAQ items with category for filter pills
  const faqItems = isEn ? [
    { cat: 'pricing', q: 'Is the GEO Audit really free?', a: 'Yes, you can try 1 audit for free without an account. With a free account you get 1 audit per week. Upgrade to Lite or Pro for unlimited audits.' },
    { cat: 'product', q: 'What is the difference between GEO and SEO?', a: 'SEO focuses on ranking in Google\'s link-based results. GEO optimizes your content to be cited and recommended by AI platforms like ChatGPT, Perplexity and Google AI Overviews.' },
    { cat: 'product', q: 'Why does AI visibility matter for my business?', a: 'More than 40% of online searches will involve AI by 2026. If your competitors are mentioned and you are not, you lose visibility and potential customers, even if you rank well in Google.' },
    { cat: 'product', q: 'Which AI platforms does the audit test?', a: 'The live test runs on Perplexity. The technical and content analysis covers optimization for ChatGPT, Perplexity, Google AI Overviews and Claude.' },
    { cat: 'results', q: 'How can I improve my GEO Score?', a: 'The audit gives you 3 concrete recommendations. Common improvements include: adding FAQ schema, structuring content with direct answers, implementing JSON-LD structured data, and creating an llms.txt file.' },
  ] : [
    { cat: 'pricing', q: 'Is de GEO Audit echt gratis?', a: 'Ja, je kunt 1 audit gratis uitvoeren zonder account. Met een gratis account krijg je 1 audit per week. Upgrade naar Lite of Pro voor onbeperkte audits.' },
    { cat: 'product', q: 'Wat is het verschil tussen GEO en SEO?', a: 'SEO richt zich op ranken in Google\'s linkgebaseerde resultaten. GEO optimaliseert je content om geciteerd en aanbevolen te worden door AI-platformen zoals ChatGPT, Perplexity en Google AI Overviews.' },
    { cat: 'product', q: 'Waarom is AI-zichtbaarheid belangrijk voor mijn bedrijf?', a: 'Meer dan 40% van online zoekopdrachten gaat in 2026 via AI. Als jouw concurrenten wél genoemd worden en jij niet, verlies je zichtbaarheid en potentiële klanten, zelfs als je goed rankt in Google.' },
    { cat: 'product', q: 'Welke AI-platformen test de audit?', a: 'De live test draait op Perplexity. De technische en content-analyse dekt optimalisatie voor ChatGPT, Perplexity, Google AI Overviews en Claude.' },
    { cat: 'results', q: 'Hoe verbeter ik mijn GEO Score?', a: 'De audit geeft je 3 concrete aanbevelingen. Veelvoorkomende verbeteringen zijn: FAQ-schema toevoegen, content structureren met directe antwoorden, JSON-LD structured data implementeren, en een llms.txt bestand aanmaken.' },
  ]
  const catLabels = isEn
    ? { all: 'All', product: 'Product', pricing: 'Pricing', results: 'Results' }
    : { all: 'Alles', product: 'Product', pricing: 'Prijzen', results: 'Resultaten' }
  const faqCounts = {
    all: faqItems.length,
    product: faqItems.filter(i => i.cat === 'product').length,
    pricing: faqItems.filter(i => i.cat === 'pricing').length,
    results: faqItems.filter(i => i.cat === 'results').length,
  }
  const filteredFaq = faqCategory === 'all' ? faqItems : faqItems.filter(i => i.cat === faqCategory)

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

  // Auth + scan count
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setAuthChecked(true)

      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
        setLimitReached(false); setScanCount(0); setIsPro(true); return
      }

      if (currentUser) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', currentUser.id)
            .single()
          if (['active', 'canceling'].includes(profile?.subscription_status)) {
            setIsPro(true); setLimitReached(false); setScanCount(0); return
          }
        } catch {}
      }

      try {
        if (currentUser) {
          const now = new Date()
          const weekKey = `geo_audit_${now.getFullYear()}_W${Math.ceil(((now - new Date(now.getFullYear(),0,1)) / 86400000 + new Date(now.getFullYear(),0,1).getDay() + 1) / 7)}`
          const stored = localStorage.getItem(weekKey)
          const count = stored ? parseInt(stored, 10) : 0
          setScanCount(count)
          if (count >= MAX_FREE_SCANS) setLimitReached(true)
        } else {
          const stored = localStorage.getItem('geo_audit_count')
          const count = stored ? parseInt(stored, 10) : 0
          setScanCount(count)
          if (count >= MAX_ANON_SCANS) setLimitReached(true)
        }
      } catch (e) { /* private browsing */ }
    })
  }, [])

  // Scan step animation
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

  async function handleAudit(e) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true); setError(''); setResults(null)
    setExpandedCategory(null); setShowFullSnippet(false)
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
            const now = new Date()
            const weekKey = `geo_audit_${now.getFullYear()}_W${Math.ceil(((now - new Date(now.getFullYear(),0,1)) / 86400000 + new Date(now.getFullYear(),0,1).getDay() + 1) / 7)}`
            localStorage.setItem(weekKey, newCount.toString())
          } else {
            localStorage.setItem('geo_audit_count', newCount.toString())
          }
        } catch (e) {}
        const limit = user ? MAX_FREE_SCANS : MAX_ANON_SCANS
        if (newCount >= limit) setLimitReached(true)
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
      a.download = `GEO-Audit-${(results.analysis?.companyName || results.domain || 'report').replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`
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
    <div className="tool-page gea-page">
      <div className="gea-wrap">

        {/* HERO */}
        <div className="tool-hero">
          <div className="tool-eyebrow">{t.has('eyebrow') ? t('eyebrow') : 'GEO AUDIT TOOL'}</div>
          <h1>
            {isEn ? (
              <>How <em>AI-ready</em> is your page?</>
            ) : (
              <>Hoe <em>AI-ready</em> is je pagina?</>
            )}
          </h1>
          <p className="tool-hero-sub">
            {isEn ? (
              <>We analyse your page and test <strong>live on Perplexity</strong> if you can be found.</>
            ) : (
              <>We analyseren je pagina én testen <strong>live op Perplexity</strong> of je gevonden wordt.</>
            )}
          </p>
          <div className="tool-trust-pills">
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#10B981' }} />Perplexity</span>
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#6366F1' }} />ChatGPT</span>
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#3B82F6' }} />Google AI Overviews</span>
          </div>
        </div>

        {/* FORM or SIGNUP WALL */}
        {limitReached && !isAdmin && !isPro && !loading && !results ? (
          <div className="gea-limit-card">
            <div className="gea-limit-icon"><Zap className="gea-icon-md" /></div>
            {user ? (
              <>
                <h2 className="gea-limit-title">{t('dailyLimitTitle')}</h2>
                <p className="gea-limit-desc">{t('dailyLimitDesc', { count: MAX_FREE_SCANS })}</p>
                <Link href={isEn ? '/en/pricing' : '/pricing'} className="teun-scan-btn gea-limit-btn">
                  {isEn ? 'Upgrade to Pro for unlimited scans' : 'Upgrade naar Pro voor onbeperkt scannen'} <ArrowRight className="gea-icon-sm" />
                </Link>
              </>
            ) : (
              <>
                <h2 className="gea-limit-title">{t('freeLimitTitle', { count: MAX_FREE_SCANS })}</h2>
                <p className="gea-limit-desc">{t('freeLimitDesc', { count: MAX_FREE_SCANS })}</p>
                <div className="gea-limit-actions">
                  <Link href="/signup" className="teun-scan-btn gea-limit-btn">
                    {t('createFreeAccount')} <ArrowRight className="gea-icon-sm" />
                  </Link>
                  <Link href="/login" className="gea-limit-secondary">{t('alreadyHaveAccount')}</Link>
                </div>
              </>
            )}
            <p className="gea-limit-hint">{user ? t('scansPerDay', { count: MAX_FREE_SCANS }) : t('noCreditCard')}</p>
          </div>
        ) : (
          <form onSubmit={handleAudit} className="gea-form" id="gea-form">
            <div className="gea-input-row">
              <Globe className="gea-input-icon" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('placeholder')}
                className="gea-input"
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} className="teun-scan-btn gea-submit">
              {loading ? (
                <><Loader2 className="gea-icon-md gea-spin" /> {t('analyzing')}</>
              ) : (
                <><Search className="gea-icon-md" /> {t('analyze')}</>
              )}
            </button>
            <p className="gea-form-hint">
              {loading ? t('scanDurationLoading') : t('scanDuration')}
            </p>
          </form>
        )}

        {!limitReached && authChecked && !isAdmin && !isPro && !loading && !results && (
          <p className="gea-scans-line">
            {t('free')} · {user ? '' : `${t('noAccountNeeded')} · `}
            {t('scansAvailable', { remaining: MAX_FREE_SCANS - scanCount, total: MAX_FREE_SCANS })}
            {user ? ` ${t('today')}` : ''}
          </p>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="tool-error gea-error">
            <XCircle className="gea-icon-md gea-error-icon" />
            <div>
              <strong>{error}</strong>
              <p>{t('checkUrl')}</p>
            </div>
          </div>
        )}

        {/* SCAN ANIMATION */}
        {loading && (
          <div className="gea-scan">
            {/* Top progress bar */}
            <div className="gea-scan-progress">
              <div className="gea-scan-progress-head">
                <span className="gea-scan-phase">
                  {scanPhase === 'fetching' && t('phaseFetching')}
                  {scanPhase === 'analyzing' && t('phaseAnalyzing')}
                  {scanPhase === 'testing' && t('phaseTesting')}
                  {scanPhase === 'done' && (isEn ? 'Loading Core Web Vitals...' : 'Core Web Vitals laden...')}
                </span>
                <span className="gea-scan-pct">
                  {scanPhase === 'done' ? (cwvElapsed > 0 ? `${cwvElapsed}s` : '100%') : `${progress}%`}
                </span>
              </div>
              <div className="gea-scan-bar">
                <div
                  className={`gea-scan-bar-fill${scanPhase === 'done' ? ' gea-pulse' : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {scanPhase === 'done' && (
                <p className="gea-scan-cwv-hint">
                  {(() => {
                    if (cwvElapsed >= 90) return isEn ? 'Almost there, final check running...' : 'Bijna klaar, laatste check loopt...'
                    if (cwvElapsed >= 45) return isEn ? 'This site needs extra processing, hang on (up to 90s total)' : 'Deze site vereist extra verwerking, nog even geduld (tot 90s totaal)'
                    return isEn ? 'The scan usually takes 30-60 seconds' : 'De scan duurt meestal 30-60 seconden'
                  })()}
                </p>
              )}
            </div>

            {/* Scan visual */}
            <div className="gea-scan-grid">
              {/* Browser mockup */}
              <div className="gea-browser">
                <div className="gea-browser-bar">
                  <div className="gea-browser-dots">
                    <span className="gea-browser-dot gea-browser-dot-r" />
                    <span className="gea-browser-dot gea-browser-dot-y" />
                    <span className="gea-browser-dot gea-browser-dot-g" />
                  </div>
                  <div className="gea-browser-url">{scanUrl.replace(/^https?:\/\//, '')}</div>
                </div>
                <div className="gea-browser-body">
                  <div className="gea-skeleton gea-skeleton-h2" />
                  <div className="gea-skeleton gea-skeleton-line" />
                  <div className="gea-skeleton gea-skeleton-line short" />
                  <div className="gea-skeleton gea-skeleton-line shorter" />
                  <div className="gea-skeleton gea-skeleton-block" />
                  <div className="gea-skeleton gea-skeleton-line" />
                  <div className="gea-skeleton-grid">
                    <div className="gea-skeleton gea-skeleton-card" />
                    <div className="gea-skeleton gea-skeleton-card" />
                    <div className="gea-skeleton gea-skeleton-card" />
                  </div>

                  <div className="gea-browser-mascot gea-bounce">
                    <Image src="/images/teun-met-vergrootglas.png" alt="Teun" width={90} height={117} />
                  </div>

                  <div className="gea-scan-line" />

                  <div className="gea-browser-status">
                    <Loader2 className="gea-icon-xs gea-spin" />
                    {scanPhase === 'fetching' && t('phaseScanning')}
                    {scanPhase === 'analyzing' && t('phaseAnalyzing')}
                    {scanPhase === 'testing' && t('phasePerplexity')}
                    {scanPhase === 'done' && (
                      <>Core Web Vitals{cwvElapsed > 0 ? ` · ${cwvElapsed}s` : '...'}</>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Circle with current step */}
              <div className="gea-scan-side">
                <div className="gea-scan-circle">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-2)" strokeWidth="6" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke="var(--spark)"
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${(progress / 100) * 327} 327`}
                      transform="rotate(-90 60 60)"
                      className={scanPhase === 'done' ? 'gea-pulse' : ''}
                    />
                  </svg>
                  <div className="gea-scan-circle-text">
                    <span className="gea-scan-circle-num">
                      {scanPhase === 'done' && cwvElapsed > 0 ? `${cwvElapsed}s` : `${progress}%`}
                    </span>
                    <span className="gea-scan-circle-sub">
                      {scanPhase === 'done' ? 'PageSpeed' : `${completedSteps.length}/${SCAN_STEPS.length}`}
                    </span>
                  </div>
                </div>

                {scanPhase === 'done' ? (
                  <div className="gea-scan-step">
                    <p className="gea-scan-step-section">Google PageSpeed</p>
                    <p className="gea-scan-step-label">
                      {isEn ? 'Fetching performance data...' : 'Prestatiedata ophalen...'}
                    </p>
                  </div>
                ) : currentStepIndex < SCAN_STEPS.length && (
                  <div className="gea-scan-step">
                    <p className="gea-scan-step-section">{SCAN_STEPS[currentStepIndex].section}</p>
                    <p className="gea-scan-step-label">{SCAN_STEPS[currentStepIndex].label}</p>
                  </div>
                )}

                {completedSteps.length > 0 && (
                  <p className="gea-scan-completed">
                    <CheckCircle2 className="gea-icon-xs" />
                    {completedSteps[completedSteps.length - 1].label}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {results && (
          <div ref={resultsRef} className="gea-results">

            {/* Live test result */}
            {results.liveTest && (
              <div className={`gea-livetest gea-livetest-${results.liveTest.mentioned ? 'success' : 'fail'}`}>
                <div className="gea-livetest-head">
                  <div className="gea-livetest-icon">
                    {results.liveTest.mentioned ? <CheckCircle2 /> : <XCircle />}
                  </div>
                  <div>
                    <h2 className="gea-livetest-title">
                      {results.liveTest.mentioned
                        ? t('liveTestFound', { company: results.analysis.companyName })
                        : t('liveTestNotFound', { company: results.analysis.companyName })}
                    </h2>
                    <p className="gea-livetest-meta">
                      {t('liveTestedOn')} <strong>Perplexity</strong>
                      {results.liveTest.mentioned && results.liveTest.mentionCount > 0 && (
                        <> — {t('timesMentioned', { count: results.liveTest.mentionCount })}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="gea-livetest-prompt">
                  <div>
                    <p className="gea-livetest-label">💬 {t('testedPrompt')}</p>
                    <p className="gea-livetest-prompt-text">&ldquo;{results.liveTest.prompt}&rdquo;</p>
                  </div>
                  <button onClick={() => copyPrompt(results.liveTest.prompt)} className="gea-livetest-copy" title="Copy prompt">
                    {copiedPrompt ? <Check className="gea-icon-sm" /> : <Copy className="gea-icon-sm" />}
                  </button>
                </div>

                {results.liveTest.snippet && (
                  <div className="gea-livetest-snippet">
                    <p className="gea-livetest-label">🤖 {t('perplexityResponse')}</p>
                    <div className="gea-livetest-snippet-body">
                      <p className={!showFullSnippet ? 'gea-clamp-4' : ''}>{results.liveTest.snippet}</p>
                      {results.liveTest.snippet.length > 300 && (
                        <button onClick={() => setShowFullSnippet(!showFullSnippet)} className="gea-livetest-toggle">
                          {showFullSnippet ? t('showLess') : t('showFullResponse')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {results.liveTest.competitors?.length > 0 && (
                  <div className="gea-livetest-competitors">
                    <p className="gea-livetest-label">
                      <Users className="gea-icon-xs" /> {t('competitorsInResponse')}
                    </p>
                    <div className="gea-livetest-tags">
                      {results.liveTest.competitors.map((comp, i) => (
                        <span key={i} className="gea-livetest-tag">{comp}</span>
                      ))}
                    </div>
                  </div>
                )}

                {!results.liveTest.mentioned && (
                  <div className="gea-livetest-cta">
                    <p>
                      <strong>{t('whatNow')}</strong> {t('notFoundCta')}
                    </p>
                    <Link href="/signup" className="gea-livetest-cta-link">
                      {t('startFullAnalysis')} <ArrowRight className="gea-icon-xs" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Overall score */}
            <div className="gea-score">
              <div className="gea-score-circle">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-2)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={getScoreColor(results.analysis.overallScore)}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(results.analysis.overallScore / 100) * 327} 327`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="gea-score-circle-text">
                  <span className="gea-score-circle-num">{results.analysis.overallScore}</span>
                  <span className="gea-score-circle-sub">/ 100</span>
                </div>
              </div>
              <div className="gea-score-body">
                <h2 className="gea-score-title">GEO Score</h2>
                <p className="gea-score-meta">{results.domain} · {getScoreLabel(results.analysis.overallScore, t)}</p>
                <div className="gea-score-bars">
                  {results.analysis.categories.map((cat) => (
                    <div key={cat.slug} className="gea-score-bar-row">
                      <span className="gea-score-bar-label">{cat.icon} {cat.name}</span>
                      <div className="gea-score-bar-track">
                        <div className="gea-score-bar-fill" style={{ width: `${cat.score}%`, backgroundColor: getScoreColor(cat.score) }} />
                      </div>
                      <span className="gea-score-bar-num">{cat.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions: PDF download */}
            <div className="gea-actions">
              <button onClick={handleDownloadPdf} disabled={downloadingPdf} className="gea-action-btn">
                {downloadingPdf ? <Loader2 className="gea-icon-sm gea-spin" /> : <Download className="gea-icon-sm" />}
                {downloadingPdf ? t('pdfGenerating') : t('downloadPdf')}
              </button>
            </div>

            {/* Top recommendations */}
            {results.analysis.topRecommendations?.length > 0 && (
              <div className="gea-recommendations">
                <p className="gea-recommendations-eyebrow">⚡ {t('topRecommendations')}</p>
                <ol className="gea-recommendations-list">
                  {results.analysis.topRecommendations.map((rec, i) => (
                    <li key={i} className="gea-recommendation">
                      <span className="gea-recommendation-num">{i + 1}</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Category accordion */}
            <div className="gea-categories">
              {results.analysis.categories.map((cat) => (
                <div key={cat.slug} className="gea-category">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.slug ? null : cat.slug)}
                    className="gea-category-head"
                  >
                    <div className="gea-category-meta">
                      <span className="gea-category-icon" style={{ backgroundColor: getScoreColor(cat.score) + '18' }}>{cat.icon}</span>
                      <div className="gea-category-text">
                        <p className="gea-category-name">{cat.name}</p>
                        <p className="gea-category-summary">{cat.summary}</p>
                      </div>
                    </div>
                    <div className="gea-category-right">
                      {cat.checks.length > 0 && (
                        <div className="gea-category-counts">
                          <span className="gea-category-count-good">{cat.checks.filter(c => c.status === 'good').length}</span>
                          <CheckCircle2 className="gea-icon-xs gea-text-success" />
                          {cat.checks.filter(c => c.status !== 'good').length > 0 && (
                            <>
                              <span className="gea-category-count-bad">{cat.checks.filter(c => c.status !== 'good').length}</span>
                              <AlertTriangle className="gea-icon-xs gea-text-warn" />
                            </>
                          )}
                        </div>
                      )}
                      <span className="gea-category-score" style={{ color: getScoreColor(cat.score) }}>{cat.score}</span>
                      {expandedCategory === cat.slug ? <ChevronUp className="gea-icon-sm" /> : <ChevronDown className="gea-icon-sm" />}
                    </div>
                  </button>
                  {expandedCategory === cat.slug && cat.checks.length > 0 && (
                    <div className="gea-category-body">
                      {cat.checks.map((check, i) => (
                        <div key={i} className="gea-check">
                          {check.status === 'good'
                            ? <CheckCircle2 className="gea-icon-md gea-text-success" />
                            : check.status === 'warning'
                              ? <AlertTriangle className="gea-icon-md gea-text-warn" />
                              : <XCircle className="gea-icon-md gea-text-danger" />}
                          <div className="gea-check-body">
                            <div className="gea-check-head">
                              <span className="gea-check-name">{check.name}</span>
                              <span className={`gea-check-priority gea-check-priority-${
                                check.priority === 'kritiek' || check.priority === 'critical' ? 'critical'
                                : check.priority === 'hoog' || check.priority === 'high' ? 'high'
                                : check.priority === 'middel' || check.priority === 'medium' ? 'medium'
                                : 'low'
                              }`}>{check.priority}</span>
                            </div>
                            <p className="gea-check-detail">{check.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Extracted meta + Core Web Vitals */}
            <div className="gea-meta">
              <p className="gea-meta-eyebrow">{t('foundOnPage')}</p>
              <div className="gea-meta-grid">
                {[
                  { label: t('words'), value: results.extracted.wordCount },
                  { label: 'Headings', value: results.extracted.headingCount },
                  { label: t('images'), value: results.extracted.imageCount },
                  { label: 'Schema', value: results.extracted.structuredDataTypes?.length || 0 },
                ].map((stat, i) => (
                  <div key={i} className="gea-meta-stat">
                    <p className="gea-meta-stat-num">{stat.value}</p>
                    <p className="gea-meta-stat-label">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="gea-badges">
                {results.extracted.hasStructuredData && <Badge color="success" label="Structured Data" />}
                {results.extracted.hasFAQ && <Badge color="success" label="FAQ" />}
                {results.extracted.hasRobotsTxt && <Badge color="success" label="robots.txt" />}
                {results.extracted.hasLlmsTxt && <Badge color="success" label="llms.txt" />}
                {!results.extracted.hasStructuredData && <Badge color="danger" label={t('noStructuredData')} />}
                {!results.extracted.hasRobotsTxt && <Badge color="warn" label={t('noRobotsTxt')} />}
                {!results.extracted.hasLlmsTxt && <Badge color="warn" label={t('noLlmsTxt')} />}
                {results.extracted.richSnippets?.eligible?.length > 0 &&
                  <Badge color="success" label={`Rich Snippets: ${results.extracted.richSnippets.eligible.join(', ')}`} />}
                {results.extracted.richSnippets?.eligible?.length === 0 && results.extracted.richSnippets?.suggestedTypes?.length > 0 &&
                  <Badge color="danger" label={t('noRichSnippets')} />}
              </div>

              {results.extracted.coreWebVitals && (
                <div className="gea-cwv">
                  <p className="gea-meta-eyebrow">Core Web Vitals</p>
                  <div className="gea-meta-grid">
                    <div className="gea-meta-stat">
                      <p className="gea-meta-stat-num" style={{ color: results.extracted.coreWebVitals.performanceScore >= 90 ? 'var(--success)' : results.extracted.coreWebVitals.performanceScore >= 50 ? '#f59e0b' : 'var(--danger)' }}>
                        {results.extracted.coreWebVitals.performanceScore}
                      </p>
                      <p className="gea-meta-stat-label">Performance</p>
                    </div>
                    {results.extracted.coreWebVitals.lcp && (
                      <div className="gea-meta-stat">
                        <p className="gea-meta-stat-num" style={{ color: results.extracted.coreWebVitals.lcp <= 2500 ? 'var(--success)' : results.extracted.coreWebVitals.lcp <= 4000 ? '#f59e0b' : 'var(--danger)' }}>
                          {(results.extracted.coreWebVitals.lcp / 1000).toFixed(1)}s
                        </p>
                        <p className="gea-meta-stat-label">LCP</p>
                      </div>
                    )}
                    {results.extracted.coreWebVitals.cls != null && (
                      <div className="gea-meta-stat">
                        <p className="gea-meta-stat-num" style={{ color: results.extracted.coreWebVitals.cls <= 0.1 ? 'var(--success)' : results.extracted.coreWebVitals.cls <= 0.25 ? '#f59e0b' : 'var(--danger)' }}>
                          {results.extracted.coreWebVitals.cls}
                        </p>
                        <p className="gea-meta-stat-label">CLS</p>
                      </div>
                    )}
                    {results.extracted.coreWebVitals.inp != null && (
                      <div className="gea-meta-stat">
                        <p className="gea-meta-stat-num" style={{ color: results.extracted.coreWebVitals.inp <= 200 ? 'var(--success)' : results.extracted.coreWebVitals.inp <= 500 ? '#f59e0b' : 'var(--danger)' }}>
                          {results.extracted.coreWebVitals.inp}ms
                        </p>
                        <p className="gea-meta-stat-label">INP</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic CTA based on result */}
            <div className="gea-result-cta">
              {(() => {
                const score = results.analysis?.overallScore || 0
                const mentioned = results.liveTest?.mentioned || false
                const competitors = results.liveTest?.competitors || []
                const companyName = results.analysis?.companyName || results.domain || ''
                const topCompetitor = competitors.length > 0 ? competitors[0] : null

                const titlePre = !mentioned
                  ? (isEn ? `${companyName} is invisible on` : `${companyName} is onzichtbaar op`)
                  : score < 60
                    ? (isEn ? `GEO Score ${score}/100 — AI finds your page hard to` : `GEO Score ${score}/100 — AI vindt je pagina lastig om aan te`)
                    : score < 80
                      ? (isEn ? `GEO Score ${score}/100 — good, but` : `GEO Score ${score}/100 — goed, maar`)
                      : (isEn ? `GEO Score ${score}/100 — strong! But this is just` : `GEO Score ${score}/100 — sterk! Maar dit is slechts`)

                const titleEm = !mentioned
                  ? 'Perplexity'
                  : score < 60
                    ? (isEn ? 'recommend' : 'bevelen')
                    : score < 80
                      ? `${competitors.length} ${isEn ? 'competitors also appear' : 'concurrenten staan er ook bij'}`
                      : (isEn ? '1 page and 1 prompt' : '1 pagina en 1 prompt')

                const titlePost = !mentioned && topCompetitor
                  ? (isEn ? ` — ${topCompetitor} is recommended` : ` — ${topCompetitor} wordt wél aanbevolen`)
                  : ''

                const description = !mentioned
                  ? (isEn
                      ? `${competitors.length} competitors appear in the AI answer for your prompt. Create a free account and scan your visibility across 10 prompts on 4 AI platforms.`
                      : `${competitors.length} concurrenten staan wél in het AI-antwoord op jouw prompt. Maak een gratis account aan en scan je zichtbaarheid op 10 prompts op 4 AI-platforms.`)
                  : (isEn
                      ? 'This audit checked 1 page on 1 prompt. Create a free account and get a full analysis: 10 prompts, 4 platforms, all your important pages.'
                      : 'Deze audit checkte 1 pagina op 1 prompt. Maak een gratis account aan en krijg een volledige analyse: 10 prompts, 4 platforms, al je belangrijke pagina\'s.')

                return (
                  <>
                    <h2 className="gea-result-cta-title">
                      {titlePre} <em>{titleEm}</em>{titlePost}
                    </h2>
                    <p className="gea-result-cta-desc">{description}</p>
                    {!user ? (
                      <Link href="/signup" className="teun-scan-btn gea-result-cta-btn">
                        {isEn ? 'Create free account' : 'Gratis account aanmaken'} <ArrowRight className="gea-icon-sm" />
                      </Link>
                    ) : (
                      <Link href="/dashboard" className="teun-scan-btn gea-result-cta-btn">
                        {isEn ? 'Go to dashboard' : 'Ga naar dashboard'} <ArrowRight className="gea-icon-sm" />
                      </Link>
                    )}
                  </>
                )
              })()}
            </div>

            {/* WordPress plugin */}
            <div className="gea-wp">
              <div className="gea-wp-icon">
                <Image src="/images/wordpress-icon.svg" alt="WordPress" width={32} height={32} />
              </div>
              <div className="gea-wp-body">
                <h3>
                  {isEn ? <>WordPress user? <em>Scan all your pages for free</em></> : <>WordPress gebruiker? <em>Scan al je pagina&rsquo;s gratis</em></>}
                </h3>
                <p>
                  {isEn
                    ? 'Install the free Teun.ai GEO plugin and get a GEO Score with recommendations for every page — directly in your WordPress editor. No account needed.'
                    : 'Installeer de gratis Teun.ai GEO plugin en krijg een GEO Score met aanbevelingen per pagina — direct in je WordPress editor. Geen account nodig.'}
                </p>
              </div>
              <a
                href="https://wordpress.org/plugins/teunai-geo/"
                target="_blank"
                rel="noopener noreferrer"
                className="gea-wp-btn"
              >
                <ExternalLink className="gea-icon-sm" />
                {isEn ? 'Install plugin' : 'Plugin installeren'}
              </a>
            </div>

            {/* Scan another / limit reached */}
            <div className="gea-bottom">
              {limitReached && !isAdmin && !isPro ? (
                <div className="gea-bottom-limit">
                  <p>{user ? t('usedTodayScans', { count: MAX_FREE_SCANS }) : t('usedFreeScans', { count: MAX_FREE_SCANS })}</p>
                  {user ? (
                    <Link href={isEn ? '/en/pricing' : '/pricing'} className="teun-scan-btn gea-bottom-btn">
                      {isEn ? 'Upgrade to Pro for unlimited scans' : 'Upgrade naar Pro voor onbeperkt scannen'} <ArrowRight className="gea-icon-sm" />
                    </Link>
                  ) : (
                    <Link href="/signup" className="teun-scan-btn gea-bottom-btn">
                      {t('createFreeAccount')} <ArrowRight className="gea-icon-sm" />
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setResults(null); setUrl(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="gea-bottom-link"
                >
                  ← {t('analyzeAnother')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SEO content (idle) */}
      {!results && !loading && (
        <>
          {/* Intro */}
          <section className="tool-seo-intro">
            <div className="tool-wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
              <h2>
                {isEn ? <>20+ signals for your <em>AI findability</em>.</> : <>20+ signalen voor je <em>AI-vindbaarheid</em>.</>}
              </h2>
              <p>
                {isEn
                  ? 'A GEO audit measures something different than traditional SEO. Not your Google position, but whether AI platforms like ChatGPT, Perplexity and Google AI Overviews actually recommend your business when someone asks a question.'
                  : 'Een GEO audit meet iets anders dan traditionele SEO. Niet je Google-positie, maar of AI-platformen zoals ChatGPT, Perplexity en Google AI Overviews jouw bedrijf daadwerkelijk aanbevelen als iemand een vraag stelt.'}
              </p>
              <p>
                {isEn
                  ? 'With this free tool you get instant insight. We scan your page on 20+ signals, and test live on Perplexity whether your business appears. No account needed, results within a minute.'
                  : 'Met deze gratis tool krijg je direct inzicht. We scannen je pagina op 20+ signalen, en testen live op Perplexity of jouw bedrijf verschijnt. Geen account nodig, resultaat binnen een minuut.'}
              </p>
            </div>
          </section>

          {/* What we check — 4 grid */}
          <section className="tool-seo-how">
            <div className="tool-seo-how-wrap">
              <h2>
                {isEn ? <>What do we <em>check?</em></> : <>Wat <em>checken</em> we?</>}
              </h2>
              <p className="tool-seo-how-sub">
                {isEn
                  ? 'The GEO Audit analyses four areas that determine whether AI cites your content.'
                  : 'De GEO Audit analyseert vier gebieden die bepalen of AI jouw content citeert.'}
              </p>
              <div className="tool-seo-how-grid gea-how-4">
                {[
                  {
                    title: isEn ? 'Content Quality' : 'Content Kwaliteit',
                    desc: isEn
                      ? 'Does your text contain direct answers that AI can extract? We check structure, word count, FAQ presence and citation-readiness.'
                      : 'Bevat je tekst directe antwoorden die AI kan extraheren? We checken structuur, woordaantal, FAQ-aanwezigheid en of je content citeerbaar is.'
                  },
                  {
                    title: isEn ? 'Technical Setup' : 'Technische Setup',
                    desc: isEn
                      ? 'Can AI bots reach your page? We verify robots.txt, llms.txt, structured data, Core Web Vitals and schema markup.'
                      : 'Kunnen AI-bots je pagina bereiken? We controleren robots.txt, llms.txt, structured data, Core Web Vitals en schema markup.'
                  },
                  {
                    title: isEn ? 'Citation Potential' : 'Citatie-potentieel',
                    desc: isEn
                      ? 'How likely is AI to cite you as a source? We look at unique data, expert signals, factual density and what competitors AI already mentions.'
                      : 'Hoe groot is de kans dat AI jou als bron citeert? We kijken naar unieke data, expertise-signalen, feitelijke dichtheid en welke concurrenten AI al noemt.'
                  },
                  {
                    title: 'E-E-A-T',
                    desc: isEn
                      ? 'AI prioritises trusted sources. We evaluate the same Experience, Expertise, Authority and Trust signals that Google and AI use.'
                      : 'AI geeft voorrang aan betrouwbare bronnen. We beoordelen dezelfde Ervaring, Expertise, Autoriteit en Betrouwbaarheid signalen die Google en AI gebruiken.'
                  }
                ].map((item, i) => (
                  <div key={i} className="tool-seo-how-card">
                    <div className="tool-seo-how-card-head">
                      <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SEO vs GEO comparison table */}
          <section className="gea-compare-section">
            <div className="gea-compare-wrap">
              <h2 className="gea-compare-title">
                {isEn ? <>SEO Audit vs <em>GEO Audit</em></> : <>SEO Audit vs <em>GEO Audit</em></>}
              </h2>
              <p className="gea-compare-sub">
                {isEn
                  ? 'Two different goals, two different methods. GEO complements your SEO strategy.'
                  : 'Twee verschillende doelen, twee verschillende methoden. GEO is een aanvulling op je SEO strategie.'}
              </p>
              <div className="gea-compare-table">
                <div className="gea-compare-row gea-compare-head">
                  <div></div>
                  <div className="gea-compare-col-seo">SEO Audit</div>
                  <div className="gea-compare-col-geo">GEO Audit</div>
                </div>
                {[
                  { label: isEn ? 'Goal' : 'Doel', seo: isEn ? 'Rank higher in Google' : 'Hoger ranken in Google', geo: isEn ? 'Get cited by AI' : 'Geciteerd worden door AI' },
                  { label: isEn ? 'Measures' : 'Meet', seo: isEn ? 'Position, clicks' : 'Positie, klikken', geo: isEn ? 'Mentions, recommendations' : 'Vermeldingen, aanbevelingen' },
                  { label: 'Focus', seo: isEn ? 'Keywords & backlinks' : 'Zoekwoorden & backlinks', geo: isEn ? 'Content structure & authority' : 'Contentstructuur & autoriteit' },
                  { label: 'Test', seo: 'Google SERP', geo: 'Live Perplexity' },
                  { label: isEn ? 'Technical' : 'Technisch', seo: 'robots.txt, sitemap', geo: 'llms.txt, JSON-LD, FAQ schema' },
                ].map((row, i) => (
                  <div key={i} className="gea-compare-row">
                    <div className="gea-compare-label">{row.label}</div>
                    <div className="gea-compare-seo">{row.seo}</div>
                    <div className="gea-compare-geo">{row.geo}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="teun-final" aria-labelledby="gea-final-heading">
            <div className="wrap">
              <h2 id="gea-final-heading">
                {isEn ? (
                  <>Be in the <em>answer</em>.<br />Not just the index.</>
                ) : (
                  <>Sta in het <em>antwoord</em>.<br />Niet alleen in de index.</>
                )}
              </h2>
              <p>
                {isEn
                  ? 'Google rewards rankings. AI rewards citations. The GEO Audit shows you exactly where you stand on both.'
                  : 'Google beloont rankings. AI beloont citaties. De GEO Audit laat zien hoe je ervoor staat op beide.'}
              </p>
              <div className="btns">
                <button
                  onClick={() => document.getElementById('gea-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="btn-primary"
                >
                  {isEn ? 'Start free GEO Audit' : 'Gratis GEO Audit starten'} <span aria-hidden="true">→</span>
                </button>
                <Link href={isEn ? '/en/pricing' : '/pricing'} className="btn-secondary">
                  {isEn ? 'View Lite & Pro' : 'Bekijk Lite & Pro'}
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="teun-faq" id="faq" aria-labelledby="gea-faq-heading">
            <div className="wrap">
              <div className="teun-faq-head">
                <div className="teun-faq-eyebrow">
                  {isEn ? 'QUESTIONS & ANSWERS' : 'VRAGEN & ANTWOORDEN'}
                </div>
                <h2 id="gea-faq-heading">
                  {isEn ? <>Everything you want to know<br /><em>before you scan.</em></> : <>Alles wat je wilt weten<br /><em>voor je scant.</em></>}
                </h2>
                <p className="sub">
                  {isEn
                    ? 'No bot answers, no marketing speak. Real explanations, written by our team.'
                    : 'Geen bot-antwoorden, geen marketingpraat. De echte uitleg, geschreven door ons team.'}
                </p>
              </div>

              <div className="teun-faq-cats" role="tablist">
                {[
                  { id: 'all',     count: faqCounts.all },
                  { id: 'product', count: faqCounts.product },
                  { id: 'pricing', count: faqCounts.pricing },
                  { id: 'results', count: faqCounts.results }
                ].map(({ id, count }) => (
                  <button
                    key={id}
                    className={faqCategory === id ? 'active' : ''}
                    onClick={() => { setFaqCategory(id); setOpenFaq(0) }}
                    role="tab"
                    aria-selected={faqCategory === id}
                  >
                    {catLabels[id]}
                    <span className="count">{count}</span>
                  </button>
                ))}
              </div>

              <div className="teun-faq-list">
                {filteredFaq.map((item, i) => (
                  <details
                    key={`${faqCategory}-${i}`}
                    className="teun-faq-item"
                    open={openFaq === i}
                    onToggle={(e) => { if (e.target.open) setOpenFaq(i) }}
                  >
                    <summary>
                      <span className="num">{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="q">{item.q}</h3>
                      <span className="cat-chip">{catLabels[item.cat]}</span>
                      <span className="toggle" aria-hidden="true">
                        <svg viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </span>
                    </summary>
                    <div className="answer-wrap">
                      <div className="answer">{item.a}</div>
                    </div>
                  </details>
                ))}
              </div>

              <div className="teun-faq-help">
                <div>
                  <h3>
                    {isEn ? <>Still got questions? <em>We&rsquo;re here.</em></> : <>Nog vragen? <em>We helpen je.</em></>}
                  </h3>
                  <p>
                    {isEn
                      ? 'Reach us by email or book a 15-minute call. No sales pitch, just answers.'
                      : 'Stuur ons een mail of plan een gesprek van 15 minuten. Geen verkooppraat, gewoon antwoorden.'}
                  </p>
                </div>
                <div className="teun-faq-help-actions">
                  <a href="mailto:hallo@teun.ai" className="teun-faq-help-btn primary">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 3h10v8H2z M2 3l5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    hallo@teun.ai
                  </a>
                  <a
                    href="https://calendly.com/imre-onlinelabs/teun-ai-demo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="teun-faq-help-btn secondary"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M2 6h10M5 1v3M9 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {isEn ? 'Book a call' : 'Plan een gesprek'}
                  </a>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// ============================================
// HELPERS
// ============================================
function Badge({ color, label }) {
  return <span className={`gea-badge gea-badge-${color}`}>{label}</span>
}

function getScoreColor(score) {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#3B82F6'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

function getScoreLabel(score, t) {
  if (score >= 80) return t('scoreGood')
  if (score >= 60) return t('scoreFair')
  if (score >= 40) return t('scoreModerate')
  return t('scorePoor')
}
