// app/components/ToolsCrossSell.jsx
// Drop-in component for all tool result pages
// Usage: <ToolsCrossSell currentTool="brand-check" locale={locale} />
'use client'

import { Link } from '@/i18n/navigation'

const TOOLS = {
  'ai-visibility': {
    href: '/tools/ai-visibility',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
    ),
    nl: { name: 'AI Zichtbaarheid Scan', desc: 'Scan 4 AI-platforms tegelijk' },
    en: { name: 'AI Visibility Scan', desc: 'Scan 4 AI platforms at once' },
  },
  'geo-audit': {
    href: '/tools/geo-audit',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
      </svg>
    ),
    nl: { name: 'GEO Audit', desc: 'Pagina-score voor AI' },
    en: { name: 'GEO Audit', desc: 'Page score for AI' },
  },
  'ai-rank-tracker': {
    href: '/tools/ai-rank-tracker',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 7 12 7s5-3 7.5-3a2.5 2.5 0 0 1 0 5H18"/><path d="M18 15h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M6 15H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M6 9v12"/><path d="M18 9v12"/><path d="M12 3v18"/>
      </svg>
    ),
    nl: { name: 'AI Rank Tracker', desc: 'Check je AI-positie' },
    en: { name: 'AI Rank Tracker', desc: 'Check your AI position' },
  },
  'brand-check': {
    href: '/tools/brand-check',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    nl: { name: 'AI Brand Check', desc: 'Wat zegt AI over jouw merk?' },
    en: { name: 'AI Brand Check', desc: 'What does AI say about you?' },
  },
  'ai-prompt-explorer': {
    href: '/tools/ai-prompt-explorer',
    badge: 'BETA',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
        <path d="m22.54 12.43-1.42-.65-8.28 3.78a2 2 0 0 1-1.66 0l-8.28-3.78-1.42.65a1 1 0 0 0 0 1.82l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 .24-1.83Z"/>
      </svg>
    ),
    nl: { name: 'AI Prompt Explorer', desc: 'Welke prompts gebruiken klanten?' },
    en: { name: 'AI Prompt Explorer', desc: 'Which prompts do customers use?' },
  },
  'geo-analyse': {
    href: '/tools/ai-visibility',
    requiresLogin: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>
      </svg>
    ),
    nl: { name: 'GEO Analyse', desc: 'Compleet dashboard' },
    en: { name: 'GEO Analyse', desc: 'Complete dashboard' },
  },
}

// Context-afhankelijke kopregel per tool
const HEADERS = {
  'ai-visibility': {
    nl: 'Je weet nu hoe zichtbaar je bent. Wat kun je nog meer checken?',
    en: 'You know your visibility now. What else can you check?',
  },
  'geo-audit': {
    nl: 'Je hebt 1 pagina geanalyseerd. Ga verder met je AI-zichtbaarheid.',
    en: 'You analyzed 1 page. Continue with your AI visibility.',
  },
  'ai-rank-tracker': {
    nl: 'Je kent je positie. Wat willen je klanten nog meer weten?',
    en: 'You know your position. What else do your customers want to know?',
  },
  'brand-check': {
    nl: 'Je weet wat AI over je zegt. Wat kun je nog meer checken?',
    en: 'You know what AI says about you. What else can you check?',
  },
  'ai-prompt-explorer': {
    nl: 'Je kent de prompts. Check nu of AI jou ook aanbeveelt.',
    en: 'You know the prompts. Now check if AI recommends you.',
  },
}

export default function ToolsCrossSell({ currentTool, locale = 'nl' }) {
  const isEn = locale === 'en'
  const lang = isEn ? 'en' : 'nl'
  const otherTools = Object.entries(TOOLS).filter(([key]) => key !== currentTool)
  const header = HEADERS[currentTool]?.[lang] || (isEn ? 'Check your AI visibility with our free tools' : 'Check je AI-zichtbaarheid met onze gratis tools')

  return (
    <div className="mt-10 mb-6 max-w-3xl mx-auto px-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-2">
        {isEn ? '6 free tools' : '6 gratis tools'}
      </p>
      <p className="text-sm text-slate-600 text-center mb-5">
        {header}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {otherTools.map(([key, tool]) => (
          <Link
            key={key}
            href={tool.href}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
              {tool.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                {tool[lang].name}
                {tool.badge && (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{tool.badge}</span>
                )}
                {tool.requiresLogin && (
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                    {isEn ? 'Account' : 'Account'}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">{tool[lang].desc}</p>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
