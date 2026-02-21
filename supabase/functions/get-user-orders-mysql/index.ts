// Get User Orders - MySQL Version
// Returns user's orders from MySQL database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getMySQLPool } from '../_shared/mysql-client.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user ID from JWT or request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract user ID from JWT (simplified - in production, verify JWT properly)
    // For now, get from query param or body
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id') || (await req.json().catch(() => ({}))).user_id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pool = getMySQLPool();

    // Get user's orders
    const [orders] = await pool.execute(
      `SELECT 
        o.id,
        o.user_id,
        o.item_type,
        o.plan_id,
        o.term,
        o.region,
        o.server_name,
        o.status,
        o.stripe_sub_id,
        o.ptero_server_id,
        o.ptero_identifier,
        o.error_message,
        o.created_at,
        o.updated_at,
        p.game,
        p.ram_gb,
        p.display_name as plan_name
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    ) as any[];

    return new Response(
      JSON.stringify({
        orders: orders || [],
        total: orders?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get user orders error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



