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
      subject: 'Nieuwe nieuwsbrief aanmelding',
      html: `
        <h2>Nieuwe nieuwsbrief aanmelding</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Datum:</strong> ${new Date().toLocaleString('nl-NL')}</p>
      `,
    });

    // Send confirmation to subscriber
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@teun.ai',
      to: email,
      subject: 'Welkom bij de Teun.ai nieuwsbrief',
      html: `
        <h2>Welkom bij de Teun.ai nieuwsbrief</h2>
        <p>Hoi daar!</p>
        <p>Je ontvangt vanaf nu onze nieuwsbrief over AI-zichtbaarheid en GEO. We delen regelmatig:</p>
        <ul>
          <li>GEO tips en best practices</li>
          <li>Inzichten over AI-zichtbaarheid in ChatGPT, Perplexity en Google AI</li>
          <li>Updates en nieuwe features van Teun.ai</li>
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