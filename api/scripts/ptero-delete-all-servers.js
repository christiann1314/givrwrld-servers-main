#!/usr/bin/env node
/**
 * Delete ALL servers from the Pterodactyl panel (Application API).
 * Use for local/dev to clear test servers and free capacity/throttle.
 *
 * Usage:
 *   node api/scripts/ptero-delete-all-servers.js           # dry run (list only)
 *   node api/scripts/ptero-delete-all-servers.js --apply    # actually delete
 *
 * Loads api/.env for PANEL_URL and PANEL_APP_KEY.
 * After deletion, optionally clears ptero_server_id in app_core.orders and
 * releases ptero_node_capacity_ledger for those orders so you can retry provisioning.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pool from '../config/database.js';

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
    const url = `${PANEL_URL}/api/application/servers?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Panel list servers failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const list = data.data || [];
    servers.push(...list);
    if (list.length < perPage) break;
    page++;
  }
  return servers;
}

async function deleteServer(id) {
  const url = `${PANEL_URL}/api/application/servers/${id}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete server ${id} failed: ${res.status} ${text}`);
  }
}

async function main() {
  if (!PANEL_URL || !PANEL_APP_KEY) {
    console.error('Missing PANEL_URL or PANEL_APP_KEY in api/.env');
    process.exit(1);
  }

  console.log('\nPterodactyl: list servers (Application API)...\n');
  const servers = await listAllServers();

  if (servers.length === 0) {
    console.log('No servers found. Nothing to delete.\n');
    return;
  }

  console.log(`Found ${servers.length} server(s):`);
  for (const s of servers) {
    const att = s.attributes || s;
    const id = att.id ?? s.id;
    const name = att.name ?? s.name ?? '—';
    const ident = att.identifier ?? s.identifier ?? '—';
    console.log(`  - id=${id}  identifier=${ident}  name=${name}`);
  }

  if (!APPLY) {
    console.log('\nDry run. To delete all, run: node api/scripts/ptero-delete-all-servers.js --apply\n');
    return;
  }

  console.log('\nDeleting...');
  const deletedIds = [];
  for (const s of servers) {
    const att = s.attributes || s;
    const id = att.id ?? s.id;
    try {
      await deleteServer(id);
      deletedIds.push(id);
      console.log(`  Deleted id=${id} (${att.name ?? att.identifier ?? id})`);
    } catch (err) {
      console.error(`  Failed id=${id}:`, err.message);
    }
  }

  if (deletedIds.length === 0) {
    console.log('\nNo servers were deleted.\n');
    return;
  }

  // Update app_core: clear ptero_server_id so orders can be retried; release capacity
  try {
    const [orders] = await pool.execute(
      `SELECT id FROM orders WHERE ptero_server_id IN (${deletedIds.map(() => '?').join(',')})`,
      deletedIds
    );
    const orderIds = orders.map((r) => r.id);
    if (orderIds.length > 0) {
      await pool.execute(
        `UPDATE orders SET ptero_server_id = NULL, ptero_identifier = NULL, status = 'paid' WHERE ptero_server_id IN (${deletedIds.map(() => '?').join(',')})`,
        deletedIds
      );
      await pool.execute(
        `DELETE FROM ptero_node_capacity_ledger WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
        orderIds
      );
      console.log(`\nUpdated ${orderIds.length} order(s) in app_core: cleared ptero_server_id, set status=paid, released capacity. You can retry provisioning.`);
    }
  } catch (e) {
    console.error('App_core cleanup failed:', e.message);
  }

  console.log(`\nDone. Deleted ${deletedIds.length} server(s) from Pterodactyl.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => pool.end());
