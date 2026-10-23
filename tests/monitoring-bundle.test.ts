/**
 * The pages load the generated js/monitoring-browser.js. These tests run the real
 * artifact in a happy-dom window: it must stay inert without a DSN, and with one it
 * must send scrubbed error events only.
 */
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { Window } from "happy-dom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundleSource = await readFile(join(root, "js", "monitoring-browser.js"), "utf8");
const DSN = "https://publickey@o0.ingest.sentry.io/1";

type Sent = { url: string; body: string };

function load(head: string) {
  const window = new Window({ url: "http://127.0.0.1:4178/crypto.html?fixtures=1&token=secret" });
  window.document.head.innerHTML = head;
  const sent: Sent[] = [];
  const fetch = async (input: string, init?: RequestInit) => {
    sent.push({ url: String(input), body: String(init?.body ?? "") });
    return new Response("{}", { status: 200 });
  };
  // Look native, so Sentry uses this stub instead of borrowing a real fetch from an iframe:
  // nothing in this test may reach the network.
  fetch.toString = () => "function fetch() { [native code] }";
  (window as unknown as { fetch: typeof fetch }).fetch = fetch;
  // Run the classic script in the window's own global scope, as a browser would.
  (window as unknown as { eval: (source: string) => unknown }).eval(bundleSource);
  const monitoring = (window as unknown as { InsightsMonitoring?: { enabled: boolean } }).InsightsMonitoring;
  return { window, sent, monitoring };
}

async function settle(ms = 50) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("monitoring bundle", () => {
  it("is off and sends nothing when the page has no sentry-dsn meta tag", async () => {
    const { sent, monitoring } = load("");
    assert.equal(monitoring?.enabled, false);
    await settle();
    assert.equal(sent.length, 0);
  });

  it("with a DSN, sends error events without the page URL, user or breadcrumbs", async () => {
    const { window, sent, monitoring } = load(`<meta name="sentry-dsn" content="${DSN}">`);
    assert.equal(monitoring?.enabled, true);
    const sentry = (window as unknown as { __SENTRY__?: unknown }).__SENTRY__;
    assert.ok(sentry, "Sentry registered its global carrier");
    window.dispatchEvent(new window.ErrorEvent("error", { message: "boom", error: new Error("boom") }));
    await settle(200);
    const events = sent.filter((request) => request.url.includes("ingest.sentry.io"));
    assert.ok(events.length >= 1, "the uncaught error was sent");
    assert.match(events[0].body, /boom/);
    for (const request of events) {
      assert.doesNotMatch(request.body, /"type":"(session|transaction)"/);
      assert.doesNotMatch(request.body, /token=secret/);
      assert.doesNotMatch(request.body, /"breadcrumbs"|"user"|"request"/);
    }
  });
});

describe("pages", () => {
  it("every page loads the monitoring bundle before the data-products bundle", async () => {
    const pages = (await readdir(root)).filter((name) => name.endsWith(".html"));
    assert.ok(pages.length >= 9);
    for (const page of pages) {
      const html = await readFile(join(root, page), "utf8");
      const monitoring = html.indexOf('src="js/monitoring-browser.js"');
      const data = html.indexOf('src="js/data-products-browser.js"');
      assert.ok(monitoring > 0, `${page} does not load js/monitoring-browser.js`);
      assert.ok(monitoring < data, `${page} loads monitoring after the data bundle`);
      assert.doesNotMatch(html, /name="sentry-dsn"/, `${page} must not commit a DSN`);
    }
  });
});
