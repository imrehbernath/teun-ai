// Toegang en promptlimiet voor GEO Optimalisatie DIY.
// GEO Optimalisatie DIY is een Lite + Pro-feature. Lite mag maximaal 10 prompts
// per GEO Analyse, Pro/legacy/admin onbeperkt. Eén plek zodat de page-scan-route
// en de prompt-scan-routes exact dezelfde tier-resolve gebruiken.

import { BETA_CONFIG } from '@/lib/beta-config'

export const GEO_LITE_PROMPT_CAP = 10

// Returns 'admin' | 'pro' | 'lite' | 'free'.
// Legacy subscribers (subscription_tier null + actieve subscription) gelden als
// pro, consistent met lib/beta-config.js en /api/tracked-keywords. Anonieme of
// onbekende users vallen terug op 'free'.
export async function resolveGeoAccessTier(supabase, user) {
  if (!user?.id) return 'free'
  if (user.email && BETA_CONFIG.ADMIN_EMAILS.includes(user.email)) return 'admin'

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_tier')
    .eq('id', user.id)
    .single()

  const isPaid = ['active', 'canceling'].includes(profile?.subscription_status)
  if (!isPaid) return 'free'
  return profile?.subscription_tier === 'lite' ? 'lite' : 'pro'
}

// True voor tiers die de DIY-tool mogen gebruiken (alles behalve free).
export function geoAccessAllowed(tier) {
  return tier === 'admin' || tier === 'pro' || tier === 'lite'
}
