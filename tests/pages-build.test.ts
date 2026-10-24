/**
 * scripts/build-pages.ts assembles the GitHub Pages artifact (D-MIW-1): only the site files, every
 * page forced onto fixtures so the public site never probes the visitor's local ports, and a
 * build-commit marker the post-deploy smoke test compares with the deployed commit.
 */
import assert from "node:assert/strict";
import { access, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

import { buildPages, transformPage } from "../scripts/build-pages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const commit = "4c55e9b8de1e83fb44bdc77aaf33d5a74adf589f";
const page =
  '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8" />\n  <title>x</title>\n</head>\n<body></body>\n</html>\n';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("transformPage", () => {
  it("adds the build-commit marker and forces fixtures before any page script runs", () => {
    const html = transformPage(page, { commit });
    assert.match(html, /<meta name="build-commit" content="4c55e9b8de1e83fb44bdc77aaf33d5a74adf589f" \/>/);
    assert.match(html, /<script>window\.DATA_PRODUCTS_USE_FIXTURES = true;<\/script>/);
    assert.ok(html.indexOf("DATA_PRODUCTS_USE_FIXTURES") < html.indexOf("<title>"));
  });

  it("adds the Sentry DSN meta tag only when a DSN is given", () => {
    assert.doesNotMatch(transformPage(page, { commit }), /sentry-dsn/);
    const html = transformPage(page, { commit, sentryDsn: "https://abc@o1.ingest.sentry.io/2" });
    assert.match(html, /<meta name="sentry-dsn" content="https:\/\/abc@o1\.ingest\.sentry\.io\/2" \/>/);
  });

  it("rejects a commit that is not a hex SHA and a DSN that is not https", () => {
    assert.throws(() => transformPage(page, { commit: 'x" onload="alert(1)' }), /commit/);
    assert.throws(() => transformPage(page, { commit, sentryDsn: 'javascript:"' }), /DSN/);
  });

  it("refuses a page without a charset meta to anchor on", () => {
    assert.throws(() => transformPage("<html><head></head></html>", { commit }), /charset/);
  });
});

describe("buildPages", () => {
  let out = "";
  before(async () => {
    out = await mkdtemp(join(tmpdir(), "pages-"));
    await rm(out, { recursive: true });
    await buildPages({ root, out, commit });
  });
  after(() => rm(out, { recursive: true, force: true }));

  it("publishes every page, transformed", async () => {
    const pages = (await readdir(root)).filter((name) => name.endsWith(".html"));
    assert.ok(pages.length > 0);
    for (const name of pages) {
      const html = await readFile(join(out, name), "utf8");
      assert.match(html, /name="build-commit" content="4c55e9b/, name);
      assert.match(html, /DATA_PRODUCTS_USE_FIXTURES = true/, name);
    }
  });

  it("publishes the site assets and nothing else", async () => {
    for (const dir of ["css", "js", "fixtures"]) assert.ok(await exists(join(out, dir)), dir);
    for (const name of ["archive", "DOCPACK", "docs", "src", "tests", "node_modules", "package.json", "README.md"]) {
      assert.equal(await exists(join(out, name)), false, name);
    }
  });
});
