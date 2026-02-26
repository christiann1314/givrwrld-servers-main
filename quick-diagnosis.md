# Quick Diagnosis - No Servers Showing

## Immediate Checks

### 1. Check if you made a purchase
Run this in **Supabase SQL Editor**:

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'christianjn14@example.com';
-- (Replace with your actual email)

-- Check your orders
SELECT 
  id,
  plan_id,
  server_name,
  status,
  stripe_sub_id,
  pterodactyl_server_id,
  created_at
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 5;
```

**What to look for:**
- If **no rows** → No purchase was completed
- If **status = 'paid'** → Purchase succeeded, provisioning should have started
- If **status = 'error'** → Provisioning failed, check logs

### 2. Check Webhook Logs (if order exists)

**In Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions/stripe-webhook/logs
2. Filter by **"Last hour"**
3. Look for POST requests

**What to look for:**
- ✅ **200 status** with "Checkout session completed" → Webhook worked
- ❌ **400/500 status** → Check error message

### 3. Check Provisioning Logs (if order exists)

**In Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions/servers-provision/logs
2. Filter by **"Last hour"**
3. Look for POST requests

**What to look for:**
- ✅ **200 status** → Provisioning succeeded
- ❌ **400/500 status** → Check error message

### 4. Check Stripe Webhook Events

**In Stripe Dashboard (LIVE mode):**
1. Go to: https://dashboard.stripe.com/webhooks
2. Click your webhook endpoint
3. Go to **"Recent events"** tab
4. Look for `checkout.session.completed` events

**What to look for:**
- ✅ **200 OK** → Webhook delivered successfully
- ❌ **400/500 ERR** → Webhook failed

## Next Steps Based on Results

### If NO ORDER exists:
→ Make a test purchase and watch the logs

### If ORDER exists with status='paid':
→ Manually trigger provisioning (see below)

### If ORDER exists with status='error':
→ Check the error message in provisioning logs

## Manual Provisioning (if order stuck)

1. Get the order ID from Step 1
2. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions/servers-provision
3. Click **"Invoke Function"**
4. Use this payload:
```json
{
  "order_id": "YOUR_ORDER_ID_HERE"
}
```
5. Click **"Invoke"**


