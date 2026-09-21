import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LOCAL_VERSION,
  RELEASE_PREFIX,
  appVersion,
  channelPrefix,
  formatStamp,
  resolveSha,
} from '../web/scripts/app-version.mjs';

const SHA = '5f027f6';
const FULL_SHA = '5f027f6abcdef1234567890abcdef1234567890a';

/** A September instant: before daylight saving starts, so Sydney is UTC+10. */
const AEST = new Date('2026-09-21T01:43:00Z');

// ---------------------------------------------------------------- the three channels

test('a developer machine gets no stamp at all — just "local"', () => {
  // No VERCEL_ENV means no deployment, and on your own machine you know what you built.
  assert.equal(appVersion({ now: AEST, env: {} }), LOCAL_VERSION);
});

test('a pull-request preview is named by its pull request', () => {
  const version = appVersion({
    now: AEST,
    env: {
      VERCEL_ENV: 'preview',
      VERCEL_GIT_PULL_REQUEST_ID: '168',
      VERCEL_GIT_COMMIT_SHA: FULL_SHA,
    },
  });

  assert.equal(version, 'pr-168.26.09.21-1143.5f027f6');
});

test('production is named by the release line', () => {
  const version = appVersion({
    now: AEST,
    env: { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_SHA: FULL_SHA },
  });

  assert.equal(version, `${RELEASE_PREFIX}.26.09.21-1143.5f027f6`);
});

test('a preview and a production build of the SAME commit never read alike', () => {
  // The whole point of the channel. Before it, a preview wore the production name and the first
  // question anyone asks of a deployed page — which one is this — was answered wrongly.
  const env = { VERCEL_GIT_COMMIT_SHA: FULL_SHA };
  const preview = appVersion({
    now: AEST,
    env: { ...env, VERCEL_ENV: 'preview', VERCEL_GIT_PULL_REQUEST_ID: '168' },
  });
  const production = appVersion({ now: AEST, env: { ...env, VERCEL_ENV: 'production' } });

  assert.notEqual(preview, production);
});

test('a branch pushed before its pull request exists still says it is a preview', () => {
  // Vercel documents VERCEL_GIT_PULL_REQUEST_ID as an EMPTY STRING in that window. Falling through
  // to `pr-` with nothing after it would look like a bug; calling it production would be a lie.
  const version = appVersion({
    now: AEST,
    env: {
      VERCEL_ENV: 'preview',
      VERCEL_GIT_PULL_REQUEST_ID: '',
      VERCEL_GIT_COMMIT_SHA: FULL_SHA,
    },
  });

  assert.equal(version, 'preview.26.09.21-1143.5f027f6');
});

test('a custom Vercel environment is treated as a preview, never as production', () => {
  // VERCEL_ENV can carry a custom environment name. Anything that is not exactly "production"
  // must not be allowed to wear the release prefix.
  assert.equal(channelPrefix({ VERCEL_ENV: 'staging' }), 'preview');
  assert.equal(channelPrefix({ VERCEL_ENV: 'production' }), RELEASE_PREFIX);
  assert.equal(channelPrefix({}), null);
});

// ---------------------------------------------------------------- the stamp itself

test('stamps Sydney standard time (AEST, UTC+10) outside daylight saving', () => {
  assert.equal(formatStamp({ now: AEST, sha: SHA }), '26.09.21-1143.5f027f6');
});

test('stamps Sydney daylight time (AEDT, UTC+11) during daylight saving', () => {
  // The same kind of instant lands an hour further on in January — which is the whole reason the
  // zone is NAMED rather than an offset being hard-coded.
  const stamp = formatStamp({ now: new Date('2026-01-15T12:43:00Z'), sha: SHA });

  assert.equal(stamp, '26.01.15-2343.5f027f6');
});

test('rolls the date over and writes midnight as 0000, never 2400', () => {
  // 13:00Z in January is 00:00 the NEXT day in Sydney. Some locale/option pairs render midnight as
  // hour 24, which would read as an impossible time and sort wrongly.
  const stamp = formatStamp({ now: new Date('2026-01-15T13:00:00Z'), sha: SHA });

  assert.equal(stamp, '26.01.16-0000.5f027f6');
});

test('pads every field to two digits so versions stay the same width and sort', () => {
  const stamp = formatStamp({ now: new Date('2026-03-05T22:07:00Z'), sha: SHA });

  assert.equal(stamp, '26.03.06-0907.5f027f6');
});

// ---------------------------------------------------------------- the commit

test("prefers Vercel's commit variable, trimmed to the short length", () => {
  assert.equal(resolveSha({ VERCEL_GIT_COMMIT_SHA: FULL_SHA }), SHA);
});

test('falls back to the local checkout when Vercel supplies nothing', () => {
  assert.match(resolveSha({}), /^[0-9a-f]{7}$/);
});

test('never throws — a tooltip must not be able to fail a build', () => {
  assert.doesNotThrow(() => appVersion({ env: {} }));
  assert.doesNotThrow(() => appVersion({ env: { VERCEL_ENV: 'production' } }));
});
