// app/tools/ai-visibility/page.js
// ✅ COMPLETE VERSION with URL Parameter Handling for OnlineLabs Integration
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, TrendingUp, Zap, CheckCircle2, AlertCircle, Loader2, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import FeedbackWidget from '@/app/components/FeedbackWidget';

function AIVisibilityToolContent() {
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referralSource, setReferralSource] = useState(null);
  const [fromHomepage, setFromHomepage] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyCategory: '',
    queries: ''
  });
  const [customPrompts, setCustomPrompts] = useState(null); // Pre-made prompts from dashboard

  // ✨ Advanced Settings State
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [excludeTermsInput, setExcludeTermsInput] = useState('');
  const [includeTermsInput, setIncludeTermsInput] = useState('');
  const [locationTermsInput, setLocationTermsInput] = useState('');

  // ✨ Handle URL Parameters from OnlineLabs
  useEffect(() => {
    if (!searchParams) return;

    const company = searchParams.get('company');
    const category = searchParams.get('category');
    const keywords = searchParams.get('keywords');
    const websiteParam = searchParams.get('website');
    const exclude = searchParams.get('exclude');
    const include = searchParams.get('include');
    const location = searchParams.get('location');
    const ref = searchParams.get('ref');
    const autostart = searchParams.get('autostart');
    const customPromptsFlag = searchParams.get('customPrompts');

    // Track referral source
    if (ref) {
      setReferralSource(ref);
      console.log('📍 Referral source:', ref);
    }

    // Handle custom prompts from dashboard (bewerkte prompts)
    if (customPromptsFlag === 'true') {
      try {
        const storedPrompts = sessionStorage.getItem('teun_custom_prompts');
        if (storedPrompts) {
          const parsedPrompts = JSON.parse(storedPrompts);
          console.log('📝 Custom prompts loaded:', parsedPrompts.length);
          
          // Pre-fill form data
          setFormData(prev => ({
            ...prev,
            companyName: company || prev.companyName,
            companyCategory: category || prev.companyCategory
          }));
          
          // Store custom prompts in state
          setCustomPrompts(parsedPrompts);
          
          // Skip to step 3 (scan) with prompts ready
          setStep(3);
          
          // Clear sessionStorage
          sessionStorage.removeItem('teun_custom_prompts');
          
          return; // Don't process other params
        }
      } catch (e) {
        console.error('Error loading custom prompts:', e);
      }
    }

    // Pre-fill form data
    if (company || category || keywords) {
      setFormData(prev => ({
        ...prev,
        companyName: company || prev.companyName,
        companyCategory: category || prev.companyCategory,
        queries: keywords || prev.queries,
        website: websiteParam || prev.website
      }));
    }

    // Pre-fill advanced settings
    if (exclude) {
      setExcludeTermsInput(exclude);
      setShowAdvancedSettings(true);
    }
    if (include) {
      setIncludeTermsInput(include);
      setShowAdvancedSettings(true);
    }
    if (location) {
      setLocationTermsInput(location);
      setShowAdvancedSettings(true);
    }

    // Auto-navigate to step 3 if company and category are provided
    if (company && category) {
      setStep(3);
      
      // Auto-start analysis if requested (from homepage)
      if (autostart === 'true') {
        setFromHomepage(true);
      }
    } else if (keywords) {
      // If only keywords provided, go to step 2
      setStep(2);
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✨ Stop bounce animation after 4 seconds
  useEffect(() => {
    if (fromHomepage) {
      const timer = setTimeout(() => {
        setFromHomepage(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [fromHomepage]);

  // ✨ Helper Functions for Advanced Settings
  const addExcludeTerms = (newTerms) => {
    const current = excludeTermsInput.split(',').map(t => t.trim()).filter(t => t);
    const toAdd = Array.isArray(newTerms) ? newTerms : newTerms.split(',').map(t => t.trim()).filter(t => t);
    const combined = [...new Set([...current, ...toAdd])];
    setExcludeTermsInput(combined.join(', '));
  };

  const addIncludeTerms = (newTerms) => {
    const current = includeTermsInput.split(',').map(t => t.trim()).filter(t => t);
    const toAdd = Array.isArray(newTerms) ? newTerms : newTerms.split(',').map(t => t.trim()).filter(t => t);
    const combined = [...new Set([...current, ...toAdd])];
    setIncludeTermsInput(combined.join(', '));
  };

  const addLocationTerms = (newTerms) => {
    const current = locationTermsInput.split(',').map(t => t.trim()).filter(t => t);
    const toAdd = Array.isArray(newTerms) ? newTerms : newTerms.split(',').map(t => t.trim()).filter(t => t);
    const combined = [...new Set([...current, ...toAdd])];
    setLocationTermsInput(combined.join(', '));
  };

  const getCustomTerms = () => {
    const exclude = excludeTermsInput.split(',').map(t => t.trim()).filter(t => t);
    const include = includeTermsInput.split(',').map(t => t.trim()).filter(t => t);
    const location = locationTermsInput.split(',').map(t => t.trim()).filter(t => t);
    
    return (exclude.length > 0 || include.length > 0 || location.length > 0)
      ? { exclude, include, location }
      : null;
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setCurrentStep('Voorbereiden...');

    try {
      const queriesArray = formData.queries
        .split(/[,\n]/)
        .map(q => q.trim())
        .filter(q => q.length > 0);

      setProgress(5);
      
      // Use custom prompts if available, otherwise use default count
      const hasCustomPrompts = customPrompts && customPrompts.length > 0;
      const totalPrompts = hasCustomPrompts ? customPrompts.length : (user ? 10 : 5);
      
      if (hasCustomPrompts) {
        setCurrentStep(`${totalPrompts} aangepaste prompts analyseren...`);
      } else {
        setCurrentStep('AI-prompts genereren...');
      }
      
      // ✅ FIXED PROGRESS INTERVAL
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const rounded = Math.floor(prev);
          
          if (rounded >= 97) return rounded;
          
          if (user) {
            // FOR 10 PROMPTS
            if (rounded < 10) return prev + 2;
            if (rounded < 25) return prev + 1;
            if (rounded < 50) return prev + 0.6;
            if (rounded < 70) return prev + 0.4;
            if (rounded < 85) return prev + 0.25;
            if (rounded < 92) return prev + 0.15;
            return prev + 0.08;
          } else {
            // FOR 5 PROMPTS
            if (rounded < 15) return prev + 2.5;
            if (rounded < 35) return prev + 1.2;
            if (rounded < 60) return prev + 0.7;
            if (rounded < 80) return prev + 0.4;
            if (rounded < 90) return prev + 0.25;
            return prev + 0.12;
          }
        });
      }, 1000);

      const stepInterval = setInterval(() => {
        setProgress(current => {
          const rounded = Math.floor(current);
          const estimatedPromptsProcessed = Math.floor((rounded / 100) * totalPrompts);
          
          if (rounded >= 10 && rounded < 20) {
            setCurrentStep('AI-prompts genereren...');
          } else if (rounded >= 20 && rounded < 97) {
            const currentPrompt = Math.min(estimatedPromptsProcessed, totalPrompts);
            setCurrentStep(`Analyseren met AI-zoekmachine (${currentPrompt}/${totalPrompts})...`);
          } else if (rounded >= 97) {
            setCurrentStep(`Resultaten verwerken (${totalPrompts}/${totalPrompts})...`);
          }
          return current;
        });
      }, 800);

      const response = await fetch('/api/ai-visibility-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          companyCategory: formData.companyCategory,
          identifiedQueriesSummary: queriesArray.length > 0 ? queriesArray : [],
          userId: user?.id || null,
          numberOfPrompts: totalPrompts,
          customTerms: getCustomTerms(),
          referralSource: referralSource,
          // Pass custom prompts if available (from dashboard edit)
          customPrompts: hasCustomPrompts ? customPrompts : null
        })
      });

      if (!response.ok) {
        clearInterval(progressInterval);
        clearInterval(stepInterval);
        const errorData = await response.json();
        throw new Error(errorData.error || 'Er is iets misgegaan');
      }

      const data = await response.json();
      
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      
      setProgress(100);
      setCurrentStep('Voltooid!');
      setResults(data);
      setCustomPrompts(null); // Clear custom prompts after analysis

      setTimeout(() => {
        setAnalyzing(false);
        setStep(4);
      }, 500);

    } catch (err) {
      setError(err.message);
      setAnalyzing(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50" suppressHydrationWarning>
      <div className="relative max-w-5xl mx-auto px-4 py-6 sm:py-12">
        
        {/* ✨ OnlineLabs Referral Banner */}
        {referralSource === 'onlinelabs' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">🔗</span>
              </div>
              <div>
                <p className="text-sm text-blue-200">
                  <strong>Via OnlineLabs</strong> – Je gegevens zijn automatisch ingevuld
                </p>
                <p className="text-xs text-gray-400">
                  Controleer de gegevens en start de analyse
                </p>
              </div>
            </div>
          </div>
        )}
        
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-slate-900 leading-tight px-4">
            AI Zichtbaarheidsanalyse
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4">
            Ontdek hoe AI-modellen jouw bedrijf vermelden bij commerciële zoekvragen
          </p>
        </header>

        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8 flex-wrap px-2">
          {[
            { num: 1, label: 'Zoekopdrachten', mobileLabel: 'Zoek' },
            { num: 2, label: 'Bedrijfsinfo', mobileLabel: 'Info' },
            { num: 3, label: 'Analyse', mobileLabel: 'Analyse' },
            { num: 4, label: 'Rapport', mobileLabel: 'Rapport' }
          ].map(({ num, label, mobileLabel }) => (
            <div
              key={num}
              className={'px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition ' + (
                step === num
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                  : step > num
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              <span className="hidden sm:inline">{num}. {label}</span>
              <span className="sm:hidden">{num}. {mobileLabel}</span>
            </div>
          ))}
        </div>

        <section className={`rounded-3xl p-6 sm:p-8 shadow-xl mb-8 ${
          step === 4 
            ? 'bg-white border border-slate-200' 
            : 'bg-gradient-to-br from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] border border-slate-700 text-white'
        }`}>
          
          {step === 1 && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Content - 2 columns */}
              <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                  <Search className="w-5 h-5 text-blue-300" />
                </div>
                <h2 className="text-2xl font-bold">1. Geef belangrijkste zoekwoorden op</h2>
              </div>

              <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <strong>Tip: Eerste zoekwoord is het belangrijkst</strong>
                    <p className="mt-1 text-blue-100">
                      Dit wordt gebruikt om relevante AI-prompts te genereren die matchen met waar jouw klanten naar zoeken.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm text-gray-300 font-medium block">
                  Zoekwoorden <span className="text-purple-400">*</span>
                </label>
                <p className="text-xs text-gray-400 -mt-1 mb-2">
                  Hoe specifieker, hoe beter de prompts
                </p>
                <textarea
                  value={formData.queries}
                  onChange={(e) => setFormData({ ...formData, queries: e.target.value })}
                  placeholder="Bijv: SEO bureau Amsterdam, Online marketing, Google Ads specialist"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none min-h-[80px] resize-y"
                />
              </div>

              {/* ✨ Advanced Settings Section */}
              <div className="mt-6 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center border border-purple-400/30 group-hover:border-purple-400/50 transition-all">
                      <span className="text-xl">⚙️</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white">Geavanceerde Instellingen</div>
                      <div className="text-xs text-gray-400">Bepaal welke woorden AI gebruikt (optioneel)</div>
                    </div>
                  </div>
                  <div className="text-purple-300">
                    {showAdvancedSettings ? '▼' : '▶'}
                  </div>
                </button>

                {showAdvancedSettings && (
                  <div className="mt-4 space-y-4 bg-white/5 rounded-lg p-4 border border-white/10">
                    
                    {/* Info Banner */}
                    <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-300 flex-shrink-0">ℹ️</span>
                        <div className="text-sm text-blue-200">
                          <strong>Optioneel:</strong> Pas aan welke woorden AI gebruikt bij het maken van prompts. 
                          Klik op voorbeelden om ze toe te voegen, of typ je eigen woorden (gescheiden door komma&apos;s).
                        </div>
                      </div>
                    </div>

                    {/* Preset Examples */}
                    <div className="space-y-3">
                      <label className="text-sm text-gray-300 font-medium block">
                        🎯 Klik op voorbeelden om toe te voegen:
                      </label>
                      
                      {/* Premium Examples */}
                      <div className="space-y-2">
                        <div className="text-xs text-purple-300 font-semibold">💎 Premium Positionering:</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addIncludeTerms(['premium', 'hoogwaardig', 'exclusief'])}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-xs font-medium transition-all border border-green-400/30"
                          >
                            + premium, hoogwaardig, exclusief
                          </button>
                          <button
                            type="button"
                            onClick={() => addIncludeTerms(['gespecialiseerd', 'ervaren', 'deskundig'])}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-xs font-medium transition-all border border-green-400/30"
                          >
                            + gespecialiseerd, ervaren, deskundig
                          </button>
                          <button
                            type="button"
                            onClick={() => addExcludeTerms(['goedkoop', 'budget', 'korting'])}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-xs font-medium transition-all border border-red-400/30"
                          >
                            − goedkoop, budget, korting
                          </button>
                        </div>
                      </div>

                      {/* Local Service Examples */}
                      <div className="space-y-2">
                        <div className="text-xs text-blue-300 font-semibold">📍 Lokale Service:</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addLocationTerms(['Amsterdam', 'Rotterdam', 'Utrecht'])}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg text-xs font-medium transition-all border border-blue-400/30"
                          >
                            + Amsterdam, Rotterdam, Utrecht
                          </button>
                          <button
                            type="button"
                            onClick={() => addLocationTerms(['landelijk actief', 'in Nederland'])}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg text-xs font-medium transition-all border border-blue-400/30"
                          >
                            + landelijk actief, in Nederland
                          </button>
                          <button
                            type="button"
                            onClick={() => addIncludeTerms(['lokaal', 'in de buurt', 'regio'])}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-xs font-medium transition-all border border-green-400/30"
                          >
                            + lokaal, in de buurt, regio
                          </button>
                        </div>
                      </div>

                      {/* Service Quality Examples */}
                      <div className="space-y-2">
                        <div className="text-xs text-indigo-300 font-semibold">⭐ Service Kwaliteit:</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addIncludeTerms(['24/7 bereikbaar', 'spoedservice', 'direct beschikbaar'])}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-xs font-medium transition-all border border-green-400/30"
                          >
                            + 24/7, spoedservice, direct
                          </button>
                          <button
                            type="button"
                            onClick={() => addIncludeTerms(['transparant', 'vast tarief', 'duidelijke offerte'])}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-xs font-medium transition-all border border-green-400/30"
                          >
                            + transparant, vast tarief, duidelijk
                          </button>
                        </div>
                      </div>

                      {/* Reset Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setExcludeTermsInput('');
                          setIncludeTermsInput('');
                          setLocationTermsInput('');
                        }}
                        className="px-3 py-1.5 bg-gray-500/20 hover:bg-gray-500/30 text-gray-200 rounded-lg text-xs font-medium transition-all border border-gray-400/30"
                      >
                        🔄 Alles wissen
                      </button>
                    </div>

                    {/* Input Fields */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      
                      {/* Exclude Input */}
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300 font-medium flex items-center gap-2">
                          <span className="text-red-400">❌</span>
                          Vermijd deze woorden (optioneel)
                        </label>
                        <input
                          type="text"
                          value={excludeTermsInput}
                          onChange={(e) => setExcludeTermsInput(e.target.value)}
                          placeholder="Bijv: goedkoop, budget, korting"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-red-400/50 focus:outline-none text-sm"
                        />
                        <div className="text-xs text-gray-400">
                          Scheid met komma&apos;s. Deze termen worden uitgesloten bij het maken van prompts.
                        </div>
                      </div>

                      {/* Include Input */}
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300 font-medium flex items-center gap-2">
                          <span className="text-green-400">✅</span>
                          Gebruik deze woorden (optioneel)
                        </label>
                        <input
                          type="text"
                          value={includeTermsInput}
                          onChange={(e) => setIncludeTermsInput(e.target.value)}
                          placeholder="Bijv: gespecialiseerd, ervaren, premium"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-green-400/50 focus:outline-none text-sm"
                        />
                        <div className="text-xs text-gray-400">
                          AI zal deze termen proberen te gebruiken in de gegenereerde prompts.
                        </div>
                      </div>

                      {/* Location Input */}
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300 font-medium flex items-center gap-2">
                          <span className="text-blue-400">📍</span>
                          Locatie-focus (optioneel)
                        </label>
                        <input
                          type="text"
                          value={locationTermsInput}
                          onChange={(e) => setLocationTermsInput(e.target.value)}
                          placeholder="Bijv: Amsterdam, landelijk actief, regio Utrecht"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-400/50 focus:outline-none text-sm"
                        />
                        <div className="text-xs text-gray-400">
                          Locatie-specifieke termen om in prompts te gebruiken.
                        </div>
                      </div>

                    </div>

                    {/* Preview */}
                    {(excludeTermsInput || includeTermsInput || locationTermsInput) && (
                      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                        <div className="text-xs text-purple-200 font-semibold mb-2">📋 Actieve Instellingen:</div>
                        <div className="space-y-1 text-xs">
                          {excludeTermsInput && (
                            <div className="flex items-start gap-2">
                              <span className="text-red-400">❌</span>
                              <span className="text-gray-300">{excludeTermsInput}</span>
                            </div>
                          )}
                          {includeTermsInput && (
                            <div className="flex items-start gap-2">
                              <span className="text-green-400">✅</span>
                              <span className="text-gray-300">{includeTermsInput}</span>
                            </div>
                          )}
                          {locationTermsInput && (
                            <div className="flex items-start gap-2">
                              <span className="text-blue-400">📍</span>
                              <span className="text-gray-300">{locationTermsInput}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Mobiele Teun */}
              <div className="flex lg:hidden justify-center mb-4">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt="Teun"
                  width={100}
                  height={125}
                  className="drop-shadow-lg opacity-80"
                />
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg cursor-pointer"
                >
                  Volgende →
                </button>
              </div>
              </div>

              {/* Right: Teun Mascotte - Desktop */}
              <div className="hidden lg:flex flex-col items-center justify-center">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt="Teun helpt je zoekwoorden kiezen"
                  width={280}
                  height={350}
                  className="drop-shadow-2xl"
                />
                <p className="text-sm text-gray-400 mt-4 text-center">
                  Welke zoekwoorden<br />gebruiken jouw klanten?
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Content - 2 columns */}
              <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center border border-purple-400/30">
                  <TrendingUp className="w-5 h-5 text-purple-300" />
                </div>
                <h2 className="text-2xl font-bold">2. Bedrijfsinfo</h2>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300 font-medium block">
                    Bedrijfsnaam *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Bijv: OnlineLabs"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300 font-medium block">
                    Categorie/Branche *
                  </label>
                  <input
                    type="text"
                    value={formData.companyCategory}
                    onChange={(e) => setFormData({ ...formData, companyCategory: e.target.value })}
                    placeholder="Bijv: Online marketing bureau, SEO bureau, Webdesign bureau"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Mobiele Teun */}
              <div className="flex lg:hidden justify-center mb-4">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt="Teun"
                  width={100}
                  height={125}
                  className="drop-shadow-lg opacity-80"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition cursor-pointer"
                >
                  ← Terug
                </button>
                <button
                  onClick={() => {
                    if (!formData.companyName || !formData.companyCategory) {
                      setError('Vul alle verplichte velden in');
                      return;
                    }
                    setError(null);
                    setStep(3);
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg cursor-pointer"
                >
                  Volgende →
                </button>
              </div>
              </div>

              {/* Right: Teun Mascotte - Desktop */}
              <div className="hidden lg:flex flex-col items-center justify-center">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt="Teun wacht op je bedrijfsinfo"
                  width={280}
                  height={350}
                  className="drop-shadow-2xl"
                />
                <p className="text-sm text-gray-400 mt-4 text-center">
                  Vertel me over<br />jouw bedrijf!
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Content - 2 columns */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex items-center justify-center border border-yellow-400/30">
                    <Zap className="w-5 h-5 text-yellow-300" />
                  </div>
                  <h2 className="text-2xl font-bold">3. Start de Analyse</h2>
                </div>

                {analyzing ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-2 border-purple-400/40 rounded-2xl p-6 text-center">
                      <Loader2 className="w-12 h-12 text-purple-300 mx-auto mb-4 animate-spin" />
                      <h3 className="text-xl font-bold text-white mb-2">Bezig met analyseren...</h3>
                      <p className="text-purple-200 mb-4">{currentStep}</p>
                      
                      <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden border border-white/20">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 transition-all duration-300 flex items-center justify-end pr-2"
                          style={{ width: `${Math.floor(progress)}%` }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-lg">
                            {Math.floor(progress)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress >= 20 ? 'text-green-300' : progress > 10 ? 'text-purple-300' : 'text-gray-500')}>
                        {progress >= 20 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>{customPrompts ? 'Aangepaste prompts voorbereiden...' : 'Commerciële AI-prompts genereren...'}</span>
                      </div>
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress >= 90 ? 'text-green-300' : progress > 20 ? 'text-purple-300' : 'text-gray-500')}>
                        {progress >= 90 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>Analyseren via geavanceerde AI-zoekmachine...</span>
                      </div>
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress === 100 ? 'text-green-300' : progress > 90 ? 'text-purple-300' : 'text-gray-500')}>
                        {progress === 100 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>Resultaten verwerken en rapport genereren...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-2 text-sm border border-white/10">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bedrijfsnaam:</span>
                        <span className="text-white font-medium">{formData.companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Categorie:</span>
                        <span className="text-white font-medium">{formData.companyCategory}</span>
                      </div>
                      {formData.queries && !customPrompts && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Belangrijkste zoekwoord:</span>
                          <span className="text-white font-medium">
                            {formData.queries.split(/[,\n]/)[0]?.trim() || 'Geen opgegeven'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Te analyseren:</span>
                        <span className="text-white font-medium">
                          {customPrompts ? `${customPrompts.length} aangepaste prompts` : `${user ? '10' : '5'} AI-prompts`}
                        </span>
                      </div>
                      {referralSource && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bron:</span>
                          <span className="text-blue-300 font-medium capitalize">{referralSource}</span>
                        </div>
                      )}
                    </div>

                    {/* ✨ Show Custom Prompts from Dashboard */}
                    {customPrompts && customPrompts.length > 0 && (
                      <div className="bg-purple-500/20 border border-purple-400/40 rounded-xl p-4 mb-6">
                        <div className="text-sm text-purple-200 font-semibold mb-3 flex items-center gap-2">
                          <span>📝</span>
                          <span>Aangepaste prompts ({customPrompts.length}):</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {customPrompts.map((prompt, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-purple-300 flex-shrink-0 w-5">{idx + 1}.</span>
                              <span className="text-gray-300">{prompt}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setCustomPrompts(null)}
                          className="mt-3 text-xs text-purple-300 hover:text-purple-200 underline"
                        >
                          Annuleer en genereer nieuwe prompts
                        </button>
                      </div>
                    )}

                    {/* ✨ Show Advanced Settings in Step 3 */}
                    {(excludeTermsInput || includeTermsInput || locationTermsInput) && (
                      <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4 mb-6">
                        <div className="text-sm text-purple-200 font-semibold mb-3 flex items-center gap-2">
                          <span>⚙️</span>
                          <span>Geavanceerde Instellingen:</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          {excludeTermsInput && (
                            <div className="flex items-start gap-2">
                              <span className="text-red-400 flex-shrink-0">❌ Vermijd:</span>
                              <span className="text-gray-300">{excludeTermsInput}</span>
                            </div>
                          )}
                          {includeTermsInput && (
                            <div className="flex items-start gap-2">
                              <span className="text-green-400 flex-shrink-0">✅ Gebruik:</span>
                              <span className="text-gray-300">{includeTermsInput}</span>
                            </div>
                          )}
                          {locationTermsInput && (
                            <div className="flex items-start gap-2">
                              <span className="text-blue-400 flex-shrink-0">📍 Locatie:</span>
                              <span className="text-gray-300">{locationTermsInput}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setStep(2)}
                        className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition cursor-pointer"
                      >
                        ← Terug
                      </button>
                      <button
                        onClick={() => {
                          setFromHomepage(false);
                          handleAnalyze();
                        }}
                        className={`px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg flex items-center gap-2 cursor-pointer ${fromHomepage ? 'animate-bounce' : ''}`}
                      >
                        <Zap className="w-5 h-5" />
                        Start Analyse
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Teun Mascotte */}
              <div className="hidden lg:flex flex-col items-center justify-center">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt="Teun helpt je analyseren"
                  width={280}
                  height={350}
                  className="drop-shadow-2xl"
                />
              </div>
            </div>
          )}

          {step === 4 && results && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Results - 2 columns */}
              <div className="lg:col-span-2">
                {/* Success Header */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 relative overflow-hidden">
                  {/* Teun Mascotte - Mobiel only */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 lg:hidden opacity-30 pointer-events-none">
                    <Image
                      src="/Teun-ai-blij-met-resultaat.png"
                      alt="Teun"
                      width={80}
                      height={100}
                      className="drop-shadow-lg"
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Analyse voltooid!</h2>
                      <p className="text-green-700 text-sm sm:text-base">Je AI-zichtbaarheidsrapport voor {formData.companyName}</p>
                    </div>
                  </div>
                </div>

                {/* Perplexity Badge */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#20B8CD] to-[#1AA3B3] rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800 text-sm sm:text-base">Perplexity AI</span>
                    </div>
                    <span className="text-xs sm:text-sm text-slate-600">
                      Realtime webscan met actuele bronnen
                    </span>
                  </div>
                </div>

                {/* ChatGPT Login Prompt - Alleen voor niet-ingelogde gebruikers */}
                {!user && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#10A37F] to-[#0D8A6A] rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.2 9.4c.4-1.2.2-2.5-.5-3.6-.7-1-1.8-1.7-3-1.9-.6-.1-1.2 0-1.8.2-.5-1.3-1.5-2.3-2.8-2.8-1.3-.5-2.8-.4-4 .3C9.4.6 8.2.2 7 .5c-1.2.3-2.3 1.1-2.9 2.2-.6 1.1-.7 2.4-.3 3.6-1.3.5-2.3 1.5-2.8 2.8s-.4 2.8.3 4c-1 .8-1.6 2-1.7 3.3-.1 1.3.4 2.6 1.4 3.5 1 .9 2.3 1.3 3.6 1.2.5 1.3 1.5 2.3 2.8 2.8 1.3.5 2.8.4 4-.3.8 1 2 1.6 3.3 1.7 1.3.1 2.6-.4 3.5-1.4.9-1 1.3-2.3 1.2-3.6 1.3-.5 2.3-1.5 2.8-2.8.5-1.3.4-2.8-.3-4 1-.8 1.6-2 1.7-3.3.1-1.3-.4-2.6-1.4-3.5z"/>
                          </svg>
                        </div>
                        <span className="font-semibold text-slate-800 text-sm sm:text-base">ChatGPT scan?</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs sm:text-sm text-slate-600">
                          Log in voor een extra ChatGPT analyse + toegang tot het dashboard
                        </span>
                      </div>
                      <Link 
                        href="/login"
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-green-600 transition whitespace-nowrap"
                      >
                        Inloggen
                      </Link>
                    </div>
                  </div>
                )}

                {/* Stats Cards - Responsive */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 text-center shadow-sm">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                      {results.total_company_mentions}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-medium leading-tight">
                      <span className="hidden sm:inline">Vermeldingen</span>
                      <span className="sm:hidden">Genoemd</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 text-center shadow-sm">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                      {results.analysis_results.length}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-medium leading-tight">
                      <span className="hidden sm:inline">AI Prompts</span>
                      <span className="sm:hidden">Prompts</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 text-center shadow-sm">
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">
                      {[...new Set(results.analysis_results.flatMap(r => r.competitors_mentioned || []))].length}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-medium leading-tight">
                      <span className="hidden sm:inline">Concurrenten</span>
                      <span className="sm:hidden">Concurrent</span>
                    </div>
                  </div>
                </div>

                {/* Results List */}
                <div className="space-y-3 mb-4 sm:mb-6">
                  {results.analysis_results.map((result, idx) => (
                    <div key={idx} className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 transition-all shadow-sm">
                      <div className="flex gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs sm:text-sm ${
                          result.company_mentioned
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-blue-700 mb-1 sm:mb-2 font-medium">{result.ai_prompt}</p>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{result.simulated_ai_response_snippet}</p>
                          {result.competitors_mentioned?.length > 0 && (
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 sm:mt-3">
                              <span className="text-[10px] sm:text-xs text-slate-500">Concurrenten:</span>
                              {result.competitors_mentioned.map((comp, i) => (
                                <span key={i} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                                  {comp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {result.company_mentioned && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Award className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <button
                    onClick={() => {
                      setStep(1);
                      setFormData({ companyName: '', companyCategory: '', queries: '' });
                      setExcludeTermsInput('');
                      setIncludeTermsInput('');
                      setLocationTermsInput('');
                      setResults(null);
                      setReferralSource(null);
                      setFromHomepage(false);
                    }}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:border-slate-400 hover:bg-slate-50 transition cursor-pointer text-sm sm:text-base"
                  >
                    🔄 Nieuwe analyse
                  </button>
                  <Link 
                    href="/"
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg transition text-center cursor-pointer text-sm sm:text-base"
                  >
                    ← Terug naar home
                  </Link>
                </div>

                {/* OnlineLabs Back Link */}
                {referralSource === 'onlinelabs' && (
                  <div className="mb-6">
                    <a 
                      href="https://onlinelabs.nl/skills/geo-optimalisatie"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition border border-blue-200 w-full justify-center"
                    >
                      ← Terug naar OnlineLabs GEO Optimalisatie
                    </a>
                  </div>
                )}

                <FeedbackWidget 
                  scanId={results?.scan_id || null}
                  companyName={formData.companyName}
                  totalMentions={results?.total_company_mentions || 0}
                />
              </div>

              {/* Right: Teun Mascotte */}
              <div className="hidden lg:flex flex-col items-center justify-start pt-8">
                <Image
                  src="/Teun-ai-blij-met-resultaat.png"
                  alt="Teun is blij met je resultaat!"
                  width={300}
                  height={380}
                  className="drop-shadow-2xl"
                />
                <div className="mt-4 text-center">
                  <p className="text-lg font-semibold text-slate-900">Goed bezig! 🎉</p>
                  <p className="text-sm text-slate-600">
                    {results.total_company_mentions > 0 
                      ? `Je bent ${results.total_company_mentions}x genoemd!` 
                      : 'Tijd om je AI-zichtbaarheid te verbeteren!'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* CTA tijdens scannen - buiten de scanner box */}
        {analyzing && (
          <div className="text-center mb-8">
            <p className="text-slate-600 mb-3">
              Wij helpen bedrijven om beter gevonden te worden in AI-zoekmachines
            </p>
            <a 
              href="https://www.onlinelabs.nl/skills/geo-optimalisatie"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-all cursor-pointer"
            >
              GEO optimalisatie →
            </a>
            <p className="text-slate-400 text-xs mt-2">
              Opent in een nieuwe tab – de scan blijft draaien
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <strong>Fout:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {!analyzing && (
          <div className="text-center">
            <p className="text-slate-500 mb-2">
              {user ? 'Ingelogd als ' + user.email : 'Meer analyses nodig?'}
            </p>
            {!user && (
              <>
                <p className="text-purple-600 text-sm mb-4">
                  ✨ Met een account krijg je 10 unieke prompts per scan
                </p>
                <Link 
                  href="/signup"
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700 transition cursor-pointer inline-block"
                >
                  Meld je aan voor meer scans
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function AIVisibilityTool() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    }>
      <AIVisibilityToolContent />
    </Suspense>
  );
}