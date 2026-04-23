import type { CatalogGameTypeOption, CatalogPlanOption } from '@/hooks/useGamePlanCatalog';

/**
 * Lowest RAM tier (GB) we sell per game for a reliable cold start.
 * Keep in sync with `api/scripts/seed-game-variant-plans.js` (variant `minRam` + `tierRams`).
 * Minecraft uses `api/scripts/seed-minecraft-variant-plans.js` (Paper min 2GB).
 */
export const GAME_MIN_RAM_GB: Record<string, number> = {
  minecraft: 2,
  rust: 2,
  ark: 6,
  'ark-asa': 8,
  'counter-strike': 2,
  terraria: 2,
  factorio: 2,
  palworld: 4,
  mindustry: 2,
  rimworld: 4,
  'vintage-story': 4,
  teeworlds: 2,
  'among-us': 4,
  veloren: 4,
  enshrouded: 6,
};

export type CatalogStarterBundle = {
  defaultPlanId: string;
  plans: CatalogPlanOption[];
  gameTypes: CatalogGameTypeOption[];
};

/**
 * Configure-page fallbacks when billing API has no plans yet.
 * IDs, RAM, vCPU, disk, and monthly price match `seed-game-variant-plans.js` (+ seed SSD rules for ARK).
 */
export const CATALOG_STARTERS: Record<string, CatalogStarterBundle> = {
  rust: {
    defaultPlanId: 'rust-standard-2gb',
    plans: [
      {
        id: 'rust-standard-2gb',
        name: '2 GB',
        ram: '2 GB',
        ram_gb: 2,
        cpu: '1 vCPU',
        disk: '20 GB NVMe',
        price: 9.99,
        players: '2-50',
        description: '',
        recommended: true,
        serverType: 'rust-standard',
      },
    ],
    gameTypes: [{ id: 'rust-standard', name: 'Rust', description: 'From $9.99/mo' }],
  },
  ark: {
    defaultPlanId: 'ark-standard-6gb',
    plans: [
      {
        id: 'ark-standard-6gb',
        name: '6 GB',
        ram: '6 GB',
        ram_gb: 6,
        cpu: '2 vCPU',
        disk: '60 GB NVMe',
        price: 14.99,
        players: '8-70',
        description: '',
        recommended: true,
        serverType: 'ark-standard',
      },
    ],
    gameTypes: [{ id: 'ark-standard', name: 'ARK: Survival Evolved', description: 'From $14.99/mo' }],
  },
  'ark-asa': {
    defaultPlanId: 'ark-asa-standard-8gb',
    plans: [
      {
        id: 'ark-asa-standard-8gb',
        name: '8 GB',
        ram: '8 GB',
        ram_gb: 8,
        cpu: '3 vCPU',
        disk: '80 GB NVMe',
        price: 32.99,
        players: '8-32',
        description: '',
        recommended: true,
        serverType: 'ark-asa-standard',
      },
    ],
    gameTypes: [
      {
        id: 'ark-asa-standard',
        name: 'ARK: Survival Ascended',
        description: 'From $32.99/mo · UE5 · 8GB+ plans',
      },
    ],
  },
  'counter-strike': {
    defaultPlanId: 'counter-strike-standard-2gb',
    plans: [
      {
        id: 'counter-strike-standard-2gb',
        name: '2 GB',
        ram: '2 GB',
        ram_gb: 2,
        cpu: '1 vCPU',
        disk: '20 GB NVMe',
        price: 7.99,
        players: '5-10',
        description: '',
        recommended: true,
        serverType: 'counter-strike-standard',
      },
    ],
    gameTypes: [
      {
        id: 'counter-strike-standard',
        name: 'Counter-Strike: Global Offensive',
        description: 'From $7.99/mo',
      },
    ],
  },
  terraria: {
    defaultPlanId: 'terraria-vanilla-2gb',
    plans: [
      {
        id: 'terraria-vanilla-2gb',
        name: '2 GB',
        ram: '2 GB',
        ram_gb: 2,
        cpu: '1 vCPU',
        disk: '20 GB NVMe',
        price: 6.99,
        players: '2-8',
        description: '',
        recommended: true,
        serverType: 'terraria-vanilla',
      },
      {
        id: 'terraria-tmodloader-4gb',
        name: '4 GB',
        ram: '4 GB',
        ram_gb: 4,
        cpu: '1 vCPU',
        disk: '40 GB NVMe',
        price: 11.99,
        players: '4-16',
        description: '',
        recommended: false,
        serverType: 'terraria-tmodloader',
      },
    ],
    gameTypes: [
      { id: 'terraria-vanilla', name: 'Terraria Vanilla', description: 'From $6.99/mo' },
      { id: 'terraria-tmodloader', name: 'Terraria tModLoader', description: 'From $11.99/mo' },
    ],
  },
  factorio: {
    defaultPlanId: 'factorio-standard-2gb',
    plans: [
      {
        id: 'factorio-standard-2gb',
        name: '2 GB',
        ram: '2 GB',
        ram_gb: 2,
        cpu: '1 vCPU',
        disk: '20 GB NVMe',
        price: 7.99,
        players: '2-8',
        description: '',
        recommended: true,
        serverType: 'factorio-standard',
      },
    ],
    gameTypes: [{ id: 'factorio-standard', name: 'Factorio', description: 'From $7.99/mo' }],
  },
  palworld: {
    defaultPlanId: 'palworld-standard-4gb',
    plans: [
      {
        id: 'palworld-standard-4gb',
        name: '4 GB',
        ram: '4 GB',
        ram_gb: 4,
        cpu: '2 vCPU',
        disk: '40 GB NVMe',
        price: 14.99,
        players: '2-8',
        description: '',
        recommended: true,
        serverType: 'palworld-standard',
      },
    ],
    gameTypes: [{ id: 'palworld-standard', name: 'Palworld', description: 'From $14.99/mo' }],
  },
  mindustry: {
    defaultPlanId: 'mindustry-standard-2gb',
    plans: [
      {
        id: 'mindustry-standard-2gb',
        name: '2 GB',
        ram: '2 GB',
        ram_gb: 2,
        cpu: '1 vCPU',
        disk: '20 GB NVMe',
        price: 5.99,
        players: '2-16',
        description: '',
        recommended: true,
        serverType: 'mindustry-standard',
      },
    ],
    gameTypes: [{ id: 'mindustry-standard', name: 'Mindustry', description: 'From $5.99/mo' }],
  },
  rimworld: {
    defaultPlanId: 'rimworld-standard-4gb',
    plans: [
      {
        id: 'rimworld-standard-4gb',
        name: '4 GB',
        ram: '4 GB',
        ram_gb: 4,
        cpu: '2 vCPU',
        disk: '40 GB NVMe',
        price: 12.99,
        players: '4-16',
        description: '',
        recommended: true,
        serverType: 'rimworld-standard',
      },
    ],
    gameTypes: [{ id: 'rimworld-standard', name: 'Rimworld', description: 'From $12.99/mo' }],
  },
  'vintage-story': {
    defaultPlanId: 'vintage-story-standard-4gb',
    plans: [
      {
        id: 'vintage-story-standard-4gb',
        name: '4 GB',
        ram: '4 GB',
        ram_gb: 4,
        cpu: '2 vCPU',
        disk: '40 GB NVMe',
        price: 11.99,
        players: '4-16',
        description: '',
        recommended: true,
        serverType: 'vintage-story-standard',
      },
    ],
    gameTypes: [{ id: 'vintage-story-standard', name: 'Vintage Story', description: 'From $11.99/mo' }],
  },
  teeworlds: {
    defaultPlanId: 'teeworlds-standard-2gb',
    plans: [
      {
        id: 'teeworlds-standard-2gb',
        name: '2 GB',
        ram: '2 GB',
        ram_gb: 2,
        cpu: '1 vCPU',
        disk: '20 GB NVMe',
        price: 4.99,
        players: '2-8',
        description: '',
        recommended: true,
        serverType: 'teeworlds-standard',
      },
    ],
    gameTypes: [{ id: 'teeworlds-standard', name: 'Teeworlds', description: 'From $4.99/mo' }],
  },
  'among-us': {
    defaultPlanId: 'among-us-standard-4gb',
    plans: [
      {
        id: 'among-us-standard-4gb',
        name: '4 GB',
        ram: '4 GB',
        ram_gb: 4,
        cpu: '1 vCPU',
        disk: '40 GB NVMe',
        price: 6.99,
        players: '4-16',
        description: '',
        recommended: true,
        serverType: 'among-us-standard',
      },
    ],
    gameTypes: [
      {
        id: 'among-us-standard',
        name: 'Among Us (Impostor)',
        description: 'From $6.99/mo · dedicated Impostor server',
      },
    ],
  },
  veloren: {
    defaultPlanId: 'veloren-standard-4gb',
    plans: [
      {
        id: 'veloren-standard-4gb',
        name: '4 GB',
        ram: '4 GB',
        ram_gb: 4,
        cpu: '2 vCPU',
        disk: '40 GB NVMe',
        price: 10.99,
        players: '4-16',
        description: '',
        recommended: true,
        serverType: 'veloren-standard',
      },
    ],
    gameTypes: [{ id: 'veloren-standard', name: 'Veloren', description: 'From $10.99/mo' }],
  },
  enshrouded: {
    defaultPlanId: 'enshrouded-standard-6gb',
    plans: [
      {
        id: 'enshrouded-standard-6gb',
        name: '6 GB',
        ram: '6 GB',
        ram_gb: 6,
        cpu: '2 vCPU',
        disk: '60 GB NVMe',
        price: 14.99,
        players: '6-16',
        description: '',
        recommended: true,
        serverType: 'enshrouded-standard',
      },
    ],
    gameTypes: [{ id: 'enshrouded-standard', name: 'Enshrouded', description: 'From $14.99/mo' }],
  },
};

/** Lowest-tier monthly USD from catalog starters (Deploy fallback when plans API is empty). */
export function starterMonthlyPriceUsd(game: string): number | null {
  const bundle = (CATALOG_STARTERS as Record<string, CatalogStarterBundle | undefined>)[game];
  const p = bundle?.plans?.[0]?.price;
  return typeof p === 'number' && Number.isFinite(p) ? p : null;
}
