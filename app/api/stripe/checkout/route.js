// app/api/stripe/checkout/route.js
// Creates a Stripe Checkout Session for Teun.ai Pro
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual: process.env.STRIPE_PRICE_ANNUAL,
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { plan = 'monthly', locale = 'nl' } = body

    const priceId = PRICES[plan]
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get current user from Supabase
    const supabase = await createServiceClient()
    
    // Try to get user from auth header/cookie
    let userId = null
    let userEmail = null

    // Check if user sent their ID in the body (from frontend)
    if (body.userId) {
      const { data: { user } } = await supabase.auth.admin.getUserById(body.userId)
      if (user) {
        userId = user.id
        userEmail = user.email
      }
    }

    // If not logged in, redirect to signup with plan info
    if (!userId) {
      const signupUrl = locale === 'en'
        ? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/en/signup?plan=pro&billing=${plan}`
        : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?plan=pro&billing=${plan}`
      
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
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
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
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan: plan,
        },
      },
      // Allow promo codes
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('❌ Stripe Checkout Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
