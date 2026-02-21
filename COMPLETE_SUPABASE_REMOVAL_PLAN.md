# Complete Supabase Removal Plan

**Date:** 2025-11-10  
**Goal:** Remove ALL Supabase dependencies - Edge Functions, Auth, and Client

---

## 🔍 Current Supabase Usage

### 1. Edge Functions (37 functions)
- Hosted on Supabase platform
- Deno runtime
- Functions like: `stripe-webhook`, `create-checkout-session`, `servers-provision`, etc.

### 2. Authentication (Supabase Auth)
- User signup/login
- JWT tokens
- Session management
- Used in: `useAuth.tsx`, `Auth.tsx`

### 3. Frontend Client
- `@supabase/supabase-js` library
- Used in 32+ files
- For auth and function invocations

---

## 🎯 Replacement Strategy

### Option A: Self-Hosted Node.js/Express API (RECOMMENDED)
**Pros:**
- Full control
- Use existing VPS
- Easy to maintain
- Can use existing MySQL connection

**Cons:**
- Need to manage server
- Need to handle scaling

### Option B: Self-Hosted Deno Server
**Pros:**
- Can reuse existing Deno code
- Similar to Edge Functions

**Cons:**
- Less common
- Smaller ecosystem

**Decision: Use Option A (Node.js/Express API)**

---

## 📋 Implementation Plan

### Phase 1: Create API Server (2-3 hours)

**1.1 Setup Express Server**
- Create `api/` directory
- Setup Express with CORS, body-parser
- Setup MySQL connection pool
- Setup JWT authentication middleware

**1.2 Migrate Edge Functions to API Routes**
- Convert each Edge Function to Express route
- Maintain same functionality
- Update to use MySQL directly

**1.3 Deploy API Server**
- Use PM2 or systemd
- Setup reverse proxy (nginx)
- Configure SSL

### Phase 2: Replace Authentication (2-3 hours)

**2.1 Create Auth API Endpoints**
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

**2.2 Implement JWT Authentication**
- Use `jsonwebtoken` library
- Store tokens in HTTP-only cookies or localStorage
- Implement token refresh

**2.3 Update Frontend Auth**
- Replace `useAuth.tsx` to use new API
- Remove Supabase Auth dependencies
- Update `Auth.tsx` component

### Phase 3: Update Frontend (2-3 hours)

**3.1 Remove Supabase Client**
- Remove `@supabase/supabase-js` package
- Remove `src/integrations/supabase/` directory
- Update all imports

**3.2 Create API Client**
- Create `src/lib/api.ts` with fetch-based client
- Replace all `supabase.functions.invoke()` calls
- Replace all `supabase.auth.*` calls

**3.3 Update All Components**
- Update 32+ files that use Supabase
- Replace with API client calls

### Phase 4: Testing & Deployment (1-2 hours)

**4.1 Test Authentication**
- Test signup
- Test login
- Test protected routes

**4.2 Test API Endpoints**
- Test all migrated functions
- Test error handling

**4.3 Deploy**
- Deploy API server
- Update frontend environment variables
- Test end-to-end

---

## 🏗️ Architecture After Removal

```
Frontend (React)
    ↓
API Server (Node.js/Express on VPS)
    ↓
MySQL Database
    ↓
Pterodactyl API
```

**No Supabase dependencies!**

---

## 📁 New File Structure

```
api/
  ├── server.js              # Express server setup
  ├── routes/
  │   ├── auth.js            # Authentication routes
  │   ├── stripe.js          # Stripe webhook
  │   ├── checkout.js        # Checkout session
  │   ├── servers.js         # Server management
  │   ├── orders.js          # Order management
  │   └── plans.js           # Plans
  ├── middleware/
  │   ├── auth.js            # JWT middleware
  │   └── mysql.js           # MySQL connection
  └── utils/
      ├── jwt.js             # JWT utilities
      └── mysql.js           # MySQL utilities

src/
  ├── lib/
  │   └── api.ts             # API client (replaces Supabase client)
  └── hooks/
      └── useAuth.tsx        # Updated to use API
```

---

## 🔧 Technical Details

### API Server Setup
- **Framework:** Express.js
- **Database:** MySQL (existing)
- **Auth:** JWT tokens
- **Port:** 3001 (or configurable)
- **Process Manager:** PM2

### Authentication Flow
1. User signs up → API creates user in MySQL `users` table
2. User logs in → API validates credentials → Returns JWT
3. Frontend stores JWT → Sends in Authorization header
4. API validates JWT → Grants access

### API Endpoints

**Auth:**
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

**Stripe:**
- `POST /api/stripe/webhook` - Stripe webhook handler
- `POST /api/stripe/checkout` - Create checkout session

**Servers:**
- `GET /api/servers` - Get user servers
- `POST /api/servers/provision` - Provision server
- `POST /api/servers/:id/start` - Start server
- `POST /api/servers/:id/stop` - Stop server

**Orders:**
- `GET /api/orders` - Get user orders

**Plans:**
- `GET /api/plans` - Get all plans

---

## ⚠️ Breaking Changes

1. **Environment Variables:**
   - Remove: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Add: `VITE_API_URL` (e.g., `https://api.givrwrldservers.com`)

2. **Authentication:**
   - No more Supabase Auth
   - JWT-based authentication
   - Manual session management

3. **Function Calls:**
   - `supabase.functions.invoke()` → `api.post()` or `api.get()`
   - `supabase.auth.*` → `api.auth.*`

---

## 📊 Migration Checklist

### Backend
- [ ] Create Express API server
- [ ] Setup MySQL connection
- [ ] Implement JWT authentication
- [ ] Migrate all Edge Functions to routes
- [ ] Setup PM2/systemd
- [ ] Configure nginx reverse proxy
- [ ] Test all endpoints

### Frontend
- [ ] Create API client
- [ ] Update `useAuth.tsx`
- [ ] Update `Auth.tsx`
- [ ] Remove Supabase client imports
- [ ] Update all function calls
- [ ] Update environment variables
- [ ] Test authentication flow
- [ ] Test all features

### Deployment
- [ ] Deploy API server
- [ ] Update DNS/domain
- [ ] Setup SSL certificate
- [ ] Test production
- [ ] Remove Supabase project (optional)

---

## 🚀 Estimated Timeline

- **Phase 1 (API Server):** 2-3 hours
- **Phase 2 (Auth):** 2-3 hours
- **Phase 3 (Frontend):** 2-3 hours
- **Phase 4 (Testing):** 1-2 hours

**Total: 7-11 hours**

---

## 🎯 Next Steps

1. **Confirm approach** (Node.js/Express API)
2. **Start Phase 1** - Create API server structure
3. **Migrate functions** one by one
4. **Implement auth** system
5. **Update frontend** gradually
6. **Test thoroughly**
7. **Deploy**

---

**Status:** Ready to begin implementation once approved.


