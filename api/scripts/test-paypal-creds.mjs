import 'dotenv/config';

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const sandbox = process.env.PAYPAL_SANDBOX !== 'false';

const base = sandbox
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

if (!clientId || !clientSecret) {
  console.error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in api/.env');
  process.exit(1);
}

console.log('Testing PayPal creds with base:', base);
console.log(
  'Client ID (start/end):',
  clientId.slice(0, 8),
  '...',
  clientId.slice(-6)
);

const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

const res = await fetch(`${base}/v1/oauth2/token`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
});

console.log('HTTP status:', res.status);
const bodyText = await res.text();
console.log('Response body:', bodyText);

