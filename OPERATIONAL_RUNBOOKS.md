# Operational Runbooks - GIVRWRLD Servers

**Date:** 2025-11-09  
**Purpose:** Standard operating procedures for production operations

---

## 1. Retrying Failed Provisioning Attempts

### When to Use
- Order status is `paid` but no server was created
- Order status is `error` after provisioning attempt
- `pterodactyl_server_id` is NULL but order should have a server

### Step-by-Step Procedure

#### Step 1: Identify Failed Order
```sql
-- Find orders that are paid but not provisioned
SELECT 
  id,
  user_id,
  plan_id,
  server_name,
  status,
  pterodactyl_server_id,
  created_at,
  updated_at
FROM orders
WHERE status IN ('paid', 'error')
  AND (pterodactyl_server_id IS NULL OR pterodactyl_server_id = '')
ORDER BY created_at DESC
LIMIT 10;
```

#### Step 2: Check Provisioning Logs
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions/servers-provision
2. Click "Logs" tab
3. Filter by time range (last hour)
4. Look for error messages related to the order ID

#### Step 3: Check Error Details
Common errors:
- **"No available nodes"** → Node capacity issue, check `ptero_nodes` table
- **"Failed to create server: 422"** → Pterodactyl API error, check egg ID/config
- **"External account not found"** → User needs panel account, run panel sync

#### Step 4: Fix Prerequisites (if needed)
```sql
-- Check if user has panel account
SELECT * FROM external_accounts WHERE user_id = 'USER_ID';

-- If missing, create via function (see Panel Account Sync below)
```

#### Step 5: Manually Trigger Provisioning
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions/servers-provision
2. Click "Invoke function"
3. Set Role: **service role**
4. Payload:
```json
{
  "order_id": "ORDER_ID_FROM_STEP_1"
}
```
5. Click "Invoke"
6. Check response for success/error

#### Step 6: Verify Server Created
```sql
-- Check order updated
SELECT 
  id,
  status,
  pterodactyl_server_id,
  pterodactyl_server_identifier,
  updated_at
FROM orders
WHERE id = 'ORDER_ID';
```

- Status should be `provisioned` or `active`
- `pterodactyl_server_id` should be populated

#### Step 7: Verify in Pterodactyl
1. Go to: https://panel.givrwrldservers.com
2. Check server list for new server
3. Server name should match `server_name` from order

---

## 2. Syncing Panel Accounts (create-pterodactyl-user)

### When to Use
- User complains they can't access Pterodactyl panel
- Provisioning fails with "External account not found"
- User wants to create panel account manually

### Step-by-Step Procedure

#### Step 1: Check if Account Exists
```sql
SELECT 
  user_id,
  pterodactyl_user_id,
  created_at
FROM external_accounts
WHERE user_id = 'USER_ID';
```

#### Step 2: Invoke Panel Sync Function
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions/create-pterodactyl-user
2. Click "Invoke function"
3. Set Role: **service role** OR use authenticated user's JWT
4. Payload:
```json
{
  "userId": "USER_ID"
}
```
5. Click "Invoke"

#### Step 3: Check Response
- **Success:** Returns `pterodactyl_user_id` and `password`
- **Error:** Check error message for details

#### Step 4: Verify Account Created
```sql
-- Check external_accounts updated
SELECT * FROM external_accounts WHERE user_id = 'USER_ID';
```

#### Step 5: Test Panel Access
1. Go to: https://panel.givrwrldservers.com
2. Login with user's email and password from function response
3. Verify user can access their servers

---

## 3. Monitoring Provisioning Health

### Key Metrics to Monitor

#### Orders Stuck in "paid" Status
```sql
-- Find orders stuck in paid status > 10 minutes
SELECT 
  id,
  user_id,
  plan_id,
  server_name,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutes_ago
FROM orders
WHERE status = 'paid'
  AND created_at < NOW() - INTERVAL '10 minutes'
ORDER BY created_at ASC;
```

**Action:** If any found, investigate and retry provisioning (see Runbook #1)

#### Provisioning Errors
```sql
-- Find orders with error status
SELECT 
  id,
  user_id,
  plan_id,
  status,
  created_at,
  updated_at
FROM orders
WHERE status = 'error'
ORDER BY updated_at DESC
LIMIT 20;
```

**Action:** Review error logs and retry provisioning

#### Failed Webhook Events
1. Go to: Stripe Dashboard → Webhooks → Recent events
2. Filter for `checkout.session.completed` events
3. Check for non-200 status codes
4. Review failed event details

**Action:** Check Supabase webhook logs for errors

---

## 4. Setting Up Alerts

### Supabase Log Drains (Recommended)

1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/logs
2. Configure log drain to:
   - **Discord/Slack webhook** for real-time alerts
   - **CloudWatch/Datadog** for monitoring
   - **Email** for critical errors

### Alert Conditions

#### Critical Alerts (Immediate Notification)
- Provisioning function returns 500 errors
- Webhook function returns 500 errors
- Orders stuck in `paid` > 15 minutes
- Multiple orders in `error` status

#### Warning Alerts (Daily Summary)
- Provisioning function errors > 5% of requests
- Orders taking > 5 minutes to provision
- Node capacity > 80%

### SQL Queries for Monitoring

```sql
-- Provisioning success rate (last hour)
SELECT 
  COUNT(*) FILTER (WHERE status = 'provisioned') * 100.0 / COUNT(*) as success_rate
FROM orders
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND status IN ('paid', 'provisioning', 'provisioned', 'error');

-- Average provisioning time
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) / 60 as avg_minutes
FROM orders
WHERE status = 'provisioned'
  AND updated_at > NOW() - INTERVAL '24 hours';

-- Node capacity utilization
SELECT 
  n.name,
  n.max_ram_gb,
  n.reserved_headroom_gb,
  COALESCE(SUM(p.ram_gb), 0) as used_ram_gb,
  (n.max_ram_gb - n.reserved_headroom_gb - COALESCE(SUM(p.ram_gb), 0)) as available_ram_gb
FROM ptero_nodes n
LEFT JOIN orders o ON o.node_id = n.id
LEFT JOIN plans p ON p.id = o.plan_id
WHERE n.enabled = true
  AND o.status IN ('paid', 'provisioning', 'installing', 'provisioned', 'active')
GROUP BY n.id, n.name, n.max_ram_gb, n.reserved_headroom_gb;
```

---

## 5. Emergency Procedures

### If Webhook Stops Working
1. Check Stripe Dashboard → Webhooks → Endpoint status
2. Verify webhook is **Active** (not disabled)
3. Check Supabase function logs for errors
4. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
5. Test webhook manually via Stripe Dashboard

### If Provisioning Completely Fails
1. Check Pterodactyl panel is accessible
2. Verify `PANEL_URL` and `PTERO_APP_KEY` secrets are set
3. Test Pterodactyl API directly:
```bash
curl -H "Authorization: Bearer ptla_..." \
  https://panel.givrwrldservers.com/api/application/users
```
4. Check node allocations exist
5. Verify egg IDs are correct

### If Database is Slow
1. Check active queries:
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```
2. Check table sizes and indexes
3. Review slow query log
4. Consider connection pooling

---

## 6. Customer Support Procedures

### Customer Can't Access Panel
1. Check if panel account exists (Runbook #2)
2. If missing, create via `create-pterodactyl-user`
3. Provide customer with login credentials
4. Verify customer can access panel

### Customer's Server Not Provisioned
1. Check order status in database
2. Review provisioning logs
3. If stuck, retry provisioning (Runbook #1)
4. If failed, investigate error and fix
5. Update customer with status

### Customer Wants to Cancel/Refund
1. Cancel subscription in Stripe Dashboard
2. Update order status to `canceled`:
```sql
UPDATE orders 
SET status = 'canceled' 
WHERE id = 'ORDER_ID';
```
3. Optionally delete server in Pterodactyl (if customer requests)
4. Process refund if applicable

---

## 7. Daily Health Checks

### Morning Checklist
- [ ] Check for orders stuck in `paid` overnight
- [ ] Review error logs from previous 24 hours
- [ ] Verify all nodes have available capacity
- [ ] Check webhook event success rate

### Weekly Checklist
- [ ] Review provisioning success rate
- [ ] Check node capacity utilization
- [ ] Review customer support tickets
- [ ] Update documentation if needed

---

## Quick Reference Commands

### Find Stuck Orders
```sql
SELECT id, user_id, plan_id, status, created_at 
FROM orders 
WHERE status = 'paid' 
  AND created_at < NOW() - INTERVAL '10 minutes';
```

### Retry Provisioning
```bash
# Via Supabase Dashboard → Functions → servers-provision
# Payload: { "order_id": "ORDER_ID" }
```

### Create Panel Account
```bash
# Via Supabase Dashboard → Functions → create-pterodactyl-user
# Payload: { "userId": "USER_ID" }
```

### Check Function Logs
- Supabase Dashboard → Functions → [function-name] → Logs
- Filter by time range and error level

---

**Last Updated:** 2025-11-09  
**Next Review:** After first production incidents

