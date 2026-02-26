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
