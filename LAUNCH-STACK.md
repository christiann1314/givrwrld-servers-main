# GIVRwrld – Launch Stack (Current State)

This document restores and defines the **working local end-to-end platform** state: frontend, backend API, MariaDB, Pterodactyl panel/wings, **PayPal** recurring checkout, webhook/finalization, and server provisioning mapped to real eggs for all offered games.

You are in **pre-production hardening** mode, not "prototype disconnected pieces."

---

## Architecture Snapshot

| Layer        | Technology              | Local URL / Port      |
|-------------|-------------------------|------------------------|
| **Frontend**| Vite + React            | `http://localhost:8080` |
| **Backend** | Node/Express            | `http://localhost:3001` |
| **DB**      | MySQL/MariaDB           | `app_core` (default 3306) |
| **Game infra** | Pterodactyl Panel + Wings | Panel: `http://localhost:8000`, Wings: `8082` |
| **Payments**| PayPal Subscriptions    | Webhook + fallback finalizer |
| **Email**   | SMTP/SendGrid           | Verification path     |
| **Provisioning** | `plans -> ptero_egg_id -> ptero_eggs -> server create` | Source of truth in MySQL |

---

## What This Stack Provides

- **PayPal subscription flow** in backend + frontend (primary; no Stripe for core purchase).
- **Order lifecycle**: `pending -> paid -> provisioning -> provisioned` with fallback finalization path.
- **Local return/cancel URLs** so checkout stays local during test runs (e.g. `http://localhost:8080/success?order_id=...`).
- **Webhook handling** + event logging; **finalize-order** when webhook is unavailable (e.g. local dev).
- **Pterodactyl**: user creation/linking, server provisioning, allocation retry/fallback, egg and plan mapping sync.
- **Dashboard** live data (billing/services) from backend/MySQL.
- **Auth**: JWT (backend), email verification path.

---

## How to Run the Stack (Bring Back to This State)

### 1. Database

- Ensure **MariaDB/MySQL** is running with database `app_core`.
- Run any migrations so `orders`, `plans`, `ptero_nodes`, `ptero_eggs`, `paypal_plan_terms`, `paypal_events_log`, `paypal_subscriptions` exist (see `api/` and migrations).

### 2. Backend API (Express)

```bash
cd api
# Create api/.env with at least: PORT=3001, MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE=app_core, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_SANDBOX, and Pterodactyl vars if provisioning.
npm install
npm run dev
```

- API runs at **http://localhost:3001**.
- Health: `http://localhost:3001/health`.
- PayPal webhook (for local tunnel): `POST http://localhost:3001/api/paypal/webhook`.

### 3. Frontend (Vite + React)

```bash
# From repo root
npm install
npm run dev
```

- Frontend runs at **http://localhost:8080**.
- When the app is served from `localhost:8080`, the frontend **always** uses **http://localhost:3001** as the API base (see `src/lib/api.ts`), so no Supabase/Stripe is used for the main purchase flow.

### 4. Pterodactyl (for full provisioning)

- Panel: `http://localhost:8000`
- Wings: typically `8082`
- Configure `api` `.env` with panel URL and API keys so provisioning can create users and servers.

### 5. Optional – Run frontend and API from root

```bash
# Terminal 1 – API
npm run dev:api

# Terminal 2 – Frontend
npm run dev:frontend
```

Or run `api` and frontend in two terminals as above without using root scripts.

---

## Purchase Flow (One-Click / Per-Egg)

1. **User** selects plan on a game config page (e.g. Minecraft, Palworld, Rust) and clicks purchase.
2. **Frontend** calls `POST /api/checkout/create-session` (backend) with `plan_id`, `item_type`, `term`, `region`, `server_name`.
3. **Backend** creates a **pending** order in MySQL, gets/creates PayPal plan for term, creates PayPal subscription, returns **approval URL**.
4. **Frontend** redirects user to PayPal; user approves.
5. **PayPal** sends **BILLING.SUBSCRIPTION.ACTIVATED** to `POST /api/paypal/webhook` (or user returns to ` /success?order_id=...`).
6. **Webhook** (or **finalize-order** when user lands on success page):
   - Marks order **paid**,
   - Inserts/updates `paypal_subscriptions`,
   - For `item_type === 'game'`, calls **provisionServer(orderId)**.
7. **provisionServer** (in `api/routes/servers.js`):
   - Loads order + plan from MySQL,
   - Resolves **ptero_egg_id** from plan / game,
   - Gets or creates Pterodactyl user,
   - Picks node, allocation,
   - Creates server via Pterodactyl API → order status **provisioned**.

So each egg is driven by **plan → ptero_egg_id → ptero_eggs**; one click from the user leads to paid → provisioning → provisioned when the stack is running.

---

## Major Issues Already Addressed (Historical)

- Local redirects going to production domain → fixed with `resolveReturnBase` and frontend on 8080.
- Webhook dependence causing “paid but not provisioned” → finalize-order fallback on success page.
- Pterodactyl allocation and docker image validation → retry/fallback and egg mapping.
- Egg not found / env mismatch → egg and plan mapping sync and scripts.
- Dashboard hooks expecting wrong API response shape → aligned to backend `{ success, ... }` and orders/servers from API.

---

## What Still Needs Fixing Before Go-Live (Summary)

- **P0**: Secrets hygiene, migrations discipline, payment correctness (plan-term ↔ PayPal plan ID), provisioning smoke test per game/egg, auth/security hardening, production observability.
- **P1**: Remove legacy Stripe/Supabase remnants in code/deps/UI where not needed, admin tooling, backups/DR.
- **P2**: Queue-based provisioning, caching, region-aware routing, cost telemetry.

---

## “Completed Project” Definition (Go-Live Ready)

- 100% of sold game/egg combinations pass purchase → provision smoke test.
- Webhook + finalize have near-zero stuck orders and automated recovery.
- Billing/subscriptions accurate and reconcilable.
- Security baseline (secrets, auth, rate limits, audit logs) and observability/alerting in place.
- Backups and restore tested; legal/commercial baseline (ToS, privacy, refund/SLA) set.

---

## Immediate Next Steps (This Week)

- Rotate all sensitive keys/passwords.
- Run a full paid flow test on 3 non-Minecraft games (e.g. Palworld, Terraria, Factorio).
- Build launch checklist with pass/fail gates.
- Add basic production monitoring.
- Decide day-one commercial SKU list.

This file is the single reference to **bring the project back to this state** and run the full PayPal + Express + MariaDB + Pterodactyl stack locally.

For **weekly execution** (checklists, owners, KPI targets, rollback plan), see **[LAUNCH-OPERATING.md](./LAUNCH-OPERATING.md)**.

For **per-game egg auto-provisioning audit** (one-by-one, find where errors lie), see **[docs/EGG-AUDIT-PER-GAME.md](./docs/EGG-AUDIT-PER-GAME.md)**.
