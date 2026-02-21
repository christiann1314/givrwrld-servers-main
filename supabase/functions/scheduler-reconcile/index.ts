import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const panelUrl = Deno.env.get('PANEL_URL')!
    const pteroAppKey = Deno.env.get('PTERO_APP_KEY')!

    // Get all nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('ptero_nodes')
      .select('*')

    if (nodesError) {
      throw nodesError
    }

    const reconciliationResults = []

    for (const node of nodes || []) {
      try {
        // Check node health via Pterodactyl API
        const nodeResponse = await fetch(`${panelUrl}/api/application/nodes/${node.pterodactyl_node_id}`, {
          headers: {
            'Authorization': `Bearer ${pteroAppKey}`,
            'Accept': 'application/json'
          }
        })

        const isHealthy = nodeResponse.ok
        const lastSeen = new Date().toISOString()

        // Update node status
        await supabase
          .from('ptero_nodes')
          .update({
            enabled: isHealthy,
            last_seen_at: lastSeen
          })
          .eq('id', node.id)

        // Get servers on this node
        const serversResponse = await fetch(`${panelUrl}/api/application/servers?filter[node]=${node.pterodactyl_node_id}`, {
          headers: {
            'Authorization': `Bearer ${pteroAppKey}`,
            'Accept': 'application/json'
          }
        })

        if (serversResponse.ok) {
          const serversData = await serversResponse.json()
          const serverIds = serversData.data.map((server: any) => server.attributes.id)

          // Update orders with actual server status
          for (const serverId of serverIds) {
            await supabase
              .from('orders')
              .update({
                status: 'provisioned',
                updated_at: new Date().toISOString()
              })
              .eq('pterodactyl_server_id', serverId)
              .eq('status', 'provisioning')
          }
        }

        reconciliationResults.push({
          node_id: node.id,
          node_name: node.name,
          healthy: isHealthy,
          last_seen: lastSeen
        })

      } catch (error) {
        console.error(`Error reconciling node ${node.id}:`, error)
        
        // Mark node as disabled if we can't reach it
        await supabase
          .from('ptero_nodes')
          .update({
            enabled: false,
            last_seen_at: new Date().toISOString()
          })
          .eq('id', node.id)

        reconciliationResults.push({
          node_id: node.id,
          node_name: node.name,
          healthy: false,
          error: error.message
        })
      }
    }

    // Retry failed provisions
    const { data: failedOrders, error: failedOrdersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'error')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    if (!failedOrdersError && failedOrders) {
      for (const order of failedOrders) {
        try {
          // Trigger reprovisioning
          const functionsUrl = Deno.env.get('SUPABASE_URL')!.replace('https://', 'https://').replace('.supabase.co', '.functions.supabase.co')
          await fetch(`${functionsUrl}/servers-provision`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: order.user_id,
              plan_id: order.plan_id,
              region: order.region
            })
          })

          reconciliationResults.push({
            retry_order: order.id,
            status: 'retry_triggered'
          })
        } catch (error) {
          console.error(`Error retrying order ${order.id}:`, error)
        }
      }
    }

    return new Response(
      JSON.stringify({
        reconciled_at: new Date().toISOString(),
        results: reconciliationResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scheduler reconcile error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

