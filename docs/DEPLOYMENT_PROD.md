# Production deployment (single dedicated server)

This guide covers deploying GIVRwrld on a **single dedicated server** (e.g. OVH, Hetzner): fresh Ubuntu → full stack with PM2, MySQL, Redis, nginx, backups, and rollback.

For local and general PM2 usage, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 1. Fresh Ubuntu: install stack

Assumed: Ubuntu 22.04 LTS (or 24.04), root or sudo.

### 1.1 System and Node

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git
# Node 20 LTS (adjust if you use a different method)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # expect v20.x
npm install -g pm2
pm2 startup   # follow the printed command to enable startup on boot
```

### 1.2 MySQL

```bash
sudo apt install -y mysql-server
sudo mysql -e "CREATE DATABASE IF NOT EXISTS app_core;"
# Create app user (match api/.env). Example:
# sudo mysql -e "CREATE USER 'app_rw'@'127.0.0.1' IDENTIFIED BY 'YOUR_PASSWORD';"
# sudo mysql -e "GRANT ALL ON app_core.* TO 'app_rw'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

See `sql/grants.sql` and `sql/init/00-grant-app-rw.sql` for patterns.

### 1.3 Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # expect PONG
```

### 1.4 nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

TLS (recommended): install certbot and use it after configuring server blocks:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 2. Clone repo and load database

```bash
sudo mkdir -p /opt/givrwrld && sudo chown "$USER:$USER" /opt/givrwrld
cd /opt/givrwrld
git clone <your-repo-url> .
# or: copy repo into /opt/givrwrld
```

Install dependencies:

```bash
npm install
cd api && npm install && cd ..
# If using marketing agent
cd services/marketing-agent && npm install && cd ../..
```

Load schema and migrations (from repo root; `api/.env` must have correct `MYSQL_*`):

```bash
cp api/env.example api/.env
# Edit api/.env (see DEPLOYMENT.md and api/env.example)
npm run db:migrate
```

This creates `app_core` (if missing), applies `sql/app_core.sql`, then all `sql/migrations/*.sql`.

---

## 3. Configure environment

- **API:** `api/.env` — set `MYSQL_*`, `JWT_SECRET`, PayPal, `PANEL_*`, `FRONTEND_URL` / `PUBLIC_SITE_URL`, and for production:
  - `NODE_ENV=production`
  - `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT` for the provisioning queue
- **Marketing agent:** `services/marketing-agent/.env` if you use it (same DB, Discord webhook, etc.).

Run a sanity check:

```bash
npm run ops:config:check
```

---

## 4. PM2 apps (all five)

From repo root:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

This starts:

| App                     | Role                          |
|-------------------------|-------------------------------|
| `givrwrld-api`          | Express API (port 3001)       |
| `givrwrld-agents`       | Ops agents (reconcile, etc.)  |
| `givrwrld-provisioner`  | BullMQ provisioning worker    |
| `givrwrld-marketing-agent`  | Hourly cron                |
| `givrwrld-marketing-schedule` | Weekly cron              |

Useful commands:

```bash
pm2 status
pm2 logs
pm2 restart all
```

---

## 5. nginx (reverse proxy and TLS)

Templates live under `ops/nginx/`:

- **api.**&lt;domain&gt; → proxy to API (port 3001): use `api.conf.example`
- **panel.**&lt;domain&gt;: see `panel.conf.example` (documentation only; panel may be elsewhere)
- **www.**&lt;domain&gt;: frontend on same box: use `www.conf.example`

Steps:

1. Copy and edit (replace `<your-domain>`):

   ```bash
   sudo cp /opt/givrwrld/ops/nginx/api.conf.example /etc/nginx/sites-available/givrwrld-api
   sudo sed -i 's/<your-domain>/yourdomain.com/g' /etc/nginx/sites-available/givrwrld-api
   sudo ln -s /etc/nginx/sites-available/givrwrld-api /etc/nginx/sites-enabled/
   ```

2. Test and reload:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. TLS:

   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

Repeat for `www` (and optionally panel) as needed. See `ops/nginx/README.md` for details.

---

## 6. Rollback plan

### Code rollback

- **Option A (git):**  
  `git log` → note the last good commit, then:
  ```bash
  git checkout <commit>
  npm install && cd api && npm install
  pm2 restart all
  ```
- **Option B (tag/release):** Keep a release tag; deploy by checking out that tag and restarting PM2.

After rollback, re-run migrations only if the *new* code you rolled back from had already run new migrations and you need the DB to match the old code. If the old code expects an older schema, avoid running newer migrations on that branch.

### Database rollback

- **If you have backups:** Use the restore script (see §7) to restore `app_core` from a backup taken before the change. Then restart services.
- **If you use migrations:** We do not auto-revert migrations. Rollback = restore from backup to a point in time, or manually reverse schema/data changes. Prefer testing migrations on a copy of production data first.

### Deploy checklist to reduce rollback need

1. Run config check: `npm run ops:config:check`
2. Run migrations on a DB copy or staging first
3. Take a backup before deploy: `./ops/backup.sh`
4. Deploy code, then `pm2 restart all`
5. Smoke-test health/ops endpoints and key flows

---

## 7. Backups and restore

### What gets backed up

- **app_core** MySQL database (dump, gzip)
- **Config:** `api/.env`, `ecosystem.config.cjs`, and nginx configs under `sites-enabled` that match `givrwrld*`

### Running a backup

From repo root (or set `BACKUP_ROOT`):

```bash
./ops/backup.sh
# Or: BACKUP_ROOT=/var/backups/givrwrld ./ops/backup.sh
```

Backups are written to `$BACKUP_ROOT/YYYYMMDD-HHMMSS/` (e.g. `backups/20260227-120000/`), containing:

- `app_core.sql.gz`
- `config/api.env`, `config/ecosystem.config.cjs`, `config/nginx/` (if present)

### Restore from latest backup

1. Stop services that use the DB:
   ```bash
   pm2 stop all
   ```
2. Restore:
   ```bash
   ./ops/restore.sh
   ```
   With no argument, this uses the latest timestamped directory under `BACKUP_ROOT`. To restore a specific backup:
   ```bash
   ./ops/restore.sh backups/20260227-120000
   ```
3. If you use migrations and the backup is from before the latest migration, run:
   ```bash
   npm run db:migrate
   ```
4. Restart:
   ```bash
   pm2 start all
   ```

Config files in `backups/<stamp>/config/` are **not** overwritten automatically; copy them back manually if needed (e.g. `api/.env` from `config/api.env`).

### Scheduling backups

Example cron (daily at 02:00, keep 7 days):

```bash
sudo crontab -e
# Add:
0 2 * * * BACKUP_ROOT=/var/backups/givrwrld /opt/givrwrld/ops/backup.sh
```

Add a cleanup step (e.g. delete backups older than 7 days) or use a separate script:

```bash
# Example: keep last 7 days
find /var/backups/givrwrld -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

### Restore drill (recommended)

Periodically verify backups by doing a **restore drill** in a **test environment** (not production):

1. Restore the latest production backup to a separate DB (e.g. `app_core_drill`) or a test server.
2. Run `gunzip -c .../app_core.sql.gz | mysql -u ... app_core_drill`.
3. Optionally start the API against this DB and run smoke tests.
4. Document any issues (missing env, permissions, disk space) and fix backup/restore or docs.

Suggested frequency: at least quarterly; monthly if you change schema or backup script often.

---

## 8. Optional: systemd instead of PM2

If you prefer one process per systemd unit, use `api/systemd/givrwrld-api.service` as a template and duplicate it for agents and provisioner (different `ExecStart` and `WorkingDirectory`). The repo currently recommends **PM2** for production so all five apps are managed in one place; see `ecosystem.config.cjs`. For a single-unit “run PM2 under systemd” approach, you can run:

```bash
pm2 start ecosystem.config.cjs && pm2 save
# Then in a systemd unit: ExecStart=/usr/bin/pm2 resurrect
```

(Ensure the unit runs as the same user that ran `pm2 save` and that `PM2_HOME` is set if needed.)

---

## 9. Summary checklist

- [ ] Ubuntu: Node 20+, PM2, MySQL, Redis, nginx (and certbot) installed
- [ ] Repo cloned (e.g. `/opt/givrwrld`), `npm install` (root + api + marketing-agent if used)
- [ ] `api/.env` and optional `services/marketing-agent/.env` configured
- [ ] `npm run db:migrate` applied (app_core + migrations)
- [ ] `npm run ops:config:check` passes
- [ ] `pm2 start ecosystem.config.cjs` and `pm2 save`; all five apps running
- [ ] nginx server blocks for api (and optionally www/panel); TLS with certbot
- [ ] Backups scheduled (cron); restore drill done periodically
