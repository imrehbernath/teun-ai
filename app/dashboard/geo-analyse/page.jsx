'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, ArrowRight, Building2, FileSpreadsheet, Globe, 
  CheckCircle2, Loader2, Upload, Trash2, Plus, Search, 
  GripVertical, Link2, FileText, Download, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, Sparkles, Target,
  BarChart3, Shield, Zap, BookOpen, Database, MessageSquare,
  Eye, TrendingUp, Award, Pencil, Play, RefreshCw, XCircle
} from 'lucide-react'
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
      { id: 'og_tags', label: 'Social media OG-tags en Twitter Cards', autoCheck: true },
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
const ALL_CHECKLIST_ITEMS = Object.values(GEO_CHECKLIST)
  .filter(section => !section.manual)
  .flatMap(section => section.items.map(item => ({
    ...item,
    section: section.label
  })))

// ============================================
// MAIN COMPONENT
// ============================================
function GEOAnalyseContent() {
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
  
  // Step 5: Results
  const [overallScore, setOverallScore] = useState(null)
  const [generating, setGenerating] = useState(false)
  
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
      geoResults,
      manualChecks,
      overallScore,
      selectedProperty,
      timestamp: Date.now()
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
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
    if (savedSession && savedSession.companyName && savedSession.step > 1) {
      // Only restore if session is recent (1 hour) and has meaningful progress
      const sessionAge = Date.now() - savedSession.timestamp
      const isRecent = sessionAge < 60 * 60 * 1000 // 1 hour
      const hasProgress = savedSession.step >= 3 || (savedSession.matches && savedSession.matches.length > 0)
      
      if (isRecent && hasProgress) {
        // Restore saved state
        setStep(savedSession.step || 1)
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
      
      // Load from perplexity_scans (new system) - has real scan results
      let perplexityQuery = supabase
        .from('perplexity_scans')
        .select('*')
        .eq('user_id', queryUserId)
        .order('created_at', { ascending: false })
      if (companyFilter) perplexityQuery = perplexityQuery.in('company_name', companyFilter)
      const { data: perplexityScans } = await perplexityQuery

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

      // Load from tool_integrations as fallback (older data)
      let integrationsQuery = supabase
        .from('tool_integrations')
        .select('*')
        .eq('user_id', queryUserId)
        .not('commercial_prompts', 'is', null)
        .order('created_at', { ascending: false })
      if (companyFilter) integrationsQuery = integrationsQuery.in('company_name', companyFilter)
      const { data: integrations } = await integrationsQuery

      console.log('Loaded perplexity scans:', perplexityScans)
      console.log('Loaded chatgpt scans:', chatgptScans)
      console.log('Loaded google ai scans:', googleAiScans)
      console.log('Loaded google ai overview scans:', googleAiOverviewScans)
      console.log('Loaded tool_integrations:', integrations)
      
      // Debug: log first perplexity scan structure
      if (perplexityScans?.[0]) {
        console.log('First perplexity scan structure:', {
          id: perplexityScans[0].id,
          company_name: perplexityScans[0].company_name,
          website: perplexityScans[0].website,
          website_url: perplexityScans[0].website_url,
          hasResults: !!perplexityScans[0].results,
          resultsLength: perplexityScans[0].results?.length,
          prompts: perplexityScans[0].prompts?.length
        })
      }
      
      // Debug: log first tool_integration structure
      if (integrations?.[0]) {
        console.log('First tool_integration structure:', {
          id: integrations[0].id,
          company_name: integrations[0].company_name,
          website: integrations[0].website,
          hasResults: !!integrations[0].results,
          resultsLength: integrations[0].results?.length,
          commercial_prompts: integrations[0].commercial_prompts?.length
        })
      }

      // Deduplicate and combine - prioritize perplexity_scans
      const websiteMap = new Map()
      
      // First, process perplexity_scans (most accurate data)
      perplexityScans?.forEach(scan => {
        const key = (scan.company_name || scan.website || '').toLowerCase().trim()
        if (key && !websiteMap.has(key)) {
          const prompts = scan.prompts || []
          
          // Start with empty combined results
          let combinedResults = {
            perplexity: { mentioned: 0, total: 0, results: [] },
            chatgpt: { mentioned: 0, total: 0, results: [] },
            googleAi: { mentioned: 0, total: 0, results: [] },
            googleAiOverview: { mentioned: 0, total: 0, results: [] }
          }
          
          // Add Perplexity results
          if (Array.isArray(scan.results) && scan.results.length > 0) {
            combinedResults.perplexity.results = scan.results.map(r => ({
              prompt: r.query || r.prompt || '',
              mentioned: r.companyMentioned === true || r.mentioned === true,
              snippet: r.snippet || r.aiResponse || ''
            }))
            combinedResults.perplexity.total = scan.results.length
            combinedResults.perplexity.mentioned = scan.results.filter(r => 
              r.companyMentioned === true || r.mentioned === true
            ).length
          }
          
          websiteMap.set(key, {
            id: scan.id, // Store the ID for linking to detail page
            name: scan.company_name || scan.website,
            website: scan.website || scan.website_url || scan.url || '', // Try multiple field names
            category: scan.company_category || scan.category,
            prompts: prompts,
            combinedResults: combinedResults,
            source: 'perplexity',
            hasRealAiData: Array.isArray(scan.results) && scan.results.length > 0
          })
          
          console.log('Added website from perplexity:', scan.company_name, 'URL:', scan.website || scan.website_url || scan.url)
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
          
          existing.combinedResults.chatgpt = {
            mentioned: results.filter(r => r.mentioned === true).length,
            total: results.length,
            results
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
          
          // Handle both old (AI Overview) and new (AI Mode) format
          existing.combinedResults.googleAi = {
            mentioned: results.filter(r => r.companyMentioned === true).length,
            total: results.length,
            results: results.map(r => ({
              prompt: r.query || r.prompt,
              mentioned: r.companyMentioned === true,
              hasAiResponse: r.hasAiResponse === true || r.hasAiOverview === true,
              snippet: r.aiResponse || r.aiResponsePreview || r.aiOverviewText || r.textContent || '',
              competitors: r.competitors || r.competitorsInSources || r.competitorsMentioned || []
            }))
          }
          
          // Mark as having real AI data if we have responses
          if (results.length > 0 && results.some(r => r.hasAiResponse || r.hasAiOverview)) {
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

          existing.combinedResults.googleAiOverview = {
            mentioned: results.filter(r => r.companyMentioned === true).length,
            total: results.length,
            results: results.map(r => ({
              prompt: r.query || r.prompt,
              mentioned: r.companyMentioned === true,
              hasAiOverview: r.hasAiOverview === true,
              snippet: r.aiOverviewText || '',
              competitors: r.competitorsMentioned || []
            }))
          }

          if (results.length > 0 && results.some(r => r.hasAiOverview)) {
            existing.hasRealAiData = true
          }
        }
      })

      // Fallback: add from tool_integrations if not already in map (legacy data)
      // Also use tool_integrations to add Perplexity results if perplexity_scans didn't have them
      integrations?.forEach(scan => {
        const key = (scan.company_name || scan.website || '').toLowerCase().trim()
        
        // If website already exists, try to add Perplexity results from tool_integrations
        if (key && websiteMap.has(key)) {
          const existing = websiteMap.get(key)
          
          // Add website URL if missing
          if (!existing.website && scan.website) {
            existing.website = scan.website
          }
          
          // Add Perplexity results if existing entry doesn't have them
          if (existing.combinedResults.perplexity.total === 0) {
            if (Array.isArray(scan.results) && scan.results.length > 0) {
              existing.combinedResults.perplexity = {
                mentioned: scan.results.filter(r => r.mentioned || r.company_mentioned || r.companyMentioned).length,
                total: scan.results.length,
                results: scan.results.map(r => ({
                  prompt: r.query || r.prompt || '',
                  mentioned: r.mentioned || r.company_mentioned || r.companyMentioned || false,
                  snippet: r.snippet || r.response_snippet || ''
                }))
              }
              console.log('Added Perplexity results from tool_integrations for:', key)
            }
          }
        }
        // Create new entry if doesn't exist
        else if (key && !websiteMap.has(key) && Array.isArray(scan.commercial_prompts)) {
          websiteMap.set(key, {
            id: scan.id,
            name: scan.company_name || scan.website,
            website: scan.website,
            category: scan.company_category,
            prompts: scan.commercial_prompts || [],
            combinedResults: {
              perplexity: { mentioned: 0, total: 0, results: [] },
              chatgpt: { mentioned: 0, total: 0, results: [] },
              googleAi: { mentioned: 0, total: 0, results: [] },
            googleAiOverview: { mentioned: 0, total: 0, results: [] }
            },
            source: 'tool_integrations',
            hasRealAiData: false
          })
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

  const selectExistingWebsite = (website) => {
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
    if (!confirm('Weet je zeker dat je Google Search Console wilt ontkoppelen?')) return
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
      h.includes('page') || h.includes('pagina') || h.includes('url')
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setCsvParsing(true)
    setCsvFileName(file.name)
    
    try {
      const isZip = file.name.toLowerCase().endsWith('.zip')
      
      if (isZip) {
        const JSZip = (await import('jszip')).default
        const zip = await JSZip.loadAsync(file)
        
        for (const fileName of Object.keys(zip.files)) {
          if (fileName.toLowerCase().includes('pages') || fileName.toLowerCase().includes('pagina')) {
            const csvContent = await zip.files[fileName].async('string')
            const pages = parseCSVContent(csvContent)
            setScPages(pages)
            break
          }
        }
      } else {
        const text = await file.text()
        const pages = parseCSVContent(text)
        setScPages(pages)
      }
    } catch (err) {
      console.error('File parse error:', err)
      alert('Fout bij het lezen van bestand: ' + err.message)
    }
    
    setCsvParsing(false)
  }

  // ============================================
  // STEP 3: AI VISIBILITY SCAN
  // ============================================
  const runAiVisibilityScan = async () => {
    if (existingPrompts.length === 0) {
      alert('Geen prompts beschikbaar. Voer eerst een AI Visibility scan uit op het dashboard.')
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
          results.push({ prompt, mentioned: false, mentionCount: 0, competitors: [], snippet: 'Scan mislukt' })
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
      alert('Geen prompts beschikbaar. Selecteer eerst een bedrijf met prompts.')
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
        throw new Error(error.error || 'Scan mislukt')
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
        
        alert(`✅ Google AI Modus scan voltooid!\n\n${data.foundCount} van ${data.totalQueries} prompts vermelden ${companyName}`)
      }
      
      setGoogleAiProgress(100)
      
    } catch (error) {
      console.error('Google AI Mode scan error:', error)
      alert('Fout bij AI Modus scan: ' + error.message)
    } finally {
      setGoogleAiScanning(false)
    }
  }

  // ============================================
  // GOOGLE AI OVERVIEW SCAN
  // ============================================
  const runGoogleAiOverviewScan = async () => {
    if (existingPrompts.length === 0) {
      alert('Geen prompts beschikbaar. Selecteer eerst een bedrijf met prompts.')
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
        throw new Error(error.error || 'Scan mislukt')
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

        alert(`✅ Google AI Overviews scan voltooid!\n\n${data.hasAiOverviewCount} van ${data.totalQueries} prompts hebben een AI Overview\n${data.foundCount} vermelden ${companyName}`)
      }

    } catch (error) {
      console.error('Google AI Overview scan error:', error)
      alert('Fout bij Google AI Overview scan: ' + error.message)
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
  // STEP 5: GEO CHECKLIST SCAN
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
          body: JSON.stringify({ url: pageUrl })
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
            issues: data.issues || [],
            scanned: true
          }
        } else {
          results[pageUrl] = { checklist: {}, score: 0, issues: ['Scan mislukt'], scanned: false }
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

  // ============================================
  // STEP 5: GENERATE REPORT
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
          manualChecks
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `GEO-Rapport-${companyName.replace(/\s+/g, '-')}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      alert('Fout: ' + error.message)
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
    { num: 1, label: 'Bedrijfsinfo', icon: Building2 },
    { num: 2, label: 'Pagina\'s', icon: FileSpreadsheet },
    { num: 3, label: 'Matching', icon: Link2 },
    { num: 4, label: 'GEO Check', icon: Search },
    { num: 5, label: 'Rapport', icon: FileText },
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
                <p className="text-sm text-slate-500">Complete AI zichtbaarheid & GEO optimalisatie analyse</p>
              </div>
            </div>
            <div className="hidden lg:block">
              <Image src="/images/teun-ai-mascotte.png" alt="Teun" width={80} height={80} className="opacity-90" />
            </div>
          </div>
        </div>
      </div>

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
                  <h2 className="text-xl font-bold text-slate-900">Bedrijfsinformatie</h2>
                  <p className="text-slate-500 text-sm">Selecteer een bedrijf met bestaande prompts</p>
                </div>
              </div>
              
              {/* Existing Websites List */}
              {existingWebsites.length > 0 ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">📂 Kies uit je dashboard</label>
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
                    <strong>Geen bedrijven gevonden.</strong> Voer eerst een AI Visibility scan uit op het dashboard om prompts te genereren.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 cursor-pointer"
                  >
                    Naar Dashboard
                  </button>
                </div>
              )}
              
              {/* Show loaded prompts */}
              {existingPrompts.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-green-800 font-medium">✅ {existingPrompts.length} commerciële prompts geladen</p>
                    <button
                      onClick={() => {
                        console.log('Bewerken clicked, website:', selectedExistingWebsite)
                        // Go to website detail page if we have an ID from perplexity_scans
                        if (selectedExistingWebsite?.id && selectedExistingWebsite?.source === 'perplexity') {
                          router.push(`/dashboard/website/${selectedExistingWebsite.id}`)
                        } else if (selectedExistingWebsite?.id) {
                          // For other sources, try the ID but it might not work
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
                      Bewerken
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {existingPrompts.slice(0, 5).map((prompt, i) => (
                      <span key={i} className="px-2 py-1 bg-white rounded text-xs text-slate-600 border border-green-200">
                        {prompt.substring(0, 40)}...
                      </span>
                    ))}
                    {existingPrompts.length > 5 && (
                      <span className="px-2 py-1 bg-green-100 rounded text-xs text-green-700">+{existingPrompts.length - 5} meer</span>
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
                                  AI Visibility: {totalMentioned}/{totalScanned} vermeld
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
                                Scannen...
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
                                Scannen...
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
                                Google AI Modus Resultaten
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
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">AI Modus Response</p>
                                            <p className="text-sm text-slate-700 leading-relaxed">{result.snippet}</p>
                                          </div>
                                        )}
                                        {result.competitors && result.competitors.length > 0 && (
                                          <div className="mb-3">
                                            <p className="text-xs text-slate-500 mb-2">Concurrenten:</p>
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
                                            Kopieer
                                          </button>
                                        )}
                                        {!result.snippet && (!result.competitors || result.competitors.length === 0) && (
                                          <p className="text-xs text-slate-400 italic">
                                            {result.mentioned ? 'Vermeld, maar geen response preview opgeslagen' : 'Niet vermeld in Google AI Modus'}
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
                                          <span className="ml-2 text-xs text-slate-400 italic">geen AI Overview</span>
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
                                            <p className="text-xs text-slate-500 mb-2">Bronnen/Concurrenten:</p>
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
                                            Kopieer
                                          </button>
                                        )}
                                        {!result.hasAiOverview && (
                                          <p className="text-xs text-slate-400 italic">Geen AI Overview voor deze zoekopdracht</p>
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
                                ChatGPT Resultaten
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
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">ChatGPT antwoord</p>
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
                        AI Visibility: {existingAiResults.filter(r => r.mentioned).length}/{existingAiResults.length} vermeld
                      </span>
                    </div>
                  ) : (
                    <p className="text-amber-600 text-xs mt-3">
                      ⚠️ Geen AI scan resultaten - voer eerst een scan uit in het dashboard
                    </p>
                  )}
                </div>
              )}
              
              {/* Manual input fields */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bedrijfsnaam</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Website URL</label>
                  <input
                    type="text"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Branche</label>
                  <input
                    type="text"
                    value={companyCategory}
                    onChange={(e) => setCompanyCategory(e.target.value)}
                    placeholder="Bijv. Plastische chirurgie"
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
                  Volgende <ArrowRight className="w-5 h-5" />
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
                  <h2 className="text-xl font-bold text-slate-900">Pagina's Laden</h2>
                  <p className="text-slate-500 text-sm">Haal je beste pagina's op uit Search Console</p>
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
                    {googleConnected && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Verbonden</span>}
                  </h3>
                  {googleConnected && (
                    <button onClick={disconnectGoogle} className="text-xs text-red-600 hover:underline cursor-pointer">Ontkoppelen</button>
                  )}
                </div>
                
                {!googleConnected ? (
                  <button onClick={connectGoogle} className="px-5 py-2.5 bg-white border-2 border-blue-300 text-blue-700 rounded-xl font-medium hover:bg-blue-50 cursor-pointer">
                    Verbind met Google
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
                      <option value="">Selecteer een website...</option>
                      {scProperties.map((prop, i) => (
                        <option key={i} value={prop.url}>{prop.url}</option>
                      ))}
                    </select>
                    {loadingScData && (
                      <div className="flex items-center gap-2 text-blue-600 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Data laden...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-slate-500">of upload handmatig</span></div>
              </div>

              {/* ZIP Upload */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-300 transition">
                <input type="file" accept=".csv,.zip" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  {csvParsing ? (
                    <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-2 animate-spin" />
                  ) : csvFileName ? (
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  ) : (
                    <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  )}
                  <p className="text-slate-600 font-medium text-sm">{csvFileName || 'ZIP of CSV uploaden'}</p>
                  <p className="text-slate-400 text-xs mt-1">Search Console → Exporteren → Download ZIP</p>
                </label>
              </div>

              {/* Pages Preview */}
              {scPages.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">{scPages.length} pagina's geladen!</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {scPages.slice(0, 5).map((p, i) => (
                      <p key={i} className="text-xs text-slate-600 truncate">{p.page}</p>
                    ))}
                    {scPages.length > 5 && <p className="text-xs text-green-700">+{scPages.length - 5} meer...</p>}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 cursor-pointer">
                  <ArrowLeft className="w-5 h-5" /> Vorige
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={scPages.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Volgende <ArrowRight className="w-5 h-5" />
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
                  <h2 className="text-xl font-bold text-slate-900">Prompt ↔ Pagina Matching</h2>
                  <p className="text-slate-500 text-sm">Koppel prompts aan de juiste pagina's</p>
                </div>
              </div>

              {/* Total prompts overview */}
              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Totaal: {existingPrompts.length} prompts
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {matches.length} gekoppeld • {unmatchedPrompts.length} nog te koppelen
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
                    <p className="text-xs text-green-700">Vermeld in AI</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{existingAiResults.filter(r => !r.mentioned).length}</p>
                    <p className="text-xs text-red-700">Niet vermeld</p>
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
                    <strong>Tip:</strong> Koppel prompts aan de pagina die het beste bij die zoekvraag past. 
                    Gebruik de AI auto-match of sleep handmatig.
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
                        AI Auto-Match
                      </>
                    )}
                  </button>
                </div>
                
                {/* Status feedback after matching */}
                {matches.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                    <p className="text-amber-800 text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Controleer de koppelingen!
                    </p>
                    <p className="text-amber-700 text-xs mt-1">
                      ✓ {matches.length} prompt{matches.length !== 1 ? 's' : ''} automatisch gekoppeld
                      {unmatchedPrompts.length > 0 && (
                        <span className="text-red-600 font-medium"> • {unmatchedPrompts.length} nog niet gekoppeld</span>
                      )}
                    </p>
                    <p className="text-amber-600 text-xs mt-2">
                      → Sleep prompts naar een andere pagina als de match niet klopt<br/>
                      → Verwijder of bewerk prompts die niet relevant zijn
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
                      {unmatchedPrompts.length > 0 ? '⚠️' : '✅'} Nog te koppelen ({unmatchedPrompts.length})
                    </h3>
                    {unmatchedPrompts.length > 0 && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">Sleep naar rechts →</span>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {unmatchedPrompts.map((prompt, i) => {
                      const result = existingAiResults.find(r => r.prompt === prompt)
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
                                Annuleren
                              </button>
                              <button 
                                onClick={() => saveEditedPrompt(i)}
                                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer"
                              >
                                Opslaan
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
                            result?.mentioned ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <p className="flex-1 text-sm text-slate-700">{prompt}</p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              {result?.mentioned && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full mr-1">✓ AI</span>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); editUnmatchedPrompt(i, prompt) }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                title="Bewerken"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteUnmatchedPrompt(i) }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                title="Verwijderen"
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
                        <p className="text-green-600 text-sm font-medium">✅ Alle prompts gekoppeld!</p>
                        <p className="text-slate-500 text-xs mt-1">Controleer de koppelingen rechts</p>
                      </div>
                    )}
                    {unmatchedPrompts.length === 0 && matches.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-8">
                        Klik op "AI Auto-Match" om te starten
                      </p>
                    )}
                  </div>
                </div>

                {/* Pages with search */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-700">
                      📄 Gekoppelde pagina's ({matches.length} prompts)
                    </h3>
                    <span className="text-xs text-slate-500">Sleep om te verplaatsen</span>
                  </div>
                  
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={pageSearch}
                      onChange={(e) => setPageSearch(e.target.value)}
                      placeholder="Zoek pagina..."
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
                              title="Pagina verwijderen"
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
                            <p className="text-xs text-slate-400 italic py-2">Sleep een prompt hierheen...</p>
                          )}
                        </div>
                      )
                    })}
                    {filteredPages.length === 0 && pageSearch && (
                      <p className="text-slate-400 text-sm text-center py-8">
                        Geen pagina's gevonden voor "{pageSearch}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 cursor-pointer">
                  <ArrowLeft className="w-5 h-5" /> Vorige
                </button>
                <div className="flex items-center gap-3">
                  {unmatchedPrompts.length > 0 && matches.length > 0 && (
                    <span className="text-amber-600 text-xs">
                      ⚠️ {unmatchedPrompts.length} prompt{unmatchedPrompts.length !== 1 ? 's' : ''} niet gekoppeld
                    </span>
                  )}
                  <button
                    onClick={() => { setStep(4); runGeoScan(); }}
                    disabled={matches.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Start GEO Scan <ArrowRight className="w-5 h-5" />
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
                  <h2 className="text-xl font-bold text-slate-900">GEO Checklist Scan</h2>
                  <p className="text-slate-500 text-sm">Analyseer gekoppelde pagina's op GEO optimalisatie</p>
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
                    Pagina {currentPageIndex} van {[...new Set(matches.map(m => m.page))].length}
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
                            {scanPhase === 'loading' && 'Pagina laden...'}
                            {scanPhase === 'scanning' && 'GEO checklist scannen...'}
                            {scanPhase === 'analyzing' && 'Resultaten analyseren...'}
                            {scanPhase === 'complete' && 'Scan voltooid!'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Current Scan Status */}
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <h3 className="font-semibold text-slate-800">GEO Checklist</h3>
                      </div>
                      
                      {/* Current check being processed */}
                      {currentCheckItem ? (
                        <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border-2 border-purple-300">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-purple-600 font-medium mb-1">{currentCheckItem.section}</p>
                              <p className="text-sm text-slate-800 font-medium">{currentCheckItem.label}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-100 rounded-xl text-center">
                          <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-slate-500">
                            {scanPhase === 'loading' && 'Pagina ophalen...'}
                            {scanPhase === 'analyzing' && 'Resultaten verwerken...'}
                            {scanPhase === 'complete' && 'Volgende pagina...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Results after scanning */}
              {!geoScanning && Object.keys(geoResults).length > 0 && (
                <>
                  {/* Manual Authority Checks */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5" /> Autoriteit (handmatig invullen)
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {GEO_CHECKLIST.autoriteit.items.map(item => (
                        <label key={item.id} className="flex items-center gap-2 bg-white rounded-lg p-2 cursor-pointer hover:bg-amber-100">
                          <input
                            type="checkbox"
                            checked={manualChecks[item.id] || false}
                            onChange={(e) => setManualChecks(prev => ({ ...prev, [item.id]: e.target.checked }))}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm text-slate-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Results per page */}
                  <div className="space-y-3">
                    {Object.entries(geoResults).map(([pageUrl, result]) => (
                      <div key={pageUrl} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-700 truncate flex-1">{pageUrl.replace(/^https?:\/\//, '')}</span>
                          <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(result.score)}`}>
                            {result.score}/100
                          </div>
                        </div>
                        {result.issues.length > 0 && (
                          <ul className="space-y-1">
                            {result.issues.slice(0, 3).map((issue, i) => (
                              <li key={i} className="text-xs text-orange-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {issue}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(3)} className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 cursor-pointer">
                  <ArrowLeft className="w-5 h-5" /> Vorige
                </button>
                <button
                  onClick={() => setStep(5)}
                  disabled={geoScanning || Object.keys(geoResults).length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Bekijk Resultaten <ArrowRight className="w-5 h-5" />
                </button>
              </div>
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

          {/* ============================================ */}
          {/* STEP 5: RESULTS & REPORT */}
          {/* ============================================ */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">GEO Analyse Resultaten</h2>
                    <p className="text-slate-500 text-sm">{companyName}</p>
                  </div>
                </div>
                <button
                  onClick={() => { clearSession(); setStep(1); setMatches([]); setGeoResults({}); setOverallScore(null); }}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nieuwe analyse
                </button>
              </div>

              {/* Score Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* AI Visibility */}
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center gap-2 mb-3 opacity-90">
                    <Eye className="w-5 h-5" />
                    <span className="text-sm font-medium">AI Visibility</span>
                  </div>
                  <div className="text-5xl font-black mb-1">
                    {overallScore?.aiVisibility || 0}%
                  </div>
                  <p className="text-violet-200 text-sm">
                    {existingAiResults.filter(r => r.mentioned).length} van {existingAiResults.length} prompts vermeld
                  </p>
                </div>

                {/* GEO Score */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center gap-2 mb-3 opacity-90">
                    <Search className="w-5 h-5" />
                    <span className="text-sm font-medium">GEO Optimalisatie</span>
                  </div>
                  <div className="text-5xl font-black mb-1">
                    {overallScore?.geo || 0}%
                  </div>
                  <p className="text-blue-200 text-sm">
                    {Object.keys(geoResults).length} pagina's geanalyseerd
                  </p>
                </div>

                {/* Total Score */}
                <div className={`bg-gradient-to-br ${
                  (overallScore?.overall || 0) >= 70 ? 'from-emerald-500 to-green-600' :
                  (overallScore?.overall || 0) >= 50 ? 'from-amber-500 to-orange-600' :
                  'from-red-500 to-rose-600'
                } rounded-2xl p-6 text-white shadow-xl`}>
                  <div className="flex items-center gap-2 mb-3 opacity-90">
                    <Award className="w-5 h-5" />
                    <span className="text-sm font-medium">Totaal Score</span>
                  </div>
                  <div className="text-5xl font-black mb-1">
                    {overallScore?.overall || 0}
                  </div>
                  <p className="text-white/80 text-sm">
                    van 100 punten
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{existingPrompts.length}</p>
                  <p className="text-xs text-slate-500">Prompts</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{matches.length}</p>
                  <p className="text-xs text-slate-500">Gekoppeld</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{Object.keys(geoResults).length}</p>
                  <p className="text-xs text-slate-500">Pagina's</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{Object.values(manualChecks).filter(v => v).length}</p>
                  <p className="text-xs text-slate-500">Autoriteit ✓</p>
                </div>
              </div>

              {/* Page Results Summary */}
              {Object.keys(geoResults).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-800">Pagina Scores</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {Object.entries(geoResults).map(([pageUrl, result]) => (
                      <div key={pageUrl} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600 truncate">
                            {pageUrl.replace(/^https?:\/\/[^\/]+/, '') || '/'}
                          </span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(result.score)}`}>
                          {result.score}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Report */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">📄 Download Volledig Rapport</h3>
                    <p className="text-indigo-200 text-sm">Professioneel PDF rapport met alle resultaten en aanbevelingen</p>
                  </div>
                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 disabled:opacity-50 transition shadow-lg cursor-pointer whitespace-nowrap"
                  >
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    {generating ? 'Genereren...' : 'Download PDF'}
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(4)} className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 cursor-pointer">
                  <ArrowLeft className="w-5 h-5" /> Vorige
                </button>
                <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 cursor-pointer">
                  Terug naar Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ============================================
// EXPORT WITH SUSPENSE WRAPPER
// ============================================
export default function GEOAnalysePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">GEO Analyse laden...</p>
        </div>
      </div>
    }>
      <GEOAnalyseContent />
    </Suspense>
  )
}
