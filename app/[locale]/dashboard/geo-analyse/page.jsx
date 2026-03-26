'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, ArrowRight, Building2, FileSpreadsheet, Globe, 
  CheckCircle2, Loader2, Upload, Trash2, Plus, Search, 
  GripVertical, Link2, FileText, Download, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, Sparkles, Target,
  BarChart3, Zap, BookOpen, Database, MessageSquare,
  Eye, TrendingUp, Award, Pencil, Play, RefreshCw, XCircle, AlertTriangle
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import useClientAccess from '../hooks/useClientAccess'
import ClientBanner from '../components/ClientBanner'

// ============================================
// GEO CHECKLIST DATA (Complete from Excel)
// ============================================
const GEO_CHECKLIST = {
  basisinformatie: {
    label: 'Basisinformatie',
    icon: 'Building2',
    items: [
      { id: 'owner_info', label: 'Duidelijke eigenaar en bedrijfsinformatie', autoCheck: true },
      { id: 'contact_visible', label: 'Contactgegevens zichtbaar en vindbaar', autoCheck: true },
      { id: 'about_page', label: 'Over-ons pagina met team/auteurs', autoCheck: true },
      { id: 'business_registration', label: 'Bedrijfsregistratie of officiële vermeldingen', autoCheck: true },
      { id: 'nap_consistent', label: 'Consistente NAP (naam, adres, telefoon)', autoCheck: true },
    ]
  },
  technisch: {
    label: 'Technische Fundamenten',
    icon: 'Zap',
    items: [
      { id: 'mobile_friendly', label: 'Mobielvriendelijk ontwerp en snelle laadtijd', autoCheck: true },
      { id: 'https', label: 'HTTPS beveiliging actief', autoCheck: true },
      { id: 'no_index_issues', label: 'Geen indexatieproblemen (robots.txt, sitemaps)', autoCheck: true },
      { id: 'core_web_vitals', label: 'Core Web Vitals geoptimaliseerd', autoCheck: true },
      { id: 'accessibility', label: 'Toegankelijkheid (alt-teksten, ARIA-labels)', autoCheck: true },
    ]
  },
  content_relevantie: {
    label: 'Content - Relevantie & Volledigheid',
    icon: 'FileText',
    items: [
      { id: 'clear_answers', label: 'Duidelijke antwoorden op zoekvragen', autoCheck: true },
      { id: 'expert_content', label: 'Inhoud door experts of ervaringsdeskundigen', autoCheck: true },
      { id: 'eeat_principles', label: 'E-E-A-T principes toegepast', autoCheck: true },
      { id: 'content_updated', label: 'Inhoud actueel en regelmatig bijgewerkt', autoCheck: true },
      { id: 'faq_present', label: 'FAQ-secties of Q&A-structuur aanwezig', autoCheck: true },
    ]
  },
  content_structuur: {
    label: 'Content - Structuur & Leesbaarheid',
    icon: 'BookOpen',
    items: [
      { id: 'headings', label: 'Duidelijke koppen (H1, H2, H3)', autoCheck: true },
      { id: 'paragraph_structure', label: 'Logische alinea-opbouw en korte zinnen', autoCheck: true },
      { id: 'visual_support', label: 'Afbeeldingen, tabellen en opsommingen', autoCheck: true },
      { id: 'internal_links', label: 'Interne links naar relevante pagina\'s', autoCheck: true },
      { id: 'external_references', label: 'Externe verwijzingen naar betrouwbare bronnen', autoCheck: true },
    ]
  },
  structured_data: {
    label: 'Structured Data',
    icon: 'Database',
    items: [
      { id: 'jsonld', label: 'JSON-LD markup (Organization, FAQ, Product)', autoCheck: true },
      { id: 'rich_snippets', label: 'Rich snippets getest in Google testtool', autoCheck: true },
      { id: 'image_alt', label: 'Afbeeldingen met alt-teksten', autoCheck: true },
      { id: 'knowledge_panel', label: 'Knowledge panel triggers toegepast', autoCheck: true },
    ]
  },
  metadata: {
    label: 'Metadata & Tags',
    icon: 'FileText',
    items: [
      { id: 'title_meta', label: 'Titels en meta descriptions geoptimaliseerd', autoCheck: true },
      { id: 'og_tags', label: 'Social media OG-tags', autoCheck: true },
      { id: 'canonical_tags', label: 'Canonical-tags correct gebruikt', autoCheck: true },
      { id: 'image_optimized', label: 'Afbeeldingen geoptimaliseerd (WebP, lazy load)', autoCheck: true },
    ]
  },
  ai_geo: {
    label: 'AI & GEO-specifieke Signalen',
    icon: 'Sparkles',
    items: [
      { id: 'qa_format', label: 'Content in Q&A-formaat voor AI-antwoorden', autoCheck: true },
      { id: 'short_answers', label: 'Korte antwoorden bovenaan pagina\'s', autoCheck: true },
      { id: 'longtail_keywords', label: 'Long-tail zoekvragen verwerkt', autoCheck: true },
      { id: 'conversational_style', label: 'Conversatiestijl afgestemd op vragen', autoCheck: true },
      { id: 'ai_structured_data', label: 'Structured data voor generatieve AI', autoCheck: true },
      { id: 'context_links', label: 'Interne links voor context en verbanden', autoCheck: true },
      { id: 'synonyms_entities', label: 'Synoniemen en entiteiten verwerkt', autoCheck: true },
      { id: 'local_info', label: 'Lokaal relevante informatie toegevoegd', autoCheck: true },
    ]
  },
  autoriteit: {
    label: 'Autoriteit & Vertrouwen',
    icon: 'Shield',
    manual: true,
    items: [
      { id: 'directory_listings', label: 'Vermeldingen op directories', manual: true },
      { id: 'backlinks', label: 'Kwalitatieve backlinks', manual: true },
      { id: 'media_presence', label: 'PR- of media-aanwezigheid', manual: true },
      { id: 'reviews', label: 'Reviews op Google/Trustpilot', manual: true },
      { id: 'social_profiles', label: 'Actieve social media profielen', manual: true },
      { id: 'brand_consistency', label: 'Consistente merkboodschap', manual: true },
    ]
  },
}

// All checklist items flattened for animation
const ALL_CHECKLIST_ITEMS = Object.entries(GEO_CHECKLIST)
  .filter(([key, section]) => !section.manual)
  .flatMap(([key, section]) => section.items.map(item => ({
    ...item,
    sectionKey: key,
    section: section.label
  })))

// ============================================
// MAIN COMPONENT
// ============================================
function GEOAnalyseContent() {
  const t = useTranslations('dashboard.geo')
  const locale = useLocale()

  // GEO Checklist label - safe lookup with fallback
  const SCAN_CHECK_LABELS = {
    // Technical
    https: locale === 'nl' ? 'HTTPS beveiliging actief' : 'HTTPS security active',
    viewport: locale === 'nl' ? 'Viewport meta tag aanwezig' : 'Viewport meta tag present',
    lcp_good: locale === 'nl' ? 'LCP laadtijd onder 2.5 seconden' : 'LCP load time under 2.5 seconds',
    fid_good: locale === 'nl' ? 'First Input Delay laag' : 'First Input Delay low',
    cls_good: locale === 'nl' ? 'Cumulative Layout Shift minimaal' : 'Cumulative Layout Shift minimal',
    inp_good: locale === 'nl' ? 'Interaction to Next Paint snel' : 'Interaction to Next Paint fast',
    has_canonical: locale === 'nl' ? 'Canonical tag aanwezig' : 'Canonical tag present',
    indexable: locale === 'nl' ? 'Pagina indexeerbaar' : 'Page indexable',
    performance_hints: locale === 'nl' ? 'Performance optimalisaties aanwezig' : 'Performance optimizations present',
    is_https: locale === 'nl' ? 'HTTPS actief' : 'HTTPS active',
    has_viewport: locale === 'nl' ? 'Viewport meta tag aanwezig' : 'Viewport meta tag present',
    has_lang: locale === 'nl' ? 'HTML taalattribuut aanwezig' : 'HTML language attribute present',
    has_hreflang: locale === 'nl' ? 'Hreflang tags aanwezig' : 'Hreflang tags present',
    // Content
    title_exists: locale === 'nl' ? 'SEO titel aanwezig' : 'SEO title present',
    title_optimal: locale === 'nl' ? 'SEO titel optimale lengte' : 'SEO title optimal length',
    title_length: locale === 'nl' ? 'SEO titel juiste lengte' : 'SEO title correct length',
    meta_exists: locale === 'nl' ? 'Meta description aanwezig' : 'Meta description present',
    meta_optimal: locale === 'nl' ? 'Meta description optimaal' : 'Meta description optimal',
    meta_desc_length: locale === 'nl' ? 'Meta description juiste lengte' : 'Meta description correct length',
    has_single_h1: locale === 'nl' ? 'Enkele H1 heading aanwezig' : 'Single H1 heading present',
    has_h1: locale === 'nl' ? 'H1 heading aanwezig' : 'H1 heading present',
    has_h2s: locale === 'nl' ? 'Meerdere H2 subkoppen aanwezig' : 'Multiple H2 subheadings present',
    has_h3s: locale === 'nl' ? 'H3 subkoppen aanwezig' : 'H3 subheadings present',
    word_count_ok: locale === 'nl' ? 'Voldoende content' : 'Sufficient content',
    has_images: locale === 'nl' ? 'Afbeeldingen aanwezig' : 'Images present',
    has_images_with_alt: locale === 'nl' ? 'Afbeeldingen met alt-tekst' : 'Images with alt text',
    all_images_have_alt: locale === 'nl' ? 'Alle afbeeldingen hebben alt-tekst' : 'All images have alt text',
    has_internal_links: locale === 'nl' ? 'Interne links aanwezig' : 'Internal links present',
    has_external_links: locale === 'nl' ? 'Externe links aanwezig' : 'External links present',
    has_lists: locale === 'nl' ? 'Opsommingslijsten aanwezig' : 'Lists present',
    // Structured data
    has_jsonld: locale === 'nl' ? 'JSON-LD structured data aanwezig' : 'JSON-LD structured data present',
    has_org_schema: locale === 'nl' ? 'Organization schema aanwezig' : 'Organization schema present',
    has_local_schema: locale === 'nl' ? 'LocalBusiness schema aanwezig' : 'LocalBusiness schema present',
    has_faq_schema: locale === 'nl' ? 'FAQPage schema aanwezig' : 'FAQPage schema present',
    has_product_schema: locale === 'nl' ? 'Product schema aanwezig' : 'Product schema present',
    has_article_schema: locale === 'nl' ? 'Article schema aanwezig' : 'Article schema present',
    has_breadcrumb: locale === 'nl' ? 'Breadcrumb navigatie aanwezig' : 'Breadcrumb navigation present',
    og_image: locale === 'nl' ? 'Open Graph afbeelding aanwezig' : 'Open Graph image present',
    og_title: locale === 'nl' ? 'Open Graph titel aanwezig' : 'Open Graph title present',
    og_description: locale === 'nl' ? 'Open Graph beschrijving aanwezig' : 'Open Graph description present',
    twitter_card: locale === 'nl' ? 'Twitter Card tags aanwezig' : 'Twitter Card tags present',
    has_sitemap: locale === 'nl' ? 'Sitemap.xml aanwezig' : 'Sitemap.xml present',
    has_robots: locale === 'nl' ? 'Robots.txt aanwezig' : 'Robots.txt present',
    // GEO specific
    has_faq_content: locale === 'nl' ? 'FAQ of Q&A content aanwezig' : 'FAQ or Q&A content present',
    has_direct_answers: locale === 'nl' ? 'Directe antwoorden in content' : 'Direct answers in content',
    has_local_info: locale === 'nl' ? 'Lokale informatie aanwezig' : 'Local information present',
    has_expertise_signals: locale === 'nl' ? 'Expertise en autoriteit zichtbaar' : 'Expertise and authority visible',
    has_date: locale === 'nl' ? 'Publicatiedatum zichtbaar' : 'Publication date visible',
    conversational_style: locale === 'nl' ? 'Conversatiestijl afgestemd op vragen' : 'Conversational style aligned with questions',
    has_definition: locale === 'nl' ? 'Definitie of Quick Answer aanwezig' : 'Definition or Quick Answer present',
    brand_mentioned: locale === 'nl' ? 'Merknaam in content vermeld' : 'Brand name mentioned in content',
    has_contact_info: locale === 'nl' ? 'Contactgegevens zichtbaar' : 'Contact information visible',
    has_author: locale === 'nl' ? 'Auteursinformatie aanwezig' : 'Author information present',
  }
  // Find label: scan labels → GEO_CHECKLIST items → readable ID
  const cl = (id) => {
    if (SCAN_CHECK_LABELS[id]) return SCAN_CHECK_LABELS[id]
    for (const cat of Object.values(GEO_CHECKLIST)) {
      const item = cat.items?.find(i => i.id === id)
      if (item) return item.label
    }
    return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  const clCat = (key) => {
    const cat = GEO_CHECKLIST[key]
    return cat?.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  
  // Existing websites from dashboard
  const [existingWebsites, setExistingWebsites] = useState([])
  const [selectedExistingWebsite, setSelectedExistingWebsite] = useState(null)
  const [existingPrompts, setExistingPrompts] = useState([])
  const [existingAiResults, setExistingAiResults] = useState([]) // AI results from previous scan
  
  // Step 1: Basic Info
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyCategory, setCompanyCategory] = useState('')
  
  // Step 2: Search Console Data
  const [googleConnected, setGoogleConnected] = useState(false)
  const [scProperties, setScProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState('')
  const [loadingScData, setLoadingScData] = useState(false)
  const [scPages, setScPages] = useState([]) // Pages from Search Console
  const [csvFileName, setCsvFileName] = useState('')
  const [csvParsing, setCsvParsing] = useState(false)
  const [csvError, setCsvError] = useState('')
  
  // Step 3: Prompt-Page Matching
  const [matches, setMatches] = useState([]) // { prompt, page }
  const [draggedItem, setDraggedItem] = useState(null)
  const [unmatchedPrompts, setUnmatchedPrompts] = useState([])
  const [pageSearch, setPageSearch] = useState('') // Search filter for pages
  const [autoMatching, setAutoMatching] = useState(false)
  const [editingPromptIndex, setEditingPromptIndex] = useState(null)
  const [editingPromptText, setEditingPromptText] = useState('')
  
  // Step 4: GEO Checklist Scan
  const [geoScanning, setGeoScanning] = useState(false)
  const [geoScanProgress, setGeoScanProgress] = useState(0)
  const [geoResults, setGeoResults] = useState({}) // pageUrl -> { checklist, score, issues }
  const [manualChecks, setManualChecks] = useState({})
  
  // Animated scan state
  const [currentScanPage, setCurrentScanPage] = useState(null)
  const [currentCheckItem, setCurrentCheckItem] = useState(null)
  const [completedChecks, setCompletedChecks] = useState([]) // { id, label, passed, section }
  const [currentPageIndex, setCurrentPageIndex] = useState(0) // 1-based page counter
  const [scanLog, setScanLog] = useState([]) // scrolling log of checked items
  const [scanPhase, setScanPhase] = useState('idle') // 'loading', 'scanning', 'analyzing', 'complete'
  
  // Step 4: GEO Scan & Werklijst (per-page deep audit)
  const [overallScore, setOverallScore] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  // Werklijst expanded state
  const [expandedPage, setExpandedPage] = useState(null)
  
  // Google AI Mode Scan
  const [googleAiScanning, setGoogleAiScanning] = useState(false)
  const [googleAiProgress, setGoogleAiProgress] = useState(0)
  
  // Google AI Overview Scan
  const [googleAiOverviewScanning, setGoogleAiOverviewScanning] = useState(false)
  
  // Expanded platform results
  const [expandedPlatform, setExpandedPlatform] = useState(null) // 'perplexity' | 'chatgpt' | 'googleAi' | 'googleAiOverview' | null
  const [expandedPromptIndex, setExpandedPromptIndex] = useState(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Client access detection
  const clientAccess = useClientAccess(user?.email)
  
  // Session key for localStorage
  const SESSION_KEY = 'geo_analyse_session'
  
  // Reload data when client access is detected (async)
  useEffect(() => {
    if (!clientAccess.loading && clientAccess.isClient && user) {
      console.log('🔗 Client access detected, reloading websites...')
      loadExistingWebsites(user.id)
    }
  }, [clientAccess.loading, clientAccess.isClient])

  // Calculate overallScore for shared clients when data is ready
  useEffect(() => {
    if (clientAccess.isClient && selectedExistingWebsite && !overallScore) {
      const cr = selectedExistingWebsite.combinedResults || {}
      const totalMentioned = (cr.perplexity?.mentioned || 0) + (cr.chatgpt?.mentioned || 0) + (cr.googleAi?.mentioned || 0) + (cr.googleAiOverview?.mentioned || 0)
      const totalScanned = (cr.perplexity?.total || 0) + (cr.chatgpt?.total || 0) + (cr.googleAi?.total || 0) + (cr.googleAiOverview?.total || 0)
      const aiVisibilityScore = totalScanned > 0 ? Math.round((totalMentioned / totalScanned) * 100) : 0
      setOverallScore({
        aiVisibility: aiVisibilityScore,
        geo: 0,
        overall: aiVisibilityScore
      })
    }
  }, [clientAccess.isClient, selectedExistingWebsite])

  // ============================================
  // SESSION PERSISTENCE
  // ============================================
  const saveSession = () => {
    const session = {
      step,
      companyName,
      companyWebsite,
      companyCategory,
      existingPrompts,
      existingAiResults,
      scPages,
      matches,
      unmatchedPrompts,
      // Don't save geoResults - too large with Claude customAdvice
      manualChecks,
      overallScore,
      selectedProperty,
      timestamp: Date.now()
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch (e) {
      // localStorage full - clear and don't save
      console.warn('Session too large for localStorage, clearing')
      localStorage.removeItem(SESSION_KEY)
    }
  }

  const loadSession = () => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) {
        const session = JSON.parse(saved)
        // Only restore if less than 24 hours old
        if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          return session
        }
      }
    } catch (e) {
      console.error('Error loading session:', e)
    }
    return null
  }

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
  }

  // Auto-save session on meaningful changes only
  useEffect(() => {
    // Only save if we're past step 2 AND have actual progress
    if (step >= 3 && (matches.length > 0 || Object.keys(geoResults).length > 0)) {
      saveSession()
    }
  }, [step, matches, geoResults, overallScore, manualChecks])

  // ============================================
  // AUTH & INIT
  // ============================================
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    
    // Load existing websites first
    await loadExistingWebsites(user.id)
    await checkGoogleConnection()
    
    // Try to restore session AFTER loading websites
    const savedSession = loadSession()
    const viewResults = searchParams.get('view') === 'results'
    if (savedSession && savedSession.companyName && savedSession.step > 1 && !viewResults) {
      // Only restore if session is recent (1 hour) and has meaningful progress
      const sessionAge = Date.now() - savedSession.timestamp
      const isRecent = sessionAge < 60 * 60 * 1000 // 1 hour
      const hasProgress = savedSession.step >= 3 || (savedSession.matches && savedSession.matches.length > 0)
      
      if (isRecent && hasProgress) {
        // Restore saved state
        setStep(Math.min(savedSession.step || 1, 3))
        setCompanyName(savedSession.companyName || '')
        setCompanyWebsite(savedSession.companyWebsite || '')
        setCompanyCategory(savedSession.companyCategory || '')
        setExistingPrompts(savedSession.existingPrompts || [])
        setExistingAiResults(savedSession.existingAiResults || [])
        setScPages(savedSession.scPages || [])
        setMatches(savedSession.matches || [])
        setUnmatchedPrompts(savedSession.unmatchedPrompts || [])
        setGeoResults(savedSession.geoResults || {})
        setManualChecks(savedSession.manualChecks || {})
        setOverallScore(savedSession.overallScore || null)
        setSelectedProperty(savedSession.selectedProperty || '')
        console.log('Restored session for:', savedSession.companyName, 'Step:', savedSession.step)
      } else {
        // Clear stale session
        clearSession()
        console.log('Cleared stale session (age:', Math.round(sessionAge / 60000), 'min)')
      }
    }
    
    setLoading(false)
  }

  // ============================================
  // LOAD EXISTING WEBSITES FROM DASHBOARD
  // ============================================
  const loadExistingWebsites = async (userId) => {
    try {
      // Determine which user_id(s) and company names to load
      let queryUserId = userId
      let companyFilter = null
      
      // If client with shared access, load owner's data instead
      if (clientAccess.isClient && clientAccess.shares.length > 0) {
        queryUserId = clientAccess.shares[0].owner_id
        companyFilter = clientAccess.sharedCompanies
        console.log('🔗 Client view: loading shared data from owner', queryUserId, 'companies:', companyFilter)
      }
      
      // Load from tool_integrations (PRIMARY source for Perplexity data)
      let integrationsQuery = supabase
        .from('tool_integrations')
        .select('*')
        .eq('user_id', queryUserId)
        .order('created_at', { ascending: false })
      if (companyFilter) integrationsQuery = integrationsQuery.in('company_name', companyFilter)
      const { data: integrations } = await integrationsQuery

      // Load from chatgpt_scans
      let chatgptQuery = supabase
        .from('chatgpt_scans')
        .select('*, chatgpt_query_results(*)')
        .eq('user_id', queryUserId)
        .order('created_at', { ascending: false })
      if (companyFilter) chatgptQuery = chatgptQuery.in('company_name', companyFilter)
      const { data: chatgptScans } = await chatgptQuery

      // Load from google_ai_scans
      let googleQuery = supabase
        .from('google_ai_scans')
        .select('*')
        .eq('user_id', queryUserId)
        .order('created_at', { ascending: false })
      if (companyFilter) googleQuery = googleQuery.in('company_name', companyFilter)
      const { data: googleAiScans } = await googleQuery

      // Load from google_ai_overview_scans
      let overviewQuery = supabase
        .from('google_ai_overview_scans')
        .select('*')
        .eq('user_id', queryUserId)
        .order('created_at', { ascending: false })
      if (companyFilter) overviewQuery = overviewQuery.in('company_name', companyFilter)
      const { data: googleAiOverviewScans } = await overviewQuery

      console.log('Loaded tool_integrations:', integrations)
      console.log('Loaded chatgpt scans:', chatgptScans)
      console.log('Loaded google ai scans:', googleAiScans)
      console.log('Loaded google ai overview scans:', googleAiOverviewScans)
      
      // Debug: log first tool_integration structure
      if (integrations?.[0]) {
        console.log('First tool_integration structure:', {
          id: integrations[0].id,
          company_name: integrations[0].company_name,
          website: integrations[0].website,
          hasResults: !!integrations[0].results,
          resultsLength: integrations[0].results?.length,
          hasScanResults: !!integrations[0].scan_results,
          scanResultsLength: integrations[0].scan_results?.length,
          commercial_prompts: integrations[0].commercial_prompts?.length,
          total_company_mentions: integrations[0].total_company_mentions
        })
      }

      // Deduplicate and combine - tool_integrations is primary source
      const websiteMap = new Map()
      
      // First, process tool_integrations (primary Perplexity data)
      integrations?.forEach(scan => {
        const key = (scan.company_name || scan.website || '').toLowerCase().trim()
        if (!key) return
        
        // Parse results - handle both formats:
        // New format: { perplexity: [...], chatgpt: [...] }  (object with platform keys)
        // Old format: [...] (flat array, assumed Perplexity)
        const rawResults = scan.results || scan.scan_results || []
        let perplexityData = []
        let chatgptData = []
        
        if (rawResults && !Array.isArray(rawResults) && typeof rawResults === 'object') {
          // New format: nested object with platform keys
          perplexityData = Array.isArray(rawResults.perplexity) ? rawResults.perplexity : []
          chatgptData = Array.isArray(rawResults.chatgpt) ? rawResults.chatgpt : []
          console.log(`tool_integrations [${scan.company_name}] nested format: P:${perplexityData.length} C:${chatgptData.length}`)
        } else if (Array.isArray(rawResults)) {
          // Old format: flat array (all Perplexity)
          perplexityData = rawResults
          console.log(`tool_integrations [${scan.company_name}] flat format: ${perplexityData.length} results`)
        }
        
        // Extract prompts from commercial_prompts OR from results
        const prompts = scan.commercial_prompts || 
          [...perplexityData, ...chatgptData].map(r => r.ai_prompt || r.query || r.prompt).filter(Boolean)
        
        // Debug
        if (perplexityData.length > 0) {
          console.log('Perplexity result fields:', Object.keys(perplexityData[0]))
        }
        if (chatgptData.length > 0) {
          console.log('ChatGPT result fields:', Object.keys(chatgptData[0]))
        }
        
        if (!websiteMap.has(key)) {
          let combinedResults = {
            perplexity: { mentioned: 0, total: 0, results: [] },
            chatgpt: { mentioned: 0, total: 0, results: [] },
            googleAi: { mentioned: 0, total: 0, results: [] },
            googleAiOverview: { mentioned: 0, total: 0, results: [] }
          }
          
          // Add Perplexity results
          if (perplexityData.length > 0) {
            combinedResults.perplexity.results = perplexityData.map(r => ({
              prompt: r.ai_prompt || r.query || r.prompt || '',
              mentioned: r.company_mentioned === true || r.companyMentioned === true || r.mentioned === true,
              snippet: r.simulated_ai_response_snippet || r.snippet || r.aiResponse || r.response_snippet || '',
              competitors: r.competitors_mentioned || r.competitors || []
            }))
            combinedResults.perplexity.total = perplexityData.length
            combinedResults.perplexity.mentioned = perplexityData.filter(r => 
              r.companyMentioned === true || r.mentioned === true || r.company_mentioned === true
            ).length
          }
          
          // Add ChatGPT results (from nested format in tool_integrations)
          if (chatgptData.length > 0) {
            combinedResults.chatgpt.results = chatgptData.map(r => ({
              prompt: r.ai_prompt || r.query || r.prompt || '',
              mentioned: r.company_mentioned === true || r.companyMentioned === true || r.mentioned === true,
              snippet: r.simulated_ai_response_snippet || r.snippet || r.aiResponse || r.response_snippet || '',
              competitors: r.competitors_mentioned || r.competitors || []
            }))
            combinedResults.chatgpt.total = chatgptData.length
            combinedResults.chatgpt.mentioned = chatgptData.filter(r => 
              r.companyMentioned === true || r.mentioned === true || r.company_mentioned === true
            ).length
          }
          
          const hasData = perplexityData.length > 0 || chatgptData.length > 0
          
          websiteMap.set(key, {
            id: scan.id,
            name: scan.company_name || scan.website,
            website: scan.website || '',
            category: scan.company_category || scan.category,
            prompts: prompts,
            combinedResults: combinedResults,
            source: 'tool_integrations',
            hasRealAiData: hasData
          })
          
          console.log('Added website from tool_integrations:', scan.company_name, 'Prompts:', prompts.length, 'Perplexity:', perplexityData.length, 'ChatGPT:', chatgptData.length)
        }
      })

      // Add ChatGPT results to existing websites
      chatgptScans?.forEach(scan => {
        const key = (scan.company_name || '').toLowerCase().trim()
        // Support both new results JSONB and old chatgpt_query_results join
        const rawResults = scan.results || scan.chatgpt_query_results || []
        const results = rawResults.map(r => ({
          prompt: r.query || '',
          mentioned: r.found || r.mentioned || false,
          snippet: r.full_response || r.response_preview || r.snippet || r.response_snippet || ''
        }))
        
        if (key && websiteMap.has(key)) {
          const existing = websiteMap.get(key)
          
          // Update category if missing
          if (!existing.category && (scan.company_category || scan.category)) {
            existing.category = scan.company_category || scan.category
          }
          
          // Only override if chatgpt_scans has data AND existing is empty or has less
          if (results.length > 0 && results.length >= (existing.combinedResults.chatgpt?.total || 0)) {
            existing.combinedResults.chatgpt = {
              mentioned: results.filter(r => r.mentioned === true).length,
              total: results.length,
              results
            }
          }
        } else if (key && !websiteMap.has(key)) {
          // Create new entry if not exists
          const prompts = rawResults.map(r => r.query).filter(Boolean)
          
          websiteMap.set(key, {
            id: scan.id,
            name: scan.company_name,
            website: null,
            category: scan.company_category || scan.category || null,
            prompts,
            combinedResults: {
              perplexity: { mentioned: 0, total: 0, results: [] },
              chatgpt: {
                mentioned: results.filter(r => r.mentioned === true).length,
                total: results.length,
                results
              },
              googleAi: { mentioned: 0, total: 0, results: [] },
              googleAiOverview: { mentioned: 0, total: 0, results: [] }
            },
            source: 'chatgpt'
          })
        }
      })

      // Add Google AI results to existing websites AND get website URL if missing
      googleAiScans?.forEach(scan => {
        const key = (scan.company_name || '').toLowerCase().trim()
        if (key && websiteMap.has(key)) {
          const existing = websiteMap.get(key)
          const results = scan.results || []
          
          // Update website URL if we have it and it's missing
          if (!existing.website && scan.website) {
            existing.website = scan.website
          }
          
          // Update category if missing
          if (!existing.category && (scan.company_category || scan.category)) {
            existing.category = scan.company_category || scan.category
          }
          
          // Build company name variants for text-based mention detection
          const companyLower = (scan.company_name || '').toLowerCase().trim()
          const companyVariants = companyLower ? [
            companyLower,
            companyLower.replace(/\s+/g, ''),
            companyLower.replace(/\s+/g, '-'),
            companyLower.replace(/[-_.]/g, ' '),
          ].filter((v, i, a) => a.indexOf(v) === i) : []
          const websiteDomain = (scan.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
          
          // Helper: detect mention from text + sources
          const detectMention = (r) => {
            // 1. Explicit flag
            if (r.companyMentioned === true) return true
            // 2. Text-based detection in aiResponse
            const text = (r.aiResponse || r.textContent || r.aiResponsePreview || '').toLowerCase()
            if (text && companyVariants.some(v => text.includes(v))) return true
            // 3. Domain in sources
            if (websiteDomain) {
              const sources = r.sources || r.references || []
              if (sources.some(s => {
                const d = (s.domain || s.link || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
                return d.includes(websiteDomain) || websiteDomain.includes(d.split('/')[0])
              })) return true
            }
            return false
          }
          
          // Handle both old (AI Overview) and new (AI Mode) format
          const processedResults = results.map(r => ({
            prompt: r.query || r.prompt,
            mentioned: detectMention(r),
            hasAiResponse: r.hasAiResponse === true || r.hasAiOverview === true || !!(r.aiResponse || r.textContent),
            snippet: r.aiResponse || r.aiResponsePreview || r.aiOverviewText || r.textContent || '',
            competitors: r.competitors || r.competitorsInSources || r.competitorsMentioned || []
          }))
          
          existing.combinedResults.googleAi = {
            mentioned: processedResults.filter(r => r.mentioned).length,
            total: results.length,
            results: processedResults
          }
          
          // Mark as having real AI data if we have responses
          if (results.length > 0 && results.some(r => r.hasAiResponse || r.hasAiOverview || r.aiResponse || r.textContent)) {
            existing.hasRealAiData = true
          }
        }
      })

      // Add Google AI Overview results to existing websites
      googleAiOverviewScans?.forEach(scan => {
        const key = (scan.company_name || '').toLowerCase().trim()
        if (key && websiteMap.has(key)) {
          const existing = websiteMap.get(key)
          const results = scan.results || []

          if (!existing.website && scan.website) {
            existing.website = scan.website
          }

          // Build company name variants for text-based mention detection
          const companyLower = (scan.company_name || '').toLowerCase().trim()
          const companyVariants = companyLower ? [
            companyLower,
            companyLower.replace(/\s+/g, ''),
            companyLower.replace(/\s+/g, '-'),
            companyLower.replace(/[-_.]/g, ' '),
          ].filter((v, i, a) => a.indexOf(v) === i) : []
          const websiteDomain = (scan.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

          const detectMention = (r) => {
            if (r.companyMentioned === true) return true
            const text = (r.aiResponse || r.textContent || r.aiOverviewText || '').toLowerCase()
            if (text && companyVariants.some(v => text.includes(v))) return true
            if (websiteDomain) {
              const sources = r.sources || r.references || []
              if (sources.some(s => {
                const d = (s.domain || s.link || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
                return d.includes(websiteDomain) || websiteDomain.includes(d.split('/')[0])
              })) return true
            }
            return false
          }

          const processedResults = results.map(r => ({
            prompt: r.query || r.prompt,
            mentioned: detectMention(r),
            hasAiOverview: r.hasAiOverview === true || !!(r.aiOverviewText || r.textContent),
            snippet: r.aiOverviewText || r.aiResponse || r.textContent || '',
            competitors: r.competitorsMentioned || []
          }))

          existing.combinedResults.googleAiOverview = {
            mentioned: processedResults.filter(r => r.mentioned).length,
            total: results.length,
            results: processedResults
          }

          if (results.length > 0 && results.some(r => r.hasAiOverview || r.aiOverviewText || r.textContent)) {
            existing.hasRealAiData = true
          }
        }
      })

      // Convert combinedResults to legacy aiResults format for backward compatibility
      const websites = [...websiteMap.values()].map(site => {
        const cr = site.combinedResults || {
          perplexity: { mentioned: 0, total: 0, results: [] },
          chatgpt: { mentioned: 0, total: 0, results: [] },
          googleAi: { mentioned: 0, total: 0, results: [] },
            googleAiOverview: { mentioned: 0, total: 0, results: [] }
        }
        
        // Calculate totals across all platforms
        const totalMentioned = cr.perplexity.mentioned + cr.chatgpt.mentioned + cr.googleAi.mentioned + (cr.googleAiOverview?.mentioned || 0)
        const totalScanned = cr.perplexity.total + cr.chatgpt.total + cr.googleAi.total + (cr.googleAiOverview?.total || 0)
        
        // Create combined aiResults array for legacy compatibility
        const allResults = [
          ...cr.perplexity.results.map(r => ({ ...r, platform: 'perplexity' })),
          ...cr.chatgpt.results.map(r => ({ ...r, platform: 'chatgpt' })),
          ...cr.googleAi.results.map(r => ({ ...r, platform: 'google' })),
          ...(cr.googleAiOverview?.results || []).map(r => ({ ...r, platform: 'google_overview' }))
        ]
        
        console.log(`Website ${site.name}: ${totalMentioned}/${totalScanned} total (P:${cr.perplexity.mentioned}/${cr.perplexity.total}, C:${cr.chatgpt.mentioned}/${cr.chatgpt.total}, G:${cr.googleAi.mentioned}/${cr.googleAi.total}, OV:${cr.googleAiOverview?.mentioned || 0}/${cr.googleAiOverview?.total || 0})`)
        
        return {
          ...site,
          aiResults: allResults,
          combinedResults: cr,
          totalMentioned,
          totalScanned
        }
      })
      
      setExistingWebsites(websites)
      
      // Auto-select first website if available
      if (websites.length > 0) {
        const firstSite = websites[0]
        setCompanyName(firstSite.name || '')
        setCompanyWebsite(firstSite.website || '')
        setCompanyCategory(firstSite.category || '')
        // Deduplicate prompts
        const uniquePrompts = [...new Set(firstSite.prompts || [])]
        setExistingPrompts(uniquePrompts)
        setExistingAiResults(firstSite.aiResults || [])
        setSelectedExistingWebsite(firstSite)
        // Initialize unmatched prompts (deduplicated)
        setUnmatchedPrompts(uniquePrompts)
      }
    } catch (error) {
      console.error('Error loading existing websites:', error)
    }
  }

  const selectExistingWebsite = async (website) => {
    // Clear any existing session to prevent stale data
    clearSession()
    
    setSelectedExistingWebsite(website)
    setCompanyName(website.name || '')
    setCompanyWebsite(website.website || '')
    setCompanyCategory(website.category || '')
    
    // Deduplicate prompts
    const uniquePrompts = [...new Set(website.prompts || [])]
    setExistingPrompts(uniquePrompts)
    setExistingAiResults(website.aiResults || [])
    
    // Reset matching state completely
    setUnmatchedPrompts(uniquePrompts)
    setMatches([])
    setScPages([])
    setGeoResults({})
    setManualChecks({})
    setOverallScore(null)
    
    console.log('Selected website:', website.name, 'Prompts:', uniquePrompts.length)
    
    // Check for saved GEO results in Supabase
    const saved = await loadGeoResultsFromDB(website.name)
    if (saved && Object.keys(saved.geoResults).length > 0) {
      console.log('🔄 Restoring saved GEO results:', Object.keys(saved.geoResults).length, 'pages')
      setGeoResults(saved.geoResults)
      if (saved.matches.length > 0) {
        setMatches(saved.matches)
        setUnmatchedPrompts(uniquePrompts.filter(p => !saved.matches.some(m => m.prompt === p)))
      }
      calculateOverallScore(saved.geoResults)
      setStep(4)
    }
  }

  // ============================================
  // GOOGLE SEARCH CONSOLE
  // ============================================
  const checkGoogleConnection = async () => {
    try {
      const response = await fetch('/api/search-console/properties')
      if (response.ok) {
        const data = await response.json()
        setGoogleConnected(true)
        setScProperties(data.properties || [])
      }
    } catch (error) {
      setGoogleConnected(false)
    }
  }

  const connectGoogle = () => {
    // Add prompt=select_account to force Google to show account picker
    window.location.href = '/api/auth/google?returnUrl=/dashboard/geo-analyse&prompt=select_account'
  }

  const disconnectGoogle = async () => {
    if (!confirm(t('confirmDisconnect'))) return
    try {
      await fetch('/api/search-console/disconnect', { method: 'DELETE' })
      setGoogleConnected(false)
      setScProperties([])
      setSelectedProperty('')
      setScPages([])
      // Clear any cached state
      localStorage.removeItem('gsc_last_property')
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  // Handle google_connected URL parameter
  useEffect(() => {
    const googleConnectedParam = searchParams.get('google_connected')
    if (googleConnectedParam === 'true') {
      checkGoogleConnection()
      setStep(2)
      router.replace('/dashboard/geo-analyse', { scroll: false })
    }
  }, [searchParams])

  // Handle view=results from dashboard link
  useEffect(() => {
    if (searchParams.get('view') !== 'results') return
    if (!companyName || step === 4 || loading) return
    
    const loadResults = async () => {
      console.log('[GEO] view=results: loading for', companyName)
      const saved = await loadGeoResultsFromDB(companyName)
      if (saved && Object.keys(saved.geoResults).length > 0) {
        console.log('[GEO] view=results: found', Object.keys(saved.geoResults).length, 'pages')
        setGeoResults(saved.geoResults)
        if (saved.matches.length > 0) {
          setMatches(saved.matches)
        }
        calculateOverallScore(saved.geoResults)
        setStep(4)
        router.replace('/dashboard/geo-analyse', { scroll: false })
      } else {
        console.log('[GEO] view=results: no saved results found')
      }
    }
    loadResults()
  }, [searchParams, companyName, loading])

  const loadSearchConsoleData = async (siteUrl) => {
    if (!siteUrl) return
    
    setLoadingScData(true)
    try {
      const response = await fetch('/api/search-console/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl, rowLimit: 500 })
      })

      if (response.ok) {
        const data = await response.json()
        // We only need pages for matching, not queries
        setScPages(data.pages || [])
      }
    } catch (error) {
      console.error('Error loading SC data:', error)
    } finally {
      setLoadingScData(false)
    }
  }

  // ============================================
  // FILE UPLOAD (ZIP/CSV)
  // ============================================
  const parseCSVContent = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []
    
    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : ','
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''))
    
    const pageIndex = headers.findIndex(h => 
      h.includes('page') || h.includes('pagina') || h.includes('url') || h.includes('top pages')
    )
    const clicksIndex = headers.findIndex(h => h.includes('click') || h.includes('klik'))
    
    const pages = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter)
      if (pageIndex !== -1) {
        const page = (cols[pageIndex] || '').replace(/"/g, '').trim()
        const clicks = parseInt(cols[clicksIndex]) || 0
        if (page && page.startsWith('http')) {
          pages.push({ page, clicks })
        }
      }
    }
    return pages
  }

  const parseXLSXPages = async (file, loc) => {
    const xlsxModule = await import('xlsx')
    const XLSX = xlsxModule.default || xlsxModule
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Zoek het Pages tabblad (EN: Pages, NL: Pagina's)
    const pagesSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('pages') || name.toLowerCase().includes('pagina')
    )
    
    if (!pagesSheetName) {
      return { pages: [], error: loc === 'en' 
        ? 'No "Pages" tab found. Upload the Search Console Excel file.'
        : 'Geen "Pages" tabblad gevonden. Upload het Search Console Excel-bestand.' }
    }
    
    const sheet = workbook.Sheets[pagesSheetName]
    const rows = XLSX.utils.sheet_to_json(sheet)
    
    const pages = []
    for (const row of rows) {
      const pageKey = Object.keys(row).find(k => {
        const kl = k.toLowerCase()
        return kl.includes('page') || kl.includes('pagina') || kl.includes('url')
      })
      const clicksKey = Object.keys(row).find(k => {
        const kl = k.toLowerCase()
        return kl.includes('click') || kl.includes('klik')
      })
      
      if (pageKey) {
        const page = String(row[pageKey]).trim()
        const clicks = parseInt(row[clicksKey]) || 0
        if (page.startsWith('http')) {
          pages.push({ page, clicks })
        }
      }
    }
    
    return { pages, error: pages.length === 0 
      ? (loc === 'en' ? 'No page URLs found in the Pages tab.' : 'Geen pagina-URLs gevonden in het Pages-tabblad.')
      : '' }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setCsvParsing(true)
    setCsvFileName(file.name)
    setCsvError('')
    setScPages([])
    
    try {
      const fileName = file.name.toLowerCase()
      
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const { pages, error } = await parseXLSXPages(file, locale)
        if (error) {
          setCsvError(error)
        } else {
          setScPages(pages)
        }
      } else {
        setCsvError(locale === 'en' 
          ? 'Upload the Excel file (.xlsx) from Search Console. Go to Export → Download Excel.'
          : 'Upload het Excel-bestand (.xlsx) uit Search Console. Ga naar Exporteren → Download Excel.')
      }
    } catch (err) {
      console.error('File parse error:', err)
      setCsvError((locale === 'en' ? 'Could not read file: ' : 'Bestand kon niet worden gelezen: ') + err.message)
    }
    
    setCsvParsing(false)
  }

  // ============================================
  // STEP 3: AI VISIBILITY SCAN
  // ============================================
  const runAiVisibilityScan = async () => {
    if (existingPrompts.length === 0) {
      alert(t('noPromptsAlert'))
      return
    }
    
    setAiScanning(true)
    setAiScanProgress(0)
    const results = []
    
    // Scan max 15 prompts
    const promptsToScan = existingPrompts.slice(0, 15)
    
    for (let i = 0; i < promptsToScan.length; i++) {
      const prompt = promptsToScan[i]
      setAiScanProgress(Math.round((i / promptsToScan.length) * 100))
      
      try {
        const response = await fetch('/api/ai-visibility-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            query: prompt,
            category: companyCategory
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          results.push({
            prompt,
            mentioned: data.company_mentioned || false,
            mentionCount: data.mentions_count || 0,
            competitors: data.competitors_mentioned || [],
            snippet: data.simulated_ai_response_snippet || ''
          })
        } else {
          results.push({ prompt, mentioned: false, mentionCount: 0, competitors: [], snippet: t('scanFailed') })
        }
      } catch (error) {
        results.push({ prompt, mentioned: false, mentionCount: 0, competitors: [], snippet: error.message })
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    setAiResults(results)
    setAiScanProgress(100)
    setAiScanning(false)
    
    // Initialize matching - all prompts start unmatched
    setUnmatchedPrompts(results.map(r => r.prompt))
    setMatches([])
  }

  // ============================================
  // GOOGLE AI MODE SCAN
  // ============================================
  const runGoogleAiModeScan = async () => {
    if (existingPrompts.length === 0) {
      alert(t('noPromptsSelectCompany'))
      return
    }
    
    setGoogleAiScanning(true)
    setGoogleAiProgress(0)
    
    try {
      // Scan max 10 prompts for Google AI Mode (API credits)
      const promptsToScan = existingPrompts.slice(0, 10)
      
      console.log('Starting Google AI Mode scan for:', companyName)
      console.log('Prompts:', promptsToScan)
      
      const response = await fetch('/api/scan-google-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          website: companyWebsite,
          category: companyCategory,
          prompts: promptsToScan
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('scanFailed'))
      }
      
      const data = await response.json()
      console.log('Google AI Mode scan results:', data)
      
      // Update existingAiResults with Google AI Mode results
      if (data.results && data.results.length > 0) {
        const googleResults = data.results.map(r => ({
          prompt: r.query,
          mentioned: r.companyMentioned,
          snippet: r.aiResponsePreview || '',
          competitors: r.competitors || [],
          platform: 'google'
        }))
        
        // Merge with existing results or replace
        const existingNonGoogle = existingAiResults.filter(r => r.platform !== 'google')
        setExistingAiResults([...existingNonGoogle, ...googleResults])
        
        // Also update the selectedExistingWebsite if available
        if (selectedExistingWebsite) {
          const updatedWebsite = { ...selectedExistingWebsite }
          updatedWebsite.combinedResults = updatedWebsite.combinedResults || {
            perplexity: { mentioned: 0, total: 0, results: [] },
            chatgpt: { mentioned: 0, total: 0, results: [] },
            googleAi: { mentioned: 0, total: 0, results: [] },
            googleAiOverview: { mentioned: 0, total: 0, results: [] }
          }
          updatedWebsite.combinedResults.googleAi = {
            mentioned: data.foundCount || 0,
            total: data.totalQueries || 0,
            results: googleResults
          }
          setSelectedExistingWebsite(updatedWebsite)
        }
        
        alert(t('aiModeScanComplete', { found: data.foundCount, total: data.totalQueries, company: companyName }))
      }
      
      setGoogleAiProgress(100)
      
    } catch (error) {
      console.error('Google AI Mode scan error:', error)
      alert(t('aiModeScanError') + ': ' + error.message)
    } finally {
      setGoogleAiScanning(false)
    }
  }

  // ============================================
  // GOOGLE AI OVERVIEW SCAN
  // ============================================
  const runGoogleAiOverviewScan = async () => {
    if (existingPrompts.length === 0) {
      alert(t('noPromptsSelectCompany'))
      return
    }

    setGoogleAiOverviewScanning(true)

    try {
      const promptsToScan = existingPrompts.slice(0, 10)

      console.log('Starting Google AI Overview scan for:', companyName)

      const response = await fetch('/api/scan-google-ai-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          website: companyWebsite,
          category: companyCategory,
          prompts: promptsToScan
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('scanFailed'))
      }

      const data = await response.json()
      console.log('Google AI Overview scan results:', data)

      if (data.results && data.results.length > 0) {
        const overviewResults = data.results.map(r => ({
          prompt: r.query,
          mentioned: r.companyMentioned,
          hasAiOverview: r.hasAiOverview,
          snippet: r.aiOverviewText || '',
          competitors: r.competitorsMentioned || [],
          platform: 'google_overview'
        }))

        // Merge with existing results
        const existingNonOverview = existingAiResults.filter(r => r.platform !== 'google_overview')
        setExistingAiResults([...existingNonOverview, ...overviewResults])

        // Update selectedExistingWebsite
        if (selectedExistingWebsite) {
          const updatedWebsite = { ...selectedExistingWebsite }
          updatedWebsite.combinedResults = updatedWebsite.combinedResults || {
            perplexity: { mentioned: 0, total: 0, results: [] },
            chatgpt: { mentioned: 0, total: 0, results: [] },
            googleAi: { mentioned: 0, total: 0, results: [] },
            googleAiOverview: { mentioned: 0, total: 0, results: [] }
          }
          updatedWebsite.combinedResults.googleAiOverview = {
            mentioned: data.foundCount || 0,
            total: data.totalQueries || 0,
            results: overviewResults
          }
          setSelectedExistingWebsite(updatedWebsite)
        }

        alert(t('overviewScanComplete', { overviews: data.hasAiOverviewCount, total: data.totalQueries, found: data.foundCount, company: companyName }))
      }

    } catch (error) {
      console.error('Google AI Overview scan error:', error)
      alert(t('overviewScanError') + ': ' + error.message)
    } finally {
      setGoogleAiOverviewScanning(false)
    }
  }

  // ============================================
  // STEP 4: DRAG & DROP MATCHING
  // ============================================
  const handleDragStart = (e, prompt, sourceType) => {
    setDraggedItem({ prompt, sourceType })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnPage = (e, targetPage) => {
    e.preventDefault()
    if (!draggedItem) return
    
    const { prompt, sourceType } = draggedItem
    
    // Add to matches
    setMatches(prev => {
      const filtered = prev.filter(m => m.prompt !== prompt)
      return [...filtered, { prompt, page: targetPage }]
    })
    
    // Remove from unmatched
    if (sourceType === 'unmatched') {
      setUnmatchedPrompts(prev => prev.filter(p => p !== prompt))
    }
    
    setDraggedItem(null)
  }

  const handleDropOnUnmatched = (e) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.sourceType === 'unmatched') return
    
    const { prompt } = draggedItem
    
    // Remove from matches
    setMatches(prev => prev.filter(m => m.prompt !== prompt))
    
    // Add to unmatched
    setUnmatchedPrompts(prev => [...prev, prompt])
    
    setDraggedItem(null)
  }

  const removeMatch = (prompt) => {
    setMatches(prev => prev.filter(m => m.prompt !== prompt))
    setUnmatchedPrompts(prev => [...prev, prompt])
  }

  const removePage = (pageUrl) => {
    // Remove page from scPages
    setScPages(prev => prev.filter(p => p.page !== pageUrl))
    // Remove any matches for this page and return prompts to unmatched
    const matchesForPage = matches.filter(m => m.page === pageUrl)
    setMatches(prev => prev.filter(m => m.page !== pageUrl))
    setUnmatchedPrompts(prev => [...prev, ...matchesForPage.map(m => m.prompt)])
  }

  // Edit unmatched prompt
  const editUnmatchedPrompt = (index, currentText) => {
    setEditingPromptIndex(index)
    setEditingPromptText(currentText)
  }

  const saveEditedPrompt = (index) => {
    if (!editingPromptText.trim()) return
    setUnmatchedPrompts(prev => {
      const updated = [...prev]
      updated[index] = editingPromptText.trim()
      return updated
    })
    setEditingPromptIndex(null)
    setEditingPromptText('')
  }

  const cancelEditPrompt = () => {
    setEditingPromptIndex(null)
    setEditingPromptText('')
  }

  // Delete unmatched prompt
  const deleteUnmatchedPrompt = (index) => {
    setUnmatchedPrompts(prev => prev.filter((_, i) => i !== index))
  }

  // AI Auto-Match: Match prompts to pages based on keyword similarity
  const autoMatchPrompts = async () => {
    if (unmatchedPrompts.length === 0 || scPages.length === 0) return
    
    setAutoMatching(true)
    const newMatches = []
    const stillUnmatched = []
    const alreadyMatchedPrompts = new Set(matches.map(m => m.prompt)) // Track already matched
    
    for (const prompt of unmatchedPrompts) {
      // Skip if already matched
      if (alreadyMatchedPrompts.has(prompt)) {
        continue
      }
      
      // Extract keywords from prompt (remove common words)
      const stopWords = ['je', 'de', 'het', 'een', 'van', 'in', 'op', 'met', 'voor', 'die', 'dat', 'zijn', 'worden', 'heeft', 'kan', 'kun', 'wat', 'welke', 'hoe', 'waar', 'wie', 'beste', 'top', 'goed', 'goede']
      const promptWords = prompt.toLowerCase()
        .replace(/[?.,!]/g, '')
        .split(' ')
        .filter(word => word.length > 2 && !stopWords.includes(word))
      
      let bestMatch = null
      let bestScore = 0
      
      for (const pageObj of scPages) {
        const pagePath = pageObj.page.toLowerCase()
        let score = 0
        
        // Check how many prompt keywords appear in the page URL
        for (const word of promptWords) {
          if (pagePath.includes(word)) {
            score += 2 // Direct match in URL
          }
          // Also check partial matches (e.g., "ooglidcorrectie" contains "ooglid")
          const pathParts = pagePath.split(/[\/\-_]/).filter(p => p.length > 2)
          for (const part of pathParts) {
            if (part.includes(word) || word.includes(part)) {
              score += 1
            }
          }
        }
        
        if (score > bestScore) {
          bestScore = score
          bestMatch = pageObj.page
        }
      }
      
      // Only match if we have a reasonable confidence (score >= 2)
      if (bestMatch && bestScore >= 2) {
        newMatches.push({ prompt, page: bestMatch })
        alreadyMatchedPrompts.add(prompt) // Mark as matched
      } else {
        stillUnmatched.push(prompt)
      }
    }
    
    // Apply matches - filter out any that are already in existing matches
    const uniqueNewMatches = newMatches.filter(nm => 
      !matches.some(m => m.prompt === nm.prompt)
    )
    
    setMatches(prev => [...prev, ...uniqueNewMatches])
    setUnmatchedPrompts(stillUnmatched)
    setAutoMatching(false)
  }

  // Filter pages based on search
  const filteredPages = scPages.filter(pageObj => {
    if (!pageSearch) return true
    return pageObj.page.toLowerCase().includes(pageSearch.toLowerCase())
  })

  // ============================================
  // STEP 4: GEO CHECKLIST SCAN
  // ============================================
  const runGeoScan = async () => {
    const uniquePages = [...new Set(matches.map(m => m.page))]
    if (uniquePages.length === 0) return
    
    setGeoScanning(true)
    setGeoScanProgress(0)
    setCompletedChecks([])
    setCurrentPageIndex(1)
    setScanLog([])
    setScanPhase('loading')
    const results = {}
    
    for (let i = 0; i < uniquePages.length; i++) {
      const pageUrl = uniquePages[i]
      setCurrentScanPage(pageUrl)
      setCurrentPageIndex(i + 1)
      setCompletedChecks([])
      setScanPhase('loading')
      
      await new Promise(r => setTimeout(r, 600))
      setScanPhase('scanning')
      
      try {
        // Start the actual scan
        const scanPromise = fetch('/api/geo-scan-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: pageUrl, locale, companyName })
        })
        
        // Show random checklist items while scanning
        const shuffledItems = [...ALL_CHECKLIST_ITEMS].sort(() => Math.random() - 0.5)
        let itemIndex = 0
        
        const animationInterval = setInterval(() => {
          if (itemIndex < shuffledItems.length) {
            const item = shuffledItems[itemIndex]
            setCurrentCheckItem(item)
            setScanLog(prev => [...prev.slice(-12), { ...item, timestamp: Date.now(), status: Math.random() > 0.3 ? 'pass' : 'check' }])
            itemIndex++
          }
        }, 400)
        
        const response = await scanPromise
        clearInterval(animationInterval)
        
        setScanPhase('analyzing')
        setCurrentCheckItem(null)
        await new Promise(r => setTimeout(r, 400))
        
        if (response.ok) {
          const data = await response.json()
          results[pageUrl] = {
            checklist: data.checklist || {},
            score: data.score || 0,
            scores: data.scores || {},
            scoreLabel: data.scoreLabel || '',
            issues: data.issues || [],
            customAdvice: data.customAdvice || [],
            wordCount: data.wordCount || 0,
            scanned: true
          }
        } else {
          results[pageUrl] = { checklist: {}, score: 0, issues: [t('scanFailed')], scanned: false }
        }
      } catch (error) {
        results[pageUrl] = { checklist: {}, score: 0, issues: [error.message], scanned: false }
      }
      
      setGeoScanProgress(Math.round(((i + 1) / uniquePages.length) * 100))
      
      if (i < uniquePages.length - 1) {
        setScanPhase('complete')
        await new Promise(r => setTimeout(r, 800))
      }
    }
    
    setScanPhase('complete')
    setGeoResults(results)
    setGeoScanning(false)
    setCurrentScanPage(null)
    setCurrentCheckItem(null)
    
    calculateOverallScore(results)
    savePageScoresToDB(results)
  }

  const calculateOverallScore = (geoResults) => {
    // AI Visibility Score (from existing scan results)
    const mentionedCount = existingAiResults.filter(r => r.mentioned).length
    const aiVisibilityScore = existingAiResults.length > 0 
      ? Math.round((mentionedCount / existingAiResults.length) * 100)
      : 0
    
    // GEO Score (average of page scores)
    const pageScores = Object.values(geoResults).map(r => r.score)
    const geoScore = pageScores.length > 0 
      ? Math.round(pageScores.reduce((a, b) => a + b, 0) / pageScores.length)
      : 0
    
    // Overall = weighted average
    const overall = Math.round(aiVisibilityScore * 0.4 + geoScore * 0.6)
    
    setOverallScore({
      aiVisibility: aiVisibilityScore,
      geo: geoScore,
      overall
    })
  }

  // Save page scores to Supabase for persistence + dashboard
  const savePageScoresToDB = async (results) => {
    try {
      const entries = Object.entries(results).filter(([, r]) => r.scanned)
      console.log('[GEO Save] Saving', entries.length, 'pages for company:', companyName)
      for (const [pageUrl, result] of entries) {
        let domain = ''
        try { domain = new URL(pageUrl).hostname.replace(/^www\./, '') } catch {}
        const saveRes = await fetch('/api/geo-audit-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: pageUrl,
            domain,
            score: result.score || 0,
            mentioned: false,
            companyName: companyName || domain,
            data: {
              checklist: result.checklist || {},
              scores: result.scores || {},
              scoreLabel: result.scoreLabel || '',
              issues: result.issues || [],
              customAdvice: result.customAdvice || [],
              wordCount: result.wordCount || 0,
              score: result.score || 0,
              source: 'geo-analyse',
              matchedPrompt: matches.find(m => m.page === pageUrl)?.prompt || null,
            },
          }),
        })
        console.log(`[GEO Save] ${pageUrl} → status ${saveRes.status}`)
      }
      console.log(`✅ Saved ${entries.length} page results (with customAdvice) to geo_audit_results`)
    } catch (e) {
      console.error('Failed to save page scores:', e)
    }
  }

  // Load saved GEO results from Supabase
  const loadGeoResultsFromDB = async (company) => {
    try {
      const { data, error } = await supabase
        .from('geo_audit_results')
        .select('url, score, data')
        .eq('company_name', company)
        .not('data', 'is', null)
        .order('created_at', { ascending: false })
      
      if (error || !data || data.length === 0) return null
      
      // Only use geo-analyse results (not standalone audits)
      const geoAnalyseResults = data.filter(r => r.data?.source === 'geo-analyse')
      if (geoAnalyseResults.length === 0) return null

      // Deduplicate by URL (keep most recent)
      const seen = new Set()
      const unique = geoAnalyseResults.filter(r => {
        if (seen.has(r.url)) return false
        seen.add(r.url)
        return true
      })
      
      const restored = {}
      const restoredMatches = []
      for (const r of unique) {
        restored[r.url] = {
          checklist: r.data.checklist || {},
          score: r.data.score || r.score || 0,
          scores: r.data.scores || {},
          scoreLabel: r.data.scoreLabel || '',
          issues: r.data.issues || [],
          customAdvice: r.data.customAdvice || [],
          wordCount: r.data.wordCount || 0,
          scanned: true,
        }
        if (r.data.matchedPrompt) {
          restoredMatches.push({ prompt: r.data.matchedPrompt, page: r.url })
        }
      }
      return { geoResults: restored, matches: restoredMatches }
    } catch (e) {
      console.error('Failed to load GEO results:', e)
    }
    return null
  }

  // ============================================
  // CHECKLIST_TIPS: direct ID-to-tip mapping for every checklist item
  // Each failed check gets a specific, actionable recommendation
  // ============================================
  const CHECKLIST_TIPS = locale === 'nl' ? {
    owner_info: { tip: 'Vermeld duidelijk wie het bedrijf is: naam, KvK-nummer, oprichter. Plaats dit op de homepage en Over-ons pagina.', priority: 'high' },
    contact_visible: { tip: 'Plaats telefoon, e-mail en adres in de footer en op een aparte contactpagina. Voeg LocalBusiness schema toe met je NAP-gegevens.', priority: 'high' },
    about_page: { tip: 'Maak een Over-ons pagina met foto\'s en bio\'s van teamleden. Gebruik Person schema markup per auteur. Dit is cruciaal voor E-E-A-T.', priority: 'high' },
    business_registration: { tip: 'Vermeld je KvK-nummer, BTW-ID of branchecertificeringen. Link naar je Google Business profiel en brancheverenigingen.', priority: 'medium' },
    nap_consistent: { tip: 'Zorg dat bedrijfsnaam, adres en telefoonnummer (NAP) exact hetzelfde zijn op je website, Google Business, social media en directories.', priority: 'high' },
    mobile_friendly: { tip: 'Test je pagina op Google PageSpeed Insights. Zorg voor een mobiele score boven 80. Optimaliseer afbeeldingen (WebP) en minimaliseer JavaScript.', priority: 'high' },
    https: { tip: 'Installeer een SSL-certificaat en redirect alle HTTP naar HTTPS. AI-platformen geven voorkeur aan beveiligde websites.', priority: 'high' },
    no_index_issues: { tip: 'Controleer robots.txt: zorg dat GPTBot, PerplexityBot en Google-Extended NIET geblokkeerd worden. Check je sitemap.xml in Search Console.', priority: 'high' },
    core_web_vitals: { tip: 'Optimaliseer LCP (<2.5s), CLS (<0.1) en INP (<200ms). Gebruik lazy loading, cache headers en een CDN. Test via PageSpeed Insights.', priority: 'medium' },
    accessibility: { tip: 'Voeg alt-teksten toe aan alle afbeeldingen met beschrijvende tekst. Gebruik ARIA-labels voor navigatie en formulieren.', priority: 'medium' },
    clear_answers: { tip: 'Begin elke pagina met een directe definitie-zin: "[Dienst] is..." Beantwoord de kernvraag in de eerste alinea. AI citeert dit formaat het meest.', priority: 'high' },
    expert_content: { tip: 'Schrijf vanuit ervaring: "In onze 15 jaar als [specialisme]..." Noem specifieke projecten, aantallen en resultaten. Dit versterkt je E-E-A-T signaal.', priority: 'high' },
    eeat_principles: { tip: 'Toon Experience (eigen ervaringen), Expertise (certificeringen), Authority (media/awards) en Trust (reviews/KvK). Voeg auteursbio toe bij elk artikel.', priority: 'high' },
    content_updated: { tip: 'Werk je content bij met actuele data, nieuwe voorbeelden en de datum van vandaag. AI geeft voorkeur aan recent bijgewerkte pagina\'s. Voeg een "Laatst bijgewerkt" datum toe.', priority: 'medium' },
    faq_present: { tip: 'Voeg een FAQ-sectie toe met 5-8 veelgestelde vragen als H2 koppen. Geef directe antwoorden van 2-3 zinnen. Implementeer FAQPage schema in JSON-LD.', priority: 'high' },
    headings: { tip: 'Gebruik exact 1 H1 (paginatitel) en minimaal 3 H2 koppen. Formuleer H2\'s als vragen waar mogelijk: "Wat kost [dienst]?", "Hoe werkt [proces]?"', priority: 'high' },
    paragraph_structure: { tip: 'Houd alinea\'s kort (3-4 zinnen). Gebruik korte zinnen (max 20 woorden). Begin alinea\'s met de kernboodschap. AI citeert bondige tekst.', priority: 'medium' },
    visual_support: { tip: 'Voeg opsommingslijsten, tabellen en infographics toe. AI geeft voorkeur aan gestructureerde informatie boven lopende tekst.', priority: 'medium' },
    internal_links: { tip: 'Link naar minimaal 3-5 relevante andere pagina\'s op je site met beschrijvende ankertekst. Dit helpt AI de samenhang van je content te begrijpen.', priority: 'medium' },
    external_references: { tip: 'Link naar 2-3 betrouwbare externe bronnen (brancheorganisaties, onderzoeken, overheid). Dit verhoogt je betrouwbaarheid voor AI.', priority: 'low' },
    jsonld: { tip: 'Voeg JSON-LD toe met Organization (bedrijfsinfo + sameAs links naar LinkedIn, KvK, Google Maps), FAQPage (voor FAQ-sectie) en LocalBusiness (voor lokale diensten).', priority: 'high' },
    rich_snippets: { tip: 'Test je structured data op https://search.google.com/test/rich-results. Fix alle fouten en waarschuwingen. Voeg ontbrekende velden toe.', priority: 'medium' },
    image_alt: { tip: 'Geef elke afbeelding een beschrijvende alt-tekst met relevante zoekwoorden. Niet "afbeelding1.jpg" maar "gietvloer woonkamer Amsterdam - project".', priority: 'medium' },
    knowledge_panel: { tip: 'Claim je Google Knowledge Panel via Google Business. Voeg sameAs URLs toe in je Organization schema: Wikipedia, LinkedIn, KvK, Crunchbase.', priority: 'medium' },
    title_meta: { tip: 'Schrijf een SEO-titel van 50-60 tekens met je kernzoekwoord vooraan. Meta description 120-155 tekens met je USP en locatie. AI gebruikt dit als eerste samenvatting.', priority: 'high' },
    og_tags: { tip: 'Voeg og:title, og:description, og:image (1200x630px) en og:type toe. AI-platformen gebruiken Open Graph om je content te presenteren in antwoorden.', priority: 'medium' },
    canonical_tags: { tip: 'Zorg dat elke pagina een canonical tag heeft die naar zichzelf wijst. Dit voorkomt duplicate content problemen bij AI-indexering.', priority: 'low' },
    image_optimized: { tip: 'Converteer afbeeldingen naar WebP formaat. Gebruik lazy loading. Comprimeer tot <100KB waar mogelijk. Snellere pagina = beter voor AI-crawlers.', priority: 'medium' },
    qa_format: { tip: 'Herstructureer je content in vraag-antwoord formaat. Gebruik veelgestelde vragen als H2 koppen met directe antwoorden eronder. Dit is het #1 formaat dat AI citeert.', priority: 'high' },
    short_answers: { tip: 'Schrijf bovenaan elke pagina een "Quick Answer" van 1-2 zinnen: "[Bedrijf] is een [dienst] in [stad] gespecialiseerd in [specialisme]." AI pakt dit als eerste op.', priority: 'high' },
    longtail_keywords: { tip: 'Verwerk natuurlijke vragen in je content: "Wat kost een gietvloer per m2?", "Hoe lang duurt het leggen van parket?". Dit matcht hoe mensen AI bevragen.', priority: 'medium' },
    conversational_style: { tip: 'Schrijf alsof je een klant te woord staat. Gebruik "je/jouw" aanspreekvorm. Vermijd vakjargon tenzij je het uitlegt. AI geeft voorkeur aan toegankelijke taal.', priority: 'medium' },
    ai_structured_data: { tip: 'Voeg speakable schema toe voor voice search. Overweeg llms.txt in je root directory met instructies voor AI over je bedrijf en diensten.', priority: 'low' },
    context_links: { tip: 'Bouw een interne linkstructuur die gerelateerde pagina\'s verbindt. Gebruik beschrijvende ankertekst. Dit helpt AI de samenhang van je expertise te begrijpen.', priority: 'medium' },
    synonyms_entities: { tip: 'Gebruik synoniemen en gerelateerde termen. Niet alleen "SEO specialist" maar ook "zoekmachineoptimalisatie expert". AI begrijpt variatie beter.', priority: 'low' },
    local_info: { tip: 'Noem je stad, regio en servicegebied expliciet. Verwijs naar lokale herkenningspunten. Essentieel voor "in [stad]" zoekvragen aan AI-assistenten.', priority: 'medium' },
    // Scan-specific checks
    lcp_good: { tip: 'Je LCP (Largest Contentful Paint) is boven 2.5 seconden. Optimaliseer je grootste afbeelding, gebruik WebP en een CDN. Test via PageSpeed Insights.', priority: 'medium' },
    fid_good: { tip: 'Je First Input Delay is te hoog. Minimaliseer JavaScript, gebruik code splitting en verwijder ongebruikte scripts.', priority: 'medium' },
    cls_good: { tip: 'Je CLS (layout shift) is te hoog. Geef afbeeldingen width/height attributen en vermijd dynamisch ingevoegde content boven de vouw.', priority: 'medium' },
    inp_good: { tip: 'Je INP (Interaction to Next Paint) is te traag. Optimaliseer event handlers en vermijd zware JavaScript operaties bij klikken.', priority: 'low' },
    has_article_schema: { tip: 'Voeg Article of BlogPosting schema toe aan je content pagina\'s. Dit helpt AI-platformen je content als redactioneel artikel te herkennen.', priority: 'medium' },
    has_org_schema: { tip: 'Voeg Organization schema toe met naam, logo, contactinfo en sameAs links naar LinkedIn, KvK en Google Maps.', priority: 'high' },
    has_local_schema: { tip: 'Voeg LocalBusiness schema toe met je adres, openingstijden, telefoon en servicegebied. Essentieel voor lokale AI-zichtbaarheid.', priority: 'high' },
    has_faq_schema: { tip: 'Voeg FAQPage schema toe aan je FAQ-sectie. AI-platformen citeren FAQ\'s direct in hun antwoorden.', priority: 'high' },
    has_product_schema: { tip: 'Voeg Product schema toe met prijs, beschikbaarheid en reviews. Dit maakt je producten zichtbaar in AI-shopping antwoorden.', priority: 'medium' },
    og_image: { tip: 'Voeg een og:image toe van 1200x630px. AI-platformen gebruiken deze afbeelding bij het presenteren van je content.', priority: 'medium' },
    og_title: { tip: 'Voeg een og:title tag toe. Dit bepaalt hoe je pagina wordt weergegeven wanneer AI je content presenteert.', priority: 'medium' },
    og_description: { tip: 'Voeg een og:description tag toe met een pakkende samenvatting van je pagina.', priority: 'medium' },
    meta_desc_length: { tip: 'Schrijf een meta description van 120-155 tekens met je kernactiviteit en locatie. AI gebruikt dit als eerste samenvatting.', priority: 'high' },
    title_length: { tip: 'Schrijf een SEO-titel van 50-60 tekens met je kernzoekwoord vooraan.', priority: 'high' },
    has_h1: { tip: 'Voeg een H1 heading toe die de kernvraag van de pagina beantwoordt. Gebruik exact 1 H1 per pagina.', priority: 'high' },
    word_count_ok: { tip: 'Schrijf minimaal 800 woorden met concrete informatie, cijfers en voorbeelden. Meer content = meer context voor AI.', priority: 'high' },
    has_internal_links: { tip: 'Link naar minimaal 3-5 relevante andere pagina\'s op je site met beschrijvende ankertekst.', priority: 'medium' },
    has_external_links: { tip: 'Link naar 2-3 betrouwbare externe bronnen (brancheorganisaties, onderzoeken). Dit verhoogt je E-E-A-T score.', priority: 'low' },
    has_images_with_alt: { tip: 'Geef elke afbeelding een beschrijvende alt-tekst met relevante zoekwoorden.', priority: 'medium' },
    has_lists: { tip: 'Voeg opsommingslijsten en tabellen toe. AI geeft voorkeur aan gestructureerde informatie.', priority: 'medium' },
    has_definition: { tip: 'Begin je pagina met een Quick Answer van 1-2 zinnen: "[Dienst] is..." AI pakt dit als eerste op.', priority: 'high' },
    brand_mentioned: { tip: 'Gebruik je bedrijfsnaam minimaal 3x in de content. AI moet je naam kennen om je te citeren.', priority: 'high' },
    has_contact_info: { tip: 'Plaats telefoon, e-mail en adres zichtbaar op de pagina. Essentieel voor lokale AI-zichtbaarheid.', priority: 'high' },
    has_author: { tip: 'Voeg een auteursblok toe met naam, foto en bio. Gebruik Person schema. Cruciaal voor E-E-A-T.', priority: 'medium' },
    meta_exists: { tip: 'Je pagina heeft geen meta description. Schrijf er een van 120-155 tekens met je kernactiviteit. AI gebruikt dit als eerste samenvatting.', priority: 'high' },
    meta_optimal: { tip: 'Je meta description is niet optimaal (te kort of te lang). Schrijf 120-155 tekens met je USP en zoekwoord.', priority: 'high' },
    has_h2s: { tip: 'Je pagina mist H2 subkoppen. Voeg minimaal 3 H2\'s toe, bij voorkeur als vragen: "Wat kost [dienst]?", "Hoe werkt [proces]?"', priority: 'high' },
    all_images_have_alt: { tip: 'Niet alle afbeeldingen hebben een alt-tekst. Voeg beschrijvende alt-teksten toe met relevante zoekwoorden bij elke afbeelding.', priority: 'medium' },
    has_canonical: { tip: 'Voeg een canonical tag toe die naar de huidige URL wijst. Dit voorkomt duplicate content bij AI-indexering.', priority: 'low' },
    is_https: { tip: 'Je pagina draait niet op HTTPS. Installeer een SSL-certificaat. AI-platformen geven voorkeur aan beveiligde websites.', priority: 'high' },
    has_viewport: { tip: 'Voeg een viewport meta tag toe voor mobiele weergave. AI-platformen geven voorkeur aan mobiel-vriendelijke sites.', priority: 'high' },
    has_lang: { tip: 'Voeg een lang="nl" attribuut toe aan je <html> tag. Dit helpt AI de taal van je content correct te herkennen.', priority: 'medium' },
    has_hreflang: { tip: 'Voeg hreflang tags toe als je meerdere taalversies hebt. Dit helpt AI de juiste taalversie te tonen.', priority: 'low' },
  } : {
    owner_info: { tip: 'Clearly state who owns the business: name, registration number, founder. Place this on the homepage and About page.', priority: 'high' },
    contact_visible: { tip: 'Place phone, email and address in the footer and on a dedicated contact page. Add LocalBusiness schema with your NAP details.', priority: 'high' },
    about_page: { tip: 'Create an About page with photos and bios of team members. Use Person schema markup per author. Crucial for E-E-A-T.', priority: 'high' },
    business_registration: { tip: 'Mention your registration number, VAT ID or industry certifications. Link to your Google Business profile.', priority: 'medium' },
    nap_consistent: { tip: 'Ensure business name, address and phone (NAP) are exactly the same across your website, Google Business, social media and directories.', priority: 'high' },
    mobile_friendly: { tip: 'Test on Google PageSpeed Insights. Aim for mobile score above 80. Optimize images (WebP) and minimize JavaScript.', priority: 'high' },
    https: { tip: 'Install an SSL certificate and redirect all HTTP to HTTPS. AI platforms prefer secure websites.', priority: 'high' },
    no_index_issues: { tip: 'Check robots.txt: ensure GPTBot, PerplexityBot and Google-Extended are NOT blocked. Verify sitemap.xml in Search Console.', priority: 'high' },
    core_web_vitals: { tip: 'Optimize LCP (<2.5s), CLS (<0.1) and INP (<200ms). Use lazy loading, cache headers and a CDN.', priority: 'medium' },
    accessibility: { tip: 'Add alt texts to all images with descriptive text. Use ARIA labels for navigation and forms.', priority: 'medium' },
    clear_answers: { tip: 'Start each page with a direct definition: "[Service] is..." Answer the core question in the first paragraph. AI cites this format most.', priority: 'high' },
    expert_content: { tip: 'Write from experience: "In our 15 years as [specialty]..." Mention specific projects, numbers and results.', priority: 'high' },
    eeat_principles: { tip: 'Show Experience, Expertise, Authority and Trust. Add author bio to each article. Include certifications and awards.', priority: 'high' },
    content_updated: { tip: 'Update content with current data, new examples and today\'s date. AI prefers recently updated pages. Add a "Last updated" date.', priority: 'medium' },
    faq_present: { tip: 'Add a FAQ section with 5-8 questions as H2 headings. Give direct 2-3 sentence answers. Implement FAQPage schema in JSON-LD.', priority: 'high' },
    headings: { tip: 'Use exactly 1 H1 and at least 3 H2 headings. Phrase H2s as questions: "What does [service] cost?", "How does [process] work?"', priority: 'high' },
    paragraph_structure: { tip: 'Keep paragraphs short (3-4 sentences, max 20 words each). Start with the key message. AI cites concise text.', priority: 'medium' },
    visual_support: { tip: 'Add bullet lists, tables and infographics. AI prefers structured information over running text.', priority: 'medium' },
    internal_links: { tip: 'Link to at least 3-5 relevant pages on your site with descriptive anchor text.', priority: 'medium' },
    external_references: { tip: 'Link to 2-3 reliable external sources (industry organizations, research, government).', priority: 'low' },
    jsonld: { tip: 'Add JSON-LD with Organization (+ sameAs links), FAQPage and LocalBusiness schema.', priority: 'high' },
    rich_snippets: { tip: 'Test structured data at https://search.google.com/test/rich-results. Fix all errors.', priority: 'medium' },
    image_alt: { tip: 'Give every image a descriptive alt text with relevant keywords.', priority: 'medium' },
    knowledge_panel: { tip: 'Claim your Google Knowledge Panel. Add sameAs URLs in Organization schema.', priority: 'medium' },
    title_meta: { tip: 'Write SEO title 50-60 chars with core keyword first. Meta description 120-155 chars with USP and location.', priority: 'high' },
    og_tags: { tip: 'Add og:title, og:description, og:image (1200x630px). AI platforms use Open Graph to present your content.', priority: 'medium' },
    canonical_tags: { tip: 'Ensure every page has a canonical tag pointing to itself.', priority: 'low' },
    image_optimized: { tip: 'Convert images to WebP. Use lazy loading. Compress to <100KB. Faster page = better for AI crawlers.', priority: 'medium' },
    qa_format: { tip: 'Restructure content in Q&A format. Use FAQs as H2 headings with direct answers. #1 format AI cites.', priority: 'high' },
    short_answers: { tip: 'Write a 1-2 sentence "Quick Answer" at the top: "[Company] is a [service] in [city] specialized in [specialty]."', priority: 'high' },
    longtail_keywords: { tip: 'Include natural questions: "How much does [service] cost?", "How long does [process] take?"', priority: 'medium' },
    conversational_style: { tip: 'Write as if talking to a customer. Use "you/your". Avoid jargon unless explained. AI prefers accessible language.', priority: 'medium' },
    ai_structured_data: { tip: 'Add speakable schema for voice search. Consider llms.txt with AI instructions about your business.', priority: 'low' },
    context_links: { tip: 'Build internal link structure connecting related pages with descriptive anchor text.', priority: 'medium' },
    synonyms_entities: { tip: 'Use synonyms and related terms. Not just "SEO specialist" but also "search engine optimization expert".', priority: 'low' },
    local_info: { tip: 'Mention city, region and service area explicitly. Reference local landmarks.', priority: 'medium' },
    // Scan-specific checks
    lcp_good: { tip: 'Your LCP is above 2.5 seconds. Optimize your largest image, use WebP and a CDN. Test via PageSpeed Insights.', priority: 'medium' },
    fid_good: { tip: 'Your First Input Delay is too high. Minimize JavaScript, use code splitting and remove unused scripts.', priority: 'medium' },
    cls_good: { tip: 'Your CLS (layout shift) is too high. Give images width/height attributes and avoid dynamically inserted content above the fold.', priority: 'medium' },
    inp_good: { tip: 'Your INP is too slow. Optimize event handlers and avoid heavy JavaScript operations on click.', priority: 'low' },
    has_article_schema: { tip: 'Add Article or BlogPosting schema to your content pages. This helps AI platforms recognize your content.', priority: 'medium' },
    has_org_schema: { tip: 'Add Organization schema with name, logo, contact info and sameAs links to LinkedIn and Google Maps.', priority: 'high' },
    has_local_schema: { tip: 'Add LocalBusiness schema with address, opening hours, phone and service area.', priority: 'high' },
    has_faq_schema: { tip: 'Add FAQPage schema to your FAQ section. AI platforms directly cite FAQs in their answers.', priority: 'high' },
    has_product_schema: { tip: 'Add Product schema with price, availability and reviews.', priority: 'medium' },
    og_image: { tip: 'Add an og:image of 1200x630px. AI platforms use this image when presenting your content.', priority: 'medium' },
    og_title: { tip: 'Add an og:title tag. This determines how your page appears when AI presents your content.', priority: 'medium' },
    og_description: { tip: 'Add an og:description tag with a compelling summary of your page.', priority: 'medium' },
    meta_desc_length: { tip: 'Write a meta description of 120-155 characters with your core activity and location.', priority: 'high' },
    title_length: { tip: 'Write an SEO title of 50-60 characters with your core keyword first.', priority: 'high' },
    has_h1: { tip: 'Add an H1 heading that answers the core question of the page. Use exactly 1 H1.', priority: 'high' },
    word_count_ok: { tip: 'Write at least 800 words with concrete information, numbers and examples.', priority: 'high' },
    has_internal_links: { tip: 'Link to at least 3-5 relevant pages on your site with descriptive anchor text.', priority: 'medium' },
    has_external_links: { tip: 'Link to 2-3 reliable external sources. This increases your E-E-A-T score.', priority: 'low' },
    has_images_with_alt: { tip: 'Give every image a descriptive alt text with relevant keywords.', priority: 'medium' },
    has_lists: { tip: 'Add bullet lists and tables. AI prefers structured information.', priority: 'medium' },
    has_definition: { tip: 'Start your page with a Quick Answer of 1-2 sentences. AI picks this up first.', priority: 'high' },
    brand_mentioned: { tip: 'Use your business name at least 3x in the content. AI needs to know your name to cite you.', priority: 'high' },
    has_contact_info: { tip: 'Place phone, email and address visibly on the page. Essential for local AI visibility.', priority: 'high' },
    has_author: { tip: 'Add an author box with name, photo and bio. Use Person schema. Crucial for E-E-A-T.', priority: 'medium' },
    meta_exists: { tip: 'Your page has no meta description. Write one of 120-155 characters with your core activity. AI uses this as primary summary.', priority: 'high' },
    meta_optimal: { tip: 'Your meta description is not optimal (too short or too long). Write 120-155 characters with your USP and keyword.', priority: 'high' },
    has_h2s: { tip: 'Your page is missing H2 subheadings. Add at least 3 H2s, preferably as questions: "What does [service] cost?", "How does [process] work?"', priority: 'high' },
    all_images_have_alt: { tip: 'Not all images have alt text. Add descriptive alt texts with relevant keywords to every image.', priority: 'medium' },
    has_canonical: { tip: 'Add a canonical tag pointing to the current URL. This prevents duplicate content issues with AI indexing.', priority: 'low' },
    is_https: { tip: 'Your page is not on HTTPS. Install an SSL certificate. AI platforms prefer secure websites.', priority: 'high' },
    has_viewport: { tip: 'Add a viewport meta tag for mobile rendering. AI platforms prefer mobile-friendly sites.', priority: 'high' },
    has_lang: { tip: 'Add a lang attribute to your <html> tag. This helps AI correctly identify your content language.', priority: 'medium' },
    has_hreflang: { tip: 'Add hreflang tags if you have multiple language versions. This helps AI show the correct version.', priority: 'low' },
  }

  // ============================================
  // STEP 4: GENERATE REPORT
  // ============================================
  const generateReport = async () => {
    setGenerating(true)
    
    try {
      const response = await fetch('/api/geo-generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyWebsite,
          companyCategory,
          matches,
          scanResults: geoResults,
          aiResults: existingAiResults,
          overallScore,
          manualChecks,
          locale,
          combinedResults: selectedExistingWebsite?.combinedResults || null
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `GEO-${locale === 'en' ? 'Report' : 'Rapport'}-${companyName.replace(/\s+/g, '-')}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      alert(t('error') + ': ' + error.message)
    }
    
    setGenerating(false)
  }

  // ============================================
  // HELPERS
  // ============================================
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 60) return 'from-yellow-500 to-amber-500'
    if (score >= 40) return 'from-orange-500 to-red-400'
    return 'from-red-500 to-red-600'
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // ============================================
  // STEP INDICATORS
  // ============================================
  const steps = [
    { num: 1, label: t('step1'), icon: Building2 },
    { num: 2, label: t('step2'), icon: FileSpreadsheet },
    { num: 3, label: t('step3'), icon: Link2 },
    { num: 4, label: locale === 'nl' ? 'Scan & Werklijst' : 'Scan & Worklist', icon: Target },
  ]

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  GEO Analyse
                  <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs rounded-full font-medium">BETA</span>
                </h1>
                <p className="text-sm text-slate-500">{t('subtitle')}</p>
              </div>
            </div>
            <div className="hidden lg:block">
              <Image src="/images/teun-ai-mascotte.png" alt="Teun" width={80} height={80} className="opacity-90" />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* CLIENT READ-ONLY VIEW */}
      {/* ============================================ */}
      {clientAccess.isClient && !clientAccess.loading && selectedExistingWebsite ? (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <ClientBanner shares={clientAccess.shares} sharedCompanies={clientAccess.sharedCompanies} />
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('titleFor', { name: companyName })}</h2>
                <p className="text-slate-500 text-sm">{companyWebsite} {companyCategory ? `• ${companyCategory}` : ''}</p>
              </div>
            </div>

            {/* Website selector if multiple shared projects */}
            {existingWebsites.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {existingWebsites.map((website, i) => (
                  <button
                    key={i}
                    onClick={() => selectExistingWebsite(website)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                      selectedExistingWebsite?.name === website.name
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {website.name}
                  </button>
                ))}
              </div>
            )}

            {/* Score Cards */}
            {(() => {
              const cr = selectedExistingWebsite.combinedResults || {}
              const totalMentioned = (cr.perplexity?.mentioned || 0) + (cr.chatgpt?.mentioned || 0) + (cr.googleAi?.mentioned || 0) + (cr.googleAiOverview?.mentioned || 0)
              const totalScanned = (cr.perplexity?.total || 0) + (cr.chatgpt?.total || 0) + (cr.googleAi?.total || 0) + (cr.googleAiOverview?.total || 0)
              const aiVisibilityScore = totalScanned > 0 ? Math.round((totalMentioned / totalScanned) * 100) : 0
              
              return (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center gap-2 mb-3 opacity-90">
                      <Eye className="w-5 h-5" />
                      <span className="text-sm font-medium">{t('aiVisibilityScore')}</span>
                    </div>
                    <div className="text-5xl font-black mb-1">{aiVisibilityScore}%</div>
                    <p className="text-violet-200 text-sm">{t('mentionsAcrossPlatforms', { mentioned: totalMentioned, total: totalScanned })}</p>
                  </div>
                  <div className={`bg-gradient-to-br ${
                    aiVisibilityScore >= 70 ? 'from-emerald-500 to-green-600' :
                    aiVisibilityScore >= 40 ? 'from-amber-500 to-orange-600' :
                    'from-red-500 to-rose-600'
                  } rounded-2xl p-6 text-white shadow-xl`}>
                    <div className="flex items-center gap-2 mb-3 opacity-90">
                      <BarChart3 className="w-5 h-5" />
                      <span className="text-sm font-medium">{t('platformsScanned')}</span>
                    </div>
                    <div className="text-5xl font-black mb-1">{[cr.perplexity, cr.chatgpt, cr.googleAi, cr.googleAiOverview].filter(p => p?.total > 0).length}</div>
                    <p className="text-white/80 text-sm">{t('of4Platforms')}</p>
                  </div>
                </div>
              )
            })()}

            {/* Platform Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'perplexity', label: 'Perplexity', color: 'purple' },
                { key: 'chatgpt', label: 'ChatGPT', color: 'green' },
                { key: 'googleAi', label: 'AI Modus', color: 'blue' },
                { key: 'googleAiOverview', label: 'AI Overviews', color: 'emerald' },
              ].map(platform => {
                const data = selectedExistingWebsite.combinedResults?.[platform.key]
                return (
                  <div key={platform.key} className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-bold ${data?.total > 0 ? `text-${platform.color}-600` : 'text-slate-300'}`}>
                      {data?.total > 0 ? `${data.mentioned}/${data.total}` : '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{platform.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Per-Platform Expandable Results */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                {t('resultsByPlatform')}
              </h3>

              {/* Perplexity Results */}
              {selectedExistingWebsite.combinedResults?.perplexity?.total > 0 && (
                <div className="border border-purple-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedPlatform(expandedPlatform === 'perplexity' ? null : 'perplexity')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-purple-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      Perplexity
                      <span className="text-purple-600 font-bold">
                        ({selectedExistingWebsite.combinedResults.perplexity.mentioned}/{selectedExistingWebsite.combinedResults.perplexity.total})
                      </span>
                    </span>
                    {expandedPlatform === 'perplexity' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
                  </button>
                  {expandedPlatform === 'perplexity' && (
                    <div className="divide-y divide-purple-100">
                      {selectedExistingWebsite.combinedResults.perplexity.results?.map((result, idx) => (
                        <div key={idx} className="bg-white">
                          <button
                            onClick={() => setExpandedPromptIndex(expandedPromptIndex === `p-${idx}` ? null : `p-${idx}`)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                          >
                            <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                              result.mentioned ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {result.mentioned ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-sm font-medium">✗</span>}
                            </span>
                            <span className="flex-1 text-sm text-slate-800">{result.prompt}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPromptIndex === `p-${idx}` ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedPromptIndex === `p-${idx}` && (
                            <div className={`px-4 pb-4 pt-2 border-t ml-9 ${result.mentioned ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                              {result.snippet && (
                                <div className="mb-3">
                                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{t('perplexityResponse')}</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{result.snippet}</p>
                                </div>
                              )}
                              {result.competitors && result.competitors.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2">{t('competitors')}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.competitors.map((comp, ci) => (
                                      <span key={ci} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded border border-amber-200 text-xs font-medium">{comp}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!result.snippet && (!result.competitors || result.competitors.length === 0) && (
                                <p className="text-xs text-slate-400 italic">{t('noResponsePreview')}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ChatGPT Results */}
              {selectedExistingWebsite.combinedResults?.chatgpt?.total > 0 && (
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedPlatform(expandedPlatform === 'chatgpt' ? null : 'chatgpt')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-green-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                      ChatGPT
                      <span className="text-green-600 font-bold">
                        ({selectedExistingWebsite.combinedResults.chatgpt.mentioned}/{selectedExistingWebsite.combinedResults.chatgpt.total})
                      </span>
                    </span>
                    {expandedPlatform === 'chatgpt' ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
                  </button>
                  {expandedPlatform === 'chatgpt' && (
                    <div className="divide-y divide-green-100">
                      {selectedExistingWebsite.combinedResults.chatgpt.results?.map((result, idx) => (
                        <div key={idx} className="bg-white">
                          <button
                            onClick={() => setExpandedPromptIndex(expandedPromptIndex === `cc-${idx}` ? null : `cc-${idx}`)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                          >
                            <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                              result.mentioned ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {result.mentioned ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </span>
                            <span className="flex-1 text-sm text-slate-800">{result.prompt}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPromptIndex === `cc-${idx}` ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedPromptIndex === `cc-${idx}` && result.snippet && (
                            <div className="px-4 pb-4 pt-2 bg-green-50 border-t border-green-100 ml-9">
                              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{t('chatgptResponse')}</p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">{result.snippet}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Google AI Modus Results */}
              {selectedExistingWebsite.combinedResults?.googleAi?.total > 0 && (
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedPlatform(expandedPlatform === 'googleAi' ? null : 'googleAi')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-blue-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      Google AI Modus
                      <span className="text-blue-600 font-bold">
                        ({selectedExistingWebsite.combinedResults.googleAi.mentioned}/{selectedExistingWebsite.combinedResults.googleAi.total})
                      </span>
                    </span>
                    {expandedPlatform === 'googleAi' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                  </button>
                  {expandedPlatform === 'googleAi' && (
                    <div className="divide-y divide-blue-100">
                      {selectedExistingWebsite.combinedResults.googleAi.results?.map((result, idx) => (
                        <div key={idx} className="bg-white">
                          <button
                            onClick={() => setExpandedPromptIndex(expandedPromptIndex === `gm-${idx}` ? null : `gm-${idx}`)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                          >
                            <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                              result.mentioned ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {result.mentioned ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-sm font-medium">✗</span>}
                            </span>
                            <span className="flex-1 text-sm text-slate-800">{result.prompt}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPromptIndex === `gm-${idx}` ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedPromptIndex === `gm-${idx}` && (
                            <div className={`px-4 pb-4 pt-2 border-t ml-9 ${result.mentioned ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                              {result.snippet && (
                                <div className="mb-3">
                                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{t('aiModeResponse')}</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{result.snippet}</p>
                                </div>
                              )}
                              {result.competitors && result.competitors.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2">{t('competitors')}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.competitors.map((comp, ci) => (
                                      <span key={ci} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded border border-amber-200 text-xs font-medium">{comp}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Google AI Overviews Results */}
              {selectedExistingWebsite.combinedResults?.googleAiOverview?.total > 0 && (
                <div className="border border-emerald-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedPlatform(expandedPlatform === 'googleAiOverview' ? null : 'googleAiOverview')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Google AI Overviews
                      <span className="text-emerald-600 font-bold">
                        ({selectedExistingWebsite.combinedResults.googleAiOverview.mentioned}/{selectedExistingWebsite.combinedResults.googleAiOverview.total})
                      </span>
                    </span>
                    {expandedPlatform === 'googleAiOverview' ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
                  </button>
                  {expandedPlatform === 'googleAiOverview' && (
                    <div className="divide-y divide-emerald-100">
                      {selectedExistingWebsite.combinedResults.googleAiOverview.results?.map((result, idx) => (
                        <div key={idx} className="bg-white">
                          <button
                            onClick={() => setExpandedPromptIndex(expandedPromptIndex === `ovc-${idx}` ? null : `ovc-${idx}`)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                          >
                            <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                              result.mentioned ? 'bg-green-100 text-green-600' : result.hasAiOverview ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {result.mentioned ? <CheckCircle2 className="w-4 h-4" /> : result.hasAiOverview ? <span className="text-sm font-medium">!</span> : <span className="text-sm font-medium">—</span>}
                            </span>
                            <div className="flex-1">
                              <span className="text-sm text-slate-800">{result.prompt}</span>
                              {!result.hasAiOverview && <span className="ml-2 text-xs text-slate-400 italic">{t('noAiOverview')}</span>}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPromptIndex === `ovc-${idx}` ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedPromptIndex === `ovc-${idx}` && (
                            <div className="px-4 pb-4 pt-2 bg-emerald-50 border-t border-emerald-100 ml-9">
                              {result.snippet && (
                                <div className="mb-3">
                                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">AI Overview</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{result.snippet}</p>
                                </div>
                              )}
                              {result.competitors && result.competitors.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2">{t('sourcesConcurrents')}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {result.competitors.map((comp, ci) => (
                                      <span key={ci} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded border border-amber-200 text-xs font-medium">{comp}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* No platforms scanned yet */}
              {(() => {
                const cr = selectedExistingWebsite.combinedResults || {}
                const totalScanned = (cr.perplexity?.total || 0) + (cr.chatgpt?.total || 0) + (cr.googleAi?.total || 0) + (cr.googleAiOverview?.total || 0)
                if (totalScanned === 0) return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-amber-800 text-sm">{t('noResultsContactManager')}</p>
                  </div>
                )
                return null
              })()}
            </div>

            {/* All Prompts Overview */}
            {existingPrompts.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                    {t('allCommercialPrompts', { count: existingPrompts.length })}
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {existingPrompts.map((prompt, idx) => {
                    // Check across all platforms if this prompt is mentioned
                    const cr = selectedExistingWebsite.combinedResults || {}
                    const allResults = [
                      ...(cr.perplexity?.results || []),
                      ...(cr.chatgpt?.results || []),
                      ...(cr.googleAi?.results || []),
                      ...(cr.googleAiOverview?.results || [])
                    ]
                    const matchingResults = allResults.filter(r => r.prompt === prompt)
                    const isMentionedAnywhere = matchingResults.some(r => r.mentioned)
                    const platformCount = matchingResults.length
                    
                    return (
                      <div key={idx} className="flex items-center gap-3 px-4 py-3">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          isMentionedAnywhere ? 'bg-green-100 text-green-600' : platformCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isMentionedAnywhere ? <CheckCircle2 className="w-4 h-4" /> : platformCount > 0 ? <span className="text-sm font-medium">✗</span> : <span className="text-sm">—</span>}
                        </span>
                        <span className="flex-1 text-sm text-slate-700">{prompt}</span>
                        {platformCount > 0 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isMentionedAnywhere ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {matchingResults.filter(r => r.mentioned).length}/{platformCount} platforms
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Download Report */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">{t('downloadFullReport')}</h3>
                  <p className="text-indigo-200 text-sm">{t('downloadReportDesc')}</p>
                </div>
                <button
                  onClick={generateReport}
                  disabled={generating}
                  className="flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 disabled:opacity-50 transition shadow-lg cursor-pointer whitespace-nowrap"
                >
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {generating ? t('generating') : t('downloadPdf')}
                </button>
              </div>
            </div>

            {/* Back to Dashboard */}
            <div className="flex justify-end pt-2">
              <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 cursor-pointer">
                {t('backToDashboard')}
              </button>
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => s.num <= step && setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                    step === s.num ? 'bg-blue-100 text-blue-700' 
                      : step > s.num ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' 
                      : 'bg-slate-100 text-slate-400'
                  }`}
                  disabled={s.num > step}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === s.num ? 'bg-blue-600 text-white' 
                      : step > s.num ? 'bg-green-600 text-white' 
                      : 'bg-slate-300 text-white'
                  }`}>
                    {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${step > s.num ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Client Access Banner */}
        {clientAccess.isClient && (
          <ClientBanner shares={clientAccess.shares} sharedCompanies={clientAccess.sharedCompanies} />
        )}
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          
          {/* ============================================ */}
          {/* STEP 1: BEDRIJFSINFO */}
          {/* ============================================ */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t('companyInfo')}</h2>
                  <p className="text-slate-500 text-sm">{t('selectCompanyWithPrompts')}</p>
                </div>
              </div>
              
              {/* Existing Websites List */}
              {existingWebsites.length > 0 ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t("chooseFromDashboard")}</label>
                  <div className="grid gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2">
                    {existingWebsites.map((website, i) => (
                      <button
                        key={i}
                        onClick={() => selectExistingWebsite(website)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition text-left cursor-pointer ${
                          selectedExistingWebsite?.name === website.name
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-slate-800">{website.name}</p>
                          <p className="text-xs text-slate-500">{website.prompts?.length || 0} prompts</p>
                        </div>
                        {selectedExistingWebsite?.name === website.name && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800">
                    {t('noCompaniesFound')}
                  </p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 cursor-pointer"
                  >
                    {t('toDashboard')}
                  </button>
                </div>
              )}
              
              {/* Show loaded prompts */}
              {existingPrompts.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-green-800 font-medium">{t('promptsLoaded', { count: existingPrompts.length })}</p>
                    <button
                      onClick={() => {
                        console.log('Bewerken clicked, website:', selectedExistingWebsite)
                        // Go to website detail page if we have an ID
                        if (selectedExistingWebsite?.id) {
                          router.push(`/dashboard/website/${selectedExistingWebsite.id}`)
                        } else {
                          // Fallback: go to dashboard with search param
                          const name = selectedExistingWebsite?.name || companyName
                          router.push(`/dashboard?search=${encodeURIComponent(name)}`)
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-100 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t('edit')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {existingPrompts.slice(0, 5).map((prompt, i) => (
                      <span key={i} className="px-2 py-1 bg-white rounded text-xs text-slate-600 border border-green-200">
                        {prompt.substring(0, 40)}...
                      </span>
                    ))}
                    {existingPrompts.length > 5 && (
                      <span className="px-2 py-1 bg-green-100 rounded text-xs text-green-700">{t('morePrompts', { count: existingPrompts.length - 5 })}</span>
                    )}
                  </div>
                  
                  {/* AI scan status - combined from all platforms */}
                  {selectedExistingWebsite?.combinedResults ? (
                    <div className="mt-3 space-y-2">
                      {/* Calculate totals including all platforms */}
                      {(() => {
                        const cr = selectedExistingWebsite.combinedResults
                        const perplexityMentioned = cr.perplexity?.mentioned || 0
                        const perplexityTotal = cr.perplexity?.total || 0
                        const chatgptMentioned = cr.chatgpt?.mentioned || 0
                        const chatgptTotal = cr.chatgpt?.total || 0
                        const googleMentioned = cr.googleAi?.mentioned || 0
                        const googleTotal = cr.googleAi?.total || 0
                        const overviewMentioned = cr.googleAiOverview?.mentioned || 0
                        const overviewTotal = cr.googleAiOverview?.total || 0
                        const totalMentioned = perplexityMentioned + chatgptMentioned + googleMentioned + overviewMentioned
                        const totalScanned = perplexityTotal + chatgptTotal + googleTotal + overviewTotal
                        
                        return (
                          <>
                            {totalScanned > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <Eye className="w-4 h-4 text-violet-500" />
                                <span className="text-violet-700 font-medium">
                                  {t('aiVisibilityLabel', { mentioned: totalMentioned, total: totalScanned })}
                                </span>
                              </div>
                            )}
                          </>
                        )
                      })()}
                      {/* Platform breakdown - always show all 3 platforms */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {/* Perplexity */}
                        {selectedExistingWebsite.combinedResults?.perplexity?.total > 0 ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            Perplexity: {selectedExistingWebsite.combinedResults.perplexity.mentioned}/{selectedExistingWebsite.combinedResults.perplexity.total}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded">
                            Perplexity: -
                          </span>
                        )}
                        {/* ChatGPT */}
                        {selectedExistingWebsite.combinedResults?.chatgpt?.total > 0 ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                            ChatGPT: {selectedExistingWebsite.combinedResults.chatgpt.mentioned}/{selectedExistingWebsite.combinedResults.chatgpt.total}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded">
                            ChatGPT: -
                          </span>
                        )}
                        {/* Google AI */}
                        {selectedExistingWebsite.combinedResults?.googleAi?.total > 0 ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            AI Modus: {selectedExistingWebsite.combinedResults.googleAi.mentioned}/{selectedExistingWebsite.combinedResults.googleAi.total}
                          </span>
                        ) : (
                          <button
                            onClick={runGoogleAiModeScan}
                            disabled={googleAiScanning || existingPrompts.length === 0}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          >
                            {googleAiScanning ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t('scanning')}
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                Scan AI Modus
                              </>
                            )}
                          </button>
                        )}
                        {/* Google AI Overviews */}
                        {selectedExistingWebsite.combinedResults?.googleAiOverview?.total > 0 ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                            AI Overviews: {selectedExistingWebsite.combinedResults.googleAiOverview.mentioned}/{selectedExistingWebsite.combinedResults.googleAiOverview.total}
                          </span>
                        ) : (
                          <button
                            onClick={runGoogleAiOverviewScan}
                            disabled={googleAiOverviewScanning || existingPrompts.length === 0}
                            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-medium disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          >
                            {googleAiOverviewScanning ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t('scanning')}
                              </>
                            ) : (
                              <>
                                <Globe className="w-3 h-3" />
                                Scan AI Overviews
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Expandable AI Modus Results */}
                      {selectedExistingWebsite.combinedResults?.googleAi?.total > 0 && (
                        <div className="mt-4">
                          <div className="border border-blue-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedPlatform(expandedPlatform === 'googleAi' ? null : 'googleAi')}
                              className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2 text-sm font-medium text-blue-800">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {t('googleAiModeResults')}
                                <span className="text-blue-600">
                                  ({selectedExistingWebsite.combinedResults.googleAi.mentioned}/{selectedExistingWebsite.combinedResults.googleAi.total})
                                </span>
                              </span>
                              {expandedPlatform === 'googleAi' ? (
                                <ChevronUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-blue-600" />
                              )}
                            </button>
                            {expandedPlatform === 'googleAi' && (
                              <div className="divide-y divide-blue-100">
                                {selectedExistingWebsite.combinedResults.googleAi.results?.map((result, idx) => (
                                  <div key={idx} className="bg-white">
                                    <button
                                      onClick={() => setExpandedPromptIndex(expandedPromptIndex === `g-${idx}` ? null : `g-${idx}`)}
                                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                                    >
                                      <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                        result.mentioned ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                      }`}>
                                        {result.mentioned ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                          <span className="text-sm font-medium">✗</span>
                                        )}
                                      </span>
                                      <span className="flex-1 text-sm text-slate-800">{result.prompt}</span>
                                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPromptIndex === `g-${idx}` ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expandedPromptIndex === `g-${idx}` && (
                                      <div className={`px-4 pb-4 pt-2 border-t ml-9 ${result.mentioned ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                        {result.snippet && (
                                          <div className="mb-3">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{t('aiModeResponse')}</p>
                                            <p className="text-sm text-slate-700 leading-relaxed">{result.snippet}</p>
                                          </div>
                                        )}
                                        {result.competitors && result.competitors.length > 0 && (
                                          <div className="mb-3">
                                            <p className="text-xs text-slate-500 mb-2">{t('competitors')}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {result.competitors.map((comp, ci) => (
                                                <span key={ci} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded border border-amber-200 text-xs font-medium">{comp}</span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {result.snippet && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              navigator.clipboard.writeText(result.snippet)
                                            }}
                                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            {t('copy')}
                                          </button>
                                        )}
                                        {!result.snippet && (!result.competitors || result.competitors.length === 0) && (
                                          <p className="text-xs text-slate-400 italic">
                                            {result.mentioned ? t('mentionedNoPreview') : t('notMentionedInGoogleAi')}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expandable Google AI Overview Results */}
                      {selectedExistingWebsite.combinedResults?.googleAiOverview?.total > 0 && (
                        <div className="mt-4">
                          <div className="border border-emerald-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedPlatform(expandedPlatform === 'googleAiOverview' ? null : 'googleAiOverview')}
                              className="w-full flex items-center justify-between px-3 py-2 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Google AI Overviews
                                <span className="text-emerald-600">
                                  ({selectedExistingWebsite.combinedResults.googleAiOverview.mentioned}/{selectedExistingWebsite.combinedResults.googleAiOverview.total})
                                </span>
                              </span>
                              {expandedPlatform === 'googleAiOverview' ? (
                                <ChevronUp className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-emerald-600" />
                              )}
                            </button>
                            {expandedPlatform === 'googleAiOverview' && (
                              <div className="divide-y divide-emerald-100">
                                {selectedExistingWebsite.combinedResults.googleAiOverview.results?.map((result, idx) => (
                                  <div key={idx} className="bg-white">
                                    <button
                                      onClick={() => setExpandedPromptIndex(expandedPromptIndex === `ov-${idx}` ? null : `ov-${idx}`)}
                                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                                    >
                                      <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                        result.mentioned ? 'bg-green-100 text-green-600' : result.hasAiOverview ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                                      }`}>
                                        {result.mentioned ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : result.hasAiOverview ? (
                                          <span className="text-sm font-medium">!</span>
                                        ) : (
                                          <span className="text-sm font-medium">—</span>
                                        )}
                                      </span>
                                      <div className="flex-1">
                                        <span className="text-sm text-slate-800">{result.prompt}</span>
                                        {!result.hasAiOverview && (
                                          <span className="ml-2 text-xs text-slate-400 italic">{t('noAiOverview')}</span>
                                        )}
                                      </div>
                                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPromptIndex === `ov-${idx}` ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expandedPromptIndex === `ov-${idx}` && (
                                      <div className="px-4 pb-4 pt-2 bg-emerald-50 border-t border-emerald-100 ml-9">
                                        {result.snippet && (
                                          <div className="mb-3">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">AI Overview</p>
                                            <p className="text-sm text-slate-700 leading-relaxed">{result.snippet}</p>
                                          </div>
                                        )}
                                        {result.competitors && result.competitors.length > 0 && (
                                          <div className="mb-3">
                                            <p className="text-xs text-slate-500 mb-2">{t('sourcesConcurrents')}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {result.competitors.map((comp, ci) => (
                                                <span key={ci} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded border border-amber-200 text-xs font-medium">{comp}</span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {result.snippet && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              navigator.clipboard.writeText(result.snippet)
                                            }}
                                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            {t('copy')}
                                          </button>
                                        )}
                                        {!result.hasAiOverview && (
                                          <p className="text-xs text-slate-400 italic">{t('noAiOverviewForQuery')}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expandable ChatGPT Results */}
                      {selectedExistingWebsite.combinedResults?.chatgpt?.total > 0 && (
                        <div className="mt-4">
                          <div className="border border-green-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedPlatform(expandedPlatform === 'chatgpt' ? null : 'chatgpt')}
                              className="w-full flex items-center justify-between px-3 py-2 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2 text-sm font-medium text-green-800">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {t('chatgptResults')}
                                <span className="text-green-600">
                                  ({selectedExistingWebsite.combinedResults.chatgpt.mentioned}/{selectedExistingWebsite.combinedResults.chatgpt.total})
                                </span>
                              </span>
                              {expandedPlatform === 'chatgpt' ? (
                                <ChevronUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-green-600" />
                              )}
                            </button>
                            {expandedPlatform === 'chatgpt' && (
                              <div className="divide-y divide-green-100">
                                {selectedExistingWebsite.combinedResults.chatgpt.results?.map((result, idx) => (
                                  <div key={idx} className="bg-white">
                                    <button
                                      onClick={() => setExpandedPromptIndex(expandedPromptIndex === `c-${idx}` ? null : `c-${idx}`)}
                                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                                    >
                                      <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                        result.mentioned ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                      }`}>
                                        {result.mentioned ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                          <XCircle className="w-4 h-4" />
                                        )}
                                      </span>
                                      <span className="flex-1 text-sm text-slate-800">{result.prompt}</span>
                                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPromptIndex === `c-${idx}` ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expandedPromptIndex === `c-${idx}` && result.snippet && (
                                      <div className="px-4 pb-4 pt-2 bg-green-50 border-t border-green-100 ml-9">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{t('chatgptResponse')}</p>
                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">{result.snippet}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : existingAiResults.length > 0 ? (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-violet-500" />
                      <span className="text-violet-700">
                        {t('aiVisibilityLabel', { mentioned: existingAiResults.filter(r => r.mentioned).length, total: existingAiResults.length })}
                      </span>
                    </div>
                  ) : (
                    <p className="text-amber-600 text-xs mt-3">
                      {t('noAiScanResults')}
                    </p>
                  )}
                </div>
              )}
              
              {/* Manual input fields */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('companyName')}</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('websiteUrl')}</label>
                  <input
                    type="text"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('industry')}</label>
                  <input
                    type="text"
                    value={companyCategory}
                    onChange={(e) => setCompanyCategory(e.target.value)}
                    placeholder={t("industryPlaceholder")}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              
              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!companyName || existingPrompts.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {t('next')} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 2: SEARCH CONSOLE (PAGES) */}
          {/* ============================================ */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t('loadPages')}</h2>
                  <p className="text-slate-500 text-sm">{t('loadPagesDesc')}</p>
                </div>
              </div>

              {/* Google SC Connection */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google Search Console
                    {googleConnected && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{t('connected')}</span>}
                  </h3>
                  {googleConnected && (
                    <button onClick={disconnectGoogle} className="text-xs text-red-600 hover:underline cursor-pointer">{t('disconnect')}</button>
                  )}
                </div>
                
                {!googleConnected ? (
                  <button onClick={connectGoogle} className="px-5 py-2.5 bg-white border-2 border-blue-300 text-blue-700 rounded-xl font-medium hover:bg-blue-50 cursor-pointer">
                    {t('connectGoogle')}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedProperty}
                      onChange={(e) => {
                        setSelectedProperty(e.target.value)
                        if (e.target.value) loadSearchConsoleData(e.target.value)
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white cursor-pointer"
                    >
                      <option value="">{t('selectWebsite')}</option>
                      {scProperties.map((prop, i) => (
                        <option key={i} value={prop.url}>{prop.url}</option>
                      ))}
                    </select>
                    {loadingScData && (
                      <div className="flex items-center gap-2 text-blue-600 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t('loadingData')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-slate-500">{t('orUploadManually')}</span></div>
              </div>

              {/* ZIP Upload */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-300 transition">
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  {csvParsing ? (
                    <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-2 animate-spin" />
                  ) : csvError ? (
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  ) : csvFileName && scPages.length > 0 ? (
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  ) : (
                    <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  )}
                  <p className="text-slate-600 font-medium text-sm">{csvFileName || (locale === 'en' ? 'Upload Search Console Excel' : 'Upload Search Console Excel')}</p>
                  <p className="text-slate-400 text-xs mt-1">{locale === 'en' ? 'Search Console → Export → Download Excel (6 months)' : 'Search Console → Exporteren → Download Excel (6 maanden)'}</p>
                </label>
              </div>

              {/* Error Message */}
              {csvError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{csvError}</p>
                  </div>
                </div>
              )}

              {/* Pages Preview */}
              {scPages.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">{t('pagesLoaded', { count: scPages.length })}</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {scPages.slice(0, 5).map((p, i) => (
                      <p key={i} className="text-xs text-slate-600 truncate">{p.page}</p>
                    ))}
                    {scPages.length > 5 && <p className="text-xs text-green-700">{t('morePages', { count: scPages.length - 5 })}</p>}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(3)}
                  disabled={scPages.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {t('next')} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 3: MATCHING (DRAG & DROP) */}
          {/* ============================================ */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t('matchingTitle')}</h2>
                  <p className="text-slate-500 text-sm">{t('matchingDesc')}</p>
                </div>
              </div>

              {/* Total prompts overview */}
              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {t('totalPrompts', { count: existingPrompts.length })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('matchedAndUnmatched', { matched: matches.length, unmatched: unmatchedPrompts.length })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${matches.length > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      ✓ {matches.length}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${unmatchedPrompts.length > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'}`}>
                      ⏳ {unmatchedPrompts.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Results Summary */}
              {existingAiResults.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{existingAiResults.filter(r => r.mentioned).length}</p>
                    <p className="text-xs text-green-700">{t('mentionedInAi')}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{existingAiResults.filter(r => !r.mentioned).length}</p>
                    <p className="text-xs text-red-700">{t('notMentioned')}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {existingAiResults.length > 0 ? Math.round((existingAiResults.filter(r => r.mentioned).length / existingAiResults.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-blue-700">AI Visibility</p>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-blue-800 text-sm">
                    {t('matchingTip')}
                  </p>
                  <button
                    onClick={autoMatchPrompts}
                    disabled={autoMatching || unmatchedPrompts.length === 0}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium text-sm hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {autoMatching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Matching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {t('aiAutoMatch')}
                      </>
                    )}
                  </button>
                </div>
                
                {/* Status feedback after matching */}
                {matches.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                    <p className="text-amber-800 text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {t('checkMatches')}
                    </p>
                    <p className="text-amber-700 text-xs mt-1">
                      {t('autoMatched', { count: matches.length })}
                      {unmatchedPrompts.length > 0 && (
                        <span className="text-red-600 font-medium"> • {t('unmatchedCount', { count: unmatchedPrompts.length })}</span>
                      )}
                    </p>
                    <p className="text-amber-600 text-xs mt-2">
                      {t('dragToFixMatch')}<br/>
                      {t('removeIrrelevantPrompts')}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Unmatched Prompts - Full width display */}
                <div 
                  className={`border-2 border-dashed rounded-xl p-4 min-h-[300px] ${
                    unmatchedPrompts.length > 0 
                      ? 'bg-red-50 border-red-300' 
                      : 'bg-slate-50 border-slate-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleDropOnUnmatched}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold ${unmatchedPrompts.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                      {unmatchedPrompts.length > 0 ? '⚠️' : '✅'} {t('stillToMatch', { count: unmatchedPrompts.length })}
                    </h3>
                    {unmatchedPrompts.length > 0 && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">{t('dragToRight')}</span>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {unmatchedPrompts.map((prompt, i) => {
                      const matchingResults = existingAiResults.filter(r => r.prompt === prompt)
                      const isMentionedAnywhere = matchingResults.some(r => r.mentioned)
                      const isEditing = editingPromptIndex === i
                      
                      if (isEditing) {
                        return (
                          <div key={i} className="p-3 rounded-lg border border-blue-300 bg-blue-50">
                            <textarea
                              value={editingPromptText}
                              onChange={(e) => setEditingPromptText(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button 
                                onClick={cancelEditPrompt}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              >
                                {t('cancel')}
                              </button>
                              <button 
                                onClick={() => saveEditedPrompt(i)}
                                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer"
                              >
                                {t('save')}
                              </button>
                            </div>
                          </div>
                        )
                      }
                      
                      return (
                        <div
                          key={i}
                          draggable
                          onDragStart={(e) => handleDragStart(e, prompt, 'unmatched')}
                          className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all group ${
                            isMentionedAnywhere ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <p className="flex-1 text-sm text-slate-700">{prompt}</p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              {isMentionedAnywhere && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full mr-1">✓ AI</span>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); editUnmatchedPrompt(i, prompt) }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                title={t("edit")}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteUnmatchedPrompt(i) }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                title={t("delete")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {unmatchedPrompts.length === 0 && matches.length > 0 && (
                      <div className="text-center py-6">
                        <p className="text-green-600 text-sm font-medium">{t('allPromptsMatched')}</p>
                        <p className="text-slate-500 text-xs mt-1">{t('checkMatchesRight')}</p>
                      </div>
                    )}
                    {unmatchedPrompts.length === 0 && matches.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-8">
                        {t('clickAutoMatch')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pages with search */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-700">
                      {t('matchedPages', { count: matches.length })}
                    </h3>
                    <span className="text-xs text-slate-500">{t('dragToMove')}</span>
                  </div>
                  
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={pageSearch}
                      onChange={(e) => setPageSearch(e.target.value)}
                      placeholder={t("searchPage")}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                    />
                    {pageSearch && (
                      <button 
                        onClick={() => setPageSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {filteredPages.map((pageObj, i) => {
                      const pageUrl = pageObj.page
                      const matchedPrompts = matches.filter(m => m.page === pageUrl)
                      const shortUrl = pageUrl.replace(/^https?:\/\/[^\/]+/, '')
                      
                      return (
                        <div
                          key={i}
                          className="bg-white border-2 border-slate-200 rounded-xl p-3 hover:border-purple-300 transition group"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnPage(e, pageUrl)}
                        >
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                            <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-600 flex-1 break-all">
                              {shortUrl || '/'}
                            </span>
                            <button 
                              onClick={() => removePage(pageUrl)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                              title={t("deletePage")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          {matchedPrompts.length > 0 ? (
                            <div className="space-y-1.5">
                              {matchedPrompts.map((match, j) => (
                                <div
                                  key={j}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, match.prompt, 'matched')}
                                  className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded px-2 py-2 cursor-grab group/prompt"
                                >
                                  <GripVertical className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                  <p className="flex-1 text-xs text-slate-700">{match.prompt}</p>
                                  <button 
                                    onClick={() => removeMatch(match.prompt)} 
                                    className="opacity-0 group-hover/prompt:opacity-100 text-red-500 cursor-pointer flex-shrink-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-2">{t('dropPromptHere')}</p>
                          )}
                        </div>
                      )
                    })}
                    {filteredPages.length === 0 && pageSearch && (
                      <p className="text-slate-400 text-sm text-center py-8">
                        {t('noPagesFound', { search: pageSearch })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <div className="flex items-center gap-3">
                  {unmatchedPrompts.length > 0 && matches.length > 0 && (
                    <span className="text-amber-600 text-xs">
                      {t('unmatchedWarning', { count: unmatchedPrompts.length })}
                    </span>
                  )}
                  <button
                    onClick={() => { setStep(4); runGeoScan(); }}
                    disabled={matches.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {t('startGeoScan')} <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* STEP 4: GEO CHECKLIST SCAN */}
          {/* ============================================ */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t('geoChecklistScan')}</h2>
                  <p className="text-slate-500 text-sm">{t('geoScanDesc')}</p>
                </div>
              </div>

              {/* Scanning Animation */}
              {geoScanning && (
                <div className="space-y-6">
                  {/* Progress bar */}
                  <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 via-purple-500 to-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${geoScanProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-slate-600">
                    {t('pageXOfY', { current: currentPageIndex, total: [...new Set(matches.map(m => m.page))].length })}
                  </p>

                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left: Page Preview with Scan Animation */}
                    <div className="bg-slate-900 rounded-2xl p-4 relative overflow-hidden">
                      {/* Browser chrome */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="flex-1 bg-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-400 truncate">
                          {currentScanPage?.replace(/^https?:\/\//, '')}
                        </div>
                      </div>
                      
                      {/* Page content area with scan line */}
                      <div className="relative bg-white rounded-lg overflow-hidden" style={{ height: '280px' }}>
                        {/* Fake page content */}
                        <div className="p-4 space-y-3 opacity-60">
                          <div className="h-8 bg-slate-200 rounded w-3/4" />
                          <div className="h-4 bg-slate-100 rounded w-full" />
                          <div className="h-4 bg-slate-100 rounded w-5/6" />
                          <div className="h-4 bg-slate-100 rounded w-4/6" />
                          <div className="h-20 bg-slate-50 rounded mt-4" />
                          <div className="h-4 bg-slate-100 rounded w-full" />
                          <div className="h-4 bg-slate-100 rounded w-3/4" />
                          <div className="grid grid-cols-3 gap-2 mt-4">
                            <div className="h-16 bg-slate-100 rounded" />
                            <div className="h-16 bg-slate-100 rounded" />
                            <div className="h-16 bg-slate-100 rounded" />
                          </div>
                        </div>
                        
                        {/* Teun mascotte met vergrootglas */}
                        <div className="absolute bottom-16 right-2 z-10 animate-bounce" style={{ animationDuration: '2s' }}>
                          <Image 
                            src="/images/teun-met-vergrootglas.png" 
                            alt="Teun scant" 
                            width={90} 
                            height={117} 
                            className="drop-shadow-lg"
                          />
                        </div>
                        
                        {/* Scanning line animation */}
                        <div 
                          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent scan-line-animation"
                          style={{
                            boxShadow: '0 0 20px 5px rgba(34, 211, 238, 0.4)'
                          }}
                        />
                        
                        {/* Scan overlay effect */}
                        <div 
                          className="absolute inset-0 pointer-events-none pulse-animation"
                          style={{
                            background: 'linear-gradient(180deg, rgba(34,211,238,0.1) 0%, transparent 50%, rgba(34,211,238,0.1) 100%)'
                          }}
                        />
                        
                        {/* Phase indicator */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                            scanPhase === 'loading' ? 'bg-blue-500 text-white' :
                            scanPhase === 'scanning' ? 'bg-cyan-500 text-white' :
                            scanPhase === 'analyzing' ? 'bg-purple-500 text-white' :
                            'bg-green-500 text-white'
                          }`}>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {scanPhase === 'loading' && t('phaseLoading')}
                            {scanPhase === 'scanning' && t('phaseScanning')}
                            {scanPhase === 'analyzing' && t('phaseAnalyzing')}
                            {scanPhase === 'complete' && t('phaseComplete')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Current Scan Status */}
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <h3 className="font-semibold text-slate-800">{t('geoChecklist')}</h3>
                      </div>
                      
                      {/* Current check being processed */}
                      {currentCheckItem ? (
                        <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border-2 border-purple-300">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-purple-600 font-medium mb-1">{clCat(currentCheckItem.sectionKey)}</p>
                              <p className="text-sm text-slate-800 font-medium">{cl(currentCheckItem.id)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-100 rounded-xl text-center">
                          <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-slate-500">
                            {scanPhase === 'loading' && t('phaseFetchingPage')}
                            {scanPhase === 'analyzing' && t('phaseProcessing')}
                            {scanPhase === 'complete' && t('phaseNextPage')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Results after scanning — WERKLIJST */}
              {!geoScanning && Object.keys(geoResults).length > 0 && (
                <>
                  {/* Score Cards */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                      <div className="flex items-center gap-2 mb-3 opacity-90">
                        <Eye className="w-5 h-5" />
                        <span className="text-sm font-medium">AI Visibility</span>
                      </div>
                      <div className="text-5xl font-black mb-1">
                        {overallScore?.aiVisibility || 0}%
                      </div>
                      <p className="text-violet-200 text-sm">
                        {t('promptsMentioned', { mentioned: existingAiResults.filter(r => r.mentioned).length, total: existingAiResults.length })}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                      <div className="flex items-center gap-2 mb-3 opacity-90">
                        <Search className="w-5 h-5" />
                        <span className="text-sm font-medium">{t('geoOptimization')}</span>
                      </div>
                      <div className="text-5xl font-black mb-1">
                        {overallScore?.geo || 0}%
                      </div>
                      <p className="text-blue-200 text-sm">
                        {t('pagesAnalyzed', { count: Object.keys(geoResults).length })}
                      </p>
                    </div>
                    <div className={`bg-gradient-to-br ${
                      (overallScore?.overall || 0) >= 70 ? 'from-emerald-500 to-green-600' :
                      (overallScore?.overall || 0) >= 50 ? 'from-amber-500 to-orange-600' :
                      'from-red-500 to-rose-600'
                    } rounded-2xl p-6 text-white shadow-xl`}>
                      <div className="flex items-center gap-2 mb-3 opacity-90">
                        <Award className="w-5 h-5" />
                        <span className="text-sm font-medium">{t('totalScore')}</span>
                      </div>
                      <div className="text-5xl font-black mb-1">
                        {overallScore?.overall || 0}
                      </div>
                      <p className="text-white/80 text-sm">{t('outOf100')}</p>
                    </div>
                  </div>

                  {/* ═══════════════════════════════ WERKLIJST ═══════════════════════════════ */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {expandedPage ? (
                        <button
                          onClick={() => setExpandedPage(null)}
                          className="flex items-center gap-2 text-sm text-[#292956] font-medium hover:text-[#292956]/70 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          {locale === 'nl' ? 'Terug naar overzicht' : 'Back to overview'}
                        </button>
                      ) : (
                        <h3 className="font-bold text-slate-900 text-lg">
                          {locale === 'nl' ? '📋 Werklijst: optimaliseer je pagina\'s' : '📋 Worklist: optimize your pages'}
                        </h3>
                      )}
                      {!expandedPage && (
                        <button
                          onClick={() => { clearSession(); setStep(1); setMatches([]); setGeoResults({}); setOverallScore(null); }}
                          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {locale === 'nl' ? 'Nieuwe analyse' : 'New analysis'}
                        </button>
                      )}
                    </div>

                    {Object.entries(geoResults)
                      .sort(([, a], [, b]) => a.score - b.score)
                      .filter(([pageUrl]) => !expandedPage || expandedPage === pageUrl)
                      .map(([pageUrl, result]) => {
                      const isExpanded = expandedPage === pageUrl
                      const matchedPrompt = matches.find(m => m.page === pageUrl)?.prompt
                      const passedCount = Object.values(result.checklist || {}).filter(v => v).length
                      const totalChecks = Object.keys(result.checklist || {}).length
                      const failedCount = totalChecks - passedCount

                      return (
                        <div key={pageUrl} className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
                          {/* Page Header */}
                          <div
                            onClick={() => setExpandedPage(isExpanded ? null : pageUrl)}
                            className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition"
                          >
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${
                                result.score >= 70 ? 'bg-emerald-50 text-emerald-700' :
                                result.score >= 40 ? 'bg-amber-50 text-amber-700' :
                                'bg-red-50 text-red-700'
                              }`}>
                                {result.score}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {pageUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || '/'}
                              </p>
                              {matchedPrompt && (
                                <p className="text-xs text-slate-400 truncate mt-0.5">{matchedPrompt}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {failedCount > 0 && (
                                <span className="text-xs text-amber-600 font-medium">{failedCount} {locale === 'nl' ? 'verbeterpunten' : 'improvements'}</span>
                              )}
                              {failedCount === 0 && (
                                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> {locale === 'nl' ? 'Goed' : 'Good'}
                                </span>
                              )}
                              {isExpanded
                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                : <ChevronDown className="w-4 h-4 text-slate-400" />
                              }
                            </div>
                          </div>

                          {/* Expanded: Custom AI Advice + Details */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 px-5 py-5 space-y-4">

                              {/* Score breakdown per category */}
                              {result.scores && Object.keys(result.scores).length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {Object.entries(result.scores).map(([catKey, catScore]) => {
                                    const catLabel = GEO_CHECKLIST[catKey]?.label || catKey
                                    const pct = typeof catScore === 'object' ? (catScore.percentage || 0) : (catScore || 0)
                                    return (
                                      <div key={catKey} className="bg-slate-50 rounded-lg p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] font-medium text-slate-500 truncate">{catLabel}</span>
                                          <span className="text-xs font-bold" style={{ color: pct >= 70 ? '#059669' : pct >= 40 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
                                        </div>
                                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 70 ? '#059669' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {/* ══ CUSTOM AI ADVICE ══ */}
                              {(result.customAdvice || []).length > 0 && (
                                <div className="space-y-2.5">
                                  <p className="text-xs font-bold text-[#292956] uppercase tracking-wide flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {locale === 'nl' ? 'Op maat advies voor deze pagina' : 'Custom advice for this page'}
                                  </p>
                                  {result.customAdvice.map((advice, ai) => {
                                    const catIcons = { eeat: '🏆', content: '📝', technical: '⚙️', structured_data: '🔗', geo: '🎯' }
                                    const pc = {
                                      critical: { border: '#dc2626', badge: 'bg-red-100 text-red-700', label: locale === 'nl' ? 'kritiek' : 'critical' },
                                      high: { border: '#ef4444', badge: 'bg-red-50 text-red-600', label: locale === 'nl' ? 'hoog' : 'high' },
                                      medium: { border: '#f59e0b', badge: 'bg-amber-50 text-amber-600', label: locale === 'nl' ? 'middel' : 'medium' },
                                      low: { border: '#94a3b8', badge: 'bg-slate-100 text-slate-500', label: locale === 'nl' ? 'laag' : 'low' },
                                    }[advice.priority] || { border: '#f59e0b', badge: 'bg-amber-50 text-amber-600', label: 'medium' }

                                    return (
                                      <div key={ai} className="rounded-lg border border-slate-200 px-4 py-3.5" style={{ borderLeft: `4px solid ${pc.border}` }}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-base flex-shrink-0">{catIcons[advice.category] || '💡'}</span>
                                          <span className="text-[13px] font-bold text-slate-900 flex-1">{advice.title}</span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${pc.badge}`}>{pc.label}</span>
                                        </div>
                                        <p className="text-[12px] text-slate-700 ml-7 leading-relaxed">{advice.action || advice.detail}</p>
                                        {advice.example && (
                                          <div className="ml-7 mt-2 bg-slate-50 rounded-md p-2.5 border border-slate-100 max-h-24 overflow-y-auto">
                                            <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-mono leading-relaxed m-0">{advice.example}</pre>
                                          </div>
                                        )}
                                        {advice.why && (
                                          <p className="text-[11px] text-slate-400 ml-7 mt-1.5 italic">{advice.why}</p>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {/* ══ SCAN BEVINDINGEN (pagina-specifiek) ══ */}
                              {(result.issues || []).length > 0 && (
                                <details className="group">
                                  <summary className="text-xs text-amber-600 font-medium cursor-pointer hover:text-amber-700 list-none flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {result.issues.length} {locale === 'nl' ? 'technische bevindingen' : 'technical findings'}
                                    <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                                  </summary>
                                  <div className="mt-2 space-y-1">
                                    {result.issues.map((issue, ii) => (
                                      <div key={ii} className="flex items-start gap-2 py-1.5 px-3 bg-amber-50 rounded-lg">
                                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-amber-800">{issue}</p>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}

                              {/* ══ PASSED CHECKS (collapsible) ══ */}
                              {passedCount > 0 && (
                                <details className="group">
                                  <summary className="text-xs text-emerald-600 font-medium cursor-pointer hover:text-emerald-700 list-none flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {passedCount} {locale === 'nl' ? 'checks voldoen' : 'checks passed'}
                                    <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                                  </summary>
                                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                                    {Object.entries(result.checklist || {}).filter(([, v]) => v === true).map(([checkId]) => (
                                      <div key={checkId} className="text-[11px] text-emerald-600 flex items-center gap-1 py-0.5">
                                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{cl(checkId)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}

                              {/* Page actions */}
                              <div className="flex items-center justify-between pt-1">
                                <a
                                  href={pageUrl.startsWith('http') ? pageUrl : `https://${pageUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {locale === 'nl' ? 'Open pagina' : 'Open page'}
                                </a>
                                <span className="text-[10px] text-slate-300">
                                  {result.wordCount || 0} {locale === 'nl' ? 'woorden' : 'words'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Download Report (secondary) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">{t('downloadFullReport')}</h3>
                        <p className="text-xs text-slate-400">{t('downloadReportDesc')}</p>
                      </div>
                      <button
                        onClick={generateReport}
                        disabled={generating}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition cursor-pointer text-sm whitespace-nowrap"
                      >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {generating ? t('generating') : t('downloadPdf')}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Navigation */}
              {!geoScanning && Object.keys(geoResults).length > 0 && (
                <div className="flex justify-end pt-4">
                  <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 cursor-pointer">
                    {t('backToDashboard')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CSS Animations - using style tag */}
          <style>{`
            @keyframes scanLine {
              0% { top: 0; opacity: 1; }
              45% { top: calc(100% - 4px); opacity: 1; }
              50% { top: calc(100% - 4px); opacity: 0.5; }
              55% { top: calc(100% - 4px); opacity: 1; }
              100% { top: 0; opacity: 1; }
            }
            
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateX(-20px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
            
            .scan-line-animation {
              animation: scanLine 2s ease-in-out infinite;
            }
            
            .slide-in-animation {
              animation: slideIn 0.3s ease-out;
            }
            
            .pulse-animation {
              animation: pulse 2s ease-in-out infinite;
            }
          `}</style>

        </div>
      </div>
    </>
    )}
    </div>
  )
}

// ============================================
// EXPORT WITH SUSPENSE WRAPPER + PRO GATE
// ============================================
function ProGateWrapper({ children }) {
  const [isPro, setIsPro] = useState(null) // null = loading, true/false = known
  const locale = useLocale()
  const isNL = locale === 'nl'
  const [showNotify, setShowNotify] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySubmitted, setNotifySubmitted] = useState(false)

  useEffect(() => {
    async function checkPro() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsPro(false); return }

      // Admin check
      const adminEmails = ['imre@onlinelabs.nl', 'hallo@onlinelabs.nl']
      if (adminEmails.includes(user.email)) { setIsPro(true); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()
      setIsPro(['active', 'canceling'].includes(profile?.subscription_status))
    }
    checkPro()
  }, [])

  // Loading
  if (isPro === null) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  )

  // Pro user — show content
  if (isPro) return children

  async function handleNotifySubmit(e) {
    e.preventDefault()
    if (!notifyEmail) return
    try {
      await fetch('/api/notify-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail, feature: 'GEO Analyse' }),
      }).catch(() => {})
    } catch {}
    setNotifySubmitted(true)
  }

  // Free user — show blurred content with overlay
  return (
    <div className="relative min-h-screen">
      {/* Blurred content */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(3px)', opacity: 0.65 }}>

        {children}
      </div>

      {/* Pro overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 mb-5">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {isNL ? 'GEO Analyse is een Pro functie' : 'GEO Analysis is a Pro feature'}
          </h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            {isNL
              ? 'Optimaliseer je pagina\'s voor AI-zoekmachines met de complete GEO Analyse wizard. Beschikbaar voor Pro gebruikers.'
              : 'Optimize your pages for AI search engines with the complete GEO Analysis wizard. Available for Pro users.'}
          </p>

          <div className="space-y-2.5 text-left mb-6">
            {(isNL
              ? ['4-stappen GEO analyse wizard', 'Automatische prompt generatie', 'Pagina-voor-pagina optimalisatie', 'Diepte-audit per pagina', 'Onbeperkte scans op alle tools']
              : ['4-step GEO analysis wizard', 'Automatic prompt generation', 'Page-by-page optimization', 'Deep audit per page', 'Unlimited scans on all tools']
            ).map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
          </div>

          {!showNotify ? (
            <a
              href={isNL ? '/pricing' : '/en/pricing'}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold text-base hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer border-none no-underline"
            >
              <Sparkles className="w-4 h-4" />
              {isNL ? 'Ontgrendel met Pro' : 'Unlock with Pro'}
            </a>
          ) : null}

          <p className="text-xs text-slate-400 mt-4">
            {isNL ? 'Vanaf €49,95/maand, maandelijks opzegbaar' : 'From €49.95/month, cancel anytime'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function GEOAnalysePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <ProGateWrapper>
        <GEOAnalyseContent />
      </ProGateWrapper>
    </Suspense>
  )
}
