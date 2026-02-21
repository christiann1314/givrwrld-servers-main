# Verify Webhook Setup

## Step 1: Check ALL Orders (Not Just Last 24 Hours)

Run this in Supabase SQL Editor:

```sql
-- Check ALL orders (no time limit)
SELECT 
  id,
  user_id,
  plan_id,
  server_name,
  status,
  stripe_sub_id,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 20;

-- Count total orders
SELECT COUNT(*) as total_orders FROM orders;
```

## Step 2: Verify Stripe Webhook is Configured

**In Stripe Dashboard (LIVE mode):**
1. Go to: https://dashboard.stripe.com/webhooks
2. Check if you have a webhook endpoint for:
   `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
3. **Is it ACTIVE?** (should show green "Active" status)
4. **What events are selected?** Should include:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

## Step 3: Make a Test Purchase

1. Go to: https://givrwrldservers.com/purchase
2. Select a game server plan
3. Complete the checkout
4. **Watch the logs in real-time:**
   - Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - Supabase Dashboard → Edge Functions → `servers-provision` → Logs

## Step 4: Check Webhook Events After Purchase

**In Stripe Dashboard:**
1. Go to Webhooks → Your endpoint → "Recent events"
2. Look for `checkout.session.completed` event
3. **What status does it show?**
   - ✅ **200 OK** = Webhook delivered successfully
   - ❌ **400 ERR** = Signature verification failed
   - ❌ **500 ERR** = Function error

## Common Issues

### Issue 1: Webhook Not Active
- **Fix:** Enable the webhook in Stripe Dashboard

### Issue 2: Webhook Secret Mismatch
- **Symptom:** 400 errors in Stripe Dashboard
- **Fix:** Verify `STRIPE_WEBHOOK_SECRET` in Supabase matches Stripe's signing secret

### Issue 3: Wrong Events Selected
- **Fix:** Ensure `checkout.session.completed` is selected in Stripe webhook settings
