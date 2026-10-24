---
title: "Solo Empire Insights — KPI and Instrumentation Plan"
status: draft
created: 2026-10-22
updated: 2026-10-22
description: "How the data-product consumer is judged: do the products answer with valid, fresh envelopes, and does the page stay error-free."
template: architecture-docs templates/sdlc/kpi-and-instrumentation-plan.md
---

# Solo Empire Insights — KPI and Instrumentation Plan

## Document control

| Field | Value |
|---|---|
| Product | bookchaowalit/market-insights-web (https://bookchaowalit.github.io/market-insights-web/, fixtures only) |
| Version / status | 0.1 / **draft** — definitions only; no baseline captured |
| Metric owner | Owner (bookchaowalit) |
| AI maker | Claude Code (b-tier-b session, 2026-10-22) |
| AI reviewer | not reviewed yet |
| Charter objectives | none written; OBJ-01 below is taken from the Tier B roadmap goal |
| Analytics / data source of truth | none live. Planned: the page's own load results (states per product). Sentry (`personal-yu0/market-insights-web`) is the only planned signal and is **not wired** (the Pages workflow injects the DSN only from the repository variable `SENTRY_DSN`, which is not set; see PRODUCT.md). Product analytics: D4 decided PostHog free tier, but no account or key exists yet, so nothing is sent. |
| Dashboard | none |
| Next review | 2026-11-15 (Big Loop M1) |

## KPI tree

```text
OBJ-01 One page shows, honestly, whether each Solo Empire data product answers with a valid, fresh envelope
  └─ KPI-O-01 Products ready: products in state ready / products in the catalog (local stack)
       ├─ KPI-L-01 Freshness: products whose retrieved_at is within 24 h / products ready or stale
       ├─ KPI-L-02 Contract failures: envelopes rejected by validation / envelopes received
       └─ KPI-G-01 Page errors: uncaught browser errors per 100 page loads (Sentry)
```

Visitor counts on the public demo are vanity numbers here and are not a KPI.

## KPI definitions

| KPI ID | Type | Formula | Unit | Min volume | Source / event | Baseline | Target | Alert | Cadence |
|---|---|---|---|---|---|---|---|---|---|
| KPI-O-01 | outcome | count(state = ready) / 7 | % | 7 products per check | `scripts/verify-browser-consumers.mjs` run against the local stack; planned event `dp_product_loaded` | not yet measured | 7/7 by 2026-12-31 | < 5/7 | weekly |
| KPI-L-01 | leading | count(now − retrieved_at ≤ 24 h) / count(ready or stale) | % | ≥ 5 products | envelope `retrieved_at`; planned event `dp_product_loaded.age_hours` | not yet measured | ≥ 80% | < 50% | weekly |
| KPI-L-02 | leading | rejected envelopes / envelopes received | % | ≥ 7 envelopes | client validation result; planned event `dp_envelope_invalid` | not yet measured | 0% | > 0 | per check |
| KPI-G-01 | guardrail | Sentry error events / page loads × 100 | per 100 loads | ≥ 100 loads | Sentry issues (`personal-yu0/market-insights-web`) | not measurable (DSN not wired) | ≤ 1 | any new issue | on alert |

## Event and data specification

| Event / field | Trigger | Properties | Personal data? | Emitted by | Status |
|---|---|---|---|---|---|
| `dp_product_loaded` | a product card or page reaches a final state | product_id, state, source (api/fixture), age_hours | no | frontend | planned (PostHog per D4; no account or key yet) |
| `dp_envelope_invalid` | the client rejects an envelope | product_id, reason class | no | frontend | planned |
| Sentry error event | uncaught error or unhandled rejection | message, stack (no locals), browser | no: request, user, breadcrumbs, extra removed in `beforeSend`; `sendDefaultPii: false` | `js/monitoring-browser.js` | implemented, **inactive** until a DSN meta tag is injected |

Privacy: the site has no accounts and stores nothing about visitors. No consent banner is needed while no analytics
tool runs. When the PostHog account exists (D4), events carry no visitor ID beyond the tool's own, and this section must be
revisited before it ships.

## Dashboards and alerts

| Dashboard / alert | KPIs | Location | Status |
|---|---|---|---|
| Sentry issue alerts | KPI-G-01 | Sentry project `market-insights-web` | planned: needs the repository variable `SENTRY_DSN` (injection is in the Pages workflow since D-MIW-1) |
| Weekly consumer check | KPI-O-01, KPI-L-01, KPI-L-02 | `node scripts/verify-browser-consumers.mjs` output | planned: script needs a summary line per KPI |

## Instrumentation verification (before G10)

| # | Check | Result |
|---|---|---|
| 1 | Events fire once per real action | not run: no analytics tool |
| 2 | Counts reconcile with the system of record | not run |
| 3 | No PII in payloads | Sentry scrubbing covered by `tests/sentry.test.ts` and `tests/monitoring-bundle.test.ts`; live payloads not sampled (inactive) |
| 4 | Dashboard renders each KPI | not run |
| 5 | Alerts reach the channel | not run |
| 6 | Baselines captured | waived — dated action: first local-stack run of the consumer check by 2026-11-15 |
| 7 | Consent | not applicable while no analytics runs |

## Change history of definitions

| Date | KPI ID | Change | Reason | Baseline restated? | Approved by |
|---|---|---|---|---|---|
| 2026-10-22 | all | first draft | b-tier-b L3 pass | n/a | pending owner |
