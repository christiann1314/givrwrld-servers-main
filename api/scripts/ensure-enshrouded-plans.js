#!/usr/bin/env node
/**
 * Ensure Enshrouded base plans exist in app_core.plans (idempotent).
 * Run from repo root: node api/scripts/ensure-enshrouded-plans.js
 */
import pool from '../config/database.js';

const plans = [
  ['enshrouded-4gb', 'game', 'enshrouded', 4, 2, 30, 9.99, null, 'Enshrouded 4GB', 1],
  ['enshrouded-6gb', 'game', 'enshrouded', 6, 2, 40, 14.99, null, 'Enshrouded 6GB', 1],
  ['enshrouded-8gb', 'game', 'enshrouded', 8, 3, 50, 19.99, null, 'Enshrouded 8GB', 1],
];

async function main() {
  for (const row of plans) {
    await pool.execute(
      `INSERT INTO plans (id, item_type, game, ram_gb, vcores, ssd_gb, price_monthly, ptero_egg_id, display_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), ram_gb = VALUES(ram_gb), vcores = VALUES(vcores),
         ssd_gb = VALUES(ssd_gb), price_monthly = VALUES(price_monthly), is_active = 1, updated_at = CURRENT_TIMESTAMP`,
      row
    );
  }
  const [rows] = await pool.execute('SELECT id, game, ptero_egg_id FROM plans WHERE game = ?', ['enshrouded']);
  console.log('Enshrouded plans:', rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
