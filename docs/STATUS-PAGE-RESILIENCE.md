# Status page resilience (Phase 2)

So the “transparent host” message holds during main-site or API outages, status checks and incident updates should be resilient.

---

## URLs allowed for status checks

These endpoints are **the only URLs** status checks (internal or third-party) should use. No PII, no internal hostnames/topology, no verbose errors:

| URL | Purpose |
|-----|--------|
| `GET /health` | Uptime, version, memory; no secrets. |
| `GET /ready` | DB + env + optional panel connectivity; returns `status`, `checks`, `timestamp`; no stack traces. |
| `GET /api/health` | Lightweight for agents/monitoring: `ok`, `ts`, `version`, `db`, `panel`. No internal hostnames. |
| `GET /api/public/provisioning-stats` | Aggregate stats only: `median_provisioning_seconds`, `provision_success_rate_24h`, `provision_count_24h`. Rate-limited. |

**Do not** use any other API routes for status checks. Do not expose internal hostnames, connection strings, or stack traces in any status-checked response.

---

## Implementation options (infra / product)

- **Option A — Separate status host:** Host a minimal status page on a separate domain or subdomain (e.g. `status.givrwrld.com`) that **only** calls the URLs above. If the main site is down but the API is up, the status page can still report. For CORS, add the status host to `FRONTEND_URL` (comma-separated) in the API env so the status page origin is allowed.
- **Option B — Third-party status provider:** Use a provider (e.g. Statuspage.io, Better Uptime) that monitors the allowed URLs above. Configure monitors for `GET /health` and `GET /ready` (and optionally `GET /api/public/provisioning-stats`). Embed or link to the provider from the main Status page. Document which URLs the provider is allowed to hit (this list).

**Current state:** The main Status page is served from the same app as the rest of the site and calls the API at `ENV.API_BASE`. For full resilience, deploy Option A or B and point checks only at the allowed URLs.

---

## Incident process

- **Who updates status:** Ops lead or on-call. Response steps: see **docs/incident-playbook.md** (API/DB/panel, stuck orders, webhooks, etc.).
- **Where copy lives:** Main Status page copy lives in `src/pages/Status.tsx`. Incident log is static content there (or future admin-only table). For Option B, update copy in the provider’s UI.
- **Sync with incident log:** When an incident is resolved, add a short postmortem to the Incident log section on the Status page (what users saw, what we did, recurrence). Keep wording consistent with what was shown during the incident.

---

## Phase 2 checklist

| Item | Status |
|------|--------|
| URLs allowed for status checks documented (strict subset) | Done |
| Option A and Option B described; implementation is infra/deploy | Done |
| Incident process: owner, where copy lives, sync with log | Done |
| Deploy Option A (separate host) or Option B (third-party) | Infra when ready |
