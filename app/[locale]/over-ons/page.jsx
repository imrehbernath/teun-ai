// app/[locale]/over-ons/page.jsx (NL)
// (For EN: identical file at /en/about-us/page.jsx)
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { ArrowRight } from 'lucide-react'

export default function OverOnsPage() {
  const locale = useLocale()
  const isNL = locale === 'nl'

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
      linkedin: 'https://nl.linkedin.com/in/imrebernath',
      highlight: isNL ? '25 jaar ervaring → Teun.ai' : '25 years experience → Teun.ai',
    },
    {
      name: 'Sanne Verschoor',
      role: 'Lead Developer & AI Designer',
      photo: '/Sanne-Verschoor.webp',
      credentials: [
        isNL ? 'Full-stack developer' : 'Full-stack developer',
        'WordPress & Next.js specialist',
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
  ]

  const stats = [
    { value: '25+', label: isNL ? 'Jaar ervaring' : 'Years experience' },
    { value: '750+', label: isNL ? 'Projecten afgerond' : 'Projects completed' },
    { value: '6', label: isNL ? 'Gratis AI-tools' : 'Free AI tools' },
    { value: '4', label: isNL ? 'AI-platforms gescand' : 'AI platforms scanned' },
  ]

  return (
    <div className="tool-page oo-page">

      {/* HERO */}
      <section className="oo-hero">
        <div className="tool-eyebrow">{isNL ? 'OVER TEUN.AI' : 'ABOUT TEUN.AI'}</div>
        <h1 className="oo-h1">
          {isNL ? (
            <>Gebouwd door mensen die <em>AI-zichtbaarheid</em> begrijpen</>
          ) : (
            <>Built by people who understand <em>AI visibility</em></>
          )}
        </h1>
        <p className="oo-hero-sub">
          {isNL
            ? 'Teun.ai is geen startup-experiment. Het is het resultaat van 25 jaar online ervaring, 750+ projecten en de overtuiging dat AI-zoekmachines de toekomst van online marketing bepalen.'
            : 'Teun.ai is not a startup experiment. It\'s the result of 25 years of online experience, 750+ projects and the conviction that AI search engines define the future of online marketing.'}
        </p>
        <p className="oo-hero-meta">
          {isNL ? 'Door het team van OnlineLabs, Amsterdam' : 'By the team at OnlineLabs, Amsterdam'}
        </p>

        {/* Stats inline */}
        <div className="oo-stats">
          {stats.map((stat, i) => (
            <div key={i} className="oo-stat">
              <div className="oo-stat-num">{stat.value}</div>
              <div className="oo-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM */}
      <section className="oo-team-section">
        <div className="oo-team-wrap">
          <div className="oo-section-head">
            <h2 className="oo-section-h2">
              {isNL ? <>Het team achter <em>Teun.ai</em></> : <>The team behind <em>Teun.ai</em></>}
            </h2>
            <p className="oo-section-sub">
              {isNL
                ? 'Drie specialisten. Samen 40+ jaar ervaring in online marketing, development en data-analyse.'
                : 'Three specialists. Combined 40+ years of experience in online marketing, development and data analysis.'}
            </p>
          </div>

          <div className="oo-team-grid">
            {team.map((member, i) => (
              <div key={i} className="oo-team-card">
                <div className="oo-team-photo">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="oo-team-photo-img"
                    style={{ objectPosition: '50% 30%' }}
                    sizes="(max-width: 760px) 100vw, 360px"
                  />
                  <div className="oo-team-highlight">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
                    </svg>
                    {member.highlight}
                  </div>
                </div>

                <div className="oo-team-body">
                  <h3 className="oo-team-name">{member.name}</h3>
                  <p className="oo-team-role">{member.role}</p>

                  <ul className="oo-team-credentials">
                    {member.credentials.map((cred, j) => (
                      <li key={j}><span className="dot" />{cred}</li>
                    ))}
                  </ul>

                  <p className="oo-team-desc">{member.description}</p>

                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="oo-team-linkedin"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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

      {/* WHY TEUN.AI */}
      <section className="oo-why-section">
        <div className="oo-why-wrap">
          <div className="oo-section-head">
            <h2 className="oo-section-h2">
              {isNL ? <>Waarom we <em>Teun.ai</em> bouwden</> : <>Why we built <em>Teun.ai</em></>}
            </h2>
          </div>

          <div className="oo-why-grid">
            <div className="oo-why-card">
              <div className="oo-why-icon oo-why-icon-danger">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>
                </svg>
              </div>
              <h3 className="oo-why-title">{isNL ? 'Het probleem' : 'The problem'}</h3>
              <p className="oo-why-text">
                {isNL
                  ? 'Onze klanten ranken prima in Google, maar willen nu ook genoemd worden in ChatGPT, Google AI en Perplexity. Er bestond geen tool om dit te meten, laat staan te verbeteren. De bestaande tools waren of te duur (€400+/mnd) of misten de Nederlandse markt compleet.'
                  : 'Our clients rank well in Google, but also want to be mentioned by ChatGPT, Google AI and Perplexity. No tool existed to measure this, let alone improve it. Existing tools were either too expensive (€400+/mo) or completely missed the Dutch market.'}
              </p>
            </div>

            <div className="oo-why-card">
              <div className="oo-why-icon oo-why-icon-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                </svg>
              </div>
              <h3 className="oo-why-title">{isNL ? 'Onze oplossing' : 'Our solution'}</h3>
              <p className="oo-why-text">
                {isNL
                  ? 'We bouwden Teun.ai: 6 gratis tools die samenwerken. Van eerste check tot structurele optimalisatie. Betaalbaar voor elke ondernemer en gebouwd door mensen die zelf dagelijks met klanten werken aan AI-zichtbaarheid.'
                  : 'We built Teun.ai: 6 free tools working together. From first check to structural optimization. Affordable for every business, and built by people who work with clients on AI visibility every day.'}
              </p>
            </div>
          </div>

          <div className="oo-why-wide">
            <div className="oo-why-icon oo-why-icon-spark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                <path d="M2 12h20"/>
              </svg>
            </div>
            <div className="oo-why-wide-body">
              <h3 className="oo-why-title">OnlineLabs + Teun.ai</h3>
              <p className="oo-why-text">
                {isNL
                  ? 'Teun.ai is gebouwd door OnlineLabs, online marketing bureau in Amsterdam sinds 2008. We gebruiken Teun.ai dagelijks voor onze eigen klanten. Elke feature is getest in de praktijk, niet in een lab. Wil je het zelf doen? Gebruik Teun.ai. Liever uitbesteden? OnlineLabs helpt je met professionele GEO-optimalisatie.'
                  : 'Teun.ai is built by OnlineLabs, online marketing agency in Amsterdam since 2008. We use Teun.ai daily for our own clients. Every feature is tested in practice, not in a lab. Want to do it yourself? Use Teun.ai. Prefer to outsource? OnlineLabs helps you with professional GEO optimization.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="teun-final" aria-labelledby="oo-final-heading">
        <div className="wrap">
          <h2 id="oo-final-heading">
            {isNL ? (
              <>Wij helpen je<br /><em>zichtbaar</em> worden.</>
            ) : (
              <>We help you<br />get <em>seen</em>.</>
            )}
          </h2>
          <p>
            {isNL
              ? '6 gratis tools. Geen creditcard nodig. Resultaat in 2 minuten.'
              : '6 free tools. No credit card needed. Results in 2 minutes.'}
          </p>
          <div className="btns">
            <Link href="/tools/ai-visibility" className="btn-primary">
              {isNL ? 'Gratis scan starten' : 'Start free scan'} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/pricing" className="btn-secondary">
              {isNL ? 'Bekijk Lite & Pro' : 'View Lite & Pro'}
            </Link>
          </div>
          <p className="oo-final-meta">
            {isNL ? 'Vanaf €29,95/mnd excl. BTW' : 'From €29.95/mo excl. VAT'}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection isNL={isNL} />
    </div>
  )
}

function FAQSection({ isNL }) {
  const [openIdx, setOpenIdx] = useState(0)

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
  ]

  return (
    <section className="teun-faq" id="faq" aria-labelledby="oo-faq-heading">
      <div className="wrap">
        <div className="teun-faq-head">
          <div className="teun-faq-eyebrow">
            {isNL ? 'VRAGEN & ANTWOORDEN' : 'QUESTIONS & ANSWERS'}
          </div>
          <h2 id="oo-faq-heading">
            {isNL
              ? <>Veelgestelde <em>vragen</em></>
              : <>Frequently asked <em>questions</em></>}
          </h2>
        </div>

        <div className="teun-faq-list">
          {faqs.map((item, i) => (
            <details
              key={i}
              className="teun-faq-item"
              open={openIdx === i}
              onToggle={(e) => { if (e.target.open) setOpenIdx(i) }}
            >
              <summary>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="q">{item.q}</h3>
                <span className="toggle" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <div className="answer-wrap">
                <div className="answer">{item.a}</div>
              </div>
            </details>
          ))}
        </div>

        <div className="teun-faq-help">
          <div>
            <h3>
              {isNL ? <>Nog vragen? <em>We helpen je.</em></> : <>Still got questions? <em>We&rsquo;re here.</em></>}
            </h3>
            <p>
              {isNL
                ? 'Stuur ons een mail of plan een gesprek van 15 minuten. Geen verkooppraat, gewoon antwoorden.'
                : 'Reach us by email or book a 15-minute call. No sales pitch, just answers.'}
            </p>
          </div>
          <div className="teun-faq-help-actions">
            <a href="mailto:hallo@teun.ai" className="teun-faq-help-btn primary">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 3h10v8H2z M2 3l5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              hallo@teun.ai
            </a>
            <a
              href="https://calendly.com/imre-onlinelabs/teun-ai-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="teun-faq-help-btn secondary"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 6h10M5 1v3M9 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {isNL ? 'Plan een gesprek' : 'Book a call'}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
