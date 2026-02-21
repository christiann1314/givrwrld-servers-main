#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const panelDbContainer = process.env.PANEL_DB_CONTAINER || 'pterodactyl-mariadb-1';

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

function runPanelSql({ container, user, password, database, sql }) {
  const args = ['exec', container, 'mariadb', `-u${user}`, `-p${password}`, database, '-N', '-e', sql];
  return shellOrThrow('docker', args, 'Panel SQL query');
}

function parseRows(text, expectedColumns) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cols = line.split('\t');
      while (cols.length < expectedColumns) cols.push('');
      return cols;
    });
}

function pickDockerImage(dockerImagesRaw) {
  if (!dockerImagesRaw) return '';
  try {
    const parsed = JSON.parse(dockerImagesRaw);
    if (parsed && typeof parsed === 'object') {
      const values = Object.values(parsed).filter((v) => typeof v === 'string' && v.trim().length > 0);
      if (values.length > 0) return String(values[0]).replace(/\\\//g, '/');
    }
  } catch {
    // not JSON; use raw value
  }
  return String(dockerImagesRaw).replace(/\\\//g, '/');
}

function chooseEggForGame(game, eggs) {
  const strategies = {
    minecraft: [/paper/i, /vanilla minecraft/i, /forge/i, /sponge/i],
    rust: [/^rust$/i, /\brust\b/i],
    ark: [/ark.*survival/i, /\bark\b/i],
    terraria: [/terraria/i],
    factorio: [/factorio/i],
    palworld: [/palworld/i],
    mindustry: [/mindustry/i],
    rimworld: [/rimworld/i],
    'vintage-story': [/vintage/i],
    teeworlds: [/teeworlds/i],
    'among-us': [/among\s*us/i],
    veloren: [/veloren/i],
  };

  const patterns = strategies[game] || [new RegExp(game.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')];
  for (const pattern of patterns) {
    const match = eggs.find((egg) => pattern.test(egg.name));
    if (match) return match;
  }
  return null;
}

async function main() {
  console.log('🐉 Pterodactyl Catalog Sync');
  console.log('===========================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no DB writes)' : 'APPLY (writes enabled)'}`);
  console.log(`Panel DB Container: ${panelDbContainer}`);

  const envOutput = shellOrThrow(
    'docker',
    ['inspect', '-f', '{{range .Config.Env}}{{println .}}{{end}}', panelDbContainer],
    'Inspect panel DB container env'
  );
  const envMap = parseContainerEnv(envOutput);

  const panelDbUser = process.env.PANEL_DB_USER || envMap.get('MYSQL_USER') || 'pterodactyl';
  const panelDbPassword = process.env.PANEL_DB_PASSWORD || envMap.get('MYSQL_PASSWORD');
  const panelDbName = process.env.PANEL_DB_DATABASE || envMap.get('MYSQL_DATABASE') || 'panel';

  if (!panelDbPassword) {
    throw new Error(
      'Panel DB password not found. Set PANEL_DB_PASSWORD in api/.env or ensure MYSQL_PASSWORD exists in the container env.'
    );
  }

  const nestsRaw = runPanelSql({
    container: panelDbContainer,
    user: panelDbUser,
    password: panelDbPassword,
    database: panelDbName,
    sql: "SELECT id,name,COALESCE(description,'') FROM nests ORDER BY id;",
  });
  const eggsRaw = runPanelSql({
    container: panelDbContainer,
    user: panelDbUser,
    password: panelDbPassword,
    database: panelDbName,
    sql: "SELECT id,nest_id,name,COALESCE(description,''),COALESCE(startup,''),COALESCE(docker_images,'') FROM eggs ORDER BY nest_id,id;",
  });

  const nests = parseRows(nestsRaw, 3).map(([id, name, description]) => ({
    pteroNestId: Number(id),
    name: String(name || '').trim(),
    description: String(description || '').trim(),
  }));

  const eggs = parseRows(eggsRaw, 6).map(([id, nestId, name, description, startup, dockerImages]) => ({
    pteroEggId: Number(id),
    pteroNestId: Number(nestId),
    name: String(name || '').trim(),
    description: String(description || '').trim(),
    startupCmd: String(startup || '').trim(),
    dockerImage: pickDockerImage(dockerImages),
  }));

  console.log(`Found ${nests.length} nests and ${eggs.length} eggs in panel DB.`);

  const conn = await pool.getConnection();
  try {
    if (!isDryRun) {
      await conn.beginTransaction();
    }

    for (const nest of nests) {
      if (!isDryRun) {
        await conn.execute(
          `INSERT INTO ptero_nests (ptero_nest_id, name, description)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             description = VALUES(description)`,
          [nest.pteroNestId, nest.name, nest.description || null]
        );
      }
    }

    for (const egg of eggs) {
      if (!isDryRun) {
        await conn.execute(
          `INSERT INTO ptero_eggs (ptero_egg_id, ptero_nest_id, name, docker_image, startup_cmd, description)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             ptero_nest_id = VALUES(ptero_nest_id),
             name = VALUES(name),
             docker_image = VALUES(docker_image),
             startup_cmd = VALUES(startup_cmd),
             description = VALUES(description)`,
          [
            egg.pteroEggId,
            egg.pteroNestId,
            egg.name,
            egg.dockerImage || 'ghcr.io/pterodactyl/yolks:debian',
            egg.startupCmd || null,
            egg.description || null,
          ]
        );
      }
    }

    const [plans] = await conn.execute(
      `SELECT id, game, ptero_egg_id
       FROM plans
       WHERE item_type = 'game'
       ORDER BY game, id`
    );

    const byGame = new Map();
    for (const row of plans) {
      const game = String(row.game || '').toLowerCase();
      if (!game) continue;
      if (!byGame.has(game)) byGame.set(game, []);
      byGame.get(game).push(row);
    }

    const mapped = [];
    const unsupported = [];

    for (const [game, gamePlans] of byGame.entries()) {
      const chosenEgg = chooseEggForGame(game, eggs);
      if (!chosenEgg) {
        unsupported.push(game);
        continue;
      }

      const needsDefaultMap = gamePlans.some((p) => !Number(p.ptero_egg_id || 0));
      if (needsDefaultMap && !isDryRun) {
        await conn.execute(
          `UPDATE plans
           SET ptero_egg_id = ?
           WHERE item_type = 'game'
             AND game = ?
             AND (ptero_egg_id IS NULL OR ptero_egg_id = 0)`,
          [chosenEgg.pteroEggId, game]
        );
      }

      mapped.push({ game, eggId: chosenEgg.pteroEggId, eggName: chosenEgg.name, changed: needsDefaultMap });
    }

    if (!isDryRun) {
      await conn.commit();
    }

    console.log('\n✅ Sync Summary');
    console.log('---------------');
    console.log(`Nests synced: ${nests.length}`);
    console.log(`Eggs synced: ${eggs.length}`);
    console.log(`Games mapped: ${mapped.length}`);
    if (mapped.length > 0) {
      mapped.forEach((m) =>
        console.log(`- ${m.game} -> egg ${m.eggId} (${m.eggName})${m.changed ? '' : ' [unchanged]'}`)
      );
    }
    if (unsupported.length > 0) {
      console.log(`\n⚠ Unsupported games (no matching egg found in panel): ${unsupported.join(', ')}`);
    }

    if (isDryRun) {
      console.log('\nDRY RUN complete. Re-run with --apply to write changes.');
    }
  } catch (error) {
    if (!isDryRun) {
      try {
        await conn.rollback();
      } catch {
        // ignore rollback errors
      }
    }
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`\n❌ Sync failed: ${error.message}`);
  process.exit(1);
});
