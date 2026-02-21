#!/usr/bin/env node
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

const variantCatalog = [
  {
    game: 'rust',
    sourceEggName: 'Rust',
    variants: [
      { slug: 'vanilla', eggName: 'Rust Vanilla', description: 'Pure Rust dedicated server runtime.' },
      { slug: 'oxide', eggName: 'Rust Oxide (uMod)', description: 'Rust runtime prepared for Oxide/uMod workflows.' },
      { slug: 'carbon', eggName: 'Rust Carbon', description: 'Rust runtime prepared for Carbon framework workflows.' },
    ],
  },
  {
    game: 'ark',
    sourceEggName: 'Ark: Survival Evolved',
    variants: [
      { slug: 'vanilla', eggName: 'ARK Vanilla', description: 'Standard ARK Survival Evolved server runtime.' },
      { slug: 'primal-fear-ready', eggName: 'ARK Primal Fear Ready', description: 'ARK runtime tuned for larger overhaul modpacks.' },
      { slug: 'pve-cluster-ready', eggName: 'ARK PvE Cluster Ready', description: 'ARK runtime profile for cluster and PvE-first communities.' },
    ],
  },
  {
    game: 'terraria',
    sourceEggName: 'Terraria',
    variants: [
      { slug: 'vanilla', eggName: 'Terraria Vanilla', description: 'Standard Terraria dedicated server runtime.' },
      { slug: 'tmodloader', eggName: 'Terraria tModLoader', description: 'Terraria runtime profile for tModLoader communities.' },
      { slug: 'calamity-ready', eggName: 'Terraria Calamity Ready', description: 'Terraria runtime profile for Calamity-focused servers.' },
    ],
  },
  {
    game: 'factorio',
    sourceEggName: 'Factorio',
    variants: [
      { slug: 'vanilla', eggName: 'Factorio Vanilla', description: 'Standard Factorio dedicated server runtime.' },
      { slug: 'space-age-ready', eggName: 'Factorio Space Age Ready', description: 'Factorio runtime profile for expansion-heavy play.' },
      { slug: 'bobs-angels-ready', eggName: "Factorio Bob's+Angel's Ready", description: "Factorio runtime profile for Bob's/Angel's ecosystems." },
    ],
  },
  {
    game: 'palworld',
    sourceEggName: 'Palworld',
    variants: [
      { slug: 'vanilla', eggName: 'Palworld Vanilla', description: 'Standard Palworld dedicated server runtime.' },
      { slug: 'community-plus', eggName: 'Palworld Community Plus', description: 'Palworld runtime profile for larger community worlds.' },
      { slug: 'hardcore', eggName: 'Palworld Hardcore', description: 'Palworld runtime profile for higher difficulty communities.' },
    ],
  },
  {
    game: 'mindustry',
    sourceEggName: 'Mindustry',
    variants: [
      { slug: 'vanilla', eggName: 'Mindustry Vanilla', description: 'Standard Mindustry server runtime.' },
      { slug: 'pvp', eggName: 'Mindustry PvP', description: 'Mindustry runtime profile for competitive PvP sessions.' },
      { slug: 'survival', eggName: 'Mindustry Survival', description: 'Mindustry runtime profile for co-op survival servers.' },
    ],
  },
  {
    game: 'rimworld',
    sourceEggName: 'Rimworld',
    variants: [
      { slug: 'vanilla', eggName: 'Rimworld Vanilla', description: 'Standard Rimworld multiplayer runtime.' },
      { slug: 'multiplayer-ready', eggName: 'Rimworld Multiplayer Ready', description: 'Rimworld runtime profile for heavier multiplayer setups.' },
    ],
  },
  {
    game: 'vintage-story',
    sourceEggName: 'Vintage Story',
    variants: [
      { slug: 'vanilla', eggName: 'Vintage Story Vanilla', description: 'Standard Vintage Story server runtime.' },
      { slug: 'primitive-plus', eggName: 'Vintage Story Primitive Plus', description: 'Vintage Story profile for immersive survival communities.' },
    ],
  },
  {
    game: 'teeworlds',
    sourceEggName: 'Teeworlds',
    variants: [
      { slug: 'vanilla', eggName: 'Teeworlds Vanilla', description: 'Standard Teeworlds server runtime.' },
      { slug: 'instagib', eggName: 'Teeworlds Instagib', description: 'Teeworlds profile for fast Instagib rotations.' },
    ],
  },
  {
    game: 'among-us',
    sourceEggName: 'Among Us',
    variants: [
      { slug: 'vanilla', eggName: 'Among Us Vanilla', description: 'Standard Among Us private lobby runtime.' },
      { slug: 'proximity-chat-ready', eggName: 'Among Us Proximity Chat Ready', description: 'Among Us runtime profile for social/proximity-based communities.' },
    ],
  },
  {
    game: 'veloren',
    sourceEggName: 'Veloren',
    variants: [
      { slug: 'vanilla', eggName: 'Veloren Vanilla', description: 'Standard Veloren dedicated server runtime.' },
      { slug: 'rp-realm', eggName: 'Veloren RP Realm', description: 'Veloren runtime profile for roleplay-focused communities.' },
    ],
  },
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

