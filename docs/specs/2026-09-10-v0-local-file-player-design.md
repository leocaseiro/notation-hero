---
lap: 4
last_applied: P1
---

# v0 — local-file drum player

|                   |                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Date**          | 2026-09-10                                                                                                         |
| **Status**        | 🟢 draft — awaiting review                                                                                         |
| **Epic**          | [NH-291](https://leocaseiro.atlassian.net/browse/NH-291)                                                           |
| **Spike**         | [NH-292](https://leocaseiro.atlassian.net/browse/NH-292)                                                           |
| **Findings**      | [`docs/spikes/2026-09-10-alphatab-in-nextjs-app-router.md`](../spikes/2026-09-10-alphatab-in-nextjs-app-router.md) |
| **Design mockup** | [`docs/mockups/player-flatrow-teal.html`](../mockups/player-flatrow-teal.html) (PR #23)                            |

## 1. Goal

Ship the first thing that makes a sound. Open a drum chart from your own disk, see it as standard
notation, press play, hear it.

This is deliberately the smallest complete product, not the smallest technical slice. It is a thing
a drummer can use, not a demo.

## 2. Non-goals

Named explicitly so they do not creep in:

- **No authentication, no backend, no database.** `server/`, `infra/`, Neon and Cognito stay dormant.
- **No scoring, no Web MIDI input, no feedback rings.** That is v0.2.
- **No settings search.** v0 ships the settings themselves in a popover; the search index, the
  category tabs and the breadcrumb results are v0.1.
- **No catalog.** Nothing to browse — you bring the file.
- **No PWA.** v0 is a plain web page: no install prompt, no offline mode. Both belong to a later
  milestone (§10).
- **No raw MIDI (`.mid`) files.** AlphaTab has no MIDI importer, so MIDI needs its own path.
- **No recent-files list.** You pick a file each time; v0 keeps no history.
- The mockup's **scoring HUD** and **practice/game rail** render hidden, because both need scoring. The
  header's **MIDI status icon** is hidden too: no Web MIDI until v0.2. The **Settings gear** opens the
  settings popover, and the rail's **Open file** button stays — only the practice/game toggle is
  hidden. The header pill's **Auto-Speed** toggle is v0.2 as well: it is a practice feature
  (`player-app-ui.md` files "auto-speed target+step" under Practice settings), so it needs the
  scoring work. Its BPM stepper stays — that is the tempo control (§7).

## 3. Decisions

All approved by leocaseiro on 2026-09-10.

| #   | Decision                                                                                     | Rationale                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Stay in the existing repo; ship in `web/`                                                    | The design system is wired in (only `Button` is exported so far; see §7); Vercel is already configured; zero migration cost. A new repo would cost days before any product code.                                                                                            |
| D2  | v0 is **player only**                                                                        | AlphaTab provides render, playback, cursor, tempo and track mixing nearly for free. Days, not months.                                                                                                                                                                       |
| D3  | The design system is **pulled by the screen**                                                | Building components first is what produced 41 components and no product. The player decides what gets built.                                                                                                                                                                |
| D4  | **Port** the `rhythm-game` prototype's patterns, clean-room, rather than only referencing it | The integration was already solved once; zero API breakage 1.8.1 → 1.8.4 made the port clean. Clean-room: the MPL-2.0 fork stays open for reference only and no files are copied, per the [2026-06-18 licensing spike](../spikes/2026-06-18-file-formats-and-licensing.md). |
| D5  | AlphaTab delivery: **self-hosted ESM** from `public/`                                        | Verified end-to-end in a production build. Native module workers, keeps Turbopack, ships AlphaTab once (~273 KB gzip) instead of twice.                                                                                                                                     |
| D6  | The spike branch **seeds** the player                                                        | `spike/alphatab-nextjs-poc` already proves the mount, asset wiring and config. Rebuilding would re-solve solved work.                                                                                                                                                       |
| D7  | Safari and iPad verification happens **after v0 ships**                                      | Desktop Chrome is the v0 gate. iPad and Android get a manual check that does not block v0. Recorded as a known untested surface, not ignored.                                                                                                                               |

> **On D5:** option A (the `@coderline/alphatab-webpack` plugin, as the prototype used) was
> considered and rejected. Note that the prototype's exact import path is dead in 1.8.4 regardless —
> the `@coderline/alphatab/webpack` subpath still appears in the `exports` map but `dist/webpack`
> does not exist; those plugins moved to separate packages.

## 4. Architecture

Two routes, one package. Nothing leaves the device.

| Route   | Purpose                                        |
| ------- | ---------------------------------------------- |
| `/`     | Landing — a Play button that opens the player  |
| `/play` | The player; files are opened and replaced here |

**Screen target:** tablet landscape, per [`player-app-ui.md`](../player-app-ui.md) (44 px minimum
touch targets). Desktop uses the same layout.

**The mockup does not meet that 44 px rule and v0 must.** Nothing in
[`player-flatrow-teal.html`](../mockups/player-flatrow-teal.html) uses 44 px: the header pill's ±
buttons carry no size class at all, so their hit area is just the glyph, and eleven footer transport
buttons are `w-10 h-10` (40 px). Only the Play button and its neighbour, at `w-12 h-12`, pass. v0
pads every control's hit area to at least 44 px while keeping the glyphs at their drawn size, and the
mockup should be updated to match rather than copied literally.

**Where the file is opened:** in the player, the same shape the prototype uses. `/` is a landing with
a **Play** button that opens `/play`; the player owns the file picker and drag-and-drop. Opening
another file replaces the loaded one in place, with no navigation, so the `ArrayBuffer` never has to
cross routes and the chart itself is never written to disk (settings are the one thing v0 persists —
see §7).

**Replacing a loaded chart asks first.** The flow is: `/` → press **Play** → `/play` → pick or drop a
file → it loads (a parse error raises a toast). From then on the file can be replaced at any time,
and replacing prompts for confirmation. v0 uses the browser's native `window.confirm()` — a
deliberate shortcut, since no `Dialog` component is built; a styled confirm can replace it later.
**Playback pauses before the prompt** — `window.confirm()` freezes clicks and keystrokes but not Web
Audio, so without that the drum track would keep sounding, uncontrollably, behind the dialog.
**Cancel** keeps the current chart and discards the new file. **Confirm** stages the load: AlphaTab's
`ScoreLoader` parses the new buffer first, and only on success does the live `AlphaTabApi` take the
new score via `renderScore(...)` — nothing is destroyed, the workers and the loaded soundfont are
reused, and disposal stays tied to unmount (§"Mounting AlphaTab"). A corrupt replacement therefore
leaves the playing chart intact.

**Reset the input's `value` to `''` at the end of every change handler** — cancel, parse failure and
success alike. A file input fires no `change` event when its value is unchanged, so without the reset
a user who cancels and then re-picks the _same_ file gets nothing, and the natural retry after a
failed parse is dead too. Every step runs client-side, as in the prototype.

**Accepted files** (same as the prototype): the picker's `accept` is
`.gp,.gp3,.gp4,.gp5,.gpx,.musicxml,.mxml,.xml,.capx` (Guitar Pro, MusicXML and Capella; extensions
only). On iOS the picker is a `<label>` tied to a hidden file input, so the filter still applies.
Drag-and-drop takes one file with no filter; a file AlphaTab cannot parse gets the "unsupported
file" toast (see Failure states).

### Data flow

```text
/ (landing) → press Play → /play (the player, no file yet)
  → open a file there: picker or drag-and-drop
  → ArrayBuffer (in memory)
  → wrap as Uint8Array, then alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes)
  → pick the drum tracks (any staff with isPercussion)
  → none found? fall back to AlphaTab's default track
  → api.renderScore(score, drumTracks.length ? drumTracks : undefined)
  → SVG notation + AlphaSynth playback (all tracks) + synced cursor
```

Where a drum staff exists, only the drum tracks render; every track stays in playback, so per-track
mute/solo works. The prototype always renders track 0 (its to-do list says "always go to drum"), so
this rule is new. v0 tests include a multi-track chart whose drums are not track 0.

**No drum staff is not an error.** Drums are v0's default, not its requirement: the app is aimed at
drummers but must not turn any other musician away. A file with no percussion staff falls back to
AlphaTab's default track, which is what an omitted `trackIndexes` argument already does — so a
guitar or piano chart opens and plays instead of showing a dead end.

No upload, no network call for user content. The only network traffic is the static engine assets.

### Failure states

| Case                          | Behavior                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unsupported or corrupt file   | Sonner toast; stay on `/play`. A chart already playing is never cleared by a failed load                                                                                                                                                                                                       |
| `/play` open with no file yet | Empty state: a large **Open file** control plus a secondary **Load the sample beat** action, drag-and-drop anywhere on the surface, transport disabled                                                                                                                                         |
| Engine import fails           | An error message in place of the disabled Play button. `api.error` cannot see this: the dynamic import rejects before `AlphaTabApi` exists, so the mount component's own `try`/`catch` around the import sets the state — the spike's bare `void (async () => …)()` has none and must gain one |
| SoundFont download fails      | The same message, raised through AlphaTab's `error` event                                                                                                                                                                                                                                      |

**While it loads (first visit):** about 1.6 MB of engine, soundfont and font arrives. Two
affordances, each covering a different part of that wait:

- `Skeleton` over the notation area covers the **engine import and the music font** — the AlphaTab
  ESM (273 KB gzip) and Bravura (306 KB). Neither is observable through AlphaTab, because
  `AlphaTabApi` does not exist until the dynamic import resolves.
- The **Material Symbols face (727 KB) has no loading affordance** — the largest single asset in the
  budget. It arrives through the design system's own global `@import` in `client/src/styles.css` and
  styles the header gear, the transport buttons and the Open-file control, all of which sit outside
  the notation area the `Skeleton` covers. Its symptom is unstyled icon glyphs in the chrome, not a
  blank notation area, so say so rather than implying it is covered.
- The progress indicator driven by `soundFontLoad` (`loaded / total`, as the prototype does) covers
  the **soundfont only** — 302 KB gzip of that ~1.6 MB. It is not a whole-payload bar, so do not
  frame it as one: it can only start once the engine has already downloaded.

Play stays disabled until the synth is ready.

**While a replacement chart parses:** the chart on screen keeps playing (the load is staged, §4
above), so nothing covers the notation area. Instead a `toast.loading()` through the built `Sonner`
names the incoming file, then resolves into success or into the same "unsupported file" error toast
the Failure states table already specifies — so loading, success and failure share one surface.
Sonner ships its own spinner, so this needs no new component; the design system has no `Spinner`,
`Loader` or `Progress`, and `Skeleton` would hide a chart that is still playable.

### Mounting AlphaTab

A single `'use client'` component owns the `AlphaTabApi` instance in a `useRef`, and disposes it on
unmount. Verified against React 19 strict mode on variant A (the rejected webpack build), which
mounts synchronously: mounts equal disposes across remounts, surfaces never exceed one, DOM is
empty after unmount.

D5's mount adds an `await import()` before the API exists, so the effect must re-check a `disposed`
flag after every await before it constructs or loads. Otherwise an unmount inside that window leaks
a live `AlphaTabApi` and its workers. The spike's ESM component already does this; re-run the
remount probe against that component and assert the surface count never goes above one.

**Do not use `dynamic(..., { ssr: false })`.** It is illegal in an App Router Server Component and
unnecessary — AlphaTab's module scope is SSR-safe and the spike route renders as static
output at build time.

Use `useRef`, not the prototype's `React.createRef()` in a render body, which creates a fresh ref on
every render.

## 5. AlphaTab integration (D5 — self-hosted ESM)

AlphaTab spawns a render worker and an audio worklet, and locates them from `import.meta.url`.
Turbopack does not leave that usable in a production chunk, so worker construction fails. Self-hosting
the prebuilt ESM outside the bundle restores a real http URL, which makes `Environment.webPlatform`
report `BrowserModule` and gives native module workers.

```ts
const ALPHATAB_ESM_URL = '/alphatab/esm/alphaTab.mjs';
const alphaTab = (await import(/* turbopackIgnore: true */ ALPHATAB_ESM_URL)) as typeof AlphaTab;
```

**Three requirements that are easy to get wrong:**

1. **The specifier must be a variable, not a string literal.** A literal makes `tsc` resolve it at
   compile time and fail the build. Holding it in a `const` also stops Turbopack re-bundling it.
2. **Minified files must be placed under the plain names.** `alphaTab.min.mjs` imports
   `./alphaTab.core.mjs` internally, so a minified copy stored under a `.min` name causes the browser
   to fetch the full 3.0 MB core instead of the minified one.
3. **Import `@coderline/alphatab` only with `import type`.** One value import, even of an enum,
   makes Turbopack bundle the library again: AlphaTab ships twice, and a component can drive the
   bundled copy, which restores the silent playback failure. **v0 builds this guard:**
   `web/eslint.config.mjs` today carries only the core `no-restricted-imports` rule with the `@/*`
   group, so replace it with `@typescript-eslint/no-restricted-imports` holding both that `@/*`
   group and a new `@coderline/alphatab` group with `allowTypeImports: true` — the extension rule
   requires the core rule to be off.

   **So the awaited namespace object is the only runtime source of AlphaTab values** — enums
   (`LayoutMode`, `ScrollMode`, `PlayerMode`, `TrackNamePolicy`), `importer.ScoreLoader` (nested
   under `importer`, and its `loadScoreFromBytes` takes a `Uint8Array` — so wrap the `ArrayBuffer`
   first), `model.Color`, `model.Font`. No module-scope constant may reference one, because that needs the value import
   this rule forbids. The mount component therefore shares its loaded instance through a React
   context **scoped to `web/` consumers** — itself, Open-file and the popover composition. It cannot
   reach into `client/`: the dependency edge runs one way, so a context created in `web/` is
   invisible there. The `client/` rows instead receive their enum options and accessors as props
   (§7), which is what keeps them gated on real markup. The spike component already works
   this way (`LogLevel`, `PlayerMode`, `ScrollMode`, `synth.PlayerState`); the prototype's settings
   panel does not, since it uses `import * as alphaTab`, so this is the one place the port diverges
   from its source.

Vendoring runs before both `next dev` and `next build` (a pre-step of the `dev` and `build` scripts),
so it is never a manual chore and a fresh clone works in dev too. `web/public/alphatab/` is generated
output: git-ignored and never committed (the spike's committed copies are removed). The copy step:

```sh
cp dist/alphaTab.min.mjs         public/alphatab/esm/alphaTab.mjs
cp dist/alphaTab.core.min.mjs    public/alphatab/esm/alphaTab.core.mjs
cp dist/alphaTab.worker.min.mjs  public/alphatab/esm/alphaTab.worker.mjs
cp dist/alphaTab.worklet.min.mjs public/alphatab/esm/alphaTab.worklet.mjs
```

Plus `dist/soundfont/sonivox.sf3` and `dist/font/Bravura.woff2`, each with its license file
(`dist/soundfont/LICENSE`, `dist/font/Bravura-OFL.txt`) copied next to it.

### Regression test — the silent failure

Without the fix, **notation still renders** on a main-thread fallback and only **playback** dies.
The page looks correct until you press play. v0 must carry a test that asserts the worker path is
live, not just that notation appeared.

**The test:** Playwright in `web/`, with a config mirroring `client/playwright.e2e.config.ts` whose
web server runs `next build` then `next start`. With `core.logLevel` at `Debug` it asserts four
things: that AlphaTab logs `Platform: BrowserModule` (emitted by `Environment.printEnvironmentInfo`,
which reads `Environment.webPlatform` — so the log is the test hook and no debug DOM attribute is
needed), that **no** `Failed to create worker for synthesizing audio` console error appears, that the
browser requests `/alphatab/esm/alphaTab.worklet.mjs` at some point, and that the playback position
advances after Play. A `web` step joins the CI `e2e` job, so it blocks merge like the other browser
jobs.

**Why those two log assertions and not the obvious one.** `Will use webworkers … with worklets for
playback` looks like the natural check and is useless as one: `createWorkerPlayer` emits it whenever
`window.isSecureContext && 'AudioWorkletNode' in window && player.outputMode ===
WebAudioAudioWorklets`, never consulting `Environment.webPlatform`. In the exact regression D5 guards
against, that line still logs and the failure surfaces on the next line as the worker-construction
error. The `ScriptProcessor` variant of the line is a different fallback — no `AudioWorkletNode`, or
an insecure context — and still plays audio, so the two are not halves of a discriminator.

The same lane carries v0's **accessibility check for `web/`** (§7): an axe-core run over `/` and
`/play` in five states — empty, loaded, with each popover open, during the first-visit `Skeleton`,
and while the replacement `toast.loading()` is up. The last two matter because this is the only a11y
gate `web/` gets, and whether Sonner's loading toast is announced to assistive tech is exactly the
kind of thing that otherwise ships unchecked. Four setup notes, since `web/` has no test lane today:
`@playwright/test` and `@axe-core/playwright` must both be added at `client/`'s exact ranges
(`@axe-core/playwright` is `^4.12.1` there, and root `syncpack` enforces cross-package version
consistency, so a drifting range fails the `quality` job), the job needs its own
`playwright install --with-deps chromium` step, and the script must **not** be called `test` — the `quality` job runs
`pnpm -r --if-present run test` with no browsers installed. Add `web/playwright-report/` and
`web/test-results/` to the `e2e` job's upload paths when the lane lands. A fourth note for the
replace flow: the lane must register a `page.on('dialog', …)` handler **before** any action that
replaces a loaded chart — accepting for the confirm path, dismissing for the cancel path — because
Playwright auto-dismisses `window.confirm()` when no listener is attached, which would silently turn
every replace test into a cancel test.

**Charts the lane uses.** Test fixtures live in `web/e2e/fixtures/` — outside `public/`, so they are
never served — aiming at one chart per accepted extension, because the picker's `accept` list is a
promise the tests should keep. **Covered today: `.gp`, `.gp5` and `.gpx` only** — three of the nine.
`ScoreLoader` sniffs file _content_, not the extension, so naming a fixture `.musicxml` proves
nothing about MusicXML: it would load through whichever importer the bytes call for and the lane
would go green having tested nothing. `1-beat.xml` is kept as exactly that case — a Guitar Pro 5
binary under an XML extension, a useful check that content-sniffing works and **not** MusicXML
coverage. Six extensions are still unverified (Q6).
The one chart that ships is the sample, `web/public/charts/1-beat.gp`. **It is a single drum track**
— and so is every other chart in the repo today, verified by parsing each one with the vendored
1.8.4. So §4's required test, "a multi-track chart whose drums are not track 0", has nothing to run
against, and neither does the no-percussion fallback. Both fixtures still have to be produced (Q7).

One more thing the assertions must not assume: the worklet module is fetched **lazily** — the
`audioWorklet.addModule` call sits behind a `BrowserModule` guard inside a factory callback, not at
init — so no assertion may require that request to arrive before playback starts.

## 6. Payload budget

| Asset                    | Raw     | gzip   | Notes                                                                    |
| ------------------------ | ------- | ------ | ------------------------------------------------------------------------ |
| `soundfont/sonivox.sf3`  | 954 KB  | 302 KB | AlphaTab's own — **not** the prototype's 3.9 MB `.sf2`                   |
| `font/Bravura.woff2`     | 306 KB  | 305 KB | the only font fetched; skip the `.otf` and `.woff`                       |
| AlphaTab library         | 1092 KB | 273 KB | shipped once under D5                                                    |
| Material Symbols icons   | 727 KB  | 727 KB | woff2, no further compression; pulled in by the design-system stylesheet |
| Next.js app JS + CSS     | —       | —      | not measured yet                                                         |
| Sample chart `1-beat.gp` | 16 KB   | —      | the one chart that ships; part of first load                             |
| A user's own chart       | ~3 KB   | —      | per-song marginal cost, nothing downloaded                               |

**First-load engine payload ≈ 1.6 MB compressed, before Next.js JS and CSS.** The engine is a one-time cost
and per-chart cost is trivial, so caching many charts is cheap. Install and offline are out of v0 (§2); this budget is the input
for that later milestone.

**Open cost item:** `next start` served the `.sf3` uncompressed. It gzips to 302 KB, and to
277 KB with Brotli. Whether Vercel's CDN compresses an unknown MIME type needs checking — it is the
biggest compression win on the route; the icon font is bigger but cannot be compressed further.

## 7. Component plan (D3 — pulled by the screen)

**Already built:** `PlayButton`, `Bpm`, `Button`, `Tooltip`, `Popover`, `Sheet`, `RangeSlider`,
`Separator`, `Sonner`, `DropdownMenu`, `ScrollArea`, `Skeleton`, `Tabs`, `Field`, `SearchInput`,
`Checkbox`, `NativeSelect`, `Input`.

**Prerequisite:** only `Button` is exported to `web/` today (`client/src/index.ts`). Before the
player uses a component, export it from that barrel, add `'use client'` to its file, and re-run the
client checks plus the Storybook VR and a11y gates. The design-system rename stays in Phase 2.

**To build for v0:** the transport row layout, a **playback scrubber** (current time, seek bar, total
time), the notation-surface wrapper, the landing **Play** button, the player's **Open file** control
and its secondary **Load the sample beat** action, the **Settings** and **Tracks** popovers (below),
the soundfont **progress bar** (§4)
(picker plus drag-and-drop, replacing the loaded chart in place), the transport row's **Loop**,
**Metronome** and **Count-In** toggles (AlphaTab's `isLooping`, `metronomeVolume` and
`countInVolume`, as the prototype does), and the header's **tempo control**
(BPM = chart tempo × `playbackSpeed`, ±5 buttons, and the percentage shown only while adjusting —
the shape [`player-app-ui.md`](../player-app-ui.md) describes). `Bpm` is display-only, so the tempo
control is new. **The 12.5–200% slider lives in the Settings popover's Player group**, not in the
header pill: neither design source draws a slider there, and "two popovers, not modals" leaves no
third surface for one. 12.5% is AlphaTab's documented `playbackSpeed` floor.

**Tempo sits in the header, not the transport row** — the pill block the mockup draws there, and what
[`player-app-ui.md`](../player-app-ui.md) calls the BPM control ("`– 120 +` stepper; `%` shown only
while adjusting"). Both design documents place it in the header, so the player has exactly one tempo
control and the transport row has none.

**Which package each item lands in**, because that decides whether it is gated. The `a11y` and `vr`
CI jobs both run `pnpm --filter @notation-hero/client`, so only `client/` is covered by them today.

| Package   | Items                                                                                                                                                                           | Gated by                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `client/` | playback scrubber, tempo control, Loop / Metronome / Count-In toggles, settings + tracks rows, soundfont progress bar, `Accordion`, `Slider`                                    | Storybook story + VR + a11y (block merge) |
| `web/`    | transport row layout, notation-surface wrapper, landing **Play** button, **Open file** control, the settings group/accessor schema and the AlphaTab React context that feeds it | the `web` Playwright lane (§5)            |

The split is by reusability: a control that any screen could use belongs in the design system, while
composition that knows about AlphaTab's API belongs in the player.

**Every `client/` item is presentation-only** — `value` in, `onChange` out, option lists passed as
plain arrays — and imports nothing from `@coderline/alphatab`. That is not a style preference: it is
what makes the gate real. `client/` has no AlphaTab dependency, and a `client/` Storybook story has
no engine instance to provide, so a row that read its options off the library would be gated while
rendering fabricated options. Keeping the controls AlphaTab-free means the VR and a11y baselines
exercise the component a user will actually see. The schema of accessors, and the React context
carrying the loaded namespace, therefore live in `web/` (§5) where the instance exists. Because `web/` has no Storybook
and no axe job, **v0 adds an accessibility check to the `web` Playwright lane** it is already
building for the worklet test (§5) — otherwise the product's own UI would be the only ungated
surface in the repo while 18 design-system components are gated.

**Two popovers, not modals** — neither blocks the player:

- **Settings** (the header gear): accordion sections carrying the prototype's full settings set —
  Display ▸ General, Colors, Fonts, Paddings, Notation, Player, Stylesheet, Tools. Colors are plain
  text inputs for now; a color-picker row can replace them in a later release.
- **Tracks** (the transport's "Tracks / mixer" button): one row for **every track in the score**,
  not only the rendered drum staves — the prototype maps `score.tracks`, and every track stays
  audible (§4), so all of them are controllable. Each row carries solo, mute and volume; solo is not
  exclusive, as in AlphaTab and the prototype. Volume is applied as a **ratio** against the track's
  current value (`changeTrackVolume([track], next / track.playbackInfo.volume)`), which is how the
  prototype does it — not as an absolute.

  The row carries the prototype's **full** control set, not a subset: a **render-select** checkbox
  (`api.renderTracks(...)`, so the user can change which tracks are drawn, not only which are
  audible), **solo**, **mute**, **volume**, the four per-staff display toggles (standard notation,
  tablature, slash, numbered — all four exist on `Staff` in the pinned 1.8.4) and **transposition**
  (`changeTrackTranspositionPitch` then `updateSettings()` + `render()`). Drums may hide the
  tablature toggle; every other instrument gets all of them.

Both popovers' rows **compose controls that already exist** — `Checkbox` (toggle), `Input` (text and
number), `NativeSelect` (dropdown) and the new `Slider` — with `Field`'s `horizontal` orientation
giving the label-left / control-right layout. None of those is new work. What _is_ new is the schema
of groups with an accessor per row, so a value edited in two places (the tempo control and the Player
group, for example) stays in sync. The prototype does exactly this.

**Settings values persist.** v0 writes them as JSON under a single `localStorage` key and restores
them on load, which answers the storage question the v0.1 design left open (its S4). Chart files and
playback history are never stored — the no-recent-files rule is about charts, not preferences.

**A bad stored value must never break the player.** Wrap the read in `try`/`catch` and fall back to
the shipped defaults whenever the value is missing, is not valid JSON, or fails a basic shape check.
This is not a hypothetical: §10 layers v0.1's search and tabs over these same settings, so the stored
shape changes soon after v0 ships, and an uncaught `JSON.parse` during the restore step would stop
the player mounting at all — the one thing v0 exists to do.

**Three** new design-system components: `Accordion`, a single-value `Slider`, and a determinate
**progress bar** for the soundfont download (§4). `RangeSlider` is dual-thumb only
(`value: [number, number]`), so it cannot serve the scrubber, the tempo slider, per-track volume or
the settings slider rows, and the design system has no `Progress`, `Spinner` or `Loader` at all.
`Popover` is already built; `Dialog` and `Tabs` are not needed for v0 (the replace confirmation uses
native `window.confirm()`). Each new component needs a Storybook story plus the VR and a11y baselines
that block merge, and each can land as its own small PR.

**Deferred:** the mockup's **A/B loop markers** on the scrubber. v0 uses AlphaTab's native range
selection instead: select bars in the notation, and the transport's **Loop** toggle flips
`isLooping`. No custom marker UI and no marker/selection sync are planned. v0 ships a plain seek bar.

**A–B range repeat is desktop-only in v0.** AlphaTab builds that selection from `mousedown` /
`mousemove` / `mouseup` on the canvas and gates it on the left mouse button; it registers no
`touchstart` or `pointerdown`, so on a touch screen a drag across bars scrolls instead of selecting.
The **Loop** toggle itself works everywhere — only setting a bar range is mouse-bound. This
supersedes [`player-app-ui.md`](../player-app-ui.md) D‑5 ("Tap-set A/B, drag to adjust") until the
marker work lands, and it is why A–B is not in the acceptance set.

## 8. Success criteria

v0 is done when, on a deployed Vercel URL:

1. A `.gp5` drum chart opened from local disk renders as standard drum notation.
2. Pressing play produces **audible** drum audio with a cursor that tracks it.
3. Tempo and per-track mute/solo work.
4. leocaseiro loads **his own** chart and it plays.
5. Loop, Metronome and Count-In each audibly change playback.
6. The scrubber seeks and the cursor follows.
7. The Settings popover's rows change the rendered score, and the Tracks popover lists **every**
   track in the score with solo / mute / volume rows that change the audible mix.
8. From a clean `/play` with no file, **Load the sample beat** fetches and plays the bundled chart.
9. A chart with no percussion staff opens and plays on AlphaTab's default track.

The criteria are checked in desktop Chrome. iPad and Android get a manual check too; it does not
block v0. Criterion 2 is called out deliberately — see the open questions. Criteria 5–9 exist because §7
commits to more than the four things the original criteria covered: without them v0 could be called
done with the transport toggles, the seek bar, both popovers, the sample-load action or the
no-percussion fallback broken. A–B bar-range repeat is deliberately absent — it is AlphaTab's own
behaviour and desktop-only (§7).

## 9. Open questions and known gaps

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | When it matters     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Q1  | **Nobody has heard the audio.** The spike verified playback by state (position advancing, cursor moving), not by ear — headless Chromium is silent. Timing accuracy and latency are untested.                                                                                                                                                                                                                                                                                                                                                                                      | v0 acceptance       |
| Q2  | **Split by when it can bite.** The MIME types Vercel serves for `public/alphatab/esm/*.mjs` are D5's one unverified premise, and §5's variable specifier, plain-name copy step, type-only guard, context sharing and regression test all hang off D5 — so check it **before** the player is built on it, by deploying the existing `/spike/esm` route. Reversing to variant A afterwards would touch the mount component, the vendoring step, the eslint guard and §6. CDN compression for `.sf3` is a cost question, not a correctness one, and can wait for the v0 deploy.       | v0 deploy           |
| Q3  | The ESM variant's audio worklet was never observed being fetched, though playback worked. That was an instrumentation gap, not evidence: `web/spike-probe.mjs` only records `requestfailed` and `status() >= 400`, so it never logged a successful request. The §5 test now asserts the worklet request and the debug line.                                                                                                                                                                                                                                                        | v0 acceptance       |
| Q4  | Safari, Firefox, iPad, Android — all untested. Safari's `AudioWorklet` and module-worker support is the named risk, and module workers are exactly what D5 depends on.                                                                                                                                                                                                                                                                                                                                                                                                             | after v0 ships (D7) |
| Q5  | Drum **tablature** is implemented upstream ([alphaTab PR #2591](https://github.com/CoderLine/alphaTab/pull/2591)), so it no longer needs a local patch. One thing to confirm before relying on it: whether that PR is in the pinned **1.8.4** or a later release — the per-staff `showTablature` flag exists in 1.8.4, but if the rendering work landed afterwards, v0 needs a version bump, which touches the vendoring step and the payload budget.                                                                                                                              | not scheduled       |
| Q6  | **Six accepted extensions have no test chart.** `.musicxml`, `.mxml` and `.xml` need a genuine MusicXML export — the most important gap, since MusicXML is the only open format on the accept list and the one a user of free notation software would bring. `.gp3` and `.gp4` need real Guitar Pro 3/4 exports, and `.capx` needs Capella — renaming a `.gp5` does not help, because `ScoreLoader` reads the bytes and would just import it as GP5 again, testing nothing. All six are claimed by the picker but unverified, so either the charts or the accept list has to give. | before v0 ships     |
| Q7  | **No multi-track chart and no percussion-free chart exist.** Every chart in the repo parses to a single percussion track, so §4's own required test ("a multi-track chart whose drums are not track 0") and the settled no-drum-staff fallback both ship unverified — a regression to always-rendering-track-0 would pass CI. Two fixtures are needed: one with drums off index 0 plus a non-percussion track, and one with no percussion at all.                                                                                                                                  | before v0 ships     |

## 10. Roadmap position

```text
v0    → player: open a local file, see drum notation, hear it        ← this spec
v0.1  → settings: search across the settings v0 already ships (Accordion built in v0)
v0.2  → scoring: Web MIDI input, hit detection, feedback rings
later → PWA: install (manifest + icons) and offline (service worker + precache); order not set
```

**Paused, not dropped:** the catalog, the backend (Neon, Cognito) and the Playable schema. Their
return point is not set yet.

### v0.1 settings — captured now so the design is not lost

> **Full design:** [`2026-09-11-v01-settings-panel-design.md`](2026-09-11-v01-settings-panel-design.md).
> The summary below is the short version.

Modelled on a widely-used pattern (VS Code, macOS System Settings, Chrome, Firefox all ship
variants of it):

- **The same non-blocking popover v0 ships, not a modal** — a full-width search input goes at the
  top of it. v0 chose a popover for one reason, that it never blocks the player, and v0.1 keeps
  that: a drummer can still search and change a setting while the chart plays. `Dialog` is not
  built in v0 and is not needed in v0.1 either.
- Tabs for top-level categories
- Accordion sections inside each tab; labels read as `Section:`
- Row grammar: label left, control right-aligned, optional help icon after the label. Numeric values
  pair a number input in the row with a slider on the line beneath.
- **Search is global across all tabs.** Results replace the tab view and group under `Tab > Section`
  breadcrumb headers, with controls staying live and editable in the results.

v0 already ships the settings rows themselves in a popover (§7), so v0.1 adds the search index and
the tab chrome on top of them.

**The groups stay exactly the prototype's** — Display ▸ General, Colors, Fonts, Paddings, Notation,
Player, Stylesheet, Tools — so v0.1 is search plus tabs over rows that already exist, not a
re-grouping. **MIDI arrives as a new tab** in a later version, with the Web MIDI work (§2). Write
original label copy rather than borrowing strings from any reference product.
