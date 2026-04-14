import pool from '../config/database.js';
const [rows] = await pool.execute(
  "SELECT id, game, display_name, ptero_egg_id FROM plans WHERE is_active=1 AND item_type='game' ORDER BY game, id"
);
for (const r of rows) {
  console.log(`${r.game} | ${r.id} | egg=${r.ptero_egg_id} | ${r.display_name}`);
}
await pool.end();
