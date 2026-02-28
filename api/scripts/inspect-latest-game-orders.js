#!/usr/bin/env node
/**
 * Inspect the latest game orders for debugging provisioning issues.
 * From repo root: node api/scripts/inspect-latest-game-orders.js
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const limit = Number(process.argv[2] || 10);
  console.log(`\nInspecting latest ${limit} game orders...\n`);

  const [rows] = await pool.execute(
    `SELECT
       id,
       user_id,
       item_type,
       plan_id,
       status,
       paypal_subscription_id,
       ptero_server_id,
       ptero_identifier,
       provision_attempt_count,
       last_provision_attempt_at,
       last_provision_error,
       created_at
     FROM orders
     WHERE item_type = 'game'
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit],
  );

  if (!rows.length) {
    console.log('No game orders found.');
    return;
  }

  for (const row of rows) {
    console.log(JSON.stringify(row, null, 2));
  }
}

main()
  .catch((err) => {
    console.error('inspect-latest-game-orders failed:', err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

