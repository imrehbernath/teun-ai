'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function ToolsFAQ({ items, locale }) {
  const [openFaq, setOpenFaq] = useState(0)
  const isNL = locale === 'nl'

  return (
    <section className="py-20 bg-slate-50 relative overflow-visible">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">{isNL ? 'Veelgestelde vragen' : 'Frequently asked questions'}</h2>
            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full flex items-center justify-between p-6 text-left cursor-pointer">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-semibold text-slate-900">{item.q}</span>
                    </div>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${openFaq === i ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  {openFaq === i && <div className="px-6 pb-6 pt-0"><p className="text-slate-600 pl-10">{item.a}</p></div>}
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex justify-center items-end relative">
            <div className="translate-y-20">
              <Image src="/teun-ai-mascotte.png" alt={isNL ? 'Teun helpt je' : 'Teun helps you'} width={420} height={530} className="drop-shadow-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
