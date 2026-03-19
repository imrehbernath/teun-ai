// app/components/ProGate.jsx
// Overlay for Pro-only features — shows lock + upgrade CTA
'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { Crown, Zap, Lock, Check } from 'lucide-react'

export default function ProGate({ feature, children, isPro }) {
  const locale = useLocale()
  const isNL = locale === 'nl'
  const [showNotify, setShowNotify] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySubmitted, setNotifySubmitted] = useState(false)

  // Pro users see the content directly
  if (isPro) return children

  async function handleNotifySubmit(e) {
    e.preventDefault()
    if (!notifyEmail) return
    try {
      await fetch('/api/notify-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail, feature }),
      }).catch(() => {})
    } catch {}
    setNotifySubmitted(true)
  }

  return (
    <div className="relative">
      {/* Blurred content behind */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full mx-4 p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 mb-5">
            <Lock className="w-7 h-7 text-blue-600" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {isNL ? 'Pro functie' : 'Pro feature'}
          </h3>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            {isNL
              ? `${feature || 'Deze functie'} is beschikbaar voor Pro gebruikers. Upgrade voor volledige toegang tot alle GEO tools.`
              : `${feature || 'This feature'} is available for Pro users. Upgrade for full access to all GEO tools.`}
          </p>

          <div className="space-y-3 text-left mb-6">
            {(isNL
              ? ['Onbeperkte AI visibility scans', 'GEO Analyse & optimalisatie', 'Dagelijkse rank monitoring', 'Concurrentie tracking & alerts']
              : ['Unlimited AI visibility scans', 'GEO Analysis & optimization', 'Daily rank monitoring', 'Competitor tracking & alerts']
            ).map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
          </div>

          {!showNotify ? (
            <button
              onClick={() => setShowNotify(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold text-base hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer border-none"
            >
              <Crown className="w-4 h-4" />
              {isNL ? 'Ontgrendel met Pro' : 'Unlock with Pro'}
            </button>
          ) : !notifySubmitted ? (
            <div>
              <p className="text-sm text-slate-600 mb-3">
                {isNL
                  ? 'Pro komt eraan! Laat je e-mail achter voor een melding bij lancering.'
                  : 'Pro is coming! Leave your email for a notification at launch.'}
              </p>
              <form onSubmit={handleNotifySubmit} className="flex flex-col gap-2">
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder={isNL ? 'je@email.nl' : 'you@email.com'}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer border-none"
                >
                  {isNL ? 'Houd mij op de hoogte' : 'Notify me'}
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-2">
                {isNL ? 'Geen spam, alleen een melding bij lancering.' : 'No spam, just a notification at launch.'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-3">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {isNL ? 'Je staat op de lijst!' : 'You\'re on the list!'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isNL ? 'We mailen je zodra Pro beschikbaar is.' : 'We\'ll email you when Pro is available.'}
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-4">
            {isNL ? 'Vanaf €49,95/maand, maandelijks opzegbaar' : 'From €49.95/month, cancel anytime'}
          </p>
        </div>
      </div>
    </div>
  )
}
