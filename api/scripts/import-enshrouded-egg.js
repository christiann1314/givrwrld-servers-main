#!/usr/bin/env node
/**
 * Import the Enshrouded egg into the Pterodactyl Panel DB.
 * Requires: Panel MariaDB reachable (e.g. localhost:3306 when Docker exposes it).
 * Set in api/.env: PANEL_DB_HOST=localhost, PANEL_DB_PORT=3306, PANEL_DB_USER=pterodactyl, PANEL_DB_PASSWORD=..., PANEL_DB_DATABASE=panel
 * Or leave unset to use Docker inspect for password (container must be running).
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createConnection } from 'mysql2/promise';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const EGG_JSON_PATH = join(__dirname, 'eggs', 'egg-enshrouded.json');
const NEST_NAME = 'GIVRwrld Games';
const EGG_NAME = 'Enshrouded';
const panelDbContainer = process.env.PANEL_DB_CONTAINER || 'pterodactyl-mariadb-1';

function parseContainerEnv(text) {
  const m = new Map();
  (text || '').split(/\r?\n/).forEach((line) => {
    const i = line.indexOf('=');
    if (i > 0) m.set(line.slice(0, i), line.slice(i + 1));
  });
  return m;
}

async function getPanelConfig() {
  let host = process.env.PANEL_DB_HOST || 'localhost';
  let port = Number(process.env.PANEL_DB_PORT || 3306);
  let user = process.env.PANEL_DB_USER || 'pterodactyl';
  let password = process.env.PANEL_DB_PASSWORD;
  const database = process.env.PANEL_DB_DATABASE || 'panel';

  if (!password) {
    const out = spawnSync('docker', [
      'inspect', '-f', '{{range .Config.Env}}{{println .}}{{end}}', panelDbContainer
    ], { encoding: 'utf8' });
    if (out.status !== 0) throw new Error('Panel DB password not set. Set PANEL_DB_PASSWORD in api/.env or run Docker with Panel DB container.');
    const env = parseContainerEnv(out.stdout);
    password = env.get('MYSQL_PASSWORD');
    if (!password) throw new Error('Could not get MYSQL_PASSWORD from Panel DB container.');
  }

  return { host, port, user, password, database };
}

async function ensureNest(conn, nestName) {
  const [rows] = await conn.execute('SELECT id FROM nests WHERE name = ? LIMIT 1', [nestName]);
  if (rows.length > 0) return rows[0].id;
  await conn.execute(
    `INSERT INTO nests (uuid, author, name, description, created_at, updated_at)
     VALUES (UUID(), 'givrwrld', ?, 'GIVRwrld custom game eggs', NOW(), NOW())`,
    [nestName]
  );
  const [r] = await conn.execute('SELECT LAST_INSERT_ID() AS id');
  return r[0].id;
}

async function eggExists(conn, eggName) {
  const [rows] = await conn.execute('SELECT id FROM eggs WHERE name = ? LIMIT 1', [eggName]);
  return rows.length > 0 ? rows[0].id : null;
}

async function main() {
  console.log('🥚 Import Enshrouded egg into Pterodactyl Panel');
  const config = await getPanelConfig();
  const conn = await createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  const egg = JSON.parse(readFileSync(EGG_JSON_PATH, 'utf8'));
  const existingId = await eggExists(conn, EGG_NAME);
  if (existingId) {
    console.log(`✅ Egg "${EGG_NAME}" already exists (id=${existingId}). Skipping import.`);
    await conn.end();
    return;
  }

  const nestId = await ensureNest(conn, NEST_NAME);
  console.log(`✅ Nest: ${NEST_NAME} (id=${nestId})`);

  const dockerImages = JSON.stringify(egg.docker_images || {});
  const features = JSON.stringify(egg.features || []);
  const fileDenylist = JSON.stringify(egg.file_denylist || []);
  const configFiles = typeof egg.config?.files === 'string' ? egg.config.files : JSON.stringify(egg.config?.files || {});
  const configStartup = typeof egg.config?.startup === 'string' ? egg.config.startup : JSON.stringify(egg.config?.startup || {});
  const configLogs = typeof egg.config?.logs === 'string' ? egg.config.logs : JSON.stringify(egg.config?.logs || {});
  const configStop = egg.config?.stop ?? '^C';
  const inst = egg.scripts?.installation || {};
  const scriptInstall = inst.script || '';
  const scriptContainer = inst.container || 'ghcr.io/pterodactyl/installers:debian';
  const scriptEntry = inst.entrypoint || 'bash';

  await conn.execute(
    `INSERT INTO eggs (
      uuid, nest_id, author, name, description, features, docker_images, file_denylist,
      config_files, config_startup, config_logs, config_stop, startup,
      script_container, script_entry, script_is_privileged, script_install, force_outgoing_ip, created_at, updated_at
    ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, NOW(), NOW())`,
    [
      nestId,
      egg.author || 'givrwrld',
      EGG_NAME,
      egg.description || 'Enshrouded dedicated server',
      features,
      dockerImages,
      fileDenylist,
      configFiles,
      configStartup,
      configLogs,
      configStop,
      egg.startup || '',
      scriptContainer,
      scriptEntry,
      scriptInstall,
    ]
  );

  const [r] = await conn.execute('SELECT LAST_INSERT_ID() AS id');
  const eggId = r[0].id;
  console.log(`✅ Inserted egg "${EGG_NAME}" (id=${eggId})`);

  const variables = egg.variables || [];
  for (const v of variables) {
    await conn.execute(
      `INSERT INTO egg_variables (egg_id, name, description, env_variable, default_value, user_viewable, user_editable, rules, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        eggId,
        v.name || '',
        v.description || '',
        v.env_variable || '',
        v.default_value ?? '',
        v.user_viewable ? 1 : 0,
        v.user_editable ? 1 : 0,
        v.rules || 'nullable|string',
      ]
    );
  }
  console.log(`✅ Inserted ${variables.length} egg variables`);

  await conn.end();
  console.log('\nNext: run node api/scripts/create-game-variant-eggs.js then npm run db:seed:catalog and node api/scripts/seed-game-variant-plans.js');
  console.log('Add allocations for ports 15636 and 15637 on your node in Panel → Nodes → Allocations.');
}

main().catch((err) => {
  console.error('❌ Import failed:', err.message);
  process.exit(1);
});
