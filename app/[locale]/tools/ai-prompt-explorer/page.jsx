// app/[locale]/tools/ai-prompt-explorer/page.jsx
// AI Prompt Explorer — discover which AI prompts your customers use
// Cream/Lora/spark editorial design (matches AI Visibility, Brand Check, Rank Tracker, Prompt Discovery)
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import ToolsCrossSell from '@/app/components/ToolsCrossSell'

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const fmtVol = (v) => v == null ? '—' : v >= 1000 ? `${(v/1000).toFixed(1)}K` : `${v}`

function buildClusters(prompts) {
  const map = {}
  prompts.forEach(p => {
    const k = p.intentCluster || 'Overig'
    if (!map[k]) map[k] = { name: k, prompts: [], totalVolume: 0 }
    map[k].prompts.push(p)
    map[k].totalVolume += p.estimatedAiVolume || 0
  })
  return Object.values(map).map(c => {
    const intentCounts = {}
    const trendCounts = {}
    c.prompts.forEach(p => {
      intentCounts[p.intent] = (intentCounts[p.intent] || 0) + 1
      trendCounts[p.trendSignal] = (trendCounts[p.trendSignal] || 0) + 1
    })
    const dominantIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'informational'
    const dominantTrend = Object.entries(trendCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'stable'
    const avgDifficulty = Math.round(c.prompts.reduce((s, p) => s + (p.difficultyScore || 50), 0) / c.prompts.length)
    return { ...c, dominantIntent, dominantTrend, avgDifficulty }
  }).sort((a, b) => b.totalVolume - a.totalVolume)
}

// ═══════════════════════════════════════════════
// SVG ICONS (custom, lightweight)
// ═══════════════════════════════════════════════
const Icon = ({ d, className = 'w-5 h-5', size = 20 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{d}</svg>
)
const SearchIcon = ({ className }) => <Icon className={className} d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />
const GlobeIcon = ({ className }) => <Icon className={className} d={<><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>} />
const MapPinIcon = ({ className }) => <Icon className={className} d={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>} />
const BuildingIcon = ({ className }) => <Icon className={className} d={<><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></>} />
const SparklesIcon = ({ className }) => <Icon className={className} d={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>} />
const TrendingUpIcon = ({ className }) => <Icon className={className} d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>} />
const BarChartIcon = ({ className }) => <Icon className={className} d={<><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></>} />
const TargetIcon = ({ className }) => <Icon className={className} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>} />
const LayersIcon = ({ className }) => <Icon className={className} d={<><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22.54 12.43-1.42-.65-8.28 3.78a2 2 0 0 1-1.66 0l-8.28-3.78-1.42.65a1 1 0 0 0 0 1.82l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 .24-1.83Z"/></>} />
const Loader2Icon = ({ className }) => <Icon className={className} d={<path d="M21 12a9 9 0 1 1-6.219-8.56"/>} />
const CheckIcon = ({ className }) => <Icon className={className} d={<polyline points="20 6 9 17 4 12"/>} />
const XIcon = ({ className }) => <Icon className={className} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />
const ChevronDownIcon = ({ className }) => <Icon className={className} d={<path d="m6 9 6 6 6-6"/>} />
const ArrowRightIcon = ({ className }) => <Icon className={className} d={<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>} />
const LockIcon = ({ className }) => <Icon className={className} d={<><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />
const InfoIcon = ({ className }) => <Icon className={className} d={<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>} />

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════
function AnimNum({ value, dur = 700 }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const start = Date.now(), from = v
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / dur)
      setV(Math.round(from + (value - from) * t))
      if (t === 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [value])
  return <>{v.toLocaleString()}</>
}

function TrendBadge({ trend }) {
  if (trend === 'rising') return <span className="ape-trend ape-trend-rising">↑</span>
  if (trend === 'declining') return <span className="ape-trend ape-trend-declining">↓</span>
  return <span className="ape-trend ape-trend-stable">→</span>
}

function MiniTrend({ trend }) {
  return <TrendBadge trend={trend} />
}

function DiffBadge({ d, labels }) {
  const cls = d === 'easy' ? 'ape-diff-easy' : d === 'hard' ? 'ape-diff-hard' : 'ape-diff-medium'
  return <span className={`ape-diff ${cls}`}>{labels[d] || '—'}</span>
}

function StatusDot({ s }) {
  if (s === 'found') return <div className="ape-status ape-status-found" title="Gevonden"><CheckIcon className="w-3 h-3" /></div>
  if (s === 'not_found') return <div className="ape-status ape-status-missing" title="Niet gevonden"><XIcon className="w-3 h-3" /></div>
  return <div className="ape-status ape-status-unknown" title="Niet gescand"><span>—</span></div>
}

function VolBar({ vol, maxVol, blurred }) {
  const pct = maxVol ? Math.max(2, Math.round((vol / maxVol) * 100)) : 0
  if (blurred) {
    return (
      <div className="ape-volbar">
        <div className="ape-volbar-track"><div className="ape-volbar-fill ape-volbar-fill-muted" style={{ width: `${pct}%` }} /></div>
      </div>
    )
  }
  return (
    <div className="ape-volbar">
      <div className="ape-volbar-track"><div className="ape-volbar-fill" style={{ width: `${pct}%` }} /></div>
      <span className="ape-volbar-num">{fmtVol(vol)}</span>
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`ape-filter-btn${active ? ' ape-filter-btn-active' : ''}`}>
      {children}
    </button>
  )
}

function Loader({ keyword, mode = 'keyword', steps: propSteps, preparingText = 'Resultaten voorbereiden...' }) {
  const steps = propSteps || []
  const [stepIdx, setStepIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (stepIdx >= steps.length) return
    const timer = setTimeout(() => setStepIdx(s => s + 1), 5500 + Math.random() * 1500)
    return () => clearTimeout(timer)
  }, [stepIdx, steps.length])

  const pct = Math.min(95, Math.round((stepIdx / Math.max(steps.length, 1)) * 100))
  const currentHint = steps[stepIdx]?.hint

  return (
    <div className="ape-loader-card">
      <div className="ape-loader-track">
        <div className="ape-loader-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="ape-loader-body">
        <div className="ape-loader-text">
          <p className="ape-loader-step">{stepIdx < steps.length ? steps[stepIdx].label : preparingText}</p>
          <p className="ape-loader-keyword">{keyword}</p>
        </div>
        <div className="ape-loader-meta">
          <span className="ape-loader-elapsed">{elapsed}s</span>
          <span className="ape-loader-pct">{pct}%</span>
        </div>
      </div>
      {currentHint && (
        <div className="ape-loader-hint">
          <InfoIcon className="w-3.5 h-3.5" />
          <span>{currentHint}</span>
        </div>
      )}
    </div>
  )
}

function Methodology({ t }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ape-method">
      <button onClick={() => setOpen(!open)} className="ape-method-toggle">
        <div className="ape-method-icon"><InfoIcon className="w-4 h-4" /></div>
        <div className="ape-method-text">
          <p className="ape-method-title">{t.methTitle}</p>
          <p className="ape-method-sub">{t.methSub}</p>
        </div>
        <ChevronDownIcon className={`w-4 h-4 ape-method-chevron${open ? ' ape-method-chevron-open' : ''}`} />
      </button>
      {open && (
        <div className="ape-method-body">
          <p className="ape-method-disclaimer">{t.methDisclaimer}</p>
          {t.methSteps.map(([num, title, desc], i) => (
            <div key={i} className="ape-method-step">
              <span className="ape-method-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="ape-method-step-title">{title}</p>
                <p className="ape-method-step-desc">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClusterCard({ cluster, isOpen, onToggle, maxClusterVol, globalMaxVol, t }) {
  const c = cluster
  const pct = maxClusterVol ? Math.round((c.totalVolume / maxClusterVol) * 100) : 0
  return (
    <div className="ape-cluster">
      <button onClick={onToggle} className="ape-cluster-head">
        <ChevronDownIcon className={`w-4 h-4 ape-cluster-chevron${isOpen ? ' ape-cluster-chevron-open' : ''}`} />
        <div className="ape-cluster-meta">
          <p className="ape-cluster-name">{c.name}</p>
          <p className="ape-cluster-prompts-count">{c.prompts.length} {t?.prompts_label || 'prompts'}</p>
        </div>
        <div className="ape-cluster-volbar">
          <div className="ape-cluster-volbar-track"><div className="ape-cluster-volbar-fill" style={{ width: `${pct}%` }} /></div>
          <span className="ape-cluster-volbar-num">~{fmtVol(c.totalVolume)}{t?.perMonth || '/mnd'}</span>
        </div>
      </button>
      {isOpen && (
        <div className="ape-cluster-body">
          <p className="ape-cluster-summary">
            {c.prompts.length} {t?.variations || 'variaties'} · {t?.avgDiff || 'gem. moeilijkheid'}: <span className="ape-cluster-summary-val">{c.avgDifficulty}/100</span>
          </p>
          <div className="ape-cluster-prompt-list">
            {c.prompts.map((p, i) => (
              <div key={i} className="ape-cluster-prompt">
                <span className="ape-cluster-prompt-num">{i + 1}</span>
                <p className="ape-cluster-prompt-text">{p.text}</p>
                <MiniTrend trend={p.trendSignal} />
                <span className="ape-cluster-prompt-vol">~{fmtVol(p.estimatedAiVolume)}{t?.perMonth || '/mnd'}</span>
                <DiffBadge d={p.difficulty} labels={t?.diffLabels || {}} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
export default function PromptExplorer() {
  const locale = useLocale()
  const isEn = locale === 'en'

  const T = isEn ? {
    eyebrow: 'AI PROMPT EXPLORER',
    h1Pre: 'Which prompts do your',
    h1Em: 'potential customers',
    h1Post: 'use?',
    subtitle: 'See in 60 seconds what people ask ChatGPT, Perplexity and Google AI Mode about your industry.',
    dataLine: 'Based on 25+ years of Google search data and real-time AI platform monitoring',
    tabKeyword: 'Keyword', tabUrl: 'Website URL',
    phKeyword: 'Your keyword or niche', phUrl: 'https://yourwebsite.com',
    phBrand: 'Your company name', phPlace: 'City', phBranche: 'Your industry',
    ctaKeyword: 'Find AI prompts', ctaUrl: 'Analyse website & generate prompts', ctaLoading: 'Generating prompts...',
    belowCta: 'All prompts free in BETA. Takes about 60 seconds.',
    belowCtaUrl: 'We analyse your website, extract keywords, and generate 50+ targeted prompts.',
    rateLimitAnon: 'You\'ve used 2 free scans. Create a free account for more scans, optimisation tools and AI visibility analyses.',
    rateLimitUser: 'You\'ve already scanned today. You can scan again tomorrow, or upgrade for unlimited scans.',
    freeAccount: 'Create free account',
    errorTitle: 'Something went wrong', tryAgain: 'Try again',
    extractedKw: 'Extracted keywords', extractedUsed: (n) => `These keywords were used to generate ${n}+ targeted AI prompts`,
    sClusters: 'Clusters', sPrompts: 'Prompts', sHighOpp: 'High chance', sRising: 'Rising', sFound: 'Found', sVolTotal: 'AI vol. total',
    fClusters: 'Clusters', fList: 'List', fAll: 'All', fCommercial: 'Commercial', fInfo: 'Informational', fRising: 'Rising', fStable: 'Stable', fDeclining: 'Declining',
    prompts_label: 'prompts', variations: 'variations', avgDiff: 'avg. difficulty',
    qwTitle: 'Quick wins — easy prompts with high volume', qwDesc: 'These prompts have low competition and high volume. Ideal to start with.',
    diffEasy: 'High chance', diffMedium: 'Medium', diffHard: 'Difficult',
    compTitle: 'Top competitors in AI answers',
    posCol: 'Your position', posLocked: 'Log in to see',
    methTitle: 'How do we estimate AI search volumes?', methSub: 'Our methodology, transparent and honest',
    methSteps: [
      ['1', 'Google search volume as baseline', 'Every AI prompt has an equivalent Google keyword. We use the Google volume as a starting value.'],
      ['2', 'AI adoption factor', 'Depending on the industry, 15-25% of search queries now go to AI platforms. We apply this factor per keyword category.'],
      ['3', 'Intent Clustering', 'Prompts meaning the same thing are grouped. The combined volume shows the actual market demand.'],
      ['4', 'Trend correction', 'Growing topics get a higher weighting, declining topics a lower one. Based on 12-month trend data.'],
    ],
    methDisclaimer: 'These are estimates, not exact data. Real AI search volumes are not publicly available. Our methodology gives a reliable indication of relative demand.',
    seo1H2Pre: 'Which AI prompts does your',
    seo1H2Em: 'target audience',
    seo1H2Post: 'actually use?',
    seo1P1: 'More and more consumers skip Google and ask ChatGPT, Perplexity or Google AI Mode directly for recommendations. "What is the best accountant in Amsterdam?" or "Compare CRM systems for SMEs". These are the new search queries determining your visibility.',
    seo1P2: 'The AI Prompt Explorer shows exactly which prompts are relevant for your industry. Not generic keywords, but real questions people ask AI. With estimated volumes so you know where the opportunities lie.',
    seo2H2Pre: 'How does the AI',
    seo2H2Em: 'Prompt Explorer',
    seo2H2Post: 'work?',
    seo2Sub: 'From keyword to actionable AI prompt insights in 3 steps.',
    seo2Steps: [
      { title: 'Enter keyword or URL', desc: 'Enter a keyword from your industry, or let us analyse your website. We extract the most relevant keywords from your content, navigation and meta data.' },
      { title: 'AI generates 50+ prompts', desc: 'Our AI analyses the market, identifies commercial and informational search intents, and generates 50+ relevant prompts people ask ChatGPT, Perplexity and Google AI Mode.' },
      { title: 'Volume, trends & opportunities', desc: 'Each prompt gets an estimated AI search volume, trend signal and difficulty score. Grouped in intent clusters you immediately see where the biggest opportunities lie.' },
    ],
    finalH2Pre: 'Know the',
    finalH2Em: 'questions',
    finalH2Post: '.',
    finalH2Line2: 'Win the answers.',
    finalP: 'You now know which prompts your customers type. The next step is making sure you appear in the AI answers. Connect once and start optimising.',
    finalBtn: 'Generate free prompts',
    finalBtnSec: 'View Lite & Pro',
    faqTitle: 'Everything you want to know',
    faqEm: 'before you start.',
    faqSub: 'No bot answers, no marketing speak. Real explanations, written by our team.',
    faqEyebrow: 'QUESTIONS & ANSWERS',
    faqs: [
      { cat: 'product',   q: 'What is the AI Prompt Explorer?', a: 'The AI Prompt Explorer discovers which questions people ask ChatGPT, Perplexity and Google AI about your market. You see estimated search volumes, trends and how easy it is to appear in AI answers.' },
      { cat: 'product',   q: 'How does the website analysis work?', a: 'When you enter a URL, we analyse your website and review headings, navigation and content with AI. We extract 10 relevant keywords that serve as the basis for 50+ targeted prompts. Much more specific than a loose keyword.' },
      { cat: 'data',      q: 'How reliable are the AI search volumes?', a: 'We use Google Keyword Planner volumes as a baseline and apply an AI adoption factor per industry (15-25%). These are estimates, real AI volumes aren\'t publicly available. But the relative comparison between prompts is reliable.' },
      { cat: 'results',   q: 'What can I do with the results?', a: 'For each prompt you can click through to the GEO Audit. There you scan whether your page is found in AI answers and get concrete recommendations to improve your visibility.' },
      { cat: 'pricing',   q: 'How many prompts can I discover for free?', a: 'During the BETA phase all prompts and volumes are free. Create an account to save your results and start GEO optimisation right away.' },
    ],
    catLabels: { all: 'All', product: 'Product', data: 'Data', results: 'Results', pricing: 'Pricing' },
    helpHeading: 'Still got questions?',
    helpEm: 'We\'re here.',
    helpP: 'Reach us by email or book a 15-minute call. No sales pitch, just answers.',
    bookCall: 'Book a call',
    loaderUrlSteps: (kw) => [
      { id: 'scrape', label: `Scanning website: ${kw}`, hint: 'Reading content from your website' },
      { id: 'extract', label: 'Extracting relevant keywords', hint: null },
      { id: 'gen', label: 'Generating AI prompts', hint: null },
      { id: 'market', label: 'Analysing market', hint: null },
      { id: 'intent', label: 'Identifying commercial queries', hint: null },
      { id: 'cluster', label: 'Grouping intent clusters', hint: null },
      { id: 'volume', label: 'Estimating search volumes', hint: 'Based on Google search data' },
      { id: 'ai_vol', label: 'Calculating AI adoption factor', hint: 'AI adoption differs per industry (15-25%)' },
      { id: 'trend', label: 'Analysing trend signals', hint: null },
      { id: 'diff', label: 'Assessing competition & opportunities', hint: null },
      { id: 'rank', label: 'Ranking results', hint: null },
    ],
    loaderKwSteps: (kw) => [
      { id: 'gen', label: `Generating AI prompts for "${kw}"`, hint: 'Creating relevant prompts for your industry' },
      { id: 'market', label: 'Analysing market', hint: null },
      { id: 'intent', label: 'Identifying commercial queries', hint: null },
      { id: 'cluster', label: 'Grouping intent clusters', hint: null },
      { id: 'volume', label: 'Estimating search volumes', hint: 'Based on Google search data' },
      { id: 'ai_vol', label: 'Calculating AI adoption factor', hint: 'AI adoption differs per industry (15-25%)' },
      { id: 'trend', label: 'Analysing trend signals', hint: null },
      { id: 'diff', label: 'Assessing competition & opportunities', hint: null },
      { id: 'rank', label: 'Ranking results', hint: null },
    ],
    loaderPreparing: 'Preparing results...',
  } : {
    eyebrow: 'AI PROMPT EXPLORER',
    h1Pre: 'Welke prompts gebruiken jouw',
    h1Em: 'potentiële klanten',
    h1Post: '?',
    subtitle: 'Zie in 60 seconden wat mensen vragen aan ChatGPT, Perplexity en Google AI Mode over jouw branche.',
    dataLine: 'Gebaseerd op 25+ jaar Google-zoekdata en real-time AI-platform monitoring',
    tabKeyword: 'Zoekwoord', tabUrl: 'Website URL',
    phKeyword: 'Je zoekwoord of niche', phUrl: 'https://jouwwebsite.nl',
    phBrand: 'Je bedrijfsnaam', phPlace: 'Vestigingsplaats', phBranche: 'Jouw branche',
    ctaKeyword: 'Vind AI-prompts', ctaUrl: 'Analyseer website & genereer prompts', ctaLoading: 'Prompts genereren...',
    belowCta: 'Alle prompts gratis in BETA. Duurt circa 60 seconden.',
    belowCtaUrl: 'We analyseren je website, extraheren keywords, en genereren 50+ gerichte prompts.',
    rateLimitAnon: 'Je hebt 2 gratis scans gebruikt. Maak een gratis account aan voor meer scans, optimalisatie tools en AI-zichtbaarheidsanalyses.',
    rateLimitUser: 'Je hebt vandaag al een scan gedaan. Morgen kun je opnieuw scannen, of upgrade voor onbeperkte scans.',
    freeAccount: 'Gratis account aanmaken',
    errorTitle: 'Er ging iets mis', tryAgain: 'Probeer opnieuw',
    extractedKw: 'Geëxtraheerde keywords', extractedUsed: (n) => `Deze keywords zijn gebruikt om ${n}+ gerichte AI-prompts te genereren`,
    sClusters: 'Clusters', sPrompts: 'Prompts', sHighOpp: 'Hoge kans', sRising: 'Stijgend', sFound: 'Gevonden', sVolTotal: 'AI vol. totaal',
    fClusters: 'Clusters', fList: 'Lijst', fAll: 'Alle', fCommercial: 'Commercieel', fInfo: 'Informationeel', fRising: 'Stijgend', fStable: 'Stabiel', fDeclining: 'Dalend',
    prompts_label: 'prompts', variations: 'variaties', avgDiff: 'gem. moeilijkheid',
    qwTitle: 'Quick wins — makkelijke prompts met hoog volume', qwDesc: 'Deze prompts hebben weinig concurrentie en hoog volume. Ideaal om mee te starten.',
    diffEasy: 'Hoge kans', diffMedium: 'Medium', diffHard: 'Moeilijk',
    compTitle: 'Top concurrenten in AI-antwoorden',
    posCol: 'Jouw positie', posLocked: 'Log in om te zien',
    methTitle: 'Hoe schatten we AI-zoekvolumes?', methSub: 'Onze methodologie, transparant en eerlijk',
    methSteps: [
      ['1', 'Google-zoekvolume als basis', 'Elke AI-prompt heeft een equivalent Google-zoekwoord. We gebruiken het Google-volume als startwaarde.'],
      ['2', 'AI-adoptie factor', 'Afhankelijk van de branche gaat 15-25% van de zoekopdrachten nu naar AI-platformen. We passen deze factor toe per keyword-categorie.'],
      ['3', 'Intent Clustering', 'Prompts die hetzelfde bedoelen worden gegroepeerd. Het gecombineerde volume toont de werkelijke marktvraag.'],
      ['4', 'Trendcorrectie', 'Groeiende onderwerpen krijgen een hogere weging, dalende een lagere. Op basis van 12-maanden trenddata.'],
    ],
    methDisclaimer: 'Dit zijn schattingen, geen exacte data. Echte AI-zoekvolumes zijn niet openbaar beschikbaar. Onze methodologie geeft een betrouwbare indicatie van de relatieve vraag.',
    seo1H2Pre: 'Welke AI-prompts gebruikt jouw',
    seo1H2Em: 'doelgroep',
    seo1H2Post: 'werkelijk?',
    seo1P1: 'Steeds meer consumenten slaan Google over en vragen ChatGPT, Perplexity of Google AI Mode rechtstreeks om aanbevelingen. "Wat is de beste accountant in Amsterdam?" of "Vergelijk CRM-systemen voor het MKB". Dit zijn de nieuwe zoekopdrachten die je zichtbaarheid bepalen.',
    seo1P2: 'De AI Prompt Explorer toont precies welke prompts relevant zijn voor jouw branche. Geen generieke zoekwoorden, maar echte vragen die mensen aan AI stellen. Met geschatte volumes zodat je weet waar de kansen liggen.',
    seo2H2Pre: 'Hoe werkt de AI',
    seo2H2Em: 'Prompt Explorer',
    seo2H2Post: '?',
    seo2Sub: 'Van zoekwoord naar bruikbare AI-prompt inzichten in 3 stappen.',
    seo2Steps: [
      { title: 'Voer zoekwoord of URL in', desc: 'Vul een zoekwoord in uit jouw branche, of laat ons je website analyseren. We extraheren de meest relevante keywords uit je content, navigatie en meta-data.' },
      { title: 'AI genereert 50+ prompts', desc: 'Onze AI analyseert de markt, identificeert commerciële en informationele zoekintents, en genereert 50+ relevante prompts die mensen stellen aan ChatGPT, Perplexity en Google AI Mode.' },
      { title: 'Volume, trends & kansen', desc: 'Elke prompt krijgt een geschat AI-zoekvolume, trendsignaal en moeilijkheidsscore. Gegroepeerd in intent clusters zie je meteen waar de grootste kansen liggen.' },
    ],
    finalH2Pre: 'Ken de',
    finalH2Em: 'vragen',
    finalH2Post: '.',
    finalH2Line2: 'Win de antwoorden.',
    finalP: 'Je weet nu welke prompts klanten typen. De volgende stap is zorgen dat je in de AI-antwoorden verschijnt. Eenmalig koppelen en starten met optimaliseren.',
    finalBtn: 'Gratis prompts genereren',
    finalBtnSec: 'Bekijk Lite & Pro',
    faqTitle: 'Alles wat je wilt weten',
    faqEm: 'voor je begint.',
    faqSub: 'Geen bot-antwoorden, geen marketingpraat. De echte uitleg, geschreven door ons team.',
    faqEyebrow: 'VRAGEN & ANTWOORDEN',
    faqs: [
      { cat: 'product',   q: 'Wat is de AI Prompt Explorer?', a: 'De AI Prompt Explorer ontdekt welke vragen mensen stellen aan ChatGPT, Perplexity en Google AI over jouw markt. Je ziet geschatte zoekvolumes, trends en hoe makkelijk het is om in AI-antwoorden te verschijnen.' },
      { cat: 'product',   q: 'Hoe werkt de website-analyse?', a: 'Als je een URL invult, analyseren we je website en bekijken headings, navigatie en content met AI. Hieruit extraheren we 10 relevante keywords die vervolgens als basis dienen voor 50+ gerichte prompts. Veel specifieker dan een los zoekwoord.' },
      { cat: 'data',      q: 'Hoe betrouwbaar zijn de AI-zoekvolumes?', a: 'We gebruiken Google Keyword Planner volumes als basis en passen een AI-adoptiefactor toe per branche (15-25%). Dit zijn schattingen, echte AI-volumes zijn niet openbaar. Maar de relatieve vergelijking tussen prompts is betrouwbaar.' },
      { cat: 'results',   q: 'Wat kan ik doen met de resultaten?', a: 'Bij elke prompt kun je doorklikken naar de GEO Audit. Daar scan je of jouw pagina gevonden wordt in AI-antwoorden en krijg je concrete aanbevelingen om je zichtbaarheid te verbeteren.' },
      { cat: 'pricing',   q: 'Hoeveel prompts kan ik gratis ontdekken?', a: 'Tijdens de BETA fase zijn alle prompts en volumes gratis beschikbaar. Maak een account aan om je resultaten op te slaan en direct aan de slag te gaan met GEO optimalisatie.' },
    ],
    catLabels: { all: 'Alles', product: 'Product', data: 'Data', results: 'Resultaten', pricing: 'Prijzen' },
    helpHeading: 'Nog vragen?',
    helpEm: 'We helpen je.',
    helpP: 'Stuur ons een mail of plan een gesprek van 15 minuten. Geen verkooppraat, gewoon antwoorden.',
    bookCall: 'Plan een gesprek',
    loaderUrlSteps: (kw) => [
      { id: 'scrape', label: `Website scannen: ${kw}`, hint: 'Content van je website inlezen' },
      { id: 'extract', label: 'Relevante keywords extraheren', hint: null },
      { id: 'gen', label: 'AI-prompts genereren', hint: null },
      { id: 'market', label: 'Markt analyseren', hint: null },
      { id: 'intent', label: 'Commerciële vragen identificeren', hint: null },
      { id: 'cluster', label: 'Intent clusters groeperen', hint: null },
      { id: 'volume', label: 'Zoekvolumes schatten', hint: 'Gebaseerd op Google-zoekdata' },
      { id: 'ai_vol', label: 'AI-adoptie factor berekenen', hint: 'AI-adoptie verschilt per branche (15-25%)' },
      { id: 'trend', label: 'Trend signalen analyseren', hint: null },
      { id: 'diff', label: 'Concurrentie & kansen beoordelen', hint: null },
      { id: 'rank', label: 'Resultaten rangschikken', hint: null },
    ],
    loaderKwSteps: (kw) => [
      { id: 'gen', label: `AI-prompts genereren voor "${kw}"`, hint: 'Relevante prompts aanmaken voor jouw branche' },
      { id: 'market', label: 'Markt analyseren', hint: null },
      { id: 'intent', label: 'Commerciële vragen identificeren', hint: null },
      { id: 'cluster', label: 'Intent clusters groeperen', hint: null },
      { id: 'volume', label: 'Zoekvolumes schatten', hint: 'Gebaseerd op Google-zoekdata' },
      { id: 'ai_vol', label: 'AI-adoptie factor berekenen', hint: 'AI-adoptie verschilt per branche (15-25%)' },
      { id: 'trend', label: 'Trend signalen analyseren', hint: null },
      { id: 'diff', label: 'Concurrentie & kansen beoordelen', hint: null },
      { id: 'rank', label: 'Resultaten rangschikken', hint: null },
    ],
    loaderPreparing: 'Resultaten voorbereiden...',
  }

  // ─── State ───
  const [keyword, setKeyword] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [bedrijfsnaam, setBedrijfsnaam] = useState('')
  const [place, setPlace] = useState('')
  const [branche, setBranche] = useState('')
  const [inputMode, setInputMode] = useState('keyword')
  const [loading, setLoading] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [extractedKeywords, setExtractedKeywords] = useState([])
  const [companyName, setCompanyName] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('clusters')
  const [openClusters, setOpenClusters] = useState(new Set())
  const [intentF, setIntentF] = useState('all')
  const [trendF, setTrendF] = useState('all')
  const [userTier, setUserTier] = useState('anonymous')
  const [user, setUser] = useState(null)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [rateLimitMsg, setRateLimitMsg] = useState(null)
  const [openFaq, setOpenFaq] = useState(0)
  const [faqCategory, setFaqCategory] = useState('all')
  const resultsRef = useRef(null)

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          const isAdmin = session.user.email === 'imre@onlinelabs.nl' || session.user.email === 'hallo@onlinelabs.nl'
          if (isAdmin) {
            setUserTier('pro')
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_status')
              .eq('id', session.user.id)
              .single()
            const isPro = ['active', 'canceling'].includes(profile?.subscription_status)
            setUserTier(isPro ? 'pro' : 'free')
          }
        }
      } catch (e) {
        // No auth, stay anonymous
      }
    }
    checkAuth()
  }, [])

  // BETA: All features free
  const TIER = { anonymous: { maxPrompts: 999, maxVolumes: 999 }, free: { maxPrompts: 999, maxVolumes: 999 }, pro: { maxPrompts: 999, maxVolumes: 999 } }

  // Sticky bar
  useEffect(() => {
    if (!prompts.length) { setShowStickyBar(false); return }
    const el = resultsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setShowStickyBar(entry.isIntersecting), { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [prompts])

  const tier = TIER[userTier]
  const clusters = useMemo(() => buildClusters(prompts), [prompts])
  const maxClusterVol = useMemo(() => clusters.length ? Math.max(...clusters.map(c => c.totalVolume)) : 0, [clusters])
  const maxVol = useMemo(() => prompts.length ? Math.max(...prompts.map(p => p.estimatedAiVolume)) : 0, [prompts])
  const hasInput = inputMode === 'url' ? websiteUrl.trim() : keyword.trim()

  const checkRateLimit = () => {
    if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].some(h => window.location.hostname.includes(h))) return true
    if (userTier === 'pro') return true
    try {
      const key = 'pe_scans'
      const stored = JSON.parse(localStorage.getItem(key) || '{"count":0,"date":""}')
      const today = new Date().toISOString().split('T')[0]

      if (userTier === 'anonymous') {
        if (stored.count >= 2) {
          setRateLimitMsg(T.rateLimitAnon)
          return false
        }
        localStorage.setItem(key, JSON.stringify({ count: stored.count + 1, date: today }))
        return true
      } else {
        if (stored.date === today && stored.count >= 1) {
          setRateLimitMsg(T.rateLimitUser)
          return false
        }
        const newCount = stored.date === today ? stored.count + 1 : 1
        localStorage.setItem(key, JSON.stringify({ count: newCount, date: today }))
        return true
      }
    } catch (e) {
      return true
    }
  }

  const discover = async () => {
    if (!hasInput) return
    setRateLimitMsg(null)
    if (!checkRateLimit()) return
    setLoading(true); setHasSearched(true); setOpenClusters(new Set()); setError(null)
    setPrompts([]); setExtractedKeywords([]); setCompanyName('')

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)

    try {
      const body = inputMode === 'url'
        ? { url: websiteUrl.trim(), brandName: bedrijfsnaam.trim() || null, location: place.trim() || null, industry: branche.trim() || null, locale }
        : { keyword: keyword.trim(), brandName: bedrijfsnaam.trim() || null, location: place.trim() || null, industry: branche.trim() || null, locale }

      const res = await fetch('/api/prompt-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || (isEn ? 'Something went wrong. Please try again.' : 'Er ging iets mis. Probeer het opnieuw.'))
        setLoading(false)
        return
      }

      const mapped = (data.prompts || []).map((p, i) => ({
        id: i,
        text: p.text,
        intent: p.intent || 'informational',
        intentCluster: p.intentCluster || 'Overig',
        trendSignal: p.trendSignal || 'stable',
        estimatedAiVolume: p.estimatedAiVolume || 0,
        difficulty: p.difficulty || 'medium',
        difficultyScore: p.difficultyScore || 50,
        yourStatus: p.mentioned ? 'found' : p.competitors?.length ? 'not_found' : 'not_scanned',
        topCompetitors: p.competitors || [],
      }))

      setPrompts(mapped)
      setExtractedKeywords(data.extractedKeywords || [])
      setCompanyName(data.companyName || bedrijfsnaam || '')
      if (data.sessionToken) {
        try { localStorage.setItem('teun_claim_token', data.sessionToken) } catch {}
      }

      const cls = buildClusters(mapped)
      setOpenClusters(new Set(cls.slice(0, 2).map(c => c.name)))

    } catch (err) {
      setError(isEn ? 'Connection error. Check your internet and try again.' : 'Verbindingsfout. Controleer je internetverbinding en probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCluster = (name) => {
    setOpenClusters(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  const stats = useMemo(() => {
    if (!prompts.length) return null
    return {
      total: prompts.length, clusters: clusters.length,
      highOpp: prompts.filter(p => p.difficulty === 'easy').length,
      found: prompts.filter(p => p.yourStatus === 'found').length,
      rising: prompts.filter(p => p.trendSignal === 'rising').length,
      totalVol: prompts.reduce((s, p) => s + (p.estimatedAiVolume || 0), 0),
    }
  }, [prompts, clusters])

  const opportunities = useMemo(() =>
    prompts.filter(p => p.difficulty === 'easy' && p.yourStatus !== 'found').sort((a, b) => b.estimatedAiVolume - a.estimatedAiVolume).slice(0, 5),
    [prompts])

  const topCompetitors = useMemo(() => {
    const c = {}
    prompts.forEach(p => (p.topCompetitors || []).forEach(n => { c[n] = (c[n] || 0) + 1 }))
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [prompts])

  const claimSuffix = () => {
    if (typeof window === 'undefined') return ''
    const t = localStorage.getItem('teun_claim_token')
    return t ? `?st=${t}` : ''
  }

  // FAQ filter
  const faqCounts = useMemo(() => ({
    all: T.faqs.length,
    product: T.faqs.filter(i => i.cat === 'product').length,
    data: T.faqs.filter(i => i.cat === 'data').length,
    results: T.faqs.filter(i => i.cat === 'results').length,
    pricing: T.faqs.filter(i => i.cat === 'pricing').length,
  }), [T.faqs])

  const filteredFaq = faqCategory === 'all' ? T.faqs : T.faqs.filter(i => i.cat === faqCategory)

  return (
    <div className="tool-page ape-page">
      <div className="ape-wrap">

        {/* Hero */}
        <div className="tool-hero">
          <div className="tool-eyebrow">{T.eyebrow}</div>
          <h1>
            {T.h1Pre} <em>{T.h1Em}</em>{T.h1Post}
          </h1>
          <p className="tool-hero-sub">{T.subtitle}</p>
          <div className="tool-trust-pills">
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#10B981' }} />ChatGPT</span>
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#6366F1' }} />Perplexity</span>
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#3B82F6' }} />Google AI Mode</span>
          </div>
          <p className="ape-data-line">{T.dataLine}</p>
        </div>

        {/* Form card */}
        <div className="ape-form" id="ape-form">
          {/* Mode toggle */}
          <div className="ape-mode-toggle">
            <button
              onClick={() => setInputMode('keyword')}
              className={inputMode === 'keyword' ? 'active' : ''}
            >
              <SearchIcon className="w-3.5 h-3.5" /> {T.tabKeyword}
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={inputMode === 'url' ? 'active' : ''}
            >
              <GlobeIcon className="w-3.5 h-3.5" /> {T.tabUrl}
            </button>
          </div>

          {/* Main input */}
          <div className="ape-input-row ape-input-main">
            {inputMode === 'keyword' ? <SearchIcon className="ape-input-icon" /> : <GlobeIcon className="ape-input-icon" />}
            <input
              value={inputMode === 'url' ? websiteUrl : keyword}
              onChange={e => inputMode === 'url' ? setWebsiteUrl(e.target.value) : setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && discover()}
              placeholder={inputMode === 'url' ? T.phUrl : T.phKeyword}
              className="ape-input"
            />
          </div>

          {/* Secondary inputs */}
          <div className="ape-form-grid">
            <div className="ape-input-row">
              <BuildingIcon className="ape-input-icon" />
              <input value={bedrijfsnaam} onChange={e => setBedrijfsnaam(e.target.value)} placeholder={T.phBrand} className="ape-input" />
            </div>
            <div className="ape-input-row">
              <MapPinIcon className="ape-input-icon" />
              <input value={place} onChange={e => setPlace(e.target.value)} placeholder={T.phPlace} className="ape-input" />
            </div>
            <div className="ape-input-row">
              <LayersIcon className="ape-input-icon" />
              <input value={branche} onChange={e => setBranche(e.target.value)} placeholder={T.phBranche} className="ape-input" />
            </div>
          </div>

          <button onClick={discover} disabled={loading} className="teun-scan-btn ape-submit">
            {loading ? (
              <><Loader2Icon className="w-5 h-5 ape-spin" /> {T.ctaLoading}</>
            ) : (
              <><SparklesIcon className="w-5 h-5" /> {inputMode === 'url' ? T.ctaUrl : T.ctaKeyword}</>
            )}
          </button>

          <p className="ape-form-hint">{inputMode === 'url' ? T.belowCtaUrl : T.belowCta}</p>
        </div>

        {/* Rate limit */}
        {rateLimitMsg && (
          <div className="ape-rate-limit">
            <p>{rateLimitMsg}</p>
            {userTier === 'anonymous' && (
              <a href={`/signup${claimSuffix()}`} className="teun-scan-btn ape-rate-btn">
                {T.freeAccount} <ArrowRightIcon className="w-4 h-4" />
              </a>
            )}
            {userTier === 'free' && (
              <a href={isEn ? '/en/pricing' : '/pricing'} className="teun-scan-btn ape-rate-btn">
                {isEn ? 'Upgrade to Pro for unlimited scans' : 'Upgrade naar Pro voor onbeperkt scannen'} <ArrowRightIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Loader */}
        {loading && (
          <Loader
            keyword={inputMode === 'url' ? websiteUrl : keyword}
            mode={inputMode}
            steps={inputMode === 'url' ? T.loaderUrlSteps(websiteUrl) : T.loaderKwSteps(keyword)}
            preparingText={T.loaderPreparing}
          />
        )}

        {/* Error */}
        {!loading && error && (
          <div className="tool-error ape-error">
            <XIcon className="w-5 h-5 ape-error-icon" />
            <div>
              <strong>{T.errorTitle}</strong>
              <p>{error}</p>
              <button onClick={() => { setError(null); setHasSearched(false) }} className="ape-error-link">{T.tryAgain}</button>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && prompts.length > 0 && (
          <div ref={resultsRef} className="ape-results">

            {/* Stats */}
            <div className="ape-stats-grid">
              {[
                { l: T.sClusters, v: stats.clusters },
                { l: T.sPrompts, v: stats.total },
                { l: T.sHighOpp, v: stats.highOpp, accent: 'success' },
                { l: T.sRising, v: stats.rising, accent: 'success' },
                { l: T.sFound, v: stats.found, s: `/${stats.total}` },
                { l: T.sVolTotal, v: stats.totalVol, p: '~', s: isEn ? '/mo' : '/mnd' },
              ].map((s, i) => (
                <div key={i} className="ape-stat">
                  <p className={`ape-stat-num${s.accent === 'success' ? ' ape-stat-num-success' : ''}`}>
                    {s.p || ''}<AnimNum value={s.v} />{s.s || ''}
                  </p>
                  <p className="ape-stat-label">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Extracted keywords (URL mode) */}
            {inputMode === 'url' && extractedKeywords.length > 0 && (
              <div className="ape-extracted">
                <div className="ape-extracted-head">
                  <div className="ape-extracted-icon"><GlobeIcon className="w-4 h-4" /></div>
                  <div>
                    <p className="ape-extracted-title">{T.extractedKw}</p>
                    <p className="ape-extracted-url">{websiteUrl}</p>
                  </div>
                </div>
                <div className="ape-extracted-tags">
                  {extractedKeywords.map(kw => <span key={kw} className="ape-tag">{kw}</span>)}
                </div>
                <p className="ape-extracted-meta">{T.extractedUsed(prompts.length)}</p>
              </div>
            )}

            {/* Quick wins */}
            {opportunities.length > 0 && (
              <div className="ape-quickwins">
                <div className="ape-quickwins-head">
                  <div className="ape-quickwins-icon"><TargetIcon className="w-4 h-4" /></div>
                  <p className="ape-quickwins-title">{T.qwTitle}</p>
                </div>
                <p className="ape-quickwins-desc">{T.qwDesc}</p>
                <div className="ape-quickwins-list">
                  {opportunities.map((p, i) => (
                    <div key={i} className="ape-quickwin">
                      <span className="ape-quickwin-num">{i + 1}</span>
                      <p className="ape-quickwin-text">{p.text}</p>
                      <MiniTrend trend={p.trendSignal} />
                      <span className="ape-quickwin-vol">~{fmtVol(p.estimatedAiVolume)}{isEn ? '/mo' : '/mnd'}</span>
                      <DiffBadge d="easy" labels={{ easy: T.diffEasy, medium: T.diffMedium, hard: T.diffHard }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="ape-filters">
              <div className="ape-view-toggle">
                {[['clusters', T.fClusters], ['list', T.fList]].map(([v, l]) => (
                  <button key={v} onClick={() => setViewMode(v)} className={viewMode === v ? 'active' : ''}>{l}</button>
                ))}
              </div>
              <div className="ape-filter-group">
                {[['all', T.fAll], ['commercial', T.fCommercial], ['informational', T.fInfo]].map(([v, l]) => (
                  <FilterBtn key={v} active={intentF === v} onClick={() => setIntentF(v)}>{l}</FilterBtn>
                ))}
              </div>
              <div className="ape-filter-group">
                {[['all', T.fAll], ['rising', `↑ ${T.fRising}`], ['stable', `→ ${T.fStable}`], ['declining', `↓ ${T.fDeclining}`]].map(([v, l]) => (
                  <FilterBtn key={v} active={trendF === v} onClick={() => setTrendF(v)}>{l}</FilterBtn>
                ))}
              </div>
            </div>

            {/* Cluster view */}
            {viewMode === 'clusters' && (
              <div className="ape-clusters">
                {clusters.filter(c => (intentF === 'all' || c.dominantIntent === intentF) && (trendF === 'all' || c.dominantTrend === trendF)).map(c => (
                  <ClusterCard
                    key={c.name}
                    cluster={c}
                    isOpen={openClusters.has(c.name)}
                    onToggle={() => toggleCluster(c.name)}
                    maxClusterVol={maxClusterVol}
                    globalMaxVol={maxVol}
                    t={{
                      prompts_label: T.prompts_label,
                      variations: T.variations,
                      avgDiff: T.avgDiff,
                      perMonth: isEn ? '/mo' : '/mnd',
                      diffLabels: { easy: T.diffEasy, medium: T.diffMedium, hard: T.diffHard }
                    }}
                  />
                ))}
              </div>
            )}

            {/* List view */}
            {viewMode === 'list' && (
              <div className="ape-list">
                <div className="ape-list-head">
                  <span>AI-prompt</span>
                  <span>Tr</span>
                  <span>St</span>
                  <span>AI vol.</span>
                  <span>{isEn ? 'Chance' : 'Kans'}</span>
                  <span>{T.posCol}</span>
                </div>
                {prompts.filter(p => (intentF === 'all' || p.intent === intentF) && (trendF === 'all' || p.trendSignal === trendF)).map(p => (
                  <div key={p.id} className="ape-list-row">
                    <div className="ape-list-prompt">
                      <p className="ape-list-prompt-text">{p.text}</p>
                      <p className="ape-list-prompt-cluster">{p.intentCluster}</p>
                    </div>
                    <div><MiniTrend trend={p.trendSignal} /></div>
                    <div><StatusDot s={p.yourStatus} /></div>
                    <div><VolBar vol={p.estimatedAiVolume} maxVol={maxVol} blurred={false} /></div>
                    <div><DiffBadge d={p.difficulty} labels={{ easy: T.diffEasy, medium: T.diffMedium, hard: T.diffHard }} /></div>
                    <div className="ape-list-pos">
                      <span className="ape-list-pos-pill"><LockIcon className="w-2.5 h-2.5" />—</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FOMO CTA — volume-driven */}
            {!user ? (
              <div className="ape-fomo">
                <div className="ape-fomo-mascot">
                  <Image src="/teun-ai-mascotte.png" alt="Teun.ai mascotte" width={120} height={150} />
                </div>
                <div className="ape-fomo-body">
                  <p className="ape-fomo-headline">
                    {isEn
                      ? <>~{fmtVol(stats?.totalVol || 0)} times a month, customers ask AI these questions. <em>Are you in the answer?</em></>
                      : <>~{fmtVol(stats?.totalVol || 0)} keer per maand stellen klanten deze vragen aan AI. <em>Sta jij in het antwoord?</em></>}
                  </p>
                  <p className="ape-fomo-sub">
                    {isEn
                      ? `You now know which ${stats?.total || 0} prompts your customers use. But does ChatGPT, Perplexity or Google AI actually recommend ${companyName || 'you'}? Create a free account and scan your position on all 4 platforms.`
                      : `Je weet nu welke ${stats?.total || 0} prompts jouw klanten gebruiken. Maar beveelt ChatGPT, Perplexity of Google AI ook daadwerkelijk ${companyName || 'jou'} aan? Maak een gratis account aan en scan je positie op alle 4 platforms.`}
                  </p>
                  <a href={`/signup${claimSuffix()}`} className="teun-scan-btn ape-fomo-btn">
                    {isEn ? 'Check my AI positions' : 'Check mijn AI-posities'} <ArrowRightIcon className="w-4 h-4" />
                  </a>
                  <p className="ape-fomo-hint">{isEn ? 'Free · No credit card · Takes 2 minutes' : 'Gratis · Geen creditcard · Duurt 2 minuten'}</p>
                </div>
              </div>
            ) : (
              <div className="ape-fomo">
                <div className="ape-fomo-mascot">
                  <Image src="/teun-ai-mascotte.png" alt="Teun.ai mascotte" width={120} height={150} />
                </div>
                <div className="ape-fomo-body">
                  <p className="ape-fomo-headline">
                    {isEn
                      ? <>~{fmtVol(stats?.totalVol || 0)} times a month — does AI recommend <em>{companyName || 'you'}</em>?</>
                      : <>~{fmtVol(stats?.totalVol || 0)} keer per maand — beveelt AI <em>{companyName || 'jou'}</em> aan?</>}
                  </p>
                  <p className="ape-fomo-sub">
                    {isEn
                      ? 'Go to your dashboard to select prompts and scan your AI visibility on ChatGPT, Perplexity and Google AI.'
                      : 'Ga naar je dashboard om prompts te selecteren en je AI-zichtbaarheid te scannen op ChatGPT, Perplexity en Google AI.'}
                  </p>
                  <a href={isEn ? '/en/dashboard' : '/dashboard'} className="teun-scan-btn ape-fomo-btn">
                    {isEn ? 'Go to dashboard' : 'Ga naar dashboard'} <ArrowRightIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Top competitors */}
            {topCompetitors.length > 0 && (
              <div className="ape-competitors">
                <div className="ape-competitors-head">
                  <div className="ape-competitors-icon"><BarChartIcon className="w-4 h-4" /></div>
                  <p className="ape-competitors-title">{T.compTitle}</p>
                </div>
                <div className="ape-competitors-list">
                  {topCompetitors.map(([name, count], i) => (
                    <div key={i} className="ape-competitor">
                      <span className={`ape-competitor-rank${i === 0 ? ' ape-competitor-rank-top' : ''}`}>{i + 1}</span>
                      <span className="ape-competitor-name">{name}</span>
                      <span className="ape-competitor-count">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Methodology t={T} />

            <ToolsCrossSell currentTool="ai-prompt-explorer" locale={locale} />
          </div>
        )}
      </div>

      {/* Sticky bar */}
      {showStickyBar && !user && prompts.length > 0 && (
        <div className="ape-sticky">
          <div className="ape-sticky-inner">
            <div className="ape-sticky-text">
              <Image src="/teun-ai-mascotte.png" alt="Teun" width={32} height={40} className="ape-sticky-mascot" />
              <p>
                {isEn
                  ? <>~{fmtVol(stats?.totalVol || 0)}× per month — is <em>{companyName || 'your business'}</em> in the AI answer?</>
                  : <>~{fmtVol(stats?.totalVol || 0)}× per maand — staat <em>{companyName || 'jouw bedrijf'}</em> in het AI-antwoord?</>}
              </p>
            </div>
            <a href={`/signup${claimSuffix()}`} className="teun-scan-btn ape-sticky-btn">
              {isEn ? 'Check now' : 'Nu checken'} <ArrowRightIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* SEO content (pre-search) */}
      {!hasSearched && !loading && (
        <>
          {/* SEO intro */}
          <section className="tool-seo-intro">
            <div className="tool-wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
              <h2>{T.seo1H2Pre} <em>{T.seo1H2Em}</em> {T.seo1H2Post}</h2>
              <p>{T.seo1P1}</p>
              <p>{T.seo1P2}</p>
            </div>
          </section>

          {/* SEO how — 3 steps */}
          <section className="tool-seo-how">
            <div className="tool-seo-how-wrap">
              <h2>{T.seo2H2Pre} <em>{T.seo2H2Em}</em> {T.seo2H2Post}</h2>
              <p className="tool-seo-how-sub">{T.seo2Sub}</p>
              <div className="tool-seo-how-grid">
                {T.seo2Steps.map((item, i) => (
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

          {/* Final CTA */}
          <section className="teun-final" aria-labelledby="ape-final-heading">
            <div className="wrap">
              <h2 id="ape-final-heading">
                {T.finalH2Pre} <em>{T.finalH2Em}</em>{T.finalH2Post}<br />{T.finalH2Line2}
              </h2>
              <p>{T.finalP}</p>
              <div className="btns">
                <button
                  onClick={() => document.getElementById('ape-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="btn-primary"
                >
                  {T.finalBtn} <span aria-hidden="true">→</span>
                </button>
                <a href={isEn ? '/en/pricing' : '/pricing'} className="btn-secondary">
                  {T.finalBtnSec}
                </a>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="teun-faq" id="faq" aria-labelledby="ape-faq-heading">
            <div className="wrap">
              <div className="teun-faq-head">
                <div className="teun-faq-eyebrow">{T.faqEyebrow}</div>
                <h2 id="ape-faq-heading">
                  {T.faqTitle}<br /><em>{T.faqEm}</em>
                </h2>
                <p className="sub">{T.faqSub}</p>
              </div>

              <div className="teun-faq-cats" role="tablist">
                {[
                  { id: 'all',     count: faqCounts.all },
                  { id: 'product', count: faqCounts.product },
                  { id: 'data',    count: faqCounts.data },
                  { id: 'results', count: faqCounts.results },
                  { id: 'pricing', count: faqCounts.pricing }
                ].map(({ id, count }) => (
                  <button
                    key={id}
                    className={faqCategory === id ? 'active' : ''}
                    onClick={() => { setFaqCategory(id); setOpenFaq(0) }}
                    role="tab"
                    aria-selected={faqCategory === id}
                  >
                    {T.catLabels[id]}
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
                      <span className="cat-chip">{T.catLabels[item.cat]}</span>
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
                  <h3>{T.helpHeading} <em>{T.helpEm}</em></h3>
                  <p>{T.helpP}</p>
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
                    {T.bookCall}
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
