import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const panelUrl = Deno.env.get('PANEL_URL')!
    const pteroAppKey = Deno.env.get('PTERO_APP_KEY')!

    console.log('Panel URL:', panelUrl)
    console.log('API Key (first 10 chars):', pteroAppKey.substring(0, 10))

    // Get nodes information
    const nodesResponse = await fetch(`${panelUrl}/api/application/nodes`, {
      headers: {
        'Authorization': `Bearer ${pteroAppKey}`,
        'Accept': 'application/json'
      }
    })

    if (!nodesResponse.ok) {
      const errorText = await nodesResponse.text()
      throw new Error(`Nodes API failed: ${nodesResponse.status} ${errorText}`)
    }

    const nodesData = await nodesResponse.json()

    // Get eggs/nests information
    const nestsResponse = await fetch(`${panelUrl}/api/application/nests`, {
      headers: {
        'Authorization': `Bearer ${pteroAppKey}`,
        'Accept': 'application/json'
      }
    })

    let nestsData = null
    if (nestsResponse.ok) {
      nestsData = await nestsResponse.json()
    }

    // Get allocations for first node if available
    let allocationsData = null
    if (nodesData.data && nodesData.data.length > 0) {
      const firstNodeId = nodesData.data[0].attributes.id
      const allocationsResponse = await fetch(`${panelUrl}/api/application/nodes/${firstNodeId}/allocations`, {
        headers: {
          'Authorization': `Bearer ${pteroAppKey}`,
          'Accept': 'application/json'
        }
      })
      
      if (allocationsResponse.ok) {
        allocationsData = await allocationsResponse.json()
      }
    }

    const result = {
      success: true,
      panel_url: panelUrl,
      nodes: nodesData?.data?.map((node: any) => ({
        id: node.attributes.id,
        name: node.attributes.name,
        location_id: node.attributes.location_id,
        fqdn: node.attributes.fqdn,
        memory: node.attributes.memory,
        disk: node.attributes.disk,
        allocated_memory: node.attributes.allocated_resources?.memory || 0,
        allocated_disk: node.attributes.allocated_resources?.disk || 0
      })) || [],
      nests: nestsData?.data?.map((nest: any) => ({
        id: nest.attributes.id,
        name: nest.attributes.name,
        description: nest.attributes.description
      })) || [],
      sample_allocations: allocationsData?.data?.slice(0, 5)?.map((alloc: any) => ({
        id: alloc.attributes.id,
        ip: alloc.attributes.ip,
        port: alloc.attributes.port,
        assigned: alloc.attributes.assigned
      })) || []
    }

    return new Response(
      JSON.stringify(result, null, 2),
      { headers: { ...cors(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Pterodactyl info error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        panel_url: Deno.env.get('PANEL_URL'),
        has_api_key: !!Deno.env.get('PTERO_APP_KEY')
      }),
      { status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' } }
    )
  }
})
