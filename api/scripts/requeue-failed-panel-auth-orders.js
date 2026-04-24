#!/usr/bin/env node
/**
 * Requeue game orders stuck in failed/error with Panel 401 / Unauthenticated in last_provision_error.
 * Usage (from api/): node scripts/requeue-failed-panel-auth-orders.js
 */
import '../config/loadEnv.js';
import pool from '../config/database.js';
import { enqueueProvisionJob, getProvisionQueue } from '../queues/provisionQueue.js';

const [rows] = await pool.execute(
  `SELECT id, status FROM orders
     WHERE item_type = 'game'
       AND status IN ('failed','error')
       AND (
         last_provision_error LIKE '%401%'
         OR last_provision_error LIKE '%Unauthenticated%'
       )
     ORDER BY updated_at DESC
     LIMIT 25`,
);

if (!rows.length) {
  console.log('No matching failed/error game orders.');
  await pool.end();
  process.exit(0);
}

for (const r of rows) {
  const id = r.id;
  await pool.execute(
    `UPDATE orders
        SET last_provision_error = NULL,
            error_message = NULL,
            updated_at = NOW()
      WHERE id = ?`,
    [id],
  );
  await enqueueProvisionJob(id, 'requeue-failed-panel-auth-orders');
  console.log('Cleared error and enqueued:', id, 'was:', r.status);
}

try {
  await getProvisionQueue().close();
} catch {
  // ignore
}
await pool.end();
console.log('Done.', rows.length, 'order(s).');
