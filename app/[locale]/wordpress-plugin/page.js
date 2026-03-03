// app/[locale]/wordpress-plugin/page.js
// WordPress Plugin — Teun.ai GEO landing page
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { Download, Shield, Bot, BarChart3, Sparkles, Puzzle, Zap, Eye, ArrowRight, ExternalLink, CheckCircle2, Code2, BookOpen } from 'lucide-react';

export default function WordPressPluginPage() {
  const locale = useLocale();
  const [openFaq, setOpenFaq] = useState(0);

  const features = [
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: locale === 'en' ? 'GEO Score per page' : 'GEO Score per pagina',
      desc: locale === 'en'
        ? 'Each page gets a score from 0 to 100. See what works and where to improve. The analysis runs entirely in PHP on your own server — no data leaves your site.'
        : 'Elke pagina krijgt een score van 0 tot 100. Zie wat goed gaat en waar je kunt verbeteren. De analyse draait volledig in PHP op je eigen server — er verlaat geen data je site.'
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: locale === 'en' ? '30+ optimization checks' : '30+ optimalisatiechecks',
      desc: locale === 'en'
        ? 'Schema.org markup, FAQ structure, internal links, E-E-A-T signals, content quality and more. Every check shows what AI search engines need to recommend your page.'
        : 'Schema.org markup, FAQ-structuur, interne links, E-E-A-T-signalen, contentkwaliteit en meer. Elke check laat zien wat AI-zoekmachines nodig hebben om jouw pagina aan te bevelen.'
    },
    {
      icon: <Bot className="w-5 h-5" />,
      title: locale === 'en' ? 'AI Bot Tracking' : 'AI Bot Tracking',
      desc: locale === 'en'
        ? 'See which AI bots visit your site: GPTBot, ClaudeBot, PerplexityBot, GoogleOther and more. Including which pages they crawl and how often.'
        : 'Zie welke AI-bots je site bezoeken: GPTBot, ClaudeBot, PerplexityBot, GoogleOther en meer. Inclusief welke pagina\'s ze crawlen en hoe vaak.'
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: locale === 'en' ? 'Referral Analytics' : 'Verwijzingsanalyse',
      desc: locale === 'en'
        ? 'How many visitors arrive via ChatGPT, Perplexity, Gemini or Copilot? Tracked automatically, including which pages receive the most AI-driven traffic.'
        : 'Hoeveel bezoekers komen er via ChatGPT, Perplexity, Gemini of Copilot? Automatisch geregistreerd, inclusief welke pagina\'s het meeste AI-verkeer ontvangen.'
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: locale === 'en' ? 'Smart prompt suggestions' : 'Slimme promptsuggesties',
      desc: locale === 'en'
        ? 'Based on your focus keyword, industry and location, the plugin generates commercial prompts — the exact queries real users ask AI platforms.'
        : 'Op basis van je focus-keyword, branche en locatie genereert de plugin commerciële prompts — precies de zoekopdrachten waarmee gebruikers AI-platforms bevragen.'
    },
    {
      icon: <Puzzle className="w-5 h-5" />,
      title: locale === 'en' ? 'SEO plugin integration' : 'SEO plugin integratie',
      desc: locale === 'en'
        ? 'Works with Yoast SEO, Rank Math, SEOPress and All in One SEO. Focus keywords are automatically used for prompt generation.'
        : 'Werkt met Yoast SEO, Rank Math, SEOPress en All in One SEO. Focus-keywords worden automatisch overgenomen voor de promptgeneratie.'
    },
  ];

  const steps = [
    {
      title: locale === 'en' ? 'Install the plugin' : 'Installeer de plugin',
      desc: locale === 'en'
        ? 'Download from WordPress.org or search "Teun.ai GEO" in your WordPress plugin directory.'
        : 'Download via WordPress.org of zoek "Teun.ai GEO" in je WordPress plugin overzicht.'
    },
    {
      title: locale === 'en' ? 'Set your industry' : 'Stel je branche in',
      desc: locale === 'en'
        ? 'Enter your industry and location under Settings → Teun.ai GEO. This is used for smart prompt generation.'
        : 'Vul je branche en locatie in onder Instellingen → Teun.ai GEO. Dit wordt gebruikt voor slimme promptgeneratie.'
    },
    {
      title: locale === 'en' ? 'Analyze your pages' : 'Analyseer je pagina\'s',
      desc: locale === 'en'
        ? 'Open any page in the editor and view the GEO analysis in the sidebar. Follow the recommendations to improve.'
        : 'Open een pagina in de editor en bekijk de GEO-analyse in de zijbalk. Volg de aanbevelingen om te verbeteren.'
    },
  ];

  const faqs = locale === 'en' ? [
    { q: 'Does the plugin slow down my website?', a: 'No. The analysis only runs in the WordPress admin, never on the frontend. Your visitors won\'t notice a thing.' },
    { q: 'Which AI bots are tracked?', a: 'GPTBot (OpenAI), ChatGPT-User, ClaudeBot (Anthropic), PerplexityBot, Google-Extended, Gemini, Microsoft Copilot, Apple AI and more. The list is continuously updated.' },
    { q: 'Do I need a Teun.ai account?', a: 'Not for the core features. Install the plugin and start analyzing immediately. A Teun.ai account is only needed if you want to use the online live scanning tools.' },
    { q: 'Does it work with page builders?', a: 'Yes. The plugin includes specialized content extraction that works with AVADA, Elementor, WPBakery and other builders. The Classic Editor and Block Editor are both fully supported.' },
    { q: 'How is GEO different from SEO?', a: 'SEO optimizes for Google Search results. GEO optimizes for AI search engines like ChatGPT and Perplexity. They evaluate different signals: structured data, authority, entities, and citable content. Both are essential for modern visibility.' },
  ] : [
    { q: 'Vertraagt de plugin mijn website?', a: 'Nee. De analyse draait alleen in de WordPress-admin, nooit op de frontend. Bezoekers merken er niets van.' },
    { q: 'Welke AI-bots worden gevolgd?', a: 'GPTBot (OpenAI), ChatGPT-User, ClaudeBot (Anthropic), PerplexityBot, Google-Extended, Gemini, Microsoft Copilot, Apple AI en meer. De lijst wordt continu bijgewerkt.' },
    { q: 'Heb ik een Teun.ai-account nodig?', a: 'Niet voor de basisfuncties. Installeer de plugin en begin direct met analyseren. Een Teun.ai-account is alleen nodig als je de online live scanning tools wilt gebruiken.' },
    { q: 'Werkt het met pagebuilders?', a: 'Ja. De plugin bevat speciale content-extractie die werkt met AVADA, Elementor, WPBakery en andere builders. De Classic Editor en Block Editor worden beide volledig ondersteund.' },
    { q: 'Wat is het verschil tussen GEO en SEO?', a: 'SEO optimaliseert voor Google-zoekresultaten. GEO optimaliseert voor AI-zoekmachines zoals ChatGPT en Perplexity. Die beoordelen andere signalen: gestructureerde data, autoriteit, entiteiten en citeerbare content. Beide zijn essentieel voor moderne zichtbaarheid.' },
  ];

  const compatibleWith = [
    { name: 'Yoast SEO', color: 'bg-green-100 text-green-700' },
    { name: 'Rank Math', color: 'bg-purple-100 text-purple-700' },
    { name: 'SEOPress', color: 'bg-blue-100 text-blue-700' },
    { name: 'All in One SEO', color: 'bg-amber-100 text-amber-700' },
    { name: 'Classic Editor', color: 'bg-slate-100 text-slate-700' },
    { name: 'Block Editor', color: 'bg-slate-100 text-slate-700' },
    { name: 'AVADA', color: 'bg-orange-100 text-orange-700' },
    { name: 'Elementor', color: 'bg-pink-100 text-pink-700' },
  ];

  return (
    <div className="bg-white">

      {/* ====== HERO SECTION ====== */}
      <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        </div>

        {/* Desktop Mascotte */}
        <div className="hidden lg:block absolute right-[5%] xl:right-[10%] bottom-0 z-10 pointer-events-none select-none">
          <Image
            src="/mascotte-teun-ai.png"
            alt="Teun - AI Visibility Mascotte"
            width={340}
            height={430}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-12 lg:pt-20">
          <div className="grid lg:grid-cols-5 gap-8 items-end">
            <div className="lg:col-span-3 pb-12 lg:pb-24">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 shadow-sm mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                WordPress.org {locale === 'en' ? 'approved' : 'goedgekeurd'}
              </div>

              <h1 className="text-[1.7rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-slate-900 leading-tight mb-6">
                {locale === 'en' ? (
                  <>WordPress plugin for <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI visibility</span></>
                ) : (
                  <>WordPress plugin voor <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI-zichtbaarheid</span></>
                )}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 mb-4 max-w-xl">
                {locale === 'en'
                  ? 'Are ChatGPT, Perplexity and Google AI recommending your content? Analyze every page right inside your WordPress editor.'
                  : 'Wordt jouw content aanbevolen door ChatGPT, Perplexity en Google AI? Analyseer elke pagina direct vanuit je WordPress-editor.'}
              </p>
              <p className="text-sm font-medium text-slate-700 mb-8">
                {locale === 'en'
                  ? 'Free. No API key. No external data transfer.'
                  : 'Gratis. Geen API-sleutel. Geen externe dataoverdracht.'}
              </p>

              {/* Mobile Mascotte */}
              <div className="lg:hidden flex justify-center mb-8">
                <Image
                  src="/mascotte-teun-ai.png"
                  alt="Teun - AI Visibility Mascotte"
                  width={220}
                  height={280}
                  className="drop-shadow-xl"
                  priority
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <a
                  href="https://wordpress.org/plugins/teunai-geo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  {locale === 'en' ? 'Download on WordPress.org' : 'Download op WordPress.org'}
                </a>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                v2.1.0 · WordPress 6.0+ · PHP 8.0+
              </p>
            </div>

            <div className="hidden lg:block lg:col-span-2 min-h-[450px]"></div>
          </div>
        </div>
      </section>

      {/* ====== STATS BAR ====== */}
      <section className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center items-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">30+</div>
              <div className="text-sm text-white/70">{locale === 'en' ? 'GEO checks' : 'GEO checks'}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">12+</div>
              <div className="text-sm text-white/70">{locale === 'en' ? 'AI bots tracked' : 'AI-bots getrackt'}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">0</div>
              <div className="text-sm text-white/70">{locale === 'en' ? 'External API calls' : 'Externe API calls'}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-1">{locale === 'en' ? 'Free' : 'Gratis'}</div>
              <div className="text-sm text-white/70">{locale === 'en' ? 'All features included' : 'Alle functies inbegrepen'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {locale === 'en' ? 'What does the plugin do?' : 'Wat doet de plugin?'}
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              {locale === 'en'
                ? 'Everything you need to understand and improve your AI visibility, directly inside WordPress.'
                : 'Alles wat je nodig hebt om je AI-zichtbaarheid te begrijpen en verbeteren, direct vanuit WordPress.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== HOE HET WERKT ====== */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {locale === 'en' ? 'How it works' : 'Hoe het werkt'}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="text-4xl font-bold text-[#1E1E3F]">{i + 1}.</div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 mb-2">{step.title}</p>
                    <p className="text-slate-600">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== COMPATIBLE WITH ====== */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            {locale === 'en' ? (
              <>Works with your <span className="text-amber-600">existing setup</span></>
            ) : (
              <>Werkt met je <span className="text-amber-600">bestaande setup</span></>
            )}
          </h2>
          <p className="text-slate-600 mb-10 max-w-xl mx-auto">
            {locale === 'en'
              ? 'The plugin integrates seamlessly with popular SEO plugins, editors and page builders.'
              : 'De plugin integreert naadloos met populaire SEO-plugins, editors en pagebuilders.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {compatibleWith.map((item, i) => (
              <span key={i} className={`px-4 py-2 rounded-full text-sm font-medium ${item.color}`}>
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====== NO HIDDEN COSTS ====== */}
      <section className="py-20 bg-gradient-to-br from-slate-100 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            {locale === 'en' ? (
              <>No hidden costs, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">no limits</span></>
            ) : (
              <>Geen verborgen kosten, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">geen limieten</span></>
            )}
          </h2>
          <p className="text-slate-600 leading-relaxed mb-6 max-w-xl mx-auto">
            {locale === 'en'
              ? 'The full analysis runs locally on your own server. No API calls, no premium wall. All 30+ checks, AI bot tracking and referral analytics are completely free.'
              : 'De volledige analyse draait lokaal op je eigen server. Geen API-aanroepen, geen premium-wall. Alle 30+ checks, het AI-bot tracking en de verwijzingsanalyse zijn volledig gratis.'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-2xl mx-auto">
            {(locale === 'en' ? ['No API calls', 'No usage limits', 'No premium wall', 'No data transfer'] : ['Geen API calls', 'Geen limieten', 'Geen premium-wall', 'Geen dataoverdracht']).map((item, i) => (
              <div key={i} className="flex items-center gap-2 justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 font-medium">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-slate-500 text-sm mb-8 max-w-lg mx-auto">
            {locale === 'en'
              ? 'Want to test whether AI search engines actually recommend your business? Try our free AI Visibility tool.'
              : 'Wil je testen of AI-zoekmachines jouw bedrijf daadwerkelijk aanbevelen? Probeer onze gratis AI Visibility tool.'}
          </p>

          <Link
            href="/tools/ai-visibility"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:shadow-md hover:border-slate-300 transition-all"
          >
            {locale === 'en' ? 'Test your AI visibility' : 'Test je AI-zichtbaarheid'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ====== CTA BANNER ====== */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] rounded-3xl overflow-hidden shadow-xl">
            <div className="p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                {locale === 'en'
                  ? 'Ready to optimize your pages for AI?'
                  : 'Klaar om je pagina\'s te optimaliseren voor AI?'}
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
                {locale === 'en'
                  ? 'Install the plugin and get your first GEO Score within minutes.'
                  : 'Installeer de plugin en ontvang je eerste GEO Score binnen enkele minuten.'}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="https://wordpress.org/plugins/teunai-geo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  {locale === 'en' ? 'Download free plugin' : 'Download gratis plugin'}
                </a>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  {locale === 'en' ? 'Read about GEO' : 'Lees over GEO'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FAQ SECTION ====== */}
      <section className="py-20 bg-slate-50 relative overflow-visible">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
                {locale === 'en' ? 'Frequently asked questions' : 'Veelgestelde vragen'}
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

            <div className="hidden lg:flex justify-center items-end relative">
              <div className="translate-y-20">
                <Image
                  src="/teun-ai-mascotte.png"
                  alt={locale === 'en' ? 'Teun helps you' : 'Teun helpt je'}
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
