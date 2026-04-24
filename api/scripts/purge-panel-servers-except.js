#!/usr/bin/env node
/**
 * Delete Panel servers whose name/identifier does NOT match a keep substring (case-insensitive).
 * Updates app_core orders that pointed at deleted servers: clears Panel fields, sets status=paid,
 * removes capacity ledger rows so provisioning can retry.
 *
 * Usage:
 *   node api/scripts/purge-panel-servers-except.js --keep=cjm
 *   node api/scripts/purge-panel-servers-except.js --keep=cjm --dry-run
 *   node api/scripts/purge-panel-servers-except.js --keep=cjm --apply
 *
 * Keep one production server (substring matched case-insensitively against
 * Panel name, identifier, and external_id), e.g. Terraria:
 *   node api/scripts/purge-panel-servers-except.js --keep=terraria-baeb3a35 --dry-run
 *   node api/scripts/purge-panel-servers-except.js --keep=terraria-baeb3a35 --apply
 */
import '../config/loadEnv.js';
import pool from '../config/database.js';

const PANEL_URL = (process.env.PANEL_URL || '').replace(/\/+$/, '');
const PANEL_APP_KEY = process.env.PANEL_APP_KEY;

const keepArg = process.argv.find((a) => a.startsWith('--keep='));
const keep = (keepArg ? keepArg.split('=')[1] : '').trim().toLowerCase();
const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

const headers = {
  Authorization: `Bearer ${PANEL_APP_KEY}`,
  Accept: 'Application/vnd.pterodactyl.v1+json',
  'Content-Type': 'application/json',
};

function shouldKeep(att) {
  if (!keep) return false;
  const name = String(att?.name || '').toLowerCase();
  const ident = String(att?.identifier || '').toLowerCase();
  const ext = String(att?.external_id || '').toLowerCase();
  return name.includes(keep) || ident.includes(keep) || ext.includes(keep);
}

async function listAllServers() {
  const servers = [];
  let page = 1;
  const perPage = 50;
  while (true) {
    const res = await fetch(`${PANEL_URL}/api/application/servers?per_page=${perPage}&page=${page}`, { headers });
    if (!res.ok) throw new Error(`Panel list: ${res.status} ${await res.text()}`);
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
  if (!res.ok) throw new Error(`Delete ${id}: ${res.status} ${await res.text()}`);
}

async function main() {
  if (!keep) {
    console.error('Required: --keep=cjm (substring matched against Panel server name and identifier)');
    process.exit(1);
  }
  if (!PANEL_URL || !PANEL_APP_KEY) {
    console.error('Missing PANEL_URL or PANEL_APP_KEY');
    process.exit(1);
  }

  const servers = await listAllServers();
  const toDelete = [];
  const kept = [];
  for (const s of servers) {
    const att = s.attributes || s;
    const id = att.id ?? s.id;
    if (shouldKeep(att)) {
      kept.push({ id, name: att.name, identifier: att.identifier });
    } else {
      toDelete.push({ id, name: att.name, identifier: att.identifier });
    }
  }

  console.log(`\nKeep substring: "${keep}"`);
  console.log(`Keeping ${kept.length} server(s):`);
  for (const k of kept) console.log(`  id=${k.id} name=${k.name} identifier=${k.identifier}`);
  console.log(`\nWould delete ${toDelete.length} server(s):`);
  for (const d of toDelete) console.log(`  id=${d.id} name=${d.name} identifier=${d.identifier}`);

  if (dryRun) {
    console.log('\nDry run. Add --apply to delete and clean app_core.\n');
    await pool.end();
    return;
  }

  const deletedIds = [];
  for (const d of toDelete) {
    try {
      await deleteServer(d.id);
      deletedIds.push(d.id);
      console.log(`Deleted panel id=${d.id}`);
    } catch (e) {
      console.error(`Failed id=${d.id}:`, e.message);
    }
  }

  if (deletedIds.length === 0) {
    console.log('\nNo panel servers deleted.\n');
    await pool.end();
    return;
  }

  const [orders] = await pool.execute(
    `SELECT id FROM orders WHERE ptero_server_id IN (${deletedIds.map(() => '?').join(',')})`,
    deletedIds,
  );
  const orderIds = orders.map((r) => r.id);
  if (orderIds.length > 0) {
    await pool.execute(
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
       WHERE id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds,
    );
    await pool.execute(
      `DELETE FROM ptero_node_capacity_ledger WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds,
    );
    try {
      await pool.execute(
        `DELETE FROM server_public_snapshots WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
        orderIds,
      );
      await pool.execute(
        `DELETE FROM server_public_pages WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
        orderIds,
      );
    } catch (e) {
      console.warn('Optional cleanup server_public_* skipped:', e?.message || e);
    }
    console.log(`\nReset ${orderIds.length} order(s) to paid and released ledger.`);
  }

  console.log('\nDone.\n');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
