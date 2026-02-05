// lib/branche-detect.js
// Gedeelde branche taaldetectie (EN → NL) + bedrijfsnaam fuzzy matching
// Gebruikt door: Homepage.jsx + app/tools/ai-visibility/page.js

// ====================================
// BRANCHE EN → NL MAPPING
// ====================================
export const BRANCHE_EN_TO_NL = {
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

// ====================================
// BRANCHE TAALDETECTIE
// ====================================
export function detectBranchLanguage(input) {
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
export function findNameInCompetitors(companyName, analysisResults) {
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
    
    // Skip als het exact hetzelfde is
    if (compLower === nameLower) continue;
    
    // Check 1: Substring match
    if (compLower.includes(nameLower) || nameLower.includes(compLower)) {
      matches.push({ name: comp, count, confidence: 'high', reason: 'substring' });
      continue;
    }
    
    // Check 2: Woord-overlap (minstens 50% gedeelde woorden)
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
