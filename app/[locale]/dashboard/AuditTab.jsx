'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Globe, RefreshCw, Loader2, Check, X, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Zap, Clock, ArrowRight,
  FileText, ExternalLink, Copy, Eye, Trash2,
} from 'lucide-react'

// ═══════════════════════════════════════════════
// SCAN STEPS
// ═══════════════════════════════════════════════
const STEPS_NL = [
  { id: 'fetch', label: 'Pagina ophalen & analyseren' },
  { id: 'meta', label: 'Meta tags controleren' },
  { id: 'headings', label: 'Heading structuur analyseren' },
  { id: 'schema', label: 'Structured data scannen' },
  { id: 'faq', label: 'FAQ content zoeken' },
  { id: 'images', label: 'Afbeeldingen & alt-tekst checken' },
  { id: 'robots', label: 'robots.txt & llms.txt controleren' },
  { id: 'cwv', label: 'Core Web Vitals meten' },
  { id: 'ai_content', label: 'AI content analyse (Claude)' },
  { id: 'ai_citation', label: 'Citatie-potentieel beoordelen' },
  { id: 'ai_eeat', label: 'E-E-A-T signalen analyseren' },
  { id: 'prompt', label: 'Commerciële prompt genereren' },
  { id: 'perplexity', label: 'Live Perplexity test uitvoeren' },
  { id: 'score', label: 'Eindscores berekenen' },
]
const STEPS_EN = [
  { id: 'fetch', label: 'Fetching & analyzing page' },
  { id: 'meta', label: 'Checking meta tags' },
  { id: 'headings', label: 'Analyzing heading structure' },
  { id: 'schema', label: 'Scanning structured data' },
  { id: 'faq', label: 'Finding FAQ content' },
  { id: 'images', label: 'Checking images & alt text' },
  { id: 'robots', label: 'Checking robots.txt & llms.txt' },
  { id: 'cwv', label: 'Measuring Core Web Vitals' },
  { id: 'ai_content', label: 'AI content analysis (Claude)' },
  { id: 'ai_citation', label: 'Citation potential assessment' },
  { id: 'ai_eeat', label: 'Analyzing E-E-A-T signals' },
  { id: 'prompt', label: 'Generating commercial prompt' },
  { id: 'perplexity', label: 'Running live Perplexity test' },
  { id: 'score', label: 'Calculating final scores' },
]
const INTERVALS = [1200, 600, 600, 700, 500, 600, 700, 4000, 5000, 3500, 3500, 2500, 10000, 800]

// Score helpers
function scoreColor(s) { return s >= 70 ? '#059669' : s >= 40 ? '#f59e0b' : '#ef4444' }
function scoreLabel(s, nl) {
  if (s >= 80) return nl ? 'Goed voorbereid op AI' : 'Well prepared for AI'
  if (s >= 60) return nl ? 'Redelijk — er zijn verbeterpunten' : 'Fair — there are improvements'
  if (s >= 40) return nl ? 'Verbeterbaar — belangrijke punten missen' : 'Needs work — key items missing'
  return nl ? 'Onvoldoende — directe actie nodig' : 'Poor — immediate action needed'
}

// ═══════════════════════════════════════════════
// AUDIT TAB COMPONENT
// ═══════════════════════════════════════════════
export default function AuditTab({ locale, activeCompany, userEmail }) {
  const nl = locale === 'nl'
  const STEPS = nl ? STEPS_NL : STEPS_EN
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

  // Daily scan limit (BETA) — admins bypass
  const scannedToday = !isAdmin && history.length > 0 && new Date(history[0].timestamp).toDateString() === new Date().toDateString()

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('teun_audit_history')
      if (stored) setHistory(JSON.parse(stored))
    } catch (e) {}
  }, [])

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

  // ── INPUT VIEW: URL bar + scan history ──
  if (view === 'input' || (view === 'input' && !loading)) {
    return (
      <div className="space-y-5">
        {/* URL Input */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url" value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && runAudit()}
                placeholder={nl ? 'https://jouwwebsite.nl/pagina' : 'https://yoursite.com/page'}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-[14px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 transition-all"
              />
            </div>
            <button onClick={() => runAudit()} disabled={!url || loading || scannedToday}
              className="px-7 py-3 rounded-lg text-white text-[14px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shrink-0"
              style={{ background: '#292956' }}>
              <Search className="w-4 h-4" />
              {nl ? 'Analyseer' : 'Analyze'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">
            {scannedToday
              ? (nl ? '✓ Vandaag al gescand. Kom morgen terug voor een nieuwe scan (BETA).' : '✓ Already scanned today. Come back tomorrow for a new scan (BETA).')
              : (nl ? 'Scan duurt ±1 minuut · Inclusief Core Web Vitals meting en live Perplexity test' : 'Scan takes ~1 minute · Includes Core Web Vitals and live Perplexity test')
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
                {nl ? 'Gescande pagina\'s' : 'Scanned pages'}
              </div>
              <span className="text-[11px] text-slate-400">{history.length} {nl ? 'scans' : 'scans'}</span>
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
                      {h.mentioned ? (nl ? 'Gevonden' : 'Found') : (nl ? 'Niet gevonden' : 'Not found')}
                    </span>
                    {/* Time */}
                    <span className="text-[10px] text-slate-300 shrink-0 w-16 text-right">
                      {new Date(h.timestamp).toLocaleDateString(nl ? 'nl-NL' : 'en-US', { day: 'numeric', month: 'short' })}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteHistoryItem(i) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 mr-3 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 cursor-pointer bg-transparent border-none shrink-0"
                    title={nl ? 'Verwijderen' : 'Delete'}
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
              {nl ? 'Analyseer je eerste pagina' : 'Analyze your first page'}
            </p>
            <p className="text-[12px] text-slate-400 max-w-xs mx-auto">
              {nl ? 'Voer een URL in om een complete GEO audit te starten met AI-analyse en live Perplexity test.' : 'Enter a URL to start a complete GEO audit with AI analysis and live Perplexity test.'}
            </p>
          </div>
        )}
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
      cwv: nl ? 'Google PageSpeed API wordt bevraagd — dit kan even duren' : 'Querying Google PageSpeed API — this may take a moment',
      ai_content: nl ? 'Claude analyseert je content op AI-citatie potentieel' : 'Claude is analyzing your content for AI citation potential',
      ai_citation: nl ? 'Citatie-kwaliteit wordt beoordeeld op basis van je content' : 'Citation quality is being assessed based on your content',
      ai_eeat: nl ? 'E-E-A-T signalen worden geëvalueerd door AI' : 'E-E-A-T signals are being evaluated by AI',
      perplexity: nl ? 'Live test op Perplexity — we checken of je daadwerkelijk gevonden wordt' : 'Live Perplexity test — checking if you are actually found',
    }
    const hint = slowStepHints[currentStepId] || null

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
                    ? (nl ? 'Resultaten worden verwerkt...' : 'Processing results...')
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
                    ? (nl ? 'Bijna klaar — server verwerkt de laatste resultaten. Dit duurt meestal 10-30 seconden.' : 'Almost done — server is processing final results. This usually takes 10-30 seconds.')
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
            ← {nl ? 'Alle scans' : 'All scans'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-400 truncate max-w-[300px]">{result.url}</span>
            <button onClick={() => runAudit(result.url)}
              className="text-[12px] text-[#4F46E5] hover:underline cursor-pointer bg-transparent border-none flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> {nl ? 'Opnieuw scannen' : 'Rescan'}
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
                      ? `${a.companyName || result.domain} ${nl ? 'wordt gevonden!' : 'found!'}`
                      : nl ? 'Niet gevonden door Perplexity' : 'Not found by Perplexity'}
                  </div>
                  <div className={`text-[12px] ${live.mentioned ? 'text-emerald-600' : 'text-red-500'}`}>
                    {nl ? 'Live getest op' : 'Live tested on'} <strong>Perplexity</strong>
                    {live.mentioned && live.mentionCount > 0 ? ` — ${live.mentionCount}× ${nl ? 'genoemd' : 'mentioned'}` : ''}
                  </div>
                </div>
              </div>

              {/* Prompt */}
              {a.generatedPrompt && (
                <div className="mt-4 bg-white/70 rounded-lg p-3.5 border border-white">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">✦ {nl ? 'Geteste prompt' : 'Tested prompt'}</div>
                  <div className="text-[13px] text-slate-700 italic leading-relaxed">"{a.generatedPrompt}"</div>
                </div>
              )}

              {/* Snippet */}
              {live.snippet && (
                <div className="mt-3 bg-white/70 rounded-lg p-3.5 border border-white">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">● {nl ? 'Perplexity antwoord' : 'Perplexity response'}</div>
                  <div className="text-[12px] text-slate-600 leading-relaxed">
                    {showSnippet ? live.snippet : live.snippet.slice(0, 300) + (live.snippet.length > 300 ? '...' : '')}
                  </div>
                  {live.snippet.length > 300 && (
                    <button onClick={() => setShowSnippet(!showSnippet)}
                      className="text-[11px] text-[#4F46E5] mt-2 cursor-pointer bg-transparent border-none hover:underline font-medium">
                      {showSnippet ? (nl ? 'Minder tonen' : 'Show less') : (nl ? 'Volledig antwoord tonen' : 'Show full response')}
                    </button>
                  )}
                </div>
              )}

              {/* Competitors */}
              {live.competitors?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">⚡ {nl ? 'Concurrenten in dit antwoord' : 'Competitors in this response'}</div>
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
              <div className="text-[12px] text-slate-500 mb-4">{result.domain} · {scoreLabel(a.overallScore || 0, nl)}</div>
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
              ⚡ {nl ? 'Top aanbevelingen' : 'Top recommendations'}
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
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-1">{nl ? 'Gevonden op pagina' : 'Found on page'}</div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: nl ? 'Woorden' : 'Words', value: ext.wordCount || 0 },
            { label: 'Headings', value: ext.headingCount || 0 },
            { label: nl ? 'Afbeeldingen' : 'Images', value: ext.imageCount || 0 },
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
              <div className="text-[12px] text-slate-300 text-center py-1">{nl ? 'Niet beschikbaar' : 'Not available'}</div>
            )}
          </div>
        </div>

      </div>
    )
  }

  // Fallback (loading ended but no clear view)
  return null
}
