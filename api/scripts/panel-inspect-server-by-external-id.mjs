#!/usr/bin/env node
/**
 * Debug: print server payload shape (no secrets). Usage:
 *   cd api && node scripts/panel-inspect-server-by-external-id.mjs <external_id>
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const ext = process.argv[2];
if (!ext) {
  console.error('Usage: node scripts/panel-inspect-server-by-external-id.mjs <external_id>');
  process.exit(1);
}

const base = String(process.env.PANEL_URL || '').replace(/\/+$/, '');
const key = process.env.PANEL_APP_KEY;
if (!base || !key) process.exit(1);

const r1 = await fetch(`${base}/api/application/servers/external/${encodeURIComponent(ext)}`, {
  headers: {
    Authorization: `Bearer ${key}`,
    Accept: 'application/vnd.pterodactyl.v1+json',
  },
});
console.log('external lookup status:', r1.status);
const j1 = await r1.json();
const id = j1?.attributes?.id;
console.log('server id:', id);
if (!id) {
  console.log(JSON.stringify(j1, null, 2).slice(0, 800));
  process.exit(0);
}

const r2 = await fetch(`${base}/api/application/servers/${id}?include=allocations`, {
  headers: {
    Authorization: `Bearer ${key}`,
    Accept: 'application/vnd.pterodactyl.v1+json',
  },
});
console.log('GET server detail status:', r2.status);
const j2 = await r2.json();
console.log('top keys:', Object.keys(j2 || {}));
console.log('data keys:', j2?.data ? Object.keys(j2.data) : []);
const attrs = j2?.data?.attributes || j2?.attributes || {};
console.log('attribute keys:', Object.keys(attrs));
console.log('attrs.allocation:', JSON.stringify(attrs.allocation ?? null, null, 2).slice(0, 600));
console.log('attrs.relationships:', JSON.stringify(attrs.relationships ?? null, null, 2).slice(0, 800));
console.log('relationships:', JSON.stringify(j2?.data?.relationships ?? {}, null, 2).slice(0, 2000));
const inc = j2?.included;
console.log('included count:', Array.isArray(inc) ? inc.length : 0);
if (Array.isArray(inc) && inc.length) {
  console.log('included types:', [...new Set(inc.map((i) => i.type))]);
}
