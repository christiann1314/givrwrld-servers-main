# 🔴 CRITICAL: Webhook Returning 400 Bad Request

## Issue Identified
The webhook is **receiving events from Stripe** (confirmed in Supabase Dashboard), but returning **400 Bad Request** errors. This means:

✅ Stripe webhook is configured correctly  
✅ Events are being sent  
❌ **Signature verification is failing**

## Root Cause
The `STRIPE_WEBHOOK_SECRET` in Supabase Edge Functions secrets **does not match** the signing secret from your Stripe webhook endpoint.

## Fix Required (2 minutes)

### Step 1: Get Signing Secret from Stripe
1. Go to: https://dashboard.stripe.com/webhooks (LIVE mode)
2. Click on your webhook endpoint: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
3. Find the **"Signing secret"** section
4. Click **"Reveal"** or **"Copy"** to get the secret (starts with `whsec_...`)

### Step 2: Update Supabase Secret
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/functions
2. Scroll to **"Secrets"** section
3. Find `STRIPE_WEBHOOK_SECRET`
4. Click **"Edit"** or **"Add"** if missing
5. Paste the signing secret from Stripe
6. Click **"Save"**

### Step 3: Redeploy Function (Optional but Recommended)
After updating the secret, redeploy the function to ensure it picks up the new value:

```bash
export SUPABASE_ACCESS_TOKEN='sbp_34115bcba57a38fe3af736fbc9b37e704f6aa2fb'
npx -y supabase functions deploy --project-ref mjhvkvnshnbnxojnandf stripe-webhook
```

## Verification
After fixing:
1. Make a test purchase
2. Check Supabase Dashboard → Webhooks → Event deliveries
3. Should see **200 OK** instead of **400 ERR**
4. Order should appear in `orders` table
5. Server should be provisioned automatically

## Why This Happens
Stripe signs all webhook events with a secret. Your Edge Function verifies the signature to ensure the event came from Stripe. If the secrets don't match, verification fails and returns 400.

## Current Status
- ✅ Webhook endpoint configured in Stripe
- ✅ Events being sent to Supabase
- ❌ Signature verification failing (400 errors)
- ⏳ After fix: Should work end-to-end

