import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RepairSummary {
  attempted: number;
  triggered: number;
  errors: Array<{ serverId: string; error: string }>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Auth client (to read current user from the Authorization header)
  const authClient = createClient(url, anon, { auth: { persistSession: false } });
  // Service client (to bypass RLS for controlled server-side operations)
  const serviceClient = createClient(url, service, { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = userData.user.id;
    console.log(`[REPAIR-FAILED] Starting for user ${userId}`);

    // Fetch user's failed/unprovisioned servers
    const { data: servers, error: listError } = await serviceClient
      .from("user_servers")
      .select("id, status, pterodactyl_server_id")
      .eq("user_id", userId)
      .is("pterodactyl_server_id", null);

    if (listError) throw new Error(`DB error: ${listError.message}`);

    const toRepair = (servers || []).filter((s: any) => (s.status || "").toLowerCase() !== "online");

    const summary: RepairSummary = { attempted: toRepair.length, triggered: 0, errors: [] };

    for (const s of toRepair) {
      try {
        // Re-trigger provisioning for this server id
        const { data: provRes, error: provErr } = await authClient.functions.invoke("pterodactyl-provision", {
          body: { serverId: s.id },
        });
        if (provErr) throw new Error(provErr.message || "Provision invoke failed");
        console.log(`[REPAIR-FAILED] Triggered provision for ${s.id}`, provRes);
        summary.triggered += 1;
      } catch (e: any) {
        console.error(`[REPAIR-FAILED] Error for ${s.id}`, e);
        summary.errors.push({ serverId: s.id, error: e?.message || String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[REPAIR-FAILED] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});