# VPS Audit: Why Migrations / Signup Didn’t Work

**Short answer:** The repo has the *code* and *migration files*. Pulling from GitHub does **not** run database migrations or rebuild the frontend. Someone has to run those steps on the VPS after each pull (or you automate them).

---

## 1. Why the migration “didn’t work”

- **What’s in the repo:**  
  - `sql/app_core.sql` – base schema (users, orders, plans, …).  
  - `sql/migrations/*.sql` – extra tables/changes (e.g. `20260217000100_email_verification_tokens.sql`).

- **What “run” means:**  
  A migration only takes effect when you **execute** it against the server’s MySQL, for example:
  - Once during initial setup: `ops/setup-128gb-node.sh` runs `sql/migrations/*.sql`.
  - After a pull that adds a new migration: you must run that migration (or all of them) again.

- **Why the table was missing:**  
  Either:
  1. The server was set up **before** `email_verification_tokens` was added to `sql/migrations/`, so the setup script never ran it, or  
  2. You added the migration to the repo later and **only** did `git pull` on the VPS, and did **not** run the migration or `npm run db:migrate` again.

So: **pull only updates files; it does not run `mysql ... < file.sql` or `npm run db:migrate`.**

---

## 2. Why you see 405 on signup in the browser

- **What’s happening:**  
  The browser is sending the signup request to  
  **`https://www.givrwrldservers.com/api/auth/signup`**  
  (the same host as the page). That’s the **static frontend** (nginx serving `dist/`). Nginx is not configured to proxy `/api/*` on that host, so it treats the POST as a request for a file and returns **405 Method Not Allowed** (and often `Content-Type: text/html`).

- **What should happen:**  
  The frontend should call **`https://api.givrwrldservers.com/api/auth/signup`** (the API host). Then the request hits your Node API and signup works (assuming the DB table exists).

- **Why it’s still hitting www:**  
  One or both of:
  1. **Old/cached frontend:** The JS bundle the browser has doesn’t use the API base URL (e.g. no `VITE_API_URL` at build time, or an old build). So it falls back to same-origin and posts to `www`.
  2. **New code not deployed:** The fix that uses `api.givrwrldservers.com` when the app is served from `givrwrldservers.com` is in the repo but the VPS hasn’t had a new frontend build + deploy, or the browser is still using a cached bundle.

So: **pull doesn’t rebuild or redeploy the frontend.** You must build and replace `dist/` on the VPS (and users may need a hard refresh).

---

## 3. What you’re “supposed to do” so the repo and VPS stay in sync

Think of it in two layers:

| Layer | In GitHub | On the VPS (you must do) |
|-------|-----------|---------------------------|
| **Code** | Yes – all source and migration *files* | `git pull` updates files only. |
| **Database** | No – DB lives on the server | Run new migrations after pull: `mysql ... < sql/migrations/...sql` or `npm run db:migrate`. |
| **Frontend** | No – built output is not in repo | After pull (if frontend or env changed): set `VITE_API_URL`, run `npm run build`, serve `dist/`. |
| **Processes** | No | Start/restart API and workers (e.g. PM2). |

So: **“Pull and everything runs smooth”** is only true if you also run the same steps you’d run on a fresh deploy: apply new migrations, rebuild frontend when needed, restart app/workers.

---

## 4. One-time fix (current state)

Run these on the VPS **once** to fix the missing table and get signup working with the API:

```bash
cd /opt/givrwrld

# 1) Apply the email_verification_tokens migration (fixes 500 on signup)
mysql -u app_rw -p app_core < sql/migrations/20260217000100_email_verification_tokens.sql

# 2) Rebuild frontend so requests go to api.givrwrldservers.com (fixes 405)
export VITE_API_URL="https://api.givrwrldservers.com"
npm run build

# 3) Restart API so it picks up any env/code changes
pm2 restart givrwrld-api givrwrld-provisioner
```

Then in the browser: hard refresh (Ctrl+Shift+R) on `https://www.givrwrldservers.com/auth` and try signup again. The request should go to `https://api.givrwrldservers.com/api/auth/signup` and return 201 (or an SMTP error if email isn’t configured), not 405.

---

## 5. After every `git pull` (runbook)

Use this (or automate it) so the site stays correct after each pull:

```bash
cd /opt/givrwrld
git pull

# If new migrations were added (you added .sql under sql/migrations/)
npm run db:migrate
# Or run only the new file: mysql -u app_rw -p app_core < sql/migrations/NEWFILE.sql

# If frontend or API changed
export VITE_API_URL="https://api.givrwrldservers.com"
npm run build

# Restart app
pm2 restart givrwrld-api givrwrld-provisioner
```

Optional: add a small script on the VPS, e.g. `bin/after-pull.sh`, that runs the above so you don’t have to remember the steps.

---

## 6. Summary

| Issue | Cause | Fix |
|-------|--------|-----|
| **500 – table doesn’t exist** | Migration file was never run on the server’s MySQL after it was added to the repo. | Run `sql/migrations/20260217000100_email_verification_tokens.sql` (or `npm run db:migrate`) on the VPS. |
| **405 on signup in browser** | Request goes to www (static site), not api subdomain; frontend build or cache. | Rebuild frontend with `VITE_API_URL=https://api.givrwrldservers.com`, deploy `dist/`, hard refresh. |

The “complete site” is in GitHub as **source and migration definitions**. The VPS still needs **migrations executed**, **frontend built**, and **processes restarted** so that the running site matches the repo.
