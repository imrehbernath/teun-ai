'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, X, Minus, ArrowRight, Zap, BarChart3, Bell, FileText, Shield, Infinity, Crown, Sparkles, TrendingUp, Search } from 'lucide-react';

export default function PricingPage() {
  const locale = useLocale();
  const isNL = locale === 'nl';
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

  // ✨ Coming soon - Stripe nog niet live
  // Vervang deze functie door de Stripe versie zodra betalingen live zijn
  function handleProClick() {
    setShowNotify(true);
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
      name: isNL ? 'Dagelijkse rank monitoring' : 'Daily rank monitoring',
      free: null,
      pro: true,
      freeStatus: 'cross',
      proStatus: 'pro',
    },
    {
      name: isNL ? 'Concurrentie tracking & alerts' : 'Competitor tracking & alerts',
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
      name: isNL ? 'GEO Analyse & optimalisatie' : 'GEO Analysis & optimization',
      free: null,
      pro: true,
      freeStatus: 'cross',
      proStatus: 'pro',
    },
    {
      name: isNL ? 'Uitgebreide PDF rapporten' : 'Extended PDF reports',
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
    { name: 'Teun.ai Pro', price: '€49,95', platforms: '4+', prompts: isNL ? 'Onbeperkt' : 'Unlimited', tools: isNL ? '6 gratis' : '6 free', audit: true, explorer: true, plugin: true, hl: true },
    { name: 'Profound', price: '$399', platforms: '3*', prompts: '150', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Peec.ai', price: '€89+', platforms: '3*', prompts: '25', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Geoptie', price: '$49', platforms: isNL ? 'Alle' : 'All', prompts: 'Basis', tools: isNL ? '7 gratis' : '7 free', audit: true, explorer: false, plugin: false },
    { name: 'Briljant.nl', price: '€39', platforms: '6', prompts: '?', tools: isNL ? 'Geen' : 'None', audit: true, explorer: false, plugin: false },
    { name: 'SEMrush', price: '€140+', platforms: '3-4*', prompts: '25-200', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
    { name: 'Ahrefs', price: '€99+', platforms: isNL ? 'Geen' : 'None', prompts: 'N/A', tools: isNL ? 'Geen' : 'None', audit: false, explorer: false, plugin: false },
  ];

  const faqs = isNL ? [
    { q: 'Kan ik op elk moment opzeggen?', a: 'Ja. Geen contracten, geen opzegtermijn. Je houdt Pro toegang tot het einde van je betaalperiode.' },
    { q: 'Welke AI platforms worden gescand?', a: 'ChatGPT Search, Perplexity, Google AI Mode en Google AI Overviews. Alle platforms zijn inbegrepen, zonder extra kosten per platform.' },
    { q: 'Wat betekent \'onbeperkte scans\'?', a: 'Geen dagelijkse limieten, geen credits die opraken. Draai zoveel AI Visibility scans, Brand Checks, Rank Tracker checks en GEO Audits als je nodig hebt.' },
    { q: 'Is er een gratis proefperiode?', a: 'Alle 6 tools zijn gratis te gebruiken met dagelijkse limieten. Zo ervaar je precies wat Teun.ai kan voordat je upgradet naar Pro.' },
    { q: 'Wat maakt Teun.ai anders dan Profound of Peec?', a: 'Teun.ai biedt 6 gratis tools, scant alle platforms zonder extra kosten, heeft een WordPress plugin en AI Prompt Explorer. Profound kost $399/mnd voor 3 platforms, Peec €89/mnd voor slechts 25 prompts.' },
  ] : [
    { q: 'Can I cancel at any time?', a: 'Yes. No contracts, no notice period. You keep Pro access until the end of your billing period.' },
    { q: 'Which AI platforms are scanned?', a: 'ChatGPT Search, Perplexity, Google AI Mode and Google AI Overviews. All platforms included, no extra costs per platform.' },
    { q: 'What does \'unlimited scans\' mean?', a: 'No daily limits, no credits running out. Run as many AI Visibility scans, Brand Checks, Rank Tracker checks and GEO Audits as you need.' },
    { q: 'Is there a free trial?', a: 'All 6 tools are free to use with daily limits. Experience exactly what Teun.ai can do before upgrading to Pro.' },
    { q: 'What makes Teun.ai different from Profound or Peec?', a: 'Teun.ai offers 6 free tools, scans all platforms at no extra cost, has a WordPress plugin and AI Prompt Explorer. Profound costs $399/mo for 3 platforms, Peec €89/mo for just 25 prompts.' },
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
              <form onSubmit={handleNotifySubmit} className="flex flex-col gap-2">
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
              ? '6 gratis AI visibility tools. Upgrade naar Pro voor onbeperkte scans, dagelijkse monitoring en concurrentie alerts.'
              : '6 free AI visibility tools. Upgrade to Pro for unlimited scans, daily monitoring and competitor alerts.'}
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
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">2.847+</div>
              <div className="text-sm text-white/70">{isNL ? 'AI scans uitgevoerd' : 'AI scans completed'}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">151+</div>
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
                  ? 'Onbeperkt scannen, dagelijkse monitoring en alerts op alle platforms.'
                  : 'Unlimited scanning, daily monitoring and alerts on all platforms.'}
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
                ? 'Dagelijkse monitoring, concurrentie alerts en volledige scan resultaten.'
                : 'Daily monitoring, competitor alerts and full scan results.'}
            </p>
          </div>

          <div className="relative bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 overflow-hidden shadow-sm">
            {/* Fake tabs */}
            <div className="flex gap-2 mb-6">
              {['AI Visibility', 'Rank Tracker', isNL ? 'Concurrenten' : 'Competitors', 'GEO Audit'].map((tab, i) => (
                <span key={i} className={`px-4 py-2 rounded-lg text-sm font-medium ${i === 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-400'}`}>
                  {tab}
                </span>
              ))}
            </div>

            {/* Fake metric cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Visibility Score', value: '73%', delta: '+12%' },
                { label: 'ChatGPT', value: '8/10', delta: '+3' },
                { label: 'Perplexity', value: '6/10', delta: '+1' },
                { label: isNL ? 'Concurrenten' : 'Competitors', value: '14', delta: isNL ? 'getrackt' : 'tracked' },
              ].map((m, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">{m.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{m.value}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">{m.delta}</p>
                </div>
              ))}
            </div>

            {/* Fake chart bars */}
            <div className="flex items-end gap-2 h-24 px-4">
              {[35, 48, 42, 58, 52, 65, 60, 72, 68, 78, 74, 85].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-500 to-purple-500" style={{ height: `${h}%`, opacity: 0.4 + h / 200 }} />
              ))}
            </div>

            {/* Blur overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white flex flex-col items-center justify-end pb-10">
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
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">{isNL ? 'Gratis tools' : 'Free tools'}</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">GEO Audit</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Prompt Explorer</th>
                    <th className="px-4 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">WP Plugin</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${c.hl ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                      <td className={`px-5 py-4 font-semibold ${c.hl ? 'text-blue-700' : 'text-slate-900'}`}>
                        {c.name}
                      </td>
                      <td className={`px-4 py-4 text-center font-bold ${c.hl ? 'text-blue-700 text-base' : 'text-slate-700'}`}>
                        {c.price}
                      </td>
                      <td className={`px-4 py-4 text-center ${c.platforms === 'Geen' || c.platforms === 'None' ? 'text-red-400' : c.hl ? 'text-blue-700 font-semibold' : 'text-slate-600'}`}>
                        {c.platforms}
                      </td>
                      <td className={`px-4 py-4 text-center ${c.prompts === 'Onbeperkt' || c.prompts === 'Unlimited' ? 'text-green-600 font-semibold' : c.prompts === 'N/A' ? 'text-red-400' : 'text-slate-600'}`}>
                        {c.prompts}
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

          <p className="text-center text-slate-400 text-xs mt-4">
            {isNL
              ? '* Extra platforms kosten €30-140/mnd bij Peec.ai. Profound Growth ($399) beperkt tot 3 platforms. SEMrush AI visibility is een add-on. Prijzen per maart 2026.'
              : '* Extra platforms cost €30-140/mo at Peec.ai. Profound Growth ($399) limited to 3 platforms. SEMrush AI visibility is an add-on. Prices as of March 2026.'}
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
                  ? 'Start gratis of upgrade direct naar Pro voor onbeperkte AI visibility scanning.'
                  : 'Start free or upgrade directly to Pro for unlimited AI visibility scanning.'}
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
