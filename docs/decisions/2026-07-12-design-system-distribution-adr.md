# ADR — Design-system distribution: direct package consumption + accept scoped-glob CSS over-generation

- **Status:** ✅ Accepted 2026-07-12 — the CSS-distribution mechanism, the tokens split, and the direct-consumption model are ratified by leocaseiro. The `client/ → design-system/` rename (Phase 2) and the RSC/Capacitor component seam remain **recommended follow-ups**, not yet ratified.
- **Date:** 2026-07-12
- **Driver / Approver:** leocaseiro
- **Ticket:** NH-275 lineage (`web/` design-system consumption). Distribution ticket TBD.
- **Evidence:**
  - 5-model comparison artifact — <https://claude.ai/code/artifact/f1696c91-6970-4061-a4f8-0ffe77fe9181>.
  - **ce-code-review performance pass (measured):** the over-broad `@source '../../client/src'` scanned **882 files** (the client Vite SPA's own `routes/`, `hooks/`, plus every component's co-located `*.stories.tsx`/`*.test.tsx`), producing a ~14.4 KB-gzip CSS chunk carrying `.bg-sidebar*`/`.text-sidebar-foreground`/`inset-x-0` from `Sidebar`/`Sheet`/`Field` — components the app can neither import (not in the barrel) nor render.
  - Sources: Tailwind v4 "Detecting classes in source files" (`@source`); shadcn/ui registry + monorepo docs; Turborepo Tailwind guide; Radix Themes / Mantine styling; vanilla-extract / StyleX (import-aware CSS). **Spike done** (Q1 resolved 2026-07-12) — see Open questions Q1.
- **Scope:** How the design system (`client/` → `design-system/`) is distributed to `web/` (Next.js 16, RSC) and the coming `mobile/` (Capacitor) — the JS + CSS channels, the token split, versioning/CI, and the rename fold-in. Does **not** reopen the component library (Base UI + cva — kept), the FE framework (Next.js on Vercel — kept), or the hexagon.
- **Supersedes:** the NH-275 Phase 1 `@source` choices — both the over-broad `@source '../../client/src'` (perf finding) and the hand-maintained per-file `@source '.../Button/Button.tsx'`.

---

## Context

`client/` is both the (soon-legacy) Vite SPA **and** the design-system source — ~40 shadcn-derived components (Base UI + Tailwind v4 + `cva`), with brand-teal tokens in `client/src/styles.css`. Each component folder co-locates `*.stories.tsx`, `*.test.tsx`, `*.a11y.ts`, `*.vr.ts`, and committed VR snapshots; the VR/a11y/unit suites are **blocking CI gates**. `web/` (Next.js) is now the product FE; `mobile/` (Capacitor, also Tailwind) is coming. Goal: components shared across both apps.

The load-bearing fact, learned the hard way in the NH-275 review and confirmed in a brainstorm:

> **JS and CSS travel by two different mechanisms, and only one of them is import-aware.**
>
> - **JS** rides the import graph: `import { Button }` + `transpilePackages` bundles only Button's code. Tree-shakes correctly.
> - **CSS** does **not**. Tailwind's scanner is _filesystem-based_ — it expands `@source` globs to a list of files on disk, reads each as **plain text**, and emits CSS for any class string it finds. It never parses an `import`. So a component's CSS ships **because its file matched the glob**, not because anything imported it. `Sidebar`'s classes shipped even though `Sidebar` isn't even re-exported from the barrel.

Every distribution question reduces to: **how wide do we point the CSS scanner, given it can't follow imports?**

---

## Decision

Consume the design system **directly** as a shared package, and accept a bounded, measured CSS over-generation rather than bolt import-awareness onto Tailwind.

1. **JS = direct package consumption.** Apps `import { Button } from '@notation-hero/client'` (→ future `@notation-hero/design-system`) and transpile it (`transpilePackages` on web; Vite on mobile). One canonical source; no copy-in on the primary path. JS tree-shakes via the package `exports` map.

2. **CSS = a scoped whole-component `@source` glob; over-generation accepted.** Point Tailwind at **all** UI components, excluding the co-located harness:

   ```css
   @import '@notation-hero/client/styles.css'; /* tokens + base, single source */
   @source '../../client/src/components/ui/**/*.tsx'; /* scan ALL components */
   @source not '../../client/src/**/*.stories.tsx'; /* drop dev-only story classes */
   @source not '../../client/src/**/*.test.tsx'; /* drop test fixtures */
   ```

   Because the scanner isn't import-aware, this ships CSS for components the app never imports. That is **explicitly accepted**: the whole-library sheet is ~14 KB-gzip (all ~40 components) vs ~6 KB for a Button-only scan, and utilities dedupe heavily — so the _marginal_ cost of one more unused component is **~0.2 KB-gzip** (measured, ce-code-review perf pass), and the sheet is generated once per app and cached. The trade we take: **never hand-maintaining a per-component `@source` list**, in exchange for a small, cached over-generation. This supersedes both the over-broad `../../client/src` (which also scanned the SPA + harness) and the per-file `@source` (which required a new line per component).

3. **The design-system package should own its `@source`.** Ship the scoped glob + exclusions from the package's own `styles.css` (paths relative to the package), so a consumer writes one `@import` and never hardcodes `../../client/src` — which is precisely the footgun that produced the perf finding. _(Mechanism **confirmed** — Q1 spike 2026-07-12: a package-owned `@source` in the library's `styles.css` resolves through the `node_modules` symlink; `web/` built styled with **zero** app-side `@source`.)_

4. **Tokens = a `@notation-hero/tokens` package.** Extract `@theme` + `@theme inline` + `:root`/`.dark` + `@custom-variant dark` into `tokens.css` (CSS-first; a TS token export is deferred until a real non-CSS consumer exists). Both the design-system package and every app import it. Build first — it is safe, independent, and unblocks apps.

5. **Ship source; transpile per app.** The package exposes `.tsx` source via subpath `exports` + `sideEffects`, so `'use client'` boundaries survive and JS tree-shakes. No library build step is needed for consumption (Storybook/standalone still build).

6. **Registry (copy-in) = optional per-component eject hatch, not primary.** shadcn copy-in gives exact CSS (the component becomes the app's own scanned file) and per-app editability, but it mints drifting copies and orphans the co-located VR/a11y/unit gates. Keep a `registry.json` addable later for the rare deliberate fork; do not build it now.

7. **Versioning/CI = `workspace:*`, no semver/publish** while in-monorepo. Existing VR/a11y/unit gates stay in the design-system package, unmoved; `web/`/`mobile/` builds join CI.

8. **Rename fold-in (recommended follow-up).** Two PRs: (a) extract `@notation-hero/tokens`; (b) rename `client/ → design-system/` + repackage (subpath `exports`, package-owned `@source`, `'use client'` audit, update `pnpm-workspace.yaml` + specifiers + `web/`'s `globals.css`).

---

## RSC ↔ Capacitor seam (recommended, not yet ratified)

One component source serves both apps. The seam is **per-component `'use client'`**, not per-platform shells: presentational components stay server-compatible; interactive ones carry `'use client'` (SSR'd + hydrated on web, CSR in the Capacitor webview). The only per-platform piece is a thin adapter for **navigation/links + native bridges** (Web MIDI/CoreMIDI, haptics) — a small `@notation-hero/platform` contract each app implements. `client/src` has **zero** `'use client'` directives today (it was a Vite SPA), so this implies a real annotation pass when interactive components are consumed under RSC.

---

## Rationale

- **Matches how Tailwind actually works.** The scanner can't follow imports; fighting that with a per-import script or a tool switch costs more than the bytes it saves. The scoped glob embraces the model and stays a one-liner.
- **Small, measured, bounded cost.** ~0.2 KB-gzip _marginal_ per unused component (heavily deduped — ~14 KB whole-library vs ~6 KB Button-only per the perf pass), cached; "modest today". The scoping (components only, no SPA, no harness) removes the genuinely wasteful part the review caught.
- **Keeps the repo's crown jewels.** One canonical library with its VR/a11y/unit gates intact; shared `cva` variants identical across apps by construction.
- **Consistent with committed decisions.** The 2026-07-08 ADR already names a shared component package for mobile.

---

## Consequences

**Positive:** one canonical library; blocking gates untouched; identical variants across web + mobile; JS tree-shakes per-component; consumers stop hardcoding the library's file layout; tokens reusable by any consumer.

**Negative / watch-outs:**

- **CSS over-generation is accepted, not eliminated.** Each app ships CSS for unimported components. Bounded/cached; revisit only if a bundle gate ever flags it (escape hatches: the eject hatch, or per-component compiled CSS).
- **A real `'use client'` annotation pass** is required before RSC consumes interactive components.
- **Package-owned `@source` (Decision 3) — Q1 spike confirmed it resolves (2026-07-12); no longer a risk.**
- **No per-app divergence** without going through the eject hatch (Decision 6).

---

## Alternatives considered

1. **Per-import `@source` script** (generate exact `@source` lines from the app's imports). _Rejected._ To be correct it must resolve each component's **transitive** graph (a `DataTable` that renders `<Button>` needs `Button.tsx` scanned too, or it renders unstyled); misses fail **silently**; and no off-the-shelf tool exists because it fights Tailwind's model.
2. **Copy-in / shadcn registry.** _Rejected as primary; kept as an eject hatch (Decision 6)._ Exact CSS + editability, but drift + orphans the co-located VR/a11y/unit gates. It is, honestly, the ecosystem's usual "only ship what I use" answer for Tailwind — but it trades away the single source of truth this repo is built on.
3. **Import-aware CSS tools — vanilla-extract, StyleX, Mantine per-component CSS, Panda.** _Rejected._ These genuinely solve import-aware CSS tree-shaking (CSS is _imported_, not _scanned_, so unused components' CSS drops and code-splits). But adopting one means **leaving Tailwind and rewriting the 40 `cva` components** — not worth it at this scale, and out of scope.
4. **Over-broad `@source '../../client/src'`** (the perf-flagged status quo). _Rejected._ Scans the SPA `routes/` + `hooks/` + the full test/story harness (882 files). Superseded by the scoped component glob (Decision 2).
5. **Library ships prebuilt CSS (Radix/Mantine pattern), monolithic or per-component.** _Deferred lever._ Decouples consumers and enables per-component CSS code-splitting, but adds a library build step; hold unless over-generation ever bites.
6. **CSS-in-JS.** _Ruled out_ by constraint.

---

## Open questions

1. **RESOLVED 2026-07-12 (spike).** Tailwind v4 **does** resolve a package-owned `@source` glob (relative to the library's `styles.css`) when `@import`ed through the `node_modules` symlink — `web/` built with Button's classes generated and **zero** app-side `@source`. Decision 3 is unblocked: consumers write one `@import` and hardcode nothing. Spike write-up: `docs/spikes/2026-07-12-package-owned-source-resolution.md`.
2. **`mobile/` platform-adapter surface** — enumerate nav + native primitives when `mobile/` scaffolds.
3. **Tokens TS export** — add only when a real non-CSS consumer appears.
4. **Driver (was: A vs B) — RESOLVED 2026-07-12.** leocaseiro ratified **accepting the scoped-glob over-generation** (Decision 2) — not copy-in, not a tool switch. This ADR's headline is decided.
