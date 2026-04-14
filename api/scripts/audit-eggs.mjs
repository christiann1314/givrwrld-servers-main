import pool from '../config/database.js';

console.log('=== Pterodactyl Eggs in DB ===');
const [eggs] = await pool.execute(
  `SELECT pe.ptero_egg_id, pe.name, pe.docker_image, COUNT(p.id) AS plan_count
   FROM ptero_eggs pe
   LEFT JOIN plans p ON p.ptero_egg_id = pe.ptero_egg_id AND p.is_active = 1
   GROUP BY pe.ptero_egg_id, pe.name, pe.docker_image
   ORDER BY pe.ptero_egg_id`
);
for (const e of eggs) {
  console.log(`egg=${e.ptero_egg_id} | ${e.name} | plans=${e.plan_count} | docker=${e.docker_image}`);
}
console.log(`\nTotal eggs: ${eggs.length}`);

console.log('\n=== Plans without matching egg ===');
const [orphans] = await pool.execute(
  `SELECT p.id, p.game, p.display_name, p.ptero_egg_id
   FROM plans p
   LEFT JOIN ptero_eggs pe ON pe.ptero_egg_id = p.ptero_egg_id
   WHERE p.is_active = 1 AND p.item_type = 'game' AND pe.id IS NULL`
);
if (orphans.length === 0) {
  console.log('None - all plans have matching eggs.');
} else {
  for (const o of orphans) {
    console.log(`ORPHAN: ${o.id} | game=${o.game} | egg_id=${o.ptero_egg_id} | ${o.display_name}`);
  }
}

console.log('\n=== Billing term columns ===');
const [cols] = await pool.execute(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'plans'
   AND column_name IN ('price_quarterly','price_semiannual','price_yearly')`
);
console.log('Term columns present:', cols.map(c => c.COLUMN_NAME || c.column_name).join(', ') || '(none)');

console.log('\n=== Orders term enum check ===');
const [termCol] = await pool.execute(
  `SELECT column_type FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'term'`
);
console.log('orders.term type:', termCol[0]?.COLUMN_TYPE || termCol[0]?.column_type || '???');

console.log('\n=== password_reset_tokens table ===');
const [prt] = await pool.execute(
  `SELECT COUNT(*) AS cnt FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'`
);
console.log('Exists:', prt[0].cnt > 0 ? 'YES' : 'NO');

await pool.end();
