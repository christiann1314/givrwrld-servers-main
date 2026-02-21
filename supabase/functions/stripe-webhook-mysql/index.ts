// Stripe Webhook Handler - MySQL Version
// Processes Stripe webhook events and creates orders in MySQL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getMySQLPool,
  decryptSecret,
  getPlan,
  createOrder,
  updateOrderStatus,
} from '../_shared/mysql-client.ts';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.0';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get AES key from environment
    const aesKey = Deno.env.get('AES_KEY');
    if (!aesKey) {
      throw new Error('AES_KEY environment variable not set');
    }

    // Decrypt Stripe secrets from MySQL
    const stripeSecretKey = await decryptSecret('stripe', 'STRIPE_SECRET_KEY', aesKey);
    const stripeWebhookSecret = await decryptSecret('stripe', 'STRIPE_WEBHOOK_SECRET', aesKey);

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('Stripe secrets not found in database');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get webhook signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    // Verify webhook signature
    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing event: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === 'subscription' && session.subscription) {
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Extract metadata
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const term = session.metadata?.term || 'monthly';
        const region = session.metadata?.region || 'us-central';
        const serverName = session.metadata?.server_name || 'server';

        if (!userId || !planId) {
          console.error('Missing required metadata:', { userId, planId });
          return new Response(
            JSON.stringify({ error: 'Missing required metadata' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get plan details from MySQL
        const plan = await getPlan(planId);
        if (!plan) {
          console.error(`Plan not found: ${planId}`);
          return new Response(
            JSON.stringify({ error: `Plan not found: ${planId}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create order in MySQL
        const orderId = uuidv4();
        await createOrder({
          id: orderId,
          user_id: userId,
          item_type: plan.item_type as 'game' | 'vps',
          plan_id: planId,
          term: term as 'monthly' | 'quarterly' | 'yearly',
          region: region,
          server_name: serverName,
          status: 'paid',
          stripe_sub_id: subscription.id,
          stripe_customer_id: session.customer as string || undefined,
        });

        console.log(`✅ Order created: ${orderId} for plan ${planId}`);

        // TODO: Trigger provisioning worker here
        // This could be done via:
        // 1. Database trigger
        // 2. Queue system (Redis/RabbitMQ)
        // 3. HTTP call to provisioning worker
        // 4. Polling by worker

        return new Response(
          JSON.stringify({ 
            success: true, 
            order_id: orderId,
            message: 'Order created successfully' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle subscription events
    if (event.type === 'customer.subscription.updated' || 
        event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Update order status based on subscription status
      const pool = getMySQLPool();
      await pool.execute(
        `UPDATE orders 
         SET status = CASE 
           WHEN ? = 'active' THEN 'paid'
           WHEN ? = 'canceled' THEN 'canceled'
           ELSE status
         END
         WHERE stripe_sub_id = ?`,
        [subscription.status, subscription.status, subscription.id]
      );

      console.log(`✅ Updated order status for subscription: ${subscription.id}`);
    }

    // Log all events
    const pool = getMySQLPool();
    await pool.execute(
      `INSERT INTO stripe_events_log (event_id, type, payload, processed)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE processed = 1, processed_at = CURRENT_TIMESTAMP`,
      [event.id, event.type, JSON.stringify(event.data.object), 1]
    );

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



