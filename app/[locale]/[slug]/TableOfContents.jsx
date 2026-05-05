'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

function decodeHtmlEntities(text) {
  if (typeof window === 'undefined') {
    return text
      .replace(/&#8211;/g, '\u2013')
      .replace(/&#8212;/g, '\u2014')
      .replace(/&#8220;/g, '\u201C')
      .replace(/&#8221;/g, '\u201D')
      .replace(/&#8216;/g, '\u2018')
      .replace(/&#8217;/g, '\u2019')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
  }
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

export default function TableOfContents({ headings }) {
  const t = useTranslations('blogPost')
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries.reduce((top, entry) => {
            return entry.boundingClientRect.top < top.boundingClientRect.top ? entry : top
          })
          setActiveId(topEntry.target.id)
        }
      },
      { rootMargin: '-150px 0px -66%', threshold: 0.1 }
    )

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    })

    return () => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id)
        if (element) observer.unobserve(element)
      })
    }
  }, [headings])

  const handleClick = (e, headingId) => {
    e.preventDefault()
    const element = document.getElementById(headingId)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
      setActiveId(headingId)
    }
  }

  return (
    <div className="bp-toc">
      <div className="bp-toc-eyebrow">{t('tableOfContents')}</div>
      <nav className="bp-toc-nav">
        {headings.map((heading, index) => (
          <a
            key={index}
            href={`#${heading.id}`}
            className={`bp-toc-link level-${heading.level} ${activeId === heading.id ? 'active' : ''}`}
            onClick={(e) => handleClick(e, heading.id)}
          >
            <span className="bp-toc-arrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="bp-toc-text">{decodeHtmlEntities(heading.text)}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
