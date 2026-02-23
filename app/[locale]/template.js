// app/[locale]/template.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

// Tools menu items — vertaald via next-intl
function useTools() {
  const t = useTranslations('tools');
  
  return [
    {
      name: t('aiVisibility.name'),
      href: '/tools/ai-visibility',
      badge: t('aiVisibility.badge'),
      badgeColor: 'bg-green-500/20 text-green-300',
      description: t('aiVisibility.description'),
    },
    {
      name: t('aiRankTracker.name'),
      href: '/tools/ai-rank-tracker',
      badge: t('aiRankTracker.badge'),
      badgeColor: 'bg-blue-500/20 text-blue-300',
      description: t('aiRankTracker.description'),
    },
    {
      name: t('geoAudit.name'),
      href: '/tools/geo-audit',
      badge: t('geoAudit.badge'),
      badgeColor: 'bg-purple-500/20 text-purple-300',
      description: t('geoAudit.description'),
    },
    {
      name: t('geoAnalysis.name'),
      href: '/dashboard',
      description: t('geoAnalysis.description'),
    },
  ];
}

// Header Component
function Header() {
  const t = useTranslations('header');
  const locale = useLocale();
  const isEn = locale === 'en';
  const TOOLS = useTools();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const toolsRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setToolsOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    
    if (window.chrome && chrome.storage) {
      try { chrome.storage.local.clear(); } catch (err) {}
    }
    
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  return (
    <>
      <header className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] shadow-lg sticky top-0 z-50">
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
              
              {/* Tools Dropdown */}
              <div ref={toolsRef} className="relative">
                <button
                  onClick={() => setToolsOpen(!toolsOpen)}
                  className="text-white/90 hover:text-white font-medium text-[15px] transition-colors flex items-center gap-1.5"
                >
                  {t('tools')}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {toolsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-[#1E1E3F] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-dropIn z-[60]">
                    <div className="p-2">
                      {TOOLS.map((tool) => (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          onClick={() => setToolsOpen(false)}
                          className={`flex flex-col gap-0.5 px-4 py-3 rounded-lg transition-colors ${
                            pathname === tool.href 
                              ? 'bg-white/10 text-white' 
                              : 'text-white/80 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="font-medium text-[14px] flex items-center gap-2">
                            {tool.name}
                            {tool.badge && (
                              <span className={`${tool.badgeColor} px-2 py-0.5 rounded text-[10px] font-bold`}>
                                {tool.badge}
                              </span>
                            )}
                          </span>
                          <span className="text-white/50 text-xs">{tool.description}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Blog link — ALLEEN zichtbaar in NL */}
              {!isEn && (
                <Link
                  href="/blog"
                  className="text-white/90 hover:text-white font-medium text-[15px] transition-colors"
                >
                  {t('blog')}
                </Link>
              )}
              
              {user ? (
                <div className="flex items-center gap-4">
                  <Link 
                    href="/dashboard"
                    className="text-white/90 hover:text-white font-medium text-[15px] transition-colors"
                  >
                    {t('dashboard')}
                  </Link>
                  <span className="text-white/70 text-sm">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-white/90 hover:text-white font-medium text-[15px] transition-colors hover:underline"
                  >
                    {t('logout')}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-white/90 hover:text-white font-medium text-[15px] transition-colors"
                >
                  {t('login')}
                </Link>
              )}

              {/* Language Switcher */}
              <LanguageSwitcher />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-3">
              <LanguageSwitcher />
              <button
                type="button"
                className="text-white p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">{t('openMenu')}</span>
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
                
                <div className="px-3 py-2">
                  <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">{t('tools')}</span>
                </div>
                {TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className={`flex flex-col gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                      pathname === tool.href
                        ? 'bg-white/10 text-white'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="font-medium text-[14px] flex items-center gap-2">
                      {tool.name}
                      {tool.badge && (
                        <span className={`${tool.badgeColor} px-2 py-0.5 rounded text-[10px] font-bold`}>
                          {tool.badge}
                        </span>
                      )}
                    </span>
                    <span className="text-white/50 text-xs">{tool.description}</span>
                  </Link>
                ))}

                <div className="border-t border-white/10 my-2" />

                {/* Blog link — ALLEEN zichtbaar in NL (mobile) */}
                {!isEn && (
                  <Link
                    href="/blog"
                    className="block px-3 py-2 text-white/90 font-medium text-[15px] hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('blog')}
                  </Link>
                )}

                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block px-3 py-2 text-white/90 font-medium text-[15px] hover:text-white transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('dashboard')}
                    </Link>
                    <div className="px-3 py-2 text-white/70 text-sm">
                      {user.email}
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-3 py-2 text-white/90 font-medium text-[15px] hover:text-white transition-colors"
                    >
                      {t('logout')}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-white/90 font-medium text-[15px] hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('login')}
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>

      <style jsx global>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-dropIn { animation: dropIn 0.15s ease-out; }
      `}</style>
    </>
  );
}

// Footer Component
function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const isEn = locale === 'en';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isEn ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-8 lg:gap-12`}>
          
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-white font-montserrat font-semibold text-[22px] leading-[24px]">
                TEUN.AI
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {t('tagline')}
            </p>
            <p className="text-white/60 text-xs">
              {t('rights', { year: currentYear })}
            </p>
          </div>

         
          {/* Over GEO — Hele kolom alleen in NL */}
          {!isEn && (
            <div>
              <span className="text-white font-semibold text-base mb-4 block">{t('aboutGeo')}</span>
              <ul className="space-y-2">
                <li>
                  <Link href="/blog" className="text-white/70 hover:text-white text-sm transition-colors">
                    Blog & Insights
                  </Link>
                </li>
                <li>
                  <Link href="/wat-is-generative-engine-optimisation-geo" className="text-white/70 hover:text-white text-sm transition-colors">
                    {t('whatIsGeo')}
                  </Link>
                </li>
              </ul>
            </div>
          )}
          {/* GEO Tools */}
          <div>
            <span className="text-white font-semibold text-base mb-4 block">{t('geoTools')}</span>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-white/70 hover:text-white text-sm transition-colors">
                  {t('completeAnalysis')}
                </Link>
              </li>
              <li>
                <Link href="/tools/geo-audit" className="text-white/70 hover:text-white text-sm transition-colors">
                  GEO Audit
                </Link>
              </li>
              <li>
                <Link href="/tools/ai-visibility" className="text-white/70 hover:text-white text-sm transition-colors">
                  {t('aiVisibility')}
                </Link>
              </li>
              <li>
                <Link href="/tools/ai-rank-tracker" className="text-white/70 hover:text-white text-sm transition-colors">
                  {t('aiRankTracker')}
                </Link>
              </li>
              <li>
                <span className="text-white/50 text-sm cursor-not-allowed">
                  {t('contentOptimizer')} <span className="text-xs">({t('comingSoon')})</span>
                </span>
              </li>
              <li>
                <span className="text-white/50 text-sm cursor-not-allowed">
                  {t('schemaGenerator')} <span className="text-xs">({t('comingSoon')})</span>
                </span>
              </li>
              <li>
                <span className="text-white/50 text-sm cursor-not-allowed">
                  {t('competitorRadar')} <span className="text-xs">({t('comingSoon')})</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Bedrijf */}
          <div>
            <span className="text-white font-semibold text-base mb-4 block">{t('company')}</span>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://www.onlinelabs.nl/contact" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white text-sm transition-colors"
                >
                  {t('contact')}
                </a>
              </li>
              <li>
                <Link href="/privacyverklaring" className="text-white/70 hover:text-white text-sm transition-colors">
                  {t('privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-xs flex items-center gap-1.5">
              <svg className="w-4 h-3 rounded-[1px] flex-shrink-0" viewBox="0 0 640 480" aria-label="Nederlandse vlag"><rect width="640" height="160" fill="#AE1C28"/><rect y="160" width="640" height="160" fill="#FFF"/><rect y="320" width="640" height="160" fill="#21468B"/></svg> Made in Holland by <a href="https://www.onlinelabs.nl" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors font-medium">OnlineLabs</a>
            </p>
            
            <div className="flex gap-4">
              <a href="https://www.linkedin.com/company/onlinelabs" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a href="https://x.com/onlinelabs_nl" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors" aria-label="Twitter/X">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Template Component
export default function Template({ children }) {
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
