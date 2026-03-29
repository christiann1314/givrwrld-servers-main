#!/usr/bin/env node
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, '../../api/.env') });

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'app_core',
});

const [eggs] = await conn.query(
  'SELECT ptero_egg_id, name, ptero_nest_id FROM ptero_eggs ORDER BY ptero_egg_id'
);
console.log('=== ptero_eggs ===');
for (const r of eggs) {
  console.log(`${r.ptero_egg_id}\t${r.ptero_nest_id}\t${r.name}`);
}

const [plans] = await conn.query(
  `SELECT game, ptero_egg_id, COUNT(*) AS n
   FROM plans WHERE item_type = 'game'
   GROUP BY game, ptero_egg_id ORDER BY game, ptero_egg_id`
);
console.log('\n=== plans (game, ptero_egg_id, count) ===');
for (const r of plans) {
  console.log(`${r.game}\t${r.ptero_egg_id}\t${r.n}`);
}

await conn.end();
