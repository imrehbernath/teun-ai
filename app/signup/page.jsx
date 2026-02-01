'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, User } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 karakters lang zijn');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/tools/ai-visibility`,
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
                  alt="Teun is blij"
                  width={120}
                  height={150}
                  className="drop-shadow-xl"
                />
              </div>

              <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Bijna klaar! 🎉
              </h2>
              
              <p className="text-slate-600 mb-4">
                We hebben een bevestigingsmail gestuurd naar:
              </p>
              
              <p className="text-blue-600 font-semibold mb-6 text-lg">
                {email}
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-left">
                <p className="text-sm font-semibold text-blue-800">Volgende stap:</p>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                  <li>Check je inbox (en spam folder)</li>
                  <li>Klik op de bevestigingslink</li>
                  <li>Je wordt automatisch ingelogd!</li>
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
                <p className="text-sm text-amber-800">
                  💡 <strong>Tip:</strong> Check ook je spam/ongewenste mail folder!
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Naar inlogpagina
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
              alt="Teun verwelkomt je"
              width={320}
              height={400}
              className="drop-shadow-2xl mb-6"
              priority
            />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Maak een{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                gratis account
              </span>
            </h2>
            <p className="text-slate-500 max-w-xs mb-6">
              Start direct met het scannen van je AI-zichtbaarheid op 4 platforms.
            </p>

            {/* Benefits list */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-left w-full max-w-xs shadow-sm">
              <p className="text-sm font-semibold text-slate-900 mb-3">✨ Gratis account bevat:</p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  1 Perplexity scan per dag
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  <span><strong className="text-slate-900">Onbeperkt</strong> ChatGPT scannen</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Persoonlijk dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-xs">✓</span>
                  </span>
                  Scan geschiedenis & trends
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Signup form */}
          <div className="w-full max-w-md mx-auto">
            
            {/* Mobile Teun */}
            <div className="lg:hidden flex justify-center mb-6">
              <Image
                src="/Teun-ai-blij-met-resultaat.png"
                alt="Teun verwelkomt je"
                width={160}
                height={200}
                className="drop-shadow-xl"
              />
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                Account Aanmaken
              </h1>
              <p className="text-slate-500">
                1 gratis scan per dag + onbeperkt ChatGPT!
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-800">Registratie mislukt</p>
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
                    Email adres *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jouw@email.nl"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    Wachtwoord *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimaal 6 karakters"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Minimaal 6 karakters</p>
                </div>

                {/* Mobile benefits */}
                <div className="lg:hidden bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">✨ Gratis account bevat:</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>✅ 1 Perplexity scan per dag</li>
                    <li>✅ <strong>Onbeperkt</strong> ChatGPT scannen (Chrome extensie)</li>
                    <li>✅ Persoonlijk dashboard</li>
                    <li>✅ Scan geschiedenis & trends</li>
                  </ul>
                </div>

                {/* Signup Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Account aanmaken...
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5" />
                      Account aanmaken
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Login Link */}
            <p className="text-center text-slate-500 mt-6">
              Heb je al een account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Log hier in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
