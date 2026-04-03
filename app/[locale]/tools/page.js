// app/[locale]/tools/page.js
import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ArrowRight } from 'lucide-react'
import { getGrowingStats } from '@/lib/stats'
import ToolsFAQ from './ToolsFAQ'
import ToolsVideo from './ToolsVideo'

export async function generateMetadata() {
  const locale = await getLocale()
  const isEn = locale === 'en'
  const title = isEn
    ? '7 Free AI Visibility Tools - Teun.ai'
    : '7 Gratis AI-zichtbaarheid Tools - Teun.ai'
  const description = isEn
    ? 'Free tools to measure and improve your visibility in ChatGPT, Perplexity, Google AI Mode and AI Overviews.'
    : 'Gratis tools om je zichtbaarheid te meten en verbeteren in ChatGPT, Perplexity, Google AI Mode en AI Overviews.'
  const url = isEn ? 'https://teun.ai/en/tools' : 'https://teun.ai/tools'
  return {
    title, description,
    openGraph: { title, description, url, siteName: 'Teun.ai', type: 'website', locale: isEn ? 'en_GB' : 'nl_NL' },
    alternates: { canonical: url, languages: { nl: 'https://teun.ai/tools', en: 'https://teun.ai/en/tools' } },
    robots: { index: true, follow: true },
  }
}

export default async function ToolsPage() {
  const locale = await getLocale()
  const isNL = locale === 'nl'
  const stats = getGrowingStats()

  const tools = [
    {
      title: isNL ? 'AI Zichtbaarheid Scan' : 'AI Visibility Scan',
      subtitle: isNL ? 'Scan 4 AI-platformen tegelijk' : 'Scan 4 AI platforms simultaneously',
      description: isNL
        ? 'Vul je website in en ontdek binnen 60 seconden of je gevonden wordt in ChatGPT, Perplexity, Google AI Mode en AI Overviews. Je krijgt 10 commerciele prompts, per prompt het volledige AI-antwoord, en een concurrentie-overzicht met alle bedrijven die wel genoemd worden.'
        : 'Enter your website and discover within 60 seconds if you\'re found in ChatGPT, Perplexity, Google AI Mode and AI Overviews. You get 10 commercial prompts, the full AI response per prompt, and a competitor overview.',
      href: '/tools/ai-visibility',
      cta: isNL ? 'Start gratis scan' : 'Start free scan',
      video: '/Teun.ai-AI-zichtbaarheidsanalyse.mp4',
      poster: '/Teun.ai-AI-zichtbaarheidsanalyse-poster.webp',
      tag: isNL ? 'Meest gebruikt' : 'Most popular',
    },
    {
      title: 'AI Prompt Discovery',
      subtitle: isNL ? 'Welke AI-prompts leiden al naar jouw site?' : 'Which AI prompts already lead to your site?',
      description: isNL
        ? 'Koppel je Google Search Console en ontdek automatisch op welke conversatie-achtige zoekopdrachten je al zichtbaar bent. We categoriseren ze in commerciele prompts, Google AI Overview queries en overige. Geen account nodig.'
        : 'Connect your Google Search Console and discover which conversational queries already find you. We categorize them into commercial prompts, AI Overview queries, and other. No account needed.',
      href: '/tools/ai-prompt-discovery',
      cta: isNL ? 'Koppel Search Console' : 'Connect Search Console',
      video: null, poster: null,
      tag: isNL ? 'Nieuw' : 'New',
    },
    {
      title: 'AI Rank Tracker',
      subtitle: isNL ? 'Waar sta je in ChatGPT en Perplexity?' : 'Where do you rank in ChatGPT and Perplexity?',
      description: isNL
        ? 'Voer een zoekwoord en servicegebied in en zie direct op welke positie jouw bedrijf staat in de AI-antwoorden van ChatGPT en Perplexity. Herhaal periodiek en volg of je stijgt of daalt.'
        : 'Enter a keyword and service area, and instantly see where your business ranks in AI responses from ChatGPT and Perplexity. Repeat periodically and track your movement.',
      href: '/tools/ai-rank-tracker',
      cta: isNL ? 'Check je ranking' : 'Check your ranking',
      video: null, poster: null,
    },
    {
      title: 'AI Brand Check',
      subtitle: isNL ? 'Wat zegt AI over jouw bedrijf?' : 'What does AI say about your business?',
      description: isNL
        ? 'Ontdek wat ChatGPT en Perplexity over jouw bedrijf zeggen. We stellen 3 commerciele vragen over ervaringen, reviews en service op beide platformen. Je krijgt sentimentanalyse en concrete verbeterpunten.'
        : 'Discover what ChatGPT and Perplexity say about your business. We ask 3 commercial questions about experiences, reviews and service on both platforms. You get sentiment analysis and actionable tips.',
      href: '/tools/brand-check',
      cta: isNL ? 'Check je merk' : 'Check your brand',
      video: null, poster: null,
    },
    {
      title: 'GEO Audit',
      subtitle: isNL ? 'Hoe AI-klaar is jouw pagina?' : 'How AI-ready is your page?',
      description: isNL
        ? 'Voer een URL in en krijg een volledige analyse van je pagina op AI-gereedheid. We checken technische fundamenten, content kwaliteit, schema markup en doen een live Perplexity test. Score per categorie met concrete verbeterpunten.'
        : 'Enter a URL and get a full analysis of your page\'s AI readiness. We check technical foundations, content quality, schema markup and run a live Perplexity test. Score per category with actionable improvements.',
      href: '/tools/geo-audit',
      cta: isNL ? 'Audit je pagina' : 'Audit your page',
      video: null, poster: null,
    },
    {
      title: 'AI Prompt Explorer',
      subtitle: isNL ? 'Ontdek 50+ prompts met zoekvolumes' : 'Discover 50+ prompts with search volumes',
      description: isNL
        ? 'Voer je website of zoekwoorden in en krijg 50+ natuurlijke zoekvragen die echte mensen typen in AI-platformen. Inclusief geschat maandelijks zoekvolume per prompt. Selecteer de beste en scan ze direct.'
        : 'Enter your website or keywords and get 50+ natural queries that real people type into AI platforms. Including estimated monthly search volume per prompt. Select the best and scan them directly.',
      href: '/tools/ai-prompt-explorer',
      cta: isNL ? 'Ontdek prompts' : 'Discover prompts',
      video: null, poster: null,
      tag: 'BETA',
    },
    {
      title: isNL ? 'GEO Analyse PRO' : 'GEO Analysis PRO',
      subtitle: isNL ? 'Compleet dashboard met Search Console' : 'Complete dashboard with Search Console',
      description: isNL
        ? 'Het volledige platform voor serieuze GEO-optimalisatie. Koppel je Search Console, krijg AI-gegenereerd advies per pagina, monitor je voortgang over tijd, en gebruik alle tools onbeperkt. Voor bureaus en bedrijven die structureel werken aan AI-zichtbaarheid.'
        : 'The complete platform for serious GEO optimization. Connect your Search Console, get AI-generated advice per page, monitor progress over time, and use all tools unlimited. For agencies and businesses working structurally on AI visibility.',
      href: '/pricing',
      cta: isNL ? 'Bekijk Pro' : 'View Pro',
      video: null, poster: null,
      tag: 'PRO',
    },
  ]

  const faqItems = isNL ? [
    { q: 'Zijn de tools echt gratis?', a: 'Ja, 6 van de 7 tools zijn volledig gratis. Alleen de GEO Analyse is een Pro functie (€49,95/maand). Voor de gratis tools heb je voor de meeste niet eens een account nodig.' },
    { q: 'Welke AI-platformen worden gescand?', a: 'We scannen ChatGPT (via de officiële Search API), Perplexity (via sonar-pro), Google AI Mode en Google AI Overviews. Niet elke tool scant alle platformen.' },
    { q: 'Heb ik een account nodig?', a: 'Voor de AI Visibility Scan, Brand Check en Prompt Discovery niet. Voor het opslaan van resultaten en de GEO Analyse is een gratis account nodig.' },
    { q: 'Wat is het verschil met Otterly.ai of Peec?', a: 'Bij Teun.ai kun je echt GEO-optimaliseren: niet alleen meten, maar ook verbeteren met concrete adviezen per pagina. We bieden 6 gratis tools waar concurrenten vaak direct betaald zijn. Plus een WordPress plugin en Chrome extensie die andere platforms niet hebben.' },
    { q: 'Wat kost Pro?', a: 'Pro kost €49,95 per maand (maandelijks opzegbaar) of €39,95 per maand bij jaarabonnement. Je krijgt toegang tot de GEO Analyse, onbeperkte scans, en Search Console integratie.' },
  ] : [
    { q: 'Are the tools really free?', a: 'Yes, 6 of 7 tools are completely free. Only GEO Analysis is a Pro feature (€49.95/month). For most free tools you don\'t even need an account.' },
    { q: 'Which AI platforms are scanned?', a: 'We scan ChatGPT (official Search API), Perplexity (sonar-pro), Google AI Mode and AI Overviews. Not every tool scans all platforms.' },
    { q: 'Do I need an account?', a: 'Not for AI Visibility Scan, Brand Check or Prompt Discovery. For saving results and GEO Analysis, a free account is needed.' },
    { q: 'How does this compare to Otterly.ai or Peec?', a: 'Teun.ai lets you actually optimize for GEO: not just measure, but improve with concrete advice per page. We offer 6 free tools where competitors are often paid from the start. Plus a WordPress plugin and Chrome extension other platforms don\'t have.' },
    { q: 'What does Pro cost?', a: 'Pro costs €49.95/month (cancel anytime) or €39.95/month annual. You get GEO Analysis, unlimited scans, and Search Console integration.' },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center">
        <p className="text-sm text-slate-500 mb-4">{isNL ? `${stats.scans} scans uitgevoerd` : `${stats.scans} scans completed`}</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
          {isNL
            ? <>Alle tools voor<br /><span className="text-[#7C3AED]">AI-zichtbaarheid</span></>
            : <>All tools for<br /><span className="text-[#7C3AED]">AI visibility</span></>}
        </h1>
        <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto mb-8">
          {isNL
            ? 'Meet, monitor en verbeter je zichtbaarheid in ChatGPT, Perplexity, Google AI Mode en AI Overviews. 6 tools gratis, geen account nodig.'
            : 'Measure, monitor and improve your visibility in ChatGPT, Perplexity, Google AI Mode and AI Overviews. 6 tools free, no account needed.'}
        </p>
        <Link href="/tools/ai-visibility"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#292956] text-white rounded-xl font-semibold hover:bg-[#1e1e45] transition-all">
          {isNL ? 'Start gratis scan' : 'Start free scan'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ── TOOLS ── */}
      {tools.map((tool, i) => {
        const isEven = i % 2 === 0

        return (
          <section key={i} className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">

                {/* Tekst */}
                <div className={!isEven ? 'lg:order-2' : ''}>
                  {tool.tag && (
                    <span className={`inline-block text-xs font-bold uppercase tracking-wider mb-3 px-2.5 py-1 rounded-full ${
                      tool.tag === 'PRO' ? 'bg-[#292956] text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}>{tool.tag}</span>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{tool.title}</h2>
                  <p className="text-[#7C3AED] font-medium mb-4">{tool.subtitle}</p>
                  <p className="text-slate-600 leading-relaxed mb-6">{tool.description}</p>
                  <Link href={tool.href}
                    className="inline-flex items-center gap-2 text-[#292956] font-semibold hover:gap-3 transition-all">
                    {tool.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Video */}
                <div className={`mt-6 lg:mt-0 ${!isEven ? 'lg:order-1' : ''}`}>
                  {tool.video ? (
                    <ToolsVideo src={tool.video} poster={tool.poster} alt={tool.title} />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                      <p className="text-sm text-slate-400">{isNL ? 'Video binnenkort' : 'Video coming soon'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )
      })}

      {/* ── WORDPRESS PLUGIN ── */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">WordPress Plugin</h2>
          <p className="text-slate-600 mb-6">
            {isNL
              ? 'Gratis GEO analyser direct in je WordPress dashboard. Beschikbaar op wordpress.org.'
              : 'Free GEO analyzer directly in your WordPress dashboard. Available on wordpress.org.'}
          </p>
          <Link href="/wordpress-plugin"
            className="inline-flex items-center gap-2 text-[#292956] font-semibold hover:gap-3 transition-all">
            {isNL ? 'Bekijk plugin' : 'View plugin'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            {isNL
              ? <>Klaar om je AI-zichtbaarheid <span className="text-[#7C3AED]">te meten?</span></>
              : <>Ready to measure your <span className="text-[#7C3AED]">AI visibility?</span></>}
          </h2>
          <p className="text-slate-600 mb-8">
            {isNL
              ? 'Start met een gratis AI Zichtbaarheid Scan. Geen account nodig, resultaat in 60 seconden.'
              : 'Start with a free AI Visibility Scan. No account needed, result in 60 seconds.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/tools/ai-visibility"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#292956] text-white rounded-xl font-semibold hover:bg-[#1e1e45] transition-all">
              {isNL ? 'Gratis scannen' : 'Scan for free'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-slate-400 transition-all">
              {isNL ? 'Bekijk Pro' : 'View Pro'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <ToolsFAQ items={faqItems} locale={locale} />
    </div>
  )
}
