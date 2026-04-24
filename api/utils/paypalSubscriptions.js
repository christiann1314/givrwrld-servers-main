/**
 * PayPal REST (Subscriptions v2) — no Stripe. Uses client credentials.
 * Env: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE=sandbox|live
 */

const SANDBOX = 'https://api-m.sandbox.paypal.com';
const LIVE = 'https://api-m.paypal.com';

let tokenCache = { token: null, expiresAt: 0 };

export function getPayPalBaseUrl() {
  return process.env.PAYPAL_MODE === 'live' ? LIVE : SANDBOX;
}

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error('PayPal is not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)');
  }
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  const base = getPayPalBaseUrl();
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayPal token error: ${text || res.statusText}`);
  }
  const data = JSON.parse(text);
  const expiresIn = Number(data.expires_in || 32400);
  tokenCache = {
    token: data.access_token,
    expiresAt: now + expiresIn * 1000,
  };
  return data.access_token;
}

async function paypalJson(path, init = {}) {
  const token = await getPayPalAccessToken();
  const base = getPayPalBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Invalid PayPal JSON');
  }
  if (!res.ok) {
    const msg = json.message || json.name || text || res.statusText;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return json;
}

/**
 * @param {{ planId: string, userId: string, email?: string, returnUrl: string, cancelUrl: string }} p
 */
export async function createBillingSubscription({ planId, userId, email, returnUrl, cancelUrl }) {
  const body = {
    plan_id: planId,
    custom_id: String(userId).slice(0, 127),
    application_context: {
      brand_name: process.env.PAYPAL_BRAND_NAME || 'GIVRwrld',
      locale: 'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      payment_method: {
        payer_selected: 'PAYPAL',
        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
      },
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };
  if (email) {
    body.subscriber = { email_address: String(email).slice(0, 254) };
  }
  return paypalJson('/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function findApproveLink(subscriptionResponse) {
  const links = subscriptionResponse?.links || [];
  const approve = links.find((l) => l && l.rel === 'approve' && l.href);
  return approve?.href || null;
}

export async function getBillingSubscription(subscriptionId) {
  return paypalJson(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'GET',
  });
}

/**
 * Verify webhook (recommended in production). Requires PAYPAL_WEBHOOK_ID from dashboard.
 */
export async function verifyWebhookSignature(headers, webhookEventBody) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn('[paypal] PAYPAL_WEBHOOK_ID unset — skipping webhook signature verification');
    return true;
  }
  const token = await getPayPalAccessToken();
  const base = getPayPalBaseUrl();
  const payload = {
    transmission_id: headers['paypal-transmission-id'],
    transmission_time: headers['paypal-transmission-time'],
    cert_url: headers['paypal-cert-url'],
    auth_algo: headers['paypal-auth-algo'],
    transmission_sig: headers['paypal-transmission-sig'],
    webhook_id: webhookId,
    webhook_event: webhookEventBody,
  };
  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.verification_status === 'SUCCESS';
}
