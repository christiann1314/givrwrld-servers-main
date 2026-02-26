# Production Hardening (Phase 1)

## Order state machine

Statuses are enforced through a single service layer (`api/services/OrderService.js`):

| Status        | Meaning |
|---------------|--------|
| `pending`     | Order created; awaiting PayPal approval/subscription. |
| `paid`        | PayPal subscription active; eligible for provisioning. |
| `provisioning`| Provisioning in progress (panel API call). |
| `provisioned` | Server created; `ptero_server_id` and `ptero_identifier` set. |
| `failed`      | Provisioning failed (see `last_provision_error`). |
| `error`       | Legacy alias; treated like `failed`. |
| `canceled`    | Subscription canceled/expired. |

Transitions:

- **pending → paid**: PayPal webhook `BILLING.SUBSCRIPTION.ACTIVATED` or finalize-order (subscription ACTIVE).
- **paid → provisioning**: When `provisionServer(order_id)` starts.
- **provisioning → provisioned**: Panel returns server id; order updated with `ptero_server_id` / `ptero_identifier`.
- **provisioning/paid → failed**: On provisioning error; `last_provision_error` and optionally `provision_attempt_count` / `last_provision_attempt_at` updated.

All status changes go through `OrderService` (e.g. `transitionToPaid`, `transitionToProvisioning`, `transitionToProvisioned`, `transitionToFailed`).

---

## PayPal webhook signature verification

- Set **PAYPAL_WEBHOOK_ID** in env to the webhook ID from the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) (Webhooks → your webhook → ID).
- The webhook route is mounted with **raw body** (`express.raw({ type: 'application/json' })`) so the body is not parsed before verification.
- Verification uses PayPal’s **Verify Webhook Signature** API: the handler sends the request headers (`paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`, `paypal-cert-url`) and the parsed event body to `POST /v1/notifications/verify-webhook-signature`. If `verification_status` is not `SUCCESS`, the handler returns **401** and does not process the event.
- If `PAYPAL_WEBHOOK_ID` is not set, verification is skipped (useful for local testing). In production, always set it and use HTTPS for the webhook URL.

---

## Webhook idempotency

- Table: `paypal_webhook_events` with `event_id` PRIMARY KEY, `received_at`, `raw_type`, `order_id` (nullable).
- Before processing any event, the handler tries `INSERT` into this table. If the insert fails with a duplicate key on `event_id`, the handler returns **200** and does **nothing** (event already processed).
- This makes PayPal webhook retries safe: duplicate deliveries do not double-update orders or double-provision servers.

---

## Retry / reconcile logic

- A **reconcile job** runs every **2 minutes** (node-cron; no Redis in Phase 1).
- It finds orders where:
  - `status` IN (`paid`, `provisioning`, `error`, `failed`),
  - `ptero_server_id` IS NULL,
  - `item_type` = `game`,
  - Order is “stuck”: either older than **10 minutes** since creation or last attempt, and **exponential backoff** has elapsed (`last_provision_attempt_at` + backoff window).
- Backoff: `min(30, 5 * 2^min(attempt, 4))` minutes.
- For each such order it calls `provisionServer(order_id)`. Provisioning is **idempotent**: if the order already has `ptero_server_id` or status `provisioned`, `provisionServer` returns success without creating a second server.

**finalize-order** is retry-safe: calling it multiple times never duplicates provisioning, because `canProvision(order)` is false once the order is provisioned or has `ptero_server_id`.

---

## How to validate in staging

1. **Idempotency**
   - Create an order and complete PayPal flow so the webhook fires.
   - Resend the same webhook (same `event_id`) from PayPal or with a test tool. Second request must return **200** and must not change order or create a second server.
   - Call `POST /api/paypal/finalize-order` with the same `order_id` multiple times. First time may provision; subsequent calls must return success with “already provisioned” and must not create another server.

2. **Reconcile**
   - Put an order in `paid` with no `ptero_server_id` and no panel (or panel down). Wait >10 minutes and ensure the reconcile job runs (logs or `/ops/summary`). Fix panel or env, then run again; order should move to `provisioned` after next reconcile or manual finalize.

3. **Health / ready**
   - `GET /health` → 200, `status: 'ok'`.
   - `GET /ready` → 200 when DB and required env are present; 503 if DB is down or required env missing. Optional panel check is documented in the endpoint.

4. **Ops**
   - `GET /ops/summary` → JSON with `ordersByStatus`, `lastWebhookReceivedAt`, `stuckOrdersCount`. (Unauthenticated; in production consider restricting by firewall or adding an API key.)

5. **Logs**
   - Trigger a request and confirm logs are structured (e.g. pino) and include correlation id; confirm secrets (e.g. `Authorization`, `PAYPAL_CLIENT_SECRET`) are redacted.

---

## Quick validation checklist

**1. Health and ready**
```bash
curl -s http://localhost:3001/health
# Expect: {"status":"ok","timestamp":"...","service":"givrwrld-api"}

curl -s http://localhost:3001/ready
# Expect: 200 and "status":"ready" when DB is up and MYSQL_PASSWORD, JWT_SECRET set; 503 otherwise with "checks":{...}
```

**2. Ops summary**
```bash
curl -s http://localhost:3001/ops/summary
# Expect: {"ordersByStatus":{...},"lastWebhookReceivedAt":...|null,"stuckOrdersCount":N,"timestamp":"..."}
```

**3. DB after migration**
- `paypal_webhook_events`: columns `event_id` (PK), `received_at`, `raw_type`, `order_id`.
- `orders`: columns `provision_attempt_count`, `last_provision_attempt_at`, `last_provision_error`; status enum includes `failed`; unique index `uniq_ptero_server_id` on `ptero_server_id`.

**4. Idempotency**
- Send same PayPal webhook event twice (same `event_id`): second response 200, no new row in `paypal_webhook_events` (insert fails duplicate), no duplicate order update.
- Call `POST /api/paypal/finalize-order` twice with same `order_id` (auth header): second response success with `status: 'provisioned'` and no second server created (check `orders.ptero_server_id` and Panel server list).
