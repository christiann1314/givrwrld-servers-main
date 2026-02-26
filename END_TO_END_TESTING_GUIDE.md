# End-to-End Testing Guide

## Pre-Test Checklist

### ✅ System Status
- [x] All 153 plans created
- [x] All plans have Stripe prices
- [x] Stripe API key updated
- [ ] API server running
- [ ] Frontend accessible
- [ ] Stripe webhook endpoint configured

## Test Scenarios

### Test 1: Browse Plans
**Goal**: Verify plans are displayed correctly

1. **Navigate to frontend**
   - Go to your frontend URL
   - Navigate to a game configuration page (e.g., `/configure/minecraft`)

2. **Verify Plans Display**
   - Check that game types (eggs) are shown
   - Check that RAM tiers are available
   - Verify prices match database

3. **Check API Endpoint**
   ```bash
   curl http://localhost:3001/api/plans | jq '.plans | length'
   ```
   Should return: `153`

### Test 2: Create Checkout Session
**Goal**: Verify checkout flow works

1. **Select a plan**
   - Choose a game (e.g., Minecraft)
   - Choose a game type (e.g., Paper)
   - Choose a RAM tier (e.g., 4GB)

2. **Initiate Checkout**
   - Click "Deploy Server" or checkout button
   - Should redirect to Stripe Checkout

3. **Verify Order Created**
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
   ```
   - Should show order with `status = 'pending'`
   - Should have `plan_id` matching selected plan
   - Should have `stripe_session_id` in `order_sessions` table

### Test 3: Complete Payment (Test Mode)
**Goal**: Verify payment processing

1. **Use Stripe Test Card**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

2. **Complete Payment**
   - Fill in test card details
   - Submit payment
   - Should redirect to success page

3. **Verify Webhook Processing**
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
   ```
   - Order status should be `paid`
   - Check `stripe_events_log` for webhook events
   - Check `stripe_subscriptions` table

### Test 4: Server Provisioning
**Goal**: Verify auto-provisioning works

1. **Check Order Status**
   ```sql
   SELECT id, status, pterodactyl_server_id, pterodactyl_server_identifier 
   FROM orders 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

2. **Verify Pterodactyl Server**
   - Check Pterodactyl panel
   - Server should be created with correct:
     - Name
     - Egg (game type)
     - Resources (RAM, CPU, disk)
     - User assignment

3. **Check API Logs**
   - Look for provisioning logs
   - Should see: "✅ Server provisioned"

### Test 5: View Server in Dashboard
**Goal**: Verify frontend displays server

1. **Navigate to Dashboard**
   - Go to user dashboard
   - Should see newly created server

2. **Verify Server Details**
   - Server name matches
   - Game type matches
   - Status shows as active
   - Pterodactyl link works

## Quick Test Commands

### Check API Health
```bash
curl http://localhost:3001/api/plans | jq '.plans | length'
```

### Check Recent Orders
```sql
SELECT 
  o.id,
  o.status,
  o.plan_id,
  o.server_name,
  o.pterodactyl_server_id,
  os.stripe_session_id
FROM orders o
LEFT JOIN order_sessions os ON os.order_id = o.id
ORDER BY o.created_at DESC
LIMIT 5;
```

### Check Stripe Events
```sql
SELECT event_id, type, received_at
FROM stripe_events_log
ORDER BY received_at DESC
LIMIT 10;
```

### Check Provisioning Status
```sql
SELECT 
  id,
  status,
  pterodactyl_server_id,
  pterodactyl_server_identifier,
  error_message
FROM orders
WHERE status IN ('provisioning', 'provisioned', 'error')
ORDER BY created_at DESC
LIMIT 5;
```

## Expected Flow

```
1. User selects plan
   ↓
2. Frontend calls: POST /api/checkout/create-session
   ↓
3. API creates order (status: pending)
   ↓
4. API creates Stripe checkout session
   ↓
5. User redirected to Stripe
   ↓
6. User completes payment
   ↓
7. Stripe sends webhook: POST /api/stripe/webhook
   ↓
8. Webhook updates order (status: paid)
   ↓
9. Webhook triggers provisioning
   ↓
10. Server created in Pterodactyl
   ↓
11. Order updated (status: provisioned)
   ↓
12. User sees server in dashboard
```

## Troubleshooting

### API Server Not Running
```bash
cd api
npm start
# Or with PM2:
pm2 start ecosystem.config.js
```

### Webhook Not Receiving Events
- Check Stripe Dashboard → Webhooks
- Verify endpoint URL is correct
- Check webhook secret in database

### Provisioning Fails
- Check Pterodactyl API key in database
- Verify node/region mapping
- Check API logs for errors
- Verify egg IDs match

### Frontend Not Loading Plans
- Check `VITE_API_URL` environment variable
- Verify API server is accessible
- Check browser console for errors

## Success Criteria

✅ Plans load in frontend
✅ Checkout session created
✅ Order created in database
✅ Payment processed
✅ Webhook received and processed
✅ Server provisioned in Pterodactyl
✅ Server visible in dashboard

## Next Steps After Testing

1. **If all tests pass**: System is production-ready!
2. **If issues found**: Check logs and fix accordingly
3. **Monitor**: Watch for any errors in production

