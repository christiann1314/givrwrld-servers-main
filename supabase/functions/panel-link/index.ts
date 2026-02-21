import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PANEL_URL = Deno.env.get("PTERODACTYL_URL")!;

export const cors = (o: Request) => ({
  "Access-Control-Allow-Origin": Deno.env.get("ALLOW_ORIGINS")?.split(",")[0] ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  
  const auth = req.headers.get("authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? "";
  if (!auth) return new Response("Unauthorized", { status: 401, headers: cors(req) });

  const url = new URL(req.url);
  const user_id = url.searchParams.get("user_id");
  if (!user_id) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: cors(req) });

  console.log(`[PANEL-LINK] Checking panel link for user ${user_id}`);

  try {
    const { origin } = new URL(req.url);
    const supabaseUrl = origin.replace("/functions/v1", "");
    
    const q = await fetch(`${supabaseUrl}/rest/v1/external_accounts?user_id=eq.${user_id}&select=pterodactyl_user_id`, {
      headers: { "apikey": apikey, "Authorization": auth },
    });
    
    if (!q.ok) {
      console.error(`[PANEL-LINK] Failed to query external_accounts: ${q.status}`);
      return new Response(JSON.stringify({ error: "query_failed" }), { status: 500, headers: cors(req) });
    }
    
    const rows = await q.json();
    console.log(`[PANEL-LINK] Query result:`, rows);
    
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0].pterodactyl_user_id) {
      console.log(`[PANEL-LINK] No panel user found for user ${user_id}`);
      return new Response(JSON.stringify({ error: "no_panel_user" }), { status: 404, headers: cors(req) });
    }
    
    console.log(`[PANEL-LINK] Found pterodactyl user ${rows[0].pterodactyl_user_id} for user ${user_id}`);
    return new Response(JSON.stringify({ url: PANEL_URL }), { 
      headers: { "Content-Type": "application/json", ...cors(req) } 
    });
    
  } catch (error) {
    console.error('[PANEL-LINK] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'internal_server_error',
      message: error.message 
    }), {
      headers: { "Content-Type": "application/json", ...cors(req) },
      status: 500,
    });
  }
});