#!/usr/bin/env node
/**
 * Dev helper: reset node capacity so local provisioning tests don't hit
 * "No node capacity available" errors.
 *
 * From repo root:
 *   node api/scripts/dev-reset-capacity.js
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('\n[dev-reset-capacity] Resetting local node capacity for app_core...\n');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Beef up capacity on the primary node (id 1 by convention in seed-ptero-local.sql).
    await conn.execute(
      `UPDATE ptero_nodes
         SET max_ram_gb = 999,
             max_disk_gb = 9999,
             reserved_headroom = 0
       WHERE ptero_node_id = 1`
    );

    // Clear the capacity ledger so previous reservations don't block tests.
    await conn.execute(`DELETE FROM ptero_node_capacity_ledger`);

    await conn.commit();
    console.log('[dev-reset-capacity] Done. Node 1 capacity increased and ledger cleared.\n');
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('[dev-reset-capacity] FAILED:', err?.message || err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();

