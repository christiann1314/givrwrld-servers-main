// Checkout Session Route
// Uses PayPal for recurring subscriptions (primary payment system)
import express from 'express';
import { getPlan } from '../utils/mysql.js';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import {
  getPayPalAccessToken,
  createSubscription,
} from '../services/paypal.js';
import { getDecryptedSecret } from '../utils/mysql.js';
import {
  getBillingTermSpec,
  getPlanPriceForTerm,
  ensurePayPalPlan,
} from '../services/paypalPlans.js';
import { recordOrderCreated } from '../lib/metrics.js';

const router = express.Router();
const SANDBOX = process.env.PAYPAL_SANDBOX !== 'false';

const ADDON_PLAN_CATALOG = [
  {
    id: 'addon-enhanced-backup-retention',
    display_name: 'Enhanced Backup Retention',
    description: 'Extended backup windows with safer restore points.',
    price: 3.99,
  },
  {
    id: 'addon-discord-integration',
    display_name: 'Discord Integration',
    description: 'Send server activity and alerts to your community.',
    price: 2.99,
  },
  {
    id: 'addon-pro-analytics',
    display_name: 'Pro Analytics',
    description: 'Executive-level visibility into usage and performance trends.',
    price: 5.99,
  },
  {
    id: 'addon-additional-ssd-50gb',
    display_name: 'Additional SSD (+50GB)',
    description: 'Add 50GB of high-speed NVMe storage.',
    price: 3.99,
  },
  {
    id: 'addon-cpu-boost-1vcpu',
    display_name: 'CPU Boost (+1 vCPU)',
    description: 'Add one dedicated vCPU for peak workloads.',
    price: 5.99,
  },
  {
    id: 'addon-priority-resource-allocation',
    display_name: 'Priority Resource Allocation',
    description: 'Higher scheduler priority during contention.',
    price: 4.99,
  },
  {
    id: 'addon-extra-database',
    display_name: 'Extra Database',
    description: 'Provision one additional managed database.',
    price: 2.49,
  },
  {
    id: 'addon-extra-port-allocation',
    display_name: 'Extra Port Allocation',
    description: 'Add one more external port assignment.',
    price: 1.99,
  },
];

async function ensureAddonPlansSeeded() {
  const [termCols] = await pool.execute(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'plans'
       AND column_name IN ('price_quarterly', 'price_semiannual', 'price_yearly')`
  );
  const hasQuarterly = termCols.some((r) => r.column_name === 'price_quarterly');
  const hasSemiannual = termCols.some((r) => r.column_name === 'price_semiannual');
  const hasYearly = termCols.some((r) => r.column_name === 'price_yearly');

  const values = [];
  const placeholders = [];
  for (const addon of ADDON_PLAN_CATALOG) {
    const row = ['?', '?', '?', '?', '?', '?', '?'];
    values.push(
      addon.id,
      'vps',
      'addons',
      0,
      0,
      0,
      addon.price
    );
    if (hasQuarterly) {
      row.push('?');
      values.push(Number((addon.price * 3).toFixed(2)));
    }
    if (hasSemiannual) {
      row.push('?');
      values.push(Number((addon.price * 6).toFixed(2)));
    }
    if (hasYearly) {
      row.push('?');
      values.push(Number((addon.price * 12).toFixed(2)));
    }
    row.push('?', '?', 'NOW()', 'NOW()');
    values.push(addon.display_name, addon.description);
    placeholders.push(`(${row.join(', ')})`);
  }

  if (placeholders.length === 0) return;

  const columns = [
    'id',
    'item_type',
    'game',
    'ram_gb',
    'vcores',
    'ssd_gb',
    'price_monthly',
    ...(hasQuarterly ? ['price_quarterly'] : []),
    ...(hasSemiannual ? ['price_semiannual'] : []),
    ...(hasYearly ? ['price_yearly'] : []),
    'display_name',
    'description',
    'created_at',
    'updated_at',
  ];

  await pool.execute(
    `INSERT INTO plans
      (${columns.join(', ')})
     VALUES ${placeholders.join(', ')}
     ON DUPLICATE KEY UPDATE
       item_type = VALUES(item_type),
       game = VALUES(game),
       price_monthly = VALUES(price_monthly),
       ${hasQuarterly ? 'price_quarterly = VALUES(price_quarterly),' : ''}
       ${hasSemiannual ? 'price_semiannual = VALUES(price_semiannual),' : ''}
       ${hasYearly ? 'price_yearly = VALUES(price_yearly),' : ''}
       display_name = VALUES(display_name),
       description = VALUES(description),
       is_active = 1,
       updated_at = NOW()`,
    values
  );
}

function validateAddonPrice(plan) {
  const expected = ADDON_PLAN_CATALOG.find((addon) => addon.id === plan?.id);
  if (!expected) return;
  const current = Number(plan?.price_monthly ?? 0);
  if (!Number.isFinite(current) || Number(current.toFixed(2)) !== Number(expected.price.toFixed(2))) {
    throw new Error(`Addon price mismatch for "${plan.id}". Expected ${expected.price.toFixed(2)}.`);
  }
}

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
 * POST /api/checkout/create-session
 * Create PayPal subscription and return approval URL for recurring payment
 */
router.post('/create-session', authenticate, async (req, res) => {
  try {
    const { plan_id, item_type, term, region, server_name } = req.body;

    if (!plan_id || !item_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'plan_id and item_type are required',
      });
    }

    await ensureAddonPlansSeeded();

    const plan = await getPlan(plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (plan.item_type !== item_type) {
      return res.status(400).json({
        error: 'Plan item type mismatch',
        message: `Plan is for ${plan.item_type}, but request is for ${item_type}`,
      });
    }

    if (!plan.is_active) {
      return res.status(400).json({
        error: 'Plan is inactive',
        message: 'This plan is no longer available',
      });
    }

    if (String(plan.item_type) === 'vps' && String(plan.game || '').toLowerCase() === 'addons') {
      validateAddonPrice(plan);
    }

    const orderId = uuidv4();
    const serverName = server_name || `${plan_id.split('-')[0]}-${Date.now()}`;
    const regionCode = region || 'us-east';
    const billingTerm = term || 'monthly';
    const paypalPlanId = await ensurePayPalPlan(plan, billingTerm);

    await pool.execute(
      `INSERT INTO orders (id, user_id, item_type, plan_id, term, region, server_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [orderId, req.userId, item_type, plan_id, billingTerm, regionCode, serverName]
    );
    recordOrderCreated();


    const aesKey = process.env.AES_KEY;
    const clientId =
      process.env.PAYPAL_CLIENT_ID ||
      (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_ID', aesKey) : null);
    const clientSecret =
      process.env.PAYPAL_CLIENT_SECRET ||
      (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_SECRET', aesKey) : null) ||
      null;

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

    await pool.execute(`UPDATE orders SET paypal_subscription_id = ? WHERE id = ?`, [result.subscriptionId, orderId]);

    res.json({
      success: true,
      sessionId: result.subscriptionId,
      url: result.approvalUrl,
      billing_term: getBillingTermSpec(billingTerm).term,
      billed_price: getPlanPriceForTerm(plan, billingTerm).price,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
});

export default router;


