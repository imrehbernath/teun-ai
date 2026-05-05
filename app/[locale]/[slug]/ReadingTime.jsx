'use client'

import { useTranslations } from 'next-intl'

export default function ReadingTime({ content }) {
  const t = useTranslations('blogPost')

  const calculateReadingTime = (text) => {
    if (!text) return 0
    const plainText = text.replace(/<[^>]*>/g, '')
    const wordCount = plainText.trim().split(/\s+/).length
    return Math.ceil(wordCount / 225)
  }

  const minutes = calculateReadingTime(content)

  return (
    <span className="bp-meta-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <span>{t('readingTime', { minutes })}</span>
    </span>
  )
}
