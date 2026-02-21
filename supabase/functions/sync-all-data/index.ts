import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers - dynamically determine origin
function corsHeaders(req: Request) {
  const allowedOrigins = [
    'https://givrwrldservers.com',
    'https://www.givrwrldservers.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ]
  const origin = req.headers.get('origin') || ''
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*'
  
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    console.log('🔄 Starting comprehensive data sync (all servers)')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get current user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get Pterodactyl configuration
    const pterodactylUrl = Deno.env.get('PANEL_URL') || Deno.env.get('PTERODACTYL_URL')
    const pterodactylKey = Deno.env.get('PTERO_APP_KEY') || Deno.env.get('PTERODACTYL_API_KEY')

    if (!pterodactylUrl || !pterodactylKey) {
      console.error('❌ Pterodactyl configuration missing')
      return new Response(
        JSON.stringify({ error: 'Pterodactyl configuration missing' }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get user's servers from database
    const { data: dbServers, error: dbError } = await supabase
      .from('user_servers')
      .select('*')
      .eq('user_id', user.id)

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Database error', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    if (!dbServers || dbServers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No servers to sync',
          synced_servers: 0,
          results: []
        }),
        { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const syncResults = []
    const deletedServers = []
    const updatedServers = []

    // Sync each server
    for (const server of dbServers) {
      try {
        // Skip servers without Pterodactyl ID
        if (!server.pterodactyl_server_id) {
          syncResults.push({
            server: server.server_name,
            action: 'skipped',
            reason: 'no_pterodactyl_id'
          })
          continue
        }

        console.log(`🔍 Syncing server: ${server.server_name} (ID: ${server.pterodactyl_server_id})`)

        // Get server details from Pterodactyl (Application API)
        const appResponse = await fetch(`${pterodactylUrl}/api/application/servers/${server.pterodactyl_server_id}`, {
          headers: {
            'Authorization': `Bearer ${pterodactylKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json'
          }
        })

        if (appResponse.status === 404) {
          // Server deleted from Pterodactyl
          console.log(`🗑️ Server ${server.server_name} not found in Pterodactyl, marking as deleted`)
          
          const { error: updateError } = await supabase
            .from('user_servers')
            .update({ status: 'deleted', updated_at: new Date().toISOString() })
            .eq('id', server.id)
          
          if (updateError) {
            console.error(`❌ Failed to mark server as deleted:`, updateError)
            syncResults.push({
              server: server.server_name,
              action: 'delete_failed',
              error: updateError.message
            })
          } else {
            deletedServers.push(server.server_name)
            syncResults.push({
              server: server.server_name,
              action: 'marked_deleted',
              reason: 'not_found_in_pterodactyl'
            })
          }
          continue
        }

        if (!appResponse.ok) {
          const errorText = await appResponse.text()
          console.error(`❌ Failed to fetch server from Pterodactyl: ${appResponse.status} ${appResponse.statusText}`)
          console.error('Error details:', errorText)
          
          syncResults.push({
            server: server.server_name,
            action: 'sync_failed',
            error: `Pterodactyl API error: ${appResponse.status}`,
            details: errorText
          })
          continue
        }

        const appData = await appResponse.json()
        const serverAttributes = appData.attributes
        const serverIdentifier = serverAttributes.identifier

        console.log(`📊 Pterodactyl server data:`, {
          identifier: serverIdentifier,
          status: serverAttributes.status,
          suspended: serverAttributes.is_suspended
        })

        // Map Pterodactyl status to our status
        let mappedStatus = 'offline'
        const pterodactylStatus = serverAttributes.status
        
        if (serverAttributes.is_suspended) {
          mappedStatus = 'suspended'
        } else {
          switch (pterodactylStatus) {
            case 'running': mappedStatus = 'online'; break
            case 'starting': mappedStatus = 'starting'; break
            case 'stopping': mappedStatus = 'stopping'; break
            case 'offline': mappedStatus = 'offline'; break
            case 'installing': mappedStatus = 'installing'; break
            default: mappedStatus = 'offline'
          }
        }

        console.log(`📈 Status mapping: ${pterodactylStatus} → ${mappedStatus}`)

        // Try to get real-time server stats (Client API)
        let liveStats = null
        try {
          const statsResponse = await fetch(`${pterodactylUrl}/api/client/servers/${serverIdentifier}/resources`, {
            headers: {
              'Authorization': `Bearer ${pterodactylKey}`,
              'Accept': 'Application/vnd.pterodactyl.v1+json'
            }
          })

          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            liveStats = statsData.attributes
            console.log(`📊 Got live stats for ${server.server_name}`)
          } else {
            console.log(`⚠️ Could not get live stats: ${statsResponse.status} (using status only)`)
          }
        } catch (statsError) {
          console.log(`⚠️ Live stats unavailable: ${statsError instanceof Error ? statsError.message : 'Unknown error'}`)
        }

        // Prepare update data
        const updateData: any = {
          status: mappedStatus,
          updated_at: new Date().toISOString()
        }

        // Add live stats if available
        if (liveStats) {
          // Convert bytes to MB for display
          const ramUsedMB = Math.round(liveStats.memory_bytes / (1024 * 1024))
          const ramLimitMB = Math.round(liveStats.memory_limit_bytes / (1024 * 1024))
          const diskUsedMB = Math.round(liveStats.disk_bytes / (1024 * 1024))
          
          updateData.live_stats = {
            cpu_percent: Math.round(liveStats.cpu_absolute || 0),
            memory_used_mb: ramUsedMB,
            memory_limit_mb: ramLimitMB,
            disk_used_mb: diskUsedMB,
            network_rx_bytes: liveStats.network_rx_bytes || 0,
            network_tx_bytes: liveStats.network_tx_bytes || 0,
            uptime: liveStats.uptime || 0,
            is_suspended: serverAttributes.is_suspended,
            last_updated: new Date().toISOString()
          }
        } else {
          // At least update the basic info without live stats
          updateData.live_stats = {
            is_suspended: serverAttributes.is_suspended,
            last_updated: new Date().toISOString()
          }
        }

        // Update database with live data
        const { error: updateError } = await supabase
          .from('user_servers')
          .update(updateData)
          .eq('id', server.id)

        if (updateError) {
          console.error(`❌ Failed to update server ${server.server_name}:`, updateError)
          syncResults.push({
            server: server.server_name,
            action: 'update_failed',
            error: updateError.message
          })
        } else {
          const statusChanged = server.status !== mappedStatus
          if (statusChanged) {
            updatedServers.push({
              name: server.server_name,
              old_status: server.status,
              new_status: mappedStatus
            })
          }

          console.log(`✅ Updated server ${server.server_name}: ${server.status} → ${mappedStatus}`)
          syncResults.push({
            server: server.server_name,
            action: 'updated',
            old_status: server.status,
            new_status: mappedStatus,
            has_live_stats: !!liveStats,
            status_changed: statusChanged
          })
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Error syncing server ${server.server_name}:`, errorMessage)
        syncResults.push({
          server: server.server_name,
          action: 'sync_failed',
          error: errorMessage
        })
      }
    }

    console.log(`🎯 Sync completed: ${syncResults.length} servers processed`)

    return new Response(JSON.stringify({
      success: true,
      synced_servers: syncResults.length,
      deleted_count: deletedServers.length,
      updated_count: updatedServers.length,
      deleted: deletedServers,
      updated: updatedServers,
      results: syncResults,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Sync error:', errorMessage)
    return new Response(JSON.stringify({ 
      error: 'Sync failed', 
      details: errorMessage 
    }), { 
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})

