'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ============================================
// HOMEPAGE COMPONENT - Teun.ai
// Design: Daaf (Figma)
// ============================================

export default function Homepage() {
  const [formData, setFormData] = useState({
    bedrijfsnaam: '',
    website: '',
    branche: '',
    zoekwoorden: ''
  });
  const [openFaq, setOpenFaq] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Bouw query params op (alleen niet-lege waarden)
    const params = new URLSearchParams();
    
    if (formData.bedrijfsnaam) params.set('company', formData.bedrijfsnaam);
    if (formData.branche) params.set('category', formData.branche);
    if (formData.website) params.set('website', formData.website);
    if (formData.zoekwoorden) params.set('keywords', formData.zoekwoorden);
    
    // Auto-start de scan als er een bedrijfsnaam is
    if (formData.bedrijfsnaam) {
      params.set('autostart', 'true');
    }
    
    // Redirect naar AI Visibility tool
    window.location.href = `/tools/ai-visibility?${params.toString()}`;
  };

  return (
    <div className="bg-white overflow-x-hidden">
      {/* ====== HERO + STATS WRAPPER ====== */}
      <div className="relative">
        {/* Hero Mascotte - Positioned over both sections */}
        <div className="hidden lg:block absolute right-[5%] xl:right-[10%] top-[136px] z-50 pointer-events-none">
          <Image
            src="/mascotte-teun-ai.png"
            alt="Teun - AI Visibility Mascotte"
            width={380}
            height={480}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* ====== HERO SECTION ====== */}
        <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20">
            <div className="grid lg:grid-cols-5 gap-8 items-end">
              {/* Left: Content + Form - 3 columns */}
              <div className="lg:col-span-3 pb-12 lg:pb-24">
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-tight mb-6">
                  Hoe zichtbaar is jouw merk{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    in AI-zoekmachines?
                  </span>
                </h1>
                
                <p className="text-lg text-slate-600 mb-4">
                  Wordt jouw bedrijf aanbevolen door ChatGPT, Perplexity, Gemini of Claude?
                  <br />
                  <span className="font-medium text-slate-700">Gratis scan in 30 seconden.</span>
                </p>

                {/* AI Platform badges */}
                <div className="flex flex-wrap gap-3 mb-8">
                  {['OpenAI', 'Perplexity', 'Gemini', 'Claude'].map((platform) => (
                    <span 
                      key={platform}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {platform}
                    </span>
                  ))}
                </div>

                {/* Mobile Mascotte - above form */}
                <div className="lg:hidden flex justify-center">
                  <Image
                    src="/mascotte-teun-ai.png"
                    alt="Teun - AI Visibility Mascotte"
                    width={220}
                    height={280}
                    className="drop-shadow-xl"
                  />
                </div>

                {/* Scan Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Bedrijfsnaam *
                      </label>
                      <input
                        type="text"
                        value={formData.bedrijfsnaam}
                        onChange={(e) => setFormData({...formData, bedrijfsnaam: e.target.value})}
                        placeholder="Bijv: OnlineLabs"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Branche *
                      </label>
                      <input
                        type="text"
                        value={formData.branche}
                        onChange={(e) => setFormData({...formData, branche: e.target.value})}
                        placeholder="Bijv: SEO bureau"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Zoekwoorden
                      </label>
                      <input
                        type="text"
                        value={formData.zoekwoorden}
                        onChange={(e) => setFormData({...formData, zoekwoorden: e.target.value})}
                        placeholder="SEO specialist, ranking"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Website <span className="text-slate-400 font-normal">(opt.)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        placeholder="onlinelabs.nl"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    Start Gratis Scan →
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    Geen registratie nodig • Scannen is gratis • Resultaat binnen 30 sec
                  </p>
                </form>
              </div>

              {/* Placeholder for mascotte space */}
              <div className="hidden lg:block lg:col-span-2 min-h-[500px]"></div>
            </div>
          </div>
        </section>

        {/* ====== STATS BAR ====== */}
        <section className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] py-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center items-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">2,847</div>
              <div className="text-sm text-white/70">Scans uitgevoerd</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">94%</div>
              <div className="text-sm text-white/70">Vindt nieuwe inzichten</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">4</div>
              <div className="text-sm text-white/70">AI-platforms gescand</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-1">Gratis</div>
              <div className="text-sm text-white/70">Scannen is gratis</div>
            </div>
          </div>
        </div>
        </section>
      </div>
      {/* End of Hero + Stats Wrapper */}

      {/* ====== SOCIAL PROOF - Logo Slider ====== */}
      <section className="py-20 border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-center text-slate-500 text-sm font-medium uppercase tracking-wider">
            Merken die ons vertrouwen
          </h2>
        </div>
        
        {/* Dual Row Slider - Full Width */}
        <div className="space-y-8">
          {/* Top Row - Scrolls LEFT */}
          <div 
            className="relative w-full overflow-hidden"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
          >
            <div className="flex items-center justify-center gap-20 animate-scroll-left whitespace-nowrap">
              {[
                'Signhost', 'Evert-Groot', 'Flinck-Advocaten', 'HvanA', 'Contactcare', 'instrktiv', 'CAKE-Film',
                'Signhost', 'Evert-Groot', 'Flinck-Advocaten', 'HvanA', 'Contactcare', 'instrktiv', 'CAKE-Film',
              ].map((logo, i) => (
                <Image
                  key={`top-${i}`}
                  src={`/${logo}.svg`}
                  alt={logo.replace(/-/g, ' ')}
                  width={200}
                  height={80}
                  className="h-16 md:h-20 w-auto flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300"
                />
              ))}
            </div>
          </div>

          {/* Bottom Row - Scrolls RIGHT */}
          <div 
            className="relative w-full overflow-hidden"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
          >
            <div className="flex items-center justify-center gap-20 animate-scroll-right whitespace-nowrap">
              {[
                'ASN-autoschade', 'De-Smaak-van-Italie', 'Forteiland-Pampus', 'Sec-Arbeidsrecht-Advocaten', 'Farber-Zwaanswijk-Advocaten', 'Webike-Amsterdam',
                'ASN-autoschade', 'De-Smaak-van-Italie', 'Forteiland-Pampus', 'Sec-Arbeidsrecht-Advocaten', 'Farber-Zwaanswijk-Advocaten', 'Webike-Amsterdam',
              ].map((logo, i) => (
                <Image
                  key={`bottom-${i}`}
                  src={`/${logo}.svg`}
                  alt={logo.replace(/-/g, ' ')}
                  width={200}
                  height={80}
                  className="h-16 md:h-20 w-auto flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300"
                />
              ))}
            </div>
          </div>
        </div>

        {/* CSS for infinite scroll animations */}
        <style jsx>{`
          @keyframes scrollLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes scrollRight {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .animate-scroll-left {
            animation: scrollLeft 45s linear infinite;
            width: max-content;
          }
          .animate-scroll-right {
            animation: scrollRight 45s linear infinite;
            width: max-content;
          }
          .animate-scroll-left:hover,
          .animate-scroll-right:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>

      {/* ====== HOE HET WERKT ====== */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Hoe het werkt
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-[#1E1E3F]">.1</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Vul je gegevens in
                  </h3>
                  <p className="text-slate-600">
                    Bedrijfsnaam, branche en zoekwoorden. Wij maken de commerciële prompts.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-[#1E1E3F]">.2</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    We scannen 4 AI's
                  </h3>
                  <p className="text-slate-600">
                    ChatGPT, Perplexity, Claude en Google AI worden realtime bevraagd.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-[#1E1E3F]">.3</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Ontvang je rapport
                  </h3>
                  <p className="text-slate-600">
                    Zie welke prompts potentiële klanten gebruiken. Zie precies waar je wel en niet genoemd wordt, of je concurrentie.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== DASHBOARD PREVIEW ====== */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Dit krijg je te zien
            </h2>
            <p className="text-lg text-slate-600">
              Een compleet overzicht van je AI-zichtbaarheid
            </p>
          </div>

          {/* Dashboard Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  O
                </div>
                <div>
                  <div className="font-bold text-slate-900">OnlineLabs</div>
                  <div className="text-sm text-slate-500">onlinelabs.nl</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-slate-900">72</div>
                <div className="text-sm text-slate-500">AI Visibility Score</div>
              </div>
            </div>

            {/* Platform Scores */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { name: 'ChatGPT', score: 85, color: 'from-green-400 to-emerald-500' },
                { name: 'Perplexity', score: 78, color: 'from-blue-400 to-cyan-500' },
                { name: 'Claude', score: 62, color: 'from-purple-400 to-violet-500' },
                { name: 'Gemini', score: 45, color: 'from-amber-400 to-orange-500' },
              ].map((platform) => (
                <div key={platform.name} className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-sm text-slate-600 mb-2">{platform.name}</div>
                  <div className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${platform.color}`}>
                    {platform.score}%
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${platform.color} transition-all duration-1000`}
                      style={{ width: `${platform.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====== FAQ SECTION ====== */}
      <section className="py-20 bg-slate-50 relative overflow-visible">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: FAQ */}
            <div>
              <div className="space-y-4">
                {[
                  {
                    question: 'Hoe werkt Teun.AI precies?',
                    answer: 'Teun.AI scant hoe zichtbaar jouw bedrijf is in AI-zoekmachines zoals ChatGPT, Perplexity, Claude en Gemini. Je voert je bedrijfsgegevens en zoekwoorden in, en wij genereren de commerciële prompts die jouw potentiële klanten gebruiken. Zo zie je precies waar je wel en niet wordt aanbevolen.'
                  },
                  {
                    question: 'Wat kost Teun.AI?',
                    answer: 'Je kunt 2x gratis scannen zonder account. Met een account kun je onbeperkt scannen en krijg je toegang tot geavanceerde features - helemaal gratis.'
                  },
                  {
                    question: 'Is Teun.AI geschikt voor mijn bedrijf?',
                    answer: 'Teun.AI is geschikt voor elk bedrijf dat online zichtbaar wil zijn. Of je nu een MKB-bedrijf, startup of enterprise bent - als je klanten je via AI-zoekmachines moeten kunnen vinden, is Teun.AI voor jou.'
                  },
                  {
                    question: 'Hoe lang duurt het voordat ik resultaten zie?',
                    answer: 'Je scan resultaten zijn direct beschikbaar. Het verbeteren van je AI-zichtbaarheid is een proces dat tijd kost, maar met onze concrete tips kun je direct aan de slag.'
                  }
                ].map((faq, i) => (
                  <div 
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                      className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 font-mono text-sm">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {faq.question}
                        </span>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === i ? 'rotate-45' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-6 pb-6 pt-0">
                        <p className="text-slate-600 pl-10">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Mascotte - overlapping footer */}
            <div className="hidden lg:flex justify-center items-end relative">
              <div className="translate-y-24">
                <Image
                  src="/teun-ai-mascotte.png"
                  alt="Teun helpt je"
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
