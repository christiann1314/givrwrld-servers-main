# Affiliate backend (Phase 8)

Attribution and partner signup only. No billing, payout, or refund logic.

---

## Schema

- **`affiliates`** (in `sql/app_core.sql`): `user_id` (PK), `code` (unique), `clicks`, `signups`, `credits_cents`, `created_at`, `updated_at`. Partner identity and referral code.
- **`order_affiliate_attribution`** (migration `sql/migrations/20260227200000_order_affiliate_attribution.sql`): `id`, `order_id`, `affiliate_user_id`, `created_at`. One row per order when the order was referred; FK to `orders` and `users`.
- **No column on `orders`:** Attribution is stored only in `order_affiliate_attribution`. Billing and provisioning never read affiliate data.

---

## Attribution write

- **Single write in same transaction as order creation.** `api/lib/orderAffiliate.js` → `createOrderWithAttribution(params, referralCode)`: inserts the order row, then if `referralCode` matches an affiliate `code`, inserts one row into `order_affiliate_attribution` in the same transaction. Used by `api/routes/checkout.js` (create-session) and `api/routes/paypal.js` (create-subscription). No update-after-payment; no double-apply or race.

---

## Signup

- **`POST /api/affiliates/signup`** (authenticated): Register current user as affiliate; create or return referral code. No payment flow changes.
- **`GET /api/affiliates/me`** (authenticated): Return current user’s affiliate code if any.

---

## Reports

- **`GET /api/admin/affiliates/report`**: Referrals by partner, revenue estimate by partner. **Admin-only** (router uses `authenticate`, `requireAdmin`). Not public or customer-facing.

---

## No automated payout

- No cron or webhook pays affiliates. Payout remains manual (export report → manual process).

---

## Audit

- No code path in affiliate signup, attribution, or admin report triggers refunds, credits, or payment amount changes. Billing and provisioning are unchanged.

---

## Rollback

- Stop writing attribution (e.g. stop passing `referral_code` from frontend or ignore it in `createOrderWithAttribution`). Existing orders and attributions are unaffected; no schema rollback required for safety.
