/**
 * @param {Record<string, any>} plan
 */
export function validateProvisionPlan(plan) {
  if (!plan?.policy) {
    return true;
  }

  const { policy, gameKey, eggId } = plan;

  if (!plan.primaryAllocation) {
    throw new Error(`No primary allocation for ${gameKey} (egg ${eggId})`);
  }

  if (plan.allocations.length !== policy.allocationsNeeded) {
    throw new Error(
      `Allocation count mismatch for ${gameKey} (egg ${eggId}): need ${policy.allocationsNeeded}, got ${plan.allocations.length}`,
    );
  }

  if (policy.https?.required) {
    if (!plan.proxyHostname) {
      throw new Error(`HTTPS proxy hostname missing for ${gameKey} (egg ${eggId}); check order id and PROXY_PUBLIC_DOMAIN`);
    }
    if (!plan.httpsProxyRegistration?.upstreamPort) {
      throw new Error(
        `HTTPS proxy upstream port missing for ${gameKey} (egg ${eggId}); second allocation must have a port`,
      );
    }
  }

  return true;
}
