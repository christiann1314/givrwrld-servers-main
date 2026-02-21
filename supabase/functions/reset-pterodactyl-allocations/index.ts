import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylApiKey = Deno.env.get('PTERODACTYL_API_KEY');

    if (!pterodactylUrl || !pterodactylApiKey) {
      console.error('Missing Pterodactyl configuration');
      return new Response(
        JSON.stringify({ error: 'Missing Pterodactyl configuration' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'Authorization': `Bearer ${pterodactylApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'Application/vnd.pterodactyl.v1+json',
    };

    // Get all nodes first
    console.log('Fetching nodes...');
    const nodesResponse = await fetch(`${pterodactylUrl}/api/application/nodes`, {
      headers
    });

    if (!nodesResponse.ok) {
      throw new Error(`Failed to fetch nodes: ${nodesResponse.status}`);
    }

    const nodesData = await nodesResponse.json();
    const results = [];

    for (const node of nodesData.data) {
      const nodeId = node.attributes.id;
      console.log(`Processing node ${nodeId}...`);
      
      // Get all allocations for this node
      const allocationsResponse = await fetch(`${pterodactylUrl}/api/application/nodes/${nodeId}/allocations`, {
        headers
      });

      if (!allocationsResponse.ok) {
        console.error(`Failed to fetch allocations for node ${nodeId}`);
        continue;
      }

      const allocationsData = await allocationsResponse.json();
      let deletedCount = 0;
      let failedDeletes = 0;

      // Delete all existing allocations
      for (const allocation of allocationsData.data) {
        const allocationId = allocation.attributes.id;
        
        try {
          const deleteResponse = await fetch(`${pterodactylUrl}/api/application/nodes/${nodeId}/allocations/${allocationId}`, {
            method: 'DELETE',
            headers
          });

          if (deleteResponse.ok) {
            deletedCount++;
            console.log(`Deleted allocation ${allocationId}`);
          } else {
            failedDeletes++;
            console.error(`Failed to delete allocation ${allocationId}: ${deleteResponse.status}`);
          }
        } catch (error) {
          failedDeletes++;
          console.error(`Error deleting allocation ${allocationId}:`, error);
        }
      }

      // Create new allocations with proper port ranges
      const ip = '15.204.251.32'; // Main server IP
      const portRanges = [
        { start: 25565, end: 25665 }, // Minecraft (100 ports)
        { start: 28015, end: 28115 }, // Rust (100 ports)
        { start: 8211, end: 8311 },   // Palworld (100 ports)
      ];

      let createdCount = 0;
      let failedCreates = 0;

      for (const range of portRanges) {
        for (let port = range.start; port <= range.end; port++) {
          try {
            const createResponse = await fetch(`${pterodactylUrl}/api/application/nodes/${nodeId}/allocations`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                ip: ip,
                ports: [port.toString()]
              })
            });

            if (createResponse.ok) {
              createdCount++;
              if (createdCount % 10 === 0) {
                console.log(`Created ${createdCount} allocations for node ${nodeId}...`);
              }
            } else {
              failedCreates++;
              if (failedCreates < 5) { // Only log first few failures to avoid spam
                console.error(`Failed to create allocation ${ip}:${port} on node ${nodeId}: ${createResponse.status}`);
              }
            }
          } catch (error) {
            failedCreates++;
            if (failedCreates < 5) {
              console.error(`Error creating allocation ${ip}:${port} on node ${nodeId}:`, error);
            }
          }
        }
      }

      results.push({
        nodeId,
        deletedAllocations: deletedCount,
        failedDeletes,
        createdAllocations: createdCount,
        failedCreates
      });

      console.log(`Node ${nodeId} completed: deleted ${deletedCount}, created ${createdCount}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: 'Port allocation reset completed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error resetting allocations:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to reset allocations', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});