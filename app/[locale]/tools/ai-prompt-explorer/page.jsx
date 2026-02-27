'use client'

import { useState, useEffect, useMemo, useRef } from "react";
import { useLocale } from 'next-intl';
import Image from 'next/image';

// ═══════════════════════════════════════════════
// DATA — all prompts come from /api/prompt-discovery
// ═══════════════════════════════════════════════

const fmtVol = (v) => v == null ? "—" : v >= 1000 ? `${(v/1000).toFixed(1)}K` : `${v}`;

function buildClusters(prompts) {
  const map = {};
  prompts.forEach(p => {
    const k = p.intentCluster || "Overig";
    if (!map[k]) map[k] = { name: k, prompts: [], totalVolume: 0 };
    map[k].prompts.push(p);
    map[k].totalVolume += p.estimatedAiVolume || 0;
  });
  return Object.values(map).map(c => {
    const n = c.prompts.length;
    c.avgDifficulty = Math.round(c.prompts.reduce((s, p) => s + p.difficultyScore, 0) / n);
    c.dominantIntent = c.prompts.filter(p => p.intent === "commercial").length >= n / 2 ? "commercial" : "informational";
    const t = { rising: 0, stable: 0, declining: 0 };
    c.prompts.forEach(p => t[p.trendSignal || "stable"]++);
    c.dominantTrend = Object.entries(t).sort((a, b) => b[1] - a[1])[0][0];
    c.highOpp = c.prompts.filter(p => p.difficulty === "easy").length;
    return c;
  }).sort((a, b) => b.totalVolume - a.totalVolume);
}

// ═══════════════════════════════════════════════
// SVG ICONS (matching Lucide outlined style)
// ═══════════════════════════════════════════════

const Icon = ({ d, className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const SearchIcon = ({ className }) => <Icon className={className} d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
const GlobeIcon = ({ className }) => <Icon className={className} d={<><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>} />;
const MapPinIcon = ({ className }) => <Icon className={className} d={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>} />;
const BuildingIcon = ({ className }) => <Icon className={className} d={<><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></>} />;
const SparklesIcon = ({ className }) => <Icon className={className} d={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>} />;
const TrendingUpIcon = ({ className }) => <Icon className={className} d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>} />;
const BarChartIcon = ({ className }) => <Icon className={className} d={<><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></>} />;
const TargetIcon = ({ className }) => <Icon className={className} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>} />;
const LayersIcon = ({ className }) => <Icon className={className} d={<><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22.54 12.43-1.42-.65-8.28 3.78a2 2 0 0 1-1.66 0l-8.28-3.78-1.42.65a1 1 0 0 0 0 1.82l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 .24-1.83Z"/></>} />;
const Loader2Icon = ({ className }) => <Icon className={className} d={<path d="M21 12a9 9 0 1 1-6.219-8.56"/>} />;
const CheckIcon = ({ className }) => <Icon className={className} d={<polyline points="20 6 9 17 4 12"/>} />;
const XIcon = ({ className }) => <Icon className={className} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />;
const ChevronDownIcon = ({ className }) => <Icon className={className} d={<path d="m6 9 6 6 6-6"/>} />;
const ChevronRightIcon = ({ className }) => <Icon className={className} d={<path d="m9 18 6-6-6-6"/>} />;
const ArrowRightIcon = ({ className }) => <Icon className={className} d={<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>} />;
const LockIcon = ({ className }) => <Icon className={className} d={<><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />;
const InfoIcon = ({ className }) => <Icon className={className} d={<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>} />;

// ═══════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════

function AnimNum({ value, dur = 700 }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    if (!value) { setD(0); return; }
    let start = Date.now(), frame;
    const go = () => { const p = Math.min((Date.now() - start) / dur, 1); setD(Math.round((1 - Math.pow(1 - p, 3)) * value)); if (p < 1) frame = requestAnimationFrame(go); };
    frame = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{d}</>;
}

function TrendBadge({ trend }) {
  const cfg = { rising: ["bg-emerald-50 text-emerald-700 border-emerald-200", "Stijgend"], declining: ["bg-red-50 text-red-600 border-red-200", "Dalend"], stable: ["bg-slate-50 text-slate-500 border-slate-200", "Stabiel"] };
  const [cls, label] = cfg[trend] || cfg.stable;
  const arrow = trend === "rising" ? "↑" : trend === "declining" ? "↓" : "→";
  return <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 font-semibold ${cls} border rounded-full`}>{arrow} {label}</span>;
}

function MiniTrend({ trend }) {
  const d = { rising: "M2 14 L8 10 L14 7 L20 3", stable: "M2 8 L8 9 L14 7 L20 8", declining: "M2 3 L8 7 L14 10 L20 14" };
  const c = { rising: "#10b981", stable: "#94a3b8", declining: "#ef4444" };
  return <svg width="24" height="16" viewBox="0 0 22 16" fill="none"><path d={d[trend] || d.stable} stroke={c[trend] || c.stable} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DiffBadge({ d, labels }) {
  const lb = labels || { easy: 'Hoge kans', medium: 'Medium', hard: 'Moeilijk' };
  const cfg = { easy: ["bg-emerald-50 text-emerald-700 border-emerald-200", "bg-emerald-500", lb.easy], hard: ["bg-red-50 text-red-700 border-red-200", "bg-red-500", lb.hard], medium: ["bg-amber-50 text-amber-700 border-amber-200", "bg-amber-500", lb.medium] };
  const [cls, dot, label] = cfg[d] || cfg.medium;
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls} border`}><span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{label}</span>;
}

function StatusDot({ s }) {
  if (s === "found") return <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center" title="Gevonden"><CheckIcon className="w-3 h-3 text-emerald-600" /></div>;
  if (s === "not_found") return <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center" title="Niet gevonden"><XIcon className="w-3 h-3 text-red-500" /></div>;
  return <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center" title="Niet gescand"><span className="text-slate-400 text-[10px]">—</span></div>;
}

function VolBar({ vol, maxVol, blurred }) {
  const pct = maxVol > 0 ? Math.min((vol / maxVol) * 100, 100) : 0;
  if (blurred) return (
    <div className="relative">
      <div className="flex items-center gap-2 filter blur-[6px] select-none">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-400 rounded-full" style={{ width: `${pct}%` }} /></div>
        <span className="text-[11px] font-bold text-slate-700 w-10 text-right tabular-nums">{fmtVol(vol)}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 flex items-center gap-1"><LockIcon className="w-2.5 h-2.5" /> PRO</span></div>
    </div>
  );
  return <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#292956] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div><span className="text-[11px] font-bold text-slate-700 w-10 text-right tabular-nums">{fmtVol(vol)}</span></div>;
}

function FilterBtn({ active, onClick, children }) {
  return <button onClick={onClick} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${active ? "bg-[#292956] text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}>{children}</button>;
}

// ═══════════════════════════════════════════════
// LOADER — GEO Audit style
// ═══════════════════════════════════════════════

function Loader({ keyword, mode = "keyword", steps: propSteps, preparingText = 'Resultaten voorbereiden...' }) {
  const steps = propSteps;
  const intervals = mode === "url" ? [4000, 3000, 6000, 8000, 6000, 5000, 5000, 7000, 6000, 5000, 5000, 4000] : [9000, 8000, 7000, 7000, 8000, 7000, 7000, 6000, 5000];

  const [stepIdx, setStepIdx] = useState(0);
  const [doneSteps, setDoneSteps] = useState([]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { const t = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    // Stop 1 step before the end — last step completes when API returns
    if (stepIdx >= steps.length - 1) return;
    const t = setTimeout(() => { setDoneSteps(prev => [...prev, steps[stepIdx].id]); setStepIdx(s => s + 1); }, intervals[stepIdx] || 500);
    return () => clearTimeout(t);
  }, [stepIdx]);

  // Cap at 92% so it never sits at 100% waiting
  const pct = Math.min(Math.round((stepIdx / steps.length) * 100), 92);
  const currentHint = steps[stepIdx]?.hint || null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60 overflow-hidden">
      <div className="h-1.5 bg-slate-100">
        <div className="h-full transition-all duration-700 ease-out rounded-r-full bg-[#292956]" style={{ width: `${pct}%` }} />
      </div>
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-base font-semibold text-slate-800">{stepIdx < steps.length ? steps[stepIdx].label : preparingText}</p>
            <p className="text-xs text-slate-400 mt-0.5">{keyword}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{elapsed}s</span>
            <span className="text-xl font-bold text-slate-800">{pct}%</span>
          </div>
        </div>

        {currentHint && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <Loader2Icon className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" />
            <span className="text-xs text-slate-500">{currentHint}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
          {steps.map((step, i) => {
            const done = doneSteps.includes(step.id);
            const active = i === stepIdx && !done;
            return (
              <div key={step.id} className="flex items-center gap-2.5 py-1">
                {done ? <CheckIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : active ? <Loader2Icon className="w-4 h-4 text-slate-500 animate-spin flex-shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0" />}
                <span className={`text-xs transition-colors ${done ? 'text-emerald-600' : active ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// METHODOLOGY
// ═══════════════════════════════════════════════

function Methodology({ t }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><InfoIcon className="w-5 h-5" /></div>
          <div className="text-left"><h3 className="font-semibold text-slate-900">{t.methTitle}</h3><p className="text-sm text-slate-500">{t.methSub}</p></div>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 pt-0">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5">
            <p className="text-sm text-slate-700 leading-relaxed">{t.methDisclaimer}</p>
            {t.methSteps.map(([n, title, desc]) => (
              <div key={n} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#292956] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
                <div><h4 className="font-semibold text-slate-900 text-sm mb-1">{title}</h4><p className="text-sm text-slate-600 leading-relaxed">{desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// CLUSTER CARD
// ═══════════════════════════════════════════════

function ClusterCard({ cluster, isOpen, onToggle, maxClusterVol, globalMaxVol, maxVolumes, t }) {
  const c = cluster;
  const pct = maxClusterVol > 0 ? Math.min((c.totalVolume / maxClusterVol) * 100, 100) : 0;
  const diffLabels = t?.diffLabels;
  return (
    <div className={`bg-white rounded-xl border ${isOpen ? "border-slate-300 shadow-sm" : "border-slate-200"} overflow-hidden transition-all`}>
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition cursor-pointer">
        <ChevronRightIcon className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`} />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 text-sm">{c.name}</h3>
            <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{c.prompts.length} {t?.prompts_label || 'prompts'}</span>
            <TrendBadge trend={c.dominantTrend} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 max-w-48 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#292956] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
            <span className="text-xs font-bold text-slate-700 tabular-nums">~{fmtVol(c.totalVolume)}{t?.perMonth || '/mnd'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {c.highOpp > 0 && <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">{c.highOpp} {t?.oppTitle || 'kansen'}</span>}
          <MiniTrend trend={c.dominantTrend} />
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-slate-100">
          <div className="px-5 py-3 bg-slate-50 text-[11px] text-slate-500">
            {c.prompts.length} {t?.variations || 'variaties'} · {t?.avgDiff || 'gem. moeilijkheid'}: <span className="font-semibold">{c.avgDifficulty}/100</span>
          </div>
          {c.prompts.map((p, i) => (
            <div key={p.id} className="grid grid-cols-[1fr_36px_28px_120px_90px] gap-2 px-5 py-2.5 border-t border-slate-50 items-center hover:bg-slate-50/50 transition text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-slate-300 w-4 text-right">{i + 1}.</span>
                <p className="text-slate-700 text-xs leading-snug truncate">{p.text}</p>
              </div>
              <div className="flex justify-center"><MiniTrend trend={p.trendSignal} /></div>
              <div className="flex justify-center"><StatusDot s={p.yourStatus} /></div>
              <div><VolBar vol={p.estimatedAiVolume} maxVol={globalMaxVol} blurred={false} /></div>
              <div><DiffBadge d={p.difficulty} labels={diffLabels} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// FAQ (Teun.ai style — white cards with border)
// ═══════════════════════════════════════════════

function FAQ({ items }) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button onClick={() => setOpenIdx(openIdx === i ? -1 : i)} className="w-full flex items-center justify-between p-6 text-left cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-semibold text-slate-900">{item.q}</span>
            </div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${openIdx === i ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          {openIdx === i && <div className="px-6 pb-6 pt-0"><p className="text-slate-600 pl-10 leading-relaxed">{item.a}</p></div>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

export default function PromptExplorer() {
  const locale = useLocale();
  const isEn = locale === 'en';

  // ═══════════════════════════════════════════════
  // TRANSLATIONS
  // ═══════════════════════════════════════════════
  const T = isEn ? {
    badge: 'AI Prompt Explorer',
    h1: <>Which prompts do your<br className="hidden sm:inline" /> potential customers use?</>,
    subtitle: <>See in <strong>60 seconds</strong> what people ask ChatGPT,<br className="hidden sm:inline" /> Perplexity and Google AI Mode about your industry.</>,
    dataLine: 'Based on 25+ years of Google search data and real-time AI platform monitoring',
    tabKeyword: 'Keyword', tabUrl: 'Website URL',
    phKeyword: 'Your keyword or niche', phUrl: 'https://yourwebsite.com',
    phBrand: 'Your company name', phPlace: 'City (optional)', phBranche: 'Your industry',
    ctaKeyword: 'Find AI prompts', ctaUrl: 'Analyse website & generate prompts', ctaLoading: 'Generating prompts...',
    belowCta: 'All prompts free in BETA. Takes about 60 seconds.',
    belowCtaUrl: 'We analyse your website, extract keywords, and generate 50+ targeted prompts.',
    rateLimitAnon: 'You\'ve used 2 free scans. Create a free account for more scans, optimisation tools and AI visibility analyses.',
    rateLimitUser: 'You\'ve already scanned today. You can scan again tomorrow, or upgrade for unlimited scans.',
    freeAccount: 'Create free account',
    errorTitle: 'Something went wrong', tryAgain: 'Try again',
    extractedKw: 'Extracted keywords', extractedUsed: (n) => `These keywords were used to generate ${n}+ targeted AI prompts`,
    // Stats
    sClusters: 'Clusters', sPrompts: 'Prompts', sHighOpp: 'High chance', sRising: 'Rising', sFound: 'Found', sVolTotal: 'AI vol. total',
    // Filters
    fClusters: 'Clusters', fList: 'List', fAll: 'All', fCommercial: 'Commercial', fInfo: 'Informational', fRising: 'Rising', fStable: 'Stable', fDeclining: 'Declining',
    // Cluster view
    prompts_label: 'prompts', variations: 'variations', avgDiff: 'avg. difficulty',
    // Quick wins
    qwTitle: 'Quick wins - easy prompts with high volume', qwDesc: 'These prompts have low competition and high volume. Ideal to start with.',
    // Opportunities
    oppTitle: 'opportunities',
    // Difficulty badges
    diffEasy: 'High chance', diffMedium: 'Medium', diffHard: 'Difficult',
    // Competitors
    compTitle: 'Top competitors in AI answers',
    // CTA
    ctaBoxTitle: 'Want a complete AI visibility analysis?',
    ctaBoxDesc: 'Create an account and get started with GEO optimisation right away. Combine brand perception with page-level GEO analysis. Match AI prompts to your best pages with targeted optimisation per page.',
    ctaBoxBtn: 'Create free account',
    // Methodology
    methTitle: 'How do we estimate AI search volumes?', methSub: 'Our methodology, transparent and honest',
    methSteps: [
      ['1', 'Google search volume as baseline', 'Every AI prompt has an equivalent Google keyword. We use the Google volume as a starting value.'],
      ['2', 'AI adoption factor', 'Depending on the industry, 15-25% of search queries now go to AI platforms. We apply this factor per keyword category.'],
      ['3', 'Intent Clustering', 'Prompts meaning the same thing are grouped. The combined volume shows the actual market demand.'],
      ['4', 'Trend correction', 'Growing topics get a higher weighting, declining topics a lower one. Based on 12-month trend data.'],
    ],
    methDisclaimer: 'These are estimates, not exact data. Real AI search volumes are not publicly available. Our methodology gives a reliable indication of relative demand.',
    // SEO sections
    seo1Title: <>Which AI prompts does <br /><span className="text-violet-600">your target audience actually use?</span></>,
    seo1P1: 'More and more consumers skip Google and ask ChatGPT, Perplexity or Google AI Mode directly for recommendations. "What is the best accountant in Amsterdam?" or "Compare CRM systems for SMEs". These are the new search queries determining your visibility.',
    seo1P2: 'The AI Prompt Explorer shows exactly which prompts are relevant for your industry. Not generic keywords, but real questions people ask AI. With estimated volumes so you know where the opportunities lie.',
    seo2Title: 'How does the AI Prompt Explorer work?',
    seo2Sub: 'From keyword to actionable AI prompt insights in 3 steps.',
    seo2Steps: [
      { title: 'Enter keyword or URL', desc: 'Enter a keyword from your industry, or let us analyse your website. We extract the most relevant keywords from your content, navigation and meta data.' },
      { title: 'AI generates 50+ prompts', desc: 'Our AI analyses the Dutch market, identifies commercial and informational search intents, and generates 50+ relevant prompts people ask ChatGPT, Perplexity and Google AI Mode.' },
      { title: 'Volume, trends & opportunities', desc: 'Each prompt gets an estimated AI search volume, trend signal and difficulty score. Grouped in intent clusters you immediately see where the biggest opportunities lie.' },
    ],
    seo3Title: <>From prompts to <br /><span className="text-violet-600">AI visibility</span></>,
    seo3P: 'Knowing which prompts your target audience uses is step one. The next step is ensuring your business actually appears in those AI answers. With the free GEO Audit from Teun.ai you scan your page for AI visibility, test live on Perplexity whether you\'re found, and get concrete recommendations.',
    seo3Cta: 'Start free GEO Audit',
    // Features
    feat1: 'Intent Clusters', feat1d: 'Prompts meaning the same thing are grouped. This shows the actual market demand, not fragmented pieces.',
    feat2: 'AI Search Volume', feat2d: 'Each prompt gets an estimated monthly volume. Based on Google search data and AI adoption factors per industry.',
    feat3: 'Difficulty Score', feat3d: 'See at a glance where the opportunities lie. Low competition + high volume = your best chances for AI visibility.',
    feat4: 'Trend Signals', feat4d: 'See which topics are rising, stable or declining. Focus on growing prompts for maximum impact.',
    // FAQ
    faqTitle: 'Frequently asked questions',
    faqs: [
      { q: 'What is the AI Prompt Explorer?', a: 'The AI Prompt Explorer discovers which questions people ask ChatGPT, Perplexity and Google AI about your market. You see estimated search volumes, trends and how easy it is to appear in AI answers.' },
      { q: 'How does the website analysis work?', a: 'When you enter a URL, we analyse your website and review headings, navigation and content with AI. We extract 10 relevant keywords that serve as the basis for 50+ targeted prompts. Much more specific than a loose keyword.' },
      { q: 'How reliable are the AI search volumes?', a: 'We use Google Keyword Planner volumes as a baseline and apply an AI adoption factor per industry (15-25%). These are estimates, real AI volumes aren\'t publicly available. But the relative comparison between prompts is reliable.' },
      { q: 'What can I do with the results?', a: 'For each prompt you can click through to the GEO Audit. There you scan whether your page is found in AI answers and get concrete recommendations to improve your visibility.' },
      { q: 'How many prompts can I discover for free?', a: 'During the BETA phase, all prompts and volumes are freely available. Create an account to save your results and get started with GEO optimisation right away.' },
    ],
    // Loader
    loaderUrlSteps: (kw) => [
      { id: 'scrape', label: `Scanning website: ${kw}`, hint: 'Reading your website content' },
      { id: 'parse', label: 'Analysing structure: headings, meta, navigation', hint: null },
      { id: 'extract', label: 'Extracting relevant keywords', hint: 'Identifying the most important topics' },
      { id: 'gen', label: 'Generating AI prompts based on keywords', hint: 'Creating 50+ targeted prompts' },
      { id: 'market', label: 'Adding Dutch market context', hint: null },
      { id: 'intent', label: 'Identifying commercial queries', hint: null },
      { id: 'cluster', label: 'Grouping intent clusters', hint: null },
      { id: 'volume', label: 'Estimating search volumes', hint: 'Based on Google search data and AI adoption' },
      { id: 'ai_vol', label: 'Calculating AI adoption factor per industry', hint: 'AI adoption differs per industry (15-25%)' },
      { id: 'trend', label: 'Analysing trend signals', hint: null },
      { id: 'diff', label: 'Assessing competition & opportunities', hint: null },
      { id: 'rank', label: 'Ranking results', hint: null },
    ],
    loaderKwSteps: (kw) => [
      { id: 'gen', label: `Generating AI prompts for "${kw}"`, hint: 'Creating relevant prompts for your industry' },
      { id: 'market', label: 'Analysing Dutch market', hint: null },
      { id: 'intent', label: 'Identifying commercial queries', hint: null },
      { id: 'cluster', label: 'Grouping intent clusters', hint: null },
      { id: 'volume', label: 'Estimating search volumes', hint: 'Based on Google search data and AI adoption' },
      { id: 'ai_vol', label: 'Calculating AI adoption factor', hint: 'AI adoption differs per industry (15-25%)' },
      { id: 'trend', label: 'Analysing trend signals', hint: null },
      { id: 'diff', label: 'Assessing competition & opportunities', hint: null },
      { id: 'rank', label: 'Ranking results', hint: null },
    ],
    loaderPreparing: 'Preparing results...',
  } : {
    badge: 'AI Prompt Explorer',
    h1: <>Welke prompts gebruiken<br className="hidden sm:inline" /> jouw potentiële klanten?</>,
    subtitle: <>Zie in <strong>60 seconden</strong> wat mensen vragen aan ChatGPT,<br className="hidden sm:inline" /> Perplexity en Google AI Mode over jouw branche.</>,
    dataLine: 'Gebaseerd op 25+ jaar Google-zoekdata en real-time AI-platform monitoring',
    tabKeyword: 'Zoekwoord', tabUrl: 'Website URL',
    phKeyword: 'Je zoekwoord of niche', phUrl: 'https://jouwwebsite.nl',
    phBrand: 'Je bedrijfsnaam', phPlace: 'Vestigingsplaats (optioneel)', phBranche: 'Jouw branche',
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
    qwTitle: 'Quick wins - makkelijke prompts met hoog volume', qwDesc: 'Deze prompts hebben weinig concurrentie en hoog volume. Ideaal om mee te starten.',
    oppTitle: 'kansen',
    diffEasy: 'Hoge kans', diffMedium: 'Medium', diffHard: 'Moeilijk',
    compTitle: 'Top concurrenten in AI-antwoorden',
    ctaBoxTitle: 'Wil je een complete AI-zichtbaarheidsanalyse?',
    ctaBoxDesc: 'Account aanmaken en je kan direct aan de slag met GEO optimalisatie. Combineer merkperceptie met pagina-niveau GEO analyse. Match AI-prompts aan je beste pagina\'s met gerichte optimalisatie per pagina.',
    ctaBoxBtn: 'Gratis account aanmaken',
    methTitle: 'Hoe schatten we AI-zoekvolumes?', methSub: 'Onze methodologie, transparant en eerlijk',
    methSteps: [
      ['1', 'Google-zoekvolume als basis', 'Elke AI-prompt heeft een equivalent Google-zoekwoord. We gebruiken het Google-volume als startwaarde.'],
      ['2', 'AI-adoptie factor', 'Afhankelijk van de branche gaat 15-25% van de zoekopdrachten nu naar AI-platformen. We passen deze factor toe per keyword-categorie.'],
      ['3', 'Intent Clustering', 'Prompts die hetzelfde bedoelen worden gegroepeerd. Het gecombineerde volume toont de werkelijke marktvraag.'],
      ['4', 'Trendcorrectie', 'Groeiende onderwerpen krijgen een hogere weging, dalende een lagere. Op basis van 12-maanden trenddata.'],
    ],
    methDisclaimer: 'Dit zijn schattingen, geen exacte data. Echte AI-zoekvolumes zijn niet openbaar beschikbaar. Onze methodologie geeft een betrouwbare indicatie van de relatieve vraag.',
    seo1Title: <>Welke AI-prompts gebruikt <br /><span className="text-violet-600">jouw doelgroep werkelijk?</span></>,
    seo1P1: 'Steeds meer consumenten slaan Google over en vragen ChatGPT, Perplexity of Google AI Mode rechtstreeks om aanbevelingen. "Wat is de beste accountant in Amsterdam?" of "Vergelijk CRM-systemen voor het MKB". Dit zijn de nieuwe zoekopdrachten die je zichtbaarheid bepalen.',
    seo1P2: 'De AI Prompt Explorer toont precies welke prompts relevant zijn voor jouw branche. Geen generieke zoekwoorden, maar echte vragen die mensen aan AI stellen. Met geschatte volumes zodat je weet waar de kansen liggen.',
    seo2Title: 'Hoe werkt de AI Prompt Explorer?',
    seo2Sub: 'Van zoekwoord naar bruikbare AI-prompt inzichten in 3 stappen.',
    seo2Steps: [
      { title: 'Voer zoekwoord of URL in', desc: 'Vul een zoekwoord in uit jouw branche, of laat ons je website analyseren. We extraheren de meest relevante keywords uit je content, navigatie en meta-data.' },
      { title: 'AI genereert 50+ prompts', desc: 'Onze AI analyseert de Nederlandse markt, identificeert commerciële en informationele zoekintents, en genereert 50+ relevante prompts die mensen stellen aan ChatGPT, Perplexity en Google AI Mode.' },
      { title: 'Volume, trends & kansen', desc: 'Elke prompt krijgt een geschat AI-zoekvolume, trendsignaal en moeilijkheidsscore. Gegroepeerd in intent clusters zie je meteen waar de grootste kansen liggen.' },
    ],
    seo3Title: <>Van prompts naar <br /><span className="text-violet-600">AI-zichtbaarheid</span></>,
    seo3P: 'Weten welke prompts je doelgroep gebruikt is stap één. De volgende stap is zorgen dat jouw bedrijf ook daadwerkelijk verschijnt in die AI-antwoorden. Met de gratis GEO Audit van Teun.ai scan je je pagina op AI-zichtbaarheid, test je live op Perplexity of je gevonden wordt, en krijg je concrete aanbevelingen.',
    seo3Cta: 'Gratis GEO Audit starten',
    feat1: 'Intent Clusters', feat1d: 'Prompts die hetzelfde bedoelen worden gegroepeerd. Zo zie je de werkelijke marktvraag, niet losse fragmenten.',
    feat2: 'AI-zoekvolume', feat2d: 'Elke prompt krijgt een geschat maandelijks volume. Gebaseerd op Google-zoekdata en AI-adoptiefactoren per branche.',
    feat3: 'Moeilijkheidsscore', feat3d: 'Zie in één oogopslag waar de kansen liggen. Weinig concurrentie + hoog volume = jouw beste kansen op AI-zichtbaarheid.',
    feat4: 'Trend Signalen', feat4d: 'Zie welke onderwerpen stijgen, stabiel zijn of dalen. Focus op groeiende prompts voor maximaal effect.',
    faqTitle: 'Veelgestelde vragen',
    faqs: [
      { q: 'Wat is de AI Prompt Explorer?', a: 'De AI Prompt Explorer ontdekt welke vragen mensen stellen aan ChatGPT, Perplexity en Google AI over jouw markt. Je ziet geschatte zoekvolumes, trends en hoe makkelijk het is om in AI-antwoorden te verschijnen.' },
      { q: 'Hoe werkt de website-analyse?', a: 'Als je een URL invult, analyseren we je website en bekijken headings, navigatie en content met AI. Hieruit extraheren we 10 relevante keywords die vervolgens als basis dienen voor 50+ gerichte prompts. Veel specifieker dan een los zoekwoord.' },
      { q: 'Hoe betrouwbaar zijn de AI-zoekvolumes?', a: 'We gebruiken Google Keyword Planner volumes als basis en passen een AI-adoptiefactor toe per branche (15-25%). Dit zijn schattingen, echte AI-volumes zijn niet openbaar. Maar de relatieve vergelijking tussen prompts is betrouwbaar.' },
      { q: 'Wat kan ik doen met de resultaten?', a: 'Bij elke prompt kun je doorklikken naar de GEO Audit. Daar scan je of jouw pagina gevonden wordt in AI-antwoorden en krijg je concrete aanbevelingen om je zichtbaarheid te verbeteren.' },
      { q: 'Hoeveel prompts kan ik gratis ontdekken?', a: 'Tijdens de BETA fase zijn alle prompts en volumes gratis beschikbaar. Maak een account aan om je resultaten op te slaan en direct aan de slag te gaan met GEO optimalisatie.' },
    ],
    loaderUrlSteps: (kw) => [
      { id: 'scrape', label: `Website scannen: ${kw}`, hint: 'Content van je website inlezen' },
      { id: 'parse', label: 'Structuur analyseren: headings, meta, navigatie', hint: null },
      { id: 'extract', label: 'Relevante keywords extraheren', hint: 'De belangrijkste onderwerpen identificeren' },
      { id: 'gen', label: 'AI-prompts genereren op basis van keywords', hint: '50+ gerichte prompts aanmaken' },
      { id: 'market', label: 'Nederlandse markt context toevoegen', hint: null },
      { id: 'intent', label: 'Commerciële vragen identificeren', hint: null },
      { id: 'cluster', label: 'Intent clusters groeperen', hint: null },
      { id: 'volume', label: 'Zoekvolumes schatten', hint: 'Gebaseerd op Google-zoekdata en AI-adoptie' },
      { id: 'ai_vol', label: 'AI-adoptie factor berekenen per branche', hint: 'AI-adoptie verschilt per branche (15-25%)' },
      { id: 'trend', label: 'Trend signalen analyseren', hint: null },
      { id: 'diff', label: 'Concurrentie & kansen beoordelen', hint: null },
      { id: 'rank', label: 'Resultaten rangschikken', hint: null },
    ],
    loaderKwSteps: (kw) => [
      { id: 'gen', label: `AI-prompts genereren voor "${kw}"`, hint: 'Relevante prompts aanmaken voor jouw branche' },
      { id: 'market', label: 'Nederlandse markt analyseren', hint: null },
      { id: 'intent', label: 'Commerciële vragen identificeren', hint: null },
      { id: 'cluster', label: 'Intent clusters groeperen', hint: null },
      { id: 'volume', label: 'Zoekvolumes schatten', hint: 'Gebaseerd op Google-zoekdata en AI-adoptie' },
      { id: 'ai_vol', label: 'AI-adoptie factor berekenen', hint: 'AI-adoptie verschilt per branche (15-25%)' },
      { id: 'trend', label: 'Trend signalen analyseren', hint: null },
      { id: 'diff', label: 'Concurrentie & kansen beoordelen', hint: null },
      { id: 'rank', label: 'Resultaten rangschikken', hint: null },
    ],
    loaderPreparing: 'Resultaten voorbereiden...',
  };
  const [keyword, setKeyword] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [place, setPlace] = useState("");
  const [branche, setBranche] = useState("");
  const [inputMode, setInputMode] = useState("keyword");
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [extractedKeywords, setExtractedKeywords] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("clusters");
  const [openClusters, setOpenClusters] = useState(new Set());
  const [intentF, setIntentF] = useState("all");
  const [trendF, setTrendF] = useState("all");
  const [userTier, setUserTier] = useState("anonymous");
  const [user, setUser] = useState(null);
  const resultsRef = useRef(null);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // Check if pro (admin or paid)
          const isAdmin = session.user.email === 'imre@onlinelabs.nl';
          // TODO: check subscription table for pro status
          setUserTier(isAdmin ? 'pro' : 'free');
        }
      } catch (e) {
        // No auth available, stay anonymous
      }
    }
    checkAuth();
  }, []);

  // BETA: All features free — no tier limits
  const TIER = { anonymous: { maxPrompts: 999, maxVolumes: 999 }, free: { maxPrompts: 999, maxVolumes: 999 }, pro: { maxPrompts: 999, maxVolumes: 999 } };
  const tier = TIER[userTier];
  const TOTAL = 50;

  const clusters = useMemo(() => buildClusters(prompts), [prompts]);
  const maxClusterVol = useMemo(() => clusters.length ? Math.max(...clusters.map(c => c.totalVolume)) : 0, [clusters]);
  const maxVol = useMemo(() => prompts.length ? Math.max(...prompts.map(p => p.estimatedAiVolume)) : 0, [prompts]);

  const hasInput = inputMode === "url" ? websiteUrl.trim() : keyword.trim();
  const [rateLimitMsg, setRateLimitMsg] = useState(null);

  // Rate limit check
  const checkRateLimit = () => {
    // Admin/Pro: unlimited scans
    if (userTier === 'pro') return true;
    try {
      const key = 'pe_scans';
      const stored = JSON.parse(localStorage.getItem(key) || '{"count":0,"date":""}');
      const today = new Date().toISOString().split('T')[0];

      if (userTier === 'anonymous') {
        // Anonymous: max 2 scans total
        if (stored.count >= 2) {
          setRateLimitMsg(T.rateLimitAnon);
          return false;
        }
        localStorage.setItem(key, JSON.stringify({ count: stored.count + 1, date: today }));
        return true;
      } else {
        // Logged in: 1 scan per day
        if (stored.date === today && stored.count >= 1) {
          setRateLimitMsg(T.rateLimitUser);
          return false;
        }
        const newCount = stored.date === today ? stored.count + 1 : 1;
        localStorage.setItem(key, JSON.stringify({ count: newCount, date: today }));
        return true;
      }
    } catch (e) {
      return true; // If localStorage fails, allow scan
    }
  };

  const discover = async () => {
    if (!hasInput) return;
    setRateLimitMsg(null);
    if (!checkRateLimit()) return;
    setLoading(true); setHasSearched(true); setOpenClusters(new Set()); setError(null);
    setPrompts([]); setExtractedKeywords([]); setCompanyName("");

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    try {
      const body = inputMode === "url"
        ? { url: websiteUrl.trim(), brandName: bedrijfsnaam.trim() || null, location: place.trim() || null, industry: branche.trim() || null }
        : { keyword: keyword.trim(), brandName: bedrijfsnaam.trim() || null, location: place.trim() || null, industry: branche.trim() || null };

      const res = await fetch("/api/prompt-explorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Er ging iets mis. Probeer het opnieuw.");
        setLoading(false);
        return;
      }

      // Map API response to component format
      const mapped = (data.prompts || []).map((p, i) => ({
        id: i,
        text: p.text,
        intent: p.intent || "informational",
        intentCluster: p.intentCluster || "Overig",
        trendSignal: p.trendSignal || "stable",
        estimatedAiVolume: p.estimatedAiVolume || 0,
        difficulty: p.difficulty || "medium",
        difficultyScore: p.difficultyScore || 50,
        yourStatus: p.mentioned ? "found" : p.competitors?.length ? "not_found" : "not_scanned",
        topCompetitors: p.competitors || [],
      }));

      setPrompts(mapped);
      setExtractedKeywords(data.extractedKeywords || []);
      setCompanyName(data.companyName || bedrijfsnaam || "");

      const cls = buildClusters(mapped);
      setOpenClusters(new Set(cls.slice(0, 2).map(c => c.name)));

    } catch (err) {
      setError("Verbindingsfout. Controleer je internetverbinding en probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCluster = (name) => { setOpenClusters(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; }); };

  const stats = useMemo(() => {
    if (!prompts.length) return null;
    return {
      total: prompts.length, clusters: clusters.length,
      highOpp: prompts.filter(p => p.difficulty === "easy").length,
      found: prompts.filter(p => p.yourStatus === "found").length,
      rising: prompts.filter(p => p.trendSignal === "rising").length,
      totalVol: prompts.reduce((s, p) => s + (p.estimatedAiVolume || 0), 0),
    };
  }, [prompts, clusters]);

  const opportunities = useMemo(() =>
    prompts.filter(p => p.difficulty === "easy" && p.yourStatus !== "found").sort((a, b) => b.estimatedAiVolume - a.estimatedAiVolume).slice(0, 5),
    [prompts]);

  const topCompetitors = useMemo(() => {
    const c = {};
    prompts.forEach(p => (p.topCompetitors || []).forEach(n => { c[n] = (c[n] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [prompts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">

      {/* ── HERO ── */}
      <div className="relative max-w-6xl mx-auto px-4 py-6 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-sm font-medium mb-4">
            <SparklesIcon className="w-4 h-4" />
            {T.badge}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-slate-900 leading-tight px-4">
            {T.h1}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 px-4 mb-4 max-w-xl mx-auto">
            {T.subtitle}
          </p>

          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            {[["Perplexity", "bg-indigo-400"], ["ChatGPT", "bg-emerald-400"], ["Google AI Mode", "bg-blue-400"]].map(([n, c]) => (
              <span key={n} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600">
                <span className={`w-2 h-2 rounded-full ${c}`} />{n}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">{T.dataLine}</p>
        </div>

        {/* ── FORM CARD ── */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60 p-5 sm:p-6">

            {/* Mode toggle */}
            <div className="flex gap-1 mb-5 bg-slate-100 rounded-lg p-0.5 max-w-xs">
              <button onClick={() => setInputMode("keyword")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition cursor-pointer ${inputMode === "keyword" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <SearchIcon className="w-3.5 h-3.5" /> {T.tabKeyword}
              </button>
              <button onClick={() => setInputMode("url")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition cursor-pointer ${inputMode === "url" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <GlobeIcon className="w-3.5 h-3.5" /> {T.tabUrl}
              </button>
            </div>

            <div className="space-y-0">
              {/* Main input */}
              {inputMode === "keyword" ? (
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                  <SearchIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && discover()}
                    placeholder={T.phKeyword} className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
              ) : (
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                  <GlobeIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && discover()}
                    placeholder={T.phUrl} className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
              )}

              {/* Secondary inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <BuildingIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input value={bedrijfsnaam} onChange={e => setBedrijfsnaam(e.target.value)}
                    placeholder={T.phBrand} className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input value={place} onChange={e => setPlace(e.target.value)}
                    placeholder={T.phPlace} className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-3">
                  <LayersIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input value={branche} onChange={e => setBranche(e.target.value)}
                    placeholder={T.phBranche} className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
              </div>
            </div>
          </div>

          {/* CTA button — below card */}
          <button onClick={discover} disabled={loading || !hasInput}
            className="w-full mt-3 bg-[#292956] hover:bg-[#1e1e45] text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg cursor-pointer">
            {loading ? (
              <><Loader2Icon className="w-5 h-5 animate-spin" /> {T.ctaLoading}</>
            ) : (
              <><SparklesIcon className="w-5 h-5" /> {inputMode === "url" ? T.ctaUrl : T.ctaKeyword}</>
            )}
          </button>

          <p className="text-xs text-slate-400 text-center mt-2.5">
            {inputMode === "url" ? T.belowCtaUrl : T.belowCta}
          </p>
        </div>
      </div>

      {/* ── RATE LIMIT ── */}
      {rateLimitMsg && (
        <div className="max-w-3xl mx-auto px-4 pb-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-sm text-amber-800 font-medium">{rateLimitMsg}</p>
            {userTier === 'anonymous' && (
              <a href="/register" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#292956] text-white rounded-xl text-sm font-semibold hover:bg-[#1e1e45] transition">
                {T.freeAccount} <ArrowRightIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && <div className="max-w-3xl mx-auto px-4 pb-8"><Loader keyword={inputMode === "url" ? websiteUrl : keyword} mode={inputMode} steps={inputMode === "url" ? T.loaderUrlSteps(inputMode === "url" ? websiteUrl : keyword) : T.loaderKwSteps(keyword)} preparingText={T.loaderPreparing} /></div>}

      {/* ── ERROR ── */}
      {!loading && error && (
        <div className="max-w-3xl mx-auto px-4 pb-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
            <XIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">{T.errorTitle}</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={() => { setError(null); setHasSearched(false); }} className="text-sm text-red-700 underline underline-offset-2 mt-2 cursor-pointer">{T.tryAgain}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {!loading && hasSearched && prompts.length > 0 && (
        <div ref={resultsRef} className="max-w-4xl mx-auto px-4 pb-16 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { l: T.sClusters, v: stats.clusters },
              { l: T.sPrompts, v: stats.total },
              { l: T.sHighOpp, v: stats.highOpp, c: "text-emerald-600" },
              { l: T.sRising, v: stats.rising, c: "text-emerald-600" },
              { l: T.sFound, v: stats.found, s: `/${stats.total}` },
              { l: T.sVolTotal, v: stats.totalVol, p: "~", s: isEn ? "/mo" : "/mnd" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-3.5">
                <p className={`text-xl font-bold ${s.c || "text-slate-800"} tabular-nums`}>{s.p || ""}<AnimNum value={s.v} />{s.s || ""}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Extracted keywords (URL mode) */}
          {inputMode === "url" && extractedKeywords.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><GlobeIcon className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{T.extractedKw}</p>
                  <p className="text-xs text-slate-400">{websiteUrl}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {extractedKeywords.map(kw => <span key={kw} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded-full px-2.5 py-1 font-medium">{kw}</span>)}
              </div>
              <p className="text-[10px] text-slate-400 mt-3">{T.extractedUsed(prompts.length)}</p>
            </div>
          )}

          {/* Quick Wins */}
          {opportunities.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><TargetIcon className="w-4 h-4" /></div>
                <h3 className="font-semibold text-slate-900">{T.qwTitle}</h3>
              </div>
              <div className="space-y-2">
                {opportunities.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 font-medium text-xs w-4">{i + 1}.</span>
                    <p className="flex-1 text-sm text-slate-700 truncate">{p.text}</p>
                    <MiniTrend trend={p.trendSignal} />
                    <span className="text-xs font-bold text-slate-700 tabular-nums">~{fmtVol(p.estimatedAiVolume)}{isEn ? '/mo' : '/mnd'}</span>
                    <DiffBadge d="easy" labels={{ easy: T.diffEasy, medium: T.diffMedium, hard: T.diffHard }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5 mr-2">
              {[["clusters", T.fClusters], ["list", T.fList]].map(([v, l]) => (
                <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${viewMode === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>{l}</button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {[["all", T.fAll], ["commercial", T.fCommercial], ["informational", T.fInfo]].map(([v, l]) => <FilterBtn key={v} active={intentF === v} onClick={() => setIntentF(v)}>{l}</FilterBtn>)}
            </div>
            <div className="flex gap-1.5">
              {[["all", T.fAll], ["rising", `↑ ${T.fRising}`], ["stable", `→ ${T.fStable}`], ["declining", `↓ ${T.fDeclining}`]].map(([v, l]) => <FilterBtn key={v} active={trendF === v} onClick={() => setTrendF(v)}>{l}</FilterBtn>)}
            </div>
          </div>

          {/* Cluster view */}
          {viewMode === "clusters" && (
            <div className="space-y-3">
              {clusters.filter(c => (intentF === "all" || c.dominantIntent === intentF) && (trendF === "all" || c.dominantTrend === trendF)).map(c => (
                <ClusterCard key={c.name} cluster={c} isOpen={openClusters.has(c.name)} onToggle={() => toggleCluster(c.name)} maxClusterVol={maxClusterVol} globalMaxVol={maxVol} maxVolumes={tier.maxVolumes} t={{ prompts_label: T.prompts_label, oppTitle: T.oppTitle, variations: T.variations, avgDiff: T.avgDiff, perMonth: isEn ? '/mo' : '/mnd', diffLabels: { easy: T.diffEasy, medium: T.diffMedium, hard: T.diffHard } }} />
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode === "list" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_28px_28px_130px_90px] gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                <span>AI-prompt</span><span className="text-center">Tr</span><span className="text-center">St</span><span>AI vol.</span><span>{isEn ? 'Chance' : 'Kans'}</span>
              </div>
              {prompts.filter(p => (intentF === "all" || p.intent === intentF) && (trendF === "all" || p.trendSignal === trendF)).map((p, i) => (
                <div key={p.id} className="grid grid-cols-[1fr_28px_28px_130px_90px] gap-2 px-5 py-2.5 border-b border-slate-50 items-center hover:bg-slate-50/50 transition">
                  <div className="min-w-0"><p className="text-xs text-slate-700 truncate">{p.text}</p><p className="text-[9px] text-slate-400 mt-0.5">{p.intentCluster}</p></div>
                  <div className="flex justify-center"><MiniTrend trend={p.trendSignal} /></div>
                  <div className="flex justify-center"><StatusDot s={p.yourStatus} /></div>
                  <div><VolBar vol={p.estimatedAiVolume} maxVol={maxVol} blurred={false} /></div>
                  <div><DiffBadge d={p.difficulty} labels={{ easy: T.diffEasy, medium: T.diffMedium, hard: T.diffHard }} /></div>
                </div>
              ))}
            </div>
          )}

          {/* CTA — BETA: gratis account */}
          <div className="bg-slate-50 rounded-2xl p-8 text-center">
            <h3 className="text-lg font-bold text-slate-900">{T.ctaBoxTitle}</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{T.ctaBoxDesc}</p>
            <a href="/register" className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-[#292956] text-white rounded-xl text-sm font-semibold hover:bg-[#1e1e45] transition">
              {T.ctaBoxBtn} <ArrowRightIcon className="w-4 h-4" />
            </a>
          </div>

          {/* Competitors */}
          {topCompetitors.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><BarChartIcon className="w-4 h-4" /></div>
                <h3 className="font-semibold text-slate-900">{T.compTitle}</h3>
              </div>
              <div className="flex gap-3 flex-wrap">
                {topCompetitors.map(([name, count], i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-[#292956] text-white" : "bg-slate-200 text-slate-500"}`}>{i + 1}</span>
                    <span className="text-sm font-medium text-slate-800">{name}</span>
                    <span className="text-[10px] text-slate-400">{count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Methodology t={T} />
        </div>
      )}

      {/* ── SEO CONTENT (pre-search) ── */}
      {!hasSearched && !loading && (
        <>
          {/* Section 1: What does AI say */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              {T.seo1Title}
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">{T.seo1P1}</p>
            <p className="text-slate-600 leading-relaxed">{T.seo1P2}</p>
          </section>

          {/* Section 2: What do you discover */}
          <section className="bg-slate-50 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">{T.seo2Title}</h2>
              <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">{T.seo2Sub}</p>
              <div className="grid sm:grid-cols-3 gap-6">
                {T.seo2Steps.map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                      {[<GlobeIcon className="w-5 h-5" />, <LayersIcon className="w-5 h-5" />, <TrendingUpIcon className="w-5 h-5" />][i]}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: AI conversation example */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 text-center">
              {T.seo3Title}
            </h2>
            <p className="text-slate-600 leading-relaxed text-center mb-6 max-w-2xl mx-auto">
              {T.seo3P}
            </p>
            <div className="text-center">
              <a href={isEn ? "/en/tools/geo-audit" : "/tools/geo-audit"} className="inline-flex items-center gap-2 px-6 py-3 bg-[#292956] text-white rounded-xl text-sm font-semibold hover:bg-[#1e1e45] transition">
                {T.seo3Cta} <ArrowRightIcon className="w-4 h-4" />
              </a>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-20 bg-slate-50 relative overflow-visible">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">{T.faqTitle}</h2>
                  <FAQ items={T.faqs} />
                </div>
                <div className="hidden lg:flex justify-center items-end relative">
                  <div className="translate-y-22">
                    <Image src="/teun-ai-mascotte.png" alt="Teun.ai mascotte" width={420} height={520} className="w-[420px] h-auto mb-12" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
}
