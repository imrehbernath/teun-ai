'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ============================================
// HOMEPAGE COMPONENT - Teun.ai
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
    <div className="bg-white overflow-hidden">
      {/* ====== HERO + STATS WRAPPER ====== */}
      <div className="relative overflow-hidden">
        {/* Hero Mascotte - Positioned over both sections */}
        <div className="hidden lg:block absolute right-[5%] xl:right-[10%] top-[136px] z-10 pointer-events-none select-none">
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
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                        Bedrijfsnaam *
                        <span className="group relative">
                          <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                            Zoals vermeld bij Google Bedrijfsprofiel
                          </span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.bedrijfsnaam}
                        onChange={(e) => setFormData({...formData, bedrijfsnaam: e.target.value})}
                        placeholder="Evert Groot"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                        Branche *
                        <span className="group relative">
                          <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                            Zoals vermeld bij Google Bedrijfsprofiel
                          </span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.branche}
                        onChange={(e) => setFormData({...formData, branche: e.target.value})}
                        placeholder="Gordijnwinkel"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                        Zoekwoorden
                        <span className="group relative">
                          <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                            Scheid met komma's • Max. 10 zoekwoorden
                          </span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.zoekwoorden}
                        onChange={(e) => {
                          const keywords = e.target.value.split(',').filter(k => k.trim());
                          if (keywords.length <= 10 || e.target.value.length < formData.zoekwoorden.length) {
                            setFormData({...formData, zoekwoorden: e.target.value});
                          }
                        }}
                        placeholder="Linnen gordijnen, Luxe gordijnen"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                      />
                      {formData.zoekwoorden && (
                        <p className="mt-1 text-xs text-slate-400">
                          {formData.zoekwoorden.split(',').filter(k => k.trim()).length}/10 zoekwoorden
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Website <span className="text-slate-400 font-normal">(opt.)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        placeholder="evertgroot.nl"
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
                { name: 'Signhost', ext: 'svg' },
                { name: 'Evert-Groot', ext: 'svg' },
                { name: 'Flinck-Advocaten', ext: 'svg' },
                { name: 'Grachten-Museum', ext: 'png' },
                { name: 'HvanA', ext: 'svg' },
                { name: 'Contactcare', ext: 'svg' },
                { name: 'Feadship-Heritage-fleet', ext: 'png' },
                { name: 'instrktiv', ext: 'svg' },
                { name: 'CAKE-Film', ext: 'svg' },
                // Duplicates for seamless loop
                { name: 'Signhost', ext: 'svg' },
                { name: 'Evert-Groot', ext: 'svg' },
                { name: 'Flinck-Advocaten', ext: 'svg' },
                { name: 'Grachten-Museum', ext: 'png' },
                { name: 'HvanA', ext: 'svg' },
                { name: 'Contactcare', ext: 'svg' },
                { name: 'Feadship-Heritage-fleet', ext: 'png' },
                { name: 'instrktiv', ext: 'svg' },
                { name: 'CAKE-Film', ext: 'svg' },
              ].map((logo, i) => (
                <Image
                  key={`top-${i}`}
                  src={`/${logo.name}.${logo.ext}`}
                  alt={logo.name.replace(/-/g, ' ')}
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
                { name: 'ASN-autoschade', ext: 'svg' },
                { name: 'De-Smaak-van-Italie', ext: 'svg' },
                { name: 'InterDam', ext: 'png' },
                { name: 'Forteiland-Pampus', ext: 'svg' },
                { name: 'Sec-Arbeidsrecht-Advocaten', ext: 'svg' },
                { name: 'Farber-Zwaanswijk-Advocaten', ext: 'svg' },
                { name: 'Webike-Amsterdam', ext: 'svg' },
                // Duplicates for seamless loop
                { name: 'ASN-autoschade', ext: 'svg' },
                { name: 'De-Smaak-van-Italie', ext: 'svg' },
                { name: 'InterDam', ext: 'png' },
                { name: 'Forteiland-Pampus', ext: 'svg' },
                { name: 'Sec-Arbeidsrecht-Advocaten', ext: 'svg' },
                { name: 'Farber-Zwaanswijk-Advocaten', ext: 'svg' },
                { name: 'Webike-Amsterdam', ext: 'svg' },
              ].map((logo, i) => (
                <Image
                  key={`bottom-${i}`}
                  src={`/${logo.name}.${logo.ext}`}
                  alt={logo.name.replace(/-/g, ' ')}
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

      {/* ====== DASHBOARD PREVIEW - WHAT YOU GET ====== */}
      <section className="py-20 bg-gradient-to-br from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-green-400/20 to-emerald-400/20 border border-green-400/30 rounded-full text-green-300 text-sm font-medium mb-4">
              ✨ Gratis account voordelen
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Dit krijg je te zien
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Jouw persoonlijke AI-zichtbaarheids dashboard met realtime inzichten
            </p>
          </div>

          {/* Main Feature Cards */}
          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
            
            {/* Card 1: Dashboard Preview */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Persoonlijk Dashboard</h3>
                  <p className="text-slate-400 text-sm">Track al je websites op één plek</p>
                </div>
              </div>
              
              {/* Mini Dashboard Preview */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">OL</div>
                    <div>
                      <div className="text-white text-sm font-medium">OnlineLabs</div>
                      <div className="text-slate-500 text-xs">onlinelabs.nl</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">78</div>
                    <div className="text-slate-500 text-xs">Score</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">ChatGPT ✓</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-md">Perplexity ✓</span>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-md">↑ 6 punten</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Alle websites in één overzicht
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Score historie & trends
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Prompts bewerken & opnieuw scannen
                </li>
              </ul>
            </div>

            {/* Card 2: ChatGPT Realtime - UNIQUE FEATURE */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-sm rounded-2xl border border-green-400/30 p-6 hover:border-green-400/50 transition-all group relative overflow-hidden">
              {/* Highlight badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                  UNIEK
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#10A37F] to-[#0D8A6A] rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.2 9.4c.4-1.2.2-2.5-.5-3.6-.7-1-1.8-1.7-3-1.9-.6-.1-1.2 0-1.8.2-.5-1.3-1.5-2.3-2.8-2.8-1.3-.5-2.8-.4-4 .3C9.4.6 8.2.2 7 .5c-1.2.3-2.3 1.1-2.9 2.2-.6 1.1-.7 2.4-.3 3.6-1.3.5-2.3 1.5-2.8 2.8s-.4 2.8.3 4c-1 .8-1.6 2-1.7 3.3-.1 1.3.4 2.6 1.4 3.5 1 .9 2.3 1.3 3.6 1.2.5 1.3 1.5 2.3 2.8 2.8 1.3.5 2.8.4 4-.3.8 1 2 1.6 3.3 1.7 1.3.1 2.6-.4 3.5-1.4.9-1 1.3-2.3 1.2-3.6 1.3-.5 2.3-1.5 2.8-2.8.5-1.3.4-2.8-.3-4 1-.8 1.6-2 1.7-3.3.1-1.3-.4-2.6-1.4-3.5z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">ChatGPT Realtime Scanner</h3>
                  <p className="text-green-300 text-sm">Chrome Extensie - Gratis bij account</p>
                </div>
              </div>

              {/* Chrome Extension Preview */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#10A37F] to-[#0D8A6A] rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                  <span className="text-slate-400 text-xs">Teun.ai Chrome Extensie actief</span>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-300 text-sm font-medium">Jouw bedrijf is genoemd!</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1 pl-7">Direct inzicht terwijl je ChatGPT gebruikt</p>
                </div>
              </div>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong className="text-white">Onbeperkt</strong> ChatGPT scans
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Automatisch scannen terwijl je chat
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Resultaten direct in je dashboard
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom: What's included */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Gratis account = Gratis features</h3>
              <p className="text-slate-400 text-sm">Geen creditcard nodig, geen hidden costs</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '🔍', label: 'Perplexity scan', desc: '1x per dag' },
                { icon: '💬', label: 'ChatGPT extensie', desc: 'Onbeperkt' },
                { icon: '📊', label: 'Dashboard', desc: 'Volledig' },
                { icon: '📈', label: 'Historie', desc: 'Altijd beschikbaar' },
              ].map((feature, idx) => (
                <div key={idx} className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <div className="text-white text-sm font-medium">{feature.label}</div>
                  <div className="text-green-400 text-xs">{feature.desc}</div>
                </div>
              ))}
            </div>
            
            {/* CTA */}
            <div className="mt-6 text-center">
              <Link 
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
              >
                Maak Gratis Account
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <p className="text-slate-500 text-xs mt-3">
                Al 500+ bedrijven gingen je voor
              </p>
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
                    answer: 'Teun.AI scant hoe zichtbaar jouw bedrijf is in AI-zoekmachines. Onze gratis tool scant via Perplexity AI met realtime webresultaten. Met een account krijg je ook toegang tot ChatGPT scans via onze Chrome extensie. Je voert je bedrijfsgegevens en zoekwoorden in, en wij genereren de commerciële prompts die jouw potentiële klanten gebruiken.'
                  },
                  {
                    question: 'Wat kost Teun.AI?',
                    answer: 'Je kunt 2x gratis scannen zonder account. Met een gratis account krijg je 1 scan per dag + toegang tot je dashboard en onze Chrome extensie voor onbeperkte ChatGPT scans.'
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
