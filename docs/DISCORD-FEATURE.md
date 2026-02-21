# Discord Feature: Market Analysis & Business Use

## 1. Market context

- **Discord** is the default comms platform for gaming and game-server communities. Hosts use it for support, announcements, and status so users stay in one place.
- **What competitors do:** Dedicated support channels, announcements for outages/features, optional Discord bots that post server status (online/offline, CPU/RAM) from the control panel (e.g. Pterodactyl). Some use webhooks for automated “server started / stopped” or incident alerts.
- **Best practices:** Separate channels for (1) support/tickets, (2) announcements, (3) status/incidents, (4) general chat. Clear rules and a welcome flow improve engagement.

---

## 2. How to use Discord in your business

| Use case | Why it helps |
|----------|----------------|
| **24/7 support** | Customers get help in a channel or via ticket bot; reduces email backlog and builds trust. |
| **Announcements** | New games, pricing, maintenance, and incidents in one place; @here or roles for critical updates. |
| **Status / incidents** | A dedicated channel (or bot) linking to your status page or posting “Investigating… / Resolved” keeps expectations clear. |
| **Community** | Server owners share configs and tips; builds retention and word-of-mouth. |
| **Optional: bot** | A small bot (e.g. Node or Python) can call your API or Pterodactyl and post “Server X is online/offline” or resource alerts—high perceived value for little effort. |

---

## 3. Recommended server structure

- **#welcome** – Rules, link to status page, link to support ticket form.
- **#announcements** – Outages, new features, maintenance (read-only for most).
- **#support** or **#open-a-ticket** – Where to ask for help or open a ticket.
- **#status** – Optional; bot or manual updates, or a permanent link to your `/status` page.
- **#general** – Community chat.
- **#server-showcase** – Optional; customers share their setups.

---

## 4. Frontend integration (this repo)

- **Discord page (`/discord`):** Explains what the server is for (support, announcements, status, community), has a single **Join Discord** CTA that opens the invite link when configured.
- **Invite link:** Set `VITE_DISCORD_INVITE_URL` (e.g. `https://discord.gg/your-invite`) in `.env`. The Discord page uses `ENV.DISCORD_INVITE_URL`; if empty, the button can be hidden or show “Coming soon.”
- **Status page:** The app’s `/status` page is the canonical place for service status; the Discord page can link to it so users know where to check for incidents.

---

## 5. Optional: Discord bot for server status

- Many hosts run a small bot that:
  - Reads from your API or Pterodactyl (e.g. node/server status).
  - Posts to a **#status** or **#alerts** channel (e.g. “Server X offline”, “All systems operational”).
- Implementation is outside this frontend; this doc is a reminder that Discord + status integration is a common next step after the community invite is live.
