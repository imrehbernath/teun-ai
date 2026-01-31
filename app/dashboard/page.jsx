'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Dashboard Components
import DashboardHeader from './components/DashboardHeader'
import WebsiteList from './components/WebsiteList'
import WebsiteDetailModal from './components/WebsiteDetailModal'
import EmptyState from './components/EmptyState'
import CTASection from './components/CTASection'
import ExtensionPromo from './components/ExtensionPromo'
import LoadingState from './components/LoadingState'

export default function DashboardPage() {
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
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [filter, setFilter] = useState('all') // all, best, recent
  const [deleteConfirm, setDeleteConfirm] = useState(null) // Website to delete
  
  const alertShownRef = useRef(false)
  const authSentRef = useRef(false)
  
  const router = useRouter()
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
              if (confirm('✅ Ingelogd!\n\nJe kan nu:\n1. Dit tabblad sluiten\n2. Teun.ai extensie opnieuw openen\n3. Je scan starten!\n\nKlik OK om te sluiten.')) {
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
      await loadDashboard(currentUser.id)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  const loadDashboard = async (userId) => {
    try {
      // Load Perplexity scans from tool_integrations
      const { data: integrations } = await supabase
        .from('tool_integrations')
        .select('*')
        .eq('user_id', userId)
        .not('commercial_prompts', 'is', null)
        .order('created_at', { ascending: false })

      // Load ChatGPT scans
      const { data: chatgptScans } = await supabase
        .from('chatgpt_scans')
        .select('*, chatgpt_query_results (*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Group scans by company/website
      const websiteMap = new Map()
      
      if (integrations) {
        integrations.forEach(scan => {
          const company = scan.company_name || scan.website || 'Onbekend'
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
              platforms: { perplexity: false, chatgpt: false, claude: false, google: false }
            })
          }
          
          const site = websiteMap.get(key)
          const prompts = scan.commercial_prompts || []
          const results = scan.scan_results || []
          const mentions = scan.total_mentions || 0
          
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
          site.totalMentions += mentions
          site.totalQueries += prompts.length || results.length
          
          // Add to score history
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
          const company = scan.company_name || 'Onbekend'
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
              platforms: { perplexity: false, chatgpt: false, claude: false, google: false }
            })
          }
          
          const site = websiteMap.get(key)
          const results = scan.chatgpt_query_results || []
          const mentions = results.filter(r => r.company_mentioned)?.length || 0
          
          site.scans.push({
            id: scan.id,
            type: 'chatgpt',
            date: scan.created_at,
            results,
            mentions,
            totalQueries: results.length
          })
          
          site.platforms.chatgpt = true
          site.totalMentions += mentions
          site.totalQueries += results.length
          
          // Add to score history
          const scanScore = results.length > 0 
            ? Math.round((mentions / results.length) * 100)
            : 0
          site.scoreHistory.push({
            date: scan.created_at,
            score: scanScore
          })
        })
      }

      // Calculate final scores and sort
      const websitesArray = Array.from(websiteMap.values()).map(site => {
        // Sort score history by date
        site.scoreHistory.sort((a, b) => new Date(a.date) - new Date(b.date))
        
        // Calculate current score
        site.currentScore = site.totalQueries > 0 
          ? Math.round((site.totalMentions / site.totalQueries) * 100)
          : 0
        
        // Calculate score change (last vs previous)
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

      setWebsites(websitesArray)

      // Calculate overall stats
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
    if (user) loadDashboard(user.id)
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
  }

  const handleDeleteScan = async (scanId) => {
    try {
      // Determine scan type and delete from appropriate table
      // First try tool_integrations (Perplexity scans)
      const { error: intError } = await supabase
        .from('tool_integrations')
        .delete()
        .eq('id', scanId)
        .eq('user_id', user.id)

      if (intError) {
        // Try chatgpt_scans table
        const { error: chatError } = await supabase
          .from('chatgpt_scans')
          .delete()
          .eq('id', scanId)
          .eq('user_id', user.id)

        if (chatError) {
          console.error('Error deleting scan:', chatError)
          alert('Er ging iets mis bij het verwijderen. Probeer het opnieuw.')
          return
        }
      }

      // Reload dashboard
      await loadDashboard(user.id)
      
      // Update selected website if it still exists
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
      alert('Er ging iets mis bij het verwijderen.')
    }
  }

  const handleStartScanWithPrompts = ({ companyName, category, website, prompts }) => {
    // Build URL with all data as query parameters
    const params = new URLSearchParams()
    
    if (companyName) params.set('company', companyName)
    if (category) params.set('category', category)
    if (website) params.set('website', website)
    
    // Join prompts as comma-separated keywords for the AI Visibility tool
    if (prompts && prompts.length > 0) {
      // Store prompts in sessionStorage for AI Visibility to pick up
      sessionStorage.setItem('teun_custom_prompts', JSON.stringify(prompts))
      params.set('customPrompts', 'true')
    }
    
    params.set('autostart', 'false') // Don't auto-start, let user review
    
    router.push(`/tools/ai-visibility?${params.toString()}`)
  }

  const handleDeleteWebsite = async (website) => {
    setDeleteConfirm(website)
  }

  const confirmDeleteWebsite = async () => {
    if (!deleteConfirm) return

    try {
      console.log('🗑️ Deleting website:', deleteConfirm.name)
      console.log('📊 Scans to delete:', deleteConfirm.scans)

      let deletedCount = 0
      let failedCount = 0

      // Delete all scans for this website
      for (const scan of deleteConfirm.scans) {
        console.log(`  Deleting scan ${scan.id} (${scan.type})...`)
        
        if (scan.type === 'perplexity') {
          // Use .select() to verify deletion actually happened
          const { data, error } = await supabase
            .from('tool_integrations')
            .delete()
            .eq('id', scan.id)
            .select()
          
          if (error) {
            console.error('❌ Error deleting perplexity scan:', error)
            failedCount++
          } else if (data && data.length > 0) {
            console.log('✅ Perplexity scan deleted:', data)
            deletedCount++
          } else {
            console.warn('⚠️ Perplexity scan NOT deleted (RLS policy blocked?)')
            failedCount++
          }
        } else if (scan.type === 'chatgpt') {
          const { data, error } = await supabase
            .from('chatgpt_scans')
            .delete()
            .eq('id', scan.id)
            .select()
          
          if (error) {
            console.error('❌ Error deleting chatgpt scan:', error)
            failedCount++
          } else if (data && data.length > 0) {
            console.log('✅ ChatGPT scan deleted:', data)
            deletedCount++
          } else {
            console.warn('⚠️ ChatGPT scan NOT deleted (RLS policy blocked?)')
            failedCount++
          }
        }
      }

      console.log(`📊 Results: ${deletedCount} deleted, ${failedCount} failed`)

      if (failedCount > 0 && deletedCount === 0) {
        alert(`Verwijderen mislukt! Mogelijk ontbreken de juiste database rechten. Check je Supabase RLS policies voor DELETE op tool_integrations.`)
        setDeleteConfirm(null)
        return
      }

      console.log('🔄 Reloading dashboard...')
      
      // Reload dashboard
      await loadDashboard(user.id)
      setDeleteConfirm(null)
      
      // Close detail modal if open for this website
      if (selectedWebsite?.id === deleteConfirm.id) {
        setSelectedWebsite(null)
      }
      
      console.log('✅ Website successfully deleted!')
    } catch (error) {
      console.error('❌ Error deleting website:', error)
      alert('Er ging iets mis bij het verwijderen: ' + error.message)
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
        // 'all' - keep default order (recent)
        break
    }
    
    return filtered
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return <LoadingState />
  }

  if (websites.length === 0) {
    return (
      <EmptyState 
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header with Stats */}
        <DashboardHeader 
          stats={stats}
          onRefresh={handleRefresh}
        />

        {/* Website List */}
        <WebsiteList 
          websites={getFilteredWebsites()}
          filter={filter}
          onFilterChange={handleFilterChange}
          onSelectWebsite={setSelectedWebsite}
          onDeleteWebsite={handleDeleteWebsite}
        />

        {/* CTA Section */}
        <CTASection />

        {/* Extension Promo */}
        {!extensionInstalled && (
          <ExtensionPromo 
            onShowInstructions={() => setShowInstructionsModal(true)}
          />
        )}
      </div>

      {/* Website Detail Modal */}
      {selectedWebsite && (
        <WebsiteDetailModal 
          website={selectedWebsite}
          onClose={() => setSelectedWebsite(null)}
          onDeleteScan={handleDeleteScan}
          onStartScanWithPrompts={handleStartScanWithPrompts}
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
                Chrome Extensie Installeren
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
                <h3 className="font-semibold text-slate-900 mb-3">Stap 1: Open Extensies</h3>
                <p className="text-slate-600 mb-3">Kopieer deze URL en plak in je Chrome adresbalk:</p>
                <div className="bg-white rounded-lg p-3 border border-slate-300 font-mono text-sm break-all">
                  chrome://extensions/?id=jjhjnmkanlmjhmobcgemjakkjdbkkfmk
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('chrome://extensions/?id=jjhjnmkanlmjhmobcgemjakkjdbkkfmk')
                    alert('✅ URL gekopieerd!')
                  }}
                  className="mt-3 px-4 py-2 bg-[#1E1E3F] text-white rounded-lg font-medium hover:bg-[#2D2D5F] transition cursor-pointer"
                >
                  📋 Kopieer URL
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>Zorg dat de extensie is ingeschakeld</li>
                <li>Open <strong>ChatGPT.com</strong> in een nieuw tabblad</li>
                <li>Klik op het <strong>Teun.ai icoon</strong> in je toolbar</li>
                <li>Vul je bedrijfsgegevens in en start de scan</li>
              </ol>

              <button
                onClick={() => setShowInstructionsModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg transition cursor-pointer"
              >
                Begrepen! 🚀
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Website verwijderen?</h3>
              <p className="text-slate-600 mb-6">
                Weet je zeker dat je <strong>{deleteConfirm.name}</strong> en alle bijbehorende scans ({deleteConfirm.scanCount} scans) wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  Annuleer
                </button>
                <button
                  onClick={confirmDeleteWebsite}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition cursor-pointer"
                >
                  Ja, verwijder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
