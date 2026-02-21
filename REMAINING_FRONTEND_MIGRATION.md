# Remaining Frontend Migration to MySQL API

## Status

Most critical backend fixes are complete. The frontend still has some Supabase dependencies that need to be migrated to the MySQL API.

## Files Still Using Supabase

### High Priority (Core Functionality)

1. **`src/hooks/useProfile.ts`**
   - Uses: `supabase.auth.getUser()`, `supabase.from('profiles')`
   - Needs: API endpoint for user profile
   - Action: Create `/api/users/profile` endpoint, update hook

2. **`src/hooks/usePterodactylCredentials.ts`**
   - Uses: `supabase.rpc('get_my_pterodactyl_credentials')`
   - Needs: API endpoint for Pterodactyl credentials
   - Action: Create `/api/users/pterodactyl-credentials` endpoint

3. **`src/hooks/useServerStats.ts`**
   - Uses: Supabase Edge Functions for server stats
   - Needs: API endpoint for server stats
   - Action: Create `/api/servers/:id/stats` endpoint

### Medium Priority (Supporting Features)

4. **`src/hooks/useBillingData.ts`**
   - Likely uses Supabase for billing data
   - Action: Migrate to `/api/orders` endpoint (already exists)

5. **`src/hooks/useSubscription.ts`**
   - Likely uses Supabase for subscription data
   - Action: Migrate to `/api/orders` or new `/api/subscriptions` endpoint

6. **`src/hooks/useSupportData.ts`**
   - Likely uses Supabase for support tickets
   - Action: Create `/api/support` endpoints

7. **`src/hooks/useServerStatus.ts`**
   - Likely uses Supabase for server status
   - Action: Migrate to `/api/servers/:id/status` endpoint

8. **`src/components/PanelAccess.tsx`**
   - Has commented Supabase code
   - Action: Implement using MySQL API

### Low Priority (Legacy/Unused)

9. **`src/lib/supabaseOptimized.ts`** - Legacy optimization code
10. **`src/lib/trafficManager.ts`** - Legacy load balancing code
11. **`src/integrations/supabase/client.ts`** - Can be removed after migration
12. **`src/config/env.ts`** - Legacy config, may be unused

## Already Migrated ✅

- `src/hooks/useAuth.tsx` - Uses MySQL API
- `src/hooks/useUserServers.ts` - Uses MySQL API
- `src/hooks/useUserStats.ts` - Uses MySQL API
- `src/hooks/useLiveBillingData.ts` - Uses MySQL API
- `src/services/analytics.ts` - Uses MySQL API
- `src/lib/api.ts` - MySQL API client
- `src/config/environment.ts` - Updated for MySQL API
- `src/config/api.ts` - Updated for MySQL API

## Required API Endpoints

### User Profile
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile

### Pterodactyl Credentials
- `GET /api/users/pterodactyl-credentials` - Get Pterodactyl user credentials

### Server Stats
- `GET /api/servers/:id/stats` - Get server statistics
- `GET /api/servers/:id/status` - Get server status

### Subscriptions
- `GET /api/subscriptions` - Get user subscriptions
- `GET /api/subscriptions/:id` - Get subscription details

### Support
- `GET /api/support/tickets` - Get support tickets
- `POST /api/support/tickets` - Create support ticket
- `GET /api/support/tickets/:id` - Get ticket details

### Analytics
- `POST /api/analytics/events` - Track analytics event

## Migration Steps

1. **Create Missing API Endpoints**
   - Add endpoints listed above to `api/routes/`
   - Use existing MySQL utilities from `api/utils/mysql.js`

2. **Update Frontend Hooks**
   - Replace Supabase calls with API client calls
   - Update error handling
   - Test each hook individually

3. **Remove Supabase Dependencies**
   - Remove `src/integrations/supabase/` directory
   - Remove unused Supabase imports
   - Update package.json to remove Supabase packages

4. **Testing**
   - Test all user flows
   - Verify authentication works
   - Verify server management works
   - Verify billing/subscriptions work

## Notes

- The main authentication flow is already migrated (`useAuth.tsx`)
- Server fetching is already migrated (`useUserServers.ts`)
- Most critical paths are working
- Remaining work is primarily for supporting features

## Priority Order

1. **User Profile** - Users need to view/edit their profile
2. **Server Stats** - Users need to see server statistics
3. **Pterodactyl Credentials** - Users need panel access
4. **Subscriptions** - Users need to manage subscriptions
5. **Support** - Users need support tickets
6. **Analytics** - Nice to have, not critical

