# Purchase Issue Fix - Server Not Provisioning

## 🔴 Critical Bug Found and Fixed

**Issue:** Webhook was calling provisioning function with incorrect URL, causing provisioning to fail silently.

## The Bug

In `supabase/functions/stripe-webhook/index.ts` (line 132), the functions URL construction was broken:

**Before (BROKEN):**
```typescript
const functionsUrl = Deno.env.get('SUPABASE_URL')!.replace('https://', 'https://').replace('.supabase.co', '.functions.supabase.co')
```

This would not work correctly because:
- Replacing `'https://'` with `'https://'` does nothing
- The URL construction logic was incorrect

**After (FIXED):**
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co')
console.log('Calling provisioning function at:', `${functionsUrl}/servers-provision`)
```

Now it correctly converts:
- `https://mjhvkvnshnbnxojnandf.supabase.co` 
- → `https://mjhvkvnshnbnxojnandf.functions.supabase.co`

## Impact

- **Before:** Webhook would create order in database, but provisioning call would fail (404 or connection error)
- **After:** Provisioning function will be called correctly and server will be created

## What to Do Now

### 1. Deploy the Fixed Webhook

```bash
cd /home/ubuntu/givrwrld-severs
supabase functions deploy stripe-webhook
```

### 2. Check Current Purchase

If you just made a purchase that didn't provision:

1. **Check if order exists:**
   - Run `diagnose-purchase-issue.sql` in Supabase SQL Editor
   - Or check: `SELECT * FROM orders WHERE status = 'paid' ORDER BY created_at DESC LIMIT 5;`

2. **If order exists but no server:**
   - Follow instructions in `manual-provision-fix.md`
   - Manually trigger provisioning for that order

3. **Check webhook logs:**
   - Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - Look for "Provisioning failed" or connection errors

4. **Check provisioning logs:**
   - Supabase Dashboard → Edge Functions → `servers-provision` → Logs
   - Look for any errors

### 3. Test with New Purchase

After deploying the fix, make a test purchase to verify:
1. Order is created ✅
2. Provisioning is triggered ✅
3. Server appears in Pterodactyl ✅

## Files Changed

- ✅ `supabase/functions/stripe-webhook/index.ts` - Fixed URL construction
- ✅ `diagnose-purchase-issue.sql` - Diagnostic queries
- ✅ `manual-provision-fix.md` - Manual provisioning guide

## Verification

After deploying, check webhook logs. You should now see:
```
Calling provisioning function at: https://mjhvkvnshnbnxojnandf.functions.supabase.co/servers-provision
Server provisioning triggered successfully
```

Instead of errors like:
```
Provisioning failed: { status: 404, error: "Not Found" }
```

## Next Steps

1. ✅ Deploy fixed webhook function
2. ⚠️ Check current purchase (if exists, manually provision)
3. ✅ Test with new purchase
4. ✅ Verify end-to-end flow works

