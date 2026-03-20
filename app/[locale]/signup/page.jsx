'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const isProFlow = searchParams?.get('pro') === '1';
  const redirectUrl = searchParams?.get('redirect');

  // ── Fetch session token: URL param > localStorage > cookie ──
  useEffect(() => {
    // 1. Check URL param (cross-browser: from scan page link)
    const stParam = searchParams?.get('st')
    if (stParam) {
      setSessionToken(stParam)
      try { localStorage.setItem('teun_claim_token', stParam) } catch {}
      return
    }

    // 2. Check localStorage (set by scan page in same browser)
    try {
      const stored = localStorage.getItem('teun_claim_token')
      if (stored) {
        setSessionToken(stored)
        return
      }
    } catch {}

    // 3. Fallback: read httpOnly cookie via API
    fetch('/api/session-token')
      .then(res => res.json())
      .then(data => {
        if (data.sessionToken) setSessionToken(data.sessionToken);
      })
      .catch(() => {});
  }, [searchParams]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError(t('signup.passwordTooShort'));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectUrl || (locale === 'nl' ? '/dashboard' : '/en/dashboard')}`,
        data: {
          locale,
          // Persist session token in user_metadata for cross-browser claim
          ...(sessionToken ? { session_token: sessionToken } : {})
        }
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        </div>

        <div className="relative flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <div className="flex justify-center mb-4">
                <Image
                  src="/Teun-ai-blij-met-resultaat.png"
                  alt={t('signup.teunHappyAlt')}
                  width={120}
                  height={150}
                  className="drop-shadow-xl"
                />
              </div>

              <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {t('signup.almostDone')}
              </h2>
              
              <p className="text-slate-600 mb-4">
                {t('signup.confirmationSent')}
              </p>
              
              <p className="text-blue-600 font-semibold mb-6 text-lg">
                {email}
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-left">
                <p className="text-sm font-semibold text-blue-800">{t('signup.nextStep')}</p>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                  <li>{t('signup.step1')}</li>
                  <li>{t('signup.step2')}</li>
                  <li>{t('signup.step3')}</li>
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
                <p className="text-sm text-amber-800">
                  💡 <strong>{t('signup.tipLabel')}</strong> {t('signup.tipText')}
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                {t('signup.toLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Subtle background blobs */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Teun + benefits */}
          <div className="hidden lg:flex flex-col items-center text-center">
            <Image
              src="/Teun-ai-blij-met-resultaat.png"
              alt={t('signup.teunAlt')}
              width={320}
              height={400}
              className="drop-shadow-2xl mb-6"
              priority
            />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {t('signup.heroTitle')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {t('signup.heroHighlight')}
              </span>
            </h2>
            <p className="text-slate-500 max-w-xs mb-6">
              {t('signup.heroDesc')}
            </p>

            {/* Benefits list - hide in Pro flow */}
            {!isProFlow && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-left w-full max-w-xs shadow-sm">
              <p className="text-sm font-semibold text-slate-900 mb-3">{t('signup.benefitsTitle')}</p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 text-xs">✓</span>
                  </span>
                  {t('signup.benefit1')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  <span><strong className="text-slate-900">{t('signup.benefit2Bold')}</strong> {t('signup.benefit2')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-xs">✓</span>
                  </span>
                  {t('signup.benefit3')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 text-xs">✓</span>
                  </span>
                  {t('signup.benefit4')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-xs">✓</span>
                  </span>
                  {t('signup.benefit5')}
                </li>
              </ul>
            </div>
            )}
          </div>

          {/* Right: Signup form */}
          <div className="w-full max-w-md mx-auto">
            
            {/* Mobile Teun */}
            <div className="lg:hidden flex justify-center mb-6">
              <Image
                src="/Teun-ai-blij-met-resultaat.png"
                alt={t('signup.teunAlt')}
                width={160}
                height={200}
                className="drop-shadow-xl"
              />
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                {isProFlow
                  ? (locale === 'nl' ? 'Nog één stap naar Pro' : 'One step to Pro')
                  : t('signup.title')}
              </h1>
              <p className="text-slate-500">
                {isProFlow
                  ? (locale === 'nl' ? 'Maak eerst een gratis account aan, daarna activeer je Pro.' : 'Create a free account first, then activate Pro.')
                  : t('signup.subtitle')}
              </p>
            </div>

            {/* Pro FOMO banner */}
            {isProFlow && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </span>
                  <div>
                    <p className="font-bold text-sm text-slate-900 mb-1">{locale === 'nl' ? 'Je Pro abonnement staat klaar' : 'Your Pro subscription is ready'}</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>{locale === 'nl' ? '✓ Onbeperkte scans op alle 6 tools' : '✓ Unlimited scans on all 6 tools'}</li>
                      <li>{locale === 'nl' ? '✓ Onbeperkte websites' : '✓ Unlimited websites'}</li>
                      <li>{locale === 'nl' ? '✓ GEO Optimalisatie dashboard' : '✓ GEO Optimization dashboard'}</li>
                      <li>{locale === 'nl' ? '✓ Maandelijks opzegbaar' : '✓ Cancel anytime'}</li>
                    </ul>
                    <p className="text-[10px] text-slate-400 mt-2">{locale === 'nl' ? 'Na registratie word je teruggestuurd om af te rekenen.' : 'After signup you\'ll be redirected to complete payment.'}</p>
                  </div>
                </div>
              </div>
            )}
            {isProFlow && (
              <p className="text-center text-xs text-slate-400 -mt-3 mb-4">
                {locale === 'nl' ? 'Of ' : 'Or '}
                <a href={locale === 'nl' ? '/signup' : '/en/signup'} className="text-blue-500 hover:underline">
                  {locale === 'nl' ? 'maak een gratis account aan' : 'create a free account'}
                </a>
                {locale === 'nl' ? ' zonder Pro.' : ' without Pro.'}
              </p>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-800">{t('signup.errorTitle')}</p>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Signup Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <form onSubmit={handleSignup} className="space-y-5">
                
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('emailLabel')} *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('passwordLabel')} *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('signup.passwordPlaceholder')}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{t('signup.passwordHint')}</p>
                </div>

                {/* Mobile benefits - hide in Pro flow */}
                {!isProFlow && (
                <div className="lg:hidden bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">{t('signup.benefitsTitle')}</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>🟣 {t('signup.benefit1')}</li>
                    <li>🟢 <strong>{t('signup.benefit2Bold')}</strong> {t('signup.benefit2')}</li>
                    <li>🔵 {t('signup.benefit3')}</li>
                    <li>🟢 {t('signup.benefit4')}</li>
                    <li>📊 {t('signup.benefit5')}</li>
                  </ul>
                </div>
                )}

                {/* Signup Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('signup.creating')}
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5" />
                      {isProFlow
                        ? (locale === 'nl' ? 'Account aanmaken en doorgaan naar Pro' : 'Create account and continue to Pro')
                        : t('signup.title')}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Login Link */}
            <p className="text-center text-slate-500 mt-6">
              {t('signup.hasAccount')}{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                {t('signup.loginLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-300 animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
