# Local MariaDB via Docker (GIVRwrld API)

## Prerequisites

- **Docker Desktop** installed and **running** (Windows/Mac).

## Start the database

From the repo root:

```bash
docker compose -f docker-compose.mysql.yml up -d
```

This starts MariaDB on **port 3306** and:

- Creates database `app_core`
- Creates user `app_rw` with password `devpass`
- Runs `sql/app_core.sql` and the semiannual term migration

## API `.env`

Ensure `api/.env` has (for local dev):

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=app_rw
MYSQL_PASSWORD=devpass
MYSQL_DATABASE=app_core
JWT_SECRET=local-dev-jwt-secret-change-in-production
```

A template was written to `api/.env` when the stack was configured.

## Seed game plans (so Deploy page shows all 12 games)

If the Deploy page says **"No active game plans found in local backend"**, seed the `plans` table:

```bash
# From repo root (requires API deps and api/.env)
node api/scripts/seed-12-games-plans.js
```

Or run the SQL directly (e.g. with MariaDB container running):

```bash
# PowerShell
Get-Content sql/scripts/seed-12-games-plans.sql | docker exec -i givrwrld-mariadb mysql -u app_rw -pdevpass app_core
```

Then refresh the Deploy page to see Minecraft, Rust, Palworld, ARK, Terraria, Factorio, Mindustry, Rimworld, Vintage Story, Teeworlds, Among Us, and Veloren.

## Restart the API

After the DB is up:

```bash
npm run dev:api
```

Health check: [http://localhost:3001/health](http://localhost:3001/health)  
Ready (DB): [http://localhost:3001/ready](http://localhost:3001/ready)

## Stop the database

```bash
docker compose -f docker-compose.mysql.yml down
```

Data is kept in the `givrwrld_mysql_data` volume. Use `down -v` to remove it.

## Port 3306 already in use

If you see `Bind for 0.0.0.0:3306 failed: port is already allocated`, either:

- Stop the other service using 3306 (e.g. a local MySQL/MariaDB), or
- In `docker-compose.mysql.yml`, change the host port, e.g. `"3307:3306"`, and set `MYSQL_PORT=3307` in `api/.env`.

## Access denied for 'app_rw'@'172.30.0.1'

If the API or agents fail with **Access denied for user 'app_rw'@'172.30.0.1'**:

1. **Confirm you're using this MariaDB container** – If something else is on port 3306, the app may be talking to a different MySQL that has no `app_rw`. Stop the other service or use a different host port for Docker (see above) and set `MYSQL_PORT` in `api/.env` to match.

2. **Ensure `api/.env` matches the container** – Copy from `api/env.example` and set:
   - `MYSQL_HOST=127.0.0.1` (or `host.docker.internal` if the API runs in Docker)
   - `MYSQL_PORT=3306` (or 3307 if you remapped)
   - `MYSQL_USER=app_rw`
   - `MYSQL_PASSWORD=devpass`
   - `MYSQL_DATABASE=app_core`

3. **If the container already existed before we added the grant script** – The init script `sql/init/00-grant-app-rw.sql` grants `app_rw` from any host (e.g. 172.30.0.1). It runs only on **first** volume init. To apply it on an existing volume, ensure the container is running, then run once from repo root:
   ```bash
   # Bash / Git Bash
   docker exec -i givrwrld-mariadb mysql -u root -prootpass < sql/init/00-grant-app-rw.sql
   ```
   ```powershell
   # PowerShell
   Get-Content sql/init/00-grant-app-rw.sql | docker exec -i givrwrld-mariadb mysql -u root -prootpass
   ```
   Then restart the API (or re-run the agent).
