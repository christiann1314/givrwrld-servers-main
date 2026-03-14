# Run the 128 GB node setup script

After you can SSH into the server (`ssh root@15.204.163.237`), run the automated setup.

## 1. Get the repo on the server

**Option A – Clone from Git (if the repo is on GitHub):**

```bash
ssh root@15.204.163.237
apt-get update && apt-get install -y git
git clone https://github.com/YOUR_ORG/givrwrld-severs.git /opt/givrwrld
cd /opt/givrwrld
```

**Option B – Copy from your PC with SCP:**

From **PowerShell on your Windows machine** (in the folder that contains `givrwrld-severs-main`):

```powershell
scp -r .\givrwrld-severs-main root@15.204.163.237:/opt/givrwrld
```

Then SSH in and go to the repo:

```bash
ssh root@15.204.163.237
cd /opt/givrwrld
```

## 2. Run the setup script

```bash
cd /opt/givrwrld
bash ops/setup-128gb-node.sh
```

This installs Node 20, PM2, MariaDB, Redis, Docker, nginx, certbot, applies DB schema and migrations, seeds plans, builds the frontend, and creates a minimal `api/.env`. It can take 5–15 minutes.

## 3. Do the manual steps (printed at the end)

The script prints “Next steps (manual)”. In short:

1. **Edit `api/.env`** – Add PayPal credentials, `PANEL_APP_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, SMTP, and (after Panel is up) `PTERO_DEFAULT_ALLOCATION_ID`.
2. **Start Pterodactyl** – In `pterodactyl/`, create `.env` with `MYSQL_ROOT_PASSWORD` and `DB_PASSWORD`, then `docker compose up -d`. Open Panel, create admin user, create Application API key and allocations, set node memory limit to ~105000 MB.
3. **Sync catalog** – `node api/scripts/sync-pterodactyl-catalog.js --apply`
4. **nginx + TLS** – Copy `ops/nginx/*.conf.example` to `/etc/nginx/sites-available`, replace `<your-domain>` with `givrwrldservers.com`, enable sites, run `certbot --nginx -d www.givrwrldservers.com -d api.givrwrldservers.com -d panel.givrwrldservers.com`
5. **PM2** – `pm2 start ecosystem.config.cjs && pm2 save && pm2 startup`

Full checklist: **docs/ROADMAP-128GB-SINGLE-NODE.md**.
