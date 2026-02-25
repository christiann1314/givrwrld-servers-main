// PayPal Checkout & Webhook Routes
import express from 'express';
import pool from '../config/database.js';
import { getPlan, getDecryptedSecret } from '../utils/mysql.js';
import { authenticate } from '../middleware/auth.js';
import {
  getPayPalAccessToken,
  createProduct,
  createPlan,
  createSubscription,
  getSubscription,
} from '../services/paypal.js';
import { v4 as uuidv4 } from 'uuid';
import { provisionServer } from './servers.js';
import {
  getOrder,
  transitionToPaid,
  canProvision,
} from '../services/OrderService.js';
import { verifyWebhookSignature, getVerifyOptsFromRequest } from '../lib/paypalWebhookVerify.js';

const router = express.Router();

const SANDBOX = process.env.PAYPAL_SANDBOX !== 'false';

function isAllowedReturnBase(url) {
  if (typeof url !== 'string' || !url) return false;
  if (url.startsWith('https://')) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

function resolveReturnBase(req) {
  const requestedOrigin = req.headers.origin || '';
  const frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() || '';
  const publicSiteUrl = process.env.PUBLIC_SITE_URL || process.env.PAYPAL_RETURN_BASE_URL || '';
  return [requestedOrigin, publicSiteUrl, frontendUrl, 'https://givrwrldservers.com']
    .find((u) => isAllowedReturnBase(u));
}

/**
 * Ensure plan has a PayPal plan ID (create product + plan if missing)
 */
async function ensurePayPalPlan(plan) {
  if (plan.paypal_plan_id) {
    return plan.paypal_plan_id;
  }

  const aesKey = process.env.AES_KEY;
  const clientId = (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_ID', aesKey) : null)
    || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_SECRET', aesKey) : null)
    || process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const accessToken = await getPayPalAccessToken(clientId, clientSecret, SANDBOX);

  const productId = await createProduct(accessToken, {
    name: `${plan.display_name || plan.id} - Game Server`,
    description: plan.description || `Subscription for ${plan.game} server`,
  }, SANDBOX);

  const intervalCount = 1;
  const interval = 'MONTH';
  const price = parseFloat(plan.price_monthly);

  const paypalPlanId = await createPlan(accessToken, {
    productId,
    name: `${plan.display_name || plan.id} (Monthly)`,
    price,
    currency: 'USD',
    interval,
    intervalCount,
  }, SANDBOX);

  await pool.execute(
    `UPDATE plans SET paypal_plan_id = ? WHERE id = ?`,
    [paypalPlanId, plan.id]
  );

  return paypalPlanId;
}

/**
 * POST /api/paypal/create-subscription
 * Create PayPal subscription and return approval URL
 */
router.post('/create-subscription', authenticate, async (req, res) => {
  try {
    const { plan_id, item_type, term, region, server_name } = req.body;

    if (!plan_id || !item_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'plan_id and item_type are required',
      });
    }

    const plan = await getPlan(plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (plan.item_type !== item_type) {
      return res.status(400).json({
        error: 'Plan item type mismatch',
      });
    }

    if (!plan.is_active) {
      return res.status(400).json({
        error: 'Plan is inactive',
      });
    }

    const paypalPlanId = await ensurePayPalPlan(plan);

    const orderId = uuidv4();
    const serverName = server_name || `${plan_id.split('-')[0]}-${Date.now()}`;
    const regionCode = region || 'us-east';
    const billingTerm = term || 'monthly';

    await pool.execute(
      `INSERT INTO orders (id, user_id, item_type, plan_id, term, region, server_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [orderId, req.userId, item_type, plan_id, billingTerm, regionCode, serverName]
    );

    const aesKey = process.env.AES_KEY;
    const clientId = (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_ID', aesKey) : null)
      || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_SECRET', aesKey) : null)
      || process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const accessToken = await getPayPalAccessToken(clientId, clientSecret, SANDBOX);

    const baseUrl = resolveReturnBase(req);
    const returnUrl = `${baseUrl}/success?order_id=${orderId}`;
    const cancelUrl = `${baseUrl}/deploy?checkout=canceled&order_id=${orderId}`;

    const result = await createSubscription(
      accessToken,
      paypalPlanId,
      returnUrl,
      cancelUrl,
      orderId,
      SANDBOX
    );

    await pool.execute(
      `UPDATE orders SET paypal_subscription_id = ? WHERE id = ?`,
      [result.subscriptionId, orderId]
    );

    res.json({
      success: true,
      subscriptionId: result.subscriptionId,
      url: result.approvalUrl,
      orderId,
    });
  } catch (error) {
    req.log?.error({ err: error }, 'PayPal create-subscription error');
    res.status(500).json({
      error: 'Failed to create subscription',
      message: error.message,
    });
  }
});

/**
 * PayPal webhook handler (requires raw body - mount before express.json).
 * Idempotent: paypal_webhook_events.event_id primary key; if already processed, return 200 and do nothing.
 */
async function handlePayPalWebhook(req, res) {
  let body;
  try {
    const raw = req.body;
    body = Buffer.isBuffer(raw) ? JSON.parse(raw.toString('utf8')) : (typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventType = body?.event_type;
  if (!eventType) {
    return res.status(400).json({ error: 'Missing event_type' });
  }

  const eventId = body?.id || body?.event_id;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing event id' });
  }

  // Idempotency: if we already processed this event_id, return 200 and skip
  try {
    await pool.execute(
      `INSERT INTO paypal_webhook_events (event_id, received_at, raw_type, order_id)
       VALUES (?, NOW(), ?, NULL)`,
      [eventId, eventType]
    );
  } catch (insertErr) {
    if (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062) {
      return res.status(200).send();
    }
    throw insertErr;
  }

  // Optional: verify webhook signature when PAYPAL_WEBHOOK_ID is set
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (webhookId) {
    const aesKey = process.env.AES_KEY;
    const clientId = (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_ID', aesKey) : null) || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_SECRET', aesKey) : null) || process.env.PAYPAL_CLIENT_SECRET;
    if (clientId && clientSecret) {
      const accessToken = await getPayPalAccessToken(clientId, clientSecret, SANDBOX);
      const opts = getVerifyOptsFromRequest(req, webhookId);
      const valid = await verifyWebhookSignature(opts, accessToken, SANDBOX);
      if (!valid) {
        return res.status(401).json({ error: 'Webhook signature verification failed' });
      }
    }
  }

  if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    const resource = body?.resource;
    const subscriptionId = resource?.id;
    const customId = resource?.custom_id || resource?.plan?.custom_id;
    const payerId = resource?.subscriber?.payer_id;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscription id' });
    }

    let orderId = customId || null;
    if (!orderId) {
      const [pendingRows] = await pool.execute(
        `SELECT id FROM orders WHERE paypal_subscription_id = ? ORDER BY created_at DESC LIMIT 1`,
        [subscriptionId]
      );
      orderId = pendingRows?.[0]?.id || null;
    }
    if (!orderId) {
      return res.status(404).json({ error: 'Order not found for subscription' });
    }

    await transitionToPaid(orderId, subscriptionId, payerId || null);

    await pool.execute(
      `INSERT INTO paypal_subscriptions (order_id, paypal_sub_id, status, payer_id, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'ACTIVE', ?, NULL, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
         status = 'ACTIVE',
         payer_id = VALUES(payer_id),
         updated_at = NOW()`,
      [orderId, subscriptionId, payerId]
    );

    const order = await getOrder(orderId);
    const itemType = order?.item_type || 'game';

    if (itemType === 'game' && canProvision(order)) {
      try {
        await provisionServer(orderId);
      } catch (provErr) {
        // provisionServer records failure and transitions to failed; log only
        req.log?.child({ order_id: orderId }).error({ err: provErr }, 'Webhook provisioning failed');
      }
    }

    try {
      await pool.execute(
        `UPDATE paypal_webhook_events SET order_id = ? WHERE event_id = ?`,
        [orderId, eventId]
      );
    } catch {
      // optional
    }
  }

  if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED' || eventType === 'BILLING.SUBSCRIPTION.EXPIRED') {
    const resource = body?.resource;
    const subscriptionId = resource?.id;
    if (subscriptionId) {
      await pool.execute(
        `UPDATE orders SET status = 'canceled' WHERE paypal_subscription_id = ?`,
        [subscriptionId]
      );
      await pool.execute(
        `UPDATE paypal_subscriptions SET status = 'CANCELED', updated_at = NOW() WHERE paypal_sub_id = ?`,
        [subscriptionId]
      );
    }
  }

  if (eventType === 'PAYMENT.SALE.COMPLETED') {
    const resource = body?.resource;
    const subscriptionId = resource?.billing_agreement_id;
    if (subscriptionId) {
      await pool.execute(
        `UPDATE paypal_subscriptions 
         SET current_period_end = COALESCE(FROM_UNIXTIME(?/1000), current_period_end), updated_at = NOW() 
         WHERE paypal_sub_id = ?`,
        [resource?.update_time || 0, subscriptionId]
      );
    }
  }

  res.status(200).send();
}

// Webhook router: mount at /api/paypal/webhook BEFORE body parser (matches path '')
const paypalWebhookRouter = express.Router();
paypalWebhookRouter.post('/', express.raw({ type: 'application/json' }), handlePayPalWebhook);
// Note: Do not add router.post('/webhook') here — webhook is mounted in server.js so raw body is preserved.

/**
 * POST /api/paypal/finalize-order
 * Local/dev fallback when webhook delivery is unavailable.
 * Retry-safe: calling multiple times never duplicates provisioning.
 */
router.post('/finalize-order', authenticate, async (req, res) => {
  try {
    const { order_id } = req.body || {};
    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required' });
    }

    const order = await getOrder(order_id);
    if (!order || order.user_id !== req.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'provisioned' && order.ptero_server_id != null) {
      return res.json({ success: true, status: 'provisioned', message: 'Order already provisioned', ptero_server_id: order.ptero_server_id, ptero_identifier: order.ptero_identifier });
    }

    if (!order.paypal_subscription_id) {
      return res.status(400).json({ error: 'Order missing paypal_subscription_id' });
    }

    const aesKey = process.env.AES_KEY;
    const clientId = (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_ID', aesKey) : null)
      || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_SECRET', aesKey) : null)
      || process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const accessToken = await getPayPalAccessToken(clientId, clientSecret, SANDBOX);
    const subscription = await getSubscription(accessToken, order.paypal_subscription_id, SANDBOX);
    const subStatus = String(subscription?.status || '').toUpperCase();
    const payerId = subscription?.subscriber?.payer_id || null;

    if (subStatus !== 'ACTIVE') {
      return res.status(409).json({
        success: false,
        status: order.status,
        message: `Subscription is ${subStatus || 'UNKNOWN'}. Waiting for activation.`,
      });
    }

    await transitionToPaid(order_id, order.paypal_subscription_id, payerId);

    await pool.execute(
      `INSERT INTO paypal_subscriptions (order_id, paypal_sub_id, status, payer_id, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'ACTIVE', ?, NULL, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         status = 'ACTIVE',
         payer_id = VALUES(payer_id),
         updated_at = NOW()`,
      [order.id, order.paypal_subscription_id, payerId]
    );

    const refreshed = await getOrder(order_id);
    if (refreshed?.item_type === 'game' && canProvision(refreshed)) {
      try {
        await provisionServer(order.id);
      } catch (provErr) {
        return res.status(500).json({ error: provErr.message || 'Failed to provision server' });
      }
    }

    const updated = await getOrder(order_id);
    return res.json({
      success: true,
      order_id: order.id,
      subscription_status: subStatus,
      status: updated?.status,
      ptero_server_id: updated?.ptero_server_id ?? null,
      ptero_identifier: updated?.ptero_identifier ?? null,
      error_message: updated?.error_message ?? null,
    });
  } catch (error) {
    req.log?.error({ err: error, order_id: req.body?.order_id }, 'Finalize order error');
    return res.status(500).json({ error: error.message || 'Failed to finalize order' });
  }
});

export default router;
export { paypalWebhookRouter };
