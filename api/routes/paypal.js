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
import { updateOrderStatus } from '../utils/mysql.js';

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
    console.error('PayPal create-subscription error:', error);
    res.status(500).json({
      error: 'Failed to create subscription',
      message: error.message,
    });
  }
});

/**
 * PayPal webhook handler (requires raw body - mount before express.json)
 */
async function handlePayPalWebhook(req, res) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body);
    const eventType = body?.event_type;

    if (!eventType) {
      return res.status(400).json({ error: 'Missing event_type' });
    }

    const eventId = body?.id || body?.event_id;
    if (eventId) {
      try {
        await pool.execute(
          `INSERT INTO paypal_events_log (event_id, event_type, payload, received_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
          [eventId, eventType, JSON.stringify(body)]
        );
      } catch (logErr) {
        console.warn('Failed to log PayPal event:', logErr);
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

      await pool.execute(
        `UPDATE orders 
         SET status = 'paid',
             paypal_subscription_id = ?,
             paypal_payer_id = ?
         WHERE id = ? AND status = 'pending'`,
        [subscriptionId, payerId || null, orderId]
      );

      await pool.execute(
        `INSERT INTO paypal_subscriptions (order_id, paypal_sub_id, status, payer_id, current_period_end, created_at, updated_at)
         VALUES (?, ?, 'ACTIVE', ?, NULL, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           status = 'ACTIVE',
           payer_id = VALUES(payer_id),
           updated_at = NOW()`,
        [orderId, subscriptionId, payerId]
      );

      const [rows] = await pool.execute(
        `SELECT item_type FROM orders WHERE id = ?`,
        [orderId]
      );
      const itemType = rows?.[0]?.item_type || 'game';

      if (itemType === 'game') {
        try {
          await provisionServer(orderId);
          console.log('✅ Server provisioning completed for order:', orderId);
        } catch (provErr) {
          console.error('Failed to provision server:', provErr);
          await updateOrderStatus(orderId, 'error', null, null, provErr.message || 'Failed to provision server');
        }
      }

      console.log('Order activated:', orderId);
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
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Webhook router: mount at /api/paypal/webhook BEFORE body parser (matches path '')
const paypalWebhookRouter = express.Router();
paypalWebhookRouter.post('/', express.raw({ type: 'application/json' }), handlePayPalWebhook);

router.post('/webhook', express.raw({ type: 'application/json' }), handlePayPalWebhook);

/**
 * POST /api/paypal/finalize-order
 * Local/dev fallback when webhook delivery is unavailable.
 * Confirms subscription status with PayPal API and triggers provisioning.
 */
router.post('/finalize-order', authenticate, async (req, res) => {
  try {
    const { order_id } = req.body || {};
    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required' });
    }

    const [rows] = await pool.execute(
      `SELECT id, user_id, item_type, status, paypal_subscription_id
       FROM orders
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [order_id, req.userId]
    );

    const order = rows?.[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'provisioned') {
      return res.json({ success: true, status: 'provisioned', message: 'Order already provisioned' });
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

    await pool.execute(
      `UPDATE orders
       SET status = CASE
             WHEN status IN ('pending', 'error', 'canceled') THEN 'paid'
             ELSE status
           END,
           paypal_payer_id = COALESCE(?, paypal_payer_id)
       WHERE id = ?`,
      [payerId, order.id]
    );

    await pool.execute(
      `INSERT INTO paypal_subscriptions (order_id, paypal_sub_id, status, payer_id, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'ACTIVE', ?, NULL, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         status = 'ACTIVE',
         payer_id = VALUES(payer_id),
         updated_at = NOW()`,
      [order.id, order.paypal_subscription_id, payerId]
    );

    if (order.item_type === 'game') {
      try {
        await provisionServer(order.id);
      } catch (provErr) {
        await updateOrderStatus(order.id, 'error', null, null, provErr.message || 'Failed to provision server');
        throw provErr;
      }
    }

    const [updatedRows] = await pool.execute(
      `SELECT status, ptero_server_id, ptero_identifier, error_message
       FROM orders
       WHERE id = ?
       LIMIT 1`,
      [order.id]
    );

    return res.json({
      success: true,
      order_id: order.id,
      subscription_status: subStatus,
      ...(updatedRows?.[0] || {}),
    });
  } catch (error) {
    console.error('Finalize order error:', error);
    return res.status(500).json({ error: error.message || 'Failed to finalize order' });
  }
});

export default router;
export { paypalWebhookRouter };
