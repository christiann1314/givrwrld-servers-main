# GIVRwrld deploy workflow

Use this flow to keep the dedicated server in sync with your work:

1. **Local dev** – Build and test on your machine (frontend, API, MariaDB via Docker).
2. **Push to GitHub** – Commit and push to `main`:
   ```bash
   git add -A
   git status   # review
   git commit -m "your message"
   git push origin main
   ```
3. **Apply on the server** – On the dedicated server, pull and restart:
   ```bash
   cd /path/to/givrwrld-servers-main   # or your repo path
   git pull origin main
   npm install
   npm run build
   pm2 restart all   # or your process manager
   ```

Run DB migrations on the server when you’ve added new migration files (see `migrations/` and your DB runbooks).
