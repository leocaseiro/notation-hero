# Spike: does a package-owned Tailwind `@source` resolve through `node_modules`?

- **Date:** 2026-07-12
- **Ticket:** NH-275
- **Resolves:** ADR `docs/decisions/2026-07-12-design-system-distribution-adr.md` — Open question **Q1** (blocked Decision 3).
- **Verdict:** ✅ **YES.** A `@source` declared in the design system's own `styles.css` (paths relative to the library) is honored when an app `@import`s that stylesheet through the `node_modules` symlink.

## Question

Decision 3 wants the design-system package to **own its `@source`** so a consumer writes one line —
`@import '@notation-hero/client/styles.css'` — and never hardcodes `../../client/src` (the footgun
the ce-code-review perf pass caught). That only works if Tailwind v4 resolves a `@source` glob
**relative to the library's CSS file** when that file is pulled in from a workspace dependency
(symlinked under `node_modules`).

## Experiment

In the `nh-275-web-phase1` worktree (PR branch `feat/nh-275-web-client-phase1`), temporarily:

1. **Added** a package-owned `@source` to `client/src/styles.css` (paths relative to that file):

   ```css
   @source './components/ui/**/*.tsx';
   @source not './**/*.stories.tsx';
   @source not './**/*.test.tsx';
   ```

2. **Removed** `web/app/globals.css`'s own `@source` lines — leaving only
   `@import '@notation-hero/client/styles.css';`.

3. `rm -rf web/.next && pnpm --filter @notation-hero/web run build`.

4. Grepped the built CSS chunk under `web/.next/static/` for `bg-clip-padding` (a Button `cva`
   class that lives **only** in `client/src`).

5. Reverted both files (`git checkout --`).

## Result

- Build exited **0**.
- The generated CSS chunk **contained `bg-clip-padding`** (and the rest of Button's utilities) — so
  Tailwind found Button's classes via the library-owned `@source`, with **zero** `@source` in
  `web/`.
- Chunk size **~14 KB gzip** — the same all-components figure as the app-side scoped glob, just
  relocated into the library. (Button-only would be ~6 KB; the ~8 KB delta over ~39 unused
  components is the accepted, heavily-deduped over-generation — ~0.2 KB gzip marginal each.)

Why it works (Tailwind v4 docs + changelog, gathered during the ce-code-review research):
`@source` paths resolve **relative to the stylesheet that declares them**; v4.1 made `@source`
rules pointing inside `node_modules` ignore `.gitignore` (PR #17255) and follow symlinks
(#17391) — exactly the pieces a pnpm-symlinked workspace package needs.

## Implication

- **Decision 3 is unblocked.** Ship the scoped glob + exclusions from `client/`'s own `styles.css`;
  consumers (`web/`, the coming `./mobile`) import one line and hardcode nothing.
- **Shrinks the Phase-2 rename footgun (F2):** the only `client/src` path left to repoint on the
  `client/ → design-system/` rename lives **inside the library**, not scattered across each app.
- Requires **Tailwind ≥ 4.1** (already in use).

## Caveat

The app's own auto-detection still scans `web/`'s own files (for `app/**` classes) — the library
`@source` only adds the design-system source. Both worked in the build. Not re-tested: whether a
consumer that pins a Tailwind < 4.1 would regress (out of scope — the repo is on 4.3).
