'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { detectBranchLanguage } from '@/lib/branche-detect';

// ============================================
// HOMEPAGE COMPONENT - Teun.ai
// ============================================

export default function Homepage() {
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
  const [keywordTags, setKeywordTags] = useState([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const lastExtractedUrl = useRef('');

  // Auto-extract keywords when URL looks valid (has a dot, debounced 800ms)
  useEffect(() => {
    const url = formData.website?.trim();
    if (!url || !url.includes('.') || url === lastExtractedUrl.current || extractingKeywords) return;

    const timer = setTimeout(() => {
      lastExtractedUrl.current = url;
      handleExtractKeywords(url);
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.website]);

  // Sync keyword tags to formData.zoekwoorden
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

    setExtractingKeywords(true);

    try {
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) throw new Error('Kon website niet analyseren');
      const data = await response.json();

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
    
    // Wacht tot extractie klaar is
    if (extractingKeywords) return;
    
    proceedToScan();
  };

  const proceedToScan = () => {
    setShowKeywordWarning(false);
    setShowUrlWarning(false);
    
    // Bouw query params op (alleen niet-lege waarden)
    const params = new URLSearchParams();
    
    if (formData.bedrijfsnaam) params.set('company', formData.bedrijfsnaam);
    if (formData.branche) params.set('category', formData.branche);
    if (formData.website) params.set('website', formData.website);
    if (formData.zoekwoorden) params.set('keywords', formData.zoekwoorden);
    if (formData.servicegebied) params.set('location', formData.servicegebied);
    
    // Auto-start de scan als er een bedrijfsnaam is
    if (formData.bedrijfsnaam) {
      params.set('autostart', 'true');
    }
    
    // Redirect naar AI Visibility tool
    window.location.href = `/tools/ai-visibility?${params.toString()}`;
  };

  return (
    <div className="bg-white">
      {/* ====== HERO + STATS WRAPPER ====== */}
      <div className="relative overflow-hidden">
        {/* Hero Mascotte - Positioned over both sections */}
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
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-12 lg:pt-20">
            <div className="grid lg:grid-cols-5 gap-8 items-end">
              {/* Left: Content + Form - 3 columns */}
              <div className="lg:col-span-3 pb-12 lg:pb-24">
                <h1 className="text-[1.7rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-tight mb-6">
                  Hoe zichtbaar is jouw merk{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    in AI-zoekmachines?
                  </span>
                </h1>
                
                <p className="text-base sm:text-lg text-slate-600 mb-4">
                  Check of jouw bedrijf wordt aanbevolen door ChatGPT, Perplexity en Google.
                  <br />
                  <span className="font-medium text-slate-700">Gratis scan in 2 minuten.</span>
                </p>

                {/* AI Platform badges - matching ai-visibility page */}
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
                    AI Modus
                    <span className="text-[10px] text-slate-400">account</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    AI Overviews
                    <span className="text-[10px] text-slate-400">account</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">10 prompts per scan • 2x gratis zonder account • AI Modus & AI Overviews met gratis account</p>

                {/* Mobile Mascotte - above form */}
                <div className="lg:hidden flex justify-center">
                  <Image
                    src="/mascotte-teun-ai.png"
                    alt="Teun - AI Visibility Mascotte"
                    width={220}
                    height={280}
                    className="drop-shadow-xl"
                  />
                </div>

                {/* Scan Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                        Bedrijfsnaam *
                        <span className="relative" onClick={() => setActiveTooltip(activeTooltip === 'bedrijf' ? null : 'bedrijf')}>
                          <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {activeTooltip === 'bedrijf' && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50">
                              Zoals vermeld bij Google Bedrijfsprofiel
                            </span>
                          )}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.bedrijfsnaam}
                        onChange={(e) => setFormData({...formData, bedrijfsnaam: e.target.value})}
                        placeholder="Je bedrijfsnaam"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                        Branche *
                        <span className="relative" onClick={() => setActiveTooltip(activeTooltip === 'branche' ? null : 'branche')}>
                          <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {activeTooltip === 'branche' && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50">
                              Zoals vermeld bij Google Bedrijfsprofiel
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
                          setBrancheSuggestion(detectBranchLanguage(val));
                        }}
                        placeholder="Jouw branche"
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
                        Website *
                      </label>
                      <input
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        value={formData.website}
                        onChange={(e) => { setFormData({...formData, website: e.target.value.toLowerCase()}); setShowUrlWarning(false); }}
                        placeholder="jouwwebsite.nl"
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                          showUrlWarning && !formData.website?.trim()
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
                        }`}
                        required
                      />
                      {showUrlWarning && !formData.website?.trim() ? (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                          Website is nodig voor goede resultaten
                        </p>
                      ) : extractingKeywords ? (
                        <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1.5">
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Zoekwoorden ophalen...
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Servicegebied - compact inline */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                      📍 Servicegebied
                    </label>
                    <input
                      type="text"
                      value={formData.servicegebied}
                      onChange={(e) => setFormData({...formData, servicegebied: e.target.value})}
                      placeholder="bijv. Amsterdam, heel Nederland"
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Keyword Tags Panel - slides down after extraction */}
                  {(keywordTags.length > 0 || extractingKeywords) && (
                    <div className="transition-all duration-300 ease-in-out">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        {extractingKeywords ? (
                          <div className="flex items-center gap-3 py-1">
                            <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="text-sm text-slate-600">Website analyseren...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-slate-500">{keywordTags.length} zoekwoorden</span>
                              <button
                                type="button"
                                onClick={() => syncKeywordsToForm([])}
                                className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                Alles wissen
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
                            {/* Add keyword input */}
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
                                  placeholder="Zoekwoord toevoegen..."
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-xs text-slate-700 placeholder:text-slate-400 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => { addKeyword(newKeywordInput); setNewKeywordInput(''); }}
                                  disabled={!newKeywordInput.trim()}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  + Toevoegen
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Branche taaldetectie suggestie - compact voor homepage */}
                  {brancheSuggestion && (
                    <div className={`-mt-1 p-3 rounded-xl text-sm transition-all ${
                      brancheSuggestion.type === 'generic'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-blue-50 border border-blue-200'
                    }`}>
                      {brancheSuggestion.type === 'generic' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 flex-shrink-0">⚠️</span>
                          <p className="text-amber-800 text-xs">
                            Dit lijkt Engels. Gebruik een <strong>Nederlandse branchenaam</strong> voor betere AI-resultaten.
                          </p>
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
                    Start Gratis Scan →
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    Geen registratie nodig • 10 prompts per scan • Resultaat in ±2 min
                  </p>
                  
                  {/* Geavanceerde instellingen link */}
                  <div className="text-center mt-2">
                    <Link 
                      href="/tools/ai-visibility" 
                      className="text-xs text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Geavanceerde opties
                    </Link>
                  </div>
                </form>
              </div>

              {/* Placeholder for mascotte space */}
              <div className="hidden lg:block lg:col-span-2 min-h-[500px]"></div>
            </div>
          </div>
        </section>

        {/* ====== STATS BAR ====== */}
        <section className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] py-8 relative">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center items-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">2,847</div>
              <div className="text-sm text-white/70">Scans uitgevoerd</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">94%</div>
              <div className="text-sm text-white/70">Vindt nieuwe inzichten</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">4</div>
              <div className="text-sm text-white/70">AI-platforms gescand</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-1">Gratis</div>
              <div className="text-sm text-white/70">2x scannen zonder account</div>
            </div>
          </div>
        </div>
        </section>
      </div>
      {/* End of Hero + Stats Wrapper */}

      {/* ====== SOCIAL PROOF - Logo Slider ====== */}
      <section className="py-20 border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 mb-12">
          <p className="text-center text-slate-500 text-sm font-medium uppercase tracking-wider">
            Merken die ons vertrouwen
          </p>
        </div>
        
        {/* Dual Row Slider - Full Width */}
        <div className="space-y-8">
          {/* Top Row - Scrolls LEFT */}
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
                // Duplicates for seamless loop
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

          {/* Bottom Row - Scrolls RIGHT */}
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
                // Duplicates for seamless loop
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

        {/* CSS for infinite scroll animations */}
        {/* Slider CSS is in globals.css */}
      </section>

      {/* ====== HOE HET WERKT ====== */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Hoe het werkt
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-[#1E1E3F]">1.</div>
                <div>
                  <p className="text-xl font-bold text-slate-900 mb-2">
                    Vul je gegevens in
                  </p>
                  <p className="text-slate-600">
                    Bedrijfsnaam, branche en website. Wij halen automatisch zoekwoorden op en maken de prompts.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-[#1E1E3F]">2.</div>
                <div>
                  <p className="text-xl font-bold text-slate-900 mb-2">
                    We scannen 3 AI's
                  </p>
                  <p className="text-slate-600">
                    ChatGPT, Perplexity, AI Modus en AI Overviews worden realtime bevraagd.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-[#1E1E3F]">3.</div>
                <div>
                  <p className="text-xl font-bold text-slate-900 mb-2">
                    Ontvang je rapport
                  </p>
                  <p className="text-slate-600">
                    Zie welke prompts potentiële klanten gebruiken. Zie precies waar je wel en niet genoemd wordt, of je concurrentie.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== WHY CREATE AN ACCOUNT ====== */}
      <section className="py-20 bg-gradient-to-br from-slate-100 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
          
          {/* The question */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
              Wat antwoordt ChatGPT<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">als iemand naar jou zoekt?</span>
            </h2>
          </div>

          {/* The conversation */}
          <div className="space-y-6 max-w-2xl mx-auto mb-12">
            
            {/* User prompt */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 flex-1 shadow-sm">
                <p className="text-slate-700">"Kun je een goede [jouw branche] in [jouw stad] aanbevelen?"</p>
              </div>
            </div>

            {/* AI Response */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                <Image 
                  src="/ChatGPT_logo.svg" 
                  alt="ChatGPT" 
                  width={40} 
                  height={40}
                  className="w-10 h-10"
                />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 flex-1 shadow-sm">
                <p className="text-slate-700">"Natuurlijk! Hier zijn enkele opties die ik kan aanbevelen..."</p>
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-sm text-center">
                    Staat jouw bedrijf in dit lijstje?<br />
                    <span className="text-slate-900 font-medium">Of noemt AI alleen je concurrenten?</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* The insight */}
          <div className="text-center mb-10">
            <p className="text-slate-600 text-lg">
              Elke dag zoeken mensen via AI naar bedrijven zoals dat van jou.<br />
              <span className="text-slate-900 font-medium">Met een gratis account zie je precies waar je staat.</span>
            </p>
          </div>

          {/* What you get with account */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-10 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900 mb-1">4 platforms</p>
                <p className="text-slate-500 text-sm">ChatGPT, Perplexity, AI Modus & AI Overviews</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 mb-1">Score tracking</p>
                <p className="text-slate-500 text-sm">Volg je zichtbaarheid over tijd</p>
              </div>
            </div>
            
            {/* GEO Analyse - highlighted */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
                <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-full text-purple-700 text-xs font-medium">
                  UNIEK
                </span>
                <div>
                  <p className="text-xl font-bold text-slate-900">GEO Analyse Dashboard</p>
                  <p className="text-slate-500 text-sm">Zie waarom je wel of niet wordt aanbevolen — en wat je eraan kunt doen</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link 
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
            >
              Maak gratis account
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="text-slate-400 text-sm mt-4">
              Geen creditcard • Volledig gratis • Direct inzicht
            </p>
          </div>

        </div>
      </section>

      {/* ====== FAQ SECTION ====== */}
      <section className="py-20 bg-slate-50 relative overflow-visible">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: FAQ */}
            <div>
              <div className="space-y-4">
                {[
                  {
                    question: 'Hoe werkt Teun.AI precies?',
                    answer: 'Teun.AI scant hoe zichtbaar jouw bedrijf is in AI-zoekmachines zoals ChatGPT, Perplexity en Google. Je voert je bedrijfsgegevens in, wij genereren tot 10 commerciële prompts, en je ziet direct of je wordt aanbevolen.'
                  },
                  {
                    question: 'Wat kost Teun.AI?',
                    answer: 'Je kunt 2x gratis scannen zonder account met 10 prompts per scan op ChatGPT en Perplexity. Met een gratis account krijg je dagelijks scans, extra platforms (AI Modus & AI Overviews), je dashboard, en onze Chrome extensie.'
                  },
                  {
                    question: 'Is Teun.AI geschikt voor mijn bedrijf?',
                    answer: 'Teun.AI is geschikt voor elk bedrijf dat online zichtbaar wil zijn. Of je nu een MKB-bedrijf, startup of enterprise bent - als je klanten je via AI-zoekmachines moeten kunnen vinden, is Teun.AI voor jou.'
                  },
                  {
                    question: 'Hoe lang duurt het voordat ik resultaten zie?',
                    answer: 'Je scan resultaten zijn direct beschikbaar. Het verbeteren van je AI-zichtbaarheid is een proces dat tijd kost, maar met onze concrete tips kun je direct aan de slag.'
                  }
                ].map((faq, i) => (
                  <div 
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
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
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-6 pb-6 pt-0">
                        <p className="text-slate-600 pl-10">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Mascotte - overlapping footer */}
            <div className="hidden lg:flex justify-center items-end relative">
              <div className="translate-y-24">
                <Image
                  src="/teun-ai-mascotte.png"
                  alt="Teun helpt je"
                  width={420}
                  height={530}
                  className="drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* URL Warning Modal - Shown when no URL and no keywords */}
      {showUrlWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUrlWarning(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowUrlWarning(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>

            {/* Title */}
            <p className="text-xl font-bold text-slate-900 mb-2">Vul je website URL in</p>
            
            {/* Explanation */}
            <p className="text-slate-600 mb-4">
              Wij scannen je website en halen automatisch de juiste zoekwoorden op uit je pagina&apos;s, menu en diensten. Zo krijg je een veel nauwkeuriger resultaat.
            </p>

            {/* What we scan */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-blue-800 mb-2">🔍 Wat we automatisch scannen:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Meta titel &amp; beschrijving</li>
                <li>• H1 &amp; H2 koppen</li>
                <li>• Menu-items (diensten, producten)</li>
                <li>• Pagina-inhoud &amp; USP&apos;s</li>
              </ul>
            </div>

            {/* Inline URL input */}
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
                placeholder="jouwwebsite.nl"
                className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                autoFocus
              />
            </div>

            {/* Buttons */}
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
                Scan met website-analyse →
              </button>
              <button
                onClick={proceedToScan}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer text-sm"
              >
                Toch doorgaan zonder URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
