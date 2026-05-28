// app/[locale]/tools/ai-visibility/page.js
// Redesign: cream/Lora/spark — sitewide consistency met homepage
// Functionaliteit identiek aan SESSION 11 — alleen visuele laag vervangen
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { trackScanComplete } from '@/lib/gtm';

// ============================================
// BRANCHE TAALDETECTIE (EN → NL)
// ============================================
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

  if (BRANCHE_EN_TO_NL[lower]) {
    return { type: 'exact', suggestions: BRANCHE_EN_TO_NL[lower], original: input };
  }

  for (const [en, nl] of Object.entries(BRANCHE_EN_TO_NL)) {
    if (lower.includes(en) || en.includes(lower)) {
      return { type: 'partial', suggestions: nl, original: input, matchedTerm: en };
    }
  }

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

// ============================================
// CLEAN COMPETITOR NAME FOR DISPLAY
// ============================================
function cleanDisplayName(name) {
  if (!name) return '';
  let clean = name
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\s*·\s*.*/g, '')
    .replace(/\(\d+\s*(?:beoordelingen|reviews?|sterren)\)/gi, '')
    .replace(/\(\s*\d+\s*\)/g, '')
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
    .trim();

  if (clean.length < 4) return '';
  if (clean.split(/\s+/).length > 6) return '';
  if (/^(dit|deze|dat|die|er|het|de|een|als|voor|naar|van|met|bij|wat|wie|waar|aanbevolen|enkele|diverse|bruine vloot|zeilvloot)\b/i.test(clean)) return '';
  if (/beoordelingen\)?$/i.test(clean)) return '';
  if (/reviews?\)?$/i.test(clean)) return '';
  if (/^\(\d+/.test(clean)) return '';
  if (/\.(nl|com|org|net|be|de|eu)$/i.test(clean)) return '';

  return clean;
}

// ============================================
// BEDRIJFSNAAM FUZZY MATCHING
// ============================================
function findNameInCompetitors(companyName, analysisResults) {
  if (!companyName || !analysisResults?.length) return null;

  const nameLower = companyName.toLowerCase().trim();
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);

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

    if (compLower === nameLower) continue;

    if (compLower.includes(nameLower) || nameLower.includes(compLower)) {
      matches.push({ name: comp, count, confidence: 'high', reason: 'substring' });
      continue;
    }

    const compWords = compLower.split(/\s+/).filter(w => w.length > 2);
    const sharedWords = nameWords.filter(w => compWords.some(cw =>
      cw.includes(w) || w.includes(cw) || levenshteinDistance(w, cw) <= 2
    ));

    if (sharedWords.length > 0 && (sharedWords.length / Math.max(nameWords.length, 1)) >= 0.5) {
      matches.push({ name: comp, count, confidence: 'medium', reason: 'word_overlap' });
      continue;
    }

    const distance = levenshteinDistance(nameLower, compLower);
    const maxLen = Math.max(nameLower.length, compLower.length);
    if (distance <= 3 && (distance / maxLen) < 0.3) {
      matches.push({ name: comp, count, confidence: 'high', reason: 'typo' });
    }
  }

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

// ============================================
// FAQ ACCORDION — cream/Lora style (matcht homepage)
// ============================================
function FAQAccordion({ items }) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="tool-faq-list">
      {items.map((item, i) => (
        <details key={i} className="tool-faq-item" open={openIdx === i} onToggle={(e) => {
          if (e.target.open) setOpenIdx(i);
        }}>
          <summary>
            <span className="num">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="q">{item.q}</h3>
            <span className="toggle" aria-hidden="true">
              <svg viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <div className="answer-wrap">
            <div className="answer">{item.a}</div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
function AIVisibilityToolContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('aiVisibility');
  const locale = useLocale();
  const isEn = locale === 'en';

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
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoTheater, setVideoTheater] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    companyCategory: '',
    queries: '',
    website: '',
    serviceArea: ''
  });
  const [customPrompts, setCustomPrompts] = useState(null);

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
  const [showKeywordsInput, setShowKeywordsInput] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [languageMismatch, setLanguageMismatch] = useState(null);
  const scanCompleteFiredRef = useRef(true);

  // Stap B: edit-state voor customPrompts (inline editing van zoekvragen)
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [fallbackError, setFallbackError] = useState(false);
  const fallbackTriedRef = useRef(false);

  // Cream theme on body
  useEffect(() => {
    document.body.classList.add('theme-cream');
    return () => document.body.classList.remove('theme-cream');
  }, []);

  // Auto-open keyword-input als queries al gevuld zijn (via URL-param of sessionStorage)
  useEffect(() => {
    if (formData.queries?.trim()?.length > 0) {
      setShowKeywordsInput(true);
    }
  }, [formData.queries]);

  // Close tooltip on outside tap
  useEffect(() => {
    if (!activeTooltip) return;
    const close = () => setActiveTooltip(null);
    const timer = setTimeout(() => document.addEventListener('click', close, { once: true }), 10);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [activeTooltip]);

  // Theater mode
  useEffect(() => {
    if (!videoTheater) return;
    const handleKey = (e) => { if (e.key === 'Escape') setVideoTheater(false); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [videoTheater]);

  // Handle URL Parameters from OnlineLabs
  useEffect(() => {
    if (!searchParams) { setInitializing(false); return; }

    // Back-nav vanuit signup/login OF refresh op resultatenpagina:
    // Als er geen nieuwe pre-fill van Explorer in sessionStorage staat (= niet net aangekomen)
    // maar er WEL saved scan-resultaten zijn, herstel die direct naar step 4.
    // Dit is betrouwbaarder dan performance.navigation of document.referrer (browser-afhankelijk).
    try {
      const hasNewPrefill = !!sessionStorage.getItem('teun_custom_prompts');
      if (!hasNewPrefill) {
        const saved = sessionStorage.getItem('teun_scan_results');
        const savedForm = sessionStorage.getItem('teun_scan_formData');
        if (saved && savedForm) {
          setResults(JSON.parse(saved));
          setFormData(JSON.parse(savedForm));
          setStep(4);
          setInitializing(false);
          console.log('📋 Scan resultaten hersteld (geen nieuwe pre-fill aanwezig)');
          return;
        }
      }
    } catch (_) {}

    const pendingScan = sessionStorage.getItem('pendingScan');
    if (pendingScan) {
      try {
        const data = JSON.parse(pendingScan);
        sessionStorage.removeItem('pendingScan');
        console.log('📝 Pending scan loaded from dashboard:', data);

        setFormData(prev => ({
          ...prev,
          companyName: data.companyName || prev.companyName,
          companyCategory: data.companyCategory || prev.companyCategory,
          website: data.websiteUrl || prev.website
        }));

        if (data.customPrompts && data.customPrompts.length > 0) {
          setCustomPrompts(data.customPrompts);
        }

        setStep(3);
        return;
      } catch (e) {
        console.error('Error loading pending scan:', e);
        sessionStorage.removeItem('pendingScan');
      }
    }

    const stepParam = searchParams.get('step');
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
            companyCategory: category || prev.companyCategory,
            website: websiteParam || prev.website
          }));

          setCustomPrompts(parsedPrompts);
          setStep(3);
          sessionStorage.removeItem('teun_custom_prompts');

          if (autostart === 'true') {
            setFromHomepage(true);
            setAnalyzing(true);
            setProgress(0);
            setCurrentStep(t('step3.preparing'));
            setPendingAutoStart(true);
          }
          setInitializing(false);
          return;
        }

        // Drielaagse fallback: sessionStorage leeg, probeer DB-fetch (latest discovery
        // voor deze sessie). Bij geen rij of fout: foutbanner met alternatieve flow.
        if (!fallbackTriedRef.current) {
          fallbackTriedRef.current = true;
          setFormData(prev => ({
            ...prev,
            companyName: company || prev.companyName,
            companyCategory: category || prev.companyCategory,
            website: websiteParam || prev.website
          }));
          setStep(3);

          fetch('/api/prompt-discovery/latest')
            .then(r => r.json())
            .then(data => {
              if (data?.found && Array.isArray(data.prompts) && data.prompts.length > 0) {
                console.log('📝 Custom prompts via DB-fallback:', data.prompts.length);
                setCustomPrompts(data.prompts);
                setFormData(prev => ({
                  ...prev,
                  companyName: company || data.companyName || prev.companyName,
                  website: websiteParam || data.website || prev.website,
                }));
              } else {
                setFallbackError(true);
              }
            })
            .catch(err => {
              console.error('Fallback fetch failed:', err);
              setFallbackError(true);
            })
            .finally(() => setInitializing(false));
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
        const hasSavedResults = (() => { try { return !!sessionStorage.getItem('teun_scan_results'); } catch (_) { return false; } })();
        if (hasSavedResults) {
          console.log('📋 Autostart overgeslagen — resultaten uit sessionStorage');
          setInitializing(false);
          return;
        }
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [pendingAutoStart, setPendingAutoStart] = useState(false);

  // Browser-back: herstel resultaten uit sessionStorage
  useEffect(() => {
    const isBackNav = (() => {
      try {
        const navEntry = performance.getEntriesByType?.('navigation')?.[0];
        if (navEntry?.type === 'back_forward') return true;
        if (performance.navigation?.type === 2) return true;
        if (document.referrer && /\/(signup|login|en\/signup|en\/login)/.test(document.referrer)) return true;
      } catch (_) {}
      return false;
    })();

    const hasPendingScan = (() => { try { return !!sessionStorage.getItem('pendingScan'); } catch (_) { return false; } })();

    if (isBackNav && !results && !analyzing && !hasPendingScan) {
      try {
        const saved = sessionStorage.getItem('teun_scan_results');
        const savedForm = sessionStorage.getItem('teun_scan_formData');
        if (saved && savedForm) {
          setResults(JSON.parse(saved));
          setFormData(JSON.parse(savedForm));
          setStep(4);
          console.log('📋 Scan resultaten hersteld (back-navigatie)');
        }
      } catch (_) {}
    }

    const handlePopState = () => {
      if (results || analyzing) return;
      try {
        const saved = sessionStorage.getItem('teun_scan_results');
        const savedForm = sessionStorage.getItem('teun_scan_formData');
        if (saved && savedForm) {
          setResults(JSON.parse(saved));
          setFormData(JSON.parse(savedForm));
          setStep(4);
          console.log('📋 Scan resultaten hersteld (popstate)');
        }
      } catch (_) {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
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

  // ============================================
  // EXTRACT KEYWORDS FROM URL
  // ============================================
  const handleExtractKeywords = async () => {
    const url = formData.website?.trim();
    if (!url) {
      setError(t('step1.extractError'));
      return;
    }

    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
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
        setFormData(prev => {
          const userKeywords = prev.queries?.trim()
            ? prev.queries.split(/[,\n]/).map(k => k.trim()).filter(k => k)
            : [];
          const userLowerSet = new Set(userKeywords.map(k => k.toLowerCase()));
          const newKeywords = data.keywords.filter(k => !userLowerSet.has(k.toLowerCase()));
          const merged = [...userKeywords, ...newKeywords];
          return {
            ...prev,
            queries: merged.join(', '),
            companyName: prev.companyName || data.companyName || '',
            companyCategory: prev.companyCategory || data.category || '',
          };
        });
        setExtractionResult({
          count: data.keywords.length,
          source: data.source,
          companyName: data.companyName,
          category: data.category,
          fallback: data.fallback === true,
        });
        setShowKeywordsInput(true);
        setExtractionFailed(false);
        if (data.detectedLanguage && data.detectedLanguage !== locale) {
          setLanguageMismatch(data.detectedLanguage);
        } else {
          setLanguageMismatch(null);
        }
      } else {
        setError(t('step1.extractNone'));
        setShowKeywordsInput(true);
        setExtractionFailed(true);
      }
    } catch (err) {
      setError(err.message);
      setShowKeywordsInput(true);
      setExtractionFailed(true);
    } finally {
      setExtractingKeywords(false);
    }
  };

  useEffect(() => {
    if (results && !scanCompleteFiredRef.current) {
      scanCompleteFiredRef.current = true;
      trackScanComplete({ tool: 'ai-visibility', locale });
    }
  }, [results, locale]);

  // ============================================
  // STAP B: inline edit + add/remove voor customPrompts
  // ============================================
  const startEditPrompt = (index) => {
    if (!customPrompts) return;
    setEditingIndex(index);
    setEditingText(customPrompts[index] || '');
  };
  const saveEditPrompt = () => {
    const txt = editingText.trim();
    if (!txt || editingIndex === null) {
      cancelEditPrompt();
      return;
    }
    setCustomPrompts(prev => {
      if (!prev) return prev;
      const next = [...prev];
      next[editingIndex] = txt;
      return next;
    });
    cancelEditPrompt();
  };
  const cancelEditPrompt = () => {
    setEditingIndex(null);
    setEditingText('');
  };
  const removePromptAt = (index) => {
    setCustomPrompts(prev => {
      if (!prev) return prev;
      return prev.filter((_, i) => i !== index);
    });
    if (editingIndex === index) cancelEditPrompt();
  };
  const addNewPrompt = () => {
    const txt = newPromptText.trim();
    if (!txt) return;
    if ((customPrompts?.length || 0) >= 10) return;
    setCustomPrompts(prev => (prev ? [...prev, txt] : [txt]));
    setNewPromptText('');
  };

  // Dynamische tab-title tijdens scan: 'Scannen [bedrijf]... | Teun.ai'
  useEffect(() => {
    if (!analyzing) return;
    const company = (formData.companyName || '').trim();
    if (!company) return;
    const prevTitle = document.title;
    document.title = t('step3.tabTitleScanning', { company });
    return () => { document.title = prevTitle; };
  }, [analyzing, formData.companyName, t]);

  // ============================================
  // HANDLE ANALYZE — kern scan flow
  // ============================================
  const handleAnalyze = async () => {
    try { sessionStorage.removeItem('teun_scan_results'); sessionStorage.removeItem('teun_scan_formData'); } catch (_) {}
    setResults(null);
    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setCurrentStep(t('step3.preparing'));
    scanCompleteFiredRef.current = false;

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

      const dataWithMeta = { ...data };

      setProgress(100);
      setCurrentStep(t('step3.completed'));
      setResults(dataWithMeta);
      setCustomPrompts(null);

      try {
        sessionStorage.setItem('teun_scan_results', JSON.stringify(dataWithMeta));
        sessionStorage.setItem('teun_scan_formData', JSON.stringify(formData));
      } catch (_) {}

      // Sla integration-id op in sessionStorage (per browser-tab) zodat we bij
      // signup alleen DEZE scan kunnen claimen. Voorkomt cross-contamination
      // wanneer een eerdere browser-gebruiker scans heeft achtergelaten.
      if (data?.integrationId) {
        try {
          const raw = sessionStorage.getItem('teun_my_scans');
          const store = raw ? JSON.parse(raw) : { integrationIds: [], discoveryIds: [] };
          if (!Array.isArray(store.integrationIds)) store.integrationIds = [];
          if (!Array.isArray(store.discoveryIds)) store.discoveryIds = [];
          if (!store.integrationIds.includes(data.integrationId)) {
            store.integrationIds.push(data.integrationId);
          }
          sessionStorage.setItem('teun_my_scans', JSON.stringify(store));
        } catch (_) {}
      }

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

  // ============================================
  // RENDER
  // ============================================

  // ============================================
  // RENDER
  // ============================================

  // Initializing state — show loading
  if (initializing) {
    return (
      <div className="tool-init">
        <div className="tool-init-spinner" aria-label={t('loading')}>
          <span className="dot"></span><span className="dot"></span><span className="dot"></span>
        </div>
        
      </div>
    );
  }

  // ============================================
  // MAIN RETURN — JSX
  // ============================================
  return (
    <div className="tool-page" suppressHydrationWarning>
      

      <div className="tool-wrap">

        {/* OnlineLabs Referral Banner */}
        {referralSource === 'onlinelabs' && (
          <div className="tool-referral">
            <div className="tool-referral-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <p><strong>{t('referral.via')}</strong> {t('referral.autoFilled')}</p>
              <p className="small">{t('referral.checkData')}</p>
            </div>
          </div>
        )}

        {/* Hero */}
        <header className="tool-hero">
          <div className="tool-eyebrow">{t('badge')}</div>
          <h1>
            {locale === 'nl' ? (
              <>Hoe zichtbaar is jouw merk in <em>AI-zoekmachines</em>?</>
            ) : (
              <>How visible is your brand in <em>AI search engines</em>?</>
            )}
          </h1>
          <p className="tool-hero-sub">{t('subtitle')}</p>
          <div className="tool-trust-pills">
            <span className="tool-trust-pill">
              <span className="pulse-dot"></span>
              ChatGPT
            </span>
            <span className="tool-trust-pill">
              <span className="pulse-dot"></span>
              Perplexity
            </span>
            <span className="tool-trust-pill">
              <span className="pulse-dot"></span>
              {t('aiMode')}
              <span className="acc-tag">{t('accountTag')}</span>
            </span>
            <span className="tool-trust-pill">
              <span className="pulse-dot"></span>
              {t('aiOverviews')}
              <span className="acc-tag">{t('accountTag')}</span>
            </span>
          </div>
          <p className="tool-platform-info">{t('platformInfo')}</p>
        </header>

        {/* Demo Video */}
        {step === 1 && !analyzing && !results && (
          <div className="tool-video-wrap">
            <p className="tool-video-label">
              {locale === 'nl' ? '▶ Bekijk hoe de scan werkt (2,5x versneld)' : '▶ See how the scan works (2.5x speed)'}
            </p>
            <div className={`tool-video-frame ${videoTheater ? 'invisible' : ''}`}>
              {!videoPlaying ? (
                <button onClick={() => setVideoPlaying(true)} className="tool-video-poster">
                  <Image
                    src="/Teun.ai-AI-zichtbaarheidsanalyse-poster.webp"
                    alt={locale === 'nl' ? 'AI Zichtbaarheid Scan demo' : 'AI Visibility Scan demo'}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                  <div className="overlay" />
                  <div className="tool-video-play">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </button>
              ) : !videoTheater && (
                <>
                  <video autoPlay controls controlsList="nofullscreen" playsInline style={{ width: '100%', height: '100%' }} onPlay={(e) => { e.target.playbackRate = 2.5; }}>
                    <source src="/Teun.ai-AI-zichtbaarheidsanalyse.mp4" type="video/mp4" />
                  </video>
                  <button onClick={() => setVideoTheater(true)} className="tool-video-theater-btn" title="Theater modus">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            {videoTheater && (
              <div className="tool-theater">
                <button onClick={() => setVideoTheater(false)} className="tool-theater-close">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="tool-theater-video">
                  <video autoPlay controls controlsList="nofullscreen" playsInline style={{ width: '100%', height: '100%' }} onPlay={(e) => { e.target.playbackRate = 2.5; }}>
                    <source src="/Teun.ai-AI-zichtbaarheidsanalyse.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step indicator */}
        <div className="tool-steps" role="list" aria-label="Scan stappen">
          {[
            { num: 1, label: t('steps.s1'), mobileLabel: t('steps.s1Mobile') },
            { num: 2, label: t('steps.s2'), mobileLabel: t('steps.s2Mobile') },
            { num: 3, label: t('steps.s3'), mobileLabel: t('steps.s3Mobile') },
            { num: 4, label: t('steps.s4'), mobileLabel: t('steps.s4Mobile') }
          ].map(({ num, label, mobileLabel }) => (
            <div
              key={num}
              role="listitem"
              className={`tool-step-pill ${step === num ? 'active' : step > num ? 'done' : ''}`}
              aria-current={step === num ? 'step' : undefined}
            >
              {num}. <span style={{ display: 'inline' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ====================================== */}
        {/* STEP 1 — Zoekwoorden + URL extractie  */}
        {/* ====================================== */}
        {step === 1 && (
          <section className="tool-section">
            <div className="tool-scan-grid">
              <div>
                <div className="tool-section-header">                  <h2 className="tool-section-title">{t('step1.heading')}</h2>
                </div>

                {/* URL Extraction box */}
                <div className="tool-url-box">
                  <label htmlFor="aiv-url" className="tool-url-box-label">{t('step1.urlLabel')}</label>
                  <p className="tool-url-box-hint">{t('step1.urlHint')}</p>
                  <div className="tool-url-row">
                    <input
                      id="aiv-url"
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value.toLowerCase() })}
                      placeholder={locale === 'nl' ? 'jouwwebsite.nl' : 'yourwebsite.com'}
                      className="tool-input"
                      style={{ flex: 1 }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleExtractKeywords(); } }}
                    />
                    <button onClick={handleExtractKeywords} disabled={extractingKeywords || !formData.website?.trim()} className="tool-btn-primary">
                      {extractingKeywords ? (
                        <>
                          <span className="tool-init-spinner"><span className="dot"></span><span className="dot"></span><span className="dot"></span></span>
                          {t('loading')}
                        </>
                      ) : (
                        <>{t('step1.fetch')}</>
                      )}
                    </button>
                  </div>

                  {languageMismatch && (
                    <div style={{
                      background: '#E8F0FE',
                      border: '1.5px solid #4285F4',
                      borderRadius: 10,
                      padding: '14px 16px',
                      marginTop: 12,
                      color: '#1A3C7A',
                      fontSize: 14,
                      lineHeight: 1.5
                    }}>
                      <strong>🌐 {t('step1.languageMismatchTitle')}</strong>
                      <p style={{ margin: '6px 0 10px 0' }}>{t('step1.languageMismatchHint')}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const otherLocale = locale === 'nl' ? 'en' : 'nl';
                            const params = new URLSearchParams();
                            if (formData.companyName) params.set('company', formData.companyName);
                            if (formData.companyCategory) params.set('category', formData.companyCategory);
                            if (formData.website) params.set('website', formData.website);
                            if (formData.queries) params.set('keywords', formData.queries);
                            const prefix = otherLocale === 'en' ? '/en' : '';
                            window.location.href = `${prefix}/tools/ai-visibility?${params.toString()}`;
                          }}
                          style={{
                            background: '#1A3C7A',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {t('step1.languageMismatchSwitch')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguageMismatch(null)}
                          style={{
                            background: 'transparent',
                            color: '#1A3C7A',
                            border: 'none',
                            padding: '8px 4px',
                            fontSize: 13,
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          {t('step1.languageMismatchDismiss')}
                        </button>
                      </div>
                    </div>
                  )}

                  {extractionResult && !extractionResult.fallback && (
                    <div className="tool-extract-success">
                      <strong>✓ {t('step1.extractSuccess', { count: extractionResult.count })}</strong>
                      {(extractionResult.companyName || extractionResult.category) && (
                        <div className="meta">
                          {extractionResult.companyName && <>{t('step3.summaryCompany')} {extractionResult.companyName}</>}
                          {extractionResult.companyName && extractionResult.category && <> · </>}
                          {extractionResult.category && <>{t('step3.summaryIndustry')} {extractionResult.category}</>}
                        </div>
                      )}
                    </div>
                  )}

                  {extractionResult && extractionResult.fallback && (
                    <div style={{
                      background: '#FFF4E6',
                      border: '1.5px solid #FFB66B',
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginTop: 12,
                      color: '#7A4A1A',
                      fontSize: 14,
                      lineHeight: 1.5
                    }}>
                      <strong>⚠️ {t('step1.extractFallbackTitle', { count: extractionResult.count })}</strong>
                      <p style={{ margin: '6px 0 0 0' }}>{t('step1.extractFallbackHint')}</p>
                    </div>
                  )}
                </div>

                {!showKeywordsInput ? (
                  <div style={{ marginTop: 18, marginBottom: 22 }}>
                    <button
                      type="button"
                      onClick={() => setShowKeywordsInput(true)}
                      className="tool-advanced-toggle"
                    >
                      <div className="tool-advanced-toggle-info">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M8 12h8" />
                        </svg>
                        <div className="tool-advanced-toggle-text">
                          <strong>{t('step1.addKeywordsToggle')}</strong>
                          <span>{t('step1.addKeywordsSubtitle')}</span>
                        </div>
                      </div>
                      <svg className="chevron" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="tool-divider">
                      <span>{t('step1.orManual')}</span>
                    </div>

                    {extractionFailed && (
                      <div style={{
                        background: '#FFF4E6',
                        border: '1.5px solid #FFB66B',
                        borderRadius: 10,
                        padding: '14px 16px',
                        marginBottom: 16,
                        color: '#7A4A1A',
                        fontSize: 14,
                        lineHeight: 1.5
                      }}>
                        {t('step1.extractFailedFallback')}
                      </div>
                    )}

                    <div style={{ marginBottom: 22 }}>
                      <label htmlFor="aiv-queries" className="tool-label">
                        {t('step1.keywordsLabel')} <span className="opt">{t('step1.keywordsOptional')}</span>
                      </label>
                      <p className="tool-hint" style={{ marginBottom: 8 }}>{t('step1.keywordsHint')}</p>
                      <textarea
                        id="aiv-queries"
                        value={formData.queries}
                        onChange={(e) => setFormData({ ...formData, queries: e.target.value })}
                        placeholder={t('step1.keywordsPlaceholder')}
                        className="tool-input"
                      />
                    </div>
                  </>
                )}

                {/* Advanced Settings */}
                <div className="tool-advanced">
                  <button type="button" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)} className="tool-advanced-toggle">
                    <div className="tool-advanced-toggle-info">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="tool-advanced-toggle-text">
                        <strong>{t('advanced.title')}</strong>
                        <span>{t('advanced.subtitle')}</span>
                      </div>
                    </div>
                    <svg className={`chevron ${showAdvancedSettings ? 'open' : ''}`} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {showAdvancedSettings && (
                    <div className="tool-advanced-panel">
                      <div className="tool-advanced-info">{t('advanced.info')}</div>

                      <label className="tool-label" style={{ marginBottom: 10 }}>{t('advanced.clickExamples')}</label>

                      <div className="tool-preset-group">
                        <span className="tool-preset-label">{t('advanced.premiumLabel')}</span>
                        <div className="tool-preset-chips">
                          <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['premium', 'hoogwaardig', 'exclusief'] : ['premium', 'high-quality', 'exclusive'])} className="tool-chip">
                            + {locale === 'nl' ? 'premium, hoogwaardig, exclusief' : 'premium, high-quality, exclusive'}
                          </button>
                          <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['gespecialiseerd', 'ervaren', 'deskundig'] : ['specialized', 'experienced', 'expert'])} className="tool-chip">
                            + {locale === 'nl' ? 'gespecialiseerd, ervaren, deskundig' : 'specialized, experienced, expert'}
                          </button>
                          <button type="button" onClick={() => addExcludeTerms(locale === 'nl' ? ['goedkoop', 'budget', 'korting'] : ['cheap', 'budget', 'discount'])} className="tool-chip exclude">
                            − {locale === 'nl' ? 'goedkoop, budget, korting' : 'cheap, budget, discount'}
                          </button>
                        </div>
                      </div>

                      <div className="tool-preset-group">
                        <span className="tool-preset-label">{t('advanced.localLabel')}</span>
                        <div className="tool-preset-chips">
                          <button type="button" onClick={() => addLocationTerms(['Amsterdam', 'Rotterdam', 'Utrecht'])} className="tool-chip">
                            + Amsterdam, Rotterdam, Utrecht
                          </button>
                          <button type="button" onClick={() => addLocationTerms(locale === 'nl' ? ['landelijk actief', 'in Nederland'] : ['nationwide', 'United Kingdom'])} className="tool-chip">
                            + {locale === 'nl' ? 'landelijk, in Nederland' : 'nationwide, UK'}
                          </button>
                          <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['lokaal', 'in de buurt', 'regio'] : ['local', 'nearby', 'region'])} className="tool-chip">
                            + {locale === 'nl' ? 'lokaal, in de buurt, regio' : 'local, nearby, region'}
                          </button>
                        </div>
                      </div>

                      <div className="tool-preset-group">
                        <span className="tool-preset-label">{t('advanced.qualityLabel')}</span>
                        <div className="tool-preset-chips">
                          <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['24/7 bereikbaar', 'spoedservice', 'direct beschikbaar'] : ['24/7 available', 'emergency service', 'immediately available'])} className="tool-chip">
                            + {locale === 'nl' ? '24/7, spoedservice, direct' : '24/7, emergency, immediate'}
                          </button>
                          <button type="button" onClick={() => addIncludeTerms(locale === 'nl' ? ['transparant', 'vast tarief', 'duidelijke offerte'] : ['transparent', 'fixed rate', 'clear quote'])} className="tool-chip">
                            + {locale === 'nl' ? 'transparant, vast tarief' : 'transparent, fixed rate'}
                          </button>
                        </div>
                      </div>

                      <button type="button" onClick={() => { setExcludeTermsInput(''); setIncludeTermsInput(''); setLocationTermsInput(''); }} className="tool-reset-btn">
                        {t('advanced.resetAll')}
                      </button>

                      <div className="tool-advanced-fields">
                        <div className="tool-field-group">
                          <label className="tool-label">{t('advanced.excludeLabel')}</label>
                          <input type="text" value={excludeTermsInput} onChange={(e) => setExcludeTermsInput(e.target.value)} placeholder={locale === 'nl' ? 'Bijv: goedkoop, budget, korting' : 'e.g. cheap, budget, discount'} className="tool-input" />
                          <p className="tool-hint">{t('advanced.excludeHint')}</p>
                        </div>
                        <div className="tool-field-group">
                          <label className="tool-label">{t('advanced.includeLabel')}</label>
                          <input type="text" value={includeTermsInput} onChange={(e) => setIncludeTermsInput(e.target.value)} placeholder={locale === 'nl' ? 'Bijv: gespecialiseerd, ervaren, premium' : 'e.g. specialized, experienced, premium'} className="tool-input" />
                          <p className="tool-hint">{t('advanced.includeHint')}</p>
                        </div>
                        <div className="tool-field-group">
                          <label className="tool-label">{t('advanced.locationLabel')}</label>
                          <input type="text" value={locationTermsInput} onChange={(e) => {
                            setLocationTermsInput(e.target.value);
                            if (!formData.serviceArea || formData.serviceArea === locationTermsInput) {
                              setFormData(prev => ({ ...prev, serviceArea: e.target.value }));
                            }
                          }} placeholder={locale === 'nl' ? 'Bijv: Amsterdam, landelijk, regio Utrecht' : 'e.g. London, nationwide, Greater Manchester'} className="tool-input" />
                          <p className="tool-hint">{t('advanced.locationHint')}</p>
                        </div>
                      </div>

                      {(excludeTermsInput || includeTermsInput || locationTermsInput) && (
                        <div className="tool-active-settings">
                          <span className="label">{t('advanced.activeSettings')}</span>
                          {excludeTermsInput && <div className="row"><span>{t('advanced.avoid')}</span><span>{excludeTermsInput}</span></div>}
                          {includeTermsInput && <div className="row"><span>{locale === 'nl' ? '✅ Gebruik:' : '✅ Use:'}</span><span>{includeTermsInput}</span></div>}
                          {locationTermsInput && <div className="row"><span>{t('advanced.location')}</span><span>{locationTermsInput}</span></div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile mascotte */}
                <div className="tool-mascot-mobile">
                  <div style={{ textAlign: 'center' }}>
                    <Image src="/teun-ai-mascotte.png" alt="Teun" width={130} height={163} />
                    <p className="tool-hint" style={{ marginTop: 6 }}>{t('step1.mascotText')}</p>
                  </div>
                </div>

                <div className="tool-actions end">
                  <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="tool-btn-success">
                    {t('step1.next')}
                  </button>
                </div>
              </div>

              {/* Desktop mascotte */}
              {/* Desktop mascotte */}
              <div className="tool-mascot-col">
                <Image src="/teun-ai-mascotte.png" alt={locale === 'nl' ? 'Teun helpt je zoekwoorden kiezen' : 'Teun helps you choose keywords'} width={220} height={275} />
                <p className="mascot-text">{t('step1.mascotText')}</p>
              </div>
            </div>
          </section>
        )}

        {/* ====================================== */}
        {/* STEP 2 — Bedrijfsinfo                  */}
        {/* ====================================== */}
        {step === 2 && (
          <section className="tool-section">
            <div className="tool-scan-grid">
              <div>
                <div className="tool-section-header">                  <h2 className="tool-section-title">{t('step2.heading')}</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 22 }}>
                  {/* Bedrijfsnaam */}
                  <div>
                    <label htmlFor="aiv-company" className="tool-label">
                      {t('step2.companyLabel')} <span className="req">*</span>
                      <span className="tool-tooltip-wrap">
                        <svg className="tool-tooltip-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                          onClick={(e) => { e.preventDefault(); setActiveTooltip(activeTooltip === 'bedrijf' ? null : 'bedrijf'); }}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        {activeTooltip === 'bedrijf' && (
                          <span className="tool-tooltip">{t('step2.companyTooltip')}</span>
                        )}
                      </span>
                    </label>
                    <input
                      id="aiv-company"
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder={t('step2.companyPlaceholder')}
                      className="tool-input"
                      minLength={3}
                      required
                    />
                    {formData.companyName.trim().length > 0 && formData.companyName.trim().length < 3 && (
                      <p style={{ color: '#C0392B', fontSize: 13, marginTop: 6 }}>
                        {t('step2.companyMinLength')}
                      </p>
                    )}
                  </div>

                  {/* Branche */}
                  <div>
                    <label htmlFor="aiv-category" className="tool-label">
                      {t('step2.industryLabel')} <span className="req">*</span>
                      <span className="tool-tooltip-wrap">
                        <svg className="tool-tooltip-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                          onClick={(e) => { e.preventDefault(); setActiveTooltip(activeTooltip === 'branche' ? null : 'branche'); }}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        {activeTooltip === 'branche' && (
                          <span className="tool-tooltip">{t('step2.companyTooltip')}</span>
                        )}
                      </span>
                    </label>
                    <input
                      id="aiv-category"
                      type="text"
                      value={formData.companyCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, companyCategory: val });
                        if (locale === 'nl') setBrancheSuggestion(detectBranchLanguage(val));
                      }}
                      placeholder={t('step2.industryPlaceholder')}
                      className="tool-input"
                      required
                    />

                    {brancheSuggestion && (
                      <div className={`tool-branche-suggest ${brancheSuggestion.type === 'generic' ? 'warn' : 'tip'}`}>
                        {brancheSuggestion.type === 'generic' ? (
                          <p>⚠️ {t.raw('step2.brancheWarningGeneric')}</p>
                        ) : (
                          <>
                            <p>💡 <strong>{brancheSuggestion.original}</strong> {t('step2.brancheWarningSpecific')}</p>
                            <div className="picks">
                              {brancheSuggestion.suggestions.map((suggestion, idx) => (
                                <button key={idx} type="button" onClick={() => {
                                  setFormData({ ...formData, companyCategory: suggestion });
                                  setBrancheSuggestion(null);
                                }}>
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Website */}
                  <div>
                    <label htmlFor="aiv-website" className="tool-label">
                      Website
                      <span className="tool-tooltip-wrap">
                        <svg className="tool-tooltip-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                          onClick={(e) => { e.preventDefault(); setActiveTooltip(activeTooltip === 'website' ? null : 'website'); }}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        {activeTooltip === 'website' && (
                          <span className="tool-tooltip">{t('step2.websiteTooltip')}</span>
                        )}
                      </span>
                    </label>
                    <input
                      id="aiv-website"
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value.toLowerCase() })}
                      placeholder={locale === 'nl' ? 'jouwwebsite.nl' : 'yourwebsite.com'}
                      className="tool-input"
                    />
                    {!formData.website && (
                      <p className="tool-hint" style={{ color: 'var(--spark)', marginTop: 6 }}>
                        ⚡ {t('step2.websiteTip')}
                      </p>
                    )}
                  </div>

                  {/* Servicegebied */}
                  <div>
                    <label htmlFor="aiv-service" className="tool-label">
                      {t('step2.serviceArea')}
                      <span className="opt">{t('step2.serviceAreaOptional')}</span>
                    </label>
                    <input
                      id="aiv-service"
                      type="text"
                      value={formData.serviceArea}
                      onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                      placeholder={t('step2.serviceAreaPlaceholder')}
                      className="tool-input"
                    />
                    <p className="tool-hint">{t('step2.serviceAreaHint')}</p>
                  </div>
                </div>

                {/* Mobile mascotte */}
                <div className="tool-mascot-mobile">
                  <div style={{ textAlign: 'center' }}>
                    <Image src="/mascotte-teun-ai.png" alt="Teun" width={130} height={163} />
                    <p className="tool-hint" style={{ marginTop: 6 }}>{t('step2.mascotText')}</p>
                  </div>
                </div>

                <div className="tool-actions between">
                  <button onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="tool-btn-secondary">
                    {t('step2.back')}
                  </button>
                  <button onClick={() => {
                    if (formData.companyName.trim().length < 3) {
                      setError(t('step2.companyMinLength'));
                      return;
                    }
                    if (!formData.companyCategory) {
                      setError(t('step2.requiredError'));
                      return;
                    }
                    setError(null);
                    setStep(3);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} className="tool-btn-success">
                    {t('step2.next')}
                  </button>
                </div>
              </div>

              <div className="tool-mascot-col">
                <Image src="/mascotte-teun-ai.png" alt={locale === 'nl' ? 'Teun wacht op je bedrijfsinfo' : 'Teun awaits your company info'} width={240} height={300} />
                <p className="mascot-text">{t('step2.mascotText')}</p>
              </div>
            </div>
          </section>
        )}

        {/* ====================================== */}
        {/* STEP 3 — Analyse — fromHomepage variant */}
        {/* ====================================== */}
        {step === 3 && fromHomepage && (
          <section className="tool-section">
            <div className="tool-scan-progress">
              <div className="tool-scan-spinner"></div>
              <h3>{t('step3.analyzing')}</h3>
              <p className="current">{currentStep || t('step3.preparing')}</p>

              <div className="tool-progress-bar">
                <div className="tool-progress-fill" style={{ width: `${Math.max(Math.floor(progress), 2)}%` }}>
                  {progress > 5 && <span className="pct">{Math.floor(progress)}%</span>}
                </div>
              </div>
              <p className="tool-progress-hint">{t('step3.progressHint')}</p>
            </div>
          </section>
        )}

        {/* ====================================== */}
        {/* STEP 3 — Analyse — normal variant      */}
        {/* ====================================== */}
        {step === 3 && !fromHomepage && (
          <section className="tool-section">
            <div className="tool-scan-grid">
              <div>
                <div className="tool-section-header">                  <h2 className="tool-section-title">{t('step3.heading')}</h2>
                </div>

                {analyzing ? (
                  <div>
                    <div className="tool-mascot-mobile">
                      <Image src="/teun-ai-mascotte.png" alt={locale === 'nl' ? 'Teun analyseert' : 'Teun is analyzing'} width={130} height={163} />
                    </div>

                    <div className="tool-scan-progress">
                      {formData.companyName && (
                        <p className="tool-scan-for">
                          {t('step3.scanningFor')} <strong>{formData.companyName}</strong>
                        </p>
                      )}
                      <div className="tool-scan-spinner"></div>
                      <h3>{t('step3.analyzing')}</h3>
                      <p className="current">{currentStep}</p>

                      <div className="tool-progress-bar">
                        <div className="tool-progress-fill" style={{ width: `${Math.floor(progress)}%` }}>
                          <span className="pct">{Math.floor(progress)}%</span>
                        </div>
                      </div>
                      <p className="tool-progress-hint">{t('step3.progressHint')}</p>
                    </div>

                    <div className="tool-progress-steps">
                      <div className={`tool-progress-step ${progress >= 20 ? 'done' : progress > 10 ? 'active' : ''}`}>
                        <span className="dot"></span>
                        <span>{customPrompts ? t('step3.progressStep1Custom') : t('step3.progressStep1')}</span>
                      </div>
                      <div className={`tool-progress-step ${progress >= 90 ? 'done' : progress > 20 ? 'active' : ''}`}>
                        <span className="dot"></span>
                        <span>{t('step3.progressStep2')}</span>
                      </div>
                      <div className={`tool-progress-step ${progress === 100 ? 'done' : progress > 90 ? 'active' : ''}`}>
                        <span className="dot"></span>
                        <span>{t('step3.progressStep3')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {fallbackError && (
                      <div className="tool-fallback-error">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div className="content">
                          <div className="title">{t('step3.fallbackErrorTitle')}</div>
                          <p className="desc">{t('step3.fallbackErrorDesc')}</p>
                          <Link href="/tools/ai-prompt-explorer" className="cta">
                            {t('step3.fallbackErrorCta')}
                            <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </div>
                    )}

                    <div className="tool-summary">
                      <div className="tool-summary-row">
                        <span className="lbl">{t('step3.summaryCompany')}</span>
                        <span className="val">{formData.companyName}</span>
                      </div>
                      <div className="tool-summary-row">
                        <span className="lbl">{t('step3.summaryIndustry')}</span>
                        <span className="val">{formData.companyCategory}</span>
                      </div>
                      {formData.queries && !customPrompts && (
                        <div className="tool-summary-row">
                          <span className="lbl">{t('step3.summaryKeyword')}</span>
                          <span className="val">{formData.queries.split(/[,\n]/)[0]?.trim() || t('step3.summaryNoKeywords')}</span>
                        </div>
                      )}
                      <div className="tool-summary-row">
                        <span className="lbl">{t('step3.summaryPrompts')}</span>
                        <span className="val">{customPrompts ? `${customPrompts.length} ${locale === 'nl' ? 'zoekvragen' : 'queries'}` : `${user ? '10' : '5'} AI-prompts`}</span>
                      </div>
                      {referralSource && (
                        <div className="tool-summary-row">
                          <span className="lbl">{locale === 'nl' ? 'Bron:' : 'Source:'}</span>
                          <span className="val" style={{ color: 'var(--spark)', textTransform: 'capitalize' }}>{referralSource}</span>
                        </div>
                      )}
                    </div>

                    {Array.isArray(customPrompts) && (
                      <div className="tool-custom-prompts">
                        <div className="tool-custom-prompts-banner">
                          <div className="title">
                            {t('step3.funnelBannerTitle', { count: customPrompts.length })}
                          </div>
                          <p className="desc">{t('step3.funnelBannerDesc')}</p>
                        </div>

                        <div className="tool-custom-prompts-list">
                          {customPrompts.map((prompt, idx) => (
                            <div key={idx} className={`item ${editingIndex === idx ? 'editing' : ''}`}>
                              <span className="num">{idx + 1}.</span>
                              {editingIndex === idx ? (
                                <>
                                  <input
                                    type="text"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') { e.preventDefault(); saveEditPrompt(); }
                                      if (e.key === 'Escape') { e.preventDefault(); cancelEditPrompt(); }
                                    }}
                                    autoFocus
                                    className="edit-input"
                                  />
                                  <button
                                    type="button"
                                    onClick={saveEditPrompt}
                                    className="icon-btn save"
                                    aria-label={t('step3.savePrompt')}
                                    title={t('step3.savePrompt')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditPrompt}
                                    className="icon-btn cancel"
                                    aria-label={t('step3.cancelEdit')}
                                    title={t('step3.cancelEdit')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <line x1="18" y1="6" x2="6" y2="18"/>
                                      <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text">{prompt}</span>
                                  <button
                                    type="button"
                                    onClick={() => startEditPrompt(idx)}
                                    className="icon-btn edit"
                                    aria-label={t('step3.editPrompt')}
                                    title={t('step3.editPrompt')}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <path d="M12 20h9"/>
                                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePromptAt(idx)}
                                    className="icon-btn delete"
                                    aria-label={t('step3.deletePrompt')}
                                    title={t('step3.deletePrompt')}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <line x1="18" y1="6" x2="6" y2="18"/>
                                      <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {customPrompts.length < 10 ? (
                          <div className="tool-custom-prompts-add">
                            <input
                              type="text"
                              value={newPromptText}
                              onChange={(e) => setNewPromptText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewPrompt(); } }}
                              placeholder={t('step3.addPromptPlaceholder')}
                              className="add-input"
                              maxLength={200}
                            />
                            <button
                              type="button"
                              onClick={addNewPrompt}
                              disabled={!newPromptText.trim()}
                              className="add-btn"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                              <span>{t('step3.addPrompt')}</span>
                            </button>
                          </div>
                        ) : (
                          <p className="tool-custom-prompts-max">{t('step3.maxPromptsReached')}</p>
                        )}
                      </div>
                    )}

                    {(excludeTermsInput || includeTermsInput || locationTermsInput) && (
                      <div className="tool-active-settings" style={{ marginBottom: 18 }}>
                        <span className="label">⚙️ {t('step3.advancedTitle')}</span>
                        {excludeTermsInput && <div className="row"><span>{t('advanced.avoid')}</span><span>{excludeTermsInput}</span></div>}
                        {includeTermsInput && <div className="row"><span>{locale === 'nl' ? '✅ Gebruik:' : '✅ Use:'}</span><span>{includeTermsInput}</span></div>}
                        {locationTermsInput && <div className="row"><span>{t('advanced.location')}</span><span>{locationTermsInput}</span></div>}
                      </div>
                    )}

                    {!fallbackError && (
                      <div className="tool-actions">
                        {referralSource !== 'prompt-explorer' && (
                          <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="tool-btn-secondary">
                            {t('step3.back')}
                          </button>
                        )}
                        <button onClick={() => { setFromHomepage(false); handleAnalyze(); }} className="tool-btn-success" style={{ flex: 1 }}>
                          {t('step3.startAnalysis')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="tool-mascot-col">
                <Image src="/teun-ai-mascotte.png" alt={locale === 'nl' ? 'Teun helpt je analyseren' : 'Teun helps you analyze'} width={220} height={275} />
                <p className="mascot-text">{t('step3.mascotText')}</p>
              </div>
            </div>
          </section>
        )}

        {/* ====================================== */}
        {/* STEP 4 — Resultaten                    */}
        {/* ====================================== */}
        {step === 4 && results && (
          <section className="tool-section">
            <div className="tool-mascot-mobile">
              <Image src="/Teun-ai-blij-met-resultaat.png" alt={locale === 'nl' ? 'Teun is blij!' : 'Teun is happy!'} width={120} height={150} />
            </div>

            <div className="tool-scan-grid">
              <div>
                <div className="tool-section-header">                  <h2 className="tool-section-title">{t('step4.heading')}</h2>
                </div>

                <div className="tool-result-success">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <strong>{t('step4.analysisComplete')}</strong>
                    <p>{t.rich('step4.reportReady', { company: formData.companyName, strong: (chunks) => <strong>{chunks}</strong> })}</p>
                  </div>
                </div>

                {nameMismatch && (
                  <div className="tool-mismatch">
                    <p className="tool-mismatch-title">🔍 {t('step4.nameMismatchTitle', { name: nameMismatch.name })}</p>
                    <p className="tool-mismatch-desc">
                      {t('step4.nameMismatchDesc', { company: formData.companyName, match: nameMismatch.name, count: nameMismatch.count })}
                      {nameMismatch.reason === 'typo' && ` ${t('step4.nameMismatchTypo')}`}
                      {nameMismatch.reason === 'substring' && ` ${t('step4.nameMismatchSubstring')}`}
                    </p>
                    <button onClick={() => {
                      setFormData(prev => ({ ...prev, companyName: nameMismatch.name }));
                      setNameMismatch(null);
                      setResults(null);
                      setStep(3);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="tool-mismatch-btn">
                      {t('step4.rescanAs', { name: nameMismatch.name })}
                    </button>
                  </div>
                )}

                {/* Platform tabs */}
                <div className="tool-platform-tabs">
                  <button onClick={() => setResultPlatform('chatgpt')} className={`tool-platform-tab ${resultPlatform === 'chatgpt' ? 'active' : ''}`}>
                    <span className="ai-logo">
                      <svg viewBox="0 0 24 24" fill="#10A37F"><path d="M22.2 9.4c.4-1.2.2-2.5-.5-3.6-.7-1-1.8-1.7-3-1.9-.6-.1-1.2 0-1.8.2-.5-1.3-1.5-2.3-2.8-2.8-1.3-.5-2.8-.4-4 .3C9.4.6 8.2.2 7 .5c-1.2.3-2.3 1.1-2.9 2.2-.6 1.1-.7 2.4-.3 3.6-1.3.5-2.3 1.5-2.8 2.8s-.4 2.8.3 4c-1 .8-1.6 2-1.7 3.3-.1 1.3.4 2.6 1.4 3.5 1 .9 2.3 1.3 3.6 1.2.5 1.3 1.5 2.3 2.8 2.8 1.3.5 2.8.4 4-.3.8 1 2 1.6 3.3 1.7 1.3.1 2.6-.4 3.5-1.4.9-1 1.3-2.3 1.2-3.6 1.3-.5 2.3-1.5 2.8-2.8.5-1.3.4-2.8-.3-4 1-.8 1.6-2 1.7-3.3.1-1.3-.4-2.6-1.4-3.5z" /></svg>
                    </span>
                    ChatGPT
                    <span className="pill">
                      {results.chatgpt_company_mentions || 0}/{(results.chatgpt_results || []).length}
                    </span>
                  </button>
                  <button onClick={() => setResultPlatform('perplexity')} className={`tool-platform-tab ${resultPlatform === 'perplexity' ? 'active' : ''}`}>
                    <span className="ai-logo">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#20B8CD" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    </span>
                    Perplexity
                    <span className="pill">
                      {results.total_company_mentions}/{results.analysis_results.length}
                    </span>
                  </button>
                </div>
                <p className="tool-platform-desc">
                  {resultPlatform === 'chatgpt' ? t('step4.chatgptDesc') : t('step4.perplexityDesc')}
                </p>

                {/* Account CTA */}
                {!user && (() => {
                  const totalMentions = (results.total_company_mentions || 0) + (results.chatgpt_company_mentions || 0);
                  const perplexityCount = results.analysis_results?.length || 10;
                  const chatgptCount = results.chatgpt_results?.length || 10;
                  const totalPrompts = perplexityCount + chatgptCount;

                  const competitorSet = new Set();
                  [...(results.analysis_results || []), ...(results.chatgpt_results || [])].forEach(r => {
                    (r.competitors_mentioned || []).forEach(c => {
                      const clean = cleanDisplayName(c);
                      if (clean && clean.length >= 3) competitorSet.add(clean);
                    });
                  });
                  const competitorCount = competitorSet.size;

                  const isInvisible = totalMentions === 0;
                  const isWeak = totalMentions > 0 && totalMentions <= 3;
                  const isPerfect = totalMentions >= totalPrompts;
                  const missing = Math.max(totalPrompts - totalMentions, 0);

                  const title = isInvisible
                    ? (locale === 'nl' ? 'AI beveelt jou niet aan, je concurrenten wel' : "AI doesn't recommend you, your competitors it does")
                    : isWeak
                      ? (locale === 'nl' ? `Genoemd in ${totalMentions} van ${totalPrompts} prompts, dat kan beter` : `Mentioned in ${totalMentions} of ${totalPrompts} prompts, room to grow`)
                      : isPerfect
                        ? (locale === 'nl' ? 'Sterk! Je wordt overal genoemd' : 'Strong! You are mentioned everywhere')
                        : (locale === 'nl' ? `Goed bezig, maar je mist nog ${missing} prompts` : `Looking good, but you're missing ${missing} prompts`);

                  const description = isInvisible
                    ? (locale === 'nl' ? `${competitorCount} concurrenten worden wél genoemd. Maak een gratis account en zie waarom jij niet zichtbaar bent.` : `${competitorCount} competitors are being mentioned. Create a free account to find out why you're not visible.`)
                    : isWeak
                      ? (locale === 'nl' ? `${competitorCount} concurrenten scoren beter. Maak een gratis account en track je positie over tijd.` : `${competitorCount} competitors are scoring higher. Create a free account to track your position over time.`)
                      : isPerfect
                        ? (locale === 'nl' ? 'Maak een gratis account en monitor je positie over tijd voordat een concurrent je voorbij gaat.' : 'Create a free account and monitor your position over time before a competitor overtakes you.')
                        : (locale === 'nl' ? 'Maak een gratis account en gebruik al onze 6 AI-tools om je voorsprong te behouden.' : 'Create a free account and use all 6 of our AI tools to maintain your lead.');

                  const bonus = locale === 'nl'
                    ? 'Met een gratis account scan je ook Google AI Modus en AI Overviews.'
                    : 'With a free account you can also scan Google AI Mode and AI Overviews.';

                  return (
                    <div className="tool-account-cta">
                      <h3>{title}</h3>
                      <p>{description}</p>
                      <p className="bonus">+ {bonus}</p>
                      <Link href={`/signup${results?.meta?.sessionToken ? `?st=${results.meta.sessionToken}` : ''}`} className="tool-account-cta-btn">
                        {locale === 'nl' ? 'Gratis account aanmaken' : 'Create free account'}
                        <span aria-hidden="true">→</span>
                      </Link>
                      <p className="small">
                        {locale === 'nl' ? 'Geheel gratis · Geen creditcard nodig' : 'Completely free · No credit card needed'}
                      </p>
                    </div>
                  );
                })()}

                {(() => {
                  const totalMentions = (results.total_company_mentions || 0) + (results.chatgpt_company_mentions || 0);
                  if (totalMentions !== 0) return null;
                  const geoAuditHref = locale === 'en' ? '/en/tools/geo-audit' : '/tools/geo-audit';
                  return (
                    <div style={{
                      background: 'var(--bg-2, #FAF6F0)',
                      border: '1px solid var(--line, #E8E0D2)',
                      borderRadius: 12,
                      padding: '18px 20px',
                      marginTop: 16,
                      marginBottom: 16
                    }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>
                        💡 {t('step4.whatNowTitle')}
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        <Link href={geoAuditHref} style={{
                          flex: '1 1 220px',
                          background: '#fff',
                          border: '1px solid var(--line, #E8E0D2)',
                          borderRadius: 10,
                          padding: '14px 16px',
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'block'
                        }}>
                          <strong style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                            {t('step4.whatNowAction1Title')} →
                          </strong>
                          <span style={{ fontSize: 13, color: 'var(--ink-2, #555)', lineHeight: 1.45 }}>
                            {t('step4.whatNowAction1Desc')}
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setResults(null);
                            setStep(1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{
                            flex: '1 1 220px',
                            background: '#fff',
                            border: '1px solid var(--line, #E8E0D2)',
                            borderRadius: 10,
                            padding: '14px 16px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                          }}
                        >
                          <strong style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
                            {t('step4.whatNowAction2Title')} →
                          </strong>
                          <span style={{ fontSize: 13, color: 'var(--ink-2, #555)', lineHeight: 1.45 }}>
                            {t('step4.whatNowAction2Desc')}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Stats + Results list */}
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
                      <div className="tool-stats">
                        <div className="tool-stat">
                          <div className="tool-stat-num success">{activeMentions}</div>
                          <div className="tool-stat-label">{t('step4.mentionsMobile')}</div>
                        </div>
                        <div className="tool-stat">
                          <div className="tool-stat-num navy">{activeResults.length}</div>
                          <div className="tool-stat-label">Prompts</div>
                        </div>
                        <div className="tool-stat">
                          <div className="tool-stat-num">{activeCompetitors.length}</div>
                          <div className="tool-stat-label">{t('step4.competitorsMobile')}</div>
                        </div>
                      </div>

                      <div className="tool-results-list">
                        {activeResults.map((result, idx) => (
                          <div key={idx} className="tool-result-item">
                            <div className="tool-result-item-row">
                              <div className={`tool-result-num ${result.company_mentioned ? 'mentioned' : ''}`}>
                                {idx + 1}
                              </div>
                              <div className="tool-result-content">
                                <p className="tool-result-prompt">{result.ai_prompt}</p>
                                <p className="tool-result-snippet">{
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
                                  <div className="tool-result-competitors">
                                    <span className="label">{t('step4.competitorsLabel')}</span>
                                    {result.competitors_mentioned.map((comp, i) => {
                                      const clean = cleanDisplayName(comp);
                                      if (!clean || clean.length < 3) return null;
                                      return <span key={i} className="tool-comp-tag">{clean}</span>;
                                    })}
                                  </div>
                                )}
                              </div>
                              {result.company_mentioned && (
                                <div className="tool-result-trophy">
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 15a4 4 0 100-8 4 4 0 000 8zm0 0v6m-6-3h12" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* Action buttons */}
                <div className="tool-actions" style={{ flexDirection: 'column', alignItems: 'stretch', marginBottom: 22 }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button onClick={() => {
                      setStep(1);
                      setFormData({ companyName: '', companyCategory: '', queries: '', website: '', serviceArea: '' });
                      setExcludeTermsInput(''); setIncludeTermsInput(''); setLocationTermsInput('');
                      setResults(null); setReferralSource(null); setFromHomepage(false); setNameMismatch(null); setBrancheSuggestion(null);
                      try { sessionStorage.removeItem('teun_scan_results'); sessionStorage.removeItem('teun_scan_formData'); } catch (_) {}
                    }} className="tool-btn-secondary" style={{ flex: 1 }}>
                      {t('step4.newAnalysis')}
                    </button>
                    <Link href="/" className="tool-btn-primary" style={{ flex: 1, textDecoration: 'none' }}>
                      {t('step4.backHome')}
                    </Link>
                  </div>
                </div>

                {referralSource === 'onlinelabs' && (
                  <div style={{ marginBottom: 18 }}>
                    <a href="https://onlinelabs.nl/skills/geo-optimalisatie" className="tool-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                      {t('step4.backOnlineLabs')}
                    </a>
                  </div>
                )}

              </div>

              {/* Right column: mascotte + ranking */}
              <div className="tool-mascot-col" style={{ paddingTop: 4 }}>
                <Image src="/Teun-ai-blij-met-resultaat.png" alt={locale === 'nl' ? 'Teun is blij met je resultaat!' : 'Teun is happy with your results!'} width={200} height={250} />
                <p className="mascot-text">
                  {(results.total_company_mentions + (results.chatgpt_company_mentions || 0)) > 0
                    ? t('step4.mascotHappy', { count: results.total_company_mentions + (results.chatgpt_company_mentions || 0) })
                    : t('step4.mascotImprove')}
                </p>

                {/* Competitor Ranking */}
                {(() => {
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

                  const ranking = Object.entries(mentionCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6);

                  if (ranking.length <= 1) return null;

                  return (
                    <div className="tool-ranking">
                      <p className="tool-ranking-title">🏆 {t('step4.rankingTitle')}</p>
                      {ranking.map(([name, count], idx) => {
                        const isUser = name === formData.companyName;
                        const medals = ['🥇', '🥈', '🥉'];
                        return (
                          <div key={idx} className={`tool-rank-row ${isUser ? 'user' : ''}`}>
                            <span className="tool-rank-pos">
                              {idx < 3 ? medals[idx] : `${idx + 1}.`}
                            </span>
                            <span className="tool-rank-name">{name}</span>
                            <span className="tool-rank-count">{count}x</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="tool-error">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div>
              <strong>{t('error.prefix')}</strong> {error}
              {user && (error.includes('dagelijks') || error.includes('morgen') || error.includes('daily') || error.includes('tomorrow') || error.includes('Chrome extensie') || error.includes('Chrome extension')) && (
                <div style={{ marginTop: 6 }}>
                  <Link href={locale === 'en' ? '/en/pricing' : '/pricing'} style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', textDecoration: 'underline' }}>
                    {locale === 'en' ? 'Upgrade to Pro for unlimited scans' : 'Upgrade naar Pro voor onbeperkt scannen'} →
                  </Link>
                </div>
              )}
              {!user && (error.includes('gratis') || error.includes('free') || error.includes('account') || error.includes('Log in')) && (
                <div style={{ marginTop: 6 }}>
                  <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', textDecoration: 'underline' }}>
                    {locale === 'en' ? 'Create free account' : 'Gratis account aanmaken'} →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logged in indicator */}
        {!analyzing && user && (
          <p className="tool-footer-info">{t('footer.loggedInAs', { email: user.email })}</p>
        )}
      </div>

      {/* ============================================
          SEO CONTENT + FAQ — alleen op step 1 (geen analyzing/results)
          ============================================ */}
      {!analyzing && !results && (
        <>
          {/* SEO Intro */}
          <section className="tool-seo-intro">
            <h2>
              {locale === 'nl' ? (
                <>Je concurrent staat in <em>het AI-antwoord</em>. En jij?</>
              ) : (
                <>Your competitor is in <em>the AI answer</em>. And you?</>
              )}
            </h2>
            <p>
              {locale === 'nl'
                ? 'Steeds meer consumenten slaan Google over en vragen ChatGPT, Perplexity of Google AI Mode rechtstreeks om aanbevelingen. "Wat is het beste marketingbureau in Amsterdam?" of "Welke advocaat is gespecialiseerd in arbeidsrecht?". Dit zijn de nieuwe zoekopdrachten die bepalen of klanten jou vinden of je concurrent.'
                : 'More and more consumers skip Google and ask ChatGPT, Perplexity or Google AI Mode directly for recommendations. "What is the best marketing agency in Amsterdam?" or "Which lawyer specializes in employment law?". These are the new search queries that determine whether customers find you or your competitor.'}
            </p>
            <p>
              {locale === 'nl'
                ? 'De AI Zichtbaarheid Scan van Teun.ai genereert automatisch 10 commerciële prompts op basis van jouw branche en zoekwoorden, en legt deze live voor aan ChatGPT Search en Perplexity. Het resultaat: een concreet overzicht van waar jij wel en niet wordt aanbevolen, inclusief welke concurrenten wél worden genoemd.'
                : 'The AI Visibility Scan by Teun.ai automatically generates 10 commercial prompts based on your industry and keywords, and submits them live to ChatGPT Search and Perplexity. The result: a concrete overview of where you are and are not recommended, including which competitors are being mentioned.'}
            </p>
          </section>

          {/* SEO How it works */}
          <section className="tool-seo-how">
            <div className="tool-seo-how-wrap">
              <h2>{locale === 'nl' ? <>Hoe werkt de <em>scan</em>?</> : <>How does the <em>scan</em> work?</>}</h2>
              <p className="tool-seo-how-sub">
                {locale === 'nl'
                  ? 'In 4 stappen naar je AI-zichtbaarheidsrapport.'
                  : 'From website to AI visibility report in 4 steps.'}
              </p>
              <div className="tool-seo-how-grid">
                {(locale === 'nl' ? [
                  { title: 'Website analyseren', desc: 'Voer je URL in en onze AI haalt automatisch je zoekwoorden, branche en bedrijfsnaam op. Of vul ze handmatig in.' },
                  { title: 'Prompts genereren', desc: '10 commerciële prompts worden gegenereerd op basis van jouw branche, zoekwoorden en servicegebied.' },
                  { title: 'Live AI scannen', desc: 'Elke prompt wordt live bevraagd bij ChatGPT Search en Perplexity voor actuele, echte resultaten.' },
                  { title: 'Rapport ontvangen', desc: 'Zie per prompt of je wordt genoemd, welke concurrenten scoren en waar je kansen liggen.' }
                ] : [
                  { title: 'Analyse website', desc: 'Enter your URL and our AI automatically extracts your keywords, industry and business name. Or fill them in manually.' },
                  { title: 'Generate prompts', desc: '10 commercial prompts are generated based on your industry, keywords and service area.' },
                  { title: 'Live AI scanning', desc: 'Each prompt is submitted live to ChatGPT Search and Perplexity for real-time, actual results.' },
                  { title: 'Receive report', desc: 'See per prompt whether you are mentioned, which competitors score and where your opportunities are.' }
                ]).map((item, i) => (
                  <div key={i} className="tool-seo-how-card">
                    <div className="tool-seo-how-card-head">
                      <div className="num">{i + 1}</div>
                      <h3>{item.title}</h3>
                    </div>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="tool-faq-section">
            <div className="tool-faq-wrap">
              <h2>{locale === 'nl' ? <>Veelgestelde <em>vragen</em></> : <>Frequently asked <em>questions</em></>}</h2>
              <FAQAccordion items={locale === 'nl' ? [
                { q: 'Wat is een AI zichtbaarheidsanalyse?', a: 'Een AI zichtbaarheidsanalyse controleert of jouw bedrijf wordt genoemd en aanbevolen door AI-platforms zoals ChatGPT en Perplexity. De scan genereert commerciële prompts die echte klanten zouden stellen en kijkt of jij in de antwoorden voorkomt.' },
                { q: 'Welke AI-platforms worden gescand?', a: 'De gratis scan controleert ChatGPT Search en Perplexity. Met een Teun.ai account kun je via het dashboard ook Google AI Mode en Google AI Overviews scannen. Samen dekken deze vier platforms het overgrote deel van het AI-zoekverkeer.' },
                { q: 'Is de AI Zichtbaarheid Scan gratis?', a: 'Ja. Zonder account kun je 2 scans uitvoeren. Met een gratis account krijg je 1 scan per dag. Met een Pro-abonnement kun je onbeperkt scannen.' },
                { q: 'Hoe kan ik mijn AI zichtbaarheid verbeteren?', a: 'Na de scan zie je precies welke prompts je mist. Gebruik de GEO Audit om je website technisch te laten analyseren, of bekijk de AI Prompt Explorer om te zien welke prompts klanten gebruiken in jouw branche.' },
                { q: 'Wat is het verschil tussen SEO en GEO?', a: 'SEO is gericht op hoog scoren in Google. GEO (Generative Engine Optimization) is gericht op het worden genoemd door AI-zoekmachines. De AI Zichtbaarheid Scan meet specifiek je GEO-prestaties.' },
              ] : [
                { q: 'What is an AI visibility scan?', a: 'An AI visibility scan checks whether your business is mentioned and recommended by AI platforms such as ChatGPT and Perplexity. The scan generates commercial prompts that real customers would ask and checks if you appear in the answers.' },
                { q: 'Which AI platforms are scanned?', a: 'The free scan checks ChatGPT Search and Perplexity. With a Teun.ai account you can also scan Google AI Mode and Google AI Overviews through the dashboard. Together, these four platforms cover the vast majority of AI search traffic.' },
                { q: 'Is the AI Visibility Scan free?', a: 'Yes. Without an account you can run 2 scans. With a free account you get 1 scan per day. With a Pro subscription you can scan unlimited.' },
                { q: 'How can I improve my AI visibility?', a: 'After the scan you see exactly which prompts you are missing. Use the GEO Audit to have your website technically analysed, or check the AI Prompt Explorer to see which prompts customers use in your industry.' },
                { q: 'What is the difference between SEO and GEO?', a: 'SEO focuses on ranking high in Google. GEO (Generative Engine Optimization) focuses on being mentioned by AI search engines. The AI Visibility Scan specifically measures your GEO performance.' },
              ]} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function AIVisibilityTool() {
  return (
    <Suspense fallback={
      <div className="tool-init">
        <div className="tool-init-spinner">
          <span className="dot"></span><span className="dot"></span><span className="dot"></span>
        </div>
        
      </div>
    }>
      <AIVisibilityToolContent />
    </Suspense>
  );
}
