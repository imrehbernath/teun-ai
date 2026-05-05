// app/[locale]/tools/ai-rank-tracker/page.js
// AI Rank Tracker - Check je positie op ChatGPT + Perplexity + Google AI Mode
// Cream/Lora/spark editorial design (matches AI Visibility + Brand Check)
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import {
  Search, Trophy, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, AlertCircle,
  Sparkles, MapPin, Globe, Building2, Hash, ArrowRight, MessageSquareQuote,
  BarChart3, Check
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import ToolsCrossSell from '@/app/components/ToolsCrossSell';

// ====================================
// PLATFORM CONFIGURATIE — 3 platforms
// (kleuren in cream-theme: dot accents alleen, geen tinted card backgrounds)
// ====================================
function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\[(\d+)\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s)\]\,]+/g, '')
    .replace(/www\.[^\s)\]\,]+/g, '')
    .replace(/\([^)]*utm_source[^)]*\)/g, '')
    .replace(/\([^)]*\.[a-z]{2,}[^)]*\)/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const PLATFORMS = {
  chatgpt:    { name: 'ChatGPT',        dotColor: '#10B981' }, // success
  perplexity: { name: 'Perplexity',     dotColor: '#6366F1' }, // indigo accent
  google_ai:  { name: 'Google AI Mode', dotColor: '#3B82F6' }  // blue accent
};

// ====================================
// POSITIE BADGE — Lora italic in een gekleurde cirkel
// ====================================
function PositionBadge({ position, size = 'large' }) {
  const isLarge = size === 'large';
  const dim = isLarge ? 76 : 36;
  const fontSize = isLarge ? 32 : 15;

  if (position === null || position === undefined) {
    return (
      <span
        className="art-pos-badge art-pos-empty"
        style={{ width: dim, height: dim, fontSize }}
        aria-hidden="true"
      >—</span>
    );
  }

  let cls = 'art-pos-badge ';
  if (position === 1) cls += 'art-pos-gold';
  else if (position <= 3) cls += 'art-pos-top3';
  else if (position <= 5) cls += 'art-pos-top5';
  else if (position <= 10) cls += 'art-pos-top10';
  else cls += 'art-pos-far';

  return (
    <span className={cls} style={{ width: dim, height: dim, fontSize }}>
      <span className="art-pos-hash">#</span>{position}
    </span>
  );
}

// ====================================
// PLATFORM SCORECARD
// ====================================
function PlatformScoreCard({ platformKey, result, isLoading, t, locale }) {
  const [expanded, setExpanded] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const platform = PLATFORMS[platformKey];

  if (!platform) return null;

  if (isLoading) {
    return (
      <div className="art-platform-card art-platform-loading">
        <div className="art-platform-head">
          <span className="art-platform-dot art-platform-dot-pulse" style={{ background: platform.dotColor }} />
          <span className="art-platform-name">{platform.name}</span>
          <span className="art-platform-status-pill art-platform-status-loading">{t('scanning')}</span>
        </div>
        <div className="art-platform-body">
          <div className="art-pos-skeleton" />
          <div className="art-platform-meta">
            <div className="art-skeleton-line art-skeleton-line-w1" />
            <div className="art-skeleton-line art-skeleton-line-w2" />
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;
  const hasError = result.error;

  let statusPill;
  if (result.found) {
    statusPill = (
      <span className="art-platform-status-pill art-platform-status-found">
        #{result.position} {t('ofTotal')} {result.totalResults}
      </span>
    );
  } else if (!hasError && result.mentionedInText) {
    statusPill = (
      <span className="art-platform-status-pill art-platform-status-mentioned">
        {t('mentionedNotRanked')}
      </span>
    );
  } else if (!hasError) {
    statusPill = (
      <span className="art-platform-status-pill art-platform-status-missing">
        {t('notFound')}
      </span>
    );
  } else {
    statusPill = (
      <span className="art-platform-status-pill art-platform-status-error">
        {t('unavailable')}
      </span>
    );
  }

  return (
    <div className="art-platform-card">
      <div className="art-platform-head">
        <span className="art-platform-dot" style={{ background: platform.dotColor }} />
        <span className="art-platform-name">{platform.name}</span>
        {statusPill}
      </div>

      <div className="art-platform-body">
        <PositionBadge position={hasError ? null : result.position} />
        <div className="art-platform-meta">
          {result.found ? (
            <>
              <p className="art-platform-meta-title">{t('position')} #{result.position}</p>
              <p className="art-platform-meta-sub">
                {result.position === 1 ? t('firstChoice')
                  : result.position <= 3 ? t('top3')
                  : result.position <= 5 ? t('goodVisibility')
                  : t('improvementPossible')}
              </p>
            </>
          ) : hasError ? (
            <>
              <p className="art-platform-meta-title art-meta-muted">{t('scanFailed')}</p>
              <p className="art-platform-meta-sub">{result.errorMessage || t('tryAgainLater')}</p>
            </>
          ) : (
            <>
              <p className="art-platform-meta-title art-meta-muted">{t('notRanked')}</p>
              <p className="art-platform-meta-sub">
                {result.mentionedInText ? t('mentionedButNotRanked') : t('notMentionedByPlatform')}
              </p>
            </>
          )}
        </div>
      </div>

      {result.snippet && (
        <div className="art-snippet">
          <p className="art-snippet-label">
            <MessageSquareQuote className="w-3 h-3" /> {t('fragment')}
          </p>
          <p className="art-snippet-text">&ldquo;{result.snippet}&rdquo;</p>
        </div>
      )}

      <div className="art-platform-actions">
        {result.rankings?.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="art-toggle-btn">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? t('hide') : `${t('ranking')} (${result.totalResults})`}
          </button>
        )}
        {result.fullResponse && (
          <button onClick={() => setShowResponse(!showResponse)} className="art-toggle-btn">
            {showResponse ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showResponse ? t('hideResponse') : t('fullResponse')}
          </button>
        )}
      </div>

      {expanded && result.rankings?.length > 0 && (
        <div className="art-rank-list">
          {result.rankings.map((r, i) => (
            <div key={i} className={`art-rank-row${r.isTarget ? ' art-rank-row-self' : ''}`}>
              <span className="art-rank-pos">{r.position}</span>
              <span className="art-rank-name">{r.name}</span>
              {r.isTarget && (
                <span className="art-rank-self-tag">{t('yourBusiness')} <Check className="w-3 h-3" /></span>
              )}
            </div>
          ))}
        </div>
      )}

      {showResponse && result.fullResponse && (
        <div className="art-fullresp">
          <p className="art-fullresp-label">{t('fullAiResponse')}:</p>
          <div className="art-fullresp-text">{result.fullResponse}</div>
        </div>
      )}
    </div>
  );
}

// ====================================
// MAIN CONTENT
// ====================================
function RankTrackerContent() {
  const supabase = createClient();
  const t = useTranslations('rankTracker');
  const locale = useLocale();

  const [domain, setDomain] = useState('');
  const [brandName, setBrandName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState(null); // null | 'lite' | 'pro'
  const [duration, setDuration] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [faqCategory, setFaqCategory] = useState('all');

  const resultsRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_tier')
          .eq('id', currentUser.id)
          .single();
        if (['active', 'canceling'].includes(profile?.subscription_status)) {
          setIsPro(true);
          setSubscriptionTier(profile?.subscription_tier || 'pro');
        }
      }
    });
  }, []);

  // Determine which platforms have results (dynamic — handles missing google_ai gracefully)
  const activePlatforms = results
    ? Object.keys(PLATFORMS).filter(key => results[key])
    : Object.keys(PLATFORMS);

  async function handleScan(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setGeneratedPrompt('');
    setDuration(null);
    setScanProgress(0);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Animate progress smoothly over ~30s
    let progressInterval;
    const startProgress = () => {
      const startTime = Date.now();
      progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        // Smooth curve: fast start, slow end, reaches 92% at 30s
        const progress = Math.min(92, 100 * (1 - Math.exp(-elapsed / 10)));
        setScanProgress(Math.round(progress));
      }, 300);
    };
    startProgress();

    try {
      const response = await fetch('/api/ai-rank-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          brandName: brandName.trim(),
          keyword: keyword.trim(),
          serviceArea: serviceArea.trim() || null,
          userId: user?.id || null,
          locale
        })
      });

      clearInterval(progressInterval);
      setScanProgress(95);

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('somethingWentWrong'));
        return;
      }

      setScanProgress(100);
      setResults(data.results);
      setGeneratedPrompt(data.meta?.generatedPrompt || '');
      setDuration(data.meta?.duration);

    } catch (err) {
      clearInterval(progressInterval);
      setError(t('connectionError'));
    } finally {
      setLoading(false);
      setScanProgress(0);
    }
  }

  // Tier label voor footer
  const tierLabel = subscriptionTier === 'lite' ? 'Lite' : 'Pro';
  const tierKeywords = subscriptionTier === 'lite' ? '20' : '50';

  const formHint = isPro
    ? (locale === 'en'
        ? `${tierLabel} · ${tierKeywords} keywords automatic tracking`
        : `${tierLabel} · ${tierKeywords} keywords automatisch tracken`)
    : !user
      ? (locale === 'en' ? '2 free checks · Log in for 2 per week' : '2x gratis proberen · Log in voor 2x per week')
      : (locale === 'en' ? '2 per week manual · Lite/Pro: unlimited' : '2x per week handmatig · Lite/Pro: onbeperkt');

  return (
    <div className="tool-page art-page">
      <div className="tool-wrap art-wrap">

        {/* Hero */}
        <div className="tool-hero">
          <div className="tool-eyebrow">
            {locale === 'en' ? 'AI RANK TRACKER' : 'AI RANK TRACKER'}
          </div>
          <h1>
            {locale === 'en' ? (
              <>Track your <em>AI rankings</em></>
            ) : (
              <>Volg je <em>AI-rankings</em></>
            )}
          </h1>
          <p className="tool-hero-sub">{t('heroSubtitle')}</p>

          <div className="tool-trust-pills">
            {Object.entries(PLATFORMS).map(([key, p]) => (
              <span key={key} className="tool-trust-pill">
                <span className="pulse-dot" style={{ background: p.dotColor }} />
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="art-form">
          <form onSubmit={handleScan}>
            <div className="art-form-grid">
              <div className="art-input-row">
                <Globe className="art-input-icon" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={locale === 'en' ? 'Your website' : 'Jouw website'}
                  required
                  className="art-input"
                />
              </div>
              <div className="art-input-row">
                <Building2 className="art-input-icon" />
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={locale === 'en' ? 'Company name' : 'Je bedrijfsnaam'}
                  required
                  className="art-input"
                />
              </div>
              <div className="art-input-row">
                <Hash className="art-input-icon" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={locale === 'en' ? 'Your keyword' : 'Je zoekwoord'}
                  required
                  className="art-input"
                />
              </div>
              <div className="art-input-row">
                <MapPin className="art-input-icon" />
                <input
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder={locale === 'en' ? 'City (optional)' : 'Vestigingsplaats (optioneel)'}
                  className="art-input"
                />
              </div>
            </div>
          </form>

          <button onClick={handleScan} disabled={loading} className="teun-scan-btn art-submit">
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t('scanning')}</>
            ) : (
              <><Trophy className="w-5 h-5" /> {t('checkRanking')}</>
            )}
          </button>

          <p className="art-form-hint">
            {formHint} • ChatGPT + Perplexity + Google AI
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="tool-error art-error">
            <AlertCircle className="w-5 h-5 art-error-icon" />
            <div>
              <strong>{error}</strong>
              {error.includes('account') && (
                <Link href="/signup" className="art-error-link">
                  {t('createFreeAccount')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {user && (error.includes('week') || error.includes('Week') || error.includes('Pro')) && (
                <Link
                  href={locale === 'en' ? '/en/pricing' : '/pricing'}
                  className="art-error-link art-error-link-strong"
                >
                  {locale === 'en'
                    ? 'Upgrade to Lite or Pro for unlimited tracking'
                    : 'Upgrade naar Lite of Pro voor onbeperkt tracken'} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Scan progress */}
        {loading && (
          <div ref={resultsRef} className="art-scan">
            <div className="art-scan-head">
              <div>
                <p className="art-scan-title">
                  {locale === 'en'
                    ? <>Scanning <em>{brandName || 'your brand'}</em> on 3 AI platforms</>
                    : <><em>{brandName || 'je merk'}</em> scannen op 3 AI-platformen</>}
                </p>
                <div className="art-scan-platforms">
                  <span><span className="art-scan-pulse" /> ChatGPT</span>
                  <span><span className="art-scan-pulse" /> Perplexity</span>
                  <span><span className="art-scan-pulse" /> Google AI</span>
                </div>
              </div>
              <div className="art-scan-pct">{Math.round(scanProgress)}%</div>
            </div>
            <div className="art-progress-track">
              <div className="art-progress-fill" style={{ width: `${scanProgress}%` }} />
            </div>
            <div className="art-scan-steps">
              <span className={scanProgress >= 25 ? 'done' : ''}>ChatGPT {scanProgress >= 25 ? '✓' : ''}</span>
              <span className={scanProgress >= 50 ? 'done' : ''}>Perplexity {scanProgress >= 50 ? '✓' : ''}</span>
              <span className={scanProgress >= 75 ? 'done' : ''}>Google AI {scanProgress >= 75 ? '✓' : ''}</span>
            </div>

            <div className="art-platform-grid">
              {Object.keys(PLATFORMS).map(key => (
                <PlatformScoreCard key={key} platformKey={key} isLoading={true} t={t} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div ref={resultsRef} className="art-results">

            {/* Generated prompt card */}
            {generatedPrompt && (
              <div className="art-prompt-card">
                <div className="art-prompt-icon">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="art-prompt-body">
                  <p className="art-prompt-label">{t('generatedPrompt')}</p>
                  <p className="art-prompt-text">&ldquo;{generatedPrompt}&rdquo;</p>
                  <p className="art-prompt-hint">
                    {locale === 'en'
                      ? 'This prompt was sent to ChatGPT, Perplexity and Google AI Mode'
                      : 'Deze prompt is verstuurd naar ChatGPT, Perplexity en Google AI Mode'}
                  </p>
                </div>
              </div>
            )}

            {/* Platform cards */}
            <div className="art-platform-grid">
              {activePlatforms.map(key => (
                <PlatformScoreCard key={key} platformKey={key} result={results[key]} t={t} locale={locale} />
              ))}
            </div>

            {duration && (
              <p className="art-duration">
                {t('scanCompleted', { seconds: (duration / 1000).toFixed(1) })}
              </p>
            )}

            {/* Pro upsell / FOMO CTA */}
            {(() => {
              const platforms = ['chatgpt', 'perplexity', 'google_ai'];
              const foundOn = platforms.filter(p => results[p]?.found);
              const notFoundOn = platforms.filter(p => results[p] && !results[p]?.found && !results[p]?.error);
              const positions = foundOn.map(p => results[p].position).filter(Boolean);
              const bestPosition = positions.length > 0 ? Math.min(...positions) : null;

              const topCompetitor = (() => {
                for (const p of platforms) {
                  const rankings = results[p]?.rankings || [];
                  const first = rankings.find(r => !r.isTarget && r.position === 1);
                  if (first) return first.name;
                }
                return null;
              })();

              const competitorSet = new Set();
              platforms.forEach(p => {
                (results[p]?.rankings || []).forEach(r => {
                  if (!r.isTarget && r.name) competitorSet.add(r.name);
                });
              });

              const isInvisible = foundOn.length === 0;
              const isWeak = foundOn.length > 0 && bestPosition > 3;
              const platformNames = { chatgpt: 'ChatGPT', perplexity: 'Perplexity', google_ai: 'Google AI Mode' };

              const headline = isInvisible
                ? (locale === 'en'
                    ? <>AI does not recommend <em>{brandName || 'you'}</em> for &ldquo;{keyword}&rdquo;{topCompetitor ? <> &mdash; {topCompetitor} is #1</> : null}</>
                    : <>AI beveelt <em>{brandName || 'jou'}</em> niet aan voor &ldquo;{keyword}&rdquo;{topCompetitor ? <> &mdash; {topCompetitor} staat op #1</> : null}</>)
                : isWeak
                  ? (locale === 'en'
                      ? <>Position <em>#{bestPosition}</em> for &ldquo;{keyword}&rdquo;{topCompetitor ? <> &mdash; {topCompetitor} ranks above you</> : null}</>
                      : <>Positie <em>#{bestPosition}</em> voor &ldquo;{keyword}&rdquo;{topCompetitor ? <> &mdash; {topCompetitor} staat boven je</> : null}</>)
                  : (locale === 'en'
                      ? <>Top <em>{bestPosition}</em> for &ldquo;{keyword}&rdquo;{notFoundOn.length > 0 ? <> &mdash; but missing on {notFoundOn.map(p => platformNames[p]).join(' & ')}</> : null}</>
                      : <>Top <em>{bestPosition}</em> voor &ldquo;{keyword}&rdquo;{notFoundOn.length > 0 ? <> &mdash; maar niet zichtbaar op {notFoundOn.map(p => platformNames[p]).join(' & ')}</> : null}</>);

              const subline = isInvisible
                ? (locale === 'en'
                    ? `${competitorSet.size} competitors are being recommended. This is just 1 keyword. Track up to 50 keywords automatically with Pro.`
                    : `${competitorSet.size} concurrenten worden wél aanbevolen. Dit is slechts 1 zoekwoord. Track tot 50 keywords automatisch met Pro.`)
                : isWeak
                  ? (locale === 'en'
                      ? `${competitorSet.size} competitors rank higher. Track up to 50 keywords automatically with Pro.`
                      : `${competitorSet.size} concurrenten staan hoger. Track tot 50 keywords automatisch met Pro.`)
                  : (locale === 'en'
                      ? 'This is just 1 keyword. Track up to 50 keywords automatically with Pro.'
                      : 'Dit is slechts 1 zoekwoord. Track tot 50 keywords automatisch met Pro.');

              return (
                <div className="tool-account-cta art-cta">
                  <h3>{headline}</h3>
                  <p>{subline}</p>

                  {!user ? (
                    <>
                      <Link href="/signup" className="tool-account-cta-btn">
                        {locale === 'en' ? 'Create free account' : 'Gratis account aanmaken'}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <p className="small">
                        {locale === 'en' ? 'Free · 2 per week · No credit card' : 'Gratis · 2x per week · Geen creditcard'}
                      </p>
                      <Link
                        href={locale === 'en' ? '/en/pricing' : '/pricing'}
                        className="art-cta-link"
                      >
                        {locale === 'en' ? 'Or upgrade to Lite or Pro for unlimited' : 'Of upgrade naar Lite of Pro voor onbeperkt'} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </>
                  ) : isPro ? (
                    <Link href="/dashboard" className="tool-account-cta-btn">
                      {locale === 'en' ? 'Go to dashboard' : 'Ga naar dashboard'}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={locale === 'en' ? '/en/pricing' : '/pricing'}
                        className="tool-account-cta-btn"
                      >
                        {locale === 'en' ? 'Upgrade to Lite or Pro' : 'Upgrade naar Lite of Pro'}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <p className="small">
                        {locale === 'en'
                          ? 'From €29.95/mo · Automatic weekly tracking · Cancel anytime'
                          : 'Vanaf €29,95/mnd · Automatische wekelijkse tracking · Maandelijks opzegbaar'}
                      </p>
                    </>
                  )}
                </div>
              );
            })()}

            {/* ━━━ Other Tools ━━━ */}
            <ToolsCrossSell currentTool="ai-rank-tracker" locale={locale} />

            {/* Restart */}
            <div className="art-restart">
              <button onClick={() => { setResults(null); setGeneratedPrompt(''); setDuration(null); }}>
                {locale === 'en' ? '↺ Check another keyword' : '↺ Nog een zoekwoord checken'}
              </button>
            </div>
          </div>
        )}

        {/* User status */}
        {!loading && user && (
          <div className="art-userstatus">
            <p>
              {t('loggedInAs', { email: user.email })}
              {isPro ? (
                <span className={`art-tier-badge art-tier-${subscriptionTier === 'lite' ? 'lite' : 'pro'}`}>
                  {subscriptionTier === 'lite' ? 'LITE' : 'PRO'}
                </span>
              ) : (
                <>
                  {' · '}
                  <Link href={locale === 'en' ? '/en/pricing' : '/pricing'} className="art-userstatus-link">
                    {locale === 'en' ? 'Upgrade to Lite or Pro' : 'Upgrade naar Lite of Pro'}
                  </Link>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* ── SEO CONTENT ── */}
      {!results && !loading && (
        <>
          {/* Section 1 — Intro */}
          <section className="tool-seo-intro">
            <div className="tool-wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
              <h2>
                {locale === 'en'
                  ? <>Why <em>AI rankings</em> matter</>
                  : <>Waarom <em>AI-rankings</em> ertoe doen</>}
              </h2>
              <p>
                {locale === 'en'
                  ? 'More and more consumers ask ChatGPT, Perplexity and Google AI Mode for recommendations instead of Googling. Does your business rank when someone asks "best [your industry] in [your city]"? An AI Rank Tracker shows exactly where you stand in AI-generated answers, and which competitors are mentioned instead of you.'
                  : 'Steeds meer consumenten vragen ChatGPT, Perplexity en Google AI Mode om aanbevelingen in plaats van te Googelen. Staat jouw bedrijf in de ranking als iemand vraagt "beste [jouw branche] in [jouw stad]"? Een AI Rank Tracker laat precies zien waar je staat in AI-gegenereerde antwoorden, en welke concurrenten in plaats van jou worden genoemd.'}
              </p>
              <p>
                {locale === 'en'
                  ? 'This free GEO rank tracking tool checks your position on ChatGPT, Perplexity and Google AI Mode for any keyword. You see your exact ranking position, which competitors appear above you, and get actionable insights to improve your AI visibility. Track your AI search rankings and optimize your generative engine presence.'
                  : 'Deze gratis AI rank tracker checkt je positie op ChatGPT, Perplexity én Google AI Mode voor elk zoekwoord. Je ziet je exacte rankingpositie, welke concurrenten boven je staan, en krijgt concrete inzichten om je AI-zichtbaarheid te verbeteren. Monitor je AI-zoekposities en optimaliseer je aanwezigheid in generatieve zoekmachines.'}
              </p>
            </div>
          </section>

          {/* Section 2 — How it works */}
          <section className="tool-seo-how">
            <div className="tool-seo-how-wrap">
              <h2>
                {locale === 'en'
                  ? <>How does <em>AI ranking</em> work?</>
                  : <>Hoe werkt <em>AI-ranking</em>?</>}
              </h2>
              <p className="tool-seo-how-sub">
                {locale === 'en'
                  ? 'AI platforms rank businesses differently than Google. Understanding the factors is key to improving your position.'
                  : 'AI-platformen rangschikken bedrijven anders dan Google. De factoren begrijpen is essentieel voor een betere positie.'}
              </p>
              <div className="tool-seo-how-grid">
                {[
                  {
                    title: locale === 'en' ? 'Keyword analysis' : 'Zoekwoord analyse',
                    desc: locale === 'en'
                      ? 'We query ChatGPT, Perplexity and Google AI Mode with your exact keyword and location context.'
                      : 'We bevragen ChatGPT, Perplexity én Google AI Mode met je exacte zoekwoord en locatiecontext.'
                  },
                  {
                    title: locale === 'en' ? 'Position tracking' : 'Positie tracking',
                    desc: locale === 'en'
                      ? 'We detect exactly at which position your business appears in each AI-generated answer.'
                      : 'We detecteren precies op welke positie jouw bedrijf verschijnt in elk AI-antwoord.'
                  },
                  {
                    title: locale === 'en' ? 'Competitor insights' : 'Concurrentie inzichten',
                    desc: locale === 'en'
                      ? 'See which competitors rank above you and understand what makes AI recommend them.'
                      : 'Zie welke concurrenten boven je staan en begrijp waarom AI hen aanbeveelt.'
                  }
                ].map((item, i) => (
                  <div key={i} className="tool-seo-how-card">
                    <div className="tool-seo-how-card-head">
                      <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3 — Competitors are ranking */}
          {/* Final CTA — matcht homepage teun-final pattern */}
          <section className="teun-final" aria-labelledby="art-final-heading">
            <div className="wrap">
              <h2 id="art-final-heading">
                {locale === 'en' ? (
                  <>Stand in the <em>top</em>.<br />Not in the shadow.</>
                ) : (
                  <>Sta in de <em>top</em>.<br />Niet in de schaduw.</>
                )}
              </h2>
              <p>
                {locale === 'en'
                  ? 'Track up to 50 keywords automatically with Pro. See your position on ChatGPT, Perplexity and Google AI Mode every week. From €29.95/mo, cancel anytime.'
                  : 'Track tot 50 keywords automatisch met Pro. Zie wekelijks je positie op ChatGPT, Perplexity en Google AI Mode. Vanaf €29,95/mnd, maandelijks opzegbaar.'}
              </p>
              <div className="btns">
                <Link
                  href={locale === 'en' ? '/en/pricing' : '/pricing'}
                  className="btn-primary"
                >
                  {locale === 'en' ? 'View Lite & Pro' : 'Bekijk Lite & Pro'} <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href={user ? '/dashboard' : '/signup'}
                  className="btn-secondary"
                >
                  {user
                    ? (locale === 'en' ? 'Go to dashboard' : 'Ga naar dashboard')
                    : (locale === 'en' ? 'Create free account' : 'Gratis account aanmaken')}
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ — homepage teun-faq pattern */}
          {(() => {
            const faqItems = locale === 'en' ? [
              { cat: 'product', q: 'What is an AI Rank Tracker?', a: 'An AI Rank Tracker checks where your business appears in AI-generated answers on platforms like ChatGPT, Perplexity, and Google AI Mode. Unlike traditional SEO rankings, AI rankings are based on how AI models perceive your brand authority, reviews, and online presence.' },
              { cat: 'pricing', q: 'Is this a free rank tracking tool?', a: 'Yes, you can try 2 rank checks for free without an account. With a free account you get 2 manual checks per week. Upgrade to Lite for 20 keywords or Pro for 50 keywords automatic tracking.' },
              { cat: 'product', q: 'Which AI platforms do you track?', a: 'We track rankings on ChatGPT, Perplexity, and Google AI Mode, the three most important AI search platforms. All are queried live with your keyword and location context.' },
              { cat: 'technical', q: 'How can I improve my AI ranking?', a: 'AI rankings are influenced by your online reputation (Google Reviews, Trustpilot), content authority (blog posts, case studies), brand mentions on authoritative sites, and consistent business information (NAP data). Our GEO Audit tool analyzes your page-level optimization.' },
              { cat: 'technical', q: 'How is AI ranking different from Google ranking?', a: 'Google ranks web pages based on links and keywords. AI platforms like ChatGPT synthesize information from multiple sources to create a recommendation. Being mentioned positively across many sources matters more than having one well-optimized page.' }
            ] : [
              { cat: 'product', q: 'Wat is een AI Rank Tracker?', a: 'Een AI Rank Tracker checkt waar jouw bedrijf verschijnt in AI-gegenereerde antwoorden op platformen zoals ChatGPT, Perplexity en Google AI Mode. Anders dan traditionele SEO-rankings, zijn AI-rankings gebaseerd op hoe AI-modellen je merkautoriteit, reviews en online aanwezigheid interpreteren.' },
              { cat: 'pricing', q: 'Is dit een gratis rank tracking tool?', a: 'Ja, je kunt 2 rank checks gratis uitproberen zonder account. Met een gratis account krijg je 2 handmatige checks per week. Upgrade naar Lite voor 20 keywords of Pro voor 50 keywords automatische tracking.' },
              { cat: 'product', q: 'Welke AI-platformen worden getrackt?', a: 'We tracken rankings op ChatGPT, Perplexity én Google AI Mode, de drie belangrijkste AI-zoekplatformen. Alle drie worden live bevraagd met je zoekwoord en locatiecontext.' },
              { cat: 'technical', q: 'Hoe verbeter ik mijn AI-ranking?', a: 'AI-rankings worden beïnvloed door je online reputatie (Google Reviews, Trustpilot), content-autoriteit (blogposts, case studies), merkvermeldingen op gezaghebbende sites, en consistente bedrijfsgegevens (NAP-data). Onze GEO Audit tool analyseert je optimalisatie op paginaniveau.' },
              { cat: 'technical', q: 'Hoe verschilt AI-ranking van Google-ranking?', a: 'Google rangschikt webpagina\'s op basis van links en zoekwoorden. AI-platformen zoals ChatGPT combineren informatie uit meerdere bronnen tot een aanbeveling. Positief vermeld worden op veel bronnen is belangrijker dan één goed geoptimaliseerde pagina.' }
            ];

            const catLabels = locale === 'en'
              ? { all: 'All', product: 'Product', pricing: 'Pricing', technical: 'Technical' }
              : { all: 'Alles', product: 'Product', pricing: 'Prijzen', technical: 'Technisch' };

            const faqCounts = {
              all: faqItems.length,
              product: faqItems.filter(i => i.cat === 'product').length,
              pricing: faqItems.filter(i => i.cat === 'pricing').length,
              technical: faqItems.filter(i => i.cat === 'technical').length
            };

            const filteredFaq = faqCategory === 'all'
              ? faqItems
              : faqItems.filter(i => i.cat === faqCategory);

            return (
              <section className="teun-faq" id="faq" aria-labelledby="art-faq-heading">
                <div className="wrap">
                  <div className="teun-faq-head">
                    <div className="teun-faq-eyebrow">
                      {locale === 'en' ? 'QUESTIONS & ANSWERS' : 'VRAGEN & ANTWOORDEN'}
                    </div>
                    <h2 id="art-faq-heading">
                      {locale === 'en' ? (
                        <>Everything you want to know<br /><em>before you click.</em></>
                      ) : (
                        <>Alles wat je wilt weten<br /><em>voor je klikt.</em></>
                      )}
                    </h2>
                    <p className="sub">
                      {locale === 'en'
                        ? 'No bot answers, no marketing speak. Real explanations, written by our team.'
                        : 'Geen bot-antwoorden, geen marketingpraat. De echte uitleg, geschreven door ons team.'}
                    </p>
                  </div>

                  <div className="teun-faq-cats" role="tablist">
                    {[
                      { id: 'all', count: faqCounts.all },
                      { id: 'product', count: faqCounts.product },
                      { id: 'pricing', count: faqCounts.pricing },
                      { id: 'technical', count: faqCounts.technical }
                    ].map(({ id, count }) => (
                      <button
                        key={id}
                        className={faqCategory === id ? 'active' : ''}
                        onClick={() => { setFaqCategory(id); setOpenFaq(0); }}
                        role="tab"
                        aria-selected={faqCategory === id}
                      >
                        {catLabels[id]}
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
                        onToggle={(e) => { if (e.target.open) setOpenFaq(i); }}
                      >
                        <summary>
                          <span className="num">{String(i + 1).padStart(2, '0')}</span>
                          <h3 className="q">{item.q}</h3>
                          <span className="cat-chip">{catLabels[item.cat]}</span>
                          <span className="toggle" aria-hidden="true">
                            <svg viewBox="0 0 12 12" fill="none">
                              <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </span>
                        </summary>
                        <div className="answer-wrap">
                          <div className="answer">{item.a}</div>
                        </div>
                      </details>
                    ))}
                  </div>

                  {/* Help callout */}
                  <div className="teun-faq-help">
                    <div>
                      <h3>
                        {locale === 'en' ? (
                          <>Still got questions? <em>We&rsquo;re here.</em></>
                        ) : (
                          <>Nog vragen? <em>We helpen je.</em></>
                        )}
                      </h3>
                      <p>
                        {locale === 'en'
                          ? 'Reach us by email or book a 15-minute call. No sales pitch, just answers.'
                          : 'Stuur ons een mail of plan een gesprek van 15 minuten. Geen verkooppraat, gewoon antwoorden.'}
                      </p>
                    </div>
                    <div className="teun-faq-help-actions">
                      <a href="mailto:hallo@teun.ai" className="teun-faq-help-btn primary">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2 3h10v8H2z M2 3l5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        hallo@teun.ai
                      </a>
                      <a
                        href="https://calendly.com/imre-onlinelabs/teun-ai-demo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="teun-faq-help-btn secondary"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M2 6h10M5 1v3M9 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        {locale === 'en' ? 'Book a call' : 'Plan een gesprek'}
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}
        </>
      )}
    </div>
  );
}

export default function RankTrackerPage() {
  return (
    <Suspense fallback={
      <div className="tool-init">
        <div className="tool-init-spinner">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    }>
      <RankTrackerContent />
    </Suspense>
  );
}
