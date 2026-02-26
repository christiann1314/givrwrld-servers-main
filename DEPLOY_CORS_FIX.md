# Deploy CORS Fix for create-checkout-session

## Problem
The `create-checkout-session` function is blocking requests because the `cache-control` header is not in the allowed CORS headers.

## Solution
Deploy the updated function that includes `cache-control` in the CORS allowed headers.

## Steps to Deploy

### Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/functions
2. Click on `create-checkout-session`
3. Click "Edit Function"
4. Copy the entire contents of `supabase/functions/create-checkout-session/index.ts`
5. Paste into the editor
6. Click "Deploy"

### Via CLI (if you have access token)
```bash
cd /home/ubuntu/givrwrld-severs
npx supabase functions deploy create-checkout-session --project-ref mjhvkvnshnbnxojnandf
npx supabase functions deploy create-pterodactyl-user --project-ref mjhvkvnshnbnxojnandf
```

## Verify Deployment
After deploying, test with:
```bash
curl -X OPTIONS "https://mjhvkvnshnbnxojnandf.functions.supabase.co/create-checkout-session" \
  -H "Origin: https://givrwrldservers.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: cache-control" \
  -v | grep -i "access-control-allow-headers"
```

You should see `cache-control` in the response.

## Alternative Quick Fix (Temporary)
If you can't deploy immediately, you can temporarily remove the Cache-Control header from the Supabase client:

Edit `src/integrations/supabase/client.ts` and remove or comment out:
```typescript
global: {
  headers: {
    'Cache-Control': 'no-cache',  // Remove this line
  }
}
```

But this is NOT recommended for production - deploy the function fix instead.


