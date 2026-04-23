/**
 * Per-game transparency content for configure pages: features, supported software, setup steps, FAQ, "what is hosting".
 * Used by GameTransparencySection to show what we offer for each game.
 */

export type TransparencyFeature = {
  title: string;
  description: string;
  icon: 'plugin' | 'version' | 'mod' | 'panel' | 'backup' | 'support';
};

export type TransparencyContent = {
  gameName: string;
  features: TransparencyFeature[];
  supportedTitle: string;
  supportedItems: string[];
  supportedBlurb: string;
  setupSteps: { title: string; body: string }[];
  faq: { question: string; answer: string }[];
  whatIsHosting: string[];
};

const PANEL_BLURB = 'Our game panel gives you full control: start/stop/restart, file manager, console, and one-click installs where available. Manage your server from anywhere with a simple, fast interface.';

function mc(): TransparencyContent {
  return {
    gameName: 'Minecraft',
    features: [
      { title: 'Plugin & mod support', description: 'The panel supports multiple server types (Paper, Spigot, Fabric, etc.) so you can install plugins and mods with ease. Switch between vanilla and modded from the same server.', icon: 'plugin' },
      { title: 'Version changer', description: 'Easily switch between Minecraft versions and server types (e.g. Vanilla, Paper, Spigot, Fabric). Choose the right stack for your community.', icon: 'version' },
      { title: 'Mod manager', description: 'Install and manage modpacks and mods through the panel for a faster, less stressful server experience.', icon: 'mod' },
    ],
    supportedTitle: 'Server types & modpacks supported',
    supportedItems: ['Paper', 'Spigot', 'Bukkit', 'Fabric', 'Quilt', 'Forge', 'Vanilla (Java & Bedrock)', 'Purpur', 'Folia', 'Sponge', 'Geyser/Floodgate (crossplay)'],
    supportedBlurb: 'We support many Minecraft server types and modpacks. Use the Version Changer in the panel to switch between them. Need a custom modpack? Upload your files via the file manager.',
    setupSteps: [
      { title: 'Choose your plan and server type', body: 'Pick a plan above and select your game type (e.g. Paper, Fabric). Complete checkout; your server will be provisioned in minutes.' },
      { title: 'Change versions or install modpacks', body: 'In the panel you can switch Minecraft version and server type. For modpacks, use the one-click options where available or upload via file manager.' },
      { title: 'Configure and start', body: 'Set player limit, difficulty, and other options in server.properties or the panel. Start your server and share the IP with your players.' },
      { title: 'Share your server', body: 'Give your community the connection details from the panel. They can join via the in-game multiplayer list or direct connect.' },
    ],
    faq: [
      { question: 'Which Minecraft versions do you support?', answer: 'We support current and recent Java and Bedrock editions. The exact list depends on the server type (Paper, Fabric, etc.) you choose. You can switch versions from the panel.' },
      { question: 'What Minecraft server types do you support?', answer: 'We support Paper, Spigot, Bukkit, Fabric, Quilt, Forge, Vanilla, Purpur, Folia, Sponge, and more. Select your type on this page or change it later in the panel.' },
      { question: 'Do you offer prebuilt modpacks?', answer: 'Many of our eggs support popular modpacks or one-click installs. For custom modpacks, you can upload your files via the panel file manager.' },
      { question: 'How easy is it to install plugins?', answer: 'Plugins can be installed via the panel file manager (upload the JAR) or through one-click installers where available for your server type.' },
      { question: 'Can I host a custom modpack?', answer: 'Yes. Upload your modpack files via the panel and configure the server startup as needed. Support can help with compatibility questions.' },
    ],
    whatIsHosting: [
      'Minecraft hosting at GIVRwrld gives you a dedicated server so you can run your own world, modpack, or minigame network. You get full control via our panel: start/stop, file manager, console, and the ability to switch versions and server types.',
      'Minecraft is an open-world sandbox game where players mine, build, and survive. With a dedicated server you can add plugins and mods, set rules, and keep your world running 24/7 for your community.',
    ],
  };
}

function rust(): TransparencyContent {
  return {
    gameName: 'Rust',
    features: [
      { title: 'Oxide / uMod', description: 'Run Oxide or uMod for plugins and mods. Manage your server and mods through the panel and file manager.', icon: 'plugin' },
      { title: 'Quick deployment', description: 'Your Rust server is deployed on premium hardware. Start, stop, and update from the panel.', icon: 'panel' },
      { title: 'Full control', description: 'Console access, config edits, and RCON so you can tune performance and gameplay the way you want.', icon: 'support' },
    ],
    supportedTitle: 'What we offer for Rust',
    supportedItems: ['Rust (official)', 'Oxide/uMod', 'Custom server config', 'RCON access', 'NVMe storage'],
    supportedBlurb: 'We provide a standard Rust server container. You can add Oxide/uMod and plugins via the panel. Server config (max players, seed, etc.) is fully editable.',
    setupSteps: [
      { title: 'Pick your plan', body: 'Choose a plan above based on expected player count (e.g. 50–100 for 3GB, 100–200 for 6GB). Complete checkout.' },
      { title: 'Configure and start', body: 'In the panel, set server name, max players, seed, and other options. Install Oxide/uMod if you want plugins.' },
      { title: 'Share your server', body: 'Give your community the server IP and port from the panel. They can connect via the in-game server browser or F1 console.' },
    ],
    faq: [
      { question: 'Do you support Oxide or uMod?', answer: 'Yes. You can install and run Oxide/uMod on your Rust server. Use the panel file manager or our supported egg where available.' },
      { question: 'What hardware do Rust servers run on?', answer: 'Rust servers run on our dedicated Rise-3 node (Ryzen 9 5900X, NVMe). Plan size determines RAM and CPU allocated to your server.' },
      { question: 'Can I change the map or wipe?', answer: 'Yes. You have full control over server config, including map seed, size, and wipes. Use the panel and console to manage wipes and updates.' },
    ],
    whatIsHosting: [
      'Rust hosting at GIVRwrld gives you a dedicated game server so your community can play on your own rules and mods. You get the panel for start/stop, config, and plugin management.',
      'Rust is a multiplayer survival game where players gather resources, build bases, and compete. A dedicated server lets you control wipes, plugins, and performance.',
    ],
  };
}

function palworld(): TransparencyContent {
  return {
    gameName: 'Palworld',
    features: [
      { title: 'Dedicated Palworld egg', description: 'We offer a dedicated Palworld server egg so you get a correctly configured dedicated server out of the box.', icon: 'panel' },
      { title: 'Fast deployment', description: 'Your server is provisioned in minutes. Use the panel to start, stop, and edit config (difficulty, rates, etc.).', icon: 'panel' },
      { title: 'Full config control', description: 'Edit server settings, player limits, and Palworld-specific options through the panel and config files.', icon: 'support' },
    ],
    supportedTitle: 'What we offer for Palworld',
    supportedItems: ['Palworld dedicated server', 'Config editing (difficulty, rates, PvP)', 'Panel console & file manager', 'NVMe storage'],
    supportedBlurb: 'We support the official Palworld dedicated server. You can tweak all standard config options from the panel.',
    setupSteps: [
      { title: 'Choose your plan', body: 'Select a plan above (e.g. 4GB for 4–8 players, 8GB for 8–16). Complete checkout; the server will be ready in minutes.' },
      { title: 'Configure your server', body: 'In the panel, set server name, password, player count, difficulty, and other options. Start the server when ready.' },
      { title: 'Share with friends', body: 'Share the connection details from the panel. Players can join via the in-game server list or direct connect.' },
    ],
    faq: [
      { question: 'What Palworld server options can I change?', answer: 'You can configure difficulty, capture rates, day/night speed, PvP, and other standard dedicated server options via the config files in the panel.' },
      { question: 'How many players can join?', answer: 'Depends on your plan and the player limit you set. Typical plans support 4–16 players; larger plans allow higher limits.' },
      { question: 'Do you support mods?', answer: 'Palworld dedicated server support for mods depends on game updates. You have file manager access to add mods when supported.' },
    ],
    whatIsHosting: [
      'Palworld hosting at GIVRwrld gives you a dedicated server so you and your friends can play together with your own rules. Full panel access for config and updates.',
      'Palworld is a multiplayer open-world game where you collect Pals, build, and survive. A dedicated server lets you control settings and who can join.',
    ],
  };
}

function genericGame(gameName: string, supportedItems: string[], supportedBlurb: string, setupSteps: { title: string; body: string }[], faq: { question: string; answer: string }[], whatIsHosting: string[]): TransparencyContent {
  return {
    gameName,
    features: [
      { title: 'Panel control', description: 'Start, stop, and restart your server from the panel. Use the file manager and console for full control.', icon: 'panel' },
      { title: 'Fast deployment', description: 'Your server is provisioned on our Rise-3 node (Ryzen 9 5900X, NVMe). Ready in minutes after checkout.', icon: 'version' },
      { title: 'Support', description: '24/7 support and Discord community. DDoS mitigation included for all game servers.', icon: 'support' },
    ],
    supportedTitle: `What we offer for ${gameName}`,
    supportedItems,
    supportedBlurb,
    setupSteps,
    faq,
    whatIsHosting,
  };
}

export function getGameTransparencyContent(slug: string): TransparencyContent | null {
  const map: Record<string, () => TransparencyContent> = {
    minecraft: mc,
    rust: rust,
    palworld: palworld,
    ark: () => genericGame(
      'ARK',
      ['ARK: Survival Evolved', 'Config editing', 'Panel console & file manager', 'NVMe storage'],
      'We provide an ARK dedicated server. You can edit all standard config options and mods via the panel.',
      [
        { title: 'Pick your plan', body: 'Choose a plan above based on player count and map size. Complete checkout; the server will be provisioned in minutes.' },
        { title: 'Configure and start', body: 'Set server name, password, and game options in the panel. Start the server and install mods if needed via the file manager.' },
        { title: 'Share your server', body: 'Give your community the connection details. They can join via the in-game server browser.' },
      ],
      [
        { question: 'Do you support ARK mods?', answer: 'You have file manager access to add mods. Install and configure mods through the panel as you would on any dedicated server.' },
        { question: 'What ARK maps are supported?', answer: 'You can run the official maps and modded maps that work with the dedicated server. Config and startup are under your control.' },
      ],
      ['ARK hosting at GIVRwrld gives you a dedicated server for ARK: Survival Evolved. Full panel access for config, mods, and updates.', 'ARK is a survival game with dinosaurs and tribes. A dedicated server lets you control maps, rates, and who can join.']
    ),
    terraria: () => genericGame(
      'Terraria',
      ['Vanilla', 'tModLoader', 'Panel console & file manager'],
      'We host Terraria Vanilla and Terraria tModLoader. Manage worlds and mods in the panel.',
      [
        { title: 'Choose plan and server type', body: 'Select a plan and server type (Vanilla or tModLoader). Complete checkout.' },
        { title: 'Configure and start', body: 'Set player limit and other options in the panel. Add mods via the file manager on tModLoader.' },
        { title: 'Share your server', body: 'Share the IP and port from the panel. Players join via the in-game join menu.' },
      ],
      [
        { question: 'Do you support tModLoader?', answer: 'Yes. Pick tModLoader when configuring if you want mod support.' },
        { question: 'How do I add Terraria mods?', answer: 'On tModLoader, use the workshop and mod tools in the panel file manager. Vanilla uses the stock dedicated server.' },
      ],
      ['Terraria hosting at GIVRwrld gives you a dedicated Terraria server with full panel access.', 'Terraria is a 2D sandbox adventure game. A dedicated server lets you play with friends.']
    ),
    factorio: () => genericGame(
      'Factorio',
      ['Factorio dedicated', 'Panel & file manager', 'Mod support'],
      'We host standard Factorio dedicated servers with full panel access.',
      [
        { title: 'Pick plan', body: 'Choose a plan and complete checkout.' },
        { title: 'Configure and start', body: 'Set map, mods, and other options in the panel. Start the server when ready.' },
        { title: 'Share with players', body: 'Share the connection details. Players can join via the in-game multiplayer menu.' },
      ],
      [
        { question: 'Do you support Factorio mods?', answer: 'Yes. You can install mods via the panel file manager and server settings.' },
        { question: 'Can I change map settings?', answer: 'Yes. Server settings and saves are available through the panel.' },
      ],
      ['Factorio hosting at GIVRwrld gives you a dedicated Factorio server. Full control via panel and console.', 'Factorio is a factory-building game. A dedicated server lets you run persistent multiplayer games with mods.']
    ),
    mindustry: () => genericGame('Mindustry', ['Mindustry', 'Panel & file manager'], 'We offer a Mindindustry server. Manage maps and config via the panel.', [{ title: 'Pick plan', body: 'Choose a plan and complete checkout.' }, { title: 'Configure and share', body: 'Set options in the panel and share the connection details with players.' }], [{ question: 'What can I configure?', answer: 'You have full access to server config and maps via the panel.' }], ['Mindustry hosting at GIVRwrld gives you a dedicated server for Mindindustry. Panel access for config and maps.']),
    rimworld: () => genericGame('RimWorld', ['RimWorld', 'Mod support', 'Panel & file manager'], 'We offer RimWorld dedicated server support. Add mods via the panel.', [{ title: 'Pick plan', body: 'Choose a plan and complete checkout.' }, { title: 'Configure and share', body: 'Set up mods and config in the panel; share connection details with players.' }], [{ question: 'Do you support RimWorld mods?', answer: 'You can add mods via the file manager. Sync mod list with your players for compatibility.' }], ['RimWorld hosting at GIVRwrld gives you a dedicated server for RimWorld multiplayer. Panel access for mods and config.']),
    'vintage-story': () => genericGame('Vintage Story', ['Vintage Story', 'Panel & file manager'], 'We offer a Vintage Story server. Manage config and mods via the panel.', [{ title: 'Pick plan', body: 'Choose a plan and complete checkout.' }, { title: 'Configure and share', body: 'Set options and add mods in the panel; share the server details.' }], [{ question: 'Can I use mods?', answer: 'Yes. Add mods via the panel file manager and configure the server as needed.' }], ['Vintage Story hosting at GIVRwrld gives you a dedicated server. Full panel access.']),
    teeworlds: () => genericGame('Teeworlds', ['Teeworlds', 'Panel & config'], 'We offer a Teeworlds server. Edit config and run the server from the panel.', [{ title: 'Pick plan', body: 'Choose a plan and complete checkout.' }, { title: 'Configure and share', body: 'Set server name and options in the panel; share the connection details.' }], [{ question: 'What can I configure?', answer: 'You have full access to server config via the panel.' }], ['Teeworlds hosting at GIVRwrld gives you a dedicated server. Panel control and config.']),
    'among-us': () => genericGame('Among Us', ['Among Us', 'Panel & config'], 'We offer an Among Us server. Configure and run from the panel.', [{ title: 'Pick plan', body: 'Choose a plan and complete checkout.' }, { title: 'Configure and share', body: 'Set options and share the server code or IP with players.' }], [{ question: 'How do players join?', answer: 'Players can join using the server code or connection details from the panel.' }], ['Among Us hosting at GIVRwrld gives you a dedicated server for private lobbies.']),
    veloren: () => genericGame('Veloren', ['Veloren', 'Panel & file manager'], 'We offer a Veloren server. Manage config and updates via the panel.', [{ title: 'Pick plan', body: 'Choose a plan and complete checkout.' }, { title: 'Configure and share', body: 'Set server options in the panel and share connection details.' }], [{ question: 'What can I configure?', answer: 'You have full access to server config via the panel.' }], ['Veloren hosting at GIVRwrld gives you a dedicated server for the Veloren voxel RPG.']),
    enshrouded: () => genericGame(
      'Enshrouded',
      ['Enshrouded dedicated server', 'Mod-ready profiles', 'Panel & file manager'],
      'We offer Enshrouded dedicated server hosting. Up to 16 players; configure name, password, and slots via the panel.',
      [
        { title: 'Pick plan and type', body: 'Choose a mod-ready plan (6–8GB typical). Complete checkout.' },
        { title: 'Configure and start', body: 'Set server name, password, slot count (1–16), and ports in the panel. Start the server.' },
        { title: 'Share with players', body: 'Players can add the server via Steam server browser (IP:queryPort) or in-game list.' },
      ],
      [
        { question: 'How many players can join?', answer: 'Enshrouded supports 1–16 players. Set slotCount in enshrouded_server.json or via the egg variables.' },
        { question: 'Do you support Enshrouded mods?', answer: 'We offer a Modded variant. Add mods via the panel file manager; ensure clients use the same mod set.' },
        { question: 'What ports does Enshrouded use?', answer: 'Game port (default 15636) and query port (game + 1). Allocations are set in the panel.' },
      ],
      ['Enshrouded hosting at GIVRwrld gives you a dedicated server for co-op survival, crafting, and action RPG. Full panel access for config and mods.']
    ),
  };
  const fn = map[slug.toLowerCase()];
  return fn ? fn() : null;
}
