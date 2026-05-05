'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function ReadingProgressBar() {
  const t = useTranslations('blogPost')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = (scrollTop / docHeight) * 100
      setProgress(scrollPercent)
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()

    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div
      className="bp-progress"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={t('readingProgress')}
    >
      <div className="bp-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  )
}
