# Go Live Checklist - Steps 4-6 Completion

**Date:** 2025-11-10  
**Status:** In Progress

---

## ✅ Completed Steps

### Step 1-3: MySQL Setup
- [x] MySQL 8 installed and configured
- [x] Databases created (app_core, panel)
- [x] Users created with proper permissions
- [x] Schema imported (21 tables)

### Step 4: Pterodactyl Panel Configuration
- [x] Updated `/var/www/pterodactyl/.env` with MySQL credentials
- [x] Ran migrations: `php artisan migrate --force`
- [x] Cached configuration and routes
- [x] Restarted queue

### Step 5: Secrets Setup (Partial)
- [x] Generated AES key (saved to `AES_KEY.txt`)
- [x] Inserted Panel URL into MySQL (encrypted)
- [x] Inserted placeholder for PTERO_APP_KEY
- [x] Inserted placeholders for Stripe keys
- [ ] **TODO:** Update PTERO_APP_KEY with real value
- [ ] **TODO:** Update STRIPE_SECRET_KEY with real value
- [ ] **TODO:** Update STRIPE_WEBHOOK_SECRET with real value

### Step 6: Pterodactyl Catalog Sync
- [ ] **TODO:** Get Pterodactyl Application API Key
- [ ] **TODO:** Run sync script: `bash scripts/sync-ptero-catalog.sh`
- [ ] **TODO:** Verify nests and eggs in MySQL

---

## 🔑 Required Secrets

### 1. Pterodactyl Application API Key
**How to get:**
1. Log into Pterodactyl Panel: https://panel.givrwrldservers.com
2. Go to: Admin → Application API
3. Create new key or copy existing (starts with `ptla_`)

**Update in MySQL:**
```bash
# Get your AES key
AES_KEY=$(cat AES_KEY.txt)

# Update the secret
sudo mysql -u root app_core << EOF
SET @aes_key = '$AES_KEY';
UPDATE secrets SET value_enc = AES_ENCRYPT('ptla_YOUR_KEY_HERE', @aes_key)
WHERE scope = 'panel' AND key_name = 'PANEL_APP_KEY';
EOF
```

### 2. Stripe Secret Key
**How to get:**
1. Log into Stripe Dashboard: https://dashboard.stripe.com
2. Go to: Developers → API keys
3. Copy "Secret key" (starts with `sk_live_...`)

**Update in MySQL:**
```bash
AES_KEY=$(cat AES_KEY.txt)
sudo mysql -u root app_core << EOF
SET @aes_key = '$AES_KEY';
UPDATE secrets SET value_enc = AES_ENCRYPT('sk_live_YOUR_KEY', @aes_key)
WHERE scope = 'stripe' AND key_name = 'STRIPE_SECRET_KEY';
EOF
```

### 3. Stripe Webhook Secret
**How to get:**
1. Log into Stripe Dashboard
2. Go to: Developers → Webhooks
3. Click on your webhook endpoint
4. Copy "Signing secret" (starts with `whsec_...`)

**Update in MySQL:**
```bash
AES_KEY=$(cat AES_KEY.txt)
sudo mysql -u root app_core << EOF
SET @aes_key = '$AES_KEY';
UPDATE secrets SET value_enc = AES_ENCRYPT('whsec_YOUR_SECRET', @aes_key)
WHERE scope = 'stripe' AND key_name = 'STRIPE_WEBHOOK_SECRET';
EOF
```

---

## 🚀 Complete Step 6: Sync Pterodactyl Catalog

Once you have the Pterodactyl Application API Key:

```bash
cd /home/ubuntu/givrwrld-severs

# Set environment variables
export PANEL_URL="https://panel.givrwrldservers.com"
export PANEL_KEY="ptla_YOUR_APPLICATION_API_KEY"
export MYSQL_USER="root"

# Run sync script
bash scripts/sync-ptero-catalog.sh
```

This will:
- Fetch all nests from Pterodactyl
- Fetch all eggs for each nest
- Store them in MySQL `ptero_nests` and `ptero_eggs` tables

**Verify:**
```bash
sudo mysql -u root app_core -e "SELECT COUNT(*) as nests FROM ptero_nests;"
sudo mysql -u root app_core -e "SELECT COUNT(*) as eggs FROM ptero_eggs;"
```

---

## 📋 Next Steps After Steps 4-6

### Step 7: Insert Regions and Nodes
```bash
sudo mysql -u root app_core
```

```sql
-- Insert regions
INSERT INTO regions(code, display_name) VALUES
  ('us-central','US Central (Dallas)'),
  ('us-east','US East (Virginia)')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

-- Insert nodes (replace with your actual Pterodactyl node IDs)
INSERT INTO ptero_nodes(ptero_node_id, name, region_code, max_ram_gb, max_disk_gb) VALUES
  (1, 'GIVRwrld Node', 'us-central', 256, 2000)
ON DUPLICATE KEY UPDATE name=VALUES(name), region_code=VALUES(region_code);

-- Map regions to nodes
INSERT INTO region_node_map(region_code, ptero_node_id, weight) VALUES
  ('us-central', 1, 100)
ON DUPLICATE KEY UPDATE weight=VALUES(weight);
```

### Step 8: Insert Plans and Link to Eggs/Stripe
After syncing catalog, link your plans to eggs and Stripe prices.

---

## 🔐 Security Notes

- **AES Key:** Saved in `AES_KEY.txt` (chmod 600)
- **MySQL Passwords:** Saved in `PASSWORDS.txt` (chmod 600)
- **Never commit these files to git!**

---

## ✅ Verification Commands

```bash
# Check MySQL setup
sudo mysql -u root -e "SHOW DATABASES LIKE 'app_core';"
sudo mysql -u root -e "SELECT User FROM mysql.user WHERE User IN ('app_rw','panel_rw','provisioning_rw');"

# Check Pterodactyl connection
cd /var/www/pterodactyl && php artisan migrate:status

# Check secrets (decrypted)
AES_KEY=$(cat AES_KEY.txt)
sudo mysql -u root app_core << EOF
SET @aes_key = '$AES_KEY';
SELECT key_name, CAST(AES_DECRYPT(value_enc, @aes_key) AS CHAR) AS value
FROM secrets WHERE scope = 'panel';
EOF
```

---

**Status:** Ready to complete remaining secrets and sync catalog! 🚀
