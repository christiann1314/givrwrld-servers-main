# Server Provisioning - Complete Implementation

## ✅ What's Been Implemented

### 1. Full Provisioning Flow (`api/routes/servers.js`)

The `/api/servers/provision` endpoint now includes:

- **Order Validation**: Checks order exists and is in 'paid' status
- **Node Selection**: Gets appropriate Pterodactyl node for the region
- **User Management**: Gets or creates Pterodactyl user account
- **Egg Configuration**: Fetches egg details (docker image, startup command) from MySQL
- **Allocation Management**: Finds available IP/port allocation
- **Server Creation**: Creates server in Pterodactyl with correct configuration
- **Order Updates**: Updates order with Pterodactyl server ID and identifier

### 2. Database Schema Updates

Added `pterodactyl_user_id` column to `users` table:
```sql
ALTER TABLE users ADD COLUMN pterodactyl_user_id INT NULL;
```

This allows linking GIVRwrld users to their Pterodactyl accounts.

### 3. Utility Functions (`api/utils/mysql.js`)

New helper functions:
- `getNodeForRegion(regionCode)` - Gets Pterodactyl node for a region
- `getOrCreatePterodactylUser(userId, email, displayName, panelUrl, panelAppKey)` - Creates/links Pterodactyl user
- `getAvailableAllocation(nodeId, panelUrl, panelAppKey)` - Finds free IP/port allocation

### 4. Webhook Integration (`api/routes/stripe.js`)

The Stripe webhook now automatically triggers provisioning:
- On `checkout.session.completed` event
- Creates order in MySQL
- Automatically calls `/api/servers/provision` for game servers
- Handles errors gracefully

## 🔄 Complete Flow

```
1. User selects plan → Checkout API
   ↓
2. Stripe checkout session created
   ↓
3. User completes payment
   ↓
4. Stripe webhook → checkout.session.completed
   ↓
5. Order created in MySQL (status: 'paid')
   ↓
6. Auto-trigger provisioning API
   ↓
7. Provisioning:
   - Get node for region
   - Get/create Pterodactyl user
   - Get egg configuration
   - Get available allocation
   - Create server in Pterodactyl
   - Update order (status: 'provisioned', server IDs)
   ↓
8. Server appears in user's dashboard
```

## 🧪 Testing

### Manual Provisioning Test

```bash
# Test provisioning endpoint directly
curl -X POST http://localhost:3001/api/servers/provision \
  -H "Content-Type: application/json" \
  -d '{"order_id": "your-order-id"}'
```

### End-to-End Test

1. **Create checkout session** (via frontend or API)
2. **Complete payment** (use Stripe test card)
3. **Check webhook logs** - should see order creation
4. **Check provisioning logs** - should see server creation
5. **Verify in Pterodactyl** - server should appear
6. **Check MySQL** - order should have `ptero_server_id` and `ptero_identifier`

## 📋 Requirements Checklist

- ✅ Plan has `ptero_egg_id` configured
- ✅ Plan has `stripe_price_id` configured
- ✅ Region has node mapped in `region_node_map`
- ✅ Node has available allocations
- ✅ Pterodactyl API credentials in MySQL secrets
- ✅ User email exists in system

## 🚨 Error Handling

The system handles:
- Missing plan/egg configuration
- No node for region
- Pterodactyl API failures
- Allocation issues
- User creation failures

All errors are logged and order status is updated with error message.

## 🔧 Configuration

Ensure these are set in MySQL `secrets` table:
- `panel.PANEL_URL` - Pterodactyl panel URL
- `panel.PANEL_APP_KEY` - Pterodactyl Application API key

Environment variables:
- `AES_KEY` - For decrypting secrets
- `API_URL` - API server URL (for webhook → provisioning call)

## 📊 Monitoring

Check order status:
```sql
SELECT id, status, ptero_server_id, ptero_identifier, error_message 
FROM orders 
WHERE status IN ('provisioning', 'error') 
ORDER BY created_at DESC;
```

## 🎯 Next Steps

1. **Test with real Stripe payment**
2. **Monitor provisioning logs**
3. **Verify servers appear in Pterodactyl**
4. **Test different games/regions**
5. **Add monitoring/alerts for failed provisions**

