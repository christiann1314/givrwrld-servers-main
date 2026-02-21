# Debugging Auto-Provisioning After Purchase

## The Flow (What Should Happen)

1. ✅ **User completes Stripe checkout** → Payment succeeds
2. ⚠️ **Stripe sends webhook** → `checkout.session.completed` event
3. ⚠️ **Webhook creates order** → `orders` table with `status='paid'`
4. ⚠️ **Webhook triggers provisioning** → Calls `servers-provision` function
5. ⚠️ **Provisioning creates server** → Pterodactyl API call
6. ⚠️ **Order updated** → `status='provisioned'`, `pterodactyl_server_id` set

## Quick Diagnostic Steps

### Step 1: Check if Webhook is Being Called

**In Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/webhooks (LIVE mode)
2. Click your webhook endpoint
3. Check "Recent events" tab
4. Look for `checkout.session.completed` events
5. **Check the response status:**
   - ✅ **200 OK** = Webhook received and processed
   - ❌ **400/500** = Webhook failed (check error message)

### Step 2: Check Webhook Logs

**In Supabase Dashboard:**
1. Go to: Edge Functions → `stripe-webhook` → Logs
2. Filter by "Last 15 minutes"
3. Look for:
   - `"Checkout session completed"` log
   - `"Order created successfully"` log
   - `"Triggering server provisioning"` log
   - Any error messages

### Step 3: Check if Order Was Created

**In Supabase SQL Editor:**
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
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**What to look for:**
- ✅ Order exists with `status='paid'` → Webhook worked
- ❌ No order → Webhook wasn't called or failed
- ⚠️ Order with `status='paid'` but `pterodactyl_server_id IS NULL` → Provisioning failed

### Step 4: Check Provisioning Logs

**In Supabase Dashboard:**
1. Go to: Edge Functions → `servers-provision` → Logs
2. Filter by "Last 15 minutes"
3. Look for:
   - Recent invocations
   - Error messages
   - "Server provisioning triggered successfully" (from webhook)

### Step 5: Check Checkout Session Metadata

The webhook needs these metadata fields from the checkout session:
- `user_id`
- `item_type` (must be 'game' for provisioning)
- `plan_id`
- `term`
- `region`
- `server_name`

**Check in Stripe Dashboard:**
1. Go to: Payments → Find the payment
2. Click on the checkout session
3. Check "Metadata" section
4. Verify all required fields are present

## Common Issues & Fixes

### Issue 1: Webhook Not Called
**Symptoms:**
- No order in database
- No webhook logs in Supabase

**Possible Causes:**
- Webhook endpoint disabled in Stripe
- Webhook URL incorrect
- Stripe in TEST mode instead of LIVE mode

**Fix:**
1. Verify webhook is **Active** in Stripe Dashboard
2. Verify webhook URL: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
3. Ensure you're in **LIVE mode** (not test mode)

### Issue 2: Webhook Called But Order Not Created
**Symptoms:**
- Webhook logs show error
- No order in database

**Possible Causes:**
- Missing metadata in checkout session
- Checkout session not in subscription mode
- Database error

**Fix:**
1. Check webhook logs for error message
2. Verify checkout session has all required metadata
3. Verify checkout session `mode='subscription'`

### Issue 3: Order Created But Provisioning Not Triggered
**Symptoms:**
- Order exists with `status='paid'`
- No `pterodactyl_server_id`
- No provisioning logs

**Possible Causes:**
- `item_type` is not 'game'
- Provisioning call failed silently
- Webhook error in provisioning call

**Fix:**
1. Check webhook logs for "Triggering server provisioning" message
2. Check webhook logs for provisioning errors
3. Manually trigger provisioning (see below)

### Issue 4: Provisioning Called But Failed
**Symptoms:**
- Order exists with `status='paid'`
- Provisioning logs show error
- No server in Pterodactyl

**Possible Causes:**
- Missing Pterodactyl credentials
- No available nodes/capacity
- Pterodactyl API error
- Missing game configuration

**Fix:**
1. Check provisioning logs for specific error
2. Verify Pterodactyl credentials in Supabase secrets
3. Verify nodes exist in `ptero_nodes` table
4. Verify plan exists in `plans` table

## Manual Provisioning (If Auto-Provisioning Failed)

If an order exists but provisioning didn't happen, manually trigger it:

### Via Supabase Dashboard:
1. Go to: Edge Functions → `servers-provision`
2. Click "Invoke function"
3. Use this payload:
```json
{
  "order_id": "YOUR_ORDER_ID"
}
```
4. Click "Invoke" and check response

### Via cURL:
```bash
curl -X POST \
  'https://mjhvkvnshnbnxojnandf.functions.supabase.co/servers-provision' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": "YOUR_ORDER_ID"
  }'
```

## Testing the Full Flow

1. **Make a test purchase** (use a small plan like Among Us 1GB)
2. **Monitor in real-time:**
   - Stripe Dashboard → Webhooks → Recent events
   - Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - Supabase Dashboard → Edge Functions → `servers-provision` → Logs
3. **Check database:**
   - Query `orders` table for new order
   - Verify `status` changes from 'paid' → 'provisioning' → 'provisioned'
4. **Check Pterodactyl:**
   - Log into panel
   - Verify server was created
   - Verify server is assigned to correct user

## Next Steps

If provisioning is failing silently, we need to:
1. Add better error handling in webhook
2. Add retry logic for provisioning
3. Add alerts when provisioning fails
4. Store provisioning errors in database

