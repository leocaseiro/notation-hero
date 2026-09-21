// Builds the version string shown in the player's wordmark tooltip: v26.09.21-1152.4d6d7ea
// — `v`, a two-digit calendar date, the 24-hour build time, then the short commit.
//
// The time is BUILD time, not commit time: the commit already identifies the code, so the useful
// second fact is WHEN this deploy was made — rebuilding the same commit gives a new stamp.
//
// Always Sydney, never the build machine's clock. Vercel builds in UTC, and a UTC stamp would read
// as the wrong day for most of the evening here. Naming the zone rather than an offset is what
// makes AEDT and AEST resolve themselves: Intl applies whichever was in force on that date.
//
// Printed to stdout when run directly, so the build command can put it in the environment:
// NEXT_PUBLIC_APP_VERSION is read (and inlined) by next build. It is deliberately NOT set through
// next.config's `env` key — the Next 16 docs mark that key `version: legacy` and point at the
// environment instead.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const TIME_ZONE = 'Australia/Sydney';

/** Git's own short length. Vercel hands us the full 40, so it is trimmed to match. */
const SHA_LENGTH = 7;

/** What ships when neither Vercel nor git can say which commit this is. */
const UNKNOWN_SHA = 'unknown';

/**
 * @param {{ now: Date, sha: string }} options
 * @returns {string} e.g. "v26.09.21-1152.4d6d7ea"
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export function formatAppVersion({ now, sha }) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: TIME_ZONE,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    // h23, not hour12:false — hour12:false pairs with some locales to render midnight as 24.
    hourCycle: 'h23',
  }).formatToParts(now);
  const at = (type) => parts.find((part) => part.type === type)?.value ?? '';

  return `v${at('year')}.${at('month')}.${at('day')}-${at('hour')}${at('minute')}.${sha}`;
}

/**
 * Vercel's own commit variable first: its build checkout cannot be relied on to answer `git`.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export function resolveSha(env) {
  const fromVercel = env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel.slice(0, SHA_LENGTH);

  try {
    // `git` off PATH, deliberately. There is no module path to resolve it by (the way dev.mjs
    // resolves Next's own entry file), and pinning an absolute one would be wrong somewhere:
    // /usr/bin/git on this Mac, a Nix store path on another machine. The argument list is a
    // constant with nothing interpolated into it, and this only ever runs at build time on a
    // machine that is already running the repo's own scripts.
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- see above; constant argv, build-time only, and no absolute path is portable
    return execFileSync('git', ['rev-parse', `--short=${SHA_LENGTH}`, 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // Never fail a build over a tooltip. A visible "unknown" says more than a crash would.
    return UNKNOWN_SHA;
  }
}

/**
 * @param {{ now?: Date, env?: NodeJS.ProcessEnv }} [options]
 * @returns {string}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export function appVersion({ now = new Date(), env = process.env } = {}) {
  return formatAppVersion({ now, sha: resolveSha(env) });
}

// Only print when invoked directly, so the test can import the functions without side effects.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  process.stdout.write(appVersion());
}
