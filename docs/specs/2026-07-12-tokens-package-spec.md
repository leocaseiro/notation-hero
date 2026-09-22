# Spec: extract `@notation-hero/tokens`

- **Date:** 2026-07-12
- **Ticket:** NH-275 (follow-up)
- **Implements:** ADR `docs/decisions/2026-07-12-design-system-distribution-adr.md` — Decision 4
  ("Tokens = a `@notation-hero/tokens` package"), the "build first" step.
- **Status:** spec (not yet implemented).

## Goal

Move the design system's **token layer** out of `client/src/styles.css` into a standalone
CSS-first package, `@notation-hero/tokens`, that both the design system **and** every app import.
This makes brand tokens a single source of truth reusable by the coming `./mobile` app (and any
future non-Tailwind consumer) without dragging in component CSS.

It is deliberately the **first, safe, independent** slice of the ADR's follow-ups: it touches no
component, no `'use client'` boundary, and no rename.

## Why now

- The ADR ratified the token split; `./mobile` (Capacitor) makes a shared token source concrete.
- The Q1 spike (`docs/spikes/2026-07-12-package-owned-source-resolution.md`) confirmed package-owned
  CSS resolves through `node_modules` — so a `@notation-hero/tokens` package imported by name works.

## Scope

**In:** a new `tokens/` workspace package exporting a single `tokens.css`; rewire `client/` to
import it; verify all existing gates stay green.

**Out (separate follow-ups):** the `client/ → design-system/` rename; the full barrel; the
`'use client'` audit; a **TypeScript** token export (add only when a real non-CSS consumer exists,
per ADR Open question Q3); moving component CSS.

## What moves

From `client/src/styles.css` into `tokens/src/tokens.css` (the token layer only):

- `@custom-variant dark (&:is(.dark *));`
- the `@theme { … }` block (brand `--color-brand-*`, the skeleton-pulse animation tokens/keyframes)
- the `@theme inline { … }` block (the `--color-*` → `var(--*)` mappings + `--radius-*`)
- `:root { … }` (light token values) and `.dark { … }` (dark overrides), including the status /
  score / sidebar token sets

**Stays in `client/src/styles.css`** (the design system's own stylesheet): `@import 'tailwindcss'`,
the `@fontsource-variable` font imports, the base reset (`* { box-sizing }`, `html, body, #app`),
and the component `@source` scan. Rationale: fonts + reset are render-time concerns a **token-only**
consumer should be able to skip.

## Package shape

```
tokens/
  package.json     # name "@notation-hero/tokens", private, exports "." -> "./src/tokens.css"
  src/tokens.css   # the moved token layer (no @import 'tailwindcss', no fonts, no reset)
```

`package.json` (mirror `client/`'s additive `exports` style):

```json
{
  "name": "@notation-hero/tokens",
  "version": "0.0.1",
  "private": true,
  "exports": { ".": "./src/tokens.css", "./package.json": "./package.json" }
}
```

Register `tokens` in `pnpm-workspace.yaml` `packages:`.

## Consumption

- **`client/src/styles.css`** imports it right after Tailwind, before its own rules:

  ```css
  @import 'tailwindcss';
  @import '@fontsource-variable/public-sans';
  @import '@fontsource-variable/material-symbols-outlined';
  @import '@notation-hero/tokens'; /* @custom-variant + @theme + :root/.dark */
  /* base reset + @source scan continue below */
  ```

  Apps that import the design system's `styles.css` (`web/`) get tokens transitively — **no `web/`
  change required**.

- **A future token-only consumer** (`./mobile` styling its own way, a non-Tailwind surface) imports
  `@notation-hero/tokens` directly for the CSS custom properties, without component CSS or fonts.

## Migration steps (ordered, reversible)

1. Scaffold `tokens/` (`package.json`, empty `src/tokens.css`); add to `pnpm-workspace.yaml`;
   `pnpm install`.
2. **Move** the four token blocks verbatim from `client/src/styles.css` into `tokens/src/tokens.css`
   (cut, don't rewrite — keep values byte-identical).
3. Add `client` a dependency on `@notation-hero/tokens` (`workspace:*`); add
   `@import '@notation-hero/tokens';` to `client/src/styles.css` in the position above.
4. Verify (below). Commit as one reversible step.

**Ordering guard:** CSS `@import` rules must precede all non-`@import` rules; since `tokens.css`
inlines non-import rules (`@theme`, `:root`), the `@import '@notation-hero/tokens'` must sit after
the other `@import`s and before the base reset. Confirm with a build, not by eye.

## Verification (all must stay green)

- `pnpm --filter @notation-hero/client run build-storybook` + **VR 612/612** + **a11y 385/385** —
  tokens resolve identically (this is a pure move; snapshots must not shift). If VR moves, a value
  changed during the move — revert and redo.
- `pnpm --filter @notation-hero/web run build` + the `bg-clip-padding` CSS probe — `web/` still
  renders styled with brand tokens (`--primary` teal in light + dark).
- `pnpm run check:all` green (lint/typecheck/format across packages; add `tokens` to any package
  list — e.g. the Docker VR volume mounts).

## Risks / open questions

- **`@import` ordering** (guarded above) — the one real footgun; a build catches it.
- **Fonts placement** — kept in `client/styles.css`. If `./mobile` needs the brand font from tokens
  alone, add an optional `@notation-hero/tokens/fonts.css` export later rather than forcing the
  payload on every token consumer.
- **Do not** add a TS token export yet (ADR Q3) — no non-CSS consumer exists.

## Relation to the rename

This lands **before** the `client/ → design-system/` rename (ADR Decision 8, PR (b)). After the
rename, only the package **name** changes (`@notation-hero/tokens` is already rename-neutral).
