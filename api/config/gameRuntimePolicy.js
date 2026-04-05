/**
 * Per-egg runtime capabilities — source of truth for allocation counts, TLS/proxy needs, and image checks.
 *
 * Cloudflare (ops): Most game protocols are **not** HTTP. Orange-cloud (proxied) DNS only fronts HTTP(S).
 * Point **game / Wings / raw port** hostnames at node IPs with **DNS only** (grey cloud). Use proxied
 * records only for panel, storefront API, and explicit HTTPS vhosts (e.g. Among Us Impostor HTTP API)
 * with SSL mode **Full (strict)** and valid origin certs. Automate Class C hostnames with the
 * Cloudflare API (`proxied: false` for `node.*` game ports; `proxied: true` optional for `among-http-*`
 * only if you terminate TLS at Cloudflare or use origin certs).
 *
 * Egg IDs: sql/migrations/20260327120000_sync_plans_to_panel_egg_ids.sql
 */

/** Public suffix for auto-generated Impostor HTTPS hostnames (override in env for staging). */
export const PROXY_PUBLIC_DOMAIN =
  process.env.GIVRWRLD_PROXY_PUBLIC_DOMAIN || process.env.PROXY_PUBLIC_DOMAIN || 'givrwrldservers.com';

/**
 * @typedef {'A' | 'B' | 'C'} CapabilityClass
 * — A: single port, no app-layer HTTPS requirement
 * — B: multi-port, no Impostor-style HTTPS API
 * — C: needs reverse proxy + DNS + cert automation for HTTPS endpoint
 */

/**
 * @typedef {{
 *   gameKey: string,
 *   capabilityClass: CapabilityClass,
 *   allocationsNeeded: number,
 *   allocationStrategy: 'single' | 'contiguous' | 'any',
 *   network: Record<string, { protocol: string, usesPrimaryAllocation?: boolean, usesExtraAllocationIndex?: number }>,
 *   requiredDockerImage: string | null,
 *   https: { required: boolean, proxyTarget?: string, publicHostnamePattern?: string },
 *   startup: { mustContain?: string[], successLogPatterns: RegExp[] },
 * }} EggRuntimePolicy
 */

/** @type {Record<number, EggRuntimePolicy>} */
export const EGG_RUNTIME_POLICY = {
  60: {
    gameKey: 'minecraft',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Done \(.*\)! For help, type help/i] },
  },
  61: {
    gameKey: 'minecraft',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Done \(.*\)! For help, type help/i] },
  },
  62: {
    gameKey: 'minecraft',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Done \(.*\)! For help, type help/i] },
  },
  63: {
    gameKey: 'minecraft',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Done \(.*\)! For help, type help/i] },
  },
  64: {
    gameKey: 'minecraft',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Done \(.*\)! For help, type help/i] },
  },
  65: {
    gameKey: 'rust',
    capabilityClass: 'B',
    allocationsNeeded: 3,
    allocationStrategy: 'contiguous',
    network: {
      game: { protocol: 'udp', usesPrimaryAllocation: true },
      query: { protocol: 'udp', usesExtraAllocationIndex: 1 },
      rcon: { protocol: 'tcp', usesExtraAllocationIndex: 2 },
    },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Server startup complete/i, /SteamServer Connected/i] },
  },
  66: {
    gameKey: 'ark',
    capabilityClass: 'B',
    allocationsNeeded: 3,
    allocationStrategy: 'contiguous',
    network: {
      game: { protocol: 'udp', usesPrimaryAllocation: true },
      query: { protocol: 'udp', usesExtraAllocationIndex: 1 },
      rcon: { protocol: 'tcp', usesExtraAllocationIndex: 2 },
    },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Commandline:/i] },
  },
  67: {
    gameKey: 'terraria',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { mustContain: ['TerrariaServer.bin.x86_64'], successLogPatterns: [/Listening on port/i] },
  },
  68: {
    gameKey: 'terraria',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: 'ghcr.io/parkervcp/yolks:dotnet_6',
    https: { required: false },
    startup: { mustContain: ['tModLoaderServer'], successLogPatterns: [/Listening on port/i] },
  },
  69: {
    gameKey: 'factorio',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'udp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Hosting game at IP/i] },
  },
  70: {
    gameKey: 'palworld',
    capabilityClass: 'B',
    allocationsNeeded: 2,
    allocationStrategy: 'contiguous',
    network: {
      game: { protocol: 'udp', usesPrimaryAllocation: true },
      rcon: { protocol: 'tcp', usesExtraAllocationIndex: 1 },
    },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Running Palworld server/i, /Steam API initialized/i] },
  },
  71: {
    gameKey: 'mindustry',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [] },
  },
  72: {
    gameKey: 'vintage-story',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [] },
  },
  73: {
    gameKey: 'teeworlds',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'udp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [] },
  },
  74: {
    gameKey: 'among-us',
    capabilityClass: 'C',
    allocationsNeeded: 2,
    allocationStrategy: 'any',
    network: {
      game: { protocol: 'udp', usesPrimaryAllocation: true },
      http: { protocol: 'tcp', usesExtraAllocationIndex: 1 },
    },
    requiredDockerImage: 'ghcr.io/parkervcp/yolks:dotnet_8',
    https: {
      required: true,
      proxyTarget: 'http',
      publicHostnamePattern: `among-http-{serverIdentifier}.${PROXY_PUBLIC_DOMAIN}`,
    },
    startup: {
      mustContain: ['Impostor.Server'],
      successLogPatterns: [/Matchmaker is listening/i, /Application started/i],
    },
  },
  75: {
    gameKey: 'veloren',
    capabilityClass: 'B',
    allocationsNeeded: 2,
    allocationStrategy: 'contiguous',
    network: {
      game: { protocol: 'udp', usesPrimaryAllocation: true },
      metrics: { protocol: 'tcp', usesExtraAllocationIndex: 1 },
    },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [/Server is now running/i] },
  },
  76: {
    gameKey: 'enshrouded',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'udp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [] },
  },
  77: {
    gameKey: 'rimworld',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [] },
  },
  78: {
    gameKey: 'rimworld',
    capabilityClass: 'A',
    allocationsNeeded: 1,
    allocationStrategy: 'single',
    network: { game: { protocol: 'tcp', usesPrimaryAllocation: true } },
    requiredDockerImage: null,
    https: { required: false },
    startup: { successLogPatterns: [] },
  },
};

/**
 * @param {number} eggId
 * @returns {number}
 */
export function getAllocationsNeededForEgg(eggId) {
  const n = Number(eggId);
  const p = EGG_RUNTIME_POLICY[n];
  if (p?.allocationsNeeded != null && Number.isFinite(p.allocationsNeeded) && p.allocationsNeeded >= 1) {
    return p.allocationsNeeded;
  }
  return 1;
}

/**
 * @param {number} eggId
 * @returns {EggRuntimePolicy | null}
 */
export function getEggRuntimePolicy(eggId) {
  const n = Number(eggId);
  if (!Number.isFinite(n) || n <= 0) return null;
  return EGG_RUNTIME_POLICY[n] ?? null;
}

/**
 * DNS-safe token for proxy hostnames (order UUID, no hyphens).
 * @param {Record<string, unknown>} order
 */
export function buildProxyServerIdentifier(order) {
  return String(order?.id || '')
    .replace(/-/g, '')
    .slice(0, 16);
}

/**
 * @param {Record<string, unknown>} order
 * @param {EggRuntimePolicy} policy
 */
export function buildHttpsProxyHostname(order, policy) {
  const pattern = policy?.https?.publicHostnamePattern;
  if (!pattern) return null;
  const id = buildProxyServerIdentifier(order);
  if (!id) return null;
  return pattern.replace('{serverIdentifier}', id);
}
