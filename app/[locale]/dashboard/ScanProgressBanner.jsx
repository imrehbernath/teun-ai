'use client'

// Globale "GEO Optimalisatie DIY scan loopt / klaar"-indicator. Leest de
// voortgang uit localStorage (key 'teun_geo_scan') + luistert naar het
// 'teun-geo-scan'-event dat runGeoScan per pagina afvuurt. Zo zie je de
// voortgang overal in het dashboard, ook nadat je uit de wizard wegklikt.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Loader2, CheckCircle2, ArrowRight, X } from 'lucide-react'

const KEY = 'teun_geo_scan'

export default function ScanProgressBanner() {
  const locale = useLocale()
  const isNL = locale === 'nl'
  const lp = (p) => (locale === 'en' ? '/en' + p : p)

  const [scan, setScan] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY)
        if (!raw) { setScan(null); return }
        const s = JSON.parse(raw)
        const age = Date.now() - (s.updatedAt || 0)
        // Verlopen state opruimen: 'klaar' na 15 min, vastgelopen 'running' na 30 min.
        if (s.status === 'done' && age > 15 * 60 * 1000) { localStorage.removeItem(KEY); setScan(null); return }
        if (s.status === 'running' && age > 30 * 60 * 1000) { localStorage.removeItem(KEY); setScan(null); return }
        setScan(s)
      } catch { setScan(null) }
    }
    read()
    const onEvt = (e) => { setScan(e.detail); setDismissed(false) }
    window.addEventListener('teun-geo-scan', onEvt)
    // Fallback-poll: same-tab localStorage-wijzigingen vuren geen 'storage'-event.
    const iv = setInterval(read, 2500)
    return () => { window.removeEventListener('teun-geo-scan', onEvt); clearInterval(iv) }
  }, [])

  if (!scan || dismissed) return null

  const running = scan.status === 'running'
  const pct = scan.total ? Math.min(100, Math.round((scan.done / scan.total) * 100)) : 0

  const close = () => {
    setDismissed(true)
    if (!running) { try { localStorage.removeItem(KEY) } catch {} }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-[320px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl p-4">
      <div className="flex items-start gap-3">
        {running
          ? <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin" style={{ color: '#292956' }} />
          : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-800">
            {running
              ? (isNL ? 'GEO Optimalisatie DIY scan loopt' : 'GEO Optimization DIY scan running')
              : (isNL ? 'Scan klaar' : 'Scan complete')}
          </p>
          {scan.company && <p className="text-[11px] text-slate-500 truncate">{scan.company}</p>}

          {running ? (
            <>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: '#292956' }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {isNL ? `Pagina ${scan.done} van ${scan.total}` : `Page ${scan.done} of ${scan.total}`}
              </p>
            </>
          ) : (
            <Link href={lp('/dashboard/geo-analyse') + '?view=results'} onClick={() => { try { localStorage.removeItem(KEY) } catch {} }} className="inline-flex items-center gap-1 text-[12px] font-semibold mt-1.5 no-underline hover:underline" style={{ color: '#292956' }}>
              {isNL ? 'Bekijk resultaten' : 'View results'} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <button onClick={close} className="text-slate-300 hover:text-slate-500 shrink-0 cursor-pointer bg-transparent border-none" aria-label="Sluiten">
          <X className="w-4 h-4" />
        </button>
      </div>

      {running && (
        <Link href={lp('/dashboard/geo-analyse')} className="block text-center text-[12px] font-semibold mt-3 no-underline hover:underline" style={{ color: '#292956' }}>
          {isNL ? 'Naar de scan' : 'Go to the scan'}
        </Link>
      )}
    </div>
  )
}
