# High-Level Roadmap: Local → Dedicated Server (Rise-3) and Go-Live

This roadmap describes how to move the GIVRwrld product from your local environment onto the **Rise-3 dedicated server** (US East, Vinthill) and go live. It assumes one server for the full stack: app, database, Redis, Pterodactyl Panel + Wings, and frontend.

---

## Phase 1: Pre-migration (local)

| Step | Action | Notes |
|------|--------|--------|
| 1.1 | Freeze feature work on `main` (or a release branch) | Reduces drift between local and first production deploy. |
| 1.2 | Confirm local smoke test | Signup → verify email → checkout (PayPal sandbox) → order reaches **provisioned**; server appears in Panel and dashboard. |
| 1.3 | Document production secrets | List what you’ll need on the server: `api/.env` (PayPal live, Panel URL/keys, SMTP, JWT, MySQL, Redis, `FRONTEND_URL` / `PUBLIC_SITE_URL`). Use `api/env.example` and `docs/ENV-OVERVIEW-LOCAL-AND-PRODUCTION.md`. |
| 1.4 | Decide on data | **Option A:** Fresh DB on server (no export). **Option B:** Export `app_core` from local and import on server (only if you need to keep users/orders for testing). For a clean go-live, Option A + re-seed plans/catalog is typical. |

**Exit:** You have a stable build, a clear list of env vars, and a data strategy.

---

## Phase 2: Server preparation (Rise-3)

| Step | Action | Notes |
|------|--------|--------|
| 2.1 | OS and access | Ubuntu (or preferred distro). SSH, firewall (e.g. 22, 80, 443, 3306 if remote DB; otherwise restrict 3306 to localhost). |
| 2.2 | Install Node 20+ | So the API, workers, and agents run. |
| 2.3 | Install PM2 | `npm install -g pm2` (or per-repo); used to run API, provisioner, agents, marketing jobs. |
| 2.4 | Install MySQL/MariaDB | Create database `app_core` and user per `sql/grants.sql`. Run `sql/app_core.sql` and all migrations under `sql/migrations/`. |
| 2.5 | Install Redis | BullMQ (provisioning queue) and reconcile job depend on it. |
| 2.6 | Install nginx + certbot | nginx for reverse proxy and TLS; certbot for Let’s Encrypt. |
| 2.7 | (Optional) Install Docker | Only if you prefer to run MySQL/Redis or Pterodactyl via Docker; otherwise use system installs. |

**Exit:** Server has Node, PM2, MySQL, Redis, nginx, and (optionally) Docker.

---

## Phase 3: Deploy application and Pterodactyl on the server

| Step | Action | Notes |
|------|--------|--------|
| 3.1 | Clone repo | e.g. `/opt/givrwrld` or `~/givrwrld-severs`. `npm install` at repo root and in `api/`. |
| 3.2 | Configure `api/.env` | Copy from local and set production values: `NODE_ENV=production`, live PayPal (`PAYPAL_SANDBOX=false`), `PANEL_URL` (e.g. `https://panel.<yourdomain.com>`), `PANEL_APP_KEY`, `FRONTEND_URL` / `PUBLIC_SITE_URL` (e.g. `https://www.<yourdomain.com>`), `MYSQL_*`, `REDIS_*`, `JWT_SECRET` / `JWT_REFRESH_SECRET`, SMTP (SendGrid), etc. |
| 3.3 | Run migrations and seeds | `npm run db:migrate`. Then seed catalog and plans: `npm run db:seed:catalog -- --apply`, `node api/scripts/seed-game-variant-plans.js`, and any other seeds you use (e.g. `node api/scripts/ensure-enshrouded-plans.js`). |
| 3.4 | Build frontend | `npm run build` (Vite). Output in `dist/`. |
| 3.5 | Build agents (if used) | `cd api && npm run agents:build`. |
| 3.6 | Install and configure Pterodactyl on same server | Panel (PHP) + Wings. One node: the Rise-3 server. Create nest “GIVRwrld Games”, import eggs (including Enshrouded), add allocations (e.g. 15636, 15637 for Enshrouded). Sync Panel → app_core: `npm run db:seed:catalog -- --apply`. Ensure `ptero_nodes` and `region_node_map` match your single node (e.g. `us-east` → that node). |
| 3.7 | Start app processes with PM2 | From repo root: `pm2 start ecosystem.config.cjs`. Then `pm2 save` and `pm2 startup` so processes survive reboot. |

**Exit:** API, provisioner, agents, and (optionally) marketing cron are running; Panel + Wings are running; DB and catalog are seeded; frontend is built.

---

## Phase 4: nginx, DNS, and TLS

| Step | Action | Notes |
|------|--------|--------|
| 4.1 | Point DNS to Rise-3 | A (and/or AAAA) for e.g. `www.<yourdomain.com>`, `api.<yourdomain.com>`, `panel.<yourdomain.com>` to the server’s public IP. |
| 4.2 | Configure nginx | Use `ops/nginx/` examples: API (e.g. `api.conf.example`), frontend (`www.conf.example`), Panel (`panel.conf.example`). Proxy API and Panel to localhost ports; serve frontend from `dist/`. |
| 4.3 | Obtain TLS certificates | Run certbot for each server name. Reload nginx. |
| 4.4 | Set production URLs in app | Ensure `api/.env` has `FRONTEND_URL` and `PUBLIC_SITE_URL` as the public frontend URL (e.g. `https://www.<yourdomain.com>`). Frontend build should use the same API base URL (e.g. `VITE_API_URL=https://api.<yourdomain.com>` at build time). |

**Exit:** Users can reach the site and API over HTTPS; Panel is on its subdomain.

---

## Phase 5: PayPal, SMTP, and external services

| Step | Action | Notes |
|------|--------|--------|
| 5.1 | Switch PayPal to live | In PayPal Developer (or live app), use live client ID/secret in `api/.env`. Set `PAYPAL_SANDBOX=false`. |
| 5.2 | Set PayPal webhook URL | In the live app, set webhook to `https://api.<yourdomain.com>/api/paypal/webhook`. Subscribe to `BILLING.SUBSCRIPTION.*` (and any others your code expects). No localtunnel in production. |
| 5.3 | Confirm SMTP (SendGrid) | `api/.env` already has SendGrid; ensure `SMTP_FROM` is a verified sender. Optional: run `node api/scripts/test-smtp.js` from the server. |
| 5.4 | (Optional) Status / monitoring | If you use a status page or external monitor, point it at `https://api.<yourdomain.com>/health` or `/ready` and optionally `/api/public/provisioning-stats`. |

**Exit:** Live payments and verification emails work; webhooks hit the API.

---

## Phase 6: Smoke tests and cutover

| Step | Action | Notes |
|------|--------|--------|
| 6.1 | Smoke test on production | From a clean browser (or incognito): Sign up → verify email → choose a game plan → checkout with PayPal (live, small amount or test account if available) → confirm order goes to **provisioned** and server appears in Panel and in the dashboard. |
| 6.2 | Test “Resend verification” and password reset (if applicable) | Ensure emails deliver. |
| 6.3 | Turn off or redirect local/staging | Stop exposing old URLs; point any internal links or docs to the live site. |
| 6.4 | Go-live | Announce (e.g. Discord, site banner). Monitor `pm2 logs`, nginx and Panel logs, and first few orders. |

**Exit:** Live traffic is on the Rise-3 stack; local is no longer the primary.

---

## Phase 7: Post-launch

| Step | Action | Notes |
|------|--------|--------|
| 7.1 | Backups | Schedule DB backups (`app_core`) and any critical config (e.g. `api/.env` in a secure store). Optionally Panel DB and Wings data. |
| 7.2 | Monitoring and alerts | Use PM2 plus optional alerts (e.g. uptime checks on `/health`, low disk, high memory). |
| 7.3 | Docs and runbooks | Keep `docs/ENV-OVERVIEW-LOCAL-AND-PRODUCTION.md`, `docs/DEBUG-PROVISIONING-FAILURE.md`, and incident/rollback steps (e.g. `docs/incident-playbook.md`) updated for production. |
| 7.4 | Capacity and scaling | Rise-3 (64GB RAM, 2×512GB NVMe) supports many game instances; monitor `ptero_node_capacity_ledger` and add a second node or region when needed. |

---

## One-page flow (summary)

```
Local (done) → Prep server (Node, PM2, MySQL, Redis, nginx) → Deploy app (clone, env, migrate, seed, build) 
→ Install Pterodactyl (Panel + Wings) on same server → Sync catalog → nginx + DNS + TLS 
→ PayPal live + webhook + SMTP → Smoke test (signup → pay → provision) → Go-live → Backups + monitoring.
```

---

## References

- **Env and topology:** `docs/ENV-OVERVIEW-LOCAL-AND-PRODUCTION.md`
- **PM2 processes:** `ecosystem.config.cjs` (API, provisioner, agents, marketing)
- **nginx examples:** `ops/nginx/*.conf.example`, `ops/nginx/README.md`
- **DB schema and grants:** `sql/app_core.sql`, `sql/grants.sql`, `sql/migrations/`
- **Catalog and eggs:** `npm run db:seed:catalog -- --apply`, `api/scripts/seed-game-variant-plans.js`, `api/scripts/import-enshrouded-egg.js`
- **Provisioning debug:** `docs/DEBUG-PROVISIONING-FAILURE.md`
