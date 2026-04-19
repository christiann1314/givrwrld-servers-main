import { buildGameBrandHostname } from './hostname.js';

/**
 * Hostnames to try for Class A/B TCP reachability (game already listening on allocation port).
 * Order: explicit env (node / public IP) first, then branded join hint hostname last.
 *
 * Env (any non-empty, first wins among probe-specific):
 * - POST_PROVISION_TCP_PROBE_HOST — single host (e.g. Wings node FQDN)
 * - POST_PROVISION_TCP_PROBE_HOSTS — comma-separated list, tried in order before brand
 * - PTERO_EXTERNAL_GAME_HOST, GAME_SERVER_PUBLIC_HOST — common game-facing host overrides
 *
 * @param {{ orderId: string, gameKey: string }} input
 * @returns {string[]}
 */
export function resolveTcpProbeHosts({ orderId, gameKey }) {
  const brand = buildGameBrandHostname({ gameKey, orderId });
  const out = [];

  const multi = String(process.env.POST_PROVISION_TCP_PROBE_HOSTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const h of multi) {
    if (!out.includes(h)) out.push(h);
  }

  const singles = [
    process.env.POST_PROVISION_TCP_PROBE_HOST,
    process.env.PTERO_EXTERNAL_GAME_HOST,
    process.env.GAME_SERVER_PUBLIC_HOST,
  ];
  for (const raw of singles) {
    const h = String(raw || '').trim();
    if (h && !out.includes(h)) out.push(h);
  }

  if (!out.includes(brand)) out.push(brand);
  return out;
}
