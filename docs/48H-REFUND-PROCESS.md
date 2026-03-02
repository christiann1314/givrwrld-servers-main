# 48-hour satisfaction guarantee — internal process

This doc defines how we deliver the public promise: *"Not happy in the first 48 hours? Contact support for a full refund."*

---

## Definition of “activation”

**Activation** = the start of the 48-hour window. Use **one** of the following (choose and document in support runbooks):

- **Option A:** First successful login to the game server control panel (Pterodactyl) for that order, or  
- **Option B:** First time the server for that order reaches status **provisioned** (server is live and startable).

If the customer never logs in or the server never provisions, the 48-hour clock does **not** start; they can still request a refund as an unsatisfied customer (handle case-by-case).

---

## Who handles 48-hour refund requests

- **Owner:** Ops lead or support lead (same as status/incident owner; see **docs/STATUS-PAGE-RESILIENCE.md**).
- Support tickets or Discord DMs that mention “refund” or “48 hour” should be triaged to this owner. No automated approval; every request is reviewed.

---

## How we process a refund (no automated billing logic)

1. **Verify eligibility:** Request within 48 hours of activation (see above). Confirm identity (same email/account as the order).
2. **Cancel the subscription in PayPal:** Cancel the PayPal subscription so no further charges occur. Do this in the PayPal merchant dashboard (or via API if you have a dedicated tool). Document the subscription ID and order ID.
3. **Refund the payment (manual):** Issue a refund for the initial payment in PayPal (refund the transaction). We do **not** use automated refunds, credits, or billing code paths; this is a manual step.
4. **Mark the order (optional):** If you track refunds in your system, mark the order or add a note (e.g. “Refunded per 48h guarantee”). Do **not** change billing or provisioning logic; this is for records only.
5. **Reply to the customer:** Confirm that the subscription is cancelled and the refund has been issued, and how long they should expect to see the refund (per PayPal’s policy).

---

## What we do not do

- No automated refunds (no cron or webhook that pays refunds).
- No code changes to billing or provisioning for the 48h guarantee; it is delivered via manual process only.
- Do not promise “instant” refund; PayPal and banks take time. Set expectation (e.g. 5–10 business days).

---

## Public copy (keep consistent)

Use the same sentence on Checkout and FAQ:  
**"Not happy in the first 48 hours? Contact support for a full refund."**

Ensure Support Center and Terms reference the same guarantee and point to this process for internal use.
