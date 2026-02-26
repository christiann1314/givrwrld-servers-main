# GIVRwrld Production Deployment Plan

## Current Status Analysis

### ✅ Already Deployed:
- **Supabase Project**: mjhvkvnshnbnxojnandf.supabase.co
- **35+ Edge Functions**: Including core payment and provisioning functions
- **Frontend Build**: React app compiles successfully
- **Infrastructure**: Nginx config and Cloudflare rules ready

### ❌ Critical Issues to Fix:

1. **API Contract Mismatch**
   - Current functions use old schema (user_id, plan_id, region)
   - Need new schema (order_id, item_type, server_name, term, addons)

2. **Database Schema Conflicts**
   - Multiple overlapping migrations
   - Need clean schema with exact table structure from synopsis

3. **Missing Production Environment**
   - Supabase secrets not configured
   - Stripe live keys needed
   - Pterodactyl API keys missing

4. **Frontend UI Cleanup**
   - Remove unwanted components (My Services, Manage buttons, etc.)
   - Implement streamlined purchase flow
   - Add first/last name to auth

## Deployment Strategy

### Phase 1: Backend Cleanup (30 minutes)
1. **Update Core Functions** to match API contracts:
   - ✅ create-checkout-session (DONE)
   - ✅ stripe-webhook (DONE) 
   - ✅ servers-provision (DONE)
   - ✅ server-stats (DONE)
   - 🔄 create-billing-portal-session (NEW)
   - 🔄 panel-sync-user (UPDATED)

2. **Database Schema Migration**:
   - Clean up migration conflicts
   - Deploy new schema (profiles, plans, orders, etc.)
   - Seed production data

3. **Environment Configuration**:
   - Set Supabase secrets
   - Configure Stripe webhooks
   - Add Pterodactyl credentials

### Phase 2: Frontend Updates (45 minutes)
1. **Auth Enhancement**:
   - Add first/last name fields
   - Implement profile system
   - Update header greeting

2. **UI Cleanup**:
   - Remove My Services page
   - Remove Manage buttons
   - Remove Server Provisioned section
   - Remove Start/Configure server buttons

3. **New Purchase Flow**:
   - Streamlined /purchase page
   - Plan selection with addons
   - Server name and region selection

4. **Dashboard Overhaul**:
   - Single overview page
   - Panel Access card
   - Live Stats card
   - Billing Portal card
   - Affiliate Program card

### Phase 3: Production Deployment (15 minutes)
1. **Deploy to Server**:
   - Upload built files to ubuntu@15.204.251.32
   - Configure Nginx
   - Set up SSL certificates

2. **Cloudflare Configuration**:
   - DNS records
   - Cache rules
   - Security settings

3. **Testing & Verification**:
   - End-to-end purchase flow
   - Server provisioning test
   - Panel access verification

## Next Steps

1. **Deploy Updated Functions** (Priority 1)
2. **Fix Database Schema** (Priority 1) 
3. **Configure Environment** (Priority 1)
4. **Update Frontend UI** (Priority 2)
5. **Production Deployment** (Priority 3)

## Pterodactyl Integration Requirements

Need from you:
- Panel URL and API keys
- Node IDs and allocations
- Game egg configurations
- Server resource limits

## Success Criteria

- [ ] User can sign up with first/last name
- [ ] User can purchase game server or VPS
- [ ] Payment flows through Stripe successfully
- [ ] Server auto-provisions on Pterodactyl
- [ ] Dashboard shows live server stats
- [ ] Panel access works
- [ ] Billing portal accessible
- [ ] No console errors or failed API calls
