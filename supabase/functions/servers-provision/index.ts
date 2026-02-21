import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Game configuration inline for now
const getGameConfig = (game: string, resources: { ram_gb: number; vcores: number; ssd_gb: number }) => {
  const configs = {
    minecraft: {
      // Use the official Minecraft egg id from your panel (nest 16 "Minecraft" → e.g., Paper 39)
      eggId: 39,
      dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}',
      environment: {
        SERVER_JARFILE: 'server.jar',
        VERSION: 'latest',
        EULA: 'TRUE',
        MINECRAFT_VERSION: '1.21.1',
        BUILD_NUMBER: 'latest',
        DL_PATH: ''
      },
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    rust: {
      eggId: 50, // Rust (nest 19) - verified
      dockerImage: 'ghcr.io/pterodactyl/games:rust',
      startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.identity "rust" +rcon.port {{RCON_PORT}} +rcon.web true +server.hostname "{{HOSTNAME}}" +server.level "{{LEVEL}}" +server.description "{{DESCRIPTION}}" +server.url "{{SERVER_URL}}" +server.headerimage "{{SERVER_IMG}}" +server.maxplayers {{MAX_PLAYERS}} +rcon.password "{{RCON_PASS}}" +server.saveinterval {{SAVEINTERVAL}} {{ADDITIONAL_ARGS}}',
      environment: {
        HOSTNAME: 'GIVRwrld Rust Server',
        LEVEL: 'Procedural Map',
        DESCRIPTION: 'Powered by GIVRwrld',
        MAX_PLAYERS: '100'
      },
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    palworld: {
      eggId: 15, // Palworld (nest 6) - verified
      dockerImage: 'ghcr.io/pterodactyl/games:palworld',
      startup: './PalServer.sh',
      environment: {
        SERVER_NAME: 'GIVRwrld Palworld Server',
        MAX_PLAYERS: '32'
      },
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    'among-us': {
      eggId: 34, // Among Us - Impostor Server
      dockerImage: 'ghcr.io/parkervcp/yolks:dotnet_6',
      startup: './Impostor.Server',
      environment: {
        VERSION: 'latest'
      },
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    terraria: {
      eggId: 16, // Terraria Vanilla
      dockerImage: 'ghcr.io/parkervcp/yolks:debian',
      startup: './TerrariaServer.bin.x86_64 -config serverconfig.txt',
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    ark: {
      eggId: 14, // ARK: Survival Evolved
      dockerImage: 'quay.io/parkervcp/pterodactyl-images:debian_source',
      startup: 'rmv() { echo -e "stopping server"; rcon -t rcon -a 127.0.0.1:${RCON_PORT} -p ${ARK_ADMIN_PASSWORD} -c saveworld && rcon -a 127.0.0.1:${RCON_PORT} -p ${ARK_ADMIN_PASSWORD} -c DoExit; }; trap rmv 15; cd ShooterGame/Binaries/Linux && ./ShooterGameServer {{SERVER_MAP}}?listen?SessionName="{{SESSION_NAME}}"?ServerPassword={{ARK_PASSWORD}}?ServerAdminPassword={{ARK_ADMIN_PASSWORD}}?Port={{SERVER_PORT}}?RCONPort={{RCON_PORT}}?QueryPort={{QUERY_PORT}}?RCONEnabled=True$( [ "$BATTLE_EYE" == "1" ] || printf %s " -NoBattlEye" ) -server {{ARGS}} -log & until echo "waiting for rcon connection..."; rcon -t rcon -a 127.0.0.1:${RCON_PORT} -p ${ARK_ADMIN_PASSWORD}; do sleep 5; done',
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    factorio: {
      eggId: 21, // Factorio
      dockerImage: 'ghcr.io/parkervcp/yolks:debian',
      startup: 'if [ ! -f "./saves/{{SAVE_NAME}}.zip" ]; then ./bin/x64/factorio --create ./saves/{{SAVE_NAME}}.zip --map-gen-settings data/map-gen-settings.json --map-settings data/map-settings.json; fi; ./bin/x64/factorio --port {{SERVER_PORT}} --server-settings data/server-settings.json --start-server saves/{{SAVE_NAME}}.zip',
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    mindustry: {
      eggId: 29, // Mindustry
      dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
      environment: {
        SERVER_JARFILE: 'server.jar',
        VERSION: 'latest'
      },
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    rimworld: {
      eggId: 26, // Rimworld
      dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
      environment: {
        SERVER_JARFILE: 'server.jar',
        VERSION: 'latest'
      },
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    'vintage-story': {
      eggId: 32, // Vintage Story
      dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
      environment: {
        SERVER_JARFILE: 'server.jar',
        VERSION: 'latest'
      },
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    },
    teeworlds: {
      eggId: 33, // Teeworlds
      dockerImage: 'ghcr.io/parkervcp/yolks:debian',
      startup: './teeworlds_srv',
      limits: {
        memory: resources.ram_gb * 1024,
        swap: 0,
        disk: resources.ssd_gb * 1024,
        io: 500,
        cpu: resources.vcores * 100
      }
    }
  }
  
  const config = configs[game as keyof typeof configs] || configs.minecraft
  // Ensure environment is always defined
  if (!config.environment) {
    config.environment = {}
  }
  return config
}

// CORS headers with origin validation
function corsHeaders(req: Request) {
  const allowedOrigins = [
    'https://givrwrldservers.com',
    'https://www.givrwrldservers.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ]
  const allowList = (Deno.env.get('ALLOW_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const allAllowed = [...allowedOrigins, ...allowList]
  const origin = req.headers.get('origin') || ''
  const allow = allAllowed.includes(origin) ? origin : allAllowed[0] || '*'
  
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

interface ProvisionRequest {
  order_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const { order_id }: ProvisionRequest = await req.json()

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Check if this is an internal call (from webhook with service role) or external call (with JWT)
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    // Check if this is a service role call (from webhook or dashboard)
    const isInternalCall = authHeader?.startsWith('Bearer ') && 
      (authHeader.includes(serviceRoleKey) || authHeader === `Bearer ${serviceRoleKey}`)
    
    // Also allow calls with no auth header when called from dashboard with service role
    // (Supabase dashboard service role mode may not send explicit Authorization header)
    const isServiceRoleCall = !authHeader || isInternalCall

    // If JWT verification is enabled, verify the caller (unless it's an internal service-role call)
    if (!isServiceRoleCall && authHeader) {
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user }, error: userError } = await supabaseAnon.auth.getUser()
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }
    }

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get order details with plan and user info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        plans (*)
      `)
      .eq('id', order_id)
      .eq('status', 'paid')
      .single()

    if (orderError || !order) {
      throw new Error(`Order not found or not paid: ${order_id}`)
    }

    const plan = order.plans

    // Update order status to provisioning
    await supabase
      .from('orders')
      .update({ status: 'provisioning' })
      .eq('id', order_id)

    // Get user's external account - create if missing
    let { data: externalAccount, error: accountError } = await supabase
      .from('external_accounts')
      .select('*')
      .eq('user_id', order.user_id)
      .single()

    if (accountError || !externalAccount) {
      console.log('External account not found, creating Pterodactyl user automatically...')
      
      // Get user email from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('user_id', order.user_id)
        .single()
      
      if (profileError || !profile || !profile.email) {
        throw new Error('User email not found. Cannot create Pterodactyl account.')
      }
      
      // Get Pterodactyl configuration
      const pterodactylUrl = Deno.env.get('PANEL_URL') || Deno.env.get('PTERODACTYL_URL')
      const pterodactylKey = Deno.env.get('PTERO_APP_KEY') || Deno.env.get('PTERODACTYL_API_KEY')
      
      if (!pterodactylUrl || !pterodactylKey) {
        throw new Error('Pterodactyl configuration missing')
      }
      
      // Check if user already exists in Pterodactyl by email
      const existingUserResponse = await fetch(`${pterodactylUrl}/api/application/users?filter[email]=${encodeURIComponent(profile.email)}`, {
        headers: {
          'Authorization': `Bearer ${pterodactylKey}`,
          'Accept': 'Application/vnd.pterodactyl.v1+json'
        }
      })
      
      let pterodactylUserId: number
      let panelUsername: string
      
      if (existingUserResponse.ok) {
        const existingData = await existingUserResponse.json()
        if (existingData.data && existingData.data.length > 0) {
          // User already exists in Pterodactyl, link them
          pterodactylUserId = existingData.data[0].attributes.id
          panelUsername = existingData.data[0].attributes.username
          console.log('Linking existing Pterodactyl user:', { pterodactylUserId, panelUsername })
        } else {
          // Create new Pterodactyl user
          const password = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(36))
            .join('')
            .substring(0, 16)
          
          const displayName = profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : profile.email.split('@')[0]
          
          const userData = {
            email: profile.email,
            username: displayName.split(' ')[0] || profile.email.split('@')[0],
            first_name: profile.first_name || profile.email.split('@')[0],
            last_name: profile.last_name || 'User',
            password: password
          }
          
          const createUserResponse = await fetch(`${pterodactylUrl}/api/application/users`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${pterodactylKey}`,
              'Content-Type': 'application/json',
              'Accept': 'Application/vnd.pterodactyl.v1+json'
            },
            body: JSON.stringify(userData)
          })
          
          if (!createUserResponse.ok) {
            const errorText = await createUserResponse.text()
            console.error('Failed to create Pterodactyl user:', errorText)
            throw new Error(`Failed to create Pterodactyl user: ${errorText}`)
          }
          
          const pterodactylUser = await createUserResponse.json()
          pterodactylUserId = pterodactylUser.attributes.id
          panelUsername = pterodactylUser.attributes.username
          console.log('Pterodactyl user created successfully:', { pterodactylUserId, panelUsername })
        }
      } else {
        throw new Error('Failed to check for existing Pterodactyl user')
      }
      
      // Create external_accounts entry
      const { data: newAccount, error: createAccountError } = await supabase
        .from('external_accounts')
        .upsert({
          user_id: order.user_id,
          pterodactyl_user_id: pterodactylUserId,
          panel_username: panelUsername,
          last_synced_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createAccountError || !newAccount) {
        throw new Error(`Failed to create external account: ${createAccountError?.message}`)
      }
      
      externalAccount = newAccount
      console.log('External account created/linked successfully')
    }

    // Find best-fit node
    const { data: nodes, error: nodesError } = await supabase
      .from('ptero_nodes')
      .select('*')
      .eq('region', order.region)
      .eq('enabled', true)

    if (nodesError || !nodes || nodes.length === 0) {
      throw new Error(`No available nodes in region: ${order.region}`)
    }

    // Calculate available capacity for each node
    // Include all active statuses: paid, provisioning, installing, active, provisioned
    const activeStatuses = ['paid', 'provisioning', 'installing', 'active', 'provisioned']
    const nodesWithCapacity = await Promise.all(
      nodes.map(async (node) => {
        const { data: orders } = await supabase
          .from('orders')
          .select('plans(ram_gb)')
          .eq('node_id', node.id)
          .in('status', activeStatuses)

        const usedRam = orders?.reduce((sum, order) => sum + (order.plans?.ram_gb || 0), 0) || 0
        const availableRam = node.max_ram_gb - node.reserved_headroom_gb - usedRam

        return {
          ...node,
          available_ram: availableRam,
          used_ram: usedRam
        }
      })
    )

    // Find best-fit node
    const suitableNodes = nodesWithCapacity.filter(node => node.available_ram >= plan.ram_gb)
    if (suitableNodes.length === 0) {
      throw new Error(`No available capacity for plan ${plan.id} in region ${order.region}`)
    }

    const bestNode = suitableNodes.reduce((best, current) => 
      current.available_ram < best.available_ram ? current : best
    )

    // Get available allocation/port
    const panelUrl = Deno.env.get('PANEL_URL')!
    const pteroAppKey = Deno.env.get('PTERO_APP_KEY')!

    const allocationsResponse = await fetch(`${panelUrl}/api/application/nodes/${bestNode.pterodactyl_node_id}/allocations`, {
      headers: {
        'Authorization': `Bearer ${pteroAppKey}`,
        'Accept': 'application/json'
      }
    })

    if (!allocationsResponse.ok) {
      throw new Error(`Failed to fetch allocations: ${allocationsResponse.status}`)
    }

    const allocationsData = await allocationsResponse.json()
    // Pick the first unassigned allocation on the node (no restrictive port range)
    const availableAllocation = allocationsData.data.find((alloc: any) => 
      !alloc.attributes.assigned
    )

    if (!availableAllocation) {
      throw new Error('No available ports on selected node')
    }

    // Get game configuration
    const gameConfig = getGameConfig(plan.game, {
      ram_gb: plan.ram_gb,
      vcores: plan.vcores,
      ssd_gb: plan.ssd_gb
    })

    // Create server in Pterodactyl
    const serverData = {
      name: order.server_name,
      description: `GIVRwrld ${plan.game} server for ${order.server_name}`,
      user: externalAccount.pterodactyl_user_id,
      egg: gameConfig.eggId,
      docker_image: gameConfig.dockerImage,
      startup: gameConfig.startup,
      environment: gameConfig.environment,
      limits: gameConfig.limits,
      feature_limits: {
        databases: 0,
        allocations: 1,
        backups: 0
      },
      allocation: {
        default: availableAllocation.attributes.id
      }
    }

    const serverResponse = await fetch(`${panelUrl}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pteroAppKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(serverData)
    })

    if (!serverResponse.ok) {
      const errorText = await serverResponse.text()
      throw new Error(`Failed to create server: ${serverResponse.status} ${errorText}`)
    }

    const serverResult = await serverResponse.json()
    const serverId = serverResult.attributes.id
    const serverIdentifier = serverResult.attributes.identifier

    // Update order with server details
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'provisioned',
        pterodactyl_server_id: serverId,
        pterodactyl_server_identifier: serverIdentifier,
        node_id: bestNode.id
      })
      .eq('id', order_id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({
        id: serverId,
        identifier: serverIdentifier,
        node: bestNode.name,
        allocation: availableAllocation.attributes.port
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Server provisioning error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})

