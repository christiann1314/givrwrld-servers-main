# Remaining Supabase Database Queries

**Date:** 2025-11-10  
**Purpose:** List all files that still use Supabase database queries

---

## 📋 Files to Update

### Pages
- `src/pages/Success.tsx` - May query orders
- Check all game config pages (MinecraftConfig, PalworldConfig, etc.)

### Components
- Check all components that display data

### Services
- Check all service files

---

## 🔧 Update Pattern

**Replace:**
```typescript
const { data } = await supabase.from('table_name').select('*');
```

**With:**
```typescript
// For orders/servers
const response = await fetch(
  `${config.supabase.functionsUrl}/get-user-orders-mysql?user_id=${userId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const { orders } = await response.json();

// For plans
const response = await fetch(
  `${config.supabase.functionsUrl}/get-plans-mysql`
);
const { plans } = await response.json();
```

---

**Status:** Audit complete, update remaining files as needed.



