#!/usr/bin/env node
/**
 * Verify Step 1 one-time setup: MySQL app_core has ptero_nests, ptero_eggs, ptero_nodes, region_node_map.
 * Usage: node api/scripts/verify-step1-setup.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function main() {
  console.log('\n📋 Step 1 setup verification (app_core)\n');

  try {
    const [nests] = await pool.execute('SELECT COUNT(*) AS c FROM ptero_nests');
    const [eggs] = await pool.execute('SELECT COUNT(*) AS c FROM ptero_eggs');
    let nodeCount = 0;
    let nodeLabel = '(enabled)';
    try {
      const [nodes] = await pool.execute('SELECT COUNT(*) AS c FROM ptero_nodes WHERE enabled = 1');
      nodeCount = nodes[0].c;
    } catch (e) {
      if (e.message && e.message.includes('enabled')) {
        const [nodes] = await pool.execute('SELECT COUNT(*) AS c FROM ptero_nodes');
        nodeCount = nodes[0].c;
        nodeLabel = '';
      } else throw e;
    }
    const nodes = [{ c: nodeCount }];
    const [map] = await pool.execute(
      'SELECT region_code, COUNT(*) AS nodes FROM region_node_map GROUP BY region_code'
    );
    let regions = [];
    try {
      const [r] = await pool.execute('SELECT code, display_name FROM regions ORDER BY code');
      regions = r;
    } catch {
      // regions table optional
    }

    console.log('  ptero_nests:     ', nests[0].c);
    console.log('  ptero_eggs:      ', eggs[0].c);
    console.log('  ptero_nodes:     ', nodes[0].c, nodeLabel);
    console.log('  region_node_map: ', map.length, 'region(s)');
    if (map.length > 0) {
      map.forEach((r) => console.log('    -', r.region_code, '→', r.nodes, 'node(s)'));
    }
    console.log('  regions:        ', regions.length, 'code(s)');
    if (regions.length > 0) {
      regions.forEach((r) => console.log('    -', r.code, r.display_name ? `(${r.display_name})` : ''));
    }

    const gaps = [];
    if (Number(nests[0].c) === 0) gaps.push('ptero_nests is empty — run sync-pterodactyl-catalog.js --apply');
    if (Number(eggs[0].c) === 0) gaps.push('ptero_eggs is empty — run sync-pterodactyl-catalog.js --apply');
    if (Number(nodes[0].c) === 0) gaps.push('No enabled ptero_nodes — add node (see sql/seed-ptero-local.sql)');
    if (map.length === 0) gaps.push('region_node_map is empty — add region→node mapping (see sql/seed-ptero-local.sql)');

    const frontendRegions = ['us-east'];
    const mappedRegions = new Set(map.map((r) => r.region_code));
    const missing = frontendRegions.filter((r) => !mappedRegions.has(r));
    if (missing.length > 0) {
      gaps.push(`Frontend uses region us-east; missing in region_node_map: ${missing.join(', ')}`);
    }

    if (gaps.length > 0) {
      console.log('\n⚠ Gaps:\n');
      gaps.forEach((g) => console.log('  -', g));
      console.log('');
      process.exitCode = 1;
    } else {
      console.log('\n✅ Step 1 looks complete. Proceed to Step 2 (check-game-provisioning.js <game>).\n');
    }
  } catch (err) {
    console.error('Error:', err.message || err);
    if (err.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n  → Run MySQL schema (e.g. sql/app_core.sql) to create tables.');
    }
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      console.log('\n  → Start MySQL and set api/.env (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE=app_core).');
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
