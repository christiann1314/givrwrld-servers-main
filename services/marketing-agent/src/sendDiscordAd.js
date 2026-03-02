// One-off: insert a discord_announcement event with the GIVRwrld ad, then run the agent to send it.
// Usage: node services/marketing-agent/src/sendDiscordAd.js

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../../api/.env') });
dotenv.config({ path: join(__dirname, '../../../.env') });

import { pool } from './db.js';

const AD = {
  title: 'GIVRwrld – game servers built for when it actually matters',
  contentLines: [
    "Most hosting looks great until Friday night. We're building the opposite: boring infra that stays stable when your server is full.",
    '',
    '• **Hardware** – Ryzen + NVMe, tuned for weekend spikes, not empty-server benchmarks',
    '• **Stack** – Pterodactyl-based, opinionated defaults, backups and monitoring from day one',
    "• **Transparency** – we post capacity updates and short incident notes so you know what's going on",
    '',
    'If you\'re tired of "it\'s probably fine" and want a host that plans for real load, we\'re for you.',
    '',
    "**Launching soon.** Want early access or help migrating from your current host? Reply here or DM – we'll get you a plan and a peek at the stack.",
  ],
};

async function main() {
  const id = randomUUID();
  const eventKey = `discord_announcement_${Date.now()}`;
  const payloadJson = JSON.stringify(AD);

  await pool.execute(
    `INSERT INTO marketing_events (id, event_type, event_key, source, payload_json, occurred_at, created_at)
     VALUES (?, 'discord_announcement', ?, 'send_discord_ad', ?, NOW(), NOW())`,
    [id, eventKey, payloadJson]
  );
  console.log('[sendDiscordAd] Inserted event', id);
  pool.end().catch(() => undefined);

  execSync('npm run marketing:run', {
    cwd: join(__dirname, '../../..'),
    stdio: 'inherit',
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
