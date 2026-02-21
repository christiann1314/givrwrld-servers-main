# 🔧 Get Pterodactyl Configuration - Step by Step

## **Current Issue**
- ❌ SSH requires key authentication
- ❌ Application API key getting 401 Unauthorized
- ❌ Panel giving 500 error on login

## **🚀 Solution: Manual Configuration**

Since we can't access the panel directly, let's get the configuration manually:

### **Step 1: Access Your Server Directly**

**You'll need to access your server directly to get the configuration. Here are your options:**

#### **Option A: SSH with Key**
```bash
# If you have SSH key
ssh -i /path/to/your/key ubuntu@15.204.251.32
```

#### **Option B: VPS Control Panel**
- Log into your VPS provider's control panel
- Access the server via web console
- Or download SSH key from provider

#### **Option C: Reset Panel Access**
- Reset Pterodactyl admin password
- Fix the 500 error

### **Step 2: Get Required Information**

Once you can access the server, run these commands:

```bash
# Check Pterodactyl status
sudo systemctl status pterodactyl

# Check logs for errors
sudo journalctl -u pterodactyl -e --no-pager
sudo tail -f /var/log/nginx/error.log

# Access MySQL to get configuration
sudo mysql -u root -p

# In MySQL, run these queries:
USE panel;

# Get Application API keys
SELECT * FROM api_keys WHERE type = 'application';

# Get Nodes
SELECT id, name, location, fqdn FROM nodes;

# Get Game Eggs
SELECT id, name, description FROM eggs WHERE name LIKE '%minecraft%' OR name LIKE '%rust%' OR name LIKE '%palworld%';

# Get Client API keys (if any exist)
SELECT * FROM api_keys WHERE type = 'client';
```

### **Step 3: Alternative - Create/Reset Admin via Panel UI**

If existing credentials don't work, use the panel login reset flow or your provider's database access to reset the admin password. Avoid framework-specific CLI steps.

### **Step 4: What We Need**

Once you can access the panel, we need:

1. **Client API Key** (for server monitoring)
   - Admin → API Credentials → Create Client API Key
   - Or get from database: `SELECT * FROM api_keys WHERE type = 'client';`

2. **Node Information**
   - Admin → Nodes → Note the ID numbers
   - Or get from database: `SELECT id, name, location, fqdn FROM nodes;`

3. **Game Egg IDs**
   - Admin → Nests → Note the egg ID numbers
   - Or get from database: `SELECT id, name FROM eggs WHERE name LIKE '%minecraft%' OR name LIKE '%rust%' OR name LIKE '%palworld%';`

## **🎯 Quick Fix Options**

### **Option 1: Reset Panel Admin**
```bash
# SSH into server
ssh ubuntu@15.204.251.32

# Reset admin user
cd /var/www/pterodactyl
php artisan p:user:make --email=admin@givrwrldservers.com --admin --name-first=Admin --name-last=User --password=NewPassword123
```

### **Option 2: Check Panel Logs**
```bash
# Check what's causing the 500 error
sudo journalctl -u pterodactyl -f
sudo tail -f /var/log/nginx/error.log
```

### **Option 3: Restart Services**
```bash
# Restart Pterodactyl
sudo systemctl restart pterodactyl
sudo systemctl restart nginx
sudo systemctl restart mysql
```

## **📋 Next Steps**

1. **Try to access your server** (SSH, VPS panel, or web console)
2. **Run the diagnostic commands** above
3. **Get the required configuration details**
4. **Share the results** so I can complete the setup

**Which method would you like to try first?**

