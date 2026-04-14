// app/api/stripe/checkout/route.js
// Creates a Stripe Checkout Session for Teun.ai Lite or Pro
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

const PRICES = {
  lite: {
    monthly: process.env.STRIPE_PRICE_LITE_MONTHLY,
    annual: process.env.STRIPE_PRICE_LITE_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || process.env.STRIPE_PRICE_ANNUAL,
  },
}

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { plan = 'monthly', tier = 'pro', locale = 'nl' } = body

    // Support both old (no tier) and new (with tier) pricing page
    const tierPrices = PRICES[tier] || PRICES['pro']
    const priceId = tierPrices[plan]
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or tier' }, { status: 400 })
    }

    // Get current user from Supabase
    const supabase = await createServiceClient()
    
    let userId = null
    let userEmail = null

    if (body.userId) {
      const { data: { user } } = await supabase.auth.admin.getUserById(body.userId)
      if (user) {
        userId = user.id
        userEmail = user.email
      }
    }

    if (!userId) {
      const signupUrl = locale === 'en'
        ? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/en/signup?plan=${tier}&billing=${plan}`
        : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?plan=${tier}&billing=${plan}`
      
      return NextResponse.json({ url: signupUrl, requiresAuth: true })
    }

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: userId,
        },
      })
      customerId = customer.id

      // Save customer ID to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
      
      if (updateError) {
        console.error('❌ Failed to save stripe_customer_id:', updateError.message)
      } else {
        console.log(`✅ Stripe customer ${customerId} saved for user ${userId}`)
      }
    }

    // Build success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const successUrl = locale === 'en'
      ? `${baseUrl}/en/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = locale === 'en'
      ? `${baseUrl}/en/pricing`
      : `${baseUrl}/pricing`

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card', 'ideal'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: locale === 'nl' ? 'nl' : 'en',
      metadata: {
        supabase_user_id: userId,
        tier: tier,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          tier: tier,
          plan: plan,
        },
      },
      allow_promotion_codes: true,
    })

    console.log(`✅ Checkout session created: ${session.id} for user ${userId} (${tier}/${plan})`)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('❌ Stripe Checkout Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
