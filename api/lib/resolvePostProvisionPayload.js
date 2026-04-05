import { buildProvisionJobPayload } from './buildProvisionJobPayload.js';
import { getEggRuntimePolicy } from '../config/gameRuntimePolicy.js';

/**
 * Prefer job snapshot from provision time; otherwise rebuild from DB (older jobs).
 *
 * @param {Record<string, any>} order
 * @param {{ orderId?: string, serverId?: number, provisionPlan?: Record<string, any> }} jobData
 */
export function resolvePostProvisionPayload(order, jobData) {
  const snap = jobData?.provisionPlan;
  if (!snap || typeof snap !== 'object') {
    return buildProvisionJobPayload(order);
  }
  const policy = getEggRuntimePolicy(order.ptero_egg_id);
  const patterns = policy?.startup?.successLogPatterns || [];
  const primaryPort =
    snap.primaryAllocation?.port != null && Number.isFinite(Number(snap.primaryAllocation.port))
      ? Number(snap.primaryAllocation.port)
      : order.ptero_primary_port != null
        ? Number(order.ptero_primary_port)
        : null;
  return {
    orderId: order.id,
    pteroServerId:
      jobData?.serverId != null && Number.isFinite(Number(jobData.serverId))
        ? Number(jobData.serverId)
        : order.ptero_server_id,
    gameKey: snap.gameKey,
    eggId: snap.eggId ?? order.ptero_egg_id,
    trafficClass: snap.trafficClass || 'A',
    primaryPort,
    hostname: snap.httpsProxyRegistration?.hostname ?? null,
    httpsProxyRegistration: snap.httpsProxyRegistration,
    successLogPatternSources: patterns.map((re) => re.source),
    mustContain: policy?.startup?.mustContain || [],
  };
}
