# MySQL Edge Functions Setup

**Date:** 2025-11-10  
**Purpose:** Migrate Edge Functions from Supabase to MySQL

---

## ✅ New MySQL-Based Functions Created

### 1. `stripe-webhook-mysql`
- **Purpose:** Process Stripe webhook events and create orders in MySQL
- **Replaces:** `stripe-webhook` (Supabase version)
- **Features:**
  - Decrypts secrets from MySQL
  - Creates orders in MySQL `orders` table
  - Handles `checkout.session.completed` events
  - Handles subscription update/delete events
  - Logs all events to `stripe_events_log`

### 2. `create-checkout-session-mysql`
- **Purpose:** Create Stripe checkout sessions using plan data from MySQL
- **Replaces:** `create-checkout-session` (Supabase version)
- **Features:**
  - Fetches plan from MySQL
  - Uses `stripe_price_id` from plan
  - Creates Stripe checkout session with metadata

### 3. `get-plans-mysql`
- **Purpose:** Return all active plans from MySQL
- **New Function:** For frontend to fetch plans
- **Features:**
  - Returns all active plans
  - Groups plans by game
  - Includes pricing and Stripe price IDs

### 4. `_shared/mysql-client.ts`
- **Purpose:** Shared MySQL connection and utility functions
- **Features:**
  - Connection pooling
  - Secret decryption
  - Plan fetching
  - Order creation/updates
  - Node selection by region

---

## 🔧 Required Environment Variables

Add these to Supabase Edge Functions secrets:

```bash
# MySQL Connection
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=app_rw
MYSQL_PASSWORD=<from PASSWORDS.txt>
MYSQL_DATABASE=app_core

# AES Key for decrypting secrets
AES_KEY=<from AES_KEY.txt>
```

**To set secrets:**
```bash
cd /home/ubuntu/givrwrld-severs
export SUPABASE_ACCESS_TOKEN='your_token'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

# Get MySQL password
MYSQL_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | xargs)
AES_KEY=$(cat AES_KEY.txt)

# Set secrets
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_HOST=127.0.0.1
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PORT=3306
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_USER=app_rw
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PASSWORD="$MYSQL_PASS"
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_DATABASE=app_core
npx supabase secrets set --project-ref $PROJECT_REF AES_KEY="$AES_KEY"
```

---

## 📦 Dependencies

The MySQL functions require:
- `mysql2` package (npm:mysql2@^3.6.0)
- `uuid` package (for order IDs)
- `stripe` package (for Stripe integration)

These are imported via Deno's npm: specifier.

---

## 🚀 Deployment

### Deploy MySQL Functions

```bash
cd /home/ubuntu/givrwrld-severs

# Deploy each function
npx supabase functions deploy stripe-webhook-mysql --project-ref mjhvkvnshnbnxojnandf
npx supabase functions deploy create-checkout-session-mysql --project-ref mjhvkvnshnbnxojnandf
npx supabase functions deploy get-plans-mysql --project-ref mjhvkvnshnbnxojnandf
```

### Update Stripe Webhook URL

1. Go to Stripe Dashboard → Webhooks
2. Update webhook endpoint URL to:
   ```
   https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook-mysql
   ```
3. Verify webhook secret matches what's in MySQL

---

## 🔄 Frontend Updates

### Update API Calls

**Old (Supabase):**
```typescript
const { data: plans } = await supabase.from('plans').select('*');
```

**New (MySQL via Edge Function):**
```typescript
const response = await fetch(
  'https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/get-plans-mysql'
);
const { plans } = await response.json();
```

**Checkout Session:**
```typescript
const response = await fetch(
  'https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/create-checkout-session-mysql',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      plan_id: 'mc-1gb',
      user_id: userId,
      server_name: 'my-server',
      region: 'us-central',
      term: 'monthly',
    }),
  }
);
const { url, session_id } = await response.json();
window.location.href = url;
```

---

## ✅ Testing

### Test Get Plans
```bash
curl https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/get-plans-mysql
```

### Test Create Checkout Session
```bash
curl -X POST https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/create-checkout-session-mysql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "plan_id": "mc-1gb",
    "user_id": "test-user-id",
    "server_name": "test-server",
    "region": "us-central",
    "term": "monthly"
  }'
```

### Test Webhook (use Stripe CLI)
```bash
stripe listen --forward-to https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook-mysql
stripe trigger checkout.session.completed
```

---

## 🔐 Security Notes

- MySQL connection uses `app_rw` user (read/write on `app_core` only)
- Secrets are encrypted in MySQL and decrypted at runtime
- AES key stored in Supabase Edge Functions secrets (not in code)
- Webhook signature verification ensures requests are from Stripe

---

## 📋 Migration Checklist

- [x] Create MySQL client utility
- [x] Create `stripe-webhook-mysql` function
- [x] Create `create-checkout-session-mysql` function
- [x] Create `get-plans-mysql` function
- [ ] Set environment variables in Supabase
- [ ] Deploy functions
- [ ] Update Stripe webhook URL
- [ ] Update frontend API calls
- [ ] Test end-to-end flow
- [ ] Monitor for errors

---

**Status:** Functions created, ready for deployment! 🚀



