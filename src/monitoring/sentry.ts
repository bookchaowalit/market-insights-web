// Sentry settings for the static pages. Errors only: no tracing, no trace headers on
// outgoing requests, no sessions, no breadcrumbs, and nothing that can carry user input
// (URLs with query strings, headers, cookies, bodies, stack-frame locals).
//
// The DSN is never committed. A host page that wants error reporting injects
// <meta name="sentry-dsn" content="https://..."> at deploy time; without it Sentry is off.

type ScrubbableEvent = {
  request?: unknown;
  user?: unknown;
  breadcrumbs?: unknown;
  extra?: unknown;
  exception?: { values?: { stacktrace?: { frames?: { vars?: unknown }[] } }[] };
};

type NamedIntegration = { name: string };

// Default integrations that would send something other than an error event.
const DROPPED_INTEGRATIONS = new Set(["BrowserSession", "Breadcrumbs"]);

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  for (const value of event.exception?.values ?? []) {
    for (const frame of value.stacktrace?.frames ?? []) delete frame.vars;
  }
  return event;
}

export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    sendDefaultPii: false,
    tracesSampleRate: undefined,
    tracePropagationTargets: [] as string[],
    maxBreadcrumbs: 0,
    integrations: <I extends NamedIntegration>(defaults: I[]): I[] =>
      defaults.filter((integration) => !DROPPED_INTEGRATIONS.has(integration.name)),
    beforeSend: scrubEvent,
    beforeSendTransaction: () => null,
  };
}

export type MonitoringOptions = ReturnType<typeof sentryOptions>;

export function dsnFromDocument(doc: Document): string | undefined {
  const value = doc.querySelector<HTMLMetaElement>('meta[name="sentry-dsn"]')?.content?.trim();
  if (!value) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function initMonitoring(doc: Document, init: (options: MonitoringOptions) => unknown): boolean {
  const dsn = dsnFromDocument(doc);
  if (!dsn) return false;
  init(sentryOptions(dsn));
  return true;
}
