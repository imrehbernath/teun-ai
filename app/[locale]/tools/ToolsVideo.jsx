'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function ToolsVideo({ src, poster, alt }) {
  const [playing, setPlaying] = useState(false)
  const [theater, setTheater] = useState(false)

  // Close theater on Escape, lock scroll
  useEffect(() => {
    if (!theater) return
    const handleKey = (e) => { if (e.key === 'Escape') setTheater(false) }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [theater])

  const videoContent = (
    <div className={`tov-video ${theater ? 'tov-video-theater' : ''}`}>
      {!playing ? (
        <button onClick={() => setPlaying(true)} className="tov-video-poster" aria-label="Play video">
          {poster ? (
            <Image src={poster} alt={alt || 'Demo video'} fill className="tov-video-poster-img" sizes="(max-width: 640px) 100vw, 896px" />
          ) : (
            <div className="tov-video-poster-fallback" />
          )}
          <div className="tov-video-overlay" />
          <div className="tov-video-play-wrap">
            <div className="tov-video-play">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      ) : (
        <div className="tov-video-player">
          <video
            autoPlay
            controls
            controlsList="nofullscreen"
            playsInline
            className="tov-video-el"
            onPlay={(e) => { e.target.playbackRate = 2.5 }}
          >
            <source src={src} type="video/mp4" />
          </video>
          {!theater && (
            <button
              onClick={() => setTheater(true)}
              className="tov-video-theater-btn"
              title="Theater modus"
              aria-label="Theater mode"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )

  if (theater) {
    return (
      <div className="tov-video-backdrop">
        <button
          onClick={() => setTheater(false)}
          className="tov-video-close"
          aria-label="Close theater mode"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {videoContent}
      </div>
    )
  }

  return videoContent
}
