'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { ArrowRight, Zap, Code2, BarChart3, Globe, Brain, Sparkles } from 'lucide-react';

export default function OverOnsPage() {
  const locale = useLocale();
  const isNL = locale === 'nl';

  const team = [
    {
      name: 'Imre Bernáth',
      role: isNL ? 'Oprichter & AI-strateeg' : 'Founder & AI Strategist',
      photo: '/Imre-Bernath.webp',
      credentials: [
        isNL ? '25 jaar online marketing' : '25 years online marketing',
        isNL ? 'Oprichter OnlineLabs (2008)' : 'Founder OnlineLabs (2008)',
        isNL ? 'Bouwer van Teun.ai' : 'Builder of Teun.ai',
      ],
      description: isNL
        ? 'Imre begon met SEO toen Google nog in de kinderschoenen stond. Na 17+ jaar SEO-expertise en 750+ projecten zag hij als een van de eersten dat AI-zoekmachines de markt fundamenteel veranderen. Alle kennis uit 25 jaar online marketing zit verwerkt in Teun.ai.'
        : 'Imre started with SEO when Google was still in its infancy. After 17+ years of SEO expertise and 750+ projects, he was among the first to see that AI search engines are fundamentally changing the market. All knowledge from 25 years of online marketing is built into Teun.ai.',
      linkedin: 'https://www.linkedin.com/in/imrebernath/',
      highlight: isNL ? '25 jaar ervaring → Teun.ai' : '25 years experience → Teun.ai',
    },
    {
      name: 'Sanne Verschoor',
      role: isNL ? 'Lead Developer & AI Designer' : 'Lead Developer & AI Designer',
      photo: '/Sanne-Verschoor.webp',
      credentials: [
        isNL ? 'Full-stack developer' : 'Full-stack developer',
        isNL ? 'WordPress & Next.js specialist' : 'WordPress & Next.js specialist',
        isNL ? 'AI-interface design' : 'AI interface design',
      ],
      description: isNL
        ? 'Sanne combineert technische expertise met een scherp oog voor design. Ze ontwikkelt de interfaces die complexe AI-data vertalen naar bruikbare inzichten. Van het dashboard tot de Chrome extensie, elke pixel is doordacht.'
        : 'Sanne combines technical expertise with a sharp eye for design. She develops the interfaces that translate complex AI data into actionable insights. From the dashboard to the Chrome extension, every pixel is intentional.',
      linkedin: 'https://www.linkedin.com/in/sanne-verschoor-380bab267',
      highlight: isNL ? 'Code + design = Teun.ai UX' : 'Code + design = Teun.ai UX',
    },
    {
      name: 'Adrian Enders',
      role: isNL ? 'Online Marketeer & Data Analyst' : 'Online Marketer & Data Analyst',
      photo: '/Adrian-Enders.webp',
      credentials: [
        isNL ? 'Rijksuniversiteit Groningen' : 'University of Groningen',
        isNL ? 'Google Ads & SEO specialist' : 'Google Ads & SEO specialist',
        isNL ? 'Master Economie & Bedrijfskunde' : 'Master Economics & Business',
      ],
      description: isNL
        ? 'Adrian studeerde aan de Rijksuniversiteit Groningen en brengt een analytische blik mee naar online marketing. Hij vertaalt data naar strategie en zorgt ervoor dat onze klanten niet alleen zichtbaar zijn, maar ook meetbaar groeien.'
        : 'Adrian studied at the University of Groningen and brings an analytical perspective to online marketing. He translates data into strategy and ensures our clients don\'t just gain visibility, but measurably grow.',
      linkedin: 'https://www.linkedin.com/in/adrian-fa-enders/',
      highlight: isNL ? 'Data-driven AI marketing' : 'Data-driven AI marketing',
    },
  ];

  const stats = [
    { value: '25+', label: isNL ? 'Jaar ervaring' : 'Years experience' },
    { value: '750+', label: isNL ? 'Projecten afgerond' : 'Projects completed' },
    { value: '6', label: isNL ? 'Gratis AI-tools' : 'Free AI tools' },
    { value: '4', label: isNL ? 'AI-platforms gescand' : 'AI platforms scanned' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
      {/* Animation styles */}
      <style>{`
        @keyframes tool-float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -25px) scale(1.08); }
          66% { transform: translate(-25px, 15px) scale(0.95); }
        }
        @keyframes tool-float-medium {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.1); }
        }
        .tool-orb-1 { animation: tool-float-slow 22s ease-in-out infinite; }
        .tool-orb-2 { animation: tool-float-medium 18s ease-in-out infinite; animation-delay: -4s; }
        .tool-orb-3 { animation: tool-float-slow 26s ease-in-out infinite reverse; animation-delay: -8s; }
        @media (prefers-reduced-motion: reduce) {
          .tool-orb-1, .tool-orb-2, .tool-orb-3 { animation: none; }
        }
      `}</style>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="tool-orb-1 absolute -top-32 -right-32 lg:top-[-10%] lg:right-[5%] w-[300px] h-[300px] lg:w-[450px] lg:h-[450px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 40%, transparent 70%)' }} />
        <div className="tool-orb-2 absolute -bottom-24 -left-24 lg:bottom-[-15%] lg:left-[-5%] w-[250px] h-[250px] lg:w-[400px] lg:h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.10) 0%, rgba(139, 92, 246, 0.03) 40%, transparent 70%)' }} />
        <div className="tool-orb-3 absolute top-[50%] right-[8%] w-[120px] h-[120px] lg:w-[180px] lg:h-[180px] rounded-full hidden lg:block"
          style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%)' }} />
      </div>

      {/* ══ HERO ══ */}
      <section className="relative max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 pt-12 lg:pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          {isNL ? 'Over Teun.ai' : 'About Teun.ai'}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
          {isNL ? (
            <>Gebouwd door mensen die<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI-zichtbaarheid leven en ademen</span></>
          ) : (
            <>Built by people who<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">live and breathe AI visibility</span></>
          )}
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-4">
          {isNL
            ? 'Teun.ai is geen startup-experiment. Het is het resultaat van 25 jaar SEO-ervaring, 750+ projecten en de overtuiging dat AI-zoekmachines de toekomst van online marketing bepalen.'
            : 'Teun.ai is not a startup experiment. It\'s the result of 25 years of SEO experience, 750+ projects and the conviction that AI search engines define the future of online marketing.'}
        </p>

        <p className="text-sm text-slate-400">
          {isNL ? 'Door het team van OnlineLabs, Amsterdam' : 'By the team at OnlineLabs, Amsterdam'}
        </p>
      </section>

      {/* ══ STATS ══ */}
      <section className="relative bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] py-8">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TEAM ══ */}
      <section className="relative py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {isNL ? (
                <>Het team achter <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Teun.ai</span></>
              ) : (
                <>The team behind <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Teun.ai</span></>
              )}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              {isNL
                ? 'Drie specialisten. Samen 40+ jaar ervaring in online marketing, development en data-analyse.'
                : 'Three specialists. Combined 40+ years of experience in online marketing, development and data analysis.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                {/* Photo */}
                <div className="relative h-72 overflow-hidden">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    style={{ objectPosition: '50% 30%' }}
                  />
                  {/* Highlight badge */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-slate-700 shadow-sm">
                      <Zap className="w-3 h-3 text-blue-600" />
                      {member.highlight}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{member.name}</h3>
                  <p className="text-sm font-medium text-blue-600 mb-4">{member.role}</p>

                  {/* Credentials */}
                  <div className="space-y-2 mb-4">
                    {member.credentials.map((cred, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        {cred}
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1">
                    {member.description}
                  </p>

                  {/* LinkedIn - pinned to bottom */}
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mt-auto"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY TEUN.AI ══ */}
      <section className="relative py-20 bg-slate-100">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {isNL ? (
                <>Waarom we <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Teun.ai</span> bouwden</>
              ) : (
                <>Why we built <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Teun.ai</span></>
              )}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                {isNL ? 'Het probleem' : 'The problem'}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {isNL
                  ? 'Onze klanten ranken prima in Google, maar willen nu ook genoemd worden in ChatGPT, Google AI en Perplexity. Er bestond geen tool om dit te meten, laat staan te verbeteren. De bestaande tools waren of te duur (€400+/mnd) of misten de Nederlandse markt compleet.'
                  : 'Our clients rank well in Google, but also want to be mentioned by ChatGPT, Google AI and Perplexity. No tool existed to measure this, let alone improve it. Existing tools were either too expensive (€400+/mo) or completely missed the Dutch market.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
                <Brain className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                {isNL ? 'Onze oplossing' : 'Our solution'}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {isNL
                  ? 'We bouwden Teun.ai: 6 gratis tools die samenwerken. Van eerste check tot structurele optimalisatie. Betaalbaar voor elke ondernemer en gebouwd door mensen die zelf dagelijks met klanten werken aan AI-zichtbaarheid.'
                  : 'We built Teun.ai: 6 free tools working together. From first check to structural optimization. Affordable for every business, and built by people who work with clients on AI visibility every day.'}
              </p>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-2xl p-8 border border-slate-200">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {isNL ? 'OnlineLabs + Teun.ai' : 'OnlineLabs + Teun.ai'}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {isNL
                    ? 'Teun.ai is gebouwd door OnlineLabs, online marketing bureau in Amsterdam sinds 2008. We gebruiken Teun.ai dagelijks voor onze eigen klanten. Elke feature is getest in de praktijk, niet in een lab. Wil je het zelf doen? Gebruik Teun.ai. Liever uitbesteden? OnlineLabs helpt je met professionele GEO-optimalisatie.'
                    : 'Teun.ai is built by OnlineLabs, online marketing agency in Amsterdam since 2008. We use Teun.ai daily for our own clients. Every feature is tested in practice, not in a lab. Want to do it yourself? Use Teun.ai. Prefer to outsource? OnlineLabs helps you with professional GEO optimization.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRICING CTA ══ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            {isNL
              ? 'Klaar om je AI-zichtbaarheid te meten?'
              : 'Ready to measure your AI visibility?'}
          </h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            {isNL
              ? '6 gratis tools. Geen creditcard nodig. Resultaat in 2 minuten.'
              : '6 free tools. No credit card needed. Results in 2 minutes.'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/tools/ai-visibility" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all">
              {isNL ? 'Gratis scan starten' : 'Start free scan'} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-lg hover:shadow-md hover:border-slate-300 transition-all">
              {isNL ? 'Bekijk Lite & Pro' : 'View Lite & Pro'} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-slate-400 text-xs mt-3">
            {isNL ? 'Vanaf €29,95/mnd excl. BTW' : 'From €29.95/mo excl. VAT'}
          </p>
        </div>
      </section>

      {/* ══ FAQ with Teun ══ */}
      <section className="py-20 bg-slate-50 relative overflow-visible">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
                {isNL ? 'Veelgestelde vragen' : 'Frequently asked questions'}
              </h2>
              <FAQSection isNL={isNL} />
            </div>
            <div className="hidden lg:flex justify-center items-end relative">
              <div className="translate-y-20" style={{ marginTop: '94px' }}>
                <Image src="/teun-ai-mascotte.png" alt={isNL ? 'Teun helpt je' : 'Teun helps you'} width={420} height={530} className="drop-shadow-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FAQSection({ isNL }) {
  const faqs = isNL ? [
    { q: 'Wie zit er achter Teun.ai?', a: 'Teun.ai is gebouwd door OnlineLabs, online marketing bureau in Amsterdam sinds 2008. Het team bestaat uit Imre Bernáth (oprichter, 25 jaar ervaring), Sanne Verschoor (lead developer) en Adrian Enders (online marketeer, RUG).' },
    { q: 'Waarom heet het Teun.ai?', a: 'Teun is onze 3D-mascotte die je door het platform begeleidt. De naam staat voor een persoonlijke, toegankelijke benadering van AI-zichtbaarheid. Geen corporate tool, maar een slimme assistent.' },
    { q: 'Voor welke markten werkt Teun.ai?', a: 'Teun.ai werkt voor zowel de Nederlandse als internationale markt. Het platform is beschikbaar in Nederlands en Engels. Alle prompts en zoekvolumes worden afgestemd op de taal en locatie van je doelgroep.' },
    { q: 'Wat is het verband tussen OnlineLabs en Teun.ai?', a: 'OnlineLabs is het bureau dat Teun.ai heeft gebouwd. We gebruiken Teun.ai dagelijks voor onze eigen klanten. Wil je het zelf doen? Gebruik Teun.ai. Liever uitbesteden? OnlineLabs helpt je met professionele GEO-optimalisatie.' },
  ] : [
    { q: 'Who is behind Teun.ai?', a: 'Teun.ai is built by OnlineLabs, an online marketing agency in Amsterdam since 2008. The team consists of Imre Bernáth (founder, 25 years experience), Sanne Verschoor (lead developer) and Adrian Enders (online marketer, University of Groningen).' },
    { q: 'Why is it called Teun.ai?', a: 'Teun is our 3D mascot that guides you through the platform. The name represents a personal, accessible approach to AI visibility. Not a corporate tool, but a smart assistant.' },
    { q: 'Which markets does Teun.ai work for?', a: 'Teun.ai works for both the Dutch and international market. The platform is available in Dutch and English. All prompts and search volumes are tailored to the language and location of your target audience.' },
    { q: 'What is the connection between OnlineLabs and Teun.ai?', a: 'OnlineLabs is the agency that built Teun.ai. We use Teun.ai daily for our own clients. Want to do it yourself? Use Teun.ai. Prefer to outsource? OnlineLabs helps you with professional GEO optimization.' },
  ];

  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="space-y-4">
      {faqs.map((item, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
            className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-semibold text-slate-900">{item.q}</span>
            </div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${openIdx === i ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {openIdx === i && (
            <div className="px-6 pb-6 pt-0">
              <p className="text-slate-600 pl-10 leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
