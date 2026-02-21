#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const isDryRun = process.argv.includes('--dry-run');

const variantCatalog = [
  {
    game: 'rust',
    sourceEggName: 'Rust',
    display: 'Rust',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Rust Vanilla', surcharge: 0, minRam: 2, description: 'Pure Rust dedicated server runtime.' },
      { slug: 'oxide', label: 'Oxide (uMod)', eggName: 'Rust Oxide (uMod)', surcharge: 3, minRam: 4, description: 'One-click Rust profile for Oxide/uMod communities.' },
      { slug: 'carbon', label: 'Carbon', eggName: 'Rust Carbon', surcharge: 4, minRam: 4, description: 'One-click Rust profile for Carbon framework communities.' },
    ],
  },
  {
    game: 'ark',
    sourceEggName: 'Ark: Survival Evolved',
    display: 'ARK',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'ARK Vanilla', surcharge: 0, minRam: 4, description: 'Standard ARK Survival Evolved runtime.' },
      { slug: 'primal-fear-ready', label: 'Primal Fear Ready', eggName: 'ARK Primal Fear Ready', surcharge: 6, minRam: 8, description: 'One-click ARK profile for larger overhaul modpacks.' },
      { slug: 'pve-cluster-ready', label: 'PvE Cluster Ready', eggName: 'ARK PvE Cluster Ready', surcharge: 4, minRam: 8, description: 'One-click ARK profile for cluster/PvE-first communities.' },
    ],
  },
  {
    game: 'terraria',
    sourceEggName: 'Terraria',
    display: 'Terraria',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Terraria Vanilla', surcharge: 0, minRam: 2, description: 'Standard Terraria dedicated runtime.' },
      { slug: 'tmodloader', label: 'tModLoader', eggName: 'Terraria tModLoader', surcharge: 3, minRam: 4, description: 'One-click tModLoader Terraria profile.' },
      { slug: 'calamity-ready', label: 'Calamity Ready', eggName: 'Terraria Calamity Ready', surcharge: 4, minRam: 4, description: 'One-click Calamity-ready Terraria profile.' },
    ],
  },
  {
    game: 'factorio',
    sourceEggName: 'Factorio',
    display: 'Factorio',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Factorio Vanilla', surcharge: 0, minRam: 2, description: 'Standard Factorio dedicated runtime.' },
      { slug: 'space-age-ready', label: 'Space Age Ready', eggName: 'Factorio Space Age Ready', surcharge: 3, minRam: 4, description: 'One-click Space Age-ready Factorio profile.' },
      { slug: 'bobs-angels-ready', label: "Bob's+Angel's Ready", eggName: "Factorio Bob's+Angel's Ready", surcharge: 4, minRam: 4, description: "One-click Bob's/Angel's-ready Factorio profile." },
    ],
  },
  {
    game: 'palworld',
    sourceEggName: 'Palworld',
    display: 'Palworld',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Palworld Vanilla', surcharge: 0, minRam: 4, description: 'Standard Palworld dedicated runtime.' },
      { slug: 'community-plus', label: 'Community Plus', eggName: 'Palworld Community Plus', surcharge: 2, minRam: 8, description: 'One-click Palworld profile for larger communities.' },
      { slug: 'hardcore', label: 'Hardcore', eggName: 'Palworld Hardcore', surcharge: 1, minRam: 8, description: 'One-click Palworld hardcore-focused profile.' },
    ],
  },
  {
    game: 'mindustry',
    sourceEggName: 'Mindustry',
    display: 'Mindustry',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Mindustry Vanilla', surcharge: 0, minRam: 2, description: 'Standard Mindustry runtime.' },
      { slug: 'pvp', label: 'PvP', eggName: 'Mindustry PvP', surcharge: 1, minRam: 4, description: 'One-click Mindustry PvP profile.' },
      { slug: 'survival', label: 'Survival', eggName: 'Mindustry Survival', surcharge: 1.5, minRam: 4, description: 'One-click Mindustry survival profile.' },
    ],
  },
  {
    game: 'rimworld',
    sourceEggName: 'Rimworld',
    display: 'Rimworld',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Rimworld Vanilla', surcharge: 0, minRam: 4, description: 'Standard Rimworld multiplayer runtime.' },
      { slug: 'multiplayer-ready', label: 'Multiplayer Ready', eggName: 'Rimworld Multiplayer Ready', surcharge: 4, minRam: 8, description: 'One-click Rimworld profile for larger multiplayer setups.' },
    ],
  },
  {
    game: 'vintage-story',
    sourceEggName: 'Vintage Story',
    display: 'Vintage Story',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Vintage Story Vanilla', surcharge: 0, minRam: 4, description: 'Standard Vintage Story runtime.' },
      { slug: 'primitive-plus', label: 'Primitive Plus', eggName: 'Vintage Story Primitive Plus', surcharge: 2, minRam: 8, description: 'One-click Vintage Story immersive profile.' },
    ],
  },
  {
    game: 'teeworlds',
    sourceEggName: 'Teeworlds',
    display: 'Teeworlds',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Teeworlds Vanilla', surcharge: 0, minRam: 2, description: 'Standard Teeworlds runtime.' },
      { slug: 'instagib', label: 'Instagib', eggName: 'Teeworlds Instagib', surcharge: 1, minRam: 2, description: 'One-click Teeworlds Instagib profile.' },
    ],
  },
  {
    game: 'among-us',
    sourceEggName: 'Among Us',
    display: 'Among Us',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Among Us Vanilla', surcharge: 0, minRam: 2, description: 'Standard Among Us private lobby runtime.' },
      { slug: 'proximity-chat-ready', label: 'Proximity Chat Ready', eggName: 'Among Us Proximity Chat Ready', surcharge: 2, minRam: 4, description: 'One-click social/proximity-chat Among Us profile.' },
    ],
  },
  {
    game: 'veloren',
    sourceEggName: 'Veloren',
    display: 'Veloren',
    variants: [
      { slug: 'vanilla', label: 'Vanilla', eggName: 'Veloren Vanilla', surcharge: 0, minRam: 4, description: 'Standard Veloren dedicated runtime.' },
      { slug: 'rp-realm', label: 'RP Realm', eggName: 'Veloren RP Realm', surcharge: 1.5, minRam: 8, description: 'One-click Veloren roleplay-focused profile.' },
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

function mapRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const ram = Number(row.ram_gb || 0);
    if (!ram) continue;
    if (!grouped.has(ram)) {
      grouped.set(ram, row);
      continue;
    }
    const current = grouped.get(ram);
    const currentPrice = Number(current.price_monthly || 0);
    const nextPrice = Number(row.price_monthly || 0);
    if (nextPrice < currentPrice) grouped.set(ram, row);
  }
  return Array.from(grouped.entries())
    .map(([ram, row]) => ({ ram, row }))
    .sort((a, b) => a.ram - b.ram);
}

async function main() {
  console.log(`💳 Seed all game variant plans (${isDryRun ? 'DRY RUN' : 'APPLY'})`);
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
      ...variantCatalog.map((g) => g.sourceEggName),
      ...variantCatalog.flatMap((g) => g.variants.map((v) => v.eggName)),
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

    for (const gameEntry of variantCatalog) {
      const sourceEggId = eggByName.get(gameEntry.sourceEggName);
      const [baseRows] = await conn.execute(
        `SELECT id, game, ram_gb, vcores, ssd_gb, price_monthly, ptero_egg_id
         FROM plans
         WHERE item_type = 'game'
           AND is_active = 1
           AND game = ?
           AND ptero_egg_id = ?
         ORDER BY ram_gb ASC, price_monthly ASC`,
        [gameEntry.game, sourceEggId]
      );

      const tiers = mapRows(baseRows);
      if (tiers.length === 0) {
        throw new Error(`No active base plans found for ${gameEntry.game} from source egg "${gameEntry.sourceEggName}".`);
      }

      const generatedIdsForGame = [];
      for (const variant of gameEntry.variants) {
        const variantEggId = eggByName.get(variant.eggName);
        for (const tier of tiers) {
          if (tier.ram < Number(variant.minRam || 0)) continue;
          const baseMonthly = Number(tier.row.price_monthly || 0);
          const monthly = toPrice(baseMonthly + Number(variant.surcharge || 0));
          const prices = termPrices(monthly);
          const id = `${gameEntry.game}-${variant.slug}-${tier.ram}gb`;
          generatedIdsForGame.push(id);
          generatedPlanCount += 1;

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
            Number(tier.row.ram_gb || tier.ram),
            Number(tier.row.vcores || 1),
            Number(tier.row.ssd_gb || tier.ram * 10),
            prices.monthly,
            ...(hasQuarterly ? [prices.quarterly] : []),
            ...(hasSemiannual ? [prices.semiannual] : []),
            ...(hasYearly ? [prices.yearly] : []),
            variantEggId,
            `${gameEntry.display} ${variant.label} ${tier.ram}GB`,
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
                AND id NOT IN (${generatedIdsForGame.map(() => '?').join(', ')})`,
        params: [gameEntry.game, sourceEggId, ...generatedIdsForGame],
      });
    }

    if (isDryRun) {
      console.log(`Would upsert ${upserts.length} variant plans.`);
      console.log(`Would run ${legacyDeactivations.length} legacy deactivation updates.`);
      return;
    }

    await conn.beginTransaction();
    for (const statement of upserts) {
      await conn.execute(statement.sql, statement.params);
    }
    for (const deactivation of legacyDeactivations) {
      await conn.execute(deactivation.sql, deactivation.params);
    }
    await conn.commit();
    console.log(`✅ Upserted ${generatedPlanCount} plans across ${variantCatalog.length} games and deactivated legacy base plans.`);
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

