// app/[locale]/wordpress-plugin/page.js
// WordPress Plugin — Teun.ai GEO landing page
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'

export default function WordPressPluginPage() {
  const locale = useLocale()
  const isNL = locale === 'nl'
  const [openFaq, setOpenFaq] = useState(0)

  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3v18h18"/><path d="M7 16l4-8 4 6 5-10"/>
        </svg>
      ),
      title: isNL ? 'GEO Score per pagina' : 'GEO Score per page',
      desc: isNL
        ? 'Elke pagina krijgt een score van 0 tot 100. Zie wat goed gaat en waar je kunt verbeteren. De analyse draait volledig in PHP op je eigen server, er verlaat geen data je site.'
        : 'Each page gets a score from 0 to 100. See what works and where to improve. The analysis runs entirely in PHP on your own server, no data leaves your site.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      title: isNL ? '30+ optimalisatiechecks' : '30+ optimization checks',
      desc: isNL
        ? 'Schema.org markup, FAQ-structuur, interne links, E-E-A-T signalen, contentkwaliteit en meer. Elke check laat zien wat AI-zoekmachines nodig hebben om jouw pagina aan te bevelen.'
        : 'Schema.org markup, FAQ structure, internal links, E-E-A-T signals, content quality and more. Every check shows what AI search engines need to recommend your page.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="16" x2="16" y1="16" y2="16"/>
        </svg>
      ),
      title: isNL ? 'AI Bot Tracking' : 'AI Bot Tracking',
      desc: isNL
        ? 'Zie welke AI-bots je site bezoeken, GPTBot, ClaudeBot, PerplexityBot, GoogleOther en meer. Inclusief welke pagina\'s ze crawlen en hoe vaak.'
        : 'See which AI bots visit your site, GPTBot, ClaudeBot, PerplexityBot, GoogleOther and more. Including which pages they crawl and how often.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      ),
      title: isNL ? 'Verwijzingsanalyse' : 'Referral Analytics',
      desc: isNL
        ? 'Hoeveel bezoekers komen er via ChatGPT, Perplexity, Gemini of Copilot? Automatisch geregistreerd, inclusief welke pagina\'s het meeste AI-verkeer ontvangen.'
        : 'How many visitors arrive via ChatGPT, Perplexity, Gemini or Copilot? Tracked automatically, including which pages receive the most AI-driven traffic.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l1.9 5.8h6L15 12.4l1.9 5.8L12 14.6l-4.9 3.6L9 12.4 4.1 8.8h6z"/>
        </svg>
      ),
      title: isNL ? 'Slimme promptsuggesties' : 'Smart prompt suggestions',
      desc: isNL
        ? 'Op basis van je focus-keyword, branche en locatie genereert de plugin commerciële prompts, precies de zoekopdrachten waarmee gebruikers AI-platforms bevragen.'
        : 'Based on your focus keyword, industry and location, the plugin generates commercial prompts, the exact queries real users ask AI platforms.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19.4 13a8 8 0 0 1-15.4-1.6V11M4.6 11a8 8 0 0 1 15.4 1.6"/><polyline points="20 4 20 9 15 9"/><polyline points="4 20 4 15 9 15"/>
        </svg>
      ),
      title: isNL ? 'SEO plugin integratie' : 'SEO plugin integration',
      desc: isNL
        ? 'Werkt met Yoast SEO, Rank Math, SEOPress en All in One SEO. Focus-keywords worden automatisch overgenomen voor de promptgeneratie.'
        : 'Works with Yoast SEO, Rank Math, SEOPress and All in One SEO. Focus keywords are automatically used for prompt generation.',
    },
  ]

  const steps = [
    {
      title: isNL ? 'Installeer de plugin' : 'Install the plugin',
      desc: isNL
        ? 'Download via WordPress.org of zoek "Teun.ai GEO" in je WordPress plugin overzicht.'
        : 'Download from WordPress.org or search "Teun.ai GEO" in your WordPress plugin directory.',
    },
    {
      title: isNL ? 'Stel je branche in' : 'Set your industry',
      desc: isNL
        ? 'Vul je branche en locatie in onder Instellingen → Teun.ai GEO. Dit wordt gebruikt voor slimme promptgeneratie.'
        : 'Enter your industry and location under Settings → Teun.ai GEO. This is used for smart prompt generation.',
    },
    {
      title: isNL ? 'Analyseer je pagina\'s' : 'Analyze your pages',
      desc: isNL
        ? 'Open een pagina in de editor en bekijk de GEO-analyse in de zijbalk. Volg de aanbevelingen om te verbeteren.'
        : 'Open any page in the editor and view the GEO analysis in the sidebar. Follow the recommendations to improve.',
    },
  ]

  const faqs = isNL
    ? [
        { q: 'Vertraagt de plugin mijn website?', a: 'Nee. De analyse draait alleen in de WordPress-admin, nooit op de frontend. Bezoekers merken er niets van.' },
        { q: 'Welke AI-bots worden gevolgd?', a: 'GPTBot (OpenAI), ChatGPT-User, ClaudeBot (Anthropic), PerplexityBot, Google-Extended, Gemini, Microsoft Copilot, Apple AI en meer. De lijst wordt continu bijgewerkt.' },
        { q: 'Heb ik een Teun.ai-account nodig?', a: 'Niet voor de basisfuncties. Installeer de plugin en begin direct met analyseren. Een Teun.ai-account is alleen nodig als je de online live scanning tools wilt gebruiken.' },
        { q: 'Werkt het met pagebuilders?', a: 'Ja. De plugin bevat speciale content-extractie die werkt met AVADA, Elementor, WPBakery en andere builders. De Classic Editor en Block Editor worden beide volledig ondersteund.' },
        { q: 'Wat is het verschil tussen GEO en SEO?', a: 'SEO optimaliseert voor Google-zoekresultaten. GEO optimaliseert voor AI-zoekmachines zoals ChatGPT en Perplexity. Die beoordelen andere signalen, gestructureerde data, autoriteit, entiteiten en citeerbare content. Beide zijn essentieel voor moderne zichtbaarheid.' },
      ]
    : [
        { q: 'Does the plugin slow down my website?', a: 'No. The analysis only runs in the WordPress admin, never on the frontend. Your visitors won\'t notice a thing.' },
        { q: 'Which AI bots are tracked?', a: 'GPTBot (OpenAI), ChatGPT-User, ClaudeBot (Anthropic), PerplexityBot, Google-Extended, Gemini, Microsoft Copilot, Apple AI and more. The list is continuously updated.' },
        { q: 'Do I need a Teun.ai account?', a: 'Not for the core features. Install the plugin and start analyzing immediately. A Teun.ai account is only needed if you want to use the online live scanning tools.' },
        { q: 'Does it work with page builders?', a: 'Yes. The plugin includes specialized content extraction that works with AVADA, Elementor, WPBakery and other builders. The Classic Editor and Block Editor are both fully supported.' },
        { q: 'How is GEO different from SEO?', a: 'SEO optimizes for Google Search results. GEO optimizes for AI search engines like ChatGPT and Perplexity. They evaluate different signals, structured data, authority, entities, and citable content. Both are essential for modern visibility.' },
      ]

  const compatibleWith = ['Yoast SEO', 'Rank Math', 'SEOPress', 'All in One SEO', 'Classic Editor', 'Block Editor', 'AVADA', 'Elementor']

  return (
    <div className="tool-page wp-page">

      {/* ====== HERO ====== */}
      <section className="wp-hero" aria-labelledby="wp-hero-heading">
        <div className="wrap">
          <div className="wp-hero-grid">

            <div className="wp-hero-text">
              <div className="tool-eyebrow">
                <span className="wp-eyebrow-dot" aria-hidden="true" />
                {isNL ? 'WORDPRESS.ORG GOEDGEKEURD' : 'WORDPRESS.ORG APPROVED'}
              </div>

              <h1 id="wp-hero-heading" className="wp-h1">
                {isNL ? (
                  <>WordPress plugin voor <em>AI-zichtbaarheid</em></>
                ) : (
                  <>WordPress plugin for <em>AI visibility</em></>
                )}
              </h1>

              <p className="wp-hero-sub">
                {isNL
                  ? 'Wordt jouw content aanbevolen door ChatGPT, Perplexity en Google AI? Analyseer elke pagina direct vanuit je WordPress-editor.'
                  : 'Are ChatGPT, Perplexity and Google AI recommending your content? Analyze every page right inside your WordPress editor.'}
              </p>
            </div>

            {/* Right column: download CTA + meta + bullets */}
            <div className="wp-hero-cta">
              <a
                href="https://wordpress.org/plugins/teunai-geo/"
                target="_blank"
                rel="noopener noreferrer"
                className="wp-download-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                {isNL ? 'Download op WordPress.org' : 'Download on WordPress.org'}
              </a>

              <p className="wp-hero-meta">v2.1.0 · WordPress 6.0+ · PHP 8.0+</p>

              <div className="wp-hero-bullets">
                <span className="wp-hero-bullet">
                  <CheckSmall /> {isNL ? 'Gratis' : 'Free'}
                </span>
                <span className="wp-hero-bullet">
                  <CheckSmall /> {isNL ? 'Geen API-sleutel' : 'No API key'}
                </span>
                <span className="wp-hero-bullet">
                  <CheckSmall /> {isNL ? 'Geen externe dataoverdracht' : 'No external data transfer'}
                </span>
              </div>
            </div>

          </div>

          {/* Stats balk (navy) */}
          <div className="wp-stats" role="list">
            <div className="wp-stat" role="listitem">
              <span className="v"><em>30+</em></span>
              <span className="l">GEO checks</span>
            </div>
            <div className="wp-stat" role="listitem">
              <span className="v">12+</span>
              <span className="l">{isNL ? 'AI-bots getrackt' : 'AI bots tracked'}</span>
            </div>
            <div className="wp-stat" role="listitem">
              <span className="v">0</span>
              <span className="l">{isNL ? 'Externe API calls' : 'External API calls'}</span>
            </div>
            <div className="wp-stat" role="listitem">
              <span className="v"><em>{isNL ? 'Gratis' : 'Free'}</em></span>
              <span className="l">{isNL ? 'Alle functies inbegrepen' : 'All features included'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="wp-features" aria-labelledby="wp-features-heading">
        <div className="wrap">
          <div className="wp-section-head">
            <h2 id="wp-features-heading">
              {isNL ? <>Wat doet de <em>plugin?</em></> : <>What does the <em>plugin</em> do?</>}
            </h2>
            <p>
              {isNL
                ? 'Alles wat je nodig hebt om je AI-zichtbaarheid te begrijpen en verbeteren, direct vanuit WordPress.'
                : 'Everything you need to understand and improve your AI visibility, directly inside WordPress.'}
            </p>
          </div>

          <div className="wp-feature-grid">
            {features.map((f, i) => (
              <div key={i} className="wp-feature-card">
                <div className="wp-feature-icon">{f.icon}</div>
                <h3 className="wp-feature-title">{f.title}</h3>
                <p className="wp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="wp-steps" aria-labelledby="wp-steps-heading">
        <div className="wrap">
          <div className="wp-section-head">
            <h2 id="wp-steps-heading">
              {isNL ? <>Hoe het <em>werkt</em></> : <>How it <em>works</em></>}
            </h2>
          </div>

          <div className="wp-step-grid">
            {steps.map((s, i) => (
              <div key={i} className="wp-step-card">
                <div className="wp-step-num">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="wp-step-title">{s.title}</h3>
                <p className="wp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== COMPATIBLE WITH ====== */}
      <section className="wp-compat" aria-labelledby="wp-compat-heading">
        <div className="wrap wrap-narrow">
          <div className="wp-section-head">
            <h2 id="wp-compat-heading">
              {isNL ? <>Werkt met je <em>bestaande setup</em></> : <>Works with your <em>existing setup</em></>}
            </h2>
            <p>
              {isNL
                ? 'De plugin integreert naadloos met populaire SEO-plugins, editors en pagebuilders.'
                : 'The plugin integrates seamlessly with popular SEO plugins, editors and page builders.'}
            </p>
          </div>

          <div className="wp-compat-pills">
            {compatibleWith.map((name, i) => (
              <span key={i} className="wp-compat-pill">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ====== NO HIDDEN COSTS ====== */}
      <section className="wp-no-cost" aria-labelledby="wp-no-cost-heading">
        <div className="wrap wrap-narrow">
          <h2 id="wp-no-cost-heading">
            {isNL
              ? <>Alles inbegrepen.<br /><em>Geen kleine lettertjes.</em></>
              : <>Everything included.<br /><em>No fine print.</em></>}
          </h2>
          <p>
            {isNL
              ? 'De volledige analyse draait lokaal op je eigen server. Geen API-aanroepen, geen premium-wall. Alle 30+ checks, het AI-bot tracking en de verwijzingsanalyse zijn volledig gratis.'
              : 'The full analysis runs locally on your own server. No API calls, no premium wall. All 30+ checks, AI bot tracking and referral analytics are completely free.'}
          </p>

          <div className="wp-no-cost-grid">
            {(isNL
              ? ['Geen API calls', 'Geen limieten', 'Geen premium-wall', 'Geen dataoverdracht']
              : ['No API calls', 'No usage limits', 'No premium wall', 'No data transfer']
            ).map((item, i) => (
              <div key={i} className="wp-no-cost-item">
                <CheckSmall />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="wp-no-cost-extra">
            {isNL
              ? 'Wil je testen of AI-zoekmachines jouw bedrijf daadwerkelijk aanbevelen? Probeer onze gratis AI Visibility tool.'
              : 'Want to test whether AI search engines actually recommend your business? Try our free AI Visibility tool.'}
          </p>

          <Link href="/tools/ai-visibility" className="wp-link-btn">
            {isNL ? 'Test je AI-zichtbaarheid' : 'Test your AI visibility'}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="teun-final" aria-labelledby="wp-cta-heading">
        <div className="wrap">
          <h2 id="wp-cta-heading">
            {isNL ? <>Geen API.<br /><em>Geen limiet.</em></> : <>No API.<br /><em>No limit.</em></>}
          </h2>
          <p>
            {isNL
              ? 'Installeer de plugin en ontvang je eerste GEO Score binnen enkele minuten. Volledig lokaal, volledig gratis.'
              : 'Install the plugin and get your first GEO Score within minutes. Fully local, fully free.'}
          </p>
          <div className="btns">
            <a
              href="https://wordpress.org/plugins/teunai-geo/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              {isNL ? 'Download gratis plugin' : 'Download free plugin'} <span aria-hidden="true">→</span>
            </a>
            <Link href="/geo-optimalisatie" className="btn-secondary">
              {isNL ? 'Lees over GEO' : 'Read about GEO'}
            </Link>
          </div>
          <p className="wp-cta-meta">
            {isNL
              ? 'Geen account nodig. Geen externe API. Alles draait op je eigen server.'
              : 'No account required. No external API. Everything runs on your own server.'}
          </p>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="teun-faq" id="faq" aria-labelledby="wp-faq-heading">
        <div className="wrap">
          <div className="teun-faq-head">
            <div className="teun-faq-eyebrow">
              {isNL ? 'VRAGEN & ANTWOORDEN' : 'QUESTIONS & ANSWERS'}
            </div>
            <h2 id="wp-faq-heading">
              {isNL ? <>Alles wat je wilt weten<br /><em>voor je begint.</em></> : <>Everything you want to know<br /><em>before you begin.</em></>}
            </h2>
            <p className="sub">
              {isNL
                ? 'Geen bot-antwoorden, geen marketingpraat. De echte uitleg, geschreven door ons team.'
                : 'No bot answers, no marketing speak. Real explanations, written by our team.'}
            </p>
          </div>

          <div className="teun-faq-list">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="teun-faq-item"
                open={openFaq === i}
                onToggle={(e) => { if (e.target.open) setOpenFaq(i) }}
              >
                <summary>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="q">{faq.q}</h3>
                  <span className="toggle" aria-hidden="true">
                    <svg viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </span>
                </summary>
                <div className="answer-wrap">
                  <div className="answer">{faq.a}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}

function CheckSmall() {
  return (
    <svg className="wp-check-small" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
