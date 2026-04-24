#!/usr/bin/env node
/**
 * Clear last provision error and enqueue a new provisioning job for a failed game order.
 * claimOrderForProvisioning accepts paid | error | failed → provisioning.
 *
 * Usage:
 *   node api/scripts/requeue-failed-game-order.js <order_uuid>
 */
import '../config/loadEnv.js';
import pool from '../config/database.js';
import { enqueueProvisionJob, getProvisionQueue } from '../queues/provisionQueue.js';

const orderId = process.argv[2];
if (!orderId) {
  console.error('Usage: node api/scripts/requeue-failed-game-order.js <order_id>');
  process.exit(1);
}

const [rows] = await pool.execute(
  `SELECT id, status, item_type FROM orders WHERE id = ? LIMIT 1`,
  [orderId],
);
const o = rows[0];
if (!o) {
  console.error('Order not found:', orderId);
  process.exit(1);
}
if (String(o.item_type) !== 'game') {
  console.error('Order is not a game order:', orderId);
  process.exit(1);
}
const st = String(o.status || '').toLowerCase();
if (!['failed', 'error', 'paid', 'provisioning'].includes(st)) {
  console.error('Unexpected status (expected failed/error/paid/provisioning):', st);
  process.exit(1);
}

await pool.execute(
  `UPDATE orders
     SET last_provision_error = NULL,
         error_message = NULL,
         updated_at = NOW()
   WHERE id = ?`,
  [orderId],
);

await enqueueProvisionJob(orderId, 'requeue-failed-game-order-script');
console.log('Cleared last error and enqueued:', orderId, 'status was:', st);
try {
  await getProvisionQueue().close();
} catch {
  // ignore
}
await pool.end();
