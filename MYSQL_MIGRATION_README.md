# MySQL Migration Guide - Removing Supabase

**Date:** 2025-11-09  
**Purpose:** Complete migration from Supabase to MySQL on VPS

---

## 🎯 Overview

This guide will help you:
1. Remove Supabase completely
2. Install and configure MySQL 8 on your VPS
3. Migrate all data structures to MySQL
4. Update your application to use MySQL instead of Supabase

---

## 📋 Prerequisites

- Ubuntu 24.04 VPS with root/sudo access
- Pterodactyl Panel already installed
- Stripe account with API keys
- Backup of any existing Supabase data (if needed)

---

## 🚀 Quick Start

### Step 1: Backup Existing Data (If Needed)

```bash
# If you have Supabase data to migrate, export it first
# This step is optional if starting fresh
```

### Step 2: Teardown Supabase

```bash
cd /home/ubuntu/givrwrld-severs
sudo bash scripts/supabase-teardown.sh
```

This will:
- Stop Supabase Docker containers
- Remove Supabase volumes
- Remove Supabase CLI
- Clean up Docker system

### Step 3: Install MySQL

```bash
cd /home/ubuntu/givrwrld-severs

# Edit sql/grants.sql and replace all 'REPLACE_ME_*' passwords
nano sql/grants.sql

# Run the installer
sudo bash scripts/setup-mysql.sh
```

The installer will:
- Install MySQL 8
- Secure MySQL installation
- Apply performance tuning
- Create databases (app_core, panel)
- Create users with proper permissions
- Import core schema
- Setup daily backups

### Step 4: Configure Pterodactyl Panel

```bash
# Edit Pterodactyl .env file
sudo nano /var/www/pterodactyl/.env
```

Update these values:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=panel
DB_USERNAME=panel_rw
DB_PASSWORD=REPLACE_ME_PANEL_STRONG_PASSWORD
```

Then run migrations:
```bash
cd /var/www/pterodactyl
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan queue:restart
```

### Step 5: Insert Secrets into MySQL

```bash
# Connect to MySQL
sudo mysql -u root app_core

# Set your AES key (generate with: openssl rand -hex 32)
SET @aes_key = 'YOUR_256BIT_AES_KEY_HERE';

# Insert Panel secrets
INSERT INTO secrets(scope, key_name, value_enc) VALUES
  ('panel','PANEL_URL', AES_ENCRYPT('https://panel.givrwrldservers.com', @aes_key)),
  ('panel','PANEL_APP_KEY', AES_ENCRYPT('ptla_app_YOUR_KEY', @aes_key))
ON DUPLICATE KEY UPDATE value_enc=VALUES(value_enc);

# Insert Stripe secrets
INSERT INTO secrets(scope, key_name, value_enc) VALUES
  ('stripe','STRIPE_SECRET_KEY', AES_ENCRYPT('sk_live_YOUR_KEY', @aes_key)),
  ('stripe','STRIPE_WEBHOOK_SECRET', AES_ENCRYPT('whsec_YOUR_KEY', @aes_key))
ON DUPLICATE KEY UPDATE value_enc=VALUES(value_enc);

# Insert config
INSERT INTO config(scope, key_name, value_str) VALUES
  ('worker','DEFAULT_REGION','us-central'),
  ('worker','PROVISION_TIMEOUT_SEC','900')
ON DUPLICATE KEY UPDATE value_str=VALUES(value_str);

EXIT;
```

**⚠️ IMPORTANT:** Save your AES key in your application `.env` files as `AES_KEY=...`

### Step 6: Sync Pterodactyl Catalog

```bash
cd /home/ubuntu/givrwrld-severs

# Set environment variables
export PANEL_URL="https://panel.givrwrldservers.com"
export PANEL_KEY="ptla_app_YOUR_APPLICATION_API_KEY"
export MYSQL_USER="root"

# Run sync script
bash scripts/sync-ptero-catalog.sh
```

This will:
- Fetch all nests from Pterodactyl
- Fetch all eggs from each nest
- Store them in MySQL `ptero_nests` and `ptero_eggs` tables

### Step 7: Insert Regions and Nodes

```bash
sudo mysql -u root app_core
```

```sql
-- Insert regions
INSERT INTO regions(code, display_name) VALUES
  ('us-central','US Central (Dallas)'),
  ('us-east','US East (Virginia)'),
  ('us-west','US West (California)')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

-- Insert nodes (replace with your actual Pterodactyl node IDs)
INSERT INTO ptero_nodes(ptero_node_id, name, region_code, max_ram_gb, max_disk_gb) VALUES
  (1, 'Dallas-01', 'us-central', 256, 2000),
  (2, 'Virginia-01', 'us-east', 256, 2000)
ON DUPLICATE KEY UPDATE name=VALUES(name), region_code=VALUES(region_code);

-- Map regions to nodes
INSERT INTO region_node_map(region_code, ptero_node_id, weight) VALUES
  ('us-central', 1, 100),
  ('us-east', 2, 100)
ON DUPLICATE KEY UPDATE weight=VALUES(weight);

EXIT;
```

### Step 8: Insert Plans and Link to Eggs/Stripe

```bash
sudo mysql -u root app_core
```

```sql
-- Insert plans (example - adjust for your actual plans)
INSERT INTO plans(id, item_type, game, ram_gb, vcores, ssd_gb, price_monthly, ptero_egg_id, stripe_product_id, stripe_price_id, display_name, is_active) VALUES
  ('mc-1gb', 'game', 'minecraft', 1, 1, 10, 4.99, 39, 'prod_XXX', 'price_1SPmR6B3VffY65l6oa9Vc1T4', 'Minecraft 1GB', 1),
  ('mc-2gb', 'game', 'minecraft', 2, 1, 20, 9.99, 39, 'prod_XXX', 'price_1SPmR6B3VffY65l6Ya3UxaOt', 'Minecraft 2GB', 1),
  ('rust-6gb', 'game', 'rust', 6, 3, 30, 24.99, 50, 'prod_XXX', 'price_1SPmUiB3VffY65l6Yax8JGJT', 'Rust 6GB', 1),
  ('palworld-8gb', 'game', 'palworld', 8, 4, 40, 23.99, 15, 'prod_XXX', 'price_1SQK3aB3VffY65l65HvxiHLC', 'Palworld 8GB', 1)
ON DUPLICATE KEY UPDATE
  ptero_egg_id=VALUES(ptero_egg_id),
  stripe_product_id=VALUES(stripe_product_id),
  stripe_price_id=VALUES(stripe_price_id),
  display_name=VALUES(display_name),
  is_active=VALUES(is_active);

-- Verify
SELECT id, game, ram_gb, ptero_egg_id, stripe_price_id FROM plans WHERE is_active=1;

EXIT;
```

**Note:** 
- `ptero_egg_id` should match eggs in `ptero_eggs` table (from sync script)
- `stripe_price_id` should match your Stripe Dashboard prices

---

## 🔧 Application Code Changes

### Remove Supabase Dependencies

```bash
# Remove Supabase packages
npm uninstall @supabase/supabase-js @supabase/auth-helpers-nextjs

# Or for package.json, remove these lines:
# "@supabase/supabase-js": "^2.53.0",
```

### Replace Database Client

Instead of:
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)
```

Use MySQL client:
```typescript
import mysql from 'mysql2/promise'
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
})
```

### Replace Authentication

Instead of Supabase Auth, implement:
- **Next.js**: Use NextAuth.js with Credentials provider
- **Node/Express**: Use Passport.js with local strategy
- **Laravel**: Use Laravel Breeze/Sanctum

Example (bcrypt password hashing):
```typescript
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Sign up
const passwordHash = await bcrypt.hash(password, 10)
const userId = uuidv4()
await connection.execute(
  'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
  [userId, email, passwordHash]
)

// Sign in
const [users] = await connection.execute(
  'SELECT * FROM users WHERE email = ?',
  [email]
)
const valid = await bcrypt.compare(password, users[0].password_hash)
```

---

## 🧪 Testing

### Test Database Connection

```bash
mysql -u app_rw -p app_core
# Enter password, then:
SHOW TABLES;
SELECT COUNT(*) FROM plans;
EXIT;
```

### Test Pterodactyl Catalog Sync

```bash
bash scripts/sync-ptero-catalog.sh
mysql -u root app_core -e "SELECT COUNT(*) as nests FROM ptero_nests;"
mysql -u root app_core -e "SELECT COUNT(*) as eggs FROM ptero_eggs;"
```

### Test Provisioning (Manual)

```bash
sudo mysql -u provisioning_rw -p app_core
```

```sql
SET @db_name = 'customer_test_123';
SET @db_user = 'cust_test_123';
SET @db_pass = 'TestPassword123!';

-- Run provision script
SOURCE /home/ubuntu/givrwrld-severs/scripts/provision-customer-db.sql;

-- Verify
SHOW DATABASES LIKE 'customer_%';
SELECT User, Host FROM mysql.user WHERE User LIKE 'cust_%';
EXIT;
```

### Test Backup

```bash
# Run backup manually
sudo bash /opt/backup/mysql/backup.sh

# Check backup files
ls -lh /opt/backup/mysql/

# Check backup timer
systemctl status mysql-backup.timer
```

---

## 📊 Verification Queries

### Check Database State

```sql
-- Check databases
SHOW DATABASES;

-- Check users
SELECT User, Host FROM mysql.user WHERE User IN ('app_rw','panel_rw','provisioning_rw','backup_ro');

-- Check app_core tables
USE app_core;
SHOW TABLES;

-- Check plans
SELECT id, game, ram_gb, ptero_egg_id, stripe_price_id FROM plans WHERE is_active=1;

-- Check Pterodactyl catalog
SELECT COUNT(*) as nests FROM ptero_nests;
SELECT COUNT(*) as eggs FROM ptero_eggs;
SELECT ptero_egg_id, name FROM ptero_eggs WHERE name LIKE '%Minecraft%';
```

---

## 🔐 Security Checklist

- [ ] All passwords in `sql/grants.sql` are strong and unique
- [ ] MySQL root password is set and secure
- [ ] MySQL binds to 127.0.0.1 only (not 0.0.0.0)
- [ ] UFW firewall configured (if allowing external MySQL access)
- [ ] AES key is strong (32+ bytes, random)
- [ ] AES key is stored in `.env` files only (not in code)
- [ ] Backup user has read-only access
- [ ] Provisioning user can only create customer DBs
- [ ] Application user has minimal required permissions

---

## 🚨 Troubleshooting

### MySQL Won't Start

```bash
# Check logs
sudo journalctl -u mysql -n 50

# Check configuration
sudo mysql --help | grep "Default options"

# Test configuration
sudo mysqld --validate-config
```

### Can't Connect to Database

```bash
# Check MySQL is running
sudo systemctl status mysql

# Check bind address
sudo grep bind-address /etc/mysql/mysql.conf.d/z-givrwrld.cnf

# Test connection
mysql -u app_rw -p -h 127.0.0.1 app_core
```

### Backup Fails

```bash
# Check backup script permissions
ls -l /opt/backup/mysql/backup.sh

# Check backup user permissions
mysql -u root -e "SHOW GRANTS FOR 'backup_ro'@'localhost';"

# Run backup manually with verbose output
bash -x /opt/backup/mysql/backup.sh
```

### Pterodactyl Catalog Sync Fails

```bash
# Test API connection
curl -H "Authorization: Bearer $PANEL_KEY" \
  -H "Accept: Application/vnd.pterodactyl.v1+json" \
  "$PANEL_URL/api/application/nests"

# Check jq is installed
command -v jq

# Check MySQL connection
mysql -u root app_core -e "SELECT 1;"
```

---

## 📝 Next Steps After Migration

1. **Update Application Code**
   - Replace Supabase client with MySQL client
   - Implement authentication (NextAuth/Passport/Laravel)
   - Update all database queries

2. **Update Edge Functions**
   - Convert Supabase Edge Functions to Node.js workers
   - Use MySQL connection pool
   - Update environment variables

3. **Update Frontend**
   - Remove Supabase SDK
   - Update API calls to use new endpoints
   - Update authentication flow

4. **Test End-to-End**
   - Test user registration
   - Test login
   - Test purchase flow
   - Test server provisioning

5. **Monitor**
   - Check MySQL slow query log
   - Monitor backup jobs
   - Check application logs

---

## 📚 Additional Resources

- **MySQL 8.0 Documentation**: https://dev.mysql.com/doc/refman/8.0/en/
- **Pterodactyl API Docs**: https://dashflo.net/docs/api/pterodactyl/v1/
- **Stripe Webhooks**: https://stripe.com/docs/webhooks

---

**Migration Complete!** 🎉

Your system is now running on MySQL instead of Supabase.



