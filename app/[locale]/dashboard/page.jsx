'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter as useNextRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'

// Dashboard Components
import DashboardHeader from './components/DashboardHeader'
import WebsiteList from './components/WebsiteList'
import WebsiteDetailModal from './components/WebsiteDetailModal'
import EmptyState from './components/EmptyState'
import CTASection from './components/CTASection'
import ExtensionPromo from './components/ExtensionPromo'
import LoadingState from './components/LoadingState'

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [websites, setWebsites] = useState([])
  const [stats, setStats] = useState({
    totalSites: 0,
    avgScore: 0,
    totalScans: 0,
    bestPerformer: null,
    scansThisMonth: 0,
    scoreChange: 0
  })
  const [selectedWebsite, setSelectedWebsite] = useState(null)
  const [initialTab, setInitialTab] = useState('overview')
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showGeoPopup, setShowGeoPopup] = useState(false)
  const [isSharedView, setIsSharedView] = useState(false)
  const [sharedCompanies, setSharedCompanies] = useState([])
  
  const alertShownRef = useRef(false)
  const authSentRef = useRef(false)
  
  const router = useNextRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // ============================================
  // EFFECTS
  // ============================================
  
  useEffect(() => {
    checkAuthAndLoadDashboard()
    checkExtensionInstalled()
  }, [])

  useEffect(() => {
    if (user) {
      sendAuthToExtension()
    }
  }, [user])

  useEffect(() => {
    if (!loading && websites.length > 0) {
      const openWebsite = searchParams.get('openWebsite')
      const tab = searchParams.get('tab')
      
      if (openWebsite) {
        const website = websites.find(w => w.name === openWebsite)
        if (website) {
          setSelectedWebsite(website)
          if (tab) {
            setInitialTab(tab)
          }
          router.replace('/dashboard', { scroll: false })
        }
      }
    }
  }, [loading, websites, searchParams])

  // ============================================
  // EXTENSION HANDLING
  // ============================================

  const checkExtensionInstalled = () => {
    const checkInterval = setInterval(() => {
      if (document.documentElement.hasAttribute('data-teun-extension')) {
        setExtensionInstalled(true)
        clearInterval(checkInterval)
      }
    }, 1000)
    setTimeout(() => clearInterval(checkInterval), 5000)
  }

  const sendAuthToExtension = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('extension') !== 'true' || !user || authSentRef.current) return
      
      authSentRef.current = true
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || !window.chrome?.runtime) {
        authSentRef.current = false
        return
      }
      
      chrome.runtime.sendMessage(
        'jjhjnmkanlmjhmobcgemjakkjdbkkfmk',
        {
          action: 'store_auth',
          token: session.access_token,
          user: { id: user.id, email: user.email, user_metadata: user.user_metadata }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            authSentRef.current = false
          } else if (response?.success && !alertShownRef.current) {
            alertShownRef.current = true
            setTimeout(() => {
              if (confirm(t('page.extensionLoggedIn'))) {
                window.close()
              }
            }, 500)
          }
        }
      )
    } catch (err) {
      authSentRef.current = false
    }
  }

  // ============================================
  // DATA LOADING
  // ============================================

  const checkAuthAndLoadDashboard = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      if (error || !currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      const { data: sharedRows } = await supabase
        .from('shared_access')
        .select('*')
        .eq('client_email', currentUser.email)

      if (sharedRows && sharedRows.length > 0) {
        setIsSharedView(true)
        setSharedCompanies(sharedRows.map(s => s.company_name.toLowerCase().trim()))
        const ownerId = sharedRows[0].owner_id
        await loadDashboard(ownerId, sharedRows.map(s => s.company_name.toLowerCase().trim()))
      } else {
        await loadDashboard(currentUser.id)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  const loadDashboard = async (userId, sharedCompanyFilter = null) => {
    try {
      const { data: integrations } = await supabase
        .from('tool_integrations')
        .select('*')
        .eq('user_id', userId)
        .not('commercial_prompts', 'is', null)
        .order('created_at', { ascending: false })

      const { data: chatgptScans } = await supabase
        .from('chatgpt_scans')
        .select('*, chatgpt_query_results (*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      let googleScans = []
      const { data: googleData, error: googleError } = await supabase
        .from('google_ai_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!googleError && googleData) {
        googleScans = googleData
      }

      let googleOverviewScans = []
      const { data: overviewData, error: overviewError } = await supabase
        .from('google_ai_overview_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!overviewError && overviewData) {
        googleOverviewScans = overviewData
      }

      const websiteMap = new Map()
      const unknownLabel = locale === 'nl' ? 'Onbekend' : 'Unknown'
      
      if (integrations) {
        integrations.forEach(scan => {
          const company = scan.company_name || scan.website || unknownLabel
          const key = company.toLowerCase().trim()
          
          if (!websiteMap.has(key)) {
            websiteMap.set(key, {
              id: key,
              name: company,
              website: scan.website,
              category: scan.company_category,
              scans: [],
              scoreHistory: [],
              totalMentions: 0,
              totalQueries: 0,
              platforms: { perplexity: false, chatgpt: false, google: false, googleOverview: false }
            })
          }
          
          const site = websiteMap.get(key)
          const prompts = scan.commercial_prompts || []
          const results = scan.results || []
          
          let mentions = scan.total_company_mentions || scan.total_mentions || 0
          if (mentions === 0 && results.length > 0) {
            mentions = results.filter(r => r.company_mentioned === true).length
          }
          
          site.scans.push({
            id: scan.id,
            type: 'perplexity',
            date: scan.created_at,
            prompts,
            results,
            mentions,
            totalQueries: prompts.length || results.length
          })
          
          site.platforms.perplexity = true
          
          const scanResults = scan.results || scan.scan_results
          if (scanResults && typeof scanResults === 'object' && !Array.isArray(scanResults) && scanResults.chatgpt?.length > 0) {
            site.platforms.chatgpt = true
          } else if (Array.isArray(scanResults) && scanResults.some(r => r.platform === 'chatgpt')) {
            site.platforms.chatgpt = true
          }
          
          site.totalMentions += mentions
          site.totalQueries += prompts.length || results.length
          
          const scanScore = (prompts.length || results.length) > 0 
            ? Math.round((mentions / (prompts.length || results.length)) * 100)
            : 0
          site.scoreHistory.push({
            date: scan.created_at,
            score: scanScore
          })
        })
      }

      if (chatgptScans) {
        chatgptScans.forEach(scan => {
          const company = scan.company_name || unknownLabel
          const key = company.toLowerCase().trim()
          
          if (!websiteMap.has(key)) {
            websiteMap.set(key, {
              id: key,
              name: company,
              website: null,
              category: null,
              scans: [],
              scoreHistory: [],
              totalMentions: 0,
              totalQueries: 0,
              platforms: { perplexity: false, chatgpt: false, google: false, googleOverview: false }
            })
          }
          
          const site = websiteMap.get(key)
          const queryResults = scan.chatgpt_query_results || []
          const mentions = scan.found_count || queryResults.filter(r => r.company_mentioned)?.length || 0
          const totalQueries = scan.total_queries || queryResults.length || 0
          
          site.scans.push({
            id: scan.id,
            type: 'chatgpt',
            date: scan.created_at,
            results: queryResults,
            mentions,
            totalQueries
          })
          
          site.platforms.chatgpt = true
          site.totalMentions += mentions
          site.totalQueries += totalQueries
          
          const scanScore = totalQueries > 0 
            ? Math.round((mentions / totalQueries) * 100)
            : 0
          site.scoreHistory.push({
            date: scan.created_at,
            score: scanScore
          })
        })
      }

      if (googleScans) {
        googleScans.forEach(scan => {
          const company = scan.company_name || unknownLabel
          const key = company.toLowerCase().trim()
          
          if (!websiteMap.has(key)) {
            websiteMap.set(key, {
              id: key,
              name: company,
              website: scan.website,
              category: null,
              scans: [],
              scoreHistory: [],
              totalMentions: 0,
              totalQueries: 0,
              platforms: { perplexity: false, chatgpt: false, google: false, googleOverview: false }
            })
          }
          
          const site = websiteMap.get(key)
          const results = scan.results || []
          let mentions = scan.found_count || 0
          if (mentions === 0 && results.length > 0) {
            mentions = results.filter(r => r.companyMentioned === true).length
          }
          const totalQueries = results.length || scan.total_queries || 0
          
          site.scans.push({
            id: scan.id,
            type: 'google',
            date: scan.created_at,
            results,
            mentions,
            totalQueries
          })
          
          site.platforms.google = true
          site.totalMentions += mentions
          site.totalQueries += totalQueries
          
          const scanScore = totalQueries > 0 
            ? Math.round((mentions / totalQueries) * 100)
            : 0
          site.scoreHistory.push({
            date: scan.created_at,
            score: scanScore
          })
        })
      }

      if (googleOverviewScans) {
        googleOverviewScans.forEach(scan => {
          const company = scan.company_name || unknownLabel
          const key = company.toLowerCase().trim()
          
          if (!websiteMap.has(key)) {
            websiteMap.set(key, {
              id: key,
              name: company,
              website: scan.website,
              category: null,
              scans: [],
              scoreHistory: [],
              totalMentions: 0,
              totalQueries: 0,
              platforms: { perplexity: false, chatgpt: false, google: false, googleOverview: false }
            })
          }
          
          const site = websiteMap.get(key)
          if (!site.website && scan.website) site.website = scan.website
          const results = scan.results || []
          
          let mentions = scan.found_count || 0
          if (mentions === 0 && results.length > 0) {
            mentions = results.filter(r => r.companyMentioned === true).length
          }
          const totalQueries = results.length || scan.total_queries || 0
          
          site.scans.push({
            id: scan.id,
            type: 'googleOverview',
            date: scan.created_at,
            results,
            mentions,
            totalQueries
          })
          
          site.platforms.googleOverview = true
          site.totalMentions += mentions
          site.totalQueries += totalQueries
          
          const scanScore = totalQueries > 0 
            ? Math.round((mentions / totalQueries) * 100)
            : 0
          site.scoreHistory.push({
            date: scan.created_at,
            score: scanScore
          })
        })
      }

      let websitesArray = Array.from(websiteMap.values()).map(site => {
        site.scoreHistory.sort((a, b) => new Date(a.date) - new Date(b.date))
        site.currentScore = site.totalQueries > 0 
          ? Math.round((site.totalMentions / site.totalQueries) * 100)
          : 0
        
        if (site.scoreHistory.length >= 2) {
          const lastScore = site.scoreHistory[site.scoreHistory.length - 1].score
          const prevScore = site.scoreHistory[site.scoreHistory.length - 2].score
          site.scoreChange = lastScore - prevScore
        } else {
          site.scoreChange = 0
        }
        
        site.lastScan = site.scans[0]?.date
        site.scanCount = site.scans.length
        
        return site
      }).sort((a, b) => new Date(b.lastScan) - new Date(a.lastScan))

      if (sharedCompanyFilter && sharedCompanyFilter.length > 0) {
        websitesArray = websitesArray.filter(site => 
          sharedCompanyFilter.includes(site.id)
        )
      }

      setWebsites(websitesArray)

      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const scansThisMonth = websitesArray.reduce((acc, w) => 
        acc + w.scans.filter(s => new Date(s.date) >= thisMonth).length, 0)
      
      const totalScans = websitesArray.reduce((acc, w) => acc + w.scanCount, 0)
      const avgScore = websitesArray.length > 0 
        ? Math.round(websitesArray.reduce((acc, w) => acc + w.currentScore, 0) / websitesArray.length)
        : 0
      const bestPerformer = [...websitesArray].sort((a, b) => b.currentScore - a.currentScore)[0]
      const avgScoreChange = websitesArray.length > 0
        ? Math.round(websitesArray.reduce((acc, w) => acc + w.scoreChange, 0) / websitesArray.length)
        : 0

      setStats({
        totalSites: websitesArray.length,
        avgScore,
        totalScans,
        bestPerformer: bestPerformer?.name || null,
        bestScore: bestPerformer?.currentScore || 0,
        scansThisMonth,
        scoreChange: avgScoreChange
      })

      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  // ============================================
  // HANDLERS
  // ============================================

  const handleRefresh = () => {
    setLoading(true)
    if (user) {
      if (isSharedView && sharedCompanies.length > 0) {
        supabase
          .from('shared_access')
          .select('owner_id')
          .eq('client_email', user.email)
          .limit(1)
          .single()
          .then(({ data }) => {
            if (data) loadDashboard(data.owner_id, sharedCompanies)
            else loadDashboard(user.id)
          })
      } else {
        loadDashboard(user.id)
      }
    }
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
  }

  const handleDeleteScan = async (scanId) => {
    if (isSharedView) return
    try {
      const { error: intError } = await supabase
        .from('tool_integrations')
        .delete()
        .eq('id', scanId)
        .eq('user_id', user.id)

      if (intError) {
        const { error: chatError } = await supabase
          .from('chatgpt_scans')
          .delete()
          .eq('id', scanId)
          .eq('user_id', user.id)

        if (chatError) {
          const { error: googleError } = await supabase
            .from('google_ai_scans')
            .delete()
            .eq('id', scanId)
            .eq('user_id', user.id)
          
          if (googleError) {
            const { error: overviewError } = await supabase
              .from('google_ai_overview_scans')
              .delete()
              .eq('id', scanId)
              .eq('user_id', user.id)
            
            if (overviewError) {
              console.error('Error deleting scan:', overviewError)
              alert(t('page.deleteError'))
              return
            }
          }
        }
      }

      await loadDashboard(user.id)
      
      if (selectedWebsite) {
        const updatedWebsite = websites.find(w => w.id === selectedWebsite.id)
        if (updatedWebsite && updatedWebsite.scans.length > 0) {
          setSelectedWebsite(updatedWebsite)
        } else {
          setSelectedWebsite(null)
        }
      }
    } catch (error) {
      console.error('Error deleting scan:', error)
      alert(t('page.deleteErrorGeneric'))
    }
  }

  const handleStartScanWithPrompts = ({ companyName, category, website, prompts }) => {
    const params = new URLSearchParams()
    if (companyName) params.set('company', companyName)
    if (category) params.set('category', category)
    if (website) params.set('website', website)
    
    if (prompts && prompts.length > 0) {
      sessionStorage.setItem('teun_custom_prompts', JSON.stringify(prompts))
      params.set('customPrompts', 'true')
    }
    
    params.set('autostart', 'false')
    router.push(`/tools/ai-visibility?${params.toString()}`)
  }

  const handleSavePrompts = (scanId, newPrompts) => {
    setWebsites(prevWebsites => 
      prevWebsites.map(site => ({
        ...site,
        scans: site.scans.map(scan => 
          scan.id === scanId 
            ? { ...scan, prompts: newPrompts }
            : scan
        )
      }))
    )
    
    if (selectedWebsite) {
      setSelectedWebsite(prev => ({
        ...prev,
        scans: prev.scans.map(scan => 
          scan.id === scanId 
            ? { ...scan, prompts: newPrompts }
            : scan
        )
      }))
    }
  }

  const handleDeleteWebsite = async (website) => {
    if (isSharedView) return
    setDeleteConfirm(website)
  }

  const confirmDeleteWebsite = async () => {
    if (!deleteConfirm) return

    try {
      let deletedCount = 0
      let failedCount = 0

      for (const scan of deleteConfirm.scans) {
        if (scan.type === 'perplexity') {
          const { data, error } = await supabase
            .from('tool_integrations')
            .delete()
            .eq('id', scan.id)
            .select()
          
          if (error) { failedCount++ } 
          else if (data && data.length > 0) { deletedCount++ } 
          else { failedCount++ }
        } else if (scan.type === 'chatgpt') {
          const { data, error } = await supabase
            .from('chatgpt_scans')
            .delete()
            .eq('id', scan.id)
            .select()
          
          if (error) { failedCount++ } 
          else if (data && data.length > 0) { deletedCount++ } 
          else { failedCount++ }
        } else if (scan.type === 'google') {
          const { data, error } = await supabase
            .from('google_ai_scans')
            .delete()
            .eq('id', scan.id)
            .select()
          
          if (error) { failedCount++ } 
          else if (data && data.length > 0) { deletedCount++ } 
          else { failedCount++ }
        } else if (scan.type === 'googleOverview') {
          const { data, error } = await supabase
            .from('google_ai_overview_scans')
            .delete()
            .eq('id', scan.id)
            .select()
          
          if (error) { failedCount++ } 
          else if (data && data.length > 0) { deletedCount++ } 
          else { failedCount++ }
        }
      }

      if (failedCount > 0 && deletedCount === 0) {
        alert(t('page.deleteRlsError'))
        setDeleteConfirm(null)
        return
      }

      await loadDashboard(user.id)
      setDeleteConfirm(null)
      
      if (selectedWebsite?.id === deleteConfirm.id) {
        setSelectedWebsite(null)
      }
    } catch (error) {
      console.error('Error deleting website:', error)
      alert(t('page.deleteErrorMessage', { error: error.message }))
    }
  }

  const getFilteredWebsites = () => {
    let filtered = [...websites]
    switch (filter) {
      case 'best':
        filtered.sort((a, b) => b.currentScore - a.currentScore)
        break
      case 'recent':
        filtered.sort((a, b) => new Date(b.lastScan) - new Date(a.lastScan))
        break
      default:
        break
    }
    return filtered
  }

  const handleGeoAnalyseClick = () => {
    const hasCompleteWebsite = websites.some(w => 
      w.platforms?.perplexity && w.platforms?.chatgpt && w.platforms?.google && w.platforms?.googleOverview
    )
    
    if (hasCompleteWebsite) {
      router.push('/dashboard/geo-analyse')
    } else {
      setShowGeoPopup(true)
    }
  }

  const getPlatformStatus = () => {
    const hasPerplexity = websites.some(w => w.platforms?.perplexity)
    const hasChatgpt = websites.some(w => w.platforms?.chatgpt)
    const hasGoogle = websites.some(w => w.platforms?.google)
    const hasGoogleOverview = websites.some(w => w.platforms?.googleOverview)
    return { hasPerplexity, hasChatgpt, hasGoogle, hasGoogleOverview }
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return <LoadingState />
  }

  if (websites.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          <div className="hidden xl:block absolute -top-2 right-4 z-0">
            <Image 
              src="/Teun-ai-blij-met-resultaat.png" 
              alt={t('page.teunAlt')} 
              width={100} 
              height={125} 
              className="drop-shadow-xl opacity-90"
            />
          </div>

          {/* Navigation Menu */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E1E3F] text-white rounded-lg font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <button 
              onClick={handleGeoAnalyseClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-2 border-purple-200 rounded-lg font-medium text-sm hover:from-purple-100 hover:to-indigo-100 hover:border-purple-300 transition shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('page.geoAnalyse')}
            </button>
            <Link 
              href="/tools/geo-audit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-2 border-emerald-200 rounded-lg font-medium text-sm hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              GEO Audit
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{t('page.new')}</span>
            </Link>
          </div>

          <EmptyState 
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
        <div className="hidden xl:block absolute -top-2 right-4 z-0">
          <Image 
            src="/Teun-ai-blij-met-resultaat.png" 
            alt={t('page.teunAlt')} 
            width={100} 
            height={125} 
            className="drop-shadow-xl opacity-90"
          />
        </div>

        <DashboardHeader 
          stats={stats}
          onRefresh={handleRefresh}
        />

        {/* Navigation Menu */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E1E3F] text-white rounded-lg font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          <button 
            onClick={handleGeoAnalyseClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-2 border-purple-200 rounded-lg font-medium text-sm hover:from-purple-100 hover:to-indigo-100 hover:border-purple-300 transition shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('page.geoAnalyse')}
          </button>
          <Link 
            href="/tools/geo-audit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-2 border-emerald-200 rounded-lg font-medium text-sm hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            GEO Audit
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{t('page.new')}</span>
          </Link>
        </div>

        {/* Shared View Banner */}
        {isSharedView && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-blue-800 text-sm">
              {t('page.sharedViewBanner')}
            </p>
          </div>
        )}

        <WebsiteList 
          websites={getFilteredWebsites()}
          filter={filter}
          onFilterChange={handleFilterChange}
          onSelectWebsite={setSelectedWebsite}
          onDeleteWebsite={isSharedView ? null : handleDeleteWebsite}
        />

        {!isSharedView && <CTASection />}

        {!isSharedView && !extensionInstalled && (
          <ExtensionPromo 
            onShowInstructions={() => setShowInstructionsModal(true)}
          />
        )}
      </div>

      {/* Website Detail Modal */}
      {selectedWebsite && (
        <WebsiteDetailModal 
          website={selectedWebsite}
          onClose={() => {
            setSelectedWebsite(null)
            setInitialTab('overview')
          }}
          onDeleteScan={isSharedView ? null : handleDeleteScan}
          onStartScanWithPrompts={isSharedView ? null : handleStartScanWithPrompts}
          onSavePrompts={isSharedView ? null : handleSavePrompts}
          initialTab={initialTab}
        />
      )}

      {/* Extension Instructions Modal */}
      {showInstructionsModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowInstructionsModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <span className="text-3xl">🔌</span>
                {t('page.extensionInstallTitle')}
              </h2>
              <button 
                onClick={() => setShowInstructionsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3">{t('page.extensionStep1')}</h3>
                <p className="text-slate-600 mb-3">{t('page.extensionStep1Desc')}</p>
                <div className="bg-white rounded-lg p-3 border border-slate-300 font-mono text-sm break-all">
                  chrome://extensions/?id=jjhjnmkanlmjhmobcgemjakkjdbkkfmk
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('chrome://extensions/?id=jjhjnmkanlmjhmobcgemjakkjdbkkfmk')
                    alert(t('page.urlCopied'))
                  }}
                  className="mt-3 px-4 py-2 bg-[#1E1E3F] text-white rounded-lg font-medium hover:bg-[#2D2D5F] transition cursor-pointer"
                >
                  📋 {t('page.copyUrl')}
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>{t('page.extensionInstr1')}</li>
                <li>{t('page.extensionInstr2')}</li>
                <li>{t('page.extensionInstr3')}</li>
                <li>{t('page.extensionInstr4')}</li>
              </ol>

              <button
                onClick={() => setShowInstructionsModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg transition cursor-pointer"
              >
                {t('page.understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Website Confirm Modal */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t('page.deleteWebsiteTitle')}</h3>
              <p className="text-slate-600 mb-6">
                {t('page.deleteWebsiteDesc', { name: deleteConfirm.name, count: deleteConfirm.scanCount })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  {t('page.cancel')}
                </button>
                <button
                  onClick={confirmDeleteWebsite}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition cursor-pointer"
                >
                  {t('page.yesDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GEO Analyse Popup - Missing Scans */}
      {showGeoPopup && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowGeoPopup(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t('page.scanAllFirst')}</h3>
              <p className="text-slate-600 mb-6">
                {t('page.scanAllFirstDesc')}
              </p>
              
              <div className="space-y-2 mb-6 text-left">
                {(() => {
                  const status = getPlatformStatus()
                  const platforms = [
                    { key: 'hasPerplexity', name: 'Perplexity' },
                    { key: 'hasChatgpt', name: 'ChatGPT' },
                    { key: 'hasGoogle', name: 'AI Modus' },
                    { key: 'hasGoogleOverview', name: 'AI Overviews' }
                  ]
                  return platforms.map(p => (
                    <div key={p.key} className={`flex items-center gap-3 p-3 rounded-lg ${status[p.key] ? 'bg-green-50' : 'bg-red-50'}`}>
                      {status[p.key] ? (
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className={status[p.key] ? 'text-green-700' : 'text-red-700'}>
                        {p.name} {status[p.key] ? '✓' : `- ${t('page.notYetScanned')}`}
                      </span>
                    </div>
                  ))
                })()}
              </div>
              
              <button
                onClick={() => setShowGeoPopup(false)}
                className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                {t('page.understood')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
