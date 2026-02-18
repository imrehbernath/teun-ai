// app/api/v1/connect/route.js
// WordPress Plugin Connection Endpoint
//
// Called when a user saves their API key in the WP plugin settings.
// Registers/updates the WordPress site connection.

import { NextResponse } from 'next/server'
import { validateApiKey, supabase } from '@/lib/wp-plugin/auth'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      api_key,
      site_url,
      site_name,
      wp_version,
      plugin_version,
      locale,
      seo_plugin,
      multilingual,
    } = body

    // ─── Validate required fields ───
    if (!api_key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    if (!site_url) {
      return NextResponse.json(
        { error: 'Site URL is required' },
        { status: 400 }
      )
    }

    // ─── Validate API key ───
    const auth = await validateApiKey(api_key)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error, valid: false },
        { status: 401 }
      )
    }

    // ─── Normalize site URL ───
    const normalizedUrl = normalizeSiteUrl(site_url)

    // ─── Check for existing connection ───
    const { data: existing } = await supabase
      .from('wp_connections')
      .select('*')
      .eq('api_key_id', auth.data.keyId)
      .eq('site_url', normalizedUrl)
      .single()

    let connection

    if (existing) {
      // ─── Update existing connection ───
      const { data: updated, error } = await supabase
        .from('wp_connections')
        .update({
          site_name: site_name || existing.site_name,
          wp_version: wp_version || existing.wp_version,
          plugin_version: plugin_version || existing.plugin_version,
          locale: locale || existing.locale,
          seo_plugin: seo_plugin || existing.seo_plugin,
          multilingual: multilingual || existing.multilingual,
          is_active: true,
          last_connected_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating connection:', error)
        return NextResponse.json(
          { error: 'Failed to update connection' },
          { status: 500 }
        )
      }

      connection = updated
      console.log(`🔄 WP Connection updated: ${normalizedUrl}`)

    } else {
      // ─── Create new connection ───
      const { data: created, error } = await supabase
        .from('wp_connections')
        .insert({
          user_id: auth.data.userId,
          api_key_id: auth.data.keyId,
          site_url: normalizedUrl,
          site_name: site_name || '',
          wp_version: wp_version || '',
          plugin_version: plugin_version || '',
          locale: locale || 'en',
          seo_plugin: seo_plugin || 'none',
          multilingual: multilingual || 'none',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating connection:', error)
        return NextResponse.json(
          { error: 'Failed to create connection' },
          { status: 500 }
        )
      }

      connection = created
      console.log(`✅ New WP Connection: ${normalizedUrl} (${site_name})`)
    }

    // ─── Return connection data ───
    return NextResponse.json({
      website_id: connection.website_id,
      plan: auth.data.plan,
      limits: auth.data.limits,
      connected: true,
    })

  } catch (error) {
    console.error('Connect endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Normalize a site URL for consistent matching.
 * Removes trailing slashes, forces https, removes www.
 */
function normalizeSiteUrl(url) {
  try {
    let normalized = url.trim().toLowerCase()
    
    // Ensure protocol
    if (!normalized.startsWith('http')) {
      normalized = 'https://' + normalized
    }
    
    const parsed = new URL(normalized)
    
    // Remove www
    let hostname = parsed.hostname.replace(/^www\./, '')
    
    // Reconstruct without trailing slash
    return `${parsed.protocol}//${hostname}${parsed.pathname.replace(/\/$/, '')}`
  } catch {
    // If URL parsing fails, just clean it up
    return url.trim().toLowerCase().replace(/\/+$/, '')
  }
}
