import pool from '../config/database.js';
import { transitionToFailed } from '../services/OrderService.js';

/**
 * Find orders in an inconsistent "provisioned" state:
 *  - status = provisioned
 *  - no ptero_server_id
 *  - item_type = game
 *
 * These likely represent failed or partially-rolled-back provisions and should
 * be marked as failed so they can be inspected or retried safely via other flows.
 */
export async function findInconsistentOrders() {
  const [rows] = await pool.execute(
    `SELECT id, status
     FROM orders
     WHERE item_type = 'game'
       AND status = 'provisioned'
       AND (ptero_server_id IS NULL OR ptero_server_id = 0)
     ORDER BY created_at ASC
     LIMIT 200`,
  );
  return rows;
}

/**
 * Reconcile orders with inconsistent state.
 * Currently:
 *  - marks "provisioned but no server id" orders as failed with a clear error message.
 *
 * Idempotent: once an order is transitioned to failed, it will no longer match
 * the selection criteria on subsequent runs.
 */
export async function runReconcileOrdersPass(log = console) {
  const rows = await findInconsistentOrders();
  if (!rows.length) {
    return 0;
  }

  for (const row of rows) {
    const orderId = row.id;
    try {
      await transitionToFailed(orderId, 'ReconcileOrders: provisioned without ptero_server_id');
      log.warn?.(
        { order_id: orderId },
        'ReconcileOrders: marked failed (missing ptero_server_id)',
      );
    } catch (err) {
      log.error?.(
        { order_id: orderId, err: err?.message || String(err) },
        'ReconcileOrders: failed to mark order',
      );
    }
  }

  return rows.length;
}

