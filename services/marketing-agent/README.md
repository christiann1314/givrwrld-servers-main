# Marketing Agent – Overview

The marketing agent turns **marketing events** (stored in the DB) into **channel-specific drafts** (Discord, Reddit, TikTok) and **automatically posts Discord drafts** to a webhook. Reddit and TikTok drafts are saved for manual copy-paste or future automation.

**Role:** This service is owned by the **Marketing Engineer (Growth Systems)** role. Scope, ownership, security, and boundaries (no provisioning, no billing, no schema changes) are defined in [ROLE.md](./ROLE.md).

---

## How it works

### 1. Data flow

```
marketing_events (DB)     →  templates.js (event_type → drafts)
                                    ↓
marketing_content_drafts (DB)  ←  insertDraft() for each channel
                                    ↓
Discord drafts only  →  throttle.js (24h cap, campaign_ad cooldown, incident/maintenance rules)
                                    ↓
                             discordWebhook.js  →  POST to DISCORD_MARKETING_WEBHOOK_URL
                                    ↓
                             On success: status → 'sent_to_discord', posted_at set
                             (Mark as 'posted' only when you confirm in draft review.)
```

- **Events** are inserted manually (e.g. via SQL or a future API): `event_type` + `payload_json` (e.g. `node_online`, `game_added`, `campaign_ad`, `scheduled_content`).
- **Templates** are pure functions: one event → one or more drafts (discord, reddit, tiktok). No AI; all copy is deterministic from the payload.
- **Drafts** are written to `marketing_content_drafts` with `channel`, `type`, `title`, `body_json`, `status` ('draft' | 'sent_to_discord' | 'posted' | 'discarded').
- **Discord**: drafts with `channel === 'discord'` are throttled (max per run, max per 24h, campaign_ad cooldown, no incident/maintenance back-to-back), then sent to the webhook. On success, status is set to **sent_to_discord** (not posted); mark as **posted** manually via the draft review API when you’re satisfied.

### 2. Event types (templates.js)

| event_type     | Channels produced        | Use case |
|----------------|--------------------------|----------|
| `node_online`  | discord, reddit, tiktok  | New server capacity / infra |
| `game_added`   | discord, reddit, tiktok  | New game on deploy page |
| `incident`     | discord, reddit, tiktok  | Post-incident / postmortem |
| `maintenance`  | discord                  | Scheduled maintenance |
| `bug_fix`      | discord                  | Bug fix deployed |
| `campaign_ad`       | discord, reddit, tiktok  | Promo / offer (e.g. % off first month) |
| `scheduled_content`| discord, reddit, tiktok  | Educational / pillar content (theme, pillar, game) |

### 3. Run behavior (index.js)

- **Single run**: load env from `api/.env` and repo `.env`, connect to DB (same `MYSQL_*` as API).
- **Query**: events that have **no** rows in `marketing_content_drafts` (undrafted), ordered by `occurred_at DESC`, limit 10.
- **Per event**: call `createDraftsForEvent(event)` → insert each draft → for Discord drafts only, call `sendDiscordDraft(saved)` and optionally mark `posted`.
- **Exit**: pool closed; process exits. Designed for **one-shot** execution (e.g. cron or PM2 scheduled run).

### 4. Environment

| Variable | Purpose |
|----------|---------|
| `MYSQL_*` | Same as API; DB with `marketing_events` and `marketing_content_drafts`. |
| `DISCORD_MARKETING_WEBHOOK_URL` | Webhook for posting Discord announcements/ads. If unset, Discord send is skipped (drafts still created). |
| `MARKETING_MAX_DISCORD_PER_RUN`  | Max Discord messages per run (default 3). |
| `MARKETING_MAX_DISCORD_PER_24H` | Max Discord messages in rolling 24h (default 6). |
| `MARKETING_CAMPAIGN_AD_COOLDOWN_HOURS` | Skip another campaign_ad if one was sent within this many hours (default 48). |

---

## Automation with PM2

The agent is **one-shot**: it runs once and exits. For **scheduled automation**, run it under PM2 with a **cron restart** so it runs every hour (or another schedule) without staying in a loop.

- **Start with PM2** (from repo root):  
  `pm2 start ecosystem.config.cjs`  
  This starts API, main agents, **marketing agent** (hourly), and **marketing schedule** (weekly).
- **Marketing agent** (`givrwrld-marketing-agent`): `autorestart: false`, `cron_restart: '0 * * * *'` (every hour). Processes undrafted events, creates drafts, sends Discord (throttled).
- **Marketing schedule** (`givrwrld-marketing-schedule`): `autorestart: false`, `cron_restart: '0 0 * * 1'` (Monday 00:00). Inserts 2 education + 1 authority `scheduled_content` events per week (growth-driven).
- **Logs**: `pm2 logs givrwrld-marketing-agent`, `pm2 logs givrwrld-marketing-schedule`
- **Stop**: `npm run pm2:stop` (stops all four apps).

Result: new events (including weekly educational/authority content) get drafts and Discord posts automatically; Reddit/TikTok drafts stay in the DB for manual use.

---

## Growth-driven mode (educational + authority content)

The system is set up for **growth-driven** use: not just event-reactive (infra, incidents, ads) but **proactive narrative** (education + authority).

1. **Weekly schedule** (`scheduleWeekly.js`, run via PM2 Monday 00:00):
   - Calls `getWeeklyThemes()` from **contentPillars.js**.
   - Inserts **2 education** + **1 authority** `scheduled_content` events per week (deterministic rotation by ISO week; idempotent per week).
   - Event keys like `scheduled_content_education_2026W09_0` so re-runs don’t duplicate.

2. **Hourly agent** then picks up those new events, creates Discord/Reddit/TikTok drafts, and sends Discord (subject to throttling).

3. **Manual run**: `npm run marketing:schedule` (inserts this week’s themes if not already present); `npm run marketing:run` (processes all undrafted events).

**Content pillars** (`contentPillars.js`): `authority` (infra transparency, hardware breakdown, node capacity, stack choices), `education` (server sizing, mod performance, allocation practices, backup/restore), plus `trust` and `growth` for future rotation. Growth-driven mode uses only **authority** and **education** for the weekly insert. `scheduled_content` payload: `theme`, `pillar`, `game` (optional). Sample manual insert: `sql/temp_insert_scheduled_content.sql`.

---

## Draft review API

Authenticated API (same JWT as rest of app):

- **GET /api/marketing/drafts** – List drafts. Query: `channel`, `status`. Returns up to 200, newest first.
- **PATCH /api/marketing/drafts/:id** – Set `status` to `posted` or `discarded`, optional `notes`. Use this to confirm Discord sends as “posted” or to discard a draft.

Build a simple admin page that lists drafts, lets you copy body/markdown, and click “Mark as posted” / “Discard” calling this API.
