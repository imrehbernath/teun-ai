'use client'

import { useState, useEffect } from 'react'
import { Search, ArrowRight, TrendingUp, Eye, BarChart3, Sparkles, Loader2, Unplug, ChevronDown, Globe, Database } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Suspense } from 'react'
import ToolsCrossSell from '@/app/components/ToolsCrossSell'

// ============================================
// HELPERS
// ============================================
function cleanQuery(q) {
  return q.replace(/\.\s*my\s+location\s+is\s+\w+\.?$/i, '').replace(/\s+/g, ' ').trim()
}

function isAIOverview(originalQuery) {
  return /my\s+location\s+is\s+/i.test(originalQuery)
}

function isCommercial(query) {
  const q = query.toLowerCase()
  const excludePatterns = [
    'wat kost', 'hoeveel kost', 'wat is de prijs', 'hoe duur',
    'what does it cost', 'how much does', 'what is the price',
    'hoe ', 'how ',
    'wat is het verschil', 'what is the difference',
    'wil graag weten', 'wil weten', 'want to know', 'would like to know',
    'ik run een', 'i run a',
    'kan iemand uitleggen', 'can someone explain',
    'wat betekent', 'what does', 'what is',
    'welke strategie', 'welke tips', 'welke trends',
    'which strategy', 'which tips', 'which trends',
    'wat zijn de beste tips', 'wat zijn tips', 'wat zijn de nieuwste',
    'wat zijn actuele', 'wat zijn effectieve', 'wat zijn de voor',
    'what are the best tips', 'what are tips',
  ]
  if (excludePatterns.some(p => q.includes(p))) return false
  const hiringSignals = [
    'ik zoek', 'op zoek naar', 'zoek een', 'looking for',
    'wie kan', 'wie helpt', 'who can', 'who helps',
    'welk bureau', 'welk bedrijf', 'welke specialist', 'welke agency',
    'which agency', 'which company', 'which specialist',
    'beste bureau', 'beste specialist', 'best agency', 'beste online',
    'kan iemand aanbevelen', 'can anyone recommend',
    'ken je een goed', 'know a good',
    'ik heb een bureau nodig', 'ik heb een specialist nodig',
    'i need an agency', 'i need a specialist',
    'ons bedrijf zoekt', 'our company needs',
    'we willen', 'we zoeken', 'we need', 'we are looking',
    'waar vind ik', 'where can i find', 'where do i find',
    'uitbesteden', 'inhuren', 'inschakelen', 'outsource', 'hire',
    'laten maken', 'laten bouwen', 'laten ontwerpen', 'laten ontwikkelen',
    'laten optimaliseren', 'laten doen',
    'bureau in ', 'specialist in ', 'agency in ',
    'bureau dat', 'bedrijf dat', 'partij die',
  ]
  return hiringSignals.some(s => q.includes(s))
}

// ============================================
// MAIN COMPONENT
// ============================================
function AIPromptDiscoveryContent() {
  const locale = useLocale()
  const isNL = locale === 'nl'
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(null)
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [allPrompts, setAllPrompts] = useState([])
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [hideBranded, setHideBranded] = useState(true)
  const [showOther, setShowOther] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)

  // Check connection on mount (works for logged in AND anonymous via session_token cookie)
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/search-console/properties')
      const data = await res.json()
      if (res.ok && data.properties?.length > 0) {
        setConnected(true)
        setProperties(data.properties)
        setSelectedProperty(data.properties[0].url)
        try { setBrandName(new URL(data.properties[0].url.replace('sc-domain:', 'https://')).hostname.replace('www.', '').split('.')[0]) } catch (e) {}
      } else {
        setConnected(false)
      }
    } catch (e) {
      setConnected(false)
    }
    setLoading(false)
  }

  // Auto-fetch when property selected
  useEffect(() => { if (selectedProperty && connected) fetchPrompts() }, [selectedProperty])

  const fetchPrompts = async () => {
    setFetching(true)
    setError(null)
    try {
      const res = await fetch('/api/search-console/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: selectedProperty, rowLimit: 5000 }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'NOT_CONNECTED' || data.code === 'TOKEN_EXPIRED') {
          setConnected(false)
          setError(isNL ? 'Sessie verlopen. Koppel opnieuw.' : 'Session expired. Reconnect.')
        } else {
          setError(data.error || 'Error')
        }
        setFetching(false)
        return
      }
      const seen = new Set()
      const prompts = []
      const bl = (brandName || '').toLowerCase()
      for (const row of (data.queries || [])) {
        const original = row.query
        const c = cleanQuery(original)
        const w = c.split(/\s+/).filter(x => x).length
        const k = c.toLowerCase()
        if (w < 6 || seen.has(k)) continue
        seen.add(k)
        const branded = bl && (k.includes(bl) || k.includes(bl.replace(/\s+/g, '')))
        const aiOverview = isAIOverview(original)
        const commercial = isCommercial(c)
        let category = 'other'
        if (commercial) category = 'commercial'
        else if (aiOverview) category = 'ai_overview'
        prompts.push({
          query: c, page: row.page || '', clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          position: row.position ? parseFloat(row.position.toFixed(1)) : 0,
          words: w, branded, category, aiOverview,
        })
      }
      prompts.sort((a, b) => b.impressions - a.impressions)
      setAllPrompts(prompts)
    } catch (e) {
      setError(isNL ? 'Verbindingsfout.' : 'Connection error.')
    }
    setFetching(false)
  }

  // Connect - goes directly to Google OAuth (anonymous supported via session_token)
  const connectGSC = () => {
    const returnUrl = isNL ? '/tools/ai-prompt-discovery' : '/en/tools/ai-prompt-discovery'
    window.location.href = `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
  }

  const disconnect = async () => {
    await fetch('/api/search-console/disconnect', { method: 'DELETE' })
    setConnected(false)
    setAllPrompts([])
    setProperties([])
    setSelectedProperty(null)
  }

  // Categorize
  const base = allPrompts.filter(p => p.words >= 8).filter(p => !hideBranded || !p.branded)
  const commercial = base.filter(p => p.category === 'commercial').sort((a, b) => b.impressions - a.impressions)
  const aiOverview = base.filter(p => p.category === 'ai_overview').sort((a, b) => b.impressions - a.impressions)
  const other = base.filter(p => p.category === 'other').sort((a, b) => b.impressions - a.impressions)
  const allFiltered = [...commercial, ...aiOverview, ...other]

  const toggle = (q) => { const s = new Set(selected); s.has(q) ? s.delete(q) : s.size < 10 && s.add(q); setSelected(s) }

  const scanSelected = () => {
    const list = [...selected]
    // Store prompts in sessionStorage (AI Visibility page reads from here)
    sessionStorage.setItem('teun_custom_prompts', JSON.stringify(list))
    const params = new URLSearchParams()
    if (brandName) params.set('company', brandName)
    params.set('category', brandName || 'Bedrijf')
    if (selectedProperty) {
      const website = selectedProperty.replace('sc-domain:', '').replace(/\/$/, '')
      params.set('website', website.startsWith('http') ? website : `https://${website}`)
    }
    params.set('customPrompts', 'true')  // flag, not data
    params.set('autostart', 'true')
    window.location.href = `/${locale === 'en' ? 'en/' : ''}tools/ai-visibility?${params.toString()}`
  }

  const pLabel = (u) => u.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace(/\/$/, '')

  const hasResults = connected && !fetching && allPrompts.length > 0
  const showSEOContent = !hasResults && !fetching

  // ── Components ──
  const PromptRow = ({ p }) => {
    const sel = selected.has(p.query)
    let pg = ''
    try { pg = new URL(p.page).pathname } catch (e) { pg = p.page }
    return (
      <div onClick={() => toggle(p.query)} className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${sel ? 'bg-emerald-50 border-l-2 border-emerald-500' : 'hover:bg-slate-50 border-l-2 border-transparent'}`}>
        <div className="mt-0.5 shrink-0">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${sel ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
            {sel && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-relaxed ${sel ? 'text-emerald-900 font-medium' : 'text-slate-700'}`}>{p.query.charAt(0).toUpperCase() + p.query.slice(1)}</p>
          {pg && <p className="text-xs text-slate-400 mt-0.5 truncate">{pg}</p>}
        </div>
      </div>
    )
  }

  const SectionHeader = ({ icon, color, title, count, subtitle }) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-900">{title} <span className="text-slate-400 font-normal">({count})</span></p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  )

  const faqItems = isNL ? [
    { q: 'Wat zijn AI-prompts in Search Console?', a: 'Google Search Console toont steeds vaker lange, conversatie-achtige zoekopdrachten. Deze komen waarschijnlijk van Google AI Mode, AI Overviews en de invloed van ChatGPT op zoekgedrag. Wij filteren deze automatisch eruit en categoriseren ze.' },
    { q: 'Is mijn data veilig?', a: 'Ja. We hebben alleen-lezen toegang tot je Search Console via Google OAuth. We wijzigen niets, slaan geen queries op en delen je data niet met derden. Je kunt de koppeling op elk moment verwijderen.' },
    { q: 'Wat is het verschil tussen commercieel en AI Overview?', a: 'Commerciele prompts zijn queries waarbij iemand een bureau, specialist of dienstverlener zoekt. AI Overview prompts komen specifiek uit Google AI Mode en bevatten locatie-metadata. Beide zijn waardevol voor je AI-zichtbaarheid.' },
    { q: 'Wat kan ik met de resultaten doen?', a: 'Selecteer de meest relevante prompts en scan ze in onze AI Visibility tool. Zo zie je of je ook in ChatGPT en Perplexity wordt genoemd op deze vragen.' },
    { q: 'Verschilt dit van de AI Visibility Scan?', a: 'Ja. De AI Visibility Scan genereert prompts op basis van je website. AI Prompt Discovery laat zien welke prompts echte gebruikers al typen en waar jij al op gevonden wordt. Samen geven ze het complete plaatje.' },
  ] : [
    { q: 'What are AI prompts in Search Console?', a: 'Google Search Console increasingly shows long, conversational queries. These likely come from Google AI Mode, AI Overviews, and ChatGPT\'s influence on search behavior. We automatically filter and categorize these.' },
    { q: 'Is my data safe?', a: 'Yes. We have read-only access via Google OAuth. We don\'t change anything, don\'t store queries, and never share your data. You can disconnect at any time.' },
    { q: 'What\'s the difference between commercial and AI Overview?', a: 'Commercial prompts are queries where someone is looking for an agency, specialist, or service provider. AI Overview prompts specifically come from Google AI Mode and contain location metadata. Both are valuable for AI visibility.' },
    { q: 'What can I do with the results?', a: 'Select the most relevant prompts and scan them in our AI Visibility tool to check if you\'re mentioned in ChatGPT and Perplexity.' },
    { q: 'How is this different from AI Visibility Scan?', a: 'AI Visibility Scan generates prompts based on your website. AI Prompt Discovery shows which prompts real users already type. Together they give the complete picture.' },
  ]

  // Loading
  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ══ HERO + CONNECT ══ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-medium mb-4">
            <Search className="w-3.5 h-3.5" />
            AI Prompt Discovery
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-slate-900 leading-tight mb-4">
            {isNL
              ? <>Op welke AI-prompts<br />word je al gevonden?</>
              : <>Which AI prompts<br />already find your business?</>}
          </h1>
          <p className="text-slate-600 text-base sm:text-lg mb-1">
            {isNL
              ? <>Koppel je Search Console en ontdek in <strong className="text-slate-800">30 seconden</strong> welke commerciele en AI Overview prompts al naar jouw website leiden.</>
              : <>Connect your Search Console and discover in <strong className="text-slate-800">30 seconds</strong> which commercial and AI Overview prompts already lead to your website.</>}
          </p>
          <div className="flex justify-center gap-3 mt-3 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-sm text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-400" />Google AI Mode</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-sm text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-400" />AI Overviews</span>
          </div>
        </div>

        {/* Connect card (shown when not connected and not fetching) */}
        {connected === false && (
          <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-7 h-7 text-emerald-600" />
            </div>
            <button onClick={connectGSC}
              className="w-full bg-[#292956] text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-[#1e1e45] transition-all flex items-center justify-center gap-3 cursor-pointer text-lg mb-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fillOpacity=".7"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fillOpacity=".5"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fillOpacity=".3"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fillOpacity=".5"/></svg>
              {isNL ? 'Koppel Search Console' : 'Connect Search Console'}
            </button>
            <p className="text-xs text-slate-400">{isNL ? 'Gratis. Alleen-lezen toegang. Geen account nodig.' : 'Free. Read-only access. No account needed.'}</p>
            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          </div>
        )}

        {/* Checking connection */}
        {connected === null && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{isNL ? 'Verbinding controleren...' : 'Checking connection...'}</p>
          </div>
        )}

        {/* Fetching prompts */}
        {connected && fetching && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">{isNL ? 'AI-prompts ophalen uit Search Console...' : 'Fetching AI prompts...'}</p>
            <p className="text-sm text-slate-400 mt-2">{isNL ? 'We analyseren je queries van de afgelopen 90 dagen' : 'Analyzing last 90 days'}</p>
          </div>
        )}
      </section>

      {/* ══ RESULTS ══ */}
      {hasResults && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <button onClick={() => properties.length > 1 && setShowPicker(!showPicker)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-medium cursor-pointer">
                <Globe className="w-3.5 h-3.5" />{selectedProperty ? pLabel(selectedProperty) : 'Property'}{properties.length > 1 && <ChevronDown className="w-3 h-3" />}
              </button>
              {showPicker && properties.length > 1 && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[240px]">
                  {properties.map(p => (
                    <button key={p.url} onClick={() => { setSelectedProperty(p.url); setShowPicker(false); try { setBrandName(new URL(p.url.replace('sc-domain:', 'https://')).hostname.replace('www.', '').split('.')[0]) } catch(e){} }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer ${p.url === selectedProperty ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>
                      {pLabel(p.url)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="text" value={brandName} onChange={(e) => {
              setBrandName(e.target.value)
              const b = e.target.value.toLowerCase().trim()
              setAllPrompts(prev => prev.map(p => ({ ...p, branded: b && (p.query.toLowerCase().includes(b) || p.query.toLowerCase().includes(b.replace(/\s+/g, ''))) })))
            }} placeholder={isNL ? 'Bedrijfsnaam' : 'Brand name'} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 w-36 focus:outline-none focus:border-emerald-500" />
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={hideBranded} onChange={(e) => setHideBranded(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
              Non-branded
            </label>
            <div className="ml-auto">
              <button onClick={disconnect} className="text-sm text-slate-400 hover:text-red-500 flex items-center gap-1 transition cursor-pointer" title={isNL ? 'Ontkoppel' : 'Disconnect'}>
                <Unplug className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] rounded-2xl p-4 sm:p-6 mb-4 text-white">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl sm:text-3xl font-bold">{commercial.length}</p><p className="text-xs sm:text-sm text-slate-300">{isNL ? 'Commercieel' : 'Commercial'}</p></div>
              <div><p className="text-2xl sm:text-3xl font-bold">{aiOverview.length}</p><p className="text-xs sm:text-sm text-slate-300">AI Overviews</p></div>
              <div><p className="text-2xl sm:text-3xl font-bold">{other.length}</p><p className="text-xs sm:text-sm text-slate-300">{isNL ? 'Overig' : 'Other'}</p></div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">{isNL ? 'Laatste 90 dagen' : 'Last 90 days'}</p>
          </div>

          {/* Selection CTA */}
          {selected.size > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-emerald-800 text-sm">{selected.size} prompt{selected.size > 1 ? 's' : ''} {isNL ? 'geselecteerd' : 'selected'}</p>
                <p className="text-xs text-emerald-600">{isNL ? 'Scan in ChatGPT en Perplexity' : 'Scan in ChatGPT and Perplexity'}</p>
              </div>
              <button onClick={scanSelected} className="px-5 py-2.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-4 h-4" />{isNL ? 'Scan in AI Visibility' : 'Scan in AI Visibility'}<ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ═══ COMMERCIAL ═══ */}
          {commercial.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
              <SectionHeader icon={<Sparkles className="w-4 h-4 text-amber-600" />} color="bg-amber-100"
                title={isNL ? 'Commerciele AI-prompts' : 'Commercial AI prompts'} count={commercial.length}
                subtitle={isNL ? 'Prompts waarbij iemand een bureau, specialist of dienstverlener zoekt' : 'Prompts where someone is looking for an agency, specialist or service provider'} />
              <div className="divide-y divide-slate-50">{commercial.slice(0, 30).map((p, i) => <PromptRow key={`c-${i}`} p={p} />)}</div>
              {commercial.length > 30 && <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100">+{commercial.length - 30} {isNL ? 'meer' : 'more'}</div>}
            </div>
          )}

          {/* ═══ AI OVERVIEW ═══ */}
          {aiOverview.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
              <SectionHeader
                icon={<svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>}
                color="bg-blue-100"
                title="Google AI Overview prompts" count={aiOverview.length}
                subtitle={isNL ? 'Queries uit Google AI Mode en AI Overviews' : 'Queries from Google AI Mode and AI Overviews'} />
              <div className="divide-y divide-slate-50">{aiOverview.slice(0, 30).map((p, i) => <PromptRow key={`ai-${i}`} p={p} />)}</div>
              {aiOverview.length > 30 && <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100">+{aiOverview.length - 30} {isNL ? 'meer' : 'more'}</div>}
            </div>
          )}

          {/* ═══ OTHER (collapsible) ═══ */}
          {other.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
              <button onClick={() => setShowOther(!showOther)} className="w-full cursor-pointer">
                <SectionHeader icon={<Search className="w-4 h-4 text-slate-500" />} color="bg-slate-100"
                  title={isNL ? 'Overige lange queries' : 'Other long queries'} count={other.length}
                  subtitle={isNL ? 'Informatieve en overige prompt-achtige zoekopdrachten' : 'Informational and other prompt-like queries'} />
              </button>
              {showOther && <div className="divide-y divide-slate-50">{other.slice(0, 50).map((p, i) => <PromptRow key={`o-${i}`} p={p} />)}</div>}
            </div>
          )}

          {allFiltered.length === 0 && <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">{isNL ? 'Geen prompt-achtige queries gevonden.' : 'No prompt-like queries found.'}</div>}

          {selected.size === 0 && allFiltered.length > 0 && (
            <p className="text-center text-sm text-slate-400 mt-2 mb-6">{isNL ? 'Klik op prompts om ze te selecteren (max 10), scan ze daarna in ChatGPT en Perplexity.' : 'Click prompts to select (max 10), then scan in ChatGPT and Perplexity.'}</p>
          )}

          <ToolsCrossSell currentTool="ai-prompt-discovery" locale={locale} />
        </section>
      )}

      {/* Empty state */}
      {connected && !fetching && allPrompts.length === 0 && !error && (
        <div className="max-w-md mx-auto text-center py-8 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <p className="text-xl font-bold text-slate-900 mb-2">{isNL ? 'Geen AI-prompts gevonden' : 'No AI prompts found'}</p>
            <p className="text-sm text-slate-500 mb-4">{isNL ? 'Geen lange queries gevonden voor deze property.' : 'No long queries found for this property.'}</p>

            {properties.length > 1 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">{isNL ? 'Selecteer een andere property:' : 'Select a different property:'}</p>
                <div className="space-y-2">
                  {properties.map(p => (
                    <button
                      key={p.url}
                      onClick={() => { setSelectedProperty(p.url); setAllPrompts([]); try { setBrandName(new URL(p.url.replace('sc-domain:', 'https://')).hostname.replace('www.', '').split('.')[0]) } catch(e){} }}
                      className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm transition cursor-pointer ${
                        p.url === selectedProperty
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 inline mr-2" />
                      {pLabel(p.url)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={disconnect} className="mt-4 text-xs text-slate-400 hover:text-red-500 transition cursor-pointer">
              {isNL ? 'Ontkoppel Search Console' : 'Disconnect Search Console'}
            </button>
          </div>
        </div>
      )}

      {/* ══ SEO CONTENT (only when no results) ══ */}
      {showSEOContent && (
        <>
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 leading-tight">
              {isNL ? <>Jouw klanten zoeken al via AI.<br /><span className="text-[#7C3AED]">Maar vinden ze jou?</span></> : <>Your customers already search via AI.<br /><span className="text-[#7C3AED]">But do they find you?</span></>}
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              {isNL
                ? 'Google Search Console bevat steeds meer lange, conversatie-achtige zoekopdrachten. Dit zijn queries die voortkomen uit AI Mode, AI Overviews en het veranderende zoekgedrag door ChatGPT. Deze tool analyseert je Search Console data en filtert automatisch de AI-prompts eruit.'
                : 'Google Search Console increasingly contains long, conversational queries. These are queries stemming from AI Mode, AI Overviews, and changing search behavior driven by ChatGPT. This tool analyzes your Search Console data and automatically filters out the AI prompts.'}
            </p>
            <p className="text-slate-600 leading-relaxed">
              {isNL
                ? 'We splitsen de resultaten in drie categorieen: commerciele prompts (iemand zoekt een bureau of specialist), Google AI Overview queries (met locatie-metadata), en overige informatieve vragen. Zo weet je precies waar je kansen liggen.'
                : 'We split results into three categories: commercial prompts (someone looking for an agency or specialist), Google AI Overview queries (with location metadata), and other informational questions. So you know exactly where your opportunities are.'}
            </p>
          </section>

          <section className="bg-slate-50 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">{isNL ? 'Wat ontdekken we?' : 'What do we discover?'}</h2>
              <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">{isNL ? 'We categoriseren je Search Console queries automatisch in drie groepen.' : 'We automatically categorize your Search Console queries into three groups.'}</p>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { icon: <Sparkles className="w-5 h-5" />, title: isNL ? 'Commerciele prompts' : 'Commercial prompts', desc: isNL ? 'Queries waarbij iemand een bureau, specialist of dienstverlener zoekt. Dit zijn je waardevolste leads.' : 'Queries where someone is looking for an agency, specialist or service provider. Your most valuable leads.' },
                  { icon: <Database className="w-5 h-5" />, title: 'AI Overview queries', desc: isNL ? 'Queries die uit Google AI Mode en AI Overviews komen. Herkenbaar aan locatie-metadata die Google meestuurt.' : 'Queries coming from Google AI Mode and AI Overviews. Recognizable by location metadata.' },
                  { icon: <Eye className="w-5 h-5" />, title: isNL ? 'Overige AI-prompts' : 'Other AI prompts', desc: isNL ? 'Langere informatieve queries die niet in de andere categorieen vallen maar wel prompt-achtig zijn.' : 'Longer informational queries that don\'t fit other categories but are still prompt-like.' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">{item.icon}</div>
                    <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 text-center">
              {isNL ? <>Eenmalig koppelen,<br /><span className="text-[#7C3AED]">wij doen de rest</span></> : <>Connect once,<br /><span className="text-[#7C3AED]">we do the rest</span></>}
            </h2>
            <p className="text-slate-600 leading-relaxed text-center mb-6 max-w-2xl mx-auto">
              {isNL
                ? 'Na het koppelen analyseren we automatisch je queries van de afgelopen 90 dagen. Geen handmatige exports of regex filters nodig.'
                : 'After connecting, we automatically analyze your queries from the last 90 days. No manual exports or regex filters needed.'}
            </p>
            <div className="bg-[#292956] rounded-2xl p-6 sm:p-8 text-white">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs font-bold">1</span></div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">{isNL ? 'Koppel je Google Search Console (alleen-lezen, geen account nodig)' : 'Connect your Google Search Console (read-only, no account needed)'}</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs font-bold">2</span></div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">{isNL ? 'We filteren alle 8+ woorden queries en categoriseren ze automatisch' : 'We filter all 8+ word queries and categorize them automatically'}</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5"><Sparkles className="w-3 h-3 text-emerald-300" /></div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">{isNL ? 'Selecteer prompts en scan ze direct in ChatGPT en Perplexity' : 'Select prompts and scan them directly in ChatGPT and Perplexity'}<br /><span className="text-emerald-300 font-medium">{isNL ? 'Van data naar actie in 30 seconden' : 'From data to action in 30 seconds'}</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ with Teun */}
          <section className="py-20 bg-slate-50 relative overflow-visible">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">{isNL ? 'Veelgestelde vragen' : 'Frequently asked questions'}</h2>
                  <div className="space-y-4">
                    {faqItems.map((item, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full flex items-center justify-between p-6 text-left cursor-pointer">
                          <div className="flex items-center gap-4">
                            <span className="text-slate-400 font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
                            <span className="font-semibold text-slate-900">{item.q}</span>
                          </div>
                          <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${openFaq === i ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        {openFaq === i && <div className="px-6 pb-6 pt-0"><p className="text-slate-600 pl-10">{item.a}</p></div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hidden lg:flex justify-center items-end relative">
                  <div className="translate-y-20">
                    <Image src="/teun-ai-mascotte.png" alt={isNL ? 'Teun helpt je' : 'Teun helps you'} width={420} height={530} className="drop-shadow-xl" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default function AIPromptDiscoveryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>}>
      <AIPromptDiscoveryContent />
    </Suspense>
  )
}
