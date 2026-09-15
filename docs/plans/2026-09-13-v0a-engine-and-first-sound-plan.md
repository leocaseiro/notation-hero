---
lap: 2 # the 2026-09-14 review was lap 1; the 2026-09-15 triage is lap 2
last_applied: P0
---

# v0 Plan A — Engine and First Sound — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open a drum score from local disk on `/play`, see it as standard notation, press play, and hear it — with a CI lane that proves the real audio-worker path is live rather than the silent main-thread fallback.

**Architecture:** Next.js 16 App Router in `web/`, two routes (`/` landing, `/play` player). AlphaTab is never bundled: its prebuilt ESM is copied out of `node_modules` into `web/public/alphatab/` by a vendoring step and pulled in at runtime through a `turbopackIgnore` dynamic import, which restores a real `http` `import.meta.url` and therefore native module workers. A single `'use client'` component owns the `AlphaTabApi` in a `useRef` and disposes it on unmount; the loaded namespace object is shared to other `web/` components through a React context, because a value import of `@coderline/alphatab` would re-bundle the library.

**Tech Stack:** Next.js 16.2.10 (App Router, Turbopack, React Compiler), React 19.2, `@coderline/alphatab` 1.8.4 (type-only), `@notation-hero/client` design system, Playwright 1.61.1 + `@axe-core/playwright` 4.12.1.

**Spec:** [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) — read §4, §5 and §7 before starting. This plan argues from that spec; where they disagree, the spec wins and this plan is wrong.

**Jira:** epic [NH-291](https://leocaseiro.atlassian.net/browse/NH-291). Put an `NH-291` key in every branch, PR title and commit trailer line — the `pr-checklist` CI gate requires a real key.

**Sibling plans:** Plan B (transport: scrubber, tempo, Loop/Metronome/Count-In) and Plan C (Settings and Tracks popovers) build on this one. Anything this plan marks "Plan B" or "Plan C" is deliberately out of scope here.

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **`@coderline/alphatab` may be imported ONLY with `import type`.** One value import — even of an enum — makes Turbopack bundle the library a second time, and a component can then drive the bundled copy, which restores the silent-playback failure. All runtime AlphaTab values (`LayoutMode`, `ScrollMode`, `PlayerMode`, `TrackNamePolicy`, `importer.ScoreLoader`, `model.Color`, `model.Font`, `synth.PlayerState`) come from the awaited namespace object only. **No module-scope constant may reference one.**
- **The dynamic-import specifier must be a `const` variable, never a string literal.** A literal makes `tsc` resolve it at compile time and fail the build; holding it in a `const` also stops Turbopack re-bundling it.
- **Minified dist files are copied under their PLAIN names.** `alphaTab.min.mjs` imports `./alphaTab.core.mjs` internally, so a minified copy stored under a `.min` name makes the browser fetch the full 2.3 MB core instead of the minified one.
- **`web/public/alphatab/` is generated output** — git-ignored, never committed. The spike's committed copies get removed.
- **Never `dynamic(..., { ssr: false })`.** It is illegal in an App Router Server Component and unnecessary: AlphaTab's module scope is SSR-safe.
- **`useRef`, never `React.createRef()` in a render body.**
- **Every interactive control has a hit area of at least 44 px**, with the glyph left at its drawn size. The mockup does not meet this; v0 must.
- **Every `client/` component stays presentation-only** — `value` in, `onChange` out, option lists as plain arrays, and no import from `@coderline/alphatab`. `client/` has no AlphaTab dependency and a Storybook story has no engine to provide. Task 3 makes the import ban a lint error in `client/`.
- **Before `web/` uses a `client/` component:** export it from `client/src/index.ts`, add `'use client'` to its file, and re-run the client checks plus the Storybook VR and a11y gates.
- **Version ranges are syncpack-enforced across packages.** `@playwright/test` must be `^1.61.1` and `@axe-core/playwright` must be `^4.12.1` in `web/` — `client/`'s exact ranges — or the `quality` job fails.
- **The `web/` Playwright script must NOT be named `test`.** The `quality` job runs `pnpm -r --if-present run test` with no browsers installed. Name it `test:e2e`.
- **`pnpm` does not run `pre<script>` hooks.** `enablePrePostScripts` defaults to false in pnpm 11 and is not set in `pnpm-workspace.yaml`, so a `prebuild` script would silently never run. Chain vendoring explicitly inside `dev` and `build`.
- **Default branch is `master`.** Never pass `git commit/push --no-verify`. Commit at every green step.
- **Tests are co-located with their source.** Never create `__tests__/`, `__mocks__/` or `stories/` directories — `tooling/check-layout.sh` fails the build on them.
- **New vocabulary goes in `cspell.json`.** `alphatab`, `sonivox`, `Turbopack`, `Worklet`, `worklets`, `coderline`, `musicxml`, `capx` and `unminified` are already listed, and `Bravura` resolves from a bundled dictionary. Add anything new that `pnpm run lint:spell` flags — it covers `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.md`, `.json`, `.yml` and `.yaml`, so a word only in a `.css` comment is never checked.
- **A notation file is rejected above 25 MB, before it is read.** `ScoreLoader.loadScoreFromBytes`
  is synchronous and runs on the main thread, and drag-and-drop applies no extension filter at all,
  so an unbounded read freezes or crashes the tab with no message and no `try`/`catch` that can
  recover. Notation-only files are 3-16 KB, but a Guitar Pro file with an embedded backing track is
  legitimately 7-8 MB — so the bound is generous. The check runs before `file.arrayBuffer()` and
  raises the same unsupported-file toast a parse failure raises. It does NOT bound decompressed
  size: `.gpx` is a ZIP container AlphaTab inflates, which would need a worker-side bound (post-v0).
- **`package.json` keys stay sorted.** `pnpm run lint:sort-pkg` (`sort-package-json --check`) is a CI gate.
- **`globalThis`, never `window`, in `web/` code.** `unicorn/prefer-global-this` is an error there:
  `window.setTimeout`, `window.addEventListener` and `window.confirm` all fail lint, and their
  `globalThis.*` forms pass both lint and `tsc`. `no-alert` is not enabled in `web/`, so never add an
  `eslint-disable` for it — an unused directive is a warning, and lint runs with `--max-warnings 0`.

## Open questions closed during planning

Both gaps the spec left open for v0 were closed on 2026-09-14 by **running** the pinned importer
rather than by reasoning about it. Neither ships unverified.

- **Q6 — MusicXML fixture. Closed.** Real exports, verified with `@coderline/alphatab` 1.8.4 on
  2026-09-15 and already committed in `web/e2e/fixtures/`: `1-beat.mxl` (compressed MusicXML, a
  MuseScore export — 1 track, percussion) and `1-beat.musicxml` (the `score.xml` inside it,
  uncompressed); `Punk.mxl` (MuseScore, 3 tracks — the same shape as `Punk.gp`); and the alphaTex
  exports `1-beat.atex` and `Punk.alphatex` (Tabtify; `.atex` is the extension AlphaTab's docs
  recommend). Plain and compressed MusicXML take different code paths in the importer, so both are
  tested. **`ScoreLoader` never sees a filename** — it loops `Environment.buildImporters()` and
  breaks on the first importer that does not throw — so the picker's `accept` list is a UI filter
  only. Note `web/e2e/fixtures/1-beat.xml` is a Guitar Pro v5.10 binary wearing an `.xml`
  name (it opens `18 46 49 43 48 49 45 52` — the length-prefixed `FICHIER GUITAR PRO v5.10`): it is
  GP5 coverage, not MusicXML coverage.
- **Q7 — percussion-free fixture. Closed.** `web/e2e/fixtures/guitar-no-percussion.gp` (2,866 bytes)
  is generated from a one-line alphaTex string via `importer.AlphaTexImporter` + `exporter.Gp7Exporter`
  and round-trips through `ScoreLoader.loadScoreFromBytes` as one track, one staff,
  `isPercussion = false`. Success criterion 9 is verified by running, not by reading.

**Correction that applies to every task below: AlphaTab has no "default track".**
`renderScore(score, undefined)` renders `score.tracks[0]` — the FIRST track
(`if (!trackIndexes) { … tracks.push(score.tracks[0]); }` in `alphaTab.core.mjs`). That is fine for a
percussion-free score, where any track is as good as another, but never describe it as a preference.

---

## Deferred past v0

The review that produced this plan also surfaced thirteen items we are deliberately **not** doing in
v0 — a bundle-count CI gate, CSP headers for `web/`, a decompressed-size bound for `.gpx`, a test
behind the "nothing leaves this device" claim, a `PlayPauseButton` in `client/`, an `AlertDialog` to
replace `window.confirm`, an iOS picker branch, Sentry, and five smaller
open questions. They are tracked together as a Smart Checklist on
**[NH-298](https://leocaseiro.atlassian.net/browse/NH-298)**, with enough context on each to act
without this plan. Nothing in the tasks below depends on any of them.

---

## File Structure

**Created**

| File                                         | Responsibility                                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `web/scripts/vendor-alphatab.mjs`            | Copy AlphaTab's prebuilt ESM, soundfont and music font out of `node_modules` into `web/public/alphatab/`, under plain (non-`.min`) names. |
| `tooling/vendor-alphatab.test.mjs`           | `node --test` cover for that copy step — joins the existing `pnpm run test:tooling` gate.                                                 |
| `tooling/alphatab-import-fence.test.sh`      | Proves both AlphaTab import fences still fire (`web/`: value imports; `client/`: any import) — joins the same `test:tooling` gate.        |
| `web/lib/alphatab/engine.ts`                 | `loadAlphaTabEngine()` — the `turbopackIgnore` dynamic import, memoised so two mounts share one module. No font wait (see Task 5).        |
| `web/lib/alphatab/AlphaTabEngineContext.tsx` | React context carrying the loaded namespace to `web/` consumers, and the `useAlphaTabEngine()` reader.                                    |
| `web/lib/alphatab/drum-tracks.ts`            | Pure: a score's track list in, the indexes of percussion tracks out. No AlphaTab import — a structural type.                              |
| `web/app/play/page.tsx`                      | The `/play` route segment.                                                                                                                |
| `web/app/play/PlayerShell.tsx`               | `'use client'` root of the player: owns loaded-score state, the engine provider, toasts.                                                  |
| `web/app/play/NotationSurface.tsx`           | Owns the `AlphaTabApi` instance, its lifecycle, the loading `Skeleton` and the error states.                                              |
| `web/app/play/OpenFileControl.tsx`           | File picker + drag-and-drop + the replace-confirmation flow.                                                                              |
| `web/app/play/EmptyState.tsx`                | The no-file-yet surface: big Open file, secondary Load the sample beat.                                                                   |
| `web/playwright.e2e.config.ts`               | The `web` browser lane — `next build` then `next start`, with `NEXT_PUBLIC_ALPHATAB_LOG_LEVEL=Debug`.                                     |
| `web/e2e/player.e2e.ts`                      | The silent-failure regression test plus the player's behaviour tests.                                                                     |
| `web/e2e/a11y.e2e.ts`                        | axe-core over `/` and `/play` in its reachable states, plus the 44 px hit-area gate.                                                      |
| `web/lib/alphatab/drum-tracks.test.ts`       | Co-located unit cover for `selectDrumTrackIndexes` — plain objects, no browser.                                                           |
| `web/app/error.tsx`                          | Root React error boundary (App Router `error.tsx` convention) — the app survives an unexpected render crash.                              |
| `web/app/play/error.tsx`                     | Player-segment error boundary, so a crash in the player leaves the landing page alive.                                                    |
| `web/e2e/fixtures/guitar-no-percussion.gp`   | Generated via `AlphaTexImporter` + `Gp7Exporter` — closes Q7 and success criterion 9.                                                     |

**Modified**

| File                                             | Change                                                                                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/package.json`                               | `dev`/`build` chain the vendor step; add `test:e2e`; add Playwright + axe devDependencies.                                                                  |
| `web/.gitignore`                                 | Ignore `/public/alphatab/`.                                                                                                                                 |
| `web/eslint.config.mjs`                          | Swap the core `no-restricted-imports` for `@typescript-eslint/no-restricted-imports` and add the `@coderline/alphatab` group with `allowTypeImports: true`. |
| `client/eslint.config.js`                        | Ban every `@coderline/alphatab` import, type imports included: `client/` is presentation-only, and `transpilePackages` compiles it into `web/`'s bundle.    |
| `web/app/layout.tsx`                             | Mount the single `<Toaster />`.                                                                                                                             |
| `web/app/page.tsx`                               | Replace the design-system proof page with the landing Play button.                                                                                          |
| `client/src/index.ts`                            | Export `Skeleton`, `Toaster`, `toast`, `Card`, `CardContent`.                                                                                               |
| `client/src/components/ui/Skeleton/Skeleton.tsx` | Add `'use client'`.                                                                                                                                         |
| `client/src/components/ui/Sonner/Sonner.tsx`     | Add `'use client'`.                                                                                                                                         |
| `client/src/components/ui/Card/Card.tsx`         | Add `'use client'`.                                                                                                                                         |
| `client/src/styles.css`                          | Override the Material Symbols face to `font-display: block`.                                                                                                |
| `.github/workflows/ci.yml`                       | Add the `web` steps to the `e2e` job and its artifact paths.                                                                                                |
| `web/vercel.json`                                | Add `buildCommand` so the vendor step is unconditional and cannot be overridden invisibly from the dashboard.                                               |
| `web/public/charts/` -> `web/public/notation/`   | Renamed with its three files; every `/charts/...` URL becomes `/notation/...`. "chart" is not this project's vocabulary (CONCEPTS.md).                      |

**Deleted**

| File                                      | Why                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `web/public/alphatab/**` (tracked copies) | Generated output — the vendor step now produces it.                                                        |
| `web/public/alphatab/alphaTab.min.js`     | The classic build, only variant A needed it.                                                               |
| `web/app/spike/AlphaTabDrums.tsx`         | Variant A — carries the value import the Task 3 fence bans, and loads the `alphaTab.min.js` deleted above. |
| `web/app/spike/SpikeHarness.tsx`          | Variant A's harness.                                                                                       |
| `web/app/spike/page.tsx`                  | The `/spike` route — scratch quality, must not ship.                                                       |
| `web/app/spike/esm/**`                    | The `/spike/esm` route; Task 1 is its last consumer.                                                       |
| `web/spike-probe.mjs`                     | Scratch probe.                                                                                             |
| `web/spike-lifecycle-probe.mjs`           | Scratch probe.                                                                                             |

---

### Task 1: Verify D5's one unverified premise — Vercel MIME types (Q2)

D5 stands: we stay on Turbopack with the self-hosted ESM import. Everything downstream hangs off that working on Vercel's CDN, so this is checked **before** any player code is written. No application code changes in this task.

**Files:**

- Modify: `docs/specs/2026-09-10-v0-local-file-player-design.md` (the Q2 row in §9)

**Interfaces:**

- Consumes: nothing.
- Produces: a go/no-go on decision D5. Every later task assumes "go".

- [ ] **Step 1: Push the spike branch so Vercel builds a preview**

```bash
git push origin spike/alphatab-nextjs-poc
gh pr list --head spike/alphatab-nextjs-poc --json number,url
```

If no PR exists yet, open one — Vercel builds previews from pull requests:

```bash
gh pr create --title "ci(web): verify Vercel MIME types for self-hosted AlphaTab ESM (NH-291)" \
  --body "Q2 gate for the v0 spec: confirm public/alphatab/esm/*.mjs are served as JavaScript."
# `ci`, NOT `spike`: the required pr-title job (.github/workflows/ci.yml:433) pipes the PR title
# through commitlint, and commitlint.config.cjs extends @commitlint/config-conventional with no
# custom type-enum — `spike` is not an allowed type, so ci-green would never go green.
# This PR is the one Task 14 retitles; do not open a second one for this branch.
```

- [ ] **Step 2: Read the preview URL off the PR**

```bash
gh pr view --json number -q .number
gh api "repos/:owner/:repo/deployments?environment=Preview&per_page=5" \
  --jq '.[] | {id, ref, environment, created_at}'
```

Vercel also comments the preview URL on the PR. Take the `https://<project>-<hash>.vercel.app` URL and hold it in a shell variable:

```bash
PREVIEW=https://<paste-the-preview-url>
```

- [ ] **Step 3: Assert each vendored ESM file is HTTP 200 with a JavaScript MIME type**

```bash
for f in alphaTab.mjs alphaTab.core.mjs alphaTab.worker.mjs alphaTab.worklet.mjs; do
  printf '%s -> ' "$f"
  curl -sSI "$PREVIEW/alphatab/esm/$f" | awk 'tolower($1) ~ /^(http|content-type)/ {print}' | tr '\n' ' '
  printf '\n'
done
```

Expected: every line shows `HTTP/2 200` and a `content-type:` of `text/javascript` or `application/javascript` (a `charset` suffix is fine).

**A `content-type` of `application/octet-stream`, `text/plain`, or anything else is a FAIL.** The browser refuses to execute a module served with a non-JavaScript MIME type, `addModule` rejects with `Audio Worklet creation failed`, and D5 does not hold. **Stop the plan and re-open decision D5 with leocaseiro** — do not work around it. For that conversation only: the registry keeps a verified webpack recipe as D5's emergency fallback (`docs/spikes/2026-09-14-alphatab-webpack-vs-turbopack.md`).

- [ ] **Step 4: Load the spike route and confirm the platform in the browser**

Open `$PREVIEW/spike/esm`. The status block on that page prints `Environment.webPlatform`. Expected: **`BrowserModule`**. `Browser` (without `Module`) means the worker lookup fell back and D5 does not hold — same stop condition as Step 3.

- [ ] **Step 5: Record the answer in the spec**

Edit the Q2 row of §9 in `docs/specs/2026-09-10-v0-local-file-player-design.md` so it states the observed result, e.g.:

```markdown
| Q2 | **Answered (2026-09-13): Vercel serves `public/alphatab/esm/*.mjs` as `text/javascript`, and `/spike/esm` reports `Environment.webPlatform = BrowserModule` on the deployed preview — D5 holds.** CDN compression for `.sf3` is a cost question, not a correctness one, and still waits for the v0 deploy. | `.sf3` compression: v0 deploy |
```

- [ ] **Step 6: Commit**

```bash
git add docs/specs/2026-09-10-v0-local-file-player-design.md
git commit -m "docs(specs): close Q2 — Vercel serves the vendored ESM as JavaScript (NH-291)"
```

---

### Task 2: Vendor AlphaTab's prebuilt assets out of node_modules

The four ESM files, the soundfont and the music font stop being committed blobs and become generated output produced before every `dev` and `build`.

**Files:**

- Create: `web/scripts/vendor-alphatab.mjs`
- Create: `tooling/vendor-alphatab.test.mjs`
- Modify: `web/package.json`
- Modify: `web/.gitignore`
- Delete: the tracked contents of `web/public/alphatab/`

**Interfaces:**

- Consumes: nothing.
- Produces: `web/public/alphatab/esm/alphaTab.mjs`, `.../alphaTab.core.mjs`, `.../alphaTab.worker.mjs`, `.../alphaTab.worklet.mjs`, `web/public/alphatab/soundfont/sonivox.sf3`, `web/public/alphatab/font/Bravura.woff2` and the two licence files. Task 5 hard-codes `/alphatab/esm/alphaTab.mjs` against these paths; Task 6 hard-codes `/alphatab/soundfont/sonivox.sf3` and `/alphatab/font/`. The module also exports `VENDOR_FILES` and `vendorAlphaTab({ dist, out })` for the test.

- [ ] **Step 1: Write the failing test**

Create `tooling/vendor-alphatab.test.mjs`:

```js
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { VENDOR_FILES, vendorAlphaTab } from '../web/scripts/vendor-alphatab.mjs';

const DIST = new URL('../web/node_modules/@coderline/alphatab/dist/', import.meta.url).pathname;

test('copies the minified ESM under PLAIN names so the core import resolves to the minified core', () => {
  const out = mkdtempSync(join(tmpdir(), 'vendor-alphatab-'));
  try {
    vendorAlphaTab({ dist: DIST, out });

    // alphaTab.min.mjs imports './alphaTab.core.mjs'. If the minified core landed under a
    // '.min' name the browser would fetch the 2.3 MB unminified core instead, so assert both
    // the plain filename AND that the bytes are the minified build (roughly half the size).
    const entry = readFileSync(join(out, 'esm/alphaTab.mjs'), 'utf8');
    assert.match(entry, /alphaTab\.core\.mjs/);

    const core = statSync(join(out, 'esm/alphaTab.core.mjs'));
    assert.ok(core.size < 1_500_000, `core is ${core.size} bytes — that is the unminified build`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('copies every declared file, including the worker, worklet, soundfont, font and licences', () => {
  const out = mkdtempSync(join(tmpdir(), 'vendor-alphatab-'));
  try {
    const copied = vendorAlphaTab({ dist: DIST, out });

    assert.deepEqual([...copied].sort(), [...VENDOR_FILES.map(([, to]) => to)].sort());
    for (const [, to] of VENDOR_FILES) {
      assert.ok(statSync(join(out, to)).size > 0, `${to} is empty`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('fails loudly when a source file is missing rather than shipping a broken public/', () => {
  const out = mkdtempSync(join(tmpdir(), 'vendor-alphatab-'));
  try {
    assert.throws(
      () => vendorAlphaTab({ dist: join(out, 'does-not-exist'), out }),
      /missing source/,
    );
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tooling/vendor-alphatab.test.mjs`
Expected: FAIL — `Cannot find module '.../web/scripts/vendor-alphatab.mjs'`.

- [ ] **Step 3: Write the vendoring script**

Create `web/scripts/vendor-alphatab.mjs`:

```js
// Copies AlphaTab's prebuilt ESM + assets out of node_modules into web/public/alphatab/.
//
// AlphaTab spawns a render worker and an audio worklet and locates them from `import.meta.url`.
// Turbopack does not leave that usable in a production chunk, so the worker construction fails and
// playback silently dies while notation still renders. Serving the prebuilt ESM from public/
// restores a real http URL, which makes `Environment.webPlatform` report `BrowserModule`.
//
// Generated output: web/public/alphatab/ is git-ignored and rebuilt before every dev and build.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * [source path under dist/, destination path under the output directory].
 *
 * The four ESM files land under their PLAIN names on purpose: alphaTab.min.mjs imports
 * './alphaTab.core.mjs' internally, so a minified copy kept under a '.min' name would make the
 * browser fetch the 2.3 MB unminified core instead of the 1.1 MB minified one.
 */
export const VENDOR_FILES = [
  ['alphaTab.min.mjs', 'esm/alphaTab.mjs'],
  ['alphaTab.core.min.mjs', 'esm/alphaTab.core.mjs'],
  ['alphaTab.worker.min.mjs', 'esm/alphaTab.worker.mjs'],
  ['alphaTab.worklet.min.mjs', 'esm/alphaTab.worklet.mjs'],
  ['soundfont/sonivox.sf3', 'soundfont/sonivox.sf3'],
  ['soundfont/LICENSE', 'soundfont/LICENSE'],
  ['font/Bravura.woff2', 'font/Bravura.woff2'],
  ['font/Bravura-OFL.txt', 'font/Bravura-OFL.txt'],
];

/**
 * @param {{ dist: string, out: string }} options
 * @returns {string[]} the destination paths written, relative to `out`
 */
export function vendorAlphaTab({ dist, out }) {
  const copied = [];
  for (const [from, to] of VENDOR_FILES) {
    const source = join(dist, from);
    if (!existsSync(source)) {
      throw new Error(
        `vendor-alphatab: missing source ${source} — run pnpm install, or check that ` +
          '@coderline/alphatab is still pinned at 1.8.4.',
      );
    }
    const destination = join(out, to);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    copied.push(to);
  }
  return copied;
}

// Only copy when invoked directly, so the test can import vendorAlphaTab without side effects.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const copied = vendorAlphaTab({
    dist: resolve(HERE, '../node_modules/@coderline/alphatab/dist'),
    out: resolve(HERE, '../public/alphatab'),
  });
  console.log(`vendor-alphatab: copied ${copied.length} files into web/public/alphatab/`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tooling/vendor-alphatab.test.mjs`
Expected: PASS — 3 tests.

- [ ] **Step 5: Remove the committed copies and ignore the directory**

```bash
git rm -r --cached web/public/alphatab
rm -rf web/public/alphatab
```

Append to `web/.gitignore`:

```gitignore
# AlphaTab's prebuilt ESM + soundfont + music font, copied out of node_modules by
# scripts/vendor-alphatab.mjs before every dev/build. Generated output — never committed.
/public/alphatab/
```

- [ ] **Step 6: Chain the vendor step into `dev` and `build`**

In `web/package.json`, replace the `build` and `dev` scripts. **Do not use a `prebuild` hook** — pnpm 11 defaults `enablePrePostScripts` to false and this repo does not set it, so a `prebuild` script would never run and CI would build against an empty `public/alphatab/`:

```json
{
  "scripts": {
    "build": "node scripts/vendor-alphatab.mjs && next build",
    "dev": "node scripts/vendor-alphatab.mjs && next dev --port 3002",
    "lint": "eslint . --max-warnings 0",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 7: Pin the build command in `web/vercel.json`**

Vercel's Next.js preset does run the package's `build` script — its docs say it "checks for the
`build` command in `scripts` and uses this to build the project", falling back to `next build`
only if absent. But the documented precedence is `vercel.json buildCommand` -> dashboard Override
-> `package.json scripts.build` -> framework default, and the dashboard Override has no
representation in this repo. If anyone ever sets it to `next build`, every engine asset 404s on
the deploy and no local gate notices. Pin it in the file a reviewer actually reads:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "corepack enable && pnpm install --frozen-lockfile",
  "buildCommand": "node scripts/vendor-alphatab.mjs && next build"
}
```

- [ ] **Step 8: Verify a clean build regenerates the assets**

```bash
pnpm --filter @notation-hero/web run build
ls -la web/public/alphatab/esm web/public/alphatab/soundfont web/public/alphatab/font
git status --short web/public
```

Expected: the eight files exist, `alphaTab.core.mjs` is ~1.1 MB (not 2.3 MB), `next build` succeeds, and `git status` reports **nothing** under `web/public/alphatab/`.

- [ ] **Step 9: Run the repo-level gates this touches**

```bash
pnpm run test:tooling
pnpm run lint:sort-pkg
pnpm --filter @notation-hero/web run lint
```

Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add web/scripts/vendor-alphatab.mjs tooling/vendor-alphatab.test.mjs \
  web/package.json web/.gitignore web/public
git commit -m "build(web): vendor AlphaTab's prebuilt ESM from node_modules (NH-291)"
```

- [ ] **Step 11: Re-verify the generated assets on a Vercel preview**

Task 1 checked the committed copies, and Step 5 deleted them. Check the generated ones now, before
Tasks 3-13 build on them. Push to the PR Task 1 opened — Vercel rebuilds its preview — and read the
new preview URL off the PR, as in Task 1 Step 2:

```bash
git push
PREVIEW=https://<the new preview URL>
for f in esm/alphaTab.mjs esm/alphaTab.core.mjs esm/alphaTab.worker.mjs esm/alphaTab.worklet.mjs \
  font/Bravura.woff2 soundfont/sonivox.sf3; do
  printf '%s -> ' "$f"
  curl -sSI "$PREVIEW/alphatab/$f" | awk 'tolower($1) ~ /^(http|content-type)/ {print}' | tr '\n' ' '
  printf '\n'
done
```

Expected: `HTTP/2 200` for all six, and a JavaScript `content-type` for the four `.mjs` files.

- **404s, and the Vercel build log shows the vendor script's `missing source` error:** the script
  could not read `node_modules` through the pnpm symlink outside `web/` — a Root Directory setting
  problem, not a `buildCommand` one.
- **404s, and the build log shows no vendor output at all:** the pinned `buildCommand` did not run.
- **A `.mjs` file with a non-JavaScript `content-type`:** Task 1's FAIL — stop and re-open D5 with
  leocaseiro.

---

### Task 3: Guard the type-only import of `@coderline/alphatab`

One value import re-bundles the library, ships it twice, and lets a component drive the bundled copy — which silently kills playback. A lint rule is the only thing that stops it coming back.

**Files:**

- Modify: `web/eslint.config.mjs:49-65` (the `no-restricted-imports` block)
- Modify: `client/eslint.config.js` (the client-specific rules block)
- Create: `tooling/alphatab-import-fence.test.sh`

**Interfaces:**

- Consumes: nothing.
- Produces: every later task's `import type * as AlphaTab from '@coderline/alphatab'` stays legal in `web/` while a value import fails lint. In `client/`, any import of it fails lint.

- [ ] **Step 1: Write the failing test — a scratch file with a value import**

```bash
cat > web/lint-guard-probe.ts <<'EOF'
import { LayoutMode } from '@coderline/alphatab';

export const probe = LayoutMode.Page;
EOF
```

- [ ] **Step 2: Run lint to verify it currently PASSES (the bug)**

Run: `pnpm --filter @notation-hero/web exec eslint lint-guard-probe.ts`
Expected: **no error** — today nothing restricts `@coderline/alphatab`. That is the hole this task closes.

- [ ] **Step 3: Replace the core rule with the type-aware extension rule**

In `web/eslint.config.mjs`, replace the final rules block (the one holding `no-restricted-imports`) with:

```js
  // Two import fences, both on the TYPE-AWARE extension rule.
  //
  // `@/*` (unchanged intent, NH-275 review F4): the tsconfig alias exists only so Turbopack can
  // resolve the transpiled client package's internal '@/lib/utils'; app code must go through the
  // @notation-hero/client barrel.
  //
  // `@coderline/alphatab` (v0 spec §5): type imports only. One VALUE import — even of an enum —
  // makes Turbopack bundle AlphaTab a second time. A component can then drive the bundled copy,
  // whose worker lookup is broken, and playback dies silently while notation still renders.
  // Runtime values come from the namespace object awaited in lib/alphatab/engine.ts.
  //
  // The @typescript-eslint version is required for `allowTypeImports`, and it needs the core rule
  // OFF or both fire.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*'],
              message:
                'Do not use the @/* alias in web app code — it reaches into client/src and bypasses the @notation-hero/client barrel. Import from @notation-hero/client or use a relative path.',
            },
            {
              group: ['@coderline/alphatab', '@coderline/alphatab/*'],
              allowTypeImports: true,
              message:
                'Import @coderline/alphatab with `import type` only. A value import makes Turbopack bundle AlphaTab a second time and silently breaks playback — get runtime values from the namespace object returned by loadAlphaTabEngine() in lib/alphatab/engine.ts.',
            },
          ],
        },
      ],
    },
  },
```

- [ ] **Step 4: Run lint to verify the value import now fails**

Run: `pnpm --filter @notation-hero/web exec eslint lint-guard-probe.ts`
Expected: FAIL — `@typescript-eslint/no-restricted-imports` on line 1, with the message above.

- [ ] **Step 5: Verify a type import still passes**

```bash
cat > web/lint-guard-probe.ts <<'EOF'
import type * as AlphaTab from '@coderline/alphatab';

export type Probe = AlphaTab.AlphaTabApi;
EOF
```

Run: `pnpm --filter @notation-hero/web exec eslint lint-guard-probe.ts`
Expected: PASS — `allowTypeImports: true` lets it through.

- [ ] **Step 6: Delete the spike surface**

Seven spike files are tracked on this branch and absent from `master`. `web/app/spike/AlphaTabDrums.tsx:9`
is `import * as alphaTab from '@coderline/alphatab';` — a VALUE import, exactly what the fence above
bans — so the package lint below fails until it is gone, and so does every later `check:all`
(Tasks 6, 13, 14) and the CI `lint` job. Keeping it is not an option either: Task 2 deletes
`web/public/alphatab/alphaTab.min.js`, which `AlphaTabDrums.tsx:87` loads at runtime via
`settings.core.scriptFile`, so `/spike` dies silently after Task 2 regardless — and a route whose
own header reads "scratch quality on purpose" would ship on the demo URL.

Task 1 is the last consumer of `/spike/esm` (it reads `Environment.webPlatform` off that page), so
this is the first moment the whole surface can go.

```bash
git rm -r web/app/spike
git rm web/spike-probe.mjs web/spike-lifecycle-probe.mjs
```

- [ ] **Step 7: Delete the probe and lint the whole package**

```bash
rm web/lint-guard-probe.ts
pnpm --filter @notation-hero/web run lint
```

Expected: PASS — the only value import in the package was variant A's, deleted in Step 6.

- [ ] **Step 8: Fence `client/` too — no AlphaTab import at all**

`web/next.config.ts` sets `transpilePackages: ['@notation-hero/client']`, so `client/src` is compiled
into `web/`'s bundle, and Plans B and C add `client/` components. A value import there would bundle
AlphaTab a second time. Today `client/` cannot import it at all — it has no `@coderline/alphatab`
dependency, so `tsc` fails with `TS2307` — but that guard disappears the day someone adds the
dependency to type a prop. `client/` is presentation-only (spec §7), so its fence bans **every**
import, type imports included.

In `client/eslint.config.js`, add to the client-specific rules block:

```js
      // client/ is presentation-only (v0 spec §7): it takes AlphaTab values as props and imports
      // nothing from the library, not even a type. It is also compiled into web/'s bundle
      // (transpilePackages), so a value import here would bundle AlphaTab a second time. The core
      // rule is enough, because unlike web/'s fence this one must NOT allow type imports.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@coderline/alphatab', '@coderline/alphatab/*'],
              message:
                'client/ components take AlphaTab values as props — import nothing from @coderline/alphatab (v0 spec §7).',
            },
          ],
        },
      ],
```

**Do not move either group into `eslint.config.base.mjs`.** In flat config, a later block's options
for the same rule _replace_ an earlier block's. `web/`'s own `@/*` block comes after `...base`, so a
group defined in the base silently disappears from `web/` — reproduced with a two-block config, where
only the later block's group fired. `server/` also sets its own `no-restricted-imports`.

- [ ] **Step 9: Prove the client fence fires — on a type import**

A type import is the strict case: `web/` allows it, `client/` must not.

```bash
cat > client/src/lint-guard-probe.ts <<'EOF'
import type * as AlphaTab from '@coderline/alphatab';

export type Probe = AlphaTab.AlphaTabApi;
EOF
pnpm --filter @notation-hero/client exec eslint src/lint-guard-probe.ts
```

Expected: FAIL — `no-restricted-imports` on line 1, with the message above. Then delete the probe and
lint the package:

```bash
rm client/src/lint-guard-probe.ts
pnpm --filter @notation-hero/client run lint
```

Expected: PASS.

- [ ] **Step 10: Keep both fences under a committed test**

Steps 4 and 9 prove the fences once, with probe files that are then deleted. Nothing proves later
that they still fire, and flat config makes a silent loss easy: a
`@typescript-eslint/no-restricted-imports` block added to `web/eslint.config.mjs` after this task's
block replaces its options, and lint stays green. Reproduced on 2026-09-16: a later block banning an
unrelated package dropped the AlphaTab group, and a value import linted clean. This test follows
`tooling/check-core-purity-canary.sh` and needs no CI wiring — `pnpm run test:tooling` already runs
every `tooling/*.test.sh`, and the `quality` job requires it.

Create `tooling/alphatab-import-fence.test.sh`:

```bash
#!/usr/bin/env bash
#
# AlphaTab import-fence test (v0a plan, Task 3) — proves both lint fences still REJECT a forbidden
# @coderline/alphatab import, so a later config change cannot switch them off unnoticed.
#
#   web/     type imports only: a VALUE import must fail @typescript-eslint/no-restricted-imports.
#   client/  nothing at all: even a TYPE import must fail no-restricted-imports (v0 spec §7).
#
# A one-time probe is not enough. In ESLint flat config a later block's options for a rule REPLACE
# an earlier block's, so a no-restricted-imports block added after Task 3's would drop the AlphaTab
# group while lint stays green. Runs under `pnpm run test:tooling` (every tooling/*.test.sh), a
# required step of the CI `quality` job. The probe files are ephemeral and never committed.
#
# NOTE: deliberately NOT `set -e` — eslint is EXPECTED to exit non-zero (the fence firing).
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
[ -n "$ROOT" ] || { printf '::error::alphatab-import-fence.test.sh must run inside the git work tree\n' >&2; exit 1; }
cd "$ROOT" || exit 1

# Unique per-process names, so concurrent runs never delete each other's probe mid-lint.
WEB_PROBE="app/__alphatab_fence_probe_$$__.ts"
CLIENT_PROBE="src/__alphatab_fence_probe_$$__.ts"
# shellcheck disable=SC2317,SC2329 # cleanup IS invoked via trap EXIT (SC2329 = shellcheck >=0.10; SC2317 = older CI shellcheck)
cleanup() { rm -f "web/$WEB_PROBE" "client/$CLIENT_PROBE"; }
trap cleanup EXIT

printf "import { LayoutMode } from '@coderline/alphatab';\n\nexport const probe = LayoutMode.Page;\n" > "web/$WEB_PROBE" \
  || { printf '::error::failed to write the web/ probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }
printf "import type * as AlphaTab from '@coderline/alphatab';\n\nexport type Probe = AlphaTab.AlphaTabApi;\n" > "client/$CLIENT_PROBE" \
  || { printf '::error::failed to write the client/ probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }

# expect_rejected <package> <probe path inside the package> <ERE for the rule id>
expect_rejected() {
  local out rc
  out="$(pnpm --filter "@notation-hero/$1" exec eslint "$2" 2>&1)"
  rc=$?
  # A whole rule id, so an unrelated error (a parse failure, a missing module) cannot pass for the
  # fence, and neither can a renamed rule.
  if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qE "(^|[[:space:]])$3([[:space:]]|$)"; then
    echo "ok — $1/ rejects the probe"
  else
    printf '::error::the %s/ AlphaTab import fence did not fire (eslint exit %s)\n%s\n' "$1" "$rc" "$out" >&2
    exit 1
  fi
}

# web/ needs the @typescript-eslint version: only it has allowTypeImports. client/ may use either.
expect_rejected web "$WEB_PROBE" '@typescript-eslint/no-restricted-imports'
expect_rejected client "$CLIENT_PROBE" '(@typescript-eslint/)?no-restricted-imports'
echo "AlphaTab import fences OK — web/ rejects a value import, client/ rejects even a type import."
```

Run it, then the gates it joins:

```bash
bash tooling/alphatab-import-fence.test.sh
pnpm run test:tooling
pnpm run lint:shell
```

Expected: all PASS, with `ok — web/ rejects the probe` and `ok — client/ rejects the probe`. This
exact script was run against the real configs on 2026-09-16: it FAILS before this task (a value import
lints clean in `web/`), PASSES with Steps 3 and 8 in place, and FAILS again when a later block for the
same rule follows the fence. shellcheck 0.11.0 reports nothing.

- [ ] **Step 11: Commit**

```bash
git add web/eslint.config.mjs client/eslint.config.js tooling/alphatab-import-fence.test.sh \
  web/app/spike web/spike-probe.mjs web/spike-lifecycle-probe.mjs
git commit -m "chore(lint): fence @coderline/alphatab imports in web/ and client/ (NH-291)"
```

---

### Task 4: Export the design-system pieces the player needs, and fix the icon-font swap

Two components cross into `web/`, and the Material Symbols face gets a `font-display` fix. Without that fix a cold first visit paints the literal words `settings`, `play_arrow` and `folder_open` where the controls should be, because `.material-symbols-outlined` declares no icon fallback and the face ships `font-display: swap`.

> **`PlayButton` is deliberately NOT exported.** The spec's §7 lists it under "already built", but its real API is catalog-row shaped: it takes only `title` and `onClick`, hard-codes its accessible name to "Play " plus the title, and has neither a pause state nor a `disabled` prop. The transport needs a play/pause toggle that disables until the synth is ready. v0 builds that from the already-exported `Button` plus a Material Symbols glyph, and `PlayButton` stays the catalog's control. Do not widen `PlayButton` for this — a shared component with two unrelated jobs is worse than two components.

**Files:**

- Modify: `client/src/index.ts`
- Modify: `client/src/components/ui/Skeleton/Skeleton.tsx:1`
- Modify: `client/src/components/ui/Sonner/Sonner.tsx:1`
- Modify: `client/src/components/ui/Card/Card.tsx:1`
- Modify: `client/src/styles.css:3`
- Modify: `web/app/layout.tsx`

**Interfaces:**

- Consumes: nothing.
- Produces: `import { Button, Skeleton, Toaster, toast, Card, CardContent } from '@notation-hero/client'` works in `web/`. Tasks 6, 10, 11 and 13 use them.

- [ ] **Step 1: Write the failing test — a web file importing the barrel**

```bash
cat > web/barrel-probe.ts <<'EOF'
import { Skeleton, Toaster, toast } from '@notation-hero/client';

export const probe = [Skeleton, Toaster, toast];
EOF
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `pnpm --filter @notation-hero/web run typecheck`
Expected: FAIL — `Module '"@notation-hero/client"' has no exported member 'Skeleton'` (and `Toaster`, `toast`).

- [ ] **Step 3: Add `'use client'` to the three component files**

`Skeleton.tsx`, `Sonner.tsx` and `Card.tsx` must each begin with the directive, before any import. `Button.tsx` already has one — match it exactly:

```tsx
'use client';
```

- [ ] **Step 4: Widen the barrel**

Replace `client/src/index.ts` with:

```ts
// Public surface of the design system. It grows only when a screen pulls a component across
// (spec D3 — the player decides what gets built). The full barrel over every ui/ component is
// Phase 2 (design-system rename) work.
export { Button, buttonVariants } from './components/ui/Button/Button';
export type { ButtonProps } from './components/ui/Button/Button';

// Pulled across by the v0 player:
// - Skeleton covers the notation area until the engine + Bravura have arrived.
// - Toaster/toast carry the unsupported-file, engine-failure and settings-reset messages.
export { Skeleton, SkeletonTable, SkeletonForm } from './components/ui/Skeleton/Skeleton';
export { Toaster, toast } from './components/ui/Sonner/Sonner';
// - Card/CardContent frame the empty state's drop target (Task 10).
export { Card, CardContent } from './components/ui/Card/Card';
```

- [ ] **Step 5: Run typecheck to verify it passes**

Run: `pnpm --filter @notation-hero/web run typecheck`
Expected: PASS.

- [ ] **Step 6: Delete the probe**

```bash
rm web/barrel-probe.ts
```

- [ ] **Step 7: Force the icon font to `block`**

In `client/src/styles.css`, immediately after the three `@import` lines at the top, add:

```css
/* The Material Symbols face ships `font-display: swap`, and `.material-symbols-outlined` declares
   no icon fallback — so during the swap period the browser paints the LIGATURE SOURCE TEXT, and a
   cold first visit renders the literal words `settings`, `play_arrow` and `folder_open` where the
   controls should be. `block` gives a brief invisible period and then the real glyphs, which is the
   standard choice for an icon font precisely because its fallback text is meaningless.
   Re-declaring the family with the same src overrides the @import's descriptor. */
@font-face {
  font-family: 'Material Symbols Outlined Variable';
  font-display: block;
  src: url('@fontsource-variable/material-symbols-outlined/files/material-symbols-outlined-latin-full-normal.woff2')
    format('woff2-variations');
  font-weight: 100 700;
  font-style: normal;
}
```

Confirm the exact `src` path and family name against the installed package before writing it — a wrong URL silently loads nothing:

```bash
grep -rn "font-family\|font-display\|src:" client/node_modules/@fontsource-variable/material-symbols-outlined/index.css | head -20
ls client/node_modules/@fontsource-variable/material-symbols-outlined/files/ | head
```

Match the family name and file name that grep reports; the block above is the shape, not a guess to paste blind.

- [ ] **Step 8: Mount the toast host**

Replace `web/app/layout.tsx` body with:

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from '@notation-hero/client';

import './globals.css';

export const metadata: Metadata = {
  title: 'Notation Hero',
  description: 'Learn an instrument by playing real notation.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* One Toaster for the whole app: the unsupported-file, engine-failure and
            settings-reset messages all land here. */}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Re-run the client gates the barrel change touches**

```bash
pnpm --filter @notation-hero/client run lint
pnpm --filter @notation-hero/client run typecheck
pnpm --filter @notation-hero/client run test
pnpm --filter @notation-hero/client run test:a11y
pnpm run lint:css
pnpm run lint:spell
```

Then the VR gate, which must run in the Playwright container (macOS rasterises fonts differently and the committed baselines are Linux-only). Start Docker Desktop first with `open -a Docker`:

```bash
pnpm test:vr:docker
```

Expected: all PASS. The `font-display` change alters _when_ glyphs paint, not how they rasterise once loaded, so no baseline should move. **If VR reports diffs, stop and look at the report** — a moved baseline here means the font resolved differently, which is a real regression, not a snapshot to bless.

- [ ] **Step 10: Commit**

```bash
git add client/src/index.ts client/src/components/ui/Skeleton/Skeleton.tsx \
  client/src/components/ui/Sonner/Sonner.tsx \
  client/src/styles.css web/app/layout.tsx
git commit -m "feat(client): export Skeleton/Sonner and block the icon-font swap (NH-291)"
```

---

### Task 5: Load the engine once and share it through context

The awaited namespace object is the only runtime source of AlphaTab values, so every `web/` component that needs an enum reads it from here. The loader also owns the Bravura wait, because AlphaTab holds rendering until its internal `FontLoadingChecker` reports the family available and publishes no font event.

**Files:**

- Create: `web/lib/alphatab/engine.ts`
- Create: `web/lib/alphatab/AlphaTabEngineContext.tsx`

**Interfaces:**

- Consumes: the vendored `/alphatab/esm/alphaTab.mjs` from Task 2; the ESLint guard from Task 3.
- Produces:
  - `loadAlphaTabEngine(): Promise<AlphaTabEngine>` where `type AlphaTabEngine = typeof import('@coderline/alphatab')`.
  - `resolveLogLevel(engine: AlphaTabEngine): AlphaTab.LogLevel`.
  - `<AlphaTabEngineProvider>{children}</AlphaTabEngineProvider>` and `useAlphaTabEngine(): AlphaTabEngineState`.
  - `interface AlphaTabEngineState { engine: AlphaTabEngine | null; error: Error | null }`.
  - Tasks 6, 9, 10, 11 and 13 consume `useAlphaTabEngine()`. Plan C's settings and tracks compositions consume it too.

- [ ] **Step 1: Write the failing test — a consumer that typechecks against the API**

```bash
cat > web/lib/alphatab/engine-probe.ts <<'EOF'
import { loadAlphaTabEngine, resolveLogLevel } from './engine';

export async function probe(): Promise<number> {
  const engine = await loadAlphaTabEngine();
  return resolveLogLevel(engine);
}
EOF
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `pnpm --filter @notation-hero/web run typecheck`
Expected: FAIL — `Cannot find module './engine'`.

- [ ] **Step 3: Write the loader**

Create `web/lib/alphatab/engine.ts`:

```ts
import type * as AlphaTab from '@coderline/alphatab';

/** The awaited namespace object — the ONLY runtime source of AlphaTab values (spec §5). */
export type AlphaTabEngine = typeof AlphaTab;

/**
 * Served from web/public/alphatab/esm/ by scripts/vendor-alphatab.mjs.
 *
 * This MUST stay a variable. A string literal in the import below makes `tsc` resolve it at
 * compile time and fail the build, and it lets Turbopack statically analyse (and therefore
 * re-bundle) the library — which is exactly what this whole arrangement avoids.
 */
const ALPHATAB_ESM_URL = '/alphatab/esm/alphaTab.mjs';

let pending: Promise<AlphaTabEngine> | null = null;

/**
 * Imports the self-hosted AlphaTab ESM and resolves with the namespace object.
 *
 * There is deliberately NO font wait here. AlphaTab registers its SMuFL face under the family
 * `alphaTab` (generated as `alphaTab${fontSuffix}` in BrowserUiFacade), not `Bravura` — "Bravura"
 * survives only as the FILE NAME in the @font-face src — and it injects that face during
 * `AlphaTabApi` construction, long after this import resolves. So `document.fonts.load('1em Bravura')`
 * matches zero registered faces and settles instantly: verified in Chromium, 0 faces matched in
 * both orderings. (`document.fonts.check('1em Bravura')` is worse — it returns TRUE with no faces
 * registered, reporting the system fallback.) The Skeleton still covers the 306 KB font fetch,
 * because it lifts on `api.renderFinished`, which AlphaTab holds until its own FontLoadingChecker
 * reports the `alphaTab` family available.
 *
 * Memoised: two mounts (React 19 strict mode double-invokes effects in dev) share one module
 * instance.
 */
export function loadAlphaTabEngine(): Promise<AlphaTabEngine> {
  pending ??= (async () => {
    const engine = (await import(/* turbopackIgnore: true */ ALPHATAB_ESM_URL)) as AlphaTabEngine;
    return engine;
  })();
  return pending;
}

/**
 * Reads the log level from NEXT_PUBLIC_ALPHATAB_LOG_LEVEL, defaulting to Info.
 *
 * The worklet regression test asserts AlphaTab's `Platform: BrowserModule` debug line, which needs
 * Debug — but shipping Debug prints the visitor's user agent, window size and screen size to their
 * console. The Playwright config sets the variable for its own build; production stays on Info.
 *
 * NEXT_PUBLIC_* is inlined at BUILD time, so the lane's webServer command must run `next build`
 * with the variable set — setting it only for `next start` does nothing.
 */
export function resolveLogLevel(engine: AlphaTabEngine): AlphaTab.LogLevel {
  const configured = process.env.NEXT_PUBLIC_ALPHATAB_LOG_LEVEL;
  return configured === 'Debug' ? engine.LogLevel.Debug : engine.LogLevel.Info;
}

/** Test seam: drops the memoised module so a test can force a fresh import. Not used in the app. */
export function resetAlphaTabEngineForTests(): void {
  pending = null;
}
```

- [ ] **Step 4: Run typecheck to verify it passes**

Run: `pnpm --filter @notation-hero/web run typecheck`
Expected: PASS.

- [ ] **Step 5: Write the context**

Create `web/lib/alphatab/AlphaTabEngineContext.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { loadAlphaTabEngine } from './engine';
import type { AlphaTabEngine } from './engine';

export interface AlphaTabEngineState {
  /** The loaded namespace, or null while it is still arriving. */
  engine: AlphaTabEngine | null;
  /** Set when the dynamic import itself rejected — api.error cannot see this (spec §4). */
  error: Error | null;
}

// The context is scoped to web/ consumers on purpose. The dependency edge runs one way, so a
// context created here is invisible inside client/ — which is why every client/ control takes its
// enum options and accessors as props instead of reading them off the library (spec §7).
const AlphaTabEngineContext = createContext<AlphaTabEngineState>({ engine: null, error: null });

export function AlphaTabEngineProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<AlphaTabEngineState>({ engine: null, error: null });

  useEffect(() => {
    let disposed = false;
    // The spike's bare `void (async () => …)()` has no catch. Without one, a failed engine import
    // rejects into an unhandled promise and the UI shows a Skeleton forever instead of the error
    // message the spec's failure table requires.
    loadAlphaTabEngine()
      .then((engine) => {
        if (!disposed) setState({ engine, error: null });
      })
      .catch((cause: unknown) => {
        if (!disposed) {
          setState({
            engine: null,
            error: cause instanceof Error ? cause : new Error(String(cause)),
          });
        }
      });
    return () => {
      disposed = true;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AlphaTabEngineContext value={value}>{children}</AlphaTabEngineContext>;
}

export function useAlphaTabEngine(): AlphaTabEngineState {
  return useContext(AlphaTabEngineContext);
}
```

> `<Context value={…}>` (without `.Provider`) is React 19 syntax. If the installed React types reject it, use `<AlphaTabEngineContext.Provider value={value}>` instead — both are correct on React 19.

- [ ] **Step 6: Delete the probe and verify the package is clean**

```bash
rm web/lib/alphatab/engine-probe.ts
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run lint
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add web/lib/alphatab/engine.ts web/lib/alphatab/AlphaTabEngineContext.tsx
git commit -m "feat(web): load the self-hosted AlphaTab ESM once and share it by context (NH-291)"
```

---

### Task 6: The `/play` route renders and plays the bundled sample score

The first end-to-end slice: a landing page, a player route, an `AlphaTabApi` with a correct lifecycle, the loading `Skeleton`, and the three failure states — engine import, soundfont download, music-font download. It loads the bundled sample score directly so there is something to see and hear before the file picker exists.

**Files:**

- Create: `web/app/play/page.tsx`
- Create: `web/app/play/PlayerShell.tsx`
- Create: `web/app/play/NotationSurface.tsx`
- Create: `web/app/play/error.tsx`
- Create: `web/app/error.tsx`
- Create: `web/e2e/player.e2e.ts`
- Modify: `web/app/page.tsx`
- Rename: `web/public/charts/` → `web/public/notation/` (Step 1)

**Interfaces:**

- Consumes: `useAlphaTabEngine`, `AlphaTabEngineProvider` (Task 5); `Skeleton`, `Button` (Task 4).
- Produces:
  - `NotationSurface` props: `{ onApiReady: (api: AlphaTab.AlphaTabApi | null) => void }`. Task 10 Step 5 later adds `notation: OpenNotation | null` — the parsed score, not `LoadedNotation`.
  - `interface LoadedNotation { name: string; bytes: Uint8Array }` — exported from `web/app/play/PlayerShell.tsx` and consumed by Tasks 10 and 11.
  - DOM test hooks used by Tasks 7 and 13: `data-testid="notation-surface"`, `data-testid="notation-skeleton"`, `data-testid="engine-error"`, `data-testid="transport-play"`, `data-testid="player-status"` carrying `data-playing` and `data-soundfont`.

- [ ] **Step 1: Add the Playwright dependencies, then write the failing test**

The install comes FIRST, here and not in Task 7. `web/tsconfig.json` includes `**/*.ts`, so the
moment `web/e2e/player.e2e.ts` exists, `tsc --noEmit` type-checks it — and Step 9's typecheck
would die with `Cannot find module '@playwright/test'` if the package only arrived a task later.
The ranges must match `client/package.json` character for character or root `syncpack` (a
`quality` CI gate) fails.

```bash
git mv web/public/charts web/public/notation   # this task holds the first /notation/ URL
pnpm --filter @notation-hero/web add -D @playwright/test@^1.61.1 @axe-core/playwright@^4.12.1
pnpm --filter @notation-hero/web exec playwright install --with-deps chromium
pnpm run syncpack   # Expected: PASS
```

Then create `web/e2e/player.e2e.ts` with the first case only (the rest arrives in Task 7):

```ts
import { expect, test } from '@playwright/test';

test('renders the bundled sample score as notation', async ({ page }) => {
  await page.goto('/play');

  // AlphaTab renders notation as SVG inside its host element.
  const surface = page.getByTestId('notation-surface');
  await expect(surface.locator('svg').first()).toBeVisible({ timeout: 30_000 });

  // The Skeleton must be gone once notation is up — if it is still there, it was never lifted.
  await expect(page.getByTestId('notation-skeleton')).toHaveCount(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

The lane config does not exist until Task 7, so run this one against a local dev server instead:

```bash
pnpm --filter @notation-hero/web run dev
# in a second terminal:
pnpm --filter @notation-hero/web exec playwright test e2e/player.e2e.ts --config=/dev/null
```

If that is awkward, simply open `http://localhost:3002/play` in a browser.
Expected: **404** — the route does not exist.

- [ ] **Step 3: Write the landing page**

Replace `web/app/page.tsx`:

```tsx
import Link from 'next/link';
import { Button } from '@notation-hero/client';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Notation Hero</h1>
      <p className="max-w-prose text-muted-foreground">
        Open a score from your own computer, read it as standard notation, and play along. Nothing
        you open leaves this device.
      </p>
      {/* min-h-11 = 44px, the minimum touch target (spec §4). The glyph keeps its drawn size;
          only the hit area is padded. */}
      {/* `render`, NOT `asChild`. client/src/components/ui/Button/Button.tsx types its props as
          useRender.ComponentProps<'button'> & VariantProps<typeof buttonVariants> — `asChild`
          appears nowhere in client/src, it was dropped in the Radix -> Base UI migration. The
          precedent is Button.test.tsx:52 and the AsLink story. Passing `asChild` would land as a
          stray DOM attribute and the Link would never render. */}
      <Button render={<Link href="/play" />} className="min-h-11 px-8 text-base">
        Play
      </Button>
    </main>
  );
}
```

> Do not wrap a `<Link>` in a `<button>` — that nests interactive elements and fails the axe run in Task 13. The `render` prop is the composition hook this repo ships; it puts the Button's classes on the `<a>` rather than nesting one inside the other.

- [ ] **Step 4: Write the notation surface**

Create `web/app/play/NotationSurface.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@notation-hero/client';
import type * as AlphaTab from '@coderline/alphatab';

import { resolveLogLevel } from '../../lib/alphatab/engine';
import { useAlphaTabEngine } from '../../lib/alphatab/AlphaTabEngineContext';

interface NotationSurfaceProps {
  /** Handed the live api as soon as it exists, and null on dispose. */
  onApiReady: (api: AlphaTab.AlphaTabApi | null) => void;
}

/** The score that ships with the app; Task 10 adds user files on top of it. */
const SAMPLE_NOTATION = '/notation/1-beat.gp';

export function NotationSurface({ onApiReady }: Readonly<NotationSurfaceProps>) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Task 10's score effect needs the live api from a SIBLING effect, so it cannot live in the
  // mount effect's local `const`. Declared here, assigned at construction, cleared on dispose.
  const apiRef = useRef<AlphaTab.AlphaTabApi | null>(null);
  const { engine, error: engineError } = useAlphaTabEngine();
  const [rendered, setRendered] = useState(false);
  const [renderedTrackCount, setRenderedTrackCount] = useState(0);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !engine) return;

    let api: AlphaTab.AlphaTabApi | undefined;

    const settings = new engine.Settings();
    // No settings.core.scriptFile. AlphaTab finds its own worker and worklet relative to
    // /alphatab/esm/alphaTab.mjs — that is the entire point of self-hosting the ESM.
    settings.core.fontDirectory = '/alphatab/font/';
    settings.core.file = SAMPLE_NOTATION;
    settings.core.tracks = 'all';
    settings.core.logLevel = resolveLogLevel(engine);
    settings.player.playerMode = engine.PlayerMode.EnabledAutomatic;
    settings.player.soundFont = '/alphatab/soundfont/sonivox.sf3';
    settings.player.enableCursor = true;
    settings.player.scrollMode = engine.ScrollMode.Continuous;
    settings.player.scrollElement = host;

    // AlphaTab injects its music font as a CSS @font-face named `alphaTab…` during construction. If
    // that download fails, its font checker has no fallback family: it logs "rendering cannot
    // start", never fires renderFinished and raises no api.error — so the Skeleton would stay up
    // forever. The browser reports it at once, as `loadingerror` on document.fonts (verified in
    // Chromium), so listen before constructing. Text-font checkers have system fallbacks, hence
    // the family filter.
    const onFontError = (event: FontFaceSetLoadEvent) => {
      if (event.fontfaces.some((face) => face.family.startsWith('alphaTab'))) {
        setRuntimeError('the music font could not be downloaded');
      }
    };
    document.fonts.addEventListener('loadingerror', onFontError);

    api = new engine.AlphaTabApi(host, settings);
    apiRef.current = api;

    // Backstop for a download that hangs without ever failing: no event arrives, so give up after
    // 60 s. Long on purpose — the 306 KB font on a slow link must not trip it.
    const firstRenderTimeout = globalThis.setTimeout(
      () => setRuntimeError('the music font did not arrive within 60 seconds'),
      60_000,
    );

    // The SoundFont download failure surfaces through AlphaTab's own error event; the engine
    // import failure cannot (AlphaTabApi does not exist yet) and arrives via engineError above.
    api.error.on((cause) => setRuntimeError(String(cause)));
    api.renderFinished.on(() => {
      globalThis.clearTimeout(firstRenderTimeout);
      setRendered(true);
    });

    // No `if (disposed)` re-check. Everything above is synchronous — no await, no .then — and the
    // only thing that could set such a flag is the cleanup, returned below, so the
    // branch is unreachable by construction (a React 19.2 repro took it 0 times in 6 scenarios).
    // Its bare `return` would also have skipped registering this cleanup. The spike component
    // needs that guard because it awaits the import INSIDE its effect; here the engine arrives
    // through context, so there is no suspension point to be disposed across.
    onApiReady(api);

    return () => {
      document.fonts.removeEventListener('loadingerror', onFontError);
      globalThis.clearTimeout(firstRenderTimeout);
      apiRef.current = null;
      onApiReady(null);
      api?.destroy();
    };
  }, [engine, onApiReady]);

  const failure = engineError?.message ?? runtimeError;

  return (
    <div className="relative min-h-[420px] w-full">
      {failure ? (
        <p
          data-testid="engine-error"
          role="alert"
          className="rounded-md border border-destructive/25 bg-[color-mix(in_oklab,var(--destructive)_10%,var(--popover))] p-4 text-destructive"
        >
          The player engine could not start. Reload the page to try again. ({failure})
        </p>
      ) : null}
      {/* The Skeleton covers BOTH the engine import and the music-font fetch, and lifts on the
          first renderFinished: AlphaTab holds that event until its own font checker sees the
          `alphaTab` face load (Task 5 — there is no font wait in loadAlphaTabEngine). Dismissing
          it earlier leaves the notation area blank for exactly the window it exists to cover. */}
      {!failure && !rendered ? (
        <Skeleton
          data-testid="notation-skeleton"
          className="absolute inset-0 h-full w-full"
          aria-label="Loading notation"
          role="status"
        />
      ) : null}
      {/* `bg-white`, deliberately NOT a token. AlphaTab draws notation as dark glyphs and this
          plan never sets `model.Color`, so a theme-following surface would make the score
          invisible in dark mode. This is the one place in the player that pins a literal colour;
          it stops being correct the moment the glyph colour becomes themeable. */}
      {/* A named region a keyboard user can focus. `tabIndex={0}` is required: a score taller than
          420 px makes this box scroll, and axe's scrollable-region-focusable (serious, wcag2a) fails
          a scroll box with nothing focusable inside, whatever its role. `region`, not `img`: the
          notation takes mouse input (AlphaTab moves the cursor and selects bars on click) and needs
          keyboard control too, and an `img`'s children are presentational. Never `aria-label`
          without a role — on a plain div that fails axe's aria-prohibited-attr (serious). The focus
          ring copies client/'s ScrollArea viewport, which solved the same axe rule. Task 13 audits
          the scrolling state with Punk.gp. */}
      <div
        ref={hostRef}
        data-testid="notation-surface"
        role="region"
        aria-label="Score"
        tabIndex={0}
        className="h-[420px] w-full overflow-y-auto rounded-md border border-border bg-white outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      />
    </div>
  );
}
```

- [ ] **Step 5: Write the player shell**

Create `web/app/play/PlayerShell.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@notation-hero/client';
import type * as AlphaTab from '@coderline/alphatab';

import {
  AlphaTabEngineProvider,
  useAlphaTabEngine,
} from '../../lib/alphatab/AlphaTabEngineContext';
import { NotationSurface } from './NotationSurface';

/** A score held in memory. The bytes never touch disk and never cross a route. */
export interface LoadedNotation {
  name: string;
  bytes: Uint8Array;
}

function Player() {
  const apiRef = useRef<AlphaTab.AlphaTabApi | null>(null);
  const { engine } = useAlphaTabEngine();
  const [playing, setPlaying] = useState(false);
  const [soundFontReady, setSoundFontReady] = useState(false);

  const handleApiReady = useCallback(
    (api: AlphaTab.AlphaTabApi | null) => {
      apiRef.current = api;
      if (!api || !engine) {
        setPlaying(false);
        setSoundFontReady(false);
        return;
      }
      // Subscribe HERE, never from a []-deps effect. AlphaTabEngineProvider is the PARENT-MOST
      // component, so its effect runs LAST: loadAlphaTabEngine() has not even been called when
      // Player's own effects run, the api therefore cannot exist during that commit, and a
      // []-deps effect reading apiRef.current is pinned to null forever. Measured against React
      // 19.2 — with the effect form, soundFontLoaded ended with 0 handlers, data-playing never
      // moved and Play stayed disabled, strict mode on and off, so Task 7's `toBeEnabled` would
      // time out on a perfectly healthy build.
      //
      // Safe against repeats: handleApiReady fires once per CONSTRUCTED api (4 calls under strict
      // mode plus score changes, never twice for the same instance — each preceded by a cleanup
      // that destroyed the previous one), so per-api handler counts stay at exactly 1.
      //
      // PlayerState is an AlphaTab enum and cannot be imported; read it off the namespace object
      // instead of comparing against the literal 1, which would rot if the ordering ever changed.
      api.playerStateChanged.on((args) =>
        setPlaying(args.state === engine.synth.PlayerState.Playing),
      );
      api.soundFontLoaded.on(() => setSoundFontReady(true));
    },
    [engine],
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <h1 className="sr-only">Player</h1>
      <NotationSurface onApiReady={handleApiReady} />
      <div
        data-testid="player-status"
        data-playing={playing}
        data-soundfont={soundFontReady}
        className="flex items-center gap-3"
      >
        {/* Play stays disabled until the synth is ready (spec §4). size-11 = the 44px minimum hit
            area; the glyph keeps its drawn size. This is NOT client/'s PlayButton — that one is
            the catalog row's control and has no pause state (see Task 4). */}
        <Button
          data-testid="transport-play"
          size="icon"
          variant="ghost"
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={!soundFontReady}
          onClick={() => apiRef.current?.playPause()}
          className="size-11 rounded-full text-primary"
        >
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 34 }}>
            {playing ? 'pause_circle' : 'play_circle'}
          </span>
        </Button>
      </div>
    </main>
  );
}

export function PlayerShell() {
  return (
    <AlphaTabEngineProvider>
      <Player />
    </AlphaTabEngineProvider>
  );
}
```

> **No placeholder here.** `PlayerState` is an AlphaTab enum and cannot be imported, so `handleApiReady` reads `engine.synth.PlayerState.Playing` off the namespace object — exactly as `NotationSurface` reads `engine.PlayerMode`. Do not reintroduce the numeric literal `1`: it happens to be correct in 1.8.4 and would rot silently the moment the enum's ordering changed.

- [ ] **Step 6: Write the route segment**

Create `web/app/play/page.tsx`:

```tsx
import { PlayerShell } from './PlayerShell';

// A Server Component rendering the client player. NEVER `dynamic(..., { ssr: false })` — it is
// illegal here and unnecessary: AlphaTab's module scope is SSR-safe and nothing touches it until
// the client effect runs.
export default function PlayPage() {
  return <PlayerShell />;
}
```

Then add the two error boundaries. In App Router, `error.tsx` **is** the React error boundary — the
Next.js docs are explicit: "`error.js` wraps a route segment and its nested children in a React Error
Boundary". Two of them, so a crash in the player does not take the landing page with it. Note what
they do and do not catch: rendering errors, yes; event-handler and async failures, no — those are
already handled explicitly (the engine-import catch in Task 5, the parse catch in Task 10). These are
the net for the unexpected.

```tsx
// web/app/play/error.tsx — 'use client' is required; error boundaries are client components.
'use client';

import { Button } from '@notation-hero/client';

export default function PlayerError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">The player stopped unexpectedly</h1>
      <p className="max-w-prose text-muted-foreground">
        Nothing you opened was sent anywhere. Try again, or reload the page.
      </p>
      <Button className="min-h-11 px-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
```

Add the same shape at `web/app/error.tsx` for the rest of the app, worded for a general failure.
Do **not** add `global-error.tsx` in v0 — it only earns its place once the root layout does more
than mount a `<Toaster />`.

- [ ] **Step 7: Run the app and verify by hand**

```bash
pnpm --filter @notation-hero/web run dev
```

Open `http://localhost:3002` — the Play button links to `/play`. On `/play`, expect: a Skeleton, then drum notation, then an enabled Play button that produces **audible** drum audio with a moving cursor. Open the console and confirm no `Failed to create worker for synthesizing audio` and no `Audio Worklet creation failed`.

**Listen to it.** Spec Q1 records that nobody has heard this audio yet — headless Chromium is silent, so this manual listen is the only thing that closes it.

- [ ] **Step 8: Verify the strict-mode lifecycle**

With the dev server running (React 19 strict mode double-invokes effects), reload `/play` five times and check the DOM never holds two AlphaTab surfaces:

```bash
# in the browser console on /play
document.querySelectorAll('[data-testid="notation-surface"] .at-surface').length
```

Expected: exactly **1**. AlphaTab renders one `<svg>` per system, so counting `svg` varies with the score and gives you no baseline to compare against; `.at-surface` is one per surface. Check it on a single load — strict mode double-invokes within one commit, and a reload tears the tree down anyway, so reloading proves nothing. If it doubles, the cleanup's `api?.destroy()` is not running — check the effect's `[engine, onApiReady]` dependency list and that `handleApiReady` is a stable `useCallback`. That cleanup is what actually prevents the leak: with it in place a React 19.2 repro settled at exactly one live `AlphaTabApi` across four constructions under strict mode.

- [ ] **Step 9: Verify the package is clean**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run build
```

Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add web/app/page.tsx web/app/error.tsx web/app/play web/e2e/player.e2e.ts web/package.json pnpm-lock.yaml
git commit -m "feat(web): render and play the sample score on /play (NH-291)"
```

---

### Task 7: The regression test that catches the silent failure

Without the self-hosted ESM, **notation still renders** on a main-thread fallback and only playback dies — the page looks correct until you press play. This lane asserts the worker path is live, not merely that notation appeared.

**Files:**

- Create: `web/playwright.e2e.config.ts`
- Modify: `web/e2e/player.e2e.ts`
- Modify: `web/package.json`

**Interfaces:**

- Consumes: `/play` and its test hooks (Task 6); `resolveLogLevel` reading `NEXT_PUBLIC_ALPHATAB_LOG_LEVEL` (Task 5).
- Produces: `pnpm --filter @notation-hero/web run test:e2e`. Tasks 9, 10, 11 and 13 add cases to the same lane.

- [ ] **Step 1: Confirm the Playwright dependencies are in place**

They were added in Task 6 Step 1 — the test file written there imports `@playwright/test`, so the
install cannot wait until now. Re-verify only:

```bash
pnpm run syncpack   # Expected: PASS — the ranges match client/package.json exactly
```

- [ ] **Step 2: Write the failing test — the four worklet assertions**

Replace `web/e2e/player.e2e.ts` with:

```ts
import { expect, test } from '@playwright/test';

test('renders the bundled sample score as notation', async ({ page }) => {
  await page.goto('/play');

  const surface = page.getByTestId('notation-surface');
  await expect(surface.locator('svg').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('notation-skeleton')).toHaveCount(0);
});

// The regression this whole delivery decision exists to prevent. Without self-hosted ESM the
// notation above still renders on a main-thread fallback and ONLY playback dies, so a test that
// checks for notation passes on a broken build.
test('plays through the real audio worklet, not the silent fallback', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (message) => logs.push(message.text()));

  // NOTE: do NOT arm page.waitForResponse for alphaTab.worklet.mjs. Chromium does not expose an
  // AudioWorklet.addModule() fetch to ANY Playwright observer — not page.on('request'), not
  // context.on('request'), not context.route(), not even CDP Network.requestWillBeSent. Measured:
  // the server logged serving the file while all four observers missed it, and the plan's original
  // waitForResponse timed out identically on a healthy build, on a 404, and on a wrong MIME type —
  // zero discriminating power. Assertion 3 below uses a direct request instead.
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  // 1. AlphaTab reports the native module-worker platform.
  //    `Platform: BrowserModule` comes from Environment.printEnvironmentInfo, which reads
  //    Environment.webPlatform — so it is the real discriminator. The tempting
  //    "Will use webworkers … with worklets for playback" line is NOT: createWorkerPlayer emits
  //    it whenever the context is secure and AudioWorkletNode exists, never consulting
  //    webPlatform, so it still logs on exactly the broken build this test guards against.
  await expect
    .poll(() => logs.some((line) => line.includes('Platform: BrowserModule')), { timeout: 30_000 })
    .toBe(true);

  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();

  // 2. Playback actually advances.
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
  await expect
    .poll(
      async () =>
        Number((await page.getByTestId('player-status').getAttribute('data-position')) ?? '0'),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);

  // 3. The worklet module is served as executable JavaScript. A direct request, not a network
  //    event: deterministic, no timing race, and independent of the plumbing described above.
  const worklet = await page.request.get('/alphatab/esm/alphaTab.worklet.mjs');
  expect(worklet.status()).toBe(200);
  expect(worklet.headers()['content-type'] ?? '').toMatch(/javascript/i);

  // 4. Neither worker-construction error appeared. LAST, over the whole collected log: these only
  //    fire once the player is constructed, and construction returns early until a score is
  //    loaded — so a console check made before pressing Play passes on a broken build.
  expect(
    logs.filter((line) => line.includes('Failed to create worker for synthesizing audio')),
  ).toEqual([]);
  expect(logs.filter((line) => line.includes('Audio Worklet creation failed'))).toEqual([]);
});
```

- [ ] **Step 3: Add the position hook the test reads**

In `web/app/play/PlayerShell.tsx`, track the playback position and expose it. Inside `Player`, add the state next to the existing two:

```tsx
const [positionMs, setPositionMs] = useState(0);
```

and the subscription inside `handleApiReady`, beside the other two — **not** in a `useEffect`. The
api does not exist during the first commit's effect flush (Task 6 explains why), so an effect-based
subscription never attaches and `data-position` never moves. The failure would surface here as a
60-second `toBeEnabled` timeout pointing at the worklet rather than at the wiring:

```tsx
api.playerPositionChanged.on((args) => setPositionMs(args.currentTime));
```

then add the attribute to the status element:

```tsx
        data-position={positionMs}
```

- [ ] **Step 4: Write the lane config**

Create `web/playwright.e2e.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

// The `web` browser lane. It mirrors client/playwright.e2e.config.ts, but serves a Next.js
// production build (`next build` then `next start`) rather than `vite preview`, and it is the only
// gate over the product's own UI — web/ has no Storybook, so no VR or axe job covers it.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
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

- [ ] **Step 5: Add the script**

In `web/package.json`, add (keeping the keys sorted — `sort-package-json --check` is a CI gate):

```json
    "test:e2e": "playwright test --config=playwright.e2e.config.ts",
    "test:e2e:ui": "playwright test --config=playwright.e2e.config.ts --ui",
```

**It must not be called `test`.** The `quality` job runs `pnpm -r --if-present run test` with no browsers installed, and a `test` script here would fail that job.

- [ ] **Step 6: Ignore the lane's output**

Append to `web/.gitignore`:

```gitignore
# Playwright lane output
/playwright-report/
/test-results/
```

- [ ] **Step 7: Run the lane to verify it passes**

```bash
pnpm --filter @notation-hero/web run test:e2e
```

Expected: PASS — 2 tests. If `Platform: BrowserModule` never appears, check that `NEXT_PUBLIC_ALPHATAB_LOG_LEVEL` reached the **build** (Next.js inlines it at build time, not at start).

- [ ] **Step 8: Prove the test actually discriminates**

A regression test that passes on a broken build is worse than none. Two drills, because the two
things that can break are different.

**Do NOT break `web/public/alphatab/esm/` — that directory is regenerated.** The lane's
`webServer.command` is `pnpm build && pnpm start --port 4174`, and Task 2 defined `build` as
`node scripts/vendor-alphatab.mjs && next build`, so the vendor step copies any file you move there
straight back before a single test runs. The drill would report PASS where it claims FAIL.

**Drill 1 — the asset is missing or mistyped.** Break the vendoring SOURCE, which survives the
rebuild. Stub rather than delete: the vendor step throws its own `missing source` error on a
deleted file and never reaches the browser, which proves nothing about the test.

```bash
cp web/node_modules/@coderline/alphatab/dist/alphaTab.worklet.min.mjs /tmp/worklet.bak
: > web/node_modules/@coderline/alphatab/dist/alphaTab.worklet.min.mjs
pnpm --filter @notation-hero/web run test:e2e
```

Expected: **FAIL** on assertion 3's content check and/or the `Audio Worklet creation failed`
absence check — while the notation test still passes, which is exactly the asymmetry the spec
describes. Restore and re-run:

```bash
cp /tmp/worklet.bak web/node_modules/@coderline/alphatab/dist/alphaTab.worklet.min.mjs
pnpm --filter @notation-hero/web run test:e2e   # Expected: PASS again
```

**Drill 2 — the regression this whole delivery decision exists to prevent: a BUNDLED copy.**
Deleting an asset only ever produces a 404. It cannot produce the state where Turbopack has bundled
AlphaTab, `import.meta.url` stops being a usable http URL, and `Environment.webPlatform` reports
`Browser` instead of `BrowserModule` — notation still renders and only playback dies. Assertion 1 is
the only check that catches that, so it is the one that must be proven.

Temporarily replace the `turbopackIgnore` dynamic import in `web/lib/alphatab/engine.ts` with a
static `import * as AlphaTab from '@coderline/alphatab'` (disable the Task 3 rule on that line
only), rebuild, and confirm the `Platform: BrowserModule` poll is the assertion that fails. Then
revert it.

What this drill does NOT cover: a second bundled copy that nothing drives. One value import of
`@coderline/alphatab` anywhere — an enum, for example — bundles the library again, but `engine.ts`
still loads the self-hosted copy. Playback works, `webPlatform` stays `BrowserModule`, and
assertion 1 passes. That case costs payload, not sound, and the Task 3 lint fence — kept honest by
`tooling/alphatab-import-fence.test.sh` — is the only guard
against it until the deferred bundle-count gate lands.

- [ ] **Step 9: Commit**

```bash
git add web/playwright.e2e.config.ts web/e2e/player.e2e.ts web/package.json \
  web/.gitignore web/app/play/PlayerShell.tsx pnpm-lock.yaml
git commit -m "test(web): assert the audio worklet path is live, not the silent fallback (NH-291)"
```

---

### Task 8: Put the `web` lane in CI so it blocks merge

The lane is worthless as a local-only script. It joins the existing `e2e` job, which is already in the `ci-green` required list.

**Files:**

- Modify: `.github/workflows/ci.yml` (the `e2e` job, around lines 364-387)

**Interfaces:**

- Consumes: `pnpm --filter @notation-hero/web run test:e2e` (Task 7).
- Produces: a merge-blocking gate over `web/`. Tasks 9-13 rely on it.

- [ ] **Step 1: Write the failing test — assert the workflow names the web lane**

The repo already tests its workflows. Add a case to `tooling/workflow-guards.test.mjs`:

```js
test('the e2e job runs the web Playwright lane, not only the client one', () => {
  const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(ci, /pnpm --filter @notation-hero\/web run test:e2e/);
  // The web lane needs its own browser install — the client step only installs for client/.
  assert.match(
    ci,
    /pnpm --filter @notation-hero\/web exec playwright install --with-deps chromium/,
  );
  // Its report and traces must be uploaded, or a CI failure is not replayable.
  assert.match(ci, /web\/playwright-report\//);
  assert.match(ci, /web\/test-results\//);
});
```

Open the file first and match its existing import style and helpers rather than pasting this verbatim.

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tooling/workflow-guards.test.mjs`
Expected: FAIL — all four assertions.

- [ ] **Step 3: Extend the `e2e` job**

In `.github/workflows/ci.yml`, in the `e2e` job, add the web steps after the client ones and widen the upload paths:

```yaml
- name: Install Playwright Chromium (web)
  run: pnpm --filter @notation-hero/web exec playwright install --with-deps chromium
- name: e2e tests (Playwright vs the built Next.js app)
  run: pnpm --filter @notation-hero/web run test:e2e
- name: Upload traces + HTML report
  # NOT `if: failure()` — that would drop the trace of a flaky-then-passed run (D5).
  if: ${{ !cancelled() }}
  uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
  with:
    name: playwright-e2e-report
    path: |
      client/playwright-report/
      client/test-results/
      web/playwright-report/
      web/test-results/
    retention-days: 7
    if-no-files-found: ignore
```

Replace the job's existing upload step rather than adding a second one with the same artifact name — two steps uploading `playwright-e2e-report` collide.

Also update the job's leading comment so it no longer says the lane only covers the SPA.

- [ ] **Step 4: Run the guard test to verify it passes**

Run: `node --test tooling/workflow-guards.test.mjs`
Expected: PASS.

- [ ] **Step 5: Lint the workflow**

```bash
pnpm run lint:actions
pnpm run lint:yaml
```

Expected: both PASS. (`actionlint` and `yamllint` are installed by `pnpm run lint:setup` if missing.)

- [ ] **Step 6: Commit and watch the real run**

```bash
git add .github/workflows/ci.yml tooling/workflow-guards.test.mjs
git commit -m "ci: run the web Playwright lane in the e2e job (NH-291)"
git push
gh run watch
```

Local green is not CI green — the lane runs a full `next build` on the runner, which is slower and colder than a warm local one. Watch the run to completion; if the 300 s webServer timeout is tight in CI, raise it rather than retrying.

---

### Task 9: Select the drum tracks — a pure, tested function

Where a drum staff exists, only the drum tracks render; every track stays in playback so per-track mute and solo still work. A file with no percussion staff falls back to `score.tracks[0]`, AlphaTab's FIRST track — drums are v0's default, not its requirement. This task builds and unit-tests the selector; Task 10 wires it into rendering, in the same task as the end-to-end tests that exercise it.

**Files:**

- Create: `web/lib/alphatab/drum-tracks.ts`
- Create: `web/lib/alphatab/drum-tracks.test.ts`
- Create: `web/e2e/fixtures/guitar-no-percussion.gp`
- Create: `tooling/make-percussion-free-fixture.mjs`
- Modify: `web/package.json`, `pnpm-lock.yaml` (vitest and a `test` script)
- Modify: `AGENTS.md` (`web/` no longer omits `test`)

**Interfaces:**

- Consumes: nothing — the unit test needs no browser and no engine.
- Produces: `selectDrumTrackIndexes(tracks: readonly PercussionScannable[]): number[]`, where `interface PercussionScannable { index: number; staves: readonly { isPercussion: boolean }[] }`. Plan C's Tracks popover consumes the same helper to label rows.

- [ ] **Step 1: Write the failing test — a co-located unit cover for the selector**

The end-to-end `Punk.gp` case belongs to **Task 10**, because it needs the file input Task 10 adds.
Committing it here would make this task's own commit red, against the Global Constraint "commit at
every green step" — and a red commit is one you cannot `git revert` to. `selectDrumTrackIndexes` is
pure, so it is fully provable here with plain objects and no browser.

`web/` has no unit-test runner yet, so add one first. Use the exact range `client/`, `server/` and
`infra/` already use — root `syncpack` (a `quality` CI gate) fails on any other:

```bash
pnpm --filter @notation-hero/web add -D vitest@^4.1.9
```

Then add `"test": "vitest run"` to `web/package.json` — the same script `client/` and `server/` use —
with the keys kept sorted (`lint:sort-pkg` is a CI gate). It is a vitest script, not a Playwright one,
so the Global Constraint that keeps the Playwright script out of `test` still holds, and CI's
`quality` job now runs it with no browser. Finally, in `AGENTS.md`, delete the parenthetical
"(`web/` omits `test` until Phase 2 — `pnpm -r --if-present` skips it safely)" — it stops being true
in this task.

Create `web/lib/alphatab/drum-tracks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { selectDrumTrackIndexes } from './drum-tracks';

const staff = (isPercussion: boolean) => ({ isPercussion });

describe('selectDrumTrackIndexes', () => {
  it("returns every percussion track, not just the first — Punk.gp's shape", () => {
    // Punk.gp parses to three tracks: 0:Drumkit (percussion), 1:Distortion Guitar (not),
    // 2:Drumkit Left (percussion). A regression that kept only track 0 would silently drop
    // the left-hand staff, which is exactly why that fixture exists.
    expect(
      selectDrumTrackIndexes([
        { index: 0, staves: [staff(true)] },
        { index: 1, staves: [staff(false)] },
        { index: 2, staves: [staff(true)] },
      ]),
    ).toEqual([0, 2]);
  });

  it('returns an empty array when no track has a percussion staff', () => {
    // NOT an error: the caller passes undefined to renderScore, which renders score.tracks[0].
    expect(selectDrumTrackIndexes([{ index: 0, staves: [staff(false)] }])).toEqual([]);
  });

  it('counts a track whose percussion staff is not the first one', () => {
    expect(selectDrumTrackIndexes([{ index: 0, staves: [staff(false), staff(true)] }])).toEqual([
      0,
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/web run test`
Expected: FAIL — vitest cannot resolve `./drum-tracks`, because the selector does not exist yet.

- [ ] **Step 3: Write the pure selector**

Create `web/lib/alphatab/drum-tracks.ts`:

```ts
/**
 * The shape this module needs from an AlphaTab `Track`. Declared structurally rather than imported,
 * so this file stays free of `@coderline/alphatab` and is trivially testable with plain objects.
 */
export interface PercussionScannable {
  index: number;
  staves: readonly { isPercussion: boolean }[];
}

/**
 * Indexes of the tracks that carry a percussion staff.
 *
 * An empty result is NOT an error: a score with no percussion staff renders `score.tracks[0]` —
 * AlphaTab's FIRST track, not a "default" or preferred one — which is what omitting the
 * `trackIndexes` argument to `renderScore` already does. The app leads with drums but must not turn
 * any other musician away: a guitar or piano score opens and plays instead of showing a dead end.
 *
 * `Track` also exposes its own `isPercussion` getter in 1.8.4; this reads the staves directly
 * because that is the rule the design settled on and it survives a change to the getter.
 */
export function selectDrumTrackIndexes(tracks: readonly PercussionScannable[]): number[] {
  return tracks
    .filter((track) => track.staves.some((staff) => staff.isPercussion))
    .map((t) => t.index);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/web run test`
Expected: PASS — 3 tests. The end-to-end `Punk.gp` case runs in Task 10.

- [ ] **Step 5: Generate the percussion-free fixture (closes Q7)**

`web/e2e/fixtures/guitar-no-percussion.gp` is produced from a one-line alphaTex string with the
pinned 1.8.4 importer/exporter, then round-tripped to prove it is what criterion 9 needs. Verified:
2,866 bytes, a real GP7 zip (`VERSION`, `Content/score.gpif`), reading back as one track, one staff,
`isPercussion = false`. Write the generator beside the other tooling tests so the fixture can be
regenerated rather than being an unexplained binary:

```js
// tooling/make-percussion-free-fixture.mjs — run once, output committed.
import { writeFile } from 'node:fs/promises';

const at = await import('../web/node_modules/@coderline/alphatab/dist/alphaTab.mjs');
const score = at.importer.AlphaTexImporter.importFromString(
  '\\title "Guitar (no percussion)" . 3.3.4 3.3.4 3.3.4 3.3.4 |',
);
await writeFile(
  'web/e2e/fixtures/guitar-no-percussion.gp',
  new at.exporter.Gp7Exporter().export(score),
);
```

Check the exact importer entry point against `dist/alphaTab.d.ts` before running it — the namespace
exports `AlphaTexImporter`, `ScoreLoader`, `Gp7Exporter` and `ScoreExporter`, but the convenience
signature differs between them. Task 10 adds the e2e case that opens this fixture.

- [ ] **Step 6: Commit**

```bash
git add web/lib/alphatab/drum-tracks.ts web/lib/alphatab/drum-tracks.test.ts \
  web/e2e/fixtures/guitar-no-percussion.gp tooling/make-percussion-free-fixture.mjs \
  web/package.json pnpm-lock.yaml AGENTS.md
git commit -m "feat(web): select every drum track, with a percussion-free fallback (NH-291)"
```

---

### Task 10: Open a file — picker, drag-and-drop, empty state, sample beat

**Files:**

- Create: `web/app/play/OpenFileControl.tsx`
- Create: `web/app/play/EmptyState.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/app/play/NotationSurface.tsx`
- Modify: `web/e2e/player.e2e.ts`
- Modify: `web/app/globals.css` (the drag-overlay styles)

**Interfaces:**

- Consumes: `LoadedNotation` (Task 6); `selectDrumTrackIndexes` (Task 9).
- Produces:
  - `OpenFileControl` props: `{ onNotation: (file: LoadedNotation) => void; compact?: boolean }`, plus an exported `readNotation(file)` the shell's drop handler reuses. **This matches the implementation** — the earlier `hasNotation` / `variant` pair was never implemented and is gone.
  - `OpenNotation { name: string; score: AlphaTab.model.Score }` — what the shell holds after parsing; `NotationSurface` takes it as its `notation` prop.
  - Test hooks: `data-testid="open-file-input"`, `data-testid="open-file-button"`, `data-testid="load-sample"`, `data-testid="empty-state"`.

- [ ] **Step 1: Write the failing tests**

Add to `web/e2e/player.e2e.ts`:

```ts
test('starts empty, with the transport disabled and both open affordances present', async ({
  page,
}) => {
  await page.goto('/play');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('open-file-button')).toBeVisible();
  await expect(page.getByTestId('load-sample')).toBeVisible();
  await expect(page.getByTestId('transport-play')).toBeDisabled();
});

test('Load the sample beat fetches and plays the bundled score', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();

  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});

test('an unsupported file raises a toast and leaves the player usable', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles({
    name: 'not-a-score.gp5',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('this is not a guitar pro file'),
  });

  await expect(page.getByText(/could not be opened|unsupported/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

// Punk.gp parses to three tracks: 0:Drumkit (percussion, MIDI channel 9), 1:Distortion Guitar
// (not percussion) and 2:Drumkit Left (percussion, channel 9). A regression that rendered only
// track 0 would silently drop the left-hand staff — which is exactly why this fixture exists.
// Punk.mxl (MuseScore) and Punk.alphatex (Tabtify) are exports of the same score and parse to the
// same three tracks, so the promise is checked on Guitar Pro, MusicXML and alphaTex alike.
// (Moved here from Task 9: it needs the file input this task adds, and Task 9 must not commit
// a red suite.)
for (const fixture of ['Punk.gp', 'Punk.mxl', 'Punk.alphatex']) {
  test(`renders every drum track, not only track 0 — ${fixture}`, async ({ page }) => {
    await page.goto('/play');
    await page.getByTestId('open-file-input').setInputFiles(`e2e/fixtures/${fixture}`);
    await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });
  });
}

// Criterion 9. guitar-no-percussion.gp has one track whose only staff is NOT percussion, so
// selectDrumTrackIndexes returns [], the caller passes undefined, and AlphaTab renders
// score.tracks[0]. Verified by RUNNING, not by reading (closes Q7).
test('a score with no percussion staff opens on the first track', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/guitar-no-percussion.gp');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('rendered-track-count')).toHaveText('1');
});

// A failed music-font download used to leave the Skeleton up forever: AlphaTab's font checker has
// no fallback, fires no renderFinished and raises no api.error. Abort every font request and expect
// the engine error instead (NotationSurface's loadingerror listener, Task 6).
test('a failed music-font download shows the engine error, not an endless Skeleton', async ({
  page,
}) => {
  await page.route('**/alphatab/font/**', (route) => route.abort());
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('engine-error')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('notation-skeleton')).toBeHidden();
});

// One fixture per importer path, and the evidence behind criterion 1's `.gp5`. All are already
// committed — no new content needed. Q6: 1-beat.musicxml and 1-beat.mxl are real MuseScore
// exports (plain and compressed MusicXML take different code paths); 1-beat.atex is a real
// alphaTex export. ScoreLoader never sees a filename, so one fixture per path is enough.
for (const fixture of [
  'alphatex-GP5.gp5',
  'alphatex-GPX.gpx',
  '1-beat.musicxml',
  '1-beat.mxl',
  '1-beat.atex',
]) {
  test(`opens ${fixture} and renders notation`, async ({ page }) => {
    await page.goto('/play');
    await page.getByTestId('open-file-input').setInputFiles(`e2e/fixtures/${fixture}`);
    await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
      timeout: 30_000,
    });
  });
}
```

**Then fix the three tests written earlier, which this task breaks.** Task 6's notation case and
Task 7's worklet case both `goto('/play')` and wait on `notation-surface svg` — but from this task
on, a bare `/play` shows the empty state, because Step 5 drops `settings.core.file`. Insert the
sample click after each `goto`:

```ts
await page.goto('/play');
await page.getByTestId('load-sample').click(); // this task removed the auto-load
await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
  timeout: 30_000,
});
```

The sample is still the fixture — only the way it arrives changed — so both tests keep asserting
exactly what they asserted before.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: FAIL — no `empty-state`, no `open-file-input`, no `load-sample`.

- [ ] **Step 3: Write the open-file control**

Create `web/app/play/OpenFileControl.tsx`:

```tsx
'use client';

import { useId, useRef } from 'react';
import { Button, toast } from '@notation-hero/client';

import type { LoadedNotation } from './PlayerShell';

// Every extension of a format AlphaTab 1.8.4 reads (spec §4): Guitar Pro 3-8, MusicXML plain and
// compressed, Capella and alphaTex, by extension only. ScoreLoader sniffs file CONTENT and never
// sees a filename — it loops Environment.buildImporters() and breaks on the first that does not
// throw — so this is an affordance for the OS dialog, not a guarantee. A file the importer cannot
// read still raises the unsupported-file toast. `.mxml` is absent on purpose: no standard defines
// it. So is `.mid`: AlphaTab has no MIDI importer.
const ACCEPT = '.gp,.gp3,.gp4,.gp5,.gpx,.musicxml,.mxl,.xml,.capx,.atex,.alphatex';

// Notation-only files are 3-16 KB, but a Guitar Pro file with an embedded backing track is
// legitimately 7-8 MB, so the bound is deliberately generous. It exists because
// loadScoreFromBytes is SYNCHRONOUS and runs on the main thread: a mis-dropped video or disk
// image would freeze or crash the tab with no message, and no try/catch recovers from that.
// Checked before arrayBuffer(), so the bytes never reach memory. It does NOT bound decompressed
// size — .gpx is a ZIP container AlphaTab inflates, which needs a worker-side bound (post-v0).
const MAX_NOTATION_BYTES = 25 * 1024 * 1024;

interface OpenFileControlProps {
  onNotation: (notation: LoadedNotation) => void;
  /** Renders the compact rail button once a score is loaded, the large empty-state one before. */
  compact?: boolean;
}

async function readNotation(file: File): Promise<LoadedNotation> {
  if (file.size > MAX_NOTATION_BYTES) {
    throw new Error(`${file.name} is too large to open.`);
  }
  const buffer = await file.arrayBuffer();
  // loadScoreFromBytes takes a Uint8Array, so wrap here rather than at the call site.
  return { name: file.name, bytes: new Uint8Array(buffer) };
}

export function OpenFileControl({ onNotation, compact = false }: Readonly<OpenFileControlProps>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  // Every failure on this boundary lands on ONE surface. `void accept(...)` is the idiom that
  // silences the floating-promise lint rule — and it would silence the rejection with it, so a
  // file the browser cannot read (moved, deleted, volume unmounted between the pick and the read)
  // would produce nothing at all: no toast, no error state, just a control the user keeps pressing.
  const accept = async (file: File | undefined) => {
    if (!file) return;
    try {
      onNotation(await readNotation(file));
    } catch {
      toast.error(`${file.name} could not be opened.`);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        data-testid="open-file-input"
        type="file"
        accept={ACCEPT}
        className="sr-only"
        // tabIndex -1 takes the invisible input out of the tab order; aria-hidden takes it out of
        // the accessibility tree too. BOTH are required. With tabIndex alone the input is no
        // longer tied to a label, and axe reports a CRITICAL "Form elements must have labels"
        // violation that blocks the a11y job — measured 0 violations with the old label form,
        // 1 critical with tabIndex alone, 0 again once aria-hidden was added.
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          void accept(file);
          // Reset at the END of every change — cancel, parse failure and success alike. A file
          // input fires no change event when its value is unchanged, so without this a user who
          // cancels and re-picks the SAME file gets nothing, and the natural retry after a failed
          // parse is dead too.
          event.target.value = '';
        }}
      />
      {/* A REAL button, not a <label> wrapping the input. Button's focus-visible ring classes only
          activate on the element that actually has focus — with the label form, Tab lands on the
          sr-only input and the ring never paints: measured 0 differing pixels between focused and
          unfocused, a WCAG 2.4.7 failure. The button form paints the ring and keeps one tab stop.
          `accept` stays on the real <input>, which is still what opens the picker, so the OS
          filter is unaffected (file-chooser verified firing on both the click and Space paths).
          Do NOT "fix" the old form by making the label focusable: a label has no native keyboard
          activation, so Enter and Space produced no file chooser at all. */}
      <Button
        type="button"
        data-testid="open-file-button"
        variant={compact ? 'outline' : 'default'}
        className={compact ? 'min-h-11 min-w-11' : 'min-h-11 px-8 text-base'}
        onClick={() => inputRef.current?.click()}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          folder_open
        </span>
        <span className={compact ? 'sr-only' : undefined}>Open file</span>
      </Button>
    </>
  );
}
```

> **iOS is out of v0 scope and unverified.** The alphaTab fork this project references uses the
> button-and-ref form above on every non-iOS browser, and branches to a persistent hidden input plus
> a `<label>` only under a runtime `isIOS()` check — dropping `accept` entirely on the iOS
> programmatic-click path. So if iOS ever enters scope, add an `isIOS()` branch and verify it on a
> real device; do not keep a label everywhere for it, which fails focus visibility on every desktop
> browser. v0's gate is desktop web.

> The drag handlers that used to live on this component's wrapper `<div>` are gone — they belong on
> the whole player surface (Task 10 Step 5), not on a button-sized box. See that step for why.

- [ ] **Step 4: Write the empty state**

Create `web/app/play/EmptyState.tsx`:

```tsx
'use client';

import { Button, Card, CardContent } from '@notation-hero/client';

import { OpenFileControl } from './OpenFileControl';
import type { LoadedNotation } from './PlayerShell';

interface EmptyStateProps {
  onNotation: (file: LoadedNotation) => void;
  onLoadSample: () => void;
}

export function EmptyState({ onNotation, onLoadSample }: Readonly<EmptyStateProps>) {
  return (
    // Card, not a hand-rolled bordered div. It is one of the 41 gated components under
    // client/src/components/ui/, so the empty state inherits its VR and axe baselines and its
    // token-driven surface instead of re-deriving them by hand. `nh-empty` is the hook the drag
    // overlay hides against in Step 5.
    <Card data-testid="empty-state" className="nh-empty min-h-[420px] border-dashed">
      <CardContent className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">
          Drop a score anywhere on this area, or open one from your computer.
        </p>
        <OpenFileControl onNotation={onNotation} />
        <Button
          data-testid="load-sample"
          variant="ghost"
          className="min-h-11"
          onClick={onLoadSample}
        >
          Load the sample beat
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Parse in the shell, and hold the open score there**

The shell owns the OPEN notation — its name plus the **parsed** score. Parsing happens here,
before any state change, which is the staged load the spec specifies: a file that does not parse
never becomes the open notation, so the score on screen is untouched **by construction** and there
is no rollback path to build. Add to `PlayerShell.tsx`:

```tsx
/** What the picker produces: a file read into memory, not yet parsed. */
export interface LoadedNotation {
  name: string;
  bytes: Uint8Array;
}

/** What the player holds: a name and the PARSED score. */
interface OpenNotation {
  name: string;
  score: AlphaTab.model.Score;
}

const [notation, setNotation] = useState<OpenNotation | null>(null);
// True while a file waits for the engine: the surface shows its Skeleton instead of the empty state.
const [pending, setPending] = useState(false);

const requestNotation = useCallback(
  async (file: LoadedNotation) => {
    let at = engine;
    if (!at) {
      // Opened before the engine arrived — a fast click on the empty state, or Task 13's stalled
      // import. Keep the file and show the loading surface now, then wait for the SAME memoised
      // import the provider is waiting on. This is the event path, not an effect, so the
      // `react-hooks/set-state-in-effect` lint error does not apply.
      setPending(true);
      at = await loadAlphaTabEngine().catch(() => null);
      setPending(false);
      // The engine failed; that failure is reported by the engine-error message, not by a toast.
      if (!at) return;
    }

    // Task 11 inserts the replace confirmation HERE — before the parse, per spec §4.
    let score: AlphaTab.model.Score;
    try {
      score = at.importer.ScoreLoader.loadScoreFromBytes(file.bytes);
    } catch {
      toast.error(`${file.name} could not be opened — it is not a score format the player reads.`);
      return;
    }

    setNotation({ name: file.name, score });
  },
  [engine],
);

const loadSample = useCallback(async () => {
  try {
    const response = await fetch('/notation/1-beat.gp');
    // Without this a 404's HTML body is read as score bytes and fails later, deeper, with a
    // misleading "not a score format the player reads" message.
    if (!response.ok) throw new Error(String(response.status));
    const buffer = await response.arrayBuffer();
    requestNotation({ name: '1-beat.gp', bytes: new Uint8Array(buffer) });
  } catch {
    toast.error('The sample beat could not be loaded.');
  }
}, [requestNotation]);
```

Drop `settings.core.file = SAMPLE_NOTATION` from `NotationSurface` — the score now always arrives
through `renderScore` (below), so the mount no longer auto-loads anything. Remove the now-unused
`SAMPLE_NOTATION` constant. Export `readNotation` from `OpenFileControl.tsx` so the shell's drop
handler below can reuse it (same size gate, same failure toast).

Then wire the selector into `NotationSurface.tsx`. This is where rendering changes, so it lands in
the same task as the end-to-end tests that exercise it. Import the selector, add the prop, and take
it in the signature:

```tsx
import { selectDrumTrackIndexes } from '../../lib/alphatab/drum-tracks';

interface NotationSurfaceProps {
  /** Handed the live api as soon as it exists, and null on dispose. */
  onApiReady: (api: AlphaTab.AlphaTabApi | null) => void;
  /** The open score, already parsed by the shell; null until one is open. */
  notation: OpenNotation | null;
}

export function NotationSurface({ notation, onApiReady }: Readonly<NotationSurfaceProps>) {
```

Replace the `settings.core.file = SAMPLE_NOTATION;` approach for user scores with an explicit
`renderScore` — add this effect beside the mount effect:

```tsx
// The score arrives ALREADY PARSED. PlayerShell parses inside requestNotation, before it swaps
// state (above), so a file that does not parse never becomes the open notation — there is no
// rollback path to build because there is nothing to roll back. This effect only renders, and
// nothing is destroyed: the workers and the loaded soundfont are reused, so a rejected
// replacement leaves the playing score untouched by construction.
useEffect(() => {
  const api = apiRef.current;
  if (!api || !notation) return;

  const drumIndexes = selectDrumTrackIndexes(notation.score.tracks);
  // INDEXES, not Track objects. Passing undefined makes AlphaTab render score.tracks[0] — its
  // FIRST track, not a "default" or preferred one (see renderScore in alphaTab.core.mjs). Fine
  // here: this branch only runs when no track carries a percussion staff at all, where any
  // track is as good as another.
  api.renderScore(notation.score, drumIndexes.length > 0 ? drumIndexes : undefined);
  setRenderedTrackCount(drumIndexes.length > 0 ? drumIndexes.length : 1);
}, [notation]);
```

and expose the count for the test:

```tsx
<span data-testid="rendered-track-count" className="sr-only">
  {renderedTrackCount}
</span>
```

`NotationSurface`'s prop is therefore the parsed shape, not the bytes:

```tsx
interface OpenNotation {
  name: string;
  score: AlphaTab.model.Score;
}
```

`loadScoreFromBytes` takes a `Uint8Array`, so the `ArrayBuffer` from the file read is wrapped at the read site (`readNotation`), parsed in `requestNotation` above, and only the result reaches this component.

- [ ] **Step 6: Make the whole player surface the drop target**

The fork this project references puts `onDragOver`/`onDrop` on its **outermost** player wrapper, so
a file can be dropped anywhere on the player in either state. Do the same — and add the affordance
the fork lacks, because its only drag feedback is the OS cursor (`dropEffect = 'link'`), which is
easy to miss.

First widen `PlayerShell.tsx`'s imports. From this task on the file uses `toast` and
`loadAlphaTabEngine` (Step 5's `requestNotation`), `OpenFileControl` (the rail control below) and
`readNotation` (the drop handler below), and Task 6's import list has only `Button`:

```tsx
import { Button, toast } from '@notation-hero/client';
import { loadAlphaTabEngine } from '../../lib/alphatab/engine';
import { OpenFileControl, readNotation } from './OpenFileControl';
```

In `Player`, read the engine's error as well — the markup below shows it when the engine never loaded:

```tsx
const { engine, error: engineError } = useAlphaTabEngine();
```

```tsx
const [dragging, setDragging] = useState(false);
const depth = useRef(0);
const endDrag = useCallback(() => {
  depth.current = 0;
  setDragging(false);
}, []);

// Same boundary as OpenFileControl's `accept`: the 25 MB check, then one failure toast. Without the
// try/catch, `void acceptDropped(...)` would hide a rejected read and show nothing at all.
const acceptDropped = useCallback(
  async (file: File | undefined) => {
    if (!file) return;
    try {
      requestNotation(await readNotation(file));
    } catch {
      toast.error(`${file.name} could not be opened.`);
    }
  },
  [requestNotation],
);

// A cancelled drag (Esc, or releasing outside the window) fires NO further drag event, so the
// counter never unwinds and the overlay would stay up forever. Pointer events are suppressed for
// the duration of a drag, so the first pointermove afterwards is a reliable "it is over" signal
// and does not fire mid-drag.
useEffect(() => {
  const onEnd = () => {
    if (depth.current !== 0) endDrag();
  };
  globalThis.addEventListener('dragend', onEnd);
  globalThis.addEventListener('pointermove', onEnd);
  return () => {
    globalThis.removeEventListener('dragend', onEnd);
    globalThis.removeEventListener('pointermove', onEnd);
  };
}, [endDrag]);
```

and the markup, replacing the plain `<main>` body:

```tsx
<main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
  <h1 className="sr-only">Player</h1>

  {/* A dragenter/dragleave COUNTER, never a bare setDragging(false). `dragleave` also fires on
      the container whenever the pointer crosses into a CHILD, with relatedTarget set to that
      child, so the naive form cannot tell "left for a child" from "left the surface" — measured
      14 state transitions on one drag across the control, a visible strobe. Clamped at 0 so a
      stray leave cannot make the next enter a no-op. */}
  <section
    className="relative flex flex-col gap-4"
    data-dragging={dragging || undefined}
    onDragEnter={(event) => {
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    }}
    onDragLeave={() => {
      depth.current = Math.max(0, depth.current - 1);
      setDragging(depth.current > 0);
    }}
    onDragOver={(event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'link';
    }}
    onDrop={(event) => {
      event.preventDefault();
      endDrag();
      // One file, no extension filter — the same size gate and the same unsupported-file toast
      // the picker uses. ScoreLoader sniffs content, so a filter here would buy nothing.
      void acceptDropped(event.dataTransfer.files[0]);
    }}
  >
    <div className="relative">
      {/* Exactly one of these three fills the notation area. When the engine never loaded, nothing
          can open or play, so the message replaces the empty state — the Play button stays where it
          is, disabled (spec §4). Flat conditionals, not a nested ternary:
          sonarjs/no-nested-conditional is an error in web/. */}
      {engineError ? (
        <p
          data-testid="engine-error"
          role="alert"
          className="flex min-h-[420px] items-center justify-center rounded-md border border-destructive/25 bg-[color-mix(in_oklab,var(--destructive)_10%,var(--popover))] p-6 text-center text-destructive"
        >
          The player engine could not start. Reload the page to try again. ({engineError.message})
        </p>
      ) : null}
      {!engineError && notation === null && !pending ? (
        <EmptyState onNotation={requestNotation} onLoadSample={loadSample} />
      ) : null}
      {!engineError && (notation !== null || pending) ? (
        <NotationSurface notation={notation} onApiReady={handleApiReady} />
      ) : null}
      {dragging ? (
        /* MUST be a descendant of the drop container AND pointer-events-none. An overlay mounted
           outside the container oscillated forever: every dragleave's relatedTarget was the
           overlay, which is not a descendant, so no matching dragenter ever arrived inside and
           the counter could not balance. aria-hidden is deliberate — it is decorative during a
           pointer gesture, and the keyboard path is the labelled Open file button. */
        <div
          aria-hidden
          className="nh-drop-overlay pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-primary" aria-hidden="true">
            upload
          </span>
          <p className="text-lg font-semibold text-foreground">Drop to open</p>
          <p className="text-sm text-foreground opacity-75">
            Guitar Pro, MusicXML, Capella or alphaTex
          </p>
        </div>
      ) : null}
    </div>

    <div
      data-testid="player-status"
      data-playing={playing}
      data-position={positionMs}
      data-soundfont={soundFontReady}
      className="flex items-center gap-3"
    >
      {/* …the Play button from Task 6… */}
      {/* The rail control. Without it OpenFileControl unmounts together with EmptyState the moment
          a score opens, taking open-file-input out of the DOM: every Task 11 replace test would
          fail on element-not-found, requestNotation's confirm branch would be unreachable, and a
          user would have no way to open a second score at all. This is the call site the
          already-implemented `compact` variant never had. */}
      {notation !== null ? <OpenFileControl compact onNotation={requestNotation} /> : null}
    </div>
  </section>
</main>
```

The overlay's own styles go in `web/app/globals.css` — no hardcoded white or black, so it reads in
both themes:

```css
.nh-drop-overlay {
  border-radius: var(--radius);
  background: color-mix(in oklab, var(--background) 80%, transparent);
  /* Without the blur the empty state's own teal Open file button shows through directly behind
     the hint line. */
  backdrop-filter: blur(3px);
}
/* The whole surface signals "drop anywhere in here"; only the score area carries the scrim, so
   the transport stays legible rather than reading as a broken player. */
[data-dragging] {
  outline: 2px dashed var(--primary);
  outline-offset: 6px;
  border-radius: var(--radius);
}
/* The empty-state prompt is redundant while dragging and collides with the overlay message.
   `visibility`, not `opacity`, so it leaves the accessibility tree and the tab order too. */
[data-dragging] .nh-empty {
  visibility: hidden;
}
```

Measured on this markup: axe reports **0 violations** in all four states (empty/loaded x light/dark),
and the overlay text clears WCAG **AAA** in every one — worst case 8.52:1 for the small hint line
against a 4.5:1 AAA bar, sampled from real pixels at the glyph coordinates.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS — the whole lane, including the two earlier cases this task just repaired.

- [ ] **Step 8: Verify by hand, including drag-and-drop**

Playwright cannot exercise a real OS drag, so drop a `.gp` file onto `/play` in a browser yourself
and confirm it loads. Check all four drag states while you are there: the dashed ring appears on the
whole surface, the overlay message appears over the score area only, the overlay does **not** strobe
as you move the pointer across the buttons, and pressing **Esc** mid-drag clears it (that path fires
no drag event at all, which is what the `pointermove` safety net covers).

- [ ] **Step 9: Commit**

```bash
git add web/app/play web/app/globals.css web/e2e/player.e2e.ts
git commit -m "feat(web): open a score by picker or drop, with a sample-beat fallback (NH-291)"
```

---

### Task 11: Replacing a loaded score asks first

The most subtle flow in v0. `window.confirm()` blocks the main thread, which is where AlphaTab's sample pump runs — so the audio worklet drains its ~500 ms buffer and zero-fills on its own while the dialog is up. Calling `pause()` first would not help: it only posts a message to the synth worker, and the reply that stops the audio graph is handled on the blocked main thread, so the pause would land _after_ the prompt returns.

**Files:**

- Modify: `web/app/play/OpenFileControl.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: everything from Task 10.
- Produces: nothing new for later tasks; this closes success criterion 10.

- [ ] **Step 1: Write the failing tests**

Add to `web/e2e/player.e2e.ts`:

```ts
// Playwright AUTO-DISMISSES window.confirm() when no listener is attached, which would silently
// turn every replace test into a cancel test. Each case below registers its handler BEFORE the
// action that triggers the prompt.
test('cancelling a replacement keeps the current score playing from where it was', async ({
  page,
}) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');

  // Capture the position BEFORE the prompt — this is the value the resume has to preserve, and
  // it is the only assertion here with any discriminating power. `data-playing` is already 'true'
  // and window.confirm blocks the main thread, so playerStateChanged cannot fire while the dialog
  // is up: re-checking it afterwards re-reads a value that could not have moved, and would pass
  // just as happily if the resume logic were deleted or playback restarted from bar 1.
  const before = Number(
    (await page.getByTestId('player-status').getAttribute('data-position')) ?? '0',
  );
  expect(before).toBeGreaterThan(0);

  page.on('dialog', (dialog) => dialog.dismiss());
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');

  // Still the sample, still playing.
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
  await expect(page.getByTestId('loaded-notation-name')).toHaveText('1-beat.gp');

  // Resumed from where it was, and still advancing — not restarted, not frozen.
  await expect
    .poll(async () =>
      Number((await page.getByTestId('player-status').getAttribute('data-position')) ?? '0'),
    )
    .toBeGreaterThan(before);
});

test('re-picking the same file after a cancel prompts again', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  let prompts = 0;
  page.on('dialog', (dialog) => {
    prompts += 1;
    void dialog.dismiss();
  });

  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');

  await expect.poll(() => prompts).toBe(2);
});

test('confirming a replacement renders the new score', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');

  await expect(page.getByTestId('loaded-notation-name')).toHaveText('Punk.gp', { timeout: 30_000 });
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2');
});

test('a corrupt replacement leaves the playing score intact', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('open-file-input').setInputFiles({
    name: 'broken.gp5',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a score'),
  });

  await expect(page.getByText(/could not be opened/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('loaded-notation-name')).toHaveText('1-beat.gp');
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "replacement|same file"`
Expected: FAIL — no prompt is shown and no `loaded-notation-name` exists.

- [ ] **Step 3: Add the score-name hook**

In `PlayerShell.tsx`, render the current score's name:

```tsx
<span data-testid="loaded-notation-name" className="sr-only">
  {notation?.name ?? ''}
</span>
```

- [ ] **Step 4: Write the replace flow**

In `PlayerShell.tsx`'s `Player`, add:

```tsx
const requestNotation = useCallback(
  async (next: LoadedNotation) => {
    let at = engine;
    if (!at) {
      // Same as Task 10: opened before the engine arrived. Nothing can be open yet, so there is
      // nothing to confirm — keep the file, show the loading surface, and wait for the import.
      setPending(true);
      at = await loadAlphaTabEngine().catch(() => null);
      setPending(false);
      if (!at) return;
    }

    const api = apiRef.current;
    // Record the playing state BEFORE the prompt: window.confirm blocks the main thread, so the
    // worklet drains its ~500 ms buffer and zero-fills on its own while the dialog is up, and
    // playerStateChanged cannot fire until the prompt returns.
    const wasPlaying = playing;

    // Spec §4 order: confirm FIRST, then parse, then swap. A first load has nothing to replace.
    if (notation !== null) {
      // Deliberate v0 shortcut. To be precise about what is and is not missing: the Base UI
      // Dialog PRIMITIVE is already in the repo — Sheet is a shadcn port over
      // `@base-ui/react/dialog`, with focus trap, scroll lock, overlay and a required title,
      // carrying VR and axe baselines. What does not exist is an AlertDialog COMPONENT (six
      // co-located files plus baselines). Building it is Plan C work, and it would be a real
      // simplification here, not just a prettier dialog: a non-blocking dialog removes the buffer
      // drain, the `wasPlaying` capture and the resume-on-cancel below, because playback simply
      // never stops. v0 keeps window.confirm; do not describe the primitive as missing.
      const confirmed = globalThis.confirm(
        `Replace ${notation.name} with ${next.name}? The score you have open will be closed.`,
      );

      if (!confirmed) {
        // Cancel keeps the current score and discards the new file. Resume from the same position.
        if (wasPlaying) api?.play();
        return;
      }
    }

    // Confirm stages the load: parse the new buffer first, and swap only on success.
    let score: AlphaTab.model.Score;
    try {
      score = at.importer.ScoreLoader.loadScoreFromBytes(next.bytes);
    } catch {
      toast.error(`${next.name} could not be opened — it is not a score format the player reads.`);
      // The open score was never replaced. Only restart playback: the dialog emptied the buffer.
      if (wasPlaying) api?.play();
      return;
    }

    // Pause only on the confirm path, to stop the synth before renderScore swaps the score.
    if (wasPlaying) api?.pause();
    setNotation({ name: next.name, score });
  },
  [engine, notation, playing],
);
```

and pass `requestNotation` as `onNotation` to `OpenFileControl`. On the parse-failure path the open score was never replaced, so there is nothing to restore — the function only restarts playback, because the confirm dialog emptied the audio buffer. It is the same restart the cancel path does.

> **No `eslint-disable` comment here, and `globalThis.confirm`, not `window.confirm`.** Both are
> checked against `web/`'s lint (`--max-warnings 0`): `no-alert` is not enabled in `web/`, so an
> `eslint-disable-next-line no-alert` is reported as an unused directive and fails lint wherever it
> is placed; and `unicorn/prefer-global-this` is an error, so `window.confirm` fails too.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS — all cases.

- [ ] **Step 6: Verify the resume by ear**

Playwright cannot hear. Load the sample, press play, wait a few bars, pick another file, cancel — the audio should resume from where it was, not restart and not stop. Do the same with a corrupt file and confirm.

- [ ] **Step 7: Commit**

```bash
git add web/app/play web/e2e/player.e2e.ts
git commit -m "feat(web): confirm before replacing a score, and survive a corrupt replacement (NH-291)"
```

---

### Task 12: Loading feedback while a score parses

A replacement gets a toast: loading, success and failure share one surface, and the score on screen keeps playing — the load is staged, so nothing covers the notation area. A first open has nothing playing, so there the Skeleton covers the parse instead.

**Files:**

- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `client/src/components/ui/Sonner/Sonner.stories.tsx`
- Modify: `client/src/components/ui/Sonner/Sonner.story-ids.ts`

**Interfaces:**

- Consumes: `toast` from `@notation-hero/client` (Task 4).
- Produces: a `loading` story under the existing `client/` VR and axe gates.

- [ ] **Step 1: Add the loading feedback**

In `PlayerShell.tsx`'s `requestNotation` (Task 11's version), show feedback before the parse — the
toast on the confirm path, after the dialog returns, and the Skeleton on a first open — and resolve
it in the same function: it is the one place that knows the file name and whether this is a
replacement. One `id` makes all three toast states share one toast.

Give `if (notation !== null)` an `else` branch, and wait for a painted frame after the whole block:

```tsx
if (notation !== null) {
  // …the confirm and its cancel path, unchanged from Task 11…

  // Sonner ships its own spinner, so this needs no new component — and Skeleton would hide a
  // score that is still playable.
  toast.loading(`Opening ${next.name}…`, { id: 'notation-load' });
} else {
  // A first open has nothing playable to hide, so the Skeleton covers the parse instead. A long,
  // dense score takes a noticeable time to parse (2,000 bars of 16ths: ~0.4 s on a fast laptop,
  // longer on a slow one), while file size barely matters. On a fast machine a small file makes
  // this a brief Skeleton flash — accepted over a frozen empty state.
  setPending(true);
}

// loadScoreFromBytes is synchronous: wait for a painted frame first, or the toast or the Skeleton
// would appear only once the parse had finished.
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
```

Clear `pending` on both outcomes of the parse. In the catch, give the parse-failure toast the same
`id`, so the failure replaces the spinner instead of stacking beside it:

```tsx
} catch {
  setPending(false);
  toast.error(`${next.name} could not be opened — it is not a score format the player reads.`, {
    id: 'notation-load',
  });
```

and around `setNotation({ name: next.name, score });`:

```tsx
setPending(false);
setNotation({ name: next.name, score });
// Only a replacement showed the loading toast; a first open's Skeleton lifts on renderFinished.
if (notation !== null) toast.success(`${next.name} loaded`, { id: 'notation-load' });
```

`setPending(false)` and `setNotation(…)` batch into one render, so the notation surface stays mounted
between the parse and the render. On a failed first open, the surface unmounts and the empty state
returns with the toast.

- [ ] **Step 2: Write the failing test — a `loading` story that axe and VR can hold open**

`web/`'s lane cannot audit this state: `loadScoreFromBytes` is synchronous, so the only async step on the replace path is the `FileReader` read of a 3-16 KB local file, leaving no request to stall and no event to hold the toast open. It is audited where the check can actually run.

Add `'loading'` to `client/src/components/ui/Sonner/Sonner.story-ids.ts`:

```ts
export const SONNER_STORY_IDS = [, /* existing ids */ 'loading'] as const;
```

Open the file first and append to the real array rather than replacing it.

- [ ] **Step 3: Run the gates to verify they fail**

```bash
pnpm --filter @notation-hero/client run test:a11y -g "Sonner"
```

Expected: FAIL — the `loading` story id has no story behind it.

- [ ] **Step 4: Write the story**

In `Sonner.stories.tsx`, add a `Loading` export that renders a persistent loading toast. Copy the neighbouring `Error` story's shape exactly and swap `toast.error` for `toast.loading`. What holds the toast open is the file's **own local `ToastOnMount` wrapper** (`Sonner.stories.tsx:42`) firing `toast.*(…, { duration: Infinity })` — **not** `openArgs`: `Sonner.a11y.ts` is a bespoke suite that navigates the story iframe and waits for `[data-sonner-toast]`, and it imports neither `openArgs` nor `a11y-helpers.ts`. Do not go looking for a shared helper here; there isn't one for this component.

- [ ] **Step 5: Run the a11y gate to verify it passes**

```bash
pnpm --filter @notation-hero/client run test:a11y -g "Sonner"
```

Expected: PASS.

- [ ] **Step 6: Generate the VR baseline in the Playwright container**

```bash
open -a Docker    # Docker Desktop must be running first
pnpm test:vr:docker:update
git status --short client/src/components/ui/Sonner
```

Expected: new `sonner-loading-*-linux.png` files only. **Never generate these natively on macOS** — darwin rasterises fonts differently and those baselines are git-ignored.

- [ ] **Step 7: Verify nothing else moved**

```bash
pnpm test:vr:docker
```

Expected: PASS with no diffs.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/ui/Sonner web/app/play/PlayerShell.tsx
git commit -m "feat(web): show loading feedback while a score parses (NH-291)"
```

---

### Task 13: Accessibility gate over the product's own UI

`web/` has no Storybook and no axe job, so without this the product's own screens would be the only ungated surface in the repo — while 40 of the 41 components under `client/src/components/ui/` carry VR and a11y baselines that block merge.

**Files:**

- Create: `web/e2e/a11y.e2e.ts`

**Interfaces:**

- Consumes: the lane from Task 7; every screen state from Tasks 6, 10 and 11.
- Produces: an axe gate over `/` and `/play`. Plan C extends it with the two popover-open states.

- [ ] **Step 1: Write the failing test**

Create `web/e2e/a11y.e2e.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Same WCAG tag set the client/ suite runs, so one repo has one bar.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page: Page, label: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    // Base UI renders focus-guard sentinels around every open popup — the standard focus-trap
    // technique. axe flags them as aria-hidden-focus because it cannot tell a deliberate sentinel
    // from a mistake; exclude exactly that selector so the rule stays live for real content.
    .exclude('[data-base-ui-focus-guard]')
    .withTags(TAGS)
    .analyze();

  const report = violations
    .map(
      (v) =>
        `[${v.id}] ${v.help}\n` +
        v.nodes.map((n) => `    ${n.failureSummary?.replaceAll(/\s+/g, ' ').trim()}`).join('\n'),
    )
    .join('\n');

  expect(violations, `${label}\n${report}`).toEqual([]);
}

test('landing page has no axe violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
  await expectNoViolations(page, 'landing');
});

test('player has no axe violations in its empty state', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expectNoViolations(page, 'play / empty');
});

test('player has no axe violations with a score loaded', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  await expectNoViolations(page, 'play / loaded');
});

// The sample renders 185 px tall and never scrolls; Punk.gp's two drum tracks render 1,026 px at this
// lane's width, so the 420 px notation box scrolls. Without this case axe's
// scrollable-region-focusable rule never meets a scrolling surface, and dropping the host's
// tabIndex would pass the gate.
test('player has no axe violations with a score long enough to scroll', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  const surface = page.getByTestId('notation-surface');
  await expect(surface.locator('svg').first()).toBeVisible({ timeout: 30_000 });
  // Prove the state this case exists for: the box really scrolls.
  await expect
    .poll(() => surface.evaluate((el) => el.scrollHeight > el.clientHeight), { timeout: 30_000 })
    .toBe(true);
  await expectNoViolations(page, 'play / scrolling score');
});

// The first-visit Skeleton is reachable because the engine import is a real request the lane can
// stall — this is exactly why that state is auditable here and the replacement loading toast is not.
test('player has no axe violations while the first-visit Skeleton is up', async ({ page }) => {
  await page.route('**/alphatab/esm/alphaTab.mjs', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await route.continue();
  });

  await page.goto('/play');
  // NotationSurface — and therefore notation-skeleton — only mounts once a score is chosen, so a
  // bare /play shows EmptyState and this case would wait forever. Clicking the sample mounts the
  // surface while the stalled import keeps `engine` null, which IS the first-visit state this
  // case exists to audit.
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('notation-skeleton')).toBeVisible();
  await expectNoViolations(page, 'play / skeleton');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/web run test:e2e a11y`
Expected: FAIL — either on missing modules (fix the import) or on real violations. **Real violations are the point.** Fix the markup, not the test: give every icon-only control an `aria-label`, keep one `<h1>` per page, do not nest a `<Link>` inside a `<button>`, and make sure the `Skeleton` carries `role="status"` with an accessible name.

- [ ] **Step 3: Fix the violations and re-run**

Run: `pnpm --filter @notation-hero/web run test:e2e a11y`
Expected: PASS — 5 tests.

- [ ] **Step 4: Gate the 44 px rule in the lane, not by eye**

A one-time hand check does not stop a later control shrinking below the minimum, and axe cannot
catch it either: the tag set above is `wcag2a/2aa/21a/21aa`, none of which carries a target-size
rule. (For the record on the bar: WCAG 2.5.8 AA asks only 24x24 CSS px — 44 px is 2.5.5 AAA and the
platform HIG, and it is what this plan's own Global Constraints demand. The assertion below enforces
the stricter rule deliberately.) Add to `web/e2e/a11y.e2e.ts`:

```ts
async function expectHitAreas(page: Page, label: string): Promise<void> {
  const tooSmall = await page.evaluate(() =>
    [...document.querySelectorAll('button, a[href], label[for], [role="button"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        // Skip controls that are not rendered at all; a hidden element has no hit area to fail.
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      })
      .map((el) => ({
        id: (el as HTMLElement).dataset.testid ?? el.textContent?.trim().slice(0, 24) ?? '?',
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      })),
  );
  expect(tooSmall, `${label}: controls under the 44px minimum`).toEqual([]);
}
```

Call it from each of the five cases above, beside `expectNoViolations`. Any entry is a control that
fails the tablet-landscape touch target — pad its hit area (keep the glyph at its drawn size) until
the list is empty.

- [ ] **Step 5: Run the whole lane and the repo checks**

```bash
pnpm --filter @notation-hero/web run test:e2e
pnpm run check:all
```

Expected: both PASS. `check:all` covers format, lint across packages, markdown/css/yaml/spell/shell/actions, layout, typecheck, depcheck, syncpack and every package's unit tests.

- [ ] **Step 6: Commit**

```bash
git add web/e2e/a11y.e2e.ts web/app
git commit -m "test(web): axe gate over the landing and player screens (NH-291)"
```

---

### Task 14: Open the pull request

**Files:** none — this is the shipping step.

- [ ] **Step 1: Confirm the tree is green**

```bash
pnpm run check:all
pnpm --filter @notation-hero/web run test:e2e
pnpm --filter @notation-hero/client run test:a11y
pnpm test:vr:docker
```

Expected: all PASS. Do not open the PR on a red tree.

- [ ] **Step 2: Push and open the PR**

Task 1 already opened this PR (to get a Vercel preview for the Q2 check), and GitHub refuses a
second open pull request for the same head branch — so this **retitles and re-bodies** it rather
than creating one. `git push` needs no `-u`: Task 1 set the upstream.

```bash
git push
gh pr edit --title "feat(web): v0 player — open a local score, see it, hear it (NH-291)" --body "$(cat <<'EOF'
Implements Plan A of the v0 local-file drum player: the AlphaTab engine, the `/play` screen, and a CI lane that proves the audio worker path is live.

Spec: `docs/specs/2026-09-10-v0-local-file-player-design.md`
Plan: `docs/plans/2026-09-13-v0a-engine-and-first-sound-plan.md`

## Success criteria covered

- [x] 1 — a drum score opened from local disk renders as standard notation (the lane opens `Punk.gp`, `Punk.mxl`, `Punk.alphatex`, `alphatex-GP5.gp5`, `alphatex-GPX.gpx`, `1-beat.musicxml`, `1-beat.mxl` and `1-beat.atex`)
- [x] 2 — pressing play produces audible drum audio with a tracking cursor (verified by ear; the CI lane can only verify it by state)
- [ ] 4 — leocaseiro's own score plays — **MANUAL**: tick only after Step 4 below
- [x] 8 — Load the sample beat fetches and plays the bundled score
- [x] 9 — a score with no percussion staff opens on `score.tracks[0]` (the lane opens `guitar-no-percussion.gp`; Q7 closed)
- [x] 10 — replacing prompts; cancel keeps the score playing from the same position; confirm renders the new one; a corrupt replacement leaves the playing score intact

Criteria 3, 5, 6 and 7 belong to Plans B and C.

## Open questions closed

- **Q6** — closed. Real exports cover every MusicXML and alphaTex path, verified with the pinned 1.8.4 importer: `1-beat.musicxml` and `1-beat.mxl` (MuseScore — plain and compressed MusicXML take different code paths), `Punk.mxl` (MuseScore, three tracks), and `1-beat.atex` and `Punk.alphatex` (Tabtify). `ScoreLoader` never sees a filename, so one fixture per path is enough. (`1-beat.xml` was a Guitar Pro binary under an `.xml` name — GP5 coverage, not MusicXML.)
- **Q7** — closed. `web/e2e/fixtures/guitar-no-percussion.gp` is generated via `AlphaTexImporter` + `Gp7Exporter` and round-trips as one non-percussion track, so criterion 9 is verified by running.

## Known limitations

- The 25 MB size gate bounds the file read, not the decompressed size: `.gpx` is a ZIP container AlphaTab inflates, which would need a worker-side bound. Out of scope for v0.
- iOS is unverified. The picker uses a button plus a programmatic `input.click()`, which is what the alphaTab fork ships on every non-iOS browser; iOS needs an `isIOS()` branch, verified on a real device, if it ever enters scope. v0's gate is desktop web.

## Pulumi preview

safe — no `infra/` changes in this PR.
EOF
)"
```

- [ ] **Step 3: Re-verify on the deployed preview**

Task 2 Step 11 first checked the _generated_ files on a preview. Re-run the same check on the PR's
final build: every success criterion in the spec is written "on a deployed Vercel URL", and the lane
only ever serves a local `next start`. Once the PR's preview has built, run Task 2 Step 11's loop
against the new `PREVIEW` URL.

Expected: the same as Task 2 Step 11. Then open `$PREVIEW/play` and walk criteria 1, 2, 8 and 10
there. A failure here, after Task 2 Step 11 passed, means something changed since — compare the two
previews' build logs, using Step 11's diagnoses, before merging.

- [ ] **Step 4: Open your own score (criterion 4)**

Criterion 4 has no automated evidence and no other step. On `$PREVIEW/play`, open one of your own
Guitar Pro files — including a large one with an embedded backing track, which is what the 25 MB
gate exists for — press play, and listen. Only then tick criterion 4 in the PR body.

- [ ] **Step 5: Tick the checklist and watch CI**

The `pr-checklist-sync` workflow appends any missing checklist items when the PR opens. **Tick each box yourself** — every item is a past-tense claim, and a tick whose condition applied but whose work you skipped is a false claim. Then:

```bash
gh run watch
```

Local green is not CI green — binary versions and scan scope differ. Watch the run to completion.

- [ ] **Step 6: Update the decision registry**

Every PR that changes what is enforced updates `docs/decisions/decision-registry.md` in the SAME PR, so it lands atomically on merge. Add a Change-log entry dated 2026-09-14 recording: D5 confirmed against a real Vercel deploy (Task 1, re-verified on the generated assets in Step 3), the type-only AlphaTab import is now lint-enforced, the `web` package gained a merge-blocking browser lane, and `web/vercel.json` pins `buildCommand` so the vendor step cannot be bypassed.

```bash
git add docs/decisions/decision-registry.md
git commit -m "docs(decisions): record the v0 engine decisions as enforced (NH-291)"
git push
```

---

## Self-Review

Regenerated 2026-09-14, after a seven-persona review and four spikes. The earlier version's
placeholder scan claimed a completeness it did not have, so this one says where each item closes.

**Spec coverage.** §4 data flow → Tasks 9, 10. §4 replace flow → Task 11. §4 failure states →
Tasks 6 (engine + soundfont), 10 (unsupported file, oversized file, unreadable file, sample fetch,
empty state). §4 loading affordances → Task 6 (Skeleton, lifted on `renderFinished`), Task 4 (icon
font), Task 12 (replacement toast, and the Skeleton through a first open's parse); **the soundfont progress bar is Plan B** because §7 files it
under `client/`. §4 mounting → Task 6. §5 all three requirements → Tasks 2, 3, 5. §5 vendoring →
Task 2 (plus the pinned `buildCommand`). §5 regression test → Task 7. §5 CI step → Task 8. §5 axe
lane → Task 13. §5 client-side toast audit → Task 12. §7 barrel/`'use client'` prerequisite →
Task 4. §8 criteria 1, 2, 8, 9, 10 → Tasks 6, 10, 11; criterion 4 → Task 14 Step 4, by hand, on the
deployed preview. §9 Q2 → Task 1, re-verified on the generated assets in Task 14 Step 3.
**Deliberately not covered here:** the transport row, scrubber, tempo control, Loop/Metronome/Count-In
and the soundfont progress bar (Plan B); `Accordion`, `Slider`, the Settings and Tracks popovers and
settings persistence (Plan C); a styled replace dialog (Plan C — the Base UI Dialog primitive exists,
the AlertDialog component does not); Q4 browser matrix (post-v0 per D7); CSP headers for `web/`
(`ARCH-SEC-2` is written for the dropped CloudFront delivery and needs re-scoping to Vercel);
a decompressed-size bound for `.gpx`; iOS.

**Placeholder scan.** Exactly **one** step says "open the real file and match what it exports"
rather than inventing an API: the Material Symbols `src` descriptor (Task 4 Step 7). It names the
exact file and the `grep` that reveals the answer, so it is an instruction to read something that
exists, not deferred work. **Everything the previous scan missed is now closed in place, not
deferred:** `apiRefLocal` is gone — `NotationSurface` declares a real `apiRef` in Task 6;
`<Button asChild>` is gone — the landing page uses Base UI's `render` prop and `OpenFileControl` is a
real `<button>`, because `asChild` appears nowhere in `client/src`; `args.state === 1` is gone —
`handleApiReady` reads `engine.synth.PlayerState.Playing`; and the Sonner story instruction now names
the actual mechanism (`ToastOnMount` + `duration: Infinity`) instead of an `openArgs` helper that
component's suite never imports.

**Verification honesty.** Every "Expected: PASS" in this plan should now be true when you reach it.
The three that were not: Task 3 Step 6 lint (variant A's value import — the spike surface is deleted
in Step 6 now), Task 6 Step 9 typecheck (`@playwright/test` arrived a task too late — the install
moved to Task 6 Step 1), and Task 10 Step 7 (three earlier tests broke when the auto-load went — the
sample click is inserted in Step 1). Task 7's lane could neither pass nor fail honestly: its worklet
assertion used `page.waitForResponse`, which Chromium never fires for an `AudioWorklet.addModule()`
fetch, and its discrimination drill moved a file that `pnpm build` re-vendors before any test runs.
Both are fixed, and a second drill now exercises `Platform: BrowserModule` — the assertion that
actually catches the bundled-copy regression, which deleting an asset never could.

**Type consistency.** `AlphaTabEngine` (Task 5) is the type every later task names.
`LoadedNotation { name, bytes }` is what the picker produces; `OpenNotation { name, score }` is what
the shell holds after parsing, and is `NotationSurface`'s `notation` prop — the two are distinct on
purpose, because parsing before the state swap is what removes the rollback path.
`selectDrumTrackIndexes` keeps one name and one signature. `loadAlphaTabEngine` / `resolveLogLevel` /
`useAlphaTabEngine` are spelled identically everywhere. Test ids are declared in the task that
creates them and reused verbatim: `notation-surface`, `notation-skeleton`, `engine-error`,
`transport-play`, `player-status` (with `data-playing`, `data-soundfont`, `data-position`),
`rendered-track-count`, `open-file-input`, `open-file-button`, `load-sample`, `empty-state`,
`loaded-notation-name`.

**Vocabulary.** This plan says `notation` for the opened file, `score` for AlphaTab's parsed object
and in user-facing copy, and never "chart" (`CONCEPTS.md`). AlphaTab's own API names — `ScoreLoader`,
`loadScoreFromBytes`, `renderScore`, `model.Score` — are left verbatim.
