'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Search, Swords, ShieldCheck, ArrowRight, ChevronDown, ChevronUp, ChevronRight,
  RefreshCw, TrendingUp, TrendingDown, Minus, Sparkles, Globe, ExternalLink,
  BarChart3, Loader2, Check, X, AlertTriangle, CheckCircle2, FileText, Zap, Database, Trash2, Pencil, Play,
  Eye, Flame, Crown, Target, Shield,
} from 'lucide-react'
import AuditTab from './AuditTab'
import { createBrowserClient } from '@supabase/ssr'

// Locale-aware path: NL = root, EN = /en/
const lp = (locale, path) => locale === 'nl' ? path : `/en${path}`

// Chrome Extension ID (from Chrome Web Store)
const EXTENSION_ID = 'jjhjnmkanlmjhmobcgemjakkjdbkkfmk'

// ═══════════════════════════════════════════════
// ── Sub Components ──
// ═══════════════════════════════════════════════

function StatCard({ label, value, sub, accent, small }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-6 py-5 flex-1 min-w-0">
      <div className="text-[11px] text-slate-400 font-medium tracking-wider uppercase mb-2">{label}</div>
      <div className={`font-bold leading-tight truncate ${small ? 'text-[16px]' : 'text-[28px]'}`} style={{ color: accent || '#1e293b' }}>{value}</div>
      {sub && <div className="text-[12px] text-slate-500 mt-1.5">{sub}</div>}
    </div>
  )
}

// Badge: shows ✓ (found) or ✗ (not found)
function MentionBadge({ found, mentionCount }) {
  if (!found) return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-400 text-[11px] font-semibold">
      <X className="w-3.5 h-3.5" />
    </span>
  )
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold"
      title={mentionCount > 1 ? `${mentionCount}× genoemd in dit antwoord` : ''}>
      <Check className="w-3.5 h-3.5" />
    </span>
  )
}

function TrendBadge({ trend }) {
  const config = {
    up: { Icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    down: { Icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    stable: { Icon: Minus, color: 'text-slate-400', bg: 'bg-slate-50' },
    new: { Icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50' },
  }
  const { Icon, color, bg } = config[trend] || config.stable
  return (
    <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-md ${bg} ${color}`}>
      <Icon className="w-3 h-3" />
    </span>
  )
}

const PLATFORM_COLORS = {
  chatgpt: '#10b981',
  perplexity: '#6366f1',
  googleAiMode: '#ea4335',
  googleAiOverview: '#fbbc04',
}

function PlatformBar({ name, found, total, color, pct, label, notScanned, notScannedLabel }) {
  if (notScanned) {
    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0 bg-slate-200" />
            <span className="text-[13px] font-semibold text-slate-400">{name}</span>
          </div>
          <span className="text-[11px] text-slate-300 italic">{notScannedLabel || '—'}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded overflow-hidden" />
      </div>
    )
  }
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[13px] font-semibold text-slate-800">{name}</span>
        </div>
        <span className="text-[13px] font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded overflow-hidden">
        <div className="h-full rounded transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-[11px] text-slate-400 mt-1">{found}/{total} {label}</div>
    </div>
  )
}

function VisibilityChart({ data, t }) {
  if (!data || data.length < 2) return null
  const maxVal = 100
  const points = data.length
  const buildPath = (key) => data.map((d, i) => {
    const x = (i / Math.max(points - 1, 1)) * 100
    const y = 100 - ((d[key] || 0) / maxVal) * 100
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
  const buildAreaPath = (key) => `${buildPath(key)} L 100 100 L 0 100 Z`

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="text-[15px] font-semibold text-slate-800">{t.chart.title}</div>
          <div className="text-[12px] text-slate-400 mt-0.5">{t.chart.subtitle}</div>
        </div>
        <div className="flex gap-4">
          {[{ label: t.chart.total, color: '#1e293b' }, { label: 'ChatGPT', color: PLATFORM_COLORS.chatgpt }, { label: 'Perplexity', color: PLATFORM_COLORS.perplexity }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} /> {l.label}
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-[220px] pl-10">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {[0, 25, 50, 75, 100].map(v => <line key={v} x1="0" y1={100 - v} x2="100" y2={100 - v} stroke="#f1f5f9" strokeWidth="0.3" />)}
          <path d={buildAreaPath('total')} fill="#1e293b" fillOpacity="0.05" />
          <path d={buildPath('total')} fill="none" stroke="#1e293b" strokeWidth="0.8" />
          <path d={buildPath('chatgpt')} fill="none" stroke={PLATFORM_COLORS.chatgpt} strokeWidth="0.5" strokeDasharray="1.5 1.5" />
          <path d={buildPath('perplexity')} fill="none" stroke={PLATFORM_COLORS.perplexity} strokeWidth="0.5" strokeDasharray="1.5 1.5" />
        </svg>
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-400 w-8 text-right pr-2">
          {['100%', '75%', '50%', '25%', '0%'].map(l => <span key={l}>{l}</span>)}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-2 pl-10">
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1).map((d, i) => <span key={i}>{d.date}</span>)}
      </div>
    </div>
  )
}

function GoogleScanBanner({ t, locale, prompts, activeCompany, onScanComplete, googleAiMode, googleAiOverview }) {
  const [scanningMode, setScanningMode] = useState(false)
  const [scanningOverview, setScanningOverview] = useState(false)

  const hasData = (googleAiMode?.total || 0) > 0 || (googleAiOverview?.total || 0) > 0
  const promptTexts = prompts.map(p => p.text).filter(Boolean)
  const company = activeCompany?.name
  const website = activeCompany?.website || ''

  // Daily limit: check if scanned today
  const today = new Date().toDateString()
  const modeScannedToday = googleAiMode?.lastScan && new Date(googleAiMode.lastScan).toDateString() === today
  const overviewScannedToday = googleAiOverview?.lastScan && new Date(googleAiOverview.lastScan).toDateString() === today
  const allScannedToday = modeScannedToday && overviewScannedToday

  const startGoogleScan = async () => {
    if (!company || promptTexts.length === 0) return
    setScanningMode(true)
    try {
      const res = await fetch('/api/scan-google-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company, website, prompts: promptTexts })
      })
      const data = await res.json()
      console.log('Google AI Mode result:', res.status, data)
      if (data.success) onScanComplete?.()
      else alert(`AI Mode: ${data.error || 'Scan mislukt'}`)
    } catch (err) {
      console.error('Google AI Mode error:', err)
      alert('AI Mode scan mislukt')
    }
    setScanningMode(false)
  }

  const startGoogleOverviewScan = async () => {
    if (!company || promptTexts.length === 0) return
    setScanningOverview(true)
    try {
      const res = await fetch('/api/scan-google-ai-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company, website, prompts: promptTexts })
      })
      const data = await res.json()
      console.log('AI Overview result:', res.status, data)
      if (data.success) onScanComplete?.()
      else alert(`AI Overview: ${data.error || 'Scan mislukt'}`)
    } catch (err) {
      console.error('AI Overview error:', err)
      alert('AI Overview scan mislukt')
    }
    setScanningOverview(false)
  }

  const startBothScans = async () => {
    if (!company || promptTexts.length === 0) return
    setScanningMode(true)
    setScanningOverview(true)

    const modePromise = fetch('/api/scan-google-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName: company, website, prompts: promptTexts })
    }).then(async res => {
      const data = await res.json()
      console.log('Google AI Mode result:', res.status, data)
      setScanningMode(false)
      return data
    }).catch(err => {
      console.error('Google AI Mode error:', err)
      setScanningMode(false)
      return { success: false }
    })

    const overviewPromise = fetch('/api/scan-google-ai-overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName: company, website, prompts: promptTexts })
    }).then(async res => {
      const data = await res.json()
      console.log('AI Overview result:', res.status, data)
      setScanningOverview(false)
      return data
    }).catch(err => {
      console.error('AI Overview error:', err)
      setScanningOverview(false)
      return { success: false }
    })

    await Promise.all([modePromise, overviewPromise])
    onScanComplete?.()
  }

  return (
    <div className={`rounded-xl border p-5 mb-6 ${hasData ? 'bg-white border-slate-200' : 'bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 border-indigo-200/60'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${hasData ? 'bg-slate-100' : 'bg-white/80 border border-indigo-100'}`}>
          <Globe className={`w-5 h-5 ${hasData ? 'text-slate-500' : 'text-indigo-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-slate-800 mb-0.5">
            {hasData ? 'Google AI' : t.googleScan.title}
          </div>
          {!hasData && (
            <div className="text-[12px] text-slate-500 mb-4">{t.googleScan.desc}</div>
          )}
          {hasData && (
            <div className="text-[12px] text-slate-400 mb-3">
              AI Mode: {googleAiMode?.found || 0}/{googleAiMode?.total || 0} • AI Overviews: {googleAiOverview?.found || 0}/{googleAiOverview?.total || 0}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={startBothScans} disabled={scanningMode || scanningOverview || allScannedToday}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[12px] font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#292956' }}>
              {(scanningMode && scanningOverview) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {t.googleScan.scanBoth}
            </button>
            <button onClick={startGoogleScan} disabled={scanningMode || modeScannedToday}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[12px] font-semibold border-none cursor-pointer hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blue-500">
              {scanningMode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Google AI Mode
            </button>
            <button onClick={startGoogleOverviewScan} disabled={scanningOverview || overviewScannedToday}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[12px] font-semibold border-none cursor-pointer hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500">
              {scanningOverview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              AI Overviews
            </button>
          </div>
          {(modeScannedToday || overviewScannedToday) && (
            <div className="text-[11px] text-slate-400 mt-2.5">
              {locale === 'nl'
                ? '✓ Vandaag al gescand. Kom morgen terug voor een nieuwe scan (BETA).'
                : '✓ Already scanned today. Come back tomorrow for a new scan (BETA).'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ t, locale }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6"><BarChart3 className="w-10 h-10 text-slate-300" /></div>
      <h2 className="text-lg font-semibold text-slate-800 mb-2">{t.noData}</h2>
      <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">{t.noDataDesc}</p>
      <Link href={lp(locale, '/tools/ai-visibility')} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-semibold no-underline hover:opacity-90 transition-opacity" style={{ background: '#292956' }}>
        {t.startScan} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

// ═══════════════════════════════════════════════
// ── Prompt Selection Flow (Prompt Explorer → Dashboard) ──
// ═══════════════════════════════════════════════
function PromptSelectionFlow({ discovery, locale, onScanTriggered }) {
  const MAX_SELECT = 10
  const [selected, setSelected] = useState(new Set())
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState('')
  const [scanError, setScanError] = useState(null)
  const [expandedCluster, setExpandedCluster] = useState(null)

  // Use most recent discovery result
  const disc = discovery[0]
  if (!disc) return null

  const allPrompts = (disc.prompts || []).map((p, i) => ({
    idx: i,
    text: p.text || p.prompt || p.query || '',
    volume: p.estimatedGoogleVolume || p.estimatedAiVolume || p.volume || 0,
    aiVolume: p.estimatedAiVolume || 0,
    trend: p.trendSignal || p.trend || null,
    difficulty: p.difficultyScore || p.difficulty || null,
    cluster: p.intentCluster || p.cluster || p.category || null,
  })).filter(p => p.text.length > 0)

  // Use pre-built clusters from database, fall back to manual grouping
  const discClusters = disc.clusters || []
  let sortedClusters
  if (discClusters.length > 0) {
    // Map cluster data, reference allPrompts by index for consistent selection
    sortedClusters = discClusters.map(c => {
      const clusterPromptIds = (c.prompts || []).map(cp => cp.id)
      const mapped = clusterPromptIds
        .map(id => allPrompts.find(p => p.idx === id))
        .filter(Boolean)
      return [c.name, mapped, c.totalVolume || 0]
    }).sort((a, b) => b[2] - a[2])
  } else {
    // Fallback: group by intentCluster field
    const grouped = {}
    for (const p of allPrompts) {
      const key = p.cluster || (locale === 'nl' ? 'Overig' : 'Other')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(p)
    }
    sortedClusters = Object.entries(grouped)
      .map(([name, prompts]) => [name, prompts, prompts.reduce((s, p) => s + p.volume, 0)])
      .sort((a, b) => b[2] - a[2])
  }

  const toggle = (idx) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) { next.delete(idx) }
      else if (next.size < MAX_SELECT) { next.add(idx) }
      return next
    })
  }

  const autoSelect = () => {
    // Pick top 10 by volume
    const sorted = [...allPrompts].sort((a, b) => b.volume - a.volume)
    setSelected(new Set(sorted.slice(0, MAX_SELECT).map(p => p.idx)))
  }

  const startScan = async () => {
    if (selected.size === 0) return
    setScanning(true)
    setScanError(null)
    setScanProgress(locale === 'nl' ? 'Selectie opslaan...' : 'Saving selection...')

    try {
      const selectedPrompts = allPrompts.filter(p => selected.has(p.idx)).map(p => p.text)

      // Save selection + trigger scan
      const res = await fetch('/api/prompt-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discoveryId: disc.id,
          selectedPrompts,
          website: disc.website,
          brandName: disc.brandName,
          branche: disc.branche,
          location: disc.location,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')

      setScanProgress(locale === 'nl' ? 'Scan gestart! Even geduld...' : 'Scan started! Please wait...')

      // Poll for completion
      if (data.integrationId) {
        let attempts = 0
        const poll = setInterval(async () => {
          attempts++
          const pct = Math.min(5 + attempts * 8, 95)
          const promptNum = Math.min(Math.floor(pct / 10) + 1, 10)
          if (pct < 50) {
            setScanProgress(locale === 'nl'
              ? `ChatGPT: prompt ${promptNum}/10 analyseren... (${pct}%)`
              : `ChatGPT: analyzing prompt ${promptNum}/10... (${pct}%)`)
          } else if (pct < 90) {
            setScanProgress(locale === 'nl'
              ? `Perplexity: prompt ${Math.min(promptNum - 5, 10)}/10 analyseren... (${pct}%)`
              : `Perplexity: analyzing prompt ${Math.min(promptNum - 5, 10)}/10... (${pct}%)`)
          } else {
            setScanProgress(locale === 'nl'
              ? `Resultaten verwerken... (${pct}%)`
              : `Processing results... (${pct}%)`)
          }
          if (attempts >= 20) { // ~2 min timeout
            clearInterval(poll)
            clearInterval(checkDone)
            onScanTriggered?.()
          }
        }, 6000)

        // Check if scan is done every 12s
        const checkDone = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/dashboard?period=90d&_t=${Date.now()}`)
            const checkData = await checkRes.json()
            // Scan is done when visibility data has actual prompts
            if (checkData.visibility?.totalPrompts > 0) {
              clearInterval(poll)
              clearInterval(checkDone)
              setScanProgress(locale === 'nl' ? 'Klaar! Dashboard laden...' : 'Done! Loading dashboard...')
              setTimeout(() => onScanTriggered?.(), 1000)
            }
          } catch {}
        }, 12000)

        // Hard timeout 3 min
        setTimeout(() => { clearInterval(poll); clearInterval(checkDone); onScanTriggered?.() }, 180000)
      } else {
        // Immediate completion
        onScanTriggered?.()
      }
    } catch (err) {
      console.error('Prompt selection/scan error:', err)
      setScanError(err.message)
      setScanning(false)
    }
  }

  const T = {
    title: locale === 'nl' ? 'Kies je prompts' : 'Choose your prompts',
    subtitle: locale === 'nl'
      ? `De Prompt Explorer heeft ${allPrompts.length} prompts gevonden voor ${disc.brandName || disc.website}. Selecteer er ${MAX_SELECT} om te scannen op alle AI-platforms.`
      : `The Prompt Explorer found ${allPrompts.length} prompts for ${disc.brandName || disc.website}. Select ${MAX_SELECT} to scan across all AI platforms.`,
    autoSelect: locale === 'nl' ? 'Top 10 op zoekvolume' : 'Top 10 by search volume',
    selected: locale === 'nl' ? 'geselecteerd' : 'selected',
    startScan: locale === 'nl' ? 'Start AI Visibility scan' : 'Start AI Visibility scan',
    scanning: locale === 'nl' ? 'Bezig met scannen...' : 'Scanning...',
    volume: locale === 'nl' ? 'vol.' : 'vol.',
    perMonth: locale === 'nl' ? '/mnd' : '/mo',
    maxReached: locale === 'nl' ? `Maximum ${MAX_SELECT} bereikt` : `Maximum ${MAX_SELECT} reached`,
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-violet-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{T.title}</h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">{T.subtitle}</p>
      </div>

      {/* Auto-select + counter */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={autoSelect} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> {T.autoSelect}
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${selected.size === MAX_SELECT ? 'text-emerald-600' : 'text-slate-600'}`}>
            {selected.size}/{MAX_SELECT}
          </span>
          <span className="text-sm text-slate-400">{T.selected}</span>
        </div>
      </div>

      {/* Cluster groups */}
      <div className="space-y-3 mb-8">
        {sortedClusters.map(([clusterName, clusterPrompts, clusterVol]) => {
          const isExpanded = expandedCluster === clusterName || sortedClusters.length <= 3
          const selectedInCluster = clusterPrompts.filter(p => selected.has(p.idx)).length

          return (
            <div key={clusterName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Cluster header */}
              <button
                onClick={() => setExpandedCluster(expandedCluster === clusterName ? null : clusterName)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-none cursor-pointer hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-slate-800">{clusterName}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {clusterPrompts.length} prompts
                  </span>
                  {selectedInCluster > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold">
                      {selectedInCluster} ✓
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">{clusterVol.toLocaleString()} {T.volume}</span>
                  {sortedClusters.length > 3 && (
                    isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              </button>

              {/* Prompt list */}
              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {clusterPrompts.sort((a, b) => b.volume - a.volume).map(p => {
                    const isSelected = selected.has(p.idx)
                    const isDisabled = !isSelected && selected.size >= MAX_SELECT

                    return (
                      <label
                        key={p.idx}
                        className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/50' : isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => !isDisabled && toggle(p.idx)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                        <span className={`flex-1 text-[13px] ${isSelected ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                          {p.text}
                        </span>
                        {p.volume > 0 && (
                          <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                            {p.volume.toLocaleString()}{T.perMonth}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Max reached notice */}
      {selected.size >= MAX_SELECT && (
        <div className="text-center text-[12px] text-amber-600 mb-3">
          {T.maxReached}
        </div>
      )}

      {/* Scan error */}
      {scanError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
          <p className="text-sm text-red-600">{scanError}</p>
        </div>
      )}

      {/* CTA Button */}
      <div className="text-center">
        <button
          onClick={startScan}
          disabled={selected.size === 0 || scanning}
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-white text-[15px] font-semibold border-none cursor-pointer hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          style={{ background: 'linear-gradient(135deg, #292956, #1a1a4e)' }}
        >
          {scanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {scanProgress || T.scanning}
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              {T.startScan} ({selected.size} prompts)
            </>
          )}
        </button>
        {!scanning && selected.size > 0 && (
          <div className="text-[11px] text-slate-400 mt-3">
            {locale === 'nl'
              ? 'Scant op ChatGPT, Perplexity, Google AI Mode en AI Overviews'
              : 'Scans ChatGPT, Perplexity, Google AI Mode and AI Overviews'}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// ── Scan In Progress (after prompt selection) ──
// ═══════════════════════════════════════════════
function ScanInProgress({ locale, company, onRefresh }) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [phase, setPhase] = useState('starting') // starting, chatgpt, perplexity, analyzing, done

  // Smooth progress (same curve as AI visibility tool)
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const rounded = Math.floor(prev)
        if (rounded >= 97) return rounded
        if (rounded < 10) return prev + 2
        if (rounded < 25) return prev + 1
        if (rounded < 50) return prev + 0.6
        if (rounded < 70) return prev + 0.4
        if (rounded < 85) return prev + 0.25
        if (rounded < 92) return prev + 0.15
        return prev + 0.08
      })
    }, 1000)
    return () => clearInterval(progressInterval)
  }, [])

  // Step messages
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setProgress(current => {
        const rounded = Math.floor(current)
        if (rounded < 5) {
          setPhase('starting')
          setCurrentStep(locale === 'nl' ? 'Prompts voorbereiden...' : 'Preparing prompts...')
        } else if (rounded < 15) {
          setPhase('chatgpt')
          setCurrentStep(locale === 'nl' ? 'ChatGPT scannen...' : 'Scanning ChatGPT...')
        } else if (rounded < 50) {
          setPhase('chatgpt')
          const p = Math.min(Math.floor((rounded - 15) / 3.5) + 1, 10)
          setCurrentStep(locale === 'nl' ? `ChatGPT: prompt ${p}/10 analyseren...` : `ChatGPT: analyzing prompt ${p}/10...`)
        } else if (rounded < 55) {
          setPhase('perplexity')
          setCurrentStep(locale === 'nl' ? 'Perplexity scannen...' : 'Scanning Perplexity...')
        } else if (rounded < 90) {
          setPhase('perplexity')
          const p = Math.min(Math.floor((rounded - 55) / 3.5) + 1, 10)
          setCurrentStep(locale === 'nl' ? `Perplexity: prompt ${p}/10 analyseren...` : `Perplexity: analyzing prompt ${p}/10...`)
        } else {
          setPhase('analyzing')
          setCurrentStep(locale === 'nl' ? 'Resultaten verwerken en concurrenten analyseren...' : 'Processing results and analyzing competitors...')
        }
        return current
      })
    }, 800)
    return () => clearInterval(stepInterval)
  }, [locale])

  // Auto-refresh every 15s to check if scan is done
  useEffect(() => {
    const refresher = setInterval(() => onRefresh?.(), 15000)
    // Max 3 min timeout
    const timeout = setTimeout(() => onRefresh?.(), 180000)
    return () => { clearInterval(refresher); clearTimeout(timeout) }
  }, [onRefresh])

  const T = locale === 'nl' ? {
    title: 'We analyseren je AI-zichtbaarheid',
    hint: 'Dit duurt 1-2 minuten. We scannen 10 prompts op 2 AI-platforms.',
    step1: 'Prompts klaarzetten',
    step2: 'Scannen op ChatGPT en Perplexity',
    step3: 'Resultaten analyseren',
    cta: 'Wist je dat 67% van de consumenten AI gebruikt voor aankoopbeslissingen?',
  } : {
    title: 'Analyzing your AI visibility',
    hint: 'This takes 1-2 minutes. We scan 10 prompts across 2 AI platforms.',
    step1: 'Preparing prompts',
    step2: 'Scanning ChatGPT and Perplexity',
    step3: 'Analyzing results',
    cta: 'Did you know 67% of consumers use AI for purchase decisions?',
  }

  const rounded = Math.floor(progress)

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 text-center mb-6">
        <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
        <p className="text-xl font-bold text-slate-900 mb-2">{T.title}</p>
        <p className="text-slate-600 mb-6">{currentStep}</p>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 flex items-center justify-end pr-2"
            style={{ width: `${Math.max(rounded, 2)}%` }}
          >
            {rounded > 5 && (
              <span className="text-xs font-bold text-white drop-shadow-lg">{rounded}%</span>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400">{T.hint}</p>
      </div>

      {/* Step indicators */}
      <div className="space-y-3 text-sm mb-8">
        <div className={`flex items-center gap-3 transition-colors duration-300 ${rounded >= 15 ? 'text-green-600' : rounded > 2 ? 'text-blue-600' : 'text-slate-400'}`}>
          {rounded >= 15 ? <CheckCircle2 className="w-5 h-5" /> : rounded > 2 ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
          <span className="font-medium">{T.step1}</span>
        </div>
        <div className={`flex items-center gap-3 transition-colors duration-300 ${rounded >= 90 ? 'text-green-600' : rounded > 15 ? 'text-blue-600' : 'text-slate-400'}`}>
          {rounded >= 90 ? <CheckCircle2 className="w-5 h-5" /> : rounded > 15 ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
          <span className="font-medium">{T.step2}</span>
          {rounded > 15 && rounded < 90 && (
            <span className="text-xs text-slate-400 ml-auto">{phase === 'chatgpt' ? 'ChatGPT' : 'Perplexity'}</span>
          )}
        </div>
        <div className={`flex items-center gap-3 transition-colors duration-300 ${rounded >= 97 ? 'text-green-600' : rounded > 90 ? 'text-blue-600' : 'text-slate-400'}`}>
          {rounded >= 97 ? <CheckCircle2 className="w-5 h-5" /> : rounded > 90 ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
          <span className="font-medium">{T.step3}</span>
        </div>
      </div>

      {/* FOMO fact */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-sm text-amber-800 font-medium">💡 {T.cta}</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// ── Main Dashboard ──
// ═══════════════════════════════════════════════

export default function DashboardClient({ locale, t, userId, userEmail }) {
  const [activeTab, setActiveTab] = useState('overview')
  const period = '90d' // Always show all data — period tabs removed
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // company_name to confirm delete
  const [deleting, setDeleting] = useState(false)
  // Prompt editing state
  const [editMode, setEditMode] = useState(false)
  const [editablePrompts, setEditablePrompts] = useState([])
  const [editingIdx, setEditingIdx] = useState(null)
  const [showConfirmRescan, setShowConfirmRescan] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [rescanProgress, setRescanProgress] = useState({ current: 0, total: 0, phase: '' })
  // Expandable prompt rows
  const [expandedPrompt, setExpandedPrompt] = useState(null)

  const [expandedCompetitor, setExpandedCompetitor] = useState(null)
  // Extension detection
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  // Rank check deletion
  const [deletingRankCheck, setDeletingRankCheck] = useState(null)
  const [promptsEditedOnce, setPromptsEditedOnce] = useState(() => {
    try { return localStorage.getItem('teun_prompts_edited_' + userId) === 'true' } catch { return false }
  })

  useEffect(() => { document.body.classList.add('dashboard-active'); return () => document.body.classList.remove('dashboard-active') }, [])

  // ✨ Claim anonieme scan data bij eerste dashboard load
  useEffect(() => {
    fetch('/api/auth/claim-session', { method: 'POST', credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.claimed?.total > 0) {
          console.log(`✅ ${data.claimed.total} eerdere scan(s) gekoppeld aan account`)
          window.location.reload()
        }
      })
      .catch(err => console.error('Session claim error:', err))
  }, [])

  // Detect Chrome extension AND push auth token
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    async function pushAuthToExtension() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          console.warn('⚠️ No Supabase session for extension auth')
          return
        }

        // Push auth to extension via external messaging
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage(EXTENSION_ID, {
            action: 'store_auth',
            token: session.access_token,
            user: { id: session.user.id, email: session.user.email }
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('Extension not available:', chrome.runtime.lastError.message)
              return
            }
            if (response?.success) {
              console.log('✅ Auth pushed to Teun.ai extension')
              setExtensionInstalled(true)
            }
          })
        }
      } catch (err) {
        console.warn('Extension auth push failed:', err)
      }
    }

    // Check for extension presence via DOM attribute
    const check = setInterval(() => {
      if (document.documentElement.hasAttribute('data-teun-extension')) {
        setExtensionInstalled(true)
        clearInterval(check)
        pushAuthToExtension()
      }
    }, 1000)
    setTimeout(() => clearInterval(check), 5000)

    // Also try pushing auth immediately (extension might already be ready)
    pushAuthToExtension()

    // Re-push auth when session refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && extensionInstalled) {
        pushAuthToExtension()
      }
    })

    return () => {
      clearInterval(check)
      subscription?.unsubscribe()
    }
  }, [])
  useEffect(() => {
    const h = (e) => { if (showCompanyDropdown && !e.target.closest('[data-company-switcher]')) setShowCompanyDropdown(false) }
    document.addEventListener('click', h); return () => document.removeEventListener('click', h)
  }, [showCompanyDropdown])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ period })
      if (selectedCompany) params.set('company', selectedCompany)
      const res = await fetch(`/api/dashboard?${params}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch')
      const json = await res.json()
      setData(json)
      // Auto-select: if no company selected, or selected company no longer exists, pick the active one
      const companies = json.companies || []
      const companyExists = selectedCompany && companies.some(c => c.company_name === selectedCompany)
      if (!companyExists && json.activeCompany?.name) setSelectedCompany(json.activeCompany.name)
    } catch (err) { console.error('Dashboard fetch error:', err); setError(err.message) }
    finally { setLoading(false) }
  }, [selectedCompany])

  useEffect(() => { fetchData() }, [fetchData])

  // Delete a company and all its data
  const deleteCompany = useCallback(async (companyName) => {
    setDeleting(true)
    try {
      const res = await fetch('/api/dashboard', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed')
      setConfirmDelete(null)
      // If we deleted the active company, reset selection
      if (selectedCompany === companyName) setSelectedCompany(null)
      fetchData()
    } catch (err) {
      console.error('Delete error:', err)
      alert(locale === 'nl' ? `Verwijderen mislukt: ${err.message}` : `Delete failed: ${err.message}`)
    } finally {
      setDeleting(false)
    }
  }, [selectedCompany, fetchData, locale])

  // Delete a single rank check
  const deleteRankCheck = useCallback(async (rankCheckId) => {
    setDeletingRankCheck(rankCheckId)
    try {
      const res = await fetch(`/api/rank-check?id=${rankCheckId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      fetchData()
    } catch (err) {
      console.error('Delete rank check error:', err)
      alert(locale === 'nl' ? `Verwijderen mislukt: ${err.message}` : `Delete failed: ${err.message}`)
    } finally {
      setDeletingRankCheck(null)
    }
  }, [fetchData, locale])

  // Derived
  const visibility = data?.visibility || {}
  const prompts = data?.prompts || []
  const competitors = data?.competitors || []
  const visibilityTrend = data?.visibilityTrend || []
  const rankChecks = data?.rankChecks || []
  const googleAiMode = data?.googleAiMode || { found: 0, total: 0, pct: 0 }
  const googleAiOverview = data?.googleAiOverview || { found: 0, total: 0, pct: 0 }
  const activeCompany = data?.activeCompany
  const companies = data?.companies || []
  const promptDiscovery = data?.promptDiscovery || []

  const totalFound = visibility.found || 0
  const totalPrompts = visibility.totalPrompts || 0
  const visibilityPct = visibility.total || 0

  const lastScanText = (() => {
    if (!data?.lastScan) return '—'
    const diff = Date.now() - new Date(data.lastScan).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} uur`
    return `${Math.floor(hours / 24)}d`
  })()
  const lastScanDate = data?.lastScan ? new Date(data.lastScan).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

  const initials = data?.user?.fullName ? data.user.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : userEmail?.slice(0, 2).toUpperCase() || '??'
  const companyInitials = activeCompany?.name ? activeCompany.name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

  const tabs = [
    { id: 'overview', label: t.tabs.overview, Icon: LayoutDashboard },
    { id: 'prompts', label: t.tabs.prompts, Icon: Search },
    { id: 'competitors', label: t.tabs.competitors, Icon: Swords },
    { id: 'audit', label: t.tabs.audit, Icon: ShieldCheck },
  ]
  const toolLinks = [
    { label: t.sidebar.brandCheck, href: lp(locale, '/tools/brand-check'), tag: t.sidebar.free },
    { label: t.sidebar.rankTracker, href: lp(locale, '/tools/ai-rank-tracker'), tag: t.sidebar.free },
    { label: t.sidebar.geoAnalyse, href: lp(locale, '/dashboard/geo-analyse'), tag: null },
    { label: t.sidebar.contentOptimizer, href: null, tag: t.sidebar.soon },
  ]

  const subtitle = t.subtitles[activeTab]?.replace('{company}', activeCompany?.name || '').replace('van  op', 'van je bedrijf op').replace('of  in', 'of your company in')

  // Total platform hits (additive: ChatGPT found + Perplexity found + Google AI found)
  const chatgptFoundCount = prompts.filter(p => p.chatgpt.found).length
  const perplexityFoundCount = prompts.filter(p => p.perplexity.found).length
  const totalPlatformHits = chatgptFoundCount + perplexityFoundCount + (googleAiMode.found || 0) + (googleAiOverview.found || 0)

  return (
    <>
      <style jsx global>{`
        body.dashboard-active > header, body.dashboard-active > nav, body.dashboard-active > footer,
        body.dashboard-active > div > header, body.dashboard-active > div > nav, body.dashboard-active > div > footer,
        body.dashboard-active > div > div > header, body.dashboard-active > div > div > nav,
        body.dashboard-active header:first-of-type, body.dashboard-active footer:last-of-type { display: none !important; }
        body.dashboard-active { overflow-x: hidden; }
      `}</style>

      <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>

        {/* ── SIDEBAR ── */}
        <aside className="fixed left-0 top-0 bottom-0 w-[240px] flex flex-col z-[100]" style={{ background: '#1a1a3e' }}>
          <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
            <Link href={lp(locale, '/')} className="block no-underline">
              <div className="text-[22px] font-bold text-white tracking-tight">TEUN.AI</div>
              <div className="text-[11px] text-white/40 mt-0.5">{t.sidebar.platform}</div>
            </Link>
          </div>

          <div className="mx-3 mt-4 relative" data-company-switcher>
            <button onClick={() => companies.length > 0 && setShowCompanyDropdown(!showCompanyDropdown)} className="w-full p-3 rounded-[10px] bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer text-left border-none">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[13px] font-bold shrink-0" style={{ background: activeCompany ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : '#3b3b6b' }}>{activeCompany ? companyInitials : '?'}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-white truncate">{activeCompany?.name || t.selectCompany}</div>
                  {activeCompany?.website && <div className="text-[11px] text-white/40 truncate">{activeCompany.website}</div>}
                </div>
                {companies.length > 1 && <ChevronDown className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />}
              </div>
            </button>
            {showCompanyDropdown && companies.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#232350] rounded-lg border border-white/10 py-1 shadow-2xl z-[110] max-h-60 overflow-y-auto">
                {companies.map((c, i) => (
                  <div key={i} className="flex items-center group">
                    <button onClick={() => { setSelectedCompany(c.company_name); setShowCompanyDropdown(false); setConfirmDelete(null) }} className={`flex-1 px-4 py-2.5 text-left text-[12px] hover:bg-white/[0.08] transition-colors border-none cursor-pointer ${selectedCompany === c.company_name ? 'text-white bg-white/[0.06]' : 'text-white/60 bg-transparent'}`}>
                      <div className="font-medium">{c.company_name}</div>
                      {c.website && <div className="text-[10px] text-white/30 mt-0.5">{c.website}</div>}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(confirmDelete === c.company_name ? null : c.company_name) }}
                      className="px-2.5 py-2.5 text-white/20 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none opacity-0 group-hover:opacity-100"
                      title={locale === 'nl' ? 'Verwijderen' : 'Delete'}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Delete confirmation modal */}
            {confirmDelete && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a40] rounded-lg border border-red-500/30 p-4 shadow-2xl z-[120]">
                <p className="text-[12px] text-white/80 mb-1 font-medium">
                  {locale === 'nl' ? 'Weet je het zeker?' : 'Are you sure?'}
                </p>
                <p className="text-[11px] text-white/40 mb-3">
                  {locale === 'nl'
                    ? `Alle data van "${confirmDelete}" wordt permanent verwijderd (scans, rank checks, etc.)`
                    : `All data for "${confirmDelete}" will be permanently deleted (scans, rank checks, etc.)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteCompany(confirmDelete)}
                    disabled={deleting}
                    className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold cursor-pointer border-none disabled:opacity-50 transition-colors">
                    {deleting
                      ? (locale === 'nl' ? 'Bezig...' : 'Deleting...')
                      : (locale === 'nl' ? 'Ja, verwijder' : 'Yes, delete')}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/60 text-[11px] font-medium cursor-pointer border-none transition-colors">
                    {locale === 'nl' ? 'Annuleren' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 px-3 pt-4 overflow-y-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-0.5 text-[13px] transition-all text-left cursor-pointer border-none ${activeTab === tab.id ? 'font-semibold text-white bg-white/10' : 'font-normal text-white/50 hover:text-white/70 hover:bg-white/[0.04] bg-transparent'}`}>
                <tab.Icon className="w-4 h-4 shrink-0" /> {tab.label}
              </button>
            ))}
            <div className="h-px bg-white/[0.06] my-3" />
            <div className="text-[10px] text-white/25 px-3.5 mb-2 uppercase tracking-[0.08em] font-medium">{t.sidebar.tools}</div>
            {toolLinks.map(item => item.href ? (
              <Link key={item.label} href={item.href} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-white/40 hover:text-white/60 transition-colors no-underline">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" /><span className="flex-1">{item.label}</span>
                {item.tag && <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${item.tag === t.sidebar.free ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/[0.06] text-white/25'}`}>{item.tag}</span>}
              </Link>
            ) : (
              <div key={item.label} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-white/25 cursor-default">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" /><span className="flex-1">{item.label}</span>
                {item.tag && <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase bg-white/[0.06] text-white/25">{item.tag}</span>}
              </div>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-7 h-7 rounded-lg bg-[#292956] flex items-center justify-center text-white/60 text-[11px] font-semibold shrink-0">{initials}</div>
              <div className="text-[12px] text-white/50 truncate min-w-0">{userEmail}</div>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="ml-[240px] flex-1 p-8 pb-16 min-h-screen max-w-[1100px]">
          <div className="flex items-start justify-between mb-7">
            <div>
              <h1 className="text-[24px] font-bold text-slate-800 m-0 leading-tight">{t.headers[activeTab]}</h1>
              <p className="text-[13px] text-slate-400 mt-1 m-0">{subtitle}</p>
            </div>
            <div className="flex gap-2 items-center shrink-0">
            </div>
          </div>

          {loading && !data && <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-8 h-8 text-slate-300 animate-spin mb-4" /><span className="text-sm text-slate-400">{t.loading}</span></div>}
          {error && !loading && <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-sm text-red-600 mb-3">{error}</p><button onClick={fetchData} className="text-sm text-red-700 underline cursor-pointer bg-transparent border-none">{t.rescan}</button></div>}
          {!loading && data && totalPrompts === 0 && activeTab === 'overview' && (() => {
            // Check if there's a pending scan (integration exists but no results yet)
            const hasPendingIntegration = companies.length > 0
            // Only show selection flow for discoveries that haven't been successfully scanned
            const unselectedDiscovery = promptDiscovery.filter(d =>
              (d.status === 'completed' || (d.status === 'selected' && !d.scanIntegrationId))
            )

            if (hasPendingIntegration) {
              // Scan is running or just created — show progress
              return (
                <ScanInProgress locale={locale} company={activeCompany?.name || companies[0]?.company_name} onRefresh={fetchData} />
              )
            }
            if (unselectedDiscovery.length > 0) {
              return (
                <PromptSelectionFlow discovery={unselectedDiscovery} locale={locale} onScanTriggered={() => { fetchData() }} />
              )
            }
            return <EmptyState t={t} locale={locale} />
          })()}

          {/* ════════════ OVERVIEW ════════════ */}
          {activeTab === 'overview' && data && totalPrompts > 0 && (
            <>
              <div className="flex gap-4 mb-6">
                <StatCard label={t.stats.visibility} value={`${visibilityPct}%`} sub={`${totalFound}/${totalPrompts} ${t.stats.promptsFound}`} accent="#059669" />
                <StatCard label={locale === 'nl' ? 'Platformvermeldingen' : 'Platform hits'} value={totalPlatformHits} sub={`ChatGPT ${chatgptFoundCount}/${totalPrompts} · Perplexity ${perplexityFoundCount}/${totalPrompts}`} />
                <StatCard label={t.stats.topCompetitor} value={data.topCompetitor?.name || '—'} sub={data.topCompetitor ? `${data.topCompetitor.appearances || data.topCompetitor.mentions}× ${locale === 'nl' ? 'in ' + totalPrompts + ' prompts' : 'in ' + totalPrompts + ' prompts'}` : ''} accent="#64748b" small />
                <StatCard label={t.stats.lastScan} value={lastScanText} sub={lastScanDate} />
              </div>

              {/* Google AI scan CTA — show when no Google AI data yet */}
              <GoogleScanBanner t={t} locale={locale} prompts={prompts} activeCompany={activeCompany} onScanComplete={fetchData} googleAiMode={googleAiMode} googleAiOverview={googleAiOverview} />

              {/* Chrome Extension CTA — show when no extension data and extension not installed */}
              {!extensionInstalled && !data?.hasExtensionData && data && totalPrompts > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                      <Globe className="w-4.5 h-4.5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-amber-900">
                        {locale === 'nl' ? 'Nauwkeurigere ChatGPT resultaten beschikbaar' : 'More accurate ChatGPT results available'}
                      </div>
                      <div className="text-[11px] text-amber-700 mt-0.5">
                        {locale === 'nl'
                          ? 'Installeer de Chrome extensie voor resultaten direct uit ChatGPT 5.2 — 1-op-1 met wat gebruikers zien op ChatGPT.com'
                          : 'Install the Chrome extension for results straight from ChatGPT 5.2 — matching exactly what users see on ChatGPT.com'}
                      </div>
                    </div>
                  </div>
                  <a href="https://chromewebstore.google.com/detail/jjhjnmkanlmjhmobcgemjakkjdbkkfmk" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-white border border-amber-300 rounded-lg px-3.5 py-2 hover:bg-amber-50 transition no-underline whitespace-nowrap shrink-0">
                    <Zap className="w-3 h-3" />
                    {locale === 'nl' ? 'Installeer extensie' : 'Install extension'}
                  </a>
                </div>
              )}
              {/* Extension connected but no scan data yet */}
              {extensionInstalled && !data?.hasExtensionData && data && totalPrompts > 0 && (
                <div className="bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4.5 h-4.5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-cyan-900">
                        {locale === 'nl' ? 'Chrome extensie verbonden' : 'Chrome extension connected'}
                      </div>
                      <div className="text-[11px] text-cyan-700 mt-0.5">
                        {locale === 'nl'
                          ? 'Open de extensie op ChatGPT.com en start een scan om resultaten direct uit ChatGPT 5.2 te zien.'
                          : 'Open the extension on ChatGPT.com and start a scan to see results straight from ChatGPT 5.2.'}
                      </div>
                    </div>
                  </div>
                  <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-800 bg-white border border-cyan-300 rounded-lg px-3.5 py-2 hover:bg-cyan-50 transition no-underline whitespace-nowrap shrink-0">
                    <Play className="w-3 h-3" />
                    {locale === 'nl' ? 'Start scan' : 'Start scan'}
                  </a>
                </div>
              )}
              {/* Extension active badge */}
              {data?.hasExtensionData && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-[12px] text-emerald-800">
                    <span className="font-semibold">ChatGPT 5.2 {locale === 'nl' ? 'resultaten via Chrome extensie' : 'results via Chrome extension'}</span>
                    {data.extensionScanDate && (
                      <span className="text-emerald-600 ml-1.5">
                        · {new Date(data.extensionScanDate).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <VisibilityChart data={visibilityTrend} t={t} />

              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Quick Wins */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="text-[15px] font-semibold text-slate-800 mb-1">{t.quickWins.title}</div>
                  <div className="text-[12px] text-slate-400 mb-4">{t.quickWins.subtitle}</div>
                  {(() => {
                    const wins = []
                    const notFoundCount = prompts.filter((p, i) => !p.chatgpt.found && !p.perplexity.found && !googleAiMode.prompts?.[i]?.found && !googleAiOverview.prompts?.[i]?.found).length
                    if (notFoundCount > 0) wins.push({ title: `${notFoundCount} ${t.promptsNotFound}`, desc: t.optimizeContent, impact: 'hoog', effort: 'medium' })
                    if (competitors.length > 0) wins.push({ title: `${competitors[0].name} ${t.mentioned.replace('{count}', competitors[0].appearances || competitors[0].mentions)}`, desc: t.analyzeCompetitor, impact: 'hoog', effort: 'medium' })
                    if (visibility.chatgpt !== visibility.perplexity) {
                      const weaker = visibility.chatgpt < visibility.perplexity ? 'ChatGPT' : 'Perplexity'
                      wins.push({ title: t.improveVisibility.replace('{platform}', weaker), desc: t.lowerScore.replace('{platform}', weaker), impact: 'medium', effort: 'laag' })
                    }
                    if (wins.length === 0) wins.push({ title: t.keepOptimizing, desc: t.onTrack, impact: 'medium', effort: 'laag' })
                    return wins.slice(0, 3).map((w, i) => (
                      <div key={i} className="p-3.5 bg-slate-50 rounded-[10px] mb-3 last:mb-0" style={{ borderLeft: '3px solid', borderLeftColor: w.impact === 'hoog' ? '#059669' : '#f59e0b' }}>
                        <div className="text-[13px] font-semibold text-slate-800 mb-1">{w.title}</div>
                        <div className="text-[12px] text-slate-500 leading-relaxed mb-2">{w.desc}</div>
                        <div className="flex gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${w.impact === 'hoog' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.quickWins.impact}: {w.impact}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-green-50 text-green-600">{t.quickWins.effort}: {w.effort}</span>
                        </div>
                      </div>
                    ))
                  })()}
                </div>

                {/* Platform Breakdown — 4 platforms */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="text-[15px] font-semibold text-slate-800 mb-1">{t.platform.title}</div>
                  <div className="text-[12px] text-slate-400 mb-5">{t.platform.subtitle}</div>
                  <PlatformBar name="ChatGPT" found={visibility.chatgptFound || 0} total={visibility.chatgptTotal || 0} color={PLATFORM_COLORS.chatgpt} pct={visibility.chatgpt || 0} label={t.stats.promptsFound} />
                  <PlatformBar name="Perplexity" found={visibility.perplexityFound || 0} total={visibility.perplexityTotal || 0} color={PLATFORM_COLORS.perplexity} pct={visibility.perplexity || 0} label={t.stats.promptsFound} />
                  <PlatformBar name="Google AI Mode" found={googleAiMode.found} total={googleAiMode.total} color={PLATFORM_COLORS.googleAiMode} pct={googleAiMode.pct} label={t.stats.promptsFound} notScanned={googleAiMode.total === 0} notScannedLabel={locale === 'nl' ? 'niet gescand' : 'not scanned'} />
                  <PlatformBar name="AI Overviews" found={googleAiOverview.found} total={googleAiOverview.total} color={PLATFORM_COLORS.googleAiOverview} pct={googleAiOverview.pct} label={t.stats.promptsFound} notScanned={googleAiOverview.total === 0} notScannedLabel={locale === 'nl' ? 'niet gescand' : 'not scanned'} />
                  <div className="h-px bg-slate-100 my-5" />
                  <div className="text-[13px] font-semibold text-slate-800 mb-3">{t.platform.topCompetitors}</div>
                  {competitors.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{i + 1}</span>
                        <span className="text-[12px] text-slate-800 font-medium">{c.name}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-slate-800">{c.appearances || c.mentions}×</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ════════════ PROMPTS ════════════ */}
          {activeTab === 'prompts' && data && (() => {
            const startEditing = () => {
              setEditablePrompts(prompts.slice(0, 10).map(p => p.text))
              setEditingIdx(null)
              setEditMode(true)
            }
            const cancelEditing = () => { setEditMode(false); setShowConfirmRescan(false); setEditingIdx(null) }
            const updatePrompt = (idx, val) => setEditablePrompts(prev => prev.map((p, i) => i === idx ? val : p))
            const hasChanges = editMode && editablePrompts.some((p, i) => prompts[i] && p !== prompts[i].text)

            const confirmAndRescan = async () => {
              const validPrompts = editablePrompts.filter(p => p.trim().length > 0)
              const company = activeCompany?.name
              const website = activeCompany?.website || ''
              const category = activeCompany?.category || ''
              if (!company || validPrompts.length === 0) return

              setShowConfirmRescan(false)
              setRescanning(true)
              const total = validPrompts.length
              setRescanProgress({ current: 0, total, phase: 'ChatGPT & Perplexity' })

              // Phase 1: ChatGPT + Perplexity (per prompt)
              for (let i = 0; i < validPrompts.length; i++) {
                setRescanProgress({ current: i + 1, total, phase: 'ChatGPT & Perplexity' })
                try {
                  await fetch('/api/ai-visibility-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ companyName: company, query: validPrompts[i], category })
                  })
                } catch (err) { console.error('Rescan error:', err) }
                if (i < validPrompts.length - 1) await new Promise(r => setTimeout(r, 1500))
              }

              // Phase 2: Google AI Mode
              setRescanProgress({ current: 0, total: 1, phase: 'Google AI Mode' })
              try {
                await fetch('/api/scan-google-ai', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ companyName: company, website, prompts: validPrompts })
                })
              } catch (err) { console.error('Google AI Mode rescan error:', err) }

              // Phase 3: Google AI Overviews
              setRescanProgress({ current: 0, total: 1, phase: 'AI Overviews' })
              try {
                await fetch('/api/scan-google-ai-overview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ companyName: company, website, prompts: validPrompts })
                })
              } catch (err) { console.error('AI Overview rescan error:', err) }

              // Mark as edited
              setPromptsEditedOnce(true)
              try { localStorage.setItem('teun_prompts_edited_' + userId, 'true') } catch {}

              setRescanning(false)
              setEditMode(false)
              fetchData()
            }

            return (
              <div className="space-y-4">
                {/* Rescan progress overlay */}
                {rescanning && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <div className="text-[14px] font-semibold text-indigo-900">
                        {locale === 'nl' ? 'Alle platformen opnieuw scannen...' : 'Rescanning all platforms...'}
                      </div>
                    </div>
                    <div className="text-[13px] text-indigo-700 mb-2">{rescanProgress.phase}</div>
                    <div className="h-2 bg-indigo-100 rounded overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded transition-all duration-500" style={{
                        width: rescanProgress.phase === 'ChatGPT & Perplexity'
                          ? `${(rescanProgress.current / Math.max(rescanProgress.total, 1)) * 50}%`
                          : rescanProgress.phase === 'Google AI Mode' ? '70%' : '90%'
                      }} />
                    </div>
                    <div className="text-[11px] text-indigo-500 mt-2">
                      {rescanProgress.phase === 'ChatGPT & Perplexity'
                        ? `${rescanProgress.current}/${rescanProgress.total} prompts`
                        : locale === 'nl' ? 'Even geduld...' : 'Please wait...'}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <span className="text-[14px] font-semibold text-slate-800">{prompts.length} prompts</span>
                      <span className="text-[12px] text-slate-400 ml-2">• {totalFound} {t.promptTracker.found} ({visibilityPct}%)</span>
                    </div>
                    {!editMode && !rescanning && (
                      <button
                        onClick={startEditing}
                        disabled={promptsEditedOnce}
                        className="px-4 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1.5 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                        title={promptsEditedOnce ? (locale === 'nl' ? 'Je hebt je prompts al aangepast (max 1× in BETA)' : 'You\'ve already edited your prompts (max 1× in BETA)') : ''}
                      >
                        <Pencil className="w-3 h-3" /> {t.promptTracker.editPrompts}
                        {promptsEditedOnce && <span className="text-[10px] text-amber-600 ml-1">✓ {locale === 'nl' ? 'gebruikt' : 'used'}</span>}
                      </button>
                    )}
                    {editMode && !rescanning && (
                      <div className="flex gap-2">
                        <button onClick={cancelEditing}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-500 cursor-pointer hover:bg-slate-50 transition-all bg-white">
                          {locale === 'nl' ? 'Annuleren' : 'Cancel'}
                        </button>
                        <button onClick={() => hasChanges ? setShowConfirmRescan(true) : cancelEditing()}
                          disabled={!hasChanges}
                          className="px-4 py-1.5 rounded-lg border-none text-[12px] font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: '#292956' }}>
                          <RefreshCw className="w-3 h-3 inline mr-1.5" />
                          {locale === 'nl' ? 'Opslaan & opnieuw scannen' : 'Save & rescan'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit mode warnings */}
                  {editMode && !rescanning && (
                    <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-100 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[13px] font-semibold text-amber-800 mb-0.5">
                            {locale === 'nl' ? 'Pas prompts alleen aan als ze niet kloppen of niet relevant zijn' : 'Only edit prompts if they are incorrect or not relevant'}
                          </div>
                          <div className="text-[12px] text-amber-700 leading-relaxed">
                            {locale === 'nl'
                              ? 'Na het aanpassen worden alle resultaten gereset en worden ChatGPT, Perplexity, Google AI Mode en AI Overviews opnieuw gescand. Dit kan een paar minuten duren.'
                              : 'After editing, all results will be reset and ChatGPT, Perplexity, Google AI Mode and AI Overviews will be rescanned. This may take a few minutes.'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-6">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-200/60 text-amber-800">BETA</span>
                        <span className="text-[12px] text-amber-700">
                          {locale === 'nl' ? 'Je kunt prompts maximaal 1 keer aanpassen' : 'You can edit prompts a maximum of 1 time'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Confirm rescan dialog */}
                  {showConfirmRescan && (
                    <div className="px-6 py-5 bg-red-50 border-b border-red-100">
                      <div className="text-[14px] font-semibold text-red-800 mb-2">
                        {locale === 'nl' ? 'Weet je het zeker?' : 'Are you sure?'}
                      </div>
                      <div className="text-[13px] text-red-700 mb-4 leading-relaxed">
                        {locale === 'nl'
                          ? 'Alle huidige resultaten worden verwijderd en alle platformen worden opnieuw gescand met de aangepaste prompts. Dit kun je in de BETA niet ongedaan maken.'
                          : 'All current results will be deleted and all platforms will be rescanned with the edited prompts. This cannot be undone in BETA.'}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowConfirmRescan(false)}
                          className="px-4 py-2 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 cursor-pointer bg-white hover:bg-slate-50 transition-all">
                          {locale === 'nl' ? 'Annuleren' : 'Cancel'}
                        </button>
                        <button onClick={confirmAndRescan}
                          className="px-4 py-2 rounded-lg border-none text-[12px] font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity bg-red-600">
                          {locale === 'nl' ? 'Ja, aanpassen & opnieuw scannen' : 'Yes, edit & rescan'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Column headers */}
                  <div className="grid gap-3 px-6 py-3 bg-slate-50 text-[11px] text-slate-400 font-semibold uppercase tracking-wider" style={{ gridTemplateColumns: '32px 1fr 80px 80px 80px 80px 50px' }}>
                    <span>#</span><span>{t.promptTracker.prompt}</span>
                    <span className="text-center">{data?.hasExtensionData ? <span title={locale === 'nl' ? 'Via Chrome extensie' : 'Via Chrome extension'}>ChatGPT <span className="text-emerald-500">⚡</span></span> : 'ChatGPT'}</span><span className="text-center">Perplexity</span>
                    <span className="text-center" title={googleAiMode.total === 0 ? (locale === 'nl' ? 'Nog niet gescand' : 'Not scanned yet') : ''}>AI Mode{googleAiMode.total === 0 && <span className="text-slate-300 normal-case font-normal"> *</span>}</span>
                    <span className="text-center" title={googleAiOverview.total === 0 ? (locale === 'nl' ? 'Nog niet gescand' : 'Not scanned yet') : ''}>AI Overview{googleAiOverview.total === 0 && <span className="text-slate-300 normal-case font-normal"> *</span>}</span>
                    <span className="text-center">{t.promptTracker.trend}</span>
                  </div>

                  {/* Prompt rows */}
                  {(editMode ? editablePrompts : prompts.map(p => p.text)).map((promptText, i) => {
                    const p = prompts[i]
                    const gaiPrompt = googleAiMode.prompts?.[i]
                    const gaioPrompt = googleAiOverview.prompts?.[i]
                    const anyFound = p ? (p.chatgpt.found || p.perplexity.found || gaiPrompt?.found || gaioPrompt?.found) : false

                    return (
                      <div key={i}>
                      <div className="grid gap-3 px-6 py-3.5 items-center hover:bg-slate-50/50 transition-colors cursor-pointer" style={{ gridTemplateColumns: '32px 1fr 80px 80px 80px 80px 50px', borderBottom: '1px solid #f8fafc' }} onClick={() => !editMode && setExpandedPrompt(expandedPrompt === i ? null : i)}>
                        <span className="text-[12px] text-slate-400 font-mono">{i + 1}</span>

                        {/* Prompt text — editable or static */}
                        {editMode ? (
                          editingIdx === i ? (
                            <input
                              type="text"
                              value={promptText}
                              onChange={(e) => updatePrompt(i, e.target.value)}
                              onBlur={() => setEditingIdx(null)}
                              onKeyDown={(e) => { if (e.key === 'Enter') setEditingIdx(null) }}
                              autoFocus
                              className="text-[13px] text-slate-800 border border-indigo-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-200 bg-indigo-50/30 min-w-0"
                              maxLength={200}
                            />
                          ) : (
                            <span
                              onClick={() => setEditingIdx(i)}
                              className={`text-[13px] font-medium cursor-text hover:text-indigo-600 transition-colors ${promptText !== (p?.text || '') ? 'text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5 -mx-1.5' : 'text-slate-800'}`}
                              title={locale === 'nl' ? 'Klik om aan te passen' : 'Click to edit'}
                            >
                              {promptText}
                              {promptText !== (p?.text || '') && <Pencil className="w-2.5 h-2.5 inline ml-1.5 text-indigo-400" />}
                            </span>
                          )
                        ) : (
                          <span className="text-[13px] text-slate-800 font-medium flex items-center gap-1.5">
                            <ChevronDown className={`w-3 h-3 shrink-0 text-slate-400 transition-transform ${expandedPrompt === i ? 'rotate-180' : ''}`} />
                            {p?.text || promptText}
                          </span>
                        )}

                        {/* Badges — show dashes in edit mode if prompt changed */}
                        {editMode && promptText !== (p?.text || '') ? (
                          <>
                            <div className="text-center text-[11px] text-slate-300">—</div>
                            <div className="text-center text-[11px] text-slate-300">—</div>
                            <div className="text-center text-[11px] text-slate-300">—</div>
                            <div className="text-center text-[11px] text-slate-300">—</div>
                            <div className="text-center"><span className="text-[10px] text-indigo-500 font-medium">{locale === 'nl' ? 'nieuw' : 'new'}</span></div>
                          </>
                        ) : p ? (
                          <>
                            <div className="text-center"><MentionBadge found={p.chatgpt.found} mentionCount={p.chatgpt.mentionCount} /></div>
                            <div className="text-center"><MentionBadge found={p.perplexity.found} mentionCount={p.perplexity.mentionCount} /></div>
                            <div className="text-center">{googleAiMode.total > 0 ? <MentionBadge found={gaiPrompt?.found || false} mentionCount={gaiPrompt?.mentionCount || 0} /> : <span className="text-[11px] text-slate-300">—</span>}</div>
                            <div className="text-center">{googleAiOverview.total > 0 ? <MentionBadge found={gaioPrompt?.found || false} mentionCount={gaioPrompt?.mentionCount || 0} /> : <span className="text-[11px] text-slate-300">—</span>}</div>
                            <div className="text-center"><TrendBadge trend={anyFound ? 'stable' : 'down'} /></div>
                          </>
                        ) : (
                          <>
                            <div className="text-center text-[11px] text-slate-300">—</div>
                            <div className="text-center text-[11px] text-slate-300">—</div>
                            <div className="text-center text-[11px] text-slate-300">—</div>
                            <div className="text-center text-[11px] text-slate-300">—</div>
                            <div className="text-center" />
                          </>
                        )}
                      </div>

                      {/* ── Expanded prompt detail ── */}
                      {expandedPrompt === i && p && !editMode && (
                        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100" style={{ borderTop: '1px solid #e2e8f0' }}>
                          <div className="grid grid-cols-2 gap-4">
                            {/* ChatGPT details */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[12px] font-semibold text-slate-700">ChatGPT</span>
                                <MentionBadge found={p.chatgpt.found} mentionCount={p.chatgpt.mentionCount} />
                              </div>
                              {p.chatgpt.snippet && (
                                <div className="text-[12px] text-slate-600 leading-relaxed bg-white rounded-lg p-3 border border-slate-200">
                                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Snippet</div>
                                  {p.chatgpt.snippet.slice(0, 300)}{p.chatgpt.snippet.length > 300 ? '...' : ''}
                                </div>
                              )}
                              {p.chatgpt.competitors?.length > 0 && (
                                <div>
                                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{locale === 'nl' ? 'Concurrenten' : 'Competitors'}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {p.chatgpt.competitors.map((c, j) => (
                                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{c}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {p.chatgpt.sources?.length > 0 && (
                                <div>
                                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{locale === 'nl' ? 'Bronnen' : 'Sources'}</div>
                                  <div className="space-y-1">
                                    {p.chatgpt.sources.map((src, j) => (
                                      <a key={j} href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 no-underline hover:underline">
                                        <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{src}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Perplexity details */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="text-[12px] font-semibold text-slate-700">Perplexity</span>
                                <MentionBadge found={p.perplexity.found} mentionCount={p.perplexity.mentionCount} />
                              </div>
                              {p.perplexity.snippet && (
                                <div className="text-[12px] text-slate-600 leading-relaxed bg-white rounded-lg p-3 border border-slate-200">
                                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Snippet</div>
                                  {p.perplexity.snippet.slice(0, 300)}{p.perplexity.snippet.length > 300 ? '...' : ''}
                                </div>
                              )}
                              {p.perplexity.competitors?.length > 0 && (
                                <div>
                                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{locale === 'nl' ? 'Concurrenten' : 'Competitors'}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {p.perplexity.competitors.map((c, j) => (
                                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{c}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {p.perplexity.sources?.length > 0 && (
                                <div>
                                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{locale === 'nl' ? 'Bronnen' : 'Sources'}</div>
                                  <div className="space-y-1">
                                    {p.perplexity.sources.map((src, j) => (
                                      <a key={j} href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 no-underline hover:underline">
                                        <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{src}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Google AI details row */}
                          {(gaiPrompt || gaioPrompt) && (
                            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="w-2 h-2 rounded-full" style={{ background: '#ea4335' }} />
                                  <span className="text-[12px] font-semibold text-slate-700">Google AI Mode</span>
                                  {gaiPrompt && <MentionBadge found={gaiPrompt.found} mentionCount={gaiPrompt.mentionCount} />}
                                </div>
                                {gaiPrompt?.snippet && (
                                  <div className="text-[12px] text-slate-600 leading-relaxed bg-white rounded-lg p-3 border border-slate-200">
                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Snippet</div>
                                    {gaiPrompt.snippet.slice(0, 300)}{gaiPrompt.snippet.length > 300 ? '...' : ''}
                                  </div>
                                )}
                                {gaiPrompt?.competitors?.length > 0 && (
                                  <div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{locale === 'nl' ? 'Concurrenten' : 'Competitors'}</div>
                                    <div className="flex flex-wrap gap-1">
                                      {gaiPrompt.competitors.map((c, j) => (
                                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{typeof c === 'string' ? c : c.name || c}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="w-2 h-2 rounded-full" style={{ background: '#fbbc04' }} />
                                  <span className="text-[12px] font-semibold text-slate-700">AI Overviews</span>
                                  {gaioPrompt && <MentionBadge found={gaioPrompt.found} mentionCount={gaioPrompt.mentionCount} />}
                                </div>
                                {gaioPrompt?.snippet && (
                                  <div className="text-[12px] text-slate-600 leading-relaxed bg-white rounded-lg p-3 border border-slate-200">
                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Snippet</div>
                                    {gaioPrompt.snippet.slice(0, 300)}{gaioPrompt.snippet.length > 300 ? '...' : ''}
                                  </div>
                                )}
                                {gaioPrompt?.competitors?.length > 0 && (
                                  <div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{locale === 'nl' ? 'Concurrenten' : 'Competitors'}</div>
                                    <div className="flex flex-wrap gap-1">
                                      {gaioPrompt.competitors.map((c, j) => (
                                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{typeof c === 'string' ? c : c.name || c}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Optimize CTA */}
                          {!anyFound && (
                            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                              <div className="text-[12px] text-indigo-700">
                                {locale === 'nl'
                                  ? 'Niet gevonden in deze prompt? Optimaliseer je zichtbaarheid.'
                                  : 'Not found in this prompt? Optimize your visibility.'}
                              </div>
                              <Link href={lp(locale, '/dashboard/geo-analyse')} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition no-underline">
                                <Zap className="w-3 h-3" />
                                GEO Analyse
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    )
                  })}
                  {prompts.length === 0 && !editMode && <div className="px-6 py-16 text-center text-sm text-slate-400">{t.noData}</div>}
                  {(googleAiMode.total === 0 || googleAiOverview.total === 0) && prompts.length > 0 && !editMode && (
                    <div className="px-6 py-3 border-t border-slate-100 text-[11px] text-slate-400">
                      * {locale === 'nl'
                        ? 'AI Mode en AI Overviews worden apart gescand via de knop op het Overzicht-tab.'
                        : 'AI Mode and AI Overviews are scanned separately via the button on the Overview tab.'}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* ════════════ COMPETITORS ════════════ */}
          {activeTab === 'competitors' && data && (() => {
            // ── Build rich competitor data ──
            const competitorDetails = competitors.map(c => {
              const appearances = prompts.reduce((acc, p, idx) => {
                const inChatgpt = (p.chatgpt.competitors || []).some(name => name === c.name)
                const inPerplexity = (p.perplexity.competitors || []).some(name => name === c.name)
                // Google AI Mode
                const gaiPrompt = (googleAiMode.prompts || [])[idx]
                const inGoogleAiMode = (gaiPrompt?.competitors || []).some(name => name === c.name)
                // Google AI Overviews
                const gaioPrompt = (googleAiOverview.prompts || [])[idx]
                const inGoogleAiOverview = (gaioPrompt?.competitors || []).some(name => name === c.name)

                if (inChatgpt || inPerplexity || inGoogleAiMode || inGoogleAiOverview) {
                  acc.push({
                    idx: idx + 1,
                    text: p.text,
                    chatgpt: inChatgpt,
                    perplexity: inPerplexity,
                    googleAiMode: inGoogleAiMode,
                    googleAiOverview: inGoogleAiOverview,
                    chatgptSources: inChatgpt ? (p.chatgpt.sources || []) : [],
                    perplexitySources: inPerplexity ? (p.perplexity.sources || []) : [],
                    chatgptSnippet: inChatgpt ? (p.chatgpt.snippet || '') : '',
                    perplexitySnippet: inPerplexity ? (p.perplexity.snippet || '') : '',
                  })
                }
                return acc
              }, [])

              const platformCount = new Set()
              appearances.forEach(a => {
                if (a.chatgpt) platformCount.add('chatgpt')
                if (a.perplexity) platformCount.add('perplexity')
                if (a.googleAiMode) platformCount.add('gai')
                if (a.googleAiOverview) platformCount.add('gaio')
              })

              return { ...c, appearances, platformCount: platformCount.size, platforms: [...platformCount] }
            }).sort((a, b) => b.appearances.length - a.appearances.length)

            const topThreat = competitorDetails[0]
            const totalPlatforms = 4
            const yourPct = visibilityPct
            const topThreatPct = topThreat ? Math.min(100, Math.round((topThreat.appearances.length / Math.max(totalPrompts, 1)) * 100)) : 0
            const threatDelta = topThreatPct - yourPct
            const threatLevel = threatDelta > 20 ? 'critical' : threatDelta > 0 ? 'high' : yourPct < 30 ? 'medium' : 'low'

            const threatConfig = {
              critical: { label: locale === 'nl' ? 'Kritiek' : 'Critical', color: 'text-red-600', bg: 'bg-red-500', bgLight: 'bg-red-50', border: 'border-red-200', icon: Flame },
              high: { label: locale === 'nl' ? 'Hoog' : 'High', color: 'text-orange-600', bg: 'bg-orange-500', bgLight: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle },
              medium: { label: locale === 'nl' ? 'Gemiddeld' : 'Medium', color: 'text-amber-600', bg: 'bg-amber-500', bgLight: 'bg-amber-50', border: 'border-amber-200', icon: Target },
              low: { label: locale === 'nl' ? 'Laag' : 'Low', color: 'text-emerald-600', bg: 'bg-emerald-500', bgLight: 'bg-emerald-50', border: 'border-emerald-200', icon: Shield },
            }
            const threat = threatConfig[threatLevel]
            const ThreatIcon = threat.icon

            return (
            <div className="space-y-4">

              {/* ── Threat Level Banner ── */}
              {competitors.length > 0 && (
                <div className={`${threat.bgLight} ${threat.border} border rounded-xl p-5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${threat.bg} rounded-xl flex items-center justify-center`}>
                        <ThreatIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-bold ${threat.color}`}>
                            {locale === 'nl' ? 'Dreigingsniveau' : 'Threat Level'}: {threat.label}
                          </span>
                        </div>
                        <div className="text-[12px] text-slate-600 mt-0.5">
                          {locale === 'nl'
                            ? `${competitors.length} concurrent${competitors.length !== 1 ? 'en' : ''} gevonden in ${totalPrompts} AI-prompts`
                            : `${competitors.length} competitor${competitors.length !== 1 ? 's' : ''} found across ${totalPrompts} AI prompts`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                        {locale === 'nl' ? 'Jij vs #1 concurrent' : 'You vs #1 competitor'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[20px] font-bold ${yourPct >= topThreatPct ? 'text-emerald-600' : 'text-red-500'}`}>{yourPct}%</span>
                        <span className="text-[14px] text-slate-300">vs</span>
                        <span className={`text-[20px] font-bold ${topThreatPct > yourPct ? 'text-red-500' : 'text-slate-400'}`}>{topThreatPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Competitor Cards ── */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-slate-800">{t.competitors.title}</div>
                    <div className="text-[12px] text-slate-400 mt-0.5">
                      {locale === 'nl' ? 'Klik op een concurrent voor details' : 'Click a competitor for details'}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-300">{competitors.length} {locale === 'nl' ? 'gevonden' : 'found'}</span>
                </div>

                {competitorDetails.map((c, i) => {
                  const isExpanded = expandedCompetitor === i
                  const rank = i + 1
                  const isTopThreat = i === 0

                  return (
                  <div key={i}>
                    {/* Competitor Row */}
                    <div
                      className={`px-6 py-4 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onClick={() => setExpandedCompetitor(isExpanded ? null : i)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank + Medal */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${
                          isTopThreat ? 'bg-red-100 text-red-600' : rank <= 3 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isTopThreat ? <Crown className="w-4 h-4" /> : rank}
                        </div>

                        {/* Name + platform badges */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[14px] font-semibold ${isTopThreat ? 'text-red-700' : 'text-slate-800'}`}>{c.name}</span>
                            {isTopThreat && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold uppercase tracking-wider">
                                #1 {locale === 'nl' ? 'Bedreiging' : 'Threat'}
                              </span>
                            )}
                          </div>
                          {/* Platform indicators */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {c.platforms.includes('chatgpt') && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-semibold">ChatGPT</span>}
                            {c.platforms.includes('perplexity') && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold">Perplexity</span>}
                            {c.platforms.includes('gai') && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold">AI Mode</span>}
                            {c.platforms.includes('gaio') && <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 font-semibold">AI Overviews</span>}
                          </div>
                        </div>

                        {/* Mentions + expand */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className={`text-[18px] font-bold ${isTopThreat ? 'text-red-600' : 'text-slate-800'}`}>{c.appearances.length}×</div>
                            <div className="text-[10px] text-slate-400">
                              {locale === 'nl' ? `in ${totalPrompts} prompts` : `in ${totalPrompts} prompts`}
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Expanded: prompt details + sources */}
                    {isExpanded && (
                      <div className="bg-slate-50/80 border-t border-slate-100">
                        {/* FOMO bar */}
                        <div className="px-6 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100/50">
                          <div className="flex items-center gap-2">
                            <Flame className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-[12px] text-red-700 font-medium">
                              {locale === 'nl'
                                ? `${c.name} verschijnt in ${c.appearances.length} van jouw ${totalPrompts} prompts — dat is verkeer dat jij misloopt`
                                : `${c.name} appears in ${c.appearances.length} of your ${totalPrompts} prompts — that's traffic you're losing`}
                            </span>
                          </div>
                        </div>

                        {/* Prompt appearances */}
                        <div className="px-6 py-4 space-y-3">
                          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                            {locale === 'nl' ? `Verschijnt in deze prompts` : `Appears in these prompts`}
                          </div>

                          {c.appearances.map((a, j) => (
                            <div key={j} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              {/* Prompt header */}
                              <div className="px-4 py-3 flex items-start gap-3">
                                <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0 mt-0.5">
                                  {a.idx}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] text-slate-700 leading-relaxed">{a.text}</div>
                                  {/* Platform tags */}
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {a.chatgpt && (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ChatGPT
                                      </span>
                                    )}
                                    {a.perplexity && (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Perplexity
                                      </span>
                                    )}
                                    {a.googleAiMode && (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> AI Mode
                                      </span>
                                    )}
                                    {a.googleAiOverview && (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> AI Overviews
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Sources that mention this competitor */}
                              {(a.chatgptSources.length > 0 || a.perplexitySources.length > 0) && (
                                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
                                    {locale === 'nl' ? 'Bronpagina\'s van concurrent' : 'Competitor source pages'}
                                  </div>
                                  <div className="space-y-1.5">
                                    {[...new Set([...a.chatgptSources, ...a.perplexitySources])].slice(0, 5).map((src, k) => (
                                      <div key={k} className="flex items-center gap-2 group/src">
                                        <a href={src} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-800 no-underline hover:underline flex-1 min-w-0"
                                        >
                                          <ExternalLink className="w-3 h-3 shrink-0 text-indigo-400 group-hover/src:text-indigo-600" />
                                          <span className="truncate">{src.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70)}</span>
                                        </a>
                                        <Link href={lp(locale, `/tools/geo-audit?url=${encodeURIComponent(src)}`)}
                                          className="opacity-0 group-hover/src:opacity-100 transition-opacity inline-flex items-center gap-1 text-[9px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded px-2 py-0.5 hover:bg-violet-100 no-underline whitespace-nowrap shrink-0"
                                        >
                                          <ShieldCheck className="w-2.5 h-2.5" />
                                          {locale === 'nl' ? 'Scan pagina' : 'Scan page'}
                                        </Link>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          ))}
                        </div>

                        {/* Action CTA */}
                        <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-t border-indigo-100/50 flex items-center justify-between">
                          <div className="text-[12px] text-indigo-700">
                            {locale === 'nl'
                              ? `Wil je ${c.name} inhalen? Analyseer en optimaliseer je zichtbaarheid.`
                              : `Want to outrank ${c.name}? Analyze and optimize your visibility.`}
                          </div>
                          <Link href={lp(locale, '/dashboard/geo-analyse')} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition no-underline">
                            <Zap className="w-3 h-3" />
                            GEO Analyse
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })}

                {competitors.length === 0 && (
                  <div className="py-12 text-center">
                    <Shield className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                    <div className="text-[14px] font-semibold text-slate-700 mb-1">
                      {locale === 'nl' ? 'Geen concurrenten gedetecteerd' : 'No competitors detected'}
                    </div>
                    <div className="text-[12px] text-slate-400 max-w-xs mx-auto">
                      {locale === 'nl'
                        ? 'AI-platforms noemen geen concurrenten in jouw prompts. Dat is een goed teken!'
                        : 'AI platforms don\'t mention competitors in your prompts. That\'s a good sign!'}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Visibility Battle Card ── */}
              {topThreat && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="text-[15px] font-semibold text-slate-800 mb-1">{t.competitors.vsTitle}</div>
                  <div className="text-[12px] text-slate-400 mb-5">{t.competitors.vsSubtitle}</div>

                  {/* Battle bars */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-semibold text-slate-700">{activeCompany?.name || 'Jij'}</span>
                        <span className="text-[14px] font-bold text-emerald-600">{yourPct}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${yourPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-semibold text-red-600 flex items-center gap-1.5">
                          <Crown className="w-3 h-3" /> {topThreat.name}
                        </span>
                        <span className="text-[14px] font-bold text-red-600">{topThreatPct}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all duration-700" style={{ width: `${topThreatPct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  {threatDelta > 0 && (
                    <div className="p-4 bg-red-50 rounded-[10px] flex items-start gap-3" style={{ borderLeft: '3px solid #ef4444' }}>
                      <Flame className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[12px] font-semibold text-red-800 mb-0.5">
                          {locale === 'nl' ? 'Je verliest terrein' : 'You\'re losing ground'}
                        </div>
                        <div className="text-[12px] text-red-700 leading-relaxed">
                          {locale === 'nl'
                            ? `${topThreat.name} is ${threatDelta} procentpunt zichtbaarder dan jij in AI-antwoorden. Elke dag dat dit zo blijft, verlies je potentiële klanten.`
                            : `${topThreat.name} is ${threatDelta} percentage points more visible than you in AI responses. Every day this continues, you're losing potential customers.`}
                        </div>
                      </div>
                    </div>
                  )}
                  {threatDelta <= 0 && yourPct > 0 && (
                    <div className="p-4 bg-emerald-50 rounded-[10px] flex items-start gap-3" style={{ borderLeft: '3px solid #10b981' }}>
                      <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[12px] font-semibold text-emerald-800 mb-0.5">
                          {locale === 'nl' ? 'Je staat er goed voor' : 'You\'re in a strong position'}
                        </div>
                        <div className="text-[12px] text-emerald-700 leading-relaxed">
                          {locale === 'nl'
                            ? `Je bent zichtbaarder dan ${topThreat.name}. Blijf optimaliseren om deze voorsprong te behouden.`
                            : `You're more visible than ${topThreat.name}. Keep optimizing to maintain your lead.`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Rank Checks (full width, rich) ── */}
              {rankChecks.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[15px] font-semibold text-slate-800">{t.recentRankChecks}</div>
                      <div className="text-[12px] text-slate-400 mt-0.5">{locale === 'nl' ? `Gekoppeld aan ${activeCompany?.name || 'dit project'}` : `Linked to ${activeCompany?.name || 'this project'}`}</div>
                    </div>
                    <span className="text-[11px] text-slate-300">{rankChecks.length} checks</span>
                  </div>

                  {rankChecks.map((rc, i) => (
                    <div key={rc.id} className="px-6 py-4 group" style={{ borderBottom: i < rankChecks.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      {/* Keyword + positions */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[14px] font-semibold text-slate-800">{rc.keyword}</span>
                          {rc.serviceArea && <span className="text-[11px] text-slate-400 shrink-0">· {rc.serviceArea}</span>}
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-3">
                          {/* ChatGPT position */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] text-slate-500">ChatGPT</span>
                            {rc.chatgpt.found
                              ? <span className="text-[12px] font-bold text-emerald-600">#{rc.chatgpt.position}</span>
                              : <span className="text-[12px] font-medium text-red-400">{locale === 'nl' ? 'niet gevonden' : 'not found'}</span>
                            }
                          </div>
                          {/* Perplexity position */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-[11px] text-slate-500">Perplexity</span>
                            {rc.perplexity.found
                              ? <span className="text-[12px] font-bold text-indigo-600">#{rc.perplexity.position}</span>
                              : <span className="text-[12px] font-medium text-red-400">{locale === 'nl' ? 'niet gevonden' : 'not found'}</span>
                            }
                          </div>
                          <span className="text-[10px] text-slate-300">{new Date(rc.date).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                          {/* Delete button */}
                          <button
                            onClick={() => { if (confirm(locale === 'nl' ? `Rank check "${rc.keyword}" verwijderen?` : `Delete rank check "${rc.keyword}"?`)) deleteRankCheck(rc.id) }}
                            disabled={deletingRankCheck === rc.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 cursor-pointer bg-transparent border-none disabled:opacity-50"
                            title={locale === 'nl' ? 'Verwijderen' : 'Delete'}
                          >
                            {deletingRankCheck === rc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Who gets mentioned (competitors in AI responses) */}
                      {(() => {
                        const allMentioned = [...new Set([...(rc.chatgpt.mentioned || []), ...(rc.perplexity.mentioned || [])])]
                        if (allMentioned.length === 0) return null
                        return (
                          <div className="mt-1.5">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mr-2">
                              {locale === 'nl' ? 'Wél genoemd:' : 'Mentioned:'}
                            </span>
                            <span className="inline-flex flex-wrap gap-1">
                              {allMentioned.slice(0, 6).map((name, j) => (
                                <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{name}</span>
                              ))}
                              {allMentioned.length > 6 && <span className="text-[10px] text-slate-400">+{allMentioned.length - 6}</span>}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {rankChecks.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <div className="text-[14px] text-slate-500 mb-1">{locale === 'nl' ? 'Geen rank checks voor dit project' : 'No rank checks for this project'}</div>
                  <div className="text-[12px] text-slate-400">{locale === 'nl' ? 'Doe een rank check via de Rank Tracker tool om resultaten hier te zien.' : 'Do a rank check via the Rank Tracker tool to see results here.'}</div>
                </div>
              )}
            </div>
            )
          })()}


          {/* ════════════ AUDIT ════════════ */}
          {activeTab === 'audit' && (
            <AuditTab locale={locale} activeCompany={activeCompany} userEmail={userEmail} />
          )}
        </main>
      </div>
    </>
  )
}

// ── End of DashboardClient ──
