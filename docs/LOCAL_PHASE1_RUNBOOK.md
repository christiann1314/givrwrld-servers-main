# Local Phase 1 Runbook — 24/7 runtime with PM2

Stabilize the stack locally with deterministic order lifecycle, idempotent webhooks, safe retry, structured logging, and lightweight agents. No VPS or Docker; PM2 keeps API and agents running.

---

## Prerequisites

- Node.js 18+ (API and agents)
- MariaDB/MySQL with `app_core` and Phase 1 migration applied
- API `.env` in `api/` (see `api/.env.example` or LAUNCH-STACK.md)

---

## 1. Install PM2

```bash
npm install -g pm2
```

Or use npx (no global install):

```bash
npx pm2 start ecosystem.config.cjs
```

---

## 2. Start processes

From the **repo root**:

```bash
# Start both API and agents (recommended)
npm run pm2:start
```

Or start only API, then agents:

```bash
npm run start:prod
# In another terminal:
npm run start:agents
```

With PM2 (from repo root):

```bash
pm2 start ecosystem.config.cjs
```

This starts:

- **givrwrld-api** — Express API (port 3001), logs under `api/logs/`
- **givrwrld-agents** — OpsWatchdog (5 min), ProvisioningAuditor (15 min), GrowthAdsGenerator (every 2 days)

---

## 3. Save process list (so PM2 can resurrect after reboot)

After starting:

```bash
pm2 save
pm2 startup
```

`pm2 startup` prints a command (e.g. for Windows or Linux). Run that command once so PM2 starts on boot.

---

## 4. Windows Task Scheduler + `pm2 resurrect`

If you use Windows and want the stack to come back after reboot:

1. **Save the process list** (after `pm2 start`):
   ```bash
   pm2 save
   ```

2. **Create a scheduled task** that runs at system startup (or at user logon):
   - Program: `pm2` (or full path to `pm2.cmd` if needed)
   - Arguments: `resurrect`
   - Start in: your repo root (e.g. `C:\...\givrwrld-severs-main`)

3. Alternatively, run a small script at startup that does:
   ```bash
   cd C:\path\to\givrwrld-severs-main
   pm2 resurrect
   ```

---

## 5. Useful commands

| Command | Description |
|--------|-------------|
| `npm run pm2:logs` | Tail all PM2 logs |
| `pm2 logs givrwrld-api` | API logs only |
| `pm2 logs givrwrld-agents` | Agents logs only |
| `pm2 status` | List processes and status |
| `pm2 restart givrwrld-api` | Restart API only |
| `pm2 restart givrwrld-agents` | Restart agents only |
| `npm run pm2:stop` | Stop both apps (ecosystem) |

---

## 6. Log files

| What | Where |
|------|--------|
| API structured logs | `api/logs/api.log` (when `LOG_TO_FILE=true` or NODE_ENV=production) |
| API stdout/stderr (PM2) | `api/logs/out.log`, `api/logs/err.log` |
| Agents structured log | `api/logs/agents.log` |
| Agents stdout/stderr (PM2) | `api/logs/agents-out.log`, `api/logs/agents-err.log` |
| Marketing output | `marketing/YYYY-MM-DD.txt` (GrowthAdsGenerator) |

---

## 7. Troubleshooting

**API won’t start**
- Check `api/.env` (MYSQL_*, JWT_SECRET, etc.).
- Run migration if not done: `mysql -u app_rw -p app_core < migrations/20260220000000_phase1_order_idempotency.sql`
- Check port 3001 is free: `netstat -an | findstr 3001` (Windows) or `lsof -i :3001` (Mac/Linux).

**Agents fail or no agents.log**
- Ensure API is up (OpsWatchdog and ProvisioningAuditor depend on DB; agents load `api/.env` via runner cwd).
- Check `api/logs/agents-err.log` for errors.
- Ensure `api/logs` exists (runner creates it).

**PM2 resurrect doesn’t restore processes**
- Run `pm2 save` after any change you want persisted.
- On Windows, ensure the startup task runs in the correct directory and that `pm2` is on PATH when the task runs.

**Health / ready fail**
- `GET /health`: no DB required; returns uptime, version, memory.
- `GET /ready`: requires DB and required env vars; fix DB connection and `.env` if 503.

**Stuck orders not retrying**
- ProvisioningAuditor runs every 15 minutes; in-API reconcile runs every 2 minutes; ReconcileSubscriptions/ReconcileOrders run every 15 minutes via agents. Check `api/logs/agents.log` and API logs for “Reconcile”, “ProvisioningAuditor”, “ReconcileSubscriptions”, or “ReconcileOrders”.
- Ensure order is in `paid`/`provisioning`/`error`/`failed` with no `ptero_server_id` and past the stuck threshold (default 10 min).

---

## 8. Implementation checklist (Phase 1 Local)

### PART A — Reliability hardening
- [x] Structured logging (pino) with correlation ID per request (`X-Request-Id` / `req.id`)
- [x] Log fields in key paths: `order_id`, `user_id`, `paypal_subscription_id`, `ptero_server_id`, `paypal_event_id` (via structured logs in paypal/servers/OrderService)
- [x] Logs written to `api/logs/api.log` when `LOG_TO_FILE=true` or `NODE_ENV=production`
- [x] GET `/health`: returns uptime, version, memory usage
- [x] GET `/ready`: checks DB connection + required env vars
- [x] Webhook idempotency: `paypal_webhook_events` table stores `event_id`; return 200 if already processed
- [x] Finalize/provision safety: OrderService state guard; order cannot provision twice; retry-safe finalize

### PART B — Agent framework
- [x] `api/agents/runner.js`: scheduler (node-cron), agent registration, logs to `api/logs/agents.log`
- [x] **OpsWatchdog**: every 5 min; DB connectivity + API health; logs status snapshot
- [x] **ProvisioningAuditor**: every 15 min; finds stuck orders (paid/provisioning > threshold); calls safe retry; logs actions
- [x] **GrowthAdsGenerator**: every 2 days; 3 hooks, 2 ad scripts, 1 CTA block → `marketing/YYYY-MM-DD.txt`

### PART C — Local 24/7 runtime
- [x] `ecosystem.config.cjs` at repo root: api + agents, max_memory_restart 500M, log paths
- [x] Scripts: `start:prod`, `start:agents`, `pm2:start`, `pm2:stop`, `pm2:logs`
- [x] `docs/LOCAL_PHASE1_RUNBOOK.md`: PM2 install, start, save, Windows Task Scheduler + `pm2 resurrect`, troubleshooting

### Schema additions (existing from prior Phase 1)
- `paypal_webhook_events` (event_id PK, received_at, raw_type, order_id)
- `orders`: `provision_attempt_count`, `last_provision_attempt_at`, `last_provision_error`; status `failed`; unique `ptero_server_id`

---

## 9. Verification steps

**Automated script (run first)**  
From repo root, with API running for full checks:

```bash
node api/scripts/verify-phase1-local.js
```

This checks: GET /health, GET /ready, api/logs writable, marketing/ writable and sample file, agent modules load, and optionally DB schema (paypal_webhook_events, orders columns). Exit code 0 = all automatable checks passed.

**Webhook idempotency**
1. Run: `npm run verify:webhook-idempotency` (sends same fake event twice to `/api/paypal/webhook`). Both must return 200.
2. Or manually: send a PayPal webhook (or replay) with a given `event_id`, then send the same event again. Second response must be **200** with no duplicate order update or provisioning.
3. In DB: `SELECT * FROM paypal_webhook_events WHERE event_id = '<id>';` — single row.

**Stuck order retry**
1. Put an order in `paid` with no `ptero_server_id` (e.g. panel down), wait >10 minutes.
2. Fix panel or ensure retry logic can succeed. Wait for ProvisioningAuditor (15 min) or in-API reconcile (2 min).
3. Check `api/logs/agents.log` for “ProvisioningAuditor” and “orders_attempted”; order should move to `provisioned` or next attempt logged.

**Agent schedule**
1. Start agents: `npm run start:agents` or `pm2 start ecosystem.config.cjs`.
2. Within 5 min, check `api/logs/agents.log` for “OpsWatchdog snapshot” (db, api status).
3. Within 15 min, check for “ProvisioningAuditor” run.
4. GrowthAdsGenerator: run at 00:00 every 2 days; or trigger manually by temporarily changing cron to `* * * * *` and checking `marketing/YYYY-MM-DD.txt`.

**PM2 restart**
1. `pm2 start ecosystem.config.cjs` then `pm2 stop all` then `pm2 start ecosystem.config.cjs` (or `pm2 resurrect` if you ran `pm2 save`).
2. `GET http://localhost:3001/health` returns 200 with uptime, version, memory.
3. `pm2 status` shows both `givrwrld-api` and `givrwrld-agents` online.
