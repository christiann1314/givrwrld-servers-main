# Manual Provisioning Test Guide

## 🐛 Issue Fixed

The webhook was trying to call `http://localhost:3001` from Stripe's servers, which doesn't work. Fixed by calling the `provisionServer()` function directly.

## 🧪 Test the Fix

### Option 1: Test with New Purchase (Recommended)

1. **Restart API Server**:
   ```bash
   cd /home/ubuntu/givrwrld-severs/api
   npm start
   ```

2. **Make a New Purchase**:
   - Go to frontend
   - Select a plan
   - Complete checkout with test card: `4242 4242 4242 4242`
   - Watch API server logs for provisioning messages

3. **Expected Logs**:
   ```
   Order created: [order-id]
   ✅ Server provisioning completed for order: [order-id] { ... }
   ✅ Server provisioned: [identifier] (ID: [id]) for order [order-id]
   ```

### Option 2: Manually Provision Existing Order

If you have a recent order that failed:

1. **Find the Order ID**:
   ```bash
   mysql -u app_rw -p app_core -e "SELECT id, status, error_message FROM orders WHERE status = 'paid' ORDER BY created_at DESC LIMIT 1;"
   ```

2. **Manually Trigger Provisioning**:
   ```bash
   curl -X POST http://localhost:3001/api/servers/provision \
     -H 'Content-Type: application/json' \
     -d '{"order_id": "YOUR_ORDER_ID_HERE"}'
   ```

3. **Check Result**:
   ```bash
   mysql -u app_rw -p app_core -e "SELECT id, status, ptero_server_id, ptero_identifier FROM orders WHERE id = 'YOUR_ORDER_ID_HERE';"
   ```

## ✅ Verification Checklist

After provisioning, verify:

1. **Order Status Updated**:
   ```sql
   SELECT status, ptero_server_id, ptero_identifier 
   FROM orders 
   WHERE id = 'YOUR_ORDER_ID';
   ```
   - Should show: `status = 'provisioned'`
   - Should have: `ptero_server_id` and `ptero_identifier` populated

2. **Server in Pterodactyl**:
   - Login to Pterodactyl panel
   - Check "Servers" section
   - Server should appear with correct name and configuration

3. **Server in Dashboard**:
   - Refresh "My Services" page
   - Click "Refresh Live Data" button
   - Server should appear in the list

## 🔍 Troubleshooting

### If Provisioning Still Fails

Check these in order:

1. **API Server Running**:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Order Status**:
   ```sql
   SELECT * FROM orders WHERE id = 'YOUR_ORDER_ID';
   ```
   - Must be `status = 'paid'` to provision

3. **Plan Configuration**:
   ```sql
   SELECT id, ptero_egg_id, stripe_price_id 
   FROM plans 
   WHERE id = 'YOUR_PLAN_ID';
   ```
   - Must have `ptero_egg_id` set

4. **Region Mapping**:
   ```sql
   SELECT * FROM region_node_map WHERE region_code = 'YOUR_REGION';
   ```
   - Region must have a node mapped

5. **Pterodactyl Credentials**:
   ```sql
   SELECT scope, key_name FROM secrets WHERE scope = 'panel';
   ```
   - Must have `PANEL_URL` and `PANEL_APP_KEY`

6. **API Logs**:
   - Watch console for error messages
   - Look for specific error details

### Common Errors

**"Plan does not have ptero_egg_id configured"**
- Fix: Update plan in database with correct `ptero_egg_id`

**"No node found for region"**
- Fix: Add region to `region_node_map` table

**"Pterodactyl credentials not found"**
- Fix: Add `PANEL_URL` and `PANEL_APP_KEY` to `secrets` table

**"Egg not found"**
- Fix: Sync Pterodactyl catalog: `./scripts/sync-ptero-catalog.sh`

## 📊 Expected Database State

After successful provisioning:

```sql
-- Order should be provisioned
SELECT 
  id,
  status,                    -- Should be 'provisioned'
  ptero_server_id,          -- Should have value
  ptero_identifier,         -- Should have value
  error_message             -- Should be NULL
FROM orders 
WHERE id = 'YOUR_ORDER_ID';

-- User should have Pterodactyl account
SELECT 
  id,
  email,
  pterodactyl_user_id      -- Should have value
FROM users 
WHERE id = (SELECT user_id FROM orders WHERE id = 'YOUR_ORDER_ID');
```

## 🚀 Next Steps After Fix

1. **Test with Real Purchase**: Make a new purchase and verify end-to-end
2. **Monitor Logs**: Watch for any errors during provisioning
3. **Verify in Pterodactyl**: Check that servers are created correctly
4. **Update Frontend**: Ensure dashboard shows new servers

