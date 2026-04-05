/**
 * Pterodactyl allocation policy: reserved panel ports are the source of truth for game/query/rcon/etc.
 * Per-egg counts: api/config/gameRuntimePolicy.js (EGG_RUNTIME_POLICY).
 */

import { getAllocationsNeededForEgg } from './gameRuntimePolicy.js';

export function getAllocationCountForEgg(eggId) {
  return getAllocationsNeededForEgg(eggId);
}

/**
 * Build Pterodactyl Application API `allocation` object for POST /servers.
 * Omits `additional` when there is only one port (single-allocation games).
 *
 * @param {{ id?: number | null }[]} allocationGroup — ordered: primary first, then extras
 * @param {number} allocRequired — from runtime policy (e.g. Among Us = 2)
 * @returns {{ default: number, additional?: number[] }}
 */
export function buildPanelAllocationPayload(allocationGroup, allocRequired) {
  const n = Math.max(1, Number(allocRequired) || 1);
  const group = Array.isArray(allocationGroup) ? allocationGroup.slice(0, n) : [];
  const ids = group
    .map((a) => Number(a?.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length < n) {
    throw new Error(
      `Insufficient allocations for Panel create: policy requires ${n}, found ${ids.length} valid allocation id(s) (group length ${group.length})`,
    );
  }
  const primaryAllocationId = ids[0];
  const extraAllocationIds = ids.slice(1);
  if (extraAllocationIds.length > 0) {
    return { default: primaryAllocationId, additional: extraAllocationIds };
  }
  return { default: primaryAllocationId };
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
