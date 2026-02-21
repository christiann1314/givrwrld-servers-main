# Stripe & Supabase References Audit

**Date:** 2025-02  
**Scope:** All code files for Stripe/Supabase references, keys, and URLs.  
**Current stack:** PayPal + Express (api/) + MariaDB; Supabase/Stripe are legacy for this project.

---

## Summary

| Category | Count | Action |
|----------|--------|--------|
| **Hardcoded Supabase URL/key** | 4 files | **Removed** – use env only, no fallbacks |
| **Hardcoded Stripe key in .env.example** | 1 | **Redacted** |
| **Frontend Stripe/Supabase config** | environment.ts, client.ts | **Neutralized** – no defaults, comments added |
| **Components calling Supabase Functions** | ServerStats, PanelAccess | **Routed to Express API** where endpoint exists |
| **Legacy Supabase Edge Functions** | supabase/functions/* | **Left in repo** – documented as unused when using Express |
| **Schema/DB column names** | stripe_sub_id, stripe_price_id | **Kept** – backwards compat, no secrets |
| **Naming (stripeService, useStripeCheckout)** | Multiple | **Kept** – they call PayPal backend; rename later if desired |

---

## 1. Files with hardcoded Supabase URL or anon key (FIXED)

- **src/integrations/supabase/client.ts** – Had fallback `https://mjhvkvnshnbnxojnandf.supabase.co` and anon key. **Fixed:** no fallback; require env.
- **src/lib/trafficManager.ts** – Had `https://mjhvkvnshnbnxojnandf.supabase.co` in endpoints. **Fixed:** use env or empty.
- **src/components/LoadBalancingConfig.tsx** – Same URL. **Fixed:** use env or placeholder.
- **.env.example** – Contained Supabase URL, anon key, Stripe publishable key. **Fixed:** redacted to placeholders.

---

## 2. Files with Stripe references (by role)

### Frontend – checkout flow (uses PayPal via backend)

- **src/services/stripeService.ts** – Name is legacy; implementation calls Express `/api/checkout/create-session` (PayPal). No Stripe keys. **Left as-is** (optional rename to `checkoutService` later).
- **src/hooks/useStripeCheckout.ts** – Uses stripeService. **Left as-is.** Toast text "Redirecting to Stripe" → can change to "Redirecting to checkout" (done in audit fixes).
- **src/config/environment.ts** – Had `stripe.publishableKey` from `VITE_STRIPE_PUBLISHABLE_KEY`. **Fixed:** section commented/optional; comment says PayPal is primary.
- **src/pages/Checkout.tsx** – Uses `stripe_price_id` as display (plan field). **Left** – schema compat.
- **src/pages/Success.tsx** – Looks up order by `stripe_session_id` as fallback. **Left** – harmless.
- **src/utils/errorHandler.ts** – Message check for "stripe". **Left** – no key.
- **src/pages/Billing.tsx** – TODO comment about Stripe. **Fixed:** comment updated to "payment provider".
- **src/hooks/useSubscription.ts** – Toast "Redirecting to Stripe". **Fixed:** "Redirecting to checkout".

### Backend API (api/) – MySQL/orders

- **api/utils/mysql.js** – `stripe_sub_id`, `stripe_customer_id` in createOrder. **Left** – DB columns, no secrets.
- **api/scripts/restore-terraria-product.js** (and similar) – Stripe product/price scripts. **Left** – legacy; not used by PayPal flow. Add README note in api/scripts if desired.

### Supabase Edge Functions (legacy)

- **supabase/functions/stripe-webhook/** – Full Stripe webhook. **Left** – unused when using Express + PayPal.
- **supabase/functions/create-checkout-session/** – Stripe checkout. **Left** – unused.
- **supabase/functions/customer-portal**, **check-subscription**, **create-billing-portal-session** – Stripe. **Left** – legacy.
- **supabase/functions/*-mysql/** – Mix of Stripe/MySQL. **Left** – legacy.

---

## 3. Files with Supabase references (by role)

### Frontend – client and config

- **src/integrations/supabase/client.ts** – Supabase client. **Fixed:** no hardcoded URL/key; require env.
- **src/integrations/supabase/types.ts** – Types with stripe_price_id etc. **Left** – types only.
- **src/components/ServerStats.tsx** – Called `VITE_SUPABASE_FUNCTIONS_URL/server-stats`. **Fixed:** use Express API when available (e.g. GET /api/servers/stats?order_id=).
- **src/components/PanelAccess.tsx** – Called `VITE_SUPABASE_FUNCTIONS_URL/panel-sync-user`. **Fixed:** use Express API if endpoint exists, else env-only (no hardcoded URL).
- **src/lib/supabaseOptimized.ts** – Hardcoded Supabase URL. **Fixed:** use env only.
- **public/sw.js** – hostname check for supabase.co. **Left** – no secret.

### Supabase Edge Functions

- All under **supabase/functions/** use Supabase client and env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY). **Left** – legacy; not used when running Express stack.

### Other

- **run-migration-direct.js**, **run-analytics-migration.js** – Hardcoded Supabase URL. **Fixed:** use env or remove/archive.
- **.env.example**, **.env.worker.example** – **Fixed:** redacted; no real keys or project URLs.

---

## 4. Env and example files

- **.env.example** – Should contain only placeholders (e.g. `VITE_SUPABASE_URL=`, `VITE_SUPABASE_ANON_KEY=`, `VITE_STRIPE_PUBLISHABLE_KEY=`, `VITE_SUPABASE_FUNCTIONS_URL=`). If it ever contained real project URLs or keys, redact them and rotate those keys.
- **.env.api.example** – Same: use placeholders for STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, Supabase, etc. No real keys.
- **.env** – In .gitignore; never commit real keys.

---

## 5. Dependencies

- **package.json** – `stripe`, `@supabase/supabase-js` in dependencies. **Left** – optional/legacy; removing could break imports. Can prune later when Supabase client unused.
- **api/package.json** – `stripe` for restore scripts. **Left** – optional for legacy scripts.

---

## 6. Recommended follow-up

- Rotate any keys that were ever in .env.example or client.ts (Supabase anon, Stripe publishable).
- If you fully drop Supabase client from frontend: remove `@supabase/supabase-js` and replace remaining imports with stub or remove.
- Consider renaming `stripeService` → `checkoutService` and `useStripeCheckout` → `useCheckout` for clarity (PayPal primary).
