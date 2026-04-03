'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function ToolsVideo({ src, poster, alt }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video relative">
      {!playing ? (
        <button
          onClick={() => setPlaying(true)}
          className="absolute inset-0 w-full h-full cursor-pointer group"
        >
          {poster ? (
            <Image
              src={poster}
              alt={alt || 'Demo video'}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 560px"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-100" />
          )}
          <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/90 group-hover:bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#292956] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      ) : (
        <video
          autoPlay
          controls
          playsInline
          className="w-full h-full"
          onPlay={(e) => { e.target.playbackRate = 2.5 }}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  )
}
