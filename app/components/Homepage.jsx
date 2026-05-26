'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { getGrowingStats } from '@/lib/stats';

// TODO: vervang met echte Calendly URL
const CALENDLY_URL = 'https://calendly.com/onlinelabs-amsterdam/teun-demo';

// ============================================
// HOMEPAGE COMPONENT — Teun.ai (i18n)
// Editorial cream redesign · April 2026
// ============================================

export default function Homepage() {
  const t = useTranslations('home');
  const locale = useLocale();
  const isEn = locale === 'en';
  const stats = getGrowingStats();

  const [formData, setFormData] = useState({
    bedrijfsnaam: '',
    website: '',
    branche: '',
    zoekwoorden: '',
    servicegebied: ''
  });
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showUrlWarning, setShowUrlWarning] = useState(false);
  const [extractingKeywords, setExtractingKeywords] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState(null);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [extractionAttempted, setExtractionAttempted] = useState(false);
  const [keywordTags, setKeywordTags] = useState([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [toolFilter, setToolFilter] = useState('all');
  const [openFaq, setOpenFaq] = useState(0);
  const [faqCategory, setFaqCategory] = useState('all');
  const [videoMounted, setVideoMounted] = useState(false);
  const [videoTheater, setVideoTheater] = useState(false);
  const lastExtractedUrl = useRef('');
  const videoRef = useRef(null);

  // === Live demo (Brand Check sneak-peek) ===
  const [demoBrand, setDemoBrand] = useState('Coolblue');
  const [demoChip, setDemoChip] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResults, setDemoResults] = useState(null); // {chatgpt: {response, mentioned}, perplexity: {...}}
  const [demoError, setDemoError] = useState('');
  const [demoUsed, setDemoUsed] = useState(false); // 1-scan-only limit per browser

  // Check localStorage on mount to see if user already used demo
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const used = localStorage.getItem('teun_demo_used');
      if (used === '1') setDemoUsed(true);
    } catch {}
  }, []);

  // Cream theme on body when homepage mounted
  useEffect(() => {
    document.body.classList.add('theme-cream');
    return () => document.body.classList.remove('theme-cream');
  }, []);

  // Lazy-load video after mount
  useEffect(() => {
    const timer = setTimeout(() => setVideoMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Theater mode: Escape to close, lock scroll
  useEffect(() => {
    if (!videoTheater) return;
    const handleKey = (e) => { if (e.key === 'Escape') setVideoTheater(false); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [videoTheater]);

  // Auto-extract keywords when URL looks like a real domain (debounced 800ms)
  useEffect(() => {
    const url = formData.website?.trim();
    const looksLikeDomain = url && /[a-z0-9]\.[a-z]{2,}/i.test(url);
    if (!looksLikeDomain || url === lastExtractedUrl.current || extractingKeywords) return;

    const timer = setTimeout(() => {
      lastExtractedUrl.current = url;
      handleExtractKeywords(url);
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.website]);

  const syncKeywordsToForm = (tags) => {
    setKeywordTags(tags);
    setFormData(prev => ({ ...prev, zoekwoorden: tags.join(', ') }));
  };

  const removeKeyword = (index) => {
    syncKeywordsToForm(keywordTags.filter((_, i) => i !== index));
  };

  const addKeyword = (keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed || keywordTags.includes(trimmed) || keywordTags.length >= 12) return;
    syncKeywordsToForm([...keywordTags, trimmed]);
  };

  const handleExtractKeywords = async (url) => {
    if (!url?.trim() || extractingKeywords) return;

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setExtractingKeywords(true);
    setExtractionMessage(null);
    setExtractionFailed(false);

    try {
      const response = await fetch('/api/extract-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          companyName: formData.bedrijfsnaam || '',
          category: formData.branche || ''
        })
      });

      const data = await response.json();

      if (!response.ok || data.blocked) {
        setExtractionMessage(t('form.extractionFailed'));
        setExtractionFailed(true);
        setExtractionAttempted(true);
        return;
      }

      if (data.keywords && data.keywords.length > 0) {
        syncKeywordsToForm(data.keywords);
        setFormData(prev => ({
          ...prev,
          bedrijfsnaam: prev.bedrijfsnaam || data.companyName || '',
          branche: prev.branche || data.category || '',
        }));
        setExtractionAttempted(true);
      } else {
        setExtractionFailed(true);
        setExtractionAttempted(true);
      }
    } catch (err) {
      console.error('Extract error:', err);
      setExtractionFailed(true);
      setExtractionAttempted(true);
    } finally {
      setExtractingKeywords(false);
    }
  };

  // === DEMO: live API call naar /api/brand-check ===
  const demoQueries = isEn
    ? [
        { label: 'best webshops electronics NL', queryType: 'experiences' },
        { label: 'best customer service online', queryType: 'reviews' },
        { label: 'buy laptop Netherlands', queryType: 'service' },
      ]
    : [
        { label: 'beste webshops elektronica NL', queryType: 'experiences' },
        { label: 'beste klantenservice online', queryType: 'reviews' },
        { label: 'laptop kopen Nederland', queryType: 'service' },
      ];

  const runDemo = async () => {
    const brand = demoBrand.trim();
    if (!brand || demoLoading || demoUsed) return;

    setDemoLoading(true);
    setDemoError('');
    setDemoResults(null);

    try {
      const response = await fetch('/api/brand-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brand,
          location: '',
          category: 'webshop',
          locale,
          queryType: demoQueries[demoChip].queryType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDemoError(data.error || (isEn ? 'Something went wrong' : 'Er ging iets mis'));
        return;
      }

      setDemoResults({
        chatgpt: data.chatgpt,
        perplexity: data.perplexity,
        prompt: data.prompt,
      });

      // Mark as used (1-scan-only limit per browser)
      try {
        localStorage.setItem('teun_demo_used', '1');
        localStorage.setItem('teun_demo_used_at', new Date().toISOString());
      } catch {}
      setDemoUsed(true);
    } catch (err) {
      console.error('Demo error:', err);
      setDemoError(isEn ? 'Connection error. Try again.' : 'Verbindingsfout. Probeer opnieuw.');
    } finally {
      setDemoLoading(false);
    }
  };

  // Truncate text to ~280 chars at sentence boundary
  const truncateText = (text, maxLen = 280) => {
    if (!text || text.length <= maxLen) return { text, truncated: false };
    // Find sentence boundary
    const cut = text.substring(0, maxLen);
    const lastDot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    const finalCut = lastDot > 150 ? text.substring(0, lastDot + 1) : cut + '…';
    return { text: finalCut, truncated: true };
  };

  // Highlight brand mentions in response text
  const highlightMentions = (text, brand) => {
    if (!text || !brand) return text;
    const parts = text.split(new RegExp(`(${brand.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === brand.toLowerCase()
        ? <mark key={i}>{part}</mark>
        : <span key={i}>{part}</span>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasUrl = formData.website && formData.website.trim().length > 0;

    if (!hasUrl) {
      setShowUrlWarning(true);
      return;
    }
    if (!formData.bedrijfsnaam || !formData.branche) return;
    if (extractingKeywords) return;
    if (extractionFailed && keywordTags.length < 3) return;

    proceedToScan();
  };

  const proceedToScan = () => {
    setShowUrlWarning(false);

    const params = new URLSearchParams();
    if (formData.bedrijfsnaam) params.set('company', formData.bedrijfsnaam);
    if (formData.branche) params.set('category', formData.branche);
    if (formData.website) params.set('website', formData.website);
    if (formData.zoekwoorden) params.set('keywords', formData.zoekwoorden);
    if (formData.servicegebied) params.set('location', formData.servicegebied);
    if (formData.bedrijfsnaam) params.set('autostart', 'true');

    window.location.href = `/tools/ai-visibility?${params.toString()}`;
  };

  // ============================================
  // TOOLS DATA — gebruikt i18n keys
  // ============================================
  const toolKeys = [
    { id: 'aiVisibility', cat: 'measure', href: '/tools/ai-visibility', badge1Class: 'hot' },
    { id: 'promptDiscovery', cat: 'discover', href: '/tools/ai-prompt-discovery', badge1Class: 'nieuw' },
    { id: 'rankTracker', cat: 'measure', href: '/tools/ai-rank-tracker', badge1Class: 'live' },
    { id: 'brandCheck', cat: 'measure', href: '/tools/brand-check', badge1Class: 'hot' },
    { id: 'geoAudit', cat: 'optimize', href: '/tools/geo-audit', badge1Class: 'checks' },
    { id: 'promptExplorer', cat: 'discover', href: '/tools/ai-prompt-explorer', badge1Class: 'beta' },
  ];

  const filteredTools = toolFilter === 'all' || toolFilter === 'pro'
    ? toolKeys
    : toolKeys.filter(tool => tool.cat === toolFilter);

  // ============================================
  // FAQ ITEMS — 9 vragen, 3 categorieën (matcht HTML)
  // ============================================
  const faqItems = [
    { cat: 'product', q: t('faq.q1'), aHtml: t.raw('faq.a1') },
    { cat: 'pricing', q: t('faq.q2'), aHtml: t.raw('faq.a2') },
    { cat: 'product', q: t('faq.q3'), aHtml: t.raw('faq.a3') },
    { cat: 'product', q: t('faq.q4'), aHtml: t.raw('faq.a4') },
    { cat: 'technical', q: t('faq.q5'), aHtml: t.raw('faq.a5') },
    { cat: 'technical', q: t('faq.q6'), aHtml: t.raw('faq.a6') },
    { cat: 'product', q: t('faq.q7'), aHtml: t.raw('faq.a7') },
    { cat: 'technical', q: t('faq.q8'), aHtml: t.raw('faq.a8') },
    { cat: 'pricing', q: t('faq.q9'), aHtml: t.raw('faq.a9') },
  ];

  const filteredFaq = faqCategory === 'all'
    ? faqItems
    : faqItems.filter(f => f.cat === faqCategory);

  // Counts per category for filter pills
  const faqCounts = {
    all: faqItems.length,
    product: faqItems.filter(f => f.cat === 'product').length,
    pricing: faqItems.filter(f => f.cat === 'pricing').length,
    technical: faqItems.filter(f => f.cat === 'technical').length,
  };

  return (
    <div className="teun-home">
      {/* ====================================================
          ALL HOMEPAGE STYLES
          ==================================================== */}
      {/* Styles in app/globals.css */}

      {/* ====================================================
          HERO
          ==================================================== */}
      <section className="teun-hero" aria-labelledby="hero-heading">
        <div className="wrap">
          <div className="teun-hero-grid">
            <div>
              <h1 id="hero-heading">
                {t('hero.title')}
                <br />
                {t('hero.titleLine2')}
                <br />
                <em className="hl">{t('hero.titleHighlight')}</em>
              </h1>

              <p className="teun-hero-sub">
                {t.rich('hero.subtitle', {
                  b: (chunks) => <b>{chunks}</b>,
                })}
              </p>

              {/* Mobile mascot */}
              <div className="teun-hero-mascot-mobile">
                <Image
                  src="/teun-mascot.png"
                  alt="Teun, AI-zichtbaarheidsassistent van teun.ai"
                  width={220}
                  height={280}
                  priority
                  fetchPriority="high"
                  style={{ width: '100%', height: 'auto' }}
                  sizes="(max-width: 768px) 220px, 0px"
                />
              </div>

              {/* SCAN FORM */}
              <form id="scan" onSubmit={handleSubmit} className="teun-scan-card">
                <div className="teun-scan-fields">
                  <div className="teun-scan-field">
                    <label>
                      {t('form.companyName')} <span className="req">{t('form.required')}</span>
                      <span
                        className="help"
                        onClick={() => setActiveTooltip(activeTooltip === 'company' ? null : 'company')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {activeTooltip === 'company' && (
                          <span className="help-tip">{t('form.companyTooltip')}</span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.bedrijfsnaam}
                      onChange={(e) => setFormData({ ...formData, bedrijfsnaam: e.target.value })}
                      placeholder={t('form.companyPlaceholder')}
                      required
                    />
                  </div>

                  <div className="teun-scan-field">
                    <label>
                      {t('form.industry')} <span className="req">{t('form.required')}</span>
                      <span
                        className="help"
                        onClick={() => setActiveTooltip(activeTooltip === 'industry' ? null : 'industry')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {activeTooltip === 'industry' && (
                          <span className="help-tip">{t('form.industryTooltip')}</span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.branche}
                      onChange={(e) => setFormData({ ...formData, branche: e.target.value })}
                      placeholder={t('form.industryPlaceholder')}
                      required
                    />
                  </div>

                  <div className="teun-scan-field">
                    <label>
                      {t('form.website')} <span className="req">{t('form.required')}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value.toLowerCase() })}
                      placeholder={t('form.websitePlaceholder')}
                      required
                    />
                  </div>
                </div>

                {/* Keyword panel */}
                {(keywordTags.length > 0 || extractingKeywords || extractionFailed) && (
                  <div className="teun-scan-keywords">
                    {extractionFailed && (
                      <div style={{
                        background: '#FFF4E6',
                        border: '1.5px solid #FFB66B',
                        borderRadius: 10,
                        padding: '12px 14px',
                        marginBottom: 14,
                        color: '#7A4A1A',
                        fontSize: 14,
                        lineHeight: 1.5
                      }}>
                        <strong>⚠️ {t('form.extractFailedTitle')}</strong>
                        <p style={{ margin: '6px 0 0 0' }}>{t('form.extractFailedHint')}</p>
                      </div>
                    )}

                    <div className="teun-scan-keywords-head">
                      <span>
                        {extractingKeywords
                          ? t('form.analyzing')
                          : extractionFailed && keywordTags.length < 3
                            ? t('form.minKeywordsCount', { count: keywordTags.length })
                            : t('form.keywordsCount', { count: keywordTags.length })}
                      </span>
                      {keywordTags.length > 0 && (
                        <button type="button" className="teun-kw-clear" onClick={() => syncKeywordsToForm([])}>
                          {t('form.clearAll')}
                        </button>
                      )}
                    </div>
                    {keywordTags.length > 0 && (
                      <div className="teun-scan-keywords-tags">
                        {keywordTags.map((kw, i) => (
                          <span key={i} className="teun-kw-tag">
                            {kw}
                            <button type="button" onClick={() => removeKeyword(i)} aria-label="Remove">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="teun-kw-input-row">
                      <input
                        type="text"
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newKeywordInput.trim()) {
                              addKeyword(newKeywordInput);
                              setNewKeywordInput('');
                            }
                          }
                        }}
                        placeholder={t('form.keywordPlaceholder')}
                        autoFocus={extractionFailed && keywordTags.length === 0}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newKeywordInput.trim()) {
                            addKeyword(newKeywordInput);
                            setNewKeywordInput('');
                          }
                        }}
                      >
                        {t('form.addKeyword')}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="teun-scan-btn"
                  disabled={extractingKeywords || (extractionFailed && keywordTags.length < 3)}
                >
                  {extractingKeywords
                    ? t('form.extracting')
                    : (extractionFailed && keywordTags.length < 3)
                      ? t('form.submitDisabledMin')
                      : t('form.submit')}
                </button>

                <p className="teun-scan-info">{t('form.submitInfo')}</p>

                <div className="teun-scan-footline">
                  <span className="pill">{t('form.freeToolPill')}</span>
                  <span className="sep">·</span>
                  <Link href="/pricing">{t('form.litePricing')}</Link>
                </div>

                <div className="teun-scan-advanced-wrap">
                  <Link href="/tools/ai-visibility" className="teun-scan-advanced">
                    {t('form.advancedOptions')}
                  </Link>
                </div>
              </form>
            </div>

            {/* Desktop mascot + float-cards */}
            <div className="teun-hero-visual">
              <div className="teun-mascot-wrap">
                <div className="teun-float-card c1">
                  <div className="head">
                    <span className="dot">G</span>
                    <span className="label">{t('hero.floatCard1Label')}</span>
                  </div>
                  <div className="val">✓ <b>{t('hero.floatCard1Value')}</b> · {t('hero.floatCard1Position')}</div>
                </div>
                <div className="teun-float-card c2">
                  <div className="head">
                    <span className="dot" style={{ background: 'var(--spark)' }}>★</span>
                    <span className="label">{t('hero.floatCard2Label')}</span>
                  </div>
                  <div className="val">72 / 100 <b>{t('hero.floatCard2Value')}</b></div>
                </div>
                <div className="teun-float-card c3">
                  <div className="head">
                    <span className="dot" style={{ background: 'var(--success)' }}>✓</span>
                    <span className="label">{t('hero.floatCard3Label')}</span>
                  </div>
                  <div className="val">14 / 20 <b>{t('hero.floatCard3Value')}</b></div>
                </div>
                <Image
                  src="/teun-mascot.png"
                  alt="Teun, the AI visibility assistant of teun.ai"
                  width={440}
                  height={440}
                  priority
                  fetchPriority="high"
                  className="teun-mascot"
                  sizes="(max-width: 960px) 0px, 440px"
                />
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="teun-stats">
            <div className="teun-stat">
              <span className="v"><em>{stats.scans}</em>+</span>
              <span className="l">{t('stats.scansLabel')}</span>
            </div>
            <div className="teun-stat">
              <span className="v">{stats.companies}</span>
              <span className="l">{t('stats.companiesLabel')}</span>
            </div>
            <div className="teun-stat">
              <span className="v">{t('stats.platformsCount')}</span>
              <span className="l">{t('stats.platformsLabel')}</span>
            </div>
            <div className="teun-stat">
              <span className="v"><em>{t('stats.freeLabel')}</em></span>
              <span className="l">{t('stats.freeDescription')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          TOOLS
          ==================================================== */}
      <section className="teun-tools-section" id="tools" aria-labelledby="tools-heading">
        <div className="wrap">
          <div className="teun-section-head">
            <div>
              <h2 id="tools-heading">
                {t('tools.heroTitle')}
                <br />
                {t('tools.heroSubline')} <em className="hl">{t('tools.heroTitleHighlight')}</em>
              </h2>
            </div>
            <p className="sub">{t('tools.subtitle')}</p>
          </div>

          <div className="teun-tool-filters" role="tablist">
            {['all', 'measure', 'discover', 'optimize', 'pro'].map((id) => (
              <button
                key={id}
                className={`pill ${toolFilter === id ? 'active' : ''}`}
                onClick={() => setToolFilter(id)}
              >
                {t(`tools.filters.${id}`)}
              </button>
            ))}
          </div>

          {toolFilter === 'pro' ? (
            <div className="teun-pro-showcase">
              <div className="teun-pro-grid">
                <div>
                  <div className="teun-pro-badge">
                    <span className="dot"></span>
                    Pro · {t('proShowcase.badge')}
                  </div>
                  <h3>
                    {t('proShowcase.title')}
                    <br />
                    <em>{t('proShowcase.titleHighlight')}</em>
                  </h3>
                  <p className="teun-pro-lede">{t('proShowcase.lede')}</p>
                  <ul className="teun-pro-features">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <li key={n}>
                        <span className="check">✓</span>
                        <span>
                          <b>{t(`proShowcase.feature${n}Title`)}</b> · {t(`proShowcase.feature${n}Desc`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="teun-pro-actions">
                    <Link href="/pricing" className="teun-pro-cta-primary">
                      {t('proShowcase.ctaPrimary')} <span aria-hidden="true">→</span>
                    </Link>
                    <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="teun-pro-cta-secondary">
                      {t('proShowcase.ctaSecondary')}
                    </a>
                  </div>
                  <div className="teun-pro-trust">
                    <span>{t('proShowcase.trust1')}</span>
                    <span className="sep">·</span>
                    <span>{t('proShowcase.trust2')}</span>
                    <span className="sep">·</span>
                    <span>{t('proShowcase.trust3')}</span>
                  </div>
                </div>

                <div className="teun-pro-mock">
                  <div className="teun-pro-mock-head">
                    <div className="dots"><span></span><span></span><span></span></div>
                    <div className="url">app.teun.ai/dashboard</div>
                  </div>
                  <div className="teun-pro-mock-body">
                    <div className="teun-pro-mock-row">
                      <div className="label">{t('proShowcase.mockTitle')}</div>
                      <div className="val">
                        14<span className="of">/20</span>
                        <span className="trend">+3</span>
                      </div>
                    </div>
                    <div className="teun-pro-bars">
                      <div className="teun-pro-bar">
                        <span className="l">ChatGPT</span>
                        <span className="track"><span className="fill" style={{ width: '80%', background: '#10a37f' }} /></span>
                        <span className="v">8/10</span>
                      </div>
                      <div className="teun-pro-bar">
                        <span className="l">Perplexity</span>
                        <span className="track"><span className="fill" style={{ width: '60%', background: '#20808d' }} /></span>
                        <span className="v">6/10</span>
                      </div>
                      <div className="teun-pro-bar">
                        <span className="l">Google AI</span>
                        <span className="track"><span className="fill" style={{ width: '40%', background: '#4285f4' }} /></span>
                        <span className="v">4/10</span>
                      </div>
                    </div>
                    <div className="teun-pro-tracked">
                      <div className="head">
                        <span className="l">{t('proShowcase.mockTrackedKeywords')}</span>
                        <span className="count">50</span>
                      </div>
                      <div className="tags">
                        <span className="tag">{isEn ? 'legal advice' : 'juridisch advies'} <b className="up">+2</b></span>
                        <span className="tag">{isEn ? 'employment law' : 'arbeidsrecht'} <b className="up">+1</b></span>
                        <span className="tag">contract review <b className="same">=</b></span>
                        <span className="tag">{isEn ? 'corporate law' : 'ondernemingsrecht'} <b className="down">-1</b></span>
                        <span className="tag">+46 {t('proShowcase.mockMore')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="teun-tool-grid">
                {filteredTools.map((tool) => (
                  <Link key={tool.href} href={tool.href} className="teun-tool">
                    <div className="teun-tool-head">
                      <span className={`teun-tag-badge ${tool.badge1Class}`}>
                        {t(`tools.items.${tool.id}.badge1`)}
                      </span>
                      <span className="teun-tag-badge gratis">
                        {t(`tools.items.${tool.id}.badge2`)}
                      </span>
                    </div>
                    <h3>{t(`tools.items.${tool.id}.title`)}</h3>
                    <p className="lede">{t(`tools.items.${tool.id}.lede`)}</p>
                    <p>{t(`tools.items.${tool.id}.body`)}</p>
                    <div className="teun-tool-foot">
                      <span className="mini-stat">{t(`tools.items.${tool.id}.stat`)}</span>
                      <span className="cta-link">
                        {t(`tools.items.${tool.id}.cta`)} <span className="arrow">→</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="teun-tool-cta">
                <Link href="/tools">
                  {t('tools.viewAll')} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ====================================================
          HOW IT WORKS
          ==================================================== */}
      <section className="teun-how" id="how" aria-labelledby="how-heading">
        <div className="wrap">
          <div className="teun-how-head">
            <h2 id="how-heading">
              {t('howItWorks.title')} <em className="hl">{t('howItWorks.titleHighlight')}</em> {t('howItWorks.titleEnd')}
            </h2>
            <p className="teun-how-sub">{t('howItWorks.subtitle')}</p>
          </div>

          <div className="teun-steps">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="teun-step">
                <div className="teun-step-head">
                  <span className="teun-step-num">{n}</span>
                  <h3 className="teun-step-title">{t(`howItWorks.step${n}Title`)}</h3>
                  <span className="teun-step-time">{t(`howItWorks.step${n}Time`)}</span>
                </div>
                <p>{t(`howItWorks.step${n}Text`)}</p>
                <div className="teun-step-visual">
                  {n === 1 && (
                    <>
                      <div><span className="pr">url:</span> <span className="v">"jouwwebsite.nl"</span></div>
                      <div><span className="pr">{isEn ? 'industry:' : 'branche:'}</span> <span className="v">auto-detected</span></div>
                      <div><span className="pr">→</span> {isEn ? 'keywords retrieved' : 'zoekwoorden opgehaald'}</div>
                    </>
                  )}
                  {n === 2 && (
                    <>
                      <div><span className="pr">prompts:</span> <span className="v">10 {isEn ? 'commercial' : 'commercieel'}</span></div>
                      <div><span className="pr">intent:</span> <span className="v">{isEn ? 'buying intent' : 'koopgericht'}</span></div>
                      <div><span className="pr">→</span> {isEn ? 'ready for scan' : 'klaar voor scan'}</div>
                    </>
                  )}
                  {n === 3 && (
                    <>
                      <div><span className="hl">✓</span> ChatGPT &nbsp;{isEn ? 'mentioned' : 'genoemd'} (3×)</div>
                      <div><span className="hl">✓</span> Perplexity &nbsp;{isEn ? 'mentioned' : 'genoemd'} (2×)</div>
                      <div><span className="mi">✗</span> Google AI {isEn ? 'not mentioned' : 'niet genoemd'}</div>
                    </>
                  )}
                  {n === 4 && (
                    <>
                      <div><span className="pr">{isEn ? 'mentions:' : 'vermeldingen:'}</span> <span className="v">14/20</span></div>
                      <div><span className="pr">share of voice:</span> <span className="hl">23%</span></div>
                      <div><span className="pr">{isEn ? 'competitors:' : 'concurrenten:'}</span> <span className="v">{isEn ? 'visible' : 'zichtbaar'}</span></div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          DEMO — Live AI Brand Check (sneak peek)
          ==================================================== */}
      <section className="teun-demo" aria-labelledby="demo-heading">
        <div className="wrap">
          <div className="teun-demo-head">
            <div className="teun-demo-kicker">{t('demo.kicker')}</div>
            <h2 id="demo-heading">
              {t('demo.titleStart')} <em>{t('demo.titleEm')}</em> {t('demo.titleEnd')}
            </h2>
            <p className="teun-demo-sub">{t('demo.subtitle')}</p>
          </div>

          <div className="teun-demo-stage">
            <div className="teun-demo-input">
              <label htmlFor="demo-brand-input">{t('demo.inputLabel')}</label>
              <input
                id="demo-brand-input"
                type="text"
                placeholder={t('demo.inputPlaceholder')}
                value={demoBrand}
                onChange={(e) => setDemoBrand(e.target.value)}
                disabled={demoLoading || demoUsed}
              />
              <div className="teun-demo-chips">
                <span className="mono">{t('demo.chipsLabel')}</span>
                <div className="teun-chips" role="radiogroup" aria-label={t('demo.chipsLabel')}>
                  {demoQueries.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={demoChip === i}
                      className={`teun-chip ${demoChip === i ? 'active' : ''}`}
                      onClick={() => setDemoChip(i)}
                      disabled={demoLoading || demoUsed}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
              {demoUsed ? (
                <Link
                  href="/signup"
                  className="teun-ask-btn teun-ask-btn-cta"
                >
                  <span>{t('demo.signupButton')}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="teun-ask-btn"
                  onClick={runDemo}
                  disabled={demoLoading || !demoBrand.trim()}
                >
                  <span>{demoLoading ? t('demo.askingButton') : t('demo.askButton')}</span>
                  <span aria-hidden="true">→</span>
                </button>
              )}
              <p className="teun-demo-disclaimer">
                {demoUsed
                  ? t('demo.usedNote')
                  : <>
                      {t('demo.disclaimerStart')}{' '}
                      <span className="teun-demo-mark">{t('demo.disclaimerMark')}</span>.
                    </>}
              </p>
            </div>

            <div className="teun-demo-output">
              {/* ChatGPT */}
              <article className={`teun-answer-card ${demoResults?.chatgpt?.mentioned ? 'active' : ''}`}>
                <header className="teun-answer-head">
                  <div className="teun-answer-ai">
                    <span className="ai-dot">
                      <Image src="/logo-chatgpt.svg" alt="" width={22} height={22} aria-hidden="true" unoptimized />
                    </span>
                    ChatGPT · GPT-5.5
                  </div>
                  <span className={`teun-answer-status ${demoResults?.chatgpt ? (demoResults.chatgpt.mentioned ? 'mentioned' : 'missing') : ''}`}>
                    {demoLoading
                      ? t('demo.statusLoading')
                      : demoResults?.chatgpt
                        ? (demoResults.chatgpt.mentioned ? t('demo.statusMentioned') : t('demo.statusMissing'))
                        : t('demo.statusWaiting')}
                  </span>
                </header>
                <div className="teun-answer-body">
                  {demoLoading ? (
                    <span className="teun-typing" aria-label={t('demo.statusLoading')}>
                      <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                    </span>
                  ) : demoResults?.chatgpt?.response ? (
                    <>
                      {highlightMentions(truncateText(demoResults.chatgpt.response).text, demoBrand)}
                      {truncateText(demoResults.chatgpt.response).truncated && (
                        <span className="teun-answer-fade"> </span>
                      )}
                    </>
                  ) : (
                    t('demo.placeholder')
                  )}
                </div>
              </article>

              {/* Perplexity */}
              <article className={`teun-answer-card ${demoResults?.perplexity?.mentioned ? 'active' : ''}`}>
                <header className="teun-answer-head">
                  <div className="teun-answer-ai">
                    <span className="ai-dot">
                      <Image src="/logo-perplexity.svg" alt="" width={22} height={22} aria-hidden="true" unoptimized />
                    </span>
                    Perplexity · Sonar
                  </div>
                  <span className={`teun-answer-status ${demoResults?.perplexity ? (demoResults.perplexity.mentioned ? 'mentioned' : 'missing') : ''}`}>
                    {demoLoading
                      ? t('demo.statusLoading')
                      : demoResults?.perplexity
                        ? (demoResults.perplexity.mentioned ? t('demo.statusMentioned') : t('demo.statusMissing'))
                        : t('demo.statusWaiting')}
                  </span>
                </header>
                <div className="teun-answer-body">
                  {demoLoading ? (
                    <span className="teun-typing" aria-label={t('demo.statusLoading')}>
                      <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                    </span>
                  ) : demoResults?.perplexity?.response ? (
                    <>
                      {highlightMentions(truncateText(demoResults.perplexity.response).text, demoBrand)}
                      {truncateText(demoResults.perplexity.response).truncated && (
                        <span className="teun-answer-fade"> </span>
                      )}
                    </>
                  ) : (
                    t('demo.placeholder')
                  )}
                </div>
              </article>

              {/* Google Reviews Reality Check — preview (echte feature in Brand Check tool) */}
              <article className="teun-answer-card preview">
                <header className="teun-answer-head">
                  <div className="teun-answer-ai">
                    <span className="ai-dot google-reviews-dot" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </span>
                    {t('demo.previewCardTitle')}
                  </div>
                  <span className="teun-answer-status preview-tag">
                    {t('demo.statusPreview')}
                  </span>
                </header>
                <div className="teun-answer-body">
                  {t('demo.previewText')}
                  <br />
                  <Link href="/tools/brand-check" className="teun-demo-upsell">
                    {t('demo.previewCta')} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>

              {demoError && (
                <div className="teun-demo-error" role="alert">
                  {demoError}
                </div>
              )}
            </div>
          </div>

          {demoResults && (
            <div className="teun-demo-cta">
              <div className="teun-demo-cta-text">
                <strong>{t('demo.afterCtaTitle')}</strong>
                <p>{t('demo.afterCta')}</p>
              </div>
              <div className="teun-demo-cta-actions">
                <Link href="/signup" className="teun-demo-cta-btn primary">
                  {t('demo.afterCtaButton')} <span aria-hidden="true">→</span>
                </Link>
                <Link href="/tools/brand-check" className="teun-demo-cta-btn secondary">
                  {t('demo.afterCtaSecondary')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ====================================================
          PLATFORMS + VIDEO
          ==================================================== */}
      <section className="teun-platforms" aria-labelledby="platforms-heading">
        <div className="wrap">
          <div className="teun-ph-eyebrow">{t('platforms.eyebrow')}</div>
          <h2 className="teun-ph-title" id="platforms-heading">
            {t('platforms.title')} <em className="hl">{t('platforms.titleHighlight')}</em>
          </h2>

          <div className="teun-scan-video">
            <div className="teun-scan-video-caption">
              <span className="dot"></span>
              {t('platforms.videoCaption')}
              <span style={{ opacity: 0.6 }}>· {t('platforms.videoSpeed')}</span>
            </div>
            <div
              className="teun-scan-video-shell"
              onClick={() => setVideoTheater(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setVideoTheater(true); }}
            >
              {videoMounted && (
                <video
                  ref={videoRef}
                  poster="/Teun.ai-AI-zichtbaarheidsanalyse-poster.webp"
                  preload="none"
                  playsInline
                  muted
                  loop
                >
                  <source src="/scan-demo.mp4" type="video/mp4" />
                </video>
              )}
              <button className="teun-scan-video-play" aria-label={t('platforms.videoPlay')}>
                <span className="teun-scan-video-play-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            </div>
          </div>

          <div className="teun-ph-scope">
            <div className="teun-ph-scope-item">
              <Image src="/logo-chatgpt.svg" alt="ChatGPT logo" width={32} height={32} className="teun-ph-logo" unoptimized />
              <div>
                <div className="name">ChatGPT</div>
                <div className="meta">{t('platforms.scope.chatgpt')}</div>
              </div>
            </div>
            <div className="teun-ph-scope-item">
              <Image src="/logo-perplexity.svg" alt="Perplexity logo" width={32} height={32} className="teun-ph-logo" unoptimized />
              <div>
                <div className="name">Perplexity</div>
                <div className="meta">{t('platforms.scope.perplexity')}</div>
              </div>
            </div>
            <div className="teun-ph-scope-item">
              <Image src="/logo-google-ai.svg" alt="Google AI Overview logo" width={32} height={32} className="teun-ph-logo" unoptimized />
              <div>
                <div className="name">Google AI Overview</div>
                <div className="meta">{t('platforms.scope.googleAiOverview')}</div>
              </div>
            </div>
            <div className="teun-ph-scope-item">
              <Image src="/logo-google-ai.svg" alt="Google AI Mode logo" width={32} height={32} className="teun-ph-logo" unoptimized />
              <div>
                <div className="name">{isEn ? 'Google AI Mode' : 'Google AI Modus'}</div>
                <div className="meta">{t('platforms.scope.googleAiMode')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          TESTIMONIAL
          ==================================================== */}
      <section className="teun-quote" aria-labelledby="quote-heading">
        <div className="wrap">
          <h2 id="quote-heading" className="sr-only">{t('quote.heading')}</h2>
          <span className="teun-quote-mark" aria-hidden="true">"</span>
          <blockquote className="teun-quote-body">
            {t('quote.bodyStart')} <span className="hl">{t('quote.bodyHighlight')}</span> {t('quote.bodyEnd')}
          </blockquote>
          <figcaption className="teun-quote-meta">
            <div className="teun-quote-avatar">
              <Image
                src="/enzo-van-bambost.webp"
                alt={t('quote.name')}
                width={48}
                height={48}
                loading="lazy"
                sizes="48px"
              />
            </div>
            <div>
              <div className="teun-quote-name">{t('quote.name')}</div>
              <div className="teun-quote-title">{t('quote.title')}</div>
            </div>
          </figcaption>
        </div>
      </section>

      {/* ====================================================
          FAQ — editorial 9 vragen, grid summary
          ==================================================== */}
      <section className="teun-faq" id="faq" aria-labelledby="faq-heading">
        <div className="wrap">
          <div className="teun-faq-head">
            <div className="teun-faq-eyebrow">{t('faq.eyebrow')}</div>
            <h2 id="faq-heading">
              {t('faq.title')}<br /><em>{t('faq.titleHighlight')}</em>
            </h2>
            <p className="sub">{t('faq.subtitle')}</p>
          </div>

          <div className="teun-faq-cats" role="tablist">
            {[
              { id: 'all', count: faqCounts.all },
              { id: 'product', count: faqCounts.product },
              { id: 'pricing', count: faqCounts.pricing },
              { id: 'technical', count: faqCounts.technical },
            ].map(({ id, count }) => (
              <button
                key={id}
                className={faqCategory === id ? 'active' : ''}
                onClick={() => setFaqCategory(id)}
                role="tab"
                aria-selected={faqCategory === id}
              >
                {t(`faq.categories.${id}`)}
                <span className="count">{count}</span>
              </button>
            ))}
          </div>

          <div className="teun-faq-list">
            {filteredFaq.map((item, i) => (
              <details
                key={`${faqCategory}-${i}`}
                className="teun-faq-item"
                open={openFaq === i}
                onToggle={(e) => {
                  if (e.target.open) setOpenFaq(i);
                }}
              >
                <summary>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="q">{item.q}</h3>
                  <span className="cat-chip">{t(`faq.categories.${item.cat}`)}</span>
                  <span className="toggle" aria-hidden="true">
                    <svg viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <div className="answer-wrap">
                  <div
                    className="answer"
                    dangerouslySetInnerHTML={{ __html: item.aHtml }}
                  />
                </div>
              </details>
            ))}
          </div>

          {/* Help callout */}
          <div className="teun-faq-help">
            <div>
              <h3>
                {t('faq.helpTitle')} <em>{t('faq.helpTitleEm')}</em>
              </h3>
              <p>{t('faq.helpText')}</p>
            </div>
            <div className="teun-faq-help-actions">
              <a href="mailto:hallo@teun.ai" className="teun-faq-help-btn primary">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 3h10v8H2z M2 3l5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                hallo@teun.ai
              </a>
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="teun-faq-help-btn secondary">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 6h10M5 1v3M9 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {t('faq.helpCta')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          FINAL CTA
          ==================================================== */}
      <section className="teun-final" aria-labelledby="final-heading">
        <div className="wrap">
          <h2 id="final-heading">
            {t('finalCta.titleStart')} <em>{t('finalCta.titleHighlight')}</em>
            <br />
            {t('finalCta.titleEnd')}
          </h2>
          <p>{t('finalCta.body')}</p>
          <div className="btns">
            <a href="#scan" className="btn-primary">
              {t('finalCta.ctaPrimary')} <span aria-hidden="true">→</span>
            </a>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              {t('finalCta.ctaSecondary')}
            </a>
          </div>
        </div>
      </section>

      {/* ====================================================
          THEATER MODE
          ==================================================== */}
      {videoTheater && (
        <div className="teun-theater" onClick={() => setVideoTheater(false)}>
          <button
            className="teun-theater-close"
            onClick={() => setVideoTheater(false)}
            aria-label="Close"
          >
            ✕
          </button>
          <video
            controls
            autoPlay
            playsInline
            poster="/Teun.ai-AI-zichtbaarheidsanalyse-poster.webp"
            onClick={(e) => e.stopPropagation()}
          >
            <source src="/scan-demo.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      {/* ====================================================
          URL WARNING MODAL
          ==================================================== */}
      {showUrlWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowUrlWarning(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUrlWarning(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <p className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
              {t('urlModal.title')}
            </p>
            <p className="mb-4" style={{ color: 'var(--ink-2)' }}>
              {t('urlModal.description')}
            </p>

            <div
              className="rounded-xl p-4 mb-6"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--navy)' }}>
                {t('urlModal.whatWeScan')}
              </p>
              <ul className="text-sm space-y-1" style={{ color: 'var(--ink-2)' }}>
                <li>• {t('urlModal.scanItem1')}</li>
                <li>• {t('urlModal.scanItem2')}</li>
                <li>• {t('urlModal.scanItem3')}</li>
                <li>• {t('urlModal.scanItem4')}</li>
              </ul>
            </div>

            <div className="mb-6">
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value.toLowerCase() })}
                placeholder={t('form.websitePlaceholder')}
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{
                  border: '2px solid var(--line)',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                }}
                autoFocus
              />
            </div>

            <div className="flex">
              <button
                onClick={() => {
                  if (formData.website && formData.website.trim()) proceedToScan();
                }}
                disabled={!formData.website || !formData.website.trim()}
                className="flex-1 px-4 py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--navy)', color: '#fff' }}
              >
                {t('urlModal.scanWithAnalysis')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
