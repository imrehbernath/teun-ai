'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search, Globe, RefreshCw, Loader2, Check, X, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Zap, Clock, ArrowRight,
  FileText, ExternalLink, Copy, Eye, Trash2,
} from 'lucide-react'

// ═══════════════════════════════════════════════
// SCAN STEPS
// ═══════════════════════════════════════════════
const STEP_IDS = ['fetch', 'meta', 'headings', 'schema', 'faq', 'images', 'robots', 'cwv', 'ai_content', 'ai_citation', 'ai_eeat', 'prompt', 'perplexity', 'score']
const INTERVALS = [1200, 600, 600, 700, 500, 600, 700, 4000, 5000, 3500, 3500, 2500, 10000, 800]

// Score helpers
function scoreColor(s) { return s >= 70 ? '#059669' : s >= 40 ? '#f59e0b' : '#ef4444' }
function getScoreLabel(s, t) {
  if (s >= 80) return t('scoreLabels.good')
  if (s >= 60) return t('scoreLabels.fair')
  if (s >= 40) return t('scoreLabels.needsWork')
  return t('scoreLabels.poor')
}

// ═══════════════════════════════════════════════
// AUDIT TAB COMPONENT
// ═══════════════════════════════════════════════
export default function AuditTab({ locale, activeCompany, userEmail, isPro }) {
  const nl = locale === 'nl'
  const t = useTranslations('dashboard.audit')
  const STEPS = STEP_IDS.map(id => ({ id, label: t(`steps.${id}`) }))
  const ADMIN_EMAILS = ['imre@onlinelabs.nl']
  const isAdmin = ADMIN_EMAILS.includes(userEmail?.toLowerCase())

  // State
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null) // current scan result
  const [history, setHistory] = useState([]) // persisted scans
  const [stepIdx, setStepIdx] = useState(0)
  const [doneSteps, setDoneSteps] = useState([])
  const [expandedCat, setExpandedCat] = useState(null)
  const [showSnippet, setShowSnippet] = useState(false)
  const [view, setView] = useState('input') // 'input' | 'scanning' | 'result' | 'history'
  const timerRef = useRef(null)

  // GEO Analyse results from DB
  const [geoPages, setGeoPages] = useState([])
  const [geoPagesLoading, setGeoPagesLoading] = useState(true)
  const [geoDetailPage, setGeoDetailPage] = useState(null) // selected page for detail view

  // Daily scan limit (BETA) — admins and Pro users bypass
  const scannedToday = !isAdmin && !isPro && history.length > 0 && new Date(history[0].timestamp).toDateString() === new Date().toDateString()

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('teun_audit_history')
      if (stored) setHistory(JSON.parse(stored))
    } catch (e) {}
  }, [])

  // Load GEO Analyse page scores from Supabase
  useEffect(() => {
    const load = async () => {
      try {
        setGeoPagesLoading(true)
        const params = new URLSearchParams()
        if (activeCompany?.name) params.set('company', activeCompany.name)
        const res = await fetch(`/api/geo-audit-results?${params}`)
        const json = await res.json()
        if (json.success && json.results) {
          setGeoPages(json.results.filter(r => r.data?.source === 'geo-analyse'))
        }
      } catch (e) {
        console.error('Failed to load GEO pages:', e)
      } finally {
        setGeoPagesLoading(false)
      }
    }
    load()
  }, [activeCompany?.name])

  // Save history to localStorage
  const saveHistory = (newHistory) => {
    setHistory(newHistory)
    try { localStorage.setItem('teun_audit_history', JSON.stringify(newHistory.slice(0, 20))) } catch (e) {}
  }

  const deleteHistoryItem = (idx) => {
    const newHistory = history.filter((_, i) => i !== idx)
    saveHistory(newHistory)
  }

  // Pre-fill URL from company
  useEffect(() => {
    if (activeCompany?.website && !result) setUrl(activeCompany.website)
  }, [activeCompany?.website])

  // Scan animation
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!loading) { setElapsed(0); return }
    setStepIdx(0)
    setDoneSteps([])
    setElapsed(0)
    let step = 0
    const advance = () => {
      if (step < STEPS.length - 1) {
        setDoneSteps(prev => [...prev, STEPS[step].id])
        step++
        setStepIdx(step)
        timerRef.current = setTimeout(advance, INTERVALS[step] || 1000)
      }
    }
    timerRef.current = setTimeout(advance, INTERVALS[0])
    // Elapsed timer
    const elapsedTimer = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current); clearInterval(elapsedTimer) }
  }, [loading])

  // Run audit
  const runAudit = useCallback(async (targetUrl) => {
    const scanUrl = targetUrl || url
    if (!scanUrl) return
    setLoading(true)
    setError(null)
    setResult(null)
    setExpandedCat(null)
    setShowSnippet(false)
    setView('scanning')
    try {
      const res = await fetch('/api/geo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl, locale }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Scan failed')
      setResult(json)
      setView('result')
      // Save to history
      const entry = {
        url: json.url,
        domain: json.domain,
        score: json.analysis?.overallScore || 0,
        mentioned: json.liveTest?.mentioned || false,
        companyName: json.analysis?.companyName || json.domain,
        timestamp: new Date().toISOString(),
        data: json,
      }
      const newHistory = [entry, ...history.filter(h => h.url !== json.url)].slice(0, 20)
      saveHistory(newHistory)
    } catch (err) {
      setError(err.message)
      setView('input')
    } finally {
      setLoading(false)
    }
  }, [url, locale, history])

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  // ── INPUT VIEW: GEO Analyse results + URL scanner ──
  if (view === 'input' || (view === 'input' && !loading)) {
    const avgScore = geoPages.length > 0
      ? Math.round(geoPages.reduce((sum, p) => sum + (p.score || 0), 0) / geoPages.length)
      : 0

    return (
      <div className="space-y-5">

        {/* ═══ GEO ANALYSE PAGINA SCORES ═══ */}
        {geoPages.length > 0 && (
          <div className="space-y-3">
            {/* Header with avg score */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-800">
                  {t('pageOptimization')}
                </h3>
                <p className="text-[12px] text-slate-400">
                  {t('pagesFromGeoAnalysis', { count: geoPages.length })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold" style={{ color: scoreColor(avgScore) }}>{avgScore}<span className="text-[13px] text-slate-300">/100</span></div>
                <div className="text-[10px] text-slate-400">{t('average')}</div>
              </div>
            </div>

            {/* Page cards — click to view details */}
            {geoPages.map((page, i) => {
              const sc = scoreColor(page.score)
              const path = page.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
              const issues = page.data?.issues || []

              return (
                <button
                  key={page.id || i}
                  onClick={() => { setGeoDetailPage(page); setView('geo-detail'); setExpandedCat(null) }}
                  className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 hover:border-slate-300 transition-all cursor-pointer border-none text-left"
                  style={{ border: '1px solid #e2e8f0' }}
                >
                  {/* Score circle */}
                  <div className="relative w-11 h-11 shrink-0">
                    <svg viewBox="0 0 44 44" className="w-11 h-11">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="22" cy="22" r="18" fill="none" stroke={sc} strokeWidth="3"
                        strokeDasharray={`${(page.score / 100) * 113.1} 113.1`} strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-slate-800">{page.score}</span>
                  </div>
                  {/* URL + issue count */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-slate-800 truncate">{path}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {issues.length > 0
                        ? `${issues.length} ${t('improvements')}`
                        : (t('noIssues'))
                      }
                    </div>
                  </div>
                  {/* Status badge */}
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium shrink-0 ${
                    page.score >= 70 ? 'bg-emerald-50 text-emerald-600' :
                    page.score >= 40 ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-500'
                  }`}>
                    {page.score >= 70 ? (t('good')) : page.score >= 40 ? (t('moderate')) : (t('bad'))}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              )
            })}

            {/* Link to run new GEO Analyse */}
            <a href={t('geoAnalysePath')}
              className="flex items-center gap-2 text-[12px] text-violet-600 hover:text-violet-800 font-medium no-underline px-1">
              <RefreshCw className="w-3.5 h-3.5" />
              {t('newGeoAnalysis')}
            </a>
          </div>
        )}

        {/* Empty state — no GEO Analyse yet */}
        {!geoPagesLoading && geoPages.length === 0 && (
          <div className="rounded-xl p-6" style={{ background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)', border: '1px solid #C4B5FD40' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-slate-800">
                  {t('startWithGeoAnalysis')}
                </div>
                <p className="text-[12px] text-slate-500 mt-1 mb-3 leading-relaxed">
                  {t('geoAnalyseExplanation')}
                </p>
                <a href={t('geoAnalysePath')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-medium no-underline hover:opacity-90 transition-opacity"
                  style={{ background: '#292956' }}>
                  <Zap className="w-3.5 h-3.5" />
                  {t('startGeoAnalysis')}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DIVIDER ═══ */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            {t('pageScanner')}
          </span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        {/* ═══ URL INPUT (GEO Audit scanner) ═══ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url" value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && runAudit()}
                placeholder={t('urlPlaceholder')}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-[14px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 transition-all"
              />
            </div>
            <button onClick={() => runAudit()} disabled={!url || loading || scannedToday}
              className="px-7 py-3 rounded-lg text-white text-[14px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shrink-0"
              style={{ background: '#292956' }}>
              <Search className="w-4 h-4" />
              {t('analyze')}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">
            {scannedToday
              ? (t('alreadyScanned'))
              : (t('scanDuration'))
            }
          </p>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>
          )}
        </div>

        {/* Scan History Table */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-[14px] font-semibold text-slate-800">
                {t('scannedPages')}
              </div>
              <span className="text-[11px] text-slate-400">{history.length} {t('scans')}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {history.map((h, i) => {
                const sc = scoreColor(h.score)
                const path = h.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
                return (
                  <div key={i} className="flex items-center group">
                    <button
                      onClick={() => { setResult(h.data); setUrl(h.url); setView('result'); setExpandedCat(null) }}
                      className="flex-1 flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left transition-colors">
                    {/* Score circle */}
                    <div className="relative w-10 h-10 shrink-0">
                      <svg viewBox="0 0 40 40" className="w-10 h-10">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                        <circle cx="20" cy="20" r="16" fill="none" stroke={sc} strokeWidth="3"
                          strokeDasharray={`${(h.score / 100) * 100.5} 100.5`} strokeLinecap="round"
                          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-800">{h.score}</span>
                    </div>
                    {/* URL + company */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-slate-800 truncate">{path}</div>
                      <div className="text-[11px] text-slate-400 truncate">{h.companyName}</div>
                    </div>
                    {/* Perplexity badge */}
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${h.mentioned ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {h.mentioned ? (t('found')) : (t('notFound'))}
                    </span>
                    {/* Time */}
                    <span className="text-[10px] text-slate-300 shrink-0 w-16 text-right">
                      {new Date(h.timestamp).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short' })}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteHistoryItem(i) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 mr-3 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 cursor-pointer bg-transparent border-none shrink-0"
                    title={t('delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state when no history */}
        {history.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-[14px] text-slate-500 font-medium mb-1">
              {t('analyzeFirstPage')}
            </p>
            <p className="text-[12px] text-slate-400 max-w-xs mx-auto">
              {t('enterUrlForAudit')}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── GEO ANALYSE DETAIL VIEW ──
  // Shows page data from GEO Analyse in the same visual style as GEO Audit result
  if (view === 'geo-detail' && geoDetailPage) {
    const pg = geoDetailPage
    const d = pg.data || {}
    const scores = d.scores || {}
    const checklist = d.checklist || {}
    const issues = d.issues || []
    const sc = scoreColor(pg.score)
    const domain = pg.domain || pg.url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || ''

    // Transform checklist + scores into category cards matching GEO Audit style
    const categoryDefs = [
      { key: 'technical', name: t('categories.technical'), icon: '⚙️', slug: 'technical',
        items: [
          { key: 'has_https', name: 'HTTPS', detail: t('checks.httpsDetail') },
          { key: 'has_viewport', name: 'Mobile Viewport', detail: t('checks.viewportDetail') },
          { key: 'has_lazy_load', name: 'Lazy Loading', detail: t('checks.lazyLoadDetail') },
          { key: 'has_defer_async', name: 'Deferred Scripts', detail: t('checks.deferAsyncDetail') },
          { key: 'has_canonical', name: 'Canonical Tag', detail: t('checks.canonicalDetail') },
          { key: 'not_noindex', name: t('checks.indexableName'), detail: t('checks.indexableDetail') },
        ]},
      { key: 'content', name: t('categories.contentQuality'), icon: '📝', slug: 'content',
        items: [
          { key: 'has_title', name: 'Title Tag', detail: t('checks.titleDetail') },
          { key: 'has_meta_description', name: 'Meta Description', detail: t('checks.metaDescDetail') },
          { key: 'has_h1', name: 'H1 Heading', detail: t('checks.h1Detail') },
          { key: 'has_good_heading_structure', name: t('checks.headingStructureName'), detail: t('checks.headingStructureDetail') },
          { key: 'has_sufficient_content', name: t('checks.sufficientContentName'), detail: t('checks.sufficientContentDetail') },
          { key: 'has_images', name: t('checks.imagesName'), detail: t('checks.imagesDetail') },
          { key: 'has_image_alt', name: 'Alt-tekst', detail: t('checks.imageAltDetail') },
        ]},
      { key: 'structured', name: 'Structured Data', icon: '🏷️', slug: 'structured',
        items: [
          { key: 'has_json_ld', name: 'JSON-LD', detail: t('checks.jsonLdDetail') },
          { key: 'has_local_business', name: 'LocalBusiness', detail: t('checks.localBusinessDetail') },
          { key: 'has_faq_schema', name: 'FAQ Schema', detail: t('checks.faqSchemaDetail') },
          { key: 'has_product_schema', name: 'Product/Service', detail: t('checks.productSchemaDetail') },
          { key: 'has_breadcrumb', name: 'Breadcrumb', detail: t('checks.breadcrumbDetail') },
          { key: 'has_article_schema', name: 'Article/WebPage', detail: t('checks.articleSchemaDetail') },
        ]},
      { key: 'social', name: 'Social / OG Tags', icon: '📣', slug: 'social',
        items: [
          { key: 'og_title', name: 'Open Graph Title', detail: t('checks.ogTitleDetail') },
          { key: 'og_description', name: 'OG Description', detail: t('checks.ogDescDetail') },
          { key: 'og_image', name: 'OG Image', detail: t('checks.ogImageDetail') },
          { key: 'twitter_card', name: 'Twitter Card', detail: t('checks.twitterCardDetail') },
        ]},
      { key: 'geo', name: t('categories.geoSignals'), icon: '🤖', slug: 'geo',
        items: [
          { key: 'has_faq_content', name: t('checks.faqContentName'), detail: t('checks.faqContentDetail') },
          { key: 'has_direct_answers', name: t('checks.directAnswersName'), detail: t('checks.directAnswersDetail') },
          { key: 'has_local_info', name: t('checks.localInfoName'), detail: t('checks.localInfoDetail') },
          { key: 'has_expertise_signals', name: 'E-E-A-T', detail: t('checks.eeatDetail') },
          { key: 'has_date', name: t('checks.dateName'), detail: t('checks.dateDetail') },
          { key: 'conversational_style', name: t('checks.conversationalName'), detail: t('checks.conversationalDetail') },
        ]},
    ]

    // Build category cards with checks
    const cats = categoryDefs.map(cat => {
      const catScore = scores[cat.key] || (cat.key === 'technical' ? scores['technisch'] : null)
      const checks = cat.items
        .filter(item => checklist[item.key] !== undefined)
        .map(item => ({
          name: item.name,
          status: checklist[item.key] ? 'good' : 'error',
          detail: item.detail,
        }))
      return {
        ...cat,
        score: catScore?.percentage || 0,
        summary: catScore ? `${catScore.score}/${catScore.max} ${t('points')}` : '',
        checks,
      }
    }).filter(cat => cat.checks.length > 0)

    return (
      <div className="space-y-4">

        {/* Back + URL bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => { setView('input'); setGeoDetailPage(null); setExpandedCat(null) }}
            className="text-[13px] text-slate-500 hover:text-slate-800 cursor-pointer bg-transparent border-none flex items-center gap-1">
            ← {t('allPages')}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-400 truncate max-w-[300px]">{pg.url}</span>
            <button onClick={() => { setUrl(pg.url); runAudit(pg.url) }}
              className="text-[12px] text-[#4F46E5] hover:underline cursor-pointer bg-transparent border-none flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> {t('deepScan')}
            </button>
          </div>
        </div>

        {/* ── GEO Score + Category bars ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-6">
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-24 h-24">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={sc} strokeWidth="8"
                    strokeDasharray={`${(pg.score / 100) * 264} 264`} strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-bold text-slate-800">{pg.score}</span>
                  <span className="text-[9px] text-slate-400">/ 100</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold text-slate-800">GEO Score</div>
              <div className="text-[12px] text-slate-500 mb-4">{domain} · {getScoreLabel(pg.score, t)}</div>
              <div className="space-y-3">
                {cats.map((cat, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-slate-600">{cat.icon} {cat.name}</span>
                      <span className="text-[13px] font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${cat.score}%`, background: scoreColor(cat.score) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Aanbevelingen ── */}
        {issues.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A20)', border: '1px solid #F59E0B30' }}>
            <div className="text-[10px] uppercase tracking-wider font-bold mb-3" style={{ color: '#B45309' }}>
              ⚡ {t('topRecommendations')}
            </div>
            {issues.slice(0, 5).map((issue, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
                  style={{ background: '#D97706' }}>{i + 1}</span>
                <span className="text-[13px] text-slate-800 leading-relaxed">{typeof issue === 'string' ? issue : issue.message || ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Category Cards (accordion) ── */}
        <div className="space-y-2">
          {cats.map((cat, ci) => {
            const good = cat.checks.filter(c => c.status === 'good').length
            const errs = cat.checks.filter(c => c.status === 'error').length
            const isOpen = expandedCat === cat.slug
            return (
              <div key={ci} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setExpandedCat(isOpen ? null : cat.slug)}
                  className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors bg-transparent border-none text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[20px]">{cat.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-slate-800">{cat.name}</div>
                      <div className="text-[12px] text-slate-500 truncate max-w-[350px]">{cat.summary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="flex items-center gap-2 text-[11px]">
                      {good > 0 && <span className="text-emerald-600 font-medium">{good} ✓</span>}
                      {errs > 0 && <span className="text-red-500 font-medium">{errs} ✕</span>}
                    </div>
                    <span className="text-[16px] font-bold min-w-[28px] text-right" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-3">
                    {cat.checks
                      .sort((a, b) => {
                        const order = { error: 0, warning: 1, good: 2 }
                        return (order[a.status] ?? 1) - (order[b.status] ?? 1)
                      })
                      .map((check, ci2) => {
                        const isGood = check.status === 'good'
                        const borderColor = isGood ? '#059669' : '#ef4444'
                        const Icon = isGood ? Check : X
                        const iconColor = isGood ? 'text-emerald-500' : 'text-red-500'
                        return (
                          <div key={ci2} className="p-3.5 bg-slate-50 rounded-lg mb-2 last:mb-0" style={{ borderLeft: `3px solid ${borderColor}` }}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />
                              <span className="text-[13px] font-semibold text-slate-800">{check.name}</span>
                            </div>
                            {check.detail && <div className="text-[12px] text-slate-500 ml-6 leading-relaxed">{check.detail}</div>}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Page Stats ── */}
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-1">{t('foundOnPage')}</div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: t('words'), value: d.wordCount || '—' },
            { label: t('checklistItems'), value: Object.keys(checklist).length },
            { label: t('passed'), value: Object.values(checklist).filter(v => v === true).length },
            { label: t('toImprove'), value: Object.values(checklist).filter(v => v === false).length },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-[22px] font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tech badges */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'JSON-LD', ok: checklist.has_json_ld },
              { label: 'LocalBusiness', ok: checklist.has_local_business },
              { label: 'FAQ Schema', ok: checklist.has_faq_schema },
              { label: 'Breadcrumb', ok: checklist.has_breadcrumb },
              { label: 'Article Schema', ok: checklist.has_article_schema },
              { label: 'OG Tags', ok: checklist.og_title && checklist.og_image },
              { label: 'Twitter Card', ok: checklist.twitter_card },
            ].filter(b => b.ok !== undefined).map((b, i) => (
              <span key={i} className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium ${b.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {b.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Deep scan CTA */}
        <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)', border: '1px solid #C4B5FD40' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-slate-800">
                {t('cwvPerplexityQuestion')}
              </div>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {t('cwvPerplexityDesc')}
              </p>
            </div>
            <button onClick={() => { setUrl(pg.url); runAudit(pg.url) }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-[13px] font-medium cursor-pointer border-none hover:opacity-90 transition-opacity shrink-0"
              style={{ background: '#292956' }}>
              <Zap className="w-3.5 h-3.5" />
              {t('deepScan')}
            </button>
          </div>
        </div>

      </div>
    )
  }

  // ── SCANNING VIEW ──
  if (view === 'scanning' && loading) {
    const pct = Math.round(((stepIdx + 1) / STEPS.length) * 100)
    const allStepsDone = doneSteps.length >= STEPS.length - 1
    const currentStepId = STEPS[stepIdx]?.id

    // Context messages for slow steps
    const slowStepHints = {
      cwv: t('loading.cwv'),
      ai_content: t('loading.aiContent'),
      ai_citation: t('loading.aiCitation'),
      ai_eeat: t('loading.aiEeat'),
      perplexity: t('loading.perplexity'),
    }
    const hint = slowStepHints[currentStepId] || null

    // Finalizing message adapts based on elapsed time
    const finalizingMsg = elapsed > 60
      ? (t('loading.cwvStillRunning'))
      : (t('loading.cwvAlmostDone'))

    return (
      <div className="space-y-5">
        {/* Progress header */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="h-1" style={{ background: '#f1f5f9' }}>
            <div className="h-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4F46E5, #06b6d4)' }} />
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[15px] font-semibold text-slate-800">
                  {allStepsDone
                    ? (t('loading.measuringCwv'))
                    : (STEPS[stepIdx]?.label || '...')}
                </div>
                <div className="text-[12px] text-slate-400 mt-0.5">{url}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">{elapsed}s</span>
                <div className="text-[20px] font-bold" style={{ color: '#4F46E5' }}>{pct}%</div>
              </div>
            </div>

            {/* Hint for slow steps */}
            {(hint || allStepsDone) && (
              <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center gap-2.5">
                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
                <span className="text-[12px] text-indigo-700">
                  {allStepsDone
                    ? finalizingMsg
                    : hint}
                </span>
              </div>
            )}

            {/* Step grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {STEPS.map((step, i) => {
                const done = doneSteps.includes(step.id)
                const active = i === stepIdx && !done
                const future = i > stepIdx
                return (
                  <div key={step.id} className="flex items-center gap-2.5 py-1">
                    {done
                      ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      : active
                      ? <Loader2 className="w-4 h-4 text-[#4F46E5] animate-spin shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
                    }
                    <span className={`text-[12px] transition-colors ${done ? 'text-emerald-600' : active ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULT VIEW ──
  if (view === 'result' && result) {
    const a = result.analysis || {}
    const cats = a.categories || []
    const ext = result.extracted || {}
    const live = result.liveTest
    const sc = scoreColor(a.overallScore || 0)

    return (
      <div className="space-y-4">

        {/* Back + rescan bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => { setView('input'); setResult(null); setExpandedCat(null) }}
            className="text-[13px] text-slate-500 hover:text-slate-800 cursor-pointer bg-transparent border-none flex items-center gap-1">
            ← {t('allScans')}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-400 truncate max-w-[300px]">{result.url}</span>
            <button onClick={() => runAudit(result.url)}
              className="text-[12px] text-[#4F46E5] hover:underline cursor-pointer bg-transparent border-none flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> {t('rescan')}
            </button>
          </div>
        </div>

        {/* ── Live Test Banner ── */}
        {live && (
          <div className={`rounded-xl overflow-hidden ${live.mentioned ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="p-5">
              <div className="flex items-center gap-3">
                {live.mentioned
                  ? <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                  : <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center"><X className="w-5 h-5 text-red-500" /></div>
                }
                <div>
                  <div className={`text-[16px] font-bold ${live.mentioned ? 'text-emerald-800' : 'text-red-800'}`}>
                    {live.mentioned
                      ? `${a.companyName || result.domain} ${t('isFound')}`
                      : t('notFoundByPerplexity')}
                  </div>
                  <div className={`text-[12px] ${live.mentioned ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t('liveTestedOn')} <strong>Perplexity</strong>
                    {live.mentioned && live.mentionCount > 0 ? ` — ${live.mentionCount}× ${t('mentioned')}` : ''}
                  </div>
                </div>
              </div>

              {/* Prompt */}
              {a.generatedPrompt && (
                <div className="mt-4 bg-white/70 rounded-lg p-3.5 border border-white">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">✦ {t('testedPrompt')}</div>
                  <div className="text-[13px] text-slate-700 italic leading-relaxed">"{a.generatedPrompt}"</div>
                </div>
              )}

              {/* Snippet */}
              {live.snippet && (
                <div className="mt-3 bg-white/70 rounded-lg p-3.5 border border-white">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">● {t('perplexityResponse')}</div>
                  <div className="text-[12px] text-slate-600 leading-relaxed">
                    {showSnippet ? live.snippet : live.snippet.slice(0, 300) + (live.snippet.length > 300 ? '...' : '')}
                  </div>
                  {live.snippet.length > 300 && (
                    <button onClick={() => setShowSnippet(!showSnippet)}
                      className="text-[11px] text-[#4F46E5] mt-2 cursor-pointer bg-transparent border-none hover:underline font-medium">
                      {showSnippet ? (t('showLess')) : (t('showFullResponse'))}
                    </button>
                  )}
                </div>
              )}

              {/* Competitors */}
              {live.competitors?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">⚡ {t('competitorsInResponse')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {live.competitors.map((c, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GEO Score + Category bars ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-6">
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-24 h-24">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={sc} strokeWidth="8"
                    strokeDasharray={`${((a.overallScore || 0) / 100) * 264} 264`} strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-bold text-slate-800">{a.overallScore || 0}</span>
                  <span className="text-[9px] text-slate-400">/ 100</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold text-slate-800">GEO Score</div>
              <div className="text-[12px] text-slate-500 mb-4">{result.domain} · {getScoreLabel(a.overallScore || 0, t)}</div>
              <div className="space-y-3">
                {cats.map((cat, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-slate-600">{cat.icon} {cat.name}</span>
                      <span className="text-[13px] font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${cat.score}%`, background: scoreColor(cat.score) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Aanbevelingen ── */}
        {(a.topRecommendations || []).length > 0 && (
          <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A20)', border: '1px solid #F59E0B30' }}>
            <div className="text-[10px] uppercase tracking-wider font-bold mb-3" style={{ color: '#B45309' }}>
              ⚡ {t('topRecommendations')}
            </div>
            {a.topRecommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
                  style={{ background: '#D97706' }}>{i + 1}</span>
                <span className="text-[13px] text-slate-800 leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Category Cards (accordion) ── */}
        <div className="space-y-2">
          {cats.map((cat, ci) => {
            const good = (cat.checks || []).filter(c => c.status === 'good').length
            const warns = (cat.checks || []).filter(c => c.status === 'warning').length
            const errs = (cat.checks || []).filter(c => c.status === 'error').length
            const isOpen = expandedCat === cat.slug
            return (
              <div key={ci} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setExpandedCat(isOpen ? null : cat.slug)}
                  className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors bg-transparent border-none text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[20px]">{cat.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-slate-800">{cat.name}</div>
                      <div className="text-[12px] text-slate-500 truncate max-w-[350px]">{cat.summary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="flex items-center gap-2 text-[11px]">
                      {good > 0 && <span className="text-emerald-600 font-medium">{good} ✓</span>}
                      {warns > 0 && <span className="text-amber-500 font-medium">{warns} ⚠</span>}
                      {errs > 0 && <span className="text-red-500 font-medium">{errs} ✕</span>}
                    </div>
                    <span className="text-[16px] font-bold min-w-[28px] text-right" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-3">
                    {/* Issues first, then good items */}
                    {(cat.checks || [])
                      .sort((a, b) => {
                        const order = { error: 0, warning: 1, good: 2 }
                        return (order[a.status] ?? 1) - (order[b.status] ?? 1)
                      })
                      .map((check, ci2) => {
                        const isGood = check.status === 'good'
                        const isError = check.status === 'error'
                        const borderColor = isGood ? '#059669' : isError ? '#ef4444' : '#f59e0b'
                        const Icon = isGood ? Check : isError ? X : AlertTriangle
                        const iconColor = isGood ? 'text-emerald-500' : isError ? 'text-red-500' : 'text-amber-500'
                        const badgeClass = isGood ? 'bg-emerald-50 text-emerald-600' : isError ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        return (
                          <div key={ci2} className="p-3.5 bg-slate-50 rounded-lg mb-2 last:mb-0" style={{ borderLeft: `3px solid ${borderColor}` }}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />
                              <span className="text-[13px] font-semibold text-slate-800">{check.name}</span>
                              {check.priority && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{check.priority}</span>}
                            </div>
                            {check.detail && <div className="text-[12px] text-slate-500 ml-6 leading-relaxed">{check.detail}</div>}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Page Stats ── */}
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-1">{t('foundOnPage')}</div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: t('words'), value: ext.wordCount || 0 },
            { label: 'Headings', value: ext.headingCount || 0 },
            { label: t('checks.imagesName'), value: ext.imageCount || 0 },
            { label: 'Schema types', value: (ext.structuredDataTypes || []).length },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-[22px] font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tech badges + CWV */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Structured Data', ok: ext.hasStructuredData },
                { label: 'robots.txt', ok: ext.hasRobotsTxt },
                { label: 'llms.txt', ok: ext.hasLlmsTxt },
                { label: 'FAQ Schema', ok: ext.hasFAQ },
              ].map((b, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium ${b.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {b.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {b.label}
                </span>
              ))}
              {ext.richSnippets?.eligible?.map((r, i) => (
                <span key={`r${i}`} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-600">
                  <Check className="w-3 h-3" /> {r}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2.5">Core Web Vitals</div>
            {ext.coreWebVitals ? (
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Performance', value: ext.coreWebVitals.performanceScore, c: ext.coreWebVitals.performanceScore >= 90 ? '#059669' : ext.coreWebVitals.performanceScore >= 50 ? '#f59e0b' : '#ef4444' },
                  { label: 'LCP', value: ext.coreWebVitals.lcp ? `${(ext.coreWebVitals.lcp / 1000).toFixed(1)}s` : '—', c: ext.coreWebVitals.lcp && ext.coreWebVitals.lcp < 2500 ? '#059669' : '#ef4444' },
                  { label: 'CLS', value: ext.coreWebVitals.cls != null ? ext.coreWebVitals.cls.toFixed(2) : '—', c: ext.coreWebVitals.cls != null && ext.coreWebVitals.cls < 0.1 ? '#059669' : '#ef4444' },
                  { label: 'INP', value: ext.coreWebVitals.inp ? `${ext.coreWebVitals.inp}ms` : '—', c: ext.coreWebVitals.inp && ext.coreWebVitals.inp < 200 ? '#059669' : '#ef4444' },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="text-[15px] font-bold" style={{ color: m.c }}>{m.value}</div>
                    <div className="text-[9px] text-slate-400">{m.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-slate-300 text-center py-1">{t('notAvailable')}</div>
            )}
          </div>
        </div>

      </div>
    )
  }

  // Fallback (loading ended but no clear view)
  return null
}
