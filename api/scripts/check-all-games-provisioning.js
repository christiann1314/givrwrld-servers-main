#!/usr/bin/env node
/**
 * Run provisioning check for all audit-order games. Exits with 1 if any game has gaps.
 * Usage: node api/scripts/check-all-games-provisioning.js
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, '..');
const games = [
  'rust', 'ark', 'among-us', 'factorio', 'mindustry', 'rimworld',
  'palworld', 'teeworlds', 'terraria', 'veloren', 'vintage-story'
];

let failed = 0;
for (const game of games) {
  const r = spawnSync('node', ['scripts/check-game-provisioning.js', game], {
    cwd: apiDir,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  if (r.status !== 0) {
    failed++;
    console.error(`\n❌ ${game}: check failed`);
    if (r.stderr) console.error(r.stderr);
  }
}
if (failed > 0) {
  console.error(`\n${failed} game(s) have gaps. Fix and re-run.`);
  process.exit(1);
}
console.log('\n✅ All games passed provisioning check (plans + ptero_eggs). Panel check + smoke test still required per game.');
