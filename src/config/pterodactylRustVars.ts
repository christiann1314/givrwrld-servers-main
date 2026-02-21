// Pterodactyl Environment Variables for Rust Servers
// These match your RustConfig offerings and Pterodactyl's expected format

export interface PterodactylVariable {
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  server_value: string;
  is_editable: boolean;
  rules: string;
}

export const pterodactylRustVariables: PterodactylVariable[] = [
  // Basic Server Configuration
  {
    name: "Server Name",
    description: "The name of your Rust server that appears in the server browser",
    env_variable: "HOSTNAME", 
    default_value: "GIVRwrld Rust Server",
    server_value: "GIVRwrld Rust Server",
    is_editable: true,
    rules: "required|string|max:60"
  },
  {
    name: "Server Description", 
    description: "Server description shown in the Rust server browser",
    env_variable: "DESCRIPTION",
    default_value: "Welcome to our community Rust server! Join us for survival.",
    server_value: "Welcome to our community Rust server! Join us for survival.",
    is_editable: true,
    rules: "required|string|max:500"
  },
  {
    name: "Max Players",
    description: "Maximum number of players allowed on the server", 
    env_variable: "MAX_PLAYERS",
    default_value: "100",
    server_value: "100",
    is_editable: true,
    rules: "required|numeric|between:1,500"
  },
  {
    name: "Server Password",
    description: "Password required to join server (leave empty for public)",
    env_variable: "SERVER_PASSWORD",
    default_value: "",
    server_value: "",
    is_editable: true,
    rules: "nullable|string|max:50"
  },

  // World Configuration
  {
    name: "World Size",
    description: "Size of the Rust map in units (1000-6000)",
    env_variable: "WORLD_SIZE", 
    default_value: "3000",
    server_value: "3000",
    is_editable: true,
    rules: "required|numeric|between:1000,6000"
  },
  {
    name: "World Seed",
    description: "Random seed for map generation (same seed = same map)",
    env_variable: "WORLD_SEED",
    default_value: "1337", 
    server_value: "1337",
    is_editable: true,
    rules: "required|numeric|min:1"
  },
  {
    name: "Map",
    description: "Map type to use for the server",
    env_variable: "LEVEL",
    default_value: "Procedural Map",
    server_value: "Procedural Map", 
    is_editable: true,
    rules: "required|string|in:Procedural Map,Barren,HapisIsland,SavasIsland"
  },

  // Game Settings
  {
    name: "Server Identity",
    description: "Unique folder name for server data and saves",
    env_variable: "SERVER_IDENTITY",
    default_value: "rust-server",
    server_value: "rust-server",
    is_editable: true,
    rules: "required|alpha_dash|max:30"
  },
  {
    name: "Save Interval", 
    description: "How often the server saves data (in seconds)",
    env_variable: "SAVE_INTERVAL",
    default_value: "300",
    server_value: "300",
    is_editable: true,
    rules: "required|numeric|between:60,3600"
  },
  {
    name: "PvP",
    description: "Enable player vs player combat",
    env_variable: "PVP",
    default_value: "true",
    server_value: "true", 
    is_editable: true,
    rules: "required|boolean"
  },

  // Network Configuration (Admin controlled)
  {
    name: "Server Port",
    description: "Game server port",
    env_variable: "SERVER_PORT", 
    default_value: "28015",
    server_value: "28015",
    is_editable: false,
    rules: "required|numeric|between:1024,65535"
  },
  {
    name: "RCON Port", 
    description: "Remote console port",
    env_variable: "RCON_PORT",
    default_value: "28016",
    server_value: "28016",
    is_editable: false, 
    rules: "required|numeric|between:1024,65535"
  },
  {
    name: "RCON Password",
    description: "Remote console password for server management",
    env_variable: "RCON_PASSWORD",
    default_value: "changeme123",
    server_value: "changeme123",
    is_editable: true,
    rules: "required|string|min:8|max:50"
  },

  // Modded Server Variables (for uMod/Oxide)
  {
    name: "Oxide Plugin List",
    description: "Comma-separated list of Oxide plugins to install",
    env_variable: "OXIDE_PLUGINS", 
    default_value: "",
    server_value: "",
    is_editable: true,
    rules: "nullable|string|max:1000"
  },
  {
    name: "Auto Update Plugins",
    description: "Automatically update plugins on server start",
    env_variable: "AUTO_UPDATE_PLUGINS",
    default_value: "true",
    server_value: "true",
    is_editable: true,
    rules: "required|boolean"
  },

  // Performance & Resource Settings
  {
    name: "Tick Rate",
    description: "Server tick rate (higher = more responsive, more CPU usage)",
    env_variable: "TICK_RATE",
    default_value: "30", 
    server_value: "30",
    is_editable: true,
    rules: "required|numeric|between:10,60"
  },
  {
    name: "Gather Rate",
    description: "Resource gathering multiplier (1.0 = normal)",
    env_variable: "GATHER_RATE",
    default_value: "1.0",
    server_value: "1.0", 
    is_editable: true,
    rules: "required|numeric|between:0.1,10.0"
  },

  // Startup Configuration
  {
    name: "Additional Args",
    description: "Additional command line arguments for Rust server",
    env_variable: "ADDITIONAL_ARGS",
    default_value: "",
    server_value: "",
    is_editable: true,
    rules: "nullable|string|max:500"
  },

  // Auto Wipe Settings
  {
    name: "Auto Wipe",
    description: "Enable automatic server wipes",
    env_variable: "AUTO_WIPE",
    default_value: "false",
    server_value: "false",
    is_editable: true,
    rules: "required|boolean"
  },
  {
    name: "Wipe Schedule",
    description: "When to wipe (weekly/biweekly/monthly)",
    env_variable: "WIPE_SCHEDULE", 
    default_value: "weekly",
    server_value: "weekly",
    is_editable: true,
    rules: "required|string|in:weekly,biweekly,monthly"
  }
];

// Get variables based on server type
export const getVariablesByServerType = (serverType: 'vanilla' | 'umod') => {
  if (serverType === 'vanilla') {
    // Remove mod-specific variables for vanilla
    return pterodactylRustVariables.filter(variable => 
      !['OXIDE_PLUGINS', 'AUTO_UPDATE_PLUGINS'].includes(variable.env_variable)
    );
  }
  return pterodactylRustVariables;
};

// Get variables with modpack defaults
export const getVariablesWithModpackDefaults = (modpack: string) => {
  return pterodactylRustVariables.map(variable => {
    switch (modpack) {
      case 'essential':
        if (variable.env_variable === 'OXIDE_PLUGINS') {
          return {
            ...variable,
            default_value: 'AdminHammer,RemoverTool,Teleportation,Economics,GUIShop',
            server_value: 'AdminHammer,RemoverTool,Teleportation,Economics,GUIShop'
          };
        }
        break;
        
      case 'pvp':
        if (variable.env_variable === 'OXIDE_PLUGINS') {
          return {
            ...variable, 
            default_value: 'Clans,Tournament,Deathmatch,EventManager,Kits',
            server_value: 'Clans,Tournament,Deathmatch,EventManager,Kits'
          };
        }
        if (variable.env_variable === 'GATHER_RATE') {
          return { ...variable, default_value: '2.0', server_value: '2.0' };
        }
        break;
        
      case 'pve':
        if (variable.env_variable === 'OXIDE_PLUGINS') {
          return {
            ...variable,
            default_value: 'NPCSpawn,Quests,PvE,NightPvP,ZoneManager', 
            server_value: 'NPCSpawn,Quests,PvE,NightPvP,ZoneManager'
          };
        }
        if (variable.env_variable === 'PVP') {
          return { ...variable, default_value: 'false', server_value: 'false' };
        }
        break;
    }
    return variable;
  });
};

// Format for Pterodactyl API
export const formatForPterodactylAPI = (variables: PterodactylVariable[]) => {
  return variables.map(variable => ({
    name: variable.name,
    description: variable.description, 
    env_variable: variable.env_variable,
    default_value: variable.default_value,
    server_value: variable.server_value,
    is_editable: variable.is_editable,
    rules: variable.rules
  }));
};