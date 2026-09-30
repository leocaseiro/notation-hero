// tooling/workflow-guards.test.mjs — node --test suite asserting both privileged workflows keep the
// in-repo master-ref guard (NH-79 review). The deploy + seed workflows run with the owner/DDL Neon
// url; the GitHub `production` environment branch policy is the primary gate, but the in-repo
// `github.ref == 'refs/heads/master'` if-guard is the defence-in-depth layer the PR documents. This
// test pins it in source (mirrors infra/index.test.ts pinning the Function URL to AWS_IAM) so a
// future edit cannot silently drop the guard.
//
// It has since grown to pin every CI arrangement whose loss would be SILENT rather than loud: the
// browser lanes' run lines and container pins, the error-code gate's job placement, and the web VR
// lane's ability to compare a pixel at all.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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

// Counting filenames is not enough. A file can be present and still compare NOTHING: empty, all
// test.skip, or carrying no toHaveScreenshot at all. Playwright's `forbidOnly` catches `.only`;
// nothing else in this repo catches `.skip` or `.fixme`. And the shot files' own content is not
// enough either — the `chromium` project is what makes them RUN, so deleting it or mistyping its
// testMatch leaves an unscoped run exiting 0 with every filename still in place.
//
// Each project is sliced by its own `name:` line, which is why both are written multi-line in
// web/playwright.e2e.config.ts. Literal patterns rather than ones built from a project name: a
// RegExp assembled from a variable is rejected by this repo's sast gate, and there are only two.
const E2E_NAME_LINE = /^\s+name: 'e2e',$/m;
const CHROMIUM_NAME_LINE = /^\s+name: 'chromium',$/m;
const PROJECT_ENTRY_END = /^\s+\},$/m;

test('the web VR project has at least one shot to run', () => {
  const dir = new URL('../web/e2e/', import.meta.url);
  const shots = readdirSync(dir).filter((file) => file.endsWith('.vr.ts'));
  assert.ok(shots.length > 0, 'web/e2e has no *.vr.ts — the chromium project runs nothing');

  // Comments stripped before ANY content match below. A commented-out shot is still a parked shot:
  // a `//`-prefixed or block-commented toHaveScreenshot call still yields a name, still pairs with
  // its leftover baseline, and leaves the gate green over nine shots. test.skip and test.fixme —
  // the only disable routes checked below — are absent in that state. It also closes a live hole in
  // the surface anchors: `var(--elevate)` occurs in the engine-error comment as well as in the
  // ghost hover's real probe, so without this the anchor matches the comment after the probe is
  // deleted. A stripper, not a parser: it would mangle a `*/` or a line-leading `//` inside a string
  // or a regex literal. There is none in that file, and the assertion below would go red, not
  // green, if one ever appeared.
  const stripComments = (source) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const sources = shots.map((file) => stripComments(readFileSync(new URL(file, dir), 'utf8')));
  shots.forEach((file, index) => {
    // `describe\.` is allowed deliberately: the narrow-viewport shot needs a test.describe()
    // wrapper for its test.use(), so `test.describe.skip(` is the natural way to park it and a
    // pattern anchored straight to `test\.` would miss it. The trailing `\(` stays — without it the
    // assertion matches any prose occurrence or a snapshot filename.
    assert.doesNotMatch(
      sources[index],
      /\btest\.(?:describe\.)?(?:skip|fixme)\s*\(/,
      `${file} disables a shot`,
    );
    // Per-file, not `some(...)`: the rule is that EVERY *.vr.ts calls it, and a screenshot
    // comparison is even less likely than a behaviour assertion to notice a throw.
    assert.match(
      sources[index],
      /failOnUnexpectedPageErrors\(\)/,
      `${file} does not call failOnUnexpectedPageErrors() — a shot over a throwing page reads green`,
    );
  });
  // Not `some(includes('toHaveScreenshot('))`: that passes while ONE call survives anywhere, and it
  // pairs no shot with its baseline — deleting a shot and leaving its baseline on disk exits 0 with
  // no orphan warning, so a nine-shot lane reads exactly like a ten-shot one. Planting a baseline
  // for a shot that never existed exits 0 too. Set equality closes a dropped shot, a dropped
  // baseline AND a rename in one assertion. The `\.png` in the pattern is load-bearing: without it
  // the match runs past the closing quote into the next string.
  const shotNames = new Set(
    sources.flatMap((source) =>
      [...source.matchAll(/toHaveScreenshot\('([^']+\.png)'/g)].map((match) =>
        match[1].slice(0, -4),
      ),
    ),
  );
  assert.ok(
    shotNames.size > 0,
    'no *.vr.ts calls toHaveScreenshot — the chromium project compares nothing',
  );
  const baselineNames = new Set(
    readdirSync(new URL('../web/e2e/pages.vr.ts-snapshots/', import.meta.url))
      .filter((file) => file.endsWith('-chromium-linux.png'))
      .map((file) => file.slice(0, -'-chromium-linux.png'.length)),
  );
  assert.deepEqual(
    [...shotNames].sort(),
    [...baselineNames].sort(),
    'the shots and the committed -chromium-linux baselines no longer pair up — a shot, a baseline or a name was dropped',
  );

  // Three shots carry four assertions over a surface step the comparator cannot see (scoring 5, 20,
  // 80 and 173 against its 1408.6 per-pixel cutoff), so each reads a computed background-color
  // instead. Drop one and that shot silently stops covering what it was added for, with the
  // screenshot still green. This is a presence check, not a proof the assertion is correct — it
  // cannot be, without a browser.
  //
  // One anchor per assertion, each tied to the ASSERTION's own shape rather than to a bare test id
  // — three of the four ids also occur for unrelated reasons, so an id substring stays green on a
  // deleted assertion. The `(page, '…')` form is deliberately helper-name-agnostic, so renaming the
  // helper does not silently disarm this. Adding a FIFTH assertion is governed too, not just
  // dropping one of today's four: the count assertion is what makes forgetting impossible. Score
  // the step first — above the 1408.6 cutoff the picture already covers it and the assertion is
  // noise; under it, the assertion earns its place AND its anchor.
  const surfaceAnchors = [
    ['the rail surface', /\(page, 'player-rail'\)/],
    ['the transport-footer surface', /\(page, 'transport-row'\)/],
    ['the ghost hover step', /var\(--elevate\)/],
    ['the engine-error tint', /var\(--destructive\)/],
  ];
  // Both call shapes matched without naming the helper, the same reason the anchors are not.
  const surfaceAssertions = sources.flatMap((source) => [
    ...source.matchAll(/\(page, '[^']+'\)/g),
    ...source.matchAll(/probe\.style\.backgroundColor = '[^']+'/g),
  ]);
  assert.equal(
    surfaceAssertions.length,
    surfaceAnchors.length,
    `web/e2e carries ${surfaceAssertions.length} surface assertions but the guard anchors ${surfaceAnchors.length} — every surface assertion needs its own anchor, or dropping it later reads green`,
  );
  for (const [step, pattern] of surfaceAnchors) {
    assert.ok(
      sources.some((source) => pattern.test(source)),
      `no *.vr.ts asserts ${step} — a surface assertion the comparator cannot replace is gone`,
    );
  }
  assert.ok(
    sources.some((source) => source.includes('backgroundColor')),
    'no *.vr.ts reads a computed background-color — the surface assertions are gone',
  );

  const config = readFileSync(
    fileURLToPath(new URL('../web/playwright.e2e.config.ts', import.meta.url)),
    'utf8',
  );
  // Sliced to each project entry and anchored to real lines, the same treatment ci.yml gets: the
  // unanchored form stays green over a config whose testMatch line is commented out and replaced,
  // over a renamed project whose old name survives in a comment, and over a config where the two
  // projects' patterns have been SWAPPED (each project's own entry bounds its slice, so a pattern
  // landing in the other one is outside it).
  const projectEntry = (nameLine) => config.split(nameLine)[1]?.split(PROJECT_ENTRY_END)[0] ?? '';

  const chromium = projectEntry(CHROMIUM_NAME_LINE);
  assert.ok(chromium, 'the chromium project is gone — the shots never run');
  assert.match(
    chromium,
    /^\s+testMatch: '\*\*\/\*\.vr\.ts',$/m,
    'chromium no longer matches *.vr.ts',
  );
  // The OTHER project needs the same two: nothing in CI runs `--project=e2e` once the web job owns
  // this lane, so a deleted `e2e` project — or a mistyped testMatch — leaves the unscoped run
  // exiting 0 over the shots alone, with every behaviour and axe test silently gone.
  const e2e = projectEntry(E2E_NAME_LINE);
  assert.ok(e2e, "the e2e project is gone — web's behaviour and axe tests never run");
  assert.match(e2e, /^\s+testMatch: '\*\*\/\*\.e2e\.ts',$/m, 'e2e no longer matches *.e2e.ts');
});
