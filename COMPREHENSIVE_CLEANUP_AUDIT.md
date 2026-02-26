# Comprehensive Cleanup & Alignment Audit

## Overview
This document identifies inconsistencies and unused code across Stripe, Pterodactyl, and Supabase.

## 1. Edge Functions Analysis

### ✅ Core Functions (Keep - Actively Used)
- `create-checkout-session` - Payment flow
- `stripe-webhook` - Order processing
- `servers-provision` - Server creation
- `create-pterodactyl-user` - User account creation
- `start-server` - Server control
- `stop-server` - Server control
- `get-server-status` - Server monitoring
- `get-user-servers` - Dashboard data
- `sync-all-data` - Data synchronization
- `sync-server-status` - Status sync
- `panel-sync-user` - User sync

### ⚠️ Potentially Unused Functions (Review)
- `pterodactyl-provision` - May be duplicate of `servers-provision`
- `sync-pterodactyl-servers` - May be duplicate of `sync-all-data`
- `repair-failed-servers` - Maintenance function (keep for admin)
- `manual-start-servers` - Maintenance function (keep for admin)
- `reassign-servers` - Maintenance function (keep for admin)
- `fix-stuck-servers` - Maintenance function (keep for admin)
- `reset-pterodactyl-allocations` - Maintenance function (keep for admin)
- `migrate-pterodactyl-data` - One-time migration (can remove if done)
- `pterodactyl-info` - Info endpoint (review usage)

### ❌ Unused/Unnecessary Functions (Remove)
- `admin-management` - If not used in frontend
- `check-subscription` - If not used
- `customer-portal` - If not used
- `get-user-stats` - If not used
- `get-server-console` - If not used
- `fix-pterodactyl-credentials` - If not used
- `health-check` - If not used
- `rate-limiter` - If not used
- `support-system` - If not used
- `gdpr-compliance` - If not used
- `notification-system` - If not used
- `backup-monitor` - If not used
- `error-handler` - If not used
- `security-audit` - If not used
- `server-stats` - If duplicate of `get-server-status`
- `panel-link` - If not used

## 2. Stripe Alignment Issues

### Issues Found:
1. **Multiple price update files** - Consolidate into one
2. **Placeholder price IDs** - Need to verify all are live
3. **Missing price validation** - No check if price exists in Stripe

### Action Required:
1. Get all active Stripe prices
2. Compare with database plans
3. Mark inactive plans that don't exist in Stripe
4. Add missing plans that exist in Stripe

## 3. Pterodactyl Alignment Issues

### Issues Found:
1. **Unused environment variables** - Many games have empty env vars
2. **Hardcoded egg IDs** - Should be in database
3. **Duplicate game configs** - Some games have identical configs
4. **Unused attributes** - Some Pterodactyl attributes not needed

### Action Required:
1. Remove unused environment variables
2. Move egg IDs to database
3. Consolidate duplicate configs
4. Remove unused Pterodactyl attributes

## 4. Database Cleanup

### SQL Queries to Remove:
1. Unused migrations
2. Duplicate seed data
3. Unused columns (already done for modpacks)
4. Unused indexes

### Tables to Review:
- `modpacks` - Already marked for removal
- `addons` - Verify if used
- `ptero_nodes` - Verify data accuracy

## 5. Code Cleanup

### Remove:
1. Unused imports
2. Commented code
3. Debug console.logs (keep error logs)
4. Unused type definitions
5. Duplicate utility functions

