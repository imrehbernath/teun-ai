// app/[locale]/chrome-extensie/page.js
// Chrome Extension — Teun.ai ChatGPT Visibility Scanner landing page
'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk'

export default function ChromeExtensiePage() {
  const locale = useLocale()
  const isNL = locale === 'nl'
  const [openFaq, setOpenFaq] = useState(0)

  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      ),
      title: isNL ? 'Automatisch scannen' : 'Automatic scanning',
      desc: isNL
        ? 'De extensie typt je commerciële prompts automatisch in ChatGPT en verzamelt de antwoorden. Geen handwerk, geen kopiëren en plakken.'
        : 'The extension automatically types your commercial prompts into ChatGPT and collects the answers. No manual work, no copy-pasting.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      title: isNL ? 'Real-time resultaten' : 'Real-time results',
      desc: isNL
        ? 'Zie direct welke prompts jouw bedrijf noemen. Je leest 1-op-1 wat echte gebruikers zien op ChatGPT.com, niet via een API maar de echte interface.'
        : 'See instantly which prompts mention your business. You read exactly what real users see on ChatGPT.com, through the real interface, not an API.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3v18h18"/><path d="M7 16l4-8 4 6 5-10"/>
        </svg>
      ),
      title: isNL ? 'Positie-tracking' : 'Position tracking',
      desc: isNL
        ? 'Ontdek waar in het ChatGPT-antwoord je genoemd wordt. Bovenaan, tussendoor of helemaal niet, je ziet het meteen.'
        : 'Discover where in the ChatGPT answer you are mentioned. Top, middle or not at all, you see it right away.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/>
        </svg>
      ),
      title: isNL ? 'Dashboard-integratie' : 'Dashboard integration',
      desc: isNL
        ? 'Alle scans worden opgeslagen in je Teun.ai dashboard. De ChatGPT-resultaten uit de extensie overschrijven automatisch de API-resultaten, zodat je dashboard de echte data toont.'
        : 'All scans are saved in your Teun.ai dashboard. The ChatGPT results from the extension automatically override the API results, so your dashboard shows the real data.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 9-9"/><polyline points="3 4 3 12 11 12"/>
        </svg>
      ),
      title: isNL ? 'Historische data' : 'Historical data',
      desc: isNL
        ? 'Track je ChatGPT-zichtbaarheid over tijd. Elke scan voegt een meetpunt toe, zodat je je voortgang ziet groeien.'
        : 'Track your ChatGPT visibility over time. Every scan adds a data point so you can watch your progress grow.',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: isNL ? 'Concurrenten in beeld' : 'Competitors in view',
      desc: isNL
        ? 'Zie welke andere bedrijven genoemd worden bij jouw prompts en hoe vaak. Direct inzicht in je AI-concurrenten.'
        : 'See which other businesses are mentioned for your prompts and how often. Instant insight into your AI competitors.',
    },
  ]

  const steps = [
    {
      title: isNL ? 'Installeer de extensie' : 'Install the extension',
      desc: isNL
        ? 'Voeg de extensie eenmalig toe via de Chrome Web Store. 43 KB, geen gedoe.'
        : 'Add the extension once via the Chrome Web Store. 43 KB, no hassle.',
    },
    {
      title: isNL ? 'Log in op Teun.ai' : 'Log in to Teun.ai',
      desc: isNL
        ? 'Maak een gratis account of log in. Je commerciële prompts staan klaar vanuit je AI Visibility scan.'
        : 'Create a free account or log in. Your commercial prompts are ready from your AI Visibility scan.',
    },
    {
      title: isNL ? 'Start een scan' : 'Start a scan',
      desc: isNL
        ? 'Open ChatGPT.com, start de scan vanuit je dashboard en bekijk de resultaten direct terug in Teun.ai.'
        : 'Open ChatGPT.com, start the scan from your dashboard and view the results right back in Teun.ai.',
    },
  ]

  const faqs = isNL
    ? [
        { q: 'Is de extensie veilig?', a: 'Ja. Je login-gegevens worden lokaal in je browser opgeslagen, er is geen tracking buiten de scanfunctie, alles loopt over HTTPS en de extensie is AVG-compliant.' },
        { q: 'Kost de extensie iets?', a: 'Nee, de extensie is gratis. Je krijgt 2 scans per maand met 10 prompts per scan en basis dashboard-toegang. Meer scannen kan met een Teun.ai abonnement.' },
        { q: 'Heb ik een Teun.ai-account nodig?', a: 'Ja, een gratis Teun.ai-account is nodig om scans te starten en je resultaten op te slaan in het dashboard.' },
        { q: 'Werkt het met gratis ChatGPT?', a: 'Ja, de extensie werkt met zowel gratis ChatGPT als ChatGPT Plus.' },
        { q: 'Wat is het verschil met de WordPress plugin?', a: 'De WordPress plugin analyseert je pagina\'s binnen WordPress en geeft een GEO Score. De Chrome extensie meet hoe je daadwerkelijk in ChatGPT wordt gevonden. Ze vullen elkaar aan.' },
      ]
    : [
        { q: 'Is the extension safe?', a: 'Yes. Your login details are stored locally in your browser, there is no tracking outside the scan function, everything runs over HTTPS and the extension is GDPR compliant.' },
        { q: 'Does the extension cost anything?', a: 'No, the extension is free. You get 2 scans per month with 10 prompts per scan and basic dashboard access. More scanning is available with a Teun.ai subscription.' },
        { q: 'Do I need a Teun.ai account?', a: 'Yes, a free Teun.ai account is needed to start scans and save your results in the dashboard.' },
        { q: 'Does it work with free ChatGPT?', a: 'Yes, the extension works with both free ChatGPT and ChatGPT Plus.' },
        { q: 'What is the difference with the WordPress plugin?', a: 'The WordPress plugin analyzes your pages within WordPress and gives a GEO Score. The Chrome extension measures how you are actually found in ChatGPT. They complement each other.' },
      ]

  const compatibleWith = [
    isNL ? 'AI Visibility Scan' : 'AI Visibility Scan',
    'AI Rank Tracker',
    'Dashboard',
    'Brand Check',
    'Google Chrome',
    'ChatGPT Free',
    'ChatGPT Plus',
  ]

  return (
    <div className="tool-page wp-page">

      {/* ====== HERO ====== */}
      <section className="wp-hero" aria-labelledby="ext-hero-heading">
        <div className="wrap">
          <div className="wp-hero-grid">

            <div className="wp-hero-text">
              <div className="tool-eyebrow">
                <span className="wp-eyebrow-dot" aria-hidden="true" />
                CHROME WEB STORE
              </div>

              <h1 id="ext-hero-heading" className="wp-h1">
                {isNL ? (
                  <>Chrome extensie voor <em style={{ whiteSpace: 'normal', wordBreak: 'normal' }}>ChatGPT zichtbaarheid</em></>
                ) : (
                  <>Chrome extension for <em style={{ whiteSpace: 'normal', wordBreak: 'normal' }}>ChatGPT visibility</em></>
                )}
              </h1>

              <p className="wp-hero-sub">
                {isNL
                  ? 'Meet real-time hoe jouw bedrijf gevonden wordt in ChatGPT. De extensie typt je commerciële prompts automatisch in en leest 1-op-1 wat gebruikers echt zien op ChatGPT.com.'
                  : 'Measure in real time how your business is found in ChatGPT. The extension automatically types your commercial prompts and reads exactly what users see on ChatGPT.com.'}
              </p>
            </div>

            {/* Right column: install CTA + meta + bullets */}
            <div className="wp-hero-cta">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="wp-download-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                {isNL ? 'Installeer in Chrome' : 'Add to Chrome'}
              </a>

              <p className="wp-hero-meta">
                {isNL ? 'v1.0.0 · Chrome · Nederlands' : 'v1.0.0 · Chrome · Dutch'}
              </p>

              <div className="wp-hero-bullets">
                <span className="wp-hero-bullet">
                  <CheckSmall /> {isNL ? 'Gratis' : 'Free'}
                </span>
                <span className="wp-hero-bullet">
                  <CheckSmall /> {isNL ? 'Geen API-sleutel nodig' : 'No API key needed'}
                </span>
                <span className="wp-hero-bullet">
                  <CheckSmall /> {isNL ? '1-op-1 met echte ChatGPT-resultaten' : '1-on-1 with real ChatGPT results'}
                </span>
              </div>
            </div>

          </div>

          {/* Stats balk (navy) */}
          <div className="wp-stats" role="list">
            <div className="wp-stat" role="listitem">
              <span className="v"><em>{isNL ? 'Real-time' : 'Real-time'}</em></span>
              <span className="l">{isNL ? 'Direct uit ChatGPT.com' : 'Straight from ChatGPT.com'}</span>
            </div>
            <div className="wp-stat" role="listitem">
              <span className="v">10</span>
              <span className="l">{isNL ? 'Prompts per scan' : 'Prompts per scan'}</span>
            </div>
            <div className="wp-stat" role="listitem">
              <span className="v">4</span>
              <span className="l">{isNL ? 'AI-platforms in je dashboard' : 'AI platforms in your dashboard'}</span>
            </div>
            <div className="wp-stat" role="listitem">
              <span className="v"><em>{isNL ? 'Gratis' : 'Free'}</em></span>
              <span className="l">{isNL ? '2 scans per maand' : '2 scans per month'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="wp-features" aria-labelledby="ext-features-heading">
        <div className="wrap">
          <div className="wp-section-head">
            <h2 id="ext-features-heading">
              {isNL ? <>Wat doet de <em>extensie?</em></> : <>What does the <em>extension</em> do?</>}
            </h2>
            <p>
              {isNL
                ? 'Alles wat je nodig hebt om je ChatGPT-zichtbaarheid te meten, direct vanuit je browser.'
                : 'Everything you need to measure your ChatGPT visibility, straight from your browser.'}
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
      <section className="wp-steps" aria-labelledby="ext-steps-heading">
        <div className="wrap">
          <div className="wp-section-head">
            <h2 id="ext-steps-heading">
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
      <section className="wp-compat" aria-labelledby="ext-compat-heading">
        <div className="wrap wrap-narrow">
          <div className="wp-section-head">
            <h2 id="ext-compat-heading">
              {isNL ? <>Werkt met je <em>bestaande setup</em></> : <>Works with your <em>existing setup</em></>}
            </h2>
            <p>
              {isNL
                ? 'De extensie werkt naadloos samen met de rest van het Teun.ai platform.'
                : 'The extension works seamlessly with the rest of the Teun.ai platform.'}
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
      <section className="wp-no-cost" aria-labelledby="ext-no-cost-heading">
        <div className="wrap wrap-narrow">
          <h2 id="ext-no-cost-heading">
            {isNL
              ? <>Alles inbegrepen.<br /><em>Geen kleine lettertjes.</em></>
              : <>Everything included.<br /><em>No fine print.</em></>}
          </h2>
          <p>
            {isNL
              ? 'De extensie leest direct mee op ChatGPT.com. Geen API-aanroepen, geen externe dataoverdracht. Je login-gegevens blijven lokaal opgeslagen in je browser.'
              : 'The extension reads along directly on ChatGPT.com. No API calls, no external data transfer. Your login details stay stored locally in your browser.'}
          </p>

          <div className="wp-no-cost-grid">
            {(isNL
              ? ['Geen API-sleutel', 'Lokale opslag', 'AVG-compliant', 'Geen externe dataoverdracht']
              : ['No API key', 'Local storage', 'GDPR compliant', 'No external data transfer']
            ).map((item, i) => (
              <div key={i} className="wp-no-cost-item">
                <CheckSmall />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="wp-no-cost-extra">
            {isNL
              ? 'Wil je ook Perplexity, Google AI Mode en AI Overviews meten? Dat doet je Teun.ai dashboard automatisch.'
              : 'Want to measure Perplexity, Google AI Mode and AI Overviews too? Your Teun.ai dashboard does that automatically.'}
          </p>

          <Link href="/dashboard" className="wp-link-btn">
            {isNL ? 'Bekijk het dashboard' : 'View the dashboard'}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="teun-final" aria-labelledby="ext-cta-heading">
        <div className="wrap">
          <h2 id="ext-cta-heading">
            {isNL ? <>Geen API.<br /><em>Geen omweg.</em></> : <>No API.<br /><em>No detour.</em></>}
          </h2>
          <p>
            {isNL
              ? 'Installeer de extensie en zie binnen enkele minuten hoe ChatGPT over jouw bedrijf praat. Volledig gratis.'
              : 'Install the extension and see within minutes how ChatGPT talks about your business. Completely free.'}
          </p>
          <div className="btns">
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              {isNL ? 'Installeer in Chrome' : 'Add to Chrome'} <span aria-hidden="true">→</span>
            </a>
            <Link href="/geo-optimalisatie" className="btn-secondary">
              {isNL ? 'Lees over GEO' : 'Read about GEO'}
            </Link>
          </div>
          <p className="wp-cta-meta">
            {isNL
              ? 'Geen API nodig. Geen externe dataoverdracht. Alles draait in je eigen browser.'
              : 'No API needed. No external data transfer. Everything runs in your own browser.'}
          </p>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="teun-faq" id="faq" aria-labelledby="ext-faq-heading">
        <div className="wrap">
          <div className="teun-faq-head">
            <div className="teun-faq-eyebrow">
              {isNL ? 'VRAGEN & ANTWOORDEN' : 'QUESTIONS & ANSWERS'}
            </div>
            <h2 id="ext-faq-heading">
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
