'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search, Users, Eye, Globe, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RefreshCw, BarChart3, Radar, Loader2, Crown, Calendar, Activity } from 'lucide-react'

const ADMIN_EMAIL = 'imre@onlinelabs.nl'

const TOOL_COLORS = {
  'GEO Analyse': 'bg-violet-50 text-violet-700',
  'Rank Tracker': 'bg-amber-50 text-amber-700',
  'Google AI Mode': 'bg-blue-50 text-blue-700',
  'Google AI Overviews': 'bg-sky-50 text-sky-700',
  'Brand Check': 'bg-rose-50 text-rose-700',
  'GEO Audit': 'bg-teal-50 text-teal-700',
}

const SUB_STATUS = {
  'active': { label: 'PRO', class: 'bg-emerald-50 text-emerald-700' },
  'canceling': { label: 'PRO (stopt)', class: 'bg-amber-50 text-amber-700' },
  'canceled': { label: 'Gestopt', class: 'bg-slate-100 text-slate-500' },
  'past_due': { label: 'Achterstallig', class: 'bg-red-50 text-red-600' },
}

export default function AdminScansPage() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [userId, setUserId] = useState(null)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalAccounts, setTotalAccounts] = useState(0)
  const [totalAnonymous, setTotalAnonymous] = useState(0)
  const [expandedScan, setExpandedScan] = useState(null)
  const [expandedPrompts, setExpandedPrompts] = useState(null)
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [activeTab, setActiveTab] = useState('scans') // scans | users
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userSearchInput, setUserSearchInput] = useState('')
  const [userSort, setUserSort] = useState('scans') // scans | lastSeen | created
  const limit = 30

  const supabase = createClient()
  const router = useRouter()

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/nl/dashboard')
        return
      }
      setUserId(user.id)
      setAuthorized(true)
    }
    checkAuth()
  }, [supabase, router])

  // Fetch scans
  const fetchScans = useCallback(async () => {
    if (!authorized || !userId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        source,
        userId,
        ...(search && { search })
      })
      const res = await fetch(`/api/admin/scans?${params}`)
      const data = await res.json()
      if (res.ok) {
        setScans(data.scans)
        setTotal(data.total)
        setTotalAccounts(data.totalAccounts)
        setTotalAnonymous(data.totalAnonymous)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    }
    setLoading(false)
  }, [authorized, userId, page, source, search])

  useEffect(() => {
    fetchScans()
  }, [fetchScans])

  // Search with debounce
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // CSV Export
  const exportCSV = () => {
    if (!scans.length) return
    const headers = ['Type', 'Tool', 'Website', 'Bedrijf', 'Categorie', 'E-mail', 'Gebruiker', 'IP', 'Vermeldingen', 'Prompts', 'Datum']
    const rows = scans.map(s => [
      s.type === 'account' ? 'Account' : 'Anoniem',
      s.tool || '',
      s.website || '',
      s.company_name || '',
      s.category || '',
      s.email || '',
      s.user_name || '',
      s.ip_address || '',
      s.mentions ?? '',
      s.prompts ?? '',
      new Date(s.created_at).toLocaleString('nl-NL')
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teun-ai-scans-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!authorized || !userId) return
    setLoadingUsers(true)
    try {
      const params = new URLSearchParams({
        userId,
        ...(userSearch && { search: userSearch })
      })
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('Users fetch error:', err)
    }
    setLoadingUsers(false)
  }, [authorized, userId, userSearch])

  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
  }, [activeTab, fetchUsers])

  // User search debounce
  useEffect(() => {
    const timer = setTimeout(() => setUserSearch(userSearchInput), 400)
    return () => clearTimeout(timer)
  }, [userSearchInput])

  // Sort users
  const sortedUsers = [...users].sort((a, b) => {
    if (userSort === 'scans') return b.totalScans - a.totalScans
    if (userSort === 'lastSeen') return new Date(b.lastSeen) - new Date(a.lastSeen)
    if (userSort === 'created') return new Date(b.createdAt) - new Date(a.createdAt)
    return 0
  })

  // Fetch prompt details for a scan
  const toggleExpandScan = async (scan) => {
    if (expandedScan === scan.id) {
      setExpandedScan(null)
      setExpandedPrompts(null)
      return
    }

    // Only GEO Analyse scans have prompts
    if (scan.tool !== 'GEO Analyse') {
      setExpandedScan(scan.id)
      setExpandedPrompts(null)
      return
    }

    setExpandedScan(scan.id)
    setLoadingPrompts(true)

    try {
      const params = new URLSearchParams({
        company: scan.company_name || '',
        website: scan.website || ''
      })
      const res = await fetch(`/api/admin/scan-prompts?${params}`)
      if (!res.ok) {
        setExpandedPrompts(null)
        setLoadingPrompts(false)
        return
      }
      const data = await res.json()
      setExpandedPrompts(data.prompts || null)
    } catch (err) {
      console.error('Prompt fetch error:', err)
      setExpandedPrompts(null)
    }
    setLoadingPrompts(false)
  }

  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
            <p className="text-slate-500 mt-1">Leads, scans en gebruikers</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={activeTab === 'scans' ? fetchScans : fetchUsers}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Vernieuwen
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#292956] rounded-lg hover:opacity-90 transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('scans')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition ${
              activeTab === 'scans'
                ? 'bg-white text-slate-900 shadow-sm font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Scans
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Gebruikers {users.length > 0 && `(${users.length})`}
          </button>
        </div>

        {/* ═══════════════════════════════ SCANS TAB ═══════════════════════════════ */}
        {activeTab === 'scans' && (
        <>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{total}</p>
                <p className="text-sm text-slate-500">Totaal scans</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalAccounts}</p>
                <p className="text-sm text-slate-500">Account scans</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalAnonymous}</p>
                <p className="text-sm text-slate-500">Anonieme scans</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Zoek op website, bedrijfsnaam of IP..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border-0 rounded-lg focus:ring-2 focus:ring-[#292956]/20 focus:bg-white transition"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {[
                { value: 'all', label: 'Alles' },
                { value: 'accounts', label: 'Accounts' },
                { value: 'anonymous', label: 'Anoniem' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSource(opt.value); setPage(1) }}
                  className={`px-3 py-1.5 text-sm rounded-md transition ${
                    source === opt.value
                      ? 'bg-white text-slate-900 shadow-sm font-medium'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#292956]"></div>
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              Geen scans gevonden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Tool</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Website</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Bedrijf</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Gebruiker</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Score</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan, i) => (
                    <React.Fragment key={`${scan.id}-${i}`}>
                    <tr 
                      onClick={() => toggleExpandScan(scan)}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          scan.type === 'account'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-cyan-50 text-cyan-700'
                        }`}>
                          {scan.type === 'account' ? 'Account' : 'Anoniem'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          TOOL_COLORS[scan.tool] || 'bg-slate-50 text-slate-600'
                        }`}>
                          {scan.tool}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {scan.website ? (
                          <a
                            href={scan.website.startsWith('http') ? scan.website : `https://${scan.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#292956] hover:underline font-medium"
                          >
                            {scan.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>
                          <p>{scan.company_name || <span className="text-slate-300">—</span>}</p>
                          {scan.category && (
                            <p className="text-xs text-slate-400">{scan.category}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {scan.type === 'account' && scan.email ? (
                          <div>
                            <p className="text-slate-700">{scan.user_name || '—'}</p>
                            <p className="text-xs text-slate-400">{scan.email}</p>
                          </div>
                        ) : scan.ip_address ? (
                          <span className="text-xs text-slate-400 font-mono">{scan.ip_address}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {scan.mentions != null ? (
                          <span className={`font-medium ${scan.mentions > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {scan.mentions}/{scan.prompts || 10}
                          </span>
                        ) : scan.positions ? (
                          <div className="text-xs">
                            {scan.positions.chatgpt && <span className="text-violet-600">GPT #{scan.positions.chatgpt}</span>}
                            {scan.positions.chatgpt && scan.positions.perplexity && <span className="text-slate-300 mx-1">|</span>}
                            {scan.positions.perplexity && <span className="text-cyan-600">PPX #{scan.positions.perplexity}</span>}
                            {!scan.positions.chatgpt && !scan.positions.perplexity && <span className="text-slate-300">—</span>}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs whitespace-nowrap">
                            {formatDate(scan.created_at)}
                          </span>
                          {scan.tool === 'GEO Analyse' && (
                            expandedScan === scan.id 
                              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Prompts */}
                    {expandedScan === scan.id && scan.tool === 'GEO Analyse' && (
                      <tr>
                        <td colSpan={7} className="bg-slate-50 px-4 py-4">
                          {loadingPrompts ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                            </div>
                          ) : expandedPrompts && expandedPrompts.length > 0 ? (
                            <div className="max-w-5xl space-y-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Prompts voor {scan.company_name}</p>
                              {expandedPrompts.map((prompt, j) => (
                                <div key={j} className="flex items-start gap-3 bg-white rounded-lg border border-slate-200 px-4 py-3">
                                  <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 text-right flex-shrink-0">{j + 1}.</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800">{prompt.text}</p>
                                    {(prompt.perplexityCompetitors.length > 0 || prompt.chatgptCompetitors.length > 0) && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {[...new Set([...prompt.perplexityCompetitors, ...prompt.chatgptCompetitors])].slice(0, 6).map((comp, k) => (
                                          <span key={k} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                            {comp}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1.5 flex-shrink-0">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prompt.perplexity ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                      PPX {prompt.perplexity ? '✓' : '✗'}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prompt.chatgpt ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                      GPT {prompt.chatgpt ? '✓' : '✗'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 text-center py-4">Geen prompt data beschikbaar voor deze scan.</p>
                          )}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Pagina {page} van {totalPages} ({total} resultaten)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {/* ═══════════════════════════════ USERS TAB ═══════════════════════════════ */}
        {activeTab === 'users' && (
        <>
        {/* User Search + Sort */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={userSearchInput}
                onChange={(e) => setUserSearchInput(e.target.value)}
                placeholder="Zoek op email, naam of bedrijf..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border-0 rounded-lg focus:ring-2 focus:ring-[#292956]/20 focus:bg-white transition"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {[
                { value: 'scans', label: 'Meeste scans' },
                { value: 'lastSeen', label: 'Laatst actief' },
                { value: 'created', label: 'Nieuwste eerst' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setUserSort(opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap ${
                    userSort === opt.value
                      ? 'bg-white text-slate-900 shadow-sm font-medium'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#292956]"></div>
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              Geen gebruikers gevonden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Gebruiker</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Bedrijf</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500">Totaal scans</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500">GEO</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500">Rank</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500">Audit</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Laatst actief</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Aangemeld</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => {
                    const sub = SUB_STATUS[user.subscriptionStatus]
                    return (
                      <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <p className="text-slate-900 font-medium">{user.name || '—'}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {user.company || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {sub ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sub.class}`}>
                              {user.isPro && <Crown className="w-3 h-3" />}
                              {sub.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500">
                              Gratis
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold text-lg ${user.totalScans > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                            {user.totalScans}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-sm ${user.geoScans > 0 ? 'text-violet-600 font-medium' : 'text-slate-300'}`}>
                            {user.geoScans}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-sm ${user.rankChecks > 0 ? 'text-amber-600 font-medium' : 'text-slate-300'}`}>
                            {user.rankChecks}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-sm ${user.geoAudits > 0 ? 'text-teal-600 font-medium' : 'text-slate-300'}`}>
                            {user.geoAudits}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs text-slate-600 whitespace-nowrap">{formatDate(user.lastSeen)}</p>
                          {user.lastLogin && user.lastLogin !== user.lastSeen && (
                            <p className="text-[10px] text-slate-400">Login: {formatDate(user.lastLogin)}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}

      </div>
    </div>
  )
}
