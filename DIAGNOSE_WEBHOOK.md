# 🔍 Diagnose Webhook Issue

## What We Know:
✅ Webhook is configured in Stripe Dashboard
✅ Webhook is ACTIVE
✅ 6 events were delivered on Nov 4
✅ All secrets are set correctly
✅ Function code looks correct

## What We Need to Check:

### 1. Check Stripe Dashboard → Webhook → Recent Events
- Click on one of the `checkout.session.completed` events from Nov 4
- Check the **Response** tab:
  - What HTTP status code? (200, 400, 500?)
  - What response body? (Should be `{"received": true}`)
- Check the **Request** tab:
  - What's in `session.mode`? (Should be `"subscription"`)
  - What's in `session.subscription`? (Should be a subscription ID)
  - What's in `session.metadata`? (Should have all the order details)

### 2. Check Supabase Database
Run this query in Supabase SQL Editor:
```sql
SELECT * FROM orders 
WHERE created_at >= '2025-11-04' 
ORDER BY created_at DESC 
LIMIT 10;
```

Are ANY orders created? If yes, are they stuck in provisioning?

### 3. Most Likely Issues:

**Issue A: Session not in subscription mode**
- If `session.mode !== 'subscription'` → webhook logs error but returns 200 OK
- Check: Is checkout creating sessions with `mode: 'subscription'`?

**Issue B: Missing subscription object**
- If `session.subscription` is null → webhook can't create order
- This can happen if webhook fires before subscription is fully created
- Check: Does the event have `session.subscription` populated?

**Issue C: Order creation failing**
- Database constraint violation (duplicate, missing required field)
- Check: What's the exact error in Stripe webhook response?

**Issue D: Silent failure**
- The webhook returns 200 OK but logs an error
- Check: Supabase function logs for error messages

## Next Steps:

1. **Check Stripe Dashboard** → Recent events → Response code
2. **Check Supabase Database** → Are orders being created?
3. **Share the response** from Stripe webhook event details

This will tell us exactly where it's failing.

