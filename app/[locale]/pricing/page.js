// app/[locale]/pricing/page.js
'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PricingPage() {
  const locale = useLocale()
  const isNL = locale === 'nl'
  const router = useRouter()
  const supabase = createClient()
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [faqCategory, setFaqCategory] = useState('all')
  const [loading, setLoading] = useState(false)
  const [loadingTier, setLoadingTier] = useState(null)

  const liteMonthly = 29.95
  const liteAnnual = 23.95
  const proMonthly = 49.95
  const proAnnual = 39.95
  const litePrice = annual ? liteAnnual : liteMonthly
  const proPrice = annual ? proAnnual : proMonthly

  async function handleCheckout(tier) {
    setLoading(true)
    setLoadingTier(tier)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          tier: tier,
          plan: annual ? 'annual' : 'monthly',
          locale: locale,
        }),
      })
      const data = await res.json()
      if (data.requiresAuth && data.signupUrl) {
        router.push(data.signupUrl)
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || (isNL ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.'))
      }
    } catch (err) {
      alert(isNL ? 'Verbindingsfout. Probeer het opnieuw.' : 'Connection error. Please try again.')
    } finally {
      setLoading(false)
      setLoadingTier(null)
    }
  }

  const features = [
    // KEY DIFFERENCES (highlighted at top)
    { name: isNL ? 'Keyword tracking' : 'Keyword tracking', free: isNL ? '2 keywords proberen' : 'Try 2 keywords', lite: isNL ? '20 keywords handmatig' : '20 keywords manual', pro: isNL ? '50 keywords automatisch wekelijks' : '50 keywords automatic weekly', freeStatus: 'limited', liteStatus: 'check', proStatus: 'check', differ: true },
    { name: isNL ? 'GEO Analyse (prompts)' : 'GEO Analysis (prompts)', free: null, lite: '10 prompts', pro: isNL ? 'Onbeperkt' : 'Unlimited', freeStatus: 'cross', liteStatus: 'check', proStatus: 'check', differ: true },
    { name: isNL ? 'Support' : 'Support', free: null, lite: isNL ? 'E-mail' : 'Email', pro: isNL ? 'Telefonisch + e-mail' : 'Phone + email', freeStatus: 'cross', liteStatus: 'check', proStatus: 'check', differ: true },

    // GEO Platform features
    { name: isNL ? 'GEO Optimalisatie DIY' : 'GEO Optimization DIY', free: null, lite: true, pro: true, freeStatus: 'cross', liteStatus: 'check', proStatus: 'check' },
    { name: isNL ? 'AI-advies per pagina' : 'AI advice per page', free: null, lite: true, pro: true, freeStatus: 'cross', liteStatus: 'check', proStatus: 'check' },
    { name: isNL ? 'Search Console integratie' : 'Search Console integration', free: null, lite: true, pro: true, freeStatus: 'cross', liteStatus: 'check', proStatus: 'check' },

    // All tools
    { name: 'AI Visibility Scan', free: isNL ? '2x per week' : '2x per week', lite: isNL ? '3x per week handmatig' : '3x per week manual', pro: isNL ? 'Automatisch wekelijks + handmatig' : 'Automatic weekly + manual', freeStatus: 'limited', liteStatus: 'check', proStatus: 'check' },
    { name: 'AI Rank Tracker', free: isNL ? '2 keywords proberen' : 'Try 2 keywords', lite: isNL ? '20 keywords handmatig' : '20 keywords manual', pro: isNL ? '50 keywords automatisch' : '50 keywords automatic', freeStatus: 'limited', liteStatus: 'check', proStatus: 'check' },
    { name: 'Brand Check', free: isNL ? '1x per week' : '1x per week', lite: isNL ? 'Inbegrepen' : 'Included', pro: isNL ? 'Inbegrepen' : 'Included', freeStatus: 'limited', liteStatus: 'check', proStatus: 'check' },
    { name: 'AI Prompt Explorer', free: isNL ? 'Beperkt' : 'Limited', lite: isNL ? 'Inbegrepen' : 'Included', pro: isNL ? 'Inbegrepen' : 'Included', freeStatus: 'limited', liteStatus: 'check', proStatus: 'check' },
    { name: 'GEO Audit', free: isNL ? '1x per week' : '1x per week', lite: isNL ? 'Inbegrepen' : 'Included', pro: isNL ? 'Inbegrepen' : 'Included', freeStatus: 'limited', liteStatus: 'check', proStatus: 'check' },
    { name: 'Chrome Extensie', free: isNL ? 'Inbegrepen' : 'Included', lite: isNL ? 'Inbegrepen' : 'Included', pro: isNL ? 'Inbegrepen' : 'Included', freeStatus: 'check', liteStatus: 'check', proStatus: 'check' },
    { name: 'WordPress Plugin', free: isNL ? 'Inbegrepen' : 'Included', lite: isNL ? 'Inbegrepen' : 'Included', pro: isNL ? 'Inbegrepen' : 'Included', freeStatus: 'check', liteStatus: 'check', proStatus: 'check' },
  ]

  const competitors = [
    { name: 'Teun.ai Lite', price: '€29,95', platforms: '4+', prompts: '10', websites: isNL ? 'Onbeperkt' : 'Unlimited', tools: isNL ? '6 gratis' : '6 free', audit: true, explorer: true, plugin: true, hl: true },
    { name: 'Teun.ai Pro', price: '€49,95', platforms: '4+', prompts: isNL ? 'Onbeperkt' : 'Unlimited', websites: isNL ? 'Onbeperkt' : 'Unlimited', tools: isNL ? '6 gratis' : '6 free', audit: true, explorer: true, plugin: true, hl: true },
    { name: 'Profound', price: isNL ? 'Vanaf $99' : 'From $99', platforms: '1-3*', prompts: '50-100', websites: '1', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Peec.ai', price: isNL ? 'Vanaf €85' : 'From €85', platforms: '3 van 7*', prompts: '50-150', websites: '1-2', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Otterly.ai', price: isNL ? 'Vanaf $29' : 'From $29', platforms: '6', prompts: '10-100*', websites: '1', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Briljant.nl', price: isNL ? 'Vanaf €49' : 'From €49', platforms: '3', prompts: '100+', websites: '1', tools: isNL ? 'Geen' : 'None', audit: true, explorer: false, plugin: false },
    { name: 'SEMrush', price: '€140+', platforms: '3-4*', prompts: '25-200', websites: '1-5', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Ahrefs', price: '€99+', platforms: isNL ? 'Geen' : 'None', prompts: 'N/A', websites: '1-5', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
  ]

  const faqs = isNL ? [
    { cat: 'product', q: 'Wat is het verschil tussen Lite en Pro?', a: 'Het kernverschil is automatisering. Lite is om zelf te volgen: 20 keywords met handmatig scannen, 3 AI Visibility scans per week, historie en grafiek, 10 GEO Analyse prompts, e-mail support. Pro is om uit handen te geven: 50 keywords met automatische wekelijkse scan, 7 handmatige scans per week, onbeperkte GEO Analyse prompts en telefonische support.' },
    { cat: 'billing', q: 'Kan ik op elk moment opzeggen?', a: 'Ja. Geen contracten, geen opzegtermijn. Je houdt toegang tot het einde van je betaalperiode.' },
    { cat: 'product', q: 'Welke AI platforms worden gescand?', a: 'ChatGPT Search, Perplexity, Google AI Mode en Google AI Overviews. Alle platforms zijn inbegrepen bij elk pakket, zonder extra kosten per platform.' },
    { cat: 'product', q: 'Wat is automatische keyword tracking?', a: 'Stel je keywords eenmalig in. Teun.ai checkt automatisch wekelijks je posities op alle AI-platformen en toont trends over tijd. Automatische tracking is uitsluitend een Pro-feature (50 keywords). Lite tracked 20 keywords, maar handmatig. Gratis gebruikers kunnen 2 keywords proberen.' },
    { cat: 'billing', q: 'Is er een gratis proefperiode?', a: 'Alle 6 tools zijn gratis te gebruiken met limieten. Zo ervaar je precies wat Teun.ai kan. Geen trial nodig, gewoon proberen.' },
    { cat: 'billing', q: 'Kan ik upgraden van Lite naar Pro?', a: 'Ja, je kunt op elk moment upgraden. Je betaalt direct het verschil en krijgt meteen toegang tot 50 keywords met automatische wekelijkse tracking en onbeperkte GEO Analyse prompts.' },
  ] : [
    { cat: 'product', q: 'What is the difference between Lite and Pro?', a: 'The core difference is automation. Lite is for self-tracking: 20 keywords with manual scanning, 3 AI Visibility scans per week, history and chart, 10 GEO Analysis prompts, email support. Pro hands it off: 50 keywords with automatic weekly scans, 7 manual scans per week, unlimited GEO Analysis prompts and phone support.' },
    { cat: 'billing', q: 'Can I cancel at any time?', a: 'Yes. No contracts, no notice period. You keep access until the end of your billing period.' },
    { cat: 'product', q: 'Which AI platforms are scanned?', a: 'ChatGPT Search, Perplexity, Google AI Mode and Google AI Overviews. All platforms included with every plan, no extra costs per platform.' },
    { cat: 'product', q: 'What is automatic keyword tracking?', a: 'Set your keywords once. Teun.ai checks your positions automatically every week on all AI platforms and shows trends over time. Automatic tracking is exclusively a Pro feature (50 keywords). Lite tracks 20 keywords, but manually. Free users can try 2 keywords.' },
    { cat: 'billing', q: 'Is there a free trial?', a: 'All 6 tools are free to use with limits. Experience exactly what Teun.ai can do. No trial needed, just try it.' },
    { cat: 'billing', q: 'Can I upgrade from Lite to Pro?', a: 'Yes, you can upgrade at any time. You pay the difference immediately and get instant access to 50 keywords with automatic weekly tracking and unlimited GEO Analysis prompts.' },
  ]

  const catLabels = isNL
    ? { all: 'Alles', product: 'Product', billing: 'Facturatie' }
    : { all: 'All', product: 'Product', billing: 'Billing' }

  const counts = useMemo(() => ({
    all: faqs.length,
    product: faqs.filter(i => i.cat === 'product').length,
    billing: faqs.filter(i => i.cat === 'billing').length,
  }), [faqs])

  const filteredFaqs = faqCategory === 'all' ? faqs : faqs.filter(i => i.cat === faqCategory)

  function StatusIcon({ status }) {
    if (status === 'check') return (
      <svg className="prc-icon prc-icon-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )
    if (status === 'cross') return (
      <svg className="prc-icon prc-icon-cross" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    )
    if (status === 'limited') return (
      <svg className="prc-icon prc-icon-limited" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="5" x2="19" y1="12" y2="12"/>
      </svg>
    )
    return null
  }

  return (
    <div className="tool-page prc-page">

      {/* HERO */}
      <section className="prc-hero">
        <div className="tool-eyebrow">{isNL ? 'PRIJZEN' : 'PRICING'}</div>
        <h1 className="prc-h1">
          {isNL ? (
            <>Met <em>Pro</em> heb je alles in handen om <em>AI-zichtbaar</em> te worden</>
          ) : (
            <>With <em>Pro</em> you have everything to become <em>AI-visible</em></>
          )}
        </h1>
        <p className="prc-hero-sub">
          {isNL
            ? 'GEO Optimalisatie DIY: uniek en direct toepasbaar.'
            : 'GEO Optimization DIY: unique and instantly applicable.'}
        </p>
        <p className="prc-hero-meta">
          {isNL ? 'Prijzen exclusief BTW' : 'Prices exclude VAT'}
        </p>

        {/* Toggle */}
        <div className="prc-toggle" role="tablist">
          <button
            onClick={() => setAnnual(false)}
            className={!annual ? 'active' : ''}
            role="tab"
            aria-selected={!annual}
          >
            {isNL ? 'Maandelijks' : 'Monthly'}
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={annual ? 'active' : ''}
            role="tab"
            aria-selected={annual}
          >
            {isNL ? 'Jaarlijks' : 'Annually'}
            <span className="prc-toggle-save">-20%</span>
          </button>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="prc-cards-section">
        <div className="prc-cards-wrap">
          <div className="prc-cards">

            {/* FREE */}
            <div className="prc-card">
              <p className="prc-card-tier">{isNL ? 'GRATIS' : 'FREE'}</p>
              <div className="prc-card-price">
                <span className="prc-card-price-num">€0</span>
                <span className="prc-card-price-unit">/{isNL ? 'maand' : 'month'}</span>
              </div>
              <p className="prc-card-desc">
                {isNL ? 'Alle 6 tools gratis uitproberen met limieten.' : 'Try all 6 tools for free with limits.'}
              </p>

              <Link href="/signup" className="prc-card-btn prc-card-btn-secondary">
                {isNL ? 'Gratis starten' : 'Start free'}
              </Link>

              <ul className="prc-card-features">
                {features.map((f, i) => (
                  <li key={i} className={`${f.freeStatus === 'cross' ? 'muted' : ''} ${f.differ ? 'differ' : ''}`.trim()}>
                    <StatusIcon status={f.freeStatus} />
                    <span className="prc-feature-name">{f.name}</span>
                    {f.free && f.freeStatus === 'limited' && (
                      <span className="prc-feature-value prc-feature-value-limited">{f.free}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* LITE */}
            <div className="prc-card">
              <p className="prc-card-tier prc-card-tier-spark">LITE</p>
              <div className="prc-card-price">
                <span className="prc-card-price-num">€{litePrice.toFixed(2).replace('.', ',')}</span>
                <span className="prc-card-price-unit">/{isNL ? 'mnd' : 'mo'} <span className="prc-card-price-vat">{isNL ? 'excl. BTW' : 'excl. VAT'}</span></span>
              </div>
              {annual && (
                <p className="prc-card-savings">
                  <span className="strike">€29,95/{isNL ? 'mnd' : 'mo'}</span>
                  <span className="save">{isNL ? 'Bespaar €72/jaar' : 'Save €72/year'}</span>
                </p>
              )}
              <p className="prc-card-desc">
                {isNL ? '20 keywords handmatig volgen, historie + grafiek, 10 GEO prompts, e-mail support.' : '20 keywords manual tracking, history + chart, 10 GEO prompts, email support.'}
              </p>

              <button
                onClick={() => handleCheckout('lite')}
                disabled={loading}
                className="prc-card-btn prc-card-btn-primary"
              >
                <ZapIcon /> {loadingTier === 'lite' ? (isNL ? 'Laden...' : 'Loading...') : (isNL ? 'Start met Lite' : 'Start with Lite')}
              </button>
              <p className="prc-card-btn-meta">
                {isNL ? 'Maandelijks opzegbaar, excl. BTW' : 'Cancel anytime, excl. VAT'}
              </p>

              <ul className="prc-card-features">
                {features.map((f, i) => (
                  <li key={i} className={`${f.liteStatus === 'cross' ? 'muted' : ''} ${f.differ ? 'differ' : ''}`.trim()}>
                    <StatusIcon status={f.liteStatus} />
                    <span className="prc-feature-name">{f.name}</span>
                    {typeof f.lite === 'string' && (
                      <span className="prc-feature-value prc-feature-value-success">{f.lite}</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="prc-card-support">
                <MailIcon />
                <span>{isNL ? 'Support via e-mail' : 'Email support'}</span>
              </div>
            </div>

            {/* PRO */}
            <div className="prc-card prc-card-featured">
              <span className="prc-card-badge">
                <SparkleIcon /> {isNL ? 'Meest gekozen' : 'Most popular'}
              </span>

              <p className="prc-card-tier prc-card-tier-spark">PRO</p>
              <div className="prc-card-price">
                <span className="prc-card-price-num">€{proPrice.toFixed(2).replace('.', ',')}</span>
                <span className="prc-card-price-unit">/{isNL ? 'mnd' : 'mo'} <span className="prc-card-price-vat">{isNL ? 'excl. BTW' : 'excl. VAT'}</span></span>
              </div>
              {annual && (
                <p className="prc-card-savings">
                  <span className="strike">€49,95/{isNL ? 'mnd' : 'mo'}</span>
                  <span className="save">{isNL ? 'Bespaar €120/jaar' : 'Save €120/year'}</span>
                </p>
              )}
              <p className="prc-card-desc">
                {isNL ? '50 keywords automatisch tracken, onbeperkte GEO prompts en telefonische support.' : '50 keywords automatic tracking, unlimited GEO prompts and phone support.'}
              </p>
              <p className="prc-card-usp">
                <em>{isNL ? 'Jouw project wordt ons project.' : 'Your project becomes our project.'}</em>
              </p>

              <button
                onClick={() => handleCheckout('pro')}
                disabled={loading}
                className="prc-card-btn prc-card-btn-primary"
              >
                <ZapIcon /> {loadingTier === 'pro' ? (isNL ? 'Laden...' : 'Loading...') : (isNL ? 'Start met Pro' : 'Start with Pro')}
              </button>
              <p className="prc-card-btn-meta">
                {isNL ? 'Maandelijks opzegbaar, excl. BTW' : 'Cancel anytime, excl. VAT'}
              </p>

              <ul className="prc-card-features">
                {features.map((f, i) => (
                  <li key={i} className={f.differ ? 'differ' : ''}>
                    <StatusIcon status={f.proStatus} />
                    <span className="prc-feature-name">{f.name}</span>
                    {typeof f.pro === 'string' && (
                      <span className="prc-feature-value prc-feature-value-success">{f.pro}</span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="prc-card-support prc-card-support-pro">
                <span><MailIcon /> {isNL ? 'E-mail' : 'Email'}</span>
                <span className="phone"><PhoneIcon /> {isNL ? 'Telefonisch' : 'Phone'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="prc-dash-section">
        <div className="prc-dash-wrap">
          <div className="prc-section-head">
            <h2 className="prc-section-h2">
              {isNL
                ? <>Dit zie je als <em>Lite of Pro</em> gebruiker</>
                : <>This is what <em>Lite and Pro</em> users see</>}
            </h2>
            <p className="prc-section-sub">
              {isNL
                ? 'Keyword tracking met grafieken over tijd, GEO Optimalisatie DIY met Search Console integratie en AI-advies per pagina.'
                : 'Keyword tracking with trends over time, GEO Optimization DIY with Search Console integration and AI advice per page.'}
            </p>
          </div>

          <div className="prc-dash">
            <div className="prc-dash-window">
              <div className="prc-dash-bar">
                <div className="prc-dash-brand">
                  <span className="prc-dash-logo">teun.ai</span>
                  <span className="prc-dash-subtitle">AI Visibility Dashboard</span>
                </div>
                <div className="prc-dash-tabs">
                  {['ChatGPT', 'Perplexity', 'Google AI'].map((p, i) => (
                    <span key={p} className={`prc-dash-tab ${i === 0 ? 'active' : ''}`}>{p}</span>
                  ))}
                </div>
              </div>
              <div className="prc-dash-stats">
                {[
                  { label: 'Visibility', value: '73%', sub: isNL ? '+12% deze maand' : '+12% this month', accent: 'spark' },
                  { label: 'ChatGPT', value: '8/10', sub: isNL ? 'gevonden' : 'found' },
                  { label: 'Perplexity', value: '6/10', sub: isNL ? 'gevonden' : 'found' },
                  { label: 'Threats', value: '3', sub: isNL ? 'concurrenten' : 'competitors', accent: 'warn' },
                ].map((card) => (
                  <div key={card.label} className="prc-dash-stat">
                    <div className="prc-dash-stat-label">{card.label}</div>
                    <div className={`prc-dash-stat-value ${card.accent ? `prc-dash-stat-value-${card.accent}` : ''}`}>{card.value}</div>
                    <div className={`prc-dash-stat-sub ${card.accent === 'warn' ? 'warn' : ''}`}>{card.sub}</div>
                  </div>
                ))}
              </div>
              <div className="prc-dash-chart-wrap">
                <div className="prc-dash-chart">
                  <div className="prc-dash-bars">
                    {[65, 40, 82, 55, 28, 50, 88, 35, 72, 60, 45, 78].map((h, i) => {
                      const dur = [3.2, 4.1, 2.8, 3.6, 4.5, 3.0, 3.8, 4.3, 2.9, 3.4, 4.0, 3.1][i]
                      const tone = ['s','s','p','p','w','s','p','s','p','s','w','p'][i]
                      return (
                        <div
                          key={i}
                          className={`prc-dash-bar-el prc-dash-bar-${tone}`}
                          style={{ height: `${h}%`, animationDuration: `${dur}s`, animationDelay: `${i * 0.3}s` }}
                        />
                      )
                    })}
                  </div>
                  <div className="prc-dash-legend">
                    {[{ l: 'ChatGPT', t: 'p' }, { l: 'Perplexity', t: 's' }, { l: 'Google AI', t: 'w' }].map(it => (
                      <span key={it.l} className="prc-dash-legend-item">
                        <span className={`prc-dash-legend-dot prc-dash-legend-${it.t}`} />
                        <span>{it.l}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="prc-dash-overlay">
              <div className="prc-dash-mascot">
                <Image src="/teun-ai-mascotte.png" alt="Teun" width={150} height={150} />
              </div>
              <p className="prc-dash-overlay-title">
                {isNL ? <>Unlock je volledige <em>AI dashboard</em></> : <>Unlock your full <em>AI dashboard</em></>}
              </p>
              <div className="prc-dash-overlay-btns">
                <button onClick={() => handleCheckout('lite')} disabled={loading} className="prc-card-btn prc-card-btn-secondary prc-overlay-btn">
                  {isNL ? `Lite, €${litePrice.toFixed(2).replace('.', ',')}/mnd` : `Lite, €${litePrice.toFixed(2).replace('.', ',')}/mo`}
                </button>
                <button onClick={() => handleCheckout('pro')} disabled={loading} className="prc-card-btn prc-card-btn-primary prc-overlay-btn">
                  <ZapIcon /> {isNL ? `Pro, €${proPrice.toFixed(2).replace('.', ',')}/mnd` : `Pro, €${proPrice.toFixed(2).replace('.', ',')}/mo`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS LINK */}
      <section className="prc-tools-link">
        <p>
          {isNL
            ? 'Alle tools werken op ChatGPT, Perplexity, Google AI Mode en AI Overviews.'
            : 'All tools work on ChatGPT, Perplexity, Google AI Mode and AI Overviews.'}
        </p>
        <Link href="/tools" className="prc-link">
          {isNL ? 'Bekijk alle tools' : 'View all tools'} <span aria-hidden="true">→</span>
        </Link>
      </section>

      {/* COMPARISON TABLE */}
      <section className="prc-compare-section">
        <div className="prc-compare-wrap">
          <div className="prc-section-head">
            <div className="tool-eyebrow">{isNL ? 'VERGELIJKING' : 'COMPARISON'}</div>
            <h2 className="prc-section-h2">
              {isNL ? <>Waarom <em>€400+ betalen</em>?</> : <>Why pay <em>€400+</em>?</>}
            </h2>
            <p className="prc-section-sub">
              {isNL
                ? 'Vergelijk Teun.ai met AI visibility tools en traditionele SEO platforms.'
                : 'Compare Teun.ai with AI visibility tools and traditional SEO platforms.'}
            </p>
          </div>

          <div className="prc-compare-table-wrap">
            <table className="prc-compare-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>{isNL ? 'Prijs /mnd' : 'Price /mo'}</th>
                  <th>AI Platforms</th>
                  <th>Prompts</th>
                  <th>Websites</th>
                  <th>{isNL ? 'Gratis tools' : 'Free tools'}</th>
                  <th>GEO Audit</th>
                  <th>Prompt Explorer</th>
                  <th>WP Plugin</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => (
                  <tr key={i} className={c.hl ? 'highlight' : ''}>
                    <td className="prc-compare-name">{c.name}</td>
                    <td className="prc-compare-price">{c.price}</td>
                    <td className={c.platforms === 'Geen' || c.platforms === 'None' ? 'muted' : ''}>{c.platforms}</td>
                    <td className={c.prompts === 'Onbeperkt' || c.prompts === 'Unlimited' ? 'success' : c.prompts === 'N/A' ? 'muted' : ''}>{c.prompts}</td>
                    <td className={c.websites === 'Onbeperkt' || c.websites === 'Unlimited' ? 'success' : ''}>{c.websites}</td>
                    <td className={c.tools.includes('gratis') || c.tools.includes('free') ? 'success' : 'muted'}>{c.tools}</td>
                    <td>{c.audit ? <StatusIcon status="check" /> : <StatusIcon status="cross" />}</td>
                    <td>{c.explorer ? <StatusIcon status="check" /> : <StatusIcon status="cross" />}</td>
                    <td>{c.plugin ? <StatusIcon status="check" /> : <StatusIcon status="cross" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="prc-compare-footnote">
            {isNL
              ? '* Peec.ai: kies 3 van 7 modellen, extra modellen via hogere tiers. Otterly.ai Lite $29/mnd voor 10 prompts, Standard $189/mnd voor 100 prompts. Profound Starter ($99) alleen ChatGPT. SEMrush AI visibility is een add-on. Briljant.nl: €49/mnd na 7 dagen gratis proefperiode. Prijzen per april 2025.'
              : '* Peec.ai: choose 3 of 7 models, more models via higher tiers. Otterly.ai Lite $29/mo for 10 prompts, Standard $189/mo for 100 prompts. Profound Starter ($99) ChatGPT only. SEMrush AI visibility is an add-on. Briljant.nl: €49/mo after 7-day free trial. Prices as of April 2025.'}
          </p>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="teun-final" aria-labelledby="prc-cta-heading">
        <div className="wrap">
          <h2 id="prc-cta-heading">
            {isNL ? (
              <>Volg automatisch.<br /><em>Optimaliseer zelf.</em></>
            ) : (
              <>Track automatically.<br /><em>Optimize yourself.</em></>
            )}
          </h2>
          <p>
            {isNL
              ? 'Volg automatisch je AI rankings en optimaliseer zelf met GEO Optimalisatie DIY. Liever hulp? OnlineLabs helpt je met professionele GEO-optimalisatie.'
              : 'Automatically track your AI rankings and optimize yourself with GEO Optimization DIY. Prefer help? OnlineLabs helps you with professional GEO optimization.'}
          </p>
          <div className="btns">
            <button onClick={() => handleCheckout('lite')} disabled={loading} className="btn-secondary">
              {isNL ? `Lite, €${litePrice.toFixed(2).replace('.', ',')}/mnd` : `Lite, €${litePrice.toFixed(2).replace('.', ',')}/mo`}
            </button>
            <button onClick={() => handleCheckout('pro')} disabled={loading} className="btn-primary">
              {isNL ? `Pro, €${proPrice.toFixed(2).replace('.', ',')}/mnd` : `Pro, €${proPrice.toFixed(2).replace('.', ',')}/mo`} <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="prc-cta-links">
            <Link href="/signup" className="prc-link">
              {isNL ? 'Gratis account aanmaken' : 'Create free account'} <span aria-hidden="true">→</span>
            </Link>
            <a href="https://www.onlinelabs.nl/skills/geo-optimalisatie" target="_blank" rel="noopener noreferrer" className="prc-link prc-link-muted">
              {isNL ? 'GEO door OnlineLabs' : 'GEO by OnlineLabs'} <span aria-hidden="true">→</span>
            </a>
          </div>
          <p className="prc-cta-meta">
            {isNL ? (
              <>Geen creditcard nodig. Maandelijks opzegbaar.<br />Prijzen excl. BTW.</>
            ) : (
              <>No credit card needed. Cancel anytime.<br />Prices excl. VAT.</>
            )}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="teun-faq" id="faq" aria-labelledby="prc-faq-heading">
        <div className="wrap">
          <div className="teun-faq-head">
            <div className="teun-faq-eyebrow">
              {isNL ? 'VRAGEN & ANTWOORDEN' : 'QUESTIONS & ANSWERS'}
            </div>
            <h2 id="prc-faq-heading">
              {isNL
                ? <>Veelgestelde<br /><em>vragen</em></>
                : <>Frequently asked<br /><em>questions</em></>}
            </h2>
          </div>

          <div className="teun-faq-cats" role="tablist">
            {[
              { id: 'all',     count: counts.all },
              { id: 'product', count: counts.product },
              { id: 'billing', count: counts.billing }
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
            {filteredFaqs.map((item, i) => (
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
        </div>
      </section>
    </div>
  )
}

// ============================================
// ICONS
// ============================================
function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="2" width="12" height="10" rx="1" />
      <path d="M1 3l6 4 6-4" />
    </svg>
  )
}
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0l2.5 7.5L22 10l-7.5 2.5L12 20l-2.5-7.5L2 10l7.5-2.5z" />
    </svg>
  )
}
