# Overview: Recent Work & Architect / Technical Engineer Review

**Purpose:** Single briefing for an architect or technical engineer to review what was done during the staged marketing plan implementation, what broke the frontend, and the current state.  
**Audience:** Architect, tech lead, or senior engineer doing a system/risk review.  
**Reference:** [STAGED-MARKETING-EXECUTION-PLAN.md](./STAGED-MARKETING-EXECUTION-PLAN.md) is the authoritative plan; mitigations there are binding.

---

## 1. What Was Done (High Level)

Work falls into three buckets:

| Area | Scope | Risk / Guardrails |
|------|--------|-------------------|
| **Marketing agent (services/marketing-agent)** | Event-driven drafts (Discord, Reddit, TikTok), Discord webhook posting, throttling, DB tables `marketing_events` / `marketing_content_drafts`. | No provisioning, no billing, no schema changes to core app. Own DB tables and migrations. See [services/marketing-agent/README.md](../services/marketing-agent/README.md). |
| **Phase 8: Affiliate backend (attribution only)** | Migrations for affiliate/attribution; attribution written at order create (checkout + PayPal); affiliate signup API; admin-only affiliates report. | Per plan: separate table(s), attribution in same transaction as order create, admin-only reports, no automated payout, no refund/credit/payment logic. |
| **Phase 5–style: Minecraft wedge landing** | New page `DeployMinecraft.tsx` (landing for Minecraft, plan IDs from plans API only). | Plan IDs from API only; no hardcoded plan_id (per plan 5.1). |

---

## 2. What Broke the Frontend

- **Symptom:** Full-screen Vite overlay; UI would not load. Error from `[plugin:vite:react-swc]`.
- **File:** `src/pages/DeployMinecraft.tsx`.
- **Reported errors (over time):**
  - `Unexpected token 'div'. Expected jsx identifier` (around line 51).
  - `Expression expected` (after `return (` on the next line).
  - Occasional secondary/cascading errors (e.g. “Expected ',', got 'to'”) and typos in editor buffer (e.g. `className-(rootClass)` or `to-"/deploy"`).

**Root cause (react-swc):**  
With **Vite + @vitejs/plugin-react-swc**, a pattern like:

```tsx
return (
  <div ...>
```

can be mis-parsed: the parser sees `return (` then a newline then `<`. In TypeScript, `<` after a newline in that position can be interpreted as the start of a **generic type parameter**, so it expects a type name (JSX “identifier”), not the tag `div`, and reports “Expected jsx identifier” or “Expression expected”. This is a known class of JSX/TS ambiguity with some SWC/TS configurations.

**Contributing factors:**
- Same file also used a long `className` string; if the line was wrapped in the editor, the string could be split across lines and cause a syntax error.
- Any typo in the same file (e.g. `{rootClass)` instead of `{rootClass}`, or `to-"` instead of `to="`) would produce additional syntax errors.

---

## 3. What Was Reverted to Restore the Site

To get the site back up without blocking on the Minecraft page:

1. **DeployMinecraft removed from routing**
   - **App.tsx:** Removed `import DeployMinecraft` and the route `<Route path="/deploy/minecraft" element={<DeployMinecraft />} />`.
   - A short comment was left at the route location pointing to this page and re-enable steps.

2. **Minecraft CTA on Deploy page**
   - **Deploy.tsx:** The Minecraft-specific link was changed from `to="/deploy/minecraft"` to `to="/configure/minecraft"` so the CTA still has a valid destination and does not 404. Label set to “Deploy Minecraft →”.

3. **DeployMinecraft.tsx retained**
   - File is **not** deleted. It was fixed so it parses under react-swc (see below) but is simply no longer mounted. A short comment in the file header explains how to re-enable it and the one style rule required for react-swc.

**Build status:** `npm run build` completes successfully after the revert.

---

## 4. Current State

| Component | State |
|-----------|--------|
| **Site / frontend** | Up; all routed pages load. No `/deploy/minecraft` route. |
| **Deploy page** | Minecraft CTA links to `/configure/minecraft`. |
| **DeployMinecraft.tsx** | Present at `src/pages/DeployMinecraft.tsx`; not imported or routed. Contains re-enable instructions in file header. |
| **Marketing agent** | Implemented; see `services/marketing-agent/`. |
| **Phase 8 (affiliate)** | Migrations and attribution/signup/report work as implemented; no changes reverted there. |

---

## 5. Re-enabling the Minecraft Landing Page

When you want the dedicated Minecraft landing back:

1. **App.tsx**
   - Add: `import DeployMinecraft from "@/pages/DeployMinecraft";`
   - Add route: `<Route path="/deploy/minecraft" element={<DeployMinecraft />} />` (comment in file shows exact placement).

2. **Deploy.tsx**
   - Set the Minecraft CTA back to `to="/deploy/minecraft"` (and adjust label if desired).

3. **DeployMinecraft.tsx — keep this pattern**
   - To avoid react-swc mis-parsing, the return must **not** put a newline between `return (` and the first JSX. Current working form:
     - `return (<><div className={rootClass}>` on one line, with `rootClass` defined above (avoids long string wrap).  
   - Do **not** use `return (` then newline then `<div` or `<>`; that can reintroduce “Expected jsx identifier” / “Expression expected”.

Re-enable steps are also summarized in the comment block at the top of `DeployMinecraft.tsx`.

---

## 6. Recommendations for Architect / Technical Engineer

1. **Staged plan alignment**
   - Confirm Phase 8 implementation (migrations, attribution at order create, signup API, admin report) matches [STAGED-MARKETING-EXECUTION-PLAN.md](./STAGED-MARKETING-EXECUTION-PLAN.md) Phase 8 and the mitigation table (separate tables, same-transaction attribution, admin-only, no payout automation, no refund/credit logic).
   - Confirm marketing agent stays within its role (no provisioning, no billing, no core schema); review any new env (e.g. Discord webhook) and access to DB.

2. **Frontend / react-swc**
   - **Option A (pragmatic):** Keep the current “first JSX on same line as `return (`” convention for any new or touchy pages if react-swc remains in use; document in a short frontend guide or README.
   - **Option B (investigate):** Consider testing with `@vitejs/plugin-react` (Babel) instead of `react-swc` for this project to see if the parse ambiguity goes away; weigh build speed vs. maintenance.
   - **Option C:** If more wedge landings (e.g. other games) are added, use the same pattern as the fixed `DeployMinecraft.tsx` or a small wrapper component to avoid the `return (` + newline + `<` pattern.

3. **DeployMinecraft and Phase 5**
   - The page itself is Phase 5–style (wedge landing, plan IDs from API). Re-enabling it is copy/paste + route/link; no new risk if the same pattern and plan-ID discipline are kept.
   - Optional: add a quick smoke test or build check that ensures `DeployMinecraft.tsx` (or any page with that return pattern) is not reintroduced in the fragile form (e.g. lint rule or CI that builds the app).

4. **Rollback**
   - Marketing agent: disable cron/PM2 job; DB tables can remain.
   - Phase 8: stop writing attribution (e.g. feature flag or deploy without attribution code); existing orders unaffected; admin report can be disabled or removed.
   - DeployMinecraft: already “rolled back” by removing route and redirecting CTA; re-enable when ready per section 5 above.

---

## 7. Key Files to Review

| Concern | Paths |
|--------|--------|
| Routing / re-enable | `src/App.tsx`, `src/pages/Deploy.tsx` |
| Minecraft page (parse-safe pattern) | `src/pages/DeployMinecraft.tsx` |
| Marketing agent | `services/marketing-agent/` (README, index, templates, throttle, Discord webhook) |
| Phase 8 (affiliate) | `sql/migrations/*affiliate*`, `sql/migrations*attribution*`, checkout/PayPal order creation, affiliate signup API, admin report route |
| Plan and mitigations | `docs/STAGED-MARKETING-EXECUTION-PLAN.md` |

---

## 8. Architect verification checklist (systems only)

Use this when reviewing the key paths in section 7. Invariants and risk only — no UI or marketing copy.

| Focus | Verification |
|-------|---------------|
| **Attribution** | Written only at order create, same transaction as order insert; never in webhook/finalize or after payment. |
| **Billing / provisioning** | Attribution/affiliate not used in amount, subscription create, `provisionServer`, or queue. |
| **Affiliate report** | Admin-only; not public or customer-facing. |
| **Payout** | No automated payout; manual/offline only. |
| **Marketing agent** | Separate tables only; no FK from orders/users/plans; no billing/provisioning access. |
| **Minecraft wedge** | Plan IDs from API only when re-enabled; no hardcoded `plan_id`. |
| **Rollback** | Stopping attribution or agent doesn't require orders migration; affiliate/marketing data can stay. |

---

*Document generated for architect/technical engineer review. For questions on the staged plan or mitigations, refer to STAGED-MARKETING-EXECUTION-PLAN.md.*
