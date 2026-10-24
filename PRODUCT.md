# Solo Empire Insights (market-insights-web) — Product

*Tier B showcase. Last checked against the code on 2026-10-23.*

## What it is

A static multi-page website (plain HTML, CSS and one generated JavaScript bundle) that reads the Solo Empire
**data-product APIs** and shows their status and records: crypto, stocks, FX, DeFi, SEO page provenance,
news signals and technology discovery (7 products). Each product is a separate read-only API on a local port
(8101–8104, 8106, 8108, 8110), matching the contract freeze `data-product-contracts-v4` (architecture-docs
`systems/architecture/data-product-contracts-v4.yaml`). The former AI tools (`ai_tools.v1`, port 8107) and flights
(`flight.v1`, port 8105) products were retired on 2026-10-23; their pages and fixtures were removed and ports 8105
and 8107 are never reused. When an API cannot be reached, the page falls back to sanitized fixture envelopes in
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
- Tests (node:test, 7 files, 84 tests): contract freeze, typed client contract, browser bundle in a sandbox, DOM states in
  happy-dom, static asset references, Sentry options/scrubbing and the monitoring bundle.
- CI: shared `ci-node.yml` + `security.yml` v1.1.1 (Biome, typecheck, tests required, bundle freshness check).
- Error reporting: `@sentry/browser`, errors only, personal data scrubbed (see below). **Not wired to a DSN**.

## What does not work / is not claimed

- No hosted data. The public page cannot reach anyone's local APIs, so a visitor always sees the fixtures
  (dated 2026-08 / 2026-09, marked stale).
- SEO shows owned-page provenance (reachability, title, HTTP status), not search rankings.
- No analytics. No production users. No SLA.
- The README's "hosted frontend" paragraph names `NEXT_PUBLIC_*` variables; this is not a Next.js app — the static
  pages read `window.DATA_PRODUCT_URLS` instead.

## Live URL and deploy state

- **Live:** https://bookchaowalit.github.io/market-insights-web/ — GitHub Pages, deployed by the
  `Pages deploy` workflow (owner decision D-MIW-1, done 2026-10-24; Pages source: GitHub Actions).
- It runs only after CI succeeds on a push to `main`. `scripts/build-pages.ts` publishes only the pages,
  `css/`, `js/` and `fixtures/` (not `archive/`, `DOCPACK/`, `docs/` or sources), forces every page onto
  fixtures (`window.DATA_PRODUCTS_USE_FIXTURES = true`, so the public site never probes the visitor's
  local ports) and adds a `build-commit` meta tag.
- The `deploy-smoke` job then checks the live site: the dashboard answers 200, its `build-commit` is the
  deployed commit, it is forced onto fixtures, and `stocks.html` renders (`scripts/deploy-smoke.sh`).
- What a visitor sees: the dashboard on fixtures (the data is dated 2026-08 / 2026-09 and marked stale).

## Error reporting (Sentry)

- `js/monitoring-browser.js` (from `src/monitoring/`) loads on every page before the data bundle. It initialises
  Sentry **only** if the page carries `<meta name="sentry-dsn" content="https://…">`. No page in this repository
  has that tag, and a test fails if one is committed.
- Errors only: no tracing, no trace headers, no session tracking, no breadcrumbs; `sendDefaultPii: false`;
  `beforeSend` removes request (page URL with query string, headers), user, breadcrumbs, extra and stack-frame locals, keeps only platform contexts (os, runtime, browser, device, app), drops `tags.url` and cuts query strings and hashes from the transaction, tags, exception messages, stack-frame file paths and debug images.
- A Sentry project `market-insights-web` exists in org `personal-yu0`. The Pages workflow adds the
  `sentry-dsn` meta tag only when the repository variable `SENTRY_DSN` is set; it is not set yet, so Sentry
  reports nothing.

## Related

- `README.md` — how to run the APIs and the offline demo.
- `TRUTH-PASS.md`, `DOCPACK/00-product-card.md` — claim classes and product card.
- `docs/measurement/KPI-PLAN.md`, `specs/001-shared-ci-sentry/spec.md`.
