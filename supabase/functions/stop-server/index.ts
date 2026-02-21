import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers with origin validation
function corsHeaders(req: Request) {
  const allowedOrigins = [
    'https://givrwrldservers.com',
    'https://www.givrwrldservers.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ]
  const allowList = (Deno.env.get('ALLOW_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const allAllowed = [...allowedOrigins, ...allowList]
  const origin = req.headers.get('origin') || ''
  const allow = allAllowed.includes(origin) ? origin : allAllowed[0] || '*'
  
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    console.log('🛑 Server stop request received for user:', user.id)
    
    // Use service role for database queries after authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const requestBody = await req.json()
    const { serverId } = requestBody
    
    if (!serverId) {
      return new Response(JSON.stringify({ error: 'No serverId provided' }), { 
        status: 400, 
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }
    
    console.log('🔍 Looking for server:', serverId)
    
    // Get server details and verify ownership
    const { data: server, error: fetchError } = await supabase
      .from('orders')
      .select('*, user_id')
      .eq('id', serverId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !server) {
      console.error('❌ Server not found or access denied:', fetchError)
      return new Response(JSON.stringify({ error: 'Server not found or access denied' }), { 
        status: 404, 
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }

    if (!server.pterodactyl_server_id) {
      console.error('❌ Server has no Pterodactyl ID')
      return new Response(JSON.stringify({ error: 'Server not properly provisioned' }), { 
        status: 400, 
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }

    // Pterodactyl configuration (use consistent env var names)
    const pterodactylUrl = Deno.env.get('PANEL_URL') || Deno.env.get('PTERODACTYL_URL')
    const pterodactylKey = Deno.env.get('PTERO_APP_KEY') || Deno.env.get('PTERODACTYL_API_KEY')

    if (!pterodactylUrl || !pterodactylKey) {
      console.error('❌ Pterodactyl configuration missing')
      return new Response(JSON.stringify({ error: 'Pterodactyl configuration missing' }), { 
        status: 500, 
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }

    // Get server identifier from Pterodactyl
    const serverDetailsResponse = await fetch(`${pterodactylUrl}/api/application/servers/${server.pterodactyl_server_id}`, {
      headers: {
        'Authorization': `Bearer ${pterodactylKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    });

    if (!serverDetailsResponse.ok) {
      const errorText = await serverDetailsResponse.text()
      console.error('❌ Failed to get server details from Pterodactyl:', errorText)
      return new Response(JSON.stringify({ error: 'Failed to get server details', details: errorText }), { 
        status: 500, 
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }

    const serverDetails = await serverDetailsResponse.json()
    const serverIdentifier = serverDetails.attributes.identifier

    console.log('🛑 Stopping server:', serverIdentifier)

    // Stop the server using application API (correct endpoint for admin operations)
    const stopResponse = await fetch(`${pterodactylUrl}/api/application/servers/${server.pterodactyl_server_id}/power`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pterodactylKey}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      },
      body: JSON.stringify({ signal: 'stop' })
    })
    
    if (stopResponse.ok) {
      console.log('✅ Server stop command sent successfully')
      
      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'stopping' })
        .eq('id', serverId)
      
      return new Response(JSON.stringify({ success: true, message: 'Server stop command sent' }), { 
        status: 200,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } 
      })
    } else {
      const errorText = await stopResponse.text()
      console.error('❌ Failed to stop server:', errorText)
      return new Response(JSON.stringify({ error: 'Failed to stop server', details: errorText }), { 
        status: 500, 
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } 
      })
    }

  } catch (error) {
    console.error('❌ Stop server error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ 
      error: 'Stop server failed', 
      details: errorMessage 
    }), { 
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})