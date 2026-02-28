// Weekly content scheduler: inserts scheduled_content events (2 education + 1 authority).
// Run once per week (e.g. Monday 00:00). The hourly marketing agent will then draft and post them.
// Growth-driven: educational + authority content, no AI.

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../../api/.env') });
dotenv.config({ path: join(__dirname, '../../../.env') });

import { randomUUID } from 'crypto';
import { pool } from './db.js';
import { getWeeklyThemes } from './contentPillars.js';

function getISOWeekString(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}W${String(weekNo).padStart(2, '0')}`;
}

async function eventKeyExists(eventKey) {
  const [rows] = await pool.execute(
    'SELECT 1 FROM marketing_events WHERE event_key = ? LIMIT 1',
    [eventKey]
  );
  return rows.length > 0;
}

async function insertScheduledEvent(payload, eventKey) {
  const id = randomUUID();
  const payloadJson = JSON.stringify(payload);
  await pool.execute(
    `INSERT INTO marketing_events (id, event_type, event_key, source, payload_json, occurred_at, created_at)
     VALUES (?, 'scheduled_content', ?, 'schedule_weekly', ?, NOW(), NOW())`,
    [id, eventKey, payloadJson]
  );
  return id;
}

async function themeUsedInLastSixWeeks(themeKey) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM marketing_events
     WHERE event_type = 'scheduled_content'
       AND JSON_EXTRACT(payload_json, '$.theme_key') = ?
       AND occurred_at >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
     LIMIT 1`,
    [themeKey]
  );
  return rows.length > 0;
}

async function runOnce() {
  const now = new Date();
  const weekStr = getISOWeekString(now);
  const themes = getWeeklyThemes(now);

  console.log('[marketing-schedule] Week', weekStr, 'themes:', themes.map((t) => t.theme).join(', '));

  if (themes.length === 0) {
    console.log('[marketing-schedule] No themes configured.');
    return;
  }

  let inserted = 0;
  for (let i = 0; i < themes.length; i++) {
    const { theme, pillar, themeMeta } = themes[i];
    const themeKey = themeMeta?.key || `theme_${pillar}_${i}`;
    const eventKey = `scheduled_content_${themeKey}_${weekStr}_${i}`;
    if (await eventKeyExists(eventKey)) {
      console.log('[marketing-schedule] Skip (exists):', eventKey);
      continue;
    }
    if (await themeUsedInLastSixWeeks(themeKey)) {
      console.log('[marketing-schedule] Skip (theme cooldown 6w):', themeKey);
      continue;
    }

    const payload = {
      theme_key: themeKey,
      theme,
      pillar,
      angle: themeMeta?.defaultAngle || '',
      example_game: themeMeta?.exampleGame || '',
      proof_point: themeMeta?.proofPoint || '',
      cta: themeMeta?.cta || '',
      channels: themeMeta?.channels || ['discord', 'reddit', 'tiktok'],
      discordMode: themeMeta?.discordMode || 'full',
    };

    await insertScheduledEvent(payload, eventKey);
    inserted += 1;
    console.log('[marketing-schedule] Inserted:', eventKey, theme);
  }

  console.log('[marketing-schedule] Done. Inserted', inserted, 'events.');
}

runOnce()
  .then(() => {
    pool.end().catch(() => undefined);
  })
  .catch((err) => {
    console.error('[marketing-schedule] Error', err);
    pool.end().catch(() => undefined);
    process.exit(1);
  });
