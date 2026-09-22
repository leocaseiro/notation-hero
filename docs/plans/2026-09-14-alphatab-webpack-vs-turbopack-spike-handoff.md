# Handoff — spike the official AlphaTab + webpack + Next.js 16 route against our Turbopack one

**Date:** 2026-09-14 · **Jira:** NH-291 (epic), NH-298 (post-v0 items) · **Branch:** `spike/alphatab-nextjs-poc`

> **Read this first, then do the work in a NEW session.** Nothing here is started. This is a
> decision spike: it may reverse decision **D5**, and D5 is what the whole v0 Plan A is built on.

---

## Why this exists

The v0 delivery decision (D5) is: keep Turbopack, never let it bundle AlphaTab, self-host the
prebuilt ESM in `public/alphatab/`, and pull it in through a `turbopackIgnore` dynamic import. It
works — the spike observed `Environment.webPlatform === BrowserModule` with playback advancing.

What nobody did was weigh it against **the route AlphaTab's own authors ship and recommend.** The
original spike dropped the webpack plugin with this line:

```
| AlphaTabWebPackPlugin from @coderline/alphatab-webpack | dropped — no Turbopack plugin exists; replaced by risk-1 fix |
```

"No Turbopack plugin exists" is true, but it is the _consequence_ of staying on Turbopack, not a
reason to stay on it. Staying on Turbopack was never examined as a choice, and the official sample
was never opened. That gap is the whole reason for this spike.

## What is already established (do not re-derive)

**The official sample** — <https://github.com/CoderLine/alphaTabSamplesWeb/tree/main/src/webpack-nextjs-16>.
Its entire `next.config.ts`, fetched 2026-09-14:

```ts
import type { NextConfig } from 'next';
import { AlphaTabWebPackPlugin } from '@coderline/alphatab-webpack';

const nextConfig: NextConfig = {
  webpack(config) {
    config.plugins.push(new AlphaTabWebPackPlugin({ assetOutputDir: 'public/alphatab' }));
    return config;
  },
};
export default nextConfig;
```

Its README, verbatim on the decisive point:

> _"Do NOT use the new Turbopack bundler they built for Next.js They do not offer a plugin system
> and their built-in systems do not support WebWorkers & Audio Worklets like we need it."_

and on why it still copies assets into `public/`:

> _"This is because of some known issue that in next.js assets are not served in 'dev' mode."_
> (vercel/next.js#45478, vercel/next.js#67302)

**Next 16 supports the opt-out.** From the bundled docs in
`/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/web/node_modules/next/dist/docs/`:
_"Turbopack is now the default bundler. To use Webpack run `next dev --webpack` or
`next build --webpack`."_

**The 1.8.4 subpath exports are a trap, and this is settled.** `@coderline/alphatab/webpack` and
`/vite` are still in the exports map and `dist/alphaTab.webpack.mjs` exists — but it is a
deprecation shim importing `./webpack/alphaTab.webpack.mjs`, a directory the package does not ship.
It throws. The live package is the separate `@coderline/alphatab-webpack`. Do not spend time here.

**Both routes self-host.** The plugin copies to `public/alphatab` via `assetOutputDir`; we do the
same by hand in `web/scripts/vendor-alphatab.mjs`. So the real delta is narrower than it looks:

|                              | Our route (D5)                                        | Official route           |
| ---------------------------- | ----------------------------------------------------- | ------------------------ |
| Bundler                      | Turbopack (Next 16 default)                           | webpack (`--webpack`)    |
| Assets in `public/alphatab/` | hand-written vendoring script                         | plugin, `assetOutputDir` |
| Importing AlphaTab           | `turbopackIgnore` dynamic import of a self-hosted URL | normal value import      |
| Guard needed                 | ESLint fence banning value imports                    | none                     |

## What to build

A scratch Next 16 app **outside the repo** (use the session scratchpad; do not add files to the
worktree — another session works in it), as close to `web/` as possible: React 19.2, `reactCompiler`
on, a workspace-style transpiled package if you can manage it, and `@coderline/alphatab-webpack`
wired exactly as the sample does. Load one of the committed fixtures and press play.

Then answer these, with observed evidence, not reasoning:

1. **Does it play?** `Environment.webPlatform`, `playerStateChanged`, `playerPositionChanged`
   advancing, and no `Failed to create worker for synthesizing audio` / `Audio Worklet creation failed`.
2. **Does `reactCompiler: true` survive `next build --webpack`?** It is Babel-based and currently on
   in `web/next.config.ts`. If it does not, that is a serious cost — say so loudly.
3. **Does `transpilePackages: ['@notation-hero/client']` still work under webpack?** `web/` imports
   the design system as raw `.tsx`.
4. **Build and dev times**, both bundlers, cold and warm. Turbopack's speed is the thing being given up.
5. **Is the worklet fetch observable to Playwright on this route?** On ours it is not — Chromium
   exposes an `AudioWorklet.addModule()` fetch to no Playwright observer (measured; it is why Plan A
   Task 7 uses `page.request.get`). Check whether the plugin's arrangement changes that, because it
   decides what the regression test can assert.
6. **What does the plugin actually emit**, and does it need a `.gitignore` entry like ours does?

## How to decide

Recommend **switch** if it plays, `reactCompiler` and `transpilePackages` both survive, and the
build-time cost is tolerable — because it deletes a lot of bespoke machinery and puts us on the path
the library's authors support.

Recommend **stay** if any of 2, 3 or 5 regresses. Our route demonstrably works, and the authors'
warning is about _bundled_ AlphaTab under Turbopack — self-hosting sidesteps exactly that.

Either way, **write the losing option down as D5's documented fallback.** NH-298 carries an item
saying D5 has no fallback recorded; this spike is what closes it.

## What flips if the answer is "switch"

Plan A is reviewed and committed, so know the blast radius before recommending it:

- **Task 2** (vendoring script + its `node --test` cover) — deleted; the plugin does it.
- **Task 3** (ESLint type-only fence) — deleted; a value import becomes correct.
- **Task 5** (`turbopackIgnore` dynamic import, memoised loader) — collapses to a normal import;
  `AlphaTabEngineContext` may not need to exist at all.
- **Task 7** — the regression test's premise changes. It exists to catch a silent bundled-copy
  failure that this route does not have in the same shape.
- **Global Constraints** — the first three bullets are about the Turbopack workaround.
- **`web/vercel.json`** — `buildCommand` would become `next build --webpack`.

That is roughly a third of Plan A. It is a simplification, not a loss — but it is a rewrite, and it
should be a deliberate decision with evidence behind it, which is the point of this spike.

## Paths

```
/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/docs/spikes/2026-09-10-alphatab-in-nextjs-app-router.md
/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/docs/specs/2026-09-10-v0-local-file-player-design.md
/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/docs/plans/2026-09-13-v0a-engine-and-first-sound-plan.md
/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/docs/decisions/decision-registry.md
/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/web/next.config.ts
/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/web/vercel.json
/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/web/e2e/fixtures/
/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike/web/node_modules/@coderline/alphatab/
```

The reference fork, worth checking before any AlphaTab decision:
`/Users/leocaseiro/Sites/alphaTabWebsite` (branch `rhythm-game`).

## Ground rules

- **Another session commits to this worktree.** It absorbed an uncommitted change of ours into its
  own commit once already. Work in the scratchpad; commit promptly if you must touch the repo.
- **Never `git push --force`** on `spike/alphatab-nextjs-poc` without asking — the other session has
  it checked out.
- Report with observed output quoted, and say plainly what you could not test.
