# Incident Playbook

Five common incidents and step-by-step response.

---

## 1. API returns 503 or /ready fails

**Symptoms:** Load balancer or health checks fail; `GET /ready` returns 503.

**Steps:**

1. Check `GET /ready` response body: `checks.db`, `checks.env`, `checks.panel`.
2. If **DB down**: Restart MariaDB; check disk and `systemctl status mariadb` (or Docker). Fix connectivity and env (`MYSQL_*`).
3. If **env missing**: Ensure `MYSQL_PASSWORD`, `JWT_SECRET` (and in production `PAYPAL_*`, `PANEL_*`) are set in the process environment (e.g. `.env` or systemd `EnvironmentFile`). Restart API.
4. If **panel unreachable**: Optional for readiness. Fix Panel URL/key or network; restart API if needed.
5. Restart API (PM2: `pm2 restart givrwrld-api` or systemd: `systemctl restart givrwrld-api`). On VPS, agents run via PM2 too; restart with `pm2 restart givrwrld-agents` only if needed.

---

## 2. Orders stuck in “paid” or “provisioning” (no server)

**Symptoms:** Customers paid but no server in dashboard; `GET /ops/summary` shows `stuckOrdersCount` > 0.

**Steps:**

1. Open `GET /ops/summary` and note `ordersByStatus` and `stuckOrdersCount`.
2. Check API logs for provisioning errors (search for `order_id`, `Provisioning error`, `Reconcile`).
3. Verify Panel and Wings: Panel URL and app key in env; node has free allocations. Test Panel API from the API host: `curl -H "Authorization: Bearer $PANEL_APP_KEY" $PANEL_URL/api/application/nodes`.
4. If Panel was down and is now fixed, wait for the next reconcile run (every 2 minutes) or call `POST /api/paypal/finalize-order` (with auth) for the affected `order_id` to retry once.
5. If an order is permanently failed, set status to `failed` and `last_provision_error` in DB if needed; inform customer and refund/cancel if appropriate.

---

## 3. Duplicate servers or double provisioning

**Symptoms:** One order has two Pterodactyl servers or double charge.

**Steps:**

1. Confirm idempotency is in place: `paypal_webhook_events` has one row per `event_id`; `provisionServer` checks `canProvision(order)` (no second server if `ptero_server_id` or status `provisioned`).
2. If a duplicate already occurred: In DB, ensure the order has a single `ptero_server_id` and status `provisioned`; delete or mark the extra server in Panel if created. Do not run provision again for that order.
3. Check logs for the same `paypal_event_id` or `order_id` processed more than once; if so, ensure webhook handler uses `paypal_webhook_events` and returns 200 on duplicate `event_id`.

---

## 4. PayPal webhook signature verification failed

**Symptoms:** Logs show “Webhook signature verification failed” or webhook returns 401.

**Steps:**

1. Confirm `PAYPAL_WEBHOOK_ID` is set to the webhook ID shown in the PayPal Developer dashboard for this app.
2. Ensure the webhook URL is correct and that the request body is the **raw** body (middleware for `/api/paypal/webhook` must use `express.raw()` so body is not parsed before verification).
3. In sandbox vs live: use the correct credentials and webhook ID for that environment. Retry sending a test webhook from the dashboard.
4. If you must temporarily disable verification (not recommended in production), remove or do not set `PAYPAL_WEBHOOK_ID`; document and re-enable as soon as possible.

---

## 5. High CPU or memory / API slow or OOM

**Symptoms:** API process high CPU or memory; timeouts or 502.

**Steps:**

1. Check process memory and CPU (e.g. `pm2 monit` or `top`). Restart API to clear leaks: `pm2 restart givrwrld-api`.
2. Review recent deployments and cron: reconcile job runs every 2 minutes; if many stuck orders, it may run many provision attempts. Reduce load by fixing Panel/allocations so orders complete.
3. Check DB: slow queries, connection pool exhaustion. Tune `connectionLimit` in `api/config/database.js` if needed; add indexes for orders by status and `last_provision_attempt_at` if used heavily.
4. Scale: move to a larger VPS or add a second API instance behind a load balancer (ensure shared DB and single cron leader or disable cron on replicas).
