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
- **No full narrow-width pass.** One narrow shot, not every state shot twice — see "The shots".
  PR #170 puts a real breakpoint in the player chrome, so a single viewport is no longer defensible,
  but shooting all eleven states at both widths is what the small-count rule exists to prevent.

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
3. **Playwright's default tolerance is enough** — decided 2026-09-26. Its `threshold` defaults to
   `0.2` in YIQ colour space and `maxDiffPixels` is unset, so a pixel must differ noticeably to
   count and then a _single_ such pixel fails. The worst drift measured here is ±1/255 in one
   channel, about `0.004` — fifty times under that threshold. Going stricter (`threshold: 0`) would
   buy nothing the evidence points at, would make element-clipped shots impossible, and would give
   the repo two comparison policies instead of one. So the shots pass no comparison options at all,
   exactly as `client/` does.

Cost: Playwright reported **41 passed (2.2 m) for 60 runs** — about 2.2 s per shot, so an eleven-shot
lane is well under a minute of test time. The dominant cost is the `next build`, not the
screenshots.

> The baseline image behind these numbers predates NH-317 (the build version on the wordmark). That
> commit does not touch AlphaTab, so the determinism finding is unaffected; the baselines themselves
> are throwaway and are not committed.

## Design

### Light only

Dark mode cannot be reached in `web/` today. The variant is class-based —
`@custom-variant dark (&:is(.dark *))` at `client/src/styles.css:27` — and `web/app/layout.tsx`
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
upgrade that adjusts `Desktop Chrome` cannot silently invalidate every baseline. The narrow-viewport
shot overrides it with `test.use({ viewport: { width: 900, height: 900 } })` inside a **sync**
`test.describe()` wrapping that one shot — Playwright rejects `test.use()` inside a `test()` body,
and inside an `async` describe, with "did not expect test.use() to be called here". A describe
block is the form that scopes it to one shot; a second Playwright project would instead double
every baseline's filename space for the sake of one.

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

Eleven. Six reuse navigation `web/e2e/a11y.e2e.ts` has already proved works; two cover the popovers
v0 Plan C adds to `/play`; two come from the PR #170 review, deferred here by the maintainer on
2026-09-22; and one covers the breakpoint #170 introduces. Keeping the count small is deliberate:
every shot is a file that moves whenever `client/` changes or AlphaTab is upgraded.

**All of these describe `/play` as PR #170 left it** (merged 2026-09-22) — a full-bleed page with a `z-10` header, a
left `bg-rail` strip carrying the Open-file control, the notation surface, and a raised `bg-panel`
transport footer.

| Shot                      | How it is reached                                    | What only this shot covers                            |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Landing                   | `/`                                                  | the Play button, the one screen that is not `/play`   |
| Player, bundled beat      | `/play`                                              | the default screen: header, rail, score, footer       |
| Player, long score        | `/play` + `Punk.gp` via `open-file-input`            | the scrolling notation box, a real filename           |
| First-visit Skeleton      | stall `**/alphatab/esm/alphaTab.mjs`                 | the loading state                                     |
| Engine error              | abort `**/alphatab/esm/alphaTab.mjs`                 | the `color-mix(in oklab, …)` destructive tint         |
| Transport toggles pressed | click loop, metronome, count-in, then increase tempo | pressed-state styling and the tempo percentage        |
| Settings popover open     | click the header gear                                | the accordion sections and their rows, composed       |
| Tracks popover open       | click the transport's Tracks button                  | one mixer row per track, over a real score            |
| Ghost hover on the rail   | hover `open-file-button`                             | `hover:bg-elevate` measured against `--rail`          |
| Tooltip over the header   | hover `back-home`                                    | a portalled tooltip winning the header's `z-10` layer |
| Narrow viewport           | `/play` at 900 px wide                               | the rail's `w-20` state, below the `lg` breakpoint    |

Two of these exist because the sequencing puts Plan C first, so both popovers are already on `/play`
by the time this lane is written. They are app-composed UI built from `client/` primitives and
rendered only by the real Next.js build — exactly the surface this gate exists to cover, and the
same shape of thing as the 0 px seek rail. Their `client/` halves (`Accordion`, `SettingRow`,
`TrackRow`) carry their own Storybook baselines; these two shots cover the composition, which no
`client/` story can see. **If Plan C ships them behind different controls than the gear and the
Tracks button, these two rows follow Plan C, not this document.**

**The last three come from outside this document and each has a precise reason.**

**Ghost hover on the rail** — PR #170 finding 10. `client/src/components/ui/Button/Button.tsx` gives
the ghost variant `hover:bg-elevate`, and #170 adds three surfaces it can land on:

```css
--elevate: oklch(93.5% 0.006 240.4deg); /* the raised step a control shows under the pointer */
--rail: #f4f6f9; /* recessed — the left rail */
--panel: #fbfcfe; /* raised — the transport footer */
```

The step is strongest against Storybook's white canvas, which is the only place it is photographed
today, and weakest against `--rail` — where it could regress to invisible with every existing gate
green. `OpenFileControl.tsx` renders `variant="ghost"` on `--rail`, so hovering it is the shot.
Convenient side effect: that button also carries a tooltip, so this shot captures the hover step and
that tooltip together.

**Tooltip over the header** — PR #170 finding 9. `Tooltip.tsx` portals its content to the end of
`<body>` and puts `isolate z-50` on the **Positioner**; the `z-50` on the Popup beneath it has never
done anything, because Base UI renders that element `position: static` and z-index is ignored there.
Nothing noticed while no other element claimed a layer. #170's header claims `z-10`, and the
tooltips went behind it. Storybook cannot see this: a Tooltip story has no header to hide behind.

The trigger must be a **header** button. The `z-10` only buries what overlaps the header's top
64 px, so a tooltip that opens clear of it proves nothing — `back-home` sits inside the header and
overlaps by construction. A screenshot is enough, though not for the obvious reason. Measured live on `master`: the header is
64 px, `back-home` is 44 px centred in it, and the tooltip flips **below** the trigger, so only
**10 px of its 28** fall inside the header's band — the rest stays visible either way. The header
paints no background, so what covers that strip is its `border-b` and `shadow-md`. Simulating the
regression (the Positioner's `z-index` set back to `auto`) changed **526 pixels** in a 200×100 crop,
the arrow and that band. Far past the tolerance, so the shot catches it — but it is a sliver, not a
missing tooltip.

**Narrow viewport** — `PlayerShell.tsx` renders the rail as `w-20 shrink-0 … lg:w-24`, so it is
80 px below Tailwind's `lg` (1024 px) and 96 px at or above it. The other ten shots are pinned at
1280 px and only ever see the wide rail. One shot at 900 px covers the narrow one without shooting
every state twice.

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
- **Every state at both widths.** One narrow shot, not eleven.

### Readiness, and why each wait is there

Every shot settles on explicit signals — no bare sleeps except a final short one. The waits are
**per shot**, not one recipe for all eleven: three of the states deliberately never finish loading,
so the player-ready block below can never pass for them and would simply hang.

**The eight player-loaded shots** (bundled beat, long score, both popovers, transport toggles,
ghost hover, tooltip over the header, narrow viewport):

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

**All eleven** then finish identically:

```ts
await page.evaluate(async () => {
  await document.fonts.ready;
});
await page.waitForTimeout(500);
```

The two hover shots add one wait of their own — `[data-slot="tooltip-content"][data-open]` visible,
the locator `web/e2e/player.e2e.ts:1183` already defines for exactly this. Not because of an open
delay: `Tooltip.tsx` defaults `delay` and `closeDelay` to `0` and neither trigger overrides them.
What needs settling is the open animation and the portal's position. The Skeleton shot's route handler must **stall
indefinitely** rather than resume after a fixed
delay the way the accessibility lane's 5 000 ms stall does: `toHaveScreenshot` needs the state to
hold across two consecutive samples, and on a baseline-generation run across the write as well.

The progress-bar wait is for **unmount**, not opacity: the bar fades with `delay-[400ms]
duration-300` and is only removed once `useLoadingBarPhase` reaches `gone`. A bar caught mid-fade is
precisely the kind of drift this lane must not bless. `animations: 'disabled'` covers the
`Skeleton`'s `animate-skeleton-pulse` — but by **cancelling** it to its first frame, not by
fast-forwarding it, because `client/src/styles.css` declares that keyframe `infinite`. Playwright
fast-forwards only _finite_ animations. It lands on the right pixels here either way (0% and 100%
of `skeleton-pulse` are the same colour), and the distinction is written down because the next
infinite animation added to `web/` may not be so forgiving.

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

**The docker invocation moves into `tooling/docker-playwright.sh`** — decided 2026-09-26. Inlining
a fifth copy is where it stops paying: the two existing scripts measure 395 and 402 characters, the
new pair lands near 450, and they already differ in the two volumes above, which is drift before a
line is written. One helper takes the package and the script name and carries the full volume list;
shadowing `web/.next` during a `client/` run is harmless, so both packages share it.

```diff
- "test:vr:docker": "docker run --rm -v \"$PWD\":/work -v /work/node_modules … bash -c \"corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @notation-hero/client run test:vr\"",
+ "test:vr:docker": "bash tooling/docker-playwright.sh @notation-hero/client test:vr",
```

`tooling/*.sh` is already shellcheck-linted, so the helper is checked rather than trusted. The
expanded command is written out in `docs/runbooks/vr-a11y-testing.md` (lines 27-34), not in
`AGENTS.md` — whose VR section is three summary lines that link the runbook — and `client/README.md`
(lines 152-153) carries the command pair. Those are the files that go stale if the helper lands
without them.

## Risks and caveats

- **Baseline churn.** Every `client/` visual change and every AlphaTab upgrade moves these
  baselines too. Eleven shots is the mitigation; adding a twelfth should have to justify itself.
- **The shot list was re-derived from PR #170 and re-checked after it merged.** Every element it
  names is on `master`: the rail at `PlayerShell.tsx:600` (`w-20 … lg:w-24`, `bg-rail`), the header's
  layer at `:537` (`relative z-10`) over a `h-16` header, the ghost Open-file button at
  `OpenFileControl.tsx:118` with its tooltip, `back-home` in the header, and the `--rail`, `--panel`
  and `--elevate` tokens in `client/src/styles.css`. Line numbers drift — re-read
  `web/app/play/PlayerShell.tsx` before writing the lane rather than trusting them.
- **Parallel workers are unmeasured.** The measurement ran `--workers=1`. The waits are on explicit
  signals rather than on timing, so parallel execution should hold, but if it proves flaky the VR
  project takes `workers: 1` — at about 2.2 s a shot that costs almost nothing.
- **Moving the 51 existing `web/` browser tests into the container may change their timing.** This
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

## A failing run gives you a zip, not a hosted diff — deliberately

Decided 2026-09-26. GitHub's own image views (2-up / Swipe / Onion Skin) compare **committed**
baseline PNGs that a pull request modifies. That covers an **intended** visual change completely and
needs nothing built. It cannot show a **failing** run, because a failing run updates no baseline, so
no file changes and the Files tab has nothing to show — the diff exists only inside the Playwright
report in the CI artifact.

`client/` fills that gap with the `vr-report` job, which publishes its report to GitHub Pages and
links it from a sticky comment (`docs/specs/2026-07-08-vr-report-gh-pages-on-failure.md`). `web/`
does **not** get an equivalent, for two reasons:

- **The evidence says it is unproven.** `gh-pages` carries no `vr-report/pr/*` path, and the only
  pull request mentioning its comment marker is the one that built it (#122). Either `client/` VR
  has never failed on a pull request since it shipped, or every publish was swept on close. Either
  way the mechanism has not been exercised.
- **It costs more than the gate.** About 100 lines of workflow, with four values hard-wired to
  `client/`: the artifact name, the publish path, the comment marker, and the cleanup sweep in
  `storybook-preview.yml`. Extending it means duplicating both jobs or reworking them into a matrix.

So a red `web` VR is read the way any other Playwright failure is: download `playwright-web-vr-report`
from the run's Artifacts and open it with `npx playwright show-report`. Revisit the day that download
becomes a real annoyance — then there is a measured case to size the work against.

## Process changes this carries

- `web/e2e/*.vr.ts` — **new**; the eleven shots themselves. `web/` contains no `*.vr.ts` file today,
  and this is the one entry whose absence the config cannot survive: a scoped run whose `testMatch`
  finds nothing exits 1 with "No tests found". Loud rather than silent, but it means the config and
  the CI step cannot land before the first shot exists.
- `web/playwright.e2e.config.ts` — the `projects` array splitting `e2e` from `chromium`.
- `web/package.json` — `test:e2e` and `test:e2e:ui` scoped to `--project=e2e`, plus the new
  `test:vr` and `test:vr:update`.
- `package.json` (root) — `test:web:docker` and `test:web:docker:update`, and the two existing
  `test:vr:docker*` scripts rewritten to call the helper.
- `tooling/docker-playwright.sh` — new; the shared container invocation.
- `AGENTS.md` — the "VR & a11y testing" section is scoped to `client/`; it gains the `web/` lane and
  the two new commands.
- `web/.gitignore` — the darwin-baseline line.
- `.github/workflows/ci.yml` — the new `web` job, the trimmed `e2e` job, the four artifact names,
  the `vr-report` download rename, the corrected comment, and `ci-green`'s `needs:`.
- `docs/decisions/decision-changelog.md` — **not** a new entry: both NH-320 entries land with this
  spec. What the implementing pull request owes is flipping their **six** ⏳ pending marks to ✅ —
  three in the 2026-09-21 entry and three in the 2026-09-22 one — per the "PR merge → update
  statuses" rule in `AGENTS.md`. `decision-registry.md` carries no NH-320 text at all; the change log
  was split out of it on 2026-07-15.
