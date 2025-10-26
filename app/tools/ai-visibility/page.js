// app/tools/ai-visibility/page.js
// ✅ COMPLETE VERSION with Improved Advanced Settings - SYNTAX FIXED
'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp, Zap, BarChart3, CheckCircle2, AlertCircle, Loader2, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import FeedbackWidget from '@/app/components/FeedbackWidget';

export default function AIVisibilityTool() {
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyCategory: '',
    queries: ''
  });

  // ✨ Advanced Settings State
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [excludeTermsInput, setExcludeTermsInput] = useState('');
  const [includeTermsInput, setIncludeTermsInput] = useState('');
  const [locationTermsInput, setLocationTermsInput] = useState('');

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
      setCurrentStep('AI-prompts genereren...');

      const totalPrompts = user ? 10 : 5;
      
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
          customTerms: getCustomTerms()
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
    <div className="min-h-screen bg-gradient-to-b from-[#001233] via-[#1a0b3d] to-[#2d1654]" suppressHydrationWarning>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-12 text-white">
        
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 text-transparent bg-clip-text leading-tight px-4">
            AI Zichtbaarheidsanalyse
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 px-4">
            Ontdek hoe AI-modellen jouw bedrijf vermelden bij commerciële zoekvragen
          </p>
        </header>

        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {[
            { num: 1, label: 'Zoekopdrachten' },
            { num: 2, label: 'Bedrijfsinfo' },
            { num: 3, label: 'Analyse' },
            { num: 4, label: 'Rapport' }
          ].map(({ num, label }) => (
            <div
              key={num}
              className={'px-4 py-2 rounded-lg text-sm font-semibold transition ' + (
                step === num
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                  : step > num
                  ? 'bg-white/10 text-gray-400'
                  : 'bg-white/5 text-gray-500'
              )}
            >
              {num}. {label}
            </div>
          ))}
        </div>

        <section className="backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8">
          
          {step === 1 && (
            <div>
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
                  Zoekwoorden (optioneel)
                </label>
                <textarea
                  value={formData.queries}
                  onChange={(e) => setFormData({ ...formData, queries: e.target.value })}
                  placeholder="Bijv: Linnen gordijnen, Linnen gordijnen op maat, Inbetween gordijnen. Voer je belangrijkste zoekwoorden in, gescheiden door komma's of nieuwe regels"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none min-h-[120px] resize-y"
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
                          Klik op voorbeelden om ze toe te voegen, of typ je eigen woorden (gescheiden door komma's).
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
                          Scheid met komma's. Deze termen worden uitgesloten bij het maken van prompts.
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

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg"
                >
                  Volgende →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
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

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
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
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg"
                >
                  Volgende →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
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
                      <span>Commerciële AI-prompts genereren...</span>
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
                    {formData.queries && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Belangrijkste zoekwoord:</span>
                        <span className="text-white font-medium">
                          {formData.queries.split(/[,\n]/)[0]?.trim() || 'Geen opgegeven'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Te analyseren:</span>
                      <span className="text-white font-medium">{user ? '10' : '5'} AI-prompts</span>
                    </div>
                  </div>

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
                      className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
                    >
                      ← Terug
                    </button>
                    <button
                      onClick={handleAnalyze}
                      className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg flex items-center gap-2"
                    >
                      <Zap className="w-5 h-5" />
                      Start Analyse
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && results && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center border border-green-400/30">
                  <BarChart3 className="w-5 h-5 text-green-300" />
                </div>
                <h2 className="text-2xl font-bold">4. AI Zichtbaarheidsrapport</h2>
              </div>

              <div className="backdrop-blur-md bg-gradient-to-br from-green-600/30 via-green-500/20 to-emerald-600/30 border border-green-400/30 rounded-2xl p-6 text-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Analyse voltooid!</h3>
                <p className="text-green-100">Je AI-zichtbaarheidsrapport is klaar</p>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div className="backdrop-blur-sm border-2 border-purple-400/40 rounded-xl p-3 sm:p-4 text-center bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <div className="text-2xl sm:text-3xl font-bold mb-1 bg-gradient-to-br from-purple-300 via-blue-300 to-purple-200 bg-clip-text text-transparent">
                    {results.total_company_mentions}
                  </div>
                  <div className="text-[10px] sm:text-xs text-purple-200 uppercase tracking-wider font-semibold leading-tight">
                    VERMELDINGEN
                  </div>
                </div>
                <div className="backdrop-blur-sm border-2 border-purple-400/40 rounded-xl p-3 sm:p-4 text-center bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <div className="text-2xl sm:text-3xl font-bold mb-1 bg-gradient-to-br from-purple-300 via-blue-300 to-purple-200 bg-clip-text text-transparent">
                    {results.analysis_results.length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-purple-200 uppercase tracking-wider font-semibold leading-tight">
                    ANALYSES
                  </div>
                </div>
                <div className="backdrop-blur-sm border-2 border-purple-400/40 rounded-xl p-3 sm:p-4 text-center bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <div className="text-2xl sm:text-3xl font-bold mb-1 bg-gradient-to-br from-purple-300 via-blue-300 to-purple-200 bg-clip-text text-transparent">
                    {[...new Set(results.analysis_results.flatMap(r => r.competitors_mentioned || []))].length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-purple-200 uppercase tracking-wider font-semibold leading-tight">
                    CONCURRENTEN
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {results.analysis_results.map((result, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex gap-3">
                      <div className={'w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-bold text-sm ' + (
                        result.company_mentioned
                          ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                          : 'bg-white/10 text-gray-400'
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-blue-300 mb-2 font-medium">{result.ai_prompt}</p>
                        <p className="text-sm text-gray-300">{result.simulated_ai_response_snippet}</p>
                        {result.competitors_mentioned?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs text-gray-400">Concurrenten:</span>
                            {result.competitors_mentioned.map((comp, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-400/30">
                                {comp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {result.company_mentioned && <Award className="w-5 h-5 text-green-300 flex-shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <button
                  onClick={() => {
                    setStep(1);
                    setFormData({ companyName: '', companyCategory: '', queries: '' });
                    setExcludeTermsInput('');
                    setIncludeTermsInput('');
                    setLocationTermsInput('');
                    setResults(null);
                  }}
                  className="w-full px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
                >
                  Nieuwe analyse
                </button>
              </div>

              <FeedbackWidget 
                scanId={results?.scan_id || null}
                companyName={formData.companyName}
                totalMentions={results?.total_company_mentions || 0}
              />
            </div>
          )}
        </section>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">
                <strong>Fout:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {!analyzing && (
          <div className="text-center">
            <p className="text-gray-400 mb-2">
              {user ? 'Ingelogd als ' + user.email : 'Meer analyses nodig?'}
            </p>
            {!user && (
              <>
                <p className="text-purple-300 text-sm mb-4">
                  ✨ Met een account krijg je 10 unieke prompts per scan
                </p>
                <Link 
                  href="/signup"
                  className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg font-semibold hover:bg-white/20 transition text-white inline-block"
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