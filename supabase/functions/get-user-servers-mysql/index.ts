// Get User Servers - MySQL Version
// Returns user's servers with Pterodactyl data from MySQL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getMySQLPool, decryptSecret } from '../_shared/mysql-client.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user ID from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id') || (await req.json().catch(() => ({}))).user_id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pool = getMySQLPool();

    // Get user's game servers (orders with servers)
    const [servers] = await pool.execute(
      `SELECT 
        o.id,
        o.user_id,
        o.plan_id,
        o.server_name,
        o.status,
        o.region,
        o.ptero_server_id,
        o.ptero_identifier,
        o.created_at,
        p.game,
        p.ram_gb,
        p.display_name as plan_name
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.user_id = ?
         AND o.item_type = 'game'
         AND o.status IN ('paid', 'provisioning', 'provisioned', 'active')
       ORDER BY o.created_at DESC`,
      [userId]
    ) as any[];

    // If servers have Pterodactyl IDs, fetch live status
    const serversWithStatus = await Promise.all(
      (servers || []).map(async (server) => {
        if (!server.ptero_identifier) {
          return {
            ...server,
            status: server.status,
            players: 0,
            maxPlayers: 20,
            uptime: 0,
          };
        }

        // Fetch from Pterodactyl API
        try {
          const aesKey = Deno.env.get('AES_KEY');
          if (!aesKey) {
            return server;
          }

          const panelUrl = await decryptSecret('panel', 'PANEL_URL', aesKey);
          const panelAppKey = await decryptSecret('panel', 'PANEL_APP_KEY', aesKey);

          if (!panelUrl || !panelAppKey) {
            return server;
          }

          const pteroResponse = await fetch(
            `${panelUrl}/api/application/servers/${server.ptero_identifier}`,
            {
              headers: {
                'Authorization': `Bearer ${panelAppKey}`,
                'Accept': 'Application/vnd.pterodactyl.v1+json',
              },
            }
          );

          if (pteroResponse.ok) {
            const pteroData = await pteroResponse.json();
            return {
              ...server,
              status: pteroData.attributes?.current_state || server.status,
              players: pteroData.attributes?.relationships?.allocations?.data?.[0]?.attributes?.current || 0,
              maxPlayers: 20, // Default, should come from server config
              uptime: pteroData.attributes?.server_owner || 0,
            };
          }
        } catch (error) {
          console.error(`Error fetching Pterodactyl data for ${server.ptero_identifier}:`, error);
        }

        return server;
      })
    );

    return new Response(
      JSON.stringify({
        servers: serversWithStatus,
        total: serversWithStatus.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get user servers error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



