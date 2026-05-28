// app/[locale]/tools/page.js
import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getGrowingStats } from '@/lib/stats'
import ToolsFAQ from './ToolsFAQ'
import ToolsVideo from './ToolsVideo'

export async function generateMetadata() {
  const locale = await getLocale()
  const isEn = locale === 'en'
  const title = isEn
    ? '7 Free AI Visibility Tools for ChatGPT & Google AI'
    : '7 Gratis AI-zichtbaarheid Tools voor ChatGPT & Google AI'
  const description = isEn
    ? 'Free tools to measure and improve your visibility in ChatGPT, Perplexity, Google AI Mode and AI Overviews. No account needed.'
    : 'Gratis tools om je zichtbaarheid te meten en verbeteren in ChatGPT, Perplexity, Google AI Mode en AI Overviews. Geen account nodig.'
  const url = isEn ? 'https://teun.ai/en/tools' : 'https://teun.ai/tools'
  return {
    title: { absolute: title },
    description,
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
      em: isNL ? 'AI-platformen' : 'AI platforms',
      subtitle: isNL ? 'Scan 4 AI-platformen tegelijk' : 'Scan 4 AI platforms simultaneously',
      description: isNL
        ? 'Vul je website in en ontdek binnen 60 seconden of je gevonden wordt in ChatGPT, Perplexity, Google AI Mode en AI Overviews. Je krijgt 10 commerciele prompts, per prompt het volledige AI-antwoord, en een concurrentie-overzicht met alle bedrijven die wel genoemd worden.'
        : 'Enter your website and discover within 60 seconds if you\'re found in ChatGPT, Perplexity, Google AI Mode and AI Overviews. You get 10 commercial prompts, the full AI response per prompt, and a competitor overview.',
      href: '/tools/ai-visibility',
      cta: isNL ? 'Start gratis scan' : 'Start free scan',
      video: '/Teun.ai-AI-zichtbaarheidsanalyse.mp4',
      poster: '/Teun.ai-AI-zichtbaarheidsanalyse-poster.webp',
      tag: isNL ? 'Meest gebruikt' : 'Most popular',
      tagVariant: 'success',
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
      video: '/Teun.ai-AI-brand-check.mp4',
      poster: '/Teun.ai-AI-brand-check-poster.webp',
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
      subtitle: isNL ? '10 commerciële AI zoekvragen met volumes' : '10 commercial AI search queries with volumes',
      description: isNL
        ? 'Voer je website in en krijg 10 commerciële AI zoekvragen die jouw potentiële klanten gebruiken in ChatGPT, Perplexity en Google AI. Inclusief geschat zoekvolume en trend per zoekvraag.'
        : 'Enter your website and get 10 commercial AI search queries your potential customers use in ChatGPT, Perplexity and Google AI. Including estimated search volume and trend per query.',
      href: '/tools/ai-prompt-explorer',
      cta: isNL ? 'Toon mijn AI zoekvragen' : 'Show my AI queries',
      video: null, poster: null,
    },
    {
      title: isNL ? 'GEO Optimalisatie DIY' : 'GEO Optimization DIY',
      subtitle: isNL ? 'Compleet dashboard met Search Console' : 'Complete dashboard with Search Console',
      description: isNL
        ? 'Het volledige platform voor serieuze GEO-optimalisatie. Koppel je Search Console, krijg AI-gegenereerd advies per pagina, monitor je voortgang over tijd, en gebruik alle tools onbeperkt. Voor bureaus en bedrijven die structureel werken aan AI-zichtbaarheid.'
        : 'The complete platform for serious GEO optimization. Connect your Search Console, get AI-generated advice per page, monitor progress over time, and use all tools unlimited. For agencies and businesses working structurally on AI visibility.',
      href: '/pricing',
      cta: isNL ? 'Bekijk Pro' : 'View Pro',
      video: null, poster: null,
      tag: 'PRO',
      tagVariant: 'navy',
    },
  ]

  const faqItems = isNL ? [
    { cat: 'pricing', q: 'Zijn de tools echt gratis?', a: 'Ja, 6 van de 7 tools zijn volledig gratis te gebruiken, voor de meeste heb je niet eens een account nodig. Met Pro (€49,95/maand) kun je zelf je pagina\'s optimaliseren via GEO Optimalisatie DIY en gebruik je alle tools onbeperkt.' },
    { cat: 'product', q: 'Welke AI-platformen worden gescand?', a: 'We scannen ChatGPT (via de officiële Search API), Perplexity (via sonar-pro), Google AI Mode en Google AI Overviews. Niet elke tool scant alle platformen.' },
    { cat: 'product', q: 'Heb ik een account nodig?', a: 'Voor de AI Visibility Scan, Brand Check en AI Prompt Explorer niet. Voor het opslaan van resultaten en GEO Optimalisatie DIY is een gratis account nodig.' },
    { cat: 'product', q: 'Wat is het verschil met Otterly.ai of Peec?', a: 'Bij Teun.ai kun je echt GEO-optimaliseren: niet alleen meten, maar ook verbeteren met concrete adviezen per pagina. We bieden 6 gratis tools waar concurrenten vaak direct betaald zijn. Plus een WordPress plugin en Chrome extensie die andere platforms niet hebben.' },
    { cat: 'pricing', q: 'Wat kost Pro?', a: 'Pro kost €49,95 per maand (maandelijks opzegbaar) of €39,95 per maand bij jaarabonnement. Je krijgt GEO Optimalisatie DIY om zelf je pagina\'s te optimaliseren, onbeperkte scans op alle tools, en Search Console integratie.' },
  ] : [
    { cat: 'pricing', q: 'Are the tools really free?', a: 'Yes, 6 of 7 tools are completely free, most don\'t even require an account. With Pro (€49.95/month) you can optimize your pages yourself via GEO Optimization DIY and use all tools unlimited.' },
    { cat: 'product', q: 'Which AI platforms are scanned?', a: 'We scan ChatGPT (official Search API), Perplexity (sonar-pro), Google AI Mode and AI Overviews. Not every tool scans all platforms.' },
    { cat: 'product', q: 'Do I need an account?', a: 'Not for AI Visibility Scan, Brand Check or AI Prompt Explorer. For saving results and GEO Optimization DIY, a free account is needed.' },
    { cat: 'product', q: 'How does this compare to Otterly.ai or Peec?', a: 'Teun.ai lets you actually optimize for GEO: not just measure, but improve with concrete advice per page. We offer 6 free tools where competitors are often paid from the start. Plus a WordPress plugin and Chrome extension other platforms don\'t have.' },
    { cat: 'pricing', q: 'What does Pro cost?', a: 'Pro costs €49.95/month (cancel anytime) or €39.95/month annual. You get GEO Optimization DIY to optimize your pages yourself, unlimited scans on all tools, and Search Console integration.' },
  ]

  return (
    <div className="tool-page tov-page">

      {/* ── HERO ── */}
      <section className="tov-hero">
        <div className="tool-eyebrow">{isNL ? 'ALLE TOOLS' : 'ALL TOOLS'}</div>
        <h1 className="tov-h1">
          {isNL ? (
            <>Alle tools voor<br /><em>AI-zichtbaarheid</em></>
          ) : (
            <>All tools for<br /><em>AI visibility</em></>
          )}
        </h1>
        <p className="tov-hero-sub">
          {isNL
            ? 'Meet, monitor en verbeter je zichtbaarheid in ChatGPT, Perplexity, Google AI Mode en AI Overviews. 6 tools gratis, geen account nodig.'
            : 'Measure, monitor and improve your visibility in ChatGPT, Perplexity, Google AI Mode and AI Overviews. 6 tools free, no account needed.'}
        </p>
        <div className="tov-hero-cta">
          <Link href="/tools/ai-visibility" className="teun-scan-btn tov-hero-btn">
            {isNL ? 'Start gratis scan' : 'Start free scan'} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="tov-hero-meta">
          {isNL ? `${stats.scans.toLocaleString('nl-NL')} scans uitgevoerd` : `${stats.scans.toLocaleString('en-US')} scans completed`}
        </p>
      </section>

      {/* ── TOOLS ── */}
      {tools.map((tool, i) => {
        const isEven = i % 2 === 0
        return (
          <section key={i} className={`tov-tool ${i % 2 === 1 ? 'tov-tool-alt' : ''}`}>
            <div className="tov-tool-wrap">
              <div className={`tov-tool-grid ${!isEven ? 'tov-tool-grid-flip' : ''}`}>

                {/* Text */}
                <div className="tov-tool-text">
                  {tool.tag && (
                    <span className={`tov-tool-tag tov-tool-tag-${tool.tagVariant || 'success'}`}>
                      {tool.tag}
                    </span>
                  )}
                  <h2 className="tov-tool-title">{tool.title}</h2>
                  <p className="tov-tool-subtitle">{tool.subtitle}</p>
                  <p className="tov-tool-desc">{tool.description}</p>
                  <Link href={tool.href} className="tov-tool-link">
                    {tool.cta} <span aria-hidden="true">→</span>
                  </Link>
                </div>

                {/* Video / placeholder */}
                <div className="tov-tool-media">
                  {tool.video ? (
                    <ToolsVideo src={tool.video} poster={tool.poster} alt={tool.title} />
                  ) : (
                    <div className="tov-tool-placeholder">
                      <p>{isNL ? 'Video binnenkort' : 'Video coming soon'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )
      })}

      {/* ── FINAL CTA ── */}
      <section className="teun-final" aria-labelledby="tov-final-heading">
        <div className="wrap">
          <h2 id="tov-final-heading">
            {isNL ? (
              <>Stop met <em>gokken</em>.<br />Begin met meten.</>
            ) : (
              <>Stop <em>guessing</em>.<br />Start measuring.</>
            )}
          </h2>
          <p>
            {isNL
              ? 'Start met een gratis AI Zichtbaarheid Scan. Geen account nodig, resultaat in 60 seconden.'
              : 'Start with a free AI Visibility Scan. No account needed, result in 60 seconds.'}
          </p>
          <div className="btns">
            <Link href="/tools/ai-visibility" className="btn-primary">
              {isNL ? 'Gratis scannen' : 'Scan for free'} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/pricing" className="btn-secondary">
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
