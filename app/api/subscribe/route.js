import { NextResponse } from 'next/server';
import { isValidEmail } from '@/app/lib/utils';

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    // Validation
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Ongeldig email adres' },
        { status: 400 }
      );
    }

    // Rate limiting (simple implementation)
    // In production: use proper rate limiting with Redis/Upstash
    
    // Log subscription (in production: save to database)
    console.log('[SUBSCRIPTION]', {
      email,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent')
    });

    // TODO: Integrate with email service
    // - Mailchimp
    // - SendGrid
    // - ConvertKit
    // Example:
    // await mailchimp.lists.addListMember(LIST_ID, { email_address: email });
    
    return NextResponse.json({ 
      success: true,
      message: 'Successfully subscribed!' 
    });
    
  } catch (error) {
    console.error('[SUBSCRIPTION ERROR]', error);
    return NextResponse.json(
      { error: 'Er ging iets mis. Probeer het later opnieuw.' },
      { status: 500 }
    );
  }
}

// Security: Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}