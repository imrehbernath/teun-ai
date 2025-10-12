'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="min-h-screen bg-gradient-to-b from-[#001233] via-[#1a0b3d] to-[#2d1654] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          
          {/* Success Card */}
          <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-400/30">
              <CheckCircle2 className="w-8 h-8 text-green-300" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              Bijna klaar! 🎉
            </h2>
            
            <p className="text-gray-300 mb-6">
              We hebben een bevestigingsmail gestuurd naar:
            </p>
            
            <p className="text-purple-300 font-semibold mb-6 text-lg">
              {email}
            </p>
            
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-200">
                <strong>Volgende stap:</strong>
              </p>
              <ol className="text-sm text-blue-300 mt-2 space-y-1 list-decimal list-inside">
                <li>Check je inbox (en spam folder)</li>
                <li>Klik op de bevestigingslink</li>
                <li>Je wordt automatisch ingelogd!</li>
              </ol>
            </div>

            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg"
            >
              Naar inlogpagina
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001233] via-[#1a0b3d] to-[#2d1654] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-blue-200 to-purple-200 text-transparent bg-clip-text">
            Account Aanmaken
          </h1>
          <p className="text-gray-400">
            Start met 5 gratis scans per maand!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-red-200">Registratie mislukt</p>
              <p className="text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Signup Card */}
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSignup} className="space-y-6">
            
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email adres *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jouw@email.nl"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 text-white placeholder-gray-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Wachtwoord *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimaal 6 karakters"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 text-white placeholder-gray-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Minimaal 6 karakters
              </p>
            </div>

            {/* Benefits */}
            <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-purple-200 mb-2">✨ Met een gratis account krijg je:</p>
              <ul className="text-sm text-purple-300 space-y-1">
                <li>✅ 5 scans per maand</li>
                <li>✅ Kortere wachttijden (30 min)</li>
                <li>✅ Scan geschiedenis bewaren</li>
                <li>✅ Email notificaties</li>
              </ul>
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
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
        <p className="text-center text-gray-400 mt-6">
          Heb je al een account?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
            Log hier in
          </Link>
        </p>
      </div>
    </div>
  );
}