/**
 * GIVRwrld Authoritative Egg Catalog
 *
 * Single source of truth for every game egg the platform sells.
 * Pinned to verified community egg definitions from pelican-eggs/eggs (or custom overrides).
 *
 * The provisioner validates against this catalog before creating a server.
 * The sync script uses this catalog to push correct definitions to the Panel.
 *
 * DO NOT import eggs ad-hoc from random sources. Every egg change goes through
 * this file, gets reviewed, and is synced to the Panel via `sync-panel-eggs.js`.
 */

/**
 * @typedef {{
 *   gameKey: string,
 *   variant: string,
 *   displayName: string,
 *   source: { repo: string, path: string, ref: string },
 *   dockerImages: Record<string, string>,
 *   defaultImage: string,
 *   startup: string,
 *   configStartupDone: string,
 *   stopCommand: string,
 *   requiredEnvVars: Record<string, { default: string, rules: string, description?: string }>,
 *   expectedFiles: string[],
 *   notes?: string,
 * }} EggCatalogEntry
 */

/** @type {Record<number, EggCatalogEntry>} */
export const EGG_CATALOG = {
  // ───────────────────────────────── Minecraft ─────────────────────────────────

  60: {
    gameKey: 'minecraft',
    variant: 'forge',
    displayName: 'Minecraft Forge',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/minecraft/java/forge', ref: 'master' },
    dockerImages: {
      'Java 25': 'ghcr.io/pterodactyl/yolks:java_25',
      'Java 21': 'ghcr.io/pterodactyl/yolks:java_21',
      'Java 17': 'ghcr.io/pterodactyl/yolks:java_17',
      'Java 11': 'ghcr.io/pterodactyl/yolks:java_11',
      'Java 8': 'ghcr.io/pterodactyl/yolks:java_8',
    },
    defaultImage: 'ghcr.io/pterodactyl/yolks:java_25',
    startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true @unix_args.txt',
    configStartupDone: ')! For help, type ',
    stopCommand: 'stop',
    requiredEnvVars: {
      SERVER_JARFILE: { default: 'server.jar', rules: 'required|string|max:20', description: 'Server JAR filename' },
      MC_VERSION: { default: 'latest', rules: 'required|string|max:20', description: 'Minecraft version' },
      BUILD_TYPE: { default: 'recommended', rules: 'required|string', description: 'Forge build type' },
      FORGE_VERSION: { default: '', rules: 'nullable|string|max:25', description: 'Specific Forge version' },
    },
    expectedFiles: ['server.jar'],
  },

  61: {
    gameKey: 'minecraft',
    variant: 'paper',
    displayName: 'Minecraft Paper',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/minecraft/java/paper', ref: 'master' },
    dockerImages: {
      'Java 25': 'ghcr.io/pterodactyl/yolks:java_25',
      'Java 21': 'ghcr.io/pterodactyl/yolks:java_21',
      'Java 17': 'ghcr.io/pterodactyl/yolks:java_17',
      'Java 11': 'ghcr.io/pterodactyl/yolks:java_11',
      'Java 8': 'ghcr.io/pterodactyl/yolks:java_8',
    },
    defaultImage: 'ghcr.io/pterodactyl/yolks:java_25',
    startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}',
    configStartupDone: ')! For help, type ',
    stopCommand: 'stop',
    requiredEnvVars: {
      SERVER_JARFILE: { default: 'server.jar', rules: 'required|string|max:20' },
      MC_VERSION: { default: 'latest', rules: 'required|string|max:20' },
      BUILD_NUMBER: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['server.jar'],
  },

  62: {
    gameKey: 'minecraft',
    variant: 'vanilla',
    displayName: 'Minecraft Vanilla',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/minecraft/java/vanilla', ref: 'master' },
    dockerImages: {
      'Java 25': 'ghcr.io/pterodactyl/yolks:java_25',
      'Java 21': 'ghcr.io/pterodactyl/yolks:java_21',
      'Java 17': 'ghcr.io/pterodactyl/yolks:java_17',
      'Java 11': 'ghcr.io/pterodactyl/yolks:java_11',
      'Java 8': 'ghcr.io/pterodactyl/yolks:java_8',
    },
    defaultImage: 'ghcr.io/pterodactyl/yolks:java_25',
    startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar {{SERVER_JARFILE}}',
    configStartupDone: ')! For help, type ',
    stopCommand: 'stop',
    requiredEnvVars: {
      SERVER_JARFILE: { default: 'server.jar', rules: 'required|string|max:20' },
      VANILLA_VERSION: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['server.jar'],
  },

  63: {
    gameKey: 'minecraft',
    variant: 'fabric',
    displayName: 'Minecraft Fabric',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/minecraft/java/fabric', ref: 'master' },
    dockerImages: {
      'Java 25': 'ghcr.io/pterodactyl/yolks:java_25',
      'Java 21': 'ghcr.io/pterodactyl/yolks:java_21',
      'Java 17': 'ghcr.io/pterodactyl/yolks:java_17',
      'Java 11': 'ghcr.io/pterodactyl/yolks:java_11',
      'Java 8': 'ghcr.io/pterodactyl/yolks:java_8',
    },
    defaultImage: 'ghcr.io/pterodactyl/yolks:java_25',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
    configStartupDone: ')! For help, type ',
    stopCommand: 'stop',
    requiredEnvVars: {
      SERVER_JARFILE: { default: 'fabric-server-launch.jar', rules: 'required|string|max:40' },
      MC_VERSION: { default: 'latest', rules: 'required|string|max:20' },
      FABRIC_VERSION: { default: 'latest', rules: 'required|string|max:25' },
    },
    expectedFiles: ['fabric-server-launch.jar'],
  },

  64: {
    gameKey: 'minecraft',
    variant: 'purpur',
    displayName: 'Minecraft Purpur',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/minecraft/java/purpur', ref: 'master' },
    dockerImages: {
      'Java 25': 'ghcr.io/pterodactyl/yolks:java_25',
      'Java 21': 'ghcr.io/pterodactyl/yolks:java_21',
      'Java 17': 'ghcr.io/pterodactyl/yolks:java_17',
      'Java 11': 'ghcr.io/pterodactyl/yolks:java_11',
      'Java 8': 'ghcr.io/pterodactyl/yolks:java_8',
    },
    defaultImage: 'ghcr.io/pterodactyl/yolks:java_25',
    startup: 'java --add-modules=jdk.incubator.vector -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}',
    configStartupDone: ')! For help, type ',
    stopCommand: 'stop',
    requiredEnvVars: {
      SERVER_JARFILE: { default: 'server.jar', rules: 'required|string|max:20' },
      MC_VERSION: { default: 'latest', rules: 'required|string|max:20' },
      BUILD_NUMBER: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['server.jar'],
  },

  // ───────────────────────────────── Rust ──────────────────────────────────────

  65: {
    gameKey: 'rust',
    variant: 'autowipe',
    displayName: 'Rust',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/rust/rust_autowipe', ref: 'master' },
    dockerImages: {
      'Rust': 'ghcr.io/pterodactyl/games:rust',
    },
    defaultImage: 'ghcr.io/pterodactyl/games:rust',
    startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.queryport {{QUERY_PORT}} +rcon.port {{RCON_PORT}} +rcon.web true +server.hostname \\"{{HOSTNAME}}\\" +server.level \\"{{LEVEL}}\\" +server.description \\"{{DESCRIPTION}}\\" +server.url \\"{{SERVER_URL}}\\" +server.headerimage \\"{{SERVER_IMG}}\\" +server.identity \\"rust\\" +server.maxplayers {{MAX_PLAYERS}} +rcon.password \\"{{RCON_PASS}}\\" +server.saveinterval {{SAVEINTERVAL}} +app.port {{APP_PORT}} {{ADDITIONAL_ARGS}}',
    configStartupDone: 'Server startup complete',
    stopCommand: 'quit',
    requiredEnvVars: {
      HOSTNAME: { default: 'A Rust Server', rules: 'required|string|max:60' },
      LEVEL: { default: 'Procedural Map', rules: 'required|string|max:20' },
      DESCRIPTION: { default: 'Powered by GIVRwrld', rules: 'nullable|string|max:256' },
      SERVER_URL: { default: '', rules: 'nullable|string' },
      SERVER_IMG: { default: '', rules: 'nullable|string' },
      MAX_PLAYERS: { default: '50', rules: 'required|integer|min:1' },
      RCON_PASS: { default: 'CHANGEME', rules: 'required|string|max:64' },
      SAVEINTERVAL: { default: '60', rules: 'required|integer' },
      ADDITIONAL_ARGS: { default: '', rules: 'nullable|string' },
      QUERY_PORT: { default: '{{SERVER_PORT}}', rules: 'required|string' },
      RCON_PORT: { default: '{{SERVER_PORT}}', rules: 'required|string' },
      APP_PORT: { default: '{{SERVER_PORT}}', rules: 'required|string' },
    },
    expectedFiles: ['RustDedicated'],
    notes: 'Requires 3 contiguous ports: game (UDP), query (UDP), RCON (TCP). SRCDS_APPID=258550.',
  },

  // ───────────────────────────────── ARK ───────────────────────────────────────

  66: {
    gameKey: 'ark',
    variant: 'survival-evolved',
    displayName: 'ARK: Survival Evolved',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/steamcmd_servers/ark_survival_evolved', ref: 'master' },
    dockerImages: {
      'Source': 'ghcr.io/parkervcp/games:source',
    },
    defaultImage: 'ghcr.io/parkervcp/games:source',
    startup: 'ShooterGameServer {{MAP}}?listen?SessionName={{SESSION_NAME}}?ServerPassword={{ARK_PASSWORD}}?ServerAdminPassword={{ARK_ADMIN_PASSWORD}}?Port={{SERVER_PORT}}?QueryPort={{QUERY_PORT}}?MaxPlayers={{MAX_PLAYERS}} -server -log -automanagedmods {{ADDITIONAL_ARGS}}',
    configStartupDone: 'Waiting commands for 127.0.0.1:',
    stopCommand: '^C',
    requiredEnvVars: {
      MAP: { default: 'TheIsland', rules: 'required|string|max:50' },
      SESSION_NAME: { default: 'A GIVRwrld ARK Server', rules: 'required|string|max:60' },
      ARK_PASSWORD: { default: '', rules: 'nullable|string|max:64' },
      ARK_ADMIN_PASSWORD: { default: 'CHANGEME', rules: 'required|string|max:64' },
      MAX_PLAYERS: { default: '20', rules: 'required|integer|min:1' },
      ADDITIONAL_ARGS: { default: '', rules: 'nullable|string' },
      AUTO_UPDATE: { default: '1', rules: 'required|boolean' },
      SRCDS_APPID: { default: '376030', rules: 'required|numeric', description: 'ARK Dedicated Server Steam App ID' },
      QUERY_PORT: { default: '{{SERVER_PORT}}', rules: 'required|string' },
    },
    expectedFiles: ['ShooterGame/Binaries/Linux/ShooterGameServer'],
    notes: 'Requires 3 contiguous ports. SteamCMD-based; AUTO_UPDATE=1 required for initial game download.',
  },

  // ───────────────────────────────── Terraria ──────────────────────────────────

  67: {
    gameKey: 'terraria',
    variant: 'vanilla',
    displayName: 'Terraria Vanilla',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/terraria/vanilla', ref: 'master' },
    dockerImages: {
      'Debian': 'ghcr.io/parkervcp/yolks:debian',
    },
    defaultImage: 'ghcr.io/parkervcp/yolks:debian',
    startup: 'cd /home/container && ./TerrariaServer.bin.x86_64 -port {{SERVER_PORT}} -autocreate 2 -worldname {{SERVER_NAME}} -difficulty 1 -maxplayers 8',
    configStartupDone: "Type 'help' for a list of commands",
    stopCommand: 'exit',
    requiredEnvVars: {
      T_VERSION: { default: 'latest', rules: 'required|string|max:20', description: 'Terraria version' },
      SERVER_NAME: { default: 'GIVRwrld World', rules: 'required|string|max:40' },
    },
    expectedFiles: ['TerrariaServer.bin.x86_64'],
    notes: 'MUST use non-interactive startup flags (-autocreate, -worldname). Never use -config serverconfig.txt alone.',
  },

  68: {
    gameKey: 'terraria',
    variant: 'tmodloader',
    displayName: 'Terraria tModLoader',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/terraria/tmodloader', ref: 'master' },
    dockerImages: {
      '.NET 6': 'ghcr.io/parkervcp/yolks:dotnet_6',
    },
    defaultImage: 'ghcr.io/parkervcp/yolks:dotnet_6',
    startup: './tModLoaderServer -port {{SERVER_PORT}} -maxplayers {{MAX_PLAYERS}} -autocreate 2 -worldname {{WORLD_NAME}} -difficulty 1',
    configStartupDone: "Type 'help' for a list of commands",
    stopCommand: 'exit',
    requiredEnvVars: {
      TMODLOADER_VERSION: { default: 'latest', rules: 'required|string|max:20' },
      MAX_PLAYERS: { default: '8', rules: 'required|integer|min:1' },
      WORLD_NAME: { default: 'GIVRwrld World', rules: 'required|string|max:40' },
    },
    expectedFiles: ['tModLoaderServer'],
    notes: 'Requires .NET 6 runtime. Non-interactive startup flags required.',
  },

  // ───────────────────────────────── Factorio ─────────────────────────────────

  69: {
    gameKey: 'factorio',
    variant: 'vanilla',
    displayName: 'Factorio',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/factorio', ref: 'master' },
    dockerImages: {
      'Debian': 'ghcr.io/parkervcp/yolks:debian',
    },
    defaultImage: 'ghcr.io/parkervcp/yolks:debian',
    startup: './bin/x64/factorio --port {{SERVER_PORT}} --start-server-load-latest --server-settings data/server-settings.json',
    configStartupDone: 'Hosting game at IP ADDR',
    stopCommand: '^C',
    requiredEnvVars: {
      FACTORIO_VERSION: { default: 'latest', rules: 'required|string|max:20' },
      MAX_PLAYERS: { default: '20', rules: 'required|integer|min:1' },
    },
    expectedFiles: ['bin/x64/factorio'],
  },

  // ───────────────────────────────── Palworld ─────────────────────────────────

  70: {
    gameKey: 'palworld',
    variant: 'steamcmd',
    displayName: 'Palworld',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/steamcmd_servers/palworld', ref: 'master' },
    dockerImages: {
      'SteamCMD Debian': 'ghcr.io/parkervcp/steamcmd:debian',
    },
    defaultImage: 'ghcr.io/parkervcp/steamcmd:debian',
    startup: './PalworldServerConfigParser && ./PalServer.sh -port={{SERVER_PORT}} -queryport={{QUERY_PORT}} -players={{MAX_PLAYERS}} {{ADDITIONAL_ARGS}}',
    configStartupDone: 'Setting breakpad minidump AppID = 2394010',
    stopCommand: 'shutdown 15',
    requiredEnvVars: {
      MAX_PLAYERS: { default: '32', rules: 'required|integer|min:1' },
      QUERY_PORT: { default: '{{SERVER_PORT}}', rules: 'required|string' },
      ADDITIONAL_ARGS: { default: '', rules: 'nullable|string' },
    },
    expectedFiles: ['PalServer.sh'],
    notes:
      'SteamCMD-based. SRCDS_APPID must be 2394010 (dedicated server). Wrong IDs (e.g. 1007) cause Steam 0x2 and missing PalServer-Linux-Shipping. Requires 2 ports (game + query).',
  },

  // ───────────────────────────────── Mindustry ────────────────────────────────

  71: {
    gameKey: 'mindustry',
    variant: 'java',
    displayName: 'Mindustry',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/mindustry', ref: 'master' },
    dockerImages: {
      'Java 11': 'ghcr.io/parkervcp/yolks:java_11',
    },
    defaultImage: 'ghcr.io/parkervcp/yolks:java_11',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server-release.jar port {{SERVER_PORT}}',
    configStartupDone: 'Server loaded. ',
    stopCommand: 'exit',
    requiredEnvVars: {
      MINDUSTRY_VERSION: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['server-release.jar'],
  },

  // ───────────────────────────── Vintage Story ────────────────────────────────

  72: {
    gameKey: 'vintage-story',
    variant: 'dotnet',
    displayName: 'Vintage Story',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/vintage_story', ref: 'master' },
    dockerImages: {
      '.NET 8': 'ghcr.io/parkervcp/yolks:dotnet_8',
      '.NET 7': 'ghcr.io/parkervcp/yolks:dotnet_7',
    },
    // Community egg says dotnet_7, but VS 1.19+ requires .NET 8
    defaultImage: 'ghcr.io/parkervcp/yolks:dotnet_8',
    startup: './VintagestoryServer --port {{SERVER_PORT}} --dataPath /home/container/data',
    configStartupDone: 'Dedicated Server now running on Port ',
    stopCommand: '/stop',
    requiredEnvVars: {
      VS_VERSION: { default: 'latest', rules: 'required|string|max:20' },
      DOWNLOAD_URL: { default: '', rules: 'nullable|string', description: 'Direct download URL for the server archive' },
    },
    expectedFiles: ['VintagestoryServer'],
    notes: 'Override: uses dotnet_8 (not dotnet_7) because VS 1.19+ requires .NET 8.',
  },

  // ───────────────────────────────── Teeworlds ────────────────────────────────

  73: {
    gameKey: 'teeworlds',
    variant: 'vanilla',
    displayName: 'Teeworlds',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/teeworlds', ref: 'master' },
    dockerImages: {
      'Debian': 'ghcr.io/parkervcp/yolks:debian',
    },
    defaultImage: 'ghcr.io/parkervcp/yolks:debian',
    startup: './teeworlds_srv',
    configStartupDone: 'server name is',
    stopCommand: '^C',
    requiredEnvVars: {
      TEEWORLDS_VERSION: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['teeworlds_srv'],
  },

  // ────────────────────────────── Among Us ────────────────────────────────────

  74: {
    gameKey: 'among-us',
    variant: 'impostor',
    displayName: 'Among Us - Impostor Server',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/among_us/impostor_server', ref: 'master' },
    dockerImages: {
      '.NET 8': 'ghcr.io/parkervcp/yolks:dotnet_8',
    },
    // Community egg says dotnet_7, but we verified dotnet_8 works and is forward-compatible
    defaultImage: 'ghcr.io/parkervcp/yolks:dotnet_8',
    startup: './Impostor.Server',
    configStartupDone: 'Matchmaker is listening on',
    stopCommand: '^^C',
    requiredEnvVars: {
      IMPOSTOR_VERSION: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['Impostor.Server'],
    notes:
      'Override: uses dotnet_8. Requires PublicIp set to node public IP, not 127.0.0.1. Storefront + sync (`chooseEggForGame`) intentionally bind only Impostor — not proximity/Crewlink Panel eggs.',
  },

  // ───────────────────────────────── Veloren ──────────────────────────────────

  75: {
    gameKey: 'veloren',
    variant: 'debian',
    displayName: 'Veloren',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/veloren', ref: 'master' },
    dockerImages: {
      'Debian Trixie (GLIBC 2.41)': 'givrwrld/yolks:debian_trixie',
      'Debian (community)': 'ghcr.io/parkervcp/yolks:debian',
    },
    // Community debian image lacks GLIBC 2.39+ required by Veloren; custom image needed
    defaultImage: 'givrwrld/yolks:debian_trixie',
    startup: './veloren-server-cli',
    configStartupDone: 'Server is ready to accept connections',
    stopCommand: 'shutdown graceful 10',
    requiredEnvVars: {
      VELOREN_VERSION: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['veloren-server-cli'],
    notes: 'Override: uses givrwrld/yolks:debian_trixie because Veloren requires GLIBC >= 2.39.',
  },

  // ──────────────────────────────── Enshrouded ────────────────────────────────

  76: {
    gameKey: 'enshrouded',
    variant: 'proton',
    displayName: 'Enshrouded',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/steamcmd_servers/enshrouded', ref: 'master' },
    dockerImages: {
      'SteamCMD Proton': 'ghcr.io/parkervcp/steamcmd:proton',
    },
    defaultImage: 'ghcr.io/parkervcp/steamcmd:proton',
    startup: 'rm -f ./logs/enshrouded_server.log; proton run ./enshrouded_server.exe',
    configStartupDone: "[Session] 'HostOnline' (up)!",
    stopCommand: '^C',
    requiredEnvVars: {
      SERVER_NAME: { default: 'GIVRwrld Enshrouded', rules: 'required|string|max:60' },
      SERVER_PASSWORD: { default: '', rules: 'nullable|string|max:64' },
      MAX_PLAYERS: { default: '16', rules: 'required|integer|min:1' },
      WINDOWS_INSTALL: { default: '1', rules: 'required|boolean' },
    },
    expectedFiles: ['enshrouded_server.exe'],
    notes: 'Windows-only dedicated server running under Proton. SteamCMD-based.',
  },

  // ──────────────────────────── Rimworld: Open World ──────────────────────────

  77: {
    gameKey: 'rimworld',
    variant: 'open-world',
    displayName: 'Rimworld: Open World',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/rimworld/rimworld_open_world', ref: 'master' },
    dockerImages: {
      '.NET 6': 'ghcr.io/parkervcp/yolks:dotnet_6',
    },
    defaultImage: 'ghcr.io/parkervcp/yolks:dotnet_6',
    startup: './OpenWorldServer',
    configStartupDone: 'Server started',
    stopCommand: 'quit',
    requiredEnvVars: {
      RIMWORLD_OW_VERSION: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['OpenWorldServer'],
  },

  // ──────────────────────────── Rimworld Together ─────────────────────────────

  78: {
    gameKey: 'rimworld',
    variant: 'together',
    displayName: 'Rimworld Together',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/rimworld/rimworld_together', ref: 'master' },
    dockerImages: {
      '.NET 7': 'ghcr.io/parkervcp/yolks:dotnet_7',
    },
    defaultImage: 'ghcr.io/parkervcp/yolks:dotnet_7',
    startup: './GameServer',
    configStartupDone: 'Server launched',
    stopCommand: 'quit',
    requiredEnvVars: {
      RIMWORLD_VERSION: { default: 'latest', rules: 'required|string|max:20' },
    },
    expectedFiles: ['GameServer'],
  },

  // ───────────────────────────── ARK: Survival Ascended ───────────────────────

  79: {
    gameKey: 'ark-asa',
    variant: 'survival-ascended',
    displayName: 'ARK: Survival Ascended',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/steamcmd_servers/ark_survival_ascended', ref: 'master' },
    dockerImages: {
      'Proton': 'ghcr.io/parkervcp/steamcmd:proton',
    },
    defaultImage: 'ghcr.io/parkervcp/steamcmd:proton',
    startup:
      'rmv() { echo "stopping server"; rcon -t rcon -a 127.0.0.1:${RCON_PORT} -p ${ARK_ADMIN_PASSWORD} KeepAlive && rcon -t rcon -a 127.0.0.1:${RCON_PORT} -p ${ARK_ADMIN_PASSWORD} DoExit && wait ${ARK_PID}; echo "Server Closed"; exit; }; trap rmv 15 2; proton run ./ShooterGame/Binaries/Win64/ArkAscendedServer.exe {{SERVER_MAP}}?listen?MaxPlayers={{MAX_PLAYERS}}?SessionName=\\"{{SESSION_NAME}}\\"?Port={{SERVER_PORT}}?QueryPort={{QUERY_PORT}}?RCONPort={{RCON_PORT}}?RCONEnabled=True$( [  "$SERVER_PVE" == "0" ] || printf %s \'?ServerPVE=True\' )?ServerPassword=\\"{{SERVER_PASSWORD}}\\"{{ARGS_PARAMS}}?ServerAdminPassword=\\"{{ARK_ADMIN_PASSWORD}}\\" -WinLiveMaxPlayers={{MAX_PLAYERS}} -oldconsole -servergamelog$( [ -z "$MOD_IDS" ] || printf %s \' -mods=\' $MOD_IDS )$( [ "$BATTLE_EYE" == "1" ] || printf %s \' -NoBattlEye\' ) -Port={{SERVER_PORT}} {{ARGS_FLAGS}} & ARK_PID=$! ; tail -c0 -F ./ShooterGame/Saved/Logs/ShooterGame.log --pid=$ARK_PID & until echo "waiting for rcon connection..."; (rcon -t rcon -a 127.0.0.1:${RCON_PORT} -p ${ARK_ADMIN_PASSWORD})<&0 & wait $!; do sleep 5; done',
    configStartupDone: 'Waiting commands for 127.0.0.1:',
    stopCommand: '^C',
    requiredEnvVars: {
      SERVER_MAP: { default: 'TheIsland_WP', rules: 'required|string|max:64' },
      SESSION_NAME: { default: 'A GIVRwrld ARK ASA Server', rules: 'required|string|max:256' },
      AUTO_UPDATE: { default: '1', rules: 'required|boolean' },
      BATTLE_EYE: { default: '1', rules: 'required|boolean' },
      SRCDS_APPID: { default: '2430930', rules: 'required|numeric', description: 'ASA dedicated server Steam app id' },
      ARGS_PARAMS: { default: '', rules: 'nullable|string|max:1024' },
      MAX_PLAYERS: { default: '32', rules: 'required|integer|min:1|max:200' },
      ARK_ADMIN_PASSWORD: { default: 'CHANGEME', rules: 'required|alpha_dash|max:128' },
      QUERY_PORT: { default: '{{SERVER_PORT}}', rules: 'required|string' },
      ARGS_FLAGS: { default: '', rules: 'nullable|string|max:1024' },
      SERVER_PVE: { default: '1', rules: 'required|boolean' },
      SERVER_PASSWORD: { default: '', rules: 'nullable|alpha_dash|max:128' },
      RCON_PORT: { default: '{{SERVER_PORT}}', rules: 'required|string' },
      MOD_IDS: { default: '', rules: 'nullable|string|max:512' },
      WINDOWS_INSTALL: { default: '1', rules: 'required|boolean' },
    },
    expectedFiles: ['ShooterGame/Binaries/Win64/ArkAscendedServer.exe'],
    notes: 'Windows build under Proton; SteamCMD install uses WINDOWS_INSTALL=1. Needs game + query + RCON ports.',
  },

  // ───────────────────────── Counter-Strike: Global Offensive ─────────────────

  80: {
    gameKey: 'counter-strike',
    variant: 'csgo',
    displayName: 'Counter-Strike: Global Offensive',
    source: { repo: 'pelican-eggs/eggs', path: 'game_eggs/steamcmd_servers/counter_strike/counter_strike_source', ref: 'master' },
    dockerImages: {
      'Source': 'ghcr.io/parkervcp/games:source',
    },
    defaultImage: 'ghcr.io/parkervcp/games:source',
    startup:
      './srcds_run -game csgo -console -usercon +game_type 0 +game_mode 0 +mapgroup mg_active +map {{SRCDS_MAP}} +sv_setsteamaccount {{STEAM_TOKEN}} +ip 0.0.0.0 -port {{SERVER_PORT}} -strictportbind -norestart',
    configStartupDone: 'gameserver Steam ID',
    stopCommand: 'quit',
    requiredEnvVars: {
      SRCDS_APPID: { default: '740', rules: 'required|numeric', description: 'CS:GO Linux dedicated server app id' },
      SRCDS_MAP: { default: 'de_dust2', rules: 'required|string|max:64' },
      AUTO_UPDATE: { default: '1', rules: 'required|boolean' },
      STEAM_TOKEN: { default: '', rules: 'nullable|string|max:128', description: 'Steam GSLT (optional for LAN)' },
      STEAM_USER: { default: '', rules: 'nullable|string' },
      STEAM_PASS: { default: '', rules: 'nullable|string' },
      STEAM_AUTH: { default: '', rules: 'nullable|string' },
      MAX_PLAYERS: { default: '16', rules: 'required|integer|min:1|max:64' },
    },
    expectedFiles: ['srcds_run'],
    notes: 'SRCDS classic layout (srcds_run, -game csgo). App 740.',
  },
};

/**
 * Look up a catalog entry by Panel egg ID.
 * @param {number} eggId
 * @returns {EggCatalogEntry | null}
 */
const EGG_ID_ALIASES = {
  // Current panel egg ids -> legacy catalog ids used by this file.
  4: 61,   // Paper -> legacy paper catalog
  9: 80,   // Counter-Strike: Global Offensive (panel-specific)
  11: 66,  // ARK
  14: 65,  // Rust
  15: 71,  // Mindustry
  16: 70,  // Palworld
  17: 73,  // Teeworlds
  18: 75,  // Veloren
  19: 72,  // Vintage Story
  20: 74,  // Among Us Impostor
  21: 69,  // Factorio
  22: 78,  // Rimworld Together
  23: 67,  // Terraria Vanilla
  24: 76,  // Enshrouded
  25: 79,  // ARK: Survival Ascended (panel-specific)
  26: 68,  // Terraria tModLoader (short name in some nests)
  // Minecraft nest eggs (post-import; separate ids per variant).
  28: 61,  // Minecraft Paper
  29: 64,  // Minecraft Purpur
  30: 63,  // Minecraft Fabric
  31: 60,  // Minecraft Forge
  // Terraria + Rimworld post-import ids.
  36: 68,  // Terraria tModLoader (current panel id)
  39: 78,  // Rimworld (Together variant mapping reused — same runtime profile)
  // Legacy nest egg ids (before moving eggs) — keep validation working if a row still references them.
  42: 74,  // Among Us Impostor (old panel id → catalog 74)
};

export function getCatalogEntry(eggId) {
  const n = Number(eggId);
  const canonical = EGG_ID_ALIASES[n] ?? n;
  return EGG_CATALOG[canonical] ?? null;
}

/**
 * Return all egg IDs that the platform supports.
 * @returns {number[]}
 */
export function getSupportedEggIds() {
  return Object.keys(EGG_CATALOG).map(Number);
}

/**
 * Validate that a Panel egg's configuration matches our catalog.
 * Returns an object with `valid: boolean` and `errors: string[]`.
 *
 * @param {number} eggId
 * @param {{ dockerImage?: string, startup?: string }} panelEgg
 */
export function validateEggAgainstCatalog(eggId, panelEgg) {
  const entry = getCatalogEntry(eggId);
  const errors = [];

  if (!entry) {
    return { valid: false, errors: [`Egg ${eggId} is not in the GIVRwrld catalog`] };
  }

  if (panelEgg.dockerImage) {
    const allowedImages = Object.values(entry.dockerImages);
    if (!allowedImages.includes(panelEgg.dockerImage)) {
      errors.push(
        `Docker image mismatch: Panel has "${panelEgg.dockerImage}", catalog allows [${allowedImages.join(', ')}]`
      );
    }
  }

  if (panelEgg.startup) {
    const catalogStartupKey = entry.startup
      .replace(/\s+/g, ' ')
      .split(' ')[0];
    const panelStartupKey = panelEgg.startup
      .replace(/\s+/g, ' ')
      .split(' ')[0];
    if (catalogStartupKey && panelStartupKey && catalogStartupKey !== panelStartupKey) {
      errors.push(
        `Startup binary mismatch: Panel starts with "${panelStartupKey}", catalog expects "${catalogStartupKey}"`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
