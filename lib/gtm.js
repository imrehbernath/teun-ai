export function pushDataLayer(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
}

export function trackScanComplete({ tool, locale }) {
  pushDataLayer('scan_complete', { tool, locale });
}
