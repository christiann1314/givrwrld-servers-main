import pool from '../config/database.js';
const [cols] = await pool.execute("SHOW COLUMNS FROM plans");
for (const c of cols) console.log(`${c.Field}  (${c.Type})`);
await pool.end();
