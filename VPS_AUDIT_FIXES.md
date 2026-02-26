# VPS Audit & Self-Service Fixes Guide

**Date:** 2025-11-07  
**System:** Ubuntu 24.04 (Noble)  
**Status:** Ready for Improvements

---

## 🔴 Critical Security Fixes (Do First)

### 1. Fix Nginx SSL Certificate Paths
**Issue:** Nginx config references manual cert paths, but Let's Encrypt certs are in different location  
**Current:** `/etc/ssl/certs/givrwrldservers.com.crt`  
**Should be:** `/etc/letsencrypt/live/givrwrldservers.com-0001/fullchain.pem`

**Fix:**
```bash
# Backup current config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Edit nginx config
sudo nano /etc/nginx/sites-available/default

# Update SSL paths to:
ssl_certificate /etc/letsencrypt/live/givrwrldservers.com-0001/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/givrwrldservers.com-0001/privkey.pem;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Priority:** 🔴 CRITICAL - Site may not be serving HTTPS correctly

---

### 2. Disable SSH Password Authentication
**Issue:** SSH allows password authentication (security risk)  
**Current:** `PasswordAuthentication yes`

**Fix:**
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Change to:
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH (keep session open!)
sudo systemctl restart sshd

# Test in new terminal before closing current session
```

**Priority:** 🔴 CRITICAL - Prevents brute force attacks

**Note:** Make sure you have SSH keys set up first! Test before closing session.

---

### 3. Set Up Automatic SSL Certificate Renewal
**Issue:** SSL certs expire in 32-53 days, need auto-renewal

**Fix:**
```bash
# Check if renewal is scheduled
sudo systemctl status certbot.timer

# If not enabled, enable it:
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Add renewal hook to reload nginx
sudo nano /etc/letsencrypt/renewal/givrwrldservers.com-0001.conf

# Add this line under [renewalparams]:
renew_hook = systemctl reload nginx
```

**Priority:** 🟡 HIGH - Prevents certificate expiration

---

## 🟡 Important Improvements

### 4. Set Up Log Rotation for Nginx
**Issue:** Logs are growing, need proper rotation

**Fix:**
```bash
# Check current logrotate config
cat /etc/logrotate.d/nginx

# If missing or incomplete, create/edit:
sudo nano /etc/logrotate.d/nginx

# Add this configuration:
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    endscript
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}

# Test the configuration
sudo logrotate -d /etc/logrotate.d/nginx
```

**Priority:** 🟡 MEDIUM - Prevents disk space issues

---

### 5. Set Up Automated Backups
**Issue:** No backup automation configured

**Fix:**
```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
nano ~/backup-vps.sh

# Add this content:
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup nginx config
tar -czf "$BACKUP_DIR/nginx-config-$DATE.tar.gz" /etc/nginx/

# Backup website files
tar -czf "$BACKUP_DIR/website-$DATE.tar.gz" /var/www/givrwrldservers.com/

# Backup SSL certificates (if needed)
tar -czf "$BACKUP_DIR/ssl-certs-$DATE.tar.gz" /etc/letsencrypt/

# Keep only last 7 days of backups
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Backup completed: $DATE"

# Make executable
chmod +x ~/backup-vps.sh

# Test it
~/backup-vps.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/ubuntu/backup-vps.sh >> /home/ubuntu/backup.log 2>&1
```

**Priority:** 🟡 HIGH - Protects against data loss

---

### 6. Install and Configure Fail2Ban for Nginx
**Issue:** Fail2Ban is running but may not be protecting Nginx

**Fix:**
```bash
# Check if nginx jail exists
sudo fail2ban-client status

# Create nginx jail
sudo nano /etc/fail2ban/jail.local

# Add this configuration:
[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600
findtime = 600

[nginx-botsearch]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 10
bantime = 86400
findtime = 3600

# Restart fail2ban
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status nginx-limit-req
sudo fail2ban-client status nginx-botsearch
```

**Priority:** 🟡 MEDIUM - Protects against brute force

---

### 7. Update System Packages
**Issue:** 19 packages have updates available

**Fix:**
```bash
# Update package list
sudo apt update

# See what will be updated
sudo apt list --upgradable

# Update all packages
sudo apt upgrade -y

# Reboot if kernel was updated
sudo reboot
```

**Priority:** 🟡 MEDIUM - Security and stability updates

**Note:** Auto-updates are enabled, but manual update ensures latest patches

---

### 8. Optimize Nginx Configuration
**Issue:** Nginx config can be optimized for performance

**Fixes:**
```bash
# Edit nginx config
sudo nano /etc/nginx/nginx.conf

# Add these optimizations in http block:
http {
    # Increase worker connections
    worker_connections 2048;
    
    # Enable sendfile
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # Increase timeouts
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    
    # Gzip (already configured, but verify)
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Priority:** 🟢 LOW - Performance improvement

---

### 9. Set Up Monitoring/Health Checks
**Issue:** No automated health monitoring

**Fix:**
```bash
# Create health check script
nano ~/health-check.sh

# Add this content:
#!/bin/bash
ALERT_EMAIL="your-email@example.com"  # Change this

# Check nginx
if ! systemctl is-active --quiet nginx; then
    echo "Nginx is down!" | mail -s "VPS Alert: Nginx Down" $ALERT_EMAIL
    sudo systemctl restart nginx
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Disk usage is at ${DISK_USAGE}%" | mail -s "VPS Alert: High Disk Usage" $ALERT_EMAIL
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "Memory usage is at ${MEM_USAGE}%" | mail -s "VPS Alert: High Memory Usage" $ALERT_EMAIL
fi

# Make executable
chmod +x ~/health-check.sh

# Add to crontab (every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * /home/ubuntu/health-check.sh >> /home/ubuntu/health-check.log 2>&1
```

**Priority:** 🟡 MEDIUM - Early problem detection

**Note:** Requires `mail` package: `sudo apt install mailutils`

---

### 10. Clean Up Firewall Rules
**Issue:** Firewall has many duplicate/overlapping rules

**Fix:**
```bash
# Review current rules
sudo ufw status numbered

# Remove duplicate rules (example - be careful!)
# sudo ufw delete [rule number]

# Keep only necessary ports:
# - 22 (SSH)
# - 80, 443 (HTTP/HTTPS)
# - Game server ports (if needed)

# Example cleanup:
sudo ufw delete allow 8080/tcp  # If not needed
sudo ufw delete allow 2022/tcp  # If not needed

# Reload firewall
sudo ufw reload
```

**Priority:** 🟢 LOW - Security best practice

**Warning:** Only remove rules you're sure aren't needed!

---

## 🟢 Optional Optimizations

### 11. Enable HTTP/2 and HTTP/3
**Issue:** Only HTTP/2 is enabled, HTTP/3 can improve performance

**Fix:**
```bash
# Install nginx with HTTP/3 support (if not already)
# This requires nginx built with quic module

# For now, ensure HTTP/2 is working:
# Check nginx config has: listen 443 ssl http2;
```

**Priority:** 🟢 LOW - Performance enhancement

---

### 12. Set Up Rate Limiting in Nginx
**Issue:** No rate limiting configured

**Fix:**
```bash
# Edit nginx config
sudo nano /etc/nginx/nginx.conf

# Add in http block:
http {
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
}

# Then in server block:
server {
    # Rate limit API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        # ... rest of config
    }
    
    # Rate limit login
    location /auth/ {
        limit_req zone=login burst=5 nodelay;
        # ... rest of config
    }
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Priority:** 🟢 LOW - DDoS protection

---

## 📋 Quick Fix Checklist

Run these commands in order:

```bash
# 1. Fix SSL paths (CRITICAL)
sudo nano /etc/nginx/sites-available/default
# Update SSL certificate paths
sudo nginx -t && sudo systemctl reload nginx

# 2. Disable SSH passwords (CRITICAL - after setting up keys!)
sudo nano /etc/ssh/sshd_config
# Set PasswordAuthentication no
sudo systemctl restart sshd

# 3. Enable certbot auto-renewal
sudo systemctl enable certbot.timer
sudo certbot renew --dry-run

# 4. Set up backups
mkdir -p ~/backups
# Create backup script (see above)
crontab -e
# Add daily backup

# 5. Update system
sudo apt update && sudo apt upgrade -y

# 6. Configure log rotation
sudo nano /etc/logrotate.d/nginx
# Add config (see above)

# 7. Set up health monitoring
nano ~/health-check.sh
# Add script (see above)
crontab -e
# Add health check cron
```

---

## 🔍 Verification Commands

After making fixes, verify:

```bash
# Check SSL certificate
sudo certbot certificates

# Check nginx status
sudo systemctl status nginx

# Check SSL in browser
curl -I https://givrwrldservers.com

# Check fail2ban
sudo fail2ban-client status

# Check firewall
sudo ufw status verbose

# Check disk space
df -h

# Check logs
sudo tail -f /var/log/nginx/error.log
```

---

## ⚠️ Important Notes

1. **Always backup before making changes:**
   ```bash
   sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
   ```

2. **Test nginx config before reloading:**
   ```bash
   sudo nginx -t
   ```

3. **Keep SSH session open when changing SSH config:**
   - Test in new terminal before closing

4. **Monitor after changes:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo systemctl status nginx
   ```

---

## 📊 Current Status Summary

✅ **Good:**
- Auto-updates enabled
- Fail2Ban running
- Firewall active
- SSL certificates valid (32-53 days remaining)
- Nginx running
- Log rotation working

🔴 **Needs Fix:**
- SSL certificate paths in nginx config
- SSH password authentication enabled
- No automated backups
- No health monitoring

🟡 **Can Improve:**
- System updates available
- Firewall rules cleanup
- Nginx optimization
- Rate limiting

---

**Start with the 🔴 Critical fixes first!**

