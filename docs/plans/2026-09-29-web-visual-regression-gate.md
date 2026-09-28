# Visual-regression gate for `web/` — implementation plan (NH-320)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/` and `/play` nine merge-blocking pixel screenshots, rendered by the real
`next build`, so a component that is correct in Storybook but broken in the app cannot ship.

**Architecture:** `web/playwright.e2e.config.ts` grows a `projects` array splitting the existing
behaviour lane (`e2e`) from a new pixel lane (`chromium`), both sharing the one `webServer` so a
single `next build` serves both. The nine shots live in `web/e2e/pages.vr.ts`; the navigation that
reaches each state moves into `web/e2e/player-states.ts`, shared with the accessibility lane.
`web/`'s whole browser lane then moves out of the ubuntu `e2e` job into a new Playwright-container
`web` job that runs `playwright test` unscoped, exactly once.

**Tech Stack:** Playwright 1.61.1 (`@playwright/test`), `mcr.microsoft.com/playwright:v1.61.1-noble`,
Next.js 16 App Router, pnpm workspaces, GitHub Actions, `node --test` for the tooling guards.

**Spec:** [`docs/specs/2026-09-21-web-visual-regression-gate.md`](../specs/2026-09-21-web-visual-regression-gate.md)

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **Image tag:** `mcr.microsoft.com/playwright:v1.61.1-noble`, pinned in lockstep with
  `@playwright/test` (v1.61.1 today). Baselines are regenerated on the bump.
- **Baselines are Linux-only.** `*-chromium-linux.png` is committed; `*-chromium-darwin.png` is
  git-ignored. Never generate baselines natively on a Mac.
- **Nine shots.** Every shot is a file that moves whenever `client/` changes or AlphaTab is upgraded.
  A tenth must justify itself; if its stated coverage **is** a surface step, score that step against
  the `1408.6` per-pixel cutoff before writing it.
- **No comparison options at all.** No `threshold`, no `maxDiffPixels` — one comparison policy in the
  repo, exactly as `client/` does it. (`fullPage` is a capture option, not a comparison option.)
- **Page-level shots only.** No `toHaveScreenshot` on a clipped element, and no mask over the
  notation: the score is shot as it is drawn.
- **Light only.** Dark mode is unreachable in `web/` (`@custom-variant dark (&:is(.dark *))`;
  `web/app/layout.tsx` renders a bare `<html lang="en">`). Injecting `.dark` from a test is
  test-only instrumentation of exactly the kind this project bans.
- **The pixel project must be named `chromium`**, so baselines read `*-chromium-linux.png` — the same
  shape as `client/`'s.
- **The pixel project pins `viewport: { width: 1280, height: 900 }` explicitly**, not inherited from
  `devices['Desktop Chrome']`, so a Playwright upgrade cannot silently invalidate every baseline.
- **The pixel project carries `timeout: 120_000`**, scoped to `chromium` only so the behaviour
  project keeps the budget it runs under today.
- **Every local invocation names its project.** CI runs `playwright test` **unscoped, exactly once**.
- **Every `*.vr.ts` calls `failOnUnexpectedPageErrors()` at module scope**, next to its imports.
- **Artifact names:** `playwright-client-vr-report`, `playwright-client-e2e-report`,
  `playwright-web-report`.
- **Never pass `git commit --no-verify` or `git push --no-verify`.** Default branch is `master`.
- **Tests are co-located**; never create `__tests__/`, `__mocks__/` or `stories/` directories.
- **`leocaseiro/notation-hero` is a public repository.** No personal or medical detail in any
  committed file.
- **Run `pnpm run test:tooling` by hand before every push.** The pre-push hook runs
  `pnpm -r --if-present run test`, which pnpm scopes to the 5 workspace projects and never reaches
  the root script. Green push, red CI.
- **Write the PR body before every push.** `gh pr edit` mid-run cancels the run and the stale red
  `CI Green` never clears.

### Line numbers in the spec are stale — grep, do not trust them

The spec says its citations were re-taken on 2026-09-29. They have already drifted again, measured
against this branch's `master`:

| Spec says                                       | Actually on `master`                   |
| ----------------------------------------------- | -------------------------------------- |
| `PlayerShell.tsx:1033` (rail)                   | `web/app/play/PlayerShell.tsx:1104`    |
| `PlayerShell.tsx:959` (header `z-10`)           | `web/app/play/PlayerShell.tsx:1030`    |
| `TransportRow.tsx:102` (footer)                 | `web/app/play/TransportRow.tsx:118`    |
| `OpenFileControl.tsx:126`                       | `web/app/play/OpenFileControl.tsx:125` |
| `player.e2e.ts:729/781/812` (`test.setTimeout`) | `:845/:897/:928`                       |
| `player.e2e.ts:1183` (open-tooltip locator)     | `:1321`                                |
| `player.e2e.ts:289` (`fileDrag`)                | `:334`                                 |
| `player.e2e.ts:890` (`selectBars`)              | `:1006`                                |
| `a11y.e2e.ts:111-113` (stale-figures comment)   | `:265-268`                             |
| `a11y.e2e.ts:224-243` (`settleToasts`)          | `:224-245` (this one holds)            |

`tooling/workflow-guards.test.mjs`'s numbers (`:40`, `:44`, `:47`, `:48`, `:51`, `:65-73`) **do**
match. Find every other target by content, not by line.

### Four Playwright behaviours this plan rests on — measured on 1.61.1, in this worktree

Re-run any of these if a step surprises you; each was probed with a throwaway config.

1. **A project-level `testMatch` REPLACES the top-level one.** A config with top-level
   `testMatch: '**/*.e2e.ts'` plus a `chromium` project matching `'**/*.vr.ts'` still lists the
   `.vr.ts` file. So the top-level pattern does not exclude the shots — it just reads as if it does,
   which is why Task 1 removes it.
2. **An unscoped run with an empty `chromium` project exits 0.** Deleting every `*.vr.ts` left
   `1 passed` and **exit 0** — a merge-blocking gate reading green over zero pixels. Scoped
   (`--project=chromium`) it is `Error: No tests found`, **exit 1**. This is the whole reason Task 8
   exists.
3. **`test.use({ viewport })` inside a titled, SYNC `test.describe()` scopes to that block only.**
   The sibling test in the same file kept the project's 1280×900.
4. **A per-project `timeout` is honoured over the config-wide default.** A config with
   `timeout: 1` and `timeout: 120_000` on the `chromium` project ran both shots green; without the
   per-project value they would have failed at 1 ms.

## Review Focus

Five failure modes the spec implies that no shot's own assertions would catch. Each has a test in
the task named beside it — they are the reason those tests exist.

- **A shot file present but every shot disabled, or the `chromium` project deleted / its
  `testMatch` mistyped.** Counting filenames is not enough: an empty file, `test.describe.skip(`,
  or no `toHaveScreenshot` at all leaves an unscoped CI run at exit 0 with every filename in place.
  → Task 8.
- **Two `playwright test` invocations in the `web` job.** Playwright registers the `webServer` per
  invocation and tears it down when that invocation ends, so a second scoped step runs a second
  `next build` and the only reason for this job evaporates. Nothing today pins "exactly one".
  → Task 9.
- **One of the four surface assertions dropped.** The bundled-beat rail (`20`), its transport footer
  (`5`), the ghost-hover step (`80`) and the engine-error tint (`173`) all score under the `1408.6`
  per-pixel cutoff, so their pictures prove the state rendered but not that the surface is right.
  Drop one and that shot silently stops covering the thing it was added for, screenshot still green.
  → Task 8.
- **The container tag drifting from `@playwright/test`** across its three homes after this lands
  (`tooling/docker-playwright.sh`, the `vr` job, the `web` job). Baselines then compare under a
  renderer they were not made with, and the failure looks like a real visual regression. → Task 3.
- **`web/package.json`'s `test:e2e` losing `--project=e2e`.** Both lanes live in one config, so an
  unscoped local run executes the pixel lane against Linux baselines on a Mac: red for the wrong
  reason, plus stray `*-chromium-darwin.png` files. `client/` is immune structurally, not by
  discipline — its unscoped scripts point at a second config that declares no `projects` array.
  → Task 1.

---

## File Structure

**New:**

| File                             | Responsibility                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/e2e/player-states.ts`       | One exported function per state: the `goto`, clicks and file-picks that _reach_ it. No settling waits — the lanes disagree about those. Imported by both browser lanes. |
| `web/e2e/pages.vr.ts`            | All nine shots, plus the two readiness helpers and the surface-assertion helper they share.                                                                             |
| `web/e2e/pages.vr.ts-snapshots/` | The nine committed `*-chromium-linux.png` baselines (Playwright's default snapshot directory).                                                                          |
| `tooling/docker-playwright.sh`   | One shared container invocation, taking a pnpm filter and a script name.                                                                                                |

**Modified:** `web/playwright.e2e.config.ts` · `web/package.json` · `web/.gitignore` ·
`web/e2e/a11y.e2e.ts` · `web/app/play/PlayerShell.tsx` · `web/app/play/TransportRow.tsx` ·
`package.json` (root) · `tooling/workflow-guards.test.mjs` · `.github/workflows/ci.yml` ·
`AGENTS.md` · `docs/runbooks/vr-a11y-testing.md` · `client/README.md` ·
`docs/specs/2026-06-26-nh-197-e2e-traces.md` ·
`docs/specs/2026-07-08-vr-report-gh-pages-on-failure.md` ·
`docs/specs/2026-09-21-web-visual-regression-gate.md` (its Status line) ·
`docs/decisions/decision-changelog.md`.

**One file sits outside the spec's stated footprint, and it is this plan's only addition:** nothing.
Every file above appears in the spec's "Process changes this carries" list except
`web/e2e/pages.vr.ts`, which is the spec's `web/e2e/*.vr.ts` entry realised as a single file (see
Task 4, step 1 for why one file rather than three).

### Why all nine shots in one file

The spec writes `web/e2e/*.vr.ts` and leaves the split open. One file, because: the nine shots
change together (all of them move when `client/` changes or AlphaTab is upgraded), they share three
helpers, and the spec's documented parallelism fallback — `fullyParallel: false` — serialises shots
only **within each file**, so splitting them would make that remedy partly ineffective before it is
ever needed.

---

## Task 1: Split the config into two projects, and scope every local invocation

**Files:**

- Modify: `web/playwright.e2e.config.ts` (the whole `defineConfig` body plus its header comment)
- Modify: `web/package.json` (the `scripts` block)
- Modify: `web/.gitignore` (append)
- Modify: `tooling/workflow-guards.test.mjs` (add one test)

**Interfaces:**

- Consumes: nothing.
- Produces: a Playwright project named `e2e` matching `**/*.e2e.ts`, and one named `chromium`
  matching `**/*.vr.ts` at 1280×900 with a 120 s per-test budget. Package scripts
  `test:e2e`, `test:e2e:ui`, `test:vr`, `test:vr:update`, all carrying `--project=…`.

- [ ] **Step 1: Rewrite the config's `projects` split**

Replace the top-level `testMatch` with a per-project one — measured, a project-level `testMatch`
replaces the top-level value rather than intersecting with it, so leaving
`testMatch: '**/*.e2e.ts'` at the top would read as if it excluded the shots while not doing so.

In `web/playwright.e2e.config.ts`, change the header comment and the `testMatch`/`projects` region:

```ts
import { defineConfig, devices } from '@playwright/test';

// The `web` browser lane: behaviour + accessibility (`*.e2e.ts`) and visual regression
// (`*.vr.ts`), as two projects over ONE webServer — so one `next build` serves both and web's axe
// and web's VR render identically. It mirrors client/playwright.e2e.config.ts, but serves a
// Next.js production build (`next build` then `next start`) rather than `vite preview`.
// web/ has no Storybook, which is why the pixel lane shoots the composed PAGE here rather than
// stories: a component can be correct in Storybook and broken in the app, because web/ compiles
// its own Tailwind CSS by scanning client/ SOURCE (the @source globs in web/app/globals.css).
export default defineConfig({
  testDir: './e2e',
  // No top-level `testMatch`: each project declares its own, and a project-level pattern REPLACES
  // the top-level one rather than intersecting with it (measured on 1.61.1). A top-level
  // '**/*.e2e.ts' left here would read as if it excluded the shots while not actually doing so.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'e2e', testMatch: '**/*.e2e.ts', use: { ...devices['Desktop Chrome'] } },
    // Named `chromium` so baselines read `*-chromium-linux.png`, the same shape as client/'s.
    {
      name: 'chromium',
      testMatch: '**/*.vr.ts',
      // Readiness alone can spend 100 s (30 + 60 + 10) before a pixel is compared, and the
      // config-wide default is Playwright's 30 s — measured: toBeVisible({ timeout: 60_000 })
      // under a config with no `timeout` fails at exactly 30.0 s while the call log still reports
      // a 60 000 ms expect ceiling. Same number web/e2e/player.e2e.ts already sets per test.
      // Scoped to this project so the behaviour lane keeps the budget it runs under today.
      timeout: 120_000,
      // Pinned explicitly rather than inherited from the device definition, so a Playwright
      // upgrade that adjusts `Desktop Chrome` cannot silently invalidate every baseline.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  reporter: [['html'], ['list']],
  webServer: {
    // A different port from client/'s 4173 so both lanes can run side by side.
    command: 'pnpm build && pnpm start --port 4174',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    // Covers a cold vendor step + Babel-based React Compiler build on a CI runner.
    timeout: 300_000,
    env: {
      // NEXT_PUBLIC_* is inlined at BUILD time, which is why the command above runs `pnpm build`
      // under this env rather than only `pnpm start`. Debug prints the visitor's user agent,
      // window size and screen size, so it is never the shipped default — only this lane's build.
      NEXT_PUBLIC_ALPHATAB_LOG_LEVEL: 'Debug',
    },
  },
});
```

- [ ] **Step 2: Scope every script in `web/package.json`**

`web/` puts both lanes in ONE config, so it gets neither of `client/`'s protections for free.
Replace the two `test:e2e*` lines with four (keep them alphabetically sorted — `sort-package-json`
is a lint gate):

```diff
-    "test:e2e": "playwright test --config=playwright.e2e.config.ts",
-    "test:e2e:ui": "playwright test --config=playwright.e2e.config.ts --ui",
+    "test:e2e": "playwright test --config=playwright.e2e.config.ts --project=e2e",
+    "test:e2e:ui": "playwright test --config=playwright.e2e.config.ts --project=e2e --ui",
+    "test:vr": "playwright test --config=playwright.e2e.config.ts --project=chromium",
+    "test:vr:update": "playwright test --config=playwright.e2e.config.ts --project=chromium --update-snapshots",
```

These scoped scripts are for **local** use. CI runs `playwright test` unscoped, once, so both
projects share the single `webServer` — Task 9.

- [ ] **Step 3: Add the darwin-baseline ignore**

Append to `web/.gitignore`, matching the line `client/.gitignore` already carries:

```gitignore

# VR baselines are Linux-only. A local `test:vr:update` on a Mac writes darwin shots
# for quick local iteration — they must never be committed (regenerate via test:web:docker).
*-chromium-darwin.png
```

- [ ] **Step 4: Write the failing guard for the scoped scripts**

Append to `tooling/workflow-guards.test.mjs`. It needs `web/package.json`, so add the import of
`readFileSync` — already imported there — and a small reader:

```js
/** @returns {{ scripts: Record<string, string>, devDependencies: Record<string, string> }} */
function packageJson(relativePath) {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8'),
  );
}

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
```

- [ ] **Step 5: Run the guard to verify it fails before the scripts are scoped**

Temporarily revert one script to the unscoped form, then run:

```bash
node --test tooling/workflow-guards.test.mjs
```

Expected: FAIL naming `test:e2e`. Restore the `--project=e2e` and re-run — expected PASS.

- [ ] **Step 6: Verify the behaviour lane is unchanged and the pixel lane is empty**

```bash
pnpm --filter @notation-hero/web run test:e2e
```

Expected: the same ~91 tests pass, every line prefixed `[e2e]`.

```bash
pnpm --filter @notation-hero/web run test:vr
```

Expected: `Error: No tests found`, **exit 1** — measured, and correct: no `*.vr.ts` exists yet. It
becomes green in Task 4. Note that an **unscoped** run would exit **0** here; that gap is what
Task 8 closes.

- [ ] **Step 7: Run the repo's own gates and commit**

```bash
pnpm run fix && pnpm --filter @notation-hero/web run typecheck && pnpm run lint:sort-pkg && pnpm run test:tooling
```

```bash
git add web/playwright.e2e.config.ts web/package.json web/.gitignore tooling/workflow-guards.test.mjs
git commit -m "test(web): split the browser lane into an e2e and a chromium project (NH-320)"
```

---

## Task 2: Share the navigation between the two browser lanes

The six states the accessibility lane already reaches move into one module. **Only the navigation
moves** — each lane keeps its own readiness waits, because the two lanes genuinely disagree about
them: the pixel lane needs the Skeleton's stalled module to never resume while the accessibility
lane resumes after 5 000 ms, and the long-score state needs the toast **painted** for axe but
**gone** for a screenshot.

This edits a lane that passes today, which is the reason to think about it. The alternative costs
more: two copies of six navigations drift the moment someone renames a test id, and the lane that
drifts is the pixel one — whose failure mode is the dangerous one, a red VR run whose quickest route
to green is regenerating the baselines, which blesses a page nobody looked at.

**Files:**

- Create: `web/e2e/player-states.ts`
- Modify: `web/e2e/a11y.e2e.ts` (every `page.goto` / `setInputFiles` / `page.route` call site, plus
  the stale-figures comment above the scrolling-score case)

**Interfaces:**

- Consumes: Task 1's `e2e` project (this file's tests run there).
- Produces, all `(page: Page) => Promise<void>` unless noted:
  `gotoLanding`, `gotoPlayer`, `openLongScore`, `abortEngine`, `pressEveryTransportToggle`, and
  `stallEngine(page: Page, stallMs: number): Promise<void>`.

- [ ] **Step 1: Write the module**

Create `web/e2e/player-states.ts`:

```ts
import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

// The navigation that REACHES each state the two web/ browser lanes share — the goto, the clicks
// and the file-picks, and nothing else. Readiness and settling waits deliberately stay in each
// lane: the accessibility lane and the pixel lane genuinely disagree about them (the pixel lane
// needs the stalled engine to never resume, and needs the load toast GONE where axe needs it
// PAINTED). A shared module is what makes a test-id rename land once instead of twice, and the
// lane that would otherwise drift is the pixel one — whose failure mode is a red VR run whose
// quickest route to green is regenerating the baselines.

/** The vendored engine module both deliberately-broken states intercept. */
const ENGINE_MODULE = '**/alphatab/esm/alphaTab.mjs';

export async function gotoLanding(page: Page): Promise<void> {
  await page.goto('/');
}

export async function gotoPlayer(page: Page): Promise<void> {
  await page.goto('/play');
}

/** `/play`, then Punk.gp picked through the file input — two drum tracks, long enough to scroll. */
export async function openLongScore(page: Page): Promise<void> {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
}

/**
 * Stall the engine module so the first-visit Skeleton stays up.
 *
 * `stallMs` is the lanes' one genuine disagreement about this state. The accessibility lane resumes
 * after 5 000 ms — one axe sweep is all it needs. A screenshot needs the state to hold across
 * `toHaveScreenshot`'s two consecutive samples, and on a baseline-generation run across the write
 * as well, so the pixel lane passes `Infinity` and the request never resumes.
 *
 * The branch is not cosmetic: `setTimeout(fn, Infinity)` coerces the delay to 0 and fires
 * IMMEDIATELY, so a single setTimeout path would resume the engine at once and the Skeleton would
 * vanish before the first sample.
 */
export async function stallEngine(page: Page, stallMs: number): Promise<void> {
  await page.route(ENGINE_MODULE, async (route) => {
    // Returning WITHOUT continuing, fulfilling or aborting leaves the request pending for the life
    // of the test, which is exactly what holds the Skeleton up.
    if (stallMs === Infinity) return;
    await new Promise((resolve) => setTimeout(resolve, stallMs));
    await route.continue();
  });
  await page.goto('/play');
}

/** Abort the engine module, so the destructive error panel is up and permanent. */
export async function abortEngine(page: Page): Promise<void> {
  await page.route(ENGINE_MODULE, (route) => route.abort());
  await page.goto('/play');
}

/**
 * Loop, metronome and count-in pressed, and the tempo nudged up one step.
 *
 * The `toBeEnabled` wait is part of REACHING this state, not of settling it: the clicks cannot
 * happen before the engine and the soundfont are up. Each lane still adds its own settling waits
 * after — the accessibility lane waits for the tempo percentage's fade, and so does the shot.
 */
export async function pressEveryTransportToggle(page: Page): Promise<void> {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('toggle-loop').click();
  await page.getByTestId('toggle-metronome').click();
  await page.getByTestId('toggle-countin').click();
  await page.getByRole('button', { name: 'Increase tempo' }).click();
}
```

- [ ] **Step 2: Point `a11y.e2e.ts` at it, changing no assertion**

Add the import beside the existing ones:

```ts
import {
  abortEngine,
  gotoLanding,
  gotoPlayer,
  openLongScore,
  pressEveryTransportToggle,
  stallEngine,
} from './player-states';
```

Then replace each navigation. Nine call sites — find them by content:

| Test                           | Replace                                                           | With                                     |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------- |
| landing page                   | `await page.goto('/');`                                           | `await gotoLanding(page);`               |
| the score it opens with        | `await page.goto('/play');`                                       | `await gotoPlayer(page);`                |
| long enough to scroll          | the `goto` + `setInputFiles('e2e/fixtures/Punk.gp')` pair         | `await openLongScore(page);`             |
| first-visit Skeleton           | the `page.route(...)` block + the `goto`                          | `await stallEngine(page, 5000);`         |
| engine fails to load           | the `page.route(..., route.abort())` + the `goto`                 | `await abortEngine(page);`               |
| every transport toggle pressed | the `goto`, the `toBeEnabled` wait and the four clicks            | `await pressEveryTransportToggle(page);` |
| narrow 700px window            | `await page.goto('/play');` (keep the `setViewportSize` above it) | `await gotoPlayer(page);`                |
| Settings popover open          | `await page.goto('/play');`                                       | `await gotoPlayer(page);`                |
| Tracks popover open            | the `goto` + `setInputFiles('e2e/fixtures/Punk.gp')` pair         | `await openLongScore(page);`             |

Three notes:

- The narrow-700 case keeps its own `page.setViewportSize({ width: 700, height: 800 })` before the
  `goto`. Sizing is a lane concern — the pixel lane does it with `test.use` — so only the `goto`
  moves. No single-use `gotoPlayerAtWidth` export.
- The two popover cases keep their trigger clicks, accordion expansion and solo/mute presses in
  `a11y.e2e.ts`. Those reach states with no counterpart in this gate (the popover shots are
  deferred), so extracting them now would be speculative. They move when those shots land.
- The transport case keeps its tempo-percentage opacity poll — that is a settling wait.

- [ ] **Step 3: Fix the stale figures in the scrolling-score comment**

The comment above the `long enough to scroll` case states three measurements that no longer hold.
Measure them rather than copying the spec's numbers, by adding a temporary print inside that test:

```ts
console.log(
  await surface.evaluate((el) => ({
    box: el.clientHeight,
    score: el.scrollHeight,
  })),
);
```

Run the one case, read the values for both the bundled beat and `Punk.gp`, then delete the print and
rewrite the comment with what you measured. The spec's expected values are 576 px (the sample),
852 px (`Punk.gp`) and 576 px (the box) — if yours differ, yours are right; the conclusion the
comment draws is unaffected either way:

```ts
// The sample renders <N> px tall and never scrolls; Punk.gp's two drum tracks render <N> px at this
// lane's width, so the <N> px notation box scrolls. Without this case axe's
// scrollable-region-focusable rule never meets a scrolling surface, and dropping the host's
// tabIndex would pass the gate.
```

- [ ] **Step 4: Run the accessibility lane and verify it is unchanged**

```bash
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e a11y.e2e.ts
```

Expected: all 9 cases PASS, same as before the refactor.

- [ ] **Step 5: Run the whole behaviour lane, then commit**

```bash
pnpm run fix && pnpm --filter @notation-hero/web run typecheck && pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run test:e2e
```

```bash
git add web/e2e/player-states.ts web/e2e/a11y.e2e.ts
git commit -m "test(web): share the player-state navigation between both browser lanes (NH-320)"
```

---

## Task 3: One shared container invocation, and a guard on its image tag

Inlining a fifth copy of the `docker run` command is where it stops paying: the two existing scripts
measure 395 and 402 characters, the new pair lands near 450, and they already differ in two volumes —
drift before a line is written.

**Files:**

- Create: `tooling/docker-playwright.sh`
- Modify: `package.json` (root) — rewrite `test:vr:docker` and `test:vr:docker:update`, add
  `test:web:docker` and `test:web:docker:update`
- Modify: `tooling/workflow-guards.test.mjs` (add one test)

**Interfaces:**

- Consumes: `web/package.json`'s `test:vr` / `test:vr:update` from Task 1.
- Produces: `bash tooling/docker-playwright.sh <pnpm-filter> <script>`, and four root scripts.

- [ ] **Step 1: Write the helper**

Create `tooling/docker-playwright.sh`:

```bash
#!/usr/bin/env bash
#
# Run one package's Playwright script inside the pinned Playwright container, so pixel baselines
# render the way CI renders them. macOS and Linux rasterize fonts differently (subpixel vs
# grayscale antialiasing, different glyph metrics), so the committed `-linux` set is the only
# source of truth and must never be regenerated natively on a Mac.
#
# Usage:
#   bash tooling/docker-playwright.sh @notation-hero/client test:vr
#   bash tooling/docker-playwright.sh @notation-hero/web    test:vr:update
#
# One helper for both packages rather than four inlined `docker run` lines: the inlined form had
# already reached ~400 characters each, and the two new ones need two extra volumes, which is drift
# before a line is written. Shadowing web/'s build output during a client/ run is harmless, so both
# packages share the full volume list.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: bash tooling/docker-playwright.sh <pnpm-filter> <script>" >&2
  exit 2
fi

# Keep this tag in lockstep with @playwright/test AND with the `container:` lines of the `vr` and
# `web` CI jobs; regenerate baselines on the bump. tooling/workflow-guards.test.mjs asserts all
# three agree with the installed version, so a partial bump fails CI rather than silently comparing
# baselines under a renderer they were not made with.
IMAGE=mcr.microsoft.com/playwright:v1.61.1-noble

# The anonymous volumes shadow paths that must NOT be written back onto the host bind mount:
#   * every package's node_modules + the store — so the local darwin install is untouched
#   * web/.next            — `next build` inside the container would clobber the local dev build
#   * web/public/alphatab  — scripts/vendor-alphatab.mjs writes here on every build
# Both web/ paths are git-ignored, so nothing could reach a commit; this is about not wrecking the
# working tree. web/test-results/ and the *-snapshots/ folders are deliberately NOT shadowed —
# those are the results a developer needs to read afterwards.
#
# --ignore-scripts skips the lefthook `prepare` (its git call cannot resolve a worktree's .git
# inside the container). The image bakes the browsers in, so there is no `playwright install`.
docker run --rm \
  -v "$PWD":/work \
  -v /work/node_modules \
  -v /work/client/node_modules \
  -v /work/server/node_modules \
  -v /work/shared/node_modules \
  -v /work/infra/node_modules \
  -v /work/web/node_modules \
  -v /work/web/.next \
  -v /work/web/public/alphatab \
  -v /work/.pnpm-store \
  -w /work "$IMAGE" \
  bash -c 'corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter "$1" run "$2"' _ "$1" "$2"
```

The `bash -c '…' _ "$1" "$2"` form passes the filter and the script positionally into the container
shell instead of interpolating them into the command string — no quoting hazard, and shellcheck-clean.

- [ ] **Step 2: Point the root scripts at it**

In the root `package.json`, replace the two inlined `test:vr:docker*` values and add two more.
`sort-package-json` is a lint gate and it sorts these keys as strings, so `test:vr:*` lands before
`test:web:*` (`v` < `w`) — write them in that order, and let `pnpm run fix` place them if you get
it wrong:

```diff
-    "test:vr:docker": "docker run --rm -v \"$PWD\":/work -v /work/node_modules … pnpm --filter @notation-hero/client run test:vr\"",
-    "test:vr:docker:update": "docker run --rm … pnpm --filter @notation-hero/client run test:vr:update\"",
+    "test:vr:docker": "bash tooling/docker-playwright.sh @notation-hero/client test:vr",
+    "test:vr:docker:update": "bash tooling/docker-playwright.sh @notation-hero/client test:vr:update",
+    "test:web:docker": "bash tooling/docker-playwright.sh @notation-hero/web test:vr",
+    "test:web:docker:update": "bash tooling/docker-playwright.sh @notation-hero/web test:vr:update",
```

There is deliberately **no** docker wrapper for `web/`'s behaviour lane: it is not pixel-exact, so
it runs natively with `pnpm --filter @notation-hero/web run test:e2e` exactly as it does today. Only
baselines need the container.

- [ ] **Step 3: Write the failing image-tag guard**

Append to `tooling/workflow-guards.test.mjs` (it reuses `packageJson` from Task 1):

```js
// The container tag has three homes after NH-320: tooling/docker-playwright.sh and the `container:`
// lines of the `vr` and `web` CI jobs. A partial bump is invisible — baselines then compare under a
// renderer they were not made with, and the failure reads as a real visual regression. Anchor all
// three to the installed @playwright/test, so a bump is all-or-nothing.
test('the Playwright container tag agrees with @playwright/test everywhere it is pinned', () => {
  // The range is a caret (`^1.61.1`); its FLOOR is what the image tag must name, because that is
  // the version the baselines were rendered by. syncpack already keeps client/ and web/ on one
  // version, so reading web/'s is enough.
  const floor = packageJson('web/package.json').devDependencies['@playwright/test'].replace(
    /^\D*/,
    '',
  );
  const expected = `mcr.microsoft.com/playwright:v${floor}-noble`;

  assert.ok(
    readFileSync(
      fileURLToPath(new URL('../tooling/docker-playwright.sh', import.meta.url)),
      'utf8',
    ).includes(expected),
    `tooling/docker-playwright.sh must pin ${expected}`,
  );

  const pins = workflow('ci.yml').match(/^\s+container: mcr\.microsoft\.com\/playwright:\S+$/gm);
  assert.ok(pins, 'no Playwright container pin found in ci.yml — a pixel job lost its container');
  for (const pin of pins) {
    assert.equal(pin.trim(), `container: ${expected}`, `${pin.trim()} disagrees with ${expected}`);
  }
});
```

- [ ] **Step 4: Run it to verify it fails on a partial bump**

```bash
node --test tooling/workflow-guards.test.mjs
```

Expected: PASS (all three agree today). Now prove it bites — temporarily change `IMAGE` in the
helper to `…:v1.60.0-noble` and re-run. Expected: FAIL with
`tooling/docker-playwright.sh must pin mcr.microsoft.com/playwright:v1.61.1-noble`. Restore it.

- [ ] **Step 5: Verify the refactor is behaviour-preserving on `client/`'s existing baselines**

This is the real test of the helper: `client/` has 698 committed baselines that must still match.
Docker Desktop must be running first (`open -a Docker` on macOS).

```bash
pnpm test:vr:docker
```

Expected: the same PASS result as before the refactor. If it fails, compare the expanded command in
`docs/runbooks/vr-a11y-testing.md` against the helper — a dropped `-v` is the likely cause.

- [ ] **Step 6: Lint the shell and commit**

```bash
pnpm run lint:shell && pnpm run lint:sort-pkg && pnpm run test:tooling
```

```bash
git add tooling/docker-playwright.sh package.json tooling/workflow-guards.test.mjs
git commit -m "test: share one Playwright container invocation across client and web (NH-320)"
```

---

## Task 4: The first shot — the landing page — and the baseline workflow end to end

This task is deliberately one shot. It proves the whole chain works (project, snapshot path,
container baseline generation, commit) before eight more shots are written against it.

**Files:**

- Create: `web/e2e/pages.vr.ts`
- Create: `web/e2e/pages.vr.ts-snapshots/landing-chromium-linux.png` (generated, committed)

**Interfaces:**

- Consumes: Task 1's `chromium` project; Task 2's `gotoLanding`; Task 3's `test:web:docker*`.
- Produces: `settleBeforeShot(page: Page): Promise<void>` — the two waits every shot in this lane
  ends with, used by Tasks 5, 6 and 7.

- [ ] **Step 1: Write the file with the one shot**

Create `web/e2e/pages.vr.ts`:

```ts
import { expect, test } from '@playwright/test';

import { failOnUnexpectedPageErrors } from './page-errors';
import { gotoLanding } from './player-states';

import type { Page } from '@playwright/test';

// Pixel screenshots of the product's own screens, against the real `next build`. This is the gate
// client/ VR cannot be: web/ compiles its own Tailwind CSS by scanning client/ SOURCE (the @source
// globs in web/app/globals.css), so a component can be correct in Storybook and broken here — the
// seek rail that shipped 0 px wide was perfect in Storybook, because Storybook scans client/
// itself.
//
// Nine shots, and the count is deliberate: every shot is a file that moves whenever client/ changes
// or AlphaTab is upgraded. A tenth should have to justify itself.
//
// Page-level shots only, and no mask over the notation. Sixty runs in the pinned Playwright
// container at threshold:0 / maxDiffPixels:0 found AlphaTab's notation render byte-identical 19
// times out of 19; the only drift was the anti-aliased rounded corner of an element-CLIPPED shot.
// No comparison options are passed here at all — one policy in the repo, the same as client/'s.
//
// `animations: 'disabled'` and `caret: 'hide'` are toHaveScreenshot's own defaults, so neither is
// passed. Worth knowing what the first one does to the Skeleton's `animate-skeleton-pulse`:
// Playwright CANCELS an infinite animation to its first frame rather than fast-forwarding it (it
// fast-forwards only FINITE ones, and client/src/styles.css declares that keyframe `infinite`). It
// lands on the right pixels here either way — 0% and 100% of skeleton-pulse are the same colour —
// but the next infinite animation added to web/ may not be so forgiving.
//
// Every shot below also fails if the page threw an uncaught error while it ran. Required, not a
// nicety: a screenshot comparison is even less likely than a behaviour assertion to notice a throw,
// and one out of AlphaTab's worker went unnoticed for a whole merged PR (NH-335). The allowance
// there is scoped to the engine bundle's own frames, so the deliberately-broken Skeleton and
// engine-error states still pass.
//
// TWO THINGS TO KNOW BEFORE ADDING A TENTH SHOT.
//
// 1. The app version is a landmine for any shot that opens the wordmark's tooltip. NH-317 renders
//    NEXT_PUBLIC_APP_VERSION inside a CLOSED TooltipContent, so it is painted in none of these
//    nine. With VERCEL_ENV unset it is the constant `local`; with it set the string carries a build
//    timestamp and a commit hash, and a hovered-wordmark baseline would then break on every commit.
//    Such a shot must never run with VERCEL_ENV set.
// 2. A shot that reaches its state by OPENING A FILE needs the long-score shot's two extra waits —
//    the `data-file` marker and the toast's departure — or it bakes a toast bearing the filename
//    into its baseline. The Settings and Tracks popover shots are specified but deliberately
//    deferred; everything they need (including a `[data-slot="popover-content"]` visibility wait
//    after the trigger click) is written down under "Deferred — the two Plan C popover shots" in
//    docs/specs/2026-09-21-web-visual-regression-gate.md rather than left to be re-derived.
failOnUnexpectedPageErrors();

/**
 * The last two waits every shot in this lane ends with, whatever state it reached.
 *
 * `document.fonts.ready` matters because the music font loads late; the 500 ms is the settle that,
 * with `retries: 2` on CI, is what actually absorbs a one-off timing blip. Neither moves the
 * pointer, so a hover held by a shot above survives both.
 */
async function settleBeforeShot(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(500);
}

test('the landing page', async ({ page }) => {
  await gotoLanding(page);
  // The page renders a heading and a link — neither test id exists, so this is the same signal
  // web/e2e/a11y.e2e.ts settles this state on. No ceiling named: the bare expect default is ample
  // for a static route, and nothing breaks on a warm run.
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
  await settleBeforeShot(page);
  // Explicit snapshot names throughout, so a reworded test title never orphans a baseline.
  // `fullPage` matches the shape the 60-run determinism study measured. /play cannot scroll as a
  // page (`h-dvh overflow-hidden`) and / fits 1280x900, so fullPage equals the viewport on all
  // nine — which is also why it cannot scroll a hover out from under the pointer.
  await expect(page).toHaveScreenshot('landing.png', { fullPage: true });
});
```

- [ ] **Step 2: Run it on your own machine to confirm it reaches the state**

```bash
pnpm --filter @notation-hero/web run test:vr
```

Expected: PASS, having written `landing-chromium-darwin.png` (on a Mac). That file is git-ignored by
Task 1's line — confirm with `git status --short`, which must show **no** darwin PNG.

- [ ] **Step 3: Generate the committed Linux baseline in the container**

Docker Desktop must be running.

```bash
pnpm test:web:docker:update
```

Expected: PASS, and `git status --short` now shows exactly one new file,
`web/e2e/pages.vr.ts-snapshots/landing-chromium-linux.png`.

- [ ] **Step 4: Verify the baseline compares green, and that a real change fails**

```bash
pnpm test:web:docker
```

Expected: PASS against the committed baseline.

Now prove the gate bites, with a **styling** change rather than a text one — a wrong word would be
caught by half a dozen other tests, and styling is the bug class this gate exists for. Temporarily
change the landing heading's size in `web/app/page.tsx` (`text-3xl` → `text-4xl`), then re-run the
same command. Expected: FAIL with a pixel diff and a report path. Revert and re-run — expected PASS.

- [ ] **Step 5: Verify the working tree survived the container run**

The two anonymous volumes exist for this. Both paths are git-ignored, so the check is that your
local dev build was not clobbered:

```bash
pnpm --filter @notation-hero/web run dev
```

Expected: the dev server starts and `/` renders. Stop it.

- [ ] **Step 6: Commit**

```bash
pnpm run fix && pnpm --filter @notation-hero/web run typecheck && pnpm --filter @notation-hero/web run lint
```

```bash
git add web/e2e/pages.vr.ts web/e2e/pages.vr.ts-snapshots/
git commit -m "test(web): shoot the landing page, and land the VR baseline workflow (NH-320)"
```

---

## Task 5: The three loaded-player shots, and the two test hooks they need

**Files:**

- Modify: `web/app/play/PlayerShell.tsx` — add `data-testid="player-rail"` to the `bg-rail` `<aside>`
- Modify: `web/app/play/TransportRow.tsx` — add `data-testid="transport-row"` to the `bg-panel` footer
- Modify: `web/e2e/pages.vr.ts` — two helpers and three shots
- Create: three `web/e2e/pages.vr.ts-snapshots/*-chromium-linux.png` baselines

**Interfaces:**

- Consumes: Task 4's `settleBeforeShot`; Task 2's `gotoPlayer`, `openLongScore`,
  `pressEveryTransportToggle`.
- Produces: `awaitPlayerReady(page: Page): Promise<void>` — used again by Task 6's three shots, and
  deliberately **not** by Task 7's two, which never finish loading.
- Produces: `surfaceDiffersFromParent(page: Page, testId: string): Promise<boolean>` — used twice
  here and nowhere else. Task 6's ghost hover compares a resting value to a hovered one, and Task 7's
  engine panel also has to rule out fully transparent, so neither fits this shape. Two call sites is
  why it is a helper rather than inlined twice.
- Produces: the test ids `player-rail` and `transport-row`.

- [ ] **Step 1: Add the two test hooks**

Neither element carries one today, and the bundled-beat surface assertion needs both. A class-based
locator was rejected: `PlayerHeader.tsx` also carries `bg-panel`, so `.bg-panel` alone is ambiguous,
and pinning a test to a styling utility is not the idiom the other shots use.

In `web/app/play/PlayerShell.tsx`, on the `<aside>` that carries `bg-rail` (find it by
`grep -n 'bg-rail' web/app/play/PlayerShell.tsx`):

```diff
-        <aside className="flex w-20 shrink-0 flex-col items-center border-r border-border bg-rail py-6 lg:w-24">
+        <aside
+          data-testid="player-rail"
+          className="flex w-20 shrink-0 flex-col items-center border-r border-border bg-rail py-6 lg:w-24"
+        >
```

In `web/app/play/TransportRow.tsx`, on the footer that carries `bg-panel`:

```diff
-    <div className="flex h-20 w-full shrink-0 items-center gap-3 border-t border-border bg-panel px-4 sm:gap-6 sm:px-8">
+    <div
+      data-testid="transport-row"
+      className="flex h-20 w-full shrink-0 items-center gap-3 border-t border-border bg-panel px-4 sm:gap-6 sm:px-8"
+    >
```

- [ ] **Step 2: Run the unit tests to verify the hooks changed nothing**

```bash
pnpm --filter @notation-hero/web run test
```

Expected: PASS. A `data-testid` is inert, but these two components have unit tests and this is the
cheap proof.

- [ ] **Step 3: Add the two shared helpers to `web/e2e/pages.vr.ts`**

Below `settleBeforeShot`:

```ts
/**
 * The engine, the soundfont and the loading bar are all done.
 *
 * The three ceilings are the existing lane's, and they only work because the `chromium` project
 * carries its own `timeout: 120_000` — measured, a per-test cap swallows a higher `expect` ceiling
 * whole, and web/e2e/a11y.e2e.ts's own 60 000 ms ceilings are unreachable today for exactly that
 * reason. A shot does more after readiness than an axe sweep does, so this lane has LESS headroom.
 *
 * Three of the nine shots deliberately never finish loading, so they must not call this — it could
 * never pass for them and would simply hang.
 */
async function awaitPlayerReady(page: Page): Promise<void> {
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  // Engine + soundfont ready.
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  // UNMOUNT, not opacity: the bar fades with `delay-[400ms] duration-300` and is only removed once
  // useLoadingBarPhase reaches `gone`. A bar caught mid-fade is precisely the kind of drift this
  // lane must not bless into a baseline.
  await expect(page.getByRole('progressbar', { name: 'Loading the player' })).toHaveCount(0, {
    timeout: 10_000,
  });
}

/**
 * Whether `testId`'s own background-color differs from its parent's.
 *
 * THREE of these shots guard a surface step the pixel comparator CANNOT see, between them carrying
 * FOUR such assertions — the bundled beat has two, the ghost hover and the engine error one each.
 * Playwright's per-pixel
 * cutoff is `35215 x threshold^2`, so at the default 0.2 a pixel must score above `1408.6` to be
 * counted at all — roughly 53/255 of luminance for a grey-on-grey step. This app's surfaces sit
 * under it: `--elevate` over `--rail` scores 80, `--rail` over `--panel` 20, `--panel` over
 * `--background` 5, the engine panel's tint over `--popover` 173. The comparison is per-pixel, so a
 * flat region that clears no pixel's cutoff contributes nothing however large it is. The picture
 * still earns its place — it catches "this state did not render at all" — but only the assertion
 * catches the surface underneath. Drop one and that shot silently stops covering what it was added
 * for, screenshot still green.
 *
 * Both values are read through the SAME serializer deliberately. A hard-coded
 * `toHaveCSS('background-color', 'oklch(93.5% 0.006 240.4deg)')` invites the very failure this
 * exists to catch: the browser resolves computed colours to its own format, so a format mismatch
 * makes the assertion pass — or fail — for a reason unrelated to the surface.
 */
const surfaceDiffersFromParent = (page: Page, testId: string): Promise<boolean> =>
  page.getByTestId(testId).evaluate((el) => {
    const parent = el.parentElement;
    const own = globalThis.getComputedStyle(el).backgroundColor;
    return parent !== null && own !== globalThis.getComputedStyle(parent).backgroundColor;
  });
```

- [ ] **Step 4: Write the three shots**

Append to `web/e2e/pages.vr.ts`, and add `openLongScore`, `pressEveryTransportToggle` and
`gotoPlayer` to the `./player-states` import:

```ts
test('the player on the score it opens with', async ({ page }) => {
  await gotoPlayer(page);
  await awaitPlayerReady(page);
  // The rail (20) and the transport footer (5) both score far under the 1408.6 cutoff, so the
  // picture proves the screen rendered while these two prove the surfaces are still distinct from
  // the page behind them. The header is NOT one of these steps — it paints no background of its own.
  await expect.poll(() => surfaceDiffersFromParent(page, 'player-rail')).toBe(true);
  await expect.poll(() => surfaceDiffersFromParent(page, 'transport-row')).toBe(true);
  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-bundled-beat.png', { fullPage: true });
});

// The one shot in this file that opens a file. Anything added later that does the same needs the
// same two waits.
test('the player with a score long enough to scroll', async ({ page }) => {
  await openLongScore(page);
  await awaitPlayerReady(page);
  // First prove WHICH score is on screen. Every wait above is also satisfied by the bundled beat
  // /play shows before the pick, so only the app's own per-file marker tells the two apart. Prefer
  // this attribute over polling for overflow: the bundled beat measures scrollHeight === clientHeight
  // EXACTLY, so a layout that gave it one pixel of overflow would make such a poll pass vacuously.
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 30_000,
  });
  // Then wait for the success toast to GO, and this one is not optional. Opening a file raises
  // toast.loading then toast.success under one id; neither sets a duration, and Sonner exempts a
  // `loading` toast from the close timer entirely, so the 4 000 ms TOAST_LIFETIME is armed by the
  // success that replaces it. Without this wait every long-score baseline carries a toast bearing
  // the filename, over the notation box the shot exists for. The ceiling is named because the
  // toast's measured life reaches 4 129 ms and a bare expect falls back to 5 000 ms — 871 ms of
  // slack, measured at one worker while CI runs several.
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10_000 });
  await settleBeforeShot(page);
  // Expect this baseline to show the Play tooltip: a successful open moves focus to the transport
  // (PlayerShell calls playRef.current?.focus()). Deterministic — identical across fourteen
  // measured runs — but a reviewer approving it should know it is meant to be there.
  await expect(page).toHaveScreenshot('player-long-score.png', { fullPage: true });
});

test('the player with every transport toggle pressed', async ({ page }) => {
  await pressEveryTransportToggle(page);
  await awaitPlayerReady(page);
  // The tempo percentage is revealed only under group-hover, group-focus-within or a timed
  // data-linger. "Increase tempo" leaves focus on that button, so focus-within holds it — but a
  // variant that moved focus away would photograph it at opacity-0 and bless a baseline missing the
  // very thing this shot exists for. The pressed toggles need no such help: `--primary` over
  // `--secondary` scores 14664, ten times over the cutoff, because that step carries chroma.
  await expect
    .poll(() =>
      page.getByTestId('tempo-percent').evaluate((el) => globalThis.getComputedStyle(el).opacity),
    )
    .toBe('1');
  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-transport-pressed.png', { fullPage: true });
});
```

- [ ] **Step 5: Prove each surface assertion fails when its surface goes flat**

Do this before generating baselines — an assertion that cannot fail is worse than none.

Temporarily change the `<aside>`'s `bg-rail` to `bg-background` in `PlayerShell.tsx`, then:

```bash
pnpm --filter @notation-hero/web run test:vr -g "score it opens with"
```

Expected: FAIL on `surfaceDiffersFromParent('player-rail')`, **not** on the screenshot — that is
the point of the assertion. Revert, repeat for `transport-row` (`bg-panel` → `bg-background`),
revert again.

- [ ] **Step 6: Generate and verify the three Linux baselines**

```bash
pnpm test:web:docker:update && pnpm test:web:docker
```

Expected: four baselines present (with Task 4's landing), all four PASS on the second command.
Open each PNG and look at it — tests and code review do not catch layout.

- [ ] **Step 7: Commit**

```bash
pnpm run fix && pnpm --filter @notation-hero/web run typecheck && pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run test
```

```bash
git add web/app/play/PlayerShell.tsx web/app/play/TransportRow.tsx web/e2e/pages.vr.ts web/e2e/pages.vr.ts-snapshots/
git commit -m "test(web): shoot the three loaded-player states, with surface assertions (NH-320)"
```

---

## Task 6: The hover and breakpoint shots

Three shots that come from outside the spec's original list, each with a precise reason: two from the
PR #170 review, one covering the breakpoint that PR introduced.

**Files:**

- Modify: `web/e2e/pages.vr.ts` — three shots
- Create: three `web/e2e/pages.vr.ts-snapshots/*-chromium-linux.png` baselines

**Interfaces:**

- Consumes: Task 4's `settleBeforeShot`; Task 5's `awaitPlayerReady`; Task 2's `gotoPlayer`.
- Produces: nothing new.

- [ ] **Step 1: Write the ghost-hover shot**

Append to `web/e2e/pages.vr.ts`:

```ts
/** The one OPEN tooltip. A closing popup can stay in the DOM for a frame, hence `[data-open]`. */
const openTooltip = (page: Page) => page.locator('[data-slot="tooltip-content"][data-open]');

// client/'s ghost variant is `hover:bg-elevate`, and the player chrome gives it three surfaces to
// land on. The step is strongest against Storybook's white canvas — the only place it is
// photographed today — and weakest against `--rail`, where it could regress to invisible with every
// existing gate green. OpenFileControl renders variant="ghost" on `--rail`, so hovering it is the
// shot. Convenient side effect: that button also carries a tooltip, so this captures the hover step
// and its tooltip together.
test('the ghost hover step on the left rail', async ({ page }) => {
  await gotoPlayer(page);
  await awaitPlayerReady(page);

  const ghost = page.getByTestId('open-file-button');
  const resting = await ghost.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
  await ghost.hover();
  // `--elevate` over `--rail` scores 80 against the 1408.6 cutoff, so reverting to
  // `hover:bg-muted` (46) changes ZERO counted pixels — and that revert is the exact regression
  // this shot exists for. Read the resting and hovered values the same way and the comparison
  // cannot go vacuous. The picture is not redundant: the variant's `hover:text-foreground` step
  // scores 4412, so it catches "this state did not render at all".
  await expect
    .poll(() => ghost.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor))
    .not.toBe(resting);
  // Not for an open DELAY — Tooltip defaults `delay` and `closeDelay` to 0 and neither trigger
  // overrides them. What needs settling is the open animation and the portal's position.
  await expect(openTooltip(page)).toBeVisible();

  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-rail-ghost-hover.png', { fullPage: true });
});
```

- [ ] **Step 2: Write the header-tooltip shot**

```ts
// Tooltip.tsx portals its content to the end of <body> and puts `isolate z-50` on the POSITIONER;
// the `z-50` on the Popup beneath it has never done anything, because Base UI renders that element
// `position: static` and z-index is ignored there. Nothing noticed while no other element claimed a
// layer — then the player header claimed `z-10` and the tooltips went behind it. Storybook cannot
// see this: a Tooltip story has no header to hide behind.
//
// The trigger must be a HEADER button. `z-10` only buries what overlaps the header's top 64 px, so
// a tooltip opening clear of it proves nothing — `back-home` sits inside the header and overlaps by
// construction. Measured: the tooltip flips BELOW its trigger, so only 10 px of its 28 fall inside
// the header's band, and what covers that strip is the header's `border-b` and `shadow-md` (the
// header paints no background). Simulating the regression changed 526 pixels in a 200x100 crop —
// far past the tolerance, so the shot catches it, but expect a sliver rather than a missing tooltip.
test('a portalled tooltip wins the header layer', async ({ page }) => {
  await gotoPlayer(page);
  await awaitPlayerReady(page);

  await page.getByTestId('back-home').hover();
  await expect(openTooltip(page)).toBeVisible();

  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-header-tooltip.png', { fullPage: true });
});
```

- [ ] **Step 3: Write the narrow-viewport shot**

```ts
// PlayerShell renders the rail `w-20 shrink-0 … lg:w-24`, so it is 80 px below Tailwind's `lg`
// (1024 px) and 96 px at or above it. The other eight shots are pinned at 1280 px and only ever see
// the wide rail. One shot at 900 px covers the narrow one without shooting every state twice.
//
// test.use() is rejected inside a test() body, and inside an ASYNC describe ("did not expect
// test.use() to be called here"). A titled, SYNC describe is the form that scopes it to one shot —
// measured: the sibling shots keep the project's 1280x900. A second Playwright project would
// instead double every baseline's filename space for the sake of one shot.
//
// One breakpoint is deliberately NOT covered: the transport footer carries a second one at 640 px
// (`sm:gap-6 sm:px-8`), and both 900 px and 1280 px sit above it. Desktop web is the v0 target and
// nine shots is settled.
test.describe('below the lg breakpoint', () => {
  test.use({ viewport: { width: 900, height: 900 } });

  test('the player with the narrow rail', async ({ page }) => {
    await gotoPlayer(page);
    await awaitPlayerReady(page);
    await settleBeforeShot(page);
    await expect(page).toHaveScreenshot('player-narrow.png', { fullPage: true });
  });
});
```

- [ ] **Step 4: Prove the ghost-hover assertion fails when the step goes flat**

Temporarily change the ghost variant's `hover:bg-elevate` to `hover:bg-rail` in
`client/src/components/ui/Button/Button.tsx` — the same surface the button sits on, so the step
truly vanishes — then:

```bash
pnpm --filter @notation-hero/web run test:vr -g "ghost hover"
```

Expected: FAIL on the `.not.toBe(resting)` poll. Revert.

- [ ] **Step 5: Verify the narrow shot really renders the narrow rail**

Before trusting the baseline, assert the width once by hand. Add a temporary line to that shot:

```ts
console.log(
  await page.getByTestId('player-rail').evaluate((el) => el.getBoundingClientRect().width),
);
```

Run `pnpm --filter @notation-hero/web run test:vr -g "narrow rail"`. Expected: `80`. Then run the
1280 px bundled-beat shot with the same print — expected `96`. Delete both prints. If the narrow one
prints 96, the `test.use` block is not taking effect and the shot covers nothing.

- [ ] **Step 6: Generate and verify all seven baselines**

```bash
pnpm test:web:docker:update && pnpm test:web:docker
```

Expected: seven baselines, all PASS. Open the three new PNGs: the rail's ghost button must visibly
sit on a lighter square, the header tooltip must be in front of the header's bottom edge, and the
narrow shot's rail must be visibly thinner.

- [ ] **Step 7: Commit**

```bash
pnpm run fix && pnpm --filter @notation-hero/web run typecheck && pnpm --filter @notation-hero/web run lint
```

```bash
git add web/e2e/pages.vr.ts web/e2e/pages.vr.ts-snapshots/
git commit -m "test(web): shoot the ghost hover, the header tooltip and the narrow rail (NH-320)"
```

---

## Task 7: The two states that never finish loading

Both are reachable because the engine import is a real request the lane can intercept. Neither can
call `awaitPlayerReady` — Play never enables, so it would simply hang.

**Files:**

- Modify: `web/e2e/pages.vr.ts` — two shots
- Create: two `web/e2e/pages.vr.ts-snapshots/*-chromium-linux.png` baselines

**Interfaces:**

- Consumes: Task 4's `settleBeforeShot`; Task 2's `stallEngine` and `abortEngine`.
- Produces: nothing new.

- [ ] **Step 1: Write the Skeleton shot**

Append to `web/e2e/pages.vr.ts`, adding `stallEngine` and `abortEngine` to the `./player-states`
import:

```ts
// NotationSurface is mounted from the first paint and the stalled import keeps `engine` null, so
// the Skeleton is up on a bare /play with no interaction needed.
test('the first-visit Skeleton while the engine module is stalled', async ({ page }) => {
  // Infinity, not the accessibility lane's 5 000 ms: toHaveScreenshot needs the state to hold
  // across two consecutive samples, and on a baseline-generation run across the write as well.
  await stallEngine(page, Infinity);
  // The accessibility lane's own signal for this state; it names no ceiling, so neither does this.
  await expect(page.getByTestId('notation-skeleton')).toBeVisible();
  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-skeleton.png', { fullPage: true });
});
```

- [ ] **Step 2: Write the engine-error shot**

```ts
// The engine-error state is reachable and PERMANENT — abort the engine module the way the shot above
// stalls it. Its role="alert" sits on a color-mix(in oklab, …) destructive tint.
test('the destructive panel when the engine module fails to load', async ({ page }) => {
  await abortEngine(page);
  const panel = page.getByTestId('engine-error');
  // 15 000 ms is the ceiling the accessibility lane's own source line states for this state.
  await expect(panel).toBeVisible({ timeout: 15_000 });
  // The tint over `--popover` scores 173 against the 1408.6 cutoff, and even its
  // `border-destructive/25` edge only reaches 1231 — so the picture proves the panel rendered (its
  // red text scores 19698) while this proves the tint is there. Not surfaceDiffersFromParent: this
  // one also has to rule out fully transparent, which "differs from the parent" does not.
  await expect
    .poll(() =>
      panel.evaluate((el) => {
        const parent = el.parentElement;
        const own = globalThis.getComputedStyle(el).backgroundColor;
        return (
          parent !== null &&
          own !== globalThis.getComputedStyle(parent).backgroundColor &&
          own !== 'rgba(0, 0, 0, 0)'
        );
      }),
    )
    .toBe(true);
  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-engine-error.png', { fullPage: true });
});
```

- [ ] **Step 3: Prove the indefinite stall really holds across the compare**

This is the one place a wrong `setTimeout` branch would be invisible: a Skeleton that resumed would
simply photograph the loaded player, and the baseline would look plausible.

```bash
pnpm --filter @notation-hero/web run test:vr -g "Skeleton"
```

Expected: PASS. Open the written darwin PNG and confirm it shows the skeleton placeholder, **not**
rendered notation. Then temporarily change `stallEngine(page, Infinity)` to `stallEngine(page, 500)`
and re-run — the shot should now photograph the loaded player, proving the argument is load-bearing.
Restore `Infinity`.

- [ ] **Step 4: Prove the engine-error tint assertion fails when the tint goes**

Find the tint class on the `engine-error` element in `web/app/play/NotationSurface.tsx` and
temporarily remove the background utility, keeping the border and the red text. Then:

```bash
pnpm --filter @notation-hero/web run test:vr -g "engine module fails"
```

Expected: FAIL on the poll, **not** on the screenshot. Revert.

- [ ] **Step 5: Generate and verify all nine baselines**

```bash
pnpm test:web:docker:update && pnpm test:web:docker
```

Expected: nine baselines under `web/e2e/pages.vr.ts-snapshots/`, all nine PASS:

```text
landing-chromium-linux.png              player-narrow-chromium-linux.png
player-bundled-beat-chromium-linux.png  player-rail-ghost-hover-chromium-linux.png
player-engine-error-chromium-linux.png  player-skeleton-chromium-linux.png
player-header-tooltip-chromium-linux.png  player-transport-pressed-chromium-linux.png
player-long-score-chromium-linux.png
```

Confirm the count: `ls web/e2e/pages.vr.ts-snapshots/ | wc -l` → `9`.

- [ ] **Step 6: Run both lanes together the way CI will, once, unscoped**

This is the first time the shared-`webServer` arrangement is exercised end to end.

```bash
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts
```

Expected: ~100 tests pass, each line prefixed `[e2e]` or `[chromium]`. The nine `[chromium]` lines
will FAIL on a Mac — they compare against Linux baselines. That is correct and expected locally; the
point of this step is that both projects ran from one server boot. Confirm exactly one
`pnpm build` in the output.

- [ ] **Step 7: Commit**

```bash
pnpm run fix && pnpm --filter @notation-hero/web run typecheck && pnpm --filter @notation-hero/web run lint
```

```bash
git add web/e2e/pages.vr.ts web/e2e/pages.vr.ts-snapshots/
git commit -m "test(web): shoot the first-visit Skeleton and the engine-error panel (NH-320)"
```

---

## Task 8: Guard that the pixel lane actually compares pixels

Nothing fails today if the shots disappear. Measured: `pnpm --filter @notation-hero/web run test:vr`
exits 1 with "No tests found", but **CI runs `playwright test` unscoped**, and Playwright raises that
error only when the whole root suite is empty. The behaviour and axe tests keep it non-empty, so an
unscoped run over this config with an empty `chromium` project exits **0** — a merge-blocking gate
reading green over zero pixels.

**Files:**

- Modify: `tooling/workflow-guards.test.mjs` (add one test; extend its `node:fs` import with
  `readdirSync` and update the file header)

**Interfaces:**

- Consumes: `web/e2e/pages.vr.ts` and `web/playwright.e2e.config.ts`.
- Produces: nothing other code depends on.

- [ ] **Step 1: Update the file header, which no longer describes what this suite covers**

Its opening comment says the suite is about "both privileged workflows keep the in-repo master-ref
guard". It has since grown e2e, lint and error-code assertions, and now VR-lane ones. Add a line:

```js
// It has since grown to pin every CI arrangement whose loss would be SILENT rather than loud: the
// browser lanes' run lines and container pins, the error-code gate's job placement, and the web VR
// lane's ability to compare a pixel at all.
```

- [ ] **Step 2: Write the failing guard**

Change the `node:fs` import to `import { readdirSync, readFileSync } from 'node:fs';` and append:

```js
// Counting filenames is not enough. A file can be present and still compare NOTHING: empty, all
// test.skip, or carrying no toHaveScreenshot at all. Playwright's `forbidOnly` catches `.only`;
// nothing else in this repo catches `.skip` or `.fixme`. And the shot files' own content is not
// enough either — the `chromium` project is what makes them RUN, so deleting it or mistyping its
// testMatch leaves an unscoped run exiting 0 with every filename still in place (measured both ways
// on Playwright 1.61.1).
test('the web VR project has at least one shot to run', () => {
  const dir = new URL('../web/e2e/', import.meta.url);
  const shots = readdirSync(dir).filter((file) => file.endsWith('.vr.ts'));
  assert.ok(shots.length > 0, 'web/e2e has no *.vr.ts — the chromium project runs nothing');

  const sources = shots.map((file) => readFileSync(new URL(file, dir), 'utf8'));
  shots.forEach((file, index) => {
    // `describe\.` is allowed deliberately: the narrow-viewport shot needs a test.describe()
    // wrapper for its test.use(), so `test.describe.skip(` is the natural way to park it and a
    // pattern anchored straight to `test\.` would miss it. The trailing `\(` stays — without it the
    // assertion matches any prose occurrence, a snapshot filename, or a commented-out line.
    assert.doesNotMatch(
      sources[index],
      /\btest\.(?:describe\.)?(?:skip|fixme)\s*\(/,
      `${file} disables a shot`,
    );
  });
  assert.ok(
    sources.some((source) => source.includes('toHaveScreenshot(')),
    'no *.vr.ts calls toHaveScreenshot — the chromium project compares nothing',
  );

  // Three shots carry four assertions over a surface step the comparator cannot see (scoring 5, 20,
  // 80 and 173 against its
  // 1408.6 per-pixel cutoff), so each reads a computed background-color instead. Drop one and that
  // shot silently stops covering what it was added for, with the screenshot still green. This is a
  // presence check, not a proof the assertion is correct — it cannot be, without a browser.
  for (const hook of ['player-rail', 'transport-row', 'open-file-button', 'engine-error']) {
    assert.ok(
      sources.some((source) => source.includes(hook)),
      `no *.vr.ts reads ${hook} — a surface assertion the comparator cannot replace is gone`,
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
  assert.match(config, /name:\s*'chromium'/, 'the chromium project is gone — the shots never run');
  assert.match(config, /testMatch:\s*'\*\*\/\*\.vr\.ts'/, 'chromium no longer matches *.vr.ts');
});
```

- [ ] **Step 3: Run it to verify it passes now**

```bash
node --test tooling/workflow-guards.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Prove each arm bites**

Four separate checks — run the command above after each, expecting the quoted failure, and revert
before the next:

1. `git mv web/e2e/pages.vr.ts web/e2e/pages.ts` → `web/e2e has no *.vr.ts`
2. Change one `test(` to `test.skip(` in `pages.vr.ts` → `pages.vr.ts disables a shot`
3. Delete the `name: 'chromium'` line from the config → `the chromium project is gone`
4. Remove the `player-rail` assertion from the bundled-beat shot → `no *.vr.ts reads player-rail`

- [ ] **Step 5: Commit**

```bash
pnpm run fix && pnpm run test:tooling
```

```bash
git add tooling/workflow-guards.test.mjs
git commit -m "test: fail CI when the web VR lane would compare zero pixels (NH-320)"
```

---

## Task 9: Move `web/`'s whole browser lane into the container

`web/` is built twice per CI run today — the `build` job's `pnpm run build` fans out to it, and the
`e2e` job's Playwright `webServer` runs its own `pnpm build`. Bolting a VR step onto `vr`, or adding
a separate `web-vr` job, would each make that three. Moving the lane keeps it at two **and** makes
web's axe and web's VR render identically.

**Files:**

- Modify: `.github/workflows/ci.yml` — a new `web` job, the trimmed `e2e` job, three artifact
  renames, the `vr-report` download, the `vr-report-resolve` wording, two corrected comments, and
  `ci-green`'s `needs:`
- Modify: `web/playwright.e2e.config.ts` — drop the now-false clause from its header
- Modify: `tooling/workflow-guards.test.mjs` — rewrite two assertions, add two

**Interfaces:**

- Consumes: everything above. Produces: the `web` CI job, and `playwright-web-report`.

- [ ] **Step 1: Add the `web` job, after `e2e`**

```yaml
# web/'s whole browser lane — behaviour, accessibility and visual regression — in ONE
# Playwright-container job, so ONE `next build` serves all three and web's axe and web's VR render
# identically. web/ has no Storybook, so neither `vr` nor `a11y` covers it; THIS is that gate.
# Path-filtered on `code`; blocks merge via ci-green, from day one, as client/ VR already does.
# Spec: docs/specs/2026-09-21-web-visual-regression-gate.md (NH-320).
web:
  needs: changes
  if: ${{ needs.changes.outputs.code == 'true' }}
  runs-on: ubuntu-latest
  container: mcr.microsoft.com/playwright:v1.61.1-noble
  steps:
    - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
    # NOT the setup-js composite — same reasoning as the `vr` job: inside the Playwright container
    # use the image's Node + corepack (pnpm@11.5.2 from packageManager) and --ignore-scripts.
    # pnpm/action-setup conflicts with the image's pnpm layout, and the lefthook `prepare` cannot
    # run here. Browsers are baked into the image — no `playwright install`.
    - name: Install deps
      run: corepack enable && pnpm install --frozen-lockfile --ignore-scripts
    # ONE invocation, with NO --project, and this is load-bearing. Playwright registers the
    # webServer per INVOCATION and tears it down when that invocation ends, so two scoped steps
    # would each run their own `pnpm build && pnpm start` and the whole reason for this job would
    # evaporate. Measured: a two-project config whose server logged every boot recorded ONE boot
    # for a single unscoped run and TWO for two scoped runs. Nothing is lost by combining them —
    # both the HTML report and the `list` reporter print the project name on every test, so a red
    # run still says whether the pixel lane or the behaviour lane failed. The scoped test:e2e and
    # test:vr scripts stay for local use, where running one lane at a time is the point.
    - name: web browser lane (end-to-end + accessibility + visual regression)
      run: pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts
    - name: Upload the web Playwright report
      # NOT `if: failure()` — keep the trace of a flaky-then-passed retry (matches vr and e2e, D5).
      # Unguarded this would never run on the one run that needs it: GitHub skips a job's remaining
      # steps once a step fails, and web/ has no hosted diff page as a fallback — a red run is read
      # by downloading this artifact and opening it with `npx playwright show-report`.
      if: ${{ !cancelled() }}
      uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
      with:
        name: playwright-web-report
        path: |
          web/playwright-report/
          web/test-results/
        retention-days: 7
        if-no-files-found: ignore
```

- [ ] **Step 2: Trim the `e2e` job, and fix its header**

Four clauses in that header go false at once. Replace the whole comment and remove the two `web`
steps and the two `web` paths:

```yaml
# End-to-end — Playwright against client/'s built SPA (`vite preview`), with /api/catalog mocked by
# MSW. web/'s browser lane moved to the `web` job (NH-320), which runs it in the Playwright
# container so one `next build` serves behaviour, axe and pixels together. Models the `a11y` job
# (ubuntu + on-demand Chromium): this lane is not pixel-exact, so it needs no Playwright container
# — which is what still distinguishes it from the `vr` and `web` jobs, both of which are. Uploads
# traces + the HTML report so a CI failure is replayable via `npx playwright show-trace`.
# Path-filtered on `code`; blocks merge via ci-green.
```

```diff
       - name: e2e tests (Playwright vs built app)
         run: pnpm --filter @notation-hero/client run test:e2e
-      - name: Install Playwright Chromium (web)
-        run: pnpm --filter @notation-hero/web exec playwright install --with-deps chromium
-      - name: e2e tests (Playwright vs the built Next.js app)
-        run: pnpm --filter @notation-hero/web run test:e2e
       - name: Upload traces + HTML report
         # NOT `if: failure()` — that would drop the trace of a flaky-then-passed run (D5).
-        # ONE upload step for both lanes: a second step reusing the artifact name would collide.
         if: ${{ !cancelled() }}
         uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
         with:
-          name: playwright-e2e-report
+          name: playwright-client-e2e-report
           path: |
             client/playwright-report/
             client/test-results/
-            web/playwright-report/
-            web/test-results/
           retention-days: 7
           if-no-files-found: ignore
```

- [ ] **Step 3: Rename the `vr` artifact and its matching download**

`actions/upload-artifact` v4+ rejects a duplicate name inside one run with a 409, and today's two
names do not say which package they came from — which stops working the moment `web/` has its own.
Two edits, and they must move together or `vr-report` silently stops finding the report it publishes:

```diff
       - name: Upload VR report + traces
...
-          name: playwright-vr-report
+          name: playwright-client-vr-report
```

```diff
       - name: Download VR report artifact
...
-          name: playwright-vr-report
+          name: playwright-client-vr-report
```

- [ ] **Step 4: Scope the `vr-report-resolve` comment wording to the client lane**

That job keys on `needs.vr.result` alone and rewrites the sticky comment to a claim that, after this
change, is true of only one of two VR lanes. It only ever UPDATES an existing comment, so this
shows up on a PR where `client/` VR had already gone red once. The merge still blocks on a red `web`
either way — this is a comment contradicting its own run, not a hole in the gate:

```diff
-                body: `${marker}\n✅ VR passing on \`${sha}\` — no visual diffs to review.`,
+                body: `${marker}\n✅ client VR passing on \`${sha}\` — no visual diffs to review. (web/'s VR lane is the separate \`web\` job; it has no hosted report — download \`playwright-web-report\` from the run.)`,
```

- [ ] **Step 5: Add `web` to `ci-green`'s `needs:`**

`needs:` is the single source of truth for what blocks merge, and the verify step reads it via
`toJSON(needs)` — so this one-line edit is the whole wiring:

```diff
         a11y,
         vr,
         e2e,
+        web,
         secret-scan,
```

- [ ] **Step 6: Drop the now-false clause from the config header**

`web/playwright.e2e.config.ts`'s header still says "no VR or axe job covers it". The `web` job is a
VR job over that very config. The no-Storybook fact stays — it is still the reason the lane is
shaped this way — and Task 1 already rewrote this comment; verify it carries no "no VR job" claim.

- [ ] **Step 7: Rewrite the two broken guard assertions and add two**

Two assertions in `tooling/workflow-guards.test.mjs` break, and they need **different** remedies.
Replace that whole test:

```js
// The `web` job is the gate over the product's own UI. Everything pinned here is something whose
// loss would be SILENT: a run line that no longer runs the lane, a missing container (so baselines
// compare under the wrong renderer), a second invocation (so the one-build premise collapses), or
// the job dropping out of ci-green (so a red pixel run stops blocking merge).
test("the web job runs web/'s whole browser lane in the pinned container, and blocks merge", () => {
  const ci = workflow('ci.yml');
  // Sliced to the web job's own block, the way the lint-job test below does it. The scoping is what
  // makes the container pin REAL: that exact literal already appears for the `vr` job, so an
  // unscoped assertion would pass before this job existed at all.
  const webJob = ci.split(/^  web:$/m)[1]?.split(/^  [a-z][a-z0-9-]*:$/m)[0] ?? '';
  assert.ok(webJob, 'there is no `web:` job in ci.yml');

  // ANCHORED to a real `run:` line (the /m flag), never "appears somewhere in the file": the
  // unanchored form stays green against a ci.yml where the whole step is commented out with `#`.
  // Note this is NOT `run test:e2e` — the job runs playwright directly and UNSCOPED, so both
  // projects share one webServer and therefore one `next build`.
  assert.match(
    webJob,
    /^\s+run: pnpm --filter @notation-hero\/web exec playwright test --config=playwright\.e2e\.config\.ts$/m,
  );
  // Exactly ONE invocation. Playwright registers the webServer per invocation and tears it down
  // when that invocation ends, so a second call runs a second `next build` and the only reason for
  // this job evaporates.
  assert.equal(
    (webJob.match(/playwright test/g) ?? []).length,
    1,
    'the web job must call `playwright test` exactly once — a second call means a second next build',
  );
  // The container pin is what makes "no playwright install needed" true, and what makes the pixel
  // comparison match the committed -linux baselines.
  assert.match(webJob, /^\s+container: mcr\.microsoft\.com\/playwright:v[\d.]+-noble$/m);
  assert.doesNotMatch(
    webJob,
    /playwright install/,
    'the container bakes the browsers in — an install step here means the pin is not trusted',
  );
  // Its report and traces must be uploaded, or a CI failure is not replayable: web/ has no hosted
  // diff page, so this artifact is the only way to see the pixel diff.
  assert.match(webJob, /web\/playwright-report\//);
  assert.match(webJob, /web\/test-results\//);
  // …and the lane must still BLOCK merge. ci-green's `needs:` list is the single source of truth
  // for that, so a step that runs inside a job nothing waits on is not a gate.
  assert.match(ci, /^\s+web,$/m);
});

test('the client e2e lane still blocks merge too', () => {
  assert.match(workflow('ci.yml'), /^\s+e2e,$/m);
});
```

- [ ] **Step 8: Run the guards and the workflow linter**

```bash
pnpm run test:tooling && pnpm run lint:actions && pnpm run lint:yaml
```

Expected: all PASS. Then prove the one-invocation guard bites — temporarily duplicate the
`playwright test` step inside the `web` job and re-run `pnpm run test:tooling`. Expected: FAIL with
`must call \`playwright test\` exactly once`. Remove the duplicate.

- [ ] **Step 9: Commit, write the PR body, and push**

Write the PR body **before** pushing: `gh pr edit` during a run cancels it, and the stale red
`CI Green` never clears.

```bash
pnpm run fix && pnpm run test:tooling && pnpm run lint:actions
```

```bash
git add .github/workflows/ci.yml web/playwright.e2e.config.ts tooling/workflow-guards.test.mjs
git commit -m "ci: move web/'s browser lane into the Playwright container (NH-320)"
```

- [ ] **Step 10: Watch the real CI run — this is the only place the move can be verified**

Local green does not prove CI green when the binary versions or the scan scope differ. On the
pushed branch, confirm in the Actions tab:

1. The `web` job ran **in the container** and its log shows exactly one `next build`.
2. All nine `[chromium]` shots PASSED against the committed Linux baselines. If any failed, download
   `playwright-web-report`, open it with `npx playwright show-report`, and look at the diff before
   regenerating anything — a red VR run whose quickest route to green is a baseline refresh is
   exactly how a page nobody looked at gets blessed.
3. The `e2e` job ran only `client/`.
4. `CI Green` lists `web=success`.
5. The three artifacts are named `playwright-client-vr-report`, `playwright-client-e2e-report` and
   `playwright-web-report`, with no 409.
6. The 91 existing `web/` behaviour tests still pass in the container. Their timing changing is the
   one real risk in this decision; if it materialises, the documented fallback is a separate
   `web-vr` container job, accepting the second build.

**If a shot flakes, the remedies have an order — do not reach for the last one first.** The 60-run
determinism study was taken at `--workers=1`, so these nine shots are untested in parallel, and they
are heavier than `client/`'s isolated Storybook components: full pages driving a real engine and a
soundfont download. `retries: 2` absorbs a one-off blip first. Then, in order:

1. **`fullyParallel: false` on the `chromium` project** — about 25 seconds for the whole lane, one
   line. But read what it does before trusting it: it serialises shots only **within each file**,
   while the 91 behaviour tests keep running concurrently against the same server — which is where
   the contention comes from. It does **not** restore the conditions the study was measured under.
2. **`dependencies: ['e2e']` on the `chromium` project** — Playwright's first-class remedy for
   exactly that, measured under one unscoped invocation and one `webServer`: both behaviour files
   finish, **then** the shots run. Pair it with `fullyParallel: false` (or `workers: 1`, which
   `TestProject` does accept) to serialise the shots among themselves. Its accepted cost: a red
   behaviour test makes the pixel project report _"did not run"_. The run is red so merge still
   blocks, but it compares zero pixels, and `retries: 2` makes a persistent failure cost the whole
   pixel lane.
3. **A separate `web-vr` container job** — the documented fallback, not the first remedy, because it
   takes `web` back to three builds per CI run.

---

## Task 10: The documentation the move invalidates

Every file here describes a mechanism that is still in force, so each is corrected rather than left
as history. The NH-197 change-log and registry entries are the exception — those are records of what
was decided at the time and keep the old name.

**Files:**

- Modify: `AGENTS.md` · `docs/runbooks/vr-a11y-testing.md` · `client/README.md` ·
  `docs/specs/2026-06-26-nh-197-e2e-traces.md` ·
  `docs/specs/2026-07-08-vr-report-gh-pages-on-failure.md` ·
  `docs/specs/2026-09-21-web-visual-regression-gate.md` · `docs/decisions/decision-changelog.md`

**Interfaces:** consumes the artifact names and commands from Tasks 3 and 9. Produces nothing code
depends on.

- [ ] **Step 1: Rename the three artifacts in every live reference**

Five spot edits, found by content:

| File                                                                  | Old                     | New                            |
| --------------------------------------------------------------------- | ----------------------- | ------------------------------ |
| `client/README.md` (the failing-PR bullet)                            | `playwright-vr-report`  | `playwright-client-vr-report`  |
| `client/README.md` (the trace-debugging paragraph)                    | `playwright-e2e-report` | `playwright-client-e2e-report` |
| `docs/runbooks/vr-a11y-testing.md` (trace debugging)                  | `playwright-e2e-report` | `playwright-client-e2e-report` |
| `docs/specs/2026-07-08-vr-report-gh-pages-on-failure.md` (two places) | `playwright-vr-report`  | `playwright-client-vr-report`  |
| `docs/specs/2026-06-26-nh-197-e2e-traces.md` (three places)           | `playwright-e2e-report` | `playwright-client-e2e-report` |

Verify none is left behind:

```bash
grep -rn "playwright-vr-report\|playwright-e2e-report" --include='*.md' --include='*.yml' . | grep -v decision-changelog | grep -v decision-registry
```

Expected: no output. (The changelog and registry keep the old names as history.)

- [ ] **Step 2: Give `AGENTS.md`'s VR section the `web/` lane**

Its heading is scoped `client/` and its "Full runbook" line points at a runbook that is also being
widened. Replace the section:

```markdown
## VR & a11y testing (Storybook for `client/`, the real app for `web/`)

Four test layers in `client/`: **Unit** (Vitest, `quality` job), **a11y** (axe-core over Storybook stories, light + dark + hover — `a11y` job, blocks merge, OS-independent), **VR** (Playwright `toHaveScreenshot` — `vr` job, blocks merge, **Linux-only baselines**, regenerate via `pnpm test:vr:docker:update`), **e2e** (Playwright vs built SPA, MSW mocks `/api/*` — `e2e` job, blocks merge, uploads traces on failure).

`web/` has **no Storybook**, so its gate is nine page screenshots of `/` and `/play` against the real `next build` — the `web` job, which runs behaviour, axe and pixels in ONE Playwright-container invocation so one build serves all three. Blocks merge. Baselines are Linux-only too: regenerate via `pnpm test:web:docker:update` and commit them. This is the gate `client/` VR cannot be — `web/` compiles its own Tailwind CSS by scanning `client/` **source**, so a component can be correct in Storybook and broken in the app (NH-320).

**Full runbook:** [`docs/runbooks/vr-a11y-testing.md`](docs/runbooks/vr-a11y-testing.md) — VR-in-Docker mechanics, the nine `web/` shots, e2e config, trace debugging.
```

- [ ] **Step 3: Widen the runbook**

`AGENTS.md` points at this file as the full reference, so it needs more than the one artifact rename
from step 1. Five edits:

1. **Title** — `# VR + a11y + e2e testing — runbook (\`client/\`)`→ drop the`client/`scoping:`# VR + a11y + e2e testing — runbook`
2. **"Four test layers in `client/`"** — keep the heading and its four bullets, but add a sentence
   under it saying `web/`'s lane is separate and described below.
3. **The two commands at lines 19-22** — add the new pair beside them:

   ```bash
   pnpm test:vr:docker            # client/: compare against the committed Linux baselines
   pnpm test:vr:docker:update     # client/: regenerate them after an intended visual change
   pnpm test:web:docker           # web/:    compare against the committed Linux baselines
   pnpm test:web:docker:update    # web/:    regenerate them after an intended visual change
   ```

4. **The expanded `docker run` block** — this is the block that goes stale the moment
   `tooling/docker-playwright.sh` lands, and it is the only file that spells the command out.
   Replace it with the helper and what it takes:

   ````markdown
   All four call one helper, so the volume list and the image tag live in a single place:

   ```bash
   bash tooling/docker-playwright.sh <pnpm-filter> <script>
   ```

   It shadows every package's `node_modules` plus `web/.next` and `web/public/alphatab` with
   anonymous volumes, so a container run cannot clobber the local dev build (both are git-ignored,
   so nothing could reach a commit — this is about the working tree). `web/test-results/` and the
   `*-snapshots/` folders are deliberately **not** shadowed: those are the results you need to read
   afterwards. `tooling/workflow-guards.test.mjs` asserts the helper's image tag and both CI jobs'
   `container:` lines agree with the installed `@playwright/test`, so a partial bump fails CI rather
   than silently comparing baselines under the wrong renderer.
   ````

5. **A new `web/` section**, after the client VR section:

   ````markdown
   ## `web/`'s VR lane — nine page shots of the real app

   `web/` has no Storybook, so its pixel gate shoots the composed pages: `landing`,
   `player-bundled-beat`, `player-long-score`, `player-skeleton`, `player-engine-error`,
   `player-transport-pressed`, `player-rail-ghost-hover`, `player-header-tooltip` and
   `player-narrow` (900 px, below the `lg` breakpoint). They live in `web/e2e/pages.vr.ts`, with
   baselines in `web/e2e/pages.vr.ts-snapshots/` — **Linux-only**, same rule as `client/`.

   All three `web/` lanes run in ONE CI job (`web`) and ONE `playwright test` invocation, so a
   single `next build` serves behaviour, axe and pixels. That is why every LOCAL invocation must
   name its project (`--project=e2e` or `--project=chromium`): both lanes live in one config, so an
   unscoped local run would compare Linux baselines on your Mac.

   ```bash
   pnpm --filter @notation-hero/web run test:e2e   # behaviour + axe, natively (not pixel-exact)
   pnpm test:web:docker                            # the nine shots, in the container
   pnpm test:web:docker:update                     # regenerate them, then commit
   ```

   **Four shots assert a surface the comparator cannot see.** Playwright's per-pixel cutoff is
   `1408.6` at the default threshold, and this app's surface steps score 5, 20, 80 and 173 — under
   it. Those shots each read a computed `background-color` alongside the picture; the picture proves
   the state rendered, the assertion proves the surface is right. Do not remove one.

   **Debugging a red run:** `web/` has **no** hosted diff page (unlike `client/`'s `vr-report`
   GitHub Pages publish). Download `playwright-web-report` from the run's **Artifacts**, then:

   ```bash
   npx playwright show-report path/to/playwright-report
   ```

   Look at the diff before regenerating anything. A red VR run whose quickest route to green is a
   baseline refresh is exactly how a page nobody looked at gets blessed.
   ````

- [ ] **Step 4: Flip this spec's Status line**

In `docs/specs/2026-09-21-web-visual-regression-gate.md`, line 4 — match the idiom of
`docs/specs/2026-07-08-vr-report-gh-pages-on-failure.md:4` (`Status: Implemented (extends PR #122)`):

```diff
-Status: Designed — not implemented. v0 Plan C (the Settings and Tracks popovers) has merged, and its
+Status: Implemented. v0 Plan C (the Settings and Tracks popovers) has merged, and its
 two popover shots are deliberately **out of this gate** — they land after it; see "The shots".
```

- [ ] **Step 5: Flip the six pending marks in the change log**

**Not** a new entry — both NH-320 entries already landed with the spec. What this PR owes is the
status flip required by `AGENTS.md`'s "PR merge → update both, in the SAME PR" rule. Six `⏳ pending`
marks: three in the 2026-09-22 entry and three in the 2026-09-21 one. Each becomes `✅ done`, the
idiom already used throughout that file.

```bash
grep -n "⏳ pending" docs/decisions/decision-changelog.md
```

Expected before: six hits inside the two NH-320 entries (plus four unrelated ones elsewhere in the
file — leave those alone; confirm by line number against the two entry headings). After: the four
unrelated ones only.

`decision-registry.md` carries no NH-320 text at all, so it needs no edit — the change log was split
out of it on 2026-07-15. Do **not** add a dated entry to the registry:
`pnpm run check:decision-docs` fails the build if one lands there.

Two notes for the PR description rather than the file:

- The 2026-09-22 entry's title says "eleven shots"; the 2026-09-28 deferral of the two popover shots
  reduced it to nine. That title records what was decided **on that date**, and the change log is
  history, so it stays. The spec's "Deferred — the two Plan C popover shots" paragraph is where the
  current count lives.
- No change-log entry records the 2026-09-28 deferral itself. Raise it with the maintainer rather
  than writing one: a change-log entry is his ratification to make, not an agent's.

- [ ] **Step 6: Run every documentation gate**

```bash
pnpm run fix && pnpm run lint:md && pnpm run lint:spell && pnpm run check:decision-docs && pnpm run format:check
```

Then verify the `--fix` pass did not entrench a wrap artifact — a reflow that puts a `#`-prefixed
token at a line start becomes a real heading and every linter then goes green on a broken doc.
Diff the heading list, not the exit code:

```bash
git diff -U0 -- '*.md' | grep -E '^\+#{1,6} ' || echo "no new headings"
```

Expected: only the headings you meant to add.

- [ ] **Step 7: Commit and push**

```bash
git add AGENTS.md docs/runbooks/vr-a11y-testing.md client/README.md docs/specs/ docs/decisions/decision-changelog.md
git commit -m "docs: record the web VR lane and rename the Playwright artifacts (NH-320)"
```

---

## Before opening the PR

- [ ] `pnpm run check:all` — the whole suite CI runs, from the repo root.
- [ ] `pnpm run test:tooling` — explicitly, because the pre-push hook never reaches it
      (`pnpm -r --if-present run test` is scoped to the 5 workspace projects; the root is excluded).
- [ ] `pnpm test:vr:docker && pnpm test:web:docker` — both pixel lanes against their committed
      Linux baselines.
- [ ] `ls web/e2e/pages.vr.ts-snapshots/ | wc -l` → `9`, and
      `git status --short` shows no `*-chromium-darwin.png`.
- [ ] Open all nine baseline PNGs and look at them. Tests and code review do not catch layout; three
      UI tasks in this repo have passed both and then failed on sight.
- [ ] Write the PR body **before** the final push — a `gh pr edit` mid-run cancels the run and the
      stale red `CI Green` never clears.
- [ ] Review with the `doc-review-loop` and `code-review-loop` skills, per
      [`docs/runbooks/before-pr.md`](../runbooks/before-pr.md).
- [ ] Tick every box in the PR checklist. The VR item — _"If this PR changed UI, I added or updated
      the VR tests for it"_ — needs no template edit; it simply starts applying to `web/` now.
- [ ] No `## Pulumi preview` section is needed: nothing under `infra/` changes.

## Flagged — one pre-existing hazard, measured

Found while grounding this plan. It is pre-existing, so fixing it is not traceable to the spec and it
is **not** in the task list above. It is written down because this plan adds a third file of the
shape that trips it.

**Tailwind scans `web/e2e/`, and nothing excludes it.** `web/app/globals.css` carries
`@source not '../scripts/**'` for exactly one reason, stated in the file:

```text
Tailwind also auto-detects sources under web/, which would include scripts/. Keep it out, or
the build guard defeats itself: scripts/assert-design-system-css.mjs names the very utilities
it checks for, so scanning it makes Tailwind GENERATE them and the guard can never see them
go missing. Verified — without this line the guard reports 6 of 10 missing instead of 9 of 10.
```

`web/e2e/` has the same shape and no such line. **Measured, not reasoned:** a `mt-[137px]` planted in
a _comment_ in `web/e2e/a11y.e2e.ts` — a utility that appears nowhere else in the repo — came out in
the emitted stylesheet after `pnpm --filter @notation-hero/web run build`:

```text
web/.next/static/chunks/42d2m7n8ftnh3.css
```

So a class name mentioned in a `web/e2e` comment becomes real CSS. `a11y.e2e.ts` and `player.e2e.ts`
already discuss utility names in prose, and Task 4 adds a third file that does. **No
`REQUIRED_SELECTORS` entry is named in any of them today, so there is no live bug** — but the next
comment that mentions one silently defeats the NH-315 guard, and that guard is one of the two things
holding shut the failure where production served the design system unstyled.

The fix is one line beside the existing one:

```diff
  @source not '../scripts/**';
+ /* Same hazard, same reason: a utility named in an e2e comment becomes real CSS, and these files
+    discuss design-system class names in prose. Measured: a `mt-[137px]` in an a11y.e2e.ts comment
+    reached the emitted stylesheet. */
+ @source not '../e2e/**';
```
