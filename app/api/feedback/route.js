import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { rating, comment, email, scanId, sharedOnLinkedin } = await request.json();

    // Validatie
    if (!rating || !['positive', 'negative'].includes(rating)) {
      return NextResponse.json(
        { error: 'Invalid rating' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get user if logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Save feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert([
        {
          user_id: user?.id || null,
          scan_id: scanId || null,
          rating,
          comment: comment || null,
          email: email || null,
          shared_on_linkedin: sharedOnLinkedin || false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Feedback save error:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    // Optional: Send to Slack/Discord webhook
    // await notifySlack(data);

    return NextResponse.json({ 
      success: true,
      message: 'Bedankt voor je feedback!' 
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}