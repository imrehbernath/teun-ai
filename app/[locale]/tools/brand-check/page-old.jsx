'use client'
// app/[locale]/tools/brand-check/page.jsx

import { useState, useRef, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowRight, CheckCircle2, XCircle, Building2, MapPin, Briefcase, ChevronDown, ChevronUp, Sparkles, Loader2, ThumbsUp, ThumbsDown, Minus, Eye, Search, MessageSquare, Star, Shield } from 'lucide-react'

// ============================================
// QUERY TYPES (match API)
// ============================================
const QUERY_TYPES = ['experiences', 'reviews', 'service']

// ============================================
// RECOMMENDATIONS (client-side)
// ============================================
function generateRecommendations(mentioned, mentionedPx, mentionedCg, sentiment, aspects, locale, brand) {
  const recs = []
  if (locale === 'nl') {
    if (!mentioned) {
      recs.push({ priority: 'high', text: `${brand} wordt niet genoemd door AI. Zorg voor meer online vermeldingen, reviews en content die je merk koppelt aan je expertise.` })
      recs.push({ priority: 'high', text: 'Publiceer case studies, FAQ-pagina\'s en blogcontent die specifiek je bedrijfsnaam en diensten benoemen.' })
    } else if (mentionedPx && !mentionedCg) {
      recs.push({ priority: 'medium', text: `${brand} wordt wel door Perplexity maar niet door ChatGPT genoemd. Focus op bredere online zichtbaarheid: meer backlinks, gastblogs en vakpublicaties.` })
    } else if (!mentionedPx && mentionedCg) {
      recs.push({ priority: 'medium', text: `${brand} wordt wel door ChatGPT maar niet door Perplexity genoemd. Perplexity weegt recente bronnen zwaarder. Publiceer verse content en persberichten.` })
    }
    if (sentiment === 'negative' || sentiment === 'mixed') {
      recs.push({ priority: 'high', text: 'Er zijn negatieve signalen gevonden. Reageer actief op reviews en klachten, en publiceer positieve klantverhalen.' })
    }
    if (!aspects.includes('reviews')) recs.push({ priority: 'medium', text: 'AI vindt weinig reviews over je bedrijf. Stimuleer klanten om Google Reviews achter te laten.' })
    if (!aspects.includes('betrouwbaarheid')) recs.push({ priority: 'medium', text: 'Voeg betrouwbaarheidssignalen toe: certificeringen, keurmerken, KvK-nummer en jaren ervaring op je website.' })
    if (!aspects.includes('bereikbaarheid')) recs.push({ priority: 'low', text: 'Maak contactgegevens prominenter: telefoonnummer, openingstijden en adres op elke pagina.' })
    if (mentioned && sentiment === 'positive') recs.push({ priority: 'low', text: 'Je merk wordt positief genoemd! Blijf actief content publiceren om deze positie te behouden.' })
  } else {
    if (!mentioned) {
      recs.push({ priority: 'high', text: `${brand} is not mentioned by AI. Increase online mentions, reviews and content that links your brand to your expertise.` })
      recs.push({ priority: 'high', text: 'Publish case studies, FAQ pages and blog content that specifically mention your company name and services.' })
    } else if (mentionedPx && !mentionedCg) {
      recs.push({ priority: 'medium', text: `${brand} is found by Perplexity but not ChatGPT. Focus on broader online visibility: more backlinks, guest posts and industry publications.` })
    } else if (!mentionedPx && mentionedCg) {
      recs.push({ priority: 'medium', text: `${brand} is found by ChatGPT but not Perplexity. Perplexity weighs recent sources more. Publish fresh content and press releases.` })
    }
    if (sentiment === 'negative' || sentiment === 'mixed') recs.push({ priority: 'high', text: 'Negative signals detected. Actively respond to reviews and complaints, and publish positive customer stories.' })
    if (!aspects.includes('reviews')) recs.push({ priority: 'medium', text: 'AI finds few reviews about your business. Encourage customers to leave Google Reviews.' })
    if (!aspects.includes('betrouwbaarheid')) recs.push({ priority: 'medium', text: 'Add trust signals: certifications, quality marks, chamber of commerce number and years of experience.' })
    if (!aspects.includes('bereikbaarheid')) recs.push({ priority: 'low', text: 'Make contact details more prominent: phone number, opening hours and address on every page.' })
    if (mentioned && sentiment === 'positive') recs.push({ priority: 'low', text: 'Your brand is mentioned positively! Keep publishing content to maintain this position.' })
  }
  return recs.slice(0, 5)
}

// ============================================
// BRAND CHECK PAGE
// ============================================
export default function BrandCheckPage() {
  const t = useTranslations('brandCheck')
  const locale = useLocale()

  const [brandName, setBrandName] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [expandedQuery, setExpandedQuery] = useState(null)
  const [activeTab, setActiveTab] = useState({})
  const resultsRef = useRef(null)

  const MAX_FREE_SCANS = 2
  const ADMIN_EMAILS = ['imre@onlinelabs.nl', 'hallo@onlinelabs.nl']
  const [scanCount, setScanCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  const [scanPhase, setScanPhase] = useState('idle')
  const [queryStates, setQueryStates] = useState([{ status: 'waiting' }, { status: 'waiting' }, { status: 'waiting' }])

  const faqItems = locale === 'en' ? [
    { q: 'What is an AI Brand Check?', a: 'An AI Brand Check analyzes what AI platforms like ChatGPT and Perplexity say about your business. We check sentiment, reputation signals and whether your brand is actually mentioned in AI-generated answers.' },
    { q: 'Is the AI Brand Check free?', a: 'Yes, you can run 2 brand checks per day for free. No credit card needed.' },
    { q: 'Which AI platforms are checked?', a: 'We test your brand on both Perplexity and ChatGPT with 3 different commercial queries about experiences, reviews and service quality. That is 6 AI checks in total.' },
    { q: 'What if my brand is not mentioned by AI?', a: 'That means AI platforms don\'t yet associate your brand with your industry. The tool gives you concrete recommendations to improve this, such as publishing more reviews, case studies and expertise content.' },
    { q: 'How can I improve my AI brand perception?', a: 'Focus on Google Reviews, publish case studies and customer stories, ensure consistent NAP data, and create content that explicitly mentions your brand name with your expertise and location.' },
  ] : [
    { q: 'Wat is een AI Brand Check?', a: 'Een AI Brand Check analyseert wat AI-platformen zoals ChatGPT en Perplexity over jouw bedrijf zeggen. We checken sentiment, reputatiesignalen en of jouw merk daadwerkelijk wordt genoemd in AI-antwoorden.' },
    { q: 'Is de AI Brand Check gratis?', a: 'Ja, je kunt 2 brand checks per dag gratis uitvoeren. Geen creditcard nodig.' },
    { q: 'Welke AI-platformen worden gecheckt?', a: 'We testen je merk op zowel Perplexity als ChatGPT met 3 verschillende commerciele zoekvragen over ervaringen, reviews en servicekwaliteit. Dat zijn 6 AI-checks in totaal.' },
    { q: 'Wat als mijn merk niet wordt genoemd door AI?', a: 'Dan associeren AI-platformen je merk nog niet met je branche. De tool geeft je concrete aanbevelingen om dit te verbeteren, zoals meer reviews, case studies en expertcontent publiceren.' },
    { q: 'Hoe verbeter ik mijn AI-merkperceptie?', a: 'Focus op Google Reviews, publiceer case studies en klantverhalen, zorg voor consistente bedrijfsgegevens, en maak content die expliciet je merknaam koppelt aan je expertise en locatie.' },
  ]

  const queryLabels = locale === 'en' ? [
    { icon: <Shield className="w-4 h-4" />, title: 'Experiences & Reliability', scanning: 'Querying Perplexity + ChatGPT...' },
    { icon: <Star className="w-4 h-4" />, title: 'Reviews & Complaints', scanning: 'Querying Perplexity + ChatGPT...' },
    { icon: <MessageSquare className="w-4 h-4" />, title: 'Service & Accessibility', scanning: 'Querying Perplexity + ChatGPT...' },
  ] : [
    { icon: <Shield className="w-4 h-4" />, title: 'Ervaringen & Betrouwbaarheid', scanning: 'Perplexity + ChatGPT bevragen...' },
    { icon: <Star className="w-4 h-4" />, title: 'Reviews & Klachten', scanning: 'Perplexity + ChatGPT bevragen...' },
    { icon: <MessageSquare className="w-4 h-4" />, title: 'Service & Bereikbaarheid', scanning: 'Perplexity + ChatGPT bevragen...' },
  ]

  useEffect(() => {
    const faqData = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(faqData)
    script.id = 'faq-schema-brand'
    const existing = document.getElementById('faq-schema-brand')
    if (existing) existing.remove()
    document.head.appendChild(script)
    return () => { const el = document.getElementById('faq-schema-brand'); if (el) el.remove() }
  }, [locale])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthChecked(true)
      try {
        if (session?.user) {
          const today = new Date().toISOString().split('T')[0]
          const stored = localStorage.getItem(`brand_check_${today}`)
          if (stored) { setScanCount(parseInt(stored)); setLimitReached(parseInt(stored) >= MAX_FREE_SCANS) }
        } else {
          const stored = localStorage.getItem('brand_check_count')
          if (stored) { setScanCount(parseInt(stored)); setLimitReached(parseInt(stored) >= MAX_FREE_SCANS) }
        }
      } catch (e) {}
    })
  }, [])

  // ── SEQUENTIAL SCAN ────────────────────────
  async function handleScan(e) {
    e.preventDefault()
    if (!brandName.trim() || !category.trim()) return

    setLoading(true)
    setError('')
    setResults(null)
    setExpandedQuery(null)
    setActiveTab({})
    setScanPhase('scanning')
    setQueryStates([{ status: 'waiting' }, { status: 'waiting' }, { status: 'waiting' }])

    const queryResults = []
    const baseBody = { brandName: brandName.trim(), location: location.trim(), category: category.trim(), locale }

    try {
      // Run 3 queries SEQUENTIALLY — real progress per step
      for (let i = 0; i < QUERY_TYPES.length; i++) {
        // Mark current as scanning
        setQueryStates(prev => prev.map((q, idx) => idx === i ? { status: 'scanning' } : q))

        const response = await fetch('/api/brand-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...baseBody, queryType: QUERY_TYPES[i] })
        })

        const data = await response.json()

        if (!response.ok) {
          // Mark as error but continue
          setQueryStates(prev => prev.map((q, idx) => idx === i ? { status: 'error' } : q))
          queryResults.push({ queryType: QUERY_TYPES[i], prompt: '', perplexity: { response: '', mentioned: false, sentiment: 'neutral', score: 50, posSignals: [], negSignals: [], aspects: [] }, chatgpt: { response: '', mentioned: false, sentiment: 'neutral', score: 50, posSignals: [], negSignals: [], aspects: [] } })
        } else {
          queryResults.push(data)
          // Mark as done
          setQueryStates(prev => prev.map((q, idx) => idx === i ? { status: 'done' } : q))
        }
      }

      // ── Aggregate results ──
      const allPx = queryResults.map(r => r.perplexity)
      const allCg = queryResults.map(r => r.chatgpt)
      const allResults = [...allPx, ...allCg]

      const totalPos = allResults.reduce((s, r) => s + (r.posSignals?.length || 0), 0)
      const totalNeg = allResults.reduce((s, r) => s + (r.negSignals?.length || 0), 0)
      const allAspects = [...new Set(allResults.flatMap(r => r.aspects || []))]
      const allPosSignals = [...new Set(allResults.flatMap(r => r.posSignals || []))]
      const allNegSignals = [...new Set(allResults.flatMap(r => r.negSignals || []))]

      const mentionedPx = allPx.some(r => r.mentioned)
      const mentionedCg = allCg.some(r => r.mentioned)
      const mentionedAny = mentionedPx || mentionedCg
      const pxMentionCount = allPx.filter(r => r.mentioned).length
      const cgMentionCount = allCg.filter(r => r.mentioned).length

      let overallSentiment = 'neutral'
      if (totalPos > totalNeg * 2) overallSentiment = 'positive'
      else if (totalNeg > totalPos * 2) overallSentiment = 'negative'
      else if (totalPos > 0 || totalNeg > 0) overallSentiment = 'mixed'

      const total = totalPos + totalNeg
      const overallScore = total > 0 ? Math.round((totalPos / total) * 100) : 50

      const recommendations = generateRecommendations(mentionedAny, mentionedPx, mentionedCg, overallSentiment, allAspects, locale, brandName.trim())

      setScanPhase('done')

      // Update scan count
      if (!isAdmin) {
        const newCount = scanCount + 1
        setScanCount(newCount)
        try {
          if (user) {
            const today = new Date().toISOString().split('T')[0]
            localStorage.setItem(`brand_check_${today}`, newCount.toString())
          } else {
            localStorage.setItem('brand_check_count', newCount.toString())
          }
        } catch (e) {}
        if (newCount >= MAX_FREE_SCANS) setLimitReached(true)
      }

      // Small delay for last animation frame
      await new Promise(r => setTimeout(r, 400))

      setResults({
        brandName: brandName.trim(),
        location: location.trim(),
        overallSentiment,
        overallScore,
        mentioned: mentionedAny,
        platforms: {
          perplexity: { mentioned: mentionedPx, mentionCount: pxMentionCount },
          chatgpt: { mentioned: mentionedCg, mentionCount: cgMentionCount },
        },
        aspects: allAspects,
        posSignals: allPosSignals,
        negSignals: allNegSignals,
        recommendations,
        queries: queryResults,
      })

      setLoading(false)
      setTimeout(() => { resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 200)

    } catch (err) {
      setError(locale === 'en' ? 'Connection error. Please try again.' : 'Verbindingsfout. Probeer het opnieuw.')
      setScanPhase('idle')
      setLoading(false)
    }
  }

  const getSentimentColor = (s) => s === 'positive' ? '#10b981' : s === 'negative' ? '#ef4444' : s === 'mixed' ? '#f59e0b' : '#94a3b8'
  const getSentimentLabel = (s) => {
    if (locale === 'en') return s === 'positive' ? 'Positive' : s === 'negative' ? 'Negative' : s === 'mixed' ? 'Mixed' : 'Neutral'
    return s === 'positive' ? 'Positief' : s === 'negative' ? 'Negatief' : s === 'mixed' ? 'Gemengd' : 'Neutraal'
  }
  const getSentimentIcon = (s) => s === 'positive' ? <ThumbsUp className="w-5 h-5" /> : s === 'negative' ? <ThumbsDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />

  const ASPECT_LABELS = { bereikbaarheid: locale === 'en' ? 'Accessibility' : 'Bereikbaarheid', reviews: 'Reviews', klachten: locale === 'en' ? 'Complaints' : 'Klachten', service: 'Service', openingstijden: locale === 'en' ? 'Opening hours' : 'Openingstijden', betrouwbaarheid: locale === 'en' ? 'Reliability' : 'Betrouwbaarheid', prijs: locale === 'en' ? 'Price' : 'Prijs', snelheid: locale === 'en' ? 'Speed' : 'Snelheid' }
  const ASPECT_ICONS = { bereikbaarheid: '📞', reviews: '⭐', klachten: '⚠️', service: '🛎️', openingstijden: '🕐', betrouwbaarheid: '🔒', prijs: '💰', snelheid: '⚡' }

  // Progress based on actual query states
  const completedCount = queryStates.filter(q => q.status === 'done' || q.status === 'error').length
  const scanProgress = Math.round((completedCount / 3) * 100)

  return (
    <div className="min-h-screen bg-white">
      {/* ── HERO + INPUT (always visible) ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-purple-700 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI Brand Check
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-slate-900 leading-tight px-4">{t('heroTitle')}</h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4 mb-4" dangerouslySetInnerHTML={{ __html: t.raw('heroSubtitle') }} />
        </div>

        {limitReached && !isAdmin && authChecked ? (
          <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8 text-center">
            <p className="text-xl font-bold text-slate-900 mb-2">{user ? t('dailyLimitTitle') : t('freeLimitTitle', { count: MAX_FREE_SCANS })}</p>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">{user ? t('dailyLimitDesc', { count: MAX_FREE_SCANS }) : t('freeLimitDesc', { count: MAX_FREE_SCANS })}</p>
            <Link href={user ? '/dashboard' : '/signup'} className="bg-[#292956] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#1e1e45] transition-all inline-flex items-center gap-2 cursor-pointer">
              {user ? t('backToDashboard') : t('createFreeAccount')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleScan} className="space-y-4">
              <div className={`bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-4 sm:p-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <Building2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder={locale === 'en' ? 'Company name, e.g. OnlineLabs' : 'Bedrijfsnaam, bijv. OnlineLabs'} className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" required minLength={2} disabled={loading} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder={locale === 'en' ? 'City (optional)' : 'Vestigingsplaats (optioneel)'} className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" disabled={loading} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder={locale === 'en' ? 'Industry, e.g. web design' : 'Branche, bijv. webdesign'} className="w-full py-2 text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" required minLength={2} disabled={loading} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading || !brandName.trim() || !category.trim()} className="w-full bg-[#292956] text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-[#1e1e45] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-lg">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />{locale === 'en' ? 'Checking...' : 'Checken...'}</> : <><Sparkles className="w-5 h-5" />{t('scanButton')}</>}
              </button>
            </form>
            {!loading && <p className="text-xs text-slate-400 mt-2 text-center">{locale === 'en' ? '6 AI checks across Perplexity and ChatGPT. Takes about 30 seconds.' : '6 AI-checks op Perplexity en ChatGPT. Duurt circa 30 seconden.'}</p>}
          </>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}
      </section>

      {/* ── SCAN ANIMATION ── */}
      {loading && scanPhase === 'scanning' && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-500" />
                {locale === 'en' ? `Analyzing ${brandName} on 2 platforms` : `${brandName} analyseren op 2 platformen`}
              </span>
              <span className="text-sm text-slate-400">{scanProgress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${scanProgress}%` }} />
            </div>
          </div>

          <div className="space-y-3">
            {queryLabels.map((q, i) => {
              const state = queryStates[i]
              return (
                <div key={i} className={`rounded-xl border p-4 transition-all duration-500 ${state.status === 'done' ? 'bg-emerald-50 border-emerald-200' : state.status === 'scanning' ? 'bg-white border-purple-300 shadow-md shadow-purple-100' : state.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${state.status === 'done' ? 'bg-emerald-500 text-white' : state.status === 'scanning' ? 'bg-purple-500 text-white' : state.status === 'error' ? 'bg-red-400 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {state.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : state.status === 'scanning' ? <Loader2 className="w-5 h-5 animate-spin" /> : state.status === 'error' ? <XCircle className="w-5 h-5" /> : q.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${state.status === 'done' ? 'text-emerald-800' : state.status === 'scanning' ? 'text-slate-900' : 'text-slate-500'}`}>{q.title}</p>
                      <p className={`text-xs mt-0.5 ${state.status === 'done' ? 'text-emerald-600' : state.status === 'scanning' ? 'text-purple-600' : 'text-slate-400'}`}>
                        {state.status === 'done' ? (locale === 'en' ? 'Both platforms complete' : 'Beide platformen afgerond') : state.status === 'scanning' ? q.scanning : state.status === 'error' ? (locale === 'en' ? 'Error — skipped' : 'Fout — overgeslagen') : (locale === 'en' ? 'Waiting...' : 'Wachten...')}
                      </p>
                    </div>
                    {state.status === 'scanning' && (
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-xs text-slate-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Perplexity</span>
            <span className="text-xs text-slate-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} /> ChatGPT</span>
          </div>
        </section>
      )}

      {/* ── RESULTS ── */}
      {results && (
        <section ref={resultsRef} className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {[{ name: 'Perplexity', data: results.platforms?.perplexity }, { name: 'ChatGPT', data: results.platforms?.chatgpt }].map((p, i) => (
              <div key={i} className={`rounded-xl p-4 border ${p.data?.mentioned ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {p.data?.mentioned ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.data?.mentioned ? (locale === 'en' ? `Mentioned in ${p.data.mentionCount}/3 queries` : `Genoemd in ${p.data.mentionCount}/3 zoekvragen`) : (locale === 'en' ? 'Not mentioned' : 'Niet genoemd')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={getSentimentColor(results.overallSentiment)} strokeWidth="10" strokeDasharray={`${(results.overallScore / 100) * 327} 327`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: getSentimentColor(results.overallSentiment) }}>{results.overallScore}</span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                  <span style={{ color: getSentimentColor(results.overallSentiment) }}>{getSentimentIcon(results.overallSentiment)}</span>
                  <h3 className="text-xl font-bold text-slate-900">{getSentimentLabel(results.overallSentiment)}</h3>
                </div>
                <p className="text-sm text-slate-500">{results.brandName}{results.location ? ` · ${results.location}` : ''} · 6 checks</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {results.posSignals?.slice(0, 4).map((s, i) => (<span key={`p${i}`} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">+{s}</span>))}
                  {results.negSignals?.slice(0, 3).map((s, i) => (<span key={`n${i}`} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full">-{s}</span>))}
                </div>
              </div>
            </div>
          </div>

          {results.aspects?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">{locale === 'en' ? 'Topics AI talks about' : 'Onderwerpen waarover AI spreekt'}</h3>
              <div className="flex flex-wrap gap-2">{results.aspects.map((a, i) => (<span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-sm px-3 py-1.5 rounded-lg">{ASPECT_ICONS[a] || '📋'} {ASPECT_LABELS[a] || a}</span>))}</div>
            </div>
          )}

          {results.recommendations?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-600" />{locale === 'en' ? 'Recommendations' : 'Aanbevelingen'}</h3>
              <div className="space-y-2">
                {results.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5 ${rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`}>{i + 1}</span>
                    <p className="text-sm text-slate-700">{rec.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">{locale === 'en' ? 'AI responses per query' : 'AI-antwoorden per zoekvraag'}</h3>
            <div className="space-y-3">
              {results.queries?.map((q, i) => {
                const tab = activeTab[i] || 'perplexity'
                const pxData = q.perplexity || {}
                const cgData = q.chatgpt || {}
                const anyMentioned = pxData.mentioned || cgData.mentioned
                return (
                  <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedQuery(expandedQuery === i ? null : i)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        {anyMentioned ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        <span className="text-sm text-slate-700 truncate">{q.prompt}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${pxData.mentioned ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'}`}>PX</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${cgData.mentioned ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'}`}>CG</span>
                        {expandedQuery === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>
                    {expandedQuery === i && (
                      <div className="px-4 pb-4 border-t border-slate-100">
                        <div className="flex gap-2 mt-3 mb-3">
                          <button onClick={() => setActiveTab(prev => ({ ...prev, [i]: 'perplexity' }))} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${tab === 'perplexity' ? 'bg-[#292956] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Perplexity {pxData.mentioned ? '✓' : '✗'}</button>
                          <button onClick={() => setActiveTab(prev => ({ ...prev, [i]: 'chatgpt' }))} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${tab === 'chatgpt' ? 'bg-[#292956] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>ChatGPT {cgData.mentioned ? '✓' : '✗'}</button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-400 flex items-center gap-1"><Eye className="w-3 h-3" /> {tab === 'perplexity' ? 'Perplexity' : 'ChatGPT'}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${(tab === 'perplexity' ? pxData : cgData).sentiment === 'positive' ? 'bg-emerald-50 text-emerald-700' : (tab === 'perplexity' ? pxData : cgData).sentiment === 'negative' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{getSentimentLabel((tab === 'perplexity' ? pxData : cgData).sentiment)}</span>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{(tab === 'perplexity' ? pxData : cgData).response || (locale === 'en' ? 'No response received.' : 'Geen antwoord ontvangen.')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-lg font-bold text-slate-900 mb-2">{t('ctaTitle')}</p>
            <p className="text-slate-600 text-sm max-w-md mx-auto mb-5">{t('ctaDesc')}</p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-[#292956] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1e1e45] transition-colors cursor-pointer">{t('createFreeAccount')} <ArrowRight className="w-4 h-4" /></Link>
          </div>

          <div className="mt-6 text-center">
            <button onClick={() => { setResults(null); setScanPhase('idle'); setBrandName(''); setLocation(''); setCategory(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-sm text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 cursor-pointer">← {locale === 'en' ? 'Check another brand' : 'Ander merk checken'}</button>
          </div>
        </section>
      )}

      {/* ── SEO CONTENT ── */}
      {!results && !loading && (
        <>
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 leading-tight">{locale === 'en' ? <>What does AI say<br /><span className="text-[#7C3AED]">when someone asks about your business?</span></> : <>Wat zegt AI<br /><span className="text-[#7C3AED]">als iemand naar jouw bedrijf vraagt?</span></>}</h2>
            <p className="text-slate-600 leading-relaxed mb-4">{locale === 'en' ? 'Millions of people ask ChatGPT and Perplexity for business recommendations every day. What does ChatGPT say about my business? An AI Brand Check reveals exactly that: the brand mentions AI generates, the sentiment, and whether you appear at all. This free AI reputation check shows your brand perception across platforms.' : 'Miljoenen mensen vragen ChatGPT en Perplexity dagelijks om bedrijfsaanbevelingen. Wat zegt ChatGPT over mijn bedrijf? Een AI Brand Check onthult precies dat: de AI merkperceptie, het sentiment, en of je uberhaupt wordt genoemd. Deze gratis AI reputatie check toont hoe AI over jouw merk praat.'}</p>
            <p className="text-slate-600 leading-relaxed">{locale === 'en' ? 'This free tool runs 3 commercial queries on both Perplexity and ChatGPT about your brand: experiences, reviews, and service quality. 6 AI reputation checks in total. You see exactly how AI perceives your business and get concrete tips to improve your AI brand perception.' : 'Deze gratis tool voert 3 commerciele zoekvragen uit op zowel Perplexity als ChatGPT over jouw merk: ervaringen, reviews, en servicekwaliteit. 6 AI reputatie checks in totaal. Je ziet precies hoe AI over jouw merk praat en krijgt concrete tips om je AI merkperceptie te verbeteren.'}</p>
          </section>

          <section className="bg-slate-50 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">{locale === 'en' ? 'What do we check?' : 'Wat checken we?'}</h2>
              <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">{locale === 'en' ? '3 targeted queries on 2 AI platforms reveal how AI perceives your brand.' : '3 gerichte zoekvragen op 2 AI-platformen onthullen hoe AI jouw merk ziet.'}</p>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { num: '1', title: locale === 'en' ? 'Experiences' : 'Ervaringen', desc: locale === 'en' ? 'Is your business considered reliable? What experiences does AI highlight?' : 'Wordt jouw bedrijf als betrouwbaar gezien? Welke ervaringen licht AI uit?' },
                  { num: '2', title: locale === 'en' ? 'Reviews' : 'Reviews', desc: locale === 'en' ? 'What does AI know about your reviews and complaints? Are there negative signals?' : 'Wat weet AI over je reviews en klachten? Zijn er negatieve signalen?' },
                  { num: '3', title: locale === 'en' ? 'Service' : 'Service', desc: locale === 'en' ? 'How does AI rate your accessibility, quality and service level?' : 'Hoe beoordeelt AI je bereikbaarheid, kwaliteit en serviceniveau?' }
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-sm font-bold mb-3">{item.num}</div>
                    <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                    <div className="flex gap-2 mt-3">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded">Perplexity</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded">ChatGPT</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 text-center">{locale === 'en' ? <>AI has an opinion<br /><span className="text-[#7C3AED]">about your business</span></> : <>AI heeft een mening<br /><span className="text-[#7C3AED]">over jouw bedrijf</span></>}</h2>
            <p className="text-slate-600 leading-relaxed text-center mb-6 max-w-2xl mx-auto">{locale === 'en' ? 'When someone asks "Is [your company] reliable?", AI constructs an answer from online sources. Reviews, forums, social media, and industry articles all influence AI brand mentions. Understanding what AI says about your business is the first step to improving your AI reputation.' : 'Als iemand vraagt "Is [jouw bedrijf] betrouwbaar?", stelt AI een antwoord samen uit online bronnen. Reviews, forums, social media en brancheartikelen bepalen de AI merkperceptie. Begrijpen hoe AI over jouw merk praat is de eerste stap naar een betere AI reputatie.'}</p>
            <div className="bg-[#292956] rounded-2xl p-6 sm:p-8 text-white">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs">👤</span></div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">{locale === 'en' ? '"What are experiences with [your company]? Is it reliable?"' : '"Wat zijn ervaringen met [jouw bedrijf]? Is het betrouwbaar?"'}</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs">🤖</span></div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">{locale === 'en' ? '"Based on available information..."' : '"Op basis van beschikbare informatie..."'}<br /><span className="text-purple-300 font-medium">{locale === 'en' ? 'Is the response positive, negative, or does AI not even know your brand?' : 'Is het antwoord positief, negatief, of kent AI je merk niet eens?'}</span></div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">{locale === 'en' ? 'Frequently asked questions' : 'Veelgestelde vragen'}</h2>
              <div className="space-y-3">
                {faqItems.map((item, i) => (
                  <details key={i} className="group border border-slate-200 rounded-xl bg-white">
                    <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-slate-900 hover:bg-slate-50 rounded-xl text-sm sm:text-base">{item.q}<ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" /></summary>
                    <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 text-center">
              <p className="text-lg font-bold text-slate-900 mb-2">{locale === 'en' ? 'Want a complete AI visibility analysis?' : 'Wil je een complete AI-zichtbaarheidsanalyse?'}</p>
              <p className="text-slate-600 text-sm max-w-md mx-auto mb-5">{locale === 'en' ? 'Combine brand perception with page-level GEO analysis. Match AI prompts to your best pages with targeted optimization per page.' : 'Combineer merkperceptie met pagina-niveau GEO analyse. Match AI-prompts aan je beste pagina\'s met gerichte optimalisatie per pagina.'}</p>
              <Link href="/signup" className="inline-flex items-center gap-2 bg-[#292956] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1e1e45] transition-colors cursor-pointer">{locale === 'en' ? 'Create free account' : 'Gratis account aanmaken'} <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </section>

          <div className="flex justify-center pb-12">
            <Image src="/Teun-ai_welkom.png" alt={locale === 'en' ? 'Teun.ai mascot' : 'Teun.ai mascotte'} width={200} height={200} className="w-40 sm:w-48" />
          </div>
        </>
      )}
    </div>
  )
}
