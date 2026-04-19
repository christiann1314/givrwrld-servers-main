#!/usr/bin/env node
/**
 * Remove stale ptero_node_capacity_ledger rows:
 * - order already has a Panel server (reservation was consumed; see transitionToProvisioned)
 * - order failed or canceled
 *
 *   node api/scripts/reconcile-capacity-ledger-orphans.js --dry-run
 *   node api/scripts/reconcile-capacity-ledger-orphans.js --apply
 */
import '../config/loadEnv.js';
import pool from '../config/database.js';

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

const where = `(o.status IN ('failed', 'canceled') OR o.ptero_server_id IS NOT NULL)`;

async function main() {
  const [rows] = await pool.execute(
    `SELECT l.order_id, l.ptero_node_id, l.ram_gb, l.disk_gb, o.status, o.ptero_server_id, o.server_name
     FROM ptero_node_capacity_ledger l
     INNER JOIN orders o ON o.id = l.order_id
     WHERE ${where}`,
  );
  console.log(`\nStale ledger rows to remove: ${rows.length}`);
  for (const r of rows) {
    console.log(JSON.stringify(r));
  }

  if (dryRun) {
    console.log('\nDry run. Add --apply to DELETE these ledger rows.\n');
    await pool.end();
    return;
  }

  const [result] = await pool.execute(
    `DELETE l FROM ptero_node_capacity_ledger l
     INNER JOIN orders o ON o.id = l.order_id
     WHERE ${where}`,
  );
  console.log(`\nDeleted ledger rows (affectedRows): ${result.affectedRows ?? '?'}\n`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
