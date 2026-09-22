# Handoff — NH-264: port shadcn form components to our UI

**Date:** 2026-07-05 · **Ticket:** [NH-264](https://leocaseiro.atlassian.net/browse/NH-264) · **Foundation:** Radix (`radix-ui`) + our design tokens · **Status:** 10 PRs open, all CI-green, reviewed + audited.

## TL;DR

Built the 10 form-component primitives, each in its own PR off `master`, following the repo's UI conventions (folder-per-PascalCase-component, `data-slot`, `cn`, `cva`, Storybook + unit + axe a11y + Playwright VR). Every PR was reviewed by `ce-code-review` (7 personas, fixes applied) and `pr-checklist-audit` (no false ticks), and is green. The reusable **typeahead multi-select** was split out to **[NH-265](https://leocaseiro.atlassian.net/browse/NH-265)** (deferred). Storybook previews publish per-PR at `https://leocaseiro.github.io/notation-hero/pr/<number>/`.

## The 10 PRs

| Component     | PR                                                           | Notes                                                  |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| Label (pilot) | [#100](https://github.com/leocaseiro/notation-hero/pull/100) | validated the full pipeline first                      |
| Input         | [#102](https://github.com/leocaseiro/notation-hero/pull/102) | native `input`, all states                             |
| Textarea      | [#103](https://github.com/leocaseiro/notation-hero/pull/103) | `field-sizing` auto-grow                               |
| Checkbox      | [#104](https://github.com/leocaseiro/notation-hero/pull/104) | Radix; **indeterminate glyph bug fixed** (see Reviews) |
| RadioGroup    | [#105](https://github.com/leocaseiro/notation-hero/pull/105) | Radix; CSS-dot indicator                               |
| Card          | [#106](https://github.com/leocaseiro/notation-hero/pull/106) | 7 sub-components                                       |
| Field         | [#107](https://github.com/leocaseiro/notation-hero/pull/107) | composition + orientation variants                     |
| Sonner        | [#108](https://github.com/leocaseiro/notation-hero/pull/108) | adds `sonner` dep; neutral surface + type icon         |
| NativeSelect  | [#110](https://github.com/leocaseiro/notation-hero/pull/110) | styled `select` + chevron; +cspell word                |
| InputGroup    | [#111](https://github.com/leocaseiro/notation-hero/pull/111) | prefix/suffix addons; +cspell word                     |

Each PR is **independent** (self-contained `client/src/components/ui/<Name>/` folder) — **merge in any order**.

## Key decisions

- **Ticket correction:** the prompt linked **NH-262** ("Basic Elements" — breadcrumb / menu / dropdown-menu / hover-card / scroll-area / skeleton / sidebar / tooltip); the _forms_ ticket is **NH-264**. Built on NH-264. (NH-263 = "UI Blocks", a third sibling.)
- **Foundation = Radix, not Base UI.** NH-264 links shadcn's `/base/` docs, but the existing 12 components use `radix-ui`. The `/base/` look/behaviour was ported onto **Radix** to match the repo and add **zero new deps** (confirmed with Leo). Only **Checkbox** and **RadioGroup** actually use a primitive; the other 8 are plain HTML + tokens (Sonner uses the `sonner` package).
- **Typeahead multi-select deferred → [NH-265](https://leocaseiro.atlassian.net/browse/NH-265)** (same sprint "2c · Temp design system"). It is a bigger, data-source-agnostic Combobox (static `options` OR async `loadOptions`), where the fetch path uses **oRPC + TanStack Query** (NOT Next.js Server Actions — the FrontendMasters course does not port to our Vite SPA).
- **Sonner** defaults to a **neutral** toast surface differentiated by a type **icon** (shadcn default); pass **`richColors`** on the Toaster for coloured backgrounds. The description colour maps to `text-muted-foreground` for dark-mode contrast.
- **VR scope:** resting-state snapshots per story (darwin + linux baselines); **axe a11y** covers light + dark + resting + hover. Leo confirmed this coverage is sufficient (no separate hover/focus/dark VR snapshots).

## Reviews

- **`ce-code-review`** (7 personas: correctness, maintainability, testing, project-standards, adversarial, agent-native, learnings). Findings applied + verified, committed as `fix(review)`:
  - **Checkbox indeterminate glyph (real bug).** Correctness said the glyph read `props.checked` only; adversarial said it was unreachable. **Settled empirically** — `defaultChecked="indeterminate"` really does yield `data-state=indeterminate` while painting a checkmark. Fixed by driving the glyph off the rendered `data-state` (two spans, CSS-toggled).
  - InputGroup now exports `inputGroupAddonVariants`; Field added `Grouped` / `Responsive` stories so `FieldContent` / `FieldSeparator` / `FieldTitle` get VR + a11y coverage; Sonner dropped the no-op `data-slot="toaster"` (sonner does not forward it) + corrected the docs; test hardening (Checkbox controlled / indeterminate / label, Field single-error, Sonner action click, Input / Textarea `readOnly`, Card grid assertion).
- **`pr-checklist-audit`** (all 10): **no false ticks.** Soft note only — the "overlap" box could explicitly name `cspell.json` / deps as shared files (they merge trivially; see below).

## Gotchas / learnings

- **cspell + concatenated Storybook story-id.** A multi-word title like `UI/NativeSelect` produces a lowercased, **concatenated** story-id prefix (the camelCase boundary is dropped, not hyphenated). The `.a11y.ts` `storyPrefix` and `.vr.ts` `id=` must use that concatenated form, and cspell then flags that token as an unknown word — so add it to `cspell.json`. (The equivalent token for `RadioGroup` slips through only because it is already a real ARIA role.)
- **Playwright VR reuses any Storybook on `:6006`** — including another worktree's — because of `reuseExistingServer` + a hardcoded port. It silently serves the wrong stories, so all VR / a11y time out on `[data-slot]` not-found. Run `lsof -ti:6006` and own the port first. (Collided with the parallel NH-262 worktree.)
- **Storybook PR previews:** `workflow_dispatch` builds _master's_ Storybook (the base-path assert fails); use the `pull_request` synchronize path (an empty `chore(ci):` commit) to build a PR's preview.
- **VR two-span glyph:** toggle with `:inline` (not `:block`) to keep pixels identical to the original single-span render.
- **zsh does not word-split unquoted variables, and its pipe-status array is 1-indexed** — a piped `git push | tail` masks the real exit code (you read `tail`'s exit, not `git`'s).

## Follow-ups (for Leo)

1. **Review + merge the 10 PRs** (any order — independent folders). Flip the NH-264 Smart Checklist `~` to `+` per merged component.
2. **`cspell.json` merges:** Sonner (#108), NativeSelect (#110), InputGroup (#111) each add one word at a **distinct anchor** — trivial. A **parallel NH-262 session** (PRs #101 / #109, from worktree `keen-nash-31b894`) also edits `cspell.json`; coordinate the merge order (word-list adds only).
3. **Storybook previews** at `/pr/<number>/` — an empty `chore(ci)` commit was pushed to each branch to fire the NH-266 workflow (these PRs predate it).
4. **NH-265** (deferred typeahead multi-select) is the next component when wanted.

## Where things live

- **Integration branch** (all work staged): `claude/gallant-goodall-4e255c` — commits `Label`, `9 components`, `fix(review)`.
- **Per-component branches:** `feat/nh-264-<slug>`.
- **Components:** `client/src/components/ui/<Name>/` (`.tsx`, `.stories.tsx`, `.story-ids.ts`, `.test.tsx`, `.a11y.ts`, `.vr.ts`, `.vr.ts-snapshots/`).
