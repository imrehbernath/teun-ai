// app/[locale]/tools/ai-rank-tracker/page.js
// AI Rank Tracker - Check je positie op ChatGPT + Perplexity
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Search, Trophy, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, AlertCircle, Sparkles, MapPin, Globe, Building2, Hash, ArrowRight, ExternalLink, BookOpen, MessageSquareQuote } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';

// ====================================
// PLATFORM CONFIGURATIE
// ====================================
const PLATFORMS = {
  chatgpt: { 
    name: 'ChatGPT', 
    dotClass: 'bg-emerald-400',
    bgLight: 'bg-emerald-50', 
    bgMedium: 'bg-emerald-100',
    border: 'border-emerald-200', 
    text: 'text-emerald-700',
    accent: 'text-emerald-600',
    badgeBg: 'bg-emerald-600'
  },
  perplexity: { 
    name: 'Perplexity', 
    dotClass: 'bg-teal-400',
    bgLight: 'bg-teal-50', 
    bgMedium: 'bg-teal-100',
    border: 'border-teal-200', 
    text: 'text-teal-700',
    accent: 'text-teal-600',
    badgeBg: 'bg-teal-600'
  }
};

// ====================================
// POSITIE BADGE
// ====================================
function PositionBadge({ position, size = 'large' }) {
  if (position === null || position === undefined) {
    return (
      <span className={`inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold ${size === 'large' ? 'w-16 h-16 text-xl' : 'w-8 h-8 text-sm'}`}>
        —
      </span>
    );
  }
  
  let colors;
  if (position === 1) {
    colors = 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-200/50';
  } else if (position <= 3) {
    colors = 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200/50';
  } else if (position <= 5) {
    colors = 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-md shadow-blue-200/50';
  } else if (position <= 10) {
    colors = 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md';
  } else {
    colors = 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500';
  }
  
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold ${colors} ${size === 'large' ? 'w-16 h-16 text-2xl' : 'w-8 h-8 text-sm'}`}>
      #{position}
    </span>
  );
}

// ====================================
// PLATFORM SCORECARD
// ====================================
function PlatformScoreCard({ platformKey, result, isLoading, t }) {
  const [expanded, setExpanded] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const platform = PLATFORMS[platformKey];
  
  if (isLoading) {
    return (
      <div className={`rounded-2xl border ${platform.border} ${platform.bgLight} p-5`}>
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-2.5 h-2.5 rounded-full ${platform.dotClass} animate-pulse`} />
          <span className="font-semibold text-slate-700">{platform.name}</span>
          <span className="ml-auto text-xs text-slate-400 animate-pulse">{t('scanning')}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200/60 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200/60 rounded w-24 animate-pulse" />
            <div className="h-3 bg-slate-200/60 rounded w-36 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!result) return null;
  const hasError = result.error;
  
  return (
    <div className={`rounded-2xl border ${platform.border} ${platform.bgLight} p-5 transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${platform.dotClass}`} />
          <span className="font-semibold text-slate-700">{platform.name}</span>
        </div>
        {result.found && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${platform.bgMedium} ${platform.text}`}>
            #{result.position} {t('ofTotal')} {result.totalResults}
          </span>
        )}
        {!result.found && !hasError && result.mentionedInText && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
            {t('mentionedNotRanked')}
          </span>
        )}
        {!result.found && !hasError && !result.mentionedInText && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-500">
            {t('notFound')}
          </span>
        )}
        {hasError && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
            {t('unavailable')}
          </span>
        )}
      </div>
      
      {/* Position + Status */}
      <div className="flex items-center gap-4 mb-4">
        <PositionBadge position={hasError ? null : result.position} />
        <div className="flex-1">
          {result.found ? (
            <>
              <p className="font-bold text-slate-800 text-lg">{t('position')} #{result.position}</p>
              <p className="text-sm text-slate-500">
                {result.position === 1 ? `🏆 ${t('firstChoice')}` : result.position <= 3 ? `✨ ${t('top3')}` : result.position <= 5 ? `👍 ${t('goodVisibility')}` : `📈 ${t('improvementPossible')}`}
              </p>
            </>
          ) : hasError ? (
            <>
              <p className="font-bold text-slate-400">{t('scanFailed')}</p>
              <p className="text-sm text-slate-400">{result.errorMessage || t('tryAgainLater')}</p>
            </>
          ) : (
            <>
              <p className="font-bold text-slate-500">{t('notRanked')}</p>
              <p className="text-sm text-slate-400">
                {result.mentionedInText ? t('mentionedButNotRanked') : t('notMentionedByPlatform')}
              </p>
            </>
          )}
        </div>
      </div>
      
      {/* Snippet */}
      {result.snippet && (
        <div className="mb-3 p-3 rounded-xl bg-white/60 border border-slate-200/60">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <MessageSquareQuote className="w-3 h-3" /> {t('fragment')}
          </p>
          <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{result.snippet}&rdquo;</p>
        </div>
      )}
      
      {/* Buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {result.rankings?.length > 0 && (
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 border border-slate-200/60">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? t('hide') : `${t('ranking')} (${result.totalResults})`}
          </button>
        )}
        {result.fullResponse && (
          <button onClick={() => setShowResponse(!showResponse)}
            className="text-xs font-medium flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 border border-slate-200/60">
            {showResponse ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showResponse ? t('hideResponse') : t('fullResponse')}
          </button>
        )}
      </div>
      
      {/* Expanded ranking */}
      {expanded && result.rankings?.length > 0 && (
        <div className="mt-3 space-y-1 animate-fadeIn">
          {result.rankings.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              r.isTarget ? `${platform.bgMedium} ${platform.border} border font-semibold` : 'bg-white/40 hover:bg-white/70'
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                r.isTarget ? `${platform.badgeBg} text-white` : 'bg-slate-200 text-slate-500'
              }`}>{r.position}</span>
              <span className={`text-sm flex-1 ${r.isTarget ? platform.text + ' font-semibold' : 'text-slate-600'}`}>{r.name}</span>
              {r.isTarget && (
                <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-full font-medium text-slate-500 border border-slate-200/60">
                  {t('yourBusiness')} ✓
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Full response */}
      {showResponse && result.fullResponse && (
        <div className="mt-3 p-3 rounded-xl bg-white/70 border border-slate-200/60 animate-fadeIn">
          <p className="text-xs text-slate-400 mb-2">{t('fullAiResponse')}:</p>
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
            {result.fullResponse}
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================
// MAIN CONTENT
// ====================================
function RankTrackerContent() {
  const supabase = createClient();
  const t = useTranslations('rankTracker');
  const locale = useLocale();
  
  const [domain, setDomain] = useState('');
  const [brandName, setBrandName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [duration, setDuration] = useState(null);
  
  const resultsRef = useRef(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);
  
  async function handleScan(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setGeneratedPrompt('');
    setDuration(null);
    
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    try {
      const response = await fetch('/api/ai-rank-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          brandName: brandName.trim(),
          keyword: keyword.trim(),
          serviceArea: serviceArea.trim() || null,
          userId: user?.id || null,
          locale
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || t('somethingWentWrong'));
        return;
      }
      
      setResults(data.results);
      setGeneratedPrompt(data.meta?.generatedPrompt || '');
      setDuration(data.meta?.duration);
      
    } catch (err) {
      setError(t('connectionError'));
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="relative max-w-5xl mx-auto px-4 py-6 sm:py-12">
        
        {/* Hero */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" />
            AI Rank Tracker
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-slate-900 leading-tight px-4">
            AI Rank Tracker
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4 mb-4">
            {t('heroSubtitle')}
          </p>
          
          <div className="flex items-center justify-center gap-3 mt-5">
            {Object.entries(PLATFORMS).map(([key, p]) => (
              <span key={key} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600">
                <span className={`w-2 h-2 rounded-full ${p.dotClass}`} />
                {p.name}
              </span>
            ))}
          </div>
        </div>
        
        {/* Form + Teun */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-6 mb-8 items-start">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleScan} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <Globe className="w-4 h-4 text-slate-400" /> Website
                  </label>
                  <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
                    placeholder={t('placeholderDomain')} required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-slate-700 placeholder:text-slate-300 transition-all" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" /> {t('companyName')}
                  </label>
                  <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)}
                    placeholder={t('placeholderBrand')} required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-slate-700 placeholder:text-slate-300 transition-all" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <Hash className="w-4 h-4 text-slate-400" /> {t('keyword')}
                  </label>
                  <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                    placeholder={t('placeholderKeyword')} required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-slate-700 placeholder:text-slate-300 transition-all" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" /> {t('serviceArea')}
                    <span className="text-slate-400 font-normal text-xs">({t('optional')})</span>
                  </label>
                  <input type="text" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)}
                    placeholder={t('placeholderArea')}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-slate-700 placeholder:text-slate-300 transition-all" />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-sm text-slate-400">
                  {!user ? t('freeLimit') : t('dailyLimit')} • ChatGPT + Perplexity • {t('resultTime')}
                </p>
                <button type="submit" disabled={loading}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-semibold px-8 py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('scanning')}</>
                  ) : (
                    <><Trophy className="w-4 h-4" /> {t('checkRanking')}</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Teun mascotte - desktop */}
          <div className="hidden lg:flex flex-col items-center justify-center pt-4">
            <img 
              src="/images/teun-met-vergrootglas.png" 
              alt="Teun"
              className="w-[180px] drop-shadow-lg"
            />
            <p className="text-sm text-slate-400 mt-2 text-center max-w-[180px]">
              {t('teunMessage')}
            </p>
          </div>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
                {error.includes('account') && (
                  <Link href="/signup" className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline">
                    {t('createFreeAccount')} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Skeleton cards - DIRECT bij klik */}
        {loading && (
          <div ref={resultsRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {Object.keys(PLATFORMS).map(key => (
              <PlatformScoreCard key={key} platformKey={key} isLoading={true} t={t} />
            ))}
          </div>
        )}
        
        {/* Results */}
        {results && !loading && (
          <div ref={resultsRef} className="space-y-6 animate-fadeIn">
            
            {/* Gegenereerde prompt */}
            {generatedPrompt && (
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 mb-1">{t('generatedPrompt')}</p>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      &ldquo;{generatedPrompt}&rdquo;
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {t('promptSentTo')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Platform cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(PLATFORMS).map(key => (
                <PlatformScoreCard key={key} platformKey={key} result={results[key]} t={t} />
              ))}
            </div>
            
            {duration && (
              <p className="text-center text-xs text-slate-400">
                {t('scanCompleted', { seconds: (duration / 1000).toFixed(1) })}
              </p>
            )}
            
            {/* CTA */}
            <div className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] rounded-3xl overflow-hidden shadow-xl">
              <div className="grid lg:grid-cols-4 gap-0">
                <div className="lg:col-span-3 p-8 sm:p-10">
                  <div className="max-w-2xl">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                      {t('ctaTitle')}
                    </h2>
                    <p className="text-white/70 text-lg mb-8 leading-relaxed">
                      {t('ctaDescription')}
                    </p>
                    
                    <div className="flex flex-wrap gap-4">
                      <a
                        href="https://www.onlinelabs.nl/skills/geo-optimalisatie"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
                      >
                        {t('geoOptimization')}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <Link
                        href="/blog"
                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all backdrop-blur-sm"
                      >
                        <BookOpen className="w-4 h-4" />
                        {t('readKnowledgeBase')}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex items-center justify-center p-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-l from-white/5 to-transparent"></div>
                  <img
                    src="/images/teun-ai-mascotte.png"
                    alt="Teun"
                    className="w-[200px] drop-shadow-2xl relative z-10"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Info (before first scan) */}
        {!results && !loading && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-teal-600" />
              </div>
              <p className="font-bold text-slate-800 mb-2">{t('info1Title')}</p>
              <p className="text-sm text-slate-500">{t('info1Desc')}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <p className="font-bold text-slate-800 mb-2">{t('info2Title')}</p>
              <p className="text-sm text-slate-500">{t('info2Desc')}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Eye className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-bold text-slate-800 mb-2">{t('info3Title')}</p>
              <p className="text-sm text-slate-500">{t('info3Desc')}</p>
            </div>
          </div>
        )}
        
        {/* User status */}
        {!loading && (
          <div className="text-center mt-8">
            <p className="text-slate-400 text-sm">
              {user ? t('loggedInAs', { email: user.email }) : (
                <>{t('needMoreScans')} <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-medium underline">{t('createFreeAccount')}</Link></>
              )}
            </p>
          </div>
        )}
      </div>
      
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

export default function RankTrackerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
      </div>
    }>
      <RankTrackerContent />
    </Suspense>
  );
}
