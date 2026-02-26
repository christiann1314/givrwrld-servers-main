# Before VPS + Dedicated Node: What to Do Now & Can We Compete?

---

## What we can do now (before VPS / dedicated server)

### 1. **Run and harden locally**
- Keep **PM2 + agents** running 24/7 on your machine (API + agents, local DB).
- Use **PayPal Sandbox** end-to-end: signup → choose game/plan → checkout → webhook → (provision if you have Panel + Wings locally).
- Run **verification**: `npm run verify:phase1`, `npm run verify:webhook-idempotency` when API is up.
- Use **GrowthAdsGenerator** output in `marketing/YYYY-MM-DD.txt` for copy and ads.

### 2. **Content and marketing**
- **Landing and game pages**: Polish copy, SEO (titles, meta), clear CTAs.
- **Discord**: Invite link and status channel; link to `/status` from Discord page.
- **FAQ / Refund / Terms**: Align with real offering (US East, PayPal, one region at launch).
- **Affiliate**: Config and UI are ready; backend referral attribution (who referred whom) can be implemented so Dashboard shows real referrals.

### 3. **Technical and ops readiness**
- **api/.env.example**: List all required vars (MYSQL_*, PAYPAL_*, PANEL_*, JWT_SECRET, SMTP_*, LOG_TO_FILE, etc.) so VPS setup is one copy-and-fill.
- **DB backup**: Document or add a simple script (e.g. `mysqldump app_core`) and where to store backups; use it before VPS migration.
- **PayPal production**: When you go live, set **PAYPAL_WEBHOOK_ID** and use live credentials; webhook URL must be HTTPS.

### 4. **Optional checks**
- **orders.term**: Base schema has `ENUM('monthly','quarterly','yearly')`. If you offer 6-month (semiannual), ensure a migration adds `'semiannual'` to `orders.term` so inserts don’t fail.
- **Email**: Verification uses **SMTP** (api/services/email.js). SendGrid works as SMTP; set SMTP_HOST/SMTP_USER/SMTP_PASS (e.g. SendGrid SMTP relay) so verification emails send.

---

## Did we miss anything?

| Area | Status | Action if needed |
|------|--------|-------------------|
| **Order lifecycle** | Done: pending → paid → provisioning → provisioned / failed; idempotent webhook; retry-safe finalize | — |
| **Structured logging** | Done: pino, correlation ID, api/logs/api.log | — |
| **Health / ready** | Done: uptime, version, memory; DB + env checks | — |
| **Agents** | Done: OpsWatchdog, ProvisioningAuditor, GrowthAdsGenerator | — |
| **PM2 24/7 local** | Done: ecosystem.config.cjs, runbook | — |
| **Semiannual in DB** | Base schema had no `semiannual` in orders.term | Run `migrations/20260222000000_add_semiannual_to_orders_term.sql` so 6-month checkouts succeed |
| **api/.env.example** | Root .env.example exists; api may have its own | Add api/.env.example with all API vars |
| **Referral attribution** | Affiliate config and UI done; “who referred this user” not in backend | Add when you want real referral stats |
| **Backup script** | Documented in deploy-vps; no script in repo | Add scripts/backup-db.sh or similar |
| **Status page** | Frontend has /status; can be static or later dynamic | Optional: wire to health/ops for live status |

---

## Can we compete with competitors?

**Yes, for the segment you’re targeting.** Here’s how it lines up.

### Where we’re strong
- **One-click flow**: Choose game → plan → term → PayPal → server provisioned; same promise as bigger hosts.
- **Reliability**: Phase 1 hardening (idempotency, retry, agents, structured logs) gives a solid base for “it just works.”
- **Differentiation**: Fantasy/emerald theme, transparent pricing, Discord, status page, affiliate program—good for community and indie focus.
- **Tech**: Express + MariaDB + Pterodactyl + PayPal is a standard, proven stack; no lock-in to a single cloud.

### Where we’re intentionally limited (for now)
- **One region (US East)** at launch—clear and honest; expand later.
- **No 24/7 live chat**—Discord and status page set expectations.
- **No SLA doc yet**—add when you go to VPS/production if you want to promise uptime.

### How to position vs competitors
- **vs big brands**: “Same quality, simpler pricing and one dashboard; we focus on games and community.”
- **vs cheap hosts**: “Reliable provisioning, real support channel, and no surprise limits.”
- **vs DIY**: “No DevOps—pay, get a server, manage it in one panel.”

**Bottom line:** You can compete on clarity, reliability, and community. Ship VPS first, then the dedicated node; keep one region and one stack tight, then grow.
