#!/usr/bin/env node
/**
 * Upserts game plans for every RAM tier we sell.
 * One stock SKU per game (base Panel egg), except Terraria: Vanilla + tModLoader.
 * Pricing is defined here so re-runs work even after legacy rows are deactivated.
 *
 * When changing minimum RAM tiers or starter prices, update `src/config/gamePlanStarters.ts`
 * so configure-page fallbacks and Deploy “From NGB RAM” copy stay aligned.
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
  ark: { 6: 14.99, 8: 28.99, 12: 42.99 },
  'ark-asa': { 8: 32.99, 12: 48.99 },
  'counter-strike': { 2: 7.99, 4: 10.49, 6: 13.99, 8: 17.99, 12: 25.99 },
  terraria: { 2: 6.99, 4: 8.99, 6: 10.99, 8: 14.99, 12: 21.99 },
  factorio: { 2: 7.99, 4: 10.99, 6: 13.49, 8: 16.99, 12: 24.99 },
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
  if (game === 'ark-asa' && ram >= 8) return Math.max(ram * 10, 60);
  return ram * 10;
}

function displayNameForVariant(gameEntry, variant, ram) {
  const label = String(variant.label || '').trim();
  if (gameEntry.game === 'terraria' && variant.slug === 'vanilla') {
    return `Terraria Vanilla ${ram}GB`;
  }
  if (label) return `${gameEntry.display} ${label} ${ram}GB`;
  return `${gameEntry.display} ${ram}GB`;
}

const variantCatalog = [
  {
    game: 'rust',
    sourceEggName: 'Rust',
    display: 'Rust',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Rust',
        surcharge: 0,
        minRam: 2,
        description: 'Dedicated Rust server on NVMe.',
      },
    ],
  },
  {
    game: 'ark',
    sourceEggName: 'Ark: Survival Evolved',
    display: 'ARK: Survival Evolved',
    tierRams: [6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Ark: Survival Evolved',
        surcharge: 0,
        minRam: 6,
        description: 'Dedicated ARK: Survival Evolved server.',
      },
    ],
  },
  {
    game: 'ark-asa',
    sourceEggName: 'ARK: Survival Ascended',
    display: 'ARK: Survival Ascended',
    tierRams: [8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'ARK: Survival Ascended',
        surcharge: 0,
        minRam: 8,
        description: 'Dedicated ARK: Survival Ascended (UE5) server.',
      },
    ],
  },
  {
    game: 'counter-strike',
    sourceEggName: 'Counter-Strike: Global Offensive',
    display: 'Counter-Strike',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Counter-Strike: Global Offensive',
        surcharge: 0,
        minRam: 2,
        description: 'Dedicated Counter-Strike: Global Offensive server.',
      },
    ],
  },
  {
    game: 'terraria',
    sourceEggName: 'Terraria Vanilla',
    display: 'Terraria',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      {
        slug: 'vanilla',
        label: 'Vanilla',
        eggName: 'Terraria Vanilla',
        surcharge: 0,
        minRam: 2,
        description: 'Vanilla Terraria dedicated server.',
      },
      {
        slug: 'tmodloader',
        label: 'tModLoader',
        eggName: 'Terraria tModLoader',
        surcharge: 3,
        minRam: 4,
        description: 'tModLoader Terraria profile.',
      },
    ],
  },
  {
    game: 'factorio',
    sourceEggName: 'Factorio',
    display: 'Factorio',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Factorio',
        surcharge: 0,
        minRam: 2,
        description: 'Dedicated Factorio server.',
      },
    ],
  },
  {
    game: 'palworld',
    sourceEggName: 'Palworld',
    display: 'Palworld',
    tierRams: [4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Palworld',
        surcharge: 0,
        minRam: 4,
        description: 'Dedicated Palworld server.',
      },
    ],
  },
  {
    game: 'mindustry',
    sourceEggName: 'Mindustry',
    display: 'Mindustry',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Mindustry',
        surcharge: 0,
        minRam: 2,
        description: 'Dedicated Mindustry server.',
      },
    ],
  },
  {
    game: 'rimworld',
    sourceEggName: 'Rimworld',
    display: 'Rimworld',
    tierRams: [4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Rimworld',
        surcharge: 0,
        minRam: 4,
        description: 'Dedicated Rimworld multiplayer server.',
      },
    ],
  },
  {
    game: 'vintage-story',
    sourceEggName: 'Vintage Story',
    display: 'Vintage Story',
    tierRams: [4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Vintage Story',
        surcharge: 0,
        minRam: 4,
        description: 'Dedicated Vintage Story server.',
      },
    ],
  },
  {
    game: 'teeworlds',
    sourceEggName: 'Teeworlds',
    display: 'Teeworlds',
    tierRams: [2, 4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Teeworlds',
        surcharge: 0,
        minRam: 2,
        description: 'Dedicated Teeworlds server.',
      },
    ],
  },
  {
    game: 'among-us',
    sourceEggName: 'Among Us - Impostor Server',
    display: 'Among Us',
    tierRams: [4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Among Us - Impostor Server',
        surcharge: 0,
        minRam: 4,
        description: 'Dedicated Among Us Impostor server (not proximity/Crewlink eggs).',
      },
    ],
  },
  {
    game: 'veloren',
    sourceEggName: 'Veloren',
    display: 'Veloren',
    tierRams: [4, 6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Veloren',
        surcharge: 0,
        minRam: 4,
        description: 'Dedicated Veloren server.',
      },
    ],
  },
  {
    game: 'enshrouded',
    sourceEggName: 'Enshrouded',
    display: 'Enshrouded',
    tierRams: [6, 8, 12],
    variants: [
      {
        slug: 'standard',
        label: '',
        eggName: 'Enshrouded',
        surcharge: 0,
        minRam: 6,
        description: 'Dedicated Enshrouded server.',
      },
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

    const allEggNames = [...new Set([
      ...catalog.map((g) => g.sourceEggName),
      ...catalog.flatMap((g) => g.variants.map((v) => v.eggName)),
    ])];
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
      throw new Error(
        `Missing eggs in app catalog: ${missingEggs.join(', ')}. Run ptero:bootstrap-eggs, ptero:upgrade-eggs, ptero:sync, and ensure panel egg names match seed (e.g. Terraria Vanilla, ARK: Survival Ascended, Counter-Strike: Global Offensive).`
      );
    }

    const upserts = [];
    const legacyDeactivations = [];
    const idsByGame = new Map();
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
      idsByGame.set(gameEntry.game, generatedIdsForGame);

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
            displayNameForVariant(gameEntry, variant, ram),
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

    for (const gameEntry of catalog) {
      const ids = idsByGame.get(gameEntry.game) || [];
      if (ids.length === 0) continue;
      const ph = ids.map(() => '?').join(', ');
      await conn.execute(
        `UPDATE plans
         SET is_active = 0, updated_at = NOW()
         WHERE item_type = 'game'
           AND game = ?
           AND id NOT IN (${ph})`,
        [gameEntry.game, ...ids]
      );
    }

    await conn.execute(
      `UPDATE plans
       SET is_active = 0, updated_at = NOW()
       WHERE item_type = 'game'
         AND (
           id LIKE 'mc-vanilla-%'
           OR (id LIKE '%-vanilla-%' AND id NOT LIKE 'terraria-vanilla-%')
         )`
    );
    await conn.commit();
    console.log(`✅ Upserted ${generatedPlanCount} plans across ${catalog.length} games; legacy rows cleaned up.`);
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
