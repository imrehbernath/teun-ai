'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search, Users, Eye, Globe, Download, ChevronLeft, ChevronRight, RefreshCw, BarChart3, Radar } from 'lucide-react'

const ADMIN_EMAIL = 'imre@onlinelabs.nl'

const TOOL_COLORS = {
  'GEO Analyse': 'bg-violet-50 text-violet-700',
  'Rank Tracker': 'bg-amber-50 text-amber-700',
  'Google AI Mode': 'bg-blue-50 text-blue-700',
  'Google AI Overviews': 'bg-sky-50 text-sky-700',
  'Brand Check': 'bg-rose-50 text-rose-700',
  'GEO Audit': 'bg-teal-50 text-teal-700',
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin — Alle Scans</h1>
            <p className="text-slate-500 mt-1">Leads en gescande websites van alle tools</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchScans}
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
                    <tr key={`${scan.id}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
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
                      <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(scan.created_at)}
                      </td>
                    </tr>
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
      </div>
    </div>
  )
}
