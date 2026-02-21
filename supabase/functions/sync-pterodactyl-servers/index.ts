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
    console.log('🔄 Syncing servers with Pterodactyl')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get current user
    const authHeader = req.headers.get('authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Get user's servers from database
    const { data: dbServers, error: dbError } = await supabase
      .from('user_servers')
      .select('*')
      .eq('user_id', user.id)

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return new Response('Database error', { status: 500, headers: corsHeaders })
    }

    const pterodactylUrl = Deno.env.get('PTERODACTYL_URL')
    const pterodactylKey = Deno.env.get('PTERODACTYL_API_KEY')

    if (!pterodactylUrl || !pterodactylKey) {
      console.error('❌ Pterodactyl configuration missing')
      return new Response('Pterodactyl configuration missing', { status: 500, headers: corsHeaders })
    }

    const deletedServers = []
    const updatedServers = []

    // Check each server in Pterodactyl
    for (const server of dbServers || []) {
      if (!server.pterodactyl_server_id) continue

      try {
        // Check if server exists in Pterodactyl
        const pterodactylResponse = await fetch(`${pterodactylUrl}/api/application/servers/${server.pterodactyl_server_id}`, {
          headers: {
            'Authorization': `Bearer ${pterodactylKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json'
          }
        })

        if (pterodactylResponse.status === 404) {
          // Server doesn't exist in Pterodactyl, delete from database
          console.log(`🗑️ Server ${server.server_name} not found in Pterodactyl, removing from database`)
          
          const { error: deleteError } = await supabase
            .from('user_servers')
            .delete()
            .eq('id', server.id)

          if (deleteError) {
            console.error('❌ Failed to delete server:', deleteError)
          } else {
            deletedServers.push(server.server_name)
          }
        } else if (pterodactylResponse.ok) {
          // Server exists, check for status updates
          const pterodactylData = await pterodactylResponse.json()
          const pterodactylStatus = pterodactylData.attributes.status
          
          let mappedStatus = 'offline'
          switch (pterodactylStatus) {
            case 'running': mappedStatus = 'online'; break
            case 'starting': mappedStatus = 'starting'; break
            case 'stopping': mappedStatus = 'stopping'; break
            case 'offline': mappedStatus = 'offline'; break
            default: mappedStatus = 'offline'
          }

          if (server.status !== mappedStatus) {
            console.log(`📊 Updating server ${server.server_name} status from ${server.status} to ${mappedStatus}`)
            
            const { error: updateError } = await supabase
              .from('user_servers')
              .update({ status: mappedStatus })
              .eq('id', server.id)

            if (updateError) {
              console.error('❌ Failed to update server status:', updateError)
            } else {
              updatedServers.push({ name: server.server_name, status: mappedStatus })
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error checking server ${server.server_name}:`, error)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      deleted: deletedServers,
      updated: updatedServers,
      message: `Sync complete. Deleted: ${deletedServers.length}, Updated: ${updatedServers.length}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Sync error:', error)
    return new Response(JSON.stringify({ 
      error: 'Sync failed', 
      details: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})