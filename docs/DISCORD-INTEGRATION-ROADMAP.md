# Discord Integration Roadmap

Two Discord integrations are available: **community server (invite link)** and **ops alerts (webhook)**. Follow this roadmap to set both up.

---

## Part 1: Community server (Join Discord)

**What it does:** Your site’s “Join Discord” button (e.g. on `/discord` and header) opens your Discord server so users can get support, see announcements, and join the community.

### Step 1: Create a Discord server (if you don’t have one)

1. Open the Discord app or [discord.com](https://discord.com).
2. Click **+** (Add a Server) → **Create My Own** → choose a type (e.g. “For a club or community”).
3. Name it (e.g. “GIVRwrld”) and finish creation.

### Step 2: Create channels (recommended)

| Channel        | Purpose |
|----------------|--------|
| **#welcome**   | Rules, link to status page, how to get support. |
| **#announcements** | Maintenance, new games, incidents (read-only for most). |
| **#support**   | Where to ask for help or open a ticket. |
| **#status**    | Optional: link to your `/status` page or bot updates. |
| **#general**   | Community chat. |

Create them: right‑click server → **Create Channel** → name and set permissions (e.g. announcements read‑only).

### Step 3: Get an invite link

1. Right‑click the server name → **Invite People**.
2. Under **Invite Link**, create a link. Recommended: **Expire**: Never (or 7 days and refresh as needed), **Max uses**: No limit (or a high number).
3. Copy the link (e.g. `https://discord.gg/xxxxx`).

### Step 4: Configure the site

- **Local / Vite:** In the repo root, create or edit `.env`:
  ```env
  VITE_DISCORD_INVITE_URL=https://discord.gg/n9Bzk6Be
  ```
- **Production:** Set the same variable in your hosting/VPS env (e.g. Vite build env or server env that gets baked into the frontend build).

Restart the dev server (or rebuild the frontend) so the new env is picked up. The `/discord` page and any “Join Discord” buttons will use this link.

### Step 5: Verify

- Open your app → go to **/discord**.
- Click **Join our Discord** → your server should open. If the button says “Invite link not configured”, the env var is missing or not loaded for the build.

---

## Part 2: Ops alerts (webhook)

**What it does:** The API and agents (OpsWatchdog, ProvisioningAuditor, DailyKPIDigest) can send short alert messages to a Discord channel when something fails or when the daily KPI digest runs. No Discord bot required—only a webhook URL.

### Step 1: Create a channel for alerts

In your Discord server (or a separate “ops” server):

1. Create a channel, e.g. **#alerts** or **#ops**.
2. Optionally restrict who can see it (e.g. only you and your partner).

### Step 2: Create a webhook

1. Open **Server Settings** → **Integrations** → **Webhooks** (or right‑click the channel → **Edit Channel** → **Integrations** → **Webhooks**).
2. Click **New Webhook**. Name it (e.g. “GIVRwrld Alerts”), choose the **#alerts** channel.
3. Click **Copy Webhook URL**. It looks like:
   ```
   https://discord.com/api/webhooks/123456789/abcdef...
   ```
   Keep this secret (like a password).

### Step 3: Configure the API (backend)

In **`api/.env`** (on your machine and on the VPS):

```env
DISCORD_ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdef...
```

Restart the API and agents (e.g. `pm2 restart givrwrld-api givrwrld-agents` on the VPS) so they load the new env.

### Step 4: What gets sent

| Source              | When                         | Example message |
|---------------------|------------------------------|------------------|
| **OpsWatchdog**     | API, DB, or Panel check fails | “Check failed: db, api. DB=false API=false Panel=false” |
| **ProvisioningAuditor** | Order has `ptero_server_id` but server missing in Panel | “Order xyz had ptero_server_id 123 but server missing in Panel. Marked failed.” |
| **DailyKPIDigest**  | Once daily at 9:00 AM (local) | “New paid (24h): 3, MRR estimate: $50, Failed (24h): 0, Avg provision: 45s” |

Alerts are **rate-limited**: the same “issue key” (e.g. same type of ops failure) sends at most **one message per 10 minutes** to avoid spam.

### Step 5: Verify alerts

- **Option A:** Temporarily break something (e.g. stop the API or DB). Within 60 seconds OpsWatchdog should log; within ~10 min you may get one Discord message (then cooldown).
- **Option B:** Wait for the next 9:00 AM run of DailyKPIDigest; you should see one KPI message in the webhook channel if the agent is running.

If nothing appears: confirm `DISCORD_ALERT_WEBHOOK_URL` is set in `api/.env`, that the API/agents process was restarted, and check `api/logs/app.log` for `OpsWatchdog_alert_sent` or errors.

---

## Checklist

| Item | Env / Where | Done |
|------|-------------|------|
| Discord server created | — | ☐ |
| Channels set up (#welcome, #announcements, #support, #general, etc.) | — | ☐ |
| Invite link created (never expire or long-lived) | — | ☐ |
| `VITE_DISCORD_INVITE_URL` set | Root `.env` or build env | ☐ |
| “Join Discord” works on `/discord` | Frontend | ☐ |
| Alerts channel created (#alerts / #ops) | Discord | ☐ |
| Webhook created, URL copied | Discord → Integrations | ☐ |
| `DISCORD_ALERT_WEBHOOK_URL` set | `api/.env` (local + VPS) | ☐ |
| API/agents restarted after webhook env added | PM2 or dev process | ☐ |
| One test alert or KPI message received | Discord #alerts | ☐ |

---

## Security

- **Invite link:** Safe to expose; it only lets people join. Use “no expire” or refresh as needed.
- **Webhook URL:** Treat as a **secret**. Anyone with it can post to your channel. Don’t commit it to git; use `.env` only and keep `.env` in `.gitignore`.

---

## Optional: Status bot later

For a bot that posts “Server X online/offline” or status updates into a channel, you’d add a small Discord bot (token from Discord Developer Portal) that calls your API or Pterodactyl and posts to a channel. That’s a separate project; the roadmap above gets you **community + alerts** without any bot.

For more on how the Discord page and business use fit together, see **docs/DISCORD-FEATURE.md**.
