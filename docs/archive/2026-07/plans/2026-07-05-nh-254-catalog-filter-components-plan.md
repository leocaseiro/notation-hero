# NH-254 / NH-255 / NH-253 — Catalog search + filter components (plan)

Reusable, presentational ("dumb") design-system components for the catalog
search + filter row, plus the lesson-type tabs and list pagination. Built on the
already-shipped catalog table (`ui/DataTable`, `catalog/CatalogTable`, NH-210).

- **NH-255** — lesson-type tabs (Song | Lesson segment control).
- **NH-254** — the filter row: level, genre/kind, instrument, tempo, tags/pattern/key, skill, time-signature.
- **NH-253** — catalog list pagination (TanStack model).
- **New ticket (to create)** — catalog search input (no ticket exists today).

All land in **one PR** (per Leo's preference), each commit referencing its ticket.

## Source of truth

The **wireframe** (`docs/wireframe/filter-review.md`) and the **catalog schema
spec** (`docs/specs/2026-06-10-catalog-schema.md`) are authoritative. The
mockup (`docs/mockups/catalog-flow.html`) predates the Group-D schema and is
stale where they disagree — corrections below.

### Mockup corrections applied

- **Instrument = single-select** in v1 (mockup shows multi). Confirmed by Leo.
- **Key filter is conditional** — shown only for pitched instruments (guitar / bass / keys), hidden for drums. This is _container_ logic; the dumb component does not encode it.
- **Dynamic filter swap** — the same dropdown shows **Genre** on the Songs tab and **Kind** (beat / rudiment / fill) on the Lessons tab. Same component, different options — a _container_ concern.

## Locked decisions

1. **Primitives = `radix-ui` (already a dep) + native form controls. No new dependency.** The wireframe calls for _"Jira-style filter dropdowns"_ = a search box over a checkbox / radio list, which is fully accessible via native `<input type="checkbox|radio">` inside a Radix `Popover`. A combobox library (`cmdk` / `downshift` / `@ariakit`) is deliberately **not** added: `cmdk` is the stalest of the three, and the dumb-component API means a library can be swapped in later behind the same props if ever wanted. **⚠️ Superseded (round-2 review):** the hand-rolled native checkbox/radio list was not keyboard-accessible (couldn't select via Enter), so `cmdk` **was** adopted for `FacetFilter` (popover-anchored) + `TokenPicker` (inline) — arrow-key + Enter selection with teal checkmarks; the dumb + fetch-agnostic props are unchanged.
2. **Icons = self-hosted Material Symbols** (`<span className="material-symbols-outlined">`), never lucide, even though `components.json` says `iconLibrary: lucide`. Match the repo (Button/PlayButton).
3. **Fetch-agnostic ("frontend-only OR fetch, the component does not care").** Every searchable component takes a static `options` array + a controlled `query` / `onQueryChange` + a `shouldFilter` boolean (default `true`, mirrors the well-known cmdk prop):
   - _Frontend-only_ — pass all `options`, keep `shouldFilter` on; the component filters in memory. No network.
   - _Fetch_ — set `shouldFilter={false}`, debounce `onQueryChange` into a request that replaces `options`, pass `loading`.
     A small `useFilterOptions` hook encapsulates the fetch variant; **both** modes are shown as stories.
4. **Container / presentational split.** These components are presentational only — `value` in, `onChange` out, no data fetching, no catalog-query knowledge. Assembling them into a live filter row wired to `/api/catalog` is **out of scope** (overlaps NH-123) unless Leo asks.
5. **Story-per-state**, matching the repo (`Default` + one named story per state), _not_ the single-`Playground` pattern from the `base-skill` `write-storybook` skill (that skill targets a different repo).

## Component inventory

Each is a folder-per-component under `client/src/components/ui/<Name>/` with the
full 6-file set (`.tsx`, `.test.tsx`, `.stories.tsx`, `.story-ids.ts`, `.vr.ts`,
`.a11y.ts`) + committed VR baselines, unless marked _bare primitive_.

| Component                    | Serves (filter)         | Primitive                     | Select              | Notes                                                                    |
| ---------------------------- | ----------------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `Popover` _(bare primitive)_ | plumbing                | Radix `Popover`               | —                   | Styled wrapper; coverage via the composites (Table precedent)            |
| `SearchInput`                | search box              | native `input`                | free text           | Icon + clear button; controlled `value`/`onChange`                       |
| `Tabs`                       | lesson-type (NH-255)    | Radix `Tabs`                  | single              | `tablist`/`tab`, arrow-key roving focus native                           |
| `Pagination`                 | list paging (NH-253)    | native `nav`                  | —                   | Wired to TanStack pagination model; page-size + prev/next/first/last     |
| `LevelFilter`                | level                   | `Popover` + `Toggle`          | single ≤            | Condition row (`is at most ≤`) + Debut…Expert pills (0–10) + Clear       |
| `FacetFilter`                | genre, kind, instrument | `cmdk` in a Radix `Popover`   | multi **or** single | `mode` prop; search box + list + Clear; count badge on trigger           |
| `TokenPicker`                | tags, pattern, key      | inline `cmdk` + `Badge` chips | multi **or** single | Inline input + chips in one box; suggestions drop below; removable chips |
| `RangeSlider` / `TempoRange` | tempo                   | Radix `Slider`                | range               | Two-thumb `[min,max]`; `TempoRange` adds the BPM label                   |
| `ToggleChipGroup`            | skill, time-signature   | Radix `ToggleGroup`           | multi (or single)   | Chips; `type` prop maps to ToggleGroup single/multiple                   |

### Filter semantics (drives component config, from the wireframe)

| Filter         | Values                                                                      | Match        | Component config                |
| -------------- | --------------------------------------------------------------------------- | ------------ | ------------------------------- |
| Genre          | rock, jazz, pop, alternative, brazilian, metal, power-metal, progressive, … | any-of (OR)  | `FacetFilter` mode=multiple     |
| Kind           | beat, rudiment, fill                                                        | any-of (OR)  | `FacetFilter` mode=multiple     |
| Instrument     | drums, guitar, bass, keys, vocals, other                                    | single       | `FacetFilter` mode=single       |
| Level          | 0 (Debut), 1–3, 4–6, 7–8, 9–10; null = Ungraded                             | ≤ (at most)  | `LevelFilter`                   |
| Tempo          | min–max BPM                                                                 | between      | `TempoRange`                    |
| Time-signature | 4/4, 3/4, 6/8, 7/8, 5/4                                                     | any-of (OR)  | `ToggleChipGroup` type=multiple |
| Skill          | timing, independence, control, coordination, speed                          | all-of (AND) | `ToggleChipGroup` type=multiple |
| Tags           | ghost-notes, syncopation, … (open)                                          | all-of (AND) | `TokenPicker` mode=multiple     |
| Pattern        | rock-8th, single-paradiddle, …                                              | single       | `TokenPicker` mode=single       |
| Key            | C, C#, …, Am, …                                                             | any-of (OR)  | `TokenPicker` mode=multiple     |

Match mode (OR vs AND) is a _container_ query concern, not encoded in the dumb
component — the component only reports selected values.

## Shared fetch-agnostic prop contract

```ts
export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  icon?: string; // Material Symbols ligature name
  disabled?: boolean;
}

// FacetFilter / TokenPicker (searchable, fetch-agnostic)
interface SearchableProps<T extends string> {
  options: readonly FilterOption<T>[];
  value: T[]; // selected values (length ≤ 1 when mode="single")
  onChange: (next: T[]) => void;
  query?: string; // controlled search text (optional)
  onQueryChange?: (q: string) => void; // fires on every keystroke
  shouldFilter?: boolean; // default true = filter in memory (frontend-only)
  loading?: boolean; // show a spinner row (fetch mode)
  mode?: 'single' | 'multiple';
  emptyMessage?: string;
}
```

`useFilterOptions` (in `client/src/hooks/`) wraps the fetch variant: takes an
async `fetcher(query)`, debounces, returns `{ options, query, onQueryChange,
loading, shouldFilter: false }` ready to spread onto the component.

## Test / story / a11y / VR matrix (per component)

- **Unit** (`*.test.tsx`, Vitest + Testing Library) — behavior + a11y roles + `data-slot`, controlled `value`/`onChange`, keyboard activation, `shouldFilter` on/off, disabled. Not brittle class strings.
- **Stories** (`*.stories.tsx`) — `Default` + one named story per meaningful state: `Empty`, `Loading`, `WithSelection`, `Single`/`Multiple`, `Disabled`, `FrontendOnly`, `Fetch`, `Open` (popover expanded), edge cases (`ManyOptions`, long labels). Interactive states via `render` + `useState` (DataTable precedent).
- **a11y** (`*.a11y.ts`) — the shared `runA11yStories` factory: every story × {light, dark} × {resting, hover}. Icon-font assertion where glyphs render.
- **VR** (`*.vr.ts`) — extended beyond the repo default (one resting light snapshot) to cover **light + dark** and the **open / hover / focus** states the user asked for, per story, via a small theme/state loop. Applies **only** to these new components; existing components' VR is untouched. Baselines committed for `darwin` + `linux` (Docker).

## Build order

1. Plan doc (this) + create the search-input Jira ticket. _(commit)_
2. Shared foundation: `FilterOption` type, `useFilterOptions` hook, `Popover` bare primitive. _(commit)_
3. Reference component end-to-end to validate the toolchain: `SearchInput` (simplest) → run unit + a11y + VR locally. _(commit, NH-254/new)_
4. Remaining components, each with the full 6-file set + baselines:
   - `Tabs` _(NH-255)_
   - `ToggleChipGroup`, `RangeSlider`/`TempoRange` _(NH-254)_
   - `FacetFilter`, `TokenPicker`, `LevelFilter` _(NH-254)_
   - `Pagination` _(NH-253)_
5. `useFilterOptions` frontend-only-vs-fetch demo stories.
6. Green gate: `lint`, `typecheck`, `test`, `test:a11y`, `test:vr` (darwin + linux baselines via Docker). _(commit)_
7. Push, open one PR listing NH-253/254/255 + the new search ticket, fill the merge checklist, watch CI to green.

## Out of scope

- The `useFilterOptions` container hook (debounced fetch wiring). The dumb components are already fetch-agnostic — frontend-only (`shouldFilter` on, static `options`) and fetch (`shouldFilter={false}` + `onQueryChange` + `loading`) are both expressible and shown in stories (`Open` vs `Loading`). The hook is a deferred convenience, not a blocker.
- Wiring a live filter row to `/api/catalog` / the catalog route (NH-123).
- The relevance / newest / curated **sort dropdown** (part of NH-254 but not in the requested component set — flag for a follow-up if wanted).
- Server-side keyset pagination decision (NH-253 notes it; the component supports both client- and server-driven paging via props).
- Per-user score filter (NH-212, DynamoDB) and flag filters (NH-211, done).
