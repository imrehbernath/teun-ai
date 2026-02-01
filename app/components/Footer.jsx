'use client';

import { useState } from 'react';
import Link from 'next/link';

// Early Access Popup Component
function EarlyAccessPopup({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setStatus('success');
        setEmail('');
        setTimeout(() => { setStatus('idle'); onClose(); }, 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Sluiten">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">GEO Optimalisatie – Binnenkort!</h3>
          <p className="text-gray-600">Onze GEO Optimalisatie tool is in ontwikkeling. Meld je aan voor de early access lijst en we laten je weten zodra deze klaar is.</p>
          <p className="text-gray-500 text-sm mt-2">💡 Wist je dat onze <a href="/tools/ai-visibility" className="text-blue-600 font-medium hover:underline">AI Zichtbaarheid Scan</a> al gratis beschikbaar is? Maak een gratis account en start direct.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Vul je emailadres in *" required disabled={status === 'loading'} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors disabled:opacity-50" />
          <button type="submit" disabled={status === 'loading'} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer">
            {status === 'loading' ? 'Verzenden...' : 'Zet me op de lijst'}
          </button>
        </form>
        {status === 'success' && <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">✓ Bedankt! Je ontvangt binnenkort meer informatie.</div>}
        {status === 'error' && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">✗ Er ging iets mis. Probeer het opnieuw.</div>}
      </div>
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
    <footer className="bg-gradient-to-br from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Column 1: Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-white font-montserrat font-semibold text-[22px] leading-[24px]">
                TEUN.AI
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Word zichtbaar in AI-zoekresultaten met Generative Engine Optimisation (GEO).
            </p>
            <p className="text-white/60 text-xs">
              © {currentYear} Teun.ai. Alle rechten voorbehouden.
            </p>
          </div>

          {/* Column 2: Over GEO */}
          <div>
            <h3 className="text-white font-semibold text-base mb-4">Over GEO</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/blog" className="text-white/70 hover:text-white text-sm transition-colors">
                  Blog & Insights
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Tools */}
          <div>
            <h3 className="text-white font-semibold text-base mb-4">GEO Tools</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => setShowPopup(true)} className="text-white/70 hover:text-white text-sm transition-colors inline-flex items-center gap-2 cursor-pointer">
                  GEO Optimalisatie
                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded">early access</span>
                </button>
              </li>
              <li>
                <Link href="/tools/ai-visibility" className="text-white/70 hover:text-white text-sm transition-colors inline-flex items-center gap-2">
                  AI Zichtbaarheid
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded">LIVE</span>
                </Link>
              </li>
              <li>
                <span className="text-white/40 text-sm">
                  Zoekwoord Analyse <span className="text-white/30 text-xs">(binnenkort)</span>
                </span>
              </li>
              <li>
                <span className="text-white/40 text-sm">
                  Entity Builder <span className="text-white/30 text-xs">(binnenkort)</span>
                </span>
              </li>
              <li>
                <span className="text-white/40 text-sm">
                  Schema Markup <span className="text-white/30 text-xs">(binnenkort)</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Bedrijf */}
          <div>
            <h3 className="text-white font-semibold text-base mb-4">Bedrijf</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://www.onlinelabs.nl/contact" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white text-sm transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <button onClick={() => setShowPopup(true)} className="text-white/70 hover:text-white text-sm transition-colors cursor-pointer">
                  Early Access
                </button>
              </li>
              <li>
                <Link href="/privacy" className="text-white/70 hover:text-white text-sm transition-colors">
                  Privacyverklaring
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-xs">
              Powered by <a href="https://onlinelabs.nl" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">OnlineLabs</a>
            </p>
            
            {/* Social Media */}
            <div className="flex gap-4">
              <a 
                href="https://linkedin.com/company/teun-ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a 
                href="https://twitter.com/teun_ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
    <EarlyAccessPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
    </>
  );
}
