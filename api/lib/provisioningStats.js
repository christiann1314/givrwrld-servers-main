/**
 * Public provisioning stats: aggregates only. No PII, no order_id/user_id.
 * Do not expose getMetricsSnapshot() or raw in-memory metrics.
 */
import pool from '../config/database.js';

/**
 * Returns only: median_provisioning_seconds, provision_success_rate_24h, provision_count_24h.
 * Uses dedicated read-only queries on orders; response must contain no identifiers.
 */
const TWENTY_FOUR_HOURS_AGO = 'DATE_SUB(NOW(), INTERVAL 24 HOUR)';

export async function getPublicProvisioningStats() {
  const [provisionedRows] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE status = 'provisioned' AND updated_at >= ${TWENTY_FOUR_HOURS_AGO}`
  );
  const provisionCount24h = Number(provisionedRows[0]?.cnt ?? 0) || 0;

  const [failedRows] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE status IN ('error', 'failed') AND updated_at >= ${TWENTY_FOUR_HOURS_AGO}`
  );
  const failedCount24h = Number(failedRows[0]?.cnt ?? 0) || 0;
  const attempts24h = provisionCount24h + failedCount24h;
  const provisionSuccessRate24h =
    attempts24h > 0 ? Math.round((provisionCount24h / attempts24h) * 1000) / 1000 : 0;

  const [durationRows] = await pool.execute(
    `SELECT TIMESTAMPDIFF(SECOND, created_at, updated_at) AS sec
     FROM orders
     WHERE status = 'provisioned' AND updated_at >= ${TWENTY_FOUR_HOURS_AGO}`
  );
  const seconds = durationRows
    .map((r) => Number(r?.sec))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const medianProvisioningSeconds =
    seconds.length > 0 ? computeMedian(seconds) : 0;

  return {
    median_provisioning_seconds: medianProvisioningSeconds,
    provision_success_rate_24h: provisionSuccessRate24h,
    provision_count_24h: provisionCount24h,
  };
}

function computeMedian(sortedArr) {
  const arr = [...sortedArr].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 0) {
    return Math.round((arr[mid - 1] + arr[mid]) / 2);
  }
  return Math.round(arr[mid]);
}
