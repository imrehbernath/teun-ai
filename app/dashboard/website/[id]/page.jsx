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
  Edit3
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

      let websiteData = {
        id: websiteId,
        name: '',
        website: null,
        category: null,
        platforms: {
          perplexity: { scans: [], mentions: 0, total: 0 },
          chatgpt: { scans: [], mentions: 0, total: 0 },
          google: { scans: [], mentions: 0, total: 0 }
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
            
            websiteData.platforms.chatgpt.scans.push({
              id: scan.id,
              date: scan.created_at || scan.scan_date,
              mentions: scan.found_count || 0,
              total: scan.total_queries || 0
            })
            websiteData.platforms.chatgpt.mentions += scan.found_count || 0
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
          const hasOverview = results.filter(r => r.hasAiOverview === true).length
          
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
      const response = await fetch('/api/google-ai/scan', {
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

  const totalMentions = website.platforms.perplexity.mentions + website.platforms.chatgpt.mentions + website.platforms.google.mentions
  const totalQueries = website.platforms.perplexity.total + website.platforms.chatgpt.total + website.platforms.google.total
  const overallScore = getScore(totalMentions, totalQueries)

  const latestPerplexity = website.platforms.perplexity.scans[0]
  const latestGoogle = website.platforms.google.scans[0]

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
                  Google AI scan
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

            {/* Google AI Tab */}
            <button
              onClick={() => setActiveTab('google')}
              className={`flex-1 px-4 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all cursor-pointer border-b-2 ${
                activeTab === 'google'
                  ? 'text-slate-900 border-blue-500 bg-blue-50' 
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${activeTab === 'google' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Google AI</span>
              <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                activeTab === 'google'
                  ? `${getScoreColor(getScore(website.platforms.google.mentions, website.platforms.google.total))} bg-white` 
                  : 'text-slate-500 bg-slate-100'
              }`}>
                {website.platforms.google.mentions}/{website.platforms.google.total}
              </span>
            </button>
          </div>

          <div className="p-4">
            {/* ChatGPT Tab */}
            {activeTab === 'chatgpt' && (
              <div>
                {website.platforms.chatgpt.scans.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Image src="/chatgpt-logo.png" alt="ChatGPT" width={40} height={40} className="mx-auto mb-2 opacity-30" />
                    <p>Nog geen ChatGPT scans</p>
                    <p className="text-sm">Gebruik de Chrome extensie</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>De Chrome extensie slaat alleen totaalscores op. Individuele prompt-resultaten komen binnenkort.</span>
                    </div>
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

            {/* Perplexity Tab */}
            {activeTab === 'perplexity' && (
              <div>
                {!latestPerplexity ? (
                  <div className="text-center py-8 text-slate-500">
                    <Image src="/perplexity-logo.svg" alt="Perplexity" width={40} height={40} className="mx-auto mb-2 opacity-30" />
                    <p>Nog geen Perplexity scans</p>
                    <Link href="/tools/ai-visibility" className="text-purple-600 hover:underline text-sm">
                      Start een scan →
                    </Link>
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
                                    {result.simulated_ai_response_snippet}
                                  </div>
                                )}
                                
                                {result.competitors_mentioned?.length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Concurrenten:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {result.competitors_mentioned.map((c, i) => (
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
                  <div className="text-center py-8 text-slate-500">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p>Nog geen Google AI scans</p>
                    <p className="text-sm mt-1">Scan je prompts hierboven</p>
                  </div>
                ) : (
                  <div>
                    {/* Scan header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <p className="text-sm text-slate-500">{formatDate(latestGoogle.date)}</p>
                        <p className="font-medium">{latestGoogle.mentions}/{latestGoogle.total} vermeldingen</p>
                        <p className="text-xs text-slate-500">{latestGoogle.hasOverview}/{latestGoogle.total} had AI Overview</p>
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
                        const hasOverview = result.hasAiOverview
                        
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
                              {!hasOverview && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Geen AI Overview</span>}
                              {hasOverview && (expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
                            </button>
                            
                            {expanded && hasOverview && (
                              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 bg-white/50 pt-3">
                                {result.textContent && (
                                  <div className="bg-white p-3 rounded-lg text-sm text-slate-600">
                                    <p className="text-xs text-slate-400 mb-1 uppercase">AI Overview</p>
                                    <p className="line-clamp-4">{result.textContent}</p>
                                  </div>
                                )}
                                
                                {result.references?.length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Bronnen in AI Overview:</p>
                                    <div className="space-y-1">
                                      {result.references.slice(0, 5).map((ref, i) => (
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
                                
                                {result.competitorsInSources?.length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Concurrenten in bronnen:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {result.competitorsInSources.map((c, i) => (
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
          </div>
        </div>

        {/* Action Button - Only GEO Optimalisatie */}
        <div className="mt-8 flex justify-center">
          <a
            href="https://www.onlinelabs.nl/skills/geo-optimalisatie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
          >
            GEO Optimalisatie <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>
  )
}
