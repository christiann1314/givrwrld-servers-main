# Provisioning Fix - Webhook Issue Resolved

## 🐛 Problem Identified

The Stripe webhook was trying to call the provisioning API via HTTP:
```javascript
const apiUrl = process.env.API_URL || 'http://localhost:3001';
await fetch(`${apiUrl}/api/servers/provision`, ...)
```

**Issue**: When Stripe sends webhooks from their servers, they can't reach `localhost:3001`. This caused provisioning to fail silently.

## ✅ Solution Implemented

Changed the webhook to call the provisioning function **directly** instead of making an HTTP request:

```javascript
// Before (broken):
const provisionResponse = await fetch(`${apiUrl}/api/servers/provision`, ...);

// After (fixed):
const { provisionServer } = await import('./servers.js');
const result = await provisionServer(orderId);
```

## 📝 Changes Made

1. **`api/routes/servers.js`**:
   - Extracted provisioning logic into `provisionServer()` function
   - Made it exportable for direct calls
   - Kept HTTP endpoint for manual triggers

2. **`api/routes/stripe.js`**:
   - Changed from HTTP fetch to direct function call
   - Removed dependency on `API_URL` for internal calls
   - Better error handling

## 🧪 Testing

### Test with Existing Order

If you have a recent order that failed to provision:

```bash
# 1. Find the order ID
mysql -u app_rw -p app_core -e "SELECT id, status, error_message FROM orders ORDER BY created_at DESC LIMIT 1;"

# 2. Manually trigger provisioning
curl -X POST http://localhost:3001/api/servers/provision \
  -H 'Content-Type: application/json' \
  -d '{"order_id": "YOUR_ORDER_ID"}'
```

### Test with New Purchase

1. Restart API server: `cd api && npm start`
2. Make a new purchase
3. Check API logs for provisioning messages
4. Verify server appears in Pterodactyl

## 🔍 Verification

Check order status:
```sql
SELECT id, status, ptero_server_id, ptero_identifier, error_message 
FROM orders 
WHERE status IN ('paid', 'provisioning', 'provisioned', 'error')
ORDER BY created_at DESC;
```

Expected flow:
1. Order created → `status = 'paid'`
2. Provisioning starts → `status = 'provisioning'`
3. Server created → `status = 'provisioned'`, `ptero_server_id` and `ptero_identifier` populated

## 🚨 If Still Not Working

Check these:

1. **API Server Running**: `curl http://localhost:3001/api/health`
2. **Webhook Received**: Check Stripe dashboard → Webhooks → Events
3. **Order Created**: Check MySQL `orders` table
4. **Pterodactyl Credentials**: Verify in MySQL `secrets` table
5. **Plan Configuration**: Ensure plan has `ptero_egg_id`
6. **Region Mapping**: Check `region_node_map` table has entry for region
7. **API Logs**: Watch console for error messages

## 📊 Expected Logs

Successful provisioning should show:
```
Order created: [order-id]
✅ Server provisioning completed for order: [order-id] { server_id: ..., server_identifier: ... }
✅ Server provisioned: [identifier] (ID: [id]) for order [order-id]
```

