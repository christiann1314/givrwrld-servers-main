# 🔗 Stripe Webhook Setup - Required Configuration

## Critical: Stripe Webhook Must Be Configured

**The webhook was NOT called for your Among Us purchase because it's not configured in Stripe Dashboard.**

## Setup Steps (2 minutes)

### 1. Go to Stripe Dashboard
- **URL:** https://dashboard.stripe.com/webhooks
- **Mode:** Switch to **LIVE mode** (not test mode)

### 2. Create/Verify Webhook Endpoint
- Click **"Add endpoint"** or edit existing
- **Endpoint URL:** `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
- **Events to send:** Select at minimum:
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.updated` (optional but recommended)
  - ✅ `customer.subscription.deleted` (optional but recommended)
  - ✅ `invoice.payment_failed` (optional but recommended)

### 3. Copy Signing Secret
- After creating the endpoint, Stripe will show a **"Signing secret"**
- It starts with `whsec_...`
- **Current value in Supabase:** Check Supabase Edge Functions secrets
- **If different:** Update in Supabase → Project Settings → Edge Functions → Secrets → `STRIPE_WEBHOOK_SECRET`

### 4. Verify Configuration
- Make a test purchase
- Go to Stripe Dashboard → Webhooks → Your endpoint → **"Recent events"**
- You should see `checkout.session.completed` events with status **200 OK**

## Verification Checklist

- [ ] Webhook endpoint exists in Stripe Dashboard (LIVE mode)
- [ ] Endpoint URL matches: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
- [ ] Signing secret matches Supabase secret `STRIPE_WEBHOOK_SECRET`
- [ ] Event `checkout.session.completed` is enabled
- [ ] Recent webhook events show 200 OK (not 400/500 errors)

## Troubleshooting

**If webhook returns 400:**
- Check signing secret matches between Stripe and Supabase
- Verify webhook payload is being sent correctly

**If webhook returns 500:**
- Check Supabase Edge Function logs
- Verify `STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly

**If order not created:**
- Check Supabase logs for `stripe-webhook` function
- Verify user exists in Supabase Auth
- Check if order insert failed due to missing required fields

**If server not provisioned:**
- Check if `servers-provision` function was called (logs)
- Verify user has `external_account` record
- Check if node has available allocations
- Verify game configuration exists (now fixed for all games)

