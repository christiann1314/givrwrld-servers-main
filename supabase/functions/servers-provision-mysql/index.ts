// Server Provisioning - MySQL Version
// Provisions servers in Pterodactyl using order data from MySQL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getMySQLPool,
  decryptSecret,
  getPlan,
  updateOrderStatus,
  getNodeForRegion,
} from '../_shared/mysql-client.ts';

interface ProvisionRequest {
  order_id: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get AES key from environment
    const aesKey = Deno.env.get('AES_KEY');
    if (!aesKey) {
      throw new Error('AES_KEY environment variable not set');
    }

    // Decrypt Pterodactyl secrets from MySQL
    const panelUrl = await decryptSecret('panel', 'PANEL_URL', aesKey);
    const panelAppKey = await decryptSecret('panel', 'PANEL_APP_KEY', aesKey);

    if (!panelUrl || !panelAppKey) {
      throw new Error('Pterodactyl secrets not found in database');
    }

    // Parse request
    const { order_id }: ProvisionRequest = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'Missing order_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pool = getMySQLPool();

    // Get order from MySQL
    const [orders] = await pool.execute(
      `SELECT id, user_id, item_type, plan_id, term, region, server_name, status, stripe_sub_id
       FROM orders
       WHERE id = ?`,
      [order_id]
    ) as any[];

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ error: `Order not found: ${order_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = orders[0];

    if (order.status !== 'paid') {
      return new Response(
        JSON.stringify({ error: `Order status is ${order.status}, expected 'paid'` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan details
    const plan = await getPlan(order.plan_id);
    if (!plan) {
      await updateOrderStatus(order_id, 'error', undefined, undefined, `Plan not found: ${order.plan_id}`);
      return new Response(
        JSON.stringify({ error: `Plan not found: ${order.plan_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan.ptero_egg_id) {
      await updateOrderStatus(order_id, 'error', undefined, undefined, 'Plan does not have ptero_egg_id');
      return new Response(
        JSON.stringify({ error: 'Plan does not have ptero_egg_id configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get node for region
    const node = await getNodeForRegion(order.region);
    if (!node) {
      await updateOrderStatus(order_id, 'error', undefined, undefined, `No node found for region: ${order.region}`);
      return new Response(
        JSON.stringify({ error: `No node found for region: ${order.region}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status to provisioning
    await updateOrderStatus(order_id, 'provisioning');

    // Get or create Pterodactyl user
    // TODO: Implement user creation/lookup logic
    // For now, assume user exists or create one

    // Get egg details from MySQL
    const [eggs] = await pool.execute(
      `SELECT ptero_egg_id, name, docker_image, startup_cmd
       FROM ptero_eggs
       WHERE ptero_egg_id = ?`,
      [plan.ptero_egg_id]
    ) as any[];

    if (!eggs || eggs.length === 0) {
      await updateOrderStatus(order_id, 'error', undefined, undefined, `Egg not found: ${plan.ptero_egg_id}`);
      return new Response(
        JSON.stringify({ error: `Egg not found: ${plan.ptero_egg_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const egg = eggs[0];

    // Create server in Pterodactyl
    try {
      const serverResponse = await fetch(`${panelUrl}/api/application/servers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${panelAppKey}`,
          'Content-Type': 'application/json',
          'Accept': 'Application/vnd.pterodactyl.v1+json',
        },
        body: JSON.stringify({
          name: order.server_name,
          user: 1, // TODO: Get actual Pterodactyl user ID
          egg: plan.ptero_egg_id,
          docker_image: egg.docker_image || 'ghcr.io/pterodactyl/games:java',
          startup: egg.startup_cmd || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
          environment: {
            SERVER_JARFILE: 'server.jar',
            TZ: 'UTC',
          },
          limits: {
            memory: plan.ram_gb * 1024,
            swap: 0,
            disk: plan.ssd_gb * 1024,
            io: 500,
            cpu: plan.vcores * 100,
          },
          feature_limits: {
            databases: 1,
            backups: 5,
            allocations: 1,
          },
          allocation: {
            default: 0, // Will be assigned by Pterodactyl
          },
          deploy: {
            locations: [node.ptero_node_id],
            dedicated_ip: false,
            port_range: [],
          },
          start_on_completion: true,
        }),
      });

      if (!serverResponse.ok) {
        const errorText = await serverResponse.text();
        await updateOrderStatus(order_id, 'error', undefined, undefined, `Pterodactyl API error: ${errorText}`);
        return new Response(
          JSON.stringify({ error: `Failed to create server in Pterodactyl: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const serverData = await serverResponse.json();
      const pteroServerId = serverData.attributes?.id;
      const pteroIdentifier = serverData.attributes?.identifier;

      // Update order with server details
      await updateOrderStatus(
        order_id,
        'provisioned',
        pteroServerId,
        pteroIdentifier
      );

      console.log(`✅ Server provisioned: ${pteroIdentifier} (ID: ${pteroServerId}) for order ${order_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          server_id: pteroServerId,
          server_identifier: pteroIdentifier,
          message: 'Server provisioned successfully',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateOrderStatus(order_id, 'error', undefined, undefined, errorMessage);
      console.error('Provisioning error:', error);
      return new Response(
        JSON.stringify({ error: `Provisioning failed: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Provisioning function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



