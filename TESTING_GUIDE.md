# Complete Testing Guide

## ✅ Setup Complete

### 1. Frontend Environment Variable
```bash
# Added to .env
VITE_API_URL=http://localhost:3001
```

### 2. API Server
```bash
cd api
npm start
```

Server runs on: `http://localhost:3001`

## 🧪 Testing Flow

### Step 1: Start API Server

```bash
cd /home/ubuntu/givrwrld-severs/api
npm start
```

Expected output:
```
🚀 GIVRwrld API Server running on port 3001
📡 Health check: http://localhost:3001/health
✅ MySQL connection pool created
```

### Step 2: Start Frontend

```bash
cd /home/ubuntu/givrwrld-severs
npm run dev
```

Frontend should load with API client configured.

### Step 3: Test Authentication

#### Sign Up
1. Navigate to signup page
2. Enter email and password
3. Submit form
4. **Expected**: User created, JWT token stored, redirected to dashboard

**API Call**: `POST /api/auth/signup`

#### Sign In
1. Navigate to login page
2. Enter credentials
3. Submit form
4. **Expected**: JWT token received, user session created

**API Call**: `POST /api/auth/login`

### Step 4: View Dashboard

1. After login, dashboard should load
2. **Expected**: 
   - User stats displayed
   - Server list (empty if no servers)
   - Billing history

**API Calls**:
- `GET /api/auth/me` - Current user
- `GET /api/servers` - User's servers
- `GET /api/orders` - User's orders

### Step 5: Create Checkout Session

1. Navigate to game selection page
2. Select a plan (e.g., Minecraft 2GB)
3. Configure server (name, region)
4. Click "Purchase" or "Checkout"
5. **Expected**: Redirected to Stripe checkout page

**API Call**: `POST /api/checkout/create-session`

**Check**:
- Stripe checkout URL returned
- Session created with correct plan_id
- Metadata includes user_id, plan_id, region, server_name

### Step 6: Complete Purchase

#### Using Stripe Test Card
1. On Stripe checkout page
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any CVC
5. Complete payment

**Expected Flow**:
1. Stripe webhook received → `checkout.session.completed`
2. Order created in MySQL (status: 'paid')
3. Provisioning automatically triggered
4. Server created in Pterodactyl
5. Order updated (status: 'provisioned', server IDs)

**Webhook**: `POST /api/stripe/webhook`

**Provisioning**: `POST /api/servers/provision`

## 🔍 Verification Steps

### Check Order in Database
```sql
SELECT id, user_id, plan_id, status, ptero_server_id, ptero_identifier, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;
```

### Check User in Database
```sql
SELECT id, email, display_name, pterodactyl_user_id
FROM users
WHERE email = 'your-test-email@example.com';
```

### Check API Logs
Watch API server console for:
- ✅ Order created
- ✅ Provisioning initiated
- ✅ Server provisioned: [identifier] (ID: [id])

### Check Pterodactyl
1. Login to Pterodactyl panel
2. Check "Servers" section
3. New server should appear with:
   - Correct name
   - Correct game/egg
   - Correct resources (RAM, CPU, disk)
   - Assigned to correct user

## 🐛 Troubleshooting

### API Server Won't Start
- Check MySQL connection: `mysql -u app_rw -p app_core`
- Check environment variables: `cat api/.env`
- Check port 3001 is free: `lsof -i :3001`

### Authentication Fails
- Check JWT_SECRET in `api/.env`
- Check MySQL users table has test user
- Check API logs for errors

### Checkout Session Fails
- Verify plan has `stripe_price_id` in database
- Check Stripe API key in MySQL secrets
- Verify plan is active (`is_active = 1`)

### Provisioning Fails
- Check order status: `SELECT status, error_message FROM orders WHERE id = '...'`
- Verify plan has `ptero_egg_id`
- Check region has node mapped
- Verify Pterodactyl API credentials
- Check API logs for detailed error

### Webhook Not Received
- Check Stripe webhook endpoint: `https://your-domain.com/api/stripe/webhook`
- Verify webhook secret in MySQL
- Check Stripe dashboard → Webhooks → Events

## 📊 Expected Database State

After successful purchase:

```sql
-- Order should exist
SELECT * FROM orders WHERE user_id = '...';

-- Should have:
-- status: 'provisioned'
-- ptero_server_id: [number]
-- ptero_identifier: '[string]'
-- error_message: NULL

-- User should have Pterodactyl account
SELECT pterodactyl_user_id FROM users WHERE id = '...';
-- Should return: [number]
```

## 🎯 Success Criteria

✅ User can sign up and sign in
✅ Dashboard loads with user data
✅ Checkout session created successfully
✅ Payment completes via Stripe
✅ Order created in MySQL
✅ Server provisioned in Pterodactyl
✅ Order updated with server details
✅ Server appears in user's dashboard

## 🚀 Next Steps After Testing

1. **Production Deployment**:
   - Update `VITE_API_URL` to production domain
   - Set up reverse proxy (Nginx)
   - Configure PM2 for process management
   - Set up SSL certificates

2. **Monitoring**:
   - Set up error logging
   - Monitor provisioning success rate
   - Track order statuses
   - Alert on failures

3. **Optimization**:
   - Add retry logic for failed provisions
   - Implement queue system for high volume
   - Add caching for plans/eggs
   - Optimize database queries

