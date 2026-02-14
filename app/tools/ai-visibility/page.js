// app/tools/ai-visibility/page.js
// ✅ SESSION 11 - Redesign aligned with Homepage + Better Mobile Teun
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, TrendingUp, Zap, CheckCircle2, AlertCircle, Loader2, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import FeedbackWidget from '@/app/components/FeedbackWidget';

// ====================================
// BRANCHE TAALDETECTIE (EN → NL)
// ====================================
const BRANCHE_EN_TO_NL = {
  // Marketing & Communicatie
  'agency': ['Marketingbureau', 'Reclamebureau'],
  'marketing agency': ['Marketingbureau', 'Online marketingbureau'],
  'digital agency': ['Digitaal bureau', 'Online marketingbureau'],
  'advertising agency': ['Reclamebureau', 'Advertentiebureau'],
  'creative agency': ['Creatief bureau', 'Reclamebureau'],
  'branding agency': ['Merkbureau', 'Branding bureau'],
  'pr agency': ['PR-bureau', 'Communicatiebureau'],
  'social media agency': ['Social media bureau', 'Online marketingbureau'],
  'seo agency': ['SEO-bureau', 'Zoekmachine optimalisatie bureau'],
  'media agency': ['Mediabureau'],
  'content agency': ['Contentbureau', 'Content marketing bureau'],
  'communications': ['Communicatie', 'Communicatiebureau'],
  'public relations': ['Public relations', 'PR-bureau'],
  // IT & Tech
  'software development': ['Softwareontwikkeling', 'Software bureau'],
  'software company': ['Softwarebedrijf', 'IT-bedrijf'],
  'web development': ['Webontwikkeling', 'Webdesign bureau'],
  'web design': ['Webdesign', 'Webdesign bureau'],
  'it services': ['IT-dienstverlening', 'IT-bedrijf'],
  'it consulting': ['IT-consultancy', 'IT-adviesbureau'],
  'tech company': ['Technologiebedrijf', 'IT-bedrijf'],
  'saas': ['SaaS-platform', 'Softwarebedrijf'],
  'cloud services': ['Clouddiensten', 'Cloud hosting'],
  'cybersecurity': ['Cybersecurity', 'IT-beveiliging'],
  'data analytics': ['Data-analyse', 'Data-analysebureau'],
  'ai company': ['AI-bedrijf', 'Kunstmatige intelligentie'],
  // Zakelijke diensten
  'consulting': ['Consultancy', 'Adviesbureau'],
  'consultancy': ['Consultancy', 'Adviesbureau'],
  'accounting': ['Accountancy', 'Boekhoudkantoor'],
  'accounting firm': ['Accountantskantoor', 'Boekhoudkantoor'],
  'law firm': ['Advocatenkantoor'],
  'legal services': ['Juridische dienstverlening', 'Advocatenkantoor'],
  'recruitment': ['Werving & selectie', 'Uitzendbureau'],
  'staffing': ['Uitzendbureau', 'Detachering'],
  'real estate': ['Vastgoed', 'Makelaar'],
  'real estate agency': ['Makelaarskantoor', 'Vastgoedkantoor'],
  'insurance': ['Verzekeringen', 'Verzekeringsmaatschappij'],
  'financial services': ['Financiële dienstverlening'],
  'investment': ['Beleggingen', 'Vermogensbeheer'],
  'training': ['Training & opleiding', 'Opleidingsinstituut'],
  'coaching': ['Coaching', 'Coachingpraktijk'],
  'logistics': ['Logistiek', 'Transport & logistiek'],
  'shipping': ['Scheepvaart', 'Verzenddienst'],
  'cleaning services': ['Schoonmaakbedrijf', 'Schoonmaakdiensten'],
  'security': ['Beveiliging', 'Beveiligingsbedrijf'],
  // Bouw & Techniek
  'construction': ['Bouw', 'Bouwbedrijf', 'Aannemer'],
  'contractor': ['Aannemer', 'Bouwbedrijf'],
  'architecture': ['Architectuur', 'Architectenbureau'],
  'interior design': ['Interieurontwerp', 'Interieurarchitectuur'],
  'plumbing': ['Loodgieter', 'Loodgietersbedrijf'],
  'electrical': ['Elektra', 'Elektricien'],
  'electrician': ['Elektricien', 'Installatiebedrijf'],
  'hvac': ['Klimaattechniek', 'Airconditioning & verwarming'],
  'painting': ['Schildersbedrijf', 'Schilder'],
  'roofing': ['Dakdekker', 'Dakdekkersbedrijf'],
  'landscaping': ['Hoveniersbedrijf', 'Tuinarchitectuur'],
  'engineering': ['Ingenieursbureau', 'Technisch adviesbureau'],
  // Horeca & Retail
  'restaurant': ['Restaurant', 'Horeca'],
  'catering': ['Catering', 'Cateringbedrijf'],
  'hotel': ['Hotel', 'Horeca'],
  'hospitality': ['Horeca', 'Gastvrijheid'],
  'retail': ['Detailhandel', 'Winkel'],
  'e-commerce': ['Webshop', 'Online winkel'],
  'ecommerce': ['Webshop', 'Online winkel'],
  'wholesale': ['Groothandel'],
  'bakery': ['Bakkerij'],
  'butcher': ['Slagerij'],
  'florist': ['Bloemist', 'Bloemenwinkel'],
  // Gezondheid & Welzijn
  'healthcare': ['Gezondheidszorg', 'Zorginstelling'],
  'dental': ['Tandarts', 'Tandartspraktijk'],
  'dentist': ['Tandarts', 'Tandartspraktijk'],
  'physiotherapy': ['Fysiotherapie', 'Fysiotherapiepraktijk'],
  'pharmacy': ['Apotheek'],
  'gym': ['Sportschool', 'Fitnesscentrum'],
  'fitness': ['Fitness', 'Sportschool'],
  'beauty salon': ['Schoonheidssalon'],
  'hair salon': ['Kapsalon'],
  'spa': ['Spa', 'Wellnesscentrum'],
  'wellness': ['Wellness', 'Wellnesscentrum'],
  'therapy': ['Therapie', 'Therapeut'],
  'psychology': ['Psychologie', 'Psychologenpraktijk'],
  'veterinary': ['Dierenarts', 'Dierenkliniek'],
  // Overig
  'photography': ['Fotografie', 'Fotograaf'],
  'videography': ['Videografie', 'Videoproductie'],
  'printing': ['Drukkerij'],
  'automotive': ['Automotive', 'Autobedrijf'],
  'car dealer': ['Autodealer', 'Autobedrijf'],
  'garage': ['Garage', 'Autogarage'],
  'travel agency': ['Reisbureau'],
  'education': ['Onderwijs', 'Opleidingsinstituut'],
  'nonprofit': ['Non-profit', 'Stichting'],
  'non-profit': ['Non-profit', 'Stichting'],
  'charity': ['Goed doel', 'Stichting'],
  'event planning': ['Evenementenbureau', 'Eventorganisatie'],
  'events': ['Evenementen', 'Evenementenbureau'],
  'manufacturing': ['Productie', 'Productiebedrijf'],
  'fashion': ['Mode', 'Modebedrijf'],
  'furniture': ['Meubelzaak', 'Meubelmaker'],
  'jewelry': ['Juwelier', 'Sieradenwinkel'],
};

// Detecteer Engelse branche en geef NL suggesties
function detectBranchLanguage(input) {
  if (!input || input.length < 2) return null;
  const lower = input.toLowerCase().trim();
  
  // Exacte match
  if (BRANCHE_EN_TO_NL[lower]) {
    return { type: 'exact', suggestions: BRANCHE_EN_TO_NL[lower], original: input };
  }
  
  // Gedeeltelijke match (input bevat een Engelse term)
  for (const [en, nl] of Object.entries(BRANCHE_EN_TO_NL)) {
    if (lower.includes(en) || en.includes(lower)) {
      return { type: 'partial', suggestions: nl, original: input, matchedTerm: en };
    }
  }
  
  // Heuristiek: veelvoorkomende Engelse woorden die op een Engelse branche duiden
  const englishIndicators = [
    'company', 'services', 'solutions', 'group', 'studio', 'shop', 'store',
    'firm', 'business', 'industry', 'provider', 'specialist', 'expert',
    'management', 'development', 'design', 'digital', 'creative', 'professional',
    'international', 'global', 'supply', 'trading', 'repair', 'maintenance'
  ];
  
  const words = lower.split(/\s+/);
  const hasEnglishWord = words.some(w => englishIndicators.includes(w));
  
  if (hasEnglishWord) {
    return { type: 'generic', suggestions: [], original: input };
  }
  
  return null;
}

// ====================================
// BEDRIJFSNAAM FUZZY MATCHING
// ====================================
function findNameInCompetitors(companyName, analysisResults) {
  if (!companyName || !analysisResults?.length) return null;
  
  const nameLower = companyName.toLowerCase().trim();
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
  
  // Verzamel alle concurrenten
  const allCompetitors = {};
  analysisResults.forEach(result => {
    (result.competitors_mentioned || []).forEach(comp => {
      allCompetitors[comp] = (allCompetitors[comp] || 0) + 1;
    });
  });
  
  const matches = [];
  
  for (const [comp, count] of Object.entries(allCompetitors)) {
    const compLower = comp.toLowerCase().trim();
    
    // Skip als het exact hetzelfde is (dan zou company_mentioned true zijn)
    if (compLower === nameLower) continue;
    
    // Check 1: Levenshtein-achtige overeenkomst (substring)
    if (compLower.includes(nameLower) || nameLower.includes(compLower)) {
      matches.push({ name: comp, count, confidence: 'high', reason: 'substring' });
      continue;
    }
    
    // Check 2: Woord-overlap (minstens 1 significant woord)
    const compWords = compLower.split(/\s+/).filter(w => w.length > 2);
    const sharedWords = nameWords.filter(w => compWords.some(cw => 
      cw.includes(w) || w.includes(cw) || levenshteinDistance(w, cw) <= 2
    ));
    
    if (sharedWords.length > 0 && (sharedWords.length / Math.max(nameWords.length, 1)) >= 0.5) {
      matches.push({ name: comp, count, confidence: 'medium', reason: 'word_overlap' });
      continue;
    }
    
    // Check 3: Levenshtein distance op de hele string
    const distance = levenshteinDistance(nameLower, compLower);
    const maxLen = Math.max(nameLower.length, compLower.length);
    if (distance <= 3 && (distance / maxLen) < 0.3) {
      matches.push({ name: comp, count, confidence: 'high', reason: 'typo' });
    }
  }
  
  // Sorteer op confidence en count
  return matches.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
    return b.count - a.count;
  })[0] || null;
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i-1] === b[j-1]
        ? matrix[i-1][j-1]
        : 1 + Math.min(matrix[i-1][j], matrix[i][j-1], matrix[i-1][j-1]);
    }
  }
  return matrix[a.length][b.length];
}

function AIVisibilityToolContent() {
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [initializing, setInitializing] = useState(true);
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
    queries: '',
    website: '',
    serviceArea: ''  // ✨ Servicegebied voor lokale AI-resultaten
  });
  const [customPrompts, setCustomPrompts] = useState(null);

  // Advanced Settings State
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [excludeTermsInput, setExcludeTermsInput] = useState('');
  const [includeTermsInput, setIncludeTermsInput] = useState('');
  const [locationTermsInput, setLocationTermsInput] = useState('');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [brancheSuggestion, setBrancheSuggestion] = useState(null);
  const [nameMismatch, setNameMismatch] = useState(null);
  const [resultPlatform, setResultPlatform] = useState('chatgpt');
  const [extractingKeywords, setExtractingKeywords] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);

  // Close tooltip on outside tap
  useEffect(() => {
    if (!activeTooltip) return;
    const close = () => setActiveTooltip(null);
    const timer = setTimeout(() => document.addEventListener('click', close, { once: true }), 10);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [activeTooltip]);

  // Handle URL Parameters from OnlineLabs
  useEffect(() => {
    if (!searchParams) { setInitializing(false); return; }

    // ✨ Check for pending scan from dashboard modal
    const pendingScan = sessionStorage.getItem('pendingScan')
    if (pendingScan) {
      try {
        const data = JSON.parse(pendingScan)
        sessionStorage.removeItem('pendingScan') // Clean up
        console.log('📝 Pending scan loaded from dashboard:', data)
        
        setFormData(prev => ({
          ...prev,
          companyName: data.companyName || prev.companyName,
          companyCategory: data.companyCategory || prev.companyCategory,
          website: data.websiteUrl || prev.website
        }))
        
        if (data.customPrompts && data.customPrompts.length > 0) {
          setCustomPrompts(data.customPrompts)
        }
        
        setStep(3) // Go to step 3 (confirm prompts)
        return // Don't process other params
      } catch (e) {
        console.error('Error loading pending scan:', e)
        sessionStorage.removeItem('pendingScan')
      }
    }

    // Check for direct step navigation (e.g., ?step=3)
    const stepParam = searchParams.get('step')
    
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

    if (ref) {
      setReferralSource(ref);
      console.log('📍 Referral source:', ref);
    }

    if (customPromptsFlag === 'true') {
      try {
        const storedPrompts = sessionStorage.getItem('teun_custom_prompts');
        if (storedPrompts) {
          const parsedPrompts = JSON.parse(storedPrompts);
          console.log('📝 Custom prompts loaded:', parsedPrompts.length);
          
          setFormData(prev => ({
            ...prev,
            companyName: company || prev.companyName,
            companyCategory: category || prev.companyCategory
          }));
          
          setCustomPrompts(parsedPrompts);
          setStep(3);
          sessionStorage.removeItem('teun_custom_prompts');
          return;
        }
      } catch (e) {
        console.error('Error loading custom prompts:', e);
      }
    }

    if (company || category || keywords) {
      setFormData(prev => ({
        ...prev,
        companyName: company || prev.companyName,
        companyCategory: category || prev.companyCategory,
        queries: keywords || prev.queries,
        website: websiteParam || prev.website
      }));
    }

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
      setFormData(prev => ({ ...prev, serviceArea: location }));
      setShowAdvancedSettings(true);
    }

    if (company && category) {
      setStep(3);
      if (autostart === 'true') {
        setFromHomepage(true);
        setAnalyzing(true);
        setProgress(0);
        setCurrentStep('Voorbereiden...');
        setPendingAutoStart(true);
      }
    } else if (keywords) {
      setStep(2);
    }

    setInitializing(false);
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

  const [pendingAutoStart, setPendingAutoStart] = useState(false);

  useEffect(() => {
    // Auto-start zodra alles klaar is: formData gevuld en auth geladen
    if (pendingAutoStart && !loading && formData.companyName && formData.companyCategory) {
      setPendingAutoStart(false);
      handleAnalyze();
    }
  }, [pendingAutoStart, loading, formData.companyName, formData.companyCategory]);

  // Helper Functions for Advanced Settings
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

  // ====================================
  // EXTRACT KEYWORDS FROM URL
  // ====================================
  const handleExtractKeywords = async () => {
    const url = formData.website?.trim();
    if (!url) {
      setError('Vul een website URL in');
      return;
    }

    setExtractingKeywords(true);
    setError(null);
    setExtractionResult(null);

    try {
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Kon zoekwoorden niet ophalen');
      }

      const data = await response.json();

      if (data.keywords && data.keywords.length > 0) {
        // Fill keywords
        setFormData(prev => ({
          ...prev,
          queries: data.keywords.join(', '),
          companyName: prev.companyName || data.companyName || '',
          companyCategory: prev.companyCategory || data.category || '',
        }));
        setExtractionResult({
          count: data.keywords.length,
          source: data.source,
          companyName: data.companyName,
          category: data.category,
        });
      } else {
        setError('Geen zoekwoorden gevonden op deze pagina. Vul ze handmatig in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExtractingKeywords(false);
    }
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
      
      const hasCustomPrompts = customPrompts && customPrompts.length > 0;
      const totalPrompts = hasCustomPrompts ? customPrompts.length : 10;
      
      if (hasCustomPrompts) {
        setCurrentStep(`${totalPrompts} aangepaste prompts analyseren...`);
      } else {
        setCurrentStep('AI-prompts genereren...');
      }
      
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const rounded = Math.floor(prev);
          if (rounded >= 97) return rounded;
          if (user) {
            if (rounded < 10) return prev + 2;
            if (rounded < 25) return prev + 1;
            if (rounded < 50) return prev + 0.6;
            if (rounded < 70) return prev + 0.4;
            if (rounded < 85) return prev + 0.25;
            if (rounded < 92) return prev + 0.15;
            return prev + 0.08;
          } else {
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
          customPrompts: hasCustomPrompts ? customPrompts : null,
          websiteUrl: formData.website || null,
          serviceArea: formData.serviceArea || null
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
      setCustomPrompts(null);

      // Check voor bedrijfsnaam mismatch in concurrenten
      const allResults = [...(data.analysis_results || []), ...(data.chatgpt_results || [])];
      if (data.total_company_mentions === 0 && data.chatgpt_company_mentions === 0 && allResults.length > 0) {
        const mismatch = findNameInCompetitors(formData.companyName, allResults);
        setNameMismatch(mismatch);
      } else {
        setNameMismatch(null);
      }

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

  // ====================================
  // RENDER
  // ====================================
  
  // Prevent step flash while URL params are being processed
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span className="text-sm">Laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50" suppressHydrationWarning>


      <div className="relative max-w-5xl mx-auto px-4 py-6 sm:py-12">
        
        {/* OnlineLabs Referral Banner */}
        {referralSource === 'onlinelabs' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">🔗</span>
              </div>
              <div>
                <p className="text-sm text-slate-700">
                  <strong>Via OnlineLabs</strong> – Je gegevens zijn automatisch ingevuld
                </p>
                <p className="text-xs text-slate-500">
                  Controleer de gegevens en start de analyse
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-4">
            <Search className="w-4 h-4" />
            AI Zichtbaarheid Scan
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-slate-900 leading-tight px-4">
            AI Zichtbaarheidsanalyse
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4 mb-4">
            Hoe vermelden AI-modellen jouw bedrijf bij commerciële zoekvragen?
          </p>
          {/* AI Platform badges - matching homepage style */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-1">
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
          <p className="text-xs text-slate-400">10 prompts per scan • 2x gratis zonder account • AI Modus & AI Overviews met gratis account</p>
        </header>

        {/* Step Indicator - Pill style matching homepage CTA */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 flex-wrap px-2">
          {[
            { num: 1, label: 'Website & Zoekwoorden', mobileLabel: 'Website' },
            { num: 2, label: 'Bedrijfsinfo', mobileLabel: 'Info' },
            { num: 3, label: 'Analyse', mobileLabel: 'Scan' },
            { num: 4, label: 'Rapport', mobileLabel: 'Rapport' }
          ].map(({ num, label, mobileLabel }) => (
            <div
              key={num}
              className={'px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ' + (
                step === num
                  ? 'bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white shadow-lg'
                  : step > num
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-white border border-slate-200 text-slate-400'
              )}
            >
              <span className="hidden sm:inline">{num}. {label}</span>
              <span className="sm:hidden">{num}. {mobileLabel}</span>
            </div>
          ))}
        </div>

        {/* ====================================== */}
        {/* STEP 1 - Zoekwoorden (LIGHT THEME)    */}
        {/* ====================================== */}
        {step === 1 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 mb-8">
            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
              {/* Left: Content - 3 columns */}
              <div className="lg:col-span-3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center border border-blue-200">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">1. Vul je website in</p>
                </div>

                {/* URL Extraction */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                  <div className="mb-3">
                    <strong className="text-slate-800 text-sm">Vul je website URL in</strong>
                    <p className="text-xs text-slate-500 mt-0.5">We halen automatisch zoekwoorden op uit je homepage</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value.toLowerCase() })}
                      placeholder="jouwwebsite.nl"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleExtractKeywords(); } }}
                    />
                    <button
                      onClick={handleExtractKeywords}
                      disabled={extractingKeywords || !formData.website?.trim()}
                      className="px-5 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap flex items-center gap-2"
                    >
                      {extractingKeywords ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Laden...
                        </>
                      ) : (
                        <>Ophalen</>
                      )}
                    </button>
                  </div>

                  {/* Extraction Success */}
                  {extractionResult && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span><strong>{extractionResult.count} zoekwoorden</strong> gevonden en ingevuld!</span>
                      </div>
                      {(extractionResult.companyName || extractionResult.category) && (
                        <p className="text-xs text-green-600 mt-1 ml-6">
                          {extractionResult.companyName && <>Bedrijf: {extractionResult.companyName}</>}
                          {extractionResult.companyName && extractionResult.category && <> · </>}
                          {extractionResult.category && <>Branche: {extractionResult.category}</>}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-xs text-slate-400 font-medium">OF VUL HANDMATIG IN</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                {/* Tip box - Desktop only */}
                <div className="hidden lg:block bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-700">
                      <strong className="text-slate-800">Tip: Gebruik meerdere zoekwoorden</strong>
                      <p className="mt-1 text-slate-600">
                        Hoe meer relevante zoekwoorden je invult, hoe beter de AI-prompts en hoe accurater je resultaten.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <label className="text-sm text-slate-700 font-medium block">
                    Zoekwoorden <span className="text-blue-600">*</span>
                  </label>
                  <p className="text-xs text-slate-500 -mt-1 mb-2">
                    Hoe specifieker, hoe beter de prompts
                  </p>
                  <textarea
                    value={formData.queries}
                    onChange={(e) => setFormData({ ...formData, queries: e.target.value })}
                    placeholder="Jouw belangrijkste zoekwoorden, gescheiden door komma's"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 min-h-[80px] resize-y bg-white"
                  />
                </div>

                {/* Advanced Settings - Desktop only */}
                <div className="hidden lg:block mt-6 border-t border-slate-100 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all group border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center border border-purple-200 group-hover:border-purple-300 transition-all">
                        <span className="text-xl">⚙️</span>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-slate-800">Geavanceerde Instellingen</div>
                        <div className="text-xs text-slate-500">Bepaal welke woorden AI gebruikt (optioneel)</div>
                      </div>
                    </div>
                    <div className="text-slate-400">
                      {showAdvancedSettings ? '▼' : '▶'}
                    </div>
                  </button>

                  {showAdvancedSettings && (
                    <div className="mt-4 space-y-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                      
                      {/* Info Banner */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500 flex-shrink-0">ℹ️</span>
                          <div className="text-sm text-slate-600">
                            <strong className="text-slate-700">Optioneel:</strong> Pas aan welke woorden AI gebruikt bij het maken van prompts. 
                            Klik op voorbeelden om ze toe te voegen, of typ je eigen woorden (gescheiden door komma&apos;s).
                          </div>
                        </div>
                      </div>

                      {/* Preset Examples */}
                      <div className="space-y-3">
                        <label className="text-sm text-slate-700 font-medium block">
                          🎯 Klik op voorbeelden om toe te voegen:
                        </label>
                        
                        {/* Premium Examples */}
                        <div className="space-y-2">
                          <div className="text-xs text-purple-600 font-semibold">💎 Premium Positionering:</div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => addIncludeTerms(['premium', 'hoogwaardig', 'exclusief'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + premium, hoogwaardig, exclusief
                            </button>
                            <button type="button" onClick={() => addIncludeTerms(['gespecialiseerd', 'ervaren', 'deskundig'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + gespecialiseerd, ervaren, deskundig
                            </button>
                            <button type="button" onClick={() => addExcludeTerms(['goedkoop', 'budget', 'korting'])}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-all border border-red-200">
                              − goedkoop, budget, korting
                            </button>
                          </div>
                        </div>

                        {/* Local Service Examples */}
                        <div className="space-y-2">
                          <div className="text-xs text-blue-600 font-semibold">📍 Lokale Service:</div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => addLocationTerms(['Amsterdam', 'Rotterdam', 'Utrecht'])}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-all border border-blue-200">
                              + Amsterdam, Rotterdam, Utrecht
                            </button>
                            <button type="button" onClick={() => addLocationTerms(['landelijk actief', 'in Nederland'])}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-all border border-blue-200">
                              + landelijk actief, in Nederland
                            </button>
                            <button type="button" onClick={() => addIncludeTerms(['lokaal', 'in de buurt', 'regio'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + lokaal, in de buurt, regio
                            </button>
                          </div>
                        </div>

                        {/* Service Quality Examples */}
                        <div className="space-y-2">
                          <div className="text-xs text-indigo-600 font-semibold">⭐ Service Kwaliteit:</div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => addIncludeTerms(['24/7 bereikbaar', 'spoedservice', 'direct beschikbaar'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + 24/7, spoedservice, direct
                            </button>
                            <button type="button" onClick={() => addIncludeTerms(['transparant', 'vast tarief', 'duidelijke offerte'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + transparant, vast tarief, duidelijk
                            </button>
                          </div>
                        </div>

                        {/* Reset Button */}
                        <button type="button" onClick={() => { setExcludeTermsInput(''); setIncludeTermsInput(''); setLocationTermsInput(''); }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-all border border-slate-200">
                          🔄 Alles wissen
                        </button>
                      </div>

                      {/* Input Fields */}
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <div className="space-y-2">
                          <label className="text-sm text-slate-700 font-medium flex items-center gap-2">
                            <span className="text-red-500">❌</span> Vermijd deze woorden (optioneel)
                          </label>
                          <input type="text" value={excludeTermsInput} onChange={(e) => setExcludeTermsInput(e.target.value)}
                            placeholder="Bijv: goedkoop, budget, korting"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-sm" />
                          <div className="text-xs text-slate-500">Scheid met komma&apos;s. Deze termen worden uitgesloten bij het maken van prompts.</div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-slate-700 font-medium flex items-center gap-2">
                            <span className="text-green-500">✅</span> Gebruik deze woorden (optioneel)
                          </label>
                          <input type="text" value={includeTermsInput} onChange={(e) => setIncludeTermsInput(e.target.value)}
                            placeholder="Bijv: gespecialiseerd, ervaren, premium"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-sm" />
                          <div className="text-xs text-slate-500">AI zal deze termen proberen te gebruiken in de gegenereerde prompts.</div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-slate-700 font-medium flex items-center gap-2">
                            <span className="text-blue-500">📍</span> Locatie-focus (optioneel)
                          </label>
                          <input type="text" value={locationTermsInput} onChange={(e) => {
                            setLocationTermsInput(e.target.value);
                            // Sync met servicegebied
                            if (!formData.serviceArea || formData.serviceArea === locationTermsInput) {
                              setFormData(prev => ({ ...prev, serviceArea: e.target.value }));
                            }
                          }}
                            placeholder="Bijv: Amsterdam, landelijk actief, regio Utrecht"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-sm" />
                          <div className="text-xs text-slate-500">Locatie-specifieke termen om in prompts te gebruiken.</div>
                        </div>
                      </div>

                      {/* Preview */}
                      {(excludeTermsInput || includeTermsInput || locationTermsInput) && (
                        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="text-xs text-purple-700 font-semibold mb-2">📋 Actieve Instellingen:</div>
                          <div className="space-y-1 text-xs">
                            {excludeTermsInput && <div className="flex items-start gap-2"><span className="text-red-500">❌</span><span className="text-slate-600">{excludeTermsInput}</span></div>}
                            {includeTermsInput && <div className="flex items-start gap-2"><span className="text-green-500">✅</span><span className="text-slate-600">{includeTermsInput}</span></div>}
                            {locationTermsInput && <div className="flex items-start gap-2"><span className="text-blue-500">📍</span><span className="text-slate-600">{locationTermsInput}</span></div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Teun - Between form and button */}
                <div className="flex lg:hidden justify-center my-4">
                  <div className="relative">
                    <Image
                      src="/teun-ai-mascotte.png"
                      alt="Teun"
                      width={140}
                      height={175}
                      className="drop-shadow-xl"
                    />
                    <p className="text-xs text-slate-500 text-center mt-2 font-medium">
                      Vul je URL in, ik haal<br />de zoekwoorden op!
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      setStep(2);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer text-base"
                  >
                    Volgende →
                  </button>
                </div>
              </div>

              {/* Right: Teun Mascotte - Desktop */}
              <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center">
                <Image
                  src="/teun-ai-mascotte.png"
                  alt="Teun helpt je zoekwoorden kiezen"
                  width={280}
                  height={350}
                  className="drop-shadow-2xl"
                />
                <p className="text-sm text-slate-500 mt-4 text-center font-medium">
                  Vul je URL in, ik haal<br />de zoekwoorden op!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ====================================== */}
        {/* STEP 2 - Bedrijfsinfo (LIGHT THEME)   */}
        {/* ====================================== */}
        {step === 2 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 mb-8">
            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
              {/* Left: Content - 3 columns */}
              <div className="lg:col-span-3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center border border-purple-200">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">2. Bedrijfsinfo</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      Bedrijfsnaam <span className="text-blue-600">*</span>
                      <span className="relative">
                        <svg 
                          className="w-4 h-4 text-slate-400 cursor-help" 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          onClick={(e) => { e.preventDefault(); setActiveTooltip(activeTooltip === 'bedrijf' ? null : 'bedrijf'); }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {activeTooltip === 'bedrijf' && (
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
                            Zoals vermeld bij Google Bedrijfsprofiel
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></span>
                          </span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Je bedrijfsnaam"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      Branche <span className="text-blue-600">*</span>
                      <span className="relative">
                        <svg 
                          className="w-4 h-4 text-slate-400 cursor-help" 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          onClick={(e) => { e.preventDefault(); setActiveTooltip(activeTooltip === 'branche' ? null : 'branche'); }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {activeTooltip === 'branche' && (
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
                            Zoals vermeld bij Google Bedrijfsprofiel
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></span>
                          </span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, companyCategory: val });
                        setBrancheSuggestion(detectBranchLanguage(val));
                      }}
                      placeholder="Jouw branche"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                      required
                    />

                    {/* Branche taaldetectie suggestie */}
                    {brancheSuggestion && (
                      <div className={`mt-2 p-3 rounded-xl text-sm transition-all animate-in fade-in ${
                        brancheSuggestion.type === 'generic' 
                          ? 'bg-amber-50 border border-amber-200' 
                          : 'bg-blue-50 border border-blue-200'
                      }`}>
                        {brancheSuggestion.type === 'generic' ? (
                          <div className="flex items-start gap-2">
                            <span className="text-amber-500 flex-shrink-0">⚠️</span>
                            <p className="text-amber-800 text-xs">
                              Dit lijkt een Engelse term. Nederlandse AI-zoekmachines geven betere resultaten met een <strong>Nederlandse branchenaam</strong>.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start gap-2 mb-2">
                              <span className="flex-shrink-0">💡</span>
                              <p className="text-blue-800 text-xs">
                                <strong>&quot;{brancheSuggestion.original}&quot;</strong> is Engels. Voor betere resultaten, gebruik:
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 ml-6">
                              {brancheSuggestion.suggestions.map((suggestion, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, companyCategory: suggestion });
                                    setBrancheSuggestion(null);
                                  }}
                                  className="px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-all border border-blue-300 hover:border-blue-400 cursor-pointer shadow-sm hover:shadow"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ✨ Website URL field for smart analysis */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      Website
                      <span className="relative">
                        <svg 
                          className="w-4 h-4 text-slate-400 cursor-help" 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          onClick={(e) => { e.preventDefault(); setActiveTooltip(activeTooltip === 'website' ? null : 'website'); }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {activeTooltip === 'website' && (
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
                            ✨ Wij analyseren je pagina voor betere prompts
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></span>
                          </span>
                        )}
                      </span>
                    </label>
                    <input
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value.toLowerCase() })}
                      placeholder="jouwwebsite.nl"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                    />
                    {!formData.website && (
                      <p className="text-xs text-purple-600 mt-1.5">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                          </svg>
                          Tip: Ga terug en vul je URL in bij stap 1 voor automatische zoekwoord-extractie
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Servicegebied */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      📍 Servicegebied
                      <span className="text-xs font-normal text-slate-400">(optioneel)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.serviceArea}
                      onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                      placeholder="bijv. Amsterdam, Utrecht, heel Nederland"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                    />
                    <p className="text-xs text-slate-400">AI-platforms geven lokaal relevantere resultaten met een servicegebied</p>
                  </div>
                </div>

                {/* Mobile Teun - Improved visibility */}
                <div className="flex lg:hidden justify-center my-4">
                  <div className="relative">
                    <Image
                      src="/mascotte-teun-ai.png"
                      alt="Teun"
                      width={140}
                      height={175}
                      className="drop-shadow-xl"
                    />
                    <p className="text-xs text-slate-500 text-center mt-2 font-medium">
                      Vertel me over jouw bedrijf!
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition cursor-pointer border border-slate-200"
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
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    Volgende →
                  </button>
                </div>
              </div>

              {/* Right: Teun Mascotte - Desktop */}
              <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt="Teun wacht op je bedrijfsinfo"
                  width={300}
                  height={380}
                  className="drop-shadow-2xl"
                />
                <p className="text-sm text-slate-500 mt-4 text-center font-medium">
                  Vertel me over<br />jouw bedrijf!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ====================================== */}
        {/* STEP 3 - Analyse (LIGHT THEME)        */}
        {/* ====================================== */}
        {step === 3 && fromHomepage && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-xl font-bold text-slate-900 mb-2">Bezig met analyseren...</p>
              <p className="text-slate-600 mb-4">{currentStep || 'Voorbereiden...'}</p>
              
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(Math.floor(progress), 2)}%` }}
                >
                  {progress > 5 && (
                    <span className="text-xs font-bold text-white drop-shadow-lg">
                      {Math.floor(progress)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 3 && !fromHomepage && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 mb-8">
            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
              {/* Left: Content - 3 columns */}
              <div className="lg:col-span-3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg flex items-center justify-center border border-yellow-200">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">3. Start de Analyse</p>
                </div>

                {analyzing ? (
                  <div className="space-y-6">
                    {/* Mobile Teun during scanning */}
                    <div className="flex lg:hidden justify-center mb-4">
                      <Image src="/teun-ai-mascotte.png" alt="Teun analyseert" width={140} height={175} className="drop-shadow-xl" />
                    </div>
                    
                    {/* Scanning Progress Box */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 text-center">
                      <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-xl font-bold text-slate-900 mb-2">Bezig met analyseren...</p>
                      <p className="text-slate-600 mb-4">{currentStep}</p>
                      
                      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 flex items-center justify-end pr-2"
                          style={{ width: `${Math.floor(progress)}%` }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-lg">
                            {Math.floor(progress)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="space-y-3 text-sm">
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress >= 20 ? 'text-green-600' : progress > 10 ? 'text-blue-600' : 'text-slate-400')}>
                        {progress >= 20 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>{customPrompts ? 'Aangepaste prompts voorbereiden...' : 'Commerciële AI-prompts genereren...'}</span>
                      </div>
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress >= 90 ? 'text-green-600' : progress > 20 ? 'text-blue-600' : 'text-slate-400')}>
                        {progress >= 90 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>Analyseren via geavanceerde AI-zoekmachine...</span>
                      </div>
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress === 100 ? 'text-green-600' : progress > 90 ? 'text-blue-600' : 'text-slate-400')}>
                        {progress === 100 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>Resultaten verwerken en rapport genereren...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Summary Card */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3 text-sm border border-slate-200">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-slate-500 flex-shrink-0">Bedrijf:</span>
                        <span className="text-slate-900 font-medium text-right">{formData.companyName}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-slate-500 flex-shrink-0">Branche:</span>
                        <span className="text-slate-900 font-medium text-right">{formData.companyCategory}</span>
                      </div>
                      {formData.queries && !customPrompts && (
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-slate-500 flex-shrink-0">Zoekwoord:</span>
                          <span className="text-slate-900 font-medium text-right">
                            {formData.queries.split(/[,\n]/)[0]?.trim() || 'Geen opgegeven'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-slate-500 flex-shrink-0">Prompts:</span>
                        <span className="text-slate-900 font-medium text-right">
                          {customPrompts ? `${customPrompts.length} aangepast` : `${user ? '10' : '5'} AI-prompts`}
                        </span>
                      </div>
                      {referralSource && (
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-slate-500 flex-shrink-0">Bron:</span>
                          <span className="text-blue-600 font-medium text-right capitalize">{referralSource}</span>
                        </div>
                      )}
                    </div>

                    {/* Custom Prompts from Dashboard */}
                    {customPrompts && customPrompts.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                        <div className="text-sm text-purple-800 font-semibold mb-3 flex items-center gap-2">
                          <span>📝</span>
                          <span>Aangepaste prompts ({customPrompts.length}):</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {customPrompts.map((prompt, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-purple-600 flex-shrink-0 w-5">{idx + 1}.</span>
                              <span className="text-slate-700">{prompt}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setCustomPrompts(null)}
                          className="mt-3 text-xs text-purple-600 hover:text-purple-800 underline">
                          Annuleer en genereer nieuwe prompts
                        </button>
                      </div>
                    )}

                    {/* Advanced Settings in Step 3 */}
                    {(excludeTermsInput || includeTermsInput || locationTermsInput) && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                        <div className="text-sm text-indigo-800 font-semibold mb-3 flex items-center gap-2">
                          <span>⚙️</span>
                          <span>Geavanceerde Instellingen:</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          {excludeTermsInput && <div className="flex items-start gap-2"><span className="text-red-600 flex-shrink-0">❌ Vermijd:</span><span className="text-slate-700">{excludeTermsInput}</span></div>}
                          {includeTermsInput && <div className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✅ Gebruik:</span><span className="text-slate-700">{includeTermsInput}</span></div>}
                          {locationTermsInput && <div className="flex items-start gap-2"><span className="text-blue-600 flex-shrink-0">📍 Locatie:</span><span className="text-slate-700">{locationTermsInput}</span></div>}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-6">
                      <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition cursor-pointer text-sm sm:text-base whitespace-nowrap border border-slate-200">
                        ← Terug
                      </button>
                      <button
                        onClick={() => { setFromHomepage(false); handleAnalyze(); }}
                        className={`flex-1 px-5 py-3 sm:py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-bold rounded-xl hover:from-[#2D2D5F] hover:to-[#3D3D7F] transition shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base ${fromHomepage ? 'animate-bounce' : ''}`}>
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                        Start Analyse →
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Teun Mascotte - 2 columns */}
              <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center">
                <Image src="/teun-ai-mascotte.png" alt="Teun helpt je analyseren" width={280} height={350} className="drop-shadow-2xl" />
                <p className="text-sm text-slate-500 mt-4 text-center">
                  Klaar om te scannen!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ====================================== */}
        {/* STEP 4 - Rapport (LIGHT THEME)        */}
        {/* ====================================== */}
        {step === 4 && results && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 mb-8">
            {/* Teun above results - mobile */}
            <div className="flex lg:hidden justify-center -mt-2 mb-4">
              <div className="text-center">
                <Image src="/Teun-ai-blij-met-resultaat.png" alt="Teun is blij!" width={120} height={150} className="drop-shadow-xl mx-auto" />
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
              {/* Left: Content - 3 columns */}
              <div className="lg:col-span-3">
                {/* Header with icon */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center border border-green-200">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">4. Jouw Rapport</p>
                </div>

                {/* Success Banner */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-700">
                      <strong className="text-green-800">Analyse voltooid!</strong>
                      <p className="mt-1 text-slate-600">
                        Je AI-zichtbaarheidsrapport voor <strong>{formData.companyName}</strong> is klaar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Perplexity Badge */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">

                {/* Bedrijfsnaam mismatch waarschuwing */}
                {nameMismatch && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 mb-4 sm:mb-6">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">🔍</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 mb-1">
                          Bedoelde je &quot;{nameMismatch.name}&quot;?
                        </p>
                        <p className="text-xs text-amber-700 mb-3">
                          Je bedrijf <strong>&quot;{formData.companyName}&quot;</strong> werd 0x gevonden, maar{' '}
                          <strong>&quot;{nameMismatch.name}&quot;</strong> verschijnt {nameMismatch.count}x bij de concurrenten.
                          {nameMismatch.reason === 'typo' && ' Dit kan een typfout zijn.'}
                          {nameMismatch.reason === 'substring' && ' Dit lijkt een variant van je bedrijfsnaam.'}
                        </p>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, companyName: nameMismatch.name }));
                            setNameMismatch(null);
                            setResults(null);
                            setStep(3);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition shadow-sm cursor-pointer"
                        >
                          🔄 Opnieuw scannen als &quot;{nameMismatch.name}&quot;
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                  {/* Platform Tabs */}
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => setResultPlatform('chatgpt')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        resultPlatform === 'chatgpt'
                          ? 'bg-white shadow-sm border border-green-200 text-slate-800'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <div className="w-5 h-5 bg-gradient-to-br from-[#10A37F] to-[#0D8A6A] rounded flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.2 9.4c.4-1.2.2-2.5-.5-3.6-.7-1-1.8-1.7-3-1.9-.6-.1-1.2 0-1.8.2-.5-1.3-1.5-2.3-2.8-2.8-1.3-.5-2.8-.4-4 .3C9.4.6 8.2.2 7 .5c-1.2.3-2.3 1.1-2.9 2.2-.6 1.1-.7 2.4-.3 3.6-1.3.5-2.3 1.5-2.8 2.8s-.4 2.8.3 4c-1 .8-1.6 2-1.7 3.3-.1 1.3.4 2.6 1.4 3.5 1 .9 2.3 1.3 3.6 1.2.5 1.3 1.5 2.3 2.8 2.8 1.3.5 2.8.4 4-.3.8 1 2 1.6 3.3 1.7 1.3.1 2.6-.4 3.5-1.4.9-1 1.3-2.3 1.2-3.6 1.3-.5 2.3-1.5 2.8-2.8.5-1.3.4-2.8-.3-4 1-.8 1.6-2 1.7-3.3.1-1.3-.4-2.6-1.4-3.5z"/>
                        </svg>
                      </div>
                      ChatGPT
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        resultPlatform === 'chatgpt' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {results.chatgpt_company_mentions || 0}/{(results.chatgpt_results || []).length}
                      </span>
                    </button>
                    <button
                      onClick={() => setResultPlatform('perplexity')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        resultPlatform === 'perplexity'
                          ? 'bg-white shadow-sm border border-blue-200 text-slate-800'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <div className="w-5 h-5 bg-gradient-to-br from-[#20B8CD] to-[#1AA3B3] rounded flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      </div>
                      Perplexity
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        resultPlatform === 'perplexity' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {results.total_company_mentions}/{results.analysis_results.length}
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 ml-1">
                    {resultPlatform === 'chatgpt' ? 'Realtime webscan via ChatGPT Search' : 'Realtime webscan met actuele bronnen'}
                  </p>
                </div>

                {/* Unlock extra platforms for non-logged-in users */}
                {!user && (
                  <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-bl-lg">
                        GRATIS
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 text-sm sm:text-base block">Unlock AI Modus + AI Overviews</span>
                          <span className="text-xs text-slate-500">Maak een gratis account - geen creditcard nodig</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-white/80 rounded-full text-slate-600 border border-slate-200">✓ AI Modus scans</span>
                        <span className="px-2 py-1 bg-white/80 rounded-full text-slate-600 border border-slate-200">✓ AI Overviews</span>
                        <span className="px-2 py-1 bg-white/80 rounded-full text-slate-600 border border-slate-200">✓ GEO Analyse</span>
                        <span className="px-2 py-1 bg-white/80 rounded-full text-slate-600 border border-slate-200">✓ Dashboard</span>
                      </div>
                      
                      <Link 
                        href="/signup" 
                        className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold rounded-lg hover:from-emerald-600 hover:to-green-600 transition shadow-md text-center"
                      >
                        Gratis account maken →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Website Analyzed Badge */}
                {results.websiteAnalyzed && (
                  <div className="mb-4 sm:mb-6 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-900">Website geanalyseerd</p>
                        <p className="text-xs text-purple-600">
                          {results.enhancedKeywords?.length || 0} zoekwoorden geëxtraheerd voor betere prompts
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats Cards - per platform */}
                {(() => {
                  const activeResults = resultPlatform === 'chatgpt' 
                    ? (results.chatgpt_results || []) 
                    : results.analysis_results;
                  const activeMentions = resultPlatform === 'chatgpt' 
                    ? (results.chatgpt_company_mentions || 0) 
                    : results.total_company_mentions;
                  const activeCompetitors = [...new Set(activeResults.flatMap(r => r.competitors_mentioned || []))];
                  
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{activeMentions}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-medium leading-tight">
                            <span className="hidden sm:inline">Vermeldingen</span><span className="sm:hidden">Vermeld</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">{activeResults.length}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-medium leading-tight">
                            <span className="hidden sm:inline">AI Prompts</span><span className="sm:hidden">Prompts</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">{activeCompetitors.length}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-medium leading-tight">
                            <span className="hidden sm:inline">Concurrenten</span><span className="sm:hidden">Concurrent</span>
                          </div>
                        </div>
                      </div>

                      {/* Results List */}
                      <div className="space-y-3 mb-4 sm:mb-6">
                        {activeResults.map((result, idx) => (
                          <div key={idx} className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3 sm:p-4 transition-all">
                            <div className="flex gap-2 sm:gap-3">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs sm:text-sm ${
                                result.company_mentioned
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-slate-200 text-slate-500 border border-slate-300'
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
                    </>
                  );
                })()}

                {/* GEO DIY CTA - Only for non-logged in users */}
                {!user && (
                  <div id="geo-cta" className="bg-gradient-to-br from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
                    {/* GRATIS badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 bg-gradient-to-r from-emerald-400 to-green-400 text-slate-900 text-xs font-bold rounded-full shadow-lg">
                        100% GRATIS
                      </span>
                    </div>
                    
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                    
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🚀</span>
                        <p className="text-lg font-bold">Unlock alle AI platforms</p>
                      </div>
                      
                      <p className="text-purple-200 text-sm mb-4">
                        Maak een gratis account en krijg direct toegang tot alle AI-zichtbaarheid tools:
                      </p>
                      
                      <ul className="space-y-2 mb-5">
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span><strong>Dagelijks scannen</strong> op alle platforms</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span><strong>AI Modus + AI Overviews</strong> analyse</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span><strong>GEO Analyse PRO</strong> met aanbevelingen</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span><strong>Dashboard</strong> met alle scan resultaten</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span>Chrome extensie voor snelle scans</span>
                        </li>
                      </ul>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Link 
                          href="/signup"
                          className="flex-1 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-lg text-center text-sm sm:text-base"
                        >
                          ✨ Gratis Account Aanmaken
                        </Link>
                        <Link 
                          href="/login"
                          className="px-5 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition text-center text-sm sm:text-base border border-white/20"
                        >
                          Inloggen
                        </Link>
                      </div>
                      
                      <p className="text-emerald-300 text-xs mt-3 text-center font-medium">
                        ✨ Geen creditcard • Geen verborgen kosten • Voor altijd gratis
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <button
                    onClick={() => {
                      setStep(1);
                      setFormData({ companyName: '', companyCategory: '', queries: '', website: '', serviceArea: '' });
                      setExcludeTermsInput(''); setIncludeTermsInput(''); setLocationTermsInput('');
                      setResults(null); setReferralSource(null); setFromHomepage(false); setNameMismatch(null); setBrancheSuggestion(null);
                    }}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition cursor-pointer text-sm sm:text-base"
                  >
                    🔄 Nieuwe analyse
                  </button>
                  <Link href="/"
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg transition text-center cursor-pointer text-sm sm:text-base">
                    ← Terug naar home
                  </Link>
                </div>

                {/* OnlineLabs Back Link */}
                {referralSource === 'onlinelabs' && (
                  <div className="mb-6">
                    <a href="https://onlinelabs.nl/skills/geo-optimalisatie"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition border border-blue-200 w-full justify-center">
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

              {/* Right: Teun Mascotte + Competitor Ranking - 2 columns */}
              <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-start pt-8">
                <Image src="/Teun-ai-blij-met-resultaat.png" alt="Teun is blij met je resultaat!" width={240} height={300} className="drop-shadow-2xl" />
                <p className="text-sm text-slate-500 mt-4 text-center font-medium">
                  {(results.total_company_mentions + (results.chatgpt_company_mentions || 0)) > 0 
                    ? `Goed bezig! Je bent ${results.total_company_mentions + (results.chatgpt_company_mentions || 0)}x genoemd! 🎉` 
                    : 'Tijd om je AI-zichtbaarheid te verbeteren!'}
                </p>

                {/* Competitor Ranking */}
                {(() => {
                  // Calculate mentions per company across ALL platforms
                  const mentionCounts = {};
                  mentionCounts[formData.companyName] = results.total_company_mentions + (results.chatgpt_company_mentions || 0);
                  
                  const allResults = [...results.analysis_results, ...(results.chatgpt_results || [])];
                  allResults.forEach(result => {
                    (result.competitors_mentioned || []).forEach(comp => {
                      mentionCounts[comp] = (mentionCounts[comp] || 0) + 1;
                    });
                  });
                  
                  // Sort by mentions (descending)
                  const ranking = Object.entries(mentionCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6); // Top 6
                  
                  if (ranking.length <= 1) return null;
                  
                  return (
                    <div className="mt-6 w-full bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <span>🏆</span> AI Zichtbaarheid Ranking
                      </p>
                      <div className="space-y-2">
                        {ranking.map(([name, count], idx) => {
                          const isUser = name === formData.companyName;
                          const medals = ['🥇', '🥈', '🥉'];
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                isUser 
                                  ? 'bg-green-100 border border-green-300 text-green-800 font-semibold' 
                                  : 'bg-white border border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="w-6 text-center">
                                {idx < 3 ? medals[idx] : `${idx + 1}.`}
                              </span>
                              <span className="flex-1 truncate">{name}</span>
                              <span className={`font-bold ${isUser ? 'text-green-700' : 'text-slate-500'}`}>
                                {count}x
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Scroll to GEO CTA button - only for non-logged in users */}
                {!user && (
                  <>
                    {/* GRATIS Account Promo Box */}
                    <div className="mt-6 w-full bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl p-5 border-2 border-emerald-200 shadow-lg relative overflow-hidden">
                      {/* GRATIS Badge */}
                      <div className="absolute -top-1 -right-1">
                        <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-xl shadow-md">
                          100% GRATIS
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Unlock meer inzichten</p>
                          <p className="text-xs text-slate-500">Geen creditcard nodig</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-slate-700"><strong>Dagelijks scannen</strong> op alle platforms</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-slate-700"><strong>AI Modus + AI Overviews</strong> analyse</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-slate-700"><strong>GEO Analyse</strong> + aanbevelingen</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-slate-700">Persoonlijk <strong>dashboard</strong></span>
                        </div>
                      </div>
                      
                      <Link 
                        href="/signup" 
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-600 transition shadow-md hover:shadow-lg"
                      >
                        <span>Maak gratis account</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                      
                      <p className="text-center text-xs text-slate-500 mt-2">
                        ✨ Geen verborgen kosten, voor altijd gratis
                      </p>
                    </div>
                    
                    <button
                      onClick={() => document.getElementById('geo-cta')?.scrollIntoView({ behavior: 'smooth' })}
                      className="mt-4 flex flex-col items-center gap-1 text-purple-600 hover:text-purple-800 transition group cursor-pointer"
                    >
                      <span className="text-sm font-medium">Of bekijk onze GEO diensten</span>
                      <svg className="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CTA tijdens scannen */}
        {analyzing && (
          <div className="text-center mb-8">
            <p className="text-slate-600 mb-3">Wij helpen bedrijven om beter gevonden te worden in AI-zoekmachines</p>
            <a href="https://www.onlinelabs.nl/skills/geo-optimalisatie" target="_blank" rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-all cursor-pointer">
              GEO optimalisatie →
            </a>
            <p className="text-slate-400 text-xs mt-2">Opent in een nieuwe tab – de scan blijft draaien</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700"><strong>Fout:</strong> {error}</div>
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
                <p className="text-purple-600 text-sm mb-4">✨ Gratis account = dagelijks scannen + AI Modus & AI Overviews</p>
                <Link href="/signup"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition cursor-pointer inline-block">
                  Gratis aanmelden →
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
