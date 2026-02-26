# Testing Checklist - Post Code Review Fixes

**Date:** 2025-11-07  
**Status:** Ready for Testing

---

## Critical Tests (Must Test)

### 1. ✅ Server Provisioning (Fixed Bug)
**What to test:** The undefined variable fix (`plan_id` → `plan.id`, `region` → `order.region`)

**Steps:**
1. Make a test purchase through the frontend
2. Complete Stripe checkout
3. Monitor `servers-provision` function logs
4. **Expected:** Server should provision successfully OR show proper error message if capacity unavailable
5. **Before fix:** Would crash with "undefined variable" error
6. **After fix:** Should show proper error: "No available capacity for plan {plan.id} in region {order.region}"

**Where to check:**
- Supabase Dashboard → Edge Functions → `servers-provision` → Logs
- Database → `orders` table (check status)

---

### 2. ✅ Start Server (Fixed API Endpoint)
**What to test:** Power control now uses correct application API endpoint

**Steps:**
1. Ensure you have a provisioned server in your dashboard
2. Click "Start Server" button
3. **Expected:** Server should start successfully
4. **Before fix:** Would fail with 403/404 (wrong API endpoint)
5. **After fix:** Should work with application API

**Where to check:**
- Supabase Dashboard → Edge Functions → `start-server` → Logs
- Pterodactyl Panel → Check server status
- Frontend dashboard → Server status should update

---

### 3. ✅ Stop Server (Fixed API Endpoint)
**What to test:** Power control now uses correct application API endpoint

**Steps:**
1. With a running server, click "Stop Server" button
2. **Expected:** Server should stop successfully
3. **Before fix:** Would fail with 403/404 (wrong API endpoint)
4. **After fix:** Should work with application API

**Where to check:**
- Supabase Dashboard → Edge Functions → `stop-server` → Logs
- Pterodactyl Panel → Check server status
- Frontend dashboard → Server status should update

---

### 4. ✅ CORS Security (Frontend Access)
**What to test:** CORS origin validation still allows frontend requests

**Steps:**
1. Open browser DevTools → Network tab
2. Make requests from https://givrwrldservers.com:
   - Create checkout session
   - Start/stop server
   - Create Pterodactyl user
3. **Expected:** All requests should succeed (200 OK)
4. **Check:** No CORS errors in console

**Where to check:**
- Browser Console → No CORS errors
- Network tab → Response headers should include `Access-Control-Allow-Origin: https://givrwrldservers.com`

---

## Important Tests (Should Test)

### 5. Error Handling Improvements
**What to test:** Error responses are now properly formatted JSON

**Steps:**
1. Try to start a server that doesn't exist
2. Try to provision with invalid data
3. **Expected:** All errors should return JSON with format:
   ```json
   {
     "error": "Error message",
     "details": "Additional details if available"
   }
   ```

**Where to check:**
- Browser DevTools → Network → Response preview
- Function logs in Supabase Dashboard

---

### 6. Environment Variable Fallbacks
**What to test:** Functions still work with old env var names

**Steps:**
1. Functions should work even if `PTERODACTYL_URL` is set instead of `PANEL_URL`
2. Functions should work even if `PTERODACTYL_API_KEY` is set instead of `PTERO_APP_KEY`
3. **Expected:** Should work with either naming convention

**Note:** This is automatic - functions check both names

---

## Quick Smoke Test

### End-to-End Purchase Flow
1. ✅ Sign up / Log in
2. ✅ Select a game server plan
3. ✅ Complete Stripe checkout
4. ✅ Verify order created in database
5. ✅ Verify server provisioning triggered
6. ✅ Verify server appears in Pterodactyl panel
7. ✅ Verify server appears in dashboard
8. ✅ Test start server
9. ✅ Test stop server

---

## What to Monitor

### During Testing:
1. **Supabase Function Logs:**
   - Check for any errors
   - Verify error messages are helpful
   - Check response times

2. **Browser Console:**
   - No CORS errors
   - No network errors
   - Proper error messages if something fails

3. **Stripe Dashboard:**
   - Webhook events received
   - Checkout sessions completed

4. **Pterodactyl Panel:**
   - Servers created successfully
   - Power control works (start/stop)

---

## If Something Fails

### Check Function Logs:
```bash
# In Supabase Dashboard:
Edge Functions → [function-name] → Logs
```

### Common Issues:

1. **CORS Error:**
   - Check `ALLOW_ORIGINS` env var in Supabase
   - Verify origin is in allowed list

2. **Pterodactyl API Error:**
   - Check `PANEL_URL` and `PTERO_APP_KEY` env vars
   - Verify API key has correct permissions

3. **Provisioning Error:**
   - Check `ptero_nodes` table has available capacity
   - Check order status in database

---

## Test Results Template

```
✅ Server Provisioning: [PASS/FAIL]
✅ Start Server: [PASS/FAIL]
✅ Stop Server: [PASS/FAIL]
✅ CORS: [PASS/FAIL]
✅ Error Handling: [PASS/FAIL]
✅ End-to-End Flow: [PASS/FAIL]

Notes:
[Any issues found]
```

---

**Ready to test!** Start with the critical tests (#1-4) first.

