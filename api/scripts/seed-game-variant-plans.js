#!/usr/bin/env node
/**
 * Upserts variant game plans (modded / profile SKUs) for every RAM tier we sell.
 * Pricing is defined here so re-runs work even after legacy base rows are deactivated.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const isDryRun = process.argv.includes('--dry-run');

/** Monthly base price before variant surcharge (USD). Keys must cover each game's tierRams. */
const PRICING = {
  rust: { 2: 9.99, 4: 12.99, 6: 15.49, 8: 18.99, 12: 26.99 },
  // ARK: 6 GB floor (see migration fix_ark_minimum_resources); no 2/4 GB SKUs.
  ark: { 6: 14.99, 8: 28.99, 12: 42.99 },
  terraria: { 2: 6.99, 4: 8.99, 6: 10.99, 8: 14.99, 12: 21.99 },
  factorio: { 2: 7.99, 4: 10.99, 6: 13.49, 8: 16.99, 12: 24.99 },
  // Palworld dedicated: practical floor 4 GB.
  palworld: { 4: 14.99, 6: 18.99, 8: 28.99, 12: 40.99 },
  mindustry: { 2: 5.99, 4: 7.99, 6: 9.49, 8: 12.99, 12: 18.99 },
  rimworld: { 4: 12.99, 6: 17.49, 8: 24.99, 12: 34.99 },
  'vintage-story': { 4: 11.99, 6: 15.49, 8: 19.99, 12: 28.99 },
  teeworlds: { 2: 4.99, 4: 5.99, 6: 6.99, 8: 8.99, 12: 12.99 },
  'among-us': { 4: 6.99, 6: 7.99, 8: 9.49, 12: 14.99 },
  veloren: { 4: 10.99, 6: 14.49, 8: 19.99, 12: 28.99 },
  enshrouded: { 6: 14.99, 8: 19.99, 12: 29.99 },
};

function vcoresForRam(ram) {
  if (ram >= 12) return 4;
  if (ram >= 8) return 3;
  if (ram >= 6) return 2;
  if (ram >= 4) return 2;
  return 1;
}

function ssdGbForRam(game, ram) {
  if (game === 'ark' && ram >= 6) return Math.max(ram * 10, 35);
  return ram * 10;
}

const variantCatalog = [
  {
    game: 'rust',
    sourceEggName: 'Rust',
    display: 'Rust',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      { slug: 'oxide', label: 'Oxide (uMod)', eggName: 'Rust Oxide (uMod)', surcharge: 3, minRam: 2, description: 'One-click Rust profile for Oxide/uMod communities.' },
      { slug: 'carbon', label: 'Carbon', eggName: 'Rust Carbon', surcharge: 4, minRam: 2, description: 'One-click Rust profile for Carbon framework communities.' },
    ],
  },
  {
    game: 'ark',
    sourceEggName: 'Ark: Survival Evolved',
    display: 'ARK',
    tierRams: [6, 8, 12],
    variants: [
      { slug: 'primal-fear-ready', label: 'Primal Fear Ready', eggName: 'ARK Primal Fear Ready', surcharge: 6, minRam: 6, description: 'One-click ARK profile for larger overhaul modpacks.' },
      { slug: 'pve-cluster-ready', label: 'PvE Cluster Ready', eggName: 'ARK PvE Cluster Ready', surcharge: 4, minRam: 6, description: 'One-click ARK profile for cluster/PvE-first communities.' },
    ],
  },
  {
    game: 'terraria',
    sourceEggName: 'Terraria',
    display: 'Terraria',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      { slug: 'tmodloader', label: 'tModLoader', eggName: 'Terraria tModLoader', surcharge: 3, minRam: 4, description: 'One-click tModLoader Terraria profile.' },
      { slug: 'calamity-ready', label: 'Calamity Ready', eggName: 'Terraria Calamity Ready', surcharge: 4, minRam: 4, description: 'One-click Calamity-ready Terraria profile.' },
    ],
  },
  {
    game: 'factorio',
    sourceEggName: 'Factorio',
    display: 'Factorio',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      { slug: 'space-age-ready', label: 'Space Age Ready', eggName: 'Factorio Space Age Ready', surcharge: 3, minRam: 4, description: 'One-click Space Age-ready Factorio profile.' },
      { slug: 'bobs-angels-ready', label: "Bob's+Angel's Ready", eggName: "Factorio Bob's+Angel's Ready", surcharge: 4, minRam: 4, description: "One-click Bob's/Angel's-ready Factorio profile." },
    ],
  },
  {
    game: 'palworld',
    sourceEggName: 'Palworld',
    display: 'Palworld',
    tierRams: [4, 6, 8, 12],
    variants: [
      { slug: 'community-plus', label: 'Community Plus', eggName: 'Palworld Community Plus', surcharge: 2, minRam: 4, description: 'One-click Palworld profile for larger communities.' },
      { slug: 'hardcore', label: 'Hardcore', eggName: 'Palworld Hardcore', surcharge: 1, minRam: 4, description: 'One-click Palworld hardcore-focused profile.' },
    ],
  },
  {
    game: 'mindustry',
    sourceEggName: 'Mindustry',
    display: 'Mindustry',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      { slug: 'pvp', label: 'PvP', eggName: 'Mindustry PvP', surcharge: 1, minRam: 4, description: 'One-click Mindustry PvP profile.' },
      { slug: 'survival', label: 'Survival', eggName: 'Mindustry Survival', surcharge: 1.5, minRam: 4, description: 'One-click Mindustry survival profile.' },
    ],
  },
  {
    game: 'rimworld',
    sourceEggName: 'Rimworld',
    display: 'Rimworld',
    tierRams: [4, 6, 8, 12],
    variants: [
      { slug: 'multiplayer-ready', label: 'Multiplayer Ready', eggName: 'Rimworld Multiplayer Ready', surcharge: 4, minRam: 4, description: 'One-click Rimworld profile for larger multiplayer setups.' },
    ],
  },
  {
    game: 'vintage-story',
    sourceEggName: 'Vintage Story',
    display: 'Vintage Story',
    tierRams: [4, 6, 8, 12],
    variants: [
      { slug: 'primitive-plus', label: 'Primitive Plus', eggName: 'Vintage Story Primitive Plus', surcharge: 2, minRam: 4, description: 'One-click Vintage Story immersive profile.' },
    ],
  },
  {
    game: 'teeworlds',
    sourceEggName: 'Teeworlds',
    display: 'Teeworlds',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      { slug: 'instagib', label: 'Instagib', eggName: 'Teeworlds Instagib', surcharge: 1, minRam: 2, description: 'One-click Teeworlds Instagib profile.' },
    ],
  },
  {
    game: 'among-us',
    sourceEggName: 'Among Us',
    display: 'Among Us',
    tierRams: [4, 6, 8, 12],
    variants: [
      { slug: 'proximity-chat-ready', label: 'Proximity Chat Ready', eggName: 'Among Us Proximity Chat Ready', surcharge: 2, minRam: 4, description: 'One-click social/proximity-chat Among Us profile.' },
    ],
  },
  {
    game: 'veloren',
    sourceEggName: 'Veloren',
    display: 'Veloren',
    tierRams: [4, 6, 8, 12],
    variants: [
      { slug: 'rp-realm', label: 'RP Realm', eggName: 'Veloren RP Realm', surcharge: 1.5, minRam: 4, description: 'One-click Veloren roleplay-focused profile.' },
    ],
  },
  {
    game: 'enshrouded',
    sourceEggName: 'Enshrouded',
    display: 'Enshrouded',
    tierRams: [6, 8, 12],
    variants: [
      { slug: 'modded', label: 'Modded', eggName: 'Enshrouded Modded', surcharge: 2, minRam: 6, description: 'Enshrouded server with mod support. Add QoL and content mods via panel.' },
    ],
  },
];

function toPrice(value) {
  return Number(Math.max(0.99, value).toFixed(2));
}

function termPrices(monthly) {
  return {
    monthly: toPrice(monthly),
    quarterly: toPrice(monthly * 3 * 0.95),
    semiannual: toPrice(monthly * 6 * 0.9),
    yearly: toPrice(monthly * 12 * 0.8),
  };
}

function legacyBasePlanRegex(game) {
  const escaped = String(game).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `^${escaped}-[0-9]+gb$`;
}

async function main() {
  const gameFilter = process.env.GAME_FILTER ? process.env.GAME_FILTER.toLowerCase() : null;
  const catalog = gameFilter
    ? variantCatalog.filter((g) => g.game.toLowerCase() === gameFilter)
    : variantCatalog;
  if (gameFilter && catalog.length === 0) {
    throw new Error(`GAME_FILTER=${gameFilter} matched no game in variant catalog.`);
  }
  console.log(`💳 Seed all game variant plans (${isDryRun ? 'DRY RUN' : 'APPLY'}${gameFilter ? `, game=${gameFilter}` : ''})`);
  const conn = await pool.getConnection();

  try {
    const [termCols] = await conn.execute(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'plans'
         AND column_name IN ('price_quarterly', 'price_semiannual', 'price_yearly')`
    );
    const hasQuarterly = termCols.some((r) => r.column_name === 'price_quarterly');
    const hasSemiannual = termCols.some((r) => r.column_name === 'price_semiannual');
    const hasYearly = termCols.some((r) => r.column_name === 'price_yearly');

    const allEggNames = [
      ...catalog.map((g) => g.sourceEggName),
      ...catalog.flatMap((g) => g.variants.map((v) => v.eggName)),
    ];
    const placeholders = allEggNames.map(() => '?').join(', ');
    const [eggRows] = await conn.execute(
      `SELECT ptero_egg_id, name
       FROM ptero_eggs
       WHERE name IN (${placeholders})`,
      allEggNames
    );
    const eggByName = new Map(eggRows.map((r) => [r.name, Number(r.ptero_egg_id)]));

    const missingEggs = allEggNames.filter((name) => !eggByName.has(name));
    if (missingEggs.length > 0) {
      throw new Error(`Missing eggs in app catalog: ${missingEggs.join(', ')}. Run variant egg script and ptero:sync first.`);
    }

    const upserts = [];
    const legacyDeactivations = [];
    let generatedPlanCount = 0;

    for (const gameEntry of catalog) {
      const sourceEggId = eggByName.get(gameEntry.sourceEggName);
      const priceMap = PRICING[gameEntry.game];
      if (!priceMap) {
        throw new Error(`Missing PRICING table for game "${gameEntry.game}".`);
      }

      const tierRams = gameEntry.tierRams || [2, 4, 6, 8, 12];
      for (const ram of tierRams) {
        if (priceMap[ram] == null) {
          throw new Error(`PRICING["${gameEntry.game}"] missing RAM tier ${ram}GB (tierRams includes it).`);
        }
      }

      const generatedIdsForGame = [];
      for (const variant of gameEntry.variants) {
        const variantEggId = eggByName.get(variant.eggName);
        for (const ram of tierRams) {
          if (ram < Number(variant.minRam || 0)) continue;
          const baseMonthly = Number(priceMap[ram] || 0);
          if (!baseMonthly) continue;
          const monthly = toPrice(baseMonthly + Number(variant.surcharge || 0));
          const prices = termPrices(monthly);
          const id = `${gameEntry.game}-${variant.slug}-${ram}gb`;
          generatedIdsForGame.push(id);
          generatedPlanCount += 1;

          const vcores = vcoresForRam(ram);
          const ssdGb = ssdGbForRam(gameEntry.game, ram);

          const columns = [
            'id',
            'item_type',
            'game',
            'ram_gb',
            'vcores',
            'ssd_gb',
            'price_monthly',
            ...(hasQuarterly ? ['price_quarterly'] : []),
            ...(hasSemiannual ? ['price_semiannual'] : []),
            ...(hasYearly ? ['price_yearly'] : []),
            'ptero_egg_id',
            'display_name',
            'description',
            'is_active',
            'created_at',
            'updated_at',
          ];
          const values = [
            id,
            'game',
            gameEntry.game,
            ram,
            vcores,
            ssdGb,
            prices.monthly,
            ...(hasQuarterly ? [prices.quarterly] : []),
            ...(hasSemiannual ? [prices.semiannual] : []),
            ...(hasYearly ? [prices.yearly] : []),
            variantEggId,
            `${gameEntry.display} ${variant.label} ${ram}GB`,
            variant.description,
            1,
          ];
          const marks = columns.map(() => '?');
          marks[marks.length - 2] = 'NOW()';
          marks[marks.length - 1] = 'NOW()';
          const updates = [
            'item_type = VALUES(item_type)',
            'game = VALUES(game)',
            'ram_gb = VALUES(ram_gb)',
            'vcores = VALUES(vcores)',
            'ssd_gb = VALUES(ssd_gb)',
            'price_monthly = VALUES(price_monthly)',
            ...(hasQuarterly ? ['price_quarterly = VALUES(price_quarterly)'] : []),
            ...(hasSemiannual ? ['price_semiannual = VALUES(price_semiannual)'] : []),
            ...(hasYearly ? ['price_yearly = VALUES(price_yearly)'] : []),
            'ptero_egg_id = VALUES(ptero_egg_id)',
            'display_name = VALUES(display_name)',
            'description = VALUES(description)',
            'is_active = 1',
            'updated_at = NOW()',
          ];
          upserts.push({
            sql: `INSERT INTO plans (${columns.join(', ')})
                  VALUES (${marks.join(', ')})
                  ON DUPLICATE KEY UPDATE ${updates.join(', ')}`,
            params: values,
          });
        }
      }

      legacyDeactivations.push({
        sql: `UPDATE plans
              SET is_active = 0, updated_at = NOW()
              WHERE item_type = 'game'
                AND game = ?
                AND ptero_egg_id = ?
                AND id REGEXP ?
                AND id NOT IN (${generatedIdsForGame.map(() => '?').join(', ')})`,
        params: [gameEntry.game, sourceEggId, legacyBasePlanRegex(gameEntry.game), ...generatedIdsForGame],
      });
    }

    if (isDryRun) {
      console.log(`Would upsert ${upserts.length} variant plans.`);
      console.log(`Would run ${legacyDeactivations.length} legacy base-plan deactivation updates.`);
      return;
    }

    await conn.beginTransaction();
    for (const statement of upserts) {
      await conn.execute(statement.sql, statement.params);
    }
    for (const deactivation of legacyDeactivations) {
      await conn.execute(deactivation.sql, deactivation.params);
    }
    await conn.execute(
      `UPDATE plans
       SET is_active = 0, updated_at = NOW()
       WHERE item_type = 'game'
         AND (id LIKE 'mc-vanilla-%' OR id LIKE '%-vanilla-%')`
    );
    await conn.commit();
    console.log(`✅ Upserted ${generatedPlanCount} plans across ${catalog.length} games; legacy base rows cleaned up.`);
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`\n❌ Seed failed: ${error.message}`);
  process.exit(1);
});
