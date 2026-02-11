import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const ADMIN_EMAILS = ['hallo@onlinelabs.nl', 'imre@onlinelabs.nl']

export async function GET() {
  try {
    // Create Supabase client with user session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userEmail = user.email
    const isAdmin = ADMIN_EMAILS.includes(userEmail)

    // If admin, return early
    if (isAdmin) {
      return NextResponse.json({
        isAdmin: true,
        isClientView: false,
        shares: [],
        sharedCompanies: [],
      })
    }

    // Check shared_access using service role (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: shares, error: sharesError } = await supabaseAdmin
      .from('shared_access')
      .select('*')
      .eq('client_email', userEmail)
      .eq('is_active', true)

    if (sharesError) {
      console.error('Error fetching shared access:', sharesError)
      return NextResponse.json({
        isAdmin: false,
        isClientView: false,
        shares: [],
        sharedCompanies: [],
      })
    }

    const isClientView = shares && shares.length > 0
    const sharedCompanies = [...new Set(shares?.map(s => s.company_name).filter(Boolean) || [])]

    return NextResponse.json({
      isAdmin: false,
      isClientView,
      shares: shares || [],
      sharedCompanies,
    })

  } catch (err) {
    console.error('Client access error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
