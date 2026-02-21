# GIVRwrld – Launch Operating Document

Weekly execution board: checklists, owners, KPI targets, and rollback plan. Use with [LAUNCH-STACK.md](./LAUNCH-STACK.md) for run instructions and architecture.

---

## Go-Live Checklist (Pass/Fail Gates)

### Security & Secrets
| # | Gate | Owner | Done |
|---|------|-------|------|
| 1 | All credentials rotated; no secrets in repo | | ☐ |
| 2 | Secrets in env vault / secret manager | | ☐ |
| 3 | JWT settings, refresh policy, login rate limits configured | | ☐ |
| 4 | CORS/origin policy for production domains only | | ☐ |

### Data & Billing
| # | Gate | Owner | Done |
|---|------|-------|------|
| 5 | SQL migrations versioned, repeatable, idempotent | | ☐ |
| 6 | Each plan-term maps to correct PayPal plan ID and amount | | ☐ |
| 7 | Reconciliation job: PayPal subscription status vs local orders | | ☐ |
| 8 | Backups scheduled; restore tested | | ☐ |

### Provisioning
| # | Gate | Owner | Done |
|---|------|-------|------|
| 9 | Every sold game/egg passes purchase → provision smoke test | | ☐ |
| 10 | Server “created” and “boots and reachable” verified per egg | | ☐ |
| 11 | Stuck-order detector + auto-retry (or manual runbook) in place | | ☐ |

### Observability & Ops
| # | Gate | Owner | Done |
|---|------|-------|------|
| 12 | Central logs, request IDs, error tracking | | ☐ |
| 13 | Uptime monitors and alerting with on-call response plan | | ☐ |
| 14 | Launch checklist doc (this file) reviewed and signed off | | ☐ |

### Legal & Commercial
| # | Gate | Owner | Done |
|---|------|-------|------|
| 15 | ToS, privacy policy, refund/SLA policy published | | ☐ |
| 16 | Day-one commercial SKU list decided and loaded in catalog | | ☐ |

---

## KPI Targets (Post–Soft Launch)

| KPI | Target | Cadence |
|-----|--------|---------|
| Uptime (API + Panel) | ≥ 99.5% | Weekly |
| Provisioning success rate | ≥ 99% | Per order |
| Checkout → provisioned (p95) | &lt; 5 min | Weekly |
| Stuck orders (paid, not provisioned) | Near zero; auto-retry or &lt; 24h manual | Daily |
| Payment success rate | ≥ 99% | Weekly |
| First-hour churn/refund rate | Track and &lt; 5% | Weekly |
| Support ticket causes | Logged and reviewed | Weekly |

---

## Rollback Plan

### Trigger
- Critical outage (API or Panel unreachable for &gt; 15 min).
- Payment or provisioning failure rate above threshold.
- Security incident or credential leak.

### Steps
1. **Communicate**: Notify team and, if needed, post status (e.g. “maintenance”).
2. **Pause new sales** (optional): Disable checkout or show “temporarily unavailable” if needed.
3. **Revert code** (if bad deploy): Last known-good release; redeploy.
4. **Revert config**: Restore env/secrets from backup; restart API.
5. **Data**: No destructive rollback of orders; fix forward (retry provisioning, reconcile payments).
6. **Post-incident**: Update runbook, fix root cause, re-run relevant checklist gates.

### Contacts
- On-call: _________________
- Escalation: _________________

---

## Weekly Execution (Suggested)

- **Monday**: Review KPIs, stuck orders, provisioning success rate; assign checklist owners.
- **Mid-week**: Run provisioning smoke test on 1–2 games; check PayPal vs orders reconciliation.
- **Pre-launch**: Full checklist pass; sign-off; rollback drill.

---

## Dates (Fill In)

| Milestone | Target Date |
|-----------|-------------|
| Checklist 100% complete | |
| Controlled beta start | |
| Soft launch | |
| Full launch | |

---

*Last updated: Feb 2025. Keep this doc next to LAUNCH-STACK.md for weekly runs.*
