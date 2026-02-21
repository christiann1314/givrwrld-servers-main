#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const isDryRun = process.argv.includes('--dry-run');

const baseMonthlyByRam = {
  2: 6.99,
  4: 13.99,
  8: 27.99,
  12: 36.99,
};

const variantConfig = [
  { key: 'vanilla', eggName: 'Minecraft Vanilla', surcharge: -1.0, minRam: 2, copy: 'Vanilla survival and creative with one-click setup.' },
  { key: 'paper', eggName: 'Minecraft Paper', surcharge: 0, minRam: 2, copy: 'Best all-around plugin-friendly server type.' },
  { key: 'purpur', eggName: 'Minecraft Purpur', surcharge: 1, minRam: 2, copy: 'Paper-compatible with deeper gameplay customization.' },
  { key: 'fabric', eggName: 'Minecraft Fabric', surcharge: 3, minRam: 4, copy: 'Lightweight modded stack optimized for modern modpacks.' },
  { key: 'forge', eggName: 'Minecraft Forge', surcharge: 5, minRam: 4, copy: 'Heavy modpack-ready server type for one-click modded deployments.' },
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

function titleCase(str) {
  return String(str || '')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

async function main() {
  console.log(`🧱 Seed Minecraft variant plans (${isDryRun ? 'DRY RUN' : 'APPLY'})`);

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

    const neededEggs = variantConfig.map((v) => v.eggName);
    const placeholders = neededEggs.map(() => '?').join(', ');
    const [eggRows] = await conn.execute(
      `SELECT ptero_egg_id, name
       FROM ptero_eggs
       WHERE name IN (${placeholders})`,
      neededEggs
    );

    const eggByName = new Map(eggRows.map((r) => [r.name, Number(r.ptero_egg_id)]));
    const missing = neededEggs.filter((name) => !eggByName.has(name));
    if (missing.length > 0) {
      throw new Error(`Missing Minecraft variant eggs in ptero_eggs: ${missing.join(', ')}. Run bootstrap/upgrade/sync scripts first.`);
    }

    const statements = [];
    for (const variant of variantConfig) {
      for (const [ramStr, baseMonthly] of Object.entries(baseMonthlyByRam)) {
        const ram = Number(ramStr);
        if (ram < variant.minRam) continue;
        const monthly = toPrice(baseMonthly + variant.surcharge);
        const prices = termPrices(monthly);
        const vcores = ram >= 12 ? 4 : ram >= 8 ? 3 : ram >= 4 ? 2 : 1;
        const ssdGb = ram * 10;
        const id = `mc-${variant.key}-${ram}gb`;
        const displayName = `Minecraft ${titleCase(variant.key)} ${ram}GB`;
        const description = variant.copy;
        const eggId = eggByName.get(variant.eggName);

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
          'minecraft',
          ram,
          vcores,
          ssdGb,
          prices.monthly,
          ...(hasQuarterly ? [prices.quarterly] : []),
          ...(hasSemiannual ? [prices.semiannual] : []),
          ...(hasYearly ? [prices.yearly] : []),
          eggId,
          displayName,
          description,
          1,
        ];
        const qs = columns.map(() => '?');
        qs[qs.length - 2] = 'NOW()';
        qs[qs.length - 1] = 'NOW()';
        const updateSet = [
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
        statements.push({
          sql: `INSERT INTO plans (${columns.join(', ')})
                VALUES (${qs.join(', ')})
                ON DUPLICATE KEY UPDATE ${updateSet.join(', ')}`,
          params: values,
        });
      }
    }

    const legacyDeactivateSql = `
      UPDATE plans
      SET is_active = 0, updated_at = NOW()
      WHERE game = 'minecraft'
        AND id REGEXP '^mc-[0-9]+gb$'
    `;

    if (isDryRun) {
      console.log(`Would upsert ${statements.length} Minecraft variant plans.`);
      console.log('Would deactivate legacy IDs matching ^mc-[0-9]+gb$.');
      return;
    }

    await conn.beginTransaction();
    for (const s of statements) {
      await conn.execute(s.sql, s.params);
    }
    await conn.execute(legacyDeactivateSql);
    await conn.commit();
    console.log(`✅ Upserted ${statements.length} Minecraft variant plans and deactivated legacy Minecraft defaults.`);
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback failures
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

