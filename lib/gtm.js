export function pushDataLayer(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
}

export function trackScanComplete({ tool, locale }) {
  // page_location en page_referrer expliciet meesturen zodat GA4 het event
  // betrouwbaar aan de juiste sessie + traffic source kan koppelen, ook bij
  // lange scans waar de auto-context kan wegvallen.
  pushDataLayer('scan_complete', {
    tool,
    locale,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    page_referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  });
}
