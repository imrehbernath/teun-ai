'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Search,
  Globe,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
  Sparkles,
  Trash2,
  Plus,
  X,
  Edit3,
  BarChart3,
  AlertCircle
} from 'lucide-react'

export default function WebsiteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const websiteId = decodeURIComponent(params.id)
  
  const [loading, setLoading] = useState(true)
  const [website, setWebsite] = useState(null)
  const [user, setUser] = useState(null)
  const [expandedItems, setExpandedItems] = useState({})
  const [copiedPrompt, setCopiedPrompt] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [activeTab, setActiveTab] = useState('perplexity')
  const [scanning, setScanning] = useState(false)
  const [scanningOverview, setScanningOverview] = useState(false)
  const [showGeoPopup, setShowGeoPopup] = useState(false) // Popup for missing scans
  
  // Prompt editing
  const [editingPrompts, setEditingPrompts] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [originalPrompts, setOriginalPrompts] = useState([])
  const [newPrompt, setNewPrompt] = useState('')
  const [promptsModified, setPromptsModified] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingText, setEditingText] = useState('')
  
  const supabase = createClient()

  useEffect(() => {
    loadWebsiteData()
  }, [websiteId])

  const loadWebsiteData = async () => {
    try {
      setLoading(true)
      
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      const { data: integrations } = await supabase
        .from('tool_integrations')
        .select('*')
        .eq('user_id', currentUser.id)
        .not('commercial_prompts', 'is', null)
        .order('created_at', { ascending: false })

      const { data: chatgptScans } = await supabase
        .from('chatgpt_scans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      let googleScans = []
      const { data: googleData } = await supabase
        .from('google_ai_scans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      if (googleData) googleScans = googleData

      let googleOverviewScans = []
      const { data: googleOverviewData } = await supabase
        .from('google_ai_overview_scans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      if (googleOverviewData) googleOverviewScans = googleOverviewData

      let websiteData = {
        id: websiteId,
        name: '',
        website: null,
        category: null,
        platforms: {
          perplexity: { scans: [], mentions: 0, total: 0 },
          chatgpt: { scans: [], mentions: 0, total: 0 },
          google: { scans: [], mentions: 0, total: 0 },
          googleOverview: { scans: [], mentions: 0, total: 0 }
        },
        prompts: []
      }

      // Process Perplexity
      if (integrations) {
        integrations.forEach(scan => {
          const company = scan.company_name || scan.website || 'Onbekend'
          const key = company.toLowerCase().trim()
          
          if (key === websiteId) {
            if (!websiteData.name) {
              websiteData.name = company
              websiteData.website = scan.website
              websiteData.category = scan.company_category
            }
            
            const results = scan.results || []
            const scanPrompts = scan.commercial_prompts || []
            
            if (websiteData.prompts.length === 0) {
              websiteData.prompts = results.length > 0 
                ? results.map(r => r.ai_prompt || r.query || '').filter(Boolean)
                : scanPrompts.filter(Boolean)
            }
            
            const mentions = results.filter(r => r.company_mentioned === true).length
            
            websiteData.platforms.perplexity.scans.push({
              id: scan.id,
              date: scan.created_at,
              results,
              mentions,
              total: results.length || scanPrompts.length
            })
            websiteData.platforms.perplexity.mentions += mentions
            websiteData.platforms.perplexity.total += results.length || scanPrompts.length
          }
        })
      }

      // Process ChatGPT
      if (chatgptScans) {
        chatgptScans.forEach(scan => {
          const key = (scan.company_name || '').toLowerCase().trim()
          if (key === websiteId) {
            if (!websiteData.name) websiteData.name = scan.company_name
            
            // Map ChatGPT results to standard format (like Perplexity)
            const rawResults = scan.results || []
            const results = rawResults.map(r => ({
              query: r.query || '',
              company_mentioned: r.found || false,
              simulated_ai_response_snippet: r.full_response || r.response_preview || r.snippet || '',
              competitors_mentioned: r.competitors || [],
              sources_cited: r.sources || []
            }))
            
            const mentions = results.length > 0 
              ? results.filter(r => r.company_mentioned).length 
              : (scan.found_count || 0)
            const total = results.length > 0 
              ? results.length 
              : (scan.total_queries || 0)
            
            websiteData.platforms.chatgpt.scans.push({
              id: scan.id,
              date: scan.created_at || scan.scan_date,
              results,
              mentions,
              total
            })
            websiteData.platforms.chatgpt.mentions += mentions
            websiteData.platforms.chatgpt.total += total
            websiteData.platforms.chatgpt.total += scan.total_queries || 0
          }
        })
      }

      // Process Google AI
      googleScans.forEach(scan => {
        const key = (scan.company_name || '').toLowerCase().trim()
        if (key === websiteId) {
          if (!websiteData.name) websiteData.name = scan.company_name
          
          const results = scan.results || []
          const mentions = results.filter(r => r.companyMentioned === true).length
          const hasOverview = results.filter(r => r.hasAiOverview === true || r.hasAiResponse === true).length
          
          websiteData.platforms.google.scans.push({
            id: scan.id,
            date: scan.created_at,
            results,
            mentions,
            total: results.length || scan.total_queries || 0,
            hasOverview
          })
          websiteData.platforms.google.mentions += mentions
          websiteData.platforms.google.total += results.length || scan.total_queries || 0
        }
      })

      // Process Google AI Overviews
      googleOverviewScans.forEach(scan => {
        const key = (scan.company_name || '').toLowerCase().trim()
        if (key === websiteId) {
          if (!websiteData.name) websiteData.name = scan.company_name
          if (!websiteData.website && scan.website) websiteData.website = scan.website
          
          const results = scan.results || []
          const mentions = results.filter(r => r.companyMentioned === true).length
          const hasOverview = results.filter(r => r.hasAiOverview === true || r.hasAiResponse === true).length
          
          websiteData.platforms.googleOverview.scans.push({
            id: scan.id,
            date: scan.created_at,
            results,
            mentions,
            total: results.length || scan.total_queries || 0,
            hasOverview
          })
          websiteData.platforms.googleOverview.mentions += mentions
          websiteData.platforms.googleOverview.total += results.length || scan.total_queries || 0
        }
      })

      if (!websiteData.name) {
        router.push('/dashboard')
        return
      }

      setWebsite(websiteData)
      setPrompts(websiteData.prompts)
      setOriginalPrompts(websiteData.prompts)
      setPromptsModified(false)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const toggleExpand = (key) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const copyPrompt = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedPrompt(key)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const deleteScan = async (scanId, type) => {
    if (!confirm('Scan verwijderen?')) return
    setDeletingId(scanId)
    
    const table = type === 'perplexity' ? 'tool_integrations' 
                : type === 'chatgpt' ? 'chatgpt_scans' 
                : type === 'googleOverview' ? 'google_ai_overview_scans'
                : 'google_ai_scans'
    
    const { error } = await supabase.from(table).delete().eq('id', scanId)
    if (!error) await loadWebsiteData()
    else alert('Fout: ' + error.message)
    
    setDeletingId(null)
  }

  const addPrompt = () => {
    if (prompts.length >= 10) {
      alert('Maximum 10 prompts toegestaan')
      return
    }
    if (newPrompt.trim()) {
      setPrompts([...prompts, newPrompt.trim()])
      setNewPrompt('')
      setPromptsModified(true)
    }
  }

  const removePrompt = (index) => {
    setPrompts(prompts.filter((_, i) => i !== index))
    setPromptsModified(true)
  }

  const startEditPrompt = (index) => {
    setEditingIndex(index)
    setEditingText(prompts[index])
  }

  const saveEditPrompt = () => {
    if (editingText.trim() && editingIndex !== null) {
      const newPrompts = [...prompts]
      newPrompts[editingIndex] = editingText.trim()
      setPrompts(newPrompts)
      setPromptsModified(true)
    }
    setEditingIndex(null)
    setEditingText('')
  }

  const cancelEditPrompt = () => {
    setEditingIndex(null)
    setEditingText('')
  }

  const startPerplexityScan = () => {
    // Store prompts in sessionStorage
    sessionStorage.setItem('teun_custom_prompts', JSON.stringify(prompts))
    
    // Navigate with customPrompts=true flag + company info in URL
    const params = new URLSearchParams({
      customPrompts: 'true',
      company: website.name,
      category: website.category || ''
    })
    router.push(`/tools/ai-visibility?${params.toString()}`)
  }

  const startGoogleScan = async () => {
    if (prompts.length === 0) {
      alert('Voeg eerst prompts toe')
      return
    }
    
    setScanning(true)
    try {
      const response = await fetch('/api/scan-google-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: website.name,
          website: website.website,
          prompts
        })
      })
      const data = await response.json()
      if (data.success) {
        await loadWebsiteData()
        setActiveTab('google')
      } else {
        alert('Fout: ' + (data.error || 'Onbekend'))
      }
    } catch (e) {
      alert('Fout bij scannen')
    }
    setScanning(false)
  }

  const startGoogleOverviewScan = async () => {
    if (prompts.length === 0) {
      alert('Voeg eerst prompts toe')
      return
    }
    
    setScanningOverview(true)
    try {
      const response = await fetch('/api/scan-google-ai-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: website.name,
          website: website.website,
          prompts
        })
      })
      const data = await response.json()
      if (data.success) {
        await loadWebsiteData()
        setActiveTab('googleOverview')
      } else {
        alert('Fout: ' + (data.error || 'Onbekend'))
      }
    } catch (e) {
      alert('Fout bij scannen')
    }
    setScanningOverview(false)
  }

  // Highlight company name in text with bold styling
  const highlightCompanyName = (text, companyName) => {
    if (!text || !companyName) return text
    
    // Build variations to highlight
    const variations = [companyName]
    const noSpaces = companyName.replace(/\s+/g, '')
    if (noSpaces !== companyName) variations.push(noSpaces)
    
    // Sort longest first to avoid partial matches
    variations.sort((a, b) => b.length - a.length)
    
    // Escape regex chars and build pattern
    const pattern = variations
      .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')
    const regex = new RegExp(`(${pattern})`, 'gi')
    
    const parts = text.split(regex)
    if (parts.length === 1) return text
    
    return parts.map((part, i) => 
      regex.test(part) 
        ? <strong key={i} className="text-green-700 font-semibold">{part}</strong>
        : part
    )
  }

  // Filter out non-competitor items from competitor list
  const filterCompetitors = (competitors) => {
    const nonCompetitorPatterns = [
      // Review/vergelijkingssites
      /kliniekervaringen/i, /zorgkaart/i, /independer/i, /kieskeurig/i,
      /trustpilot/i, /google\s*reviews?/i, /reviewsite/i,
      // Verzekeraars
      /^vgz$/i, /^cz$/i, /^menzis$/i, /zilveren\s*kruis/i, /achmea/i, 
      /^ohra$/i, /nationale[\s-]?nederlanden/i, /^unive$/i, /^anwb$/i,
      // Overheid / instellingen
      /zorginstituut/i, /rijksoverheid/i, /overheid/i, /gemeente/i,
      /eerste\s*kamer/i, /tweede\s*kamer/i, /staten[\s-]?generaal/i,
      // Informatieve sites
      /poliswijzer/i, /consumentenbond/i, /thuisarts/i, /huisarts/i,
      /wikipedia/i, /gezondheidsplein/i,
      // Generieke termen
      /^je\s+ziekenhuis/i, /^andere\s+kliniek/i, /^specialisten\s+en/i,
      /\.nl$/i, /\.com$/i,  // Pure domain names
    ]
    
    return competitors.filter(c => {
      const trimmed = c.trim()
      if (trimmed.length < 3) return false
      return !nonCompetitorPatterns.some(pattern => pattern.test(trimmed))
    })
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('nl-NL', { 
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const getScore = (mentions, total) => total > 0 ? Math.round((mentions / total) * 100) : 0
  
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!website) return null

  const totalMentions = website.platforms.perplexity.mentions + website.platforms.chatgpt.mentions + website.platforms.google.mentions + website.platforms.googleOverview.mentions
  const totalQueries = website.platforms.perplexity.total + website.platforms.chatgpt.total + website.platforms.google.total + website.platforms.googleOverview.total
  const overallScore = getScore(totalMentions, totalQueries)

  const latestPerplexity = website.platforms.perplexity.scans[0]
  const latestGoogle = website.platforms.google.scans[0]
  const latestGoogleOverview = website.platforms.googleOverview.scans[0]
  const latestChatgpt = website.platforms.chatgpt.scans[0]

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Terug naar dashboard
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:block">
            <Image src="/mascotte-teun-ai.png" alt="Teun" width={120} height={150} className="drop-shadow-lg" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center font-bold text-lg">
              {website.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{website.name}</h1>
              <p className="text-white/60 text-sm">{website.website || website.category}</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">{overallScore}</span>
            <span className="text-2xl text-white/50">/100</span>
          </div>
          <p className="text-white/60 text-sm mt-2">
            {totalMentions} vermeldingen in {totalQueries} queries
          </p>
        </div>

        {/* Prompts Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-500" />
              AI Prompts ({prompts.length})
            </h2>
            <button
              onClick={() => setEditingPrompts(!editingPrompts)}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              {editingPrompts ? 'Klaar' : 'Bewerken'}
            </button>
          </div>

          {editingPrompts && (
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder={prompts.length >= 10 ? "Maximum bereikt" : "Nieuwe prompt toevoegen..."}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
                  onKeyDown={(e) => e.key === 'Enter' && addPrompt()}
                  disabled={prompts.length >= 10}
                />
                <button 
                  onClick={addPrompt} 
                  disabled={prompts.length >= 10}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">{prompts.length}/10 prompts</p>
            </div>
          )}

          {/* Prompts list - full text visible with inline editing */}
          <div className="space-y-2">
            {prompts.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">Geen prompts. Start een nieuwe scan.</p>
            ) : (
              prompts.map((prompt, i) => (
                <div 
                  key={i} 
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    editingPrompts 
                      ? 'bg-purple-50 border-purple-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-sm text-slate-500 font-medium min-w-[24px] pt-1">{i + 1}.</span>
                  
                  {editingIndex === i ? (
                    // Inline edit mode
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditPrompt()
                          if (e.key === 'Escape') cancelEditPrompt()
                        }}
                        autoFocus
                      />
                      <button 
                        onClick={saveEditPrompt}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={cancelEditPrompt}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <span 
                        className={`flex-1 text-sm text-slate-700 ${editingPrompts ? 'cursor-pointer hover:text-purple-600' : ''}`}
                        onClick={() => editingPrompts && startEditPrompt(i)}
                      >
                        {prompt}
                      </span>
                      {editingPrompts && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => startEditPrompt(i)}
                            className="p-1 text-slate-400 hover:text-purple-500 hover:bg-purple-100 rounded cursor-pointer"
                            title="Bewerken"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => removePrompt(i)} 
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer"
                            title="Verwijderen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Scan buttons - only show when prompts have been modified */}
          {promptsModified && prompts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-amber-600 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Prompts aangepast - scan opnieuw voor actuele resultaten
              </p>
              <div className="flex gap-2">
                <button
                  onClick={startPerplexityScan}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 flex items-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" /> Perplexity scan
                </button>
                <button
                  onClick={startGoogleScan}
                  disabled={scanning}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AI Modus scan
                </button>
                <button
                  onClick={startGoogleOverviewScan}
                  disabled={scanningOverview}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {scanningOverview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  AI Overviews scan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Platform Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="flex border-b border-slate-200">
            {/* ChatGPT Tab */}
            <button
              onClick={() => setActiveTab('chatgpt')}
              className={`flex-1 px-4 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all cursor-pointer border-b-2 ${
                activeTab === 'chatgpt'
                  ? 'text-slate-900 border-green-500 bg-green-50' 
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Image 
                src="/chatgpt-logo.png" 
                alt="ChatGPT" 
                width={20} 
                height={20} 
                className={activeTab === 'chatgpt' ? 'opacity-100' : 'opacity-50'}
              />
              <span>ChatGPT</span>
              <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                activeTab === 'chatgpt'
                  ? `${getScoreColor(getScore(website.platforms.chatgpt.mentions, website.platforms.chatgpt.total))} bg-white` 
                  : 'text-slate-500 bg-slate-100'
              }`}>
                {website.platforms.chatgpt.mentions}/{website.platforms.chatgpt.total}
              </span>
            </button>

            {/* Perplexity Tab */}
            <button
              onClick={() => setActiveTab('perplexity')}
              className={`flex-1 px-4 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all cursor-pointer border-b-2 ${
                activeTab === 'perplexity'
                  ? 'text-slate-900 border-purple-500 bg-purple-50' 
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Image 
                src="/perplexity-logo.svg" 
                alt="Perplexity" 
                width={20} 
                height={20} 
                className={activeTab === 'perplexity' ? 'opacity-100' : 'opacity-50'}
              />
              <span>Perplexity</span>
              <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                activeTab === 'perplexity'
                  ? `${getScoreColor(getScore(website.platforms.perplexity.mentions, website.platforms.perplexity.total))} bg-white` 
                  : 'text-slate-500 bg-slate-100'
              }`}>
                {website.platforms.perplexity.mentions}/{website.platforms.perplexity.total}
              </span>
            </button>

            {/* Google AI Modus Tab */}
            <button
              onClick={() => setActiveTab('google')}
              className={`flex-1 px-4 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all cursor-pointer border-b-2 ${
                activeTab === 'google'
                  ? 'text-slate-900 border-blue-500 bg-blue-50' 
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${activeTab === 'google' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>AI Modus</span>
              <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                activeTab === 'google'
                  ? `${getScoreColor(getScore(website.platforms.google.mentions, website.platforms.google.total))} bg-white` 
                  : 'text-slate-500 bg-slate-100'
              }`}>
                {website.platforms.google.mentions}/{website.platforms.google.total}
              </span>
            </button>

            {/* Google AI Overviews Tab */}
            <button
              onClick={() => setActiveTab('googleOverview')}
              className={`flex-1 px-4 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all cursor-pointer border-b-2 ${
                activeTab === 'googleOverview'
                  ? 'text-slate-900 border-emerald-500 bg-emerald-50' 
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Globe className={`w-5 h-5 ${activeTab === 'googleOverview' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>AI Overviews</span>
              <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                activeTab === 'googleOverview'
                  ? `${getScoreColor(getScore(website.platforms.googleOverview.mentions, website.platforms.googleOverview.total))} bg-white` 
                  : 'text-slate-500 bg-slate-100'
              }`}>
                {website.platforms.googleOverview.mentions}/{website.platforms.googleOverview.total}
              </span>
            </button>
          </div>

          <div className="p-4">
            {/* ChatGPT Tab */}
            {activeTab === 'chatgpt' && (
              <div>
                {website.platforms.chatgpt.scans.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Image src="/chatgpt-logo.png" alt="ChatGPT" width={32} height={32} />
                    </div>
                    <p className="font-medium text-slate-700 mb-1">Nog geen ChatGPT scans</p>
                    <p className="text-sm text-slate-500 mb-4">Check je zichtbaarheid in ChatGPT</p>
                    
                    <div className="space-y-3 max-w-sm mx-auto">
                      {/* Step 1: Chrome extensie */}
                      <a 
                        href="https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-600 transition shadow-md"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2"/>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        1. Installeer Chrome Extensie
                      </a>
                      
                      {/* Step 2: Open ChatGPT */}
                      <a 
                        href="https://chatgpt.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition text-sm"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.2 9.4c.4-1.2.2-2.5-.5-3.6-.7-1-1.8-1.7-3-1.9-.6-.1-1.2 0-1.8.2-.5-1.3-1.5-2.3-2.8-2.8-1.3-.5-2.8-.4-4 .3C9.4.6 8.2.2 7 .5c-1.2.3-2.3 1.1-2.9 2.2-.6 1.1-.7 2.4-.3 3.6-1.3.5-2.3 1.5-2.8 2.8s-.4 2.8.3 4c-1 .8-1.6 2-1.7 3.3-.1 1.3.4 2.6 1.4 3.5 1 .9 2.3 1.3 3.6 1.2.5 1.3 1.5 2.3 2.8 2.8 1.3.5 2.8.4 4-.3.8 1 2 1.6 3.3 1.7 1.3.1 2.6-.4 3.5-1.4.9-1 1.3-2.3 1.2-3.6 1.3-.5 2.3-1.5 2.8-2.8.5-1.3.4-2.8-.3-4 1-.8 1.6-2 1.7-3.3.1-1.3-.4-2.6-1.4-3.5z"/>
                        </svg>
                        2. Open ChatGPT
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    
                    <div className="mt-5 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-left max-w-sm mx-auto">
                      <p className="text-xs font-semibold text-emerald-800 mb-1">✨ Let the magic begin!</p>
                      <p className="text-xs text-emerald-700">
                        Na installatie: log in via de extensie en open ChatGPT. Zet ChatGPT op <strong>Instant</strong> (niet Thinking). Je resultaten worden automatisch opgeslagen.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Check if latest scan has detailed results */}
                    {latestChatgpt?.results?.length > 0 ? (
                      <>
                        {/* Scan header */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                          <div>
                            <p className="text-sm text-slate-500">{formatDate(latestChatgpt.date)}</p>
                            <p className="font-medium">{latestChatgpt.mentions}/{latestChatgpt.total} vermeldingen</p>
                          </div>
                          <button onClick={() => deleteScan(latestChatgpt.id, 'chatgpt')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            {deletingId === latestChatgpt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Results list */}
                        <div className="space-y-2">
                          {latestChatgpt.results.map((result, idx) => {
                            const key = `c-${idx}`
                            const expanded = expandedItems[key]
                            const mentioned = result.company_mentioned
                            
                            return (
                              <div key={idx} className={`rounded-lg border ${mentioned ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <button
                                  onClick={() => toggleExpand(key)}
                                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                                >
                                  {mentioned ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                  )}
                                  <span className="flex-1 text-sm text-slate-700">{result.query}</span>
                                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </button>
                                
                                {expanded && (
                                  <div className="px-4 pb-4 space-y-3 border-t border-slate-200 bg-white/50 pt-3">
                                    {result.simulated_ai_response_snippet && (
                                      <div className="bg-white p-3 rounded-lg text-sm text-slate-600">
                                        <p className="text-xs text-slate-400 mb-1 uppercase">ChatGPT antwoord</p>
                                        <p className="whitespace-pre-wrap">{highlightCompanyName(result.simulated_ai_response_snippet, website.name)}</p>
                                      </div>
                                    )}
                                    
                                    {filterCompetitors(result.competitors_mentioned || []).length > 0 && (
                                      <div>
                                        <p className="text-xs text-slate-500 mb-1">Concurrenten:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {filterCompetitors(result.competitors_mentioned || []).map((c, i) => (
                                            <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{c}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {result.sources_cited?.length > 0 && (
                                      <div>
                                        <p className="text-xs text-slate-500 mb-1">Bronnen:</p>
                                        {result.sources_cited.slice(0, 3).map((s, i) => (
                                          <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="block text-xs text-emerald-600 hover:underline truncate">
                                            <Globe className="w-3 h-3 inline mr-1" />{s}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                    
                                    <button
                                      onClick={(e) => { e.stopPropagation(); copyPrompt(result.query, key); }}
                                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                    >
                                      {copiedPrompt === key ? <><Check className="w-3 h-3 text-green-500" /> Gekopieerd</> : <><Copy className="w-3 h-3" /> Kopieer</>}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Older scans */}
                        {website.platforms.chatgpt.scans.length > 1 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-sm text-slate-500 mb-2">Eerdere scans:</p>
                            {website.platforms.chatgpt.scans.slice(1).map(scan => (
                              <div key={scan.id} className="flex items-center justify-between py-2 text-sm">
                                <span className="text-slate-600">{formatDate(scan.date)}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${getScoreColor(getScore(scan.mentions, scan.total))}`}>
                                    {scan.mentions}/{scan.total}
                                  </span>
                                  <button onClick={() => deleteScan(scan.id, 'chatgpt')} className="p-1 text-slate-400 hover:text-red-500">
                                    {deletingId === scan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Fallback: old-style summary for scans without detailed results */
                      <div className="space-y-3">
                        {website.platforms.chatgpt.scans.map(scan => (
                          <div key={scan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="font-medium text-slate-900">{scan.mentions}/{scan.total} vermeld</p>
                              <p className="text-sm text-slate-500">{formatDate(scan.date)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-lg font-bold ${getScoreColor(getScore(scan.mentions, scan.total))}`}>
                                {getScore(scan.mentions, scan.total)}%
                              </span>
                              <button onClick={() => deleteScan(scan.id, 'chatgpt')} className="p-1 text-slate-400 hover:text-red-500">
                                {deletingId === scan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Perplexity Tab */}
            {activeTab === 'perplexity' && (
              <div>
                {!latestPerplexity ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Image src="/perplexity-logo.svg" alt="Perplexity" width={32} height={32} />
                    </div>
                    <p className="font-medium text-slate-700 mb-1">Nog geen Perplexity scans</p>
                    <p className="text-sm text-slate-500 mb-4">Check je zichtbaarheid in Perplexity AI</p>
                    
                    <Link 
                      href={`/tools/ai-visibility?company=${encodeURIComponent(website.name)}&website=${encodeURIComponent(website.website || '')}`}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-indigo-600 transition shadow-md"
                    >
                      <Search className="w-5 h-5" />
                      Start Perplexity Scan
                    </Link>
                    
                    <p className="text-xs text-slate-400 mt-4">
                      ✨ Gratis scan met realtime resultaten
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Scan header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <p className="text-sm text-slate-500">{formatDate(latestPerplexity.date)}</p>
                        <p className="font-medium">{latestPerplexity.mentions}/{latestPerplexity.total} vermeldingen</p>
                      </div>
                      <button onClick={() => deleteScan(latestPerplexity.id, 'perplexity')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        {deletingId === latestPerplexity.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Results list */}
                    <div className="space-y-2">
                      {latestPerplexity.results.map((result, idx) => {
                        const key = `p-${idx}`
                        const expanded = expandedItems[key]
                        const mentioned = result.company_mentioned
                        
                        return (
                          <div key={idx} className={`rounded-lg border ${mentioned ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <button
                              onClick={() => toggleExpand(key)}
                              className="w-full px-4 py-3 flex items-center gap-3 text-left"
                            >
                              {mentioned ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                              )}
                              <span className="flex-1 text-sm text-slate-700">{result.ai_prompt || result.query}</span>
                              {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>
                            
                            {expanded && (
                              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 bg-white/50 pt-3">
                                {result.simulated_ai_response_snippet && (
                                  <div className="bg-white p-3 rounded-lg text-sm text-slate-600">
                                    <p className="text-xs text-slate-400 mb-1 uppercase">AI Response</p>
                                    <p className="whitespace-pre-wrap">{highlightCompanyName(result.simulated_ai_response_snippet, website.name)}</p>
                                  </div>
                                )}
                                
                                {filterCompetitors(result.competitors_mentioned || []).length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Concurrenten:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {filterCompetitors(result.competitors_mentioned || []).map((c, i) => (
                                        <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{c}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {result.sources_cited?.length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Bronnen:</p>
                                    {result.sources_cited.slice(0, 3).map((s, i) => (
                                      <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="block text-xs text-purple-600 hover:underline truncate">
                                        <Globe className="w-3 h-3 inline mr-1" />{s}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyPrompt(result.ai_prompt || result.query, key); }}
                                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                >
                                  {copiedPrompt === key ? <><Check className="w-3 h-3 text-green-500" /> Gekopieerd</> : <><Copy className="w-3 h-3" /> Kopieer</>}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Older scans */}
                    {website.platforms.perplexity.scans.length > 1 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500 mb-2">Eerdere scans:</p>
                        {website.platforms.perplexity.scans.slice(1).map(scan => (
                          <div key={scan.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-600">{formatDate(scan.date)}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{scan.mentions}/{scan.total}</span>
                              <button onClick={() => deleteScan(scan.id, 'perplexity')} className="p-1 text-slate-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Google AI Tab */}
            {activeTab === 'google' && (
              <div>
                {!latestGoogle ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="font-medium text-slate-700 mb-1">Nog geen Google AI Modus scans</p>
                    <p className="text-sm text-slate-500 mb-4">Scan je zichtbaarheid in Google AI Modus</p>
                    
                    <button
                      onClick={startGoogleScan}
                      disabled={scanning || prompts.length === 0}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Scannen...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Start Google AI Modus Scan
                        </>
                      )}
                    </button>
                    
                    {prompts.length === 0 && (
                      <p className="text-xs text-amber-600 mt-3">
                        ⚠️ Voeg eerst prompts toe bovenaan de pagina
                      </p>
                    )}
                    
                    <p className="text-xs text-slate-400 mt-4">
                      🔍 Scant {prompts.length} prompts in Google AI Modus
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Scan header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <p className="text-sm text-slate-500">{formatDate(latestGoogle.date)}</p>
                        <p className="font-medium">{latestGoogle.mentions}/{latestGoogle.total} vermeldingen</p>
                        <p className="text-xs text-slate-500">{latestGoogle.hasOverview}/{latestGoogle.total} had AI antwoord</p>
                      </div>
                      <button onClick={() => deleteScan(latestGoogle.id, 'google')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        {deletingId === latestGoogle.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Results list */}
                    <div className="space-y-2">
                      {latestGoogle.results.map((result, idx) => {
                        const key = `g-${idx}`
                        const expanded = expandedItems[key]
                        const mentioned = result.companyMentioned
                        const hasOverview = result.hasAiOverview || result.hasAiResponse
                        const textContent = result.textContent || result.aiResponse || ''
                        const references = result.references || result.sources || []
                        const competitors = result.competitorsInSources || result.competitorsMentioned || []
                        
                        return (
                          <div key={idx} className={`rounded-lg border ${
                            !hasOverview ? 'bg-slate-50 border-slate-200' :
                            mentioned ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <button
                              onClick={() => hasOverview && toggleExpand(key)}
                              className="w-full px-4 py-3 flex items-center gap-3 text-left"
                              disabled={!hasOverview}
                            >
                              {!hasOverview ? (
                                <span className="w-5 h-5 flex items-center justify-center text-slate-400 text-lg">—</span>
                              ) : mentioned ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                              )}
                              <span className={`flex-1 text-sm ${!hasOverview ? 'text-slate-400' : 'text-slate-700'}`}>
                                {result.query}
                              </span>
                              {!hasOverview && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Geen AI antwoord</span>}
                              {hasOverview && (expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
                            </button>
                            
                            {expanded && hasOverview && (
                              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 bg-white/50 pt-3">
                                {textContent && (
                                  <div className="bg-white p-3 rounded-lg text-sm text-slate-600">
                                    <p className="text-xs text-slate-400 mb-1 uppercase">AI Modus antwoord</p>
                                    <p className="whitespace-pre-wrap">{highlightCompanyName(textContent, website.name)}</p>
                                  </div>
                                )}
                                
                                {references.length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Bronnen ({references.length}):</p>
                                    <div className="space-y-1">
                                      {references.slice(0, 10).map((ref, i) => (
                                        <div key={i} className={`text-xs p-2 rounded flex items-center gap-2 ${ref.isCompany ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {ref.isCompany ? <CheckCircle2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                          <a href={ref.link} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                                            {ref.title || ref.source || ref.link}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {filterCompetitors(competitors).length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Concurrenten in bronnen:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {filterCompetitors(competitors).map((c, i) => (
                                        <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{c}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Older scans */}
                    {website.platforms.google.scans.length > 1 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500 mb-2">Eerdere scans:</p>
                        {website.platforms.google.scans.slice(1).map(scan => (
                          <div key={scan.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-600">{formatDate(scan.date)}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{scan.mentions}/{scan.total}</span>
                              <button onClick={() => deleteScan(scan.id, 'google')} className="p-1 text-slate-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Google AI Overviews Tab */}
            {activeTab === 'googleOverview' && (
              <div>
                {!latestGoogleOverview ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Globe className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="font-medium text-slate-700 mb-1">Nog geen AI Overviews scans</p>
                    <p className="text-sm text-slate-500 mb-4">Scan je zichtbaarheid in Google AI Overviews</p>
                    
                    <button
                      onClick={startGoogleOverviewScan}
                      disabled={scanningOverview || prompts.length === 0}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {scanningOverview ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Scannen...
                        </>
                      ) : (
                        <>
                          <Globe className="w-5 h-5" />
                          Start AI Overviews Scan
                        </>
                      )}
                    </button>
                    
                    {prompts.length === 0 && (
                      <p className="text-xs text-amber-600 mt-3">
                        ⚠️ Voeg eerst prompts toe bovenaan de pagina
                      </p>
                    )}
                    
                    <p className="text-xs text-slate-400 mt-4">
                      🔍 Scant {prompts.length} prompts in Google AI Overviews
                    </p>
                    <p className="text-xs text-purple-400 mt-1">
                      ✨ Prompts worden slim omgezet naar informatieve zoekopdrachten
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Scan header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <p className="text-sm text-slate-500">{formatDate(latestGoogleOverview.date)}</p>
                        <p className="font-medium">{latestGoogleOverview.mentions}/{latestGoogleOverview.total} vermeldingen</p>
                        <p className="text-xs text-slate-500">{latestGoogleOverview.hasOverview}/{latestGoogleOverview.total} had AI Overview</p>
                      </div>
                      <button onClick={() => deleteScan(latestGoogleOverview.id, 'googleOverview')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        {deletingId === latestGoogleOverview.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Smart query explanation */}
                    {latestGoogleOverview.results.some(r => r.searchQuery && r.searchQuery !== r.query) && (
                      <div className="mb-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg flex items-start gap-2">
                        <span className="text-sm mt-px">✨</span>
                        <p className="text-xs text-purple-600">
                          <span className="font-medium">Slimme zoekopdrachten</span> — Teun.ai past je prompts automatisch aan naar informatieve vragen die vaker AI Overviews triggeren in Google.
                        </p>
                      </div>
                    )}

                    {/* Results list */}
                    <div className="space-y-2">
                      {latestGoogleOverview.results.map((result, idx) => {
                        const key = `ov-${idx}`
                        const expanded = expandedItems[key]
                        const mentioned = result.companyMentioned
                        const hasOverview = result.hasAiOverview || result.hasAiResponse
                        const textContent = result.aiOverviewText || result.textContent || result.aiResponse || ''
                        const references = result.references || result.sources || []
                        const competitors = result.competitorsInSources || result.competitorsMentioned || []
                        
                        const hasTransform = result.searchQuery && result.searchQuery !== result.query
                        
                        return (
                          <div key={idx} className={`rounded-lg border ${
                            !hasOverview ? 'bg-slate-50 border-slate-200' :
                            mentioned ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <button
                              onClick={() => hasOverview && toggleExpand(key)}
                              className="w-full px-4 py-3 flex items-start gap-3 text-left"
                              disabled={!hasOverview}
                            >
                              {!hasOverview ? (
                                <span className="w-5 h-5 flex items-center justify-center text-slate-400 text-lg mt-0.5">—</span>
                              ) : mentioned ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm block ${!hasOverview ? 'text-slate-400' : 'text-slate-700'}`}>
                                  {result.query}
                                </span>
                                {hasTransform && (
                                  <span className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[11px]">✨</span>
                                    <span className="text-xs text-purple-500 font-medium">Slim gezocht:</span>
                                    <span className="text-xs text-purple-400 italic truncate">&ldquo;{result.searchQuery}&rdquo;</span>
                                  </span>
                                )}
                              </div>
                              {!hasOverview && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex-shrink-0">Geen AI Overview</span>}
                              {hasOverview && (expanded ? <ChevronUp className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />)}
                            </button>
                            
                            {expanded && hasOverview && (
                              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 bg-white/50 pt-3">
                                {textContent && (
                                  <div className="bg-white p-3 rounded-lg text-sm text-slate-600">
                                    <p className="text-xs text-slate-400 mb-1 uppercase">AI Overview</p>
                                    <p className="whitespace-pre-wrap">{highlightCompanyName(textContent, website.name)}</p>
                                  </div>
                                )}
                                
                                {references.length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Bronnen ({references.length}):</p>
                                    <div className="space-y-1">
                                      {references.slice(0, 10).map((ref, i) => (
                                        <div key={i} className={`text-xs p-2 rounded flex items-center gap-2 ${ref.isCompany ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {ref.isCompany ? <CheckCircle2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                          <a href={ref.link} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                                            {ref.title || ref.source || ref.link}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {filterCompetitors(competitors).length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Concurrenten in bronnen:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {filterCompetitors(competitors).map((c, i) => (
                                        <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{c}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyPrompt(textContent || result.query, key); }}
                                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                >
                                  {copiedPrompt === key ? <><Check className="w-3 h-3 text-green-500" /> Gekopieerd</> : <><Copy className="w-3 h-3" /> Kopieer</>}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Older scans */}
                    {website.platforms.googleOverview.scans.length > 1 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500 mb-2">Eerdere scans:</p>
                        {website.platforms.googleOverview.scans.slice(1).map(scan => (
                          <div key={scan.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-600">{formatDate(scan.date)}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{scan.mentions}/{scan.total}</span>
                              <button onClick={() => deleteScan(scan.id, 'googleOverview')} className="p-1 text-slate-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button - Open GEO Analyse (hidden while scanning) */}
        {!scanning && !scanningOverview && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => {
              // Check if all 3 platforms have been scanned
              const hasPerplexity = website.platforms.perplexity.scans.length > 0
              const hasChatgpt = website.platforms.chatgpt.scans.length > 0
              const hasGoogle = website.platforms.google.scans.length > 0
              const hasGoogleOverview = website.platforms.googleOverview.scans.length > 0
              
              if (hasPerplexity && hasChatgpt && hasGoogle && hasGoogleOverview) {
                // All scans done - navigate to GEO Analyse
                router.push(`/dashboard/geo-analyse?website=${encodeURIComponent(website.name)}`)
              } else {
                // Show popup
                setShowGeoPopup(true)
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg"
          >
            <BarChart3 className="w-5 h-5" />
            GEO Analyse
          </button>
        </div>
        )}

      </div>
      
      {/* Missing Scans Popup */}
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
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Scan eerst alle platforms</h3>
              <p className="text-slate-600 mb-6">
                Voor een complete GEO Analyse heb je scans nodig van alle AI platforms.
              </p>
              
              {/* Platform status */}
              <div className="space-y-2 mb-6 text-left">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${website.platforms.perplexity.scans.length > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {website.platforms.perplexity.scans.length > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={website.platforms.perplexity.scans.length > 0 ? 'text-green-700' : 'text-red-700'}>
                    Perplexity {website.platforms.perplexity.scans.length > 0 ? '✓' : '- nog niet gescand'}
                  </span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${website.platforms.chatgpt.scans.length > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {website.platforms.chatgpt.scans.length > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={website.platforms.chatgpt.scans.length > 0 ? 'text-green-700' : 'text-red-700'}>
                    ChatGPT {website.platforms.chatgpt.scans.length > 0 ? '✓' : '- nog niet gescand'}
                  </span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${website.platforms.google.scans.length > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {website.platforms.google.scans.length > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={website.platforms.google.scans.length > 0 ? 'text-green-700' : 'text-red-700'}>
                    Google AI Modus {website.platforms.google.scans.length > 0 ? '✓' : '- nog niet gescand'}
                  </span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${website.platforms.googleOverview.scans.length > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {website.platforms.googleOverview.scans.length > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={website.platforms.googleOverview.scans.length > 0 ? 'text-green-700' : 'text-red-700'}>
                    Google AI Overviews {website.platforms.googleOverview.scans.length > 0 ? '✓' : '- nog niet gescand'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setShowGeoPopup(false)}
                className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
              >
                Begrepen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
