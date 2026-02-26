# GIVRwrld — Business Overview for Marketing & VPS Prep

**Use this in chat** to discuss positioning, ads, and mental prep for launch. **Tuesday:** teammate/part owner joins to set up the VPS.

---

## What we are

**GIVRwrld** (GIVRwrld Servers) is **premium game server hosting**. We sell **one-click game servers** so players and communities can run their own Rust, Minecraft, Palworld, Ark, Terraria, Factorio, and more—without renting a VPS, installing a panel, or managing billing.

- **Promise:** Pick your game and plan → pay with PayPal → server is auto-created and ready in one dashboard. No DevOps, no surprise limits.
- **Region at launch:** US East only (clear and honest; expand later).
- **Revenue:** Subscriptions (monthly, 3‑month, 6‑month, yearly) via PayPal; plans by RAM/CPU (e.g. 4GB, 6GB, 8GB).

---

## Who it’s for

- **Creators & communities** who want their own server instead of sharing or dealing with sketchy hosts.
- **Small groups and clans** that want a stable, predictable place to play (Rust, Palworld, Minecraft, etc.).
- **People who’d rather pay a bit more** for “it just works” than fight with a generic VPS or unreliable cheap hosting.

**Not (for now):** Enterprise, multi-region, or 24/7 phone support. We compete on **simplicity, reliability, and one clear dashboard.**

---

## How we’re different (for marketing)

- **One flow:** Choose game → plan → term → PayPal → server. One control panel (Pterodactyl) for everything.
- **Transparent pricing:** No hidden fees; you see the price per term before you pay.
- **Discord + status:** Community and status in one place; no black box when something’s wrong.
- **Affiliate program:** 20% base / 25% performance tier (12‑month cap)—good for streamers and community leads.
- **Look and feel:** Fantasy/emerald theme, clean UI—stands out from generic hosting sites.

---

## Messaging you can use (hooks & CTAs)

**Hooks (attention):**
- Your players deserve a server that doesn’t quit when you do. GIVRwrld keeps your game online, 24/7.
- One click. One plan. Your own Rust, Minecraft, or Palworld server—ready in minutes.
- Stop sharing someone else’s server. Run your own. Premium game hosting, no DevOps required.

**Short ad angle:**
- Need a game server that just works? GIVRwrld spins up Rust, Minecraft, Palworld, and more in minutes. Pick your game, choose your plan, pay with PayPal. Your server, your rules. givrwrldservers.com
- Tired of lag and random resets? Dedicated game server, US East, one dashboard. Monthly or yearly—you’re in control. givrwrldservers.com

**CTA block:**
- Ready to host? → Choose your game and plan at givrwrldservers.com → Pay with PayPal. Server goes live in minutes. → One place to manage everything. 24/7. No surprises.

*(These are also generated into `marketing/YYYY-MM-DD.txt` by the GrowthAdsGenerator agent; use or edit as you like.)*

---

## Where to talk about us (channels)

- **Discord:** Invite + status/announcements; link to site and status page.
- **Social / ads:** Reddit (gaming/server subs), Twitter/X, TikTok, YouTube (short “how we host” or “why we built this”).
- **SEO:** Landing + game-specific pages (Rust server, Palworld server, etc.), FAQ, clear pricing.
- **Affiliates:** Streamers and community leaders with referral links; they get a cut, you get trust and reach.

---

## Current status (before Tuesday)

- **Product:** Checkout, PayPal, order lifecycle, provisioning flow, dashboard, and Panel link are built and hardened (idempotent webhooks, retry, agents).
- **Local:** Running with PM2 + agents; verification scripts and runbooks in place.
- **Not yet:** No public VPS; no live PayPal; no dedicated game node (that comes after VPS).

**Tuesday:** Teammate/part owner is here → **set up the VPS** (control plane: API, DB, frontend, Panel). Run the **agents on the VPS too** (same PM2 ecosystem: OpsWatchdog, ProvisioningAuditor, GrowthAdsGenerator) so monitoring and provisioning checks run 24/7. After that you can add the dedicated server (game node) and go live.

---

## One-line summary for chat

**GIVRwrld is premium one-click game server hosting (Rust, Minecraft, Palworld, etc.) with transparent pricing, PayPal, one dashboard, and Discord. We’re preparing marketing/ads and setting up the VPS on Tuesday with our teammate to get ready for launch.**

Use this doc in your next chat to align on messaging, channels, and VPS day.
