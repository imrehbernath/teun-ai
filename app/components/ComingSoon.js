'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [timeLeft, setTimeLeft] = useState({
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const targetDate = new Date(process.env.NEXT_PUBLIC_LAUNCH_DATE || '2026-01-01T00:00:00').getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      const weeks = Math.floor(distance / (1000 * 60 * 60 * 24 * 7));
      const days = Math.floor((distance % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ weeks, days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
        setTimeout(() => setStatus(''), 5000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" suppressHydrationWarning>
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/Teun.ai-GEO-audits-AI-SEO-Analyse.webp"
          alt=""
          fill
          priority
          className="object-cover"
          quality={90} 
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#001233]/80 via-[#1a0b3d]/80 to-[#2d1654]/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 min-h-screen flex flex-col justify-center text-white" suppressHydrationWarning>
        
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-7xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-200 text-transparent bg-clip-text">
            TEUN.AI
          </h1>
          <p className="text-2xl md:text-3xl text-gray-300 font-light">
            GEO Audits, AI-SEO Analyse & AI-gedreven Optimalisatie
          </p>
        </header>

        {/* 🚀 BETA LAUNCH BANNER */}
        <section className="backdrop-blur-md bg-gradient-to-r from-green-600/40 via-emerald-500/30 to-green-600/40 border-2 border-green-400/50 rounded-2xl p-6 md:p-8 mb-8 shadow-2xl animate-pulse-slow">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-green-500/30 px-4 py-2 rounded-full border border-green-400/50">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-bold text-green-100 uppercase tracking-wider">LIVE • BETA</span>
            </div>
          </div>
          
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-3 text-white">
            🎉 Eerste Tool Live: AI Zichtbaarheidsanalyse!
          </h2>
          
          <p className="text-center text-green-50 mb-6 text-base md:text-lg leading-relaxed">
            Test <strong>GRATIS</strong> hoe vaak jouw bedrijf wordt vermeld in AI-zoekmachines zoals ChatGPT, Perplexity en Claude.
          </p>

          <div className="flex justify-center">
            <Link
              href="/tools/ai-visibility"
              className="px-8 py-4 bg-white text-purple-700 font-bold rounded-lg hover:bg-green-50 transition shadow-xl hover:scale-105 transform text-center"
            >
              🚀 Test Nu Gratis (BETA)
            </Link>
          </div>
        </section>

        {/* Launch Card */}
        <section className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-8" aria-labelledby="launch-heading">
          <div className="text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-3 py-2 md:px-4 md:py-2 rounded-full border border-blue-400/30 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl" role="img" aria-label="raket">🚀</span>
                <span className="text-xs md:text-sm font-semibold whitespace-nowrap">
                  Volledige Launch: <time dateTime="2026-01-01"><strong>1 jan 2026</strong></time>
                </span>
              </div>
            </div>

            <p className="text-gray-300 mb-3 text-base md:text-lg leading-relaxed">
              Hét platform voor <strong className="text-white">AI-SEO analyse</strong> en slimme{' '}
              <strong className="text-white">GEO optimalisatie</strong>.
            </p>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              Word zichtbaar in{' '}
              <span className="text-blue-300">ChatGPT</span>,{' '}
              <span className="text-blue-300">Google AI</span>,{' '}
              <span className="text-blue-300">Bing AI</span>,{' '}
              <span className="text-blue-300">Claude</span> en{' '}
              <span className="text-blue-300">Perplexity</span>. Lees alvast meer over{' '}
              <Link 
                href="/wat-is-generative-engine-optimisation-geo"
                className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
              >
                GEO optimalisatie
              </Link>{' '}
              in ons{' '}
              <Link 
                href="/blog"
                className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
              >
                blogoverzicht
              </Link>{' '}
              en ontdek hoe bedrijven zich nu al voorbereiden op AI-gedreven zoekresultaten.
            </p>
          </div>
        </section>

        {/* Email Signup */}
        <section className="backdrop-blur-md bg-gradient-to-br from-purple-600/30 via-purple-500/20 to-indigo-600/30 border border-purple-400/30 rounded-2xl p-6 md:p-8 mb-8 shadow-xl" aria-labelledby="signup-heading">
          <h2 id="signup-heading" className="text-center text-base md:text-lg mb-6 text-purple-100 font-semibold">
            Meld je aan voor updates & ontvang exclusieve early access
          </h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
            <label htmlFor="email-input" className="sr-only">Email adres</label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Vul je emailadres in *"
              required
              disabled={status === 'loading'}
              className="flex-1 px-6 py-4 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
              aria-required="true"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg"
            >
              {status === 'loading' ? 'VERZENDEN...' : 'VERZENDEN'}
            </button>
          </form>

          {status === 'success' && (
            <div className="mt-4 text-center text-green-300 font-semibold" role="status">
              ✅ Bedankt voor je aanmelding! Check je inbox.
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-4 text-center text-red-300 font-semibold" role="alert">
              ❌ Er ging iets mis. Probeer het opnieuw.
            </div>
          )}
        </section>

        {/* Countdown */}
        <section className="grid grid-cols-5 gap-2 sm:gap-4 mb-12" aria-label="Countdown tot lancering" suppressHydrationWarning>
          <CountdownBox value={timeLeft.weeks} label="WEKEN" />
          <CountdownBox value={timeLeft.days} label="DAGEN" />
          <CountdownBox value={timeLeft.hours} label="UUR" />
          <CountdownBox value={timeLeft.minutes} label="MIN" />
          <CountdownBox value={timeLeft.seconds} label="SEC" />
        </section>

        {/* Why Section */}
        <section className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-12" aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-2xl md:text-3xl font-bold text-center mb-6">Waarom Teun.ai?</h2>
          
          <div className="space-y-4 text-gray-300 text-base md:text-lg leading-relaxed">
            <p>
              Teun.ai is de eerste{' '}
              <strong className="text-white">SEO tool voor AI zoekmachines</strong> in Nederland. 
              Met onze <strong className="text-white">GEO Audits</strong>,{' '}
              <strong className="text-white">AI-SEO analyse & scan</strong> en{' '}
              <strong className="text-white">AI content optimalisatie</strong> krijg je inzicht in jouw{' '}
              <strong className="text-white">GEO vindbaarheid</strong>,{' '}
              <strong className="text-white">AI optimalisatie</strong> en{' '}
              <strong className="text-white">zichtbaarheid in ChatGPT</strong> en andere AI-zoekmachines.
            </p>

            <p>
              Daarmee helpen we je om niet alleen beter gevonden te worden, maar ook vaker aanbevolen te worden door 
              generatieve zoekmachines.{' '}
              <Link 
                href="/waarom-geo-generative-engine-optimisation-de-opvolger-is-van-seo"
                className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
              >
                SEO voor AI
              </Link>{' '}
              wordt zo concreet en haalbaar.
            </p>

            <p className="text-center italic pt-4 text-base md:text-lg">
              <span role="img" aria-label="vinkje">✓</span> Met Teun.ai ben je straks <strong className="text-white">zichtbaar in ChatGPT</strong> en andere AI-zoekmachines.
            </p>
          </div>
        </section>

        {/* ✅ FOOTER VERWIJDERD - Zit nu in template.js */}
      </div>
    </div>
  );
}

// Countdown Box
function CountdownBox({ value, label }) {
  return (
    <div className="backdrop-blur-sm border-2 border-purple-400/40 rounded-xl p-2 sm:p-4 text-center bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
      <div 
        className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-br from-purple-300 via-blue-300 to-purple-200 bg-clip-text text-transparent" 
        aria-label={value + ' ' + label}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[10px] sm:text-xs md:text-sm text-purple-200 uppercase tracking-wider font-semibold">
        {label}
      </div>
    </div>
  );
}