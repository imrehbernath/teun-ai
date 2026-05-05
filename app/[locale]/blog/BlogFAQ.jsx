// app/[locale]/blog/BlogFAQ.jsx
'use client'

import { useState } from 'react'

const faqItems = [
  {
    cat: 'product',
    question: 'Hoe werkt Teun.ai precies?',
    answer: 'Teun.ai scant hoe zichtbaar jouw bedrijf is in AI-zoekmachines. Onze gratis tool scant via Perplexity AI met realtime webresultaten. Met een account krijg je ook toegang tot ChatGPT scans via onze Chrome extensie. Je voert je bedrijfsgegevens en zoekwoorden in, en wij genereren de commerciële prompts die jouw potentiële klanten gebruiken.'
  },
  {
    cat: 'pricing',
    question: 'Wat kost Teun.ai?',
    answer: 'Je kunt 2x gratis scannen zonder account. Met een gratis account krijg je 1 scan per dag plus toegang tot je dashboard en onze Chrome extensie voor onbeperkte ChatGPT scans. Voor automatische rank tracking, GEO Optimalisatie DIY en onbeperkt gebruik kies je voor Lite (€29,95/mnd) of Pro (€49,95/mnd).'
  },
  {
    cat: 'product',
    question: 'Is Teun.ai geschikt voor mijn bedrijf?',
    answer: 'Teun.ai is geschikt voor elk bedrijf dat online zichtbaar wil zijn. Of je nu een MKB-bedrijf, startup of enterprise bent: als je klanten je via AI-zoekmachines moeten kunnen vinden, is Teun.ai voor jou.'
  },
  {
    cat: 'product',
    question: 'Hoe lang duurt het voordat ik resultaten zie?',
    answer: 'Je scan resultaten zijn direct beschikbaar. Het verbeteren van je AI-zichtbaarheid is een proces dat tijd kost, maar met onze concrete tips kun je direct aan de slag.'
  }
]

export default function BlogFAQ() {
  const [openFaq, setOpenFaq] = useState(0)
  const [faqCategory, setFaqCategory] = useState('all')

  const counts = {
    all: faqItems.length,
    product: faqItems.filter(i => i.cat === 'product').length,
    pricing: faqItems.filter(i => i.cat === 'pricing').length,
  }

  const catLabels = {
    all: 'Alles',
    product: 'Product',
    pricing: 'Prijzen',
  }

  const filteredFaqs = faqCategory === 'all'
    ? faqItems
    : faqItems.filter(i => i.cat === faqCategory)

  return (
    <section className="teun-faq" id="faq" aria-labelledby="bov-faq-heading">
      <div className="wrap">
        <div className="teun-faq-head">
          <div className="teun-faq-eyebrow">VRAGEN &amp; ANTWOORDEN</div>
          <h2 id="bov-faq-heading">
            Veelgestelde <em>vragen</em>
          </h2>
        </div>

        <div className="teun-faq-cats" role="tablist">
          {[
            { id: 'all', count: counts.all },
            { id: 'product', count: counts.product },
            { id: 'pricing', count: counts.pricing },
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
          {filteredFaqs.map((item, i) => (
            <details
              key={`${faqCategory}-${i}`}
              className="teun-faq-item"
              open={openFaq === i}
              onToggle={(e) => { if (e.target.open) setOpenFaq(i) }}
            >
              <summary>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="q">{item.question}</h3>
                <span className="cat-chip">{catLabels[item.cat]}</span>
                <span className="toggle" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <div className="answer-wrap">
                <div className="answer">{item.answer}</div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
