'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  X, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Trash2,
  Edit3,
  Copy,
  Check,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Loader2,
  Zap
} from 'lucide-react'
import ScoreChart from './ScoreChart'

export default function WebsiteDetailModal({ website, onClose, onDeleteScan, onStartScanWithPrompts, onSavePrompts, onRefresh, initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab) // overview, prompts, scans
  const [expandedScan, setExpandedScan] = useState(null)
  const [editingPrompts, setEditingPrompts] = useState(null)
  const [editingScanId, setEditingScanId] = useState(null) // Track which scan we're editing
  const [editedPrompts, setEditedPrompts] = useState([])
  const [copiedPrompt, setCopiedPrompt] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  const getScoreLabel = (score) => {
    if (score >= 70) return 'Goed zichtbaar'
    if (score >= 40) return 'Matig zichtbaar'
    return 'Weinig zichtbaar'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatShortDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  // Get all unique prompts from all scans
  const getAllPrompts = () => {
    const prompts = []
    website.scans.forEach(scan => {
      if (scan.prompts && scan.prompts.length > 0) {
        scan.prompts.forEach(prompt => {
          if (!prompts.includes(prompt)) {
            prompts.push(prompt)
          }
        })
      }
      if (scan.results && scan.results.length > 0) {
        scan.results.forEach(result => {
          const promptText = result.ai_prompt || result.query || result.prompt
          if (promptText && !prompts.includes(promptText)) {
            prompts.push(promptText)
          }
        })
      }
    })
    return prompts
  }

  // Get prompts for a specific scan
  const getScanPrompts = (scan) => {
    const prompts = []
    if (scan.prompts && scan.prompts.length > 0) {
      return scan.prompts
    }
    if (scan.results && scan.results.length > 0) {
      scan.results.forEach(result => {
        const promptText = result.ai_prompt || result.query || result.prompt
        if (promptText) {
          prompts.push(promptText)
        }
      })
    }
    return prompts
  }

  const handleCopyPrompt = (prompt, index) => {
    navigator.clipboard.writeText(prompt)
    setCopiedPrompt(index)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const handleCopyAllPrompts = () => {
    const allPrompts = getAllPrompts()
    navigator.clipboard.writeText(allPrompts.join('\n'))
    setCopiedPrompt('all')
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const handleStartEditingPrompts = (scan) => {
    const prompts = getScanPrompts(scan)
    setEditedPrompts([...prompts])
    setEditingScanId(scan.id) // Track which scan we're editing
    setEditingPrompts('editing')
    setActiveTab('prompts') // Switch to prompts tab
  }

  const handleEditAllPrompts = () => {
    const prompts = getAllPrompts()
    setEditedPrompts([...prompts])
    // Get the most recent scan ID for saving
    const mostRecentScan = website.scans[0]
    console.log('Most recent scan:', mostRecentScan)
    console.log('Scan ID:', mostRecentScan?.id)
    console.log('All scans:', website.scans)
    setEditingScanId(mostRecentScan?.id || null)
    setEditingPrompts('editing')
  }

  const handlePromptChange = (index, value) => {
    const newPrompts = [...editedPrompts]
    newPrompts[index] = value
    setEditedPrompts(newPrompts)
  }

  const handleAddPrompt = () => {
    setEditedPrompts([...editedPrompts, ''])
  }

  const handleRemovePrompt = (index) => {
    const newPrompts = editedPrompts.filter((_, i) => i !== index)
    setEditedPrompts(newPrompts)
  }

  // NEW: Save prompts to database without starting new scan
  const handleSavePrompts = async () => {
    const validPrompts = editedPrompts.filter(p => p.trim() !== '')
    if (validPrompts.length === 0) {
      alert('Voeg minimaal 1 prompt toe')
      return
    }

    if (!editingScanId) {
      alert('Geen scan gevonden om op te slaan')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/prompts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: editingScanId,
          prompts: validPrompts
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        
        // Call parent callback if provided
        if (onSavePrompts) {
          onSavePrompts(editingScanId, validPrompts)
        }
        
        // Exit edit mode
        setEditingPrompts(null)
        setEditedPrompts([])
        setEditingScanId(null)
      } else {
        alert(result.error || 'Fout bij opslaan')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Fout bij opslaan van prompts')
    } finally {
      setSaving(false)
    }
  }

  // Redirect to scanner tool with custom prompts
  const handleRescanPrompts = () => {
    const validPrompts = editedPrompts.filter(p => p.trim() !== '')
    if (validPrompts.length === 0) {
      alert('Voeg minimaal 1 prompt toe')
      return
    }

    // Store prompts and company data in sessionStorage for the scanner
    const scanData = {
      companyName: website.name,
      companyCategory: website.category || 'Algemeen',
      websiteUrl: website.website,
      customPrompts: validPrompts,
      fromDashboard: true
    }
    
    sessionStorage.setItem('pendingScan', JSON.stringify(scanData))
    
    // Redirect to scanner tool step 3 (prompts bevestigen)
    window.location.href = '/tools/ai-visibility?step=3'
  }

  // Legacy function for backwards compatibility
  const handleStartNewScanWithPrompts = () => {
    // Use the new rescan function instead
    handleRescanPrompts()
  }

  const handleCancelEditing = () => {
    setEditingPrompts(null)
    setEditedPrompts([])
    setEditingScanId(null)
  }

  const handleDeleteScan = (scanId) => {
    if (onDeleteScan) {
      onDeleteScan(scanId)
    }
    setConfirmDelete(null)
  }

  // Calculate platform-specific stats
  const platformStats = {
    perplexity: website.scans.filter(s => s.type === 'perplexity'),
    chatgpt: website.scans.filter(s => s.type === 'chatgpt'),
    claude: [],
    google: []
  }

  const getPlatformScore = (scans) => {
    if (scans.length === 0) return null
    const totalMentions = scans.reduce((acc, s) => acc + s.mentions, 0)
    const totalQueries = scans.reduce((acc, s) => acc + s.totalQueries, 0)
    return totalQueries > 0 ? Math.round((totalMentions / totalQueries) * 100) : 0
  }

  const allPrompts = getAllPrompts()

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Dark */}
        <div className="bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] p-6 sm:p-8 text-white flex-shrink-0 relative overflow-hidden">
          {/* Teun Mascotte - Rechts */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:block opacity-90 pointer-events-none select-none">
            <Image
              src="/mascotte-teun-ai.png"
              alt="Teun"
              width={140}
              height={180}
              className="drop-shadow-lg"
            />
          </div>

          <div className="flex items-start justify-between mb-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                {getInitials(website.name)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{website.name}</h2>
                <p className="text-white/70">
                  {website.website || website.category || 'Website'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/70 hover:text-white transition p-2 hover:bg-white/10 rounded-xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Main Score */}
          <div className="flex items-end gap-4 mb-4 relative z-10">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-1">AI Visibility Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-bold">{website.currentScore}</span>
                <span className="text-2xl text-white/50">/100</span>
              </div>
            </div>
            
            {website.scoreChange !== 0 && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                website.scoreChange > 0 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {website.scoreChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {website.scoreChange > 0 ? '+' : ''}{website.scoreChange} punten
              </div>
            )}
          </div>

          <p className="text-white/70 text-sm relative z-10">
            {getScoreLabel(website.currentScore)} • {website.totalMentions} vermeldingen in {website.totalQueries} AI-queries
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 -mb-8 relative z-10">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-t-xl font-medium text-sm transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Overzicht
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-4 py-2 rounded-t-xl font-medium text-sm transition-all flex items-center gap-2 ${
                activeTab === 'prompts'
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Prompts ({allPrompts.length})
            </button>
            <button
              onClick={() => setActiveTab('scans')}
              className={`px-4 py-2 rounded-t-xl font-medium text-sm transition-all ${
                activeTab === 'scans'
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Scan Historie ({website.scans.length})
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Platform Performance */}
              <div className="mb-8">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  Platform Performance
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { name: 'ChatGPT', key: 'chatgpt', color: 'green', icon: '💬' },
                    { name: 'Perplexity', key: 'perplexity', color: 'purple', icon: '🔍' },
                    { name: 'Claude', key: 'claude', color: 'orange', icon: '🤖' },
                    { name: 'Google AI', key: 'google', color: 'blue', icon: '🌐' }
                  ].map((platform) => {
                    const score = getPlatformScore(platformStats[platform.key])
                    const isActive = platformStats[platform.key].length > 0
                    
                    return (
                      <div 
                        key={platform.key}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive 
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm' 
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg">{platform.icon}</span>
                          {isActive ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-slate-400">Niet gescand</span>
                          )}
                        </div>
                        <p className={`font-medium text-sm ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                          {platform.name}
                        </p>
                        {isActive && score !== null && (
                          <p className={`text-2xl font-bold mt-1 ${getScoreColor(score)}`}>
                            {score}%
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Score History Chart */}
              {website.scoreHistory && website.scoreHistory.length > 1 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4">Score Historie (6 maanden)</h3>
                  <div className="bg-slate-50 rounded-xl p-4 h-32">
                    <ScoreChart data={website.scoreHistory} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>{formatShortDate(website.scoreHistory[0]?.date)}</span>
                    <span>{formatShortDate(website.scoreHistory[website.scoreHistory.length - 1]?.date)}</span>
                  </div>
                </div>
              )}

              {/* Tip Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Tip: Verbeter je score</h4>
                    <p className="text-sm text-slate-600">
                      Door je blog te optimaliseren voor AI-citaties en E-E-A-T signalen te versterken kun je 
                      significant beter scoren. Focus op thought leadership content en structured data.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Prompts Tab */}
          {activeTab === 'prompts' && (
            <div>
              {/* Editing Mode */}
              {editingPrompts === 'editing' ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">
                      Prompts Bewerken
                    </h3>
                    <span className="text-sm text-slate-500">
                      {editedPrompts.length} prompts
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mb-4">
                    Pas de prompts aan voor betere Nederlandse formuleringen. Deze worden gebruikt voor een nieuwe scan.
                  </p>

                  {/* Editable Prompts */}
                  <div className="space-y-3 mb-6">
                    {editedPrompts.map((prompt, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-700 flex-shrink-0 mt-2">
                          {idx + 1}
                        </span>
                        <textarea
                          value={prompt}
                          onChange={(e) => handlePromptChange(idx, e.target.value)}
                          className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          rows={2}
                          placeholder="Typ een commerciële zoekvraag..."
                        />
                        <button
                          onClick={() => handleRemovePrompt(idx)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                          title="Verwijder prompt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Prompt Button */}
                  <button
                    onClick={handleAddPrompt}
                    className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 mb-6"
                  >
                    <Plus className="w-4 h-4" />
                    Prompt Toevoegen
                  </button>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    {/* Save Success Message */}
                    {saveSuccess && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Prompts succesvol opgeslagen!
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      {/* Save Button - saves without starting new scan */}
                      <button
                        onClick={handleSavePrompts}
                        disabled={saving}
                        className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Opslaan...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Alleen Opslaan
                          </>
                        )}
                      </button>
                      
                      {/* Start Scan Button - Redirects to scanner tool */}
                      <button
                        onClick={handleRescanPrompts}
                        className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Scan {editedPrompts.filter(p => p.trim()).length} Prompts
                      </button>
                    </div>
                    
                    <button
                      onClick={handleCancelEditing}
                      className="w-full px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all text-sm"
                    >
                      Annuleer
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">
                      Gebruikte Prompts
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyAllPrompts}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        {copiedPrompt === 'all' ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            Gekopieerd!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Kopieer alle
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleEditAllPrompts}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Bewerken
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-4">
                    Dit zijn de commerciële prompts die gebruikt zijn om je AI-zichtbaarheid te testen.
                  </p>

                  {/* Prompts List */}
                  <div className="space-y-2 mb-6">
                    {allPrompts.map((prompt, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                      >
                        <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="flex-1 text-slate-700 text-sm leading-relaxed">
                          {prompt}
                        </p>
                        <button
                          onClick={() => handleCopyPrompt(prompt, idx)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white rounded-lg transition-all"
                          title="Kopieer prompt"
                        >
                          {copiedPrompt === idx ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  {allPrompts.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      Geen prompts gevonden voor deze website
                    </div>
                  )}

                  {/* Quick Edit CTA */}
                  {allPrompts.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                      <div className="flex items-start gap-3">
                        <Edit3 className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">Nieuwe scan met aangepaste prompts?</h4>
                          <p className="text-sm text-slate-600 mb-4">
                            Pas de prompts aan voor betere Nederlandse formuleringen en start een nieuwe scan.
                          </p>
                          <button
                            onClick={handleEditAllPrompts}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Prompts Bewerken & Nieuwe Scan
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Scans Tab */}
          {activeTab === 'scans' && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Alle Scans
              </h3>
              
              <div className="space-y-3">
                {website.scans.map((scan, idx) => {
                  const scanPrompts = getScanPrompts(scan)
                  const isExpanded = expandedScan === scan.id
                  
                  return (
                    <div 
                      key={idx} 
                      className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100"
                    >
                      {/* Scan Header */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setExpandedScan(isExpanded ? null : scan.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 text-xs rounded-lg font-medium ${
                            scan.type === 'perplexity' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {scan.type === 'perplexity' ? 'Perplexity' : 'ChatGPT'}
                          </span>
                          <span className="text-sm text-slate-600">
                            {formatDate(scan.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">
                            {scan.totalQueries} queries
                          </span>
                          <span className={`text-sm font-semibold ${
                            scan.mentions > 0 ? 'text-green-600' : 'text-slate-400'
                          }`}>
                            {scan.mentions} vermelding{scan.mentions !== 1 ? 'en' : ''}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-200">
                          {/* Prompts used in this scan */}
                          {scanPrompts.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                                Gebruikte prompts:
                              </p>
                              <div className="space-y-2">
                                {scanPrompts.map((prompt, pIdx) => (
                                  <div key={pIdx} className="flex items-start gap-2 text-sm">
                                    <span className="text-slate-400">{pIdx + 1}.</span>
                                    <span className="text-slate-700">{prompt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                            <button
                              onClick={() => handleStartEditingPrompts(scan)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              Bewerk & Herstart
                            </button>
                            
                            {confirmDelete === scan.id ? (
                              <div className="flex items-center gap-2 ml-auto">
                                <span className="text-sm text-red-600">Weet je het zeker?</span>
                                <button
                                  onClick={() => handleDeleteScan(scan.id)}
                                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  Ja, verwijder
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                  Annuleer
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(scan.id)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                              >
                                <Trash2 className="w-4 h-4" />
                                Verwijder
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/tools/ai-visibility"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Nieuwe Scan Starten
            </Link>
            <a
              href="https://www.onlinelabs.nl/skills/geo-optimalisatie"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              GEO Optimalisatie
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
