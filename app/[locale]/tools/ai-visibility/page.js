// app/tools/ai-visibility/page.js
// ✅ SESSION 11 - Redesign aligned with Homepage + Better Mobile Teun
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, TrendingUp, Zap, CheckCircle2, AlertCircle, Loader2, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
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
// CLEAN COMPETITOR NAME FOR DISPLAY
// Strips markdown, URLs, Google Business metadata from stored names
// ====================================
function cleanDisplayName(name) {
  if (!name) return ''
  let clean = name
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')  // [text](url) → text
    .replace(/https?:\/\/\S+/g, '')             // bare URLs
    .replace(/\*\*/g, '')                        // bold markdown
    .replace(/\[\d+\]/g, '')                     // citation refs [1][2]
    .replace(/\s*·\s*.*/g, '')                   // everything after · (Google metadata)
    .replace(/\(\d+\s*(?:beoordelingen|reviews?|sterren)\)/gi, '')  // (141 beoordelingen)
    .replace(/\(\s*\d+\s*\)/g, '')               // bare (141)
    .replace(/\b(Nu geopend|Gesloten|UitGesloten|Uit Gesloten|Tijdelijk gesloten)\b/gi, '')
    .replace(/\b(Event planner|Event venue|Event location|Boat rental service|Car rental agency|Travel agency|Insurance agency|Real estate agency|Wedding venue|Conference center|Restaurant|Hotel|Café|Bar|Shop|Store|Winkel|Salon|Kapper|Tandarts|Huisarts|Apotheek|Garage|Makelaar|Notaris|Advocaat|Accountant|Fysiotherapeut|Sportschool|Beauty salon|Hair salon|Marina|Yacht club)\b/gi, '')
    .replace(/[A-Z][a-z]+(?:straat|weg|laan|plein|gracht|kade|singel|dijk|pad)\s*\d+.*/gi, '')
    .replace(/\d{4}\s*[A-Z]{2}\b/g, '')
    .replace(/\d+[.,]\d+\s*★?/g, '')
    .replace(/★+/g, '')
    .replace(/\(uit\s+\d+.*/gi, '')
    .replace(/^[\s·•\-–—:,;|()\[\]]+/, '')
    .replace(/[\s·•\-–—:,;|()\[\]]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  // Extra validation: filter out garbage
  if (clean.length < 4) return ''
  if (clean.split(/\s+/).length > 6) return ''  // sentences, not names
  if (/^(dit|deze|dat|die|er|het|de|een|als|voor|naar|van|met|bij|wat|wie|waar|aanbevolen|enkele|diverse|bruine vloot|zeilvloot)\b/i.test(clean)) return ''
  if (/beoordelingen\)?$/i.test(clean)) return ''
  if (/reviews?\)?$/i.test(clean)) return ''
  if (/^\(\d+/.test(clean)) return ''
  if (/\.(nl|com|org|net|be|de|eu)$/i.test(clean)) return ''
  
  return clean
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
      const clean = cleanDisplayName(comp);
      if (clean && clean.length >= 3) {
        allCompetitors[clean] = (allCompetitors[clean] || 0) + 1;
      }
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
  const t = useTranslations('aiVisibility');
  const locale = useLocale();
  
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
        setCurrentStep(t('step3.preparing'));
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
      setError(t('step1.extractError'));
      return;
    }

    // Normalize URL — voeg https:// toe als ontbreekt
    let normalizedUrl = url
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    setExtractingKeywords(true);
    setError(null);
    setExtractionResult(null);

    try {
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: normalizedUrl,
          companyName: formData.companyName || '',
          category: formData.companyCategory || ''
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('step1.extractFetchError'));
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
        setError(t('step1.extractNone'));
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
    setCurrentStep(t('step3.preparing'));

    try {
      const queriesArray = formData.queries
        .split(/[,\n]/)
        .map(q => q.trim())
        .filter(q => q.length > 0);

      setProgress(5);
      
      const hasCustomPrompts = customPrompts && customPrompts.length > 0;
      const totalPrompts = hasCustomPrompts ? customPrompts.length : 10;
      
      if (hasCustomPrompts) {
        setCurrentStep(t('step3.customPromptsAnalyzing', { count: totalPrompts }));
      } else {
        setCurrentStep(t('step3.generatingPrompts'));
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
            setCurrentStep(t('step3.generatingPrompts'));
          } else if (rounded >= 20 && rounded < 97) {
            const currentPrompt = Math.min(estimatedPromptsProcessed, totalPrompts);
            setCurrentStep(t('step3.analyzingAI', { current: currentPrompt, total: totalPrompts }));
          } else if (rounded >= 97) {
            setCurrentStep(t('step3.processingResults', { current: totalPrompts, total: totalPrompts }));
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
          serviceArea: formData.serviceArea || null,
          locale: locale
        })
      });

      if (!response.ok) {
        clearInterval(progressInterval);
        clearInterval(stepInterval);
        const errorData = await response.json();
        throw new Error(errorData.error || t('step3.genericError'));
      }

      const data = await response.json();
      
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      
      setProgress(100);
      setCurrentStep(t('step3.completed'));
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
          <span className="text-sm">{t('loading')}</span>
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
                  <strong>{t('referral.via')}</strong> – {t('referral.autoFilled')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('referral.checkData')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-4">
            <Search className="w-4 h-4" />
            {t('badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-slate-900 leading-tight px-4">
            {t('title')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4 mb-4">
            {t('subtitle')}
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
              {t('aiMode')}
              <span className="text-[10px] text-slate-400">{t('accountTag')}</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {t('aiOverviews')}
              <span className="text-[10px] text-slate-400">{t('accountTag')}</span>
            </span>
          </div>
         <p className="text-xs text-slate-400">{t('platformInfo')}</p>
        </header>

        {/* Step Indicator - Pill style matching homepage CTA */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 flex-wrap px-2">
          {[
            { num: 1, label: t('steps.s1'), mobileLabel: t('steps.s1Mobile') },
            { num: 2, label: t('steps.s2'), mobileLabel: t('steps.s2Mobile') },
            { num: 3, label: t('steps.s3'), mobileLabel: t('steps.s3Mobile') },
            { num: 4, label: t('steps.s4'), mobileLabel: t('steps.s4Mobile') }
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
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{t('step1.heading')}</p>
                </div>

                {/* URL Extraction */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                  <div className="mb-3">
                    <strong className="text-slate-800 text-sm">{t('step1.urlLabel')}</strong>
                    <p className="text-xs text-slate-500 mt-0.5">{t('step1.urlHint')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value.toLowerCase() })}
                      placeholder={locale === "nl" ? "jouwwebsite.nl" : "yourwebsite.com"}
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
                          {t('loading')}
                        </>
                      ) : (
                        <>{t('step1.fetch')}</>
                      )}
                    </button>
                  </div>

                  {/* Extraction Success */}
                  {extractionResult && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span><strong>{t('step1.extractSuccess', { count: extractionResult.count })}</strong></span>
                      </div>
                      {(extractionResult.companyName || extractionResult.category) && (
                        <p className="text-xs text-green-600 mt-1 ml-6">
                          {extractionResult.companyName && <>{t('step3.summaryCompany')} {extractionResult.companyName}</>}
                          {extractionResult.companyName && extractionResult.category && <> · </>}
                          {extractionResult.category && <>{t('step3.summaryIndustry')} {extractionResult.category}</>}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-xs text-slate-400 font-medium">{t('step1.orManual')}</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                {/* Tip box - Desktop only */}
                <div className="hidden lg:block bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-700">
                      <strong className="text-slate-800">{t('step1.tipTitle')}</strong>
                      <p className="mt-1 text-slate-600">
                        {t('step1.tipText')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <label className="text-sm text-slate-700 font-medium block">
                    {t('step1.keywordsLabel')} <span className="text-blue-600">*</span>
                  </label>
                  <p className="text-xs text-slate-500 -mt-1 mb-2">
                    {t('step1.keywordsHint')}
                  </p>
                  <textarea
                    value={formData.queries}
                    onChange={(e) => setFormData({ ...formData, queries: e.target.value })}
                    placeholder={t('step1.keywordsPlaceholder')}
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
                        <div className="font-semibold text-slate-800">{t('advanced.title')}</div>
                        <div className="text-xs text-slate-500">{t('advanced.subtitle')}</div>
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
                            {t('advanced.info')}
                          </div>
                        </div>
                      </div>

                      {/* Preset Examples */}
                      <div className="space-y-3">
                        <label className="text-sm text-slate-700 font-medium block">
                          {t('advanced.clickExamples')}
                        </label>
                        
                        {/* Premium Examples */}
                        <div className="space-y-2">
                          <div className="text-xs text-purple-600 font-semibold">{t('advanced.premiumLabel')}</div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['premium', 'hoogwaardig', 'exclusief'] : ['premium', 'high-quality', 'exclusive'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + {locale === 'nl' ? 'premium, hoogwaardig, exclusief' : 'premium, high-quality, exclusive'}
                            </button>
                            <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['gespecialiseerd', 'ervaren', 'deskundig'] : ['specialized', 'experienced', 'expert'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + {locale === 'nl' ? 'gespecialiseerd, ervaren, deskundig' : 'specialized, experienced, expert'}
                            </button>
                            <button type="button" onClick={() => addExcludeTerms(locale === 'nl' ? ['goedkoop', 'budget', 'korting'] : ['cheap', 'budget', 'discount'])}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-all border border-red-200">
                              − {locale === 'nl' ? 'goedkoop, budget, korting' : 'cheap, budget, discount'}
                            </button>
                          </div>
                        </div>

                        {/* Local Service Examples */}
                        <div className="space-y-2">
                          <div className="text-xs text-blue-600 font-semibold">{t('advanced.localLabel')}</div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => addLocationTerms(['Amsterdam', 'Rotterdam', 'Utrecht'])}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-all border border-blue-200">
                              + Amsterdam, Rotterdam, Utrecht
                            </button>
                            <button type="button" onClick={() => addLocationTerms(locale === 'nl' ? ['landelijk actief', 'in Nederland'] : ['nationwide', 'United Kingdom'])}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-all border border-blue-200">
                              + {locale === 'nl' ? 'landelijk actief, in Nederland' : 'nationwide, United Kingdom'}
                            </button>
                            <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['lokaal', 'in de buurt', 'regio'] : ['local', 'nearby', 'region'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + {locale === 'nl' ? 'lokaal, in de buurt, regio' : 'local, nearby, region'}
                            </button>
                          </div>
                        </div>

                        {/* Service Quality Examples */}
                        <div className="space-y-2">
                          <div className="text-xs text-indigo-600 font-semibold">{t('advanced.qualityLabel')}</div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['24/7 bereikbaar', 'spoedservice', 'direct beschikbaar'] : ['24/7 available', 'emergency service', 'immediately available'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + {locale === 'nl' ? '24/7, spoedservice, direct' : '24/7, emergency, immediate'}
                            </button>
                            <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['transparant', 'vast tarief', 'duidelijke offerte'] : ['transparent', 'fixed rate', 'clear quote'])}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-all border border-green-200">
                              + {locale === 'nl' ? 'transparant, vast tarief, duidelijk' : 'transparent, fixed rate, clear'}
                            </button>
                          </div>
                        </div>

                        {/* Reset Button */}
                        <button type="button" onClick={() => { setExcludeTermsInput(''); setIncludeTermsInput(''); setLocationTermsInput(''); }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-all border border-slate-200">
                          {t('advanced.resetAll')}
                        </button>
                      </div>

                      {/* Input Fields */}
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <div className="space-y-2">
                          <label className="text-sm text-slate-700 font-medium flex items-center gap-2">
                            <span className="text-red-500">❌</span> {t('advanced.excludeLabel')}
                          </label>
                          <input type="text" value={excludeTermsInput} onChange={(e) => setExcludeTermsInput(e.target.value)}
                            placeholder={locale === 'nl' ? 'Bijv: goedkoop, budget, korting' : 'e.g. cheap, budget, discount'}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-sm" />
                          <div className="text-xs text-slate-500">{t('advanced.excludeHint')}</div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-slate-700 font-medium flex items-center gap-2">
                            <span className="text-green-500">✅</span> {t('advanced.includeLabel')}
                          </label>
                          <input type="text" value={includeTermsInput} onChange={(e) => setIncludeTermsInput(e.target.value)}
                            placeholder={locale === 'nl' ? 'Bijv: gespecialiseerd, ervaren, premium' : 'e.g. specialized, experienced, premium'}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-sm" />
                          <div className="text-xs text-slate-500">{t('advanced.includeHint')}</div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-slate-700 font-medium flex items-center gap-2">
                            <span className="text-blue-500">📍</span> {t('advanced.locationLabel')}
                          </label>
                          <input type="text" value={locationTermsInput} onChange={(e) => {
                            setLocationTermsInput(e.target.value);
                            // Sync met servicegebied
                            if (!formData.serviceArea || formData.serviceArea === locationTermsInput) {
                              setFormData(prev => ({ ...prev, serviceArea: e.target.value }));
                            }
                          }}
                            placeholder={locale === 'nl' ? 'Bijv: Amsterdam, landelijk actief, regio Utrecht' : 'e.g. London, nationwide, Greater Manchester'}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-sm" />
                          <div className="text-xs text-slate-500">{t('advanced.locationHint')}</div>
                        </div>
                      </div>

                      {/* Preview */}
                      {(excludeTermsInput || includeTermsInput || locationTermsInput) && (
                        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="text-xs text-purple-700 font-semibold mb-2">{t('advanced.activeSettings')}</div>
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
                      {t('step1.mascotText')}
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
                    {t('step1.next')}
                  </button>
                </div>
              </div>

              {/* Right: Teun Mascotte - Desktop */}
              <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center">
                <Image
                  src="/teun-ai-mascotte.png"
                  alt={locale === "nl" ? "Teun helpt je zoekwoorden kiezen" : "Teun helps you choose keywords"}
                  width={280}
                  height={350}
                  className="drop-shadow-2xl"
                />
                <p className="text-sm text-slate-500 mt-4 text-center font-medium">
                  {t('step1.mascotText')}
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
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{t('step2.heading')}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      {t('step2.companyLabel')} <span className="text-blue-600">*</span>
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
                            {t('step2.companyTooltip')}
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></span>
                          </span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder={t('step2.companyPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      {t('step2.industryLabel')} <span className="text-blue-600">*</span>
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
                            {t('step2.companyTooltip')}
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
                        if (locale === 'nl') setBrancheSuggestion(detectBranchLanguage(val));
                      }}
                      placeholder={t('step2.industryPlaceholder')}
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
                              {t.raw('step2.brancheWarningGeneric')}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start gap-2 mb-2">
                              <span className="flex-shrink-0">💡</span>
                              <p className="text-blue-800 text-xs">
                                {brancheSuggestion.original} {t('step2.brancheWarningSpecific')}
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
                            {t('step2.websiteTooltip')}
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></span>
                          </span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value.toLowerCase() })}
                      placeholder={locale === "nl" ? "jouwwebsite.nl" : "yourwebsite.com"}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                    />
                    {!formData.website && (
                      <p className="text-xs text-purple-600 mt-1.5">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                          </svg>
                          {t('step2.websiteTip')}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Servicegebied */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      {t('step2.serviceArea')}
                      <span className="text-xs font-normal text-slate-400">{t('step2.serviceAreaOptional')}</span>
                    </label>
                    <input
                      type="text"
                      value={formData.serviceArea}
                      onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                      placeholder={t('step2.serviceAreaPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                    />
                    <p className="text-xs text-slate-400">{t('step2.serviceAreaHint')}</p>
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
                      {t('step2.mascotText')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition cursor-pointer border border-slate-200"
                  >
                    {t('step2.back')}
                  </button>
                  <button
                    onClick={() => {
                      if (!formData.companyName || !formData.companyCategory) {
                        setError(t('step2.requiredError'));
                        return;
                      }
                      setError(null);
                      setStep(3);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    {t('step2.next')}
                  </button>
                </div>
              </div>

              {/* Right: Teun Mascotte - Desktop */}
              <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt={locale === "nl" ? "Teun wacht op je bedrijfsinfo" : "Teun awaits your company info"}
                  width={300}
                  height={380}
                  className="drop-shadow-2xl"
                />
                <p className="text-sm text-slate-500 mt-4 text-center font-medium">
                  {t('step2.mascotText')}
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
              <p className="text-xl font-bold text-slate-900 mb-2">{t('step3.analyzing')}</p>
              <p className="text-slate-600 mb-4">{currentStep || t('step3.preparing')}</p>
              
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
              <p className="text-xs text-slate-400 mt-3">{t('step3.progressHint')}</p>
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
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{t('step3.heading')}</p>
                </div>

                {analyzing ? (
                  <div className="space-y-6">
                    {/* Mobile Teun during scanning */}
                    <div className="flex lg:hidden justify-center mb-4">
                      <Image src="/teun-ai-mascotte.png" alt={locale === "nl" ? "Teun analyseert" : "Teun is analyzing"} width={140} height={175} className="drop-shadow-xl" />
                    </div>
                    
                    {/* Scanning Progress Box */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 text-center">
                      <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-xl font-bold text-slate-900 mb-2">{t('step3.analyzing')}</p>
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
                      <p className="text-xs text-slate-400 mt-3">{t('step3.progressHint')}</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="space-y-3 text-sm">
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress >= 20 ? 'text-green-600' : progress > 10 ? 'text-blue-600' : 'text-slate-400')}>
                        {progress >= 20 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>{customPrompts ? t('step3.progressStep1Custom') : t('step3.progressStep1')}</span>
                      </div>
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress >= 90 ? 'text-green-600' : progress > 20 ? 'text-blue-600' : 'text-slate-400')}>
                        {progress >= 90 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>{t('step3.progressStep2')}</span>
                      </div>
                      <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress === 100 ? 'text-green-600' : progress > 90 ? 'text-blue-600' : 'text-slate-400')}>
                        {progress === 100 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        <span>{t('step3.progressStep3')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Summary Card */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3 text-sm border border-slate-200">
                      <div className="flex justify-between items-start gap-3">
                        {t('step3.summaryCompany')}
                        <span className="text-slate-900 font-medium text-right">{formData.companyName}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3">
                        {t('step3.summaryIndustry')}
                        <span className="text-slate-900 font-medium text-right">{formData.companyCategory}</span>
                      </div>
                      {formData.queries && !customPrompts && (
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-slate-500 flex-shrink-0">{t('step3.summaryKeyword')}</span>
                          <span className="text-slate-900 font-medium text-right">
                            {formData.queries.split(/[,\n]/)[0]?.trim() || t('step3.summaryNoKeywords')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-slate-500 flex-shrink-0">{t('step3.summaryPrompts')}</span>
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
                          <span>{t('step3.customPromptsTitle', { count: customPrompts.length })}</span>
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
                          {t('step3.cancelCustom')}
                        </button>
                      </div>
                    )}

                    {/* Advanced Settings in Step 3 */}
                    {(excludeTermsInput || includeTermsInput || locationTermsInput) && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                        <div className="text-sm text-indigo-800 font-semibold mb-3 flex items-center gap-2">
                          <span>⚙️</span>
                          <span>{t('step3.advancedTitle')}</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          {excludeTermsInput && <div className="flex items-start gap-2"><span className="text-red-600 flex-shrink-0">{t('advanced.avoid')}</span><span className="text-slate-700">{excludeTermsInput}</span></div>}
                          {includeTermsInput && <div className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✅ Gebruik:</span><span className="text-slate-700">{includeTermsInput}</span></div>}
                          {locationTermsInput && <div className="flex items-start gap-2"><span className="text-blue-600 flex-shrink-0">{t('advanced.location')}</span><span className="text-slate-700">{locationTermsInput}</span></div>}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-6">
                      <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition cursor-pointer text-sm sm:text-base whitespace-nowrap border border-slate-200">
                        {t('step3.back')}
                      </button>
                      <button
                        onClick={() => { setFromHomepage(false); handleAnalyze(); }}
                        className={`flex-1 px-5 py-3 sm:py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-bold rounded-xl hover:from-[#2D2D5F] hover:to-[#3D3D7F] transition shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base ${fromHomepage ? 'animate-bounce' : ''}`}>
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                        {t('step3.startAnalysis')}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Teun Mascotte - 2 columns */}
              <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center">
                <Image src="/teun-ai-mascotte.png" alt={locale === "nl" ? "Teun helpt je analyseren" : "Teun helps you analyze"} width={280} height={350} className="drop-shadow-2xl" />
                <p className="text-sm text-slate-500 mt-4 text-center">
                  {t('step3.mascotText')}
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
                <Image src="/Teun-ai-blij-met-resultaat.png" alt={locale === "nl" ? "Teun is blij!" : "Teun is happy!"} width={120} height={150} className="drop-shadow-xl mx-auto" />
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
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{t('step4.heading')}</p>
                </div>

                {/* Success Banner */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-700">
                      <strong className="text-green-800">{t('step4.analysisComplete')}</strong>
                      <p className="mt-1 text-slate-600">
                        {t.rich('step4.reportReady', { company: formData.companyName, strong: (chunks) => <strong>{chunks}</strong> })}
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
                          {t('step4.nameMismatchTitle', { name: nameMismatch.name })}
                        </p>
                        <p className="text-xs text-amber-700 mb-3">
                          {t('step4.nameMismatchDesc', { company: formData.companyName, match: nameMismatch.name, count: nameMismatch.count })}
                          {nameMismatch.reason === 'typo' && ` ${t('step4.nameMismatchTypo')}`}
                          {nameMismatch.reason === 'substring' && ` ${t('step4.nameMismatchSubstring')}`}
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
                          {t('step4.rescanAs', { name: nameMismatch.name })}
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
                    {resultPlatform === 'chatgpt' ? t('step4.chatgptDesc') : t('step4.perplexityDesc')}
                  </p>
                </div>

                {/* Unlock extra platforms for non-logged-in users */}
                {!user && (
                  <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-bl-lg">
                        {t('unlock.free')}
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
                          <span className="font-bold text-slate-800 text-sm sm:text-base block">{t('unlock.title')}</span>
                          <span className="text-xs text-slate-500">{t('unlock.subtitle')}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-white/80 rounded-full text-slate-600 border border-slate-200">{t('unlock.aiModeScans')}</span>
                        <span className="px-2 py-1 bg-white/80 rounded-full text-slate-600 border border-slate-200">{t('unlock.aiOverviewsScans')}</span>
                        <span className="px-2 py-1 bg-white/80 rounded-full text-slate-600 border border-slate-200">{t('unlock.geoAnalysis')}</span>
                        <span className="px-2 py-1 bg-white/80 rounded-full text-slate-600 border border-slate-200">{t('unlock.dashboard')}</span>
                      </div>
                      
                      <Link 
                        href="/signup" 
                        className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold rounded-lg hover:from-emerald-600 hover:to-green-600 transition shadow-md text-center"
                      >
                        {t('unlock.createAccount')}
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
                        <p className="text-sm font-medium text-purple-900">{t('step4.websiteAnalyzed')}</p>
                        <p className="text-xs text-purple-600">
                          {t('step4.keywordsExtracted', { count: results.enhancedKeywords?.length || 0 })}
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
                  const activeCompetitors = [...new Set(activeResults.flatMap(r => r.competitors_mentioned || []).map(c => cleanDisplayName(c)).filter(c => c && c.length >= 3))];
                  
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{activeMentions}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-medium leading-tight">
                            <span className="hidden sm:inline">{t('step4.mentions')}</span><span className="sm:hidden">{t('step4.mentionsMobile')}</span>
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
                            <span className="hidden sm:inline">{t('step4.competitorsLabel')}</span><span className="sm:hidden">{t('step4.competitorsMobile')}</span>
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
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{
                                  (result.simulated_ai_response_snippet || '')
                                    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
                                    .replace(/https?:\/\/\S+/g, '')
                                    .replace(/\*\*/g, '')
                                    .replace(/\[\d+\]/g, '')
                                    .replace(/\b(Nu geopend|Gesloten|Tijdelijk gesloten)\b/gi, '')
                                    .replace(/\(\d+\s*(?:beoordelingen|reviews?)\)/gi, '')
                                    .replace(/\s*·\s*(Car rental agency|Event planner|Event venue|Boat rental service|Travel agency|Restaurant|Hotel|Café)\s*/gi, ' ')
                                    .replace(/\d+[.,]\d+\s*★?/g, '')
                                    .replace(/\s+/g, ' ')
                                    .trim()
                                }</p>
                                {result.competitors_mentioned?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 sm:mt-3">
                                    <span className="text-[10px] sm:text-xs text-slate-500">{t('step4.competitorsLabel')}</span>
                                    {result.competitors_mentioned.map((comp, i) => {
                                      const clean = cleanDisplayName(comp)
                                      if (!clean || clean.length < 3) return null
                                      return (
                                        <span key={i} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                                          {clean}
                                        </span>
                                      )
                                    })}
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
                  <div id="geo-cta" className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                    <p className="text-lg font-bold text-slate-900 mb-2">{t('geoCta.title')}</p>
                    <p className="text-slate-600 text-sm max-w-md mx-auto mb-5">
                      {t('geoCta.description')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-[#292956] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1e1e45] transition-colors">
                        {t('geoCta.createAccount')} <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </Link>
                      <Link href="/login" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors">
                        {t('geoCta.login')}
                      </Link>
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
                    {t('step4.newAnalysis')}
                  </button>
                  <Link href="/"
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg transition text-center cursor-pointer text-sm sm:text-base">
                    {t('step4.backHome')}
                  </Link>
                </div>

                {/* OnlineLabs Back Link */}
                {referralSource === 'onlinelabs' && (
                  <div className="mb-6">
                    <a href="https://onlinelabs.nl/skills/geo-optimalisatie"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition border border-blue-200 w-full justify-center">
                      {t('step4.backOnlineLabs')}
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
                <Image src="/Teun-ai-blij-met-resultaat.png" alt={locale === "nl" ? "Teun is blij met je resultaat!" : "Teun is happy with your results!"} width={240} height={300} className="drop-shadow-2xl" />
                <p className="text-sm text-slate-500 mt-4 text-center font-medium">
                  {(results.total_company_mentions + (results.chatgpt_company_mentions || 0)) > 0 
                    ? t('step4.mascotHappy', { count: results.total_company_mentions + (results.chatgpt_company_mentions || 0) }) 
                    : t('step4.mascotImprove')}
                </p>

                {/* Competitor Ranking */}
                {(() => {
                  // Calculate mentions per company across ALL platforms
                  const mentionCounts = {};
                  mentionCounts[formData.companyName] = results.total_company_mentions + (results.chatgpt_company_mentions || 0);
                  
                  const allResults = [...results.analysis_results, ...(results.chatgpt_results || [])];
                  allResults.forEach(result => {
                    (result.competitors_mentioned || []).forEach(comp => {
                      const clean = cleanDisplayName(comp);
                      if (clean && clean.length >= 3) {
                        mentionCounts[clean] = (mentionCounts[clean] || 0) + 1;
                      }
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
                        <span>🏆</span> {t('step4.rankingTitle')}
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

              </div>
            </div>
          </section>
        )}

        {/* CTA tijdens scannen */}
        {analyzing && (
          <div className="text-center mb-8">
            <p className="text-slate-600 mb-3">{t('scanCta.text')}</p>
            <a href="https://www.onlinelabs.nl/skills/geo-optimalisatie" target="_blank" rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-all cursor-pointer">
              {t('scanCta.button')}
            </a>
            <p className="text-slate-400 text-xs mt-2">{t('scanCta.hint')}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700"><strong>{t('error.prefix')}</strong> {error}</div>
            </div>
          </div>
        )}

        {!analyzing && (
          <div className="text-center">
            <p className="text-slate-500 mb-2">
              {user ? t('footer.loggedInAs', { email: user.email }) : t('footer.moreAnalyses')}
            </p>
            {!user && (
              <>
                <p className="text-slate-500 text-sm mb-4">{t('footer.freeAccountInfo')}</p>
                <Link href="/signup"
                  className="px-6 py-3 bg-[#292956] hover:bg-[#1e1e45] text-white rounded-lg font-semibold transition cursor-pointer inline-block">
                  {t('footer.signUp')}
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
