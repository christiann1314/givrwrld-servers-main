import pool from '../config/database.js';
import { getDecryptedSecret } from '../utils/mysql.js';
import {
  getPayPalAccessToken,
  createProduct,
  createPlan,
} from './paypal.js';

const SANDBOX = process.env.PAYPAL_SANDBOX !== 'false';

export function getBillingTermSpec(termRaw) {
  const term = String(termRaw || 'monthly').toLowerCase();
  switch (term) {
    case 'quarterly':
      return { term: 'quarterly', interval: 'MONTH', intervalCount: 3, priceField: 'price_quarterly' };
    case 'semiannual':
      return { term: 'semiannual', interval: 'MONTH', intervalCount: 6, priceField: 'price_semiannual' };
    case 'yearly':
      return { term: 'yearly', interval: 'YEAR', intervalCount: 1, priceField: 'price_yearly' };
    default:
      return { term: 'monthly', interval: 'MONTH', intervalCount: 1, priceField: 'price_monthly' };
  }
}

export function getPlanPriceForTerm(plan, termRaw) {
  const spec = getBillingTermSpec(termRaw);
  const raw = Number(plan?.[spec.priceField] ?? plan?.price_monthly ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) {
    throw new Error(`Invalid price for term "${spec.term}" on plan "${plan?.id}"`);
  }
  return { ...spec, price: raw };
}

export async function ensurePayPalPlanTermTable() {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS paypal_plan_terms (
      plan_id VARCHAR(191) NOT NULL,
      term VARCHAR(32) NOT NULL,
      sandbox_mode TINYINT(1) NOT NULL DEFAULT 1,
      paypal_product_id VARCHAR(64) NULL,
      paypal_plan_id VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (plan_id, term, sandbox_mode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

/**
 * Ensure plan has a PayPal plan ID for selected term.
 * Writes to paypal_plan_terms as the source of truth, and keeps plans.paypal_plan_id in sync for monthly.
 */
export async function ensurePayPalPlan(plan, term = 'monthly') {
  const termPrice = getPlanPriceForTerm(plan, term);

  // In local/dev, prefer .env PayPal credentials over encrypted DB secrets.
  const aesKey = process.env.AES_KEY;
  const clientId =
    process.env.PAYPAL_CLIENT_ID ||
    (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_ID', aesKey) : null);
  const clientSecret =
    process.env.PAYPAL_CLIENT_SECRET ||
    (aesKey ? await getDecryptedSecret('paypal', 'PAYPAL_CLIENT_SECRET', aesKey) : null);

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
  }

  const accessToken = await getPayPalAccessToken(clientId, clientSecret, SANDBOX);

  await ensurePayPalPlanTermTable();

  const [existing] = await pool.execute(
    `SELECT paypal_plan_id
     FROM paypal_plan_terms
     WHERE plan_id = ? AND term = ? AND sandbox_mode = ?
     LIMIT 1`,
    [plan.id, termPrice.term, SANDBOX ? 1 : 0],
  );
  if (existing?.[0]?.paypal_plan_id) {
    return existing[0].paypal_plan_id;
  }

  const [existingProduct] = await pool.execute(
    `SELECT paypal_product_id
     FROM paypal_plan_terms
     WHERE plan_id = ? AND sandbox_mode = ? AND paypal_product_id IS NOT NULL
     LIMIT 1`,
    [plan.id, SANDBOX ? 1 : 0],
  );

  const productId = existingProduct?.[0]?.paypal_product_id || await createProduct(
    accessToken,
    {
      name: `${plan.display_name || plan.id} - ${plan.game || 'Game'} Server`,
      description: plan.description || `Subscription for ${plan.game} server`,
    },
    SANDBOX,
  );

  const paypalPlanId = await createPlan(
    accessToken,
    {
      productId,
      name: `${plan.display_name || plan.id} (${termPrice.term})`,
      price: termPrice.price,
      currency: 'USD',
      interval: termPrice.interval,
      intervalCount: termPrice.intervalCount,
    },
    SANDBOX,
  );

  await pool.execute(
    `INSERT INTO paypal_plan_terms (plan_id, term, sandbox_mode, paypal_product_id, paypal_plan_id)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       paypal_product_id = VALUES(paypal_product_id),
       paypal_plan_id = VALUES(paypal_plan_id),
       updated_at = NOW()`,
    [plan.id, termPrice.term, SANDBOX ? 1 : 0, productId, paypalPlanId],
  );

  // Keep legacy column populated for monthly compatibility.
  if (termPrice.term === 'monthly') {
    await pool.execute('UPDATE plans SET paypal_plan_id = ? WHERE id = ?', [paypalPlanId, plan.id]);
  }
  return paypalPlanId;
}

