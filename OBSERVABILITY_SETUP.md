# Observability & Monitoring Setup

**Date:** 2025-11-09  
**Purpose:** Configure logging, alerts, and monitoring for production operations

---

## 1. Supabase Log Drains

### Setting Up Log Drains

#### Option A: Discord Webhook (Recommended for Small Teams)

1. **Create Discord Webhook:**
   - Go to Discord Server → Settings → Integrations → Webhooks
   - Create new webhook
   - Copy webhook URL

2. **Configure Supabase Log Drain:**
   - Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/logs
   - Click "Add Log Drain"
   - Select "Webhook" type
   - Paste Discord webhook URL
   - Select logs: **Edge Functions** (all functions)
   - Save

#### Option B: CloudWatch / Datadog (For Scale)

1. **CloudWatch:**
   - Create CloudWatch log group
   - Set up IAM role with write permissions
   - Configure Supabase log drain to CloudWatch endpoint

2. **Datadog:**
   - Create Datadog API key
   - Configure Supabase log drain to Datadog endpoint

---

## 2. Alert Conditions

### Critical Alerts (Trigger Immediately)

#### Alert 1: Provisioning Function Errors
**Condition:** `servers-provision` function returns 500 errors  
**Frequency:** Any occurrence  
**Action:** Notify on-call engineer immediately

**Query:**
```sql
-- Check for recent provisioning errors in orders
SELECT COUNT(*) 
FROM orders 
WHERE status = 'error' 
  AND updated_at > NOW() - INTERVAL '15 minutes';
```

#### Alert 2: Orders Stuck in "paid" Status
**Condition:** Orders in `paid` status > 15 minutes  
**Frequency:** Every 5 minutes  
**Action:** Create ticket for manual review

**Query:**
```sql
SELECT 
  id,
  user_id,
  plan_id,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutes_stuck
FROM orders
WHERE status = 'paid'
  AND created_at < NOW() - INTERVAL '15 minutes'
ORDER BY created_at ASC;
```

#### Alert 3: Webhook Function Failures
**Condition:** `stripe-webhook` returns 500 errors  
**Frequency:** Any occurrence  
**Action:** Notify on-call engineer immediately

**Monitoring:** Check Stripe Dashboard → Webhooks → Recent events for failed deliveries

#### Alert 4: High Error Rate
**Condition:** > 10% of provisioning attempts fail in last hour  
**Frequency:** Every hour  
**Action:** Review error logs and investigate root cause

**Query:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*) as error_rate
FROM orders
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND status IN ('provisioned', 'error');
```

### Warning Alerts (Daily Summary)

#### Alert 5: Slow Provisioning
**Condition:** Average provisioning time > 5 minutes  
**Frequency:** Daily summary  
**Action:** Review performance, check node capacity

**Query:**
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) / 60 as avg_minutes
FROM orders
WHERE status = 'provisioned'
  AND updated_at > NOW() - INTERVAL '24 hours';
```

#### Alert 6: High Node Capacity
**Condition:** Node capacity utilization > 80%  
**Frequency:** Daily summary  
**Action:** Plan for additional node capacity

**Query:**
```sql
SELECT 
  n.name,
  n.max_ram_gb,
  n.reserved_headroom_gb,
  COALESCE(SUM(p.ram_gb), 0) as used_ram_gb,
  (n.max_ram_gb - n.reserved_headroom_gb - COALESCE(SUM(p.ram_gb), 0)) as available_ram_gb,
  (COALESCE(SUM(p.ram_gb), 0) * 100.0 / (n.max_ram_gb - n.reserved_headroom_gb)) as utilization_percent
FROM ptero_nodes n
LEFT JOIN orders o ON o.node_id = n.id
LEFT JOIN plans p ON p.id = o.plan_id
WHERE n.enabled = true
  AND o.status IN ('paid', 'provisioning', 'installing', 'provisioned', 'active')
GROUP BY n.id, n.name, n.max_ram_gb, n.reserved_headroom_gb
HAVING (COALESCE(SUM(p.ram_gb), 0) * 100.0 / (n.max_ram_gb - n.reserved_headroom_gb)) > 80;
```

---

## 3. Monitoring Dashboard Queries

### Real-Time Metrics

#### Active Orders by Status
```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY count DESC;
```

#### Provisioning Success Rate (Last 24h)
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'provisioned') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('paid', 'provisioning', 'provisioned', 'error')), 0) 
  as success_rate
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours';
```

#### Average Provisioning Time by Game
```sql
SELECT 
  p.game,
  COUNT(*) as order_count,
  AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))) / 60 as avg_minutes
FROM orders o
JOIN plans p ON p.id = o.plan_id
WHERE o.status = 'provisioned'
  AND o.updated_at > NOW() - INTERVAL '24 hours'
GROUP BY p.game
ORDER BY avg_minutes DESC;
```

#### Node Capacity Overview
```sql
SELECT 
  n.name,
  n.region,
  n.max_ram_gb,
  n.reserved_headroom_gb,
  COALESCE(SUM(p.ram_gb), 0) as used_ram_gb,
  (n.max_ram_gb - n.reserved_headroom_gb - COALESCE(SUM(p.ram_gb), 0)) as available_ram_gb,
  ROUND((COALESCE(SUM(p.ram_gb), 0) * 100.0 / NULLIF(n.max_ram_gb - n.reserved_headroom_gb, 0)), 2) as utilization_percent
FROM ptero_nodes n
LEFT JOIN orders o ON o.node_id = n.id AND o.status IN ('paid', 'provisioning', 'installing', 'provisioned', 'active')
LEFT JOIN plans p ON p.id = o.plan_id
WHERE n.enabled = true
GROUP BY n.id, n.name, n.region, n.max_ram_gb, n.reserved_headroom_gb
ORDER BY utilization_percent DESC;
```

---

## 4. Logging Best Practices

### Function Logging

All Edge Functions should log:
- **Entry point:** Function invoked with request details
- **Key steps:** Major workflow milestones
- **Errors:** Full error details with context
- **Exit point:** Function completed with result

### Example Logging Pattern

```typescript
console.log('Provisioning started:', { order_id, user_id, plan_id });
console.log('Node selected:', { node_id, node_name, available_ram });
console.log('Server created:', { server_id, identifier });
console.error('Provisioning failed:', { order_id, error: error.message, stack: error.stack });
```

### Structured Logging (Future Enhancement)

Consider using structured logging format:
```typescript
console.log(JSON.stringify({
  level: 'info',
  timestamp: new Date().toISOString(),
  function: 'servers-provision',
  order_id: order.id,
  action: 'node_selected',
  data: { node_id, available_ram }
}));
```

---

## 5. Alert Channels

### Discord Webhook Setup

1. **Create Webhook** in Discord server
2. **Format Messages:**
   ```
   🚨 **Critical Alert: Provisioning Failed**
   Order ID: `order_123`
   User ID: `user_456`
   Error: Failed to create server: 422 ValidationException
   Time: 2025-11-09 12:34:56 UTC
   ```

### Email Alerts (For Critical Issues)

Configure email alerts for:
- Multiple provisioning failures in short time
- Webhook completely down
- Database connectivity issues

---

## 6. Monitoring Tools Integration

### Supabase Dashboard
- **Edge Functions Logs:** Real-time function logs
- **Database Logs:** Query performance and errors
- **API Logs:** Request/response logs

### External Monitoring (Optional)

#### Uptime Monitoring
- **UptimeRobot** or **Pingdom**
- Monitor: https://givrwrldservers.com
- Alert if site down > 2 minutes

#### Application Performance Monitoring (APM)
- **Sentry** for error tracking
- **New Relic** or **Datadog** for APM
- Track function execution times

---

## 7. Automated Health Checks

### Daily Health Check Script

```bash
#!/bin/bash
# Run daily at 9 AM UTC

# Check for stuck orders
STUCK=$(psql -c "SELECT COUNT(*) FROM orders WHERE status = 'paid' AND created_at < NOW() - INTERVAL '15 minutes';")

if [ "$STUCK" -gt 0 ]; then
  curl -X POST "$DISCORD_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"⚠️ Alert: $STUCK orders stuck in paid status\"}"
fi

# Check error rate
ERROR_RATE=$(psql -c "SELECT COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '24 hours';")

if (( $(echo "$ERROR_RATE > 10" | bc -l) )); then
  curl -X POST "$DISCORD_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"🚨 Alert: Error rate is ${ERROR_RATE}% (threshold: 10%)\"}"
fi
```

---

## 8. Log Retention

### Supabase Logs
- **Edge Functions:** 7 days retention
- **Database Logs:** 30 days retention
- **API Logs:** 7 days retention

### External Log Drains
- **Discord:** Permanent (unless manually deleted)
- **CloudWatch:** Configure retention policy (30-90 days recommended)
- **Datadog:** Based on plan (usually 15-30 days)

---

## 9. Incident Response

### When Alert Triggers

1. **Acknowledge Alert** - Mark as investigating
2. **Check Logs** - Review relevant function logs
3. **Identify Root Cause** - Use runbooks (see OPERATIONAL_RUNBOOKS.md)
4. **Fix Issue** - Apply fix or retry operation
5. **Verify Resolution** - Confirm fix worked
6. **Document** - Update runbooks if new pattern discovered

### Escalation Path

1. **Level 1:** Automated retry (if applicable)
2. **Level 2:** On-call engineer (manual intervention)
3. **Level 3:** Engineering team lead (complex issues)
4. **Level 4:** CTO (critical production issues)

---

## 10. Metrics to Track

### Key Performance Indicators (KPIs)

1. **Provisioning Success Rate:** Target > 99%
2. **Average Provisioning Time:** Target < 3 minutes
3. **Webhook Success Rate:** Target > 99.9%
4. **Node Capacity Utilization:** Target < 80%
5. **Customer Support Tickets:** Track per day/week

### Business Metrics

1. **Orders per Day:** Track growth
2. **Revenue per Day:** Track revenue
3. **Popular Games:** Which games sell most
4. **Customer Retention:** Repeat customers

---

**Last Updated:** 2025-11-09  
**Next Review:** After first week of production

