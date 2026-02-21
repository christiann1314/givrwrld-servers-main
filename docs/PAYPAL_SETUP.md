# PayPal Recurring Subscriptions Setup

The GIVRwrld API uses the **PayPal Subscriptions API** for recurring billing. Configure the following to enable PayPal payments.

## 1. Create a PayPal Developer Account

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Log in with your PayPal account
3. Create a sandbox app for testing, or use live credentials for production

## 2. Get API Credentials

- **Sandbox**: Dashboard → Apps & Credentials → Sandbox → Create App
- **Live**: Dashboard → Apps & Credentials → Live → Create App

You need:
- **Client ID**
- **Client Secret**

## 3. Environment Variables

Add to `api/.env`:

```env
# PayPal (for recurring subscriptions)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret

# Use sandbox (default: true). Set to false for production
PAYPAL_SANDBOX=true
```

Alternatively, store encrypted credentials in the `secrets` table (scope `paypal`, keys `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`).

## 4. Webhook Configuration

For subscription lifecycle events (activation, cancellation, etc.):

1. In PayPal Developer Dashboard → Your App → Webhooks
2. Add webhook URL: `https://your-api-domain.com/api/paypal/webhook`
3. Subscribe to events:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `PAYMENT.SALE.COMPLETED`

**Local development**: Use a tunnel (ngrok, cloudflared) to expose your local API for webhook testing.

## 5. Database Migration

Run the PayPal migration to add required tables and columns:

```bash
mysql -u app_rw -p app_core < migrations/20250215000000_add_paypal_support.sql
```

## Flow

1. User selects a plan and clicks checkout
2. API creates a pending order and a PayPal subscription (plan auto-created if needed)
3. User is redirected to PayPal to approve the subscription
4. After approval, PayPal sends `BILLING.SUBSCRIPTION.ACTIVATED` webhook
5. API marks order as paid and triggers server provisioning
