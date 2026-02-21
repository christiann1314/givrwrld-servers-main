# Purchase Flow Audit - Terraria Server Issue

**Date:** $(date)
**Issue:** Terraria purchase completed but no server provisioned, no data in dashboard

---

## 🔍 Audit Steps

### 1. Database State
- Check recent orders in MySQL
- Check Stripe events log
- Verify plan configuration

### 2. Webhook Configuration
- Verify Stripe webhook URL points to correct endpoint
- Check if webhook handler uses Supabase or MySQL
- Verify webhook secret matches

### 3. Frontend Data Fetching
- Check how dashboard fetches orders/servers
- Verify if using Supabase or MySQL
- Check for errors in browser console

### 4. Provisioning Flow
- Check if provisioning function is called
- Verify Pterodactyl API connection
- Check server creation logs

---

## 🔧 Diagnostic Queries

Run these to diagnose:

```sql
-- Check recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;

-- Check Stripe events
SELECT * FROM stripe_events_log ORDER BY received_at DESC LIMIT 5;

-- Check Terraria plan
SELECT * FROM plans WHERE game = 'terraria' OR id LIKE 'terraria%';

-- Check if order exists but no server
SELECT o.*, p.game, p.ptero_egg_id 
FROM orders o
LEFT JOIN plans p ON p.id = o.plan_id
WHERE o.status = 'paid' AND o.ptero_server_id IS NULL
ORDER BY o.created_at DESC;
```

---

## 🚨 Common Issues

1. **Webhook not configured in Stripe Dashboard**
2. **Webhook handler uses Supabase but database is MySQL**
3. **Frontend fetches from Supabase but data is in MySQL**
4. **Provisioning function not triggered**
5. **Pterodactyl API key incorrect**

---

**Run diagnostic queries above to identify the issue.**
