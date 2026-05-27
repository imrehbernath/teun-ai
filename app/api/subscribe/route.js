import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Teun.ai <hallo@teun.ai>';

// Design tokens (mirror van app/globals.css, gelijk aan auth-mails)
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
};

const FONT_SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Poppins',sans-serif`;
const FONT_SERIF = `'Lora',Georgia,'Times New Roman',serif`;

function highlight(phrase) {
  return `<em style="font-style:italic;background-image:linear-gradient(transparent 70%, ${COLORS.sparkSoft} 70%, ${COLORS.sparkSoft} 92%, transparent 92%);padding:0 2px;">${phrase}</em>`;
}

function heading(html) {
  return `<h1 style="margin:0 0 14px;color:${COLORS.ink};font-family:${FONT_SERIF};font-size:26px;font-weight:600;line-height:1.25;letter-spacing:-0.01em;">${html}</h1>`;
}

function paragraph(html, bottom = 14) {
  return `<p style="margin:0 0 ${bottom}px;color:${COLORS.ink2};font-size:15px;line-height:1.65;font-family:${FONT_SANS};">${html}</p>`;
}

function bulletList(items) {
  const lis = items.map(item => `<li style="margin:0 0 6px;color:${COLORS.ink2};font-size:15px;line-height:1.6;font-family:${FONT_SANS};">${item}</li>`).join('');
  return `<ul style="margin:0 0 18px;padding:0 0 0 20px;">${lis}</ul>`;
}

function note(text) {
  return `<p style="margin:8px 0 0;color:${COLORS.ink3};font-size:12px;line-height:1.6;font-family:${FONT_SANS};">${text}</p>`;
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
          <tr>
            <td style="background:${COLORS.cream2};padding:36px 32px 24px;text-align:center;border-bottom:1px solid ${COLORS.line};">
              <img src="https://teun.ai/teun-ai-mascotte-mail.png" alt="Teun" width="120" height="120" style="display:block;margin:0 auto 12px;border:0;outline:none;text-decoration:none;width:120px;max-width:120px;height:auto;">
              <div style="font-family:${FONT_SERIF};font-size:20px;font-weight:600;color:${COLORS.navy};letter-spacing:0.2px;">Teun<span style="color:${COLORS.spark};font-style:italic;">.ai</span></div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 28px;">
              ${content}
            </td>
          </tr>
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
</html>`;
}

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Notificatie naar admin (intern, simpel HTML)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: process.env.RESEND_TO_EMAIL,
      subject: 'Nieuwe nieuwsbrief aanmelding',
      html: `
        <h2>Nieuwe nieuwsbrief aanmelding</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Datum:</strong> ${new Date().toLocaleString('nl-NL')}</p>
      `,
    });

    // Bevestiging naar subscriber in cream/Lora design met mascotte
    const subscriberHtml = emailWrapper(`
      ${heading(`Welkom bij de ${highlight('Teun.ai')} nieuwsbrief`)}
      ${paragraph('Leuk dat je erbij bent. Je ontvangt vanaf nu onze nieuwsbrief over AI-zichtbaarheid en GEO. We delen regelmatig:')}
      ${bulletList([
        'GEO tips en best practices',
        'Inzichten over AI-zichtbaarheid in ChatGPT, Perplexity en Google AI',
        'Updates en nieuwe features van Teun.ai',
      ])}
      ${paragraph('Tot snel!')}
      ${paragraph(`<strong style="color:${COLORS.ink};">Team Teun.ai</strong>`, 0)}
      ${note('Wil je geen e-mails meer ontvangen? Stuur een reply met "Uitschrijven".')}
    `);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welkom bij de Teun.ai nieuwsbrief',
      html: subscriberHtml,
    });

    return NextResponse.json(
      { success: true, message: 'Subscription successful' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Resend Error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
