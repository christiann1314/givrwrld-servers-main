import pool from '../config/database.js';

const [rows] = await pool.execute(
  'SELECT stream_platform, stream_channel, stream_url FROM server_public_pages WHERE public_slug = ?',
  ['cnelc4']
);

console.log(JSON.stringify(rows[0], null, 2));
await pool.end();
