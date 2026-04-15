import pool from '../config/database.js';

const [rows] = await pool.execute(`
  SELECT spp.order_id, spp.public_slug, spp.stream_platform, spp.stream_channel,
         spp.stream_url, o.ptero_server_id, o.ptero_identifier, o.status AS order_status,
         snap.status AS snap_status, snap.join_address, snap.captured_at
  FROM server_public_pages spp
  JOIN orders o ON o.id = spp.order_id
  LEFT JOIN server_public_snapshots snap ON snap.order_id = spp.order_id
  WHERE spp.public_page_enabled = 1
`);

for (const r of rows) {
  const age = r.captured_at ? Math.round((Date.now() - new Date(r.captured_at).getTime()) / 1000) : null;
  console.log(`slug=${r.public_slug} | platform=${r.stream_platform} | channel=${r.stream_channel}`);
  console.log(`  ptero_server_id=${r.ptero_server_id} | ptero_id=${r.ptero_identifier} | order_status=${r.order_status}`);
  console.log(`  snap_status=${r.snap_status} | join=${r.join_address} | snap_age=${age}s`);
  console.log(`  stream_url=${r.stream_url}`);
  console.log('');
}

console.log(`Total enabled public pages: ${rows.length}`);
await pool.end();
