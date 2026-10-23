# Solo Empire Insights (market-insights-web) — Product

*Tier B showcase. Last checked against the code on 2026-10-22.*

## What it is

A static multi-page website (plain HTML, CSS and one generated JavaScript bundle) that reads the Solo Empire
**data-product APIs** and shows their status and records: crypto, stocks, FX, DeFi, flights, SEO page provenance,
AI tools, news signals and technology discovery. Each product is a separate read-only API on a local port
(8101–8108, 8110). When an API cannot be reached, the page falls back to sanitized fixture envelopes in
`fixtures/data-products/` and says so on screen ("offline fixture", "Local API unavailable").

The typed client in `src/data-products/` owns the product catalog, envelope validation, state mapping and request
deadlines; the static pages use the same code through `js/data-products-browser.js` (built with esbuild).

## Who it is for

The owner. It is the read-side check that the data products answer with the frozen contracts, and a portfolio demo
of a contract-first consumer. It has no external users, no accounts and no revenue angle.

## What works today

- Dashboard (`index.html`) with one status card per product and a banner that is ok/warn/bad by how many products
  loaded; one page per product with a records table.
- UI states: loading, ready, stale, empty, timeout, unavailable, error. Failure and pending envelopes never show
  their records.
- Read-only: `GET /v1/records` and health reads only; no refresh, no writes, no paid providers, no scraping.
- Offline demo with `?fixtures=1`.
- Tests (node:test, 7 files): contract freeze, typed client contract, browser bundle in a sandbox, DOM states in
  happy-dom, static asset references, Sentry options/scrubbing and the monitoring bundle.
- CI: shared `ci-node.yml` + `security.yml` v1.1.1 (Biome, typecheck, tests required, bundle freshness check).
- Error reporting: `@sentry/browser`, errors only, personal data scrubbed (see below). **Not wired to a DSN**.

## What does not work / is not claimed

- No hosted data. The public page cannot reach anyone's local APIs, so a visitor always sees the fixtures
  (dated 2026-08 / 2026-09, marked stale). Flights and AI tools may also be empty on a real local stack (source
  permission pending).
- SEO shows owned-page provenance (reachability, title, HTTP status), not search rankings.
- No analytics. No production users. No SLA.
- The README's "hosted frontend" paragraph names `NEXT_PUBLIC_*` variables; this is not a Next.js app — the static
  pages read `window.DATA_PRODUCT_URLS` instead.

## Live URL and deploy state

- **Live:** https://bookchaowalit.github.io/market-insights-web/ — GitHub Pages, *legacy* build from `main` at the
  repository root (checked 2026-10-22: HTTP 200, last-modified 2026-10-17). Every push to `main` republishes the
  site; there is no deploy workflow, so a push is published even if CI fails.
- What a visitor sees: the dashboard on fixtures, after the browser's attempts to reach `127.0.0.1:81xx` fail.
- Owner decision (D-MIW-1): replace the legacy Pages build with a GitHub Actions Pages workflow that runs only
  after CI passes, publishes only the site files (pages, `css/`, `js/`, `fixtures/`; not `archive/`, `DOCPACK/`,
  `docs/`), and makes the public build fixtures-only so it does not probe the visitor's local ports. This needs the
  repository's Pages source switched to "GitHub Actions", so it is not done here.

## Error reporting (Sentry)

- `js/monitoring-browser.js` (from `src/monitoring/`) loads on every page before the data bundle. It initialises
  Sentry **only** if the page carries `<meta name="sentry-dsn" content="https://…">`. No page in this repository
  has that tag, and a test fails if one is committed.
- Errors only: no tracing, no trace headers, no session tracking, no breadcrumbs; `sendDefaultPii: false`;
  `beforeSend` removes request (page URL with query string, headers), user, breadcrumbs, extra and stack-frame locals.
- A Sentry project `market-insights-web` exists in org `personal-yu0`, but the DSN is not wired anywhere because
  the Pages build has no build step to inject it. Wiring it is part of D-MIW-1 (inject the meta tag in the Pages
  workflow from a repository variable). Until then Sentry reports nothing.

## Related

- `README.md` — how to run the APIs and the offline demo.
- `TRUTH-PASS.md`, `DOCPACK/00-product-card.md` — claim classes and product card.
- `docs/measurement/KPI-PLAN.md`, `specs/001-shared-ci-sentry/spec.md`.
