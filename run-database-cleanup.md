# Database Cleanup Migration Instructions

## ⚠️ IMPORTANT: Run these migrations in Supabase SQL Editor

Since we cannot directly execute SQL migrations on Supabase from the CLI, please follow these steps:

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/sql
2. Click "New query"

### Step 2: Run Modpack Removal Migration
Copy and paste the contents of `supabase/migrations/999_cleanup_remove_modpacks.sql` and run it.

### Step 3: Run Comprehensive Cleanup Migration
Copy and paste the contents of `supabase/migrations/1000_comprehensive_cleanup.sql` and run it.

### Step 4: Verify Cleanup
Run these verification queries:

```sql
-- Check modpack removal
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'modpack_id';
-- Should return 0 rows

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'modpacks'
);
-- Should return false

-- Check cleanup results
SELECT 'Orphaned Orders' as issue_type, COUNT(*) as count
FROM public.orders o
LEFT JOIN public.plans p ON o.plan_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 'Invalid Node References', COUNT(*)
FROM public.orders
WHERE node_id IS NOT NULL 
  AND node_id NOT IN (SELECT id FROM public.ptero_nodes)

UNION ALL

SELECT 'Orders Without Users', COUNT(*)
FROM public.orders
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

### Step 5: Review Results
All counts should be 0 after cleanup. If not, review the issues and fix manually.

