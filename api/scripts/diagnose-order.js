#!/usr/bin/env node
/**
 * Diagnose a failed provisioning order: order + plan + egg and stored error.
 * Usage: node api/scripts/diagnose-order.js <order_id>
 * Example: node api/scripts/diagnose-order.js fcc3bf57-0410-47e2-a2af-5de3b211e32f
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error('Usage: node api/scripts/diagnose-order.js <order_id>');
    process.exit(1);
  }

  const [orderRows] = await pool.execute(
    `SELECT o.id, o.user_id, o.plan_id, o.status, o.region, o.server_name,
            o.ptero_server_id, o.ptero_identifier, o.ptero_node_id,
            o.provision_attempt_count, o.last_provision_attempt_at,
            o.last_provision_error, o.error_message, o.created_at,
            p.game, p.ptero_egg_id, p.ram_gb, p.ssd_gb, p.display_name AS plan_display_name
     FROM orders o
     LEFT JOIN plans p ON p.id = o.plan_id
     WHERE o.id = ?`,
    [orderId],
  );

  if (!orderRows.length) {
    console.error('Order not found:', orderId);
    process.exit(1);
  }

  const order = orderRows[0];
  console.log('\n--- Order ---');
  console.log('id:', order.id);
  console.log('user_id (dashboard / JWT must match this):', order.user_id);
  console.log('plan_id:', order.plan_id);
  console.log('status:', order.status);
  console.log('region:', order.region);
  console.log('server_name:', order.server_name);
  console.log('ptero_server_id:', order.ptero_server_id);
  console.log('ptero_identifier:', order.ptero_identifier ?? '(null)');
  console.log('ptero_node_id:', order.ptero_node_id);
  console.log('provision_attempt_count:', order.provision_attempt_count);
  console.log('last_provision_attempt_at:', order.last_provision_attempt_at);
  console.log('last_provision_error:', order.last_provision_error ?? '(none)');
  if (order.error_message) console.log('error_message:', order.error_message);
  console.log('created_at:', order.created_at);

  console.log('\n--- Plan (from plans table) ---');
  console.log('game:', order.game);
  console.log('ptero_egg_id:', order.ptero_egg_id ?? '(null)');
  console.log('ram_gb:', order.ram_gb);
  console.log('ssd_gb:', order.ssd_gb);
  console.log('plan_display_name:', order.plan_display_name);

  const [buyerRows] = await pool.execute(
    `SELECT id, email, display_name, pterodactyl_user_id FROM users WHERE id = ? LIMIT 1`,
    [order.user_id],
  );
  const buyer = buyerRows[0];
  if (buyer) {
    console.log('\n--- Buyer (users row) ---');
    console.log('email:', buyer.email);
    console.log('pterodactyl_user_id:', buyer.pterodactyl_user_id ?? '(null — will be created on provision)');
    if (Number(buyer.pterodactyl_user_id) === 1) {
      console.log(
        'WARNING: pterodactyl_user_id is 1 (often Panel admin). New servers will be owned by admin in Pterodactyl.',
      );
      console.log(
        '  Fix: set users.pterodactyl_user_id to the Application API user id for this email, or NULL to recreate.',
      );
    }
  } else {
    console.log('\n--- Buyer ---');
    console.log('WARNING: No users row for order.user_id — provisioning should have failed.');
  }

  if (String(order.game || '').toLowerCase().includes('among') || order.ptero_egg_id === 74) {
    console.log('\n--- Among Us / Impostor ---');
    console.log(
      'If Impostor logs show PublicIP 127.0.0.1, set in api/.env a reachable host or IP for clients:',
    );
    console.log('  GAME_SERVER_PUBLIC_HOST=<node public IP or game hostname>');
    console.log('  (aliases: IMPOSTOR_SERVER_PUBLIC_HOST, PTERO_EXTERNAL_GAME_HOST)');
  }

  const eggId = order.ptero_egg_id;
  const [[statusCol]] = await pool.execute(
    `SELECT COLUMN_TYPE AS orders_status_column_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'`,
  );
  const colType = String(statusCol?.orders_status_column_type || '');
  console.log('\n--- orders.status column (MySQL) ---');
  console.log('COLUMN_TYPE:', colType || '(unknown)');
  if (colType && !colType.includes('configuring')) {
    console.log(
      '⚠ Post-provision needs configuring/verifying/playable in ENUM. If you see ' +
        '"Data truncated for column status" in post_provision_worker logs, apply migration:',
    );
    console.log('   sql/migrations/20260402120000_order_status_reachability.sql');
  }

  if (eggId != null) {
    const [eggRows] = await pool.execute(
      `SELECT ptero_egg_id, ptero_nest_id, name, docker_image
       FROM ptero_eggs WHERE ptero_egg_id = ?`,
      [eggId],
    );
    if (eggRows.length) {
      console.log('\n--- Egg (ptero_eggs) ---');
      console.log(eggRows[0]);
    } else {
      console.log('\n--- Egg ---');
      console.log('Egg not found in ptero_eggs for ptero_egg_id:', eggId);
      console.log('→ Run: npm run db:seed:catalog -- --apply  (sync Panel eggs to app_core)');
    }
  } else {
    console.log('\n--- Egg ---');
    console.log('Plan has no ptero_egg_id. Sync catalog and seed variant plans.');
    console.log('→ npm run db:seed:catalog -- --apply');
    console.log('→ GAME_FILTER=enshrouded node api/scripts/seed-game-variant-plans.js');
  }

  console.log('\n--- Where to look for logs ---');
  console.log('1. API/worker logs: provision_worker_job_error / provision_worker_job_failed with order_id:', orderId);
  console.log('2. Production: api/logs/api.log (pino when NODE_ENV=production)');
  console.log('3. PM2: pm2 logs givrwrld-provisioner');
  console.log('4. Post-provision: post_provision_worker_job_failed in api/logs/api.log');
  console.log('');
}

main()
  .catch((err) => {
    console.error('diagnose-order failed:', err?.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
