// app/api/admin/share-access/route.js
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Admin email(s) die shares mogen aanmaken
const ADMIN_EMAILS = ['hallo@onlinelabs.nl', 'imre@onlinelabs.nl']

async function isAdmin(supabase, userId) {
  const { data: { user } } = await supabase.auth.getUser()
  return user && ADMIN_EMAILS.includes(user.email)
}

// GET: Lijst alle shares (admin only)
export async function GET(request) {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: shares, error } = await supabase
    .from('shared_access')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with scan counts
  const enrichedShares = await Promise.all(shares.map(async (share) => {
    const { count: perplexityCount } = await supabase
      .from('perplexity_scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', share.owner_id)
      .ilike('company_name', share.company_name)

    const { count: googleCount } = await supabase
      .from('google_ai_scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', share.owner_id)
      .ilike('company_name', share.company_name)

    const { count: overviewCount } = await supabase
      .from('google_ai_overview_scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', share.owner_id)
      .ilike('company_name', share.company_name)

    return {
      ...share,
      scan_counts: {
        perplexity: perplexityCount || 0,
        google_ai: googleCount || 0,
        ai_overviews: overviewCount || 0
      }
    }
  }))

  return NextResponse.json({ shares: enrichedShares })
}

// POST: Maak nieuwe share aan
export async function POST(request) {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { clientEmail, companyName, website, note } = body

  if (!clientEmail || !companyName) {
    return NextResponse.json({ error: 'Email en bedrijfsnaam zijn verplicht' }, { status: 400 })
  }

  // Check of er al een share bestaat voor deze combinatie
  const { data: existing } = await supabase
    .from('shared_access')
    .select('id')
    .eq('owner_id', user.id)
    .eq('client_email', clientEmail.toLowerCase().trim())
    .ilike('company_name', companyName)
    .eq('is_active', true)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Deze klant heeft al toegang tot dit bedrijf' }, { status: 409 })
  }

  // Check of de klant al een Supabase account heeft
  const { data: clientUsers } = await supabase.auth.admin.listUsers()
  const clientUser = clientUsers?.users?.find(u => u.email === clientEmail.toLowerCase().trim())

  const { data: share, error } = await supabase
    .from('shared_access')
    .insert({
      owner_id: user.id,
      client_id: clientUser?.id || null,
      client_email: clientEmail.toLowerCase().trim(),
      company_name: companyName,
      website: website || null,
      note: note || null,
      permissions: ['view']
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    share,
    clientHasAccount: !!clientUser,
    message: clientUser 
      ? `Toegang verleend. ${clientEmail} kan nu inloggen en de resultaten bekijken.`
      : `Toegang klaargezet. Zodra ${clientEmail} een account aanmaakt, zien ze automatisch de resultaten.`
  })
}

// DELETE: Verwijder een share
export async function DELETE(request) {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const shareId = searchParams.get('id')

  if (!shareId) {
    return NextResponse.json({ error: 'Share ID is verplicht' }, { status: 400 })
  }

  const { error } = await supabase
    .from('shared_access')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', shareId)
    .eq('owner_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Toegang ingetrokken' })
}
