# ADR — Design-system distribution: shared workspace package + tokens package (registry demoted to an eject hatch)

- **Status:** ⏳ Proposed 2026-07-12 — awaiting leocaseiro ratification (not yet in the decision registry).
- **Date:** 2026-07-12
- **Driver / Approver:** leocaseiro
- **Ticket:** NH-275 lineage (`web/` design-system consumption, Phase 1). Distribution ticket TBD.
- **Evidence:** 5-model comparison artifact (code + pros/cons + sources) — <https://claude.ai/code/artifact/f1696c91-6970-4061-a4f8-0ffe77fe9181>. Key sources: Tailwind v4 "Detecting classes in source files" (`@source`); shadcn/ui registry + monorepo docs; Turborepo Tailwind guide; Radix Themes styling; Mantine styles; Nx sharing-tailwind-styles. **Spike TBD** before lock — see Open questions Q1.
- **Scope:** How the design system (`client/` → `design-system/`) is distributed to `web/` (Next.js 16 App Router, RSC) and the coming `mobile/` (Capacitor). Covers the token split, the CSS mechanism, the RSC ↔ Capacitor component seam, versioning/CI, and how the Phase-2 `client/ → design-system/` rename folds in. Does **not** reopen the component-library choice (Base UI + cva — kept, per 2026-07-07), the FE framework/hosting (Next.js on Vercel — kept, per 2026-07-08), or the hexagon.
- **Supersedes:** refines the **NH-275 Phase 1** consumption pattern (each consumer hardcodes `@source '../../client/src/...'` in its own `globals.css`). Nothing is superseded outright.

---

## Context

`client/` does double duty today: it is both the (soon-legacy) Vite + TanStack SPA **and** the design-system source — a shadcn-derived library of ~40 UI components (Base UI primitives + Tailwind v4 + `class-variance-authority` variants) with brand-teal design tokens in an `@theme` block (`client/src/styles.css`). Every component is a folder carrying co-located `*.stories.tsx`, `*.test.tsx`, `*.a11y.ts`, `*.vr.ts`, and committed VR snapshots; the VR / a11y / unit suites are **blocking CI gates** — the library's most valuable asset.

The FE pivot (2026-07-08) makes `web/` (Next.js) the product FE and repurposes `client/` to a pure design system, which is what the Phase-2 `client/ → design-system/` rename resolves. A `mobile/` app (Capacitor, **also Tailwind**) is coming, and that same 2026-07-08 ADR already commits (Decision 8) to mobile as "a Capacitor shell **reusing the shared component package**." Goal: components mostly shared across `web/` + `mobile/`, with **best tree-shaking**, **shared variants**, and **automated distribution (no manual copy-paste)**.

Two facts frame the whole decision:

1. **"Tree-shaking" here is a CSS-generation problem, not a JS one.** JS tree-shakes fine from any shared ESM package via subpath `exports` + `sideEffects`. The only thing copy-in uniquely buys is that each app's Tailwind scans **only the components it pulled**, rather than `@source`-scanning all ~40 and generating CSS for unused ones. At ~40 shadcn components the utility overlap is high, so that over-generation delta is small (single-digit KB gzipped, shared + cached).
2. **The repo's governance is built on a single source of truth** (`decision-registry.md`) and on those co-located, gated VR/a11y/unit suites. A shadcn registry copies the `.tsx` (and JS deps) but **not** the co-located test/VR harness — so copy-in as the primary path orphans the coverage that is the crown jewel, and mints N drifting copies against a culture that prizes one canonical answer.

Current state verified on this branch: `@notation-hero/client` has **no** `exports` / `sideEffects` / `main` (it is a private app, not yet a consumable) and **zero** `'use client'` directives (as a Vite SPA it never needed them). Both are real repackaging work, not formalities.

---

## Decision

Adopt a **shared workspace package** as the single, canonical distribution channel, paired with a **standalone tokens package**. Copy-in (the shadcn custom registry) is explicitly **demoted from primary to an optional per-component eject hatch**.

1. **Primary distribution = one shared workspace package.** Rename `client/` → `@notation-hero/design-system`; `web/` and `mobile/` consume it as a normal `workspace:*` dependency. Components — **and their stories/tests/VR/a11y** — live in exactly one place. Shared `cva` variants (`buttonVariants`, …) are shared by construction because there is one copy. There is **no** copy-in on the primary path.

2. **Tokens = a new `@notation-hero/tokens` package. Build this first.** Extract the whole token + dark-variant layer from `styles.css` — `@theme`, `@theme inline`, `:root`, `.dark`, and `@custom-variant dark` — into `tokens.css`. It is framework-agnostic CSS; a `tokens.ts` JS export is deferred until a real non-CSS consumer exists (YAGNI). Both the design-system package's own styles **and** every app import `@notation-hero/tokens/tokens.css`. This is the "pairs-with-any" seam and the lowest-risk first move (it unblocks apps without touching component source).

3. **CSS mechanism = package-owned `@source` + shared tokens; apps compile.** The design-system package ships a `styles.css` that declares **its own** `@source` globs (resolved relative to the package), so a consumer writes:

   ```css
   @import 'tailwindcss';
   @import '@notation-hero/tokens/tokens.css';
   @import '@notation-hero/design-system/styles.css'; /* declares its own @source globs */
   @source "./app"; /* the consumer scans only its own files */
   ```

   This removes the NH-275 coupling (no consumer hardcodes `../../client/src/...`) while keeping one source of truth. The remaining over-generation (an app's CSS includes classes for components it does not import) is **accepted** as a small, shared, cached cost at this scale. Escape hatches if it ever bites: per-component CSS entrypoints (Mantine model) or the eject hatch (Decision 6).

4. **Ship source; transpile per app.** The package exposes `.tsx` **source** via subpath `exports` (`@notation-hero/design-system/button`, …) with `sideEffects` listing only CSS, so JS tree-shakes automatically. Shipping source preserves `'use client'` boundaries naturally: `web/` compiles it via `transpilePackages`; `mobile/` (Vite) compiles workspace source directly. No library build step is needed **for consumption** (Storybook / standalone dev still build).

5. **RSC ↔ Capacitor seam = one source, per-component `'use client'`, thin platform adapter for nav/native only.** One component source serves both apps. Presentational components (Badge, Card, Pill, ScoreDonut) stay server-compatible (no directive) and render in RSC on web and CSR in the Capacitor webview alike; interactive components (Button-with-handlers, Combobox, Popover, Sheet, DataTable) carry `'use client'` — still SSR'd + hydrated on web, still fine in the webview. The **only** things needing a per-platform shell are **platform primitives**: navigation/links (Next `<Link>` vs the mobile router) and native bridges (Web MIDI / CoreMIDI, haptics). Those are injected through a small adapter interface (a `@notation-hero/platform` contract, or props/context) that each app implements. So: shared variants + tokens + logic + presentation in the package; a thin per-platform adapter for nav/native. That adapter is the seam.

6. **Registry = optional per-component eject hatch, not primary.** Keep a shadcn `registry.json` **addable later** (cheap), but build it only if/when a single app genuinely must fork and diverge a component. Ejecting is a **one-way door**, recorded in the decision registry when it happens. This is the deliberate answer to the leading candidate: the custom registry is demoted, not adopted.

7. **Versioning / CI = `workspace:*`, no semver, no publish.** While the design system lives in the monorepo, consumers always track HEAD — there is no version negotiation. The existing VR / a11y / unit gates stay **in the design-system package, unmoved**; `web/` and `mobile/` builds join CI as additional consumers. Semver + publishing are deferred unless the design system ever leaves the monorepo (YAGNI).

8. **Rename fold-in = two PRs, in order.** (a) Extract `@notation-hero/tokens` — safe, independent, unblocks apps. (b) Rename `client/ → design-system/` **and** repackage in one move: add subpath `exports` + `sideEffects`, move `@source` ownership into the package's `styles.css`, run the `'use client'` annotation pass (Decision 5), and update `pnpm-workspace.yaml`, the `@notation-hero/client` → `@notation-hero/design-system` specifier, and (when it lands/rebases) `web/`'s `globals.css`. Rename-with-repackage avoids rewriting every import path twice.

---

## Rationale

- **Dominates on this repo's own terms.** Single source of truth, intact blocking VR/a11y/unit gates, shared variants for free, minimal moving parts — all the things the governance culture and simplicity-first already optimize for — with only a small, cached CSS over-generation given up in return. Copy-in's unique win (per-app editability) is a non-goal under driver A.
- **Consistent with committed decisions.** The 2026-07-08 ADR already names a "shared component package" for mobile; this ADR makes that concrete rather than introducing a competing copy-in model.
- **Fixes the real NH-275 complaint** (build coupled to the library's file layout) by moving `@source` ownership into the package, without abandoning the scan-the-source model that keeps theming ergonomic and tokens live.
- **Capacitor-ready by construction.** Fonts are already self-hosted (`@fontsource-variable/*`) for a CSP-clean, offline webview; one shared package keeps that wiring in one place instead of re-deriving it per app.
- **Scale-as-learning.** A tokens package + a properly-`exports`-ed component package is the well-architected shape even at two apps, and it is exactly the shape a third consumer (or a future extraction) would need — no rework.

---

## Consequences

**Positive:** one canonical library; blocking VR/a11y/unit gates untouched; shared `cva` variants guaranteed identical across web + mobile; JS tree-shakes per-component; consumers decoupled from the library's file layout; tokens reusable by any future consumer (marketing site, emails) without pulling React.

**Negative / watch-outs:**

- **CSS over-generation is accepted, not eliminated.** Each app's stylesheet carries classes for components it does not import. Small at ~40 components; revisit with per-component CSS or the eject hatch only if a bundle-size gate ever flags it. Note the cost honestly rather than implying perfect tree-shaking.
- **A real `'use client'` annotation pass is required.** `client/src` has zero directives today; interactive components must be marked before `web/` (RSC) consumes them, and the package must ship source (or a build that preserves the banners) so the boundaries survive.
- **Library-owned `@source` resolution is a linchpin assumption** (Q1). If a spike disproves it, fall back to a consumer-declared `@source` pointing at the package path — still single-source, marginally more coupling.
- **No per-app divergence.** If a genuine need to fork a component in one app appears, it goes through the eject hatch (Decision 6), consciously and recorded — not by default.

---

## Alternatives considered (the five models)

1. **Consumer `@source`-scans the shared package (NH-275 Phase 1).** _Refined, not rejected_ — kept as the scan model, but `@source` ownership moves into the package (Decision 3) to kill the file-layout coupling.
2. **Library ships prebuilt CSS (Radix Themes / Mantine).** _Rejected as primary._ Decouples consumers but goes static; monolithic CSS tree-shakes worst, and per-component CSS adds a real library build step. Retained as a **future lever** if over-generation ever bites.
3. **Copy-in via shadcn custom registry (`shadcn build` + `shadcn add <url>`).** _Rejected as primary; kept as eject hatch (Decision 6)._ Best CSS tree-shaking and per-app editability, but it mints N drifting copies, **orphans the co-located VR/a11y/unit gates**, and needs sync tooling — all against the single-source-of-truth culture. Only earns its keep under driver B (editability is the point).
4. **Shared `@theme` tokens package.** _Adopted_ (Decision 2) — it pairs with the shared component package rather than competing with it.
5. **CSS-in-JS.** _Ruled out_ by constraint.

---

## Appendix — registry eject-hatch mechanics (for if/when Decision 6 fires)

Hosting a custom registry in this pnpm monorepo is light: a `registry.json` at the design-system root; `shadcn build` emits per-item JSON that can be served from the **existing gh-pages site** (already stood up for Storybook PR previews, 2026-07-05) or referenced as a workspace-relative file. A consumer runs `shadcn add <url-or-path>` to copy an item into its own `app/` source; **re-sync = re-run `add`, which overwrites** — which is precisely why an eject is a one-way door and any subsequent local edits are tracked divergence. This stays fully compatible with the shared package: eject one component into one app without disturbing the canonical copy the other app still imports.

---

## Open questions

1. **Spike (blocks lock of Decision 3):** confirm Tailwind v4 resolves `@source` globs **relative to the library CSS file** when that CSS is `@import`ed from `node_modules` — the linchpin that lets the package own its own scan paths. If not, fall back to a consumer-declared `@source` at the package path (still single-source), or lib-prebuilt per-component CSS.
2. **`mobile/` platform-adapter surface** — enumerate the nav + native primitives (links, router, Web MIDI/CoreMIDI, haptics) when `mobile/` scaffolds; that list defines the `@notation-hero/platform` contract.
3. **Tokens TS export** — add `tokens.ts` only when a real non-CSS consumer (native, server-rendered email) appears. Defer.
4. **Driver check (gates the whole ADR):** this ADR assumes driver **A** — tree-shaking + automation, per-app editability not required. If the real driver is **B** (editability is the point), Decision 1 flips to registry-primary and Decisions 3–8 change accordingly.
