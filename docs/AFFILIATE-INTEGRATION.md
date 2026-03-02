# Affiliate integration (Phase 8)

Attribution only: no billing or provisioning logic changes. Payouts remain manual.

## Backend

- **Attribution:** When creating an order (checkout or PayPal create-subscription), the API accepts an optional `referral_code` in the request body. If the code matches an affiliate in the `affiliates` table, one row is written to `order_affiliate_attribution` in the **same transaction** as the order insert. No update after payment.
- **Signup:** `POST /api/affiliates/signup` (authenticated) creates an affiliate row for the current user and returns a unique `code`. `GET /api/affiliates/me` returns the current user’s code if they have one.
- **Report:** `GET /api/admin/affiliates/report` (admin-only) returns referrals by partner and revenue estimate (by plan price). Not public.

## Frontend (optional)

To attribute orders to a partner:

1. **Capture referral:** When the user lands with `?ref=CODE` in the URL (e.g. from an affiliate link), store `CODE` in a cookie or in session storage (e.g. 30-day cookie).
2. **Send on checkout:** When calling the checkout/create-session or paypal/create-subscription API, include `referral_code: CODE` in the request body if you have a stored code.

No frontend changes are required for attribution to work; the backend will attribute when `referral_code` is present and matches an affiliate.

## Migration

Run before using attribution or the report:

```bash
mysql -u ... -p app_core < sql/migrations/20260227200000_order_affiliate_attribution.sql
```

Rollback: `DROP TABLE IF EXISTS order_affiliate_attribution;`

## No automated payout

There is no cron or webhook that pays affiliates. Use the admin report to see referrals and revenue by partner; payouts are manual (export and process outside the app).
