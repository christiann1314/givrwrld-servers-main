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
    console.log('🔧 Fixing stuck servers...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get stuck servers
    const { data: stuckServers, error } = await supabase
      .from('user_servers')
      .select('*')
      .eq('status', 'installing')
      .not('pterodactyl_server_id', 'is', null)

    if (error || !stuckServers?.length) {
      console.log('No stuck servers found')
      return new Response('No stuck servers found', { status: 200, headers: corsHeaders })
    }

    console.log(`Found ${stuckServers.length} stuck servers`)

    // Call reassign-servers for each
    for (const server of stuckServers) {
      console.log(`🚀 Fixing server ${server.pterodactyl_server_id}...`)
      
      const { data, error: reassignError } = await supabase.functions.invoke('reassign-servers', {
        body: {
          serverIds: [server.pterodactyl_server_id]
        }
      })

      if (reassignError) {
        console.error(`❌ Failed to reassign server ${server.pterodactyl_server_id}:`, reassignError)
      } else {
        console.log(`✅ Server ${server.pterodactyl_server_id} fixed`)
      }
    }

    return new Response('Servers fixed successfully', { 
      status: 200,
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('❌ Fix failed:', error)
    return new Response(JSON.stringify({ 
      error: 'Fix failed', 
      details: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})