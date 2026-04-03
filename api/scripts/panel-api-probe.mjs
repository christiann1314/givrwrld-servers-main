#!/usr/bin/env node
/**
 * Read api/.env and probe Pterodactyl application API (nodes list).
 * Prints URL host and HTTP status — never prints PANEL_APP_KEY.
 * Usage: from repo api/ dir: node scripts/panel-api-probe.mjs
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const panelUrl = process.env.PANEL_URL?.trim();
const panelKey = process.env.PANEL_APP_KEY?.trim();

console.log('PANEL_URL:', panelUrl || '<empty>');
console.log('PANEL_APP_KEY set:', Boolean(panelKey));
if (!panelUrl || !panelKey) process.exit(1);

let host;
try {
  host = new URL(panelUrl).hostname;
  console.log('host:', host);
} catch (e) {
  console.log('PANEL_URL parse error:', e.message);
  process.exit(1);
}

const url = `${String(panelUrl).replace(/\/+$/, '')}/api/application/nodes?per_page=1`;
try {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${panelKey}`,
      Accept: 'application/vnd.pterodactyl.v1+json',
    },
  });
  const text = await r.text();
  console.log('HTTP status:', r.status);
  console.log('body prefix:', text.slice(0, 220).replace(/\s+/g, ' '));
  process.exit(r.ok ? 0 : 2);
} catch (e) {
  console.log('fetch error:', e?.cause?.message || e.message);
  process.exit(3);
}
