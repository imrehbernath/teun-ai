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
  // Skip verification for now
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
    // Extract final destination path from redirectTo
    // e.g. "https://teun.ai/auth/callback?next=/reset-password" → "/reset-password"
    // e.g. "https://teun.ai/reset-password" → "/reset-password"
    // e.g. "https://teun.ai/en/reset-password" → "/en/reset-password"
    let finalRedirect = redirectTo
    try {
      const redirectUrl = new URL(redirectTo, siteUrl)
      const nextParam = redirectUrl.searchParams.get('next')
      if (nextParam) {
        finalRedirect = nextParam
      } else {
        finalRedirect = redirectUrl.pathname
      }
    } catch {}
    url += `&next=${encodeURIComponent(finalRedirect)}`
  }
  return url
}

// ═══════════════════════════════════════════════
// EMAIL TEMPLATES (NL + EN)
// ═══════════════════════════════════════════════

// Design tokens (mirror van app/globals.css)
const COLORS = {
  cream: '#FAF7F2',
  cream2: '#F2ECDF',
  navy: '#1A2B5E',
  ink: '#0F1730',
  ink2: '#3A4465',
  ink3: '#6B7391',
  spark: '#E8623A',
  sparkSoft: '#F4C9B5',
  line: 'rgba(15,23,48,0.08)',
}

const FONT_SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Poppins',sans-serif`
const FONT_SERIF = `'Lora',Georgia,'Times New Roman',serif`

function highlight(phrase) {
  return `<em style="font-style:italic;background-image:linear-gradient(transparent 70%, ${COLORS.sparkSoft} 70%, ${COLORS.sparkSoft} 92%, transparent 92%);padding:0 2px;">${phrase}</em>`
}

function heading(html) {
  return `<h1 style="margin:0 0 14px;color:${COLORS.ink};font-family:${FONT_SERIF};font-size:26px;font-weight:600;line-height:1.25;letter-spacing:-0.01em;">${html}</h1>`
}

function paragraph(html, bottom = 14) {
  return `<p style="margin:0 0 ${bottom}px;color:${COLORS.ink2};font-size:15px;line-height:1.65;font-family:${FONT_SANS};">${html}</p>`
}

function fallbackLink(label, url) {
  return `<p style="margin:24px 0 4px;color:${COLORS.ink3};font-size:12px;font-family:${FONT_SANS};">${label}</p>
      <p style="margin:0 0 18px;color:${COLORS.navy};font-size:11px;word-break:break-all;font-family:${FONT_SANS};">${url}</p>`
}

function note(text) {
  return `<p style="margin:8px 0 0;color:${COLORS.ink3};font-size:12px;line-height:1.6;font-family:${FONT_SANS};">${text}</p>`
}

function ctaButton(url, label) {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 8px;">
    <tr>
      <td style="background:${COLORS.spark};border-radius:10px;">
        <a href="${url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 30px;font-family:${FONT_SANS};letter-spacing:0.2px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:${COLORS.cream};font-family:${FONT_SANS};color:${COLORS.ink};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLORS.cream};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:20px;border:1px solid ${COLORS.line};overflow:hidden;">
          <!-- Header met mascotte -->
          <tr>
            <td style="background:${COLORS.cream2};padding:36px 32px 24px;text-align:center;border-bottom:1px solid ${COLORS.line};">
              <img src="https://teun.ai/teun-ai-mascotte-mail.png" alt="Teun" width="120" height="120" style="display:block;margin:0 auto 12px;border:0;outline:none;text-decoration:none;width:120px;max-width:120px;height:auto;">
              <div style="font-family:${FONT_SERIF};font-size:20px;font-weight:600;color:${COLORS.navy};letter-spacing:0.2px;">Teun<span style="color:${COLORS.spark};font-style:italic;">.ai</span></div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:36px 36px 28px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 24px;background:${COLORS.cream};border-top:1px solid ${COLORS.line};text-align:center;">
              <p style="margin:0;color:${COLORS.ink3};font-size:12px;font-family:${FONT_SANS};">
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

// ── SIGNUP CONFIRMATION ──

const signupTemplates = {
  nl: (url) => ({
    subject: 'Bevestig je account bij Teun.ai',
    html: emailWrapper(`
      ${heading(`Welkom bij ${highlight('Teun.ai')}`)}
      ${paragraph('Leuk dat je er bent. Bevestig hieronder je emailadres en start direct met het meten van je AI-zichtbaarheid.')}
      ${ctaButton(url, 'Bevestig emailadres &rarr;')}
      ${fallbackLink('Of kopieer deze link naar je browser:', url)}
      ${note('Deze link is 24 uur geldig. Heb je dit niet aangevraagd? Dan kun je deze email negeren.')}
    `),
  }),
  en: (url) => ({
    subject: 'Confirm your Teun.ai account',
    html: emailWrapper(`
      ${heading(`Welcome to ${highlight('Teun.ai')}`)}
      ${paragraph('Great to have you on board. Confirm your email below and start measuring your AI visibility right away.')}
      ${ctaButton(url, 'Confirm email &rarr;')}
      ${fallbackLink('Or copy this link to your browser:', url)}
      ${note(`This link is valid for 24 hours. If you didn't request this, you can safely ignore this email.`)}
    `),
  }),
}

// ── MAGIC LINK ──

const magicLinkTemplates = {
  nl: (url) => ({
    subject: 'Inloggen bij Teun.ai',
    html: emailWrapper(`
      ${heading(`Inloggen bij ${highlight('Teun.ai')}`)}
      ${paragraph('Welkom terug. Klik op de knop hieronder om veilig in te loggen.')}
      ${ctaButton(url, 'Inloggen &rarr;')}
      ${fallbackLink('Of kopieer deze link naar je browser:', url)}
      ${note('Deze link is 1 uur geldig. Heb je dit niet aangevraagd? Dan kun je deze email negeren.')}
    `),
  }),
  en: (url) => ({
    subject: 'Log in to Teun.ai',
    html: emailWrapper(`
      ${heading(`Log in to ${highlight('Teun.ai')}`)}
      ${paragraph('Welcome back. Click the button below to securely log in.')}
      ${ctaButton(url, 'Log in &rarr;')}
      ${fallbackLink('Or copy this link to your browser:', url)}
      ${note(`This link is valid for 1 hour. If you didn't request this, you can safely ignore this email.`)}
    `),
  }),
}

// ── PASSWORD RESET ──

const recoveryTemplates = {
  nl: (url) => ({
    subject: 'Wachtwoord resetten - Teun.ai',
    html: emailWrapper(`
      ${heading(`Wachtwoord ${highlight('resetten')}`)}
      ${paragraph('Je hebt een verzoek ingediend om je wachtwoord te resetten. Stel hieronder een nieuw wachtwoord in.')}
      ${ctaButton(url, 'Wachtwoord resetten &rarr;')}
      ${fallbackLink('Of kopieer deze link naar je browser:', url)}
      ${note('Deze link is 1 uur geldig. Heb je dit niet zelf aangevraagd? Dan kun je deze email negeren en blijft je wachtwoord ongewijzigd.')}
    `),
  }),
  en: (url) => ({
    subject: 'Reset your password - Teun.ai',
    html: emailWrapper(`
      ${heading(`${highlight('Reset')} your password`)}
      ${paragraph('You requested a password reset. Set a new password below.')}
      ${ctaButton(url, 'Reset password &rarr;')}
      ${fallbackLink('Or copy this link to your browser:', url)}
      ${note(`This link is valid for 1 hour. If you didn't request this, you can safely ignore this email and your password will remain unchanged.`)}
    `),
  }),
}

// ── EMAIL CHANGE ──

const emailChangeTemplates = {
  nl: (url, currentEmail, newEmail) => ({
    subject: 'Bevestig je nieuwe emailadres - Teun.ai',
    html: emailWrapper(`
      ${heading(`Bevestig je ${highlight('nieuwe')} emailadres`)}
      ${paragraph(`Je hebt een verzoek ingediend om je emailadres te wijzigen${currentEmail ? ` van <strong style="color:${COLORS.ink};">${currentEmail}</strong>` : ''}${newEmail ? ` naar <strong style="color:${COLORS.ink};">${newEmail}</strong>` : ''}.`)}
      ${paragraph('Klik op de knop hieronder om deze wijziging te bevestigen.')}
      ${ctaButton(url, 'Emailadres wijzigen &rarr;')}
      ${fallbackLink('Of kopieer deze link naar je browser:', url)}
      ${note('Deze link is 1 uur geldig. Heb je deze wijziging niet zelf aangevraagd? Neem dan direct contact met ons op.')}
    `),
  }),
  en: (url, currentEmail, newEmail) => ({
    subject: 'Confirm your new email - Teun.ai',
    html: emailWrapper(`
      ${heading(`Confirm your ${highlight('new')} email address`)}
      ${paragraph(`You requested to change your email address${currentEmail ? ` from <strong style="color:${COLORS.ink};">${currentEmail}</strong>` : ''}${newEmail ? ` to <strong style="color:${COLORS.ink};">${newEmail}</strong>` : ''}.`)}
      ${paragraph('Click the button below to confirm this change.')}
      ${ctaButton(url, 'Confirm email change &rarr;')}
      ${fallbackLink('Or copy this link to your browser:', url)}
      ${note(`This link is valid for 1 hour. If you didn't request this change, please contact us immediately.`)}
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

    console.log(`📧 Send email hook: ${email_action_type} to ${email} (${lang}) → ${confirmUrl}`)

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
