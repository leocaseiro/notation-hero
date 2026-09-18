# Spike: the official AlphaTab webpack route, weighed against our Turbopack one (D5)

- **Date:** 2026-09-14
- **Ticket:** NH-291 (epic); closes the NH-298 item "D5 has no fallback recorded".
- **Branch / worktree:** `spike/alphatab-nextjs-poc` in `.claude/worktrees/alphatab-spike`.
  The spike app itself was built **outside the repo**, in a scratch directory, so nothing here
  changed except this document.
- **Versions under test:** `@coderline/alphatab@1.8.4`, `@coderline/alphatab-webpack@1.8.4`,
  Next.js 16.2.10, React 19.2.7, Node 24.16.0.
- **Acceptance bar:** `next build --webpack` followed by `next start` — same bar as the
  2026-09-10 spike. Dev mode was measured separately and is reported separately.

## TL;DR / verdict

**D5 stands. We stay on Turbopack + the self-hosted ESM import.** Ratified by the maintainer on
2026-09-14 after reading this evidence.

The official route was not rejected because it is broken — **it works**. It was weighed and lost on
cost of change: Plan A is already written and reviewed around D5, and switching would rewrite about
a third of it to buy a path we do not need. The full webpack recipe is preserved below as **D5's
documented fallback**, so if the Turbopack arrangement ever breaks there is a known-good route to
fall back to that does not need re-discovering.

This spike exists because the earlier one dropped `AlphaTabWebPackPlugin` with the line
_"no Turbopack plugin exists"_ — true, but that is a consequence of staying on Turbopack, not a
reason for it. Staying was never examined as a choice. It has now been examined.

## What was measured

A scratch Next 16 app as close to `web/` as practical: the real `next.config.ts` options
(`reactStrictMode`, `reactCompiler`, `transpilePackages: ['@notation-hero/client']`), React pinned
to 19.2.7 to match the lockfile, the real `client/src` Phase-1 surface (`index.ts`, `Button.tsx`,
`lib/utils.ts`) as a workspace package, the same `drums.gp5` fixture, and the plugin wired exactly
as <https://github.com/CoderLine/alphaTabSamplesWeb/tree/main/src/webpack-nextjs-16> wires it.

### 1. Does it play? Yes

Production build, `next start`, driven by Playwright:

```json
"state":   { "ready": "true", "soundfont": "true", "platform": "Browser", "error": "" },
"probe":   { "webPlatform": "Browser",
             "stateEvents": ["Paused","Paused","Paused","Paused","Playing"],
             "positionSampleCount": 1676,
             "lastPositionSample": { "currentTime": 4442.67, "endTime": 25987.26 },
             "errors": [] },
"silentFailureMarkers": [],  "failedRequests": []
```

AlphaTab's own debug log confirms the good audio path:

```text
[AlphaTab][VersionInfo] WebPack: true
[AlphaTab][Player] Will use webworkers for synthesizing and web audio api with worklets for playback
[AlphaTab][AlphaTab] Creating Module worklet
```

No `Failed to create worker for synthesizing audio`, no `Audio Worklet creation failed`, no
ScriptProcessor fallback.

Note the mechanism differs from ours: `Environment.webPlatform` is **`Browser`**, not
`BrowserModule`. The plugin rewrites the worker and worklet references at build time, so AlphaTab
takes its webpack-aware branch rather than the native-ESM-module-worker branch D5 relies on. Two
different routes to the same working outcome.

Payload is the same order as D5's variant B: the library lands in one chunk of 1092 KB raw /
**274 KB gzip** (D5 variant B measured 273 KB). It is not the 545 KB double-copy of variant A.

### 2. `reactCompiler: true` survives `next build --webpack`. Confirmed

This was the loudest risk in the handoff, so it was tested by building the same probe component
twice under `--webpack`, flipping only `reactCompiler`:

```js
// reactCompiler: false  — 578 bytes
function r({items:e}){let t=e.map(e=>2*e),n=t.reduce((e,t)=>e+t,0);return jsx("p",{...})}

// reactCompiler: true   — 1239 bytes
function u(e){let t,n,s,u,o=(0,c.c)(7),{items:l}=e;      // (0,c.c) === useMemoCache
  if(o[0]!==l){...o[0]=l,o[1]=t,o[2]=n,o[3]=s}else{...}
  ...Symbol.for("react.memo_cache_sentinel")...}
```

`useMemoCache`, the memo-cache slots and `react.memo_cache_sentinel` are React Compiler output and
nothing else emits them. Babel runs fine under webpack.

### 3. `transpilePackages` survives, and so does everything around it

The `/player` Play button is the real `@notation-hero/client` `Button`, compiled from raw `.tsx`
inside the workspace package, with its internal `@/lib/utils` import resolving against the **app's**
tsconfig paths. It rendered with fully-resolved variants:

```text
group/button inline-flex … bg-clip-padding … bg-primary text-primary-foreground h-9 gap-1.5 px-2.5 …
```

The cross-package Tailwind `@source` scan also works: `bg-clip-padding` — the CI sentinel class,
present only in the design-system source and nowhere in app code — is generated into the built CSS.

### 4. Build and dev times: webpack is roughly 2.3x slower

Measured on the real `web/` app, same machine, both bundlers, nothing else running:

| Bundler   | cold build | warm build |
| --------- | ---------- | ---------- |
| Turbopack | 4.00 s     | 3.50 s     |
| webpack   | 9.10 s     | 7.00 s     |

Dev, on the scratch app: first-route compile **3.68 s** (webpack) vs **1.73 s** (Turbopack); server
"Ready" is ~0.2 s for both. Browser-measured hot reload (file write until the DOM shows the change):
webpack `1.14 / 0.46 / 0.26 s`, Turbopack `– / 0.16 / 0.10 s`. Both are sub-second once warm.

In absolute terms the switch would cost about 5 seconds per build. That is tolerable on its own —
it is not why D5 was kept.

One safety property worth recording: Next 16 **hard-errors** on `next build` when a `webpack` config
exists and no `turbopack` config does. You cannot silently run the wrong bundler.

### 5. The audio-worklet fetch is still invisible to Playwright. No change

AlphaTab logs `Creating Module worklet`, but the worklet chunk never appears in Playwright's request
log. Only the two worker-chunk loads and the asset fetches do:

```text
GET script /_next/static/chunks/190.….js     <- worker ("Creating webworker" logged twice)
GET script /_next/static/chunks/190.….js
GET xhr    /alphatab/soundfont/sonivox.sf3
GET font   /alphatab/font/Bravura.woff2
```

Chromium exposes `AudioWorklet.addModule()` to no Playwright observer on either route. **Plan A
Task 7 keeps its premise unchanged** — `page.request.get` stays the mechanism for asserting the
worklet file is reachable.

### 6. What the plugin emits, and the dev-mode trap

`assetOutputDir: 'public/alphatab'` writes **7.0 MB**, on every dev compile as well as on build:
`sonivox.sf2` (2112 KB) and `sonivox.sf3` (960 KB), plus every Bravura format — `.svg` (2112 KB),
`.woff` (576), `.otf` (512), `.eot` (448), `.woff2` (320) — and the licence text. Only
`Bravura.woff2` and `sonivox.sf3` are ever fetched. Our hand-vendored tree is 4.4 MB and selective.
Either way the directory is generated output and **needs a `.gitignore` entry**, which Plan A
Task 2 already carries for ours.

**The trap:** because the plugin rewrites those files on every compile, `next dev --webpack` enters
an endless rebuild/reload loop and AlphaTab never reaches `renderFinished`. Measured over a fixed
window on a clean server with no edits:

| dev configuration                            | Fast Refresh rebuilds | page navigations |
| -------------------------------------------- | --------------------- | ---------------- |
| plugin, `assetOutputDir: 'public/alphatab'`  | 330 / 20 s            | 310              |
| same, on a route that never imports AlphaTab | 314 / 20 s            | 283              |
| plugin emitting outside `public/`            | 29 / 15 s             | 25               |
| control — plugin removed                     | **0 / 15 s**          | 2                |

It is not AlphaTab-specific; every route loops. Removing the plugin in dev is not an option either:
without it the worker URL is never rewritten and the browser requests
`file:///…/alphaTab.worker.mjs`, which fails.

The fix is three lines and was verified to work — see the fallback recipe below. The official sample
does not carry it, so this is worth reporting upstream.

## D5's documented fallback — the webpack recipe

If the Turbopack arrangement ever breaks (a Next release that changes dynamic-import handling, an
AlphaTab release that drops the standalone ESM build, a worker-resolution regression), this is the
known-good route. It was executed end to end on 2026-09-14 and played.

1. **Install the plugin.** `pnpm --filter @notation-hero/web add -D @coderline/alphatab-webpack@<matching alphatab version>`.
   Keep it version-locked to `@coderline/alphatab`; they ship in lockstep.
   Do **not** use the `@coderline/alphatab/webpack` subpath — it is a deprecation shim importing a
   directory the package does not ship, and it throws.

2. **Wire it in `web/next.config.ts`,** with the watcher fix the official sample lacks:

   ```ts
   import type { NextConfig } from 'next';
   import { AlphaTabWebPackPlugin } from '@coderline/alphatab-webpack';

   const nextConfig: NextConfig = {
     reactStrictMode: true,
     reactCompiler: true,
     transpilePackages: ['@notation-hero/client'],
     webpack(config) {
       config.plugins.push(new AlphaTabWebPackPlugin({ assetOutputDir: 'public/alphatab' }));
       // Without this, the plugin rewrites its own output every compile and `next dev --webpack`
       // reload-loops forever (~330 rebuilds/20 s), so AlphaTab never finishes rendering.
       config.watchOptions = {
         ...(config.watchOptions ?? {}),
         ignored: ['**/node_modules/**', '**/.git/**', '**/public/alphatab/**'],
       };
       return config;
     },
   };

   export default nextConfig;
   ```

3. **Switch the scripts.** `web/package.json`: `dev` becomes `next dev --webpack`, `build` becomes
   `next build --webpack`. `start` takes **no** bundler flag — `next start --webpack` is rejected by
   Next 16.2.10 with `error: unknown option '--webpack'`, even though the official sample's
   `package.json` still lists it. If `web/vercel.json` ever pins a `buildCommand`, it must match.

4. **Import AlphaTab normally.** `import * as alphaTab from '@coderline/alphatab'` — a real value
   import, no `turbopackIgnore`, no runtime-URL variable, no `as AlphaTabModule` cast. Point
   `settings.core.fontDirectory` at `/alphatab/font/` and `settings.player.soundFont` at
   `/alphatab/soundfont/sonivox.sf3`.

5. **Delete what the plugin replaces:** the vendoring script and its `node --test` cover (Plan A
   Task 2), and the ESLint value-import fence (Task 3), which would then be banning correct code.
   Task 5's memoised loader collapses to a plain module import. Keep the `public/alphatab/`
   `.gitignore` entry — the plugin's output is still generated.

6. **What does not change:** Task 7's regression test. The worklet fetch is unobservable to
   Playwright on both routes, so its premise and mechanism carry over untouched.

## What was not tested

- A real Vercel deploy with `buildCommand: next build --webpack`.
- The plugin inside the actual `web/` app. A faithful mirror was used instead, so that the other
  session working in this worktree was not disturbed. The design system's Phase-1 public surface is
  only `Button`, so that part of the mirror is complete rather than a sample.
- iPad and Android, which are outside the v0 gate anyway.
- The Playwright e2e lane end to end against the webpack route.
