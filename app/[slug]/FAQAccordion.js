'use client';

import { useState } from 'react';

export default function FAQAccordion({ faqs }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!faqs || faqs.length === 0) return null;

  return (
    <div className="mt-16 mb-12">
      <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Veelgestelde vragen
      </h2>
      
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div 
            key={index}
            className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-purple-300 transition-colors"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-900 text-lg">
                {faq.question}
              </span>
              <svg 
                className={`w-6 h-6 text-purple-600 transition-transform flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div 
              className={`overflow-hidden transition-all duration-300 ${
                openIndex === index ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <div 
                className="px-6 py-4 text-gray-700 border-t border-gray-100 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}