/**
 * PayPal Webhook Signature Verification
 * See: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post
 * Uses PayPal's verify-webhook-signature API (no cert handling required).
 */
const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE = 'https://api-m.paypal.com';

/**
 * Verify webhook signature via PayPal API.
 * @param {object} opts - { webhookId, transmissionId, transmissionTime, transmissionSig, certUrl, webhookEvent (parsed JSON) }
 * @param {string} accessToken - PayPal OAuth access token
 * @param {boolean} sandbox
 * @returns {Promise<boolean>} true if verification succeeded
 */
export async function verifyWebhookSignature(opts, accessToken, sandbox = true) {
  if (!opts.webhookId || !opts.transmissionId || !opts.transmissionSig || !opts.transmissionTime || !opts.certUrl) {
    return false;
  }
  const base = sandbox ? SANDBOX_BASE : LIVE_BASE;
  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: opts.authAlgo || 'SHA256withRSA',
      cert_url: opts.certUrl,
      transmission_id: opts.transmissionId,
      transmission_sig: opts.transmissionSig,
      transmission_time: opts.transmissionTime,
      webhook_id: opts.webhookId,
      webhook_event: opts.webhookEvent || {},
    }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}

/**
 * Build verify opts from Express request (raw body + PayPal headers).
 * Mount webhook route with express.raw({ type: 'application/json' }) so req.body is Buffer.
 */
export function getVerifyOptsFromRequest(req, webhookId) {
  const rawBody = req.body;
  const bodyStr = rawBody instanceof Buffer ? rawBody.toString('utf8') : (typeof rawBody === 'string' ? rawBody : '');
  let webhookEvent = {};
  try {
    webhookEvent = bodyStr ? JSON.parse(bodyStr) : {};
  } catch {
    // ignore
  }
  const get = (name) => req.headers[name] || req.headers[name.toLowerCase()];
  return {
    webhookId: webhookId || process.env.PAYPAL_WEBHOOK_ID,
    transmissionId: get('paypal-transmission-id'),
    transmissionTime: get('paypal-transmission-time'),
    transmissionSig: get('paypal-transmission-sig'),
    certUrl: get('paypal-cert-url'),
    webhookEvent,
  };
}
