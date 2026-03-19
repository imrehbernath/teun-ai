// lib/stripe.js
// Stripe helpers for Teun.ai Pro subscription checks
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Check if user has active Pro subscription
export function isProUser(profile) {
  if (!profile) return false
  return ['active', 'canceling'].includes(profile.subscription_status)
}

// Check if subscription is still within paid period (for canceling users)
export function hasActiveAccess(profile) {
  if (!profile) return false
  if (profile.subscription_status === 'active') return true
  if (profile.subscription_status === 'canceling' && profile.subscription_current_period_end) {
    return new Date(profile.subscription_current_period_end) > new Date()
  }
  return false
}
