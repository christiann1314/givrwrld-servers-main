import { normalizeGameKey } from './normalizeGameKey.js';
import { buildProvisionPlan } from './buildProvisionPlan.js';

/**
 * Rebuild allocation-shaped rows from persisted order columns (post-create).
 * @param {Record<string, any>} order
 */
export function allocationsFromOrderRow(order) {
  const primary = {
    id: Number(order.ptero_primary_allocation_id) || 0,
    port: order.ptero_primary_port != null && Number.isFinite(Number(order.ptero_primary_port))
      ? Number(order.ptero_primary_port)
      : null,
    ip: '',
    alias: '',
  };
  let extras = [];
  try {
    const raw =
      typeof order.ptero_extra_ports_json === 'string'
        ? JSON.parse(order.ptero_extra_ports_json)
        : order.ptero_extra_ports_json;
    if (Array.isArray(raw)) {
      extras = raw.map((e) => ({
        id: Number(e.allocation_id) || 0,
        port: e.port != null && Number.isFinite(Number(e.port)) ? Number(e.port) : null,
        ip: '',
        alias: '',
      }));
    }
  } catch {
    /* ignore */
  }
  return [primary, ...extras];
}

/**
 * JSON-serializable job payload for BullMQ (no RegExp).
 * @param {Record<string, any>} order — row with plan join (game, ptero_egg_id, ports)
 */
export function buildProvisionJobPayload(order) {
  const gameKey = normalizeGameKey(order.game);
  const allocations = allocationsFromOrderRow(order);
  const plan = buildProvisionPlan({ order, gameKey, allocations });
  const patterns = plan.policy?.startup?.successLogPatterns || [];
  return {
    orderId: order.id,
    pteroServerId: order.ptero_server_id,
    gameKey: plan.gameKey,
    eggId: plan.eggId,
    trafficClass: plan.policy?.capabilityClass || 'A',
    primaryPort:
      plan.primaryAllocation?.port != null && Number.isFinite(Number(plan.primaryAllocation.port))
        ? Number(plan.primaryAllocation.port)
        : order.ptero_primary_port != null
          ? Number(order.ptero_primary_port)
          : null,
    hostname: plan.proxyHostname || null,
    httpsProxyRegistration: plan.httpsProxyRegistration,
    successLogPatternSources: patterns.map((re) => re.source),
    mustContain: plan.policy?.startup?.mustContain || [],
  };
}
