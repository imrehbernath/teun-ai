// lib/rank-tracker-tiers.js
// Tier configuratie voor AI Rank Tracker Pro

export const RANK_TRACKER_TIERS = {
  free: {
    name: 'Gratis',
    nameEn: 'Free',
    maxKeywords: 5,
    maxCompetitors: 0,
    cronEnabled: false,
    geoOptimisation: false,
    price: 0,
  },
  starter: {
    name: 'Starter',
    nameEn: 'Starter',
    maxKeywords: 20,
    maxCompetitors: 3,
    cronEnabled: true,
    geoOptimisation: false,
    price: 2995, // cents
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  pro: {
    name: 'Pro',
    nameEn: 'Pro',
    maxKeywords: 50,
    maxCompetitors: 10,
    cronEnabled: true,
    geoOptimisation: true,
    price: 4995, // cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
  },
};

// Bepaal tier op basis van Supabase user metadata of Stripe subscription
export function getUserTier(user) {
  if (!user) return RANK_TRACKER_TIERS.free;
  
  const email = user.email || user.user_metadata?.email;
  if (email === process.env.ADMIN_EMAIL) return RANK_TRACKER_TIERS.pro;
  
  const tier = user.user_metadata?.subscription_tier || 'free';
  return RANK_TRACKER_TIERS[tier] || RANK_TRACKER_TIERS.free;
}

export function getTierLimits(tierName) {
  return RANK_TRACKER_TIERS[tierName] || RANK_TRACKER_TIERS.free;
}
