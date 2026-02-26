# Phase 1: Production Hardening — Files Created/Modified

**Before starting the API:** Run the migration so `paypal_webhook_events` and new `orders` columns exist:
`mysql -u app_rw -p app_core < migrations/20260220000000_phase1_order_idempotency.sql`
(If columns or index already exist, ignore duplicate errors for those statements.)

## Created
- `migrations/20260220000000_phase1_order_idempotency.sql` — paypal_webhook_events, orders columns, unique ptero_server_id
- `api/services/OrderService.js` — order state machine, idempotent transitions
- `api/jobs/reconcile-provisioning.js` — cron job (every 2 min), retry with backoff
- `api/middleware/requestId.js` — request correlation ID
- `api/middleware/rateLimit.js` — rate limit presets (auth, public, webhook)
- `api/lib/logger.js` — pino logger, redact secrets
- `api/lib/env.js` — envalid startup validation, fail fast
- `api/lib/paypalWebhookVerify.js` — PayPal webhook signature verification
- `api/routes/ops.js` — GET /ops/summary
- `docs/production-hardening.md` — order state machine, idempotency, retry/reconcile, staging validation
- `docs/deploy-vps.md` — VPS roles, PM2/systemd, TLS, firewall, backup
- `docs/incident-playbook.md` — 5 incidents + response steps

## Modified
- `api/package.json` — add pino, pino-http, node-cron, envalid, express-rate-limit
- `api/server.js` — env validation, pino, requestId, /ready, ops routes, cron, rate limits
- `api/routes/paypal.js` — OrderService, idempotent webhook (paypal_webhook_events), signature verify
- `api/routes/servers.js` — provisionServer idempotency guard, attempt columns, OrderService
- `api/utils/mysql.js` — updateOrderStatus extended for provision_attempt_count, last_provision_attempt_at, last_provision_error

## Suggested commit messages (small commits)
1. `feat(phase1): add migration paypal_webhook_events and orders retry columns`
2. `feat(phase1): add OrderService and idempotent provisioning guard`
3. `feat(phase1): idempotent PayPal webhook and finalize-order retry-safe`
4. `feat(phase1): reconcile cron job every 2 min with backoff`
5. `feat(phase1): pino, requestId, /ready, /ops/summary, rate limits, env validation`
6. `docs(phase1): production-hardening, deploy-vps, incident-playbook`
7. `chore(phase1): gap checks – logging, reconcile resilience, ops docs`
---

## Gap checks applied (pre–RAM upgrade)
- **PayPal:** Removed duplicate `router.post('/webhook')` (dead code; webhook is mounted in server.js). Finalize and create-subscription errors now use `req.log` instead of `console.error`.
- **Reconcile job:** If Phase 1 migration not run (`ER_BAD_FIELD_ERROR` / unknown column), `findOrdersToReconcile()` returns `[]` instead of throwing so the server stays up.
- **Servers:** Provision success/error in `provisionServer()` use structured `logger.info`/`logger.error` (order_id, ptero_server_id, etc.). Provision API route uses `req.log` for errors.
- **Ops:** `lastWebhookReceivedAt` handles Date from MySQL correctly; doc note that `/ops/summary` is unauthenticated (restrict in production).
- **Docs:** `deploy-vps.md` now has an “Ops and monitoring” section (health, ready, ops/summary + auth note).
