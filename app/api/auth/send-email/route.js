// app/api/auth/send-email/route.js
// Supabase Auth Hook: "Send Email" — routes through Resend with NL/EN templates
// 
// Setup in Supabase Dashboard:
// → Authentication → Hooks → Send Email (HTTP)
// → URL: https://teun.ai/api/auth/send-email
// → HTTP Header: Authorization: Bearer <SUPABASE_AUTH_HOOK_SECRET>

import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Verify the request comes from Supabase
function verifySupabaseHook(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  return token === process.env.SUPABASE_AUTH_HOOK_SECRET
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function getConfirmSignupEmail(locale, confirmUrl) {
  const isNL = locale === 'nl'

  const subject = isNL 
    ? 'Bevestig je Teun.ai account' 
    : 'Confirm your Teun.ai account'

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://teun.ai/Teun-ai-logo.png" alt="Teun.ai" width="120" style="margin-bottom: 8px;" />
  </div>

  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; text-align: center;">
    
    <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 16px;">
      ${isNL ? 'Welkom bij Teun.ai! 🎉' : 'Welcome to Teun.ai! 🎉'}
    </h2>
    
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      ${isNL 
        ? 'Klik op de knop hieronder om je account te bevestigen en te beginnen met het meten van je AI-zichtbaarheid.' 
        : 'Click the button below to confirm your account and start measuring your AI visibility.'}
    </p>
    
    <a href="${confirmUrl}" 
       style="display: inline-block; background: linear-gradient(135deg, #1E1E3F, #2D2D5F); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">
      ${isNL ? 'Bevestig Account ✓' : 'Confirm Account ✓'}
    </a>
    
    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; line-height: 1.5;">
      ${isNL ? 'Link werkt niet? Kopieer deze URL:' : "Link doesn't work? Copy this URL:"}
      <br/>
      <a href="${confirmUrl}" style="color: #64748b; word-break: break-all;">${confirmUrl}</a>
    </p>
  </div>
  
  <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
    © Teun.ai — AI Visibility Platform by OnlineLabs
  </p>
</div>`

  return { subject, html }
}


function getMagicLinkEmail(locale, magicLinkUrl) {
  const isNL = locale === 'nl'

  const subject = isNL 
    ? 'Je Teun.ai login link' 
    : 'Your Teun.ai login link'

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://teun.ai/Teun-ai-logo.png" alt="Teun.ai" width="120" style="margin-bottom: 8px;" />
  </div>

  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; text-align: center;">
    
    <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 16px;">
      ${isNL ? 'Log in bij Teun.ai 🔑' : 'Log in to Teun.ai 🔑'}
    </h2>
    
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      ${isNL 
        ? 'Klik op de knop om in te loggen. Deze link is 1 uur geldig.' 
        : 'Click the button to log in. This link is valid for 1 hour.'}
    </p>
    
    <a href="${magicLinkUrl}" 
       style="display: inline-block; background: linear-gradient(135deg, #1E1E3F, #2D2D5F); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">
      ${isNL ? 'Inloggen →' : 'Log In →'}
    </a>
    
    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; line-height: 1.5;">
      ${isNL 
        ? 'Heb je deze email niet aangevraagd? Je kunt dit bericht veilig negeren.' 
        : "Didn't request this? You can safely ignore this email."}
    </p>
  </div>
  
  <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
    © Teun.ai — AI Visibility Platform by OnlineLabs
  </p>
</div>`

  return { subject, html }
}


function getPasswordResetEmail(locale, resetUrl) {
  const isNL = locale === 'nl'

  const subject = isNL 
    ? 'Reset je Teun.ai wachtwoord' 
    : 'Reset your Teun.ai password'

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://teun.ai/Teun-ai-logo.png" alt="Teun.ai" width="120" style="margin-bottom: 8px;" />
  </div>

  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; text-align: center;">
    
    <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 16px;">
      ${isNL ? 'Wachtwoord Resetten 🔐' : 'Reset Password 🔐'}
    </h2>
    
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      ${isNL 
        ? 'Klik op de knop om een nieuw wachtwoord in te stellen.' 
        : 'Click the button to set a new password.'}
    </p>
    
    <a href="${resetUrl}" 
       style="display: inline-block; background: linear-gradient(135deg, #1E1E3F, #2D2D5F); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">
      ${isNL ? 'Reset Wachtwoord' : 'Reset Password'}
    </a>
    
    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; line-height: 1.5;">
      ${isNL 
        ? 'Heb je dit niet aangevraagd? Je kunt dit bericht veilig negeren.' 
        : "Didn't request this? You can safely ignore this email."}
    </p>
  </div>
  
  <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
    © Teun.ai — AI Visibility Platform by OnlineLabs
  </p>
</div>`

  return { subject, html }
}


// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request) {
  // Verify hook authenticity
  if (!verifySupabaseHook(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    
    // Supabase Send Email hook payload structure:
    // { user: { id, email, user_metadata: { locale: 'nl' } }, email_data: { token, token_hash, redirect_to, ... } }
    const { user, email_data } = payload
    
    if (!user?.email || !email_data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Get locale from user metadata (set during signup/magic link)
    const locale = user.user_metadata?.locale || 'nl'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai'
    
    // Determine email type and build URL + template
    let emailContent
    const emailType = email_data.email_action_type

    switch (emailType) {
      case 'signup': {
        const confirmUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=email`
        emailContent = getConfirmSignupEmail(locale, confirmUrl)
        break
      }
      
      case 'magic_link': {
        const magicLinkUrl = `${siteUrl}/auth/callback?code=${email_data.token}`
        emailContent = getMagicLinkEmail(locale, magicLinkUrl)
        break
      }
      
      case 'recovery': {
        const resetUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=recovery`
        emailContent = getPasswordResetEmail(locale, resetUrl)
        break
      }
      
      default: {
        console.warn(`[Auth Email] Unknown email type: ${emailType}`)
        // Fallback: let Supabase handle it
        return NextResponse.json({ success: true })
      }
    }

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'Teun.ai <noreply@teun.ai>',
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    if (error) {
      console.error('[Auth Email] Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    console.log(`[Auth Email] Sent ${emailType} email to ${user.email} (${locale}) — Resend ID: ${data?.id}`)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[Auth Email] Hook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
