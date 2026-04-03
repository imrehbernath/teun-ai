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
    <div className={`overflow-hidden aspect-video relative ${theater ? 'rounded-xl w-full max-w-6xl' : 'rounded-2xl border border-slate-200 bg-slate-100'}`}>
      {!playing ? (
        <button onClick={() => setPlaying(true)} className="absolute inset-0 w-full h-full cursor-pointer group">
          {poster ? (
            <Image src={poster} alt={alt || 'Demo video'} fill className="object-cover" sizes="(max-width: 640px) 100vw, 896px" />
          ) : (
            <div className="absolute inset-0 bg-slate-100" />
          )}
          <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/90 group-hover:bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#292956] ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        </button>
      ) : (
        <div className="relative w-full h-full">
          <video autoPlay controls controlsList="nofullscreen" playsInline className="w-full h-full" onPlay={(e) => { e.target.playbackRate = 2.5 }}>
            <source src={src} type="video/mp4" />
          </video>
          {!theater && (
            <button onClick={() => setTheater(true)} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer flex items-center gap-1.5" title="Theater modus">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
          )}
        </div>
      )}
    </div>
  )

  if (theater) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-8">
        <button onClick={() => setTheater(false)} className="absolute top-4 right-4 text-white/70 hover:text-white z-50 cursor-pointer">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {videoContent}
      </div>
    )
  }

  return videoContent
}
