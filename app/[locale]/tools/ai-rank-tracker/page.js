// app/[locale]/tools/ai-rank-tracker/page.js
// AI Rank Tracker - Check je positie op ChatGPT + Perplexity
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Search, Trophy, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, AlertCircle, Sparkles, MapPin, Globe, Building2, Hash, ArrowRight, ExternalLink, BookOpen, MessageSquareQuote, Shield, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

// ====================================
// PLATFORM CONFIGURATIE
// ====================================
function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\[(\d+)\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s)\]]+/g, '')
    .replace(/\([^)]*utm_source[^)]*\)/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\(\)/g, '')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
          <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{stripMarkdown(result.snippet)}&rdquo;</p>
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
            {stripMarkdown(result.fullResponse)}
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
  const [openFaq, setOpenFaq] = useState(0);
  
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
        
        {/* Form */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60 p-5 sm:p-6">
            <form onSubmit={handleScan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 border-b sm:border-b-0 border-slate-100 pb-3 sm:pb-0">
                  <Globe className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
                    placeholder={locale === 'en' ? 'Your website' : 'Jouw website'} required
                    className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-3 border-b sm:border-b-0 border-slate-100 pb-3 sm:pb-0">
                  <Building2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)}
                    placeholder={locale === 'en' ? 'Company name' : 'Je bedrijfsnaam'} required
                    className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                    placeholder={locale === 'en' ? 'Your keyword' : 'Je zoekwoord'} required
                    className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input type="text" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)}
                    placeholder={locale === 'en' ? 'City (optional)' : 'Vestigingsplaats (optioneel)'}
                    className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                </div>
              </div>
            </form>
          </div>
          
          <button onClick={handleScan} disabled={loading}
            className="w-full mt-3 bg-[#292956] hover:bg-[#1e1e45] text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg cursor-pointer">
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t('scanning')}</>
            ) : (
              <><Trophy className="w-5 h-5" /> {t('checkRanking')}</>
            )}
          </button>
          
          <p className="text-xs text-slate-400 text-center mt-2.5">
            {!user ? t('freeLimit') : t('dailyLimit')} • ChatGPT + Perplexity • {t('resultTime')}
          </p>
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
              </div>
            </div>
          </div>
        )}
        
        {/* Info cards */}
        {!results && !loading && (
          <div className="max-w-3xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                <Search className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-800 mb-1 text-sm">{t('info1Title')}</p>
              <p className="text-xs text-slate-500">{t('info1Desc')}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                <Trophy className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-800 mb-1 text-sm">{t('info2Title')}</p>
              <p className="text-xs text-slate-500">{t('info2Desc')}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                <Eye className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-800 mb-1 text-sm">{t('info3Title')}</p>
              <p className="text-xs text-slate-500">{t('info3Desc')}</p>
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

      {/* ── SEO CONTENT ── */}
      {!results && !loading && (
        <>
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 leading-tight">{locale === 'en' ? <>Track your AI rankings<br /><span className="text-amber-600">across ChatGPT and Perplexity</span></> : <>Volg je AI-rankings<br /><span className="text-amber-600">op ChatGPT en Perplexity</span></>}</h2>
            <p className="text-slate-600 leading-relaxed mb-4">{locale === 'en' ? 'More and more consumers ask ChatGPT and Perplexity for recommendations instead of Googling. Does your business rank when someone asks "best [your industry] in [your city]"? An AI Rank Tracker shows exactly where you stand in AI-generated answers — and who your competitors are that do get mentioned.' : 'Steeds meer consumenten vragen ChatGPT en Perplexity om aanbevelingen in plaats van te Googelen. Staat jouw bedrijf in de ranking als iemand vraagt "beste [jouw branche] in [jouw stad]"? Een AI Rank Tracker toont precies waar je staat in AI-gegenereerde antwoorden — en welke concurrenten wél worden genoemd.'}</p>
            <p className="text-slate-600 leading-relaxed">{locale === 'en' ? 'This free GEO rank tracking tool checks your position on both ChatGPT and Perplexity for any keyword. You see your exact ranking position, which competitors appear above you, and get actionable insights to improve your AI visibility. Track your AI search rankings and optimize your generative engine presence.' : 'Deze gratis AI rank tracker checkt je positie op zowel ChatGPT als Perplexity voor elk zoekwoord. Je ziet je exacte rankingpositie, welke concurrenten boven je staan, en krijgt concrete inzichten om je AI-zichtbaarheid te verbeteren. Monitor je AI-zoekposities en optimaliseer je aanwezigheid in generatieve zoekmachines.'}</p>
          </section>

          <section className="bg-slate-50 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">{locale === 'en' ? 'How does AI ranking work?' : 'Hoe werkt AI-ranking?'}</h2>
              <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">{locale === 'en' ? 'AI platforms rank businesses differently than Google. Understanding the factors is key to improving your position.' : 'AI-platformen rangschikken bedrijven anders dan Google. De factoren begrijpen is essentieel voor een betere positie.'}</p>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { icon: <Search className="w-5 h-5" />, title: locale === 'en' ? 'Keyword analysis' : 'Zoekwoord analyse', desc: locale === 'en' ? 'We query both ChatGPT and Perplexity with your exact keyword and location context.' : 'We bevragen zowel ChatGPT als Perplexity met je exacte zoekwoord en locatiecontext.' },
                  { icon: <BarChart3 className="w-5 h-5" />, title: locale === 'en' ? 'Position tracking' : 'Positie tracking', desc: locale === 'en' ? 'We detect exactly at which position your business appears in the AI-generated answer.' : 'We detecteren precies op welke positie jouw bedrijf verschijnt in het AI-antwoord.' },
                  { icon: <Eye className="w-5 h-5" />, title: locale === 'en' ? 'Competitor insights' : 'Concurrentie inzichten', desc: locale === 'en' ? 'See which competitors rank above you and understand what makes AI recommend them.' : 'Zie welke concurrenten boven je staan en begrijp waarom AI hen aanbeveelt.' }
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">{item.icon}</div>
                    <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 text-center">{locale === 'en' ? <>Your competitors are already<br /><span className="text-amber-600">ranking in AI search</span></> : <>Je concurrenten staan al<br /><span className="text-amber-600">in AI-zoekresultaten</span></>}</h2>
            <p className="text-slate-600 leading-relaxed text-center mb-6 max-w-2xl mx-auto">{locale === 'en' ? 'When someone asks ChatGPT "What is the best [service] in [city]?", AI creates a ranked list of recommendations. Your position in that list directly impacts whether potential customers find you or your competitor. Tracking your AI ranking is the first step to improving it.' : 'Als iemand ChatGPT vraagt "Wat is de beste [dienst] in [stad]?", maakt AI een gerangschikte lijst van aanbevelingen. Je positie in die lijst bepaalt direct of potentiële klanten jou vinden of je concurrent. Je AI-ranking monitoren is de eerste stap naar verbetering.'}</p>
            <div className="bg-[#292956] rounded-2xl p-6 sm:p-8 text-white">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs">👤</span></div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">{locale === 'en' ? '"What is the best web design agency in Amsterdam?"' : '"Wat is het beste webdesign bureau in Amsterdam?"'}</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5"><Sparkles className="w-3 h-3 text-amber-300" /></div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">{locale === 'en' ? '"Here are the top web design agencies in Amsterdam: 1. ..."' : '"Dit zijn de beste webdesign bureaus in Amsterdam: 1. ..."'}<br /><span className="text-amber-300 font-medium">{locale === 'en' ? 'Is your business #1, #5, or not even mentioned?' : 'Staat jouw bedrijf op #1, #5, of word je niet eens genoemd?'}</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section — Homepage style with Teun */}
          <section className="py-20 bg-slate-50 relative overflow-visible">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">{locale === 'en' ? 'Frequently asked questions' : 'Veelgestelde vragen'}</h2>
                  <div className="space-y-4">
                    {(locale === 'en' ? [
                      { q: 'What is an AI Rank Tracker?', a: 'An AI Rank Tracker checks where your business appears in AI-generated answers on platforms like ChatGPT and Perplexity. Unlike traditional SEO rankings, AI rankings are based on how AI models perceive your brand authority, reviews, and online presence.' },
                      { q: 'Is this a free rank tracking tool?', a: 'Yes, you can check your ranking 3 times per day for free without creating an account. With a free account you get more daily checks and can track your position over time.' },
                      { q: 'Which AI platforms do you track?', a: 'We currently track rankings on ChatGPT and Perplexity — the two most-used AI search platforms. Both are queried live with your keyword and location context.' },
                      { q: 'How can I improve my AI ranking?', a: 'AI rankings are influenced by your online reputation (Google Reviews, Trustpilot), content authority (blog posts, case studies), brand mentions on authoritative sites, and consistent business information (NAP data). Our GEO Audit tool analyzes your page-level optimization.' },
                      { q: 'How is AI ranking different from Google ranking?', a: 'Google ranks web pages based on links and keywords. AI platforms like ChatGPT synthesize information from multiple sources to create a recommendation. Being mentioned positively across many sources matters more than having one well-optimized page.' },
                    ] : [
                      { q: 'Wat is een AI Rank Tracker?', a: 'Een AI Rank Tracker checkt waar jouw bedrijf verschijnt in AI-gegenereerde antwoorden op platformen zoals ChatGPT en Perplexity. Anders dan traditionele SEO-rankings, zijn AI-rankings gebaseerd op hoe AI-modellen je merkautoriteit, reviews en online aanwezigheid interpreteren.' },
                      { q: 'Is dit een gratis rank tracking tool?', a: 'Ja, je kunt 3 keer per dag gratis je ranking checken zonder account. Met een gratis account krijg je meer dagelijkse checks en kun je je positie over tijd volgen.' },
                      { q: 'Welke AI-platformen worden getrackt?', a: 'We tracken momenteel rankings op ChatGPT en Perplexity — de twee meestgebruikte AI-zoekplatformen. Beide worden live bevraagd met je zoekwoord en locatiecontext.' },
                      { q: 'Hoe verbeter ik mijn AI-ranking?', a: 'AI-rankings worden beïnvloed door je online reputatie (Google Reviews, Trustpilot), content-autoriteit (blogposts, case studies), merkvermeldingen op gezaghebbende sites, en consistente bedrijfsgegevens (NAP-data). Onze GEO Audit tool analyseert je optimalisatie op paginaniveau.' },
                      { q: 'Hoe verschilt AI-ranking van Google-ranking?', a: 'Google rangschikt webpagina\'s op basis van links en zoekwoorden. AI-platformen zoals ChatGPT combineren informatie uit meerdere bronnen tot een aanbeveling. Positief vermeld worden op veel bronnen is belangrijker dan één goed geoptimaliseerde pagina.' },
                    ]).map((item, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                          className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-slate-400 font-mono text-sm">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {item.q}
                            </span>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${openFaq === i ? 'rotate-45' : ''}`} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        {openFaq === i && (
                          <div className="px-6 pb-6 pt-0">
                            <p className="text-slate-600 pl-10">{item.a}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:flex justify-center items-end relative">
                  <div className="translate-y-20">
                    <Image
                      src="/teun-ai-mascotte.png"
                      alt={locale === 'en' ? 'Teun helps you' : 'Teun helpt je'}
                      width={420}
                      height={530}
                      className="drop-shadow-xl"
                    />
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
