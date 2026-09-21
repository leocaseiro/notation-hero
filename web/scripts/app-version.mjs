// Builds the version string shown in the player's wordmark tooltip.
//
// Three channels, because the first question anyone asks of a deployed page is WHICH ONE IS THIS,
// and a preview that looks like production answers it wrongly:
//
//   local                            a developer machine — no stamp, nothing to identify
//   pr-168.26.09.21-1143.5f027f6     a Vercel preview, named by the pull request it belongs to
//   v0.26.09.21-1143.5f027f6         production, named by the release line
//
// After the channel: a two-digit Sydney date, the 24-hour build time, then the short commit.
//
// The stamp is BUILD time, not commit time. The commit already identifies the code, so the useful
// second fact is WHEN this deploy was made — rebuilding one commit gives a new stamp.
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

/** What ships when neither Vercel nor the checkout can say which commit this is. */
const UNKNOWN_SHA = 'unknown';

/**
 * The production channel's name. Bump it as the product versions — it is the one part of this
 * string a person chooses rather than the build computing.
 */
export const RELEASE_PREFIX = 'v0';

/** A build nobody deployed. It carries no stamp: on your own machine you know what you built. */
export const LOCAL_VERSION = 'local';

/**
 * A preview that is not attached to a pull request yet. Vercel documents
 * VERCEL_GIT_PULL_REQUEST_ID as an empty string for a branch pushed before its PR exists, so this
 * covers that window rather than printing `pr-` with nothing after it.
 */
const PREVIEW_PREFIX = 'preview';

/**
 * Which channel this build belongs to, or null when it is not a deployment at all.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {string | null}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export function channelPrefix(env) {
  // No VERCEL_ENV means no Vercel, so: local. It also means "local" would appear on a deployed
  // page if the project ever had system environment variables switched off — which is the right
  // way round. A wrong-looking version is a visible, fixable signal; a preview wearing the
  // production name is the failure this whole string exists to prevent.
  const vercelEnv = env.VERCEL_ENV;
  if (!vercelEnv) return null;

  if (vercelEnv === 'production') return RELEASE_PREFIX;

  const pullRequest = env.VERCEL_GIT_PULL_REQUEST_ID;
  return pullRequest ? `pr-${pullRequest}` : PREVIEW_PREFIX;
}

/**
 * The date-time-commit half, with no channel on the front.
 *
 * @param {{ now: Date, sha: string }} options
 * @returns {string} e.g. "26.09.21-1143.5f027f6"
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export function formatStamp({ now, sha }) {
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

  return `${at('year')}.${at('month')}.${at('day')}-${at('hour')}${at('minute')}.${sha}`;
}

/**
 * Vercel's own commit variable first: its build checkout cannot be relied on to answer a command.
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
  const prefix = channelPrefix(env);
  if (prefix === null) return LOCAL_VERSION;

  return `${prefix}.${formatStamp({ now, sha: resolveSha(env) })}`;
}

// Only print when invoked directly, so the test can import the functions without side effects.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  process.stdout.write(appVersion());
}
