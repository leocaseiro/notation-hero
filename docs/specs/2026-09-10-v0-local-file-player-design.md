# v0 — local-file drum player PWA

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
- **No settings dialog.** That is v0.1.
- **No catalog.** Nothing to browse — you bring the file.
- The mockup's **scoring HUD** and **practice/game rail** render hidden, because both need scoring.

## 3. Decisions

All approved by leocaseiro on 2026-09-10.

| #   | Decision                                                             | Rationale                                                                                                                                                 |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Stay in the existing repo; ship in `web/`                            | The design system is already wired in and working; Vercel is already configured; zero migration cost. A new repo would cost days before any product code. |
| D2  | v0 is **player only**                                                | AlphaTab provides render, playback, cursor, tempo and track mixing nearly for free. Days, not months.                                                     |
| D3  | The design system is **pulled by the screen**                        | Building components first is what produced 41 components and no product. The player decides what gets built.                                              |
| D4  | **Port** the `rhythm-game` prototype rather than only referencing it | The integration was already solved once; zero API breakage 1.8.1 → 1.8.4 made the port clean.                                                             |
| D5  | AlphaTab delivery: **self-hosted ESM** from `public/`                | Verified end-to-end in a production build. Native module workers, keeps Turbopack, ships AlphaTab once (~273 KB gzip) instead of twice.                   |
| D6  | The spike branch **seeds** the player                                | `spike/alphatab-nextjs-poc` already proves the mount, asset wiring and config. Rebuilding would re-solve solved work.                                     |
| D7  | Safari and iPad verification happens **after v0 ships**              | Chrome and Android are enough for a first ship. Recorded as a known untested surface, not ignored.                                                        |

> **On D5:** option A (the `@coderline/alphatab-webpack` plugin, as the prototype used) was
> considered and rejected. Note that the prototype's exact import path is dead in 1.8.4 regardless —
> the `@coderline/alphatab/webpack` subpath still appears in the `exports` map but `dist/webpack`
> does not exist; those plugins moved to separate packages.

## 4. Architecture

Two routes, one package. Nothing leaves the device.

| Route   | Purpose                     |
| ------- | --------------------------- |
| `/`     | Drop zone plus recent files |
| `/play` | The player                  |

**How the file crosses between them:** an `ArrayBuffer` cannot travel in a URL. On open, the buffer
is written to IndexedDB under a generated id, then `/` navigates to `/play?id=<id>`. This keeps the
player reload-safe and makes browser back/forward behave, at no extra cost — the same IndexedDB
write already backs the recent-files list.

### Data flow

```text
file picker / drag-and-drop
  → ArrayBuffer (in memory)
  → alphaTab api.load(buffer)
  → SVG drum notation + AlphaSynth playback + synced cursor
  → IndexedDB (remember recent files)
```

No upload, no network call for user content. The only network traffic is the static engine assets.

### Mounting AlphaTab

A single `'use client'` component owns the `AlphaTabApi` instance in a `useRef`, and disposes it on
unmount. Verified against React 19 strict mode: mounts equal disposes across remounts, surfaces
never exceed one, DOM is empty after unmount.

**Do not use `dynamic(..., { ssr: false })`.** It is illegal in an App Router Server Component and
unnecessary — AlphaTab's module scope is SSR-safe and the spike route prerenders static.

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

**Two requirements that are easy to get wrong:**

1. **The specifier must be a variable, not a string literal.** A literal makes `tsc` resolve it at
   compile time and fail the build. Holding it in a `const` also stops Turbopack re-bundling it.
2. **Minified files must be placed under the plain names.** `alphaTab.min.mjs` imports
   `./alphaTab.core.mjs` internally, so a minified copy stored under a `.min` name causes the browser
   to fetch the unminified 3.0 MB core instead.

Vendoring runs as a prebuild step so it is never a manual chore:

```sh
cp dist/alphaTab.min.mjs         public/alphatab/esm/alphaTab.mjs
cp dist/alphaTab.core.min.mjs    public/alphatab/esm/alphaTab.core.mjs
cp dist/alphaTab.worker.min.mjs  public/alphatab/esm/alphaTab.worker.mjs
cp dist/alphaTab.worklet.min.mjs public/alphatab/esm/alphaTab.worklet.mjs
```

Plus `dist/soundfont/sonivox.sf3` and `dist/font/Bravura.woff2`.

### Regression test — the silent failure

Without the fix, **notation still renders** on a main-thread fallback and only **playback** dies.
The page looks correct until you press play. v0 must carry a test that asserts the worker path is
live, not just that notation appeared.

## 6. Payload budget

| Asset                   | Raw     | gzip   | Notes                                                  |
| ----------------------- | ------- | ------ | ------------------------------------------------------ |
| `soundfont/sonivox.sf3` | 954 KB  | 302 KB | AlphaTab's own — **not** the prototype's 3.9 MB `.sf2` |
| `font/Bravura.woff2`    | 306 KB  | 305 KB | the only font fetched; skip the `.otf` and `.woff`     |
| AlphaTab library        | 1092 KB | 273 KB | shipped once under D5                                  |
| A chart                 | ~3 KB   | —      | per-song marginal cost                                 |

**PWA precache floor ≈ 870 KB compressed.** The engine is a one-time cost and per-chart cost is
trivial, so caching many charts is cheap.

**Open cost item:** `next start` served the `.sf3` uncompressed. It gzips to 302 KB and brotlis to
277 KB. Whether Vercel's CDN compresses an unknown MIME type needs checking — it is the single
biggest cheap win on the route.

## 7. Component plan (D3 — pulled by the screen)

**Already built:** `PlayButton`, `Bpm`, `Button`, `Tooltip`, `Popover`, `Sheet`, `RangeSlider`,
`Separator`, `Sonner`, `DropdownMenu`, `ScrollArea`, `Skeleton`, `Tabs`, `Field`, `SearchInput`,
`Checkbox`, `NativeSelect`, `Input`.

**To build for v0:** the transport row layout, a **playback scrubber** (current time, seek bar, total
time), the notation-surface wrapper, and the drop zone.

**Deferred:** the mockup's **A/B loop markers** on the scrubber are a practice feature, not part of
"open a file and hear it" — v0 ships a plain seek bar and the markers land with the practice work.
`Dialog` and `Accordion` go to v0.1, since both are needed by the settings panel and neither exists
yet.

## 8. Success criteria

v0 is done when, on a deployed Vercel URL:

1. A `.gp5` drum chart opened from local disk renders as standard drum notation.
2. Pressing play produces **audible** drum audio with a cursor that tracks it.
3. Tempo and per-track mute/solo work.
4. Reopening the app offers the recent file without re-picking it.
5. The app installs as a PWA and the player works offline.
6. leocaseiro loads **his own** chart and it plays.

Criterion 2 is called out deliberately — see the open questions.

## 9. Open questions and known gaps

| #   | Item                                                                                                                                                                                          | When it matters     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Q1  | **Nobody has heard the audio.** The spike verified playback by state (position advancing, cursor moving), not by ear — headless Chromium is silent. Timing accuracy and latency are untested. | v0 acceptance       |
| Q2  | Vercel CDN compression for `.sf3`, and MIME types for `public/alphatab/esm/*.mjs`. No Vercel deploy has happened yet.                                                                         | v0 deploy           |
| Q3  | The ESM variant's audio worklet was never observed being fetched, though playback worked. Confirm whether the real worklet path or a fallback is in use.                                      | before v0.2 scoring |
| Q4  | Safari, Firefox, iPad — all untested. Safari's `AudioWorklet` and module-worker support is the named risk, and module workers are exactly what D5 depends on.                                 | after v0 ships (D7) |
| Q5  | Drum **tablature** needs a patch to AlphaTab and ongoing maintenance. Standard drum **notation** needs no patch. Decide separately whether tablature is wanted.                               | not scheduled       |

## 10. Roadmap position

```text
v0    → player: open a local file, see drum notation, hear it        ← this spec
v0.1  → settings: Dialog + Accordion + the search/tabs/accordion panel
v0.2  → scoring: Web MIDI input, hit detection, feedback rings
```

### v0.1 settings — captured now so the design is not lost

Modelled on a widely-used pattern (VS Code, macOS System Settings, Chrome, Firefox all ship
variants of it):

- Modal dialog with a close control and a full-width search input at the top
- Tabs for top-level categories
- Accordion sections inside each tab; labels read as `Section:`
- Row grammar: label left, control right-aligned, optional help icon after the label. Numeric values
  pair a number input in the row with a slider on the line beneath.
- **Search is global across all tabs.** Results replace the tab view and group under `Tab > Section`
  breadcrumb headers, with controls staying live and editable in the results.

Categories will be drum-specific (audio, MIDI, notation, practice). Write original label copy rather
than borrowing strings from any reference product.
