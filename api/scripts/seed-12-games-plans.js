#!/usr/bin/env node
/**
 * Seed one plan per game so the Deploy page shows all 12 games.
 * Run from repo root: node api/scripts/seed-12-games-plans.js
 * Or from api/: node scripts/seed-12-games-plans.js
 * Requires: MariaDB up, api/.env with MYSQL_* set.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pool from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(apiRoot, '.env') });

const sqlPath = path.resolve(apiRoot, '..', 'sql', 'scripts', 'seed-12-games-plans.sql');

async function main() {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const withoutUse = sql.replace(/USE\s+app_core\s*;/gi, '').trim();
  const statements = withoutUse
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
  for (const stmt of statements) {
    await pool.execute(stmt + ';');
  }
  console.log('✅ Seeded 12 game plans. Refresh the Deploy page to see all games.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
