// lib/wp-plugin/auth.js
// Shared authentication for WordPress plugin API endpoints

import { createClient } from '@supabase/supabase-js'

// Service client (no cookies needed — API key auth, not session auth)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Validate an API key and return the associated data.
 * Used by all /api/v1/* endpoints.
 * 
 * @param {string} apiKey - The x-api-key header value
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
export async function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'Missing API key' }
  }

  // Prefix check for quick rejection
  if (!apiKey.startsWith('teunai_')) {
    return { valid: false, error: 'Invalid API key format' }
  }

  const { data: keyData, error } = await supabase
    .from('wp_api_keys')
    .select('*, wp_connections(*)')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single()

  if (error || !keyData) {
    return { valid: false, error: 'Invalid or inactive API key' }
  }

  // Update last_used_at and usage_count
  await supabase
    .from('wp_api_keys')
    .update({ 
      last_used_at: new Date().toISOString(),
      usage_count: (keyData.usage_count || 0) + 1
    })
    .eq('id', keyData.id)

  return {
    valid: true,
    data: {
      keyId: keyData.id,
      userId: keyData.user_id,
      plan: keyData.plan,
      limits: {
        scans_per_month: keyData.scans_per_month,
        prompts_per_page: keyData.prompts_per_page,
        platforms: keyData.platforms,
      },
      connections: keyData.wp_connections || [],
    }
  }
}

/**
 * Check if a user has remaining scans this month.
 * 
 * @param {string} apiKeyId 
 * @param {string} plan 
 * @param {number} scansPerMonth 
 * @returns {{ allowed: boolean, used: number, limit: number }}
 */
export async function checkScanLimit(apiKeyId, plan, scansPerMonth) {
  // Premium = unlimited
  if (plan === 'premium' || plan === 'agency') {
    return { allowed: true, used: 0, limit: -1 }
  }

  const currentMonth = new Date().toISOString().slice(0, 7) // '2026-02'

  // Get or create monthly usage record
  const { data: usage } = await supabase
    .from('wp_monthly_usage')
    .select('scans_used')
    .eq('api_key_id', apiKeyId)
    .eq('month', currentMonth)
    .single()

  const used = usage?.scans_used || 0

  return {
    allowed: used < scansPerMonth,
    used,
    limit: scansPerMonth,
  }
}

/**
 * Increment the monthly scan counter.
 */
export async function incrementScanCount(apiKeyId) {
  const currentMonth = new Date().toISOString().slice(0, 7)

  // Upsert: create if not exists, increment if exists
  const { data: existing } = await supabase
    .from('wp_monthly_usage')
    .select('id, scans_used')
    .eq('api_key_id', apiKeyId)
    .eq('month', currentMonth)
    .single()

  if (existing) {
    await supabase
      .from('wp_monthly_usage')
      .update({ scans_used: existing.scans_used + 1 })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('wp_monthly_usage')
      .insert({
        api_key_id: apiKeyId,
        month: currentMonth,
        scans_used: 1,
      })
  }
}

/**
 * Generate a new API key.
 * Format: teunai_xxxxxxxxxxxxxxxxxxxx (32 char random hex)
 */
export function generateApiKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'teunai_'
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

export { supabase }
