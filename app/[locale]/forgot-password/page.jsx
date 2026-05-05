// app/[locale]/forgot-password/page.jsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useLocale } from 'next-intl'

export default function ForgotPasswordPage() {
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const isEn = locale === 'en'

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email.trim()) {
      setError(isEn ? 'Enter your email address' : 'Vul je emailadres in')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const redirectPath = isEn ? '/en/reset-password' : '/reset-password'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${redirectPath}`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  // ============================================
  // SUCCESS STATE
  // ============================================
  if (success) {
    return (
      <div className="tool-page fpw-page">
        <div className="fpw-wrap">
          <div className="fpw-success-card">
            <div className="fpw-success-mascot">
              <Image
                src="/Teun-ai_welkom.png"
                alt="Teun.ai"
                width={120}
                height={150}
                priority
              />
            </div>

            <div className="fpw-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <h2 className="fpw-success-title">
              {isEn ? <>Check your <em>email</em></> : <>Check je <em>inbox</em></>}
            </h2>

            <p className="fpw-success-msg">
              {isEn
                ? 'If an account exists for this email, you will receive a password reset link.'
                : 'Als er een account bestaat voor dit emailadres, ontvang je een link om je wachtwoord te resetten.'}
            </p>

            <p className="fpw-success-email">{email}</p>

            <div className="fpw-tip">
              <span className="fpw-tip-label">TIP</span>
              <p>
                {isEn
                  ? 'Check your spam folder if you don\'t see the email within a few minutes.'
                  : 'Kijk in je spam folder als je de email niet binnen een paar minuten ontvangt.'}
              </p>
            </div>

            <Link href="/login" className="fpw-btn fpw-btn-primary">
              <ArrowLeftIcon />
              {isEn ? 'Back to login' : 'Terug naar inloggen'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // FORM STATE
  // ============================================
  return (
    <div className="tool-page fpw-page">
      <div className="fpw-wrap">
        <div className="fpw-mascot">
          <Image
            src="/Teun-ai_welkom.png"
            alt="Teun.ai"
            width={140}
            height={175}
            priority
          />
        </div>

        <div className="fpw-header">
          <div className="tool-eyebrow">
            {isEn ? 'PASSWORD RESET' : 'WACHTWOORD RESETTEN'}
          </div>
          <h1 className="fpw-h1">
            {isEn
              ? <>Forgot <em>password?</em></>
              : <>Wachtwoord <em>vergeten?</em></>}
          </h1>
          <p className="fpw-sub">
            {isEn
              ? 'Enter your email and we\'ll send you a reset link.'
              : 'Vul je emailadres in en we sturen je een reset link.'}
          </p>
        </div>

        {error && (
          <div className="fpw-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" x2="12" y1="8" y2="12"/>
              <line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            <div>
              <p className="fpw-error-title">{isEn ? 'Error' : 'Fout'}</p>
              <p className="fpw-error-msg">{error}</p>
            </div>
          </div>
        )}

        <div className="fpw-form-card">
          <form onSubmit={handleReset} className="fpw-form">
            <div className="fpw-field">
              <label htmlFor="email" className="fpw-label">
                {isEn ? 'Email address' : 'Emailadres'}
              </label>
              <div className="fpw-input-row">
                <MailIcon />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isEn ? 'you@example.com' : 'jij@voorbeeld.nl'}
                  required
                  className="fpw-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="fpw-btn fpw-btn-primary"
            >
              {loading ? (
                <>
                  <SpinnerIcon /> {isEn ? 'Sending...' : 'Versturen...'}
                </>
              ) : (
                isEn ? 'Send reset link' : 'Reset link versturen'
              )}
            </button>
          </form>
        </div>

        <p className="fpw-back-link">
          <Link href="/login">
            <ArrowLeftIcon />
            {isEn ? 'Back to login' : 'Terug naar inloggen'}
          </Link>
        </p>
      </div>
    </div>
  )
}

// ============================================
// ICONS (inline SVG)
// ============================================
function MailIcon() {
  return (
    <svg className="fpw-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}
function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7"/>
      <path d="M19 12H5"/>
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg className="fpw-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}
