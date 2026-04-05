/**
 * JSON-safe provision plan for BullMQ (no RegExp / non-serializable fields).
 * @param {object} plan — return value of buildProvisionPlan()
 */
export function serializeProvisionPlanForJob(plan) {
  const trafficClass = plan.policy?.capabilityClass || 'A';
  const primary = plan.primaryAllocation;
  const secondary = plan.extraAllocations?.[0] ?? null;
  return {
    gameKey: plan.gameKey,
    eggId: plan.eggId,
    trafficClass,
    primaryAllocation: primary
      ? { id: primary.id ?? null, port: primary.port != null ? Number(primary.port) : null }
      : null,
    secondaryAllocation: secondary
      ? { id: secondary.id ?? null, port: secondary.port != null ? Number(secondary.port) : null }
      : null,
    httpsProxyRegistration: plan.httpsProxyRegistration
      ? {
          hostname: plan.httpsProxyRegistration.hostname,
          upstreamHost: plan.httpsProxyRegistration.upstreamHost,
          upstreamPort: plan.httpsProxyRegistration.upstreamPort,
        }
      : null,
  };
}
