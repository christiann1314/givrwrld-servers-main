# 🔍 Webhook Debugging - Among Us Purchase Failed

## Issue
Payment succeeded but no server was provisioned. No order was created in Supabase.

## Root Cause Analysis

### 1. Webhook Not Called by Stripe
**Most likely issue:** The webhook endpoint is not configured in **Stripe Dashboard** (Live Mode).

Even though the webhook is "Active" in Supabase, Stripe needs to be configured to send events to it.

### 2. Required Configuration in Stripe Dashboard

Go to: https://dashboard.stripe.com/webhooks (LIVE mode)

**Required setup:**
1. Click **"Add endpoint"** or edit existing
2. **Endpoint URL:** `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
3. **Events to send:**
   - ✅ `checkout.session.completed` (REQUIRED)
   - ✅ `customer.subscription.updated` (recommended)
   - ✅ `customer.subscription.deleted` (recommended)
   - ✅ `invoice.payment_failed` (recommended)

4. **Copy Signing Secret** (starts with `whsec_...`)
   - Must match `STRIPE_WEBHOOK_SECRET` in Supabase Edge Functions secrets
   - Current in Supabase: Check Supabase Dashboard → Edge Functions → Secrets

### 3. Verification Steps

#### Check if Webhook Was Called:
1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Recent events"** tab
3. Look for `checkout.session.completed` events from your purchase
4. Check the response status:
   - **200 OK** = Webhook received and processed
   - **400/500** = Webhook failed (check error details)

#### Check Supabase Logs:
1. Go to Supabase Dashboard → Edge Functions → `stripe-webhook`
2. Check **"Logs"** tab
3. Look for recent invocations and any errors

#### Check if Order Was Created:
```sql
SELECT * FROM orders 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```

## Common Issues

### Issue 1: Webhook Not Configured in Stripe
**Symptom:** Payment succeeds, no order created
**Fix:** Configure webhook endpoint in Stripe Dashboard (LIVE mode)

### Issue 2: Wrong Signing Secret
**Symptom:** Webhook returns 400 "Invalid signature"
**Fix:** Update `STRIPE_WEBHOOK_SECRET` in Supabase to match Stripe Dashboard

### Issue 3: Webhook in Wrong Mode
**Symptom:** Webhook configured in Test mode but using Live keys
**Fix:** Configure webhook in LIVE mode when using live Stripe keys

### Issue 4: Missing Metadata
**Symptom:** Order creation fails with "missing required field"
**Fix:** Check `create-checkout-session` function includes all required metadata

## Among Us Plans Verified
✅ `among-us-1gb` - `price_1SPmbMB3VffY65l6Bio5NjIE` (Active)
✅ `among-us-2gb` - `price_1SPmbMB3VffY65l6ZdF7pFBL` (Active)
⚠️ `among-us-4gb` - **MISSING** (frontend uses it but not in database)

## Next Steps

1. **Verify Stripe Webhook Configuration:**
   - Go to Stripe Dashboard → Webhooks (LIVE mode)
   - Ensure endpoint exists and is enabled
   - Check "Recent events" for your purchase

2. **If Webhook Not Configured:**
   - Add endpoint: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
   - Enable `checkout.session.completed` event
   - Copy signing secret and verify it matches Supabase

3. **Add Missing Plan:**
   - Add `among-us-4gb` plan to `plans` table if needed

4. **Test Again:**
   - Make a new purchase
   - Monitor Stripe webhook events
   - Monitor Supabase logs
   - Verify order creation

