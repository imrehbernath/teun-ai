'use client';

import { useState } from 'react';
import Image from 'next/image';

const faqItems = [
  {
    question: 'Hoe werkt Teun.AI precies?',
    answer: 'Teun.AI scant hoe zichtbaar jouw bedrijf is in AI-zoekmachines. Onze gratis tool scant via Perplexity AI met realtime webresultaten. Met een account krijg je ook toegang tot ChatGPT scans via onze Chrome extensie. Je voert je bedrijfsgegevens en zoekwoorden in, en wij genereren de commerciële prompts die jouw potentiële klanten gebruiken.'
  },
  {
    question: 'Wat kost Teun.AI?',
    answer: 'Je kunt 2x gratis scannen zonder account. Met een gratis account krijg je 1 scan per dag + toegang tot je dashboard en onze Chrome extensie voor onbeperkte ChatGPT scans.'
  },
  {
    question: 'Is Teun.AI geschikt voor mijn bedrijf?',
    answer: 'Teun.AI is geschikt voor elk bedrijf dat online zichtbaar wil zijn. Of je nu een MKB-bedrijf, startup of enterprise bent - als je klanten je via AI-zoekmachines moeten kunnen vinden, is Teun.AI voor jou.'
  },
  {
    question: 'Hoe lang duurt het voordat ik resultaten zie?',
    answer: 'Je scan resultaten zijn direct beschikbaar. Het verbeteren van je AI-zichtbaarheid is een proces dat tijd kost, maar met onze concrete tips kun je direct aan de slag.'
  }
];

export default function BlogFAQ() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section className="py-20 bg-slate-50 relative overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: FAQ */}
          <div>
            <div className="space-y-4">
              {faqItems.map((faq, i) => (
                <div 
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 font-mono text-sm">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {faq.question}
                      </span>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${openFaq === i ? 'rotate-45' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-6 pt-0">
                      <p className="text-slate-600 pl-10">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Mascotte (zoekende Teun) - overlapping footer like homepage */}
          <div className="hidden lg:flex justify-center items-end relative">
            <div className="translate-y-24">
              <Image
                src="/teun-ai-mascotte.png"
                alt="Teun zoekt voor je"
                width={420}
                height={530}
                className="drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
