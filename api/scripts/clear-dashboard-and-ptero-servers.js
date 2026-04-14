#!/usr/bin/env node
/**
 * 1) Delete ALL servers from Pterodactyl panel.
 * 2) Cancel game orders in paid→playable (and error/failed), clear Panel columns — empties dashboard.
 *
 * Usage:
 *   node api/scripts/clear-dashboard-and-ptero-servers.js           # dry run
 *   node api/scripts/clear-dashboard-and-ptero-servers.js --apply   # do it
 *
 * Loads api/.env. Pterodactyl step uses PANEL_URL, PANEL_APP_KEY.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pool from '../config/database.js';
import { RESETTABLE_GAME_ORDER_STATUSES } from '../lib/gameOrderDashboardStatuses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const PANEL_URL = (process.env.PANEL_URL || '').replace(/\/+$/, '');
const PANEL_APP_KEY = process.env.PANEL_APP_KEY;
const APPLY = process.argv.includes('--apply');

const headers = {
  Authorization: `Bearer ${PANEL_APP_KEY}`,
  Accept: 'Application/vnd.pterodactyl.v1+json',
  'Content-Type': 'application/json',
};

async function listAllServers() {
  const servers = [];
  let page = 1;
  const perPage = 50;
  while (true) {
    const res = await fetch(`${PANEL_URL}/api/application/servers?per_page=${perPage}&page=${page}`, { headers });
    if (!res.ok) throw new Error(`Panel list: ${res.status}`);
    const data = await res.json();
    const list = data.data || [];
    servers.push(...list);
    if (list.length < perPage) break;
    page++;
  }
  return servers;
}

async function deleteServer(id) {
  const res = await fetch(`${PANEL_URL}/api/application/servers/${id}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`Delete ${id}: ${res.status}`);
}

async function main() {
  console.log('\n--- Clear dashboard & Pterodactyl servers ---\n');

  // Step 1: Pterodactyl
  if (!PANEL_URL || !PANEL_APP_KEY) {
    console.log('Skip Pterodactyl: PANEL_URL or PANEL_APP_KEY missing.');
  } else {
    const servers = await listAllServers();
    console.log(`Pterodactyl: ${servers.length} server(s) found.`);
    if (APPLY && servers.length > 0) {
      const ids = servers.map((s) => (s.attributes || s).id ?? s.id);
      for (const id of ids) {
        try {
          await deleteServer(id);
          console.log(`  Deleted panel server id=${id}`);
        } catch (e) {
          console.error(`  Failed id=${id}:`, e.message);
        }
      }
    }
  }

  const st = RESETTABLE_GAME_ORDER_STATUSES.map(() => '?').join(', ');
  const [orders] = await pool.execute(
    `SELECT id, user_id, status, ptero_server_id FROM orders
     WHERE item_type = 'game' AND status IN (${st})
     ORDER BY created_at DESC`,
    [...RESETTABLE_GAME_ORDER_STATUSES]
  );
  console.log(`\nGame orders to reset (dashboard + stuck): ${orders.length} order(s).`);
  if (orders.length > 0) {
    for (const o of orders) {
      console.log(`  - ${o.id}  status=${o.status}  ptero_server_id=${o.ptero_server_id ?? 'null'}`);
    }
  }

  if (APPLY && orders.length > 0) {
    const orderIds = orders.map((o) => o.id);
    await pool.execute(
      `UPDATE orders SET
         status = 'canceled',
         ptero_server_id = NULL,
         ptero_identifier = NULL,
         ptero_server_uuid = NULL,
         ptero_primary_allocation_id = NULL,
         ptero_primary_port = NULL,
         ptero_extra_ports_json = NULL,
         ptero_node_id = NULL,
         game_brand_hostname = NULL,
         game_display_address = NULL,
         error_message = NULL,
         last_provision_error = NULL,
         updated_at = NOW()
       WHERE id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );
    await pool.execute(
      `DELETE FROM ptero_node_capacity_ledger WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );
    console.log(`\nCanceled ${orderIds.length} order(s) and released capacity. Dashboard "Your Active Servers" will be empty.`);
  }

  if (!APPLY) {
    console.log('\nDry run. To apply: node api/scripts/clear-dashboard-and-ptero-servers.js --apply\n');
  } else {
    console.log('\nDone.\n');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => pool.end());
