/**
 * Reconcile job: find orders in (paid, provisioning) older than 10 minutes
 * with no ptero_server_id or last_attempt_at outside backoff window, and retry provisioning.
 * Run every 2 minutes via node-cron (no Redis in Phase 1).
 */
import pool from '../config/database.js';
import { getOrder, shouldRetryProvision } from '../services/OrderService.js';
import { enqueueProvisionJob } from '../queues/provisionQueue.js';

const STUCK_AGE_MINUTES = 10;

function backoffMinutesByAttempt(attempt) {
  return Math.min(30, 5 * Math.pow(2, Math.min(attempt, 4)));
}

/**
 * Find orders eligible for retry: status in (paid, provisioning), no ptero_server_id,
 * created or last_attempt older than 10 min, and backoff elapsed.
 * Returns [] if Phase 1 migration has not been run (missing provision_attempt_count column).
 */
export async function findOrdersToReconcile() {
  let rows;
  try {
    const [r] = await pool.execute(
      `SELECT id, status, provision_attempt_count, last_provision_attempt_at, created_at
       FROM orders
       WHERE status IN ('paid', 'provisioning', 'error', 'failed')
         AND (ptero_server_id IS NULL OR ptero_server_id = 0)
         AND item_type = 'game'
       ORDER BY created_at ASC`
    );
    rows = r;
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054 || err.message?.includes('provision_attempt')) {
      return [];
    }
    throw err;
  }
  const now = Date.now();
  const stuckThreshold = now - STUCK_AGE_MINUTES * 60 * 1000;
  return rows.filter((o) => {
    const created = new Date(o.created_at).getTime();
    const lastAttempt = o.last_provision_attempt_at ? new Date(o.last_provision_attempt_at).getTime() : 0;
    const effective = lastAttempt || created;
    if (effective > stuckThreshold) return false;
    return shouldRetryProvision(o, backoffMinutesByAttempt);
  });
}

/**
 * Run one reconcile pass (attempt provisioning for each eligible order).
 */
export async function runReconcilePass(log = console) {
  const orders = await findOrdersToReconcile();
  for (const order of orders) {
    try {
      await enqueueProvisionJob(order.id, 'reconcile');
      log.info?.({ order_id: order.id }, 'Reconcile provision job enqueued');
    } catch (err) {
      log.error?.({ order_id: order.id, err: err?.message }, 'Reconcile provision enqueue failed');
    }
  }
  return orders.length;
}
