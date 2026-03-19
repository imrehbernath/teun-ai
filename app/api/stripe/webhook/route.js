// app/api/stripe/webhook/route.js
// Handles Stripe webhook events for subscription lifecycle
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  try {
    switch (event.type) {
      // ✅ Checkout completed — user just subscribed
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerId = session.customer
        const subscriptionId = session.subscription

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id
        const plan = priceId === process.env.STRIPE_PRICE_ANNUAL ? 'annual' : 'monthly'

        // Find user by stripe_customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              subscription_plan: plan,
              stripe_subscription_id: subscriptionId,
              subscription_start: new Date().toISOString(),
              subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', profile.id)

          console.log(`✅ Subscription activated for user ${profile.id} (${plan})`)
        } else {
          console.warn('⚠️ No profile found for customer:', customerId)
        }
        break
      }

      // ✅ Subscription updated (upgrade/downgrade/renewal)
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer
        const priceId = subscription.items.data[0]?.price.id
        const plan = priceId === process.env.STRIPE_PRICE_ANNUAL ? 'annual' : 'monthly'

        const status = subscription.cancel_at_period_end ? 'canceling' : subscription.status

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: status,
              subscription_plan: plan,
              subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', profile.id)

          console.log(`✅ Subscription updated for user ${profile.id}: ${status} (${plan})`)
        }
        break
      }

      // ❌ Subscription cancelled or expired
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              subscription_plan: null,
              stripe_subscription_id: null,
            })
            .eq('id', profile.id)

          console.log(`❌ Subscription canceled for user ${profile.id}`)
        }
        break
      }

      // ⚠️ Payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', profile.id)

          console.log(`⚠️ Payment failed for user ${profile.id}`)
        }
        break
      }

      default:
        console.log(`ℹ️ Unhandled Stripe event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook processing error:', error.message)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
