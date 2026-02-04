'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, ArrowRight, Building2, FileSpreadsheet, Globe, 
  CheckCircle2, Loader2, Upload, Trash2, Plus, Search, 
  GripVertical, Link2, FileText, Download, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, Sparkles, Target,
  BarChart3, Shield, Zap, BookOpen, Database, MessageSquare,
  Eye, TrendingUp, Award, Pencil, Play, RefreshCw
} from 'lucide-react'
import Image from 'next/image'

// ============================================
// GEO CHECKLIST DATA
// ============================================
const GEO_CHECKLIST = {
  basisinformatie: {
    label: 'Basisinformatie',
    items: [
      { id: 'owner_info', label: 'Duidelijke eigenaar en bedrijfsinformatie', autoCheck: true },
      { id: 'contact_visible', label: 'Contactgegevens zichtbaar en vindbaar', autoCheck: true },
      { id: 'about_page', label: 'Over-ons pagina met team/auteurs', autoCheck: true },
      { id: 'nap_consistent', label: 'Consistente NAP (naam, adres, telefoon)', autoCheck: true },
    ]
  },
  technisch: {
    label: 'Technische Fundamenten',
    items: [
      { id: 'mobile_friendly', label: 'Mobielvriendelijk ontwerp', autoCheck: true },
      { id: 'https', label: 'HTTPS beveiliging actief', autoCheck: true },
      { id: 'core_web_vitals', label: 'Core Web Vitals geoptimaliseerd', autoCheck: false },
    ]
  },
  content: {
    label: 'Content Optimalisatie',
    items: [
      { id: 'clear_answers', label: 'Duidelijke antwoorden op zoekvragen', autoCheck: true },
      { id: 'headings', label: 'Duidelijke koppen (H1, H2, H3)', autoCheck: true },
      { id: 'faq_present', label: 'FAQ-secties of Q&A-structuur', autoCheck: true },
      { id: 'internal_links', label: 'Interne links naar relevante pagina\'s', autoCheck: true },
    ]
  },
  structured_data: {
    label: 'Structured Data & Metadata',
    items: [
      { id: 'jsonld', label: 'JSON-LD markup aanwezig', autoCheck: true },
      { id: 'title_meta', label: 'Titels en meta descriptions', autoCheck: true },
      { id: 'og_tags', label: 'Social media OG-tags', autoCheck: true },
    ]
  },
  autoriteit: {
    label: 'Autoriteit & Vertrouwen (handmatig)',
    items: [
      { id: 'directory_listings', label: 'Vermeldingen op directories', manual: true },
      { id: 'backlinks', label: 'Kwalitatieve backlinks', manual: true },
      { id: 'reviews', label: 'Reviews op Google/Trustpilot', manual: true },
      { id: 'social_profiles', label: 'Actieve social media profielen', manual: true },
    ]
  },
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function GEOAnalysePROPage() {
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
  
  // Step 4: GEO Checklist Scan
  const [geoScanning, setGeoScanning] = useState(false)
  const [geoScanProgress, setGeoScanProgress] = useState(0)
  const [geoResults, setGeoResults] = useState({}) // pageUrl -> { checklist, score, issues }
  const [manualChecks, setManualChecks] = useState({})
  
  // Step 5: Results
  const [overallScore, setOverallScore] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Session key for localStorage
  const SESSION_KEY = 'geo_analyse_session'

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

  // Auto-save session on changes
  useEffect(() => {
    if (step > 1 || matches.length > 0) {
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
    
    // Try to restore session first
    const savedSession = loadSession()
    if (savedSession && savedSession.companyName) {
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
    }
    
    await loadExistingWebsites(user.id)
    await checkGoogleConnection()
    setLoading(false)
  }

  // ============================================
  // LOAD EXISTING WEBSITES FROM DASHBOARD
  // ============================================
  const loadExistingWebsites = async (userId) => {
    try {
      // Load from tool_integrations (Perplexity scans) - includes AI results!
      const { data: integrations } = await supabase
        .from('tool_integrations')
        .select('*')
        .eq('user_id', userId)
        .not('commercial_prompts', 'is', null)
        .order('created_at', { ascending: false })

      // Load from chatgpt_scans
      const { data: chatgptScans } = await supabase
        .from('chatgpt_scans')
        .select('*, chatgpt_query_results(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      console.log('Loaded integrations:', integrations)

      // Deduplicate and combine
      const websiteMap = new Map()
      
      integrations?.forEach(scan => {
        const key = (scan.company_name || scan.website || '').toLowerCase().trim()
        if (key && !websiteMap.has(key)) {
          // Extract AI results - check multiple possible locations
          let aiResults = []
          
          // Try scan.results first (array of query results)
          if (Array.isArray(scan.results) && scan.results.length > 0) {
            aiResults = scan.results.map(r => ({
              prompt: r.query || r.prompt || '',
              mentioned: r.mentioned || r.company_mentioned || r.is_mentioned || false,
              mentionCount: r.mention_count || r.mentions_count || 0,
              competitors: r.competitors || r.competitors_mentioned || [],
              snippet: r.snippet || r.response_snippet || r.simulated_ai_response_snippet || ''
            }))
          }
          // Try scan.scan_results 
          else if (Array.isArray(scan.scan_results) && scan.scan_results.length > 0) {
            aiResults = scan.scan_results.map(r => ({
              prompt: r.query || r.prompt || '',
              mentioned: r.mentioned || r.company_mentioned || false,
              mentionCount: r.mention_count || 0,
              competitors: r.competitors || [],
              snippet: r.snippet || ''
            }))
          }
          // Fallback: create from commercial_prompts (no AI data yet)
          else if (Array.isArray(scan.commercial_prompts) && scan.commercial_prompts.length > 0) {
            aiResults = scan.commercial_prompts.map(prompt => ({
              prompt: prompt,
              mentioned: false, // Unknown - needs scan
              mentionCount: 0,
              competitors: [],
              snippet: ''
            }))
          }
          
          websiteMap.set(key, {
            name: scan.company_name || scan.website,
            website: scan.website,
            category: scan.company_category,
            prompts: scan.commercial_prompts || [],
            aiResults: aiResults,
            source: 'perplexity',
            hasRealAiData: Array.isArray(scan.results) && scan.results.length > 0
          })
        } else if (key && websiteMap.has(key)) {
          const existing = websiteMap.get(key)
          const newPrompts = scan.commercial_prompts || []
          existing.prompts = [...new Set([...existing.prompts, ...newPrompts])]
        }
      })

      chatgptScans?.forEach(scan => {
        const key = (scan.company_name || '').toLowerCase().trim()
        if (key && !websiteMap.has(key)) {
          const prompts = scan.chatgpt_query_results?.map(r => r.query) || []
          const aiResults = scan.chatgpt_query_results?.map(r => ({
            prompt: r.query,
            mentioned: r.mentioned || false,
            mentionCount: r.mention_count || 0,
            competitors: [],
            snippet: r.response_snippet || ''
          })) || []
          
          websiteMap.set(key, {
            name: scan.company_name,
            website: null,
            category: null,
            prompts,
            aiResults,
            source: 'chatgpt'
          })
        }
      })

      const websites = [...websiteMap.values()]
      setExistingWebsites(websites)
      
      // Auto-select first website if available
      if (websites.length > 0) {
        const firstSite = websites[0]
        setCompanyName(firstSite.name || '')
        setCompanyWebsite(firstSite.website || '')
        setCompanyCategory(firstSite.category || '')
        setExistingPrompts(firstSite.prompts || [])
        setExistingAiResults(firstSite.aiResults || [])
        setSelectedExistingWebsite(firstSite)
        // Initialize unmatched prompts
        setUnmatchedPrompts(firstSite.prompts || [])
      }
    } catch (error) {
      console.error('Error loading existing websites:', error)
    }
  }

  const selectExistingWebsite = (website) => {
    setSelectedExistingWebsite(website)
    setCompanyName(website.name || '')
    if (website.website) setCompanyWebsite(website.website)
    if (website.category) setCompanyCategory(website.category)
    setExistingPrompts(website.prompts || [])
    setExistingAiResults(website.aiResults || [])
    // Reset matching
    setUnmatchedPrompts(website.prompts || [])
    setMatches([])
    
    console.log('Selected website AI results:', website.aiResults)
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
    window.location.href = '/api/auth/google?returnUrl=/dashboard/geo-analyse'
  }

  const disconnectGoogle = async () => {
    if (!confirm('Weet je zeker dat je Google Search Console wilt ontkoppelen?')) return
    try {
      await fetch('/api/search-console/disconnect', { method: 'DELETE' })
      setGoogleConnected(false)
      setScProperties([])
      setSelectedProperty('')
      setScPages([])
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

  // ============================================
  // STEP 5: GEO CHECKLIST SCAN
  // ============================================
  const runGeoScan = async () => {
    const uniquePages = [...new Set(matches.map(m => m.page))]
    if (uniquePages.length === 0) return
    
    setGeoScanning(true)
    setGeoScanProgress(0)
    const results = {}
    
    for (let i = 0; i < uniquePages.length; i++) {
      const pageUrl = uniquePages[i]
      setGeoScanProgress(Math.round((i / uniquePages.length) * 100))
      
      try {
        const response = await fetch('/api/geo-scan-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: pageUrl })
        })
        
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
    }
    
    setGeoResults(results)
    setGeoScanProgress(100)
    setGeoScanning(false)
    
    // Calculate overall score
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
        a.download = `GEO-Rapport-${companyName.replace(/\s+/g, '-')}.docx`
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
                  GEO Analyse PRO
                  <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs rounded-full font-medium">BETA</span>
                </h1>
                <p className="text-sm text-slate-500">Complete AI zichtbaarheid & GEO optimalisatie analyse</p>
              </div>
            </div>
            <div className="hidden xl:block">
              <Image src="/images/teun-ai-mascotte.png" alt="Teun" width={80} height={100} className="opacity-80" />
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
                        const websiteName = selectedExistingWebsite?.name || companyName
                        router.push(`/dashboard?openWebsite=${encodeURIComponent(websiteName)}&tab=prompts`)
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
                  
                  {/* AI scan status */}
                  {existingAiResults.length > 0 && existingAiResults.some(r => r.mentioned !== undefined) ? (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-violet-500" />
                      <span className="text-violet-700">
                        AI Visibility: {existingAiResults.filter(r => r.mentioned).length}/{existingAiResults.length} vermeld
                      </span>
                    </div>
                  ) : (
                    <p className="text-amber-600 text-xs mt-3">
                      ⚠️ Geen AI scan resultaten - AI Visibility score zal 0% zijn
                    </p>
                  )}
                </div>
              )}
              
              {/* Manual input fields */}
              <div className="grid md:grid-cols-2 gap-4">
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
                <p className="text-blue-800 text-sm">
                  <strong>Tip:</strong> Sleep prompts naar de pagina die het beste bij die zoekvraag past. 
                  Klik op ✕ om een pagina te verwijderen.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Unmatched Prompts */}
                <div 
                  className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 min-h-[300px]"
                  onDragOver={handleDragOver}
                  onDrop={handleDropOnUnmatched}
                >
                  <h3 className="font-semibold text-slate-700 mb-3">🔍 Prompts ({unmatchedPrompts.length})</h3>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {unmatchedPrompts.map((prompt, i) => {
                      const result = existingAiResults.find(r => r.prompt === prompt)
                      return (
                        <div
                          key={i}
                          draggable
                          onDragStart={(e) => handleDragStart(e, prompt, 'unmatched')}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-grab active:cursor-grabbing ${
                            result?.mentioned ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                          }`}
                        >
                          <GripVertical className="w-4 h-4 text-slate-400" />
                          <span className="flex-1 text-sm text-slate-700 truncate">{prompt}</span>
                          {result?.mentioned && <span className="text-xs text-green-600">✓ AI</span>}
                        </div>
                      )
                    })}
                    {unmatchedPrompts.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-8">Alle prompts zijn gekoppeld!</p>
                    )}
                  </div>
                </div>

                {/* Pages to drop on */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700">📄 Pagina's ({scPages.length})</h3>
                    <span className="text-xs text-slate-500">Klik ✕ om te verwijderen</span>
                  </div>
                  {scPages.map((pageObj, i) => {
                    const pageUrl = pageObj.page
                    const matchedPrompts = matches.filter(m => m.page === pageUrl)
                    
                    return (
                      <div
                        key={i}
                        className="bg-white border-2 border-slate-200 rounded-xl p-3 hover:border-purple-300 transition group"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnPage(e, pageUrl)}
                      >
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                          <Globe className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-600 truncate flex-1">
                            {pageUrl.replace(/^https?:\/\/[^\/]+/, '')}
                          </span>
                          {/* Remove page button */}
                          <button 
                            onClick={() => removePage(pageUrl)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Pagina verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {matchedPrompts.length > 0 ? (
                          <div className="space-y-1">
                            {matchedPrompts.map((match, j) => (
                              <div
                                key={j}
                                draggable
                                onDragStart={(e) => handleDragStart(e, match.prompt, 'matched')}
                                className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded px-2 py-1.5 cursor-grab group/prompt"
                              >
                                <GripVertical className="w-3 h-3 text-purple-400" />
                                <span className="flex-1 text-xs text-slate-700 truncate">{match.prompt}</span>
                                <button onClick={() => removeMatch(match.prompt)} className="opacity-0 group-hover/prompt:opacity-100 text-red-500 cursor-pointer">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Sleep een prompt hierheen...</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 cursor-pointer">
                  <ArrowLeft className="w-5 h-5" /> Vorige
                </button>
                <button
                  onClick={() => { setStep(4); runGeoScan(); }}
                  disabled={matches.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Start GEO Scan <ArrowRight className="w-5 h-5" />
                </button>
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

              {geoScanning && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
                  <Loader2 className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-spin" />
                  <p className="text-orange-800 font-medium">Pagina's scannen...</p>
                  <div className="mt-4 h-2 bg-orange-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-600 transition-all duration-300" style={{ width: `${geoScanProgress}%` }} />
                  </div>
                </div>
              )}

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
                    <p className="text-indigo-200 text-sm">Professioneel DOCX rapport met alle resultaten en aanbevelingen</p>
                  </div>
                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 disabled:opacity-50 transition shadow-lg cursor-pointer whitespace-nowrap"
                  >
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    {generating ? 'Genereren...' : 'Download DOCX'}
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
