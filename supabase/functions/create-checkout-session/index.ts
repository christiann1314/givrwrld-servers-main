import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@18.5.0'

function cors(req: Request) {
  // Allow your production domain and common origins
  const allowedOrigins = [
    "https://givrwrldservers.com",
    "https://www.givrwrldservers.com",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  const allowList = (Deno.env.get("ALLOW_ORIGINS") ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const allAllowed = [...allowedOrigins, ...allowList];
  const origin = req.headers.get("origin") ?? "";
  const allow = allAllowed.includes(origin) ? origin : allAllowed[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

interface CheckoutRequest {
  item_type: 'game' | 'vps';
  plan_id: string;
  region: string;
  server_name: string;
  term: 'monthly' | 'quarterly' | 'yearly';
  addons?: string[];
  success_url?: string;
  cancel_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors(req) })
  }

  try {
    const { item_type, plan_id, region, server_name, term, addons, success_url, cancel_url }: CheckoutRequest = await req.json()

    // Validate required fields
    if (!item_type || !plan_id || !region || !server_name || !term) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: item_type, plan_id, region, server_name, term' }),
        { status: 400, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase config:', { hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseAnonKey })
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get AES key for decrypting secrets
    const aesKey = Deno.env.get('AES_KEY')
    if (!aesKey) {
      return new Response(
        JSON.stringify({ error: 'AES_KEY environment variable not set' }),
        { status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get plan from MySQL
    const { getPlan } = await import('../_shared/mysql-client.ts')
    const plan = await getPlan(plan_id)

    if (!plan || plan.item_type !== item_type || !plan.is_active) {
      return new Response(
        JSON.stringify({ error: 'Plan not found or inactive' }),
        { status: 404, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt Stripe secret from MySQL
    const { decryptSecret } = await import('../_shared/mysql-client.ts')
    const stripeSecretKey = await decryptSecret('stripe', 'STRIPE_SECRET_KEY', aesKey)
    
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not found in MySQL')
      return new Response(
        JSON.stringify({ error: 'Payment system configuration error' }),
        { status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Build line items
    const lineItems = [{ price: plan.stripe_price_id, quantity: 1 }]
    
    // TODO: Add addon support if needed (addons table in MySQL)
    // For now, addons are not supported in MySQL migration

    // Validate and construct absolute URLs
    const origin = req.headers.get('origin') || 'https://givrwrldservers.com'
    const allowedOrigins = [
      'https://givrwrldservers.com',
      'https://www.givrwrldservers.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ]
    
    // Determine base URL - use origin if allowed, otherwise default to production
    let baseUrl = origin
    if (!allowedOrigins.includes(origin)) {
      baseUrl = 'https://givrwrldservers.com'
    }
    
    // Helper function to ensure absolute URL
    const ensureAbsoluteUrl = (url: string | undefined, defaultPath: string): string => {
      if (!url) {
        return `${baseUrl}${defaultPath}`
      }
      
      // If already absolute URL, validate and return
      try {
        const parsedUrl = new URL(url)
        // Check if origin is allowed
        if (allowedOrigins.includes(parsedUrl.origin)) {
          return url
        }
        // If origin not allowed, use baseUrl with the path
        return `${baseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      } catch {
        // Relative URL - prepend baseUrl
        const path = url.startsWith('/') ? url : `/${url}`
        return `${baseUrl}${path}`
      }
    }
    
    // Construct absolute URLs
    const finalSuccessUrl = ensureAbsoluteUrl(success_url, '/dashboard?success=true')
    const finalCancelUrl = ensureAbsoluteUrl(cancel_url, '/purchase')
    
    // Final validation - ensure URLs are absolute
    try {
      new URL(finalSuccessUrl)
      new URL(finalCancelUrl)
    } catch (error) {
      console.error('Failed to construct absolute URLs:', error)
      throw new Error('Invalid URL configuration')
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        user_id: user.id,
        item_type,
        plan_id,
        region,
        server_name,
        term,
        addons: JSON.stringify(addons || [])
      },
      customer_email: user.email,
      subscription_data: {
        metadata: {
          user_id: user.id,
          item_type,
          plan_id,
          region,
          server_name,
          term,
          addons: JSON.stringify(addons || [])
        },
      },
    })

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...cors(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Checkout session error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' } }
    )
  }
})