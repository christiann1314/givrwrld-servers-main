# Edge Function Usage Audit

## ✅ Functions Actually Used (KEEP)

### Core Payment & Orders
- `create-checkout-session` - ✅ Used in `stripeService.ts`, `useSubscription.ts`
- `stripe-webhook` - ✅ Used by Stripe (webhook endpoint)
- `servers-provision` - ✅ Called by `stripe-webhook`

### User Management
- `create-pterodactyl-user` - ✅ Used in `useAuth.tsx`, `usePterodactylCredentials.ts`
- `panel-sync-user` - ✅ Used in `PanelAccessCard.tsx`
- `panel-link` - ✅ Used in `PanelAccessCard.tsx`

### Server Management
- `start-server` - ✅ Used in `useUserServers.ts`
- `stop-server` - ✅ Used in `useUserServers.ts` (via functionName)
- `get-server-status` - ✅ Used in `useServerStatus.ts`
- `get-server-console` - ✅ Used in `DashboardServices.tsx`
- `sync-server-status` - ✅ Used in `DashboardServices.tsx`, `useUserServers.ts`
- `sync-all-data` - ✅ Created recently, likely used

### Admin & Management
- `admin-management` - ✅ Used in `useAdminStatus.ts`, `ErrorLogViewer.tsx`, `Admin2FAManager.tsx`
- `check-subscription` - ✅ Used in `useSubscription.ts`
- `customer-portal` - ✅ Used in `useSubscription.ts`
- `security-audit` - ✅ Used in `SecurityAuditManager.tsx`
- `fix-pterodactyl-credentials` - ✅ Used in `usePterodactylCredentials.ts`

### Data & Stats
- `server-stats` - ✅ Used in `ServerStatsWidget.tsx`
- `get-user-servers` - ✅ Likely used (common endpoint)
- `migrate-pterodactyl-data` - ✅ Used in `Migration.tsx` (one-time, can remove after)

## ❌ Functions NOT Found in Frontend (REMOVE)

- `get-user-stats` - Not found in frontend
- `health-check` - Not found in frontend
- `rate-limiter` - Not found in frontend
- `support-system` - Not found in frontend
- `gdpr-compliance` - Not found in frontend
- `notification-system` - Not found in frontend
- `backup-monitor` - Not found in frontend
- `error-handler` - Not found in frontend

## ⚠️ Functions to Review (POTENTIALLY DUPLICATE)

- `pterodactyl-provision` - May be duplicate of `servers-provision`
- `sync-pterodactyl-servers` - May be duplicate of `sync-all-data`
- `repair-failed-servers` - Maintenance, keep for admin
- `manual-start-servers` - Maintenance, keep for admin
- `reassign-servers` - Maintenance, keep for admin
- `fix-stuck-servers` - Maintenance, keep for admin
- `reset-pterodactyl-allocations` - Maintenance, keep for admin

## Recommendation

**Remove these functions:**
1. `get-user-stats`
2. `health-check`
3. `rate-limiter`
4. `support-system`
5. `gdpr-compliance`
6. `notification-system`
7. `backup-monitor`
8. `error-handler`

**Review these for consolidation:**
1. `pterodactyl-provision` vs `servers-provision`
2. `sync-pterodactyl-servers` vs `sync-all-data`

