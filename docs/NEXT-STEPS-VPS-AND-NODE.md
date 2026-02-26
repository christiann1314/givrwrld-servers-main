# Next Steps: VPS Then Dedicated Game Node

Recommended order:

---

## 1. Add the VPS (control plane) first

Deploy the **control stack** to a single VPS:

- **API** (Express) + **MariaDB** (`app_core`) + **frontend** (static build) + **Pterodactyl Panel**
- **Reverse proxy** (Nginx or Caddy) for TLS and routing
- **Agents** (run on the VPS): OpsWatchdog, ProvisioningAuditor, GrowthAdsGenerator — recommended so monitoring and provisioning checks run 24/7 alongside the API

**Why first:** The app is live; customers can sign up, choose plans, and pay with PayPal. Orders are stored and the dashboard works. Provisioning will fail or stay “stuck” until a game node exists, but you can run the business and support flows.

**Details:** See **docs/deploy-vps.md** (roles, PM2/systemd, TLS, firewall, backup).

**After this step you have:** One VPS serving the site and API; Panel installed and configured; no game servers yet (or a tiny test node on the same VPS if you want to smoke-test provisioning).

---

## 2. Add the dedicated server (game node) next

Add a **dedicated machine** that runs **Pterodactyl Wings**:

- Panel (on the VPS) registers this machine as a **node**
- You create **allocations** (ports) on that node
- API provisioning creates servers on this node via the Panel API

**Why second:** The control plane is already deployed and stable. You add capacity where it’s needed (game RAM/CPU/disk) without overloading the VPS. One node = one region (e.g. US-East at launch).

**Rough cost (from roadmap):** ~$100/mo for the game node; ~$20 for the control VPS; ~$10 misc → **~$130/mo** for one full environment.

**After this step you have:** Real game servers provisioning to the dedicated box; customers get working Rust/Minecraft/Palworld etc. after payment.

---

## Summary

| Step | What | Result |
|------|------|--------|
| **1. VPS** | Deploy API + DB + frontend + Panel + **agents** to one VPS | Live site, payments, orders; agents run 24/7; provisioning pending or test-only |
| **2. Dedicated server** | Install Wings, add as node in Panel, set allocations | Full flow: pay → provision → play on the dedicated node |

So: **yes — next steps are add the VPS, then add the dedicated server.**
