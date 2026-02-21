import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple rate limiting for this function
const rateLimitStore: { [key: string]: { count: number; resetTime: number } } = {}

function checkRateLimit(identifier: string, maxRequests: number = 3, windowMs: number = 60 * 60 * 1000): boolean {
  const now = Date.now()
  const key = `sensitive:${identifier}`
  
  // Clean up expired entries
  Object.keys(rateLimitStore).forEach(k => {
    if (rateLimitStore[k].resetTime < now) {
      delete rateLimitStore[k]
    }
  })
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = { count: 1, resetTime: now + windowMs }
    return true
  }
  
  if (rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = { count: 1, resetTime: now + windowMs }
    return true
  }
  
  if (rateLimitStore[key].count >= maxRequests) {
    return false
  }
  
  rateLimitStore[key].count++
  return true
}

// Helper functions for game-specific configurations
function getEggId(gameType: string): number {
  switch (gameType.toLowerCase()) {
    case 'minecraft':
      return 1; // Minecraft egg ID
    case 'rust':
      return 4; // Rust egg ID
    case 'palworld':
      return 15; // Palworld egg ID
    default:
      return 1; // Default to Minecraft
  }
}

function getDockerImage(gameType: string): string {
  switch (gameType.toLowerCase()) {
    case 'minecraft':
      return "ghcr.io/pterodactyl/yolks:java_21";
    case 'rust':
      return "ghcr.io/pterodactyl/yolks:rust_latest";
    case 'palworld':
      return "ghcr.io/pterodactyl/yolks:steamcmd_debian";
    default:
      return "ghcr.io/pterodactyl/yolks:java_21";
  }
}

function getStartupCommand(gameType: string): string {
  switch (gameType.toLowerCase()) {
    case 'minecraft':
      return "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}";
    case 'rust':
      return "./RustDedicated -batchmode -nographics -silent-crashes +server.port {{SERVER_PORT}} +server.identity \"rust\" +rcon.port {{RCON_PORT}} +rcon.web true +server.hostname \"{{HOSTNAME}}\" +server.level \"{{LEVEL}}\" +server.description \"{{DESCRIPTION}}\" +server.url \"{{SERVER_URL}}\" +server.headerimage \"{{SERVER_IMG}}\" +server.maxplayers {{MAX_PLAYERS}} +rcon.password \"{{RCON_PASS}}\" +server.saveinterval {{SAVEINTERVAL}} +app.port {{APP_PORT}}";
    case 'palworld':
      return "./PalServer.sh -port={{SERVER_PORT}} -publicport={{SERVER_PORT}} -servername=\"{{SERVER_NAME}}\" -players={{MAX_PLAYERS}} -adminpassword=\"{{ADMIN_PASSWORD}}\" -serverpassword=\"{{SERVER_PASSWORD}}\"";
    default:
      return "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}";
  }
}

function getEnvironmentVars(gameType: string): object {
  switch (gameType.toLowerCase()) {
    case 'minecraft':
      return {
        SERVER_JARFILE: "server.jar",
        VANILLA_VERSION: "latest",
        SERVER_MEMORY: "1024"
      };
    case 'rust':
      return {
        HOSTNAME: "Rust Server",
        LEVEL: "Procedural Map",
        DESCRIPTION: "A Rust server hosted by GivrWorld",
        SERVER_URL: "https://givrwrldservers.com",
        RCON_PASS: "password",
        SAVEINTERVAL: "300",
        MAX_PLAYERS: "100"
      };
    case 'palworld':
      return {
        SERVER_NAME: "Palworld Server",
        ADMIN_PASSWORD: "password123",
        SERVER_PASSWORD: "",
        MAX_PLAYERS: "32",
        SRCDS_PORT: "8211",
        SRCDS_APPID: "2394010"
      };
    default:
      return {
        SERVER_JARFILE: "server.jar",
        VANILLA_VERSION: "latest"
      };
  }
}

function getDefaultPort(gameType: string): string {
  switch (gameType.toLowerCase()) {
    case 'minecraft':
      return '25565';
    case 'rust':
      return '28015';
    case 'palworld':
      return '8211';
    default:
      return '25565';
  }
}

// Dynamically resolve the best Minecraft egg to avoid proxy eggs like Bungeecord
async function resolveMinecraftEgg(pterodactylUrl: string, apiKey: string) {
  try {
    console.log('🔍 Fetching Minecraft nests...')
    const nestsRes = await fetch(`${pterodactylUrl}/api/application/nests`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    });
    if (!nestsRes.ok) {
      console.error('❌ Failed to fetch nests:', nestsRes.status)
      return null;
    }
    const nests = await nestsRes.json();
    const mcNest = nests.data.find((n: any) => (n.attributes.name || '').toLowerCase().includes('minecraft')) || nests.data.find((n: any) => n.attributes.id === 1);
    if (!mcNest) {
      console.error('❌ No Minecraft nest found')
      return null;
    }
    console.log('✅ Found Minecraft nest:', mcNest.attributes.name)

    console.log('🔍 Fetching eggs for nest:', mcNest.attributes.id)
    const eggsRes = await fetch(`${pterodactylUrl}/api/application/nests/${mcNest.attributes.id}/eggs`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    });
    if (!eggsRes.ok) {
      console.error('❌ Failed to fetch eggs:', eggsRes.status)
      return null;
    }
    const eggs = await eggsRes.json();
    console.log('📦 Available eggs:', eggs.data.map((e: any) => e.attributes.name))

    // NEVER use these proxy/incompatible eggs
    const strictAvoid = ['bunge', 'waterfall', 'velocity', 'proxy', 'bedrock', 'travertine', 'flamecord'];
    // Prefer these vanilla-compatible eggs (adjust based on what's actually available)
    const priority = ['vanilla', 'spigot', 'bukkit', 'paper', 'purpur', 'fabric', 'forge'];
    
    // First pass: Find eggs that match priority and DON'T match avoid
    let chosen = eggs.data.find((e: any) => {
      const name = (e.attributes.name || '').toLowerCase();
      const hasStrictAvoid = strictAvoid.some(a => name.includes(a));
      const hasPriority = priority.some(p => name.includes(p));
      console.log(`🧪 Testing egg "${e.attributes.name}": hasStrictAvoid=${hasStrictAvoid}, hasPriority=${hasPriority}`)
      return hasPriority && !hasStrictAvoid;
    });
    
    // Second pass: Any egg that doesn't match avoid list
    if (!chosen) {
      console.log('⚠️ No priority eggs found, looking for any non-proxy egg...')
      chosen = eggs.data.find((e: any) => {
        const name = (e.attributes.name || '').toLowerCase();
        const hasStrictAvoid = strictAvoid.some(a => name.includes(a));
        console.log(`🧪 Testing egg "${e.attributes.name}": hasStrictAvoid=${hasStrictAvoid}`)
        return !hasStrictAvoid;
      });
    }
    
    if (!chosen) {
      console.error('❌ No suitable egg found! All eggs seem to be proxy/incompatible')
      console.error('Available eggs were:', eggs.data.map((e: any) => e.attributes.name))
      console.error('Avoiding:', strictAvoid)
      console.error('Would prefer:', priority)
      // As a last resort, try the first egg that's not explicitly avoided
      chosen = eggs.data.find((e: any) => {
        const name = (e.attributes.name || '').toLowerCase();
        return !strictAvoid.some(a => name.includes(a));
      });
      if (!chosen) {
        console.error('❌ Even fallback failed - no usable eggs found!')
        return null;
      }
      console.log('⚠️ Using fallback egg:', chosen.attributes.name)
    }
    
    console.log('✅ Selected egg:', chosen.attributes.name)

    let dockerImage: string;
    const di = chosen.attributes.docker_image;
    if (typeof di === 'string') dockerImage = di;
    else if (di && typeof di === 'object') {
      const values = Object.values(di as Record<string, string>);
      dockerImage = (values[0] as string) || 'ghcr.io/pterodactyl/yolks:java_21';
    } else dockerImage = 'ghcr.io/pterodactyl/yolks:java_21';

    // Normalize deprecated quay images to GHCR yolks
    if (dockerImage.includes('quay.io/pterodactyl/core')) {
      dockerImage = 'ghcr.io/pterodactyl/yolks:java_21';
    }

    const startup = chosen.attributes.startup || "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}";
    const env: Record<string, string> = {
      EULA: 'TRUE',
      MINECRAFT_VERSION: 'latest',
      VANILLA_VERSION: 'latest',
      VERSION: 'latest',
      SERVER_JARFILE: 'server.jar'
    };

    return { eggId: chosen.attributes.id, dockerImage, startup, env };
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting check
    const identifier = req.headers.get('x-forwarded-for') || 'unknown'
    
    if (!checkRateLimit(identifier)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('🚀 Pterodactyl provisioning started')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const requestBody = await req.json()
    console.log('📝 Request body:', requestBody)
    
    const { serverId } = requestBody
    if (!serverId) {
      console.error('❌ No serverId provided')
      return new Response('No serverId provided', { status: 400, headers: corsHeaders })
    }
    
    console.log('🔍 Looking for server:', serverId)
    
    // Get server details
    const { data: server, error: fetchError } = await supabase
      .from('user_servers')
      .select('*')
      .eq('id', serverId)
      .single()

    if (fetchError || !server) {
      console.error('❌ Server not found or fetch error:', fetchError)
      return new Response('Server not found', { status: 404 })
    }

    // Fetch profile (optional)
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, email, display_name, pterodactyl_user_id, pterodactyl_password')
      .eq('user_id', server.user_id)
      .maybeSingle()

    // Fetch bundle configuration if bundle is selected
    let bundleConfig = { env: {}, limits: {} }
    if (server.bundle_id) {
      const { data: bundle } = await supabase
        .from('bundles')
        .select('pterodactyl_env, pterodactyl_limits_patch')
        .eq('id', server.bundle_id)
        .single()
      
      if (bundle) {
        bundleConfig = {
          env: bundle.pterodactyl_env || {},
          limits: bundle.pterodactyl_limits_patch || {}
        }
      }
    }

    // Fetch addon configurations if addons are selected
    let addonConfigs = { env: {}, limits: {} }
    if (server.addon_ids && server.addon_ids.length > 0) {
      const { data: addons } = await supabase
        .from('addons')
        .select('pterodactyl_env, pterodactyl_limits_patch')
        .in('id', server.addon_ids)
      
      if (addons) {
        addons.forEach(addon => {
          addonConfigs.env = { ...addonConfigs.env, ...(addon.pterodactyl_env || {}) }
          addonConfigs.limits = { ...addonConfigs.limits, ...(addon.pterodactyl_limits_patch || {}) }
        })
      }
    }

    // Fetch modpack configuration if modpack is selected (skip for vanilla/null)
    let modpackConfig = { env: {} }
    if (server.modpack_id && server.modpack_id !== 'vanilla') {
      console.log('🎮 Loading modpack configuration for:', server.modpack_id)
      const { data: modpack } = await supabase
        .from('modpacks')
        .select('pterodactyl_env')
        .eq('id', server.modpack_id)
        .single()
      
      if (modpack) {
        console.log('✅ Modpack config loaded:', modpack.pterodactyl_env)
        modpackConfig = {
          env: modpack.pterodactyl_env || {}
        }
      } else {
        console.log('⚠️ Modpack not found in database')
      }
    } else {
      console.log('🎯 Vanilla Minecraft - no modpack configuration needed')
    }

    if (fetchError || !server) {
      return new Response('Server not found', { status: 404 })
    }

    // Pterodactyl Panel API configuration
    const pterodactylUrl = Deno.env.get('PTERODACTYL_URL')
    const pterodactylKey = Deno.env.get('PTERODACTYL_API_KEY')

    if (!pterodactylUrl || !pterodactylKey) {
      console.error('Pterodactyl configuration missing')
      return new Response('Pterodactyl configuration missing', { status: 500 })
    }

    // Parse server specifications from database
    const ramGB = parseInt(server.ram.toString().replace(/[^\d]/g, '')) || 2;
    const cpuCores = parseInt(server.cpu.toString().replace(/[^\d]/g, '')) || 1;
    const diskGB = parseInt(server.disk.toString().replace(/[^\d]/g, '')) || 10;

    // Get node information (using your Dedicated-East node)
    const nodeResponse = await fetch(`${pterodactylUrl}/api/application/nodes`, {
      headers: {
        'Authorization': `Bearer ${pterodactylKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    });

    if (!nodeResponse.ok) {
      console.error('Failed to fetch nodes')
      return new Response('Failed to fetch nodes', { status: 500 })
    }

    const nodesData = await nodeResponse.json();
    const dedicatedNode = nodesData.data.find((node: any) => 
      node.attributes.name === 'Dedicated-East' || 
      node.attributes.fqdn === 'dedicated.givrwrldservers.com'
    );

    if (!dedicatedNode) {
      console.error('Dedicated-East node not found')
      return new Response('Dedicated node not found', { status: 500 })
    }

    const nodeId = dedicatedNode.attributes.id;

    // Get available allocations for the node
    const allocationsResponse = await fetch(`${pterodactylUrl}/api/application/nodes/${nodeId}/allocations`, {
      headers: {
        'Authorization': `Bearer ${pterodactylKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    });
    
    if (!allocationsResponse.ok) {
      console.error('Failed to fetch allocations')
      return new Response('Failed to fetch allocations', { status: 500 })
    }
    
    const allocationsData = await allocationsResponse.json();

    // Filter unassigned allocations - use correct IP address from DNS records
    const unassigned = allocationsData.data.filter((alloc: any) => 
      !alloc.attributes.assigned && alloc.attributes.ip === '15.204.251.32'
    );

    console.log('📡 Node FQDN:', dedicatedNode.attributes.fqdn)
    console.log('🌐 Unassigned allocations with correct IP:', unassigned.map((a: any) => ({ id: a.attributes.id, ip: a.attributes.ip, alias: a.attributes.alias, port: a.attributes.port })))

    // Select first unassigned allocation with correct IP
    let selectedAllocation = unassigned[0];

    if (!selectedAllocation) {
      console.error('No available allocations with correct IP (15.204.251.32)')
      return new Response('No available allocations with correct IP', { status: 500 })
    }

    console.log('🎯 Selected allocation:', { id: selectedAllocation.attributes.id, ip: selectedAllocation.attributes.ip, alias: selectedAllocation.attributes.alias, port: selectedAllocation.attributes.port })

    // Resolve Pterodactyl user (profile optional)
    let pterodactylUserId = (profile as any)?.pterodactyl_user_id as number | undefined;
    let userEmail = (profile as any)?.email as string | undefined;
    let displayName = (profile as any)?.display_name as string | undefined;
    
    if (!userEmail) {
      const { data: adminUser } = await supabase.auth.admin.getUserById(server.user_id);
      userEmail = adminUser?.user?.email || userEmail;
      if (!displayName && userEmail) displayName = userEmail.split('@')[0];
    }
    
    if (!pterodactylUserId) {
      // Create Pterodactyl user if doesn't exist
      const createUserResponse = await supabase.functions.invoke('create-pterodactyl-user', {
        body: {
          userId: server.user_id,
          email: userEmail,
          displayName
        }
      });
      
      if (createUserResponse.error) {
        console.error('Failed to create Pterodactyl user:', createUserResponse.error)
        return new Response('Failed to create Pterodactyl user', { status: 500 })
      }
      
      // Prefer the ID returned by the function to avoid relying on profile schema columns
      const returnedId = (createUserResponse.data as any)?.pterodactylUserId as number | undefined
      
      if (returnedId) {
        pterodactylUserId = returnedId
      } else {
        // Fallback: fetch updated profile
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('pterodactyl_user_id, email, display_name')
          .eq('user_id', server.user_id)
          .single()
        
        pterodactylUserId = updatedProfile?.pterodactyl_user_id as number | undefined;
        userEmail = userEmail || (updatedProfile as any)?.email;
        displayName = displayName || (updatedProfile as any)?.display_name as string | undefined;
      }
    }

    if (!pterodactylUserId) {
      console.error('Unable to resolve Pterodactyl user ID')
      return new Response('Unable to resolve Pterodactyl user ID', { status: 500 })
    }

    // Merge all environment variables (base + bundle + addons + modpack + stored env_vars)
    const baseEnv = getEnvironmentVars(server.game_type)
    const storedEnv = server.env_vars || {}
    const mergedEnv = {
      ...baseEnv,
      ...bundleConfig.env,
      ...addonConfigs.env,
      ...modpackConfig.env,
      ...storedEnv
    }

    // Merge server limits with bundle and addon patches
    const baseLimits = {
      memory: ramGB * 1024, // Convert GB to MB
      swap: 0,
      disk: diskGB * 1024, // Convert GB to MB
      io: 500,
      cpu: cpuCores * 100 // Convert cores to percentage
    }
    
    const storedLimits = server.server_limits || {}
    const mergedLimits = {
      ...baseLimits,
      ...bundleConfig.limits,
      ...addonConfigs.limits,
      ...storedLimits
    }

    // Set feature limits based on bundle level
    let featureLimits = {
      databases: 2,
      allocations: 1,
      backups: 5
    }

    // Enhance limits based on bundle
    if (server.bundle_id) {
      const { data: bundle } = await supabase
        .from('bundles')
        .select('slug')
        .eq('id', server.bundle_id)
        .single()
      
      if (bundle?.slug === 'essentials') {
        featureLimits.backups = 10 // Daily backups with longer retention
      } else if (bundle?.slug === 'expansion') {
        featureLimits.databases = 5
        featureLimits.allocations = 3
        featureLimits.backups = 15
      } else if (bundle?.slug === 'community') {
        featureLimits.backups = 7
      }
    }

    // Create server in Pterodactyl Panel
    // Resolve egg/image/startup dynamically for Minecraft to avoid proxy eggs
    let targetEgg = getEggId(server.game_type);
    let targetDocker = getDockerImage(server.game_type);
    let targetStartup = getStartupCommand(server.game_type);
    let environment = { ...mergedEnv } as Record<string, any>;

    if ((server.game_type || '').toLowerCase() === 'minecraft') {
      console.log('🎯 Resolving Minecraft egg (looking for vanilla-compatible options)')
      console.log('🔍 Available Pterodactyl eggs will be logged...')
      const resolved = await resolveMinecraftEgg(pterodactylUrl, pterodactylKey);
      if (resolved) {
        console.log('✅ Minecraft egg resolved:', { eggId: resolved.eggId, dockerImage: resolved.dockerImage })
        targetEgg = resolved.eggId ?? targetEgg;
        targetDocker = resolved.dockerImage ?? targetDocker;
        targetStartup = resolved.startup ?? targetStartup;
        environment = { ...environment, ...(resolved.env || {}) };
      } else {
        console.log('⚠️ Failed to resolve Minecraft egg, using defaults (first available)')
        console.log('🆘 This may result in BungeeCord being selected - check available eggs!')
      }
      
      // Normalize deprecated quay images to GHCR yolks
      if (targetDocker.includes('quay.io/pterodactyl/core')) {
        targetDocker = 'ghcr.io/pterodactyl/yolks:java_21';
      }
      
      // Always accept the EULA and provide safe defaults so the API doesn't fail on required vars
      environment = {
        EULA: 'TRUE',
        MINECRAFT_VERSION: environment.MINECRAFT_VERSION || environment.VERSION || 'latest',
        VANILLA_VERSION: environment.VANILLA_VERSION || 'latest',
        VERSION: environment.VERSION || 'latest',
        BUNGEE_VERSION: environment.BUNGEE_VERSION || 'latest',
        SERVER_JARFILE: environment.SERVER_JARFILE || 'server.jar',
        ...environment,
      };
      
      console.log('🏗️ Final Minecraft environment:', environment)
    }

    const serverData = {
      name: server.server_name,
      description: `${server.game_type} server for ${userEmail || 'unknown user'}`,
      user: pterodactylUserId, // Use actual user instead of admin
      egg: targetEgg,
      docker_image: targetDocker,
      startup: targetStartup,
      environment,
      limits: mergedLimits,
      feature_limits: featureLimits,
      allocation: {
        default: selectedAllocation.attributes.id
      },
      start_on_completion: true,
      skip_scripts: false
    }

    const response = await fetch(`${pterodactylUrl}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pterodactylKey}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      },
      body: JSON.stringify(serverData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pterodactyl API error:', errorText)
      return new Response('Failed to create server in Pterodactyl', { status: 500 })
    }

    const pterodactylServer = await response.json()

    // Update server record with Pterodactyl details
    const { error: updateError } = await supabase
      .from('user_servers')
      .update({
        status: 'installing',
        pterodactyl_url: `${pterodactylUrl}/server/${pterodactylServer.attributes.identifier}`,
        ip: (selectedAllocation.attributes.alias || selectedAllocation.attributes.ip || 'dedicated.givrwrldservers.com'), // Prefer alias if set
        port: selectedAllocation.attributes.port.toString(),
        pterodactyl_server_id: pterodactylServer.attributes.id.toString()
      })
      .eq('id', serverId)

    if (updateError) {
      console.error('Error updating server:', updateError)
    }

    console.log('✅ Server created successfully in Pterodactyl, installation will begin automatically');

    return new Response('Server provisioned successfully', { 
      status: 200,
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('❌ Provisioning error:', error)
    console.error('Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: 'Provisioning failed', 
      details: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})