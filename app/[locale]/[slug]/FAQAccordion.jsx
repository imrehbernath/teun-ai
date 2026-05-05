'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function FAQAccordion({ faqs }) {
  const t = useTranslations('blogPost')
  const [openIndex, setOpenIndex] = useState(0)

  if (!faqs || faqs.length === 0) return null

  return (
    <div className="bp-faq">
      <div className="bp-faq-head">
        <div className="bp-faq-eyebrow">FAQ</div>
        <h2 className="bp-faq-title">
          {t('faqTitle')}
        </h2>
      </div>

      <div className="teun-faq-list">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="teun-faq-item"
            open={openIndex === index}
            onToggle={(e) => { if (e.target.open) setOpenIndex(index) }}
          >
            <summary>
              <span className="num">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="q">{faq.question}</h3>
              <span className="toggle" aria-hidden="true">
                <svg viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <div className="answer-wrap">
              <div className="answer" dangerouslySetInnerHTML={{ __html: faq.answer }} />
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
