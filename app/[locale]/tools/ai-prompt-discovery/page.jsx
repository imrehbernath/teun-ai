// app/[locale]/tools/ai-prompt-discovery/page.jsx
// AI Prompt Discovery - Search Console queries → AI prompt insights
// Cream/Lora/spark editorial design (matches AI Visibility + Brand Check + Rank Tracker)
'use client'

import { useState, useEffect, Suspense } from 'react'
import {
  Search, ArrowRight, TrendingUp, Eye, BarChart3, Sparkles, Loader2, Unplug,
  ChevronDown, Globe, Database, Check, Trophy, Target, Lock
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import ToolsCrossSell from '@/app/components/ToolsCrossSell'

// ============================================
// HELPERS (business logic — ongewijzigd)
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
  const [faqCategory, setFaqCategory] = useState('all')

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

  const base = allPrompts.filter(p => p.words >= 8).filter(p => !hideBranded || !p.branded)
  const commercial = base.filter(p => p.category === 'commercial').sort((a, b) => b.impressions - a.impressions)
  const aiOverview = base.filter(p => p.category === 'ai_overview').sort((a, b) => b.impressions - a.impressions)
  const other = base.filter(p => p.category === 'other').sort((a, b) => b.impressions - a.impressions)
  const allFiltered = [...commercial, ...aiOverview, ...other]

  const toggle = (q) => {
    const s = new Set(selected)
    s.has(q) ? s.delete(q) : s.size < 10 && s.add(q)
    setSelected(s)
  }

  const scanSelected = () => {
    const list = [...selected]
    sessionStorage.setItem('teun_custom_prompts', JSON.stringify(list))
    const params = new URLSearchParams()
    if (brandName) params.set('company', brandName)
    params.set('category', brandName || 'Bedrijf')
    if (selectedProperty) {
      const website = selectedProperty.replace('sc-domain:', '').replace(/\/$/, '')
      params.set('website', website.startsWith('http') ? website : `https://${website}`)
    }
    params.set('customPrompts', 'true')
    params.set('autostart', 'true')
    window.location.href = `/${locale === 'en' ? 'en/' : ''}tools/ai-visibility?${params.toString()}`
  }

  const pLabel = (u) => u.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace(/\/$/, '')

  const hasResults = connected && !fetching && allPrompts.length > 0
  const showSEOContent = !hasResults && !fetching

  // ── PromptRow ──
  const PromptRow = ({ p }) => {
    const sel = selected.has(p.query)
    let pg = ''
    try { pg = new URL(p.page).pathname } catch (e) { pg = p.page }
    return (
      <div onClick={() => toggle(p.query)} className={`apd-prompt-row${sel ? ' apd-prompt-row-sel' : ''}`}>
        <div className={`apd-checkbox${sel ? ' apd-checkbox-sel' : ''}`}>
          {sel && <Check className="w-3 h-3" strokeWidth={3} />}
        </div>
        <div className="apd-prompt-content">
          <p className="apd-prompt-text">{(() => {
            let text = p.query.charAt(0).toUpperCase() + p.query.slice(1)
            const cities = ['amsterdam','rotterdam','utrecht','den haag','eindhoven','groningen','tilburg','almere','breda','nijmegen','haarlem','arnhem','zaanstad','amersfoort','apeldoorn','den bosch','s-hertogenbosch','maastricht','leiden','dordrecht','zoetermeer','zwolle','deventer','delft','alkmaar','hilversum','brugge','antwerpen','gent','brussel','nederland','netherlands','holland','europe','europa']
            cities.forEach(city => {
              const re = new RegExp(`\\b${city}\\b`, 'gi')
              text = text.replace(re, city.split(/[\s-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(city.includes('-') ? '-' : ' '))
            })
            return text
          })()}</p>
          {pg && <p className="apd-prompt-page">{pg}</p>}
        </div>
        {p.impressions > 0 && (
          <div className="apd-prompt-stats">
            <span className="apd-prompt-imp">{p.impressions.toLocaleString(isNL ? 'nl-NL' : 'en-US')}</span>
            <span className="apd-prompt-imp-label">{isNL ? 'imp.' : 'imp.'}</span>
          </div>
        )}
      </div>
    )
  }

  const SectionHeader = ({ icon, title, count, subtitle, dotColor }) => (
    <div className="apd-section-head">
      <span className="apd-section-dot" style={{ background: dotColor }} />
      <div className="apd-section-text">
        <p className="apd-section-title">{title} <span className="apd-section-count">({count})</span></p>
        <p className="apd-section-sub">{subtitle}</p>
      </div>
      {icon && <div className="apd-section-icon">{icon}</div>}
    </div>
  )

  // ── FAQ data ──
  const faqItems = isNL ? [
    { cat: 'product', q: 'Wat zijn AI-prompts in Search Console?', a: 'Google Search Console toont steeds vaker lange, conversatie-achtige zoekopdrachten. Deze komen waarschijnlijk van Google AI Mode, AI Overviews en de invloed van ChatGPT op zoekgedrag. Wij filteren deze automatisch eruit en categoriseren ze.' },
    { cat: 'privacy', q: 'Is mijn data veilig?', a: 'Ja. We hebben alleen-lezen toegang tot je Search Console via Google OAuth. We wijzigen niets, slaan geen queries op en delen je data niet met derden. Je kunt de koppeling op elk moment verwijderen.' },
    { cat: 'product', q: 'Wat is het verschil tussen commercieel en AI Overview?', a: 'Commerciele prompts zijn queries waarbij iemand een bureau, specialist of dienstverlener zoekt. AI Overview prompts komen specifiek uit Google AI Mode en bevatten locatie-metadata. Beide zijn waardevol voor je AI-zichtbaarheid.' },
    { cat: 'results', q: 'Wat kan ik met de resultaten doen?', a: 'Selecteer de meest relevante prompts en scan ze in onze AI Visibility tool. Zo zie je of je ook in ChatGPT en Perplexity wordt genoemd op deze vragen.' },
    { cat: 'product', q: 'Verschilt dit van de AI Visibility Scan?', a: 'Ja. De AI Visibility Scan genereert prompts op basis van je website. AI Prompt Discovery laat zien welke prompts echte gebruikers al typen en waar jij al op gevonden wordt. Samen geven ze het complete plaatje.' },
  ] : [
    { cat: 'product', q: 'What are AI prompts in Search Console?', a: 'Google Search Console increasingly shows long, conversational queries. These likely come from Google AI Mode, AI Overviews, and ChatGPT\'s influence on search behavior. We automatically filter and categorize these.' },
    { cat: 'privacy', q: 'Is my data safe?', a: 'Yes. We have read-only access via Google OAuth. We don\'t change anything, don\'t store queries, and never share your data. You can disconnect at any time.' },
    { cat: 'product', q: 'What\'s the difference between commercial and AI Overview?', a: 'Commercial prompts are queries where someone is looking for an agency, specialist, or service provider. AI Overview prompts specifically come from Google AI Mode and contain location metadata. Both are valuable for AI visibility.' },
    { cat: 'results', q: 'What can I do with the results?', a: 'Select the most relevant prompts and scan them in our AI Visibility tool to check if you\'re mentioned in ChatGPT and Perplexity.' },
    { cat: 'product', q: 'How is this different from AI Visibility Scan?', a: 'AI Visibility Scan generates prompts based on your website. AI Prompt Discovery shows which prompts real users already type. Together they give the complete picture.' },
  ]

  // Loading
  if (loading) {
    return (
      <div className="tool-init">
        <div className="tool-init-spinner">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    )
  }

  return (
    <div className="tool-page apd-page">
      <div className="tool-wrap apd-wrap">

        {/* Hero */}
        <div className="tool-hero">
          <div className="tool-eyebrow">{isNL ? 'AI PROMPT DISCOVERY' : 'AI PROMPT DISCOVERY'}</div>
          <h1>
            {isNL ? (
              <>Ontdek welke <em>AI-prompts</em> je klanten al typen</>
            ) : (
              <>Discover which <em>AI prompts</em> your customers already type</>
            )}
          </h1>
          <p className="tool-hero-sub">
            {isNL
              ? 'Filter conversatie-achtige queries uit je Search Console data. Zie welke commerciele AI-prompts naar je site leiden, en welke kansen je nog mist.'
              : 'Filter conversational queries from your Search Console data. See which commercial AI prompts lead to your site, and which opportunities you\'re missing.'}
          </p>
          <div className="tool-trust-pills">
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#10B981' }} />Search Console</span>
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#6366F1' }} />ChatGPT &amp; Perplexity</span>
            <span className="tool-trust-pill"><span className="pulse-dot" style={{ background: '#3B82F6' }} />Google AI Mode</span>
          </div>
        </div>

        {/* Connect card (not connected) */}
        {connected === false && (
          <div className="apd-connect-card" id="apd-connect">
            <div className="apd-connect-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h2 className="apd-connect-title">
              {isNL ? <>Koppel je <em>Search Console</em></> : <>Connect your <em>Search Console</em></>}
            </h2>
            <p className="apd-connect-sub">
              {isNL
                ? 'We analyseren automatisch je queries van de afgelopen 90 dagen en filteren de AI-prompts eruit.'
                : 'We automatically analyze your queries from the last 90 days and filter out the AI prompts.'}
            </p>
            <button onClick={connectGSC} className="teun-scan-btn apd-connect-btn">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fillOpacity=".7"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fillOpacity=".5"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fillOpacity=".3"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fillOpacity=".5"/>
              </svg>
              {isNL ? 'Verbind met Google' : 'Connect with Google'}
            </button>
            <p className="apd-connect-hint">
              <Lock className="w-3 h-3 apd-connect-hint-icon" />
              <span>{isNL ? 'Gratis · Alleen-lezen toegang · Geen account nodig' : 'Free · Read-only access · No account needed'}</span>
            </p>
            {error && <div className="tool-error apd-error">{error}</div>}
          </div>
        )}

        {/* Connection check */}
        {connected === null && !loading && (
          <div className="apd-checking">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p>{isNL ? 'Verbinding controleren...' : 'Checking connection...'}</p>
          </div>
        )}

        {/* Fetching */}
        {connected && fetching && (
          <div className="apd-fetching">
            <div className="apd-fetching-spinner">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <p className="apd-fetching-title">
              {isNL ? <>AI-prompts ophalen uit <em>Search Console</em></> : <>Fetching AI prompts from <em>Search Console</em></>}
            </p>
            <p className="apd-fetching-sub">
              {isNL ? 'We analyseren je queries van de afgelopen 90 dagen' : 'Analyzing last 90 days of queries'}
            </p>
          </div>
        )}

        {/* Connected + has results */}
        {connected && !fetching && allPrompts.length > 0 && (
          <div className="apd-results">

            {/* Property bar */}
            <div className="apd-property-bar">
              <div className="apd-property-picker-wrap">
                <button
                  onClick={() => properties.length > 1 && setShowPicker(!showPicker)}
                  className="apd-property-pill"
                  aria-expanded={showPicker}
                >
                  <Globe className="w-4 h-4" />
                  <span>{selectedProperty ? pLabel(selectedProperty) : '—'}</span>
                  {properties.length > 1 && <ChevronDown className={`w-4 h-4 apd-chevron${showPicker ? ' apd-chevron-open' : ''}`} />}
                </button>
                {showPicker && (
                  <div className="apd-property-dropdown">
                    {properties.map(p => (
                      <button
                        key={p.url}
                        onClick={() => {
                          setSelectedProperty(p.url)
                          setShowPicker(false)
                          try { setBrandName(new URL(p.url.replace('sc-domain:', 'https://')).hostname.replace('www.', '').split('.')[0]) } catch(e){}
                        }}
                        className={`apd-property-option${p.url === selectedProperty ? ' apd-property-option-active' : ''}`}
                      >
                        {pLabel(p.url)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="apd-toggle-label">
                <input type="checkbox" checked={hideBranded} onChange={(e) => setHideBranded(e.target.checked)} />
                <span>{isNL ? 'Verberg branded queries' : 'Hide branded queries'}</span>
              </label>

              <button onClick={disconnect} className="apd-disconnect" title={isNL ? 'Ontkoppel' : 'Disconnect'}>
                <Unplug className="w-3.5 h-3.5" />
                <span>{isNL ? 'Ontkoppel' : 'Disconnect'}</span>
              </button>
            </div>

            {/* Stats */}
            <div className="apd-stats">
              <div className="apd-stat">
                <p className="apd-stat-num">{commercial.length}</p>
                <p className="apd-stat-label">{isNL ? 'Commercieel' : 'Commercial'}</p>
              </div>
              <div className="apd-stat">
                <p className="apd-stat-num">{aiOverview.length}</p>
                <p className="apd-stat-label">AI Overviews</p>
              </div>
              <div className="apd-stat">
                <p className="apd-stat-num">{other.length}</p>
                <p className="apd-stat-label">{isNL ? 'Overig' : 'Other'}</p>
              </div>
              <p className="apd-stats-meta">{isNL ? 'Laatste 90 dagen · Search Console data' : 'Last 90 days · Search Console data'}</p>
            </div>

            {/* Selection action bar */}
            {selected.size > 0 && (
              <div className="apd-action-bar">
                <div>
                  <p className="apd-action-title">
                    {selected.size} {isNL ? `prompt${selected.size > 1 ? 's' : ''} geselecteerd` : `prompt${selected.size > 1 ? 's' : ''} selected`}
                  </p>
                  <p className="apd-action-sub">
                    {isNL ? 'Scan ze in ChatGPT en Perplexity' : 'Scan in ChatGPT and Perplexity'}
                  </p>
                </div>
                <button onClick={scanSelected} className="teun-scan-btn apd-action-btn">
                  <Sparkles className="w-4 h-4" />
                  {isNL ? `Scan ${selected.size} prompts` : `Scan ${selected.size} prompts`}
                </button>
              </div>
            )}

            {/* Pro upsell — when results visible */}
            {selected.size === 0 && allFiltered.length > 0 && (
              <div className="tool-account-cta apd-upsell">
                <h3>
                  {isNL
                    ? <>Track je AI-prompts <em>elke week automatisch</em></>
                    : <>Track your AI prompts <em>automatically every week</em></>}
                </h3>
                <p>
                  {isNL
                    ? 'Met Pro krijg je wekelijks nieuwe AI-prompts uit je Search Console én scan je ze automatisch in ChatGPT, Perplexity en Google AI Mode. Geen handmatig werk meer.'
                    : 'With Pro you get fresh AI prompts from your Search Console every week and scan them automatically in ChatGPT, Perplexity and Google AI Mode. No more manual work.'}
                </p>
                <Link href={isNL ? '/pricing' : '/en/pricing'} className="tool-account-cta-btn">
                  {isNL ? 'Bekijk Lite & Pro' : 'View Lite & Pro'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="small">{isNL ? 'Vanaf €29,95/mnd · Maandelijks opzegbaar' : 'From €29.95/mo · Cancel anytime'}</p>
              </div>
            )}

            {/* Commercial prompts */}
            {commercial.length > 0 && (
              <div className="apd-section">
                <SectionHeader
                  icon={<Sparkles className="w-4 h-4" />}
                  title={isNL ? 'Commerciele prompts' : 'Commercial prompts'}
                  count={commercial.length}
                  subtitle={isNL ? 'Klanten zoeken naar bureaus, specialisten of dienstverleners' : 'Customers searching for agencies, specialists or service providers'}
                  dotColor="#E8623A"
                />
                <div className="apd-prompt-list">
                  {commercial.slice(0, 30).map((p, i) => <PromptRow key={`c-${i}`} p={p} />)}
                </div>
                {commercial.length > 30 && (
                  <div className="apd-section-more">+{commercial.length - 30} {isNL ? 'meer' : 'more'}</div>
                )}
              </div>
            )}

            {/* AI Overview */}
            {aiOverview.length > 0 && (
              <div className="apd-section">
                <SectionHeader
                  icon={<Database className="w-4 h-4" />}
                  title="AI Overview queries"
                  count={aiOverview.length}
                  subtitle={isNL ? 'Queries uit Google AI Mode met locatie-context' : 'Queries from Google AI Mode with location context'}
                  dotColor="#3B82F6"
                />
                <div className="apd-prompt-list">
                  {aiOverview.slice(0, 30).map((p, i) => <PromptRow key={`ai-${i}`} p={p} />)}
                </div>
                {aiOverview.length > 30 && (
                  <div className="apd-section-more">+{aiOverview.length - 30} {isNL ? 'meer' : 'more'}</div>
                )}
              </div>
            )}

            {/* Other (collapsible) */}
            {other.length > 0 && (
              <div className="apd-section">
                <button onClick={() => setShowOther(!showOther)} className="apd-section-toggle">
                  <SectionHeader
                    icon={<ChevronDown className={`w-4 h-4 apd-chevron${showOther ? ' apd-chevron-open' : ''}`} />}
                    title={isNL ? 'Overige AI-prompts' : 'Other AI prompts'}
                    count={other.length}
                    subtitle={isNL ? 'Klik om alle informatieve queries te tonen' : 'Click to show all informational queries'}
                    dotColor="#94A3B8"
                  />
                </button>
                {showOther && (
                  <div className="apd-prompt-list">
                    {other.slice(0, 50).map((p, i) => <PromptRow key={`o-${i}`} p={p} />)}
                  </div>
                )}
              </div>
            )}

            {allFiltered.length === 0 && (
              <div className="apd-empty-state">
                {isNL ? 'Geen prompt-achtige queries gevonden.' : 'No prompt-like queries found.'}
              </div>
            )}

            {allFiltered.length > 0 && (
              <p className="apd-help-line">
                {isNL
                  ? 'Klik op prompts om ze te selecteren (max 10), scan ze daarna in ChatGPT en Perplexity.'
                  : 'Click prompts to select (max 10), then scan in ChatGPT and Perplexity.'}
              </p>
            )}

            {/* Cross-sell other tools */}
            <ToolsCrossSell currentTool="ai-prompt-discovery" locale={locale} />
          </div>
        )}

        {/* Connected but no prompts */}
        {connected && !fetching && allPrompts.length === 0 && (
          <div className="apd-no-results">
            <div className="apd-no-results-icon"><Search className="w-7 h-7" /></div>
            <h2>{isNL ? 'Geen AI-prompts gevonden' : 'No AI prompts found'}</h2>
            <p>
              {isNL
                ? 'We vonden geen lange queries voor deze property. Mogelijk is je site nog niet veel zichtbaar in AI-resultaten.'
                : 'We found no long queries for this property. Your site may not yet be visible in AI results.'}
            </p>
            {properties.length > 1 && (
              <div className="apd-no-results-properties">
                <p className="apd-no-results-label">{isNL ? 'Probeer een andere property:' : 'Try a different property:'}</p>
                {properties.filter(p => p.url !== selectedProperty).map(p => (
                  <button
                    key={p.url}
                    onClick={() => {
                      setSelectedProperty(p.url)
                      try { setBrandName(new URL(p.url.replace('sc-domain:', 'https://')).hostname.replace('www.', '').split('.')[0]) } catch(e){}
                    }}
                    className="apd-property-option"
                  >
                    {pLabel(p.url)}
                  </button>
                ))}
              </div>
            )}
            <button onClick={disconnect} className="apd-no-results-disconnect">
              {isNL ? 'Ontkoppel Search Console' : 'Disconnect Search Console'}
            </button>
          </div>
        )}
      </div>

      {/* SEO content */}
      {showSEOContent && (
        <>
          {/* SEO Intro */}
          <section className="tool-seo-intro">
            <div className="tool-wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
              <h2>
                {isNL
                  ? <>Jouw klanten zoeken al via <em>AI</em></>
                  : <>Your customers already search via <em>AI</em></>}
              </h2>
              <p>
                {isNL
                  ? 'Google Search Console bevat steeds meer lange, conversatie-achtige zoekopdrachten. Dit zijn queries die voortkomen uit AI Mode, AI Overviews en het veranderende zoekgedrag door ChatGPT. Deze tool analyseert je Search Console data en filtert automatisch de AI-prompts eruit.'
                  : 'Google Search Console increasingly contains long, conversational queries. These are queries stemming from AI Mode, AI Overviews, and changing search behavior driven by ChatGPT. This tool analyzes your Search Console data and automatically filters out the AI prompts.'}
              </p>
              <p>
                {isNL
                  ? 'We splitsen de resultaten in drie categorieen: commerciele prompts (iemand zoekt een bureau of specialist), Google AI Overview queries (met locatie-metadata), en overige informatieve vragen. Zo weet je precies waar je kansen liggen.'
                  : 'We split results into three categories: commercial prompts (someone looking for an agency or specialist), Google AI Overview queries (with location metadata), and other informational questions. So you know exactly where your opportunities are.'}
              </p>
            </div>
          </section>

          {/* What we discover (3-grid) */}
          <section className="tool-seo-how">
            <div className="tool-seo-how-wrap">
              <h2>
                {isNL ? <>Wat <em>ontdekken</em> we?</> : <>What do we <em>discover</em>?</>}
              </h2>
              <p className="tool-seo-how-sub">
                {isNL
                  ? 'We categoriseren je Search Console queries automatisch in drie groepen.'
                  : 'We automatically categorize your Search Console queries into three groups.'}
              </p>
              <div className="tool-seo-how-grid">
                {[
                  {
                    title: isNL ? 'Commerciele prompts' : 'Commercial prompts',
                    desc: isNL
                      ? 'Queries waarbij iemand een bureau, specialist of dienstverlener zoekt. Dit zijn je waardevolste leads.'
                      : 'Queries where someone is looking for an agency, specialist or service provider. Your most valuable leads.'
                  },
                  {
                    title: 'AI Overview queries',
                    desc: isNL
                      ? 'Queries die uit Google AI Mode en AI Overviews komen. Herkenbaar aan locatie-metadata die Google meestuurt.'
                      : 'Queries coming from Google AI Mode and AI Overviews. Recognizable by location metadata.'
                  },
                  {
                    title: isNL ? 'Overige AI-prompts' : 'Other AI prompts',
                    desc: isNL
                      ? 'Langere informatieve queries die niet in de andere categorieen vallen maar wel prompt-achtig zijn.'
                      : 'Longer informational queries that don\'t fit other categories but are still prompt-like.'
                  }
                ].map((item, i) => (
                  <div key={i} className="tool-seo-how-card">
                    <div className="tool-seo-how-card-head">
                      <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="teun-final" aria-labelledby="apd-final-heading">
            <div className="wrap">
              <h2 id="apd-final-heading">
                {isNL ? (
                  <>Verover de <em>prompts</em>.<br />Voor je concurrent ze ziet.</>
                ) : (
                  <>Capture the <em>prompts</em>.<br />Before your competitor does.</>
                )}
              </h2>
              <p>
                {isNL
                  ? 'Je Search Console zit vol met AI-prompts die niemand nog analyseert. Eenmalig koppelen, en je weet wat klanten typen, waar ze landen, en waar je kansen mist.'
                  : 'Your Search Console is full of AI prompts no one analyzes. Connect once and you\'ll know what customers type, where they land, and what opportunities you\'re missing.'}
              </p>
              <div className="btns">
                <button
                  onClick={() => {
                    if (connected === false) connectGSC()
                    else document.getElementById('apd-connect')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="btn-primary"
                >
                  {isNL ? 'Search Console koppelen' : 'Connect Search Console'} <span aria-hidden="true">→</span>
                </button>
                <Link href={isNL ? '/pricing' : '/en/pricing'} className="btn-secondary">
                  {isNL ? 'Bekijk Lite & Pro' : 'View Lite & Pro'}
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          {(() => {
            const catLabels = isNL
              ? { all: 'Alles', product: 'Product', privacy: 'Privacy', results: 'Resultaten' }
              : { all: 'All', product: 'Product', privacy: 'Privacy', results: 'Results' }

            const faqCounts = {
              all: faqItems.length,
              product: faqItems.filter(i => i.cat === 'product').length,
              privacy: faqItems.filter(i => i.cat === 'privacy').length,
              results: faqItems.filter(i => i.cat === 'results').length
            }

            const filteredFaq = faqCategory === 'all'
              ? faqItems
              : faqItems.filter(i => i.cat === faqCategory)

            return (
              <section className="teun-faq" id="faq" aria-labelledby="apd-faq-heading">
                <div className="wrap">
                  <div className="teun-faq-head">
                    <div className="teun-faq-eyebrow">
                      {isNL ? 'VRAGEN & ANTWOORDEN' : 'QUESTIONS & ANSWERS'}
                    </div>
                    <h2 id="apd-faq-heading">
                      {isNL ? (
                        <>Alles wat je wilt weten <em>voor je koppelt.</em></>
                      ) : (
                        <>Everything you want to know <em>before you connect.</em></>
                      )}
                    </h2>
                    <p className="sub">
                      {isNL
                        ? 'Geen bot-antwoorden, geen marketingpraat. De echte uitleg, geschreven door ons team.'
                        : 'No bot answers, no marketing speak. Real explanations, written by our team.'}
                    </p>
                  </div>

                  <div className="teun-faq-cats" role="tablist">
                    {[
                      { id: 'all',     count: faqCounts.all },
                      { id: 'product', count: faqCounts.product },
                      { id: 'privacy', count: faqCounts.privacy },
                      { id: 'results', count: faqCounts.results }
                    ].map(({ id, count }) => (
                      <button
                        key={id}
                        className={faqCategory === id ? 'active' : ''}
                        onClick={() => { setFaqCategory(id); setOpenFaq(0) }}
                        role="tab"
                        aria-selected={faqCategory === id}
                      >
                        {catLabels[id]}
                        <span className="count">{count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="teun-faq-list">
                    {filteredFaq.map((item, i) => (
                      <details
                        key={`${faqCategory}-${i}`}
                        className="teun-faq-item"
                        open={openFaq === i}
                        onToggle={(e) => { if (e.target.open) setOpenFaq(i) }}
                      >
                        <summary>
                          <span className="num">{String(i + 1).padStart(2, '0')}</span>
                          <h3 className="q">{item.q}</h3>
                          <span className="cat-chip">{catLabels[item.cat]}</span>
                          <span className="toggle" aria-hidden="true">
                            <svg viewBox="0 0 12 12" fill="none">
                              <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </span>
                        </summary>
                        <div className="answer-wrap">
                          <div className="answer">{item.a}</div>
                        </div>
                      </details>
                    ))}
                  </div>

                  <div className="teun-faq-help">
                    <div>
                      <h3>
                        {isNL ? <>Nog vragen? <em>We helpen je.</em></> : <>Still got questions? <em>We&rsquo;re here.</em></>}
                      </h3>
                      <p>
                        {isNL
                          ? 'Stuur ons een mail of plan een gesprek van 15 minuten. Geen verkooppraat, gewoon antwoorden.'
                          : 'Reach us by email or book a 15-minute call. No sales pitch, just answers.'}
                      </p>
                    </div>
                    <div className="teun-faq-help-actions">
                      <a href="mailto:hallo@teun.ai" className="teun-faq-help-btn primary">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2 3h10v8H2z M2 3l5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        hallo@teun.ai
                      </a>
                      <a
                        href="https://calendly.com/imre-onlinelabs/teun-ai-demo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="teun-faq-help-btn secondary"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M2 6h10M5 1v3M9 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        {isNL ? 'Plan een gesprek' : 'Book a call'}
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            )
          })()}
        </>
      )}
    </div>
  )
}

export default function AIPromptDiscoveryPage() {
  return (
    <Suspense fallback={
      <div className="tool-init">
        <div className="tool-init-spinner">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    }>
      <AIPromptDiscoveryContent />
    </Suspense>
  )
}
