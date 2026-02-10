// app/api/client-access/route.js
// Klant-kant: check of er shares beschikbaar zijn en track views
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['hallo@onlinelabs.nl', 'imre@onlinelabs.nl']

// GET: Check of huidige user shared scans heeft
export async function GET(request) {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const isAdmin = ADMIN_EMAILS.includes(user.email)

  // Haal alle actieve shares op voor deze user
  const { data: shares, error } = await supabase
    .from('shared_access')
    .select('*')
    .or(`client_id.eq.${user.id},client_email.eq.${user.email}`)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Als er shares zijn, is dit een client view
  const isClientView = !isAdmin && shares && shares.length > 0
  
  // Track dat de klant heeft gekeken
  if (isClientView) {
    for (const share of shares) {
      await supabase
        .from('shared_access')
        .update({ 
          last_viewed_at: new Date().toISOString(),
          client_id: user.id  // Zorg dat client_id altijd gekoppeld is
        })
        .eq('id', share.id)
    }
  }

  return NextResponse.json({
    isAdmin,
    isClientView,
    shares: shares || [],
    sharedCompanies: (shares || []).map(s => s.company_name),
    user: {
      id: user.id,
      email: user.email
    }
  })
}
