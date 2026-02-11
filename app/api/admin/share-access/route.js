// app/api/admin/share-access/route.js
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Admin email(s) die shares mogen aanmaken
const ADMIN_EMAILS = ['hallo@onlinelabs.nl', 'imre@onlinelabs.nl']

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

  // Enrich with scan counts (tool_integrations instead of perplexity_scans)
  const enrichedShares = await Promise.all(shares.map(async (share) => {
    const { count: perplexityCount } = await supabase
      .from('tool_integrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', share.owner_id)
      .ilike('company_name', share.company_name)

    const { count: chatgptCount } = await supabase
      .from('chatgpt_scans')
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
        chatgpt: chatgptCount || 0,
        google_ai: googleCount || 0,
        ai_overviews: overviewCount || 0
      }
    }
  }))

  return NextResponse.json({ shares: enrichedShares })
}

// POST: Maak nieuwe share aan + stuur invite email
export async function POST(request) {
  const supabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { clientEmail, companyName, website, websiteId, note } = body

  if (!clientEmail || !companyName) {
    return NextResponse.json({ error: 'Email en bedrijfsnaam zijn verplicht' }, { status: 400 })
  }

  const normalizedEmail = clientEmail.toLowerCase().trim()

  // Check of er al een share bestaat voor deze combinatie
  const { data: existing } = await supabase
    .from('shared_access')
    .select('id')
    .eq('owner_id', user.id)
    .eq('client_email', normalizedEmail)
    .ilike('company_name', companyName)
    .eq('is_active', true)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Deze klant heeft al toegang tot dit bedrijf' }, { status: 409 })
  }

  // Check of de klant al een Supabase account heeft
  const { data: clientUsers } = await supabase.auth.admin.listUsers()
  const clientUser = clientUsers?.users?.find(u => u.email === normalizedEmail)

  const { data: share, error } = await supabase
    .from('shared_access')
    .insert({
      owner_id: user.id,
      client_id: clientUser?.id || null,
      client_email: normalizedEmail,
      company_name: companyName,
      website: website || null,
      website_id: websiteId || null,
      note: note || null,
      permissions: ['view']
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send invite email via Resend — always link to signup (works for existing users too)
  let emailSent = false
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@teun.ai',
      to: normalizedEmail,
      subject: `${companyName} — jouw AI-zichtbaarheidsrapport staat klaar`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://teun.ai/images/teun-ai-mascotte.png" alt="Teun.ai" style="width: 60px; height: auto;" />
          </div>

          <h1 style="color: #1e1e3f; font-size: 22px; margin-bottom: 8px;">
            Jouw AI-zichtbaarheidsrapport is klaar
          </h1>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hoi,
          </p>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            We hebben de AI-zichtbaarheid van <strong>${companyName}</strong> geanalyseerd op 4 AI-platforms: 
            Perplexity, ChatGPT, Google AI Modus en AI Overviews.
          </p>

          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            ${clientUser 
              ? 'Log in met je bestaande account om de resultaten te bekijken.' 
              : 'Maak een gratis account aan met dit e-mailadres om je resultaten te bekijken.'}
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://teun.ai/signup" 
               style="background-color: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">
              ${clientUser ? 'Inloggen en bekijken' : 'Gratis account aanmaken'}
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
            Gebruik dit e-mailadres om in te loggen: <strong>${normalizedEmail}</strong>
          </p>

          ${note ? `<p style="color: #64748b; font-size: 13px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #6366f1;"><em>${note}</em></p>` : ''}

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />

          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Dit rapport is gedeeld via <a href="https://teun.ai" style="color: #6366f1; text-decoration: none;">Teun.ai</a> — 
            het eerste Nederlandse platform voor AI-zichtbaarheid.
          </p>
        </div>
      `
    })
    emailSent = true
  } catch (emailError) {
    console.error('Failed to send invite email:', emailError)
  }

  return NextResponse.json({ 
    success: true, 
    share,
    emailSent,
    clientHasAccount: !!clientUser,
    message: emailSent
      ? `Uitnodiging verstuurd naar ${normalizedEmail}. ${clientUser ? 'Klant kan direct inloggen.' : 'Zodra ze een account aanmaken, zien ze de resultaten.'}`
      : `Toegang klaargezet maar e-mail kon niet verstuurd worden. Deel de login link handmatig.`
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
    .delete()
    .eq('id', shareId)
    .eq('owner_id', user.id)

  if (error) {
    console.error('Delete share error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Toegang ingetrokken' })
}
