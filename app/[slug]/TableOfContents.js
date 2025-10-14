'use client';

import { useEffect, useState } from 'react';

// ✅ Helper functie om HTML entities te decoden
function decodeHtmlEntities(text) {
  if (typeof window === 'undefined') {
    // Server-side: gebruik simpele replace
    return text
      .replace(/&#8211;/g, '\u2013') // en-dash
      .replace(/&#8212;/g, '\u2014') // em-dash
      .replace(/&#8220;/g, '\u201C') // left double quote
      .replace(/&#8221;/g, '\u201D') // right double quote
      .replace(/&#8216;/g, '\u2018') // left single quote
      .replace(/&#8217;/g, '\u2019') // right single quote
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  }
  
  // Client-side: gebruik browser API
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

export default function TableOfContents({ headings }) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Sort entries by position to handle scroll direction
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // Get the first visible heading (top-most)
          const topEntry = visibleEntries.reduce((top, entry) => {
            return entry.boundingClientRect.top < top.boundingClientRect.top ? entry : top;
          });
          
          setActiveId(topEntry.target.id);
        }
      },
      {
        rootMargin: '-150px 0px -66%',
        threshold: 0.1
      }
    );

    // Observe all headings
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [headings]);

  const handleClick = (e, headingId) => {
    e.preventDefault();
    const element = document.getElementById(headingId);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      setActiveId(headingId);
    }
  };

  return (
    <div className="lg:sticky lg:top-24 bg-gray-50 rounded-xl p-4 lg:p-7">
      <h2 className="toc-heading-underline">
        Inhoudsopgave
      </h2>
      <nav className="space-y-3">
        {headings.map((heading, index) => (
          <a
            key={index}
            href={`#${heading.id}`}
            className={`toc-link block transition-all level-${heading.level} ${
              heading.level === 2 ? 'font-medium' : ''
            } ${activeId === heading.id ? 'active' : ''}`}
            onClick={(e) => handleClick(e, heading.id)}
          >
            <span className="toc-arrow">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M7 7L17 17M17 17V7M17 17H7" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {/* ✅ Decode HTML entities hier */}
            <span>{decodeHtmlEntities(heading.text)}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}