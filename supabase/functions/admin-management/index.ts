import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Get the authenticated user
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { action, userId, role } = await req.json()

    if (action === 'assign_admin') {
      // Check if the requesting user is already an admin
      const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id })
      
      if (!isAdmin) {
        // If no admins exist yet, allow the first user to become admin
        const { data: existingAdmins } = await supabase
          .from('user_roles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)

        if (existingAdmins && existingAdmins.length > 0) {
          return new Response('Forbidden: Only admins can assign admin roles', { 
            status: 403, 
            headers: corsHeaders 
          })
        }
      }

      // Assign admin role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId || user.id,
          role: 'admin',
          created_by: user.id
        })

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Admin role assigned successfully' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'check_admin_status') {
      const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id })
      
      return new Response(JSON.stringify({ 
        isAdmin: !!isAdmin,
        userId: user.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'check_2fa_status') {
      // Check if user has 2FA enabled
      const { data: userData } = await userSupabase.auth.getUser()
      const factors = userData.user?.factors || []
      const has2FA = factors.some(factor => factor.status === 'verified')
      
      const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id })
      
      return new Response(JSON.stringify({ 
        has2FA,
        isAdmin: !!isAdmin,
        requires2FA: !!isAdmin && !has2FA
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response('Invalid action', { status: 400, headers: corsHeaders })

  } catch (error) {
    console.error('Admin management error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})