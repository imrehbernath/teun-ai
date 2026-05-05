// app/[locale]/login/page.jsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const locale = useLocale()
  const isNL = locale === 'nl'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const params = new URLSearchParams(window.location.search)
      const redirectUrl = params.get('extension') === 'true'
        ? "/dashboard?extension=true"
        : "/dashboard"

      router.push(redirectUrl)
      router.refresh()
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const params = new URLSearchParams(window.location.search)
    const dashboardPath = params.get('extension') === 'true'
      ? "/dashboard?extension=true"
      : "/dashboard"
    // Auth callback is outside next-intl, so construct locale-aware path manually
    const nextPath = locale === 'nl' ? dashboardPath : `/en${dashboardPath}`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextPath}`,
        data: { locale }
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setMagicLinkSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="tool-page lgn-page">
      <div className="lgn-wrap">
        <div className="lgn-grid">

          {/* Left column: Teun + welcome (desktop only) */}
          <div className="lgn-left">
            <Image
              src="/Teun-ai_welkom.png"
              alt={t('login.teunAlt')}
              width={300}
              height={375}
              className="lgn-mascot-img"
              priority
            />
            <h2 className="lgn-left-title">
              {t('login.welcomeTo')} <em>Teun.ai</em>
            </h2>
            <p className="lgn-left-desc">{t('login.welcomeDesc')}</p>

            {/* Platform pills */}
            <div className="lgn-platforms">
              {['ChatGPT', 'Perplexity', 'Google AI', 'AI Overview'].map((platform) => (
                <span key={platform} className="lgn-platform-pill">
                  <span className="lgn-platform-dot" aria-hidden="true" />
                  {platform}
                </span>
              ))}
            </div>
          </div>

          {/* Right column: Form */}
          <div className="lgn-right">

            {/* Mobile mascot */}
            <div className="lgn-mobile-mascot">
              <Image
                src="/Teun-ai_welkom.png"
                alt={t('login.teunAlt')}
                width={140}
                height={175}
                priority
              />
            </div>

            {/* Header */}
            <div className="lgn-header">
              <div className="tool-eyebrow">
                {isNL ? 'INLOGGEN' : 'SIGN IN'}
              </div>
              <h1 className="lgn-h1">
                {isNL
                  ? <>Welkom <em>terug</em></>
                  : <>Welcome <em>back</em></>}
              </h1>
              <p className="lgn-sub">{t('login.subtitle')}</p>
            </div>

            {/* Magic link success */}
            {magicLinkSent && (
              <div className="lgn-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div>
                  <p className="lgn-success-title">{t('login.magicLinkTitle')}</p>
                  <p className="lgn-success-msg">{t('login.magicLinkDesc', { email })}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="lgn-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" x2="12" y1="8" y2="12"/>
                  <line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                <div>
                  <p className="lgn-error-title">{t('login.errorTitle')}</p>
                  <p className="lgn-error-msg">{error}</p>
                </div>
              </div>
            )}

            {/* Form card */}
            <div className="lgn-form-card">
              <form onSubmit={handleEmailLogin} className="lgn-form">

                <div className="lgn-field">
                  <label htmlFor="email" className="lgn-label">
                    {t('emailLabel')}
                  </label>
                  <div className="lgn-input-row">
                    <MailIcon />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      required
                      className="lgn-input"
                    />
                  </div>
                </div>

                <div className="lgn-field">
                  <label htmlFor="password" className="lgn-label">
                    {t('passwordLabel')}
                  </label>
                  <div className="lgn-input-row">
                    <LockIcon />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="lgn-input"
                    />
                  </div>
                  <div className="lgn-forgot">
                    <Link href="/forgot-password">
                      {isNL ? 'Wachtwoord vergeten?' : 'Forgot password?'}
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="lgn-btn lgn-btn-primary"
                >
                  {loading ? (
                    <>
                      <SpinnerIcon /> {t('login.loggingIn')}
                    </>
                  ) : (
                    t('login.title')
                  )}
                </button>
              </form>

              <div className="lgn-divider">
                <span>{t('or')}</span>
              </div>

              <button
                onClick={handleMagicLink}
                disabled={loading || !email}
                className="lgn-btn lgn-btn-secondary"
              >
                <MailIcon />
                {t('login.sendMagicLink')}
              </button>

              <p className="lgn-hint">{t('login.magicLinkHint')}</p>
            </div>

            <p className="lgn-signup-link">
              {t('login.noAccount')}{' '}
              <Link href="/signup">{t('login.signUpLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ICONS (inline SVG)
// ============================================
function MailIcon() {
  return (
    <svg className="lgn-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}
function LockIcon() {
  return (
    <svg className="lgn-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg className="lgn-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}
