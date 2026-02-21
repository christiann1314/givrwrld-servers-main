# 🔍 Step-by-Step Webhook Debugging

## Current Status
- ❌ No order created for user `f7711bf7-93d5-4b84-9b48-40e4d0e3c9e2`
- ❌ No `stripe-webhook` logs visible in Supabase
- ❌ Stripe Dashboard shows 400 errors for webhook events

## Critical Debugging Steps

### Step 1: Check Stripe Webhook Endpoint Status
**In Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/webhooks (LIVE mode)
2. Find endpoint: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
3. Click on it
4. Check **"Recent events"** tab
5. Look for the most recent `checkout.session.completed` event
6. **Click on the event** to see details
7. Check the **response body** - it should show the error message

**What to look for:**
- If response says `"Invalid signature"` → Secret mismatch
- If response says `"Missing stripe-signature header"` → Header issue
- If response is empty or different → Check Supabase logs

### Step 2: Check Supabase Webhook Function Logs
**In Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions
2. Click on **`stripe-webhook`** function
3. Go to **"Logs"** tab
4. Filter by **"Last hour"** or **"Last 15 minutes"**
5. Look for any POST requests to `/functions/v1/stripe-webhook`

**What to look for:**
- **No logs at all** → Webhook not reaching Supabase (check Stripe endpoint URL)
- **400 errors** → Signature verification failed (check secret)
- **500 errors** → Function code error (check error message)

### Step 3: Verify Webhook Secret Match
**In Stripe:**
1. Go to webhook endpoint details
2. Click **"Signing secret"** → **"Reveal"**
3. Copy the entire secret (starts with `whsec_...`)

**In Supabase:**
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/functions
2. Scroll to **"Secrets"**
3. Find `STRIPE_WEBHOOK_SECRET`
4. Click **"Reveal"**
5. **Compare character by character** with Stripe secret

**If they don't match:**
- Update Supabase secret to match Stripe exactly
- Redeploy function: `npx -y supabase functions deploy --project-ref mjhvkvnshnbnxojnandf stripe-webhook`

### Step 4: Test with Stripe CLI (Optional)
If you have Stripe CLI installed:
```bash
stripe listen --forward-to https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook
stripe trigger checkout.session.completed
```

This will send a test event and show if it's received.

### Step 5: Check Function Code
The function should handle:
- Signature verification (lines 32-46)
- Order creation (lines 63-83)
- Server provisioning trigger (lines 102-118)

## Common Issues & Solutions

### Issue: No Logs in Supabase
**Possible causes:**
1. Webhook endpoint URL wrong in Stripe
2. Webhook not configured in Stripe Dashboard
3. Events sent to wrong endpoint

**Solution:**
- Verify endpoint URL in Stripe matches exactly: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
- Check if webhook is enabled in Stripe Dashboard

### Issue: 400 "Invalid signature"
**Cause:** Secret mismatch

**Solution:**
- Copy secret from Stripe Dashboard
- Paste into Supabase secrets
- Redeploy function
- Test again

### Issue: 400 "Missing stripe-signature header"
**Cause:** Request not coming from Stripe

**Solution:**
- Check if webhook is configured in Stripe Dashboard
- Verify endpoint URL is correct

### Issue: 500 Internal Server Error
**Cause:** Function code error

**Solution:**
- Check Supabase logs for error message
- Verify all environment variables are set
- Check function code for errors

## Next Steps After Debugging

Once you identify the issue:
1. Fix the root cause
2. Redeploy the function if needed
3. Test with a new purchase
4. Monitor both Stripe and Supabase logs
5. Verify order is created
6. Verify server is provisioned

