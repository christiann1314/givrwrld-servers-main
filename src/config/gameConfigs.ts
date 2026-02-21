// Game configuration for Pterodactyl eggs and environment variables
export interface GameConfig {
  eggId: number;
  dockerImage: string;
  startup: string;
  environment: Record<string, string>;
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
  };
}

export const gameConfigs: Record<string, GameConfig> = {
  minecraft: {
    eggId: 1, // Replace with actual Minecraft egg ID from your panel
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
    environment: {
      SERVER_JARFILE: 'server.jar',
      EULA: 'TRUE',
      SERVER_MEMORY: '4096',
      SERVER_NAME: 'GIVRwrld Minecraft Server',
      SERVER_PORT: '25565',
      ENABLE_QUERY: 'true',
      ENABLE_RCON: 'true',
      RCON_PASSWORD: '{{RCON_PASSWORD}}',
      ENABLE_COMMAND_BLOCK: 'true',
      MAX_PLAYERS: '20',
      DIFFICULTY: 'normal',
      GAMEMODE: 'survival',
      HARDCORE: 'false',
      PVP: 'true',
      FORCE_GAMEMODE: 'false',
      MAX_WORLD_SIZE: '29999984',
      ALLOW_NETHER: 'true',
      ANNOUNCE_PLAYER_ACHIEVEMENTS: 'true',
      SPAWN_ANIMALS: 'true',
      SPAWN_MONSTERS: 'true',
      SPAWN_NPCS: 'true',
      GENERATE_STRUCTURES: 'true',
      ALLOW_FLIGHT: 'false',
      LEVEL_NAME: 'world',
      LEVEL_TYPE: 'DEFAULT',
      GENERATOR_SETTINGS: '',
      LEVEL_SEED: '',
      ONLINE_MODE: 'true',
      WHITE_LIST: 'false',
      MAX_BUILD_HEIGHT: '256',
      SPAWN_PROTECTION: '16',
      MOTD: 'Welcome to GIVRwrld Minecraft Server!',
    },
    limits: {
      memory: 4096,
      swap: 0,
      disk: 20480,
      io: 500,
      cpu: 200,
    },
  },
  rust: {
    eggId: 2, // Replace with actual Rust egg ID from your panel
    dockerImage: 'ghcr.io/pterodactyl/yolks:rust',
    startup: './RustDedicated -batchmode -nographics -server.port {{SERVER_PORT}} -server.hostname "{{SERVER_NAME}}" -server.identity "{{SERVER_IDENTITY}}" -server.maxplayers {{MAX_PLAYERS}} -server.worldsize {{WORLD_SIZE}} -server.saveinterval {{SAVE_INTERVAL}} -server.seed {{SEED}} -server.secure {{ENABLE_BATTLEYE}} -rcon.port {{RCON_PORT}} -rcon.password "{{RCON_PASSWORD}}" -rcon.web {{ENABLE_RCON_WEB}} -server.url "{{SERVER_URL}}" -server.description "{{SERVER_DESCRIPTION}}" -server.headerimage "{{SERVER_HEADER_IMAGE}}" -server.logoimage "{{SERVER_LOGO_IMAGE}}" -server.radiation "{{RADIATION}}" -server.stability "{{STABILITY}}" -server.craft "{{CRAFT_AMOUNT}}" -server.friendlyfire "{{FRIENDLY_FIRE}}" -server.autosaveinterval {{AUTOSAVE_INTERVAL}} -server.backupinterval {{BACKUP_INTERVAL}} -oxide.disable "{{DISABLE_OXIDE}}" -oxide.update "{{UPDATE_OXIDE}}" -server.encryption 1 -server.encryption 1',
    environment: {
      SERVER_NAME: 'GIVRwrld Rust Server',
      SERVER_PORT: '28015',
      SERVER_IDENTITY: 'givrwrld_rust',
      MAX_PLAYERS: '32',
      WORLD_SIZE: '4000',
      SAVE_INTERVAL: '600',
      SEED: '12345',
      ENABLE_BATTLEYE: '1',
      RCON_PORT: '28016',
      RCON_PASSWORD: '{{RCON_PASSWORD}}',
      ENABLE_RCON_WEB: '1',
      SERVER_URL: 'https://givrwrldservers.com',
      SERVER_DESCRIPTION: 'Welcome to GIVRwrld Rust Server!',
      SERVER_HEADER_IMAGE: '',
      SERVER_LOGO_IMAGE: '',
      RADIATION: '1',
      STABILITY: '1',
      CRAFT_AMOUNT: '1',
      FRIENDLY_FIRE: '0',
      AUTOSAVE_INTERVAL: '300',
      BACKUP_INTERVAL: '3600',
      DISABLE_OXIDE: '0',
      UPDATE_OXIDE: '1',
    },
    limits: {
      memory: 6144,
      swap: 0,
      disk: 30720,
      io: 500,
      cpu: 300,
    },
  },
  palworld: {
    eggId: 3, // Replace with actual Palworld egg ID from your panel
    dockerImage: 'ghcr.io/pterodactyl/yolks:palworld',
    startup: './PalServer.sh -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS',
    environment: {
      SERVER_NAME: 'GIVRwrld Palworld Server',
      SERVER_DESCRIPTION: 'Welcome to GIVRwrld Palworld Server!',
      ADMIN_PASSWORD: '{{ADMIN_PASSWORD}}',
      SERVER_PASSWORD: '{{SERVER_PASSWORD}}',
      PUBLIC_PORT: '8211',
      PLAYERS: '8',
      MULTITHREADING: 'true',
      RCON_ENABLED: 'true',
      RCON_PORT: '25575',
      RCON_PASSWORD: '{{RCON_PASSWORD}}',
      COMMUNITY: 'false',
      DIFFICULTY: 'Normal',
      DAY_TIME_SPEED_RATE: '1.000000',
      NIGHT_TIME_SPEED_RATE: '1.000000',
      EXP_RATE: '1.000000',
      PAL_CAPTURE_RATE: '1.000000',
      PAL_SPAWN_NUM_RATE: '1.000000',
      PAL_DAMAGE_RATE_ATTACK: '1.000000',
      PAL_DAMAGE_RATE_DEFENSE: '1.000000',
      PLAYER_DAMAGE_RATE_ATTACK: '1.000000',
      PLAYER_DAMAGE_RATE_DEFENSE: '1.000000',
      PLAYER_STAMINA_CONSUMPTION_RATE: '1.000000',
      PLAYER_AUTO_HP_REGENE_RATE: '1.000000',
      PLAYER_AUTO_HP_REGENE_FREQUENCY: '1.000000',
      PAL_AUTO_HP_REGENE_RATE: '1.000000',
      PAL_AUTO_HP_REGENE_FREQUENCY: '1.000000',
      BUILD_OBJECT_DAMAGE_RATE: '1.000000',
      BUILD_OBJECT_DETERIORATION_DAMAGE_RATE: '1.000000',
      COLLECTION_DROP_RATE: '1.000000',
      COLLECTION_OBJECT_HP_RATE: '1.000000',
      COLLECTION_OBJECT_DAMAGE_RATE: '1.000000',
      COLLECTION_OBJECT_DETERIORATION_DAMAGE_RATE: '1.000000',
      ENEMY_DROP_ITEM_RATE: '1.000000',
      DEATH_PENALTY: 'All',
      ENABLE_PLAYER_TO_PLAYER_DAMAGE: 'false',
      ENABLE_FRIENDLY_FIRE: 'false',
      ENABLE_INVADER_ENEMY: 'true',
      ACTIVE_UNUS: 'true',
      ENABLE_AIM_ASSIST_PAD: 'true',
      ENABLE_AIM_ASSIST_KEYBOARD: 'false',
      DROP_ITEM_MAX_NUM: '3000',
      DROP_ITEM_MAX_NUM_UNLIMIT: 'false',
      BASE_CAMP_MAX_NUM: '128',
      BASE_CAMP_WORKER_MAX_NUM: '15',
      DROP_ITEM_ALIVE_KEEP_HOURS: '1.000000',
      AUTO_SAVE: 'true',
      AUTO_SAVE_INTERVAL_MINUTES: '20.000000',
      WORLD_DATA_SAVE_INTERVAL_MINUTES: '5.000000',
      GAME_TIMEOUT_MINUTES: '60.000000',
      SERVER_TICK_INTERVAL_SECONDS: '0.033000',
    },
    limits: {
      memory: 8192,
      swap: 0,
      disk: 40960,
      io: 500,
      cpu: 400,
    },
  },
};

export function getGameConfig(game: string, plan: { ram_gb: number; vcores: number; ssd_gb: number }): GameConfig {
  const config = gameConfigs[game.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown game: ${game}`);
  }

  // Update memory limits based on plan
  const updatedConfig = { ...config };
  updatedConfig.limits.memory = plan.ram_gb * 1024; // Convert GB to MB
  updatedConfig.limits.disk = plan.ssd_gb * 1024; // Convert GB to MB
  updatedConfig.limits.cpu = plan.vcores * 100; // Convert vcores to CPU percentage

  // Update environment variables with plan-specific values
  updatedConfig.environment = {
    ...updatedConfig.environment,
    SERVER_MEMORY: plan.ram_gb.toString(),
  };

  return updatedConfig;
}

