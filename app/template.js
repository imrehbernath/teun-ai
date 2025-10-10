'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
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
        setTimeout(() => {
          setStatus('idle');
          onClose();
        }, 3000);
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
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            GEO Audit - Binnenkort!
          </h3>
          <p className="text-gray-600">
            Meld je aan voor early access en krijg als eerste toegang tot onze GEO Audit tool.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Vul je emailadres in *"
            required
            disabled={status === 'loading'}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors disabled:opacity-50"
          />
          
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {status === 'loading' ? 'Verzenden...' : 'Aanmelden voor Early Access'}
          </button>
        </form>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
            ✓ Bedankt! Je ontvangt binnenkort meer informatie.
          </div>
        )}
        
        {status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            ✗ Er ging iets mis. Probeer het opnieuw.
          </div>
        )}
      </div>
    </div>
  );
}

// Header Component - Beta versie
function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <header className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] shadow-lg sticky top-0 z-40">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-4">
            
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <span className="text-white font-montserrat font-semibold text-[22px] leading-[24px] hover:opacity-90 transition-opacity">
                  TEUN.AI
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:gap-6">
              <Link
                href="/blog"
                className="text-white/90 hover:text-white font-medium text-[15px] transition-colors"
              >
                Blog
              </Link>
              
              <button
                onClick={() => setShowPopup(true)}
                className="bg-gradient-to-r from-[#1A7DFF] to-[#6C3FF2] text-white px-6 py-2.5 rounded-lg font-semibold text-[15px] hover:shadow-lg hover:scale-105 transition-all"
              >
                Start GEO Audit
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="text-white p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open menu</span>
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4">
              <div className="space-y-1">
                <Link
                  href="/blog"
                  className="block px-3 py-2 text-white/90 font-medium text-[15px] hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                
                <button
                  onClick={() => {
                    setShowPopup(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full mt-4 bg-gradient-to-r from-[#1A7DFF] to-[#6C3FF2] text-white px-6 py-2.5 rounded-lg font-semibold text-[15px] text-center"
                >
                  Start GEO Audit
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Popup */}
      <EarlyAccessPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
    </>
  );
}

// Footer Component - Beta versie
function Footer() {
  const currentYear = new Date().getFullYear();
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <footer className="bg-gradient-to-br from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Brand */}
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

            {/* Over GEO */}
            <div>
              <h3 className="text-white font-semibold text-base mb-4">Over GEO</h3>
              <ul className="space-y-2">
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    Wat is GEO? <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    SEO vs GEO <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    6 Dimensies <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <Link href="/blog" className="text-white/70 hover:text-white text-sm transition-colors">
                    Blog & Insights
                  </Link>
                </li>
              </ul>
            </div>

            {/* GEO Tools */}
            <div>
              <h3 className="text-white font-semibold text-base mb-4">GEO Tools</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => setShowPopup(true)}
                    className="text-white/70 hover:text-white text-sm transition-colors text-left"
                  >
                    GEO Audit <span className="text-xs text-purple-300">(early access)</span>
                  </button>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    AI Zichtbaarheid <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    Keyword Relevance <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    Entity Builder <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    Structured Data <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Bedrijf */}
            <div>
              <h3 className="text-white font-semibold text-base mb-4">Bedrijf</h3>
              <ul className="space-y-2">
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    Over ons <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    Contact <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <button 
                    onClick={() => setShowPopup(true)}
                    className="text-white/70 hover:text-white text-sm transition-colors text-left"
                  >
                    Early Access
                  </button>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    Privacy Policy <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
                <li>
                  <span className="text-white/50 text-sm cursor-not-allowed">
                    Voorwaarden <span className="text-xs">(binnenkort)</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/60 text-xs">
                Powered by <a href="https://www.onlinelabs.nl" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">OnlineLabs</a>
              </p>
              
              <div className="flex gap-4">
                <button
                  disabled
                  className="text-white/40 cursor-not-allowed"
                  title="Binnenkort beschikbaar"
                  aria-label="LinkedIn - Binnenkort beschikbaar"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </button>
                <button
                  disabled
                  className="text-white/40 cursor-not-allowed"
                  title="Binnenkort beschikbaar"
                  aria-label="Twitter/X - Binnenkort beschikbaar"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Popup */}
      <EarlyAccessPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
    </>
  );
}

// Main Template Component
export default function Template({ children }) {
  const pathname = usePathname();
  
  // Toon GEEN header/footer op coming soon page
  const showLayout = pathname !== '/';

  if (!showLayout) {
    return children;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}