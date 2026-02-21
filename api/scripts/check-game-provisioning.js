#!/usr/bin/env node
/**
 * Check provisioning readiness for a game: plans with ptero_egg_id and ptero_eggs rows.
 * Usage: node api/scripts/check-game-provisioning.js <game>
 * Example: node api/scripts/check-game-provisioning.js rust
 *
 * Run from repo root or from api/ (uses api/.env and api/config/database.js).
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const gameSlug = process.argv[2] || 'rust';
const game = gameSlug.toLowerCase().trim();

async function main() {
  console.log(`\n🎮 Provisioning check: ${game}\n`);

  try {
    const [plans] = await pool.execute(
      `SELECT id, game, ram_gb, ptero_egg_id, is_active, display_name
       FROM plans
       WHERE game = ? AND is_active = 1
       ORDER BY ram_gb, id`,
      [game]
    );

    if (plans.length === 0) {
      console.log('❌ No active plans found for this game.');
      console.log('   → Run seed script: node api/scripts/seed-game-variant-plans.js (then set ptero_egg_id per plan).');
      console.log('   → Or add plans manually and set ptero_egg_id to the Pterodactyl egg ID.\n');
      return;
    }

    const withEgg = plans.filter((p) => p.ptero_egg_id != null && p.ptero_egg_id !== 0);
    const withoutEgg = plans.filter((p) => !p.ptero_egg_id || p.ptero_egg_id === 0);

    console.log(`Plans: ${plans.length} total, ${withEgg.length} with ptero_egg_id, ${withoutEgg.length} missing egg\n`);

    if (withoutEgg.length > 0) {
      console.log('Plans missing ptero_egg_id:');
      withoutEgg.forEach((p) => console.log(`   - ${p.display_name || p.id} (id=${p.id})`));
      console.log('');
    }

    const eggIds = [...new Set(withEgg.map((p) => p.ptero_egg_id).filter(Boolean))];
    if (eggIds.length === 0) {
      console.log('⚠️ No plan has ptero_egg_id set. Set egg IDs in MySQL or run sync and map plans to eggs.\n');
      return;
    }

    const [eggRows] = await pool.execute(
      `SELECT ptero_egg_id, ptero_nest_id, name, docker_image, startup_cmd
       FROM ptero_eggs
       WHERE ptero_egg_id IN (${eggIds.map(() => '?').join(',')})`,
      eggIds
    );

    const foundIds = new Set(eggRows.map((r) => r.ptero_egg_id));
    const missingIds = eggIds.filter((id) => !foundIds.has(id));

    console.log('ptero_eggs:');
    eggRows.forEach((r) => {
      console.log(`   ✅ ${r.ptero_egg_id}  nest=${r.ptero_nest_id}  ${r.name || '(no name)'}`);
    });
    if (missingIds.length > 0) {
      console.log(`   ❌ Missing in ptero_eggs: ${missingIds.join(', ')}`);
      console.log('   → Run: node api/scripts/sync-pterodactyl-catalog.js --apply  (then re-run this check).');
    }
    console.log('');

    if (eggRows.length > 0 && missingIds.length === 0) {
      console.log('✅ Ready for Panel check + smoke test.');
      console.log('   1. In Pterodactyl Panel (e.g. localhost:8000): Nests → find egg(s) above → confirm variables.');
      console.log('   2. Create a test order for this game → finalize → confirm order goes to provisioned and server appears in Panel.\n');
    }
  } catch (err) {
    console.error('Error:', err.message || err);
    if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      console.log('\n   → Start MySQL/MariaDB and ensure api/.env has MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE=app_core.');
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
