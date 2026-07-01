import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractPins, findStalePins } from './check-supply-chain-pins.mjs';

// Mirrors the real pnpm-workspace.yaml exclude blocks (both playwright pins + the two trust pins).
const WS = `packages:
  - client
minimumReleaseAge: 10080
minimumReleaseAgeExclude:
  - playwright-core@1.61.1
  - playwright@1.61.1
  - '@playwright/test@1.61.1'
trustPolicy: no-downgrade
trustPolicyExclude:
  - semver@6.3.1
  - chokidar@4.0.3
blockExoticSubdeps: true
`;

const ALL_PINS = [
  'playwright-core@1.61.1',
  'playwright@1.61.1',
  '@playwright/test@1.61.1',
  'semver@6.3.1',
  'chokidar@4.0.3',
];

// A lockfile where every WS pin resolves at its exact version.
const LOCK_ALL =
  "  playwright-core@1.61.1:\n  playwright@1.61.1:\n  '@playwright/test@1.61.1':\n  semver@6.3.1:\n  chokidar@4.0.3:\n";

test('extractPins reads both exclude lists (quoted + unquoted), mirroring pnpm-workspace.yaml', () => {
  assert.deepEqual(
    extractPins(WS).map((p) => p.spec),
    ALL_PINS,
  );
});

test('a pin whose exact version is absent from the lockfile is stale', () => {
  const lock = LOCK_ALL.replace('semver@6.3.1', 'semver@6.3.2'); // semver bumped; the others still resolve
  assert.deepEqual(
    findStalePins(extractPins(WS), lock).map((p) => p.spec),
    ['semver@6.3.1'],
  );
});

test('a longer version is not a false match (6.3.1 vs 6.3.10)', () => {
  const stale = findStalePins(
    [{ key: 'trustPolicyExclude', spec: 'semver@6.3.1' }],
    '  semver@6.3.10:\n',
  );
  assert.equal(stale.length, 1);
});

test('a longer package name is not a false match (semver vs node-semver)', () => {
  const stale = findStalePins(
    [{ key: 'trustPolicyExclude', spec: 'semver@6.3.1' }],
    '  node-semver@6.3.1:\n',
  );
  assert.equal(stale.length, 1);
});

test('all pins present -> nothing stale', () => {
  assert.equal(findStalePins(extractPins(WS), LOCK_ALL).length, 0);
});

test('an inline comment inside an exclude block does not truncate the pin list', () => {
  const ws = `trustPolicyExclude:
  - semver@6.3.1
  # a comment between items must not drop the pins that follow it
  - chokidar@4.0.3
`;
  assert.deepEqual(
    extractPins(ws).map((p) => p.spec),
    ['semver@6.3.1', 'chokidar@4.0.3'],
  );
});
