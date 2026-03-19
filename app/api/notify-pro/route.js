// app/api/notify-pro/route.js
// Collects emails from users interested in Pro
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { email, plan } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Store in a simple table (create if needed) or just log
    console.log(`📧 Pro interest: ${email} (${plan})`)

    // Optioneel: sla op in Supabase
    // await supabase.from('pro_waitlist').insert({ email, plan, created_at: new Date().toISOString() })

    // Optioneel: stuur Slack notificatie
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⭐ Nieuwe Pro interesse: ${email} (${plan})`
        })
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notify Pro error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
