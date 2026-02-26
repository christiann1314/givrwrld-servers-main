# Production Environment Variables Setup

**Date:** 2025-11-09  
**Status:** Ready for Production Deployment

---

## Required Environment Variables for Production

Set these environment variables **before building** for production:

```bash
# Supabase Configuration
export VITE_SUPABASE_URL=https://mjhvkvnshnbnxojnandf.supabase.co
export VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaHZrdm5zaG5ibnhvam5hbmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTU0MTksImV4cCI6MjA2OTM5MTQxOX0.GxI1VdNCKD0nxJ3Tlkvy63PHEqoiPlJUlfLMrSoM6Tw
export VITE_SUPABASE_FUNCTIONS_URL=https://mjhvkvnshnbnxojnandf.functions.supabase.co

# Stripe Configuration (LIVE MODE - CRITICAL)
export VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51RZPGzB3VffY65l6PSOmZdnbQsnPQmXdaHvXkPwzq2Ieq5CvzY9PlQaxf97C8PMLj8YfhQtW9AUrK4rofbj7ZXTY004OFKWBqh

# App Configuration
export VITE_APP_NAME=GIVRWRLD Servers
export VITE_APP_URL=https://givrwrldservers.com

# Pterodactyl Configuration
export VITE_PANEL_URL=https://panel.givrwrldservers.com
```

---

## Verification Checklist

Before deploying to production:

- [ ] **Stripe Key is LIVE:** `VITE_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`
- [ ] **NOT Test Key:** Does NOT start with `pk_test_`
- [ ] **Supabase Anon Key:** Matches the value above
- [ ] **All Variables Set:** No missing environment variables
- [ ] **Build Test:** Run `npm run build` and verify no errors

---

## Build Command

```bash
# Set environment variables (see above)
# Then build:
npm run build

# Verify build output
ls -la dist/
```

---

## Deployment Platforms

### Vercel / Netlify

1. Go to Project Settings → Environment Variables
2. Add each `VITE_*` variable
3. Redeploy

### Self-Hosted / VPS

1. Create `.env` file (copy from `.env.example`)
2. Fill in actual values
3. Build with: `npm run build`
4. Deploy `dist/` folder

---

## Security Notes

- ✅ **Anon Key:** Safe to expose (public)
- ✅ **Stripe Publishable Key:** Safe to expose (public)
- ❌ **Never commit `.env` file** to git
- ✅ **`.env.example` is safe** (template only)

---

## Current Configuration

- **Stripe Mode:** LIVE ✅
- **Stripe Key Format:** `pk_live_51RZPGzB3VffY65l6...` ✅
- **Supabase:** Production ✅
- **All Keys:** Verified ✅

---

**Ready for Production Deployment** ✅

