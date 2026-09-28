// tooling/workflow-guards.test.mjs — node --test suite asserting both privileged workflows keep the
// in-repo master-ref guard (NH-79 review). The deploy + seed workflows run with the owner/DDL Neon
// url; the GitHub `production` environment branch policy is the primary gate, but the in-repo
// `github.ref == 'refs/heads/master'` if-guard is the defence-in-depth layer the PR documents. This
// test pins it in source (mirrors infra/index.test.ts pinning the Function URL to AWS_IAM) so a
// future edit cannot silently drop the guard.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GUARD = "github.ref == 'refs/heads/master'";

function workflow(name) {
  return readFileSync(
    fileURLToPath(new URL(`../.github/workflows/${name}`, import.meta.url)),
    'utf8',
  );
}

test('deploy.yml gates the up job on the master ref', () => {
  assert.ok(
    workflow('deploy.yml').includes(GUARD),
    `deploy.yml must carry the in-repo guard: ${GUARD}`,
  );
});

test('seed-catalog.yml gates the owner-url seed on the master ref', () => {
  assert.ok(
    workflow('seed-catalog.yml').includes(GUARD),
    `seed-catalog.yml (owner-url seed) must carry the in-repo guard: ${GUARD}`,
  );
});

test('the e2e job runs the web Playwright lane, not only the client one', () => {
  const ci = workflow('ci.yml');
  // ANCHORED to a real `run:` line (the /m flag), never "appears somewhere in the file": the
  // unanchored form stays green against a ci.yml where the whole step is commented out with `#`.
  assert.match(ci, /^\s+run: pnpm --filter @notation-hero\/web run test:e2e$/m);
  // The web lane needs its own browser install — the client step only installs for client/.
  assert.match(
    ci,
    /^\s+run: pnpm --filter @notation-hero\/web exec playwright install --with-deps chromium$/m,
  );
  // Its report and traces must be uploaded, or a CI failure is not replayable.
  assert.match(ci, /web\/playwright-report\//);
  assert.match(ci, /web\/test-results\//);
  // …and the lane must still BLOCK merge. ci-green's `needs:` list is the single source of truth
  // for that, so a step that runs inside a job nothing waits on is not a gate.
  assert.match(ci, /^\s+e2e,$/m);
});

// NH-331: the error-code drift gate is only a gate while its job is one ci-green waits on, and it
// only sees a docs-only change because it lives in `lint` (gated on code || docs_or_config) rather
// than `quality` (gated on `code`, which does not match docs/**).
test('the error-code gate runs in the lint job', () => {
  assert.match(workflow('ci.yml'), /^\s+run: pnpm run check:error-codes$/m);
});

test('lint is a job ci-green waits on, so the error-code gate can block a merge', () => {
  assert.match(workflow('ci.yml'), /^\s+lint,$/m);
});

test('the lint job fetches enough history for the never-reuse comparison', () => {
  // check:error-codes is fail-closed when it cannot resolve a base revision, so a shallow
  // checkout would turn the whole gate red rather than skipping quietly.
  const lintJob =
    workflow('ci.yml')
      .split(/^  lint:$/m)[1]
      ?.split(/^  [a-z][a-z0-9-]*:$/m)[0] ?? '';
  assert.match(lintJob, /fetch-depth: 0/);
});
