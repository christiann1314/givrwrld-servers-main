# Review: Director Engineer Product Summary

This document reviews the director engineer’s product summary against the current codebase and docs.

---

## Overall assessment

**The summary is accurate and aligned with the repo.** The flows (checkout, provisioning, ops, marketing), architecture (frontend, API, MySQL, Redis/BullMQ, Pterodactyl), and safety posture match implementation. Below are confirmations and a few optional clarifications for an arch/audit audience.

---

## What’s accurate (verified)

### Product and scope

- **What it is:** Production-ready game server hosting; PayPal subscriptions; auto-provisioning on Pterodactyl (Panel + Wings). **Correct.**
- **Games:** Minecraft, Rust, Palworld, Ark, Terraria, Factorio, Among Us, Mindustry, Rimworld, Vintage Story, Veloren, Teeworlds, **Enshrouded** — all 13 are present with config pages, plan/egg mapping, seeds, and (where applicable) variant plans. **Correct.**

### Checkout and billing

- Frontend calls the Express API to create a **pending order** and a **PayPal subscription**; user approves in PayPal; webhook `BILLING.SUBSCRIPTION.ACTIVATED` hits the API; API finalizes order (marks paid) and enqueues provisioning. No Stripe in the primary path. **Correct.**
- **Implementation detail:** The frontend entrypoint is `POST /api/checkout/create-session` (returns `checkout_url` = PayPal approval URL). The PayPal route also exposes `POST /api/paypal/create-subscription`; the main UI path is via checkout’s create-session. Both create order + subscription and return the approval URL.

### Provisioning

- A **BullMQ (Redis) queue** carries “provision server” jobs; a **provisioner worker** process consumes them and calls the **Pterodactyl Panel API** using `plans` and `ptero_eggs`. On success, order is updated to **provisioned** with `ptero_server_id` / `ptero_identifier`. **Correct.**
- **Verified:** `api/queues/provisionQueue.js` (BullMQ, jobId = orderId), `api/workers/provisionerWorker.js` (Worker on queue `provisioning`, calls `provisionServer(orderId)`). Webhook and finalize-order both call `enqueueProvisionJob(orderId, source)`. The in-process **reconcile job** (node-cron every 2 min) also uses `enqueueProvisionJob` for stuck orders, so Redis is required for both the primary path and reconciliation.

### Ops, status, marketing

- **Status & public stats:** Read-only, rate-limited, no PII, minimal indexed queries (e.g. `GET /api/public/provisioning-stats`). **Correct.**
- **Marketing agent:** Separate Node service (PM2), writes to DB and optionally Discord; does not touch billing/provisioning. **Correct.**
- **Support & refunds:** 48-hour refund process (docs), Discord FAQs, capacity planning — process/docs only. **Correct.**

### Architecture and deployment

- **Frontend:** Vite + React SPA, `VITE_API_URL`, landing/deploy/checkout/dashboards/status/account. **Correct.**
- **Backend:** Node/Express in `api/` (server.js); auth (JWT), plans, orders, checkout, PayPal webhook, provisioning endpoints; MySQL pool; `app_core` schema and migrations. **Correct.**
- **Data and catalog:** `app_core` with `plans`, `ptero_nests`/`ptero_eggs`, orders, users, tickets, etc.; sync via `sync-pterodactyl-catalog.js`; bootstrap/seed scripts for eggs and base/variant plans; Enshrouded in sync, variant-egg, and variant-plan scripts. **Correct.**
- **Control plane:** API is the control plane; provisioning only via queue + worker → Pterodactyl API; no direct client access to Panel API. **Correct.**
- **Production:** Single Linux server with Node/Express API and workers under PM2 (`givrwrld-api`, `givrwrld-provisioner`, agents, marketing agent), MySQL/MariaDB, Redis, nginx, Pterodactyl Panel + Wings; config via `api/.env` and nginx under `ops/nginx/`. **Correct** for the described topology.

### Safety and guardrails

- Billing/provisioning paths stable and scoped; recent work (marketing, status, wedge, affiliates) constrained not to alter them. New public endpoints GET-only, rate-limited, PII-free, minimal indexed queries. Affiliate backend and money/provisioning-affecting features deferred. **Matches** `docs/STAGED-MARKETING-EXECUTION-PLAN.md` and architecture mitigations.

---

## Optional clarifications (for arch/audit)

1. **Checkout endpoint:** For traceability, the main customer-facing checkout is **`POST /api/checkout/create-session`** (creates order + PayPal subscription, returns approval URL). The director’s wording (“Frontend calls the Express API to create a pending order and a PayPal subscription”) is correct; only the endpoint name can be added if desired.

2. **Game count:** The product supports **13** games (the 12 often cited in older docs **plus** Enshrouded). Enshrouded is fully wired: config page, Deploy entry, `gameConfigs`, seed scripts, variant eggs/plans, transparency content, and routes.

3. **Redis requirement:** Provisioning (webhook, finalize-order, and reconcile) all go through **BullMQ**. Redis is therefore **required** in any environment where provisioning must work (dev with real provisioning, and production). The reconcile job’s legacy comment (“no Redis in Phase 1”) is outdated; the implementation now enqueues to the same queue.

4. **Deployment topology:** The summary describes a **single** dedicated server (API, DB, Redis, nginx, Panel + Wings). The repo also supports a **split** topology (e.g. API + DB + nginx on one VPS; Pterodactyl Wings on separate game nodes). Both are valid; the summary is accurate for the all-in-one case.

5. **Reconcile job:** In addition to the BullMQ worker, an **in-process** node-cron job runs every 2 minutes and **enqueues** eligible stuck orders (paid/provisioning/error without `ptero_server_id`) to the same provisioning queue, with backoff. It does not call `provisionServer` directly.

---

## Conclusion

The director engineer’s product summary is **accurate and suitable** for an architecture review or audit. No factual corrections are required. The optional clarifications above can be used in a one-pager or risk checklist if the archtest engineer wants extra precision (endpoint names, Redis dependency, topology, reconcile behavior).
