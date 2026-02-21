# Cursor Prompt: MySQL Migration Complete Setup

Copy and paste this entire prompt into Cursor to generate all migration files:

---

You are an expert DevOps/Platform engineer. Create a production-ready MySQL-only setup for the GIVRwrld stack on Ubuntu, removing Supabase entirely. Produce the following files and commands without asking questions:

## Goals

1) Install and harden MySQL 8 on Ubuntu (single host), private-bind by default.

2) Create DBs: `app_core`, `panel`. Implement least-privilege users:
   - `app_rw` (CRUD on app_core)
   - `panel_rw` (CRUD on panel)
   - `provisioning_rw` (CREATE/DROP DATABASE, CREATE USER, GRANT OPTION on *.* ONLY)
   - `backup_ro` (RELOAD, PROCESS, LOCK TABLES, REPLICATION CLIENT, SELECT on *.*)

3) Generate SQL schema for `app_core` (users, roles, user_roles, plans, orders, tickets, ticket_messages, audit_log, server_stats_cache, secrets, config, ptero_nests, ptero_eggs, ptero_nodes, regions, region_node_map, stripe_customers, stripe_subscriptions, stripe_events_log, external_accounts, affiliates).

4) Provide a provisioning SQL snippet to create per-customer DB and user: `customer_<shortid>`, `cust_<shortid>`, grant ALL on that DB only.

5) Provide environment templates for:
   - API/Worker (`.env.api`, `.env.worker`) → connects to `app_core`, plus `PROV_DB_*`, Stripe, Pterodactyl keys.
   - Panel (`.env.panel`) → connects to `panel`.

6) Provide a systemd-timer'd backup job dumping `app_core`, `panel`, and all `customer_*` DBs daily, with 14-day retention.

7) Provide a one-shot Bash installer `scripts/setup-mysql.sh` that:
   - Installs MySQL 8
   - Applies `/etc/mysql/mysql.conf.d/z-givrwrld.cnf` tuning and private bind
   - Creates DBs/users/grants
   - Imports `sql/app_core.sql`
   - Enables the backup timer

8) Provide a safe teardown snippet for any existing Supabase Docker stack (compose down, remove supabase-named containers and volumes) WITHOUT touching unrelated containers.

9) Provide a script to sync Pterodactyl nests/eggs to MySQL (`scripts/sync-ptero-catalog.sh`).

10) Output a README that shows exact commands to:
   - Run the installer
   - Configure Pterodactyl Panel `.env` for MySQL `panel`
   - Run panel migrations
   - Test a sample provisioning (DB+user) and inject env vars into a new server in Pterodactyl

## Deliverables (create these files in the repo):

- `sql/app_core.sql` (DDL for the core SaaS tables, MySQL 8 compatible)
- `sql/grants.sql` (users and grants; placeholder passwords with clear TODO)
- `scripts/setup-mysql.sh` (idempotent; `set -euo pipefail`)
- `mysql/conf.d/z-givrwrld.cnf` (the tuning and bind-address)
- `scripts/supabase-teardown.sh` (safe docker compose down + cleanup)
- `scripts/backup.sh` (MySQL backup script)
- `systemd/mysql-backup.service`
- `systemd/mysql-backup.timer`
- `scripts/provision-customer-db.sql` (SQL template for per-customer DB creation)
- `scripts/sync-ptero-catalog.sh` (syncs nests/eggs from Pterodactyl API to MySQL)
- `.env.api.example`, `.env.worker.example`, `.env.panel.example`
- `MYSQL_MIGRATION_README.md` with exact step-by-step commands and verification tests

## Quality & Acceptance

- All scripts must be POSIX/Bash compatible, executable, and include `set -euo pipefail`.
- SQL must run cleanly on MySQL 8.0 with InnoDB default.
- No external dependencies beyond apt and standard MySQL tooling.
- Use strong security defaults and least privilege.
- Provide placeholders clearly labeled `REPLACE_ME_*` for secrets.
- Everything should be copy-paste runnable on a fresh Ubuntu VPS.
- Include AES encryption for secrets storage in MySQL.
- Include comprehensive error handling and logging.

Now generate all the files and their contents. Do not omit any of the files above.

---

**Note:** All files have been created above. This prompt is for reference if you want to regenerate them.



