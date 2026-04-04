'use client'
// app/[locale]/tools/brand-check/page.jsx

import { useState, useRef, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowRight, CheckCircle2, XCircle, Building2, MapPin, Briefcase, ChevronDown, ChevronUp, Sparkles, Loader2, ThumbsUp, ThumbsDown, Minus, Eye, Search, MessageSquare, Star, Shield, BarChart3 } from 'lucide-react'
import ToolsCrossSell from '@/app/components/ToolsCrossSell'

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
  const [openFaq, setOpenFaq] = useState(0)
  const resultsRef = useRef(null)

  const MAX_FREE_SCANS = 2
  const ADMIN_EMAILS = ['imre@onlinelabs.nl', 'hallo@onlinelabs.nl']
  const [scanCount, setScanCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  const [scanPhase, setScanPhase] = useState('idle')
  const [queryStates, setQueryStates] = useState([{ status: 'waiting' }, { status: 'waiting' }, { status: 'waiting' }])
  const [reviewsData, setReviewsData] = useState(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [brancheTooltip, setBrancheTooltip] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoTheater, setVideoTheater] = useState(false)

  const faqItems = locale === 'en' ? [
    { q: 'What is an AI Brand Check?', a: 'An AI Brand Check analyzes what AI platforms like ChatGPT and Perplexity say about your business. We check sentiment, reputation signals and whether your brand is actually mentioned in AI-generated answers.' },
    { q: 'Is the AI Brand Check free?', a: 'Yes, you can run 2 brand checks per day for free. No credit card needed.' },
    { q: 'Which AI platforms are checked?', a: 'We test your brand on both Perplexity and ChatGPT with 3 different commercial queries about experiences, reviews and service quality. That is 6 AI checks in total. We also pull your Google Reviews to compare AI perception with reality.' },
    { q: 'What if my brand is not mentioned by AI?', a: 'That means AI platforms don\'t yet associate your brand with your industry. The tool gives you concrete recommendations to improve this, such as publishing more reviews, case studies and expertise content.' },
    { q: 'How can I improve my AI brand perception?', a: 'Focus on Google Reviews, publish case studies and customer stories, ensure consistent NAP data, and create content that explicitly mentions your brand name with your expertise and location.' },
  ] : [
    { q: 'Wat is een AI Brand Check?', a: 'Een AI Brand Check analyseert wat AI-platformen zoals ChatGPT en Perplexity over jouw bedrijf zeggen. We checken sentiment, reputatiesignalen en of jouw merk daadwerkelijk wordt genoemd in AI-antwoorden.' },
    { q: 'Is de AI Brand Check gratis?', a: 'Ja, je kunt 2 brand checks per dag gratis uitvoeren. Geen creditcard nodig.' },
    { q: 'Welke AI-platformen worden gecheckt?', a: 'We testen je merk op zowel Perplexity als ChatGPT met 3 verschillende commerciele zoekvragen over ervaringen, reviews en servicekwaliteit. Dat zijn 6 AI-checks in totaal. We halen ook je Google Reviews op om AI-perceptie met de werkelijkheid te vergelijken.' },
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthChecked(true)

      // Check Pro status
      if (session?.user) {
        if (ADMIN_EMAILS.includes(session.user.email)) {
          setIsPro(true)
        } else {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_status')
              .eq('id', session.user.id)
              .single()
            if (['active', 'canceling'].includes(profile?.subscription_status)) {
              setIsPro(true)
            }
          } catch {}
        }
      }

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

  // Theater mode: Escape to close, lock scroll
  useEffect(() => {
    if (!videoTheater) return
    const handleKey = (e) => { if (e.key === 'Escape') setVideoTheater(false) }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [videoTheater])

  // ── SEQUENTIAL SCAN ────────────────────────
  async function handleScan(e) {
    e.preventDefault()
    if (!brandName.trim() || !category.trim() || !location.trim()) return

    setLoading(true)
    setError('')
    setResults(null)
    setReviewsData(null)
    setReviewsLoading(false)
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

      // Auto-fetch Google Reviews in background
      fetchGoogleReviews(brandName.trim(), location.trim())

    } catch (err) {
      setError(locale === 'en' ? 'Connection error. Please try again.' : 'Verbindingsfout. Probeer het opnieuw.')
      setScanPhase('idle')
      setLoading(false)
    }
  }

  const getSentimentColor = (s) => s === 'positive' ? '#10b981' : s === 'negative' ? '#ef4444' : s === 'mixed' ? '#f59e0b' : '#94a3b8'

  async function fetchGoogleReviews(brand, loc) {
    setReviewsLoading(true)
    setReviewsData(null)
    try {
      const res = await fetch('/api/brand-check/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: brand, location: loc, locale }),
      })
      const data = await res.json()
      if (res.ok && data.found) {
        setReviewsData(data)
      }
    } catch (e) {
      console.error('Reviews fetch error:', e)
    }
    setReviewsLoading(false)
  }
  const getSentimentLabel = (s) => {
    if (locale === 'en') return s === 'positive' ? 'Positive' : s === 'negative' ? 'Negative' : s === 'mixed' ? 'Mixed' : 'Neutral'
    return s === 'positive' ? 'Positief' : s === 'negative' ? 'Negatief' : s === 'mixed' ? 'Gemengd' : 'Neutraal'
  }
  const getSentimentIcon = (s) => s === 'positive' ? <ThumbsUp className="w-5 h-5" /> : s === 'negative' ? <ThumbsDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />

  const ASPECT_LABELS = { bereikbaarheid: locale === 'en' ? 'Accessibility' : 'Bereikbaarheid', reviews: 'Reviews', klachten: locale === 'en' ? 'Complaints' : 'Klachten', service: 'Service', openingstijden: locale === 'en' ? 'Opening hours' : 'Openingstijden', betrouwbaarheid: locale === 'en' ? 'Reliability' : 'Betrouwbaarheid', prijs: locale === 'en' ? 'Price' : 'Prijs', snelheid: locale === 'en' ? 'Speed' : 'Snelheid' }
  const ASPECT_ICONS = { bereikbaarheid: <MapPin className="w-3.5 h-3.5" />, reviews: <Star className="w-3.5 h-3.5" />, klachten: <Shield className="w-3.5 h-3.5" />, service: <MessageSquare className="w-3.5 h-3.5" />, openingstijden: <Eye className="w-3.5 h-3.5" />, betrouwbaarheid: <CheckCircle2 className="w-3.5 h-3.5" />, prijs: <BarChart3 className="w-3.5 h-3.5" />, snelheid: <Sparkles className="w-3.5 h-3.5" /> }

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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-slate-900 leading-tight px-4">{t('heroTitle')}</h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4 mb-4" dangerouslySetInnerHTML={{ __html: t.raw('heroSubtitle') }} />
          <div className="flex justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-sm text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-400" />Perplexity</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-sm text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-400" />ChatGPT</span>
          </div>
        </div>

        {/* ── Demo Video ── */}
        {!loading && !results && (
          <div className="max-w-3xl mx-auto mb-8 sm:mb-10">
            <p className="text-center text-sm font-medium text-slate-500 mb-3">
              {locale === 'en' ? '▶ See how the Brand Check works (2.5x speed)' : '▶ Bekijk hoe de Brand Check werkt (2,5x versneld)'}
            </p>
            <div className={`rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 aspect-video relative ${videoTheater ? 'invisible' : ''}`}>
              {!videoPlaying ? (
                <button
                  onClick={() => setVideoPlaying(true)}
                  className="absolute inset-0 w-full h-full cursor-pointer group"
                >
                  <Image
                    src="/Teun.ai-AI-brand-check-poster.webp"
                    alt={locale === 'en' ? 'AI Brand Check demo' : 'AI Brand Check demo'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/90 group-hover:bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
                      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#292956] ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              ) : !videoTheater && (
                <div className="relative w-full h-full">
                  <video autoPlay controls controlsList="nofullscreen" playsInline className="w-full h-full" onPlay={(e) => { e.target.playbackRate = 2.5 }}>
                    <source src="/Teun.ai-AI-brand-check.mp4" type="video/mp4" />
                  </video>
                  <button onClick={() => setVideoTheater(true)} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer flex items-center gap-1.5" title="Theater modus">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Theater mode overlay */}
            {videoTheater && (
              <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-8">
                <button onClick={() => setVideoTheater(false)} className="absolute top-4 right-4 text-white/70 hover:text-white z-50 cursor-pointer">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="rounded-xl overflow-hidden aspect-video w-full max-w-6xl">
                  <video autoPlay controls controlsList="nofullscreen" playsInline className="w-full h-full" onPlay={(e) => { e.target.playbackRate = 2.5 }}>
                    <source src="/Teun.ai-AI-brand-check.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            )}
          </div>
        )}

        {limitReached && !isAdmin && !isPro && authChecked ? (
          <div className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8 text-center">
            <p className="text-xl font-bold text-slate-900 mb-2">{user ? t('dailyLimitTitle') : t('freeLimitTitle', { count: MAX_FREE_SCANS })}</p>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">{user ? t('dailyLimitDesc', { count: MAX_FREE_SCANS }) : t('freeLimitDesc', { count: MAX_FREE_SCANS })}</p>
            {user ? (
              <Link href={locale === 'en' ? '/en/pricing' : '/pricing'} className="bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold px-8 py-3 rounded-lg hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer">
                {locale === 'en' ? 'Upgrade to Pro for unlimited scans' : 'Upgrade naar Pro voor onbeperkt scannen'} <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link href="/signup" className="bg-[#292956] text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#1e1e45] transition-all inline-flex items-center gap-2 cursor-pointer">
                {t('createFreeAccount')} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={handleScan} className="space-y-4">
              <div className={`bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 p-6 sm:p-8 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                <div className="mb-5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {locale === 'en' ? 'Company name' : 'Bedrijfsnaam'} <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder={locale === 'en' ? 'e.g. OnlineLabs' : 'bijv. OnlineLabs'} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400" required minLength={2} disabled={loading} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {locale === 'en' ? 'City' : 'Vestigingsplaats'} <span className="text-red-400">*</span>
                    </label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder={locale === 'en' ? 'e.g. Amsterdam' : 'bijv. Amsterdam'} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400" required minLength={2} disabled={loading} />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      {locale === 'en' ? 'Industry' : 'Branche'} <span className="text-red-400">*</span>
                      <span className="relative ml-auto" onClick={() => setBrancheTooltip(!brancheTooltip)}>
                        <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {brancheTooltip && (
                          <span className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50">
                            {locale === 'en' ? 'As listed on your Google Business Profile' : 'Zoals vermeld bij Google Bedrijfsprofiel'}
                          </span>
                        )}
                      </span>
                    </label>
                    <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder={locale === 'en' ? 'e.g. Digital marketing agency' : 'bijv. Online marketing bureau'} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400" required minLength={2} disabled={loading} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading || !brandName.trim() || !category.trim() || !location.trim()} className="w-full bg-[#292956] text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-[#1e1e45] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-lg">
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
              <div className="flex flex-wrap gap-2">{results.aspects.map((a, i) => (<span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-sm px-3 py-1.5 rounded-lg">{ASPECT_ICONS[a] || <Search className="w-3.5 h-3.5" />} {ASPECT_LABELS[a] || a}</span>))}</div>
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

          {/* ── GOOGLE REVIEWS REALITY CHECK ── */}
          {(reviewsLoading || reviewsData) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
              <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{locale === 'en' ? 'Google Reviews Reality Check' : 'Google Reviews Reality Check'}</p>
                  <p className="text-xs text-slate-500">{locale === 'en' ? 'How do real reviews compare to AI perception?' : 'Hoe verhouden echte reviews zich tot AI-perceptie?'}</p>
                </div>
              </div>

              <div className="p-5">
                {reviewsLoading && (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <p className="text-sm text-slate-500">{locale === 'en' ? 'Fetching Google Reviews...' : 'Google Reviews ophalen...'}</p>
                  </div>
                )}

                {reviewsData && reviewsData.summary && (
                  <>
                    {/* Rating comparison */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} className={`w-5 h-5 ${s <= Math.round(reviewsData.summary.avgRating) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          ))}
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{reviewsData.summary.avgRating}</span>
                        <span className="text-sm text-slate-400">({reviewsData.summary.totalReviews} reviews)</span>
                      </div>

                      <div className="h-8 w-px bg-slate-200" />

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">{locale === 'en' ? 'AI says:' : 'AI zegt:'}</span>
                        <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                          results.overallSentiment === 'positive' ? 'bg-emerald-50 text-emerald-700' :
                          results.overallSentiment === 'negative' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-700'
                        }`}>{getSentimentLabel(results.overallSentiment)}</span>
                      </div>

                      {/* Match indicator */}
                      {(() => {
                        const rating = reviewsData.summary.avgRating
                        const aiSent = results.overallSentiment
                        const match = (rating >= 4 && aiSent === 'positive') || (rating < 3 && aiSent === 'negative') || (rating >= 3 && rating < 4 && aiSent === 'mixed')
                        return (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${match ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {match
                              ? (locale === 'en' ? '✓ Match' : '✓ Komt overeen')
                              : (locale === 'en' ? '⚠ Mismatch' : '⚠ Verschil')}
                          </span>
                        )
                      })()}
                    </div>

                    {/* Review themes */}
                    {reviewsData.themes?.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{locale === 'en' ? 'Themes from reviews' : "Thema's uit reviews"}</p>
                        <div className="space-y-2">
                          {reviewsData.themes.slice(0, 5).map((theme, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] flex-shrink-0 ${
                                theme.sentiment === 'positive' ? 'bg-emerald-500' :
                                theme.sentiment === 'negative' ? 'bg-red-500' : 'bg-amber-500'
                              }`}>
                                {theme.sentiment === 'positive' ? '✓' : theme.sentiment === 'negative' ? '!' : '~'}
                              </span>
                              <span className="text-sm text-slate-700 font-medium flex-1">{theme.label}</span>
                              <span className="text-xs text-slate-400">{theme.positive > 0 && <span className="text-emerald-600">{theme.positive}× {locale === 'en' ? 'pos' : 'pos'}</span>}{theme.positive > 0 && theme.negative > 0 && ' · '}{theme.negative > 0 && <span className="text-red-500">{theme.negative}× {locale === 'en' ? 'neg' : 'neg'}</span>}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI insight based on review data */}
                    {(() => {
                      const negThemes = reviewsData.themes?.filter(t => t.sentiment === 'negative') || []
                      const rating = reviewsData.summary.avgRating
                      const aiSent = results.overallSentiment

                      let insight = null
                      if (negThemes.length > 0) {
                        const themeNames = negThemes.map(t => t.label.toLowerCase()).join(', ')
                        insight = locale === 'en'
                          ? `AI picks up on "${themeNames}" as a weak point from your reviews. Address this in your content and collect more positive reviews on these topics.`
                          : `AI pikt "${themeNames}" op als zwak punt uit je reviews. Adresseer dit in je content en verzamel meer positieve reviews op deze onderwerpen.`
                      } else if (rating < 4 && aiSent === 'positive') {
                        insight = locale === 'en'
                          ? `Your Google rating (${rating}) is lower than AI suggests. Focus on collecting more 5-star reviews to align perception with reality.`
                          : `Je Google rating (${rating}) is lager dan AI suggereert. Focus op het verzamelen van meer 5-sterren reviews om perceptie en werkelijkheid op een lijn te brengen.`
                      } else if (rating >= 4.5 && aiSent !== 'positive') {
                        insight = locale === 'en'
                          ? `Your Google rating is excellent (${rating}) but AI doesn't fully reflect this. Publish more content that showcases your positive reviews and customer stories.`
                          : `Je Google rating is uitstekend (${rating}) maar AI reflecteert dit niet volledig. Publiceer meer content die je positieve reviews en klantverhalen uitlicht.`
                      } else if (rating >= 4) {
                        insight = locale === 'en'
                          ? `Good alignment: your ${rating} star rating matches the positive AI perception. Keep collecting reviews to maintain this position.`
                          : `Goede match: je ${rating} sterren rating komt overeen met de positieve AI-perceptie. Blijf reviews verzamelen om deze positie te behouden.`
                      }

                      if (!insight) return null
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                          <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-800">{insight}</p>
                        </div>
                      )
                    })()}

                    {/* Sample reviews */}
                    {reviewsData.reviews?.length > 0 && (
                      <details className="mt-4">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">{locale === 'en' ? `Show ${reviewsData.reviews.length} recent reviews` : `Toon ${reviewsData.reviews.length} recente reviews`}</summary>
                        <div className="mt-3 space-y-3">
                          {reviewsData.reviews.map((r, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex">{[1,2,3,4,5].map(s => <svg key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}</div>
                                {r.date && <span className="text-[10px] text-slate-400">{r.date}</span>}
                              </div>
                              {r.text && <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{r.text}</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                )}

                {reviewsData && !reviewsData.summary && (
                  <p className="text-sm text-slate-400 py-2">{locale === 'en' ? 'No Google Reviews found for this business.' : 'Geen Google Reviews gevonden voor dit bedrijf.'}</p>
                )}
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

          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            {(() => {
              const score = results.overallScore || 50;
              const hasNegSignals = (results.negSignals || []).length > 0;
              const isNegative = results.overallSentiment === 'negative' || results.overallSentiment === 'mixed';
              const notMentioned = !results.mentioned;

              const title = notMentioned
                ? (locale === 'en'
                    ? `AI doesn't know ${results.brandName || 'your business'} — your competitors may already be visible`
                    : `AI kent ${results.brandName || 'jouw bedrijf'} niet — je concurrenten mogelijk wel`)
                : isNegative
                  ? (locale === 'en'
                      ? `AI warns customers about ${results.brandName || 'your business'}: ${(results.negSignals || []).slice(0, 3).join(', ')}`
                      : `AI waarschuwt klanten over ${results.brandName || 'jouw bedrijf'}: ${(results.negSignals || []).slice(0, 3).join(', ')}`)
                  : score < 70
                    ? (locale === 'en'
                        ? `Score ${score}/100 — AI sees room for improvement for ${results.brandName || 'your business'}`
                        : `Score ${score}/100 — AI ziet verbeterpunten voor ${results.brandName || 'jouw bedrijf'}`)
                    : (locale === 'en'
                        ? `AI is positive about ${results.brandName || 'you'} — but does AI also recommend you?`
                        : `AI is positief over ${results.brandName || 'jou'} — maar beveelt AI jou ook aan?`);

              const description = notMentioned
                ? (locale === 'en'
                    ? 'AI doesn\'t mention your brand in any of the 6 checks. Create a free account and find out how visible you are across 10 prompts on 4 AI platforms.'
                    : 'AI noemt jouw merk in geen van de 6 checks. Maak een gratis account aan en check hoe zichtbaar je bent op 10 prompts op 4 AI-platforms.')
                : isNegative
                  ? (locale === 'en'
                      ? 'Customers see these signals when they ask AI about you. Create a free account, scan your full AI visibility and improve your position.'
                      : 'Klanten zien deze signalen als ze AI naar jou vragen. Maak een gratis account aan, scan je volledige AI-zichtbaarheid en verbeter je positie.')
                  : (locale === 'en'
                      ? 'You now know what AI says. But does AI recommend you when customers search? Create a free account and scan your position on ChatGPT, Perplexity and Google AI.'
                      : 'Je weet nu wat AI zegt. Maar beveelt AI jou ook aan als klanten zoeken? Maak een gratis account aan en scan je positie op ChatGPT, Perplexity en Google AI.');

              return (
                <>
                  <p className="text-lg font-bold text-slate-900 mb-2">{title}</p>
                  <p className="text-slate-600 text-sm max-w-md mx-auto mb-5">{description}</p>
                  {!user ? (
                    <Link href="/signup" className="inline-flex items-center gap-2 bg-[#292956] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1e1e45] transition-colors cursor-pointer">
                      {locale === 'en' ? 'Create free account' : 'Gratis account aanmaken'} <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link href="/dashboard" className="inline-flex items-center gap-2 bg-[#292956] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1e1e45] transition-colors cursor-pointer">
                      {locale === 'en' ? 'Go to dashboard' : 'Ga naar dashboard'} <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </>
              );
            })()}
          </div>

          <div className="mt-6 text-center">
            <button onClick={() => { setResults(null); setReviewsData(null); setScanPhase('idle'); setBrandName(''); setLocation(''); setCategory(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-sm text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 cursor-pointer">← {locale === 'en' ? 'Check another brand' : 'Ander merk checken'}</button>
          </div>

          {/* ━━━ Other Tools ━━━ */}
          <ToolsCrossSell currentTool="brand-check" locale={locale} />
        </section>
      )}

      {/* ── SEO CONTENT ── */}
      {!results && !loading && (
        <>
          {/* What does AI say */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 leading-tight">{locale === 'en' ? <>What does AI say<br /><span className="text-[#7C3AED]">when someone asks about your business?</span></> : <>Wat zegt AI<br /><span className="text-[#7C3AED]">als iemand naar jouw bedrijf vraagt?</span></>}</h2>
            <p className="text-slate-600 leading-relaxed mb-4">{locale === 'en' ? 'Millions of people ask ChatGPT and Perplexity for business recommendations every day. What does ChatGPT say about my business? An AI Brand Check reveals exactly that: the brand mentions AI generates, the sentiment, and whether you appear at all. This free AI reputation check shows your brand perception across platforms.' : 'Miljoenen mensen vragen ChatGPT en Perplexity dagelijks om bedrijfsaanbevelingen. Wat zegt ChatGPT over mijn bedrijf? Een AI Brand Check onthult precies dat: de AI merkperceptie, het sentiment, en of je uberhaupt wordt genoemd. Deze gratis AI reputatie check toont hoe AI over jouw merk praat.'}</p>
            <p className="text-slate-600 leading-relaxed">{locale === 'en' ? 'This free tool runs 3 commercial queries on both Perplexity and ChatGPT about your brand: experiences, reviews, and service quality. 6 AI reputation checks in total. You see exactly how AI perceives your business and get concrete tips to improve your AI brand perception.' : 'Deze gratis tool voert 3 commerciele zoekvragen uit op zowel Perplexity als ChatGPT over jouw merk: ervaringen, reviews, en servicekwaliteit. 6 AI reputatie checks in totaal. Je ziet precies hoe AI over jouw merk praat en krijgt concrete tips om je AI merkperceptie te verbeteren.'}</p>
          </section>

          {/* What do we check - with outlined icons like GEO Audit */}
          <section className="bg-slate-50 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-4">{locale === 'en' ? 'What do we check?' : 'Wat checken we?'}</h2>
              <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">{locale === 'en' ? '3 targeted queries on 2 AI platforms reveal how AI perceives your brand.' : '3 gerichte zoekvragen op 2 AI-platformen onthullen hoe AI jouw merk ziet.'}</p>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { icon: <Shield className="w-5 h-5" />, title: locale === 'en' ? 'Experiences' : 'Ervaringen', desc: locale === 'en' ? 'Is your business considered reliable? What experiences does AI highlight?' : 'Wordt jouw bedrijf als betrouwbaar gezien? Welke ervaringen licht AI uit?' },
                  { icon: <Star className="w-5 h-5" />, title: locale === 'en' ? 'Reviews' : 'Reviews', desc: locale === 'en' ? 'What does AI know about your reviews and complaints? Are there negative signals?' : 'Wat weet AI over je reviews en klachten? Zijn er negatieve signalen?' },
                  { icon: <MessageSquare className="w-5 h-5" />, title: locale === 'en' ? 'Service' : 'Service', desc: locale === 'en' ? 'How does AI rate your accessibility, quality and service level?' : 'Hoe beoordeelt AI je bereikbaarheid, kwaliteit en serviceniveau?' }
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">{item.icon}</div>
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

          {/* AI has an opinion */}
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
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5"><Sparkles className="w-3 h-3 text-purple-300" /></div>
                  <div className="bg-white/10 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-white/90">{locale === 'en' ? '"Based on available information..."' : '"Op basis van beschikbare informatie..."'}<br /><span className="text-purple-300 font-medium">{locale === 'en' ? 'Is the response positive, negative, or does AI not even know your brand?' : 'Is het antwoord positief, negatief, of kent AI je merk niet eens?'}</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section — Homepage style with Teun */}
          <section className="py-20 bg-slate-50 relative overflow-visible">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">{locale === 'en' ? 'Frequently asked questions' : 'Veelgestelde vragen'}</h2>
                  <div className="space-y-4">
                    {faqItems.map((item, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                          className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-slate-400 font-mono text-sm">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {item.q}
                            </span>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${openFaq === i ? 'rotate-45' : ''}`} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        {openFaq === i && (
                          <div className="px-6 pb-6 pt-0">
                            <p className="text-slate-600 pl-10">{item.a}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:flex justify-center items-end relative">
                  <div className="translate-y-20">
                    <Image
                      src="/teun-ai-mascotte.png"
                      alt={locale === 'en' ? 'Teun helps you' : 'Teun helpt je'}
                      width={420}
                      height={530}
                      className="drop-shadow-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
        </>
      )}
    </div>
  )
}
