// app/[locale]/dashboard/RankTrackerTab.jsx
// AI Rank Tracker Dashboard Tab
// Toont per keyword de volledige scan resultaten (zelfde stijl als /tools/ai-rank-tracker)
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Plus, Trash2, Search, MapPin, ChevronDown, ChevronUp, Loader2, BarChart3,
  Eye, EyeOff, AlertCircle, X, Pencil, Check, RefreshCw, Hash, Target,
  MessageSquareQuote,
} from 'lucide-react';

// ════════════════════════════════════════
// PLATFORM CONFIG — zelfde als bestaande rank tracker
// ════════════════════════════════════════
const PLATFORMS = {
  chatgpt: {
    name: 'ChatGPT', color: '#10b981',
    dotClass: 'bg-emerald-400', bgLight: 'bg-emerald-50', bgMedium: 'bg-emerald-100',
    border: 'border-emerald-200', text: 'text-emerald-700', badgeBg: 'bg-emerald-600',
  },
  perplexity: {
    name: 'Perplexity', color: '#6366f1',
    dotClass: 'bg-indigo-400', bgLight: 'bg-indigo-50', bgMedium: 'bg-indigo-100',
    border: 'border-indigo-200', text: 'text-indigo-700', badgeBg: 'bg-indigo-600',
  },
  google_ai: {
    name: 'Google AI Mode', color: '#3b82f6',
    dotClass: 'bg-blue-400', bgLight: 'bg-blue-50', bgMedium: 'bg-blue-100',
    border: 'border-blue-200', text: 'text-blue-700', badgeBg: 'bg-blue-600',
  },
};

// ════════════════════════════════════════
// POSITION BADGE — groot, rond, zelfde als rank tracker tool
// ════════════════════════════════════════
function PositionBadge({ position, size = 'large' }) {
  if (position === null || position === undefined) {
    return <span className={`inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold ${size === 'large' ? 'w-14 h-14 text-xl' : 'w-7 h-7 text-[11px]'}`}>—</span>;
  }
  let colors;
  if (position === 1) colors = 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-200/50';
  else if (position <= 3) colors = 'bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg';
  else if (position <= 5) colors = 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-md';
  else if (position <= 10) colors = 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md';
  else colors = 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500';
  return <span className={`inline-flex items-center justify-center rounded-full font-bold ${colors} ${size === 'large' ? 'w-14 h-14 text-xl' : 'w-7 h-7 text-[11px]'}`}>#{position}</span>;
}

// ════════════════════════════════════════
// PLATFORM SCORECARD — exact zelfde patroon als bestaande tool
// ════════════════════════════════════════
function PlatformScoreCard({ platformKey, result, locale }) {
  const [showRanking, setShowRanking] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const p = PLATFORMS[platformKey];
  if (!p || !result) return null;
  const isNL = locale === 'nl';
  const hasError = result.error;

  return (
    <div className={`rounded-2xl border ${p.border} ${p.bgLight} p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${p.dotClass}`} />
          <span className="font-semibold text-slate-700 text-[14px]">{p.name}</span>
        </div>
        {result.found && result.position && (
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${p.bgMedium} ${p.text}`}>
            #{result.position} {isNL ? 'van' : 'of'} {result.totalResults || '?'}
          </span>
        )}
        {!result.found && !hasError && (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-500">
            {isNL ? 'Niet gevonden' : 'Not found'}
          </span>
        )}
      </div>

      {/* Position + status */}
      <div className="flex items-center gap-4 mb-4">
        <PositionBadge position={hasError ? null : result.position} />
        <div className="flex-1">
          {result.found && result.position ? (
            <>
              <p className="font-bold text-slate-800 text-[16px] m-0">{isNL ? 'Positie' : 'Position'} #{result.position}</p>
              <p className="text-[12px] text-slate-500 m-0 mt-0.5">
                {result.position === 1 ? (isNL ? '🏆 Eerste keuze van AI' : '🏆 AI\'s first choice') : result.position <= 3 ? '✨ Top 3' : result.position <= 5 ? (isNL ? '👍 Goede zichtbaarheid' : '👍 Good visibility') : (isNL ? '📈 Verbetering mogelijk' : '📈 Room for improvement')}
              </p>
            </>
          ) : hasError ? (
            <p className="text-[14px] text-slate-400 m-0">{isNL ? 'Scan mislukt' : 'Scan failed'}</p>
          ) : (
            <>
              <p className="font-bold text-slate-500 text-[14px] m-0">{isNL ? 'Niet gerangschikt' : 'Not ranked'}</p>
              <p className="text-[12px] text-slate-400 m-0 mt-0.5">{isNL ? 'Je bedrijf wordt niet genoemd door dit platform' : 'Your business is not mentioned by this platform'}</p>
            </>
          )}
        </div>
      </div>

      {/* Snippet */}
      {result.snippet && (
        <div className="mb-3 p-3 rounded-xl bg-white/60 border border-slate-200/60">
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1 m-0"><MessageSquareQuote className="w-3 h-3" /> {isNL ? 'Fragment' : 'Snippet'}</p>
          <p className="text-[13px] text-slate-600 italic leading-relaxed m-0">&ldquo;{result.snippet}&rdquo;</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {result.rankings?.length > 0 && (
          <button onClick={() => setShowRanking(!showRanking)}
            className="text-[11px] font-medium flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 border border-slate-200/60 cursor-pointer">
            {showRanking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showRanking ? (isNL ? 'Verbergen' : 'Hide') : `Ranking (${result.totalResults || result.rankings.length})`}
          </button>
        )}
        {result.fullResponse && (
          <button onClick={() => setShowResponse(!showResponse)}
            className="text-[11px] font-medium flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 border border-slate-200/60 cursor-pointer">
            {showResponse ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showResponse ? (isNL ? 'Verbergen' : 'Hide') : (isNL ? 'Volledig antwoord' : 'Full response')}
          </button>
        )}
      </div>

      {/* Rankings list */}
      {showRanking && result.rankings?.length > 0 && (
        <div className="mt-3 space-y-1">
          {result.rankings.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              r.isTarget ? `${p.bgMedium} ${p.border} border font-semibold` : 'bg-white/40 hover:bg-white/70'
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                r.isTarget ? `${p.badgeBg} text-white` : 'bg-slate-200 text-slate-500'
              }`}>{r.position}</span>
              <span className={`text-[13px] flex-1 ${r.isTarget ? p.text + ' font-semibold' : 'text-slate-600'}`}>{r.name}</span>
              {r.isTarget && <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-full font-medium text-slate-500 border border-slate-200/60">{isNL ? 'Jouw bedrijf' : 'Your business'} ✓</span>}
            </div>
          ))}
        </div>
      )}

      {/* Full response */}
      {showResponse && result.fullResponse && (
        <div className="mt-3 p-3 rounded-xl bg-white/70 border border-slate-200/60">
          <p className="text-[11px] text-slate-400 mb-2 m-0">{isNL ? 'Volledig AI-antwoord' : 'Full AI response'}:</p>
          <div className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{result.fullResponse}</div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// POSITION HISTORY CHART
// ════════════════════════════════════════
function PositionChart({ data, locale }) {
  if (!data || data.length < 2) return null;
  const isNL = locale === 'nl';
  const formatted = data.map(d => ({ ...d, label: new Date(d.date).toLocaleDateString(isNL ? 'nl-NL' : 'en-US', { day: 'numeric', month: 'short' }) }));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-[13px] font-semibold text-slate-800 mb-0.5">{isNL ? 'Positie over tijd' : 'Position over time'}</div>
      <div className="text-[11px] text-slate-400 mb-4">{isNL ? 'Lager nummer = betere positie' : 'Lower number = better position'}</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formatted} margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis reversed domain={[1, 'dataMax']} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `#${v}`} width={30} axisLine={false} tickLine={false} />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl text-[11px]">
                <div className="text-slate-400 mb-1">{label}</div>
                {payload.map((e, i) => (
                  <div key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-slate-300">{e.name}</span><span className="font-bold ml-auto">{e.value ? `#${e.value}` : '—'}</span></div>
                ))}
              </div>
            );
          }} />
          <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          {Object.entries(PLATFORMS).map(([key, pl]) => (
            <Line key={key} type="monotone" dataKey={key} name={pl.name} stroke={pl.color} strokeWidth={2} dot={{ r: 3, fill: pl.color, strokeWidth: 0 }} connectNulls activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ════════════════════════════════════════
// ADD KEYWORD FORM
// ════════════════════════════════════════
function AddKeywordForm({ onAdd, tier, locale, activeCompany, onClose }) {
  const [keyword, setKeyword] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [domain, setDomain] = useState(activeCompany?.website || '');
  const [brandName, setBrandName] = useState(activeCompany?.name || '');
  const [competitors, setCompetitors] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isNL = locale === 'nl';
  const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200 transition-all";

  const handleSubmit = async () => {
    if (!keyword.trim() || !domain.trim() || !brandName.trim()) { setError(isNL ? 'Vul zoekwoord, website en bedrijfsnaam in' : 'Enter keyword, website and company name'); return; }
    setLoading(true); setError('');
    const comps = competitors.split(',').map(c => c.trim()).filter(c => c.length > 0).slice(0, tier?.maxCompetitors || 0);
    const result = await onAdd({ keyword: keyword.trim(), serviceArea: serviceArea.trim(), domain: domain.trim(), brandName: brandName.trim(), competitors: comps, locale });
    if (result.error) { setError(result.error); setLoading(false); } else { onClose(); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-[14px] font-semibold text-slate-800">{isNL ? 'Keyword toevoegen' : 'Add keyword'}</span>
        <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer bg-transparent border-none"><X className="w-4 h-4 text-slate-400" /></button>
      </div>
      <div className="p-5 space-y-4">
        {/* Search Console hint */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
          <p className="text-[12px] text-slate-600 m-0 leading-relaxed">
            {isNL
              ? 'Vul de zoekwoorden in waarop je gevonden wilt worden in AI-zoekmachines. Tip: bekijk in Google Search Console (Prestaties → Zoekopdrachten) op welke termen je website al verkeer krijgt.'
              : 'Enter the search terms you want to be found for in AI search engines. Tip: check Google Search Console (Performance → Queries) to see which terms already drive traffic to your site.'}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">{isNL ? 'Zoekwoord' : 'Keyword'}</label><input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder={isNL ? 'bijv. hypotheekadviseur' : 'e.g. mortgage advisor'} className={inputCls} autoFocus /></div>
          <div><label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">{isNL ? 'Locatie (optioneel)' : 'Location (optional)'}</label><input type="text" value={serviceArea} onChange={e => setServiceArea(e.target.value)} placeholder={isNL ? 'bijv. Amsterdam, Rotterdam' : 'e.g. Amsterdam, London'} className={inputCls} /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">{isNL ? 'Bedrijfsnaam' : 'Company'}</label><input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} className={inputCls} /></div>
          <div><label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">Website</label><input type="text" value={domain} onChange={e => setDomain(e.target.value)} className={inputCls} /></div>
        </div>
        {(tier?.maxCompetitors || 0) > 0 && (
          <div><label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 block">{isNL ? `Concurrenten (max ${tier.maxCompetitors}, kommagescheiden)` : `Competitors (max ${tier.maxCompetitors}, comma separated)`}</label><input type="text" value={competitors} onChange={e => setCompetitors(e.target.value)} placeholder={isNL ? 'Bedrijf A, Bedrijf B' : 'Company A, Company B'} className={inputCls} /></div>
        )}
        {error && <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}</div>}
      </div>
      <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{isNL ? 'Scant direct op ChatGPT, Perplexity en Google AI Mode' : 'Scans ChatGPT, Perplexity and Google AI Mode'}</span>
        <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer border-none" style={{ background: loading ? '#64748b' : '#292956' }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {isNL ? 'Scannen...' : 'Scanning...'}</> : <><Plus className="w-4 h-4" /> {isNL ? 'Toevoegen en scannen' : 'Add and scan'}</>}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// KEYWORD ROW — compact overzicht + expandable detail
// ════════════════════════════════════════
function KeywordRow({ kw, latestFull, chartData, onDelete, onUpdate, expanded, onToggle, locale }) {
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState(kw.generated_prompt);
  const [editingComps, setEditingComps] = useState(false);
  const [compsValue, setCompsValue] = useState((kw.competitors || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const isNL = locale === 'nl';

  const savePrompt = async () => { setSaving(true); await onUpdate(kw.id, { generatedPrompt: promptValue.trim() }); setEditingPrompt(false); setSaving(false); };
  const saveComps = async () => { setSaving(true); await onUpdate(kw.id, { competitors: compsValue.split(',').map(c => c.trim()).filter(Boolean) }); setEditingComps(false); setSaving(false); };
  const handleRescan = async () => { setRescanning(true); await onUpdate(kw.id, { rescan: true }); setRescanning(false); };

  // Platform results voor deze keyword
  const platformResults = latestFull || {};

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Summary row */}
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer bg-transparent border-none hover:bg-slate-50/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-slate-800 text-[14px]">{kw.keyword}</span>
            {kw.service_area && <span className="text-[11px] text-slate-400 flex items-center gap-0.5 flex-shrink-0"><MapPin className="w-3 h-3" /> {kw.service_area}</span>}
          </div>
          <span className="text-[11px] text-slate-400">{kw.brand_name} · {kw.domain}</span>
        </div>
        {/* Compact position badges */}
        <div className="hidden sm:flex items-center gap-2">
          {Object.entries(PLATFORMS).map(([key, pl]) => {
            const pos = kw.latestPositions?.[key]?.position ?? null;
            return (
              <div key={key} className="flex items-center gap-1" title={pl.name}>
                <span className={`w-2 h-2 rounded-full ${pl.dotClass}`} />
                <PositionBadge position={pos} size="small" />
              </div>
            );
          })}
        </div>
        <div className="text-slate-400">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
      </button>

      {/* Mobile positions */}
      {!expanded && (
        <div className="sm:hidden flex items-center gap-2 px-5 pb-3">
          {Object.entries(PLATFORMS).map(([key, pl]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${pl.dotClass}`} />
              <PositionBadge position={kw.latestPositions?.[key]?.position ?? null} size="small" />
            </div>
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-4 bg-slate-50/30">
          {/* Platform scorecards — zelfde stijl als /tools/ai-rank-tracker */}
          <div className="grid lg:grid-cols-3 gap-3">
            {Object.keys(PLATFORMS).map(key => (
              <PlatformScoreCard key={key} platformKey={key} result={platformResults[key] || null} locale={locale} />
            ))}
          </div>

          {/* Position chart (alleen als >1 datapunt) */}
          <PositionChart data={chartData} locale={locale} />

          {/* Zoekprompt */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{isNL ? 'Zoekprompt' : 'Search prompt'}</span>
              {!editingPrompt ? (
                <button onClick={() => setEditingPrompt(true)} className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer bg-transparent border-none"><Pencil className="w-3 h-3" /> {isNL ? 'Aanpassen' : 'Edit'}</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={savePrompt} disabled={saving} className="text-[11px] text-slate-700 flex items-center gap-1 cursor-pointer bg-transparent border-none disabled:opacity-50"><Check className="w-3 h-3" /> {isNL ? 'Opslaan' : 'Save'}</button>
                  <button onClick={() => { setEditingPrompt(false); setPromptValue(kw.generated_prompt); }} className="text-[11px] text-slate-400 cursor-pointer bg-transparent border-none">{isNL ? 'Annuleren' : 'Cancel'}</button>
                </div>
              )}
            </div>
            {editingPrompt ? (
              <textarea value={promptValue} onChange={e => setPromptValue(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none" />
            ) : (
              <p className="text-[13px] text-slate-700 leading-relaxed m-0">{kw.generated_prompt}</p>
            )}
          </div>

          {/* Concurrenten */}
          {(kw.competitors?.length > 0 || editingComps) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{isNL ? 'Concurrenten' : 'Competitors'}</span>
                {!editingComps ? (
                  <button onClick={() => setEditingComps(true)} className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer bg-transparent border-none"><Pencil className="w-3 h-3" /></button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveComps} disabled={saving} className="text-[11px] text-slate-700 cursor-pointer bg-transparent border-none"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setEditingComps(false)} className="text-[11px] text-slate-400 cursor-pointer bg-transparent border-none"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
              {editingComps ? (
                <input type="text" value={compsValue} onChange={e => setCompsValue(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-slate-200" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {kw.competitors.map((c, i) => <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[12px] rounded-md">{c}</span>)}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button onClick={handleRescan} disabled={rescanning}
              className="text-[12px] text-slate-600 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-all disabled:opacity-50">
              {rescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {rescanning ? (isNL ? 'Scannen...' : 'Scanning...') : (isNL ? 'Opnieuw scannen' : 'Rescan')}
            </button>
            <button onClick={() => { if (confirm(isNL ? `"${kw.keyword}" en alle history verwijderen?` : `Delete "${kw.keyword}"?`)) onDelete(kw.id); }}
              className="text-[12px] text-red-500 hover:text-red-700 flex items-center gap-1.5 cursor-pointer bg-transparent border-none">
              <Trash2 className="w-3.5 h-3.5" /> {isNL ? 'Verwijderen' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// MAIN TAB
// ════════════════════════════════════════
export default function RankTrackerTab({ userId, locale, activeCompany, isPro }) {
  const [keywords, setKeywords] = useState([]);
  const [charts, setCharts] = useState({});
  const [latestFull, setLatestFull] = useState({});
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [days, setDays] = useState(30);
  const isNL = locale === 'nl';

  const fetchData = useCallback(async () => {
    try {
      const [kwRes, histRes] = await Promise.all([
        fetch(`/api/tracked-keywords?userId=${userId}`),
        fetch(`/api/rank-history?userId=${userId}&days=${days}`),
      ]);
      const kwData = await kwRes.json();
      const histData = await histRes.json();
      setKeywords(kwData.keywords || []);
      setTier(kwData.tier || null);
      setCharts(histData.charts || {});
      setLatestFull(histData.latestFull || {});
    } catch (err) { console.error('RankTracker fetch:', err); }
    finally { setLoading(false); }
  }, [userId, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (data) => {
    try {
      const res = await fetch('/api/tracked-keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, ...data }) });
      const result = await res.json();
      if (!res.ok) return { error: result.error };
      await fetchData();
      // Auto-expand het nieuwe keyword
      if (result.keyword?.id) setExpandedId(result.keyword.id);
      return { success: true };
    } catch { return { error: isNL ? 'Toevoegen mislukt' : 'Failed to add' }; }
  };

  const handleUpdate = async (keywordId, updates) => {
    try { await fetch('/api/tracked-keywords', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: keywordId, userId, locale, ...updates }) }); await fetchData(); } catch {}
  };

  const handleDelete = async (keywordId) => {
    try { await fetch(`/api/tracked-keywords?id=${keywordId}&userId=${userId}`, { method: 'DELETE' }); await fetchData(); } catch {}
  };

  // Filter keywords op actieve bedrijf (moet VOOR early return staan - Rules of Hooks)
  const filteredKeywords = useMemo(() => {
    if (!activeCompany?.name) return keywords;
    const companyName = activeCompany.name.toLowerCase();
    const companyDomain = (activeCompany.website || '').toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    return keywords.filter(kw => {
      const kwBrand = kw.brand_name.toLowerCase();
      const kwDomain = kw.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
      return kwBrand.includes(companyName) || companyName.includes(kwBrand) || kwDomain.includes(companyDomain) || companyDomain.includes(kwDomain);
    });
  }, [keywords, activeCompany]);

  const keywordsLeft = tier ? tier.maxKeywords - tier.used : 0;

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-slate-400">
          {tier?.cronEnabled ? (isNL ? '2x per week automatisch gescand' : 'Scanned twice a week') : ''}
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="text-[12px] bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-600 focus:outline-none cursor-pointer">
            <option value={7}>7 {isNL ? 'dagen' : 'days'}</option>
            <option value={30}>30 {isNL ? 'dagen' : 'days'}</option>
            <option value={90}>90 {isNL ? 'dagen' : 'days'}</option>
          </select>
          <button onClick={() => setShowAddForm(!showAddForm)} disabled={keywordsLeft <= 0}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer border-none"
            style={{ background: '#292956' }}>
            <Plus className="w-3.5 h-3.5" /> Keyword <span className="opacity-60 text-[10px] ml-0.5">({tier?.used || 0}/{tier?.maxKeywords || 5})</span>
          </button>
        </div>
      </div>

      {/* Upgrade banner */}
      {tier && !tier.cronEnabled && filteredKeywords.length > 0 && (
        <div className="rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3" style={{ background: '#292956' }}>
          <div>
            <p className="font-semibold text-[13px] text-white m-0">{isNL ? 'Automatische tracking vanaf Starter' : 'Automatic tracking from Starter'}</p>
            <p className="text-white/60 text-[11px] m-0 mt-0.5">{isNL ? '2x per week scans, 20 keywords, positie-grafiek over tijd' : '2x/week scans, 20 keywords, position chart over time'}</p>
          </div>
          <a href={isNL ? '/pricing' : '/en/pricing'} className="bg-white text-slate-800 font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors no-underline">
            {isNL ? 'Bekijk plannen' : 'View plans'}
          </a>
        </div>
      )}

      {/* Add form */}
      {showAddForm && <AddKeywordForm onAdd={handleAdd} tier={tier} locale={locale} activeCompany={activeCompany} onClose={() => setShowAddForm(false)} />}

      {/* Keywords list */}
      {filteredKeywords.length === 0 && !showAddForm ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><BarChart3 className="w-7 h-7 text-slate-400" /></div>
          <div className="text-[15px] font-semibold text-slate-700 mb-1">
            {keywords.length > 0 
              ? (isNL ? `Geen keywords voor ${activeCompany?.name || 'dit bedrijf'}` : `No keywords for ${activeCompany?.name || 'this company'}`)
              : (isNL ? 'Nog geen keywords' : 'No keywords yet')}
          </div>
          <div className="text-[13px] text-slate-400 mb-5 max-w-sm mx-auto">{isNL ? 'Voeg de zoekwoorden toe waarop je gevonden wilt worden in ChatGPT, Perplexity en Google AI Mode.' : 'Add the keywords you want to be found for in ChatGPT, Perplexity and Google AI Mode.'}</div>
          <button onClick={() => setShowAddForm(true)} className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer border-none" style={{ background: '#292956' }}>
            <Plus className="w-4 h-4" /> {isNL ? 'Eerste keyword toevoegen' : 'Add first keyword'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKeywords.map(kw => (
            <KeywordRow key={kw.id} kw={kw} latestFull={latestFull[kw.id] || {}} chartData={charts[kw.id] || []}
              onDelete={handleDelete} onUpdate={handleUpdate} expanded={expandedId === kw.id}
              onToggle={() => setExpandedId(expandedId === kw.id ? null : kw.id)} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
