import pool from '../config/database.js';
const [rows] = await pool.execute(`
  SELECT p.id, p.game, p.display_name, p.ram_gb, p.vcores, p.ssd_gb, p.price_monthly,
         p.ptero_egg_id, e.name AS egg_name
  FROM plans p
  LEFT JOIN ptero_eggs e ON e.ptero_egg_id = p.ptero_egg_id
  WHERE p.is_active = 1 AND p.item_type = 'game'
  ORDER BY p.game, p.ptero_egg_id, p.ram_gb
`);
let lastGame = '';
for (const r of rows) {
  if (r.game !== lastGame) { console.log(''); lastGame = r.game; }
  console.log([r.game, `egg=${r.ptero_egg_id}`, r.egg_name || '(none)', r.id, r.display_name, `${r.ram_gb}GB`, `$${r.price_monthly}`].join(' | '));
}
console.log(`\nTotal: ${rows.length} active game plans`);
await pool.end();
