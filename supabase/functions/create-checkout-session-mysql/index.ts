// Create Checkout Session - MySQL Version
// Creates Stripe checkout session using plan data from MySQL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import {
  decryptSecret,
  getPlan,
} from '../_shared/mysql-client.ts';

interface CheckoutRequest {
  plan_id: string;
  user_id: string;
  server_name: string;
  region: string;
  term?: 'monthly' | 'quarterly' | 'yearly';
}

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

    // Decrypt Stripe secret from MySQL
    const stripeSecretKey = await decryptSecret('stripe', 'STRIPE_SECRET_KEY', aesKey);
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not found in database');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse request
    const { plan_id, user_id, server_name, region, term = 'monthly' }: CheckoutRequest = await req.json();

    if (!plan_id || !user_id || !server_name || !region) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_id, user_id, server_name, region' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan from MySQL
    const plan = await getPlan(plan_id);
    if (!plan) {
      return new Response(
        JSON.stringify({ error: `Plan not found: ${plan_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan.stripe_price_id) {
      return new Response(
        JSON.stringify({ error: `Plan ${plan_id} does not have a Stripe price ID` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get panel URL for success/cancel URLs
    const panelUrl = await decryptSecret('panel', 'PANEL_URL', aesKey) || 'https://givrwrldservers.com';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user_id,
        plan_id: plan_id,
        term: term,
        region: region,
        server_name: server_name,
        game: plan.game || '',
        item_type: plan.item_type,
      },
      success_url: `${panelUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${panelUrl}/checkout?canceled=true`,
      customer_email: undefined, // Will be collected during checkout
    });

    return new Response(
      JSON.stringify({
        session_id: session.id,
        url: session.url,
        plan: {
          id: plan.id,
          display_name: plan.display_name,
          game: plan.game,
          ram_gb: plan.ram_gb,
          price_monthly: plan.price_monthly,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



