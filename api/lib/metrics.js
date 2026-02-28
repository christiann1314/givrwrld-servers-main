let ordersCreatedCount = 0;
let provisionSuccessCount = 0;
let provisionFailCount = 0;
let provisionDurationTotalMs = 0;
let provisionDurationSamples = 0;

const processStartTime = Date.now();

export function recordOrderCreated() {
  ordersCreatedCount += 1;
}

export function recordProvisionSuccess(durationMs = 0) {
  provisionSuccessCount += 1;
  const d = Number(durationMs);
  if (Number.isFinite(d) && d >= 0) {
    provisionDurationTotalMs += d;
    provisionDurationSamples += 1;
  }
}

export function recordProvisionFailure(durationMs = 0) {
  provisionFailCount += 1;
  const d = Number(durationMs);
  if (Number.isFinite(d) && d >= 0) {
    provisionDurationTotalMs += d;
    provisionDurationSamples += 1;
  }
}

export function getMetricsSnapshot() {
  const totalProvisionAttempts = provisionSuccessCount + provisionFailCount;
  const avgMs =
    provisionDurationSamples > 0
      ? provisionDurationTotalMs / provisionDurationSamples
      : 0;
  return {
    orders_created_count: ordersCreatedCount,
    provision_success_count: provisionSuccessCount,
    provision_fail_count: provisionFailCount,
    provision_attempt_count: totalProvisionAttempts,
    provisioning_duration_ms_avg: Math.round(avgMs),
    provisioning_duration_samples: provisionDurationSamples,
    process_uptime_seconds: Math.floor((Date.now() - processStartTime) / 1000),
  };
}

