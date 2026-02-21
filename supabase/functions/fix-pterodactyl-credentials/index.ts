import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const user = userData.user;
    console.log(`[FIX-PTERODACTYL] Starting credential fix for user ${user.id}`);

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log(`[FIX-PTERODACTYL] Found profile with pterodactyl_user_id: ${profile.pterodactyl_user_id}`);

    // Pterodactyl Panel API configuration
    const pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylKey = Deno.env.get('PTERODACTYL_API_KEY');

    if (!pterodactylUrl || !pterodactylKey) {
      return new Response(JSON.stringify({ error: 'Pterodactyl configuration missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Generate a new secure password
    const password = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(36))
      .join('')
      .substring(0, 16);

    console.log(`[FIX-PTERODACTYL] Generated new password for user`);

    // Ensure a Pterodactyl user exists for this email and set a fresh password
    let targetUserId: number | null = null;

    try {
      const searchResponse = await fetch(`${pterodactylUrl}/api/application/users?search=${encodeURIComponent(user.email || '')}`, {
        headers: {
          'Authorization': `Bearer ${pterodactylKey}`,
          'Accept': 'Application/vnd.pterodactyl.v1+json'
        }
      });

      if (searchResponse.ok) {
        const result = await searchResponse.json();
        const match = (result?.data || []).find((u: any) => u?.attributes?.email === user.email);
        if (match) {
          targetUserId = match.attributes.id;
          console.log(`[FIX-PTERODACTYL] Found existing Pterodactyl user by email with ID: ${targetUserId}`);
        } else {
          console.log('[FIX-PTERODACTYL] No Pterodactyl user found for email search');
        }
      } else {
        console.log(`[FIX-PTERODACTYL] User search failed with ${searchResponse.status}`);
      }
    } catch (e) {
      console.log('[FIX-PTERODACTYL] User search threw error (continuing):', (e as Error).message);
    }

    // Prefer searched ID; fallback to profile value if present
    if (!targetUserId && profile.pterodactyl_user_id) {
      targetUserId = profile.pterodactyl_user_id;
      console.log(`[FIX-PTERODACTYL] Falling back to profile.pterodactyl_user_id: ${targetUserId}`);
    }

    if (targetUserId) {
      console.log(`[FIX-PTERODACTYL] Updating password for Pterodactyl user ${targetUserId}`);

      // Fetch existing user so we can include REQUIRED fields on PATCH
      let existingAttrs: any = null;
      try {
        const getResp = await fetch(`${pterodactylUrl}/api/application/users/${targetUserId}`, {
          headers: {
            'Authorization': `Bearer ${pterodactylKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json'
          }
        });
        if (getResp.ok) {
          const getJson = await getResp.json();
          existingAttrs = getJson?.attributes;
          console.log('[FIX-PTERODACTYL] Loaded existing user attributes for patch');
        } else {
          console.log(`[FIX-PTERODACTYL] Failed to load existing user (status ${getResp.status}), will build payload from profile`);
        }
      } catch (e) {
        console.log('[FIX-PTERODACTYL] Error loading existing user (continuing):', (e as Error).message);
      }

      const patchPayload = {
        email: existingAttrs?.email ?? (user.email || profile.email),
        username: (existingAttrs?.username ?? (profile.display_name || (user.email || '').split('@')[0]))
          .toLowerCase()
          .replace(/[^a-z0-9_\-]/g, ''),
        first_name: existingAttrs?.first_name ?? (profile.display_name?.split(' ')[0] || (user.email || '').split('@')[0]),
        last_name: existingAttrs?.last_name ?? (profile.display_name?.split(' ').slice(1).join(' ') || 'User'),
        password,
        password_confirmation: password
      };

      const updateResponse = await fetch(`${pterodactylUrl}/api/application/users/${targetUserId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${pterodactylKey}`,
          'Content-Type': 'application/json',
          'Accept': 'Application/vnd.pterodactyl.v1+json'
        },
        body: JSON.stringify(patchPayload)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[FIX-PTERODACTYL] Failed to update password, will try create:', errorText);
        targetUserId = null; // force creation fallback
      } else {
        console.log('[FIX-PTERODACTYL] Password updated successfully');
      }
    }

    if (!targetUserId) {
      console.log('[FIX-PTERODACTYL] Creating new Pterodactyl user');

      const newUserPayload = {
        email: user.email,
        username: (profile.display_name || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_\-]/g, ''),
        first_name: profile.display_name?.split(' ')[0] || user.email.split('@')[0],
        last_name: profile.display_name?.split(' ').slice(1).join(' ') || 'User',
        password,
      };

      const createResponse = await fetch(`${pterodactylUrl}/api/application/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pterodactylKey}`,
          'Content-Type': 'application/json',
          'Accept': 'Application/vnd.pterodactyl.v1+json'
        },
        body: JSON.stringify(newUserPayload)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[FIX-PTERODACTYL] Failed to create Pterodactyl user:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to create or update Pterodactyl user' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const created = await createResponse.json();
      targetUserId = created?.attributes?.id;
      console.log(`[FIX-PTERODACTYL] Created Pterodactyl user with ID: ${targetUserId}`);
    }

    // Persist the final user id to profile
    profile.pterodactyl_user_id = targetUserId as number;

    // Encrypt and store the password
    const { data: encryptedPassword, error: encryptError } = await supabaseClient
      .rpc('encrypt_sensitive_data', { data: password });

    if (encryptError) {
      console.error('[FIX-PTERODACTYL] Password encryption failed:', encryptError);
      return new Response(JSON.stringify({ error: 'Password encryption failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[FIX-PTERODACTYL] Password encrypted successfully`);

    // Update profile with encrypted password
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        pterodactyl_user_id: profile.pterodactyl_user_id,
        pterodactyl_password_encrypted: encryptedPassword
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[FIX-PTERODACTYL] Failed to update profile:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to store credentials' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[FIX-PTERODACTYL] Credentials fixed successfully for user ${user.id}`);

    // Return the plain password for immediate use (user needs to see it)
    return new Response(JSON.stringify({
      success: true,
      message: 'Pterodactyl credentials fixed successfully',
      credentials: {
        email: user.email,
        password: password, // Return plain password so user can login immediately
        panel_url: 'https://panel.givrwrldservers.com'
      },
      pterodactyl_user_id: profile.pterodactyl_user_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[FIX-PTERODACTYL] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});