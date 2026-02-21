import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pterodactyl data extracted from your database
const pterodactylUsers = [
  {
    id: 1,
    uuid: '20553b17-7b96-477a-8f11-c45bcfde4539',
    email: 'christianchristian@givrpok.onmicrosoft.com',
    username: 'cjm',
    name_first: 'christian',
    name_last: 'McConico',
    created_at: '2025-06-11 08:58:22'
  },
  {
    id: 2,
    uuid: 'c5a0dec4-ee7a-4b65-84e7-ac409f8c5fac',
    email: 'GIVRwrld@givrpok.onmicrosoft.com',
    username: 'cjn',
    name_first: 'Christian',
    name_last: 'Nelson',
    created_at: '2025-06-11 14:39:23'
  }
]

const pterodactylNodes = [
  {
    id: 1,
    uuid: '09cb6ea6-f5c8-43a1-acee-9f83437aaab2',
    name: 'NODE 1 MINECRAFT',
    fqdn: 'node1.givrwrldservers.com',
    ip: '51.81.208.215',
    location: 'North America (US – West – Hillsboro)',
    memory: 64000,
    disk: 200000
  },
  {
    id: 4,
    uuid: 'f0f8d95a-d927-42a2-9ba8-75ea994ad35d',
    name: 'NODE 3 PALWORLD',
    fqdn: 'node3.givrwrldservers.com',
    ip: '51.81.208.215',
    location: 'us-east',
    memory: 64000,
    disk: 200000
  },
  {
    id: 6,
    uuid: '8258896e-5775-4c78-bd4d-2965e5951bd4',
    name: 'NODE 2 FIVEM',
    fqdn: 'node2.givrwrldservers.com',
    ip: '51.81.208.215',
    location: 'NODE 2 FIVEM',
    memory: 64000,
    disk: 200000
  }
]

interface RequestBody {
  action: 'migrate' | 'status'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action }: RequestBody = await req.json()

    if (action === 'status') {
      // Check migration status
      const { data: profiles } = await supabase.from('profiles').select('*')
      const { data: servers } = await supabase.from('user_servers').select('*')
      
      return new Response(
        JSON.stringify({
          success: true,
          status: {
            profiles_migrated: profiles?.length || 0,
            servers_migrated: servers?.length || 0,
            pterodactyl_users: pterodactylUsers.length,
            pterodactyl_nodes: pterodactylNodes.length
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'migrate') {
      console.log('🚀 Starting Pterodactyl to Supabase migration...')

      // Step 1: Create/update user profiles
      console.log('📝 Migrating user profiles...')
      for (const pteroUser of pterodactylUsers) {
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', pteroUser.email)
          .single()

        if (!existingProfile) {
          // Create new profile - we'll need to create a Supabase auth user first
          console.log(`Creating profile for ${pteroUser.email}`)
          
          // For now, just create a profile entry without user_id
          // The user will need to sign up through your auth system
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              email: pteroUser.email,
              display_name: `${pteroUser.name_first} ${pteroUser.name_last}`
            })

          if (profileError) {
            console.error('Error creating profile:', profileError)
          } else {
            console.log(`✅ Created profile for ${pteroUser.email}`)
          }
        } else {
          console.log(`Profile already exists for ${pteroUser.email}`)
        }
      }

      // Step 2: Create server entries for available nodes
      console.log('🖥️ Migrating server nodes...')
      for (const node of pterodactylNodes) {
        // Determine game type from node name
        let gameType = 'minecraft'
        if (node.name.includes('PALWORLD')) gameType = 'palworld'
        if (node.name.includes('FIVEM')) gameType = 'fivem'

        // Create server entry (available for assignment)
        const { error: serverError } = await supabase
          .from('user_servers')
          .insert({
            server_name: node.name,
            game_type: gameType,
            status: 'available',
            ram: `${Math.floor(node.memory / 1024)}GB`,
            cpu: '4 cores',
            disk: `${Math.floor(node.disk / 1024)}GB`,
            location: node.location,
            ip: node.ip,
            port: '20000', // Default port, will be assigned when server is created
            pterodactyl_url: `https://${node.fqdn}`
          })

        if (serverError) {
          console.error('Error creating server entry:', serverError)
        } else {
          console.log(`✅ Created server entry for ${node.name}`)
        }
      }

      console.log('✅ Migration completed successfully!')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Migration completed successfully',
          migrated: {
            users: pterodactylUsers.length,
            nodes: pterodactylNodes.length
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Migration failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})