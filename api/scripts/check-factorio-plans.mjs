import pool from '../config/database.js';
const [rows] = await pool.execute(
  "SELECT id, display_name, ram_gb, price_monthly, ptero_egg_id FROM plans WHERE game = 'factorio' AND is_active = 1 AND item_type = 'game' ORDER BY ram_gb, price_monthly"
);
for (const r of rows) {
  console.log(`${r.id} | ${r.display_name} | ${r.ram_gb}GB | $${r.price_monthly} | egg=${r.ptero_egg_id}`);
}
console.log(`\n${rows.length} plans`);

// Also check what the API returns for price fields
const [full] = await pool.execute(
  "SELECT id, price_monthly, price_quarterly, price_semiannual, price_yearly FROM plans WHERE game = 'factorio' AND is_active = 1 AND item_type = 'game' LIMIT 2"
);
console.log('\nSample pricing fields:');
for (const r of full) {
  console.log(JSON.stringify(r));
}
await pool.end();
