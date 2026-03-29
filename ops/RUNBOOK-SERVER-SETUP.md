# Server runbook – complete site setup

Run these on the server (SSH in first: `ssh ubuntu@15.204.163.237`). When you see **SET UP ENV NOW**, do that step before continuing.

---

## 1. Nginx + TLS (if not done)

```bash
# Enable sites (if not already)
sudo ln -sf /etc/nginx/sites-available/www.givrwrldservers.com.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.givrwrldservers.com.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/panel.givrwrldservers.com.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# TLS – use YOUR real email
sudo certbot --nginx -d givrwrldservers.com -d www.givrwrldservers.com -d api.givrwrldservers.com -d panel.givrwrldservers.com --non-interactive --agree-tos -m YOUR_REAL_EMAIL
```

---

## 2. **SET UP ENV NOW**

Edit the API env file and add your real values:

```bash
sudo nano /opt/givrwrld/api/.env
```

**Required (minimal to get site + API up):**

- `NODE_ENV=production`
- `PORT=3001`
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `MYSQL_USER=app_rw`
- `MYSQL_PASSWORD=Y3bD4KZDnxoeh43voH9ZCRESg0LjSugD` (or the password from `sql/grants.sql` if you changed it)
- `MYSQL_DATABASE=app_core`
- `REDIS_HOST=127.0.0.1`
- `REDIS_PORT=6379`
- `PANEL_URL=https://panel.givrwrldservers.com`
- `FRONTEND_URL=https://www.givrwrldservers.com`
- `PUBLIC_SITE_URL=https://www.givrwrldservers.com`
- `JWT_SECRET=<generate a long random string, e.g. openssl rand -hex 32>`
- `JWT_REFRESH_SECRET=<another long random string>`

**For live payments and provisioning (add when ready):**

- `PAYPAL_SANDBOX=false`
- `PAYPAL_CLIENT_ID=...`
- `PAYPAL_CLIENT_SECRET=...`
- `PAYPAL_WEBHOOK_ID=...`
- `PANEL_APP_KEY=ptla_...` (from Pterodactyl Panel → Admin → Application API)
- `PTERO_DEFAULT_ALLOCATION_ID=<free allocation ID from Panel>`
- SMTP vars for email (e.g. SendGrid): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Save and exit (Ctrl+O, Enter, Ctrl+X).

---

## 3. Start the app (API + workers)

```bash
cd /opt/givrwrld
sudo pm2 start ecosystem.config.cjs
sudo pm2 save
sudo pm2 startup
# Run the command it prints (e.g. sudo env PATH=... pm2 startup systemd -u ubuntu --hp /home/ubuntu)
```

Check:

```bash
sudo pm2 status
curl -s http://127.0.0.1:3001/health
```

---

## 4. Pterodactyl (Panel + Wings) – if not already up

```bash
cd /opt/givrwrld/pterodactyl
# If .env doesn't exist:
echo "MYSQL_ROOT_PASSWORD=$(openssl rand -base64 24)" | sudo tee .env
echo "DB_PASSWORD=$(openssl rand -base64 24)" | sudo tee -a .env
sudo docker compose up -d
```

Then in the Panel (https://panel.givrwrldservers.com): create admin user, create Application API key, add allocations. Put the API key and one free allocation ID into `api/.env` as `PANEL_APP_KEY` and `PTERO_DEFAULT_ALLOCATION_ID`, then:

```bash
sudo pm2 restart givrwrld-api givrwrld-provisioner
```

---

## 5. Sync Pterodactyl catalog (after Panel is up)

```bash
cd /opt/givrwrld && node api/scripts/sync-pterodactyl-catalog.js --apply
```

---

## 6. Verify site

- https://www.givrwrldservers.com – frontend
- https://api.givrwrldservers.com/health – API
- https://panel.givrwrldservers.com – Pterodactyl (after step 4)

---

**Summary:** Do step 1 (nginx + certbot), then **step 2 (SET UP ENV NOW)**. After env is saved, do step 3 (PM2). Then 4–6 as needed.
