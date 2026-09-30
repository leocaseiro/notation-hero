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

/** @returns {{ scripts: Record<string, string>, devDependencies: Record<string, string> }} */
function packageJson(relativePath) {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8'),
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

// web/ puts BOTH lanes in ONE config, so an unscoped local invocation runs the pixel lane too — on
// a Mac that is a guaranteed red run against Linux baselines plus stray *-chromium-darwin.png
// files. client/ is immune STRUCTURALLY, not by discipline: its unscoped test:e2e scripts point at
// a second config that declares no `projects` array, so there is nothing to scope. web/ has to be
// explicit, and this is what keeps it that way.
test('every web/ Playwright script names its project', () => {
  const { scripts } = packageJson('web/package.json');
  const unscoped = Object.entries(scripts).filter(
    ([, script]) =>
      script.includes('playwright test') && !/--project=(?:e2e|chromium)\b/.test(script),
  );
  assert.deepEqual(
    unscoped.map(([name]) => name),
    [],
    'these web/ scripts run `playwright test` with no --project, so they would run BOTH lanes',
  );
});

// The container tag has three homes once web/'s browser lane moves into a container of its own:
// tooling/docker-playwright.sh and the `container:` lines of the `vr` and `web` CI jobs. A partial
// bump is invisible — baselines then compare under a renderer they were not made with, and the
// failure reads as a real visual regression. Anchor every home to the installed @playwright/test,
// so a bump is all-or-nothing.
//
// The expected count is TWO here, and that is deliberate rather than a typo: only the helper and
// the `vr` job exist at this point. The `web` job's own `container:` line is the third home, and it
// lands with that job — the count rises to 3 in the same change, and a hard number is what gives
// this assertion its teeth (a count derived from the file would stay green over a deleted pin).
const EXPECTED_PLAYWRIGHT_PINS = 2;

test('the Playwright container tag agrees with @playwright/test everywhere it is pinned', () => {
  // The range is a caret (`^1.61.1`); its FLOOR is what the image tag must name, because that is
  // the version the baselines were rendered by. syncpack already keeps client/ and web/ on one
  // version, so reading web/'s is enough.
  const floor = packageJson('web/package.json').devDependencies['@playwright/test'].replace(
    /^\D*/,
    '',
  );
  // Anchored and exhaustive, the same treatment ci.yml gets elsewhere in this file: a bare
  // `.includes()` stays green when the real assignment drifts and the expected pin survives only in
  // a comment or a second, stale IMAGE line.
  const helper = readFileSync(
    fileURLToPath(new URL('../tooling/docker-playwright.sh', import.meta.url)),
    'utf8',
  );
  // One LITERAL pattern per home, each capturing the version and the digest — rather than a
  // pattern built by interpolating the version in. Two reasons, and the first is not style: a
  // RegExp assembled from a variable is what this repo's own static-analysis gate rejects
  // (detect-non-literal-regexp, blocking in the sast pre-commit hook), so the interpolated form
  // cannot be committed here at all. The second is that a literal is simply stronger. A pin left
  // on the WRONG version still MATCHES, so the version assertion below names it — where an
  // interpolated pattern would fail to match at all and the count assertion would report a
  // baffling "found 0 in …" for a line that is plainly right there.
  //
  // The DIGEST is required, not just the tag: a tag can be re-pushed, and this container runs with
  // the repo checked out and the working tree bind-mounted read-write. Each pattern is anchored to
  // its home's real assignment shape (`IMAGE=` / a `container:` key), never "appears somewhere in
  // the file", so a value surviving only in a comment does not count.
  const HELPER_PIN =
    /^IMAGE=mcr\.microsoft\.com\/playwright:v([\d.]+)-noble@(sha256:[0-9a-f]{64})$/gm;
  const WORKFLOW_PIN =
    /^\s+container: mcr\.microsoft\.com\/playwright:v([\d.]+)-noble@(sha256:[0-9a-f]{64})$/gm;
  const pinsIn = (text, pattern) =>
    [...text.matchAll(pattern)].map(([, version, digest]) => ({ version, digest }));
  const homes = [
    ['tooling/docker-playwright.sh', pinsIn(helper, HELPER_PIN)],
    ['ci.yml', pinsIn(workflow('ci.yml'), WORKFLOW_PIN)],
  ];
  const pins = homes.flatMap(([, found]) => found);
  assert.equal(
    pins.length,
    EXPECTED_PLAYWRIGHT_PINS,
    `all ${EXPECTED_PLAYWRIGHT_PINS} Playwright pins must read …-noble@sha256:<64 hex> — found ` +
      homes.map(([name, found]) => `${found.length} in ${name}`).join(', '),
  );
  // The pinned version must be the installed floor, or the baselines were rendered by a renderer
  // nothing in the repo still installs.
  assert.deepEqual(
    [...new Set(pins.map((pin) => pin.version))],
    [floor],
    `the Playwright pins must name v${floor}, the installed @playwright/test floor`,
  );
  // Shape alone is NOT enough — measured: with the helper on one digest and a workflow line on
  // another, every shape-only pattern still matched, which is exactly the partial-bump hole this
  // test exists to close. Require ONE value across every home.
  const digests = [...new Set(pins.map((pin) => pin.digest))];
  assert.equal(digests.length, 1, `the Playwright pins disagree: ${digests.join(' vs ')}`);
  // Anchored past the flags on purpose, the same idiom the ci.yml assertions use: the comment in
  // the helper now states the lifecycle-script reason, so a bare
  // /pnpm install --frozen-lockfile --ignore-scripts/ would match that COMMENT and stay green over
  // a real command that had lost the flags — measured. No comment carries the `&& pnpm --filter`
  // continuation.
  assert.match(
    helper,
    /pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter/,
    'the helper must install from the lockfile with lifecycle scripts off',
  );
});
