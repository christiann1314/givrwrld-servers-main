import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple rate limiting for this function
const rateLimitStore: { [key: string]: { count: number; resetTime: number } } = {}

function checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const key = `payment:${identifier}`
  
  // Clean up expired entries
  Object.keys(rateLimitStore).forEach(k => {
    if (rateLimitStore[k].resetTime < now) {
      delete rateLimitStore[k]
    }
  })
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = { count: 1, resetTime: now + windowMs }
    return true
  }
  
  if (rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = { count: 1, resetTime: now + windowMs }
    return true
  }
  
  if (rateLimitStore[key].count >= maxRequests) {
    return false
  }
  
  rateLimitStore[key].count++
  return true
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  try {
    // Rate limiting check
    const authHeader = req.headers.get('Authorization') || ''
    const identifier = authHeader ? authHeader.slice(-10) : req.headers.get('x-forwarded-for') || 'unknown'
    
    if (!checkRateLimit(identifier)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get authenticated user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

      // Parse request body
      const { email, return_url } = await req.json()
      
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Initialize Stripe
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
        apiVersion: '2023-10-16',
      })

      // Check if customer exists in Stripe
      const customers = await stripe.customers.list({ email, limit: 1 })
      
      if (customers.data.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'No customer found. Please make a purchase first.' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const customer = customers.data[0]
      
      // Create billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: return_url || `${req.headers.get('origin')}/dashboard`
      })

      return new Response(JSON.stringify({
        url: portalSession.url
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Customer portal error:', error)
      return new Response(JSON.stringify({ 
        error: error.message || 'Failed to create customer portal session' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
})