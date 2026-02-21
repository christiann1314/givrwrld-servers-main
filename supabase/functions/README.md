# Supabase Edge Functions (legacy)

These Edge Functions are **not used** when running the current stack:

- **Frontend** (Vite, port 8080) + **Express API** (port 3001) + **PayPal** + **MariaDB** + **Pterodactyl**

Server stats and panel-sync are served by the Express API (`GET /api/servers/stats`, `POST /api/auth/panel-sync-user`). Checkout and webhooks use PayPal and the Express routes under `api/routes/`.

These functions remain in the repo for reference or if you switch back to a Supabase/Stripe-based deployment. Do not deploy them or put real Supabase/Stripe keys in repo files.
