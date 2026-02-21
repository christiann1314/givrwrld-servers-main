// Get Plans - MySQL Version
// Returns all active plans from MySQL database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getMySQLPool } from '../_shared/mysql-client.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const pool = getMySQLPool();
    
    // Get all active plans
    const [plans] = await pool.execute(
      `SELECT 
        id,
        item_type,
        game,
        ram_gb,
        vcores,
        ssd_gb,
        price_monthly,
        stripe_price_id,
        display_name,
        description
       FROM plans
       WHERE is_active = 1
       ORDER BY game, ram_gb`
    ) as any[];

    // Group by game for easier frontend consumption
    const plansByGame: Record<string, any[]> = {};
    plans.forEach((plan: any) => {
      const game = plan.game || 'other';
      if (!plansByGame[game]) {
        plansByGame[game] = [];
      }
      plansByGame[game].push(plan);
    });

    return new Response(
      JSON.stringify({
        plans: plans,
        plans_by_game: plansByGame,
        total: plans.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get plans error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



