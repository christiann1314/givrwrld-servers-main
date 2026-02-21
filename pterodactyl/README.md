# Pterodactyl Local Stack

## Quick Start

1. Create `.env` in this folder:

```
DB_PASSWORD=pterodactyl_secret_123
MYSQL_ROOT_PASSWORD=root_secret_456
```

2. Start services:

```powershell
docker compose up -d
```

3. Run migrations:

```powershell
docker compose exec panel php artisan migrate --force
```

4. Create admin user:

```powershell
docker compose exec -it panel php artisan p:user:make
```

5. Open http://localhost:8000 and finish configuration in the panel.

See [../docs/PTERODACTYL_LOCAL_SETUP.md](../docs/PTERODACTYL_LOCAL_SETUP.md) for full GIVRwrld integration steps.
