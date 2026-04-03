#!/usr/bin/env node
/**
 * Ops/testing: set a pending game order to paid so provision-order-direct can run.
 * Guarded to avoid accidental production use.
 *
 * Usage (on server):
 *   cd api && ALLOW_MARK_ORDER_PAID=1 node scripts/mark-order-paid-for-provision-test.mjs <order_uuid>
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import pool from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

if (process.env.ALLOW_MARK_ORDER_PAID !== '1') {
  console.error('Refused: set ALLOW_MARK_ORDER_PAID=1 to confirm.');
  process.exit(1);
}

const orderId = process.argv[2];
if (!orderId) {
  console.error('Usage: ALLOW_MARK_ORDER_PAID=1 node scripts/mark-order-paid-for-provision-test.mjs <order_uuid>');
  process.exit(1);
}

const [rows] = await pool.execute(
  `SELECT id, status, item_type, ptero_server_id FROM orders WHERE id = ?`,
  [orderId],
);
if (!rows.length) {
  console.error('Order not found:', orderId);
  process.exit(1);
}
const o = rows[0];
if (String(o.item_type) !== 'game') {
  console.error('Not a game order:', o.item_type);
  process.exit(1);
}
if (o.ptero_server_id != null) {
  console.error('Order already has ptero_server_id:', o.ptero_server_id);
  process.exit(1);
}

const [upd] = await pool.execute(
  `UPDATE orders
   SET status = 'paid', updated_at = NOW()
   WHERE id = ?
     AND status = 'pending'
     AND item_type = 'game'
     AND ptero_server_id IS NULL`,
  [orderId],
);
console.log('affected_rows:', upd.affectedRows);
if (upd.affectedRows === 0) {
  console.error('No update (already paid / wrong status?). Current status:', o.status);
  process.exit(1);
}
console.log('OK:', orderId, '→ paid');

await pool.end();
