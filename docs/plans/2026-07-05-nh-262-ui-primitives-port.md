# NH-262 — UI primitives (Base UI port)

Port the remaining shadcn/ui primitives the app needs, adapted to the repo's tokens, folder
structure, Storybook, unit, VR, and a11y patterns. Tracked in
[NH-262](https://leocaseiro.atlassian.net/browse/NH-262) (Smart Checklist keeps per-component
status).

## Scope

Eight primitives, plus the sub-parts a faithful `sidebar` needs:

`breadcrumb` · `skeleton` (+ table/form presets) · `tooltip` · `dropdown-menu` · `menubar` ·
`hover-card` · `scroll-area` (the player's horizontal scroller) · `sidebar` (+ `tooltip`,
`sheet`, `separator`, `input`, `use-mobile`).

None of these is a search/typeahead component, so the "frontend-only vs fetch" data option
does not apply here — that guidance is for the future filter/search components. These are dumb,
presentational, prop-driven primitives.

## Decisions

- **Base UI, not Radix (revised 2026-07-07).** Originally planned on the unified `radix-ui`
  package, but NH-262 was folded into the **NH-269** Radix→Base UI migration after this plan was
  written. The Part-1 primitives now build on **`@base-ui/react` `1.6.0`** — `Breadcrumb` via
  `useRender` (was Radix `Slot`), `Tooltip` via `@base-ui/react/tooltip` — a **new dependency**
  (rationale in `docs/decisions/decision-registry.md`, 2026-07-07). `radix-ui` stays for the
  not-yet-migrated components.
- **Full-state VR.** Each interactive component is snapshotted per story × {light, dark} ×
  {resting, hover, focus} (open-state for popovers), via the shared `runVrStories` helper.
- **Material Symbols, not Lucide.** shadcn ships Lucide icons; swap them for the repo's
  self-hosted Material Symbols glyphs (`chevron_right`, `more_horiz`, …), matching `PlayButton`.
- **Animations omitted.** shadcn's `animate-in/out` enter/exit classes need an animation plugin
  (`tw-animate-css`) the repo doesn't have. Ship the components without those classes rather
  than dead classes; positioning/tokens are unaffected. Adding the plugin is a later option.
- **Container/dumb + reusable.** Presentational parts only; a container decides data/loading.

## PR grouping (stacked)

Reviewed by `ce-code-review` + `pr-checklist-audit`, CI-green each. `sidebar` depends on the
others, so it lands last.

- **PR A** — `breadcrumb` · `skeleton` · `tooltip` (+ shared `runVrStories`). Base `master`.
- **PR B** — `dropdown-menu` · `menubar` · `hover-card`. Base PR A.
- **PR C** — `scroll-area` · `separator` · `input` · `sheet` · `use-mobile` · `sidebar`. Base PR A.

## Component conventions (match existing `client/src/components/ui/`)

Folder-per-component; **no barrel files** (import `@/components/ui/<Name>/<Name>`). Per component:

| File                  | Role                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `<Name>.tsx`          | Component(s). `cn` from `@/lib/utils`, `data-slot` on each part, `Slot.Root` for `asChild`, CVA where variants exist.                  |
| `<Name>.stories.tsx`  | `title: 'UI/<Name>'`, `tags: ['autodocs']`, one **named story per visual state** (drives VR/a11y), `docs.description.component` prose. |
| `<Name>.story-ids.ts` | `const` array of kebab story ids — shared by VR + a11y so they never drift.                                                            |
| `<Name>.test.tsx`     | Vitest + Testing Library; assert behaviour/roles/`data-slot`, not Tailwind class strings.                                              |
| `<Name>.vr.ts`        | `runVrStories(...)` — Playwright screenshots, full-state.                                                                              |
| `<Name>.a11y.ts`      | `runA11yStories(...)` — axe, light + dark × resting + hover.                                                                           |

Shared helpers live at `client/src/vr-helpers.ts` and `client/src/a11y-helpers.ts`.
`runA11yStories` takes an optional `axeInclude` (default `#storybook-root`; set `'body'` for
portalled content) and `hoverStory`. `runVrStories` takes `states` (or `statesForStory` for a
per-story override), `captureSelectors` (padded union clip, for portalled content),
`hoverSelector`, `focusTabs`/`focusExpect`, and `iconFontStory`.

Hooks live at `client/src/hooks/<kebab-name>.ts` with a co-located `<kebab-name>.test.ts` (no
story/VR/a11y — a hook has no visual surface). The layout guard enforces role suffixes only under
`server/src/`, so a kebab `.ts` is fine here (`use-mobile.ts`).

## VR baselines are per-OS — regenerate both

Snapshots embed the platform. After any intended visual change, regenerate **both** and commit:

- macOS (darwin): `pnpm --filter @notation-hero/client test:vr:update`
- Linux (CI): the documented `docker run mcr.microsoft.com/playwright:v1.61.1-noble …
--update-snapshots` recipe (see AGENTS.md → "VR baselines"); the `vr` CI job pins the same
  image so it compares against the `-linux` set.

## Gates (all must pass before merge)

`typecheck` · `eslint` · `prettier` · `cspell` · `markdownlint` · unit (`vitest`) · VR
(`test:vr`, vs linux baselines in CI's Playwright container) · a11y (`test:a11y`). `@base-ui/react`
is a new dependency (revised 2026-07-07), so `syncpack` / `deps-cve` / supply-chain gates now apply
rather than staying untouched.

## Wireframe grounding

The primitives are generic, but their story fixtures use real app vocabulary from
`docs/wireframe` so they read as Notation Hero, not lorem:

- **breadcrumb** — `Catalog › Song › Section` / `Catalog / Lessons / Learn <song>` (routes
  `#/song/:slug/section/:n`, `#/lesson/:slug`).
- **scroll-area** — the player's horizontal control/section strip (`#/play/:slug`).
- **sidebar** — app nav (Catalog, Songs, Lessons, Player, Admin) + role control.
- **dropdown-menu / menubar** — row actions, sort, the role switcher.
