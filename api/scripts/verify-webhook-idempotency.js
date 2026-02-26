/**
 * Verify webhook idempotency: send same PayPal event twice; second must return 200 and not duplicate work.
 * Run from repo root: node api/scripts/verify-webhook-idempotency.js
 * Requires: API running, Phase 1 migration (paypal_webhook_events table).
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const WEBHOOK_URL = `${API_BASE}/api/paypal/webhook`;

const fakeEventId = 'verify-idempotency-' + Date.now();
const body = {
  id: fakeEventId,
  event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
  resource: { id: 'sub-fake', custom_id: null },
};

async function main() {
  console.log('Webhook idempotency check: send same event twice to', WEBHOOK_URL);
  const res1 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const res2 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ok1 = res1.status === 200;
  const ok2 = res2.status === 200;
  console.log('First request:', res1.status, ok1 ? 'OK' : 'FAIL');
  console.log('Second request:', res2.status, ok2 ? 'OK (idempotent)' : 'FAIL');
  if (ok1 && ok2) {
    console.log('Pass: both returned 200. Check DB: SELECT * FROM paypal_webhook_events WHERE event_id = ? should be 1 row.', fakeEventId);
    process.exit(0);
  }
  console.log('Fail: second request must return 200 for idempotency.');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
