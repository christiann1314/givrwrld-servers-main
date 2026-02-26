# 🔍 Webhook Debugging - Payment Went Through But No Server

## What We Know
- ✅ Payment succeeded in Stripe
- ✅ Stripe redirection worked
- ❌ No server created in Pterodactyl
- ❌ No order in Supabase (likely)

## Possible Issues

### Issue 1: Webhook Not Called
**Check:** Stripe Dashboard → Webhooks → Recent events
- Look for `checkout.session.completed` event
- Check if it shows **200 OK** or **400/500 error**

### Issue 2: Webhook Called But Failed
**Check:** Supabase Dashboard → Functions → `stripe-webhook` → Logs
- Look for recent invocations
- Check for error messages
- Look for "Checkout session completed" log message

### Issue 3: Order Created But Provisioning Failed
**Check:** Supabase → `orders` table
- Look for order with `status='paid'` but `pterodactyl_server_id=null`
- Check Supabase → Functions → `servers-provision` → Logs

### Issue 4: Session Not in Subscription Mode
**Check:** Webhook logs should show:
- `mode: "subscription"`
- `subscription: "sub_..."`

If mode is not "subscription", the webhook won't create an order.

## Debugging Steps

1. **Check Stripe Webhook Events:**
   - Go to: https://dashboard.stripe.com/webhooks (LIVE mode)
   - Click your webhook endpoint
   - Check "Recent events" tab
   - Look for the most recent `checkout.session.completed`
   - Click on it to see response status

2. **Check Supabase Webhook Logs:**
   - Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions/stripe-webhook/logs
   - Filter by "Last 15 minutes"
   - Look for POST requests
   - Check for error messages

3. **Check if Order Exists:**
   - Query `orders` table in Supabase
   - Look for recent entries

4. **Manually Trigger Provisioning (if order exists):**
   - If order exists but server doesn't, manually call `servers-provision`

## Common Fixes

- **Webhook returning 400:** Check signing secret matches
- **Webhook returning 500:** Check function logs for error
- **Order not created:** Check webhook logs for "Checkout session not in subscription mode"
- **Server not provisioned:** Check `servers-provision` logs and verify user has `external_account`

