#!/usr/bin/env node
/**
 * Run provisionServer(orderId) in-process (no BullMQ). Use when Redis/worker is down
 * or you want an immediate error in the terminal.
 *
 * Usage: node api/scripts/provision-order-direct.js <order_uuid>
 *   Pre-diagnose: node api/scripts/diagnose-order.js <order_uuid>
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { provisionServer } from '../routes/servers.js';
import pool from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const orderId = process.argv[2];
if (!orderId) {
  console.error('Usage: node api/scripts/provision-order-direct.js <order_id>');
  process.exit(1);
}

try {
  const result = await provisionServer(orderId);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('provision-order-direct failed:', err?.message || err);
  process.exit(1);
} finally {
  await pool.end();
}
