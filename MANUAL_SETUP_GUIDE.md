# Manual Setup Guide - GIVRwrld Project

This guide covers all manual steps required to complete the project setup and deployment.

## Prerequisites

- Ubuntu/Debian server (or local development machine)
- Node.js 18+ installed
- MySQL 8.0+ installed
- Git installed
- Domain name (for production)
- Stripe account (for payments)

---

## Step 1: Database Setup

### 1.1 Install MySQL (if not already installed)

```bash
sudo bash scripts/setup-mysql.sh
```

**OR** manually:

```bash
sudo apt-get update
sudo apt-get install -y mysql-server mysql-client

# Set root password (non-interactive)
export MYSQL_ROOT_PASSWORD="your-strong-password-here"
sudo mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
EOF
```

### 1.2 Create Database and Users

1. **Edit `sql/grants.sql`** and replace all `REPLACE_ME_*` passwords with strong random passwords:
   ```bash
   nano sql/grants.sql
   ```

2. **Apply grants**:
   ```bash
   mysql -u root -p < sql/grants.sql
   ```

3. **Import core schema**:
   ```bash
   mysql -u root -p app_core < sql/app_core.sql
   ```

4. **Import panel schema** (if using Pterodactyl):
   ```bash
   mysql -u root -p panel < sql/panel.sql
   ```

### 1.3 Verify Database

```bash
mysql -u root -p -e "SHOW DATABASES;"
mysql -u root -p -e "USE app_core; SHOW TABLES;"
```

---

## Step 2: API Server Configuration

### 2.1 Create API Environment File

Create `api/.env`:

```bash
cd api
nano .env
```

**Required Environment Variables:**

```env
# Server Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=your-app-user-password-from-grants.sql
DB_NAME=app_core

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-signing-secret

# CORS Configuration (Production)
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com

# Pterodactyl Configuration (if using)
PTERODACTYL_URL=https://panel.givrwrldservers.com
PTERODACTYL_API_KEY=your-pterodactyl-api-key
```

**Generate JWT Secrets:**
```bash
# Generate random secrets (32+ characters)
openssl rand -base64 32
openssl rand -base64 32
```

### 2.2 Install API Dependencies

```bash
cd api
npm install
```

### 2.3 Test API Server

```bash
npm start
# Or for development:
npm run dev
```

Verify it's running:
```bash
curl http://localhost:3001/health
```

### 2.4 Set Up API as System Service (Production)

```bash
# Copy systemd service file
sudo cp api/systemd/givrwrld-api.service /etc/systemd/system/

# Edit service file to match your paths
sudo nano /etc/systemd/system/givrwrld-api.service

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable givrwrld-api
sudo systemctl start givrwrld-api

# Check status
sudo systemctl status givrwrld-api
```

**OR** use PM2:

```bash
cd api
npm run pm2:start
pm2 save
pm2 startup
```

---

## Step 3: Frontend Configuration

### 3.1 Create Frontend Environment File

Create `.env.local` (or `.env` for production):

```bash
nano .env.local
```

**Required Environment Variables:**

```env
# API Configuration
VITE_API_URL=http://localhost:3001

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...your-stripe-publishable-key

# Panel Configuration (optional)
VITE_PANEL_URL=https://panel.givrwrldservers.com
```

**For Production:**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...your-production-key
```

### 3.2 Install Frontend Dependencies

```bash
npm install
```

### 3.3 Build Frontend

```bash
npm run build
```

### 3.4 Serve Frontend (Production)

**Option 1: Nginx**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /home/ubuntu/givrwrld-severs/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option 2: Simple HTTP Server**

```bash
# Install serve
npm install -g serve

# Serve built files
serve -s dist -l 8080
```

---

## Step 4: Stripe Configuration

### 4.1 Get Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **API Keys** → Copy:
   - Secret Key: `sk_live_...` (for API server)
   - Publishable Key: `pk_live_...` (for frontend)

### 4.2 Set Up Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://api.yourdomain.com/api/stripe/webhook`
4. **Events to send**: Select:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret**: `whsec_...`
6. Add to `api/.env` as `STRIPE_WEBHOOK_SECRET`

### 4.3 Create Stripe Products and Prices

**Option 1: Use the script (if available):**
```bash
cd api
node create-stripe-prices.js
```

**Option 2: Manual creation:**
1. Go to **Products** in Stripe Dashboard
2. Create products for each game/plan
3. Create prices for each RAM tier
4. Copy price IDs to database:
   ```sql
   UPDATE plans SET stripe_price_id = 'price_...' WHERE id = '...';
   ```

---

## Step 5: Pterodactyl Configuration (if using)

### 5.1 Get Pterodactyl API Key

1. Log into Pterodactyl Panel
2. Go to **Account** → **API Credentials**
3. Create new API key with:
   - **Description**: GIVRwrld API
   - **Permissions**: Read & Write
4. Copy the API key

### 5.2 Add to API Environment

Add to `api/.env`:
```env
PTERODACTYL_URL=https://panel.givrwrldservers.com
PTERODACTYL_API_KEY=ptlc_...
```

### 5.3 Verify Pterodactyl Connection

Test the connection:
```bash
curl -H "Authorization: Bearer $PTERODACTYL_API_KEY" \
     $PTERODACTYL_URL/api/application/users
```

---

## Step 6: SSL/HTTPS Setup (Production)

### 6.1 Install Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
```

### 6.2 Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6.3 Auto-renewal

Certbot sets up auto-renewal automatically. Verify:
```bash
sudo certbot renew --dry-run
```

---

## Step 7: Testing

### 7.1 Test API Health

```bash
curl http://localhost:3001/health
```

### 7.2 Test Authentication

```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Sign in
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### 7.3 Test Stripe Webhook (Local)

Use Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### 7.4 Test Frontend

1. Start frontend: `npm run dev`
2. Open: `http://localhost:8080`
3. Test:
   - User registration
   - User login
   - Browse plans
   - Purchase flow (use Stripe test mode)

---

## Step 8: Remaining Frontend Migration (Optional)

Some frontend hooks still use Supabase. See `REMAINING_FRONTEND_MIGRATION.md` for details.

**Critical paths are already migrated:**
- ✅ Authentication (`useAuth.tsx`)
- ✅ Server fetching (`useUserServers.ts`)
- ✅ Orders (`useLiveBillingData.ts`)

**Still need migration:**
- ⏳ User profile (`useProfile.ts`)
- ⏳ Server stats (`useServerStats.ts`)
- ⏳ Pterodactyl credentials (`usePterodactylCredentials.ts`)

These can be done incrementally as needed.

---

## Step 9: Monitoring & Maintenance

### 9.1 Check API Logs

```bash
# Systemd
sudo journalctl -u givrwrld-api -f

# PM2
pm2 logs givrwrld-api
```

### 9.2 Check Database

```bash
mysql -u root -p app_core -e "SELECT COUNT(*) FROM users;"
mysql -u root -p app_core -e "SELECT COUNT(*) FROM orders;"
```

### 9.3 Backup Database

```bash
# Manual backup
mysqldump -u root -p app_core > backup-$(date +%Y%m%d).sql

# Restore
mysql -u root -p app_core < backup-20240101.sql
```

---

## Troubleshooting

### API Server Won't Start

1. Check environment variables: `cat api/.env`
2. Check database connection: `mysql -u app_user -p app_core`
3. Check logs: `sudo journalctl -u givrwrld-api -n 50`

### Frontend Can't Connect to API

1. Check `VITE_API_URL` in `.env.local`
2. Check CORS settings in `api/.env` (`FRONTEND_URL`)
3. Check API is running: `curl http://localhost:3001/health`

### Stripe Webhook Not Working

1. Verify webhook URL is correct in Stripe Dashboard
2. Check `STRIPE_WEBHOOK_SECRET` in `api/.env`
3. Check API logs for webhook errors
4. Test with Stripe CLI locally first

### Database Connection Errors

1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check credentials in `api/.env`
3. Test connection: `mysql -u app_user -p app_core`

---

## Quick Reference

### Environment Variables Checklist

**API Server (`api/.env`):**
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `DB_HOST=localhost`
- [ ] `DB_USER=app_user`
- [ ] `DB_PASSWORD=...`
- [ ] `DB_NAME=app_core`
- [ ] `JWT_SECRET=...` (32+ chars)
- [ ] `JWT_REFRESH_SECRET=...` (32+ chars)
- [ ] `STRIPE_SECRET_KEY=sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] `FRONTEND_URL=https://yourdomain.com`

**Frontend (`.env.local`):**
- [ ] `VITE_API_URL=https://api.yourdomain.com`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`

### Service Status Commands

```bash
# API Server
sudo systemctl status givrwrld-api
sudo systemctl restart givrwrld-api

# MySQL
sudo systemctl status mysql
sudo systemctl restart mysql

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
```

---

## Next Steps

1. ✅ Complete database setup
2. ✅ Configure API server
3. ✅ Configure frontend
4. ✅ Set up Stripe
5. ✅ Test all functionality
6. ⏳ Complete remaining frontend migration (optional)
7. ⏳ Set up monitoring/alerting
8. ⏳ Set up automated backups

---

## Support

- See `CODEX_AUDIT_FIXES.md` for all fixes applied
- See `REMAINING_FRONTEND_MIGRATION.md` for frontend migration details
- Check API logs for errors
- Test with Stripe test mode first

