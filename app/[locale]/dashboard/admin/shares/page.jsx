'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/navigation'
import {
  Users, Plus, Trash2, Check, X, Copy,
  Mail, Building2, Clock, Eye, Shield, ArrowLeft,
  CheckCircle2, AlertCircle, Loader2, Send, Link2, Calendar
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { pushDataLayer } from '@/lib/gtm'

export default function AdminSharesPage() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const router = useRouter()
  const [shares, setShares] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedWebsite, setSelectedWebsite] = useState('')
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(null)
  const [note, setNote] = useState('')
  const [ttlDays, setTtlDays] = useState(30)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(null)
  const [createdShareUrl, setCreatedShareUrl] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const shareRes = await fetch('/api/admin/share-access', { cache: 'no-store' })
      if (shareRes.status === 403) { setIsAdmin(false); setLoading(false); return }
      const shareData = await shareRes.json()
      setShares(shareData.shares || [])
      setIsAdmin(true)

      // Companies komen uit tool_integrations (huidige AI Visibility data),
      // gededupliceerd op company_name (laatste integratie wint voor website).
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: integrations } = await supabase
          .from('tool_integrations')
          .select('id, company_name, website, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        const unique = []
        const seen = new Set()
        for (const row of (integrations || [])) {
          const key = (row.company_name || '').toLowerCase().trim()
          if (key && !seen.has(key)) {
            seen.add(key)
            unique.push({ id: row.id, company_name: row.company_name, website: row.website || '' })
          }
        }
        setCompanies(unique)
      }
    } catch (err) { console.error('Error loading data:', err) }
    setLoading(false)
  }

  const handleShare = async () => {
    if (!selectedCompany) return
    setSubmitting(true)
    setSuccessMessage('')
    setCreatedShareUrl(null)
    try {
      const res = await fetch('/api/admin/share-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: newEmail || null,
          companyName: selectedCompany,
          website: selectedWebsite,
          websiteId: selectedIntegrationId,
          note,
          ttlDays,
        })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessMessage(data.message)
        setCreatedShareUrl(data.shareUrl)
        pushDataLayer('share_created', {
          company: selectedCompany,
          has_email: !!newEmail,
          ttl_days: ttlDays,
          email_sent: !!data.emailSent,
        })
        setNewEmail(''); setSelectedCompany(''); setSelectedWebsite(''); setSelectedIntegrationId(null); setNote('')
        setShowAddModal(false)
        loadData()
      } else {
        alert(data.error || (locale === 'nl' ? 'Er ging iets mis' : 'Something went wrong'))
      }
    } catch (err) {
      alert((locale === 'nl' ? 'Fout: ' : 'Error: ') + err.message)
    }
    setSubmitting(false)
  }

  const handleRevoke = async (shareId) => {
    if (!confirm(locale === 'nl' ? 'Weet je zeker dat je deze deel-link wilt intrekken?' : 'Are you sure you want to revoke this share link?')) return
    try {
      const res = await fetch(`/api/admin/share-access?id=${shareId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { loadData() } else { alert(data.error || (locale === 'nl' ? 'Verwijderen mislukt' : 'Delete failed')) }
    } catch (err) { alert((locale === 'nl' ? 'Fout: ' : 'Error: ') + err.message) }
  }

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateString) => {
    if (!dateString) return locale === 'nl' ? 'Nooit' : 'Never'
    return new Date(dateString).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const isExpired = (share) => share.expires_at && new Date(share.expires_at) < new Date()

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{locale === 'nl' ? 'Geen toegang' : 'No access'}</h1>
          <p className="text-slate-500">{locale === 'nl' ? 'Alleen voor admins.' : 'Admins only.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                {locale === 'nl' ? 'Dashboard delen' : 'Share dashboard'}
              </h1>
              <p className="text-slate-500 text-sm">{locale === 'nl' ? 'Genereer een publieke deel-URL per bedrijf' : 'Generate a public share URL per company'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {locale === 'nl' ? 'Nieuwe deel-link' : 'New share link'}
          </button>
        </div>

        {(successMessage || createdShareUrl) && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-green-800 font-medium">{successMessage}</p>
                {createdShareUrl && (
                  <div className="mt-3 flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
                    <Link2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <code className="text-xs text-slate-700 flex-1 truncate">{createdShareUrl}</code>
                    <button
                      onClick={() => copyToClipboard(createdShareUrl, 'new')}
                      className="px-2.5 py-1 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 transition cursor-pointer flex items-center gap-1"
                    >
                      {copied === 'new' ? <><Check className="w-3 h-3" /> {locale === 'nl' ? 'Gekopieerd' : 'Copied'}</> : <><Copy className="w-3 h-3" /> {locale === 'nl' ? 'Kopieer' : 'Copy'}</>}
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => { setSuccessMessage(''); setCreatedShareUrl(null) }} className="text-green-400 hover:text-green-600"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        <div className="mb-8 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
          <h3 className="font-semibold text-blue-900 mb-3">{locale === 'nl' ? 'Zo werkt het' : 'How it works'}</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>{locale === 'nl' ? 'Kies een bedrijf en (optioneel) e-mail van de klant.' : 'Pick a company and (optional) client email.'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>{locale === 'nl' ? 'Wij genereren een publieke URL. Geldig 30 dagen.' : 'We generate a public URL. Valid 30 days.'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>{locale === 'nl' ? 'Deel de URL of laat Teun \'m mailen. Klant ziet een read-only dashboard.' : 'Share the URL or let Teun email it. Client sees a read-only dashboard.'}</span>
            </div>
          </div>
        </div>

        {shares.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">{locale === 'nl' ? 'Nog geen deel-links aangemaakt.' : 'No share links yet.'}</p>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer">
              {locale === 'nl' ? 'Eerste link aanmaken' : 'Create first link'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => {
              const expired = isExpired(share)
              return (
                <div key={share.id} className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition ${expired ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(share.company_name || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">{share.company_name}</h3>
                          {share.website && <p className="text-xs text-slate-400 truncate">{share.website}</p>}
                        </div>
                        {expired ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {locale === 'nl' ? 'Verlopen' : 'Expired'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {locale === 'nl' ? 'Actief' : 'Active'}
                          </span>
                        )}
                      </div>

                      {share.share_url && (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2">
                          <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <code className="text-[11px] text-slate-600 flex-1 truncate">{share.share_url}</code>
                          <button
                            onClick={() => copyToClipboard(share.share_url, share.id)}
                            className="px-2 py-0.5 text-[11px] font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer flex items-center gap-1"
                          >
                            {copied === share.id ? <><Check className="w-3 h-3" /> {locale === 'nl' ? 'Gekopieerd' : 'Copied'}</> : <><Copy className="w-3 h-3" /> {locale === 'nl' ? 'Kopieer' : 'Copy'}</>}
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-3">
                        {share.client_email && (
                          <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{share.client_email}</span>
                        )}
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{locale === 'nl' ? 'Aangemaakt' : 'Created'}: {formatDate(share.created_at)}</span>
                        {share.expires_at && (
                          <span className={`flex items-center gap-1.5 ${expired ? 'text-amber-600' : ''}`}>
                            <Calendar className="w-3.5 h-3.5" />{locale === 'nl' ? 'Verloopt' : 'Expires'}: {formatDate(share.expires_at)}
                          </span>
                        )}
                        {share.last_viewed_at && (
                          <span className="flex items-center gap-1.5 text-green-600">
                            <Eye className="w-3.5 h-3.5" />
                            {locale === 'nl' ? 'Laatst bekeken' : 'Last viewed'}: {formatDate(share.last_viewed_at)}
                            {share.view_count > 0 && ` (${share.view_count}×)`}
                          </span>
                        )}
                      </div>

                      {share.scan_counts && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {share.scan_counts.integrations > 0 && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded">AI Visibility: {share.scan_counts.integrations}</span>}
                          {share.scan_counts.google_ai > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">AI Modus: {share.scan_counts.google_ai}</span>}
                          {share.scan_counts.ai_overviews > 0 && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded">Overviews: {share.scan_counts.ai_overviews}</span>}
                        </div>
                      )}

                      {share.note && <p className="text-xs text-slate-400 mt-2 italic">"{share.note}"</p>}
                    </div>

                    <button onClick={() => handleRevoke(share.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer flex-shrink-0" title={locale === 'nl' ? 'Intrekken' : 'Revoke'}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">{locale === 'nl' ? 'Deel-link aanmaken' : 'Create share link'}</h2>
                  <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5"><Building2 className="w-3.5 h-3.5 inline mr-1" />{locale === 'nl' ? 'Bedrijf' : 'Company'}</label>
                  {companies.length > 0 ? (
                    <select value={selectedCompany} onChange={(e) => {
                      setSelectedCompany(e.target.value)
                      const site = companies.find(w => w.company_name === e.target.value)
                      setSelectedWebsite(site?.website || '')
                      setSelectedIntegrationId(site?.id || null)
                    }} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white">
                      <option value="">{locale === 'nl' ? 'Selecteer een bedrijf...' : 'Select a company...'}</option>
                      {companies.map((w, i) => (
                        <option key={i} value={w.company_name}>{w.company_name} {w.website ? `(${w.website})` : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-slate-500 italic">{locale === 'nl' ? 'Nog geen bedrijven in tool_integrations. Doe eerst een AI Visibility scan.' : 'No companies in tool_integrations yet. Run an AI Visibility scan first.'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5"><Mail className="w-3.5 h-3.5 inline mr-1" />{locale === 'nl' ? 'E-mail klant (optioneel)' : 'Client email (optional)'}</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="klant@bedrijf.nl" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                  <p className="text-xs text-slate-400 mt-1">{locale === 'nl' ? 'Als je een e-mail invult, mailen we de link automatisch.' : 'If you fill in an email, we email the link automatically.'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5"><Calendar className="w-3.5 h-3.5 inline mr-1" />{locale === 'nl' ? 'Geldig (dagen)' : 'Valid (days)'}</label>
                  <input type="number" min={1} max={365} value={ttlDays} onChange={(e) => setTtlDays(Number(e.target.value) || 30)} className="w-32 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{locale === 'nl' ? 'Notitie (optioneel, zichtbaar voor klant)' : 'Note (optional, visible to client)'}</label>
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={locale === 'nl' ? 'Bijv. "Tussenstand voor ons gesprek"' : 'E.g. "Status before our call"'} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition cursor-pointer">
                  {locale === 'nl' ? 'Annuleren' : 'Cancel'}
                </button>
                <button onClick={handleShare} disabled={!selectedCompany || submitting} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer">
                  {submitting
                    ? (<><Loader2 className="w-4 h-4 animate-spin" /> {locale === 'nl' ? 'Aanmaken...' : 'Creating...'}</>)
                    : (<><Send className="w-4 h-4" /> {locale === 'nl' ? 'Link aanmaken' : 'Create link'}</>)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
