// GIVRwrld marketing agent v1 – draft generator.
// Run manually with: npm run marketing:run

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../../api/.env') });
dotenv.config({ path: join(__dirname, '../../../.env') });

import { randomUUID } from 'crypto';
import { pool } from './db.js';
import { createDraftsForEvent } from './templates.js';
import { sendDiscordDraft } from './discordWebhook.js';
import { shouldSendDiscordDraft } from './throttle.js';

const MAX_DISCORD_PER_RUN = Number(process.env.MARKETING_MAX_DISCORD_PER_RUN || '3');

async function getUndraftedEvents(limit = 10) {
  const [rows] = await pool.execute(
    `SELECT e.*
     FROM marketing_events e
     LEFT JOIN marketing_content_drafts d
       ON d.event_id = e.id
     WHERE d.id IS NULL
     ORDER BY
       (e.event_type = 'scheduled_content') ASC,
       e.occurred_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

async function insertDraft(eventId, draft) {
  const id = randomUUID();
  const title = draft.title || '';
  const bodyJson = JSON.stringify(draft);
  const channel = draft.channel || 'discord';
  const type = draft.type || 'announcement';

  await pool.execute(
    `INSERT INTO marketing_content_drafts
      (id, event_id, channel, type, title, body_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', NOW())`,
    [id, eventId, channel, type, title, bodyJson]
  );

  return { id, ...draft, eventId };
}

async function runOnce() {
  console.log('[marketing-agent] Run started at', new Date().toISOString());

  const events = await getUndraftedEvents(10);
  if (events.length === 0) {
    console.log('[marketing-agent] No new events to process.');
    return;
  }

  console.log('[marketing-agent] Processing events:', events.map((e) => e.id).join(', '));

  let discordSent = 0;

  for (const event of events) {
    let drafts;
    try {
      drafts = createDraftsForEvent(event);
    } catch (err) {
      console.warn('[marketing-agent] Failed to generate drafts for event', event.id, err);
      continue;
    }

    if (!Array.isArray(drafts) || drafts.length === 0) {
      console.log('[marketing-agent] No drafts generated for event', event.id);
      continue;
    }

    for (const draft of drafts) {
      const withMeta = { ...draft, meta: { ...(draft.meta || {}), eventId: event.id } };
      const saved = await insertDraft(event.id, withMeta);

      if (saved.channel === 'discord' && discordSent < MAX_DISCORD_PER_RUN) {
        const { allowed, reason } = await shouldSendDiscordDraft(pool, saved);
        if (!allowed) {
          console.log('[marketing-agent] Throttle skip', saved.type, reason);
          continue;
        }
        const sent = await sendDiscordDraft(saved);
        if (sent) {
          discordSent += 1;
        }
      }
    }
  }

  console.log('[marketing-agent] Run complete. Discord drafts sent:', discordSent);
}

runOnce()
  .then(() => {
    pool.end().catch(() => undefined);
  })
  .catch((err) => {
    console.error('[marketing-agent] Unhandled error', err);
    pool.end().catch(() => undefined);
    process.exit(1);
  });

