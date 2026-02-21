# Supabase (legacy / reference)

The **current stack** uses **Express + MySQL + PayPal**, not Supabase.

- **Edge Functions** have been removed; provisioning, auth, and stats use the `api/` server.
- **migrations/** and **config.toml** remain for reference only. The app database is MySQL (`app_core`); see `api/` and `LAUNCH-STACK.md`.
