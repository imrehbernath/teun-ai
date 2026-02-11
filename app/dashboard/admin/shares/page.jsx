'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Users, Plus, Trash2, ExternalLink, Check, X, Copy, 
  Mail, Building2, Globe, Clock, Eye, Shield, ArrowLeft,
  CheckCircle2, AlertCircle, Loader2, Send
} from 'lucide-react'

export default function AdminSharesPage() {
  const router = useRouter()
  const [shares, setShares] = useState([])
  const [websites, setWebsites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Form state
  const [newEmail, setNewEmail] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedWebsite, setSelectedWebsite] = useState('')
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Check admin status & load shares
      const shareRes = await fetch('/api/admin/share-access')
      if (shareRes.status === 403) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      const shareData = await shareRes.json()
      setShares(shareData.shares || [])
      setIsAdmin(true)

      // Load websites from dashboard for company/project picker
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Load from websites table (has proper IDs for project scoping)
        const { data: websiteRows } = await supabase
          .from('websites')
          .select('id, company_name, website_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (websiteRows && websiteRows.length > 0) {
          setWebsites(websiteRows.map(w => ({
            id: w.id,
            company_name: w.company_name,
            website: w.website_url || ''
          })))
        } else {
          // Fallback: load from perplexity_scans
          const { data: scans } = await supabase
            .from('perplexity_scans')
            .select('company_name, website, website_url')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          const uniqueWebsites = []
          const seen = new Set()
          for (const scan of (scans || [])) {
            const key = (scan.company_name || '').toLowerCase().trim()
            if (key && !seen.has(key)) {
              seen.add(key)
              uniqueWebsites.push({
                id: null,
                company_name: scan.company_name,
                website: scan.website || scan.website_url || ''
              })
            }
          }
          setWebsites(uniqueWebsites)
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
    setLoading(false)
  }

  const handleShare = async () => {
    if (!newEmail || !selectedCompany) return
    setSubmitting(true)
    setSuccessMessage('')

    try {
      const res = await fetch('/api/admin/share-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: newEmail,
          companyName: selectedCompany,
          website: selectedWebsite,
          websiteId: selectedWebsiteId,
          note: note
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMessage(data.message)
        setNewEmail('')
        setSelectedCompany('')
        setSelectedWebsite('')
        setSelectedWebsiteId(null)
        setNote('')
        setShowAddModal(false)
        loadData()
      } else {
        alert(data.error || 'Er is iets misgegaan')
      }
    } catch (err) {
      alert('Fout: ' + err.message)
    }
    setSubmitting(false)
  }

  const handleRevoke = async (shareId) => {
    if (!confirm('Weet je zeker dat je de toegang wilt intrekken?')) return

    try {
      const res = await fetch(`/api/admin/share-access?id=${shareId}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      }
    } catch (err) {
      alert('Fout: ' + err.message)
    }
  }

  const copyLoginLink = (email) => {
    const link = `https://teun.ai/login`
    navigator.clipboard.writeText(link)
    setCopied(email)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nooit'
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Geen toegang</h1>
          <p className="text-slate-500">Dit is alleen beschikbaar voor admins.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Klant-toegang beheren
              </h1>
              <p className="text-slate-500 text-sm">Deel scan-resultaten met klanten — ze ontvangen een uitnodigingsmail</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nieuwe klant
          </button>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage('')} className="ml-auto text-green-400 hover:text-green-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="mb-8 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
          <h3 className="font-semibold text-blue-900 mb-3">Zo werkt het</h3>
          <div className="grid sm:grid-cols-4 gap-4 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Scan het bedrijf op je eigen admin-account</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Deel het project — klant ontvangt automatisch een uitnodigingsmail</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Klant maakt een gratis account aan via de link in de mail</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>Klant ziet alleen het gedeelde project read-only</span>
            </div>
          </div>
        </div>

        {/* Shares List */}
        {shares.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Nog geen klanten uitgenodigd</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer"
            >
              Eerste klant toevoegen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => (
              <div key={share.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Company + Status */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {share.company_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{share.company_name}</h3>
                        {share.website && (
                          <p className="text-xs text-slate-400">{share.website}</p>
                        )}
                      </div>
                      {share.client_id ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Account actief
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Wacht op registratie
                        </span>
                      )}
                    </div>

                    {/* Client email + details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-3">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {share.client_email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Gedeeld: {formatDate(share.created_at)}
                      </span>
                      {share.last_viewed_at && (
                        <span className="flex items-center gap-1.5 text-green-600">
                          <Eye className="w-3.5 h-3.5" />
                          Bekeken: {formatDate(share.last_viewed_at)}
                        </span>
                      )}
                    </div>

                    {/* Scan counts */}
                    {share.scan_counts && (
                      <div className="flex gap-2 mt-3">
                        {share.scan_counts.perplexity > 0 && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded">
                            Perplexity: {share.scan_counts.perplexity}
                          </span>
                        )}
                        {share.scan_counts.google_ai > 0 && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                            AI Modus: {share.scan_counts.google_ai}
                          </span>
                        )}
                        {share.scan_counts.ai_overviews > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded">
                            Overviews: {share.scan_counts.ai_overviews}
                          </span>
                        )}
                      </div>
                    )}

                    {share.note && (
                      <p className="text-xs text-slate-400 mt-2 italic">{share.note}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => copyLoginLink(share.client_email)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Kopieer login link"
                    >
                      {copied === share.client_email ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Toegang intrekken"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Klant-toegang toevoegen</h2>
                  <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Client Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Mail className="w-3.5 h-3.5 inline mr-1" />
                    E-mailadres klant
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="klant@bedrijf.nl"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Klant ontvangt een uitnodigingsmail op dit adres</p>
                </div>

                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />
                    Project delen
                  </label>
                  {websites.length > 0 ? (
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value)
                        const site = websites.find(w => w.company_name === e.target.value)
                        setSelectedWebsite(site?.website || '')
                        setSelectedWebsiteId(site?.id || null)
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="">Selecteer een bedrijf...</option>
                      {websites.map((w, i) => (
                        <option key={i} value={w.company_name}>
                          {w.company_name} {w.website ? `(${w.website})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      placeholder="Bedrijfsnaam"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                    />
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notitie (optioneel)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Bijv. Offerte feb 2026"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleShare}
                  disabled={!newEmail || !selectedCompany || submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Delen...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Toegang verlenen</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
