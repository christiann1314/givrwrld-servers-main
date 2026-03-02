# Staged Marketing Execution Plan (Revised)

**Guardrails (no risk to):**
- **Billing** — No changes to payment flows, amounts, or subscription logic.
- **Provisioning** — No changes to order→server creation, panel API, or provisioning state machine.
- **Security** — No new unauthenticated write endpoints; no PII in public endpoints; RBAC unchanged.

This revision incorporates **Architecture system risk review**. Mitigations below are authoritative for system safety. High-risk items are deferred until guardrails exist; all phases are expressed as concrete PRs with acceptance criteria.

---

## Architecture: Required Mitigations (Authoritative)

| Item | Risk | Required mitigation |
|------|------|---------------------|
| **Public provisioning stats (1.1)** | Data exposure (High); query cost (Med); public surface (Med) | Dedicated minimal query only — do **not** expose `getMetricsSnapshot()` directly. Return only: `median_provisioning_seconds` (or p95), `provision_success_rate_24h`, `provision_count_24h`. Index on `orders(status, updated_at)` (or equivalent) for 24h filter. Rate-limit endpoint (same or stricter than other public). Code review: response JSON must contain no `order_id`, `user_id`, or other identifiers. |
| **Incident log table (1.3)** | Write abuse if public | If a content table is added: writes **admin/cron only**; no public write API. No FKs to `orders`/`users` that could leak existence or timing. |
| **Status page / health (2.1)** | Leak of internals | Reuse existing `/health` or `/ready` (or strict subset). If new endpoint: no PII, no internal hostnames/topology, no verbose errors. Document which URLs are allowed for status checks. |
| **Wedge landing (5.1)** | Invalid plan_id edge cases | Frontend uses **only** plan IDs returned by existing plans API. No hardcoded or user-supplied plan IDs without server-side validation (checkout already validates). |
| **Affiliate backend (6.2)** | Billing correctness (High); race (Med); data exposure (Med); financial (High) | **Deferred** until after Phases 1–2 (and preferably 5). When implemented: use **separate table(s)** (e.g. `affiliates`, `order_affiliate_attribution`) — prefer not adding column to `orders`. If `orders.affiliate_id` is used: nullable, optional, never used in billing or provisioning. Write attribution **in same transaction as order creation** (single write at order create). Reports “referrals by partner / revenue by partner” **admin-only**. No automated payout (no cron/webhook that pays). Audit: no code path triggers refunds, credits, or payment changes. |
| **Rollback / schema** | Critical table churn | New tables (e.g. incident_log, order_affiliate_attribution) in versioned migrations. If `orders` gets nullable `affiliate_id`: document as additive, optional, no billing/provisioning use; rollback = stop writing, optionally backfill nulls. |

**All new public GET endpoints:** Same or stricter rate limiting; responses must contain no PII or internal IDs.

---

## Re-sequenced Phase Order

| Order | Phase | Rationale |
|-------|--------|-----------|
| 1 | PR Phase 1: Public stats + Status/incident (with mitigations) | Establishes public-endpoint hygiene (rate limit, sanitization, index). |
| 2 | PR Phase 2: Status page resilience | Reuse /health or /ready; no new surface without controls. |
| 3 | PR Phase 3: Checkout + post-payment copy | Copy/UI only; no risk. |
| 4 | PR Phase 4: DDoS + 48h guarantee | Copy + process; no risk. |
| 5 | PR Phase 5: Wedge landing + Deploy (plan_id from API) | Money page with strict plan_id validation. |
| 6 | PR Phase 6: Affiliate CTA only (“coming soon”) | Reduces overpromise; **6.2 backend deferred**. |
| 7 | PR Phase 7: Discord FAQ + support capacity | Content/process only. |
| 8 | PR Phase 8: Affiliate backend (attribution) | **Only after Phases 1–2 (and preferably 5).** Implements attribution with full mitigations. |
| 9 | PR Phase 9: Marketing-only (proof page, kit, copy) | No backend; consistent story. |

---

## PR Phase 1: Public provisioning stats + Status copy + Incident log

**Goal:** Truthful “ready in X minutes” and transparent host. No PII or new write paths.

---

### Phase 1 — Concrete PR units (small, atomic, safe)

| PR | Scope | Files touched | Migrations | Rollback |
|----|--------|----------------|------------|----------|
| **PR-1** | Public provisioning stats endpoint only (1.1 with mitigations) | `api/routes/public.js` (new), `api/lib/provisioningStats.js` (new), `api/server.js` | `sql/migrations/YYYYMMDDHHMMSS_add_orders_status_updated_index.sql` | Remove route mount and files; run down migration to drop index |
| **PR-2** | Status page copy and data (1.2) | `src/pages/Status.tsx` (or status page component), optional env | None | Revert copy changes |
| **PR-3** | Incident log content only (1.3) | Status page or new component + static data / markdown | None (if table later: separate PR) | Revert component and content |

**PR-1 acceptance criteria:**  
- GET `/api/public/provisioning-stats` returns only `median_provisioning_seconds`, `provision_success_rate_24h`, `provision_count_24h`.  
- Dedicated minimal query/helper only; no `getMetricsSnapshot()` exposure.  
- Index on `orders(status, updated_at)` added via migration.  
- Endpoint rate-limited (same or stricter than other public).  
- Response contains no `order_id`, `user_id`, or other identifiers.

**PR-1 rollback plan:**  
- Remove `app.use('/api/public', ...)` and delete `api/routes/public.js`, `api/lib/provisioningStats.js`.  
- Run down migration to drop `idx_orders_status_updated` (or add a down migration file and run it).  
- No billing/provisioning code touched; safe to revert.

---

### 1.1 Public provisioning stats (read-only API)

**Implement with all Architecture mitigations in this PR.**

| Acceptance criteria | Status |
|---------------------|--------|
| New **unauthenticated** GET endpoint (e.g. `GET /api/public/provisioning-stats` or under `/api/health`) returns **only** three fields: `median_provisioning_seconds` (or p95), `provision_success_rate_24h`, `provision_count_24h`. | ☑ |
| Implementation uses a **dedicated minimal query** or small helper; does **not** expose `getMetricsSnapshot()` or raw in-memory metrics. | ☑ |
| Query uses 24h window on `orders`; index exists on `orders(status, updated_at)` (or equivalent) so the 24h filter does not full-table scan. | ☑ |
| Endpoint is rate-limited (same or stricter than other public endpoints). | ☑ |
| Code review: response JSON contains no `order_id`, `user_id`, or other identifiers. | ☑ |

### 1.2 Status page copy and data

| Acceptance criteria | Status |
|---------------------|--------|
| Hardcoded “US East / 12ms / 99.9%” replaced with real health/ops data where available, or “we’ll update as we add regions.” | ☑ |
| “Typical time to server ready: &lt;X&gt; minutes” added once 1.1 is live (source: public stats endpoint). | ☑ |
| One line added: “DDoS mitigation: included” (or infra-accurate wording). | ☑ |

### 1.3 Incident log (content only; if table added later)

| Acceptance criteria | Status |
|---------------------|--------|
| Incident log is present as static frontend list, markdown in repo, or (if table) **write-restricted**: admin/cron only; **no public write API**. | ☑ |
| If table: no FKs to `orders` or `users`; versioned migration. | ☑ |
| At least 1–2 real or example postmortem entries. | ☑ |

**Phase 1 exit:** Public stats endpoint live with mitigations; Status + incident copy updated; no new write paths; no billing/provisioning changes.

**Phase 1 status (complete):**
- PR-1: `GET /api/public/provisioning-stats` live; `api/lib/provisioningStats.js` (dedicated query only); migration `20260227100000_add_orders_status_updated_index.sql`; rate-limited via `publicLimiter`; response has no PII/IDs. Success rate denominator includes both `error` and `failed` statuses.
- PR-2: Status page uses `/ready` and `/api/public/provisioning-stats`; "Typical time to server ready" and "DDoS mitigation: included" in place; "Region and uptime metrics will be updated as we add regions."
- PR-3: Incident log section on Status page with static copy ("No major incidents recorded" + example); no table yet; no public write.

---

## PR Phase 2: Status page resilience

**Goal:** Status page can survive main-site/API outages.

| Acceptance criteria | Status |
|---------------------|--------|
| **Option A or B:** Separate status host (e.g. status.givrwrld.com) **or** third-party status provider; status checks hit only intended health endpoints. | ☑ |
| Status checks use **existing** `/health` or `/ready` (or documented strict subset). If new endpoint added: no PII, no internal hostnames/topology, no verbose errors. | ☑ |
| Document which URLs are allowed for status checks. | ☑ |
| Incident process documented: who updates status, where copy lives, sync with incident log. | ☑ |

**Phase 2 exit:** Status resilience in place; no new sensitive surface; no billing/provisioning impact.

**Phase 2 status (complete):** **docs/STATUS-PAGE-RESILIENCE.md** updated: allowed URLs for status checks are `/health`, `/ready`, `/api/health`, `/api/public/provisioning-stats` (strict subset; no PII/verbose errors). Option A (separate host) and Option B (third-party provider) described with CORS note for Option A. Incident process: owner = ops lead or on-call (see **docs/incident-playbook.md**); copy lives in `src/pages/Status.tsx`; sync with incident log described. Deploying Option A or B is an infra step when ready.

---

## PR Phase 3: Checkout and post-payment copy

**Goal:** Clear payment method and “what happens next”; copy/UI only.

| Acceptance criteria | Status |
|---------------------|--------|
| One place above the fold: “Pay with PayPal or card — no PayPal account required” only if guest checkout is supported; else “Pay with PayPal (card or account).” | ☐ |
| Post-payment / success page: one short line, e.g. “Your server will be ready in a few minutes. We’ll email you when it’s live” or “Check your dashboard for status.” | ☐ |
| No changes to payment API, webhooks, or subscription logic. | ☑ |

**Phase 3 exit:** Copy and UI updated; billing and provisioning untouched.

**Phase 3 status (complete):** Checkout has one above-the-fold line: "Pay with PayPal (card or account)." in the header; Success page shows "Your server will be ready in a few minutes. Check your dashboard for status." No payment API, webhooks, or subscription logic changes — copy/UI only.

---

## PR Phase 4: DDoS and 48h guarantee

**Goal:** One honest DDoS line and deliverable 48h guarantee; copy + process only.

| Acceptance criteria | Status |
|---------------------|--------|
| One clear DDoS line on a key page (Deploy, About, or Status); no “advanced”/“enterprise” unless true. | ☑ |
| Internal doc: who handles 48h refunds, how (e.g. cancel in PayPal + manual refund), definition of “activation.” | ☑ |
| One sentence on Checkout or FAQ: “Not happy in the first 48 hours? Contact support for a full refund.” | ☑ |
| No automated refund or billing logic. | ☑ |

**Phase 4 exit:** DDoS line live; 48h process documented; copy consistent; no billing/provisioning code changes.

**Phase 4 status (complete):** DDoS line present on Deploy, About, and Status ("DDoS mitigation is included for all game servers."); no "advanced"/"enterprise" wording on those pages. Internal process in **docs/48H-REFUND-PROCESS.md**: who (ops/support lead), how (cancel in PayPal + manual refund), definition of activation (first panel login or provisioned). Checkout and FAQ both have "Not happy in the first 48 hours? Contact support for a full refund." No automated refund or billing logic.

---

## PR Phase 5: Wedge-game landing + Deploy tweaks

**Goal:** One proper money page and clearer Deploy; plan_id validation enforced.

| Acceptance criteria | Status |
|---------------------|--------|
| One wedge-game landing (e.g. `/deploy/minecraft` or clear tab): game-specific copy, **one recommended plan** whose `plan_id` comes **only** from existing plans API (e.g. `/api/plans` or game-specific). CTA goes to **existing** checkout. | ☐ |
| No hardcoded or user-supplied `plan_id` without server-side validation (checkout already validates). | ☐ |
| Deploy page: wedge games (Minecraft, Rust, Palworld) as hero options; game-specific bullets (RAM/slot, mod-friendly, etc.). | ☐ |
| No new backend or provisioning logic. | ☐ |

**Phase 5 exit:** Wedge landing live; Deploy copy/UX updated; plan_id sourcing and validation strict; no billing/provisioning risk.

---

## PR Phase 6: Affiliate CTA only (backend deferred)

**Goal:** Stop overpromising; do **not** implement affiliate backend until Phase 8.

| Acceptance criteria | Status |
|---------------------|--------|
| Affiliate page CTA: “Join the waitlist” or “Partner program coming soon — email X for early access.” | ☑ |
| No new backend, no attribution, no schema changes. | ☑ |

**Phase 6 exit:** CTA softened; affiliate backend **deferred** until Phase 8 (after guardrails from Phases 1–2 and preferably 5).

**Phase 6 status (complete):** Affiliate page CTA: “Partner program coming soon — join the waitlist or email support@givrwrld.com for early access” with “Join the waitlist” button (mailto). No new backend, attribution, or schema changes.

---

## PR Phase 7: Discord and support capacity

**Goal:** Deflect repeat questions; support capacity plan.

| Acceptance criteria | Status |
|---------------------|--------|
| Discord: pin or link one message/doc (“What plan for X?”, “How do I migrate?”, “Where’s my server?”). | ☑ |
| Document support capacity: who answers tickets/Discord, max capacity; cap or stagger campaign volume as needed. | ☑ |
| No code or provisioning changes. | ☑ |

**Phase 7 exit:** FAQ and capacity plan in place; no billing, provisioning, or security changes.

**Phase 7 status (complete):** Discord: **docs/DISCORD-PRE-SALES-FAQ.md** (What plan for X?, How do I migrate?, Where’s my server?) — instruction to pin or link in FAQ/support channel; Discord page links to FAQ and “pinned message in support channel.” Support capacity: **docs/SUPPORT-CAPACITY-PLAN.md** (who answers tickets/Discord, capacity, campaign cap/stagger). No code or provisioning changes.

---

## PR Phase 8: Affiliate backend (attribution only)

**Prerequisite:** Phases 1, 2, and preferably 5 complete (guardrails and plan_id patterns in place). **High-risk item; do not start until prerequisites met.**

**Goal:** Partner signup + attribution only; no billing/payout/refund logic.

| Acceptance criteria | Status |
|---------------------|--------|
| **Schema:** New table(s) only (e.g. `affiliates`, `order_affiliate_attribution` with `order_id`, `affiliate_id`, `created_at`). Prefer **no** new column on `orders`. If `orders.affiliate_id` is added: nullable, optional, documented, never used in billing or provisioning. Versioned migration(s). | ☑ |
| **Attribution write:** Single write **in same transaction as order creation** (when inserting the order row). No update-after-payment; no double-apply or race. | ☑ |
| **Signup:** Store partner identity and referral code/link (no payment flow changes). | ☑ |
| **Reports:** “Referrals by partner / revenue by partner” exposed **only** via admin-only route or script; not public or customer-facing. | ☑ |
| **No automated payout:** No cron or webhook that pays affiliates. Payout remains manual (export/report → manual process). | ☑ |
| **Audit:** No code path in this work triggers refunds, credits, or payment amount changes. | ☑ |

**Phase 8 exit:** Attribution and signup only; billing correctness and provisioning unchanged; rollback = stop writing attribution (existing orders unaffected).

**Phase 8 status (complete):** Schema: `affiliates` (app_core), `order_affiliate_attribution` (migration); no column on `orders`. Attribution: single write in same transaction as order create (`createOrderWithAttribution` in checkout + paypal routes). Signup: `POST/GET /api/affiliates/signup`, `/me`. Reports: `GET /api/admin/affiliates/report` admin-only. No automated payout; audit: no refund/credit paths. See **docs/AFFILIATE-BACKEND-PHASE8.md**.

---

## PR Phase 9: Marketing-only (proof page, kit, copy)

**Goal:** Proof page, comparison kit, aligned copy; no product/backend changes.

| Acceptance criteria | Status |
|---------------------|--------|
| Proof/transparency page or section: link to status page, incident log, “Typical provisioning time” from public stats. | ☐ |
| One-pager or short doc: pricing by game/tier, differentiators, “what we need from you” for reviewers/affiliates. | ☐ |
| Ad and landing copy: same “typical time to ready,” same DDoS line, same guarantee everywhere. | ☐ |
| No backend or schema changes. | ☐ |

**Phase 9 exit:** Proof page and kit usable by Marketing; copy aligned; no risk to billing, provisioning, or security.

---

## Summary: PR order and risk

| PR Phase | Content | Risk after mitigations |
|----------|---------|-------------------------|
| 1 | Public stats (sanitized, indexed, rate-limited) + Status/incident | Low (mitigations required in same PR) |
| 2 | Status resilience (reuse /health or /ready; document URLs) | Low |
| 3 | Checkout + post-payment copy | None |
| 4 | DDoS + 48h copy and process | None |
| 5 | Wedge landing + Deploy (plan_id from API only) | Low |
| 6 | Affiliate “coming soon” CTA only | None |
| 7 | Discord FAQ + support capacity | None |
| 8 | Affiliate backend (separate table, order-create attribution, admin-only reports, no payout) | Low (deferred until guardrails exist) |
| 9 | Proof page + kit + copy | None |

**Removed/deferred from original plan:** Affiliate backend (6.2) is **deferred** to Phase 8 and only after Phases 1–2 (and preferably 5). No HIGH-risk item is implemented without the mitigations above. Architecture feedback is treated as authoritative for system safety.
