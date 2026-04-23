#!/usr/bin/env node
/**
 * Clones optional “profile” eggs from a base Panel egg into nest "GIVRwrld Games".
 * Stock SKUs now use the base egg directly (see seed-game-variant-plans.js).
 * This script is kept for future variant eggs; the catalog may be empty.
 */
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const panelDbContainer = process.env.PANEL_DB_CONTAINER || 'pterodactyl-mariadb-1';
const targetNestName = 'GIVRwrld Games';
const isDryRun = process.argv.includes('--dry-run');

/** @type {Array<{ game: string, sourceEggName: string, variants: Array<{ slug: string, eggName: string, description: string }> }>} */
const variantCatalog = [];

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
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

function getEggIdByName({ user, password, database, eggName }) {
  const sql = `
    SELECT id
    FROM eggs
    WHERE name = '${escapeSql(eggName)}'
    ORDER BY id ASC
    LIMIT 1;
  `;
  const raw = runPanelSql({ user, password, database, sql });
  return Number(raw || 0);
}

function ensureTargetEgg({ user, password, database, nestId, eggName }) {
  const checkSql = `
    SELECT id
    FROM eggs
    WHERE nest_id = ${nestId}
      AND name = '${escapeSql(eggName)}'
    LIMIT 1;
  `;
  const existing = runPanelSql({ user, password, database, sql: checkSql });
  if (existing) {
    return { id: Number(existing.trim()), created: false };
  }

  const dockerImages = JSON.stringify({ Debian: 'ghcr.io/pterodactyl/yolks:debian' }).replace(/\//g, '\\/');
  const insertSql = `
    INSERT INTO eggs (
      uuid, nest_id, author, name, description, features, docker_images, file_denylist,
      config_files, config_startup, config_logs, config_stop, startup,
      script_container, script_entry, script_is_privileged, force_outgoing_ip, created_at, updated_at
    )
    VALUES (
      UUID(), ${nestId}, 'givrwrld', '${escapeSql(eggName)}',
      '${escapeSql(`${eggName} variant runtime`) }',
      '[]', '${escapeSql(dockerImages)}', '[]',
      '{}', '{"done":"Server started"}', '{}', '^C', 'bash -lc "echo Preparing server; while true; do sleep 60; done"',
      'ghcr.io/pterodactyl/installers:debian', 'bash', 0, 0, NOW(), NOW()
    );
    SELECT LAST_INSERT_ID();
  `;
  const inserted = runPanelSql({ user, password, database, sql: insertSql });
  return { id: Number((inserted || '').split(/\r?\n/).pop()), created: true };
}

function cloneEggTemplate({ user, password, database, sourceEggId, targetEggId, targetDescription }) {
  const updateSql = `
    UPDATE eggs t
    JOIN eggs s ON s.id = ${sourceEggId}
    SET
      t.description = '${escapeSql(targetDescription)}',
      t.features = s.features,
      t.docker_images = s.docker_images,
      t.file_denylist = s.file_denylist,
      t.config_files = s.config_files,
      t.config_startup = s.config_startup,
      t.config_logs = s.config_logs,
      t.config_stop = s.config_stop,
      t.startup = s.startup,
      t.script_container = s.script_container,
      t.script_entry = s.script_entry,
      t.script_is_privileged = s.script_is_privileged,
      t.script_install = s.script_install,
      t.force_outgoing_ip = s.force_outgoing_ip,
      t.updated_at = NOW()
    WHERE t.id = ${targetEggId};
  `;
  runPanelSql({ user, password, database, sql: updateSql });

  runPanelSql({
    user,
    password,
    database,
    sql: `DELETE FROM egg_variables WHERE egg_id = ${targetEggId};`,
  });
  runPanelSql({
    user,
    password,
    database,
    sql: `
      INSERT INTO egg_variables (
        egg_id, name, description, env_variable, default_value, user_viewable, user_editable, rules, created_at, updated_at
      )
      SELECT
        ${targetEggId}, name, description, env_variable, default_value, user_viewable, user_editable, rules, NOW(), NOW()
      FROM egg_variables
      WHERE egg_id = ${sourceEggId};
    `,
  });
}

async function main() {
  console.log(`🥚 Create game variant eggs (${isDryRun ? 'DRY RUN' : 'APPLY'})`);
  const { user, password, database } = getPanelDbConfig();
  const nestId = ensureNest({ user, password, database, nestName: targetNestName });
  if (!nestId) {
    throw new Error(`Could not resolve/create "${targetNestName}" nest.`);
  }

  let createdCount = 0;
  let updatedCount = 0;
  for (const gameEntry of variantCatalog) {
    const sourceEggId = getEggIdByName({ user, password, database, eggName: gameEntry.sourceEggName });
    if (!sourceEggId) {
      throw new Error(`Source egg "${gameEntry.sourceEggName}" not found for game ${gameEntry.game}.`);
    }

    for (const variant of gameEntry.variants) {
      if (isDryRun) {
        console.log(`Would ensure ${variant.eggName} from source ${gameEntry.sourceEggName} (${sourceEggId}).`);
        continue;
      }

      const ensured = ensureTargetEgg({
        user,
        password,
        database,
        nestId,
        eggName: variant.eggName,
      });
      if (ensured.created) createdCount += 1;
      cloneEggTemplate({
        user,
        password,
        database,
        sourceEggId,
        targetEggId: ensured.id,
        targetDescription: variant.description,
      });
      updatedCount += 1;
      console.log(`✅ ${variant.eggName} (id=${ensured.id}) cloned from ${gameEntry.sourceEggName} (${sourceEggId})`);
    }
  }

  console.log(`\nDone. Created: ${createdCount}, updated: ${updatedCount}`);
  console.log('Next: run `npm run ptero:sync` and seed variant plans.');
}

main().catch((error) => {
  console.error(`\n❌ Variant egg creation failed: ${error.message}`);
  process.exit(1);
});
