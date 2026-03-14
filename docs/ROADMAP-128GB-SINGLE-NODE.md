# Roadmap: Put the Business on the 128 GB Node

**Goal:** Run the full GIVRwrld stack on your **single OVH 128 GB node** (Ryzen 9 5900X, 2×512 GB NVMe) — control (API, DB, Panel, frontend) and game capacity (Wings) on one server. No separate control VPS.

**Cost:** Server at **$138/month**; no extra node. Maximize profit by filling ~25–30 slots at current pricing.

---

## This deployment: server and DNS

**New OVH 128 GB node (this server):**

| Item | Value |
|------|--------|
| **Hostname** | `ns1015681.ip-15-204-163.us` |
| **IPv4** | `15.204.163.237` |
| **IPv6** | `2604:2dc0:100:51ed::/64` |
| **Location** | US East (Vinthill) |

**Current Cloudflare DNS (givrwrldservers.com)** points to the **previous** server IP `15.204.251.32`. When you cut over to the new node, update every A record to the **new** IP below.

**DNS change (when going live):** In Cloudflare, for each of these records, set **Content** to the new server IPv4. Keep all six; `dedicated` and `node` have real use.

| Record | Name | Content | Proxy |
|--------|------|---------|--------|
| A | `@` (root) | `15.204.163.237` | Proxied |
| A | `www` | `15.204.163.237` | Proxied |
| A | `api` | `15.204.163.237` | DNS only |
| A | `panel` | `15.204.163.237` | DNS only |
| A | `dedicated` | `15.204.163.237` | DNS only |
| A | `node` | `15.204.163.237` | DNS only |

Optional: add AAAA records with `2604:2dc0:100:51ed::1` (or your chosen host from the /64) for IPv6.

**OS on the new server:** The OVH box is currently in **rescue mode** with **no production OS installed**. Before Phase 2, in the OVH manager install an OS (e.g. **Ubuntu 22.04** or **24.04**), then use that for the rest of the roadmap.

**Automated setup script:** After SSH is working, you can run one script on the server to do Phase 2 and most of Phase 3 (install Node, PM2, MariaDB, Redis, Docker, nginx, DB schema, migrations, seed plans, frontend build). From your PC, copy the repo to the server, then on the server run:

```bash
# On the server (after cloning or copying the repo to /opt/givrwrld):
cd /opt/givrwrld
bash ops/setup-128gb-node.sh
```

Then follow the “Next steps (manual)” printed at the end (edit `api/.env`, start Pterodactyl Docker, Panel setup, nginx, PM2). See **ops/setup-128gb-node.sh** and the script’s final echo for details.

---

## Resource budget (128 GB RAM)

| Use | RAM (approx) | Notes |
|-----|--------------|--------|
| **OS + system** | ~2 GB | Kernel, SSH, systemd. |
| **MariaDB** | ~2–4 GB | `app_core` + Panel DB if shared or separate. |
| **Redis** | ~0.5 GB | Queue + Panel cache/session. |
| **Pterodactyl Panel** | ~1–2 GB | PHP-FPM. |
| **Node (API + provisioner + agents)** | ~1–2 GB | PM2 processes. |
| **Wings + Docker overhead** | ~2–4 GB | Daemon + container overhead. |
| **Reserve / buffers** | ~5–10 GB | Spikes, restarts. |
| **Total control stack** | **~15–25 GB** | |
| **Game instances (Wings)** | **~100–105 GB** | Sell as 2–8 GB plans → ~25–30 slots. |

Do **not** over-commit RAM in Pterodactyl: set the node’s “memory limit” so allocated game RAM stays under ~105 GB so the host never OOMs.

---

## Phase 1: Pre-migration (local)

| # | Action | Done |
|---|--------|------|
| 1.1 | Freeze feature work; use a release branch if needed. | ☐ |
| 1.2 | Local smoke test: signup → verify email → checkout (PayPal sandbox) → order **provisioned**, server in Panel and dashboard. | ☐ |
| 1.3 | List production secrets: `api/.env` (PayPal live, Panel URL/keys, SMTP, JWT, MySQL, Redis, `FRONTEND_URL`). See `api/.env.example` or `docs/ENV-OVERVIEW-LOCAL-AND-PRODUCTION.md`. | ☐ |
| 1.4 | Data: **fresh DB** on server + seed plans/catalog, or export `app_core` from local only if you need to keep test data. | ☐ |

**Exit:** Stable build, env list, and data strategy.

---

## Phase 2: Server preparation (128 GB node)

| # | Action | Done |
|---|--------|------|
| 2.0 | **Install OS:** In OVH manager, install Ubuntu 22.04 (or 24.04) on the server (it is currently in rescue with no OS). Reboot and SSH in. | ☐ |
| 2.1 | **OS config:** SSH (22), firewall: 22, 80, 443; allow 8082 and 2022 if Wings is exposed; keep 3306 localhost-only unless you use a remote DB. | ☐ |
| 2.2 | **Node 20+** for API, workers, agents. | ☐ |
| 2.3 | **PM2** global or in repo: `npm install -g pm2`. | ☐ |
| 2.4 | **MariaDB/MySQL:** Create `app_core` (and `panel` if Panel uses same server). Run `sql/app_core.sql`, `sql/grants.sql`, all `sql/migrations/`. | ☐ |
| 2.5 | **Redis** for BullMQ (provisioning queue) and Panel cache/session. | ☐ |
| 2.6 | **Docker** for Pterodactyl (Panel + Wings) or install Panel (PHP) + Wings natively; Docker is simpler from repo (`pterodactyl/docker-compose.yml`). | ☐ |
| 2.7 | **nginx + certbot** for reverse proxy and TLS. | ☐ |

**Exit:** Node, PM2, MySQL, Redis, Docker (or Panel/Wings native), nginx installed.

---

## Phase 3: Deploy app + Pterodactyl on the 128 GB node

| # | Action | Done |
|---|--------|------|
| 3.1 | Clone repo (e.g. `/opt/givrwrld` or `~/givrwrld-severs`). `npm install` at root and in `api/`. | ☐ |
| 3.2 | **api/.env** production: `NODE_ENV=production`, live PayPal (`PAYPAL_SANDBOX=false`), `PANEL_URL` (e.g. `https://panel.<domain>`), `PANEL_APP_KEY`, `FRONTEND_URL` / `PUBLIC_SITE_URL`, `MYSQL_*`, `REDIS_*`, `JWT_SECRET` / `JWT_REFRESH_SECRET`, SMTP. Set `PTERO_DEFAULT_ALLOCATION_ID` (and optionally `PTERO_ALLOCATION_IDS`) to a **free** allocation ID from Panel → Allocations. | ☐ |
| 3.3 | **DB:** Run migrations; seed catalog and plans: `node api/scripts/sync-pterodactyl-catalog.js --apply`, `node api/scripts/seed-game-variant-plans.js` (or `sql/scripts/seed-12-games-plans.sql`), `node api/scripts/ensure-enshrouded-plans.js` if needed. | ☐ |
| 3.4 | **Frontend:** `npm run build`. Serve `dist/` via nginx. Build with `VITE_API_URL=https://api.<domain>` so API base is correct. | ☐ |
| 3.5 | **Pterodactyl on same server:** Either (A) use `pterodactyl/docker-compose.yml` (Panel + MariaDB + Redis + Wings in Docker), or (B) install Panel (PHP) + Wings natively. For (A): use a **single** MariaDB for both `app_core` and `panel` if you want one DB host, or keep Panel’s DB in Docker and `app_core` on host MySQL. Ensure Wings config (`wings-live-config.yml`) has correct Panel URL and node ID; `machine_id` can be disabled. | ☐ |
| 3.6 | **Panel setup:** Create Application API key; put in `api/.env` as `PANEL_APP_KEY`. Create **allocations** (ports) for the node; note one free allocation ID for `PTERO_DEFAULT_ALLOCATION_ID`. Set node **memory limit** to ~105000 MB so you don’t over-commit. | ☐ |
| 3.7 | **region_node_map:** In MySQL, map your region(s) (e.g. `us-east`) to the Panel node ID so provisioning picks this node. | ☐ |
| 3.8 | **PM2:** From repo root: `pm2 start ecosystem.config.cjs`. Then `pm2 save` and `pm2 startup`. | ☐ |

**Exit:** API, provisioner, agents (and optional marketing cron) running; Panel + Wings running; DB and catalog seeded; frontend built.

---

## Phase 4: nginx, DNS, TLS

| # | Action | Done |
|---|--------|------|
| 4.1 | **DNS:** In Cloudflare for givrwrldservers.com, point all A records to the **new** server IP `15.204.163.237` (see “This deployment: server and DNS” above). Add/update `www`, `api`, `panel`, and any others. | ☐ |
| 4.2 | **nginx:** Proxy API to localhost:3001, Panel to Panel port (e.g. 8000), serve frontend from `dist/`. Use `ops/nginx/` examples if present. | ☐ |
| 4.3 | **TLS:** certbot for each hostname; reload nginx. | ☐ |
| 4.4 | **URLs in app:** `api/.env` has `FRONTEND_URL` and `PUBLIC_SITE_URL` = frontend URL. Frontend built with correct `VITE_API_URL`. | ☐ |

**Exit:** Site, API, and Panel over HTTPS.

---

## Phase 5: PayPal, SMTP, go-live config

| # | Action | Done |
|---|--------|------|
| 5.1 | **PayPal live:** Client ID/secret in `api/.env`; `PAYPAL_SANDBOX=false`. | ☐ |
| 5.2 | **Webhook:** URL `https://api.<domain>/api/paypal/webhook`; subscribe to `BILLING.SUBSCRIPTION.*`. Set `PAYPAL_WEBHOOK_ID` in `api/.env` so the API verifies webhook signatures in production. | ☐ |
| 5.3 | **SMTP:** SendGrid (or other) configured; `SMTP_FROM` verified. | ☐ |
| 5.4 | Optional: status/monitoring pointing at `https://api.<domain>/health`. | ☐ |

**Exit:** Live payments and email; webhooks hitting API.

---

## Phase 6: Smoke test and go-live

| # | Action | Done |
|---|--------|------|
| 6.1 | **Smoke test:** Sign up → verify email → pick a game plan → checkout (PayPal live) → order **provisioned**; server in Panel and dashboard. | ☐ |
| 6.2 | Test resend verification and password reset; confirm emails. | ☐ |
| 6.3 | Turn off or redirect any old/staging URLs. | ☐ |
| 6.4 | **Go-live:** Announce; monitor PM2 logs, nginx, Panel, first orders. | ☐ |

**Exit:** Business running on the 128 GB node; traffic live.

---

## Phase 7: Post-launch (128 GB)

**Note:** The entire stack runs on one host; backups and monitoring are critical — there is no failover node.

| # | Action | Done |
|---|--------|------|
| 7.1 | **Backups:** Schedule backups for `app_core` (and Panel DB if separate); store securely. | ☐ |
| 7.2 | **Monitoring:** PM2 + optional alerts (e.g. `/health`, disk, RAM). | ☐ |
| 7.3 | **Capacity:** Node has ~100–105 GB for game instances (~25–30 slots). Monitor usage; when consistently near full, consider a second node. | ☐ |
| 7.4 | **Runbooks:** Keep env, provisioning debug, and incident docs updated for this single-node setup. | ☐ |

---

## One-line flow

```
Prep server (Node, PM2, MySQL, Redis, Docker, nginx) → Deploy app (clone, env, migrate, seed, build)
→ Pterodactyl (Panel + Wings) on same box, allocations + region_node_map
→ nginx + DNS + TLS → PayPal live + webhook + SMTP → Smoke test → Go-live → Backups + monitoring.
```

---

## References

| Doc | Purpose |
|-----|--------|
| [LAUNCH-STACK.md](../LAUNCH-STACK.md) | Stack overview, purchase flow, run commands. |
| [MIGRATION-ROADMAP-DEDICATED-SERVER.md](./MIGRATION-ROADMAP-DEDICATED-SERVER.md) | Full migration phases (aligns with this roadmap). |
| [ROADMAP-NODE-PHASE-AND-FRONTEND.md](./ROADMAP-NODE-PHASE-AND-FRONTEND.md) | Cost model, frontend polish checklist. |
| [PROVISIONING-STATE.md](../PROVISIONING-STATE.md) | Provisioning state and logs. |
| **ecosystem.config.cjs** | PM2: API, provisioner, agents, marketing. |

---

**Target:** One 128 GB node at $138/month; ~25–30 slots → ~$275–360/month revenue → **~$140–220/month profit** after server cost and buffer.
