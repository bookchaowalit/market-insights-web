// Entry for js/monitoring-browser.js (npm run build:browser). Loaded by every page before
// the data-products bundle; it does nothing unless the page carries a sentry-dsn meta tag.
import * as Sentry from "@sentry/browser";
import { initMonitoring } from "./sentry.ts";

const enabled = initMonitoring(document, (options) => Sentry.init(options));
(globalThis as { InsightsMonitoring?: { enabled: boolean } }).InsightsMonitoring = { enabled };
