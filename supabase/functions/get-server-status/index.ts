import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple rate limiting for this function
const rateLimitStore: { [key: string]: { count: number; resetTime: number } } = {}

function checkRateLimit(identifier: string, maxRequests: number = 30, windowMs: number = 5 * 60 * 1000): boolean {
  const now = Date.now()
  const key = `user_data:${identifier}`
  
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
    const identifier = req.headers.get('x-forwarded-for') || 'unknown'
    
    if (!checkRateLimit(identifier)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create authenticated client to get user from JWT
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser()
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role client for database queries (now that user is authenticated)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get user servers - restricted to authenticated user's UUID
    const { data: servers } = await supabase
      .from('orders')
      .select(`
        id,
        server_name,
        status,
        plan_id,
        pterodactyl_server_id,
        pterodactyl_server_identifier,
        plans:plan_id (game, ram_gb)
      `)
      .eq('user_id', user.id)
      .in('status', ['paid', 'provisioning', 'installing', 'provisioned', 'active'])
      .order('created_at', { ascending: false })

      if (!servers || servers.length === 0) {
        return new Response(JSON.stringify({
          has_server: false,
          message: 'No servers found'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Return the first/main server info
      const mainServer = servers[0]
      const game = mainServer.plans?.game || 'unknown'
      
      return new Response(JSON.stringify({
        has_server: true,
        server_info: {
          id: mainServer.id,
          name: mainServer.server_name,
          status: mainServer.status,
          game: game,
          ram_gb: mainServer.plans?.ram_gb || null,
          pterodactyl_id: mainServer.pterodactyl_server_id,
          pterodactyl_identifier: mainServer.pterodactyl_server_identifier
        },
        total_servers: servers.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Get server status error:', error)
      return new Response(JSON.stringify({ 
        error: error.message || 'Failed to get server status' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
})