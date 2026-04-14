'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { detectBranchLanguage } from '@/lib/branche-detect';
import { getGrowingStats } from '@/lib/stats';

// ============================================
// HOMEPAGE COMPONENT - Teun.ai (i18n)
// ============================================

export default function Homepage() {
  const t = useTranslations('home');
  const locale = useLocale();
  const stats = getGrowingStats();

  const [formData, setFormData] = useState({
    bedrijfsnaam: '',
    website: '',
    branche: '',
    zoekwoorden: '',
    servicegebied: ''
  });
  const [openFaq, setOpenFaq] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [brancheSuggestion, setBrancheSuggestion] = useState(null);
  const [showKeywordWarning, setShowKeywordWarning] = useState(false);
  const [showUrlWarning, setShowUrlWarning] = useState(false);
  const [extractingKeywords, setExtractingKeywords] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState(null);
  const [keywordTags, setKeywordTags] = useState([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [videoMounted, setVideoMounted] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoTheater, setVideoTheater] = useState(false);
  const lastExtractedUrl = useRef('');

  // Lazy-load video after mount to prevent FOUC
  useEffect(() => { setVideoMounted(true) }, []);

  // Theater mode: Escape to close, lock scroll
  useEffect(() => {
    if (!videoTheater) return
    const handleKey = (e) => { if (e.key === 'Escape') setVideoTheater(false) }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [videoTheater]);

  // Auto-extract keywords when URL looks like a real domain (debounced 800ms)
  useEffect(() => {
    const url = formData.website?.trim();
    const looksLikeDomain = url && /[a-z0-9]\.[a-z]{2,}/i.test(url);
    if (!looksLikeDomain || url === lastExtractedUrl.current || extractingKeywords) return;

    const timer = setTimeout(() => {
      lastExtractedUrl.current = url;
      handleExtractKeywords(url);
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.website]);

  const syncKeywordsToForm = (tags) => {
    setKeywordTags(tags);
    setFormData(prev => ({...prev, zoekwoorden: tags.join(', ')}));
  };

  const removeKeyword = (index) => {
    const updated = keywordTags.filter((_, i) => i !== index);
    syncKeywordsToForm(updated);
  };

  const addKeyword = (keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed || keywordTags.includes(trimmed) || keywordTags.length >= 12) return;
    syncKeywordsToForm([...keywordTags, trimmed]);
  };

  const handleExtractKeywords = async (url) => {
    if (!url?.trim() || extractingKeywords) return;

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setExtractingKeywords(true);
    setExtractionMessage(null);

    try {
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: normalizedUrl,
          companyName: formData.bedrijfsnaam || '',
          category: formData.branche || ''
        })
      });

      const data = await response.json();

      if (!response.ok || data.blocked) {
        setExtractionMessage(t('form.extractionFailed'));
        return;
      }

      if (data.keywords && data.keywords.length > 0) {
        syncKeywordsToForm(data.keywords);
        setFormData(prev => ({
          ...prev,
          bedrijfsnaam: prev.bedrijfsnaam || data.companyName || '',
          branche: prev.branche || data.category || '',
        }));
      }
    } catch (err) {
      console.error('Extract error:', err);
    } finally {
      setExtractingKeywords(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const hasUrl = formData.website && formData.website.trim().length > 0;
    
    if (!hasUrl) {
      setShowUrlWarning(true);
      return;
    }

    if (!formData.bedrijfsnaam || !formData.branche) return;
    if (extractingKeywords) return;
    
    proceedToScan();
  };

  const proceedToScan = () => {
    setShowKeywordWarning(false);
    setShowUrlWarning(false);
    
    const params = new URLSearchParams();
    
    if (formData.bedrijfsnaam) params.set('company', formData.bedrijfsnaam);
    if (formData.branche) params.set('category', formData.branche);
    if (formData.website) params.set('website', formData.website);
    if (formData.zoekwoorden) params.set('keywords', formData.zoekwoorden);
    if (formData.servicegebied) params.set('location', formData.servicegebied);
    
    if (formData.bedrijfsnaam) {
      params.set('autostart', 'true');
    }
    
    window.location.href = `/tools/ai-visibility?${params.toString()}`;
  };

  // FAQ items via translations
  const faqItems = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
  ];

  return (
    <div className="bg-white">
      {/* ====== HERO ANIMATION STYLES ====== */}
      <style>{`
        @keyframes hero-float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -25px) scale(1.08); }
          66% { transform: translate(-25px, 15px) scale(0.95); }
        }
        @keyframes hero-float-medium {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.1); }
        }
        @keyframes hero-circle-1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes hero-circle-2 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-18px) scale(1.05); }
        }
        @keyframes hero-circle-3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .hero-orb-1 { animation: hero-float-slow 22s ease-in-out infinite; }
        .hero-orb-2 { animation: hero-float-medium 18s ease-in-out infinite; animation-delay: -4s; }
        .hero-orb-3 { animation: hero-float-slow 26s ease-in-out infinite reverse; animation-delay: -8s; }
        .hero-circle-1 { animation: hero-circle-1 5s ease-in-out infinite; }
        .hero-circle-2 { animation: hero-circle-2 7s ease-in-out infinite; animation-delay: -2s; }
        .hero-circle-3 { animation: hero-circle-3 6s ease-in-out infinite; animation-delay: -3s; }
        .hero-circle-4 { animation: hero-circle-1 8s ease-in-out infinite; animation-delay: -1s; }
        @media (prefers-reduced-motion: reduce) {
          .hero-orb-1, .hero-orb-2, .hero-orb-3,
          .hero-circle-1, .hero-circle-2, .hero-circle-3, .hero-circle-4 {
            animation: none;
          }
        }
      `}</style>
      {/* ====== HERO + STATS WRAPPER ====== */}
      <div className="relative overflow-hidden">
        {/* Hero Mascotte */}
        <div className="hidden lg:block absolute right-[5%] xl:right-[10%] bottom-[128px] z-10 pointer-events-none select-none">
          <Image
            src="/mascotte-teun-ai.png"
            alt="Teun - AI Visibility Mascotte"
            width={380}
            height={480}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* ====== HERO SECTION ====== */}
        <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="hero-orb-1 absolute -top-32 -right-32 lg:top-[-10%] lg:right-[5%] w-[300px] h-[300px] lg:w-[450px] lg:h-[450px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 40%, transparent 70%)' }}
            />
            <div 
              className="hero-orb-2 absolute -bottom-24 -left-24 lg:bottom-[-15%] lg:left-[-5%] w-[250px] h-[250px] lg:w-[400px] lg:h-[400px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.10) 0%, rgba(139, 92, 246, 0.03) 40%, transparent 70%)' }}
            />
            <div 
              className="hero-orb-3 absolute top-[50%] right-[8%] w-[120px] h-[120px] lg:w-[180px] lg:h-[180px] rounded-full hidden lg:block"
              style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%)' }}
            />
          </div>

          {/* Decorative floating circles - left */}
          <div className="absolute left-[6%] lg:left-[8%] top-[20%] hidden lg:block pointer-events-none">
            <div className="hero-circle-1 absolute w-14 h-14 rounded-full border-2 border-blue-500/10" />
            <div className="hero-circle-2 absolute top-20 left-12 w-7 h-7 rounded-full bg-purple-500/8" />
            <div className="hero-circle-3 absolute top-8 left-20 w-3 h-3 rounded-full bg-blue-500/20" />
            <div className="hero-circle-4 absolute top-28 left-4 w-2 h-2 rounded-full bg-blue-500/25" />
          </div>

          {/* Decorative floating circles - right (below mascotte) */}
          <div className="absolute right-[6%] lg:right-[8%] bottom-[35%] hidden lg:block pointer-events-none">
            <div className="hero-circle-2 absolute w-16 h-16 rounded-full border border-purple-500/10" />
            <div className="hero-circle-3 absolute -top-6 -left-8 w-5 h-5 rounded-full bg-blue-500/10" />
            <div className="hero-circle-1 absolute top-14 left-14 w-3 h-3 rounded-full bg-purple-500/15" />
          </div>

          <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-12 lg:pt-20">
            <div className="grid lg:grid-cols-5 gap-8 items-end">
              <div className="lg:col-span-3 pb-12 lg:pb-24">
                <h1 className="text-[1.7rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-tight mb-6">
                  {t('hero.title')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    {t('hero.titleHighlight')}
                  </span>
                </h1>
                
                <p className="text-base sm:text-lg text-slate-600 mb-4">
                  {t('hero.subtitle')}
                  <br />
                  <span className="font-medium text-slate-700">{t('hero.subtitleBold')}</span>
                </p>

                {/* AI Platform badges */}
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    ChatGPT
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Perplexity
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    AI {locale === 'nl' ? 'Modus' : 'Mode'}
                    <span className="text-[10px] text-slate-400">{t('hero.aiModeLabel')}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    AI Overviews
                    <span className="text-[10px] text-slate-400">{t('hero.aiOverviewsLabel')}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">{t('hero.platformInfo')}</p>

                {/* Mobile Mascotte */}
                <div className="lg:hidden flex justify-center">
                  <Image
                    src="/mascotte-teun-ai.png"
                    alt="Teun - AI Visibility Mascotte"
                    width={220}
                    height={280}
                    className="drop-shadow-xl"
                    priority
                  />
                </div>

                {/* Scan Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                        {t('form.companyName')} {t('form.required')}
                        <span className="relative" onClick={() => setActiveTooltip(activeTooltip === 'bedrijf' ? null : 'bedrijf')}>
                          <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {activeTooltip === 'bedrijf' && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50">
                              {t('form.companyTooltip')}
                            </span>
                          )}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.bedrijfsnaam}
                        onChange={(e) => setFormData({...formData, bedrijfsnaam: e.target.value})}
                        placeholder={t('form.companyPlaceholder')}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                        {t('form.industry')} {t('form.required')}
                        <span className="relative" onClick={() => setActiveTooltip(activeTooltip === 'branche' ? null : 'branche')}>
                          <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {activeTooltip === 'branche' && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50">
                              {t('form.industryTooltip')}
                            </span>
                          )}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.branche}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({...formData, branche: val});
                          // Branche language detection only for NL locale
                          if (locale === 'nl') {
                            setBrancheSuggestion(detectBranchLanguage(val));
                          }
                        }}
                        placeholder={t('form.industryPlaceholder')}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                          brancheSuggestion 
                            ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20' 
                            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                        {t('form.website')} {t('form.required')}
                      </label>
                      <input
                        type="text"
                        inputMode="url"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        value={formData.website}
                        onChange={(e) => { setFormData({...formData, website: e.target.value.toLowerCase()}); setShowUrlWarning(false); }}
                        placeholder={t('form.websitePlaceholder')}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                          showUrlWarning && !formData.website?.trim()
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
                        }`}
                        required
                      />
                      {showUrlWarning && !formData.website?.trim() && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                          {t('form.websiteRequired')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Keyword Tags Panel */}
                  {(keywordTags.length > 0 || extractingKeywords || extractionMessage) && (
                    <div className="transition-all duration-300 ease-in-out">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        {extractingKeywords ? (
                          <div className="flex items-center gap-3 py-1">
                            <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="text-sm text-slate-600">{t('form.analyzing')}</span>
                          </div>
                        ) : extractionMessage && keywordTags.length === 0 ? (
                          <div>
                            <div className="flex items-center gap-2 py-1 mb-3">
                              <span className="text-amber-500 text-lg">⚠️</span>
                              <span className="text-sm text-slate-600">{extractionMessage}</span>
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={newKeywordInput}
                                onChange={(e) => setNewKeywordInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addKeyword(newKeywordInput);
                                    setNewKeywordInput('');
                                  }
                                }}
                                placeholder={t('form.keywordPlaceholder')}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-xs text-slate-700 placeholder:text-slate-400 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(''); }}
                                disabled={!newKeywordInput.trim()}
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                {t('form.addKeyword')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-slate-500">{t('form.keywordsCount', { count: keywordTags.length })}</span>
                              <button
                                type="button"
                                onClick={() => syncKeywordsToForm([])}
                                className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                {t('form.clearAll')}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {keywordTags.map((kw, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 group">
                                  {kw}
                                  <button
                                    type="button"
                                    onClick={() => removeKeyword(i)}
                                    className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer ml-0.5"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                            {keywordTags.length < 12 && (
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={newKeywordInput}
                                  onChange={(e) => setNewKeywordInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      addKeyword(newKeywordInput);
                                      setNewKeywordInput('');
                                    }
                                  }}
                                  placeholder={t('form.keywordPlaceholder')}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-xs text-slate-700 placeholder:text-slate-400 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(''); }}
                                  disabled={!newKeywordInput.trim()}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  {t('form.addKeyword')}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Branche language detection - NL only */}
                  {locale === 'nl' && brancheSuggestion && (
                    <div className={`-mt-1 p-3 rounded-xl text-sm transition-all ${
                      brancheSuggestion.type === 'generic'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-blue-50 border border-blue-200'
                    }`}>
                      {brancheSuggestion.type === 'generic' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 flex-shrink-0">⚠️</span>
                          <p className="text-amber-800 text-xs" dangerouslySetInnerHTML={{ __html: t.raw('form.englishWarning') }} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex-shrink-0">💡</span>
                          <span className="text-blue-800 text-xs">
                            <strong>&quot;{brancheSuggestion.original}&quot;</strong> → 
                          </span>
                          {brancheSuggestion.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, branche: suggestion});
                                setBrancheSuggestion(null);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-all border border-blue-300 hover:border-blue-400 cursor-pointer shadow-sm"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    {t('form.submit')}
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    {t('form.submitInfo')}
                  </p>

                  {/* Tool count + pricing upsell */}
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span>{locale === 'nl' ? '1 van 6 gratis tools' : '1 of 6 free tools'}</span>
                    <span className="text-slate-300">·</span>
                    <Link 
                      href="/pricing"
                      className="text-blue-500 hover:text-blue-700 font-medium transition-colors"
                    >
                      {locale === 'nl' ? 'Lite vanaf €29,95/mnd' : 'Lite from €29.95/mo'}
                    </Link>
                  </div>
                  
                  <div className="text-center mt-2">
                    <Link 
                      href="/tools/ai-visibility" 
                      className="text-xs text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t('form.advancedOptions')}
                    </Link>
                  </div>
                </form>

                {/* Available On badges */}
                <div className="flex flex-col items-center gap-2.5 mt-5">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    {locale === 'nl' ? 'Beschikbaar op' : 'Available on'}
                  </span>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0h192v192H0z" fill="none"/>
                        <path d="M8 20v140c0 6.6 5.4 12 12 12h152c6.6 0 12-5.4 12-12V20H8z" fill="#eee"/>
                        <path d="M116 36H76c-4.42 0-8 3.58-8 8s3.58 8 8 8h40c4.42 0 8-3.58 8-8s-3.58-8-8-8z" fill="#fff"/>
                        <circle cx="96" cy="160" r="27.64" fill="#4285F4"/>
                        <circle cx="96" cy="160" r="34.55" fill="none" stroke="#F1F1F1" strokeWidth="3"/>
                        <path d="M32.07 84v93.27h34.01L96 125.45h76V84z" fill="#DB4437" opacity=".9"/>
                        <path d="M20 236h72.34l33.58-33.58v-25.14l-59.84-.01L20 98.24z" fill="#0F9D58" opacity=".9"/>
                        <path d="M96 125.45l29.92 51.82L92.35 236H172V125.45z" fill="#FFCD40" opacity=".9"/>
                        <path d="M8 20h176v76H8z" fill="#212121" fillOpacity=".05"/>
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 leading-tight font-medium">Chrome Web Store</span>
                        <span className="text-[12px] text-slate-700 leading-tight font-semibold group-hover:text-blue-600 transition-colors">{locale === 'nl' ? 'Chrome Extensie' : 'Chrome Extension'}</span>
                      </div>
                    </a>
                    <a
                      href="https://wordpress.org/plugins/teunai-geo/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-[#21759b]/40 hover:shadow-md transition-all duration-200"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 122.52 122.523" xmlns="http://www.w3.org/2000/svg">
                        <g fill="#21759b">
                          <path d="m8.708 61.26c0 20.802 12.089 38.779 29.619 47.298l-25.069-68.686c-2.916 6.536-4.55 13.769-4.55 21.388z"/>
                          <path d="m96.74 58.608c0-6.495-2.333-10.993-4.334-14.494-2.664-4.329-5.161-7.995-5.161-12.324 0-4.831 3.664-9.328 8.825-9.328.233 0 .454.029.681.042-9.35-8.566-21.807-13.796-35.489-13.796-18.36 0-34.513 9.42-43.91 23.688 1.233.037 2.395.063 3.382.063 5.497 0 14.006-.667 14.006-.667 2.833-.167 3.167 3.994.337 4.329 0 0-2.847.335-6.015.501l19.138 56.925 11.501-34.493-8.188-22.434c-2.83-.166-5.511-.501-5.511-.501-2.832-.166-2.5-4.496.332-4.329 0 0 8.679.667 13.843.667 5.496 0 14.006-.667 14.006-.667 2.835-.167 3.168 3.994.337 4.329 0 0-2.853.335-6.015.501l18.992 56.494 5.242-17.517c2.272-7.269 4.001-12.49 4.001-16.989z"/>
                          <path d="m62.184 65.857-15.768 45.819c4.708 1.384 9.687 2.141 14.846 2.141 6.12 0 11.989-1.058 17.452-2.979-.141-.225-.269-.464-.374-.724z"/>
                          <path d="m107.376 36.046c.226 1.674.354 3.471.354 5.404 0 5.333-.996 11.328-3.996 18.824l-16.053 46.413c15.624-9.111 26.133-26.038 26.133-45.426.001-9.137-2.333-17.729-6.438-25.215z"/>
                          <path d="m61.262 0c-33.779 0-61.262 27.481-61.262 61.26 0 33.783 27.483 61.263 61.262 61.263 33.778 0 61.265-27.48 61.265-61.263-.001-33.779-27.487-61.26-61.265-61.26zm0 119.715c-32.23 0-58.453-26.223-58.453-58.455 0-32.23 26.222-58.451 58.453-58.451 32.229 0 58.45 26.221 58.45 58.451 0 32.232-26.221 58.455-58.45 58.455z"/>
                        </g>
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 leading-tight font-medium">WordPress.org</span>
                        <span className="text-[12px] text-slate-700 leading-tight font-semibold group-hover:text-[#21759b] transition-colors">WordPress Plugin</span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-2 min-h-[500px]"></div>
            </div>
          </div>
        </section>

        {/* ====== STATS BAR ====== */}
        <section className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] py-8 relative">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center items-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.scans}</div>
                <div className="text-sm text-white/70">{t('stats.scansLabel')}</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.companies}</div>
                <div className="text-sm text-white/70">{locale === 'nl' ? 'Bedrijven aangesloten' : 'Businesses connected'}</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{t('stats.platformsCount')}</div>
                <div className="text-sm text-white/70">{t('stats.platformsLabel')}</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-green-400 mb-1">{t('stats.freeLabel')}</div>
                <div className="text-sm text-white/70">{t('stats.freeDescription')}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ====== SOCIAL PROOF ====== */}
      <section className="py-20 border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 mb-12">
          <p className="text-center text-slate-500 text-sm font-medium uppercase tracking-wider">
            {t('socialProof.title')}
          </p>
        </div>
        
        <div className="space-y-8">
          <div 
            className="relative w-full overflow-hidden h-16 md:h-20"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
          >
            <div className="absolute left-0 top-0 flex items-center gap-20 animate-scroll-left whitespace-nowrap">
              {[
                { name: 'Signhost', ext: 'svg' },
                { name: 'Evert-Groot', ext: 'svg' },
                { name: 'Flinck-Advocaten', ext: 'svg' },
                { name: 'Grachten-Museum', ext: 'png' },
                { name: 'HvanA', ext: 'svg' },
                { name: 'Contactcare', ext: 'svg' },
                { name: 'Feadship-Heritage-fleet', ext: 'png' },
                { name: 'instrktiv', ext: 'svg' },
                { name: 'CAKE-Film', ext: 'svg' },
                { name: 'Signhost', ext: 'svg' },
                { name: 'Evert-Groot', ext: 'svg' },
                { name: 'Flinck-Advocaten', ext: 'svg' },
                { name: 'Grachten-Museum', ext: 'png' },
                { name: 'HvanA', ext: 'svg' },
                { name: 'Contactcare', ext: 'svg' },
                { name: 'Feadship-Heritage-fleet', ext: 'png' },
                { name: 'instrktiv', ext: 'svg' },
                { name: 'CAKE-Film', ext: 'svg' },
              ].map((logo, i) => (
                <Image
                  key={`top-${i}`}
                  src={`/${logo.name}.${logo.ext}`}
                  alt={logo.name.replace(/-/g, ' ')}
                  width={200}
                  height={80}
                  className="h-16 md:h-20 w-auto flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300"
                />
              ))}
            </div>
          </div>

          <div 
            className="relative w-full overflow-hidden h-16 md:h-20"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
          >
            <div className="absolute left-0 top-0 flex items-center gap-20 animate-scroll-right whitespace-nowrap">
              {[
                { name: 'ASN-autoschade', ext: 'svg' },
                { name: 'De-Smaak-van-Italie', ext: 'svg' },
                { name: 'InterDam', ext: 'png' },
                { name: 'Forteiland-Pampus', ext: 'svg' },
                { name: 'Sec-Arbeidsrecht-Advocaten', ext: 'svg' },
                { name: 'Farber-Zwaanswijk-Advocaten', ext: 'svg' },
                { name: 'Webike-Amsterdam', ext: 'svg' },
                { name: 'ASN-autoschade', ext: 'svg' },
                { name: 'De-Smaak-van-Italie', ext: 'svg' },
                { name: 'InterDam', ext: 'png' },
                { name: 'Forteiland-Pampus', ext: 'svg' },
                { name: 'Sec-Arbeidsrecht-Advocaten', ext: 'svg' },
                { name: 'Farber-Zwaanswijk-Advocaten', ext: 'svg' },
                { name: 'Webike-Amsterdam', ext: 'svg' },
              ].map((logo, i) => (
                <Image
                  key={`bottom-${i}`}
                  src={`/${logo.name}.${logo.ext}`}
                  alt={logo.name.replace(/-/g, ' ')}
                  width={200}
                  height={80}
                  className="h-16 md:h-20 w-auto flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====== PLATFORM OVERVIEW: Ontdekken → Analyseren → Optimaliseren ====== */}
{/* REPLACES the old "Hoe het werkt" section (lines ~655-748 in Homepage.jsx) */}
{/* Keep the video section + theater mode code that was below it */}

      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {locale === 'nl' ? (
                <>Jouw complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI-zichtbaarheid platform</span></>
              ) : (
                <>Your complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI visibility platform</span></>
              )}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">
              {locale === 'nl'
                ? '6 tools die samenwerken. Van eerste check tot structurele optimalisatie.'
                : '6 tools working together. From first check to structural optimization.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">

            {/* ── CARD 1: ONTDEKKEN ── */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {locale === 'nl' ? 'Ontdekken' : 'Discover'}
                  </h3>
                </div>
                <span className="text-3xl font-bold text-slate-200">01</span>
              </div>

              {/* Mini UI mockup */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">AI Visibility Scan</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      {locale === 'nl' ? 'Jouw merk gevonden in' : 'Your brand found in'}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">7/10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      {locale === 'nl' ? 'Concurrent gevonden in' : 'Competitor found in'}
                    </span>
                    <span className="text-sm font-bold text-slate-400">9/10</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500">Visibility score</span>
                      <span className="text-sm font-bold text-emerald-600">68%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-medium">AI Visibility Scan</span>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-medium">Brand Check</span>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed">
                {locale === 'nl'
                  ? 'Check direct of AI-zoekmachines jouw bedrijf aanbevelen. Op ChatGPT, Perplexity, Google AI Mode en AI Overviews.'
                  : 'Instantly check if AI search engines recommend your business. On ChatGPT, Perplexity, Google AI Mode and AI Overviews.'}
              </p>
            </div>

            {/* ── CARD 2: ANALYSEREN & TRACKEN ── */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M3 3v18h18" />
                      <path d="M7 16l4-8 4 4 4-6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {locale === 'nl' ? 'Analyseren & tracken' : 'Analyze & track'}
                  </h3>
                </div>
                <span className="text-3xl font-bold text-slate-200">02</span>
              </div>

              {/* Mini UI mockup */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">AI Rank Tracker</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { pos: 1, name: locale === 'nl' ? 'Concurrent A' : 'Competitor A', platforms: 'ChatGPT + Perplexity', color: 'bg-amber-400', you: false },
                    { pos: 2, name: locale === 'nl' ? 'Jouw bedrijf' : 'Your business', platforms: 'ChatGPT', color: 'bg-emerald-500', you: true },
                    { pos: 3, name: locale === 'nl' ? 'Concurrent B' : 'Competitor B', platforms: 'Perplexity', color: 'bg-slate-400', you: false },
                  ].map((item) => (
                    <div key={item.pos} className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full ${item.color} text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
                        {item.pos}
                      </span>
                      <span className={`text-xs flex-1 ${item.you ? 'font-bold text-blue-600' : 'text-slate-700'}`}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.platforms}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {locale === 'nl' ? 'Wekelijks automatisch' : 'Weekly automatic'}
                  </span>
                  <span className="text-[10px] font-medium text-blue-600">
                    {locale === 'nl' ? '50 keywords (Pro)' : '50 keywords (Pro)'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">AI Rank Tracker</span>
                <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">GEO Audit</span>
                <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">Prompt Explorer</span>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed">
                {locale === 'nl'
                  ? 'Volg je AI-rankings wekelijks op alle platformen. Ontdek welke prompts klanten gebruiken en audit je technische GEO-score.'
                  : 'Track your AI rankings weekly across all platforms. Discover which prompts customers use and audit your technical GEO score.'}
              </p>
            </div>

            {/* ── CARD 3: OPTIMALISEREN ── */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {locale === 'nl' ? 'Optimaliseren' : 'Optimize'}
                  </h3>
                </div>
                <span className="text-3xl font-bold text-slate-200">03</span>
              </div>

              {/* Mini UI mockup */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">GEO {locale === 'nl' ? 'Optimalisatie' : 'Optimization'} DIY</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: locale === 'nl' ? 'Schema markup toevoegen' : 'Add schema markup', done: true },
                    { label: locale === 'nl' ? 'Google Reviews verbeteren' : 'Improve Google Reviews', done: true },
                    { label: locale === 'nl' ? 'Autoriteit blogpost schrijven' : 'Write authority blog post', done: false },
                    { label: locale === 'nl' ? 'Vergelijkingspagina maken' : 'Create comparison page', done: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] ${
                        item.done
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {item.done ? '✓' : '○'}
                      </span>
                      <span className={`text-xs ${item.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Visibility lift</span>
                  <span className="text-sm font-bold text-emerald-600">+18%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-medium">GEO {locale === 'nl' ? 'Optimalisatie' : 'Optimization'} DIY</span>
                <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-medium">{locale === 'nl' ? 'AI-advies per pagina' : 'AI advice per page'}</span>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed">
                {locale === 'nl'
                  ? 'Krijg concrete aanbevelingen per pagina. Zelf doen met DIY, of laat OnlineLabs het voor je regelen.'
                  : 'Get concrete recommendations per page. Do it yourself with DIY, or let OnlineLabs handle it for you.'}
              </p>
            </div>
          </div>

          {/* CTA below cards */}
          <div className="mt-12 text-center">
            <p className="text-slate-500 mb-6">
              {locale === 'nl'
                ? 'Alle tools zijn gratis te gebruiken. Upgrade naar Pro voor automatische tracking en onbeperkt gebruik.'
                : 'All tools are free to use. Upgrade to Pro for automatic tracking and unlimited use.'}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/tools/ai-visibility"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                {locale === 'nl' ? 'Gratis scan starten' : 'Start free scan'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:shadow-md hover:border-slate-300 transition-all"
              >
                {locale === 'nl' ? 'Bekijk Pro' : 'View Pro'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Demo Video - kept from original */}
          <div className="mt-16 max-w-4xl mx-auto">
            <p className="text-center text-sm font-medium text-slate-500 mb-4">
              {locale === 'nl' ? '▶ Bekijk de scan in actie (2,5x versneld)' : '▶ See the scan in action (2.5x speed)'}
            </p>
            <div className={`rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 aspect-video relative ${videoTheater ? 'invisible' : ''}`}>
              {!videoPlaying ? (
                <button
                  onClick={() => setVideoPlaying(true)}
                  className="absolute inset-0 w-full h-full cursor-pointer group"
                >
                  <Image
                    src="/Teun.ai-AI-zichtbaarheidsanalyse-poster.webp"
                    alt={locale === 'nl' ? 'AI Zichtbaarheid Scan demo' : 'AI Visibility Scan demo'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 896px) 100vw, 896px"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/90 group-hover:bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
                      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#292956] ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              ) : videoMounted && !videoTheater && (
                <div className="relative w-full h-full">
                  <video autoPlay controls controlsList="nofullscreen" playsInline className="w-full h-full" onPlay={(e) => { e.target.playbackRate = 2.5 }}>
                    <source src="/Teun.ai-AI-zichtbaarheidsanalyse.mp4" type="video/mp4" />
                  </video>
                  <button onClick={() => setVideoTheater(true)} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer flex items-center gap-1.5" title="Theater modus">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Theater mode overlay - kept from original */}
          {videoTheater && (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-8">
              <button onClick={() => setVideoTheater(false)} className="absolute top-4 right-4 text-white/70 hover:text-white z-50 cursor-pointer">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="rounded-xl overflow-hidden aspect-video w-full max-w-6xl">
                <video autoPlay controls controlsList="nofullscreen" playsInline className="w-full h-full" onPlay={(e) => { e.target.playbackRate = 2.5 }}>
                  <source src="/Teun.ai-AI-zichtbaarheidsanalyse.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ====== CHATGPT DEMO ====== */}
      <section className="py-20 bg-gradient-to-br from-slate-100 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
              {t('chatDemo.title')}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{t('chatDemo.titleHighlight')}</span>
            </h2>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto mb-12">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 flex-1 shadow-sm">
                <p className="text-slate-700">{t('chatDemo.userPrompt')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                <Image src="/ChatGPT_logo.svg" alt="ChatGPT" width={40} height={40} className="w-10 h-10" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 flex-1 shadow-sm">
                <p className="text-slate-700">{t('chatDemo.aiResponse')}</p>
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-sm text-center">
                    {t('chatDemo.aiQuestion')}<br />
                    <span className="text-slate-900 font-medium">{t('chatDemo.aiQuestionBold')}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mb-10">
            <p className="text-slate-600 text-lg">
              {t('chatDemo.insight')}<br />
              <span className="text-slate-900 font-medium">{t('chatDemo.insightBold')}</span>
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-10 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900 mb-1">{t('accountFeatures.platforms')}</p>
                <p className="text-slate-500 text-sm">{t('accountFeatures.platformsDescription')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 mb-1">{t('accountFeatures.scoreTracking')}</p>
                <p className="text-slate-500 text-sm">{t('accountFeatures.scoreTrackingDescription')}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
                <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-full text-purple-700 text-xs font-medium">
                  {t('accountFeatures.uniqueLabel')}
                </span>
                <div>
                  <p className="text-xl font-bold text-slate-900">{t('accountFeatures.dashboardTitle')}</p>
                  <p className="text-slate-500 text-sm">{t('accountFeatures.dashboardDescription')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                {t('cta.button')}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-lg hover:shadow-md hover:border-slate-300 transition-all"
              >
                {locale === 'nl' ? 'Vanaf €29,95/mnd' : 'From €29.95/mo'}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
            <p className="text-slate-400 text-sm mt-4">
              {t('cta.subtext')}
            </p>
          </div>

        </div>
      </section>

      {/* ====== FAQ SECTION ====== */}
      <section className="py-20 bg-slate-50 relative overflow-visible">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="space-y-4">
                {faqItems.map((faq, i) => (
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
                          {faq.question}
                        </span>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === i ? 'rotate-45' : ''}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-6 pb-6 pt-0">
                        <p className="text-slate-600 pl-10">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex justify-center items-end relative">
              <div className="translate-y-20" style={{ marginTop: '94px' }}>
                <Image
                  src="/teun-ai-mascotte.png"
                  alt={locale === 'nl' ? 'Teun helpt je' : 'Teun helps you'}
                  width={420}
                  height={530}
                  className="drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* URL Warning Modal */}
      {showUrlWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUrlWarning(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowUrlWarning(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>

            <p className="text-xl font-bold text-slate-900 mb-2">{t('urlModal.title')}</p>
            <p className="text-slate-600 mb-4">{t('urlModal.description')}</p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-blue-800 mb-2">{t('urlModal.whatWeScan')}</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {t('urlModal.scanItem1')}</li>
                <li>• {t('urlModal.scanItem2')}</li>
                <li>• {t('urlModal.scanItem3')}</li>
                <li>• {t('urlModal.scanItem4')}</li>
              </ul>
            </div>

            <div className="mb-6">
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value.toLowerCase()})}
                placeholder={t('form.websitePlaceholder')}
                className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (formData.website && formData.website.trim()) {
                    proceedToScan();
                  }
                }}
                disabled={!formData.website || !formData.website.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('urlModal.scanWithAnalysis')}
              </button>
              <button
                onClick={proceedToScan}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer text-sm"
              >
                {t('urlModal.continueWithout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
