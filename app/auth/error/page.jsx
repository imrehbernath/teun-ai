'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001233] via-[#1a0b3d] to-[#2d1654] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-400/30">
            <AlertCircle className="w-8 h-8 text-red-300" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Er ging iets mis
          </h2>
          
          <p className="text-gray-300 mb-6">
            We konden je niet inloggen. Probeer het opnieuw of neem contact op als het probleem aanhoudt.
          </p>

          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg text-center"
            >
              Terug naar login
            </Link>
            <Link
              href="/signup"
              className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition text-center"
            >
              Registreren
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}