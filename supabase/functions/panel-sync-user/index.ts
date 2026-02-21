import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function cors(req: Request) {
  const allowList = (Deno.env.get("ALLOW_ORIGINS") ?? "").split(",").map(s => s.trim());
  const origin = req.headers.get("origin") ?? "";
  const allow = allowList.includes(origin) ? origin : allowList[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

interface SyncUserRequest {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors(req) })
  }

  try {
    const { user_id, email, first_name, last_name }: SyncUserRequest = await req.json()

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'user_id and email are required' }),
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

    // Verify user is authenticated and matches the user_id
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user || user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has a Pterodactyl account
    const { data: existingAccount } = await supabase
      .from('external_accounts')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (existingAccount?.pterodactyl_user_id) {
      return new Response(
        JSON.stringify({
          pterodactyl_user_id: existingAccount.pterodactyl_user_id,
          panel_username: existingAccount.panel_username
        }),
        { headers: { ...cors(req), 'Content-Type': 'application/json' } }
      )
    }

    // Create Pterodactyl user
    const panelUrl = Deno.env.get('PANEL_URL')!
    const pteroAppKey = Deno.env.get('PTERO_APP_KEY')!

    // Generate username from email
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + user_id.slice(0, 8)
    const password = crypto.randomUUID()

    const userData = {
      email,
      username,
      first_name: first_name || 'User',
      last_name: last_name || 'GIVRwrld',
      password
    }

    const userResponse = await fetch(`${panelUrl}/api/application/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pteroAppKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      throw new Error(`Failed to create Pterodactyl user: ${userResponse.status} ${errorText}`)
    }

    const userResult = await userResponse.json()
    const pterodactylUserId = userResult.attributes.id

    // Store external account mapping
    const { error: insertError } = await supabase
      .from('external_accounts')
      .upsert({
        user_id,
        pterodactyl_user_id: pterodactylUserId,
        panel_username: username,
        last_synced_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error storing external account:', insertError)
      throw insertError
    }

    return new Response(
      JSON.stringify({
        pterodactyl_user_id: pterodactylUserId,
        panel_username: username
      }),
      { headers: { ...cors(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Panel sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...cors(req), 'Content-Type': 'application/json' } }
    )
  }
})