# Frontend MySQL Migration Guide

**Date:** 2025-11-10  
**Purpose:** Update frontend to use MySQL-based Edge Functions

---

## 🔄 API Endpoint Changes

### Old (Supabase Direct)
```typescript
// Fetching plans
const { data: plans } = await supabase.from('plans').select('*');
```

### New (MySQL Edge Function)
```typescript
// Fetching plans
const response = await fetch(
  'https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/get-plans-mysql'
);
const { plans } = await response.json();
```

---

## 📝 Files to Update

### 1. `src/services/stripeService.ts`

**Update `createCheckoutSession` method:**

```typescript
// OLD
const { data, error } = await supabase.functions.invoke('create-checkout-session', {
  body: { ... }
});

// NEW
const response = await fetch(
  `${config.supabase.functionsUrl}/create-checkout-session-mysql`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      plan_id: planId,
      user_id: userId,
      server_name: serverName,
      region: region,
      term: term || 'monthly',
    }),
  }
);

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || 'Failed to create checkout session');
}

const data = await response.json();
return { checkout_url: data.url };
```

### 2. `src/pages/Checkout.tsx`

**Update plan fetching:**

```typescript
// OLD
const { data, error } = await supabase
  .from('plans')
  .select('*')
  .eq('game_type', game)
  .single();

// NEW
const response = await fetch(
  'https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/get-plans-mysql'
);
const { plans } = await response.json();
const plan = plans.find((p: any) => p.game === game && p.id.includes('8gb'));
```

### 3. Game Config Pages (MinecraftConfig, PalworldConfig, etc.)

**Update to fetch plans from MySQL:**

```typescript
// Add at top of component
const [plans, setPlans] = useState([]);

useEffect(() => {
  const fetchPlans = async () => {
    const response = await fetch(
      'https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/get-plans-mysql'
    );
    const { plans } = await response.json();
    const gamePlans = plans.filter((p: any) => p.game === 'minecraft'); // or 'palworld', etc.
    setPlans(gamePlans);
  };
  fetchPlans();
}, []);
```

---

## 🔧 Helper Function

Create `src/services/planService.ts`:

```typescript
import { config } from '../config/environment';

export interface Plan {
  id: string;
  item_type: 'game' | 'vps';
  game?: string;
  ram_gb: number;
  vcores: number;
  ssd_gb: number;
  price_monthly: number;
  stripe_price_id: string;
  display_name: string;
  description?: string;
}

export async function getPlans(): Promise<Plan[]> {
  const response = await fetch(
    `${config.supabase.functionsUrl}/get-plans-mysql`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch plans');
  }
  
  const { plans } = await response.json();
  return plans;
}

export async function getPlansByGame(game: string): Promise<Plan[]> {
  const plans = await getPlans();
  return plans.filter((p) => p.game === game);
}
```

---

## ✅ Migration Checklist

- [ ] Update `stripeService.ts` to use `create-checkout-session-mysql`
- [ ] Update `Checkout.tsx` to use `get-plans-mysql`
- [ ] Update all game config pages to fetch plans from MySQL
- [ ] Create `planService.ts` helper
- [ ] Test plan fetching
- [ ] Test checkout flow
- [ ] Verify orders are created in MySQL
- [ ] Verify provisioning works

---

**Status:** Ready for frontend updates! 🚀
