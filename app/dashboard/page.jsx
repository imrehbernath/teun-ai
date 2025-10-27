'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// NEW WOW Components
import GEOHeroStats from '@/app/components/dashboard/GEOHeroStats'
import CommercialPromptsList from '@/app/components/dashboard/CommercialPromptsList'
import PlatformPerformance from '@/app/components/dashboard/PlatformPerformance'
import GEOQuickActions from '@/app/components/dashboard/GEOQuickActions'
import ScanTimeline from '@/app/components/dashboard/ScanTimeline'
import CompetitorsLeaderboard from '@/app/components/dashboard/CompetitorsLeaderboard'

export default function DashboardPage() {
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [chatgptScans, setChatgptScans] = useState([])
  const [user, setUser] = useState(null)
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [latestScan, setLatestScan] = useState(null)
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const alertShownRef = useRef(false)  // ✅ Prevent double alert
  const authSentRef = useRef(false)     // ✅ Prevent double auth send
  
  // NEW: WOW Dashboard states
  const [commercialPrompts, setCommercialPrompts] = useState([])
  const [platformScans, setPlatformScans] = useState({
    perplexity: [],
    chatgpt: [],
    aiOverviews: []
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadDashboard()
    checkExtensionInstalled()
  }, [])

  // Separate effect for auth sending (needs user)
  useEffect(() => {
    if (user) {
      sendAuthToExtension()
    }
  }, [user])

  const checkExtensionInstalled = () => {
    // Check if extension is installed by looking for a custom attribute
    const checkInterval = setInterval(() => {
      if (document.documentElement.hasAttribute('data-teun-extension')) {
        setExtensionInstalled(true)
        clearInterval(checkInterval)
      }
    }, 1000)

    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000)
  }

  const sendAuthToExtension = async () => {
    try {
      // Check if opened from extension login
      const params = new URLSearchParams(window.location.search)
      
      console.log('=== sendAuthToExtension called ===')
      console.log('Params extension:', params.get('extension'))
      console.log('User exists:', !!user)
      console.log('User email:', user?.email || 'no email')
      console.log('Auth already sent:', authSentRef.current)
      
      if (params.get('extension') !== 'true') {
        console.log('ℹ️ Not from extension (no extension param)')
        return
      }
      
      if (!user) {
        console.log('ℹ️ No user yet, skipping auth send')
        return
      }
      
      // CRITICAL: Prevent double auth send
      if (authSentRef.current) {
        console.log('⚠️ Auth already sent, skipping')
        return
      }
      
      authSentRef.current = true
      
      console.log('🔌 Sending auth to extension...')
      console.log('Chrome available:', !!window.chrome)
      console.log('Runtime available:', !!(window.chrome?.runtime))
      
      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        authSentRef.current = false  // Reset on error
        return
      }
      
      if (!session) {
        console.error('❌ No session found')
        authSentRef.current = false  // Reset on error
        return
      }
      
      console.log('✅ Session found, token length:', session.access_token?.length)
      
      if (!window.chrome || !chrome.runtime) {
        console.error('❌ Chrome runtime not available')
        authSentRef.current = false  // Reset on error
        return
      }
      
      console.log('📤 Sending message to extension...')
      
      chrome.runtime.sendMessage(
        'dpjeohkoadiajdggbippmhdbkpbflieg',
        {
          action: 'store_auth',
          token: session.access_token,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata
          }
        },
        (response) => {
          console.log('📥 Callback received')
          console.log('Response:', response)
          console.log('LastError:', chrome.runtime.lastError)
          
          if (chrome.runtime.lastError) {
            console.error('❌ Extension error:', chrome.runtime.lastError.message)
            authSentRef.current = false
          } else if (response?.success) {
            console.log('✅✅✅ Auth sent to extension successfully! ✅✅✅')
            
            if (!alertShownRef.current) {
              alertShownRef.current = true
              setTimeout(() => {
                const shouldClose = confirm('✅ Ingelogd!\n\nJe kan nu:\n1. Dit tabblad sluiten\n2. Teun.ai extensie opnieuw openen\n3. Je scan form invullen en starten!\n\nKlik OK om dit tabblad te sluiten.')
                if (shouldClose) {
                  window.close()
                }
              }, 500)
            }
          } else {
            console.warn('⚠️ Response received but not successful:', response)
            authSentRef.current = false
          }
        }
      )
    } catch (err) {
      console.error('❌ CRITICAL ERROR in sendAuthToExtension:', err)
      console.error('Error stack:', err.stack)
      authSentRef.current = false
    }
  }

  const checkAuthAndLoadDashboard = async () => {
    try {
      // Check authentication
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser) {
        // Redirect to login if not authenticated
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
      // Load tool_integrations (Perplexity scans)
      const { data: integrations, error: intError } = await supabase
        .from('tool_integrations')
        .select('*')
        .eq('user_id', userId)
        .not('commercial_prompts', 'is', null)
        .order('created_at', { ascending: false })

      // Load ChatGPT extension scans (OPTIONAL - table may not exist!)
      const { data: chatgptScansData, error: chatgptError } = await supabase
        .from('chatgpt_scans')
        .select(`
          *,
          chatgpt_query_results (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Only throw on critical errors
      if (intError) throw intError
      
      // ChatGPT scans are optional - just warn if not available
      if (chatgptError) {
        console.warn('⚠️ ChatGPT scans not available (this is OK):', chatgptError.message)
      }

      // Set old states (for backward compatibility if needed)
      setRecentActivity(integrations || [])
      setChatgptScans(chatgptScansData || [])
      setLatestScan(integrations && integrations.length > 0 ? integrations[0] : null)

      // NEW: Process data for WOW dashboard
      const allPrompts = processCommercialPrompts(integrations || [], chatgptScansData || [])
      
      setCommercialPrompts(allPrompts)
      setPlatformScans({
        perplexity: integrations || [],
        chatgpt: chatgptScansData || [],
        aiOverviews: [] // Coming soon
      })

      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  // NEW: Process commercial prompts for unified view
  const processCommercialPrompts = (perplexityScans, chatgptScans) => {
    // Extract all unique commercial prompts
    const promptsMap = new Map()

    // Add prompts from Perplexity scans
    perplexityScans?.forEach(scan => {
      const prompts = Array.isArray(scan.commercial_prompts) 
        ? scan.commercial_prompts 
        : []
      
      const results = Array.isArray(scan.results) ? scan.results : []
      
      prompts.forEach(prompt => {
        if (!promptsMap.has(prompt)) {
          // Check if this prompt actually found the company in the results
          const resultForPrompt = results.find(r => r.ai_prompt === prompt)
          const wasFound = resultForPrompt?.company_mentioned === true
          
          // 🆕 Extract competitors from result
          const competitors = resultForPrompt?.competitors_mentioned || []
          
          promptsMap.set(prompt, {
            text: prompt,
            company: scan.company_name,
            platforms: {
              perplexity: { 
                status: wasFound ? 'found' : 'not_found',
                scanId: scan.id,
                competitors: competitors  // 🆕 Add competitors
              },
              chatgpt: { status: 'unknown' },
              aiOverviews: { status: 'coming_soon' }
            },
            scannedAt: scan.created_at
          })
        }
      })
    })

    // Add ChatGPT results to matching prompts
    chatgptScans?.forEach(scan => {
      scan.chatgpt_query_results?.forEach(result => {
        if (promptsMap.has(result.query)) {
          const prompt = promptsMap.get(result.query)
          prompt.platforms.chatgpt = {
            status: result.found ? 'found' : 'not_found',
            position: result.position,
            snippet: result.snippet,
            scanId: scan.id,
            resultId: result.id
          }
        } else {
          // Prompt was scanned in ChatGPT but not from Perplexity
          promptsMap.set(result.query, {
            text: result.query,
            company: scan.company_name,
            platforms: {
              perplexity: { status: 'unknown' },
              chatgpt: {
                status: result.found ? 'found' : 'not_found',
                position: result.position,
                snippet: result.snippet,
                scanId: scan.id,
                resultId: result.id
              },
              aiOverviews: { status: 'coming_soon' }
            },
            scannedAt: scan.created_at
          })
        }
      })
    })

    return Array.from(promptsMap.values())
      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
  }

  const handleRefresh = async () => {
    setLoading(true)
    if (user) {
      await loadDashboard(user.id)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold text-lg">Dashboard laden...</p>
        </div>
      </div>
    )
  }

  // Empty State - First Time User
  if (commercialPrompts.length === 0 && platformScans.chatgpt.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-gray-200 shadow-xl">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="text-7xl">🚀</span>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welkom bij Teun.ai GEO Platform!
            </h1>
            <p className="text-gray-600 text-xl mb-10 max-w-2xl mx-auto">
              Start met het ontdekken van commerciële prompts waar jouw bedrijf gevonden wordt 
              in AI-zoekmachines zoals Perplexity, ChatGPT en Google AI.
            </p>
            
            <div className="flex gap-6 justify-center flex-wrap mb-12">
              <button
                onClick={() => router.push('/tools/ai-visibility')}
                className="px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold text-xl hover:shadow-2xl transition-all flex items-center gap-4 group"
              >
                <span className="text-3xl">🔍</span>
                <div className="text-left">
                  <div>Ontdek Commercial Prompts</div>
                  <div className="text-sm opacity-90">Start met Perplexity scan</div>
                </div>
                <span className="group-hover:translate-x-2 transition-transform text-2xl">→</span>
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
                <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-3xl">💬</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Ontdek Prompts</h3>
                <p className="text-gray-600">
                  Vind commerciële vragen die mensen aan AI stellen over jouw branche
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200">
                <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Scan Platforms</h3>
                <p className="text-gray-600">
                  Test hoe je bedrijf gevonden wordt op Perplexity, ChatGPT en meer
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-3xl">✨</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Optimaliseer</h3>
                <p className="text-gray-600">
                  Krijg GEO-aanbevelingen om je visibility te maximaliseren
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main WOW Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Stats */}
        <GEOHeroStats 
          prompts={commercialPrompts}
          platformScans={platformScans}
        />

        {/* Quick Actions */}
        <GEOQuickActions 
          hasPrompts={commercialPrompts.length > 0}
          onRefresh={handleRefresh}
        />

        {/* Commercial Prompts List - THE STAR OF THE SHOW */}
        {commercialPrompts.length > 0 && (
          <CommercialPromptsList 
            prompts={commercialPrompts}
            onSelectPrompt={() => {}}
          />
        )}

        {/* 🆕 Competitors Leaderboard */}
        {commercialPrompts.length > 0 && (
          <CompetitorsLeaderboard 
            prompts={commercialPrompts}
            userCompany={user?.user_metadata?.company_name || commercialPrompts[0]?.company || 'Jouw Bedrijf'}
          />
        )}

        {/* Platform Performance Overview */}
        <PlatformPerformance 
          platformScans={platformScans}
          totalPrompts={commercialPrompts.length}
        />

        {/* Scan Timeline/History */}
        <ScanTimeline 
          perplexityScans={platformScans.perplexity}
          chatgptScans={platformScans.chatgpt}
        />

      </div>

      {/* Extension Instructions Modal - KEPT FROM ORIGINAL */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowInstructionsModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">🔌</span>
                Chrome Extensie Gebruiken
              </h2>
              <button 
                onClick={() => setShowInstructionsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-2 border-purple-200">
                <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                  <span>📋</span>
                  Stap 1: Open Extensies Pagina
                </h3>
                <p className="text-gray-700 mb-3">Kopieer deze URL en plak in je Chrome adresbalk:</p>
                <div className="bg-white rounded-lg p-4 border-2 border-purple-300 font-mono text-sm break-all select-all">
                  chrome://extensions/?id=dpjeohkoadiajdggbippmhdbkpbflieg
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('chrome://extensions/?id=dpjeohkoadiajdggbippmhdbkpbflieg')
                    alert('✅ URL gekopieerd!')
                  }}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  📋 Kopieer URL
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <span>✅</span>
                  Stap 2: Volg deze stappen
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li className="pl-2">Plak de gekopieerde URL in je Chrome adresbalk en druk <kbd className="px-2 py-1 bg-gray-100 rounded border">Enter</kbd></li>
                  <li className="pl-2">Zorg dat de <strong>"Teun.ai"</strong> extensie is ingeschakeld (toggle aan)</li>
                  <li className="pl-2">Open <strong>ChatGPT.com</strong> in een nieuw tabblad</li>
                  <li className="pl-2">Klik op het <strong>Teun.ai icoon</strong> in je Chrome toolbar (rechtsboven)</li>
                  <li className="pl-2">Log in (als je nog niet bent ingelogd)</li>
                  <li className="pl-2">Vul je bedrijfsnaam en prompts in</li>
                  <li className="pl-2">Klik <strong>"Start Scan"</strong> en zie live resultaten! 🎉</li>
                </ol>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <span>💡</span>
                  Tip
                </h4>
                <p className="text-blue-800 text-sm">
                  Als je de extensie niet ziet in je toolbar, klik op het <strong>puzzel icoon</strong> (🧩) rechtsboven in Chrome 
                  en pin de Teun.ai extensie vast.
                </p>
              </div>

              <button
                onClick={() => setShowInstructionsModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all"
              >
                Begrepen, laten we beginnen! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}