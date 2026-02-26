# Deploy on a VPS

## Recommended roles

- **API + DB + reverse proxy**: One VPS runs Node (API), MariaDB (`app_core`), and Nginx (or Caddy) as reverse proxy. Optionally same host runs Pterodactyl Panel or it can be separate.
- **Game nodes**: Separate machine(s) run Pterodactyl Wings; Panel points to these nodes. US-East at launch = one game node.

## Process manager

- **PM2 (recommended)**: From **repo root**, run `npm run pm2:start` (or `pm2 start ecosystem.config.cjs`). This starts **both** the API and the **agents** (OpsWatchdog, ProvisioningAuditor, GrowthAdsGenerator). Running the agents on the VPS is recommended so monitoring, provisioning checks, and marketing copy run 24/7 next to the API. Use `pm2 save` and `pm2 startup` so both processes restart on reboot.
- **systemd**: If you prefer systemd, create two units: one for `node server.js` (API) and one for `node agents/runner.js` (agents), both from `api/` with `NODE_ENV=production` and the correct `PATH`/env file. Example for the API:

```ini
[Unit]
Description=GIVRwrld API
After=network.target mariadb.service

[Service]
Type=simple
User=givrwrld
WorkingDirectory=/opt/givrwrld/api
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
EnvironmentFile=/opt/givrwrld/api/.env
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## TLS + firewall

- **TLS**: Terminate at the reverse proxy (Nginx/Caddy). Use Let’s Encrypt (e.g. `certbot` or Caddy’s automatic HTTPS). Proxy `https://yourdomain.com` → `http://127.0.0.1:3001`.
- **Firewall**: Open 22 (SSH), 80 (HTTP), 443 (HTTPS). Do not expose 3001, 3306, or 8000 to the internet unless intended; restrict DB and Panel to localhost or VPN.

## Ops and monitoring

- **Health:** `GET /health` (200 when process is up). **Ready:** `GET /ready` (200 when DB and required env are OK; 503 otherwise).
- **Ops summary:** `GET /ops/summary` returns order counts by status, last webhook time, and stuck-order count. It is unauthenticated; in production, restrict access (e.g. firewall to internal IPs or add a simple API key check) if you expose it.

---

## Backup plan

- **MariaDB**: Daily `mysqldump app_core` (and any other DBs) to a backup volume or object storage. Retain at least 7 days.
- **Env/secrets**: Back up `api/.env` (and any secret stores) securely; do not commit to git.
- **Panel/eggs**: Back up Pterodactyl Panel DB and config; document restore steps for panel and Wings.
