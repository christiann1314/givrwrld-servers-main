# GIVRwrld - Production Game Server Hosting Platform

A complete production-ready game server hosting platform built with React, Supabase, Stripe, and Pterodactyl Panel. This platform allows customers to purchase game server plans, automatically provisions servers on Pterodactyl nodes, and provides real-time monitoring and management.

---

## Current local stack (PayPal + Express + MariaDB)

**For the working local end-to-end platform** (frontend 8080, backend 3001, MariaDB, PayPal subscriptions, webhook + finalize-order, Pterodactyl provisioning per egg), see **[LAUNCH-STACK.md](./LAUNCH-STACK.md)**. That document is the single source of truth to **bring the project back to this state** and run the full purchase → provision flow.

- **Frontend**: Vite + React at `http://localhost:8080` (API base `http://localhost:3001` when served locally).
- **Backend**: Node/Express in `api/` at `http://localhost:3001` (PayPal checkout, webhook, finalize-order, provisioning).
- **DB**: MySQL/MariaDB `app_core`; provisioning source of truth: `plans -> ptero_egg_id -> ptero_eggs -> server create`.

---

## 🚀 Features

- **Game Server Hosting**: Minecraft, Rust, Palworld server deployment
- **Stripe Integration**: Secure payment processing with webhooks
- **Pterodactyl Integration**: Automatic server provisioning and management
- **Real-time Monitoring**: Live server stats (CPU, RAM, uptime)
- **Panel Access**: Direct integration with Pterodactyl control panel
- **Responsive Design**: Modern UI with medieval fantasy theme
- **Production Ready**: Nginx, Cloudflare, security headers, monitoring

## 🏗️ Architecture

```
Frontend (Vite/React) → Supabase Edge Functions → Stripe + Pterodactyl APIs
                    ↓
                Supabase Postgres (Source of Truth)
                    ↓
                Pterodactyl Panel (Server Management)
```

### Data Flow
1. **Checkout**: Customer selects plan → `create-checkout-session` → Stripe Checkout
2. **Payment**: Stripe webhook → `stripe-webhook` → `servers-provision`
3. **Provisioning**: Pterodactyl API → Server created → Order updated
4. **Monitoring**: Dashboard polls `server-stats` → Live metrics displayed

## 📁 Project Structure

```
givrwrld/
├── src/                              # React frontend
│   ├── components/                   # Reusable components
│   │   ├── PanelAccess.tsx          # Panel account management
│   │   └── ServerStats.tsx          # Live server monitoring
│   ├── pages/                       # Page components
│   │   ├── Checkout.tsx             # Stripe checkout integration
│   │   └── Dashboard.tsx            # Main dashboard
│   ├── config/
│   │   └── gameConfigs.ts           # Pterodactyl game configurations
│   └── hooks/                       # Custom React hooks
├── supabase/
│   ├── functions/                   # Edge Functions
│   │   ├── create-checkout-session/ # Stripe checkout creation
│   │   ├── stripe-webhook/          # Payment processing
│   │   ├── panel-sync-user/         # Pterodactyl user sync
│   │   ├── servers-provision/       # Server provisioning
│   │   ├── server-stats/            # Live server metrics
│   │   └── scheduler-reconcile/     # Node health monitoring
│   └── migrations/
│       └── 001_init.sql            # Database schema
├── infra/
│   ├── nginx.conf                   # Production Nginx config
│   └── cloudflare-rules.txt         # Cloudflare configuration
├── .env.local                       # Frontend environment
├── .env.production                  # Functions environment
└── README.md
```

## 🛠️ Setup Instructions

### 1. Environment Variables

#### Frontend (.env.local)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_FUNCTIONS_URL=https://your-project-ref.functions.supabase.co
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_PANEL_URL=https://panel.givrwrldservers.com
```

#### Supabase Edge Functions (.env.production)
Set these in Supabase Dashboard > Edge Functions > Secrets:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_DB_URL=your_supabase_db_url

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

PANEL_URL=https://panel.givrwrldservers.com
PTERO_APP_KEY=your_pterodactyl_application_api_key
PTERO_CLIENT_KEY=your_pterodactyl_client_api_key

ALLOW_ORIGINS=https://givrwrldservers.com,https://www.givrwrldservers.com,http://localhost:5173
ALERTS_WEBHOOK=your_slack_or_discord_webhook_url
```

### 2. Database Setup

1. Run the migration in Supabase SQL Editor:
```sql
-- Copy contents from supabase/migrations/001_init.sql
```

2. Update the plans table with your actual Stripe price IDs:
```sql
UPDATE plans SET stripe_price_id = 'price_actual_stripe_id' WHERE id = 'mc-8gb';
```

3. Add your Pterodactyl nodes:
```sql
INSERT INTO ptero_nodes (pterodactyl_node_id, name, region, max_ram_gb, max_disk_gb) 
VALUES (1, 'US-East-1', 'east', 64, 1000);
```

### 3. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy panel-sync-user
supabase functions deploy servers-provision
supabase functions deploy server-stats
supabase functions deploy scheduler-reconcile
```

### 4. Stripe Configuration

1. Create products and prices in Stripe Dashboard
2. Set up webhook endpoint: `https://your-project-ref.functions.supabase.co/stripe-webhook`
3. Enable events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`

### 5. Pterodactyl Setup

1. Create Application API key with admin permissions
2. Create Client API key for server stats
3. Ensure nodes have available allocations
4. Update game configurations in `src/config/gameConfigs.ts` with correct egg IDs

### 6. Frontend Deployment

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to your VPS
# Copy dist/ contents to /var/www/givrwrld/
```

### 7. Nginx Configuration

1. Copy `infra/nginx.conf` to your server
2. Update SSL certificate paths
3. Update panel proxy URL if needed
4. Reload Nginx: `sudo nginx -s reload`

### 8. Cloudflare Setup

1. Add DNS records as specified in `infra/cloudflare-rules.txt`
2. Configure SSL/TLS: Full (strict)
3. Set up cache rules for static assets
4. Configure firewall rules for Stripe webhooks
5. Enable security headers and optimizations

## 🔧 Development

### Local Development

```bash
# Start development server
npm run dev

# Run with production environment
npm run build
npm run preview
```

### Testing

```bash
# Run linter
npm run lint

# Test Stripe integration
# Use Stripe test mode with test cards
```

## 📊 Monitoring & Maintenance

### Health Checks

- **Site**: `https://givrwrldservers.com/health`
- **Panel**: `https://panel.givrwrldservers.com/`
- **API**: `https://api.givrwrldservers.com/server-stats?health=1`

### Adding New Servers

1. Add node to `ptero_nodes` table
2. Ensure Pterodactyl node has available allocations
3. Restart scheduler-reconcile function

### Scaling

1. Deploy new Pterodactyl node
2. Add to `ptero_nodes` table
3. Scheduler automatically distributes new orders

## 🔒 Security Features

- **RLS Policies**: Users can only access their own data
- **CORS Protection**: Configured for specific origins
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Input Validation**: All API inputs validated
- **Rate Limiting**: Cloudflare protection
- **Webhook Verification**: Stripe signature validation

## 🚨 Troubleshooting

### Common Issues

1. **Stripe Webhooks Failing**
   - Check webhook URL is correct
   - Verify webhook secret matches
   - Check Cloudflare firewall rules

2. **Server Provisioning Fails**
   - Verify Pterodactyl API keys
   - Check node capacity
   - Ensure allocations are available

3. **Panel Access Issues**
   - Verify panel-sync-user function
   - Check external_accounts table
   - Ensure panel URL is accessible

4. **Stats Not Updating**
   - Check server-stats function
   - Verify Pterodactyl client API key
   - Check server is running

### Logs

- **Supabase Functions**: Check in Supabase Dashboard
- **Nginx**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **Pterodactyl**: Check panel logs

## 📈 Performance Optimization

- **Static Assets**: Cached for 1 year via Cloudflare
- **API Responses**: Cached appropriately
- **Database**: Indexed for common queries
- **CDN**: Cloudflare global distribution
- **Compression**: Gzip enabled

## 🔄 Updates & Maintenance

### Regular Tasks

1. **Monitor node health** (scheduler-reconcile runs automatically)
2. **Check Stripe webhook logs**
3. **Review server stats accuracy**
4. **Update dependencies** (monthly)
5. **Backup database** (daily)

### Scaling Checklist

- [ ] Add new Pterodactyl node
- [ ] Insert into `ptero_nodes` table
- [ ] Verify allocations available
- [ ] Test provisioning on new node
- [ ] Monitor performance

## 📞 Support

- **Documentation**: This README
- **Issues**: GitHub Issues
- **Monitoring**: Cloudflare Analytics
- **Alerts**: Slack/Discord webhooks

## 🎯 Success Metrics

- **Uptime**: 99.9% SLA
- **Provisioning Time**: < 60 seconds
- **Payment Success Rate**: > 99%
- **Customer Satisfaction**: Monitor via support tickets

---

**Built with ❤️ for the gaming community**

*This platform is production-ready and handles the complete game server hosting lifecycle from payment to provisioning to monitoring.*