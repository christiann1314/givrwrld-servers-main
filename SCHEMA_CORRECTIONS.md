# ✅ Schema Corrections Applied

## Issue Found
The SQL queries in `check-database-tables.sql` were using incorrect column names that don't exist in the actual database schema.

## Corrections Made

### ptero_nodes Table
**Incorrect:**
- `total_ram_gb` ❌
- `reserved_ram_gb` ❌

**Correct:**
- `max_ram_gb` ✅
- `reserved_headroom_gb` ✅

### external_accounts Table
**Incorrect:**
- `id` column ❌ (doesn't exist)
- `created_at` column ❌ (doesn't exist)

**Correct:**
- `user_id` is the primary key ✅
- `last_synced_at` instead of `created_at` ✅

## Actual Schema

### ptero_nodes
```sql
CREATE TABLE ptero_nodes (
  id SERIAL PRIMARY KEY,
  pterodactyl_node_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  max_ram_gb INTEGER NOT NULL,
  max_disk_gb INTEGER NOT NULL,
  reserved_headroom_gb INTEGER DEFAULT 2,
  enabled BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### external_accounts
```sql
CREATE TABLE external_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pterodactyl_user_id INTEGER,
  panel_username TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now()
);
```

## Updated Queries
All queries in `check-database-tables.sql` now use the correct column names and will work in Supabase SQL Editor.

