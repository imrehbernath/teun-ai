import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Send notification to you
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@teun.ai',
      to: process.env.RESEND_TO_EMAIL,
      subject: '🎉 Nieuwe Teun.ai Early Access Aanmelding',
      html: `
        <h2>Nieuwe aanmelding voor Early Access!</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Datum:</strong> ${new Date().toLocaleString('nl-NL')}</p>
        <hr>
        <p><em>Via Teun.ai Coming Soon pagina</em></p>
      `,
    });

    // Send confirmation to subscriber
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@teun.ai',
      to: email,
      subject: 'Welkom bij Teun.ai Early Access 🚀',
      html: `
        <h2>Bedankt voor je aanmelding!</h2>
        <p>Hoi daar! 👋</p>
        <p>Je bent aangemeld voor early access tot <strong>Teun.ai</strong> - het eerste GEO optimalisatie platform van Nederland.</p>
        <p>We houden je op de hoogte van:</p>
        <ul>
          <li>De officiële lancering op 1 januari 2026</li>
          <li>Exclusieve early access mogelijkheden</li>
          <li>GEO tips & best practices</li>
          <li>Nieuwe features en updates</li>
        </ul>
        <p>Tot snel!</p>
        <p><strong>Team Teun.ai</strong></p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Wil je geen emails meer ontvangen? Stuur een reply met "Uitschrijven".
        </p>
      `,
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