# 🔍 Verify Webhook Secret Configuration

## Critical Check: Are You Using the Correct Secret?

The webhook is still returning 400 errors, which means the signing secret still doesn't match.

### Common Issues:

1. **Multiple Webhook Endpoints**
   - You might have multiple webhook endpoints in Stripe
   - Make sure you're using the secret from the CORRECT endpoint
   - The endpoint URL must match: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`

2. **Test vs Live Mode**
   - If you're using LIVE Stripe keys, use the LIVE webhook secret
   - If you're using TEST Stripe keys, use the TEST webhook secret
   - They are different!

3. **Secret Format**
   - Stripe webhook secrets start with `whsec_...`
   - Make sure you copied the ENTIRE secret (they're long)
   - No spaces or line breaks

## Step-by-Step Verification:

### Step 1: Find Your Webhook Endpoint in Stripe
1. Go to: https://dashboard.stripe.com/webhooks
2. **Switch to LIVE mode** (top right toggle)
3. Find the endpoint: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
4. Click on it

### Step 2: Get the Signing Secret
1. In the webhook details, find **"Signing secret"** section
2. Click **"Reveal"** or **"Copy"**
3. Copy the ENTIRE secret (starts with `whsec_...`)

### Step 3: Verify in Supabase
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/functions
2. Scroll to **"Secrets"** section
3. Find `STRIPE_WEBHOOK_SECRET`
4. Click **"Reveal"** to see the current value
5. **Compare character by character** with the Stripe secret
6. If they don't match exactly, update it

### Step 4: Redeploy Function
After updating the secret, redeploy:

```bash
export SUPABASE_ACCESS_TOKEN='sbp_34115bcba57a38fe3af736fbc9b37e704f6aa2fb'
npx -y supabase functions deploy --project-ref mjhvkvnshnbnxojnandf stripe-webhook
```

## Alternative: Check Supabase Logs

To see the actual error message:
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions
2. Click on `stripe-webhook`
3. Go to **"Logs"** tab
4. Look for recent invocations
5. Check the error message - it will say either:
   - "Missing stripe-signature header"
   - "Invalid signature" (this is what we're seeing)

## Quick Test

After updating the secret and redeploying:
1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Send test webhook"** or **"Resend"** on a failed event
3. Check if it now returns 200 OK

## Still Not Working?

If the secret matches exactly and it still fails:
1. Check if you have multiple webhook endpoints (delete unused ones)
2. Verify you're in the correct Stripe mode (Live vs Test)
3. Check Supabase logs for the exact error message
4. Try creating a NEW webhook endpoint in Stripe and using its secret

