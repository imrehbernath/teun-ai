'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
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
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/home" className="flex items-center">
              <span className="text-white font-montserrat font-semibold text-[22px] leading-[24px] hover:opacity-90 transition-opacity">
                TEUN.AI
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
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
                    
                    {/* Dropdown */}
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
            
            {/* CTA Button */}
            <Link
              href="/tools/geo-audit"
              className="bg-gradient-to-r from-[#1A7DFF] to-[#6C3FF2] text-white px-6 py-2.5 rounded-lg font-semibold text-[15px] hover:shadow-lg hover:scale-105 transition-all"
            >
              Start GEO Audit
            </Link>
          </div>

          {/* Mobile menu button */}
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

        {/* Mobile menu */}
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