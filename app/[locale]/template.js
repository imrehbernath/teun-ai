// app/[locale]/template.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import LanguageSwitcher from '../components/LanguageSwitcher';

// TODO: Calendly URL hier invullen zodra die bestaat
const CALENDLY_URL = 'https://calendly.com/onlinelabs-amsterdam/teun-demo';

// ============================================
// LOGO COMPONENT — teun◍ai
// ============================================
function TeunLogo({ inverted = false, size = 22 }) {
  const inkColor = inverted ? '#fff' : 'var(--ink)';
  return (
    <span
      style={{
        fontFamily: 'var(--font-poppins), sans-serif',
        fontWeight: 700,
        fontSize: `${size}px`,
        letterSpacing: '-0.045em',
        color: inkColor,
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 1,
      }}
    >
      teun
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: 'var(--spark)',
          color: '#fff',
          fontSize: `${Math.round(size * 0.6)}px`,
          fontWeight: 700,
          margin: '0 3px',
          position: 'relative',
          top: '-1px',
          transition: 'transform 0.4s ease',
        }}
        className="teun-logo-sep"
      >
        ◍
      </span>
      <span style={{ color: inkColor, fontWeight: 700 }}>ai</span>
    </span>
  );
}

// ============================================
// HEADER
// ============================================
function Header() {
  const t = useTranslations('header');
  const locale = useLocale();
  const isEn = locale === 'en';

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

  // Lock scroll bij mobile drawer
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (window.chrome && chrome.storage) {
      try { chrome.storage.local.clear(); } catch (err) {}
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  // Tool data voor mega menu
  const measureTools = [
    {
      href: '/tools/ai-visibility',
      title: isEn ? 'AI Visibility Scan' : 'AI Zichtbaarheid Scan',
      desc: isEn ? 'Scan 4 AI platforms' : 'Scan 4 AI-platforms',
    },
    {
      href: '/tools/brand-check',
      title: 'AI Brand Check',
      desc: isEn ? 'What does AI say about you?' : 'Wat zegt AI over jou?',
    },
    {
      href: '/tools/ai-rank-tracker',
      title: 'AI Rank Tracker',
      desc: isEn ? 'Track your AI ranking' : 'Track je AI-ranking',
    },
  ];

  const discoverTools = [
    {
      href: '/tools/ai-prompt-explorer',
      title: 'AI Prompt Explorer',
      desc: isEn ? '10 commercial AI search queries' : '10 commerciële AI zoekvragen',
    },
  ];

  const optimizeTools = [
    {
      href: '/tools/geo-audit',
      title: 'GEO Audit',
      desc: isEn ? 'Page score for AI' : 'Pagina-score voor AI',
    },
    {
      href: '/pricing',
      title: isEn ? 'GEO Optimization DIY' : 'GEO Optimalisatie DIY',
      desc: isEn ? 'Optimize your pages' : "Je pagina's optimaliseren",
    },
  ];

  return (
    <>
      <style>{`
        .teun-header {
          position: sticky; top: 0; z-index: 60;
          background: rgba(250, 247, 242, 0.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }
        .teun-logo:hover .teun-logo-sep { transform: rotate(360deg); }

        .teun-nav-item > a,
        .teun-nav-item > button {
          padding: 8px 14px; font-size: 14px; color: var(--ink-2);
          border-radius: 8px; transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          font-family: var(--font-poppins), sans-serif;
        }
        .teun-nav-item > a:hover,
        .teun-nav-item > button:hover {
          background: var(--bg-2); color: var(--ink);
        }

        .teun-mega {
          position: absolute; top: calc(100% + 8px); left: -16px;
          min-width: 640px; background: #fff;
          border: 1px solid var(--line); border-radius: 14px;
          padding: 24px 24px 0;
          box-shadow: 0 20px 50px rgba(15, 23, 48, 0.14);
          opacity: 0; visibility: hidden; transform: translateY(-6px);
          transition: all 0.2s; z-index: 5;
        }
        .teun-mega.open { opacity: 1; visibility: visible; transform: translateY(0); }
        .teun-mega-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; padding-bottom: 20px; }
        .teun-mega-col-title {
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink-3); font-weight: 600; margin-bottom: 14px;
        }
        .teun-mega-item { display: block; padding: 8px 0; border-radius: 6px; transition: opacity 0.15s; }
        .teun-mega-item + .teun-mega-item { margin-top: 2px; }
        .teun-mega-item:hover { opacity: 0.7; }
        .teun-mega-item .t {
          font-size: 14px; font-weight: 600; color: var(--ink);
          display: flex; align-items: center; gap: 6px;
        }
        .teun-mega-item .t .tag {
          font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 2px 6px; border-radius: 4px; color: #fff; font-weight: 600;
          background: var(--spark);
        }
        .teun-mega-item .t .tag.beta { background: var(--success); }
        .teun-mega-item .d { font-size: 12.5px; color: var(--ink-3); margin-top: 3px; line-height: 1.4; }
        .teun-mega-foot {
          border-top: 1px solid var(--line); margin: 0 -24px;
          padding: 14px 24px; display: flex; justify-content: space-between; align-items: center;
        }
        .teun-mega-foot a { font-size: 13px; font-weight: 600; color: var(--spark); }
        .teun-mega-foot a:hover { color: var(--ink); }

        .teun-cta {
          background: var(--navy); color: #fff;
          padding: 10px 18px; border-radius: 10px;
          font-size: 14px; font-weight: 500;
          display: inline-flex; align-items: center; gap: 8px;
          transition: all 0.2s;
          font-family: var(--font-poppins), sans-serif;
        }
        .teun-cta:hover {
          background: var(--navy-deep); transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(26, 43, 94, 0.2);
        }

        .teun-login {
          font-size: 14px; color: var(--ink-2);
          padding: 8px 12px;
          font-family: var(--font-poppins), sans-serif;
        }
        .teun-login:hover { color: var(--ink); }

        /* Mobile drawer */
        .teun-drawer {
          position: fixed; inset: 64px 0 0 0;
          background: #fff;
          padding: 20px 28px; overflow-y: auto;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          z-index: 70;
        }
        .teun-drawer.open { transform: translateX(0); }
        .teun-drawer-overlay {
          position: fixed; inset: 64px 0 0 0;
          background: rgba(15, 23, 48, 0.4);
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 65;
        }
        .teun-drawer-overlay.open {
          opacity: 1; pointer-events: auto;
        }
        .teun-drawer a, .teun-drawer button {
          display: block; padding: 14px 0;
          font-size: 16px; color: var(--ink);
          border-bottom: 1px solid var(--line);
          font-family: var(--font-poppins), sans-serif;
          background: none;
          border-left: none; border-right: none; border-top: none;
          width: 100%;
          text-align: left;
        }
        .teun-drawer .section-title {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--ink-3); font-weight: 600;
          margin-top: 20px; padding: 10px 0 4px; border: none;
        }
        .teun-drawer a.indent { padding-left: 12px; font-size: 15px; color: var(--ink-2); }
        .teun-drawer .teun-cta { display: inline-flex; margin-top: 16px; }

        /* Hamburger */
        .teun-hamburger {
          width: 28px; height: 28px;
          display: flex; flex-direction: column;
          justify-content: center; gap: 4px;
          background: none; border: none; cursor: pointer;
        }
        .teun-hamburger span {
          display: block; width: 22px; height: 2px;
          background: var(--ink); border-radius: 2px;
          transition: all 0.25s;
        }
        .teun-hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .teun-hamburger.open span:nth-child(2) { opacity: 0; }
        .teun-hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

        @media (max-width: 960px) {
          .teun-nav-desktop { display: none !important; }
          .teun-nav-right-desktop { display: none !important; }
        }
        @media (min-width: 961px) {
          .teun-hamburger { display: none; }
        }
      `}</style>

      <header className="teun-header" role="banner">
        <div className="max-w-[1240px] mx-auto px-7">
          <nav
            className="flex items-center justify-between py-3.5 gap-5"
            aria-label={isEn ? 'Main navigation' : 'Hoofdnavigatie'}
          >
            {/* Logo */}
            <Link href="/" className="teun-logo flex items-center" aria-label="teun.ai">
              <TeunLogo />
            </Link>

            {/* Desktop nav */}
            <div className="teun-nav-desktop flex gap-1 items-center">
              <div ref={toolsRef} className="teun-nav-item relative">
                <button
                  onClick={() => setToolsOpen(!toolsOpen)}
                  onMouseEnter={() => setToolsOpen(true)}
                  aria-expanded={toolsOpen}
                >
                  {isEn ? 'Free tools' : 'Gratis tools'}
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
                    <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <div
                  className={`teun-mega ${toolsOpen ? 'open' : ''}`}
                  onMouseLeave={() => setToolsOpen(false)}
                >
                  <div className="teun-mega-grid">
                    <div>
                      <div className="teun-mega-col-title">{isEn ? 'Discover' : 'Ontdekken'}</div>
                      {discoverTools.map((tool) => (
                        <Link key={tool.href} href={tool.href} className="teun-mega-item">
                          <div className="t">
                            {tool.title}
                            {tool.tag && <span className={`tag ${tool.tag === 'Beta' ? 'beta' : ''}`}>{tool.tag}</span>}
                          </div>
                          <div className="d">{tool.desc}</div>
                        </Link>
                      ))}
                    </div>
                    <div>
                      <div className="teun-mega-col-title">{isEn ? 'Measure' : 'Meten'}</div>
                      {measureTools.map((tool) => (
                        <Link key={tool.href} href={tool.href} className="teun-mega-item">
                          <div className="t">
                            {tool.title}
                            {tool.tag && <span className="tag">{tool.tag}</span>}
                          </div>
                          <div className="d">{tool.desc}</div>
                        </Link>
                      ))}
                    </div>
                    <div>
                      <div className="teun-mega-col-title">{isEn ? 'Optimize' : 'Optimaliseren'}</div>
                      {optimizeTools.map((tool) => (
                        <Link key={tool.href} href={tool.href} className="teun-mega-item">
                          <div className="t">{tool.title}</div>
                          <div className="d">{tool.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="teun-mega-foot">
                    <Link href="/tools">{isEn ? 'View all tools →' : 'Alle tools bekijken →'}</Link>
                    <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                      {isEn ? '6 free tools' : '6 gratis tools'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="teun-nav-item">
                <Link href={isEn ? '/about-us' : '/over-ons'}>
                  {isEn ? 'About us' : 'Over ons'}
                </Link>
              </div>
              <div className="teun-nav-item">
                <Link href="/pricing">{isEn ? 'Pricing' : 'Prijzen'}</Link>
              </div>
              <div className="teun-nav-item">
                <Link href="/blog">{isEn ? 'Blog' : 'Blogs'}</Link>
              </div>
            </div>

            {/* Right side desktop */}
            <div className="teun-nav-right-desktop flex items-center gap-2.5">
              <LanguageSwitcher variant="cream" />
              {user ? (
                <>
                  <Link href="/dashboard" className="teun-login">Dashboard</Link>
                  <button onClick={handleLogout} className="teun-login">
                    {isEn ? 'Logout' : 'Uitloggen'}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="teun-login">
                    {isEn ? 'Login' : 'Inloggen'}
                  </Link>
                  <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="teun-cta">
                    {isEn ? 'Book a demo' : 'Plan een demo'} <span aria-hidden="true">→</span>
                  </a>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className={`teun-hamburger ${mobileMenuOpen ? 'open' : ''}`}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span></span><span></span><span></span>
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile overlay (tap to close) — BUITEN header voor correcte z-index */}
      <div
        className={`teun-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer — BUITEN header voor correcte z-index */}
      <div className={`teun-drawer ${mobileMenuOpen ? 'open' : ''}`} aria-hidden={!mobileMenuOpen}>
        <div className="section-title">{isEn ? 'Discover' : 'Ontdekken'}</div>
        {discoverTools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="indent">{tool.title}</Link>
        ))}
        <div className="section-title">{isEn ? 'Measure' : 'Meten'}</div>
        {measureTools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="indent">{tool.title}</Link>
        ))}
        <div className="section-title">{isEn ? 'Optimize' : 'Optimaliseren'}</div>
        {optimizeTools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="indent">{tool.title}</Link>
        ))}

        <div style={{ height: 16 }} />
        <Link href={isEn ? '/about-us' : '/over-ons'}>{isEn ? 'About us' : 'Over ons'}</Link>
        <Link href="/pricing">{isEn ? 'Pricing' : 'Prijzen'}</Link>
        <Link href="/blog">Blog</Link>

        <div style={{ height: 16 }} />
        {user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <button onClick={handleLogout} style={{ textAlign: 'left', width: '100%' }}>
              {isEn ? 'Logout' : 'Uitloggen'}
            </button>
          </>
        ) : (
          <>
            <Link href="/login">{isEn ? 'Login' : 'Inloggen'}</Link>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="teun-cta">
              {isEn ? 'Book a demo' : 'Plan een demo'} <span aria-hidden="true">→</span>
            </a>
          </>
        )}

        <div style={{ marginTop: 20 }}>
          <LanguageSwitcher variant="cream" />
        </div>
      </div>
    </>
  );
}

// ============================================
// FOOTER
// ============================================
function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const isEn = locale === 'en';
  const [currentYear, setCurrentYear] = useState(2026);
    useEffect(() => {
      setCurrentYear(new Date().getFullYear());
    }, []);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('idle');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || subscribeStatus === 'loading') return;
    setSubscribeStatus('loading');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setSubscribeStatus('success');
        setEmail('');
        setTimeout(() => setSubscribeStatus('idle'), 5000);
      } else {
        setSubscribeStatus('error');
        setTimeout(() => setSubscribeStatus('idle'), 5000);
      }
    } catch (_) {
      setSubscribeStatus('error');
      setTimeout(() => setSubscribeStatus('idle'), 5000);
    }
  };

  return (
    <>
      <style>{`
        .teun-footer {
          background: var(--navy-deep);
          color: rgba(255, 255, 255, 0.85);
          padding: 64px 0 32px;
          font-family: var(--font-poppins), sans-serif;
        }
        .teun-footer-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr;
          gap: 40px;
          padding-bottom: 48px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        @media (max-width: 960px) {
          .teun-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
        }
        @media (max-width: 600px) {
          .teun-footer-grid { grid-template-columns: 1fr; }
        }
        .teun-footer h3.col-title {
          font-family: var(--font-lora), serif;
          font-style: italic;
          font-size: 18px;
          color: var(--spark-soft);
          margin-bottom: 14px;
          font-weight: 400;
        }
        .teun-footer ul { list-style: none; padding: 0; margin: 0; }
        .teun-footer ul li { margin-bottom: 8px; }
        .teun-footer ul a {
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px; transition: color 0.15s;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .teun-footer ul a:hover { color: #fff; }
        .teun-footer ul a .new-tag {
          font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase;
          padding: 2px 6px; border-radius: 4px; background: var(--spark); color: #fff;
          font-weight: 600;
        }
        .teun-footer-brand p {
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px; line-height: 1.55;
          margin: 14px 0 12px; max-width: 320px;
        }
        .teun-footer-loc {
          font-family: var(--font-mono), monospace;
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 16px; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .teun-footer-loc::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%;
          background: var(--success);
        }
        .teun-footer-news {
          margin-top: 14px;
          display: flex; gap: 8px;
          width: 100%; max-width: 320px;
        }
        .teun-footer-news input {
          flex: 1 1 0; min-width: 0;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          color: #fff; font-family: inherit; font-size: 13px;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.15s;
        }
        .teun-footer-news input::placeholder { color: rgba(255, 255, 255, 0.4); }
        .teun-footer-news input:focus { border-color: var(--spark-soft); }
        .teun-footer-news button {
          background: var(--spark); color: #fff; border: none;
          padding: 0 14px; border-radius: 8px; font-size: 13px;
          font-weight: 600; cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .teun-footer-news button:hover { background: #d65530; }
        .teun-footer-news button:disabled { opacity: 0.65; cursor: default; }
        .teun-footer-news input:disabled { opacity: 0.65; }
        .teun-footer-news-msg {
          margin: 10px 0 0;
          font-size: 12px;
          line-height: 1.5;
          max-width: 320px;
        }
        .teun-footer-news-msg-success { color: var(--success); }
        .teun-footer-news-msg-error { color: var(--spark-soft); }
        .teun-footer-bottom {
          padding-top: 24px;
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 14px;
        }
        .teun-footer-bottom .copy {
          font-size: 12px; color: rgba(255, 255, 255, 0.45);
          display: inline-flex; align-items: center; gap: 8px;
          flex-wrap: wrap;
        }
        .teun-footer-bottom .copy-text {
          display: inline;
        }
        .teun-footer-bottom .copy a {
          color: rgba(255, 255, 255, 0.7);
          margin-left: 4px;
          white-space: nowrap;
        }
        .teun-footer-bottom .copy a:hover { color: #fff; }
        .teun-footer-bottom .links {
          display: flex; gap: 18px; align-items: center; flex-wrap: wrap;
        }
        .teun-footer-bottom .links a {
          font-size: 12px; color: rgba(255, 255, 255, 0.5);
        }
        .teun-footer-bottom .links a:hover { color: #fff; }
        .teun-footer-bottom .status {
          font-family: var(--font-mono), monospace;
          font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--success);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .teun-footer-bottom .status::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 8px var(--success);
          animation: footerPulse 2s infinite;
        }
        @keyframes footerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        .footer-spark-link {
          color: var(--spark-soft) !important;
          font-weight: 600;
        }
      `}</style>

      <footer className="teun-footer" aria-labelledby="footer-heading">
        <div className="max-w-[1240px] mx-auto px-7">
          <h2 id="footer-heading" className="sr-only">
            {isEn ? 'Footer' : 'Voettekst'}
          </h2>
          <div className="teun-footer-grid">
            {/* Brand + nieuwsbrief */}
            <div className="teun-footer-brand">
              <Link href="/" aria-label="teun.ai">
                <TeunLogo inverted size={24} />
              </Link>
              <p>
                {isEn
                  ? 'We make sure your brand gets seen in the AI search engines of tomorrow. Before it\'s too late.'
                  : 'We zorgen dat je merk wordt gezien in de AI-zoekmachines van morgen. Voor het te laat is.'}
              </p>
              <div className="teun-footer-loc">
                Amsterdam · {isEn ? 'since' : 'sinds'} 2024
              </div>
              <form className="teun-footer-news" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  placeholder="je@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={subscribeStatus === 'loading'}
                />
                <button type="submit" disabled={subscribeStatus === 'loading'}>
                  {subscribeStatus === 'loading'
                    ? (isEn ? 'Sending...' : 'Bezig...')
                    : (isEn ? 'Subscribe' : 'Abonneer')}
                </button>
              </form>
              {subscribeStatus === 'success' && (
                <p className="teun-footer-news-msg teun-footer-news-msg-success">
                  {isEn ? 'Thanks! Check your inbox.' : 'Bedankt! Check je inbox.'}
                </p>
              )}
              {subscribeStatus === 'error' && (
                <p className="teun-footer-news-msg teun-footer-news-msg-error">
                  {isEn ? 'Something went wrong. Try again.' : 'Er ging iets mis. Probeer het opnieuw.'}
                </p>
              )}
            </div>

            {/* Gratis tools */}
            <div>
              <h3 className="col-title">{isEn ? 'Free tools' : 'Gratis tools'}</h3>
              <ul>
                <li><Link href="/tools/ai-prompt-explorer">AI Prompt Explorer</Link></li>
                <li><Link href="/tools/ai-visibility">{isEn ? 'AI Visibility Scan' : 'AI Zichtbaarheid Scan'}</Link></li>
                <li><Link href="/tools/ai-rank-tracker">AI Rank Tracker</Link></li>
                <li><Link href="/tools/brand-check">AI Brand Check</Link></li>
                <li><Link href="/tools/geo-audit">GEO Audit</Link></li>
                <li><Link href="/tools/ai-prompt-discovery">AI Prompt Discovery</Link></li>
                <li>
                  <Link href="/tools" className="footer-spark-link">
                    {isEn ? 'View all tools →' : 'Alle tools bekijken →'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Bedrijf */}
            <div>
              <h3 className="col-title">{isEn ? 'Company' : 'Bedrijf'}</h3>
              <ul>
                <li><Link href={isEn ? '/about-us' : '/over-ons'}>{isEn ? 'About us' : 'Over ons'}</Link></li>
                <li><Link href="/pricing">{isEn ? 'Pricing' : 'Prijzen'}</Link></li>
                <li><Link href="/wordpress-plugin">{isEn ? 'WordPress Plugin' : 'WordPress Plugin'}</Link></li>
                <li><Link href="/chrome-extensie">{isEn ? 'Chrome Extension' : 'Chrome Extensie'}</Link></li>
                <li><Link href="/updates">Teun.ai updates</Link></li>
              </ul>
            </div>

            {/* Over GEO */}
            <div>
              <h3 className="col-title">{isEn ? 'About GEO' : 'Over GEO'}</h3>
              <ul>
                <li><Link href="/blog">Blog &amp; Insights</Link></li>
                {!isEn && (
                  <li><Link href="/geo-optimalisatie">GEO optimalisatie</Link></li>
                )}
              </ul>
            </div>

            {/* Zeg hallo */}
            <div>
              <h3 className="col-title">{isEn ? 'Say hello' : 'Zeg hallo'}</h3>
              <ul>
                <li>
                  <a href="mailto:hallo@teun.ai">hallo@teun.ai</a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/company/onlinelabs" target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="https://x.com/onlinelabs_nl" target="_blank" rel="noopener noreferrer">
                    X / Twitter
                  </a>
                </li>
                <li>
                  <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                    {isEn ? 'Book a demo' : 'Plan een demo'}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="teun-footer-bottom">
            <span className="copy">
              <svg width="16" height="12" viewBox="0 0 640 480" aria-label="Made in NL" style={{ borderRadius: 1, flexShrink: 0 }}>
                <rect width="640" height="160" fill="#AE1C28" />
                <rect y="160" width="640" height="160" fill="#FFF" />
                <rect y="320" width="640" height="160" fill="#21468B" />
              </svg>
             <span className="copy-text">
              © {currentYear} teun.ai · {isEn ? 'Made in Amsterdam by' : 'Gemaakt in Amsterdam door'}
              <a href="https://www.onlinelabs.nl" target="_blank" rel="noopener noreferrer">OnlineLabs</a>
            </span>
            </span>
            <div className="links">
              <Link href="/privacyverklaring">Privacy</Link>
              <Link href="/privacyverklaring">Cookies</Link>
              <span className="status">{isEn ? 'all systems online' : 'alle systemen online'}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// ============================================
// MAIN TEMPLATE
// ============================================
export default function Template({ children }) {
  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
