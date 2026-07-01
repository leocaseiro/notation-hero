import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractPins, findStalePins } from './check-supply-chain-pins.mjs';

const WS = `packages:
  - client
minimumReleaseAge: 10080
minimumReleaseAgeExclude:
  - playwright-core@1.61.1
  - '@playwright/test@1.61.1'
trustPolicy: no-downgrade
trustPolicyExclude:
  - semver@6.3.1
  - chokidar@4.0.3
blockExoticSubdeps: true
`;

test('extractPins reads both exclude lists (quoted + unquoted)', () => {
  assert.deepEqual(
    extractPins(WS).map((p) => p.spec),
    ['playwright-core@1.61.1', '@playwright/test@1.61.1', 'semver@6.3.1', 'chokidar@4.0.3'],
  );
});

test('a pin whose exact version is absent from the lockfile is stale', () => {
  const lock =
    "  semver@6.3.2:\n  chokidar@4.0.3:\n  playwright-core@1.61.1:\n  '@playwright/test@1.61.1':\n";
  assert.deepEqual(
    findStalePins(extractPins(WS), lock).map((p) => p.spec),
    ['semver@6.3.1'], // semver bumped 6.3.1 -> 6.3.2; the others still resolve
  );
});

test('a longer version is not a false match (6.3.1 vs 6.3.10)', () => {
  const stale = findStalePins(
    [{ key: 'trustPolicyExclude', spec: 'semver@6.3.1' }],
    '  semver@6.3.10:\n',
  );
  assert.equal(stale.length, 1);
});

test('all pins present -> nothing stale', () => {
  const lock =
    "  semver@6.3.1:\n  chokidar@4.0.3:\n  playwright-core@1.61.1:\n  '@playwright/test@1.61.1':\n";
  assert.equal(findStalePins(extractPins(WS), lock).length, 0);
});
