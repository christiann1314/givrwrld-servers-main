# Server Provisioning Diagnostic Guide

## Issue: No servers appearing in Pterodactyl after purchase

### Step 1: Check Recent Orders

Run this in Supabase SQL Editor:

```sql
-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then check your orders (replace USER_ID with your user ID)
SELECT 
  id,
  plan_id,
  server_name,
  status,
  pterodactyl_server_id,
  pterodactyl_server_identifier,
  created_at,
  updated_at
FROM orders
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Step 2: Check Order Status

Look for orders with status:
- `paid` - Payment received, provisioning should start
- `provisioning` - Currently being provisioned
- `installing` - Server installing in Pterodactyl
- `error` - Provisioning failed
- `active` - Server is live

### Step 3: Check Webhook Logs

1. Go to Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
2. Look for recent `checkout.session.completed` events
3. Check if provisioning was triggered

### Step 4: Check Provisioning Function Logs

1. Go to Supabase Dashboard → Edge Functions → `servers-provision` → Logs
2. Look for errors or successful provisioning messages

### Step 5: Verify Prerequisites

Run this SQL to check:

```sql
-- Check if you have an external_accounts entry
SELECT * FROM external_accounts WHERE user_id = 'USER_ID';

-- Check if nodes are available
SELECT 
  id,
  name,
  region,
  max_ram_gb,
  enabled,
  (SELECT COUNT(*) FROM orders 
   WHERE node_id = ptero_nodes.id 
   AND status IN ('paid', 'provisioning', 'installing', 'provisioned', 'active')
  ) as active_orders
FROM ptero_nodes
WHERE enabled = true;
```

### Step 6: Manual Provisioning

If an order is stuck in `paid` status, you can manually trigger provisioning:

1. Get the order ID from Step 1
2. Go to Supabase Dashboard → Edge Functions → `servers-provision`
3. Click "Invoke Function"
4. Use this payload:
```json
{
  "order_id": "YOUR_ORDER_ID_HERE"
}
```
5. Use service role key for authentication

### Common Issues

1. **No external_accounts entry**
   - Solution: The `create-pterodactyl-user` function should create this
   - Check if it was called during signup

2. **No available nodes**
   - Solution: Check `ptero_nodes` table has enabled nodes with capacity

3. **Provisioning function errors**
   - Check logs for specific error messages
   - Common: Missing Pterodactyl credentials, invalid egg IDs, no allocations

4. **Webhook not firing**
   - Check Stripe Dashboard → Webhooks
   - Verify webhook endpoint is active
   - Check webhook secret matches Supabase secret

