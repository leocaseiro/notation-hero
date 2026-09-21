import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appVersion, formatAppVersion, resolveSha } from '../web/scripts/app-version.mjs';

const SHA = '4d6d7ea';

test('stamps Sydney standard time (AEST, UTC+10) outside daylight saving', () => {
  // 21 Sep 2026 is before daylight saving starts (first Sunday in October), so Sydney is UTC+10.
  const version = formatAppVersion({ now: new Date('2026-09-21T01:52:00Z'), sha: SHA });

  assert.equal(version, 'v26.09.21-1152.4d6d7ea');
});

test('stamps Sydney daylight time (AEDT, UTC+11) during daylight saving', () => {
  // Mid-January is inside daylight saving, so the SAME kind of instant lands an hour further on —
  // this is the whole reason the zone is named rather than an offset being hard-coded.
  const version = formatAppVersion({ now: new Date('2026-01-15T12:52:00Z'), sha: SHA });

  assert.equal(version, 'v26.01.15-2352.4d6d7ea');
});

test('rolls the date over and writes midnight as 0000, never 2400', () => {
  // 13:00Z in January is 00:00 the NEXT day in Sydney. Some locale/option pairs render midnight as
  // hour 24, which would read as an impossible time and sort wrongly.
  const version = formatAppVersion({ now: new Date('2026-01-15T13:00:00Z'), sha: SHA });

  assert.equal(version, 'v26.01.16-0000.4d6d7ea');
});

test('pads every field to two digits so versions stay the same width and sort', () => {
  const version = formatAppVersion({ now: new Date('2026-03-05T22:07:00Z'), sha: SHA });

  assert.equal(version, 'v26.03.06-0907.4d6d7ea');
});

test("prefers Vercel's commit variable, trimmed to git's own short length", () => {
  const sha = resolveSha({ VERCEL_GIT_COMMIT_SHA: '4d6d7eaf1234567890abcdef1234567890abcdef' });

  assert.equal(sha, '4d6d7ea');
});

test('falls back to the local git checkout when Vercel supplies nothing', () => {
  // No VERCEL_GIT_COMMIT_SHA: this repo IS a git checkout, so a real short sha comes back.
  const sha = resolveSha({});

  assert.match(sha, /^[0-9a-f]{7}$/);
});

test('never throws — a tooltip must not be able to fail a build', () => {
  assert.doesNotThrow(() => appVersion({ env: {} }));
  assert.match(
    appVersion({ now: new Date('2026-09-21T01:52:00Z'), env: {} }),
    /^v26\.09\.21-1152\./,
  );
});
