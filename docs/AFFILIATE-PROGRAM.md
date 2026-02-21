# GIVRwrld Affiliate Program: Rates, Caps & Business Logic

## 1. Market analysis (game server / VPS hosting)

| Provider / type | First / one-time | Recurring | Cookie | Min payout |
|-----------------|------------------|-----------|--------|------------|
| GameServers.com | 100% first month | — | 30d | ~$25–50 |
| Supercraft      | 40% first month  | 10% lifetime | 30d | $25–50 |
| UltraServers    | 25% first month  | — (or 20% as credit) | 30d | $25–50 |
| NoBull Networks | —               | Up to 25% | 30d | $25–50 |
| GGServers       | 15% per signup  | — | 30d | $25–50 |

**Takeaways:** 15–25% recurring is common; 25% first month is standard; 10–25% recurring rewards retention. Min payout $25–50 and 30–90 day cookies are industry norm.

---

## 2. Our cost & margin context (from ROADMAP)

- **Fixed base cost:** ~$130/month per node (game node + control VPS + misc).
- **Revenue per customer:** Plan-dependent; assume **~$12–25/month** blended (monthly/quarterly/yearly mix).
- **Gross margin (before affiliate):** Infra + PayPal + support leave roughly **55–70%** margin on revenue (varies by plan and scale).
- **Affiliate as % of revenue:** Paying **25% of revenue** to affiliates leaves **30–45%** for us after other costs. That is workable if we cap **duration** so we don’t pay 25% forever on long-lived customers.

---

## 3. Recommended program design (profit-aligned)

### 3.1 Payout percentages

| Tier | Who | First payment (one-time) | Recurring (per payment) | Cap |
|------|-----|---------------------------|--------------------------|-----|
| **Standard** | All affiliates | — | **20%** of paid amount | First **12 months** per referred customer |
| **Performance** | ≥5 referrals in rolling 90 days | — | **25%** of paid amount | First **12 months** per referred customer |

- **No separate “first month only” bonus** in the table: the 20% or 25% applies to **every** payment (first and recurring) for the capped period. Simpler to explain and implement.
- **Cap = 12 months per referred customer.** After 12 months we stop paying commission on that customer’s payments. This keeps affiliate cost as a **bounded** share of LTV and aligns with “first 12 months” messaging already used in the UI.

### 3.2 Why 20% base / 25% performance

- **20% base:** Within market (15–25% recurring), and keeps post-affiliate margin healthy (e.g. 55% − 20% = 35% remaining).
- **25% performance:** Competitive for active promoters; still leaves ~30% for us on those sales.
- **12‑month cap:** Ensures we never pay commission on the “long tail” of a 3–5 year customer; most value is in year one.

### 3.3 Other parameters (aligned with market)

| Parameter | Value | Rationale |
|-----------|--------|-----------|
| **Cookie duration** | **90 days** | Strong attribution window; within common 30–90 day range. |
| **Minimum payout** | **$50** | Standard $25–50; $50 reduces admin and fraud risk. |
| **Payment schedule** | **Monthly** | Industry standard; pay in arrears (e.g. pay February earnings in March). |
| **Max commission per order** | **No extra cap** | The 20–25% of paid amount is the cap; 12‑month duration is the main cost control. |

---

## 4. Math example (sanity check)

- Referred customer pays **$20/month** for 12 months.
- Affiliate rate **20%**, cap **12 months**.
- **Total revenue:** $240. **Total affiliate:** $48 (20% × $240). **Our share:** $192 (80%).
- If the same customer stays 36 months and we **did not** cap: we’d pay 20% × $720 = $144. With **12‑month cap:** we still pay $48; we keep the extra $96 on months 13–36.

---

## 5. Implementation checklist (product/backend)

- [ ] **Referral attribution:** Store `referrer_affiliate_code` (or `referrer_user_id`) on signup when user arrives via `?ref=CODE`; store `referrer_user_id` (or code) on **orders** when the purchaser was referred.
- [ ] **Commission calculation:** On each successful payment (e.g. PayPal webhook), if order has referrer: compute `commission = paid_amount * rate` (20% or 25% from tier); only if order is within **first 12 months** of that referred customer’s first paid order (or first payment date).
- [ ] **Affiliate stats API:** Endpoint(s) for current user’s affiliate stats: referral count, commissions earned (pending + paid), next payout date, list of referred orders (or referrals). Use `affiliates` table and new referral/commission tables as needed.
- [ ] **Payout runs:** Monthly job that: (1) sums approved commissions above $50, (2) marks them paid, (3) triggers PayPal payouts or records “pending payout” for manual processing.

---

## 6. Frontend (current)

- **Single source of truth:** `src/config/affiliate.ts` holds display values and logic constants (rates, 12‑month cap, min payout, cookie days, payment schedule). Public Affiliate page and Dashboard Affiliate read from this so copy stays consistent and one place controls “what we offer.”
- **Dashboard:** Until backend has referral attribution and affiliate stats API, dashboard shows **referral link and program terms**; earnings/referral counts can show **$0 / 0** and “Earnings from referred customers will appear here once you start referring” (or similar) so we don’t imply earnings from the user’s own orders.

---

## 7. Summary table (for config)

| Config key | Value | Notes |
|------------|--------|--------|
| `commissionRateDefault` | 0.20 | 20% standard |
| `commissionRatePerformance` | 0.25 | 25% for performance tier |
| `commissionMonthsCap` | 12 | Only first 12 months per referred customer |
| `minPayoutUsd` | 50 | Minimum payout threshold |
| `cookieDurationDays` | 90 | Attribution window |
| `paymentSchedule` | `'monthly'` | Pay in arrears monthly |
