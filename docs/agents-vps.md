# Phase 1 VPS Agents

Agents run on the VPS (control plane) 24/7 alongside the API via PM2. They provide stability, observability, and auto-remediation.

## What runs

| Agent | Schedule | Purpose |
|-------|----------|---------|
| **OpsWatchdog** | Every 60s | Checks API health (`GET /api/health`), DB (`SELECT 1`), Pterodactyl Panel. On failure: logs structured JSON + optional Discord alert (rate-limited: same issue max 1 per 10 min). |
| **ProvisioningAuditor** | Every 5 min | Finds orders in `paid`/`provisioning` older than 10 min. No `ptero_server_id` → retries provisioning (idempotent). Has `ptero_server_id` → verifies server exists in Panel; if missing → marks order `failed` + alert. |
| **DailyKPIDigest** | 9:00 AM local | Logs + optional Discord: new paid (24h), MRR estimate, failed provisions (24h), avg provision time (24h). |

## Setup (VPS or local)

1. **Build agents** (TypeScript → `api/dist/agents/`):
   ```bash
   cd api && npm install && npm run agents:build
   ```
   From repo root:
   ```bash
   npm run agents:build
   ```

2. **Env** (in `api/.env`):
   - Same as API: `MYSQL_*`, `PANEL_URL`, `PANEL_APP_KEY`, `JWT_SECRET`, etc.
   - `API_BASE_URL` – base URL for health check (default `http://localhost:3001`). On VPS use `http://127.0.0.1:3001` or your internal URL.
   - `DISCORD_ALERT_WEBHOOK_URL` (optional) – Discord webhook for alerts. Alerts are rate-limited (same issue key: max 1 per 10 min).

3. **Optional migration** (for DailyKPIDigest paid-at and MRR):
   ```bash
   mysql -u app_rw -p app_core < migrations/20260224000000_add_paid_at_to_orders.sql
   ```

## Start / stop / restart

**PM2 (recommended on VPS)** – from repo root:

```bash
# Build agents then start both API and agents
cd api && npm run agents:build && cd .. && pm2 start ecosystem.config.cjs

# Or start only after first build
pm2 start ecosystem.config.cjs
```

- **Stop both:** `pm2 stop givrwrld-api givrwrld-agents`
- **Stop agents only:** `pm2 stop givrwrld-agents`
- **Restart agents only:** `pm2 restart givrwrld-agents`
- **Logs:** `pm2 logs` or `pm2 logs givrwrld-agents`
- **Persist on reboot:** `pm2 save` then `pm2 startup` (run the command it prints)

**Without PM2 (local dev):**

```bash
# Terminal 1 – API
cd api && npm run dev

# Terminal 2 – Agents (dev mode with watch)
npm run agents:dev
```

Production run (no watch):

```bash
npm run agents:build && npm run agents:start
```
(Run from repo root; or from `api/`: `npm run agents:build && npm run agents:start`.)

## Env vars (summary)

| Var | Required | Description |
|-----|----------|-------------|
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Yes | DB for orders and health. |
| `PANEL_URL`, `PANEL_APP_KEY` | Yes (for provisioning/panel checks) | Pterodactyl Panel API. |
| `API_BASE_URL` | No | Default `http://localhost:3001`. Use for OpsWatchdog health check. |
| `DISCORD_ALERT_WEBHOOK_URL` | No | Discord webhook; alerts only if set. |

## Observability

- **Shared logs:** API and agents write JSON lines to **stdout** and **`api/logs/app.log`** (size-based rotate at 5MB). Each line: `ts`, `level`, `service`, `event`, optional `req_id` (API), `run_id` (agents), `order_id`, `node_id`, `details`.
- **API correlation:** Each request has `req_id` (from `X-Request-Id` or generated); included in log lines.
- **Health:** `GET /api/health` returns `{ ok, ts, version, db, panel }` (no secrets). Used by OpsWatchdog and load balancers.

## Troubleshooting

| Symptom | Check |
|--------|--------|
| Agents not starting | Run from `api/`: `npm run agents:build` then `node dist/agents/index.js`. Fix any TS or runtime errors. |
| `Cannot find module '../config/database.js'` | Run agents with **cwd = api** (e.g. `cd api && node dist/agents/index.js` or PM2 with `cwd: './api'`). |
| No logs in `api/logs/app.log` | Ensure `api/logs` exists and is writable. Check stdout for errors. |
| OpsWatchdog always fails API check | Set `API_BASE_URL` to the URL the agents process can reach (e.g. `http://127.0.0.1:3001`). |
| Discord alerts not sent | Set `DISCORD_ALERT_WEBHOOK_URL` in `api/.env`. Same-issue cooldown is 10 min. |
| ProvisioningAuditor not retrying | Confirm orders are in `paid`/`provisioning`, older than 10 min, and have no `ptero_server_id`. Check `api/logs/app.log` for `ProvisioningAuditor_*` events. |
| DailyKPIDigest wrong MRR / new paid | Run migration `20260224000000_add_paid_at_to_orders.sql` and backfill `paid_at` if desired. |

## Files

- **Entry:** `api/agents/index.ts` → build → `api/dist/agents/index.js`
- **Agents:** `api/agents/OpsWatchdog.ts`, `ProvisioningAuditor.ts`, `DailyKPIDigest.ts`
- **Shared:** `api/lib/sharedLogger.js`, `api/lib/alertClient.js`
- **PM2:** `ecosystem.config.cjs` (repo root; `givrwrld-api` + `givrwrld-agents`)
