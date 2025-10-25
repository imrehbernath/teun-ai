'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // ✅ FIXED: Preserve extension parameter if present
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('extension') === 'true' 
        ? '/dashboard?extension=true' 
        : '/dashboard';
      
      router.push(redirectUrl);
      router.refresh();
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    
    // ✅ FIXED: Preserve extension parameter in magic link redirect
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('extension') === 'true'
      ? '/dashboard?extension=true'
      : '/dashboard';
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectPath}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMagicLinkSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001233] via-[#1a0b3d] to-[#2d1654] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-blue-200 to-purple-200 text-transparent bg-clip-text">
            Inloggen
          </h1>
          <p className="text-gray-400">
            Welkom terug! Log in om verder te gaan.
          </p>
        </div>

        {/* Success Message */}
        {magicLinkSent && (
          <div className="backdrop-blur-sm bg-green-500/20 border border-green-400/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-200 mb-1">Check je email!</p>
              <p className="text-green-300/80">We hebben een magic link gestuurd naar {email}. Klik op de link om in te loggen.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-red-200">Inloggen mislukt</p>
              <p className="text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email adres
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
                Wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 text-white placeholder-gray-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inloggen...
                </>
              ) : (
                'Inloggen'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1a0b3d] text-gray-400">Of</span>
            </div>
          </div>

          {/* Magic Link Button */}
          <button
            onClick={handleMagicLink}
            disabled={loading || !email}
            className="w-full px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Stuur magic link
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            Geen wachtwoord? Voer je email in en klik op "Stuur magic link"
          </p>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-gray-400 mt-6">
          Nog geen account?{' '}
          <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-semibold">
            Registreer hier
          </Link>
        </p>
      </div>
    </div>
  );
}