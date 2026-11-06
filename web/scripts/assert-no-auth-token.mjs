// Fails the build when SENTRY_AUTH_TOKEN's value sits in a file a browser can download.
//
// The token lets anyone holding it upload source maps and create releases in our Sentry
// organization. It lives only in Vercel's Production environment, marked Secret, and only
// next.config.ts reads it: withSentryConfig hands it to the source-map upload and adds none of it
// to the bundle. Nothing else would fail, though, if a later change put it in front of a browser.
// Next copies only NEXT_PUBLIC_ variables into browser JavaScript, but a server component can render
// any variable into a page, and both pages here are static, so `next build` writes them as files
// under .next/server.
//
// So it reads the three folders browsers download from: the scripts and styles under .next/static,
// the pre-rendered pages under .next/server (each page's .html and .rsc, and the 404 and 500 pages),
// and the files in public/. It names the files it finds, never the value. With no token in the
// environment — CI, previews, local builds — there is nothing to look for, so only the production
// build on Vercel runs it for real.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The folders a browser downloads from, relative to web/. */
const BROWSER_FOLDERS = ['.next/static', '.next/server', 'public'];

const filesUnder = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));

/**
 * The failure message when a browser file holds `token`, or null when none does — or when there
 * is no token to look for. The message names each file and never the value.
 *
 * @param {{ token: string | undefined, root?: string }} options
 * @returns {string | null}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export function tokenLeakReport({ token, root = WEB }) {
  if (!token) return null;
  const leaks = BROWSER_FOLDERS.map((folder) => path.join(root, folder))
    .filter((folder) => existsSync(folder))
    .flatMap((folder) => filesUnder(folder))
    .filter((file) => readFileSync(file).includes(token))
    .map((file) => path.relative(root, file));
  if (leaks.length === 0) return null;
  return [
    `assert-no-auth-token: SENTRY_AUTH_TOKEN's value is in ${leaks.length} file(s) a browser downloads:`,
    ...leaks.map((file) => `  ${file}`),
    'Remove what put it there. Then the owner rotates the token in Sentry: anyone who loaded those',
    'files could have read it.',
  ].join('\n');
}

// Only check when invoked directly, so the test can import the function without side effects.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const report = tokenLeakReport({ token: process.env.SENTRY_AUTH_TOKEN });
  if (report !== null) {
    console.error(report);
    process.exitCode = 1;
  }
}
