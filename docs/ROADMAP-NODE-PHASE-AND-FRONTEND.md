# Roadmap: Clean Node-Phase Run + Frontend Polish

**Goal:** Re-run the stack cleanly with a clear cost model ($130/month per active node), then deliver a seamless, professional frontend experience.

---

## Part 1: Cost model (per active node environment)

| Item | Monthly | Notes |
|------|---------|--------|
| **Dedicated Game Node** | $100 | Pterodactyl Wings + game server capacity (RAM/CPU/disk). One node = one “environment” (e.g. US-East). |
| **Control VPS** | $20 | API (Express), frontend (static/Vite build), MySQL/MariaDB (app_core), Pterodactyl Panel, Redis. Can be one VPS or split (e.g. API+DB on one, Panel on same or separate). |
| **Misc** | $10 | Domain, DNS, small services (e.g. email, monitoring). |
| **Total fixed base** | **$130/month** | Per active node environment. |

**Implications:**
- Add more nodes (e.g. US-West, EU) = +$100/month per node; control/misc can stay ~$20 + $10 if shared.
- Document this in a simple “Pricing / Cost” internal doc or ops runbook so you know break-even and scaling.

---

## Part 2: Re-run everything cleanly (checklist)

Use this when bringing up a fresh environment or after a reset.

### 2.1 Prerequisites
- [ ] Domain and DNS pointed (or use IP for testing).
- [ ] VPS(es) provisioned: one for “control” (API + DB + Panel + frontend), one per game node (Wings) if separate.
- [ ] SSH and firewall: 22, 80, 443, 3306 (if MySQL remote), 8082 (Wings), 8000 (Panel if exposed).

### 2.2 Control stack (single VPS or split)
- [ ] **MySQL/MariaDB** – Install, create `app_core`, run `sql/app_core.sql`, run `sql/seed-ptero-local.sql` (adjust node ID). Set `api/.env`: `MYSQL_*`, `PANEL_URL`, `PANEL_APP_KEY`, `PAYPAL_*`, etc.
- [ ] **API** – `api/`, `npm install`, `npm run dev` or PM2. Health: `http://<control>:3001/health`.
- [ ] **Panel** – Pterodactyl Panel (PHP) + Redis; or Docker stack in `pterodactyl/`. Panel URL in `api/.env` and frontend env. Create Application API key, set in `api/.env`.
- [ ] **Frontend** – Build: `npm run build`; serve `dist/` via Nginx or same VPS. Set `VITE_API_URL` (or equivalent) to control API URL.
- [ ] **Sync** – Run `node api/scripts/sync-pterodactyl-catalog.js --apply` so `ptero_eggs` / `ptero_nests` match Panel. Run `node api/scripts/verify-step1-setup.js`.

### 2.3 Game node(s)
- [ ] **Wings** – Install on each game server; link to Panel (node ID, FST paths, allocations). Ensure volume paths exist so you don’t get “bind source path does not exist” (see PROVISIONING-STATE.md Logs section).
- [ ] **Allocations** – In Panel, add ports for each node. Optionally set `PTERO_DEFAULT_ALLOCATION_ID` or `PTERO_ALLOCATION_IDS` in `api/.env` if you want to pin allocations.
- [ ] **region_node_map** – In MySQL, map region codes (e.g. `us-central`, `us-east`, `us-west`) to the correct `ptero_node_id`.

### 2.4 Payments and go-live
- [ ] **PayPal** – Sandbox for test; live client/secret and webhook URL for production. Webhook points to `https://<control>/api/paypal/webhook`.
- [ ] **Smoke test** – One purchase per game (or per egg variant) → order provisioned → server appears in Panel and starts. Use PROVISIONING-STATE.md to track.

### 2.5 Cost and ops
- [ ] Record actual spend: game node(s) + control VPS + misc. Target **$130/month** for one-node phase.
- [ ] Optional: one-pager “Runbook – bring up from zero” that references LAUNCH-STACK.md, this roadmap, and PROVISIONING-STATE.md.

---

## Part 3: Frontend polish (seamless professional UX)

Objective: Fix small mistakes and inconsistencies so the frontend feels cohesive and professional.

### 3.1 Copy and content
- [ ] **Typos and grammar** – Scan landing, dashboard, config pages, checkout, success, error messages.
- [ ] **Consistent naming** – “GIVRwrld” vs “GIVRwrld Servers”, region labels (e.g. “US East” vs “us-east”), button labels (“Subscribe” vs “Purchase” vs “Checkout”).
- [ ] **Pricing display** – Plans show correct price and term (monthly/quarterly/etc.); no “$0” or placeholder where real price should be.
- [ ] **Empty states** – Dashboard “no servers” / “no orders” have clear, friendly copy and a CTA (e.g. “Deploy your first server”).

### 3.2 Navigation and layout
- [ ] **Header/footer** – Links work; active route highlighted; mobile menu works; footer links (Terms, Privacy, Support) go to correct pages.
- [ ] **Breadcrumbs or back** – Where it makes sense (e.g. from plan selection back to game config).
- [ ] **Loading states** – Any list or detail that fetches data shows a spinner/skeleton; no flash of “0 items” then pop-in.

### 3.3 Forms and checkout
- [ ] **Validation** – Server name, region, plan selection validated before submit; clear inline or toast errors.
- [ ] **Checkout flow** – One clear path: choose plan → cart/summary → redirect to PayPal → return to success with order ID and “what’s next” (e.g. “Your server will be ready in a few minutes”).
- [ ] **Success page** – Shows order ID, status, and link to dashboard or “View my servers”; no duplicate or confusing CTAs.

### 3.4 Dashboard and servers
- [ ] **Server cards** – Status (Provisioning / Online / Offline / Error) is clear; “Open Panel” and “Manage” go to the right place.
- [ ] **Billing/subscriptions** – If shown, matches backend (PayPal); no Stripe references in UI copy.
- [ ] **Error recovery** – If an order is stuck or failed, message is clear and points to support or “Contact us”.

### 3.5 Technical and accessibility
- [ ] **Console clean** – No unnecessary errors or warnings in browser console in normal flows.
- [ ] **Responsive** – Key flows (landing, game config, checkout, dashboard) work on mobile and tablet.
- [ ] **Focus and a11y** – Buttons/links focusable; critical messages have proper roles/labels if you’re targeting a11y.

### 3.6 Final pass
- [ ] **Run through as a new user** – Sign up → pick a game → choose plan → checkout (sandbox) → return → see order/server. Note every friction point and fix.
- [ ] **Run through as returning user** – Log in → dashboard → open panel → manage server. Same: note and fix.

### 3.7 Frontend audit – concrete items (from codebase scan)

- **Copy / naming:** `stripeService` and `useStripeCheckout` are internal names (they call the Express/PayPal API). User-facing strings that still say “Stripe” (e.g. “Redirect to Stripe Checkout” in Checkout.tsx, PaymentModal.tsx) should be updated to “Redirect to checkout” or “PayPal” so the flow is accurate. Toasts were already changed to “Redirecting to checkout” in useStripeCheckout/useSubscription; confirm no other visible “Stripe” in checkout flow.
- **PaymentModal:** Contains card fields (Card Number, CVC, ZIP). If the product is PayPal-only, consider hiding the card form and showing only PayPal CTA, or remove the modal in favor of a single “Pay with PayPal” path.
- **Billing.tsx:** Has `TODO: Implement real payment method fetching from payment provider`. Either implement (e.g. show PayPal billing info from API) or replace with a short message (“Manage billing via PayPal” with link) so the page isn’t misleading.
- **useAuth.tsx:** Has `TODO: Create Pterodactyl user if needed`. Backend already has panel-sync; frontend can call `api.syncPanelUser()` when needed (e.g. before “Open Panel”). Optional polish.
- **Empty states:** `LiveDataDashboard` shows “No servers found”; Dashboard and order list should have clear empty states with a CTA (e.g. “Deploy your first server”).
- **Placeholders:** Form placeholders (server name, email, support message, etc.) are fine; no Lorem. LoadBalancingConfig “https://example.com” is for advanced endpoint URL – OK.
- **Success page:** Fallback to `stripe_session_id` for order lookup is legacy; keep for backwards compat. Ensure primary flow uses `order_id` / PayPal and shows “Your server is being set up” and link to dashboard.

---

## Order of execution

1. **Document and lock cost model** – Put the $130 breakdown in this doc or a short “COST-MODEL.md”; use it when planning.
2. **Re-run cleanly** – Follow Part 2 once (e.g. on a staging VPS or your current setup) and note any gaps; update LAUNCH-STACK.md or runbook if needed.
3. **Frontend polish** – Work through Part 3 in order (copy → nav → forms → dashboard → tech → final pass). Tackle small mistakes first, then UX improvements.
4. **Smoke test again** – After frontend changes, run one full purchase flow and one dashboard session to confirm nothing regressed.

---

## Quick references

- **Stack and run:** [LAUNCH-STACK.md](../LAUNCH-STACK.md)
- **Provisioning state and logs:** [PROVISIONING-STATE.md](./PROVISIONING-STATE.md)
- **Per-game audit:** [EGG-AUDIT-PER-GAME.md](./EGG-AUDIT-PER-GAME.md)
- **Get started (provisioning):** [GET-STARTED-PROVISIONING.md](./GET-STARTED-PROVISIONING.md)
