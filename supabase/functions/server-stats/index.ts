import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function cors(req: Request) {
  const allowList = (Deno.env.get("ALLOW_ORIGINS") ?? "").split(",").map(s => s.trim());
  const origin = req.headers.get("origin") ?? "";
  const allow = allowList.includes(origin) ? origin : allowList[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin"
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors(req) })
  }

  try {
    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')
    const serverIdentifier = url.searchParams.get('server_identifier')

    if (!orderId && !serverIdentifier) {
      return new Response(
        JSON.stringify({ error: 'order_id or server_identifier is required' }),
        { status: 400, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get order details
    let order
    if (orderId) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single()

      if (orderError || !orderData) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...cors(req), 'Content-Type': 'application/json' } }
        )
      }
      order = orderData
    } else {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('pterodactyl_server_identifier', serverIdentifier)
        .eq('user_id', user.id)
        .single()

      if (orderError || !orderData) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...cors(req), 'Content-Type': 'application/json' } }
        )
      }
      order = orderData
    }

    if (!order.pterodactyl_server_identifier) {
      return new Response(
        JSON.stringify({ error: 'Server not provisioned yet' }),
        { status: 409, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Get server stats from Pterodactyl
    const panelUrl = Deno.env.get('PANEL_URL')!
    const pteroClientKey = Deno.env.get('PTERO_CLIENT_KEY')!

    const statsResponse = await fetch(`${panelUrl}/api/client/servers/${order.pterodactyl_server_identifier}/resources`, {
      headers: {
        'Authorization': `Bearer ${pteroClientKey}`,
        'Accept': 'application/json'
      }
    })

    if (!statsResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch server stats from panel' }),
        { status: 502, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    const statsData = await statsResponse.json()
    
    // Normalize response according to API contract
    const stats = {
      state: statsData.attributes?.current_state || statsData.attributes?.state || 'unknown',
      cpu_percent: statsData.attributes?.resources?.cpu_absolute || 0,
      memory_bytes: statsData.attributes?.resources?.memory_bytes || 0,
      disk_bytes: statsData.attributes?.resources?.disk_bytes || 0,
      uptime_ms: statsData.attributes?.resources?.uptime || 0,
      server_identifier: order.pterodactyl_server_identifier
    }

    return new Response(
      JSON.stringify(stats),
      { headers: { ...cors(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Server stats error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' } }
    )
  }
})
