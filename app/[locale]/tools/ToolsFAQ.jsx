'use client'

import { useState, useMemo } from 'react'

export default function ToolsFAQ({ items, locale }) {
  const [openFaq, setOpenFaq] = useState(0)
  const [faqCategory, setFaqCategory] = useState('all')
  const isNL = locale === 'nl'

  const catLabels = isNL
    ? { all: 'Alles', product: 'Product', pricing: 'Prijzen' }
    : { all: 'All', product: 'Product', pricing: 'Pricing' }

  const counts = useMemo(() => ({
    all: items.length,
    product: items.filter(i => i.cat === 'product').length,
    pricing: items.filter(i => i.cat === 'pricing').length,
  }), [items])

  const filtered = faqCategory === 'all' ? items : items.filter(i => i.cat === faqCategory)

  return (
    <section className="teun-faq" id="faq" aria-labelledby="tov-faq-heading">
      <div className="wrap">
        <div className="teun-faq-head">
          <div className="teun-faq-eyebrow">
            {isNL ? 'VRAGEN & ANTWOORDEN' : 'QUESTIONS & ANSWERS'}
          </div>
          <h2 id="tov-faq-heading">
            {isNL
              ? <>Veelgestelde <em>vragen</em></>
              : <>Frequently asked <em>questions</em></>}
          </h2>
        </div>

        <div className="teun-faq-cats" role="tablist">
          {[
            { id: 'all',     count: counts.all },
            { id: 'product', count: counts.product },
            { id: 'pricing', count: counts.pricing }
          ].map(({ id, count }) => (
            <button
              key={id}
              className={faqCategory === id ? 'active' : ''}
              onClick={() => { setFaqCategory(id); setOpenFaq(0) }}
              role="tab"
              aria-selected={faqCategory === id}
            >
              {catLabels[id]}
              <span className="count">{count}</span>
            </button>
          ))}
        </div>

        <div className="teun-faq-list">
          {filtered.map((item, i) => (
            <details
              key={`${faqCategory}-${i}`}
              className="teun-faq-item"
              open={openFaq === i}
              onToggle={(e) => { if (e.target.open) setOpenFaq(i) }}
            >
              <summary>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="q">{item.q}</h3>
                <span className="cat-chip">{catLabels[item.cat]}</span>
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
