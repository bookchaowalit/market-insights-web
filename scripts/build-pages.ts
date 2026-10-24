/**
 * Assemble the GitHub Pages artifact (owner decision D-MIW-1).
 * Usage: node --experimental-strip-types scripts/build-pages.ts <out-dir> <commit> [sentry-dsn]
 *
 * Publishes only the pages, css/, js/ and fixtures/ (never archive/, DOCPACK/, docs/ or sources).
 * Every page gets a build-commit marker for the post-deploy smoke test and is forced onto fixtures,
 * so the public site never probes the visitor's local API ports. The Sentry DSN meta tag is added
 * only when a DSN is given (repository variable), never committed.
 */
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ASSET_DIRS = ["css", "js", "fixtures"];
const CHARSET = /<meta charset="UTF-8" \/>\n?/i;

export type PageOptions = { commit: string; sentryDsn?: string };

export function transformPage(html: string, { commit, sentryDsn }: PageOptions): string {
  if (!/^[0-9a-f]{7,40}$/.test(commit)) throw new Error(`commit must be a hex SHA, got ${JSON.stringify(commit)}`);
  if (sentryDsn && !/^https:\/\/[\w.@:/-]+$/.test(sentryDsn)) throw new Error("Sentry DSN must be an https URL");
  const match = CHARSET.exec(html);
  if (!match) throw new Error('page has no <meta charset="UTF-8" /> to anchor on');
  const indent = "  ";
  const tags = [
    `<meta name="build-commit" content="${commit}" />`,
    ...(sentryDsn ? [`<meta name="sentry-dsn" content="${sentryDsn}" />`] : []),
    "<script>window.DATA_PRODUCTS_USE_FIXTURES = true;</script>",
  ];
  const at = match.index + match[0].length;
  return `${html.slice(0, at)}${tags.map((tag) => `${indent}${tag}\n`).join("")}${html.slice(at)}`;
}

export async function buildPages({
  root,
  out,
  ...options
}: PageOptions & { root: string; out: string }): Promise<void> {
  await mkdir(out, { recursive: true });
  const pages = (await readdir(root)).filter((name) => name.endsWith(".html"));
  for (const name of pages) {
    await writeFile(join(out, name), transformPage(await readFile(join(root, name), "utf8"), options));
  }
  for (const dir of ASSET_DIRS) await cp(join(root, dir), join(out, dir), { recursive: true });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [out, commit, sentryDsn] = process.argv.slice(2);
  if (!out || !commit) {
    console.error("usage: build-pages.ts <out-dir> <commit> [sentry-dsn]");
    process.exit(2);
  }
  await buildPages({ root: process.cwd(), out, commit, sentryDsn: sentryDsn || undefined });
  console.log(`built ${out} for ${commit}`);
}
