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
