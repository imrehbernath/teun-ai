// app/[locale]/signup/page.jsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, Link } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth')
  const locale = useLocale()
  const isNL = locale === 'nl'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionToken, setSessionToken] = useState(null)

  // Tier detection: support both ?tier= (pricing-page redirect)
  // and ?plan= (Stripe API redirect for unauthenticated users)
  const tierParam = searchParams?.get('tier') || searchParams?.get('plan')
  const isProFlow = tierParam === 'pro' || searchParams?.get('pro') === '1'
  const isLiteFlow = tierParam === 'lite'
  const isPaidFlow = isProFlow || isLiteFlow
  const tierLabel = isProFlow ? 'Pro' : 'Lite'
  const redirectUrl = searchParams?.get('redirect')

  // Fetch session token: URL param > localStorage > cookie
  useEffect(() => {
    const stParam = searchParams?.get('st')
    if (stParam) {
      setSessionToken(stParam)
      try { localStorage.setItem('teun_claim_token', stParam) } catch {}
      return
    }
    try {
      const stored = localStorage.getItem('teun_claim_token')
      if (stored) {
        setSessionToken(stored)
        return
      }
    } catch {}
    fetch('/api/session-token')
      .then(res => res.json())
      .then(data => {
        if (data.sessionToken) setSessionToken(data.sessionToken)
      })
      .catch(() => {})
  }, [searchParams])

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError(t('signup.passwordTooShort'))
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectUrl || (isNL ? '/dashboard' : '/en/dashboard')}`,
        data: {
          locale,
          ...(sessionToken ? { session_token: sessionToken } : {})
        }
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.user) {
      setSuccess(true)
      setLoading(false)
    }
  }

  // ============================================
  // SUCCESS STATE
  // ============================================
  if (success) {
    return (
      <div className="tool-page sgn-page sgn-success-page">
        <div className="sgn-success-card">
          <div className="sgn-success-mascot">
            <Image
              src="/Teun-ai-blij-met-resultaat.png"
              alt={t('signup.teunHappyAlt')}
              width={140}
              height={175}
              priority
            />
          </div>

          <div className="sgn-success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h2 className="sgn-success-title">
            {t('signup.almostDone')}
          </h2>

          <p className="sgn-success-desc">
            {t('signup.confirmationSent')}
          </p>

          <p className="sgn-success-email">{email}</p>

          <div className="sgn-success-steps">
            <p className="sgn-success-steps-title">{t('signup.nextStep')}</p>
            <ol>
              <li>{t('signup.step1')}</li>
              <li>{t('signup.step2')}</li>
              <li>{t('signup.step3')}</li>
            </ol>
          </div>

          <div className="sgn-success-tip">
            <span className="sgn-success-tip-icon">💡</span>
            <p>
              <strong>{t('signup.tipLabel')}</strong> {t('signup.tipText')}
            </p>
          </div>

          <Link href="/login" className="sgn-btn sgn-btn-primary">
            {t('signup.toLogin')}
          </Link>
        </div>
      </div>
    )
  }

  // ============================================
  // FORM STATE
  // ============================================
  return (
    <div className="tool-page sgn-page">
      <div className="sgn-wrap">
        <div className="sgn-grid">

          {/* Left column: Teun + benefits (desktop only) */}
          <div className="sgn-left">
            <Image
              src="/Teun-ai-blij-met-resultaat.png"
              alt={t('signup.teunAlt')}
              width={300}
              height={375}
              className="sgn-mascot-img"
              priority
            />
            <h2 className="sgn-left-title">
              {t('signup.heroTitle')} <em>{t('signup.heroHighlight')}</em>
            </h2>
            <p className="sgn-left-desc">{t('signup.heroDesc')}</p>

            {!isPaidFlow && (
              <div className="sgn-benefits">
                <p className="sgn-benefits-title">{t('signup.benefitsTitle')}</p>
                <ul className="sgn-benefits-list">
                  <li>
                    <span className="sgn-benefit-check"><CheckIcon /></span>
                    {t('signup.benefit1')}
                  </li>
                  <li>
                    <span className="sgn-benefit-check"><CheckIcon /></span>
                    <span><strong>{t('signup.benefit2Bold')}</strong> {t('signup.benefit2')}</span>
                  </li>
                  <li>
                    <span className="sgn-benefit-check"><CheckIcon /></span>
                    {t('signup.benefit3')}
                  </li>
                  <li>
                    <span className="sgn-benefit-check"><CheckIcon /></span>
                    {t('signup.benefit4')}
                  </li>
                  <li>
                    <span className="sgn-benefit-check"><CheckIcon /></span>
                    {t('signup.benefit5')}
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Right column: Form */}
          <div className="sgn-right">

            {/* Mobile mascot */}
            <div className="sgn-mobile-mascot">
              <Image
                src="/Teun-ai-blij-met-resultaat.png"
                alt={t('signup.teunAlt')}
                width={140}
                height={175}
                priority
              />
            </div>

            {/* Header */}
            <div className="sgn-header">
              <div className="tool-eyebrow">
                {isPaidFlow
                  ? (isNL ? `${tierLabel.toUpperCase()} ABONNEMENT` : `${tierLabel.toUpperCase()} SUBSCRIPTION`)
                  : (isNL ? 'GRATIS ACCOUNT' : 'FREE ACCOUNT')}
              </div>
              <h1 className="sgn-h1">
                {isPaidFlow ? (
                  isNL
                    ? <>Nog één stap naar <em>{tierLabel}</em></>
                    : <>One step to <em>{tierLabel}</em></>
                ) : (
                  isNL
                    ? <>Maak een <em>gratis</em> account</>
                    : <>Create a <em>free</em> account</>
                )}
              </h1>
              <p className="sgn-sub">
                {isPaidFlow
                  ? (isNL ? `Maak een account aan en activeer daarna ${tierLabel}.` : `Create an account and then activate ${tierLabel}.`)
                  : t('signup.subtitle')}
              </p>
            </div>

            {/* Tier FOMO banner */}
            {isPaidFlow && (
              <div className="sgn-tier-banner">
                <div className="sgn-tier-banner-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="sgn-tier-banner-title">
                    {isNL ? `Je ${tierLabel} abonnement staat klaar` : `Your ${tierLabel} subscription is ready`}
                  </p>
                  <ul className="sgn-tier-banner-list">
                    <li>{isNL ? 'Onbeperkte scans op alle 6 tools' : 'Unlimited scans on all 6 tools'}</li>
                    {isLiteFlow && <li>{isNL ? '20 keywords automatische tracking' : '20 keywords automatic tracking'}</li>}
                    {isProFlow && <li>{isNL ? '50 keywords automatische tracking' : '50 keywords automatic tracking'}</li>}
                    <li>{isNL ? 'GEO Optimalisatie DIY' : 'GEO Optimization DIY'}</li>
                    {isProFlow && <li>{isNL ? 'Telefonische support' : 'Phone support'}</li>}
                    <li>{isNL ? 'Maandelijks opzegbaar' : 'Cancel anytime'}</li>
                  </ul>
                  <p className="sgn-tier-banner-meta">
                    {isNL ? 'Na registratie word je teruggestuurd om af te rekenen.' : 'After signup you\'ll be redirected to complete payment.'}
                  </p>
                </div>
              </div>
            )}
            {isPaidFlow && (
              <p className="sgn-tier-fallback">
                {isNL ? 'Of ' : 'Or '}
                <a href={isNL ? '/signup' : '/en/signup'}>
                  {isNL ? 'maak een gratis account aan' : 'create a free account'}
                </a>
                {isNL ? ` zonder ${tierLabel}.` : ` without ${tierLabel}.`}
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="sgn-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" x2="12" y1="8" y2="12"/>
                  <line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                <div>
                  <p className="sgn-error-title">{t('signup.errorTitle')}</p>
                  <p className="sgn-error-msg">{error}</p>
                </div>
              </div>
            )}

            {/* Form card */}
            <div className="sgn-form-card">
              <form onSubmit={handleSignup} className="sgn-form">

                <div className="sgn-field">
                  <label htmlFor="email" className="sgn-label">
                    {t('emailLabel')} <span className="sgn-required">*</span>
                  </label>
                  <div className="sgn-input-row">
                    <MailIcon />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      required
                      className="sgn-input"
                    />
                  </div>
                </div>

                <div className="sgn-field">
                  <label htmlFor="password" className="sgn-label">
                    {t('passwordLabel')} <span className="sgn-required">*</span>
                  </label>
                  <div className="sgn-input-row">
                    <LockIcon />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('signup.passwordPlaceholder')}
                      required
                      className="sgn-input"
                    />
                  </div>
                  <p className="sgn-hint">{t('signup.passwordHint')}</p>
                </div>

                {/* Mobile benefits - hide in paid flow */}
                {!isPaidFlow && (
                  <div className="sgn-mobile-benefits">
                    <p className="sgn-benefits-title">{t('signup.benefitsTitle')}</p>
                    <ul className="sgn-benefits-list">
                      <li>
                        <span className="sgn-benefit-check"><CheckIcon /></span>
                        {t('signup.benefit1')}
                      </li>
                      <li>
                        <span className="sgn-benefit-check"><CheckIcon /></span>
                        <span><strong>{t('signup.benefit2Bold')}</strong> {t('signup.benefit2')}</span>
                      </li>
                      <li>
                        <span className="sgn-benefit-check"><CheckIcon /></span>
                        {t('signup.benefit3')}
                      </li>
                      <li>
                        <span className="sgn-benefit-check"><CheckIcon /></span>
                        {t('signup.benefit4')}
                      </li>
                      <li>
                        <span className="sgn-benefit-check"><CheckIcon /></span>
                        {t('signup.benefit5')}
                      </li>
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="sgn-btn sgn-btn-primary sgn-submit"
                >
                  {loading ? (
                    <>
                      <SpinnerIcon /> {t('signup.creating')}
                    </>
                  ) : (
                    <>
                      <UserIcon />
                      {isPaidFlow
                        ? (isNL ? `Account aanmaken en doorgaan naar ${tierLabel}` : `Create account and continue to ${tierLabel}`)
                        : t('signup.title')}
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="sgn-login-link">
              {t('signup.hasAccount')}{' '}
              <Link href="/login">{t('signup.loginLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="tool-page sgn-page sgn-loading">
        <SpinnerIcon />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}

// ============================================
// ICONS (inline SVG, geen lucide imports)
// ============================================
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function MailIcon() {
  return (
    <svg className="sgn-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}
function LockIcon() {
  return (
    <svg className="sgn-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg className="sgn-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}
