'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { 
  X, RefreshCw, ExternalLink, CheckCircle2, XCircle, Clock,
  TrendingUp, TrendingDown, BarChart3, Trash2, Edit3, Copy,
  Check, MessageSquare, ChevronDown, ChevronUp, Plus, Save,
  Loader2, Zap
} from 'lucide-react'
import ScoreChart from './ScoreChart'
import { useTranslations, useLocale } from 'next-intl'

export default function WebsiteDetailModal({ website, onClose, onDeleteScan, onStartScanWithPrompts, onSavePrompts, onRefresh, initialTab = 'overview' }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  
  const [activeTab, setActiveTab] = useState(initialTab)
  const [expandedScan, setExpandedScan] = useState(null)
  const [editingPrompts, setEditingPrompts] = useState(null)
  const [editingScanId, setEditingScanId] = useState(null)
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
    if (score >= 70) return t('modal.scoreGood')
    if (score >= 40) return t('modal.scoreMedium')
    return t('modal.scoreLow')
  }

  const dateLocale = locale === 'nl' ? 'nl-NL' : 'en-GB'

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString(dateLocale, { 
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const formatShortDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
  }

  const getInitials = (name) => {
    return name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()
  }

  const getAllPrompts = () => {
    const prompts = []
    website.scans.forEach(scan => {
      if (scan.prompts && scan.prompts.length > 0) {
        scan.prompts.forEach(prompt => {
          if (!prompts.includes(prompt)) prompts.push(prompt)
        })
      }
      if (scan.results && scan.results.length > 0) {
        scan.results.forEach(result => {
          const promptText = result.ai_prompt || result.query || result.prompt
          if (promptText && !prompts.includes(promptText)) prompts.push(promptText)
        })
      }
    })
    return prompts
  }

  const getScanPrompts = (scan) => {
    const prompts = []
    if (scan.prompts && scan.prompts.length > 0) return scan.prompts
    if (scan.results && scan.results.length > 0) {
      scan.results.forEach(result => {
        const promptText = result.ai_prompt || result.query || result.prompt
        if (promptText) prompts.push(promptText)
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
    navigator.clipboard.writeText(getAllPrompts().join('\n'))
    setCopiedPrompt('all')
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const handleStartEditingPrompts = (scan) => {
    setEditedPrompts([...getScanPrompts(scan)])
    setEditingScanId(scan.id)
    setEditingPrompts('editing')
    setActiveTab('prompts')
  }

  const handleEditAllPrompts = () => {
    setEditedPrompts([...getAllPrompts()])
    const mostRecentScan = website.scans[0]
    setEditingScanId(mostRecentScan?.id || null)
    setEditingPrompts('editing')
  }

  const handlePromptChange = (index, value) => {
    const newPrompts = [...editedPrompts]
    newPrompts[index] = value
    setEditedPrompts(newPrompts)
  }

  const handleAddPrompt = () => setEditedPrompts([...editedPrompts, ''])
  const handleRemovePrompt = (index) => setEditedPrompts(editedPrompts.filter((_, i) => i !== index))

  const handleSavePrompts = async () => {
    const validPrompts = editedPrompts.filter(p => p.trim() !== '')
    if (validPrompts.length === 0) { alert(t('modal.addMinPrompt')); return }
    if (!editingScanId) { alert(t('modal.noScanFound')); return }

    setSaving(true)
    try {
      const response = await fetch('/api/prompts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: editingScanId, prompts: validPrompts })
      })
      const result = await response.json()
      
      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        if (onSavePrompts) onSavePrompts(editingScanId, validPrompts)
        setEditingPrompts(null)
        setEditedPrompts([])
        setEditingScanId(null)
      } else {
        alert(result.error || t('modal.saveError'))
      }
    } catch (error) {
      console.error('Save error:', error)
      alert(t('modal.savePromptsError'))
    } finally {
      setSaving(false)
    }
  }

  const handleRescanPrompts = () => {
    const validPrompts = editedPrompts.filter(p => p.trim() !== '')
    if (validPrompts.length === 0) { alert(t('modal.addMinPrompt')); return }

    const scanData = {
      companyName: website.name,
      companyCategory: website.category || (locale === 'nl' ? 'Algemeen' : 'General'),
      websiteUrl: website.website,
      customPrompts: validPrompts,
      fromDashboard: true
    }
    sessionStorage.setItem('pendingScan', JSON.stringify(scanData))
    window.location.href = '/tools/ai-visibility?step=3'
  }

  const handleCancelEditing = () => {
    setEditingPrompts(null)
    setEditedPrompts([])
    setEditingScanId(null)
  }

  const handleDeleteScan = (scanId) => {
    if (onDeleteScan) onDeleteScan(scanId)
    setConfirmDelete(null)
  }

  const platformStats = {
    perplexity: website.scans.filter(s => s.type === 'perplexity'),
    chatgpt: website.scans.filter(s => s.type === 'chatgpt'),
    google: website.scans.filter(s => s.type === 'google')
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:block opacity-90 pointer-events-none select-none">
            <Image src="/mascotte-teun-ai.png" alt="Teun" width={140} height={180} className="drop-shadow-lg" />
          </div>

          <div className="flex items-start justify-between mb-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                {getInitials(website.name)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{website.name}</h2>
                <p className="text-white/70">{website.website || website.category || 'Website'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition p-2 hover:bg-white/10 rounded-xl">
              <X className="w-6 h-6" />
            </button>
          </div>
          
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
                website.scoreChange > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {website.scoreChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {website.scoreChange > 0 ? '+' : ''}{website.scoreChange} {t('modal.points')}
              </div>
            )}
          </div>

          <p className="text-white/70 text-sm relative z-10">
            {getScoreLabel(website.currentScore)} • {t('modal.mentionsInQueries', { mentions: website.totalMentions, queries: website.totalQueries })}
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 -mb-8 relative z-10">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-t-xl font-medium text-sm transition-all ${
                activeTab === 'overview' ? 'bg-white text-slate-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {t('modal.tabOverview')}
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-4 py-2 rounded-t-xl font-medium text-sm transition-all flex items-center gap-2 ${
                activeTab === 'prompts' ? 'bg-white text-slate-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Prompts ({allPrompts.length})
            </button>
            <button
              onClick={() => setActiveTab('scans')}
              className={`px-4 py-2 rounded-t-xl font-medium text-sm transition-all ${
                activeTab === 'scans' ? 'bg-white text-slate-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {t('modal.tabHistory')} ({website.scans.length})
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="mb-8">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  Platform Performance
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'ChatGPT', key: 'chatgpt', icon: '💬', gradient: 'from-emerald-500 to-green-500', hasInfo: true },
                    { name: 'Perplexity', key: 'perplexity', icon: '🔍', gradient: 'from-purple-500 to-indigo-500' },
                    { name: 'Google AI', key: 'google', icon: '🌐', gradient: 'from-blue-500 to-indigo-500' }
                  ].map((platform) => {
                    const score = getPlatformScore(platformStats[platform.key])
                    const isActive = platformStats[platform.key].length > 0
                    
                    const getScanAction = () => {
                      if (platform.key === 'perplexity') {
                        return { type: 'link', href: `/tools/ai-visibility?company=${encodeURIComponent(website.name)}&website=${encodeURIComponent(website.website || '')}` }
                      }
                      if (platform.key === 'chatgpt') return { type: 'external', href: 'https://chatgpt.com' }
                      if (platform.key === 'google') {
                        return { type: 'action', action: () => onStartScanWithPrompts && onStartScanWithPrompts({ companyName: website.name, category: website.category, website: website.website, prompts: allPrompts, scanType: 'google' }) }
                      }
                      return null
                    }
                    const scanAction = getScanAction()
                    
                    return (
                      <div key={platform.key} className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg">{platform.icon}</span>
                          {isActive ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">{t('modal.free')}</span>
                          )}
                        </div>
                        <p className={`font-medium text-sm ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{platform.name}</p>
                        {isActive && score !== null ? (
                          <p className={`text-2xl font-bold mt-1 ${getScoreColor(score)}`}>{score}%</p>
                        ) : scanAction ? (
                          <div className="flex items-center gap-1 mt-2">
                            {scanAction.type === 'link' ? (
                              <Link href={scanAction.href} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-gradient-to-r ${platform.gradient} text-white hover:opacity-90 transition`}>
                                {t('modal.scanNow')}
                              </Link>
                            ) : scanAction.type === 'external' ? (
                              <>
                                <a href={scanAction.href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-gradient-to-r ${platform.gradient} text-white hover:opacity-90 transition`}>
                                  Open →
                                </a>
                                {platform.hasInfo && (
                                  <div className="relative group">
                                    <button className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center hover:bg-slate-300 transition">?</button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                      <p className="font-semibold mb-2">{t('modal.howDoesItWork')}</p>
                                      <ol className="list-decimal list-inside space-y-1 text-slate-200">
                                        <li>{t('modal.chatgptStep1')}</li>
                                        <li>{t('modal.chatgptStep2')}</li>
                                        <li>{t('modal.chatgptStep3')}</li>
                                        <li>Let the magic begin! ✨</li>
                                      </ol>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : scanAction.type === 'action' ? (
                              <button onClick={scanAction.action} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-gradient-to-r ${platform.gradient} text-white hover:opacity-90 transition`}>
                                {t('modal.scanNow')}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              {website.scoreHistory && website.scoreHistory.length > 1 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-slate-900 mb-4">{t('modal.scoreHistory')}</h3>
                  <div className="bg-slate-50 rounded-xl p-4 h-32">
                    <ScoreChart data={website.scoreHistory} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>{formatShortDate(website.scoreHistory[0]?.date)}</span>
                    <span>{formatShortDate(website.scoreHistory[website.scoreHistory.length - 1]?.date)}</span>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">{t('modal.tipTitle')}</h4>
                    <p className="text-sm text-slate-600">{t('modal.tipDesc')}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Prompts Tab */}
          {activeTab === 'prompts' && (
            <div>
              {editingPrompts === 'editing' ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">{t('modal.editPrompts')}</h3>
                    <span className="text-sm text-slate-500">{editedPrompts.length} prompts</span>
                  </div>

                  <p className="text-sm text-slate-500 mb-4">{t('modal.editPromptsDesc')}</p>

                  <div className="space-y-3 mb-6">
                    {editedPrompts.map((prompt, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-700 flex-shrink-0 mt-2">{idx + 1}</span>
                        <textarea
                          value={prompt}
                          onChange={(e) => handlePromptChange(idx, e.target.value)}
                          className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          rows={2}
                          placeholder={t('modal.promptPlaceholder')}
                        />
                        <button onClick={() => handleRemovePrompt(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1" title={t('modal.deletePrompt')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleAddPrompt} className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 mb-6">
                    <Plus className="w-4 h-4" />
                    {t('modal.addPrompt')}
                  </button>

                  <div className="flex flex-col gap-3">
                    {saveSuccess && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('modal.promptsSaved')}
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button onClick={handleSavePrompts} disabled={saving} className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> {t('modal.saving')}</>) : (<><Save className="w-4 h-4" /> {t('modal.saveOnly')}</>)}
                      </button>
                      <button onClick={handleRescanPrompts} className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4" />
                        Scan {editedPrompts.filter(p => p.trim()).length} Prompts
                      </button>
                    </div>
                    
                    <button onClick={handleCancelEditing} className="w-full px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all text-sm">
                      {t('modal.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">{t('modal.usedPrompts')}</h3>
                    <div className="flex gap-2">
                      <button onClick={handleCopyAllPrompts} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
                        {copiedPrompt === 'all' ? (<><Check className="w-4 h-4 text-green-600" /> {t('modal.copied')}</>) : (<><Copy className="w-4 h-4" /> {t('modal.copyAll')}</>)}
                      </button>
                      <button onClick={handleEditAllPrompts} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                        {t('modal.edit')}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-4">{t('modal.promptsDesc')}</p>

                  <div className="space-y-2 mb-6">
                    {allPrompts.map((prompt, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                        <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0 mt-0.5">{idx + 1}</span>
                        <p className="flex-1 text-slate-700 text-sm leading-relaxed">{prompt}</p>
                        <button onClick={() => handleCopyPrompt(prompt, idx)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white rounded-lg transition-all" title={t('modal.copyPrompt')}>
                          {copiedPrompt === idx ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  {allPrompts.length === 0 && (
                    <div className="text-center py-8 text-slate-500">{t('modal.noPrompts')}</div>
                  )}

                  {allPrompts.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                      <div className="flex items-start gap-3">
                        <Edit3 className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{t('modal.rescanTitle')}</h4>
                          <p className="text-sm text-slate-600 mb-4">{t('modal.rescanDesc')}</p>
                          <button onClick={handleEditAllPrompts} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                            <Edit3 className="w-4 h-4" />
                            {t('modal.editAndRescan')}
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
                {t('modal.allScans')}
              </h3>
              
              <div className="space-y-3">
                {website.scans.map((scan, idx) => {
                  const scanPrompts = getScanPrompts(scan)
                  const isExpanded = expandedScan === scan.id
                  
                  return (
                    <div key={idx} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setExpandedScan(isExpanded ? null : scan.id)}>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 text-xs rounded-lg font-medium ${scan.type === 'perplexity' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                            {scan.type === 'perplexity' ? 'Perplexity' : 'ChatGPT'}
                          </span>
                          <span className="text-sm text-slate-600">{formatDate(scan.date)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">{scan.totalQueries} queries</span>
                          <span className={`text-sm font-semibold ${scan.mentions > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                            {scan.mentions} {t('modal.mention', { count: scan.mentions })}
                          </span>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-200">
                          {scanPrompts.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{t('modal.usedPromptsLabel')}:</p>
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

                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                            <button onClick={() => handleStartEditingPrompts(scan)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                              <Edit3 className="w-4 h-4" />
                              {t('modal.editAndRestart')}
                            </button>
                            
                            {confirmDelete === scan.id ? (
                              <div className="flex items-center gap-2 ml-auto">
                                <span className="text-sm text-red-600">{t('modal.areYouSure')}</span>
                                <button onClick={() => handleDeleteScan(scan.id)} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                  {t('modal.yesDelete')}
                                </button>
                                <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors">
                                  {t('modal.cancel')}
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(scan.id)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto">
                                <Trash2 className="w-4 h-4" />
                                {t('modal.delete')}
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
            <Link href="/tools/ai-visibility" className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              <RefreshCw className="w-4 h-4" />
              {t('modal.newScan')}
            </Link>
            <a href="https://www.onlinelabs.nl/skills/geo-optimalisatie" target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              {t('modal.geoOptimization')}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
