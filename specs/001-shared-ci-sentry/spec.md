---
title: "SPEC-001 — Shared CI v1.1.1, browser error reporting and product docs"
status: implemented
tags: [spec, sdd, tdd, ci, sentry, docs]
created: 2026-10-22
updated: 2026-10-22
description: "Pin the shared CI to v1.1.1 with tests required, add DSN-gated, scrubbed @sentry/browser error reporting to the static pages, and write PRODUCT.md and the KPI plan."
---

# SPEC-001 — Shared CI v1.1.1, browser error reporting and product docs

Standard: ADR-0004 (TDD + SDD). Plan: Big Loop, b-tier-b wave (Tier B to L3).

## Document control

| Field | Value |
|---|---|
| Spec ID / version | SPEC-001 / 1.0 |
| Status | implemented |
| Repository | bookchaowalit/market-insights-web |
| Owner (maker) | Claude Code (b-tier-b session) |
| Approver | Owner (bookchaowalit) |

## 1. Problem and intent

- **Problem:** the scorecard put the repo at L1: no `PRODUCT.md`, no error reporting, no KPI plan, no spec, no
  deploy workflow. CI used the shared workflows at v1.0.1 and did not require tests.
- **Outcome:** CI on v1.1.1 fails when tests disappear; the pages carry error reporting that is off unless the host
  injects a DSN, reports errors only and drops personal data; the product and its live state are described truthfully.

## 2. Behaviour — acceptance criteria

| AC | Given / When / Then | Test |
|---|---|---|
| AC-01 | Given a page without `<meta name="sentry-dsn">`, the monitoring script does not initialise Sentry and sends nothing | `tests/sentry.test.ts` (dsnFromDocument, initMonitoring), `tests/monitoring-bundle.test.ts` ("is off and sends nothing") |
| AC-02 | Given an empty, non-https or malformed DSN, Sentry stays off | `tests/sentry.test.ts` ("ignores an empty or non-https value") |
| AC-03 | With a DSN: errors only — `sendDefaultPii: false`, no tracing or trace headers, no sessions, no breadcrumbs; `beforeSend` removes request, user, breadcrumbs, extra and frame locals | `tests/sentry.test.ts` (sentryOptions, scrubEvent), `tests/monitoring-bundle.test.ts` (no session/transaction items, no page URL query in payloads) |
| AC-04 | Every page loads `js/monitoring-browser.js` before the data bundle, and no page commits a DSN | `tests/monitoring-bundle.test.ts` ("pages") + `tests/static-site.test.ts` (asset exists) |
| AC-05 | The committed bundles match `src/` | `npm run check:browser` (now checks both bundles) in CI |
| AC-06 | CI fails if the `test` script is removed | `require-tests: true` on `ci-node.yml` v1.1.1 |
| AC-07 | Existing behaviour unchanged (states, fallback, escaping, GET-only) | existing contract, bundle and DOM tests |
| AC-08 | Events keep only os/runtime/browser/device/app contexts; `tags.url` is dropped; `?query`/`#hash` is cut from the transaction and every string tag (security-review rule, same as `sentry-ref/sentry.ts`) | `tests/sentry.test.ts` ("keeps only platform contexts …") |
| AC-10 | `?query`/`#hash` is cut from URLs inside `exception.values[].value`, frame `filename`/`abs_path` and `debug_meta.images[].code_file` (browser frames carry the page URL) | `tests/sentry.test.ts` ("strips query strings and hashes from URLs …") |
| AC-09 | The scrollable records table is a focusable, named region (axe `scrollable-region-focusable`); links and badges meet contrast/size hints | `tests/dom.test.ts` ("makes the scrollable records table reachable …") + UI review |

Red-first evidence: `tests/sentry.test.ts` was written before `src/monitoring/sentry.ts` and failed with
`ERR_MODULE_NOT_FOUND … src/monitoring/sentry.ts`; `tests/monitoring-bundle.test.ts` was written before
`js/monitoring-browser.js` existed and before the pages had the script tag, and failed with `ENOENT … js/monitoring-browser.js`.
The context/query-string test (AC-08), the table-region test (AC-09) and the URL-in-exception test (AC-10) were each added first and failed
(1 failing test each) before the code change. A mutation check (beforeSend replaced by identity) made the bundle
test fail, so it does check the scrubbing end to end. All 85 tests pass after the change.

## 3. Interfaces and data

| Area | Change |
|---|---|
| `src/monitoring/sentry.ts` | `scrubEvent`, `sentryOptions`, `dsnFromDocument`, `initMonitoring` (same scrub rules as finance-booktrading `frontend/src/lib/sentry.ts`, plus dropping the BrowserSession and Breadcrumbs integrations) |
| `src/monitoring/browser.ts` → `js/monitoring-browser.js` | IIFE, minified, built by `npm run build:browser`; sets `window.InsightsMonitoring = { enabled }` |
| `*.html` (10 pages) | one `<script src="js/monitoring-browser.js">` before the data bundle; no visible change |
| `package.json` | `@sentry/browser` dependency |
| `.github/workflows/ci.yml` | shared workflows pinned to `87dc5e1` (v1.1.1), `require-tests: true` |
| Docs | `PRODUCT.md`, `docs/measurement/KPI-PLAN.md`, this spec |

The DSN is never committed. A Sentry project `market-insights-web` exists in org `personal-yu0`, but nothing injects
its DSN today (the Pages build has no build step), so Sentry is inactive in production.

## 4. UI review sign-off

- Tool: qa-testing `ui_review.mjs` (Chromium, axe-core), all 10 pages with `?fixtures=1`, widths
  320/375/768/1024/1440, served by `python3 -m http.server` from the repo root.
- First run (`~/work/b-tier-b/shots/market-insights-web-sentry/`, after the Sentry commit): 0 blocker, 90 major,
  1 minor. All majors were pre-existing: link contrast on the policy line (`a[href="?fixtures=1"]`), badge text under
  12px, and the scrollable `.table-wrap` not keyboard reachable. The Sentry script changed nothing visible.
- Fixed in `d8bfc45`; second run (`~/work/b-tier-b/shots/market-insights-web-a11y/`): **0 blocker, 0 major, 1 minor**.
  The minor is the 9th dashboard card alone on the last row at 768px (9 products in 2 columns): accepted.
- Looked at: index 320/375 (all slices)/768/1440, crypto 375, news 320, seo 768, flights 1024, discovery 1440.
  No overflow of the page; wide record tables scroll inside their wrapper; Thai fixture text wraps cleanly; badge,
  banner and footer readable. The empty square before card titles is an emoji the headless browser has no font for,
  not a page bug (the live page shows the same in this environment).
- Verdict: pass (reviewer: Claude Code, 2026-10-23).

## 5. Out of scope

- A deploy workflow. The site is already published by GitHub Pages' legacy build from `main` (root). Moving to an
  Actions Pages workflow (gated on CI, site files only, fixtures-only public build, DSN injected from a repository
  variable) needs the Pages source setting changed: owner decision D-MIW-1. `deploy_workflow` stays a gap.
- Fixing the README `NEXT_PUBLIC_*` paragraph, the product pages' nav missing "Discovery", and the public page
  probing `127.0.0.1` ports (follow-ups).
- `archive/legacy-static/` (old scraper snapshots, e.g. a jobs page) is published by the legacy Pages build;
  excluding it belongs to D-MIW-1.

## 6. Deploy state and UI review

- Pushing to `main` republishes https://bookchaowalit.github.io/market-insights-web/ through the legacy Pages build
  (existing repository setting, not a workflow). User-facing changes: one extra script that does nothing without a
  DSN, a focusable table wrapper, lighter link colour and 12px badges.
- `deploy_workflow` stays a scorecard gap: owner decision D-MIW-1 (see PRODUCT.md).
