'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useLocale } from 'next-intl';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isEn = locale === 'en';

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email.trim()) {
      setError(isEn ? 'Enter your email address' : 'Vul je emailadres in');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const redirectPath = isEn ? '/en/reset-password' : '/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${redirectPath}`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
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
                  src="/Teun-ai_welkom.png"
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
                {isEn ? 'Check your email' : 'Check je inbox'}
              </h2>
              
              <p className="text-slate-600 mb-4">
                {isEn
                  ? 'If an account exists for this email, you will receive a password reset link.'
                  : 'Als er een account bestaat voor dit emailadres, ontvang je een link om je wachtwoord te resetten.'}
              </p>
              
              <p className="text-blue-600 font-semibold mb-6 text-lg">
                {email}
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
                <p className="text-sm text-amber-800">
                  💡 <strong>Tip:</strong>{' '}
                  {isEn
                    ? 'Check your spam folder if you don\'t see the email within a few minutes.'
                    : 'Kijk in je spam folder als je de email niet binnen een paar minuten ontvangt.'}
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                {isEn ? 'Back to login' : 'Terug naar inloggen'}
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
              {isEn ? 'Forgot password?' : 'Wachtwoord vergeten?'}
            </h1>
            <p className="text-slate-500">
              {isEn
                ? 'Enter your email and we\'ll send you a reset link.'
                : 'Vul je emailadres in en we sturen je een reset link.'}
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
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  {isEn ? 'Email address' : 'Emailadres'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isEn ? 'you@example.com' : 'jij@voorbeeld.nl'}
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
                    {isEn ? 'Sending...' : 'Versturen...'}
                  </>
                ) : (
                  isEn ? 'Send reset link' : 'Reset link versturen'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-500 mt-6">
            <Link href="/login" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold">
              <ArrowLeft className="w-4 h-4" />
              {isEn ? 'Back to login' : 'Terug naar inloggen'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
