#!/usr/bin/env node
/**
 * Reset "zombie" dashboard-active game orders that point at a Pterodactyl
 * server id no longer present in the Panel Application API.
 *
 * Equivalent to what `resetGameOrderToPaidWhenNoPanelServerMatch` does at
 * request time inside api/routes/servers.js, but run as an admin sweep so
 * the dashboard is correct even before any user loads it.
 *
 * Usage:
 *   node api/scripts/reset-zombie-game-orders.js           # dry-run
 *   node api/scripts/reset-zombie-game-orders.js --apply   # write
 */
import { fileURLToPath } from 'node:url';
import path from 'path';
import dotenv from 'dotenv';
import pool from '../config/database.js';
import { buildDeterministicServerName } from '../lib/provisionPanelHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');

const DASHBOARD_STATUSES = ['provisioned', 'configuring', 'verifying', 'playable', 'active'];

function panelOrigin() {
  const raw = String(process.env.PANEL_URL || '').trim();
  if (!raw) throw new Error('PANEL_URL is not set');
  return new URL(raw).origin.replace(/\/+$/, '');
}

async function listAllPanelServers() {
  const key = String(process.env.PANEL_APP_KEY || '').trim();
  if (!key) throw new Error('PANEL_APP_KEY is not set');
  const origin = panelOrigin();
  const out = [];
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${origin}/api/application/servers?page=${page}&per_page=100`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'Application/vnd.pterodactyl.v1+json',
      },
    });
    if (!res.ok) {
      throw new Error(`Panel list HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const json = await res.json();
    for (const row of json.data || []) {
      if (row?.attributes) out.push(row.attributes);
    }
    const totalPages = Number(json.meta?.pagination?.total_pages);
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
  }
  return out;
}

function matches(panelAttrs, order) {
  if (!Array.isArray(panelAttrs)) return null;
  const oid = String(order.id || '').trim();
  const byExt = panelAttrs.find((a) => String(a.external_id || '').trim() === oid);
  if (byExt) return byExt;
  const det = buildDeterministicServerName(order);
  const byName = panelAttrs.find((a) => String(a.name || '').trim() === det);
  if (byName) return byName;
  if (order.ptero_server_id != null) {
    const pid = Number(order.ptero_server_id);
    const byId = panelAttrs.find((a) => Number(a.id) === pid);
    if (byId) return byId;
  }
  return null;
}

async function main() {
  console.log(`\n--- Reset zombie game orders (${APPLY ? 'APPLY' : 'DRY RUN'}) ---\n`);

  const panelServers = await listAllPanelServers();
  console.log(`Panel servers listed: ${panelServers.length}`);

  const sth = DASHBOARD_STATUSES.map(() => '?').join(', ');
  const [orders] = await pool.execute(
    `SELECT id, user_id, server_name, status,
            ptero_server_id, ptero_identifier, ptero_server_uuid
       FROM orders
      WHERE item_type = 'game'
        AND status IN (${sth})`,
    [...DASHBOARD_STATUSES],
  );
  console.log(`Dashboard-active game orders to evaluate: ${orders.length}`);

  const zombies = [];
  for (const o of orders) {
    const hit = matches(panelServers, o);
    if (!hit) zombies.push(o);
  }
  console.log(`Zombie orders (no matching panel server): ${zombies.length}`);
  for (const z of zombies) {
    console.log(
      `  order=${z.id} status=${z.status} server_name=${JSON.stringify(z.server_name)} ptero_server_id=${z.ptero_server_id}`,
    );
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to reset these to status=paid and null out ptero_* fields.\n');
    await pool.end();
    return;
  }

  let updated = 0;
  for (const z of zombies) {
    const [result] = await pool.execute(
      `UPDATE orders SET
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
         status = 'paid',
         updated_at = NOW()
       WHERE id = ?
         AND user_id = ?
         AND item_type = 'game'
         AND status IN (${sth})`,
      [z.id, z.user_id, ...DASHBOARD_STATUSES],
    );
    if (result.affectedRows > 0) {
      updated += 1;
      console.log(`  reset order ${z.id}`);
    }
  }
  console.log(`\nDone. ${updated}/${zombies.length} zombie orders reset.\n`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
