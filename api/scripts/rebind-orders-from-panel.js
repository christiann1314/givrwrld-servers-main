#!/usr/bin/env node
/**
 * Re-sync MySQL game orders with the current Pterodactyl Application API after a panel
 * rebuild or DB drift. Matches each Panel server to an order by:
 *   1) attributes.external_id === orders.id (normal provision path)
 *   2) attributes.name === buildDeterministicServerName(order) (fallback)
 *
 * Updates: ptero_server_id, ptero_identifier, ptero_server_uuid, ptero_primary_allocation_id,
 *          ptero_primary_port, ptero_node_id (when node relationship resolves)
 *
 * Usage:
 *   node api/scripts/rebind-orders-from-panel.js           # dry-run, print planned updates
 *   node api/scripts/rebind-orders-from-panel.js --apply   # write to DB
 *
 * Requires: PANEL_URL, PANEL_APP_KEY, DATABASE_* from api/.env
 *
 * After rebinding, dashboard live state needs PTERO_CLIENT_KEY (Panel account API key with
 * access to those servers) or GET /api/servers will show offline for non-404 errors.
 */
import { fileURLToPath } from 'node:url';
import path from 'path';
import dotenv from 'dotenv';
import pool from '../config/database.js';
import { buildDeterministicServerName } from '../lib/provisionPanelHelpers.js';
import { DASHBOARD_ACTIVE_GAME_STATUSES } from '../lib/gameOrderDashboardStatuses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');

function panelOrigin() {
  const raw = String(process.env.PANEL_URL || '').trim();
  if (!raw) throw new Error('PANEL_URL is not set');
  const u = new URL(raw);
  return u.origin.replace(/\/+$/, '');
}

async function fetchApplicationJson(urlPath) {
  const origin = panelOrigin();
  const key = String(process.env.PANEL_APP_KEY || '').trim();
  if (!key) throw new Error('PANEL_APP_KEY is not set');
  const url = `${origin}/api/application${urlPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Panel ${urlPath} HTTP ${res.status}: ${text.slice(0, 800)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function listAllPanelServers() {
  const out = [];
  for (let page = 1; ; page += 1) {
    const json = await fetchApplicationJson(`/servers?page=${page}&per_page=100`);
    for (const row of json.data || []) {
      if (row?.attributes) out.push(row.attributes);
    }
    const meta = json.meta?.pagination;
    const totalPages = Number(meta?.total_pages);
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
  }
  return out;
}

function resolvePrimaryAllocationFromPayload(body) {
  const root = body?.data != null ? body.data : body;
  const attrs = root?.attributes || {};
  const rel =
    root?.relationships?.allocations?.data || attrs.relationships?.allocations?.data;
  if (!Array.isArray(rel) || rel.length === 0) return { allocationId: null, port: null };

  const included = Array.isArray(body?.included) ? body.included : [];
  const resolveRef = (ref) => {
    if (!ref) return null;
    if (ref.attributes) return ref;
    const type = String(ref.type || '').toLowerCase();
    const id = String(ref.id ?? '');
    return (
      included.find(
        (inc) => String(inc.type || '').toLowerCase() === type && String(inc.id) === id,
      ) || null
    );
  };

  let chosen = null;
  for (const ref of rel) {
    const full = resolveRef(ref);
    if (full?.attributes?.is_default) {
      chosen = full;
      break;
    }
  }
  if (!chosen) chosen = resolveRef(rel[0]);
  if (!chosen?.attributes) return { allocationId: null, port: null };
  const allocationId = Number(chosen.id);
  const port =
    chosen.attributes.port != null && Number.isFinite(Number(chosen.attributes.port))
      ? Number(chosen.attributes.port)
      : null;
  return {
    allocationId: Number.isFinite(allocationId) ? allocationId : null,
    port,
  };
}

function resolvePanelNodeId(body) {
  const root = body?.data != null ? body.data : body;
  const rel = root?.relationships?.node?.data;
  if (!rel) return null;
  const id = Number(rel.id);
  return Number.isFinite(id) ? id : null;
}

async function fetchServerDetail(serverId) {
  return fetchApplicationJson(`/servers/${encodeURIComponent(String(serverId))}?include=allocations,node`);
}

async function main() {
  console.log(`\n--- Rebind orders from Panel (${APPLY ? 'APPLY' : 'DRY RUN'}) ---\n`);

  const panelServers = await listAllPanelServers();
  console.log(`Panel servers listed: ${panelServers.length}`);

  const [orders] = await pool.execute(
    `SELECT id, user_id, server_name, status, item_type,
            ptero_server_id, ptero_identifier, ptero_server_uuid,
            ptero_primary_allocation_id, ptero_primary_port, ptero_node_id
     FROM orders
     WHERE item_type = 'game'
     ORDER BY created_at DESC`,
  );

  const orderById = new Map(orders.map((o) => [String(o.id), o]));

  const matchedOrderIds = new Set();
  const updates = [];

  for (const attrs of panelServers) {
    const panelServerId = Number(attrs.id);
    const identifier = attrs.identifier != null ? String(attrs.identifier).trim() : '';
    const externalId = attrs.external_id != null ? String(attrs.external_id).trim() : '';
    const name = attrs.name != null ? String(attrs.name).trim() : '';

    let order = null;
    if (externalId && orderById.has(externalId)) {
      order = orderById.get(externalId);
    }
    if (!order) {
      order = orders.find((o) => buildDeterministicServerName(o) === name) || null;
    }

    if (!order) {
      console.log(
        `\n[unmatched panel server] id=${panelServerId} name=${JSON.stringify(name)} external_id=${JSON.stringify(externalId)} identifier=${JSON.stringify(identifier)}`,
      );
      continue;
    }

    if (matchedOrderIds.has(order.id)) {
      console.warn(`\n[warn] order ${order.id} matched more than one panel server; skipping duplicate panel id=${panelServerId}`);
      continue;
    }
    matchedOrderIds.add(String(order.id));

    let detail = null;
    let allocationId = null;
    let primaryPort = null;
    let panelNodeId = null;
    let serverUuid = attrs.uuid != null ? String(attrs.uuid).trim() : null;

    try {
      detail = await fetchServerDetail(panelServerId);
      const alloc = resolvePrimaryAllocationFromPayload(detail);
      allocationId = alloc.allocationId;
      primaryPort = alloc.port;
      panelNodeId = resolvePanelNodeId(detail);
    } catch (e) {
      console.warn(`\n[warn] could not fetch server detail for panel id=${panelServerId}: ${e.message}`);
    }

    const row = {
      orderId: order.id,
      userId: order.user_id,
      panelServerId,
      identifier,
      serverUuid,
      allocationId,
      primaryPort,
      panelNodeId,
      prev: {
        ptero_server_id: order.ptero_server_id,
        ptero_identifier: order.ptero_identifier,
        ptero_server_uuid: order.ptero_server_uuid,
        ptero_primary_allocation_id: order.ptero_primary_allocation_id,
        ptero_primary_port: order.ptero_primary_port,
        ptero_node_id: order.ptero_node_id,
      },
    };

    const changed =
      Number(order.ptero_server_id) !== panelServerId ||
      String(order.ptero_identifier || '') !== identifier ||
      String(order.ptero_server_uuid || '') !== (serverUuid || '') ||
      Number(order.ptero_primary_allocation_id || 0) !== Number(allocationId || 0) ||
      Number(order.ptero_primary_port || 0) !== Number(primaryPort || 0) ||
      Number(order.ptero_node_id || 0) !== Number(panelNodeId || order.ptero_node_id || 0);

    if (changed) {
      updates.push(row);
    }
  }

  const stList = DASHBOARD_ACTIVE_GAME_STATUSES.map(() => '?').join(', ');
  const statusParams = [...DASHBOARD_ACTIVE_GAME_STATUSES];
  let activeOrphansRows;
  if (matchedOrderIds.size === 0) {
    const [rows] = await pool.execute(
      `SELECT id, user_id, server_name, status, ptero_server_id, ptero_identifier
       FROM orders
       WHERE item_type = 'game'
         AND status IN (${stList})`,
      statusParams,
    );
    activeOrphansRows = rows;
  } else {
    const idPlaceholders = [...matchedOrderIds].map(() => '?').join(', ');
    const [rows] = await pool.execute(
      `SELECT id, user_id, server_name, status, ptero_server_id, ptero_identifier
       FROM orders
       WHERE item_type = 'game'
         AND status IN (${stList})
         AND id NOT IN (${idPlaceholders})`,
      [...statusParams, ...matchedOrderIds],
    );
    activeOrphansRows = rows;
  }

  console.log(`\nOrders matched to a panel server: ${matchedOrderIds.size}`);
  console.log(`Planned row updates: ${updates.length}`);

  for (const u of updates) {
    console.log(
      `\norder ${u.orderId} (${u.userId})\n  panel server ${u.panelServerId} identifier=${u.identifier}\n  was: server_id=${u.prev.ptero_server_id} ident=${JSON.stringify(u.prev.ptero_identifier)}\n  now: server_id=${u.panelServerId} alloc=${u.allocationId} port=${u.primaryPort} node=${u.panelNodeId}`,
    );
  }

  if (activeOrphansRows?.length) {
    console.log(
      `\n--- Billing orders still "active" on dashboard but no panel server matched (${activeOrphansRows.length}) ---`,
    );
    for (const o of activeOrphansRows) {
      console.log(
        `  order=${o.id} status=${o.status} server_name=${JSON.stringify(o.server_name)} ptero_server_id=${o.ptero_server_id} ptero_identifier=${JSON.stringify(o.ptero_identifier)}`,
      );
    }
    console.log(
      '\nThese stay out of sync until you delete the panel row, restore a backup, or reset the order (e.g. clear-dashboard script / manual SQL to paid + null ptero_*).',
    );
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write changes.\n');
    await pool.end();
    return;
  }

  for (const u of updates) {
    await pool.execute(
      `UPDATE orders SET
         ptero_server_id = ?,
         ptero_identifier = ?,
         ptero_server_uuid = ?,
         ptero_primary_allocation_id = ?,
         ptero_primary_port = ?,
         ptero_node_id = COALESCE(?, ptero_node_id),
         updated_at = NOW()
       WHERE id = ? AND item_type = 'game'`,
      [
        u.panelServerId,
        u.identifier,
        u.serverUuid,
        u.allocationId,
        u.primaryPort,
        u.panelNodeId,
        u.orderId,
      ],
    );
    console.log(`\nUpdated order ${u.orderId}`);
  }

  console.log('\nDone. Restart the API process if it caches env; verify PTERO_CLIENT_KEY for live stats.\n');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
