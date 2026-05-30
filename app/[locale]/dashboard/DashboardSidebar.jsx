'use client'

// Lichte, zelfstandige dashboard-sidebar voor de GEO Optimalisatie DIY-route.
// Bewust NIET de inline sidebar uit DashboardClient.jsx hergebruikt: die is sterk
// verweven met tab-state, company-switcher (CRUD) en Stripe-portal-state. Een
// schone gedeelde extractie zou een refactor van die monoliet vergen (stop-conditie
// Blok 4). Deze sidebar matcht de huisstijl (navy #292956 / slate) zodat de wizard
// als dashboard-pagina leest in plaats van standalone.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Search, BarChart3, Swords, Sparkles, ArrowRight, Zap } from 'lucide-react'

function TeunLogo({ size = 22 }) {
  return (
    <span style={{ fontFamily: 'var(--font-poppins), sans-serif', fontWeight: 700, fontSize: `${size}px`, letterSpacing: '-0.045em', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
      teun
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: 'var(--spark)', color: '#fff', fontSize: `${Math.round(size * 0.6)}px`, fontWeight: 700, margin: '0 3px', position: 'relative', top: '-1px' }}>◍</span>
      <span style={{ color: 'var(--ink)', fontWeight: 700 }}>ai</span>
    </span>
  )
}

export default function DashboardSidebar() {
  const locale = useLocale()
  const isNL = locale === 'nl'
  const lp = (path) => (locale === 'en' ? '/en' + path : path)

  const [userEmail, setUserEmail] = useState('')
  const [tier, setTier] = useState(null) // null | 'free' | 'lite' | 'pro'

  // Verberg de publieke site-header/footer zodat de wizard als dashboard-pagina leest
  // (zelfde mechanisme als DashboardClient.jsx).
  useEffect(() => {
    document.body.classList.add('dashboard-active')
    return () => document.body.classList.remove('dashboard-active')
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const adminEmails = ['imre@onlinelabs.nl', 'hallo@onlinelabs.nl']
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserEmail(user.email || '')
      if (adminEmails.includes(user.email)) { setTier('pro'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_tier')
        .eq('id', user.id)
        .single()
      const isPaid = ['active', 'canceling'].includes(profile?.subscription_status)
      setTier(isPaid ? (profile?.subscription_tier || 'pro') : 'free')
    })
  }, [])

  // Hoofd-tabs van het dashboard als deep-links (?tab=), zodat je vanuit de wizard
  // direct op de juiste sub-tab landt (bv. Prompts) i.p.v. de overzicht-tab.
  const navTabs = [
    { label: isNL ? 'Overzicht' : 'Overview', href: lp('/dashboard'), Icon: LayoutDashboard },
    { label: 'Prompts', href: lp('/dashboard') + '?tab=prompts', Icon: Search },
    { label: 'Rank Tracker', href: lp('/dashboard') + '?tab=rank-tracker', Icon: BarChart3 },
    { label: isNL ? 'Concurrenten' : 'Competitors', href: lp('/dashboard') + '?tab=competitors', Icon: Swords },
    { label: isNL ? 'GEO Optimalisatie' : 'GEO Optimization', href: lp('/dashboard') + '?tab=geo', Icon: Sparkles },
  ]

  const toolLinks = [
    { label: 'Brand Check', href: lp('/tools/brand-check') },
    { label: 'GEO Audit', href: lp('/tools/geo-audit') },
    { label: isNL ? 'GEO Optimalisatie DIY' : 'GEO Optimization DIY', href: lp('/dashboard/geo-analyse'), active: true },
    { label: isNL ? 'Chrome extensie' : 'Chrome extension', href: locale === 'nl' ? '/chrome-extensie' : '/en/chrome-extension' },
    { label: 'WordPress plugin', href: lp('/wordpress-plugin') },
  ]

  return (
    <>
      <style jsx global>{`
        body.dashboard-active > header, body.dashboard-active > nav, body.dashboard-active > footer,
        body.dashboard-active > div > header, body.dashboard-active > div > nav, body.dashboard-active > div > footer,
        body.dashboard-active > div > div > header, body.dashboard-active > div > div > nav,
        body.dashboard-active header:first-of-type, body.dashboard-active footer:last-of-type { display: none !important; }
        body.dashboard-active { overflow-x: hidden; }
      `}</style>

      <aside className="fixed left-0 top-0 bottom-0 w-[240px] flex flex-col z-[100] border-r border-slate-200" style={{ background: '#fafaf8' }}>
        {/* Navy accent bar */}
        <div className="h-1" style={{ background: '#292956' }} />

        {/* Logo */}
        <div className="px-5 pt-5 pb-4">
          <Link href={lp('/')} className="no-underline"><TeunLogo size={22} /></Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-1 overflow-y-auto">
          {navTabs.map(item => (
            <Link key={item.label} href={item.href} className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-500 hover:text-slate-700 hover:bg-white/60 rounded-lg transition-colors no-underline">
              <item.Icon className="w-4 h-4 shrink-0 text-slate-400" /><span className="flex-1">{item.label}</span>
            </Link>
          ))}

          <div className="h-px bg-slate-200 my-3" />
          <div className="text-[10px] text-slate-400 px-3 mb-2 uppercase tracking-[0.08em] font-semibold">Tools</div>

          {toolLinks.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 pr-3 py-2 text-[13px] transition-colors no-underline rounded-lg ${item.active ? 'shadow-sm font-semibold' : 'px-3 text-slate-500 hover:text-slate-700 hover:bg-white/60'}`}
              style={item.active ? { background: '#ffffff', color: '#292956', borderLeft: '3px solid #292956', paddingLeft: '9px' } : {}}
            >
              <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${item.active ? '' : 'text-slate-400'}`} style={item.active ? { color: '#292956' } : {}} />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Upgrade (alleen voor niet-Pro) */}
        {tier && tier !== 'pro' && (
          <div className="px-4 py-3 border-t border-slate-200">
            <Link href={lp('/pricing')} className="flex items-center gap-2.5 px-3 py-3 rounded-lg border border-slate-200 bg-white hover:shadow-sm transition-all no-underline">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#292956' }}><Zap className="w-4 h-4 text-white" /></div>
              <div>
                <div className="text-[12px] font-semibold text-slate-800">{isNL ? 'Upgrade naar Lite of Pro' : 'Upgrade to Lite or Pro'}</div>
                <div className="text-[10px] text-slate-500">{isNL ? 'Vanaf €29,95/mnd' : 'From €29.95/mo'}</div>
              </div>
            </Link>
          </div>
        )}

        {/* User */}
        {userEmail && (
          <div className="px-4 py-3 border-t border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 text-white" style={{ background: '#292956' }}>{userEmail.slice(0, 2).toUpperCase()}</div>
              <div className="text-[12px] text-slate-600 truncate min-w-0">{userEmail}</div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
