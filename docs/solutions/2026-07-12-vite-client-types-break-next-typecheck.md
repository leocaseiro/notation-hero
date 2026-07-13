---
title: Vite-only tsconfig types break Next's typecheck when the design-system barrel grows
category: architecture
tags: [tailwind, monorepo, typescript, tsconfig, vite, next, design-system, NH-275]
date: 2026-07-12
status: known-risk
---

# Vite-only types in `client/` break `web/`'s typecheck when barreled

## The landmine

`web/` (Next.js) consumes `@notation-hero/client` as **transpiled source** — Next compiles the
client's `.tsx` inside `web/`'s own TypeScript program. So any Vite-specific type surface a client
component depends on has to also type-check under **`web/`'s** `tsconfig`, which knows nothing about
Vite.

`client/`'s tsconfig injects Vite's ambient types (`vite/client`), which is what makes these legal
**inside `client/`**:

- `import.meta.env.*` (Vite env typing)
- `import x from './thing?url'` / `?raw` / `?worker` (Vite asset-import suffixes)

When a component using any of those is added to the barrel (`client/src/index.ts`) and imported by
`web/`, `web/`'s `tsc --noEmit` fails — `Property 'env' does not exist on type 'ImportMeta'`, or an
unresolved `?url` module — because `web/`'s program never loaded `vite/client`.

## Why it doesn't bite yet

Phase 1 (NH-275) barrels **only `Button`**, whose transitive imports (`@/lib/utils` → `clsx` /
`tailwind-merge`) touch no Vite-specific types. `web/` typecheck is green. The risk is dormant until
the **Phase-2 full barrel** exposes all ~40 `ui/` components.

## How to avoid it (Phase-2 audit)

Before adding a component to the barrel, check it (and its transitive imports) for Vite-only
surface:

```bash
# candidates to audit before barreling
grep -rnE "import\\.meta\\.env|\\?(url|raw|worker)\\b" client/src/components
```

Then, per hit, pick one:

1. **Refactor off the Vite-ism** — read env via a prop or a small framework-agnostic shim; replace
   `?url`/`?raw` asset imports with a runtime-agnostic path. Preferred for shared components.
2. **Keep it Vite-only** — do not barrel it; it stays a `client/`-internal (Storybook/SPA) component.
3. **Teach `web/` the type** — only if a Vite-ism is genuinely unavoidable in a shared component
   (last resort; couples `web/` to Vite semantics).

The distribution ADR's `'use client'` annotation pass (`docs/decisions/2026-07-12-design-system-distribution-adr.md`,
RSC ↔ Capacitor seam) is the natural place to fold this audit in — same per-component sweep.

## Related

- Turbopack resolves transpiled-package `tsconfig` path aliases against the **app's** tsconfig only
  (why `web/tsconfig.json` maps `@/*` → `../client/src/*`) — same "the app's TS program owns the
  library's source" root cause.
- ADR: `docs/decisions/2026-07-12-design-system-distribution-adr.md` (ship source, transpile per app).
