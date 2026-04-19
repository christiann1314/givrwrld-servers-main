#!/usr/bin/env node
/**
 * Print ptero_nodes, region_node_map, and ptero_node_capacity_ledger usage (why "No node capacity").
 *
 *   node api/scripts/audit-node-capacity.js
 */
import '../config/loadEnv.js';
import pool from '../config/database.js';

async function main() {
  const [nodes] = await pool.execute(
    `SELECT ptero_node_id, name, region_code, max_ram_gb, max_disk_gb, reserved_headroom, enabled
     FROM ptero_nodes
     ORDER BY ptero_node_id`,
  );
  console.log('\n=== ptero_nodes ===');
  for (const n of nodes) {
    console.log(JSON.stringify(n));
  }

  const [map] = await pool.execute(
    `SELECT rnm.region_code, rnm.ptero_node_id, rnm.weight, n.name AS node_name
     FROM region_node_map rnm
     JOIN ptero_nodes n ON n.ptero_node_id = rnm.ptero_node_id
     ORDER BY rnm.region_code, rnm.weight DESC`,
  );
  console.log('\n=== region_node_map ===');
  for (const r of map) {
    console.log(JSON.stringify(r));
  }

  const [ledger] = await pool.execute(
    `SELECT l.ptero_node_id,
            SUM(l.ram_gb) AS sum_ram_gb,
            SUM(l.disk_gb) AS sum_disk_gb,
            COUNT(*) AS ledger_rows
     FROM ptero_node_capacity_ledger l
     GROUP BY l.ptero_node_id`,
  );
  console.log('\n=== ledger sums by node ===');
  for (const row of ledger) {
    console.log(JSON.stringify(row));
  }

  const [detail] = await pool.execute(
    `SELECT l.order_id, l.ptero_node_id, l.ram_gb, l.disk_gb, o.status, o.server_name, o.ptero_server_id
     FROM ptero_node_capacity_ledger l
     JOIN orders o ON o.id = l.order_id
     ORDER BY l.ptero_node_id, l.order_id`,
  );
  console.log('\n=== ledger rows (with order) ===');
  for (const row of detail) {
    console.log(JSON.stringify(row));
  }

  for (const n of nodes) {
    const nid = n.ptero_node_id;
    const maxRam = Number(n.max_ram_gb || 0);
    const maxDisk = Number(n.max_disk_gb || 0);
    const head = Number(n.reserved_headroom || 0);
    const [caps] = await pool.execute(
      `SELECT COALESCE(SUM(ram_gb),0) AS r, COALESCE(SUM(disk_gb),0) AS d FROM ptero_node_capacity_ledger WHERE ptero_node_id = ?`,
      [nid],
    );
    const reservedRam = Number(caps[0]?.r || 0);
    const reservedDisk = Number(caps[0]?.d || 0);
    const remRam = maxRam - head - reservedRam;
    const remDisk = maxDisk - reservedDisk;
    console.log(
      `\nNode ${nid} (${n.name}): remaining ≈ ${remRam} GB RAM, ${remDisk} GB disk (max ${maxRam}/${maxDisk}, headroom ${head}, reserved ${reservedRam}/${reservedDisk})`,
    );
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
