# Manual Server Provisioning Fix

If a purchase completed but no server was created, follow these steps:

## Step 1: Check if Order Exists

Run this in Supabase SQL Editor:
```sql
SELECT 
  id,
  user_id,
  plan_id,
  item_type,
  server_name,
  status,
  stripe_sub_id,
  pterodactyl_server_id,
  created_at
FROM orders
WHERE status = 'paid'
  AND pterodactyl_server_id IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

## Step 2: Check Webhook Logs

1. Go to Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
2. Look for recent invocations (last 15 minutes)
3. Check for:
   - "Checkout session completed" logs
   - "Triggering server provisioning" logs
   - Any error messages

## Step 3: Check Provisioning Logs

1. Go to Supabase Dashboard → Edge Functions → `servers-provision` → Logs
2. Look for recent invocations
3. Check for error messages

## Step 4: Manually Trigger Provisioning

If an order exists but provisioning failed, manually trigger it:

### Option A: Via Supabase Dashboard

1. Go to Supabase Dashboard → Edge Functions → `servers-provision`
2. Click "Invoke function"
3. Use this payload:
```json
{
  "order_id": "ORDER_ID_FROM_STEP_1"
}
```
4. Click "Invoke" and check the response

### Option B: Via cURL

```bash
curl -X POST \
  'https://mjhvkvnshnbnxojnandf.functions.supabase.co/servers-provision' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": "ORDER_ID_FROM_STEP_1"
  }'
```

## Step 5: Check Stripe Webhook Events

1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Check "Recent events" tab
3. Look for `checkout.session.completed` events
4. Check if they show **200 OK** or an error status

## Common Issues

### Issue 1: Webhook Not Called
- **Symptom:** No order in database
- **Fix:** Check if webhook is active in Stripe Dashboard
- **Fix:** Verify webhook URL is correct

### Issue 2: Order Created But Provisioning Failed
- **Symptom:** Order exists with `status='paid'` but no `pterodactyl_server_id`
- **Fix:** Manually trigger provisioning (Step 4)
- **Fix:** Check provisioning logs for errors

### Issue 3: Functions URL Bug (FIXED)
- **Symptom:** Webhook logs show provisioning was called but got 404 or connection error
- **Fix:** Already fixed in `stripe-webhook/index.ts` - redeploy the function

### Issue 4: Checkout Not in Subscription Mode
- **Symptom:** Webhook logs show "Checkout session not in subscription mode"
- **Fix:** Check `create-checkout-session` is using `mode: 'subscription'`

## Redeploy Fixed Webhook

After fixing the URL bug, redeploy:
```bash
cd /home/ubuntu/givrwrld-severs
supabase functions deploy stripe-webhook
```

