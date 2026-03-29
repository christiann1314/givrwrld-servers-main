# Set up the node in the live Panel (panel.givrwrldservers.com)

Wings is already running in Docker on the same server as the Panel. You need to create the **Node** in the Panel and then point Wings at it.

---

## Step 1: Create a location (if needed)

1. Go to **https://panel.givrwrldservers.com** → **Admin** (sidebar).
2. **Locations** → **Create New**.
3. **Short Code:** `us-east` (or e.g. `us-east`).
4. **Description:** e.g. `US East (Vinthill)`.
5. Save.

---

## Step 2: Create the node

1. **Admin** → **Nodes** → **Create New**.
2. Fill in:

   | Field | Value |
   |-------|--------|
   | **Name** | `Rise-3` (or any name) |
   | **Location** | The location you created (e.g. US East) |
   | **FQDN** | `wings` |
   | **Communicate over SSL** | No (Panel and Wings are on same Docker network over HTTP) |
   | **Daemon Listen Port** | `8080` |
   | **Memory** | `105000` (MB) – leave headroom on 128 GB |
   | **Disk** | `1000000` (MB) or less if you prefer |
   | **Daemon Base** | Default (e.g. `/var/lib/pterodactyl/volumes`) |

3. Save.

---

## Step 3: Get the node config and give it to Wings

After saving the node, the Panel shows the node’s **Configuration** (or **Deploy**).

**Option A – Configuration tab**

1. Open the node you just created.
2. Go to the **Configuration** tab.
3. Copy the **config.yml** content (or the parts that include `uuid`, `token_id`, `token`, and `remote`).

**Option B – Deploy script**

1. On the node page, use **Deploy** or the install command.
2. It may show a `curl` command that downloads the config. You’ll use the same credentials manually as below.

**Update Wings on the server:**

1. SSH in and edit the Wings config (bind-mounted into the container):

   ```bash
   sudo nano /opt/givrwrld/pterodactyl/wings-live-config.yml
   ```

2. Set these from the Panel’s node configuration:

   - **`uuid`** – Node UUID from the Panel.
   - **`token_id`** – Token ID from the Panel.
   - **`token`** – Token from the Panel.
   - **`remote`** – Use `http://panel` so Wings (in Docker) talks to the Panel container. If the Panel config shows a full URL, you can use that; for same Docker network, `http://panel` is enough.

3. Save and exit.

4. Restart Wings so it loads the new config and registers with the Panel:

   ```bash
   cd /opt/givrwrld/pterodactyl
   sudo docker compose restart wings
   ```

5. In the Panel, open **Admin** → **Nodes** and check the node. After a short time it should show as **online** (green).

### Wings + Docker: server fails with “bind source path does not exist”

That error is **not** egg IDs or MySQL. The **host** Docker daemon bind-mounts paths such as `/var/lib/pterodactyl/<server-uuid>`. If Wings uses a **named volume** for `/var/lib/pterodactyl`, those directories exist only inside the Wings container, not on the host, so **every** game server (Terraria, Among Us, etc.) can fail the same way. Use a **host bind** in `docker-compose.yml` (`/var/lib/pterodactyl:/var/lib/pterodactyl`), `mkdir` on the host with correct ownership (see `system.user.uid` / `gid` in `config.yml`), restart Wings, then **Start** or **Reinstall** the server in the Panel.

If the error mentions **`/run/wings/machine-id/...`**, add **`/run/wings:/run/wings`** to the Wings service volumes, then on the host run `sudo mkdir -p /run/wings/machine-id /run/wings/etc && sudo chown -R 988:988 /run/wings` (adjust UID/GID to match `system.user` in Wings `config.yml`) and restart Wings.

---

## Step 4: Allocations

1. In the Panel, open your node → **Allocations** tab.
2. **Create allocation(s)** – e.g. IP `0.0.0.0` or the server’s public IP, and a port or range (e.g. `25565-25570` or individual ports).
3. Note one **allocation ID** that is **not assigned** to any server (e.g. `6`).
4. In `api/.env` set:

   ```env
   PTERO_DEFAULT_ALLOCATION_ID=6
   ```

   (Use the ID you noted.)

5. Restart the API and provisioner:

   ```bash
   sudo pm2 restart givrwrld-api givrwrld-provisioner
   ```

---

## Summary

- **Panel:** Create Location → Create Node (FQDN `wings`, port `8080`, memory `105000`).
- **Wings:** Put the node’s `uuid`, `token_id`, `token`, and `remote` into `wings-live-config.yml` → restart Wings.
- **Allocations:** Create at least one, put its ID in `PTERO_DEFAULT_ALLOCATION_ID` in `api/.env` → restart API and provisioner.
