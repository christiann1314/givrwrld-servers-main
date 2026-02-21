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
    console.log('🔄 Syncing live server data from Pterodactyl')
    
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
      .not('pterodactyl_server_id', 'is', null)

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

    const syncResults = []

    // Sync each server's live data
    for (const server of dbServers || []) {
      try {
        console.log(`🔍 Syncing server: ${server.server_name} (ID: ${server.pterodactyl_server_id})`)

        // Get server details from Pterodactyl (Application API for status)
        const appResponse = await fetch(`${pterodactylUrl}/api/application/servers/${server.pterodactyl_server_id}`, {
          headers: {
            'Authorization': `Bearer ${pterodactylKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json'
          }
        })

        if (!appResponse.ok) {
          if (appResponse.status === 404) {
            // Server deleted from Pterodactyl, mark as deleted
            await supabase
              .from('user_servers')
              .update({ status: 'deleted' })
              .eq('id', server.id)
            
            syncResults.push({
              server: server.server_name,
              action: 'marked_deleted',
              reason: 'not_found_in_pterodactyl'
            })
            continue
          }
          console.error(`❌ Failed to fetch server from Pterodactyl: ${appResponse.status} ${appResponse.statusText}`)
          const errorText = await appResponse.text()
          console.error('Error details:', errorText)
          throw new Error(`Pterodactyl API error: ${appResponse.status}`)
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

        // Try to get real-time server stats (Client API - this might fail with different API key)
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
          console.log(`⚠️ Live stats unavailable: ${statsError.message}`)
        }

        // Prepare update data
        const updateData: any = {
          status: mappedStatus,
          updated_at: new Date().toISOString()
        }

        // Add live stats if available
        if (liveStats) {
          // Convert bytes to MB/GB for display
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
          console.log(`✅ Updated server ${server.server_name}: ${server.status} → ${mappedStatus}`)
          syncResults.push({
            server: server.server_name,
            action: 'updated',
            old_status: server.status,
            new_status: mappedStatus,
            has_live_stats: !!liveStats
          })
        }

      } catch (error) {
        console.error(`❌ Error syncing server ${server.server_name}:`, error)
        syncResults.push({
          server: server.server_name,
          action: 'sync_failed',
          error: error.message
        })
      }
    }

    console.log(`🎯 Sync completed: ${syncResults.length} servers processed`)

    return new Response(JSON.stringify({
      success: true,
      synced_servers: syncResults.length,
      results: syncResults,
      timestamp: new Date().toISOString()
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