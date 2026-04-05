#!/usr/bin/env node
/**
 * Ops: create a paid game order (no checkout) and run provisionServer() in-process.
 * Default: smallest active Among Us plan.
 *
 *   cd api && ALLOW_CREATE_TEST_ORDER=1 node scripts/create-and-provision-test-order.mjs
 *   cd api && ALLOW_CREATE_TEST_ORDER=1 node scripts/create-and-provision-test-order.mjs among-us-2gb
 *   cd api && ALLOW_CREATE_TEST_ORDER=1 TEST_ORDER_REGION=us-east node scripts/create-and-provision-test-order.mjs
 */
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import pool from '../config/database.js';
import { provisionServer } from '../routes/servers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

if (process.env.ALLOW_CREATE_TEST_ORDER !== '1') {
  console.error('Refused: set ALLOW_CREATE_TEST_ORDER=1 to create a real order + Panel server.');
  process.exit(1);
}

const arg = process.argv[2] || 'among-us';
const region = String(process.env.TEST_ORDER_REGION || 'us-east').slice(0, 64);

let planRow;
if (arg.includes('gb') || arg.match(/^[a-z0-9-]+-\d+gb$/i)) {
  const [rows] = await pool.execute(
    `SELECT id, game FROM plans WHERE id = ? AND item_type = 'game' AND is_active = 1 LIMIT 1`,
    [arg],
  );
  planRow = rows[0];
} else {
  const [rows] = await pool.execute(
    `SELECT id, game FROM plans WHERE game = ? AND item_type = 'game' AND is_active = 1 ORDER BY ram_gb ASC LIMIT 1`,
    [arg],
  );
  planRow = rows[0];
}

if (!planRow) {
  console.error('No matching active game plan for:', arg);
  process.exit(1);
}

const [users] = await pool.execute(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`);
if (!users.length) {
  console.error('No users in database; create a user first.');
  process.exit(1);
}
const userId = users[0].id;

const orderId = crypto.randomUUID();
const serverName = `Ops test ${planRow.game} ${orderId.replace(/-/g, '').slice(0, 8)}`;

await pool.execute(
  `INSERT INTO orders (id, user_id, item_type, plan_id, term, region, server_name, status)
   VALUES (?, ?, 'game', ?, 'monthly', ?, ?, 'paid')`,
  [orderId, userId, planRow.id, region, serverName],
);

console.log('Inserted paid order:', orderId, 'plan:', planRow.id, 'user:', userId, 'region:', region);

try {
  const result = await provisionServer(orderId);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('provisionServer failed:', err?.message || err);
  process.exit(1);
} finally {
  await pool.end();
}
