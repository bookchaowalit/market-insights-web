#!/usr/bin/env bash
# Post-deploy smoke check of the GitHub Pages site (read-only GETs).
# Usage: scripts/deploy-smoke.sh <base-url> [expected-commit]
# 1. The dashboard answers 200 and shows "Solo Empire Insights".
# 2. Its build-commit meta tag names the expected commit (retried while the Pages CDN refreshes;
#    without an expected commit it only has to name one) and the page is forced onto fixtures.
# 3. stocks.html answers 200 and shows "Stock Portfolio".
set -euo pipefail

BASE="${1:?usage: deploy-smoke.sh <base-url> [expected-commit]}"
BASE="${BASE%/}"
EXPECTED="${2:-}"
ATTEMPTS="${SMOKE_ATTEMPTS:-20}"
DELAY="${SMOKE_DELAY:-15}"
fail=0
body=$(mktemp)
trap 'rm -f "$body"' EXIT

get() {
  curl -sS -L --max-time 30 -o "$body" -w '%{http_code}' -H 'cache-control: no-cache' "$BASE$1" || echo "000"
}

page() {
  local path="$1" marker="$2" code
  code=$(get "$path?smoke=$(date +%s)")
  if [ "$code" != 200 ]; then
    echo "::error::FAIL $code $path"
    fail=1
  elif ! grep -qF -- "$marker" "$body"; then
    echo "::error::FAIL $path answered 200 but does not show \"$marker\""
    fail=1
  else
    echo "ok   200 $path shows \"$marker\""
  fi
}

page / "Solo Empire Insights"

commit=""
for attempt in $(seq 1 "$ATTEMPTS"); do
  code=$(get "/?smoke=$(date +%s)")
  commit=$(grep -oE '<meta name="build-commit" content="[0-9a-f]{7,40}"' "$body" | grep -oE '[0-9a-f]{7,40}' || true)
  if [ "$code" = 200 ] && [ -n "$commit" ] && { [ -z "$EXPECTED" ] || [ "$commit" = "$EXPECTED" ]; }; then
    break
  fi
  echo "wait / answered $code, build-commit '${commit:-none}', expected '${EXPECTED:-any}' (attempt $attempt/$ATTEMPTS)"
  [ "$attempt" -lt "$ATTEMPTS" ] && sleep "$DELAY"
done
if [ "$code" = 200 ] && [ -n "$commit" ] && { [ -z "$EXPECTED" ] || [ "$commit" = "$EXPECTED" ]; }; then
  echo "ok   200 / build-commit $commit"
else
  echo "::error::FAIL the site does not serve the expected commit: build-commit '${commit:-none}', expected '${EXPECTED:-any}'"
  fail=1
fi
if grep -qF "window.DATA_PRODUCTS_USE_FIXTURES = true;" "$body"; then
  echo "ok   / is forced onto fixtures"
else
  echo "::error::FAIL / is not forced onto fixtures (it would probe the visitor's local ports)"
  fail=1
fi

page /stocks.html "Stock Portfolio"

exit "$fail"
