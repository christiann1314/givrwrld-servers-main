# GIVRwrld Overview — Business, Tech Stack, Accomplishments & Production Hardening Context

**For:** Chat 5.3 — production hardening roadmap, 16GB RAM upgrade, agents, 24/7 operation.

---

## 1. Business background & “lore”

**GIVRwrld** (or **GIVRwrld Servers**) is a **premium game server hosting** business. The idea: players and communities get **one-click game servers** (Minecraft, Rust, Palworld, Ark, Terraria, Factorio, Among Us, Mindustry, Rimworld, Vintage Story, Veloren, Teeworlds) without managing VPS, panels, or billing themselves.

- **Positioning:** Focus on **game-specific configs**, **auto-provisioning** after payment, and a **single control panel** (Pterodactyl) so customers go from “pay” to “play” quickly.
- **Revenue model:** Subscriptions (monthly, 3-month, 6-month, yearly) via **PayPal**; plans are tied to RAM/CPU/disk (e.g. 4GB, 6GB, 8GB) and to **one region at launch: US East**.
- **Differentiation:** Clean UX (fantasy-themed, emerald/glass UI), transparent pricing, Discord community, affiliate program (20% base / 25% performance tier, 12-month cap), and a status page. No Stripe/Supabase in the live flow — stack is **Express + MySQL + Pterodactyl + PayPal** for control and clarity.

The “lore” is simply: **take the pain out of hosting game servers** so creators and friends can run their own Rust/Minecraft/Palworld/etc. with minimal setup and one place to manage everything.

---

## 2. Tech stack (current)

| Layer        | Technology              | Role |
|-------------|--------------------------|------|
| **Frontend**| Vite + React (TypeScript)| SPA at 8080; game config pages, dashboard, checkout, success, Discord, status, affiliate. |
| **Backend** | Node.js + Express        | API at 3001: auth (JWT), checkout, PayPal webhook, plans, orders, servers, provisioning. |
| **Database**| MySQL / MariaDB          | `app_core`: users, plans, orders, ptero_eggs/nests/nodes, region_node_map, affiliates. |
| **Panel**   | Pterodactyl Panel + Wings| Game server lifecycle: create/start/stop; Panel API key in `api/.env`. |
| **Payments**| PayPal Subscriptions     | Create subscription → webhook (payment captured) → finalize order → provision server. |
| **Auth**    | JWT (Express)            | Login/signup, email verification; tokens in memory/localStorage. |

**Removed from primary flow:** Supabase (replaced by MySQL), Stripe (replaced by PayPal). Any remaining Stripe/Supabase references are legacy or placeholders; see `docs/STRIPE-SUPABASE-AUDIT.md` if needed.

**Cost model (from roadmap):** ~**$130/month** per active node environment: ~$100 game node (Wings + capacity), ~$20 control (API + DB + Panel + frontend), ~$10 misc (domain, etc.). US-East only at launch.

---

## 3. How it works (end-to-end scheme)

```
Customer → Landing / Deploy → Game config (e.g. Rust 6GB, 6-month, US East)
    → Checkout (PayPal) → Success page (order_id, live order details)
    → Dashboard: “Your Active Servers” + “Open Game Panel” (Pterodactyl)

Backend flow:
1. Frontend calls POST /api/checkout (or createCheckoutSession) with plan_id, term, region, server_name.
2. API creates PayPal subscription (or order); returns checkout URL.
3. User pays on PayPal; redirect to /success?order_id=...
4. Frontend calls GET /api/orders (auth), matches order_id; optionally POST /api/paypal/finalize-order.
5. PayPal webhook (payment captured) → API: create/update order in MySQL, call provisionServer().
6. provisionServer(): Panel API “create server” with egg, allocations, env vars; store ptero_server_id in order.
7. User sees server in Dashboard; “Game Panel” opens Pterodactyl; “View confirmation” opens /success?order_id=...
```

**Data flow:**  
- **Plans** in MySQL (`plans` table: game, ram_gb, vcores, ssd_gb, price_* per term, ptero_egg_id).  
- **Orders** in MySQL (`orders`: user_id, plan_id, term, region, status, ptero_server_id, total_amount, etc.).  
- **Pterodactyl:** Eggs/nodes synced into `ptero_eggs` / `ptero_nodes`; `region_node_map` maps e.g. `us-east` → node_id. Provisioning reads plan’s egg and region → node, then creates server on Panel.

**Frontend:**  
- Game config pages (e.g. Rust, Minecraft) use `useGamePlanCatalog(game)` for live plans and `getPriceForTerm(plan, term)`; billing terms: Monthly, 3 Months, 6 Months, Yearly.  
- Success page uses only live data (`api.getOrders()` + match by order_id); no Stripe; region shown as “US East” (us-central normalized).  
- Dashboard: welcome card with “Open Game Panel” link; “Your Active Servers” with “View confirmation” and “Game Panel” per server.

---

## 4. What we accomplished (summary)

- **Stripe/Supabase cleanup:** Removed or isolated hardcoded keys/URLs; checkout and auth use Express + MySQL; docs in `STRIPE-SUPABASE-AUDIT.md`.
- **Billing:** Added **6-month (semiannual)** option for every game; backend already supported it; frontend configs and `stripeService` updated; no more mapping semiannual → quarterly.
- **Region:** **US East only** at launch; removed us-west/us-central from all config UIs; API defaults and Status page show US East; verify script expects only `us-east` in `region_node_map`.
- **Success page:** Fixed blank page and `timeStyle` error; shows “US East” for region; supports PayPal return with order_id; “View confirmation” from Dashboard/Services links to `/success?order_id=...`.
- **Dashboard:** “Open Game Panel” folded into welcome card (inline link); “View confirmation” per server; no big standalone panel block.
- **Affiliate program:** Central config (`src/config/affiliate.ts`): 20% default, 25% performance tier, 12-month cap, $50 min payout, 90-day cookie; `docs/AFFILIATE-PROGRAM.md` (market + math); Dashboard shows 0 referrals until backend attribution exists; public Affiliate page and Dashboard use config for all copy.
- **Discord:** Redesigned `/discord` page (value props, working “Join Discord” via `VITE_DISCORD_INVITE_URL`, link to `/status`); `docs/DISCORD-FEATURE.md` (market + how to use for support/announcements/status).
- **Repo cleanup:** Removed 100+ one-off root docs, `migrations-archive/`, `sql-archive/`, `supabase/`, `.tgz` archives, fix/cleanup scripts, Stripe/Supabase one-off scripts; kept README, LAUNCH-STACK, GO_LIVE_CHECKLIST, docs/, and essential setup guides; updated .gitignore and README layout.
- **Pushed to GitHub:** All of the above committed and pushed to `main` (e.g. `christiann1314/givrwrld-servers-main`).

---

## 5. Current state

- **Stack:** Express API + MySQL + Pterodactyl + PayPal; frontend Vite/React; US East only; 6-month billing everywhere.
- **Docs:** README, LAUNCH-STACK, GO_LIVE_CHECKLIST, and `docs/` (provisioning, affiliate, Discord, roadmap, Stripe-Supabase audit).
- **Next logical step:** **Production hardening** — run the app and (optionally) agents 24/7 on a machine with more RAM (e.g. 8GB → 16GB) for a “stronger” environment and headroom for automation.

---

## 6. Context for Chat 5.3: Production hardening roadmap

**Goal under discussion:**  
- **Hardware:** Upgrade to **16GB RAM** (e.g. +8GB) for a stronger dev/production machine.  
- **Operation:** Run the **application 24/7** (API, frontend, DB, Panel/Wings as appropriate).  
- **Automation:** **Build agents** (e.g. monitoring, provisioning checks, support or ops tasks) and have them running 24/7 on the same or a dedicated environment.

This overview gives Chat 5.3:

1. **Business & lore** — What GIVRwrld is and why it exists.  
2. **Tech stack** — What runs where (Express, MySQL, Pterodactyl, PayPal, React).  
3. **Scheme** — How a customer goes from config → payment → success → dashboard and how the backend provisions servers.  
4. **Accomplishments** — What’s already done (billing, region, success, dashboard, affiliate, Discord, repo cleanup).  
5. **Production hardening context** — 16GB RAM, 24/7 app, and agents as the next step so the roadmap (runbook, monitoring, agent tasks) can be designed on top of this snapshot.

Use this doc as the single “state of the business and stack” handoff for the production hardening roadmap in Chat 5.3.
