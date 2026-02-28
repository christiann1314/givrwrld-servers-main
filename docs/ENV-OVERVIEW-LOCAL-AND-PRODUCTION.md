# GIVRwrld: Local Dev vs Production Environment Overview

Short reference for explaining the stack to your team or partner. Use this for chat handoffs and dedicated-server migration context.

---

## 1. Local dev test environment

**Purpose:** Run the full product on your machine so you can test checkout → PayPal sandbox → auto-provisioning before deploying to the dedicated server.

### What runs locally

| Component | How it runs | Port / URL |
|-----------|-------------|------------|
| **Database** | Docker: `pterodactyl-mariadb-1` (shared with Pterodactyl) or `docker-compose.mysql.yml` | 3306 |
| **Redis** | Docker: `givrwrld-redis` (for BullMQ provisioning queue) | 6379 |
| **Pterodactyl** | Docker: `pterodactyl/` (panel, mariadb, redis, wings) | Panel 8000, Wings 8082 |
| **API** | `npm run dev:api` (Node --watch) | 3001 |
| **Provisioner worker** | `cd api; node workers/provisionerWorker.js` | — |
| **Frontend** | `npm run dev:frontend` (Vite) | 8080 (or 8081/8082/… if ports busy) |
| **PayPal webhook** | `npx localtunnel --port 3001` | HTTPS URL changes each run |

### Flow

1. User picks a game plan on the frontend → API creates a **pending** order and PayPal subscription → user approves in **PayPal sandbox**.
2. PayPal sends **BILLING.SUBSCRIPTION.ACTIVATED** to the **tunnel URL** (`https://….loca.lt/api/paypal/webhook`) or user hits success page → API calls **finalize-order**.
3. Order goes **paid** → API enqueues a **provision** job to BullMQ (Redis).
4. **Provisioner worker** consumes the job → calls Pterodactyl API → creates server → updates order to **provisioned** and writes `ptero_server_id` / `ptero_identifier`.

### Env you need

- **`api/.env`**: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE=app_core`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_SANDBOX=true`, `PANEL_URL=http://localhost:8000`, `PANEL_APP_KEY`, `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`, `FRONTEND_URL` / `PUBLIC_SITE_URL` (e.g. `http://localhost:8080`), `JWT_SECRET`.

### Quick start (after DB is up)

```bash
# 1. Pterodactyl + Redis (if not already up)
cd pterodactyl && docker compose up -d && cd ..
docker run -d --name givrwrld-redis -p 6379:6379 redis:alpine   # if not running

# 2. API, worker, frontend (separate terminals or background)
npm run dev:api
cd api; node workers/provisionerWorker.js
npm run dev:frontend

# 3. Tunnel (note the URL for PayPal webhook)
npx localtunnel --port 3001
# → Set in PayPal sandbox: https://<subdomain>.loca.lt/api/paypal/webhook
```

**Success check:** Place a test order (e.g. Rust or ARK) → order moves to `provisioned`, server appears in Pterodactyl panel and in the GIVRwrld dashboard.

---

## 2. Production (dedicated server migration)

**Purpose:** One dedicated server (e.g. Ubuntu on OVH/Hetzner) runs the **single global control plane**: API, workers, agents, and (optionally) MySQL/Redis on the same box. Pterodactyl can be on the same server or a separate node; game servers run via Pterodactyl Wings.

### What runs on the server

| Component | How it runs | Notes |
|-----------|-------------|--------|
| **MySQL/MariaDB** | System install (`mysql-server`) or Docker | Database `app_core`; user `app_rw` per `sql/grants.sql` |
| **Redis** | System install (`redis-server`) or Docker | BullMQ queue; same host as API |
| **API** | PM2: `givrwrld-api` | `api/server.js`, PORT 3001 (or behind nginx) |
| **Provisioner worker** | PM2: `givrwrld-provisioner` | `api/workers/provisionerWorker.js` |
| **Agents** | PM2: `givrwrld-agents` | OpsWatchdog, ProvisioningAuditor, etc. |
| **Marketing agent** | PM2: `givrwrld-marketing-agent` (cron hourly) | Drafts to DB + Discord founder-inbox |
| **Marketing schedule** | PM2: `givrwrld-marketing-schedule` (cron weekly) | Scheduled content events |
| **Frontend** | Static build served by **nginx** (or same nginx as API) | Built with `npm run build`; `dist/` |
| **nginx** | System service | Reverse proxy, TLS (certbot), rate limiting |
| **Pterodactyl** | Same server or separate; Panel + Wings | Panel URL and app key in `api/.env` |

### Single control plane

- One API, one DB (`app_core`), one Redis, one set of workers.
- Regions are **capacity pools** (e.g. `ptero_nodes` + `region_node_map`), not separate deployments.
- Adding regions = adding Pterodactyl nodes and mapping them in the DB; no per-region API split unless you explicitly design that later.

### Env and config

- **`api/.env`**: Same variables as local, but `NODE_ENV=production`, live PayPal credentials (`PAYPAL_SANDBOX=false`), real `PANEL_URL` and `PANEL_APP_KEY`, `FRONTEND_URL` / `PUBLIC_SITE_URL` set to your public domain(s).
- **PM2:** `pm2 start ecosystem.config.cjs` (from repo root). Then `pm2 save` and `pm2 startup` so everything restarts on reboot.
- **nginx:** Server blocks for API (e.g. `api.yourdomain.com`) and frontend (e.g. `www.yourdomain.com`); TLS via certbot. Configs live under `ops/nginx/`.

### Deployment flow

1. Install OS deps: Node 20+, PM2, MySQL, Redis, nginx, certbot.
2. Clone repo (e.g. `/opt/givrwrld`), `npm install` (root + api), copy/edit `api/.env`.
3. Run `npm run db:migrate` (and seeds if needed); ensure `app_core` and migrations are applied.
4. Build agents if used: `cd api && npm run agents:build`.
5. Start apps: `pm2 start ecosystem.config.cjs` → `pm2 save` → `pm2 startup`.
6. Configure nginx (and TLS), point DNS to the server.
7. In PayPal **live** app, set webhook URL to `https://api.yourdomain.com/api/paypal/webhook` (no tunnel).

### What “migration” means

- **From local:** You move from “my laptop + Docker + tunnel” to “one server + PM2 + nginx + real domain and TLS.”
- **Data:** Export `app_core` from local (or staging) if you have test data to keep; otherwise start fresh and re-seed plans/catalog on the server.
- **Smoke test:** After migration, run the same flow (signup → checkout → PayPal → provision) against the live frontend and API to confirm orders reach `provisioned` and servers show in the panel.

---

## One-line summary for chat/partner

- **Local:** Everything runs on your machine (Docker for DB/Redis/Pterodactyl, Node for API + worker + frontend). A tunnel exposes the API so PayPal sandbox can send webhooks. Used to test “pay → auto-provision” before go-live.
- **Production:** One dedicated server runs API, provisioner worker, agents, and (optionally) MySQL/Redis behind nginx with TLS. Same app and DB design; no per-region split. Migration = deploy that stack to the server, point DNS and PayPal webhook at it, and run the same smoke tests.
