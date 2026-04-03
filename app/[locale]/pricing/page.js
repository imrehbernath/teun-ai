'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, X, Minus, ArrowRight, Zap, BarChart3, Bell, FileText, Shield, Infinity, Crown, Sparkles, TrendingUp, Search } from 'lucide-react';
import { getGrowingStats } from '@/lib/stats';

export default function PricingPage() {
  const locale = useLocale();
  const isNL = locale === 'nl';
  const stats = getGrowingStats();
  const router = useRouter();
  const supabase = createClient();
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const monthlyPrice = 49.95;
  const annualPrice = 39.95;
  const price = annual ? annualPrice : monthlyPrice;

  // ✨ Live Stripe checkout
  async function handleProClick() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Niet ingelogd: redirect naar login met return URL
        router.push(`/signup?pro=1&redirect=${encodeURIComponent(isNL ? '/pricing' : '/en/pricing')}`);
        return;
      }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          plan: annual ? 'annual' : 'monthly',
          locale: locale,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Er ging iets mis. Probeer het opnieuw.');
      }
    } catch (err) {
      alert(isNL ? 'Verbindingsfout. Probeer het opnieuw.' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleNotifySubmit(e) {
    e.preventDefault();
    if (!notifyEmail) return;
    // Optioneel: sla email op in Supabase of Brevo
    try {
      await fetch('/api/notify-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail, plan: annual ? 'annual' : 'monthly' }),
      }).catch(() => {});
    } catch {}
    setNotifySubmitted(true);
  }

  const features = [
    {
      name: 'AI Visibility Scan',
      free: isNL ? '1x per dag' : '1x per day',
      pro: isNL ? 'Onbeperkt' : 'Unlimited',
      freeStatus: 'limited',
      proStatus: 'check',
    },
    {
      name: 'AI Prompt Explorer',
      free: isNL ? 'Beperkt' : 'Limited',
      pro: isNL ? 'Onbeperkt' : 'Unlimited',
      freeStatus: 'limited',
      proStatus: 'check',
    },
    {
      name: 'Brand Check',
      free: isNL ? '2x totaal' : '2x total',
      pro: isNL ? 'Onbeperkt' : 'Unlimited',
      freeStatus: 'limited',
      proStatus: 'check',
    },
    {
      name: 'AI Rank Tracker',
      free: isNL ? '2x per dag' : '2x per day',
      pro: isNL ? 'Onbeperkt' : 'Unlimited',
      freeStatus: 'limited',
      proStatus: 'check',
    },
    {
      name: 'GEO Audit',
      free: isNL ? '1x per dag' : '1x per day',
      pro: isNL ? 'Onbeperkt' : 'Unlimited',
      freeStatus: 'limited',
      proStatus: 'check',
    },
    {
      name: 'Chrome Extensie',
      free: isNL ? 'Inbegrepen' : 'Included',
      pro: isNL ? 'Inbegrepen' : 'Included',
      freeStatus: 'check',
      proStatus: 'check',
    },
    {
      name: 'AI Prompt Discovery',
      free: isNL ? 'Inbegrepen' : 'Included',
      pro: isNL ? 'Inbegrepen' : 'Included',
      freeStatus: 'check',
      proStatus: 'check',
    },
    {
      name: isNL ? 'Search Console integratie' : 'Search Console integration',
      free: null,
      pro: true,
      freeStatus: 'cross',
      proStatus: 'pro',
    },
    {
      name: isNL ? 'Onbeperkte scans alle tools' : 'Unlimited scans all tools',
      free: null,
      pro: true,
      freeStatus: 'cross',
      proStatus: 'pro',
    },
    {
      name: isNL ? 'GEO Optimalisatie DIY' : 'GEO Optimization DIY',
      free: null,
      pro: true,
      freeStatus: 'cross',
      proStatus: 'pro',
    },
    {
      name: isNL ? 'AI-advies per pagina' : 'AI advice per page',
      free: null,
      pro: true,
      freeStatus: 'cross',
      proStatus: 'pro',
    },
    {
      name: isNL ? 'Prioriteit support' : 'Priority support',
      free: null,
      pro: true,
      freeStatus: 'cross',
      proStatus: 'pro',
    },
  ];

  const competitors = [
    { name: 'Teun.ai Pro', price: '€49,95', platforms: '4+', prompts: isNL ? 'Onbeperkt' : 'Unlimited', websites: isNL ? 'Onbeperkt' : 'Unlimited', tools: isNL ? '6 gratis' : '6 free', audit: true, explorer: true, plugin: true, hl: true },
    { name: 'Profound', price: isNL ? 'Vanaf $99' : 'From $99', platforms: '1-3*', prompts: '50-100', websites: '1', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Peec.ai', price: isNL ? 'Vanaf €85' : 'From €85', platforms: '3 van 7*', prompts: '50-150', websites: '1-2', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Otterly.ai', price: isNL ? 'Vanaf $29' : 'From $29', platforms: '6', prompts: '10-100*', websites: '1', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Geoptie', price: isNL ? 'Vanaf $41' : 'From $41', platforms: isNL ? 'Alle' : 'All', prompts: '15-100', websites: '2-10', tools: isNL ? '7 gratis' : '7 free', audit: true, explorer: false, plugin: false },
    { name: 'Briljant.nl', price: isNL ? 'Vanaf €49' : 'From €49', platforms: '3', prompts: '100+', websites: '1', tools: isNL ? 'Geen' : 'None', audit: true, explorer: false, plugin: false },
    { name: 'SEMrush', price: '€140+', platforms: '3-4*', prompts: '25-200', websites: '1-5', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Ahrefs', price: '€99+', platforms: isNL ? 'Geen' : 'None', prompts: 'N/A', websites: '1-5', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
  ];

  const faqs = isNL ? [
    { q: 'Kan ik op elk moment opzeggen?', a: 'Ja. Geen contracten, geen opzegtermijn. Je houdt Pro toegang tot het einde van je betaalperiode.' },
    { q: 'Welke AI platforms worden gescand?', a: 'ChatGPT Search, Perplexity, Google AI Mode en Google AI Overviews. Alle platforms zijn inbegrepen, zonder extra kosten per platform.' },
    { q: 'Wat betekent \'onbeperkte scans\'?', a: 'Geen dagelijkse limieten, geen credits die opraken. Draai zoveel AI Visibility scans, Brand Checks, Rank Tracker checks en GEO Audits als je nodig hebt.' },
    { q: 'Is er een gratis proefperiode?', a: 'Alle 6 tools zijn gratis te gebruiken met dagelijkse limieten. Zo ervaar je precies wat Teun.ai kan voordat je upgradet naar Pro.' },
    { q: 'Wat maakt Teun.ai anders dan Otterly, Profound of Peec?', a: 'Teun.ai biedt 6 gratis tools, onbeperkte websites, en je kunt echt zelf GEO-optimaliseren met advies per pagina. Plus een WordPress plugin en Chrome extensie. Otterly.ai kost vanaf $29/mnd voor slechts 10 prompts zonder gratis tools. Profound start bij $99/mnd voor alleen ChatGPT. Peec.ai vanaf €85/mnd voor max 3 van 7 platformen.' },
  ] : [
    { q: 'Can I cancel at any time?', a: 'Yes. No contracts, no notice period. You keep Pro access until the end of your billing period.' },
    { q: 'Which AI platforms are scanned?', a: 'ChatGPT Search, Perplexity, Google AI Mode and Google AI Overviews. All platforms included, no extra costs per platform.' },
    { q: 'What does \'unlimited scans\' mean?', a: 'No daily limits, no credits running out. Run as many AI Visibility scans, Brand Checks, Rank Tracker checks and GEO Audits as you need.' },
    { q: 'Is there a free trial?', a: 'All 6 tools are free to use with daily limits. Experience exactly what Teun.ai can do before upgrading to Pro.' },
    { q: 'What makes Teun.ai different from Otterly, Profound or Peec?', a: 'Teun.ai offers 6 free tools, unlimited websites, and you can actually optimize for GEO yourself with per-page advice. Plus a WordPress plugin and Chrome extension. Otterly.ai starts at $29/mo for just 10 prompts with no free tools. Profound starts at $99/mo for ChatGPT only. Peec.ai starts at €85/mo for max 3 of 7 platforms.' },
  ];

  const platforms = [
    { name: 'ChatGPT Search', active: true },
    { name: 'Perplexity', active: true },
    { name: 'Google AI Mode', active: true },
    { name: 'Google AI Overviews', active: true },
    { name: isNL ? 'Gemini (binnenkort)' : 'Gemini (coming soon)', active: false },
    { name: isNL ? 'Claude (binnenkort)' : 'Claude (coming soon)', active: false },
  ];

  function StatusIcon({ status }) {
    if (status === 'check') return <Check className="w-4 h-4 text-green-500" />;
    if (status === 'cross') return <X className="w-4 h-4 text-slate-300" />;
    if (status === 'limited') return <Minus className="w-4 h-4 text-amber-500" />;
    if (status === 'pro') return (
      <span className="inline-flex items-center gap-1">
        <Check className="w-4 h-4 text-green-500" />
        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">PRO</span>
      </span>
    );
    return null;
  }

  return (
    <div className="bg-white">

      {/* ====== COMING SOON NOTIFICATION ====== */}
      {showNotify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => { setShowNotify(false); setNotifySubmitted(false); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none text-xl"
            >
              ✕
            </button>

            {!notifySubmitted ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {isNL ? 'Pro komt eraan!' : 'Pro is coming!'}
                    </h3>
                  </div>
                </div>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  {isNL
                    ? 'We leggen de laatste hand aan Teun.ai Pro. Laat je e-mail achter en wij laten je als eerste weten wanneer het beschikbaar is.'
                    : 'We\'re putting the finishing touches on Teun.ai Pro. Leave your email and we\'ll let you know first when it\'s available.'}
                </p>
                <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder={isNL ? 'je@email.nl' : 'you@email.com'}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer border-none whitespace-nowrap"
                  >
                    {isNL ? 'Houd mij op de hoogte' : 'Notify me'}
                  </button>
                </form>
                <p className="text-xs text-slate-400 mt-3">
                  {isNL ? 'Geen spam, alleen een melding bij lancering.' : 'No spam, just a notification at launch.'}
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {isNL ? 'Je staat op de lijst!' : 'You\'re on the list!'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {isNL
                    ? 'We sturen je een e-mail zodra Teun.ai Pro beschikbaar is.'
                    : 'We\'ll email you as soon as Teun.ai Pro is available.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== HERO ====== */}
      <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 pt-16 lg:pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 shadow-sm mb-6">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            Pricing
          </div>

          <h1 className="text-[1.7rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-tight mb-6">
            {isNL ? (
              <>De tools zijn gratis.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">De voorsprong is Pro.</span></>
            ) : (
              <>The tools are free.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">The advantage is Pro.</span></>
            )}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-xl mx-auto">
            {isNL
              ? '6 gratis AI-zichtbaarheid tools. Upgrade naar Pro voor GEO Optimalisatie DIY en onbeperkt gebruik van alle tools.'
              : '6 free AI visibility tools. Upgrade to Pro for GEO Optimization DIY and unlimited use of all tools.'}
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {isNL ? 'Maandelijks' : 'Monthly'}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${annual ? 'bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {isNL ? 'Jaarlijks' : 'Annually'}
              <span className="ml-1.5 text-xs text-green-600 font-semibold">-20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ====== STATS BAR ====== */}
      <section className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center items-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.scans}</div>
              <div className="text-sm text-white/70">{isNL ? 'AI scans uitgevoerd' : 'AI scans completed'}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.companies}</div>
              <div className="text-sm text-white/70">{isNL ? 'Bedrijven aangesloten' : 'Businesses connected'}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">6</div>
              <div className="text-sm text-white/70">{isNL ? 'Gratis tools' : 'Free tools'}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-1">€{price.toFixed(2).replace('.', ',')}</div>
              <div className="text-sm text-white/70">{isNL ? 'Alles onbeperkt' : 'Everything unlimited'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== PRICING CARDS ====== */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">

            {/* FREE CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {isNL ? 'Gratis' : 'Free'}
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-bold text-slate-900">€0</span>
                <span className="text-slate-400 text-sm">/{isNL ? 'maand' : 'month'}</span>
              </div>
              <p className="text-slate-500 text-sm mb-8">
                {isNL
                  ? 'Ontdek je AI zichtbaarheid met dagelijkse limieten op alle 6 tools.'
                  : 'Discover your AI visibility with daily limits on all 6 tools.'}
              </p>

              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:shadow-md hover:border-slate-300 transition-all mb-8"
              >
                {isNL ? 'Gratis starten' : 'Start free'}
              </Link>

              <div className="space-y-0">
                {features.map((f, i) => (
                  <div key={i} className={`flex items-center gap-3 py-3 ${i < features.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <StatusIcon status={f.freeStatus} />
                    <span className={`flex-1 text-sm ${f.freeStatus === 'cross' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {f.name}
                    </span>
                    {f.free && f.freeStatus === 'limited' && (
                      <span className="text-xs text-amber-600 font-medium">{f.free}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PRO CARD */}
            <div className="relative bg-white rounded-2xl border-2 border-blue-500 p-8 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/15 transition-all">
              {/* Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg">
                  <Sparkles className="w-3 h-3" />
                  {isNL ? 'Meest gekozen' : 'Most popular'}
                </span>
              </div>

              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 mt-1">Pro</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-bold text-slate-900">€{price.toFixed(2).replace('.', ',')}</span>
                <span className="text-slate-400 text-sm">/{isNL ? 'maand' : 'month'}</span>
              </div>
              {annual && (
                <p className="text-sm text-slate-400 mb-2">
                  <span className="line-through">€49,95/{isNL ? 'mnd' : 'mo'}</span>
                  <span className="text-green-600 font-semibold ml-2">{isNL ? 'Bespaar €120/jaar' : 'Save €120/year'}</span>
                </p>
              )}
              <p className="text-slate-500 text-sm mb-8">
                {isNL
                  ? 'GEO Optimalisatie DIY: optimaliseer je pagina\'s zelf en gebruik alle tools onbeperkt.'
                  : 'GEO Optimization DIY: optimize your pages yourself and use all tools unlimited.'}
              </p>

              <button
                onClick={handleProClick}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold text-base hover:shadow-lg hover:scale-[1.01] transition-all mb-2 cursor-pointer disabled:opacity-60"
              >
                <Zap className="w-4 h-4" />
                {loading ? (isNL ? 'Laden...' : 'Loading...') : (isNL ? 'Start met Pro' : 'Start with Pro')}
              </button>
              <p className="text-center text-xs text-slate-400 mb-8">
                {isNL ? 'Maandelijks opzegbaar, geen verborgen kosten' : 'Cancel anytime, no hidden costs'}
              </p>

              <div className="space-y-0">
                {features.map((f, i) => (
                  <div key={i} className={`flex items-center gap-3 py-3 ${i < features.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <StatusIcon status={f.proStatus} />
                    <span className="flex-1 text-sm text-slate-700 font-medium">
                      {f.name}
                    </span>
                    {typeof f.pro === 'string' && (
                      <span className="text-xs text-green-600 font-semibold">{f.pro}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== BLURRED DASHBOARD PREVIEW ====== */}
      <section className="py-20 bg-slate-100">
        <style>{`
          @keyframes bar-grow {
            from { transform: scaleY(0); }
            to { transform: scaleY(1); }
          }
          .pricing-bar-animate {
            transform-origin: bottom;
            animation: bar-grow 0.8s ease-out forwards;
          }
          @keyframes dash-float-pricing {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          @media (min-width: 1024px) {
            .dash-float-pricing { animation: dash-float-pricing 6s ease-in-out infinite; }
          }
          @media (prefers-reduced-motion: reduce) {
            .pricing-bar-animate { animation: none; transform: scaleY(1); }
            .dash-float-pricing { animation: none !important; }
          }
        `}</style>

        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {isNL ? (
                <>Dit zie je als <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Pro gebruiker</span></>
              ) : (
                <>This is what <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Pro users</span> see</>
              )}
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              {isNL
                ? 'GEO Optimalisatie DIY met Search Console integratie en AI-advies per pagina.'
                : 'GEO Optimization DIY with Search Console integration and AI advice per page.'}
            </p>
          </div>

          <div className="relative">
            {/* Animated Dashboard Panel */}
            <div
              className="dash-float-pricing relative rounded-2xl overflow-hidden z-20"
              style={{
                backgroundColor: '#f8fafd',
                border: '1px solid #e2e8f0',
                boxShadow: '0 25px 80px rgba(55, 110, 181, 0.12), 0 10px 30px rgba(55, 110, 181, 0.08)'
              }}
            >
              {/* Dashboard Header */}
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: '#376eb5' }}>teun.ai</span>
                  <span className="text-xs text-gray-500 hidden sm:inline">AI Visibility Dashboard</span>
                </div>
                <div className="flex gap-1.5">
                  {['ChatGPT', 'Perplexity', 'Google AI'].map((platform, i) => (
                    <span
                      key={platform}
                      className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: i === 0 ? '#376eb5' : 'transparent',
                        color: i === 0 ? '#fff' : '#64748b',
                        border: i === 0 ? 'none' : '1px solid #e2e8f0'
                      }}
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              {/* Score Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 sm:px-5 py-4">
                {[
                  { label: 'Visibility', value: '73%', color: '#376eb5', sub: isNL ? '+12% deze maand' : '+12% this month', subColor: '#376eb5' },
                  { label: 'ChatGPT', value: '8/10', color: '#376eb5', sub: isNL ? 'gevonden' : 'found', subColor: '#64748b' },
                  { label: 'Perplexity', value: '6/10', color: '#376eb5', sub: isNL ? 'gevonden' : 'found', subColor: '#64748b' },
                  { label: 'Threats', value: '3', color: '#b45309', sub: isNL ? 'concurrenten' : 'competitors', subColor: '#b45309' },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl p-2 sm:p-3 text-center overflow-hidden"
                    style={{ backgroundColor: '#fff', border: '1px solid #eef2f7' }}
                  >
                    <div className="text-[8px] sm:text-[9px] uppercase tracking-wide font-semibold text-gray-500 truncate">
                      {card.label}
                    </div>
                    <div
                      className="text-xl sm:text-2xl font-bold my-0.5"
                      style={{ color: card.color }}
                    >
                      {card.value}
                    </div>
                    <div className="text-[8px] sm:text-[9px] truncate" style={{ color: card.subColor }}>
                      {card.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bar Chart */}
              <div className="px-5 pb-5">
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#fff', border: '1px solid #eef2f7' }}
                >
                  <div className="flex items-end gap-1.5 h-16">
                    {[65, 40, 82, 55, 28, 50, 88, 35, 72, 60, 45, 78].map((height, i) => {
                      const colors = ['#1abc9c', '#1abc9c', '#376eb5', '#4A8FDB', '#f59e0b', '#1abc9c', '#376eb5', '#1abc9c', '#4A8FDB', '#1abc9c', '#f59e0b', '#376eb5'];
                      return (
                        <div
                          key={i}
                          className="pricing-bar-animate flex-1 rounded-t"
                          style={{
                            height: `${height}%`,
                            backgroundColor: colors[i],
                            opacity: (i % 3 === 1) ? 0.45 : 0.75,
                            animationDelay: `${0.6 + i * 0.08}s`
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Platform legend */}
                  <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid #eef2f7' }}>
                    {[
                      { label: 'ChatGPT', color: '#376eb5' },
                      { label: 'Perplexity', color: '#1abc9c' },
                      { label: 'Google AI', color: '#b45309' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] text-gray-500">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Teun mascotte - rechtsonder */}
            <div className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 z-30 pointer-events-none select-none">
              <Image
                src="/teun-ai-mascotte.png"
                alt="Teun AI mascotte"
                width={150}
                height={150}
                className="drop-shadow-2xl w-auto h-[80px] sm:h-[110px] lg:h-[140px] object-contain"
              />
            </div>

            {/* Floating gradient accents */}
            <div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl z-10 opacity-50"
              style={{ background: 'linear-gradient(135deg, #4A8FDB 0%, #376eb5 100%)' }}
            />
            <div
              className="absolute -bottom-4 -left-4 w-32 h-20 rounded-2xl z-10 opacity-40"
              style={{ background: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)' }}
            />

            {/* Blur overlay */}
            <div className="absolute inset-0 rounded-2xl z-[25] bg-gradient-to-b from-transparent via-white/70 to-white flex flex-col items-center justify-end pb-10">
              <p className="text-xl font-bold text-slate-900 mb-4">
                {isNL ? 'Unlock je volledige AI dashboard' : 'Unlock your full AI dashboard'}
              </p>
              <button onClick={handleProClick} disabled={loading} className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-60">
                <Zap className="w-4 h-4" />
                {loading ? (isNL ? 'Laden...' : 'Loading...') : (isNL ? `Upgrade naar Pro, €${price.toFixed(2).replace('.', ',')}/mnd` : `Upgrade to Pro, €${price.toFixed(2).replace('.', ',')}/mo`)}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ====== PLATFORMS ====== */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            {isNL ? (
              <>Alle platforms <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">inbegrepen</span></>
            ) : (
              <>All platforms <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">included</span></>
            )}
          </h2>
          <p className="text-slate-600 mb-10 max-w-xl mx-auto">
            {isNL
              ? 'Geen extra kosten per platform. Scan op alle grote AI zoekmachines.'
              : 'No extra costs per platform. Scan on all major AI search engines.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {platforms.map((p, i) => (
              <span key={i} className={`px-4 py-2 rounded-full text-sm font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====== COMPETITOR COMPARISON ====== */}
      <section className="py-20 bg-gradient-to-br from-slate-100 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 shadow-sm mb-6">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              {isNL ? 'Vergelijking' : 'Comparison'}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {isNL ? 'Waarom €400+ betalen?' : 'Why pay €400+?'}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              {isNL
                ? 'Vergelijk Teun.ai met AI visibility tools en traditionele SEO platforms.'
                : 'Compare Teun.ai with AI visibility tools and traditional SEO platforms.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Tool</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">{isNL ? 'Prijs /mnd' : 'Price /mo'}</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">AI Platforms</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Prompts</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Websites</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">{isNL ? 'Gratis tools' : 'Free tools'}</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">GEO Audit</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Prompt Explorer</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">WP Plugin</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${c.hl ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                      <td className={`px-5 py-4 font-semibold whitespace-nowrap ${c.hl ? 'text-blue-700' : 'text-slate-900'}`}>
                        {c.name}
                      </td>
                      <td className={`px-4 py-4 text-center font-bold whitespace-nowrap ${c.hl ? 'text-blue-700 text-base' : 'text-slate-700'}`}>
                        {c.price}
                      </td>
                      <td className={`px-4 py-4 text-center ${c.platforms === 'Geen' || c.platforms === 'None' ? 'text-red-400' : c.hl ? 'text-blue-700 font-semibold' : 'text-slate-600'}`}>
                        {c.platforms}
                      </td>
                      <td className={`px-4 py-4 text-center ${c.prompts === 'Onbeperkt' || c.prompts === 'Unlimited' ? 'text-green-600 font-semibold' : c.prompts === 'N/A' ? 'text-red-400' : 'text-slate-600'}`}>
                        {c.prompts}
                      </td>
                      <td className={`px-4 py-4 text-center ${c.websites === 'Onbeperkt' || c.websites === 'Unlimited' ? 'text-green-600 font-semibold' : 'text-slate-600'}`}>
                        {c.websites}
                      </td>
                      <td className={`px-4 py-4 text-center ${c.tools.includes('gratis') || c.tools.includes('free') ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>
                        {c.tools}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {c.audit ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {c.explorer ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {c.plugin ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-slate-400 text-xs mt-4 max-w-3xl mx-auto">
            {isNL
              ? '* Peec.ai: kies 3 van 7 modellen, extra modellen via hogere tiers. Otterly.ai Lite $29/mnd voor 10 prompts, Standard $189/mnd voor 100 prompts. Profound Starter ($99) alleen ChatGPT. SEMrush AI visibility is een add-on. Briljant.nl: €49/mnd na 7 dagen gratis proefperiode. Prijzen per april 2025.'
              : '* Peec.ai: choose 3 of 7 models, more models via higher tiers. Otterly.ai Lite $29/mo for 10 prompts, Standard $189/mo for 100 prompts. Profound Starter ($99) ChatGPT only. SEMrush AI visibility is an add-on. Briljant.nl: €49/mo after 7-day free trial. Prices as of April 2025.'}
          </p>
        </div>
      </section>

      {/* ====== CTA BANNER ====== */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] rounded-3xl overflow-hidden shadow-xl">
            <div className="p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                {isNL
                  ? 'Klaar om gevonden te worden in AI-antwoorden?'
                  : 'Ready to be found in AI answers?'}
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
                {isNL
                  ? 'Start gratis of upgrade naar Pro voor GEO Optimalisatie DIY en onbeperkt alle tools.'
                  : 'Start free or upgrade to Pro for GEO Optimization DIY and unlimited access to all tools.'}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button onClick={handleProClick} disabled={loading} className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 cursor-pointer disabled:opacity-60">
                  <Zap className="w-5 h-5" />
                  {loading ? (isNL ? 'Laden...' : 'Loading...') : (isNL ? `Start Pro, €${price.toFixed(2).replace('.', ',')}/mnd` : `Start Pro, €${price.toFixed(2).replace('.', ',')}/mo`)}
                </button>
                <Link
                  href="/tools/ai-visibility"
                  className="inline-flex items-center gap-2 px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  {isNL ? 'Probeer gratis' : 'Try free'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="text-white/50 text-xs mt-6">
                {isNL ? 'Geen creditcard nodig voor gratis account. Pro is maandelijks opzegbaar.' : 'No credit card needed for free account. Pro can be cancelled monthly.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="py-20 bg-slate-50 relative overflow-visible">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
                {isNL ? 'Veelgestelde vragen' : 'Frequently asked questions'}
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                      className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 font-mono text-sm">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {faq.q}
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${openFaq === i ? 'rotate-45' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-6 pb-6 pt-0">
                        <p className="text-slate-600 pl-10">{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mascotte */}
            <div className="hidden lg:flex justify-center items-end relative">
              <div className="translate-y-20">
                <Image
                  src="/teun-ai-mascotte.png"
                  alt={isNL ? 'Teun helpt je' : 'Teun helps you'}
                  width={420}
                  height={530}
                  className="drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
