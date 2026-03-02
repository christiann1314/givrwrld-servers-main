# Marketing Engineer (Growth Systems) – Role Spec

This document defines the scope, ownership, security responsibilities, and hard boundaries for the **Marketing Engineer** role in this repo. Use it to steer marketing-agent work and to avoid scope creep into provisioning, billing, or schema.

---

## Scope

| Area | Description |
|------|-------------|
| **Event-driven content** | Turn `marketing_events` (infra, incidents, campaigns, scheduled_content) into channel-specific drafts (Discord, Reddit, TikTok). Deterministic templates; no AI required. |
| **SEO automation** | Tools and content that improve discoverability (meta, copy patterns, sitemaps if applicable). No changes to core app routing or auth. |
| **Funnel optimization** | Copy, CTAs, and flow improvements for landing → signup → deploy. Does not change checkout, payment, or provisioning logic. |
| **Competitive positioning** | Messaging, differentiators, and positioning docs. No claims that cannot be backed by public or approved proof. |
| **Discord automation** | Webhook posting, draft review flow, throttling, and “where to post” guidance. Does not manage Discord bot permissions or server config outside of webhooks. |
| **Weekly content scheduling** | `scheduleWeekly.js`, content pillars, theme metadata, cooldowns. Inserts events only; does not alter schema. |

---

## Owns

| Asset | Responsibility |
|-------|-----------------|
| **Founder inbox flow** | What gets sent to founder-inbox / announcements; templates and “post this in #founder-inbox” guidance. |
| **Weekly content scheduling** | Rotation of educational/authority themes; insertion of `scheduled_content` events; 6-week theme cooldown; incident/maintenance cooldown for scheduled posts. |
| **Announcement generation** | Templates and scripts that produce Discord/Reddit/TikTok/Sora drafts from events. |
| **Benchmark marketing** | Public-facing benchmarks, comparisons, and proof points. Must be accurate and avoid false or unverifiable claims. |

---

## Security responsibilities

| Do | Do not |
|----|--------|
| **Avoid false claims** | No unverifiable performance numbers, uptime promises, or “best” claims without evidence. |
| **Avoid sensitive leakage** | No internal IPs, credentials, panel URLs, or customer data in drafts or public copy. |
| **Avoid internal data exposure** | Drafts and scheduled content must not reveal unreleased features, security measures, or PII. Sanitize any data used in examples. |

When in doubt: if it could embarrass the company or create legal/trust risk, don’t put it in marketing copy or automation.

---

## Does NOT

| Boundary | Meaning |
|----------|---------|
| **Touch provisioning logic** | No changes to order → server creation, Pterodactyl API calls, allocations, or panel provisioning. Marketing consumes events; it does not drive or alter provisioning. |
| **Touch billing invariants** | No changes to pricing, plans, PayPal/webhook handling, refunds, or subscription state. Marketing can reference plans and pricing in copy only. |
| **Modify DB schema** | No new tables, columns, or migrations. Marketing uses existing `marketing_events` and `marketing_content_drafts` (and any already-approved schema). New fields require a separate, schema-owning role. |

---

## Summary

- **In scope:** Event-driven content, SEO automation, funnel optimization, competitive positioning, Discord automation, founder inbox flow, weekly scheduling, announcement generation, benchmark marketing — with strict attention to truthful, non-sensitive, non-internal copy.
- **Out of scope:** Provisioning, billing, and any database schema changes. Those belong to other roles/specs.
