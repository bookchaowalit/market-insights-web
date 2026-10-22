/**
 * Error reporting must stay off unless the host page supplies a DSN, report
 * errors only, and never carry user data (URLs, query strings, headers,
 * breadcrumbs, extra context or stack-frame locals).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Window } from "happy-dom";

import { dsnFromDocument, initMonitoring, scrubEvent, sentryOptions } from "../src/monitoring/sentry.ts";

const DSN = "https://publickey@o0.ingest.sentry.io/1";

function pageWith(head: string) {
  const window = new Window({ url: "http://127.0.0.1:4178/index.html?fixtures=1" });
  window.document.head.innerHTML = head;
  return window.document as unknown as Document;
}

describe("dsnFromDocument", () => {
  it("returns nothing when the page has no sentry-dsn meta tag", () => {
    assert.equal(dsnFromDocument(pageWith("")), undefined);
  });

  it("ignores an empty or non-https value", () => {
    assert.equal(dsnFromDocument(pageWith('<meta name="sentry-dsn" content="   ">')), undefined);
    assert.equal(dsnFromDocument(pageWith('<meta name="sentry-dsn" content="http://k@example.com/1">')), undefined);
    assert.equal(dsnFromDocument(pageWith('<meta name="sentry-dsn" content="not a url">')), undefined);
  });

  it("reads a trimmed https DSN injected by the host page", () => {
    assert.equal(dsnFromDocument(pageWith(`<meta name="sentry-dsn" content=" ${DSN} ">`)), DSN);
  });
});

describe("initMonitoring", () => {
  it("does not call init without a DSN", () => {
    let calls = 0;
    const enabled = initMonitoring(pageWith(""), () => {
      calls += 1;
    });
    assert.equal(enabled, false);
    assert.equal(calls, 0);
  });

  it("calls init once with the scrubbing options when a DSN is present", () => {
    const seen: Array<ReturnType<typeof sentryOptions>> = [];
    const enabled = initMonitoring(pageWith(`<meta name="sentry-dsn" content="${DSN}">`), (options) => {
      seen.push(options);
    });
    assert.equal(enabled, true);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].dsn, DSN);
    assert.equal(seen[0].beforeSend, scrubEvent);
  });
});

describe("sentryOptions", () => {
  it("stays disabled when no DSN is configured", () => {
    assert.equal(sentryOptions(undefined).enabled, false);
  });

  it("reports errors only: no PII, tracing, trace headers, breadcrumbs or sessions", () => {
    const options = sentryOptions(DSN);
    assert.equal(options.enabled, true);
    assert.equal(options.sendDefaultPii, false);
    assert.equal(options.tracesSampleRate, undefined);
    assert.deepEqual(options.tracePropagationTargets, []);
    assert.equal(options.maxBreadcrumbs, 0);
    assert.equal(options.beforeSendTransaction(), null);
    const kept = options
      .integrations([
        { name: "GlobalHandlers" },
        { name: "BrowserSession" },
        { name: "Breadcrumbs" },
        { name: "Dedupe" },
      ])
      .map((integration) => integration.name);
    assert.deepEqual(kept, ["GlobalHandlers", "Dedupe"]);
  });
});

describe("scrubEvent", () => {
  it("drops request data, user, breadcrumbs and extra context", () => {
    const event = scrubEvent({
      message: "boom",
      request: { url: "http://127.0.0.1:4178/crypto.html?token=secret", headers: { "User-Agent": "x" } },
      user: { ip_address: "1.2.3.4", email: "x@example.com" },
      breadcrumbs: [{ message: "clicked" }],
      extra: { body: "secret" },
    });
    assert.equal(event.message, "boom");
    assert.equal(event.request, undefined);
    assert.equal(event.user, undefined);
    assert.equal(event.breadcrumbs, undefined);
    assert.equal(event.extra, undefined);
  });

  it("removes local variables from stack frames", () => {
    const event = scrubEvent({
      exception: {
        values: [{ type: "Error", stacktrace: { frames: [{ function: "f", vars: { password: "p" } }] } }],
      },
    });
    const frame = event.exception?.values?.[0]?.stacktrace?.frames?.[0] as { function?: string; vars?: unknown };
    assert.equal(frame.function, "f");
    assert.equal(frame.vars, undefined);
  });
});
