/**
 * Pterodactyl allocation policy: reserved panel ports are the source of truth for game/query/rcon/etc.
 * Egg IDs must match plans / panel (see sql/migrations sync_plans_to_panel_egg_ids).
 */

export function getAllocationCountForEgg(eggId) {
  const n = Number(eggId);
  if (n === 65) return 3;
  if (n === 66) return 3;
  if (n === 70) return 2;
  if (n === 75) return 2;
  return 1;
}

/**
 * Prefer N consecutive ports; fall back to first N free (sorted by port).
 * @param {{ id: number, port: number }[]} freeSorted
 * @param {number} count
 */
export function rankAllocationGroups(freeSorted, count) {
  if (!Array.isArray(freeSorted) || count < 1) return [];
  if (freeSorted.length < count) return [];

  if (count === 1) {
    return freeSorted.map((a) => [a]);
  }

  const contiguous = [];
  for (let i = 0; i <= freeSorted.length - count; i += 1) {
    const slice = freeSorted.slice(i, i + count);
    let ok = true;
    for (let j = 1; j < slice.length; j += 1) {
      if (slice[j].port !== slice[j - 1].port + 1) {
        ok = false;
        break;
      }
    }
    if (ok) contiguous.push(slice);
  }
  if (contiguous.length > 0) return contiguous;
  return [freeSorted.slice(0, count)];
}

/**
 * @param {number} eggId
 * @param {{ id: number, port: number | null }[]} selectedAllocs
 * @param {Record<string, string>} environment
 */
export function applyMultiAllocationEnv(eggId, selectedAllocs, environment) {
  const ports = selectedAllocs
    .map((a) => a.port)
    .filter((p) => p != null && Number.isFinite(Number(p)))
    .map((p) => Number(p));
  const n = Number(eggId);

  if (n === 65 && ports.length >= 3) {
    environment.QUERY_PORT = String(ports[1]);
    environment.RCON_PORT = String(ports[2]);
    environment.APP_PORT = String(ports[0]);
    return;
  }
  if (n === 66 && ports.length >= 3) {
    environment.QUERY_PORT = String(ports[1]);
    environment.RCON_PORT = String(ports[2]);
    return;
  }
  if (n === 70 && ports.length >= 2) {
    environment.RCON_PORT = String(ports[1]);
    return;
  }
  if (n === 75 && ports.length >= 2) {
    environment.METRICS_PORT = String(ports[1]);
    return;
  }
}

/**
 * @param {Record<string, string>} environment
 * @param {number} primaryPort
 */
export function syncPrimaryPortEnvVars(environment, primaryPort) {
  if (!Number.isFinite(primaryPort) || primaryPort <= 0) return;
  const s = String(Math.floor(primaryPort));
  if (Object.prototype.hasOwnProperty.call(environment, 'SERVER_PORT')) {
    environment.SERVER_PORT = s;
  }
  if (Object.prototype.hasOwnProperty.call(environment, 'PORT')) {
    environment.PORT = s;
  }
}
