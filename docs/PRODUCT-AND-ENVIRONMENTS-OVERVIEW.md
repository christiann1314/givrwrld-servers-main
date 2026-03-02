# GIVRwrld – Product & Environments Overview

This document gives a single overview of the product, the **development** environment, and the **production** environment.

---

## 1. Product Overview

**GIVRwrld** (GIVRwrld Servers) is a **premium game server hosting** platform. Customers choose a game and plan, pay with **PayPal Subscriptions**, and game servers are **auto-provisioned** on **Pterodactyl** (Panel + Wings) with one-click. No Stripe or Supabase in the primary purchase flow; checkout, orders, and provisioning go through the **Express API** and **MySQL/MariaDB**.

### What the product does

- **Marketing & discovery:** Public site (home, Deploy, About, FAQ, Support, Discord, Affiliate, Status, game config pages).
- **Auth:** Signup, login, JWT, email verification (SMTP/SendGrid).
- **Checkout:** Plan selection → PayPal subscription → approval URL → redirect back to success page.
- **Order lifecycle:** `pending` → `paid` (webhook or finalize-order) → `provisioning` → `provisioned` (or `error` with retry).
- **Provisioning:** Backend creates Pterodactyl user (if needed), picks node/allocation, creates server from plan’s egg; reconcile job retries stuck orders every 2 minutes.
- **Dashboard:** Billing, services list, panel links, live stream/polling for server state, support, affiliate, traffic.
- **Support:** Tickets and messages via API.
- **Optional:** Marketing agent (Discord/Reddit/TikTok drafts from DB events); BullMQ provisioner worker; status page and public provisioning stats (per staged plan).

### Tech stack (summary)

| Layer        | Technology                |
|-------------|----------------------------|
| **Frontend**| Vite 5 + React 18 + TypeScript, Tailwind, Radix/shadcn, React Router |
| **Backend** | Node.js (ESM) + Express     |
| **Database**| MySQL / MariaDB (`app_core`) |
| **Payments**| PayPal Subscriptions (webhook + finalize-order) |
| **Game infra** | Pterodactyl Panel + Wings |
| **Auth**    | JWT (Express), bcryptjs    |
| **Process manager (prod)** | PM2 (API + agents + optional workers + marketing) |

### Games supported

Minecraft, Palworld, Rust, Ark, Terraria, Factorio, Among Us, Mindustry, Rimworld, Vintage Story, Veloren, Teeworlds. Each has a config page, plan ↔ `ptero_egg_id` ↔ `ptero_eggs`, and game-specific env (e.g. Rust RCON, Ark BATTLE_EYE).

### Repo layout (high level)

```
├── src/                 # Vite + React frontend (components, pages, lib, config)
├── api/                 # Express backend (routes, config, scripts, jobs, agents, workers)
├── pterodactyl/         # Docker setup for Panel + Wings (optional)
├── services/marketing-agent/  # Marketing drafts + Discord webhook (cron/hourly + weekly)
├── docs/                # Setup, reference, deploy, runbooks
├── sql/                 # app_core schema, seed scripts
├── migrations/          # Versioned SQL migrations
├── ecosystem.config.cjs # PM2 apps (API, agents, provisioner, marketing)
└── README.md, LAUNCH-STACK.md, LAUNCH-OPERATING.md
```

---

## 2. Development Environment

Development runs **on your machine** with local processes and (optionally) Docker for the database and Pterodactyl.

### Ports and URLs

| Service    | URL / Port        | Notes |
|------------|-------------------|--------|
| **Frontend** | http://localhost:8080 | Vite dev server (HMR). |
| **Backend API** | http://localhost:3001 | Express. |
| **Database** | localhost:3306 | MariaDB/MySQL, database `app_core`. |
| **Pterodactyl Panel** | http://localhost:8000 | Optional; Wings often on 8082. |

When the app is served from `localhost:8080`, the frontend **forces** the API base to `http://localhost:3001` (see `src/lib/api.ts`), so no `.env` is required for API URL in basic local dev.

### How to run the stack

1. **Database (recommended: Docker)**  
   From repo root:
   ```bash
   docker compose -f docker-compose.mysql.yml up -d
   ```
   See **docs/LOCAL-DB-DOCKER.md** for `app_core`, user `app_rw` / `devpass`, and migrations.

2. **Backend**  
   ```bash
   cd api
   cp .env.api.example .env   # or create from README/LAUNCH-STACK
   # Set at least: PORT=3001, MYSQL_*, PAYPAL_* (sandbox), JWT_SECRET, PANEL_* if provisioning
   npm install
   npm run dev
   ```
   API: http://localhost:3001. Health: http://localhost:3001/health.

3. **Frontend**  
   From repo root:
   ```bash
   npm install
   npm run dev
   ```
   App: http://localhost:8080.

4. **Optional – from root**  
   - `npm run dev:api` (API)  
   - `npm run dev:frontend` (frontend)

### Dev environment variables

- **Frontend (root `.env` or env files):**  
  - `VITE_API_URL` or `VITE_API_BASE_URL` – optional; defaults to `http://localhost:3001` when served on 8080.  
  - Optional: `VITE_PANEL_URL`, `VITE_APP_NAME`, `VITE_APP_URL`, `VITE_DISCORD_INVITE_URL`, etc. (see `src/config/environment.ts`, `src/config/env.ts`).

- **Backend (`api/.env`):**  
  - **Required:** `PORT` (e.g. 3001), `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE=app_core`, `JWT_SECRET`.  
  - **PayPal (dev):** `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_SANDBOX=true`.  
  - **Provisioning:** `PANEL_URL`, `PANEL_APP_KEY`; optional `PTERO_DEFAULT_ALLOCATION_ID` / `PTERO_ALLOCATION_IDS`.  
  - **CORS:** `FRONTEND_URL` (comma-separated origins; can be permissive in dev).  
  - See `LAUNCH-STACK.md` and `.env.api.example` (and any other `.env.*.example` in repo) for full lists.

### Dev-only behavior

- **Finalize-order:** Success page can call finalize endpoint when webhook didn’t run (e.g. no tunnel).
- **Return URLs:** Frontend can resolve return base so checkout redirects stay on `localhost:8080`.
- **Logging:** Pino to stdout; optional file logs.
- **Migrations:** Run manually from `migrations/` when you add or change schema.

### Useful dev scripts

- Sync panel eggs to app DB: `node api/scripts/sync-pterodactyl-catalog.js --apply`
- Seed plans: `api/scripts/seed-12-games-plans.js`, `seed-game-variant-plans.js`, `seed-minecraft-variant-plans.js`
- Bootstrap eggs in panel: `api/scripts/bootstrap-pterodactyl-eggs.js`
- From root: `npm run db:seed:catalog`, `db:seed:plans`, `db:seed:ptero`, `db:seed:all` (see `package.json`)

---

## 3. Production Environment

Production runs on a **VPS (or dedicated server)** with **PM2**, a **reverse proxy (Nginx/Caddy)**, and **TLS**. The same codebase is used; behavior is gated by `NODE_ENV=production` and production env vars.

### Roles (typical)

- **One VPS:** API + MariaDB + Nginx (reverse proxy). Optionally same host runs Pterodactyl Panel.
- **Game nodes:** Separate machine(s) run Pterodactyl Wings; Panel points to these nodes (e.g. US-East = one game node at launch).

### Process manager (PM2)

From **repo root**, `npm run pm2:start` (or `pm2 start ecosystem.config.cjs`) starts:

| PM2 app                 | Script                          | Purpose |
|-------------------------|----------------------------------|--------|
| **givrwrld-api**        | `api/server.js`                 | Express API, PORT 3001, NODE_ENV=production. |
| **givrwrld-agents**      | `api/dist/agents/index.js`      | OpsWatchdog, ProvisioningAuditor, DailyKPIDigest. |
| **givrwrld-provisioner** | `api/workers/provisionerWorker.js` | Optional BullMQ provisioner. |
| **givrwrld-marketing-agent** | `services/marketing-agent/src/index.js` | Hourly (cron_restart). |
| **givrwrld-marketing-schedule** | `services/marketing-agent/src/scheduleWeekly.js` | Weekly (e.g. Monday 00:00). |

Use `pm2 save` and `pm2 startup` so processes survive reboot. Logs go to `./logs/` (or paths in `ecosystem.config.cjs`).

### Reverse proxy and TLS

- **TLS:** Terminate at Nginx/Caddy (e.g. Let’s Encrypt).  
- **Proxy:** `https://yourdomain.com` → `http://127.0.0.1:3001` (API).  
- **Static frontend:** Serve `dist/` from `vite build` via Nginx/Caddy (or same host).  
- **Firewall:** Open 22 (SSH), 80 (HTTP), 443 (HTTPS). Do not expose 3001, 3306, or 8000 to the internet unless intended.

### Production environment variables

- **API (`api/.env`):**  
  - Same as dev, but: **strong `JWT_SECRET`**, **production PayPal** (`PAYPAL_SANDBOX=false`, live credentials, `PAYPAL_WEBHOOK_ID`), **production `PANEL_URL` and `PANEL_APP_KEY`**.  
  - **`FRONTEND_URL`:** Comma-separated production origins (e.g. `https://givrwrldservers.com`) for CORS.  
  - **`NODE_ENV=production`** (PM2 sets this in ecosystem.config.cjs for the API).  
  - Optional: encrypted secrets (AES_KEY), Pterodactyl allocation IDs, SendGrid for email.

- **Frontend (build-time):**  
  - Set `VITE_API_URL` (or `VITE_API_BASE_URL`) to production API (e.g. `https://api.givrwrldservers.com`).  
  - Set `VITE_APP_URL`, `VITE_PANEL_URL`, etc., for production.  
  - Build: `npm run build`; output in `dist/` served by the web server.

### Deploy workflow

1. **Local:** Test locally (frontend + API + DB).  
2. **Push:** Commit and push to `main`.  
3. **On server:**  
   ```bash
   cd /path/to/repo
   git pull origin main
   npm install
   npm run build
   pm2 restart all
   ```  
   Run any new **migrations** when you’ve added migration files.

See **docs/DEPLOY-WORKFLOW.md** and **docs/deploy-vps.md** for details (backups, monitoring, systemd alternative).

### Production behavior and ops

- **CORS:** Restricted to `FRONTEND_URL` origins.  
- **Webhook:** PayPal sends to `https://your-api/api/paypal/webhook`; signature verification and idempotency via `paypal_events_log`.  
- **Health:** `GET /health` (process), `GET /ready` (DB + required env), `GET /api/health` (DB + optional panel).  
- **Observability:** Pino logs, request IDs; optional central logs and uptime/alerting (see **LAUNCH-OPERATING.md** and **OBSERVABILITY_SETUP.md**).  
- **Backups:** Daily `mysqldump app_core`; retain env/secrets and Panel config (see **docs/deploy-vps.md**).

---

## 4. Quick reference

| Topic           | Dev | Production |
|----------------|-----|------------|
| **Frontend**   | `npm run dev` → :8080 | `vite build` → serve `dist/` via Nginx/Caddy |
| **API**        | `cd api && npm run dev` → :3001 | PM2 `givrwrld-api` → :3001, proxy via Nginx/Caddy |
| **DB**         | Docker MariaDB :3306 or local MySQL | MariaDB/MySQL on VPS |
| **Panel**      | Optional local :8000 | Production Panel URL in `PANEL_URL` |
| **API base**   | `http://localhost:3001` (auto when on :8080) | `VITE_API_URL` set at build time |
| **PayPal**     | Sandbox, optional webhook tunnel | Live credentials, webhook URL HTTPS |
| **CORS**       | Permissive or `FRONTEND_URL` | `FRONTEND_URL` production domains only |
| **Processes**  | Manual terminals (frontend + API) | PM2 (API + agents + optional workers + marketing) |

For run instructions and purchase flow, see **LAUNCH-STACK.md**. For go-live checklist, KPIs, and rollback, see **LAUNCH-OPERATING.md**. For full stack details, see **docs/TECH-STACK-OVERVIEW.md**.
