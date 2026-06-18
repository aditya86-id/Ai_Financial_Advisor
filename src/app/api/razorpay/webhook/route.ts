import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const eventName = event.event
    const payload = event.payload

    // Use admin client to bypass Row Level Security (RLS) for server-to-server webhook syncing
    const supabase = createAdminClient()

    if (eventName === 'subscription.activated' || eventName === 'subscription.charged') {
      const subscription = payload.subscription.entity
      const razorpaySubscriptionId = subscription.id
      const razorpayPlanId = subscription.plan_id
      
      const currentPeriodEnd = new Date(subscription.current_end * 1000).toISOString()
      const userId = subscription.notes?.userId

      if (userId) {
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            status: 'active',
            razorpay_subscription_id: razorpaySubscriptionId,
            razorpay_plan_id: razorpayPlanId,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'razorpay_subscription_id' })

        if (error) {
          console.error('Error inserting subscription details:', error)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
      } else {
        console.warn('Subscription event received without userId in notes')
      }
    } else if (eventName === 'subscription.paused' || eventName === 'subscription.cancelled') {
      const subscription = payload.subscription.entity
      const razorpaySubscriptionId = subscription.id

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_subscription_id', razorpaySubscriptionId)

      if (error) {
        console.error('Error updating subscription status:', error)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
