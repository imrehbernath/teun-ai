'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLocale } from 'next-intl';

export default function ResetPasswordPage() {
  const router = useRouter();
  const locale = useLocale();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const isEn = locale === 'en';

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError(isEn ? 'Password must be at least 6 characters' : 'Wachtwoord moet minimaal 6 tekens zijn');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(isEn ? 'Passwords do not match' : 'Wachtwoorden komen niet overeen');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      const errorMessages = {
        'New password should be different from the old password.': isEn
          ? 'New password must be different from your current password.'
          : 'Je nieuwe wachtwoord moet anders zijn dan je huidige wachtwoord.',
        'Password should be at least 6 characters.': isEn
          ? 'Password must be at least 6 characters.'
          : 'Wachtwoord moet minimaal 6 tekens zijn.',
      };
      setError(errorMessages[error.message] || error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (!sessionReady) {
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
                  src="/Teun-ai_welkom.png"
                  alt="Teun.ai"
                  width={120}
                  height={150}
                  className="drop-shadow-xl"
                />
              </div>

              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {isEn ? 'Invalid or expired link' : 'Ongeldige of verlopen link'}
              </h2>
              
              <p className="text-slate-600 mb-6">
                {isEn
                  ? 'This reset link is no longer valid. Please request a new one.'
                  : 'Deze reset link is niet meer geldig. Vraag een nieuwe aan.'}
              </p>

              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                {isEn ? 'Request new link' : 'Nieuwe link aanvragen'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  alt="Teun.ai"
                  width={120}
                  height={150}
                  className="drop-shadow-xl"
                />
              </div>

              <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {isEn ? 'Password updated!' : 'Wachtwoord gewijzigd!'}
              </h2>
              
              <p className="text-slate-600 mb-6">
                {isEn
                  ? 'Your password has been updated. You will be redirected to your dashboard.'
                  : 'Je wachtwoord is gewijzigd. Je wordt doorgestuurd naar je dashboard.'}
              </p>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                {isEn ? 'Go to dashboard' : 'Naar dashboard'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          
          <div className="flex justify-center mb-6">
            <Image
              src="/Teun-ai_welkom.png"
              alt="Teun.ai"
              width={160}
              height={200}
              className="drop-shadow-xl"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
              {isEn ? 'Set new password' : 'Nieuw wachtwoord instellen'}
            </h1>
            <p className="text-slate-500">
              {isEn ? 'Choose a strong password for your account.' : 'Kies een sterk wachtwoord voor je account.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-800">{isEn ? 'Error' : 'Fout'}</p>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  {isEn ? 'New password' : 'Nieuw wachtwoord'} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isEn ? 'Minimum 6 characters' : 'Minimaal 6 tekens'}
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  {isEn ? 'Confirm password' : 'Bevestig wachtwoord'} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isEn ? 'Saving...' : 'Opslaan...'}
                  </>
                ) : (
                  isEn ? 'Save new password' : 'Nieuw wachtwoord opslaan'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
