// lib/slack-badge.js
// Eén bron van waarheid voor tier-badges in Slack-notificaties.
// Mapping volgt CLAUDE.md: subscription_tier 'lite' | 'pro' | null=legacy.
// Legacy subscribers (tier null + active status) tellen als Pro.

const ADMIN_EMAILS = ['imre@onlinelabs.nl', 'hallo@onlinelabs.nl']

/**
 * Bepaal Slack-badge voor user.
 * @param {object} supabase - Supabase admin/service client
 * @param {string|null|undefined} userId - profile.id of null/undefined voor anoniem
 * @returns {Promise<string>} badge string met emoji + label
 */
export async function getUserBadge(supabase, userId) {
  if (!userId) return '👤 Anoniem'
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, subscription_status, subscription_tier')
      .eq('id', userId)
      .single()

    if (!profile) return '🆓 Gratis'
    if (ADMIN_EMAILS.includes((profile.email || '').toLowerCase())) return '🔧 Admin'

    const isActive = ['active', 'canceling'].includes(profile.subscription_status)
    if (!isActive) return '🆓 Gratis'

    const tier = profile.subscription_tier
    if (tier === 'pro' || tier === null) return '⭐ Pro' // null = legacy = pro
    if (tier === 'lite') return '✨ Lite'
    return '🆓 Gratis'
  } catch (_) {
    return '🆓 Gratis'
  }
}
