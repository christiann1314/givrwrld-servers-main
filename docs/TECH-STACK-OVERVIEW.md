# GIVRwrld – In-Depth Tech Stack Overview

This document describes the full technology stack: frontend, backend, database, payments, game-server provisioning, background jobs, and deployment.

---

## 1. High-Level Architecture

| Layer | Technology | Purpose |
|-------|-------------|--------|
| **Frontend** | Vite + React 18 + TypeScript | SPA: marketing, auth, checkout, dashboard, game configs |
| **Backend API** | Node.js + Express (ESM) | REST API, auth (JWT), checkout, PayPal webhook, provisioning |
| **Database** | MySQL / MariaDB | Single DB: `app_core` (users, orders, plans, Pterodactyl catalog, PayPal) |
| **Payments** | PayPal Subscriptions | Recurring billing; no Stripe in primary flow |
| **Game infra** | Pterodactyl Panel + Wings | Create and run game server containers per order |
| **Email** | SMTP / SendGrid (optional) | Email verification, notifications |
| **Process manager** | PM2 | Run API + agents in production (VPS) |

**No Supabase or Stripe** in the core purchase path. All checkout, orders, and provisioning go through the Express API and MySQL.

---

## 2. Frontend

### 2.1 Build & Runtime

- **Vite 5** – Dev server (port **8080**), HMR, production build.
- **React 18** – UI library.
- **TypeScript** – Typing in `src/`; some JS in scripts.
- **React Router v6** – Client-side routing (`BrowserRouter`, `Routes`, `Route`).
- **@vitejs/plugin-react-swc** – Fast React refresh via SWC.

### 2.2 UI & Styling

- **Tailwind CSS 3** – Utility-first CSS; config in `tailwind.config.ts` with theme (e.g. `primary`, `secondary`, `border`, `background`).
- **Radix UI** – Headless primitives: Accordion, Dialog, Dropdown, Select, Tabs, Toast, Tooltip, etc.
- **shadcn/ui-style** – Component patterns built on Radix + Tailwind (e.g. `class-variance-authority`, `tailwind-merge`, `clsx`).
- **Lucide React** – Icons.
- **next-themes** – Theme (light/dark) via `darkMode: ["class"]` in Tailwind.
- **Sonner** – Toasts.
- **Recharts** – Charts (e.g. dashboard).
- **Vaul** – Drawer; **cmdk** – Command palette; **react-day-picker** – Date picker.

### 2.3 Data & Forms

- **TanStack Query (React Query) v5** – Server state, caching, and requests to the API.
- **React Hook Form** – Form state and validation.
- **Zod** – Schema validation; **@hookform/resolvers** – Zod ↔ RHF.
- **date-fns** – Date formatting and logic.

### 2.4 API & Auth (Frontend)

- **`src/lib/api.ts`** – Central API client:
  - `getApiBase()`: when served from `localhost:8080`, forces `http://localhost:3001` so the app never hits Vite for `/api/*`.
  - `VITE_API_URL` / `VITE_API_BASE_URL` for production.
  - `http()` helper: GET/POST/PUT/DELETE with JSON, optional retry on 401.
- **`src/lib/auth.ts`** – Token handling:
  - Access and refresh tokens in **localStorage** (`auth_token`, `auth_refresh_token`).
  - `refreshAccessToken()` calls `POST /api/auth/refresh` and retries the failed request once.
- **Protected routes** – `ProtectedRoute` wraps dashboard pages; redirects to `/auth` if not logged in.

### 2.5 Main Routes (Summary)

- **Public:** `/`, `/deploy`, `/about`, `/auth`, `/login`, `/signup`, `/verify-email`, `/success`, `/status`, `/support`, `/faq`, `/blog`, `/discord`, `/affiliate`, `/privacy`, `/terms`, `/configure/<game>`, upgrade packs, purchase-success/confirmed.
- **Game configs:** Minecraft, Rust, Palworld, Ark, Terraria, Factorio, Mindustry, Rimworld, Vintage Story, Teeworlds, Among Us, Veloren (each has a plan selector and checkout entry).
- **Dashboard (protected):** `/dashboard`, `/dashboard/billing`, `/dashboard/order`, `/dashboard/services`, `/dashboard/settings`, `/dashboard/support`, `/dashboard/affiliate`, `/dashboard/traffic` (TrafficMonitor).

---

## 3. Backend API

### 3.1 Runtime & Framework

- **Node.js** (ESM, `"type": "module"`).
- **Express 4** – REST API on port **3001** (configurable via `PORT`).
- **CORS** – Allowed origin from `FRONTEND_URL` (comma-separated) or permissive in dev.

### 3.2 Middleware Pipeline

- **requestIdMiddleware** – Assigns `req.id` for tracing.
- **pino-http** – Request logging (uses shared logger).
- **CORS** – Before routes.
- **PayPal webhook** – Mounted **before** `express.json()` so the raw body can be used for signature verification (`/api/paypal/webhook`).
- **express.json()** / **urlencoded** – For all other routes.
- **Rate limiters** – `authLimiter`, `publicLimiter`, `webhookLimiter` (express-rate-limit) applied per route group.

### 3.3 Routes

| Prefix | Purpose |
|--------|---------|
| `GET /health` | Uptime, version, memory (no DB). |
| `GET /api/health` | DB ping + optional Pterodactyl panel check; no secrets. |
| `GET /ready` | Readiness: DB + required env (e.g. `MYSQL_PASSWORD`, `JWT_SECRET`) + optional panel. |
| `/api/auth` | Login, signup, refresh, verify-email (JWT issuance). |
| `/api/checkout` | Create session (pending order + PayPal subscription + approval URL). |
| `/api/paypal` | Webhook (raw body), plus routes that need JSON (e.g. finalize-order). |
| `/api/plans` | List plans, by game, etc. |
| `/api/orders` | List/order details (user-scoped). |
| `/api/servers` | Server list, panel link, provisioning trigger (internal). |
| `/api/support` | Tickets (create, list, messages). |
| `/ops` | Ops/health endpoints for monitoring. |

### 3.4 Database

- **mysql2** (promise API) – Connection pool in `api/config/database.js`.
- **Config:** `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` (default `app_core`).
- Pool: `connectionLimit: 10`, keepalive, non-fatal startup check (logs warning if DB is down).

### 3.5 Environment & Validation

- **dotenv** – Loads `api/.env`.
- **envalid** – `validateEnv()` at startup: `NODE_ENV`, `PORT`, `MYSQL_*`, `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`, `PAYPAL_SANDBOX`, `PANEL_URL`, `PANEL_APP_KEY`, `JWT_SECRET`, `FRONTEND_URL`.

### 3.6 Auth (Backend)

- **JWT** – Access (and optionally refresh) tokens; signed with `JWT_SECRET`.
- **bcryptjs** – Password hashing for signup/login.
- Auth routes issue tokens; protected routes validate `Authorization: Bearer <token>`.

### 3.7 Logging

- **pino** – Structured JSON logs; `api/lib/logger.js` and `api/lib/sharedLogger.js` for request and agent logs.

---

## 4. Database (MySQL / MariaDB)

### 4.1 Database Name

- **app_core** – Single database for the app.

### 4.2 Main Tables (from `sql/app_core.sql` + migrations)

- **users** – id (UUID), email, password_hash, display_name, is_email_verified, last_login_at.
- **roles** / **user_roles** – admin, moderator, user.
- **plans** – id, item_type (game/vps), game, ram_gb, vcores, ssd_gb, price_monthly, **ptero_egg_id**, stripe_* (legacy), display_name, is_active.
- **orders** – id, user_id, item_type, plan_id, **term** (monthly, quarterly, semiannual, yearly), region, server_name, **status** (pending, paid, provisioning, provisioned, error, canceled), stripe_* (legacy), **ptero_server_id**, ptero_identifier, ptero_node_id, error_message, paid_at (migration), provision_attempt_count, last_provision_attempt_at (phase1 idempotency).
- **tickets** / **ticket_messages** – Support.
- **audit_log** – Event log (JSON details).
- **server_stats_cache** – Cached server state per order.
- **secrets** / **config** – Encrypted or plain config (panel, worker, etc.).
- **regions** – Region codes.
- **ptero_nodes** – Panel node id, name, region, capacity.
- **ptero_nests** / **ptero_eggs** – Nest/egg catalog (docker_image, startup_cmd); **plans.ptero_egg_id** → **ptero_eggs**.
- **region_node_map** – Region → node weighting.
- **stripe_customers** / **stripe_subscriptions** / **stripe_events_log** – Legacy Stripe; primary billing is PayPal.
- **paypal_plan_terms** – plan_id, term, sandbox_mode, paypal_product_id, paypal_plan_id (created in checkout when needed).
- **paypal_subscriptions** – order_id, paypal_sub_id, status, payer_id, current_period_end (from migration + PayPal webhook).
- **paypal_events_log** – Webhook event idempotency and debugging.
- **external_accounts** – user_id ↔ pterodactyl_user_id (panel user linking).
- **affiliates** – User referral codes and credits.

### 4.3 Migrations

- Stored in `migrations/` (e.g. phase1 idempotency, semiannual term, paid_at, PayPal tables). Applied manually or via your deploy process.

### 4.4 Local Dev DB

- **docker-compose.mysql.yml** – MariaDB 11, port 3306, database `app_core`, user `app_rw` / `devpass`; init runs `sql/app_core.sql` and selected migrations. See **docs/LOCAL-DB-DOCKER.md**.

---

## 5. Payments (PayPal)

- **PayPal Subscriptions** – Recurring billing; no Stripe in the main flow.
- **Checkout:** Backend creates a pending order, gets/creates a PayPal plan for the selected term, creates a subscription, returns approval URL → user redirects to PayPal.
- **Webhook:** `POST /api/paypal/webhook` receives **BILLING.SUBSCRIPTION.ACTIVATED** (and related); verified with PayPal signature; logs to `paypal_events_log`; updates order to paid and `paypal_subscriptions`; triggers provisioning for `item_type === 'game'`.
- **Finalize-order:** When the user lands on the success page with `order_id`, the frontend can call a finalize endpoint to mark the order paid and provision if the webhook was missed (e.g. local dev).
- **Backend deps:** No Stripe SDK; PayPal REST API called from Express (checkout + webhook).

---

## 6. Game Server Provisioning (Pterodactyl)

- **Pterodactyl Panel** – Admin API (nodes, users, servers); typically `http://localhost:8000` locally.
- **Wings** – Daemon on each node that runs game server containers (e.g. port 8082).
- **Flow:** `provisionServer(orderId)` in `api/routes/servers.js`: load order + plan → resolve **ptero_egg_id** from plan → get or create Pterodactyl user (external_accounts) → choose node/allocation → create server via Panel API → set order status to provisioned and store **ptero_server_id**.
- **Catalog sync:** Scripts to sync nests/eggs from Panel into `ptero_eggs` and to sync plans (e.g. `seed-game-variant-plans.js`, `sync-pterodactyl-catalog.js`, `bootstrap-pterodactyl-eggs.js`). Plan ↔ egg mapping is the source of truth in MySQL.
- **Env:** `PANEL_URL`, `PANEL_APP_KEY`; optional `PTERO_DEFAULT_ALLOCATION_ID` / `PTERO_ALLOCATION_IDS`; optional encrypted secrets (AES_KEY) for panel key.

### 6.1 Games Supported

Minecraft, Palworld, Rust, Ark, Terraria, Factorio, Among Us, Mindustry, Rimworld, Vintage Story, Veloren, Teeworlds (each with config page and plan/egg mapping).

---

## 7. Background Jobs & Agents

### 7.1 In-Process (API Server)

- **node-cron** – Reconcile job every **2 minutes**: finds orders in `paid`/`provisioning`/`error` with no `ptero_server_id` and retries provisioning (with backoff). Implemented in `api/jobs/reconcile-provisioning.js`.

### 7.2 Standalone Agents Process (PM2)

- **Entry:** `api/agents/index.ts` (compiled to `dist/agents/index.js`); run via `npm run agents:start` or PM2 app `givrwrld-agents`.
- **Agents:**
  - **OpsWatchdog** – Every **60 seconds**; health/ops checks.
  - **ProvisioningAuditor** – Every **5 minutes**; audits provisioning state.
  - **DailyKPIDigest** – **9:00 AM** local time; daily KPI summary (e.g. email or log).
- **Build:** `npm run agents:build` (TypeScript compile in `api/`).
- **Logging:** Shared logger (`api/lib/sharedLogger.js`) with service/run context.

### 7.3 Optional: GrowthAdsGenerator

- Referenced in agents; can be used for ad copy or marketing automation.

---

## 8. Observability & Ops

- **Health:** `/health` (no DB), `/api/health` (DB + panel), `/ready` (DB + required env + optional panel).
- **Logging:** Pino (API + agents); request IDs; logs can be written to `./logs` (e.g. PM2 `error_file` / `out_file`).
- **Rate limiting:** Applied per route group to protect auth, checkout, and webhooks.

---

## 9. Deployment & Process Management

- **PM2** – `ecosystem.config.cjs` at repo root:
  - **givrwrld-api** – `api/server.js`, PORT 3001, 1 instance, fork mode, autorestart, max memory 500M.
  - **givrwrld-agents** – `api/dist/agents/index.js`, 1 instance, fork mode, autorestart.
- **Deploy workflow:** Local dev → push to GitHub → on server: `git pull`, `npm install`, `npm run build` (frontend), restart PM2. See **docs/DEPLOY-WORKFLOW.md**.
- **Frontend in production:** Static build (`vite build`) served by a web server (e.g. Nginx) or same host; API runs separately (e.g. reverse-proxy to port 3001).

---

## 10. Summary Diagram (Logical)

```
[User] → [Vite/React SPA :8080] → [Express API :3001] → [MySQL app_core]
                                      ↓
                              [PayPal Subscriptions]
                                      ↓
                              [Pterodactyl Panel] → [Wings / Game containers]
                                      ↑
                              [PM2: API + Agents]
```

---

## 11. Key Files Reference

| Area | Paths |
|------|--------|
| Frontend entry | `src/App.tsx`, `src/main.tsx`, `src/routes.tsx` |
| API client & auth | `src/lib/api.ts`, `src/lib/auth.ts` |
| Backend entry | `api/server.js` |
| DB config | `api/config/database.js` |
| Env validation | `api/lib/env.js` |
| Checkout & PayPal | `api/routes/checkout.js`, `api/routes/paypal.js` |
| Provisioning | `api/routes/servers.js`, `api/services/OrderService.js` |
| Reconcile job | `api/jobs/reconcile-provisioning.js` |
| Agents | `api/agents/index.ts`, OpsWatchdog, ProvisioningAuditor, DailyKPIDigest |
| Schema & migrations | `sql/app_core.sql`, `migrations/*.sql` |
| Local DB | `docker-compose.mysql.yml`, `docs/LOCAL-DB-DOCKER.md` |
| Deploy | `docs/DEPLOY-WORKFLOW.md`, `ecosystem.config.cjs` |

This is the in-depth tech stack as implemented in the repo today.
