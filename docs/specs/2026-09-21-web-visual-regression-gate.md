# Visual-regression gate for `web/` — NH-320

Date: 2026-09-21
Status: Designed — not implemented. Lands **after** v0 Plan C (the Settings and Tracks popovers).
Ticket: [NH-320](https://leocaseiro.atlassian.net/browse/NH-320)

## Goal

Give the product's own screens — `/` and `/play` — pixel screenshots that block merge, the way 45 of
the 46 component folders under `client/src/components/ui/` already have them (only `Table/` has no
`*.vr.ts`).

## Non-goals

- **Not a replacement for the targeted paint assertions.** Screenshots catch still-image faults. The
  loading-bar fade race of PR #164 is a timing bug and keeps its own test.
- **No Storybook inside `web/`.** The locked NH-275 decision stands (see "Approaches weighed").
- **No dark-mode baselines.** Dark mode is unreachable in `web/` today — see "Light only".
- **No mobile-width baselines in v1.** One viewport; a second doubles the baseline count for a
  breakpoint no bug has yet been found at.

## Why this exists

`web/` is the only UI surface in the repo with no pixel gate. The `a11y` and `vr` CI jobs both run
`pnpm --filter @notation-hero/client`, so only `client/` is covered.

This is an **omission, not a decision**. A screenshot lane for `web/` appears in no spec, plan,
handoff, registry entry, pull request or session record — it was never weighed and never rejected.
The v0 spec-review lap-3 finding _"New player components have no package home or a11y/VR gate"_
named both halves of the gap; the applied fix closed only the accessibility half.

The bug class has already shipped twice:

- **PR #162** — the seek rail rendered 0 px wide. Every `web/` browser test passed, axe included:
  a slider keeps its role, its value and its keyboard seeking whether or not a single pixel of it is
  painted. Only an ad-hoc screenshot caught it.
- **NH-315 / PR #167** — production served the design system unstyled while the same commit's
  preview deployment was perfect.

`client/` VR cannot see this class **by construction**. `web/` compiles its own Tailwind CSS by
scanning `client/` _source_ (the `@source` globs in `web/app/globals.css`), so a component can be
correct in Storybook and broken in the app. PR #162 was exactly that: the rail was perfect in
Storybook, because Storybook scans `client/` itself.

## Approaches weighed

| Option                                  | Sees the app's own compiled CSS  | Verdict                             |
| --------------------------------------- | -------------------------------- | ----------------------------------- |
| Page screenshots in `web/e2e`           | yes — runs the real `next build` | **chosen**                          |
| Storybook inside `web/`                 | partly                           | rejected                            |
| Move presentational pieces to `client/` | no                               | complement, not substitute — NH-298 |

**Storybook inside `web/`** was rejected on three counts: it reopens the locked NH-275 decision that
the app hosts no Storybook (`docs/specs/2026-07-09-nextjs-web-client-design.md` lines 40, 43, 61 and
the ADR `docs/decisions/2026-07-12-design-system-distribution-adr.md` line 56); a `PlayerShell`
story needs a **fake AlphaTab engine**, which the v0 spec itself names as the thing to avoid
("gated while rendering fabricated options") and which the project's standing rule forbids; and it
never runs `next build`, so the NH-315 class stays invisible. In fairness, a `web/` Storybook
importing `web/app/globals.css` would inherit its `@source` globs and probably _would_ have caught
the 0 px rail — but the other two objections stand on their own.

**Moving pieces into `client/`** (NH-298) is worth doing and is tracked separately. It cannot
replace this gate: it never sees the composed page at a real width, with the real CSS build.

## The pixel-stability measurement

The one unknown was whether `/play` is reproducible at all: AlphaTab renders in a worker, its music
font loads late, and the player owns a fading loading bar.

Sixty runs in `mcr.microsoft.com/playwright:v1.61.1-noble`, three shots × twenty runs each, at
`threshold: 0` and `maxDiffPixels: 0` — the harshest comparison Playwright allows, where a single
byte of difference in a single channel fails. The **first** run of each shot writes the baseline and
compares against nothing, so every ratio below is out of the **nineteen comparisons that follow it**:

| Shot                                    | Identical runs |
| --------------------------------------- | -------------- |
| Full page (contains the rendered score) | **19 / 19**    |
| Page with the notation masked out       | **19 / 19**    |
| Notation box only (element-clipped)     | 3 / 19         |

**AlphaTab's notation render is pixel-deterministic.** The full-page shot contains the drawn score
and never moved.

The only drift is in the **element-clipped** shot, and every one of the sixteen drifting runs
differs in the same five to nine bytes, all at the box's top corners:

```text
(0,5)    expected [239,242,243]  actual [240,242,243]   +1 red
(1,6)    expected [247,248,248]  actual [247,248,249]   +1 blue
(975,6)  expected [235,237,238]  actual [235,238,238]   +1 green
```

x = 0, 1 and x = 974, 975 at rows 5 to 7 is the anti-aliased arc of `rounded-md border border-border`
on `notation-surface`, drawn one step differently depending on where the element clip lands. **Zero
differing pixels in the staff, the notes, the cursor or the glyphs.**

Three design consequences, all evidence-backed rather than guessed:

1. **Page-level shots only** — no `toHaveScreenshot` on a clipped element.
2. **No mask over the notation.** The score is shot as it is drawn.
3. **The tolerance is a free choice**, because even the worst observed drift is ±1/255 in one
   channel. See "Open question 1".

Cost: Playwright reported **41 passed (2.2 m) for 60 runs** — about 2.2 s per shot, so an eight-shot
lane is well under a minute of test time. The dominant cost is the `next build`, not the
screenshots.

> The baseline image behind these numbers predates NH-317 (the build version on the wordmark). That
> commit does not touch AlphaTab, so the determinism finding is unaffected; the baselines themselves
> are throwaway and are not committed.

## Design

### Light only

Dark mode cannot be reached in `web/` today. The variant is class-based —
`@custom-variant dark (&:is(.dark *))` at `client/src/styles.css:20` — and `web/app/layout.tsx`
renders a bare `<html lang="en">` with no theme toggle and no `next-themes`. Shooting a dark
baseline would mean injecting `.dark` from the test: a state no visitor can reach, and test-only
instrumentation of exactly the kind this project bans. Dark baselines become available the day
`web/` grows a real theme control, and not before.

### One config, two projects

`web/playwright.e2e.config.ts` gains a `projects` array. Both projects share the single `webServer`,
so **one `next build` serves both lanes** — this is what makes the CI decision below possible. It
mirrors `client/playwright.config.ts`, which already splits one Storybook server into a `chromium`
(VR) project and an `a11y` project.

```ts
projects: [
  { name: 'e2e', testMatch: '**/*.e2e.ts', use: { ...devices['Desktop Chrome'] } },
  // Named `chromium` so baselines read `*-chromium-linux.png`, the same shape as client/'s.
  {
    name: 'chromium',
    testMatch: '**/*.vr.ts',
    use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
  },
],
```

The viewport is pinned explicitly rather than inherited from the device definition, so a Playwright
upgrade that adjusts `Desktop Chrome` cannot silently invalidate every baseline.

**Every invocation must name its project**, or adding the array quietly breaks the command that
exists today. `web/package.json`'s `test:e2e` carries no `--project`, so the moment projects exist
that one command runs **both** lanes — and on a Mac that means a guaranteed red run against Linux
baselines plus stray `*-chromium-darwin.png` files. `client/` never has this problem because it
scopes each script. `web/package.json` therefore changes to match:

```diff
- "test:e2e": "playwright test --config=playwright.e2e.config.ts",
- "test:e2e:ui": "playwright test --config=playwright.e2e.config.ts --ui",
+ "test:e2e": "playwright test --config=playwright.e2e.config.ts --project=e2e",
+ "test:e2e:ui": "playwright test --config=playwright.e2e.config.ts --project=e2e --ui",
+ "test:vr": "playwright test --config=playwright.e2e.config.ts --project=chromium",
+ "test:vr:update": "playwright test --config=playwright.e2e.config.ts --project=chromium --update-snapshots",
```

The CI `web` job runs the two scoped commands as **separate steps** — `test:e2e` then `test:vr` —
rather than one unscoped run. One run would fold both lanes into a single report, where a pixel
failure and a behavior failure can mask each other; two steps keep the webServer (and therefore the
single `next build`) shared while naming which lane went red.

### The shots

Eight. Six reuse navigation `web/e2e/a11y.e2e.ts` has already proved works; the last two cover the
popovers v0 Plan C adds to `/play` before this gate is built. Keeping the count small is deliberate:
every shot is a file that moves whenever `client/` changes or AlphaTab is upgraded.

| Shot                      | How it is reached                                    | What only this shot covers                          |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Landing                   | `/`                                                  | the Play button, the one screen that is not `/play` |
| Player, bundled beat      | `/play`                                              | the default screen: header, score, transport row    |
| Player, long score        | `/play` + `Punk.gp` via `open-file-input`            | the scrolling notation box, a real filename         |
| First-visit Skeleton      | stall `**/alphatab/esm/alphaTab.mjs`                 | the loading state                                   |
| Engine error              | abort `**/alphatab/esm/alphaTab.mjs`                 | the `color-mix(in oklab, …)` destructive tint       |
| Transport toggles pressed | click loop, metronome, count-in, then increase tempo | pressed-state styling and the tempo percentage      |
| Settings popover open     | click the header gear                                | the accordion sections and their rows, composed     |
| Tracks popover open       | click the transport's Tracks button                  | one mixer row per track, over a real score          |

The last two exist because the sequencing puts Plan C first, so both popovers are already on `/play`
by the time this lane is written. They are app-composed UI built from `client/` primitives and
rendered only by the real Next.js build — exactly the surface this gate exists to cover, and the
same shape of thing as the 0 px seek rail. Their `client/` halves (`Accordion`, `SettingRow`,
`TrackRow`) carry their own Storybook baselines; these two shots cover the composition, which no
`client/` story can see. **If Plan C ships them behind different controls than the gear and the
Tracks button, these two rows follow Plan C, not this document.**

Candidates deliberately **not** in v1, each recorded so the omission is a decision rather than an
oversight:

- **The drag-over state** (`.nh-drop-zone[data-dragging]` plus `.nh-drop-overlay` — a dashed outline,
  a `backdrop-filter: blur(3px)` and a `color-mix` scrim) and **the bar-range selection**
  (`.at-selection div`). Both are bespoke CSS rules that no gate measures, and both are **already
  reachable** — `web/e2e/player.e2e.ts` has `fileDrag` (line 289, driving Chrome DevTools Protocol
  `Input.dispatchDragEvent`, in a passing test that reaches the drop overlay) and `selectBars`
  (line 890, plain `page.mouse`, since a bar-range selection is not an HTML5 drag and needs no
  protocol input at all). They are out of v1 for screenshot **timing**, not missing tooling: each
  state exists only mid-gesture, so a shot has to pause before `drop` or `mouse.up()` and hold the
  frame steady long enough for two consecutive samples. Worth adding when that is worth solving, or
  the first time one of them breaks.
- **A mobile-width pass.** One viewport in v1.

### Readiness, and why each wait is there

Every shot settles on explicit signals — no bare sleeps except a final short one. The waits are
**per shot**, not one recipe for all eight: three of the states deliberately never finish loading,
so the player-ready block below can never pass for them and would simply hang.

**The five player-loaded shots** (bundled beat, long score, both popovers, transport toggles):

```ts
await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible();
await expect(page.getByTestId('transport-play')).toBeEnabled(); // engine + soundfont ready
await expect(page.getByRole('progressbar', { name: 'Loading the player' })).toHaveCount(0);
```

**The other three** settle on the signal `web/e2e/a11y.e2e.ts` already uses for that same state:

| Shot                 | Its signal                                    | Why the block above cannot work                                |
| -------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| Landing `/`          | `getByRole('link', { name: 'Play' })` visible | the page renders a heading and a link — neither test id exists |
| First-visit Skeleton | `getByTestId('notation-skeleton')` visible    | the engine is stalled on purpose, so Play never enables        |
| Engine error         | `getByTestId('engine-error')` visible         | the engine is aborted on purpose, so Play never enables        |

**All eight** then finish identically:

```ts
await page.evaluate(async () => {
  await document.fonts.ready;
});
await page.waitForTimeout(500);
```

The Skeleton shot's route handler must **stall indefinitely** rather than resume after a fixed
delay the way the accessibility lane's 5 000 ms stall does: `toHaveScreenshot` needs the state to
hold across two consecutive samples, and on a baseline-generation run across the write as well.

The progress-bar wait is for **unmount**, not opacity: the bar fades with `delay-[400ms]
duration-300` and is only removed once `useLoadingBarPhase` reaches `gone`. A bar caught mid-fade is
precisely the kind of drift this lane must not bless. `animations: 'disabled'` covers the
`Skeleton`'s `animate-skeleton-pulse`, which Playwright fast-forwards to its end state.

### Baselines

Linux-only, exactly as `client/` does it: `*-chromium-linux.png` committed, darwin shots ignored.
`web/.gitignore` gains the line `client/.gitignore` already carries:

```diff
+ # VR baselines are Linux-only. A local update on a Mac writes darwin shots for quick
+ # iteration — they must never be committed (regenerate through the container).
+ *-chromium-darwin.png
```

### CI — `web/`'s whole browser lane moves into the container

Today the `e2e` job runs both browser lanes on plain ubuntu and builds `web/` **once**. Bolting a VR
step onto the existing `vr` job, or adding a separate `web-vr` job, would each make that **two**
`web` builds per run. Moving the whole `web/` lane into one container job keeps it at one.

|                                       | today | add a step to `vr` | new `web-vr` job | **move the lane (chosen)** |
| ------------------------------------- | ----- | ------------------ | ---------------- | -------------------------- |
| `web` builds per CI run               | 1     | 2                  | 2                | **1**                      |
| web axe and web VR render identically | n/a   | no                 | no               | **yes**                    |

```text
Before                                  After
  a11y    ubuntu   client axe             a11y    ubuntu      client axe
  vr      container client VR             vr      container   client VR
  e2e     ubuntu    client e2e            e2e     ubuntu      client e2e
                  + web e2e (+axe)        web     container   web e2e (+axe) + web VR
```

The new `web` job follows the `vr` job's container recipe, not the `setup-js` composite: `corepack
enable && pnpm install --frozen-lockfile --ignore-scripts`, and no `playwright install` because the
browsers are baked into the image. It carries the same guard every other path-filtered job has —
`needs: changes` plus `if: ${{ needs.changes.outputs.code == 'true' }}` — so a documentation-only
pull request skips it rather than paying for a container build.

**Each lane writes to its own folder.** The two scoped steps share one server, but both would
otherwise write `web/playwright-report/` and `web/test-results/`, and the second run would wipe the
first — Playwright clears the output folder when it starts. Redirect them per step:

```yaml
- name: web end-to-end + accessibility
  env:
    PLAYWRIGHT_HTML_OUTPUT_DIR: playwright-report-e2e
  run: pnpm --filter @notation-hero/web run test:e2e -- --output=test-results-e2e
- name: web visual regression
  env:
    PLAYWRIGHT_HTML_OUTPUT_DIR: playwright-report-vr
  run: pnpm --filter @notation-hero/web run test:vr -- --output=test-results-vr
```

**Artifact names, and a rename that makes them symmetric.** `actions/upload-artifact` v4 and later
reject a duplicate name inside one run with a 409, and `ci.yml` already warns about exactly that on
the step being changed. Today's two names do not say which package they came from, which stops
working the moment `web/` has its own. So all four become explicit:

| Job                             | Artifact                       |
| ------------------------------- | ------------------------------ |
| `vr` (client Storybook VR)      | `playwright-client-vr-report`  |
| `e2e` (client only, after this) | `playwright-client-e2e-report` |
| `web` — the end-to-end step     | `playwright-web-e2e-report`    |
| `web` — the visual step         | `playwright-web-vr-report`     |

The rename is three lines in `ci.yml`: the `vr` job's upload (line 227), the `vr-report` job's
matching download (line 261), and the `e2e` job's upload (line 402). `vr-report` must move with its
artifact or it silently stops finding the report it publishes.

The `e2e` job's upload also **drops** `web/playwright-report/` and `web/test-results/` from its
`path:` list — those paths belong to the new job now.

One comment in `ci.yml` needs correcting rather than deleting — the `e2e` job says the container is
unnecessary because the lane "is not pixel-exact". That was true and is the reason it never had one;
after this change the `web` half _is_ pixel-exact and the client half still is not.

**Blocking from day one.** `web` joins `ci-green`'s `needs:` list alongside `a11y`, `vr` and `e2e`.
`client/` VR already blocks, and the measurement found no flake to earn a grace period against: a
visual gate nobody has to obey is one people learn to scroll past.

The image tag stays pinned in lockstep with `@playwright/test` (v1.61.1 today), and baselines are
regenerated on the bump — the same policy `client/` already runs under.

### Local commands

Two new root scripts, mirroring `test:vr:docker`. Each wraps the container around the matching
package script above — `test:web:docker` runs `@notation-hero/web run test:vr`, and
`test:web:docker:update` runs `test:vr:update`:

```text
pnpm test:web:docker          compare web/ against the committed Linux baselines
pnpm test:web:docker:update   regenerate them after an intended visual change, then commit
```

There is no docker wrapper for `web/`'s end-to-end lane: it is not pixel-exact, so it runs natively
with `pnpm --filter @notation-hero/web run test:e2e` exactly as it does today. Only baselines need
the container.

Both need two anonymous volumes the existing script does not have. This was measured, not guessed:
`next build` writes `web/.next`, and `scripts/vendor-alphatab.mjs` writes `web/public/alphatab/`.
Without these, a container run writes both onto the host bind mount and clobbers the developer's
local dev build. Both paths are git-ignored, so nothing can reach a commit — this is about not
wrecking the working tree.

```diff
  -v /work/web/node_modules \
+ -v /work/web/.next \
+ -v /work/web/public/alphatab \
```

`web/test-results/` and the snapshot folders are deliberately **not** shadowed — those are the
results a developer needs to read afterwards.

With these two scripts the repo would carry four near-identical docker invocations inline in
`package.json` — the two existing ones measure 395 and 402 characters, and the new pair lands near
450 with the extra volumes. See "Open question 3".

## Risks and caveats

- **Baseline churn.** Every `client/` visual change and every AlphaTab upgrade moves these
  baselines too. Eight shots is the mitigation; adding a ninth should have to justify itself.
- **Parallel workers are unmeasured.** The measurement ran `--workers=1`. The waits are on explicit
  signals rather than on timing, so parallel execution should hold, but if it proves flaky the VR
  project takes `workers: 1` — at about 2.2 s a shot that costs almost nothing.
- **Moving the 50 existing `web/` browser tests into the container may change their timing.** This
  is the one real risk in the CI decision. If it materializes, fall back to a separate `web-vr`
  container job and accept the second build.
- **The app-version tooltip is a landmine for any future shot that opens it.** NH-317 renders
  `NEXT_PUBLIC_APP_VERSION` inside a closed `TooltipContent`, so it is not painted at rest. In CI
  `VERCEL_ENV` is unset and the value is the constant `local`. A future hovered-wordmark shot must
  therefore never run with `VERCEL_ENV` set, or the baseline would carry a build timestamp and a
  commit hash and break on every commit.
- **The transport-toggles shot depends on the tempo percentage staying painted.**
  `client/src/components/ui/TempoControl/TempoControl.tsx` reveals it only under `group-hover`,
  `group-focus-within` or a timed `data-linger`. Clicking "Increase tempo" leaves focus on that
  button, so focus-within holds it — but a variant that moves focus away would capture it at
  `opacity-0` and bless a baseline missing the thing the shot exists for. Assert the painted opacity
  before the shot, the way the accessibility lane already does.
- **The PR template needs no edit.** Item _"If this PR changed UI, I added or updated the VR tests
  for it"_ already reads correctly; it simply starts applying to `web/` changes once this lands.

## Open questions for review

1. **Tolerance: Playwright's defaults, or exact zero?** The measurement supports either — the worst
   observed drift is ±1/255 in one channel, far under the default `threshold: 0.2`, and page-level
   shots showed no drift at all. **Recommendation: use the defaults, the same as `client/`**, so the
   repo has one comparison policy rather than two. Exact zero buys nothing the evidence can point
   at, and being stricter than `client/` on a much larger surface invites flakes.
2. **Should a failing `web` VR publish its report to gh-pages?** Today `vr-report` is `needs: vr`
   and serves `client/` only (`docs/specs/2026-07-08-vr-report-gh-pages-on-failure.md`). Without an
   equivalent, a red `web` VR means downloading a zip to see the diff — a real usability step
   backwards from the client lane. Extending `vr-report` to `needs: [vr, web]` is more work than the
   gate itself. Follow-up ticket, or in scope?
3. **Extract the docker invocation into `tooling/docker-playwright.sh`?** Four call sites of the
   same ~400-character command is roughly where inlining stops paying. Optional, and easy to defer.

## Process changes this carries

- `web/playwright.e2e.config.ts` — the `projects` array splitting `e2e` from `chromium`.
- `web/package.json` — `test:e2e` and `test:e2e:ui` scoped to `--project=e2e`, plus the new
  `test:vr` and `test:vr:update`.
- `package.json` (root) — `test:web:docker` and `test:web:docker:update`.
- `AGENTS.md` — the "VR & a11y testing" section is scoped to `client/`; it gains the `web/` lane and
  the two new commands.
- `web/.gitignore` — the darwin-baseline line.
- `.github/workflows/ci.yml` — the new `web` job, the trimmed `e2e` job, the four artifact names,
  the `vr-report` download rename, the corrected comment, and `ci-green`'s `needs:`.
- `docs/decisions/decision-registry.md` — **not** a new change-log entry: that entry lands with this
  spec. What the implementing pull request owes is flipping this decision's three ⏳ pending marks
  to ✅, per the "PR merge → update statuses" rule in `AGENTS.md`.
