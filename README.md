# GIVRwrld – Premium Game Server Hosting

Production-ready game server hosting: customers pick a plan, pay with **PayPal**, and servers are **auto-provisioned** on **Pterodactyl** with one-click.

---

## Current tech stack

| Layer        | Technology           | Port / URL              |
|-------------|----------------------|-------------------------|
| **Frontend**| Vite + React         | `http://localhost:8080` |
| **Backend** | Node.js + Express    | `http://localhost:3001` |
| **Database**| MySQL / MariaDB      | `app_core` (e.g. 3306)  |
| **Panel**   | Pterodactyl Panel + Wings | `http://localhost:8000` |
| **Payments**| PayPal Subscriptions | Webhook + finalize-order |
| **Auth**    | JWT (Express API)    | Login/signup, email verification |

No Supabase or Stripe in the primary flow. Checkout, provisioning, and dashboard use the Express API and MySQL.

---

## Quick start

**See [LAUNCH-STACK.md](./LAUNCH-STACK.md)** for:

- How to run the stack (DB, API, frontend, Pterodactyl)
- Purchase flow (PayPal → webhook/finalize → `provisionServer`)
- Plan/egg mapping: `plans.ptero_egg_id` → `ptero_eggs` → Pterodactyl server create

**From repo root:**

```bash
# Dependencies
npm install
cd api && npm install && cd ..

# Backend (from api/ or: npm run dev:api)
cd api && npm run dev

# Frontend (second terminal; or: npm run dev:frontend)
npm run dev
```

- Frontend: **http://localhost:8080**  
- API: **http://localhost:3001**  
- Panel: **http://localhost:8000** (when Pterodactyl is running, e.g. Docker in `pterodactyl/`)

---

## Repo layout

```
├── src/                    # Vite + React frontend
│   ├── components/         # UI (Header, ServerStats, PanelAccess, etc.)
│   ├── pages/              # Routes (Dashboard, Checkout, game configs)
│   ├── lib/                # api.ts, auth, cache
│   └── config/             # environment, game configs
├── api/                    # Express backend
│   ├── routes/             # auth, checkout, paypal, plans, orders, servers
│   ├── config/             # database (MySQL)
│   ├── scripts/            # sync-pterodactyl-catalog, seed plans/eggs
│   └── server.js
├── pterodactyl/            # Docker setup for Panel + Wings (optional)
├── docs/
│   ├── EGG-AUDIT-PER-GAME.md   # Per-game provisioning checklist
│   └── STRIPE-SUPABASE-AUDIT.md
├── LAUNCH-STACK.md         # Run the stack, purchase flow, architecture
├── LAUNCH-OPERATING.md     # Go-live checklist, KPIs, rollback
└── README.md               # This file
```

---

## Games and provisioning

Backend supports **Minecraft, Palworld, Rust, Ark, Terraria, Factorio, Among Us, Mindustry, Rimworld, Vintage Story, Veloren, Teeworlds**. Each game uses:

- **Plan** in MySQL with `ptero_egg_id`
- **Row in `ptero_eggs`** (from panel sync or bootstrap)
- **Game-specific env** in `api/routes/servers.js` (Rust: FRAMEWORK/LEVEL/RCON; Ark: BATTLE_EYE/SERVER_MAP; DOWNLOAD_URL for several others)

Use **[docs/EGG-AUDIT-PER-GAME.md](./docs/EGG-AUDIT-PER-GAME.md)** to verify each game: plan ↔ egg, `ptero_eggs`, panel egg/vars, then a purchase → provision smoke test.

---

## Environment

- **Frontend:** `VITE_API_URL` or `VITE_API_BASE_URL` (defaults to `http://localhost:3001` when served on 8080). Optional: `VITE_PANEL_URL`, `VITE_SUPABASE_*` only if you use Supabase for something else.
- **Backend (`api/.env`):** `PORT`, `MYSQL_*`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_SANDBOX`, `PANEL_URL`, `PANEL_APP_KEY` (or encrypted secrets). Optional: `PTERO_DEFAULT_ALLOCATION_ID` / `PTERO_ALLOCATION_IDS`, `AES_KEY` for decrypted secrets.

See `LAUNCH-STACK.md` and any `.env.example` files for full lists.

---

## Scripts

- **Sync panel eggs to app DB:** `node api/scripts/sync-pterodactyl-catalog.js --apply`
- **Seed game plans:** `api/scripts/seed-game-variant-plans.js`, `api/scripts/seed-minecraft-variant-plans.js`
- **Bootstrap eggs in panel:** `api/scripts/bootstrap-pterodactyl-eggs.js` (see script for usage)

---

## Docs

- **[LAUNCH-STACK.md](./LAUNCH-STACK.md)** – Current state, how to run, purchase flow.
- **[LAUNCH-OPERATING.md](./LAUNCH-OPERATING.md)** – Go-live checklist, KPIs, rollback.
- **[docs/EGG-AUDIT-PER-GAME.md](./docs/EGG-AUDIT-PER-GAME.md)** – Per-game provisioning audit.
- **[docs/STRIPE-SUPABASE-AUDIT.md](./docs/STRIPE-SUPABASE-AUDIT.md)** – Legacy Stripe/Supabase references.
- **[docs/ROADMAP-NODE-PHASE-AND-FRONTEND.md](./docs/ROADMAP-NODE-PHASE-AND-FRONTEND.md)** – Cost model ($130/month per node), clean re-run checklist, frontend polish roadmap.

---

*GIVRwrld – game server hosting from payment to provision.*
