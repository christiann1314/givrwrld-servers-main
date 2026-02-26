# ✅ Webhook Secret Updated - Ready for Testing

## What Was Fixed
- ✅ Updated `STRIPE_WEBHOOK_SECRET` in Supabase Edge Functions secrets
- ✅ Redeployed `stripe-webhook` function to pick up new secret

## Next Steps - Test the Purchase Flow

### 1. Make a Test Purchase
- Go to your website and purchase any server (e.g., Among Us 1GB)
- Complete the Stripe checkout

### 2. Monitor Webhook Status
**In Supabase Dashboard:**
- Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions
- Click on `stripe-webhook`
- Check **"Logs"** tab for recent invocations
- Should see **200 OK** responses (not 400 errors)

**In Stripe Dashboard:**
- Go to: https://dashboard.stripe.com/webhooks
- Click your webhook endpoint
- Check **"Recent events"** tab
- Should see `checkout.session.completed` with **200 OK** status

### 3. Verify Order Creation
**In Supabase Dashboard:**
- Go to: Table Editor → `orders` table
- Check for new order with:
  - `status = 'paid'`
  - `plan_id` matching your purchase
  - `created_at` timestamp matching purchase time

### 4. Verify Server Provisioning
**In Supabase Dashboard:**
- Check `orders` table again
- Order should show:
  - `status = 'provisioned'` (or `'provisioning'`)
  - `pterodactyl_server_id` populated
  - `pterodactyl_server_identifier` populated

**In Pterodactyl Panel:**
- Go to: https://panel.givrwrldservers.com
- Check if new server appears in server list
- Server should match the `server_name` from the order

**In Your UI Dashboard:**
- Go to: https://givrwrldservers.com/dashboard
- Server should appear in your server list
- Should be able to click "Open Panel" to access Pterodactyl

## Expected Flow (After Fix)

1. ✅ User completes Stripe checkout
2. ✅ Stripe sends `checkout.session.completed` webhook
3. ✅ Supabase webhook function receives event (200 OK)
4. ✅ Order created in `orders` table (`status = 'paid'`)
5. ✅ `servers-provision` function called automatically
6. ✅ Server created in Pterodactyl
7. ✅ Order updated with `pterodactyl_server_id`
8. ✅ Server appears in UI dashboard

## Troubleshooting

**If webhook still returns 400:**
- Double-check signing secret matches exactly between Stripe and Supabase
- Ensure secret was saved in Supabase
- Verify function was redeployed after secret update

**If order created but server not provisioned:**
- Check `servers-provision` function logs
- Verify user has `external_account` record
- Check `ptero_nodes` has available nodes in selected region
- Verify node has free allocations

**If server provisioned but not in dashboard:**
- Check `sync-server-status` function is running
- Verify frontend is polling `orders` table correctly
- Check browser console for errors

## Status
- ✅ Webhook secret updated
- ✅ Function redeployed
- ⏳ **Ready for test purchase**

