# Pterodactyl Local Setup for GIVRwrld

Run Pterodactyl Panel and Wings on your local machine for development and testing.

## Prerequisites

- **Docker Desktop for Windows** – [Download](https://www.docker.com/products/docker-desktop/)
- Ensure Docker is running (WSL2 or Hyper-V backend)

## 1. Start Pterodactyl Stack

```powershell
cd c:\Users\chris\Downloads\givrwrld-severs-main\pterodactyl
```

Create `.env` from the example:

```powershell
copy .env.example .env
```

Edit `.env` and set secure passwords. Then:

```powershell
docker compose up -d
```

Services:
- **Panel**: http://localhost:8000
- **Wings API**: localhost:8082 (internal)
- **SFTP**: localhost:2022

## 2. Initialize Panel Database

Wait ~30 seconds for MariaDB to be ready, then run:

```powershell
docker compose exec panel php artisan migrate --force
```

## 3. Create Admin User

```powershell
docker compose exec -it panel php artisan p:user:make
```

Enter:
- Email: `admin@localhost` (or your choice)
- Username: `admin`
- First Name: `Admin`
- Last Name: `User`
- Password: (choose a password)

## 4. Configure Pterodactyl in the Panel

### 4.1 Create Location

1. Open http://localhost:8000 and log in as admin.
2. **Admin Area** → **Locations** → **Create Location**
3. Short Code: `local`
4. Description: `Local Development`
5. Save

### 4.2 Create Node

1. **Admin Area** → **Nodes** → **Create Node`
2. Name: `Local-Node`
3. Location: Select `local`
4. FQDN: `wings` (Docker service name; panel and wings are on same network)
5. Communication Port: `8080` (Wings listens on 8080 inside the container)
6. Memory: `4096` (4GB)
7. Disk: `10240` (10GB)
8. Save

### 4.3 Configure Wings

1. On the node page, click **Configuration**
2. Copy the configuration command or download the config.
3. The Wings container needs this config. Easiest: run the wings configuration command that Pterodactyl shows. For Docker, we need to inject the config.

**Alternative – Manual Wings config**:

Create `config.yml` in Wings’ config volume. The panel shows the structure. Or use:

```powershell
docker compose exec wings cat /etc/pterodactyl/config.yml
```

If empty, Wings needs to be configured. The panel provides a **Docker** setup script. Run the equivalent to place the config in `/etc/pterodactyl/config.yml` inside the Wings container.

**Simpler approach** – Use the official Wings configuration from the Panel:
1. In Node → Configuration, copy the `curl` command or configuration.
2. Create a file `wings-config.yml` with the content the panel shows.
3. Restart wings: `docker compose restart wings`

### 4.4 Create Allocations

1. **Admin Area** → **Nodes** → Your node → **Allocations**
2. Add allocations: IP `0.0.0.0`, ports e.g. `25565-25570` (Minecraft), `27015` (Rust), etc.
3. Assign as many as you need for testing.

### 4.5 Create Nest & Egg (if not present)

Pterodactyl ships with Minecraft and other nests. Ensure the **Minecraft** nest and **Java** egg exist.
- If you need custom eggs, import them via **Admin** → **Nests** → **Import Egg**.

## 5. Get Application API Key (for GIVRwrld)

1. **Admin Area** → **Application API**
2. **Create Credentials**
3. Description: `GIVRwrld API`
4. Copy the **Secret** (starts with `ptlc_`). This is your `PANEL_APP_KEY`.

## 6. Seed app_core (GIVRwrld Database)

After creating the node in Pterodactyl:
1. Note the **Node ID** (Admin → Nodes → ID in URL, usually `1`)
2. Edit `sql/seed-ptero-local.sql` and replace `1` in the ptero_nodes INSERT with your Node ID if different.
3. Run:

```powershell
cd c:\Users\chris\Downloads\givrwrld-severs-main
mysql -u app_rw -p app_core < sql/seed-ptero-local.sql
```

4. Ensure plans have `ptero_egg_id` set (e.g. `1` for Minecraft):

```sql
UPDATE plans SET ptero_egg_id = 1 WHERE game = 'minecraft';
```

## 7. Add Panel Secrets to GIVRwrld API

In `api/.env`:

```env
# Pterodactyl Panel (for server provisioning)
PANEL_URL=http://host.docker.internal:8000
PANEL_APP_KEY=ptlc_your_secret_here

# If API runs on host (not Docker), use:
# PANEL_URL=http://localhost:8000
```

For the API to reach the panel from your host machine, use `http://localhost:8000`.  
If the API runs in Docker, use `http://host.docker.internal:8000` (Windows/Mac).

## 8. Encrypt Secrets (if using MySQL secrets table)

If GIVRwrld stores secrets in MySQL instead of env, encrypt and insert:

```sql
-- In MySQL (app_core)
INSERT INTO secrets (scope, key_name, value_enc) VALUES
  ('panel', 'PANEL_URL', AES_ENCRYPT('http://localhost:8000', 'your_aes_key')),
  ('panel', 'PANEL_APP_KEY', AES_ENCRYPT('ptlc_your_secret', 'your_aes_key'));
```

Ensure `AES_KEY` in `api/.env` matches the key used above.

## Port Summary

| Service        | Port | URL                    |
|----------------|------|------------------------|
| GIVRwrld Frontend | 8080 | http://localhost:8080 |
| GIVRwrld API   | 3001 | http://localhost:3001 |
| Pterodactyl Panel | 8000 | http://localhost:8000 |
| Pterodactyl Wings | 8082 | (internal to Docker)   |
| SFTP           | 2022 | sftp://localhost:2022  |

## Troubleshooting

- **Panel 500 error**: Run `docker compose exec panel php artisan migrate --force`
- **Wings can't connect**: Ensure FQDN is `wings` and port `8080` (container internal).
- **No allocations**: Add allocations on the node in the panel.
- **Plans missing ptero_egg_id**: Update `plans` in app_core to set `ptero_egg_id` to the Pterodactyl egg ID (e.g. 1 for Java egg).
