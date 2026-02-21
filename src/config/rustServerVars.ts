export interface ServerVariable {
  name: string;
  description: string;
  envVar: string;
  defaultValue: string | number;
  permissions: 'user_editable' | 'admin_only' | 'system';
  inputRules: string;
  category: 'basic' | 'gameplay' | 'performance' | 'advanced';
}

export const rustServerVariables: ServerVariable[] = [
  // Basic Server Configuration
  {
    name: 'Server Name',
    description: 'The name of your Rust server that appears in the server browser',
    envVar: 'SERVER_NAME',
    defaultValue: 'GIVRwrld Rust Server',
    permissions: 'user_editable',
    inputRules: 'required|string|max:60',
    category: 'basic'
  },
  {
    name: 'Server Description',
    description: 'Server description shown in the Rust server browser',
    envVar: 'SERVER_DESCRIPTION',
    defaultValue: 'Welcome to our community Rust server! Join us for an amazing survival experience.',
    permissions: 'user_editable',
    inputRules: 'required|string|max:500',
    category: 'basic'
  },
  {
    name: 'Max Players',
    description: 'Maximum number of players allowed on the server',
    envVar: 'SERVER_MAXPLAYERS',
    defaultValue: 100,
    permissions: 'user_editable',
    inputRules: 'required|numeric|min:1|max:500',
    category: 'basic'
  },
  {
    name: 'Server Password',
    description: 'Password required to join the server (leave empty for public)',
    envVar: 'SERVER_PASSWORD',
    defaultValue: '',
    permissions: 'user_editable',
    inputRules: 'nullable|string|max:50',
    category: 'basic'
  },

  // Gameplay Configuration
  {
    name: 'World Size',
    description: 'Size of the Rust map in units (larger = bigger world)',
    envVar: 'SERVER_WORLDSIZE',
    defaultValue: 3000,
    permissions: 'user_editable',
    inputRules: 'required|numeric|min:1000|max:6000',
    category: 'gameplay'
  },
  {
    name: 'World Seed',
    description: 'Random seed for map generation (same seed = same map)',
    envVar: 'SERVER_SEED',
    defaultValue: 1337,
    permissions: 'user_editable',
    inputRules: 'required|numeric|min:1',
    category: 'gameplay'
  },
  {
    name: 'Map Type',
    description: 'Type of map to generate',
    envVar: 'SERVER_LEVEL',
    defaultValue: 'Procedural Map',
    permissions: 'user_editable',
    inputRules: 'required|string|in:Procedural Map,Barren,HapisIsland,SavasIsland',
    category: 'gameplay'
  },
  {
    name: 'PvP Enabled',
    description: 'Enable player vs player combat',
    envVar: 'SERVER_PVP',
    defaultValue: 'true',
    permissions: 'user_editable',
    inputRules: 'required|boolean',
    category: 'gameplay'
  },
  {
    name: 'Gather Rate Multiplier',
    description: 'Resource gathering rate multiplier (1.0 = normal, 2.0 = double)',
    envVar: 'GATHER_RATE',
    defaultValue: 1.0,
    permissions: 'user_editable',
    inputRules: 'required|numeric|min:0.1|max:10.0',
    category: 'gameplay'
  },

  // Performance & Technical
  {
    name: 'Save Interval',
    description: 'How often the server saves data (in seconds)',
    envVar: 'SERVER_SAVEINTERVAL',
    defaultValue: 300,
    permissions: 'user_editable',
    inputRules: 'required|numeric|min:60|max:3600',
    category: 'performance'
  },
  {
    name: 'Server Identity',
    description: 'Unique folder name for server data and saves',
    envVar: 'SERVER_IDENTITY',
    defaultValue: 'rust-server',
    permissions: 'user_editable',
    inputRules: 'required|string|regex:/^[a-zA-Z0-9_-]+$/|max:30',
    category: 'advanced'
  },
  {
    name: 'Server Port',
    description: 'Port number for the game server',
    envVar: 'SERVER_PORT',
    defaultValue: 28015,
    permissions: 'admin_only',
    inputRules: 'required|numeric|min:1024|max:65535',
    category: 'advanced'
  },
  {
    name: 'RCON Port',
    description: 'Port for remote console access',
    envVar: 'RCON_PORT',
    defaultValue: 28016,
    permissions: 'admin_only',
    inputRules: 'required|numeric|min:1024|max:65535',
    category: 'advanced'
  },
  {
    name: 'RCON Password',
    description: 'Password for remote console access',
    envVar: 'RCON_PASSWORD',
    defaultValue: 'changeme123',
    permissions: 'user_editable',
    inputRules: 'required|string|min:8|max:100',
    category: 'advanced'
  },

  // uMod/Oxide Specific (when modded server type is selected)
  {
    name: 'Oxide Mods',
    description: 'Comma-separated list of Oxide plugins to install',
    envVar: 'OXIDE_PLUGINS',
    defaultValue: 'AdminHammer,RemoverTool,Teleportation',
    permissions: 'user_editable',
    inputRules: 'nullable|string|max:500',
    category: 'advanced'
  },
  {
    name: 'Plugin Config Auto-Update',
    description: 'Automatically update plugin configurations',
    envVar: 'AUTO_UPDATE_PLUGINS',
    defaultValue: 'true',
    permissions: 'user_editable',
    inputRules: 'required|boolean',
    category: 'advanced'
  },

  // Wipe Schedule
  {
    name: 'Auto Wipe Enabled',
    description: 'Enable automatic server wipes',
    envVar: 'AUTO_WIPE_ENABLED',
    defaultValue: 'false',
    permissions: 'user_editable',
    inputRules: 'required|boolean',
    category: 'advanced'
  },
  {
    name: 'Wipe Schedule',
    description: 'Cron expression for wipe schedule (e.g., weekly Thursday)',
    envVar: 'WIPE_SCHEDULE',
    defaultValue: '0 0 * * 4',
    permissions: 'user_editable',
    inputRules: 'nullable|string|max:50',
    category: 'advanced'
  }
];

export const getVariablesByCategory = (category: string) => {
  return rustServerVariables.filter(variable => variable.category === category);
};

export const getVariablesByServerType = (serverType: string) => {
  if (serverType === 'umod') {
    return rustServerVariables;
  }
  // For vanilla, exclude mod-specific variables
  return rustServerVariables.filter(variable => 
    !['OXIDE_PLUGINS', 'AUTO_UPDATE_PLUGINS'].includes(variable.envVar)
  );
};

export const getVariablesByModpack = (modpack: string) => {
  const baseVars = rustServerVariables;
  
  switch (modpack) {
    case 'essential':
      return baseVars.map(variable => {
        if (variable.envVar === 'OXIDE_PLUGINS') {
          return {
            ...variable,
            defaultValue: 'AdminHammer,RemoverTool,Teleportation,Economics,GUIShop'
          };
        }
        return variable;
      });
    
    case 'pvp':
      return baseVars.map(variable => {
        if (variable.envVar === 'OXIDE_PLUGINS') {
          return {
            ...variable,
            defaultValue: 'Clans,Tournament,Deathmatch,EventManager,Kits'
          };
        }
        if (variable.envVar === 'GATHER_RATE') {
          return { ...variable, defaultValue: 2.0 };
        }
        return variable;
      });
    
    case 'pve':
      return baseVars.map(variable => {
        if (variable.envVar === 'OXIDE_PLUGINS') {
          return {
            ...variable,
            defaultValue: 'NPCSpawn,Quests,PvE,NightPvP,ZoneManager'
          };
        }
        if (variable.envVar === 'SERVER_PVP') {
          return { ...variable, defaultValue: 'false' };
        }
        return variable;
      });
    
    default:
      return baseVars;
  }
};