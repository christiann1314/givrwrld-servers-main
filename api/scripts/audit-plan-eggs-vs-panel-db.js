#!/usr/bin/env node
/**
 * Compare app_core.plans.ptero_egg_id (+ ptero_eggs) to Panel MariaDB eggs table (source of truth).
 * Requires docker + Panel DB container (same as sync-pterodactyl-catalog.js).
 *
 * Usage: node api/scripts/audit-plan-eggs-vs-panel-db.js
 */
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const panelDbContainer = process.env.PANEL_DB_CONTAINER || 'pterodactyl-mariadb-1';
const useSudoDocker = ['1', 'true', 'yes'].includes(String(process.env.DOCKER_USE_SUDO || '').toLowerCase());

function shellOrThrow(command, args, label) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || '').trim();
    throw new Error(`${label} failed${details ? `: ${details}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function dockerCmd(args, label) {
  if (useSudoDocker) {
    return shellOrThrow('sudo', ['docker', ...args], label);
  }
  return shellOrThrow('docker', args, label);
}

function parseContainerEnv(text) {
  const envMap = new Map();
  text.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf('=');
    if (idx <= 0) return;
    envMap.set(line.slice(0, idx), line.slice(idx + 1));
  });
  return envMap;
}

function runPanelSql({ container, user, password, database, sql }) {
  const args = ['exec', container, 'mariadb', `-u${user}`, `-p${password}`, database, '-N', '-e', sql];
  return dockerCmd(args, 'Panel SQL query');
}

async function main() {
  const envOutput = dockerCmd(
    ['inspect', '-f', '{{range .Config.Env}}{{println .}}{{end}}', panelDbContainer],
    'Inspect panel DB container env'
  );
  const envMap = parseContainerEnv(envOutput);
  const panelDbUser = process.env.PANEL_DB_USER || envMap.get('MYSQL_USER') || 'pterodactyl';
  const panelDbPassword = process.env.PANEL_DB_PASSWORD || envMap.get('MYSQL_PASSWORD');
  const panelDbName = process.env.PANEL_DB_DATABASE || envMap.get('MYSQL_DATABASE') || 'panel';
  if (!panelDbPassword) {
    throw new Error('Panel DB password missing (PANEL_DB_PASSWORD or container MYSQL_PASSWORD)');
  }

  const idsRaw = runPanelSql({
    container: panelDbContainer,
    user: panelDbUser,
    password: panelDbPassword,
    database: panelDbName,
    sql: 'SELECT id FROM eggs ORDER BY id;',
  });
  const panelEggIds = new Set(
    idsRaw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n))
  );

  const [planEggAgg] = await pool.execute(
    `SELECT ptero_egg_id, COUNT(*) AS cnt
     FROM plans
     WHERE item_type = 'game' AND ptero_egg_id IS NOT NULL
     GROUP BY ptero_egg_id
     ORDER BY ptero_egg_id`
  );

  const [orphanPlans] = await pool.execute(
    `SELECT p.id, p.game, p.ptero_egg_id
     FROM plans p
     LEFT JOIN ptero_eggs e ON e.ptero_egg_id = p.ptero_egg_id
     WHERE p.item_type = 'game'
       AND p.ptero_egg_id IS NOT NULL
       AND e.ptero_egg_id IS NULL`
  );

  const [missingPanelPlans] = await pool.execute(
    `SELECT p.id, p.game, p.ptero_egg_id
     FROM plans p
     WHERE p.item_type = 'game'
       AND p.ptero_egg_id IS NOT NULL
       AND p.ptero_egg_id NOT IN (${panelEggIds.size ? [...panelEggIds].join(',') : '0'})`
  );

  const [catalogOrphans] = await pool.execute(
    `SELECT e.ptero_egg_id, e.name
     FROM ptero_eggs e
     WHERE e.ptero_egg_id NOT IN (${panelEggIds.size ? [...panelEggIds].join(',') : '0'})`
  );

  console.log('\n=== Panel DB (eggs table) ===');
  console.log(`Container: ${panelDbContainer}`);
  console.log(`Egg count: ${panelEggIds.size}`);
  if (panelEggIds.size > 0) {
    console.log(`Egg id range: ${Math.min(...panelEggIds)}–${Math.max(...panelEggIds)}`);
  }

  console.log('\n=== app_core plans (distinct ptero_egg_id) ===');
  for (const row of planEggAgg) {
    const id = Number(row.ptero_egg_id);
    const ok = panelEggIds.has(id);
    console.log(
      `  egg ${id}: ${row.cnt} plan(s) ${ok ? '✓ in Panel' : '✗ NOT IN PANEL'}`,
    );
  }

  if (orphanPlans.length) {
    console.log('\n⚠ Plans pointing at ptero_egg_id with NO row in app_core.ptero_eggs:');
    orphanPlans.forEach((r) => console.log(`  ${r.id} game=${r.game} egg=${r.ptero_egg_id}`));
  }

  if (missingPanelPlans.length) {
    console.log('\n✗ MAIN ISSUE: game plans reference egg IDs that do not exist in Panel eggs table:');
    missingPanelPlans.forEach((r) => console.log(`  plan ${r.id} game=${r.game} mysql_egg=${r.ptero_egg_id}`));
  } else {
    console.log('\n✓ No game plans reference egg IDs outside Panel.');
  }

  if (catalogOrphans.length) {
    console.log('\n⚠ app_core.ptero_eggs rows not in Panel (stale catalog; sync will refresh):');
    catalogOrphans.forEach((r) => console.log(`  egg ${r.ptero_egg_id} ${r.name}`));
  }

  const badCount = missingPanelPlans.length + orphanPlans.length;
  process.exitCode = badCount > 0 ? 1 : 0;
  await pool.end();
}

main().catch(async (err) => {
  console.error('\n❌', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
