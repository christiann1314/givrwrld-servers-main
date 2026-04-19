#!/usr/bin/env node

/**
 * Sync Panel eggs to match the GIVRwrld internal catalog.
 *
 * For each egg in the catalog, this script:
 * 1. Fetches the current egg definition from the Panel API
 * 2. Compares docker_image, startup, and config against the catalog
 * 3. Updates the Panel egg via PATCH if anything drifts
 * 4. Optionally updates the ptero_eggs table in app_core
 *
 * Usage:
 *   node api/scripts/sync-panel-eggs.js [--dry-run] [--egg-id=N]
 *
 * Flags:
 *   --dry-run   Show what would change without applying
 *   --egg-id=N  Only sync a specific egg ID
 */

import '../config/loadEnv.js';
import { EGG_CATALOG, getSupportedEggIds } from '../config/eggCatalog.js';
import pool from '../config/database.js';

const PANEL_URL = process.env.PANEL_URL;
const PANEL_APP_KEY = process.env.PANEL_APP_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_EGG = process.argv.find((a) => a.startsWith('--egg-id='));
const SPECIFIC_EGG_ID = SPECIFIC_EGG ? Number(SPECIFIC_EGG.split('=')[1]) : null;

if (!PANEL_URL || !PANEL_APP_KEY) {
  console.error('PANEL_URL and PANEL_APP_KEY must be set in environment');
  process.exit(1);
}

async function panelGet(path) {
  const res = await fetch(`${PANEL_URL}/api/application${path}`, {
    headers: {
      Authorization: `Bearer ${PANEL_APP_KEY}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Panel GET ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function panelPatch(path, body) {
  const res = await fetch(`${PANEL_URL}/api/application${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${PANEL_APP_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Panel PATCH ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function getNestIdForEgg(eggId) {
  const [rows] = await pool.execute(
    'SELECT ptero_nest_id FROM ptero_eggs WHERE ptero_egg_id = ?',
    [eggId],
  );
  return rows[0]?.ptero_nest_id ?? null;
}

async function syncEgg(eggId, catalog) {
  const nestId = await getNestIdForEgg(eggId);
  if (!nestId) {
    console.log(`  [SKIP] Egg ${eggId} (${catalog.displayName}): no nest_id in ptero_eggs table`);
    return { status: 'skipped', reason: 'no_nest_id' };
  }

  let panelEgg;
  try {
    const data = await panelGet(`/nests/${nestId}/eggs/${eggId}?include=variables`);
    panelEgg = data?.attributes || {};
  } catch (err) {
    console.log(`  [ERROR] Egg ${eggId} (${catalog.displayName}): ${err.message}`);
    return { status: 'error', reason: err.message };
  }

  const diffs = [];

  const panelImage = (panelEgg.docker_image || '').replace(/\\\//g, '/').trim();
  if (panelImage !== catalog.defaultImage) {
    diffs.push({
      field: 'docker_image',
      panel: panelImage,
      catalog: catalog.defaultImage,
    });
  }

  const panelDone = panelEgg.config?.startup?.done || '';
  if (catalog.configStartupDone && panelDone !== catalog.configStartupDone) {
    diffs.push({
      field: 'config.startup.done',
      panel: panelDone,
      catalog: catalog.configStartupDone,
    });
  }

  const panelStop = panelEgg.config?.stop || '';
  if (catalog.stopCommand && panelStop !== catalog.stopCommand) {
    diffs.push({
      field: 'config.stop',
      panel: panelStop,
      catalog: catalog.stopCommand,
    });
  }

  if (diffs.length === 0) {
    console.log(`  [OK] Egg ${eggId} (${catalog.displayName}): in sync`);
    return { status: 'ok' };
  }

  console.log(`  [DRIFT] Egg ${eggId} (${catalog.displayName}):`);
  for (const d of diffs) {
    console.log(`    ${d.field}: "${d.panel}" → "${d.catalog}"`);
  }

  if (DRY_RUN) {
    console.log(`    (dry-run: no changes applied)`);
    return { status: 'drift', diffs };
  }

  try {
    const patchBody = {};

    const imageDiff = diffs.find((d) => d.field === 'docker_image');
    if (imageDiff) {
      patchBody.docker_image = catalog.defaultImage;

      const dockerImagesObj = {};
      for (const [label, img] of Object.entries(catalog.dockerImages)) {
        dockerImagesObj[label] = img;
      }
      patchBody.docker_images = dockerImagesObj;
    }

    const configDiffs = diffs.filter((d) => d.field.startsWith('config.'));
    if (configDiffs.length > 0) {
      const newConfig = { ...(panelEgg.config || {}) };
      for (const d of configDiffs) {
        if (d.field === 'config.startup.done') {
          newConfig.startup = { ...(newConfig.startup || {}), done: catalog.configStartupDone };
        }
        if (d.field === 'config.stop') {
          newConfig.stop = catalog.stopCommand;
        }
      }
      patchBody.config = newConfig;
    }

    if (Object.keys(patchBody).length > 0) {
      await panelPatch(`/nests/${nestId}/eggs/${eggId}`, patchBody);
      console.log(`    [UPDATED] Panel egg patched`);
    }

    if (imageDiff) {
      await pool.execute(
        'UPDATE ptero_eggs SET docker_image = ? WHERE ptero_egg_id = ?',
        [catalog.defaultImage, eggId],
      );
      console.log(`    [UPDATED] ptero_eggs table updated`);
    }

    return { status: 'updated', diffs };
  } catch (err) {
    console.log(`    [ERROR] Failed to update: ${err.message}`);
    return { status: 'error', reason: err.message };
  }
}

async function main() {
  console.log('=== GIVRwrld Egg Catalog Sync ===');
  console.log(`Panel: ${PANEL_URL}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  const eggIds = SPECIFIC_EGG_ID ? [SPECIFIC_EGG_ID] : getSupportedEggIds();
  const results = { ok: 0, drift: 0, updated: 0, skipped: 0, error: 0 };

  for (const eggId of eggIds) {
    const catalog = EGG_CATALOG[eggId];
    if (!catalog) {
      console.log(`  [SKIP] Egg ${eggId}: not in catalog`);
      results.skipped++;
      continue;
    }
    const result = await syncEgg(eggId, catalog);
    results[result.status] = (results[result.status] || 0) + 1;
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`  OK (in sync):  ${results.ok}`);
  console.log(`  Drift found:   ${results.drift}`);
  console.log(`  Updated:       ${results.updated}`);
  console.log(`  Skipped:       ${results.skipped}`);
  console.log(`  Errors:        ${results.error}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
