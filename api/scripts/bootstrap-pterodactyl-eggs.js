#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const panelDbContainer = process.env.PANEL_DB_CONTAINER || 'pterodactyl-mariadb-1';
const isDryRun = process.argv.includes('--dry-run');

const gameEggNames = [
  'Minecraft Vanilla',
  'Minecraft Paper',
  'Minecraft Purpur',
  'Minecraft Fabric',
  'Minecraft Forge',
  'Palworld',
  'Terraria',
  'Factorio',
  'Mindustry',
  'Rimworld',
  'Vintage Story',
  'Teeworlds',
  'Among Us',
  'Veloren',
];

function shellOrThrow(command, args, label) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || '').trim();
    throw new Error(`${label} failed${details ? `: ${details}` : ''}`);
  }
  return (result.stdout || '').trim();
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

function getPanelDbConfig() {
  const envOutput = shellOrThrow(
    'docker',
    ['inspect', '-f', '{{range .Config.Env}}{{println .}}{{end}}', panelDbContainer],
    'Inspect panel DB container env'
  );
  const envMap = parseContainerEnv(envOutput);
  const user = process.env.PANEL_DB_USER || envMap.get('MYSQL_USER') || 'pterodactyl';
  const password = process.env.PANEL_DB_PASSWORD || envMap.get('MYSQL_PASSWORD');
  const database = process.env.PANEL_DB_DATABASE || envMap.get('MYSQL_DATABASE') || 'panel';
  if (!password) {
    throw new Error('Panel DB password is missing. Set PANEL_DB_PASSWORD in api/.env.');
  }
  return { user, password, database };
}

function escapeSql(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function runPanelSql({ user, password, database, sql }) {
  return shellOrThrow(
    'docker',
    ['exec', panelDbContainer, 'mariadb', `-u${user}`, `-p${password}`, database, '-N', '-e', sql],
    'Panel SQL query'
  );
}

function ensureNest({ user, password, database, nestName }) {
  const checkSql = `SELECT id FROM nests WHERE name = '${escapeSql(nestName)}' LIMIT 1;`;
  const existing = runPanelSql({ user, password, database, sql: checkSql });
  if (existing) return Number(existing.trim());

  const insertSql = `
    INSERT INTO nests (uuid, author, name, description, created_at, updated_at)
    VALUES (UUID(), 'givrwrld', '${escapeSql(nestName)}', 'GIVRwrld custom game eggs', NOW(), NOW());
    SELECT LAST_INSERT_ID();
  `;
  const inserted = runPanelSql({ user, password, database, sql: insertSql });
  return Number((inserted || '').split(/\r?\n/).pop());
}

function ensureEgg({ user, password, database, nestId, eggName }) {
  const checkSql = `
    SELECT id
    FROM eggs
    WHERE nest_id = ${nestId}
      AND name = '${escapeSql(eggName)}'
    LIMIT 1;
  `;
  const existing = runPanelSql({ user, password, database, sql: checkSql });
  if (existing) return { id: Number(existing.trim()), created: false };

  const dockerImages = JSON.stringify({ Debian: 'ghcr.io/pterodactyl/yolks:debian' }).replace(/\//g, '\\/');
  const startup = `bash -lc 'echo Starting ${eggName}; while true; do sleep 60; done'`;
  const description = `${eggName} custom runtime egg for GIVRwrld`;
  const insertSql = `
    INSERT INTO eggs (
      uuid, nest_id, author, name, description, features, docker_images, file_denylist,
      config_files, config_startup, config_logs, config_stop, startup,
      script_container, script_entry, script_is_privileged, force_outgoing_ip, created_at, updated_at
    )
    VALUES (
      UUID(), ${nestId}, 'givrwrld', '${escapeSql(eggName)}',
      '${escapeSql(description)}',
      '[]', '${escapeSql(dockerImages)}', '[]',
      '{}', '{"done":"Starting"}', '{}', '^C', '${escapeSql(startup)}',
      'ghcr.io/pterodactyl/installers:debian', 'bash', 0, 0, NOW(), NOW()
    );
    SELECT LAST_INSERT_ID();
  `;
  const inserted = runPanelSql({ user, password, database, sql: insertSql });
  return { id: Number((inserted || '').split(/\r?\n/).pop()), created: true };
}

async function main() {
  console.log('🥚 Bootstrap Pterodactyl custom eggs');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Panel DB Container: ${panelDbContainer}`);

  const { user, password, database } = getPanelDbConfig();
  const nestName = 'GIVRwrld Games';

  if (isDryRun) {
    console.log(`Would ensure nest "${nestName}" and eggs: ${gameEggNames.join(', ')}`);
    return;
  }

  const nestId = ensureNest({ user, password, database, nestName });
  if (!nestId) {
    throw new Error('Failed to resolve/create GIVRwrld Games nest.');
  }
  console.log(`✅ Nest ready: ${nestName} (id=${nestId})`);

  let createdCount = 0;
  for (const eggName of gameEggNames) {
    const result = ensureEgg({ user, password, database, nestId, eggName });
    if (result.created) {
      createdCount += 1;
      console.log(`+ created egg ${result.id}: ${eggName}`);
    } else {
      console.log(`= exists egg ${result.id}: ${eggName}`);
    }
  }

  console.log(`\nDone. Eggs created: ${createdCount}, total checked: ${gameEggNames.length}.`);
  console.log('Next: run `npm run ptero:sync` to map plans to these eggs.');
}

main().catch((error) => {
  console.error(`\n❌ Egg bootstrap failed: ${error.message}`);
  process.exit(1);
});

