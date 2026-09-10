# Spike: does AlphaTab render + play drum notation inside the `web/` Next.js 16 App Router app?

- **Date:** 2026-09-10
- **Ticket:** none yet — ad-hoc de-risking spike ahead of the player feature.
- **Branch / worktree:** `spike/alphatab-nextjs-poc` in
  `.claude/worktrees/alphatab-spike` (POC route: `web/app/spike/`).
- **Versions under test:** `@coderline/alphatab@1.8.4`, Next.js 16.2.10 (Turbopack), React 19.2.7,
  Node 24.16.0.
- **Acceptance bar:** `next build` followed by `next start` — dev-mode success does not count.

## TL;DR / verdict

✅ **YES — it works in a production build.** Drum notation renders, AlphaSynth plays it, the cursor
is synced, tempo and per-track mute/solo work, and `next build` + `next start` is green with **zero
failed network requests and zero console errors**. Screenshot proof:
[`2026-09-10-alphatab-drums-prod-build.png`](2026-09-10-alphatab-drums-prod-build.png).

But it does **not** work out of the box, and the failure is silent-ish rather than loud. **One line
is load-bearing.** AlphaTab locates its web worker and audio worklet from `import.meta.url`.
Turbopack does not leave that as a usable http URL in a production chunk, so
`Environment.webPlatform` resolves to `Browser` instead of `BrowserModule`, `isWebPackBundled` and
`isViteBundled` are both `false`, and AlphaTab falls through every worker-construction strategy it
has. Both the render worker **and** AlphaSynth then fail with:

```text
Failed to create worker for synthesizing audio: Could not detect alphaTab script file
```

Rendering survives that (it silently falls back to main-thread rendering — notation still appeared,
which is exactly what makes this easy to miss). **Playback does not.** No sound, no cursor, and the
only signal is a console error.

There are two ways to fix it, both verified end-to-end in a production build. **Recommend variant B
for the real player.**

| Variant                                 | How                                                                              | Worker type                    | AlphaTab shipped         | Verified     |
| --------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------ | ------------------------ | ------------ |
| **A** — bundled + `scriptFile`          | Normal `import`, plus `settings.core.scriptFile` → a self-hosted classic build   | classic blob + `importScripts` | **twice** (~545 KB gzip) | `/spike`     |
| **B** — self-hosted ESM _(recommended)_ | `turbopackIgnore` dynamic import from `public/`; library never enters the bundle | native ESM module workers      | once (~273 KB gzip)      | `/spike/esm` |

The decisive trade-off: **A keeps normal imports and bundler dedup but pays for AlphaTab twice; B
ships it once with real module workers but gives up bundling (hand-managed `public/` copy, runtime
type cast).** For a library this size, on a PWA that wants an offline cache budget, the ~273 KB gzip
duplicate is the thing that matters — flip back to A only if hand-copying `dist/` into `public/`
proves unmaintainable.

**AlphaTab itself did not fight App Router at all.** Every problem found was a _bundler asset
resolution_ problem, not an App Router or React 19 problem. And the port from the existing
`rhythm-game` prototype was frictionless: **zero AlphaTab API breakage** between 1.8.1 and 1.8.4.

## What was built

`web/app/spike/` — a scratch route (`/spike`) that:

1. Loads a bundled `.gp5` and renders its **percussion** track (percussion clef, X-noteheads,
   multi-voice, dynamics, bar numbers — all visible in the screenshot).
2. Plays it through AlphaSynth with a **synced cursor** (`.at-cursor-bar` present and its
   `.at-cursor-beat` transform advances during playback).
3. Exposes a **tempo** slider (`api.playbackSpeed`) and **per-track mute/solo**
   (`api.changeTrackMute` / `api.changeTrackSolo`) — both came cheaply, as hoped.
4. Renders a `@notation-hero/client` `<Button>` on the same page as the coexistence check.

Plus `web/app/spike/esm/` (variant B), a mount/unmount harness, and two Playwright probes
(`web/spike-probe.mjs`, `web/spike-lifecycle-probe.mjs`) that captured every number in this doc.

**Test charts** ported from the prototype fork, both verified to carry a real percussion track by
parsing them with AlphaTab (`staff.isPercussion`) rather than trusting the filename:

| File                             | Source (prototype fork)                       | Track                                        |
| -------------------------------- | --------------------------------------------- | -------------------------------------------- |
| `web/public/charts/drums.gp5`    | `static/files/features/Drums.gp5`             | "Drums", 17 bars, 223 notes — **percussion** |
| `web/public/charts/rock-beat.gp` | `static/files/guitar-pro-rock-beat-repeat.gp` | "Drumkit", 4 bars, 52 notes — **percussion** |

> **Gotcha worth keeping:** a GP5 drum track reports `playbackInfo.program === 0` — identical to
> Acoustic Grand Piano. Program number is **useless** for detecting percussion. What marks it is
> MIDI channel 9 plus `staff.isPercussion`. `Drums.gp5` and `rock-beat.gp` both look like piano by
> program number alone.

## The five risks

### 1. Web workers under Turbopack — **the only real problem, and it is fixable**

Turbopack **does not** bundle AlphaTab's worker, and **does not** rewrite the worker URL.

The mechanism, read out of `alphaTab.core.mjs` rather than guessed: AlphaTab deliberately hides its
worker construction from static analysis. `Environment.alphaTabWorker` is a getter returning
`globalThis.Worker`, and `Environment.alphaTabUrl` returns `globalThis.URL`. So the call

```js
new alphaTab.Environment.alphaTabWorker(
  new alphaTab.Environment.alphaTabUrl('./alphaTab.worker.mjs', import.meta.url),
  { type: 'module' },
);
```

is invisible to every bundler's `new Worker(new URL(...))` detection. That is intentional —
AlphaTab expects its **bundler plugin** to copy the worker next to the output chunk. There is no
Turbopack plugin.

Observed in the built output: **no worker or worklet file is emitted anywhere in `.next/`**, and the
string `alphaTab.worker.mjs` sits unrewritten inside the app chunk. At runtime AlphaTab reports:

```text
Platform: Browser        <- not BrowserModule
WebPack: false
Vite: false
```

`Browser` (not `BrowserModule`) means `import.meta.url` was not a usable http URL, so AlphaTab skips
its three ESM worker strategies entirely and lands on the `settings.core.scriptFile` fallback —
which is `null`, because `_detectScriptFile()` reads the same dead `import.meta.url` and
`document.currentScript` is null inside a bundled chunk.

**Config needed (variant A):**

```ts
// Must be ABSOLUTE — see below.
settings.core.scriptFile = new URL('/alphatab/alphaTab.min.js', globalThis.location.href).href;
```

with `node_modules/@coderline/alphatab/dist/alphaTab.min.js` copied to `web/public/alphatab/`.

> **Sub-gotcha that cost a build cycle:** a **root-relative** path does not work. The fallback
> worker is constructed from a `blob:` URL and calls `importScripts(scriptFile)`, which resolves
> against the blob origin, throwing
> `Failed to execute 'importScripts' on 'WorkerGlobalScope': The URL '/alphatab/alphaTab.min.js' is invalid`.
> Worse, this half-fix is **more broken than no fix**: with `scriptFile` unset, rendering silently
> falls back to the main thread and notation still appears; with `scriptFile` set but unresolvable,
> the render worker is created and then dies, so **nothing renders at all**.
> `fontDirectory` and `soundFont` are fetched from the main thread and may stay root-relative.

**Config needed (variant B):** none at all. Self-host `dist/` under `public/alphatab/esm/` and
import it past the bundler:

```ts
const ALPHATAB_ESM_URL = '/alphatab/esm/alphaTab.mjs';
const alphaTab = (await import(/* turbopackIgnore: true */ ALPHATAB_ESM_URL)) as typeof AlphaTab;
```

`import.meta.url` is then a real http URL, `Environment.webPlatform` reports **`BrowserModule`**,
and the log flips from `Creating Blob worker` to `Creating webworker`. Verified: 2 module workers,
soundfont loaded, notation rendered, cursor present, playing.

Two non-obvious requirements for variant B:

- **The specifier must be a variable, not a string literal.** A literal makes `tsc` resolve it at
  compile time and fail the build with `Cannot find module '/alphatab/esm/alphaTab.mjs'`. Holding it
  in a `const` also stops Turbopack from statically analysing (and re-bundling) it.
- **The `.min.mjs` files reference the NON-min filenames internally.** `alphaTab.min.mjs` imports
  `./alphaTab.core.mjs`, and `alphaTab.worker.min.mjs` also imports `./alphaTab.core.mjs`. So a
  self-hosted minified copy must be placed under the **plain** names, or the browser fetches the
  unminified 3.0 MB core:

  ```sh
  cp dist/alphaTab.min.mjs         public/alphatab/esm/alphaTab.mjs
  cp dist/alphaTab.core.min.mjs    public/alphatab/esm/alphaTab.core.mjs
  cp dist/alphaTab.worker.min.mjs  public/alphatab/esm/alphaTab.worker.mjs
  cp dist/alphaTab.worklet.min.mjs public/alphatab/esm/alphaTab.worklet.mjs
  ```

Also note: the `@coderline/alphatab/webpack` and `/vite` subpath exports still appear in 1.8.4's
`exports` map but the `dist/webpack` and `dist/vite` **directories do not exist** — those plugins
moved to the separate `@coderline/alphatab-webpack` / `@coderline/alphatab-vite` packages. The
prototype's `AlphaTabWebPackPlugin` import path is therefore dead in 1.8.4 regardless of bundler.

### 2. SoundFont + worker asset serving — **`public/`, and the SoundFont is the budget**

Everything must be served as a static asset from `web/public/`. Measured cold-load for the POC
route, taken off the wire:

| Asset                        | Raw     | gzip       | Needed by                                    |
| ---------------------------- | ------- | ---------- | -------------------------------------------- |
| `soundfont/sonivox.sf3`      | 954 KB  | 302 KB     | AlphaSynth — fetched **once**                |
| `font/Bravura.woff2`         | 306 KB  | 305 KB     | notation glyphs — the **only** font fetched  |
| AlphaTab library (variant B) | 1092 KB | 273 KB     | main thread + both workers (HTTP-cached)     |
| AlphaTab library (variant A) | —       | **545 KB** | bundle copy **plus** the classic worker copy |
| `charts/drums.gp5`           | 3 KB    | —          | the score                                    |

- **Use AlphaTab's own bundled SoundFont, not the prototype's.** The fork ships
  `sonivox_musescore.sf2` at **3.9 MB**; `@coderline/alphatab` ships `dist/soundfont/sonivox.sf3` at
  **954 KB** for the same instrument set. That is a **4x** saving for free. (The `.sf2` in the same
  dist folder is 1.35 MB — the `.sf3` is the one to take.)
- **The SoundFont is compressible and was served uncompressed.** `next start` sent all 954 KB with
  no encoding. It gzips to **302 KB** and brotlis to **277 KB** — a ~650 KB saving. Whether Vercel's
  CDN compresses `.sf3` (an unknown MIME type) needs checking before launch; this is the single
  biggest cheap win on the route.
- **Only `Bravura.woff2` is fetched.** The `.otf` (496 KB) and `.woff` (537 KB) copied alongside it
  were never requested. Ship `woff2` only unless a specific old-browser target says otherwise.
- **PWA offline budget:** a realistic precache for one playable chart is **~870 KB compressed**
  (294 SoundFont + 305 Bravura + 273 AlphaTab) under variant B, or **~1.15 MB** under variant A.
  Both are well inside a normal service-worker precache, but the SoundFont and font are the fixed
  floor — per-chart marginal cost is only a few KB, so **caching many charts is cheap; the engine is
  the one-time cost.**

### 3. Production build — **PASS, and it prerenders static**

```text
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /spike
└ ○ /spike/esm
○  (Static)  prerendered as static content
```

`next build` succeeds and `/spike` is **statically prerendered** — AlphaTab does not force the route
dynamic. `next start` then serves a fully working player. `tsc --noEmit` and
`eslint . --max-warnings 0` are both clean.

Two build-time findings:

- **`next/dynamic` with `ssr: false` is ILLEGAL here.** The integration shape usually quoted for
  AlphaTab (`dynamic(() => import('./X'), { ssr: false })`) is a **Pages Router** recipe. In an App
  Router Server Component it hard-fails the build:
  `` `ssr: false` is not allowed with `next/dynamic` in Server Components. ``
- **It is also unnecessary.** AlphaTab's module scope is SSR-safe: `alphaTab.mjs` guards its
  initialisation on `isRunningInWorker` / `isRunningInAudioWorklet`, and `initializeMain` skips the
  `window`-touching branch when `webPlatform === NodeJs`. A plain `'use client'` component imported
  directly from the server page builds, prerenders, and hydrates cleanly. **No `next/dynamic`
  needed.**

### 4. React 19 strict-mode double mount — **survives it; no leak, fully balanced**

This needed a control to answer honestly, because the naive reading is misleading. A bare control
effect in the same component shows that **React 19 does not double-invoke on the initial App Router
mount** (`control.runs === 1` on first load, in dev _and_ with `reactStrictMode: true` set
explicitly). So "1 mount, 0 disposes" on first load is **not** evidence that AlphaTab survived
strict mode — strict mode simply had not fired yet.

Double-invoke **does** fire on subsequent keyed remounts. Driving three remounts plus a full unmount
through the harness:

| Stage              | dev (`control.runs` / `cleanups`) | AlphaTab `mounts` / `disposes` | `.at-surface` count |
| ------------------ | --------------------------------- | ------------------------------ | ------------------- |
| first mount        | 1 / 0                             | 1 / 0                          | 1                   |
| after remount ×1   | 3 / 2                             | 3 / 2                          | 1                   |
| after remount ×3   | 7 / 6                             | 7 / 6                          | 1                   |
| after full unmount | 7 / 7                             | **7 / 7**                      | **0**               |

Each dev remount runs the effect **twice** (the strict-mode double-invoke) — and AlphaTab handles it:
`mounts` and `disposes` stay in lockstep, the render surface count **never exceeds 1**, and the DOM
is fully empty after unmount. Production shows the same balance with single invocation (4 / 4 after
3 remounts, 0 surfaces). **Zero console errors and zero page errors throughout.**

Conclusion: the `useRef` + `api.destroy()` in the effect cleanup is sufficient. `AlphaTabApi.destroy()`
genuinely tears down its workers and DOM. **No leak, no double-render, no `StrictMode` workaround
needed.**

### 5. `transpilePackages` interaction — **no conflict**

`/spike` renders a `@notation-hero/client` `<Button>` and the AlphaTab player on the same page, in
the same production build. Both work. AlphaTab is a normal pre-built `node_modules` package with its
own `exports` map, so it is not in `transpilePackages` and does not interact with the
`@notation-hero/client` raw-source transpilation.

The known project footgun — _path aliases inside a transpiled package resolve against the APP's
tsconfig_ — **does not bite here**, because AlphaTab's `dist` has no path aliases; it ships plain
relative ESM. The existing `"@/*": ["../client/src/*"]` mapping in `web/tsconfig.json` was untouched
and needed no change.

One unrelated tooling collision did surface: **`eslint .` walks `public/`**, so vendoring a minified
bundle there produced **~11,374 lint problems** in code we do not author. Fixed by adding
`public/alphatab/**` to `globalIgnores` in `web/eslint.config.mjs` and to `.prettierignore`.

## Every config change required

| File                     | Change                                                                                                                | Why                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `web/package.json`       | `+ @coderline/alphatab@1.8.4`                                                                                         | the library                                                |
| `web/public/alphatab/**` | vendored `dist/font/Bravura.woff2`, `dist/soundfont/sonivox.sf3`, and either the classic build (A) or the ESM set (B) | AlphaTab loads these over HTTP at runtime, not via imports |
| `web/eslint.config.mjs`  | `globalIgnores([... 'public/alphatab/**', 'spike-out/**'])`                                                           | stop `eslint .` linting a vendored minified bundle         |
| `.prettierignore`        | `web/public/alphatab/`                                                                                                | same reason                                                |
| `web/.gitignore`         | `/spike-out/`                                                                                                         | Playwright probe output                                    |
| **application code**     | `settings.core.scriptFile` (variant A only)                                                                           | the load-bearing line — see risk 1                         |

**No `next.config.ts` change is required.** (`reactStrictMode: true` was added during the spike only
to prove risk 4; App Router already defaults it to `true`, so it can be dropped.) **No Turbopack
config, no webpack fallback shims, no `transpilePackages` entry.** The prototype's Docusaurus
`resolve.fallback` block (`fs: false`, `buffer: false`, …) was **not** needed.

## API changes when porting from the `rhythm-game` prototype

**None.** Every AlphaTab API the prototype uses still exists in 1.8.4 and typechecks — verified
against `dist/alphaTab.d.ts`: `boundsLookup`, `tickCache`, `tickPosition`, `actualPlayerMode`,
`updateSyncPoints`, `loadMidiForScore`, `downloadMidi`, `isReadyForPlayback`, `isLooping`,
`playbackSpeed`, `masterVolume`, `metronomeVolume`, `countInVolume`, `changeTrackVolume`,
`changeTrackMute`, `changeTrackSolo`, `changeTrackTranspositionPitch`, `renderTracks`,
`updateSettings`, `render`, `print`, plus the `scoreLoaded` / `renderFinished` / `soundFontLoaded` /
`playerPositionChanged` / `playerStateChanged` / `midiLoaded` / `beatMouseDown` events.

What changed is **the environment around it**, not the API:

| Prototype (Docusaurus, 1.8.1)                                   | Ported to `web/` (Next.js 16, 1.8.4)                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `AlphaTabWebPackPlugin` from `@coderline/alphatab-webpack`      | **dropped** — no Turbopack plugin exists; replaced by risk-1 fix   |
| `webpack resolve.fallback` node-polyfill block                  | **dropped** — not needed                                           |
| `environment.withBaseUrl()` over `siteConfig.baseUrl`           | plain `/alphatab/...` paths from `public/`                         |
| `useColorMode()` from `@docusaurus/theme-common` for dark theme | dropped from the spike; the real player wires this to the NH theme |
| `useAlphaTab` hook using `React.createRef()` in a render body   | `useRef` — the prototype's pattern makes a fresh ref every render  |
| a local patch enabling drum **tablature**                       | **not ported** — see below                                         |

> **The prototype's alphaTab patch is for drum _tablature_, not drum notation.**
> `patches/@coderline+alphatab+1.8.1.patch` in the fork forces `showTablature` on percussion staves
> (AlphaTab hides it by default). Standard drum **notation** — which is what this spike rendered —
> needs no patch. If drum tablature is wanted in the product, that patch would have to be
> re-applied to 1.8.4 and maintained, which is a real ongoing cost worth deciding on separately.

## What this spike did NOT test

Named plainly so none of it gets assumed:

- **Audio was never heard.** Playback was verified by state, not ears: `playerStateChanged` →
  playing, `playerPositionChanged` advancing 0:00 → 0:02 of 0:25, and the cursor element's transform
  moving. Headless Chromium produces no audible output. Timing accuracy and latency are untested —
  and prior research already warns AlphaTab is built for display + playback, not millisecond hit
  detection.
- **Only Chromium.** No Safari or Firefox. Safari's `AudioWorklet` and module-worker support is the
  obvious next check, especially for variant B, which depends on `{ type: 'module' }` workers.
- **No Vercel deploy.** Everything was local `next build` + `next start`. CDN behaviour for `.sf3`
  (the compression question in risk 2) and for `public/alphatab/esm/*.mjs` MIME types is unverified.
- **No mobile / iOS**, no service worker, no actual PWA precache — the budget numbers above are
  measured payloads, not a tested offline install.
- **No MIDI input, no scoring, no overlay.** This spike is render + playback only.
- **Variant B's audio worklet was not observed being fetched.** `alphaTab.worklet.mjs` never appeared
  in the intercepted requests, though playback worked; worth confirming whether the worklet path or a
  fallback is in use before relying on it.

## How to reproduce

```sh
cd .claude/worktrees/alphatab-spike
nvm use && pnpm install
pnpm --filter @notation-hero/web run build
pnpm --filter @notation-hero/web run start     # serves on :3000 (the dev script uses :3002)

# then, in another shell:
cd web
node spike-probe.mjs           http://localhost:3000/spike      prod   # render + playback + screenshot
node spike-lifecycle-probe.mjs http://localhost:3000/spike      prod   # mount/dispose/leak counters
node spike-probe.mjs           http://localhost:3000/spike/esm  esm    # variant B
```

Probe output (screenshots + JSON reports) lands in `web/spike-out/`, which is git-ignored.

## Sources

Read directly out of the installed package rather than from documentation:
`web/node_modules/@coderline/alphatab/dist/alphaTab.mjs` (the worker-construction ladder),
`alphaTab.core.mjs` (`Environment._detectWebPlatform` / `_detectWebPack` / `_detectVite` /
`_detectScriptFile`, `Environment.alphaTabWorker`), `alphaTab.d.ts` (API surface),
and `package.json` (`exports`). Next.js behaviour from the version-exact bundled docs at
`web/node_modules/next/dist/docs/`. Prototype prior art:
`/Users/leocaseiro/Sites/alphaTabWebsite` (branch `rhythm-game`). Prior AlphaTab research:
[`2026-06-18-alphatab-integration.md`](2026-06-18-alphatab-integration.md).
