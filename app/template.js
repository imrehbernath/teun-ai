'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Header Component (inline)
function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/home' },
    {
      name: 'Over GEO',
      href: '/over-geo',
      submenu: [
        { name: 'Wat is GEO?', href: '/over-geo/wat-is-geo' },
        { name: 'SEO vs GEO', href: '/over-geo/seo-vs-geo' },
        { name: 'De 6 dimensies van GEO-analyse', href: '/over-geo/6-dimensies' },
      ],
    },
    {
      name: 'Tools',
      href: '/tools',
      submenu: [
        { name: 'GEO Audit', href: '/tools/geo-audit' },
        { name: 'AI Zichtbaarheidsanalyse', href: '/tools/ai-zichtbaarheid' },
        { name: 'Keyword Relevance Finder', href: '/tools/keyword-relevance' },
        { name: 'Entity Builder', href: '/tools/entity-builder' },
        { name: 'Structured Data Checker', href: '/tools/structured-data' },
      ],
    },
    {
      name: 'Blog',
      href: '/blog',
      submenu: [
        { name: 'GEO Basics', href: '/blog/category/geo-basics' },
        { name: 'AI-Visibility', href: '/blog/category/ai-visibility' },
        { name: 'Case Studies', href: '/blog/category/case-studies' },
        { name: 'Tools & Updates', href: '/blog/category/tools-updates' },
      ],
    },
    { name: 'Over Teun.ai', href: '/over-ons' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] shadow-lg sticky top-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between py-4">
          
          <div className="flex items-center">
            <Link href="/home" className="flex items-center">
              <span className="text-white font-montserrat font-semibold text-[22px] leading-[24px] hover:opacity-90 transition-opacity">
                TEUN.AI
              </span>
            </Link>
          </div>

          <div className="hidden lg:flex lg:items-center lg:gap-8">
            {navigation.map((item) => (
              <div key={item.name} className="relative group">
                {item.submenu ? (
                  <>
                    <button
                      className="text-white/90 hover:text-white font-medium text-[15px] transition-colors flex items-center gap-1"
                      onMouseEnter={() => setOpenSubmenu(item.name)}
                    >
                      {item.name}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {openSubmenu === item.name && (
                      <div 
                        className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 z-50"
                        onMouseLeave={() => setOpenSubmenu(null)}
                      >
                        {item.submenu.map((subitem) => (
                          <Link
                            key={subitem.name}
                            href={subitem.href}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-700 transition-colors"
                          >
                            {subitem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`text-white/90 hover:text-white font-medium text-[15px] transition-colors ${
                      pathname === item.href ? 'text-white' : ''
                    }`}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
            
            <Link
              href="/tools/geo-audit"
              className="bg-gradient-to-r from-[#1A7DFF] to-[#6C3FF2] text-white px-6 py-2.5 rounded-lg font-semibold text-[15px] hover:shadow-lg hover:scale-105 transition-all"
            >
              Start GEO Audit
            </Link>
          </div>

          <div className="lg:hidden">
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

        {mobileMenuOpen && (
          <div className="lg:hidden pb-4">
            <div className="space-y-1">
              {navigation.map((item) => (
                <div key={item.name}>
                  {item.submenu ? (
                    <>
                      <button
                        onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                        className="w-full text-left px-3 py-2 text-white/90 font-medium text-[15px] flex items-center justify-between"
                      >
                        {item.name}
                        <svg 
                          className={`w-4 h-4 transition-transform ${openSubmenu === item.name ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {openSubmenu === item.name && (
                        <div className="pl-6 space-y-1">
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className="block px-3 py-2 text-white/70 text-sm hover:text-white transition-colors"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {subitem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="block px-3 py-2 text-white/90 font-medium text-[15px] hover:text-white transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
              
              <Link
                href="/tools/geo-audit"
                className="block mt-4 bg-gradient-to-r from-[#1A7DFF] to-[#6C3FF2] text-white px-6 py-2.5 rounded-lg font-semibold text-[15px] text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start GEO Audit
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

// Footer Component (inline)
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          <div className="lg:col-span-1">
            <Link href="/home" className="inline-block mb-4">
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

          <div>
            <h3 className="text-white font-semibold text-base mb-4">Over GEO</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/over-geo/wat-is-geo" className="text-white/70 hover:text-white text-sm transition-colors">
                  Wat is GEO?
                </Link>
              </li>
              <li>
                <Link href="/over-geo/seo-vs-geo" className="text-white/70 hover:text-white text-sm transition-colors">
                  SEO vs GEO
                </Link>
              </li>
              <li>
                <Link href="/over-geo/6-dimensies" className="text-white/70 hover:text-white text-sm transition-colors">
                  6 Dimensies van GEO
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-white/70 hover:text-white text-sm transition-colors">
                  Blog & Academy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-4">GEO Tools</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/tools/geo-audit" className="text-white/70 hover:text-white text-sm transition-colors">
                  GEO Audit
                </Link>
              </li>
              <li>
                <Link href="/tools/ai-zichtbaarheid" className="text-white/70 hover:text-white text-sm transition-colors">
                  AI Zichtbaarheidsanalyse
                </Link>
              </li>
              <li>
                <Link href="/tools/keyword-relevance" className="text-white/70 hover:text-white text-sm transition-colors">
                  Keyword Relevance Finder
                </Link>
              </li>
              <li>
                <Link href="/tools/entity-builder" className="text-white/70 hover:text-white text-sm transition-colors">
                  Entity Builder
                </Link>
              </li>
              <li>
                <Link href="/tools/structured-data" className="text-white/70 hover:text-white text-sm transition-colors">
                  Structured Data Checker
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-4">Bedrijf</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/over-ons" className="text-white/70 hover:text-white text-sm transition-colors">
                  Over Teun.ai
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/70 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/early-access" className="text-white/70 hover:text-white text-sm transition-colors">
                  Early Access
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/70 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/70 hover:text-white text-sm transition-colors">
                  Algemene Voorwaarden
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-xs">
              Powered by <Link href="https://onlinelabs.nl" target="_blank" className="hover:text-white transition-colors">OnlineLabs</Link>
            </p>
            
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