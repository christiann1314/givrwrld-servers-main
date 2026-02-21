# Production Checklist - Checkout Flow

## ✅ Pre-Deployment Checklist

### Environment Variables
- [ ] `PUBLIC_SITE_URL` or `FRONTEND_URL` set (e.g., `https://givrwrldservers.com`)
- [ ] `AES_KEY` set (32+ chars, never committed to git)
- [ ] `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` set
- [ ] `JWT_SECRET` set (for authentication)
- [ ] `PORT` set (default: 3001)

### Database Secrets
- [ ] `secrets` table has encrypted `PANEL_URL`
- [ ] `secrets` table has encrypted `PANEL_APP_KEY`
- [ ] `secrets` table has encrypted `STRIPE_SECRET_KEY`
- [ ] `secrets` table has encrypted `STRIPE_WEBHOOK_SECRET`

### Database Schema
- [ ] `order_sessions` table created
- [ ] `v_orders_brief` view created
- [ ] `stripe_events_log` table exists
- [ ] `stripe_subscriptions` table exists
- [ ] All foreign keys and indexes in place

### API Routes
- [ ] `/api/plans` - Returns active plans from MySQL
- [ ] `/api/checkout/create-session` - Creates order + Stripe session
- [ ] `/api/stripe/webhook` - Handles Stripe events
- [ ] `/api/servers/provision` - Provisions servers
- [ ] All routes tested and working

### Frontend
- [ ] `VITE_API_URL` set in `.env`
- [ ] `Checkout.tsx` uses `api.getPlans()` and `stripeService.createCheckoutSession()`
- [ ] No Supabase calls in checkout flow
- [ ] Authentication uses new API

### Stripe Configuration
- [ ] Webhook endpoint configured: `https://YOUR_DOMAIN/api/stripe/webhook`
- [ ] Webhook events selected:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Webhook signing secret stored in `secrets` table
- [ ] Test webhook events received successfully

### Worker/Provisioning
- [ ] API server running (PM2/systemd)
- [ ] Provisioning function tested
- [ ] Pterodactyl API credentials valid
- [ ] Region-to-node mapping configured
- [ ] Plans have `ptero_egg_id` set

### Infrastructure
- [ ] DNS configured for API domain
- [ ] HTTPS/SSL certificate valid
- [ ] Firewall allows webhook traffic
- [ ] API server accessible from Stripe
- [ ] Database accessible from API server

## 🧪 Testing Checklist

### 1. Plans Endpoint
```bash
curl https://YOUR_DOMAIN/api/plans
```
- Should return JSON array of plans
- All plans should have `stripe_price_id` and `ptero_egg_id`

### 2. Checkout Flow
1. Navigate to checkout page
2. Plan should load from API
3. Click "Proceed to Payment"
4. Should redirect to Stripe checkout

### 3. Payment Test
1. Use test card: `4242 4242 4242 4242`
2. Complete payment
3. Should redirect to success page

### 4. Database Verification
```sql
-- Check order created
SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;

-- Check session linked
SELECT * FROM order_sessions ORDER BY created_at DESC LIMIT 1;

-- Check webhook received
SELECT * FROM stripe_events_log ORDER BY received_at DESC LIMIT 5;

-- Check order status progression
SELECT id, status, ptero_server_id, ptero_identifier 
FROM orders 
WHERE id = 'YOUR_ORDER_ID';
```

### 5. Provisioning Verification
- Check API server logs for:
  - "Order updated to paid: [uuid]"
  - "✅ Server provisioning completed"
  - "✅ Server provisioned: [identifier]"
- Check Pterodactyl panel for new server
- Check order has `ptero_server_id` and `ptero_identifier`

## 🐛 Troubleshooting

### No Orders Created
- Check API server logs
- Verify checkout calls `/api/checkout/create-session`
- Check authentication (JWT token valid)
- Verify plan exists in database

### Webhook Not Received
- Check Stripe Dashboard → Webhooks → Events
- Verify webhook URL is correct
- Check webhook secret matches database
- Verify API server is accessible from internet
- Check firewall rules

### Order Stuck at "provisioning"
- Check API server logs for errors
- Verify Pterodactyl credentials
- Check plan has `ptero_egg_id`
- Verify region has node mapped
- Check Pterodactyl API is accessible

### Server Created But Not Stored
- Check provisioning function updates order
- Verify `ptero_server_id` and `ptero_identifier` are saved
- Check for database errors in logs

## 📊 Monitoring Queries

```sql
-- Orders by status
SELECT status, COUNT(*) as count 
FROM orders 
GROUP BY status;

-- Recent provisioning activity
SELECT id, status, ptero_server_id, created_at 
FROM orders 
WHERE status IN ('provisioning', 'provisioned')
ORDER BY created_at DESC 
LIMIT 10;

-- Failed provisions
SELECT id, status, error_message, created_at 
FROM orders 
WHERE status = 'error' 
ORDER BY created_at DESC 
LIMIT 10;

-- Webhook events by type
SELECT type, COUNT(*) as count 
FROM stripe_events_log 
GROUP BY type 
ORDER BY count DESC;
```

## 🚀 Go-Live Steps

1. **Final Database Check**
   ```bash
   ./scripts/test-checkout-flow.sh
   ```

2. **Start API Server**
   ```bash
   cd api
   pm2 start ecosystem.config.js
   # OR
   systemctl start givrwrld-api
   ```

3. **Verify Health**
   ```bash
   curl https://YOUR_DOMAIN/health
   ```

4. **Test Webhook**
   - Send test event from Stripe Dashboard
   - Verify received in `stripe_events_log`

5. **Monitor First Purchase**
   - Watch API logs
   - Check database for order
   - Verify provisioning completes

## ✅ Success Criteria

- [ ] Plans load from API
- [ ] Checkout creates order in MySQL
- [ ] Stripe session created successfully
- [ ] Payment completes
- [ ] Webhook received and processed
- [ ] Order status: pending → paid → provisioning → provisioned
- [ ] Server created in Pterodactyl
- [ ] Server appears in user dashboard

