# MySQL Migration Summary

**Date:** 2025-11-09  
**Status:** ✅ All Migration Files Created

---

## 📦 Complete Package

All files have been created for migrating from Supabase to MySQL. Here's what you have:

### Core Files

1. **`sql/app_core.sql`** - Complete database schema
   - Users, roles, authentication
   - Plans, orders, subscriptions
   - Pterodactyl catalog (nests, eggs, nodes, regions)
   - Stripe integration tables
   - Secrets storage (AES encrypted)
   - Support tickets, audit logs

2. **`sql/grants.sql`** - Database users and permissions
   - `app_rw` - Application read/write
   - `panel_rw` - Pterodactyl panel access
   - `provisioning_rw` - Can create customer DBs
   - `backup_ro` - Read-only for backups

3. **`scripts/setup-mysql.sh`** - Automated installer
   - Installs MySQL 8
   - Applies configuration
   - Creates databases and users
   - Imports schema
   - Sets up backups

4. **`scripts/supabase-teardown.sh`** - Safe Supabase removal
   - Stops Supabase containers
   - Removes volumes
   - Cleans up Docker

5. **`scripts/backup.sh`** - Daily backup script
   - Backs up app_core, panel, customer_* databases
   - Compresses backups
   - 14-day retention

6. **`scripts/sync-ptero-catalog.sh`** - Pterodactyl catalog sync
   - Fetches nests from Pterodactyl API
   - Fetches eggs for each nest
   - Stores in MySQL

7. **`scripts/provision-customer-db.sql`** - Customer DB provisioning
   - Creates per-customer database
   - Creates per-customer user
   - Grants appropriate permissions

### Configuration Files

8. **`mysql/conf.d/z-givrwrld.cnf`** - MySQL tuning
   - Performance optimization
   - Security settings
   - Binary logging for backups

9. **`systemd/mysql-backup.service`** - Backup service unit
10. **`systemd/mysql-backup.timer`** - Daily backup timer

### Environment Templates

11. **`.env.api.example`** - API server environment
12. **`.env.worker.example`** - Worker environment
13. **`.env.panel.example`** - Pterodactyl panel environment

### Documentation

14. **`MYSQL_MIGRATION_README.md`** - Complete step-by-step guide
15. **`CURSOR_MYSQL_MIGRATION_PROMPT.md`** - Cursor prompt reference

---

## 🚀 Quick Start

### 1. Prepare Passwords

```bash
# Edit grants.sql and replace all REPLACE_ME_* passwords
nano sql/grants.sql

# Generate strong passwords:
openssl rand -base64 32  # For each password
```

### 2. Run Installer

```bash
sudo bash scripts/setup-mysql.sh
```

### 3. Configure Pterodactyl

```bash
# Edit panel .env
sudo nano /var/www/pterodactyl/.env

# Update DB settings, then:
cd /var/www/pterodactyl
php artisan migrate --force
```

### 4. Insert Secrets

```bash
# Generate AES key
openssl rand -hex 32

# Insert into MySQL (see MYSQL_MIGRATION_README.md)
sudo mysql -u root app_core
```

### 5. Sync Pterodactyl Catalog

```bash
export PANEL_URL="https://panel.givrwrldservers.com"
export PANEL_KEY="ptla_app_YOUR_KEY"
bash scripts/sync-ptero-catalog.sh
```

---

## 📊 Database Schema Overview

### Core Tables
- `users` - User accounts (bcrypt/argon2 hashes)
- `roles` - Role definitions
- `user_roles` - User-role assignments
- `plans` - Server plans (linked to Pterodactyl eggs & Stripe prices)
- `orders` - Purchase orders
- `external_accounts` - Pterodactyl user linking

### Pterodactyl Catalog
- `regions` - Marketing regions
- `ptero_nodes` - Pterodactyl nodes
- `ptero_nests` - Pterodactyl nests
- `ptero_eggs` - Pterodactyl eggs
- `region_node_map` - Region → Node mapping

### Stripe Integration
- `stripe_customers` - Stripe customer IDs
- `stripe_subscriptions` - Subscription tracking
- `stripe_events_log` - Webhook event log

### Support & Audit
- `tickets` - Support tickets
- `ticket_messages` - Ticket messages
- `audit_log` - Audit trail
- `server_stats_cache` - Server stats cache

### Configuration
- `secrets` - Encrypted secrets (AES)
- `config` - Plaintext configuration

---

## 🔐 Security Features

- ✅ Least-privilege database users
- ✅ MySQL binds to 127.0.0.1 only
- ✅ AES encryption for secrets in database
- ✅ Strong password requirements
- ✅ Automated daily backups
- ✅ 14-day backup retention
- ✅ Binary logging for point-in-time recovery

---

## 📝 Next Steps

1. **Review Files** - Check all SQL and scripts
2. **Update Passwords** - Replace all `REPLACE_ME_*` placeholders
3. **Run Installer** - Execute `setup-mysql.sh`
4. **Configure Panel** - Update Pterodactyl `.env`
5. **Insert Secrets** - Add encrypted secrets to MySQL
6. **Sync Catalog** - Run Pterodactyl catalog sync
7. **Update Application** - Replace Supabase code with MySQL
8. **Test** - Verify end-to-end flow

---

## 🆘 Support

- See `MYSQL_MIGRATION_README.md` for detailed instructions
- Check troubleshooting section for common issues
- Verify all passwords are strong and unique

---

**Ready to migrate!** 🚀



