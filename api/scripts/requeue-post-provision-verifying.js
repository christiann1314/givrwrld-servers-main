#!/usr/bin/env node
/**
 * Re-queue BullMQ post-provision jobs for orders stuck in `verifying`.
 * Run on the API host after fixing TCP probe env (e.g. POST_PROVISION_TCP_PROBE_HOST) or worker code.
 *
 * Usage (from api/ with .env loaded):
 *   node scripts/requeue-post-provision-verifying.js
 *   node scripts/requeue-post-provision-verifying.js --dry-run
 *   node scripts/requeue-post-provision-verifying.js --order-id=UUID
 */
import '../config/loadEnv.js';
import pool from '../config/database.js';
import { forceRequeuePostProvisionJob } from '../queue/provisioningQueue.js';

const dryRun = process.argv.includes('--dry-run');
const oneArg = process.argv.find((a) => a.startsWith('--order-id='));
const oneId = oneArg ? String(oneArg.split('=')[1] || '').trim() : '';

async function main() {
  let rows;
  if (oneId) {
    rows = [{ id: oneId }];
  } else {
    const [r] = await pool.execute(
      `SELECT id FROM orders
       WHERE status = 'verifying'
         AND ptero_server_id IS NOT NULL
       ORDER BY updated_at ASC`,
    );
    rows = r;
  }

  console.log(`Found ${rows.length} order(s) in verifying.`);

  for (const row of rows) {
    const id = String(row.id);
    if (dryRun) {
      console.log(`  [dry-run] would requeue post-provision: ${id}`);
      continue;
    }
    const res = await forceRequeuePostProvisionJob(id);
    console.log(`  ${id}:`, res);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
