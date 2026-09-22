# Decision Registry — Notation Hero

> Single source of truth: **what's decided, its status, and whether a machine enforces it.**
> Auto-derived (line-cited) from the locked decision docs. Rows flagged 🟥 are decided rules with **no machine check today** — the Task-3 lint backlog.
> Generated 2026-06-11. Source: `2026-06-09-tooling-stack-daci.md`, `2026-06-09-catalog-store-postgres-neon.md`, `2026-06-10-catalog-schema.md`.

Legend — status: 🔒 locked-active · 💤 deferred (first-use trigger) · ✅ done · ⏳ pending · ⛔ superseded — enforcement: 🤖 machine · 🟡 partial · 📄 prose-only · — n/a

## Change log — manual approvals & merge status updates

Living record (newest first). Per AGENTS.md "Decision governance": every decision leocaseiro manually approves lands here, and every PR merge updates affected statuses here.

> **Merge note (NH-16):** this file is `merge=union` (see `.gitattributes`) — when two PRs each add a change-log entry, git keeps **both** instead of conflicting. Entries may land slightly out of newest-first order after such a merge; re-sort by hand if it matters.

### 2026-09-21 — The running build names itself, in the wordmark (NH-317)

Nothing on screen said which build you were looking at. When production and a preview disagree —
as they did the same day, with production serving stale CSS — that is the first question asked, and
there was no way to answer it. Decisions below, each approved by the maintainer in conversation.

- **The version names its CHANNEL first, so a preview can never read as production.** Three shapes:
  `local` on a developer machine, `pr-168.26.09.21-1143.5f027f6` on a Vercel preview, and
  `v0.26.09.21-1143.5f027f6` in production — a channel, a two-digit Sydney date, the 24-hour build
  time, then the short commit. The first draft stamped every build `v26.09.21-…` alike; the
  maintainer asked for the three to be separated, because a preview wearing the production name
  answers "which build is this?" wrongly, which is the one job the string has. `v0` is the release
  line and the only part a person chooses — it is a named constant, to be bumped as the product
  versions. A local build carries no stamp at all: on your own machine you know what you built.
  🤖 `tooling/app-version.test.mjs`, including a case asserting that a preview and a production
  build of the SAME commit never read alike.
- **A branch pushed before its pull request exists reads `preview.…`, not `pr-.…`.** Vercel
  documents `VERCEL_GIT_PULL_REQUEST_ID` as an empty string in that window, and any `VERCEL_ENV`
  that is not exactly `production` — a custom environment included — is treated as a preview, so
  nothing but production can wear the release prefix.
- **The date format follows the maintainer's format string, not his bash snippet.** The two
  disagreed (two-digit versus four-digit year, a dot versus a dash before the commit); asked which
  won, he chose the format string, which his own worked example had already agreed with.
- **The stamp is BUILD time, not commit time.** The commit already identifies the code, so the
  useful second fact is when this deploy was made — rebuilding one commit gives a new stamp.
- **Always `Australia/Sydney`, and the ZONE is named rather than an offset hard-coded.** Vercel
  builds in UTC, which reads as the wrong day for most of the evening here. Naming the zone is what
  makes AEDT and AEST resolve themselves by date, with no switch to maintain twice a year. 🤖
  `tooling/app-version.test.mjs` pins both, plus the date rolling over and midnight as `0000`.
- **The wordmark is a LINK home, not a button.** It was inert text; a tooltip needs a focusable
  trigger, and the maintainer chose a link — so the wordmark gains a purpose and the version is
  reachable by keyboard rather than hover alone. `href="/"` survives a sub-path deploy untouched
  because `next/link` applies `basePath` itself (`next/image` is the exception — its `src` needs the
  prefix spelled out). `min-h-11` is load-bearing, not decoration: the a11y lane fails any `a[href]`
  under 44 px and the wordmark's line box is 32.
- **The value travels through the ENVIRONMENT, not next.config's `env` key.** The Next 16 docs
  bundled in the installed package mark that key `version: legacy` and point at the environment
  instead, where `next build` inlines it.

### 2026-09-21 — The web build must not trust a restored cache (NH-315)

Production served the v0 seek rail with no width and no colour, while the SAME commit's preview
deployment was correct. The markup was right; the emitted CSS was 13 selectors short, and every one
of them came from a plain `.ts` class module — `Slider/SliderClasses.ts`, `DataTable/ColumnMeta.ts`
— reachable only through the `@source '../../client/src/components/ui/**/*.ts'` line that landed in
that very commit.

- **Vercel's build cache is keyed on the branch, never on source content, so `master`'s cache
  outlived a change to what Tailwind scans.** The key is account/team, project, framework preset,
  root directory, Node version, package manager and git branch. A new branch gets a fresh cache
  seeded from the last production deployment — which is precisely why the PR preview was right and
  production was wrong, and why a preview is not on its own evidence that production will render.
  The web build now removes `.next/cache` before every build. The whole folder goes, not just its
  `turbopack/` subfolder, so an upgrade that moves where the scan is remembered cannot quietly undo
  it; `node_modules` stays cached and the measured cost is about three seconds. 🤖 `web/vercel.json`.
- **A build that emits the design system unstyled now FAILS — new.** Nothing caught this class of
  bug before: the slider keeps its role, its value and its keyboard seeking whether or not a single
  pixel of it is painted, so the unit tests, the e2e lane against a clean build, and a person
  reviewing a screenshot all passed. `web/scripts/assert-design-system-css.mjs` reads the emitted
  CSS for the selectors that reach it only through the `.ts` scan, and exits 1 naming each missing
  one and what it breaks on screen. It runs locally, in CI and on Vercel. 🤖 wired into `web build`.
- **`scripts/` is excluded from Tailwind's automatic source detection, or the guard blinds
  itself.** Naming a utility inside the guard is enough for Tailwind to GENERATE it: with
  `scripts/` scanned the guard reported 1 of 5 missing instead of 5 of 5. Verified both ways — with
  the `.ts` scan lost the build exits 1 on all five; with it present the CSS is byte-identical to a
  known-good build.

### 2026-09-20 — Plan B, first hands-on round: sixteen findings, and what they changed (NH-291)

The maintainer tested PR #162 by hand and raised sixteen items. Each was reproduced in a real
browser before it was touched; the two runtime bugs were each attacked by a second, independent
investigation before the fix was trusted. What follows is what CHANGED a decision or what is
enforced — the plain bug fixes are in the commits.

- **A seek that lands outside the selected bars lets the selection go; one that lands inside keeps
  it — new.** Scenario: bars are selected for Loop, the person drags the seek bar beyond them and
  presses Play. The button turned into Pause, nothing moved, and Pause fell back to the old
  position. In AlphaTab 1.8.4 a seek outside an active playback range leaves the sequencer clamped
  to the range's end while the reported time is the requested one; Play renders empty buffers and
  the finish check never runs. The first fix cleared the selection on EVERY scrub. The maintainer
  chose the finer rule (_"I would prefer your option 2"_): practising bars 5–8 and scrubbing back
  to bar 6 must not throw the selection away. Inside or outside is read off AlphaTab's own reply
  to the seek — the selection is kept in ticks, the seek bar works in milliseconds, and the main
  thread cannot convert one into the other. Outside: the range is cleared and the seek made
  again, and playback is restarted if it was running (AlphaTab stops the player the moment a seek
  leaves the range). **One case gets no reply at all — a seek during a count-in, when the score is
  not playing yet — so after 250 ms without one the selection is let go:** guessing "inside" there
  risks the frozen player, guessing "outside" only costs selecting the bars again. Opening a file
  clears the range too: AlphaTab kept the old score's range on the main thread while the new
  sequencer had none. 🤖 five e2e cases, real mouse.
- **The loading bar means "the player is not ready yet" — superseding the spec's "soundfont only"
  bar (§4) and the plan's delay-then-hold.** It used to wait 300 ms for soundfont progress before
  showing. On a warm cache AlphaTab reports the whole file in two events a millisecond apart, at
  the END of the wait, so that timer could never finish: a 20-second load on a slow connection
  showed no bar at all. Maintainer: _"I would like to show always on 0ms if possible. I would
  prefer a flash, or a timeout to fade-out the progress bar."_ It is now in the server HTML,
  indeterminate until bytes flow, a real fraction (still the soundfont's — the engine files report
  none) while they do, held at 100 % for 400 ms and faded over 300 ms. It shows nothing on a
  failure, and it also covers opening a file, committed with `flushSync` so it is painted before
  the synchronous parse. 🤖 two e2e cases, one on a warm cache; the fade is asserted from a
  per-frame opacity trace, because Playwright's `toBeVisible()` passes at opacity 0.
- **The seek bar works in milliseconds — superseding the plan's whole-second Scrubber.** The plan
  argued one second "is the granularity a drummer wants". In the hand it was two faults: the thumb
  jumped once a second during playback, and it could not be put in the middle of a bar. Base UI
  has ONE step for pointer and keyboard, so `Slider` gained `keyStep` (arrow keys: one second),
  `largeStep` (Shift+Arrow, PageUp/PageDown: ten) and `valueText` (a listener hears "01:42 of
  04:20", not a millisecond count). Pixel-identical; no baseline changed.
- **The tempo field has no drag-to-change gesture — superseding the plan's "drag-scrubbable".**
  Base UI's `ScrubArea` wrapped the input; it cancels pointerdown and sets `user-select: none`
  inside it, so the number could not be selected with the mouse. Maintainer: _"Shouldn't we only
  change up/down like the native input number?"_ The wheel, the arrow keys, the `±` buttons with
  hold-to-repeat and typing all stay.
- **The Metronome glyph is decided — NH-294 resolved.** The mockup's inline SVG, whose provenance
  the plan called unestablished, is byte-identical to `metronome` from Material Design Icons
  (Pictogrammers), Apache-2.0. It replaces the `avg_pace` placeholder.
- **The transport follows the mockup's shapes.** Open file is FIRST in the row (the mockup keeps it
  bottom-left; v0 has no rail) as a borderless 48 px icon, and `trailing` is free again for Plan
  C's Tracks trigger. Play is a solid teal circle with solid glyphs — inline paths, because the
  self-hosted Material Symbols face carries the weight axis only and ignores `FILL 1`. The header
  is the mockup's three columns with the tempo pill centred in a bordered pill; the right column
  waits for Plan C's Settings gear. **No plan owns "match the mockup" as a goal** — each plan owns
  the elements it adds; the page chrome (dark shell, left rail, pinned footer) belongs to no plan
  yet. Plan C's Task 7 refers to an "existing `Separator`" in the row that does not exist.
- **Every icon button has a tooltip that tells its state, always present.** A tooltip that came
  and went swapped the wrapped and the bare element, which remounted the button and dropped its
  focus. A disabled toggle's tooltip now opens under the mouse too: its trigger is a span AROUND
  the button, because a disabled `Button` is `pointer-events: none` and never saw the hover — the
  hint saying why Metronome and Count-In are unavailable opened on keyboard focus only.
- **The drop zone's dashed outline is scoped to its own class.** Base UI's Slider marks its
  elements `data-dragging` while a thumb is held, and a bare `[data-dragging]` rule drew the drop
  zone's outline around the seek bar on every scrub.
- **The "Opening…" toast waits for Sonner to mount it, bounded — superseding the fixed two
  frames.** Exactly enough on an idle page, not on a slow one: under a 20x CPU throttle the toast
  reached the screen only after the parse had finished.

**Answered, not built (the maintainer's question 16).** A score with an embedded recording plays
through AlphaTab's backing-track player, whose synthesiser stubs out the metronome — so Metronome
and Count-In are disabled there, by design. **No plan (A, B or C) builds a switch to the
synthesiser**, and NH-298, which the docs name for it, does not list it. AlphaTab 1.8.4 does allow
the switch at runtime: `settings.player.playerMode = EnabledSynthesizer` plus `api.updateSettings()`
swapped the player in about 100 ms, measured, and the metronome then played.

**Found on the way, not fixed here — each has a ticket:** a close button on toasts is not trivial
(Sonner's is 20 px, under the 44 px gate, and unreadable in dark mode) —
[NH-311](https://leocaseiro.atlassian.net/browse/NH-311); pausing INSIDE a count-in and pressing
Play again hangs the player (upstream: `_onSamplesPlayed` returns on a zero count before its
finish check) — [NH-312](https://leocaseiro.atlassian.net/browse/NH-312); and `playerReady`
latches true, so Play stays enabled while a soundfont reloads after a recording file is replaced
by a synth file — [NH-313](https://leocaseiro.atlassian.net/browse/NH-313). The maintainer also
asked for a hover preview on the seek bar (a lighter fill up to the pointer and the time under
it) and chose to build it as its own PR — [NH-310](https://leocaseiro.atlassian.net/browse/NH-310).
The recording-versus-synthesiser switch is being added to Plan C by the maintainer.

### 2026-09-20 — v0 Plan B shipped: the transport, and six decisions made while building it (NH-291)

Plan B (playback control) is implemented: a seek bar that scrubs, a tempo control in the header,
Loop / Metronome / Count-In toggles, and a progress bar for the soundfont download.

**What the plan already carried, now shipped**

- **The design system gained `Slider`, `Progress`, `Scrubber`, `TransportToggle` and
  `TempoControl` — ✅, all gated by VR + axe.** (`Tooltip` was already public — Plan A exported it.)
- **Every new control is built on a Base UI primitive** (`Slider`, `Progress`, `Toggle`,
  `NumberField`) rather than hand-rolled — the standing convention, ratified again in the
  2026-09-13 plan review.
- **Spec Delta on the tempo control.** The percentage shows on hover or focus and never at 100 %,
  the step is `± 1` with hold-to-repeat instead of `± 5`, and the linger is 3 s — superseding the
  "only while adjusting, ±5" line in `docs/specs/2026-09-10-v0-local-file-player-design.md` §7.
- **Vocabulary.** A piece of music is a **`score`**; a **`notation`** is the score file; "chart"
  is not used.
- **`applySpeed` in `PlayerShell` is the single writer of `api.playbackSpeed`.** v0 ships two
  controls over one speed value — the header BPM stepper and Plan C's speed slider in the Settings
  popover's Player group — and both must route through `applySpeed`. This supersedes the
  settings-row example in the spec's §7: `playbackSpeed` is an `AlphaTabApi` property, not a field
  in AlphaTab's `Settings` JSON, so a row wired like its neighbours writes a value the engine never
  sees — the slider moves, the `%` updates, the audio does not.

**Decided by the maintainer on 2026-09-20, while it was being built**

- **`TransportToggle` renders through the design system's `Button` — superseding the plan's
  natively disabled `Toggle`.** The plan rendered Metronome and Count-In `disabled` with a tooltip
  saying why (the file is playing its own recording), on Base UI's `Toggle`, which sets the native
  attribute. A natively disabled button takes no focus and no hover, so that tooltip could never
  open, for anyone. Base UI's `Toggle` now owns only the pressed state and renders THROUGH `Button`
  (`render` prop — one `<button>`, no nesting); `Button` owns the look and the disabled state, so
  disabled is `aria-disabled`, the control stays in the tab order, and the tooltip opens on focus.
  Reasoning given: _"Use our `<Button />` component which should handle that for you, making a11y
  working when disabled."_ All three disabled-capable button kinds now agree: `Button` (NH-304),
  `TransportToggle`, and Base UI's own `NumberField` steppers, which keep `aria-disabled` by
  themselves (the plan's claim that they set the native attribute was wrong for 1.6.0).
- **An edit of the tempo keeps the part it began in.** On a score whose parts are written at
  different tempos (a verse at 90, a chorus at 120), `scoreTempo` changes under the control as the
  playhead moves. The plan froze the score tempo for the CONVERSION back to a speed only, while the
  DISPLAY stayed live; Base UI steps from the displayed value, so the two disagreed and compounded
  on every 60 ms tick of a held button — measured `101 → 181 → 240`, double speed in two ticks, and
  the plan's own mid-edit test failed against the plan's own code. The rule now, in the
  maintainer's words: _"if I start to change in part B, it should keep in part B unless I stopped
  holding up/down, mouse/etc, or on blur. We can defer to a few ms to detect (stop changing)."_
  The first change freezes the tempo for BOTH the display and the conversion; the edit ends one
  second after the last change, or on blur. One second, because it must outlast Base UI's own
  400 ms pause between a held button's first step and its auto-repeat. The speed is a percentage,
  so it carries into the next part unchanged (90 → 80 is 89 %, so the chorus reads 107).
- **The speed range is the engine's own, 12.5 %–800 % — superseding the spec's 12.5–200 %.**
  200 % was the spec's number, not AlphaTab's: `SynthConstants` clamps `playbackSpeed` to
  `0.125`–`8`. Reasoning given: _"if Alphatab allow 800%, we should keep it, No need to limit
  IMO"_ — practising a short beat far above its written tempo is a real use. The number field
  still needs a `max` to clamp a typed value, so it mirrors the engine's. **Plan C's Settings speed
  slider must use the same range.**
- **The three human gates are handed back once, at the end, not one at a time.** The plan told an
  agentic worker to stop at each of the three checks only a person can do (by ear ×2, a browser
  console ×1). The maintainer chose to batch them: the work ran through to an open PR whose three
  success-criteria boxes ship unticked, and nothing was self-certified.

**Found by running the real thing — each is now machine-enforced**

- **`api.midiLoaded` must not be subscribed to in AlphaTab 1.8.4 — 🤖.** Subscribing replays
  `player.loadedMidiInfo`, and the worker-backed synth every browser uses defines that getter as
  `get loadedMidiInfo() { return this.loadedMidiInfo; }` — it calls itself until the stack
  overflows. It only throws once the player instance exists, so it is a race: 3 crashed page loads
  in 18, each landing on the error boundary. The plan verified `midiLoaded` on the no-worker path,
  where the getter is correct. `playerPositionChanged` already delivers the opening tempo (AlphaTab
  sets `tickPosition = 0` straight after every MIDI load), so the subscription is gone, and
  `'midiLoaded'` is excluded from `AlphaTabApiEvents`, so `useAlphaTabEvent(api, 'midiLoaded', …)`
  does not compile. Drop the exclusion once a release fixes the getter.
- **`web/` generates design-system CSS from `.ts` files too — 🤖.** The scan was `.tsx`-only, so
  the class strings `Slider` and `RangeSlider` share in `SliderClasses.ts` never reached the app:
  the seek rail rendered 0 px wide and 4 px tall, while Storybook (which scans `client/` itself)
  and every VR baseline looked perfect. The seek e2e case now asserts the rail is really painted,
  and the 44 px gate measures the slider's `Control`. The same gap still exists for
  `client/src/lib/utils.ts` (`inputSurfaceClasses`) — not reached by any `web/` screen yet; tracked
  separately.
- **AlphaTab's plain-value members are written through `setAlphaTabValue` — 🤖.** React's compiler
  lint (`react-hooks/immutability`) rejects `api.isLooping = next` inside a component, because the
  api reaches components through `useState`. The rule is right about React data and wrong about a
  handle to an engine outside React, so the write lives beside the hook that builds the api.
- **The toggle e2e case reads the engine, not only the app.** `data-looping` and its siblings
  mirror React state and would flip even if the write never reached AlphaTab — exactly what a
  callback frozen on the pre-engine `undefined` api does. The case also reads `isLooping`,
  `metronomeVolume` and `countInVolume` off the live api.

### 2026-09-19 — v0 Plan A shipped: the engine decisions are now machine-enforced (NH-291)

Plan A (engine and first sound) is implemented — `/play` opens a local score, renders it as
standard notation and plays it. What changes in this register is **enforcement**: four decisions
that were prose until now are checked by CI on every pull request.

- **D5 (self-hosted AlphaTab ESM over Turbopack) — 📄 → 🤖.** `web/e2e/player.e2e.ts` asserts
  AlphaTab logs `Platform: BrowserModule`, the only line that reads `Environment.webPlatform`.
  Proven to discriminate, not merely to pass: replacing the `turbopackIgnore` dynamic import with a
  static value import fails exactly that assertion while notation still renders — which is the
  silent failure the decision exists to prevent. A second drill, stubbing the vendoring source
  worklet, fails the cursor-motion assertion instead, with the notation case still green.
- **The type-only `@coderline/alphatab` import — 🤖, and now proven.** The Task 3 fences landed in
  #157; `tooling/alphatab-import-fence.test.sh` keeps them honest.
- **`web/` gained a merge-blocking browser lane — ⏳ → ✅.** The `e2e` CI job runs
  `@notation-hero/web run test:e2e` with its own Chromium install, and uploads both lanes' traces
  from one step (a second step reusing the artifact name would collide).
  `tooling/workflow-guards.test.mjs` pins those four facts in source — each command anchored to
  a real `run:` line, so commenting a step out fails the guard rather than sliding past a
  substring match — plus a fifth: that `e2e` is still listed in `ci-green`'s `needs:`, without
  which the lane would keep running but stop blocking merge.
- **Loading toasts appear instantly, and the player's "Opening …" is proven painted — new.**
  The toast announcing a file open was never visible, on any file: sonner enters over 400 ms and
  `loadScoreFromBytes` takes the main thread about 30 ms in, freezing that fade where it stands.
  Measured peak opacity while the text read "Opening …": 0.00, throttled or not. Loading toasts
  now carry `transition-none`, so the toast is fully painted before the freeze and the painted
  pixels stay on screen for its whole duration. The guard asserts painted OPACITY rather than
  presence, on purpose: Playwright counts a fully transparent element as visible, so
  `toBeVisible()` passes against this bug. Verified 10/10 serial and 10/10 under worker
  contention, and failing at opacity 0 the moment the fix is removed.

- **Drag-and-drop is driven through Chrome's real drag pipeline — new, and it found a bug.**
  A dropped file did nothing at all. The cause was `dropEffect = 'link'` on `dragover`: per the
  HTML spec a dropEffect outside the SOURCE's `effectAllowed` sets the drag operation to "none",
  and the browser then never fires `drop`. Every copy-only source — a photo, a screenshot, a
  download — was rejected in silence, valid scores included. The line is gone; the browser picks
  an operation the source offers. Why it shipped is the durable part: the drag tests used a
  synthetic `dispatchEvent`, which skips that negotiation entirely and went green against the
  bug. They now drive CDP `Input.dispatchDragEvent` with a COPY_ONLY source, and all three fail
  against the old line — measured, not assumed.
- **`web/` is no longer the repo's only ungated UI — new.** `web/e2e/a11y.e2e.ts` runs axe over five
  reachable states on the same WCAG tag set `client/` uses, plus a 44 px hit-area assertion that axe
  cannot make (no rule in `wcag2a/2aa/21a/21aa` covers target size).

Two decisions recorded because they were taken while building, not while planning:

- **The player re-asserts an opened score when AlphaTab loads a different one.** AlphaTab fetches
  `settings.core.file` asynchronously and renders it whenever it arrives, so a score opened in that
  window was silently replaced by the bundled beat — no error, no clue. Measured, then fixed
  against `scoreLoaded` with an identity guard that terminates by construction.
- **NH-304's `Button` contract is adopted at every unavailable control.** It merged mid-branch, so
  the hand-written `aria-disabled` plus click guard the plan specified is deleted; controls pass
  `disabled` and nothing else. Playwright's `toBeEnabled()` honours `aria-disabled`, verified, so
  the lane's readiness gate is unaffected.

Still unverified by machine, and deliberately so: success criterion 2 (audible audio) and
criterion 4 (leocaseiro's own files) have no automated evidence — headless Chromium is silent.
They are checked by ear on the deployed preview before merge.

### 2026-09-19 — Next.js 16.3 writes its own agent files; we host its block instead (NH-291)

Running Plan A's Task 6 on Next **16.3.4** (the plan was written against 16.2.10) revealed a new
upstream behaviour: `next dev` writes an `AGENTS.md` **and** a `CLAUDE.md` into the Next project
directory whenever its managed block is missing, so `web/` collected two untracked files that came
back after every run.

Approved by leocaseiro 2026-09-19:

- **Merge, rather than commit-as-is, git-ignore, or disable.** His call — he did not object to the
  files but asked whether they could join the repo's own `AGENTS.md`. They can:
  `writeAgentFiles()` upserts **only** the text between `<!-- BEGIN:nextjs-agent-rules -->` and
  `<!-- END:nextjs-agent-rules -->`, and skips `CLAUDE.md` entirely whenever `AGENTS.md` exists and
  hosts that block. So `web/AGENTS.md` is now ours — a pointer to the root `AGENTS.md` plus this
  package's own rules (the AlphaTab value-import fence, the generated `public/alphatab/`,
  `globalThis` over `window`, `test:e2e` over `test`) — with their block pasted at the end byte for
  byte. No `web/CLAUDE.md` is created, and the repo keeps one agent contract per package.
- **Verified by running both write paths, not by reading the source**: the file's hash is unchanged
  across `next build` and `next dev`, and `web/CLAUDE.md` does not come back. Two conditions keep
  it that way and are written into the plan: the block must stay byte-identical (`hasCurrentAgentRules`
  compares it exactly), and Prettier must keep its default `proseWrap: 'preserve'` — switching to
  `'always'` would re-wrap the block and make Next rewrite the file on every run.
- **Rejected:** `agentRules: false`, because upstream's benchmarks show agents do better reading the
  bundled version-exact docs, and this repo's own `.claude/rules/nextjs.md` says the same thing —
  belt and braces beats opting out. Also rejected: git-ignoring them, which leaves a fresh clone
  with no pointer to the bundled docs at all.

### 2026-09-18 — A disabled Button stays focusable: `aria-disabled`, guarded in the component (NH-304)

A native `disabled` button leaves the tab order and cannot take focus. A screen-reader user who moves
with Tab never meets the control, and code that moves focus onto a control that is unavailable for a
moment fails without an error — the concrete case is the player's Play button, disabled until the
audio engine is ready (NH-291).

leocaseiro's call, 2026-09-18, while triaging the v0 Plan A review: **this belongs in the design
system, not in each consumer.**

- **What.** `<Button disabled>` renders `aria-disabled="true"` and never the native attribute. The
  component blocks activation itself: it withholds `onClick`, `onKeyDown`, `onKeyUp`, `onMouseDown`
  and `onPointerDown` while disabled, and prevents the default of a click and of an Enter or Space
  keydown, so a `type="submit"` Button does not submit and an as-link Button does not navigate.
- **Handlers are withheld, not guarded by a merged handler.** Base UI `mergeProps` runs the rightmost
  handler first and the consumer's props are rightmost, so a guard merged beside them runs after the
  consumer's handler has fired. Props from a Base UI trigger arrive the same way, so
  `render={<Button disabled />}` blocks the trigger too.
- **Styling carries both selector sets.** This amends the NH-264 rule "buttons =
  `disabled:pointer-events-none disabled:opacity-50`"
  (`docs/handoffs/2026-07-07-nh-264-base-ui-migration.md:57-58`): `buttonVariants` now also carries
  `aria-disabled:pointer-events-none aria-disabled:opacity-50`. The ticket asked to _move_ the
  selectors; they were **added** instead, because `Pagination` puts `buttonVariants` on native
  `<button disabled>` controls and a Button inside `<fieldset disabled>` is still natively disabled.
  `pointer-events-none` is part of the guard, not only styling: hover-open popups attach native
  listeners through the ref, which no prop guard can withhold.
- **The disabled focus ring gets double alpha.** `opacity-50` also dims the ring (about 1.22:1
  against the light background, 1.29:1 in dark). `aria-disabled:focus-visible:ring-ring`, and a
  doubled pair for the `destructive` variant, bring the ring back to the strength of an enabled
  Button. Resting pixels do not change.
- **Rejected.** Per-consumer guards (every consumer should get this for free). Keeping native
  `disabled`, with or without tabindex workarounds. Adopting `@base-ui/react/button` with
  `focusableWhenDisabled`: its docs say it must not render links, and both `nativeButton` values
  break the tested as-link Button (a dev error, or `role="button"` on the anchor) — consistent with
  the 2026-07-07 Base UI ADR.
- **For consumers.** Assert `aria-disabled` in unit tests — jest-dom's `toBeDisabled()` reads the
  native attribute only. Give the reason a control is unavailable with `aria-describedby`. The
  contract and its known limits are in `client/README.md` §"Disabled buttons".

**Status:** ✅ decided · 🤖 machine-checked — `client/src/components/ui/Button/Button.test.tsx` (the
`disabled (aria-disabled, focusable)` suite) pins the guard, and the `vr` job's
`button-disabled-{light,dark}-focus` snapshots prove Tab reach in a real browser while the unchanged
`-resting` snapshots prove the dimmed look. Approved by leocaseiro 2026-09-18 (NH-304).

### 2026-09-18 — Plan A review lap 4: 26 findings triaged, and Button becomes keyboard-reachable (NH-291)

The rewritten v0 Plan A was reviewed before any code was written against it — six reviewer lenses,
26 findings surviving verification. Every finding was verified by running the tool it claims about
(ESLint, `tsc`, Node against the installed AlphaTab 1.8.4), not by reading.

Approved by leocaseiro 2026-09-18:

- **Auto-resolve the mechanical half; ask only about real decisions.** His instruction, recorded
  because it governs future triage sessions too: findings that break a pipeline or are mechanically
  wrong are applied without a question. Twenty-three landed that way, across three commits — five
  build breakers (a spread dependency array that fails `--max-warnings 0`, a `TS2345` on the event
  helper, a missing import, a fixture generator calling an API 1.8.4 does not expose, and a Play gate
  racing a one-shot event), twelve plan-versus-reality corrections, and six spec passages left over
  from the "always has a score open" decision (D8).
- **The playback cursor gets token-driven CSS.** AlphaTab ships no stylesheet at all, so
  `enableCursor` was painting nothing. The brand teal, with the explicit beat-cursor width upstream
  documents as required. Rejected: upstream's own yellow-and-blue defaults, because they ignore the
  palette.
- **Opening a file moves focus to Play and announces the file name.** His decision, against the
  reviewers' proposal of focusing the notation region: the next thing the person wants is to press
  Play. A polite live region names the file, because focus alone never says _which_ score loaded.
- **`disabled` buttons must stay keyboard-reachable, and the design system owns that** — not each
  consumer. A natively disabled button cannot receive focus, so the focus-on-open above would be a
  silent no-op while the engine loads. Tracked as
  [NH-304](https://leocaseiro.atlassian.net/browse/NH-304): `Button` renders `aria-disabled` with its
  own activation guard. Plan B (46 sites) and Plan C (11) inherit it.
- **Plan-local task numbers never ship inside code comments.** "(Task 10)" means nothing to a reader
  ten years from now, or to anyone outside this one document. Twenty-two comments now name the thing
  instead of the task; prose, steps and tables keep their numbers.

Still open, deliberately: whether `Card`/`CardContent` — exported by the shipped design-system barrel
but rendered by no screen, since the empty state that wanted one was deleted — should lose the
export. leocaseiro chose "decide later".

### 2026-09-18 — fork-parity triage closed: the player takes upstream's AlphaTab shape (NH-291)

Execution of the v0 Plan A build was paused at Task 5 because the plan never ported the
`rhythm-game` fork's `useAlphaTab` pattern, which spec decision D4 mandates. An audit found 15
confirmed divergences, 2 of them forced by D5. All 13 open ones are now triaged
(`docs/plans/2026-09-16-v0a-fork-parity-triage-handoff.md`, section "Triage outcome"), backed by
three parallel investigations: the upstream site plus the installed AlphaTab 1.8.4 source, the
earlier `alpha-drums` attempt, and React 19 lifecycle semantics against this repo's resolved lint
config.

Approved by leocaseiro 2026-09-18:

- **The player always loads a score; the empty state is removed.** His decision, not a finding: the
  bundled beat when nothing is cached, the last song played when there is one, later a catalog id on
  `/play`. Task 10 loses its empty state, and the notation box is on the page from the first paint.
- **The AlphaTab host is always mounted and the engine is built once per page visit** — upstream's
  shape, unchanged. Two alternatives were rejected with evidence: a conditionally-mounted host with a
  callback ref (fails `react-hooks/set-state-in-effect`, which is an error under
  `eslint . --max-warnings 0`, and pays a full rebuild per open), and an always-mounted host with a
  "build on first open" latch (pointless once every visit opens a score). Rebuilding an engine costs
  a fresh 956 KB soundfont fetch and parse with no cache, two workers re-parsing the ~1 MB core
  module, and a new `AudioContext`; an idle empty box with `PlayerMode.EnabledAutomatic` creates no
  player at all. ~~Opening another file is `api.load()` on the live engine, never a teardown.~~
  [Corrected 2026-09-18: the approved mechanism is the staged parse — `ScoreLoader.loadScoreFromBytes`
  then `renderScore` on the live engine, still never a teardown. `api.load()` was rejected by the
  2026-09-16 fork-parity triage (finding F-A2) because it clears the playing score before the new
  bytes are validated.]
- **Ported from the fork:** the `useAlphaTab` mount hook (F-B1), the typed `useAlphaTabEvent` helper
  so every `.on()` gets its `.off()` (F-B2), one API owner passed down as a prop instead of two refs
  and an `onApiReady` callback (F-B3), a shared settings-defaults stage (F-C1), and a scroll viewport
  separate from AlphaTab's own container (F-C2).
- **Deferred to a new Jira issue under NH-291:** the `updateSettings()` funnel (F-C3, no caller in
  Plan A), the dark-mode colour path (F-C5, `web/` has no theme source yet), soundfont download
  progress (F-D1, the bar is Plan B), the asset-path helper (F-D3), and F-C1's font-family stack.
- **"Remember the last song" becomes its own ticket and spec.** It writes the person's file bytes to
  browser storage, which contradicts Task 6's "the bytes never touch disk"; storage choice, size cap,
  eviction and clearing are spec questions, not plan details.
- **Test-only instrumentation must never ship to production, especially when it can cost
  performance.** Task 7's silent-no-sound test drops the React playhead state that re-rendered the
  player subtree ~60 times a second and instead reads AlphaTab's own cursor element. The test itself
  stays — a mocked engine would hide exactly the failure it exists to catch, a mis-delivered worker
  or audio worklet, where notation renders and there is no sound. The one deliberate exception, at
  his request, is F-D2's zero-cost debug handle on the notation box, which ships in production so a
  live player can be inspected in DevTools.
- **Rework scope: one pass over eight briefs** — real edits to Tasks 5, 6, 7 and 11, Task 10 shrinks,
  light touches to Tasks 3, 13 and 14 — rather than re-planning Tasks 5-13 from scratch.

### 2026-09-16 — v0 Plan A review, lap 2 finished: the last open findings triaged (NH-291)

The findings the 2026-09-15 entry left open were checked against the installed packages before
triage: lint probes in `web/` and `client/`, axe-core 4.12.1 over the notation-box markup, and parse
timings with the pinned AlphaTab 1.8.4. Three of the handoff's proposed fixes turned out to fail.
leocaseiro triaged each from a checked Before → After.

Approved by leocaseiro 2026-09-16:

- **The notation box is a focusable, named region** — `role="region"`, `aria-label="Score"`,
  `tabIndex={0}` (Task 6) — chosen over `role="img"`, which the agent had recommended, and
  `role="figure"`. His reason: the notation already takes mouse input and needs keyboard control, and
  an image's children are presentational. `tabIndex` is needed under every role: a score taller than
  the 420 px box fails axe's `scrollable-region-focusable` (serious, `wcag2a`) without it, so Task 13
  gains a case that opens `Punk.gp`, which scrolls. Spec §5 updated.
- **`web/` code uses `globalThis`, never `window`, and has no `eslint-disable` for `no-alert`.**
  `unicorn/prefer-global-this` is an error in `web/` — all 8 `window.*` calls in the plan failed it —
  and `no-alert` is not enabled there, so the directive Task 11 carried was itself a lint failure.
  Recorded as a Global Constraint.
- **`client/` gets its own AlphaTab import fence, banning every import, type imports included**
  (Task 3 Steps 8-9), rather than moving the group into `eslint.config.base.mjs`: in flat config a
  later block's options replace an earlier block's, so a group defined in the base silently disappears
  from `web/`. Spec §5 updated.
- **Both AlphaTab import fences get a committed test,** `tooling/alphatab-import-fence.test.sh`
  (Task 3 Step 10), run by `pnpm run test:tooling`, instead of Task 3's throwaway probes only. It was
  run against the real configs: it fails before Task 3, passes with both fences, and fails again when
  a later block for the same rule follows the fence — the silent loss it exists to catch.
- **A first open shows the Skeleton through the parse** (Task 12, renamed "Loading feedback while a
  score parses"), over a toast on every open and over accepting the freeze. Measured with AlphaTab
  1.8.4: file size barely matters (a 7.35 MB file with an embedded asset parses in 9 ms), score
  length does (2,000 bars of 16th notes: 382 ms on an Apple M5 Pro, longer on slower machines).
  leocaseiro accepted the brief Skeleton flash this causes on a fast laptop, preferring it to a
  frozen empty state. Spec §4 updated.
- **Three spec passages the plan had disproved are corrected now,** not at PR time: §4's Skeleton
  lifts on `renderFinished`, not on `document.fonts.load('1em Bravura')`; "AlphaTab's default track"
  becomes "the score's first track" (three places); §5's Sonner audit holds the toast with the
  story's own `ToastOnMount` and `duration: Infinity`, not `openArgs`. The plan names the spec as its
  authority, so a stale spec would steer an implementer back to the font wait Task 5 removed.
- **A failed open shows one message per reason** — too large (E101), unreadable (E102), not a score
  (E103) — with the size limit in the message read from the `MAX_NOTATION_MB` constant, so changing
  the limit updates the copy. Before this, the size check's own message was thrown away and three
  different wordings reached the user.
- **Every failure message carries an error number, starting in v0,** over recording the idea for a
  later plan. leocaseiro asked for numbers so a report names the exact case, and noted they had been
  missing from the spec. Nine numbers — 1xx opening a file, 2xx the engine and its assets, 9xx an
  unexpected crash — live in `web/lib/player-errors.ts` (Task 6); spec §4's failure table gains a
  Number column and the two music-font rows it lacked. The e2e lane pins E101, E103 and E203.
- **Also raised:** a `TODO` comment fails lint in every package (`sonarjs/todo-tag` is an error in the
  shared base). leocaseiro asked that lint stop blocking TODO comments, JSDoc `@todo` in particular;
  that change is handled separately, off `master`.

**Status:** all lap-2 findings are triaged and applied.

### 2026-09-16 — v0 Plan A, lap 3: seven-persona re-review, first decisions applied (NH-291)

Lap 3 ran `ce-doc-review` in headless mode with the same seven personas, primed with every lap-1 and
lap-2 decision so settled alternatives were not re-raised. No cross-model pass (no second-provider
CLI on this machine). 18 findings; 2 mechanical fixes applied without a decision — Task 3's commit
named paths that its own `git rm` had already removed, which stages **nothing** (reproduced), and the
File Structure tables were missing eight files the tasks touch.

Approved by leocaseiro 2026-09-16:

- **A file that embeds an audio track keeps playing that recording** (`PlayerMode.EnabledAutomatic`
  stays), over pinning the synthesizer, which the reviewers and the agent had recommended. His
  reason: he plays along to his own audio-track files and wants the notation on screen while the
  recording plays. The cost is recorded instead of removed — AlphaTab's backing-track synthesizer
  ignores mute, solo, track volume, the metronome and the count-in (verified in 1.8.4: those methods
  are empty), so spec §4 and §7 now require those controls to render **disabled with a tooltip** in
  Plans B and C rather than looking live and doing nothing. A toggle between the recording and the
  synthesizer joins the deferred list (NH-298).
- **Task 14 re-runs `pr-checklist-sync` by hand after rewriting the PR body.** `gh pr edit --body`
  replaces the whole body, and that workflow runs only on `opened`, `workflow_dispatch` and template
  pushes to master — so without the manual run the required `pr-checklist` job fails on every item.
- **The accessibility gate gains a sixth case** covering the engine-error screen, whose destructive
  tint no check had measured.
- **Scope note for alpha-v0:** full WCAG AA is not the bar for this release. Basic accessibility yes;
  anything expensive is skipped, because the release exists to show the app working. The axe gate
  still runs the AA tag set — revisit only if it blocks a release.
- **Opening a score moves focus into the notation region** (one line in the mount effect). Without it
  the control the user pressed is removed with the empty state and the browser resets focus to
  `<body>`, so a keyboard user Tabs from the top of the page again. Returning focus to the Open file
  button after a _failed_ open is deliberately left out — too much wiring for this release's bar.
- **v0a gains the mockup's player header:** the wordmark, then the open score's **title**, with the
  **file name** in a `Tooltip` behind it (leocaseiro's design call, matching
  `docs/mockups/player-flatrow-teal.html`). Before this the file name existed only in a screen-reader
  span, and a sighted user never saw which file was playing. `Tooltip` joins the client barrel; the
  replace tests read the file name from a `data-file` attribute instead of the element's text. The
  real logo in place of the wordmark stays a later visual task.
- **Both AlphaTab import fences also ban a dynamic `import()`**, via a `no-restricted-syntax`
  `ImportExpression` selector beside each `no-restricted-imports` block (Task 3). leocaseiro asked
  for a spike before applying; it was run against the real `web/eslint.config.mjs` carrying Task 3's
  exact block: a value import errored, `await import('@coderline/alphatab')` **exited 0**, and the
  selector turned it into an error — the import rules match `import`/`export` declarations only, so
  without it a second bundled AlphaTab returns with lint green. `client/`'s selector is **appended to
  its existing `no-restricted-syntax` array** (the inline-colour rule), because a second block would
  replace that array. `loadAlphaTabEngine()`'s own import holds its URL in a `const`, so it carries no
  `source.value` literal and cannot match — verified. `tooling/alphatab-import-fence.test.sh` gains a
  dynamic probe per package so the guard cannot be switched off unnoticed.
- **The `rendered-track-count` test hook reports what AlphaTab drew, not what was requested** —
  `setRenderedTrackCount(api.tracks.length)` inside the `renderFinished` handler, replacing a count
  derived from the `drumIndexes` array the effect had just passed to `renderScore` (Task 10).
  leocaseiro asked whether the drum track was set somewhere else; it is — `renderScore` on the line
  above does the real work, and the removed line only fed an `sr-only` span the Playwright tests
  read. As written, the three `Punk` assertions and success criterion 9 would have passed even if
  AlphaTab drew only track 0, including the Track-objects-instead-of-indexes mistake the plan warns
  about twice. `api.tracks` is AlphaTab's resolved list, verified in the installed 1.8.4.
- **The plan's own React snippets are fixed only where `eslint --fix` cannot help**, and both
  `Expected: PASS` steps now run `eslint --fix` first (Tasks 5 and 6). leocaseiro's call: import
  ordering is machine work and does not belong in a hand-maintained plan. Measured before deciding —
  the snippets raised 18 problems, `--fix` cleared 7, and **11 survived** across all three files, so
  two of the three still failed the check the plan promised would pass. The 11 are fixed in place:
  `renderedTrackCount` state moves from Task 6 to Task 10 (6 of them), `let api` becomes `const` at
  its construction site, `useEffect` leaves Task 6's `PlayerShell` import and rejoins it in Task 10
  where the drag-cancel effect first needs it, the engine `.then` returns, and the provider gains a
  return type. Re-extracted and re-linted after the edits: zero problems.
- **Task 11's cancel test polls for movement and can tell a resume from a restart.** It had two
  defects at once. It could fail on a correct build: `data-playing` flips when `_playInternal` sets
  `PlayerState.Playing` synchronously, before the worklet has played a sample, so the position read
  straight after it is 0 — and the assertion was a plain `expect`, which does not retry (Task 7's
  equivalent already polls). And it could pass on a broken one: a cancel that restarted from bar 1
  climbs past the captured position just as a resume does. It now polls until the position moves,
  then asserts the FIRST read after the dialog is not lower than the captured one — which a restart
  cannot satisfy — before confirming it is still advancing.
- **`.gpx` is BCFZ, not ZIP** — corrected in three places and in the deferred bound's name. Both
  `.gpx` fixtures begin with the bytes `BCFZ`; `GpxFileSystem.decompress` reads a length from the
  4-byte header and expands to it with **no cap**, while the genuine ZIP formats (`.gp`, `.mxl`,
  `.capx`) go through `ZipReader`, which throws `OverflowError` at three separate checks against
  `settings.importer.maxDecodingBufferSize`. The deferred NH-298 item is renamed to "a
  decompressed-size bound (the BCFZ header length, and the ZIP total across entries)", so it targets
  the unbounded path instead of one AlphaTab already guards.
- **Task 7's Drill 1 names the assertion that actually fires.** Renamed "the worklet is served but
  broken", with Expected pointing at assertion 2's position poll rather than assertions 3 and 4.
  Both of those stay green on an empty module: it is served 200 with a JavaScript type, and
  `addModule` resolves, so `new AudioWorkletNode` throws inside the success handler of a
  two-argument `.then(onFulfilled, onRejected)` — which does not route a throw in `onFulfilled` to
  `onRejected`, so AlphaTab's `Audio Worklet creation failed` never logs.

leocaseiro's standing instruction from this round: findings that only remove ambiguity are applied
without a picker; anything carrying a choice or a behaviour change still goes to him.

**The review of Plan A is CLOSED at lap 3** (leocaseiro, 2026-09-16). The loop's own rule made lap 4
due — `last_applied: P1` arms the re-lap trigger, and the cap is lap 5 — and he chose to stop
anyway, with lap 3's six open findings all decided and applied. The frontmatter keeps the honest
`last_applied: P1` rather than a value doctored to look finished, and carries a comment saying the
armed trigger is a decided skip, not an oversight, so a later agent does not auto-run lap 4. Three
laps produced 21 applied decisions; anything lap 4 would have raised can be raised against the code
during implementation instead.

### 2026-09-15 — v0 Plan A review, lap 2: 15 decisions triaged and applied, accept list widened (NH-291)

A seven-persona `ce-doc-review` of Plan A ([`docs/plans/2026-09-13-v0a-engine-and-first-sound-plan.md`](../plans/2026-09-13-v0a-engine-and-first-sound-plan.md))
applied 7 mechanical fixes and raised 18 findings needing a decision; verifying them during triage surfaced 5 more.
leocaseiro triaged them one at a time, each shown as a verified Before → After. Everything below is applied and pushed on
`spike/alphatab-nextjs-poc`. Six items remain to triage — see
[`docs/plans/2026-09-15-v0a-plan-review-lap2-handoff.md`](../plans/2026-09-15-v0a-plan-review-lap2-handoff.md).

Approved by leocaseiro 2026-09-15:

- **Replace flow follows spec §4 — confirm first, then parse, then swap** (Task 11), over parse-first: the plan names the spec as its authority.
- **`web/` gets a unit-test runner:** vitest `^4.1.9` with `"test": "vitest run"`; AGENTS.md's "`web/` omits `test` until Phase 2" note is removed when Task 9 lands.
- **The file picker accepts every extension of a format AlphaTab 1.8.4 reads:** `.gp .gp3 .gp4 .gp5 .gpx .musicxml .mxl .xml .capx .atex .alphatex`. `.mxml` is removed — no standard defines it (W3C MusicXML 4.0 names `.musicxml` and `.mxl`). `.mid` stays out: AlphaTab has no MIDI importer. Spec §4 and Q6 updated.
- **MusicXML and alphaTex are tested with real exports** — MuseScore (`1-beat.mxl`, `1-beat.musicxml`, `Punk.mxl`) and Tabtify (`1-beat.atex`, `Punk.alphatex`), committed in `web/e2e/fixtures/`. Q6 is closed.
- **Task 9 is the pure drum-track selector;** the `NotationSurface` render wiring moves to Task 10, beside the end-to-end tests that exercise it.
- **The generated AlphaTab assets are re-checked on a Vercel preview right after vendoring** (new Task 2 Step 11), not first at Task 14.
- **D5 wording — we stay on Turbopack.** The webpack recipe is named only inside Task 1's stop condition, as the emergency fallback the 2026-09-14 entry recorded.
- **A file opened before the engine has loaded is kept,** and the loading surface shows at once (Tasks 10 and 11).
- **An engine-import failure replaces the empty state;** the player's Play button stays where it is, disabled — in v0a and in the later full player bar. Chosen from a mockup of both placements ([`docs/mockups/player-engine-error-placement.html`](../mockups/player-engine-error-placement.html)). Spec failure table updated.
- **A failed music-font download is detected with the browser's `loadingerror` event on `document.fonts`,** plus a 60 s first-render backstop for a download that hangs.
- **The replacement loading toast lives in `requestNotation`,** shares one id with its result, and waits one painted frame before the synchronous parse.

**Status:** Plan A stays in review. Lap 2 has 6 findings left to triage; lap 3, a re-review, is due after them, because P0 and P1 findings were applied this lap.

### 2026-09-14 — D5 re-closed: we stay on Turbopack; the official webpack route becomes D5's written fallback (NH-291, NH-298)

The bundler spike handed off earlier the same day was run end to end, in a scratch Next 16 app **outside the repo** (the worktree was untouched). Full evidence: [`docs/spikes/2026-09-14-alphatab-webpack-vs-turbopack.md`](../spikes/2026-09-14-alphatab-webpack-vs-turbopack.md).

- **The official route works.** `next build --webpack` with `AlphaTabWebPackPlugin` plays: `Environment.webPlatform` is `Browser` (the plugin's webpack-aware branch, not our `BrowserModule` one), 1676 `playerPositionChanged` events with `currentTime` advancing to 4442 ms of 25987 ms, zero errors, zero failed requests, and AlphaTab's own log reads `WebPack: true` / `Will use webworkers for synthesizing and web audio api with worklets for playback`. One library copy at **274 KB gzip**, matching D5 variant B's 273 KB.
- **All three named blockers passed.** `reactCompiler: true` survives webpack — proved by building the same component with the flag on and off and reading `useMemoCache` plus `react.memo_cache_sentinel` out of the on-build. `transpilePackages` survives, together with the `@/` alias resolving against the app tsconfig and the cross-package Tailwind `@source` scan (the `bg-clip-padding` CI sentinel reaches the built CSS). The build-time cost is ~2.3x — 9.10 s vs 4.00 s cold on the real `web/` app — about five seconds.
- **Two findings the handoff could not have priced.** The plugin rewrites its 7.0 MB of assets on **every** compile, which puts `next dev --webpack` in an endless reload loop (330 Fast Refresh rebuilds per 20 s against 0 for the control) on every route, not just AlphaTab's; a three-line `watchOptions.ignored` fixes it, and the official sample does not carry it. And `next start --webpack`, which that sample's `package.json` still lists, is rejected outright by Next 16.2.10.
- **Question 5 came back unchanged:** the `AudioWorklet.addModule()` fetch is invisible to Playwright on the official route too. **Plan A Task 7 keeps its premise and its `page.request.get` mechanism.**
- **Decision: stay.** leocaseiro weighed the two and kept D5. The route was not rejected as broken — it was rejected on cost of change: Plan A is written and reviewed around D5, and switching would rewrite roughly a third of it to buy a path we do not need. The agent's own recommendation had been to switch, on the handoff's stated rule; the maintainer's call overrides it and is the decision of record.

**Status:** `D5` moves **⏳ pending → 🔒 locked-active · 📄 prose-only**. Plan A Tasks 2, 3, 5 and 7 stand exactly as reviewed. The NH-298 item "a written fallback for D5" is **closed** — the spike doc carries the full webpack recipe, executed and verified, as the route to fall back to. Approved by leocaseiro 2026-09-14.

### 2026-09-14 — v0 Plan A reviewed: 30 findings applied, both "accepted gaps" closed, D5 re-opened (NH-291, NH-298)

leocaseiro reviewed [`docs/plans/2026-09-13-v0a-engine-and-first-sound-plan.md`](../plans/2026-09-13-v0a-engine-and-first-sound-plan.md) finding by finding, run as `compound-engineering:ce-doc-review` with **seven** reviewers (coherence, feasibility, design-lens, scope-guardian, security-lens, product-lens, adversarial) and **no cross-model pass** (no second-provider agent CLI on this machine). 51 raw findings merged to 40; the 26 actionable plus 4 raised by spikes were walked one by one and all 30 approved and applied, across commits `77286df5`, `208c91a0`, `de51dea9`, `8b99443d`, `1aa70af9`, `24c2dbc1`, `3a06db6e`.

- **Four empirical spikes settled what reasoning could not**, and three of them changed the answer. A React 19.2 reproduction showed the player could never have worked as written: `AlphaTabEngineProvider` is the parent-most component, so its effect runs **last** and `loadAlphaTabEngine()` has not been called when `Player`'s `[]`-deps effect reads `apiRef.current` — measured 0 subscribed handlers and Play permanently disabled, which would have surfaced as a 60-second timeout blamed on the worklet. A Playwright/Chromium spike found that an `AudioWorklet.addModule()` fetch is visible to **no** Playwright observer, so the regression lane's own worklet assertion timed out identically on healthy, 404 and wrong-MIME builds — zero discriminating power. A focus spike found the approved picker fix was itself a **critical** axe violation until `aria-hidden` joined `tabIndex={-1}`.
- **Both "accepted gaps" were closed rather than shipped.** **Q6** — a hand-authored MusicXML file parses with the pinned 1.8.4 importer first try (336 bytes bare, 1.8 KB for a percussion variant), and `ScoreLoader` never sees a filename, so one fixture covers `.musicxml`, `.mxml` and `.xml`; the existing `1-beat.xml` turned out to be a Guitar Pro v5.10 binary wearing an `.xml` name. **Q7** — a percussion-free fixture generates from one alphaTex line via `AlphaTexImporter` + `Gp7Exporter` (2,866 bytes, round-trips as one non-percussion track), so success criterion 9 is now verified by running rather than by reading.
- **Terminology ratified: `notation` for the file, `score` for the parsed object and for UI copy, and never "chart"** — 118 occurrences replaced in Plan A, recorded in `CONCEPTS.md`. Plan B was renamed by a concurrent session; **the spec and Plan C still carry the old word** and are handed to that session.
- **D5 is re-opened.** The 2026-09-10 spike dropped `@coderline/alphatab-webpack` with the note "no Turbopack plugin exists" — true, but that is the _consequence_ of staying on Turbopack, not a reason to, and staying on Turbopack was never examined as a choice. CoderLine ship an official Next.js 16 sample built on that plugin, whose README says plainly not to use Turbopack; nobody had opened it. The spike doc is corrected (it had also conflated "the 1.8.4 subpath export is a dead shim" with "the webpack route is unavailable"), and the side-by-side comparison is handed off in [`docs/plans/2026-09-14-alphatab-webpack-vs-turbopack-spike-handoff.md`](../plans/2026-09-14-alphatab-webpack-vs-turbopack-spike-handoff.md). If it says switch, Plan A Tasks 2, 3, 5 and 7 largely dissolve.
- **Also corrected:** Vercel's Next.js preset **does** run the package's `build` script (the review had overstated this as a risk); what survives is an invisible dashboard Build Command Override, now closed by pinning `buildCommand` in `web/vercel.json`. Task 1's go/no-go verified the _committed_ assets that Task 2 then deletes, so Task 14 re-verifies the generated ones on a deployed preview. Seven tracked spike files are deleted — one carried a value import the new lint fence bans, so the package lint could not have passed.
- **Fourteen items deliberately deferred past v0** are tracked as a Smart Checklist on **NH-298**, and Plan A points at it: a bundle-count CI gate, CSP headers for `web/`, a decompressed-size bound for `.gpx`, a test behind the privacy claim, a `PlayPauseButton` in `client/`, an `AlertDialog` to replace `window.confirm`, an iOS picker branch, Sentry, a written fallback for D5, and five smaller open questions.

**Status:** ✅ decided · 📄 prose-only enforcement — the plan is the contract until it is implemented. Approved by leocaseiro 2026-09-14, finding by finding. **D5 moves ⏳ pending** the bundler spike above; every other decision in the plan stands.

### 2026-09-13 — v0.1 settings panel: first review lap, 16 findings applied (NH-291)

leocaseiro reviewed [`docs/specs/2026-09-11-v01-settings-panel-design.md`](../specs/2026-09-11-v01-settings-panel-design.md) finding by finding — the document's **first** review pass, run as `compound-engineering:ce-doc-review` with six reviewers (coherence, feasibility, product-lens, design-lens, scope-guardian, adversarial) and **no cross-model pass** (no second-provider agent CLI on this machine). 33 raw findings merged to 16 distinct plus 3 FYI; every one of the 16 was approved and applied. The spec was written 2026-09-11, one day before the laps that settled several of the decisions it describes, and stale text was indeed the dominant defect class.

- **Three stale open questions closed.** **S4** (persistence) was already settled — one `localStorage` key with a `version` integer, restored through `Settings.fillFromJson` — and its "IndexedDB is already in the stack for recent files" note was false twice over: no IndexedDB or Dexie dependency exists in any workspace package, and the recent-files list was cut from v0. **S3** (search matching) is now **labels only**, because §3 had already fixed the index to label, section and tab, so answering it wider later rebuilds every entry rather than swapping a matcher. **S1** gains the **two-level mapping** its breadcrumbs need: the `▸` in the settled group names is the tab/section split — tabs are Display, Notation, Player, Stylesheet and Tools, with Display holding the General, Colors, Fonts and Paddings sections.
- **The v0/v0.1 boundary was wrong in both directions.** §8 excluded tempo from this panel, but lap 4 moved the 12.5–200% slider **into** the Settings popover's Player group, so the exclusion now covers song-scoped persistence only and the slider is named as a Player-group row indexed by search. And §1 called search v0's only gap when v0 also has no tabs (`Dialog`/`Tabs` dropped out of v0), so v0.1 carries **two** additions, not one — which matters for sizing the milestone.
- **Component inventory corrected.** `RangeSlider` is dual-thumb (`value: [number, number]`) and cannot serve a single-value settings row, so the new `Slider` replaces it in the reusable list. The built `Tabs` is a segment control that never wraps Base UI's `Tabs.Indicator`, so §3's underline needs a new `client/` variant inside the VR + a11y gates rather than a call-site restyle. The `Field` hedge is resolved — `orientation="horizontal"` already gives label-left / control-right, so no new layout piece is needed.
- **Row grammar gained an action row.** The settled `Tools` group is two command buttons (Export MIDI, Export Guitar Pro), hand-rendered outside the prototype's settings-group schema, so it had no shape in a table that allowed only checkbox, select and number input — and search inherited the gap.
- **Two safeguards added.** §6's originality rules guarded only against reference products nobody proposed copying, so a fourth rule now names the real exposure: **copy no files or fragments from the MPL-2.0 `rhythm-game` fork** (D4, clean-room). And **S5's accessibility deferral** leaned on a gate that would not fire — the `web/` axe lane checks only the states it enumerates, and the results view is not one of v0's four — so it now requires that state plus an ARIA live region announcing the result count.
- **Registry correction (F-7).** This entry's own lap-1 PWA bullet is struck in place and marked superseded by lap 2. leocaseiro had dropped a same-shaped finding in lap 3 on the grounds that a newest-first log legitimately supersedes itself; he approved this one because that specific stale line has a **documented** downstream victim (`AGENTS.md`'s READ-FIRST snapshot, recorded in this entry's lap-3 corrections) and the fix annotates rather than rewrites.
- **Also settled:** a zero-match state for search ("No settings found", search box and clear control stay active); and §3's claim that the index is the one genuinely non-trivial piece — it is a flat projection of the per-row accessor schema v0 already builds, so v0.1's new engineering is the result view and its focus/screen-reader model.
- **Left as FYI, not applied:** §1's "usable day-to-day" claim is asserted without naming which settings a drummer reaches for mid-practice; the new search-clear control is unchecked against the 44 px hit-area rule; and S2 looks for its answer in reference screenshots when Base UI's `Accordion.Root` already decides it (`multiple` defaults to `false`).

**Status:** ✅ decided · 📄 prose-only enforcement — the spec is the contract. Approved by leocaseiro 2026-09-13. The spec now carries `lap: 1` / `last_applied: P0` in frontmatter; a P0 was applied, so the review loop's re-lap trigger fired — **leocaseiro declined lap 2 and closed the review at lap 1**, on the grounds that this is a design capture rather than a build plan. Re-open it when the design becomes one.

### 2026-09-12 — v0 local-file player: player before catalog, and the v0 spec review (NH-291, NH-292)

leocaseiro ratified the v0 direction, then reviewed the spec finding by finding
([`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md), doc-review-loop lap 1). D1–D7 were approved on 2026-09-10; the review decisions below on 2026-09-12.

- **Player before catalog.** v0 is a local-file drum player shipped in `web/` (D1, D2). The catalog, the backend (Neon, Cognito) and the Playable schema are **paused, not dropped**; the return point is not set. This reverses the 2026-06-15 build order ("(1) CRUD for catalog … (2) play a song") recorded further down this log.
- **AlphaTab delivery = self-hosted ESM** from `public/` (D5). The `@coderline/alphatab-webpack` plugin was rejected, and `web/` may import the package only with `import type`, so Turbopack cannot bundle it a second time.
- **D4 clarified — clean-room.** The `rhythm-game` prototype's patterns are ported with the fork open for reference and **no files copied**, per the 2026-06-18 licensing spike (the fork is MPL-2.0; this repo is proprietary).
- **Offline is out of v0.** ~~v0 installs as a PWA but needs a network~~ — **superseded by lap 2: no PWA at all in v0.** The service worker and precache become their own later milestone, sized by the spec's payload budget — which now includes the 727 KB Material Symbols font, so the floor is ~1.6 MB, not 870 KB.
- **v0 builds a player-controls popup** (Base UI `Dialog` + `Tabs` + `Accordion`) with Tempo and Tracks tabs, following the prototype's behaviour. The searchable global settings panel stays v0.1 and reuses those components.
- **Scope trims:** no recent-files list; no `?id=` handoff (the buffer is held in a client store and a reload on `/play` returns to `/`); no raw `.mid` files. A–B repeat in v0 is AlphaTab's native range selection.
- **Verification:** desktop Chrome is the v0 gate; iPad and Android get a manual check that does not block v0 (D7 refined). The silent-playback regression test becomes a Playwright lane in `web/` wired into the CI `e2e` job.
- **Rejected:** designing the offline layer inside v0; reordering the roadmap to put practice before settings; keeping a recent-files list in v0.

- **Lap 2 (same day) trimmed and reshaped v0 again:** **no PWA at all** in v0 — install and offline become one later milestone; the **file picker lives in the player**, `/` is reduced to a landing Play button and no buffer crosses routes; **two popovers, never modals** — Settings on the header gear carrying the prototype's full option set in accordion sections (colors as plain text inputs for now), and Tracks on the transport button. `Popover` already exists, so **`Accordion` is the only new component** and `Dialog`/`Tabs` drop out of v0. Loop, Metronome and Count-In ship through AlphaTab's own `isLooping` / `metronomeVolume` / `countInVolume`; the A–B marker UI and its selection sync are **not** planned. The tempo floor is AlphaTab's documented 12.5%.
- **Corrections found in lap 2:** the spec had claimed an ESLint value-import guard that does not exist — it is now stated as v0 work on the `@typescript-eslint` extension rule; and the regression test now asserts the audio-worklet file is actually requested, because the previous assertions also passed on the silent ScriptProcessor fallback.
- **Rejected in lap 2:** a PWA manifest inside v0; extra MusicXML/Capella drum-detection test charts (AlphaTab is trusted here until a real bug appears).

- **Lap 3 (same day) corrected facts and closed gaps, 17 decisions.** **Replacing a file asks
  first** — a native `window.confirm()` for now (no `Dialog` is built); cancel keeps the current
  chart, confirm stages the load so a corrupt replacement leaves the playing chart intact. **No drum
  staff is not an error** — drums are v0's default, not its requirement, so a file with no percussion
  staff falls back to AlphaTab's default track and a guitar or piano chart plays; this reverses lap
  2's drum-only rule and drops the "no drum track" failure state. **`Slider` joins `Accordion`** as a
  new design-system component (`RangeSlider` is dual-thumb only, so it cannot serve the scrubber,
  tempo, volume or settings rows). **Build items are split by package** — controls to `client/` under
  the VR + a11y gates, AlphaTab-aware composition to `web/` — and v0 adds an **axe check to the new
  `web` Playwright lane**, because those two CI jobs only run against `client/` today. **Settings
  persist** to one `localStorage` key. **Tempo lives in the header**, per the mockup and
  `player-app-ui.md`, and **Auto-Speed is v0.2** (a practice feature). **Acceptance grows to seven
  criteria**, covering the transport toggles, the scrubber and both popovers. **A sample chart
  ships** (`web/public/charts/1-beat.gp`) with test fixtures in `web/e2e/fixtures/` covering 6 of the
  9 accepted extensions. **v0.1 keeps the prototype's settings groups** exactly, with MIDI arriving
  as a new tab later — which settles S1 in the v0.1 design.
- **Corrections found in lap 3.** The regression test's justification was wrong: AlphaTab logs a
  distinct line per output path (`…with worklets for playback` versus `…with ScriptProcessor for
playback`), so the fallback was never silent, and the worklet fetch is lazy, so the test must not
  require it before playback. Q3's "worklet never observed" was an instrumentation gap —
  `web/spike-probe.mjs` only recorded failed requests. §5's type-only import rule collided with §7's
  settings dropdowns, resolved by making the awaited namespace the only runtime source of AlphaTab
  values. A–B **range** repeat is mouse-only in AlphaTab, so it is desktop-only in v0 and supersedes
  `player-app-ui.md` D‑5. The `soundFontLoad` bar covers 302 KB of a ~1.6 MB first load, not the
  whole payload. `AGENTS.md`'s READ-FIRST snapshot still claimed v0 installs as a PWA.
- **Rejected in lap 3:** a styled confirm dialog for v0 (native `window.confirm()` instead); an
  `Advanced` group for the engine settings; re-grouping v0.1's settings into drum-specific
  categories. A licensing concern about two charts copied from the MPL-2.0 fork was **withdrawn** —
  leocaseiro authored them.

- **Lap 4 (same day) found that lap 3's own new text carried real defects, 12 decisions.** The
  **merge gate was rewritten again**: lap 3 had it assert `…with worklets for playback`, but
  `createWorkerPlayer` emits that line whenever `isSecureContext && 'AudioWorkletNode' in window &&
outputMode === WebAudioAudioWorklets`, never reading `Environment.webPlatform` — so it logs in the
  broken build too, right before `Failed to create worker for synthesizing audio`. The gate now
  asserts `Platform: BrowserModule` (from `printEnvironmentInfo`) plus the absence of that error.
  **The package-split table was unbuildable**: it gave `client/` the tempo control, the transport
  toggles and the settings rows, but `client/` has no `@coderline/alphatab` and a `client/` Storybook
  story has no engine — so every `client/` item is now presentation-only and the React context is
  scoped to `web/`. **The native confirm needed three fixes**: pause playback before it (it freezes
  input, not Web Audio), reset the file input's `value` in every change handler (no `change` event
  fires when the value is unchanged, so cancel-then-re-pick was dead), and register a
  `page.on('dialog')` handler or Playwright silently turns every replace test into a cancel test.
  **The Tracks row takes the prototype's full control set** including render-select, per leocaseiro;
  drum tablature is implemented upstream (alphaTab PR #2591) so Q5 no longer records a local patch.
  **Criteria 8 and 9** cover the sample-load action and the no-percussion fallback; **criterion 7**
  splits render from audible mix. **A third new design-system component** — a determinate progress
  bar — joins `Accordion` and `Slider`. **Settings restore falls back to defaults** on a corrupt or
  stale value. **The axe lane** gains two states and `@axe-core/playwright`. **The tempo slider moves
  to the Settings popover** and hit areas are padded to 44 px, because nothing in the mockup meets
  that rule. **v0.1 stays non-blocking** — no modal, no `Dialog`, in v0 or v0.1.
- **Corrections to lap 3's own output, found in lap 4.** Three false statements traced to one unsound
  `strings` probe: the `.xml` fixture is a Guitar Pro 5 binary, not MusicXML, so copying it to
  `.musicxml`/`.mxml` covered nothing and real coverage is 3 of 9, not 6; `1-beat.gp` is a single drum
  track, not multi-track, so §4's required "drums are not track 0" test has no fixture (Q7); and
  "renaming a `.gp5` will not parse" is backwards, since `ScoreLoader` reads the bytes. A dangling
  sentence left by the first of those fixes was repaired. The `Skeleton` does not cover the Material
  Symbols face, which has no loading affordance at all. `ScoreLoader` is `importer.ScoreLoader` and
  takes a `Uint8Array`.
- **Also fixed in lap 4:** NH-293 — `lint-editorconfig` blocked every local push because the npm
  wrapper has no darwin-arm64 binary; the hook now skips that one failure the way `lint-yaml` and
  `lint-shell` skip a missing binary, with CI unchanged as the hard gate.

- **Lap 5 (the cap) reviewed only the text lap 4 rewrote, 12 decisions — and found lap 4 had defects
  of its own.** The **pause before `window.confirm()` was reversed**: `confirm()` blocks the main
  thread where AlphaTab's sample pump runs, so the worklet drains its buffer and zero-fills by itself,
  and `pause()` only posts to the synth worker whose reply is handled on that blocked thread — so the
  pause landed _after_ the prompt and stopped a chart the next sentence promised to keep playing. It
  now runs on the confirm path only, and the handler resumes playback on both the cancel and
  parse-failure paths. **Criterion 7 was extended** after five of six reviewers independently found it
  checked three of the Tracks row's eight controls. **The gate gained three fixes**: the log level
  comes from `NEXT_PUBLIC_ALPHATAB_LOG_LEVEL` (Debug only in the Playwright `webServer.env`, since
  shipping Debug prints every visitor's user agent), the worklet check asserts a 200 with a JavaScript
  MIME type rather than only that the request fired, and the console assertions run last because those
  errors only exist once the player is constructed. **Settings restore goes through
  `Settings.fillFromJson`** — assignment would have silently broken Colors and Fonts, since
  `JSON.parse` returns plain objects where `RenderingResources` holds real `model.Color`/`model.Font`
  instances and a plain object breaks rendering without throwing — plus a `version` integer, a per-key
  merge against defaults, and a toast when a value is discarded. **The loading toast's accessibility
  check moved to `client/`**, where `Sonner` is already a component and `openArgs` can hold an overlay
  open; the `web` axe lane keeps four reachable states. **Criterion 10** covers the replace path.
  **The icon font** paints its ligature names (`settings`, `play_arrow`) on a cold visit because it
  ships `font-display: swap` with no fallback, so v0 overrides that one face to `block`. The
  **Tracks row discloses** its last three controls behind a per-row expand. The **`Skeleton` lifts**
  only after `document.fonts.load('1em Bravura')` settles, and the **progress bar** clamps to 1 and
  goes indeterminate when `total` is 0.
- **Corrections to lap 4's output, found in lap 5.** **Drum tablature is impossible in the pinned
  1.8.4** — `Staff.finish()` forces `showTablature = false` on any percussion staff,
  `TabBarRendererFactory` sets `hideOnPercussionTrack = true` and requires `staff.tuning.length > 0`,
  verified against `Punk.gp` — so alphaTab PR #2591 is not in this build, Q5 is answered rather than
  open, and the toggle belongs to stringed staves with a tuning (which excludes piano and vocal too).
  `renderScore` takes `trackIndexes: number[]`, but the data flow passed `drumTracks`, which as `Track`
  objects would render an **empty** score with no track-0 fallback. The fork has **two** transposition
  sliders (Transpose Audio and Transpose Full) that lap 4 fused into one, dropping the
  notation-transposing path. The 44 px paragraph miscounted (ten `w-10 h-10` across header, rail and
  footer, not eleven in the footer); "18 design-system components are gated" understated 40 of 41;
  Q2's timing column contradicted its own body; Q6 had made the legacy formats a ship blocker against
  the settled decision; a lap-4 insertion detached the Open-file parenthetical; the package table had
  no home for the popovers or the sample action; and an instruction addressed to the author had been
  left in §4.
- **Fixtures leocaseiro supplied during the review** now live in `web/e2e/fixtures/`, and
  `web/public/charts/1-beat.gp` is the shipped sample. `Punk.gp` closes the multi-track half of Q7 —
  drums at indexes `[0, 2]` around a guitar track, so a regression to rendering only track 0 drops the
  left-hand staff — and it demonstrates the volume coupling §7 now records, since both drum tracks sit
  on MIDI channel 9. Q7 narrows to the percussion-free chart criterion 9 needs; Q6 narrows to a real
  MusicXML export.

**Status:** ✅ decided · 📄 prose-only enforcement so far — the spec is the contract; the machine gate arrives with the v0 build (the Playwright lane in `web/`). Approved by leocaseiro 2026-09-10 (D1–D7) and 2026-09-12 (review decisions).

### 2026-09-18 — `resources/` is data, not code: excluded from the editorconfig gate (NH-291)

Tracking the source chart files under `resources/charts/` made the `lint` job fail 14 times across 4
files. The cause is not formatting drift: `.editorconfig` requires `end_of_line = lf`, `charset = utf-8`
and `insert_final_newline` of **every** file, and a Guitar Pro binary cannot satisfy any of them.
`editorconfig-checker` skips ZIP-container (`.gp`, `.mxl`) and MIDI files on its own, but a `BCFZ`
(GP6/`.gpx`) and a `FICHIER GUITAR PRO v5` (`.gp5`) header carries enough printable ASCII to be read
as text, so those four were scanned and rejected.

leocaseiro's call, 2026-09-18: **exclude both the directory and the formats** —
`.editorconfig-checker.json` gains `^resources/` and `\.(gp|gp5|gpx|mid|mxl)$`.

- **The directory pattern is the principled half.** `resources/` holds third-party musical artifacts
  exported by other tools; it is **data, not code**, and no source-formatting rule should apply to it.
  This also covers `resources/charts/1-beat.xml`, which despite its extension is a Guitar Pro 5
  binary, so no per-file pattern is needed for it.
- **The extension pattern is the travelling half.** Copies of these charts already live under
  `web/public/charts/` and `web/e2e/fixtures/`; excluding by extension means the gate does not have
  to be revisited each time a chart lands outside `resources/`.
- **Accepted cost:** the four alphaTex **text** files (`beat.alphatex`/`.atex`,
  `Punk.alphatex`/`.atex`) are inside `resources/` and so are no longer checked, even though they
  pass today. That follows from treating the directory as data; it was not an oversight.
- **Not a weakened gate elsewhere.** No CI job, workflow or `.editorconfig` rule changed. Every other
  path is checked exactly as before, and the canary for this gate is that removing either pattern
  brings the same 14 errors straight back.

**Status:** ✅ decided · 🤖 machine-checked — the `lint` CI job runs `pnpm run lint:editorconfig`
against this config, so any change to the exclusion list is visible in the diff. Approved by
leocaseiro 2026-09-18.

### 2026-09-16 — Dependency CVE refresh: fix every advisory, keep the ignore list empty (NH-231)

The `deps-cve` gate (osv-scanner) had drifted to **74 advisories across 29 packages** (4 Critical, 43 High, 26 Medium, 1 Low) — all from `pnpm-lock.yaml` on `master`, none from an open PR. leocaseiro chose a **real version fix over an allowlist**: the refresh takes the gate to **0**, and `osv-scanner.toml` now carries **no ignores at all**.

- **The expired ignore was dropped, not renewed.** `GHSA-8988-4f7v-96qf` (`@opentelemetry/core` 1.30.1) expired at `2026-09-16T00:00:00Z`. Its stated reason — that the only fix was an unverifiable otel v1 → v2 major bump under `@pulumi/pulumi` — had become obsolete, because Pulumi 3.255.0 made that move upstream. Bumping `@pulumi/pulumi` to 3.261.0 closes the advisory outright and drops the whole js-yaml v3 line out of the tree, so the `js-yaml@3` override went with it. An expired ignore must be re-argued, never rubber-stamped.
- **Targeted updates only — no blanket `pnpm update -r`.** A blanket run would move the pixel-sensitive UI stack (Base UI, Storybook, TanStack, React, Tailwind) and invalidate the visual-regression baselines. Only named carriers moved.
- **Playwright is held at 1.61.1** (`playwright`, `playwright-core`, `@playwright/test`). Floating it would un-match the three version-exact `minimumReleaseAgeExclude` pins and re-trip the NH-259 release-age gate, and would desynchronise the `mcr.microsoft.com/playwright:v1.61.1-noble` container the `-linux` VR baselines are rendered in. All 612 VR snapshots still match, unchanged.
- **`overrides` is the lever for the deep transitives.** Where a parent resolves its copy below the patch, pnpm reuses the parent's snapshot and `pnpm update` cannot reach it. Nine advisories needed a same-major `overrides` pin (`brace-expansion@1/@2/@5`, `fast-uri@3`, `qs@6`, `smol-toml`, plus raised floors on `multer` and `postcss`). Same major as the parent declares, so no API surface moves.
- **Next.js: 16.2.10 → 16.3.4, not 16.3.5.** Both `next` and `eslint-config-next` were pinned exact, so the 11 `next` advisories could not float. 16.2.11 closes only 9; the two Criticals need 16.3.3+. 16.3.4 declares the same `sharp: ^0.35.4` as 16.3.5 — so it clears both `sharp` rows too — but it is 15 days old rather than 4, which keeps it **outside** the 7-day `minimumReleaseAge` window. Taking 16.3.5 would have forced a `minimumReleaseAgeExclude` entry for a very fresh release, opening a hole in the gate that exists to dodge compromised publishes. **No release-age exception was added by this refresh.**
- **Pre-approved fallback NOT used.** If the 16.2 → 16.3 bump had broken anything, the agreed fallback was to keep the other 61 fixes, revert only `next`/`eslint-config-next`, and time-box a 30-day ignore for the 13 `next`/`sharp` rows. Nothing broke, so no ignore was added.

**Status:** ✅ decided · 🤖 machine-checked — the `deps-cve` CI job is the enforcement, and it now passes with an empty ignore list, so any regression or new ignore is visible in the diff. Approved by leocaseiro 2026-09-16.

### 2026-09-16 — `editorconfig-checker` pinned to v3.11.3: the `lint` job runs again (NH-293)

The `lint` job had been failing on every pull request since **2026-07-16** — the last green `master`
run — and took `CI Green` down with it, blocking every open PR. It is not a violation in the
repository: `editorconfig-checker`'s npm wrapper downloads its binary from GitHub releases, asks for
release `latest`, and looks for an asset whose name starts with `ec-<platform>-<arch>`. Upstream
renamed every asset to `editorconfig-checker-*` in **v4.0.0 (2026-09-03)**, so the lookup finds
nothing and the wrapper exits 1 with `The binary 'ec-…' not found`.

- **Fix:** `lint:editorconfig` sets `EC_VERSION=v3.11.3`, the last release carrying the old asset
  names. The wrapper reads that variable (verified in its shipped `dist/index.js`, where it defaults
  to `latest`), so one script line fixes the CI job, the lefthook pre-push check and `check:all`
  together — rather than pinning the workflow and the hook separately.
- **Verified locally before the PR:** with the pin, the binary downloads and the check passes with
  **zero violations**; without it, the run reproduces the exact CI error. So the two months of red
  were entirely the download, not unnoticed formatting drift.
- **Not accepted as an allowlist or a skip.** The pre-push hook's existing "binary unavailable —
  skipped" branch (also NH-293) stays as a safety net for a genuine network failure; it is no longer
  the normal path.
- **Removing the pin** needs a wrapper release that resolves a v4 asset name; check that before
  dropping it. Recorded in `AGENTS.md` beside the other binary-tool notes.

### 2026-09-16 — ESLint allows TODO comments: `sonarjs/todo-tag` off (NH-299)

leocaseiro asked that ESLint stop blocking TODO comments — in particular, a JSDoc `@todo` tag (`/** @todo … */`) must lint clean in every package. The shared base spreads `sonarjs.configs.recommended`, which turns on `sonarjs/todo-tag` as an error, so every TODO note failed `eslint . --max-warnings 0` in `web/`, `client/` and `server/`. The rule has no option to exempt JSDoc tags, so it is turned off.

- **`sonarjs/todo-tag` → off** in the shared rule layer of [`eslint.config.base.mjs`](../../eslint.config.base.mjs), so the change reaches all three packages; no package config turns it back on.
- **`unicorn/expiring-todo-comments` stays on** (from `eslint-plugin-unicorn` recommended, with `allowWarningComments: true`): plain TODOs pass, and a TODO that carries an expiry condition (for example, a past-due date) still fails.
- **`sonarjs/fixme-tag` is unchanged** — still an error; the request covers TODOs only.
- **Verified:** `eslint --print-config` shows `sonarjs/todo-tag: [0]` and `sonarjs/fixme-tag: [2]` in all three packages. A probe file with `// TODO: …` and `/** @todo … */` failed on `sonarjs/todo-tag` before the change and lints clean after it; a probe with a past-due TODO and a FIXME still fails on `unicorn/expiring-todo-comments` and `sonarjs/fixme-tag`.

**Status:** ✅ decided · 🤖 machine enforcement (the ESLint config itself). Requested by leocaseiro 2026-09-16.

### 2026-07-21 — Typed API contract: DEFER the framework (reverses June's oRPC pick) (NH-284)

leocaseiro personally decided `ARCH-CONTRACT-1` after the re-spike and a NotebookLM study pause. Findings: [`docs/spikes/2026-07-16-typed-contract-respike.md`](../spikes/2026-07-16-typed-contract-respike.md). **Reverses the June oRPC decision** — both premises behind it were false (the `@nestjs/swagger`-under-SWC blocker was fixed in 2023, `nestjs/swagger#2493`; "post-v1.0 Dec 2025" misread the InfoQ article date). Nothing was ever installed, so this was a free choice, not a migration.

- **Framework = DEFER.** No oRPC / tRPC / `@nestjs/swagger` now. At one endpoint a framework does no real work, and deferring is **provably lossless** — a hand-authored Zod schema is a Standard Schema and drops into oRPC/tRPC later unchanged.
- **Interim contract = hand-authored Zod** in `shared/` + `z.infer` types, validated at the web boundary with `.parse()` (this fixes the live "undefined"-render bug). A server-side `import type` drift-guard ties the wire type to the Drizzle row at zero web-bundle cost.
- **Flip conditions:** ~5 endpoints · the CMS write surface (NH-207) begins · or a real external OpenAPI consumer. **Default at the flip = `@nestjs/swagger` + `nestjs-zod` (+ `@hey-api` client)** — the healthy first-party OpenAPI path, **not** oRPC. Reconsider oRPC only after v2 reaches stable + a migration guide + a second substantive maintainer.
- **Rejected:** `nestjs-trpc` (its tRPC client validates nothing — 5/5 bad payloads passed; reproduces the bug); a `drizzle-zod`-derived contract (ships 33 KB of drizzle to the browser, breaks NH-279; derives only three bare `z.string()`s). **Parked:** Kanel (works, and the live-DB objection is dead via the offline PGlite trick — but API-shape ≠ DB-shape at the read; revisit at the CMS where the shape genuinely is the table).

**Status:** ✅ decided (framework deferred; interim = hand-authored Zod) · 📄 prose-only enforcement — the boundary lands with the unparked PR #140 + the Group-1 fixes. `ARCH-CONTRACT-1` updated below. Decided by leocaseiro 2026-07-21.

### 2026-07-16 — AskUserQuestion picker: inert `[Q-add]` catcher + `[No preference]` = NOT READY (NH-285)

leocaseiro ratified three fixes to the AskUserQuestion conventions in [`AGENTS.md`](../../AGENTS.md) section 3, after reporting that agents were using the follow-up catcher to force decisions. Each fix was approved separately in a picker on 2026-07-16.

- **The `[Q-add]` catcher is INERT — it approves nothing.** Its options must carry zero scope and zero action, and the approval verb "go ahead" is banned from them. Evidence: an observed picker put a work scope into the "Nothing" option's _description_ — `{"label":"Nothing — go ahead","description":"Start drafting: plugin scaffold, SessionStart hook, …"}` — so declining to add context silently authorized a scope that was never approved. **Declining to add context is not consent**; approval for a scope is a real question on its own card.
- **`[No preference]` means NOT READY — never "you pick".** That is the literal the harness records when the Skip button is pressed. Agents were reading it as indifference and choosing the option themselves — the exact inverse of the intent, which is "not ready to answer this". Agents must not choose, must not proceed on that decision, and must not re-ask in a loop; they do the unblocked parts and name what is parked. The literal was **verified against real transcripts** (present in 58 files, in situ inside AskUserQuestion results) — the plausible-looking `[Not a preference]` does not exist, so a rule pinned to that string would have been dead text.
- **The catcher moves to the LAST card, reframed to any-topic.** As card 1 it asked for a response "before I act on these" before "these" had been read. It is **not** a duplicate of the per-card "Other" box: "Other" carries context about that card's own question; the catcher carries everything else — an earlier picker's question, a new topic, an unrelated suggestion.
- **Rejected:** deleting the catcher outright. It was proposed on the premise that the catcher duplicated the "Other" box; leocaseiro corrected the premise — the two channels differ in scope, so the catcher stays and is made inert instead.

**Status:** ✅ decided · 📄 prose-only enforcement — these are agent-contract prose in `AGENTS.md`; no machine check today (🟥 no gate can read a picker's options). Approved by leocaseiro 2026-07-16.

### 2026-07-12 — Design-system distribution: direct consumption + accept scoped-glob CSS over-generation (NH-275)

leocaseiro ratified how apps consume the design system (`client/` → future `design-system/`). Full record: [`docs/decisions/2026-07-12-design-system-distribution-adr.md`](2026-07-12-design-system-distribution-adr.md). Refines the NH-275 Phase 1 `@source` pattern; pairs with the 2026-07-08 FE-pivot entry.

- **CSS distribution = scoped whole-component `@source` glob; over-generation accepted.** Apps consume directly (JS via the package + `transpilePackages`; CSS via Tailwind scanning the shared source). Tailwind's scanner is filesystem-based, **not** import-aware, so every scanned component ships its CSS whether or not the app imports it — an explicitly accepted, measured trade (~0.2 KB-gzip per unused component; single-digit KB total, cached once) in exchange for never hand-maintaining a per-component `@source` list. Glob is scoped to components and excludes co-located stories/tests: `@source '…/components/ui/**/*.tsx'` + `@source not '…/*.stories.tsx'` + `@source not '…/*.test.tsx'`.
- **Rejected:** a per-import `@source` script (transitive-graph fragility, silent missing-class failures, no off-the-shelf tool); copy-in / shadcn registry as primary (drift + orphans the co-located VR/a11y/unit gates — kept only as an eject hatch); switching to import-aware CSS (vanilla-extract/StyleX/Mantine/Panda — they solve it but require leaving Tailwind / rewriting the 40 `cva` components).
- **Evidence:** a ce-code-review performance pass measured the over-broad `@source '../../client/src'` scanning **882 files** (the client SPA `routes/`/`hooks/` + the test/story harness, not just components) and shipping `Sidebar`/`Sheet`/`Field` classes the app can't import. The scoped-glob fix applied to the NH-275 web PR (#135).
- **Also decided (from the brief):** extract tokens to `@notation-hero/tokens`; the design-system package should own its `@source` so consumers don't hardcode `../../client/src`.

**Status:** ✅ decided (CSS-distribution mechanism + tokens split + direct-consumption model) · ⏳ enforcement pending — flips when the scoped glob lands in #135 and the tokens / `design-system` rename ships (Phase 2). The `client/ → design-system/` rename and the RSC/Capacitor component seam remain **recommended follow-ups** in the ADR, not yet ratified. Approved by leocaseiro 2026-07-12.

### 2026-07-07 — Component library: Radix + cmdk → Base UI (NH-254 pilot)

Full record: [`docs/decisions/2026-07-07-radix-to-base-ui-migration.md`](2026-07-07-radix-to-base-ui-migration.md). leocaseiro decided to consolidate on **Base UI** (`@base-ui/react`, current package name — not the superseded `@base-ui-components/react`) in place of `radix-ui` + `cmdk`, piloted on the NH-254 catalog components (PR #99) before the wider fleet grows more Radix surface area.

- **Headline change:** `FacetFilter`/`TokenPicker`/`Command` move off a hand-rolled `cmdk` combobox onto Base UI's first-class `Combobox` (built-in multi-select chips + `filteredItems`/`filter={null}`/`onInputValueChange` for async filtering) — `cmdk` is dropped entirely.
- **Tabs/RangeSlider/ToggleChipGroup/Popover** map cleanly to Base UI equivalents (`Tabs.List` gains `activateOnFocus`/`loopFocus` for NH-268; `Popover` renders inline by omitting `Popover.Portal`, cleaner than the current Radix workaround).
- **Gap:** `Combobox` has no built-in `loading` boolean — `useTransition`/`aria-busy`/`Combobox.Status` wiring required to keep the existing `loading` prop on the public contract.
- **Freezes** the in-flight NH-262 (#101/#109/#112) and NH-264 primitive PRs at their current Radix state pending redirect to the Base UI mapping in the ADR. _(Resolved 2026-07-09: those PRs migrated to Base UI and merged to master first; #99 then realigned onto them via merge — zero conflicts.)_

**Status:** ✅ decided · 🟡 partial (updated 2026-07-09 — PR #99 merged) — `cmdk` removal is machine-checked by its absence from `package.json`/`pnpm-lock.yaml`; `radix-ui` intentionally **stays** for `Button`/`Badge`'s `Slot` only (ADR scope — migrate only if a later PR needs it), and that Slot-only restriction is prose-only today (no lint rule blocks new `radix-ui` imports).

### 2026-07-08 — FE pivot: Next.js PWA on Vercel + NestJS-on-Lambda (hybrid BFF)

Re-adopts **Next.js** (App Router PWA) as the product FE, hosted on **Vercel** now (optional AWS re-host later — Amplify/EC2, OpenNext skipped); keeps the **NestJS-on-Lambda** backend behind a hidden, OAC-locked
`api.notationhero.com → CloudFront → Lambda` API, with **Vercel as a BFF** for SSR / server-actions
(hybrid topology). Neon (catalog, cached via `"use cache"`) + DynamoDB (per-user) + Cognito +
**Cloudflare R2** blobs + Postgres FTS. ADR `docs/decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md`,
spike `docs/spikes/2026-07-08-nextjs-vercel-free-tier-caching-search.md`.

- **Supersedes** `ARCH-FE-1` (Vite + TanStack SPA) and closes the 2026-06-16 no-Next.js chain. The new
  variable that resolves the three-time loop: **Vercel hosting** removes the AWS-SSR $0 objection.
- **$0 at portfolio scale**, hard-stops at caps. Watch-outs: Vercel Hobby is non-commercial (→ Pro
  $20/mo, mitigated by re-hosting on AWS — Amplify/EC2), and the new AWS account closes at 6 months unless
  upgraded to the Paid plan.
- **Open:** v1 offline scope (Dexie in v1 or later) — deferred to v1 planning. Follow-up: update the
  `notation_hero_no_nextjs` project memory (currently records Next.js as rejected).

### 2026-07-08 — VR baselines are Linux-only (NH-189, PR #123)

Visual-regression (VR) baselines are now committed for **Linux only** (`*-chromium-linux.png`); the
81 macOS `*-chromium-darwin.png` baselines were deleted. macOS and Linux rasterize fonts differently
(subpixel vs grayscale antialiasing, different glyph metrics), so every darwin/linux pair differed —
one OS is enough as the source of truth. Supersedes the per-OS setup from the NH-189 design-system
foundation.

- **Enforcement:** `*-chromium-darwin.png` is git-ignored (`client/.gitignore`), so a Mac
  `test:vr:update` can still generate local shots for iteration but can never commit them. 🤖
- **Local runs use Docker:** new root scripts `test:vr:docker` / `test:vr:docker:update` render in
  the pinned `mcr.microsoft.com/playwright:v1.61.1-noble` container — the same image the `vr` CI job
  uses, so local and CI rendering match. Running VR natively on a Mac is no longer a supported path
  (docs updated in `client/README.md` + `AGENTS.md`).
- **CI unchanged:** the `vr` job already compared `-linux` inside the container and stays green.

### 2026-07-07 — NH-262 Part 1 primitives ship on Base UI (not Radix) + Button `link` dark-token fix (PR #101)

Records two changes in PR #101 that the plan and PR body originally mis-described. Part of the wider
**NH-269** Radix→Base UI migration; qualifies the brand-600 link-contrast note in the 2026-06-25
NH-189 entry below.

- **Primitives are built on `@base-ui/react` `1.6.0` — a NEW dependency, not the existing `radix-ui`.**
  `Breadcrumb` uses Base UI `useRender` (was Radix `Slot`); `Tooltip` uses `@base-ui/react/tooltip`.
  The plan's "Radix, not Base UI / no new dependency" decision is reversed: `@base-ui/react` (plus
  `@base-ui/utils`, `reselect`) is added to `client/package.json`; `radix-ui` stays for the
  not-yet-migrated components. This aligns the PR with the NH-269 decision taken after the plan was
  written — the PR moves WITH the migration, so the earlier "hold, builds on Radix" note on it is stale.
- **Button `link` variant dark-mode token corrected.** `dark:text-brand-600` (#0d9488) → `text-primary`
  (both themes) + `hover:text-[color-mix(in_oklch,var(--primary),black_12%)]`. **Why:** the NH-189
  entry recorded brand-600 dark links at 5.27:1, but that was the default dark **background** only.
  Breadcrumb newly renders the same classes on a `--muted` **surface**, where `dark:text-brand-600`
  measures **3.95:1 — fails AA**. `text-primary` clears AA on every surface the components paint
  (resting 7.9–10.6:1, hover 5.6–7.5:1). Read the NH-189 "passes AA on dark bg" note and the
  `styles.css` brand-600 comment as default-background-scoped.
- **Enforcement (🤖 NEW):** `client/src/dark-contrast.ts` + `dark-contrast.test.ts` + a `Button.test.tsx`
  "link variant dark-mode contrast (AA)" block pin AA ratios per token pair, read from the real
  `styles.css` values, so a future token edit fails fast in unit tests on every surface — not just the
  one a story happens to render.
- **Overlap — PR #118 (NH-264, Button+Badge Radix→Base UI):** #118 rewrites `Button.tsx` imports + base
  class + `asChild`→`render` but does NOT touch the `variants.variant` map, so `Button.tsx` merges
  cleanly and this PR's `link` fix survives either merge order. Real rebase conflicts (whichever lands
  second): both PRs independently add `client/src/vr-helpers.ts` (add/add — #118's `statesForStory` API
  is a superset), `Button.vr.ts` (content), 6 `link` snapshot PNGs, and the `@base-ui/react` specifier
  (`1.6.0` exact here vs `^1.6.0` in #118 — align before merge). #101 owns the `link` fix; #118
  reconciles the VR helper on rebase.

### 2026-07-05 — Storybook PR previews on GitHub Pages (NH-266, PR #113)

Per-PR Storybook previews publish to the `gh-pages` branch of this public repo — each PR at
`/pr/<number>/`, latest `master` at the site root — so the component library is reviewable in the
browser with no local setup. Spec `docs/specs/2026-07-05-storybook-pr-preview-design.md`, plan
`docs/plans/2026-07-05-storybook-pr-preview-plan.md`.

- **Mechanism = hand-rolled `peaceiris/actions-gh-pages`, NOT `rossjrw/pr-preview-action`.** rossjrw
  hardcodes a `pr-<n>` inner path (verified in its `lib/main.sh`) and cannot produce the required
  bare-number `/pr/<n>/`; peaceiris gives exact `destination_dir` control. Cost: a hand-written
  sticky comment + cleanup-on-close.
- **Classic `gh-pages` BRANCH source, NOT the `actions/deploy-pages` artifact model** — the artifact
  model replaces the whole site per deploy, so independently-accumulating per-PR folders need a
  branch. One-time manual: Settings → Pages → Deploy from a branch → `gh-pages` / root (enabled
  2026-07-05).
- **Storybook base path via `viteFinal`** reading `STORYBOOK_BASE_PATH` (default `/`) — Storybook v10
  has no `--base` CLI flag; the default `/` leaves `dev` / `vr` / `a11y` / `build` unchanged.
- **NOT a `ci-green` required check** — absent from `ci-green`'s `needs:`, so a skip on a
  non-`client` PR never deadlocks merge. The build runs untrusted PR code with **no secrets**; only
  the separate publish + cleanup jobs hold `contents:write` (built-in `GITHUB_TOKEN`, no AWS/OIDC) —
  the NH-206 no-AWS-creds-on-PRs posture is untouched.
- **Enforcement:** 🤖 `actionlint` (CI lint job) + a build-time base-path assertion in the workflow;
  the preview is convenience, not a merge gate. Deferred (plan Scope Boundaries): fork-PR previews
  via `workflow_run`, a reconciliation sweep for the rare cleanup-eviction orphan, `shared/**` in the
  path filter.

### 2026-07-02 — NH-260 markdownlint emphasis/strong styles pinned (MD049/MD050)

`.markdownlint.yaml` now pins `MD049` (emphasis/italic) to `underscore` and `MD050`
(strong/bold) to `asterisk`, replacing markdownlint's default `consistent` mode.
Follow-up from NH-260 / PR #96, where this cascade was first hit.

- **Why:** in `consistent` mode the _first_ emphasis span in a file anchors the
  expected style, so one stray wrong-style span near the top of a doc re-flags every
  pre-existing span far from the edit — a confusing 132-error cascade that looks like a
  version/parity bug but is not. An explicit style makes a wrong span fail at its _own_
  line with `Expected: underscore` instead.
- **Matches repo convention** — verified bold overwhelmingly uses `**` not `__`;
  underscore italics predominant. `pnpm run lint:md` stays green on all 125 `.md` files
  (no file needed fixing), so the pin is consistent repo-wide, not merely predominant.
- **Enforcement:** the existing `lint:md` gate (CI + pre-push) now flags a wrong-style
  span at its own line. Regression-checked: a throwaway asterisk-italic reproduced
  132 → 2 errors, then reverted.

### 2026-07-02 — NH-260 local .env loading (dotenv) + registry corrections

PR #96 wires local-dev env loading via bare `dotenv` and records two registry items.

- **L12-envload (new):** local runtime env loading = `import 'dotenv/config'` in
  `server/src/main.ts` + `server/src/adapters/neon-postgres/seed.util.ts` — local-dev only; Lambda/CI
  inject env (dotenv `override:false` never clobbers). The _loader_, distinct from the still-pending
  typed _validation_ (L12-env). Alternatives weighed + rejected for now: `@nestjs/config` (heavier,
  Nest-coupled), t3-env (validates but doesn't load — needs a loader beneath it).
- **DS-12 (search) status corrected:** the `pg_trgm`/`unaccent`/`tsvector` search decision stays 🔒
  locked, but it is **not** in the current Playable migration (`0000_playable_init`) — implementation
  deferred to **NH-123** (real read API). Reference DDL = `2026-06-10-catalog-schema.md` §4/§9 (old
  `catalog_item` model).

### 2026-07-02 — NH-259 pnpm supply-chain SAST hardening + release-age window 3→7 days

PR #95 clears the 5 blocking Semgrep supply-chain findings that were failing the `sast` gate on master
and every open PR (3 pnpm rules on `pnpm-workspace.yaml`, plus `.npmrc` `npm-missing-minimum-release-age`
and `.github/dependabot.yml` `dependabot-missing-cooldown`).

- **Settings added:** `pnpm-workspace.yaml` — `minimumReleaseAge: 10080` (7 days), `trustPolicy: no-downgrade`
  (+ `trustPolicyExclude` for the two false-positive transitive pins `semver@6.3.1` / `chokidar@4.0.3`),
  `blockExoticSubdeps: true`. `.npmrc` — `min-release-age=7` (inert for this pnpm-only repo; clears the npm
  rule). `.github/dependabot.yml` — `cooldown.default-days: 7`.
- **Release-age window raised 3 → 7 days.** E-renovate-harden (DACI:213/340) previously specified
  `minimumReleaseAge '3 days'`, but the Semgrep pnpm rule mandates **≥ 7 days**, so 3 days can no longer
  satisfy the `sast` gate. Reconciled the DACI + registry to **7 days**; Renovate (NH-89) must use ≥ 7 to
  match pnpm's install-time gate (a shorter Renovate window would open PRs whose frozen install fails until
  day 7).
- **Drift-guard:** the `trustPolicyExclude` / `minimumReleaseAgeExclude` pins are version-exact, so a
  lockfile bump silently un-matches them and re-trips the gate. `tooling/check-supply-chain-pins.mjs`
  (`pnpm run check:supply-chain-pins`, wired into CI lint + pre-push) fails early if any pin drifts from
  `pnpm-lock.yaml`.

### 2026-06-30 — NH-210 catalog table lands: TanStack DataTable + VR/a11y gates

PR #92 ships the NH-210 click-to-sort catalog table: a reusable `ui/DataTable<TData>` TanStack
engine (2-state asc/desc sort, column visibility, card/rows appearance, loading/empty states) plus
the catalog cell components (`ScoreDonut`, `LevelPill`, `Cover`, `Flags`, `KindBadge`, `NewPill`,
`Bpm`, `PlayButton`, `NameCell`) and a thin `catalog/CatalogTable` config. Storybook-tested only —
wiring into a route is deferred (see the spec's "Out of scope").

- **SD-10 (TanStack Table) — FE half now realised + machine-checked.** The `DataTable` engine
  exists and every table view builds on it; the per-component VR (`chromium`, darwin + linux
  baselines) and axe `a11y` Playwright projects are blocking CI gates. The grouped "📄 prose-only
  → 🤖 at Phase 2 (NH-207)" status above still holds for the **backend** `core/catalog` + Neon
  adapter; this entry records that the **front-end** table contract is now enforced in CI.
- **Review fixes (PR #92, ce-code-review):** a row-keydown a11y fix (pressing Enter on the in-row
  Play button no longer also opens the row), dead-code + duplicated class-string cleanups, a shared
  axe a11y helper (`client/src/a11y-helpers.ts`, deduped across 13 suites), and a standalone `Badge`
  harness (its `default` bright-fill variant was previously only axe-tested transitively).

### 2026-06-28 — NH-79 lands: connection keys enforced; CORS deferred to NH-250

Implemented the 2026-06-27 connection-keys design (NH-79): two Neon roles (owner DDL / `nh_app`
DML), both urls as GitHub Actions secrets, a DDL-first Drizzle runner + `0000_playable_init`
migration, a CI migrate-before-`up` step, an idempotent TS-4 seed (`seed.sql` + one-click
`seed-catalog` workflow), the `LambdaWithUrl` env injection, the `robots.txt` `/api/` guard, and a
thin Neon-backed `GET /api/catalog` (Cache-Control header).

- **Status flip:** the 2026-06-27 entry's "⏳ enforcement pending" is now **🤖 enforced** — the CI
  migrate step, the `LambdaWithUrl` env wiring, and the layout/depcheck guards cover it. The
  auto-derived status table below reconciles on the next `docs(registry)` regen; this entry is
  authoritative.
- **CORS deferred -> [NH-250](https://leocaseiro.atlassian.net/browse/NH-250)** (same sprint as the
  backend). The thin read ships only the `Cache-Control` header; the site-origin CORS policy §11
  put in NH-79 moves to NH-250, because the site origin (the CloudFront URL) is a deploy output
  created after the Lambda — injecting it would be circular — and the app is same-origin today.
- **Masked single-voice leaves** are seeded `listable=false`, so the thin read's `WHERE listable`
  hides them as §11 intended.

### 2026-06-27 — Neon connection keys: GitHub-secret keys + CI-first migrate (NH-79)

Brainstorm-approved design for the Pulumi+Neon **connection-key plumbing** — the foundation under the catalog read slice (NH-79 → NH-123). Full design: `docs/superpowers/specs/2026-06-27-neon-pulumi-connection-keys-design.md`. **Refines a locked decision** (RC-6 / 2026-06-10) — the mechanism only, not the intent.

- **RC-6 mechanism refined — Pulumi config secret → GitHub Actions secrets.** The Neon connection string is no longer a `pulumi config set --secret` value; it lives as two GitHub Actions secrets (`NEON_DATABASE_URL`, `NEON_MIGRATION_URL`). RC-6's _intent_ is unchanged (an env var at rest, **not** SSM, $0). Reasons (leocaseiro, 2026-06-27): GitHub **auto-masks** secrets in a **public** repo (safer than `pulumi config get --show-secrets`, which prints plaintext), and it enables **100% CI/CD** with zero recurring local runs.
- **Two Neon roles (least-privilege).** Owner role = DDL/migrations (`NEON_MIGRATION_URL`, TCP, CI-only); a new least-privilege `nh_app` role = DML/runtime (`NEON_DATABASE_URL`, HTTP `neon-http`, the only url injected into the Lambda env). A leaked Lambda env can read/write rows but cannot alter the schema.
- **Migrate before deploy, in CI.** `deploy.yml` gains a `drizzle-kit migrate` step as the **first** step (needs only Node + the GitHub secret, no AWS), so it runs before `pulumi up`; idempotent; a failure aborts before any AWS mutation. Seed = a one-click `workflow_dispatch` workflow (not the auto deploy).
- **DDL-first Drizzle runner.** The raw 8-table DDL stays the migration source of truth (`ARCH-ORM-1`); `drizzle-kit generate --custom` + `migrate`; `catalog.schema.ts` hand-written for query typing; files under `server/src/adapters/neon-postgres/`.
- **Minimal compute guard.** `robots.txt` disallow `/api/*` + a dev Neon branch + a `Cache-Control` header on the thin read; the CloudFront edge-cache (the real bot/crowd protection) is deferred to **NH-247**. Free-tier verified $0/month current (KMS $0, Lambda/CloudFront perpetual free, Neon 0.5 GB / 100 compute-hours, sleeps after 5 min idle).

**Status:** ✅ decided · ⏳ enforcement pending — flips to 🤖 when NH-79 lands (the migrate CI step, the `nh_app` grants, the `LambdaWithUrl` env injection, the runbook). Approved by leocaseiro in the 2026-06-27 brainstorm; implementation plan deferred (LGTM-pause).

### 2026-06-27 — `playable.slug` friendly URL token + wireframe author-on-UI / column sort (NH-221, NH-223, PR #88)

New decision (leocaseiro, mid-review on PR #88): every playable gets a stored **`slug`** — a friendly URL token separate from the opaque ULID id — addressed by routes (`#/song/yellow`, `#/fill/zoio-de-lula-tom-fill`) with the id as a fallback; `UNIQUE` index + title→slug backfill → `NOT NULL` modelled in the draft seed (validated: 19 playables → 19 distinct slugs). Full record: `docs/decisions/2026-06-27-playable-slug-url-token.md`.

The same **PR #88** wireframe pass also **realises** existing deltas in the low-fi sim (no new decisions): SD-13/SD-33 `author[]`+`author_type` now **surfaced on the catalog rows** (songs = artist, lessons = **teacher**) with an **Author/Artist facet incl. an "Unknown" option** and author-search in lessons; SD-31 kind+context routes; NH-222 structured song lesson; SD-11 flag filters + playback-source toggle; **SD-10 clickable column-header sort** (the sort dropdown moved into "More"). README version log → v1.4/v1.5.

**Status:** ✅ slug decided · ✅ **landed in NH-79** (2026-06-28, PR #90): `slug text NOT NULL` + `UNIQUE` index in `0000_playable_init` + a slug per seed row (19 distinct) + returned by the thin read. PR #88 open. NH-221/NH-223/NH-210/NH-211/NH-222.

### 2026-06-26 — e2e is a required CI gate: Playwright lane + traces (NH-197)

Stood up the first **e2e test lane** and wired it into the required `ci-green` gate (joins `a11y`/`vr` as a blocking Playwright gate; full design + findings: `docs/specs/2026-06-26-nh-197-e2e-traces.md`, plan: `docs/plans/2026-06-26-001-feat-nh-197-e2e-traces-plan.md`).

- **NEW: e2e is a required CI gate.** A new `e2e` job runs Playwright against the **built SPA** (`vite preview`, separate `client/playwright.e2e.config.ts`) — distinct from the Storybook-based `a11y`/`vr` lanes — wired into the `ci-green` aggregate via four edits (needs + var + echo + loop). On failure it uploads `client/playwright-report/` + `client/test-results/` as the `playwright-e2e-report` artifact with `if: ${{ !cancelled() }}` (D5 — keeps flaky-then-passed traces), 7-day retention; `actions/upload-artifact` SHA-pinned (`ea165f8…`, v4.6.2); `trace: 'on-first-retry'`.
- **MSW is the foundation mock layer.** `msw@2.14.6` + `@msw/playwright@0.6.7` intercept `/api/*` at the browser network layer (`context.route`); the smoke test (`client/e2e/smoke.e2e.ts`) is the reusable template future feature tests copy. `pnpm-workspace.yaml` `allowBuilds: msw: false` (MSW's service-worker postinstall is unneeded; otherwise `--frozen-lockfile` fails `ERR_PNPM_IGNORED_BUILDS`).
- **Two spec corrections** (in the spec's "Implementation findings"): `onUnhandledRequest` is the function form scoped to `/api/*` (the bare string `'error'` errors on the `GET /` document load); `vite preview` **does** honor `server.proxy` (an unmocked `/api/*` → 502) — the lane is correct because MSW intercepts before the proxy.

**Escape hatch (D3):** if the lane flakes and blocks unrelated PRs, revert the four `ci-green` edits — the job keeps running but stops gating.

**Overlap note:** open **PR #85** (NH-243 lint) also edits `.github/workflows/ci.yml` + `client/package.json`; these changes are additive (new `e2e` job, `ci-green` needs entry, `test:e2e` scripts, `msw` dep), so conflicts are mechanical. This change-log is `merge=union`, so the registry entry itself won't conflict.

### 2026-06-26 — Unified linting & formatting consolidation (NH-243, PR #85)

Shipped the single linting/formatting system (consolidates NH-42 ESLint flat config, NH-43 Prettier, NH-168 jsx-a11y — all now `Cancelled` as superseded). Lands: shared `eslint.config.base.mjs` + per-package extends (`client/`, `server/`); one root `prettier.config.mjs` (printWidth 100) separated from ESLint (`eslint-config-prettier/flat`, no `eslint-plugin-prettier`); extra linters markdownlint/stylelint/yamllint/cspell/shellcheck/actionlint/editorconfig-checker/sort-package-json; lefthook auto-fix on commit + full check on push; a dedicated CI `lint` job (check-and-block) gated on `code || docs_or_config`. Affected rows already flipped: `L3-eslint`, `L3-prettier`, `M4-prettier`, `L12-a11y`. Post-review hardening on the PR: CI path-filter now covers the 5 root lint configs (eslint/prettier/editorconfig-checker/prettierignore/stylelintignore); `check:all` mirrors the lint+quality jobs; shell tests wired into `test:tooling`; plus quality nits (lint:shell whitespace-safe, actionlint curl retry, sort-pkg in pre-push, deduped ignores). **PR #85.** NH-243.

### 2026-06-26 — `ci-green` gate: collapse 3 job lists → one `toJSON(needs)` pass; deny-list → allow-list (NH-22)

Refactored the `ci-green` aggregation job (the single required status check) in `.github/workflows/ci.yml` to derive its job set from one `jq` pass over `${{ toJSON(needs) }}` instead of three hand-synced lists (the `needs:` array + a per-job `result` var + a `for`-loop). The `needs:` array is now the only list — adding a gate is a one-line edit. Behaviour preserved: the `changes` gatekeeper must `success`; any other job `failure`/`cancelled` fails; `skipped` is OK. The failure check is now an **allow-list** (fail unless `success` or `skipped`) rather than a deny-list, so an unknown future `needs.*.result` value fails **closed** — per ARCH-GUARD-1/CR-1 (prefer allow-lists for fences). Verified by local fixtures + a deliberate live red-run on the branch. Implementation-only; enforcement unchanged. **PR #84.** NH-22.

### 2026-06-26 — L5-vitest re-scoped: `infra/` → Vitest; `tooling/` stays `node --test` (NH-38)

Evaluation of NH-38 ("migrate `node --test` → Vitest") found the repo-wide goal **mostly already done**: `client/` + `server/` ship on **Vitest `^4.1.9`** (arrived with their scaffolds). Only `infra/` (TypeScript, `node --test "*.test.ts"`) and `tooling/` (plain `.mjs`, `node --test tooling/*.test.mjs`) still run `node --test`. leocaseiro approved **re-scoping NH-38 to `infra/` only**:

- **`infra/` → Vitest** — its Pulumi-mock stack tests would match `client`/`server`'s config. The remaining real value of L5-vitest.
- **`tooling/` stays on `node --test`** — _deliberate, documented exception_, not debt. The 3 `tooling/*.test.mjs` gate tests (`pr-checklist*`) are plain JS using no TypeScript / DOM / mocking / snapshots; `tooling/` has **no `package.json`** and is outside the pnpm workspace graph **by design** (dependency-free, its own `.prettierrc`, run as a standalone CI step). Vitest adds churn, not value. Revisit only if `L2-probes` (the planned Vitest probe suite under `tooling/probes/`) ever lands.

The original `L5-vitest` Open Qs (Nx per-project config, `adapters/postgres` Docker) are **moot** — Nx was dropped (ADR 2026-06-17) and the Postgres concern now lives in `server/` (already on Vitest).

**Status:** L5-vitest **now live across all TypeScript packages** — `client/` + `server/` + `infra/` ✅ on Vitest (`infra/` migrated this session: `vitest run`, 10 tests green, commit `df544a1`); `tooling/` ✅ stays `node --test` (deliberate exception — the only package off Vitest, by design). The auto-derived `L5-vitest` row below (still reads "via @nx/vite … deferred") reconciles on the next `docs(registry)` regen; **this entry is authoritative.** NH-38.

### 2026-06-26 — CI deploy role: grant `iam:GetPolicyVersion` for the boundary preflight (NH-242)

Follow-up from NH-235 (PR #79). The deploy role's boundary-verification preflight (`infra/index.ts` → `aws.iam.getPolicy`) logs `warning: Could not verify the CI permissions boundary … (iam:GetPolicy denied)` on every `pulumi up`. The `ReadCiRoleBoundary` statement granted only `iam:GetPolicy`, but the data source also reads the policy **document** + tags → it needs `iam:GetPolicyVersion` and `iam:ListPolicyTags`. (The `(iam:GetPolicy denied)` text is a hardcoded label in the warn string, not the real denied action.) Added both, scoped to the single boundary ARN, in **both** `aws-iam-ci-deploy.json` and `aws-iam-pulumi-local-deploy.json`. Read-only + single-resource → no privilege increase. ⬅ **leocaseiro re-runs `aws-ci-oidc-bootstrap.sh` (admin SSO) + one `pulumi up`; the boundary warning should disappear.** Restores the NH-206 review #6 preflight intent (a genuinely-missing boundary fails fast instead of warning-through).

**Status:** ✅ decided · 🤖 enforced at deploy time — pending leocaseiro's re-apply + deploy (warning clears). NH-242.

### 2026-06-26 — CI deploy role: tighten S3 `s3:*` to enumerated least-privilege (NH-235)

**Implements the D8 follow-up** from the 2026-06-24 "OIDC deploy hardening — review #3" entry below ("leave + follow-up ticket"). The two `s3:*` statements — `SpaBucket` (`site-spa-*`) and `PulumiStateBucket` (`notation-hero-pulumi-state-*`) — are replaced with enumerated actions, split bucket-level vs object-level:

- **SPA bucket** → `SpaBucketManage` + `SpaBucketObjects`: only the writes the stack actually performs (`Create`/`DeleteBucket`, `PutBucketPublicAccessBlock`, `PutBucketOwnershipControls`, `Put`/`DeleteBucketPolicy`, object `Put`/`Get`/`Delete` + tagging) plus the **complete** `aws.s3.Bucket` (v1) refresh read-set (`GetBucketAcl`/`Website`/`Versioning`/`Encryption`/… — generous on harmless reads, strict on writes). Dropped vs `s3:*`: `PutBucketAcl`, `PutBucketVersioning`, `PutEncryptionConfiguration`, `PutReplicationConfiguration`, `PutBucketLogging`/`Website`/`Notification` — none used by the stack, so a poisoned `infra/` dep in the master `up` job can no longer weaken encryption, add an exfil replication rule, or grant a cross-account ACL.
- **State bucket** → `PulumiStateBucket` + `PulumiStateObjects`: the Pulumi S3-backend actions only (`ListBucket` + `GetBucketLocation`; object `Get`/`Put`/`Delete`).
- **CloudFront `Resource:"*"` deliberately kept** — actions are already enumerated; OAC/Function/Distribution ARNs don't exist at plan time and `Create*`/`List*` can't be resource-scoped, so scoping a from-scratch create is high-effort for ~no gain.

Applied to **both** `aws-iam-ci-deploy.json` and the identical `aws-iam-pulumi-local-deploy.json` (no drift). ⬅ **leocaseiro re-applies the updated `aws-iam-ci-deploy.json` to the live `notation-hero-ci-deploy` role (admin SSO — re-run `aws-ci-oidc-bootstrap.sh`) and runs ONE real `pulumi up` to validate before merge** — a missed S3 `Get*` surfaces as `AccessDenied` naming the action; add it and re-validate. Rollback = `git revert` + re-apply the prior JSON.

**Status:** ✅ done · 🤖 enforced at deploy time — **validated 2026-06-26**: re-applied to the live role + Deploy rerun (run 28200803405, attempt 2) went green under the tightened policy (`Resources: 32 unchanged`, no `AccessDenied`). Read/refresh path confirmed; write actions exercise on the next content/config deploy. NH-235.

### 2026-06-26 — Governance: never delete remote branches (NH-241)

AGENTS.md "Commit & review workflow" now forbids deleting a **remote** branch — no `git push origin --delete`, no `gh pr merge --delete-branch`, no GitHub UI/API deletion — even after a PR merges; the user keeps merged branches on GitHub for history. **Local cleanup stays fine:** remove the merged worktree + delete the local branch; only `origin/<branch>` must survive. User instruction (2026-06-26); also captured in agent memory.

### 2026-06-25 — SD-15 voicing by track + bar: detailed design within Thin (NH-213, PR #76)

Refines the 2026-06-24 "SD-15 → stay Thin" resolution below into the actual voicing **design** (brainstorm, leocaseiro). A "partial voicing" is one shape everywhere — `{track, voices[], barRange?}` — all jsonb/runtime, **no DDL**:

- **V-1** Display/consume only → the jsonb section grid `data.sections[].tracks[].voices[]`; **no `section_voice` search table** (song/track search already covered by `drum_profile.kit_pieces[]`; flips only if per-section catalogue search ever becomes real).
- **V-2** Voice vocab = a per-instrument code map: drums `kit_pieces` (hi-hat/snare/kick/crash/ride/tom) + piano `left-hand`/`right-hand` (hands-separate); guitar/bass none (role covers their partial). Enforced in app/ingest, not a DB CHECK (mirrors SD-26/SD-28).
- **V-3** `voices[]` joins the Group D per-(section,track) grid cell `{track, voices[], level?, techniques[]?}`; section-level union derived in code, never stored.
- **V-4** Lessons: **Hybrid, incremental** — reusable/named partials = `pattern` playables via the existing `step` junction (zero schema change); per-song-section / hands-separate drills = inline `step.data.voicing`, added when the first such lesson lands (also lands SD-17 step description). `step.data jsonb` is the only deferred DDL.
- **V-5** Capo is **not** a voice (`voices[]` = which sub-streams sound); per-section settings (capo/tuning) go to `techniques[]` / a `settings{}` bag — deferred, not built.

Applied to the draft seed (Bohemian voices, validated on `nh_tonal_scratch` + poke #8) + the catalog wireframe (Yellow drums + piano-hands per-section render, verified in-browser). Spec: `docs/wireframe/2026-06-25-voicing-by-track-bar-spec.md`. The player runtime voice-filter for "hear just hats+kick" (AlphaTab's mixer is per-track) is flagged as a **player-layer** concern, not catalogue schema.

**Also (enforcement):** new root `.prettierignore` excludes the hand-maintained `docs/wireframe/*.html` sims — a one-line edit otherwise reflows the whole 137 KB file. Prettier stays scoped to real source (`tooling/`, `server/` each have their own `.prettierrc`).

**Status:** ✅ decided · 📄 prose-only (draft DDL — no machine enforcement until the real `core/catalog` + Neon land). Approved by leocaseiro in the 2026-06-25 brainstorm.

### 2026-06-24 — CI deploy role: add missing Lambda read perm; lock-recovery on cancel-only (NH-206 follow-up)

**Follow-up after #64 merged.** The first CI-driven `pulumi up` on master failed with `AccessDeniedException: lambda:GetFunctionCodeSigningConfig` — the aws provider reads a ZIP function's code-signing config on every `aws_lambda_function` update, but the least-privilege deploy role lacked it. Added `lambda:GetFunctionCodeSigningConfig` to `aws-iam-ci-deploy.json` **and** `aws-iam-pulumi-local-deploy.json`. Audited the full provider read-set (provider source + issue #27986): that was the **only** gap — `s3:*` / CloudFront / IAM / logs are already complete; deliberately did **not** add `lambda:GetRuntimeManagementConfig` (not called by `aws_lambda_function`, would over-grant). Also tightened `deploy.yml`'s stranded-lock recovery to fire on `cancelled` (hard-kill) only — a clean `failure` releases the lock, so firing on it was a false alarm. ⬅ **leocaseiro re-applies the updated `aws-iam-ci-deploy.json` to the live `notation-hero-ci-deploy` role (admin SSO)** — also clears the stale `iam:GetPolicy` boundary-read the failed run warned about.

### 2026-06-24 — NH-238 bot-exempt the pr-title commitlint gate (L6)

Dependabot PRs were stuck red: the `pr-title` job (commitlint on the PR title) had no bot exemption, and dependabot capitalizes its subject (`chore(ci): Bump …`), which commitlint rejects via `subject-case` → `pr-title` fails → the required `CI Green` fails. Added `&& github.event.pull_request.user.type != 'Bot'` to the `pr-title` `if:`, mirroring the `pr-checklist` job's existing bot exemption; `CI Green` treats a skipped job as OK, so bot PRs go green. Trade-off (documented in the workflow comment): a dependabot PR's squash subject lands on `master` un-commitlinted — acceptable, since the `chore(ci):` type/scope are valid and dependabot's "Bump" capitalization can't be changed. Relates to NH-16 (PR policy / L6).

### 2026-06-24 — NH-237 PR-checklist auto-inject + resync (extends NH-16, L6)

Closed the "agents paste the checklist by hand" gap. The merge checklist lives in `.github/pull_request_template.md`, but GitHub auto-fills it only in the web "Open a PR" form — PRs opened by agents/CLI via `gh pr create --body` skip it, so the author had to paste all items to pass the `pr-checklist` gate. New `pr-checklist-sync` workflow + `tooling/pr-checklist-sync.mjs` **append only the missing canonical items** to a PR body (additive — never edits existing lines or ticks boxes) on `pull_request: opened`, and **fan out to every open PR** via a `workflow_dispatch` button or a `push` to `master` that changes the template. Shared `tooling/pr-checklist-lib.mjs` gives the sync and the gate one matching function so they can't disagree; `tooling/pr-checklist.mjs` refactored to import it (behavior identical — gate tests incl. #64's infra-preview check stay green, +4 lib +4 sync cases). **Enforcement unchanged** — boxes arrive unticked; the strict gate still requires every box `[x]`. Rejected: `mheap/require-checklist-action` (re-adds the `~~N/A~~` escape removed in v1.1) and comment-delivery (would force a gate rewrite); DangerJS stays the NH-16 v2 backlog. Uses `pull_request` (not `pull_request_target`) — fork PRs aren't auto-injected (read-only token; acceptable for a solo repo). Spec: `docs/specs/2026-06-24-pr-checklist-auto-inject.md`. `AGENTS.md` "PR checklist (CI-gated)" updated.

### 2026-06-25 — Design system foundation: shadcn + preset, Storybook, Playwright VR (NH-189)

First **`tlc-spec-driven`** feature (introduces `.specs/`). Builds the client component foundation on the existing Vite SPA. Full decisions: `.specs/features/design-system-foundation/` (spec/design/tasks) + `.specs/project/STATE.md` (D1–D10). Tracked by **NH-189** ("Build temporary design system"); fulfils the **NH-29** Storybook-scaffold trigger (first `.tsx` component); adjacent to **NH-16** PR-policy.

**Decisions (✅ decided · client-scoped):**

- **shadcn/ui v4 + preset `b5claE9qM`** applied via `shadcn apply --only theme,font` (NOT `--template next` — Next.js stays dropped, `ARCH-FE-1`). Teal theme + Public Sans land in `src/styles.css`; `@remixicon/react` removed.
- **Icons = Material Symbols Outlined**, **self-hosted** via `@fontsource-variable/material-symbols-outlined` (`@import` in `src/styles.css`; was Google Fonts CDN — changed 2026-06-25 for ARCH-SEC-2 CSP `font-src 'self'` + iOS Capacitor offline), NOT the preset's Remix Icon. Icon-only + text+icon Button variants wired.
- **Folder-per-component, PascalCase** — `components/ui/Button/Button.{tsx,test.tsx,stories.tsx,vr.ts}`; **`@/` import alias** (shadcn default — "generators-first"; reverses the initial `#/` choice on 2026-06-25, folder-per-component kept; single quotes + semicolons stay the deliberate exceptions).
- **Storybook v10** (`@storybook/tanstack-react`, docs + a11y addons) + **Playwright visual-regression** (`*.vr.ts`, `toHaveScreenshot`, webServer = Storybook). VR marker is `.vr.ts` (not `.spec`/`.test`) to dodge the Vitest collision + the layout-guard same-name-sibling rule.

**Enforcement (🤖) — what this PR changes:**

- **UPDATE (NH-243):** `eslint-plugin-prettier` was **removed** from both packages (spec D2). Prettier is now separated from ESLint: `eslint-config-prettier/flat` (added last in `eslint.config.base.mjs`) turns off ESLint rules that conflict with Prettier, and a dedicated `prettier --check` step in the CI `lint` job + lefthook pre-push enforces format drift. Client and server Prettier settings (`semi: true`, `printWidth: 100`) are now consolidated in one root `prettier.config.mjs`.
- **NEW: accessibility is a required CI gate.** axe-core (WCAG 2 A+AA) runs over every Storybook story in light + dark via Playwright (`*.a11y.ts`, `test:a11y`); the new `a11y` CI job is wired into the `ci-green` aggregate. Storybook gained a real `.dark` theme toggle (decorator) so a11y reflects the actual rendered colors. Two preset contrast fixes followed: light `--destructive` darkened (soft destructive 3.97 → 5.15:1) and dark-mode links use the mockup teal `#0D9488` (new `brand-600` token, 2.61 → 5.27:1).
- The folder-per-component layout + no-`stories/`-dir + co-located-test-sibling rules are already carried by `tooling/check-layout.sh` (`CONV-1`/`CONV-2`); no guard change needed.

**Deferred (own follow-ups):** VR baselines are local (darwin) only — CI/Docker-Linux baselines + wiring VR into CI are deferred (design.md §D); component set beyond Button is post-foundation.

**Overlap note:** this PR also edits this registry change-log; open **PR #74** (NH-16) is making this section `merge=union` for exactly this reason — low conflict risk.

### 2026-06-24 — CI/CD: OIDC deploy hardening — drop preview-on-PR (NH-206 review #3)

**PR #64.** **Revises** the 2026-06-23 CI/CD entry below: the `pull_request` → `pulumi preview` job and the `pull_request` OIDC trust subject are **removed**. A PR-triggered preview ran arbitrary `infra/*.ts` under the full deploy role (S3 state + SPA `s3:*`, CloudFront `Resource:"*"`, Lambda `UpdateFunctionCode`, + the injected `PULUMI_CONFIG_PASSPHRASE`) — medium-low risk solo, **HIGH** once a collaborator can open a same-repo PR. Approved by leocaseiro 2026-06-24 (brainstorm + 3-agent research; spec `docs/specs/2026-06-24-nh-206-oidc-deploy-hardening.md`).

- **Preview is LOCAL-only now.** `deploy.yml` drops the `pull_request` trigger + the `preview` job → **push-to-`master` only**, so **no AWS credentials touch any PR** (and no infra detail leaks into public Actions logs/comments — the repo is public). `pull-requests: write` dropped; the passphrase exposure dissolves with the preview job.
- **Trust narrowed to a master-only `production` GitHub Environment.** `aws-ci-oidc-bootstrap.sh` trust `sub` → `repo:leocaseiro/notation-hero:environment:production` only (was master ref + `pull_request`); the `up` job sets `environment: production`; the environment is restricted to `master` (created via `gh api`, no reviewers) — two independent gates. ⬅ **leocaseiro re-runs the bootstrap script (admin SSO)** to apply it.
- **Agent local-preview safety-net (partial NH-16 v2 diff-aware gate).** New `AGENTS.md` rule: an agent that changes `infra/` runs `pulumi preview` locally and records a classification under `## Pulumi preview` in the PR body, filing a required task (PR checklist **+** Jira mandatory `customfield_10041`) for any destructive/exposure change. `tooling/pr-checklist.mjs` is now **diff-aware** — a PR touching `infra/**` (via the `changes` paths-filter `infra` output) fails on an empty preview section. 4 new `node --test` cases.
- **Hardening:** OIDC `audience: sts.amazonaws.com` pinned (H2); **every GitHub Action SHA-pinned** to a commit, Dependabot-maintained (H3); S3 state-bucket runbook `docs/runbooks/aws-s3-state-hardening.sh` — versioning + block-public + deny-all-except-CI + optional Object Lock (H4). H1 (short STS session) skipped — the ~15–20 min first CloudFront create exceeds a 15-min session.
- **Follow-up (separate NH ticket):** tighten the `ci-deploy` role's `s3:*` / CloudFront `Resource:"*"` to least-privilege actions (no longer PR-reachable; finicky → its own end-to-end-tested PR).
- **`L7-oidc`** stays `✅ done` (OIDC remains deploy-only); the 2026-06-23 entry's "(master ref + same-repo PRs)" trust + "PR → preview" workflow lines are **superseded** by this entry (status table reconciles on the next regen).

### 2026-06-24 — Schema-delta brainstorm: 4 deltas consolidated on the draft (PR #68)

The schema-impacting wireframe deltas were triaged (18 `schema-delta` tickets → **4** that change the catalogue DDL) and decided in one pass, applied to the **fresh draft schema** (`docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql` — no DB/Drizzle yet, so edits not a migration), re-validated on `nh_tonal_scratch`. Full decisions: `docs/wireframe/2026-06-24-schema-delta-decisions.md`; grounding spike: `docs/spikes/2026-06-24-instrument-identity-and-role-from-source-formats.md`.

**Decisions (✅ decided · 📄 prose-only — DRAFT DDL, no machine enforcement yet):**

- **SD-28 (NH-219)** — `track.role text` → **`track.roles text[]`** (a track plays N parts; overlap filter `roles && [...]`, GIN). Tri-state instrument/role tree; flat solo/lead siblings; a **display-group config** in shared monorepo code maps roles→labels ("Rhythm (chords)" / "Tabs", UltimateGuitar convention); role stays curated/UGC (no source format carries it), auto-derivable later.
- **SD-26 (NH-218)** — instrument **derived from the AlphaTab General-MIDI program (0–127)**, never UGC (admins pick a controlled vocab, never free-type); `track.instrument` stays `text`. **Instrument family = a code-only map** (`family→[instruments]`) over the existing `instruments[]` GIN — **no column** (don't overload the _musical_ `playable.family[]`). GM is 0-based in AlphaTab (vs the spec's 1-based).
- **SD-25 (NH-217)** — **`track.techniques text[]`** (GIN) for ALL instruments; `drum_profile.techniques` **moved onto `track`** and dropped. Auto-extract from AlphaTab note/beat effects (tap/slap/harmonics/bends/palmMute) + curate the abstract ones.
- **SD-15 (NH-213)** — **stay Thin**: no `note`/`voice_map` tables; voicing = `kit_pieces[]` + jsonb section grid + runtime AlphaTab (~35 ms). Flips only if note-level catalogue search is ever needed.
- **🆕 provenance** — `track.source_instrument_id` + `source_instrument_kind` (`gm-program`｜`musicxml-sound`｜`musescore-id`｜`name-parse`): the instrument derivation is reproducible + auditable (find low-confidence `name-parse` rows; names fail 3/5 real songs).

**Dispositions (no DDL):** SD-22 (NH-216) confirm-and-defer — the `notation` upload seam (`upload_status` + relaxed CHECK + `checksum`) already covers load-and-go; only dep = client-minted ULID (NH-183), findings on NH-216. SD-33 (NH-223) DB already done (`author[]` via SD-13) → wireframe phase. NH-230 origin field rides in PR #68. The remaining 12 `schema-delta` tickets route to DynamoDB-@M1 / UI / policy buckets.

**New tickets:** **NH-232** (`gp-extract.mjs` to read the GM program + percussion + note/beat technique effects) · **NH-233** (spike: confirm GM program suffices; PR AlphaTab + `patch-package` only on a real, non-reconstructable gap).

**Status:** all **✅ decided · 📄 prose-only** (draft DDL; flips to 🤖 when the real `core/catalog` + Neon adapter land, Phase 2 / NH-207). Approved by leocaseiro in the 2026-06-24 brainstorm. **Next:** wireframe alignment (`roles[]`/`techniques`/instrument-from-GM + `author[]`), then the first Drizzle migration.

### 2026-06-23 — Catalog wireframe + extensible tonal/drum schema realised (NH-194, PR #52)

The catalog **wireframe** (`docs/wireframe/`) — a single-file low-fi clickable SPA — pressure-tested the locked **Playable** model + the **extensible tonal/drum schema** before app build. Ships **no production/runtime code**: design docs + draft scratch DDL + seed data only. Working tracker: `docs/wireframe/2026-06-16-schema-deltas.md` (SD-1..37). Pending deltas filed as Jira **NH-208, NH-210..230** (all labelled `schema-delta`).

**Schema decisions realised / locked (✅ decided · 📄 prose-only — DRAFT DDL, no machine enforcement yet):**

- **Playable umbrella** — song/part/lesson/pattern are one `playable` (kind = the role); the score = `notation` (`s3_key` OR inline `notation_alphatex`, exactly-one); ordered steps via one self-ref `step` junction (`parent_id`/`child_id`/`sort_order`/`start_bpm`/`goal_bpm`), shared by lessons + composite patterns. Parts first-class. `lesson_type` dropped (a lesson's kind is derived from its step patterns).
- **Extensible tonal/drum schema (Hybrid C)** — per-domain side-tables `tonal_profile` + `drum_profile`, **per-track** (`track_id`, **SD-27**) → zero cross-domain NULLs; facet model (chords / progression / scales / drum). `musical_key` lives on `tonal_profile`.
- **`playable_link` relation vocabulary (SD-30)** — `uses` (hierarchical, directional: song→beat→rudiment), `variation` (symmetric: e.g. closed vs open hi-hat), `similar` (n-n affinity between any playables).
- **`listable` flag (SD-29)** — building-block playables (composite voice-leaves, song parts) are `listable:false`: reachable in-context + by deep-link, hidden from browse.
- **Group D** (track / media / difficulty) — `track` relation + per-section `data.sections[].tracks[]` grid; resolved 2026-06-20.

**Conventions established:**

- **USA "catalog" spelling** repo-wide (**NH-220**) — `catalogue`→`catalog` swept (prose, comments, examples, S3-key placeholders); spec/decision **filenames renamed** (`2026-06-10-catalogue-schema.md`→`…-catalog-schema.md`, `2026-06-09-catalogue-store-postgres-neon.md`→`…-catalog-store-…`). The future `core/catalog/` + `CatalogFilter` convention follows.
- **DB snake_case ↔ JS camelCase** — Postgres folds unquoted identifiers to lowercase, so columns stay snake_case (`notation_alphatex`); the ORM (Drizzle, `ARCH-ORM-1`) maps to camelCase (`notation_alphaTex`) at the boundary.
- **TanStack Table** = the catalog list + every table view (SD-10 / **NH-210**).

**Status:** all the above are **✅ decided · 📄 prose-only**; **no machine check** — they flip to 🤖 when the real `core/catalog` + Neon adapter are built (Phase 2, **NH-207**). The schema-delta ledger + NH-208/210..230 carry the open items.

**Overlap note:** this PR + the just-merged rename branch (`chore/nh-220-catalogue-to-catalog`, #67) both edit `AGENTS.md` / `README.md` / this registry; open **PR #64** (NH-206 AWS Phase-1 slice) also edits all three — **merge-order / conflict risk**; rebase #64 (or this) after the first lands.

### 2026-06-23 — NH-19 CodeQL deep SAST (out-of-band)

**Status changes (effective on merge):**

- `E-codeql` → **✅ done · 🤖**. New `.github/workflows/codeql.yml` runs CodeQL (`github/codeql-action/init`+`analyze@v3`, `javascript-typescript`, `build-mode: none`) **out-of-band** — `push: [master]` + a weekly `schedule` (+ `workflow_dispatch`), **never on `pull_request`** — so it stays off the PR critical path and is **not** part of the required `ci-green` gate. It layers on top of the always-on Semgrep `sast` job (`E-semgrep`); findings surface as code-scanning alerts in the Security tab.
- `E-codeql-guard-impl` → **✅ done · 🤖**. A `visibility-check` job runs `gh api repos/${{ github.repository }} --jq .visibility`, exports it as a job output, and the `analyze` job is gated `if: needs.visibility-check.outputs.visibility == 'public'` — so CodeQL and its SARIF upload auto-disable on a private transition (no GitHub Advanced Security bill), covering `schedule` events specifically (DACI L9 §215).

**Notes:** `workflow_dispatch` was added beyond the registry's "weekly schedule + push-to-main" text — with no `pull_request` trigger it's the only way to validate a run before the weekly cron. `AGENTS.md` is unchanged: it documents the local pre-commit hooks (gitleaks/semgrep), and CodeQL is CI-only/out-of-band, so it does not belong in that list.

### 2026-06-23 — CI/CD: GitHub-OIDC Pulumi deploy + self-managed S3 backend (NH-206)

**PR #64.** **Revises** the 2026-06-21 entry below: _"`pulumi up` … AWS creds + Pulumi passphrase are local-only, never CI"_ — `pulumi up` now **also runs in CI** (local deploys remain). Approved by leocaseiro 2026-06-23.

- **State backend:** the `dev` stack moved off `file://~` to a private, versioned **S3 bucket** (`s3://notation-hero-pulumi-state-apse2`, pinned in `infra/Pulumi.yaml`). No Pulumi Cloud, **no DynamoDB** — Pulumi locks via the bucket.
- **CI auth:** **GitHub → AWS OIDC** (`aws-actions/configure-aws-credentials@v4`) assumes a least-privileged `notation-hero-ci-deploy` role; trust scoped to `repo:leocaseiro/notation-hero` (master ref + same-repo PRs) — zero long-lived keys. Bootstrap runbook: `docs/runbooks/aws-ci-oidc-bootstrap.sh` (+ `aws-iam-ci-deploy.json`).
- **Secrets:** the passphrase secrets provider is fed to CI via the `PULUMI_CONFIG_PASSPHRASE` Actions secret (the committed `encryptionsalt` is unchanged). **No KMS** (no Pulumi-managed secrets yet).
- **Workflow:** `.github/workflows/deploy.yml` — PR → `pulumi preview` (plan commented on the PR); push to `master` → `pulumi up`. Mirrors `ci.yml` (setup-js, Node 24). Account id kept out of committed files (wildcard ARNs; role ARN in a GH variable, masked in logs).
- **`L7-oidc`** flips `💤 deferred-trigger → ✅ done` (OIDC now live in `deploy.yml`; reconciles into the status table on the next `docs(registry)` regen pass).

### 2026-06-21 — Phase 1 deployable AWS slice: About page end-to-end (NH-206)

**PR #64** (branch `worktree-nh-206-phase1-aws-slice`) implements ADR §11 **Phase 1** on top of #56 — the recruiter-clickable **About page** served end-to-end through AWS. Realizes two previously-📄 ADR decisions in code:

- `ARCH-EDGE-1` (one CloudFront, two origins) → **implemented** (`infra/cloudfront-site.stack.ts`). `/*` → a **private** S3 bucket (Block-Public-Access + BucketOwnerEnforced) reachable only via **OAC**, edge-cached; `/api/*` → the NestJS Lambda **Function URL** via OAC with the managed `AllViewerExceptHostHeader` policy and caching disabled. SPA deep links: 403/404 → `/index.html`.
- `ARCH-LAMBDA-1` (Function URL lockdown) → **implemented**. Function URL flipped **`NONE` → `AWS_IAM`**; CloudFront granted **both** `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`, pinned by `AWS:SourceArn` to the one distribution; wildcard CORS dropped. The raw `*.lambda-url` is no longer publicly invocable.

**Slice shape (leocaseiro, 2026-06-21): option (c)** — the **real** NestJS app runs on Lambda via `@codegenie/serverless-express` (a lambdalith), not a throwaway. `server/build:lambda` = SWC compile (emits decorator metadata — esbuild alone strips it and breaks Nest DI) → esbuild bundle to one CJS file. The About page is a real `client/` SPA route calling `GET /api/catalog` (the first real feature — placeholder data now, Neon-backed in Phase 2) to prove the Lambda leg live; the throwaway `/api/about` was rejected (leocaseiro: build toward the real API, not a stub endpoint).

**Free-tier posture:** plain pay-as-you-go CloudFront (the 1 TB / 10M perpetual tier) — deliberately **not** the Nov-2025 flat-rate "Free" plan (100 GB / 1M); `PriceClass_100`; arm64 Lambda, 10s timeout / 512 MB. Verified by 8 infra unit tests (Pulumi mocks) + `pulumi preview` (26-resource graph). **Deploy (`pulumi up`) + live-URL capture is the local capstone** (AWS creds + Pulumi passphrase are local-only — _revised 2026-06-23: `pulumi up` now also runs in CI via GitHub OIDC + an S3 state backend; see the top Change-log entry_). Deferred to their own tickets (foundation accommodates, zero refactor): Dexie caching, Cognito, Sentry, SRE, the CMS CRUD.

### 2026-06-21 — Foundation Phase 0 implemented + enforcement live (NH-199 / NH-195, PR #56)

The W2-deferred code/config from the 2026-06-18 entry is now executed in **PR #56** (clean-slate redo; **supersedes #50/#51/#59/#60**, which are closed). #56 delivers the **NH-195** Foundation Phase-0 scope under the **NH-199** clean-slate banner. Enforcement flips:

- `ARCH-MONO-1` (Nx → plain pnpm workspaces, `client/server/shared/infra`) → **✅ done · 🤖**. `nx.json`/`.nxignore`/`project.json`/`@nx/*` removed; lefthook/ci/knip/check-layout reconciled; `.gitignore` `.nx/` + `knip.json` `@nx/*` ignores dropped.
- `ARCH-HEX-1` (hexagon = folders under `server/src/`: `core`/`adapters`/`modules`) → **✅ done**. NestJS 11 scaffolded; health module skeleton.
- `ARCH-GUARD-1` (dependency-cruiser folder-level fence + core-purity as a REQUIRED CI check) → **✅ done · 🤖**. **Implemented as the ADR-mandated fail-CLOSED `core-purity` ALLOW-rule** (core/ may import only Node builtins + own-core + zod; everything else errors by default), **not** a deny-list. `tooling/check-core-purity-canary.sh` plants a deliberate `core/ → @nestjs/common` import and asserts the `core-purity` rule fires; wired as a required step in the `quality` job (`pnpm run check:core-purity`). Added `no-adapters-to-modules`. Verified by planting `react`/`drizzle`/`@aws-sdk`/`@pulumi`/`@nestjs` (all FIRE) + `node:`/own-core (PASS).
- `ARCH-NAME-1` (NestJS-native filenames) → **✅ done · 🤖**. `tooling/check-layout.sh` re-scoped from the old top-level `core/adapters/apps/infra` to `server/src/`; `approved_suffix` extended with `module|guard|pipe|interceptor|filter|middleware|strategy|resolver|schema|policy`; `main.ts`/`main.tsx` exempted.

**ce-code-review (mode:agent) caught three pre-merge gaps**, all fixed in #56: **CR-1** the fence was initially a deny-list that adversarially proved fail-open (core→react passed green) → switched to the allow-list above; **CR-2** AGENTS.md still Nx-era → narrowed; **CR-3** this registry entry (the governance rule the PR had skipped). CI false-green guard added to `ci-green` (the `changes` gatekeeper is now a hard dependency).

### 2026-06-21 — NH-16 checklist reworded to past-tense claims (v1.2)

Reworded `.github/pull_request_template.md` from "I am aware I must … (if …)" standing acknowledgements to **past-tense statements of what was done** ("I linked …"; conditional ones as "If this PR changed X, I did Y"). **Enforcement unchanged:** the `pr-checklist` gate still requires every box `[x]` + a real `(NH|KAN)-\d+` key — no `N/A`, no `required:`/`warn:` (both already dropped in v1.1). The conditional phrasing keeps every box always-tickable (vacuously true when its condition doesn't apply) while making a tick a **checkable claim**: ticking "If this PR changed a decision, I updated the decision log" when you did change one and skipped the log is now a false statement, not a true "awareness". No gate/test code change — `tooling/pr-checklist.mjs` reads items dynamically (presence + ticked); `tooling/pr-checklist.test.mjs` stays green.

**Still honesty-based** (presence + ticked, not truth). Verifying the work behind a tick is the deferred **NH-16 v2**: a project-local "checklist auditor" persona that checks each ticked claim against the diff, later promoted to a diff-aware gate. `AGENTS.md` "PR checklist (CI-gated)" updated to v1.2. Reword decided by leocaseiro 2026-06-21: "agents ignore `warn`; say it in the past."

### 2026-06-18 — Architecture ADR approved + foundation supersession ratified (NH-194)

Expert review of `2026-06-17-architecture-decisions.md` complete (6-engineer ce-doc-review panel, NH-194); **leocaseiro approved the ADR.** 20 review findings applied or resolved — incl. **SEC-4:** AlphaTab ships no WebAssembly (verified in `~/Sites/alphaTab`) → no `wasm-unsafe-eval`; **Next.js confirmed dropped** (not a portfolio need + SSR fights the AWS $0 free tier). The W2 deferral (DACI/ADR text rewrites) is now executed:

- **Foundation decisions superseded** (banners added to both legacy docs):
  - `L1` (Nx), `L2-tags` (`@nx/enforce-module-boundaries`), `L7-set-shas` (nx-set-shas), `FOLD-tagmap` (Nx tag map) → **⛔ superseded by `ARCH-MONO-1`** (Nx dropped → plain pnpm workspaces).
  - `FOLD-hex` + `FOLD-serverless` (hexagon/Lambdas as Nx libs/projects) → **⛔ superseded by `ARCH-HEX-1` + `ARCH-LAYOUT-1`** (hexagon = folders in one Nest app; `client/server/shared/infra`).
  - `NAME-suffix` (suffix-everything) → **⛔ superseded by `ARCH-NAME-1`** (NestJS-native filenames).
  - `STRUCT-sibling` (eslint-plugin-boundaries, package/tag form) → **⛔ superseded by `ARCH-GUARD-1`** (rewritten folder-level under `server/src/`).
- **Kept:** `PM-1`/`F6-bun` (pnpm), `D1`/dependency-cruiser (rewritten folder-level), test co-location (`CONV-1`/`CONV-2`).
- **Registry fixes (from the review):** decision count 20 → **21** (added `ARCH-SEC-2`); `L2-tags` removed from the `ARCH-GUARD-1` supersedes list (owned by `ARCH-MONO-1`); `ARCH-OFFLINE-1` corrected RxDB → **plain Dexie**.
- **New spike:** `docs/spikes/2026-06-17-spa-token-storage.md` (in-memory tokens + silent renew + CSP).

**Still deferred:** all code/config (Nx removal, depcruise rewrite, scaffolding) → the implementation PR.

### 2026-06-17 — Architecture decisions (backend·client·auth) + foundation reversal

Brainstorm-approved by leocaseiro (2026-06-17). Decides the 8 open architecture questions and **reopens the DACI-locked foundation** (pre-authorized). Spec: `docs/decisions/2026-06-17-architecture-decisions.md` + companion `docs/specs/2026-06-17-data-layer-requirements.md`. **Pending spec review in a separate session before the DACI/ADR text rewrites + implementation planning** — so the decisions below are ✅ decided but ⏳ enforcement-pending (no code/config changed yet).

**What landed (docs only):** the architecture decision record (21 `ARCH-*` decisions), the data-layer requirements doc (`R1`-`R12`; `R1 created_by` is the one net-new schema requirement), and this entry.

**Decisions (✅ decided · ⏳ enforcement pending-implementation):**

- `ARCH-MONO-1` Drop Nx → plain pnpm workspaces — **supersedes `L1`, `L2-tags`, `L7-set-shas`**.
- `ARCH-PM-1` Keep pnpm; bun stays dropped — **reaffirms `PM-1`, `F6-bun`**.
- `ARCH-LAYOUT-1` `client/ server/ shared/ infra/` — supersedes the Nx `apps/core/adapters/infra` layout.
- `ARCH-HEX-1` Hexagon = folders inside the one Nest app — **supersedes `FOLD-hex`**.
- `ARCH-GUARD-1` Keep dependency-cruiser (rules rewritten folder-level); drop `@nx/enforce-module-boundaries` — **supersedes `H8`-`H14` paths, `STRUCT-sibling`** (`L2-tags` dies with Nx — owned by `ARCH-MONO-1`, not double-listed).
- `ARCH-NAME-1` NestJS-native filenames — **supersedes `NAME-suffix`** (suffix-everything); co-location (`CONV-1`/`CONV-2`) kept.
- `ARCH-BUILD-1` pnpm runner + SWC compiler everywhere; bundler by target (esbuild server / Vite client).
- `ARCH-LAMBDA-1` one API Lambda (`@codegenie/serverless-express` v5 + Function URL + cached singleton); workers via `createApplicationContext`.
- `ARCH-FMT-1` server CJS / client ESM.
- `ARCH-EDGE-1` one CloudFront, two origins (S3 FE + Lambda API).
- `ARCH-CONTRACT-1` ~~oRPC~~ → **DEFER the framework** (NH-284, 2026-07-21): hand-authored Zod in `shared/` + `z.infer` + `.parse()`; no framework now. Flip-default `@nestjs/swagger`+`nestjs-zod` (**not** oRPC). Reject nestjs-trpc/drizzle-zod; Kanel → CMS. **Supersedes the June oRPC pick — see change log.**
- `ARCH-ORM-1` Drizzle — **reaffirms `DS-1`**; confirmed over Prisma/TypeORM/Kysely for Neon-HTTP + SWC.
- `ARCH-FE-1` Vite + TanStack Router + TanStack Query — **supersedes the 2026-06-16 Next.js FE ADR (`NH-185`)** (leocaseiro 2026-06-17: explicitly superseding yesterday's Next.js decision).
- `ARCH-OFFLINE-1` plain Dexie + insert-only outbox, sync via API (RxDB rejected — paywalled fast storage).
- `ARCH-MOBILE-1` plain Capacitor (no Ionic).
- `ARCH-AUTH-1` Cognito (Pulumi) + Google federation v1 — **reaffirms Cognito-not-Amplify (NH-193)**; pulls auth early for the admin gate (reverses the feature-freeze Basic-Auth plan).
- `ARCH-ROLE-1` roles via Cognito groups (admin) → `cognito:groups` JWT claim; one pool, admin-now/users-M1.
- `ARCH-AUTHZ-1` `can(user,item,action)` policy port in core (minimal v1).
- `ARCH-OWN-1` add `created_by` (Cognito sub) — net-new catalog requirement (`R1`).
- `ARCH-SEC-1` JWT security model (signature-verified; memory/session storage; short-lived + rotation; CSP).
- `ARCH-SEC-2` CSP baseline (CloudFront Response Headers Policy + native `<meta>` for the Capacitor build).

**Reopened (DACI) — pre-authorized; ADR text edits deferred to the review session:**

- `2026-06-09-tooling-stack-daci.md`: `L1` (Nx) dropped; layout changed; `PM-1`/`F6-bun` unchanged.
- `2026-06-12-file-level-structure-enforcement-adr.md`: `NAME-suffix` relaxed to framework-native; depcruise → folder-level; co-location kept.

**Status (updated 2026-06-18, W2):** the **DACI + file-structure ADR text rewrites are DONE** — both legacy docs now carry supersession banners (see the 2026-06-18 entry above). **Still deferred:** ALL code/config (Nx removal, depcruise rewrite, scaffolding) — land in the implementation PR. The headline §A rows (`L1`/`L2-tags`/`FOLD-hex`/`NAME-suffix`) are flipped to ⛔ below; full table reconciliation lands on the next regen. **The change-log entries remain authoritative.**

**Spikes (2026-06-17):** contract (oRPC vs ts-rest#797), ORM (Drizzle vs Prisma/TypeORM/Kysely), Google federation (Cognito + Google IdP in Pulumi), NestJS-on-Lambda/SWC, React-SPA stack.

**Manual approvals (leocaseiro):** all §1-§4 decisions approved section-by-section via AskUserQuestion this session; `W1` = write docs in a worktree; `W2` = review the spec in a separate session before the DACI/ADR rewrites.

### 2026-06-16 — NH-16 PR-checklist v1.1: all-required acknowledgements (no N/A)

Reframed the `pr-checklist` gate after a real-world miss: PR #40 merged with required boxes left unticked. Root cause (systematic-debugging) — the gate passed _correctly_ per the v1 design (docs PR; the UI item was legitimately `N/A`'d), but `N/A` is a **self-asserted, unverifiable escape** an agent can abuse (e.g. `N/A` the Storybook item on a PR that _does_ change UI). Fix per leocaseiro's model — "an agreement of terms & conditions: no checked, no merge":

- **Every checklist box must be ticked `[x]`; `N/A` and the `required:`/`warn:` severity split are removed.** Items are now standing acknowledgements ("I am aware I must … _if_ …") that stay true regardless of the PR, so they're always tickable. Items expanded to 12 (added: VR-tests-if-UI, README/docs + the "why", self-review, breaking-changes/migrations, no-secrets, no `--no-verify`). The Jira-key grep (`NH`/`KAN`, un-skippable) is unchanged — still the one check with real teeth.
- `tooling/pr-checklist.mjs` rewritten (anti-deletion + all-ticked + key grep, `N/A`/prefix logic deleted); `tooling/pr-checklist.test.mjs` rewritten (12 cases, TDD red→green, incl. "N/A no longer honored"). Branch protection set to **include administrators** so a red gate can't be clicked past. Spec updated: `docs/specs/2026-06-15-pr-merge-checklist.md`.

**Status:** `L6-checklist` stays **✅ done · 🤖** (mechanism evolved, status unchanged). DangerJS smart rules (green-fake, first-use, diff-aware UI/test detection) remain the NH-16 v2 backlog.

### 2026-06-16 — NH-185 FE framework: Next.js (one source → SSR web / static Capacitor)

Reverses the **FE-framework axis** of the 2026-06-02 stack-pick ("Vite + React; Next.js rejected"). Surfaced via `/ce-sessions`: that rejection was of **SSR** Next.js; **static-export + a one-source/two-targets build** was never evaluated, and it resolves the Capacitor conflict while delivering the job-hunt Next.js keyword + an SSR/hydration portfolio piece. ADR: [`2026-06-16-fe-framework-nextjs-adr.md`](2026-06-16-fe-framework-nextjs-adr.md); spike: [`../spikes/2026-06-16-fe-framework-nextjs.md`](../spikes/2026-06-16-fe-framework-nextjs.md).

**Decision:** Next.js (App Router), one source `apps/notation-hero`, two build targets — **SSR web** (OpenNext → Lambda + CloudFront, Pulumi, free-tier) + **static-export** (Capacitor iOS/Android). Catalog routes first. **No Amplify** (keeps Pulumi as the single IaC). **Capacitor + PWA + S3/CloudFront + Pulumi + hexagon all unchanged.**

**Status:** ⛔ **SUPERSEDED 2026-06-17** by `ARCH-FE-1` (Vite + TanStack SPA) — see the 2026-06-17 entry above; leocaseiro chose to supersede this Next.js decision ("superseding whatever we decided yesterday"). [Historical] was 📄 prose-only, tracked in **NH-185** (Story under Epic NH-177); the OpenNext SSR Lambda is **not** being built.

### 2026-06-15 — CMS via catalog reuse (front-end pivot) + Alpha build order

Ratified by leocaseiro 2026-06-15. The admin CMS **reuses the same catalog UI + the same lambdas**, with admin-gated write actions — **no separate admin SPA**. This **supersedes the UI half** of `docs/cms-approach.md` (the React-Admin SPA, Option 1 → effectively its Option 1a "hand-rolled UI"); that doc's AWS **backend** analysis still stands. Already the locked direction in the 2026-06-13 catalog design (`catalog-flow-decisions.md`: _"CMS = the same UI"_). Spec: `docs/specs/2026-06-15-cms-admin.md` (eng-reviewed, CLEARED). Tracked by **NH-122 [K-2]**; **NH-24 folded in + cancelled as duplicate**.

**Eng-review decisions (F1–F3):** F1 — gated admin-read mode on the K-3 read API (same lambda returns all statuses when the password is present); F2 — one public site + in-lambda password on writes (secret in SSM SecureString, never in the repo); F3 — include un-archive (delete = archive, schema §12).

**Build order (leocaseiro, 2026-06-15):** (1) **CRUD for catalog** — K-_bundle: NH-79 Neon adapter → NH-126 [K-1] store → NH-123 [K-3] read API → NH-122 [K-2] CRUD UI; (2) **play a song** (no MIDI, no score) — player core A-1/A-2 + B-1/B-2/B-7; (3) **SRE + Sentry + analytics** — H-7 (NH-52) + H-8 (NH-124) + H-6 (NH-54) / J-8 (NH-51); (4) **MIDI + score** — D-_ (NH-100..32) + C-\* (NH-97..29). Jira rank to be aligned to this order.

No status-table/enforcement changes (front-end approach + sequencing decision; no machine gate).

### 2026-06-15 — NH-16 agent PR merge checklist (v1) + KAN→NH migration

Shipped the first slice of NH-16 (the L6 PR-policy ticket, moved KAN-125 → NH-16). **v1 deliberately uses a custom CI step, NOT DangerJS** — a tick-the-box checklist wants a native task-list gate, not Danger's fail/warn comment (Danger smart rules deferred to the NH-16 v2 backlog). Spec: `docs/specs/2026-06-15-pr-merge-checklist.md`.

**What landed:**

- `tooling/pr-checklist.mjs` + a `pr-checklist` CI job (PR-event only, bot-exempt, non-path-filtered, wired into the required `ci-green` check). Two checks: (1) a real `NH-`/`KAN-` key in the PR title/body/branch — **un-skippable**, the teeth for "every PR is tracked"; (2) the **no-blank-boxes** rule — every `required:`/`warn:` item in the PR body must be `[x]` or `N/A`, so warnings can't be silently ignored.
- `.github/pull_request_template.md` carries the prefixed checklist; supports **both NH- and KAN-** keys.
- `lefthook.yml` pre-push `worktree-reminder` (non-blocking `git worktree list` — the overlap signal CI can't see).
- `CONTRIBUTING.md` updated for KAN→NH (both keys recognized; NH active).

**Clarification (leocaseiro):** "baby steps = many small COMMITS within a PR," NOT a PR-LOC cap. DACI L6's "PR > ~400 lines = fail" is the baby-COMMIT discipline; v1 PR-size is a soft `warn:` self-attest item, never a blocking fail. Mirrored as a clarification note in `2026-06-09-tooling-stack-daci.md`.

**Status changes (effective on merge):**

- NEW `L6-checklist` → **✅ done · 🤖**. PR-checklist gate (Jira-key presence + no-blank-boxes) runs in CI as a required check. Honesty-based for the checkboxes; the Jira-key grep is the one hard check.
- `L6` DangerJS green-fake / first-use / anti-gaming rules → **still ⏳ pending** (NH-16 v2 smart backlog; v1 is intentionally non-Danger).

**Migration:** Jira **KAN → NH** (company-managed). KAN-125 is now **NH-16**; both keys stay valid in branches/commits/PRs and in the checklist regex `(NH|KAN)-\d+`.

**Review hardening (ce-code-review, 2026-06-15):** a post-review pass closed four gate findings — delete-the-checklist bypass (template-anchoring: items are read from the PR template, missing one fails), N/A-in-label false-pass (N/A honored only in the author text after the label), quoted-sample false-fail (strip HTML comments + code fences), and the template's example key satisfying the key check (exclude checklist lines from the key search). Added `tooling/pr-checklist.test.mjs` (13 cases incl. the three regressions) + `pnpm run test:tooling`, run in the CI `quality` job. `pr-checklist` job documents the dep-free `setup-node` exception (AGENTS.md).

### 2026-06-14 — NH-150 first `pulumi up` (hello-world Lambda Function URL)

First real AWS deliverable + the first real Nx packages below the layer dirs (everything was empty stubs before). `apps/handler-hello` (runtime handler, esbuild → cjs/node22) + `infra/` (the `LambdaWithUrl` Pulumi ComponentResource + composition, packaging the handler's build output via `FileArchive`). The `pulumi up` deploy itself is a **human-gated** step run separately. Plan: `docs/plans/2026-06-13-001-feat-kan-119-pulumi-hello-world-plan.md`.

**Component placement (decision):** the `LambdaWithUrl` Pulumi component lives in **`infra/` (type:infra)**, NOT `adapters/aws` as the (stale, pre-ADR) `docs/cicd-pipeline.md` / NH-150 ticket text implied. Rationale: the live depcruise **H9** (`no-infra-to-app-or-domain-source`) forbids `infra → adapters` source imports, **H3** places IaC in `infra/`, and `check-layout.sh` has no `.component` suffix (`.stack` is approved). `adapters/aws` is therefore NOT created here — it lands later with its real runtime feature (the Neon repository).

**Status changes (effective on merge):**

- `FOLD-serverless` → **✅ done · 🟡**. The per-Lambda two-project split is realized: `apps/handler-hello` (type:app) + `infra/` (type:infra), siblings, handler never colocated with IaC. Backstopped by the live depcruise H8 (apps↛@pulumi) + H9 (infra↛apps/core/adapters source); the project-colocation itself stays convention (depcruise can't see intra-project imports).
- `H1` → **✅ done · 🟡**. Handler (`apps/handler-hello`) and IaC (`infra/`) are separate Nx projects; backed by H8/H9.
- `H2` → **✅ done · 🤖**. Handler imports no `@pulumi/*` — enforced live by depcruise H8 (`no-handler-to-pulumi`).
- `H3` → **✅ done · 🤖**. IaC lives in `infra/` (type:infra), imports `@pulumi/*`, never domain source — enforced live by depcruise H9 (`no-infra-to-app-or-domain-source`).
- `H4` → **✅ done · 📄**. `infra/index.ts` packages `FileArchive("../apps/handler-hello/dist")` (build output), never handler source. Prose-grade — the dist-path string is invisible to depcruise/Nx (no machine check).
- `M8-nxignore` → **✅ done · 🟡**. `.nxignore` added with `.pulumi/`; `.gitignore` already covered `.pulumi/` + `*.yaml.bak` + `dist/`. Pulumi stack config (`Pulumi.<stack>.yaml`) stays committed.
- `M5-nvmrc` / `L12-pin` → **Lambda-runtime-match axis CLOSED**. esbuild `--target=node22` matches the Lambda runtime `nodejs22.x` (the deferred half of M5/L12-pin). `.nvmrc` stays Node 24 for the build host (Node 24 is not a Lambda runtime).

**Enforcement-config changes (this PR):**

- `.dependency-cruiser.cjs`: added `exclude: (^|/)dist/` (never cruise esbuild/tsc build output) + two `no-orphans` entry-point exemptions (`infra/index.ts` Pulumi composition root; `apps/handler-hello/src/index.ts` Lambda handler entry) — the rule's own comment sanctions adding these "when app/infra composition roots arrive."
- `knip.json`: `ignoreBinaries: ["pulumi"]` (system CLI, not an npm dep). Knip stays advisory (no CI gate).

**Not done (deferred):** `M2-typecov` / `L4-typecov` (no type-coverage gate yet), `M6-sizelimit` (no per-Lambda size budget yet), `E-pnpm-catalog` (the repo still uses direct version pins everywhere — a catalog migration is its own task; these new deps follow the existing direct-pin style). The actual `pulumi up` + CloudWatch verification is the gated NH-150 completion step. The A–G status tables below still show the pre-NH-150 rows (⏳/🟥) for FOLD-serverless/H1–H4 — they are auto-derived and reconcile on the next `docs(registry)` regen pass; this Change-log entry is authoritative.

### 2026-06-12 — File-level structure enforcement (ADR D1–D7 / PR #25 rework)

Ratified by leocaseiro 2026-06-12. ADR: `docs/decisions/2026-06-12-file-level-structure-enforcement-adr.md` (evidence: the same-dated spike + cross-ecosystem research). Reworks PR #25 from Option A (Pascal/camel + folder-per-entity) to **Option B (kebab-case + role suffix)**. Every rule fixture-verified, not vacuously green.

**Status changes (effective on merge):**

- `L2-tags` → **✅ done · 🟡 (wired, NOT yet CI-enforced — see ⚠️ below)**. `@nx/enforce-module-boundaries` tag rule wired in `.eslintrc.cjs` (PR #25, commit `96ddf1c`); it runs only under ESLint, which has no live CI lint target yet.
- `DEPCR-files` → **✅ done · 🤖**. depcruise file-level bans live: H8 (handler↛@pulumi), H10 (core↛@aws-sdk), H11 (adapters↛apps/infra), **H9 widened** to `^(apps|core|adapters)/` (D3), plus **new `no-core-to-pulumi`** (D5). Top-level paths (`core/`/`adapters/`), not the registry's old `libs/`. Commit `84a2a87`. **Review update:** H8 broadened from `^apps/[^/]+/src` to `^apps/` so flat/lib handlers are covered (#6); **new `no-apps-to-infra`** (`^apps/` ↛ `^infra/`) added (#7). depcruise runs as a direct CI command, so these stay genuinely 🤖.
- `H7`/`H8`/`H9`/`H10`/`H11` → **✅ done · 🤖**. The DACI "keep BOTH depcruise + Nx" is now **empirically confirmed** by the spike — depcruise uniquely does cycles + orphans + graph viz under the legacy eslintrc (ESLint's `no-cycle`/`no-unused-modules` did not fire).
- `CONV-1`/`CONV-2` → **📄→🤖**. `tooling/check-layout.sh` now machine-enforces no-`__tests__`/`__mocks__`/`stories` dirs (Rule 1) + co-located test sibling (Rule 3). **Folder-per-entity DROPPED** (D2) — the role suffix carries the role. Commit `827bee9`.
- NEW `NAME-suffix` → **🟡 partial**. kebab-case filenames + role suffix on every domain/app file. **suffix-PRESENCE** (`check-layout.sh`, ADR F-1, commit `827bee9`) is **CI-live 🤖**; **kebab-CASING** (`check-file` `KEBAB_CASE`, commit `84d5c53`) + the junk-drawer `*.manager`/`*.helper` blocklist run under ESLint and are **NOT yet CI-enforced 🟡** (see ⚠️ below). Pascal-vs-camel DangerJS task dropped (NH-16 comment).
- NEW `STRUCT-sibling` → **🟡 partial · 🟡 (editor-only; NOT yet CI-enforced — see ⚠️ below)**. `eslint-plugin-boundaries` v6 adopted for FILE-level layer direction with editor-realtime feedback (commit `96af4bb`); **sibling/internal isolation DEFERRED** (the v6-clean mechanism `entry-point` mandates per-feature barrels ADR §6.3 forbids; `no-private` is v6-deprecated; no intra-layer structure yet to verify against). Revisit at first-use.
- NEW `STRICT-tiers` → **📄 prose-only**. Enforcement-tier ladder adopted (lint → test → compile); next lever is the tier-a compile wall via TS project references (elevates `L2-projref`, D7).
- `L2-projref` → elevated to the next strictness lever (tier-a compile wall, D7); status unchanged (⏳ — not yet implemented).

> **⚠️ CI-enforcement reality (PR #25 review #1):** Only **depcruise** (H8–H11, `no-core-to-pulumi`, `no-apps-to-infra`) and **`tooling/check-layout.sh`** (Rules 1–3) actually execute in CI today — they run as direct commands in the `quality` job, so they are genuinely 🤖. The **ESLint-delivered** rules — `@nx/enforce-module-boundaries` (`L2-tags`), `check-file` kebab-casing + blocklist (the casing half of `NAME-suffix`), `eslint-plugin-boundaries` (`STRUCT-sibling`) — are **wired but NOT yet CI-enforced** (🟡): `pnpm run lint` = `nx run-many --target=lint` and no project has a real lint target yet (placeholder `echo` scripts; ESLint 9 defaults to flat config with no `eslint.config.*` and `ESLINT_USE_FLAT_CONFIG` unset, so the legacy `.eslintrc.cjs` wouldn't load even if a target ran). They flip to 🤖 when per-package lint scripts (the AGENTS.md `ESLINT_USE_FLAT_CONFIG=false eslint` template) + tagged Nx projects + the flat-config migration (NH-42) land. Until then, `check-layout.sh` carries suffix-PRESENCE and depcruise carries layer-direction as the live CI backstop.

### 2026-06-12 — NH-83 CI architecture + NH-167 .nvmrc (Theme 2 part 1)

**Status changes (effective on merge):**

- `L7-set-shas` → **✅ done · 🤖**. `nrwl/nx-set-shas@v4` added to the `quality` and `build` jobs in `ci.yml` (NH-170). Sets `NX_BASE`/`NX_HEAD` so `nx affected` works correctly across `pull_request`, `push:master`, AND `merge_group` events. `fetch-depth: 0` on the checkout gives the action the history it needs. Pinned to `@v4`. `main-branch-name: master` overrides the action's `main` default.
- `L7-reusable-wf` → **✅ done · 🤖**. Local composite action at `.github/actions/setup-js/action.yml` (pnpm/action-setup + setup-node@v6 with `node-version-file: .nvmrc` + cache pnpm + frozen-lockfile install). Replaces the repeated 4-step prelude in the `quality`, `build`, and `pr-title` jobs (NH-171). Adding a new JS-toolchain gate is now one `- uses: ./.github/actions/setup-js` line. Net diff: +27 composite / −18 workflow.
- `L7-merge-queue` → **✅ wired · 🤖** (CI ready + version-controlled Ruleset; admin runs `tooling/branch-ruleset.sh --apply` once). `merge_group:` event added to `ci.yml` triggers (NH-172); `pr-title` is correctly gated to `pull_request` only and skips on merge_group. **The merge queue is a Rulesets-only feature** — classic Branch Protection (managed by `tooling/branch-protection.sh`) does NOT support it. New `tooling/branch-ruleset.json` + `tooling/branch-ruleset.sh` manage the `master-merge-queue` Ruleset (squash, ALLGREEN strategy, 5-concurrent build, 1-5 group size, 60-min check timeout). Two layers coexist cleanly: classic protection = what's required (CI Green, linear history), Ruleset = how merges happen (the queue itself).
- `L7-plan-tier` → **✅ verified**. Repo is `public`, GitHub Free supports `merge_group`. `gh api repos/leocaseiro/notation-hero --jq '.visibility'` = `public` (logged in PR #22 description).
- `M3-mergegroup` → **✅ done · 🤖**. Tied to `L7-merge-queue` above (workflow side wired; queue-enable is admin step).
- `M5-nvmrc` → **🟡 partial · 🤖**. `.nvmrc` added at repo root with `24`; the composite action's `node-version-file: .nvmrc` now drives CI Node too — single source of truth for local AND CI. pnpm pin via `packageManager: pnpm@11.5.2` was already set (PR #2). Stays partial (not done) because the `M5` intent also includes Lambda-runtime match (esbuild target = Lambda Node version) — a Lambda-domain check that lands when first apps deploy.
- `L12-pin` → **🟡 partial** (was `⏳ pending`). `.nvmrc 24` lands here for the dev/CI parity axis; the Lambda-runtime match (esbuild target = Lambda Node version) still pending first Lambda deploy.
- `NH-98` (nx release / M7-release) **deferred to standalone brainstorm session** — initial dry-run on the skeleton repo surfaced unresolved questions (release-group glob for a single-stub-project workspace, first-release flag flow, CHANGELOG location vs gallant-bardeen's NH-79 future adapter). See NH-98 Jira comment 2026-06-12 for the 7 open Qs. No registry status change (M7-release stays 🔒 locked-active · 📄 prose-only).
- `NH-96` (AGENTS.md generated-from-config + drift-check / L8-1 / L8-2) **deferred to its own PR** — design call between a full generator (200+ LOC) and a minimal drift-check (30 LOC) is large enough to want its own review surface.

### 2026-06-12 — NH-91 no-escape-hatches ESLint + NH-93 commitlint

**Status changes (effective on merge):**

- `F3-noescape` / `L5-no-escape-hatches` → **✅ done · 🤖**. Three layers now enforce no-escape-hatches: (1) `@typescript-eslint/ban-ts-comment` bans `@ts-ignore`/`@ts-nocheck` (PR #9), (2) `@eslint-community/eslint-plugin-eslint-comments`'s `require-description` (active) requires a reason for every `eslint-disable`; ESLint's native `reportUnusedDisableDirectives: true` catches unused disables (replaces the deprecated `no-unused-disable` plugin rule), (3) `tooling/check-no-coverage-ignore.sh` bans both `// istanbul/c8/v8 ignore` (line) AND `/* istanbul/c8/v8 ignore */` (block) directives via `git grep` over the index (CI `quality` job; CI is authoritative — no pre-commit duplicate per gitleaks/semgrep pattern). Hardened in this PR (post code-review) against the xargs whitespace-bypass and single-line-comment-form gaps.
- `L6-4` → **✅ done · 🤖** at TWO levels: (a) `@commitlint/cli` + `@commitlint/config-conventional` validate every local commit message via Lefthook `commit-msg` hook; (b) a CI `pr-title` job pipes the PR title through the same `commitlint.config.cjs` (single source of truth) so multi-commit PRs that squash-merge can't bypass the gate via the PR title (repo `squash_merge_commit_title = COMMIT_OR_PR_TITLE`; for 1-commit PRs the local hook is sufficient). Required by `nx release` (NH-98) needing conventional-commit subjects in master history. `body-max-line-length` relaxed to warn at 200 (not error) for long body lines.
- `commitlint.config.*` added to the CI `code` path-filter so a config-only PR can't false-green; `pr-title` job added to the required `ci-green` gate's `needs:` list.
- New `pnpm run check:layout` + `pnpm run check:coverage-ignore` scripts expose the shell guards as agent-runnable entry-points (parity with `pnpm run depcheck`/`knip`/`syncpack`).
- AGENTS.md "Setup in a fresh worktree / clone" section added — documents the `pnpm install --ignore-scripts` + `pnpm exec lefthook install` recovery path for the per-worktree `core.hooksPath` quirk we hit during this session, plus a verification step.

### 2026-06-12 — fix(registry): resolve committed conflict markers from PR #19 merge

**Status changes (effective on merge):**

- `E-no-orphans-error` conflict markers resolved: → **✅ done · 🤖** (per NH-89/136 change-log).
- `E-osv-scanner` conflict markers resolved: → **🔒 locked-active · 🤖** (per NH-154 change-log).

### 2026-06-12 — NH-89 dependency hygiene (Knip + Syncpack + no-orphans error)

**Status changes (effective on merge):**

- `E-syncpack` → **✅ done · 🤖**. `.syncpackrc.json` + `syncpack` script + a `Dependency versions (Syncpack)` step in the CI `quality` job enforce consistent dependency versions across the workspace (NH-143).
- `E-no-orphans-error` / `CONV-5` → **✅ done · 🤖**. `.dependency-cruiser.cjs` no-orphans flipped WARN→ERROR, with `*.test.*`/`*.spec.*`/`*.stories.*` exempt as entry points; enforced via the existing `depcheck` gate (NH-144). Safe now (0 modules cruised).
- `E-knip` → **🔒 locked-active** (advisory). `knip.json` + `knip` script landed for dead-code/unused-dep detection (NH-142); **advisory, no CI gate** until apps land (per the decision), then flips to error. `ignoreDependencies` covers `@nx/eslint`+`@nx/js` (Nx plugins knip can't trace on a stub repo). Knip's default test/story-as-entry behavior covers `CONV-6` — verify when tests land.
- `knip.json` + `.syncpackrc.json` added to the CI `code` path-filter so a config-only PR can't false-green.

### 2026-06-11 — NH-154 osv-scanner + NH-155/132 security settings

**Status changes (effective on merge):**

- `E-osv-scanner` → **🤖 machine-enforced**. New `deps-cve` CI job runs osv-scanner (pinned `google/osv-scanner-action/osv-scanner-action@v2.3.8`, `--recursive ./`) recursively over the repo tree (picks up the pnpm lockfile), wired into the required **"CI Green"** gate; fails the build on any known dependency CVE. Closes the 🟥 SCA gap.
- `E-gh-secret-scan` → **✅ done · 🤖**. GitHub-native secret scanning **and** push protection enabled on the repo (NH-156, via `gh api`). Layers on top of gitleaks (`E-gitleaks`) while public; auto-off if the repo goes private (needs GHAS).
- `E-dependabot` — Dependabot **alerts** now enabled (NH-155, via `gh api PUT /vulnerability-alerts`). Version-update PRs remain Renovate's job (`E-renovate`); Dependabot security-updates left off to avoid duplicate PRs.

### 2026-06-11 — NH-153 Semgrep SAST

**Status changes (effective on merge):**

- `E-semgrep` → **✅ done · 🤖 machine-enforced**. Semgrep now runs (1) in CI as the `sast` job wired into the required **"CI Green"** gate (`semgrep scan --config auto --error`, free community rulesets, no token; path-filtered on `code`), and (2) locally as a best-effort Lefthook pre-commit hook (`tooling/semgrep-precommit.sh`, scans staged source, graceful skip if semgrep isn't installed). Closes the 🟥 SAST gap. CodeQL deep SAST (`E-codeql`, NH-19) layers on out-of-band.

### 2026-06-11 — NH-152 gitleaks secret scanning

**Status changes (effective on merge):**

- `E-gitleaks` → **✅ done · 🤖 machine-enforced**. gitleaks now runs (1) in CI as the always-on `secret-scan` job wired into the required **"CI Green"** gate (`gitleaks/gitleaks-action@v2`, full-history scan, free on this personal/public repo), and (2) locally as a Lefthook pre-commit hook (`tooling/gitleaks-precommit.sh`, best-effort — graceful skip if gitleaks isn't installed; verified against gitleaks 8.30). Closes the 🟥 secret-scan gap. GitHub-native secret scanning (`E-gh-secret-scan`, NH-156) layers on top while public.

### 2026-06-11 — NH-147 repo-meta (README + CODEOWNERS + Dependabot)

**Status changes (effective on merge):**

- `L6-5` (CODEOWNERS-by-layer + enforcement-file coverage) → CODEOWNERS added at `.github/CODEOWNERS` (single-owner `@leocaseiro`; explicitly lists `.github/workflows/`, `.eslintrc.cjs`, `.dependency-cruiser.cjs`, `lefthook.yml`, `nx.json`, `tsconfig*.json`, `tooling/`, `AGENTS.md`, `docs/decisions/`). Stays **📄 prose-grade** — solo-repo branch protection cannot require CODEOWNERS review (Footgun #2: GitHub forbids self-approval), so this documents ownership, it does not gate merges.
- `E-dependabot` → `.github/dependabot.yml` added, scoped to **github-actions** (weekly) only. npm/pnpm version-update PRs remain owned by **Renovate** (`E-renovate`, lands with NH-89) to avoid duplicate update PRs; Dependabot security _alerts_ stay a repo setting. ⚠️ NH-147's text said "Dependabot pnpm-workspace aware" — **narrowed to actions-only** for registry consistency (E-renovate owns npm); revisit only if Renovate is dropped.
- `README.md` added (root) — no enforcement change.

### 2026-06-11 — PR #9 (guardrails + Jira migration)

**Status changes (effective on merge):**

- `__tests__/` · `__mocks__/` · `stories/` dir ban → **🤖 machine-enforced** by `tooling/check-layout.sh` (CI quality job) — closes the dir-ban lint gap for `CONV-1` / `CONV-coloc` / `L5-test-colocation`; full co-located placement stays a convention.
- `@ts-ignore` · `@ts-nocheck` → **🟡 partial** via ESLint `ban-ts-comment` (`L5-no-escape-hatches` / `F3-noescape`); `eslint-disable`-reason rules land in PR #2.
- `L10a` / `L10b` (Linear MCP + GitHub App) → **⛔ superseded → Jira (KAN, now NH)**; see `2026-06-11-tracker-linear-to-jira.md`.
- **Lefthook git hooks** (`L8-3` / `L6`) → **✅ done**: pre-commit runs the layout guard + `nx affected` lint/typecheck; pre-push adds test — local enforcement _before_ CI. (gitleaks + commitlint deferred to follow-up PRs.)

**Manual approvals (leocaseiro):**

- Issue tracker → migrated **Linear → Jira (KAN → NH)**.
- L3 formatter → **keep ESLint + Prettier** (Nx boundary rule IS `@nx/eslint`; agent-idiomatic).
- L5 test runner → **adopt Vitest at L5** (node:test runs today).
- L5 Stryker mutation testing → **keep**. · L5 coverage ratchet → **keep**.
- L4 `isolatedDeclarations` + type-coverage → **keep the rigor** (stress-tested 3× in prior sessions).
- L9 Renovate → **keep** (vs Dependabot; grouped PRs). · L7 merge-queue → **keep**.
- 9 remaining discretionary decisions (security scanners, AGENTS-from-config, dep-cruiser+Nx, DangerJS, Knip/Syncpack, Sentry, Lefthook) → **bulk-ratified as-is**.

## A · Foundation & folders (pnpm, Nx, boundaries, lint, types)

| ID              | Decision                                                                                                                                                                                                                                                                                                                                                                                                                          | Status           | Enf | Source   | Gap |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --- | -------- | --- |
| PM-1            | Package manager = pnpm (only). Bun fully dropped; pnpm catalog centralizes versions; strict symlinked node_modules blocks phantom deps.                                                                                                                                                                                                                                                                                           | ✅ done          | 🤖  | DACI:123 |     |
| L1              | ⛔ **superseded by `ARCH-MONO-1` (2026-06-18, NH-194)** — Nx dropped → plain pnpm workspaces. _(was: L1 orchestrator = Nx — affected + computation cache + generators + enforce-module-boundaries; local cache + Nx Cloud free tier.)_                                                                                                                                                                                            | ⛔ superseded    | —   | DACI:124 |     |
| L2-pnpm         | Boundary axis (a): pnpm strict symlinked node_modules refuses to resolve packages not in dependencies (build-time block on illegal imports).                                                                                                                                                                                                                                                                                      | ✅ done          | 🤖  | DACI:125 |     |
| L2-tags         | ⛔ **superseded by `ARCH-MONO-1` (2026-06-18)** — dies with Nx; folder-level dependency-cruiser (`ARCH-GUARD-1`) carries layer direction instead. _(was: Nx enforce-module-boundaries ESLint tag rule.)_                                                                                                                                                                                                                          | ⛔ superseded    | —   | DACI:125 |     |
| L2-projref      | Boundaries also use real workspace packages + TS project references; rejects tsconfig.paths as the boundary mechanism (2026 anti-pattern). ADR D7: elevated to the next strictness lever — the tier-a compile wall.                                                                                                                                                                                                               | ⏳ pending       | 🟡  | DACI:125 |     |
| L2-depcruise    | dependency-cruiser kept for cycle-detection + graph viz alongside Nx tags (hexagonal DIRECTION rules as ERROR; no-circular).                                                                                                                                                                                                                                                                                                      | ✅ done          | 🤖  | DACI:125 |     |
| L2-probes       | Committed self-testing probe suite under tooling/probes/ — one Vitest spec per boundary/dep-cruise rule asserting intentional violations FAIL in CI (guards against a rule being loosened).                                                                                                                                                                                                                                       | ⏳ pending       | 📄  | DACI:125 | 🟥  |
| L3-eslint       | L3 lint = ESLint flat config as growable rule engine (Nx boundaries + @typescript-eslint type-aware + custom architectural rules). Biome-as-primary / Oxlint rejected. **NH-243:** shipped as shared base (`eslint.config.base.mjs`) + per-package extends; CI-enforced via the dedicated `lint` job.                                                                                                                             | 🔒 locked-active | 🤖  | DACI:126 |     |
| L3-prettier     | L3 format = Prettier @ printWidth 100, consolidated to one root `prettier.config.mjs`, separated from ESLint (no `eslint-plugin-prettier`). ~~[Leo note: We should use Biome, unless there are issues with Nx or something]~~ **Resolved 2026-06-26 (NH-243):** Biome evaluated and rejected — migration cost, two-tool surface area, and NestJS DI decorator hazard (see spec §2); Nx is gone (pnpm workspaces). Prettier stays. | 🔒 locked-active | 🤖  | DACI:126 |     |
| L4-strict       | L4 types = strict + composite + project references + isolatedDeclarations (adopt now while empty). strict-only and deferring isolatedDeclarations both rejected.                                                                                                                                                                                                                                                                  | 🔒 locked-active | 🤖  | DACI:127 |     |
| L4-typecov      | type-coverage floor (start ~95%, ratchet up; infra type:infra uses ~90% per M-2 due to Pulumi Output).                                                                                                                                                                                                                                                                                                                            | ⏳ pending       | 📄  | DACI:127 | 🟥  |
| L4-dts          | build:dts Nx target per library running tsc -b --emitDeclarationOnly (Vite/esbuild handles JS); tsconfig.build excludes co-located test/spec/stories/e2e/fake files; cache dist/types as Nx output.                                                                                                                                                                                                                               | ⏳ pending       | 📄  | DACI:151 | 🟥  |
| FOLD-hex        | ⛔ **superseded by `ARCH-HEX-1` + `ARCH-LAYOUT-1` (2026-06-18)** — hexagon = folders inside one Nest app (`server/src/`); layout `client/server/shared/infra`. _(was: hexagon as real Nx libs/apps with type: tags.)_                                                                                                                                                                                                             | ⛔ superseded    | —   | DACI:128 |     |
| FOLD-tagmap     | Tag map: core/->type:core, adapters/->type:adapter, apps/->type:app, infra/->type:infra. Tags drive the boundary ESLint rules.                                                                                                                                                                                                                                                                                                    | ✅ done          | 🟡  | DACI:128 |     |
| FOLD-serverless | Serverless split per-Lambda into TWO Nx projects: apps/ (type:app, handler) + infra/ (type:infra, IaC), siblings; never colocate handler.ts + infra.ts. Colocation patterns rejected.                                                                                                                                                                                                                                             | ⏳ pending       | 📄  | DACI:128 | 🟥  |
| DEPCR-files     | dependency-cruiser file-level bans (top-level paths): handler↛@pulumi/_(H8), infra↛apps/core/adapters source (H9 widened, ADR D3), core↛@aws-sdk/_ + core↛@pulumi/\* (H10 + D5), adapters↛apps/infra source (H11).                                                                                                                                                                                                                | ✅ done          | 🤖  | DACI:266 |     |
| CONV-coloc      | Domain/feature-organized folders, one folder per unit; group by domain not file-type (no top-level **tests**/ or stories/ trees); tests + stories co-located with source.                                                                                                                                                                                                                                                         | ⏳ pending       | 📄  | DACI:226 | 🟥  |
| CONV-orphans    | Configure no-orphans=error + Knip to treat _.test._ / _.stories._ as entry points/exclusions, and exclude them from coverage targets, so co-located tests/stories don't read as orphans.                                                                                                                                                                                                                                          | ⏳ pending       | 📄  | DACI:237 | 🟥  |
| STRUCT-sibling  | eslint-plugin-boundaries (v6) for FILE-level layer direction with editor-realtime feedback (core→core; adapters→core,adapters; apps→…; infra→nothing in-repo). Sibling/internal isolation DEFERRED — entry-point mandates barrels §6.3 forbids; no intra-layer structure yet.                                                                                                                                                     | 🔒 locked-active | 🟡  | ADR:D4   | 🟥  |
| STRICT-tiers    | Enforcement-tier ladder adopted: lint (Nx tags + depcruise + boundaries) → test → compile. Climb to tier-a (compile wall) via TS project references (elevates L2-projref).                                                                                                                                                                                                                                                        | 🔒 locked-active | 📄  | ADR:D7   | 🟥  |

## B · Test integrity & quality (L5)

| ID                           | Decision                                                                                                                                                                                  | Status              | Enf | Source   | Gap |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --- | -------- | --- |
| L5-vitest                    | Vitest (via @nx/vite) is the L5 test runner. DECIDED but DEFERRED — node --test on .ts (type-stripping) runs today; Vitest lands Step 4.                                                  | 💤 deferred-trigger | 📄  | DACI:134 |     |
| L5-coverage-ratchet          | Coverage ratchet: CI fails if coverage drops below the committed floor (read-only check) — blocks test deletion. Floors start low (~60%), ratchet up.                                     | ⏳ pending          | 📄  | DACI:134 | 🟥  |
| L5-stryker                   | Stryker mutation testing scoped to core/, --incremental, score floor (~50%) → blocks assertion-free hollow tests (the 93% cov / 58% mutation case).                                       | ⏳ pending          | 📄  | DACI:134 | 🟥  |
| L5-vacuous-green             | Fix the vacuous-green scaffold — close the live false-green where the scaffolded test passes without asserting anything.                                                                  | ⏳ pending          | 📄  | DACI:134 | 🟥  |
| L5-no-empty-scripts          | No-empty-scripts / empty-filter guard — block green-faking via empty or no-op test scripts / empty package filters.                                                                       | ⏳ pending          | 📄  | DACI:134 | 🟥  |
| L5-stryker-port-exclude      | Stryker mutate glob EXCLUDES interface/port files (no behavior to mutate); target only behavior-bearing files (entities, value objects, validators).                                      | ⏳ pending          | 📄  | DACI:361 | 🟥  |
| L5-test-colocation           | Tests co-located with source (NO **tests**/ tree); port fakes co-locate as _.fake.ts or a small test-utils pkg; _.test._ /_.stories.\* / fakes never ship (build+bundle exclude).         | ⏳ pending          | 📄  | DACI:361 | 🟥  |
| L5-floors-json               | Floors live in committed tooling/floors.json (one floor per metric x per Nx project); PRs fail on drop (read-only); update-floors job (contents:write, push:master only) bumps + commits. | ⏳ pending          | 📄  | DACI:362 | 🟥  |
| L5-no-escape-hatches         | No-escape-hatches ESLint rule set: ban/limit eslint-disable (require reason), @ts-ignore/@ts-nocheck, and /_istanbul ignore_/ — stops agents disabling past a gate.                       | ✅ done             | 🤖  | DACI:362 |     |
| L5-floor-guard               | DangerJS rule fails any PR that modifies BOTH tooling/floors.json AND test files in the same diff — closes the 'delete tests + lower floor together' attack.                              | ⏳ pending          | 📄  | DACI:362 | 🟥  |
| L5-stryker-incremental-cache | Stryker --incremental cache: declare .stryker-tmp/incremental.json as an Nx output for the mutate target AND exclude it from inputs (two caches must not invalidate each other).          | ⏳ pending          | —   | DACI:175 |     |
| L5-stryker-scope-expand      | Decide Stryker scope expansion (core/ → adapters/) once adapters have real logic.                                                                                                         | ⏳ pending          | —   | DACI:316 |     |
| L5-coverage-excludes         | Align Vitest coverage excludes for _.test._ / _.stories._ (don't measure coverage OF tests/stories); keep Storybook on default \*.stories.tsx glob.                                       | ⏳ pending          | 📄  | DACI:317 |     |
| ID                           | Decision                                                                                                                                                                                  | Status              | Enf | Source   | Gap |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------          | --- | -------- | --- |
| L5-vitest                    | Vitest is the L5 test runner — live for client/ + server/ + infra/; tooling/ stays node --test (deliberate exception, NH-38). ~~via @nx/vite~~ Nx dropped (ADR 2026-06-17).               | ✅ done             | 🤖  | DACI:134 |     |
| L5-coverage-ratchet          | Coverage ratchet: CI fails if coverage drops below the committed floor (read-only check) — blocks test deletion. Floors start low (~60%), ratchet up.                                     | ⏳ pending          | 📄  | DACI:134 | 🟥  |
| L5-stryker                   | Stryker mutation testing scoped to core/, --incremental, score floor (~50%) → blocks assertion-free hollow tests (the 93% cov / 58% mutation case).                                       | ⏳ pending          | 📄  | DACI:134 | 🟥  |
| L5-vacuous-green             | Fix the vacuous-green scaffold — close the live false-green where the scaffolded test passes without asserting anything.                                                                  | ⏳ pending          | 📄  | DACI:134 | 🟥  |
| L5-no-empty-scripts          | No-empty-scripts / empty-filter guard — block green-faking via empty or no-op test scripts / empty package filters.                                                                       | ⏳ pending          | 📄  | DACI:134 | 🟥  |
| L5-stryker-port-exclude      | Stryker mutate glob EXCLUDES interface/port files (no behavior to mutate); target only behavior-bearing files (entities, value objects, validators).                                      | ⏳ pending          | 📄  | DACI:361 | 🟥  |
| L5-test-colocation           | Tests co-located with source (NO **tests**/ tree); port fakes co-locate as `*.fake.ts` or a small test-utils pkg; `*.test.*` / `*.stories.*` / fakes never ship (build+bundle exclude).   | ⏳ pending          | 📄  | DACI:361 | 🟥  |
| L5-floors-json               | Floors live in committed tooling/floors.json (one floor per metric x per Nx project); PRs fail on drop (read-only); update-floors job (contents:write, push:master only) bumps + commits. | ⏳ pending          | 📄  | DACI:362 | 🟥  |
| L5-no-escape-hatches         | No-escape-hatches ESLint rule set: ban/limit eslint-disable (require reason), @ts-ignore/@ts-nocheck, and `/* istanbul ignore */` — stops agents disabling past a gate.                   | ✅ done             | 🤖  | DACI:362 |     |
| L5-floor-guard               | DangerJS rule fails any PR that modifies BOTH tooling/floors.json AND test files in the same diff — closes the 'delete tests + lower floor together' attack.                              | ⏳ pending          | 📄  | DACI:362 | 🟥  |
| L5-stryker-incremental-cache | Stryker --incremental cache: declare .stryker-tmp/incremental.json as an Nx output for the mutate target AND exclude it from inputs (two caches must not invalidate each other).          | ⏳ pending          | —   | DACI:175 |     |
| L5-stryker-scope-expand      | Decide Stryker scope expansion (core/ → adapters/) once adapters have real logic.                                                                                                         | ⏳ pending          | —   | DACI:316 |     |
| L5-coverage-excludes         | Align Vitest coverage excludes for _.test._ / _.stories._ (don't measure coverage OF tests/stories); keep Storybook on default \*.stories.tsx glob.                                       | ⏳ pending          | 📄  | DACI:317 |     |

## C · PR automation & agent standards (L6, L8)

| ID    | Decision                                                                                                                                                                                                           | Status              | Enf | Source           | Gap |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | --- | ---------------- | --- |
| L6-1  | DangerJS rule: deleted test-lines + unchanged source = FAIL (catches the green-fake by diff-shape, no coverage math).                                                                                              | 💤 deferred-trigger | 📄  | DACI:135         | 🟥  |
| L6-2  | DangerJS rule: PR > ~400 lines = FAIL, to enforce baby-PRs / one-`git revert` value.                                                                                                                               | 💤 deferred-trigger | 📄  | DACI:135         | 🟥  |
| L6-3  | DangerJS: conventional commit scope = workspace; missing issue ref = WARN (non-blocking).                                                                                                                          | 💤 deferred-trigger | 📄  | DACI:135         | 🟥  |
| L6-4  | Adopt commitlint to validate commit messages (conventional commits).                                                                                                                                               | ✅ done             | 🤖  | DACI:135         |     |
| L6-5  | CODEOWNERS-by-layer; specifically cover enforcement-rule files (dangerfile, probes, drift-check/update-floors workflows, CODEOWNERS, eslint/dep-cruiser config).                                                   | ⏳ pending          | 📄  | DACI:135,308     | 🟥  |
| L6-6  | DangerJS first-use trigger rules (WARN, non-blocking): first _.tsx→Storybook, first_.e2e→Playwright, first aws-\* integration test→LocalStack, first PR→Linear GitHub App.                                         | ⏳ pending          | 📄  | DACI:155-162,310 | 🟥  |
| L6-7  | First-use trigger hardening: glob exclusions for tests/stories/configs, committed `tooling/first-use-flags.json` for concurrency-safe single-fire, `gh api` 'no merged PRs' check replacing fragile pr.number===1. | ⏳ pending          | 📄  | DACI:166-169,310 | 🟥  |
| L6-8  | DangerJS probe-obsolescence rule: fail any PR that inverts a probe assertion without a matching rule-config diff in the same PR.                                                                                   | 💤 deferred-trigger | 📄  | DACI:146         | 🟥  |
| L6-9  | DangerJS enforcement-file meta-rule: any PR modifying a CODEOWNERS-protected enforcement file must be enforcement-only (no source/test files in the same diff).                                                    | ⏳ pending          | 📄  | DACI:309         | 🟥  |
| L6-10 | DangerJS floor-downgrade rule: fail any PR that modifies both `tooling/floors.json` AND test files in the same PR (closes the floor-downgrade attack).                                                             | ⏳ pending          | 📄  | DACI:313         | 🟥  |
| L6-11 | DangerJS isolatedDeclarations bucket-classification prompt on CI failure: comment 3 buckets + ask 'which bucket?' so log entries happen at PR time (with line-ref citation + Approver co-sign).                    | ⏳ pending          | 📄  | DACI:319         | 🟥  |
| L8-1  | AGENTS.md is GENERATED from config (source config = single source of truth; doc auto-derived), because agents reliably read AGENTS.md but not multi-file configs.                                                  | ⏳ pending          | 📄  | DACI:137         | 🟥  |
| L8-2  | CI drift-check: build FAILS if AGENTS.md is regenerated without the source config also changing in the same PR (stops doc/gate divergence + the regen-to-bypass attack).                                           | ⏳ pending          | 📄  | DACI:137,185,311 | 🟥  |
| L8-3  | Lefthook git hooks: pre-commit runs `nx affected --uncommitted` on staged; pre-push runs `nx affected --base=origin/master --head=HEAD` (collapses write→push→red-CI→rewrite loop to a local gate).                | 💤 deferred-trigger | 📄  | DACI:137,186     | 🟥  |
| L8-4  | Shared config packages (Nx-provided `@repo/tsconfig` etc.) as reusable bases for tsconfig/eslint.                                                                                                                  | 💤 deferred-trigger | —   | DACI:137         |     |
| L8-5  | AGENTS.md generator MUST emit prose rationale per rule (not just rule names) and source configs MUST carry inline 'why' comments.                                                                                  | ⏳ pending          | 📄  | DACI:185         | 🟥  |
| L8-6  | `--no-verify` policy: commit/push --no-verify bypass Lefthook silently; CI-side gates are authoritative; AGENTS.md instructs agents to NEVER pass --no-verify.                                                     | 🔒 locked-active    | —   | DACI:187         |     |

## D · CI cost/safety (L7)

| ID                      | Decision                                                                                                                                                             | Status              | Enf | Source   | Gap |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --- | -------- | --- |
| L7-affected             | Use `nx affected` as the cheap-CI engine so CI only runs targets impacted by the diff instead of the whole graph.                                                    | 🔒 locked-active    | 🤖  | DACI:136 |     |
| L7-reusable-wf          | Use a reusable workflow / composite action for CI so adding a new gate is one line (DRY pipeline definition).                                                        | ✅ done             | 🤖  | DACI:136 |     |
| L7-retention            | Set CI artifact retention to 7 days.                                                                                                                                 | 🔒 locked-active    | —   | DACI:136 |     |
| L7-master-trigger       | Fix the `master`/`main` trigger so all on.push.branches / merge_group / OIDC trust-policy refs use refs/heads/master.                                                | ✅ done             | 🤖  | DACI:136 |     |
| L7-merge-queue          | Use a merge-queue (`merge_group`) so two independently-green parallel-agent PRs can't combine into a broken master.                                                  | ✅ wired            | 🤖  | DACI:136 |     |
| L7-merge-queue-fallback | If GitHub plan tier lacks merge_group, downgrade to branch-protection + linear history + required reviews until plan upgrade.                                        | 💤 deferred-trigger | —   | DACI:181 |     |
| L7-oidc                 | OIDC stays reserved for deploy.yml (deploy-only short-lived AWS credential auth, not used in non-deploy CI).                                                         | ✅ done             | 🤖  | DACI:136 |     |
| L7-reject-matrix        | Reject per-layer CI matrix (N-times install cost on a skeleton) and full hermetic/no-internet CI — defer until real code exists.                                     | 💤 deferred-trigger | —   | DACI:136 |     |
| L7-set-shas             | Wire nrwl/nx-set-shas@v4 (or explicit NX_BASE/NX_HEAD) so nx affected gets correct base SHAs on pull_request, push:master, and merge_group.                          | ✅ done             | 🤖  | DACI:179 |     |
| L7-nxcloud-cap          | Nx Cloud free tier has a monthly compute-credit cap; on exhaustion fall back to local-cache-only — never treat Nx Cloud as a hard dependency. Monitor first 30 days. | ⏳ pending          | —   | DACI:180 |     |
| L7-plan-tier            | Verify GitHub plan tier supports merge_group before wiring Step 3 (Free for public repos; Team+ for private).                                                        | ✅ verified         | —   | DACI:181 |     |
| L7-paths-filter         | Add nx.json to the CI paths `changes` filter (code:+apps:) so a config-only PR can't skip quality/build jobs yet report green via the skip-tolerant ci-green gate.   | ✅ done             | 🤖  | DACI:410 |     |
| L7-ci-node24            | Bump CI node-version 22 -> 24 in both quality+build jobs so local==CI==Node 24 (Active LTS), closing a green-local/red-CI type-stripping parity gap.                 | ✅ done             | 🤖  | DACI:408 |     |

## E · Security & hygiene (L9)

| ID                  | Decision                                                                                                                                                                                         | Status           | Enf | Source   | Gap |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --- | -------- | --- |
| E-knip              | Knip for dead-code/drift detection: config now, advisory until apps land, then flip to error.                                                                                                    | 🔒 locked-active | 📄  | DACI:193 | 🟥  |
| E-syncpack          | Syncpack to enforce consistent dependency versions across the monorepo workspace.                                                                                                                | ✅ done          | 🤖  | DACI:193 |     |
| E-pnpm-catalog      | pnpm catalog for centralized version pinning (single source of truth for dep versions).                                                                                                          | 🔒 locked-active | —   | DACI:193 |     |
| E-no-orphans-error  | Flip dependency-cruiser no-orphans from WARN to ERROR; configure test/story files as entries so co-location doesn't false-positive.                                                              | ✅ done          | 🤖  | DACI:193 |     |
| E-osv-scanner       | osv-scanner as a CI gate that fails the build on any known CVE in dependencies (free SCA).                                                                                                       | 🔒 locked-active | 🤖  | DACI:194 |     |
| E-dependabot        | Enable GitHub Dependabot alerts (free, includes private) plus pnpm audit for dependency-vuln visibility.                                                                                         | 🔒 locked-active | —   | DACI:194 |     |
| E-renovate          | Renovate for dependency updates: grouped packageRules for low PR noise, pnpm-catalog-aware, automerge only lockFileMaintenance.                                                                  | ⏳ pending       | —   | DACI:195 |     |
| E-renovate-harden   | Renovate automerge hardening: minimumReleaseAge '7 days' (raised 3→7 to match the pnpm SAST floor, NH-259); restrict automerge to lockFileMaintenance only; all version bumps need human review. | ⏳ pending       | —   | DACI:203 |     |
| E-gitleaks          | gitleaks always-on for secret scanning: Lefthook pre-commit + CI; free and works on private repos (carries the gap when GHAS native scanning auto-off).                                          | ✅ done          | 🤖  | DACI:196 |     |
| E-gh-secret-scan    | Enable GitHub native secret scanning + push protection while public; AWS partner auto-revokes leaked keys; auto-off on private (needs GHAS).                                                     | ✅ done          | 🤖  | DACI:196 |     |
| E-semgrep           | Semgrep always-on SAST: fast, runs in Lefthook + PR, free on private repos.                                                                                                                      | ✅ done          | 🤖  | DACI:197 |     |
| E-codeql            | CodeQL deep SAST out-of-band: weekly schedule + push-to-main; public-only via repository.visibility workflow guard, auto-disables on private (no GHAS bill).                                     | ✅ done          | 🤖  | DACI:197 |     |
| E-sec-principle     | Security principle: for SAST and secrets each, run portable free OSS always-on + best free GitHub-native while public; GHAS never required.                                                      | 🔒 locked-active | —   | DACI:199 |     |
| E-codeql-guard-impl | CodeQL visibility guard impl: job-level gh api .visibility output gating both CodeQL job and SARIF-upload step with if public (covers schedule events).                                          | ✅ done          | 🤖  | DACI:205 |     |

## F · Integrations & observability (L10–L13)

> ⚠️ **L10a / L10b (Linear) are SUPERSEDED — the tracker is now Jira (project NH).** See `docs/decisions/2026-06-11-tracker-linear-to-jira.md`. The Linear rows below are retained for history.

| ID            | Decision                                                                                                                                                                                                                                                                                                                             | Status                                 | Enf                 | Source   | Gap                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------- | -------- | --------------------------------------------------------------------------- | --- |
| L10a          | Linear MCP is foundation: token scope write:issues only, OS keychain (not dotfile/env var), 90-day rotation, revoke-at-linear.app runbook.                                                                                                                                                                                           | ✅ done                                | —                   | DACI:209 |                                                                             |
| L10a-fallback | MCP-downtime SPOF fallback: agents append bullets to committed tooling/linear-pending.md; next session drains by flipping [ ]→[x] per successful Linear call.                                                                                                                                                                        | ✅ done                                | —                   | DACI:209 |                                                                             |
| L10a-v1       | v1 typed-JSON-queue + state-machine drain for MCP fallback — rejected as over-engineered for ~99.9% SLA solo-dev failure surface.                                                                                                                                                                                                    | ⛔ superseded                          | —                   | DACI:209 |                                                                             |
| L10b          | Linear GitHub App (branch→issue, merge status automation) deferred to first-PR trigger; needs GH repo linked to Linear team + LEO-- branch naming.                                                                                                                                                                                   | ⏳ pending                             | 📄                  | DACI:210 | 🟥                                                                          |
| L11-sentry    | Sentry for client JS errors from commit #1 (source maps + release tagging); painful to retrofit, free tier.                                                                                                                                                                                                                          | ⏳ pending                             | 📄                  | DACI:218 |                                                                             |
| L11-backend   | CloudWatch + X-Ray for backend SRE/SLOs land WITH the Lambdas (build-phase), not pre-setup.                                                                                                                                                                                                                                          | 💤 deferred-trigger                    | —                   | DACI:218 |                                                                             |
| L11-rejected  | CloudWatch RUM rejected (not free); Sentry-for-Lambda deferred (backend stays on CloudWatch/X-Ray).                                                                                                                                                                                                                                  | 🔒 locked-active                       | —                   | DACI:218 |                                                                             |
| L11-srcmap    | Sentry source-map data boundary: upload to Sentry only, never to public CDN; enable 'Hide source content'; auth token project:releases scope only.                                                                                                                                                                                   | ⏳ pending                             | 📄                  | DACI:204 |                                                                             |
| L11-envsecret | Source-map CI job MUST declare environment: production-build (else env secrets act repo-level, fork-PR exposed); deployment-branch rule restricted to refs/heads/master.                                                                                                                                                             | ⏳ pending                             | 📄                  | DACI:204 | 🟥                                                                          |
| L12-env       | Typed env validation via zod schema (e.g. t3-env) — cheap now, drift-prone later.                                                                                                                                                                                                                                                    | ⏳ pending                             | 📄                  | DACI:219 | 🟥                                                                          |
| L12-envload   | Local runtime env loading = bare `dotenv` (`import 'dotenv/config'` in server `main.ts` + `seed.util.ts`); local-dev only, Lambda/CI inject env (dotenv `override:false`). The loader, distinct from typed validation (L12-env). Rejected now: `@nestjs/config` (heavier, Nest-coupled), t3-env (validates, needs a loader beneath). | ✅ done (NH-260, PR #96)               | 📄                  | NH-260   | Typed validation still pending (L12-env); no test asserts load-before-read. |
| L12-pin       | Node/pnpm version pinning via .nvmrc + packageManager field (dev spans Mac + iPad, pinning matters).                                                                                                                                                                                                                                 | 🟡 partial                             | 🤖                  | DACI:219 |                                                                             |
| L12-a11y      | eslint-plugin-jsx-a11y folds into the L3 growable ESLint engine for accessibility linting. **NH-243:** `eslint-plugin-jsx-a11y` recommended config folded into `client/eslint.config.js` (supersedes NH-168).                                                                                                                        | ✅ done                                | 🤖                  | DACI:219 |                                                                             |
| L12-size      | Perf/bundle budget via size-limit (optionally Lighthouse CI); gate runs in CI, budgets ratchet like coverage.                                                                                                                                                                                                                        | ⏳ pending                             | 📄                  | DACI:219 | 🟥                                                                          |
| L13           | Test/dev harnesses deferred to first-use trigger: Storybook (first \*.tsx), Playwright (first E2E), LocalStack (first AWS-adapter integration test).                                                                                                                                                                                 | 💤 deferred-trigger                    | 📄                  | DACI:220 | 🟥                                                                          |
| L13-conv      | Conventions established now: test-ID naming, default story glob \*_/_.stories.@(ts                                                                                                                                                                                                                                                   | tsx), docker-compose port allocations. | 💤 deferred-trigger | 📄       | DACI:220                                                                    |     |
| L13-firstuse  | DangerJS first-use trigger comments (warns, not fails) on the PR introducing each first Storybook/Playwright/LocalStack instance; glob exclusions + persisted flag file for concurrency.                                                                                                                                             | ⏳ pending                             | 📄                  | DACI:310 | 🟥                                                                          |
| L13-storyglob | Keep Storybook on default _.stories.tsx glob; align Vitest coverage excludes for _.test._ /_.stories.\*.                                                                                                                                                                                                                             | ⏳ pending                             | 📄                  | DACI:317 | 🟥                                                                          |

## G · Conventions — co-location & folder layout

| ID          | Decision                                                                                                                                                                                                                                                                          | Status                                                              | Enf                 | Source   | Gap      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------- | -------- | -------- | --- |
| CONV-1      | Domain/feature-organized folders; group by domain not file-type — NO top-level **tests**/ · **mocks**/ · stories/ dirs (check-layout Rule 1). 'One folder per unit' (folder-per-entity) DROPPED — the role suffix carries the role (see NAME-suffix).                             | 🔒 locked-active                                                    | 🤖                  | DACI:226 |          |
| CONV-2      | Tests (\*.test.ts, Vitest) and stories co-located next to source (check-layout Rule 3 — test requires source sibling). NO per-feature index.ts barrels (ADR §6.3 — public API is the Nx package entry).                                                                           | 🔒 locked-active                                                    | 🤖                  | DACI:227 |          |
| CONV-3      | Vitest test glob = \*_/_.test.{ts,tsx}; this is the discovery pattern for the test target.                                                                                                                                                                                        | 🔒 locked-active                                                    | 🟡                  | DACI:236 |          |
| CONV-4      | Exclude _.test._ and _.stories._ from coverage targets — don't measure coverage of tests/stories.                                                                                                                                                                                 | ⏳ pending                                                          | 📄                  | DACI:236 | 🟥       |
| CONV-5      | dependency-cruiser no-orphans promoted to error and must treat _.test._/_.stories._ as entry points (else co-located tests/stories read as orphans).                                                                                                                              | ✅ done                                                             | 🤖                  | DACI:237 |          |
| CONV-6      | Knip must treat _.test._/_.stories._ as entry points/exclusions so co-located tests/stories aren't flagged as unused.                                                                                                                                                             | ⏳ pending                                                          | 📄                  | DACI:237 | 🟥       |
| CONV-7      | Storybook stories glob = default \*_/_.stories.@(ts                                                                                                                                                                                                                               | tsx) (plural — the standard agents emit), so no corrections needed. | 💤 deferred-trigger | 📄       | DACI:238 |     |
| CONV-8      | One structure encoded for everyone: AGENTS.md documents it, Nx generators emit it, gate configs know it — humans, agents, tools share one shape.                                                                                                                                  | 🔒 locked-active                                                    | 🟡                  | DACI:239 |          |
| NAME-suffix | ⛔ **superseded by `ARCH-NAME-1` (2026-06-18)** — relaxed to NestJS-native filenames; `core/` keeps the strict pure-domain subset (`entity, value-object, aggregate, event, specification, port, policy`); co-location kept. _(was: suffix-everything on every domain/app file.)_ | ⛔ superseded                                                       | —                   | ADR:D2   |          |

## H · Serverless project layout

| ID  | Decision                                                                                                                                                                                                                             | Status           | Enf | Source   | Gap |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --- | -------- | --- |
| H1  | Lambda handler.ts and its Pulumi infra.ts must NEVER share one Nx project; always split into separate Nx projects (boundary rule is project-level only).                                                                             | ⏳ pending       | 📄  | DACI:243 | 🟥  |
| H2  | Handler (runtime) lives in apps/ with tag type:app; may import @aws-sdk/_and @core/_; never @pulumi/\*.                                                                                                                              | ⏳ pending       | 🟡  | DACI:252 | 🟥  |
| H3  | IaC (deploy-time) lives in infra/ (or one shared infra) with tag type:infra; imports @pulumi/\*; never domain source.                                                                                                                | ⏳ pending       | 🟡  | DACI:253 | 🟥  |
| H4  | Infra references the handler BUILD OUTPUT via FileArchive(apps//dist), never its source — so @pulumi never enters the Lambda bundle.                                                                                                 | ⏳ pending       | 📄  | DACI:255 | 🟥  |
| H5  | Each apps/ sets targets.build.options.outputPath='dist'; apps/ and infra/ must be siblings under same parent so ../../apps//dist resolves.                                                                                           | ⏳ pending       | 📄  | DACI:259 | 🟥  |
| H6  | Wire the Nx graph the dist-link hides: infra/ sets implicitDependencies:[''] and deploy.dependsOn the handler build target.                                                                                                          | ⏳ pending       | 📄  | DACI:260 | 🟥  |
| H7  | dependency-cruiser owns the file/package-level bans Nx can't see; keep BOTH Nx boundaries and depcruise. Empirically confirmed by the 2026-06-12 spike — depcruise uniquely does cycles + orphans + graph viz under legacy eslintrc. | ✅ done          | 🤖  | DACI:266 |     |
| H8  | depcruise rule: app runtime ↛ @pulumi/\* — from ^apps/ to @pulumi/, severity error (broadened from ^apps/[^/]+/src to cover flat/lib handlers — review #6).                                                                          | ✅ done          | 🤖  | DACI:268 |     |
| H9  | depcruise rule: infra ↛ apps/core/adapters source — from ^infra/ to ^(apps\|core\|adapters)/, severity error (WIDENED, ADR D3; libs/ was vestigial — no libs/ dir).                                                                  | ✅ done          | 🤖  | DACI:269 |     |
| H10 | depcruise rule: core ↛ @aws-sdk/_AND core ↛ @pulumi/_ (D5 parity) — from ^core/ to @aws-sdk/ + @pulumi/, severity error.                                                                                                             | ✅ done          | 🤖  | DACI:270 |     |
| H11 | depcruise rule: adapters ↛ apps/infra source — from ^adapters/ to ^(apps\|infra)/, severity error (adapters are horizontal).                                                                                                         | ✅ done          | 🤖  | DACI:271 |     |
| H14 | depcruise rule: apps ↛ infra source — from ^apps/ to ^infra/, severity error (apps are runtime; never import IaC source — review #7; mirrors ADR D3 + the Nx type:app tag).                                                          | ✅ done          | 🤖  | PR#25#7  |     |
| H12 | Document the serverless handler-vs-IaC split in AGENTS.md so agents scaffold the apps/+infra/ shape correctly.                                                                                                                       | ⏳ pending       | 📄  | DACI:303 |     |
| H13 | Colocation patterns (CallbackFunction inline, CDK NodejsFunction next to source, SST) are REJECTED for this layer model — incompatible with Nx boundaries + per-fn nx affected.                                                      | 🔒 locked-active | —   | DACI:275 |     |

## I · Datastore & schema

| ID    | Decision                                                                                                                                                                                                                                       | Status                                                                                   | Enf              | Source                                       | Gap                                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --- |
| DS-1  | Polyglot persistence: catalog store = Neon PostgreSQL + JSONB; per-user data stays DynamoDB. Two stores, distinct roles.                                                                                                                       | 🔒 locked-active                                                                         | 📄               | 2026-06-09-catalog-store-postgres-neon.md:9  |                                                                                                                          |
| DS-2  | DynamoDB is per-user data only (scores, settings, mappings, offline sync); Streams change-feed for sync; the AWS-portfolio centerpiece.                                                                                                        | 🔒 locked-active                                                                         | 📄               | 2026-06-09-catalog-store-postgres-neon.md:13 |                                                                                                                          |
| DS-3  | Catalog uses Postgres + JSONB (typed columns for queried fields, data jsonb for variable/nested); rejects pure Mongo and DynamoDB for catalog.                                                                                                 | 🔒 locked-active                                                                         | 📄               | 2026-06-09-catalog-store-postgres-neon.md:14 |                                                                                                                          |
| DS-4  | MongoDB/DocumentDB dropped — evaluated then rejected; kept only as an interview talking-point + optional local-Docker learning exercise.                                                                                                       | 🔒 locked-active                                                                         | —                | 2026-06-09-catalog-store-postgres-neon.md:16 |                                                                                                                          |
| DS-5  | Provider = Neon (standard Postgres, $0 permanent free tier, serverless HTTP driver for Lambda↔Postgres). Store swappable behind K-3 catalog API.                                                                                               | 🔒 locked-active                                                                         | 📄               | 2026-06-09-catalog-store-postgres-neon.md:28 |                                                                                                                          |
| DS-6  | Catalog schema is locked/authoritative (v1 DDL): tables catalog_item, exercise, pattern, item_pattern; pattern_pairing designed-but-deferred.                                                                                                  | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:53              |                                                                                                                          |
| DS-7  | Lesson != Song: one catalog_item table with a type discriminator ('song'                                                                                                                                                                       | 'lesson') + shared base columns; type-specific structure in data jsonb / related tables. | 🔒 locked-active | 📄                                           | 2026-06-10-catalog-schema.md:46                                                                                          |     |
| DS-8  | Postgres stores keys + searchable metadata only, never blobs. Notation files live in S3 (CloudFront signed URLs); exercise notation is inline alphaTex text.                                                                                   | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:15              |                                                                                                                          |
| DS-9  | DDL CHECK constraints locked: ci_type, ci_status, ci_level (1-10), ci_song_bpm, ci_song_file, ci_song_fmt, ci_lesson_type_only, ci_source, ex_one_source, ex_slice_bars, ex_bpm_ladder, pat_level.                                             | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:99              |                                                                                                                          |
| DS-10 | Security/integrity CHECKs locked: shared catalog is curated-only (ci_shared_curated), source write-once (ci_source), published curated items require license (ci_pub_license).                                                                 | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:106             |                                                                                                                          |
| DS-11 | Controlled vocabularies are app-enforced (not DB enums) for extensibility: lesson_type, pattern.kind, instruments[], license. Array-first rule: vocab starts as text[]+GIN, graduates to a table only when it needs own columns/relationships. | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:176             |                                                                                                                          |
| DS-12 | Search via Postgres extensions: pg_trgm (fuzzy) + unaccent + tsvector; GIN indexes on arrays, generated tsvector 'search' column, trigram indexes; all SQL values parameterized.                                                               | 🔒 locked · impl deferred → NH-123                                                       | 📄               | 2026-06-10-catalog-schema.md:243             | Not in the Playable migration (0000_playable_init); ref DDL 2026-06-10-catalog-schema.md §4/§9 (old catalog_item model). |
| DS-13 | Publish-gate + cross-row invariants are app/CMS-enforced (DDL can't express): lesson needs >=1 exercise before published; slice bars <= source song bars; source song must be 'published' to serve a slice.                                    | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:199             |                                                                                                                          |
| DS-14 | data jsonb on every entity absorbs late findings with no migration; known keys (bars, sections[], album, year, defaultMappingPresetId, meta) documented; data is not a PII landing zone.                                                       | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:326             |                                                                                                                          |
| DS-15 | id strategy = text (slug where stable for curated/patterns, uuid for user-uploads); exercise ids prefer uuid over lesson-slug+step so reordering doesn't break references.                                                                     | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:338             |                                                                                                                          |
| DS-16 | license enforcement depth resolved: DB-enforced via ci_pub_license CHECK (published curated items require non-null license).                                                                                                                   | 🔒 locked-active                                                                         | 📄               | 2026-06-10-catalog-schema.md:340             |                                                                                                                          |
| DS-17 | v1 deferred schema slots (designed, not built): track table, song_part table, pattern_pairing, collection, default_mapping_preset_id, most_practiced_count, course, multi-arrangement grouping, user-upload private space.                     | 💤 deferred-trigger                                                                      | —                | 2026-06-10-catalog-schema.md:304             |                                                                                                                          |
| DS-18 | Optional speed layer = Redis (AWS ElastiCache/MemoryDB) for cache/rate-limit; never a source of truth. Deferred.                                                                                                                               | 💤 deferred-trigger                                                                      | —                | 2026-06-09-catalog-store-postgres-neon.md:15 |                                                                                                                          |

## REVIEW · Review resolutions & re-decisions

| ID               | Decision                                                                                                                                                                                                                          | Status              | Enf | Source   | Gap |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --- | -------- | --- |
| F1-cost          | isolatedDeclarations cost (~5-10% extra LOC for explicit return-type annotations on public exports) accepted; 3-15x .d.ts benefit holds, cost priced in (refines L4).                                                             | 🔒 locked-active    | 🤖  | DACI:338 |     |
| F1-window        | Keep isolatedDeclarations enabled through first 5 agent PRs OR until first libs/core//ports/ lands — whichever first — then evaluate.                                                                                             | 💤 deferred-trigger | —   | DACI:340 |     |
| F1-log           | Log every isolatedDeclarations CI failure to committed tooling/isolated-declarations-log.json with 3-bucket classification (AGENTS.md gap / doc gap / rule-did-its-job).                                                          | ⏳ pending          | 📄  | DACI:342 |     |
| F1-threshold     | At window end: (1)+(2)>50% fix AGENTS.md; (3)>=50% keep global; else if cost real apply fallback — relax to opt-in on core+adapters+shared types, opt-out apps/infra.                                                             | 💤 deferred-trigger | —   | DACI:346 |     |
| F1-danger        | DangerJS rule prompts the 3-bucket classification on each isolatedDeclarations CI failure (comment with buckets + 'which bucket?') so logging happens at PR time.                                                                 | ⏳ pending          | 📄  | DACI:356 | 🟥  |
| F1-antigame      | Anti-self-grading: bucket(3) requires non-trivial line-ref citation (DangerJS rejects without); Approver co-signs bucket(3) at PR#5; 30% blind re-classification audit.                                                           | ⏳ pending          | 🟡  | DACI:357 | 🟥  |
| F2-stryker-ports | Stryker mutate glob excludes interface/port files (no behavior); target entities/value-objects/validators (refines L5).                                                                                                           | ⏳ pending          | 📄  | DACI:361 |     |
| F2-colocate      | Tests stay co-located (NO **tests**/ convention); port fakes co-locate as \*.fake.ts or in small test-utils package (refines L5).                                                                                                 | 🔒 locked-active    | 📄  | DACI:361 | 🟥  |
| F2-noship        | _.test._ / _.stories._ / \*.fake.ts files never ship — excluded from build + bundle output (refines L5).                                                                                                                          | ⏳ pending          | 📄  | DACI:361 | 🟥  |
| F3-floors        | Quality floors live in committed tooling/floors.json (per metric x per Nx project); PRs fail if coverage/mutation/type-cov drops below committed floor; start low, ratchet up (refines L5).                                       | ⏳ pending          | 📄  | DACI:362 | 🟥  |
| F3-updatejob     | update-floors job (contents:write, push:master only) bumps floors up + commits; constrained to workflow_dispatch OR push:master, never pull_request\*, gated by Actions environment with required reviewer.                       | ⏳ pending          | 📄  | DACI:362 | 🟥  |
| F3-noescape      | Add 'no escape hatches' ESLint set: ban/limit eslint-disable (require reason), @ts-ignore/@ts-nocheck, /_istanbul ignore_/ — stops agents disabling past a gate.                                                                  | ✅ done             | 🤖  | DACI:362 |     |
| F3-danger-floor  | DangerJS rule fails any PR modifying BOTH tooling/floors.json AND test files in same diff (closes 'delete tests + lower floor together' attack).                                                                                  | ⏳ pending          | 📄  | DACI:362 | 🟥  |
| F3-attackdoc     | Floor-downgrade-via-PR-injection attack vector documented in-doc so future reviewers see it.                                                                                                                                      | 🔒 locked-active    | —   | DACI:362 |     |
| F3-codeowners    | Enforcement-rule files (dangerfile + rule modules, probes/\*_, drift-check/update-floors workflows, CODEOWNERS, eslint.config._, dependency-cruiser.cjs) are CODEOWNERS-protected against same-PR rule-deletion attack.           | ⏳ pending          | 📄  | DACI:364 | 🟥  |
| F3-metarule      | DangerJS meta-rule: any PR modifying a CODEOWNERS-protected enforcement file must be enforcement-only (no source/test in same diff) — forces rule changes into isolated PRs.                                                      | ⏳ pending          | 📄  | DACI:364 | 🟥  |
| F3-solocaveat    | Solo-dev: enforcement-file changes hit self-approval block; default to documented direct-master-push exception until a 2nd-reviewer account is set up (deferred decision).                                                        | 💤 deferred-trigger | —   | DACI:364 |     |
| F4-nxsync        | TS project references are Nx-managed via nx sync (CI runs nx sync --check, free/Nx-core); never hand-edit references arrays; enable via nx.json sync-generators; AGENTS.md documents it (refines L4).                             | 🔒 locked-active    | 📄  | DACI:365 | 🟥  |
| F5-branch        | Default branch confirmed = master (re-confirms checklist; ci.yml triggers master, refs/heads/master throughout).                                                                                                                  | ✅ done             | —   | DACI:366 |     |
| F6-bun           | Bun fully dropped — pnpm only.                                                                                                                                                                                                    | ✅ done             | 🤖  | DACI:367 |     |
| F7-sentry        | Create Sentry project + project-scoped auth token; add SENTRY_AUTH_TOKEN GH Actions secret BEFORE wiring source-map upload (silent-fails without it).                                                                             | ⏳ pending          | 📄  | DACI:368 |     |
| M1-relocate      | DangerJS test-relocation opt-out label: refactor:test-relocation.                                                                                                                                                                 | ⏳ pending          | 📄  | DACI:370 | 🟥  |
| M2-typecov       | Per-Nx-project type-coverage floors; infra (type:infra) uses lower floor (~90%) due to Pulumi Output; others ~95% and ratchet together.                                                                                           | ⏳ pending          | 📄  | DACI:370 | 🟥  |
| M3-mergegroup    | merge_group requires branch-protection (post-repo-creation step).                                                                                                                                                                 | ✅ wired            | 🤖  | DACI:370 |     |
| M4-prettier      | Add eslint-config-prettier (disable ESLint rules conflicting with Prettier). **NH-243:** `eslint-config-prettier/flat` added last in the shared base; Prettier consolidated to one root `prettier.config.mjs` (supersedes NH-43). | ✅ done             | 🤖  | DACI:370 |     |
| M5-nvmrc         | .nvmrc Node version = Lambda runtime (esbuild target match).                                                                                                                                                                      | 🟡 partial          | 🤖  | DACI:370 |     |
| M6-sizelimit     | Per-Lambda size-limit budget on dist (catches Pulumi leaking into the bundle).                                                                                                                                                    | ⏳ pending          | 📄  | DACI:370 | 🟥  |
| M8-nxignore      | Add .pulumi/ + Pulumi stack files to .nxignore + .gitignore.                                                                                                                                                                      | 🔒 locked-active    | 📄  | DACI:370 |     |
| M9-token         | Linear MCP token one-time setup (hygiene per L10a).                                                                                                                                                                               | ✅ done             | —   | DACI:370 |     |
| M7-release       | nx release (commit-driven) for changelog/release: conventional commits to per-package SemVer + per-project CHANGELOG.md + tags; alpha via --prerelease alpha; PR previews 0.0.1-pr.{prId}. Main app = @notation-hero/player-pwa.  | 🔒 locked-active    | 📄  | DACI:372 |     |
| M10-license      | License (proprietary vs open-source) + eslint-plugin-header copyright rule are TBD, pending the open-source decision; tracked in Linear.                                                                                          | ⏳ pending          | —   | DACI:374 |     |
| L9-cosmetic      | L9 label added to the dependency-health/security section (cosmetic).                                                                                                                                                              | ✅ done             | —   | DACI:376 |     |
| L10a-v2          | L10a v2 re-decision: replace v1 typed JSON queue (linear-queue.json + schema + state machine) with markdown TODO tooling/linear-pending.md; drain per - [ ] bullet, flip to - [x] with inline LEO-XXX note.                       | ⛔ superseded       | —   | DACI:380 |     |
| WAVE1-node24     | Wave 1 re-decision: bump CI node-version 22 to 24 in both quality+build jobs; amends 'no .github changes' criterion; also adds nx.json to paths-filter (closes config-only false-green).                                          | ✅ done             | 🤖  | DACI:404 |     |

## 🟥 Lint backlog — decided rules NOT yet machine-enforced

Each is a candidate lint/CI gate (Task 3). Most are deferred future tooling; the cheap-and-now subset is called out in the session notes.

> **✅ Now enforced as of 2026-06-12 (PR #25 — moved out of this backlog; see the main tables for live status):** `L2-tags`, `DEPCR-files`, `H7`, `H8`, `H9` (widened to `apps|core|adapters`), `H10` (+ `core↛@pulumi`), `H11`, `CONV-1`/`CONV-2` (co-location via `check-layout.sh`), plus new `NAME-suffix` + `STRUCT-sibling`. Their rows below are **stale** (retained for history) — the `Suggested enforcement` text describing them as "prose only / not in config" no longer holds. A follow-up `docs(registry)` pass can prune them.

| ID                      | Decision                                                                                                                                                                                                                | Suggested enforcement                                                                                                                                                                                                                                              | Source                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| L2-tags                 | Boundary axis (b): Nx enforce-module-boundaries ESLint tag rule fails tag-violating imports (type:core/adapter/app/infra) even when the dep is declared.                                                                | none — prose only; required CI ESLint has NO enforce-module-boundaries tag rule yet (only the custom core/\*\* no-restricted-imports rule)                                                                                                                         | DACI:125                                                                                                                                                                     |
| L2-probes               | Committed self-testing probe suite under tooling/probes/ — one Vitest spec per boundary/dep-cruise rule asserting intentional violations FAIL in CI (guards against a rule being loosened).                             | none — prose only; probes added per Sequencing step 9 once boundary rules exist; DangerJS probe-inversion guard also not wired                                                                                                                                     | DACI:125                                                                                                                                                                     |
| L4-typecov              | type-coverage floor (start ~95%, ratchet up; infra type:infra uses ~90% per M-2 due to Pulumi Output).                                                                                                                  | none — prose only; no type-coverage check in CI yet (checklist line 301 unchecked)                                                                                                                                                                                 | DACI:127                                                                                                                                                                     |
| L4-dts                  | build:dts Nx target per library running tsc -b --emitDeclarationOnly (Vite/esbuild handles JS); tsconfig.build excludes co-located test/spec/stories/e2e/fake files; cache dist/types as Nx output.                     | none — prose only; build target is a stub for infra; build:dts not yet wired (checklist line 304 unchecked)                                                                                                                                                        | DACI:151                                                                                                                                                                     |
| FOLD-serverless         | Serverless split per-Lambda into TWO Nx projects: apps/ (type:app, handler) + infra/ (type:infra, IaC), siblings; never colocate handler.ts + infra.ts. Colocation patterns rejected.                                   | none — prose only; no Lambda projects scaffolded yet (checklist line 302 unchecked); enforce-module-boundaries is project-level-blind so split is mandatory                                                                                                        | DACI:128                                                                                                                                                                     |
| DEPCR-files             | dependency-cruiser file-level bans: handler↛@pulumi/_, infra↛apps/libs source, core↛@aws-sdk/_, adapters↛apps/infra source (adapters horizontal; may import @aws-sdk + @core).                                          | none — prose only; CI depcruise enforces hexagonal DIRECTION but NOT these file/package-level bans (checklist line 303 unchecked)                                                                                                                                  | DACI:266                                                                                                                                                                     |
| CONV-coloc              | Domain/feature-organized folders, one folder per unit; group by domain not file-type (no top-level **tests**/ or stories/ trees); tests + stories co-located with source.                                               | none — prose only; AGENTS.md/generators document it but no folder-layout/no-**tests** ESLint rule exists; depcruise no-orphans WARN actually whitelists **tests**/                                                                                                 | DACI:226                                                                                                                                                                     |
| CONV-orphans            | Configure no-orphans=error + Knip to treat _.test._ / _.stories._ as entry points/exclusions, and exclude them from coverage targets, so co-located tests/stories don't read as orphans.                                | none — prose only; no-orphans is WARN today (not error) and whitelists **tests**/ rather than co-located _.test._; Knip not installed (checklist line 322 unchecked)                                                                                               | DACI:237                                                                                                                                                                     |
| L5-coverage-ratchet     | Coverage ratchet: CI fails if coverage drops below the committed floor (read-only check) — blocks test deletion. Floors start low (~60%), ratchet up.                                                                   | none — prose only; floors live in committed tooling/floors.json (1 floor/metric/project); update-floors job (push:master only) bumps. Not wired (checklist 301,317 unchecked; no coverage tool today).                                                             | DACI:134                                                                                                                                                                     |
| L5-stryker              | Stryker mutation testing scoped to core/, --incremental, score floor (~50%) → blocks assertion-free hollow tests (the 93% cov / 58% mutation case).                                                                     | none — prose only; DEFERRED until first behavior-bearing core/ fn with a covered test exists. floors.json mutation slot reserved as null until then (DACI:174). checklist 315 unchecked.                                                                           | DACI:134                                                                                                                                                                     |
| L5-vacuous-green        | Fix the vacuous-green scaffold — close the live false-green where the scaffolded test passes without asserting anything.                                                                                                | none — prose only; lands with Vitest setup at Step 4 (DACI:282). No machine check today; the current scaffold false-green is documented as still-live.                                                                                                             | DACI:134                                                                                                                                                                     |
| L5-no-empty-scripts     | No-empty-scripts / empty-filter guard — block green-faking via empty or no-op test scripts / empty package filters.                                                                                                     | none — prose only; Step 4 item (DACI:282). No machine check today. Pairs with the vacuous-green fix to stop scripts that exit 0 without running anything.                                                                                                          | DACI:134                                                                                                                                                                     |
| L5-stryker-port-exclude | Stryker mutate glob EXCLUDES interface/port files (no behavior to mutate); target only behavior-bearing files (entities, value objects, validators).                                                                    | none — prose only; a Stryker mutate-glob config setting, lands when Stryker is wired (deferred, checklist 315). F-2 round-2 resolution.                                                                                                                            | DACI:361                                                                                                                                                                     |
| L5-test-colocation      | Tests co-located with source (NO **tests**/ tree); port fakes co-locate as `*.fake.ts` or a small test-utils pkg; `*.test.*` / `*.stories.*` / fakes never ship (build+bundle exclude).                                 | none — prose only. dep-cruiser no-orphans WARN whitelists **tests**/ today (opposite of intent — needs flip to error + treat-as-entry). build:dts tsconfig excludes test/stories/fakes is unbuilt (DACI:153). checklist 322 unchecked.                             | DACI:361                                                                                                                                                                     |
| L5-floors-json          | Floors live in committed tooling/floors.json (one floor per metric x per Nx project); PRs fail on drop (read-only); update-floors job (contents:write, push:master only) bumps + commits.                               | none — prose only; floors.json + update-floors workflow not built. Hardening: update-floors gated to workflow_dispatch/push:master + environment required-reviewer (checklist 312). floors.json intentionally NOT CODEOWNERS-protected (solo self-approval block). | DACI:362                                                                                                                                                                     |
| L5-no-escape-hatches    | No-escape-hatches ESLint rule set: ban/limit eslint-disable (require reason), @ts-ignore/@ts-nocheck, and `/* istanbul ignore */` — stops agents disabling past a gate.                                                 | none — prose only; ESLint today is only no-restricted-imports on core/\*\* + recommended sets. The eslint-comments / ban-ts-comment / istanbul-ignore-ban rules are not in .eslintrc.cjs. checklist 314 unchecked.                                                 | DACI:362                                                                                                                                                                     |
| L5-floor-guard          | DangerJS rule fails any PR that modifies BOTH tooling/floors.json AND test files in the same diff — closes the 'delete tests + lower floor together' attack.                                                            | none — prose only; no DangerJS in CI yet (whole Dangerfile is unbuilt). checklist 313 unchecked. Read-only floor check otherwise passes when the metric stays at/above the new lower floor.                                                                        | DACI:362                                                                                                                                                                     |
| L6-1                    | DangerJS rule: deleted test-lines + unchanged source = FAIL (catches the green-fake by diff-shape, no coverage math).                                                                                                   | DangerJS dangerfile rule (not yet wired); CI 'CI Green' would run it once added                                                                                                                                                                                    | DACI:135                                                                                                                                                                     |
| L6-2                    | DangerJS rule: PR > ~400 lines = FAIL, to enforce baby-PRs / one-`git revert` value.                                                                                                                                    | DangerJS PR-size rule (not yet wired)                                                                                                                                                                                                                              | DACI:135                                                                                                                                                                     |
| L6-3                    | DangerJS: conventional commit scope = workspace; missing issue ref = WARN (non-blocking).                                                                                                                               | DangerJS rule (warn-level) (not yet wired)                                                                                                                                                                                                                         | DACI:135                                                                                                                                                                     |
| L6-4                    | Adopt commitlint to validate commit messages (conventional commits).                                                                                                                                                    | commitlint (not yet wired; would run via Lefthook/CI)                                                                                                                                                                                                              | DACI:135                                                                                                                                                                     |
| L6-5                    | CODEOWNERS-by-layer; specifically cover enforcement-rule files (dangerfile, probes, drift-check/update-floors workflows, CODEOWNERS, eslint/dep-cruiser config).                                                        | GitHub CODEOWNERS + branch-protection required review (not yet wired); checklist [Step 3] unchecked                                                                                                                                                                | DACI:135,308                                                                                                                                                                 |
| L6-6                    | DangerJS first-use trigger rules (WARN, non-blocking): first _.tsx→Storybook, first _.e2e→Playwright, first aws-\* integration test→LocalStack, first PR→Linear GitHub App.                                             | DangerJS warn-level trigger rules (not yet wired); checklist [Step 3] unchecked                                                                                                                                                                                    | DACI:155-162,310                                                                                                                                                             |
| L6-7                    | First-use trigger hardening: glob exclusions for tests/stories/configs, committed `tooling/first-use-flags.json` for concurrency-safe single-fire, `gh api` 'no merged PRs' check replacing fragile pr.number===1.      | Part of the DangerJS first-use rules + persisted flag file (not yet wired)                                                                                                                                                                                         | DACI:166-169,310                                                                                                                                                             |
| L6-8                    | DangerJS probe-obsolescence rule: fail any PR that inverts a probe assertion without a matching rule-config diff in the same PR.                                                                                        | DangerJS rule + CODEOWNERS rule-author co-review (not yet wired; probes land with boundary rules per L2)                                                                                                                                                           | DACI:146                                                                                                                                                                     |
| L6-9                    | DangerJS enforcement-file meta-rule: any PR modifying a CODEOWNERS-protected enforcement file must be enforcement-only (no source/test files in the same diff).                                                         | DangerJS rule (not yet wired); checklist [Step 3] unchecked; documented in AGENTS.md                                                                                                                                                                               | DACI:309                                                                                                                                                                     |
| L6-10                   | DangerJS floor-downgrade rule: fail any PR that modifies both `tooling/floors.json` AND test files in the same PR (closes the floor-downgrade attack).                                                                  | DangerJS rule (not yet wired); checklist [Step 4] unchecked; F-3 hardening                                                                                                                                                                                         | DACI:313                                                                                                                                                                     |
| L6-11                   | DangerJS isolatedDeclarations bucket-classification prompt on CI failure: comment 3 buckets + ask 'which bucket?' so log entries happen at PR time (with line-ref citation + Approver co-sign).                         | DangerJS comment rule on isolatedDeclarations CI failure (not yet wired); checklist [Step 4] unchecked                                                                                                                                                             | DACI:319                                                                                                                                                                     |
| L8-1                    | AGENTS.md is GENERATED from config (source config = single source of truth; doc auto-derived), because agents reliably read AGENTS.md but not multi-file configs.                                                       | Generator script (not yet wired); checklist drift-check item [Step 3] unchecked                                                                                                                                                                                    | DACI:137                                                                                                                                                                     |
| L8-2                    | CI drift-check: build FAILS if AGENTS.md is regenerated without the source config also changing in the same PR (stops doc/gate divergence + the regen-to-bypass attack).                                                | `.github/workflows/drift-check.yml` CI job (not yet wired); checklist [Step 3] unchecked                                                                                                                                                                           | DACI:137,185,311                                                                                                                                                             |
| L8-3                    | Lefthook git hooks: pre-commit runs `nx affected --uncommitted` on staged; pre-push runs `nx affected --base=origin/master --head=HEAD` (collapses write→push→red-CI→rewrite loop to a local gate).                     | Lefthook (one YAML, parallel) (not yet wired)                                                                                                                                                                                                                      | DACI:137,186                                                                                                                                                                 |
| L8-5                    | AGENTS.md generator MUST emit prose rationale per rule (not just rule names) and source configs MUST carry inline 'why' comments.                                                                                       | Generator content contract enforced indirectly by drift-check (not yet wired)                                                                                                                                                                                      | DACI:185                                                                                                                                                                     |
| E-knip                  | Knip for dead-code/drift detection: config now, advisory until apps land, then flip to error.                                                                                                                           | Knip not wired in CI today; decided but no machine check. Checklist 322 [ ] ties Knip entry/exclude config to test/story globs.                                                                                                                                    | DACI:193                                                                                                                                                                     |
| E-syncpack              | Syncpack to enforce consistent dependency versions across the monorepo workspace.                                                                                                                                       | Syncpack not in required CI today; decided but no machine check. No dedicated checklist item.                                                                                                                                                                      | DACI:193                                                                                                                                                                     |
| E-no-orphans-error      | Flip dependency-cruiser no-orphans from WARN to ERROR; configure test/story files as entries so co-location doesn't false-positive.                                                                                     | depcruise runs in CI (pnpm depcheck) but no-orphans is WARN today and whitelists **tests**/. Error flip + correct _.test._/_.stories._ entry handling pending. Checklist 322 [ ].                                                                                  | DACI:193                                                                                                                                                                     |
| E-osv-scanner           | osv-scanner as a CI gate that fails the build on any known CVE in dependencies (free SCA).                                                                                                                              | Decided as always-on CI gate but not wired into required CI today; no machine check yet. No dedicated [ ] checklist line.                                                                                                                                          | DACI:194                                                                                                                                                                     |
| E-gitleaks              | gitleaks always-on for secret scanning: Lefthook pre-commit + CI; free and works on private repos (carries the gap when GHAS native scanning auto-off).                                                                 | gitleaks not wired into required CI/Lefthook today; decided but no machine check. No dedicated [ ] checklist line (covered by L9 prose).                                                                                                                           | DACI:196                                                                                                                                                                     |
| E-semgrep               | Semgrep always-on SAST: fast, runs in Lefthook + PR, free on private repos.                                                                                                                                             | Semgrep not wired into required CI/Lefthook today; decided but no machine check. No dedicated [ ] checklist line.                                                                                                                                                  | DACI:197                                                                                                                                                                     |
| L10b                    | Linear GitHub App (branch→issue, merge status automation) deferred to first-PR trigger; needs GH repo linked to Linear team + LEO-- branch naming.                                                                      | DangerJS first-PR trigger comments on the PR introducing it (rule itself not yet wired — checklist 310/327 pending)                                                                                                                                                | DACI:210                                                                                                                                                                     |
| L11-envsecret           | Source-map CI job MUST declare environment: production-build (else env secrets act repo-level, fork-PR exposed); deployment-branch rule restricted to refs/heads/master.                                                | workflow YAML declaration + GitHub environment branch rule (manual config); no automated guard verifying the declaration exists                                                                                                                                    | DACI:204                                                                                                                                                                     |
| L12-env                 | Typed env validation via zod schema (e.g. t3-env) — cheap now, drift-prone later.                                                                                                                                       | none yet — zod runtime validation decided but not implemented (checklist 326, Step 8)                                                                                                                                                                              | DACI:219                                                                                                                                                                     |
| L12-pin                 | Node/pnpm version pinning via .nvmrc + packageManager field (dev spans Mac + iPad, pinning matters).                                                                                                                    | packageManager [pnpm@11.5.2](mailto:pnpm@11.5.2) already set (PR #2); .nvmrc not yet added — pnpm pin partly enforced via corepack, Node pin pending                                                                                                               | DACI:219                                                                                                                                                                     |
| L12-a11y                | eslint-plugin-jsx-a11y folds into the L3 growable ESLint engine for accessibility linting.                                                                                                                              | ✅ **done (NH-243):** `eslint-plugin-jsx-a11y` recommended config folded into `client/eslint.config.js` (supersedes NH-168).                                                                                                                                       | DACI:219                                                                                                                                                                     |
| L12-size                | Perf/bundle budget via size-limit (optionally Lighthouse CI); gate runs in CI, budgets ratchet like coverage.                                                                                                           | none yet — size-limit CI gate decided but not wired (checklist 326, Step 8)                                                                                                                                                                                        | DACI:219                                                                                                                                                                     |
| L13                     | Test/dev harnesses deferred to first-use trigger: Storybook (first \*.tsx), Playwright (first E2E), LocalStack (first AWS-adapter integration test).                                                                    | DangerJS first-use rule (warns on PR introducing each first instance) — rule not yet wired (checklist 310 [ ])                                                                                                                                                     | DACI:220                                                                                                                                                                     |
| L13-firstuse            | DangerJS first-use trigger comments (warns, not fails) on the PR introducing each first Storybook/Playwright/LocalStack instance; glob exclusions + persisted flag file for concurrency.                                | DangerJS rule + tooling/first-use-flags.json + gh-api 'no merged PRs' check — none implemented yet (Step 3)                                                                                                                                                        | DACI:310                                                                                                                                                                     |
| L13-storyglob           | Keep Storybook on default _.stories.tsx glob; align Vitest coverage excludes for _.test._ / _.stories.\*.                                                                                                               | Vitest coverage-exclude config + Storybook default glob — not yet configured (checklist 317 [ ], Step 4)                                                                                                                                                           | DACI:317                                                                                                                                                                     |
| CONV-1                  | Domain/feature-organized folders, one folder per unit; group by domain not file-type — NO top-level **tests**/ or stories/ trees.                                                                                       | none — prose only (documented in AGENTS.md + Nx generators emit it; no folder-layout lint/CI check today)                                                                                                                                                          | DACI:226                                                                                                                                                                     |
| CONV-2                  | Tests (_.test.tsx, Vitest) and stories (_.stories.tsx, Storybook) co-located next to source; optional index.ts barrel.                                                                                                  | none — prose only (convention in AGENTS.md + Nx scaffolds; no machine check that tests/stories sit beside source)                                                                                                                                                  | DACI:227                                                                                                                                                                     |
| CONV-4                  | Exclude _.test._ and _.stories._ from coverage targets — don't measure coverage of tests/stories.                                                                                                                       | none — prose only; coverage ratchet not yet enforced and excludes not yet configured (checklist [Step 4] item still [ ])                                                                                                                                           | DACI:236                                                                                                                                                                     |
| CONV-5                  | dependency-cruiser no-orphans promoted to error and must treat _.test._/_.stories._ as entry points (else co-located tests/stories read as orphans).                                                                    | no-orphans runs today but as WARN and whitelists **tests**/; the error promotion + correct co-located test/story entry handling is not yet configured (checklist [Step 5] still [ ])                                                                               | DACI:237                                                                                                                                                                     |
| CONV-6                  | Knip must treat _.test._/_.stories._ as entry points/exclusions so co-located tests/stories aren't flagged as unused.                                                                                                   | none — prose only; Knip is not yet installed/enforced in CI (checklist [Step 5] still [ ])                                                                                                                                                                         | DACI:237                                                                                                                                                                     |
| H1                      | Lambda handler.ts and its Pulumi infra.ts must NEVER share one Nx project; always split into separate Nx projects (boundary rule is project-level only).                                                                | none — prose only; Nx enforce-module-boundaries is project-level/blind to same-project imports, so it can't catch a colocated handler+infra. No machine check exists today; checklist item 302 still [ ].                                                          | DACI:243                                                                                                                                                                     |
| H2                      | Handler (runtime) lives in apps/ with tag type:app; may import @aws-sdk/_and @core/_; never @pulumi/\*.                                                                                                                 | tag type:app is a layout convention (no Nx enforce-module-boundaries tag rule wired yet); handler↛@pulumi ban is a separate dependency-cruiser rule not yet enforced (see H8). Checklist 302/303 [ ].                                                              | DACI:252                                                                                                                                                                     |
| H3                      | IaC (deploy-time) lives in infra/ (or one shared infra) with tag type:infra; imports @pulumi/\*; never domain source.                                                                                                   | type:infra layout is convention (no Nx tag-boundary rule wired); infra↛source ban is a depcruise rule not yet enforced (see H9). Checklist 302/303 [ ].                                                                                                            | DACI:253                                                                                                                                                                     |
| H4                      | Infra references the handler BUILD OUTPUT via FileArchive(apps//dist), never its source — so @pulumi never enters the Lambda bundle.                                                                                    | none — prose only; the dist-path string in FileArchive is invisible to Nx static analysis and to depcruise. No check verifies infra points at /dist not /src. Checklist 302 [ ].                                                                                   | DACI:255                                                                                                                                                                     |
| H5                      | Each apps/ sets targets.build.options.outputPath='dist'; apps/ and infra/ must be siblings under same parent so ../../apps//dist resolves.                                                                              | none — prose only; AGENTS.md documents it and Nx generators are meant to emit it, but no machine check asserts outputPath='dist' or the sibling layout. Checklist 302 [ ].                                                                                         | DACI:259                                                                                                                                                                     |
| H6                      | Wire the Nx graph the dist-link hides: infra/ sets implicitDependencies:[''] and deploy.dependsOn the handler build target.                                                                                             | none — prose only; correct wiring makes deploy build the handler first, but no lint/CI asserts the implicitDependencies/dependsOn edges exist. Checklist 302 [ ].                                                                                                  | DACI:260                                                                                                                                                                     |
| H7                      | dependency-cruiser owns the file/package-level bans Nx can't see; keep BOTH Nx boundaries and depcruise (this is why the DACI keeps depcruise).                                                                         | depcheck (depcruise) runs in CI and enforces hexagonal DIRECTION + no-circular as ERROR today, but the 4 file-level bans below (H8-H11) are NOT yet in the config. Checklist 303 [ ].                                                                              | DACI:266                                                                                                                                                                     |
| H8                      | depcruise rule: handler ↛ @pulumi/\* — from ^apps/[^/]+/src to @pulumi/, severity error.                                                                                                                                | none — prose only; not in current dependency-cruiser config (which enforces only hexagonal direction + no-circular). This exact rule is checklist item 303, still [ ].                                                                                             | DACI:268                                                                                                                                                                     |
| H9                      | depcruise rule: infra ↛ apps/libs source — from ^infra/ to ^(apps                                                                                                                                                       | libs)/, severity error.                                                                                                                                                                                                                                            | none — prose only; not in current depcruise config. Part of checklist item 303 [ ]. Enforces 'infra references dist, not source' at the import level.                        | DACI:269 |
| H10                     | depcruise rule: core ↛ @aws-sdk/\* — from ^libs/core/ to @aws-sdk/, severity error.                                                                                                                                     | none — prose only; the ESLint no-restricted-imports core rule blocks core→aws-sdk at lint level, but this depcruise file-level twin is NOT yet in the depcruise config. Checklist 303 [ ].                                                                         | DACI:270                                                                                                                                                                     |
| H11                     | depcruise rule: adapters ↛ apps/infra source — from ^libs/adapters/ to ^(apps                                                                                                                                           | infra)/, severity error (adapters are horizontal).                                                                                                                                                                                                                 | none — prose only; not in current depcruise config. Part of checklist 303 [ ]. Adapters MAY import @aws-sdk/_and @core/_ (no rule needed); only apps/infra source is banned. | DACI:271 |
| F1-danger               | DangerJS rule prompts the 3-bucket classification on each isolatedDeclarations CI failure (comment with buckets + 'which bucket?') so logging happens at PR time.                                                       | none — DangerJS not yet wired. Checklist [ ] Step 4 'Wire DangerJS bucket-classification prompt'.                                                                                                                                                                  | DACI:356                                                                                                                                                                     |
| F1-antigame             | Anti-self-grading: bucket(3) requires non-trivial line-ref citation (DangerJS rejects without); Approver co-signs bucket(3) at PR#5; 30% blind re-classification audit.                                                 | line-ref-required check is DangerJS-enforceable (not built); co-sign + blind audit are human process. Not enforced today.                                                                                                                                          | DACI:357                                                                                                                                                                     |
| F2-colocate             | Tests stay co-located (NO **tests**/ convention); port fakes co-locate as \*.fake.ts or in small test-utils package (refines L5).                                                                                       | none — no lint enforces co-location; depcruise no-orphans currently WHITELISTS **tests**/ (opposite of this rule).                                                                                                                                                 | DACI:361                                                                                                                                                                     |
| F2-noship               | _.test._ / _.stories._ / \*.fake.ts files never ship — excluded from build + bundle output (refines L5).                                                                                                                | none — build is a stub for infra; no bundle-exclusion check runs. size-limit (catches leakage) not yet wired.                                                                                                                                                      | DACI:361                                                                                                                                                                     |
| F3-floors               | Quality floors live in committed tooling/floors.json (per metric x per Nx project); PRs fail if coverage/mutation/type-cov drops below committed floor; start low, ratchet up (refines L5).                             | none — coverage ratchet / floors.json read-only check not built. Checklist [ ] Step 1 start floors.                                                                                                                                                                | DACI:362                                                                                                                                                                     |
| F3-updatejob            | update-floors job (contents:write, push:master only) bumps floors up + commits; constrained to workflow_dispatch OR push:master, never pull_request\*, gated by Actions environment with required reviewer.             | none — workflow not built. Checklist [ ] Step 4 'Constrain update-floors job'. floors.json intentionally NOT CODEOWNERS-protected (solo self-approval block).                                                                                                      | DACI:362                                                                                                                                                                     |
| F3-noescape             | Add 'no escape hatches' ESLint set: ban/limit eslint-disable (require reason), @ts-ignore/@ts-nocheck, /_istanbul ignore _/ — stops agents disabling past a gate.                                                       | none — only custom ESLint rule today is core/\*\* no-restricted-imports. Checklist [ ] Step 4 'Add no escape hatches ESLint rule set'.                                                                                                                             | DACI:362                                                                                                                                                                     |
| F3-danger-floor         | DangerJS rule fails any PR modifying BOTH tooling/floors.json AND test files in same diff (closes 'delete tests + lower floor together' attack).                                                                        | none — DangerJS not wired. Checklist [ ] Step 4 'Add DangerJS rule' for floors+tests.                                                                                                                                                                              | DACI:362                                                                                                                                                                     |
| F3-codeowners           | Enforcement-rule files (dangerfile + rule modules, probes/\*_, drift-check/update-floors workflows, CODEOWNERS, eslint.config._, dependency-cruiser.cjs) are CODEOWNERS-protected against same-PR rule-deletion attack. | none — no CODEOWNERS-by-layer in CI today. Checklist [ ] Step 3 'Add CODEOWNERS coverage for enforcement-rule files'.                                                                                                                                              | DACI:364                                                                                                                                                                     |
| F3-metarule             | DangerJS meta-rule: any PR modifying a CODEOWNERS-protected enforcement file must be enforcement-only (no source/test in same diff) — forces rule changes into isolated PRs.                                            | none — DangerJS not wired. Checklist [ ] Step 3 'Add DangerJS enforcement-file meta-rule'.                                                                                                                                                                         | DACI:364                                                                                                                                                                     |
| F4-nxsync               | TS project references are Nx-managed via nx sync (CI runs nx sync --check, free/Nx-core); never hand-edit references arrays; enable via nx.json sync-generators; AGENTS.md documents it (refines L4).                   | nx sync --check would be machine-enforced in CI but is not listed among required-CI checks today; tsc -b consumes references. 'never hand-edit' is prose.                                                                                                          | DACI:365                                                                                                                                                                     |
| M1-relocate             | DangerJS test-relocation opt-out label: refactor:test-relocation.                                                                                                                                                       | none — DangerJS deleted-test/relocation rule not built (listed gap).                                                                                                                                                                                               | DACI:370                                                                                                                                                                     |
| M2-typecov              | Per-Nx-project type-coverage floors; infra (type:infra) uses lower floor (~90%) due to Pulumi Output; others ~95% and ratchet together.                                                                                 | none — type-coverage floor not enforced (listed gap). Checklist [ ] Step 1 set floors low.                                                                                                                                                                         | DACI:370                                                                                                                                                                     |
| M4-prettier             | Add eslint-config-prettier (disable ESLint rules conflicting with Prettier).                                                                                                                                            | ✅ **done (NH-243):** `eslint-config-prettier/flat` added last in shared base; one root `prettier.config.mjs` at printWidth 100 (supersedes NH-43).                                                                                                                | DACI:370                                                                                                                                                                     |
| M5-nvmrc                | .nvmrc Node version = Lambda runtime (esbuild target match).                                                                                                                                                            | none — .nvmrc/packageManager pin listed as gap. Checklist [ ] Step 8 add .nvmrc. (Note Wave-1 re-decision moved CI to Node 24.)                                                                                                                                    | DACI:370                                                                                                                                                                     |
| M6-sizelimit            | Per-Lambda size-limit budget on dist (catches Pulumi leaking into the bundle).                                                                                                                                          | none — size-limit not wired (listed gap). Checklist [ ] Step 8 add size-limit budget.                                                                                                                                                                              | DACI:370                                                                                                                                                                     |
