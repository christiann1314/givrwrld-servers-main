# Add /api/ proxy to www.givrwrldservers.com.conf (you have HTTPS)

Your www site is in **`/etc/nginx/sites-enabled/www.givrwrldservers.com.conf`** and already has a Certbot-managed 443 block. Add the following.

## 1. Open the file

```bash
sudo nano /etc/nginx/sites-enabled/www.givrwrldservers.com.conf
```

## 2. Add the upstream once at the top

At the **very top** of the file (before any `server {`), add:

```nginx
upstream givrwrld_api {
    server 127.0.0.1:3001;
    keepalive 32;
}
```

If you already have `upstream givrwrld_api` in this file, skip this.

## 3. Add `location /api/` in BOTH server blocks

You should see **two** `server { ... }` blocks in this file:

- One with `listen 80;` and `server_name www.givrwrldservers.com givrwrldservers.com;`
- One with `listen 443 ssl;` and the same `server_name` (and Certbot SSL lines)

In **each** of those blocks, add this **before** the existing `location / {` line:

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

So each block looks like:

```nginx
server {
    listen 80;   # or listen 443 ssl;
    server_name www.givrwrldservers.com givrwrldservers.com;
    root /opt/givrwrld/dist;
    index index.html;

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

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 4. Test and reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Then hard-refresh https://givrwrldservers.com/auth and try signup again.
