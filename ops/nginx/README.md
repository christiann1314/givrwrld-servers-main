# Nginx templates for GIVRwrld

- **api.conf.example** — Reverse proxy for the Express API (port 3001). Use for `api.<your-domain>`.
- **panel.conf.example** — Documentation only; panel may run on another host.
- **www.conf.example** — Frontend (static or proxy). Use for `www.<your-domain>`.

**Setup (Ubuntu/Debian):**

1. Copy and edit: `cp api.conf.example /etc/nginx/sites-available/givrwrld-api.conf`, then replace `<your-domain>`.
2. Enable: `ln -s /etc/nginx/sites-available/givrwrld-api.conf /etc/nginx/sites-enabled/`
3. TLS: `certbot --nginx -d api.<your-domain>`
4. Reload: `nginx -t && systemctl reload nginx`
