## GIVRwrld Deployment & Local Setup

This doc describes how to go from a fresh clone to a running stack for **local development** and a **single VPS / dedicated server** using the existing entrypoints. For a full **production server** walkthrough (fresh Ubuntu, nginx, backups, rollback, restore drill), see [DEPLOYMENT_PROD.md](./DEPLOYMENT_PROD.md).

For deeper background, see `docs/LOCAL_PHASE1_RUNBOOK.md`, `docs/MYSQL_SETUP.md`, `docs/PAYPAL_SETUP.md`, and `docs/PTERODACTYL_LOCAL_SETUP.md`.

---

### 1. Prerequisites

- **Node.js** 20+ and **npm**
- **MySQL 8 / MariaDB** reachable from the API
- **Redis** (for the provisioning queue; local or managed)
- Optional but recommended for prod-like runs:
  - **PM2** globally: `npm install -g pm2`
  - **nginx** (for TLS / reverse proxy)

---

### 2. Install dependencies

From the repo root:

```bash
npm install           # frontend + root utilities
cd api && npm install
```

If you use the marketing agent:

```bash
cd services/marketing-agent && npm install  # if package.json is present
```

---

### 3. Configure environment

#### API (`api/.env`)

1. Copy the example:

```bash
cd api
cp env.example .env
```

2. Fill in at least:
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - `JWT_SECRET`
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_SANDBOX`
   - `PANEL_URL`, `PANEL_APP_KEY` (for provisioning)
   - `FRONTEND_URL`, `PUBLIC_SITE_URL`

3. Optionally set:
   - `LOG_TO_FILE`, `LOG_LEVEL`
   - `DISCORD_ALERT_WEBHOOK_URL`
   - SMTP settings for support email
   - Redis connection for the provisioning queue:
     - Either `REDIS_URL` (e.g. `redis://localhost:6379/0`)
     - Or `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`

#### Marketing agent (`services/marketing-agent/.env`)

1. Copy the example (if visible in your editor; file is `.env.example`):

```bash
cd services/marketing-agent
cp .env.example .env
```

2. Ensure the `MYSQL_*` values match the API DB, and set:
   - `DISCORD_MARKETING_WEBHOOK_URL`
   - Optional throttling vars (`MARKETING_MAX_DISCORD_PER_RUN`, etc.)

---

### 4. Database: bootstrap schema and migrations

From the repo root, with `MYSQL_*` set in your environment or `api/.env`, you can apply the core schema and migrations:

```bash
npm run db:migrate
```

This will:

- Ensure the `app_core` database exists
- Apply `sql/app_core.sql`
- Apply all `sql/migrations/*.sql` in filename order

You can also run the SQL files manually using the MySQL CLI as described in `docs/MYSQL_SETUP.md`.

---

### 5. Run the stack locally

From the repo root:

- **Frontend (Vite)**:

  ```bash
  npm run dev:frontend
  ```

- **API (Express)**:

  ```bash
  npm run dev:api
  ```

- **Agents (OpsWatchdog, ProvisioningAuditor, DailyKPIDigest)**:

  ```bash
  npm run agents:dev  # or: npm run start:agents
  ```

- **Marketing agent (one-shot)**:

  ```bash
  npm run marketing:run
  npm run marketing:schedule  # insert weekly scheduled_content events
  ```

Smoke tests and verification helpers:

```bash
npm run verify:phase1
npm run verify:webhook-idempotency
```

---

### 6. Run with PM2 (VPS / dedicated server)

On a single VPS / dedicated server where Node, MySQL, and Redis are installed:

1. Ensure `api/.env` is configured for your production DB, PayPal, panel, and Redis.
2. From the repo root, start the long-running processes:

```bash
npm run pm2:start
```

This uses `ecosystem.config.cjs` to start:

- `givrwrld-api` (Express API)
- `givrwrld-agents` (Ops agents)
- `givrwrld-provisioner` (BullMQ provisioning worker)
- `givrwrld-marketing-agent` (hourly, cron-based)
- `givrwrld-marketing-schedule` (weekly, cron-based)

You can inspect logs with:

```bash
npm run pm2:logs
```

To stop all PM2 apps defined here:

```bash
npm run pm2:stop
```

---

### 7. Config sanity check

After setting up env vars, you can run a basic environment check from the repo root:

```bash
npm run ops:config:check
```

This loads `api/.env`, validates required variables via `api/lib/env.js`, and prints the effective configuration (sensitive values are not echoed).

---

### 8. From fresh box to “hello world”

On a fresh Linux box:

1. Install Node.js, MySQL, and PM2.
2. Clone this repo and run `npm install` (root) and `cd api && npm install`.
3. Configure `api/.env` from `api/env.example` with real DB/PayPal/Panel credentials.
4. Run `npm run db:migrate` to create `app_core` and apply schema/migrations.
5. Start the API and agents with `npm run pm2:start`.
6. Point your browser or API client at `http://<server>:3001` to hit the API and `/ops/summary` for a basic health/ops snapshot.

