import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    console.log('🚀 Manual server start request received for user:', user.id)
    
    // Use service role for database queries after authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Pterodactyl configuration
    const pterodactylUrl = Deno.env.get('PTERODACTYL_URL')
    const pterodactylKey = Deno.env.get('PTERODACTYL_API_KEY')

    if (!pterodactylUrl || !pterodactylKey) {
      console.error('❌ Pterodactyl configuration missing')
      return new Response('Pterodactyl configuration missing', { status: 500, headers: corsHeaders })
    }

    // Get all servers that need to be started (only for authenticated user)
    const { data: servers, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['installing', 'offline', 'paid', 'provisioning'])
      .not('pterodactyl_server_id', 'is', null)

    if (error || !servers) {
      console.error('❌ Error fetching servers:', error)
      return new Response('Error fetching servers', { status: 500, headers: corsHeaders })
    }

    console.log(`🔍 Found ${servers.length} servers to start:`, servers.map(s => ({ id: s.id, name: s.server_name, pterodactyl_id: s.pterodactyl_server_id })))

    const results = []

    for (const server of servers) {
      console.log(`🚀 Starting server: ${server.server_name} (Pterodactyl ID: ${server.pterodactyl_server_id})`)

      try {
        // Get server details from Pterodactyl
        const serverDetailsResponse = await fetch(`${pterodactylUrl}/api/application/servers/${server.pterodactyl_server_id}`, {
          headers: {
            'Authorization': `Bearer ${pterodactylKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json'
          }
        })

        if (!serverDetailsResponse.ok) {
          console.error(`❌ Failed to get server details for ${server.server_name}`)
          results.push({ server: server.server_name, status: 'failed', error: 'Could not fetch server details' })
          continue
        }

        const serverDetails = await serverDetailsResponse.json()
        const serverIdentifier = serverDetails.attributes.identifier

        console.log(`🎯 Server identifier: ${serverIdentifier}`)

        // Start the server
        const startResponse = await fetch(`${pterodactylUrl}/api/client/servers/${serverIdentifier}/power`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pterodactylKey}`,
            'Content-Type': 'application/json',
            'Accept': 'Application/vnd.pterodactyl.v1+json'
          },
          body: JSON.stringify({ signal: 'start' })
        })

        if (startResponse.ok) {
          console.log(`✅ Successfully started server: ${server.server_name}`)
          
          // Update order status
          await supabase
            .from('orders')
            .update({ status: 'starting' })
            .eq('id', server.id)

          results.push({ server: server.server_name, status: 'started' })
        } else {
          const errorText = await startResponse.text()
          console.error(`❌ Failed to start server ${server.server_name}:`, errorText)
          results.push({ server: server.server_name, status: 'failed', error: errorText })
        }
      } catch (error) {
        console.error(`❌ Error processing server ${server.server_name}:`, error)
        results.push({ server: server.server_name, status: 'failed', error: error.message })
      }
    }

    return new Response(JSON.stringify({
      message: 'Manual server start completed',
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Manual start error:', error)
    return new Response(JSON.stringify({ 
      error: 'Manual start failed', 
      details: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})