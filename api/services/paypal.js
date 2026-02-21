/**
 * PayPal Subscriptions Service
 * Uses PayPal REST API for recurring subscription billing
 * https://developer.paypal.com/docs/api/subscriptions/v1/
 */

const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE = 'https://api-m.paypal.com';

/**
 * Get OAuth access token from PayPal
 */
export async function getPayPalAccessToken(clientId, clientSecret, sandbox = true) {
  const base = sandbox ? SANDBOX_BASE : LIVE_BASE;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || `PayPal auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Create a Catalog Product (required before creating a plan)
 */
export async function createProduct(accessToken, product, sandbox = true) {
  const base = sandbox ? SANDBOX_BASE : LIVE_BASE;
  const res = await fetch(`${base}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: product.name || 'Game Server',
      description: product.description || 'Recurring subscription',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.details?.[0]?.description || 'Failed to create product');
  }

  const data = await res.json();
  return data.id;
}

/**
 * Create a Billing Plan for recurring subscription
 * @param {Object} opts - { productId, name, price, currency, interval ('MONTH'|'DAY'|'WEEK'|'YEAR'), intervalCount }
 */
export async function createPlan(accessToken, opts, sandbox = true) {
  const base = sandbox ? SANDBOX_BASE : LIVE_BASE;
  const {
    productId,
    name,
    price,
    currency = 'USD',
    interval = 'MONTH',
    intervalCount = 1,
  } = opts;

  const billingCycle = {
    frequency: { interval_unit: interval, interval_count: intervalCount },
    tenure_type: 'REGULAR',
    sequence: 1,
    total_cycles: 0, // 0 = infinite
    pricing_scheme: {
      fixed_price: {
        value: String(price),
        currency_code: currency,
      },
    },
  };

  const body = {
    product_id: productId,
    name,
    description: name,
    status: 'ACTIVE',
    billing_cycles: [billingCycle],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: 'CANCEL',
      payment_failure_threshold: 3,
    },
  };

  const res = await fetch(`${base}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.details?.[0]?.description || 'Failed to create plan');
  }

  const data = await res.json();
  return data.id;
}

/**
 * Create a Subscription - returns approval URL for user to complete payment
 */
export async function createSubscription(accessToken, planId, returnUrl, cancelUrl, customId, sandbox = true) {
  const base = sandbox ? SANDBOX_BASE : LIVE_BASE;
  const appUrl = returnUrl.replace(/\/success.*$/, '');

  const body = {
    plan_id: planId,
    application_context: {
      brand_name: 'GIVRwrld',
      user_action: 'SUBSCRIBE_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl || `${appUrl}/checkout/cancel`,
    },
  };

  const res = await fetch(`${base}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.details?.[0]?.description || err.details?.[0]?.issue;
    const debugId = err.debug_id ? ` (debug_id: ${err.debug_id})` : '';
    throw new Error((detail || err.message || 'Failed to create subscription') + debugId);
  }

  const data = await res.json();
  const approveLink = data.links?.find((l) => l.rel === 'approve');
  return {
    subscriptionId: data.id,
    status: data.status,
    approvalUrl: approveLink?.href,
  };
}

/**
 * Get subscription details
 */
export async function getSubscription(accessToken, subscriptionId, sandbox = true) {
  const base = sandbox ? SANDBOX_BASE : LIVE_BASE;
  const res = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to get subscription');
  }

  return res.json();
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(accessToken, subscriptionId, reason, sandbox = true) {
  const base = sandbox ? SANDBOX_BASE : LIVE_BASE;
  const res = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: reason || 'Customer requested cancellation' }),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to cancel subscription');
  }

  return true;
}
