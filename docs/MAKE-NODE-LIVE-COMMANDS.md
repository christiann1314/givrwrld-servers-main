# Make Pterodactyl Node Live – Commands to Run on the Server

Run these on **ns1015681** (or wherever Wings and Panel run). Adjust paths if your deploy is different (e.g. `/opt/givrwrld/pterodactyl`).

See also: [EGGS_AND_VARIANTS.md](./EGGS_AND_VARIANTS.md) — full egg import pipeline (`npm run catalog:variants:all`) and what “Vanilla” means per game.

---

## 1. Expose daemon port 8080 on the host

The Panel talks to the node on **port 8080**. Your compose maps **8082:8080**; we need **8080:8080** so the Panel can use `node.givrwrldservers.com:8080`.

```bash
cd /opt/givrwrld/pterodactyl
sudo sed -i 's/"8082:8080"/"8080:8080"/' docker-compose.yml
```

Or edit by hand: change `"8082:8080"` to `"8080:8080"` under the `wings` service `ports`.

---

## 2. Open firewall (80, 443, 8080, 2022)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 2022/tcp
sudo ufw status
```

If UFW is inactive, enable it (SSH first so you don’t lock yourself out):

```bash
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## 3. Ensure Wings config points at the Panel over HTTPS

Wings must use the live Panel URL. Edit the config that’s mounted into the Wings container (e.g. `wings-live-config.yml` or the file shown in Panel → Node → Configuration):

- Set **remote** to: `https://panel.givrwrldservers.com` (no trailing slash).

If you use the config from Panel (Configuration tab), it should already have the correct `remote` and node token. If your file still has `http://panel` or `http://panel.givrwrldservers.com`, change it to `https://panel.givrwrldservers.com`.

---

## 4. Restart Wings (and apply port change)

```bash
cd /opt/givrwrld/pterodactyl
sudo docker compose down wings
sudo docker compose up -d wings
```

Or if you use the older `docker-compose` command:

```bash
sudo docker-compose down wings
sudo docker-compose up -d wings
```

---

## 5. Confirm 8080 and 2022 are listening

```bash
sudo ss -tlnp | grep -E ':8080|:2022'
```

You should see something like:

- `0.0.0.0:8080` → docker-proxy (Wings API)
- `0.0.0.0:2022` → docker-proxy (Wings SFTP)

---

## 6. Quick connectivity check (from this server)

```bash
curl -k -sI https://127.0.0.1:8080
```

You should get an HTTP response (e.g. 401 or 404), not “connection refused”. Then from your own machine (or the Panel server), test:

```bash
curl -k -sI https://node.givrwrldservers.com:8080
```

---

## Panel side (in the browser)

- **Admin → Nodes → [node] → Settings**
- **Daemon port:** `8080` (matches host port after step 1).
- **FQDN:** `node.givrwrldservers.com`
- **Use SSL connection** and **Not behind proxy** (as you have).
- Save.

---

## If the Panel runs on a different host

Then that host must be able to reach `node.givrwrldservers.com` on **8080** and **2022**. DNS already points `node` to this server; the firewall rules above allow that. No extra sudo commands on the node; just ensure the Panel server can resolve `node.givrwrldservers.com` and that nothing blocks outbound 8080/2022 from the Panel to this IP.
