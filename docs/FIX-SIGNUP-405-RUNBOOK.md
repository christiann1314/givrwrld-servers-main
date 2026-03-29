# Fix signup 405 – do this on the VPS

Do these steps **on the server** (SSH as ubuntu). Order matters.

---

## Step 1: Pull latest code

```bash
cd /opt/givrwrld
git pull
```

---

## Step 2: Create the missing DB table (stops 500)

```bash
cd /opt/givrwrld
mysql -u app_rw -p app_core < sql/migrations/20260217000100_email_verification_tokens.sql
```

(Enter your `app_core` MySQL password when prompted.)

---

## Step 3: Make nginx proxy `/api/` to the API (fixes 405)

The 405 happens because the browser calls `https://givrwrldservers.com/api/auth/signup` and nginx serves the **static site** for that host, so POST returns 405. We need nginx to **forward** `/api/` to your Node API on port 3001.

**3a) Find your nginx config for the main site:**

```bash
sudo grep -l "givrwrldservers.com" /etc/nginx/sites-enabled/*
# or
sudo grep -l "givrwrldservers.com" /etc/nginx/sites-available/*
```

Note the path, e.g. `/etc/nginx/sites-available/givrwrldservers.com` or `default`.

**3b) Edit that file:**

```bash
sudo nano /etc/nginx/sites-available/WHATEVER_YOU_FOUND
```

**3c) Add two things:**

- **At the very top of the file** (before any `server {`), add:

```nginx
upstream givrwrld_api {
    server 127.0.0.1:3001;
    keepalive 32;
}
```

- **Inside the `server { ... }` block** that has `server_name ... givrwrldservers.com ...` (and that serves the frontend), add **before** the existing `location / {` block:

```nginx
    location /api/ {
        proxy_pass http://givrwrld_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
```

If you have **two** server blocks (one for port 80, one for 443), add the **same** `location /api/` block inside **both** (the upstream stays only once at the top).

**3d) Test and reload nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 4: Rebuild frontend (optional but recommended)

```bash
cd /opt/givrwrld
export VITE_API_URL="https://api.givrwrldservers.com"
npm run build
```

---

## Step 5: Restart API

```bash
cd /opt/givrwrld
pm2 restart givrwrld-api givrwrld-provisioner
```

---

## Step 6: Test in the browser

1. Hard refresh: **Ctrl+Shift+R** (or Cmd+Shift+R on Mac) on `https://givrwrldservers.com/auth`.
2. Try **Create Account** again.

The request will still go to `https://givrwrldservers.com/api/auth/signup`, but nginx will proxy it to the API, so you should get **201** or a JSON error (e.g. SMTP), not 405.

---

## If it still returns 405

- **Cloudflare:** If the domain is proxied (orange cloud), 405 might be from Cloudflare. Try: DNS only (grey cloud) for a minute and test again, or add a Page Rule / WAF exception for `*/api/*` if something is blocking POST.
- **Wrong server block:** Ensure the `location /api/` block is in the server that handles `https://givrwrldservers.com` (and `https://www.givrwrldservers.com` if you use it). Run `sudo nginx -T` and search for `server_name` and `location /api/` to confirm.
- **API not running:** Run `curl -s http://127.0.0.1:3001/health` on the server; you should see `{"status":"ok",...}`. If not, start the API (e.g. `pm2 start ...`).
