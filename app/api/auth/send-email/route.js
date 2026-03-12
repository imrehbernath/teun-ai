// app/api/auth/send-email/route.js
// Supabase Auth Hook (Send Email) → Resend
// Sends bilingual auth emails based on user_metadata.locale
// Setup: Supabase Dashboard → Auth → Hooks → Send Email → HTTP → https://teun.ai/api/auth/send-email

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET
const FROM_EMAIL = 'Teun.ai <hallo@teun.ai>'

// ═══════════════════════════════════════════════
// VERIFY SUPABASE WEBHOOK
// ═══════════════════════════════════════════════

function verifyWebhook(request) {
  // Skip verification for now — Supabase signs payload as JWT
  // TODO: add proper JWT verification with jose library
  return true
}

// ═══════════════════════════════════════════════
// EMAIL ACTION TYPE → URL TYPE MAPPING
// ═══════════════════════════════════════════════

const ACTION_TO_URL_TYPE = {
  signup: 'email',
  magic_link: 'magiclink',
  recovery: 'recovery',
  email_change: 'email_change',
  invite: 'invite',
}

function buildConfirmUrl(siteUrl, tokenHash, actionType, redirectTo) {
  const type = ACTION_TO_URL_TYPE[actionType] || actionType
  let url = `${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=${type}`
  if (redirectTo) {
    // Extract final destination from callback URL (e.g. /auth/callback?next=/reset-password → /reset-password)
    let finalRedirect = redirectTo
    try {
      const redirectUrl = new URL(redirectTo, siteUrl)
      const nextParam = redirectUrl.searchParams.get('next')
      if (nextParam) finalRedirect = nextParam
    } catch {}
    url += `&next=${encodeURIComponent(finalRedirect)}`
  }
  return url
}

// ═══════════════════════════════════════════════
// EMAIL TEMPLATES (NL + EN)
// ═══════════════════════════════════════════════

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#292956,#3d3d7a);padding:28px 32px;text-align:center;">
              <span style="color:#ffffff!important;font-size:22px;font-weight:700;letter-spacing:0.5px;text-decoration:none;">TEUN<span style="color:#ffffff!important;">&#8203;.AI</span></span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                Teun.ai, Herengracht 221, Amsterdam
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(url, label) {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="background:linear-gradient(to right,#292956,#3d3d7a);border-radius:10px;padding:14px 28px;">
        <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">${label}</a>
      </td>
    </tr>
  </table>`
}

// ── SIGNUP CONFIRMATION ──

const signupTemplates = {
  nl: (url) => ({
    subject: 'Bevestig je account bij Teun.ai',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Welkom bij Teun.ai!</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        Leuk dat je er bent. Klik op de knop hieronder om je emailadres te bevestigen en direct te starten met het meten van je AI-zichtbaarheid.
      </p>
      ${ctaButton(url, 'Bevestig emailadres &rarr;')}
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Of kopieer deze link naar je browser:</p>
      <p style="color:#6366f1;font-size:11px;word-break:break-all;margin:0 0 20px;">${url}</p>
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Deze link is 24 uur geldig. Heb je dit niet aangevraagd? Dan kun je deze email negeren.
      </p>
    `),
  }),
  en: (url) => ({
    subject: 'Confirm your Teun.ai account',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Welcome to Teun.ai!</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        Great to have you on board. Click the button below to confirm your email and start measuring your AI visibility.
      </p>
      ${ctaButton(url, 'Confirm email &rarr;')}
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Or copy this link to your browser:</p>
      <p style="color:#6366f1;font-size:11px;word-break:break-all;margin:0 0 20px;">${url}</p>
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        This link is valid for 24 hours. If you didn't request this, you can safely ignore this email.
      </p>
    `),
  }),
}

// ── MAGIC LINK ──

const magicLinkTemplates = {
  nl: (url) => ({
    subject: 'Inloggen bij Teun.ai',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Inloggen bij Teun.ai</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        Welkom terug! Klik op de knop hieronder om veilig in te loggen.
      </p>
      ${ctaButton(url, 'Inloggen &rarr;')}
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Deze link is 1 uur geldig. Heb je dit niet aangevraagd? Dan kun je deze email negeren.
      </p>
    `),
  }),
  en: (url) => ({
    subject: 'Log in to Teun.ai',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Log in to Teun.ai</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        Welcome back! Click the button below to securely log in.
      </p>
      ${ctaButton(url, 'Log in &rarr;')}
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        This link is valid for 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    `),
  }),
}

// ── PASSWORD RESET ──

const recoveryTemplates = {
  nl: (url) => ({
    subject: 'Wachtwoord resetten - Teun.ai',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Wachtwoord resetten</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        Je hebt een verzoek ingediend om je wachtwoord te resetten. Klik op de knop hieronder om een nieuw wachtwoord in te stellen.
      </p>
      ${ctaButton(url, 'Wachtwoord resetten &rarr;')}
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Deze link is 1 uur geldig. Heb je dit niet zelf aangevraagd? Dan kun je deze email negeren en blijft je wachtwoord ongewijzigd.
      </p>
    `),
  }),
  en: (url) => ({
    subject: 'Reset your password - Teun.ai',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Reset your password</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        You requested a password reset. Click the button below to set a new password.
      </p>
      ${ctaButton(url, 'Reset password &rarr;')}
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        This link is valid for 1 hour. If you didn't request this, you can safely ignore this email and your password will remain unchanged.
      </p>
    `),
  }),
}

// ── EMAIL CHANGE ──

const emailChangeTemplates = {
  nl: (url, currentEmail, newEmail) => ({
    subject: 'Bevestig je nieuwe emailadres - Teun.ai',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Bevestig je nieuwe emailadres</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        Je hebt een verzoek ingediend om je emailadres te wijzigen${currentEmail ? ` van <strong>${currentEmail}</strong>` : ''}${newEmail ? ` naar <strong>${newEmail}</strong>` : ''}.
      </p>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        Klik op de knop hieronder om deze wijziging te bevestigen.
      </p>
      ${ctaButton(url, 'Emailadres wijzigen &rarr;')}
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Deze link is 1 uur geldig. Heb je deze wijziging niet zelf aangevraagd? Neem dan direct contact met ons op.
      </p>
    `),
  }),
  en: (url, currentEmail, newEmail) => ({
    subject: 'Confirm your new email - Teun.ai',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Confirm your new email address</h2>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        You requested to change your email address${currentEmail ? ` from <strong>${currentEmail}</strong>` : ''}${newEmail ? ` to <strong>${newEmail}</strong>` : ''}.
      </p>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 4px;">
        Click the button below to confirm this change.
      </p>
      ${ctaButton(url, 'Confirm email change &rarr;')}
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        This link is valid for 1 hour. If you didn't request this change, please contact us immediately.
      </p>
    `),
  }),
}

// ═══════════════════════════════════════════════
// SEND VIA RESEND
// ═══════════════════════════════════════════════

async function sendEmail(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend API error: ${response.status} ${error}`)
  }

  return response.json()
}

// ═══════════════════════════════════════════════
// POST HANDLER (Supabase Auth Hook)
// ═══════════════════════════════════════════════

export async function POST(request) {
  try {
    // Verify webhook authenticity
    if (!verifyWebhook(request)) {
      console.error('❌ Send email hook: invalid webhook secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const { user, email_data } = payload

    if (!user?.email || !email_data) {
      console.error('❌ Send email hook: missing user or email_data', payload)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const {
      token_hash,
      redirect_to,
      email_action_type,
    } = email_data

    // Always use our own domain, never the Supabase URL
    const site_url = 'https://teun.ai'

    const email = user.email
    const newEmail = user.new_email || email_data.new_email || null
    const locale = user.user_metadata?.locale || 'nl'
    const lang = locale === 'en' ? 'en' : 'nl'

    // Build confirmation URL
    const confirmUrl = buildConfirmUrl(site_url, token_hash, email_action_type, redirect_to)

    console.log(`📧 Send email hook: ${email_action_type} to ${email} (${lang})`)

    // Select template based on action type and language
    let emailContent

    switch (email_action_type) {
      case 'signup':
        emailContent = signupTemplates[lang](confirmUrl)
        break

      case 'magic_link':
        emailContent = magicLinkTemplates[lang](confirmUrl)
        break

      case 'recovery':
        emailContent = recoveryTemplates[lang](confirmUrl)
        break

      case 'email_change':
        emailContent = emailChangeTemplates[lang](confirmUrl, email, newEmail)
        break

      case 'invite':
        // Use signup template for invites
        emailContent = signupTemplates[lang](confirmUrl)
        break

      default:
        console.error(`❌ Unknown email_action_type: ${email_action_type}`)
        return NextResponse.json({ error: `Unknown action: ${email_action_type}` }, { status: 400 })
    }

    // Send via Resend
    const result = await sendEmail(email, emailContent.subject, emailContent.html)

    console.log(`✅ Email sent: ${email_action_type} to ${email} (${lang}) — Resend ID: ${result.id}`)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('❌ Send email hook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
