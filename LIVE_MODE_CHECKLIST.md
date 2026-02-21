# ✅ Live Mode Webhook Checklist

## Confirmed: Live Mode Active
- ✅ Stripe Dashboard is in **LIVE mode** (not test)
- ✅ Using live Stripe keys (`pk_live_...`, `sk_live_...`)

## Critical: Webhook Must Use LIVE Secret

Since you're in **LIVE mode**, you MUST use the **LIVE webhook secret**.

### Step 1: Get LIVE Webhook Secret from Stripe
1. Go to: https://dashboard.stripe.com/webhooks
2. **Ensure you're in LIVE mode** (top right toggle should show "LIVE", not "TEST")
3. Find your webhook endpoint: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
4. Click on it
5. Scroll to **"Signing secret"** section
6. Click **"Reveal"** or **"Copy"**
7. Copy the ENTIRE secret (starts with `whsec_...`)

**⚠️ IMPORTANT:** If you have a webhook endpoint in TEST mode, it has a DIFFERENT secret. You must use the LIVE mode secret.

### Step 2: Verify in Supabase
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/functions
2. Scroll to **"Secrets"** section
3. Find `STRIPE_WEBHOOK_SECRET`
4. Click **"Reveal"** to see current value
5. **Compare character by character** with the LIVE secret from Stripe
6. If they don't match, update it

### Step 3: Verify Other Secrets Are Live
Check these secrets are also from LIVE mode:
- ✅ `STRIPE_SECRET_KEY` should start with `sk_live_...` (not `sk_test_...`)
- ✅ `STRIPE_WEBHOOK_SECRET` should be from LIVE webhook endpoint

### Step 4: Check for Multiple Webhook Endpoints
**In Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/webhooks
2. Check both LIVE and TEST modes
3. Look for any endpoints pointing to your Supabase URL
4. **Delete any TEST mode endpoints** if you're only using LIVE
5. Make sure you're using the secret from the LIVE endpoint

### Step 5: Redeploy Function
After verifying/updating secrets:
```bash
export SUPABASE_ACCESS_TOKEN='sbp_34115bcba57a38fe3af736fbc9b37e704f6aa2fb'
npx -y supabase functions deploy --project-ref mjhvkvnshnbnxojnandf stripe-webhook
```

## Common Live Mode Issues

### Issue: Using Test Mode Secret with Live Mode
**Symptom:** 400 "Invalid signature" errors
**Fix:** Use the LIVE webhook secret, not the test one

### Issue: Webhook Not Configured in Live Mode
**Symptom:** No webhook events at all
**Fix:** Configure webhook endpoint in LIVE mode (not test mode)

### Issue: Mixed Mode Keys
**Symptom:** Inconsistent behavior
**Fix:** Ensure ALL Stripe keys are from the same mode (all LIVE or all TEST)

## Verification After Fix

1. Make a test purchase in LIVE mode
2. Check Stripe Dashboard → Webhooks → Recent events
3. Should see `checkout.session.completed` with **200 OK**
4. Check Supabase → `orders` table
5. Should see new order created
6. Check Pterodactyl panel
7. Should see new server provisioned

## Current Status
- ✅ Live mode confirmed
- ⏳ Webhook secret verification needed
- ⏳ Function redeployment needed after secret update
- ⏳ Test purchase to verify

