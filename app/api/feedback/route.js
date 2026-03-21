import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { 
      rating, 
      comment, 
      email, 
      scanId, 
      companyName,
      totalMentions,
      sharedOnLinkedin,
      proRaffle,
      source
    } = await request.json();

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
      // Ga door met Slack, ook als DB faalt
    }

    // ✅ Slack notificatie
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const emoji = rating === 'positive' ? '👍' : '👎';
        const ratingText = rating === 'positive' ? 'Positief' : 'Negatief';
        
        const fields = [
          { type: 'mrkdwn', text: `*Rating:*\n${emoji} ${ratingText}` },
          { type: 'mrkdwn', text: `*Bedrijf:*\n${companyName || 'Onbekend'}` },
          { type: 'mrkdwn', text: `*Score:*\n${totalMentions ?? '?'} vermeldingen` },
          { type: 'mrkdwn', text: `*LinkedIn:*\n${sharedOnLinkedin ? '✅ Gedeeld' : '—'}` },
        ];

        if (email) {
          fields.push({ type: 'mrkdwn', text: `*🎁 PRO Verloting:*\n${email}` });
        }

        const blocks = [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${emoji} Scan Feedback${email ? ' + PRO Verloting' : ''}`,
              emoji: true
            }
          },
          { type: 'section', fields }
        ];

        if (comment) {
          blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `*Opmerking:*\n> ${comment}` }
          });
        }

        blocks.push(
          { type: 'divider' },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `${source || 'ai-visibility'} | ${new Date().toLocaleString('nl-NL')}` }]
          }
        );

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks })
        });

        console.log('✅ Feedback Slack notificatie verstuurd');
      } catch (slackError) {
        console.error('❌ Slack feedback error:', slackError);
      }
    }

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
