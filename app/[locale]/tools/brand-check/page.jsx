// app/[locale]/tools/brand-check/page.jsx
// Redesign: cream/Lora/spark — sitewide consistency
// Functionaliteit identiek aan origineel — alleen visuele laag vervangen
'use client'

import { useState, useRef, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useTranslations, useLocale } from 'next-intl'

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
    if (sentiment === 'negative') {
      recs.push({ priority: 'high', text: 'Adresseer negatieve signalen actief. Reageer op kritische reviews en publiceer content die positieve klantervaringen uitlicht.' })
    } else if (sentiment === 'mixed') {
      recs.push({ priority: 'medium', text: 'Versterk positieve signalen door meer reviews en testimonials te verzamelen die specifieke onderwerpen behandelen.' })
    }
    if (aspects.includes('reviews')) {
      recs.push({ priority: 'medium', text: 'Verzamel actief Google Reviews en Trustpilot reviews. AI weegt reviews zwaar mee in haar oordeel.' })
    }
    if (aspects.includes('bereikbaarheid')) {
      recs.push({ priority: 'medium', text: 'Zorg dat je openingstijden, contactgegevens en bereikbaarheid consistent en actueel zijn op alle online kanalen.' })
    }
    if (recs.length === 0) {
      recs.push({ priority: 'low', text: 'Je AI-merkperceptie is goed. Blijf consistent content publiceren en reviews verzamelen om dit niveau te behouden.' })
    }
  } else {
    if (!mentioned) {
      recs.push({ priority: 'high', text: `${brand} is not mentioned by AI. Ensure more online mentions, reviews and content that links your brand to your expertise.` })
      recs.push({ priority: 'high', text: 'Publish case studies, FAQ pages and blog content that specifically name your brand and services.' })
    } else if (mentionedPx && !mentionedCg) {
      recs.push({ priority: 'medium', text: `${brand} is mentioned by Perplexity but not by ChatGPT. Focus on broader online visibility: more backlinks, guest posts and trade publications.` })
    } else if (!mentionedPx && mentionedCg) {
      recs.push({ priority: 'medium', text: `${brand} is mentioned by ChatGPT but not by Perplexity. Perplexity weighs recent sources more heavily. Publish fresh content and press releases.` })
    }
    if (sentiment === 'negative') {
      recs.push({ priority: 'high', text: 'Actively address negative signals. Respond to critical reviews and publish content highlighting positive customer experiences.' })
    } else if (sentiment === 'mixed') {
      recs.push({ priority: 'medium', text: 'Strengthen positive signals by collecting more reviews and testimonials covering specific topics.' })
    }
    if (aspects.includes('reviews')) {
      recs.push({ priority: 'medium', text: 'Actively collect Google Reviews and Trustpilot reviews. AI weighs reviews heavily in its judgment.' })
    }
    if (aspects.includes('bereikbaarheid')) {
      recs.push({ priority: 'medium', text: 'Ensure your opening hours, contact details and accessibility are consistent and up-to-date across all online channels.' })
    }
    if (recs.length === 0) {
      recs.push({ priority: 'low', text: 'Your AI brand perception is good. Continue publishing consistent content and collecting reviews to maintain this level.' })
    }
  }
  return recs.slice(0, 4)
}

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
  const [faqCategory, setFaqCategory] = useState('all')
  const resultsRef = useRef(null)

  const MAX_ANON_SCANS = 1    // 1 scan totaal (lifetime) voor anoniem
  const MAX_FREE_SCANS = 1    // 1 scan per week voor gratis accounts
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
    { cat: 'product',   q: 'What is an AI Brand Check?', a: 'An AI Brand Check analyzes what AI platforms like ChatGPT and Perplexity say about your business. We check sentiment, reputation signals and whether your brand is actually mentioned in AI-generated answers.' },
    { cat: 'pricing',   q: 'Is the AI Brand Check free?', a: 'Yes, you can try 1 brand check for free without an account. With a free account you get 1 check per week. Upgrade to Lite or Pro for unlimited brand checks.' },
    { cat: 'product',   q: 'Which AI platforms are checked?', a: 'We test your brand on both Perplexity and ChatGPT with 3 different commercial queries about experiences, reviews and service quality. That is 6 AI checks in total. We also pull your Google Reviews to compare AI perception with reality.' },
    { cat: 'technical', q: 'What if my brand is not mentioned by AI?', a: 'That means AI platforms don\'t yet associate your brand with your industry. The tool gives you concrete recommendations to improve this, such as publishing more reviews, case studies and expertise content.' },
    { cat: 'technical', q: 'How can I improve my AI brand perception?', a: 'Focus on Google Reviews, publish case studies and customer stories, ensure consistent NAP data, and create content that explicitly mentions your brand name with your expertise and location.' },
  ] : [
    { cat: 'product',   q: 'Wat is een AI Brand Check?', a: 'Een AI Brand Check analyseert wat AI-platformen zoals ChatGPT en Perplexity over jouw bedrijf zeggen. We checken sentiment, reputatiesignalen en of jouw merk daadwerkelijk wordt genoemd in AI-antwoorden.' },
    { cat: 'pricing',   q: 'Is de AI Brand Check gratis?', a: 'Ja, je kunt 1 brand check gratis uitvoeren zonder account. Met een gratis account krijg je 1 check per week. Upgrade naar Lite of Pro voor onbeperkte brand checks.' },
    { cat: 'product',   q: 'Welke AI-platformen worden gecheckt?', a: 'We testen je merk op zowel Perplexity als ChatGPT met 3 verschillende commerciele zoekvragen over ervaringen, reviews en servicekwaliteit. Dat zijn 6 AI-checks in totaal. We halen ook je Google Reviews op om AI-perceptie met de werkelijkheid te vergelijken.' },
    { cat: 'technical', q: 'Wat als mijn merk niet wordt genoemd door AI?', a: 'Dan associeren AI-platformen je merk nog niet met je branche. De tool geeft je concrete aanbevelingen om dit te verbeteren, zoals meer reviews, case studies en expertcontent publiceren.' },
    { cat: 'technical', q: 'Hoe verbeter ik mijn AI-merkperceptie?', a: 'Focus op Google Reviews, publiceer case studies en klantverhalen, zorg voor consistente bedrijfsgegevens, en maak content die expliciet je merknaam koppelt aan je expertise en locatie.' },
  ]

  const queryLabels = locale === 'en' ? [
    { title: 'Experiences & Reliability', scanning: 'Querying Perplexity + ChatGPT...' },
    { title: 'Reviews & Complaints', scanning: 'Querying Perplexity + ChatGPT...' },
    { title: 'Service & Accessibility', scanning: 'Querying Perplexity + ChatGPT...' },
  ] : [
    { title: 'Ervaringen & Betrouwbaarheid', scanning: 'Perplexity + ChatGPT bevragen...' },
    { title: 'Reviews & Klachten', scanning: 'Perplexity + ChatGPT bevragen...' },
    { title: 'Service & Bereikbaarheid', scanning: 'Perplexity + ChatGPT bevragen...' },
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
          const now = new Date()
          const weekKey = `brand_check_${now.getFullYear()}_W${Math.ceil(((now - new Date(now.getFullYear(),0,1)) / 86400000 + new Date(now.getFullYear(),0,1).getDay() + 1) / 7)}`
          const stored = localStorage.getItem(weekKey)
          if (stored) { setScanCount(parseInt(stored)); setLimitReached(parseInt(stored) >= MAX_FREE_SCANS) }
        } else {
          const stored = localStorage.getItem('brand_check_count')
          if (stored) { setScanCount(parseInt(stored)); setLimitReached(parseInt(stored) >= MAX_ANON_SCANS) }
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
      for (let i = 0; i < QUERY_TYPES.length; i++) {
        setQueryStates(prev => prev.map((q, idx) => idx === i ? { status: 'scanning' } : q))

        const response = await fetch('/api/brand-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...baseBody, queryType: QUERY_TYPES[i] })
        })

        const data = await response.json()

        if (!response.ok) {
          setQueryStates(prev => prev.map((q, idx) => idx === i ? { status: 'error' } : q))
          queryResults.push({ queryType: QUERY_TYPES[i], prompt: '', perplexity: { response: '', mentioned: false, sentiment: 'neutral', score: 50, posSignals: [], negSignals: [], aspects: [] }, chatgpt: { response: '', mentioned: false, sentiment: 'neutral', score: 50, posSignals: [], negSignals: [], aspects: [] } })
        } else {
          queryResults.push(data)
          setQueryStates(prev => prev.map((q, idx) => idx === i ? { status: 'done' } : q))
        }
      }

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

      if (!isAdmin) {
        const newCount = scanCount + 1
        setScanCount(newCount)
        try {
          if (user) {
            const now = new Date()
            const weekKey = `brand_check_${now.getFullYear()}_W${Math.ceil(((now - new Date(now.getFullYear(),0,1)) / 86400000 + new Date(now.getFullYear(),0,1).getDay() + 1) / 7)}`
            localStorage.setItem(weekKey, newCount.toString())
          } else {
            localStorage.setItem('brand_check_count', newCount.toString())
          }
        } catch (e) {}
        const limit = user ? MAX_FREE_SCANS : MAX_ANON_SCANS
        if (newCount >= limit) setLimitReached(true)
      }

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

      fetchGoogleReviews(brandName.trim(), location.trim())

    } catch (err) {
      setError(locale === 'en' ? 'Connection error. Please try again.' : 'Verbindingsfout. Probeer het opnieuw.')
      setScanPhase('idle')
      setLoading(false)
    }
  }

  const getSentimentColor = (s) => s === 'positive' ? 'var(--success)' : s === 'negative' ? 'var(--danger)' : s === 'mixed' ? '#f59e0b' : 'var(--ink-3)'

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

  const ASPECT_LABELS = { bereikbaarheid: locale === 'en' ? 'Accessibility' : 'Bereikbaarheid', reviews: 'Reviews', klachten: locale === 'en' ? 'Complaints' : 'Klachten', service: 'Service', openingstijden: locale === 'en' ? 'Opening hours' : 'Openingstijden', betrouwbaarheid: locale === 'en' ? 'Reliability' : 'Betrouwbaarheid', prijs: locale === 'en' ? 'Price' : 'Prijs', snelheid: locale === 'en' ? 'Speed' : 'Snelheid' }

  // Progress based on actual query states
  const completedCount = queryStates.filter(q => q.status === 'done' || q.status === 'error').length
  const scanProgress = Math.round((completedCount / 3) * 100)

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="bc-page" suppressHydrationWarning>
      <div className="bc-wrap">

        {/* Hero */}
        <header className="bc-hero">
          <div className="tool-eyebrow">AI Brand Check</div>
          <h1>
            {locale === 'nl' ? (
              <>Wat zegt <em>AI</em> over jouw bedrijf?</>
            ) : (
              <>What does <em>AI</em> say about your business?</>
            )}
          </h1>
          <p className="bc-hero-sub" dangerouslySetInnerHTML={{ __html: t.raw('heroSubtitle') }} />
          <div className="bc-trust-pills">
            <span className="tool-trust-pill"><span className="pulse-dot"></span>Perplexity</span>
            <span className="tool-trust-pill"><span className="pulse-dot"></span>ChatGPT</span>
            <span className="tool-trust-pill"><span className="pulse-dot"></span>Google Reviews</span>
          </div>
        </header>

        {/* Demo Video */}
        {!loading && !results && (
          <div className="tool-video-wrap">
            <p className="tool-video-label">
              {locale === 'en' ? '▶ See how the Brand Check works (2.5x speed)' : '▶ Bekijk hoe de Brand Check werkt (2,5x versneld)'}
            </p>
            <div className={`tool-video-frame ${videoTheater ? 'invisible' : ''}`}>
              {!videoPlaying ? (
                <button onClick={() => setVideoPlaying(true)} className="tool-video-poster">
                  <Image
                    src="/Teun.ai-AI-brand-check-poster.webp"
                    alt={locale === 'en' ? 'AI Brand Check demo' : 'AI Brand Check demo'}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                  <div className="overlay" />
                  <div className="tool-video-play">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </button>
              ) : !videoTheater && (
                <>
                  <video autoPlay controls controlsList="nofullscreen" playsInline style={{ width: '100%', height: '100%' }} onPlay={(e) => { e.target.playbackRate = 2.5 }}>
                    <source src="/Teun.ai-AI-brand-check.mp4" type="video/mp4" />
                  </video>
                  <button onClick={() => setVideoTheater(true)} className="tool-video-theater-btn" title="Theater modus">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            {videoTheater && (
              <div className="tool-theater">
                <button onClick={() => setVideoTheater(false)} className="tool-theater-close">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="tool-theater-video">
                  <video autoPlay controls controlsList="nofullscreen" playsInline style={{ width: '100%', height: '100%' }} onPlay={(e) => { e.target.playbackRate = 2.5 }}>
                    <source src="/Teun.ai-AI-brand-check.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Limit reached */}
        {limitReached && !isAdmin && !isPro && authChecked ? (
          <section className="tool-section bc-limit">
            <p className="bc-limit-title">
              {user
                ? (locale === 'en' ? 'Weekly limit reached' : 'Wekelijks limiet bereikt')
                : (locale === 'en' ? 'Free check used' : 'Gratis check gebruikt')}
            </p>
            <p className="bc-limit-desc">
              {user
                ? (locale === 'en' ? 'You can check again next week, or upgrade to Lite for unlimited brand checks.' : 'Je kunt volgende week weer checken, of upgrade naar Lite voor onbeperkte brand checks.')
                : (locale === 'en' ? 'Create a free account for 1 brand check per week.' : 'Maak een gratis account aan voor 1 brand check per week.')}
            </p>
            {user ? (
              <Link href={locale === 'en' ? '/en/pricing' : '/pricing'} className="tool-btn-spark">
                {locale === 'en' ? 'Upgrade to Lite for unlimited' : 'Upgrade naar Lite voor onbeperkt'}
              </Link>
            ) : (
              <Link href={locale === 'en' ? '/en/signup' : '/signup'} className="tool-btn-spark">
                {locale === 'en' ? 'Create free account' : 'Gratis account aanmaken'}
              </Link>
            )}
          </section>
        ) : (
          // FORM
          !results && (
            <form id="bc-form" onSubmit={handleScan} className="tool-section bc-form">
              <div className="bc-form-grid">
                <div className="bc-field bc-field-full">
                  <label htmlFor="bc-brand" className="tool-label">
                    {locale === 'en' ? 'Company name' : 'Bedrijfsnaam'} <span className="req">*</span>
                  </label>
                  <input
                    id="bc-brand"
                    type="text"
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder={locale === 'en' ? 'e.g. OnlineLabs' : 'bijv. OnlineLabs'}
                    className="tool-input"
                    required
                    minLength={2}
                    disabled={loading}
                  />
                </div>

                <div className="bc-field">
                  <label htmlFor="bc-loc" className="tool-label">
                    {locale === 'en' ? 'City' : 'Vestigingsplaats'} <span className="req">*</span>
                  </label>
                  <input
                    id="bc-loc"
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder={locale === 'en' ? 'e.g. Amsterdam' : 'bijv. Amsterdam'}
                    className="tool-input"
                    required
                    minLength={2}
                    disabled={loading}
                  />
                </div>

                <div className="bc-field">
                  <label htmlFor="bc-cat" className="tool-label">
                    {locale === 'en' ? 'Industry' : 'Branche'} <span className="req">*</span>
                    <span className="tool-tooltip-wrap">
                      <svg className="tool-tooltip-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                        onClick={(e) => { e.preventDefault(); setBrancheTooltip(!brancheTooltip) }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      {brancheTooltip && (
                        <span className="tool-tooltip">
                          {locale === 'en' ? 'As listed on your Google Business Profile' : 'Zoals vermeld bij Google Bedrijfsprofiel'}
                        </span>
                      )}
                    </span>
                  </label>
                  <input
                    id="bc-cat"
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder={locale === 'en' ? 'e.g. Digital marketing agency' : 'bijv. Online marketing bureau'}
                    className="tool-input"
                    required
                    minLength={2}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="teun-scan-btn bc-submit"
              >
                {loading
                  ? (locale === 'en' ? 'Checking...' : 'Checken...')
                  : (locale === 'en' ? 'Start brand check' : 'Start brand check')}
              </button>
              <p className="bc-form-hint">
                {locale === 'en' ? '6 AI checks across Perplexity and ChatGPT. Takes about 30 seconds.' : '6 AI-checks op Perplexity en ChatGPT. Duurt circa 30 seconden.'}
              </p>
            </form>
          )
        )}

        {/* Error */}
        {error && (
          <div className="tool-error">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div><strong>{error}</strong></div>
          </div>
        )}

        {/* SCANNING — sequential progress per query */}
        {loading && scanPhase === 'scanning' && (
          <section className="tool-section bc-scan">
            <div className="bc-scan-header">
              <div>
                <p className="bc-scan-title">
                  {locale === 'en' ? `Analyzing ${brandName} on 2 platforms` : `${brandName} analyseren op 2 platformen`}
                </p>
                <p className="bc-scan-platforms">
                  <span><span className="pulse-dot"></span>Perplexity</span>
                  <span><span className="pulse-dot"></span>ChatGPT</span>
                </p>
              </div>
              <span className="bc-scan-pct">{scanProgress}%</span>
            </div>

            <div className="tool-progress-bar" style={{ marginBottom: 24 }}>
              <div className="tool-progress-fill" style={{ width: `${scanProgress}%` }}></div>
            </div>

            <div className="bc-scan-list">
              {queryLabels.map((q, i) => {
                const state = queryStates[i]
                return (
                  <div key={i} className={`bc-scan-step ${state.status}`}>
                    <div className="bc-scan-step-icon">
                      {state.status === 'done' ? '✓' : state.status === 'scanning' ? <span className="bc-scan-spinner"></span> : state.status === 'error' ? '!' : i + 1}
                    </div>
                    <div className="bc-scan-step-content">
                      <p className="bc-scan-step-title">{q.title}</p>
                      <p className="bc-scan-step-status">
                        {state.status === 'done'
                          ? (locale === 'en' ? 'Both platforms complete' : 'Beide platformen afgerond')
                          : state.status === 'scanning'
                            ? q.scanning
                            : state.status === 'error'
                              ? (locale === 'en' ? 'Error — skipped' : 'Fout — overgeslagen')
                              : (locale === 'en' ? 'Waiting...' : 'Wachten...')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* RESULTS */}
        {results && (
          <section ref={resultsRef} className="bc-results">
            {/* Platform mention summary */}
            <div className="bc-platforms">
              {[
                { name: 'Perplexity', data: results.platforms?.perplexity },
                { name: 'ChatGPT', data: results.platforms?.chatgpt }
              ].map((p, i) => (
                <div key={i} className={`bc-platform-card ${p.data?.mentioned ? 'mentioned' : 'not-mentioned'}`}>
                  <div className="bc-platform-icon">
                    {p.data?.mentioned ? '✓' : '✗'}
                  </div>
                  <div>
                    <p className="bc-platform-name">{p.name}</p>
                    <p className="bc-platform-status">
                      {p.data?.mentioned
                        ? (locale === 'en' ? `Mentioned in ${p.data.mentionCount}/3 queries` : `Genoemd in ${p.data.mentionCount}/3 zoekvragen`)
                        : (locale === 'en' ? 'Not mentioned' : 'Niet genoemd')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Score circle + signals */}
            <section className="tool-section bc-score-section">
              <div className="bc-score-grid">
                <div className="bc-score-circle">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={getSentimentColor(results.overallSentiment)} strokeWidth="10" strokeDasharray={`${(results.overallScore / 100) * 327} 327`} strokeLinecap="round" transform="rotate(-90 60 60)" />
                  </svg>
                  <div className="bc-score-value">
                    <span className="num" style={{ color: getSentimentColor(results.overallSentiment) }}>{results.overallScore}</span>
                    <span className="suffix">/ 100</span>
                  </div>
                </div>

                <div className="bc-score-info">
                  <p className="bc-score-label" style={{ color: getSentimentColor(results.overallSentiment) }}>
                    {getSentimentLabel(results.overallSentiment)}
                  </p>
                  <p className="bc-score-meta">
                    {results.brandName}{results.location ? ` · ${results.location}` : ''} · 6 checks
                  </p>
                  <div className="bc-score-signals">
                    {results.posSignals?.slice(0, 4).map((s, i) => (
                      <span key={`p${i}`} className="bc-signal pos">+ {s}</span>
                    ))}
                    {results.negSignals?.slice(0, 3).map((s, i) => (
                      <span key={`n${i}`} className="bc-signal neg">− {s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Topics AI talks about */}
            {results.aspects?.length > 0 && (
              <section className="tool-section bc-aspects">
                <h2 className="bc-section-h2">
                  {locale === 'en' ? <>Topics <em>AI</em> talks about</> : <>Onderwerpen waarover <em>AI</em> spreekt</>}
                </h2>
                <div className="bc-aspect-tags">
                  {results.aspects.map((a, i) => (
                    <span key={i} className="bc-aspect-tag">{ASPECT_LABELS[a] || a}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <section className="tool-section bc-recs">
                <h2 className="bc-section-h2">
                  {locale === 'en' ? <><em>Aanbevelingen</em></> : null}
                  {locale === 'nl' ? <><em>Aanbevelingen</em></> : <><em>Recommendations</em></>}
                </h2>
                <div className="bc-recs-list">
                  {results.recommendations.map((rec, i) => (
                    <div key={i} className={`bc-rec ${rec.priority}`}>
                      <span className="bc-rec-num">{i + 1}</span>
                      <p>{rec.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Google Reviews Reality Check */}
            {(reviewsLoading || reviewsData) && (
              <section className="tool-section bc-reviews">
                <h2 className="bc-section-h2">
                  {locale === 'en' ? <>Google Reviews <em>Reality Check</em></> : <>Google Reviews <em>Reality Check</em></>}
                </h2>
                <p className="bc-reviews-sub">
                  {locale === 'en' ? 'How do real reviews compare to AI perception?' : 'Hoe verhouden echte reviews zich tot AI-perceptie?'}
                </p>

                {reviewsLoading && (
                  <div className="bc-reviews-loading">
                    <span className="tool-init-spinner"><span className="dot"></span><span className="dot"></span><span className="dot"></span></span>
                    <p>{locale === 'en' ? 'Fetching Google Reviews...' : 'Google Reviews ophalen...'}</p>
                  </div>
                )}

                {reviewsData && reviewsData.summary && (
                  <>
                    <div className="bc-reviews-rating">
                      <div className="bc-stars">
                        <div className="stars">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} className={s <= Math.round(reviewsData.summary.avgRating) ? 'filled' : ''} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="bc-rating-num">{reviewsData.summary.avgRating}</span>
                        <span className="bc-rating-count">({reviewsData.summary.totalReviews} reviews)</span>
                      </div>

                      <div className="bc-reviews-vs">
                        <span className="bc-vs-label">{locale === 'en' ? 'AI says:' : 'AI zegt:'}</span>
                        <span className={`bc-vs-pill ${results.overallSentiment}`}>
                          {getSentimentLabel(results.overallSentiment)}
                        </span>
                      </div>

                      {(() => {
                        const rating = reviewsData.summary.avgRating
                        const aiSent = results.overallSentiment
                        const match = (rating >= 4 && aiSent === 'positive') || (rating < 3 && aiSent === 'negative') || (rating >= 3 && rating < 4 && aiSent === 'mixed')
                        return (
                          <span className={`bc-match ${match ? 'ok' : 'mismatch'}`}>
                            {match ? (locale === 'en' ? '✓ Match' : '✓ Komt overeen') : (locale === 'en' ? '⚠ Mismatch' : '⚠ Verschil')}
                          </span>
                        )
                      })()}
                    </div>

                    {reviewsData.themes?.length > 0 && (
                      <div className="bc-themes">
                        <p className="bc-themes-label">{locale === 'en' ? 'Themes from reviews' : "Thema's uit reviews"}</p>
                        {reviewsData.themes.slice(0, 5).map((theme, i) => (
                          <div key={i} className={`bc-theme ${theme.sentiment}`}>
                            <span className="bc-theme-icon">
                              {theme.sentiment === 'positive' ? '✓' : theme.sentiment === 'negative' ? '!' : '~'}
                            </span>
                            <span className="bc-theme-label">{theme.label}</span>
                            <span className="bc-theme-stats">
                              {theme.positive > 0 && <span className="pos-count">{theme.positive}× pos</span>}
                              {theme.positive > 0 && theme.negative > 0 && ' · '}
                              {theme.negative > 0 && <span className="neg-count">{theme.negative}× neg</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Insight */}
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
                        <div className="bc-insight">
                          <p>{insight}</p>
                        </div>
                      )
                    })()}

                    {reviewsData.reviews?.length > 0 && (
                      <details className="bc-sample-reviews">
                        <summary>{locale === 'en' ? `Show ${reviewsData.reviews.length} recent reviews` : `Toon ${reviewsData.reviews.length} recente reviews`}</summary>
                        <div className="bc-review-items">
                          {reviewsData.reviews.map((r, i) => (
                            <div key={i} className="bc-review-item">
                              <div className="bc-review-stars">
                                {[1,2,3,4,5].map(s => (
                                  <svg key={s} className={s <= r.rating ? 'filled' : ''} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                                {r.date && <span className="bc-review-date">{r.date}</span>}
                              </div>
                              {r.text && <p className="bc-review-text">{r.text}</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                )}

                {reviewsData && !reviewsData.summary && (
                  <p className="bc-no-reviews">
                    {locale === 'en' ? 'No Google Reviews found for this business.' : 'Geen Google Reviews gevonden voor dit bedrijf.'}
                  </p>
                )}
              </section>
            )}

            {/* Per-query results */}
            <section className="tool-section bc-queries">
              <h2 className="bc-section-h2">
                {locale === 'en' ? <><em>AI</em>-antwoorden per zoekvraag</> : null}
                {locale === 'nl' ? <><em>AI</em>-antwoorden per zoekvraag</> : <><em>AI</em> responses per query</>}
              </h2>
              <div className="bc-query-list">
                {results.queries?.map((q, i) => {
                  const tab = activeTab[i] || 'perplexity'
                  const pxData = q.perplexity || {}
                  const cgData = q.chatgpt || {}
                  const anyMentioned = pxData.mentioned || cgData.mentioned
                  return (
                    <div key={i} className="bc-query">
                      <button onClick={() => setExpandedQuery(expandedQuery === i ? null : i)} className="bc-query-summary">
                        <span className={`bc-query-icon ${anyMentioned ? 'mentioned' : 'not'}`}>
                          {anyMentioned ? '✓' : '✗'}
                        </span>
                        <span className="bc-query-prompt">{q.prompt}</span>
                        <span className="bc-query-pills">
                          <span className={`bc-query-pill ${pxData.mentioned ? 'on' : 'off'}`}>PX</span>
                          <span className={`bc-query-pill ${cgData.mentioned ? 'on' : 'off'}`}>CG</span>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ transform: expandedQuery === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            <path d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      {expandedQuery === i && (
                        <div className="bc-query-detail">
                          <div className="bc-query-tabs">
                            <button
                              onClick={() => setActiveTab(prev => ({ ...prev, [i]: 'perplexity' }))}
                              className={`bc-query-tab ${tab === 'perplexity' ? 'active' : ''}`}
                            >
                              Perplexity {pxData.mentioned ? '✓' : '✗'}
                            </button>
                            <button
                              onClick={() => setActiveTab(prev => ({ ...prev, [i]: 'chatgpt' }))}
                              className={`bc-query-tab ${tab === 'chatgpt' ? 'active' : ''}`}
                            >
                              ChatGPT {cgData.mentioned ? '✓' : '✗'}
                            </button>
                          </div>
                          <div className="bc-query-response">
                            <div className="bc-query-response-head">
                              <span>{tab === 'perplexity' ? 'Perplexity' : 'ChatGPT'}</span>
                              <span className={`bc-sentiment-pill ${(tab === 'perplexity' ? pxData : cgData).sentiment}`}>
                                {getSentimentLabel((tab === 'perplexity' ? pxData : cgData).sentiment)}
                              </span>
                            </div>
                            <p className="bc-query-text">
                              {(tab === 'perplexity' ? pxData : cgData).response || (locale === 'en' ? 'No response received.' : 'Geen antwoord ontvangen.')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Account CTA — dynamische tekst op basis van score */}
            {(() => {
              const score = results.overallScore || 50
              const isNegative = results.overallSentiment === 'negative' || results.overallSentiment === 'mixed'
              const notMentioned = !results.mentioned

              const title = notMentioned
                ? (locale === 'en'
                    ? `AI doesn't know ${results.brandName || 'your business'} — your competitors may already be visible`
                    : `AI kent ${results.brandName || 'jouw bedrijf'} niet, je concurrenten mogelijk wel`)
                : isNegative
                  ? (locale === 'en'
                      ? `AI warns customers about ${results.brandName || 'your business'}`
                      : `AI waarschuwt klanten over ${results.brandName || 'jouw bedrijf'}`)
                  : score < 70
                    ? (locale === 'en'
                        ? `Score ${score}/100, AI sees room for improvement`
                        : `Score ${score}/100, AI ziet verbeterpunten`)
                    : (locale === 'en'
                        ? `AI is positive about ${results.brandName || 'you'}, maar beveelt AI jou ook aan?`
                        : `AI is positief over ${results.brandName || 'jou'}, maar beveelt AI jou ook aan?`)

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
                      : 'Je weet nu wat AI zegt. Maar beveelt AI jou ook aan als klanten zoeken? Maak een gratis account aan en scan je positie op ChatGPT, Perplexity en Google AI.')

              const bonus = locale === 'nl'
                ? 'Met een gratis account scan je ook Google AI Modus en AI Overviews.'
                : 'With a free account you can also scan Google AI Mode and AI Overviews.'

              return (
                <div className="tool-account-cta">
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <p className="bonus">+ {bonus}</p>
                  {!user ? (
                    <Link href="/signup" className="tool-account-cta-btn">
                      {locale === 'en' ? 'Create free account' : 'Gratis account aanmaken'}
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <Link href="/dashboard" className="tool-account-cta-btn">
                      {locale === 'en' ? 'Go to dashboard' : 'Ga naar dashboard'}
                      <span aria-hidden="true">→</span>
                    </Link>
                  )}
                  <p className="small">
                    {locale === 'nl' ? 'Geheel gratis · Geen creditcard nodig' : 'Completely free · No credit card needed'}
                  </p>
                </div>
              )
            })()}

            <div className="bc-restart">
              <button onClick={() => {
                setResults(null)
                setReviewsData(null)
                setScanPhase('idle')
                setBrandName('')
                setLocation('')
                setCategory('')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}>
                ← {locale === 'en' ? 'Check another brand' : 'Ander merk checken'}
              </button>
            </div>
          </section>
        )}
      </div>

      {/* SEO content + FAQ — alleen als geen scan loopt */}
      {!results && !loading && (
        <>
          {/* SEO Intro */}
          <section className="tool-seo-intro">
            <h2>
              {locale === 'en'
                ? <>Your brand according to <em>AI</em></>
                : <>Jouw merk volgens <em>AI</em></>}
            </h2>
            <p>
              {locale === 'en'
                ? 'Millions of people ask ChatGPT and Perplexity for business recommendations every day. What does ChatGPT say about my business? An AI Brand Check reveals exactly that: the brand mentions AI generates, the sentiment, and whether you appear at all. This free AI reputation check shows your brand perception across platforms.'
                : 'Miljoenen mensen vragen ChatGPT en Perplexity dagelijks om aanbevelingen. Wat zegt ChatGPT over mijn bedrijf? Een AI Brand Check onthult precies dat: de AI merkperceptie, het sentiment, en of je überhaupt wordt genoemd. Deze gratis AI reputatie check toont hoe AI over jouw merk praat.'}
            </p>
            <p>
              {locale === 'en'
                ? 'This free tool runs 3 commercial queries on both Perplexity and ChatGPT about your brand: experiences, reviews, and service quality. 6 AI reputation checks in total. You see exactly how AI perceives your business and get concrete tips to improve your AI brand perception.'
                : 'Deze gratis tool voert 3 commerciële zoekvragen uit op zowel Perplexity als ChatGPT over jouw merk: ervaringen, reviews, en servicekwaliteit. 6 AI reputatie checks in totaal. Je ziet precies hoe AI over jouw merk praat en krijgt concrete tips om je AI merkperceptie te verbeteren.'}
            </p>
          </section>

          {/* What we check — 3 cards */}
          <section className="tool-seo-how">
            <div className="tool-seo-how-wrap">
              <h2>{locale === 'en' ? <>What do <em>we</em> check?</> : <>Wat <em>checken</em> we?</>}</h2>
              <p className="tool-seo-how-sub">
                {locale === 'en'
                  ? '3 targeted queries on 2 AI platforms reveal how AI perceives your brand.'
                  : '3 gerichte zoekvragen op 2 AI-platformen onthullen hoe AI jouw merk ziet.'}
              </p>
              <div className="tool-seo-how-grid bc-seo-3-grid">
                {(locale === 'en' ? [
                  { title: 'Experiences', desc: 'Is your business considered reliable? What experiences does AI highlight?' },
                  { title: 'Reviews', desc: 'What does AI know about your reviews and complaints? Are there negative signals?' },
                  { title: 'Service', desc: 'How does AI rate your accessibility, quality and service level?' },
                ] : [
                  { title: 'Ervaringen', desc: 'Wordt jouw bedrijf als betrouwbaar gezien? Welke ervaringen licht AI uit?' },
                  { title: 'Reviews', desc: 'Wat weet AI over je reviews en klachten? Zijn er negatieve signalen?' },
                  { title: 'Service', desc: 'Hoe beoordeelt AI je bereikbaarheid, kwaliteit en serviceniveau?' },
                ]).map((item, i) => (
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

          {/* Final CTA — matcht homepage teun-final pattern */}
          <section className="teun-final" aria-labelledby="bc-cta-heading">
            <div className="wrap">
              <h2 id="bc-cta-heading">
                {locale === 'en' ? (
                  <>Be the <em>answer</em>.<br />Not a question mark.</>
                ) : (
                  <>Word het <em>antwoord</em>.<br />Niet een vraagteken.</>
                )}
              </h2>
              <p>
                {locale === 'en'
                  ? 'AI already has an opinion about your brand. The only question is whether it works for you, against you, or whether AI knows your brand at all. Find out in 30 seconds.'
                  : 'AI heeft nu al een mening over jouw merk. De enige vraag is of die voor je werkt, tegen je werkt, of dat AI je merk niet eens kent. Ontdek het in 30 seconden.'}
              </p>
              <div className="btns">
                <a href="#bc-form" className="btn-primary">
                  {locale === 'en' ? 'Start free brand check' : 'Gratis Brand Check starten'} <span aria-hidden="true">→</span>
                </a>
                <Link
                  href={locale === 'en' ? '/en/pricing' : '/pricing'}
                  className="btn-secondary"
                >
                  {locale === 'en' ? 'View Lite & Pro' : 'Bekijk Lite & Pro'}
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ — homepage teun-faq pattern */}
          {(() => {
            const catLabels = locale === 'en'
              ? { all: 'All', product: 'Product', pricing: 'Pricing', technical: 'Technical' }
              : { all: 'Alles', product: 'Product', pricing: 'Prijzen', technical: 'Technisch' }

            const faqCounts = {
              all: faqItems.length,
              product: faqItems.filter(i => i.cat === 'product').length,
              pricing: faqItems.filter(i => i.cat === 'pricing').length,
              technical: faqItems.filter(i => i.cat === 'technical').length
            }

            const filteredFaq = faqCategory === 'all'
              ? faqItems
              : faqItems.filter(i => i.cat === faqCategory)

            return (
              <section className="teun-faq" id="faq" aria-labelledby="bc-faq-heading">
                <div className="wrap">
                  <div className="teun-faq-head">
                    <div className="teun-faq-eyebrow">
                      {locale === 'en' ? 'QUESTIONS & ANSWERS' : 'VRAGEN & ANTWOORDEN'}
                    </div>
                    <h2 id="bc-faq-heading">
                      {locale === 'en' ? (
                        <>Everything you want to know <em>before you click.</em></>
                      ) : (
                        <>Alles wat je wilt weten <em>voor je klikt.</em></>
                      )}
                    </h2>
                    <p className="sub">
                      {locale === 'en'
                        ? 'No bot answers, no marketing speak. Real explanations, written by our team.'
                        : 'Geen bot-antwoorden, geen marketingpraat. De echte uitleg, geschreven door ons team.'}
                    </p>
                  </div>

                  <div className="teun-faq-cats" role="tablist">
                    {[
                      { id: 'all',       count: faqCounts.all },
                      { id: 'product',   count: faqCounts.product },
                      { id: 'pricing',   count: faqCounts.pricing },
                      { id: 'technical', count: faqCounts.technical }
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

                  {/* Help callout */}
                  <div className="teun-faq-help">
                    <div>
                      <h3>
                        {locale === 'en' ? (
                          <>Still got questions? <em>We&rsquo;re here.</em></>
                        ) : (
                          <>Nog vragen? <em>We helpen je.</em></>
                        )}
                      </h3>
                      <p>
                        {locale === 'en'
                          ? 'Reach us by email or book a 15-minute call. No sales pitch, just answers.'
                          : 'Stuur ons een mail of plan een gesprek van 15 minuten. Geen verkooppraat, gewoon antwoorden.'}
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
                        {locale === 'en' ? 'Book a call' : 'Plan een gesprek'}
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
