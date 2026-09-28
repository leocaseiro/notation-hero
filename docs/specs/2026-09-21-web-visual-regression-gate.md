# Visual-regression gate for `web/` — NH-320

Date: 2026-09-21
Status: Designed — not implemented. v0 Plan C (the Settings and Tracks popovers) has merged, and its
two popover shots are deliberately **out of this gate** — they land after it; see "The shots".
Ticket: [NH-320](https://leocaseiro.atlassian.net/browse/NH-320)

## Goal

Give the product's own screens — `/` and `/play` — pixel screenshots that block merge, the way 49 of
the 50 component folders under `client/src/components/ui/` already have them (only `Table/` has no
`*.vr.ts`).

## Non-goals

- **Not a replacement for the targeted paint assertions.** Screenshots catch still-image faults. The
  loading-bar fade race of PR #164 is a timing bug and keeps its own test.
- **No Storybook inside `web/`.** The locked NH-275 decision stands (see "Approaches weighed").
- **No dark-mode baselines.** Dark mode is unreachable in `web/` today — see "Light only".
- **No full narrow-width pass.** One narrow shot, not every state shot twice — see "The shots".
  PR #170 puts the rail's `lg` flip in the player chrome — the breakpoint this shot covers — so a
  single viewport is no longer defensible, but shooting all nine states at both widths is what the
  small-count rule exists to prevent.
- **No sub-`sm` transport layout.** The transport footer carries a _second_ breakpoint,
  `sm:gap-6 sm:px-8` at 640 px (`web/app/play/TransportRow.tsx:102`), and both the 900 px and
  1280 px shots sit above it — so no shot sees the below-`sm` footer. Uncovered on purpose, not by
  oversight: desktop web is the v0 target and nine shots is settled.

## Why this exists

`web/` is the only UI surface in the repo with no pixel gate. The `a11y` and `vr` CI jobs both run
`pnpm --filter @notation-hero/client`, so only `client/` is covered.

This is an **omission, not a decision**. A screenshot lane for `web/` appears in no spec, plan,
handoff, registry entry, pull request or session record — it was never weighed and never rejected.
The v0 spec-review lap-3 finding _"New player components have no package home or a11y/VR gate"_
named both halves of the gap; the applied fix closed only the accessibility half.

The bug class has already shipped twice — and this gate would have caught one of them:

- **PR #162** — the seek rail rendered 0 px wide. Every `web/` browser test passed, axe included:
  a slider keeps its role, its value and its keyboard seeking whether or not a single pixel of it is
  painted. Only an ad-hoc screenshot caught it.
- **NH-315 / PR #167** — production served the design system unstyled while the same commit's
  preview deployment was perfect. **This gate would not have caught it.** Its mechanism was a
  branch-keyed Vercel build cache that outlived a change to what Tailwind scans
  (`docs/decisions/decision-changelog.md:483`), and a container that builds from scratch has no
  stale cache to serve. It is already held shut by two guards that must stay: `web/vercel.json`
  removing `.next/cache` before every build, and the `REQUIRED_SELECTORS` canary in
  `web/scripts/assert-design-system-css.mjs` — both required by `AGENTS.md:111`.

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
| `assert-design-system-css` canary       | yes — asserts the emitted CSS    | complement, not substitute          |

**Storybook inside `web/`** was rejected on three counts: it reopens the locked NH-275 decision that
the app hosts no Storybook (`docs/specs/2026-07-09-nextjs-web-client-design.md` lines 40, 43, 61 and
the ADR `docs/decisions/2026-07-12-design-system-distribution-adr.md` line 56); a `PlayerShell`
story needs a **fake AlphaTab engine**, which the v0 spec itself names as the thing to avoid
("gated while rendering fabricated options") and which the project's standing rule forbids; and it
never renders the composed page at a real width, which is the coverage this gate adds. In fairness,
a `web/` Storybook importing `web/app/globals.css` would inherit its `@source` globs and probably
_would_ have caught the 0 px rail — but the other two objections stand on their own.

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

1. **Page-level shots only** — no `toHaveScreenshot` on a clipped element. Note what the evidence
   does and does not force: the drift above was measured at `threshold: 0` / `maxDiffPixels: 0` and
   scores `0.16` against the `1408.6` cutoff consequence 3 adopts, thousands of times inside it. So
   this is a deliberate choice to keep one shot shape and one comparison policy, not a limit the
   measurement imposes — consequence 3's own note that `threshold: 0` "would make element-clipped
   shots impossible" is the same point from the other side.
2. **No mask over the notation.** The score is shot as it is drawn.
3. **Playwright's default tolerance is enough** — decided 2026-09-26. Its `threshold` defaults to
   `0.2` in YIQ colour space and `maxDiffPixels` is unset, so a pixel must differ noticeably to
   count and then a _single_ such pixel fails. The worst drift measured here is ±1/255 in one
   channel, about `0.002` in threshold units — ninety times under that threshold. Going stricter
   (`threshold: 0`) would buy nothing the evidence points at, would make element-clipped shots
   impossible, and would give the repo two comparison policies instead of one. So the shots pass no
   comparison options at all, exactly as `client/` does.

   **Run the same arithmetic the other way and it sets a floor on what a screenshot can prove.** The
   comparator's per-pixel cutoff is `35215 × threshold²`, so at `0.2` a pixel must score above
   `1408.6` to be counted at all — roughly `53/255` of luminance for a grey-on-grey step. This repo's
   surfaces sit under it: `--elevate` over `--rail` scores `80` (17× under), `--muted` over `--elevate`
   `46`, `--rail` over `--panel` `20`, `--panel` over `--background` `5`, and the engine-error panel's
   tint over `--popover` `173`. So **no shot can see a change between two of these surfaces**, at any
   crop or size — the comparison is per-pixel, so a flat region that clears no pixel's cutoff
   contributes nothing however large it is. Two consequences carry into the shot list: a shot whose
   stated coverage **is** a surface step needs a signal-side assertion rather than a tighter tolerance
   (the ghost-hover and engine-error shots), and a tenth shot proposed to guard a surface step
   should be scored against these numbers before it is written. Steps that carry chroma need nothing
   extra — the pressed transport toggle's `--primary` over `--secondary` scores `14664`, ten times
   over the cutoff.

Cost: Playwright reported **41 passed (2.2 m) for 60 runs** — about 2.2 s per shot, so a nine-shot
lane is well under a minute of test time. Measured inside
`mcr.microsoft.com/playwright:v1.61.1-noble`: the `next build` is **7 s** (cold and warm alike —
the app is three static routes, so the Turbopack cache buys nothing) and the
`pnpm install --frozen-lockfile --ignore-scripts` ahead of it is **28 s**. The dominant cost is the
install, not the build and not the screenshots — and 18.7 s of it is pnpm's own supply-chain policy
check, which is the NH-259 protection and stays.

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
    // Readiness alone can spend 100 s (30 + 60 + 10) before a pixel is compared, and the
    // config-wide default is 30 s — see "Readiness". Same number web/e2e/player.e2e.ts
    // already sets per test at :729, :781 and :812.
    timeout: 120_000,
    use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
  },
],
```

A per-project `timeout` is honoured over the 30 s default — measured — and scoping it to
`chromium` leaves the behaviour project on the budget it runs under today, so no existing test
silently gets a looser one.

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
baselines plus stray `*-chromium-darwin.png` files. `client/` never has this problem, but not
because every script is scoped — `test:e2e` and `test:e2e:ui` carry no `--project` either. It is
structural: those two point at a second config, `client/playwright.e2e.config.ts`, which declares no
`projects` array at all, so there is nothing to scope; the scripts that DO run against the
projects-carrying `client/playwright.config.ts` (`test:vr`, `test:vr:update`, `test:a11y`) are all
scoped. `web/` is putting both lanes in ONE config, so it gets neither protection for free and every
invocation must name its project. `web/package.json` therefore changes to match:

```diff
- "test:e2e": "playwright test --config=playwright.e2e.config.ts",
- "test:e2e:ui": "playwright test --config=playwright.e2e.config.ts --ui",
+ "test:e2e": "playwright test --config=playwright.e2e.config.ts --project=e2e",
+ "test:e2e:ui": "playwright test --config=playwright.e2e.config.ts --project=e2e --ui",
+ "test:vr": "playwright test --config=playwright.e2e.config.ts --project=chromium",
+ "test:vr:update": "playwright test --config=playwright.e2e.config.ts --project=chromium --update-snapshots",
```

**These scoped scripts are for local use.** CI runs `playwright test` **unscoped**, once, so both
projects share the single `webServer` and therefore the single `next build` — see the CI section
below, where that turns out to be the whole point. Locally the opposite is wanted: you regenerate
baselines without sitting through ninety behaviour tests.

### The shots

Nine. Six reach states `web/e2e/a11y.e2e.ts` has already proved reachable; two come from the PR #170
review, deferred here by the maintainer on 2026-09-22; and one covers the breakpoint #170
introduces. Keeping the count small is deliberate:
every shot is a file that moves whenever `client/` changes or AlphaTab is upgraded.

**The navigation is shared, not copied — and only the navigation.** The six states the accessibility
lane already reaches move into `web/e2e/player-states.ts`: one exported function per state,
performing the `goto`, clicks and file-picks that _reach_ it and returning immediately. Each lane
keeps its own readiness waits, because the two lanes genuinely disagree about them — the pixel lane
needs the Skeleton's stalled module to never resume while `a11y.e2e.ts:288` resumes after
5 000 ms (so the Skeleton helper takes its stall duration as an argument, and must branch rather
than pass `Infinity` to `setTimeout`, which fires immediately), and the long-score state needs the
toast **painted** for axe (`settleToasts`, `a11y.e2e.ts:224-243`) but **gone** for a screenshot. Both
lanes import it, and `a11y.e2e.ts` is refactored to call it rather than keep its own copy of the
navigation.

That costs an edit to a lane that passes today, which is the reason to think about it. The
alternative costs more: two copies of six navigations drift the moment someone renames a test id, and
the lane that drifts is the pixel one. Its failure mode is the dangerous one — a red VR run whose
quickest route to green is regenerating the baselines, which blesses a page nobody looked at. A
shared module makes a test-id rename land once.

**All of these describe `/play` as PR #170 left it** (merged 2026-09-22) — a full-bleed page with a `z-10` header, a
left `bg-rail` strip carrying the Open-file control, the notation surface, and a raised `bg-panel`
transport footer.

| Shot                      | How it is reached                                    | What only this shot covers                                                  |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Landing                   | `/`                                                  | the Play button, the one screen that is not `/play`                         |
| Player, bundled beat      | `/play`                                              | the default screen; the rail and footer surfaces asserted, not photographed |
| Player, long score        | `/play` + `Punk.gp` via `open-file-input`            | the scrolling notation box, a real filename                                 |
| First-visit Skeleton      | stall `**/alphatab/esm/alphaTab.mjs`                 | the loading state                                                           |
| Engine error              | abort `**/alphatab/esm/alphaTab.mjs`                 | the destructive error panel; its tint asserted, not photographed            |
| Transport toggles pressed | click loop, metronome, count-in, then increase tempo | pressed-state styling and the tempo percentage                              |
| Ghost hover on the rail   | hover `open-file-button`                             | `hover:bg-elevate` over `--rail`, asserted not photographed                 |
| Tooltip over the header   | hover `back-home`                                    | a portalled tooltip winning the header's `z-10` layer                       |
| Narrow viewport           | `/play` at 900 px wide                               | the rail's `w-20` state, below the `lg` breakpoint                          |

**Deferred — the two Plan C popover shots.** v0 Plan C merged (PR #176) while this document was in
review, so the Settings and Tracks popovers are on `/play` today. Their shots are still **out of this
gate**, decided 2026-09-28: this lane lands with nine, and the popover shots follow as their own
piece of work. They are worth having — app-composed UI built from `client/` primitives and rendered
only by the real Next.js build, the same shape of thing as the 0 px seek rail — so everything that
piece needs is specified here rather than left to be re-derived:

| Shot                  | How it is reached                   | What only this shot covers                                          |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| Settings popover open | click the header gear               | the accordion sections and their rows, composed                     |
| Tracks popover open   | click the transport's Tracks button | one mixer row per track plus the master foot row, over a real score |

Both belong in the player-loaded group, and each needs one wait of its own **after** the trigger
click. Without it the first baseline can be recorded while the panel is still opening, or still shut,
and every later run then matches it:

```ts
await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();
```

`Popover.tsx:44` sets that `data-slot` on the portalled panel, so no new test hook is needed, and
`Popover` shares `Tooltip`'s `isolate z-50` Positioner plus portalled Popup shape — which is why the
tooltip wait's stated reason, the open animation and the portal's position, transfers unchanged. As
merged, the panels carry `data-testid="settings-popover"` (`web/app/play/SettingsPopover.tsx:139`)
and `data-testid="tracks-popover"` (`web/app/play/TracksPopover.tsx:321`) — each in its own
component file, not in `PlayerShell.tsx`. Their `client/` halves — `Accordion`, `SettingRow`,
`TrackRow` and `MasterRow`, the mixer's foot row — each carry their own Storybook baselines already;
what these two shots would add is the composition, which no `client/` story can see.

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

**Neither this step, the engine-error tint, nor the bundled-beat screen's own surface steps are
visible to the comparator, so those shots assert them instead.** `--elevate` over `--rail` scores
`80` against the `1408.6` cutoff, so reverting to `hover:bg-muted` (`46`) changes zero counted
pixels — and that revert is the exact regression PR #170 records having shipped. The engine panel's
tint over `--popover` scores `173`, and even its `border-destructive/25` edge only reaches `1231`.
The bundled-beat screen is further under again: its `bg-rail` strip against the page background
scores `20`, and its `bg-panel` transport footer against that background `5`. Its **header is not**
one of these steps — the header paints no background of its own. Each shot therefore reads the
surface directly before the compare, the way the accessibility lane already polls `getComputedStyle`
(`web/e2e/a11y.e2e.ts:239`, `:327`) and the way the tempo-percentage caveat under Risks already
prescribes:

```ts
// Ghost hover: the step must actually change the button's surface.
const ghost = page.getByTestId('open-file-button');
const resting = await ghost.evaluate((el) => getComputedStyle(el).backgroundColor);
await ghost.hover();
await expect
  .poll(() => ghost.evaluate((el) => getComputedStyle(el).backgroundColor))
  .not.toBe(resting);

// Engine error: the tint must be there, not only the border and the red text.
const panel = page.getByTestId('engine-error');
await expect
  .poll(() =>
    panel.evaluate((el) => {
      const parent = el.parentElement;
      const own = getComputedStyle(el).backgroundColor;
      return (
        parent !== null &&
        own !== getComputedStyle(parent).backgroundColor &&
        own !== 'rgba(0, 0, 0, 0)'
      );
    }),
  )
  .toBe(true);

// Bundled beat: the rail and the transport footer must each stay distinct from the page behind
// them. Both hooks are added by this work — neither element carries a test id today.
const distinct = (testId: string) =>
  page.getByTestId(testId).evaluate((el) => {
    const parent = el.parentElement;
    const own = getComputedStyle(el).backgroundColor;
    return parent !== null && own !== getComputedStyle(parent).backgroundColor;
  });
await expect.poll(() => distinct('player-rail')).toBe(true);
await expect.poll(() => distinct('transport-row')).toBe(true);
```

**Both assertions compare two values read through the same serializer, and that is deliberate.** A
hard-coded expectation like `toHaveCSS('background-color', 'oklch(93.5% 0.006 240.4deg)')` invites the
failure this whole subsection is about: the browser resolves computed colours to its own format, so a
format mismatch makes the assertion pass — or fail — for a reason unrelated to the surface. Read the
resting value and the hovered value the same way, or read the element and its parent the same way, and
the comparison cannot go vacuous.

The pictures still earn their place: the ghost variant's `hover:text-foreground` step scores `4412`
and the error panel's red text `19698`, so each shot catches "this state did not render at all" while
its assertion catches the surface underneath.

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
80 px below Tailwind's `lg` (1024 px) and 96 px at or above it. The other eight shots are pinned at
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
- **Every state at both widths.** One narrow shot, not nine.

### Readiness, and why each wait is there

Every shot settles on explicit signals — no bare sleeps except a final short one. The waits are
**per shot**, not one recipe for all nine: three of the states deliberately never finish loading,
so the player-ready block below can never pass for them and would simply hang.

**The six player-loaded shots** (bundled beat, long score, transport toggles, ghost hover, tooltip
over the header, narrow viewport):

```ts
await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
  timeout: 30_000,
});
// engine + soundfont ready
await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
await expect(page.getByRole('progressbar', { name: 'Loading the player' })).toHaveCount(0, {
  timeout: 10_000,
});
```

**Those three numbers are the existing lane's, and they only work if the per-test budget is
raised with them.** Playwright's `expect` default is 5 000 ms, nowhere near what `/play` needs:
every readiness wait in `web/e2e/a11y.e2e.ts` and `web/e2e/player.e2e.ts` spends 30 000 ms on
the notation `svg`, 60 000 ms on `transport-play` and 10 000 ms on the bar's unmount. But a
per-test cap swallows all three — `web/playwright.e2e.config.ts` sets no `timeout`, so each test
gets Playwright's 30 000 ms default and a higher `expect` ceiling is never reached. Measured on
this version: `toBeVisible({ timeout: 60_000 })` under a config with no `timeout` fails at
exactly 30.0 s with "Test timeout of 30000ms exceeded", while the call log still reports
`Expect "toBeVisible" with timeout 60000ms`. So the pixel project carries its own budget (see
"One config, two projects").

`a11y.e2e.ts` has this gap today — its three 60 000 ms ceilings at `:315`, `:344` and `:355` are already
unreachable — and it stays green only because readiness really does arrive inside 30 s. A shot
does more after readiness than an axe sweep does (`document.fonts.ready`, the 500 ms settle,
then `toHaveScreenshot`'s two-sample compare), so the pixel lane has _less_ headroom, not more.

**The other three** settle on the signal `web/e2e/a11y.e2e.ts` already uses for that same state:

| Shot                 | Its signal                                                   | Why the block above cannot work                                |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| Landing `/`          | `getByRole('link', { name: 'Play' })` visible                | the page renders a heading and a link — neither test id exists |
| First-visit Skeleton | `getByTestId('notation-skeleton')` visible                   | the engine is stalled on purpose, so Play never enables        |
| Engine error         | `getByTestId('engine-error')` visible, `{ timeout: 15_000 }` | the engine is aborted on purpose, so Play never enables        |

All three rows run on the bare `expect` default unless a ceiling is named, and nothing breaks on a
warm run. Engine error is the only one of the three whose source line states a ceiling the table
would otherwise drop, so it carries it across; the landing and Skeleton sources name none.

**The long-score shot needs one more wait, and it is not optional.** Opening a file raises a Sonner
toast — `toast.loading('Opening …')` then `toast.success('… loaded')` (`PlayerShell.tsx:792`
and `:843`) — sharing one id, `notation-load`. Neither sets a duration, so each falls back to Sonner's
`TOAST_LIFETIME` of 4 000 ms — but that clock does **not** start at the pick. Sonner exempts a
`loading` toast from the close timer entirely (`sonner@2.0.7`, `dist/index.mjs:582`), and the id
keeps the same component instance (`:1146`), so the 4 000 ms is armed by the `toast.success` that
replaces it — at parse completion, 200 ms more before the element leaves the DOM. Every wait below
starts from that same instant (`setNotation` and `setOpening(false)` are the two lines before
`toast.success`), so the parse time cancels out of both sides and the toast is not a race: it is
reliably on screen and fully painted about a second into a 4.2-second life. That is the real reason
the wait is not optional — without it every long-score baseline is bound to a success toast carrying
the filename, over the notation box the shot exists for. It is the one shot in this list that opens
a file.

**First prove _which_ score is on screen.** Every wait above is also satisfied by the bundled beat
`/play` shows before the pick, so the shot needs the app's own per-file marker — the signal
`web/e2e/player.e2e.ts` uses throughout:

```ts
await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
  timeout: 30_000,
});
```

Measured against the built app: the ordering is already safe without it. `setNotation` and
`setOpening(false)` land in the same React commit, so `toHaveCount(0)` on the loading bar cannot
pass until the new score is in state — and it really blocks, 793–1 354 ms against 3 793–4 129 ms for
the toast. Fourteen runs all photographed `Punk.gp`. It is prescribed anyway because that safety
rests on a React detail nobody reading this file would know, and because the bar wait's first poll
lands about 15 ms from the `flushSync` that arms it. Prefer this attribute over an overflow poll:
the bundled beat measures `scrollHeight === clientHeight` exactly, so a layout that gave it one
pixel of overflow would make such a poll pass vacuously.

**Then wait for the toast to go:**

```ts
await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10_000 });
```

Both of the long-score waits name their own ceiling, for the same reason every wait above does: bare
`expect` falls back to 5 000 ms, and the toast's measured life reaches 4 129 ms, so the default would
leave 871 ms of slack — measured at `--workers=1`, while CI runs several. The `data-file` assertion
takes the 30 000 ms its source line already uses (`web/e2e/player.e2e.ts:196`, with the
`timeout: 30_000` literal on `:197`), since after the
loading-bar wait it is the gate on parse completion.

One thing the first baseline will contain: the long-score shot shows the **Play** tooltip, because a
successful open moves focus to the transport (`PlayerShell` calls `playRef.current?.focus()`). It is
deterministic — identical bytes across fourteen runs — but a reviewer approving that baseline should
expect it.

The bundled-beat shot needs none of this — AlphaTab loads that score itself and nothing announces
it. Any shot added later that reaches its state by opening a file needs the same wait.

> Note for whoever writes this: the maintainer intends **error** toasts to stop auto-dismissing,
> while success toasts keep fading (stated 2026-09-26). None of the nine shots raises an error
> toast today — the engine-error state reports through its own `role="alert"` panel, not a toast —
> but once that lands, a shot that does raise one will need it dismissed rather than waited out.

**All nine** then finish identically:

```ts
await page.evaluate(async () => {
  await document.fonts.ready;
});
await page.waitForTimeout(500);
```

The two hover shots add one wait of their own — `[data-slot="tooltip-content"][data-open]` visible,
the locator `web/e2e/player.e2e.ts:1183` already defines for exactly this. Not because of an open
delay: `Tooltip.tsx` defaults `delay` and `closeDelay` to `0` and neither trigger overrides them.
What needs settling is the open animation and the portal's position.

The Skeleton shot's route handler must **stall
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
+ # VR baselines are Linux-only. A local `test:vr:update` on a Mac writes darwin shots
+ # for quick local iteration — they must never be committed (regenerate via test:web:docker).
+ *-chromium-darwin.png
```

### CI — `web/`'s whole browser lane moves into the container

`web/` is built more than once per CI run today, and this must not add another. Two places build
it: the `build` job (`pnpm run build` at `ci.yml:187`, which fans out to every package) and the
`e2e` job's Playwright `webServer`. Bolting a VR step onto the existing `vr` job, or adding a
separate `web-vr` job, would each add a third.

|                                       | today | add a step to `vr` | new `web-vr` job | **move the lane (chosen)** |
| ------------------------------------- | ----- | ------------------ | ---------------- | -------------------------- |
| `web` builds per CI run               | 2     | 3                  | 3                | **2**                      |
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

**One invocation, not two — and this is load-bearing.** The job runs `playwright test` **once, with
no `--project`**, so both projects run against one server:

```yaml
- name: web browser lane (end-to-end + accessibility + visual regression)
  run: pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts
```

Two scoped steps would **not** share the server, and the whole reason for putting this lane in one
job would evaporate. Playwright registers the `webServer` per **invocation** and tears it down when
that invocation ends, so a second `playwright test` call starts its own `pnpm build && pnpm start`.
Measured, not assumed: a throwaway two-project config whose server logged every boot recorded **one**
boot for a single unscoped run and **two** for two scoped runs, with the port confirmed dead in
between. (`reuseExistingServer` is `false` under `CI`, so a server that somehow did survive would
make the second step fail with "is already used" rather than be reused.)

Nothing is lost by combining them: Playwright's HTML report and its `list` reporter both print the
project name on every test, so a red run still says whether the pixel lane or the behaviour lane
failed. The scoped `test:e2e` and `test:vr` scripts stay for local use, where running one lane at a
time is the point.

One invocation also means one output folder and no collision — the two lanes cannot overwrite each
other's report, because there is only one run.

**Artifact names, and a rename that makes them symmetric.** `actions/upload-artifact` v4 and later
reject a duplicate name inside one run with a 409, and `ci.yml` already warns about exactly that on
the step being changed. Today's two names do not say which package they came from, which stops
working the moment `web/` has its own. So all three become explicit:

| Job                             | Artifact                       |
| ------------------------------- | ------------------------------ |
| `vr` (client Storybook VR)      | `playwright-client-vr-report`  |
| `e2e` (client only, after this) | `playwright-client-e2e-report` |
| `web` (both lanes, one run)     | `playwright-web-report`        |

The rename is three lines in `ci.yml`: the `vr` job's upload (line 227), the `vr-report` job's
matching download (line 261), and the `e2e` job's upload (line 402). `vr-report` must move with its
artifact or it silently stops finding the report it publishes.

The `e2e` job's upload also **drops** `web/playwright-report/` and `web/test-results/` from its
`path:` list — those paths belong to the new job now.

**The new job's upload step, spelled out — the `if:` is what makes the failure path work.** An
unguarded step never runs on the one run that needs it, because GitHub skips a job's remaining steps
once a step fails, and `web/` gets no hosted diff page as a fallback:

```yaml
- name: Upload the web Playwright report
  # NOT `if: failure()` — keep the trace of a flaky-then-passed retry (matches vr and e2e, D5).
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

Both sibling uploads carry that condition, that reason and that SHA pin already (`ci.yml:235` and
`:410`), and both set the same `retention-days` and `if-no-files-found`. The `path:` spellings are the
ones `tooling/workflow-guards.test.mjs:47` and `:48` pin, trailing slash included.

**Two comments need correcting rather than deleting, and one of them is not in `ci.yml`.** The
`e2e` job's header (`ci.yml:385-391`) describes a job that is about to stop running `web/` at all,
so four of its clauses go false at once: "two Playwright lanes" becomes one, the whole "web/: the
built Next.js app (`next build` then `next start`)" sentence moves to the new job, "which is the
only gate over the product's own UI" now points at a gate that lives elsewhere, and "Each package
needs its own browser install" stops being true in either direction — the trimmed `e2e` job
installs only for `client/`, and the container job installs nothing. The clause that survives is
"it is not pixel-exact, so no Playwright container": the remaining client half still is not, and
that is still why it has none — only the "unlike `vr`" comparison needs rewording, because `vr` is
no longer the only container job. "web/ has no Storybook, so neither `vr` nor `a11y` covers it"
stays true but belongs with the new job rather than this one.

`web/playwright.e2e.config.ts`'s own header (`:3-5`) carries the stale claim from the other side —
"web/ has no Storybook, so no VR or axe job covers it". The `web` job this document adds is a VR
job over that very config, so that clause goes; the no-Storybook fact stays, because it is still
the reason the lane is shaped this way.

**Blocking from day one.** `web` joins `ci-green`'s `needs:` list alongside `a11y`, `vr` and `e2e`.
`client/` VR already blocks, and a visual gate nobody has to obey is one people learn to scroll
past. Be honest about how much determinism evidence stands behind that: the sixty-run study covered
`/play`'s default loaded state, and the long-score state was byte-identical across fourteen runs —
two of the nine shots. The other seven (landing, Skeleton, engine error, transport toggles, ghost
hover, header tooltip, narrow viewport) are unmeasured. What absorbs a one-off blip is not the study
but the mechanism:
`retries: 2` on CI plus each shot's `document.fonts.ready` and 500 ms settle — the same absorber the
parallelism caveat under Risks already names.

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
expanded command is written out in `docs/runbooks/vr-a11y-testing.md` (lines 27-34) — that block,
with its seven `-v` flags and its pinned image tag, is what goes stale if the helper lands without
it. The other two do not: `AGENTS.md`'s VR section is three summary lines that link the runbook, and
`client/README.md` (lines 152-153) names only the two root script names, whose interface this
refactor preserves — the helper rewrites those scripts' bodies, not their names. Neither file spells
out the command that changes.

## Risks and caveats

- **Baseline churn.** Every `client/` visual change and every AlphaTab upgrade moves these
  baselines too. Nine shots is the mitigation; adding a tenth should have to justify itself.
- **The shot list was re-derived from PR #170 and re-checked after it merged.** Every element it
  names is on `master`: the rail at `PlayerShell.tsx:1033` (`w-20 … lg:w-24`, `bg-rail`), the
  header's layer at `:959` (`relative z-10`) over a `h-16` header, the ghost Open-file button at
  `OpenFileControl.tsx:126` with its tooltip, `back-home` in the header, and the `--rail`, `--panel`
  and `--elevate` tokens in `client/src/styles.css`. **Line numbers drift, and not only in this
  file.** Every citation in this document was re-taken against `master` on 2026-09-29, after four
  merged PRs had moved them by between 5 and 433 lines — re-read the source before writing the
  lane rather than trusting any line number here, in any file.
- **The shots run in parallel, like every other test here — decided 2026-09-26.** The 60-run
  measurement was taken at `--workers=1`, so these particular shots are untested in parallel. The
  decision rests on precedent instead: `client/playwright.config.ts` sets `fullyParallel: true` with
  no pinned worker count, CI pins none either, and **698 pixel tests already run that way and block
  merge**. Nine more is a rounding error, and `retries: 2` on CI already absorbs a one-off timing
  blip. The one honest difference is that `client/`'s shots are small isolated Storybook components
  while these are full pages driving a real engine and a soundfont download — heavier, more moving
  parts. If that difference bites, `fullyParallel: false` on the VR project costs about 25 seconds
  for the whole lane and is a one-line change — but read what it actually does first. It serialises
  only the shots **within each file**; the 91 behaviour tests keep running concurrently against the
  same server, which is where the contention comes from, so it does not restore the conditions the
  60-run study was measured under. Playwright's first-class remedy for that is `dependencies:
['e2e']` on the `chromium` project, measured under one unscoped invocation and one `webServer`:
  both behaviour files finish, **then** the shots run. Pair it with `fullyParallel: false` — or
  `workers: 1`, which `TestProject` does accept — to serialise the shots among themselves. Its
  accepted cost: a red behaviour test makes the pixel project report _"did not run"_. The run is
  red so merge still blocks, but it compares zero pixels, and `retries: 2` makes a persistent
  failure cost the whole pixel lane. The separate `web-vr` job below stays the documented fallback,
  not the first remedy.
- **Moving the 91 existing `web/` browser tests into the container may change their timing.** This
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
- **Three shots guard a surface step the comparator cannot see.** The bundled-beat rail (`20`) and
  its transport footer (`5`), the ghost-hover step (`80`) and the engine-error tint (`173`) all fall
  under the `1408.6` per-pixel cutoff, so their pictures prove the state rendered but not that the
  surface is right. Each carries a computed `background-color` assertion for that reason — drop one
  and that shot silently stops covering the thing it was added for, with the screenshot still green.
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

So a red `web` VR is read the way any other Playwright failure is: download `playwright-web-report`
from the run's Artifacts and open it with `npx playwright show-report`. Revisit the day that download
becomes a real annoyance — then there is a measured case to size the work against.

## Process changes this carries

**Every file below is edited by the PR that IMPLEMENTS this gate, not by the PR carrying this
document.** This spec changes nothing outside `docs/`. The list exists so the implementing PR can be
checked against a stated footprint — and so a reviewer seeing one of these files in that diff knows
it was planned rather than smuggled in.

- `web/e2e/player-states.ts` — **new**; one exported function per player state, imported by both
  browser lanes.
- `web/e2e/a11y.e2e.ts` — refactored to import those functions instead of carrying its own copies.
  That reaches further than the six states with a VR counterpart: the three with none — narrow
  700 px (`:341`), the Settings popover (`:353`) and the Tracks popover (`:371`) — each reach
  `/play` by hand today (`:343`, `:354`, `:372`), and two of them reuse navigations already being
  extracted. Their `goto`s move into `player-states.ts` as well. Only the navigation moves; this
  adds no popover shots, and each case keeps its own readiness waits per the rule above.
  Its comment at `:111-113` also has stale figures: it says the sample renders 185 px, `Punk.gp`
  1,026 px and the box 420 px, where the measured values at this viewport are 576, 852 and 576.
  The conclusion it draws still holds; the three numbers do not.
  No change to what it asserts.
- `web/e2e/*.vr.ts` — **new**; the nine shots themselves. Each calls `failOnUnexpectedPageErrors()`
  at module scope next to its imports, as `player.e2e.ts:10` and `a11y.e2e.ts:8` already do. This is
  a requirement, not a nicety: `web/e2e/toast-occlusion.e2e.ts` does **not** install it, so a
  `web/e2e` file can silently omit it — and NH-335, an uncaught `TypeError` out of the notation
  engine's worker, went unnoticed for a whole merged PR. A screenshot comparison is even less likely
  than a behaviour assertion to notice a throw. Its allowance is origin-scoped to the engine bundle,
  so the deliberately-broken Skeleton and engine-error states still pass. `web/` contains no
  `*.vr.ts` file today,
  and **nothing fails if the first one never arrives.** The scoped `pnpm --filter
@notation-hero/web run test:vr` does exit 1 with "No tests found" — measured — but CI runs
  `playwright test` unscoped, and Playwright raises that error only when the WHOLE root suite is
  empty (`!testRun.rootSuite?.allTests().length`, `playwright/lib/runner/index.js:6027`). The
  existing behaviour and axe tests keep it non-empty, so an unscoped run over this config with an
  empty `chromium` project exits **0** — also measured. A merge-blocking gate would read as green
  over zero pixels. So the guard belongs with the shots, in
  `tooling/workflow-guards.test.mjs` — already in this footprint, and already inside the `quality`
  job `ci-green` waits on.

  **Counting filenames is not enough.** A file can be present and still compare nothing: empty, all
  `test.skip`, or carrying no `toHaveScreenshot` at all. Playwright's `forbidOnly` catches `.only`;
  nothing in this repo catches `.skip` or `.fixme`. The pattern allows `describe.` deliberately:
  the narrow-viewport shot needs a `test.describe()` wrapper (see above), so `test.describe.skip(`
  is the natural way to park it and a pattern anchored straight to `test.` would miss it. The
  trailing `\(` stays — without it the assertion matches any prose occurrence, a snapshot filename
  or a commented-out line. The same file's own comment at `:38-39` warns
  that an unanchored presence check stays green against a commented-out step. **Nor is the shot
  files' own content enough**: the `chromium` project is what makes them run, and deleting it — or
  mistyping its `testMatch` — leaves an unscoped run exiting **0** with every filename still in
  place, measured both ways on Playwright 1.61.1. So the guard reads the config too, and asserts
  what it actually means:

  ```js
  test('the web VR project has at least one shot to run', () => {
    const dir = new URL('../web/e2e/', import.meta.url);
    const shots = readdirSync(dir).filter((f) => f.endsWith('.vr.ts'));
    assert.ok(shots.length > 0, 'web/e2e has no *.vr.ts — the chromium project runs nothing');

    const sources = shots.map((f) => readFileSync(new URL(f, dir), 'utf8'));
    shots.forEach((f, i) => {
      assert.doesNotMatch(
        sources[i],
        /\btest\.(?:describe\.)?(?:skip|fixme)\s*\(/,
        `${f} disables a shot`,
      );
    });
    assert.ok(
      sources.some((src) => src.includes('toHaveScreenshot(')),
      'no *.vr.ts calls toHaveScreenshot — the chromium project compares nothing',
    );

    const cfg = readFileSync(new URL('../web/playwright.e2e.config.ts', import.meta.url), 'utf8');
    assert.match(cfg, /name:\s*'chromium'/, 'the chromium project is gone — the shots never run');
    assert.match(cfg, /testMatch:\s*'\*\*\/\*\.vr\.ts'/, 'chromium no longer matches *.vr.ts');
  });
  ```

  `readFileSync` and `fileURLToPath` are already imported in that file; `readdirSync` is the one
  addition to its `node:fs` import.

- `web/app/play/PlayerShell.tsx` — `data-testid="player-rail"` on the `bg-rail` `<aside>` (`:1033`).
  The rail carries no test hook today, and the bundled-beat surface assertion needs one.
- `web/app/play/TransportRow.tsx` — `data-testid="transport-row"` on the `bg-panel` footer (`:102`).
  Same reason. A class-based locator was rejected: `PlayerHeader.tsx:193` also carries `bg-panel`,
  so `.bg-panel` alone is ambiguous, and pinning a test to a styling utility is not the idiom the
  ghost-hover and engine-error shots already use.
- `web/playwright.e2e.config.ts` — the `projects` array splitting `e2e` from `chromium`, plus its
  header comment, which still says no VR job covers `web/`.
- `web/package.json` — `test:e2e` and `test:e2e:ui` scoped to `--project=e2e`, plus the new
  `test:vr` and `test:vr:update`.
- `package.json` (root) — `test:web:docker` and `test:web:docker:update`, and the two existing
  `test:vr:docker*` scripts rewritten to call the helper.
- `tooling/docker-playwright.sh` — new; the shared container invocation.
- `AGENTS.md` — the "VR & a11y testing" section is scoped to `client/`; it gains the `web/` lane and
  the two new commands.
- `web/.gitignore` — the darwin-baseline line.
- `.github/workflows/ci.yml` — the new `web` job, the trimmed `e2e` job, the three artifact names,
  the `vr-report` download rename, the corrected comments, and `ci-green`'s `needs:`. Also the
  `vr-report-resolve` job (`:341`), which is easy to miss: it keys on `needs.vr.result` alone and
  rewrites the sticky comment to _"✅ VR passing on `<sha>` — no visual diffs to review"_, which after
  this change is true of only one of two VR lanes. Scope that wording to the client lane. The merge
  still blocks on a red `web` either way, so this is a comment that contradicts its own run rather
  than a hole in the gate, and it needs a pull request where `client/` VR had already gone red once
  — the job only ever UPDATES an existing comment, never creates one on a green pull request.
  `docs/specs/2026-07-08-vr-report-gh-pages-on-failure.md:35` and `:38` name the old
  artifact; correct those two.
- `docs/specs/2026-06-26-nh-197-e2e-traces.md` — three live references to the old name, on the same
  reasoning: it describes a mechanism that is still in force, not a record of what was decided.
  `:186` is the upload's `name:`, and `:206` and `:223` tell a reader to download
  `playwright-e2e-report` to debug a CI failure — an artifact that will not exist. All three become
  `playwright-client-e2e-report`. The change-log and registry entries for NH-197 keep the old name:
  those are records of what was decided at the time, and stay as history.
- `tooling/workflow-guards.test.mjs` — the Node test that pins today's `e2e` job in source, and
  the one file in this list whose failure you cannot see before pushing. Two assertions break:
  `:40` requires a literal `run: pnpm --filter @notation-hero/web run test:e2e` line, which the
  trimmed `e2e` job no longer has, and `:44` requires a
  `pnpm --filter @notation-hero/web exec playwright install --with-deps chromium` line, which the
  container job deliberately does not need. **They need different remedies.** `:40`'s literal is
  rewritten to the new job's actual run line, `pnpm --filter @notation-hero/web exec playwright test
--config=playwright.e2e.config.ts` — note that is not `run test:e2e` either, so it is a rewrite
  rather than a repoint. `:44` has nothing left in `ci.yml` to point at, so it is **replaced** by an
  assertion pinning the new job's `container: mcr.microsoft.com/playwright:v1.61.1-noble` line —
  **sliced to the `web` job's own block**, the way that file's existing job-sliced test at `:65-73`
  already does. The scoping is what makes the pin real: that exact literal already appears in
  `ci.yml` for the `vr` job, so an unscoped assertion passes before the new job exists at all. The
  pin is what makes "no install needed" true, and nothing in the suite pins it today. The test
  case is even named _"the e2e job runs the web Playwright lane, not only the client one"_, which
  stops being what the workflow does. Two more (`:47`, `:48`) require the literals
  `web/playwright-report/` and `web/test-results/` to appear in `ci.yml`, so the new job's `path:`
  list must keep those exact spellings, trailing slash included. And `:51` pins `e2e,` in
  `ci-green`'s `needs:` as the proof the lane blocks merge; after the move that proof is `web,`, so
  the new job needs its own assertion or the guard no longer guards what its comment claims.
  **It runs only in CI:** via the ROOT `pnpm run test:tooling` (`ci.yml:105`, inside the `quality`
  job `ci-green` waits on), while the pre-push hook runs `pnpm -r --if-present run test`, which
  pnpm scopes to "5 of 6 workspace projects" — the root is excluded, so the script is never
  reached. Green push, red CI. Run `pnpm run test:tooling` by hand before pushing this one.
- `client/README.md` — lines 178 and 216 name `playwright-vr-report` and `playwright-e2e-report`.
  Both become the renamed `playwright-client-*` artifacts.
- `docs/runbooks/vr-a11y-testing.md` — more than two spot edits, because `AGENTS.md` points at this
  file as the full reference and `AGENTS.md` is gaining the `web/` lane. Line 50 names
  `playwright-e2e-report` and lines 27-34 hold the expanded `docker run` block the helper replaces;
  beyond those, the title (line 1) and the "Four test layers" heading (line 6) are both scoped
  `client/`, and the `test:vr:docker` pair at lines 19-22 is where the new `test:web:docker` and
  `test:web:docker:update` belong. It gains a `web/` lane section: the nine shots, the
  Linux-only baseline rule (line 15 applies to `web/` too), the two new commands, and the
  `playwright-web-report` artifact to download on a red run.
- This document's own **Status** line (line 4) — "Designed — not implemented" becomes implemented, the
  way `docs/specs/2026-07-08-vr-report-gh-pages-on-failure.md:4` and
  `docs/specs/2026-06-24-pr-checklist-auto-inject.md:3` already read.
- `docs/decisions/decision-changelog.md` — **not** a new entry: both NH-320 entries land with this
  spec. What the implementing pull request owes is flipping their **six** ⏳ pending marks to ✅ —
  three in the 2026-09-21 entry and three in the 2026-09-22 one — per the "PR merge → update
  statuses" rule in `AGENTS.md`. `decision-registry.md` carries no NH-320 text at all; the change log
  was split out of it on 2026-07-15.
