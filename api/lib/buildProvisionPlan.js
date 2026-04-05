import { buildHttpsProxyHostname, getEggRuntimePolicy } from '../config/gameRuntimePolicy.js';

/**
 * Turn a concrete allocation set + order into a provision plan for validation and post-steps.
 *
 * @param {{
 *   order: Record<string, any>,
 *   gameKey: string,
 *   allocations: { id: number, port?: number | null, ip?: string, alias?: string }[],
 * }} input
 */
export function buildProvisionPlan({ order, gameKey, allocations }) {
  const policy = getEggRuntimePolicy(order.ptero_egg_id);
  const primary = allocations[0];
  const extra = allocations.slice(1);

  if (!policy) {
    return {
      gameKey,
      eggId: order.ptero_egg_id,
      policy: null,
      allocations,
      primaryAllocation: primary,
      extraAllocations: extra,
      proxyHostname: null,
      allocationsNeeded: allocations.length,
      httpsProxyRegistration: null,
    };
  }

  const proxyHostname = policy.https?.required ? buildHttpsProxyHostname(order, policy) : null;
  const httpAlloc = policy.https?.required ? extra[0] : null;
  const upstreamPort =
    httpAlloc?.port != null && Number.isFinite(Number(httpAlloc.port)) ? Number(httpAlloc.port) : null;

  return {
    gameKey,
    eggId: order.ptero_egg_id,
    policy,
    allocations,
    primaryAllocation: primary,
    extraAllocations: extra,
    proxyHostname,
    allocationsNeeded: policy.allocationsNeeded,
    httpsProxyRegistration:
      policy.https?.required && proxyHostname && upstreamPort != null
        ? {
            hostname: proxyHostname,
            upstreamHost: '127.0.0.1',
            upstreamPort,
            note:
              'Apply on the game node (nginx + ACME). API does not write /etc from here; use ops automation or SSH job.',
          }
        : null,
  };
}
