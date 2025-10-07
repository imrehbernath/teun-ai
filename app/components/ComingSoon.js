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
    <div className="min-h-screen relative overflow-hidden">
      
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
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 min-h-screen flex flex-col justify-center text-white">
        
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-7xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-200 text-transparent bg-clip-text">
            TEUN.AI
          </h1>
          <p className="text-2xl md:text-3xl text-gray-300 font-light">
            GEO Audits, AI-SEO Analyse & AI-gedreven Optimalisatie
          </p>
        </header>

        {/* Launch Card */}
        <section className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-8 mb-8" aria-labelledby="launch-heading">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-2 rounded-full border border-blue-400/30 mb-6">
              <span className="text-2xl" role="img" aria-label="raket">🚀</span>
              <span className="text-sm font-semibold">
                Op <time dateTime="2026-01-01"><strong>1 januari 2026</strong></time> gaat Teun.ai live
              </span>
            </div>

            <p className="text-gray-300 mb-2">
              Hét platform voor <strong className="text-white">AI-SEO analyse</strong> en slimme{' '}
              <strong className="text-white">GEO optimalisatie</strong>.
            </p>
            <p className="text-gray-400 text-sm">
              Word zichtbaar in{' '}
              <span className="text-blue-300">ChatGPT</span>,{' '}
              <span className="text-blue-300">Google AI</span>,{' '}
              <span className="text-blue-300">Bing AI</span>,{' '}
              <span className="text-blue-300">Claude</span> en{' '}
              <span className="text-blue-300">Perplexity</span>. Lees alvast meer over{' '}
              <a 
                href="https://teun.ai/blog" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
              >
                GEO optimalisatie
              </a>{' '}
              in ons{' '}
              <a 
                href="https://teun.ai/blog" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
              >
                blogoverzicht
              </a>{' '}
              en ontdek hoe bedrijven zich nu al voorbereiden op AI-gedreven zoekresultaten.
            </p>
          </div>
        </section>

        {/* Email Signup */}
        <section className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-8 mb-8" aria-labelledby="signup-heading">
          <h2 id="signup-heading" className="text-center text-lg mb-6">
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
              className="flex-1 px-6 py-4 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
              aria-required="true"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold rounded-lg hover:from-cyan-500 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              {status === 'loading' ? 'VERZENDEN...' : 'VERZENDEN'}
            </button>
          </form>

          {status === 'success' && (
            <div className="mt-4 text-center text-green-400 font-semibold" role="status">
              ✅ Bedankt voor je aanmelding! Check je inbox.
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-4 text-center text-red-400 font-semibold" role="alert">
              ❌ Er ging iets mis. Probeer het opnieuw.
            </div>
          )}
        </section>

        {/* Countdown - ONLY BORDERS */}
        <section className="grid grid-cols-5 gap-4 mb-12" aria-label="Countdown tot lancering">
          <CountdownBox value={timeLeft.weeks} label="Weken" />
          <CountdownBox value={timeLeft.days} label="Dagen" />
          <CountdownBox value={timeLeft.hours} label="Uur" />
          <CountdownBox value={timeLeft.minutes} label="Min" />
          <CountdownBox value={timeLeft.seconds} label="Sec" />
        </section>

        {/* Why Section */}
        <section className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-8" aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-3xl font-bold text-center mb-6">Waarom Teun.ai?</h2>
          
          <div className="space-y-4 text-gray-300">
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
              <a 
                href="https://teun.ai/blog" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
              >
                SEO voor AI
              </a>{' '}
              wordt zo concreet en haalbaar.
            </p>

            <p className="text-center italic pt-4">
              <span role="img" aria-label="vinkje">✓</span> Met Teun.ai ben je straks <strong className="text-white">zichtbaar in ChatGPT</strong> en andere AI-zoekmachines.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400 text-sm">
          <p>
            © 2025 Teun.ai | Powered by{' '}
            <a 
              href="https://onlinelabs.nl" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-cyan-400 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
            >
              OnlineLabs
            </a>
          </p>
        </footer>
      </div>

      {/* Cookie Widget */}
      <button 
        className="fixed bottom-4 left-4 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 transition border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 z-50"
        aria-label="Cookie instellingen"
        type="button"
      >
        <span className="text-2xl" role="img" aria-label="cookie">🍪</span>
      </button>
    </div>
  );
}

// Countdown Box - ONLY BORDER VERSION
function CountdownBox({ value, label }) {
  return (
    <div className="backdrop-blur-sm border-2 border-white/30 rounded-xl p-4 text-center bg-transparent">
      <div className="text-3xl md:text-4xl font-bold mb-1" aria-label={`${value} ${label}`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-xs md:text-sm text-gray-300 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}