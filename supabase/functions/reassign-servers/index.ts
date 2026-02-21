import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Server reassignment request received')
    
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

    // Get servers that need reassignment
    const { data: servers, error } = await supabase
      .from('user_servers')
      .select('*')
      .in('status', ['installing', 'offline', 'error'])
      .not('pterodactyl_server_id', 'is', null)

    if (error || !servers) {
      console.error('❌ Error fetching servers:', error)
      return new Response('Error fetching servers', { status: 500, headers: corsHeaders })
    }

    console.log(`🔍 Found ${servers.length} servers to reassign:`, servers.map(s => ({ 
      id: s.id, 
      name: s.server_name, 
      pterodactyl_id: s.pterodactyl_server_id,
      current_ip: s.ip,
      current_port: s.port
    })))

    const results = []

    // Get node allocations first 
    const nodeId = 1 // Assuming node ID 1 based on screenshot
    const allocationsResponse = await fetch(`${pterodactylUrl}/api/application/nodes/${nodeId}/allocations`, {
      headers: {
        'Authorization': `Bearer ${pterodactylKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    })

    if (!allocationsResponse.ok) {
      console.error('❌ Failed to fetch node allocations')
      return new Response('Failed to fetch allocations', { status: 500, headers: corsHeaders })
    }

    const allocationsData = await allocationsResponse.json()
    // Filter for unassigned allocations with correct IP and high ports to avoid conflicts
    const unassignedAllocations = allocationsData.data.filter((alloc: any) => 
      !alloc.attributes.assigned && 
      alloc.attributes.ip === '15.204.251.32' && 
      alloc.attributes.port >= 25567
    )
    
    console.log(`📍 Found ${unassignedAllocations.length} unassigned allocations`)

    for (let i = 0; i < servers.length && i < unassignedAllocations.length; i++) {
      const server = servers[i]
      const allocation = unassignedAllocations[i]
      
      console.log(`🔧 Reassigning server: ${server.server_name} to ${allocation.attributes.ip}:${allocation.attributes.port}`)

      try {
        // Update server build configuration to use new allocation
        const buildUpdateResponse = await fetch(`${pterodactylUrl}/api/application/servers/${server.pterodactyl_server_id}/build`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${pterodactylKey}`,
            'Content-Type': 'application/json',
            'Accept': 'Application/vnd.pterodactyl.v1+json'
          },
          body: JSON.stringify({
            allocation: allocation.attributes.id,
            add_allocations: [],
            remove_allocations: []
          })
        })

        if (!buildUpdateResponse.ok) {
          const errorText = await buildUpdateResponse.text()
          console.error(`❌ Failed to update server allocation for ${server.server_name}:`, errorText)
          results.push({ server: server.server_name, status: 'failed', error: 'Allocation update failed' })
          continue
        }

        // Update our database with new IP/port
        await supabase
          .from('user_servers')
          .update({ 
            ip: allocation.attributes.ip,
            port: allocation.attributes.port.toString(),
            status: 'offline'
          })
          .eq('id', server.id)

        console.log(`✅ Successfully reassigned ${server.server_name} to ${allocation.attributes.ip}:${allocation.attributes.port}`)

        // Now try to start the server
        const serverDetailsResponse = await fetch(`${pterodactylUrl}/api/application/servers/${server.pterodactyl_server_id}`, {
          headers: {
            'Authorization': `Bearer ${pterodactylKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json'
          }
        })

        if (serverDetailsResponse.ok) {
          const serverDetails = await serverDetailsResponse.json()
          const serverIdentifier = serverDetails.attributes.identifier

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
            await supabase
              .from('user_servers')
              .update({ status: 'starting' })
              .eq('id', server.id)

            results.push({ 
              server: server.server_name, 
              status: 'reassigned_and_started',
              new_ip: allocation.attributes.ip,
              new_port: allocation.attributes.port
            })
          } else {
            results.push({ 
              server: server.server_name, 
              status: 'reassigned_start_failed',
              new_ip: allocation.attributes.ip,
              new_port: allocation.attributes.port
            })
          }
        }

      } catch (error) {
        console.error(`❌ Error processing server ${server.server_name}:`, error)
        results.push({ server: server.server_name, status: 'failed', error: error.message })
      }
    }

    return new Response(JSON.stringify({
      message: 'Server reassignment completed',
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Reassignment error:', error)
    return new Response(JSON.stringify({ 
      error: 'Reassignment failed', 
      details: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})