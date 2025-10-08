'use client';

import { useEffect, useState } from 'react';

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
            <span>{heading.text}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}