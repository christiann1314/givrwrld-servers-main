import pool from '../config/database.js';
import { getDecryptedSecret } from '../utils/mysql.js';
import {
  getPayPalAccessToken,
  getSubscription,
} from '../services/paypal.js';
import {
  getOrder,
  transitionToPaid,
  canProvision,
  shouldRetryProvision,
} from '../services/OrderService.js';
import { enqueueProvisionJob } from '../queues/provisionQueue.js';

const SANDBOX = process.env.PAYPAL_SANDBOX !== 'false';

async function getPaypalCredentials() {
  const aesKey = process.env.AES_KEY;
  const clientId =
    process.env.PAYPAL_CLIENT_ID ||
    (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_ID', aesKey) : null);
  const clientSecret =
    process.env.PAYPAL_CLIENT_SECRET ||
    (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_SECRET', aesKey) : null);
  return { clientId, clientSecret };
}

/**
 * Candidate orders:
 *  - game orders with a paypal_subscription_id
 *  - status in pending/paid/provisioning/error/failed (i.e. not canceled or fully provisioned)
 */
export async function findSubscriptionsToReconcile() {
  const [rows] = await pool.execute(
    `SELECT id, paypal_subscription_id
     FROM orders
     WHERE item_type = 'game'
       AND paypal_subscription_id IS NOT NULL
       AND status IN ('pending', 'paid', 'provisioning', 'error', 'failed')
     ORDER BY created_at ASC
     LIMIT 200`,
  );
  return rows;
}

/**
 * Reconcile subscriptions by querying PayPal for their current status.
 * When a subscription is ACTIVE, ensure:
 *  - order is transitioned to paid
 *  - paypal_subscriptions row is ACTIVE
 *  - provisioning is enqueued when appropriate (respecting backoff).
 */
export async function runReconcileSubscriptionsPass(log = console) {
  const candidates = await findSubscriptionsToReconcile();
  if (!candidates.length) {
    return 0;
  }

  const { clientId, clientSecret } = await getPaypalCredentials();
  if (!clientId || !clientSecret) {
    log.warn?.('ReconcileSubscriptions: missing PayPal credentials; skipping pass');
    return 0;
  }

  const accessToken = await getPayPalAccessToken(clientId, clientSecret, SANDBOX);

  for (const row of candidates) {
    const orderId = row.id;
    const subId = row.paypal_subscription_id;
    try {
      const sub = await getSubscription(accessToken, subId, SANDBOX);
      const remoteStatus = String(sub?.status || '').toUpperCase();
      const payerId = sub?.subscriber?.payer_id || null;

      if (remoteStatus === 'ACTIVE') {
        await transitionToPaid(orderId, subId, payerId);

        await pool.execute(
          `INSERT INTO paypal_subscriptions (order_id, paypal_sub_id, status, payer_id, current_period_end, created_at, updated_at)
           VALUES (?, ?, 'ACTIVE', ?, NULL, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             status = 'ACTIVE',
             payer_id = VALUES(payer_id),
             updated_at = NOW()`,
          [orderId, subId, payerId],
        );

        const order = await getOrder(orderId);
        if (order && canProvision(order) && shouldRetryProvision(order)) {
          await enqueueProvisionJob(orderId, 'reconcile-subscriptions');
          log.info?.({ order_id: orderId }, 'ReconcileSubscriptions: provision job enqueued');
        }
      } else {
        log.info?.({ order_id: orderId, remote_status: remoteStatus }, 'ReconcileSubscriptions: remote status');
      }
    } catch (err) {
      log.error?.(
        { order_id: orderId, err: err?.message || String(err) },
        'ReconcileSubscriptions: failed',
      );
    }
  }

  return candidates.length;
}

